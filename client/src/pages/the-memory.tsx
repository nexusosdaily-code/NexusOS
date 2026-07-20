import { useState, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Database, Activity, Zap, Layers, Clock, BarChart2 } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-19";
const BASE      = "https://wnsp.io";
const FU        = "#d946ef";   // fuchsia-500

// ── Physics helpers ──────────────────────────────────────────────────────────
const popDecay   = (t: number, t1: number) => Math.exp(-t / t1);
const cohDecay   = (t: number, t2: number) => Math.exp(-t / t2);
const storageEff = (ts: number, t2: number, eta0: number) =>
  eta0 * Math.exp(-ts / t2);
const multiMode  = (t2Ns: number, tauNs: number) => t2Ns / tauNs;

// ── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = FU, children }: {
  title: string; icon: ElementType; color?: string; children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-slate-900/60 p-5 mb-4"
      style={{ borderColor: color + "30" }}>
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Ref({ n, authors, year, title, journal, doi, note }: {
  n: number; authors: string; year: number | string; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 font-mono w-5 flex-shrink-0">[{n}]</span>
      <div>
        <span className="text-slate-400">{authors} ({year}). </span>
        {doi
          ? <a href={doi} target="_blank" rel="noopener noreferrer"
               className="hover:opacity-80 italic" style={{ color: FU }}>{title}</a>
          : <span className="text-white italic">{title}</span>}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: color + "40", background: color + "10" }}>
      <p className="text-xs mb-2" style={{ color }}>{label}</p>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

// ── Sequence nav ─────────────────────────────────────────────────────────────
const ACT_NAV = [
  { act:"1",  title:"Compression States", sub:"Λ=hf/c²",          href:"/oscillating-quanta" },
  { act:"2",  title:"The Universal ONE",  sub:"f₀ derives Λ",      href:"/universal-one" },
  { act:"3",  title:"Unified Theory",     sub:"4 forces=1 Λ",      href:"/unified-compression-theory" },
  { act:"4",  title:"The Mechanism",      sub:"ΔE=hf₀(2ⁿ²−2ⁿ¹)", href:"/matter-protocol" },
  { act:"5",  title:"The Address",        sub:"∀Λ:∃!Ψ",            href:"/universal-address" },
  { act:"6",  title:"The Catalogue",      sub:"n=log₂(mc²/E₀)",   href:"/element-catalogue" },
  { act:"7",  title:"The Trap",           sub:"Ψ(+k̂)⊗Ψ(−k̂)",   href:"/standing-wave-trap" },
  { act:"8",  title:"The Channel",        sub:"α=0, C=ZPE",        href:"/lossless-channel" },
  { act:"9",  title:"The Cavity",         sub:"R=nc/2πfₙ",         href:"/resonance-cavity" },
  { act:"10", title:"The Exchange",       sub:"Ω_R=2g",            href:"/polariton-exchange" },
  { act:"11", title:"The Emitter",        sub:"F_p=(Q/V)(λ/n)³",  href:"/the-emitter" },
  { act:"12", title:"The Network",        sub:"ω=ω₀−2J·cos(ka)", href:"/the-network" },
  { act:"13", title:"The Observer",       sub:"χ=g²/Δ",            href:"/the-observer" },
];

function SequenceNav({ current }: { current: 14 }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: FU + "20", background: FU + "08" }}>
      <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: FU }}>
        THE SEQUENCE — ACT {current} OF 16
      </p>
      <div className="grid grid-cols-3 md:grid-cols-16 gap-1.5 text-center text-xs">
        {ACT_NAV.map(({ act, title, sub, href }) => (
          <Link key={href} href={href}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1.5
                           hover:border-slate-500 transition-colors space-y-0.5 block">
            <p className="text-[7px] font-mono text-slate-500 tracking-widest">ACT {act}</p>
            <p className="text-slate-300 font-medium leading-tight text-[8px]">{title}</p>
            <p className="text-[7px] text-slate-500">{sub}</p>
          </Link>
        ))}
        <div className="rounded-lg border p-1.5 space-y-0.5"
          style={{ borderColor: FU + "50", background: FU + "15" }}>
          <p className="text-[7px] font-mono tracking-widest" style={{ color: "#f5d0fe" }}>ACT 14 ← HERE</p>
          <p className="font-medium leading-tight text-[8px]" style={{ color: "#fdf4ff" }}>The Memory</p>
          <p className="text-[7px]" style={{ color: FU }}>T₂≤2T₁</p>
        </div>
        <Link href="/cosmic-lattice"
              className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-1.5
                         hover:border-violet-400/60 transition-colors space-y-0.5 block">
          <p className="text-[7px] font-mono text-violet-400 tracking-widest">ACT 15 →</p>
          <p className="text-violet-200 font-medium leading-tight text-[8px]">The Void</p>
          <p className="text-[7px] text-violet-400">n_ZPE=264.71</p>
        </Link>
        <Link href="/the-entangler"
              className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-1.5
                         hover:border-rose-400/60 transition-colors space-y-0.5 block">
          <p className="text-[7px] font-mono text-rose-400 tracking-widest">ACT 16 →</p>
          <p className="text-rose-200 font-medium leading-tight text-[8px]">The Entangler</p>
          <p className="text-[7px] text-rose-400">|Φ⁺⟩=(|00⟩+|11⟩)/√2</p>
        </Link>
      </div>
    </div>
  );
}

// ── Decay plot animation ──────────────────────────────────────────────────────
function DecayPlot({ t1Us, t2Us }: { t1Us: number; t2Us: number }) {
  const [phase, setPhase] = useState(0);
  const rafRef = useRef<number | null>(null);
  const t0Ref  = useRef<number | null>(null);

  useEffect(() => {
    setPhase(0);
    t0Ref.current = null;
    const animate = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const elapsed = (ts - t0Ref.current) / 1000;
      setPhase((elapsed * 0.15) % 1);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [t1Us, t2Us]);

  const W = 280; const H = 160;
  const pad = { l: 28, r: 10, t: 12, b: 28 };
  const iw = W - pad.l - pad.r; const ih = H - pad.t - pad.b;
  const N  = 200;
  const tMax = 3 * t1Us;

  const popPts = Array.from({ length: N }, (_, i) => {
    const t = (i / (N - 1)) * tMax;
    const y = popDecay(t, t1Us);
    return `${pad.l + (t / tMax) * iw},${pad.t + ih - y * ih}`;
  }).join(" ");

  const cohPts = Array.from({ length: N }, (_, i) => {
    const t = (i / (N - 1)) * tMax;
    const y = cohDecay(t, t2Us);
    return `${pad.l + (t / tMax) * iw},${pad.t + ih - y * ih}`;
  }).join(" ");

  const markerX   = pad.l + phase * iw;
  const markerT   = phase * tMax;
  const markerPop = popDecay(markerT, t1Us);
  const markerCoh = cohDecay(markerT, t2Us);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={W} height={H} className="w-full max-w-sm mx-auto">
        <rect width={W} height={H} rx="8" fill="#0f172a" />
        {[0.25, 0.5, 0.75, 1.0].map(f => (
          <line key={f} x1={pad.l} x2={pad.l + iw}
            y1={pad.t + ih - f * ih} y2={pad.t + ih - f * ih}
            stroke="#1e293b" strokeWidth="0.5" />
        ))}
        <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih}
          stroke="#334155" strokeWidth="0.5" />
        <polyline points={popPts} fill="none" stroke="#f97316" strokeWidth="2" />
        <polyline points={cohPts} fill="none" stroke={FU}      strokeWidth="2" />
        <line x1={markerX} y1={pad.t} x2={markerX} y2={pad.t + ih}
          stroke="#475569" strokeWidth="1" strokeDasharray="3,3" />
        <circle cx={markerX} cy={pad.t + ih - markerPop * ih} r="4" fill="#f97316" />
        <circle cx={markerX} cy={pad.t + ih - markerCoh * ih} r="4" fill={FU} />
        <text x={pad.l + 4} y={pad.t + 12} fontSize="7.5" fill="#f97316" fontFamily="monospace">ρ_ee (T₁)</text>
        <text x={pad.l + 4} y={pad.t + 22} fontSize="7.5" fill={FU}      fontFamily="monospace">ρ_ge (T₂)</text>
        <text x={W / 2 - 12} y={H - 6}    fontSize="7.5" fill="#64748b" fontFamily="monospace">time →</text>
        <text x={pad.l - 2} y={pad.t + ih + 14} fontSize="7" fill="#475569" fontFamily="monospace">0</text>
        <text x={pad.l + iw - 18} y={pad.t + ih + 14} fontSize="7" fill="#475569" fontFamily="monospace">3T₁</text>
      </svg>
      <div className="flex gap-6 text-[9px] font-mono">
        <span style={{ color: "#f97316" }}>ρ_ee: {markerPop.toFixed(3)}</span>
        <span style={{ color: FU }}>ρ_ge: {markerCoh.toFixed(3)}</span>
        <span className="text-slate-600">t = {(markerT).toFixed(1)} μs</span>
      </div>
    </div>
  );
}

// ── AFC comb SVG ─────────────────────────────────────────────────────────────
function AfcComb() {
  const W = 280; const H = 120;
  const pad = { l: 28, r: 10, t: 14, b: 24 };
  const iw  = W - pad.l - pad.r; const ih = H - pad.t - pad.b;
  const N   = 8;
  const spacing = iw / N;
  const toothW  = spacing * 0.22;
  const teeth   = [0.80, 0.78, 0.82, 0.79, 0.81, 0.80, 0.78, 0.82];

  return (
    <svg width={W} height={H} className="w-full max-w-sm mx-auto">
      <rect width={W} height={H} rx="8" fill="#0f172a" />
      <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih}
        stroke="#334155" strokeWidth="0.5" />
      {teeth.map((h, i) => {
        const cx = pad.l + (i + 0.5) * spacing;
        const ph = ih * h;
        return (
          <rect key={i} x={cx - toothW / 2} y={pad.t + ih - ph}
            width={toothW} height={ph}
            fill="#10b981" opacity="0.85" rx="1.5" />
        );
      })}
      <line x1={pad.l + spacing * 0.5} y1={pad.t + 8}
            x2={pad.l + spacing * 1.5} y2={pad.t + 8}
            stroke="#475569" strokeWidth="0.8" />
      <text x={pad.l + spacing * 0.9} y={pad.t + 6} fontSize="6.5" fill="#64748b" fontFamily="monospace">Δ</text>
      <text x={pad.l + iw / 2 - 22} y={H - 6} fontSize="7.5" fill="#64748b" fontFamily="monospace">frequency →</text>
      <text x={pad.l} y={pad.t + 10} fontSize="7.5" fill="#10b981" fontFamily="monospace">α(ω)</text>
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TheMemoryPage() {
  const [t1Us,  setT1Us]  = useState(100);   // μs
  const [t2Us,  setT2Us]  = useState(40);    // μs
  const [tsUs,  setTsUs]  = useState(20);    // μs storage time
  const [eta0,  setEta0]  = useState(90);    // % peak efficiency

  const t2Safe = Math.min(t2Us, 2 * t1Us);
  const eta    = storageEff(tsUs, t2Safe, eta0 / 100);
  const mModes = multiMode(t2Safe * 1000, 1); // T₂ in ns / 1 ns pulse width

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Badges ───────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 14 of 14",                  color: FU },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#e879f9" },
              { label: "AGPL-3.0",                      color: "#e879f9" },
              { label: "Copyleft",                      color: "#e879f9" },
              { label: "T₂ ≤ 2T₁",                     color: FU },
              { label: "DLCZ protocol",                 color: "#a78bfa" },
              { label: "AFC — multi-mode",              color: "#10b981" },
            ].map(({ label, color }) => (
              <span key={label} className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: color + "25", color, border: `1px solid ${color}40` }}>
                {label}
              </span>
            ))}
          </div>

          <SequenceNav current={14} />

          <div className="flex items-start gap-3">
            <Link href="/the-observer">
              <button className="text-gray-500 hover:text-white transition-colors mt-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest">
                NEXUSOS RESEARCH · TE RATA POU · {PAGE_DATE} ·{" "}
                <a href="https://github.com/nexusosdaily-code/NexusOS"
                   target="_blank" rel="noopener noreferrer"
                   className="hover:opacity-80 inline-flex items-center gap-1"
                   style={{ color: FU }}>
                  github.com/nexusosdaily-code/NexusOS <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight mt-1">The Memory</h1>
              <p className="text-slate-400 text-base mt-1">
                Act 13 gave us the ability to <em>read</em> a Ψ channel state without destroying it.
                But reading is not enough — the network must also <em>hold</em> that state across time
                while classical messages travel between nodes. This Act introduces the quantum memory:
                the device that stores a photon's quantum state, preserves it for microseconds to
                milliseconds, and releases it on demand. Without memory there is no entanglement
                distribution, no repeater, and no civilisation-scale Ψ network.
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero equation ─────────────────────────────────────────── */}
        <div className="rounded-2xl border p-6 mb-5 text-center relative overflow-hidden"
          style={{ borderColor: FU + "30", background: FU + "08" }}>
          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
            <Database className="w-64 h-64" style={{ color: FU }} />
          </div>
          <div className="relative space-y-3">
            <div className="text-2xl font-mono font-bold" style={{ color: "#f0abfc" }}>
              T₂ ≤ 2T₁
            </div>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              The Bloch equation constraint: coherence time T₂ can never exceed twice the energy
              relaxation time T₁. Storage efficiency decays as
              η(t_s) = η₀ · e<sup>−t_s/T₂</sup>, and multi-mode capacity scales as M = T₂ / τ_photon.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <MetricCard label="Energy relaxation"  value="T₁"      sub="longitudinal decay of ρ_ee" color={FU} />
              <MetricCard label="Coherence time"     value="T₂ ≤ 2T₁" sub="dephasing of off-diagonal ρ_ge" color="#e879f9" />
              <MetricCard label="Storage efficiency" value="η(t_s)"  sub="η₀ · exp(−t_s / T₂)"     color="#a78bfa" />
              <MetricCard label="Multi-mode cap."    value="M"       sub="T₂ / τ_photon"            color="#10b981" />
            </div>
          </div>
        </div>

        {/* ── Bloch equations ──────────────────────────────────────── */}
        <Section title="The Bloch Equations — Longitudinal and Transverse Decay" icon={Activity}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-slate-400 text-xs leading-relaxed">
                Any two-level quantum system — qubit, spin, atom — obeys the optical Bloch equations.
                The density-matrix elements decay independently on two timescales:
              </p>
              <div className="rounded-lg p-3 space-y-2 font-mono text-xs"
                style={{ background: FU + "10", border: `1px solid ${FU}30` }}>
                <p style={{ color: "#f0abfc" }}>dρ_ee / dt  =  −ρ_ee / T₁</p>
                <p style={{ color: "#f0abfc" }}>dρ_ge / dt  =  −ρ_ge / T₂</p>
                <p className="text-slate-500 text-[10px] pt-1 border-t border-slate-800 mt-1">
                  1/T₂ = 1/(2T₁) + 1/T₂★  ·  T₂★ = pure dephasing
                </p>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                The factor-of-2 in T₂ ≤ 2T₁ arises because energy decay contributes equally to
                amplitude and phase relaxation. Pure dephasing (phonons, charge noise, magnetic
                fluctuations) can only shorten T₂ further — never lengthen it past 2T₁.
              </p>
              <div className="rounded-lg p-3 text-xs space-y-1"
                style={{ background: "#10b98115", border: "1px solid #10b98130" }}>
                <p className="text-emerald-400 font-mono mb-1">Typical values — rare-earth crystals, 4 K:</p>
                <p className="text-slate-400">T₁  ~ 1–100 ms    (radiative lifetime, nuclear spin)</p>
                <p className="text-slate-400">T₂  ~ 1–10 ms     (spin-echo extended)</p>
                <p className="text-slate-400">T₂★ ~ 1–100 μs    (free-induction decay)</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-slate-500 mb-1">DECAY CURVES — animated (linked to sliders below)</p>
              <DecayPlot t1Us={t1Us} t2Us={t2Safe} />
              <div className="flex gap-4 text-[9px] font-mono justify-center">
                <span className="text-orange-400">— ρ_ee population (T₁)</span>
                <span style={{ color: FU }}>— ρ_ge coherence (T₂)</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Interactive calculator ────────────────────────────────── */}
        <Section title="Storage Efficiency Calculator — η(t_s) = η₀ · exp(−t_s / T₂)" icon={BarChart2}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {([
                { label: "T₁  (μs)",                     val: t1Us, set: setT1Us,                                        min: 1,  max: 1000, step: 1  },
                { label: "T₂  (μs)  ← clamped to 2T₁",  val: t2Us, set: (v: number) => setT2Us(Math.min(v, 2 * t1Us)), min: 1,  max: 2000, step: 1  },
                { label: "Storage time t_s  (μs)",        val: tsUs, set: setTsUs,                                       min: 0,  max: 500,  step: 1  },
                { label: "Peak efficiency η₀  (%)",       val: eta0, set: setEta0,                                       min: 10, max: 100,  step: 1  },
              ] as { label: string; val: number; set: (v: number) => void; min: number; max: number; step: number }[]).map(
                ({ label, val, set, min, max, step }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-mono" style={{ color: FU }}>{val}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={val}
                      onChange={e => set(Number(e.target.value))}
                      className="w-full h-1.5 rounded appearance-none cursor-pointer"
                      style={{ accentColor: FU }} />
                  </div>
                )
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-lg p-4 space-y-3"
                style={{ background: FU + "10", border: `1px solid ${FU}30` }}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">T₁ (energy lifetime)</span>
                  <span className="font-mono text-orange-400">{t1Us} μs</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">T₂ (coherence, clamped)</span>
                  <span className="font-mono" style={{ color: FU }}>{t2Safe.toFixed(1)} μs</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">T₂ ≤ 2T₁ satisfied?</span>
                  <span className={`font-mono ${t2Us <= 2 * t1Us ? "text-emerald-400" : "text-amber-400"}`}>
                    {t2Us <= 2 * t1Us ? "✓ yes" : "⚠ clamped to 2T₁"}
                  </span>
                </div>
                <div className="border-t border-slate-700 pt-2">
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-400">Storage efficiency η(t_s)</span>
                    <span className="font-mono text-white text-lg font-bold">{(eta * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${eta * 100}%`, background: FU }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-700 pt-2">
                  <span className="text-slate-400">Multi-mode capacity M</span>
                  <span className="font-mono text-purple-400">
                    {mModes >= 1e6 ? (mModes / 1e6).toFixed(1) + "M"
                      : mModes >= 1e3 ? (mModes / 1e3).toFixed(1) + "k"
                      : mModes.toFixed(0)} modes
                  </span>
                </div>
                <p className="text-[10px] text-slate-600">M = T₂ / τ_photon · τ_photon = 1 ns assumed</p>
              </div>
              <div className={`rounded-lg p-3 text-xs border ${
                eta > 0.9 ? "bg-emerald-900/20 border-emerald-500/30"
                : eta > 0.5 ? "bg-sky-900/20 border-sky-500/30"
                : eta > 0.1 ? "bg-amber-900/20 border-amber-500/30"
                : "bg-red-900/20 border-red-500/30"}`}>
                <p className={
                  eta > 0.9 ? "text-emerald-400"
                  : eta > 0.5 ? "text-sky-400"
                  : eta > 0.1 ? "text-amber-400"
                  : "text-red-400"}>
                  {eta > 0.9 ? "Excellent — suitable for long-distance entanglement distribution"
                  : eta > 0.5 ? "Good — usable for quantum repeater nodes"
                  : eta > 0.1 ? "Fair — marginal, reduce t_s or improve T₂"
                  : "Poor — storage time far exceeds T₂"}
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── DLCZ Protocol ──────────────────────────────────────────── */}
        <Section title="DLCZ Protocol — Heralded Entanglement via Raman Scattering" icon={Zap} color="#a78bfa">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <p>
                The Duan–Lukin–Cirac–Zoller (DLCZ) protocol (2001) provides the first scalable
                scheme for long-distance quantum communication using atomic ensembles as quantum
                memories. A weak write pulse drives a Raman transition; the spontaneous Stokes
                photon heralds successful excitation of a collective spin-wave mode.
              </p>
              <div className="rounded-lg p-3 space-y-1.5 font-mono text-[10px]"
                style={{ background: "#a78bfa10", border: "1px solid #a78bfa30" }}>
                <p className="text-purple-300">Write:   |g⟩ →(pump)→ |e⟩ →(Stokes)→ |s⟩</p>
                <p className="text-purple-300">Store:   |W⟩ = (1/√N) Σⱼ |g₁…sⱼ…gₙ⟩</p>
                <p className="text-purple-300">Read:    |s⟩ →(read)→ |e⟩ →(anti-Stokes)→ |g⟩</p>
                <p className="text-slate-500 mt-1">collectively-enhanced readout efficiency ∝ OD</p>
              </div>
              <p>
                Entanglement is <em>heralded</em>: detection of a Stokes photon projects two
                remote ensembles into an entangled Bell state without the photon itself surviving.
                This eliminates the channel attenuation problem for the quantum bit.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-slate-500">DLCZ LINK METRICS</p>
              <div className="space-y-2 text-xs">
                {[
                  { k: "Link success prob / attempt", v: "p ≈ η_det · η_src · e^{−L/L_att}" },
                  { k: "Entanglement rate",           v: "R ≈ p_link · R_rep" },
                  { k: "Memory requirement",          v: "T₂ ≫ L/c  (round-trip)" },
                  { k: "Multi-mode gain",             v: "M modes → M × R speedup" },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between gap-3 p-2 rounded border border-slate-800">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-mono text-purple-300 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── AFC ──────────────────────────────────────────────────── */}
        <Section title="Atomic Frequency Comb (AFC) — Deterministic Multi-Mode Storage" icon={Layers} color="#10b981">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <p>
                The AFC protocol (Afzelius 2009) uses a spectrally shaped atomic absorption
                profile — a comb of narrow teeth spaced by Δ — to achieve deterministic
                on-demand storage. An input photon is absorbed collectively; the comb structure
                enforces a rephasing echo at time t_s = 1/Δ.
              </p>
              <div className="rounded-lg p-3 font-mono text-[10px] space-y-1"
                style={{ background: "#10b98110", border: "1px solid #10b98130" }}>
                <p className="text-emerald-300">η_AFC  = η₀ · exp(−d / F²)</p>
                <p className="text-emerald-300">t_s    = 1 / Δ  (programmable echo time)</p>
                <p className="text-emerald-300">M      = Γ_inhom / Δ  (modes per crystal)</p>
                <p className="text-emerald-300">F      = Δ / γ  (finesse = spacing / tooth width)</p>
                <p className="text-slate-500 mt-1">d = optical depth · F = finesse</p>
              </div>
              <p>
                A single Er³⁺:Y₂SiO₅ crystal with Γ_inhom ≈ 10 GHz and Δ = 1 MHz
                stores M ≈ 10,000 temporal modes simultaneously — the full bandwidth of a
                PHR-1 photonic switch fabric.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-slate-500">AFC ABSORPTION PROFILE</p>
              <AfcComb />
              <p className="text-[9px] font-mono text-slate-600 text-center">
                N = 8 teeth · spacing Δ · finesse F = Δ/γ
              </p>
            </div>
          </div>
        </Section>

        {/* ── WNSP Connection ───────────────────────────────────────── */}
        <Section title="WNSP Connection — The Persistent Ψ Register" icon={Clock}>
          <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
            <p>
              Each SNIC node integrates a rare-earth spin-wave memory module adjacent to the
              WGM resonator (Act 9) and Purcell emitter (Act 11). The memory serves three roles
              in the Ψ channel network:
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                {
                  title: "Entanglement Buffer",
                  desc: "Holds one half of a Bell pair while the Stokes photon travels to the remote node (L/c ≈ 67 μs per 10 km). Requires T₂ ≫ 67 μs.",
                  color: FU,
                },
                {
                  title: "Multiplexing Store",
                  desc: "M ≈ 10,000 temporal modes stored simultaneously in a single AFC crystal. Each mode is an independent Ψ channel slot — memory multiplies bandwidth without extra hardware.",
                  color: "#a78bfa",
                },
                {
                  title: "Clock Synchroniser",
                  desc: "Deterministic echo time t_s = 1/Δ eliminates the need for synchronized clocks between nodes. The comb spacing Δ is a local SNIC calibration parameter.",
                  color: "#10b981",
                },
              ].map(({ title, desc, color }) => (
                <div key={title} className="rounded-lg p-3 space-y-1.5 border"
                  style={{ borderColor: color + "30", background: color + "08" }}>
                  <p className="font-bold text-white text-xs" style={{ color }}>{title}</p>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg p-3 text-[10px] font-mono space-y-1 mt-2"
              style={{ background: FU + "08", border: `1px solid ${FU}20` }}>
              <p className="text-slate-300">SNIC memory target parameters — AGPL-3.0 · first disclosure {PAGE_DATE}:</p>
              <p className="text-slate-400">Material  Er³⁺ : Y₂SiO₅  at  1.5 K  (telecom 1550 nm native)</p>
              <p className="text-slate-400">T₁  ≥ 100 ms   (nuclear spin auxiliary state)</p>
              <p className="text-slate-400">T₂  ≥  10 ms   (dynamical decoupling, spin-echo)</p>
              <p className="text-slate-400">M   ≥ 10,000 modes   (Γ_inhom ≈ 10 GHz, Δ = 1 MHz AFC)</p>
              <p className="text-slate-400">η₀  ≥   90%   (cavity-enhanced, impedance-matched AFC)</p>
              <p className="text-slate-400">λ_s =  1550 nm   (telecom C-band, PHR-1 compatible)</p>
            </div>
          </div>
        </Section>

        {/* ── Metric cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Best T₁ (Er³⁺:YSO)"  value="~100 ms" sub="nuclear spin, 1.5 K"             color={FU}       />
          <MetricCard label="Best T₂ (spin echo)"  value="~10 ms"  sub="dynamical decoupling"            color="#e879f9"  />
          <MetricCard label="AFC capacity"          value="~10⁴"   sub="modes per crystal"               color="#a78bfa"  />
          <MetricCard label="Peak efficiency"       value="~90%"   sub="cavity-enhanced, impedance-matched" color="#10b981" />
        </div>

        {/* ── References ───────────────────────────────────────────── */}
        <Section title="References" icon={ExternalLink}>
          <div className="space-y-4">
            <Ref n={1} authors="Duan, L.-M. et al." year={2001}
              title="Long-distance quantum communication with atomic ensembles and linear optics"
              journal="Nature 414, 413"
              doi="https://doi.org/10.1038/35106500"
              note="The DLCZ protocol: heralded entanglement generation and swapping using atomic ensemble quantum memories and linear optics. Established the first scalable path to a quantum repeater network." />
            <Ref n={2} authors="Hammerer, K. et al." year={2010}
              title="Quantum interfaces between light and atomic ensembles"
              journal="Rev. Mod. Phys. 82, 1041"
              doi="https://doi.org/10.1103/RevModPhys.82.1041"
              note="Comprehensive review of light–matter interfaces for quantum memory. Covers EIT, off-resonant Raman, GEM, CRIB, and AFC protocols. Essential reference for SNIC memory module design." />
            <Ref n={3} authors="Afzelius, M. et al." year={2009}
              title="Multimode quantum memory based on atomic frequency combs"
              journal="Phys. Rev. A 79, 052329"
              doi="https://doi.org/10.1103/PhysRevA.79.052329"
              note="Introduction of the AFC protocol: M = Γ_inhom/Δ temporal modes stored with efficiency η = η₀ exp(−d/F²). First demonstrated in Nd³⁺:YVO₄ with M > 1000 modes simultaneously." />
            <Ref n={4} authors="Lvovsky, A. I., Sanders, B. C. &amp; Tittel, W." year={2009}
              title="Optical quantum memory"
              journal="Nature Photonics 3, 706"
              doi="https://doi.org/10.1038/nphoton.2009.231"
              note="Review of optical quantum memory protocols and state of the art benchmarks. Defines the benchmark trio: efficiency, storage bandwidth, multi-mode capacity — the three axes by which memory quality is judged." />
            <Ref n={5} authors="Pou, T. R." year={2026}
              title="The Memory — Quantum State Storage and the Persistent Ψ Register"
              journal={`NexusOS Research, ${BASE}, AGPL-3.0. First disclosure ${PAGE_DATE}.`}
              note="Act 14 of the NexusOS physics sequence. Derives the SNIC memory specification from the Bloch constraint T₂ ≤ 2T₁, AFC multi-mode capacity M = Γ_inhom/Δ, and the entanglement-distribution requirement T₂ ≫ L/c." />
          </div>
        </Section>

        {/* ── Bottom sequence nav + teaser ──────────────────────────── */}
        <div className="rounded-xl border p-4 mt-6"
          style={{ borderColor: FU + "20", background: FU + "08" }}>
          <SequenceNav current={14} />
          <div className="border-t border-slate-800 pt-3 mt-4 text-center">
            <p className="text-[10px] font-mono text-slate-600 tracking-widest mb-1">
              NEXT — ACT 15 OF ?
            </p>
            <p className="text-slate-500 text-xs">
              The Entangler · Bell state distribution · |Φ⁺⟩ = (|00⟩ + |11⟩)/√2
            </p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[10px] font-mono text-slate-600">
            {BASE}/the-memory · AGPL-3.0 · NexusOS Research · Te Rata Pou · {PAGE_DATE}
          </p>
        </div>
      </div>
    </div>
  );
}
