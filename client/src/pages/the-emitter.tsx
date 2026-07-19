import { useState, useEffect, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ExternalLink, Waves, Zap, Activity, Radio,
  Layers, Lightbulb, Timer, BarChart2,
} from "lucide-react";

// ── Physics constants ─────────────────────────────────────────────────────────
const H_PLANCK  = 6.626e-34;   // J·s
const C_LIGHT   = 2.998e8;     // m/s
const PAGE_DATE = "2026-07-19";
const BASE      = "https://wnsp.io";

// ── Purcell factor: F_p = (3/4π²)(λ_0/n)³ × (Q/V) ──────────────────────────
function purcellFactor(Q: number, V_um3: number, lambda_nm: number, n: number): number {
  const lambda_m = lambda_nm * 1e-9;
  const V_m3    = V_um3 * 1e-18;
  const lambda_n = lambda_m / n;           // wavelength in medium
  return (3 / (4 * Math.PI ** 2)) * Math.pow(lambda_n, 3) * (Q / V_m3);
}

// ── β-factor: fraction of photons emitted into cavity mode ───────────────────
function betaFactor(Fp: number, gamma0: number, gammaLeak: number): number {
  const enhanced = Fp * gamma0;
  return enhanced / (enhanced + gammaLeak);
}

// ── Emission lifetime: τ = 1 / ((1 + Fp) × γ₀) ──────────────────────────────
function lifetimeNs(Fp: number, gamma0_MHz: number): number {
  return 1000 / ((1 + Fp) * gamma0_MHz);   // nanoseconds (1 ns = 1000 / MHz)
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = "#0ea5e9", children }: {
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

function Eq({ children, color = "#38bdf8" }: { children: ReactNode; color?: string }) {
  return (
    <code className="text-[11px] font-mono px-2 py-0.5 rounded"
      style={{ background: color + "20", color }}>{children}</code>
  );
}

function Ref({ n, authors, year, title, journal, doi, note }: {
  n: number; authors: string; year: string | number; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 font-mono w-5 flex-shrink-0">[{n}]</span>
      <div>
        <span className="text-slate-400">{authors} ({year}). </span>
        {doi
          ? <a href={doi} target="_blank" rel="noopener noreferrer"
               className="text-sky-400 hover:text-sky-300 italic">{title}</a>
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
    <div className="rounded-xl border p-4"
      style={{ borderColor: color + "40", background: color + "10" }}>
      <p className="text-xs mb-2" style={{ color }}>{label}</p>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

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
];

function SequenceNav({ current }: { current: 11 }) {
  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
      <p className="text-[10px] font-mono text-sky-400 tracking-widest mb-3">
        THE SEQUENCE — ACT {current} OF 12
      </p>
      <div className="grid grid-cols-3 md:grid-cols-12 gap-1.5 text-center text-xs">
        {ACT_NAV.map(({ act, title, sub, href }) => (
          <Link key={href} href={href}
                className="rounded-lg border border-slate-700 bg-slate-900 p-1.5
                           hover:border-slate-500 transition-colors space-y-0.5 block">
            <p className="text-[7px] font-mono text-slate-500 tracking-widest">ACT {act}</p>
            <p className="text-slate-300 font-medium leading-tight text-[8px]">{title}</p>
            <p className="text-[7px] text-slate-500">{sub}</p>
          </Link>
        ))}
        <div className="rounded-lg border border-sky-500/50 bg-sky-500/15 p-1.5 space-y-0.5">
          <p className="text-[7px] font-mono text-sky-300 tracking-widest">ACT 11 ← HERE</p>
          <p className="text-sky-100 font-medium leading-tight text-[8px]">The Emitter</p>
          <p className="text-[7px] text-sky-400">F_p=(3λ³/4π²n³)(Q/V)</p>
        </div>
        <Link href="/the-network"
              className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-1.5
                         hover:border-teal-400/60 transition-colors space-y-0.5 block">
          <p className="text-[7px] font-mono text-teal-400 tracking-widest">ACT 12 →</p>
          <p className="text-teal-200 font-medium leading-tight text-[8px]">The Network</p>
          <p className="text-[7px] text-teal-400">ω=ω₀−2J·cos(ka)</p>
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TheEmitterPage() {
  const [tick, setTick] = useState(0);
  const [Q,          setQ]         = useState(10000);
  const [V_um3,      setVUm3]      = useState(1.0);
  const [lambda_nm,  setLambdaNm]  = useState(640);
  const [n_idx,      setNIdx]      = useState(1.5);
  const [gamma0,     setGamma0]    = useState(1);     // MHz
  const [gammaLeak,  setGammaLeak] = useState(10);    // MHz

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1400);
    return () => clearInterval(id);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const Fp     = purcellFactor(Q, V_um3, lambda_nm, n_idx);
  const beta   = betaFactor(Fp, gamma0, gammaLeak);
  const tauFree_ns    = 1000 / gamma0;             // ns
  const tauCavity_ns  = lifetimeNs(Fp, gamma0);   // ns
  const speedup       = tauFree_ns / tauCavity_ns; // = 1 + Fp
  const gammaEff_MHz  = (1 + Fp) * gamma0;

  // Cooperativity (bridge to Act 10)
  // C = Fp / 4 in the weak-coupling limit: g²/(κγ) = Fp/4
  const cooperativity = Fp / 4;

  // Purcell-enhanced photon energy at cavity wavelength
  const f_Hz    = C_LIGHT / (lambda_nm * 1e-9);
  const E_eV    = (H_PLANCK * f_Hz) / 1.602e-19;

  const fmtFp   = (v: number) => v >= 1e6 ? `${(v/1e6).toExponential(2)}M`
                                 : v >= 1e3 ? `${(v/1e3).toFixed(1)}k`
                                 : v.toFixed(1);
  const fmtT    = (v: number) => v < 1 ? `${(v*1000).toFixed(1)} ps`
                                : v < 1000 ? `${v.toFixed(2)} ns`
                                : `${(v/1000).toFixed(2)} μs`;

  // Animated emission pulse for hero
  const pulse = (tick % 6) / 6;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header badges ─────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 11 of 11",             color: "#0ea5e9" },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#fb923c" },
              { label: "AGPL-3.0",                  color: "#fb923c" },
              { label: "F_p = (3λ³/4π²n³)(Q/V)",   color: "#0ea5e9" },
              { label: "β → 1 ideal",               color: "#10b981" },
              { label: "τ_eff = τ₀/(1+Fp)",         color: "#a78bfa" },
            ].map(({ label, color }) => (
              <span key={label} className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: color + "25", color, border: `1px solid ${color}40` }}>
                {label}
              </span>
            ))}
          </div>

          <SequenceNav current={11} />

          {/* Back arrow + title */}
          <div className="flex items-start gap-3">
            <Link href="/polariton-exchange">
              <button className="text-gray-500 hover:text-white transition-colors mt-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest">
                NEXUSOS RESEARCH · TE RATA POU · {PAGE_DATE} ·{" "}
                <a href="https://github.com/nexusosdaily-code/NexusOS"
                   target="_blank" rel="noopener noreferrer"
                   className="text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1">
                  github.com/nexusosdaily-code/NexusOS
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <h1 className="text-3xl font-bold text-white tracking-tight mt-1">
                The Emitter
              </h1>
              <p className="text-slate-400 text-base mt-1">
                Spontaneous emission is not intrinsic to the atom — it is a property of the
                electromagnetic environment. Place an emitter inside a resonant Ψ channel cavity
                and the decay rate accelerates by the Purcell factor. The cavity becomes a
                directional single-photon source
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero equation panel ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-sky-700/30 bg-sky-950/20 p-6 mb-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute rounded-full border border-sky-400"
                style={{
                  width:  `${30 + i * 15}%`,
                  height: `${30 + i * 15}%`,
                  top:    "50%",
                  left:   "50%",
                  transform: `translate(-50%, -50%) scale(${0.5 + 0.4 * Math.abs(Math.sin(pulse * Math.PI + i * 0.7))})`,
                  opacity: 0.2 + 0.15 * Math.abs(Math.sin(pulse * Math.PI * 2 + i)),
                  transition: "all 1.4s ease-in-out",
                }}
              />
            ))}
          </div>
          <div className="relative space-y-3">
            <div className="text-2xl font-mono font-bold text-sky-300">
              F_p = (3 / 4π²) · (λ/n)³ · Q / V
            </div>
            <div className="text-sm text-gray-400">
              Purcell factor&nbsp;·&nbsp;λ = free-space wavelength&nbsp;·&nbsp;n = refractive index&nbsp;·&nbsp;Q = cavity quality factor&nbsp;·&nbsp;V = mode volume
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500 mt-2">
              <span>γ_eff = (1 + F_p) γ₀ &nbsp;·&nbsp; enhanced decay rate</span>
              <span>β = F_p γ₀ / (F_p γ₀ + γ_leak) &nbsp;·&nbsp; channel efficiency</span>
              <span>C = F_p / 4 &nbsp;·&nbsp; cooperativity (Act 10 bridge)</span>
            </div>
          </div>
        </div>

        {/* ── Live metric cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MetricCard label="Purcell Factor F_p" value={fmtFp(Fp)}
            sub="decay rate enhancement" color="#0ea5e9" />
          <MetricCard label="β-Factor"  value={`${(beta * 100).toFixed(1)}%`}
            sub="photons into Ψ channel" color="#10b981" />
          <MetricCard label="τ_cavity"  value={fmtT(tauCavity_ns)}
            sub={`vs τ_free = ${fmtT(tauFree_ns)}`} color="#a78bfa" />
          <MetricCard label="Cooperativity C" value={cooperativity.toFixed(2)}
            sub="g²/(κγ) = F_p/4 — Act 10 link" color="#f59e0b" />
        </div>

        {/* ── §1 — Purcell Effect ────────────────────────────────────────── */}
        <Section title="§1 — The Purcell Effect (1946)" icon={Lightbulb} color="#0ea5e9">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            In 1946, E.M. Purcell showed in a single paragraph that the spontaneous emission
            rate of a nuclear magnetic moment placed inside a resonant cavity could be enhanced
            by a factor now bearing his name. The insight is profound: spontaneous emission is
            not a fixed property of the emitter — it is a response to the local density of
            optical states (LDOS) in the surrounding electromagnetic environment.
          </p>
          <div className="rounded-lg bg-slate-800 p-4 font-mono text-sm text-center mb-4">
            <p className="text-sky-300">ρ(ω) ∝ Q/V &nbsp;·&nbsp; F_p = ρ_cavity(ω) / ρ_free(ω)</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Local density of optical states governs how fast the emitter can decay
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            {[
              {
                term: "Q / V",
                name: "The figure of merit",
                desc: "High Q means photons stay long in the cavity, concentrating the LDOS. Small V means the vacuum field is intense where the emitter sits. Both drive F_p up.",
              },
              {
                term: "(λ/n)³",
                name: "Diffraction volume",
                desc: "The wavelength in the medium sets the minimum physical volume over which the field can be confined. F_p is the ratio of cavity V to this natural volume.",
              },
              {
                term: "3 / 4π²",
                name: "Geometric prefactor",
                desc: "Averaged over all emitter dipole orientations and positions in the mode. For an optimally aligned emitter at a field antinode, the prefactor is 6/π² ≈ 2×.",
              },
            ].map(t => (
              <div key={t.term} className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                <code className="text-sky-300 font-mono text-sm font-bold block mb-2">{t.term}</code>
                <p className="text-[11px] font-semibold text-white mb-1">{t.name}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="text-sky-300 font-semibold">Key insight: </span>
              Fermi's Golden Rule gives the transition rate as Γ = (2π/ℏ)|⟨f|V|i⟩|² ρ(ω).
              The matrix element |⟨f|V|i⟩|² depends on the emitter. ρ(ω) — the density of
              states at frequency ω — depends entirely on the cavity. The Purcell effect is
              the engineering of ρ(ω). Place the emitter in a resonant Ψ channel, and ρ(ω)
              spikes by F_p. The emitter decays F_p times faster into that channel.
            </p>
          </div>
        </Section>

        {/* ── §2 — Purcell Factor Calculator ────────────────────────────── */}
        <Section title="§2 — Purcell Factor Calculator  F_p = (3/4π²)(λ/n)³(Q/V)" icon={BarChart2} color="#0ea5e9">
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div className="space-y-4">
              {[
                { label: "Quality factor Q",      unit: "",   min: 100,   max: 1e7,  step: 100,   val: Q,         set: setQ,         fmt: (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}k` : `${v}` },
                { label: "Mode volume V",         unit: "μm³", min: 0.001, max: 100,  step: 0.001, val: V_um3,     set: setVUm3,      fmt: (v: number) => `${v}` },
                { label: "Wavelength λ",          unit: "nm",  min: 380,   max: 780,  step: 5,     val: lambda_nm, set: setLambdaNm,  fmt: (v: number) => `${v}` },
                { label: "Refractive index n",    unit: "",   min: 1.0,   max: 3.5,  step: 0.05,  val: n_idx,     set: setNIdx,      fmt: (v: number) => `${v}` },
              ].map(({ label, unit, min, max, step, val, set, fmt }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-sky-300 font-mono">{fmt(val)}{unit && ` ${unit}`}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step}
                    value={val} onChange={e => set(Number(e.target.value))}
                    className="w-full accent-sky-500" />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-800 p-4 space-y-2">
                <p className="text-[10px] font-mono text-slate-500 tracking-widest">COMPUTED VALUES</p>
                {[
                  { label: "F_p",            value: Fp.toFixed(2),                      color: "#38bdf8" },
                  { label: "Speedup",        value: `${speedup.toFixed(2)}×`,            color: "#a78bfa" },
                  { label: "γ_eff",          value: `${gammaEff_MHz.toExponential(3)} MHz`, color: "#10b981" },
                  { label: "τ_cavity",       value: fmtT(tauCavity_ns),                 color: "#a78bfa" },
                  { label: "Photon energy",  value: `${E_eV.toFixed(3)} eV`,            color: "#fb923c" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{label}</span>
                    <span style={{ color }} className="font-bold">{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                <p className="text-[10px] font-mono text-sky-400 tracking-widest mb-2">REGIME</p>
                <p className="text-xs text-white font-semibold mb-1">
                  {Fp < 1   ? "Inhibited emission (F_p < 1)"
                   : Fp < 10  ? "Mild Purcell enhancement"
                   : Fp < 100 ? "Strong Purcell effect"
                   : Fp < 1e4 ? "High-Q photonic cavity"
                   : "Photonic crystal / ultrasmall cavity"}
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {Fp < 1   ? "The cavity suppresses emission. Kleppner (1981) showed both enhancement and inhibition are possible."
                   : Fp < 10  ? "Useful for LED efficiency improvement. τ reduced modestly."
                   : Fp < 100 ? "Single-photon source territory. β > 90% achievable."
                   : Fp < 1e4 ? "Near-perfect single-photon sources. State of the art ~2020."
                   : "Approaching ultrastrong coupling onset. Verify g < κ to stay in Purcell regime."}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Fp bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>F_p = 0</span>
              <span className="text-sky-300">{fmtFp(Fp)}</span>
              <span>F_p = 10⁶</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (Math.log10(Math.max(1, Fp)) / 6) * 100)}%`,
                  background: "linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)",
                }} />
            </div>
            <p className="text-[9px] text-slate-600 text-right font-mono">
              (log scale: 10⁰ → 10⁶)
            </p>
          </div>
        </Section>

        {/* ── §3 — β-Factor and Single-Photon Efficiency ────────────────── */}
        <Section title="§3 — β-Factor and Single-Photon Efficiency" icon={Radio} color="#0ea5e9">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Not every photon emitted by the Purcell-enhanced emitter goes into the target Ψ
            channel. Competing loss channels — surface scattering, absorption, emission into
            other modes — drain away a fraction (1 − β) of the photons. The β-factor is the
            fraction captured usefully by the Ψ channel.
          </p>
          <div className="rounded-lg bg-slate-800 p-4 font-mono text-sm text-center mb-4">
            <p className="text-sky-300">β = F_p γ₀ / (F_p γ₀ + γ_leak)</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-4">
              {[
                { label: "γ₀ — free-space decay rate", unit: "MHz", min: 0.01, max: 100, step: 0.01, val: gamma0,    set: setGamma0 },
                { label: "γ_leak — loss rate",         unit: "MHz", min: 0.1,  max: 500, step: 0.1,  val: gammaLeak, set: setGammaLeak },
              ].map(({ label, unit, min, max, step, val, set }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-sky-300 font-mono">{val} {unit}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step}
                    value={val} onChange={e => set(Number(e.target.value))}
                    className="w-full accent-sky-500" />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-[10px] font-mono text-emerald-400 tracking-widest mb-2">β-FACTOR</p>
                <p className="text-4xl font-bold font-mono text-emerald-300 mb-1">
                  {(beta * 100).toFixed(1)}%
                </p>
                <div className="h-2 rounded-full bg-slate-800 mt-2">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${beta * 100}%` }} />
                </div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Into Ψ channel</span>
                  <span className="text-emerald-300">{(beta * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lost to γ_leak</span>
                  <span className="text-rose-400">{((1-beta)*100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">g²(0) purity</span>
                  <span className="text-sky-300">0 (ideal single-photon)</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 p-3">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              At β = 1 the Ψ channel is a perfect single-photon source: every excitation of the
              emitter produces exactly one photon into the channel, on demand. The second-order
              coherence g⁽²⁾(0) = 0 — antibunching — is the experimental signature.
              Modern photonic crystal nanocavities demonstrate β &gt; 0.98 in the laboratory.
            </p>
          </div>
        </Section>

        {/* ── §4 — Lifetime Compression ─────────────────────────────────── */}
        <Section title="§4 — Lifetime Compression  τ_eff = τ₀ / (1 + F_p)" icon={Timer} color="#0ea5e9">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The reciprocal of the Purcell-enhanced decay rate gives the emission lifetime.
            A large Purcell factor compresses the photon emission window from nanoseconds
            to picoseconds — a crucial feature for high-rate single-photon sources and
            fast optical switching in the Spectral Relay Mesh.
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            {[
              {
                label: "τ_free (no cavity)",
                value: fmtT(tauFree_ns),
                desc: "Natural emission lifetime — determined by the emitter's dipole moment and the free-space LDOS.",
                color: "#64748b",
              },
              {
                label: "τ_cavity (with Purcell)",
                value: fmtT(tauCavity_ns),
                desc: "Cavity-modified lifetime. The emitter decays (1 + F_p) times faster into the resonant mode.",
                color: "#0ea5e9",
              },
              {
                label: "Speedup factor",
                value: `${speedup.toFixed(2)}×`,
                desc: "τ_free / τ_cavity = 1 + F_p. Every photon arrives sooner. Higher repetition rates become possible.",
                color: "#a78bfa",
              },
            ].map(({ label, value, desc, color }) => (
              <div key={label} className="rounded-lg border p-4"
                style={{ borderColor: color + "30", background: color + "08" }}>
                <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-bold font-mono mb-2" style={{ color }}>{value}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2 text-slate-500 font-mono">Cavity type</th>
                  <th className="text-left p-2 text-slate-500 font-mono">Q</th>
                  <th className="text-left p-2 text-slate-500 font-mono">V (μm³)</th>
                  <th className="text-left p-2 text-slate-500 font-mono">F_p (typical)</th>
                  <th className="text-left p-2 text-slate-500 font-mono">τ_eff</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  { type:"Micropillar",     Q:"10,000",  V:"0.3",     Fp:"~50",   tau:"~20 ps" },
                  { type:"WGM microsphere", Q:"10⁸",     V:"~1,000",  Fp:"~200",  tau:"~5 ps" },
                  { type:"Photonic crystal",Q:"10⁶",     V:"0.001",   Fp:"~10⁶",  tau:"~1 fs" },
                  { type:"SNIC Ψ channel",  Q:"10⁵",     V:"~0.1",    Fp:"~5,000",tau:"~200 fs (target)" },
                ].map(({ type, Q: q, V: v, Fp: fp, tau }) => (
                  <tr key={type} className="border-b border-slate-800/60">
                    <td className="p-2 font-semibold text-white">{type}</td>
                    <td className="p-2 font-mono text-slate-400">{q}</td>
                    <td className="p-2 font-mono text-slate-400">{v}</td>
                    <td className="p-2 font-mono text-sky-300">{fp}</td>
                    <td className="p-2 font-mono text-purple-300">{tau}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── §5 — Bridge from Act 10: C = Fp/4 ────────────────────────── */}
        <Section title="§5 — Bridge from Act 10: Cooperativity C = g²/(κγ) = F_p/4" icon={Layers} color="#0ea5e9">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The Purcell effect and the vacuum Rabi splitting of Act 10 are two limits of the
            same Jaynes-Cummings Hamiltonian. The cooperativity C = g²/(κγ) is the single
            parameter that decides which limit applies. Both are determined by the same cavity
            geometry (Q, V) and the same emitter (d, γ).
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-[10px] font-mono text-rose-400 tracking-widest mb-2">
                ACT 10 — STRONG COUPLING (g &gt; κ, γ)
              </p>
              <p className="text-sm font-semibold text-white mb-2">C ≫ 1</p>
              <ul className="text-[10px] text-slate-400 space-y-1">
                <li>• Polariton states |±⟩ form</li>
                <li>• Vacuum Rabi splitting ΔE = 2ℏg observable</li>
                <li>• Reversible oscillation between emitter and cavity</li>
                <li>• Requires ultrasmall V and very high Q</li>
              </ul>
            </div>
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
              <p className="text-[10px] font-mono text-sky-400 tracking-widest mb-2">
                ACT 11 — WEAK COUPLING (g &lt; κ)
              </p>
              <p className="text-sm font-semibold text-white mb-2">C = F_p / 4</p>
              <ul className="text-[10px] text-slate-400 space-y-1">
                <li>• Purcell enhancement of spontaneous emission</li>
                <li>• Irreversible decay — photon emitted and lost to bath</li>
                <li>• β-factor determines channel efficiency</li>
                <li>• Accessible with moderate Q and larger V</li>
              </ul>
            </div>
          </div>
          <div className="rounded-lg bg-slate-800 p-4 space-y-2 font-mono text-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-slate-400">C = g² / (κ · γ)</span>
              <span className="text-slate-600">=</span>
              <span className="text-amber-300">F_p / 4</span>
              <span className="text-slate-600">=</span>
              <span className="text-sky-300">{cooperativity.toFixed(3)}</span>
              <span className="text-slate-500 text-xs">(current calculator values)</span>
            </div>
            <p className="text-[10px] text-slate-500">
              The factor of 4 arises because F_p uses the spatially and orientationally
              averaged LDOS while C uses the maximum coupling strength g for an optimally
              placed, optimally aligned emitter. Same physics — different averaging.
            </p>
          </div>
        </Section>

        {/* ── §6 — WNSP Connection ─────────────────────────────────────── */}
        <Section title="§6 — WNSP Connection: Ψ Channels as Single-Photon Sources" icon={Waves} color="#0ea5e9">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-sky-300 uppercase tracking-widest">
                What Act 11 Inherits
              </p>
              {[
                { act: "Act 1",  link: "/oscillating-quanta",          desc: "Λ = hf/c² — each photon emitted into the Ψ channel has compression state Λ_emit = hf_c/c²." },
                { act: "Act 5",  link: "/universal-address",           desc: "∀ Λ : ∃! Ψ — the emitted photon's wavelength determines its unique Ψ channel address." },
                { act: "Act 9",  link: "/resonance-cavity",            desc: "The WGM cavity provides the Q/V ratio that drives F_p. Smaller V and higher Q → stronger Purcell." },
                { act: "Act 10", link: "/polariton-exchange",          desc: "C = F_p/4 — the Purcell regime is the weak-coupling limit of the Act 10 Jaynes-Cummings exchange." },
              ].map(({ act, link, desc }) => (
                <div key={act} className="flex gap-2 text-xs">
                  <Link href={link}
                    className="text-sky-400 hover:text-sky-300 font-mono w-12 flex-shrink-0 transition-colors">
                    {act}
                  </Link>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-sky-300 uppercase tracking-widest">
                What Act 11 Opens
              </p>
              {[
                { label: "Act 12 — The Network (future)", desc: "Coupled emitters + coupled cavities → CROW waveguides → Spectral Relay Mesh from first principles." },
                { label: "Act 13 — The Observer (future)", desc: "Dispersive coupling χ = g²/Δ → QND readout of a Ψ channel state without absorbing the photon." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-2 text-xs">
                  <span className="text-slate-500 font-mono w-28 flex-shrink-0">{label}</span>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 mt-3">
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  <span className="text-sky-300 font-semibold">In the SNIC hardware:</span>{" "}
                  each Ψ channel's resonator geometry is engineered to achieve F_p ≫ 1 for
                  the target emitter species (quantum dot, NV centre, or rare-earth ion). With
                  β → 1, every clock cycle produces exactly one photon into exactly one
                  orthogonal channel: ⟨Ψᵢ|Ψⱼ⟩ = 0 enforced by the cavity geometry, not
                  software policy.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── §7 — Inhibited Emission (completeness) ────────────────────── */}
        <Section title="§7 — Inhibited Emission: F_p &lt; 1" icon={Activity} color="#0ea5e9">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The Purcell factor can also be less than 1. If the emitter's transition frequency
            falls in the photonic band gap — a frequency range where no cavity modes exist at
            all — spontaneous emission is suppressed entirely. Kleppner (1981) predicted and
            observed this inhibited emission, showing the full two-sided nature of the LDOS
            engineering.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { label: "F_p > 1",   color: "#10b981", title: "Enhanced emission", desc: "Cavity resonance at emitter frequency. LDOS amplified. Photon emitted faster." },
              { label: "F_p = 1",   color: "#64748b", title: "Free-space rate",   desc: "Cavity mode density matches free-space. Net Purcell effect is zero." },
              { label: "F_p < 1",   color: "#f43f5e", title: "Inhibited emission",desc: "Emitter frequency in photonic band gap. LDOS suppressed. Lifetime extended indefinitely." },
            ].map(({ label, color, title, desc }) => (
              <div key={label} className="rounded-lg border p-3"
                style={{ borderColor: color + "30", background: color + "08" }}>
                <code className="font-mono text-sm font-bold block mb-2" style={{ color }}>{label}</code>
                <p className="text-[11px] font-semibold text-white mb-1">{title}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
            In the NexusOS ghost node channel (Act 8): α = 0 because no matter is present
            at that compression lattice coordinate. Inhibited emission is the complementary
            statement: if the electromagnetic environment has no modes at ω_emitter, the
            emitter cannot decay. Ghost node channels are naturally inhibited-emission regions
            for all emitters not resonant with the channel frequency — a structural isolation
            mechanism that reinforces Act 8's lossless channel physics.
          </p>
        </Section>

        {/* ── References ────────────────────────────────────────────────── */}
        <Section title="References" icon={ExternalLink} color="#475569">
          <div className="space-y-3">
            <Ref n={1} authors="Purcell, E. M." year={1946}
              title="Spontaneous emission probabilities at radio frequencies"
              journal="Phys. Rev. 69, 681"
              doi="https://doi.org/10.1103/PhysRev.69.37"
              note="The original one-paragraph abstract. First disclosure of the Purcell factor. The entire field of cavity QED traces to this single page." />
            <Ref n={2} authors="Kleppner, D." year={1981}
              title="Inhibited spontaneous emission"
              journal="Phys. Rev. Lett. 47, 233"
              doi="https://doi.org/10.1103/PhysRevLett.47.233"
              note="Experimental demonstration that spontaneous emission can be suppressed as well as enhanced — the photonic band gap side of the Purcell effect." />
            <Ref n={3} authors="Pelton, M. et al." year={2002}
              title="Efficient source of single photons: a single quantum dot in a micropost microcavity"
              journal="Phys. Rev. Lett. 89, 233602"
              doi="https://doi.org/10.1103/PhysRevLett.89.233602"
              note="First high-efficiency semiconductor single-photon source using the Purcell effect. β > 0.38 demonstrated." />
            <Ref n={4} authors="Lodahl, P. et al." year={2015}
              title="Interfacing single photons and single quantum dots with photonic nanostructures"
              journal="Rev. Mod. Phys. 87, 347"
              doi="https://doi.org/10.1103/RevModPhys.87.347"
              note="Comprehensive review of quantum dot single-photon sources. Modern photonic crystal devices achieve β > 0.98." />
            <Ref n={5} authors="Pou, T. R." year={2026}
              title="The Emitter — Purcell-Enhanced Single-Photon Emission from WNSP Ψ Channels"
              journal={`NexusOS Research, ${BASE}, AGPL-3.0. First disclosure ${PAGE_DATE}.`}
              note="Act 11 of the NexusOS physics sequence. Establishes the Purcell regime as the weak-coupling limit of Act 10, and Ψ channels as engineerable single-photon sources." />
          </div>
        </Section>

        {/* ── Bottom sequence nav + teaser ──────────────────────────────── */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 mt-6">
          <SequenceNav current={11} />
          <div className="border-t border-slate-800 pt-3 mt-4 text-center">
            <p className="text-[10px] font-mono text-slate-600 tracking-widest mb-1">
              NEXT — ACT 13 OF ?
            </p>
            <p className="text-slate-500 text-xs">
              The Observer · QND dispersive readout · χ = g²/Δ — reading the
              photon state without destroying it
            </p>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[10px] font-mono text-slate-600">
            {BASE}/the-emitter · AGPL-3.0 · NexusOS Research · Te Rata Pou · {PAGE_DATE}
          </p>
        </div>
      </div>
    </div>
  );
}
