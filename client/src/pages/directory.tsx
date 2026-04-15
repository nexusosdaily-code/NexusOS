import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getAuthHeaders } from "@/lib/queryClient";
import { ArrowLeft, Search, Users, Atom, Wallet, Copy, Check, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const BAND_COLORS: Record<string, string> = {
  SYSTEM: "text-red-400 border-red-500/40 bg-red-950/30",
  KERNEL: "text-amber-400 border-amber-500/40 bg-amber-950/30",
  USER:   "text-cyan-400 border-cyan-500/40 bg-cyan-950/30",
  GUEST:  "text-slate-400 border-slate-500/40 bg-slate-800/30",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors ml-1">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

interface DirectoryUser {
  username: string;
  role: string;
  createdAt: string;
  wallet: { address: string } | null;
  spectral: {
    psi: string;
    wdm: number;
    oam: number;
    pol: string;
    nm: number;
    band: string;
    frequencyTHz: string;
    energyJ: string;
  };
}

function UserCard({ user }: { user: DirectoryUser }) {
  const color = nmToColor(user.spectral.nm);
  const bandClass = BAND_COLORS[user.spectral.band] ?? BAND_COLORS.GUEST;
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <Link href={`/profile/${user.username}`}>
      <div
        data-testid={`card-user-${user.username}`}
        className="group bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-900/90 hover:shadow-lg"
        style={{ borderLeft: `3px solid ${color}40` }}
      >
        <div className="flex items-start gap-3">
          {/* avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border"
            style={{ background: `${color}20`, borderColor: `${color}50`, color }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-white font-semibold truncate">{user.username}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="outline" className={`text-xs font-mono py-0 ${bandClass}`}>
                  {user.spectral.band}
                </Badge>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono mb-2">
              <Atom className="w-3 h-3 flex-shrink-0" style={{ color }} />
              <span style={{ color }}>{user.spectral.psi}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{user.spectral.nm.toFixed(1)} nm</span>
            </div>

            {user.wallet && (
              <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                <Wallet className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{user.wallet.address}</span>
                <CopyButton text={user.wallet.address} />
              </div>
            )}
          </div>
        </div>

        {/* wavelength bar */}
        <div className="mt-3 h-0.5 rounded-full overflow-hidden bg-slate-800">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((user.spectral.wdm) / 255) * 100}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-0.5">
          <span>WDM {user.spectral.wdm}</span>
          <span>f = {parseFloat(user.spectral.frequencyTHz).toFixed(1)} THz</span>
        </div>
      </div>
    </Link>
  );
}

const BAND_FILTERS = ["ALL", "SYSTEM", "KERNEL", "USER", "GUEST"] as const;

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<string>("ALL");

  const { data, isLoading, isError } = useQuery<{ users: DirectoryUser[]; total: number }>({
    queryKey: ["/api/directory"],
    queryFn: () => fetch("/api/directory", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    staleTime: 30_000,
  });

  const users = data?.users ?? [];

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || u.username.toLowerCase().includes(q)
      || u.spectral.psi.toLowerCase().includes(q)
      || (u.wallet?.address ?? "").toLowerCase().includes(q);
    const matchBand = bandFilter === "ALL" || u.spectral.band === bandFilter;
    return matchSearch && matchBand;
  });

  const bandCounts = BAND_FILTERS.reduce<Record<string, number>>((acc, b) => {
    acc[b] = b === "ALL" ? users.length : users.filter(u => u.spectral.band === b).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Spectral Directory</h1>
              <p className="text-slate-400 text-sm">All {data?.total ?? 0} registered identities — sorted by WDM channel</p>
            </div>
          </div>
        </div>

        {/* search + band filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              data-testid="input-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by username, Ψ channel, or wallet address…"
              className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {BAND_FILTERS.map(b => {
              const active = bandFilter === b;
              const cls = active
                ? "bg-cyan-600 border-cyan-500 text-white"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500";
              return (
                <button
                  key={b}
                  data-testid={`filter-band-${b}`}
                  onClick={() => setBandFilter(b)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${cls}`}
                >
                  {b} {bandCounts[b] > 0 && <span className="opacity-60">({bandCounts[b]})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hilbert space stats bar */}
        {users.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            {(["SYSTEM","KERNEL","USER","GUEST"] as const).map(band => {
              const count = users.filter(u => u.spectral.band === band).length;
              const pct   = users.length ? (count / users.length) * 100 : 0;
              const cls   = BAND_COLORS[band];
              return (
                <div key={band} className={`rounded-lg border p-2 text-center ${cls}`}>
                  <div className="text-lg font-bold font-mono">{count}</div>
                  <div className="text-xs opacity-70">{band}</div>
                  <div className="mt-1 h-1 rounded-full bg-black/30 overflow-hidden">
                    <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* user grid */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">
            <Atom className="w-10 h-10 animate-pulse mx-auto mb-3 text-cyan-500" />
            <p>Loading spectral identities…</p>
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-red-400">Failed to load directory.</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No identities found{search ? ` for "${search}"` : ""}.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(u => <UserCard key={u.username} user={u} />)}
          </div>
        )}

        <p className="text-center text-slate-700 text-xs mt-8 font-mono">
          Hilbert space: 25,600 orthogonal channels · dim(H) = 256 × 50 × 2
        </p>
      </div>
    </div>
  );
}
