import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Activity, Zap, Layers, Clock, ExternalLink,
  RefreshCw, AlertTriangle, CheckCircle2, Cpu, Box,
  TrendingUp, Radio, ShieldCheck, Timer,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function satsvb(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n} sat/vB`;
}

function fmt(n: number | null | undefined, suffix = "") {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M${suffix}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K${suffix}`;
  return `${n}${suffix}`;
}

function fmtBytes(b: number | null | undefined) {
  if (b == null) return "—";
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(2)} MB`;
  if (b >= 1_000)     return `${(b / 1_000).toFixed(1)} KB`;
  return `${b} B`;
}

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function fmtBTC(sats: number | null | undefined) {
  if (sats == null) return "—";
  return `${(sats / 1e8).toFixed(4)} BTC`;
}

// ── Fee tier card ─────────────────────────────────────────────────────────────
function FeeTierCard({
  label, fee, color, glow, desc,
}: {
  label: string; fee: number | null; color: string; glow: string; desc: string;
}) {
  return (
    <div
      className="rounded-xl p-4 text-center flex flex-col gap-1 border"
      style={{ borderColor: color + "44", background: `linear-gradient(135deg, ${color}12 0%, #0f172a 100%)` }}
    >
      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">{label}</div>
      <div className="text-2xl font-bold font-mono" style={{ color, textShadow: `0 0 12px ${glow}` }}
        data-testid={`text-fee-${label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
        {fee != null ? fee : "—"}
      </div>
      <div className="text-[10px] text-gray-600 font-mono">sat/vB</div>
      <div className="text-[10px] text-gray-500 mt-1">{desc}</div>
    </div>
  );
}

// ── Block row ─────────────────────────────────────────────────────────────────
function BlockRow({ block, i }: { block: any; i: number }) {
  const age = block.timestamp ? timeAgo(block.timestamp) : "—";
  const feeRng = Array.isArray(block.feeRange) && block.feeRange.length >= 2
    ? `${block.feeRange[0]}–${block.feeRange[block.feeRange.length - 1]} sat/vB`
    : block.medianFee != null ? `~${block.medianFee} sat/vB median` : "—";

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs font-mono transition-colors hover:bg-slate-800/50
        ${i === 0 ? "bg-orange-500/10 border border-orange-500/20" : "border border-transparent"}`}
      data-testid={`row-block-${block.height}`}
    >
      <div className="shrink-0">
        <Box className={`w-4 h-4 ${i === 0 ? "text-orange-400" : "text-slate-500"}`} />
      </div>
      <div className="w-20 shrink-0">
        <a
          href={`https://mempool.space/block/${block.height}`}
          target="_blank" rel="noopener noreferrer"
          className="text-orange-300 hover:text-orange-200 flex items-center gap-1"
        >
          #{block.height?.toLocaleString()}
          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
        </a>
      </div>
      <div className="text-gray-400 w-28 shrink-0">{fmtBytes(block.size)}</div>
      <div className="text-gray-400 w-16 shrink-0">{fmt(block.txCount)} txs</div>
      <div className="text-amber-400 flex-1">{feeRng}</div>
      {block.miner && (
        <div className="text-gray-500 hidden md:block truncate max-w-[100px]">{block.miner}</div>
      )}
      <div className="text-gray-600 shrink-0 w-16 text-right">{age}</div>
    </div>
  );
}

// ── Sentinel mini-card ────────────────────────────────────────────────────────
function SentinelMini() {
  const { data } = useQuery<any>({
    queryKey: ["/api/btc/sentinel"],
    queryFn: () => fetch("/api/btc/sentinel").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const snap   = data?.snapshot ?? null;
  const health = data?.health   ?? "unknown";

  const hColor =
    health === "ok"       ? "#22c55e" :
    health === "warning"  ? "#f59e0b" :
    health === "critical" ? "#ef4444" : "#64748b";

  return (
    <Card className="p-4 border mb-4" style={{ borderColor: hColor + "44", background: `linear-gradient(135deg, ${hColor}08 0%, #0f172a 100%)` }}>
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4" style={{ color: hColor }} />
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">NexusOS Service Wallet</span>
        <div className="flex-1" />
        {health === "ok"       && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Healthy</Badge>}
        {health === "warning"  && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"><AlertTriangle className="w-2.5 h-2.5 mr-1" />Low</Badge>}
        {health === "critical" && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><AlertTriangle className="w-2.5 h-2.5 mr-1" />Critical</Badge>}
        {health === "unknown"  && <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px]"><Clock className="w-2.5 h-2.5 mr-1" />—</Badge>}
        <Link href="/btc-sentinel">
          <button className="text-gray-600 hover:text-orange-400 ml-1">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
      {snap ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Confirmed",   value: fmt(snap.confirmed) + " sats",   color: hColor },
            { label: "Unconfirmed", value: snap.unconfirmed > 0 ? `+${fmt(snap.unconfirmed)} sats` : "—", color: snap.unconfirmed > 0 ? "#f97316" : "#4b5563" },
            { label: "UTXOs",       value: String(snap.utxo?.count ?? "—"), color: "#38bdf8" },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/40 rounded-lg p-2 text-center">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-600 text-xs font-mono text-center py-2 animate-pulse">Fetching sentinel…</div>
      )}
    </Card>
  );
}

// ── Mempool fee gauge ─────────────────────────────────────────────────────────
function FeeGauge({ fee, max }: { fee: number; max: number }) {
  const pct = Math.min(100, Math.round((fee / max) * 100));
  const color = fee <= 5 ? "#22c55e" : fee <= 20 ? "#f59e0b" : fee <= 80 ? "#f97316" : "#ef4444";
  return (
    <div className="h-1 rounded-full bg-slate-800 mt-2 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MempoolMonitorPage() {
  const [tick, setTick] = useState(0);
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ["/api/btc/mempool/stats"],
    queryFn: () => fetch("/api/btc/mempool/stats").then(r => r.json()),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: minerScore } = useQuery<any>({
    queryKey: ["/api/mempool/miner-score"],
    queryFn: () => fetch("/api/mempool/miner-score").then(r => r.json()),
    staleTime: 120_000,
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (data?.ok) setLastFetch(Date.now());
  }, [data]);

  const fees        = data?.fees        ?? null;
  const mempool     = data?.mempool     ?? null;
  const blocks      = data?.recentBlocks ?? [];

  const maxFee = fees ? Math.max(fees.fastestFee ?? 0, 100) : 100;

  const secsSince = lastFetch ? Math.floor((Date.now() - lastFetch) / 1000) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <Activity className="w-5 h-5 text-orange-400" />
          <span className="text-white font-bold text-lg">Mempool Monitor</span>
          <span className="text-gray-600 font-mono text-xs hidden sm:block">Bitcoin network · live</span>
          <div className="flex-1" />
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-orange-400 transition-colors"
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-orange-400" : ""}`} />
            {secsSince != null ? `${secsSince}s ago` : "—"}
          </button>
        </div>

        {/* NexusOS wallet mini-status */}
        <SentinelMini />

        {/* Fee rates */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-semibold text-sm">Recommended Fee Rates</span>
            <span className="text-gray-600 font-mono text-[10px] ml-auto">via mempool.space</span>
          </div>

          {isLoading && !fees && (
            <div className="text-gray-600 text-xs font-mono text-center py-6 animate-pulse">Fetching fee rates…</div>
          )}

          {fees && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FeeTierCard label="No Priority"  fee={fees.minimumFee}     color="#6b7280" glow="#6b7280" desc="Could take days" />
              <FeeTierCard label="1 Hour"        fee={fees.hourFee}        color="#22c55e" glow="#22c55e" desc="~6 blocks" />
              <FeeTierCard label="30 min"        fee={fees.halfHourFee}    color="#f59e0b" glow="#f59e0b" desc="~3 blocks" />
              <FeeTierCard label="Next block"    fee={fees.fastestFee}     color="#ef4444" glow="#ef4444" desc="~1 block" />
            </div>
          )}

          {fees && (
            <div className="mt-4">
              <div className="text-[10px] text-gray-600 font-mono mb-1">Fee pressure gauge (relative to fastest)</div>
              <div className="grid grid-cols-4 gap-3">
                {[fees.minimumFee, fees.hourFee, fees.halfHourFee, fees.fastestFee].map((f, i) => (
                  <FeeGauge key={i} fee={f ?? 0} max={maxFee} />
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Mempool stats */}
        {mempool && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-semibold text-sm">Mempool Status</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Pending TXs",   value: fmt(mempool.count),                         color: "#38bdf8", unit: "txs" },
                { label: "Unconfirmed",   value: fmtBytes(mempool.vsize),                    color: "#a78bfa", unit: "vbytes" },
                { label: "Fee in pool",   value: fmtBTC(mempool.total_fee),                  color: "#f59e0b", unit: "total fees" },
                { label: "Last updated",  value: mempool.last_updated ? timeAgo(mempool.last_updated) : "—", color: "#6b7280", unit: "" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                  <div className="text-sm font-bold font-mono" style={{ color: s.color }}
                    data-testid={`text-mempool-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {s.value}
                  </div>
                  {s.unit && <div className="text-[9px] text-gray-600 font-mono">{s.unit}</div>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent blocks */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Box className="w-4 h-4 text-orange-400" />
            <span className="text-white font-semibold text-sm">Recent Blocks</span>
            <span className="text-gray-600 font-mono text-[10px] ml-auto">latest 10</span>
          </div>

          {isLoading && blocks.length === 0 && (
            <div className="text-gray-600 text-xs font-mono text-center py-6 animate-pulse">Loading blocks…</div>
          )}

          {blocks.length > 0 && (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-3 px-3 mb-1 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                <div className="w-4 shrink-0" />
                <div className="w-20 shrink-0">Height</div>
                <div className="w-28 shrink-0">Size</div>
                <div className="w-16 shrink-0">TXs</div>
                <div className="flex-1">Fee range</div>
                <div className="hidden md:block w-[100px]">Miner</div>
                <div className="w-16 text-right">Age</div>
              </div>
              <div className="space-y-1">
                {blocks.map((b: any, i: number) => (
                  <BlockRow key={b.height} block={b} i={i} />
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Mining stats from blocks */}
        {blocks.length > 0 && (() => {
          const withReward  = blocks.filter((b: any) => b.reward != null);
          const avgReward   = withReward.length ? withReward.reduce((a: number, b: any) => a + b.reward, 0) / withReward.length : null;
          const withMedian  = blocks.filter((b: any) => b.medianFee != null);
          const avgMedian   = withMedian.length ? withMedian.reduce((a: number, b: any) => a + b.medianFee, 0) / withMedian.length : null;
          const miners: Record<string, number> = {};
          blocks.forEach((b: any) => { if (b.miner) miners[b.miner] = (miners[b.miner] ?? 0) + 1; });
          const topMiner = Object.entries(miners).sort((a, b) => b[1] - a[1])[0];
          return (
            <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-violet-400" />
                <span className="text-white font-semibold text-sm">Mining Overview</span>
                <span className="text-gray-600 font-mono text-[10px] ml-auto">last 10 blocks</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Avg reward",    value: avgReward   != null ? fmtBTC(avgReward)          : "—", color: "#f59e0b" },
                  { label: "Avg median fee", value: avgMedian  != null ? `${avgMedian.toFixed(1)} s/vB` : "—", color: "#a78bfa" },
                  { label: "Top miner",      value: topMiner   ? `${topMiner[0]} (${topMiner[1]}/10)` : "—", color: "#38bdf8" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                    <div className="text-sm font-bold font-mono truncate" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* Network Decentralization + Block Time */}
        {minerScore?.ok && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-semibold text-sm">Network Health</span>
              <span className="text-gray-600 font-mono text-[10px] ml-auto">last {minerScore.blockCount} blocks</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Herfindahl index */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Miner Concentration (HHI)</div>
                <div className={`text-lg font-bold font-mono ${minerScore.decentralization === "healthy" ? "text-emerald-400" : minerScore.decentralization === "moderate" ? "text-amber-400" : "text-red-400"}`}>
                  {minerScore.hhiPct}%
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 ${minerScore.decentralization === "healthy" ? "text-emerald-400/70" : minerScore.decentralization === "moderate" ? "text-amber-400/70" : "text-red-400/70"}`}>
                  {minerScore.decentralization === "healthy" ? "✅ Healthy" : minerScore.decentralization === "moderate" ? "⚠ Moderate" : "🔴 Concentrated"}
                </div>
                <div className="text-[9px] text-gray-600 mt-1">Lower = more decentralised</div>
              </div>
              {/* Block time deviation */}
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Timer className="w-3 h-3 text-cyan-400" />
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider">Avg Block Time</div>
                </div>
                <div className={`text-lg font-bold font-mono ${Math.abs(minerScore.blockTimeDeviationPct) < 10 ? "text-cyan-400" : Math.abs(minerScore.blockTimeDeviationPct) < 25 ? "text-amber-400" : "text-red-400"}`}>
                  {Math.round(minerScore.avgBlockSecs / 60)}m {minerScore.avgBlockSecs % 60}s
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 ${minerScore.blockTimeDeviationPct > 0 ? "text-amber-400/70" : "text-green-400/70"}`}>
                  {minerScore.blockTimeDeviationPct > 0 ? `+${minerScore.blockTimeDeviationPct}%` : `${minerScore.blockTimeDeviationPct}%`} vs 10min target
                </div>
                <div className="text-[9px] text-gray-600 mt-1">Hash rate {minerScore.blockTimeDeviationPct > 10 ? "may be dropping" : minerScore.blockTimeDeviationPct < -10 ? "surging" : "stable"}</div>
              </div>
            </div>
            {/* Miner share bars */}
            <div className="space-y-1.5">
              {minerScore.miners.slice(0, 5).map((m: any, i: number) => (
                <div key={m.name} className="flex items-center gap-2">
                  <div className="w-20 shrink-0 text-[10px] font-mono text-gray-400 truncate">{m.name}</div>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${m.sharePct}%`, background: ["#22d3ee","#a78bfa","#fb923c","#34d399","#f472b6"][i] }} />
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 w-8 text-right">{m.sharePct}%</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quick links */}
        <Card className="bg-slate-900/40 border-slate-800/50 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-xs font-mono uppercase tracking-widest">Open in Explorer</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "mempool.space",              href: "https://mempool.space" },
              { label: "Service wallet",             href: "https://mempool.space/address/bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m" },
              { label: "NexusOS inscription wallet", href: "https://mempool.space/address/bc1pkpap9gqrc8xm02jhj8wfggmxzrxcmqtdpemyx0rtrap6xpd3pycsj2ydd6" },
            ].map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-mono text-orange-400/70 hover:text-orange-400 border border-orange-500/20 hover:border-orange-500/40 px-3 py-1.5 rounded-lg transition-colors">
                <ExternalLink className="w-3 h-3" />
                {l.label}
              </a>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-600 font-mono space-y-1">
          <div>Data proxied via mempool.space API · refreshes every 30 s</div>
          <div>
            <Link href="/btc-sentinel">
              <span className="text-orange-400/50 hover:text-orange-400 cursor-pointer transition-colors">
                → Full Wallet Sentinel with live SSE stream
              </span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
