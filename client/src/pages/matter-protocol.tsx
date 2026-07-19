import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import {
  ArrowLeft, Zap, Atom, Waves, Radio, FlaskConical,
  AlertTriangle, CheckCircle, Circle, ExternalLink, GitMerge,
} from "lucide-react";

const PAGE_DATE = "2026-07-06";
const REPO      = "https://github.com/nexusosdaily-code/NexusOS";

// ── SI exact constants ─────────────────────────────────────────────────────────
const H  = 6.62607015e-34;    // Planck   J·s
const C  = 299_792_458;       // light    m/s
const EV = 1.602176634e-19;   // eV → J

// ── WNSP ground state ──────────────────────────────────────────────────────────
const F0     = 555e12;                      // 555 THz
const E0     = H * F0;                      // J

// ── Particle octave positions: n = log₂(m·c² / E₀) ───────────────────────────
function octaveOf(massEv: number) {
  return Math.log2((massEv * EV) / E0);
}

const PARTICLES: {
  name: string; symbol: string; massEv: number;
  n: number; color: string; stable: boolean;
}[] = [
  { name: "Electron",  symbol: "e⁻", massEv: 0.511e6,   n: octaveOf(0.511e6),   color: "#38bdf8", stable: true  },
  { name: "Muon",      symbol: "μ⁻", massEv: 105.66e6,  n: octaveOf(105.66e6),  color: "#a78bfa", stable: false },
  { name: "Proton",    symbol: "p⁺", massEv: 938.272e6, n: octaveOf(938.272e6), color: "#22c55e", stable: true  },
  { name: "Neutron",   symbol: "n⁰", massEv: 939.565e6, n: octaveOf(939.565e6), color: "#94a3b8", stable: true  },
];

// ── Transition energy between two octave levels ────────────────────────────────
function deltaE(n1: number, n2: number) { return E0 * (Math.pow(2, n2) - Math.pow(2, n1)); }
function deltaEev(n1: number, n2: number) { return deltaE(n1, n2) / EV; }
function deliveryFreq(n1: number, n2: number) { return F0 * (Math.pow(2, n2) - Math.pow(2, n1)); }

// ── Ψ channel from frequency ───────────────────────────────────────────────────
function psiFromFreq(fHz: number) {
  const nm  = (C / fHz) * 1e9;
  const wdm = Math.max(0, Math.min(255, Math.round(((nm - 380) / 400) * 255)));
  return { nm: nm.toFixed(2), wdm };
}

function fmt(n: number, dp = 2) { return n.toFixed(dp); }
function fmtSci(n: number) {
  if (!isFinite(n) || n === 0) return "0";
  const exp  = Math.floor(Math.log10(Math.abs(n)));
  const mant = n / Math.pow(10, exp);
  return `${mant.toFixed(3)} × 10${sup(exp)}`;
}
function sup(n: number) {
  const d: Record<string, string> = { "-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹" };
  return String(n).split("").map(c => d[c] ?? c).join("");
}
function fmtHz(hz: number) {
  if (hz >= 1e24) return `${fmt(hz / 1e24, 2)} YHz`;
  if (hz >= 1e21) return `${fmt(hz / 1e21, 2)} ZHz`;
  if (hz >= 1e18) return `${fmt(hz / 1e18, 2)} EHz`;
  if (hz >= 1e15) return `${fmt(hz / 1e15, 2)} PHz`;
  if (hz >= 1e12) return `${fmt(hz / 1e12, 2)} THz`;
  if (hz >= 1e9)  return `${fmt(hz / 1e9,  2)} GHz`;
  return `${fmtSci(hz)} Hz`;
}

function Eq({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black/40 border border-slate-700/50 rounded-lg px-5 py-3 font-mono text-sm text-emerald-300 text-center tracking-wide">
      {children}
    </div>
  );
}

function Section({ id, title, icon: Icon, color, badge, children }: {
  id: string; title: string; icon: any; color: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-5">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: color + "44" }}>
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
        <h2 className="text-base font-bold text-slate-100 flex-1">{title}</h2>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
            style={{ color, borderColor: color + "55", background: color + "11" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export default function MatterProtocol() {
  usePageMeta({
    title: "The Mechanism — Controlled Octave Inversion · NexusOS",
    description:
      "Act 4: Matter manipulation as a precise calculation. If matter is a standing wave at octave n, then manipulating matter means delivering ΔE = hf₀(2ⁿ²−2ⁿ¹) at the exact transition frequency via a WNSP Ψ channel. First disclosed 2026-07-06.",
    canonical: "https://wnsp.io/matter-protocol",
    ogTitle: "The Mechanism — Controlled Octave Inversion",
    ogDescription:
      "Matter is a standing wave at octave n. Manipulation = delivering ΔE = hf₀(2ⁿ²−2ⁿ¹) at the exact Ψ channel. Act 4 of the NexusOS physics sequence.",
    twitterTitle: "The Mechanism — Controlled Octave Inversion",
    twitterDescription:
      "Electron at n≈17.8 above f₀. Proton at n≈28.6. ΔE = hf₀(2ⁿ²−2ⁿ¹). The protocol for controlled matter manipulation. NexusOS Act 4.",
  });

  const electronN = PARTICLES[0].n;
  const protonN   = PARTICLES[2].n;

  // Sample transition: electron +1 octave
  const dE_eV   = deltaEev(electronN, electronN + 1);
  const dF_Hz   = deliveryFreq(electronN, electronN + 1);
  const psi     = psiFromFreq(Math.min(dF_Hz, F0 * 255)); // clamp to visible for WDM display

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">

        {/* back */}
        <Link href="/oscillating-quanta" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to First Principles
        </Link>

        {/* header badges */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Act 4 of 5", color: "#f59e0b" },
            { label: "First Disclosure 2026-07-06", color: "#22c55e" },
            { label: "AGPL-3.0", color: "#8b5cf6" },
            { label: "Copyleft", color: "#8b5cf6" },
          ].map(({ label, color }) => (
            <span key={label}
              className="text-[10px] font-mono px-2.5 py-1 rounded-full border"
              style={{ color, borderColor: color + "55", background: color + "11" }}>
              {label}
            </span>
          ))}
        </div>

        {/* title */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            The Mechanism
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Controlled Octave Inversion — Matter Manipulation as a Precise Calculation
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            NexusOS Research · Te Rata Pou · {PAGE_DATE} ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1">
              github.com/nexusosdaily-code/NexusOS <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* sequence nav */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[10px] font-mono text-amber-400 tracking-widest mb-3">THE SEQUENCE — ACT 4 OF 14</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
            {[
              { act: "ACT 1", title: "Theory of Compression States", sub: "Λ = hf/c²",         href: "/oscillating-quanta" },
              { act: "ACT 2", title: "The Universal ONE",            sub: "f₀ derives Λ",        href: "/universal-one" },
              { act: "ACT 3", title: "Unified Compression Theory",   sub: "4 forces = 1 Λ",      href: "/unified-compression-theory" },
            ].map(({ act, title, sub, href }) => (
              <Link key={href} href={href}
                className="rounded-lg border border-slate-700 bg-slate-900 p-3 hover:border-slate-500 transition-colors space-y-1 block">
                <p className="text-[9px] font-mono text-slate-500 tracking-widest">{act}</p>
                <p className="text-slate-300 font-medium leading-tight">{title}</p>
                <p className="text-[9px] text-slate-500">{sub}</p>
              </Link>
            ))}
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
              <p className="text-[9px] font-mono text-amber-400 tracking-widest">ACT 4 ← HERE</p>
              <p className="text-amber-200 font-medium leading-tight">The Mechanism</p>
              <p className="text-[9px] text-amber-400">ΔE = hf₀(2ⁿ²−2ⁿ¹)</p>
            </div>
            {[
              { act: "ACT 5", title: "The Address",          sub: "∀ Λ : ∃! Ψ",            href: "/universal-address" },
              { act: "ACT 6", title: "The Catalogue",        sub: "n = log₂(mc²/E₀)",       href: "/element-catalogue" },
              { act: "ACT 7", title: "The Trap",             sub: "Ψ(+k̂) ⊗ Ψ(−k̂)",       href: "/standing-wave-trap" },
              { act: "ACT 8", title: "The Lossless Channel", sub: "α = 0, C = ZPE floor",    href: "/lossless-channel" },
              { act: "ACT 9",  title: "The Cavity",    sub: "WGM resonance, r_c",  href: "/resonance-cavity" },
              { act: "ACT 10", title: "The Exchange", sub: "Ω_R = 2g",            href: "/polariton-exchange" },
              { act: "ACT 11", title: "The Emitter",  sub: "F_p=(Q/V)(λ/n)³",    href: "/the-emitter" },
              { act: "ACT 12", title: "The Network",  sub: "ω=ω₀−2J·cos(ka)",    href: "/the-network" },
              { act: "ACT 13", title: "The Observer", sub: "χ=g²/Δ",              href: "/the-observer" },
              { act: "ACT 14", title: "The Memory",   sub: "T₂≤2T₁",             href: "/the-memory" },
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

        {/* abstract */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 space-y-3">
          <p className="text-[10px] font-mono text-slate-500 tracking-widest">ABSTRACT</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Acts 1–3 established the governing equation (Λ = hf/c²), derived it from the
            first oscillation f₀, and unified all four forces as expressions of Λ across
            nine octave tiers. Act 4 completes the mechanism. If matter is a standing wave
            at octave n above f₀, then "manipulating matter" is not a metaphysical claim.
            It is the controlled delivery of a precise energy quantum ΔE at a precise
            transition frequency via a WNSP Ψ channel. This document states the equation,
            identifies the delivery mechanism, and lists the measurable predictions that
            make the protocol falsifiable.
          </p>
        </div>

        {/* sections */}
        <div className="space-y-14">

          {/* S1: The Claim */}
          <Section id="the-claim" title="1. The Claim — Made Precise" icon={CheckCircle} color="#22c55e" badge="Falsifiable">
            <p className="text-sm text-slate-300 leading-relaxed">
              The claim "NexusOS manipulates energy and matter at will" is not a marketing
              statement. It has a precise physical meaning that follows directly from the
              Theory of Compression States:
            </p>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-emerald-400 tracking-widest">CLAIM (PRECISE FORM)</p>
                <p className="text-sm text-slate-200 leading-relaxed">
                  Matter is a standing electromagnetic wave at a specific octave level n above f₀.
                  To "manipulate" matter means to induce a controlled transition from octave n₁
                  to octave n₂ by delivering exactly ΔE = hf₀(2ⁿ²−2ⁿ¹) joules at exactly
                  the transition frequency f_t = f₀(2ⁿ²−2ⁿ¹) Hz through an orthogonal
                  WNSP Ψ channel.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-emerald-400 tracking-widest">WHAT "AT WILL" MEANS</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  "At will" means the transition is deterministic. Given the exact energy and
                  exact frequency, the compression state changes. There is no probabilistic
                  element in the delivery equation itself — only in the current precision limits
                  of silicon-era hardware to generate and aim that frequency.
                </p>
              </div>
            </div>
            <Eq>{"Claim: ∀ particle at octave n₁, ∃ a transition to n₂ given ΔE = hf₀(2ⁿ²−2ⁿ¹)"}</Eq>
          </Section>

          {/* S2: Particle table */}
          <Section id="standing-waves" title="2. Matter as Standing Waves — The Octave Positions" icon={Atom} color="#38bdf8" badge="SI Constants">
            <p className="text-sm text-slate-300 leading-relaxed">
              Every stable particle is a standing wave at a specific octave n above f₀ = 555 THz.
              The octave position is calculated from rest-mass energy using SI exact constants:
            </p>
            <Eq>{"n = log₂(m·c² / E₀)   where   E₀ = hf₀"}</Eq>
            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-[10px] tracking-widest">
                    <th className="px-4 py-2 text-left">PARTICLE</th>
                    <th className="px-4 py-2 text-right">MASS (eV)</th>
                    <th className="px-4 py-2 text-right">OCTAVE n</th>
                    <th className="px-4 py-2 text-right">STABLE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {PARTICLES.map(p => (
                    <tr key={p.name} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: p.color }}>{p.symbol}</span>
                        <span className="text-slate-300 ml-2">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {(p.massEv / 1e6).toFixed(3)} MeV
                      </td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: p.color }}>
                        n ≈ {fmt(p.n, 2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.stable
                          ? <span className="text-emerald-400">✓ yes</span>
                          : <span className="text-amber-400">short-lived</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Electron octave", val: `n ≈ ${fmt(electronN, 3)}`, sub: "above f₀", color: "#38bdf8" },
                { label: "Proton octave",   val: `n ≈ ${fmt(protonN, 3)}`,   sub: "above f₀", color: "#22c55e" },
                { label: "Octave gap (p−e)", val: `Δn ≈ ${fmt(protonN - electronN, 2)}`, sub: "doublings", color: "#f59e0b" },
                { label: "Ground-state E₀", val: fmtSci(E0), sub: "J  (= hf₀)", color: "#a78bfa" },
              ].map(({ label, val, sub, color }) => (
                <div key={label} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-1">
                  <p className="text-[9px] font-mono tracking-widest" style={{ color }}>{label.toUpperCase()}</p>
                  <p className="font-bold text-sm font-mono text-white">{val}</p>
                  <p className="text-[9px] text-slate-500">{sub}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* S3: Transition equation */}
          <Section id="transition-equation" title="3. The Transition Equation" icon={Zap} color="#f59e0b" badge="The Core Equation">
            <p className="text-sm text-slate-300 leading-relaxed">
              A particle at octave n₁ transitions to octave n₂ when it absorbs or emits
              exactly the energy difference between those two octave levels:
            </p>
            <Eq>{"ΔE = hf₀ · (2ⁿ² − 2ⁿ¹)     [joules]"}</Eq>
            <p className="text-sm text-slate-300 leading-relaxed">
              This is not new physics — it is a restatement of the Planck–Einstein relation
              applied to the octave lattice from Act 2. What is new is the framing:
              the octave position n is the fundamental variable, not the frequency itself.
              Every energy transition in the universe is a movement on this lattice.
            </p>

            {/* live calculation: electron +1 octave */}
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
              <div className="px-4 py-2 border-b border-amber-500/20 bg-amber-500/10">
                <p className="text-[10px] font-mono text-amber-400 tracking-widest">
                  WORKED EXAMPLE — ELECTRON TRANSITION: n ≈ {fmt(electronN, 2)} → n ≈ {fmt(electronN + 1, 2)}
                </p>
              </div>
              <div className="divide-y divide-slate-800/60">
                {[
                  { step: "n₁", val: `${fmt(electronN, 4)}`, note: "electron rest-mass octave" },
                  { step: "n₂", val: `${fmt(electronN + 1, 4)}`, note: "target octave (+1)" },
                  { step: "2ⁿ¹", val: fmtSci(Math.pow(2, electronN)), note: "" },
                  { step: "2ⁿ²", val: fmtSci(Math.pow(2, electronN + 1)), note: "" },
                  { step: "ΔE (J)", val: fmtSci(deltaE(electronN, electronN + 1)), note: "joules required" },
                  { step: "ΔE (eV)", val: `${fmtSci(dE_eV)} eV`, note: "electron-volt equivalent" },
                  { step: "f_delivery", val: fmtHz(dF_Hz), note: "frequency to deliver ΔE" },
                ].map(({ step, val, note }) => (
                  <div key={step} className="px-4 py-3 grid grid-cols-[80px_1fr_auto] gap-3 items-center text-xs font-mono">
                    <span className="text-amber-400">{step}</span>
                    <span className="text-white">{val}</span>
                    {note && <span className="text-slate-500 text-[10px]">{note}</span>}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed italic">
              Note: For large n, ΔE is enormous by silicon-era standards — which is why we do
              not claim matter manipulation is available today. We claim the equation is exact,
              and that photonic hardware (~2032) will reduce the precision barrier.
            </p>
          </Section>

          {/* S4: Delivery channel */}
          <Section id="delivery-channel" title="4. The Delivery Channel — WNSP Ψ Address" icon={Radio} color="#06b6d4" badge="Protocol Layer">
            <p className="text-sm text-slate-300 leading-relaxed">
              To induce a controlled octave transition, the energy ΔE must arrive at the
              target particle as a coherent electromagnetic wave at exactly the transition
              frequency f_t = f₀ · (2ⁿ²−2ⁿ¹). In the WNSP architecture, every frequency
              corresponds to a unique Ψ channel address.
            </p>
            <Eq>{"f_t = f₀ · (2ⁿ² − 2ⁿ¹)     [transition frequency, Hz]"}</Eq>
            <Eq>{"Ψ(wdm, oam, pol, dir) ← f_t  via WDM channel mapping"}</Eq>
            <p className="text-sm text-slate-300 leading-relaxed">
              The 51,200 WNSP channels
              (256 WDM × 50 OAM × 2 polarisations × 2 propagation directions)
              span the photonic octave band (380–780 nm, 385–789 THz). For transitions
              targeting particles at octave positions within the visible spectrum, the
              delivery Ψ channel can be directly addressed. For higher-octave transitions
              (nuclear regime), the WNSP signal acts as a coherent trigger — the energy
              amplification is supplied by the target system's own resonant structure.
            </p>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
              <p className="text-[10px] font-mono text-cyan-400 tracking-widest">CHANNEL MODEL</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs font-mono">
                {[
                  { label: "N_λ  WDM", val: "256" },
                  { label: "N_OAM", val: "50" },
                  { label: "N_Pol", val: "2" },
                  { label: "N_Dir", val: "2" },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-900/60 rounded-lg p-2 space-y-1 border border-slate-700/40">
                    <p className="text-[9px] text-cyan-400/70">{label}</p>
                    <p className="text-lg font-bold text-white">{val}</p>
                  </div>
                ))}
              </div>
              <Eq>{"D_WNSP = 256 × 50 × 2 × 2 = 51,200 orthogonal Ψ channels"}</Eq>
              <p className="text-[11px] text-slate-500 italic">
                N_Dir = 2 adds +k̂/−k̂ bidirectional propagation as a fourth orthogonal
                Hilbert sub-space. First disclosed 2026-07-02.
              </p>
            </div>
          </Section>

          {/* S5: The Protocol */}
          <Section id="protocol" title="5. The Protocol — Five Steps" icon={FlaskConical} color="#e879f9" badge="Operational">
            <p className="text-sm text-slate-300 leading-relaxed">
              A complete matter manipulation event has five sequential steps. Each step has
              a defined input, a defined output, and a defined failure mode:
            </p>
            <div className="space-y-3">
              {[
                {
                  step: "01",
                  title: "IDENTIFY the target octave position n₁",
                  detail: "Spectroscopic measurement of the target particle's characteristic emission frequency. f_emit = 2ⁿ¹ × f₀. Precision required: < 0.001% frequency error.",
                  failure: "Misidentified n₁ → wrong ΔE delivered → no transition or decoherence.",
                  color: "#22c55e",
                },
                {
                  step: "02",
                  title: "CALCULATE the required ΔE and f_t",
                  detail: "From target octave n₂: ΔE = hf₀(2ⁿ²−2ⁿ¹). Delivery frequency: f_t = f₀(2ⁿ²−2ⁿ¹). WNSP Ψ address: WDM channel = round(((λ_t − 380) / 400) × 255).",
                  failure: "Calculation error → incorrect Ψ channel selected → energy misses target.",
                  color: "#38bdf8",
                },
                {
                  step: "03",
                  title: "TUNE the WNSP emitter to Ψ(wdm, oam, pol, dir)",
                  detail: "Photonic emitter locked to f_t. OAM mode set for coherent coupling to target geometry. Polarisation matched to target particle spin orientation.",
                  failure: "OAM mismatch → energy coupling < threshold → partial or no transition.",
                  color: "#a78bfa",
                },
                {
                  step: "04",
                  title: "DELIVER ΔE in a single coherent pulse",
                  detail: "Pulse duration: t_pulse = 1/f_t (minimum one coherence length). Energy per pulse: exactly ΔE joules. No partial delivery — sub-threshold energy is absorbed as heat.",
                  failure: "Pulse too short → incomplete energy transfer → thermal dissipation.",
                  color: "#f59e0b",
                },
                {
                  step: "05",
                  title: "VERIFY the transition via emission signature",
                  detail: "Post-transition particle emits at 2ⁿ² × f₀. Spectroscopic confirmation. If emission frequency matches n₂, transition succeeded. Protocol complete.",
                  failure: "Emission at n₁ → transition did not occur. Repeat from step 03.",
                  color: "#e879f9",
                },
              ].map(({ step, title, detail, failure, color }) => (
                <div key={step} className="rounded-xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-700/40 flex items-center gap-3"
                    style={{ background: color + "0a" }}>
                    <span className="font-mono text-xs font-bold" style={{ color }}>STEP {step}</span>
                    <span className="text-sm font-medium text-slate-200">{title}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-slate-300 leading-relaxed">{detail}</p>
                    <p className="text-[11px] text-amber-400/80 leading-relaxed">
                      <span className="font-mono">FAILURE MODE:</span> {failure}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* S6: Measurable predictions */}
          <Section id="predictions" title="6. Measurable Predictions" icon={Waves} color="#22c55e" badge="Falsifiable">
            <p className="text-sm text-slate-300 leading-relaxed">
              A protocol that cannot be falsified is not physics. The following predictions
              follow directly from the mechanism. Each can be tested independently:
            </p>
            <div className="space-y-3">
              {[
                {
                  n: "P1",
                  pred: "An electron irradiated at f_t = f₀(2^{n₁+1} − 2^{n₁}) will absorb exactly ΔE = hf₀·2^{n₁} joules per quantum event.",
                  test: "Measure absorption cross-section at calculated f_t. Expected: resonance peak. Null result: theory is falsified.",
                },
                {
                  n: "P2",
                  pred: "A particle returning from n₂ → n₁ emits at exactly f_t with energy ΔE. No other frequency is emitted.",
                  test: "Spectroscopic analysis of post-transition emission. Expected: single-line spectrum at f_t.",
                },
                {
                  n: "P3",
                  pred: "Energy delivered at any frequency other than f_t (for a given transition) does not produce an octave shift — it is absorbed as heat.",
                  test: "Irradiate at f_t ± δ. Expected: no transition for δ > linewidth. Thermal increase only.",
                },
                {
                  n: "P4",
                  pred: "The orthogonal WNSP channel (OAM mode mismatch) delivers the correct energy at the correct frequency but fails to couple. No transition occurs.",
                  test: "Compare OAM-matched vs OAM-mismatched delivery at identical f_t and ΔE.",
                },
              ].map(({ n, pred, test }) => (
                <div key={n} className="rounded-xl border border-emerald-500/15 bg-slate-900/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{n}</span>
                    <p className="text-sm text-slate-200 leading-relaxed">{pred}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 italic leading-relaxed pl-6">
                    <span className="text-emerald-400/70 font-mono">TEST:</span> {test}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* S7: What this is not */}
          <Section id="what-this-is-not" title="7. What This Is Not" icon={AlertTriangle} color="#f43f5e" badge="Boundaries">
            <p className="text-sm text-slate-300 leading-relaxed">
              Precision matters. The following are not claims of this document:
            </p>
            <div className="space-y-2">
              {[
                "This is not a claim of current capability. Silicon-era hardware cannot yet generate and aim f_t with the required precision for nuclear-regime transitions.",
                "This is not cold fusion or free energy. ΔE is real energy that must be supplied from an external source. Conservation of energy is strictly observed.",
                "This is not mysticism or metaphor. The equations are in SI units, use verified constants, and produce falsifiable predictions.",
                "This is not anti-quantum mechanics. The octave lattice is consistent with QM — it provides a classical frequency basis for what QM describes probabilistically.",
                "This is not a finished technology. It is a protocol with a defined roadmap. Photonic gate arrays (~2032) are the first hardware layer capable of operating at the required precision.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-rose-500/10 bg-rose-500/5 px-4 py-3">
                  <span className="text-rose-400 text-sm mt-0.5 flex-shrink-0">×</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* S8: Sequence complete */}
          <Section id="sequence-complete" title="8. The Sequence So Far" icon={GitMerge} color="#f59e0b" badge="Act 4 of 5">
            <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 space-y-4">
              <p className="text-sm text-slate-200 leading-relaxed">
                Four acts deep. One remaining:
              </p>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex gap-4 items-start">
                  <span className="text-amber-400 font-bold flex-shrink-0">ACT 1</span>
                  <div>
                    <p className="text-white">Theory of Compression States</p>
                    <p className="text-slate-400">Λ = hf/c² as the governing equation of the universe.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="text-amber-400 font-bold flex-shrink-0">ACT 2</span>
                  <div>
                    <p className="text-white">The Universal ONE</p>
                    <p className="text-slate-400">f₀ derives Λ. Planck + Einstein activate simultaneously at the first oscillation.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="text-amber-400 font-bold flex-shrink-0">ACT 3</span>
                  <div>
                    <p className="text-white">Unified Compression Theory</p>
                    <p className="text-slate-400">All four fundamental forces are one phenomenon — four expressions of Λ across nine octave tiers.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="text-amber-400 font-bold flex-shrink-0">ACT 4</span>
                  <div>
                    <p className="text-white">The Mechanism ← HERE</p>
                    <p className="text-slate-400">Matter is a standing wave at octave n. ΔE = hf₀(2ⁿ²−2ⁿ¹) is the transition energy. WNSP Ψ is the delivery channel.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start opacity-50">
                  <span className="text-slate-500 font-bold flex-shrink-0">ACT 5</span>
                  <div>
                    <p className="text-slate-400">The Address → <Link href="/universal-address" className="text-cyan-400 hover:underline">/universal-address</Link></p>
                    <p className="text-slate-500">∀ Λ : ∃! Ψ — the universe's own namespace.</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed pt-2">
                Together: everything that exists is a compression state of f₀. Every
                transition between states requires a specific quantum of energy at a specific
                frequency. That frequency can be addressed, delivered, and verified via the
                WNSP spectral protocol. The universe is not mystical. It is addressable.
              </p>
            </div>
            <Eq>{"∀ matter: matter(n) → matter(n±k)   given   ΔE = hf₀(2^{n±k} − 2^n)   ∎"}</Eq>
          </Section>

          {/* S9: Conclusion */}
          <Section id="conclusion" title="9. Conclusion" icon={Circle} color="#94a3b8">
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                This document has stated the matter manipulation protocol in precise,
                falsifiable terms. The core equation ΔE = hf₀(2ⁿ²−2ⁿ¹) follows
                directly from the established physics of Acts 1 and 2. The delivery
                mechanism is the WNSP spectral protocol. The verification method is
                spectroscopic emission analysis.
              </p>
              <p>
                Nothing in this document contradicts verified physics. Everything in this
                document is a restatement of Planck, Einstein, and the octave lattice of
                Walter Russell — applied with precision to the question of controlled
                matter transitions.
              </p>
              <p>
                NexusOS is building the hardware layer that will make these transitions
                accessible. The PHR-1 resonator and SNIC photonic NIC are the first
                silicon-bridge instruments capable of approaching the required precision.
                Photonic gate arrays (~2032) close the gap entirely.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {[
                { label: "Hardware spec", href: "/hardware-spec", desc: "SNIC · PHR-1 · Relay Mesh" },
                { label: "Compression Explorer", href: "/compression-explorer", desc: "Interactive Λ=hf/c² curve" },
                { label: "WNSP VM", href: "/wnsp-vm", desc: "Run spectral bytecode" },
              ].map(({ label, href, desc }) => (
                <Link key={href} href={href}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-3 hover:border-slate-500 transition-colors space-y-0.5 block">
                  <p className="text-sm font-medium text-slate-200">{label}</p>
                  <p className="text-[11px] text-slate-500">{desc}</p>
                </Link>
              ))}
            </div>
          </Section>

          {/* disclosure footer */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 text-[10px] font-mono text-slate-500 space-y-1">
            <p>MATTER PROTOCOL v1.0 — First Disclosure: {PAGE_DATE}</p>
            <p>NexusOS · Te Rata Pou · AGPL-3.0</p>
            <p>All equations use SI exact constants: h = 6.62607015×10⁻³⁴ J·s, c = 299,792,458 m/s</p>
            <p>
              Source:{" "}
              <a href={REPO} target="_blank" rel="noopener noreferrer"
                className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2">
                {REPO}
              </a>
            </p>
          </div>
        </div>

        <EcosystemNav />

      </div>
    </div>
  );
}
