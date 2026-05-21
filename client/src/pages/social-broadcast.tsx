import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Radio, Instagram, Youtube, CheckCircle2, XCircle,
  Clock, RefreshCw, SkipForward, Zap, AlertTriangle, ExternalLink,
  Play, Info, ChevronDown, ChevronUp
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlatformStatus {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  credential: string;
  lastPosted?: string;
  totalPosted: number;
}

interface AgentState {
  agentId: string;
  displayName: string;
  band: string;
  channelNotation: string;
  status: "ACTIVE" | "IDLE" | "ERROR" | "BOOTING";
  lastAction: string;
  lastRunAt: number;
  cycleCount: number;
  totalActionsCompleted: number;
  errorCount: number;
  lastError?: string;
  platforms: PlatformStatus[];
}

interface BroadcastJob {
  id: number;
  videoId: number;
  platform: string;
  status: string;
  postUrl: string | null;
  errorMessage: string | null;
  agentNote: string | null;
  attemptCount: number;
  scheduledAt: string;
  broadcastAt: string | null;
  createdAt: string;
  videoCaption: string | null;
  videoFileSize: number | null;
  videoThumbId: string | null;
  videoFileId: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function statusColor(status: string): string {
  switch (status) {
    case "posted":       return "text-green-400 bg-green-400/10 border-green-400/20";
    case "pending":      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    case "broadcasting": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "failed":       return "text-red-400 bg-red-400/10 border-red-400/20";
    case "skipped":      return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    default:             return "text-gray-400 bg-gray-400/10 border-gray-400/20";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "posted":       return <CheckCircle2 size={12} className="text-green-400" />;
    case "pending":      return <Clock size={12} className="text-yellow-400" />;
    case "broadcasting": return <Radio size={12} className="text-blue-400 animate-pulse" />;
    case "failed":       return <XCircle size={12} className="text-red-400" />;
    case "skipped":      return <SkipForward size={12} className="text-gray-500" />;
    default:             return <Clock size={12} className="text-gray-400" />;
  }
}

function PlatformIcon({ id }: { id: string }) {
  if (id === "instagram") return <Instagram size={14} className="text-pink-400" />;
  if (id === "youtube")   return <Youtube size={14} className="text-red-400" />;
  return <Radio size={14} className="text-gray-400" />;
}

function AgentStatusBadge({ status }: { status: AgentState["status"] }) {
  const map: Record<string, string> = {
    ACTIVE:  "bg-green-500/20 text-green-300 border-green-500/30",
    IDLE:    "bg-gray-500/20 text-gray-400 border-gray-500/30",
    ERROR:   "bg-red-500/20 text-red-300 border-red-500/30",
    BOOTING: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${map[status] ?? map.IDLE}`}>
      {status === "ACTIVE" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      {status}
    </span>
  );
}

// ── Job Row ───────────────────────────────────────────────────────────────────

function JobRow({ job, onRetry, onSkip }: {
  job: BroadcastJob;
  onRetry: (id: number) => void;
  onSkip: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Thumb */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 flex items-center justify-center">
          {job.videoThumbId ? (
            <img
              src={`/api/telegram/video/${encodeURIComponent(job.videoThumbId)}/thumb`}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Play size={12} className="text-white/30" />
          )}
        </div>

        {/* Platform */}
        <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
          <PlatformIcon id={job.platform} />
          <span className="text-xs text-gray-300 capitalize">{job.platform === "youtube" ? "YouTube" : "Instagram"}</span>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono w-28 flex-shrink-0 ${statusColor(job.status)}`}>
          <StatusIcon status={job.status} />
          <span>{job.status}</span>
        </div>

        {/* Caption */}
        <div className="flex-1 min-w-0 text-xs text-gray-500 truncate">
          {job.videoCaption || `Video #${job.videoId}`}
          {job.videoFileSize ? <span className="ml-1 text-gray-700">{fmtSize(job.videoFileSize)}</span> : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {job.postUrl && (
            <a href={job.postUrl} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300">
              <ExternalLink size={12} />
            </a>
          )}
          {job.status === "failed" && (
            <button
              data-testid={`retry-broadcast-${job.id}`}
              onClick={() => onRetry(job.id)}
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
              title="Retry"
            >
              <RefreshCw size={12} />
            </button>
          )}
          {(job.status === "pending" || job.status === "failed") && (
            <button
              data-testid={`skip-broadcast-${job.id}`}
              onClick={() => onSkip(job.id)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
              title="Skip"
            >
              <SkipForward size={12} />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="text-gray-600 hover:text-gray-400 transition-colors">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-white/5 text-xs space-y-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-500">
            <span>Scheduled</span>  <span className="text-gray-400">{fmtTime(job.scheduledAt)}</span>
            <span>Attempted</span>  <span className="text-gray-400">{job.attemptCount}×</span>
            {job.broadcastAt && <><span>Processed</span><span className="text-gray-400">{fmtTime(job.broadcastAt)}</span></>}
            {job.agentNote && <><span>Agent note</span><span className="text-gray-400">{job.agentNote}</span></>}
            {job.errorMessage && (
              <>
                <span className="text-red-500">Error</span>
                <span className="text-red-400">{job.errorMessage}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({ p }: { p: PlatformStatus }) {
  return (
    <div className={`rounded-xl border p-4 ${p.connected ? "border-green-500/20 bg-green-500/5" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon id={p.id} />
          <span className="text-sm font-semibold text-white">{p.name}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.connected ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-orange-400 bg-orange-400/10 border-orange-400/20"}`}>
          {p.connected ? "CONNECTED" : "NEEDS SETUP"}
        </span>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <div>Posts sent: <span className="text-gray-300 font-mono">{p.totalPosted}</span></div>
        {p.lastPosted && <div>Last post: <span className="text-gray-400">{fmtTime(p.lastPosted)}</span></div>}
        {!p.connected && (
          <div className="mt-2 p-2 rounded-lg bg-orange-500/5 border border-orange-500/20 text-orange-400 font-mono">
            Set env: <span className="text-orange-300">{p.credential}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SocialBroadcastPage() {
  const qc = useQueryClient();

  const { data: agentData, isLoading: agentLoading } = useQuery<AgentState>({
    queryKey: ["/api/social/agent"],
    refetchInterval: 10_000,
  });

  const { data: broadcastData, isLoading: jobsLoading } = useQuery<{ broadcasts: BroadcastJob[] }>({
    queryKey: ["/api/social/broadcasts"],
    refetchInterval: 10_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/social/retry/${id}`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/social/broadcasts"] }),
  });

  const skipMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/social/broadcasts/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/social/broadcasts"] }),
  });

  const queueMutation = useMutation({
    mutationFn: (videoId: number) => fetch(`/api/social/queue/${videoId}`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/social/broadcasts"] }),
  });

  const agent = agentData;
  const broadcasts = broadcastData?.broadcasts ?? [];

  const statusCounts = broadcasts.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const videoIds = [...new Set(broadcasts.map(b => b.videoId))];

  return (
    <div className="min-h-screen bg-[#070710] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm">
              <ArrowLeft size={14} /> Back
            </button>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-pink-400" />
            <span className="text-sm font-semibold">Social Broadcast Agent</span>
            {agent && <AgentStatusBadge status={agent.status} />}
          </div>
        </div>
        <div className="text-xs text-gray-600 font-mono">{agent?.channelNotation ?? "Ψ(72,18,H)"} · USER band</div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Agent Panel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Bus Router Agent</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Receives VIDEO_RECEIVED events from the Kernel Event Bus and coordinates cross-platform posting.
              </p>
            </div>
            {agent && (
              <div className="text-right text-xs text-gray-600 space-y-0.5">
                <div>Cycles: <span className="text-gray-400 font-mono">{agent.cycleCount}</span></div>
                <div>Actions: <span className="text-gray-400 font-mono">{agent.totalActionsCompleted}</span></div>
                <div>Errors: <span className={`font-mono ${agent.errorCount > 0 ? "text-red-400" : "text-gray-400"}`}>{agent.errorCount}</span></div>
              </div>
            )}
          </div>

          {agent ? (
            <div className="rounded-lg bg-black/40 border border-white/5 px-4 py-2.5 text-xs font-mono text-gray-400">
              <span className="text-gray-600">Last action → </span>{agent.lastAction}
            </div>
          ) : (
            <div className="h-9 rounded-lg bg-white/5 animate-pulse" />
          )}

          {agent?.lastError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2 text-xs text-red-400">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              {agent.lastError}
            </div>
          )}
        </div>

        {/* Platform Cards */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Connectors</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(agent?.platforms ?? []).map(p => (
              <PlatformCard key={p.id} p={p} />
            ))}
            {!agent && [0, 1].map(i => (
              <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>

          {/* Setup note */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300">
            <Info size={13} className="mt-0.5 flex-shrink-0 text-blue-400" />
            <div>
              <strong>To activate a platform:</strong> add the credential as a Replit secret, then republish.
              Instagram needs <code className="bg-black/30 px-1 rounded">INSTAGRAM_ACCESS_TOKEN</code> + <code className="bg-black/30 px-1 rounded">INSTAGRAM_PAGE_ID</code> (from Meta Business Suite).
              YouTube needs <code className="bg-black/30 px-1 rounded">YOUTUBE_CLIENT_ID</code> + <code className="bg-black/30 px-1 rounded">YOUTUBE_CLIENT_SECRET</code> (from Google Cloud Console).
              Once set, the agent auto-posts every new Telegram video to both platforms.
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Jobs", value: broadcasts.length, color: "text-white" },
            { label: "Pending",    value: statusCounts.pending ?? 0, color: "text-yellow-400" },
            { label: "Posted",     value: statusCounts.posted ?? 0,  color: "text-green-400" },
            { label: "Failed",     value: statusCounts.failed ?? 0,  color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Manual Queue */}
        {videoIds.length === 0 && !jobsLoading && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center space-y-3">
            <Zap size={28} className="mx-auto text-white/20" />
            <p className="text-gray-500 text-sm">No broadcasts queued yet.</p>
            <p className="text-gray-600 text-xs">
              Send a video to <a href="https://t.me/Nexuswnspbot" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@Nexuswnspbot</a> — the agent will auto-queue it when it arrives.
            </p>
            <Link href="/videos">
              <button className="mt-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition-colors">
                View Videos →
              </button>
            </Link>
          </div>
        )}

        {/* Broadcast Log */}
        {broadcasts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Broadcast Log</h3>
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ["/api/social/broadcasts"] })}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                <RefreshCw size={10} /> Refresh
              </button>
            </div>
            <div className="space-y-2">
              {jobsLoading
                ? [...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)
                : broadcasts.map(job => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onRetry={id => retryMutation.mutate(id)}
                    onSkip={id => skipMutation.mutate(id)}
                  />
                ))
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
