import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity, RefreshCw, ChevronDown, ChevronUp, Copy, Check,
  Cpu, Zap, ArrowRight, ExternalLink, Clock, Database,
  GitBranch, Layers, Hash, Filter, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtNxt(v: string | number | null | undefined): string {
  if (v == null) return "0.00000000";
  return parseFloat(String(v)).toFixed(8);
}
function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8) + "…" + id.slice(-4);
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); }}
      className="text-slate-600 hover:text-slate-300 transition-colors ml-1"
    >
      {ok ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function SpectrumBar() {
  return (
    <div className="h-0.5 w-full rounded"
      style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
  );
}

// ── Output log renderer ───────────────────────────────────────────────────────
const OUTPUT_COLORS: Record<string, string> = {
  push:    "#22d3ee",
  emit:    "#4ade80",
  store:   "#a78bfa",
  load:    "#fbbf24",
  xfer:    "#f97316",
  call:    "#e879f9",
  halt:    "#6b7280",
  error:   "#f87171",
  system:  "#94a3b8",
};
function outputColor(type: string): string {
  const t = type?.toLowerCase() ?? "";
  for (const [k, v] of Object.entries(OUTPUT_COLORS)) if (t.includes(k)) return v;
  return "#94a3b8";
}

function OutputLine({ line }: { line: any }) {
  const color = outputColor(line.type ?? "");
  return (
    <div className="flex items-start gap-2 text-xs font-mono py-0.5">
      <span className="font-bold flex-shrink-0 w-14 text-right" style={{ color }}>
        {line.type ?? "LOG"}
      </span>
      <span className="text-slate-300 break-all">{line.text ?? String(line)}</span>
    </div>
  );
}

// ── Transfer row ──────────────────────────────────────────────────────────────
function TransferRow({ t }: { t: any }) {
  const statusColor =
    t.status === "executed"            ? "#4ade80" :
    t.status === "insufficient_balance"? "#f97316" :
    t.status === "skipped_zero"        ? "#6b7280" : "#f87171";
  return (
    <div className="flex items-center gap-3 text-xs font-mono px-3 py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-orange-400 font-bold w-16">{t.type ?? "XFER"}</span>
      <span className="text-slate-400 flex-1 truncate">{t.to ?? "—"}</span>
      <span className="text-cyan-300">{fmtNxt(t.amount)} NXT</span>
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ color: statusColor, background: statusColor + "18" }}>
        {t.status}
      </span>
      {t.tx_id && <CopyBtn text={t.tx_id} />}
    </div>
  );
}

// ── State delta row ───────────────────────────────────────────────────────────
function StateDeltaRow({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-start gap-3 text-xs font-mono px-3 py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-violet-400 font-bold w-32 flex-shrink-0 truncate">{k}</span>
      <ArrowRight className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
      <span className="text-green-300 break-all">{JSON.stringify(v)}</span>
    </div>
  );
}

// ── Expanded execution detail ─────────────────────────────────────────────────
function ExecutionDetail({ id }: { id: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/explorer/execution/${id}`],
    queryFn: () => fetch(`/api/explorer/execution/${id}`).then(r => r.json()),
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="px-4 py-3 text-slate-500 text-xs font-mono animate-pulse">Loading execution detail…</div>
  );
  if (!data || data.error) return (
    <div className="px-4 py-3 text-red-400 text-xs font-mono">{data?.error ?? "Failed to load"}</div>
  );

  const output: any[]         = Array.isArray(data.output)          ? data.output          : [];
  const stateDelta: any       = typeof data.state_delta === "object" ? data.state_delta     : {};
  const transfers: any[]      = Array.isArray(data.transfer_results) ? data.transfer_results : [];
  const subcalls: any[]       = Array.isArray(data.subcall_results)  ? data.subcall_results  : [];
  const stateKeys             = Object.keys(stateDelta);

  return (
    <div className="border-t border-slate-800 bg-[#060d1a]">
      {/* ── Blockchain TX link ── */}
      {data.chain_tx_id && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/60 text-xs">
          <Hash className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500">Chain TX:</span>
          <span className="font-mono text-cyan-400">{shortId(data.chain_tx_id)}</span>
          <CopyBtn text={data.chain_tx_id} />
          {data.wavelength_nm && (
            <span className="ml-2 text-slate-600 font-mono">λ={parseFloat(data.wavelength_nm).toFixed(1)} nm</span>
          )}
          {data.psi_channel && (
            <span className="text-slate-600 font-mono">{data.psi_channel}</span>
          )}
          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
            data.btp_status === "pending" ? "text-amber-400 bg-amber-400/10" : "text-green-400 bg-green-400/10"
          }`}>{data.btp_status ?? "—"}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* ── VM Output ── */}
        <div>
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold border-b border-slate-800/60 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> VM Output ({output.length} lines)
          </div>
          <div className="max-h-52 overflow-y-auto px-4 py-2 space-y-0.5">
            {output.length === 0
              ? <div className="text-slate-600 text-xs font-mono">No output</div>
              : output.map((l, i) => <OutputLine key={i} line={l} />)
            }
          </div>
        </div>

        {/* ── State Delta + Transfers + Subcalls ── */}
        <div className="divide-y divide-slate-800">
          {stateKeys.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
                <Database className="w-3 h-3" /> State Written ({stateKeys.length} keys)
              </div>
              <div className="max-h-32 overflow-y-auto">
                {stateKeys.map(k => <StateDeltaRow key={k} k={k} v={stateDelta[k]} />)}
              </div>
            </div>
          )}

          {transfers.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-orange-400" /> NXT Transfers ({transfers.length})
              </div>
              <div className="max-h-32 overflow-y-auto">
                {transfers.map((t, i) => <TransferRow key={i} t={t} />)}
              </div>
            </div>
          )}

          {subcalls.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-fuchsia-400" /> Sub-calls ({subcalls.length})
              </div>
              <div className="max-h-32 overflow-y-auto px-4 py-2 space-y-1">
                {subcalls.map((s, i) => (
                  <div key={i} className="text-xs font-mono flex items-center gap-2">
                    <span className="text-fuchsia-400">{s.slug ?? "?"}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      s.status === "executed" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                    }`}>{s.status}</span>
                    {s.cycle_count != null && <span className="text-slate-500">{s.cycle_count} cycles</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {stateKeys.length === 0 && transfers.length === 0 && subcalls.length === 0 && (
            <div className="px-4 py-4 text-slate-600 text-xs font-mono">No state changes, transfers, or sub-calls</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Execution row (collapsible) ───────────────────────────────────────────────
function ExecRow({ ex }: { ex: any }) {
  const [open, setOpen] = useState(false);

  const haltColor  = ex.halted    ? "#4ade80" : "#f87171";
  const haltLabel  = ex.halted    ? "HALTED"  : "RUNNING";
  const cycleColor = ex.cycle_count > 500 ? "#f97316" : ex.cycle_count > 100 ? "#fbbf24" : "#4ade80";

  return (
    <div
      data-testid={`exec-row-${ex.id}`}
      className="border border-slate-800 rounded-xl overflow-hidden transition-colors hover:border-slate-700"
      style={{ borderLeft: "3px solid #06b6d430" }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-cyan-400/10 text-cyan-400">
          <Cpu className="w-4 h-4" />
        </div>

        {/* contract name + slug */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-200 text-sm font-semibold truncate max-w-[200px]">
              {ex.contract_name ?? ex.contract_slug ?? "Unknown"}
            </span>
            {ex.contract_slug && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                /{ex.contract_slug}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{fmtDate(ex.executed_at)}</span>
            <span className="text-slate-700">·</span>
            <span className="font-mono" style={{ color: cycleColor }}>{ex.cycle_count ?? 0} cycles</span>
            {(ex.transfer_count ?? 0) > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-orange-400 font-mono">{ex.transfer_count} xfer</span>
              </>
            )}
            {(ex.state_keys_changed ?? 0) > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-violet-400 font-mono">{ex.state_keys_changed} state</span>
              </>
            )}
            {(ex.subcall_count ?? 0) > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-fuchsia-400 font-mono">{ex.subcall_count} calls</span>
              </>
            )}
          </div>
        </div>

        {/* badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ color: haltColor, background: haltColor + "18" }}>
            {haltLabel}
          </span>
          {ex.chain_tx_id && (
            <div className="flex items-center gap-0.5 text-[10px] font-mono text-slate-600">
              <Hash className="w-2.5 h-2.5" />
              <span>{ex.chain_tx_id.slice(0, 6)}</span>
              <CopyBtn text={ex.chain_tx_id} />
            </div>
          )}
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
        </div>
      </button>

      {open && <ExecutionDetail id={ex.id} />}
    </div>
  );
}

// ── Contract directory card ───────────────────────────────────────────────────
function ContractCard({ c }: { c: any }) {
  return (
    <Link href={`/app/${c.app_slug}`}>
      <div
        data-testid={`contract-card-${c.id}`}
        className="border border-slate-800 rounded-xl p-4 hover:border-cyan-400/30 hover:bg-white/[0.02] transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-slate-200 font-semibold text-sm group-hover:text-cyan-300 transition-colors">{c.name}</div>
            {c.app_slug && (
              <div className="text-[10px] font-mono text-cyan-400/70 mt-0.5">/{c.app_slug}</div>
            )}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 flex-shrink-0 mt-0.5 transition-colors" />
        </div>
        {c.description && (
          <div className="text-slate-500 text-xs mb-3 line-clamp-2">{c.description}</div>
        )}
        <div className="flex flex-wrap gap-3 text-xs font-mono">
          <span className="text-cyan-400">{c.execution_count ?? 0} runs</span>
          <span className="text-slate-600">·</span>
          <span className="text-orange-400">{c.total_effects ?? 0} effects</span>
          <span className="text-slate-600">·</span>
          <span className="text-violet-400">{fmtNxt(c.contract_nxt_balance)} NXT</span>
        </div>
        {c.last_executed_at && (
          <div className="text-slate-600 text-[10px] mt-2 font-mono">Last: {fmtDate(c.last_executed_at)}</div>
        )}
      </div>
    </Link>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-[#0a1020]">
      <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color }}>{label}</div>
      <div className="text-xl font-bold font-mono text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5 font-mono">{sub}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NexusExplorerPage() {
  const [tab,        setTab]        = useState<"executions" | "contracts">("executions");
  const [slug,       setSlug]       = useState("");
  const [filter,     setFilter]     = useState("all");
  const [offset,     setOffset]     = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const LIMIT = 25;

  const { data: stats, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/explorer/stats"],
    queryFn: () => fetch("/api/explorer/stats").then(r => r.json()),
    staleTime: 10_000,
  });

  const { data: execData, isFetching: execFetching, refetch: refetchExecs } = useQuery<any>({
    queryKey: ["/api/explorer/executions", slug, filter, offset, LIMIT],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (slug)   params.set("slug",   slug);
      if (filter !== "all") params.set("filter", filter);
      return fetch(`/api/explorer/executions?${params}`).then(r => r.json());
    },
    staleTime: 8_000,
  });

  const { data: contractsData } = useQuery<any>({
    queryKey: ["/api/explorer/contracts"],
    queryFn: () => fetch("/api/explorer/contracts").then(r => r.json()),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => { refetchExecs(); refetchStats(); }, 5_000);
    return () => clearInterval(t);
  }, [autoRefresh, refetchExecs, refetchStats]);

  const executions  = execData?.executions  ?? [];
  const totalExecs  = execData?.total       ?? 0;
  const contracts   = contractsData?.contracts ?? [];
  const totalPages  = Math.ceil(totalExecs / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-20">
      {/* ── Header ── */}
      <div className="border-b border-slate-800 px-4 md:px-8 py-6">
        <SpectrumBar />
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              Nexus Explorer
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Live VM execution audit ledger — every contract run anchored to the blockchain
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              className={`gap-1.5 text-xs ${autoRefresh ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "border-slate-700 text-slate-400"}`}
              onClick={() => setAutoRefresh(a => !a)}
              data-testid="btn-auto-refresh"
            >
              <Activity className={`w-3 h-3 ${autoRefresh ? "text-cyan-400 animate-pulse" : ""}`} />
              {autoRefresh ? "Live" : "Auto-refresh"}
            </Button>
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs border-slate-700 text-slate-400 hover:text-slate-200"
              onClick={() => { refetchExecs(); refetchStats(); }}
              data-testid="btn-refresh"
            >
              <RefreshCw className={`w-3 h-3 ${execFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-6 max-w-7xl mx-auto">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Executions"
            value={stats?.total_executions ?? "—"}
            color="#06b6d4"
          />
          <StatCard
            label="NXT Transferred"
            value={stats?.nxt_moved != null ? fmtNxt(stats.nxt_moved) : "—"}
            sub="via contracts"
            color="#f97316"
          />
          <StatCard
            label="Active Contracts"
            value={stats?.active_contracts ?? "—"}
            sub="with executions"
            color="#a78bfa"
          />
          <StatCard
            label="On-chain Transfers"
            value={stats?.total_transfers ?? "—"}
            sub="contract_xfer txs"
            color="#4ade80"
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-slate-800">
          {(["executions", "contracts"] as const).map(t => (
            <button
              key={t}
              data-testid={`tab-${t}`}
              className={`px-5 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "executions" ? `Executions${totalExecs > 0 ? ` (${totalExecs})` : ""}` : `Contracts (${contracts.length})`}
            </button>
          ))}
        </div>

        {/* ── Executions tab ── */}
        {tab === "executions" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  className="pl-8 h-8 text-xs w-44 bg-slate-900 border-slate-700 focus:border-cyan-500"
                  placeholder="Filter by slug…"
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setOffset(0); }}
                  data-testid="input-slug-filter"
                />
              </div>
              <div className="flex gap-1">
                {[
                  { key: "all",            label: "All" },
                  { key: "with_transfers", label: "Has Transfers" },
                  { key: "with_state",     label: "Has State" },
                ].map(f => (
                  <button
                    key={f.key}
                    data-testid={`filter-${f.key}`}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filter === f.key
                        ? "bg-cyan-400/15 border-cyan-400/40 text-cyan-300"
                        : "border-slate-700 text-slate-500 hover:text-slate-300"
                    }`}
                    onClick={() => { setFilter(f.key); setOffset(0); }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-600 ml-auto">
                <Filter className="w-3 h-3" />
                <span>{totalExecs} matching</span>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {execFetching && executions.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm font-mono animate-pulse">Loading executions…</div>
              ) : executions.length === 0 ? (
                <div className="text-center py-12 border border-slate-800 rounded-xl">
                  <Cpu className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <div className="text-slate-600 text-sm font-mono">No executions found</div>
                  <div className="text-slate-700 text-xs mt-1">Run a contract from the Spectral IDE to see it here</div>
                  <Link href="/spectral-ide">
                    <Button size="sm" variant="outline" className="mt-4 border-slate-700 text-slate-400 gap-1.5">
                      <ExternalLink className="w-3 h-3" /> Open Spectral IDE
                    </Button>
                  </Link>
                </div>
              ) : (
                executions.map((ex: any) => <ExecRow key={ex.id} ex={ex} />)
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  size="sm" variant="outline"
                  className="border-slate-700 text-slate-400 text-xs"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  data-testid="btn-prev-page"
                >
                  ← Prev
                </Button>
                <span className="text-slate-600 text-xs font-mono">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm" variant="outline"
                  className="border-slate-700 text-slate-400 text-xs"
                  disabled={offset + LIMIT >= totalExecs}
                  onClick={() => setOffset(offset + LIMIT)}
                  data-testid="btn-next-page"
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Contracts tab ── */}
        {tab === "contracts" && (
          <div>
            {contracts.length === 0 ? (
              <div className="text-center py-12 border border-slate-800 rounded-xl">
                <Database className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <div className="text-slate-600 text-sm font-mono">No deployed contracts yet</div>
                <Link href="/spectral-ide">
                  <Button size="sm" variant="outline" className="mt-4 border-slate-700 text-slate-400 gap-1.5">
                    <ExternalLink className="w-3 h-3" /> Deploy a Contract
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {contracts.map((c: any) => <ContractCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
