import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Zap, Shield, BarChart2, Globe, Cpu, Radio, BookOpen, Wallet, Megaphone, FlaskConical, Package } from "lucide-react";

type Build = {
  id: number;
  buildDate: string;
  title: string;
  description: string;
  category: string;
  status: string;
  impact: string;
  tags: string[];
  commitRef?: string;
  createdAt: string;
};

const CATEGORIES = [
  "All", "Physics", "Protocol", "Security", "Analytics",
  "SEO", "UX", "Infrastructure", "Content", "Wallet", "Campaign",
];

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Physics:        { icon: <Zap className="w-3 h-3" />,       color: "text-violet-300",  bg: "bg-violet-900/40 border-violet-700/50" },
  Protocol:       { icon: <Radio className="w-3 h-3" />,     color: "text-cyan-300",    bg: "bg-cyan-900/40 border-cyan-700/50" },
  Security:       { icon: <Shield className="w-3 h-3" />,    color: "text-red-300",     bg: "bg-red-900/40 border-red-700/50" },
  Analytics:      { icon: <BarChart2 className="w-3 h-3" />, color: "text-amber-300",   bg: "bg-amber-900/40 border-amber-700/50" },
  SEO:            { icon: <Globe className="w-3 h-3" />,     color: "text-green-300",   bg: "bg-green-900/40 border-green-700/50" },
  UX:             { icon: <FlaskConical className="w-3 h-3"/>,color: "text-pink-300",    bg: "bg-pink-900/40 border-pink-700/50" },
  Infrastructure: { icon: <Cpu className="w-3 h-3" />,       color: "text-blue-300",    bg: "bg-blue-900/40 border-blue-700/50" },
  Content:        { icon: <BookOpen className="w-3 h-3" />,  color: "text-orange-300",  bg: "bg-orange-900/40 border-orange-700/50" },
  Wallet:         { icon: <Wallet className="w-3 h-3" />,    color: "text-yellow-300",  bg: "bg-yellow-900/40 border-yellow-700/50" },
  Campaign:       { icon: <Megaphone className="w-3 h-3" />, color: "text-emerald-300", bg: "bg-emerald-900/40 border-emerald-700/50" },
};

const IMPACT_DOT: Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-slate-400",
};

const STATUS_STYLE: Record<string, string> = {
  shipped:     "bg-green-900/50 text-green-300 border-green-700/50",
  "in-progress": "bg-blue-900/50 text-blue-300 border-blue-700/50",
  planned:     "bg-slate-800 text-slate-400 border-slate-600",
};

function CategoryChip({ cat, meta }: { cat: typeof CATEGORY_META[string]; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${cat.bg} ${cat.color}`}>
      {cat.icon}
      {/* label shown by parent */}
    </span>
  );
}

function BuildCard({ build }: { build: Build }) {
  const meta = CATEGORY_META[build.category] ?? CATEGORY_META.Infrastructure;
  return (
    <div
      data-testid={`build-card-${build.id}`}
      className="group relative bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${meta.bg} ${meta.color}`}>
              {meta.icon}
              {build.category}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${STATUS_STYLE[build.status] ?? STATUS_STYLE.planned}`}>
              {build.status}
            </span>
          </div>
          <h3 data-testid={`build-title-${build.id}`} className="text-sm font-semibold text-white leading-snug">
            {build.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{build.description}</p>
          {build.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {build.tags.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${IMPACT_DOT[build.impact] ?? IMPACT_DOT.medium}`} title={`${build.impact} impact`} />
            <span className="text-[10px] text-slate-500 capitalize">{build.impact}</span>
          </div>
          {build.commitRef && (
            <span className="text-[10px] font-mono text-slate-600">{build.commitRef.slice(0, 7)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDate(builds: Build[]): [string, Build[]][] {
  const map = new Map<string, Build[]>();
  for (const b of builds) {
    const key = b.buildDate;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-NZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function BuildCataloguePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const { data: builds = [], isLoading } = useQuery<Build[]>({
    queryKey: ["/api/build-catalogue"],
  });

  const { data: stats } = useQuery<{ total: number; shipped: number; byCategory: Record<string, number> }>({
    queryKey: ["/api/build-catalogue/stats"],
  });

  const filtered = builds.filter(b => {
    const matchCat = activeCategory === "All" || b.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const grouped = groupByDate(filtered);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Build Catalogue</h1>
          </div>
          <p className="text-slate-400 text-sm">Every feature, fix, and upgrade shipped by the NexusOS build team — catalogued for future assessment.</p>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div data-testid="stat-total" className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-slate-500 mt-0.5">Total Builds</div>
            </div>
            <div data-testid="stat-shipped" className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.shipped}</div>
              <div className="text-xs text-slate-500 mt-0.5">Shipped</div>
            </div>
            <div data-testid="stat-categories" className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{Object.keys(stats.byCategory).length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Categories</div>
            </div>
            <div data-testid="stat-days" className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{grouped.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Build Days</div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            data-testid="input-search"
            placeholder="Search builds…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-600"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => {
            const isActive = cat === activeCategory;
            const meta = cat !== "All" ? CATEGORY_META[cat] : null;
            return (
              <button
                key={cat}
                data-testid={`filter-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                  ${isActive
                    ? "bg-cyan-700 border-cyan-500 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                  }`}
              >
                {meta && <span className={isActive ? "text-white" : meta.color}>{meta.icon}</span>}
                {cat}
                {stats && cat !== "All" && stats.byCategory[cat] !== undefined && (
                  <span className="ml-1 opacity-60">{stats.byCategory[cat]}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="text-center text-slate-500 py-20">Loading builds…</div>
        ) : grouped.length === 0 ? (
          <div className="text-center text-slate-500 py-20">No builds match your filter.</div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([date, dayBuilds]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span data-testid={`date-${date}`} className="text-xs text-slate-400 font-medium whitespace-nowrap">
                    {formatDate(date)}
                  </span>
                  <span className="text-xs text-slate-600">({dayBuilds.length})</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
                <div className="space-y-3">
                  {dayBuilds.map(b => <BuildCard key={b.id} build={b} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
