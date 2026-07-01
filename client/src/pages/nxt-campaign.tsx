import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft, Play, Square, Zap, RefreshCw, Clock, CheckCircle,
  XCircle, Radio, Send, Eye, TrendingUp, Lock, Coins, Rocket,
  Bot, ChevronDown, ChevronUp, Megaphone, Tag, Sparkles, Code,
  Wifi, LinkIcon, Cpu, Terminal, Atom, Layers,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMs(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtCountdown(nextFireAt: number | null) {
  if (!nextFireAt) return "—";
  const diff = nextFireAt - Date.now();
  if (diff <= 0) return "firing…";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
function fmtTime(ts: string) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const dy = Math.floor(h / 24);
  if (dy > 0) return `${dy}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const SLOT_ICONS: Record<number, ReactNode> = {
  0:  <TrendingUp className="w-4 h-4" />,
  1:  <Lock       className="w-4 h-4" />,
  2:  <Coins      className="w-4 h-4" />,
  3:  <Zap        className="w-4 h-4" />,
  4:  <Bot        className="w-4 h-4" />,
  5:  <Rocket     className="w-4 h-4" />,
  6:  <Tag        className="w-4 h-4" />,
  7:  <Sparkles   className="w-4 h-4" />,
  8:  <Code       className="w-4 h-4" />,
  10: <Wifi       className="w-4 h-4" />,
  11: <LinkIcon   className="w-4 h-4" />,
  12: <Cpu        className="w-4 h-4" />,
  13: <Terminal   className="w-4 h-4" />,
  14: <Atom       className="w-4 h-4" />,
  15: <Layers     className="w-4 h-4" />,
};
const SLOT_ICONS_SM: Record<number, ReactNode> = {
  0:  <TrendingUp className="w-3.5 h-3.5" />,
  1:  <Lock       className="w-3.5 h-3.5" />,
  2:  <Coins      className="w-3.5 h-3.5" />,
  3:  <Zap        className="w-3.5 h-3.5" />,
  4:  <Bot        className="w-3.5 h-3.5" />,
  5:  <Rocket     className="w-3.5 h-3.5" />,
  6:  <Tag        className="w-3.5 h-3.5" />,
  7:  <Sparkles   className="w-3.5 h-3.5" />,
  8:  <Code       className="w-3.5 h-3.5" />,
  10: <Wifi       className="w-3.5 h-3.5" />,
  11: <LinkIcon   className="w-3.5 h-3.5" />,
  12: <Cpu        className="w-3.5 h-3.5" />,
  13: <Terminal   className="w-3.5 h-3.5" />,
  14: <Atom       className="w-3.5 h-3.5" />,
  15: <Layers     className="w-3.5 h-3.5" />,
};

const SLOT_COLORS: Record<number, string> = {
  0:  "text-amber-400",
  1:  "text-teal-400",
  2:  "text-purple-400",
  3:  "text-yellow-400",
  4:  "text-cyan-400",
  5:  "text-indigo-400",
  6:  "text-orange-400",
  7:  "text-rose-400",
  8:  "text-sky-400",
  10: "text-green-400",
  11: "text-violet-400",
  12: "text-yellow-300",
  13: "text-pink-400",
  14: "text-blue-400",
  15: "text-teal-300",
};

const INTERVALS = [
  { label: "1 hour",   ms: 3_600_000 },
  { label: "2 hours",  ms: 7_200_000 },
  { label: "4 hours",  ms: 14_400_000 },
  { label: "8 hours",  ms: 28_800_000 },
  { label: "12 hours", ms: 43_200_000 },
  { label: "24 hours", ms: 86_400_000 },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function NxtCampaignPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [previewSlot, setPreviewSlot]   = useState<number | null>(null);
  const [selectedInterval, setInterval] = useState(14_400_000);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  const { data: stateData, refetch: refetchState } = useQuery<{ state: any; slots: any[] }>({
    queryKey: ["/api/campaign/state"],
    queryFn: () => fetch("/api/campaign/state", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 5_000,
  });

  const { data: history, refetch: refetchHistory } = useQuery<any[]>({
    queryKey: ["/api/campaign/history"],
    queryFn: () => fetch("/api/campaign/history", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 10_000,
  });

  const { data: previewData } = useQuery<{ slot: any }>({
    queryKey: ["/api/campaign/preview", previewSlot],
    queryFn: () => fetch(`/api/campaign/preview/${previewSlot}`, { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    enabled: previewSlot !== null,
  });

  const fireMutation = useMutation({
    mutationFn: async (slotIndex?: number) => {
      const r = await fetch("/api/campaign/fire", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ slotIndex }),
      });
      return r.json();
    },
    onSuccess: (d) => {
      toast({ title: `✅ Fired: "${d.slot}"`, description: `TG:${d.tg?.ok ? "✓" : "✗"} · Nostr:${d.nostr?.ok ? "✓" : "✗"}` });
      qc.invalidateQueries({ queryKey: ["/api/campaign/history"] });
      qc.invalidateQueries({ queryKey: ["/api/campaign/state"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/campaign/start", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ intervalMs: selectedInterval }),
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign started", description: `Every ${fmtMs(selectedInterval)}` });
      qc.invalidateQueries({ queryKey: ["/api/campaign/state"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/campaign/stop", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign paused" });
      qc.invalidateQueries({ queryKey: ["/api/campaign/state"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const state   = stateData?.state;
  const slots   = stateData?.slots ?? [];
  const running = state?.running ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/10 to-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/crowdfund">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { refetchState(); refetchHistory(); }} className="text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Megaphone className="w-9 h-9 text-amber-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              NXT Campaign
            </h1>
          </div>
          <p className="text-amber-300/50 text-sm font-mono">
            Auto-broadcast · Telegram + Nostr · Why NXT · Why stake · WNUSD hardware
          </p>
        </div>

        {/* Status bar */}
        <Card className="bg-slate-900/60 border-amber-500/30 p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${running ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Status</span>
              </div>
              <div className={`font-bold text-sm ${running ? "text-green-400" : "text-slate-500"}`}>
                {running ? "LIVE" : "PAUSED"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Next fire</div>
              <div className="font-mono text-amber-300 font-bold text-sm" data-testid="text-countdown">
                {running ? fmtCountdown(state?.nextFireAt) : "—"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Interval</div>
              <div className="text-white font-bold text-sm">{state ? fmtMs(state.intervalMs) : "—"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total fired</div>
              <div className="text-purple-400 font-bold text-sm">{state?.totalFired ?? 0}</div>
            </div>
          </div>

          {/* Channels */}
          {state?.channels?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {state.channels.map((c: string) => (
                <Badge key={c} className="bg-green-950/40 text-green-400 border-green-500/30 text-[10px]">
                  <Radio className="w-2.5 h-2.5 mr-1" />{c}
                </Badge>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedInterval}
              onChange={e => setInterval(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2"
              data-testid="select-interval"
            >
              {INTERVALS.map(i => (
                <option key={i.ms} value={i.ms}>{i.label}</option>
              ))}
            </select>

            {running ? (
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-950/30"
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                data-testid="button-stop"
              >
                <Square className="w-3.5 h-3.5 mr-1.5" />
                {stopMutation.isPending ? "Stopping…" : "Pause"}
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-green-700 hover:bg-green-600 text-white"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                data-testid="button-start"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                {startMutation.isPending ? "Starting…" : "Start"}
              </Button>
            )}

            <Button
              size="sm"
              className="bg-amber-700 hover:bg-amber-600 text-white"
              onClick={() => fireMutation.mutate(undefined)}
              disabled={fireMutation.isPending}
              data-testid="button-fire-next"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {fireMutation.isPending ? "Sending…" : "Fire next"}
            </Button>
          </div>

          {state?.lastStatus && (
            <div className="mt-3 text-[10px] text-slate-500 font-mono">{state.lastStatus}</div>
          )}
        </Card>

        {/* Message slots */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Message Slots</span>
            <span className="text-[10px] text-slate-600 ml-auto">{slots.length} rotating messages</span>
          </div>

          {slots.map((slot) => {
            const isNext  = state && slots[state.slotIndex % slots.length]?.id === slot.id;
            const isExpanded = expandedSlot === slot.id;
            const preview = previewData?.slot;

            return (
              <Card
                key={slot.id}
                className={`bg-slate-900/60 border p-4 transition-all ${isNext ? "border-amber-500/50" : "border-slate-700/40"}`}
                data-testid={`slot-card-${slot.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 ${SLOT_COLORS[slot.id]}`}>
                    {SLOT_ICONS[slot.id] ?? <Send className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{slot.emoji} {slot.label}</span>
                      {isNext && (
                        <Badge className="bg-amber-950/40 text-amber-400 border-amber-500/30 text-[9px] px-1.5">NEXT</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {slot.tags.map((t: string) => (
                        <span key={t} className="text-[9px] text-slate-600 font-mono">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-amber-400 h-7 px-2"
                      onClick={() => {
                        setPreviewSlot(previewSlot === slot.id ? null : slot.id);
                        setExpandedSlot(expandedSlot === slot.id ? null : slot.id);
                      }}
                      data-testid={`button-preview-${slot.id}`}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-700/70 hover:bg-amber-600 text-white h-7 px-3 text-xs"
                      onClick={() => fireMutation.mutate(slot.id)}
                      disabled={fireMutation.isPending}
                      data-testid={`button-fire-${slot.id}`}
                    >
                      <Send className="w-3 h-3 mr-1" /> Send
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Send className="w-2.5 h-2.5" /> Telegram (HTML)
                      </div>
                      <pre className="text-[10px] text-slate-400 font-mono bg-slate-800/40 rounded-xl p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {preview?.telegram ?? "Loading…"}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5" /> Nostr (plain)
                      </div>
                      <pre className="text-[10px] text-slate-400 font-mono bg-slate-800/40 rounded-xl p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {preview?.nostr ?? "Loading…"}
                      </pre>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Broadcast history */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Broadcast History</h2>
            <span className="text-[10px] text-slate-600 ml-auto">{history?.length ?? 0} entries</span>
          </div>

          {!history?.length ? (
            <div className="text-center py-8 text-slate-600 text-sm">No broadcasts yet — press "Fire next" to test.</div>
          ) : (
            <div className="space-y-1.5">
              {history.map((row: any) => (
                <div key={row.id} className="flex items-center gap-3 bg-slate-800/30 rounded-xl px-3 py-2" data-testid={`hist-row-${row.id}`}>
                  {(() => { const sid = stateData?.slots?.[row.slot]?.id ?? row.slot; return (
                  <div className={`shrink-0 ${SLOT_COLORS[sid] ?? "text-slate-400"}`}>
                    {SLOT_ICONS_SM[sid] ?? <Send className="w-3.5 h-3.5" />}
                  </div>
                  ); })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white font-mono">
                        {stateData?.slots?.[row.slot]?.label ?? `slot ${row.slot}`}
                      </span>
                      <Badge className={`text-[9px] px-1.5 border ${
                        row.status === "ok"    ? "bg-green-950/40 text-green-400 border-green-500/30" :
                        row.status === "error" ? "bg-red-950/40 text-red-400 border-red-500/30" :
                                                  "bg-slate-800 text-slate-500 border-slate-700"
                      }`}>
                        {row.status === "ok" ? <CheckCircle className="w-2.5 h-2.5 mr-1 inline" /> : <XCircle className="w-2.5 h-2.5 mr-1 inline" />}
                        {row.status}
                      </Badge>
                      <span className="text-[10px] text-slate-600">{row.channel}</span>
                      {row.nostrEventId && <span className="text-[10px] text-purple-700 font-mono">{row.nostrEventId.slice(0, 8)}…</span>}
                      {row.telegramMsgId && <span className="text-[10px] text-blue-700">TG #{row.telegramMsgId}</span>}
                    </div>
                    {row.errorMsg && <div className="text-[10px] text-red-400 mt-0.5 font-mono">{row.errorMsg}</div>}
                  </div>
                  <div className="text-[10px] text-slate-600 shrink-0">{fmtTime(row.sentAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* How it works */}
        <Card className="bg-slate-900/40 border-slate-800/50 p-5 mt-6">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">How it works</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] text-slate-500">
            <div>
              <div className="text-amber-400 font-semibold mb-1">📡 Channels</div>
              <ul className="space-y-0.5">
                <li>• Telegram: set <code className="text-slate-400">TELEGRAM_CHANNEL_ID</code> to your channel</li>
                <li>• Nostr: uses <code className="text-slate-400">NOSTR_NSEC</code> to sign + broadcast</li>
                <li>• Falls back to <code className="text-slate-400">TELEGRAM_ADMIN_ID</code> if no channel</li>
              </ul>
            </div>
            <div>
              <div className="text-purple-400 font-semibold mb-1">🔄 Rotation</div>
              <ul className="space-y-0.5">
                <li>• {slots.length} message slots cycle in order</li>
                <li>• Each covers a different NXT angle</li>
                <li>• BTC dip • Staking • WNUSD • Physics</li>
                <li>• Nostr • K1 • Ordinals • Runes • CE pipeline</li>
              </ul>
            </div>
            <div>
              <div className="text-green-400 font-semibold mb-1">⚙️ Env overrides</div>
              <ul className="space-y-0.5">
                <li><code className="text-slate-400">NXT_CAMPAIGN_INTERVAL_MS</code> — custom interval</li>
                <li><code className="text-slate-400">NXT_CAMPAIGN_DISABLED=true</code> — disable on boot</li>
                <li><code className="text-slate-400">TELEGRAM_CHANNEL_ID</code> — target channel</li>
              </ul>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
