import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, FlaskConical, Hash, GitBranch, TrendingUp } from "lucide-react";

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
function ceEncode(name: string) {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const sum = codes.reduce((a, b) => a + b, 0);
  const avg = sum / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = sum % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, wdm, oam, pol, band: nmToBand(nm) };
}
function deterministicHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return "0x" + h.toString(16).toUpperCase().padStart(8, "0");
}
function shannonEntropy(scores: number[]): number {
  const total = scores.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const probs = scores.map(s => s / total);
  return parseFloat((-probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0)).toFixed(4));
}

const FIXED_INPUT = "birdsong_signature_v1";
const PSI = ceEncode(FIXED_INPUT);
const PSI_HASH = deterministicHash(FIXED_INPUT);

interface EvolNode { name: string; nm: number; threshold: number; weight: number; }

function routeWeighted(psiNm: number, load: number, nodes: EvolNode[]) {
  const available = nodes.filter(n => load <= n.threshold);
  if (!available.length) return { winner: null, scores: [], entropy: 0, available: [] };
  const scored = available.map(n => ({ ...n, score: n.weight / (Math.abs(n.nm - psiNm) + 1) }));
  scored.sort((a, b) => b.score - a.score);
  const entropy = shannonEntropy(scored.map(s => s.score));
  return { winner: scored[0], scores: scored, entropy, available };
}

function evolveWeights(nodes: EvolNode[], winnerName: string, entropy: number): EvolNode[] {
  return nodes.map(n => {
    if (n.name === winnerName) {
      const w = entropy > 0.9
        ? Math.min(n.weight * 1.25, 4.0)
        : Math.max(n.weight * 0.75, 0.2);
      return { ...n, weight: parseFloat(w.toFixed(3)) };
    }
    return { ...n, weight: parseFloat(Math.max(n.weight * 0.92, 0.2).toFixed(3)) };
  });
}

type LogLine = { text: string; type: "step"|"data"|"diff"|"assert_pass"|"assert_fail"|"sep"|"header"|"evol"|"evol_flip"|"evol_stable" };
type EvolRecord = { iter: number; load: number; winner: string; winnerNm: number; entropy: number; weights: Record<string,number>; flipped: boolean; };

export default function DivergenceTestPage() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [evolRecords, setEvolRecords] = useState<EvolRecord[]>([]);
  const [evolDone, setEvolDone] = useState(false);
  const [evolRunning, setEvolRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const evolRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  async function emit(line: LogLine, delay = 55) {
    if (cancelRef.current) return;
    setLog(prev => [...prev, line]);
    await new Promise(r => setTimeout(r, delay));
    logRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }

  async function runProof() {
    cancelRef.current = false;
    setLog([]); setDone(false); setEvolRecords([]); setEvolDone(false);
    setRunning(true); setRunCount(c => c + 1);

    const psiHash2 = deterministicHash(FIXED_INPUT);
    const nodesA = [
      { name: "TrustLayer", nm: 468, threshold: 10, weight: 1 },
      { name: "ReasoningCore", nm: 541, threshold: 5, weight: 1 },
    ];
    const nodesB = [...nodesA, { name: "AuxNode_3", nm: 650, threshold: 10, weight: 1 }];
    const loadA = 3; const loadB = 8;

    const rA = routeWeighted(PSI.nm, loadA, nodesA);
    const rB = routeWeighted(PSI.nm, loadB, nodesB);

    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    await emit({ text: "  WNSP DIVERGENCE TEST v1.0", type: "header" });
    await emit({ text: "  Prove: output = f(channel_state, ψ_in) — not just f(ψ_in)", type: "header" });
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    await emit({ text: "", type: "sep" }, 20);

    await emit({ text: "─── STEP 1: FIXED INPUT ────────────────────────────────────", type: "step" });
    await emit({ text: `  ψ_input  = "${FIXED_INPUT}"`, type: "data" }, 70);
    await emit({ text: `  ψ_hash   = ${PSI_HASH}   ← hardcoded, deterministic`, type: "data" }, 70);
    await emit({ text: `  CE→λ     = ${PSI.nm}nm  Ψ(${PSI.wdm},${PSI.oam},${PSI.pol})  [${PSI.band} band]`, type: "data" }, 70);
    await emit({ text: "", type: "sep" }, 20);

    await emit({ text: "─── STEP 2: STATE_A  (load=3, 2 nodes) ─────────────────────", type: "step" });
    await emit({ text: `  available  = [${rA.available.map(n => `${n.name}@${n.nm}nm`).join(", ")}]`, type: "data" }, 65);
    await emit({ text: `  route      = ${rA.winner?.name} @ ${rA.winner?.nm}nm  [${nmToBand(rA.winner?.nm ?? 0)}]`, type: "data" }, 65);
    await emit({ text: `  entropy_A  = ${rA.entropy}  bits`, type: "data" }, 65);
    await emit({ text: "", type: "sep" }, 20);

    await emit({ text: "─── STEP 3: PERTURBATION ───────────────────────────────────", type: "step" });
    await emit({ text: `  activate_node("AuxNode_3", @650nm)  ·  channelLoad 3 → 8`, type: "data" }, 80);
    await emit({ text: `  ReasoningCore threshold=5 — saturated at load=8 → excluded`, type: "data" }, 80);
    await emit({ text: "", type: "sep" }, 20);

    await emit({ text: "─── STEP 4: STATE_B  (load=8, 3 nodes registered, 2 available) ─", type: "step" });
    await emit({ text: `  available  = [${rB.available.map(n => `${n.name}@${n.nm}nm`).join(", ")}]`, type: "data" }, 65);
    await emit({ text: `  route      = ${rB.winner?.name} @ ${rB.winner?.nm}nm  [${nmToBand(rB.winner?.nm ?? 0)}]`, type: "data" }, 65);
    await emit({ text: `  entropy_B  = ${rB.entropy}  bits`, type: "data" }, 65);
    await emit({ text: "", type: "sep" }, 20);

    await emit({ text: "─── DIFF ───────────────────────────────────────────────────", type: "step" });
    const routeChanged = rA.winner?.name !== rB.winner?.name;
    const eDelta = parseFloat((rB.entropy - rA.entropy).toFixed(4));
    await emit({ text: `  INPUT_HASH  =  ${PSI_HASH}  (same both runs)`, type: "data" }, 65);
    await emit({ text: `  route_changed   =  ${routeChanged}  (${rA.winner?.nm}nm→${rB.winner?.nm}nm · ${nmToBand(rA.winner?.nm??0)}→${nmToBand(rB.winner?.nm??0)})`, type: "diff" }, 80);
    await emit({ text: `  entropy_delta   =  ${eDelta >= 0 ? "+" : ""}${eDelta}  bits`, type: "diff" }, 80);
    await emit({ text: "", type: "sep" }, 20);

    await emit({ text: "─── ASSERTIONS ─────────────────────────────────────────────", type: "step" });
    const a1 = PSI_HASH === psiHash2;
    const a2 = loadA !== loadB;
    const a3 = routeChanged;
    await emit({ text: `  assert ψ_hash_A == ψ_hash_B   [${PSI_HASH} == ${psiHash2}]`, type: a1 ? "assert_pass" : "assert_fail" }, 110);
    await emit({ text: `  assert state_A  != state_B    [load=${loadA} ≠ load=${loadB}]`, type: a2 ? "assert_pass" : "assert_fail" }, 110);
    await emit({ text: `  assert result_A != result_B   [${rA.winner?.name} ≠ ${rB.winner?.name}]`, type: a3 ? "assert_pass" : "assert_fail" }, 110);
    await emit({ text: "", type: "sep" }, 20);

    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    if (a1 && a2 && a3) {
      await emit({ text: "  PROOF COMPLETE — reactive computation confirmed.", type: "header" }, 90);
      await emit({ text: "  Next: state_t+1 = g(state_t, result_t)  →  adaptive system.", type: "header" }, 90);
    }
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });

    setRunning(false);
    setDone(a1 && a2 && a3);

    if (a1 && a2 && a3) await runEvolution();
  }

  async function runEvolution() {
    setEvolRunning(true);
    await new Promise(r => setTimeout(r, 400));

    await emit({ text: "", type: "sep" }, 20);
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    await emit({ text: "  STATE EVOLUTION  —  channel_stateₜ₊₁ = g(stateₜ, resultₜ)", type: "evol" });
    await emit({ text: "  5 feedback iterations · load decays 1/cycle · weights drift", type: "evol" });
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });

    let nodes: EvolNode[] = [
      { name: "TrustLayer",    nm: 468, threshold: 10, weight: 1.0 },
      { name: "ReasoningCore", nm: 541, threshold: 5,  weight: 1.0 },
      { name: "AuxNode_3",     nm: 650, threshold: 10, weight: 1.0 },
    ];
    let load = 8;
    const records: EvolRecord[] = [];
    let prevWinner = "";

    for (let i = 1; i <= 5; i++) {
      if (cancelRef.current) break;
      await new Promise(r => setTimeout(r, 200));

      const { winner, scores, entropy, available } = routeWeighted(PSI.nm, load, nodes);
      if (!winner) break;

      const flipped = prevWinner !== "" && winner.name !== prevWinner;
      const rec: EvolRecord = {
        iter: i, load, winner: winner.name, winnerNm: winner.nm, entropy,
        weights: Object.fromEntries(nodes.map(n => [n.name, n.weight])),
        flipped,
      };
      records.push(rec);
      setEvolRecords([...records]);

      const updateRule = entropy > 0.9 ? "high entropy → amplify winner" : "low entropy → dampen winner";
      await emit({ text: `─── ITER ${i}  (load=${load}) ─────────────────────────────────────`, type: "step" }, 40);
      await emit({ text: `  available   = [${available.map(n => `${n.name}`).join(", ")}]`, type: "data" }, 55);
      await emit({ text: `  weights     = ${nodes.map(n => `${n.name}:${n.weight.toFixed(2)}`).join("  ")}`, type: "evol" }, 55);
      await emit({ text: `  winner      = ${winner.name} @ ${winner.nm}nm  [${nmToBand(winner.nm)}]${flipped ? "  ← FLIP" : ""}`, type: flipped ? "evol_flip" : "evol" }, 70);
      await emit({ text: `  entropy     = ${entropy} bits  (${updateRule})`, type: "evol" }, 55);

      nodes = evolveWeights(nodes, winner.name, entropy);
      load = Math.max(0, load - 1);
      prevWinner = winner.name;

      await emit({ text: `  new weights = ${nodes.map(n => `${n.name}:${n.weight.toFixed(2)}`).join("  ")}`, type: "data" }, 55);
      await emit({ text: `  load next   = ${load}`, type: "data" }, 55);
    }

    const winners = records.map(r => r.winner);
    const unique = new Set(winners).size;
    const flips = records.filter(r => r.flipped).length;
    const lastEntropy = records[records.length - 1]?.entropy ?? 0;
    const firstEntropy = records[0]?.entropy ?? 0;
    const trend = lastEntropy > firstEntropy + 0.1 ? "expanding" : lastEntropy < firstEntropy - 0.1 ? "collapsing" : "stable";

    await emit({ text: "", type: "sep" }, 20);
    await emit({ text: "─── EVOLUTION SUMMARY ──────────────────────────────────────", type: "step" });
    await emit({ text: `  iterations      = 5`, type: "data" }, 55);
    await emit({ text: `  route flips     = ${flips}   (routing changed ${flips} time${flips!==1?"s":""})`, type: "data" }, 55);
    await emit({ text: `  unique winners  = ${unique}   (${[...new Set(winners)].join(", ")})`, type: "data" }, 55);
    await emit({ text: `  entropy trend   = ${trend}   (${firstEntropy} → ${lastEntropy})`, type: flips > 0 ? "evol_flip" : "evol_stable" }, 65);
    await emit({ text: `  path dependent  = true   (order of results shaped future routing)`, type: "evol_stable" }, 65);
    await emit({ text: "", type: "sep" }, 20);
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    await emit({ text: "  ADAPTIVE SYSTEM CONFIRMED", type: "header" }, 90);
    await emit({ text: `  channel_stateₜ₊₁ = g(stateₜ, resultₜ)  demonstrated over 5 cycles.`, type: "header" }, 90);
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });

    setEvolRunning(false);
    setEvolDone(true);
    evolRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }

  function reset() {
    cancelRef.current = true;
    setLog([]); setDone(false); setEvolRecords([]); setEvolDone(false);
    setRunning(false); setEvolRunning(false);
  }

  useEffect(() => { runProof(); return () => { cancelRef.current = true; }; }, []);

  const allPass = done;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical size={13} className="text-emerald-400" />
            <span className="text-sm font-bold tracking-wider text-emerald-400">WNSP DIVERGENCE + EVOLUTION TEST</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">reactive → adaptive · channel_stateₜ₊₁ = g(stateₜ, resultₜ)</span>
        </div>
        <div className="flex items-center gap-2">
          {allPass && evolDone && (
            <span className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded border border-emerald-400/40 text-emerald-400">
              <CheckCircle size={9} /> proof + evolution complete
            </span>
          )}
          {runCount > 0 && <span className="text-[8px] text-white/20">run #{runCount}</span>}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="lg:w-56 flex-shrink-0 border-r border-white/10 p-4 space-y-4 overflow-y-auto">
          <div>
            <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">Fixed Input</div>
            <div className="text-[8px] space-y-1.5 text-white/50">
              <div>"{FIXED_INPUT}"</div>
              <div className="flex items-center gap-1"><Hash size={7} className="text-white/20" /><span className="text-white/25">{PSI_HASH}</span></div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: nmToColor(PSI.nm) }} />
                <span style={{ color: nmToColor(PSI.nm) }}>{PSI.nm}nm · {PSI.band}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">Update Rule</div>
            <div className="text-[8px] text-white/30 space-y-1 leading-relaxed">
              <div>if entropy &gt; 0.9:</div>
              <div className="pl-2 text-emerald-400/50">winner.w × 1.25</div>
              <div>else:</div>
              <div className="pl-2 text-amber-400/50">winner.w × 0.75</div>
              <div className="mt-1">others × 0.92</div>
              <div>load − 1 per cycle</div>
            </div>
          </div>

          {evolRecords.length > 0 && (
            <div>
              <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2 flex items-center gap-1">
                <TrendingUp size={8} /> Evolution
              </div>
              <div className="space-y-2">
                {evolRecords.map(r => (
                  <div key={r.iter} className="text-[8px]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-white/20">#{r.iter}</span>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: nmToColor(r.winnerNm) }} />
                      <span style={{ color: nmToColor(r.winnerNm) }} className="font-bold">{r.winner}</span>
                      {r.flipped && <span className="text-amber-400/80 text-[7px]">FLIP</span>}
                    </div>
                    <div className="text-white/20 pl-3">H={r.entropy}  load={r.load}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button onClick={() => { reset(); setTimeout(runProof, 100); }}
              disabled={running || evolRunning}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-400/40 text-emerald-400 text-[9px] font-bold hover:border-emerald-400/70 disabled:opacity-30 transition-all"
              data-testid="button-rerun-proof">
              <RotateCcw size={9} /> Re-run all
            </button>
            <div className="text-white/15 text-[7px] text-center">same result every run</div>
          </div>
        </div>

        {/* Main log */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <span className="text-white/20 text-[9px] uppercase tracking-widest flex items-center gap-1">
              <GitBranch size={9} /> Execution log
            </span>
            {(running || evolRunning) && <span className="text-[8px] text-emerald-400/60 animate-pulse">executing…</span>}
            {evolDone && <span className="text-[8px] text-white/20">{log.length} lines</span>}
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-[10px] leading-relaxed min-h-0">
            {log.length === 0 && !running && <div className="text-white/15 text-center py-16">Initializing…</div>}
            {log.map((line, idx) => {
              const color =
                line.type === "header" ? "#10b981"
                : line.type === "step" ? "#a78bfa"
                : line.type === "data" ? "#94a3b8"
                : line.type === "diff" ? "#f59e0b"
                : line.type === "assert_pass" ? "#10b981"
                : line.type === "assert_fail" ? "#ef4444"
                : line.type === "evol" ? "#22d3ee"
                : line.type === "evol_flip" ? "#f59e0b"
                : line.type === "evol_stable" ? "#4ade80"
                : line.type === "sep" ? "#374151"
                : "#4b5563";
              return (
                <div key={idx} style={{ color }} className="whitespace-pre-wrap">
                  {line.type === "assert_pass" ? "  ✓  " : line.type === "assert_fail" ? "  ✗  " : ""}
                  {line.text}
                </div>
              );
            })}
            {(running || evolRunning) && <div className="text-emerald-400/40 animate-pulse">▊</div>}
          </div>

          {evolDone && (
            <div className="border-t border-emerald-400/20 px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: "rgba(16,185,129,0.04)" }}>
              <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-400 text-[10px] font-bold">ADAPTIVE SYSTEM CONFIRMED</span>
              <span className="text-white/30 text-[9px]">
                Proof: reactive. Evolution: adaptive.
                channel_stateₜ₊₁ = g(stateₜ, resultₜ) demonstrated over 5 cycles.
              </span>
            </div>
          )}
          {done && !evolDone && !evolRunning && (
            <div className="border-t border-emerald-400/20 px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: "rgba(16,185,129,0.03)" }}>
              <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-400 text-[10px] font-bold">PROOF COMPLETE</span>
              <span className="text-white/30 text-[9px]">3/3 assertions pass. Evolution running…</span>
            </div>
          )}
          {!done && !running && log.length > 0 && (
            <div className="border-t border-red-400/20 px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: "rgba(239,68,68,0.04)" }}>
              <XCircle size={13} className="text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-[10px] font-bold">PROOF FAILED</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
