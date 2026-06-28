import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Activity, Globe, Bot, AlertTriangle, Radio, RefreshCw, ShieldAlert, Skull } from "lucide-react";

type ThreatEntry = {
  path: string; country: string; userAgent: string;
  botName: string; hits: number; firstSeen: string; lastSeen: string;
};

type TrafficSummary = {
  totalHits: number;
  humanHits: number;
  botHits:   number;
  topPages:  { path: string; hits: number; bots: number; humans: number }[];
  topBots:   { name: string; hits: number }[];
  countries: { country: string; hits: number }[];
  seoIssues: { path: string; hits404: number }[];
  recentHits: {
    path: string; method: string; statusCode: number;
    country: string | null; isBot: boolean; botName: string | null;
    userAgent: string | null; createdAt: string;
  }[];
  threats: ThreatEntry[];
  threatSummary: {
    totalProbes: number; uniquePaths: number;
    countriesProbing: number; uniqueIps: number;
  };
  window: string;
};

const WINDOWS = ["1h", "24h", "7d", "30d"] as const;
type Window = typeof WINDOWS[number];

function StatCard({ icon: Icon, label, value, sub, color = "cyan" }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    cyan:   "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    amber:  "text-amber-400 border-amber-500/20 bg-amber-500/5",
    red:    "text-red-400 border-red-500/20 bg-red-500/5",
    green:  "text-green-400 border-green-500/20 bg-green-500/5",
    purple: "text-purple-400 border-purple-500/20 bg-purple-500/5",
    orange: "text-orange-400 border-orange-500/20 bg-orange-500/5",
  };
  return (
    <div className={`rounded-xl border p-4 space-y-1 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <div className="text-[11px] opacity-60">{sub}</div>}
    </div>
  );
}

function StatusBadge({ code }: { code: number }) {
  const color = code < 300 ? "text-green-400" : code < 400 ? "text-cyan-400" : code < 500 ? "text-amber-400" : "text-red-400";
  return <span className={`font-mono text-xs ${color}`}>{code}</span>;
}

function timeSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h  = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TAB_LIST = ["pages", "bots", "countries", "threats", "seo", "live"] as const;
type Tab = typeof TAB_LIST[number];

export default function NexusAnalyticsPage() {
  const [tab, setTab]       = useState<Tab>("pages");
  const [window, setWindow] = useState<Window>("24h");

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<TrafficSummary>({
    queryKey: ["/api/analytics/traffic", window],
    queryFn:  async () => {
      const r = await fetch(`/api/analytics/traffic?window=${window}`);
      if (!r.ok) throw new Error("Unauthorised");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const botPct     = data ? Math.round((data.botHits / Math.max(data.totalHits, 1)) * 100) : 0;
  const updated    = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";
  const probeCount = data?.threatSummary?.totalProbes ?? 0;

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/hub" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">NexusOS Traffic Monitor</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-slate-600 font-mono">Updated {updated}</span>
            <button onClick={() => refetch()} className="text-slate-500 hover:text-slate-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Window selector */}
        <div className="flex items-center gap-2">
          {WINDOWS.map(w => (
            <button key={w} onClick={() => setWindow(w)}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                window === w
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-800 text-slate-500 hover:text-slate-300"
              }`}>
              {w}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-slate-600 font-mono">
            SYSTEM operator view · Ψ(52,20,H)
          </span>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-slate-500 text-sm">Loading traffic data…</div>
        )}

        {data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Activity}     label="Total Hits"    value={data.totalHits}     sub={`Last ${window}`}         color="cyan" />
              <StatCard icon={Globe}        label="Human Visits"  value={data.humanHits}     sub={`${100 - botPct}% of traffic`} color="green" />
              <StatCard icon={Bot}          label="Bot Hits"      value={data.botHits}       sub={`${botPct}% of traffic`}  color="amber" />
              <StatCard icon={ShieldAlert}  label="Probe Alerts"  value={probeCount}          sub="Honeypot triggers"        color={probeCount > 0 ? "orange" : "green"} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
              {TAB_LIST.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-xs font-mono capitalize whitespace-nowrap transition-all border-b-2 -mb-px ${
                    tab === t
                      ? "border-cyan-500 text-cyan-300"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}>
                  {t === "seo" ? "SEO Issues" : t === "live" ? "Live Feed" : t === "threats" ? "⚠ Threats" : t}
                </button>
              ))}
            </div>

            {/* Pages tab */}
            {tab === "pages" && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-2 px-3 text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                  <span>Path</span><span className="text-right">Hits</span>
                  <span className="text-right">Human</span><span className="text-right">Bot</span>
                </div>
                {data.topPages.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-2 px-3 py-2.5 rounded-lg border border-slate-800/60 bg-slate-900/30 hover:border-slate-700 transition-colors items-center">
                    <span className="font-mono text-xs text-slate-300 truncate">{p.path}</span>
                    <span className="text-right text-xs font-bold text-white">{p.hits}</span>
                    <span className="text-right text-xs text-green-400">{p.humans}</span>
                    <span className="text-right text-xs text-amber-400">{p.bots}</span>
                  </div>
                ))}
                {data.topPages.length === 0 && <p className="text-slate-600 text-sm text-center py-8">No page data yet — traffic logging active.</p>}
              </div>
            )}

            {/* Bots tab */}
            {tab === "bots" && (
              <div className="space-y-2">
                {data.topBots.length === 0 && <p className="text-slate-600 text-sm text-center py-8">No bots detected in this window.</p>}
                {data.topBots.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/10 bg-amber-500/5">
                    <Bot className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm text-slate-200 flex-1">{b.name}</span>
                    <span className="text-sm font-bold text-amber-400">{b.hits} hits</span>
                  </div>
                ))}
                {data.topBots.length > 0 && (
                  <p className="text-[11px] text-slate-600 pt-2">
                    All bots listed hit authenticated endpoints and received 401 responses. No data was exposed.
                  </p>
                )}
              </div>
            )}

            {/* Countries tab */}
            {tab === "countries" && (
              <div className="space-y-2">
                {data.countries.map((c, i) => {
                  const pct = Math.round((c.hits / Math.max(data.totalHits, 1)) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-mono">{c.country || "Unknown"}</span>
                        <span className="text-slate-400">{c.hits} hits · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500/60 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {data.countries.length === 0 && <p className="text-slate-600 text-sm text-center py-8">No country data yet — requires Cloudflare headers.</p>}
              </div>
            )}

            {/* Threats tab */}
            {tab === "threats" && (
              <div className="space-y-4">
                {/* Threat summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={Skull}        label="Total Probes"      value={data.threatSummary.totalProbes}       color="red" />
                  <StatCard icon={ShieldAlert}   label="Paths Probed"     value={data.threatSummary.uniquePaths}       color="orange" />
                  <StatCard icon={Globe}         label="Probing Countries" value={data.threatSummary.countriesProbing}  color="amber" />
                  <StatCard icon={Activity}      label="Unique IPs"       value={data.threatSummary.uniqueIps}         color="purple" />
                </div>

                {data.threats.length === 0 ? (
                  <div className="text-center py-16 space-y-2">
                    <ShieldAlert className="w-8 h-8 text-green-500 mx-auto opacity-60" />
                    <p className="text-slate-400 text-sm">No honeypot triggers in this window.</p>
                    <p className="text-slate-600 text-xs">Traps are active. Any probe of admin, config, or exploit paths will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_4rem_5rem_5rem] gap-2 px-3 text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                      <span>Probed Path</span>
                      <span className="text-right">Hits</span>
                      <span className="text-right">Country</span>
                      <span className="text-right">Last Seen</span>
                    </div>
                    {data.threats.map((t, i) => (
                      <div key={i} className="grid grid-cols-[1fr_4rem_5rem_5rem] gap-2 px-3 py-3 rounded-lg border border-red-500/20 bg-red-500/5 items-center">
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-red-300 truncate block">{t.path}</span>
                          <span className="font-mono text-[10px] text-slate-600 truncate block">
                            {t.botName.replace("HONEYPOT:", "").replace("Unknown", "?") || "?"}
                          </span>
                        </div>
                        <span className="text-right text-xs font-bold text-red-400">{t.hits}</span>
                        <span className="text-right text-xs text-slate-400 font-mono">{t.country}</span>
                        <span className="text-right text-[10px] text-slate-500">{timeSince(t.lastSeen)}</span>
                      </div>
                    ))}
                    <p className="text-[11px] text-slate-600 pt-2">
                      All probes returned HTTP 404. No data was exposed. Every entry is a confirmed hostile or scanner actor.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SEO Issues tab */}
            {tab === "seo" && (
              <div className="space-y-3">
                {data.seoIssues.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <div className="text-green-400 text-2xl">✓</div>
                    <p className="text-slate-400 text-sm">No 404 SEO issues detected in this window.</p>
                  </div>
                )}
                {data.seoIssues.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="font-mono text-sm text-red-300 flex-1">{s.path}</span>
                    <span className="text-xs text-red-400">{s.hits404} × 404</span>
                  </div>
                ))}
                {data.seoIssues.length > 0 && (
                  <p className="text-[11px] text-slate-600 pt-2">
                    These paths received 404 responses from real visitors or crawlers. Each one is a missed indexing opportunity.
                  </p>
                )}
              </div>
            )}

            {/* Live feed tab */}
            {tab === "live" && (
              <div className="space-y-1">
                <div className="grid grid-cols-[4rem_1fr_3rem_4rem_5rem] gap-2 px-3 text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-2">
                  <span>Time</span><span>Path</span><span>Code</span><span>Country</span><span>Source</span>
                </div>
                {data.recentHits.map((h, i) => {
                  const isHoneypot = h.botName?.startsWith("HONEYPOT:");
                  return (
                    <div key={i} className={`grid grid-cols-[4rem_1fr_3rem_4rem_5rem] gap-2 px-3 py-2 rounded-lg text-xs items-center ${
                      isHoneypot
                        ? "bg-red-500/8 border border-red-500/20"
                        : h.isBot
                          ? "bg-amber-500/5 border border-amber-500/10"
                          : "bg-slate-900/20 border border-slate-800/40"
                    }`}>
                      <span className="font-mono text-slate-600 text-[10px]">
                        {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span className="font-mono text-slate-300 truncate">{h.path}</span>
                      <StatusBadge code={h.statusCode ?? 0} />
                      <span className="text-slate-500 font-mono">{h.country || "—"}</span>
                      <span className={`text-[10px] truncate ${isHoneypot ? "text-red-400" : h.isBot ? "text-amber-400" : "text-green-400"}`}>
                        {isHoneypot ? "⚠ Probe" : h.isBot ? (h.botName ?? "Bot") : "Human"}
                      </span>
                    </div>
                  );
                })}
                {data.recentHits.length === 0 && <p className="text-slate-600 text-sm text-center py-8">No recent hits recorded yet.</p>}
              </div>
            )}
          </>
        )}
      <div className="mt-8 pt-6 border-t border-slate-800/60">
        <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Related resources</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/blockchain">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs hover:bg-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer">
              <Activity className="w-3 h-3" /> Blockchain Explorer
            </span>
          </Link>
          <Link href="/nexus-explorer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-xs hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
              <Globe className="w-3 h-3" /> Nexus Explorer
            </span>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
