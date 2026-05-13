import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Waves, Play, Pause, RotateCcw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

// ── CODATA 2018 / SI exact constants ─────────────────────────────────────────
const H  = 6.62607015e-34;   // J·s  (exact 2019 SI)
const C  = 299_792_458;      // m/s  (exact 1983 SI)
const EV = 1.602176634e-19;  // J/eV (exact 2019 SI)

const NM_MIN       = 380;
const NM_MAX       = 780;
const WDM_CHANNELS = 256;
// Reference for fee multiplier: green 560 nm
const REF_NM  = 560;
const REF_E   = H * (C / (REF_NM * 1e-9));

// ── 5 named channels ──────────────────────────────────────────────────────────
const CHANNELS = [
  { id: "SYSTEM",  label: "SYSTEM",  wdm: 32,  color: "#8b00ff", bg: "rgba(139,0,255,0.10)" },
  { id: "KERNEL",  label: "KERNEL",  wdm: 96,  color: "#2563eb", bg: "rgba(37,99,235,0.10)" },
  { id: "USER",    label: "USER",    wdm: 160, color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  { id: "GUEST",   label: "GUEST",   wdm: 224, color: "#d97706", bg: "rgba(217,119,6,0.10)" },
  { id: "Genesis", label: "Genesis", wdm: 52,  color: "#ffffff", bg: "rgba(255,255,255,0.07)" },
] as const;

type ChannelId = typeof CHANNELS[number]["id"];
type ViewMode  = "both" | "mathematical" | "plain";

// ── Physics ───────────────────────────────────────────────────────────────────
function computeOscillation(wdm: number, tMs: number) {
  const w           = Math.max(0, Math.min(255, Math.round(wdm)));
  const nm          = NM_MIN + w * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
  const frequencyHz = C / (nm * 1e-9);
  const periodS     = 1 / frequencyHz;
  const energyJ     = H * frequencyHz;
  const energyEv    = energyJ / EV;
  const lambdaKg    = energyJ / (C * C);
  const feeMultiplier = energyJ / REF_E;
  // Normalized phase: (t%T)/T  →  [0,1) — avoids float64 overflow at ~500 THz
  const phase    = (frequencyHz * (tMs * 1e-3)) % 1;
  const phaseRad = phase * 2 * Math.PI;
  const amplitude = Math.cos(phaseRad);            // cosine: +1 at t=0
  const waveform  = Array.from({ length: 128 }, (_, i) =>
    Math.cos(phaseRad + (i / 128) * 2 * Math.PI)
  );
  return { w, nm, frequencyHz, periodS, energyJ, energyEv, lambdaKg, feeMultiplier, phase, phaseRad, amplitude, waveform };
}

function fmtSci(v: number, dp = 4) { return v.toExponential(dp); }

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function CopyBtn({ text, testId }: { text: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
      data-testid={testId ?? "button-copy"}
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Dual-layer section wrapper ────────────────────────────────────────────────
function DualSection({
  title, concept, technical, testId, viewMode,
}: {
  title: string;
  concept: React.ReactNode;
  technical: React.ReactNode;
  testId: string;
  viewMode: ViewMode;
}) {
  const [open, setOpen] = useState(true);
  const showConcept = viewMode !== "mathematical";
  const showTech    = viewMode !== "plain";
  return (
    <section data-testid={testId} className="border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-900/60 hover:bg-slate-900/80 transition-colors"
        data-testid={`${testId}-toggle`}
      >
        <span className="font-semibold text-white text-lg">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && (
        <div className={`grid ${showConcept && showTech ? "grid-cols-1 md:grid-cols-2 md:divide-x divide-slate-800" : "grid-cols-1"}`}>
          {showConcept && (
            <div className="px-6 py-5 bg-slate-950/60 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold">Conceptual Layer</div>
              {concept}
            </div>
          )}
          {showTech && (
            <div className="px-6 py-5 bg-slate-900/30 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-violet-400 font-bold">Physics Layer</div>
              {technical}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── 5-channel SVG oscilloscope ─────────────────────────────────────────────────
function MultiOscilloscope({ tMs, active }: { tMs: number; active: Set<ChannelId> }) {
  const W = 640, H_SVG = 140, PAD = 12;
  const usable = H_SVG - PAD * 2;
  return (
    <svg
      viewBox={`0 0 ${W} ${H_SVG}`}
      className="w-full rounded-xl"
      style={{ background: "#050a14", border: "1px solid #1e293b" }}
      data-testid="oscilloscope-svg"
    >
      <line x1="0" y1={H_SVG / 2} x2={W} y2={H_SVG / 2} stroke="#1e293b" strokeWidth="1" />
      {[0.25, 0.75].map(f => (
        <line key={f} x1="0" y1={H_SVG * f} x2={W} y2={H_SVG * f} stroke="#0f172a" strokeWidth="1" />
      ))}
      <text x="4" y={PAD + 6}     fill="#334155" fontSize="8" fontFamily="monospace">+1</text>
      <text x="4" y={H_SVG - PAD} fill="#334155" fontSize="8" fontFamily="monospace">−1</text>
      {CHANNELS.map(ch => {
        if (!active.has(ch.id)) return null;
        const { waveform, amplitude } = computeOscillation(ch.wdm, tMs);
        const pts = waveform.map((y, i) =>
          `${((i / (waveform.length - 1)) * W).toFixed(1)},${(PAD + ((1 - y) / 2) * usable).toFixed(1)}`
        ).join(" ");
        const headY = PAD + ((1 - amplitude) / 2) * usable;
        return (
          <g key={ch.id}>
            <polyline points={pts} fill="none" stroke={ch.color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
            <circle cx={0} cy={headY} r="3.5" fill={ch.color} opacity="0.9" />
          </g>
        );
      })}
    </svg>
  );
}

// ── Compression state table ───────────────────────────────────────────────────
function CompressionTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 text-xs font-mono">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px] tracking-widest">
            <th className="px-3 py-2 text-left">Channel</th>
            <th className="px-3 py-2 text-right">λ (nm)</th>
            <th className="px-3 py-2 text-right">Λ (kg)</th>
            <th className="px-3 py-2 text-right">E (eV)</th>
            <th className="px-3 py-2 text-right">Fee ×</th>
          </tr>
        </thead>
        <tbody>
          {CHANNELS.map(ch => {
            const s = computeOscillation(ch.wdm, 0);
            return (
              <tr key={ch.id} className="border-b border-slate-900 hover:bg-slate-900/40">
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: ch.bg, color: ch.color }}>{ch.label}</span>
                </td>
                <td className="px-3 py-2 text-right" style={{ color: ch.color }}>{s.nm.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-slate-300">{fmtSci(s.lambdaKg, 3)}</td>
                <td className="px-3 py-2 text-right text-violet-400">{s.energyEv.toFixed(4)}</td>
                <td className="px-3 py-2 text-right text-amber-400">{s.feeMultiplier.toFixed(4)}×</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Waveform band table ───────────────────────────────────────────────────────
function WavefunctionTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 text-xs font-mono">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px] tracking-widest">
            <th className="px-3 py-2 text-left">Channel</th>
            <th className="px-3 py-2 text-right">λ (nm)</th>
            <th className="px-3 py-2 text-right">f (THz)</th>
            <th className="px-3 py-2 text-right">T (fs)</th>
            <th className="px-3 py-2 text-right">ψ(t=0)</th>
          </tr>
        </thead>
        <tbody>
          {CHANNELS.map(ch => {
            const s = computeOscillation(ch.wdm, 0);
            return (
              <tr key={ch.id} className="border-b border-slate-900 hover:bg-slate-900/40">
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: ch.bg, color: ch.color }}>{ch.label}</span>
                </td>
                <td className="px-3 py-2 text-right" style={{ color: ch.color }}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: ch.color }} />
                  {s.nm.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right text-slate-300">{(s.frequencyHz / 1e12).toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-slate-400">{(s.periodS * 1e15).toFixed(3)}</td>
                <td className="px-3 py-2 text-right text-emerald-400">+1.000000</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OscillatingQuantaPage() {
  const [tMs,      setTMs]     = useState(0);
  const [playing,  setPlaying] = useState(false);
  const [active,   setActive]  = useState<Set<ChannelId>>(
    new Set(["SYSTEM", "KERNEL", "USER", "GUEST", "Genesis"] as ChannelId[])
  );
  const [focused,  setFocused]  = useState<ChannelId>("USER");
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  const rafRef  = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const tick = useCallback((now: number) => {
    if (lastRef.current === null) lastRef.current = now;
    setTMs(prev => prev + (now - lastRef.current!));
    lastRef.current = now;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (playing) { lastRef.current = null; rafRef.current = requestAnimationFrame(tick); }
    else { if (rafRef.current) cancelAnimationFrame(rafRef.current); }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const reset = () => { setPlaying(false); setTMs(0); };
  const toggleChannel = (id: ChannelId) =>
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });

  const focusedCh = CHANNELS.find(c => c.id === focused)!;
  const fs = computeOscillation(focusedCh.wdm, tMs);

  const curlWdm = `curl -X POST https://nexusos.replit.app/api/wnsp/quanta/oscillate \\
  -H "Content-Type: application/json" \\
  -d '{"wdm": ${focusedCh.wdm}}'`;

  const curlNm = `curl -X POST https://nexusos.replit.app/api/wnsp/quanta/oscillate \\
  -H "Content-Type: application/json" \\
  -d '{"wavelength_nm": ${fs.nm.toFixed(3)}}'`;

  const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: "both",         label: "Both"         },
    { key: "mathematical", label: "Mathematical"  },
    { key: "plain",        label: "Plain English" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/" data-testid="link-back-hub">
              <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Hub
              </button>
            </Link>
            <span className="text-slate-700">/</span>
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white text-sm">Oscillating Quanta — First Principles</span>
          </div>
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5" data-testid="view-mode-toggle">
            {VIEW_MODES.map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                data-testid={`view-mode-${v.key}`}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  viewMode === v.key
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-5">

        {/* ── §0 — The First Oscillation ────────────────────────────────────── */}
        <DualSection
          testId="section-0-first-oscillation"
          title="§0 — The First Oscillation"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                NexusOS is founded on the Theory of Compression States: the universe began
                as a single unobserved oscillation — a photon that oscillated before anything
                existed to detect it. This first oscillation is not a metaphor. It is a
                measurable frequency embedded into the protocol.
              </p>
              <p>
                Every WNSP channel, every transaction fee, and every spectral address descends
                from this originating event. The Genesis Node — channel Ψ(52,65,V) — represents
                this first oscillation. It is the first node NexusOS registers at boot.
              </p>
              <p className="text-xs text-slate-500">
                "Before observation there was oscillation. The wave collapsed into the universe."
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-1.5">
                <div className="text-slate-500 mb-2">// Genesis Node — first registered channel</div>
                <div><span className="text-cyan-400">GENESIS_WDM</span>  <span className="text-slate-500">=</span> <span className="text-amber-300">52</span>     <span className="text-slate-600">// SYSTEM band</span></div>
                <div><span className="text-cyan-400">GENESIS_OAM</span>  <span className="text-slate-500">=</span> <span className="text-amber-300">65</span></div>
                <div><span className="text-cyan-400">GENESIS_POL</span>  <span className="text-slate-500">=</span> <span className="text-green-300">"V"</span>  <span className="text-slate-600">// vertical</span></div>
                <div className="border-t border-slate-800 pt-2 mt-1">
                  <div><span className="text-cyan-400">λ</span> <span className="text-slate-500">=</span> <span className="text-white font-bold">{computeOscillation(52, 0).nm.toFixed(4)} nm</span></div>
                  <div><span className="text-cyan-400">f</span> <span className="text-slate-500">=</span> <span className="text-white font-bold">{(computeOscillation(52, 0).frequencyHz / 1e12).toFixed(4)} THz</span></div>
                  <div><span className="text-cyan-400">E</span> <span className="text-slate-500">=</span> <span className="text-white font-bold">{computeOscillation(52, 0).energyEv.toFixed(6)} eV</span></div>
                  <div><span className="text-cyan-400">Λ</span> <span className="text-slate-500">=</span> <span className="text-white font-bold">{fmtSci(computeOscillation(52, 0).lambdaKg, 4)} kg</span></div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                WDM 52 is within the SYSTEM band (WDM 0–63) — the highest authority, shortest
                wavelength tier. The universe's first quanta was a high-energy event.
              </p>
            </div>
          }
        />

        {/* ── §1 — Energy Quanta Derivation ─────────────────────────────────── */}
        <DualSection
          testId="section-1-energy-quanta"
          title="§1 — Energy Quanta Derivation"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                A quanta is the smallest indivisible unit of electromagnetic energy. It cannot
                exist at rest — existence requires oscillation. The energy of any photon is
                completely determined by one number: its oscillation frequency.
              </p>
              <p>
                This is Planck's insight from 1900: energy comes in discrete packets proportional
                to frequency. The constant of proportionality h (Planck's constant) is now an
                exact SI-defined value — a fundamental feature of the universe's structure.
              </p>
              <p>
                In NexusOS, every WDM channel is one specific frequency. There is no ambiguity.
                The channel determines the energy; the energy determines the fee.
              </p>
            </div>
          }
          technical={
            <div className="space-y-2">
              {[
                { label: "Planck–Einstein relation",   formula: "E = h · f",    note: `h = 6.626 070 15 × 10⁻³⁴ J·s  (exact, 2019 SI)` },
                { label: "Wave–frequency duality",     formula: "f = c / λ",    note: `c = 299 792 458 m/s  (exact, 1983 SI)` },
                { label: "Elementary charge (eV)",     formula: "E(eV) = E / e", note: `e = 1.602 176 634 × 10⁻¹⁹ J  (exact, 2019 SI)` },
              ].map(f => (
                <div key={f.label} className="bg-slate-950 rounded-lg px-4 py-3">
                  <div className="text-[10px] text-cyan-500 uppercase tracking-wider mb-1">{f.label}</div>
                  <div className="font-mono text-base text-violet-300">{f.formula}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{f.note}</div>
                </div>
              ))}
              <div className="bg-slate-950 rounded-lg px-4 py-3 font-mono text-xs space-y-1">
                <div className="text-slate-500 text-[10px] mb-1">// Example: USER mid-band (WDM 160)</div>
                {(() => {
                  const s = computeOscillation(160, 0);
                  return (
                    <>
                      <div><span className="text-cyan-400">λ</span> = <span className="text-green-300">{s.nm.toFixed(3)}</span> nm</div>
                      <div><span className="text-cyan-400">f</span> = <span className="text-green-300">{(s.frequencyHz / 1e12).toFixed(4)}</span> THz</div>
                      <div><span className="text-cyan-400">E</span> = <span className="text-green-300">{fmtSci(s.energyJ, 4)}</span> J = <span className="text-green-300">{s.energyEv.toFixed(4)}</span> eV</div>
                    </>
                  );
                })()}
              </div>
            </div>
          }
        />

        {/* ── §2 — Wavefunction Per Channel ─────────────────────────────────── */}
        <DualSection
          testId="section-2-wavefunction"
          title="§2 — Wavefunction Per Channel"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                Each WNSP channel is an independent oscillator with its own wavefunction
                ψ(t) = cos(2πft). The cosine starts at +1 (maximum amplitude) at t=0
                and completes one full cycle every period T = 1/f.
              </p>
              <p>
                Phase tracks where the oscillator is within its current cycle. NexusOS uses a
                normalized phase φ = (f × t) mod 1 — a unitless value in [0, 1) representing
                the fraction of the period elapsed. This avoids float64 overflow when computing
                with frequencies around 500 THz over long runtimes.
              </p>
              <p>
                The 5 authority channels oscillate simultaneously and independently. Their
                waveforms never interfere — they occupy orthogonal dimensions of Hilbert space
                (⟨Ψᵢ|Ψⱼ⟩ = 0 for i ≠ j).
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-1.5">
                <div className="text-slate-500">// Wavefunction definition</div>
                <div><span className="text-cyan-400">ψ(t)</span>  <span className="text-slate-500">=</span> <span className="text-violet-300">cos(2π · f · t)</span></div>
                <div className="pt-1 border-t border-slate-800">
                  <div className="text-slate-500">// Normalized-phase implementation</div>
                  <div><span className="text-cyan-400">φ</span>  <span className="text-slate-500">= (f × t) mod 1</span>      <span className="text-slate-600">// [0, 1)</span></div>
                  <div><span className="text-cyan-400">φ_rad</span> <span className="text-slate-500">= φ × 2π</span>             <span className="text-slate-600">// [0, 2π)</span></div>
                  <div><span className="text-cyan-400">ψ(t)</span>  <span className="text-slate-500">= cos(φ_rad)</span>          <span className="text-slate-600">// +1 at t=0</span></div>
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <div className="text-slate-500">// 128-sample waveform</div>
                  <div><span className="text-cyan-400">w[i]</span>  <span className="text-slate-500">= cos(φ_rad + i · 2π/128)</span></div>
                </div>
              </div>
              <WavefunctionTable />
            </div>
          }
        />

        {/* ── §3 — Compression State Oscillation ────────────────────────────── */}
        <DualSection
          testId="section-3-compression-state"
          title="§3 — Compression State Oscillation"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                Every oscillating photon carries a compression state Λ = hf/c², derived
                directly from Einstein's mass–energy equivalence applied to light. This is the
                photon's effective mass — not a metaphor, a measurable relativistic quantity.
              </p>
              <p>
                Higher-frequency channels (shorter wavelength, higher WDM authority) carry greater
                Λ. This is the physical basis for NexusOS fee scaling: SYSTEM-band operators use
                higher-energy photons, so their actions cost proportionally more.
              </p>
              <p>
                The fee multiplier for any channel is simply its photon energy relative to the
                green reference (560 nm): <span className="font-mono text-violet-300">multiplier = E_ch / E_ref</span>.
                Physics — not governance — sets the price.
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              {[
                { label: "Compression state",   formula: "Λ = h·f / c²",         note: "Photon effective mass (kg). Equals E/c²." },
                { label: "Fee multiplier",      formula: "m = E_ch / E_ref",      note: "E_ref = E at 560 nm (green midpoint). m > 1 for SYSTEM." },
                { label: "Physics fee (NXT)",   formula: "fee = base × m",        note: "base fee set by governance; multiplier set by physics." },
              ].map(f => (
                <div key={f.label} className="bg-slate-950 rounded-lg px-4 py-3">
                  <div className="text-[10px] text-cyan-500 uppercase tracking-wider mb-1">{f.label}</div>
                  <div className="font-mono text-base text-violet-300">{f.formula}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{f.note}</div>
                </div>
              ))}
              <CompressionTable />
            </div>
          }
        />

        {/* ── Live 5-Channel Oscilloscope (full-width interactive) ──────────── */}
        <section data-testid="section-live-oscilloscope" className="border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/60 flex items-center justify-between flex-wrap gap-3">
            <span className="font-semibold text-white">Live 5-Channel Oscilloscope</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying(p => !p)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={{ borderColor: playing ? "#ef4444" : "#22d3ee", color: playing ? "#f87171" : "#22d3ee" }}
                data-testid="button-play-pause"
              >
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={reset}
                className="text-xs px-2.5 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                data-testid="button-reset"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Channel toggles */}
            <div className="flex flex-wrap gap-2 items-center">
              {CHANNELS.map(ch => {
                const on = active.has(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    data-testid={`toggle-channel-${ch.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                    style={{
                      borderColor: on ? ch.color : "#334155",
                      color: on ? ch.color : "#64748b",
                      background: on ? ch.bg : "transparent",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: on ? ch.color : "#334155" }} />
                    {ch.label}
                    <span className="font-mono font-normal opacity-60">{ch.wdm}</span>
                  </button>
                );
              })}
              <span className="text-xs font-mono text-slate-600 ml-1" data-testid="text-elapsed">
                t = {tMs.toFixed(0)} ms
              </span>
            </div>

            <MultiOscilloscope tMs={tMs} active={active} />

            {/* Focus selector + metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Focus channel</div>
                {CHANNELS.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setFocused(ch.id)}
                    data-testid={`focus-channel-${ch.id}`}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-colors"
                    style={{
                      background: focused === ch.id ? ch.bg : "transparent",
                      color: focused === ch.id ? ch.color : "#64748b",
                      border: `1px solid ${focused === ch.id ? ch.color + "60" : "#1e293b"}`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
                    {ch.label} · WDM {ch.wdm} · {computeOscillation(ch.wdm, 0).nm.toFixed(1)} nm
                  </button>
                ))}
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-2">
                {[
                  { label: "λ (nm)",        value: fs.nm.toFixed(3),                       testId: "metric-nm" },
                  { label: "f (THz)",        value: (fs.frequencyHz / 1e12).toFixed(4),    testId: "metric-freq" },
                  { label: "T (fs)",         value: (fs.periodS * 1e15).toFixed(3),        testId: "metric-period" },
                  { label: "φ (norm.)",      value: fs.phase.toFixed(6),                   testId: "metric-phase" },
                  { label: "ψ(t) amplitude", value: fs.amplitude.toFixed(6),               testId: "metric-amplitude" },
                  { label: "E (J)",          value: fmtSci(fs.energyJ, 4),                 testId: "metric-energy-j" },
                  { label: "E (eV)",         value: `${fs.energyEv.toFixed(4)} eV`,        testId: "metric-energy-ev" },
                  { label: "Λ (kg)",         value: fmtSci(fs.lambdaKg, 4),                testId: "metric-lambda-kg" },
                ].map(m => (
                  <div key={m.label} className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">{m.label}</div>
                    <div className="font-mono text-xs text-slate-200 mt-0.5" data-testid={m.testId}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Run via API ───────────────────────────────────────────────────── */}
        <section data-testid="section-run-via-api" className="border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/60">
            <span className="font-semibold text-white">Run via API</span>
            <p className="text-xs text-slate-400 mt-1">
              Every oscillation state is accessible server-side. Supply either a WDM channel index
              or a wavelength in nm — the server derives the missing value and returns the full
              oscillation payload at current wall-clock time.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-950/60 text-violet-400 border border-violet-800/50">POST</span>
                  <code className="text-xs font-mono text-slate-200">/api/wnsp/quanta/oscillate</code>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Input — via WDM</div>
                <pre className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto" data-testid="code-schema-wdm">{`{ "wdm": ${focusedCh.wdm} }`}</pre>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Input — via wavelength_nm</div>
                <pre className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto" data-testid="code-schema-nm">{`{ "wavelength_nm": ${fs.nm.toFixed(3)} }`}</pre>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Response</div>
                <pre className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-400 overflow-x-auto">{`{
  "wdm":          ${focusedCh.wdm},
  "nm":           ${fs.nm.toFixed(4)},
  "frequency_hz": ${fmtSci(fs.frequencyHz, 3)},
  "period_s":     ${fmtSci(fs.periodS, 3)},
  "energy_j":     ${fmtSci(fs.energyJ, 3)},
  "lambda_kg":    ${fmtSci(fs.lambdaKg, 3)},
  "phase_rad":    ${fs.phaseRad.toFixed(4)},
  "amplitude":    ${fs.amplitude.toFixed(4)},
  "waveform":     [128 floats]
}`}</pre>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "via WDM",           curl: curlWdm, testId: "code-curl-wdm",  copyId: "button-copy-curl-wdm" },
                { label: "via wavelength_nm",  curl: curlNm,  testId: "code-curl-nm",   copyId: "button-copy-curl-nm"  },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">curl — {s.label}</span>
                    <CopyBtn text={s.curl} testId={s.copyId} />
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed" data-testid={s.testId}>{s.curl}</pre>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
