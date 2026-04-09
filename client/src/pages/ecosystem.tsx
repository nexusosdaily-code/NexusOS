import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Database, Link2, Cpu, Globe, Coins, Zap, ShieldCheck,
  Radio, Activity, CheckCircle2, AlertCircle, Clock, RefreshCw
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

interface EcoStatus {
  timestamp: number;
  systems: {
    spectralDb:   { total: number; confirmed: number; deleted: number; unaudited: number; proofCoverage: number; status: string };
    blockchain:   { height: number; blockCount: number; pendingTxs: number; confirmedTxs: number; latestWavelengthNm: number; latestPsiChannel: string; latestBand: string; status: string };
    treasury:     { depositCount: number; totalUnits: number; totalNxt: number; charitableTrustUnits: number; status: string };
    energyLedger: { opCount: number; totalCostUnits: number; stores: number; deletes: number; status: string };
    agentBus:     { agentCount: number; agents: { id: string; band: string; intent: string; lastSeen: number; status: string }[]; msgCount: number; lastMessageAt: number; status: string };
    kernel:       { eventCount: number; lastEventAt: number; auditorAgent: any; status: string };
  };
  summary: { proofCoverage: number; totalNxt: number; activeAgents: number; blockchainHeight: number; spectralRecords: number };
}

const SYSTEM_CONNECTIONS = [
  { from: "spectralDb",   to: "blockchain",   label: "SHA-256 audit tx →",     color: "#22c55e" },
  { from: "blockchain",   to: "agentBus",     label: "block mined event →",     color: "#8b5cf6" },
  { from: "spectralDb",   to: "treasury",     label: "delete ordinal →",        color: "#f43f5e" },
  { from: "agentBus",     to: "kernel",       label: "bus log → kernel event →", color: "#06b6d4" },
  { from: "energyLedger", to: "treasury",     label: "op cost logged →",        color: "#f59e0b" },
  { from: "kernel",       to: "agentBus",     label: "watchdog heartbeat →",    color: "#a855f7" },
];

const SYSTEM_META: Record<string, { label: string; color: string; icon: any; href: string; description: string }> = {
  spectralDb:   { label: "Spectral DB",      color: "#06b6d4", icon: Database,    href: "/spectral-library",  description: "620+ files at Ψ wavelength addresses" },
  blockchain:   { label: "Blockchain",       color: "#8b5cf6", icon: Link2,       href: "/blockchain",         description: "Proof blocks via Λ=hf/c²" },
  treasury:     { label: "Orbital Treasury", color: "#f43f5e", icon: Coins,       href: "/orbital-treasury",   description: "Ordinal economy — delete → NXT → fund" },
  energyLedger: { label: "Energy Ledger",    color: "#f59e0b", icon: Zap,         href: "/orbital-treasury",   description: "E=hf cost per operation" },
  agentBus:     { label: "Agent Bus",        color: "#22c55e", icon: Radio,       href: "/agent-bus",          description: "6 kernel agents on Ψ channels" },
  kernel:       { label: "WNSP Kernel",      color: "#a855f7", icon: Cpu,         href: "/kernel",             description: "Boot, watchdog, event bus, auth" },
};

export default function Ecosystem() {
  const [refreshKey, setRefreshKey] = useState(0);

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
              <span className="text-sm font-bold tracking-wider text-emerald-400">ECOSYSTEM INTERCONNECT</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-white/30 text-[10px] mt-0.5">All systems sharing data in unison · Λ=hf/c² · AGPL-3.0</div>
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

      {/* Summary bar */}
      {sum && (
        <div className="border-b border-white/10 px-6 py-3 grid grid-cols-5 gap-4">
          {[
            { label: "Proof Coverage",    value: `${sum.proofCoverage}%`,             color: sum.proofCoverage === 100 ? "#4ade80" : "#fbbf24" },
            { label: "Blockchain Height", value: `#${sum.blockchainHeight}`,           color: "#8b5cf6" },
            { label: "Spectral Records",  value: sum.spectralRecords.toLocaleString(), color: "#06b6d4" },
            { label: "Treasury Balance",  value: fmtNxt(sum.totalNxt),                color: "#f43f5e" },
            { label: "Active Agents",     value: `${sum.activeAgents} / 6`,            color: "#22c55e" },
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
                            <span style={{ color: col }}>{fmtNxt(sysData.totalUnits)}</span>
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
            <div className="border border-amber-400/15 rounded-xl p-5 text-center" style={{ background: "rgba(251,191,36,0.02)" }}>
              <div className="text-amber-400/50 text-[10px] uppercase tracking-widest mb-2">
                AGPL-3.0 · 100-Year Project · Kardashev Type I Infrastructure
              </div>
              <div className="text-white/30 text-xs leading-relaxed">
                Every system feeds every other system. Spectral DB proves on blockchain. Blockchain auditor logs to Agent Bus.
                Deletions fund the Treasury. Treasury funds the Charitable Trust. The kernel watches everything.
                <br /><span className="text-amber-400/60 mt-2 block">"We prove our work to the people willingly."</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
