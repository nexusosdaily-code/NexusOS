import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Shield, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  XCircle, Clock, Copy, ExternalLink, Zap,
  ArrowDownLeft, Bitcoin, Key, ChevronDown, ChevronUp,
  Download, RefreshCw, Plus, Trash2, Droplets,
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

const EVENT_ICONS: Record<string, ReactNode> = {
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
        <h1 className="sr-only">Wallet Sentinel</h1>
        <div className="flex items-center gap-3 mb-6">
          <Link href="/wnsp">
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

        {/* BTC → NXT Deposit Panel */}
        <BtcDepositPanel />

        {/* My BTC Wallet */}
        <MyBtcWalletCard />

        {/* wnsp.io Liquidity Feed */}
        <WnspIoLiquidityPanel />

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

// ── My BTC Wallet Card ────────────────────────────────────────────────────────
function MyBtcWalletCard() {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/btc/wallet/mempool"],
    queryFn: () => fetch("/api/btc/wallet/mempool").then(r => r.json()),
    staleTime: 25_000,
    refetchInterval: 30_000,
  });

  // Track last successful refresh
  useEffect(() => {
    if (data?.ok && data.wallet) setLastRefresh(Date.now());
  }, [data]);

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copied" }); };

  const noAddress = data?.noAddress;
  const wallet    = data?.wallet ?? null;

  const netColor = (v: number) =>
    v > 0 ? "#22c55e" : v < 0 ? "#f87171" : "#6b7280";
  const dirIcon  = (v: number) =>
    v > 0 ? "↓" : v < 0 ? "↑" : "·";

  return (
    <Card className="mb-4 border border-cyan-500/20 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0e7490 04, #0f172a 100%)" }}>
      {/* Header */}
      <div
        className="w-full flex items-center gap-2 p-4 border-b border-cyan-500/20 cursor-pointer select-none"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => e.key === "Enter" && setOpen(o => !o)}>
        <Bitcoin className="w-4 h-4 text-cyan-400" />
        <span className="text-white font-semibold text-sm">My BTC Wallet</span>
        {wallet && (
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded ml-1">
            {satsDisplay(wallet.confirmed)} sats
          </span>
        )}
        {(isLoading || isFetching) && (
          <span className="text-[10px] text-cyan-400/50 font-mono ml-1 animate-pulse">fetching…</span>
        )}
        <div className="flex-1" />
        {wallet && (
          <span className="text-[10px] font-mono text-gray-600 mr-1">
            {lastRefresh ? fmtTime(new Date(lastRefresh).toISOString()) : "—"}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); refetch(); }}
          className="text-gray-600 hover:text-cyan-400 mr-1"
          title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </div>

      {open && (
        <div className="p-4">
          {/* No address registered — nudge */}
          {noAddress && (
            <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
              <Bitcoin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-cyan-300 font-semibold text-xs mb-1">Connect your BTC wallet</div>
                <div className="text-cyan-200/50 text-[10px] leading-relaxed mb-2">
                  Register your BTC address in the deposit panel below to unlock live mempool monitoring of your personal wallet.
                </div>
                <button
                  onClick={() => document.getElementById("btc-deposit-panel")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded transition-colors">
                  Register address ↓
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && !noAddress && (
            <div className="text-red-400/70 text-xs text-center py-4 font-mono">
              Failed to fetch wallet data — sentinel may be offline
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && !wallet && (
            <div className="text-cyan-400/50 text-xs text-center py-6 font-mono animate-pulse">
              Fetching from mempool.space…
            </div>
          )}

          {/* Wallet data */}
          {wallet && (
            <>
              {/* Address row */}
              <div className="flex items-center gap-2 mb-4 bg-slate-800/50 rounded-lg p-2.5">
                <Bitcoin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-cyan-200 font-mono text-[10px] flex-1 truncate" data-testid="text-my-btc-address">
                  {wallet.address}
                </span>
                <button onClick={() => copy(wallet.address)} className="text-gray-500 hover:text-cyan-400 shrink-0">
                  <Copy className="w-3 h-3" />
                </button>
                <a href={`https://mempool.space/address/${wallet.address}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-gray-500 hover:text-cyan-400 shrink-0">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Balance grid */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Confirmed",   value: satsDisplay(wallet.confirmed),   unit: "sats", color: "#22c55e"  },
                  { label: "Unconfirmed", value: wallet.unconfirmed !== 0 ? (wallet.unconfirmed > 0 ? `+${satsDisplay(wallet.unconfirmed)}` : satsDisplay(wallet.unconfirmed)) : "—", unit: "sats", color: wallet.unconfirmed > 0 ? "#f97316" : wallet.unconfirmed < 0 ? "#f87171" : "#4b5563" },
                  { label: "UTXOs",       value: wallet.utxoCount,                unit: "unspent", color: "#38bdf8" },
                  { label: "Total TXs",   value: wallet.txCount,                  unit: "on-chain", color: "#94a3b8" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                    <div className="text-sm font-bold font-mono" style={{ color: s.color }}
                      data-testid={`text-my-btc-${s.label.toLowerCase().replace(" ", "-")}`}>
                      {s.value}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono">{s.unit}</div>
                  </div>
                ))}
              </div>

              {/* Recent transactions */}
              {wallet.recentTxs.length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-2">
                    Recent Transactions
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {wallet.recentTxs.map((tx: any, i: number) => (
                      <div key={`${tx.txid}-${i}`}
                        className="flex items-center gap-2 py-1.5 px-2.5 rounded bg-slate-800/30 text-[10px] font-mono"
                        data-testid={`row-my-btc-tx-${i}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.confirmed ? "bg-green-500" : "bg-orange-400 animate-pulse"}`} />
                        <span className="font-bold shrink-0" style={{ color: netColor(tx.value) }}>
                          {dirIcon(tx.value)} {tx.value !== 0 ? `${satsDisplay(Math.abs(tx.value))} sats` : "—"}
                        </span>
                        <span className="text-gray-500 truncate flex-1">
                          {tx.txid.slice(0, 14)}…
                        </span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] ${tx.confirmed ? "bg-green-500/15 text-green-400" : "bg-orange-500/15 text-orange-400"}`}>
                          {tx.confirmed ? (tx.blockHeight ? `#${tx.blockHeight.toLocaleString()}` : "confirmed") : "mempool"}
                        </span>
                        <a href={`https://mempool.space/tx/${tx.txid}`} target="_blank" rel="noopener noreferrer"
                          className="text-gray-600 hover:text-cyan-400 shrink-0">
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {wallet.recentTxs.length === 0 && (
                <div className="text-gray-600 text-xs text-center py-3 font-mono">No transactions found for this address</div>
              )}

              <div className="text-[10px] text-gray-600 font-mono mt-3 text-right">
                Cached 25 s · data via mempool.space + blockstream.info · refreshes every 30 s
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ── BTC → NXT Deposit Panel ───────────────────────────────────────────────────
const SERVICE_WALLET = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";

function BtcDepositPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addrInput, setAddrInput]   = useState("");
  const [claimTxid, setClaimTxid]   = useState("");
  const [tab, setTab]               = useState<"register" | "history" | "claim">("register");

  const { data: info } = useQuery<any>({
    queryKey: ["/api/btc/deposit/info"],
    queryFn: () => fetch("/api/btc/deposit/info").then(r => r.json()),
    staleTime: 60_000,
  });
  const { data: regData, refetch: refetchReg } = useQuery<any>({
    queryKey: ["/api/btc/deposit/address"],
    queryFn: () => fetch("/api/btc/deposit/address").then(r => r.json()),
    staleTime: 10_000,
  });
  const { data: histData, refetch: refetchHist } = useQuery<any>({
    queryKey: ["/api/btc/deposits"],
    queryFn: () => fetch("/api/btc/deposits").then(r => r.json()),
    staleTime: 15_000,
  });

  const registered = regData?.registered ?? null;
  const deposits: any[] = histData?.deposits ?? [];

  const registerMut = useMutation({
    mutationFn: (btcAddress: string) =>
      fetch("/api/btc/deposit/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ btcAddress }),
      }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.ok) {
        toast({ title: "Address registered", description: "NXT will auto-credit when BTC arrives from this address." });
        qc.invalidateQueries({ queryKey: ["/api/btc/deposit/address"] });
      } else {
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    },
  });

  const unregisterMut = useMutation({
    mutationFn: () =>
      fetch("/api/btc/deposit/address", { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Address removed" });
      qc.invalidateQueries({ queryKey: ["/api/btc/deposit/address"] });
    },
  });

  const claimMut = useMutation({
    mutationFn: (txid: string) =>
      fetch("/api/btc/deposit/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txid }),
      }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.ok) {
        toast({ title: "Deposit claimed!", description: `+${d.nxtCredited} NXT credited to your wallet.` });
        setClaimTxid("");
        qc.invalidateQueries({ queryKey: ["/api/btc/deposits"] });
      } else {
        toast({ title: "Claim failed", description: d.error, variant: "destructive" });
      }
    },
  });

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast({ title: "Copied" }); };

  const satsPerNxt = info?.satsPerNxt ?? 1000;
  const minSats    = info?.minDepositSats ?? 3300;

  return (
    <Card id="btc-deposit-panel" className="mb-4 border border-orange-500/20 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f97316 06, #0f172a 100%)" }}>
      {/* Header */}
      <div className="p-4 border-b border-orange-500/20">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-orange-400" />
          <span className="text-white font-semibold text-sm">BTC → NXT Auto-Deposit</span>
          <span className="ml-auto text-[10px] font-mono text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded">
            {satsPerNxt.toLocaleString()} sats / NXT
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
          Register your BTC address below. When you send BTC to the service wallet from that address,
          NXT is credited to your account automatically within ~30 s of broadcast.
        </p>
      </div>

      {/* Deposit destination */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-mono">Send BTC to</div>
        <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-2.5">
          <Bitcoin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="text-orange-200 font-mono text-[10px] flex-1 truncate" data-testid="text-service-wallet">
            {SERVICE_WALLET}
          </span>
          <button onClick={() => copy(SERVICE_WALLET)} className="text-gray-500 hover:text-orange-400 shrink-0">
            <Copy className="w-3 h-3" />
          </button>
          <a href={`https://mempool.space/address/${SERVICE_WALLET}`} target="_blank" rel="noopener noreferrer"
            className="text-gray-500 hover:text-orange-400 shrink-0">
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="text-[10px] text-gray-600 font-mono mt-1 text-right">
          min {minSats.toLocaleString()} sats = {(minSats / satsPerNxt).toFixed(2)} NXT
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-3">
        {(["register", "history", "claim"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
              tab === t
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                : "text-gray-500 hover:text-gray-300"
            }`}>
            {t === "register" ? "My Address" : t === "history" ? `History (${deposits.length})` : "Claim TX"}
          </button>
        ))}
      </div>

      {/* Tab: My Address */}
      {tab === "register" && (
        <div className="px-4 pb-4">
          {registered ? (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-300 text-[11px] font-semibold">Address registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-200 font-mono text-[10px] flex-1 truncate" data-testid="text-registered-btc-address">
                    {registered.btc_address}
                  </span>
                  <button onClick={() => copy(registered.btc_address)} className="text-gray-500 hover:text-green-400">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-1">
                  Registered {new Date(registered.registered_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => unregisterMut.mutate()}
                disabled={unregisterMut.isPending}
                className="w-full flex items-center justify-center gap-2 text-[11px] font-mono text-red-400/60 hover:text-red-400 py-1.5 transition-colors"
                data-testid="button-unregister-btc-address">
                <Trash2 className="w-3 h-3" />
                {unregisterMut.isPending ? "Removing…" : "Remove address"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] text-gray-500 font-mono">Your BTC sending address</div>
              <input
                value={addrInput}
                onChange={e => setAddrInput(e.target.value)}
                placeholder="bc1p… (Taproot) or bc1q… or 1… or 3…"
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-[11px] font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
                data-testid="input-btc-deposit-address"
              />
              <button
                onClick={() => registerMut.mutate(addrInput.trim())}
                disabled={!addrInput.trim() || registerMut.isPending}
                className="w-full bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-40 border border-orange-500/40 text-orange-300 text-[11px] font-mono py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                data-testid="button-register-btc-address">
                <Plus className="w-3.5 h-3.5" />
                {registerMut.isPending ? "Registering…" : "Register address"}
              </button>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Send from this exact address — the sentinel matches the TX input to your account.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: History */}
      {tab === "history" && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Deposit history</span>
            <button onClick={() => refetchHist()} className="text-gray-600 hover:text-gray-400">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          {deposits.length === 0 ? (
            <div className="text-gray-600 text-xs text-center py-4 font-mono">No deposits yet</div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {deposits.map((d: any) => (
                <div key={d.id} className="flex items-center gap-2 bg-slate-800/40 rounded-lg p-2.5 text-[10px] font-mono"
                  data-testid={`row-deposit-${d.id}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    d.status === "credited" || d.status === "claimed" ? "bg-green-500" :
                    d.status === "unmatched" ? "bg-amber-400" : "bg-gray-500"
                  }`} />
                  <span className="text-gray-400 truncate flex-1">{d.txid?.slice(0, 14)}…</span>
                  <span className="text-gray-300 shrink-0">{Number(d.sats_received).toLocaleString()} sats</span>
                  {d.nxt_credited && (
                    <span className="text-green-400 shrink-0">+{parseFloat(d.nxt_credited).toFixed(2)} NXT</span>
                  )}
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] ${
                    d.status === "credited" || d.status === "claimed"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}>{d.status}</span>
                  <a href={`https://mempool.space/tx/${d.txid}`} target="_blank" rel="noopener noreferrer"
                    className="text-gray-600 hover:text-orange-400 shrink-0">
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Claim TX */}
      {tab === "claim" && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Sent BTC without a registered address? Paste the TX hash to claim your NXT.
          </p>
          <input
            value={claimTxid}
            onChange={e => setClaimTxid(e.target.value)}
            placeholder="64-character transaction ID"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-[11px] font-mono text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
            data-testid="input-claim-txid"
          />
          <button
            onClick={() => claimMut.mutate(claimTxid.trim())}
            disabled={claimTxid.trim().length !== 64 || claimMut.isPending}
            className="w-full bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-40 border border-orange-500/40 text-orange-300 text-[11px] font-mono py-2 rounded-lg transition-colors"
            data-testid="button-claim-deposit">
            {claimMut.isPending ? "Claiming…" : "Claim deposit"}
          </button>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            The TX must have been detected by the sentinel first (wait ~30 s after broadcast).
            Each TX can only be claimed once.
          </p>
        </div>
      )}
    </Card>
  );
}

// ── wnsp.io Liquidity Feed Panel ─────────────────────────────────────────────
function WnspIoLiquidityPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addr, setAddr] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: status, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/admin/wnsp-io-status"],
    queryFn: () => fetch("/api/admin/wnsp-io-status", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: histData } = useQuery<any>({
    queryKey: ["/api/admin/wnsp-io-history"],
    queryFn: () => fetch("/api/admin/wnsp-io-history", { credentials: "include" }).then(r => r.json()),
    enabled: showHistory,
  });

  const setAddrMut = useMutation({
    mutationFn: async (btcAddress: string) => {
      const r = await fetch("/api/admin/wnsp-io-address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ btcAddress }),
      });
      return r.json();
    },
    onSuccess: (d: any) => {
      if (d.ok) {
        toast({ title: "✅ wnsp.io feed activated", description: d.message });
        setAddr("");
        refetchStatus();
        qc.invalidateQueries({ queryKey: ["/api/admin/wnsp-io-history"] });
      } else {
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const activeAddr = status?.address;
  const snap       = status?.snapshot;
  const sessionFed = status?.sessionSatsFed ?? 0;
  const feeds      = histData?.feeds ?? [];

  return (
    <Card className="bg-slate-900/60 border-cyan-500/20 overflow-hidden mt-4">
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-semibold text-sm">wnsp.io Liquidity Feed</span>
          {activeAddr ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="ml-auto text-[10px] font-mono text-gray-500 bg-slate-800/50 px-2 py-0.5 rounded">
              Not configured
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
          Watches your wnsp.io UniSat BTC wallet. Every new inbound confirmed TX is
          automatically credited to the NexusOS service sats pool.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Active address display */}
        {activeAddr && snap && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 space-y-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Watching</div>
            <div className="font-mono text-[11px] text-cyan-300 break-all">{activeAddr}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-slate-800/40 rounded p-2 text-center">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Confirmed</div>
                <div className="text-sm font-bold font-mono text-green-400">{snap.confirmed?.toLocaleString() ?? "—"}</div>
                <div className="text-[9px] text-gray-600">sats</div>
              </div>
              <div className="bg-slate-800/40 rounded p-2 text-center">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Session Fed</div>
                <div className="text-sm font-bold font-mono text-cyan-400">{sessionFed.toLocaleString()}</div>
                <div className="text-[9px] text-gray-600">sats → pool</div>
              </div>
            </div>
            {snap.checkedAt && (
              <div className="text-[9px] text-gray-600 font-mono text-right">
                Last checked {fmtTime(snap.checkedAt)}
              </div>
            )}
          </div>
        )}

        {/* Set / update address */}
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
            {activeAddr ? "Update wnsp.io address" : "Set wnsp.io UniSat wallet address"}
          </div>
          <div className="flex gap-2">
            <Input
              value={addr}
              onChange={e => setAddr(e.target.value)}
              placeholder="bc1p… wnsp.io UniSat wallet"
              className="bg-slate-800/50 border-slate-700 font-mono text-xs flex-1"
              data-testid="input-wnsp-io-address"
            />
            <Button
              size="sm"
              onClick={() => setAddrMut.mutate(addr.trim())}
              disabled={!addr.trim() || setAddrMut.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
              data-testid="button-set-wnsp-io-address"
            >
              {setAddrMut.isPending ? "…" : activeAddr ? "Update" : "Activate"}
            </Button>
          </div>
          <p className="text-[10px] text-gray-600">
            Paste the BTC address of your wnsp.io UniSat account. Only confirmed inbound TXs are credited.
          </p>
        </div>

        {/* Feed history toggle */}
        <button
          onClick={() => setShowHistory(s => !s)}
          className="w-full flex items-center justify-between text-[11px] font-mono text-gray-500 hover:text-gray-300 py-1 transition-colors"
          data-testid="button-toggle-wnsp-io-history"
        >
          <span>Feed history ({feeds.length})</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showHistory && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {feeds.length === 0 ? (
              <div className="text-[10px] text-gray-600 text-center py-3">No feeds yet — waiting for confirmed inbound TXs</div>
            ) : feeds.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-slate-800/40 rounded p-2 text-[10px] font-mono">
                <Droplets className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="text-gray-400 flex-1 truncate">{f.txid?.slice(0, 14)}…</span>
                <span className="text-cyan-300 shrink-0">+{Number(f.sats_received).toLocaleString()} sats</span>
                <a href={`https://mempool.space/tx/${f.txid}`} target="_blank" rel="noopener noreferrer"
                  className="text-gray-600 hover:text-cyan-400 shrink-0">
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
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
