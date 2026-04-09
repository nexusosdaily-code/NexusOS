import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Zap, RefreshCw, Database, Upload, Trash2, Radio, Code2, MessageSquare, Tv, Phone, Download, ArrowRight } from "lucide-react";

interface RegistryEntry {
  operation: string; trigger: string; energyFactor: number;
  example555thz: string; color: string; group: string; note?: string;
  formula: string; constitutionalBasis: string;
  liveStats: { count: number; totalUnits: number; totalNxt: number };
}
interface RegistryData {
  version: string; constitutionalClause: string; ordinalFormula: string;
  energyCostFormula: string; totalTreasuryDeposits: number;
  registry: RegistryEntry[];
  recentDeposits: any[];
}

const OP_ICONS: Record<string, any> = {
  STORE: Database, UPLOAD: Upload, DELETE: Trash2, TRANSMIT: Radio,
  ENCODE: Code2, MESSAGE: MessageSquare, BROADCAST: Tv, CALL: Phone, RETRIEVE: Download,
};

const GROUP_LABELS: Record<string, string> = {
  data: "Data Layer", media: "Media Layer", comms: "Communications Layer", compute: "Compute Layer",
};

function fmtUnits(u: number) {
  if (u >= 1e8) return (u / 1e8).toFixed(4) + " NXT";
  if (u >= 1e6) return (u / 1e6).toFixed(2) + "M units";
  if (u >= 1e3) return (u / 1e3).toFixed(1) + "K units";
  return u + " units";
}

function fmtTime(ts: string) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString();
}

export default function OrdinalRegistry() {
  const { data, isLoading, dataUpdatedAt, refetch } = useQuery<RegistryData>({
    queryKey: ["/api/ordinals/registry"],
    refetchInterval: 15_000,
  });

  const grouped = data?.registry ? Object.entries(
    data.registry.reduce((acc, e) => {
      if (!acc[e.group]) acc[e.group] = [];
      acc[e.group].push(e);
      return acc;
    }, {} as Record<string, RegistryEntry[]>)
  ) : [];

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60"><ArrowLeft size={16} /></button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-amber-400" />
              <span className="text-sm font-bold tracking-wider text-amber-400">ORDINAL INPUT REGISTRY</span>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <div className="text-white/30 text-[10px] mt-0.5">Every communication input subject to ordinals — formally defined · Λ=hf/c²</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="text-center">
              <div className="text-amber-400 font-bold text-sm">{fmtUnits(data.totalTreasuryDeposits)}</div>
              <div className="text-white/20 text-[9px]">total treasury</div>
            </div>
          )}
          <button onClick={() => refetch()} className="text-white/30 hover:text-white/60"><RefreshCw size={12} /></button>
        </div>
      </div>

      {/* Constitutional clause */}
      {data && (
        <div className="border-b border-amber-400/15 px-6 py-3 bg-amber-400/3">
          <div className="text-amber-400/70 text-[10px] uppercase tracking-widest mb-1">§8 — Constitutional Basis</div>
          <div className="text-white/50 text-xs leading-relaxed">{data.constitutionalClause}</div>
          <div className="flex gap-6 mt-2">
            <div className="text-[10px]">
              <span className="text-white/30">Ordinal: </span>
              <span className="text-amber-400 font-bold">{data.ordinalFormula}</span>
            </div>
            <div className="text-[10px]">
              <span className="text-white/30">Cost: </span>
              <span className="text-amber-400/60">{data.energyCostFormula}</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8">
        {isLoading && (
          <div className="text-white/20 text-sm py-20 text-center animate-pulse">Loading ordinal registry…</div>
        )}

        {/* Registry by group */}
        {grouped.map(([group, entries]) => (
          <div key={group}>
            <div className="text-white/20 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/5" />
              {GROUP_LABELS[group] ?? group}
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map(entry => {
                const Icon = OP_ICONS[entry.operation] ?? Zap;
                const hasActivity = entry.liveStats.count > 0;
                return (
                  <div key={entry.operation} className="border border-white/8 rounded-xl p-4 relative overflow-hidden"
                    style={{ background: hasActivity ? `${entry.color}06` : "rgba(255,255,255,0.01)" }}>
                    {hasActivity && (
                      <div className="absolute top-0 right-0 w-1 h-full rounded-r-xl"
                        style={{ background: `linear-gradient(to bottom, ${entry.color}, transparent)` }} />
                    )}

                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${entry.color}18`, border: `1px solid ${entry.color}30` }}>
                        <Icon size={14} style={{ color: entry.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs" style={{ color: entry.color }}>{entry.operation}</div>
                        <div className="text-[9px] px-1.5 rounded inline-block mt-0.5"
                          style={{ background: `${entry.color}15`, color: entry.color + "99" }}>
                          {GROUP_LABELS[entry.group]}
                        </div>
                      </div>
                      {hasActivity && (
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                          style={{ background: entry.color }} />
                      )}
                    </div>

                    {/* Trigger */}
                    <div className="text-white/40 text-[10px] mb-3 leading-relaxed">{entry.trigger}</div>
                    {entry.note && <div className="text-white/20 text-[9px] mb-2 italic">{entry.note}</div>}

                    {/* Physics */}
                    <div className="border border-white/5 rounded-lg p-2 mb-3 space-y-1.5">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-white/30">Formula</span>
                        <span className="text-amber-400/70">{entry.formula}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-white/30">Energy factor</span>
                        <span className="text-white/50">{entry.energyFactor}×</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-white/30">At 555THz</span>
                        <span style={{ color: entry.color }}>{entry.example555thz} units</span>
                      </div>
                    </div>

                    {/* Live stats */}
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="font-bold text-sm" style={{ color: hasActivity ? entry.color : "#374151" }}>
                          {entry.liveStats.count.toLocaleString()}
                        </div>
                        <div className="text-[8px] text-white/20">deposits</div>
                      </div>
                      <ArrowRight size={10} className="text-white/10" />
                      <div className="text-center">
                        <div className="font-bold text-sm" style={{ color: hasActivity ? entry.color : "#374151" }}>
                          {hasActivity ? fmtUnits(entry.liveStats.totalUnits) : "—"}
                        </div>
                        <div className="text-[8px] text-white/20">treasury total</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Recent deposits live feed */}
        {data?.recentDeposits && data.recentDeposits.length > 0 && (
          <div>
            <div className="text-white/20 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/5" />
              Live Ordinal Feed — Most Recent Deposits
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              {data.recentDeposits.slice(0, 12).map((d: any, i: number) => {
                const opColor = data.registry.find(r => r.operation === d.operation_type)?.color ?? "#6b7280";
                return (
                  <div key={i} className="border border-white/5 rounded-lg px-3 py-2 flex items-center gap-3"
                    style={{ background: `${opColor}05` }}>
                    <div className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: opColor + "20", color: opColor }}>{d.operation_type}</div>
                    <div className="text-[10px] text-white/50 truncate flex-1">{d.source_label}</div>
                    <div className="text-[10px] font-bold flex-shrink-0" style={{ color: opColor }}>
                      {fmtUnits(parseInt(d.ordinal_nxt_units))}
                    </div>
                    <div className="text-[9px] text-white/20 flex-shrink-0">{fmtTime(d.deposited_at)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Constitutional footer */}
        <div className="border border-amber-400/10 rounded-xl p-5 text-center" style={{ background: "rgba(251,191,36,0.02)" }}>
          <div className="text-amber-400/40 text-[10px] uppercase tracking-widest mb-2">NexusOS Constitution — v{data?.version ?? "1.0.0"}</div>
          <div className="text-white/25 text-xs leading-relaxed max-w-2xl mx-auto">
            The ordinal is the most fundamental unit of value in the NexusOS economy. It is derived from
            the physics of the electromagnetic spectrum — not from policy, not from a board room, not from an algorithm.
            Every communication input generates an ordinal. Every ordinal flows to the Orbital Treasury.
            The Charitable Trust receives 10% of all ordinals forever.
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/orbital-treasury">
              <button className="text-amber-400/60 text-[10px] hover:text-amber-400/80 underline">View Treasury →</button>
            </Link>
            <Link href="/ecosystem">
              <button className="text-amber-400/60 text-[10px] hover:text-amber-400/80 underline">View Ecosystem →</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
