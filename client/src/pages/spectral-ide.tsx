import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  ArrowLeft, Play, StepForward, RotateCcw, Save, Rocket,
  Code2, Cpu, Radio, Plus,
  Copy, Check, Zap, Activity, Share2, Trash2,
  Globe2, FileCode2, ChevronDown, ChevronUp, ArrowDownToLine,
} from "lucide-react";

const IMPORT_LANGS = [
  { value: "python",     label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "rust",       label: "Rust" },
  { value: "go",         label: "Go" },
  { value: "solidity",   label: "Solidity" },
  { value: "java",       label: "Java" },
  { value: "cpp",        label: "C++" },
  { value: "swift",      label: "Swift" },
  { value: "kotlin",     label: "Kotlin" },
] as const;

// ── Physics helpers ──────────────────────────────────────────────────────────
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

// ── WNSP VM core ─────────────────────────────────────────────────────────────
interface Ins {
  off: number; op: number; mnem: string; args: string;
  nm?: number; ch?: string; cmt: string;
  gateThreshold?: number; gateHigh?: number; gateLow?: number;
  storeKey?: string; storeVal?: string;
  xferAmount?: string;
}
interface VMState {
  pc: number;
  registers: { nm: number; name: string; value: string; band: string }[];
  agents: { name: string; nm: number; psi: string; status: "ACTIVE" | "IDLE" }[];
  output: { text: string; type: "sys" | "emit" | "broad" | "agent" | "gate" | "err" | "store" | "xfer" | "call" }[];
  tuned: number;
  halted: boolean;
  cycleCount: number;
  gateResult?: { routed: number; band: string; load: number; threshold: number };
  kvStore: Record<string, any>;
  kvDirty: Record<string, any>;
}

function freshVM(): VMState {
  return { pc: 0, registers: [], agents: [], output: [], tuned: 520, halted: false, cycleCount: 0, kvStore: {}, kvDirty: {} };
}

function compileWLS(src: string): Ins[] {
  if (!src.trim()) return [];
  const ins: Ins[] = [];
  let off = 0;
  function add(op: number, mnem: string, args: string, cmt: string, nm?: number, ch?: string, extra?: Partial<Ins>) {
    ins.push({ off, op, mnem, args, nm, ch, cmt, ...extra });
    if (op !== 0x00) off += 8;
  }
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("//") || line.startsWith(";") || line.startsWith("#")) continue;
    const mGate = line.match(/GATE\(load\s*>\s*(\d+)\s*→\s*(\d+\.?\d*)nm\s*:\s*(\d+\.?\d*)nm\)/);
    if (mGate) {
      add(0x09, "GATE", `load>${mGate[1]} → ${mGate[2]}nm : ${mGate[3]}nm`, `nonlinear switch`, undefined, undefined, { gateThreshold: parseInt(mGate[1]), gateHigh: parseFloat(mGate[2]), gateLow: parseFloat(mGate[3]) });
      continue;
    }
    const m1 = line.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);
    if (m1) { add(0x03, "EMIT", `λ=${m1[1]}nm  ${m1[2]}`, `emit on ${nmToBand(parseFloat(m1[1]))} band`, parseFloat(m1[1]), m1[2]); continue; }
    const m2 = line.match(/tune\((\d+\.?\d*)nm\)/);
    if (m2) { add(0x01, "TUNE", `λ=${m2[1]}nm`, `receiver → ${nmToBand(parseFloat(m2[1]))} band`, parseFloat(m2[1])); continue; }
    const m3 = line.match(/^agent\s+(\w+)/);
    if (m3) { const e = ceEncode(m3[1]); add(0x0A, "AGENT", `"${m3[1]}"  ${e.psi}`, `AI agent λ=${e.nm}nm`, e.nm, e.psi); continue; }
    const m4 = line.match(/^fn\s+(\w+)/);
    if (m4) { const e = ceEncode(m4[1]); add(0x07, "LABEL", `${m4[1]}  ${e.psi}`, `fn → λ=${e.nm}nm`, e.nm, e.psi); continue; }
    const m5 = line.match(/node\.register\("([^"]+)"/);
    if (m5) { const e = ceEncode(m5[1]); add(0x0A, "AGENT", `"${m5[1]}"  ${e.psi}  PUBLIC`, `spectral network node`, e.nm, e.psi); continue; }
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
    if (mStoreAssign) { const v = mStoreAssign[2].trim().replace(/^["']|["']$/g, ""); add(0x10, "STORE", `${mStoreAssign[1]} := ${v}`, `persist ${mStoreAssign[1]} → state`, undefined, undefined, { storeKey: mStoreAssign[1], storeVal: v }); continue; }
    const mStoreRef = line.match(/^@store\s+(\w+)\s*$/);
    if (mStoreRef) { add(0x10, "STORE", mStoreRef[1], `persist register → state`, undefined, undefined, { storeKey: mStoreRef[1] }); continue; }
    const mLoad = line.match(/^@load\s+(\w+)/);
    if (mLoad) { add(0x11, "LOAD", mLoad[1], `restore ${mLoad[1]} ← state`); continue; }
    const mXferNxt = line.match(/^transfer_nxt\("([^"]+)",\s*"([^"]+)"\)/);
    if (mXferNxt) { add(0x12, "XFER_NXT", `"${mXferNxt[1]}"  ${mXferNxt[2]}`, `transfer ${mXferNxt[2]} NXT`, undefined, mXferNxt[1], { xferAmount: mXferNxt[2] }); continue; }
    const mXferSats = line.match(/^transfer_sats\("([^"]+)",\s*"([^"]+)"\)/);
    if (mXferSats) { add(0x13, "XFER_SATS", `"${mXferSats[1]}"  ${mXferSats[2]}`, `transfer ${mXferSats[2]} sats`, undefined, mXferSats[1], { xferAmount: mXferSats[2] }); continue; }
    const mCall = line.match(/^call\("([^"]+)"\)/);
    if (mCall) { add(0x14, "CALL", `"${mCall[1]}"`, `call sub-contract "${mCall[1]}"`); continue; }
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
    case 0x01: { s.tuned = i.nm ?? s.tuned; s.output.push({ text: `TUNE  λ=${i.nm}nm → ${nmToBand(i.nm ?? s.tuned)} band`, type: "sys" }); break; }
    case 0x02: { const regName = i.args.replace(/.*"([^"]+)".*/, "$1"); s.registers = [...s.registers.filter(r => r.nm !== (i.nm ?? s.tuned))]; s.registers.push({ nm: i.nm ?? s.tuned, name: regName, value: `@${i.nm}nm`, band: nmToBand(i.nm ?? s.tuned) }); s.output.push({ text: `PUSH  ${regName} → Ψ-register λ=${i.nm}nm [${nmToBand(i.nm ?? s.tuned)}]`, type: "sys" }); break; }
    case 0x03: { s.output.push({ text: `EMIT  λ=${i.nm}nm  ${i.ch ?? ""}  → ${nmToBand(i.nm ?? s.tuned)} band`, type: "emit" }); break; }
    case 0x05: { s.output.push({ text: `BROAD  ${i.args}  → all Ψ subscribers`, type: "broad" }); break; }
    case 0x06: { s.output.push({ text: `OCS   ${i.args}  — oscillating wave loop`, type: "sys" }); break; }
    case 0x07: { s.output.push({ text: `LABEL  fn:${i.args}  @ λ=${i.nm}nm`, type: "sys" }); break; }
    case 0x08: { s.output.push({ text: `JMPZ  ${i.args}  — photon path branch`, type: "sys" }); break; }
    case 0x09: {
      const thr = i.gateThreshold ?? 50; const hi = i.gateHigh ?? s.tuned; const lo = i.gateLow ?? s.tuned;
      const fired = channelLoad > thr; const routedNm = fired ? hi : lo;
      s.gateResult = { routed: routedNm, band: nmToBand(routedNm), load: channelLoad, threshold: thr };
      s.tuned = routedNm;
      s.output.push({ text: `GATE  load=${channelLoad} ${fired ? ">" : "≤"} ${thr}  →  ${routedNm}nm [${nmToBand(routedNm)}]  ${fired ? "⚡ HIGH PATH" : "〰 LOW PATH"}`, type: "gate" });
      break;
    }
    case 0x0A: { const aName = i.args.replace(/"([^"]+)".*/, "$1"); if (!s.agents.find(a => a.name === aName)) s.agents.push({ name: aName, nm: i.nm ?? s.tuned, psi: i.ch ?? `Ψ(0,0,H)`, status: "ACTIVE" }); s.output.push({ text: `AGENT  "${aName}"  registered @ ${i.ch}`, type: "agent" }); break; }
    case 0x0B: { s.output.push({ text: `EXEC  ${i.cmt.slice(0, 60)}`, type: "sys" }); break; }
    case 0xFE: { s.output.push({ text: `RET   — wave collapses, scope exits`, type: "sys" }); break; }
    case 0xFF: { s.halted = true; s.output.push({ text: `HALT  — wavefunction terminated  (${s.cycleCount} cycles)`, type: "sys" }); break; }
    // v1.1 opcodes
    case 0x10: {
      const key = i.storeKey ?? i.args.split(" ")[0];
      const val = i.storeVal ?? `@${s.tuned}nm`;
      s.kvDirty = { ...s.kvDirty, [key]: val };
      s.output.push({ text: `STORE  ${key} := "${val}"  → contract_state`, type: "store" });
      break;
    }
    case 0x11: {
      const key = i.args;
      const val = s.kvStore[key] ?? s.kvDirty[key] ?? null;
      s.output.push({ text: `LOAD  ${key} ← ${val !== null ? `"${JSON.stringify(val)}"` : "(not set)"}  from contract_state`, type: "store" });
      break;
    }
    case 0x12: {
      s.output.push({ text: `XFER_NXT  ${i.xferAmount ?? "0"} NXT → ${i.ch ?? "?"} [browser sim — no chain effect]`, type: "xfer" });
      break;
    }
    case 0x13: {
      s.output.push({ text: `XFER_SATS  ${i.xferAmount ?? "0"} sats → ${i.ch ?? "?"} [browser sim — no chain effect]`, type: "xfer" });
      break;
    }
    case 0x14: {
      const slug = i.args.replace(/"/g, "");
      s.output.push({ text: `CALL  "${slug}" [use Execute on Chain to invoke sub-contract]`, type: "call" });
      break;
    }
    default: break;
  }
  return s;
}

// ── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES: { name: string; description: string; code: string }[] = [
  {
    name: "Hello Photon",
    description: "Minimal first contract",
    code: `// Hello Photon — Minimal WavelengthScript Contract
// Executes in the WNSP VM · AGPL-3.0

tune(540nm)  // LOGIC band

@emit(540.5nm, Ψ(41,13,V))
fn main() {
  @540nm let message := "Hello from the WNSP VM"
  broadcast(message)
  emit result
}
`,
  },
  {
    name: "AI Agent",
    description: "Register an AI agent on the spectral network",
    code: `// AI Agent Contract — WavelengthScript v1.0
// Registers an AI reasoning agent at a spectral address

tune(540nm)  // LOGIC band — AI agents live here

agent Nexus
node.register("Nexus-Reasoning-v1", @540nm)

@emit(541.2nm, Ψ(41,12,V))
fn process(input) {
  @540nm let prompt := tune(Ψ(41,12,V))
  broadcast(prompt)
  oscillate(Ψ(41,12,V), 7.83Hz) {
    emit response
  }
}
`,
  },
  {
    name: "Governance Vote",
    description: "Submit an on-chain governance proposal",
    code: `// Governance Vote — WavelengthScript v1.0
// KERNEL band required for protocol parameter changes

tune(468nm)  // AUTH band — governance

@emit(469.4nm, Ψ(23,44,V))
fn submitProposal(param, newValue) {
  @468nm let proposalId := ceEncode(param)
  @469nm let vote := newValue
  broadcast(Ψ(23,44,V))
  emit proposalId
}

fn castVote(proposalId, support) {
  @540nm let weight := caller.spectralBand
  oscillate(Ψ(23,44,V), 0Hz) {
    broadcast(weight)
  }
  emit weight
}
`,
  },
  {
    name: "P2P Transfer",
    description: "Physics-based peer transfer",
    code: `// P2P Transfer — WavelengthScript v1.0
// Fee = base_fee × (E_sender / E_reference)  where E = hf

tune(580nm)  // INTERFACE band

@emit(581.0nm, Ψ(51,6,H))
fn transfer(recipient, amount) {
  @580nm let senderChannel := caller.psiChannel
  @582nm let fee := Λ(h=6.626e-34, f=515e12)
  @584nm let netAmount := amount - fee
  broadcast(Ψ(51,6,H))
  emit netAmount
}
`,
  },
  {
    name: "Spectral Wallet",
    description: "Wallet operations at wavelength addresses",
    code: `// Spectral Wallet — WavelengthScript v1.0
// NXT wallet bound to Ψ channel address

tune(620nm)  // STORAGE band

agent WalletGuard

@emit(621.0nm, Ψ(61,5,V))
fn getBalance(address) {
  @620nm let wallet := tune(Ψ(61,5,V))
  emit wallet.balance
}

fn deposit(amount) {
  @622nm let entry := amount
  broadcast(entry)
  emit entry
}

fn withdraw(amount, destination) {
  GATE(load > 50 → 622nm : 580nm)
  broadcast(destination)
  emit amount
}
`,
  },
  {
    name: "Persistent State",
    description: "STORE/LOAD persistent K/V across executions",
    code: `// Persistent State — WavelengthScript v1.1
// Values written with @store persist in contract_state
// across ALL future executions of this contract.

tune(650nm)  // STORAGE band — persistent state lives here

fn increment() {
  @load counter
  // counter is now loaded from contract_state
  @store counter := 1
  // In a real contract, read the loaded value and add 1
  broadcast(counter)
  emit counter
}

fn setOwner() {
  @store owner := "Ψ(52,3,V)"
  @store created_at := "2026-06-18"
  broadcast(owner)
  emit owner
}
`,
  },
  {
    name: "Token Transfer",
    description: "Send NXT from contract wallet on execution",
    code: `// Token Transfer — WavelengthScript v1.1
// Contract must be funded via POST /api/contracts/:id/fund
// XFER_NXT deducts from contract wallet, not caller wallet.

tune(580nm)  // INTERFACE band

@store last_recipient := "Ψ(41,13,V)"

fn sendReward(recipient) {
  // Transfer 1 NXT from this contract's wallet to recipient
  transfer_nxt("Ψ(41,13,V)", "1.00000000")
  @store last_recipient := "Ψ(41,13,V)"
  broadcast(recipient)
  emit result
}

fn invokeHelper() {
  // Call another deployed contract by its slug
  call("hello-photon")
  emit result
}
`,
  },
];

// ── Syntax highlighter — token-based to avoid regex collision ─────────────────
function highlight(code: string): string {
  const KWS = new Set(["fn","let","agent","node","tune","emit","broadcast","oscillate","GATE","type","record","transfer_nxt","transfer_sats","call"]);
  const OPS = new Set(["HALT","RET","PUSH","EMIT","TUNE","BROAD","OCS","JMPZ","EXEC","AGENT","LABEL","GATE","STORE","LOAD","XFER_NXT","XFER_SATS","CALL"]);

  return code.split("\n").map(line => {
    // Comments: everything from // to end of line
    const commentIdx = line.indexOf("//");
    let mainPart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : "";

    // Tokenize mainPart
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Split by tokens we care about, preserving everything else
    const tokenRe = /(@\d+\.?\d*nm)|(Ψ\([^)]*\))|("(?:[^"\\]|\\.)*")|\b([A-Za-z_]\w*)\b|(\d+\.?\d*)/g;
    let result = "";
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(mainPart)) !== null) {
      // Plain text before this match
      result += esc(mainPart.slice(lastIdx, match.index));
      const [full, nm, psi, str, word, num] = match;
      if (nm)   result += `<span style="color:#34d399">${esc(full)}</span>`;
      else if (psi)  result += `<span style="color:#a78bfa">${esc(full)}</span>`;
      else if (str)  result += `<span style="color:#fbbf24">${esc(full)}</span>`;
      else if (word) {
        if (KWS.has(word))      result += `<span style="color:#38bdf8;font-weight:600">${esc(full)}</span>`;
        else if (OPS.has(word)) result += `<span style="color:#fb923c;font-weight:600">${esc(full)}</span>`;
        else                    result += esc(full);
      }
      else if (num) result += `<span style="color:#f472b6">${esc(full)}</span>`;
      else result += esc(full);
      lastIdx = match.index + full.length;
    }
    result += esc(mainPart.slice(lastIdx));
    if (commentPart) result += `<span style="color:#64748b;font-style:italic">${esc(commentPart)}</span>`;
    return result;
  }).join("\n");
}

// ── Main IDE component ────────────────────────────────────────────────────────
export default function SpectralIDEPage() {
  usePageMeta({ title: "Spectral IDE — NexusOS", description: "Write, compile and execute WavelengthScript smart contracts inside the WNSP VM." });
  const { toast } = useToast();
  const qc = useQueryClient();

  const [code, setCode] = useState(TEMPLATES[0].code);
  const [contractName, setContractName] = useState("Hello Photon");
  const [activeTab, setActiveTab] = useState<"asm" | "hex" | "manifest">("asm");
  const [compiled, setCompiled] = useState<{ instructions: Ins[]; asm: string; hex: string; manifest: any[] } | null>(null);
  const [vmState, setVmState] = useState<VMState>(freshVM());
  const [channelLoad, setChannelLoad] = useState(42);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  // ── Import Code panel state ──────────────────────────────────────────────
  const [showImport, setShowImport]       = useState(false);
  const [importLang, setImportLang]       = useState<string>("python");
  const [importSrc,  setImportSrc]        = useState("");
  const [importName, setImportName]       = useState("");
  const [importResult, setImportResult]   = useState<{ wls: string; opcode_count: number; spectral_address: string } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // BUG-1 FIX: ref keeps channelLoad current inside the stale interval closure
  const channelLoadRef = useRef(channelLoad);
  useEffect(() => { channelLoadRef.current = channelLoad; }, [channelLoad]);

  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ["/api/contracts"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return [];
      const r = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem("auth_token");
      const r = await fetch(selectedContract ? `/api/contracts/${selectedContract}` : "/api/contracts", {
        method: selectedContract ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      setSelectedContract(data.id);
      toast({ title: "Contract saved", description: data.name });
    },
  });

  const deployMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("auth_token");
      const r = await fetch(`/api/contracts/${id}/deploy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({ title: "Contract deployed", description: `Live at /app/${data.app_slug}` });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("auth_token");
      const r = await fetch(`/api/contracts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      setSelectedContract(null);
    },
  });

  const handleCompile = useCallback(() => {
    const ins = compileWLS(code);
    const realIns = ins.filter(i => i.op !== 0x00);

    const asmLines = [
      `; ── WNSP Bytecode Assembly ───────────────────────────────────────────`,
      `; NexusOS · ${contractName} · ${new Date().toISOString().slice(0, 19)}Z`,
      `; Instructions: ${realIns.length} · Hilbert: 25,600 Ψ channels`,
      ``,
      ...ins.map(i => {
        if (!i.mnem) return "";
        if (i.mnem === ";") return `  ; ${i.args}`;
        if (i.mnem.startsWith(".")) return `${i.mnem.padEnd(10)} ${i.args}`;
        const addr = `0x${i.off.toString(16).padStart(6, "0")}`;
        return `  ${addr}  ${i.op.toString(16).padStart(2, "0")}  ${i.mnem.padEnd(8)} ${i.args}  ; ${i.cmt}`;
      }),
    ];

    const hexLines = [
      `; WNSP Binary Hex Dump`,
      `0x000000  57 4E 53 50 01 00 00 00  ; magic "WNSP" v1.0`,
      `0x000008  ${realIns.length.toString(16).padStart(8, "0").match(/.{2}/g)!.join(" ")}  ; instr count`,
      ...realIns.slice(0, 16).map((i, idx) => {
        const addr = `0x${(16 + idx * 8).toString(16).padStart(6, "0")}`;
        const nm16 = i.nm ? Math.round(i.nm * 10) : 0;
        const b1 = Math.floor(nm16 / 256).toString(16).padStart(2, "0");
        const b2 = (nm16 % 256).toString(16).padStart(2, "0");
        return `${addr}  ${i.op.toString(16).padStart(2, "0")} ${b1} ${b2} 00 00 00 00 00  ; ${i.mnem} ${i.args.slice(0, 20)}`;
      }),
      realIns.length > 16 ? `... (${realIns.length - 16} more instructions)` : "",
    ];

    const manifest = [...new Map(
      ins.filter(i => i.nm && i.ch)
        .map(i => [i.ch, { symbol: i.args.split('"')[1] ?? i.mnem, nm: i.nm!, psi: i.ch!, band: nmToBand(i.nm!) }])
    ).values()];

    setCompiled({ instructions: ins, asm: asmLines.join("\n"), hex: hexLines.filter(Boolean).join("\n"), manifest });
    setVmState(freshVM());
    toast({ title: `Compiled — ${realIns.length} instructions`, description: `${manifest.length} Ψ symbols` });
  }, [code, contractName, toast]);

  const handleStep = useCallback(() => {
    if (!compiled) return;
    setVmState(s => {
      const next = stepVM(s, compiled.instructions, channelLoad);
      setTimeout(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, 0);
      return next;
    });
  }, [compiled, channelLoad]);

  const handleRun = useCallback(() => {
    if (!compiled) return;
    if (running) { if (runRef.current) clearInterval(runRef.current); setRunning(false); return; }
    setRunning(true);
    // BUG-1 FIX: read channelLoadRef.current inside the interval — always current
    runRef.current = setInterval(() => {
      setVmState(s => {
        if (s.halted) { setRunning(false); if (runRef.current) clearInterval(runRef.current!); return s; }
        const next = stepVM(s, compiled.instructions, channelLoadRef.current);
        setTimeout(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, 0);
        return next;
      });
    }, 120);
  }, [compiled, running]);

  const handleReset = useCallback(() => {
    setVmState(freshVM());
    setRunning(false);
    if (runRef.current) clearInterval(runRef.current);
  }, []);

  useEffect(() => { return () => { if (runRef.current) clearInterval(runRef.current); }; }, []);

  const handleSave = () => {
    // G-003 FIX: require compilation before save — prevents empty-bytecode state
    if (!compiled) {
      toast({ title: "Compile first", description: "Hit Compile before saving so bytecode is included", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ name: contractName, source_code: code, bytecode: compiled.hex, assembly: compiled.asm, manifest: compiled.manifest, instr_count: compiled.instructions.filter(i => i.op !== 0).length });
  };

  const handleDeploy = () => {
    if (!selectedContract) { toast({ title: "Save first", description: "Save the contract before deploying", variant: "destructive" }); return; }
    deployMutation.mutate(selectedContract);
  };

  const handleLoadTemplate = (t: typeof TEMPLATES[0]) => {
    setCode(t.code); setContractName(t.name); setCompiled(null); setVmState(freshVM()); setSelectedContract(null);
  };

  const handleLoadContract = (c: any) => {
    setCode(c.source_code); setContractName(c.name); setSelectedContract(c.id);
    setCompiled(null); setVmState(freshVM());
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const handleImportTranspile = async () => {
    if (!importSrc.trim()) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const token = localStorage.getItem("auth_token");
      // G-004 FIX: give a clear login hint before hitting the server
      if (!token) {
        toast({ title: "Login required", description: "Sign in to use the Import panel", variant: "destructive" });
        return;
      }
      const r = await fetch("/api/ide/transpile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source_code: importSrc, source_language: importLang, contract_name: importName || undefined }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        toast({ title: "Transpile failed", description: err.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      const data = await r.json();
      setImportResult({ wls: data.wavelength_script, opcode_count: data.opcode_count, spectral_address: data.spectral_address });
    } catch (e: any) {
      toast({ title: "Network error", description: e.message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  const handleLoadImport = () => {
    if (!importResult) return;
    if (runRef.current) { clearInterval(runRef.current); runRef.current = null; setRunning(false); }
    setCode(importResult.wls);
    if (importName) setContractName(importName);
    setCompiled(null);
    setVmState(freshVM());
    setSelectedContract(null);
    setShowImport(false);
    setImportResult(null);
    toast({ title: "Code loaded", description: "WavelengthScript ready — hit Compile to continue" });
  };

  const lines = code.split("\n");
  // BUG-3 FIX: we have no source-line→instruction mapping, so don't fake it;
  // highlight the instruction index row (approximate but not misleading)
  const activeLineIdx = (compiled && !vmState.halted) ? vmState.pc : -1;

  const outputColor = (type: string) => {
    switch (type) {
      case "emit":  return "text-cyan-400";
      case "broad": return "text-purple-400";
      case "agent": return "text-green-400";
      case "gate":  return "text-yellow-400";
      case "err":   return "text-red-400";
      case "store": return "text-blue-400";
      case "xfer":  return "text-orange-400";
      case "call":  return "text-violet-400";
      default:      return "text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
      <style>{`
        .wls-comment { color: #64748b; font-style: italic; }
        .wls-kw { color: #38bdf8; font-weight: 600; }
        .wls-nm { color: #34d399; }
        .wls-psi { color: #a78bfa; }
        .wls-op { color: #fb923c; font-weight: 600; }
        .wls-str { color: #fbbf24; }
        .wls-num { color: #f472b6; }
        .editor-wrap { position: relative; }
        .editor-highlight { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; white-space: pre; overflow: hidden; font-size: 13px; line-height: 1.6; padding: 12px 12px 12px 0; }
        .editor-textarea { position: relative; z-index: 1; background: transparent; color: transparent; caret-color: #e2e8f0; resize: none; outline: none; white-space: pre; font-size: 13px; line-height: 1.6; padding: 12px 12px 12px 0; width: 100%; }
      `}</style>

      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-2 flex items-center gap-3 bg-slate-900/80">
        <Link href="/hub" className="text-slate-500 hover:text-slate-300 transition-colors"><ArrowLeft size={16} /></Link>
        <Code2 size={16} className="text-cyan-400" />
        <span className="text-slate-300 font-semibold text-sm">Spectral IDE</span>
        <span className="text-slate-700">|</span>
        <input
          value={contractName}
          onChange={e => setContractName(e.target.value)}
          className="bg-transparent text-cyan-300 text-sm outline-none border-b border-slate-700 focus:border-cyan-500 px-1 min-w-[160px]"
          placeholder="Contract name…"
          data-testid="input-contract-name"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-600">WavelengthScript v1.0 · WNSP VM</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — contract library */}
        <div className="w-56 border-r border-slate-800 flex flex-col bg-slate-900/40 overflow-y-auto shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">Templates</div>
          {TEMPLATES.map(t => (
            <button key={t.name} onClick={() => handleLoadTemplate(t)}
              className="text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition-colors border-b border-slate-800/50"
              data-testid={`btn-template-${t.name.replace(/\s/g,"-").toLowerCase()}`}>
              <div className="text-slate-300 font-medium">{t.name}</div>
              <div className="text-slate-600 mt-0.5">{t.description}</div>
            </button>
          ))}

          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800 mt-2 flex items-center justify-between">
            <span>Contracts</span>
            <button onClick={() => { setCode(""); setContractName("Untitled"); setSelectedContract(null); setCompiled(null); setVmState(freshVM()); }}
              className="text-slate-600 hover:text-cyan-400"><Plus size={12} /></button>
          </div>
          {contracts.length === 0 && <div className="px-3 py-4 text-xs text-slate-700">No contracts yet — save one to start</div>}
          {contracts.map((c: any) => (
            <div key={c.id}
              className={`flex items-start border-b border-slate-800/50 ${selectedContract === c.id ? "bg-slate-800/80 border-l-2 border-l-cyan-500" : ""}`}>
              {/* BUG-4 FIX: delete button now wired to deleteMutation */}
              <button onClick={() => handleLoadContract(c)}
                className="flex-1 text-left px-3 py-2 text-xs hover:bg-slate-800/40 transition-colors"
                data-testid={`btn-contract-${c.id}`}>
                <div className="flex items-center gap-1">
                  <span className="text-slate-300 truncate max-w-[110px]">{c.name}</span>
                  {c.app_slug && <span className="text-green-500 shrink-0" title="Deployed"><Zap size={10} /></span>}
                </div>
                <div className="text-slate-700 mt-0.5">{c.instr_count ?? 0} instrs</div>
              </button>
              <button
                onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id); }}
                className="p-2 text-slate-700 hover:text-red-400 transition-colors shrink-0"
                title="Delete contract"
                data-testid={`btn-delete-${c.id}`}>
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Center — editor */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-800 bg-slate-900/60">
            <button onClick={handleCompile} data-testid="btn-compile"
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded border border-cyan-600/30 transition-colors font-semibold">
              <Zap size={11} /> Compile
            </button>
            <button onClick={handleStep} disabled={!compiled || vmState.halted} data-testid="btn-step"
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-700/40 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700 transition-colors disabled:opacity-30">
              <StepForward size={11} /> Step
            </button>
            <button onClick={handleRun} disabled={!compiled} data-testid="btn-run"
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded border transition-colors ${running ? "bg-orange-600/30 border-orange-600/40 text-orange-300" : "bg-green-600/20 hover:bg-green-600/40 text-green-300 border-green-600/30"}`}>
              <Play size={11} /> {running ? "Pause" : "Run"}
            </button>
            <button onClick={handleReset} disabled={!compiled} data-testid="btn-reset"
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-700/40 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700 transition-colors disabled:opacity-30">
              <RotateCcw size={11} /> Reset
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button onClick={handleSave} data-testid="btn-save"
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-700/40 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700 transition-colors">
              <Save size={11} /> Save
            </button>
            <button onClick={handleDeploy} disabled={!selectedContract} data-testid="btn-deploy"
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded border border-purple-600/30 transition-colors disabled:opacity-30">
              <Rocket size={11} /> Deploy
            </button>
            <button onClick={handleCopy} data-testid="btn-copy"
              className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-400 transition-colors">
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>

          {/* Load slider */}
          <div className="flex items-center gap-2 px-3 py-1 border-b border-slate-800/50 bg-slate-900/30">
            <span className="text-xs text-slate-600">Channel load:</span>
            <input type="range" min={0} max={100} value={channelLoad} onChange={e => setChannelLoad(+e.target.value)}
              className="w-24 h-1 accent-cyan-500" data-testid="slider-channel-load" />
            <span className="text-xs text-cyan-500 font-mono">{channelLoad}%</span>
            {compiled && <span className="text-xs text-slate-600 ml-2">PC:{vmState.pc} · cycles:{vmState.cycleCount} · {vmState.halted ? "HALTED" : "READY"}</span>}
            <button
              onClick={() => { setShowImport(v => !v); setImportResult(null); }}
              className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors border-violet-700/40 bg-violet-900/20 hover:bg-violet-800/40 text-violet-300"
              data-testid="btn-toggle-import">
              <Globe2 size={10} />
              <span>Import</span>
              {showImport ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>

          {/* ── Import Code panel ───────────────────────────────────────────────── */}
          {showImport && (
            <div className="border-b border-violet-800/30 bg-violet-950/20 px-3 py-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FileCode2 size={12} className="text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">Translate any language → WavelengthScript</span>
              </div>

              {/* Row 1: language + contract name */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={importLang}
                  onChange={e => { setImportLang(e.target.value); setImportResult(null); }}
                  className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 outline-none focus:border-violet-500"
                  data-testid="select-import-lang">
                  {IMPORT_LANGS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <input
                  value={importName}
                  onChange={e => setImportName(e.target.value)}
                  placeholder="Contract name (optional)"
                  className="flex-1 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 outline-none focus:border-violet-500 min-w-[130px]"
                  data-testid="input-import-name"
                />
              </div>

              {/* Row 2: source code textarea */}
              <textarea
                value={importSrc}
                onChange={e => { setImportSrc(e.target.value); setImportResult(null); }}
                placeholder={`Paste ${IMPORT_LANGS.find(l => l.value === importLang)?.label ?? "source"} code here…`}
                rows={6}
                spellCheck={false}
                className="w-full text-xs font-mono bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 outline-none focus:border-violet-500 resize-none"
                data-testid="textarea-import-src"
              />

              {/* Row 3: action buttons + result badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleImportTranspile}
                  disabled={!importSrc.trim() || importLoading}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 rounded border border-violet-600/40 transition-colors disabled:opacity-40 font-semibold"
                  data-testid="btn-import-transpile">
                  <Zap size={10} />
                  {importLoading ? "Transpiling…" : "Transpile → WLS"}
                </button>

                {importResult && (
                  <>
                    <span className="text-xs text-slate-500">
                      {importResult.opcode_count} opcodes · {importResult.spectral_address}
                    </span>
                    <button
                      onClick={handleLoadImport}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 rounded border border-cyan-600/40 transition-colors font-semibold"
                      data-testid="btn-import-load">
                      <ArrowDownToLine size={10} />
                      Load into Editor
                    </button>
                  </>
                )}
              </div>

              {/* Row 4: WLS preview (truncated) */}
              {importResult && (
                <pre className="text-[10px] font-mono text-violet-300/70 bg-slate-900/60 border border-slate-800 rounded px-2 py-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap">
                  {importResult.wls.slice(0, 600)}{importResult.wls.length > 600 ? "\n…" : ""}
                </pre>
              )}

              {/* API hint */}
              <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-1.5 mt-0.5">
                Also available via Developer API:
                <code className="ml-1 text-slate-500">POST /api/dev/transpile</code>
                {" — requires API key from "}
                <Link href="/developer-keys" className="text-violet-500 hover:text-violet-400">/developer-keys</Link>
              </div>
            </div>
          )}

          {/* Code editor */}
          <div className="flex-1 overflow-auto bg-slate-950 flex">
            {/* Line numbers */}
            <div className="select-none text-right pr-3 pl-3 pt-3 text-slate-700 text-xs leading-[1.6] shrink-0 border-r border-slate-800/50" style={{ minWidth: "42px", fontSize: "13px" }}>
              {lines.map((_, i) => (
                <div key={i} className={i === activeLineIdx ? "text-cyan-400 font-bold" : ""}>{i + 1}</div>
              ))}
            </div>
            {/* Editor area */}
            <div className="flex-1 relative min-w-0 editor-wrap" style={{ paddingLeft: "12px" }}>
              <pre className="editor-highlight text-slate-300"
                dangerouslySetInnerHTML={{ __html: highlight(code) + "\n" }} />
              <textarea
                ref={textareaRef}
                value={code}
                onChange={e => {
                // BUG-2 FIX: stop the run loop when code changes — old bytecode is now stale
                if (runRef.current) { clearInterval(runRef.current); runRef.current = null; setRunning(false); }
                setCode(e.target.value); setCompiled(null); setVmState(freshVM());
              }}
                spellCheck={false}
                className="editor-textarea min-h-full"
                style={{ height: Math.max(lines.length * 1.6 * 13 + 24, 300) + "px" }}
                data-testid="textarea-editor"
                onKeyDown={e => {
                  if (e.key === "Tab") { e.preventDefault(); const s = e.currentTarget; const v = s.value; const start = s.selectionStart; s.value = v.slice(0, start) + "  " + v.slice(s.selectionEnd); s.selectionStart = s.selectionEnd = start + 2; setCode(s.value); }
                }}
              />
            </div>
          </div>
        </div>

        {/* Right panel — VM state + output */}
        <div className="w-80 border-l border-slate-800 flex flex-col bg-slate-900/30 shrink-0 overflow-hidden">
          {/* Ψ Registers */}
          <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
            <Cpu size={12} className="text-cyan-400" />
            <span className="text-xs font-semibold text-slate-400">Ψ Registers</span>
            <span className="ml-auto text-xs text-slate-700">tuned:{vmState.tuned}nm</span>
          </div>
          <div className="px-2 py-1 max-h-28 overflow-y-auto">
            {vmState.registers.length === 0 && <div className="text-xs text-slate-700 px-1 py-2">No registers allocated</div>}
            {vmState.registers.map((r, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: nmToColor(r.nm) }} />
                <span className="text-slate-400 truncate">{r.name}</span>
                <span className="ml-auto text-slate-600 font-mono">{r.nm}nm</span>
              </div>
            ))}
          </div>

          {/* Agents */}
          <div className="px-3 py-2 border-b border-slate-800 border-t flex items-center gap-2">
            <Radio size={12} className="text-green-400" />
            <span className="text-xs font-semibold text-slate-400">Agents</span>
          </div>
          <div className="px-2 py-1 max-h-20 overflow-y-auto">
            {vmState.agents.length === 0 && <div className="text-xs text-slate-700 px-1 py-2">No agents registered</div>}
            {vmState.agents.map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
                <span className="text-green-400">◈</span>
                <span className="text-slate-300 truncate">{a.name}</span>
                <span className="ml-auto text-slate-600">{a.psi}</span>
              </div>
            ))}
          </div>

          {/* Compile output tabs */}
          <div className="flex border-b border-slate-800 border-t">
            {(["asm", "hex", "manifest"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${activeTab === t ? "text-cyan-400 border-b-2 border-cyan-500 bg-slate-800/40" : "text-slate-600 hover:text-slate-400"}`}>
                {t === "asm" ? "ASM" : t === "hex" ? "HEX" : "MAP"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-xs px-2 py-2 max-h-40">
            {!compiled && <div className="text-slate-700 py-4 text-center">Compile to see output</div>}
            {compiled && activeTab === "asm" && <pre className="text-slate-500 whitespace-pre-wrap leading-relaxed">{compiled.asm}</pre>}
            {compiled && activeTab === "hex" && <pre className="text-green-700 whitespace-pre-wrap leading-relaxed">{compiled.hex}</pre>}
            {compiled && activeTab === "manifest" && compiled.manifest.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: nmToColor(s.nm) }} />
                <span className="text-slate-400 truncate">{s.symbol}</span>
                <span className="ml-auto text-slate-600">{s.nm}nm</span>
              </div>
            ))}
          </div>

          {/* VM Output log */}
          <div className="px-3 py-2 border-t border-slate-800 flex items-center gap-2">
            <Activity size={12} className="text-yellow-400" />
            <span className="text-xs font-semibold text-slate-400">VM Output</span>
          </div>
          <div ref={outputRef} className="flex-1 overflow-y-auto px-2 py-1 font-mono text-xs min-h-0 max-h-52">
            {vmState.output.length === 0 && <div className="text-slate-700 py-2">No output — run the VM</div>}
            {vmState.output.map((o, i) => (
              <div key={i} className={`py-0.5 leading-relaxed ${outputColor(o.type)}`}>{o.text}</div>
            ))}
          </div>

          {/* G-002 FIX: prominent Execute on Chain button when contract is deployed */}
          {(() => {
            const deployed = contracts.find((c: any) => c.id === selectedContract && c.app_slug);
            return deployed ? (
              <div className="px-3 py-2 border-t border-slate-800 flex items-center gap-2 bg-purple-950/20">
                <a
                  href={`/app/${deployed.app_slug}`}
                  className="flex-1 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded border border-purple-600/40 transition-colors font-semibold justify-center"
                  data-testid="btn-execute-on-chain">
                  <Zap size={11} className="text-purple-300" />
                  Execute on Chain
                </a>
                <a href={`/app/${deployed.app_slug}`}
                  className="text-[10px] text-slate-600 hover:text-slate-500 truncate max-w-[100px]"
                  title={`/app/${deployed.app_slug}`}>
                  <Share2 size={10} className="inline mr-0.5" />/app/{deployed.app_slug}
                </a>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}
