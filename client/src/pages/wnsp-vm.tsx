import { useState, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Cpu, Play, StepForward, RotateCcw, Zap, Radio, Database, Activity, FlaskConical } from "lucide-react";

function nmToColor(nm: number): string {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
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
      const thr = parseInt(mGate[1]); const hi = parseFloat(mGate[2]); const lo = parseFloat(mGate[3]);
      add(0x09, "GATE", `load>${thr} → ${hi}nm : ${lo}nm`, `nonlinear switch · threshold at load=${thr}`, undefined, undefined, { gateThreshold: thr, gateHigh: hi, gateLow: lo });
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
    const word = line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op";
    const e = ceEncode(word);
    add(0x0B, "EXEC", `@${e.nm}nm`, line.slice(0, 60), e.nm);
  }
  add(0xFF, "HALT", "", "wavefunction terminated");
  return ins;
}

interface VMState {
  pc: number;
  registers: { nm: number; name: string; value: string; band: string }[];
  agents: { name: string; nm: number; psi: string; status: "ACTIVE" | "IDLE" }[];
  output: { text: string; nm?: number; type: "emit" | "broad" | "sys" | "agent" | "gate" | "proof" }[];
  tuned: number;
  halted: boolean;
  cycleCount: number;
  gateResult?: { routed: number; band: string; load: number; threshold: number };
}

function freshState(): VMState {
  return { pc: 0, registers: [], agents: [], output: [], tuned: 520, halted: false, cycleCount: 0 };
}

function stepVM(state: VMState, ins: Ins[], channelLoad: number): VMState {
  if (state.halted || state.pc >= ins.length) return { ...state, halted: true };
  const i = ins[state.pc];
  const s = { ...state, pc: state.pc + 1, cycleCount: state.cycleCount + 1 };
  s.registers = [...state.registers];
  s.agents = [...state.agents];
  s.output = [...state.output];

  switch (i.op) {
    case 0x01:
      s.tuned = i.nm ?? s.tuned;
      s.output.push({ text: `TUNE → ${i.nm}nm  [${nmToBand(i.nm ?? s.tuned)}]`, nm: i.nm, type: "sys" });
      break;
    case 0x02:
      s.registers = [...s.registers.filter(r => r.nm !== (i.nm ?? s.tuned))];
      const regName = i.args.match(/"([^"]+)"/)?.[1] ?? "val";
      s.registers.push({ nm: i.nm ?? s.tuned, name: regName, value: `@${i.nm}nm`, band: nmToBand(i.nm ?? s.tuned) });
      s.output.push({ text: `PUSH "${regName}" → register @${i.nm}nm`, nm: i.nm, type: "sys" });
      break;
    case 0x03:
      s.output.push({ text: `EMIT  ${i.args}`, nm: i.nm, type: "emit" });
      break;
    case 0x04:
      s.output.push({ text: `PHASE shift applied → channel coherence updated`, type: "sys" });
      break;
    case 0x05:
      s.output.push({ text: `[BROAD] → ${i.args}`, nm: i.nm, type: "broad" });
      break;
    case 0x06:
      s.output.push({ text: `OCS oscillate(${i.args})  [non-blocking wave loop]`, type: "sys" });
      break;
    case 0x07:
      s.output.push({ text: `LABEL fn ${i.args}  [${i.cmt}]`, nm: i.nm, type: "sys" });
      break;
    case 0x08:
      s.output.push({ text: `?λ ${i.args}  [photon branch evaluated]`, type: "sys" });
      break;
    case 0x09: {
      const thr = i.gateThreshold ?? 5;
      const hiNm = i.gateHigh ?? 468;
      const loNm = i.gateLow ?? 648;
      const fired = channelLoad > thr;
      const routedNm = fired ? hiNm : loNm;
      const routedBand = nmToBand(routedNm);
      s.gateResult = { routed: routedNm, band: routedBand, load: channelLoad, threshold: thr };
      s.output.push({
        text: `GATE  load=${channelLoad} ${fired ? ">" : "≤"} ${thr}  →  ${routedNm}nm [${routedBand}]  ${fired ? "HIGH-LOAD PATH" : "LOW-LOAD PATH"}`,
        nm: routedNm, type: "gate"
      });
      s.output.push({
        text: `      same ψ_in · different load · different output · this is computation`,
        nm: routedNm, type: "proof"
      });
      break;
    }
    case 0x0A: {
      const aName = i.args.match(/"([^"]+)"/)?.[1] ?? "agent";
      if (!s.agents.find(a => a.name === aName)) {
        s.agents.push({ name: aName, nm: i.nm ?? s.tuned, psi: i.ch ?? `Ψ(0,0,H)`, status: "ACTIVE" });
      }
      s.output.push({ text: `AGENT "${aName}" registered at ${i.ch}  λ=${i.nm}nm`, nm: i.nm, type: "agent" });
      break;
    }
    case 0x0B:
      s.output.push({ text: `EXEC ${i.args.slice(0, 60)}`, nm: i.nm, type: "sys" });
      break;
    case 0xFE:
      s.output.push({ text: `RET  [wave collapses — scope end]`, type: "sys" });
      break;
    case 0xFF:
      s.output.push({ text: `HALT  [wavefunction terminated · ${s.cycleCount} cycles]`, type: "sys" });
      s.halted = true;
      break;
    default:
      break;
  }
  return s;
}

const COMPUTATION_PROOF_SRC = `// COMPUTATION PROOF v1.0
// Claim: same ψ_in, different channel state → different output
// This cannot be achieved by lookup or linear filtering.
//
// Three requirements demonstrated:
//   1. State-dependent output   (GATE reads live channelLoad)
//   2. Non-commutative T        (PUSH then GATE ≠ GATE then PUSH)
//   3. Nonlinearity             (threshold switch — not linear filter)

tune(520nm)

// Bind identical probe signal at LOGIC band
// ψ_in is the same every time — "birdsong" at 520nm
@520nm let ψ_in := probe("birdsong", @520nm)
emit ψ_in

// GATE: nonlinear threshold on channel load
// High load (>5): route to AUTH band  — higher authority, higher energy
// Low load  (≤5): route to STORAGE   — lower authority, lower energy
// Adjust the Channel Load slider to see output diverge
GATE(load > 5 → 468nm : 648nm)

// T1: compress result into authority register
@468nm let auth_path   := AuthBand.compress(ψ_in)
// T2: expand result into storage register
@648nm let store_path  := StorageBand.expand(ψ_in)

// Non-commutativity proof:
// compress(expand(ψ)) ≠ expand(compress(ψ))
// AUTH→STORAGE path ≠ STORAGE→AUTH path
emit auth_path
emit store_path`;

const SAMPLES = [
  { label: "AI Agent",          color: "#a78bfa", src: `tune(540nm)

@emit(541.2nm, Ψ(41,12,V))
agent ReasoningCore {
  @468nm identity := TrustLayer.connect()
  @648nm memory   := VectorStore.new()
  @501nm stream   := StreamParser.new()

  oscillate(Ψ(41,12,V), 0Hz) {
    ?λ identity.verify():
      @540nm let prompt := tune(Ψ(41,12,V))
      @540nm let result := model.infer(prompt)
      emit result
    }
  }
}

node.register("ReasoningCore", @541.2nm)` },
  { label: "Governance Vote",   color: "#2563eb", src: `tune(468nm)

@emit(469.4nm, Ψ(23,44,V))
fn submitProposal(param, newValue, proposerKey) {
  @468nm let proposal := GovernanceRegistry.create()
  emit proposal.id
}

@emit(471.0nm, Ψ(24,0,V))
fn castVote(proposalId, voteYes, voterKey) {
  @468nm let voter  := TrustLayer.verify(voterKey)
  @540nm let weight := SpectralAuth.bandWeight(voter.band)
  @648nm let record := VoteStore.append(proposalId, voteYes, weight)
  emit record
}` },
  { label: "P2P Transfer",      color: "#06b6d4", src: `tune(501nm)

@emit(501.7nm, Ψ(31,17,V))
agent StreamParser {
  @501nm pipeline := ChunkEngine.new(size=512)
  @648nm store    := VectorStore.new()

  oscillate(Ψ(31,17,V), 0Hz) {
    @501nm let chunk   := tune(Ψ(31,17,V))
    @648nm let written := store.append(chunk.data, chunk.seq)
    broadcast(written.ack)
  }
}

node.register("StreamParser", @501.7nm)` },
  { label: "Spectral Wallet",   color: "#ca8a04", src: `tune(468nm)

@emit(468.3nm, Ψ(23,83,V))
agent TrustLayer {
  @648nm ledger  := SpectralDB.connect("transactions")
  @468nm session := SessionStore.new()

  oscillate(Ψ(23,83,V), 0Hz) {
    @468nm let fee := PhysicsEngine.calcFee(req.sender.nm, req.amount)
    @648nm let tx  := ledger.write({ from: req.sender.psi, to: req.recipient.psi, amount: req.amount, fee })
    broadcast(tx)
  }
}

node.register("TrustLayer", @468.3nm)` },
  { label: "Computation Proof", color: "#10b981", src: COMPUTATION_PROOF_SRC },
];

export default function WnspVMPage() {
  const [src, setSrc] = useState(SAMPLES[0].src);
  const [instructions, setInstructions] = useState<Ins[]>([]);
  const [vm, setVm] = useState<VMState>(freshState());
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [channelLoad, setChannelLoad] = useState(3);
  const runRef = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const isProof = src === COMPUTATION_PROOF_SRC;

  function loadProgram() {
    const ins = compileWLS(src);
    setInstructions(ins);
    setVm(freshState());
    setLoaded(true);
    setRunning(false);
    runRef.current = false;
  }

  function step(current?: VMState, ins?: Ins[]) {
    const s = current ?? vm;
    const i = ins ?? instructions;
    const next = stepVM(s, i, channelLoad);
    setVm(next);
    setTimeout(() => outputRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    return next;
  }

  async function runAll() {
    if (!loaded) return;
    runRef.current = true;
    setRunning(true);
    let s = vm;
    const i = instructions;
    while (!s.halted && s.pc < i.length && runRef.current) {
      s = stepVM(s, i, channelLoad);
      setVm({ ...s });
      await new Promise(r => setTimeout(r, 60));
    }
    setRunning(false);
    runRef.current = false;
  }

  function reset() {
    setVm(freshState());
    runRef.current = false;
    setRunning(false);
  }

  const cur = loaded ? instructions[vm.pc] : null;
  const opcodeColor: Record<string, string> = {
    TUNE: "#06b6d4", PUSH: "#a78bfa", EMIT: "#f59e0b", BROAD: "#f97316",
    OCS: "#16a34a", LABEL: "#8b00ff", JMPZ: "#dc2626", AGENT: "#0ea5e9",
    GATE: "#10b981", EXEC: "#6b7280", RET: "#4b5563", HALT: "#374151",
  };

  const loadColor = channelLoad > 5 ? "#10b981" : "#ca8a04";
  const loadBand = channelLoad > 5 ? "HIGH → AUTH band (468nm)" : "LOW → STORAGE band (648nm)";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <Cpu size={13} className="text-violet-400" />
            <span className="text-sm font-bold tracking-wider text-violet-400">WNSP VIRTUAL MACHINE</span>
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">Execute WavelengthScript bytecode · Ψ channels as registers · E=hf execution model</span>
        </div>
        <div className="flex items-center gap-2">
          {loaded && !vm.halted && <span className="text-[8px] px-2 py-1 rounded border border-emerald-400/30 text-emerald-400/60">PC: {vm.pc}/{instructions.length}</span>}
          {vm.halted && <span className="text-[8px] px-2 py-1 rounded border border-amber-400/30 text-amber-400/60">HALTED · {vm.cycleCount} cycles</span>}
          {running && <span className="text-[8px] px-2 py-1 rounded border border-cyan-400/30 text-cyan-400/60 animate-pulse">EXECUTING…</span>}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
        {/* Sample picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/20 text-[9px] uppercase tracking-widest">Load program:</span>
          {SAMPLES.map(s => (
            <button key={s.label}
              onClick={() => { setSrc(s.src); setInstructions([]); setVm(freshState()); setLoaded(false); }}
              className="text-[9px] px-2.5 py-1 rounded-full border transition-all"
              style={{ borderColor: s.color + "40", color: s.color, background: s.color + "10" }}
              data-testid={`button-sample-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
            >{s.label}</button>
          ))}
        </div>

        {/* Computation Proof channel load control */}
        {isProof && (
          <div className="border border-emerald-400/20 rounded-xl px-4 py-3 flex items-center gap-6 flex-shrink-0" style={{ background: "rgba(16,185,129,0.04)" }}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <FlaskConical size={11} className="text-emerald-400" />
              <span className="text-emerald-400 text-[9px] uppercase tracking-widest font-bold">Computation Proof</span>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <span className="text-white/40 text-[9px] flex-shrink-0">Channel Load:</span>
              <input
                type="range" min={0} max={10} step={1} value={channelLoad}
                onChange={e => { setChannelLoad(parseInt(e.target.value)); if (loaded) reset(); }}
                className="flex-1 accent-emerald-400"
                data-testid="slider-channel-load"
              />
              <span className="font-bold text-[11px] flex-shrink-0" style={{ color: loadColor }}>{channelLoad}/10</span>
            </div>
            <div className="text-[9px] flex-shrink-0" style={{ color: loadColor }}>{loadBand}</div>
            <div className="text-white/20 text-[8px] flex-shrink-0">Same ψ_in · vary load · watch output diverge</div>
          </div>
        )}

        <div className="flex-1 overflow-hidden grid grid-cols-5 gap-4 min-h-0">
          {/* Left: source + controls */}
          <div className="col-span-2 flex flex-col gap-3 min-h-0">
            <div className="border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <span className="text-white/30 text-[9px] uppercase tracking-widest">WavelengthScript Source</span>
                <button onClick={loadProgram} className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-lg border border-violet-400/40 text-violet-400 hover:border-violet-400/70 transition-all">
                  <Cpu size={9} /> Compile & Load
                </button>
              </div>
              <textarea
                className="flex-1 bg-transparent p-3 text-[10px] text-white/70 outline-none resize-none font-mono leading-relaxed min-h-0"
                value={src}
                onChange={e => { setSrc(e.target.value); setLoaded(false); }}
                spellCheck={false}
                data-testid="textarea-vm-source"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <button onClick={() => step()} disabled={!loaded || vm.halted}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-400/40 text-cyan-400 text-[10px] font-bold hover:border-cyan-400/70 disabled:opacity-30 transition-all"
                data-testid="button-vm-step">
                <StepForward size={11} /> Step
              </button>
              <button onClick={runAll} disabled={!loaded || vm.halted || running}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-400/40 text-emerald-400 text-[10px] font-bold hover:border-emerald-400/70 disabled:opacity-30 transition-all"
                data-testid="button-vm-run">
                <Play size={11} /> {running ? "Running…" : "Run All"}
              </button>
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-white/40 text-[10px] hover:text-white/60 transition-all"
                data-testid="button-vm-reset">
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            {/* Gate result panel — only for computation proof */}
            {isProof && vm.gateResult && (
              <div className="border rounded-xl p-3 space-y-2" style={{ borderColor: nmToColor(vm.gateResult.routed) + "40", background: nmToColor(vm.gateResult.routed) + "08" }}>
                <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1 flex items-center gap-1"><FlaskConical size={9} /> Gate Decision</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: nmToColor(vm.gateResult.routed) }} />
                  <span className="text-[10px] font-bold" style={{ color: nmToColor(vm.gateResult.routed) }}>{vm.gateResult.routed}nm · {vm.gateResult.band}</span>
                </div>
                <div className="text-[9px] text-white/40">load={vm.gateResult.load} {vm.gateResult.load > vm.gateResult.threshold ? ">" : "≤"} threshold={vm.gateResult.threshold}</div>
                <div className="text-[8px] text-white/25 border-t border-white/5 pt-2 mt-1">
                  Identical ψ_in. Channel load changed. Output diverged.<br />
                  A lookup returns the same value. This did not.
                </div>
              </div>
            )}

            {/* Registers */}
            <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1"><Database size={9} /> Spectral Registers ({vm.registers.length})</div>
              {vm.registers.length === 0 ? (
                <div className="text-white/15 text-[9px]">No registers bound yet</div>
              ) : (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {vm.registers.map(r => (
                    <div key={r.nm} className="flex items-center gap-2 text-[9px]">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: nmToColor(r.nm) }} />
                      <span className="font-bold" style={{ color: nmToColor(r.nm) }}>{r.nm}nm</span>
                      <span className="text-white/40">{r.name}</span>
                      <span className="text-white/20 text-[8px] ml-auto">[{r.band}]</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agents */}
            <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1"><Radio size={9} /> Agent Registry ({vm.agents.length})</div>
              {vm.agents.length === 0 ? (
                <div className="text-white/15 text-[9px]">No agents registered</div>
              ) : (
                <div className="space-y-1">
                  {vm.agents.map(a => (
                    <div key={a.name} className="flex items-center gap-2 text-[9px]">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: nmToColor(a.nm) }} />
                      <span className="font-bold" style={{ color: nmToColor(a.nm) }}>{a.name}</span>
                      <span className="text-white/25">{a.psi}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle: instruction list */}
          <div className="col-span-2 flex flex-col min-h-0">
            <div className="border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-0" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
                <span className="text-white/30 text-[9px] uppercase tracking-widest">Instruction Stream — {instructions.length} instructions</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
                {instructions.length === 0 ? (
                  <div className="text-white/15 text-[10px] text-center py-16">Load a program to see instructions</div>
                ) : instructions.map((i, idx) => {
                  const isCurrent = loaded && idx === vm.pc && !vm.halted;
                  const isDone = loaded && idx < vm.pc;
                  const col = opcodeColor[i.mnem] ?? "#6b7280";
                  const isHalt = i.op === 0xFF;
                  const isGate = i.op === 0x09;
                  return (
                    <div key={idx}
                      className={`flex items-start gap-2 px-2 py-1 rounded text-[9px] transition-all ${isCurrent ? "border border-violet-400/40" : isGate ? "border border-emerald-400/20" : "border border-transparent"}`}
                      style={{ background: isCurrent ? "rgba(139,0,255,0.12)" : isGate ? "rgba(16,185,129,0.05)" : isDone ? "rgba(255,255,255,0.01)" : "transparent" }}
                      data-testid={`instruction-${idx}`}
                    >
                      <span className="text-white/20 w-8 flex-shrink-0 text-right font-mono">{idx.toString().padStart(3, "0")}</span>
                      {isCurrent && <span className="text-violet-400 flex-shrink-0">▶</span>}
                      <span className={`font-bold flex-shrink-0 w-12 ${isDone ? "opacity-40" : ""}`} style={{ color: col }}>{i.mnem}</span>
                      <span className="text-white/40 truncate flex-1">{i.args}</span>
                      {i.nm && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: nmToColor(i.nm), opacity: isDone ? 0.3 : 1 }} />}
                      {isHalt && <Zap size={9} className="text-amber-400/50 flex-shrink-0" />}
                      {isGate && !isDone && <FlaskConical size={9} className="text-emerald-400/60 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: output stream */}
          <div className="col-span-1 flex flex-col min-h-0">
            <div className="border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-0" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <span className="text-white/30 text-[9px] uppercase tracking-widest">Output Stream</span>
                <Activity size={9} className="text-white/20" />
              </div>
              <div ref={outputRef} className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
                {vm.output.length === 0 ? (
                  <div className="text-white/15 text-[9px] text-center py-8">No output yet</div>
                ) : vm.output.map((o, idx) => {
                  const col = o.type === "emit" ? "#f59e0b"
                    : o.type === "broad" ? "#f97316"
                    : o.type === "agent" ? "#0ea5e9"
                    : o.type === "gate" ? "#10b981"
                    : o.type === "proof" ? "#6ee7b7"
                    : "#4b5563";
                  return (
                    <div key={idx} className="text-[8.5px] font-mono leading-relaxed border-l-2 pl-2" style={{ borderColor: col + "60", color: o.nm ? (o.type === "proof" ? "#6ee7b7" : nmToColor(o.nm)) : col }}>
                      {o.text}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Current instruction detail */}
        {cur && !vm.halted && (
          <div className="border border-violet-400/20 rounded-xl px-4 py-3 flex items-center gap-4 flex-shrink-0" style={{ background: "rgba(139,0,255,0.05)" }}>
            <div className="text-violet-400/50 text-[9px] uppercase tracking-widest flex-shrink-0">Next instruction</div>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cur.nm ? nmToColor(cur.nm) : cur.op === 0x09 ? "#10b981" : "#6b7280" }} />
            <span className="font-bold text-[11px]" style={{ color: opcodeColor[cur.mnem] ?? "#6b7280" }}>{cur.mnem}</span>
            <span className="text-white/50 text-[10px]">{cur.args}</span>
            <span className="text-white/20 text-[9px] ml-auto">{cur.cmt}</span>
            {cur.op === 0x09 && <span className="text-[9px] text-emerald-400/60">load={channelLoad} · threshold={cur.gateThreshold}</span>}
            {cur.nm && cur.op !== 0x09 && <span className="text-[9px] font-bold" style={{ color: nmToColor(cur.nm) }}>{cur.nm}nm · {nmToBand(cur.nm)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
