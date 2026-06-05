import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ArrowLeft, Copy, CheckCircle, Zap, Link2, Link2Off, RefreshCw,
  MessageSquare, Bot, Coins, Lock, TrendingUp, Clock, ExternalLink,
  Shield, Radio,
} from "lucide-react";

function fmtTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
      data-testid="btn-copy"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const COMMANDS = [
  { cmd: "!help",                icon: <Bot className="w-4 h-4" />,        label: "Help",    desc: "List all commands" },
  { cmd: "!balance",             icon: <Coins className="w-4 h-4" />,      label: "Balance", desc: "Show sats + NXT balance" },
  { cmd: "!invoice <sats>",      icon: <Zap className="w-4 h-4" />,        label: "Invoice", desc: "Get a Lightning deposit invoice" },
  { cmd: "!buynxt <sats>",       icon: <TrendingUp className="w-4 h-4" />, label: "Buy NXT", desc: "Swap sats → NXT (1,000 sats = 1 NXT)" },
  { cmd: "!stake <sats> [days]", icon: <Lock className="w-4 h-4" />,       label: "Stake",   desc: "Stake sats for NXT yield (7/14/30/90/180/365 days)" },
];

const STATUS_COLORS: Record<string, string> = {
  ok:      "text-green-400 bg-green-950/40 border-green-500/30",
  error:   "text-red-400 bg-red-950/40 border-red-500/30",
  unknown: "text-amber-400 bg-amber-950/40 border-amber-500/30",
};

const CMD_ICONS: Record<string, JSX.Element> = {
  "!invoice": <Zap className="w-3.5 h-3.5 text-yellow-400" />,
  "!buynxt":  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />,
  "!stake":   <Lock className="w-3.5 h-3.5 text-teal-400" />,
  "!balance": <Coins className="w-3.5 h-3.5 text-amber-400" />,
  "!help":    <Bot className="w-3.5 h-3.5 text-cyan-400" />,
};

export default function NostrBridgePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [inputNpub, setInputNpub] = useState("");

  const { data: statusData } = useQuery<{ npub: string; pubkeyHex: string; relays: string[] }>({
    queryKey: ["/api/nostr/status"],
    queryFn: () => fetch("/api/nostr/status", { credentials: "include" }).then(r => r.json()),
  });

  const { data: myNpubData, isLoading: npubLoading } = useQuery<{ npub: string | null }>({
    queryKey: ["/api/nostr/my-npub"],
    queryFn: () => fetch("/api/nostr/my-npub", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
  });

  const { data: dmLog, isLoading: logLoading, refetch: refetchLog } = useQuery<any[]>({
    queryKey: ["/api/nostr/dm-log"],
    queryFn: () => fetch("/api/nostr/dm-log", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    refetchInterval: 20_000,
  });

  const linkMutation = useMutation({
    mutationFn: async (npub: string) => {
      const r = await fetch("/api/nostr/link-npub", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ npub }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to link");
      return j;
    },
    onSuccess: () => {
      toast({ title: "Nostr npub linked!", description: "You can now DM the NexusOS bot." });
      qc.invalidateQueries({ queryKey: ["/api/nostr/my-npub"] });
      setInputNpub("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/nostr/link-npub", {
        method: "DELETE", credentials: "include", headers: getAuthHeaders(),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to unlink");
      return j;
    },
    onSuccess: () => {
      toast({ title: "npub unlinked" });
      qc.invalidateQueries({ queryKey: ["/api/nostr/my-npub"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const linkedNpub = myNpubData?.npub ?? null;
  const botNpub    = statusData?.npub ?? "";
  const relays     = statusData?.relays ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => refetchLog()} className="text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Radio className="w-9 h-9 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Nostr Bridge
            </h1>
          </div>
          <p className="text-purple-300/60 text-sm font-mono">
            NexusOS ↔ Nostr · DM bot · npub-linked wallets
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Bot identity card */}
          <Card className="bg-slate-900/60 border-purple-500/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-purple-400 uppercase tracking-widest">NexusOS Bot</h2>
            </div>
            {botNpub ? (
              <div className="space-y-3">
                <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-3">
                  <div className="text-[10px] text-purple-400/60 uppercase tracking-wider mb-1">Bot npub</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-purple-200 text-xs break-all flex-1">{botNpub}</span>
                    <CopyBtn text={botNpub} />
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-400 mb-1">Active on {relays.length} relays:</div>
                  {relays.slice(0, 4).map(r => (
                    <div key={r} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="font-mono">{r.replace("wss://", "")}</span>
                    </div>
                  ))}
                  {relays.length > 4 && <div className="text-slate-600 pl-3">+{relays.length - 4} more</div>}
                </div>
                <a
                  href={`https://njump.me/${botNpub}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                  data-testid="link-view-on-njump"
                >
                  <ExternalLink className="w-3 h-3" /> View on njump.me
                </a>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">Bot npub not configured (NOSTR_NSEC missing)</div>
            )}
          </Card>

          {/* Link your npub */}
          <Card className="bg-slate-900/60 border-indigo-500/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Your Nostr Identity</h2>
            </div>

            {npubLoading ? (
              <div className="text-slate-500 text-sm">Loading…</div>
            ) : linkedNpub ? (
              <div className="space-y-3">
                <div className="bg-green-950/30 border border-green-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Linked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-green-200 text-xs break-all flex-1">{linkedNpub}</span>
                    <CopyBtn text={linkedNpub} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Your npub is linked. DM the NexusOS bot from any Nostr client to manage your wallet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-950/30"
                  onClick={() => unlinkMutation.mutate()}
                  disabled={unlinkMutation.isPending}
                  data-testid="button-unlink-npub"
                >
                  <Link2Off className="w-3.5 h-3.5 mr-2" />
                  {unlinkMutation.isPending ? "Unlinking…" : "Unlink npub"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Paste your Nostr npub to link your identity. Once linked, DM the bot from any Nostr client (Damus, Amethyst, Snort) to manage sats, NXT, and staking.
                </p>
                <Input
                  placeholder="npub1…"
                  value={inputNpub}
                  onChange={e => setInputNpub(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                  data-testid="input-npub"
                />
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                  onClick={() => linkMutation.mutate(inputNpub.trim())}
                  disabled={!inputNpub.trim().startsWith("npub1") || linkMutation.isPending}
                  data-testid="button-link-npub"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  {linkMutation.isPending ? "Linking…" : "Link npub"}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Command reference */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Bot Commands</h2>
            <span className="text-[10px] text-slate-600 ml-auto">Send as DMs from any Nostr client</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COMMANDS.map(c => (
              <div key={c.cmd} className="flex items-start gap-3 bg-slate-800/40 rounded-xl p-3">
                <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0 text-cyan-400">
                  {c.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-xs font-mono text-cyan-300 font-bold">{c.cmd}</code>
                  </div>
                  <div className="text-[11px] text-slate-500">{c.desc}</div>
                </div>
                <CopyBtn text={c.cmd.split(" ")[0]} />
              </div>
            ))}
          </div>
          <div className="mt-4 bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Example session</div>
            {[
              { dir: "→", text: "!balance",                     color: "text-slate-300" },
              { dir: "←", text: "💰 nexus balance:\n⚡ 244,001,000,118 sats\n🔶 244,001.0000 NXT", color: "text-purple-300" },
              { dir: "→", text: "!invoice 50000",               color: "text-slate-300" },
              { dir: "←", text: "⚡ Invoice for 50,000 sats:\nlnbc500u1…\nExpires in 1 hour.", color: "text-purple-300" },
              { dir: "→", text: "!stake 10000 30",              color: "text-slate-300" },
              { dir: "←", text: "🔒 Staked 10,000 sats for 30 days\n📈 APY: 28%\n💎 Yield: 2.8000 NXT", color: "text-purple-300" },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${row.dir === "→" ? "text-slate-500" : "text-purple-500"}`}>{row.dir}</span>
                <pre className={`text-[10px] font-mono whitespace-pre-wrap ${row.color}`}>{row.text}</pre>
              </div>
            ))}
          </div>
        </Card>

        {/* DM history */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Command History</h2>
            <span className="text-[10px] text-slate-600 ml-auto">
              {dmLog ? `${dmLog.length} entries` : "—"}
            </span>
          </div>

          {logLoading ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading…</div>
          ) : !dmLog?.length ? (
            <div className="text-center py-10 text-slate-600 text-sm">
              No DM commands yet.<br />
              <span className="text-[11px]">Link your npub and DM the bot to get started.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {dmLog.map((row: any) => (
                <div key={row.id} className="flex items-start gap-3 bg-slate-800/40 rounded-xl px-3 py-2.5" data-testid={`dm-row-${row.id}`}>
                  <div className="w-6 h-6 rounded-full bg-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                    {CMD_ICONS[row.command] ?? <MessageSquare className="w-3 h-3 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-white">{row.command} {row.args}</code>
                      <Badge className={`text-[9px] px-1.5 py-0 border ${STATUS_COLORS[row.status] ?? STATUS_COLORS.unknown}`}>
                        {row.status}
                      </Badge>
                    </div>
                    {row.response && (
                      <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap mt-0.5 truncate max-h-10 overflow-hidden">
                        {row.response}
                      </pre>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 shrink-0 mt-0.5">{fmtTime(row.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
