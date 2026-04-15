import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getAuthHeaders } from "@/lib/queryClient";
import {
  ArrowLeft, Github, Star, GitFork, AlertCircle, Eye, Lock,
  Globe, RefreshCw, ExternalLink, Atom, Clock, GitCommit,
  GitPullRequest, Tag, Zap, Users, BookOpen, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── helpers ──────────────────────────────────────────────────────────────────
function nmToColor(nm: number): string {
  if (nm < 380) return "#9400D3";
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#ddcc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}
function relTime(s: string): string {
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60)   return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400)return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  C: "#555555", HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051",
};
function langColor(l: string | null): string {
  return l ? (LANG_COLORS[l] ?? "#94a3b8") : "#94a3b8";
}

// ── Event type display ────────────────────────────────────────────────────────
function eventLabel(type: string): { label: string; Icon: any; color: string } {
  switch (type) {
    case "PushEvent":        return { label: "Push",          Icon: GitCommit,     color: "#22d3ee" };
    case "PullRequestEvent": return { label: "Pull Request",  Icon: GitPullRequest,color: "#a78bfa" };
    case "CreateEvent":      return { label: "Create",        Icon: Tag,           color: "#34d399" };
    case "WatchEvent":       return { label: "Starred",       Icon: Star,          color: "#fbbf24" };
    case "ForkEvent":        return { label: "Fork",          Icon: GitFork,       color: "#f472b6" };
    case "IssuesEvent":      return { label: "Issue",         Icon: AlertCircle,   color: "#f97316" };
    default:                 return { label: type.replace("Event",""), Icon: Activity, color: "#94a3b8" };
  }
}

// ── Repo card ─────────────────────────────────────────────────────────────────
function RepoCard({ repo }: { repo: any }) {
  const color = nmToColor(repo.wnsp.nm);
  return (
    <div
      data-testid={`repo-card-${repo.id}`}
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all group"
      style={{ borderLeft: `3px solid ${color}40` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {repo.private
            ? <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            : <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          }
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-semibold text-sm truncate hover:text-cyan-400 transition-colors"
            data-testid={`link-repo-${repo.id}`}
          >
            {repo.name}
          </a>
          {repo.fork && <Badge variant="outline" className="text-xs py-0 border-slate-700 text-slate-500">fork</Badge>}
        </div>
        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400 flex-shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {repo.description && (
        <p className="text-slate-400 text-xs mb-3 line-clamp-2">{repo.description}</p>
      )}

      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {repo.topics.slice(0, 4).map((t: string) => (
            <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-blue-950/50 border border-blue-800/40 text-blue-400">{t}</span>
          ))}
        </div>
      )}

      {/* WNSP spectral channel */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg mb-3 text-xs font-mono"
        style={{ background: `${color}10`, border: `1px solid ${color}25` }}
      >
        <Atom className="w-3 h-3 flex-shrink-0" style={{ color }} />
        <span style={{ color }}>{repo.wnsp.psi}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">{repo.wnsp.nm.toFixed(1)} nm</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500 truncate">{repo.wnsp.uri}</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: langColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stargazers_count}</span>
        <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
        {repo.open_issues_count > 0 && (
          <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />{repo.open_issues_count}</span>
        )}
        <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{relTime(repo.pushed_at)}</span>
      </div>
    </div>
  );
}

// ── Activity feed item ────────────────────────────────────────────────────────
function EventItem({ event }: { event: any }) {
  const { label, Icon, color } = eventLabel(event.type);
  const repo = event.repo?.name ?? "—";
  const payload = event.payload ?? {};

  let detail = "";
  if (event.type === "PushEvent") {
    const commits = payload.commits ?? [];
    detail = commits.length
      ? commits[0].message?.split("\n")[0].slice(0, 80)
      : `${payload.size ?? 0} commit(s)`;
  } else if (event.type === "PullRequestEvent") {
    detail = payload.pull_request?.title?.slice(0, 80) ?? payload.action ?? "";
  } else if (event.type === "CreateEvent") {
    detail = `${payload.ref_type} ${payload.ref ?? ""}`.trim();
  } else if (event.type === "IssuesEvent") {
    detail = payload.issue?.title?.slice(0, 80) ?? payload.action ?? "";
  }

  return (
    <div data-testid={`event-${event.id}`} className="flex items-start gap-3 py-2.5 border-b border-slate-800 last:border-0">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}18`, color }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span style={{ color }} className="font-semibold">{label}</span>
          <span className="text-slate-600">in</span>
          <a
            href={`https://github.com/${repo}`}
            target="_blank" rel="noopener noreferrer"
            className="text-slate-300 hover:text-cyan-400 font-mono transition-colors truncate max-w-[200px]"
          >
            {repo}
          </a>
          <span className="text-slate-600 ml-auto">{relTime(event.created_at)}</span>
        </div>
        {detail && <p className="text-slate-500 text-xs mt-0.5 truncate">{detail}</p>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GitHubBridgePage() {
  const [tab, setTab] = useState<"repos" | "activity">("repos");
  const [search, setSearch] = useState("");

  const ghFetch = (path: string) =>
    fetch(path, { credentials: "include", headers: getAuthHeaders() }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Request failed");
      return j;
    });

  const { data: profile, isLoading: profileLoading, isError: profileError, error: profileErr } =
    useQuery({ queryKey: ["/api/github/profile"], queryFn: () => ghFetch("/api/github/profile"), retry: 1 });

  const { data: reposData, isLoading: reposLoading } =
    useQuery({ queryKey: ["/api/github/repos"], queryFn: () => ghFetch("/api/github/repos"), retry: 1, enabled: tab === "repos" });

  const { data: activityData, isLoading: activityLoading } =
    useQuery({ queryKey: ["/api/github/activity"], queryFn: () => ghFetch("/api/github/activity"), retry: 1, enabled: tab === "activity" });

  const repos: any[] = (reposData?.repos ?? []).filter((r: any) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const events: any[] = activityData?.events ?? [];

  const user = profile?.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">GitHub Bridge</h1>
            <p className="text-slate-400 text-sm">Repositories linked to WNSP spectral channels via Ψ encoding</p>
          </div>
        </div>

        {/* error state */}
        {profileError && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-5 mb-6 text-center">
            <Github className="w-10 h-10 text-red-400 mx-auto mb-2 opacity-60" />
            <p className="text-red-400 font-semibold">GitHub not connected</p>
            <p className="text-slate-400 text-sm mt-1">{(profileErr as any)?.message ?? "Unable to reach GitHub API."}</p>
            <p className="text-slate-500 text-xs mt-2">Ensure GITHUB_PAT is set in your environment secrets.</p>
          </div>
        )}

        {/* profile card */}
        {!profileError && user && (
          <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-16 h-16 rounded-full border-2 border-slate-700 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-white font-bold text-lg">{user.name ?? user.login}</span>
                <a
                  href={user.html_url} target="_blank" rel="noopener noreferrer"
                  className="text-slate-400 hover:text-cyan-400 text-sm font-mono transition-colors"
                  data-testid="link-github-profile"
                >
                  @{user.login} <ExternalLink className="w-3 h-3 inline" />
                </a>
              </div>
              {user.bio && <p className="text-slate-400 text-sm mb-2">{user.bio}</p>}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{profile?.repoCount} repos</span>
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" />{profile?.totalStars} stars</span>
                <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{profile?.totalForks} forks</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{user.followers} followers</span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-xs text-slate-500 mb-1">GitHub → WNSP</div>
              <div className="text-xs font-mono text-cyan-400">
                {(() => { try { const enc = { psi: "Ψ(128,0,H)" }; return enc.psi; } catch { return "—"; } })()}
              </div>
            </div>
          </div>
        )}

        {/* tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-0">
          {([["repos", "Repositories"], ["activity", "Activity"]] as const).map(([t, label]) => (
            <button
              key={t}
              data-testid={`tab-${t}`}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
              {t === "repos" && reposData && (
                <span className="ml-1.5 text-xs opacity-60">({reposData.total})</span>
              )}
            </button>
          ))}
        </div>

        {/* repos tab */}
        {tab === "repos" && (
          <>
            <div className="mb-4">
              <input
                data-testid="input-search-repos"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter repositories…"
                className="w-full sm:w-72 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 outline-none focus:border-slate-500"
              />
            </div>
            {reposLoading ? (
              <div className="text-center py-20 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
                <p>Loading repositories…</p>
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No repositories found.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {repos.map(r => <RepoCard key={r.id} repo={r} />)}
              </div>
            )}
          </>
        )}

        {/* activity tab */}
        {tab === "activity" && (
          activityLoading ? (
            <div className="text-center py-20 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
              <p>Loading activity…</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No recent public activity.</p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 divide-y divide-slate-800">
              {events.map(e => <EventItem key={e.id} event={e} />)}
            </div>
          )
        )}

        <p className="text-center text-slate-700 text-xs mt-8 font-mono">
          Each repository name encodes to a unique Ψ channel · WNSP-URI v1.0
        </p>
      </div>
    </div>
  );
}
