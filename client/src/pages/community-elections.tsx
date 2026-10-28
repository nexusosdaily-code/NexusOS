import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight, Check, ChevronDown, CircleAlert, Clock3, Fingerprint,
  Landmark, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, UserRound,
  Vote, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CommunityElectionContinuity } from "@/components/community-election-continuity";
import { WalletWaveCommunications } from "@/components/wallet-wave-communications";
import {
  useCommunityAction, useCommunityElections, useCommunityMembership, useCommunityVerifiedPeople, useCommunityContinuity,
} from "@/hooks/use-community-elections";
import {
  policyScopes, reviewRoles, type CommunityElection, type CommunityNomination,
} from "@shared/community-elections";

const roleLabels: Record<(typeof reviewRoles)[number], string> = {
  "constitutional-legal": "Constitutional & legal",
  "technical-security": "Technical security",
  "human-life-safety": "Human life & safety",
};

const scopeLabels: Record<(typeof policyScopes)[number], string> = {
  "community-representation": "Community representation",
  welfare: "Welfare",
  "wnsp-technology": "WNSP technology",
};

const statusLabels: Record<CommunityElection["status"], string> = {
  scheduled: "Scheduled",
  open: "Voting open",
  "awaiting-finalisation": "Awaiting finalisation",
  approved: "Approved",
  rejected: "Not approved",
  cancelled: "Cancelled",
};

const kindLabels: Record<CommunityElection["kind"], string> = {
  reviewer: "Reviewer election",
  policy: "Policy proposal",
  appeal: "Election appeal",
  recall: "Mandate recall",
  commission: "Commission instruction proposal",
};

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium", timeStyle: "short",
  });
}

function localDateTimeInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return "The request could not be completed. Please try again.";
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[.14em] text-[#627064]">{label}</span>
      {children}
      {hint && <span className="block text-xs leading-relaxed text-[#738076]">{hint}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-[#d9dfd3] bg-[#f9faf5] px-3.5 py-3 text-sm text-[#202a23] outline-none transition focus:border-[#65835e] focus:ring-2 focus:ring-[#65835e]/15 placeholder:text-[#a0a99f]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#263f32] px-4 py-3 text-sm font-semibold text-[#f7f6ed] transition hover:bg-[#345541] disabled:cursor-not-allowed disabled:opacity-45";

function StatusPill({ election }: { election: CommunityElection }) {
  const approved = election.status === "approved";
  const open = election.status === "open";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${
      open ? "border-[#9dbb88] bg-[#e8f0df] text-[#365837]"
        : approved ? "border-[#8aab8e] bg-[#e5eee2] text-[#365837]"
          : "border-[#d8ddd1] bg-[#f0f1eb] text-[#69766b]"
    }`}>
      {open ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#62865c]" /> : null}
      {statusLabels[election.status]}
    </span>
  );
}

function ElectionCard({
  election, eligible, hasVoted, isAdmin, pending, onVote, onFinalise, onCancel,
}: {
  election: CommunityElection;
  eligible: boolean;
  hasVoted: boolean;
  isAdmin: boolean;
  pending: boolean;
  onVote: (id: string, choice: "yes" | "no") => void;
  onFinalise: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const closed = new Date(election.closesAt).getTime() <= Date.now();
  const canVote = election.status === "open" && !closed && eligible && !hasVoted;
  const finalisable = isAdmin && closed && election.status === "awaiting-finalisation";
  const cancellable = isAdmin && election.total === 0 && ["scheduled", "open"].includes(election.status);
  return (
    <article className="group overflow-hidden rounded-[1.4rem] border border-[#dce1d6] bg-[#fbfcf7] shadow-[0_12px_32px_rgba(39,57,43,.055)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eae1] px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#edf0e8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-[#627064]">
            {election.kind === "policy" ? scopeLabels[election.scope as keyof typeof scopeLabels] ?? kindLabels[election.kind] : kindLabels[election.kind]}
          </span>
          <StatusPill election={election} />
        </div>
        <span className="font-mono text-[10px] text-[#929b90]">REF · {election.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <div className="px-5 py-6 sm:px-7">
        <h3 className="max-w-3xl font-serif text-[1.55rem] leading-tight tracking-[-.025em] text-[#223128] sm:text-[1.8rem]">{election.title}</h3>
        {election.nomination && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#546455]">
            <UserRound className="h-4 w-4 text-[#748a68]" />
            <span className="font-semibold">{election.nomination.publicName}</span>
            <span className="text-[#a0a89c]">/</span>
            <span>{roleLabels[election.nomination.role]}</span>
            <span className="rounded-full border border-[#e5d9ad] bg-[#faf4dd] px-2 py-0.5 text-[10px] font-semibold text-[#7a6531]">Unvalidated</span>
          </div>
        )}
        {election.kind === "reviewer" && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#748074]">
            <span>Designation: <strong className="text-[#4a5b4b]">{election.designation ?? "principal"}</strong></span>
            {election.predecessorId && <span className="font-mono">Predecessor mandate: {election.predecessorId}</span>}
          </div>
        )}
        {election.targetId && (
          <p className="mt-3 break-all font-mono text-[10px] text-[#7b887a]">Target record · {election.targetId}</p>
        )}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#526054]">{election.body}</p>
        {election.outcomeSetAside && (
          <p className="mt-3 rounded-lg border border-[#e2d2bf] bg-[#faf1e3] px-3 py-2 text-xs leading-relaxed text-[#786647]">
            Community appeal upheld: this outcome has been set aside prospectively. A fresh election is required; the original ballots and result remain unchanged.
          </p>
        )}
        {election.kind === "reviewer" && (
          <p className="mt-3 rounded-lg bg-[#f4f2e9] px-3 py-2 text-xs leading-relaxed text-[#77704f]">
            Nomination credentials still require real authentication. An approved election records a fixed three-year term; its text and dates are immutable, with no automatic renewal. Electoral choice alone never activates authority.
          </p>
        )}
        {election.kind === "commission" && (
          <p className="mt-3 rounded-lg bg-[#f4f2e9] px-3 py-2 text-xs leading-relaxed text-[#77704f]">
            Any assistance is limited to exact community instructions and their stated limits. No elected person gains independent recommendations, discretion to change instructions, automatic execution, or protected signing authority.
          </p>
        )}

        <div className="mt-6 grid gap-4 border-y border-[#e8ebe2] py-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#899386]">Opens</span>
              <span className="mt-1 block text-[#425246]">{dateLabel(election.opensAt)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#899386]">Closes</span>
              <span className="mt-1 block text-[#425246]">{dateLabel(election.closesAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <div className="text-right">
              <span className="block font-mono text-2xl leading-none text-[#294333]">{election.total}</span>
              <span className="mt-1 block text-[10px] uppercase tracking-[.12em] text-[#889186]">individual ballots</span>
            </div>
            {election.total > 0 && (
              <div className="h-10 w-px bg-[#e3e7de]" />
            )}
            {election.total > 0 && (
              <div className="text-xs leading-5">
                <span className="block text-[#3f6949]">Yes {election.yes}</span>
                <span className="block text-[#8b5d56]">No {election.no}</span>
              </div>
            )}
          </div>
        </div>

        {election.status !== "scheduled" && election.status !== "open" && (election.total > 0 || election.recordDigest) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f0f2eb] px-4 py-3">
            <div className="text-xs leading-5 text-[#59675a]">
              <strong className="text-[#344c38]">{election.supportPercent.toFixed(1)}% yes</strong>
              <span> · Approval requires at least 51% of yes + no votes cast.</span>
            </div>
            {election.recordDigest && (
              <a href={`/api/community-elections/${encodeURIComponent(election.id)}/record`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#496a50] underline decoration-[#aab9a8] underline-offset-4 hover:text-[#294333]">
                {election.blockNumber != null ? `Block ${election.blockNumber}` : "Chain record"}
                <span className="max-w-32 truncate text-[#778375]">{election.recordDigest.slice(0, 18)}…</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {canVote && (
          <div className="mt-5 rounded-xl border border-[#d8e1d3] bg-[#f2f6ee] p-4">
            <div className="mb-3 flex items-start gap-2.5 text-xs leading-relaxed text-[#526751]">
              <Vote className="mt-0.5 h-4 w-4 shrink-0" />
              <span>One immutable ballot per eligible person. Each person has equal weight. Choose yes or no; there is no abstain ballot.</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={pending} onClick={() => onVote(election.id, "yes")} className={`${buttonClass} !bg-[#426b48] hover:!bg-[#36593c]`}><Check className="h-4 w-4" />Yes</button>
              <button disabled={pending} onClick={() => onVote(election.id, "no")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8c7bd] bg-[#fbf7f3] px-4 py-3 text-sm font-semibold text-[#76564b] transition hover:bg-[#f4e8e0] disabled:cursor-not-allowed disabled:opacity-45"><X className="h-4 w-4" />No</button>
            </div>
          </div>
        )}
        {election.status === "open" && !canVote && (
          <p className="mt-4 rounded-xl bg-[#f2f3ed] px-4 py-3 text-xs leading-relaxed text-[#70796f]">
            {hasVoted ? "Your ballot is recorded. Ballots cannot be changed." : eligible ? "Voting is not currently open." : "Voting is available to verified eligible community members after sign-in."}
          </p>
        )}
        {(finalisable || cancellable) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {finalisable && <button disabled={pending} onClick={() => onFinalise(election.id)} className={`${buttonClass} !py-2.5`}><LockKeyhole className="h-4 w-4" />Finalise result</button>}
            {cancellable && <button disabled={pending} onClick={() => onCancel(election.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#d9d2c6] px-4 py-2.5 text-xs font-semibold text-[#736755] transition hover:bg-[#f4eee3] disabled:opacity-45"><X className="h-4 w-4" />Cancel election</button>}
          </div>
        )}
        {election.status === "awaiting-finalisation" && !isAdmin && (
          <div className="mt-4 flex items-center gap-2 text-xs text-[#77704f]"><Clock3 className="h-4 w-4" />Voting has closed; awaiting an administrator to finalise the result.</div>
        )}
        {election.termStartsAt && election.termEndsAt && election.status === "approved" && (
          <p className="mt-4 text-xs text-[#667064]">Recorded three-year electoral term: {dateLabel(election.termStartsAt)} to {dateLabel(election.termEndsAt)}. {election.termActive ? "Within the electoral term; not commissioned." : `Electoral mandate: ${election.mandateState ?? "not currently active"}. No automatic extension.`}</p>
        )}
      </div>
    </article>
  );
}

export default function CommunityElectionsPage() {
  const { user } = useAuth();
  const overview = useCommunityElections();
  const continuity = useCommunityContinuity();
  const membershipQuery = useCommunityMembership(!!user);
  const action = useCommunityAction();
  const { data: membership } = membershipQuery;
  const isAdmin = user?.role === "admin";
  const verifiedPeople = useCommunityVerifiedPeople(isAdmin);
  const [section, setSection] = useState<"elections" | "nominations">("elections");
  const [nomination, setNomination] = useState({ publicName: "", role: reviewRoles[0], statement: "", publicKey: "", consent: false });
  const [verifyForm, setVerifyForm] = useState({ userId: "", personReference: "", evidenceReference: "", confirmUniqueHuman: false, confirmNoOrganisation: false });
  const [revokePersonId, setRevokePersonId] = useState("");
  const [electionForm, setElectionForm] = useState({
    kind: "policy" as "policy" | "reviewer", nominationId: "", scope: policyScopes[0],
    designation: "principal" as "principal" | "alternate",
    title: "", body: "", opensAt: "", closesAt: "", confirmAuthorityPreserved: false,
  });
  const data = overview.data;
  const elections = useMemo(() => data?.elections ?? [], [data?.elections]);
  const nominations = useMemo(() => data?.nominations ?? [], [data?.nominations]);
  const nominated = new Set(membership?.nominationIds ?? []);
  const voted = new Set(membership?.votedElectionIds ?? []);
  const mutationError = action.error;
  const reviewerCandidates = nominations.filter(nomination => {
    if (!nomination.eligible) return false;
    const seat = continuity?.data?.seats.find(item => item.role === nomination.role && item.designation === electionForm.designation);
    return seat?.state === "vacant";
  });
  const selectedReviewerNomination = nominations.find(item => item.id === electionForm.nominationId);
  const selectedReviewerSeat = selectedReviewerNomination && continuity?.data?.seats.find(item =>
    item.role === selectedReviewerNomination.role && item.designation === electionForm.designation);
  const reviewerOpeningMinimum = localDateTimeInput(new Date(Date.now() + 7 * 86400000 + 60000));

  const submitNomination = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !nomination.consent || action.isPending) return;
    action.mutate({
      path: "/nominations",
      data: { ...nomination, consent: true },
    }, {
      onSuccess: () => setNomination({ publicName: "", role: reviewRoles[0], statement: "", publicKey: "", consent: false }),
    });
  };

  const submitVerification = (event: FormEvent) => {
    event.preventDefault();
    if (action.isPending || !verifyForm.confirmUniqueHuman || !verifyForm.confirmNoOrganisation) return;
    action.mutate({ path: "/verify-person", data: { ...verifyForm, confirmUniqueHuman: true, confirmNoOrganisation: true } }, {
      onSuccess: () => setVerifyForm({ userId: "", personReference: "", evidenceReference: "", confirmUniqueHuman: false, confirmNoOrganisation: false }),
    });
  };

  const submitElection = (event: FormEvent) => {
    event.preventDefault();
    if (action.isPending || !electionForm.confirmAuthorityPreserved) return;
    const selectedNomination = nominations.find(item => item.id === electionForm.nominationId);
    const selectedSeat = selectedNomination && continuity?.data?.seats.find(seat =>
      seat.role === selectedNomination.role && seat.designation === electionForm.designation);
    if (electionForm.kind === "reviewer" && (!selectedNomination || !selectedSeat || selectedSeat.state !== "vacant")) return;
    const reviewerOpens = new Date(electionForm.opensAt);
    if (electionForm.kind === "reviewer" && reviewerOpens.getTime() < Date.now() + 7 * 86400000) return;
    const reviewerCloses = electionForm.kind === "reviewer"
      ? new Date(reviewerOpens.getTime() + 14 * 86400000)
      : new Date(electionForm.closesAt);
    const common = {
      title: electionForm.title,
      body: electionForm.body,
      opensAt: new Date(electionForm.opensAt).toISOString(),
      closesAt: reviewerCloses.toISOString(),
      confirmAuthorityPreserved: true as const,
    };
    const payload = electionForm.kind === "reviewer"
      ? {
          kind: "reviewer" as const, nominationId: electionForm.nominationId,
          designation: electionForm.designation,
          ...(selectedSeat?.predecessorId ? { predecessorId: selectedSeat.predecessorId } : {}),
          ...common,
        }
      : { kind: "policy" as const, scope: electionForm.scope, ...common };
    action.mutate({ path: "/", data: payload }, {
      onSuccess: () => setElectionForm({ kind: "policy", nominationId: "", scope: policyScopes[0], designation: "principal", title: "", body: "", opensAt: "", closesAt: "", confirmAuthorityPreserved: false }),
    });
  };

  const withdraw = (item: CommunityNomination) => {
    if (!window.confirm(`Withdraw your nomination as ${item.publicName}?`)) return;
    action.mutate({ path: `/nominations/${encodeURIComponent(item.id)}`, method: "DELETE" });
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#f4f5ee] text-[#26342a]">
      <div className="pointer-events-none fixed inset-0 opacity-[.18]" aria-hidden="true"
        style={{ backgroundImage: "radial-gradient(#8d9a84 0.55px, transparent 0.55px)", backgroundSize: "17px 17px" }} />
      <header className="relative z-10 border-b border-[#dfe4d9] bg-[#f4f5ee]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/governance" className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-[#627064] transition hover:text-[#294333]">
            <Landmark className="h-4 w-4" /> WNSP <span className="hidden text-[#a1a99e] sm:inline">/ Governance</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="hidden text-xs text-[#69756a] sm:inline">Signed in as {user.username ?? user.email ?? "community member"}</span>
            ) : (
              <Link href="/auth" className="rounded-full border border-[#cad4c7] px-3.5 py-2 text-xs font-semibold text-[#45624a] transition hover:bg-[#e9eee5]">Sign in to participate</Link>
            )}
            <button type="button" onClick={() => { void overview.refetch(); if (user) void membershipQuery.refetch(); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7ded3] text-[#647264] transition hover:bg-[#e8ece3]" aria-label="Refresh elections">
              <RefreshCw className={`h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
        <section className="grid gap-9 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-[#70836a]">
              <span className="h-px w-8 bg-[#91a586]" /> A public record of community choice
            </div>
            <h1 className="max-w-3xl font-serif text-[3.4rem] leading-[.95] tracking-[-.055em] text-[#26382b] sm:text-7xl">
              Community choices,<br /><em className="font-normal text-[#78906e]">recorded.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#637064]">
              WNSP community members elect accountable human reviewers and decide welfare and technology proposals—one person, one equal vote. Elected people serve only exact community wishes; an election grants no independent power.
            </p>
          </div>
          <div className="relative rounded-[1.5rem] border border-[#d8dfd4] bg-[#e9eee5] p-5 sm:p-6">
            <div className="absolute right-5 top-5 h-12 w-12 rounded-full border border-[#bdcbb8]" />
            <div className="absolute right-[2.15rem] top-[2.15rem] h-3 w-3 rounded-full bg-[#718d69]" />
            <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#72816f]">The rule of the room</p>
            <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
              <span className="font-serif text-4xl text-[#35543c]">51%</span>
              <span className="text-sm leading-5 text-[#596858]">of votes cast must be yes<br />for a proposal to pass</span>
              <span className="font-mono text-xs text-[#788675]">1 : 1</span>
              <span className="text-sm text-[#596858]">equal individual ballots</span>
            </div>
            <p className="mt-4 border-t border-[#d2dbce] pt-3 text-[11px] leading-relaxed text-[#748073]">
              No token weighting. No organisation votes. No abstain ballot.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { n: "01", title: "Verify people", body: "A manual trust step for eligibility—not cryptographic proof of unique humanity." },
            { n: "02", title: "Choose reviewers", body: "Elect human reviewers for three-year terms, subject to commissioning." },
            { n: "03", title: "Decide together", body: "Vote yes or no on welfare and WNSP technology proposals." },
          ].map(item => (
            <div key={item.n} className="flex gap-4 border-t border-[#d6ddd2] py-4">
              <span className="font-mono text-[11px] text-[#91a08e]">{item.n}</span>
              <div>
                <h2 className="font-serif text-lg text-[#344a38]">{item.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#748074]">{item.body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-11">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d8dfd4] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#839080]">Community docket</p>
              <h2 className="mt-1 font-serif text-3xl tracking-[-.035em] text-[#2c3c30]">Elections & proposals</h2>
            </div>
            <div className="flex gap-1 rounded-full border border-[#d8dfd4] bg-[#ebeee7] p-1">
              {(["elections", "nominations"] as const).map(tab => (
                <button key={tab} onClick={() => setSection(tab)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${section === tab ? "bg-[#314b37] text-[#f5f5ed]" : "text-[#697568] hover:text-[#334738]"}`}>
                  {tab}{tab === "nominations" && data ? ` · ${nominations.length}` : ""}
                </button>
              ))}
            </div>
          </div>

          {overview.isLoading && (
            <div className="mt-6 space-y-3" aria-label="Loading community elections">
              {[0, 1].map(i => <div key={i} className="h-52 animate-pulse rounded-[1.4rem] border border-[#e0e5db] bg-[#e9ede5]" />)}
            </div>
          )}
          {overview.isError && (
            <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-[#e1c9bd] bg-[#fbf1eb] p-5 text-sm text-[#79584c]">
              <div className="flex items-center gap-2 font-semibold"><CircleAlert className="h-4 w-4" />The public docket did not load.</div>
              <p className="text-xs leading-relaxed">{errorText(overview.error)}</p>
              <button onClick={() => void overview.refetch()} className="rounded-lg border border-[#d7b9aa] px-3 py-2 text-xs font-semibold hover:bg-[#f6e7df]">Retry</button>
            </div>
          )}
          {overview.isSuccess && section === "elections" && (
            <div className="mt-5 space-y-4">
              {elections.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-[#cbd5c8] bg-[#eef1e9] px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e0e8dd] text-[#6a8569]"><Vote className="h-5 w-5" /></div>
                  <h3 className="mt-4 font-serif text-2xl text-[#3a4d3c]">No elections on the docket</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#788276]">When an election or proposal is scheduled, its scope, exact text, dates, and public result will appear here.</p>
                </div>
              ) : elections.map(election => (
                <ElectionCard key={election.id} election={election} eligible={!!membership?.eligible} hasVoted={voted.has(election.id)} isAdmin={isAdmin} pending={action.isPending}
                  onVote={(id, choice) => action.mutate({ path: `/${encodeURIComponent(id)}/vote`, data: { choice } })}
                  onFinalise={id => action.mutate({ path: `/${encodeURIComponent(id)}/finalise` })}
                  onCancel={id => { if (window.confirm("Cancel this election? This is only available before the first ballot.")) action.mutate({ path: `/${encodeURIComponent(id)}/cancel` }); }} />
              ))}
            </div>
          )}
          {overview.isSuccess && section === "nominations" && (
            <div className="mt-5 space-y-4">
              {nominations.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-[#cbd5c8] bg-[#eef1e9] px-6 py-10 text-center">
                  <UserRound className="mx-auto h-6 w-6 text-[#82947e]" />
                  <h3 className="mt-3 font-serif text-xl text-[#3a4d3c]">No reviewer nominations yet</h3>
                  <p className="mt-1 text-xs text-[#788276]">The community docket will show self-nominations here.</p>
                </div>
              ) : nominations.map(item => (
                <article key={item.id} className="rounded-2xl border border-[#dce1d6] bg-[#fbfcf7] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#81907e]">{roleLabels[item.role]}</p>
                      <h3 className="mt-1 font-serif text-2xl text-[#304535]">{item.publicName}</h3>
                    </div>
                    <span className="rounded-full border border-[#e5d9ad] bg-[#faf4dd] px-2.5 py-1 text-[10px] font-semibold text-[#7a6531]">
                      {item.eligible ? "Eligibility indicated" : "Eligibility pending"}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#59675b]">{item.statement}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7eae1] pt-3 text-[11px] text-[#869084]">
                    <span>Submitted {dateLabel(item.createdAt)} · Name and credentials not validated until commissioning.</span>
                    {user && nominated.has(item.id) && (
                      <button disabled={action.isPending} onClick={() => withdraw(item)} className="inline-flex items-center gap-1 rounded-lg border border-[#e1d2c9] px-3 py-2 font-semibold text-[#825e51] hover:bg-[#f7ece6] disabled:opacity-45"><X className="h-3.5 w-3.5" />Withdraw</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {continuity && <CommunityElectionContinuity
          overview={continuity}
          elections={elections}
          membership={membership}
          eligible={!!user && !!membership?.eligible}
          isAdmin={isAdmin}
          action={action}
        />}

        <WalletWaveCommunications />

        <section className="mt-12 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[1.5rem] bg-[#2e4935] p-6 text-[#f2f3e9] sm:p-7">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#b8c6a7]"><ShieldCheck className="h-4 w-4" />Participation, plainly</div>
            <h2 className="mt-4 max-w-sm font-serif text-3xl leading-tight tracking-[-.03em]">Trust is a process, not a claim.</h2>
            <ul className="mt-5 space-y-3 text-xs leading-relaxed text-[#d4ddce]">
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b7ca9f]" />Manual person verification is a trust step, not a cryptographic unique-human proof.</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b7ca9f]" />Each eligible person has one equally weighted, immutable yes-or-no ballot.</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b7ca9f]" />An approved vote does not itself activate authority. Commissioning remains separate.</li>
            </ul>
            {data?.commissioning === "not-commissioned" && (
              <div className="mt-6 border-t border-white/15 pt-4">
                <span className="rounded-full border border-[#c6a86a]/40 bg-[#8e7546]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#e5ce95]">Not commissioned</span>
                <p className="mt-3 text-xs leading-relaxed text-[#c5d0c1]">This interface records community choices. Election records are for the NexusOS project chain, not Bitcoin. This process does not remove Replit AI.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {user && membership?.eligible && (
              <div className="flex items-center gap-3 rounded-xl border border-[#d4dfd0] bg-[#eaf1e6] px-4 py-3 text-xs text-[#506a51]">
                <Fingerprint className="h-4 w-4" />Verified membership is eligible to nominate and vote.
              </div>
            )}
            {!user && (
              <div className="rounded-xl border border-[#e0e3da] bg-[#ecefe8] px-4 py-3 text-xs leading-relaxed text-[#667365]">
                Sign in to nominate yourself or participate when membership eligibility is confirmed. The docket remains public and read-only without sign-in.
              </div>
            )}
            {user && !membershipQuery.isLoading && membership && !membership.eligible && (
              <div className="rounded-xl border border-[#e6dfc6] bg-[#f6f1df] px-4 py-3 text-xs leading-relaxed text-[#766a47]">
                Your membership is not currently eligible for voting or self-nomination. Contact a community administrator for verification.
              </div>
            )}
            {user && membershipQuery.isError && (
              <div className="rounded-xl border border-[#e1c9bd] bg-[#fbf1eb] px-4 py-3 text-xs text-[#79584c]">
                Membership status could not be loaded. <button className="underline" onClick={() => void membershipQuery.refetch()}>Retry</button>
              </div>
            )}

            {user && membership?.eligible && (
              <details className="group rounded-[1.3rem] border border-[#dce1d6] bg-[#fbfcf7]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span><span className="block font-serif text-xl text-[#334838]">Put your name forward</span><span className="mt-1 block text-xs text-[#7b867a]">Self-nominate for a community reviewer role</span></span>
                  <ChevronDown className="h-4 w-4 text-[#80907c] transition group-open:rotate-180" />
                </summary>
                <form onSubmit={submitNomination} className="space-y-4 border-t border-[#e7eae1] px-5 py-5">
                  <Field label="Public name" hint="A name the community can identify you by. This is not validated as a legal identity.">
                    <input className={inputClass} required minLength={2} maxLength={80} value={nomination.publicName} onChange={e => setNomination(v => ({ ...v, publicName: e.target.value }))} placeholder="Name to display on the docket" />
                  </Field>
                  <Field label="Reviewer role">
                    <select className={inputClass} value={nomination.role} onChange={e => setNomination(v => ({ ...v, role: e.target.value as typeof nomination.role }))}>
                      {reviewRoles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}
                    </select>
                  </Field>
                  <Field label="Statement" hint={`${nomination.statement.length}/3000 · At least 20 characters`}>
                    <textarea className={`${inputClass} min-h-28 resize-y`} required minLength={20} maxLength={3000} value={nomination.statement} onChange={e => setNomination(v => ({ ...v, statement: e.target.value }))} placeholder="Describe your approach, experience, and how you will remain accountable." />
                  </Field>
                  <Field label="Public key" hint="Ed25519 public key, 64 hexadecimal characters. Never enter a private key.">
                    <input className={`${inputClass} font-mono text-xs`} required pattern="[a-fA-F0-9]{64}" maxLength={64} value={nomination.publicKey} onChange={e => setNomination(v => ({ ...v, publicKey: e.target.value }))} placeholder="64-character public key" />
                  </Field>
                  <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#647064]">
                    <input type="checkbox" required checked={nomination.consent} onChange={e => setNomination(v => ({ ...v, consent: e.target.checked }))} className="mt-0.5 accent-[#36593c]" />
                    I consent to this public self-nomination and understand my name and credentials are unvalidated until commissioning.
                  </label>
                  <button className={buttonClass} disabled={action.isPending || !nomination.consent}>{action.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}Submit nomination</button>
                </form>
              </details>
            )}

            {isAdmin && (
              <>
                <details className="group rounded-[1.3rem] border border-[#dce1d6] bg-[#fbfcf7]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span><span className="block font-serif text-xl text-[#334838]">Verify a person</span><span className="mt-1 block text-xs text-[#7b867a]">Admin trust step for community eligibility</span></span>
                    <ChevronDown className="h-4 w-4 text-[#80907c] transition group-open:rotate-180" />
                  </summary>
                  <form onSubmit={submitVerification} className="space-y-4 border-t border-[#e7eae1] px-5 py-5">
                    <div className="rounded-xl border border-[#e4dcbf] bg-[#f8f2df] p-3 text-xs leading-relaxed text-[#756847]">
                      <strong>Do not enter personal information here.</strong> Use an opaque, stable reference so the verifier can detect duplicate submissions. Keep evidence in a private system and enter only its private reference. This manual review is not proof of unique humanity.
                    </div>
                    <Field label="Account user ID"><input className={inputClass} required type="text" value={verifyForm.userId} onChange={e => setVerifyForm(v => ({ ...v, userId: e.target.value }))} placeholder="Account UUID" /></Field>
                    <Field label="Opaque person reference" hint="16–100 letters, numbers, underscores, or hyphens. Must remain stable for duplicate checks; no name, email, government ID, or other PII.">
                      <input className={`${inputClass} font-mono text-xs`} required minLength={16} maxLength={100} pattern="[a-zA-Z0-9_-]+" value={verifyForm.personReference} onChange={e => setVerifyForm(v => ({ ...v, personReference: e.target.value }))} placeholder="Stable non-identifying reference" />
                    </Field>
                    <Field label="Private evidence reference" hint="Stored privately; do not paste identity evidence or PII into this field.">
                      <input className={inputClass} required minLength={10} maxLength={200} value={verifyForm.evidenceReference} onChange={e => setVerifyForm(v => ({ ...v, evidenceReference: e.target.value }))} placeholder="Private evidence-system reference" />
                    </Field>
                    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#647064]"><input className="mt-0.5 accent-[#36593c]" type="checkbox" required checked={verifyForm.confirmUniqueHuman} onChange={e => setVerifyForm(v => ({ ...v, confirmUniqueHuman: e.target.checked }))} />I manually assessed this as a unique human person; this is a trust judgment, not cryptographic proof.</label>
                    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#647064]"><input className="mt-0.5 accent-[#36593c]" type="checkbox" required checked={verifyForm.confirmNoOrganisation} onChange={e => setVerifyForm(v => ({ ...v, confirmNoOrganisation: e.target.checked }))} />This verification represents an individual, not an organisation.</label>
                    <button className={buttonClass} disabled={action.isPending || !verifyForm.confirmUniqueHuman || !verifyForm.confirmNoOrganisation}>{action.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Verify person</button>
                  </form>
                </details>

                <details className="group rounded-[1.3rem] border border-[#e8d8cf] bg-[#fbf7f3]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span><span className="block font-serif text-lg text-[#684f45]">Revoke person verification</span><span className="mt-1 block text-xs text-[#8a756b]">Admin · permanently removes eligibility</span></span>
                    <ChevronDown className="h-4 w-4 text-[#947c70] transition group-open:rotate-180" />
                  </summary>
                  <form className="space-y-3 border-t border-[#eadfd8] px-5 py-5" onSubmit={event => {
                    event.preventDefault();
                    const personId = revokePersonId.trim();
                    if (personId && window.confirm("Revoke this person's verification and remove eligibility?")) {
                      action.mutate({ path: `/persons/${encodeURIComponent(personId)}/revoke` }, { onSuccess: () => setRevokePersonId("") });
                    }
                  }}>
                    <Field label="Verified person ID">
                      <select className={inputClass} required value={revokePersonId} onChange={e => setRevokePersonId(e.target.value)}>
                        <option value="">Select a verified membership</option>
                        {(verifiedPeople.data ?? []).filter(p => !p.revokedAt).map(p =>
                          <option key={p.personId} value={p.personId}>Account {p.userId} · person {p.personId}</option>)}
                      </select>
                    </Field>
                    {verifiedPeople.isError && <p role="alert" className="text-xs text-red-700">Membership list could not load. <button type="button" className="underline" onClick={() => void verifiedPeople.refetch()}>Retry</button></p>}
                    <button disabled={action.isPending || !revokePersonId.trim()} className="inline-flex items-center gap-2 rounded-xl border border-[#e0c9bd] bg-[#fbf5f1] px-4 py-3 text-xs font-semibold text-[#825e51] hover:bg-[#f5e9e2] disabled:opacity-45"><X className="h-4 w-4" />Revoke verification</button>
                  </form>
                </details>

                <details className="group rounded-[1.3rem] border border-[#dce1d6] bg-[#fbfcf7]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span><span className="block font-serif text-xl text-[#334838]">Set up an election</span><span className="mt-1 block text-xs text-[#7b867a]">Administrator · proposal text and dates are public</span></span>
                    <ChevronDown className="h-4 w-4 text-[#80907c] transition group-open:rotate-180" />
                  </summary>
                  <form onSubmit={submitElection} className="space-y-4 border-t border-[#e7eae1] px-5 py-5">
                    <Field label="Election kind"><select className={inputClass} value={electionForm.kind} onChange={e => setElectionForm(v => ({ ...v, kind: e.target.value as "policy" | "reviewer" }))}><option value="policy">Policy proposal</option><option value="reviewer">Reviewer election</option></select></Field>
                    {electionForm.kind === "policy" ? (
                      <Field label="Policy scope"><select className={inputClass} value={electionForm.scope} onChange={e => setElectionForm(v => ({ ...v, scope: e.target.value as typeof electionForm.scope }))}>{policyScopes.map(scope => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}</select></Field>
                    ) : (
                      <>
                        <Field label="Seat designation" hint="Principal and alternate are separate electoral mandates. An alternate does not inherit or act for a principal.">
                          <select className={inputClass} value={electionForm.designation} onChange={e => setElectionForm(v => ({ ...v, designation: e.target.value as "principal" | "alternate", nominationId: "" }))}>
                            <option value="principal">Principal</option><option value="alternate">Alternate</option>
                          </select>
                        </Field>
                        <Field label="Vacant seat / eligible nomination" hint="Only a seat reported vacant can receive a new election. Its predecessor link is taken from the continuity vacancy record.">
                          <select className={inputClass} required value={electionForm.nominationId} onChange={e => setElectionForm(v => ({ ...v, nominationId: e.target.value }))}>
                            <option value="">Choose a vacant seat nomination</option>
                            {reviewerCandidates.map(n => <option key={n.id} value={n.id}>{n.publicName} — {roleLabels[n.role]}</option>)}
                          </select>
                        </Field>
                        {selectedReviewerNomination && <div className="rounded-xl border border-[#dce4d8] bg-[#f0f4ed] px-3.5 py-3 text-[11px] leading-relaxed text-[#627160]">
                          Seat: {roleLabels[selectedReviewerNomination.role]} · {electionForm.designation}. Predecessor from vacancy state: <span className="font-mono">{selectedReviewerSeat?.predecessorId ?? "none recorded"}</span>. This election does not renew or override any active mandate.
                        </div>}
                      </>
                    )}
                    <Field label="Public title"><input className={inputClass} required minLength={5} maxLength={200} value={electionForm.title} onChange={e => setElectionForm(v => ({ ...v, title: e.target.value }))} placeholder="Concise, specific title" /></Field>
                    <Field label="Exact proposal text" hint="This text is the question put to a yes-or-no vote. It cannot be edited after creation.">
                      <textarea className={`${inputClass} min-h-32 resize-y`} required minLength={20} maxLength={4000} value={electionForm.body} onChange={e => setElectionForm(v => ({ ...v, body: e.target.value }))} placeholder="State the complete decision and its implications." />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Opens" hint={electionForm.kind === "reviewer" ? "At least seven complete days in the future." : undefined}>
                        <input className={inputClass} type="datetime-local" required min={electionForm.kind === "reviewer" ? reviewerOpeningMinimum : undefined} value={electionForm.opensAt} onChange={e => setElectionForm(v => ({ ...v, opensAt: e.target.value }))} />
                      </Field>
                      {electionForm.kind === "reviewer" ? (
                        <Field label="Closes · calculated" hint="Exactly fourteen complete days after opening; fixed with the election record.">
                          <input className={`${inputClass} opacity-75`} readOnly value={electionForm.opensAt ? localDateTimeInput(new Date(new Date(electionForm.opensAt).getTime() + 14 * 86400000)) : ""} />
                        </Field>
                      ) : (
                        <Field label="Closes"><input className={inputClass} type="datetime-local" required value={electionForm.closesAt} onChange={e => setElectionForm(v => ({ ...v, closesAt: e.target.value }))} /></Field>
                      )}
                    </div>
                    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#647064]"><input className="mt-0.5 accent-[#36593c]" type="checkbox" required checked={electionForm.confirmAuthorityPreserved} onChange={e => setElectionForm(v => ({ ...v, confirmAuthorityPreserved: e.target.checked }))} />I confirm this vote preserves existing authority boundaries; an approved result does not automatically activate authority.</label>
                    <button className={buttonClass} disabled={action.isPending || !electionForm.confirmAuthorityPreserved || (electionForm.kind === "reviewer" && (!electionForm.nominationId || !selectedReviewerSeat || selectedReviewerSeat.state !== "vacant" || new Date(electionForm.opensAt).getTime() < Date.now() + 7 * 86400000))}>{action.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />}Create public election</button>
                  </form>
                </details>

                <div className="rounded-xl border border-[#d8ded4] bg-[#eef1e9] px-4 py-3 text-[11px] leading-relaxed text-[#687367]">
                  Admin controls do not activate authority or change ballots. Finalisation records the outcome atomically after closing; cancellation is only available before the first ballot.
                </div>
              </>
            )}
          </div>
        </section>

        {mutationError && (
          <div role="alert" className="fixed bottom-4 left-4 right-4 z-30 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-[#d8b8a8] bg-[#fff7f1] p-4 text-sm text-[#784e40] shadow-[0_16px_40px_rgba(60,40,30,.14)]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1"><strong>Action not completed</strong><p className="mt-1 break-words text-xs">{errorText(mutationError)}</p></div>
            <button aria-label="Dismiss error" onClick={() => action.reset()} className="rounded-md p-1 hover:bg-[#f5e5dc]"><X className="h-4 w-4" /></button>
          </div>
        )}
        {action.isSuccess && !mutationError && (
          <div role="status" className="fixed bottom-4 left-4 right-4 z-20 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#c9d9c5] bg-[#f3f8ef] p-4 text-sm text-[#456248] shadow-[0_16px_40px_rgba(39,57,43,.12)]">
            <Check className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">Community action recorded. The public docket is being refreshed.</span>
            <button aria-label="Dismiss confirmation" onClick={() => action.reset()} className="rounded-md p-1 hover:bg-[#e6efe1]"><X className="h-4 w-4" /></button>
          </div>
        )}

        <footer className="mt-14 flex flex-col gap-3 border-t border-[#d8dfd4] pt-5 text-[11px] leading-relaxed text-[#879084] sm:flex-row sm:items-center sm:justify-between">
          <span>WNSP Community Elections · equal individual votes, publicly inspectable records</span>
          <span>NexusOS project chain · not Bitcoin</span>
        </footer>
      </div>
    </main>
  );
}
