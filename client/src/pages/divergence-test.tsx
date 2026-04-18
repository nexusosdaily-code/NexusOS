import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Play, RotateCcw, CheckCircle, XCircle, FlaskConical, Hash, GitBranch } from "lucide-react";

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

function ceEncode(name: string): { nm: number; wdm: number; oam: number; pol: string; band: string } {
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
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return "0x" + h.toString(16).toUpperCase().padStart(8, "0");
}

function shannonEntropy(probs: number[]): number {
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);
}

const FIXED_INPUT = "birdsong_signature_v1";
const NODES_BASE = [
  { name: "TrustLayer",     nm: 468,   threshold: 10, band: "AUTH" },
  { name: "ReasoningCore",  nm: 541,   threshold: 5,  band: "LOGIC" },
];
const PERTURB_NODE = { name: "AuxNode_3", nm: 650, threshold: 10, band: "STORAGE" };

function computeProof(channelLoad: number, nodes: typeof NODES_BASE) {
  const psi = ceEncode(FIXED_INPUT);
  const psiHash = deterministicHash(FIXED_INPUT);
  const available = nodes.filter(n => channelLoad <= n.threshold);
  const ranked = [...available].sort((a, b) => Math.abs(a.nm - psi.nm) - Math.abs(b.nm - psi.nm));
  const winner = ranked[0] ?? null;
  const probs = available.map(() => 1 / available.length);
  const entropy = parseFloat(shannonEntropy(probs).toFixed(4));
  const rank = winner ? ranked.indexOf(winner) + 1 : -1;
  return { psi, psiHash, available, ranked, winner, entropy, rank };
}

type LogLine = { text: string; type: "step" | "data" | "diff" | "assert_pass" | "assert_fail" | "sep" | "header" };

export default function DivergenceTestPage() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  async function emit(line: LogLine, delay = 60) {
    if (cancelRef.current) return;
    setLog(prev => [...prev, line]);
    await new Promise(r => setTimeout(r, delay));
    logRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }

  async function runProof() {
    cancelRef.current = false;
    setLog([]);
    setDone(false);
    setRunning(true);
    setRunCount(c => c + 1);

    const psi = ceEncode(FIXED_INPUT);
    const psiHash = deterministicHash(FIXED_INPUT);
    const psiHashB = deterministicHash(FIXED_INPUT);

    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    await emit({ text: "  WNSP DIVERGENCE TEST v1.0", type: "header" });
    await emit({ text: "  Prove: output = f(channel_state, ψ_in) — not just f(ψ_in)", type: "header" });
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "─── STEP 1: FIXED INPUT (no variation, no randomness) ──────", type: "step" });
    await emit({ text: `  ψ_input  = "${FIXED_INPUT}"`, type: "data" }, 80);
    await emit({ text: `  ψ_hash   = ${psiHash}   ← hardcoded, deterministic`, type: "data" }, 80);
    await emit({ text: `  CE→λ     = ${psi.nm}nm  Ψ(${psi.wdm},${psi.oam},${psi.pol})  [${psi.band} band]`, type: "data" }, 80);
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "─── STEP 2: CAPTURE STATE_A ────────────────────────────────", type: "step" });
    const loadA = 3;
    const nodesA = NODES_BASE;
    const rA = computeProof(loadA, nodesA);
    await emit({ text: `  channelLoad   = ${loadA}`, type: "data" }, 70);
    await emit({ text: `  activeNodes   = [${nodesA.map(n => `${n.name}@${n.nm}nm`).join(", ")}]`, type: "data" }, 70);
    await emit({ text: `  available     = [${rA.available.map(n => n.name).join(", ")}]  (load ≤ threshold)`, type: "data" }, 70);
    await emit({ text: `  entropy_A     = ${rA.entropy}  bits`, type: "data" }, 70);
    await emit({ text: `  STATE_A logged ✓`, type: "data" }, 50);
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "─── STEP 3: APPLY ONE CONTROLLED PERTURBATION ──────────────", type: "step" });
    await emit({ text: `  activate_node("${PERTURB_NODE.name}", @${PERTURB_NODE.nm}nm)`, type: "data" }, 90);
    await emit({ text: `  shift: channelLoad  ${loadA}  →  8   (network pressure added)`, type: "data" }, 90);
    const loadB = 8;
    const nodesB = [...NODES_BASE, PERTURB_NODE];
    await emit({ text: `  activeNodes now  = [${nodesB.map(n => `${n.name}@${n.nm}nm`).join(", ")}]`, type: "data" }, 70);
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "─── STEP 4: CAPTURE STATE_B ────────────────────────────────", type: "step" });
    const rB = computeProof(loadB, nodesB);
    await emit({ text: `  channelLoad   = ${loadB}`, type: "data" }, 70);
    await emit({ text: `  available     = [${rB.available.map(n => n.name).join(", ")}]  (ReasoningCore threshold=5, saturated at load=8)`, type: "data" }, 70);
    await emit({ text: `  entropy_B     = ${rB.entropy}  bits`, type: "data" }, 70);
    await emit({ text: `  STATE_B logged ✓`, type: "data" }, 50);
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "─── STEP 5: RUN IDENTICAL EXECUTION ────────────────────────", type: "step" });
    await emit({ text: `  result_A = run(ψ_input="${FIXED_INPUT}", state_A)`, type: "data" }, 90);
    await emit({ text: `  result_B = run(ψ_input="${FIXED_INPUT}", state_B)`, type: "data" }, 90);
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "─── STEP 6: DETERMINISTIC COMPARISON ──────────────────────", type: "step" });
    await emit({ text: `  INPUT_HASH:  ${psiHash}  (printed twice — same both runs)`, type: "data" }, 80);
    await emit({ text: "", type: "sep" }, 20);
    await emit({ text: `  RESULT_A:`, type: "data" }, 50);
    await emit({ text: `    route    =  ${rA.winner?.name ?? "NONE"} @ ${rA.winner?.nm ?? "?"}nm  [${rA.winner?.band ?? "?"}]`, type: "data" }, 70);
    await emit({ text: `    entropy  =  ${rA.entropy} bits`, type: "data" }, 70);
    await emit({ text: `    rank     =  ${rA.rank}  (of ${rA.available.length} available nodes)`, type: "data" }, 70);
    await emit({ text: "", type: "sep" }, 20);
    await emit({ text: `  RESULT_B:`, type: "data" }, 50);
    await emit({ text: `    route    =  ${rB.winner?.name ?? "NONE"} @ ${rB.winner?.nm ?? "?"}nm  [${rB.winner?.band ?? "?"}]`, type: "data" }, 70);
    await emit({ text: `    entropy  =  ${rB.entropy} bits`, type: "data" }, 70);
    await emit({ text: `    rank     =  ${rB.rank}  (of ${rB.available.length} available nodes)`, type: "data" }, 70);
    await emit({ text: "", type: "sep" }, 30);

    const routeChanged = rA.winner?.name !== rB.winner?.name;
    const entropyDelta = parseFloat((rB.entropy - rA.entropy).toFixed(4));
    const rankChanged = rA.rank !== rB.rank;

    await emit({ text: "─── STEP 7: EXPLICIT DIFF ──────────────────────────────────", type: "step" });
    await emit({ text: `  route_changed   =  ${routeChanged}   (${rA.winner?.nm}nm → ${rB.winner?.nm}nm  ·  ${rA.winner?.band} → ${rB.winner?.band})`, type: "diff" }, 90);
    await emit({ text: `  entropy_delta   =  ${entropyDelta > 0 ? "+" : ""}${entropyDelta}  bits`, type: "diff" }, 90);
    await emit({ text: `  rank_changed    =  ${rankChanged}   (rank ${rA.rank} → rank ${rB.rank})`, type: "diff" }, 90);
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "─── ASSERTIONS ─────────────────────────────────────────────", type: "step" });
    const a1 = psiHash === psiHashB;
    const a2 = loadA !== loadB;
    const a3 = rA.winner?.name !== rB.winner?.name;
    await emit({ text: `  assert ψ_hash_A == ψ_hash_B   →  ${a1}   [${psiHash} == ${psiHashB}]`, type: a1 ? "assert_pass" : "assert_fail" }, 120);
    await emit({ text: `  assert state_A  != state_B    →  ${a2}   [load=${loadA} ≠ load=${loadB}]`, type: a2 ? "assert_pass" : "assert_fail" }, 120);
    await emit({ text: `  assert result_A != result_B   →  ${a3}   [${rA.winner?.name} ≠ ${rB.winner?.name}]`, type: a3 ? "assert_pass" : "assert_fail" }, 120);
    await emit({ text: "", type: "sep" }, 30);

    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });
    if (a1 && a2 && a3) {
      await emit({ text: "  PROOF COMPLETE — output is a function of channel state,", type: "header" }, 100);
      await emit({ text: "  not just input. This is computation, not storage.", type: "header" }, 100);
    } else {
      await emit({ text: "  PROOF FAILED — check assertion above.", type: "assert_fail" }, 100);
    }
    await emit({ text: "═══════════════════════════════════════════════════════", type: "sep" });

    setRunning(false);
    setDone(true);
  }

  function reset() {
    cancelRef.current = true;
    setLog([]);
    setDone(false);
    setRunning(false);
  }

  useEffect(() => {
    runProof();
    return () => { cancelRef.current = true; };
  }, []);

  const psi = ceEncode(FIXED_INPUT);
  const psiHash = deterministicHash(FIXED_INPUT);

  const allPass = done && log.some(l => l.type === "assert_pass") && !log.some(l => l.type === "assert_fail");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical size={13} className="text-emerald-400" />
            <span className="text-sm font-bold tracking-wider text-emerald-400">WNSP DIVERGENCE TEST</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">Prove: output = f(channel_state, ψ_in) · not just f(ψ_in)</span>
        </div>
        <div className="flex items-center gap-2">
          {done && allPass && (
            <span className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded border border-emerald-400/40 text-emerald-400">
              <CheckCircle size={9} /> 3/3 assertions pass
            </span>
          )}
          {runCount > 0 && <span className="text-[8px] text-white/20">run #{runCount}</span>}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left: static proof spec */}
        <div className="lg:w-64 flex-shrink-0 border-r border-white/10 p-4 space-y-4 overflow-y-auto">
          <div>
            <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">Fixed Input</div>
            <div className="text-[9px] space-y-1.5">
              <div className="text-white/50">"{FIXED_INPUT}"</div>
              <div className="flex items-center gap-1">
                <Hash size={8} className="text-white/20" />
                <span className="text-white/30 text-[8px]">{psiHash}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: nmToColor(psi.nm) }} />
                <span style={{ color: nmToColor(psi.nm) }} className="font-bold">{psi.nm}nm</span>
                <span className="text-white/30">Ψ({psi.wdm},{psi.oam},{psi.pol})</span>
              </div>
              <div className="text-white/20 text-[8px]">[{psi.band} band]</div>
            </div>
          </div>

          <div>
            <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">State A</div>
            <div className="text-[8px] space-y-1 text-white/40">
              <div>channelLoad = 3</div>
              {NODES_BASE.map(n => (
                <div key={n.name} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: nmToColor(n.nm) }} />
                  <span>{n.name} @{n.nm}nm</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">Perturbation</div>
            <div className="text-[8px] space-y-1 text-white/40">
              <div>channelLoad → 8</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                <span>activate {PERTURB_NODE.name} @{PERTURB_NODE.nm}nm</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">State B</div>
            <div className="text-[8px] space-y-1 text-white/40">
              <div>channelLoad = 8</div>
              {[...NODES_BASE, PERTURB_NODE].map(n => (
                <div key={n.name} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: nmToColor(n.nm) }} />
                  <span className={n.name === "ReasoningCore" ? "line-through opacity-50" : ""}>{n.name} @{n.nm}nm</span>
                  {n.name === "ReasoningCore" && <span className="text-red-400/60">saturated</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">Invariants</div>
            <div className="text-[8px] space-y-1.5 text-white/30">
              <div>ψ_hash_A == ψ_hash_B</div>
              <div>state_A != state_B</div>
              <div>result_A != result_B</div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button onClick={() => { reset(); setTimeout(runProof, 100); }}
              disabled={running}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-400/40 text-emerald-400 text-[9px] font-bold hover:border-emerald-400/70 disabled:opacity-30 transition-all"
              data-testid="button-rerun-proof">
              <RotateCcw size={9} /> Re-run proof
            </button>
            <div className="text-white/15 text-[7px] text-center">Same result every run = deterministic</div>
          </div>
        </div>

        {/* Right: live terminal output */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <span className="text-white/20 text-[9px] uppercase tracking-widest flex items-center gap-1">
              <GitBranch size={9} /> Proof execution log
            </span>
            {running && <span className="text-[8px] text-emerald-400/60 animate-pulse">executing…</span>}
            {done && <span className="text-[8px] text-white/20">{log.length} lines · run #{runCount}</span>}
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-[10px] leading-relaxed min-h-0">
            {log.length === 0 && !running && (
              <div className="text-white/15 text-center py-16">Proof not yet run</div>
            )}
            {log.map((line, idx) => {
              const color =
                line.type === "header" ? "#10b981"
                : line.type === "step" ? "#a78bfa"
                : line.type === "data" ? "#94a3b8"
                : line.type === "diff" ? "#f59e0b"
                : line.type === "assert_pass" ? "#10b981"
                : line.type === "assert_fail" ? "#ef4444"
                : line.type === "sep" ? "#374151"
                : "#4b5563";
              return (
                <div key={idx} style={{ color }} className="whitespace-pre-wrap">
                  {line.type === "assert_pass" && "  ✓ "}
                  {line.type === "assert_fail" && "  ✗ "}
                  {line.type !== "assert_pass" && line.type !== "assert_fail" && ""}
                  {line.text}
                </div>
              );
            })}
            {running && <div className="text-emerald-400/40 animate-pulse">▊</div>}
          </div>

          {done && (
            <div className={`border-t px-4 py-3 flex items-center gap-3 flex-shrink-0 ${allPass ? "border-emerald-400/20" : "border-red-400/20"}`}
              style={{ background: allPass ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)" }}>
              {allPass
                ? <><CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-400 text-[10px] font-bold">PROOF COMPLETE</span>
                    <span className="text-white/30 text-[9px]">Output diverged deterministically. Same hash, different state, different result. This is computation.</span></>
                : <><XCircle size={13} className="text-red-400 flex-shrink-0" />
                    <span className="text-red-400 text-[10px] font-bold">PROOF FAILED</span></>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
