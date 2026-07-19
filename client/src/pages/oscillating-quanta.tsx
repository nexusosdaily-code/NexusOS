import { useState, useEffect, useRef, useCallback } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "wouter";
import { EcosystemNav } from "@/components/ecosystem-nav";
import { ArrowLeft, Waves, Play, Pause, RotateCcw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

// ── CODATA 2018 / SI exact constants ─────────────────────────────────────────
const H  = 6.62607015e-34;   // J·s  (exact 2019 SI)
const C  = 299_792_458;      // m/s  (exact 1983 SI)
const EV = 1.602176634e-19;  // J/eV (exact 2019 SI)

const NM_MIN       = 380;
const NM_MAX       = 780;
const WDM_CHANNELS = 256;

// ── First Oscillation anchor (Theory of Compression States) ──────────────────
const FIRST_OSCILLATION_HZ  = 555e12;
const FIRST_OSCILLATION_NM  = C / FIRST_OSCILLATION_HZ * 1e9;    // ≈ 539.89 nm
const FIRST_OSCILLATION_J   = H * FIRST_OSCILLATION_HZ;
const FIRST_OSCILLATION_EV  = FIRST_OSCILLATION_J / EV;
const FIRST_OSCILLATION_WDM = Math.round(
  (FIRST_OSCILLATION_NM - NM_MIN) / ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1))
);
const LAMBDA_MASS_KG = FIRST_OSCILLATION_J / (C * C);             // h·f₀/c²

// ── Reference for fee multiplier (560 nm green midpoint) ─────────────────────
const REF_NM = 560;
const REF_E  = H * (C / (REF_NM * 1e-9));

// ── Authority bands ───────────────────────────────────────────────────────────
const BANDS = [
  { name: "SYSTEM", wdmMin: 0,   wdmMax: 63,  color: "#8b00ff", bg: "rgba(139,0,255,0.12)" },
  { name: "KERNEL", wdmMin: 64,  wdmMax: 127, color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  { name: "USER",   wdmMin: 128, wdmMax: 191, color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  { name: "GUEST",  wdmMin: 192, wdmMax: 255, color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
] as const;

function bandForWdm(wdm: number) {
  return BANDS.find(b => wdm >= b.wdmMin && wdm <= b.wdmMax) ?? BANDS[2];
}

// ── 5 named authority channels (for multi-oscilloscope) ──────────────────────
const CHANNELS = [
  { id: "SYSTEM",  label: "SYSTEM",  wdm: 32,  color: "#8b00ff", bg: "rgba(139,0,255,0.10)" },
  { id: "KERNEL",  label: "KERNEL",  wdm: 96,  color: "#2563eb", bg: "rgba(37,99,235,0.10)" },
  { id: "USER",    label: "USER",    wdm: 160, color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  { id: "GUEST",   label: "GUEST",   wdm: 224, color: "#dc2626", bg: "rgba(220,38,38,0.10)" },
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
  // Normalized phase [0,1) — avoids float64 overflow at ~500 THz
  const phase    = (frequencyHz * (tMs * 1e-3)) % 1;
  const phaseRad = phase * 2 * Math.PI;
  const amplitude = Math.cos(phaseRad);
  const waveform  = Array.from({ length: 128 }, (_, i) =>
    Math.cos(phaseRad + (i / 128) * 2 * Math.PI)
  );
  return { w, nm, frequencyHz, periodS, energyJ, energyEv, lambdaKg, feeMultiplier, phase, phaseRad, amplitude, waveform };
}

function fmtSci(v: number, dp = 4) { return v.toExponential(dp); }

function nmToColor(nm: number): string {
  const t = (nm - NM_MIN) / (NM_MAX - NM_MIN);
  const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 510);
  const g = Math.round(t < 0.25 ? t * 400 : t < 0.75 ? 100 : (1 - t) * 400);
  const b = Math.round(t < 0.5 ? (0.5 - t) * 510 : 0);
  return `rgb(${r},${g},${b})`;
}

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

// ── Dual-layer section ────────────────────────────────────────────────────────
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

// ── Single-channel oscilloscope (original — WDM slider driven) ────────────────
function SingleOscilloscope({ waveform, color }: { waveform: number[]; color: string }) {
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
      className="w-full rounded-xl"
      style={{ background: "#050a14", border: "1px solid #1e293b" }}
      data-testid="oscilloscope-svg"
    >
      <line x1="0" y1={H_SVG / 2} x2={W} y2={H_SVG / 2} stroke="#1e293b" strokeWidth="1" />
      {[0.25, 0.75].map(f => (
        <line key={f} x1="0" y1={H_SVG * f} x2={W} y2={H_SVG * f} stroke="#0f172a" strokeWidth="1" />
      ))}
      <text x="4" y={PAD + 8}     fill="#334155" fontSize="9" fontFamily="monospace">+1</text>
      <text x="4" y={H_SVG - PAD + 2} fill="#334155" fontSize="9" fontFamily="monospace">−1</text>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
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

// ── Multi-channel oscilloscope (5 authority channels) ────────────────────────
function MultiOscilloscope({ tMs, active }: { tMs: number; active: Set<ChannelId> }) {
  const W = 640, H_SVG = 140, PAD = 12;
  const usable = H_SVG - PAD * 2;
  return (
    <svg
      viewBox={`0 0 ${W} ${H_SVG}`}
      className="w-full rounded-xl"
      style={{ background: "#050a14", border: "1px solid #1e293b" }}
      data-testid="multi-oscilloscope-svg"
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

// ── Authority band reference table ────────────────────────────────────────────
function BandTable() {
  const mid = (b: typeof BANDS[number]) => Math.round((b.wdmMin + b.wdmMax) / 2);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-widest">
            <th className="px-4 py-2 text-left">Band</th>
            <th className="px-4 py-2 text-right">WDM range</th>
            <th className="px-4 py-2 text-right">λ mid (nm)</th>
            <th className="px-4 py-2 text-right">f (THz)</th>
            <th className="px-4 py-2 text-right">T (fs)</th>
            <th className="px-4 py-2 text-right">E (eV)</th>
            <th className="px-4 py-2 text-right">Λ (kg)</th>
            <th className="px-4 py-2 text-right">Fee ×</th>
          </tr>
        </thead>
        <tbody>
          {BANDS.map(b => {
            const w = mid(b);
            const { nm, frequencyHz, periodS, energyEv, lambdaKg, feeMultiplier } = computeOscillation(w, 0);
            return (
              <tr key={b.name} className="border-b border-slate-900 hover:bg-slate-900/40 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: b.bg, color: b.color }}>{b.name}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-500">{b.wdmMin}–{b.wdmMax}</td>
                <td className="px-4 py-2.5 text-right" style={{ color: b.color }}>{nm.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right text-slate-300">{(frequencyHz / 1e12).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right text-slate-400">{(periodS * 1e15).toFixed(3)}</td>
                <td className="px-4 py-2.5 text-right text-violet-400">{energyEv.toFixed(4)}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{fmtSci(lambdaKg, 3)}</td>
                <td className="px-4 py-2.5 text-right text-amber-400">{feeMultiplier.toFixed(4)}×</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Per-channel waveform table ────────────────────────────────────────────────
function ChannelWavefunctionTable() {
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
                <td className="px-3 py-2 text-right">
                  <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: ch.color }} />
                  <span style={{ color: ch.color }}>{s.nm.toFixed(1)}</span>
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OscillatingQuantaPage() {
  usePageMeta({
    title: "Theory of Compression States — First Principles of NexusOS",
    description: "The universe evolves from the first unobserved oscillation. Each subsequent state is a compression of the previous one, encoded in the electromagnetic spectrum. 51,200 orthogonal Ψ channels represent the full addressable state space.",
    canonical: "https://wnsp.io/oscillating-quanta",
    ogTitle: "Theory of Compression States — First Principles",
    ogDescription: "The first unobserved oscillation at 555 THz. Λ=hf/c² compression law. 51,200 orthogonal Ψ channels. The physics foundation of NexusOS.",
    twitterTitle: "Theory of Compression States",
    twitterDescription: "Λ=hf/c². The universe evolves from the first unobserved oscillation. 51,200 orthogonal Ψ channels.",
  });
  // Single-channel explorer state (from original)
  const [wdm,     setWdm]     = useState(128);
  const [tMs,     setTMs]     = useState(0);
  const [playing, setPlaying] = useState(false);

  // Multi-channel oscilloscope state
  const [multiActive, setMultiActive] = useState<Set<ChannelId>>(
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

  function setActive(updater: (prev: Set<ChannelId>) => Set<ChannelId>) {
    setMultiActive(updater);
  }

  const band  = bandForWdm(wdm);
  const state = computeOscillation(wdm, tMs);
  const waveColor = nmToColor(state.nm);

  const focusedCh = CHANNELS.find(c => c.id === focused)!;
  const fs = computeOscillation(focusedCh.wdm, tMs);

  const curlSingle = `curl -X POST https://wnsp.io/api/wnsp/quanta/oscillate \\
  -H "Content-Type: application/json" \\
  -d '{"wdm": ${wdm}}'`;

  const curlWdm = `curl -X POST https://wnsp.io/api/wnsp/quanta/oscillate \\
  -H "Content-Type: application/json" \\
  -d '{"wdm": ${focusedCh.wdm}}'`;

  const curlNm = `curl -X POST https://wnsp.io/api/wnsp/quanta/oscillate \\
  -H "Content-Type: application/json" \\
  -d '{"wavelength_nm": ${fs.nm.toFixed(3)}}'`;

  const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: "both",         label: "Both"         },
    { key: "mathematical", label: "Mathematical"  },
    { key: "plain",        label: "Plain English" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/wnsp" data-testid="link-back-hub">
              <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                WNSP
              </button>
            </Link>
            <span className="text-slate-700">/</span>
            <Waves className="w-4 h-4 text-cyan-400" />
            <h1 className="font-semibold text-white text-sm m-0 p-0 leading-none">Oscillating Quanta — First Principles</h1>
          </div>
          {/* View mode toggle controls all 4 dual-layer sections */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5" data-testid="view-mode-toggle">
            {VIEW_MODES.map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                data-testid={`view-mode-${v.key}`}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  viewMode === v.key ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Act badge + sequence nav */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 1 of 8", color: "#8b5cf6" },
              { label: "First Disclosure 2025", color: "#22c55e" },
              { label: "AGPL-3.0", color: "#8b5cf6" },
              { label: "Copyleft", color: "#8b5cf6" },
            ].map(({ label, color }) => (
              <span key={label} className="text-[10px] font-mono px-2.5 py-1 rounded-full border"
                style={{ color, borderColor: color + "55", background: color + "11" }}>
                {label}
              </span>
            ))}
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-[10px] font-mono text-violet-400 tracking-widest mb-3">THE SEQUENCE — ACT 1 OF 13</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 space-y-1">
                <p className="text-[9px] font-mono text-violet-400 tracking-widest">ACT 1 ← HERE</p>
                <p className="text-violet-200 font-medium leading-tight">Theory of<br />Compression States</p>
                <p className="text-[9px] text-violet-400">Λ = hf/c²</p>
              </div>
              {[
                { act: "ACT 2", title: "The Universal ONE",           sub: "f₀ derives Λ",         href: "/universal-one" },
                { act: "ACT 3", title: "Unified Compression Theory",  sub: "4 forces = 1 Λ",        href: "/unified-compression-theory" },
                { act: "ACT 4", title: "The Mechanism",               sub: "ΔE = hf₀(2ⁿ²−2ⁿ¹)",   href: "/matter-protocol" },
                { act: "ACT 5", title: "The Address",                 sub: "∀ Λ : ∃! Ψ",           href: "/universal-address" },
                { act: "ACT 6", title: "The Catalogue",               sub: "n = log₂(mc²/E₀)",      href: "/element-catalogue" },
                { act: "ACT 7", title: "The Trap",                    sub: "Ψ(+k̂) ⊗ Ψ(−k̂)",      href: "/standing-wave-trap" },
                { act: "ACT 8", title: "The Lossless Channel",        sub: "α = 0, C = ZPE floor",   href: "/lossless-channel" },
                { act: "ACT 9",  title: "The Cavity",    sub: "WGM resonance, r_c",  href: "/resonance-cavity" },
                { act: "ACT 10", title: "The Exchange", sub: "Ω_R = 2g",            href: "/polariton-exchange" },
                { act: "ACT 11", title: "The Emitter",  sub: "F_p=(Q/V)(λ/n)³",    href: "/the-emitter" },
                { act: "ACT 12", title: "The Network",  sub: "ω=ω₀−2J·cos(ka)",    href: "/the-network" },
                { act: "ACT 13", title: "The Observer", sub: "χ=g²/Δ",              href: "/the-observer" },
              ].map(({ act, title, sub, href }) => (
                <Link key={href} href={href}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-3 hover:border-slate-500 transition-colors space-y-1 block">
                  <p className="text-[9px] font-mono text-slate-500 tracking-widest">{act}</p>
                  <p className="text-slate-300 font-medium leading-tight">{title}</p>
                  <p className="text-[9px] text-slate-500">{sub}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PART A — Theory (4 dual-layer sections with view toggle)         */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {/* §0 — The First Oscillation */}
        <DualSection
          testId="section-0-first-oscillation"
          title="§0 — The First Oscillation"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                NexusOS is founded on the Theory of Compression States: the universe began as a
                single unobserved oscillation — a photon that oscillated before anything existed to
                detect it. This first oscillation is not a metaphor. It is a measurable frequency
                embedded into every fee, every spectral address, and every NXT transfer.
              </p>
              <p>
                Every WNSP channel, every transaction fee, and every spectral address descends from
                this originating event. The genesis address{" "}
                <span className="font-mono text-white/60">wnsp://Ψ(228,45,H)</span> encodes this
                originating event as a WNSP spectral coordinate.
              </p>
              <p className="text-xs text-slate-500 italic">
                "Before observation there was oscillation. The universe collapsed from the wave."
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-1.5">
                <div className="text-slate-500 mb-1">// First Oscillation — canonical constants</div>
                <div><span className="text-cyan-400">f₀</span>      <span className="text-slate-500">=</span> <span className="text-amber-300">555 THz</span>             <span className="text-slate-600">// FIRST_OSCILLATION_HZ</span></div>
                <div><span className="text-cyan-400">λ₀</span>      <span className="text-slate-500">=</span> <span className="text-amber-300">{FIRST_OSCILLATION_NM.toFixed(4)} nm</span>  <span className="text-slate-600">// c / f₀</span></div>
                <div><span className="text-cyan-400">WDM₀</span>    <span className="text-slate-500">=</span> <span className="text-amber-300">{FIRST_OSCILLATION_WDM}</span>               <span className="text-slate-600">// KERNEL band</span></div>
                <div className="border-t border-slate-800 pt-1 mt-1">
                  <div><span className="text-cyan-400">E₀</span>    <span className="text-slate-500">=</span> <span className="text-violet-300">{fmtSci(FIRST_OSCILLATION_J, 4)} J</span></div>
                  <div><span className="text-cyan-400">E₀</span>    <span className="text-slate-500">=</span> <span className="text-violet-300">{FIRST_OSCILLATION_EV.toFixed(6)} eV</span></div>
                  <div><span className="text-cyan-400">λ_mass</span> <span className="text-slate-500">=</span> <span className="text-white font-bold">{fmtSci(LAMBDA_MASS_KG, 4)} kg</span>  <span className="text-slate-600">// h·f₀/c²</span></div>
                </div>
                <div className="border-t border-slate-800 pt-1 mt-1 text-slate-500">// Genesis address</div>
                <div><span className="text-green-300">wnsp://Ψ(228,45,H)</span><span className="text-slate-500">/genesis</span></div>
              </div>
              <p className="text-xs text-slate-500">
                λ₀ ≈ 539.89 nm (green) is the centre of human visual perception. The canonical{" "}
                <span className="font-mono text-violet-400">lambda_mass</span> ({fmtSci(LAMBDA_MASS_KG, 2)} kg)
                is the fee-multiplier reference across all NexusOS calculations.
              </p>
            </div>
          }
        />

        {/* §1 — Energy Quanta Derivation */}
        <DualSection
          testId="section-1-energy-quanta"
          title="§1 — Energy Quanta Derivation"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                A quanta is the smallest indivisible unit of electromagnetic energy. It cannot exist
                at rest — existence requires oscillation. The energy of any photon is completely
                determined by one number: its oscillation frequency.
              </p>
              <p>
                This is Planck's insight from 1900: energy comes in discrete packets proportional to
                frequency. The constant h is now an exact SI-defined value — a fundamental feature of
                the universe's structure, not a measurement.
              </p>
              <p>
                In NexusOS, every WDM channel is one specific frequency. The channel determines the
                energy; the energy determines the fee. There is no ambiguity and no governance vote
                can override it.
              </p>
            </div>
          }
          technical={
            <div className="space-y-2">
              {[
                { label: "Planck–Einstein relation",   formula: "E = h · f",     note: "h = 6.626 070 15 × 10⁻³⁴ J·s  (exact, 2019 SI)" },
                { label: "Wave–frequency duality",     formula: "f = c / λ",     note: "c = 299 792 458 m/s  (exact, 1983 SI)" },
                { label: "Compression state (NexusOS)", formula: "Λ = h·f / c²", note: "Photon effective mass — direct fee-multiplier basis" },
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

        {/* §2 — Wavefunction Per Channel */}
        <DualSection
          testId="section-2-wavefunction"
          title="§2 — Wavefunction Per Channel"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                Each WNSP channel is an independent oscillator with its own wavefunction
                ψ(t) = cos(2πft). The cosine starts at +1 (maximum) at t=0 and completes one full
                cycle every period T = 1/f.
              </p>
              <p>
                Phase tracks where the oscillator is within its current cycle. NexusOS uses a
                normalized phase φ = (f × t) mod 1 — a fraction in [0, 1) representing how far
                through the current period we are. This avoids float64 overflow when computing with
                frequencies around 500 THz over long runtimes.
              </p>
              <p>
                The 5 authority channels oscillate simultaneously and independently. Their waveforms
                never interfere — they occupy orthogonal dimensions of Hilbert space
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
                  <div><span className="text-cyan-400">φ</span>     <span className="text-slate-500">= (f × t) mod 1</span>    <span className="text-slate-600">// [0, 1)</span></div>
                  <div><span className="text-cyan-400">φ_rad</span> <span className="text-slate-500">= φ × 2π</span>            <span className="text-slate-600">// [0, 2π)</span></div>
                  <div><span className="text-cyan-400">ψ(t)</span>  <span className="text-slate-500">= cos(φ_rad)</span>        <span className="text-slate-600">// +1 at t=0</span></div>
                </div>
                <div className="pt-1 border-t border-slate-800">
                  <div className="text-slate-500">// 128-sample waveform</div>
                  <div><span className="text-cyan-400">w[i]</span>  <span className="text-slate-500">= cos(φ_rad + i · 2π/128)</span></div>
                </div>
              </div>
              <ChannelWavefunctionTable />
            </div>
          }
        />

        {/* §3 — Compression State Oscillation */}
        <DualSection
          testId="section-3-compression-state"
          title="§3 — Compression State Oscillation"
          viewMode={viewMode}
          concept={
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                Every oscillating photon carries a compression state Λ = hf/c², derived directly
                from Einstein's mass–energy equivalence applied to light. This is the photon's
                effective mass — not a metaphor, a measurable relativistic quantity.
              </p>
              <p>
                Higher-frequency channels (shorter wavelength, higher WDM authority) carry greater Λ.
                This is the physical basis for NexusOS fee scaling: SYSTEM-band operations use
                higher-energy photons, so their actions cost proportionally more.
              </p>
              <p>
                The fee multiplier for any channel is its photon energy relative to the green
                reference (560 nm):{" "}
                <span className="font-mono text-violet-300">multiplier = E_ch / E_ref</span>.
                Physics — not governance — sets the price.
              </p>
            </div>
          }
          technical={
            <div className="space-y-3">
              {[
                { label: "Compression state",  formula: "Λ = h·f / c²",      note: "Photon effective mass (kg). Equals E/c²." },
                { label: "Fee multiplier",     formula: "m = E_ch / E_ref",   note: "E_ref = h·f at 560 nm (green midpoint)." },
                { label: "Physics fee (NXT)",  formula: "fee = base × m",     note: "base set by governance; m set by physics." },
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PART B — Authority Band Physics table (restored from original)   */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <section data-testid="section-band-explorer">
          <h2 className="text-xl font-bold text-white mb-1">Authority Band Physics</h2>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Each of NexusOS's four authority bands spans 64 WDM channels. Higher authority (shorter λ)
            means higher frequency, higher photon energy, and a larger compression state — directly
            governing fee multipliers. Values shown at mid-band.
          </p>
          <BandTable />
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PART C — Single-channel live explorer (restored from original)   */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <section data-testid="section-live-oscilloscope">
          <h2 className="text-xl font-bold text-white mb-1">Live Channel Explorer</h2>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            Drag the WDM slider to tune to any of the 256 channels and watch the photon waveform
            evolve in real time. The oscilloscope renders 128 samples of cos(φ + i·2π/128) — one
            complete cycle from the current phase.
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-60">
              <label className="text-xs text-slate-500 uppercase tracking-wider whitespace-nowrap">WDM channel</label>
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
                style={{ color: band.color }}
                data-testid="text-wdm-value"
              >
                {wdm}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying(p => !p)}
                className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full border transition-colors"
                style={{ borderColor: playing ? "#ef4444" : band.color, color: playing ? "#f87171" : band.color }}
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

          <SingleOscilloscope waveform={state.waveform} color={waveColor} />

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Wavelength",   value: `${state.nm.toFixed(3)} nm`,                  testId: "metric-nm" },
              { label: "Frequency",    value: `${(state.frequencyHz/1e12).toFixed(4)} THz`, testId: "metric-freq" },
              { label: "Period",       value: `${(state.periodS * 1e15).toFixed(3)} fs`,    testId: "metric-period" },
              { label: "Phase (norm)", value: state.phase.toFixed(6),                       testId: "metric-phase" },
              { label: "Amplitude",    value: state.amplitude.toFixed(6),                   testId: "metric-amp" },
              { label: "Energy (J)",   value: fmtSci(state.energyJ, 4),                     testId: "metric-energy-j" },
              { label: "Energy (eV)",  value: `${state.energyEv.toFixed(4)} eV`,            testId: "metric-energy-ev" },
              { label: "Λ comp. mass", value: fmtSci(state.lambdaKg, 4),                    testId: "metric-lambda-kg" },
            ].map(m => (
              <div key={m.label} className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2.5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{m.label}</div>
                <div className="font-mono text-sm text-slate-200" data-testid={m.testId}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Band badge */}
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PART D — 5-channel authority oscilloscope                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <section data-testid="section-authority-oscilloscope" className="border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-white">5-Channel Authority Oscilloscope</div>
              <div className="text-xs text-slate-500 mt-0.5">All 5 authority channels oscillating simultaneously</div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Channel toggles */}
            <div className="flex flex-wrap gap-2 items-center">
              {CHANNELS.map(ch => {
                const on = multiActive.has(ch.id);
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
              <span className="text-xs font-mono text-slate-600 ml-1" data-testid="text-multi-elapsed">
                t = {tMs.toFixed(0)} ms
              </span>
            </div>

            <MultiOscilloscope tMs={tMs} active={multiActive} />

            {/* Focus selector + metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Focus channel metrics</div>
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
                  { label: "λ (nm)",         value: fs.nm.toFixed(3),                    testId: "multi-metric-nm" },
                  { label: "f (THz)",         value: (fs.frequencyHz/1e12).toFixed(4),   testId: "multi-metric-freq" },
                  { label: "T (fs)",          value: (fs.periodS * 1e15).toFixed(3),     testId: "multi-metric-period" },
                  { label: "φ normalized",    value: fs.phase.toFixed(6),                testId: "multi-metric-phase" },
                  { label: "ψ(t) amplitude",  value: fs.amplitude.toFixed(6),            testId: "multi-metric-amp" },
                  { label: "E (J)",           value: fmtSci(fs.energyJ, 4),              testId: "multi-metric-energy-j" },
                  { label: "E (eV)",          value: `${fs.energyEv.toFixed(4)} eV`,     testId: "multi-metric-energy-ev" },
                  { label: "Λ (kg)",          value: fmtSci(fs.lambdaKg, 4),             testId: "multi-metric-lambda" },
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PART E — API Reference                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <section data-testid="section-api-reference">
          <h2 className="text-xl font-bold text-white mb-1">API Reference</h2>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            Every oscillation state on this page is available server-side. Supply either a WDM
            channel index or a wavelength in nm — the server derives the missing value and returns
            the full oscillation payload at current wall-clock time.
          </p>

          <div className="space-y-4">
            {/* Single-channel endpoint card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-950/60 text-violet-400 border border-violet-800/50">POST</span>
                <code className="text-sm font-mono text-slate-200">/api/wnsp/quanta/oscillate</code>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Request body (WDM)</div>
                  <pre className="bg-slate-950 rounded p-3 text-slate-300 overflow-x-auto" data-testid="code-schema-wdm">{`{ "wdm": ${wdm} }`}</pre>
                  <div className="text-slate-500 mt-2 mb-1 uppercase tracking-wider text-[10px]">Request body (nm)</div>
                  <pre className="bg-slate-950 rounded p-3 text-slate-300 overflow-x-auto" data-testid="code-schema-nm">{`{ "wavelength_nm": ${state.nm.toFixed(3)} }`}</pre>
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

            {/* curl snippets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Current slider channel", curl: curlSingle, testId: "code-curl-slider",  copyId: "button-copy-curl-slider" },
                { label: "via WDM",                curl: curlWdm,    testId: "code-curl-wdm",     copyId: "button-copy-curl-wdm" },
                { label: "via wavelength_nm",       curl: curlNm,     testId: "code-curl-nm",      copyId: "button-copy-curl-nm" },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</span>
                    <CopyBtn text={s.curl} testId={s.copyId} />
                  </div>
                  <pre className="text-[10px] font-mono text-cyan-300 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all" data-testid={s.testId}>{s.curl}</pre>
                </div>
              ))}
            </div>
          </div>
        </section>

        <EcosystemNav />

      </div>
    </div>
  );
}
