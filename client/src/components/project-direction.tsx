import { PROJECT_EVIDENCE_PRINCIPLE, PROJECT_FOCUS, PROJECT_HORIZON } from "@shared/research-positioning";
import { Link } from "wouter";

export function ProjectDirection() {
  return (
    <section
      aria-labelledby="project-direction-heading"
      className="rounded-xl border border-violet-500/25 bg-slate-900/70 p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
        <h2 id="project-direction-heading" className="text-sm font-semibold tracking-wide text-slate-100">
          Project direction
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">
          Software first · long horizon
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <article>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-300">The priority</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{PROJECT_FOCUS}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link href="/wavelength-lang" className="min-h-11 inline-flex items-center text-cyan-200 underline decoration-cyan-900 underline-offset-4 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              WavelengthScript
            </Link>
            <Link href="/blockchain" className="min-h-11 inline-flex items-center text-cyan-200 underline decoration-cyan-900 underline-offset-4 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              Blockchain
            </Link>
          </div>
        </article>
        <article>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">A century to build</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{PROJECT_HORIZON}</p>
        </article>
        <article>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Evidence earns trust</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{PROJECT_EVIDENCE_PRINCIPLE}</p>
          <Link href="/research-transparency" className="mt-3 min-h-11 inline-flex items-center text-xs text-cyan-200 underline decoration-cyan-900 underline-offset-4 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
            Read the evidence record
          </Link>
        </article>
      </div>
    </section>
  );
}
