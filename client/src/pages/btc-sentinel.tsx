import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Shield, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  XCircle, Clock, Copy, ExternalLink, Zap,
  ArrowDownLeft, Bitcoin, Key, ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────
function satsDisplay(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(4)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString();
}

function fmtTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  if (s > 10) return `${s}s ago`;
  return "just now";
}

const EVENT_ICONS: Record<string, JSX.Element> = {
  incoming:   <ArrowDownLeft className="w-3.5 h-3.5 text-orange-400" />,
  confirmed:  <CheckCircle2  className="w-3.5 h-3.5 text-green-400" />,
  low_warn:   <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  low_crit:   <XCircle       className="w-3.5 h-3.5 text-red-400" />,
  recovered:  <CheckCircle2  className="w-3.5 h-3.5 text-emerald-400" />,
  startup:    <Wifi          className="w-3.5 h-3.5 text-cyan-400" />,
  utxo_alert: <Key           className="w-3.5 h-3.5 text-violet-400" />,
};

function HealthBadge({ health }: { health: string }) {
  if (health === "ok")       return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Healthy</Badge>;
  if (health === "warning")  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Low Balance</Badge>;
  if (health === "critical") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Critical</Badge>;
  return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30"><Clock className="w-3 h-3 mr-1" />Connecting…</Badge>;
}

// ── SSE hook ──────────────────────────────────────────────────────────────────
interface SentinelData {
  snapshot:   any;
  events:     any[];
  health:     string;
  mempoolUrl: string | null;
}

function useSentinelStream(): { data: SentinelData | null; connected: boolean; lastPush: number } {
  const [data, setData]           = useState<SentinelData | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastPush, setLastPush]   = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (esRef.current) esRef.current.close();

      const es = new EventSource("/api/btc/sentinel/stream");
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data) as SentinelData;
          setData(payload);
          setLastPush(Date.now());
        } catch { /* malformed frame */ }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        // Reconnect after 5 s
        retryTimer = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimer);
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return { data, connected, lastPush };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BtcSentinelPage() {
  const { toast } = useToast();
  const { data, connected, lastPush } = useSentinelStream();

  // Tick every second so "just now / Xs ago" timestamps stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  const snap     = data?.snapshot ?? null;
  const events   = data?.events   ?? [];
  const health   = data?.health   ?? "unknown";
  const memUrl   = data?.mempoolUrl ?? null;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  const healthColor =
    health === "ok"       ? "#22c55e" :
    health === "warning"  ? "#f59e0b" :
    health === "critical" ? "#ef4444" : "#64748b";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <Shield className="w-5 h-5 text-orange-400" />
          <span className="text-gray-400 text-sm font-mono">Wallet Sentinel</span>
          <div className="flex-1" />
          <HealthBadge health={health} />
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {connected
              ? <><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-green-400">LIVE</span></>
              : <><WifiOff className="w-3 h-3 text-gray-500" /><span className="text-gray-500">reconnecting…</span></>
            }
          </div>
        </div>

        {/* Live balance card */}
        <Card
          className="p-6 mb-4 border relative overflow-hidden"
          style={{ borderColor: healthColor + "44", background: `linear-gradient(135deg, ${healthColor}08 0%, #0f172a 100%)` }}
        >
          <div className="absolute top-3 right-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: healthColor }} />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Bitcoin className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Service Wallet</span>
          </div>

          {!snap && (
            <div className="text-gray-500 text-sm animate-pulse">
              {connected ? "Loading balance…" : "Connecting to mempool…"}
            </div>
          )}

          {snap && (
            <>
              {/* Address */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-mono text-gray-400 break-all">{snap.address}</span>
                <button onClick={() => copy(snap.address)} className="text-gray-600 hover:text-gray-300 shrink-0">
                  <Copy className="w-3 h-3" />
                </button>
                {memUrl && (
                  <a href={memUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-orange-400 shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Balance grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Confirmed</div>
                  <div className="text-lg font-bold font-mono transition-all duration-500" style={{ color: healthColor }} data-testid="text-confirmed-sats">
                    {satsDisplay(snap.confirmed)}
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono">sats</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Unconfirmed</div>
                  <div className={`text-lg font-bold font-mono transition-all duration-500 ${snap.unconfirmed > 0 ? "text-orange-400" : "text-gray-600"}`} data-testid="text-unconfirmed-sats">
                    {snap.unconfirmed > 0 ? `+${satsDisplay(snap.unconfirmed)}` : "—"}
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono">sats</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total TXs</div>
                  <div className="text-lg font-bold font-mono text-gray-300" data-testid="text-tx-count">
                    {snap.txCount}
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono">on-chain</div>
                </div>
              </div>

              {/* Thresholds */}
              <div className="space-y-2">
                <ThresholdBar label="Critical floor" value={snap.confirmed} threshold={5_000}  color="#ef4444" />
                <ThresholdBar label="Low-balance warn" value={snap.confirmed} threshold={20_000} color="#f59e0b" />
              </div>

              <div className="text-[10px] text-gray-600 font-mono mt-3">
                Last push: {lastPush ? fmtTime(new Date(lastPush).toISOString()) : "—"}
                {" · "}sentinel polls every 30 s
              </div>
            </>
          )}
        </Card>

        {/* Top-up CTA when low */}
        {(health === "critical" || health === "warning") && snap && (
          <Card className="bg-amber-900/20 border-amber-500/30 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-amber-400 font-semibold text-sm mb-1">
                  {health === "critical" ? "🚨 Inscriptions paused — wallet critically low" : "⚠️ Wallet below recommended level"}
                </div>
                <div className="text-amber-200/60 text-xs mb-2">
                  Send BTC to the service wallet to resume auto-inscriptions.
                  {health === "critical" ? ` Need ${(5000 - snap.confirmed).toLocaleString()}+ sats minimum.` : ""}
                </div>
                <div className="flex items-center gap-2 bg-black/30 rounded p-2">
                  <span className="font-mono text-xs text-amber-300 break-all">{snap.address}</span>
                  <button onClick={() => copy(snap.address)} className="text-amber-500/50 hover:text-amber-400 shrink-0">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                {memUrl && (
                  <a href={memUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-2">
                    <ExternalLink className="w-3 h-3" /> View live on mempool.space
                  </a>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* UTXO Analysis */}
        {snap?.utxo && <UtxoCard utxo={snap.utxo} address={snap.address} />}

        {/* Event log */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-semibold text-sm">Live Event Log</span>
            <span className="text-gray-500 text-xs font-mono ml-auto">{events.length} events</span>
          </div>

          {events.length === 0 && (
            <div className="text-gray-600 text-sm text-center py-6">
              No events yet — sentinel is watching…
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((ev: any, i: number) => (
              <div key={`${ev.timestamp}-${i}`} className="flex items-start gap-2.5 py-2 border-b border-slate-800/50 last:border-0">
                <div className="mt-0.5 shrink-0">
                  {EVENT_ICONS[ev.type] ?? <Clock className="w-3.5 h-3.5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">{ev.message}</div>
                  {ev.txid && (
                    <a
                      href={`https://mempool.space/tx/${ev.txid}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-400 mt-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> mempool.space
                    </a>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-600 shrink-0 mt-0.5">
                  {fmtTime(ev.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-600 font-mono space-y-1">
          <div>Server-sent events — page updates instantly when sentinel detects activity</div>
          <div>Sentinel polls mempool.space + blockstream.info every 30 s</div>
          <div>Telegram alerts fire on new TXs · queue auto-resumes when balance recovers</div>
        </div>
      </div>
    </div>
  );
}

// ── UTXO Analysis Card ────────────────────────────────────────────────────────
function UtxoCard({ utxo, address }: { utxo: any; address: string }) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const healthColor =
    utxo.needsConsolidation ? "#a78bfa" :
    utxo.dustCount > 0       ? "#f59e0b" : "#22c55e";

  const displayUtxos = showAll ? utxo.utxos : utxo.utxos.slice(0, 8);

  return (
    <Card
      className="mb-4 border overflow-hidden"
      style={{ borderColor: healthColor + "33", background: `linear-gradient(135deg, ${healthColor}06 0%, #0f172a 100%)` }}
    >
      <button className="w-full flex items-center gap-2 p-4 text-left" onClick={() => setOpen(o => !o)}>
        <Key className="w-4 h-4" style={{ color: healthColor }} />
        <span className="text-white font-semibold text-sm">UTXO Analysis</span>
        <span className="text-[10px] font-mono ml-1 px-1.5 py-0.5 rounded"
          style={{ background: healthColor + "22", color: healthColor }}>
          {utxo.count} UTXO{utxo.count !== 1 ? "s" : ""}
        </span>
        {utxo.needsConsolidation && (
          <span className="text-[10px] font-mono text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded">
            consolidate
          </span>
        )}
        {utxo.dustCount > 0 && (
          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
            {utxo.dustCount} dust
          </span>
        )}
        <div className="flex-1" />
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0">
          {/* Summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: "Total",       value: utxo.count,            unit: "UTXOs",    color: healthColor },
              { label: "Confirmed",   value: utxo.confirmedCount,   unit: "UTXOs",    color: "#22c55e" },
              { label: "Pending",     value: utxo.unconfirmedCount, unit: "UTXOs",    color: "#f97316" },
              { label: "Dust <330",   value: utxo.dustCount,        unit: "UTXOs",    color: utxo.dustCount > 0 ? "#f59e0b" : "#6b7280" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-base font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-gray-600 font-mono">{s.unit}</div>
              </div>
            ))}
          </div>

          {/* Value stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Largest",  value: utxo.largestSats,  color: "#6ee7b7" },
              { label: "Average",  value: utxo.avgSats,      color: "#93c5fd" },
              { label: "Smallest", value: utxo.smallestSats, color: utxo.smallestSats < 330 ? "#fbbf24" : "#9ca3af" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/40 rounded-lg p-2.5 text-center">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-sm font-bold font-mono" style={{ color: s.color }}>
                  {satsDisplay(s.value)}
                </div>
                <div className="text-[9px] text-gray-600 font-mono">sats</div>
              </div>
            ))}
          </div>

          {/* Consolidation banner */}
          {utxo.needsConsolidation && (
            <div className="flex items-start gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-violet-300 font-semibold text-xs mb-0.5">Consolidation recommended</div>
                <div className="text-violet-200/60 text-[10px] leading-relaxed">
                  {utxo.count} UTXOs increases TX size and fees. Send all inputs to yourself in a single TX during low-fee periods to consolidate.
                </div>
              </div>
            </div>
          )}

          {/* Dust warning */}
          {utxo.dustCount > 0 && !utxo.needsConsolidation && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-amber-200/70 text-[10px] leading-relaxed">
                {utxo.dustCount} UTXO{utxo.dustCount > 1 ? "s are" : " is"} below the P2TR dust limit (330 sats) and may be unspendable.
              </div>
            </div>
          )}

          {/* UTXO list */}
          {utxo.utxos.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-mono">UTXO Set</div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {displayUtxos.map((u: any, i: number) => {
                  const isDust = u.value < 330;
                  return (
                    <div key={`${u.txid}-${u.vout}-${i}`}
                      className={`flex items-center gap-2 py-1.5 px-2 rounded text-[10px] font-mono ${isDust ? "bg-amber-500/5" : "bg-slate-800/30"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.confirmed ? "bg-green-500" : "bg-orange-400 animate-pulse"}`} />
                      <span className="text-gray-500 truncate flex-1" title={`${u.txid}:${u.vout}`}>
                        {u.txid.slice(0, 12)}…:{u.vout}
                      </span>
                      <span className={`shrink-0 font-semibold ${isDust ? "text-amber-400" : "text-gray-300"}`}>
                        {u.value.toLocaleString()} sats
                        {isDust && " ⚠"}
                      </span>
                      <a href={`https://mempool.space/tx/${u.txid}`} target="_blank" rel="noopener noreferrer"
                        className="text-gray-700 hover:text-orange-400 shrink-0">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
              {utxo.utxos.length > 8 && (
                <button onClick={() => setShowAll(s => !s)}
                  className="mt-2 text-[10px] text-gray-500 hover:text-gray-300 font-mono w-full text-center">
                  {showAll ? "show less" : `+ ${utxo.utxos.length - 8} more UTXOs`}
                </button>
              )}
            </div>
          )}

          {utxo.utxos.length === 0 && (
            <div className="text-gray-600 text-xs text-center py-3">No UTXOs — wallet is empty</div>
          )}
        </div>
      )}
    </Card>
  );
}

function ThresholdBar({ label, value, threshold, color }: { label: string; value: number; threshold: number; color: string }) {
  const pct  = Math.min(100, (value / threshold) * 100);
  const over = value >= threshold;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono text-gray-500">
        <span>{label}</span>
        <span style={{ color: over ? "#6b7280" : color }}>
          {over
            ? `✓ ${satsDisplay(value)} / ${satsDisplay(threshold)}`
            : `${satsDisplay(value)} / ${satsDisplay(threshold)} sats`}
        </span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: over ? "#374151" : color }}
        />
      </div>
    </div>
  );
}
