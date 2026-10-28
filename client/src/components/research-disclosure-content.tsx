import { Link } from "wouter";
import { HARDWARE_STATUS } from "@shared/wnsp-model";
import { trackEvent } from "@/lib/analytics";

interface ResearchDisclosureContentProps {
  title?: string;
  context: string;
  established?: string;
  proposal?: string;
  limitation?: string;
  showHardware?: boolean;
}

export function ResearchDisclosureContent({
  title = "Research status",
  context,
  established,
  proposal,
  limitation,
  showHardware = false,
}: ResearchDisclosureContentProps) {
  return (
    <aside
      aria-label={`${title}: evidence and limitations`}
      className="my-5 rounded-xl border border-amber-800/50 bg-amber-950/25 p-4 text-xs leading-relaxed text-slate-300 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
          {title}
        </span>
        <span className="text-slate-500">/</span>
        <span className="text-slate-400">{context}</span>
      </div>
      {established && (
        <p className="mb-2">
          <strong className="text-slate-100">Established basis:</strong> {established}
        </p>
      )}
      {proposal && (
        <p className="mb-2">
          <strong className="text-slate-100">Project proposal:</strong> {proposal}
        </p>
      )}
      {limitation && (
        <p className="mb-2">
          <strong className="text-amber-200">Evidence limit:</strong> {limitation}
        </p>
      )}
      {showHardware && (
        <p className="mb-2">
          <strong className="text-slate-100">Hardware status:</strong> {HARDWARE_STATUS}
        </p>
      )}
      <p className="mt-3 border-t border-amber-900/50 pt-3 text-slate-400">
        WNSP is a proposed representation and protocol that needs interoperability demonstrations. Existing photonic systems already communicate; this project is not claiming the first ability for computers to communicate.
      </p>
      <Link
        href="/research-transparency"
        onClick={() => trackEvent("research_disclosure_opened", { surface: "research_notice", context })}
        className="mt-3 inline-flex min-h-11 items-center rounded-md text-amber-300 underline decoration-amber-700 underline-offset-4 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        Read the full research transparency record
      </Link>
    </aside>
  );
}
