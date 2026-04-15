import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getAuthHeaders } from "@/lib/queryClient";
import {
  ArrowLeft, Search, Layers, ArrowUpRight, ArrowDownLeft,
  Zap, Clock, ChevronDown, ChevronUp, Copy, Check,
  RefreshCw, Filter, TrendingUp, Flame, Users2, Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtNxt(v: string | number | null | undefined): string {
  if (v == null) return "0.00000000";
  return parseFloat(String(v)).toFixed(8);
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function shortAddr(a: string | null | undefined): string {
  if (!a) return "—";
  if (a.startsWith("NXT-")) return a;
  return a.slice(0, 8) + "…" + a.slice(-6);
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className="text-slate-600 hover:text-slate-300 transition-colors ml-1 flex-shrink-0">
      {ok ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// tx type → display config
const TX_META: Record<string, { label: string; color: string; icon: string }> = {
  transfer:       { label: "Transfer",      color: "#22d3ee", icon: "→" },
  message_fee:    { label: "Message Fee",   color: "#a78bfa", icon: "✉" },
  stream_fee:     { label: "Stream Fee",    color: "#f472b6", icon: "📡" },
  stream_start:   { label: "Stream Start",  color: "#f472b6", icon: "📡" },
  document_fee:   { label: "Document Fee",  color: "#34d399", icon: "📄" },
  document_create:{ label: "Doc Create",    color: "#34d399", icon: "📄" },
  upload_fee:     { label: "Upload Fee",    color: "#86efac", icon: "⬆" },
  spectral_record:{ label: "Spectral Rec.", color: "#67e8f9", icon: "∿" },
  burn:           { label: "Burn",          color: "#f97316", icon: "🔥" },
  genesis:        { label: "Genesis",       color: "#fbbf24", icon: "Λ" },
  mint:           { label: "Mint",          color: "#fbbf24", icon: "⬡" },
  reward:         { label: "Reward",        color: "#4ade80", icon: "★" },
};
function txMeta(type: string) {
  return TX_META[type] ?? { label: type, color: "#94a3b8", icon: "·" };
}

interface LedgerTx {
  id: string;
  amount: string;
  fee: string;
  type: string;
  status: string;
  wavelength: string | null;
  frequency: string | null;
  energy_cost: string | null;
  metadata: any;
  created_at: string;
  confirmed_at: string | null;
  from_address: string | null;
  from_username: string | null;
  to_address: string | null;
  to_username: string | null;
}

interface LedgerStats {
  total_count: number;
  total_volume: string;
  total_fees: string;
  unique_senders: number;
  first_tx: string | null;
  last_tx: string | null;
}

interface TypeBreakdown { type: string; cnt: number; vol: string; }

// ── Transaction row ───────────────────────────────────────────────────────────
function TxRow({ tx }: { tx: LedgerTx }) {
  const [open, setOpen] = useState(false);
  const meta = txMeta(tx.type);
  const amount = parseFloat(tx.amount);
  const fee    = parseFloat(tx.fee || "0");

  return (
    <div
      data-testid={`tx-row-${tx.id}`}
      className="border border-slate-800 rounded-xl overflow-hidden transition-all hover:border-slate-700"
      style={{ borderLeft: `3px solid ${meta.color}40` }}
    >
      {/* collapsed summary */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* type badge */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 font-mono"
          style={{ background: `${meta.color}18`, color: meta.color }}
        >
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-slate-300 text-xs font-mono">{fmtNxt(amount)} NXT</span>
            {fee > 0 && <span className="text-slate-600 text-xs font-mono">+{fmtNxt(fee)} fee</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
            <span>{tx.from_username ?? shortAddr(tx.from_address)}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-600" />
            <span>{tx.to_username ?? shortAddr(tx.to_address) ?? "—"}</span>
            <span className="text-slate-700">·</span>
            <Clock className="w-3 h-3" />
            <span>{fmtDate(tx.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant="outline"
            className={`text-xs py-0 ${tx.status === "confirmed" ? "border-green-500/40 text-green-400" : "border-amber-500/40 text-amber-400"}`}
          >
            {tx.status}
          </Badge>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
        </div>
      </button>

      {/* expanded detail */}
      {open && (
        <div className="border-t border-slate-800 px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950/50">
          {[
            { label: "TX ID",      value: tx.id,                     mono: true, copy: tx.id },
            { label: "Amount",     value: `${fmtNxt(amount)} NXT`,   mono: true },
            { label: "Fee",        value: `${fmtNxt(fee)} NXT`,       mono: true },
            { label: "From",       value: tx.from_address ?? "—",    mono: true, copy: tx.from_address ?? "" },
            { label: "To",         value: tx.to_address ?? "—",      mono: true, copy: tx.to_address ?? "" },
            { label: "Status",     value: tx.status },
            tx.wavelength ? { label: "λ (nm)",   value: `${parseFloat(tx.wavelength).toFixed(2)} nm`, mono: true } : null,
            tx.frequency  ? { label: "Freq",     value: `${parseFloat(tx.frequency).toExponential(3)} Hz`, mono: true } : null,
            tx.energy_cost? { label: "Energy",   value: `${parseFloat(tx.energy_cost).toExponential(3)} J`, mono: true } : null,
            { label: "Created",   value: fmtDate(tx.created_at) },
            tx.confirmed_at ? { label: "Confirmed", value: fmtDate(tx.confirmed_at) } : null,
          ].filter(Boolean).map((f: any, i) => (
            <div key={i} className="bg-slate-900/60 rounded-lg p-2">
              <div className="text-slate-600 text-xs mb-0.5">{f.label}</div>
              <div className={`text-slate-200 text-xs flex items-center gap-1 ${f.mono ? "font-mono" : ""} truncate`}>
                <span className="truncate">{f.value}</span>
                {f.copy && f.copy !== "—" && <CopyBtn text={f.copy} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats, types }: { stats: LedgerStats; types: TypeBreakdown[] }) {
  const topTypes = types.slice(0, 4);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total Transactions", value: stats.total_count.toLocaleString(), Icon: Activity, color: "text-cyan-400" },
        { label: "Total Volume (NXT)", value: parseFloat(stats.total_volume).toLocaleString("en-US", { maximumFractionDigits: 2 }), Icon: TrendingUp, color: "text-amber-400" },
        { label: "Total Fees Paid",    value: parseFloat(stats.total_fees).toLocaleString("en-US", { maximumFractionDigits: 4 }), Icon: Flame, color: "text-orange-400" },
        { label: "Unique Senders",    value: stats.unique_senders.toString(), Icon: Users2, color: "text-purple-400" },
      ].map(({ label, value, Icon, color }) => (
        <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <span className="text-slate-500 text-xs">{label}</span>
          </div>
          <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}

const ALL_TYPES = Object.keys(TX_META);

// ── Main ledger page ──────────────────────────────────────────────────────────
export default function LedgerPage() {
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce search
  const onSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any).__ledgerSearchTimer);
    (window as any).__ledgerSearchTimer = setTimeout(() => setDebouncedSearch(v), 350);
  };

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (typeFilter)       params.set("type",   typeFilter);
  params.set("limit", "100");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{
    transactions: LedgerTx[];
    stats: LedgerStats;
    types: TypeBreakdown[];
  }>({
    queryKey: ["/api/ledger", debouncedSearch, typeFilter],
    queryFn: () => fetch(`/api/ledger?${params}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    }).then(r => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const txs   = data?.transactions ?? [];
  const stats = data?.stats;
  const types = data?.types ?? [];

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
          <Button
            variant="ghost" size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-slate-400 hover:text-white"
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">NXT Ledger</h1>
              <p className="text-slate-400 text-sm">Complete audit trail of all NXT transactions — physics-governed, immutable</p>
            </div>
          </div>
        </div>

        {/* stats */}
        {stats && <StatsBar stats={stats} types={types} />}

        {/* search + type filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              data-testid="input-search"
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Search by address or username…"
              className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              data-testid="filter-type-all"
              onClick={() => setTypeFilter("")}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                !typeFilter ? "bg-amber-600 border-amber-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            {types.slice(0, 6).map(({ type, cnt }) => {
              const m = txMeta(type);
              const active = typeFilter === type;
              return (
                <button
                  key={type}
                  data-testid={`filter-type-${type}`}
                  onClick={() => setTypeFilter(active ? "" : type)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                    active ? "text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                  }`}
                  style={active ? { background: `${m.color}30`, borderColor: `${m.color}60`, color: m.color } : undefined}
                >
                  {m.label} ({cnt})
                </button>
              );
            })}
          </div>
        </div>

        {/* type breakdown mini bar */}
        {types.length > 0 && (
          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-6">
            {types.map(({ type, cnt }) => {
              const m = txMeta(type);
              const total = types.reduce((s, t) => s + t.cnt, 0);
              return (
                <div
                  key={type}
                  title={`${m.label}: ${cnt}`}
                  style={{ width: `${(cnt / total) * 100}%`, background: m.color }}
                />
              );
            })}
          </div>
        )}

        {/* results count */}
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
          <span>
            {isLoading ? "Loading…" : `${txs.length} transaction${txs.length !== 1 ? "s" : ""}${debouncedSearch ? ` matching "${debouncedSearch}"` : ""}`}
          </span>
          {stats?.last_tx && <span>Last activity: {fmtDate(stats.last_tx)}</span>}
        </div>

        {/* transaction list */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">
            <Layers className="w-10 h-10 animate-pulse mx-auto mb-3 text-amber-500" />
            <p>Loading ledger…</p>
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-red-400">Failed to load ledger.</div>
        ) : txs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No transactions found{debouncedSearch ? ` for "${debouncedSearch}"` : ""}.</p>
            <p className="text-xs mt-1">Transactions will appear here once NXT moves.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map(tx => <TxRow key={tx.id} tx={tx} />)}
          </div>
        )}

        {/* footer note */}
        <p className="text-center text-slate-700 text-xs mt-8 font-mono">
          E = hf · Λ = hf/c² · every transaction encodes a compression state
        </p>
      </div>
    </div>
  );
}
