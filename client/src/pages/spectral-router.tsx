import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Radio, Zap, Send, Activity, Globe, Wifi, Brain, TrendingUp, TrendingDown, Minus, RotateCcw, ArrowRight, ArrowLeft as ArrowBack } from "lucide-react";

// ── physics helpers ───────────────────────────────────────────────────────────
function nmToColor(nm: number): string {
  if (nm < 450) return "#6600cc"; if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff"; if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00"; if (nm < 625) return "#ffaa00";
  return "#ff3300";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM"; if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM"; if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE"; if (nm < 625) return "EVENT";
  return "STORAGE";
}
function ceEncode(name: string, dir: 1 | -1 = 1): { nm: number; psi: string; psiDir: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  const dirLabel = dir === 1 ? "+k̂" : "−k̂";
  return {
    nm,
    psi: `Ψ(${wdm},${oam},${pol})`,
    psiDir: `Ψ(${wdm},${oam},${pol},${dirLabel})`,
    band: nmToBand(nm),
  };
}

// ── dynamical system functions (learned from analysis sessions) ───────────────
function shannonEntropy(scores: number[]): number {
  const total = scores.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const probs = scores.map(s => s / total);
  return parseFloat((-probs.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0)).toFixed(4));
}
function classifyAttractor(winners: string[]): { label: string; color: string } {
  if (winners.length < 6) return { label: "CALIBRATING", color: "#6b7280" };
  const last = winners.slice(-8);
  if (new Set(last).size === 1) return { label: "FIXED-POINT", color: "#10b981" };
  const l6 = winners.slice(-6);
  if (l6.every((w, i) => i < 2 || w === l6[i - 2]) && new Set(l6).size === 2)
    return { label: "LIMIT-CYCLE", color: "#22d3ee" };
  if (l6.every((w, i) => i < 3 || w === l6[i - 3])) return { label: "LIMIT-CYCLE", color: "#22d3ee" };
  return { label: "IRREGULAR", color: "#f59e0b" };
}
function instabilityScore(amp: number, decay: number) {
  return parseFloat((amp * (1 - decay)).toFixed(4));
}

// Hysteresis constants from analysis sessions
const E_HIGH = 0.92;  // amplify above this
const E_LOW  = 0.88;  // dampen below this
const AMP    = 1.25;
const DECAY  = 0.92;

interface Node {
  id: string; nodeKey: string; name: string; wavelengthNm: string;
  frequencyThz: string; psiChannel: string; emissionBand: string;
  status: string; endpoint?: string;
}
interface Hop {
  step: number; from: string; to: string; nm: number;
  psi: string; action: string; deltaLambda: number;
}
interface PacketLog {
  id: string; ts: string; destPsi: string; destPsiDir: string; destNm: number;
  payload: string; hops: Hop[]; delivered: boolean;
  finalNodeId?: string; finalNode?: string;
  entropy: number; fgRatio: number; winnerWeight: number;
  routingMode: "adaptive" | "static";
  direction: 1 | -1;
  dirLabel: string;
  dirSymbol: string;
}

// ── adaptive routing function ─────────────────────────────────────────────────
function routeAdaptive(
  destNm: number, destPsi: string, destPsiDir: string, payload: string,
  nodes: Node[], weights: Record<string, number>,
  direction: 1 | -1 = 1,
): { log: PacketLog; updatedWeights: Record<string, number> } {
  const active = nodes.filter(n => n.status === "active");
  const hops: Hop[] = [];
  let updatedWeights = { ...weights };
  const dirLabel  = direction === 1 ? "+k̂" : "−k̂";
  const dirSymbol = direction === 1 ? "→" : "←";

  hops.push({
    step: 0, from: "ORIGIN", to: "WNSP-ROUTER",
    nm: destNm, psi: destPsiDir,
    action: `Packet ${dirSymbol} ${destPsiDir} · λ=${destNm}nm · ${dirLabel} wave · adaptive routing`,
    deltaLambda: 0,
  });

  if (active.length === 0) {
    return {
      log: {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        ts: new Date().toISOString(),
        destPsi, destPsiDir, destNm, payload, hops,
        delivered: false, entropy: 0, fgRatio: 0, winnerWeight: 1,
        routingMode: "adaptive", direction, dirLabel, dirSymbol,
      },
      updatedWeights,
    };
  }

  // Score = weight / (Δλ + 1)  — same formula proven in analysis
  const scored = active.map(n => {
    const nm = parseFloat(n.wavelengthNm);
    const w = weights[n.id] ?? 1.0;
    return { node: n, nm, weight: w, score: w / (Math.abs(nm - destNm) + 1) };
  }).sort((a, b) => b.score - a.score);

  const entropy = shannonEntropy(scored.map(s => s.score));
  const winner = scored[0];
  const winnerNm = winner.nm;

  // Feedback/geometry ratio: (weight-1)/weight
  const fgRatio = parseFloat(Math.max(0, Math.min(1, (winner.weight - 1) / winner.weight)).toFixed(3));

  // Hysteresis update rule from analysis sessions
  const newWinnerWeight = entropy > E_HIGH
    ? Math.min(winner.weight * AMP, 5.0)          // amplify
    : entropy < E_LOW
      ? Math.max(winner.weight * (2 - AMP), 0.15) // dampen
      : winner.weight;                              // dead zone — no change

  updatedWeights = Object.fromEntries(
    scored.map(s => [
      s.node.id,
      s.node.id === winner.node.id
        ? parseFloat(newWinnerWeight.toFixed(3))
        : parseFloat(Math.max((weights[s.node.id] ?? 1.0) * DECAY, 0.15).toFixed(3)),
    ])
  );

  const weightDelta = newWinnerWeight - winner.weight;
  const weightTag = weightDelta > 0.001 ? ` ↑ weight ${winner.weight.toFixed(2)}→${newWinnerWeight.toFixed(2)}`
    : weightDelta < -0.001 ? ` ↓ weight ${winner.weight.toFixed(2)}→${newWinnerWeight.toFixed(2)}`
    : " [dead zone]";

  hops.push({
    step: 1, from: "WNSP-ROUTER", to: winner.node.name,
    nm: winnerNm, psi: winner.node.psiChannel,
    action: `Selected via adaptive score ${winner.score.toFixed(4)} · H=${entropy} · F/G=${fgRatio}${weightTag}`,
    deltaLambda: Math.abs(winnerNm - destNm),
  });

  if (scored.length > 1 && Math.abs(winnerNm - destNm) > 5) {
    const second = scored[1];
    hops.push({
      step: 2, from: winner.node.name, to: second.node.name,
      nm: second.nm, psi: second.node.psiChannel,
      action: `Re-emit via ${second.node.name} · score=${second.score.toFixed(4)} · Δλ=${Math.abs(second.nm - destNm).toFixed(2)}nm`,
      deltaLambda: Math.abs(second.nm - destNm),
    });
  }

  hops.push({
    step: hops.length, from: scored[scored.length > 1 ? 1 : 0].node.name, to: destPsiDir,
    nm: destNm, psi: destPsiDir,
    action: `Delivered ${dirSymbol} ${destPsiDir} · payload encoded at λ=${destNm}nm · ${dirLabel}`,
    deltaLambda: 0,
  });

  return {
    log: {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      ts: new Date().toISOString(),
      destPsi, destPsiDir, destNm, payload, hops, delivered: true,
      finalNodeId: winner.node.id, finalNode: winner.node.name,
      entropy, fgRatio, winnerWeight: newWinnerWeight,
      routingMode: "adaptive", direction, dirLabel, dirSymbol,
    },
    updatedWeights,
  };
}

// ── sparkline ─────────────────────────────────────────────────────────────────
function SparkLine({ vals, color }: { vals: number[]; color: string }) {
  if (vals.length < 2) return null;
  const W = 80; const H = 20;
  const min = Math.min(...vals); const max = Math.max(...vals); const range = max - min || 0.001;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function SpectralRouterPage() {
  const [destInput, setDestInput] = useState("ReasoningCore");
  const [payload, setPayload] = useState("Hello from the spectral network");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [logs, setLogs] = useState<PacketLog[]>([]);
  const [selected, setSelected] = useState<PacketLog | null>(null);

  // Adaptive state — persists across packets in this session
  const weightsRef = useRef<Record<string, number>>({});
  const winnerHistoryRef = useRef<string[]>([]);
  const [routeCount, setRouteCount] = useState(0);
  const [liveWeights, setLiveWeights] = useState<Record<string, number>>({});
  const [liveEntropy, setLiveEntropy] = useState<number[]>([]);

  const { data } = useQuery<{ nodes: Node[] }>({
    queryKey: ["/api/network/nodes"],
    queryFn: async () => { const r = await fetch("/api/network/nodes"); return r.json(); },
    refetchInterval: 8000,
  });
  const nodes = data?.nodes ?? [];

  const destEnc = destInput.trim() ? ceEncode(destInput, direction) : null;

  const sendPacket = useCallback(() => {
    if (!destEnc || !payload.trim()) return;
    const { log, updatedWeights } = routeAdaptive(destEnc.nm, destEnc.psi, destEnc.psiDir, payload, nodes, weightsRef.current, direction);
    weightsRef.current = updatedWeights;
    if (log.finalNode) winnerHistoryRef.current = [...winnerHistoryRef.current, log.finalNode].slice(-20);
    setLogs(prev => [log, ...prev].slice(0, 20));
    setSelected(log);
    setLiveWeights({ ...updatedWeights });
    setLiveEntropy(prev => [...prev, log.entropy].slice(-16));
    setRouteCount(c => c + 1);
  }, [destEnc, payload, nodes]);

  function resetLearning() {
    weightsRef.current = {};
    winnerHistoryRef.current = [];
    setLiveWeights({});
    setLiveEntropy([]);
    setRouteCount(0);
    setLogs([]);
    setSelected(null);
  }

  const attractor = classifyAttractor(winnerHistoryRef.current);
  const iScore = instabilityScore(AMP, DECAY);
  const lastEntropy = liveEntropy[liveEntropy.length - 1] ?? null;
  const entropySlope = liveEntropy.length > 3
    ? liveEntropy[liveEntropy.length - 1] - liveEntropy[0] > 0.01 ? "expanding"
    : liveEntropy[liveEntropy.length - 1] - liveEntropy[0] < -0.01 ? "collapsing" : "stable"
    : "—";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      {/* header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="sr-only">Spectral Routing Engine</h1>
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <Radio size={13} className="text-emerald-400" />
          <span className="text-sm font-bold tracking-wider text-emerald-400">SPECTRAL ROUTING ENGINE</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full border border-purple-400/40 text-purple-400">
            <Brain size={7} /> adaptive · learns from traffic
          </span>
        </div>
        <div className="flex items-center gap-3">
          {routeCount > 0 && (
            <span className="text-[8px]" style={{ color: attractor.color }}>{attractor.label}</span>
          )}
          <span className="text-white/20 text-[9px]">{nodes.filter(n => n.status === "active").length} nodes · {routeCount} packets routed</span>
          {routeCount > 0 && (
            <button onClick={resetLearning} className="flex items-center gap-1 text-[8px] text-white/20 hover:text-white/50 transition-colors" data-testid="button-reset-learning">
              <RotateCcw size={8} /> reset
            </button>
          )}
        </div>
      </div>

      {/* how it works */}
      <div className="border-b border-white/5 px-6 py-3 flex-shrink-0" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="grid grid-cols-4 gap-4 text-[8px]">
          {[
            { step: "1", label: "Address packet", desc: "Any word CE→SE encodes to λ and Ψ. No DNS." },
            { step: "2", label: "Adaptive score", desc: "weight / (Δλ+1) — combines geometry + learned weight." },
            { step: "3", label: "Hysteresis update", desc: "Winner weight evolves. H>0.92→amplify, H<0.88→dampen, else dead zone." },
            { step: "4", label: "Attractor emerges", desc: "Route history classifies network as Fixed-Point, Limit-Cycle, or Irregular." },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex items-start gap-2">
              <div className="w-3.5 h-3.5 rounded-full border border-emerald-400/30 text-emerald-400/60 text-[7px] flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
              <div>
                <div className="text-emerald-400/70 font-bold mb-0.5">{label}</div>
                <div className="text-white/25 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-5 gap-5">
          {/* Left: composer + node weights */}
          <div className="col-span-2 space-y-4">
            {/* Packet composer */}
            <div className="border border-emerald-400/20 rounded-xl p-4" style={{ background: "rgba(52,211,153,0.03)" }}>
              <div className="text-emerald-400/60 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Send size={9} /> Compose Spectral Packet
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-white/25 text-[8px] uppercase tracking-widest block mb-1">Destination (any word or name)</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none placeholder-white/20 focus:border-emerald-400/30"
                    placeholder="e.g. ReasoningCore, Alice, DataNode…"
                    value={destInput}
                    onChange={e => setDestInput(e.target.value)}
                    data-testid="input-dest"
                  />
                </div>
                {destEnc && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Ψ Channel", value: destEnc.psiDir, color: "#06b6d4" },
                      { label: "λ", value: `${destEnc.nm}nm`, color: nmToColor(destEnc.nm) },
                      { label: "Band", value: destEnc.band, color: nmToColor(destEnc.nm) },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="border border-white/5 rounded-lg px-2 py-1.5">
                        <div className="text-[6px] text-white/20">{label}</div>
                        <div className="text-[9px] font-bold truncate" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {destEnc && (
                  <div className="h-1 rounded-full" style={{ background: `linear-gradient(to right, ${nmToColor(destEnc.nm - 30)}, ${nmToColor(destEnc.nm)}, ${nmToColor(destEnc.nm + 30)})` }} />
                )}

                {/* ── Wave Direction Toggle ──────────────────────────────── */}
                <div>
                  <label className="text-white/25 text-[8px] uppercase tracking-widest block mb-1.5">
                    Wave Direction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDirection(1)}
                      data-testid="button-dir-forward"
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[9px] font-bold transition-all ${
                        direction === 1
                          ? "border-emerald-400/60 text-emerald-400 bg-emerald-400/10"
                          : "border-white/10 text-white/30 hover:border-white/20"
                      }`}
                    >
                      <ArrowRight size={9} /> +k̂ Forward
                    </button>
                    <button
                      onClick={() => setDirection(-1)}
                      data-testid="button-dir-backward"
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-[9px] font-bold transition-all ${
                        direction === -1
                          ? "border-orange-400/60 text-orange-400 bg-orange-400/10"
                          : "border-white/10 text-white/30 hover:border-white/20"
                      }`}
                    >
                      <ArrowBack size={9} /> −k̂ Backward
                    </button>
                  </div>
                  <div className="text-white/15 text-[7px] mt-1 leading-relaxed">
                    {direction === 1
                      ? "+k̂ primary send path · Maxwell forward propagation"
                      : "−k̂ phase-conjugate return · orthogonal to +k̂ · ⟨+k̂|−k̂⟩=0"}
                  </div>
                </div>

                <div>
                  <label className="text-white/25 text-[8px] uppercase tracking-widest block mb-1">Payload</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none placeholder-white/20 resize-none"
                    rows={2}
                    placeholder="Message payload…"
                    value={payload}
                    onChange={e => setPayload(e.target.value)}
                    data-testid="input-payload"
                  />
                </div>
                <button
                  onClick={sendPacket}
                  disabled={!destEnc || !payload.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border font-bold text-[10px] disabled:opacity-30 transition-all ${
                    direction === 1
                      ? "border-emerald-400/40 text-emerald-400 hover:border-emerald-400/70"
                      : "border-orange-400/40 text-orange-400 hover:border-orange-400/70"
                  }`}
                  data-testid="button-send-packet"
                >
                  {direction === 1
                    ? <><ArrowRight size={10} /> Transmit +k̂ Forward</>
                    : <><ArrowBack size={10} /> Transmit −k̂ Backward</>
                  }
                </button>
              </div>
            </div>

            {/* Network Dynamics Panel */}
            <div className="border border-purple-400/20 rounded-xl p-4 space-y-3" style={{ background: "rgba(192,132,252,0.03)" }}>
              <div className="text-purple-400/60 text-[9px] uppercase tracking-widest flex items-center gap-2">
                <Brain size={9} /> Network Dynamics
              </div>

              {/* Attractor + instability */}
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-white/5 rounded-lg p-2">
                  <div className="text-white/20 text-[7px] mb-1">Attractor</div>
                  <div className="text-[9px] font-bold" style={{ color: attractor.color }}>
                    {routeCount === 0 ? "—" : attractor.label}
                  </div>
                </div>
                <div className="border border-white/5 rounded-lg p-2">
                  <div className="text-white/20 text-[7px] mb-1">Instability Score</div>
                  <div className="text-[9px] font-bold text-white/50">{iScore}</div>
                  <div className="text-[6px] text-white/20">amp×(1−decay)</div>
                </div>
              </div>

              {/* Entropy trend */}
              <div className="border border-white/5 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-white/20 text-[7px]">Entropy H(t)</div>
                  {liveEntropy.length > 2 && (
                    <div className={`flex items-center gap-0.5 text-[7px] ${entropySlope === "expanding" ? "text-emerald-400" : entropySlope === "collapsing" ? "text-amber-400" : "text-white/30"}`}>
                      {entropySlope === "expanding" ? <TrendingUp size={7} /> : entropySlope === "collapsing" ? <TrendingDown size={7} /> : <Minus size={7} />}
                      {entropySlope}
                    </div>
                  )}
                </div>
                {liveEntropy.length > 1
                  ? <SparkLine vals={liveEntropy} color={entropySlope === "expanding" ? "#10b981" : entropySlope === "collapsing" ? "#f59e0b" : "#94a3b8"} />
                  : <div className="text-white/15 text-[7px]">{routeCount === 0 ? "send packets to observe" : "building…"}</div>
                }
                {lastEntropy !== null && <div className="text-white/20 text-[6px] mt-1">last H={lastEntropy}</div>}
              </div>

              {/* Node weight bars */}
              <div className="border border-white/5 rounded-lg p-2">
                <div className="text-white/20 text-[7px] mb-2">Learned Node Weights</div>
                {nodes.filter(n => n.status === "active").length === 0
                  ? <div className="text-white/15 text-[7px]">no active nodes</div>
                  : nodes.filter(n => n.status === "active").map(n => {
                    const w = liveWeights[n.id] ?? 1.0;
                    const nm = parseFloat(n.wavelengthNm);
                    const col = nmToColor(nm);
                    const pct = Math.min(100, (w / 5.0) * 100);
                    return (
                      <div key={n.id} className="mb-1.5">
                        <div className="flex items-center justify-between text-[7px] mb-0.5">
                          <span style={{ color: col }} className="truncate">{n.name}</span>
                          <span className="text-white/25 ml-1 flex-shrink-0">w={w.toFixed(2)}</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: col }} />
                        </div>
                      </div>
                    );
                  })
                }
                {routeCount > 0 && (
                  <div className="text-white/15 text-[6px] mt-1">
                    H&gt;{E_HIGH}→×{AMP} · H&lt;{E_LOW}→×{(2-AMP).toFixed(2)} · others×{DECAY}
                  </div>
                )}
              </div>
            </div>

            {/* Routing table */}
            <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 text-[8px] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Wifi size={8} /> Routing Table — {nodes.length} nodes
              </div>
              {nodes.length === 0 ? (
                <div className="text-white/15 text-[9px] text-center py-3">
                  No nodes registered. <Link href="/network"><span className="text-emerald-400/60 underline cursor-pointer">Register one</span></Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {nodes.map(n => {
                    const nm = parseFloat(n.wavelengthNm);
                    const col = nmToColor(nm);
                    const isActive = n.status === "active";
                    const w = liveWeights[n.id] ?? 1.0;
                    return (
                      <div key={n.id} className="flex items-center gap-2 border border-white/5 rounded-lg px-2 py-1" style={{ background: isActive ? col + "05" : "transparent" }}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "animate-pulse" : "opacity-30"}`} style={{ background: col }} />
                        <span className="text-[8px] font-bold flex-1 truncate" style={{ color: isActive ? col : "#6b7280" }}>{n.name}</span>
                        <span className="text-[7px] text-white/20 font-mono">{n.psiChannel}</span>
                        <span className="text-[7px] font-bold" style={{ color: col }}>{nm.toFixed(1)}nm</span>
                        {routeCount > 0 && <span className="text-[6px] text-purple-400/60">w={w.toFixed(2)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: packet trace + history */}
          <div className="col-span-3 space-y-4">
            {selected && (
              <div className="border border-emerald-400/20 rounded-xl p-4" style={{ background: "rgba(52,211,153,0.03)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-emerald-400/60 text-[9px] uppercase tracking-widest flex items-center gap-2">
                    <Activity size={9} /> Packet Trace — {selected.id}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full border font-bold ${
                      selected.direction === 1
                        ? "border-emerald-400/30 text-emerald-400"
                        : "border-orange-400/30 text-orange-400"
                    }`}>
                      {selected.dirLabel} {selected.dirSymbol}
                    </span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full border border-purple-400/30 text-purple-400">
                      H={selected.entropy} · F/G={selected.fgRatio}
                    </span>
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-bold ${selected.delivered ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                      {selected.delivered ? "DELIVERED" : "NO ROUTE"}
                    </span>
                    <span className="text-[7px] text-white/20">{selected.ts.slice(11, 19)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {selected.hops.map((hop, idx) => {
                    const col = nmToColor(hop.nm);
                    return (
                      <div key={idx}>
                        <div className="flex items-start gap-3 border border-white/5 rounded-lg px-3 py-2" style={{ background: col + "08" }}>
                          <div className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 text-[7px] font-bold" style={{ borderColor: col + "60", color: col }}>{hop.step}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[8px] font-bold" style={{ color: col }}>{hop.from}</span>
                              <span className="text-white/25 text-[7px]">→</span>
                              <span className="text-[8px] font-bold text-white/60">{hop.to}</span>
                            </div>
                            <div className="text-[7px] text-white/30">{hop.action}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[8px] font-bold" style={{ color: col }}>{hop.nm}nm</div>
                            {hop.deltaLambda > 0 && <div className="text-[6px] text-white/20">Δλ={hop.deltaLambda.toFixed(2)}nm</div>}
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: col }} />
                        </div>
                        {idx < selected.hops.length - 1 && <div className="ml-5 w-px h-1.5 bg-white/10" />}
                      </div>
                    );
                  })}
                </div>

                <div className="border border-white/8 rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-white/20 text-[7px] uppercase tracking-widest">Payload · λ={selected.destNm}nm</div>
                    <div className="text-[6px] font-mono" style={{ color: selected.direction === 1 ? "#34d399" : "#fb923c" }}>
                      {selected.destPsiDir}
                    </div>
                  </div>
                  <div className="text-emerald-300/60 text-[9px] font-mono">{selected.payload}</div>
                </div>
              </div>
            )}

            {/* History */}
            {logs.length > 0 && (
              <div className="border border-white/10 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-white/25 text-[8px] uppercase tracking-widest mb-2">Packet History</div>
                <div className="space-y-1">
                  {logs.map(log => {
                    const col = nmToColor(log.destNm);
                    const isForward = log.direction === 1;
                    return (
                      <button key={log.id} onClick={() => setSelected(log)}
                        className={`w-full flex items-center gap-2 border rounded-lg px-3 py-1.5 text-left transition-all ${selected?.id === log.id ? "border-emerald-400/30" : "border-white/5 hover:border-white/15"}`}
                        data-testid={`packet-${log.id}`}>
                        <span className={`text-[6px] px-1 py-0.5 rounded-full font-bold flex-shrink-0 ${log.delivered ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                          {log.delivered ? "OK" : "ERR"}
                        </span>
                        <span className={`text-[6px] px-1 py-0.5 rounded-full border font-bold flex-shrink-0 ${isForward ? "border-emerald-400/20 text-emerald-400/70" : "border-orange-400/20 text-orange-400/70"}`}>
                          {log.dirLabel}
                        </span>
                        <span className="text-[8px] font-mono text-white/30 flex-shrink-0">{log.id}</span>
                        <span className="text-[8px] font-bold flex-shrink-0" style={{ color: col }}>{log.destPsi}</span>
                        <span className="text-[8px] text-white/20 truncate flex-1">{log.payload}</span>
                        <span className="text-[7px] text-purple-400/50 flex-shrink-0">H={log.entropy}</span>
                        <span className="text-[7px] text-white/20 flex-shrink-0">{log.hops.length} hops</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {logs.length === 0 && (
              <div className="border border-white/5 rounded-xl p-12 text-center" style={{ background: "rgba(255,255,255,0.01)" }}>
                <Globe size={24} className="text-white/10 mx-auto mb-3" />
                <div className="text-white/20 text-sm font-bold mb-1">No packets yet</div>
                <div className="text-white/10 text-[10px] mb-3">Compose a packet and transmit. Each packet updates node weights — routing learns from traffic.</div>
                <div className="text-white/8 text-[9px]">score = weight / (Δλ + 1) · hysteresis: H&gt;{E_HIGH}→×{AMP} · H&lt;{E_LOW}→×{2-AMP} · others×{DECAY}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
