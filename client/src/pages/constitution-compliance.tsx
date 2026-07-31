import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "wouter";
import {
  Shield, CheckCircle2, AlertTriangle, Loader2, RefreshCw,
  ArrowLeft, Activity, ExternalLink, Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArticleStatus {
  rule: string;
  status: "COMPLIANT" | "VIOLATED";
  detail: string;
  ceiling?: number;
  floorNxt?: number;
  hardCap?: number;
  totalCirculatingNxt?: number;
  totalCirculating?: number;
  walletShares?: { address: string; balanceNxt: number; sharePct: number; violates: boolean; genesisExempt: boolean }[];
  ihrChecks?: { address: string; balanceNxt: number; floorNxt: number; aboveFloor: boolean }[];
  paramChecks?: { key: string; value: number; passed: boolean; detail?: string }[];
  amendment?: string;
}

interface ConstitutionStatusResponse {
  constitution: {
    version: string;
    enforcedAt: string;
    articles: {
      "C-0001": ArticleStatus;
      "C-0002": ArticleStatus;
      "C-0005": ArticleStatus;
      "C-0006": ArticleStatus;
    };
  };
}

// ── Compliance badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "COMPLIANT" | "VIOLATED" }) {
  const ok = status === "COMPLIANT";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono"
      style={
        ok
          ? { background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)" }
          : { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }
      }
    >
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      {status}
    </span>
  );
}

// ── Article card ──────────────────────────────────────────────────────────────

interface ArticleCardProps {
  id: string;
  article: ArticleStatus;
  accent: string;
  description: string;
  extra?: React.ReactNode;
}

function ArticleCard({ id, article, accent, description, extra }: ArticleCardProps) {
  const ok = article.status === "COMPLIANT";
  return (
    <div
      className="rounded-2xl border p-6 space-y-4"
      style={{
        borderColor: ok ? `${accent}30` : "rgba(239,68,68,0.35)",
        background: ok ? `${accent}06` : "rgba(239,68,68,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold font-mono px-2 py-0.5 rounded"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
            >
              {id}
            </span>
            <span className="text-sm font-bold text-white">{article.rule}</span>
          </div>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <StatusBadge status={article.status} />
      </div>

      <div
        className="rounded-xl px-4 py-3 text-xs font-mono leading-relaxed"
        style={
          ok
            ? { background: "rgba(34,197,94,0.06)", color: "#86efac", border: "1px solid rgba(34,197,94,0.15)" }
            : { background: "rgba(239,68,68,0.08)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.20)" }
        }
      >
        {article.detail}
      </div>

      {extra}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConstitutionCompliancePage() {
  usePageMeta({
    title: "Live Protocol Compliance · NexusOS",
    description: "Real-time constitutional compliance monitor — C-0001 through C-0006.",
    canonical: "https://wnsp.io/constitution/compliance",
  });

  const { data, isLoading, error, dataUpdatedAt, refetch, isFetching } =
    useQuery<ConstitutionStatusResponse>({
      queryKey: ["/api/constitution/status"],
      refetchInterval: 30_000,
      staleTime: 15_000,
    });

  const articles = data?.constitution?.articles;
  const enforcedAt = data?.constitution?.enforcedAt;
  const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const allCompliant =
    articles &&
    Object.values(articles).every((a) => a.status === "COMPLIANT");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* ── Back nav ── */}
        <div className="flex items-center gap-3">
          <Link href="/constitution">
            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono">
              <ArrowLeft className="w-3.5 h-3.5" />
              Constitution
            </button>
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-400 font-mono">Compliance Monitor</span>
        </div>

        {/* ── Header ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Live Enforcement Dashboard</h1>
              <p className="text-sm text-slate-400">Protocol compliance — auto-refreshes every 30 seconds</p>
            </div>
          </div>

          {/* Overall status pill */}
          {!isLoading && !error && articles && (
            <div className="flex items-center gap-3 pt-1">
              {allCompliant ? (
                <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  All articles compliant
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-3 py-1.5 rounded-full animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  Constitutional violation detected
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Timestamp + refresh ── */}
        <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {lastChecked
              ? `Last checked: ${lastChecked.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })} NZT`
              : "Checking…"}
            {enforcedAt && (
              <span className="ml-2 text-slate-700">
                · server time {new Date(enforcedAt).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}
              </span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-500/40 animate-spin mx-auto" />
            <div className="text-slate-500 font-mono text-sm">Fetching compliance data…</div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !isLoading && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-8 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              Failed to fetch compliance status
            </div>
            <p className="text-xs text-red-300/60 font-mono">
              {(error as Error).message || "Unknown error"}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-xs text-red-400 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Article cards ── */}
        {articles && (
          <div className="space-y-4">

            {/* C-0001 */}
            <ArticleCard
              id="C-0001"
              article={articles["C-0001"]}
              accent="#22d3ee"
              description="Non-Dominance — no single wallet may hold more than 33% of the circulating NXT supply. The Genesis Execution Address is exempt by pre-constitutional right."
              extra={
                articles["C-0001"].totalCirculatingNxt !== undefined && (
                  <div className="text-[11px] text-slate-500 font-mono space-y-1">
                    <div>
                      Total circulating:{" "}
                      <span className="text-slate-300">
                        {articles["C-0001"].totalCirculatingNxt!.toLocaleString()} NXT
                      </span>
                    </div>
                    <div>
                      Ceiling:{" "}
                      <span className="text-cyan-400">
                        {((articles["C-0001"].ceiling ?? 0.33) * 100).toFixed(0)}%
                      </span>
                    </div>
                    {articles["C-0001"].walletShares && articles["C-0001"].walletShares!.filter(w => !w.genesisExempt && w.sharePct > 0.05).length > 0 && (
                      <div className="pt-1 space-y-1">
                        <div className="text-[10px] uppercase tracking-widest text-slate-600">Top wallet shares (&gt;5%)</div>
                        {articles["C-0001"].walletShares!
                          .filter(w => !w.genesisExempt && w.sharePct > 0.05)
                          .sort((a, b) => b.sharePct - a.sharePct)
                          .slice(0, 5)
                          .map(w => (
                            <div key={w.address} className="flex items-center justify-between">
                              <span className="text-slate-600 truncate max-w-[180px]">{w.address}</span>
                              <span className={w.violates ? "text-red-400" : "text-slate-400"}>
                                {(w.sharePct * 100).toFixed(2)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )
              }
            />

            {/* C-0002 */}
            <ArticleCard
              id="C-0002"
              article={articles["C-0002"]}
              accent="#a78bfa"
              description="Immutable Rights — every wallet must hold at or above the Basic Human Living Standard (1,150 NXT provided in services through the charity)."
              extra={
                articles["C-0002"].floorNxt !== undefined && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Floor:{" "}
                    <span className="text-violet-400">
                      {articles["C-0002"].floorNxt!.toLocaleString()} NXT
                    </span>
                  </div>
                )
              }
            />

            {/* C-0005 */}
            <ArticleCard
              id="C-0005"
              article={articles["C-0005"]}
              accent="#fbbf24"
              description="Physics Supremacy — all live protocol fee and burn parameters must satisfy Maxwell's equations (E=hf/λ constraints). No parameter may violate the physics boundary."
              extra={
                articles["C-0005"].paramChecks && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Live Parameters</div>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {articles["C-0005"].paramChecks!.map(p => (
                        <div
                          key={p.key}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-[11px] font-mono"
                          style={
                            p.passed
                              ? { background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }
                              : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }
                          }
                        >
                          <span className="text-slate-400 truncate">{p.key}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-slate-300">{p.value}</span>
                            {p.passed
                              ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              : <AlertTriangle className="w-3 h-3 text-red-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
            />

            {/* C-0006 */}
            <ArticleCard
              id="C-0006"
              article={articles["C-0006"]}
              accent="#f472b6"
              description="NXT Hard Cap — total circulating supply may never exceed 21,000,000,000 NXT. Raising this ceiling requires a >66% supermajority governance vote."
              extra={
                articles["C-0006"].totalCirculating !== undefined && (
                  <div className="text-[11px] text-slate-500 font-mono space-y-1">
                    <div>
                      Circulating:{" "}
                      <span className="text-slate-300">
                        {articles["C-0006"].totalCirculating!.toLocaleString()} NXT
                      </span>
                    </div>
                    <div>
                      Hard cap:{" "}
                      <span className="text-pink-400">
                        {(articles["C-0006"].hardCap ?? 21_000_000_000).toLocaleString()} NXT
                      </span>
                    </div>
                    {articles["C-0006"].amendment && (
                      <p className="text-slate-700 pt-1 leading-relaxed text-[10px]">
                        {articles["C-0006"].amendment}
                      </p>
                    )}
                  </div>
                )
              }
            />
          </div>
        )}

        {/* ── Footer links ── */}
        <div className="flex items-center gap-4 pt-2 text-xs text-slate-600 flex-wrap">
          <Link href="/constitution">
            <span className="flex items-center gap-1 hover:text-slate-400 transition-colors cursor-pointer">
              <Shield className="w-3 h-3" />
              Constitution
            </span>
          </Link>
          <Link href="/governance">
            <span className="flex items-center gap-1 hover:text-slate-400 transition-colors cursor-pointer">
              <ExternalLink className="w-3 h-3" />
              Governance
            </span>
          </Link>
          <span className="ml-auto text-slate-700 font-mono">
            Polls /api/constitution/status · 30s interval
          </span>
        </div>
      </div>
    </div>
  );
}
