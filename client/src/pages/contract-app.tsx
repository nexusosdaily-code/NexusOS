import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Cpu, Play, StepForward, RotateCcw, Zap, Radio, Activity, ExternalLink } from "lucide-react";

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
function ceEncode(name: string): { nm: number; psi: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, psi: `Ψ(${wdm},${oam},${pol})`, band: nmToBand(nm) };
}

interface Ins { off: number; op: number; mnem: string; args: string; nm?: number; ch?: string; cmt: string; gateThreshold?: number; gateHigh?: number; gateLow?: number; }
interface VMState { pc: number; registers: { nm: number; name: string; value: string; band: string }[]; agents: { name: string; nm: number; psi: string; status: "ACTIVE" | "IDLE" }[]; output: { text: string; type: string }[]; tuned: number; halted: boolean; cycleCount: number; }

function freshVM(): VMState { return { pc: 0, registers: [], agents: [], output: [], tuned: 520, halted: false, cycleCount: 0 }; }

function compileWLS(src: string): Ins[] {
  if (!src.trim()) return [];
  const ins: Ins[] = []; let off = 0;
  function add(op: number, mnem: string, args: string, cmt: string, nm?: number, ch?: string, extra?: Partial<Ins>) { ins.push({ off, op, mnem, args, nm, ch, cmt, ...extra }); if (op !== 0x00) off += 8; }
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
  const s: VMState = { ...state, pc: state.pc + 1, cycleCount: state.cycleCount + 1, registers: [...state.registers], agents: [...state.agents], output: [...state.output] };
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
  }
  return s;
}

const typeColor = (t: string) => ({ emit: "text-cyan-400", broad: "text-purple-400", agent: "text-green-400", gate: "text-yellow-400", err: "text-red-400" }[t] ?? "text-slate-400");

export default function ContractAppPage() {
  const { slug } = useParams<{ slug: string }>();
  const [vmState, setVmState] = useState<VMState>(freshVM());
  const [compiled, setCompiled] = useState<Ins[] | null>(null);
  const [channelLoad, setChannelLoad] = useState(42);
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: contract, isLoading } = useQuery<any>({
    queryKey: ["/api/app", slug],
    queryFn: async () => {
      const r = await fetch(`/api/app/${slug}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
  });

  useEffect(() => {
    if (contract?.source_code) {
      const ins = compileWLS(contract.source_code);
      setCompiled(ins);
      setVmState(freshVM());
    }
  }, [contract]);

  const handleStep = useCallback(() => {
    if (!compiled) return;
    setVmState(s => { const n = stepVM(s, compiled, channelLoad); setTimeout(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, 0); return n; });
  }, [compiled, channelLoad]);

  const handleRun = useCallback(() => {
    if (!compiled) return;
    if (running) { if (runRef.current) clearInterval(runRef.current); setRunning(false); return; }
    setRunning(true);
    runRef.current = setInterval(() => {
      setVmState(s => {
        if (s.halted) { setRunning(false); if (runRef.current) clearInterval(runRef.current!); return s; }
        const n = stepVM(s, compiled, channelLoad);
        setTimeout(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, 0);
        return n;
      });
    }, 100);
  }, [compiled, running, channelLoad]);

  const handleReset = () => { setVmState(freshVM()); setRunning(false); if (runRef.current) clearInterval(runRef.current); };
  useEffect(() => () => { if (runRef.current) clearInterval(runRef.current); }, []);

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-sm">Loading contract…</div>;
  if (!contract) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-sm">Contract not found — <Link href="/spectral-ide" className="text-cyan-400 ml-1">Open IDE</Link></div>;

  const realIns = compiled?.filter(i => i.op !== 0x00) ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-3 bg-slate-900/80">
        <Link href="/spectral-ide" className="text-slate-500 hover:text-slate-300"><ArrowLeft size={15} /></Link>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-slate-200 font-semibold">{contract.name}</span>
        <span className="text-xs text-slate-600 border border-slate-700 px-2 py-0.5 rounded">deployed</span>
        <span className="text-xs text-slate-700 ml-1">· {realIns.length} instructions · WNSP VM v1.0</span>
        <Link href="/spectral-ide" className="ml-auto flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400">
          <ExternalLink size={11} /> Edit in IDE
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Source */}
        <div className="w-96 border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 flex items-center gap-2">
            <Cpu size={11} /> Source — WavelengthScript
          </div>
          <pre className="flex-1 overflow-auto text-xs leading-relaxed p-3 text-slate-400 whitespace-pre-wrap">{contract.source_code}</pre>
          {contract.description && <div className="px-3 py-2 border-t border-slate-800 text-xs text-slate-600">{contract.description}</div>}
        </div>

        {/* VM execution */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900/40 flex-wrap">
            <button onClick={handleStep} disabled={!compiled || vmState.halted} data-testid="btn-step"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700/40 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700 transition-colors disabled:opacity-30">
              <StepForward size={11} /> Step
            </button>
            <button onClick={handleRun} disabled={!compiled} data-testid="btn-run"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors ${running ? "bg-orange-600/30 border-orange-600/40 text-orange-300" : "bg-green-600/20 hover:bg-green-600/40 text-green-300 border-green-600/30"}`}>
              <Play size={11} /> {running ? "Pause" : "Run"}
            </button>
            <button onClick={handleReset} data-testid="btn-reset"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700/40 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700 transition-colors">
              <RotateCcw size={11} /> Reset
            </button>
            <div className="flex items-center gap-2 ml-3">
              <span className="text-xs text-slate-600">Load:</span>
              <input type="range" min={0} max={100} value={channelLoad} onChange={e => setChannelLoad(+e.target.value)} className="w-24 accent-cyan-500" data-testid="slider-load" />
              <span className="text-xs text-cyan-500 font-mono">{channelLoad}%</span>
            </div>
            <span className="ml-auto text-xs text-slate-600">PC:{vmState.pc} · {vmState.cycleCount} cycles · {vmState.halted ? "⬛ HALTED" : "🟢 READY"}</span>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Registers + Agents */}
            <div className="w-64 border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 flex items-center gap-1"><Zap size={10} /> Ψ Registers</div>
              <div className="flex-1 overflow-y-auto px-2 py-1">
                {vmState.registers.length === 0 && <div className="text-xs text-slate-700 p-2">No registers allocated</div>}
                {vmState.registers.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-xs border-b border-slate-800/30">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: nmToColor(r.nm) }} />
                    <span className="text-slate-300 truncate flex-1">{r.name}</span>
                    <span className="text-slate-600 shrink-0">{r.nm}nm</span>
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-t border-slate-800 flex items-center gap-1"><Radio size={10} /> Agents</div>
              <div className="overflow-y-auto px-2 py-1 max-h-40">
                {vmState.agents.length === 0 && <div className="text-xs text-slate-700 p-2">No agents</div>}
                {vmState.agents.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-xs border-b border-slate-800/30">
                    <span className="text-green-400 shrink-0">◈</span>
                    <span className="text-slate-300 truncate flex-1">{a.name}</span>
                    <span className="text-slate-600 shrink-0 text-[10px]">{a.psi}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Output log */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 flex items-center gap-1"><Activity size={10} /> Execution Output</div>
              <div ref={outputRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs">
                {vmState.output.length === 0 && <div className="text-slate-700 py-4">Press Run or Step to execute the contract in the WNSP VM</div>}
                {vmState.output.map((o, i) => (
                  <div key={i} className={`py-0.5 leading-relaxed ${typeColor(o.type)}`}>{o.text}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
