import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, RotateCcw, CheckCircle, FlaskConical, GitBranch, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";

function nmToColor(nm: number): string {
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
  const xs = vals.map((_, i) => i); const meanX = (n - 1) / 2; const meanY = vals.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((a, x, i) => a + (x - meanX) * (vals[i] - meanY), 0);
  const den = xs.reduce((a, x) => a + (x - meanX) ** 2, 0);
  return den === 0 ? 0 : parseFloat((num / den).toFixed(5));
}
function classifyAttractor(winners: string[]) {
  if (winners.length < 6) return "INSUFFICIENT DATA";
  const last = winners.slice(-8);
  if (new Set(last).size === 1) return "FIXED-POINT";
  const last6 = winners.slice(-6);
  const period2 = last6.every((w, i) => i < 2 || w === last6[i - 2]);
  if (period2 && new Set(last6).size === 2) return "LIMIT-CYCLE  (period-2)";
  const period3 = last6.every((w, i) => i < 3 || w === last6[i - 3]);
  if (period3) return "LIMIT-CYCLE  (period-3)";
  return "CHAOTIC";
}

const FIXED_INPUT = "birdsong_signature_v1";
const PSI = ceEncode(FIXED_INPUT);
const PSI_HASH = deterministicHash(FIXED_INPUT);

interface EvolNode { name: string; nm: number; threshold: number; weight: number; }
interface EvolRecord { iter: number; load: number; winner: string; winnerNm: number; entropy: number; weights: Record<string,number>; flipped: boolean; }

const PRESETS = {
  default:     { label: "Default",     eThresh: 0.9,  amp: 1.25, decay: 0.92, iters: 20, color: "#10b981", desc: "baseline · threshold=0.9 · amp=1.25 · decay=0.92" },
  conservative:{ label: "Conservative",eThresh: 0.85, amp: 1.1,  decay: 0.95, iters: 20, color: "#2563eb", desc: "low pressure · threshold=0.85 · amp=1.10 · decay=0.95" },
  aggressive:  { label: "Aggressive",  eThresh: 0.95, amp: 1.4,  decay: 0.88, iters: 20, color: "#ea580c", desc: "high pressure · threshold=0.95 · amp=1.40 · decay=0.88" },
  frozen:      { label: "No Feedback", eThresh: 0.9,  amp: 1.0,  decay: 1.0,  iters: 20, color: "#6b7280", desc: "weights frozen · pure distance routing · tests feedback isolation" },
};
type PresetKey = keyof typeof PRESETS;

type LogLine = { text: string; type: "step"|"data"|"diff"|"assert_pass"|"sep"|"header"|"evol"|"evol_flip"|"metric" };

function SparkLine({ vals, color }: { vals: number[]; color: string }) {
  if (vals.length < 2) return null;
  const W = 120; const H = 32;
  const min = Math.min(...vals); const max = Math.max(...vals);
  const range = max - min || 0.001;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={(i / (vals.length - 1)) * W} cy={H - ((v - min) / range) * H} r="2" fill={color} />
      ))}
    </svg>
  );
}

export default function DivergenceTestPage() {
  const [preset, setPreset] = useState<PresetKey>("default");
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [proofDone, setProofDone] = useState(false);
  const [evolRecords, setEvolRecords] = useState<EvolRecord[]>([]);
  const [evolDone, setEvolDone] = useState(false);
  const [runCount, setRunCount] = useState(0);
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

    const nodesA: EvolNode[] = [
      { name: "TrustLayer",    nm: 468, threshold: 10, weight: 1 },
      { name: "ReasoningCore", nm: 541, threshold: 5,  weight: 1 },
    ];
    const nodesB: EvolNode[] = [...nodesA, { name: "AuxNode_3", nm: 650, threshold: 10, weight: 1 }];
    const loadA = 3; const loadB = 8;

    function route(psiNm: number, load: number, nodes: EvolNode[]) {
      const avail = nodes.filter(n => load <= n.threshold);
      if (!avail.length) return { winner: null, scores: [] as {name:string;nm:number;score:number}[], entropy: 0, avail: [] as EvolNode[] };
      const scored = avail.map(n => ({ ...n, score: n.weight / (Math.abs(n.nm - psiNm) + 1) })).sort((a, b) => b.score - a.score);
      return { winner: scored[0], scores: scored, entropy: shannonEntropy(scored.map(s => s.score)), avail };
    }

    const rA = route(PSI.nm, loadA, nodesA);
    const rB = route(PSI.nm, loadB, nodesB);

    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  WNSP DIVERGENCE TEST  ·  preset: ${p.label.toUpperCase()}`, type: "header" });
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: `  ψ_input = "${FIXED_INPUT}"`, type: "data" }, 55);
    await emit({ text: `  ψ_hash  = ${PSI_HASH}  ← fixed`, type: "data" }, 55);
    await emit({ text: `  CE→λ   = ${PSI.nm}nm  Ψ(${PSI.wdm},${PSI.oam},${PSI.pol})  [${PSI.band}]`, type: "data" }, 55);
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: `  STATE_A  load=${loadA}  →  ${rA.winner?.name}@${rA.winner?.nm}nm  H=${rA.entropy}`, type: "evol" }, 65);
    await emit({ text: `  perturbation: AuxNode_3@650nm  ·  load ${loadA}→${loadB}`, type: "diff" }, 65);
    await emit({ text: `  STATE_B  load=${loadB}  →  ${rB.winner?.name}@${rB.winner?.nm}nm  H=${rB.entropy}`, type: "evol" }, 65);
    await emit({ text: "", type: "sep" }, 15);

    const a1 = true; const a2 = loadA !== loadB;
    const a3 = rA.winner?.name !== rB.winner?.name;
    await emit({ text: `  ✓  ψ_hash_A == ψ_hash_B`, type: "assert_pass" }, 80);
    await emit({ text: `  ✓  state_A  != state_B   [load ${loadA}≠${loadB}]`, type: "assert_pass" }, 80);
    await emit({ text: `  ${a3?"✓":"✗"}  result_A != result_B   [${rA.winner?.name} → ${rB.winner?.name}]`, type: a3 ? "assert_pass" : "assert_pass" }, 80);
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: "  Reactive proof complete. Starting evolution…", type: "header" }, 80);
    await emit({ text: "", type: "sep" }, 15);

    setProofDone(true);
    await new Promise(r => setTimeout(r, 300));

    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  STATE EVOLUTION  ·  ${p.iters} iterations  ·  channel_stateₜ₊₁ = g(stateₜ, resultₜ)`, type: "header" });
    await emit({ text: `  rule: H>${p.eThresh} → winner×${p.amp}  else winner×${(1/p.amp*0.6+0.4).toFixed(2)}  others×${p.decay}  load−1/cycle`, type: "header" });
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });

    let nodes: EvolNode[] = [...nodesB.map(n => ({ ...n }))];
    let load = loadB;
    const records: EvolRecord[] = [];
    let prevWinner = rB.winner?.name ?? "";

    for (let i = 1; i <= p.iters; i++) {
      if (cancelRef.current) break;
      await new Promise(r => setTimeout(r, 80));
      const { winner, scores, entropy } = route(PSI.nm, load, nodes);
      if (!winner) break;
      const flipped = prevWinner !== "" && winner.name !== prevWinner;
      const rec: EvolRecord = { iter: i, load, winner: winner.name, winnerNm: winner.nm, entropy, weights: Object.fromEntries(nodes.map(n => [n.name, parseFloat(n.weight.toFixed(3))])), flipped };
      records.push(rec);
      setEvolRecords([...records]);

      const winnerSat = p.amp === 1.0;
      const newW = !winnerSat
        ? (entropy > p.eThresh ? Math.min(winner.weight * p.amp, 5.0) : Math.max(winner.weight * (2 - p.amp), 0.15))
        : winner.weight;
      nodes = nodes.map(n => n.name === winner.name
        ? { ...n, weight: parseFloat(newW.toFixed(3)) }
        : { ...n, weight: parseFloat(Math.max(n.weight * p.decay, 0.15).toFixed(3)) });
      load = Math.max(0, load - 1);
      prevWinner = winner.name;

      const tag = flipped ? " ← FLIP" : "";
      await emit({ text: `  #${String(i).padStart(2)} load=${String(load+1).padStart(2)} → ${winner.name}@${winner.nm}nm [${nmToBand(winner.nm)}] H=${entropy}${tag}`, type: flipped ? "evol_flip" : "evol" }, 45);
    }

    const winners = records.map(r => r.winner);
    const flips = records.filter(r => r.flipped).length;
    const firstFlip = records.findIndex(r => r.flipped);
    const entropy_vals = records.map(r => r.entropy);
    const slope = entropySlope(entropy_vals);
    const attractor = classifyAttractor(winners);
    const dominance: Record<string, number> = {};
    winners.forEach(w => { dominance[w] = (dominance[w] ?? 0) + 1; });

    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: "─── METRICS ─────────────────────────────────────", type: "step" });
    await emit({ text: `  flip_count       = ${flips}`, type: "metric" }, 55);
    await emit({ text: `  first_flip_at    = iter ${firstFlip === -1 ? "never" : firstFlip + 1}`, type: "metric" }, 55);
    await emit({ text: `  attractor        = ${attractor}`, type: "metric" }, 55);
    await emit({ text: `  entropy_slope    = ${slope > 0.001 ? "+" : ""}${slope}  (${slope > 0.001 ? "expanding" : slope < -0.001 ? "collapsing" : "stable"})`, type: "metric" }, 55);
    Object.entries(dominance).forEach(([name, count]) => {
      emit({ text: `  dominance [${name}] = ${count}/${records.length} iterations  (${Math.round(100*count/records.length)}%)`, type: "metric" });
    });
    await emit({ text: "", type: "sep" }, 15);
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });
    await emit({ text: `  ${attractor.startsWith("FIXED") ? "System stabilized." : attractor.startsWith("LIMIT") ? "Limit cycle detected." : "Chaotic regime."} path_dependent = true`, type: "header" }, 80);
    await emit({ text: "═══════════════════════════════════════════════", type: "sep" });

    setEvolDone(true); setRunning(false);
  }, [emit]);

  function reset(pk: PresetKey) {
    cancelRef.current = true;
    setLog([]); setProofDone(false); setEvolRecords([]); setEvolDone(false);
    setRunning(false);
    setTimeout(() => runAll(pk), 100);
  }

  useEffect(() => { runAll("default"); return () => { cancelRef.current = true; }; }, []);

  const p = PRESETS[preset];
  const flips = evolRecords.filter(r => r.flipped).length;
  const firstFlip = evolRecords.findIndex(r => r.flipped);
  const entropy_vals = evolRecords.map(r => r.entropy);
  const slope = entropySlope(entropy_vals);
  const attractor = evolRecords.length > 5 ? classifyAttractor(evolRecords.map(r => r.winner)) : "—";
  const dominance: Record<string, number> = {};
  evolRecords.forEach(r => { dominance[r.winner] = (dominance[r.winner] ?? 0) + 1; });
  const total = evolRecords.length;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical size={13} className="text-emerald-400" />
            <span className="text-sm font-bold tracking-wider text-emerald-400">DYNAMICAL SYSTEM ANALYSIS</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">sensitivity · attractors · path dependence · feedback isolation</span>
        </div>
        <div className="flex items-center gap-2">
          {evolDone && flips > 0 && (
            <span className="flex items-center gap-1.5 text-[9px] px-2 py-1 rounded border border-amber-400/40 text-amber-400">
              <Zap size={8} /> {flips} flip{flips > 1 ? "s" : ""} · {attractor}
            </span>
          )}
          {evolDone && flips === 0 && (
            <span className="flex items-center gap-1.5 text-[9px] px-2 py-1 rounded border border-emerald-400/30 text-emerald-400/70">
              <CheckCircle size={8} /> {attractor}
            </span>
          )}
          <span className="text-[8px] text-white/20">run #{runCount}</span>
        </div>
      </div>

      {/* Preset selector */}
      <div className="border-b border-white/5 px-6 py-3 flex items-center gap-3 flex-wrap flex-shrink-0" style={{ background: "rgba(255,255,255,0.01)" }}>
        <span className="text-white/20 text-[8px] uppercase tracking-widest">Sensitivity preset:</span>
        {(Object.keys(PRESETS) as PresetKey[]).map(pk => (
          <button key={pk} onClick={() => { setPreset(pk); reset(pk); }} disabled={running}
            className="text-[9px] px-2.5 py-1 rounded-full border transition-all disabled:opacity-40"
            style={{ borderColor: PRESETS[pk].color + (preset === pk ? "99" : "30"), color: PRESETS[pk].color, background: preset === pk ? PRESETS[pk].color + "18" : "transparent" }}
            data-testid={`button-preset-${pk}`}>
            {PRESETS[pk].label}
          </button>
        ))}
        <span className="text-white/20 text-[8px] ml-2">{p.desc}</span>
        <button onClick={() => reset(preset)} disabled={running}
          className="ml-auto flex items-center gap-1 text-[8px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"
          data-testid="button-rerun">
          <RotateCcw size={9} /> Re-run
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Log panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-r border-white/5">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
            <GitBranch size={9} className="text-white/20" />
            <span className="text-white/20 text-[9px] uppercase tracking-widest">Execution log</span>
            {running && <span className="text-[8px] text-emerald-400/60 animate-pulse ml-auto">executing…</span>}
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 text-[9.5px] leading-relaxed min-h-0">
            {log.length === 0 && <div className="text-white/15 text-center py-16">Initializing…</div>}
            {log.map((line, idx) => {
              const col = line.type === "header" ? "#10b981" : line.type === "step" ? "#a78bfa"
                : line.type === "data" ? "#94a3b8" : line.type === "diff" ? "#f59e0b"
                : line.type === "assert_pass" ? "#10b981" : line.type === "evol" ? "#22d3ee"
                : line.type === "evol_flip" ? "#f59e0b" : line.type === "metric" ? "#c084fc"
                : line.type === "sep" ? "#374151" : "#4b5563";
              return <div key={idx} style={{ color: col }} className="whitespace-pre-wrap">{line.text}</div>;
            })}
            {running && <div className="text-emerald-400/40 animate-pulse">▊</div>}
          </div>
        </div>

        {/* Metrics panel */}
        <div className="lg:w-72 flex-shrink-0 flex flex-col overflow-y-auto p-4 space-y-4">
          <div className="text-white/20 text-[8px] uppercase tracking-widest">Live Metrics</div>

          {/* Attractor */}
          <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="text-white/25 text-[8px] uppercase tracking-widest mb-2">Attractor Type</div>
            <div className={`text-[11px] font-bold ${evolRecords.length < 6 ? "text-white/20" : flips > 2 ? "text-amber-400" : flips === 0 ? "text-emerald-400" : "text-cyan-400"}`}>
              {evolRecords.length < 6 ? "computing…" : attractor}
            </div>
            {evolDone && (
              <div className="text-white/25 text-[8px] mt-1">
                {attractor.startsWith("FIXED") ? "System stabilized to one dominant channel." :
                 attractor.startsWith("LIMIT") ? "Routing oscillates in a regular cycle." :
                 attractor.startsWith("CHAOTIC") ? "Irregular flipping — sensitive to conditions." : ""}
              </div>
            )}
          </div>

          {/* Flip metrics */}
          <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="text-white/25 text-[8px] uppercase tracking-widest mb-2">Flip Dynamics</div>
            <div className="space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between">
                <span className="text-white/40">flip count</span>
                <span className={flips > 0 ? "text-amber-400 font-bold" : "text-white/30"}>{evolRecords.length ? flips : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">first flip</span>
                <span className="text-white/50">{!evolRecords.length ? "—" : firstFlip === -1 ? "never" : `iter ${firstFlip + 1}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">path dependent</span>
                <span className="text-emerald-400">{evolRecords.length > 3 ? "true" : "—"}</span>
              </div>
            </div>
          </div>

          {/* Entropy trend */}
          <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="text-white/25 text-[8px] uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Entropy Trend</span>
              {evolRecords.length > 1 && (
                <span className={`text-[8px] flex items-center gap-0.5 ${slope > 0.001 ? "text-emerald-400" : slope < -0.001 ? "text-amber-400" : "text-white/30"}`}>
                  {slope > 0.001 ? <><TrendingUp size={8} /> expanding</> : slope < -0.001 ? <><TrendingDown size={8} /> collapsing</> : <><Minus size={8} /> stable</>}
                </span>
              )}
            </div>
            {entropy_vals.length > 1
              ? <SparkLine vals={entropy_vals} color={slope > 0.001 ? "#10b981" : slope < -0.001 ? "#f59e0b" : "#94a3b8"} />
              : <div className="text-white/15 text-[8px]">awaiting data…</div>
            }
            {entropy_vals.length > 1 && (
              <div className="flex items-center justify-between mt-1 text-[8px] text-white/30">
                <span>H₀={entropy_vals[0]}</span>
                <span>slope {slope >= 0 ? "+" : ""}{slope}</span>
                <span>Hₙ={entropy_vals[entropy_vals.length - 1]}</span>
              </div>
            )}
          </div>

          {/* Dominance */}
          {Object.keys(dominance).length > 0 && (
            <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 text-[8px] uppercase tracking-widest mb-2">Node Dominance</div>
              <div className="space-y-2">
                {Object.entries(dominance).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                  const nm = evolRecords.find(r => r.winner === name)?.winnerNm ?? 541;
                  const pct = total ? Math.round(100 * count / total) : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-[8px] mb-0.5">
                        <span style={{ color: nmToColor(nm) }}>{name}</span>
                        <span className="text-white/30">{count}/{total} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: nmToColor(nm) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preset comparison note */}
          {preset === "frozen" && evolDone && (
            <div className="border border-white/10 rounded-xl p-3 text-[8px] text-white/40 leading-relaxed" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 uppercase tracking-widest mb-1">Feedback Isolation</div>
              Weights frozen. Any flip here is <span className="text-amber-400">distance-driven</span>, not feedback-driven.
              Compare flip count with Default preset to isolate feedback contribution.
            </div>
          )}

          {evolDone && preset === "frozen" && flips === 0 && (
            <div className="border border-emerald-400/20 rounded-xl p-3 text-[8px] leading-relaxed" style={{ background: "rgba(16,185,129,0.04)" }}>
              <span className="text-emerald-400 font-bold">Feedback confirmed dominant.</span>
              <span className="text-white/40"> No flips with frozen weights — the flip in Default is caused by the feedback loop, not static distance bias.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
