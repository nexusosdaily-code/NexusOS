import { useState, useEffect, type ElementType, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ExternalLink, Waves, Zap, Activity, GitBranch,
  RefreshCw, Cpu, Layers, Radio,
} from "lucide-react";
import { ActSequenceNav } from "@/components/act-sequence-nav";
import { colorMetricCard, colorText400 } from "@/lib/color-classes";

// ── Physics constants ─────────────────────────────────────────────────────────
const C_LIGHT  = 2.998e8;     // m/s
const H_PLANCK = 6.626e-34;   // J·s
const HBAR     = 1.0546e-34;  // J·s
const EPS0     = 8.854e-12;   // F/m
const DEBYE    = 3.336e-30;   // C·m per Debye
const PAGE_DATE = "2026-07-19";
const BASE      = "https://wnsp.io";

// ── Single-photon coupling strength: g = d·√(ω_c / 2ℏε₀V) ──────────────────
function couplingStrengthMHz(
  d_debye: number,
  fc_THz: number,
  V_um3: number,
): number {
  const d_SI   = d_debye * DEBYE;
  const omega_c = 2 * Math.PI * fc_THz * 1e12;
  const V_m3   = V_um3 * 1e-18;
  const g_rads = d_SI * Math.sqrt(omega_c / (2 * HBAR * EPS0 * V_m3));
  return g_rads / (2 * Math.PI) / 1e6; // MHz
}

// ── Polariton compression states: Λ_± = h(f_c ± g/2π) / c² ─────────────────
function polaritonLambda(fc_THz: number, g_MHz: number) {
  const fPlus_Hz  = fc_THz * 1e12 + g_MHz * 1e6;
  const fMinus_Hz = fc_THz * 1e12 - g_MHz * 1e6;
  return {
    fPlus_THz:     fPlus_Hz  / 1e12,
    fMinus_THz:    fMinus_Hz / 1e12,
    lambdaPlus_kg: (H_PLANCK * fPlus_Hz)  / (C_LIGHT * C_LIGHT),
    lambdaMinus_kg:(H_PLANCK * fMinus_Hz) / (C_LIGHT * C_LIGHT),
    nmPlus:        (C_LIGHT / fPlus_Hz)   * 1e9,
    nmMinus:       (C_LIGHT / fMinus_Hz)  * 1e9,
  };
}

// ── Coupling regime classification ────────────────────────────────────────────
type Regime = "ultrastrong" | "strong" | "dispersive" | "weak";
function classifyRegime(g: number, kappa: number, gamma: number, delta: number): Regime {
  if (g > 0.1 * (kappa + gamma) * 100) return "ultrastrong"; // g ~ omega
  if (g > kappa && g > gamma)          return "strong";
  if (Math.abs(delta) > 5 * g)         return "dispersive";
  return "weak";
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color = "#f43f5e", children }: {
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

// ── Equation chip ─────────────────────────────────────────────────────────────
function Eq({ children, color = "#fb7185" }: { children: React.ReactNode; color?: string }) {
  return (
    <code className="text-[11px] font-mono px-2 py-0.5 rounded"
      style={{ background: color + "20", color }}>{children}</code>
  );
}

// ── Reference entry ───────────────────────────────────────────────────────────
function Ref({ n, authors, year, title, journal, doi, note }: {
  n: number; authors: string; year: string | number; title: string;
  journal: string; doi?: string; note?: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-slate-500 font-mono w-5 flex-shrink-0">[{n}]</span>
      <div>
        <span className="text-slate-400">{authors} ({year}). </span>
        {doi ? (
          <a href={doi} target="_blank" rel="noopener noreferrer"
             className="text-rose-400 hover:text-rose-300 italic">{title}</a>
        ) : (
          <span className="text-white italic">{title}</span>
        )}
        <span className="text-slate-500">. {journal}</span>
        {note && <p className="text-slate-600 mt-0.5 leading-relaxed">{note}</p>}
      </div>
    </div>
  );
}

// ── Mini oscillation bar ──────────────────────────────────────────────────────
function OscBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-150"
          style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PolaritonExchangePage() {
  const [tick, setTick] = useState(0);
  const [d_debye,  setDDebye]  = useState(5);
  const [fc_THz,   setFcTHz]   = useState(384.6);
  const [V_um3,    setVUm3]    = useState(1.0);
  const [kappa,    setKappa]   = useState(100);
  const [gamma,    setGamma]   = useState(10);
  const [delta,    setDelta]   = useState(0);
  const [rabiRunning, setRabiRunning] = useState(true);
  const [rabiT,    setRabiT]   = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!rabiRunning) return;
    const id = setInterval(() => setRabiT(t => t + 0.05), 80);
    return () => clearInterval(id);
  }, [rabiRunning]);

  // ── Derived physics ─────────────────────────────────────────────────────────
  const g_MHz    = couplingStrengthMHz(d_debye, fc_THz, V_um3);
  const regime   = classifyRegime(g_MHz, kappa, gamma, delta);
  const polariton = polaritonLambda(fc_THz, g_MHz);
  const omegaR   = 2 * g_MHz;                      // MHz
  const deltaE_eV = (2 * HBAR * g_MHz * 1e6 * 2 * Math.PI) / 1.602e-19; // eV

  // Rabi oscillation populations
  const g_rad_ns = g_MHz * 2 * Math.PI * 1e6 * 1e-9; // rad/ns
  const P_emitter = Math.cos(g_rad_ns * rabiT) ** 2;
  const P_cavity  = Math.sin(g_rad_ns * rabiT) ** 2;

  // Animated wave phase for hero panel
  const phase = (tick % 8) / 8;

  const fmtSci = (v: number, d = 3) => v.toExponential(d);
  const fmtMHz = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(2)} GHz`;
    return `${v.toFixed(1)} MHz`;
  };

  const regimeColor: Record<Regime, string> = {
    ultrastrong: "#f59e0b",
    strong:      "#10b981",
    dispersive:  "#06b6d4",
    weak:        "#8b5cf6",
  };
  const regimeLabel: Record<Regime, string> = {
    ultrastrong: "Ultrastrong coupling — g ~ ω_c",
    strong:      "Strong coupling — g > κ, γ  →  polariton formation",
    dispersive:  "Dispersive — Δ ≫ g  →  QND measurement",
    weak:        "Weak coupling — g < κ  →  Purcell enhancement",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header / badges ────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 10 of 10",              color: "#f43f5e" },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#fb923c" },
              { label: "AGPL-3.0",                   color: "#fb923c" },
              { label: "Copyleft",                   color: "#fb923c" },
              { label: "Ω_R = 2g",                   color: "#06b6d4" },
              { label: "ΔE = 2ℏg",                   color: "#10b981" },
              { label: "g > κ, γ",                   color: "#f59e0b" },
            ].map(({ label, color }) => (
              <span key={label} className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: color + "25", color, border: `1px solid ${color}40` }}>
                {label}
              </span>
            ))}
          </div>

          {/* 10-act sequence nav */}
          <ActSequenceNav current={10} />

          {/* Back arrow + title */}
          <div className="flex items-start gap-3">
            <Link href="/resonance-cavity">
              <button className="text-gray-500 hover:text-white transition-colors mt-1" aria-label="Back to The Cavity">
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
                The Exchange
              </h1>
              <p className="text-slate-400 text-base mt-1">
                When cavity coupling strength g exceeds loss rate κ, cavity and emitter hybridise
                into polariton states — the first compression states that are neither pure field
                nor pure matter
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero equation panel ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-rose-700/30 bg-rose-950/20 p-6 mb-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute h-px w-full transition-all duration-[1600ms]"
                style={{
                  top: `${15 + i * 14}%`,
                  background: `linear-gradient(90deg, transparent, #f43f5e, transparent)`,
                  opacity: 0.3 + 0.12 * Math.sin(phase * Math.PI * 2 + i),
                  transform: `scaleX(${0.3 + 0.7 * Math.abs(Math.sin(phase * Math.PI + i * 0.9))})`,
                }}
              />
            ))}
          </div>
          <div className="relative space-y-3">
            <div className="text-2xl font-mono font-bold text-rose-300">
              H = ℏω_c a†a + ℏω_a σ_z/2 + ℏg(a†σ₋ + aσ₊)
            </div>
            <div className="text-sm text-gray-400">
              Jaynes-Cummings Hamiltonian&nbsp;·&nbsp;cavity field + emitter + exchange coupling
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500 mt-2">
              <span>Ω_R = 2g &nbsp;·&nbsp; vacuum Rabi frequency</span>
              <span>ΔE = 2ℏg &nbsp;·&nbsp; polariton splitting</span>
              <span>|±⟩ = (|e,0⟩ ± |g,1⟩)/√2 &nbsp;·&nbsp; dressed states</span>
            </div>
          </div>
        </div>

        {/* ── Live metrics ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Coupling g",    value: fmtMHz(g_MHz),      sub: "single-photon coupling",   icon: Zap,      color: "rose" },
            { label: "Rabi Freq Ω_R", value: fmtMHz(omegaR),     sub: "vacuum Rabi frequency",    icon: Waves,    color: "amber" },
            { label: "Splitting ΔE",  value: `${deltaE_eV.toExponential(2)} eV`, sub: "polariton energy gap", icon: Layers, color: "emerald" },
            { label: "Regime",        value: regime.charAt(0).toUpperCase() + regime.slice(1), sub: regime === "strong" ? "polaritons active" : "adjust g vs κ", icon: Activity, color: regime === "strong" ? "emerald" : regime === "ultrastrong" ? "amber" : "slate" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className={colorMetricCard[color]}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${colorText400[color]}`} />
                <span className={`text-xs ${colorText400[color]}`}>{label}</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">{value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── §1 — Jaynes-Cummings Hamiltonian ──────────────────────────── */}
        <Section title="§1 — The Jaynes-Cummings Hamiltonian" icon={Cpu} color="#f43f5e">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The Jaynes-Cummings model describes a single two-level emitter coupled to one mode of
            the electromagnetic field inside a cavity. It is the exact quantum model for what
            happens inside every Ψ channel when g exceeds the loss rates. Three terms govern the
            whole exchange: the free field energy, the emitter energy, and the coupling — the
            part that cannot be switched off.
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            {[
              { term: "ℏω_c a†a", name: "Cavity field energy", desc: "Number operator a†a counts photons. ω_c is the resonance frequency of the cavity mode — the Ψ channel frequency." },
              { term: "ℏω_a σ_z/2", name: "Emitter energy", desc: "σ_z is the Pauli-Z operator for the two-level system. ω_a is the emitter transition frequency — the natural oscillation of the matter inside." },
              { term: "ℏg(a†σ₋ + aσ₊)", name: "Exchange coupling", desc: "The coupling term: photon creation destroys emitter excitation and vice versa. g is the single-photon coupling strength — the key parameter." },
            ].map(t => (
              <div key={t.term} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <code className="text-rose-300 font-mono text-sm font-bold block mb-2">{t.term}</code>
                <p className="text-[11px] font-semibold text-white mb-1">{t.name}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            The eigenstates of this Hamiltonian in the one-excitation manifold (resonant case ω_c = ω_a):
          </p>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-slate-800 p-4 font-mono text-sm space-y-2">
              <p className="text-emerald-300">|+⟩ = (|e,0⟩ + |g,1⟩) / √2</p>
              <p className="text-[10px] text-slate-500">Upper polariton — symmetric superposition</p>
              <p className="text-emerald-400 text-xs">E₊ = ℏω + ℏg√(n+1)</p>
            </div>
            <div className="rounded-lg bg-slate-800 p-4 font-mono text-sm space-y-2">
              <p className="text-rose-300">|−⟩ = (|e,0⟩ − |g,1⟩) / √2</p>
              <p className="text-[10px] text-slate-500">Lower polariton — antisymmetric superposition</p>
              <p className="text-rose-400 text-xs">E₋ = ℏω − ℏg√(n+1)</p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-300 font-mono mb-1">At n = 0 (zero photons in cavity):</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              The energy split is still <Eq>ΔE = 2ℏg</Eq>. This is the vacuum Rabi splitting — the
              cavity and emitter hybridise with nothing but vacuum field between them. The ZPE floor
              from Act 8 is not passive: it drives physical oscillations.
            </p>
          </div>
        </Section>

        {/* ── §2 — Coupling Strength Calculator ─────────────────────────── */}
        <Section title="§2 — Coupling Strength Calculator  g = d·√(ω_c / 2ℏε₀V)" icon={Zap} color="#f43f5e">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The single-photon coupling strength g determines which regime the system occupies.
            It scales with the dipole moment d of the emitter and inversely with the square root
            of the mode volume V — smaller cavities concentrate the vacuum field, amplifying g.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {[
              { label: "Dipole moment d", unit: "Debye", min: 0.5, max: 20, step: 0.5, val: d_debye, set: setDDebye },
              { label: "Cavity frequency f_c", unit: "THz", min: 100, max: 750, step: 10, val: fc_THz, set: setFcTHz },
              { label: "Mode volume V", unit: "μm³", min: 0.001, max: 100, step: 0.001, val: V_um3, set: setVUm3 },
            ].map(({ label, unit, min, max, step, val, set }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-rose-300 font-mono">{val} {unit}</span>
                </div>
                <input type="range" min={min} max={max} step={step}
                  value={val} onChange={e => set(Number(e.target.value))}
                  className="w-full accent-rose-500" />
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800 p-4 space-y-2">
              <p className="text-[10px] font-mono text-slate-500 tracking-widest">COMPUTED VALUES</p>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">g / 2π</span>
                  <span className="text-rose-300 font-bold">{fmtMHz(g_MHz)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ω_R = 2g</span>
                  <span className="text-amber-300">{fmtMHz(omegaR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ΔE = 2ℏg</span>
                  <span className="text-emerald-300">{deltaE_eV.toExponential(3)} eV</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg p-4 border"
              style={{ borderColor: regimeColor[regime] + "40", background: regimeColor[regime] + "10" }}>
              <p className="text-[10px] font-mono tracking-widest mb-2"
                style={{ color: regimeColor[regime] }}>REGIME INDICATOR</p>
              <p className="text-sm font-bold text-white mb-1">{regime.charAt(0).toUpperCase() + regime.slice(1)} Coupling</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">{regimeLabel[regime]}</p>
            </div>
          </div>
        </Section>

        {/* ── §3 — Regime Classifier ─────────────────────────────────────── */}
        <Section title="§3 — Coupling Regime Classifier  g vs κ vs γ" icon={GitBranch} color="#f43f5e">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Three rates determine which physics dominates. Set κ (cavity loss rate), γ (emitter
            decay rate), and Δ (frequency detuning ω_a − ω_c) to explore which regime applies.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {[
              { label: "κ — cavity loss rate", unit: "MHz", min: 1, max: 500, step: 1, val: kappa, set: setKappa },
              { label: "γ — emitter decay rate", unit: "MHz", min: 1, max: 200, step: 1, val: gamma, set: setGamma },
              { label: "Δ = ω_a − ω_c detuning", unit: "MHz", min: -500, max: 500, step: 10, val: delta, set: setDelta },
            ].map(({ label, unit, min, max, step, val, set }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-rose-300 font-mono">{val} {unit}</span>
                </div>
                <input type="range" min={min} max={max} step={step}
                  value={val} onChange={e => set(Number(e.target.value))}
                  className="w-full accent-rose-500" />
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-4 gap-2">
            {([
              { r: "strong" as Regime,      title: "Strong",      eq: "g > κ, γ",         color: "#10b981", next: "→ Polaritons, Act 11?" },
              { r: "weak" as Regime,        title: "Weak",        eq: "g < κ",            color: "#8b5cf6", next: "→ Purcell, The Emitter" },
              { r: "dispersive" as Regime,  title: "Dispersive",  eq: "Δ ≫ g",            color: "#06b6d4", next: "→ QND, The Observer" },
              { r: "ultrastrong" as Regime, title: "Ultrastrong", eq: "g ~ ω_c",          color: "#f59e0b", next: "→ Counter-rotating terms" },
            ] as const).map(({ r, title, eq, color, next }) => (
              <div key={r} className="rounded-lg p-3 border transition-all"
                style={{
                  borderColor: regime === r ? color + "60" : "#1e293b",
                  background:  regime === r ? color + "15" : "#0f172a",
                }}>
                <p className="text-xs font-bold mb-1" style={{ color: regime === r ? color : "#475569" }}>{title}</p>
                <p className="text-[10px] font-mono mb-2" style={{ color: regime === r ? color + "cc" : "#334155" }}>{eq}</p>
                <p className="text-[9px] text-slate-500">{next}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── §4 — Rabi Oscillation Visualizer ──────────────────────────── */}
        <Section title="§4 — Vacuum Rabi Oscillation  |ψ(t)⟩ = cos(gt)|e,0⟩ − i·sin(gt)|g,1⟩" icon={RefreshCw} color="#f43f5e">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Starting from an excited emitter and empty cavity: the excitation oscillates between
            the two at the Rabi frequency. At t = π/2g the cavity holds the photon; at t = π/g
            the emitter is excited again. This repeats indefinitely — no energy is lost.
          </p>
          <div className="rounded-lg bg-slate-800 p-4 mb-4 font-mono text-sm text-center">
            <p className="text-rose-300">|ψ(t)⟩ = cos(g·t)|e, 0⟩ − i·sin(g·t)|g, 1⟩</p>
          </div>
          <div className="space-y-3 mb-4">
            <OscBar label="P_emitter(t) = cos²(g·t)  — emitter excitation probability" value={P_emitter} color="#f43f5e" />
            <OscBar label="P_cavity(t) = sin²(g·t)   — cavity photon probability" value={P_cavity} color="#06b6d4" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">t = {rabiT.toFixed(1)} ns &nbsp;·&nbsp; g = {fmtMHz(g_MHz)}</span>
            <button onClick={() => setRabiRunning(r => !r)}
              className="px-3 py-1 rounded border border-rose-500/40 text-rose-400 hover:border-rose-400 transition-colors">
              {rabiRunning ? "Pause" : "Resume"}
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-slate-700 p-3">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              P_emitter + P_cavity = cos²(gt) + sin²(gt) = 1 at all times.
              Total excitation is conserved. The exchange is lossless in the ideal strong-coupling
              regime — an electromagnetic perpetual transfer that directly extends Act 8 (The
              Lossless Channel) into the matter-field boundary.
            </p>
          </div>
        </Section>

        {/* ── §5 — Polariton Compression States ─────────────────────────── */}
        <Section title="§5 — Polariton Compression States  Λ_± = h(f_c ± g/2π)/c²" icon={Layers} color="#f43f5e">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            In the WNSP framework, every resonance frequency maps to a unique compression state
            Λ = hf/c². When g &gt; κ, neither f_c nor f_a is the true eigenfrequency — two new
            frequencies emerge. These are two new compression states that exist only in the
            strong-coupling regime: the polariton states.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {[
              {
                label: "Upper Polariton Λ_+",
                fTHz:  polariton.fPlus_THz,
                nm:    polariton.nmPlus,
                kg:    polariton.lambdaPlus_kg,
                color: "#10b981",
                eq:    "f_+ = f_c + g/2π",
              },
              {
                label: "Lower Polariton Λ_−",
                fTHz:  polariton.fMinus_THz,
                nm:    polariton.nmMinus,
                kg:    polariton.lambdaMinus_kg,
                color: "#f43f5e",
                eq:    "f_− = f_c − g/2π",
              },
            ].map(({ label, fTHz, nm, kg, color, eq }) => (
              <div key={label} className="rounded-lg border p-4 space-y-2"
                style={{ borderColor: color + "30", background: color + "08" }}>
                <p className="text-xs font-bold" style={{ color }}>{label}</p>
                <code className="text-[10px] font-mono text-slate-400">{eq}</code>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">f_±</span>
                    <span style={{ color }}>{fTHz.toFixed(4)} THz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">λ_±</span>
                    <span style={{ color }}>{nm.toFixed(3)} nm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Λ_±</span>
                    <span style={{ color }}>{fmtSci(kg)} kg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              The polariton is a new kind of compression state — half-field (Λ_photon), half-matter
              (Λ_emitter). Its effective mass m* = ℏ / (2g · r_c²) sits between the photon mass and
              the emitter mass. It carries inertia and travels slower than c. This is the first
              compression state in the sequence that spans the wave-matter boundary from within.
            </p>
          </div>
        </Section>

        {/* ── §6 — Three Regimes → Three Acts ───────────────────────────── */}
        <Section title="§6 — The Three Regimes and the Acts They Open" icon={Radio} color="#f43f5e">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The Jaynes-Cummings model has three limiting regimes. Each one reveals a different
            physical consequence — and each consequence maps to the next Act in the sequence.
            The Exchange is the common root; all subsequent Acts branch from it.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2 text-slate-500 font-mono">Condition</th>
                  <th className="text-left p-2 text-slate-500 font-mono">Regime</th>
                  <th className="text-left p-2 text-slate-500 font-mono">Physics</th>
                  <th className="text-left p-2 text-slate-500 font-mono">Opens</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  {
                    cond:    "g > κ, γ",
                    regime:  "Strong coupling",
                    physics: "Polariton formation. Energy oscillates between emitter and field at Ω_R = 2g.",
                    opens:   "The Exchange (this Act) — plus Acts on polariton transport (The Network)",
                    color:   "#10b981",
                  },
                  {
                    cond:    "g ≪ κ",
                    regime:  "Weak coupling (Purcell)",
                    physics: "Cavity enhances spontaneous emission. F_p = (3/4π²)(λ/n)³(Q/V).",
                    opens:   "The Emitter — stimulated and spontaneous emission from a Ψ channel",
                    color:   "#8b5cf6",
                  },
                  {
                    cond:    "Δ = ω_a−ω_c ≫ g",
                    regime:  "Dispersive",
                    physics: "Emitter shifts cavity frequency by χ = g²/Δ. No energy exchange — only phase.",
                    opens:   "The Observer — quantum non-demolition measurement through a Ψ channel",
                    color:   "#06b6d4",
                  },
                  {
                    cond:    "g ~ ω_c",
                    regime:  "Ultrastrong coupling",
                    physics: "Counter-rotating terms matter. Ground state entangled. New vacuum physics.",
                    opens:   "Unknown territory — beyond standard Jaynes-Cummings",
                    color:   "#f59e0b",
                  },
                ].map(({ cond, regime, physics, opens, color }) => (
                  <tr key={cond} className="border-b border-slate-800/60">
                    <td className="p-2 font-mono" style={{ color }}>{cond}</td>
                    <td className="p-2 font-semibold text-white">{regime}</td>
                    <td className="p-2 text-slate-400 text-[10px] leading-relaxed">{physics}</td>
                    <td className="p-2 text-[10px] leading-relaxed" style={{ color }}>{opens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── §7 — WNSP Connection ───────────────────────────────────────── */}
        <Section title="§7 — Connection to the NexusOS Sequence" icon={Waves} color="#f43f5e">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-widest">What Act 10 Inherits</p>
              {[
                { act: "Act 1", link: "/oscillating-quanta", desc: "Λ = hf/c² gives both polariton branches their compression state identity." },
                { act: "Act 5", link: "/universal-address",  desc: "∀ Λ : ∃! Ψ — each polariton state Λ_± has a unique Ψ channel address." },
                { act: "Act 8", link: "/lossless-channel",   desc: "The ZPE floor (α=0) is the vacuum field that drives vacuum Rabi splitting." },
                { act: "Act 9", link: "/resonance-cavity",   desc: "The WGM cavity confines the field mode into which the emitter couples." },
              ].map(({ act, link, desc }) => (
                <div key={act} className="flex gap-2 text-xs">
                  <Link href={link}
                    className="text-rose-400 hover:text-rose-300 font-mono w-12 flex-shrink-0 transition-colors">{act}</Link>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-widest">What Act 10 Opens</p>
              {[
                { label: "The Emitter (future)", desc: "Purcell-enhanced emission. Ψ channels become directional photon sources." },
                { label: "The Network (future)",  desc: "Polariton hopping between coupled cavities → CROW → Spectral Relay Mesh from first principles." },
                { label: "The Observer (future)", desc: "Dispersive coupling → χ = g²/Δ phase shift → QND readout of a Ψ channel state." },
              ].map(({ label, desc }) => (
                <div key={label} className="flex gap-2 text-xs">
                  <span className="text-slate-500 font-mono w-28 flex-shrink-0">{label}</span>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="text-rose-300 font-semibold">The wave-matter boundary is a coupling condition, not a categorical divide.</span>{" "}
              The polariton proves this. When g &gt; κ, the distinction between "this is a photon"
              and "this is matter" dissolves — both descriptions are simultaneously wrong and
              simultaneously right. The correct description is the dressed state |±⟩. This is the
              same insight as Act 3 (4 forces = 1 Λ) applied one level deeper: field and matter
              are one system when the coupling is strong enough.
            </p>
          </div>
        </Section>

        {/* ── References ─────────────────────────────────────────────────── */}
        <Section title="References" icon={ExternalLink} color="#475569">
          <div className="space-y-3">
            <Ref n={1} authors="Jaynes, E. T. & Cummings, F. W." year={1963}
              title="Comparison of quantum and semiclassical radiation theories with application to the beam maser"
              journal="Proc. IEEE 51, 89–109"
              doi="https://doi.org/10.1109/PROC.1963.1664"
              note="Original formulation of the Jaynes-Cummings model. The foundational Act 10 equation derives directly from this paper." />
            <Ref n={2} authors="Haroche, S. & Raimond, J. M." year={2006}
              title="Exploring the Quantum: Atoms, Cavities, and Photons"
              journal="Oxford University Press"
              doi="https://doi.org/10.1093/acprof:oso/9780198509141.001.0001"
              note="Definitive treatment of cavity QED and vacuum Rabi splitting experiments." />
            <Ref n={3} authors="Weisbuch, C. et al." year={1992}
              title="Observation of the coupled exciton-photon mode splitting in a semiconductor quantum microcavity"
              journal="Phys. Rev. Lett. 69, 3314"
              doi="https://doi.org/10.1103/PhysRevLett.69.3314"
              note="First observation of vacuum Rabi splitting in a semiconductor cavity — the polariton is experimentally real." />
            <Ref n={4} authors="Blais, A. et al." year={2021}
              title="Circuit quantum electrodynamics"
              journal="Rev. Mod. Phys. 93, 025005"
              doi="https://doi.org/10.1103/RevModPhys.93.025005"
              note="Superconducting qubit implementation of Jaynes-Cummings physics — the strongest coupling regimes achieved to date." />
            <Ref n={5} authors="Pou, T. R." year={2026}
              title="The Exchange — Polariton Formation as the Wave-Matter Boundary Condition"
              journal="NexusOS Research, wnsp.io, AGPL-3.0. First disclosure 2026-07-19."
              note="This page. Act 10 of the NexusOS physics sequence. Establishes that the wave-matter boundary is a coupling condition (g > κ), not a categorical divide." />
          </div>
        </Section>

        {/* ── Bottom sequence nav + teaser ───────────────────────────────── */}
        <ActSequenceNav current={10} />

        {/* ── Footer metadata ─────────────────────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[10px] font-mono text-slate-600">
            {BASE}/polariton-exchange · AGPL-3.0 · NexusOS Research · Te Rata Pou · {PAGE_DATE}
          </p>
        </div>

      </div>
    </div>
  );
}
