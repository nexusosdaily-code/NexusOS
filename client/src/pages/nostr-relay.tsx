import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Radio, Send, Zap, Shield, Globe, Hash,
  RefreshCw, CheckCircle2, AlertCircle, Waves, Copy
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function shortId(id: string) { return id.slice(0, 8) + "…" + id.slice(-4); }

function tagVal(tags: string[][], key: string) {
  return tags.find(t => t[0] === key)?.[1] ?? null;
}

function eventTypeLabel(content: string, tags: string[][]) {
  const t = tags.map(t => t[1]);
  if (t.includes("spectral_registration")) return { label: "Spectral Reg", color: "#a855f7" };
  if (t.includes("governance_proposal"))   return { label: "Governance",   color: "#3b82f6" };
  if (t.includes("nxt_transfer"))          return { label: "NXT Transfer", color: "#f59e0b" };
  if (t.includes("kernel_boot"))           return { label: "Kernel Boot",  color: "#22d3ee" };
  if (t.includes("wnsp_channel"))          return { label: "WNSP Channel", color: "#34d399" };
  return { label: "Note", color: "#6b7280" };
}

const EVENT_TYPES = [
  { value: "note",                  label: "📝 General note" },
  { value: "spectral_registration", label: "🔮 Spectral registration" },
  { value: "governance_proposal",   label: "🏛️ Governance proposal" },
  { value: "nxt_transfer",         label: "⚡ NXT transfer" },
  { value: "kernel_boot",          label: "🚀 Kernel boot" },
  { value: "wnsp_channel",         label: "📡 WNSP channel" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function NostrRelayPage() {
  const qc = useQueryClient();
  const [tab, setTab]       = useState<"feed" | "publish" | "global">("feed");
  const [content, setContent] = useState("");
  const [psi, setPsi]       = useState("Ψ(52,3,V)");
  const [evtKind, setEvtKind] = useState("note");
  const [copied, setCopied] = useState(false);
  const [lastPublish, setLastPublish] = useState<{ id: string; relays: string[] } | null>(null);

  const { data: status } = useQuery<{ npub: string; pubkeyHex: string; relays: string[] }>({
    queryKey: ["/api/nostr/status"],
    refetchInterval: 60_000,
  });

  const { data: feed, isLoading: feedLoading, refetch: refetchFeed } = useQuery<any[]>({
    queryKey: ["/api/nostr/feed"],
    enabled: tab === "feed",
    refetchInterval: 30_000,
  });

  const { data: global, isLoading: globalLoading, refetch: refetchGlobal } = useQuery<any[]>({
    queryKey: ["/api/nostr/global"],
    enabled: tab === "global",
    refetchInterval: 30_000,
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/nostr/publish", {
        kind: evtKind,
        content,
        psi: evtKind !== "note" ? psi : undefined,
        uri: evtKind !== "note" ? `wnsp://${psi}/nexus` : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setLastPublish(data);
      setContent("");
      qc.invalidateQueries({ queryKey: ["/api/nostr/feed"] });
      qc.invalidateQueries({ queryKey: ["/api/nostr/global"] });
    },
  });

  function copyNpub() {
    if (status?.npub) {
      navigator.clipboard.writeText(status.npub);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const events = tab === "feed" ? (feed ?? []) : (global ?? []);
  const isLoading = tab === "feed" ? feedLoading : globalLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/wnsp">
            <button className="text-gray-500 hover:text-purple-400 transition-colors" aria-label="Back to WNSP">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <Radio className="w-5 h-5 text-purple-400" />
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Nostr Relay Bridge</h1>
            <div className="text-[10px] text-purple-400/60 mt-0.5">WNSP spectral events → Nostr relay mesh</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px]"
            style={{ background: "rgba(168,85,247,0.10)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.20)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            live
          </div>
        </div>

        {/* Identity card */}
        {status && (
          <Card className="bg-slate-900/60 border-purple-500/20 p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">NexusOS Nostr identity</div>
                <div className="font-mono text-purple-300 text-xs truncate">{status.npub}</div>
                <div className="font-mono text-gray-600 text-[10px] truncate mt-0.5">hex: {status.pubkeyHex.slice(0, 24)}…</div>
              </div>
              <button onClick={copyNpub}
                className="shrink-0 p-1.5 rounded text-gray-500 hover:text-purple-300 transition-colors" aria-label="Copy Nostr public key">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {status.relays.map(r => (
                <span key={r} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-gray-500 border border-slate-700">
                  {r.replace("wss://", "")}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-slate-900/60 border border-slate-800">
          {[
            { id: "feed",    label: "My feed", icon: Waves },
            { id: "publish", label: "Publish",  icon: Send },
            { id: "global",  label: "Global",   icon: Globe },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id}
              onClick={() => setTab(id as any)}
              data-testid={`tab-${id}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                tab === id
                  ? "bg-purple-600 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Publish tab */}
        {tab === "publish" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-4 h-4 text-purple-400" />
              <h2 className="text-white font-semibold text-sm">Publish WNSP event to Nostr</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Event type</label>
                <select
                  value={evtKind}
                  onChange={e => setEvtKind(e.target.value)}
                  data-testid="select-event-type"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                  {EVENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {evtKind !== "note" && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Ψ channel</label>
                  <input
                    value={psi}
                    onChange={e => setPsi(e.target.value)}
                    placeholder="Ψ(52,3,V)"
                    data-testid="input-psi-channel"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                  <div className="text-[10px] text-gray-600 mt-1">URI: wnsp://{psi}/nexus</div>
                </div>
              )}

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Content</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  placeholder="Broadcast a WNSP spectral event to the Nostr relay mesh…"
                  data-testid="textarea-content"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-purple-500"
                />
                <div className="text-[10px] text-gray-600 mt-1">{content.length} chars · will be tagged #nexusos #wnsp #nxt</div>
              </div>

              <button
                onClick={() => publishMut.mutate()}
                disabled={!content.trim() || publishMut.isPending}
                data-testid="button-publish"
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: "rgba(168,85,247,0.20)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.30)" }}
              >
                {publishMut.isPending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Publishing to relays…</>
                ) : (
                  <><Send className="w-4 h-4" />Broadcast to Nostr</>
                )}
              </button>

              {publishMut.isError && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {(publishMut.error as Error)?.message ?? "Publish failed"}
                </div>
              )}

              {lastPublish && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Published successfully
                  </div>
                  <div className="font-mono text-[10px] text-gray-500 mb-1">event id: {lastPublish.id}</div>
                  <div className="flex flex-wrap gap-1">
                    {lastPublish.relays.map(r => (
                      <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-mono border border-green-500/20">
                        ✓ {r.replace("wss://", "")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Feed/Global tabs */}
        {tab !== "publish" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {tab === "feed" ? "Events from NexusOS identity" : "Global #nexusos events"}
              </div>
              <button
                onClick={() => tab === "feed" ? refetchFeed() : refetchGlobal()}
                className="text-gray-600 hover:text-purple-400 transition-colors"
                aria-label="Refresh feed">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-lg bg-slate-900/40 animate-pulse border border-slate-800" />
                ))}
              </div>
            )}

            {!isLoading && events.length === 0 && (
              <Card className="bg-slate-900/40 border-slate-800 p-8 text-center">
                <Radio className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <div className="text-gray-600 text-sm">No events yet</div>
                <div className="text-gray-700 text-xs mt-1">
                  {tab === "feed"
                    ? "Publish your first WNSP event to see it here"
                    : "No #nexusos events found on the relay mesh"}
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {events.map((evt: any) => {
                const { label, color } = eventTypeLabel(evt.content, evt.tags ?? []);
                const psiTag = tagVal(evt.tags ?? [], "wnsp");
                const uriTag = tagVal(evt.tags ?? [], "r");
                return (
                  <Card key={evt.id}
                    className="bg-slate-900/60 border-slate-700/40 p-4 hover:border-purple-500/30 transition-all"
                    data-testid={`card-event-${evt.id}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono border"
                          style={{ color, background: `${color}15`, borderColor: `${color}30` }}>
                          {label}
                        </span>
                        {psiTag && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {psiTag}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-600 shrink-0">{timeAgo(evt.created_at)}</div>
                    </div>

                    <div className="text-sm text-gray-200 leading-relaxed mb-2 whitespace-pre-wrap break-words">
                      {evt.content}
                    </div>

                    {uriTag && (
                      <div className="font-mono text-[10px] text-purple-400/60 mb-2">{uriTag}</div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-gray-600">
                      <Hash className="w-3 h-3" />
                      <span className="font-mono">{shortId(evt.id)}</span>
                      {(evt.tags ?? []).filter((t: string[]) => t[0] === "t").map((t: string[]) => (
                        <span key={t[1]} className="text-gray-700">#{t[1]}</span>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-900/30">
          <div className="text-[10px] text-gray-600 text-center leading-relaxed">
            WNSP spectral events are signed with the NexusOS nsec and broadcast to{" "}
            <span className="text-purple-400/60">{DEFAULT_RELAYS.length} Nostr relays</span>.
            Each event carries <span className="font-mono text-gray-500">#nexusos #wnsp #nxt</span> tags
            and an optional <span className="font-mono text-gray-500">Ψ(wdm,oam,pol)</span> channel label.
            Any Nostr client can read and subscribe to NexusOS events.
          </div>
        </div>

      </div>
    </div>
  );
}

const DEFAULT_RELAYS = [
  "relay.damus.io", "nos.lol", "relay.nostr.band",
  "nostr.wine", "relay.snort.social", "nostr.mom",
];
