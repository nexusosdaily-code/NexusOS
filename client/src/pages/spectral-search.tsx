import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Search, Zap, Radio, FileText, User, Globe, Activity } from "lucide-react";

function nmToColor(nm: number): string {
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
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
const H_PLANCK = 6.626e-34, C = 3e8;
function calcEnergy(nm: number) {
  const lambda = nm * 1e-9;
  const f = C / lambda;
  const eJ = H_PLANCK * f;
  const eV = eJ / 1.602e-19;
  return { f: (f / 1e12).toFixed(3), eJ: eJ.toExponential(3), eV: eV.toFixed(3) };
}

function shannonEntropy(text: string): { H: number; Hnorm: number; coherence: number; occupiedBins: number } {
  const chars = text.toUpperCase().split("").filter(c => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });
  if (chars.length === 0) return { H: 0, Hnorm: 0, coherence: 1, occupiedBins: 0 };

  const bins: Record<number, number> = {};
  chars.forEach(c => {
    const code = c.charCodeAt(0);
    const wdm = Math.floor(((code - 32) / 94) * 255);
    bins[wdm] = (bins[wdm] || 0) + 1;
  });

  const total = chars.length;
  const probs = Object.values(bins).map(count => count / total);
  const H = -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
  const occupied = Object.keys(bins).length;
  const maxH = occupied > 1 ? Math.log2(occupied) : 1;
  const Hnorm = maxH > 0 ? H / maxH : 0;
  return { H: parseFloat(H.toFixed(4)), Hnorm: parseFloat(Hnorm.toFixed(4)), coherence: parseFloat((1 - Hnorm).toFixed(4)), occupiedBins: occupied };
}

interface SearchResult {
  id: string;
  type: "node" | "user" | "document" | "channel" | "agent";
  title: string;
  subtitle: string;
  nm: number;
  psi: string;
  band: string;
  delta: number;
  proximityScore: number;
  coherenceScore: number;
  compositeScore: number;
  entropy: number;
  extra?: string;
}

interface Node {
  id: string; name: string; wavelengthNm: string; psiChannel: string; emissionBand: string; status: string;
}
interface UserNode {
  id: number; username: string; spectralNm: number; spectralWdm: number; spectralOam: number; spectralPol: string;
}

const STATIC_CHANNELS: Omit<SearchResult, "delta" | "proximityScore" | "coherenceScore" | "compositeScore" | "entropy">[] = [
  { id: "ch1", type: "channel", title: "NexusOS Kernel", subtitle: "WNSP AI OS — 6-phase boot · all agents ACTIVE", nm: 468, psi: "Ψ(22,45,H)", band: "AUTH", extra: "KERNEL band" },
  { id: "ch2", type: "channel", title: "Blockchain Ledger", subtitle: "Spectral blockchain · 10 confirmed blocks", nm: 648, psi: "Ψ(67,23,V)", band: "STORAGE", extra: "immutable" },
  { id: "ch3", type: "channel", title: "Governance Registry", subtitle: "On-chain protocol governance · live proposals", nm: 495, psi: "Ψ(28,17,H)", band: "STREAM", extra: "KERNEL+ only" },
  { id: "ch4", type: "document", title: "WNSP Two-Layer Encoding Standard", subtitle: "CE v1.0 + SE v1.0 · WASCII v2.0 character mapping", nm: 520, psi: "Ψ(35,0,V)", band: "STREAM", extra: "AGPL-3.0" },
  { id: "ch5", type: "document", title: "Compression State Theory", subtitle: "First unobserved oscillation · Λ=hf/c² derivation", nm: 420, psi: "Ψ(10,7,V)", band: "SYSTEM", extra: "fundamental" },
  { id: "ch6", type: "agent", title: "ReasoningCore", subtitle: "AI reasoning agent · spectral inference pipeline", nm: 541, psi: "Ψ(41,12,V)", band: "LOGIC", extra: "ACTIVE" },
  { id: "ch7", type: "agent", title: "StreamParser", subtitle: "P2P chunk engine · WebRTC mesh node", nm: 502, psi: "Ψ(31,17,V)", band: "STREAM", extra: "ACTIVE" },
  { id: "ch8", type: "agent", title: "TrustLayer", subtitle: "Auth · wallet · spectral identity verification", nm: 468, psi: "Ψ(22,83,V)", band: "AUTH", extra: "ACTIVE" },
];

function rankResults(queryNm: number, raw: Omit<SearchResult, "delta" | "proximityScore" | "coherenceScore" | "compositeScore" | "entropy">[]): SearchResult[] {
  return raw
    .map(r => {
      const delta = Math.abs(r.nm - queryNm);
      const proximityScore = 1 / (1 + delta / 100);
      const { coherence, H } = shannonEntropy(r.title);
      const compositeScore = 0.7 * proximityScore + 0.3 * coherence;
      return { ...r, delta, proximityScore, coherenceScore: coherence, compositeScore, entropy: H };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  node: <Radio size={10} />,
  user: <User size={10} />,
  document: <FileText size={10} />,
  channel: <Globe size={10} />,
  agent: <Activity size={10} />,
};
const TYPE_COLORS: Record<string, string> = {
  node: "#06b6d4", user: "#a78bfa", document: "#f59e0b", channel: "#16a34a", agent: "#0ea5e9",
};

export default function SpectralSearchPage() {
  const initialQuery = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("q") ?? ""
    : "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const { data: nodesData } = useQuery<{ nodes: Node[] }>({
    queryKey: ["/api/network/nodes"],
    queryFn: async () => { const r = await fetch("/api/network/nodes"); return r.json(); },
  });
  const { data: usersData } = useQuery<{ users: UserNode[] }>({
    queryKey: ["/api/directory"],
    queryFn: async () => { const r = await fetch("/api/directory"); return r.json(); },
  });

  const enc = query.trim() ? ceEncode(query) : null;
  const energy = enc ? calcEnergy(enc.nm) : null;
  const queryEntropy = query.trim() ? shannonEntropy(query) : null;

  useEffect(() => {
    if (!query.trim() || !enc) { setResults([]); setSearched(false); return; }
    const qNm = enc.nm;
    const all: Omit<SearchResult, "delta" | "proximityScore" | "coherenceScore" | "compositeScore" | "entropy">[] = [...STATIC_CHANNELS];

    (nodesData?.nodes ?? []).forEach(n => {
      const nm = parseFloat(n.wavelengthNm);
      all.push({
        id: `node-${n.id}`, type: "node", title: n.name,
        subtitle: `Spectral node · ${n.psiChannel} · ${n.status}`,
        nm, psi: n.psiChannel, band: n.emissionBand ?? nmToBand(nm),
        extra: n.status === "active" ? "ACTIVE" : "OFFLINE",
      });
    });
    (usersData?.users ?? []).forEach((u: any) => {
      const nm = u.spectralNm ?? 540;
      all.push({
        id: `user-${u.id}`, type: "user", title: u.username,
        subtitle: `User · Ψ(${u.spectralWdm ?? 0},${u.spectralOam ?? 0},${u.spectralPol ?? "H"}) · λ=${nm}nm`,
        nm, psi: `Ψ(${u.spectralWdm ?? 0},${u.spectralOam ?? 0},${u.spectralPol ?? "H"})`, band: nmToBand(nm),
      });
    });

    const ranked = rankResults(qNm, all);
    setResults(ranked);
    setSearched(true);
  }, [query, nodesData, usersData]);

  const spectralBar = enc ? (
    <div className="relative h-5 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #6600cc,#0044ff,#00aaff,#00cc44,#aacc00,#ffaa00,#ff3300)" }}>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg"
        style={{ left: `${Math.min(100, Math.max(0, (enc.nm - 380) / 400 * 100))}%` }} />
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <h1 className="sr-only">Spectral Search</h1>
        <Link href="/nexus-command" aria-label="Back to Nexus Command" className="text-white/30 hover:text-white/60 transition-colors inline-flex"><ArrowLeft size={15} /><span className="sr-only">Back to Nexus Command</span></Link>
        <div className="flex items-center gap-2">
          <Search size={13} className="text-amber-400" />
          <span className="text-sm font-bold tracking-wider text-amber-400">SPECTRAL SEARCH</span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <span className="text-white/20 text-[10px]">Ranked by EM proximity + Shannon channel coherence · H = −Σpᵢlog₂pᵢ</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              className="w-full bg-white/5 border border-white/15 rounded-xl pl-11 pr-4 py-4 text-base text-white outline-none placeholder-white/20 focus:border-amber-400/30 transition-colors"
              placeholder="Search nodes, agents, documents, users…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              data-testid="input-search"
            />
          </div>

          {enc && queryEntropy && (
            <div className="space-y-2">
              {spectralBar}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "Query wavelength", value: `${enc.nm}nm`, color: nmToColor(enc.nm) },
                  { label: "Ψ channel", value: enc.psi, color: "#06b6d4" },
                  { label: "Band", value: enc.band, color: nmToColor(enc.nm) },
                  { label: "Frequency", value: `${energy?.f}THz`, color: "#a78bfa" },
                  { label: "E=hf", value: `${energy?.eJ}J`, color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="border border-white/5 rounded-lg px-2 py-1.5" style={{ background: color + "08" }}>
                    <div className="text-[7px] text-white/20">{label}</div>
                    <div className="text-[9px] font-bold" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Shannon entropy readout for the query */}
              <div className="border border-amber-400/10 rounded-lg px-4 py-3 flex items-center gap-6" style={{ background: "rgba(251,191,36,0.03)" }}>
                <div>
                  <div className="text-[7px] text-white/20 mb-0.5">H = −Σpᵢlog₂pᵢ</div>
                  <div className="text-[11px] font-bold text-amber-400">{queryEntropy.H.toFixed(3)} bits</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/20 mb-0.5">Channel coherence</div>
                  <div className="text-[11px] font-bold" style={{ color: queryEntropy.coherence > 0.6 ? "#22c55e" : queryEntropy.coherence > 0.35 ? "#f59e0b" : "#ef4444" }}>
                    {(queryEntropy.coherence * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-[7px] text-white/20 mb-0.5">Occupied WDM bins</div>
                  <div className="text-[11px] font-bold text-white/50">{queryEntropy.occupiedBins}</div>
                </div>
                <div className="flex-1">
                  <div className="text-[7px] text-white/20 mb-1.5">Spectral focus</div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${queryEntropy.coherence * 100}%`, background: queryEntropy.coherence > 0.6 ? "#22c55e" : queryEntropy.coherence > 0.35 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[7px] text-white/15">Low entropy = narrow spectral focus</div>
                  <div className="text-[7px] text-white/15">High entropy = scattered across bands</div>
                </div>
              </div>

              <div className="text-white/20 text-[9px]">
                Ranking {results.length} results · composite score = 0.7 × Δλ proximity + 0.3 × channel coherence (1−H_norm)
              </div>
            </div>
          )}
        </div>

        {searched && results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, idx) => {
              const col = nmToColor(r.nm);
              const typeCol = TYPE_COLORS[r.type] ?? "#6b7280";
              const proximityPct = Math.max(0, 100 - r.delta / 4);
              const coherencePct = r.coherenceScore * 100;
              const compositePct = r.compositeScore * 100;
              return (
                <div key={r.id}
                  className="border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all"
                  style={{ background: col + "04" }}
                  data-testid={`result-${r.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5" style={{ borderColor: typeCol + "40", color: typeCol, background: typeCol + "12" }}>
                      {TYPE_ICONS[r.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-white/80 font-bold">{r.title}</span>
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: typeCol + "40", color: typeCol }}>{r.type}</span>
                        {r.extra && <span className="text-[7px] text-white/25">{r.extra}</span>}
                      </div>
                      <div className="text-[9px] text-white/30 mb-2">{r.subtitle}</div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: col }} />
                          <span className="text-[8px] font-bold" style={{ color: col }}>{r.nm}nm</span>
                        </div>
                        <span className="text-[8px] text-white/25">{r.psi}</span>
                        <span className="text-[8px] text-white/20">[{r.band}]</span>
                        {enc && <span className="text-[8px] text-white/20">Δλ={r.delta.toFixed(1)}nm</span>}
                        <span className="text-[7px] text-white/15">H={r.entropy.toFixed(3)}b</span>
                        <span className="text-[7px] text-white/15">coherence={(r.coherenceScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1.5">
                      <div>
                        <div className="text-[7px] text-white/15 mb-0.5">EM proximity</div>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${proximityPct}%`, background: col }} />
                          </div>
                          <span className="text-[7px] text-white/30">{proximityPct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white/15 mb-0.5">Channel coherence</div>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${coherencePct}%`, background: "#22c55e" }} />
                          </div>
                          <span className="text-[7px] text-white/30">{coherencePct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white/15 mb-0.5">Composite score</div>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${compositePct}%`, background: "#f59e0b" }} />
                          </div>
                          <span className="text-[8px] font-bold text-amber-400">#{idx + 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {searched && results.length === 0 && (
          <div className="text-center py-12">
            <Search size={28} className="text-white/10 mx-auto mb-3" />
            <div className="text-white/20 text-sm">No results found in the spectral address space</div>
          </div>
        )}

        {!query && (
          <div className="space-y-4">
            <div className="text-white/15 text-[10px] uppercase tracking-widest">How spectral search works</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: <Zap size={14} />,
                  title: "CE→SE Encoding",
                  desc: "Your query is CE-encoded to a wavelength. Every word has a unique λ on the visible spectrum.",
                },
                {
                  icon: <Activity size={14} />,
                  title: "Shannon Entropy — H = −Σpᵢlog₂pᵢ",
                  desc: "Each character maps to a WDM bin. Entropy measures how scattered vs focused the query is across the spectrum. Low H = high channel coherence = specialized term.",
                },
                {
                  icon: <Search size={14} />,
                  title: "Composite Ranking",
                  desc: "Score = 0.7 × EM proximity + 0.3 × channel coherence. Results closest in wavelength AND most spectrally focused rank first.",
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="border border-white/8 rounded-xl p-4">
                  <div className="text-amber-400/50 mb-2">{icon}</div>
                  <div className="text-white/50 text-[11px] font-bold mb-1">{title}</div>
                  <div className="text-white/20 text-[9px] leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
            <div className="border border-white/5 rounded-xl px-5 py-3 text-center" style={{ background: "rgba(251,191,36,0.02)" }}>
              <span className="text-amber-400/40 text-[9px] font-bold tracking-widest">H = −Σ pᵢ log₂ pᵢ</span>
              <span className="text-white/15 text-[9px] ml-4">Shannon 1948 · applied to WDM bin probability distributions over query character sets</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
