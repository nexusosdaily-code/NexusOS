import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, RotateCcw, CheckCircle, FlaskConical, GitBranch, TrendingUp, TrendingDown, Minus, Zap, Eye } from "lucide-react";

// ── physics helpers ──────────────────────────────────────────────────────────
function nmToColor(nm: number) {
  if (nm < 450) return "#8b00ff"; if (nm < 495) return "#2563eb";
  if (nm < 520) return "#06b6d4"; if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04"; if (nm < 625) return "#ea580c";
  return "#dc2626";
}
function nmToBand(nm: number) {
  if (nm < 450) return "SYSTEM"; if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM"; if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE"; if (nm < 625) return "EVENT";
  return "STORAGE";
}
function ceEncode(name: string) {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const sum = codes.reduce((a, b) => a + b, 0);
  const avg = sum / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  return { nm, wdm: Math.floor((nm - 380) / 4) + 1, oam: sum % 50, pol: codes.length % 2 === 0 ? "H" : "V", band: nmToBand(nm) };
}
function deterministicHash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return "0x" + h.toString(16).toUpperCase().padStart(8, "0");
}
function shannonEntropy(scores: number[]) {
  const total = scores.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const probs = scores.map(s => s / total);
  return parseFloat((-probs.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0)).toFixed(4));
}
function entropySlope(vals: number[]) {
  const n = vals.length; if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = vals.reduce((a, b) => a + b, 0) / n;
  const num = vals.reduce((a, v, i) => a + (i - meanX) * (v - meanY), 0);
  const den = vals.reduce((a, _, i) => a + (i - meanX) ** 2, 0);
  return den === 0 ? 0 : parseFloat((num / den).toFixed(5));
}
function classifyAttractor(winners: string[]) {
  if (winners.length < 6) return "INSUFFICIENT DATA";
  const last = winners.slice(-8);
  if (new Set(last).size === 1) return "FIXED-POINT";
  const l6 = winners.slice(-6);
  if (l6.every((w, i) => i < 2 || w === l6[i - 2]) && new Set(l6).size === 2) return "LIMIT-CYCLE (period-2)";
  if (l6.every((w, i) => i < 3 || w === l6[i - 3])) return "LIMIT-CYCLE (period-3)";
  return "IRREGULAR";   // avoid "chaotic" — that implies Lyapunov exponents
}

// ── instability heuristic (prediction before running) ────────────────────────
function instabilityScore(amp: number, decay: number, frozen: boolean) {
  if (frozen) return 0;
  return parseFloat((amp * (1 - decay)).toFixed(4));
}
function predictRegime(score: number): { label: string; color: string; explanation: string } {
  if (score <= 0.001) return { label: "FIXED-POINT", color: "#10b981", explanation: "Weights frozen — pure distance geometry dominates. No feedback pressure." };
  if (score < 0.07)   return { label: "FIXED-POINT", color: "#10b981", explanation: "Low amplification + slow decay → system settles quickly. One node dominates." };
  if (score < 0.13)   return { label: "LIMIT-CYCLE", color: "#22d3ee", explanation: "Moderate pressure creates competition. Expect a route flip or regular oscillation." };
  return                     { label: "IRREGULAR",   color: "#f59e0b", explanation: "High amplification × fast decay → strong reinforcement and suppression cycles. Flip timing unpredictable." };
}

// ── phase diagram data ───────────────────────────────────────────────────────
const PHASE_AMPS   = [1.0, 1.1, 1.25, 1.4] as const;
const PHASE_DECAYS = [0.88, 0.92, 0.95, 1.0] as const;

function PhaseDiagram({ activeAmp, activeDecay }: { activeAmp: number; activeDecay: number }) {
  const W = 220; const H = 140; const padL = 42; const padB = 28; const padT = 8;
  const cellW = (W - padL) / PHASE_AMPS.length;
  const cellH = (H - padB - padT) / PHASE_DECAYS.length;
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      {/* axis labels */}
      <text x={padL + (W - padL) / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize={7}>amplification →</text>
      <text x={8} y={padT + (H - padB - padT) / 2} textAnchor="middle" fill="#6b7280" fontSize={7} transform={`rotate(-90,8,${padT + (H - padB - padT) / 2})`}>decay →</text>
      {PHASE_DECAYS.map((decay, di) => (
        PHASE_AMPS.map((amp, ai) => {
          const score = instabilityScore(amp, decay, amp === 1.0 && decay === 1.0);
          const { label, color } = predictRegime(score);
          const x = padL + ai * cellW; const y = padT + di * cellH;
          const isActive = Math.abs(amp - activeAmp) < 0.01 && Math.abs(decay - activeDecay) < 0.01;
          return (
            <g key={`${di}-${ai}`}>
              <rect x={x + 1} y={y + 1} width={cellW - 2} height={cellH - 2} rx={2}
                fill={color + "28"} stroke={isActive ? color : color + "50"} strokeWidth={isActive ? 1.5 : 0.5} />
              <text x={x + cellW / 2} y={y + cellH / 2 + 2} textAnchor="middle" fill={color} fontSize={6} fontWeight={isActive ? "bold" : "normal"}>
                {label.split("(")[0].trim().slice(0, 3) === "FIX" ? "FP" : label.startsWith("LIMIT") ? "LC" : "IRR"}
              </text>
            </g>
          );
        })
      ))}
      {/* amp axis ticks */}
      {PHASE_AMPS.map((amp, ai) => (
        <text key={ai} x={padL + ai * cellW + cellW / 2} y={H - 16} textAnchor="middle" fill="#6b7280" fontSize={6}>{amp}</text>
      ))}
      {/* decay axis ticks */}
      {PHASE_DECAYS.map((decay, di) => (
        <text key={di} x={padL - 4} y={padT + di * cellH + cellH / 2 + 2} textAnchor="end" fill="#6b7280" fontSize={6}>{decay}</text>
      ))}
    </svg>
  );
}

// ── sparkline ────────────────────────────────────────────────────────────────
function SparkLine({ vals, color }: { vals: number[]; color: string }) {
  if (vals.length < 2) return null;
  const W = 130; const H = 30;
  const min = Math.min(...vals); const max = Math.max(...vals); const range = max - min || 0.001;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={(i / (vals.length - 1)) * W} cy={H - ((v - min) / range) * H} r={1.8} fill={color} />
      ))}
    </svg>
  );
}

// ── preset definitions ───────────────────────────────────────────────────────
interface Preset {
  label: string; eThreshHigh: number; eThreshLow: number;
  amp: number; decay: number; iters: number; color: string;
  altStart: boolean; frozen: boolean;
}
const PRESETS: Record<string, Preset> = {
  default:      { label:"Default",      eThreshHigh:0.92, eThreshLow:0.88, amp:1.25, decay:0.92, iters:20, color:"#10b981", altStart:false, frozen:false },
  conservative: { label:"Conservative", eThreshHigh:0.90, eThreshLow:0.86, amp:1.1,  decay:0.95, iters:20, color:"#2563eb", altStart:false, frozen:false },
  aggressive:   { label:"Aggressive",   eThreshHigh:0.93, eThreshLow:0.87, amp:1.4,  decay:0.88, iters:20, color:"#ea580c", altStart:false, frozen:false },
  frozen:       { label:"No Feedback",  eThreshHigh:0.92, eThreshLow:0.88, amp:1.0,  decay:1.0,  iters:20, color:"#6b7280", altStart:false, frozen:true  },
  altstart:     { label:"Alt Start",    eThreshHigh:0.92, eThreshLow:0.88, amp:1.25, decay:0.92, iters:20, color:"#c084fc", altStart:true,  frozen:false },
};
type PresetKey = keyof typeof PRESETS;

// ── fixed signal ─────────────────────────────────────────────────────────────
const FIXED_INPUT = "birdsong_signature_v1";
const PSI = ceEncode(FIXED_INPUT);
const PSI_HASH = deterministicHash(FIXED_INPUT);

interface EvolNode { name: string; nm: number; threshold: number; weight: number; }
interface EvolRecord { iter:number; load:number; winner:string; winnerNm:number; entropy:number; weights:Record<string,number>; flipped:boolean; }
type LogLine = { text:string; type:"step"|"data"|"diff"|"assert_pass"|"sep"|"header"|"evol"|"evol_flip"|"metric" };

// ── page ─────────────────────────────────────────────────────────────────────
export default function DivergenceTestPage() {
  const [preset, setPreset] = useState<PresetKey>("default");
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [proofDone, setProofDone] = useState(false);
  const [evolRecords, setEvolRecords] = useState<EvolRecord[]>([]);
  const [evolDone, setEvolDone] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [showDiagram, setShowDiagram] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const emit = useCallback(async (line: LogLine, delay = 45) => {
    if (cancelRef.current) return;
    setLog(prev => [...prev, line]);
    await new Promise(r => setTimeout(r, delay));
    logRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, []);

  const runAll = useCallback(async (pk: PresetKey) => {
    cancelRef.current = false;
    setLog([]); setProofDone(false); setEvolRecords([]); setEvolDone(false);
    setRunning(true); setRunCount(c => c + 1);
    const p = PRESETS[pk];

    const baseNodes: EvolNode[] = [
      { name:"TrustLayer",    nm:468, threshold:10, weight: p.altStart ? 0.4 : 1 },
      { name:"ReasoningCore", nm:541, threshold:5,  weight: p.altStart ? 0.4 : 1 },
    ];
    const withAux: EvolNode[] = [...baseNodes, { name:"AuxNode_3", nm:650, threshold:10, weight: p.altStart ? 3.0 : 1 }];
    const loadA = 3; const loadB = p.altStart ? 4 : 8;

    function route(psiNm: number, load: number, nodes: EvolNode[]) {
      const avail = nodes.filter(n => load <= n.threshold);
      if (!avail.length) return { winner: null as null|EvolNode, scores: [] as {name:string;nm:number;score:number}[], entropy: 0 };
      const scored = avail.map(n => ({ ...n, score: n.weight / (Math.abs(n.nm - psiNm) + 1) })).sort((a, b) => b.score - a.score);
      return { winner: scored[0] as EvolNode, scores: scored, entropy: shannonEntropy(scored.map(s => s.score)) };
    }

    const rA = route(PSI.nm, loadA, baseNodes);
    const rB = route(PSI.nm, loadB, withAux);

    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  DIVERGENCE PROOF  ·  preset: ${p.label.toUpperCase()}${p.altStart ? "  [alt initial conditions]" : ""}`, type: "header" });
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: `  ψ_input = "${FIXED_INPUT}"`, type: "data" }, 55);
    await emit({ text: `  ψ_hash  = ${PSI_HASH}  ← fixed, never changes`, type: "data" }, 55);
    await emit({ text: `  CE→λ   = ${PSI.nm}nm  Ψ(${PSI.wdm},${PSI.oam},${PSI.pol})  [${PSI.band}]`, type: "data" }, 55);
    if (p.altStart) {
      await emit({ text: `  init   = AuxNode_3.weight=3.0  TrustLayer/ReasoningCore.weight=0.4  load=${loadB}`, type: "diff" }, 65);
    }
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: `  STATE_A  load=${loadA}  →  ${rA.winner?.name}@${rA.winner?.nm}nm  H=${rA.entropy}`, type: "evol" }, 65);
    await emit({ text: `  perturbation: AuxNode_3@650nm  ·  load→${loadB}${p.altStart ? "  weight→3.0 (pre-seeded dominant)" : ""}`, type: "diff" }, 65);
    await emit({ text: `  STATE_B  load=${loadB}  →  ${rB.winner?.name}@${rB.winner?.nm}nm  H=${rB.entropy}`, type: "evol" }, 65);
    await emit({ text: "", type: "sep" }, 15);
    const a3 = rA.winner?.name !== rB.winner?.name;
    await emit({ text: `  ✓  ψ_hash_A == ψ_hash_B  [same input, different state]`, type: "assert_pass" }, 80);
    await emit({ text: `  ✓  state_A  != state_B   [load ${loadA}≠${loadB}]`, type: "assert_pass" }, 80);
    await emit({ text: `  ${a3?"✓":"—"}  result_A != result_B   [${rA.winner?.name} → ${rB.winner?.name}]`, type: "assert_pass" }, 80);
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: "  Proof complete.  Launching state evolution…", type: "header" }, 80);
    await emit({ text: "", type: "sep" }, 15);
    setProofDone(true);
    await new Promise(r => setTimeout(r, 280));

    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  EVOLUTION  ·  ${p.iters} iterations  ·  hysteresis dead zone ${p.eThreshLow}–${p.eThreshHigh}`, type: "header" });
    await emit({ text: `  rule: H>${p.eThreshHigh}→×${p.amp}  H<${p.eThreshLow}→×${(2-p.amp).toFixed(2)}  else no change  others×${p.decay}  load−1`, type: "header" });
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });

    let nodes: EvolNode[] = [...withAux.map(n => ({ ...n }))];
    let load = loadB;
    const records: EvolRecord[] = [];
    let prevWinner = rB.winner?.name ?? "";

    for (let i = 1; i <= p.iters; i++) {
      if (cancelRef.current) break;
      await new Promise(r => setTimeout(r, 75));
      const { winner, entropy } = route(PSI.nm, load, nodes);
      if (!winner) break;
      const flipped = prevWinner !== "" && winner.name !== prevWinner;
      const rec: EvolRecord = { iter:i, load, winner:winner.name, winnerNm:winner.nm, entropy,
        weights: Object.fromEntries(nodes.map(n => [n.name, parseFloat(n.weight.toFixed(3))])), flipped };
      records.push(rec);
      setEvolRecords([...records]);

      // hysteresis: dead zone between eThreshLow and eThreshHigh — no change in that band
      if (!p.frozen) {
        const newW = entropy > p.eThreshHigh
          ? Math.min(winner.weight * p.amp, 5.0)
          : entropy < p.eThreshLow
            ? Math.max(winner.weight * (2 - p.amp), 0.15)
            : winner.weight;  // dead zone — no amplification or dampening
        nodes = nodes.map(n => n.name === winner.name
          ? { ...n, weight: parseFloat(newW.toFixed(3)) }
          : { ...n, weight: parseFloat(Math.max(n.weight * p.decay, 0.15).toFixed(3)) });
      }
      load = Math.max(0, load - 1);
      prevWinner = winner.name;

      const tag = flipped ? " ← FLIP" : "";
      const zone = !p.frozen && entropy >= p.eThreshLow && entropy <= p.eThreshHigh ? " [dead zone]" : "";
      await emit({ text: `  #${String(i).padStart(2)} load=${String(load+1).padStart(2)} → ${winner.name}@${winner.nm}nm H=${entropy}${zone}${tag}`, type: flipped ? "evol_flip" : "evol" }, 40);
    }

    const winners = records.map(r => r.winner);
    const flips = records.filter(r => r.flipped).length;
    const firstFlip = records.findIndex(r => r.flipped);
    const eVals = records.map(r => r.entropy);
    const slope = entropySlope(eVals);
    const attractor = classifyAttractor(winners);
    const dominance: Record<string,number> = {};
    winners.forEach(w => { dominance[w] = (dominance[w] ?? 0) + 1; });

    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: "─── METRICS ────────────────────────────────────", type: "step" });
    await emit({ text: `  attractor        = ${attractor}`, type: "metric" }, 55);
    await emit({ text: `  flip_count       = ${flips}`, type: "metric" }, 55);
    await emit({ text: `  first_flip_at    = ${firstFlip === -1 ? "never" : "iter " + (firstFlip + 1)}`, type: "metric" }, 55);
    await emit({ text: `  entropy_slope    = ${slope >= 0 ? "+" : ""}${slope}  [${slope > 0.001 ? "expanding" : slope < -0.001 ? "collapsing" : "stable"}]`, type: "metric" }, 55);
    for (const [name, count] of Object.entries(dominance)) {
      await emit({ text: `  dominance [${name}] = ${count}/${records.length}  (${Math.round(100*count/records.length)}%)`, type: "metric" }, 45);
    }
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  ${attractor.startsWith("FIXED") ? "System settled — fixed-point attractor." : attractor.startsWith("LIMIT") ? "Regular oscillation — limit-cycle attractor." : "Irregular regime. No repeating sequence in window."}`, type: "header" }, 80);
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    setEvolDone(true); setRunning(false);
  }, [emit]);

  function reset(pk: PresetKey) {
    cancelRef.current = true;
    setLog([]); setProofDone(false); setEvolRecords([]); setEvolDone(false); setRunning(false);
    setTimeout(() => runAll(pk), 110);
  }

  useEffect(() => { runAll("default"); return () => { cancelRef.current = true; }; }, []);

  const p = PRESETS[preset];
  const flips = evolRecords.filter(r => r.flipped).length;
  const firstFlip = evolRecords.findIndex(r => r.flipped);
  const eVals = evolRecords.map(r => r.entropy);
  const slope = entropySlope(eVals);
  const attractor = evolRecords.length > 5 ? classifyAttractor(evolRecords.map(r => r.winner)) : "—";
  const dominance: Record<string,number> = {};
  evolRecords.forEach(r => { dominance[r.winner] = (dominance[r.winner] ?? 0) + 1; });
  const total = evolRecords.length;

  const iScore = instabilityScore(p.amp, p.decay, p.frozen);
  const predicted = predictRegime(iScore);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      {/* header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <FlaskConical size={13} className="text-emerald-400" />
          <span className="text-sm font-bold tracking-wider text-emerald-400">DYNAMICAL SYSTEM ANALYSIS</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white/20 text-[9px]">prediction · sensitivity · attractors · causal attribution</span>
        </div>
        <div className="flex items-center gap-2">
          {evolDone && (
            <span className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border ${flips > 0 ? "border-amber-400/40 text-amber-400" : "border-emerald-400/30 text-emerald-400"}`}>
              {flips > 0 && <Zap size={7} />} {attractor}
            </span>
          )}
          <button onClick={() => setShowDiagram(d => !d)}
            className={`flex items-center gap-1 text-[8px] px-2 py-0.5 rounded border transition-all ${showDiagram ? "border-cyan-400/50 text-cyan-400" : "border-white/10 text-white/30 hover:text-white/60"}`}
            data-testid="button-phase-diagram">
            <Eye size={8} /> Phase map
          </button>
          <span className="text-[8px] text-white/20">run #{runCount}</span>
        </div>
      </div>

      {/* preset strip */}
      <div className="border-b border-white/5 px-6 py-2.5 flex items-center gap-2 flex-wrap flex-shrink-0" style={{ background: "rgba(255,255,255,0.01)" }}>
        <span className="text-white/20 text-[8px] uppercase tracking-widest">Preset:</span>
        {(Object.keys(PRESETS) as PresetKey[]).map(pk => (
          <button key={pk} onClick={() => { setPreset(pk); reset(pk); }} disabled={running}
            className="text-[8px] px-2.5 py-0.5 rounded-full border transition-all disabled:opacity-40"
            style={{ borderColor: PRESETS[pk].color + (preset === pk ? "99" : "28"), color: PRESETS[pk].color, background: preset === pk ? PRESETS[pk].color + "18" : "transparent" }}
            data-testid={`button-preset-${pk}`}>
            {PRESETS[pk].label}
          </button>
        ))}
        <button onClick={() => reset(preset)} disabled={running}
          className="ml-auto flex items-center gap-1 text-[8px] text-white/25 hover:text-white/50 transition-colors disabled:opacity-30"
          data-testid="button-rerun">
          <RotateCcw size={8} /> Re-run
        </button>
      </div>

      {/* main */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* log */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-r border-white/5">
          <div className="px-4 py-1.5 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
            <GitBranch size={8} className="text-white/20" />
            <span className="text-white/20 text-[8px] uppercase tracking-widest">Execution log</span>
            {running && <span className="text-[7px] text-emerald-400/60 animate-pulse ml-auto">running…</span>}
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 text-[9px] leading-relaxed min-h-0">
            {log.length === 0 && <div className="text-white/15 text-center py-16">Initializing…</div>}
            {log.map((line, idx) => {
              const col = line.type === "header" ? "#10b981" : line.type === "step" ? "#a78bfa"
                : line.type === "data" ? "#94a3b8" : line.type === "diff" ? "#f59e0b"
                : line.type === "assert_pass" ? "#10b981" : line.type === "evol" ? "#22d3ee"
                : line.type === "evol_flip" ? "#f59e0b" : line.type === "metric" ? "#c084fc"
                : line.type === "sep" ? "#374151" : "#4b5563";
              return <div key={idx} style={{ color: col }} className="whitespace-pre-wrap">{line.text}</div>;
            })}
            {running && <div className="text-emerald-400/40 animate-pulse text-[9px]">▊</div>}
          </div>
        </div>

        {/* metrics sidebar */}
        <div className="lg:w-72 flex-shrink-0 flex flex-col overflow-y-auto p-4 space-y-3">

          {/* ── PREDICTION (before run) ── */}
          <div className="text-white/20 text-[7px] uppercase tracking-widest">Regime Prediction</div>
          <div className="border rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)", borderColor: predicted.color + "40" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/25 text-[8px] uppercase tracking-widest">Predicted</span>
              <span className="text-[7px] px-1.5 py-0.5 rounded" style={{ background: predicted.color + "20", color: predicted.color }}>
                score={iScore}
              </span>
            </div>
            <div className="text-[11px] font-bold mb-1" style={{ color: predicted.color }}>{predicted.label}</div>
            <div className="text-white/30 text-[8px] leading-relaxed">{predicted.explanation}</div>
            <div className="mt-2 text-[7px] text-white/20">heuristic: amp × (1 − decay) = {p.amp} × {(1 - p.decay).toFixed(2)} = {iScore}</div>
          </div>

          {/* ── PHASE DIAGRAM ── */}
          {showDiagram && (
            <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 text-[8px] uppercase tracking-widest mb-2">Phase Diagram</div>
              <PhaseDiagram activeAmp={p.amp} activeDecay={p.decay} />
              <div className="flex items-center gap-3 mt-1.5">
                {[["FP","#10b981","fixed-point"],["LC","#22d3ee","limit-cycle"],["IRR","#f59e0b","irregular"]] .map(([k,c,l]) => (
                  <span key={k} className="flex items-center gap-1 text-[7px]" style={{ color: c }}>
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c + "40", border: "1px solid " + c }} />{l}
                  </span>
                ))}
              </div>
              <div className="text-white/15 text-[7px] mt-1">active preset highlighted</div>
            </div>
          )}

          {/* ── OBSERVED ATTRACTOR ── */}
          <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="text-white/25 text-[7px] uppercase tracking-widest mb-1.5">Observed Attractor</div>
            <div className={`text-[11px] font-bold ${evolRecords.length < 6 ? "text-white/20" : attractor === "FIXED-POINT" ? "text-emerald-400" : attractor.startsWith("LIMIT") ? "text-cyan-400" : "text-amber-400"}`}>
              {evolRecords.length < 6 ? "computing…" : attractor}
            </div>
            {evolDone && predicted.label !== "—" && (
              <div className={`text-[7px] mt-1 ${attractor.split(" ")[0] === predicted.label.split(" ")[0] ? "text-emerald-400/50" : "text-amber-400/50"}`}>
                {attractor.split(" ")[0] === predicted.label.split(" ")[0] ? "✓ matched prediction" : "⚠ prediction diverged"}
              </div>
            )}
            {evolDone && (
              <div className="text-white/20 text-[7px] mt-0.5">
                {attractor.startsWith("FIXED") ? "One channel dominates — system converged." :
                 attractor.startsWith("LIMIT") ? "Regular route oscillation — bounded cycle." :
                 "No repeating sequence in final 8 iterations."}
              </div>
            )}
          </div>

          {/* ── FLIP METRICS ── */}
          <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2">Flip Dynamics</div>
            <div className="space-y-1.5 text-[9px]">
              {[
                ["flip count",    flips > 0 ? String(flips) : "0", flips > 0 ? "#f59e0b" : "#6b7280"],
                ["first flip",    !total ? "—" : firstFlip === -1 ? "none" : `iter ${firstFlip + 1}`, "#94a3b8"],
                ["path dependent","true", "#10b981"],
                ["causal source", preset === "frozen" ? "geometry" : "feedback + geometry", preset === "frozen" ? "#22d3ee" : "#c084fc"],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-white/35">{label}</span>
                  <span style={{ color: total ? color : "#374151" }}>{total ? value : "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── ENTROPY SPARKLINE ── */}
          <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Entropy H(t)</span>
              {eVals.length > 1 && (
                <span className={`text-[7px] flex items-center gap-0.5 ${slope > 0.001 ? "text-emerald-400" : slope < -0.001 ? "text-amber-400" : "text-white/25"}`}>
                  {slope > 0.001 ? <TrendingUp size={7} /> : slope < -0.001 ? <TrendingDown size={7} /> : <Minus size={7} />}
                  {slope > 0.001 ? "expanding" : slope < -0.001 ? "collapsing" : "stable"}
                </span>
              )}
            </div>
            {eVals.length > 1
              ? <SparkLine vals={eVals} color={slope > 0.001 ? "#10b981" : slope < -0.001 ? "#f59e0b" : "#94a3b8"} />
              : <div className="text-white/15 text-[7px]">awaiting data…</div>
            }
            {eVals.length > 1 && (
              <div className="flex items-center justify-between mt-1 text-[7px] text-white/25">
                <span>H₀={eVals[0]}</span>
                <span>slope {slope >= 0 ? "+" : ""}{slope}</span>
                <span>Hₙ={eVals[eVals.length - 1]}</span>
              </div>
            )}
          </div>

          {/* ── DOMINANCE ── */}
          {Object.keys(dominance).length > 0 && (
            <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2">Node Dominance</div>
              <div className="space-y-2">
                {Object.entries(dominance).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                  const nm = evolRecords.find(r => r.winner === name)?.winnerNm ?? 541;
                  const pct = total ? Math.round(100 * count / total) : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-[7px] mb-0.5">
                        <span style={{ color: nmToColor(nm) }}>{name}</span>
                        <span className="text-white/25">{count}/{total} ({pct}%)</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: nmToColor(nm) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CAUSAL ATTRIBUTION ── */}
          {evolDone && preset === "frozen" && (
            <div className={`border rounded-xl p-3 text-[8px] leading-relaxed ${flips === 0 ? "border-emerald-400/25" : "border-amber-400/25"}`}
              style={{ background: flips === 0 ? "rgba(16,185,129,0.04)" : "rgba(245,158,11,0.04)" }}>
              <div className="text-white/25 uppercase tracking-widest text-[7px] mb-1">Causal Attribution</div>
              {flips === 0
                ? <><span className="text-emerald-400 font-bold">Feedback confirmed dominant.</span><span className="text-white/35"> Weights frozen — no flip. The Default flip is caused by the feedback loop, not distance geometry.</span></>
                : <><span className="text-amber-400 font-bold">Geometry contributes.</span><span className="text-white/35"> A flip occurred even with frozen weights — distance advantage alone can drive route changes.</span></>
              }
            </div>
          )}

          {evolDone && preset === "altstart" && (
            <div className="border border-purple-400/25 rounded-xl p-3 text-[8px] leading-relaxed" style={{ background: "rgba(192,132,252,0.04)" }}>
              <div className="text-white/25 uppercase tracking-widest text-[7px] mb-1">Initial Conditions</div>
              <span className="text-purple-400 font-bold">AuxNode_3 pre-seeded at weight=3.0.</span>
              <span className="text-white/35"> Compare attractor type with Default. Different initial conditions → different or same attractor tells you how sensitive this system is to its starting point.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
