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

// ── The 5 named oscillation channels ─────────────────────────────────────────
const CHANNELS = [
  { id: "SYSTEM",  label: "SYSTEM",  wdm: 32,  color: "#8b00ff", bg: "rgba(139,0,255,0.12)" },
  { id: "KERNEL",  label: "KERNEL",  wdm: 96,  color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  { id: "USER",    label: "USER",    wdm: 160, color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  { id: "GUEST",   label: "GUEST",   wdm: 224, color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  { id: "Genesis", label: "Genesis", wdm: 52,  color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
] as const;

type ChannelId = typeof CHANNELS[number]["id"];

// ── Physics ───────────────────────────────────────────────────────────────────
function computeOscillation(wdm: number, tMs: number) {
  const w           = Math.max(0, Math.min(255, Math.round(wdm)));
  const nm          = NM_MIN + w * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
  const frequencyHz = C / (nm * 1e-9);
  const periodS     = 1 / frequencyHz;
  const energyJ     = H * frequencyHz;
  const energyEv    = energyJ / EV;
  const lambdaKg    = energyJ / (C * C);
  // Normalized phase: (t % T)/T  →  [0,1) — avoids float64 overflow at ~500 THz
  const phase     = (frequencyHz * (tMs * 1e-3)) % 1;
  const phaseRad  = phase * 2 * Math.PI;
  const amplitude = Math.cos(phaseRad);              // cosine: +1 at t=0
  const waveform  = Array.from({ length: 128 }, (_, i) =>
    Math.cos(phaseRad + (i / 128) * 2 * Math.PI)
  );
  return { w, nm, frequencyHz, periodS, energyJ, energyEv, lambdaKg, phase, phaseRad, amplitude, waveform };
}

function fmtSci(v: number, dp = 4) { return v.toExponential(dp); }

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, testId }: { text: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
      data-testid={testId ?? "button-copy"}
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Dual-layer section wrapper ────────────────────────────────────────────────
function DualSection({
  title, concept, technical, testId,
}: {
  title: string;
  concept: React.ReactNode;
  technical: React.ReactNode;
  testId: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section data-testid={testId} className="border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-900/60 hover:bg-slate-900/80 transition-colors"
        data-testid={`${testId}-toggle`}
      >
        <span className="font-semibold text-white text-lg">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Conceptual layer */}
          <div className="px-6 py-5 bg-slate-950/60 space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold mb-2">Conceptual Layer</div>
            {concept}
          </div>
          {/* Technical layer */}
          <div className="px-6 py-5 bg-slate-900/30 space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-violet-400 font-bold mb-2">Physics Layer</div>
            {technical}
          </div>
        </div>
      )}
    </section>
  );
}

// ── 5-channel SVG oscilloscope ────────────────────────────────────────────────
function MultiOscilloscope({
  channels, tMs, active,
}: {
  channels: typeof CHANNELS;
  tMs: number;
  active: Set<ChannelId>;
}) {
  const W = 640, H_SVG = 140, PAD = 12;
  const usable = H_SVG - PAD * 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H_SVG}`}
      className="w-full rounded-xl"
      style={{ background: "#050a14", border: "1px solid #1e293b" }}
      data-testid="oscilloscope-svg"
    >
      {/* Grid lines */}
      <line x1="0" y1={H_SVG / 2} x2={W} y2={H_SVG / 2} stroke="#1e293b" strokeWidth="1" />
      {[0.25, 0.75].map(f => (
        <line key={f} x1="0" y1={H_SVG * f} x2={W} y2={H_SVG * f} stroke="#0f172a" strokeWidth="1" />
      ))}
      <text x="4" y={PAD + 6}    fill="#334155" fontSize="8" fontFamily="monospace">+1</text>
      <text x="4" y={H_SVG - PAD} fill="#334155" fontSize="8" fontFamily="monospace">−1</text>

      {/* One waveform path per active channel */}
      {channels.map(ch => {
        if (!active.has(ch.id)) return null;
        const { waveform } = computeOscillation(ch.wdm, tMs);
        const pts = waveform.map((y, i) => {
          const px = (i / (waveform.length - 1)) * W;
          const py = PAD + ((1 - y) / 2) * usable;
          return `${px.toFixed(1)},${py.toFixed(1)}`;
        }).join(" ");
        const head = computeOscillation(ch.wdm, tMs).amplitude;
        const headY = PAD + ((1 - head) / 2) * usable;
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

// ── Band reference table ──────────────────────────────────────────────────────
function BandTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 text-xs font-mono">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px] tracking-widest">
            <th className="px-3 py-2 text-left">Channel</th>
            <th className="px-3 py-2 text-right">WDM</th>
            <th className="px-3 py-2 text-right">λ (nm)</th>
            <th className="px-3 py-2 text-right">f (THz)</th>
            <th className="px-3 py-2 text-right">T (fs)</th>
            <th className="px-3 py-2 text-right">E (eV)</th>
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
                <td className="px-3 py-2 text-right text-slate-300">{ch.wdm}</td>
                <td className="px-3 py-2 text-right" style={{ color: ch.color }}>{s.nm.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-slate-300">{(s.frequencyHz / 1e12).toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-slate-400">{(s.periodS * 1e15).toFixed(3)}</td>
                <td className="px-3 py-2 text-right text-violet-400">{s.energyEv.toFixed(4)}</td>
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
  const [tMs,     setTMs]     = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active,  setActive]  = useState<Set<ChannelId>>(
    new Set(["SYSTEM", "KERNEL", "USER", "GUEST", "Genesis"] as ChannelId[])
  );
  // Single focused channel for metric panel (defaults to USER)
  const [focused, setFocused] = useState<ChannelId>("USER");

  const rafRef  = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const tick = useCallback((now: number) => {
    if (lastRef.current === null) lastRef.current = now;
    setTMs(prev => prev + (now - lastRef.current!));
    lastRef.current = now;
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
  -d '{"wdm": ${focusedCh.wdm}, "t_ms": ${tMs.toFixed(1)}}'`;

  const curlNm = `curl -X POST https://nexusos.replit.app/api/wnsp/quanta/oscillate \\
  -H "Content-Type: application/json" \\
  -d '{"wavelength_nm": ${fs.nm.toFixed(3)}, "t_ms": ${tMs.toFixed(1)}}'`;

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
          <Waves className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white">Oscillating Quanta — First Principles</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* ── §0 — The First Unobserved Oscillation ─────────────────────────── */}
        <DualSection
          testId="section-0-first-oscillation"
          title="§0 — The First Unobserved Oscillation"
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                NexusOS is built on the Theory of Compression States, which holds that the
                universe originated as a single unobserved oscillation — a photon that oscillated
                before anything existed to observe it.
              </p>
              <p>
                This first oscillation defines the reference frequency from which all WNSP
                channel frequencies descend. It is not a metaphor — it is a physics constant
                embedded in every fee calculation, every spectral address, and every NXT transfer.
              </p>
              <p className="text-slate-400 text-xs">
                The Genesis Node visible on the live kernel (Ψ(52,65,V)) represents this
                originating channel — it is the first node registered when NexusOS boots.
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-1.5">
                <div className="text-slate-500">// Genesis channel constants</div>
                <div><span className="text-cyan-400">GENESIS_WDM</span>  <span className="text-slate-500">=</span> <span className="text-amber-300">52</span></div>
                <div><span className="text-cyan-400">GENESIS_OAM</span>  <span className="text-slate-500">=</span> <span className="text-amber-300">65</span></div>
                <div><span className="text-cyan-400">GENESIS_POL</span>  <span className="text-slate-500">=</span> <span className="text-green-300">"V"</span></div>
                <div className="pt-1 border-t border-slate-800">
                  <span className="text-cyan-400">λ_genesis</span> <span className="text-slate-500">=</span> <span className="text-violet-300">{computeOscillation(52, 0).nm.toFixed(4)} nm</span>
                </div>
                <div>
                  <span className="text-cyan-400">f_genesis</span>  <span className="text-slate-500">=</span> <span className="text-violet-300">{(computeOscillation(52, 0).frequencyHz / 1e12).toFixed(4)} THz</span>
                </div>
                <div>
                  <span className="text-cyan-400">E_genesis</span>  <span className="text-slate-500">=</span> <span className="text-violet-300">{computeOscillation(52, 0).energyEv.toFixed(6)} eV</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                WDM 52 sits in the SYSTEM band (WDM 0–63), placing the Genesis oscillation
                at the highest-authority, shortest-wavelength tier of the visible spectrum.
              </p>
            </div>
          }
        />

        {/* ── §1 — Planck-Einstein: Frequency → Energy ──────────────────────── */}
        <DualSection
          testId="section-1-planck-einstein"
          title="§1 — Planck-Einstein: Frequency → Energy"
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                A quanta is the smallest indivisible packet of electromagnetic energy. Its
                defining property is that it oscillates — it cannot exist at rest.
              </p>
              <p>
                The energy of a single photon is entirely determined by its oscillation
                frequency. There is no other parameter. This is Planck's insight: energy
                is <em>quantised</em> in units of <span className="font-mono text-violet-300">h·f</span>.
              </p>
              <p>
                NexusOS maps this directly: every WDM channel is a unique frequency, and
                that frequency determines the economic cost of every action performed on
                that channel.
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              {[
                { label: "Planck–Einstein relation", formula: "E = h · f", note: "h = 6.626 070 15 × 10⁻³⁴ J·s  (exact, 2019 SI)" },
                { label: "Wave–frequency duality",   formula: "f = c / λ", note: "c = 299 792 458 m/s  (exact, 1983 SI)" },
                { label: "Compression state (NexusOS)", formula: "Λ = h·f / c²", note: "Photon effective mass — direct fee-multiplier basis" },
              ].map(f => (
                <div key={f.label} className="bg-slate-950 rounded-lg px-4 py-3">
                  <div className="text-[10px] text-cyan-500 uppercase tracking-wider mb-1">{f.label}</div>
                  <div className="font-mono text-base text-violet-300">{f.formula}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{f.note}</div>
                </div>
              ))}
            </div>
          }
        />

        {/* ── §2 — Phase Evolution in Time ──────────────────────────────────── */}
        <DualSection
          testId="section-2-phase-evolution"
          title="§2 — Phase Evolution in Time"
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                An oscillating quanta completes one full cycle every <em>period</em> T = 1/f.
                At visible-light frequencies, T is measured in femtoseconds (10⁻¹⁵ s) — the
                oscillation is invisible to any physical clock but is numerically exact.
              </p>
              <p>
                Phase tracks where the quanta is within its current cycle. A normalized phase
                of 0 means the start of a cycle (amplitude = +1). A normalized phase of 0.5
                means the halfway point (amplitude = −1).
              </p>
              <p className="text-slate-400 text-xs">
                NexusOS uses <span className="font-mono">phase = (f × t) mod 1</span> rather than
                radians to avoid floating-point overflow at ~500 THz × large elapsed times.
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-2">
                <div className="text-slate-500">// Normalized phase arithmetic</div>
                <div><span className="text-cyan-400">phase</span>    <span className="text-slate-500">= (f × t) mod 1</span>  <span className="text-slate-600">// [0, 1)</span></div>
                <div><span className="text-cyan-400">phase_rad</span> <span className="text-slate-500">= phase × 2π</span>      <span className="text-slate-600">// [0, 2π)</span></div>
                <div><span className="text-cyan-400">amplitude</span> <span className="text-slate-500">= cos(phase_rad)</span>   <span className="text-slate-600">// +1 at t=0</span></div>
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-slate-500">// 128-sample waveform per channel</div>
                  <div><span className="text-cyan-400">waveform[i]</span> <span className="text-slate-500">= cos(phase_rad + i·2π/128)</span></div>
                </div>
              </div>
              <BandTable />
            </div>
          }
        />

        {/* ── §3 — Live 5-Channel Oscilloscope ──────────────────────────────── */}
        <section data-testid="section-3-oscilloscope" className="border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/60 flex items-center justify-between">
            <span className="font-semibold text-white text-lg">§3 — Live 5-Channel Oscilloscope</span>
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
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                data-testid="button-reset"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Channel toggles */}
            <div className="flex flex-wrap gap-2">
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
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: on ? ch.color : "#334155" }}
                    />
                    {ch.label}
                    <span className="font-mono font-normal opacity-60">WDM {ch.wdm}</span>
                  </button>
                );
              })}
              <span className="text-xs text-slate-600 self-center ml-1 font-mono">
                t = {tMs.toFixed(0)} ms
              </span>
            </div>

            {/* Oscilloscope */}
            <MultiOscilloscope channels={CHANNELS} tMs={tMs} active={active} />

            {/* Focused channel selector + metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Channel selector */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Focus channel metrics</div>
                <div className="flex flex-col gap-1">
                  {CHANNELS.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setFocused(ch.id)}
                      data-testid={`focus-channel-${ch.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-left"
                      style={{
                        background: focused === ch.id ? ch.bg : "transparent",
                        color: focused === ch.id ? ch.color : "#64748b",
                        border: `1px solid ${focused === ch.id ? ch.color + "60" : "#1e293b"}`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                      {ch.label} · {ch.wdm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics grid */}
              <div className="md:col-span-2 grid grid-cols-2 gap-2">
                {[
                  { label: "λ (nm)",         value: fs.nm.toFixed(3),                         testId: "metric-nm" },
                  { label: "f (THz)",         value: (fs.frequencyHz / 1e12).toFixed(4),       testId: "metric-freq" },
                  { label: "T (fs)",          value: (fs.periodS * 1e15).toFixed(3),           testId: "metric-period" },
                  { label: "Phase (norm.)",   value: fs.phase.toFixed(6),                      testId: "metric-phase" },
                  { label: "Amplitude",       value: fs.amplitude.toFixed(6),                  testId: "metric-amplitude" },
                  { label: "E (J)",           value: fmtSci(fs.energyJ, 4),                    testId: "metric-energy-j" },
                  { label: "E (eV)",          value: `${fs.energyEv.toFixed(4)} eV`,           testId: "metric-energy-ev" },
                  { label: "Λ comp. mass",    value: fmtSci(fs.lambdaKg, 4),                   testId: "metric-lambda-kg" },
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

        {/* ── "Run via API" conclusion block ────────────────────────────────── */}
        <section data-testid="section-run-via-api" className="border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/60">
            <span className="font-semibold text-white text-lg">Run via API</span>
            <p className="text-xs text-slate-400 mt-1">
              Every oscillation state on this page is available server-side. Supply either a WDM
              channel index or an explicit wavelength in nm — the server derives the missing value
              from the other.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Endpoint + schema */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-950/60 text-violet-400 border border-violet-800/50">POST</span>
                  <code className="text-xs font-mono text-slate-200">/api/wnsp/quanta/oscillate</code>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-3">Request (wdm input)</div>
                <pre className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto" data-testid="code-schema-wdm">{`{
  "wdm":   ${focusedCh.wdm},
  "t_ms":  ${tMs.toFixed(1)}
}`}</pre>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Request (wavelength_nm input)</div>
                <pre className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto" data-testid="code-schema-nm">{`{
  "wavelength_nm": ${fs.nm.toFixed(3)},
  "t_ms":          ${tMs.toFixed(1)}
}`}</pre>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Response</div>
                <pre className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-400 overflow-x-auto h-full">{`{
  "wdm":          ${focusedCh.wdm},
  "nm":           ${fs.nm.toFixed(4)},
  "frequency_hz": ${fmtSci(fs.frequencyHz, 3)},
  "period_s":     ${fmtSci(fs.periodS, 3)},
  "energy_j":     ${fmtSci(fs.energyJ, 3)},
  "lambda_kg":    ${fmtSci(fs.lambdaKg, 3)},
  "phase_rad":    ${fs.phaseRad.toFixed(4)},
  "amplitude":    ${fs.amplitude.toFixed(4)},
  "waveform":     [128 floats],
  "derived_from": "E=hf · ..."
}`}</pre>
              </div>
            </div>

            {/* curl snippets */}
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">curl — via WDM</span>
                  <CopyBtn text={curlWdm} testId="button-copy-curl-wdm" />
                </div>
                <pre className="text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed" data-testid="code-curl-wdm">{curlWdm}</pre>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">curl — via wavelength_nm</span>
                  <CopyBtn text={curlNm} testId="button-copy-curl-nm" />
                </div>
                <pre className="text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed" data-testid="code-curl-nm">{curlNm}</pre>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
