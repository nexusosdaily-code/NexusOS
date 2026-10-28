import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, FileText, ShieldAlert } from "lucide-react";
import { HUMAN_LIFE_BODY, HUMAN_LIFE_TITLE } from "@shared/human-life-amendment";
import { fetchSeal, sealRefetchIntervalFn, sealRetryFn, type SealData, type SealFetchError } from "@/lib/constitution-seal-query";
import type { SafetyDeploymentStatus } from "@shared/safety-status";

export function HumanLifeAmendmentReview() {
  const [open, setOpen] = useState(false);
  const { data: seal } = useQuery<SealData | null, SealFetchError>({
    queryKey: ["/api/constitution/seal"], queryFn: fetchSeal,
    staleTime: 5 * 60_000, retry: sealRetryFn, refetchInterval: sealRefetchIntervalFn,
  });
  const matchingAmendment = useMemo(() => seal?.amendments?.find(a =>
    a.title === HUMAN_LIFE_TITLE && a.body === HUMAN_LIFE_BODY), [seal]);
  const { data: safety, isError: safetyError } = useQuery<SafetyDeploymentStatus>({
    queryKey: ["/api/safety/status"],
    queryFn: async () => {
      const response = await fetch("/api/safety/status", { credentials: "include" });
      if (!response.ok) throw new Error("Safety deployment status unavailable");
      const status = await response.json();
      if (!["unconfigured", "unavailable", "connected", "restricted"].includes(status.state) ||
          status.replacementEnabled !== false || status.identityTransferEnabled !== false ||
          typeof status.independentAuthorityVerified !== "boolean") throw new Error("Invalid safety deployment status");
      return status;
    },
    retry: false, staleTime: 0, refetchInterval: 15_000,
  });
  return (
    <section id="human-life-review" data-testid="section-human-life-review" className="space-y-4 scroll-mt-24">
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 sm:p-6 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-300 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-rose-300">Fresh review draft · unapproved</div>
            <h2 className="mt-1 text-lg font-bold text-white">Human-life protection and three independent reviews</h2>
          </div>
        </div>
        <p data-testid="human-life-review-approval" className="text-xs leading-relaxed text-slate-300">
          Historical Review v3 wording approval is preserved in the stewardship document. It does not approve this revised title or body.
          Constitutional/legal, technical-security and human-life-safety reviewers must approve one identical scoped proposal.
          Three accounts controlled by one party are not independent reviews. No founder, AI, administrator or vote can bypass this gate.
        </p>
        <div className="rounded-lg border border-slate-700 p-3 text-xs leading-relaxed text-slate-300 space-y-2">
          <p><strong>Draft review:</strong> Fresh exact wording below is unapproved. No reviewer identities or credentials have been appointed.</p>
          <p data-testid="human-life-adoption-status"><strong>Formal adoption:</strong> {matchingAmendment
            ? `Exact title and body recorded in block #${matchingAmendment.blockNumber}. A receipt does not commission enforcement or transfer authority.`
            : "No exact matching amendment confirmed on-chain. Loading or unavailable seal data is not proof of adoption."}</p>
          <p><strong>Protected-change enforcement:</strong> All amendments require an explicitly approved register, three current authenticated signatures and independently commissioned enforcement. Missing or unverifiable requirements block submission. This review panel cannot appoint reviewers or submit the draft.</p>
        </div>
        <div data-testid="human-life-safety-status" aria-live="polite" className="text-xs leading-relaxed text-slate-400 space-y-2">
          <p><strong>Separate bounded safety containment:</strong> {safetyError || !safety?.independentAuthorityVerified
            ? "Independent safety authority unavailable, unconfigured or unverifiable; controlled AI contract execution remains blocked."
            : "Independent containment authority connected for AI/SYSTEM contract execution, not certified for physical life-critical services."}</p>
          <p>The existing two-of-three safety-containment mode is not the three-of-three protected-change gate.
            Founder-pre-approved, tested urgent containment requires immediate notification and review within 24 hours.
            Missed review retains life-safe essential-service fallback, never automatic restoration of danger.
            No emergency authority transfer is permitted.</p>
          <p>Replacement, SYSTEM identity transfer and succession remain disabled. No successor is selected.
            Global participation does not establish worldwide legal enforceability; governing jurisdiction remains undecided.</p>
        </div>
        <button type="button" data-testid="button-human-life-open" aria-expanded={open} onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-200">
          <FileText className="w-4 h-4" />{open ? "Close draft review" : "Read exact proposed text"}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {open && <div data-testid="human-life-draft" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5 space-y-3">
        <h3 className="text-base font-bold text-white">{HUMAN_LIFE_TITLE}</h3>
        <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-200">{HUMAN_LIFE_BODY}</pre>
        <p className="text-xs text-slate-400">Reserved identities, original seal and conjunctive succession eligibility remain unchanged.
          Authority-bearing replacement cannot be relabelled as routine maintenance. Unanimous review never waives human-life safeguards.</p>
        <p className="text-right font-mono text-[10px] text-slate-500">{HUMAN_LIFE_BODY.length}/4000 characters</p>
      </div>}
    </section>
  );
}
