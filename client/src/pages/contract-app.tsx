import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Cpu, Play, StepForward, RotateCcw, Zap, Radio,
  Activity, ExternalLink, Server, Clock, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Database, ArrowRightLeft, GitBranch,
} from "lucide-react";

// ── Physics helpers ───────────────────────────────────────────────────────────
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}
function nmToColor(nm: number): string {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}
function ceEncode(name: string): { nm: number; psi: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, psi: `Ψ(${wdm},${oam},${pol})` };
}

// ── VM types and compiler (browser debug mode) ────────────────────────────────
interface Ins {
  off: number; op: number; mnem: string; args: string;
  nm?: number; ch?: string; cmt: string;
  gateThreshold?: number; gateHigh?: number; gateLow?: number;
  storeKey?: string; storeVal?: string; xferAmount?: string;
}
interface VMState {
  pc: number;
  registers: { nm: number; name: string; value: string; band: string }[];
  agents:    { name: string; nm: number; psi: string; status: string }[];
  output:    { text: string; type: string }[];
  tuned:     number;
  halted:    boolean;
  cycleCount: number;
  kvStore:   Record<string, any>;
  kvDirty:   Record<string, any>;
}

function freshVM(): VMState {
  return { pc: 0, registers: [], agents: [], output: [], tuned: 520, halted: false, cycleCount: 0, kvStore: {}, kvDirty: {} };
}

function compileWLS(src: string): Ins[] {
  if (!src.trim()) return [];
  const ins: Ins[] = []; let off = 0;
  function add(op: number, mnem: string, args: string, cmt: string, nm?: number, ch?: string, extra?: Partial<Ins>) {
    ins.push({ off, op, mnem, args, nm, ch, cmt, ...extra });
    if (op !== 0x00) off += 8;
  }
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith(";") || line.startsWith("#")) continue;
    const mGate = line.match(/GATE\(load\s*>\s*(\d+)\s*→\s*(\d+\.?\d*)nm\s*:\s*(\d+\.?\d*)nm\)/);
    if (mGate) { add(0x09, "GATE", `load>${mGate[1]} → ${mGate[2]}nm : ${mGate[3]}nm`, "nonlinear switch", undefined, undefined, { gateThreshold: parseInt(mGate[1]), gateHigh: parseFloat(mGate[2]), gateLow: parseFloat(mGate[3]) }); continue; }
    const m1 = line.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);
    if (m1) { add(0x03, "EMIT", `λ=${m1[1]}nm  ${m1[2]}`, `emit on ${nmToBand(parseFloat(m1[1]))} band`, parseFloat(m1[1]), m1[2]); continue; }
    const m2 = line.match(/tune\((\d+\.?\d*)nm\)/);
    if (m2) { add(0x01, "TUNE", `λ=${m2[1]}nm`, `receiver → ${nmToBand(parseFloat(m2[1]))} band`, parseFloat(m2[1])); continue; }
    const m3 = line.match(/^agent\s+(\w+)/);
    if (m3) { const e = ceEncode(m3[1]); add(0x0A, "AGENT", `"${m3[1]}"  ${e.psi}`, `AI agent λ=${e.nm}nm`, e.nm, e.psi); continue; }
    const m4 = line.match(/^fn\s+(\w+)/);
    if (m4) { const e = ceEncode(m4[1]); add(0x07, "LABEL", `${m4[1]}  ${e.psi}`, `fn → λ=${e.nm}nm`, e.nm, e.psi); continue; }
    const m5 = line.match(/node\.register\("([^"]+)"/);
    if (m5) { const e = ceEncode(m5[1]); add(0x0A, "AGENT", `"${m5[1]}"  ${e.psi}  PUBLIC`, "spectral network node", e.nm, e.psi); continue; }
    const m6 = line.match(/oscillate\(([^)]+)\)/);
    if (m6) { add(0x06, "OCS", m6[1].trim(), "non-blocking wave loop"); continue; }
    const m7 = line.match(/broadcast\(([^)]+)\)/);
    if (m7) { const e = ceEncode(m7[1].replace(/[^a-zA-Z]/g, "") || "data"); add(0x05, "BROAD", m7[1].trim(), `broadcast λ=${e.nm}nm`, e.nm); continue; }
    const m8 = line.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);
    if (m8) { add(0x02, "PUSH", `@${m8[1]}nm  "${m8[2]}"`, `bind at λ=${m8[1]}nm`, parseFloat(m8[1])); continue; }
    const m9 = line.match(/^\s*emit\s+(.+)/);
    if (m9) { const e = ceEncode(m9[1].replace(/[^a-zA-Z]/g, "") || "out"); add(0x03, "EMIT", m9[1].trim(), `output at λ=${e.nm}nm`, e.nm); continue; }
    if (line.startsWith("?λ ")) { add(0x08, "JMPZ", line.slice(3).trim(), "photon path branch"); continue; }
    if (line === "}" || line.match(/^end\b/)) { add(0xFE, "RET", "", "scope end — wave collapses"); continue; }
    // v1.1 opcodes
    const mStoreAssign = line.match(/^@store\s+(\w+)\s*:=\s*(.+)/);
    if (mStoreAssign) { const v = mStoreAssign[2].trim().replace(/^["']|["']$/g, ""); add(0x10, "STORE", `${mStoreAssign[1]} := ${v}`, `persist → state`, undefined, undefined, { storeKey: mStoreAssign[1], storeVal: v }); continue; }
    const mStoreRef = line.match(/^@store\s+(\w+)\s*$/);
    if (mStoreRef) { add(0x10, "STORE", mStoreRef[1], `persist register → state`, undefined, undefined, { storeKey: mStoreRef[1] }); continue; }
    const mLoad = line.match(/^@load\s+(\w+)/);
    if (mLoad) { add(0x11, "LOAD", mLoad[1], `restore ← state`); continue; }
    const mXferNxt = line.match(/^transfer_nxt\("([^"]+)",\s*"([^"]+)"\)/);
    if (mXferNxt) { add(0x12, "XFER_NXT", `"${mXferNxt[1]}"  ${mXferNxt[2]}`, `transfer NXT`, undefined, mXferNxt[1], { xferAmount: mXferNxt[2] }); continue; }
    const mXferSats = line.match(/^transfer_sats\("([^"]+)",\s*"([^"]+)"\)/);
    if (mXferSats) { add(0x13, "XFER_SATS", `"${mXferSats[1]}"  ${mXferSats[2]}`, `transfer sats`, undefined, mXferSats[1], { xferAmount: mXferSats[2] }); continue; }
    const mCallOp = line.match(/^call\("([^"]+)"\)/);
    if (mCallOp) { add(0x14, "CALL", `"${mCallOp[1]}"`, `call sub-contract`); continue; }
    const word = line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op";
    const e = ceEncode(word);
    add(0x0B, "EXEC", `@${e.nm}nm`, line.slice(0, 60), e.nm);
  }
  add(0xFF, "HALT", "", "wavefunction terminated");
  return ins;
}

function stepVM(state: VMState, ins: Ins[], channelLoad: number): VMState {
  if (state.halted || state.pc >= ins.length) return { ...state, halted: true };
  const i = ins[state.pc];
  const s: VMState = { ...state, pc: state.pc + 1, cycleCount: state.cycleCount + 1, registers: [...state.registers], agents: [...state.agents], output: [...state.output], kvDirty: { ...state.kvDirty } };
  switch (i.op) {
    case 0x01: s.tuned = i.nm ?? s.tuned; s.output.push({ text: `TUNE  λ=${i.nm}nm → ${nmToBand(i.nm ?? s.tuned)}`, type: "sys" }); break;
    case 0x02: { const n = i.args.replace(/.*"([^"]+)".*/, "$1"); s.registers = s.registers.filter(r => r.nm !== (i.nm ?? s.tuned)); s.registers.push({ nm: i.nm ?? s.tuned, name: n, value: `@${i.nm}nm`, band: nmToBand(i.nm ?? s.tuned) }); s.output.push({ text: `PUSH  ${n} → λ=${i.nm}nm [${nmToBand(i.nm ?? s.tuned)}]`, type: "sys" }); break; }
    case 0x03: s.output.push({ text: `EMIT  λ=${i.nm}nm  ${i.ch ?? ""}`, type: "emit" }); break;
    case 0x05: s.output.push({ text: `BROAD  ${i.args}`, type: "broad" }); break;
    case 0x06: s.output.push({ text: `OCS   ${i.args}`, type: "sys" }); break;
    case 0x07: s.output.push({ text: `LABEL  ${i.args}  @ λ=${i.nm}nm`, type: "sys" }); break;
    case 0x08: s.output.push({ text: `JMPZ  ${i.args}`, type: "sys" }); break;
    case 0x09: { const thr = i.gateThreshold ?? 50; const hi = i.gateHigh ?? s.tuned; const lo = i.gateLow ?? s.tuned; const fired = channelLoad > thr; const rNm = fired ? hi : lo; s.tuned = rNm; s.output.push({ text: `GATE  load=${channelLoad} ${fired ? ">" : "≤"} ${thr}  →  ${rNm}nm [${nmToBand(rNm)}]`, type: "gate" }); break; }
    case 0x0A: { const n = i.args.replace(/"([^"]+)".*/, "$1"); if (!s.agents.find(a => a.name === n)) s.agents.push({ name: n, nm: i.nm ?? s.tuned, psi: i.ch ?? "Ψ(0,0,H)", status: "ACTIVE" }); s.output.push({ text: `AGENT  "${n}" @ ${i.ch}`, type: "agent" }); break; }
    case 0x0B: s.output.push({ text: `EXEC  ${i.cmt.slice(0, 60)}`, type: "sys" }); break;
    case 0xFE: s.output.push({ text: `RET   — scope exits`, type: "sys" }); break;
    case 0xFF: s.halted = true; s.output.push({ text: `HALT  — terminated  (${s.cycleCount} cycles)`, type: "sys" }); break;
    // v1.1
    case 0x10: { const key = i.storeKey ?? i.args.split(" ")[0]; const val = i.storeVal ?? `@${s.tuned}nm`; s.kvDirty[key] = val; s.output.push({ text: `STORE  ${key} := "${val}"  → contract_state`, type: "store" }); break; }
    case 0x11: { const key = i.args; const val = s.kvStore[key] ?? s.kvDirty[key] ?? null; s.output.push({ text: `LOAD  ${key} ← ${val !== null ? `"${JSON.stringify(val)}"` : "(not set)"}`, type: "store" }); break; }
    case 0x12: s.output.push({ text: `XFER_NXT  ${i.xferAmount ?? "0"} NXT → ${i.ch ?? "?"} [browser sim]`, type: "xfer" }); break;
    case 0x13: s.output.push({ text: `XFER_SATS  ${i.xferAmount ?? "0"} sats → ${i.ch ?? "?"} [browser sim]`, type: "xfer" }); break;
    case 0x14: { const slug = i.args.replace(/"/g, ""); s.output.push({ text: `CALL  "${slug}" [use Execute on Chain]`, type: "call" }); break; }
    default: break;
  }
  return s;
}

const typeColor = (t: string) =>
  ({ emit: "text-cyan-400", broad: "text-purple-400", agent: "text-green-400", gate: "text-yellow-400",
     err: "text-red-400", store: "text-blue-400", xfer: "text-orange-400", call: "text-violet-400" }[t] ?? "text-slate-400");

// ── API types ─────────────────────────────────────────────────────────────────
interface TransferResult { type: string; to?: string; amount: string; status: string; tx_id?: string; balance?: string; }
interface SubcallResult  { slug: string; name?: string; output: { text: string; type: string }[]; cycle_count?: number; halted?: boolean; status: string; }
interface ChainExecution {
  id: string; contract_id: string; channel_load: number;
  output: { text: string; type: string }[];
  final_registers: { nm: number; name: string; value: string; band: string }[];
  final_agents: { name: string; nm: number; psi: string; status: string }[];
  cycle_count: number; halted: boolean; truncated: boolean;
  chain_tx_id: string | null;
  state_delta?: Record<string, any>;
  transfer_results?: TransferResult[];
  subcall_results?: SubcallResult[];
  contract_balance?: string;
  executed_at: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ContractAppPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"execute" | "debug" | "history" | "state">("execute");
  const [channelLoad, setChannelLoad] = useState(42);
  const [expandedExec, setExpandedExec] = useState<string | null>(null);

  const [vmState, setVmState]   = useState<VMState>(freshVM());
  const [compiled, setCompiled] = useState<Ins[] | null>(null);
  const [running, setRunning]   = useState(false);
  const outputRef               = useRef<HTMLDivElement>(null);
  const runRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelLoadRef          = useRef(channelLoad);
  useEffect(() => { channelLoadRef.current = channelLoad; }, [channelLoad]);

  const { data: contract, isLoading } = useQuery<any>({
    queryKey: ["/api/app", slug],
    queryFn: async () => {
      const r = await fetch(`/api/app/${slug}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
  });

  const { data: execHistory = [], isLoading: histLoading } = useQuery<ChainExecution[]>({
    queryKey: ["/api/app/executions", slug],
    queryFn: async () => {
      const r = await fetch(`/api/app/${slug}/executions`);
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: activeTab === "history" ? 10_000 : false,
  });

  const { data: contractState, refetch: refetchState } = useQuery<{ state: { key: string; value: any; updated_at: string }[]; contract_nxt_balance: string }>({
    queryKey: ["/api/app/state", slug],
    queryFn: async () => {
      const r = await fetch(`/api/app/${slug}/state`);
      if (!r.ok) return { state: [], contract_nxt_balance: "0" };
      return r.json();
    },
    refetchInterval: activeTab === "state" ? 8_000 : false,
  });

  useEffect(() => {
    if (contract?.source_code) {
      setCompiled(compileWLS(contract.source_code));
      setVmState(freshVM());
    }
  }, [contract?.source_code]);

  const executeMutation = useMutation<ChainExecution, Error, number>({
    mutationFn: async (load: number) => {
      const r = await fetch(`/api/app/${slug}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_load: load }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(err.error ?? r.statusText);
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/app/executions", slug] });
      refetchState();
    },
  });

  const handleStep = useCallback(() => {
    if (!compiled) return;
    setVmState(s => {
      const n = stepVM(s, compiled, channelLoadRef.current);
      setTimeout(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, 0);
      return n;
    });
  }, [compiled]);

  const handleRun = useCallback(() => {
    if (!compiled) return;
    if (running) { if (runRef.current) clearInterval(runRef.current); setRunning(false); return; }
    setRunning(true);
    runRef.current = setInterval(() => {
      setVmState(s => {
        if (s.halted) { setRunning(false); if (runRef.current) clearInterval(runRef.current!); return s; }
        const n = stepVM(s, compiled, channelLoadRef.current);
        setTimeout(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, 0);
        return n;
      });
    }, 100);
  }, [compiled, running]);

  const handleReset = () => { setVmState(freshVM()); setRunning(false); if (runRef.current) clearInterval(runRef.current); };
  useEffect(() => () => { if (runRef.current) clearInterval(runRef.current); }, []);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-sm">
      Loading contract…
    </div>
  );
  if (!contract) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-sm">
      Contract not found — <Link href="/spectral-ide" className="text-cyan-400 ml-1">Open IDE</Link>
    </div>
  );

  const realInsCount = compiled?.filter(i => i.op !== 0x00).length ?? 0;
  const lastExec = execHistory[0] ?? null;
  const execResult = executeMutation.data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
         style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-3 bg-slate-900/80 shrink-0">
        <Link href="/spectral-ide" className="text-slate-500 hover:text-slate-300"><ArrowLeft size={15} /></Link>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-slate-200 font-semibold">{contract.name}</span>
        <span className="text-xs text-slate-600 border border-slate-700 px-2 py-0.5 rounded">deployed</span>
        <span className="text-xs text-slate-700">· {realInsCount} instructions · WNSP VM v1.1</span>
        {contractState && parseFloat(contractState.contract_nxt_balance) > 0 && (
          <span className="text-xs text-orange-500 ml-1 border border-orange-800/40 px-2 py-0.5 rounded">
            wallet: {parseFloat(contractState.contract_nxt_balance).toFixed(2)} NXT
          </span>
        )}
        {lastExec && (
          <span className="text-xs text-green-600 ml-1">· last run {new Date(lastExec.executed_at).toLocaleTimeString()}</span>
        )}
        <Link href="/spectral-ide" className="ml-auto flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400">
          <ExternalLink size={11} /> Edit in IDE
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Source panel */}
        <div className="w-72 border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 flex items-center gap-2">
            <Cpu size={11} /> WavelengthScript Source
          </div>
          <pre className="flex-1 overflow-auto text-xs leading-relaxed p-3 text-slate-400 whitespace-pre-wrap">
            {contract.source_code}
          </pre>
          {contract.description && (
            <div className="px-3 py-2 border-t border-slate-800 text-xs text-slate-600">{contract.description}</div>
          )}
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-slate-800 bg-slate-900/40 shrink-0">
            {([
              ["execute", "Execute on Chain", <Server size={11} />],
              ["debug",   "Debug (Browser VM)", <Cpu size={11} />],
              ["state",   `State (${contractState?.state.length ?? 0})`, <Database size={11} />],
              ["history", `History (${execHistory.length})`, <Clock size={11} />],
            ] as const).map(([id, label, icon]) => (
              <button key={id} onClick={() => setActiveTab(id as any)}
                data-testid={`tab-${id}`}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-r border-slate-800
                  ${activeTab === id ? "text-cyan-400 border-b-2 border-b-cyan-500 bg-slate-800/40" : "text-slate-500 hover:text-slate-300"}`}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* ── TAB: Execute ─────────────────────────────────────────────── */}
          {activeTab === "execute" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="border border-slate-800 rounded bg-slate-900/40 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Execution Parameters</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-24 shrink-0">Channel load</span>
                  <input type="range" min={0} max={100} value={channelLoad}
                    onChange={e => setChannelLoad(+e.target.value)}
                    className="flex-1 accent-cyan-500" data-testid="slider-channel-load" />
                  <span className="text-xs text-cyan-400 font-mono w-10 text-right">{channelLoad}%</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => executeMutation.mutate(channelLoad)}
                    disabled={executeMutation.isPending}
                    data-testid="btn-execute-chain"
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-600/40 rounded transition-colors disabled:opacity-40">
                    <Server size={12} />
                    {executeMutation.isPending ? "Executing…" : "Execute on Chain"}
                  </button>
                  <span className="text-xs text-slate-700">Runs server-side · logs to blockchain · fires kernel events</span>
                </div>
                {executeMutation.isError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
                    <AlertCircle size={11} /> {executeMutation.error.message}
                  </div>
                )}
              </div>

              {execResult && (
                <div className="border border-slate-700 rounded bg-slate-900/60 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-green-400" />
                    <span className="text-xs font-semibold text-slate-300">Execution complete</span>
                    <span className="text-xs text-slate-600 ml-auto">{execResult.cycle_count} cycles · {execResult.halted ? "HALTED" : "TRUNCATED"}</span>
                  </div>

                  {/* Registers */}
                  {execResult.final_registers.length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-800/60">
                      <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1"><Zap size={10} /> Ψ Registers</div>
                      {execResult.final_registers.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: nmToColor(r.nm) }} />
                          <span className="text-slate-300">{r.name}</span>
                          <span className="text-slate-600 ml-auto">{r.nm}nm</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Agents */}
                  {execResult.final_agents.length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-800/60">
                      <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1"><Radio size={10} /> Agents Registered</div>
                      {execResult.final_agents.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                          <span className="text-green-400">◈</span>
                          <span className="text-slate-300">{a.name}</span>
                          <span className="text-slate-600 ml-auto">{a.psi}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* State delta */}
                  {execResult.state_delta && Object.keys(execResult.state_delta).length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-800/60">
                      <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1"><Database size={10} /> State Written</div>
                      {Object.entries(execResult.state_delta).map(([k, v], i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                          <span className="text-blue-400">⬡</span>
                          <span className="text-slate-300">{k}</span>
                          <span className="text-blue-300 ml-auto font-mono">{JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transfers */}
                  {execResult.transfer_results && execResult.transfer_results.length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-800/60">
                      <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1"><ArrowRightLeft size={10} /> Transfers</div>
                      {execResult.transfer_results.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                          <span className={t.status === "executed" ? "text-green-400" : "text-red-400"}>
                            {t.status === "executed" ? "✓" : "✗"}
                          </span>
                          <span className="text-slate-300">{t.amount} NXT → {t.to}</span>
                          <span className="text-slate-600 ml-auto capitalize">{t.status.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                      {execResult.contract_balance !== undefined && (
                        <div className="text-xs text-slate-700 mt-1">Contract balance after: {execResult.contract_balance} NXT</div>
                      )}
                    </div>
                  )}

                  {/* Sub-call results */}
                  {execResult.subcall_results && execResult.subcall_results.length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-800/60">
                      <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1"><GitBranch size={10} /> Sub-contract Calls</div>
                      {execResult.subcall_results.map((sc, i) => (
                        <div key={i} className="border border-slate-800 rounded p-2 mb-1">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="text-violet-400">◎</span>
                            <span className="text-slate-300">{sc.slug}</span>
                            <span className={`ml-auto text-[10px] ${sc.status === "executed" ? "text-green-500" : "text-red-500"}`}>{sc.status}</span>
                          </div>
                          {sc.output?.slice(0, 5).map((o, j) => (
                            <div key={j} className={`text-[10px] ${typeColor(o.type)}`}>{o.text}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* VM output */}
                  <div className="px-4 py-2 border-b border-slate-800/60">
                    <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1"><Activity size={10} /> Execution Log</div>
                    <div className="space-y-0.5 max-h-64 overflow-y-auto font-mono text-xs">
                      {execResult.output.map((o, i) => (
                        <div key={i} className={`leading-relaxed ${typeColor(o.type)}`}>{o.text}</div>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 py-2 flex items-center gap-2 text-xs">
                    <span className="text-slate-600">Execution ID:</span>
                    <span className="text-slate-400 font-mono">{execResult.id}</span>
                    {execResult.chain_tx_id && (
                      <><span className="text-slate-700 ml-2">· Chain TX:</span>
                      <span className="text-purple-400 font-mono">{execResult.chain_tx_id.slice(0, 16)}…</span></>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Debug ───────────────────────────────────────────────── */}
          {activeTab === "debug" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900/40 flex-wrap shrink-0">
                <button onClick={handleStep} disabled={!compiled || vmState.halted} data-testid="btn-step"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700/40 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700 transition-colors disabled:opacity-30">
                  <StepForward size={11} /> Step
                </button>
                <button onClick={handleRun} disabled={!compiled} data-testid="btn-run"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors
                    ${running ? "bg-orange-600/30 border-orange-600/40 text-orange-300" : "bg-green-600/20 hover:bg-green-600/40 text-green-300 border-green-600/30"}`}>
                  <Play size={11} /> {running ? "Pause" : "Run"}
                </button>
                <button onClick={handleReset} data-testid="btn-reset"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700/40 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700 transition-colors">
                  <RotateCcw size={11} /> Reset
                </button>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-slate-600">Load:</span>
                  <input type="range" min={0} max={100} value={channelLoad}
                    onChange={e => setChannelLoad(+e.target.value)}
                    className="w-24 accent-cyan-500" data-testid="slider-load-debug" />
                  <span className="text-xs text-cyan-500 font-mono">{channelLoad}%</span>
                </div>
                <span className="ml-auto text-xs text-slate-600">PC:{vmState.pc} · {vmState.cycleCount} cycles · {vmState.halted ? "⬛ HALTED" : "🟢 READY"}</span>
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="w-56 border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 flex items-center gap-1"><Zap size={10} /> Ψ Registers</div>
                  <div className="flex-1 overflow-y-auto px-2 py-1">
                    {vmState.registers.length === 0 && <div className="text-xs text-slate-700 p-2">No registers</div>}
                    {vmState.registers.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-xs border-b border-slate-800/30">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: nmToColor(r.nm) }} />
                        <span className="text-slate-300 truncate flex-1">{r.name}</span>
                        <span className="text-slate-600 shrink-0">{r.nm}nm</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-t border-b border-slate-800 flex items-center gap-1"><Radio size={10} /> Agents</div>
                  <div className="overflow-y-auto px-2 py-1 max-h-32">
                    {vmState.agents.length === 0 && <div className="text-xs text-slate-700 p-2">No agents</div>}
                    {vmState.agents.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 text-xs border-b border-slate-800/30">
                        <span className="text-green-400 shrink-0">◈</span>
                        <span className="text-slate-300 truncate flex-1">{a.name}</span>
                      </div>
                    ))}
                  </div>
                  {Object.keys(vmState.kvDirty).length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-t border-b border-slate-800 flex items-center gap-1"><Database size={10} /> Session State</div>
                      <div className="overflow-y-auto px-2 py-1 max-h-28">
                        {Object.entries(vmState.kvDirty).map(([k, v], i) => (
                          <div key={i} className="flex items-center gap-1 py-0.5 text-xs border-b border-slate-800/30">
                            <span className="text-blue-400 shrink-0">⬡</span>
                            <span className="text-slate-400 truncate">{k}:</span>
                            <span className="text-blue-300 font-mono text-[10px]">{JSON.stringify(v)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 flex items-center gap-1">
                    <Activity size={10} /> VM Output — browser only (XFER/CALL simulated)
                  </div>
                  <div ref={outputRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs">
                    {vmState.output.length === 0 && <div className="text-slate-700 py-4">Step or Run to debug locally. Switch to Execute tab to run on chain.</div>}
                    {vmState.output.map((o, i) => (
                      <div key={i} className={`py-0.5 leading-relaxed ${typeColor(o.type)}`}>{o.text}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: State ───────────────────────────────────────────────── */}
          {activeTab === "state" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="border border-slate-800 rounded bg-slate-900/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Database size={11} /> Persistent Contract State
                  </div>
                  <span className="text-xs text-slate-600">
                    Contract wallet: <span className="text-orange-400 font-mono">{contractState?.contract_nxt_balance ?? "0"} NXT</span>
                  </span>
                </div>
                {(!contractState?.state || contractState.state.length === 0) && (
                  <div className="text-xs text-slate-700 py-4 text-center">
                    No state stored yet — run a contract with <code className="text-blue-400">@store key := value</code> to write persistent state.
                  </div>
                )}
                {contractState?.state.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-800/30 text-xs">
                    <span className="text-blue-400 shrink-0">⬡</span>
                    <span className="text-slate-300 font-mono w-32 shrink-0">{entry.key}</span>
                    <span className="text-blue-200 font-mono flex-1">{JSON.stringify(entry.value)}</span>
                    <span className="text-slate-700 text-[10px]">{new Date(entry.updated_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-700 px-1">
                State persists across all executions. Read with <code className="text-blue-400">@load key</code> — values are available to GATE and XFER instructions.
              </div>
            </div>
          )}

          {/* ── TAB: History ─────────────────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {histLoading && <div className="text-xs text-slate-600 py-4">Loading…</div>}
              {!histLoading && execHistory.length === 0 && (
                <div className="text-xs text-slate-700 py-8 text-center">
                  No executions yet — run this contract from the Execute tab.
                </div>
              )}
              {execHistory.map((ex) => (
                <div key={ex.id} className="border border-slate-800 rounded bg-slate-900/40 overflow-hidden" data-testid={`execution-${ex.id}`}>
                  <button onClick={() => setExpandedExec(expandedExec === ex.id ? null : ex.id)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-xs hover:bg-slate-800/40 transition-colors text-left">
                    {expandedExec === ex.id ? <ChevronDown size={11} className="text-slate-500" /> : <ChevronRight size={11} className="text-slate-500" />}
                    <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                    <span className="text-slate-300 font-mono">{ex.id.slice(0, 8)}…</span>
                    <span className="text-slate-600">{ex.cycle_count} cycles</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${ex.halted ? "bg-green-900/30 text-green-500" : "bg-orange-900/30 text-orange-500"}`}>
                      {ex.halted ? "HALTED" : "TRUNC"}
                    </span>
                    <span className="text-slate-600">load:{ex.channel_load}%</span>
                    {ex.chain_tx_id && <span className="text-purple-500 text-[10px] font-mono">TX:{ex.chain_tx_id.slice(0, 8)}</span>}
                    <span className="ml-auto text-slate-700">{new Date(ex.executed_at).toLocaleString()}</span>
                  </button>
                  {expandedExec === ex.id && (
                    <div className="border-t border-slate-800 px-4 py-3 space-y-3">
                      {ex.final_agents.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-600 mb-1 flex items-center gap-1"><Radio size={10} /> Agents</div>
                          {ex.final_agents.map((a: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                              <span className="text-green-400">◈</span><span className="text-slate-300">{a.name}</span>
                              <span className="text-slate-600">{a.psi}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-slate-600 mb-1 flex items-center gap-1"><Activity size={10} /> Output</div>
                        <div className="font-mono text-xs max-h-48 overflow-y-auto space-y-0.5">
                          {ex.output.map((o: any, i: number) => (
                            <div key={i} className={`leading-relaxed ${typeColor(o.type)}`}>{o.text}</div>
                          ))}
                        </div>
                      </div>
                      {ex.chain_tx_id && (
                        <div className="text-xs text-slate-600">
                          Chain TX: <span className="text-purple-400 font-mono">{ex.chain_tx_id}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
