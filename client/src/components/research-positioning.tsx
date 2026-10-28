import {
  INTEROPERABILITY_BOUNDARY,
  PRIORITY_BOUNDARY,
  PROJECT_DISTINCTION,
  RELATED_WORK,
} from "@shared/research-positioning";
import { trackEvent } from "@/lib/analytics";

export function ResearchPositioning() {
  return (
    <section id="distinctive-approach" aria-labelledby="positioning-heading" className="mb-12 scroll-mt-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">
        Design philosophy / related work
      </p>
      <h2 id="positioning-heading" className="mt-2 text-2xl font-semibold text-slate-50">
        How WavelengthScript/WNSP differs
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
        <p>
          The design philosophy assigns supported human-readable characters to spectral coordinates and
          investigates their use alongside language operations, addressing and communication models.
          WavelengthScript is the programming-language component; WNSP is the associated encoding,
          addressing and protocol research.
        </p>
        <p>{PROJECT_DISTINCTION}</p>
        <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 font-mono text-xs leading-6 text-cyan-100">
          Characters → agreed encoding profile → spectral-coordinate labels → supported operations and protocol rules
        </p>
        <p>
          One existing 128-entry character table uses λ = 380 + 3.125 × i nm, for i = 0…127.
          The ASCII character A (65) maps to 583.125 nm. These are assigned software coordinates,
          not measured light emissions or meanings inherent in nature. Modulo projection aliases
          characters outside the supported range; original text needs a lossless transport.
          Account derivation, VM name fingerprints and proposed optical bins use different profiles
          and must not be silently substituted.
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {RELATED_WORK.map((work) => (
          <article key={work.title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
            <h3 className="font-semibold text-slate-100">
              <a href={work.url} onClick={() => trackEvent("research_link_opened", { surface: "research_transparency", destination: "related_work", reference: work.id })} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-600 underline-offset-4 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                {work.title}
              </a>
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300"><strong>Overlap:</strong> {work.overlap}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400"><strong>Difference:</strong> {work.difference}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 space-y-3 rounded-xl border border-amber-900/60 bg-amber-950/15 p-4 text-sm leading-6 text-slate-300 sm:p-5">
        <p><strong className="text-amber-200">What remains unproven:</strong> {PRIORITY_BOUNDARY}</p>
        <p>{INTEROPERABILITY_BOUNDARY}</p>
        <p>
          Independent implementations should reproduce agreed encodings and program results, exchange
          messages in both directions, preserve precision and errors, and publish repeatable methods
          and measurements. A successful test supports its tested configurations—not every photonic architecture.
          Spectral consistency does not replace cryptographic authentication or integrity.
        </p>
      </div>
    </section>
  );
}
