import { useState, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, ExternalLink, Eye, Activity, Zap, Layers, Radio, BarChart2, GitBranch } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-19";
const BASE      = "https://wnsp.io";
const OR        = "#f97316";   // orange-500

// ── Physics helpers ──────────────────────────────────────────────────────────
const dispersiveShift = (g: number, delta: number) => g * g / delta;
const purcellRate     = (g: number, delta: number, kappa: number) => kappa * (g / delta) ** 2;
const nCrit           = (g: number, delta: number) => delta * delta / (4 * g * g);
const measRate        = (chi: number, nProbe: number, kappa: number) => 4 * chi * chi * nProbe / kappa;
const iqSep           = (chi: number, alpha: number, t: number) =>
  4 * alpha * alpha * Math.sin(chi * t) ** 2;

// ── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = OR, children }: {
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
               className="hover:opacity-80 italic" style={{ color: OR }}>{title}</a>
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
];

function SequenceNav({ current }: { current: 13 }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: OR + "20", background: OR + "08" }}>
      <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: OR }}>
        THE SEQUENCE — ACT {current} OF 14
      </p>
      <div className="grid grid-cols-3 md:grid-cols-14 gap-1.5 text-center text-xs">
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
          style={{ borderColor: OR + "50", background: OR + "15" }}>
          <p className="text-[7px] font-mono tracking-widest" style={{ color: "#fdba74" }}>ACT 13 ← HERE</p>
          <p className="font-medium leading-tight text-[8px]" style={{ color: "#fff7ed" }}>The Observer</p>
          <p className="text-[7px]" style={{ color: OR }}>χ=g²/Δ</p>
        </div>
        <Link href="/the-memory"
              className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-1.5
                         hover:border-fuchsia-400/60 transition-colors space-y-0.5 block">
          <p className="text-[7px] font-mono text-fuchsia-400 tracking-widest">ACT 14 →</p>
          <p className="text-fuchsia-200 font-medium leading-tight text-[8px]">The Memory</p>
          <p className="text-[7px] text-fuchsia-400">T₂≤2T₁</p>
        </Link>
      </div>
    </div>
  );
}

// ── IQ-plane animation ───────────────────────────────────────────────────────
function IQPlane({ chi, alpha }: { chi: number; alpha: number }) {
  const [tNorm, setTNorm] = useState(0);
  const rafRef = useRef<number | null>(null);
  const t0Ref  = useRef<number | null>(null);

  useEffect(() => {
    setTNorm(0);
    t0Ref.current = null;
    const animate = (ts: number) => {
      if (!t0Ref.current) t0Ref.current = ts;
      const elapsed = (ts - t0Ref.current) / 1000;   // seconds
      setTNorm((elapsed * 0.3) % 1);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [chi, alpha]);

  const W = 240; const H = 240;
  const cx = W / 2; const cy = H / 2;
  const scale = 80;
  const chiT = tNorm * Math.PI * 1.8;
  const xUp  =  cx + scale * Math.sin( chiT);
  const yUp  =  cy - scale * Math.cos( chiT);
  const xDn  =  cx + scale * Math.sin(-chiT);
  const yDn  =  cy - scale * Math.cos(-chiT);
  const sep  = Math.sqrt((xUp - xDn) ** 2 + (yUp - yDn) ** 2);
  const r    = 14;

  return (
    <div className="flex flex-col items-center">
      <svg width={W} height={H} className="mx-auto">
        <rect width={W} height={H} rx="8" fill="#0f172a" />
        <line x1={0} y1={cy} x2={W} y2={cy} stroke="#1e293b" strokeWidth="0.5" />
        <line x1={cx} y1={0} x2={cx} y2={H} stroke="#1e293b" strokeWidth="0.5" />
        {[0.25, 0.5, 0.75, 1.0].map(f => (
          <circle key={f} cx={cx} cy={cy} r={f * scale} fill="none"
            stroke="#1e293b" strokeWidth="0.5" />
        ))}
        <text x={cx + 4} y={cy - 2} fontSize="8" fill="#334155" fontFamily="monospace">Q</text>
        <text x={W - 12} y={cy + 10} fontSize="8" fill="#334155" fontFamily="monospace">I</text>
        <line x1={cx} y1={cy} x2={xUp} y2={yUp} stroke={OR + "80"} strokeWidth="1" strokeDasharray="3,3" />
        <line x1={cx} y1={cy} x2={xDn} y2={yDn} stroke="#38bdf880" strokeWidth="1" strokeDasharray="3,3" />
        <circle cx={xUp} cy={yUp} r={r} fill={OR + "25"} stroke={OR} strokeWidth="1.5" />
        <text x={xUp} y={yUp + 3} textAnchor="middle" fontSize="9" fill="#fff7ed" fontFamily="monospace">|↑⟩</text>
        <circle cx={xDn} cy={yDn} r={r} fill="#38bdf820" stroke="#38bdf8" strokeWidth="1.5" />
        <text x={xDn} y={yDn + 3} textAnchor="middle" fontSize="9" fill="#e0f2fe" fontFamily="monospace">|↓⟩</text>
        <circle cx={cx} cy={cy} r="4" fill="#475569" />
      </svg>
      <p className="text-[9px] font-mono text-slate-500 mt-1">
        IQ separation: {sep.toFixed(1)}px  ·  phase: {(chiT * 180 / Math.PI).toFixed(0)}°
      </p>
    </div>
  );
}

// ── Cavity transmission SVG ───────────────────────────────────────────────────
function CavityTransmission({ chi, kappa }: { chi: number; kappa: number }) {
  const W = 260; const H = 140;
  const pad = { l: 30, r: 10, t: 10, b: 28 };
  const iw = W - pad.l - pad.r; const ih = H - pad.t - pad.b;
  const N = 200;
  const lorentz = (x: number, center: number, width: number) =>
    (width / 2) ** 2 / ((x - center) ** 2 + (width / 2) ** 2);

  const xRange = Math.max(chi * 4, kappa * 3);
  const pts = (center: number) => Array.from({ length: N }, (_, i) => {
    const x = -xRange + (2 * xRange * i) / (N - 1);
    const y = lorentz(x, center, kappa);
    const px = pad.l + ((x + xRange) / (2 * xRange)) * iw;
    const py = pad.t + ih - y * ih;
    return `${px},${py}`;
  }).join(" ");

  return (
    <svg width={W} height={H} className="w-full max-w-xs mx-auto">
      <rect width={W} height={H} rx="8" fill="#0f172a" />
      <line x1={W/2} y1={pad.t} x2={W/2} y2={pad.t+ih} stroke="#1e293b" strokeWidth="0.5" />
      <line x1={pad.l} y1={pad.t+ih} x2={pad.l+iw} y2={pad.t+ih} stroke="#334155" strokeWidth="0.5" />
      <polyline points={pts(-chi)} fill="none" stroke={OR} strokeWidth="2" />
      <polyline points={pts(+chi)} fill="none" stroke="#38bdf8" strokeWidth="2" />
      <text x={W/2-20} y={H-6} fontSize="7.5" fill="#64748b" fontFamily="monospace">ω−ω_c</text>
      <text x={pad.l+2} y={pad.t+12} fontSize="7" fill={OR} fontFamily="monospace">|↑⟩: ω_c−χ</text>
      <text x={pad.l+2} y={pad.t+22} fontSize="7" fill="#38bdf8" fontFamily="monospace">|↓⟩: ω_c+χ</text>
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TheObserverPage() {
  const [g,      setG]      = useState(100);   // MHz
  const [delta,  setDelta]  = useState(500);   // MHz
  const [kappa,  setKappa]  = useState(10);    // MHz
  const [nProbe, setNProbe] = useState(20);    // photons

  const chi     = dispersiveShift(g, delta);
  const pRate   = purcellRate(g, delta, kappa);
  const ncrit   = nCrit(g, delta);
  const validity = g / delta;
  const gamMeas = measRate(chi, nProbe, kappa);
  const tMeas   = gamMeas > 0 ? 1 / gamMeas : Infinity;
  const gamPhi  = gamMeas / 2;
  const nCritOk = nProbe < ncrit;

  const fmt = (v: number, d = 2) =>
    v === Infinity ? "∞" : Math.abs(v) < 0.001 ? v.toExponential(1) : v.toFixed(d);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Badges ───────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 13 of 13",                color: OR },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#fb923c" },
              { label: "AGPL-3.0",                    color: "#fb923c" },
              { label: "Copyleft",                    color: "#fb923c" },
              { label: "χ = g²/Δ",                    color: OR },
              { label: "QND — non-demolition",         color: "#a78bfa" },
              { label: "Dispersive readout",           color: "#10b981" },
            ].map(({ label, color }) => (
              <span key={label} className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: color + "25", color, border: `1px solid ${color}40` }}>
                {label}
              </span>
            ))}
          </div>

          <SequenceNav current={13} />

          <div className="flex items-start gap-3">
            <Link href="/the-network">
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
                   style={{ color: OR }}>
                  github.com/nexusosdaily-code/NexusOS <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight mt-1">The Observer</h1>
              <p className="text-slate-400 text-base mt-1">
                Acts 9–12 built the channel, trapped, stored, emitted, and propagated the photon.
                This Act asks: how do we <em>read</em> the Ψ channel state without destroying it?
                The answer is quantum non-demolition (QND) dispersive readout — coupling the cavity
                to a qubit so weakly that measuring the cavity frequency reveals the qubit state
                while leaving both photon and qubit intact.
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero equation ─────────────────────────────────────────── */}
        <div className="rounded-2xl border p-6 mb-5 text-center relative overflow-hidden"
          style={{ borderColor: OR + "30", background: OR + "08" }}>
          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
            <Eye className="w-64 h-64" style={{ color: OR }} />
          </div>
          <div className="relative space-y-3">
            <div className="text-2xl font-mono font-bold" style={{ color: "#fdba74" }}>
              χ = g² / Δ
            </div>
            <p className="text-sm text-gray-400">
              Dispersive shift · g = vacuum Rabi coupling · Δ = ω_q − ω_c = qubit-cavity detuning
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
              <span>H_disp = (ω_c + χ σ_z) a†a &nbsp;·&nbsp; dispersive Hamiltonian</span>
              <span>Γ_meas = 4χ²n̄/κ &nbsp;·&nbsp; measurement rate</span>
              <span>n_crit = Δ²/4g² &nbsp;·&nbsp; critical photon number</span>
            </div>
          </div>
        </div>

        {/* ── Live metric cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MetricCard label="χ / 2π (MHz)"      value={fmt(chi)}           sub="dispersive shift"       color={OR} />
          <MetricCard label="Purcell Γ_P (MHz)"  value={fmt(pRate, 3)}      sub="qubit Purcell decay"    color="#a78bfa" />
          <MetricCard label="n_crit (photons)"   value={fmt(ncrit, 0)}      sub="dispersive limit boundary" color="#10b981" />
          <MetricCard label="Γ_meas (MHz)"        value={fmt(gamMeas)}       sub="measurement rate"       color="#f59e0b" />
        </div>

        {/* ── §1 — The Problem of Observation ───────────────────────── */}
        <Section title="§1 — The Problem of Observation" icon={Eye} color={OR}>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Measuring a quantum state generically destroys it. A photon detector absorbs the
            photon; the measurement result is "yes" or "no" — but the photon is gone. For the
            Ψ channel network (Act 12), this is fatal: routing decisions must read channel state
            without removing the information carrier.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-800 p-4 space-y-2 text-xs">
              <p className="font-semibold text-white">Classical measurement</p>
              <p className="text-slate-400">Absorb the photon → count it → state destroyed. Suitable for detectors, not for repeaters or routing nodes.</p>
              <div className="border-t border-slate-700 pt-2 mt-2">
                <p className="font-semibold text-white">QND measurement</p>
                <p className="text-slate-400">Couple the qubit/cavity system so the photon number commutes with the measurement operator. State survives. The Ψ channel is readable and re-transmittable.</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2 text-xs"
              style={{ borderColor: OR + "20", background: OR + "08" }}>
              <p className="font-semibold" style={{ color: OR }}>QND condition</p>
              <p className="text-slate-300 font-mono">[H_meas , n̂] = 0</p>
              <p className="text-slate-400 mt-1">The measurement Hamiltonian must commute with the photon number operator. Dispersive coupling achieves this exactly in the limit g/|Δ| ≪ 1.</p>
              <p className="text-slate-500 mt-2 text-[10px]">
                Blais et al. (2004) proposed dispersive readout as the canonical QND protocol
                for circuit QED. Wallraff et al. (2004) demonstrated it experimentally in the
                same year.
              </p>
            </div>
          </div>
        </Section>

        {/* ── §2 — Dispersive Limit ─────────────────────────────────── */}
        <Section title="§2 — Dispersive Limit of the Jaynes-Cummings Hamiltonian" icon={Layers} color={OR}>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The Jaynes-Cummings model describes a two-level system (qubit) coupled to a single
            cavity mode. When the qubit is far detuned from the cavity (Δ ≫ g), a unitary
            transformation eliminates the direct photon-qubit exchange and reveals the dispersive
            interaction: the cavity frequency shifts by ±χ depending on the qubit state.
          </p>
          <div className="space-y-3 mb-4">
            {[
              {
                label: "Full Jaynes-Cummings",
                eq: "H = ω_c a†a + ω_q/2 σ_z + g(a†σ⁻ + aσ⁺)",
                note: "g = vacuum Rabi coupling; a†σ⁻ = photon creation + qubit de-excitation",
              },
              {
                label: "Dispersive limit (Δ = ω_q − ω_c ≫ g)",
                eq: "H_disp = (ω_c + χ σ_z) a†a + ω̃_q / 2 · σ_z",
                note: "χ = g²/Δ; ω̃_q = ω_q + g²/Δ (Lamb shift)",
              },
              {
                label: "Cavity frequency splits",
                eq: "ω± = ω_c ± χ   for qubit |↑⟩ (−) or |↓⟩ (+)",
                note: "Probing at ω_c + χ is on resonance only for |↓⟩; probing at ω_c − χ only for |↑⟩",
              },
            ].map(({ label, eq, note }) => (
              <div key={label} className="rounded-lg bg-slate-800 p-3">
                <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: OR }}>{label}</p>
                <p className="font-mono text-sm text-white">{eq}</p>
                <p className="text-[10px] text-slate-500 mt-1">{note}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-700 p-3">
            <p className="text-[10px] text-slate-300 leading-relaxed">
              <span className="font-semibold" style={{ color: OR }}>Validity condition: </span>
              g/|Δ| ≪ 1. The approximation breaks down when the probe photon number exceeds the
              critical photon number n_crit = Δ²/(4g²). Beyond n_crit, the dispersive approximation
              fails and the qubit saturates — the cavity can no longer faithfully report the qubit state.
            </p>
          </div>
        </Section>

        {/* ── §3 — Live Dispersive Calculator ───────────────────────── */}
        <Section title="§3 — Live Dispersive Calculator" icon={BarChart2} color={OR}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[
                { label: "Vacuum Rabi coupling g (MHz)", min: 10, max: 300, step: 5, val: g, set: setG },
                { label: "Qubit detuning Δ (MHz)",       min: 100, max: 3000, step: 50, val: delta, set: setDelta },
                { label: "Cavity decay κ (MHz)",          min: 1, max: 100, step: 1, val: kappa, set: setKappa },
              ].map(({ label, min, max, step, val, set }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-mono" style={{ color: OR }}>{val}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step}
                    value={val} onChange={e => set(Number(e.target.value))}
                    className="w-full accent-orange-500" />
                </div>
              ))}
              <div className="rounded-lg bg-slate-800 p-3 space-y-1.5 text-xs font-mono">
                {[
                  { label: "χ = g²/Δ",          value: `${fmt(chi)} MHz`,      color: OR },
                  { label: "g/Δ (must ≪ 1)",     value: validity.toFixed(3),    color: validity < 0.2 ? "#10b981" : "#f43f5e" },
                  { label: "n_crit = Δ²/4g²",    value: `${fmt(ncrit, 0)} photons`, color: "#a78bfa" },
                  { label: "Purcell Γ_P = κ(g/Δ)²", value: `${fmt(pRate, 3)} MHz`, color: "#f59e0b" },
                  { label: "κ/χ (readout ratio)", value: fmt(kappa / chi, 2),   color: "#38bdf8" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
                {validity >= 0.2 && (
                  <p className="text-[9px] text-red-400 pt-1">
                    ⚠ g/Δ = {validity.toFixed(2)} — increase Δ or decrease g for valid dispersive regime
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-2">
                CAVITY TRANSMISSION — TWO PEAKS SPLIT BY 2χ
              </p>
              <CavityTransmission chi={chi} kappa={kappa} />
              <p className="text-[9px] text-slate-600 text-center mt-1">
                Orange peak = |↑⟩ at ω_c − χ · Blue peak = |↓⟩ at ω_c + χ
              </p>
            </div>
          </div>
        </Section>

        {/* ── §4 — IQ-Plane Readout ─────────────────────────────────── */}
        <Section title="§4 — Readout Protocol: IQ-Plane Separation" icon={Activity} color={OR}>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            A coherent probe tone at ω_c drives the cavity. The cavity field evolves as a coherent
            state |α(t)⟩ that rotates in the IQ plane at ω_c. When the qubit is |↑⟩, the cavity
            is detuned by −χ so the field pointer rotates slightly slower, accumulating phase −χt.
            For |↓⟩, it rotates faster by +χ. Measuring the homodyne signal I and Q after time
            T_meas distinguishes the two pointers — without absorbing the intra-cavity photon.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-2">
                ANIMATED IQ PLANE — |↑⟩ VS |↓⟩ POINTER SEPARATION
              </p>
              <IQPlane chi={chi} alpha={Math.sqrt(nProbe)} />
              <div className="flex gap-4 justify-center mt-2 text-[9px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: OR }} />
                  <span className="text-orange-300">qubit |↑⟩</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
                  <span className="text-sky-300">qubit |↓⟩</span>
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-800 p-3 text-xs">
                <p className="font-mono font-bold text-white mb-2">IQ separation formula</p>
                <div className="space-y-1 font-mono">
                  <p className="text-slate-300">D²(t) = 4|α|² sin²(χt)</p>
                  <p className="text-slate-500">|α|² = n̄ = mean intra-cavity photon number</p>
                  <p className="text-slate-500">Optimal readout time: T* = π / (2χ)</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Probe photon number n̄</span>
                  <span className="font-mono" style={{ color: OR }}>{nProbe}</span>
                </div>
                <input type="range" min={1} max={200} step={1}
                  value={nProbe} onChange={e => setNProbe(Number(e.target.value))}
                  className="w-full accent-orange-500" />
                {!nCritOk && (
                  <p className="text-[9px] text-red-400 mt-1">
                    n̄ = {nProbe} exceeds n_crit = {fmt(ncrit, 0)} — dispersive approximation breaks down
                  </p>
                )}
              </div>
              <div className="rounded-lg border p-3 space-y-1.5 text-xs font-mono"
                style={{ borderColor: OR + "20", background: OR + "08" }}>
                {[
                  { label: "Γ_meas = 4χ²n̄/κ",  value: `${fmt(gamMeas)} MHz`, color: OR },
                  { label: "T_meas = 1/Γ_meas",  value: `${fmt(tMeas * 1000, 2)} ns`, color: "#a78bfa" },
                  { label: "T* = π/2χ",          value: `${fmt(Math.PI / (2 * chi * 2 * Math.PI) * 1000, 2)} ns`, color: "#10b981" },
                  { label: "Γ_φ = Γ_meas/2",     value: `${fmt(gamPhi)} MHz`, color: "#f59e0b" },
                  { label: "n̄ vs n_crit",         value: nCritOk ? "OK ✓" : "EXCEEDED ✗", color: nCritOk ? "#10b981" : "#f43f5e" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── §5 — Measurement Back-Action ──────────────────────────── */}
        <Section title="§5 — Measurement Rate and Quantum Back-Action" icon={Zap} color={OR}>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The Heisenberg uncertainty principle governs the measurement-disturbance tradeoff.
            In dispersive readout, Gambetta et al. (2006) showed that the measurement-induced
            dephasing rate exactly saturates the quantum Cramér-Rao bound:
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: OR }}>
                  QUANTUM LIMIT FOR QND READOUT
                </p>
                <div className="space-y-2 font-mono text-sm">
                  <p className="text-white">Γ_meas = 4χ²n̄ / κ</p>
                  <p className="text-slate-400 text-xs">measurement rate</p>
                  <p className="text-white mt-2">Γ_φ = Γ_meas / 2</p>
                  <p className="text-slate-400 text-xs">qubit dephasing rate (quantum limit)</p>
                  <p className="text-slate-500 text-[10px] mt-2">
                    The factor of 2 is exact — a consequence of the uncertainty principle. To measure
                    faster (larger Γ_meas), you must dephase faster (larger Γ_φ). There is no free lunch.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: "Increase n̄",
                  effect: "Γ_meas ∝ n̄ — faster measurement",
                  cost:   "Γ_φ ∝ n̄ — faster dephasing; n̄ must stay below n_crit",
                  color: OR,
                },
                {
                  title: "Increase χ",
                  effect: "Γ_meas ∝ χ² — quadratic speedup",
                  cost:   "Purcell Γ_P ∝ (g/Δ)² κ = χ/Δ · κ — increases simultaneously",
                  color: "#a78bfa",
                },
                {
                  title: "Decrease κ",
                  effect: "Γ_meas ∝ 1/κ — faster measurement",
                  cost:   "Photon ring-down time 1/κ lengthens — slower reset between measurements",
                  color: "#10b981",
                },
              ].map(r => (
                <div key={r.title} className="rounded-lg border p-3"
                  style={{ borderColor: r.color + "30", background: r.color + "08" }}>
                  <p className="font-semibold text-white text-[11px] mb-1">{r.title}</p>
                  <p className="text-[10px] text-slate-300">↑ {r.effect}</p>
                  <p className="text-[10px] text-slate-500">⚠ cost: {r.cost}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── §6 — WNSP Connection ──────────────────────────────────── */}
        <Section title="§6 — WNSP Connection: QND Measurement in the Spectral Network" icon={Radio} color={OR}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-widest" style={{ color: OR }}>
                WHAT ACT 13 INHERITS
              </p>
              {[
                { act: "Act 9",  link: "/resonance-cavity",   desc: "The Ψ channel WGM cavity is the 'cavity' in the dispersive circuit. Its quality factor Q determines κ = ω_c/Q." },
                { act: "Act 10", link: "/polariton-exchange",  desc: "The strong-coupling regime (g > κ) of Act 10 is the precondition for useful dispersive coupling in Act 13." },
                { act: "Act 11", link: "/the-emitter",         desc: "The Purcell-enhanced emitter loads the cavity with the photon to be observed. The Purcell factor F_p and Γ_P must be balanced." },
                { act: "Act 12", link: "/the-network",         desc: "The CROW network routes the photon between Ψ channels. The Observer at each node reads the channel state without stopping the photon." },
              ].map(({ act, link, desc }) => (
                <div key={act} className="flex gap-2 text-xs">
                  <Link href={link} className="font-mono w-12 flex-shrink-0 transition-colors hover:opacity-80"
                    style={{ color: OR }}>{act}</Link>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-widest" style={{ color: OR }}>
                WHAT ACT 13 OPENS
              </p>
              {[
                { label: "Quantum error correction", desc: "QND measurement is the readout primitive for surface codes. Mid-circuit measurement without qubit reset." },
                { label: "Photon routing by state", desc: "A Ψ channel node reads incoming photon state (n=0 or n=1) and routes accordingly — the first spectral switch." },
                { label: "Act 14 (future) — The Memory", desc: "Storing the measured qubit state in a long-lived spin or mechanical mode for deterministic quantum memory." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-2 text-xs">
                  <span className="text-slate-500 font-mono text-[9px] w-28 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
              <div className="rounded-lg border p-3 mt-2"
                style={{ borderColor: OR + "20", background: OR + "08" }}>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  <span className="font-semibold" style={{ color: "#fdba74" }}>SNIC target: </span>
                  each SNIC node integrates a dispersive readout circuit adjacent to the WGM resonator.
                  χ/2π ~ 5 MHz, κ/2π ~ 10 MHz, n̄ ~ 5 photons gives Γ_meas/2π ~ 50 kHz → T_meas ~ 20 μs.
                  This is compatible with photon lifetimes in high-Q (Q ~ 10⁸) WGM resonators.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-800 p-4">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-2">
              ACT 13 DESIGN PARAMETERS — WNSP SNIC NODE
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { param: "χ/2π",         value: "~5 MHz",      basis: "g²/Δ; g~100 MHz, Δ~2 GHz" },
                { param: "κ/2π",         value: "~10 MHz",     basis: "cavity Q ~ ω_c/κ ~ 10⁸" },
                { param: "n_crit",       value: "~100 photons", basis: "Δ²/4g² at above parameters" },
                { param: "T_meas",       value: "~20 μs",      basis: "1/Γ_meas at n̄=5" },
              ].map(({ param, value, basis }) => (
                <div key={param} className="rounded border border-slate-700 p-2">
                  <p className="font-mono font-bold text-white text-xs">{param}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: OR }}>{value}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{basis}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── References ────────────────────────────────────────────── */}
        <Section title="References" icon={ExternalLink} color="#475569">
          <div className="space-y-3">
            <Ref n={1} authors="Blais, A. et al." year={2004}
              title="Cavity quantum electrodynamics for superconducting electrical circuits: An architecture for quantum computation"
              journal="Phys. Rev. A 69, 062320"
              doi="https://doi.org/10.1103/PhysRevA.69.062320"
              note="First proposal for dispersive readout in circuit QED. Derived χ = g²/Δ and the dispersive Hamiltonian. Foundational for all subsequent superconducting qubit architectures." />
            <Ref n={2} authors="Wallraff, A. et al." year={2004}
              title="Strong coupling of a single photon to a superconducting qubit using circuit quantum electrodynamics"
              journal="Nature 431, 162"
              doi="https://doi.org/10.1038/nature02851"
              note="First experimental demonstration of dispersive QND readout. Strong coupling g > (κ, γ) achieved. Published simultaneously with [1] — theory and experiment in the same week." />
            <Ref n={3} authors="Gambetta, J. et al." year={2006}
              title="Qubit-photon interactions in a cavity: Measurement-induced dephasing and number splitting"
              journal="Phys. Rev. A 74, 042318"
              doi="https://doi.org/10.1103/PhysRevA.74.042318"
              note="Derived the measurement rate Γ_meas = 4χ²n̄/κ and showed Γ_φ = Γ_meas/2 exactly saturates the quantum Cramér-Rao bound. Defined the critical photon number n_crit = Δ²/(4g²)." />
            <Ref n={4} authors="Krantz, P. et al." year={2019}
              title="A quantum engineer's guide to superconducting qubits"
              journal="Appl. Phys. Rev. 6, 021318"
              doi="https://doi.org/10.1063/1.5089550"
              note="Comprehensive review. Chapter 4 covers dispersive readout, IQ-plane measurement, signal-to-noise, and Purcell engineering. Essential reference for SNIC hardware design." />
            <Ref n={5} authors="Pou, T. R." year={2026}
              title="The Observer — QND Dispersive Readout and the Non-Demolition Ψ Channel Register"
              journal={`NexusOS Research, ${BASE}, AGPL-3.0. First disclosure ${PAGE_DATE}.`}
              note="Act 13 of the NexusOS physics sequence. Applies dispersive QND measurement theory to the WNSP Ψ channel architecture. Defines SNIC dispersive readout parameters and derives the Ψ-channel observer condition." />
          </div>
        </Section>

        {/* ── Bottom sequence nav + teaser ──────────────────────────── */}
        <div className="rounded-xl border p-4 mt-6"
          style={{ borderColor: OR + "20", background: OR + "08" }}>
          <SequenceNav current={13} />
          <div className="border-t border-slate-800 pt-3 mt-4 text-center">
            <p className="text-[10px] font-mono text-slate-600 tracking-widest mb-1">
              NEXT — ACT 14
            </p>
            <p className="text-slate-500 text-xs">
              <a href="/the-memory" style={{ color: "#d946ef" }} className="hover:opacity-80">The Memory →</a>
              {" "}· Long-lived quantum state storage · T₂ ≤ 2T₁
            </p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[10px] font-mono text-slate-600">
            {BASE}/the-observer · AGPL-3.0 · NexusOS Research · Te Rata Pou · {PAGE_DATE}
          </p>
        </div>
      </div>
    </div>
  );
}
