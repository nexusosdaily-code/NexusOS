import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ChannelConnect } from "@/components/channel-connect";
import {
  Scale, ChevronLeft, Shield, Clock, CheckCircle2, XCircle,
  Zap, AlertTriangle, Plus, Vote, ArrowRight, RefreshCw,
  Activity, Flame, Settings2,
} from "lucide-react";

interface GovernanceParam {
  key: string; value: string; description: string;
  category: string; unit: string; updatedAt: string;
  updatedByProposalId: number | null;
}
interface GovernanceProposal {
  id: number; proposerId: string; proposerName: string; proposerBand: string;
  title: string; rationale: string; parameterKey: string;
  currentValue: string; proposedValue: string;
  status: string; yesWeight: number; noWeight: number; abstainWeight: number;
  voteCount: number; closesAt: string; executedAt: string | null; createdAt: string;
}
interface GovernanceVote {
  id: number; proposalId: number; voterId: string; voterName: string;
  vote: string; authorityWeight: number; voterBand: string; createdAt: string;
}

const BAND_COLOR: Record<string, string> = {
  SYSTEM: "#a78bfa", KERNEL: "#60a5fa", USER: "#34d399", GUEST: "#fb923c",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  active:   <Activity className="w-3.5 h-3.5 text-emerald-400" />,
  passed:   <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />,
  rejected: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  executed: <Zap className="w-3.5 h-3.5 text-violet-400" />,
};
const STATUS_COLOR: Record<string, string> = {
  active: "#10b981", passed: "#38bdf8", rejected: "#f87171", executed: "#a78bfa",
};

function countdown(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h remaining`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m remaining`;
}

function VoteBar({ yes, no, abstain }: { yes: number; no: number; abstain: number }) {
  const total = yes + no + abstain || 1;
  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex gap-px bg-white/5">
      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(yes / total) * 100}%` }} />
      <div className="h-full bg-red-500 transition-all"   style={{ width: `${(no / total) * 100}%` }} />
      <div className="h-full bg-zinc-500 transition-all"  style={{ width: `${(abstain / total) * 100}%` }} />
    </div>
  );
}

function ParamCard({ p }: { p: GovernanceParam }) {
  const isRatio = p.unit === "ratio" || p.unit === "fraction";
  const display = isRatio
    ? `${(parseFloat(p.value) * 100).toFixed(1)}%`
    : `${p.value} ${p.unit}`;
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
      <div>
        <p className="text-xs font-mono text-zinc-400">{p.key}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{p.description}</p>
      </div>
      <span className="text-sm font-mono font-semibold text-white ml-4 shrink-0">{display}</span>
    </div>
  );
}

function ProposalCard({
  proposal, myUserId, myBandWeight, onVote, onTally, isSYSTEM,
}: {
  proposal: GovernanceProposal;
  myUserId: string;
  myBandWeight: number;
  onVote: (id: number, vote: string) => void;
  onTally: (id: number) => void;
  isSYSTEM: boolean;
}) {
  const { data: detail } = useQuery<{ proposal: GovernanceProposal; votes: GovernanceVote[] }>({
    queryKey: [`/api/governance/proposals/${proposal.id}`],
    enabled: proposal.status === "active",
    staleTime: 10_000,
  });

  const myVote = detail?.votes.find(v => v.voterId === myUserId);
  const totalWeight = proposal.yesWeight + proposal.noWeight + proposal.abstainWeight;
  const yesRatio = totalWeight > 0 ? proposal.yesWeight / totalWeight : 0;
  const isClosed = new Date(proposal.closesAt) <= new Date();

  const bandColor = BAND_COLOR[proposal.proposerBand] ?? "#9ca3af";

  return (
    <div
      data-testid={`proposal-card-${proposal.id}`}
      className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3"
      style={{ boxShadow: `0 0 0 1px ${STATUS_COLOR[proposal.status]}22` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {STATUS_ICON[proposal.status]}
            <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: STATUS_COLOR[proposal.status] }}>
              {proposal.status}
            </span>
            <span className="text-[11px] text-zinc-500">•</span>
            <span className="text-[11px] text-zinc-500">#{proposal.id}</span>
          </div>
          <h3 className="text-sm font-semibold text-white">{proposal.title}</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">{proposal.rationale}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-zinc-500 font-mono">by</div>
          <div className="text-xs font-semibold" style={{ color: bandColor }}>
            {proposal.proposerName}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">{proposal.proposerBand}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10">
        <div className="flex-1">
          <div className="text-[10px] text-zinc-500 font-mono mb-0.5">PARAMETER</div>
          <div className="text-xs font-mono text-zinc-300">{proposal.parameterKey}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-600" />
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 font-mono mb-0.5">CHANGE</div>
          <div className="text-xs font-mono">
            <span className="text-zinc-400 line-through mr-1">{proposal.currentValue}</span>
            <span className="text-emerald-400 font-semibold">{proposal.proposedValue}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <VoteBar yes={proposal.yesWeight} no={proposal.noWeight} abstain={proposal.abstainWeight} />
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span className="text-emerald-400">Y {proposal.yesWeight}</span>
          <span>{proposal.voteCount} votes · {(yesRatio * 100).toFixed(0)}% yes</span>
          <span className="text-red-400">N {proposal.noWeight}</span>
        </div>
      </div>

      {proposal.status === "active" && (
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span className="text-[11px] text-zinc-500">{countdown(proposal.closesAt)}</span>
        </div>
      )}

      {proposal.status === "active" && !myVote && (
        <div className="flex items-center gap-2 pt-1">
          <button
            data-testid={`vote-yes-${proposal.id}`}
            onClick={() => onVote(proposal.id, "yes")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            Yes
          </button>
          <button
            data-testid={`vote-no-${proposal.id}`}
            onClick={() => onVote(proposal.id, "no")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            No
          </button>
          <button
            data-testid={`vote-abstain-${proposal.id}`}
            onClick={() => onVote(proposal.id, "abstain")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 hover:bg-zinc-500/30 transition-colors"
          >
            Abstain
          </button>
        </div>
      )}

      {proposal.status === "active" && myVote && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-zinc-400">
            You voted <span className="font-semibold text-white">{myVote.vote}</span>
            {" "}(weight {myVote.authorityWeight})
          </span>
        </div>
      )}

      {proposal.status === "active" && isSYSTEM && isClosed && (
        <button
          data-testid={`tally-${proposal.id}`}
          onClick={() => onTally(proposal.id)}
          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition-colors flex items-center justify-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Finalize Proposal
        </button>
      )}

      {proposal.status === "executed" && (
        <div className="text-[11px] text-zinc-500 font-mono">
          Executed: {proposal.executedAt ? new Date(proposal.executedAt).toLocaleString() : "—"}
        </div>
      )}
    </div>
  );
}

export default function GovernancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"active" | "history" | "params" | "propose">("active");
  const [proposalForm, setProposalForm] = useState({
    title: "", rationale: "", parameterKey: "", proposedValue: "",
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: physicsData } = useQuery<{ channel: any; fees: any; capabilities: any }>({
    queryKey: ["/api/physics/my"],
    enabled: !!user,
    staleTime: 60_000,
  });

  const myBand = physicsData?.channel?.band ?? "USER";
  const myBandBase = { SYSTEM: 8, KERNEL: 4, USER: 2, GUEST: 1 }[myBand] ?? 1;
  const canPropose = ["SYSTEM", "KERNEL"].includes(myBand);
  const isSYSTEM = myBand === "SYSTEM";

  const { data: lnBalData } = useQuery<{ satsBalance: number }>({
    queryKey: ["/api/lightning/balance"],
    enabled: !!user,
    staleTime: 30_000,
  });
  const mySats = lnBalData?.satsBalance ?? 0;
  const mySatsBonus = Math.min(5, Math.floor(mySats / 10000));
  const myBandWeight = myBandBase + mySatsBonus;

  const { data: paramsData } = useQuery<{ params: GovernanceParam[] }>({
    queryKey: ["/api/governance/params"],
    staleTime: 30_000,
  });

  const { data: activeData, refetch: refetchActive } = useQuery<{ proposals: GovernanceProposal[] }>({
    queryKey: ["/api/governance/proposals", "active"],
    queryFn: () => fetch("/api/governance/proposals?status=active").then(r => r.json()),
    staleTime: 10_000,
  });

  const { data: historyData } = useQuery<{ proposals: GovernanceProposal[] }>({
    queryKey: ["/api/governance/proposals", "history"],
    queryFn: () => fetch("/api/governance/proposals").then(r => r.json()),
    staleTime: 30_000,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, vote }: { id: number; vote: string }) => {
      const res = await fetch(`/api/governance/proposals/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/governance/proposals"] });
      qc.invalidateQueries({ queryKey: ["/api/governance/params"] });
      if (data.earlyExecution) {
        showToast(`Proposal passed early — ${data.proposal.parameterKey} updated!`);
      } else {
        showToast("Vote recorded");
      }
    },
    onError: (err: any) => showToast(err.message, false),
  });

  const tallyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/governance/proposals/${id}/tally`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/governance/proposals"] });
      qc.invalidateQueries({ queryKey: ["/api/governance/params"] });
      showToast(`Proposal ${data.proposal.status}`);
    },
    onError: (err: any) => showToast(err.message, false),
  });

  const proposeMutation = useMutation({
    mutationFn: async (body: typeof proposalForm) => {
      const res = await fetch("/api/governance/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/governance/proposals"] });
      setProposalForm({ title: "", rationale: "", parameterKey: "", proposedValue: "" });
      setTab("active");
      showToast("Proposal submitted — voting opens now");
    },
    onError: (err: any) => showToast(err.message, false),
  });

  const params = paramsData?.params ?? [];
  const feeParams  = params.filter(p => p.category === "fee");
  const burnParams = params.filter(p => p.category === "burn");
  const activeProposals = activeData?.proposals ?? [];
  const allProposals = historyData?.proposals ?? [];
  const pastProposals = allProposals.filter(p => p.status !== "active");

  const tabs = [
    { id: "active",  label: "Active",   count: activeProposals.length },
    { id: "history", label: "History",  count: pastProposals.length },
    { id: "params",  label: "Parameters", count: params.length },
    ...(canPropose ? [{ id: "propose", label: "Propose", count: null }] : []),
  ] as { id: string; label: string; count: number | null }[];

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border transition-all ${
            toast.ok
              ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
              : "bg-red-950 border-red-500/40 text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Link>
          <Scale className="w-5 h-5 text-violet-400" />
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white">NexusOS Governance</h1>
            <p className="text-[11px] text-zinc-500">Protocol parameter voting · Spectral authority weighted</p>
          </div>
          <div className="text-right">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
              style={{ color: BAND_COLOR[myBand] ?? "#9ca3af", borderColor: `${BAND_COLOR[myBand] ?? "#9ca3af"}40`, background: `${BAND_COLOR[myBand] ?? "#9ca3af"}15` }}
            >
              <Shield className="w-3 h-3" />
              {myBand} · W{myBandWeight}
            </div>
            {mySatsBonus > 0 && (
              <div className="text-[9px] text-yellow-400/60 font-mono mt-0.5 text-right">
                +{mySatsBonus} from ⚡ sats
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <ChannelConnect label="Channel Dashboard ⚡" />

        {/* Quorum notice */}
        <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20 text-[11px] text-violet-300 flex items-center gap-2">
          <Vote className="w-3.5 h-3.5 shrink-0" />
          Voting is weighted by spectral authority band: SYSTEM=8 · KERNEL=4 · USER=2 · GUEST=1.
          Proposals need ≥3 votes to pass. Early execution triggers at ≥5 votes with ≥80% yes weighting.
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {tabs.map(t => (
            <button
              key={t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-violet-600/30 text-violet-300 border border-violet-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Active Proposals */}
        {tab === "active" && (
          <div className="space-y-3">
            {activeProposals.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No active proposals.{canPropose && " Create one from the Propose tab."}
              </div>
            ) : (
              activeProposals.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  myUserId={user?.id ?? ""}
                  myBandWeight={myBandWeight}
                  onVote={(id, vote) => voteMutation.mutate({ id, vote })}
                  onTally={(id) => tallyMutation.mutate(id)}
                  isSYSTEM={isSYSTEM}
                />
              ))
            )}
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="space-y-3">
            {pastProposals.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">No past proposals yet.</div>
            ) : (
              pastProposals.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  myUserId={user?.id ?? ""}
                  myBandWeight={myBandWeight}
                  onVote={() => {}}
                  onTally={() => {}}
                  isSYSTEM={false}
                />
              ))
            )}
          </div>
        )}

        {/* Parameters */}
        {tab === "params" && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-semibold text-sky-400">Fee Parameters</span>
              </div>
              <div className="space-y-1.5">
                {feeParams.map(p => <ParamCard key={p.key} p={p} />)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-400">Burn Ratios</span>
              </div>
              <div className="space-y-1.5">
                {burnParams.map(p => <ParamCard key={p.key} p={p} />)}
              </div>
            </div>
            <p className="text-[11px] text-zinc-600 text-center">
              These values are enforced in real-time by the Physics Engine.
              Changes take effect immediately when a proposal executes.
            </p>
          </div>
        )}

        {/* Propose */}
        {tab === "propose" && canPropose && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Proposals directly alter live protocol parameters. All changes are permanent and publicly auditable.
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Parameter to change</label>
                <select
                  data-testid="input-parameter-key"
                  value={proposalForm.parameterKey}
                  onChange={e => setProposalForm(f => ({ ...f, parameterKey: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">Select a parameter…</option>
                  <optgroup label="Fee Parameters">
                    {feeParams.map(p => (
                      <option key={p.key} value={p.key}>
                        {p.key} (current: {p.value} {p.unit})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Burn Ratios">
                    {burnParams.map(p => (
                      <option key={p.key} value={p.key}>
                        {p.key} (current: {(parseFloat(p.value) * 100).toFixed(1)}%)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Proposed value</label>
                <input
                  data-testid="input-proposed-value"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder={
                    proposalForm.parameterKey?.startsWith("burn.")
                      ? "0.0–1.0 (ratio)"
                      : "NXT amount"
                  }
                  value={proposalForm.proposedValue}
                  onChange={e => setProposalForm(f => ({ ...f, proposedValue: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Proposal title</label>
                <input
                  data-testid="input-proposal-title"
                  type="text"
                  maxLength={80}
                  placeholder="Concise summary of the change"
                  value={proposalForm.title}
                  onChange={e => setProposalForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Rationale</label>
                <textarea
                  data-testid="input-rationale"
                  rows={3}
                  maxLength={500}
                  placeholder="Why should this parameter change? What's the economic impact?"
                  value={proposalForm.rationale}
                  onChange={e => setProposalForm(f => ({ ...f, rationale: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <button
                data-testid="button-submit-proposal"
                disabled={!proposalForm.title || !proposalForm.parameterKey || !proposalForm.proposedValue || !proposalForm.rationale || proposeMutation.isPending}
                onClick={() => proposeMutation.mutate(proposalForm)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-violet-600/30 text-violet-300 border border-violet-500/40 hover:bg-violet-600/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {proposeMutation.isPending ? "Submitting…" : "Submit Proposal (7-day vote)"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
