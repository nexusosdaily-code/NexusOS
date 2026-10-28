import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { RESEARCH_EVIDENCE } from "@shared/research-evidence";
import { HARDWARE_STATUS, TOTAL_CHANNELS } from "@shared/wnsp-model";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PROJECT_DESCRIPTION } from "@shared/research-positioning";
import { ResearchPositioning } from "@/components/research-positioning";
import { ProjectDirection } from "@/components/project-direction";
import { trackEvent } from "@/lib/analytics";
import { HARDWARE_EVIDENCE_CORRECTION } from "@shared/hardware-readiness";

const REPOSITORY_URL = "https://github.com/nexusosdaily-code/NexusOS";
const PRIOR_ART_URL = `${REPOSITORY_URL}/blob/main/PRIOR_ART.md`;

const EVIDENCE_CATEGORIES = [
  {
    title: "Implemented software",
    tone: "text-cyan-200 border-cyan-900/70 bg-cyan-950/20",
    description:
      "Shows that specified software behavior or a computation exists in code and runs on conventional infrastructure. It does not show that an optical device performs it or that a physical interpretation is correct.",
  },
  {
    title: "Calculation",
    tone: "text-indigo-200 border-indigo-900/70 bg-indigo-950/20",
    description:
      "A result follows from stated equations and assumptions. Calculation alone does not establish that the assumptions describe nature, that a relation is novel, or that a proposed device works.",
  },
  {
    title: "Reported measurement",
    tone: "text-emerald-200 border-emerald-900/70 bg-emerald-950/20",
    description:
      "A result reported for a particular device and test condition supports only those measured characteristics. The reported electrical tests on three Coiltek bifilar coils are not optical tests and do not validate gravity control or ZERO-G.",
  },
  {
    title: "Hypothesis",
    tone: "text-amber-200 border-amber-900/70 bg-amber-950/20",
    description:
      "A proposal, architecture or prediction under investigation. It remains unconfirmed until suitable methods, data, repeatability and relevant independent replication are documented.",
  },
];

const CORRECTIONS = [
  {
    before: "Photon-energy conversion presented as a new mass or unified force law",
    now: "Λ = hf/c² is an energy-to-mass equivalent. A photon has zero rest mass; this conversion does not prove force unification or gravity control.",
  },
  {
    before: "555 THz described as the universe's first oscillation",
    now: "555 THz is the project's selected model reference, not an observed cosmic first frequency.",
  },
  {
    before: "Configured coordinates described as physical capacity",
    now: "The 51,200 figure is a count of nominal software labels, not measured throughput or demonstrated independent optical modes.",
  },
  {
    before: "Electrical coil tests treated as validation of the photonic or gravity architecture",
    now: "The reported tests concern electrical inductance and DC resistance on three coils; they do not validate optical operation, quantum memory, zero loss, gravity control, ZERO-G or mass displacement.",
  },
  {
    before: "Coordinates or wavelength checks described as a replacement for security",
    now: "Coordinate consistency does not authenticate a sender. Cryptography, authorization, integrity and consensus are separate requirements.",
  },
];

export default function ResearchTransparencyPage() {
  const [query, setQuery] = useState("");
  const lastTrackedFilter = useRef("");
  usePageMeta({
    title: "Research Transparency — NexusOS",
    description:
      "Evidence boundaries, current corrections, and act-by-act research disclosures for NexusOS and WNSP.",
    canonical: "https://wnsp.io/research-transparency",
  });

  const acts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return RESEARCH_EVIDENCE;
    return RESEARCH_EVIDENCE.filter((entry) =>
      [entry.title, entry.established, entry.proposal, entry.limitation, String(entry.act)]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized === lastTrackedFilter.current) return;
    const timeout = window.setTimeout(() => {
      trackEvent("research_filter_used", {
        surface: "research_transparency",
        action: normalized ? "filter" : "clear",
        result_count: acts.length,
      });
      // Keep the comparison local: never send the search text or its hash.
      lastTrackedFilter.current = normalized;
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [query, acts.length]);

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-slate-200">
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{
          background:
            "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#16a34a,#cccc00,#ff8c00,#cc0000)",
        }}
      />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="mb-10 border-b border-slate-800 pb-8">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-xs text-slate-400 underline decoration-slate-700 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            NexusOS
          </Link>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
            Public research record / evidence boundaries
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
            What is established, what is proposed, and what remains untested.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            {PROJECT_DESCRIPTION}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            This is the current editorial interpretation of the project's source records—not a hardware performance certificate or independent scientific review. Historical numbered disclosures remain preserved and have not been silently rewritten.
          </p>
          <div className="mt-6">
            <ProjectDirection />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={REPOSITORY_URL}
              onClick={() => trackEvent("research_link_opened", { surface: "research_transparency", destination: "repository" })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border border-slate-700 bg-slate-900 px-4 text-xs font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              Project repository
            </a>
            <a
              href={PRIOR_ART_URL}
              onClick={() => trackEvent("research_link_opened", { surface: "research_transparency", destination: "numbered_disclosures" })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border border-slate-700 bg-slate-900 px-4 text-xs font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              Original numbered disclosures
            </a>
          </div>
        </header>

        <section aria-label="Correction of earlier hardware claims" className="mb-10 space-y-3 rounded-xl border border-amber-800/60 bg-amber-950/20 p-5">
          <h2 className="text-lg font-semibold text-amber-200">Correction of earlier hardware claims</h2>
          <p className="text-sm leading-relaxed text-slate-300">{HARDWARE_EVIDENCE_CORRECTION}</p>
          <Link href="/hardware-spec" className="inline-flex min-h-11 items-center text-sm text-cyan-200 underline underline-offset-4">
            Read the grounded hardware requirements and missing evidence
          </Link>
        </section>

        <section aria-labelledby="status-heading" className="mb-12">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/25 p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                Current implementation status
              </p>
              <h2 id="status-heading" className="mt-2 text-xl font-semibold text-slate-50">
                Software models, not a demonstrated photonic computer
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{HARDWARE_STATUS}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The application, compiler and mappings run on conventional servers and computers. Native photonic execution has not been demonstrated by those software implementations. Existing photonic systems already communicate; WNSP is a proposed representation and protocol requiring interoperability demonstrations, not the first ability for computers to communicate.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                Coordinate count / calculated
              </p>
              <p className="mt-2 font-mono text-4xl font-semibold tracking-tight text-slate-50">
                {TOTAL_CHANNELS.toLocaleString("en-US")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Nominal software labels from 256 wavelength indices × 50 OAM indices × 2 polarisations × 2 directions. This is not measured optical capacity, throughput, or demonstrated independent modes.
              </p>
            </div>
          </div>
        </section>

        <ResearchPositioning />

        <section aria-labelledby="categories-heading" className="mb-12">
          <div className="mb-5 max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">
              How to read this record
            </p>
            <h2 id="categories-heading" className="mt-2 text-2xl font-semibold text-slate-50">
              Four evidence categories
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {EVIDENCE_CATEGORIES.map((category) => (
              <article
                key={category.title}
                className={`rounded-xl border p-4 sm:p-5 ${category.tone}`}
              >
                <h3 className="font-semibold">{category.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{category.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="interpretation-heading" className="mb-12">
          <div className="mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-200">
              Interpretations to keep distinct
            </p>
            <h2 id="interpretation-heading" className="mt-2 text-2xl font-semibold text-slate-50">
              Useful boundaries for evaluating claims
            </h2>
          </div>
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/35">
            <div className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">Energy equivalent is not rest mass or density</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Λ = hf/c² expresses photon energy in mass-equivalent units. A photon has zero rest mass. The conversion does not supply a volume, pressure or spatial energy density, and does not itself establish a physical compression process.
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">A selected reference is not a cosmic observation</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                The octave framework adopts f₀ = 555 THz (approximately 540 nm) as a chosen reference. It is not an observed first frequency of the universe.
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">Reported electrical tests have a narrow scope</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Reported inductance and DC-resistance tests on three Coiltek bifilar coils are electrical measurements. They are not optical or gravity validation and do not establish optical squeezing, memory, zero loss, ZERO-G or mass displacement.
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">Proposed safeguards are not automatically law</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Safeguards in the programme are proposals. They are not automatically enacted policy or globally enforceable law; governance needs implementation, review, enactment and applicable legal assessment.
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">Funding and long horizons are not guarantees</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Hardware remains research with technical risks. Funding does not itself guarantee hardware delivery, returns, investment, equity or ownership. The century-scale horizon toward 2126 is an ambition, not a delivery guarantee or demonstrated civilisation-scale capability.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="corrections-heading" className="mb-12">
          <div className="mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
              Current interpretation
            </p>
            <h2 id="corrections-heading" className="mt-2 text-2xl font-semibold text-slate-50">
              Current web correction summary
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              This summary states the current interpretation of claims in project materials. It does not invent a chronology of past corrections or claim an independent review.
            </p>
          </div>
          <div className="space-y-3">
            {CORRECTIONS.map((item) => (
              <article key={item.before} className="rounded-lg border border-slate-800 bg-slate-900/35 p-4">
                <p className="text-xs leading-5 text-slate-500">{item.before}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{item.now}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="acts-heading" className="mb-12">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                Act-by-act evidence boundaries
              </p>
              <h2 id="acts-heading" className="mt-2 text-2xl font-semibold text-slate-50">
                All 20 research disclosures
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Each record separates established basis, project proposal and evidence limit. Open the linked source entry for its full context.
              </p>
            </div>
            <label className="block w-full sm:max-w-xs">
              <span className="sr-only">Filter research Acts</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter Acts"
                className="min-h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-900"
              />
            </label>
          </div>
          {acts.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
              No Acts match “{query}”. Try a different title, number or term.
            </div>
          ) : (
            <div className="space-y-3">
              {acts.map((entry) => (
                <article
                  key={entry.act}
                  id={`act-${entry.act}`}
                  className="scroll-mt-6 rounded-xl border border-slate-800 bg-slate-900/45 p-4 sm:p-5"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200">
                        Act {String(entry.act).padStart(2, "0")}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-50">{entry.title}</h3>
                    </div>
                    <Link
                      href={entry.route}
                      onClick={() => trackEvent("research_link_opened", { surface: "research_transparency", destination: "act", act: entry.act })}
                      className="inline-flex min-h-11 items-center rounded-md border border-slate-700 px-3 text-xs text-slate-300 hover:border-cyan-700 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    >
                      Open Act
                    </Link>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-100">Established basis</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{entry.established}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Project proposal</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{entry.proposal}</p>
                    </div>
                    <div className="rounded-lg border border-amber-900/50 bg-amber-950/15 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-200">Evidence limit</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{entry.limitation}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="accountability-heading" className="mb-12">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-200">
              Accountability and corrections
            </p>
            <h2 id="accountability-heading" className="mt-2 text-xl font-semibold text-slate-50">
              Preserve the record; make changes traceable
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <p>
                The founder supplies project direction, questions and decisions. AI assistance, including Replit Agent, has contributed code, explanations, mathematical formulations and research narrative, and has also contributed overstatements that require correction. AI output and repository timestamps are not substitutes for verification; existing historical author labels are preserved.
              </p>
              <p>
                Original numbered disclosures remain available in <a className="text-cyan-200 underline decoration-cyan-900 underline-offset-4 hover:text-cyan-100" href={PRIOR_ART_URL} onClick={() => trackEvent("research_link_opened", { surface: "research_transparency", destination: "numbered_disclosures" })} target="_blank" rel="noopener noreferrer">PRIOR_ART.md</a>. This page does not silently rewrite them or determine legal authorship, inventorship, priority or ownership. Corrections should identify the basis, assumptions, evidence and limits, and be recorded through traceable review. Do not describe independent review unless it has actually occurred.
              </p>
              <p>
                The project documentation repository is public at{" "}
                <a className="text-cyan-200 underline decoration-cyan-900 underline-offset-4 hover:text-cyan-100" href={REPOSITORY_URL} onClick={() => trackEvent("research_link_opened", { surface: "research_transparency", destination: "repository" })} target="_blank" rel="noopener noreferrer">github.com/nexusosdaily-code/NexusOS</a>.
                Repository links do not imply that a pending GitHub documentation pull request has been merged.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Source records are project documents and code; this page makes no claim of independent validation.</p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            Return to NexusOS
          </Link>
        </footer>
      </div>
    </main>
  );
}
