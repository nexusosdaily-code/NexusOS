import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowUpRight, CalendarClock, Check, ChevronDown, CircleHelp,
  FileClock, Fingerprint, LockKeyhole, RotateCcw, UserMinus,
} from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type {
  CommunityContinuityOverview, CommunityElection, CommunityElectionMembership,
} from "@shared/community-elections";
import { useCommunityAction } from "@/hooks/use-community-elections";

const roles: Record<string, string> = {
  "constitutional-legal": "Constitutional & legal",
  "technical-security": "Technical security",
  "human-life-safety": "Human life & safety",
};
const kinds = {
  appeal: "Election appeal",
  recall: "Mandate recall",
  commission: "Commission instruction proposal",
  notice: "Public notice",
} as const;
const groundsTypes = {
  procedure: "Procedural error",
  "voter-eligibility": "Voter eligibility / duplicate-person failure",
  "candidate-conflict": "Candidate eligibility or conflict",
  "record-inconsistency": "Result / record inconsistency",
} as const;
const fieldClass = "w-full rounded-xl border border-[#d9dfd3] bg-[#f9faf5] px-3.5 py-3 text-sm text-[#202a23] outline-none transition focus:border-[#65835e] focus:ring-2 focus:ring-[#65835e]/15 placeholder:text-[#a0a99f]";
const actionClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#263f32] px-4 py-3 text-sm font-semibold text-[#f7f6ed] transition hover:bg-[#345541] disabled:cursor-not-allowed disabled:opacity-45";

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed. Please try again.";
}
function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function eventText(content: string) {
  const prefix = "COMMUNITY_ELECTION[v1]:";
  if (!content.startsWith(prefix)) return content;
  try {
    const parsed = JSON.parse(content.slice(prefix.length));
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed.grounds === "string") {
      const groundType = typeof parsed.groundType === "string" ? `\n\nGround type · ${parsed.groundType}` : "";
      return `${parsed.grounds}${groundType}`;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content.slice(prefix.length);
  }
}

export function CommunityElectionContinuity({
  overview, elections, membership, eligible, isAdmin, action,
}: {
  overview: UseQueryResult<CommunityContinuityOverview>;
  elections: CommunityElection[];
  membership?: CommunityElectionMembership;
  eligible: boolean;
  isAdmin: boolean;
  action: ReturnType<typeof useCommunityAction>;
}) {
  const [kind, setKind] = useState<keyof typeof kinds>("appeal");
  const [targetId, setTargetId] = useState("");
  const [groundType, setGroundType] = useState<keyof typeof groundsTypes>("procedure");
  const [grounds, setGrounds] = useState("");
  const [publicConfirmed, setPublicConfirmed] = useState(false);
  const [constitutionConfirmed, setConstitutionConfirmed] = useState(false);
  const [scheduleValues, setScheduleValues] = useState<Record<string, string>>({});
  const currentTime = Date.now();
  const data = overview.data;
  const nominations = useMemo(() => new Set(membership?.nominationIds ?? []), [membership?.nominationIds]);
  const currentMandateIds = useMemo(() => new Set((data?.seats ?? [])
    .filter(seat => seat.state !== "vacant")
    .flatMap(seat => seat.mandateIds)), [data?.seats]);
  const activeReviewerMandates = useMemo(() => elections.filter(election =>
    election.kind === "reviewer" && election.status === "approved" && election.nomination &&
    nominations.has(election.nomination.id) && !!election.termEndsAt &&
    new Date(election.termEndsAt).getTime() > currentTime &&
    (currentMandateIds.has(election.id) || currentMandateIds.has(election.nomination.id))
  ), [elections, nominations, currentMandateIds, currentTime]);

  const validTargets = useMemo(() => {
    if (kind === "appeal") return elections.filter(e => ["reviewer", "policy"].includes(e.kind) &&
      ["approved", "rejected"].includes(e.status) && !!e.recordDigest && !!e.finalisedAt &&
      Date.now() < new Date(e.finalisedAt).getTime() + 14 * 86400000);
    if (kind === "recall") return elections.filter(e => e.kind === "reviewer" && e.status === "approved" &&
      !!e.termEndsAt && new Date(e.termEndsAt).getTime() > Date.now() &&
      (currentMandateIds.has(e.id) || (!!e.nomination && currentMandateIds.has(e.nomination.id))) && !!e.recordDigest);
    if (kind === "notice") return elections.filter(e => ["appeal", "recall"].includes(e.kind) &&
      ["approved", "rejected"].includes(e.status) && !!e.recordDigest);
    return elections.filter(e => e.kind === "reviewer" && e.status === "approved" &&
      e.termActive && !!e.recordDigest);
  }, [elections, kind, currentMandateIds]);

  const submitRequest = (event: FormEvent) => {
    event.preventDefault();
    if (!eligible || action.isPending || !publicConfirmed || !constitutionConfirmed || !targetId) return;
    const data = {
      kind, targetId, grounds: grounds.trim(),
      ...(kind === "appeal" ? { groundType } : {}),
      confirmPublicNonSensitive: true as const,
      confirmConstitutionBound: true as const,
    };
    action.mutate({ path: "/continuity/requests", data }, {
      onSuccess: () => {
        setGrounds("");
        setTargetId("");
        setPublicConfirmed(false);
        setConstitutionConfirmed(false);
      },
    });
  };
  const schedule = (requestId: string) => {
    const opensAt = scheduleValues[requestId];
    if (!opensAt || action.isPending) return;
    action.mutate({
      path: `/continuity/requests/${encodeURIComponent(requestId)}/schedule`,
      data: { opensAt: new Date(opensAt).toISOString(), confirmAuthorityPreserved: true },
    }, { onSuccess: () => setScheduleValues(values => ({ ...values, [requestId]: "" })) });
  };
  const relinquish = (election: CommunityElection) => {
    if (!window.confirm(`Relinquish your ${election.designation ?? "reviewer"} mandate for ${election.title}? This is irreversible. Recorded ballots and the original election record will remain unchanged.`)) return;
    action.mutate({
      path: `/${encodeURIComponent(election.id)}/relinquish`,
      data: { confirmIrreversible: true },
    });
  };
  const minOpening = toLocalInput(new Date(Date.now() + 7 * 86400000 + 60000));
  return (
    <section className="mt-12" aria-labelledby="continuity-title">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-[#cbd7c7] bg-[#e8eee5]">
        <div className="pointer-events-none absolute -right-14 -top-16 h-64 w-64 rounded-full border border-[#c9d5c5]" />
        <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#72836c]">
              <Fingerprint className="h-4 w-4" /> Community election continuity
            </p>
            <h2 id="continuity-title" className="mt-3 max-w-md font-serif text-3xl leading-tight tracking-[-.035em] text-[#2c4030] sm:text-4xl">
              Seats follow the record. Power does not.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#5e6e5e]">
              Public continuity requests lead to community votes, never an administrator’s unilateral decision. The software records electoral decisions; it does not enact constitutional amendments or commission protected authority.
            </p>
            <div className="mt-5 rounded-xl border border-[#d2dccd] bg-[#f4f6ef] p-4 text-xs leading-relaxed text-[#61715f]">
              <strong className="text-[#3b5640]">No independent mandate.</strong> Elected people serve only exact community wishes. A commission is limited to exact instructions and assistance; no independent recommendations, changes, automatic execution, or protected signing.
              <span className="mt-2 block">No community action displaces Replit AI’s highest authority, reserved SYSTEM identities, human-life safeguards, or the unanimous exact-proposal protected-review gate.</span>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#f5efdc] px-4 py-3 text-[11px] leading-relaxed text-[#796b49]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Credential authentication, independence, and separately controlled enforcement remain separate requirements.
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d2dbce] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#839080]">Six electoral seats</p>
                <h3 className="mt-1 font-serif text-2xl text-[#304535]">Seat register</h3>
              </div>
              <span className="rounded-full border border-[#cdd8c9] bg-[#f3f5ef] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#627260]">Not commissioned</span>
            </div>
            {overview.isLoading && <div className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Loading continuity register">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-[#dce5d9]" />)}</div>}
            {overview.isError && <div role="alert" className="mt-4 rounded-xl border border-[#e1c9bd] bg-[#fbf1eb] p-4 text-xs text-[#79584c]">
              Seat register could not load. {errorText(overview.error)} <button onClick={() => void overview.refetch()} className="ml-1 font-semibold underline">Retry</button>
            </div>}
            {overview.isSuccess && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(data?.seats ?? []).map((seat, index) => {
                  const stateStyle = seat.state === "occupied" ? "bg-[#e1ebde] text-[#446347]" : seat.state === "vacant" ? "bg-[#f4edda] text-[#77663c]" : seat.state === "unresolved" ? "bg-[#f5e5dc] text-[#85594b]" : "bg-[#ecefe9] text-[#707970]";
                  return <article key={`${seat.role}-${seat.designation}-${index}`} className="rounded-xl border border-[#d6dfd3] bg-[#f7f8f3] p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#879182]">{seat.designation}</p><h4 className="mt-1 text-xs font-semibold text-[#3b4f3e]">{roles[seat.role] ?? seat.role}</h4></div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.1em] ${stateStyle}`}>{seat.state}</span>
                    </div>
                    {seat.predecessorId && <p className="mt-2 break-all font-mono text-[9px] text-[#829080]">Predecessor · {seat.predecessorId}</p>}
                    {seat.vacancyReason && <p className="mt-2 text-[10px] leading-relaxed text-[#737e71]">{seat.vacancyReason}</p>}
                    {seat.mandateIds.length > 0 && <p className="mt-2 break-all font-mono text-[9px] text-[#829080]">Mandate history · {seat.mandateIds.join(" · ")}</p>}
                  </article>;
                })}
                {(data?.seats.length ?? 0) === 0 && <p className="col-span-full rounded-xl border border-dashed border-[#cbd5c8] p-4 text-xs text-[#748074]">No seat state has been recorded yet.</p>}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#d2dbce] pt-3 text-[10px] leading-relaxed text-[#687668]">
              <span>Principal and alternate are distinct mandates.</span><span>No holdover or automatic succession.</span><span>Terms do not renew automatically.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[.82fr_1.18fr]">
        <div className="rounded-[1.4rem] border border-[#dce1d6] bg-[#fbfcf7] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#7c8979]"><FileClock className="h-4 w-4" /> Member filing</div>
          <h3 className="mt-2 font-serif text-2xl text-[#334838]">Add a public record</h3>
          {!eligible ? <p className="mt-3 rounded-xl bg-[#eef1e9] p-3 text-xs leading-relaxed text-[#697568]">Sign in with verified eligible membership to file an appeal, recall, notice, or instruction proposal. Do not publish private evidence, identity information, or sensitive details.</p> : (
            <form className="mt-4 space-y-3.5" onSubmit={submitRequest}>
              <label className="block space-y-1.5"><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#627064]">Record type</span>
                <select className={fieldClass} value={kind} onChange={e => { setKind(e.target.value as keyof typeof kinds); setTargetId(""); }}>
                  {(Object.keys(kinds) as Array<keyof typeof kinds>).map(option => <option key={option} value={option}>{kinds[option]}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5"><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#627064]">Target record</span>
                <select className={fieldClass} required value={targetId} onChange={e => setTargetId(e.target.value)}>
                  <option value="">Select a public election record</option>
                  {validTargets.map(target => <option key={target.id} value={target.id}>{target.title} · {target.kind} · {target.id.slice(0, 8)}</option>)}
                </select>
              </label>
              {kind === "appeal" && <label className="block space-y-1.5"><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#627064]">Appeal ground</span>
                <select className={fieldClass} value={groundType} onChange={e => setGroundType(e.target.value as keyof typeof groundsTypes)}>{Object.entries(groundsTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </label>}
              {kind === "appeal" && validTargets.some(e => e.id === targetId) && <p className="text-[11px] leading-relaxed text-[#687668]">
                Filing closes {dateLabel(new Date(new Date(validTargets.find(e => e.id === targetId)!.finalisedAt!).getTime() + 14 * 86400000).toISOString())}.
                Each eligible person may append grounds once to the same appeal case.
              </p>}
              {kind === "commission" && <div className="rounded-xl border border-[#e3dcc8] bg-[#f7f2e4] p-3 text-[11px] leading-relaxed text-[#786b4b]">
                Specify the exact community instructions and assistance limits. Elected people cannot independently recommend policy or make changes. Community approval does not automatically execute instructions or grant protected signing. <strong>Current electoral holders may not file commission proposals.</strong>
                {activeReviewerMandates.length > 0 && <span className="mt-1 block font-semibold">Your account has an approved, unexpired reviewer mandate; this filing will be refused.</span>}
              </div>}
              {kind === "notice" && <p className="rounded-xl bg-[#eef1e9] p-3 text-[11px] leading-relaxed text-[#687668]">Notices may concern appeal or recall resolution elections only; they do not reopen ballots or change a result.</p>}
              <label className="block space-y-1.5"><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#627064]">Public, non-sensitive grounds</span>
                <textarea className={`${fieldClass} min-h-28 resize-y`} required minLength={20} maxLength={4000} value={grounds} onChange={e => setGrounds(e.target.value)} placeholder="State the relevant facts and requested community decision. Keep private evidence off this public record." />
                <span className="block text-[10px] text-[#879182]">{grounds.length}/4000 · at least 20 characters</span>
              </label>
              <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#687668]"><input type="checkbox" required checked={publicConfirmed} onChange={e => setPublicConfirmed(e.target.checked)} className="mt-0.5 accent-[#36593c]" />I confirm these grounds are public and non-sensitive; private evidence and identity information are excluded.</label>
              <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#687668]"><input type="checkbox" required checked={constitutionConfirmed} onChange={e => setConstitutionConfirmed(e.target.checked)} className="mt-0.5 accent-[#36593c]" />I confirm this request remains bound by the existing constitution and does not transfer or bypass reserved authority.</label>
              <button className={actionClass} disabled={action.isPending || !targetId || grounds.trim().length < 20 || !publicConfirmed || !constitutionConfirmed || (kind === "commission" && activeReviewerMandates.length > 0)}>
                {action.isPending ? "Recording…" : <><Check className="h-4 w-4" />File public request</>}
              </button>
            </form>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d8dfd4] pb-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#839080]">Append-only docket</p><h3 className="mt-1 font-serif text-2xl text-[#2c3c30]">Continuity requests</h3></div>
            <button type="button" onClick={() => void overview.refetch()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#627064] hover:text-[#294333]"><RotateCcw className="h-3.5 w-3.5" />Refresh</button>
          </div>
          {overview.isLoading && <div className="mt-4 space-y-3" aria-label="Loading continuity requests">{[0, 1].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#e9ede5]" />)}</div>}
          {overview.isError && <div role="alert" className="mt-4 rounded-2xl border border-[#e1c9bd] bg-[#fbf1eb] p-4 text-xs text-[#79584c]">Continuity docket could not load. {errorText(overview.error)} <button onClick={() => void overview.refetch()} className="ml-1 underline">Retry</button></div>}
          {overview.isSuccess && (data?.requests.length ?? 0) === 0 && <div className="mt-4 rounded-2xl border border-dashed border-[#cbd5c8] bg-[#eef1e9] px-5 py-8 text-center"><CircleHelp className="mx-auto h-5 w-5 text-[#82947e]" /><p className="mt-2 font-serif text-lg text-[#3a4d3c]">No continuity requests filed</p><p className="mt-1 text-xs text-[#788276]">Requests and their exact grounds become visible here when recorded.</p></div>}
          {overview.isSuccess && <div className="mt-4 space-y-3">
            {(data?.requests ?? []).map(request => {
              const linkedElection = elections.find(e => e.id === request.electionId);
              const opensValue = scheduleValues[request.id] ?? "";
              const opens = opensValue ? new Date(opensValue) : null;
              const closes = opens ? new Date(opens.getTime() + 14 * 86400000) : null;
              return <article key={request.id} className="rounded-2xl border border-[#dce1d6] bg-[#fbfcf7] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#82907e]">{kinds[request.kind]}</p><h4 className="mt-1 font-serif text-lg text-[#344a38]">{elections.find(e => e.id === request.targetId)?.title ?? `Target ${request.targetId.slice(0, 8)}`}</h4></div>
                  <span className="rounded-full border border-[#d8dfd4] bg-[#f0f2eb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#687568]">{request.status.replace(/-/g, " ")}</span>
                </div>
                <div className="mt-3 grid gap-1 text-[10px] text-[#7a8678] sm:grid-cols-2"><span>Filed {dateLabel(request.createdAt)}</span>{request.filingEndsAt && <span>Filing closes {dateLabel(request.filingEndsAt)}</span>}<span className="font-mono">Target digest · {request.targetDigest.slice(0, 24)}…</span></div>
                <div className="mt-3 space-y-2">
                  {request.grounds.map(event => <div key={event.id} className="rounded-xl bg-[#f0f2eb] p-3">
                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[#556354]">{eventText(event.content)}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#e0e5dc] pt-2 text-[9px] text-[#879182]"><span>{dateLabel(event.createdAt)} · block {event.blockNumber}</span><a href={`/api/community-elections/continuity/events/${encodeURIComponent(event.id)}/record`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#496a50] underline underline-offset-2">Verify record <ArrowUpRight className="h-3 w-3" /></a></div>
                  </div>)}
                </div>
                {linkedElection && <a href={`/api/community-elections/${encodeURIComponent(linkedElection.id)}/record`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[#d5dfd2] bg-[#edf3e9] px-3.5 py-3 text-xs text-[#456248]"><span><strong>{linkedElection.title}</strong><span className="ml-2 text-[#71816d]">Resolution election · {dateLabel(linkedElection.opensAt)} – {dateLabel(linkedElection.closesAt)}</span></span><ArrowUpRight className="h-4 w-4 shrink-0" /></a>}
                {isAdmin && request.status === "awaiting-scheduling" && <div className="mt-4 rounded-xl border border-[#d5dfd2] bg-[#f2f5ee] p-3.5">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#647563]"><CalendarClock className="h-4 w-4" /> Administrator scheduling</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#788476]">Scheduling fixes the resolution question and starts at least seven complete days of public notice. Voting lasts exactly fourteen days. Admins schedule and finalise; they cannot decide appeals or recalls.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="block space-y-1"><span className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#748071]">Voting opens · UTC offset follows your browser</span><input type="datetime-local" min={minOpening} className={fieldClass} value={opensValue} onChange={e => setScheduleValues(values => ({ ...values, [request.id]: e.target.value }))} /></label>
                    <button type="button" disabled={action.isPending || !opens || opens.getTime() < Date.now() + 7 * 86400000} onClick={() => schedule(request.id)} className={`${actionClass} !py-2.5`}><LockKeyhole className="h-4 w-4" />Schedule</button>
                  </div>
                  {closes && <p className="mt-2 text-[10px] text-[#748071]">Fixed close: {dateLabel(closes.toISOString())} · 14 complete days</p>}
                </div>}
              </article>;
            })}
          </div>}
        </div>
      </div>

      <div className="mt-8 rounded-[1.4rem] border border-[#e3d7cf] bg-[#fbf7f3] p-5 sm:p-6">
        <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1e7de] text-[#886453]"><UserMinus className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#95796a]">Voluntary relinquishment</p><h3 className="mt-1 font-serif text-xl text-[#5d463c]">Only your own active mandate</h3>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#7c6c63]">Irreversible. A relinquishment appends a public event and may leave a seat vacant; it does not erase or alter ballots, the election record, or the original term dates. Account authentication is not proof of nominated-key possession.</p>
            {activeReviewerMandates.length > 0 ? <div className="mt-4 space-y-2">{activeReviewerMandates.map(election => <div key={election.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eadfd8] bg-[#fffaf6] p-3.5">
              <div><p className="text-xs font-semibold text-[#5d463c]">{election.nomination?.publicName} · {roles[election.nomination?.role ?? ""] ?? election.nomination?.role}</p><p className="mt-1 text-[10px] text-[#8a786d]">{election.designation ?? "principal"} mandate · ends {election.termEndsAt ? dateLabel(election.termEndsAt) : "date unavailable"}</p></div>
              <button type="button" disabled={action.isPending} onClick={() => relinquish(election)} className="inline-flex items-center gap-2 rounded-xl border border-[#dfc9bd] bg-[#fbf1eb] px-3.5 py-2.5 text-xs font-semibold text-[#825e51] transition hover:bg-[#f5e9e2] disabled:opacity-45"><AlertTriangle className="h-3.5 w-3.5" />Relinquish mandate</button>
            </div>)}</div> : <p className="mt-3 rounded-xl bg-[#f2eee8] px-3.5 py-3 text-xs text-[#84776e]">No approved, unexpired reviewer mandate associated with this account’s nomination records.</p>}
          </div>
        </div>
      </div>

      {data?.events && data.events.length > 0 && <details className="group mt-6 rounded-2xl border border-[#dce1d6] bg-[#fbfcf7]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden"><span><span className="block font-serif text-lg text-[#334838]">All continuity events</span><span className="mt-1 block text-[10px] text-[#7b867a]">{data.events.length} append-only records · public verification links</span></span><ChevronDown className="h-4 w-4 text-[#80907c] transition group-open:rotate-180" /></summary>
        <div className="space-y-2 border-t border-[#e7eae1] p-4">
          {data.events.map(event => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f0f2eb] p-3 text-[10px] text-[#697568]">
            <span><strong className="text-[#405443]">{event.type}</strong> · target {event.targetId.slice(0, 8)} · {dateLabel(event.createdAt)} · block {event.blockNumber}</span>
            <a href={`/api/community-elections/continuity/events/${encodeURIComponent(event.id)}/record`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#496a50] underline underline-offset-2">Public record <ArrowUpRight className="h-3 w-3" /></a>
          </div>)}
        </div>
      </details>}
    </section>
  );
}
