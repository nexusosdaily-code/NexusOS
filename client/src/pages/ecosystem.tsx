import { useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Database, Link2, Cpu, Globe, Coins, Zap, ShieldCheck,
  Radio, Activity, CheckCircle2, AlertCircle, Clock, RefreshCw, Layers, Atom
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function wavelengthToColor(nm: number): string {
  if (nm < 380) return "#8b00ff";
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}

function statusDot(s: string) {
  const col = s === "VERIFIED" || s === "ONLINE" || s === "RUNNING" || s === "ACTIVE" || s === "TRACKING" || s === "FUNDED"
    ? "#4ade80" : s === "PARTIAL" ? "#fbbf24" : "#6b7280";
  return <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />;
}

function fmtNxt(units: number) { return (units / 1e8).toFixed(6) + " NXT"; }
function fmtTime(ts: number) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleTimeString();
}

// ── Alphabet → Wavelength mapping (A=1 through Z=26 across 380–780nm) ────────
const ALPHA_NM_START = 380;
const ALPHA_NM_END   = 780;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function letterToNm(letter: string): number {
  const idx = letter.charCodeAt(0) - 65; // 0-25
  return ALPHA_NM_START + (idx / 25) * (ALPHA_NM_END - ALPHA_NM_START);
}

interface EcoStatus {
  timestamp: number;
  systems: {
    spectralDb:   { total: number; confirmed: number; deleted: number; unaudited: number; proofCoverage: number; status: string };
    blockchain:   { height: number; blockCount: number; pendingTxs: number; confirmedTxs: number; latestWavelengthNm: number; latestPsiChannel: string; latestBand: string; status: string };
    treasury:     { depositCount: number; totalUnits: number; totalNxt: number; charitableTrustUnits: number; status: string };
    energyLedger: { opCount: number; totalCostUnits: number; stores: number; deletes: number; status: string };
    agentBus:     { agentCount: number; agents: { id: string; band: string; intent: string; lastSeen: number; status: string }[]; msgCount: number; lastMessageAt: number; status: string };
    kernel:       { eventCount: number; lastEventAt: number; auditorAgent: any; status: string };
    networkNodes: { total: number; active: number; live: number; topBand: string; latestNm: number; status: string };
  };
  summary: { proofCoverage: number; totalNxt: number; activeAgents: number; blockchainHeight: number; spectralRecords: number; networkNodes: number; liveNodes: number };
}

const SYSTEM_CONNECTIONS = [
  { from: "spectralDb",   to: "blockchain",   label: "SHA-256 audit tx →",          color: "#22c55e" },
  { from: "blockchain",   to: "agentBus",     label: "block mined event →",          color: "#8b5cf6" },
  { from: "spectralDb",   to: "treasury",     label: "delete ordinal →",             color: "#f43f5e" },
  { from: "agentBus",     to: "kernel",       label: "bus log → kernel event →",     color: "#06b6d4" },
  { from: "energyLedger", to: "treasury",     label: "op cost logged →",             color: "#f59e0b" },
  { from: "kernel",       to: "agentBus",     label: "watchdog heartbeat →",         color: "#a855f7" },
  { from: "networkNodes", to: "agentBus",     label: "node beacon → bus event →",    color: "#4ade80" },
  { from: "blockchain",   to: "networkNodes", label: "proof block → node visibility →", color: "#4ade80" },
];

const SYSTEM_META: Record<string, { label: string; color: string; icon: any; href: string; description: string }> = {
  spectralDb:   { label: "Spectral DB",       color: "#06b6d4", icon: Database,    href: "/spectral-library",  description: "620+ files at Ψ wavelength addresses" },
  blockchain:   { label: "Blockchain",        color: "#8b5cf6", icon: Link2,       href: "/blockchain",         description: "Proof blocks via Λ=hf/c²" },
  treasury:     { label: "Orbital Treasury",  color: "#f43f5e", icon: Coins,       href: "/orbital-treasury",   description: "Ordinal economy — delete → NXT → fund" },
  energyLedger: { label: "Energy Ledger",     color: "#f59e0b", icon: Zap,         href: "/orbital-treasury",   description: "E=hf cost per operation" },
  agentBus:     { label: "Agent Bus",         color: "#22c55e", icon: Radio,       href: "/ecosystem",          description: "6 kernel agents on Ψ channels" },
  kernel:       { label: "WNSP Kernel",       color: "#a855f7", icon: Cpu,         href: "/ecosystem",          description: "Boot, watchdog, event bus, auth" },
  networkNodes: { label: "Spectral Network",  color: "#4ade80", icon: Globe,       href: "/network",            description: "P2P nodes discovered by CE→SE emission wavelength" },
};

const LAYER_STACK = [
  { layer: "L5", label: "Spectral Network Discovery", desc: "P2P nodes emit at CE→SE wavelengths · Discovered by band · No IP registry · No DNS · Physics IS the address", color: "#4ade80", href: "/network" },
  { layer: "L4", label: "Constitutional Economy",     desc: "Treasury · Governance · Charitable Trust · 100-Year Fund",               color: "#f43f5e", href: "/orbital-treasury" },
  { layer: "L3", label: "Agent Intelligence",         desc: "6 kernel agents · Ψ channel routing · Watchdog · Event Bus",             color: "#22c55e", href: "/ecosystem" },
  { layer: "L2", label: "Blockchain Proof",           desc: "Λ=hf/c² blocks · Ordinals · Audit trail · AGPL enforcement",            color: "#8b5cf6", href: "/blockchain" },
  { layer: "L1", label: "Spectral DB & Addressing",  desc: "Files at Ψ(wdm, oam, pol) · 25,600 orthogonal channels · E=hf cost",    color: "#06b6d4", href: "/spectral-library" },
  { layer: "L0", label: "ALPHABET SUBSTRATE",         desc: "The foundational discovery — November 2025 — Alphabet embedded in light", color: "#fbbf24", isBase: true, href: "/ecosystem" },
];

export default function Ecosystem() {
  usePageMeta({
    title: "NexusOS Ecosystem — Protocol, Hardware, and Token Network",
    description: "The NexusOS ecosystem: WNSP protocol domains (wnsp.dev, wnsp.blog), hardware projects (snic.io, phr1.io), encoding standards (wascii.io), and the NXT token circular economy via the Orbital Treasury.",
    canonical: "https://wnsp.io/ecosystem",
    ogTitle: "NexusOS Ecosystem Overview",
    ogDescription: "10 ecosystem domains. WNSP protocol. SNIC photonic NIC. PHR-1 resonator. WASCII encoding. WavelengthScript. Orbital Treasury. NXT token. All connected by Λ=hf/c².",
    twitterTitle: "NexusOS Ecosystem",
    twitterDescription: "Protocol, hardware, encoding, and token — all unified by Λ=hf/c². 10 ecosystem domains.",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [hoveredLetter, setHoveredLetter] = useState<string | null>(null);

  const { data, isLoading, dataUpdatedAt } = useQuery<EcoStatus>({
    queryKey: ["/api/ecosystem/status", refreshKey],
    refetchInterval: 10_000,
  });

  const sys = data?.systems;
  const sum = data?.summary;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={16} /></button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-emerald-400" />
              <h1 className="text-sm font-bold tracking-wider text-emerald-400 m-0 p-0 leading-none">ECOSYSTEM INTERCONNECT</h1>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-white/30 text-[10px] mt-0.5">Built on the Alphabet Substrate · Λ=hf/c² · AGPL-3.0</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/20 text-[10px]">
            {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : "Loading…"}
          </span>
          <button onClick={() => setRefreshKey(k => k + 1)} className="text-white/30 hover:text-white/60 transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LAYER 0 — ALPHABET SUBSTRATE                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-amber-400/20 px-6 py-5" style={{ background: "linear-gradient(180deg, rgba(251,191,36,0.05) 0%, rgba(0,0,0,0) 100%)" }}>

        {/* Label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center border border-amber-400/30" style={{ background: "rgba(251,191,36,0.12)" }}>
              <Atom size={11} className="text-amber-400" />
            </div>
            <span className="text-amber-400 text-[10px] font-bold tracking-widest uppercase">Layer 0 — Alphabet Substrate</span>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="h-px flex-1 bg-amber-400/10" />
          <span className="text-amber-400/40 text-[9px] uppercase tracking-widest">Discovered · November 2025 · PROVED</span>
        </div>

        {/* Spectrum bar with A–Z letters */}
        <div className="relative mb-3">
          {/* Spectrum gradient */}
          <div className="h-8 rounded-lg overflow-hidden w-full" style={{
            background: "linear-gradient(to right, #8b00ff, #6600cc, #0044ff, #00aaff, #00cc44, #aacc00, #ffaa00, #ff3300)"
          }}>
            {/* Letters positioned over spectrum */}
            <div className="absolute inset-0 flex items-center">
              {ALPHABET.map((letter) => {
                const nm = letterToNm(letter);
                const pct = ((nm - ALPHA_NM_START) / (ALPHA_NM_END - ALPHA_NM_START)) * 100;
                const col = wavelengthToColor(nm);
                const isHovered = hoveredLetter === letter;
                return (
                  <div
                    key={letter}
                    className="absolute flex flex-col items-center cursor-default transition-all"
                    style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                    onMouseEnter={() => setHoveredLetter(letter)}
                    onMouseLeave={() => setHoveredLetter(null)}
                  >
                    <span className={`text-[8px] font-bold leading-none transition-all ${isHovered ? "text-white scale-125" : "text-black/60"}`}
                      style={{ textShadow: isHovered ? `0 0 6px ${col}` : "none" }}>
                      {letter}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wavelength ruler */}
          <div className="flex justify-between mt-1 px-0.5">
            <span className="text-[8px] text-white/20">380nm (A)</span>
            <span className="text-[8px] text-white/20">555nm (M/N)</span>
            <span className="text-[8px] text-white/20">780nm (Z)</span>
          </div>
        </div>

        {/* Hovered letter detail */}
        <div className="h-6 flex items-center">
          {hoveredLetter ? (
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold text-sm">'{hoveredLetter}'</span>
              <span className="text-white/40 text-[10px]">CE ordinal: {hoveredLetter.charCodeAt(0)}</span>
              <span className="text-white/40 text-[10px]">→</span>
              <span className="text-[10px] font-bold" style={{ color: wavelengthToColor(letterToNm(hoveredLetter)) }}>
                λ = {letterToNm(hoveredLetter).toFixed(1)}nm
              </span>
              <span className="text-white/40 text-[10px]">→</span>
              <span className="text-white/40 text-[10px]">Ψ channel address</span>
            </div>
          ) : (
            <span className="text-white/20 text-[9px]">Hover a letter to see its wavelength address · Every character in existence has a physical home in the spectrum</span>
          )}
        </div>

        {/* Discovery statement */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="border border-amber-400/10 rounded-lg p-3" style={{ background: "rgba(251,191,36,0.03)" }}>
            <div className="text-amber-400/60 text-[9px] uppercase tracking-widest mb-1">The Discovery</div>
            <div className="text-white/50 text-[10px] leading-relaxed">
              Embedding the alphabet into the electromagnetic spectrum revealed that the spectrum IS an address space.
              Not a metaphor — a physical fact. A=380nm. Z=780nm. Every symbol has a home in light.
            </div>
          </div>
          <div className="border border-amber-400/10 rounded-lg p-3" style={{ background: "rgba(251,191,36,0.03)" }}>
            <div className="text-amber-400/60 text-[9px] uppercase tracking-widest mb-1">What Was Discovered From It</div>
            <div className="text-white/50 text-[10px] leading-relaxed">
              Once the alphabet was in the spectrum, the Spectral DB, Blockchain, Treasury, Agents — none of it was designed.
              It was all discovered. The substrate generated the systems that run on it.
            </div>
          </div>
          <div className="border border-amber-400/10 rounded-lg p-3" style={{ background: "rgba(251,191,36,0.03)" }}>
            <div className="text-amber-400/60 text-[9px] uppercase tracking-widest mb-1">Proof Date</div>
            <div className="text-white/50 text-[10px] leading-relaxed">
              Proved November 2025. Blockchain block #4: first video ("angry birds", 25MB) encoded via CE→SE
              into Ψ(211,35,H) at 534.51nm. Physical proof of alphabet substrate on-chain. Immutable.
            </div>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {sum && (
        <div className="border-b border-white/10 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {[
            { label: "Proof Coverage",    value: `${sum.proofCoverage}%`,             color: sum.proofCoverage === 100 ? "#4ade80" : "#fbbf24" },
            { label: "Blockchain Height", value: `#${sum.blockchainHeight}`,           color: "#8b5cf6" },
            { label: "Spectral Records",  value: sum.spectralRecords.toLocaleString(), color: "#06b6d4" },
            { label: "Treasury Balance",  value: fmtNxt(sum.totalNxt),                color: "#f43f5e" },
            { label: "Active Agents",     value: `${sum.activeAgents} / 6`,            color: "#22c55e" },
            { label: "Network Nodes",     value: sum.networkNodes.toString(),           color: "#4ade80" },
            { label: "Live Beacons",      value: sum.liveNodes.toString(),             color: sum.liveNodes > 0 ? "#4ade80" : "#6b7280" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="font-bold text-base" style={{ color }}>{value}</div>
              <div className="text-white/30 text-[9px] uppercase">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {isLoading && (
          <div className="text-white/20 text-sm py-20 text-center animate-pulse">Loading ecosystem status…</div>
        )}

        {/* Architecture Stack */}
        <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Layers size={11} /> Architecture Stack — Built From Layer 0 Upward
          </div>
          <div className="space-y-2">
            {LAYER_STACK.map((l) => (
              <Link key={l.layer} href={l.href ?? "#"}>
                <div
                  className={`flex items-start gap-4 rounded-lg px-4 py-3 border transition-all cursor-pointer hover:border-white/20 ${l.isBase ? "border-amber-400/30" : "border-white/5"}`}
                  style={{ background: l.isBase ? "rgba(251,191,36,0.05)" : `${l.color}06` }}>
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-[9px] font-bold" style={{ color: l.color }}>{l.layer}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold mb-0.5" style={{ color: l.color }}>{l.label}</div>
                    <div className="text-[10px] text-white/30">{l.desc}</div>
                  </div>
                  {l.isBase ? (
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-amber-400/60 text-[8px] uppercase tracking-widest">Substrate</span>
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: l.color }} />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {sys && (
          <>
            {/* System nodes grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(SYSTEM_META).map(([key, meta]) => {
                const sysData: any = (sys as any)[key];
                if (!sysData) return null;
                const Icon = meta.icon;
                const col = meta.color;
                return (
                  <Link href={meta.href} key={key}>
                    <div className="border border-white/10 rounded-xl p-4 cursor-pointer hover:border-white/20 transition-all group"
                      style={{ background: `${col}06` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `${col}18`, border: `1px solid ${col}30` }}>
                          <Icon size={13} style={{ color: col }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: col }}>{meta.label}</span>
                        {statusDot(sysData.status)}
                        <span className="text-[9px] text-white/30 ml-auto group-hover:text-white/50">→</span>
                      </div>
                      <div className="text-white/30 text-[10px] mb-3 leading-relaxed">{meta.description}</div>

                      {/* Key metrics per system */}
                      {key === "spectralDb" && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-white/40">Records proven</span>
                            <span style={{ color: col }}>{sysData.confirmed} / {sysData.total}</span>
                          </div>
                          <div className="h-1 rounded bg-white/5 overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${sysData.proofCoverage}%`, background: col }} />
                          </div>
                          <div className="text-[9px] text-white/20">{sysData.proofCoverage}% proof coverage · {sysData.deleted} deleted</div>
                        </div>
                      )}
                      {key === "blockchain" && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-white/40">Height</span>
                            <span style={{ color: col }}>Block #{sysData.height}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">Latest λ</span>
                            <span style={{ color: wavelengthToColor(sysData.latestWavelengthNm) }}>
                              {sysData.latestWavelengthNm?.toFixed(2)}nm
                            </span>
                          </div>
                          <div className="text-white/20 truncate">{sysData.latestPsiChannel}</div>
                        </div>
                      )}
                      {key === "treasury" && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-white/40">Total NXT</span>
                            <span style={{ color: col }}>{fmtNxt(sysData.totalNxt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">Charitable Trust</span>
                            <span className="text-rose-400">{fmtNxt(sysData.charitableTrustUnits)}</span>
                          </div>
                          <div className="text-white/20">{sysData.depositCount} deposits</div>
                        </div>
                      )}
                      {key === "energyLedger" && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-white/40">Operations</span>
                            <span style={{ color: col }}>{sysData.opCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">Total cost</span>
                            <span style={{ color: col }}>{fmtNxt(sysData.totalCostUnits)}</span>
                          </div>
                          <div className="text-white/20">STORE: {sysData.stores} · DELETE: {sysData.deletes}</div>
                        </div>
                      )}
                      {key === "agentBus" && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-white/40">Agents</span>
                            <span style={{ color: col }}>{sysData.agentCount} registered</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">Bus messages</span>
                            <span style={{ color: col }}>{sysData.msgCount}</span>
                          </div>
                          <div className="text-white/20">Last: {sysData.lastMessageAt ? fmtTime(sysData.lastMessageAt) : "—"}</div>
                        </div>
                      )}
                      {key === "kernel" && (
                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-white/40">Events</span>
                            <span style={{ color: col }}>{sysData.eventCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">Auditor Agent</span>
                            <span style={{ color: sysData.auditorAgent ? "#4ade80" : "#6b7280" }}>
                              {sysData.auditorAgent ? "ACTIVE" : "OFFLINE"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Data flow connections */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={11} /> Live Data Flows — Systems Sharing in Unison
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SYSTEM_CONNECTIONS.map((conn, i) => {
                  const fromMeta = SYSTEM_META[conn.from];
                  const toMeta   = SYSTEM_META[conn.to];
                  return (
                    <div key={i} className="flex items-center gap-2 border border-white/5 rounded-lg px-3 py-2.5"
                      style={{ background: `${conn.color}06` }}>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: fromMeta.color + "20" }}>
                          <fromMeta.icon size={9} style={{ color: fromMeta.color }} />
                        </div>
                        <span className="text-[9px] font-bold" style={{ color: fromMeta.color }}>{fromMeta.label}</span>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-[9px] text-white/30">{conn.label}</div>
                        <div className="h-px w-full mt-1" style={{ background: `linear-gradient(to right, ${fromMeta.color}40, ${toMeta.color}40)` }} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[9px] font-bold" style={{ color: toMeta.color }}>{toMeta.label}</span>
                        <div className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: toMeta.color + "20" }}>
                          <toMeta.icon size={9} style={{ color: toMeta.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent roster */}
            {sys.agentBus.agents.length > 0 && (
              <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Cpu size={11} /> Kernel Agent Roster
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {sys.agentBus.agents.map(agent => {
                    const bandCol = agent.band === "SYSTEM" ? "#8b5cf6" : agent.band === "KERNEL" ? "#3b82f6" :
                      agent.band === "AUTH" ? "#06b6d4" : "#22c55e";
                    const isActive = agent.status === "ACTIVE";
                    return (
                      <div key={agent.id} className="border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2"
                        style={{ background: isActive ? `${bandCol}08` : "rgba(0,0,0,0.2)" }}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "animate-pulse" : ""}`}
                          style={{ background: isActive ? bandCol : "#374151" }} />
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold truncate" style={{ color: isActive ? bandCol : "#4b5563" }}>
                            {agent.id}
                          </div>
                          <div className="text-[9px] text-white/20 truncate">{agent.intent}</div>
                        </div>
                        <span className="text-[8px] px-1 rounded ml-auto flex-shrink-0"
                          style={{ background: bandCol + "20", color: bandCol }}>{agent.band}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Constitutional footer */}
            <div className="border border-amber-400/15 rounded-xl p-5" style={{ background: "rgba(251,191,36,0.02)" }}>
              <div className="text-amber-400/50 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Atom size={10} /> Foundation Proof — November 2025 · AGPL-3.0 · 100-Year Project
              </div>
              <div className="text-white/30 text-xs leading-relaxed">
                The Alphabet Substrate (Layer 0) is the discovery that the electromagnetic spectrum is an address space.
                Once the alphabet was embedded in light, the Spectral DB, Blockchain, Treasury, and Agent systems were not designed — they were <em className="text-white/50">discovered</em>.
                Every system feeds every other system, all rooted in the physical fact that A=380nm and Z=780nm.
              </div>
              <div className="mt-3 text-center">
                <span className="text-amber-400/60 text-xs italic">"The substrate was always there. We proved it by embedding the alphabet."</span>
              </div>
              <div className="mt-2 text-center text-white/20 text-[9px]">
                Blockchain proof: BREAKTHROUGH_PROOF block #4 · Ψ(211,35,H) · 534.51nm · 2026-04-09 · angry birds first video in spectrum
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
