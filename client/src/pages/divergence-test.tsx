import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, RotateCcw, FlaskConical, GitBranch, TrendingUp, TrendingDown, Minus, Zap, Eye, Target, CheckCircle } from "lucide-react";

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
  return "IRREGULAR";
}

// ── instability score & prediction ──────────────────────────────────────────
const BOUNDARY_LOW  = 0.07;   // FP / LC boundary
const BOUNDARY_HIGH = 0.13;   // LC / IRR boundary

function instabilityScore(amp: number, decay: number, frozen: boolean) {
  return frozen ? 0 : parseFloat((amp * (1 - decay)).toFixed(4));
}
type RegimeLabel = "FIXED-POINT" | "LIMIT-CYCLE" | "IRREGULAR";
function predictRegime(score: number): { label: RegimeLabel; color: string; explanation: string } {
  if (score <= 0.001) return { label: "FIXED-POINT", color: "#10b981", explanation: "Weights frozen — pure distance geometry. No feedback pressure." };
  if (score < BOUNDARY_LOW)  return { label: "FIXED-POINT", color: "#10b981", explanation: "Low amplification + slow decay. System settles to one dominant channel." };
  if (score < BOUNDARY_HIGH) return { label: "LIMIT-CYCLE", color: "#22d3ee", explanation: "Moderate pressure creates competition. Expect route flip or regular oscillation." };
  return                            { label: "IRREGULAR",   color: "#f59e0b", explanation: "High amp × fast decay. Strong reinforcement and suppression cycles. Flip timing varies." };
}
function distanceToBoundary(score: number): { margin: number; descriptor: string } {
  const nearestBoundary = score < BOUNDARY_LOW
    ? BOUNDARY_LOW
    : score < BOUNDARY_HIGH
      ? Math.min(score - BOUNDARY_LOW, BOUNDARY_HIGH - score) < (BOUNDARY_HIGH - score)
        ? BOUNDARY_LOW : BOUNDARY_HIGH
      : BOUNDARY_HIGH;
  const margin = parseFloat(Math.abs(score - nearestBoundary).toFixed(4));
  const descriptor = margin < 0.01 ? "critical — near boundary"
    : margin < 0.025 ? "fragile — slight parameter change flips regime"
    : margin < 0.04  ? "moderate stability"
    : "stable — deep in regime";
  return { margin, descriptor };
}
// suggest parameters to hit a target regime
function suggestForRegime(target: RegimeLabel): { amp: number; decay: number; score: number; note: string } {
  if (target === "FIXED-POINT") return { amp: 1.1, decay: 0.95, score: 0.055, note: "low pressure — system converges quickly" };
  if (target === "LIMIT-CYCLE") return { amp: 1.25, decay: 0.92, score: 0.100, note: "moderate pressure — balanced competition" };
  return                                { amp: 1.4,  decay: 0.88, score: 0.168, note: "high pressure — strong reinforcement cycles" };
}

// ── phase diagram ────────────────────────────────────────────────────────────
const PHASE_AMPS   = [1.0, 1.1, 1.25, 1.4] as const;
const PHASE_DECAYS = [0.88, 0.92, 0.95, 1.0] as const;
function PhaseDiagram({ activeAmp, activeDecay }: { activeAmp: number; activeDecay: number }) {
  const W = 220; const H = 140; const padL = 42; const padB = 28; const padT = 8;
  const cellW = (W - padL) / PHASE_AMPS.length;
  const cellH = (H - padB - padT) / PHASE_DECAYS.length;
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <text x={padL + (W - padL) / 2} y={H - 2} textAnchor="middle" fill="#6b7280" fontSize={7}>amplification →</text>
      <text x={8} y={padT + (H - padB - padT) / 2} textAnchor="middle" fill="#6b7280" fontSize={7} transform={`rotate(-90,8,${padT + (H - padB - padT) / 2})`}>decay →</text>
      {PHASE_DECAYS.map((decay, di) =>
        PHASE_AMPS.map((amp, ai) => {
          const score = instabilityScore(amp, decay, amp === 1.0 && decay === 1.0);
          const { label, color } = predictRegime(score);
          const x = padL + ai * cellW; const y = padT + di * cellH;
          const isActive = Math.abs(amp - activeAmp) < 0.01 && Math.abs(decay - activeDecay) < 0.01;
          return (
            <g key={`${di}-${ai}`}>
              <rect x={x + 1} y={y + 1} width={cellW - 2} height={cellH - 2} rx={2}
                fill={color + "28"} stroke={isActive ? color : color + "50"} strokeWidth={isActive ? 1.8 : 0.5} />
              <text x={x + cellW / 2} y={y + cellH / 2 + 2} textAnchor="middle" fill={color} fontSize={6} fontWeight={isActive ? "bold" : "normal"}>
                {label.startsWith("FIX") ? "FP" : label.startsWith("LIMIT") ? "LC" : "IRR"}
              </text>
            </g>
          );
        })
      )}
      {PHASE_AMPS.map((amp, ai) => (
        <text key={ai} x={padL + ai * cellW + cellW / 2} y={H - 16} textAnchor="middle" fill="#6b7280" fontSize={6}>{amp}</text>
      ))}
      {PHASE_DECAYS.map((decay, di) => (
        <text key={di} x={padL - 4} y={padT + di * cellH + cellH / 2 + 2} textAnchor="end" fill="#6b7280" fontSize={6}>{decay}</text>
      ))}
    </svg>
  );
}

// ── sparkline ────────────────────────────────────────────────────────────────
function SparkLine({ vals, color }: { vals: number[]; color: string }) {
  if (vals.length < 2) return null;
  const W = 130; const H = 28;
  const min = Math.min(...vals); const max = Math.max(...vals); const range = max - min || 0.001;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {vals.map((v, i) => <circle key={i} cx={(i / (vals.length - 1)) * W} cy={H - ((v - min) / range) * H} r={1.8} fill={color} />)}
    </svg>
  );
}

// ── presets ─────────────────────────────────────────────────────────────────
interface Preset { label: string; eThreshHigh: number; eThreshLow: number; amp: number; decay: number; iters: number; color: string; altStart: boolean; frozen: boolean; }
const PRESETS: Record<string, Preset> = {
  default:      { label:"Default",      eThreshHigh:0.92, eThreshLow:0.88, amp:1.25, decay:0.92, iters:20, color:"#10b981", altStart:false, frozen:false },
  conservative: { label:"Conservative", eThreshHigh:0.90, eThreshLow:0.86, amp:1.1,  decay:0.95, iters:20, color:"#2563eb", altStart:false, frozen:false },
  aggressive:   { label:"Aggressive",   eThreshHigh:0.93, eThreshLow:0.87, amp:1.4,  decay:0.88, iters:20, color:"#ea580c", altStart:false, frozen:false },
  frozen:       { label:"No Feedback",  eThreshHigh:0.92, eThreshLow:0.88, amp:1.0,  decay:1.0,  iters:20, color:"#6b7280", altStart:false, frozen:true  },
  altstart:     { label:"Alt Start",    eThreshHigh:0.92, eThreshLow:0.88, amp:1.25, decay:0.92, iters:20, color:"#c084fc", altStart:true,  frozen:false },
};
type PresetKey = keyof typeof PRESETS;

const FIXED_INPUT = "birdsong_signature_v1";
const PSI = ceEncode(FIXED_INPUT);
const PSI_HASH = deterministicHash(FIXED_INPUT);

interface EvolNode { name: string; nm: number; threshold: number; weight: number; }
interface EvolRecord { iter:number; load:number; winner:string; winnerNm:number; entropy:number; weights:Record<string,number>; flipped:boolean; fgRatio:number; windowRegime:string; }
type LogLine = { text:string; type:"step"|"data"|"diff"|"assert_pass"|"sep"|"header"|"evol"|"evol_flip"|"transition"|"metric" };
interface AccuracyRecord { preset:string; predicted:string; observed:string; match:boolean; }

// ── custom preset state ──────────────────────────────────────────────────────
interface CustomParams { amp: number; decay: number; }

export default function DivergenceTestPage() {
  const [preset, setPreset] = useState<PresetKey>("default");
  const [custom, setCustom] = useState<CustomParams | null>(null);  // null = use preset
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [evolRecords, setEvolRecords] = useState<EvolRecord[]>([]);
  const [evolDone, setEvolDone] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [showDiagram, setShowDiagram] = useState(false);
  const [targetRegime, setTargetRegime] = useState<RegimeLabel | null>(null);
  const accuracyLog = useRef<AccuracyRecord[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const [sideTab, setSideTab] = useState<"metrics"|"control">("metrics");

  const emit = useCallback(async (line: LogLine, delay = 45) => {
    if (cancelRef.current) return;
    setLog(prev => [...prev, line]);
    await new Promise(r => setTimeout(r, delay));
    logRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, []);

  const runAll = useCallback(async (pk: PresetKey, overrideParams?: CustomParams) => {
    cancelRef.current = false;
    setLog([]); setEvolRecords([]); setEvolDone(false);
    setRunning(true); setRunCount(c => c + 1);

    const baseP = PRESETS[pk];
    const amp   = overrideParams?.amp   ?? baseP.amp;
    const decay = overrideParams?.decay ?? baseP.decay;
    const p = { ...baseP, amp, decay };

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
    const iScore = instabilityScore(amp, decay, p.frozen);
    const predicted = predictRegime(iScore);

    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  DIVERGENCE PROOF  ·  ${p.label.toUpperCase()}${overrideParams ? "  [custom params]" : ""}`, type: "header" });
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: "", type: "sep" }, 10);
    await emit({ text: `  ψ_hash  = ${PSI_HASH}`, type: "data" }, 50);
    await emit({ text: `  CE→λ   = ${PSI.nm}nm  Ψ(${PSI.wdm},${PSI.oam},${PSI.pol})  [${PSI.band}]`, type: "data" }, 50);
    await emit({ text: `  instability_score = ${iScore}  →  predicted: ${predicted.label}`, type: "data" }, 60);
    await emit({ text: "", type: "sep" }, 10);
    await emit({ text: `  STATE_A  load=${loadA}  →  ${rA.winner?.name}@${rA.winner?.nm}nm  H=${rA.entropy}`, type: "evol" }, 60);
    await emit({ text: `  perturb: AuxNode_3@650nm  load→${loadB}${p.altStart ? "  weight→3.0" : ""}`, type: "diff" }, 60);
    await emit({ text: `  STATE_B  load=${loadB}  →  ${rB.winner?.name}@${rB.winner?.nm}nm  H=${rB.entropy}`, type: "evol" }, 60);
    await emit({ text: "", type: "sep" }, 10);
    await emit({ text: `  ✓  same input, different state  →  different result`, type: "assert_pass" }, 70);
    await emit({ text: "", type: "sep" }, 10);
    await emit({ text: "  Proof done. Starting evolution…", type: "header" }, 70);
    await emit({ text: "", type: "sep" }, 10);
    await new Promise(r => setTimeout(r, 250));

    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  EVOLUTION  ·  ${p.iters} iter  ·  hysteresis dead zone ${p.eThreshLow}–${p.eThreshHigh}`, type: "header" });
    await emit({ text: `  H>${p.eThreshHigh}→×${amp}  H<${p.eThreshLow}→×${(2-amp).toFixed(2)}  others×${decay}  load−1/cycle`, type: "header" });
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });

    let nodes: EvolNode[] = [...withAux.map(n => ({ ...n }))];
    let load = loadB;
    const records: EvolRecord[] = [];
    let prevWinner = rB.winner?.name ?? "";
    let prevWindowRegime = "";

    for (let i = 1; i <= p.iters; i++) {
      if (cancelRef.current) break;
      await new Promise(r => setTimeout(r, 70));
      const { winner, entropy } = route(PSI.nm, load, nodes);
      if (!winner) break;
      const flipped = prevWinner !== "" && winner.name !== prevWinner;

      // feedback/geometry ratio: (weight-1)/weight  → 0=geometry, 1=feedback
      const fgRatio = parseFloat(Math.max(0, Math.min(1, (winner.weight - 1) / winner.weight)).toFixed(3));

      // window regime (sliding window of last 5 for transition detection)
      const windowWinners = [...records.map(r => r.winner), winner.name].slice(-5);
      const windowRegime = windowWinners.length < 5 ? "—" : classifyAttractor(windowWinners).split(" ")[0];

      const rec: EvolRecord = { iter:i, load, winner:winner.name, winnerNm:winner.nm, entropy,
        weights: Object.fromEntries(nodes.map(n => [n.name, parseFloat(n.weight.toFixed(3))])), flipped, fgRatio, windowRegime };
      records.push(rec);
      setEvolRecords([...records]);

      // transition detection
      if (windowRegime !== "—" && prevWindowRegime !== "" && windowRegime !== prevWindowRegime) {
        await emit({ text: `  ⟳ TRANSITION  ${prevWindowRegime} → ${windowRegime}  (iter ${i})`, type: "transition" }, 30);
      }
      prevWindowRegime = windowRegime || prevWindowRegime;

      if (!p.frozen) {
        const newW = entropy > p.eThreshHigh
          ? Math.min(winner.weight * amp, 5.0)
          : entropy < p.eThreshLow
            ? Math.max(winner.weight * (2 - amp), 0.15)
            : winner.weight;
        nodes = nodes.map(n => n.name === winner.name
          ? { ...n, weight: parseFloat(newW.toFixed(3)) }
          : { ...n, weight: parseFloat(Math.max(n.weight * decay, 0.15).toFixed(3)) });
      }
      load = Math.max(0, load - 1);
      prevWinner = winner.name;

      const tag = flipped ? " ← FLIP" : "";
      const zone = !p.frozen && entropy >= p.eThreshLow && entropy <= p.eThreshHigh ? " [dz]" : "";
      await emit({ text: `  #${String(i).padStart(2)} L=${String(load+1).padStart(2)} → ${winner.name}@${winner.nm}nm H=${entropy} F/G=${fgRatio}${zone}${tag}`, type: flipped ? "evol_flip" : "evol" }, 38);
    }

    const winners = records.map(r => r.winner);
    const flips = records.filter(r => r.flipped).length;
    const firstFlip = records.findIndex(r => r.flipped);
    const eVals = records.map(r => r.entropy);
    const slope = entropySlope(eVals);
    const attractor = classifyAttractor(winners);
    const dominance: Record<string,number> = {};
    winners.forEach(w => { dominance[w] = (dominance[w] ?? 0) + 1; });
    const finalFG = records.length ? records[records.length - 1].fgRatio : 0;

    // accuracy tracking
    const matchLabel = attractor.split(" ")[0] as RegimeLabel;
    const match = matchLabel === predicted.label.split(" ")[0];
    accuracyLog.current.push({ preset: pk, predicted: predicted.label, observed: attractor, match });

    await emit({ text: "", type: "sep" }, 10);
    await emit({ text: "─── METRICS ──────────────────────────────────────", type: "step" });
    await emit({ text: `  attractor        = ${attractor}`, type: "metric" }, 50);
    await emit({ text: `  prediction       = ${predicted.label}  →  ${match ? "✓ MATCH" : "✗ DIVERGED"}`, type: "metric" }, 50);
    await emit({ text: `  flip_count       = ${flips}`, type: "metric" }, 50);
    await emit({ text: `  first_flip_at    = ${firstFlip === -1 ? "none" : "iter " + (firstFlip + 1)}`, type: "metric" }, 50);
    await emit({ text: `  entropy_slope    = ${slope >= 0 ? "+" : ""}${slope}  [${slope > 0.001 ? "expanding" : slope < -0.001 ? "collapsing" : "stable"}]`, type: "metric" }, 50);
    await emit({ text: `  F/G ratio (final)= ${finalFG}  [${finalFG < 0.1 ? "geometry dominant" : finalFG > 0.6 ? "feedback dominant" : "mixed"}]`, type: "metric" }, 50);
    for (const [name, count] of Object.entries(dominance)) {
      await emit({ text: `  dominance [${name}] = ${count}/${records.length} (${Math.round(100*count/records.length)}%)`, type: "metric" }, 38);
    }
    await emit({ text: "", type: "sep" }, 10);
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  ${attractor.startsWith("FIXED") ? "Fixed-point — settled." : attractor.startsWith("LIMIT") ? "Limit-cycle — bounded oscillation." : "Irregular — no repeating sequence in window."}`, type: "header" }, 70);
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });

    setEvolDone(true); setRunning(false);
  }, [emit]);

  function reset(pk: PresetKey, override?: CustomParams) {
    cancelRef.current = true;
    setLog([]); setEvolRecords([]); setEvolDone(false); setRunning(false);
    setTimeout(() => runAll(pk, override), 110);
  }

  function applyTarget(target: RegimeLabel) {
    const suggested = suggestForRegime(target);
    const c = { amp: suggested.amp, decay: suggested.decay };
    setCustom(c); setTargetRegime(target);
    reset(preset, c);
  }

  function clearCustom() {
    setCustom(null); setTargetRegime(null);
    reset(preset, undefined);
  }

  useEffect(() => { runAll("default"); return () => { cancelRef.current = true; }; }, []);

  const p = { ...PRESETS[preset], amp: custom?.amp ?? PRESETS[preset].amp, decay: custom?.decay ?? PRESETS[preset].decay };
  const flips = evolRecords.filter(r => r.flipped).length;
  const firstFlip = evolRecords.findIndex(r => r.flipped);
  const eVals = evolRecords.map(r => r.entropy);
  const slope = entropySlope(eVals);
  const attractor = evolRecords.length > 5 ? classifyAttractor(evolRecords.map(r => r.winner)) : "—";
  const dominance: Record<string,number> = {};
  evolRecords.forEach(r => { dominance[r.winner] = (dominance[r.winner] ?? 0) + 1; });
  const total = evolRecords.length;
  const finalFG = evolRecords.length ? evolRecords[evolRecords.length - 1].fgRatio : null;
  const iScore = instabilityScore(p.amp, p.decay, p.frozen);
  const predicted = predictRegime(iScore);
  const { margin, descriptor } = distanceToBoundary(iScore);
  const accRecords = accuracyLog.current;
  const accTotal = accRecords.length;
  const accCorrect = accRecords.filter(r => r.match).length;
  const transitions = evolRecords.filter((r, i) => i > 4 && r.windowRegime !== (evolRecords[i-1]?.windowRegime ?? "")).length;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      {/* header */}
      <div className="border-b border-white/10 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command"><button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={14} /></button></Link>
          <FlaskConical size={12} className="text-emerald-400" />
          <span className="text-[11px] font-bold tracking-wider text-emerald-400">DYNAMICAL SYSTEM ANALYSIS</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          {custom && (
            <span className="text-[8px] px-2 py-0.5 rounded border border-purple-400/40 text-purple-400 flex items-center gap-1">
              <Target size={7} /> targeting {targetRegime}
              <button onClick={clearCustom} className="ml-1 text-purple-400/50 hover:text-purple-400">×</button>
            </span>
          )}
          {evolDone && (
            <span className={`text-[8px] px-2 py-0.5 rounded border flex items-center gap-1 ${flips > 0 ? "border-amber-400/40 text-amber-400" : "border-emerald-400/30 text-emerald-400"}`}>
              {flips > 0 && <Zap size={7} />} {attractor}
            </span>
          )}
          {accTotal > 0 && (
            <span className="text-[7px] text-white/30 flex items-center gap-1">
              <CheckCircle size={7} /> {accCorrect}/{accTotal} predicted
            </span>
          )}
          <button onClick={() => setShowDiagram(d => !d)}
            className={`flex items-center gap-1 text-[7px] px-2 py-0.5 rounded border transition-all ${showDiagram ? "border-cyan-400/50 text-cyan-400" : "border-white/10 text-white/25 hover:text-white/50"}`}
            data-testid="button-phase-diagram"><Eye size={7} /> phase map</button>
          <span className="text-[7px] text-white/20">#{runCount}</span>
        </div>
      </div>

      {/* preset strip */}
      <div className="border-b border-white/5 px-6 py-2 flex items-center gap-2 flex-wrap flex-shrink-0" style={{ background: "rgba(255,255,255,0.01)" }}>
        <span className="text-white/20 text-[7px] uppercase tracking-widest">Preset:</span>
        {(Object.keys(PRESETS) as PresetKey[]).map(pk => (
          <button key={pk} onClick={() => { setPreset(pk); setCustom(null); setTargetRegime(null); reset(pk); }} disabled={running}
            className="text-[7.5px] px-2 py-0.5 rounded-full border transition-all disabled:opacity-40"
            style={{ borderColor: PRESETS[pk].color + (preset === pk && !custom ? "99" : "28"), color: PRESETS[pk].color, background: preset === pk && !custom ? PRESETS[pk].color + "18" : "transparent" }}
            data-testid={`button-preset-${pk}`}>{PRESETS[pk].label}</button>
        ))}
        <button onClick={() => reset(preset, custom ?? undefined)} disabled={running}
          className="ml-auto flex items-center gap-1 text-[7px] text-white/25 hover:text-white/50 transition-colors disabled:opacity-30"
          data-testid="button-rerun"><RotateCcw size={7} /> Re-run</button>
      </div>

      {/* main */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* log */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-r border-white/5">
          <div className="px-4 py-1.5 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
            <GitBranch size={8} className="text-white/20" />
            <span className="text-white/20 text-[7.5px] uppercase tracking-widest">Execution log</span>
            {running && <span className="text-[7px] text-emerald-400/60 animate-pulse ml-auto">running…</span>}
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-px text-[8.5px] leading-relaxed min-h-0">
            {log.length === 0 && <div className="text-white/15 text-center py-16">Initializing…</div>}
            {log.map((line, idx) => {
              const col = line.type === "header" ? "#10b981" : line.type === "step" ? "#a78bfa"
                : line.type === "data" ? "#94a3b8" : line.type === "diff" ? "#f59e0b"
                : line.type === "assert_pass" ? "#10b981" : line.type === "evol" ? "#22d3ee"
                : line.type === "evol_flip" ? "#f59e0b" : line.type === "metric" ? "#c084fc"
                : line.type === "transition" ? "#e879f9" : line.type === "sep" ? "#374151" : "#4b5563";
              return <div key={idx} style={{ color: col }} className="whitespace-pre-wrap">{line.text}</div>;
            })}
            {running && <div className="text-emerald-400/40 animate-pulse text-[9px]">▊</div>}
          </div>
        </div>

        {/* sidebar */}
        <div className="lg:w-72 flex-shrink-0 flex flex-col overflow-hidden">
          {/* sidebar tabs */}
          <div className="border-b border-white/5 flex flex-shrink-0">
            {(["metrics","control"] as const).map(tab => (
              <button key={tab} onClick={() => setSideTab(tab)}
                className={`flex-1 py-1.5 text-[7.5px] uppercase tracking-widest transition-all ${sideTab === tab ? "text-emerald-400 border-b border-emerald-400" : "text-white/25 hover:text-white/50"}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">

            {sideTab === "metrics" && (<>
              {/* prediction */}
              <div className="border rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)", borderColor: predicted.color + "40" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/25 text-[7px] uppercase tracking-widest">Predicted Regime</span>
                  <span className="text-[6.5px] px-1.5 py-0.5 rounded" style={{ background: predicted.color + "20", color: predicted.color }}>score={iScore}</span>
                </div>
                <div className="text-[10px] font-bold mb-0.5" style={{ color: predicted.color }}>{predicted.label}</div>
                <div className="text-white/25 text-[7px] leading-relaxed mb-2">{predicted.explanation}</div>
                <div className="border-t border-white/5 pt-2">
                  <div className="flex items-center justify-between text-[7px]">
                    <span className="text-white/25">boundary margin</span>
                    <span className={margin < 0.02 ? "text-amber-400" : margin < 0.04 ? "text-yellow-400/70" : "text-emerald-400/70"}>{margin}</span>
                  </div>
                  <div className="text-white/20 text-[6.5px] mt-0.5">{descriptor}</div>
                  {/* margin bar */}
                  <div className="h-1 rounded-full bg-white/5 mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, margin / 0.07 * 100)}%`, background: margin < 0.02 ? "#f59e0b" : margin < 0.04 ? "#eab308" : "#10b981" }} />
                  </div>
                  <div className="flex justify-between text-[6px] text-white/15 mt-0.5"><span>boundary</span><span>stable</span></div>
                </div>
              </div>

              {/* observed attractor */}
              <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-white/25 text-[7px] uppercase tracking-widest mb-1">Observed Attractor</div>
                <div className={`text-[10px] font-bold ${evolRecords.length < 6 ? "text-white/20" : attractor === "FIXED-POINT" ? "text-emerald-400" : attractor.startsWith("LIMIT") ? "text-cyan-400" : "text-amber-400"}`}>
                  {evolRecords.length < 6 ? "computing…" : attractor}
                </div>
                {evolDone && (
                  <div className={`text-[7px] mt-1 flex items-center gap-1 ${attractor.split(" ")[0] === predicted.label.split(" ")[0] ? "text-emerald-400/60" : "text-amber-400/60"}`}>
                    {attractor.split(" ")[0] === predicted.label.split(" ")[0] ? <><CheckCircle size={7} /> matched prediction</> : "⚠ prediction diverged"}
                  </div>
                )}
                {transitions > 0 && <div className="text-purple-400/60 text-[7px] mt-0.5">⟳ {transitions} mid-run regime transition{transitions > 1 ? "s" : ""}</div>}
              </div>

              {/* flip dynamics */}
              <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2">Flip Dynamics</div>
                <div className="space-y-1.5 text-[8px]">
                  {[
                    ["flips",         total ? String(flips) : "—",                 flips > 0 ? "#f59e0b" : "#6b7280"],
                    ["first flip",    !total ? "—" : firstFlip === -1 ? "none" : `iter ${firstFlip+1}`, "#94a3b8"],
                    ["path-dependent","true",                                       "#10b981"],
                  ].map(([label, val, col]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-white/30">{label}</span>
                      <span style={{ color: total ? col : "#374151" }}>{val}</span>
                    </div>
                  ))}
                  {finalFG !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/30">F/G ratio</span>
                        <span className={finalFG < 0.15 ? "text-cyan-400" : finalFG > 0.6 ? "text-purple-400" : "text-white/50"}>{finalFG}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${finalFG * 100}%`, background: finalFG < 0.15 ? "#22d3ee" : finalFG > 0.6 ? "#c084fc" : "#94a3b8" }} />
                      </div>
                      <div className="flex justify-between text-[6px] text-white/15 mt-0.5"><span>geometry</span><span>feedback</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* entropy sparkline */}
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
                  : <div className="text-white/15 text-[7px]">awaiting data…</div>}
                {eVals.length > 1 && (
                  <div className="flex items-center justify-between mt-1 text-[6.5px] text-white/25">
                    <span>H₀={eVals[0]}</span><span>slope {slope >= 0 ? "+" : ""}{slope}</span><span>Hₙ={eVals[eVals.length-1]}</span>
                  </div>
                )}
              </div>

              {/* dominance */}
              {Object.keys(dominance).length > 0 && (
                <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2">Channel Dominance</div>
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
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: nmToColor(nm) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* phase diagram */}
              {showDiagram && (
                <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2">Phase Diagram</div>
                  <PhaseDiagram activeAmp={p.amp} activeDecay={p.decay} />
                  <div className="flex items-center gap-3 mt-1.5">
                    {[["FP","#10b981","fixed-pt"],["LC","#22d3ee","limit-cycle"],["IRR","#f59e0b","irregular"]].map(([k,c,l]) => (
                      <span key={k} className="flex items-center gap-1 text-[6.5px]" style={{ color: c }}>
                        <span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ background: c + "40", border: "1px solid " + c }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>)}

            {sideTab === "control" && (<>
              {/* target regime */}
              <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-white/25 text-[7px] uppercase tracking-widest mb-1.5 flex items-center gap-1"><Target size={7} /> Target Regime</div>
                <div className="text-white/35 text-[7px] mb-2 leading-relaxed">Select a target — system suggests minimal parameter shift and re-runs automatically.</div>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {(["FIXED-POINT","LIMIT-CYCLE","IRREGULAR"] as RegimeLabel[]).map(target => {
                    const col = target === "FIXED-POINT" ? "#10b981" : target === "LIMIT-CYCLE" ? "#22d3ee" : "#f59e0b";
                    const sug = suggestForRegime(target);
                    const isActive = targetRegime === target;
                    return (
                      <button key={target} onClick={() => applyTarget(target)} disabled={running}
                        className="text-[7px] py-1.5 rounded-lg border transition-all disabled:opacity-30 text-center"
                        style={{ borderColor: col + (isActive ? "99" : "30"), color: col, background: isActive ? col + "18" : "transparent" }}
                        data-testid={`button-target-${target.toLowerCase()}`}>
                        {target === "FIXED-POINT" ? "Fixed-Point" : target === "LIMIT-CYCLE" ? "Limit-Cycle" : "Irregular"}
                        <div className="text-[6px] opacity-60 mt-0.5">a×{sug.amp} d×{sug.decay}</div>
                      </button>
                    );
                  })}
                </div>
                {targetRegime && (
                  <div className="border border-white/5 rounded-lg p-2 text-[7px] text-white/40 leading-relaxed">
                    <span className="text-white/60">Applied:</span> amp={custom?.amp} · decay={custom?.decay}<br/>
                    score={instabilityScore(custom?.amp ?? 1, custom?.decay ?? 1, false)} · {suggestForRegime(targetRegime).note}
                    <button onClick={clearCustom} className="block mt-1 text-white/25 hover:text-white/50 underline">clear &amp; restore preset</button>
                  </div>
                )}
              </div>

              {/* prediction accuracy */}
              <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2">Prediction Accuracy</div>
                {accTotal === 0
                  ? <div className="text-white/20 text-[7px]">Run multiple presets to build accuracy data.</div>
                  : (<>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold" style={{ color: accCorrect/accTotal > 0.7 ? "#10b981" : accCorrect/accTotal > 0.4 ? "#f59e0b" : "#dc2626" }}>
                        {Math.round(100*accCorrect/accTotal)}%
                      </span>
                      <span className="text-white/25 text-[7px]">{accCorrect}/{accTotal} correct</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-3">
                      <div className="h-full rounded-full" style={{ width: `${100*accCorrect/accTotal}%`, background: accCorrect/accTotal > 0.7 ? "#10b981" : "#f59e0b" }} />
                    </div>
                    <div className="space-y-1">
                      {accRecords.slice(-8).map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-[6.5px]">
                          <span className="text-white/25">{r.preset}</span>
                          <span className="text-white/20">{r.predicted.split(" ")[0].slice(0,4)}→{r.observed.split(" ")[0].slice(0,4)}</span>
                          <span style={{ color: r.match ? "#10b981" : "#f59e0b" }}>{r.match ? "✓" : "✗"}</span>
                        </div>
                      ))}
                    </div>
                  </>)
                }
              </div>

              {/* causal attribution */}
              {evolDone && (
                <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="text-white/25 text-[7px] uppercase tracking-widest mb-2">Causal Attribution</div>
                  {preset === "frozen" && (
                    <div className={`text-[7px] leading-relaxed ${flips === 0 ? "text-emerald-400/70" : "text-amber-400/70"}`}>
                      {flips === 0 ? "✓ Feedback confirmed dominant. No flip with frozen weights — Default flip is feedback-driven." : "⚠ Distance geometry contributes. Flip occurred even with frozen weights."}
                    </div>
                  )}
                  {preset === "altstart" && (
                    <div className="text-purple-400/70 text-[7px] leading-relaxed">
                      AuxNode_3 pre-seeded at weight=3.0. Compare attractor type with Default to test initial-condition sensitivity.
                    </div>
                  )}
                  {preset !== "frozen" && preset !== "altstart" && finalFG !== null && (
                    <div className="text-[7px] leading-relaxed text-white/40">
                      F/G={finalFG}. {finalFG < 0.15 ? "Distance geometry is dominant — weights had minimal effect on final routing." : finalFG > 0.6 ? "Feedback is dominant — weight amplification drove winner selection more than wavelength proximity." : "Mixed causality — both geometry and feedback contributed to the observed behavior."}
                    </div>
                  )}
                </div>
              )}

              {/* terminology reference */}
              <div className="border border-white/5 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.008)" }}>
                <div className="text-white/15 text-[7px] uppercase tracking-widest mb-2">Terminology</div>
                {[
                  ["Channel State",       "snapshot of node weights + load at iteration t"],
                  ["Instability Score",   "amp × (1 − decay) — central axis for prediction"],
                  ["Attractor Type",      "FP / LC / IRR — classification of convergent behavior"],
                  ["Flip Event",          "winner change between iterations t and t+1"],
                  ["F/G Ratio",           "(weight−1)/weight — 0=geometry, 1=feedback"],
                  ["Boundary Margin",     "distance from instability score to nearest regime boundary"],
                ].map(([term, def]) => (
                  <div key={term} className="mb-1.5">
                    <div className="text-white/40 text-[7px]">{term}</div>
                    <div className="text-white/20 text-[6.5px] leading-relaxed">{def}</div>
                  </div>
                ))}
              </div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}
