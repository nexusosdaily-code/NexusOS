import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Waves, Play, Pause, RotateCcw, Copy, Check } from "lucide-react";

// ── CODATA 2018 / SI exact constants (mirrors server/physics.ts) ──────────────
const H  = 6.62607015e-34;   // J·s   — Planck (exact 2019 SI)
const C  = 299_792_458;      // m/s   — speed of light (exact 1983 SI)
const EV = 1.602176634e-19;  // J/eV  — elementary charge (exact 2019 SI)

const NM_MIN      = 380;
const NM_MAX      = 780;
const WDM_CHANNELS = 256;

// Authority band boundaries (WDM index)
const BANDS = [
  { name: "SYSTEM", wdmMin: 0,   wdmMax: 63,  color: "#8b00ff", bg: "rgba(139,0,255,0.12)" },
  { name: "KERNEL", wdmMin: 64,  wdmMax: 127, color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  { name: "USER",   wdmMin: 128, wdmMax: 191, color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  { name: "GUEST",  wdmMin: 192, wdmMax: 255, color: "#d97706", bg: "rgba(217,119,6,0.12)" },
] as const;

function bandForWdm(wdm: number) {
  return BANDS.find(b => wdm >= b.wdmMin && wdm <= b.wdmMax) ?? BANDS[2];
}

// ── Physics computation ────────────────────────────────────────────────────────
// Mirrors oscillatingQuantaState() in server/physics.ts exactly.
function computeOscillation(wdm: number, tMs: number) {
  const w           = Math.max(0, Math.min(255, Math.round(wdm)));
  const nm          = NM_MIN + w * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
  const frequencyHz = C / (nm * 1e-9);
  const periodS     = 1 / frequencyHz;
  const energyJ     = H * frequencyHz;
  const energyEv    = energyJ / EV;
  const lambdaKg    = energyJ / (C * C);

  // Fractional-cycle phase: avoids float64 overflow at ~500 THz × large t
  const cycles     = frequencyHz * (tMs * 1e-3);
  const fractCycle = cycles - Math.floor(cycles);
  const phaseRad   = fractCycle * 2 * Math.PI;
  const amplitude  = Math.sin(phaseRad);

  // 128 samples spanning one full period from current phase
  const waveform = Array.from({ length: 128 }, (_, i) =>
    Math.sin(phaseRad + (i / 128) * 2 * Math.PI)
  );

  return { w, nm, frequencyHz, periodS, energyJ, energyEv, lambdaKg, phaseRad, amplitude, waveform };
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function fmtSci(v: number, dp = 4) {
  return v.toExponential(dp);
}
function nmToHex(nm: number): string {
  const t = (nm - NM_MIN) / (NM_MAX - NM_MIN);
  const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 510);
  const g = Math.round(t < 0.25 ? t * 400 : t < 0.75 ? 100 : (1 - t) * 400);
  const b = Math.round(t < 0.5 ? (0.5 - t) * 510 : 0);
  return `rgb(${r},${g},${b})`;
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
      data-testid="button-copy-curl"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── SVG Oscilloscope ─────────────────────────────────────────────────────────
function Oscilloscope({ waveform, color }: { waveform: number[]; color: string }) {
  const W = 640, H_SVG = 120, PAD = 8;
  const usable = H_SVG - PAD * 2;
  const points = waveform.map((y, i) => {
    const px = (i / (waveform.length - 1)) * W;
    const py = PAD + ((1 - y) / 2) * usable;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H_SVG}`}
      className="w-full rounded-lg"
      style={{ background: "#0a0f1a", border: "1px solid #1e293b" }}
      data-testid="oscilloscope-svg"
    >
      {/* Axis grid */}
      <line x1="0" y1={H_SVG / 2} x2={W} y2={H_SVG / 2} stroke="#1e293b" strokeWidth="1" />
      {[0.25, 0.75].map(f => (
        <line key={f} x1="0" y1={H_SVG * f} x2={W} y2={H_SVG * f} stroke="#0f172a" strokeWidth="1" />
      ))}
      {/* +1 / -1 labels */}
      <text x="4" y={PAD + 8} fill="#334155" fontSize="9" fontFamily="monospace">+1</text>
      <text x="4" y={H_SVG - PAD + 2} fill="#334155" fontSize="9" fontFamily="monospace">−1</text>
      {/* Waveform */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Current amplitude dot */}
      <circle
        cx={0}
        cy={PAD + ((1 - waveform[0]) / 2) * usable}
        r="4"
        fill={color}
        opacity="0.9"
        data-testid="oscilloscope-dot"
      />
    </svg>
  );
}

// ── Band Reference Table ──────────────────────────────────────────────────────
function BandTable() {
  const mid = (b: typeof BANDS[number]) => Math.round((b.wdmMin + b.wdmMax) / 2);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-widest">
            <th className="px-4 py-2 text-left">Band</th>
            <th className="px-4 py-2 text-right">WDM</th>
            <th className="px-4 py-2 text-right">λ (nm)</th>
            <th className="px-4 py-2 text-right">f (THz)</th>
            <th className="px-4 py-2 text-right">T (fs)</th>
            <th className="px-4 py-2 text-right">E (eV)</th>
            <th className="px-4 py-2 text-right">Λ (kg)</th>
          </tr>
        </thead>
        <tbody>
          {BANDS.map(b => {
            const w  = mid(b);
            const { nm, frequencyHz, periodS, energyEv, lambdaKg } = computeOscillation(w, 0);
            return (
              <tr key={b.name} className="border-b border-slate-900 hover:bg-slate-900/40 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: b.bg, color: b.color }}>
                    {b.name}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-300">{w}</td>
                <td className="px-4 py-2.5 text-right" style={{ color: b.color }}>{nm.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right text-slate-300">{(frequencyHz / 1e12).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right text-slate-400">{(periodS * 1e15).toFixed(3)}</td>
                <td className="px-4 py-2.5 text-right text-violet-400">{energyEv.toFixed(4)}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{fmtSci(lambdaKg, 3)}</td>
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
  const [wdm,     setWdm]     = useState(128);
  const [tMs,     setTMs]     = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const band   = bandForWdm(wdm);
  const state  = computeOscillation(wdm, tMs);
  const color  = band.color;

  // Animation loop — advances tMs at 60 fps
  const tick = useCallback((now: number) => {
    if (lastRef.current === null) lastRef.current = now;
    const dtMs = now - lastRef.current;
    lastRef.current = now;
    setTMs(prev => prev + dtMs);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (playing) {
      lastRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const reset = () => { setPlaying(false); setTMs(0); };

  const curlSnippet = `curl -X POST https://nexusos.replit.app/api/wnsp/quanta/oscillate \\
  -H "Content-Type: application/json" \\
  -d '{"wdm": ${wdm}, "t_ms": ${tMs.toFixed(1)}}'`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" data-testid="link-back-hub">
            <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Hub
            </button>
          </Link>
          <span className="text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Oscillating Quanta — First Principles</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-14">

        {/* ── Section 1: What is an Oscillating Quanta? ─────────────────────── */}
        <section data-testid="section-first-principles">
          <h2 className="text-2xl font-bold text-white mb-1">What is an Oscillating Quanta?</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            A quanta is the smallest discrete packet of electromagnetic energy. In NexusOS every
            WDM channel is assigned a specific wavelength λ, which fixes a unique oscillation
            frequency f = c/λ. The photon oscillates at this frequency continuously. Its energy E
            and its compression mass Λ are both derived from the same root — Planck's relation.
          </p>

          {/* Formula cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Planck–Einstein", formula: "E = h · f", desc: "Energy of one photon. h is Planck's constant (6.626 × 10⁻³⁴ J·s)." },
              { label: "Wave–Frequency duality", formula: "f = c / λ", desc: "Frequency from wavelength. c = 299 792 458 m/s (exact)." },
              { label: "Compression State", formula: "Λ = h·f / c²", desc: "Effective mass of a photon packet — NexusOS fee multiplier basis." },
            ].map(f => (
              <div key={f.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-2">{f.label}</div>
                <div className="font-mono text-lg text-violet-300 mb-2">{f.formula}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: Band Reference Table ───────────────────────────────── */}
        <section data-testid="section-band-explorer">
          <h2 className="text-2xl font-bold text-white mb-1">Authority Band Physics</h2>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            Each of NexusOS's four authority bands spans 64 WDM channels. Higher authority
            (shorter λ) means higher frequency, higher photon energy, and a larger compression
            state — directly governing fee multipliers. The table below shows representative
            mid-band values.
          </p>
          <BandTable />
        </section>

        {/* ── Section 3: Live Oscilloscope ──────────────────────────────────── */}
        <section data-testid="section-live-oscilloscope">
          <h2 className="text-2xl font-bold text-white mb-1">Live Oscilloscope</h2>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            Select any WDM channel (0 – 255) and watch the photon waveform evolve in real time.
            The oscilloscope renders 128 samples of sin(φ + i·2π/128) — one complete cycle from
            the current phase. Phase is computed via fractional-cycle arithmetic to stay numerically
            exact at optical frequencies (~500 THz).
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-60">
              <label className="text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">
                WDM channel
              </label>
              <input
                type="range"
                min={0}
                max={255}
                value={wdm}
                onChange={e => setWdm(Number(e.target.value))}
                className="flex-1 accent-violet-500"
                data-testid="input-wdm-slider"
              />
              <span
                className="text-sm font-mono font-bold w-8 text-right"
                style={{ color }}
                data-testid="text-wdm-value"
              >
                {wdm}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying(p => !p)}
                className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full border transition-colors"
                style={{
                  borderColor: playing ? "#ef4444" : color,
                  color: playing ? "#f87171" : color,
                }}
                data-testid="button-play-pause"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                data-testid="button-reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Oscilloscope */}
          <Oscilloscope waveform={state.waveform} color={color} />

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Wavelength",    value: `${state.nm.toFixed(3)} nm`,              testId: "metric-nm" },
              { label: "Frequency",     value: `${(state.frequencyHz/1e12).toFixed(4)} THz`, testId: "metric-freq" },
              { label: "Period",        value: `${(state.periodS * 1e15).toFixed(3)} fs`, testId: "metric-period" },
              { label: "Phase",         value: `${state.phaseRad.toFixed(4)} rad`,        testId: "metric-phase" },
              { label: "Amplitude",     value: state.amplitude.toFixed(6),                testId: "metric-amp" },
              { label: "Energy (J)",    value: fmtSci(state.energyJ, 4),                  testId: "metric-energy-j" },
              { label: "Energy (eV)",   value: `${state.energyEv.toFixed(4)} eV`,         testId: "metric-energy-ev" },
              { label: "Λ comp. mass",  value: fmtSci(state.lambdaKg, 4),                 testId: "metric-lambda-kg" },
            ].map(m => (
              <div key={m.label} className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2.5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{m.label}</div>
                <div className="font-mono text-sm text-slate-200" data-testid={m.testId}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Band badge + t display */}
          <div className="flex items-center gap-3 mt-3">
            <span
              className="text-xs font-bold px-2 py-1 rounded"
              style={{ background: band.bg, color: band.color }}
              data-testid="text-band-badge"
            >
              {band.name} band · Ψ({wdm}, *, *)
            </span>
            <span className="text-xs font-mono text-slate-500" data-testid="text-elapsed">
              t = {tMs.toFixed(1)} ms elapsed
            </span>
          </div>
        </section>

        {/* ── Section 4: API Reference ──────────────────────────────────────── */}
        <section data-testid="section-api-reference">
          <h2 className="text-2xl font-bold text-white mb-1">API Reference</h2>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            The oscillation state is also available server-side via the WNSP spectral runtime.
            The endpoint accepts a WDM channel index and elapsed time in milliseconds, and returns
            the full oscillation payload including the 128-sample waveform.
          </p>

          <div className="space-y-6">
            {/* Endpoint card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-950/60 text-violet-400 border border-violet-800/50">POST</span>
                <code className="text-sm font-mono text-slate-200">/api/wnsp/quanta/oscillate</code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Request body</div>
                  <pre className="bg-slate-950 rounded p-3 text-slate-300 overflow-x-auto">{`{
  "wdm":  ${wdm},
  "t_ms": ${tMs.toFixed(1)}
}`}</pre>
                </div>
                <div>
                  <div className="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Response fields</div>
                  <pre className="bg-slate-950 rounded p-3 text-slate-400 overflow-x-auto">{`nm           : ${state.nm.toFixed(4)}
frequency_hz : ${fmtSci(state.frequencyHz, 4)}
period_s     : ${fmtSci(state.periodS, 4)}
energy_j     : ${fmtSci(state.energyJ, 4)}
lambda_kg    : ${fmtSci(state.lambdaKg, 4)}
phase_rad    : ${state.phaseRad.toFixed(6)}
amplitude    : ${state.amplitude.toFixed(6)}
waveform     : [128 floats]`}</pre>
                </div>
              </div>
            </div>

            {/* curl snippet */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">curl</span>
                <CopyBtn text={curlSnippet} />
              </div>
              <pre className="text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed" data-testid="code-curl-snippet">
                {curlSnippet}
              </pre>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
