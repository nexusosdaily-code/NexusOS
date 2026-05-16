import { useQuery } from "@tanstack/react-query";
import { Shield, CheckCircle2, AlertTriangle, Zap, Scale, Lock, RefreshCw } from "lucide-react";
import { Link } from "wouter";

interface WalletShare {
  address: string;
  balanceNxt: number;
  sharePct: number;
  violates: boolean;
}

interface IhrCheck {
  address: string;
  balanceNxt: number;
  floorNxt: number;
  aboveFloor: boolean;
}

interface ParamCheck {
  key: string;
  value: number;
  passed: boolean;
  detail?: string;
}

interface ArticleC0001 {
  rule: string;
  ceiling: number;
  status: "COMPLIANT" | "VIOLATED";
  detail: string;
  walletShares: WalletShare[];
  totalCirculatingNxt: number;
}

interface ArticleC0002 {
  rule: string;
  floorNxt: number;
  status: "COMPLIANT" | "VIOLATED";
  detail: string;
  ihrChecks: IhrCheck[];
}

interface ArticleC0005 {
  rule: string;
  status: "COMPLIANT" | "VIOLATED";
  detail: string;
  paramChecks: ParamCheck[];
}

interface ConstitutionStatus {
  version: string;
  enforcedAt: string;
  articles: {
    "C-0001": ArticleC0001;
    "C-0002": ArticleC0002;
    "C-0005": ArticleC0005;
  };
}

function StatusBadge({ status }: { status: "COMPLIANT" | "VIOLATED" }) {
  if (status === "COMPLIANT") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 border border-green-500/30 bg-green-500/10 rounded px-2 py-0.5 font-mono uppercase tracking-wider">
        <CheckCircle2 size={11} /> COMPLIANT
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10 rounded px-2 py-0.5 font-mono uppercase tracking-wider">
      <AlertTriangle size={11} /> VIOLATED
    </span>
  );
}

function PctBar({ pct, ceiling }: { pct: number; ceiling: number }) {
  const w = Math.min(pct * 100, 100);
  const over = pct > ceiling;
  return (
    <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden w-full">
      <div
        className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-cyan-500"}`}
        style={{ width: `${w}%` }}
      />
      <div
        className="absolute top-0 h-full w-px bg-amber-400/60"
        style={{ left: `${ceiling * 100}%` }}
      />
    </div>
  );
}

function ArticleCard({
  id,
  icon: Icon,
  color,
  title,
  formal,
  status,
  summary,
  children,
}: {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  formal: string;
  status: "COMPLIANT" | "VIOLATED";
  summary: string;
  children: React.ReactNode;
}) {
  const isCompliant = status === "COMPLIANT";
  return (
    <div
      className={`rounded-2xl border p-6 space-y-5 ${
        isCompliant
          ? "border-green-500/20 bg-gradient-to-br from-slate-900 to-slate-900/80"
          : "border-red-500/40 bg-gradient-to-br from-red-950/20 to-slate-900"
      }`}
      data-testid={`card-article-${id.toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{id}</div>
            <div className="text-lg font-bold text-white">{title}</div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-mono">Formal definition</div>
        <p className="text-sm text-white/70 italic leading-relaxed">{formal}</p>
      </div>

      <div className={`text-xs px-3 py-2 rounded-lg font-mono ${isCompliant ? "bg-green-500/5 text-green-300/70" : "bg-red-500/10 text-red-300"}`}>
        {summary}
      </div>

      {children}
    </div>
  );
}

export default function Constitution() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<{ constitution: ConstitutionStatus }>({
    queryKey: ["/api/constitution/status"],
    refetchInterval: 30_000,
  });

  const con = data?.constitution;
  const c0001 = con?.articles["C-0001"];
  const c0002 = con?.articles["C-0002"];
  const c0005 = con?.articles["C-0005"];

  const overallStatus =
    !con ? null :
    [c0001?.status, c0002?.status, c0005?.status].includes("VIOLATED")
      ? "VIOLATED" : "COMPLIANT";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">NexusOS · Substrate Layer</div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-white">Constitutional</span>{" "}
            <span className="text-cyan-400">Enforcement</span>
          </h1>
          <p className="text-white/40 text-sm max-w-xl mx-auto leading-relaxed">
            Three supreme articles enforced at the substrate level. No governance vote can override them.
            Every transaction and every protocol parameter change passes through this layer first.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="text-[10px] font-mono text-white/20 border border-white/10 rounded px-2 py-0.5">v1.0</span>
            <span className="text-[10px] font-mono text-white/20 border border-white/10 rounded px-2 py-0.5">AGPL-3.0</span>
            <span className="text-[10px] font-mono text-white/20 border border-white/10 rounded px-2 py-0.5">100-year fund</span>
            {con && (
              <span className="text-[10px] font-mono text-white/20 border border-white/10 rounded px-2 py-0.5">
                last checked {new Date(con.enforcedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Overall status banner */}
        <div
          className={`rounded-xl border p-4 flex items-center justify-between ${
            overallStatus === "COMPLIANT"
              ? "border-green-500/20 bg-green-500/5"
              : overallStatus === "VIOLATED"
              ? "border-red-500/30 bg-red-500/10"
              : "border-white/10 bg-white/5"
          }`}
          data-testid="banner-overall-status"
        >
          <div className="flex items-center gap-3">
            <Shield size={20} className={overallStatus === "COMPLIANT" ? "text-green-400" : overallStatus === "VIOLATED" ? "text-red-400" : "text-white/30"} />
            <div>
              <div className="text-sm font-bold text-white">
                {isLoading ? "Checking constitution…" : overallStatus === "COMPLIANT" ? "All three articles compliant" : "Constitutional violation detected"}
              </div>
              <div className="text-xs text-white/40 font-mono">Enforcement is live — violations block transactions at the substrate</div>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
            data-testid="button-refresh-constitution"
          >
            <RefreshCw size={14} className="text-white/40" />
          </button>
        </div>

        {/* Articles */}
        <div className="space-y-6">

          {/* C-0001: Non-Dominance */}
          <ArticleCard
            id="C-0001"
            icon={Scale}
            color="bg-amber-500/20"
            title="Non-Dominance"
            formal="No entity may control more than 33% of total circulating Lambda mass. Exception: the genesis execution address (NXT-NEXS-OS1K-7F3A-OMEGA) is exempt by pre-constitutional right — it received the foundational Block #0 coinbase reward before this article was ratified."
            status={c0001?.status ?? "COMPLIANT"}
            summary={c0001?.detail ?? "Calculating…"}
          >
            {c0001 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/30 uppercase tracking-wider">
                  <span>Wallet distribution — {c0001.walletShares.length} wallet{c0001.walletShares.length !== 1 ? "s" : ""}</span>
                  <span>Ceiling: 33%</span>
                </div>
                {c0001.walletShares.length === 0 ? (
                  <div className="text-xs text-white/20 text-center py-4">No wallets found</div>
                ) : (
                  c0001.walletShares.map((w: any) => (
                    <div key={w.address} className="space-y-1.5" data-testid={`wallet-share-${w.address}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-white/50 truncate max-w-[200px]">{w.address}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {w.genesisExempt && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono border border-amber-500/30 text-amber-400 bg-amber-500/10">
                              GENESIS EXEMPT
                            </span>
                          )}
                          <span className={`text-xs font-bold font-mono ${w.violates ? "text-red-400" : w.genesisExempt ? "text-amber-400" : "text-cyan-400"}`}>
                            {(w.sharePct * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <PctBar pct={w.sharePct} ceiling={c0001.ceiling} />
                      <div className="text-[10px] text-white/20 font-mono">
                        {w.balanceNxt.toLocaleString(undefined, { maximumFractionDigits: 2 })} NXT of {c0001.totalCirculatingNxt.toLocaleString(undefined, { maximumFractionDigits: 2 })} circulating
                        {w.genesisExempt && " · pre-constitutional Block #0 coinbase — exempt"}
                      </div>
                    </div>
                  ))
                )}
                <div className="pt-1 border-t border-white/5 text-[10px] font-mono text-white/20">
                  Enforced at: wallet transfer endpoint — transfer rejected if recipient share would exceed 33% · genesis execution address permanently exempt
                </div>
              </div>
            )}
          </ArticleCard>

          {/* C-0002: Immutable Rights */}
          <ArticleCard
            id="C-0002"
            icon={Lock}
            color="bg-purple-500/20"
            title="Immutable Rights"
            formal="No transaction may reduce a citizen's balance below the Basic Human Living Standard of 1,150 NXT/month — the service floor offered by NexusOS through the orbital treasury."
            status={c0002?.status ?? "COMPLIANT"}
            summary={c0002?.detail ?? "Calculating…"}
          >
            {c0002 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/30 uppercase tracking-wider">
                  <span>Basic Human Living Standard — 1,150 NXT / month · NexusOS service offering</span>
                  <span>{c0002.ihrChecks.filter(b => b.aboveFloor).length}/{c0002.ihrChecks.length} above floor</span>
                </div>

                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-1">
                  <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-2">Monthly Basic Human Living Standard breakdown</div>
                  {[
                    ["Shelter",          350],
                    ["Food & Nutrition", 300],
                    ["Healthcare",       200],
                    ["Transportation",   100],
                    ["Communication",    100],
                    ["Education",         50],
                    ["Emergency Reserve", 50],
                  ].map(([label, nxt]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{label}</span>
                      <span className="text-xs font-mono text-purple-300">{nxt} NXT</span>
                    </div>
                  ))}
                  <div className="border-t border-white/5 pt-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-white/60">Total floor</span>
                    <span className="text-xs font-bold font-mono text-purple-400">1,150 NXT</span>
                  </div>
                </div>

                {c0002.ihrChecks.length === 0 ? (
                  <div className="text-xs text-white/20 text-center py-4">No wallets found</div>
                ) : (
                  c0002.ihrChecks.map((b) => (
                    <div key={b.address} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0" data-testid={`ihr-check-${b.address}`}>
                      <span className="text-xs font-mono text-white/50 truncate max-w-[220px]">{b.address}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white/40">
                          {b.balanceNxt.toLocaleString(undefined, { maximumFractionDigits: 2 })} NXT
                        </span>
                        {b.aboveFloor
                          ? <CheckCircle2 size={13} className="text-green-400" />
                          : <AlertTriangle size={13} className="text-red-400" />
                        }
                      </div>
                    </div>
                  ))
                )}

                <div className="pt-1 border-t border-white/5 text-[10px] font-mono text-white/20">
                  Enforced at: wallet transfer endpoint — transfer rejected if sender would drop below the Basic Human Living Standard of 1,150 NXT · NexusOS service floor
                </div>
              </div>
            )}
          </ArticleCard>

          {/* C-0005: Physics Supremacy */}
          <ArticleCard
            id="C-0005"
            icon={Zap}
            color="bg-cyan-500/20"
            title="Physics Supremacy"
            formal="All protocol parameters must be Maxwell-compliant. Fees must satisfy E=hf > 0. Burn ratios must satisfy conservation of energy in [0, 1]."
            status={c0005?.status ?? "COMPLIANT"}
            summary={c0005?.detail ?? "Calculating…"}
          >
            {c0005 && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1">Live parameter audit — {c0005.paramChecks.length} parameters</div>
                <div className="space-y-1">
                  {c0005.paramChecks.map((p) => (
                    <div
                      key={p.key}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono ${
                        p.passed ? "bg-white/[0.02] border border-white/5" : "bg-red-500/10 border border-red-500/20"
                      }`}
                      data-testid={`param-check-${p.key}`}
                    >
                      <span className="text-white/50">{p.key}</span>
                      <div className="flex items-center gap-2">
                        <span className={p.passed ? "text-cyan-300" : "text-red-300"}>{p.value}</span>
                        {p.passed
                          ? <CheckCircle2 size={11} className="text-green-400" />
                          : <AlertTriangle size={11} className="text-red-400" />
                        }
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 border-t border-white/5 text-[10px] font-mono text-white/20">
                  Enforced at: governance proposal endpoint — any proposed value that violates Maxwell bounds is rejected before the vote
                </div>
              </div>
            )}
          </ArticleCard>
        </div>

        {/* Enforcement summary */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider">How enforcement works</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                gate: "Wallet Transfer",
                checks: ["C-0001: Recipient share after transfer ≤ 33% of circulating supply", "C-0002: Sender balance after deduction ≥ 1,150 NXT"],
                color: "border-amber-500/20",
              },
              {
                gate: "Governance Proposal",
                checks: ["C-0005: Proposed fee must be > 0 NXT and ≤ 100 NXT", "C-0005: Proposed burn ratio must be in [0, 1]"],
                color: "border-cyan-500/20",
              },
              {
                gate: "Parameter Execution",
                checks: ["C-0005: Applied immediately to LIVE_FEES / LIVE_BURNS in memory", "All subsequent transactions price using the validated new value"],
                color: "border-purple-500/20",
              },
            ].map(({ gate, checks, color }) => (
              <div key={gate} className={`rounded-lg border ${color} bg-white/[0.02] p-4 space-y-3`}>
                <div className="text-xs font-bold text-white/60 font-mono">{gate}</div>
                {checks.map((c) => (
                  <div key={c} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-cyan-500/50 mt-1.5 shrink-0" />
                    <span className="text-[11px] text-white/30 leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between text-xs text-white/20 font-mono border-t border-white/5 pt-6">
          <Link href="/governance" className="hover:text-cyan-400 transition-colors">← Governance</Link>
          <span>NexusOS Constitutional Engine v1.0 · Λ=hf/c²</span>
          <Link href="/orbital-treasury" className="hover:text-cyan-400 transition-colors">Orbital Treasury →</Link>
        </div>
      </div>
    </div>
  );
}
