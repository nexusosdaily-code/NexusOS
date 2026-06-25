import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";

const DATE   = "2026-06-25";
const REPO   = "https://github.com/nexusosdaily-code/NexusOS";

type Status = "pending" | "in-progress" | "pass" | "fail";

interface PhaseResult {
  id: string;
  title: string;
  objective: string;
  status: Status;
  passCriteria: string;
  measurements?: { label: string; expected: string; measured: string | null; pass: boolean | null }[];
  notes?: string;
}

const PHASES: PhaseResult[] = [
  {
    id: "P0",
    title: "Procurement & Bench Verification",
    objective: "All components ordered and received. Instruments self-test passed.",
    status: "in-progress",
    passCriteria: "All items on AU shopping list received. Oscilloscope, function generator, bench PSU all self-test green.",
    measurements: [
      { label: "PHR-1 components ordered", expected: "All items confirmed", measured: null, pass: null },
      { label: "SNIC optical components ordered", expected: "All items confirmed", measured: null, pass: null },
      { label: "Oscilloscope self-test", expected: "PASS", measured: null, pass: null },
      { label: "Function generator self-test", expected: "PASS", measured: null, pass: null },
    ],
    notes: "Bifilar coil winding inquiry sent to Etsy AU custom winder. Coil spec: T200-2 toroid, AWG 24, 144 turns bifilar, 4 labelled leads.",
  },
  {
    id: "P1",
    title: "PHR-1 — Bifilar Coil Winding",
    objective: "144-turn bifilar toroidal coil wound and inductance verified on both windings.",
    status: "pending",
    passCriteria: "Both windings measure within 5% of calculated inductance. DC resistance symmetric to within 2%.",
    measurements: [
      { label: "Winding A inductance", expected: "Calculated target ±5%", measured: null, pass: null },
      { label: "Winding B inductance", expected: "Calculated target ±5%", measured: null, pass: null },
      { label: "DC resistance A", expected: "Symmetric ±2%", measured: null, pass: null },
      { label: "DC resistance B", expected: "Symmetric ±2%", measured: null, pass: null },
    ],
  },
  {
    id: "P2",
    title: "PHR-1 — Phase Control Circuit",
    objective: "Arduino + DAC drives H-bridge producing two bifilar outputs with controllable phase offset 0°–360°.",
    status: "pending",
    passCriteria: "Clean sine waves at target frequency. Phase offset clearly distinct on oscilloscope. Coil current in phase with drive voltage.",
    measurements: [
      { label: "Sine wave quality", expected: "Clean, no distortion", measured: null, pass: null },
      { label: "Phase offset range", expected: "0°–360° controllable", measured: null, pass: null },
      { label: "Coil current phase", expected: "In phase with drive", measured: null, pass: null },
    ],
  },
  {
    id: "P3",
    title: "PHR-1 — Standing Wave Measurement",
    objective: "Field amplitude varies with phase offset in consistent standing wave pattern. 36 data points (10° steps). Reproducible across 3 independent measurement runs.",
    status: "pending",
    passCriteria: "Consistent standing wave pattern across all 36 phase steps. Pattern reproducible on 3 separate days. verifyHardwareAnchor() returns PASS on /hardware-lab.",
    measurements: [
      { label: "Standing wave pattern (run 1)", expected: "Consistent vs phase", measured: null, pass: null },
      { label: "Standing wave pattern (run 2)", expected: "Matches run 1", measured: null, pass: null },
      { label: "Standing wave pattern (run 3)", expected: "Matches run 1+2", measured: null, pass: null },
      { label: "verifyHardwareAnchor()", expected: "PASS", measured: null, pass: null },
    ],
  },
  {
    id: "P4",
    title: "SNIC — Optical Bench Assembly",
    objective: "Light source, collimating lens, diffraction grating, and spectrometer aligned. Reference spectrum captured.",
    status: "pending",
    passCriteria: "Reference spectrum captured with no filters. Grating spectral spread clearly resolved. Spectrometer wavelength axis calibrated.",
    measurements: [
      { label: "Optical alignment", expected: "Signal at spectrometer", measured: null, pass: null },
      { label: "Grating spectral spread", expected: "Clearly resolved", measured: null, pass: null },
      { label: "Reference spectrum", expected: "Captured, calibrated", measured: null, pass: null },
    ],
  },
  {
    id: "P5",
    title: "SNIC — Channel Separation Verification",
    objective: "Measured wavelength for each bandpass filter matches CE_TABLE prediction to ±2.000 nm. Reproducible across 3 independent runs.",
    status: "pending",
    passCriteria: "All three filters pass ±2.000 nm criterion. Results reproducible across 3 independent days.",
    measurements: [
      { label: "450 nm filter — run 1", expected: "450.000 ± 2.000 nm", measured: null, pass: null },
      { label: "450 nm filter — run 2", expected: "450.000 ± 2.000 nm", measured: null, pass: null },
      { label: "450 nm filter — run 3", expected: "450.000 ± 2.000 nm", measured: null, pass: null },
      { label: "532 nm filter — run 1", expected: "532.000 ± 2.000 nm", measured: null, pass: null },
      { label: "532 nm filter — run 2", expected: "532.000 ± 2.000 nm", measured: null, pass: null },
      { label: "532 nm filter — run 3", expected: "532.000 ± 2.000 nm", measured: null, pass: null },
      { label: "633 nm filter — run 1", expected: "633.000 ± 2.000 nm", measured: null, pass: null },
      { label: "633 nm filter — run 2", expected: "633.000 ± 2.000 nm", measured: null, pass: null },
      { label: "633 nm filter — run 3", expected: "633.000 ± 2.000 nm", measured: null, pass: null },
    ],
  },
  {
    id: "P6",
    title: "Documentation & Publication",
    objective: "Every pass criterion backed by at least one recorded file. Full dataset published to GitHub under AGPL-3.0.",
    status: "pending",
    passCriteria: "Every PASS in every phase has a corresponding video, photo, or data file. Full dataset committed to repository.",
    measurements: [
      { label: "PHR-1 video evidence", expected: "Uploaded", measured: null, pass: null },
      { label: "SNIC video evidence", expected: "Uploaded", measured: null, pass: null },
      { label: "Full dataset committed", expected: "GitHub AGPL-3.0", measured: null, pass: null },
    ],
  },
];

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "#64748b", Icon: Clock },
  "in-progress": { label: "In Progress", color: "#f59e0b", Icon: AlertCircle },
  pass:        { label: "PASS",        color: "#10b981", Icon: CheckCircle },
  fail:        { label: "FAIL",        color: "#ef4444", Icon: XCircle },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, borderColor: cfg.color + "44", background: cfg.color + "15" }}>
      <cfg.Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

export default function HardwareResultsPage() {
  usePageMeta({
    title: "Hardware Verification Results — PHR-1 + SNIC | NexusOS",
    description: "Live hardware verification results for the NexusOS physics proof of concept. PHR-1 bifilar coil and SNIC optical demonstrator. Measurement data published within 24 hours of each successful run.",
    canonical: "https://wnsp.io/hardware-results",
    ogTitle: "NexusOS Hardware Verification — PHR-1 + SNIC Results",
    ogDescription: "Live measurement results: PHR-1 standing wave field vs CE_TABLE predictions. SNIC bandpass filter wavelengths vs predicted values. Australia 2026.",
    twitterTitle: "NexusOS Hardware Results — PHR-1 + SNIC",
    twitterDescription: "Real-time physics hardware verification. PHR-1 bifilar coil + SNIC optical demonstrator. Australia, 2026.",
  });

  const passCount = PHASES.filter(p => p.status === "pass").length;
  const totalPhases = PHASES.length;
  const inProgress = PHASES.filter(p => p.status === "in-progress").length;

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/hub" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-500 font-mono">NexusOS · Hardware Verification Results</span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">{DATE}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* ── Header ── */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border"
            style={{ color: "#f59e0b", borderColor: "#f59e0b44", background: "#f59e0b10" }}>
            <AlertCircle className="w-3 h-3" /> HARDWARE PoC · IN PROGRESS · AUSTRALIA · {DATE}
          </div>
          <h1 className="text-2xl font-bold text-white">Hardware Verification Results</h1>
          <p className="text-sm text-slate-400 leading-7">
            Live results from the NexusOS physics hardware proof of concept.
            PHR-1 (bifilar coil) and SNIC (optical demonstrator) verify that the CE_TABLE
            wavelength predictions match physical measurements. Results published here within
            24 hours of each successful measurement run.
          </p>
        </div>

        {/* ── Overall status ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Phases Complete", value: `${passCount} / ${totalPhases}`, color: "#10b981" },
            { label: "In Progress",     value: inProgress.toString(),            color: "#f59e0b" },
            { label: "Overall Status",  value: passCount === totalPhases ? "VERIFIED" : "IN PROGRESS", color: passCount === totalPhases ? "#10b981" : "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center space-y-1">
              <div className="text-slate-600 text-[9px] uppercase tracking-widest">{s.label}</div>
              <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Phase results ── */}
        <div className="space-y-4">
          {PHASES.map(phase => {
            const cfg = STATUS_CONFIG[phase.status];
            return (
              <div key={phase.id} className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono"
                    style={{ background: cfg.color + "20", color: cfg.color }}>
                    {phase.id}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-100">{phase.title}</span>
                      <StatusBadge status={phase.status} />
                    </div>
                    <p className="text-xs text-slate-500 leading-5">{phase.objective}</p>
                    {phase.notes && (
                      <p className="text-xs text-amber-600 leading-5 italic">{phase.notes}</p>
                    )}
                  </div>
                </div>

                {phase.measurements && (
                  <div className="border-t border-slate-800/60">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/40 bg-slate-900/60">
                          <th className="px-4 py-2 text-left text-slate-600 uppercase tracking-widest text-[9px]">Measurement</th>
                          <th className="px-4 py-2 text-left text-slate-600 uppercase tracking-widest text-[9px]">Expected</th>
                          <th className="px-4 py-2 text-left text-slate-600 uppercase tracking-widest text-[9px]">Measured</th>
                          <th className="px-4 py-2 text-left text-slate-600 uppercase tracking-widest text-[9px]">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phase.measurements.map((m, i) => (
                          <tr key={i} className="border-b border-slate-800/20 hover:bg-slate-800/20 transition-colors">
                            <td className="px-4 py-2.5 text-slate-300">{m.label}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">{m.expected}</td>
                            <td className="px-4 py-2.5 font-mono">
                              {m.measured
                                ? <span className="text-slate-200">{m.measured}</span>
                                : <span className="text-slate-700">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {m.pass === null
                                ? <span className="text-slate-700 text-[10px] font-mono">awaiting</span>
                                : m.pass
                                  ? <span className="text-emerald-400 text-[10px] font-mono">PASS</span>
                                  : <span className="text-red-400 text-[10px] font-mono">FAIL</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="px-4 py-2.5 bg-slate-900/20 border-t border-slate-800/40">
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest">Pass criterion — </span>
                  <span className="text-[11px] text-slate-500">{phase.passCriteria}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Publication notice ── */}
        <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-3">
          <h2 className="text-sm font-bold text-cyan-300">Publication Protocol</h2>
          <div className="text-xs text-slate-400 leading-6 space-y-2">
            <p>
              All measurement data, videos, and lab notebook records will be committed to the
              NexusOS GitHub repository under AGPL-3.0 within 24 hours of each successful
              phase completion. Nothing is held back. The data is published whether the
              result is PASS or FAIL.
            </p>
            <p>
              Results are published here in real time as measurements are taken.
              This page is publicly indexed and permanently on record.
            </p>
          </div>
          <a href={REPO} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
            <ExternalLink className="w-3 h-3" /> GitHub repository (AGPL-3.0)
          </a>
        </section>

        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { href: "/poc",                label: "Full PoC Scope" },
            { href: "/hardware-lab",       label: "Hardware Lab" },
            { href: "/paper",              label: "Theory Paper" },
            { href: "/octave-layers",      label: "Russell Octave Layers" },
            { href: "/hardware-spec",      label: "Hardware Specification" },
            { href: "/founders",           label: "Founding Architects" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="block border border-slate-800 rounded-lg px-3 py-2.5 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-center">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-slate-700 text-[10px] font-mono pb-4">
          AGPL-3.0 · NexusOS Hardware Verification · {DATE}
        </p>
      </div>
    </div>
  );
}
