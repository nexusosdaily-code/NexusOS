import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  HARDWARE_REFERENCE_SYSTEM, HARDWARE_RELEASE_GATES, HARDWARE_REVIEW_HOLD, HARDWARE_EVIDENCE_CORRECTION,
} from "@shared/hardware-readiness";

export function HardwareReadinessPanel() {
  return (
    <section aria-labelledby="hardware-readiness-heading" className="space-y-6 text-slate-200">
      <header className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-amber-300">Engineering review required</p>
        <h1 id="hardware-readiness-heading" className="text-3xl font-bold">Grounded system architecture and hardware readiness</h1>
        <p className="leading-relaxed text-slate-300">
          NexusOS currently runs as hosted software on conventional electronic computers.
          It is not a demonstrated native photonic operating system or optical processor.
          The reference architecture below defines the whole initial system boundary, not an approved procurement specification.
        </p>
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
          {HARDWARE_REVIEW_HOLD.reason} No component purchase, system performance, cost or delivery date is approved by this page.
        </p>
      </header>

      <section aria-label="Correction of earlier hardware claims" className="space-y-3 rounded-xl border border-amber-700/50 bg-amber-950/20 p-4">
        <h2 className="text-xl font-semibold text-amber-200">Correction of earlier hardware claims</h2>
        <p className="text-sm leading-relaxed text-slate-300">{HARDWARE_EVIDENCE_CORRECTION}</p>
        <p className="text-sm leading-relaxed text-slate-400">
          Electrical measurements are reported project records, not independently reproduced optical results.
          No validated end-to-end photonic parts list, optical integration test or independent system sign-off is established by those records.
          Historical disclosures are retained for traceability, not presented as proof.
        </p>
      </section>

      <section aria-labelledby="baseline-heading" className="space-y-3">
        <h2 id="baseline-heading" className="text-xl font-semibold">What the first complete system would contain</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          Two independently configured conventional hosts, the existing compiler/runtime,
          versioned protocol data, a standard network link, storage, access controls and measurement tools.
          Fibre transport is optional and conventional: carrying WNSP data over an optical link is not photonic computation.
          A second implementation and physical tests are still required before interoperability claims.
        </p>
        {HARDWARE_REFERENCE_SYSTEM.map(item => (
          <article key={item.id} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="font-semibold text-cyan-200">{item.component}</h3>
            <dl className="space-y-3 text-sm leading-relaxed">
              <div><dt className="font-semibold">Draft requirement</dt><dd className="text-slate-300">{item.specification}</dd></div>
              <div><dt className="font-semibold">Evidence boundary</dt><dd className="text-slate-400">{item.evidence}</dd></div>
              <div><dt className="font-semibold">Acceptance evidence needed</dt><dd className="text-slate-300">{item.acceptance}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Outside the initial engineering baseline</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          Native optical instruction execution; 51,200 independent physical channels; optical squeezing,
          quantum memory or entanglement; zero-loss transport; gravity control; energy creation; and replacing
          cryptographic security with spectral coordinates are not demonstrated system capabilities.
          Bifilar coil electrical tests do not establish any of these.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Required before fundraising or promotion resumes</h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-300">
          {HARDWARE_RELEASE_GATES.map(gate => <li key={gate}>{gate}</li>)}
        </ol>
        <p className="text-sm text-amber-200">
          These gates are not marked complete. No independent engineer has been appointed or signed off through this software update.
          Documentation and automated software tests cannot substitute for physical measurements.
        </p>
      </section>
    </section>
  );
}

export function HardwareFundingHold() {
  usePageMeta({
    title: "NexusOS hardware — fundraising and promotions paused",
    description: HARDWARE_REVIEW_HOLD.reason,
  });
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-200">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-xs font-mono uppercase tracking-widest text-amber-300">Hardware campaign on hold</p>
        <h1 className="text-3xl font-bold">Fundraising and promotions paused</h1>
        <p className="leading-relaxed">{HARDWARE_REVIEW_HOLD.reason}</p>
        <p className="leading-relaxed text-slate-400">
          We are not soliciting hardware contributions or promising a working photonic computer while the design is under review.
          The present software, proposed hardware and reported electrical coil tests must not be confused.
          Existing accounts and historical records are not changed by this hold.
        </p>
        <nav aria-label="Engineering review resources" className="flex flex-wrap gap-4">
          <Link href="/hardware-spec" className="rounded-lg border border-cyan-800 px-4 py-3 text-cyan-200">Read the grounded system requirements</Link>
          <Link href="/research-transparency" className="rounded-lg border border-slate-700 px-4 py-3">Evidence and limitations</Link>
          <Link href="/" className="px-4 py-3 underline">Return to NexusOS</Link>
        </nav>
        <h2 className="text-xl font-semibold">Release requirements — not yet satisfied</h2>
        <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-slate-300">
          {HARDWARE_RELEASE_GATES.map(gate => <li key={gate}>{gate}</li>)}
        </ul>
        <p className="text-sm text-slate-400">No automatic restart date. Old promotional posts must not be replayed without review.</p>
      </div>
    </main>
  );
}
