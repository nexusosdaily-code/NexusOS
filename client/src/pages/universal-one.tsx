import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import { ArrowLeft, Waves, Atom, Zap, Layers, Radio, Globe, FlaskConical, ExternalLink, Circle, GitMerge } from "lucide-react";
import { ActSequenceNav } from "@/components/act-sequence-nav";

const PAGE_DATE  = "2026-07-06";
const REPO       = "https://github.com/nexusosdaily-code/NexusOS";

// ── SI exact constants ────────────────────────────────────────────────────────
const H  = 6.62607015e-34;   // Planck  J·s
const C  = 299_792_458;      // light   m/s
const EV = 1.602176634e-19;  // eV→J

// ── Universal ONE anchor ──────────────────────────────────────────────────────
const F0_HZ  = 555e12;                         // 555 THz — WNSP ground-state
const F0_NM  = (C / F0_HZ) * 1e9;              // ≈ 540 nm green
const F0_J   = H * F0_HZ;                      // E₀
const F0_EV  = F0_J / EV;                      // eV
const L0_KG  = F0_J / (C * C);                 // Λ₀ = hf₀/c²  (compression mass)

// ── Octave table: Octave n → fn = 2ⁿ × f₀ ───────────────────────────────────
const OCTAVES: {
  n: number; label: string; freqHz: number; nm: string;
  lambdaKg: number; domain: string; force: string; color: string;
}[] = [
  { n:-4, label:"f₀/16", freqHz:F0_HZ/16,  nm:"8,640",   lambdaKg:L0_KG/16,  domain:"Mid-infrared",   force:"Gravitational",    color:"#64748b" },
  { n:-3, label:"f₀/8",  freqHz:F0_HZ/8,   nm:"4,320",   lambdaKg:L0_KG/8,   domain:"Thermal IR",     force:"Gravitational",    color:"#78716c" },
  { n:-2, label:"f₀/4",  freqHz:F0_HZ/4,   nm:"2,160",   lambdaKg:L0_KG/4,   domain:"Near-IR",        force:"EM onset",         color:"#dc2626" },
  { n:-1, label:"f₀/2",  freqHz:F0_HZ/2,   nm:"1,080",   lambdaKg:L0_KG/2,   domain:"NIR edge",       force:"Electromagnetic",  color:"#ea580c" },
  { n: 0, label:"f₀",    freqHz:F0_HZ,     nm:"540",     lambdaKg:L0_KG,     domain:"Visible / WNSP", force:"Electromagnetic",  color:"#22c55e" },
  { n:+1, label:"2f₀",   freqHz:F0_HZ*2,   nm:"270",     lambdaKg:L0_KG*2,   domain:"UV",             force:"EM → Weak",        color:"#8b5cf6" },
  { n:+2, label:"4f₀",   freqHz:F0_HZ*4,   nm:"135",     lambdaKg:L0_KG*4,   domain:"EUV",            force:"Weak Nuclear",     color:"#7c3aed" },
  { n:+3, label:"8f₀",   freqHz:F0_HZ*8,   nm:"67.5",    lambdaKg:L0_KG*8,   domain:"Soft X-ray",     force:"Weak Nuclear",     color:"#4f46e5" },
  { n:+4, label:"16f₀",  freqHz:F0_HZ*16,  nm:"33.75",   lambdaKg:L0_KG*16,  domain:"X-ray",          force:"Strong Nuclear",   color:"#0ea5e9" },
];

// ── Matter formation octave offsets (Octave n above f₀) ──────────────────────
const N_ELECTRON = Math.log2((0.511e6 * EV / H) / F0_HZ);   // ≈ 17.8
const N_PROTON   = Math.log2((938.3e6 * EV / H) / F0_HZ);   // ≈ 28.6

function fmt(n: number, dp = 2) { return n.toFixed(dp); }
function fmtSci(n: number) {
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mant = n / Math.pow(10, exp);
  return `${mant.toFixed(3)} × 10${sup(exp)}`;
}
function sup(n: number) {
  const digits: Record<string,string> = { "-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹" };
  return String(n).split("").map(c => digits[c] ?? c).join("");
}

function Eq({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black/40 border border-slate-700/50 rounded-lg px-5 py-3 font-mono text-sm text-emerald-300 text-center tracking-wide">
      {children}
    </div>
  );
}

function Quote({ text, src }: { text: string; src: string }) {
  return (
    <blockquote className="border-l-2 border-emerald-500/50 pl-4 py-1 my-4">
      <p className="text-slate-300 italic text-sm leading-relaxed">"{text}"</p>
      <footer className="text-emerald-500 text-xs mt-1 font-mono">— {src}</footer>
    </blockquote>
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

export default function UniversalOnePage() {
  usePageMeta({
    title: "The Universal ONE — NexusOS",
    description: "f₀ as the unobserved first oscillation unifying compression states, octave layers, and energy-matter manipulation. Walter Russell's Universal ONE derived from first principles.",
    canonical: "https://wnsp.io/universal-one",
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* nav */}
        <div className="flex items-center gap-3">
          <Link href="/oscillating-quanta" className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to First Principles
          </Link>
        </div>

        {/* header */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              Act 2 of 5
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              f₀ = 555 THz
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
              First Disclosure {PAGE_DATE}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-violet-500/40 text-violet-400 bg-violet-500/10">
              AGPL-3.0
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-violet-500/40 text-violet-400 bg-violet-500/10">
              Copyleft
            </span>
          </div>

          {/* sequence nav */}
          <ActSequenceNav current={2} />

          <h1 className="text-2xl font-bold text-white tracking-tight">
            The Universal ONE
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            The Unobserved First Oscillation as the Seed of All Compression States,
            Octave Layers, and Energy–Matter Manipulation
          </p>
          <p className="text-xs text-slate-500 font-mono">
            NexusOS Research · Te Rata Pou · {PAGE_DATE} ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-cyan-400 hover:underline inline-flex items-center gap-1">
              {REPO.replace("https://","")} <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* abstract */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-6 space-y-3">
          <p className="text-[10px] font-mono text-slate-500 tracking-widest">ABSTRACT</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Walter Russell declared that everything in the universe is a reflection of the universal ONE.
            We prove this formally. There exists a single ground-state frequency f₀ — the first oscillation,
            unobserved and unobservable in isolation — from which every octave, every compression state,
            every particle of matter, and every exchange of energy is derived as a harmonic multiple.
            The equation Λ = hf/c² (Theory of Compression States, NexusOS 2025) becomes, under the octave
            lattice, Λₙ = 2ⁿ × hf₀/c² — a single seed Λ₀ doubled n times. Matter is a standing wave at high n.
            Energy is an octave transition. Manipulation of matter is controlled traversal of the octave lattice.
            The WNSP spectral protocol's 51,200 Ψ channels are the directly addressable sub-harmonics of f₀
            in the photonic band. This is not a metaphor. This is the architecture.
          </p>
        </div>

        {/* S1: Proof of Λ */}
        <Section id="proof-of-lambda" title="1. Proof of Λ — Derived, Not Assumed" icon={GitMerge} color="#f59e0b" badge="First Principles">
          <p className="text-sm text-slate-300 leading-relaxed">
            The compression state operator Λ = hf/c² was originally stated as a postulate in the
            Theory of Compression States (NexusOS 2025). Here we prove it is not a postulate —
            it is a <em>consequence</em> of the first oscillation. The logical order matters:
            f₀ derives Λ. Λ does not derive f₀.
          </p>

          {/* stepped proof */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
            <div className="px-4 py-2 border-b border-amber-500/20 bg-amber-500/10">
              <p className="text-[10px] font-mono text-amber-400 tracking-widest">FORMAL DERIVATION</p>
            </div>
            <div className="divide-y divide-slate-800/60">
              {[
                {
                  step: "POSTULATE",
                  label: "The first oscillation exists",
                  eq: "f₀  ∈  ℝ⁺   (unobserved, primordial)",
                  note: "One frequency. No observer. No medium. The universe's first act.",
                  color: "#22c55e",
                },
                {
                  step: "PLANCK 1900",
                  label: "Energy of a quantum at frequency f",
                  eq: "E  =  hf     →     E₀ = h × f₀",
                  note: "Applied to f₀: the first oscillation carries its first quantum of energy.",
                  color: "#38bdf8",
                },
                {
                  step: "EINSTEIN 1905",
                  label: "Mass–energy equivalence",
                  eq: "E  =  mc²    →     m  = E / c²",
                  note: "Applied to E₀: that energy has a mass-equivalent.",
                  color: "#f43f5e",
                },
                {
                  step: "COMBINE",
                  label: "Substitute E₀ = hf₀ into m = E/c²",
                  eq: "m₀  =  hf₀ / c²",
                  note: "The mass-equivalent of one quantum of the first oscillation.",
                  color: "#a78bfa",
                },
                {
                  step: "DEFINE",
                  label: "Name this quantity the compression state",
                  eq: "Λ₀  ≡  m₀  =  hf₀ / c²",
                  note: "Λ₀ is not invented. It emerges from combining two verified laws.",
                  color: "#f59e0b",
                },
                {
                  step: "GENERALISE",
                  label: "For any frequency f (any octave)",
                  eq: "Λ  =  hf / c²     ∎",
                  note: "This is the compression state operator — derived from first principles.",
                  color: "#f59e0b",
                },
              ].map(({ step, label, eq, note, color }) => (
                <div key={step} className="px-4 py-4 grid grid-cols-[80px_1fr] gap-4 items-start">
                  <span className="text-[9px] font-mono tracking-widest pt-1 font-bold" style={{ color }}>
                    {step}
                  </span>
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="font-mono text-sm text-white bg-black/30 rounded px-3 py-1.5">{eq}</p>
                    <p className="text-[11px] text-slate-500 italic">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* the key insight */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 space-y-3">
            <p className="text-[10px] font-mono text-amber-400 tracking-widest">THE UNIFIED INSIGHT</p>
            <p className="text-sm text-slate-200 leading-relaxed">
              Before f₀, Planck's equation has no frequency to operate on.
              Before f₀, Einstein's equation has no energy to convert.
              <strong className="text-amber-300"> f₀ is the first event that activates both laws simultaneously.</strong>
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              This is the missing mechanics: Planck and Einstein are not two separate theories of
              physics. They are two expressions of the same first event. NexusOS is the first system
              to state this explicitly — and to build an addressing protocol on the consequence.
            </p>
          </div>

          <Eq>{"Λ = hf/c²   [consequence of f₀, not an axiom]"}</Eq>
        </Section>

        {/* S2: The First Oscillation */}
        <Section id="first-oscillation" title="2. The First Oscillation — f₀" icon={Waves} color="#22c55e" badge="Unobserved">
          <Quote
            text="The desire of the whole universe is ONE desire — to create. Creation is the expression of that ONE desire."
            src="Walter Russell, The Universal One (1926)"
          />
          <p className="text-sm text-slate-300 leading-relaxed">
            Before any matter, before any observer, a single oscillation occurred. We call it f₀ — the
            universal ground-state frequency. It is "unobserved" not because it is hidden, but because
            at the moment of its occurrence there was no universe yet capable of observing it. It is the
            ONE that Russell describes: not a particle, not a wave in a medium, but the primordial motion
            from which all subsequent motion is derived.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            NexusOS anchors f₀ at the photonic ground state — the frequency at which electromagnetic
            energy first becomes measurable as visible light, and from which the 51,200 WNSP channels
            are addressed.
          </p>

          {/* f₀ vitals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "f₀  Frequency",   val: "555 THz",                       sub: "Hz" },
              { label: "λ₀  Wavelength",  val: `${fmt(F0_NM, 1)} nm`,           sub: "green" },
              { label: "E₀  Energy",      val: `${fmt(F0_EV, 3)} eV`,           sub: "per photon" },
              { label: "Λ₀  Mass-equiv",  val: fmtSci(L0_KG),                   sub: "kg" },
            ].map(({ label, val, sub }) => (
              <div key={label} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-center space-y-1">
                <p className="text-[9px] font-mono text-emerald-400/70 tracking-widest uppercase">{label}</p>
                <p className="text-base font-bold text-emerald-300 font-mono">{val}</p>
                <p className="text-[9px] text-slate-500">{sub}</p>
              </div>
            ))}
          </div>

          <Eq>Λ₀ = hf₀/c² = {fmtSci(L0_KG)} kg</Eq>

          <p className="text-sm text-slate-400 leading-relaxed">
            The compression mass Λ₀ is the quantity of "compressed light" represented by one quantum of
            the first oscillation. Every compression state in the universe is a multiple of this value.
          </p>
        </Section>

        {/* S3: Russell's Law */}
        <Section id="russells-law" title="3. Russell's Law — The Octave Lattice" icon={Layers} color="#a78bfa" badge="Foundation 1926">
          <Quote
            text="All motion is rhythmic. All rhythmic motion is wave motion. All wave motion is light."
            src="Walter Russell, The Secret of Light (1947)"
          />
          <p className="text-sm text-slate-300 leading-relaxed">
            Russell's supreme observation: nature does not produce frequencies randomly. Every stable
            frequency is an integer-power-of-two multiple of the ground state. The universe is a
            Hilbert space of octaves, not a continuum of arbitrary frequencies.
          </p>

          <Eq>{"fₙ = 2ⁿ × f₀     (n ∈ ℤ, octave integer)"}</Eq>
          <Eq>{"Λₙ = 2ⁿ × Λ₀ = 2ⁿ × hf₀/c²"}</Eq>
          <Eq>{"Eₙ = hfₙ = 2ⁿ × hf₀ = 2ⁿ × E₀"}</Eq>

          <p className="text-sm text-slate-300 leading-relaxed">
            This is Russell's universal law stated as mathematics. "Everything is a reflection of the
            universal ONE" means: every observable quantity is 2ⁿ × (its ground-state value). The
            universe is not built from many different things. It is built from ONE thing — f₀ — folded
            upon itself n times.
          </p>

          {/* octave table */}
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/40">
                  <th className="px-3 py-2 text-left text-slate-400 font-normal">n</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-normal">fₙ</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-normal">Frequency</th>
                  <th className="px-3 py-2 text-right text-slate-400 font-normal hidden md:table-cell">λ (nm)</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-normal">Domain</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-normal hidden md:table-cell">Force</th>
                </tr>
              </thead>
              <tbody>
                {OCTAVES.map((row) => (
                  <tr key={row.n}
                    className={`border-b border-slate-800/60 transition-colors ${row.n === 0 ? "bg-emerald-500/10" : "hover:bg-slate-800/30"}`}>
                    <td className="px-3 py-2 text-slate-400">{row.n >= 0 ? `+${row.n}` : row.n}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: row.color }}>{row.label}</td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {row.freqHz >= 1e12
                        ? `${(row.freqHz / 1e12).toFixed(1)} THz`
                        : `${(row.freqHz / 1e9).toFixed(1)} GHz`}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400 hidden md:table-cell">{row.nm}</td>
                    <td className="px-3 py-2" style={{ color: row.color }}>{row.domain}</td>
                    <td className="px-3 py-2 text-slate-400 hidden md:table-cell">{row.force}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500 font-mono text-center">
            Row n=0 (green) is the WNSP photonic anchor. Octaves below → gravity. Octaves above → nuclear forces.
          </p>
        </Section>

        {/* S4: Matter as Compressed f₀ */}
        <Section id="matter" title="4. Matter — Standing Waves at High n" icon={Atom} color="#38bdf8" badge="UCT Theorem">
          <Quote
            text="Light is the one substance of the universe. All matter is light compressed to the point of stillness."
            src="Walter Russell, The Universal One (1926)"
          />
          <p className="text-sm text-slate-300 leading-relaxed">
            Matter forms when two counter-propagating harmonics of f₀ interfere to produce a standing wave.
            The standing wave condition locks energy into a local region of space — this is a particle.
          </p>

          <Eq>{"Ψ(x,t) = A sin(kₙ x) cos(ωₙ t)   where kₙ = 2πfₙ/c,  ωₙ = 2πfₙ"}</Eq>
          <Eq>{"mₙ = Eₙ/c² = 2ⁿ × hf₀/c² = 2ⁿ × Λ₀"}</Eq>

          <p className="text-sm text-slate-300 leading-relaxed">
            The octave at which a standing wave stabilises determines the particle's rest mass. Using
            f₀ = 555 THz as anchor:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: "Electron",
                mass: "0.511 MeV/c²",
                octave: `n ≈ ${fmt(N_ELECTRON, 1)} above f₀`,
                color: "#38bdf8",
                note: "Stable lepton — low-octave matter boundary",
              },
              {
                name: "Proton",
                mass: "938.3 MeV/c²",
                octave: `n ≈ ${fmt(N_PROTON, 1)} above f₀`,
                color: "#f97316",
                note: "Stable baryon — Russell's Octave 9 anchor",
              },
            ].map(({ name, mass, octave, color, note }) => (
              <div key={name} className="rounded-lg border p-4 space-y-2"
                style={{ borderColor: color + "44", background: color + "08" }}>
                <p className="font-bold text-sm" style={{ color }}>{name}</p>
                <p className="font-mono text-xs text-slate-300">{mass}</p>
                <p className="font-mono text-xs" style={{ color }}>{octave}</p>
                <p className="text-xs text-slate-400">{note}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            Russell's 9 Octave Layers of the periodic table describe element formation within the
            high-n harmonic space above f₀. Each period of the periodic table is one octave doubling —
            elements within a period are standing-wave modes of the same octave. Noble gases (He, Ne, Ar,
            Kr, Xe, Rn) are equilibrium nodes where the standing wave perfectly cancels: maximum
            compression stability, minimum reactivity.
          </p>
        </Section>

        {/* S5: Energy as Octave Delta */}
        <Section id="energy" title="5. Energy — The Octave Transition" icon={Zap} color="#f59e0b" badge="Manipulation Key">
          <p className="text-sm text-slate-300 leading-relaxed">
            Every energy exchange in the universe — chemical bond, nuclear reaction, photon emission —
            is a particle moving between octave levels. The energy released or absorbed is precisely
            the difference in octave energies.
          </p>

          <Eq>{"ΔE = h × f₀ × (2^n₂ − 2^n₁)  =  E₀ × (2^n₂ − 2^n₁)"}</Eq>
          <Eq>{"ΔΛ = Λ₀ × (2^n₂ − 2^n₁)  [compression state shift]"}</Eq>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
            <p className="text-xs font-mono text-amber-400 tracking-widest">ENERGY HIERARCHY</p>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: "Chemical bond",     delta: "n ~ ±0.001",  example: "electron orbital shifts",   color: "#86efac" },
                { label: "Photoionisation",   delta: "n ~ ±1",      example: "UV photon ejects electron", color: "#67e8f9" },
                { label: "Nuclear fission",   delta: "n ~ ±3..5",   example: "octave collapse cascade",   color: "#fca5a5" },
                { label: "Matter↔Light",      delta: "n → −∞",      example: "pair annihilation",         color: "#c4b5fd" },
                { label: "Photonic (WNSP)",   delta: "n = 0",       example: "channel routing, f₀ band",  color: "#6ee7b7" },
              ].map(({ label, delta, example, color }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="w-32 text-amber-300/70 shrink-0">{label}</span>
                  <span style={{ color }} className="w-24 shrink-0">{delta}</span>
                  <span className="text-slate-400">{example}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            Nuclear energy is enormous because it spans many octaves simultaneously. Chemical energy
            spans a fraction of one octave. Photonic computing (WNSP) operates at n = 0 — the f₀ band —
            which is why it is both the most energy-efficient and the most information-dense medium
            available to silicon-era technology.
          </p>
        </Section>

        {/* S6: Matter Manipulation */}
        <Section id="manipulation" title="6. Matter Manipulation — Controlled Octave Inversion" icon={FlaskConical} color="#e879f9" badge="Stage 3–5 Capability">
          <Quote
            text="Man will one day learn to control the octave wave and thereby control matter itself."
            src="Walter Russell, Atomic Suicide? (1957)"
          />
          <p className="text-sm text-slate-300 leading-relaxed">
            If matter is a standing wave at octave n, then manipulating matter means
            controlling which octave the standing wave is stabilised at. This is not chemistry.
            It is not nuclear physics as currently practised. It is <em>octave engineering</em> —
            applying precisely tuned harmonics of f₀ to shift a standing wave between stable nodes.
          </p>

          <div className="space-y-3">
            {[
              {
                stage: "Stage 1 — Photonic",
                desc: "Route information via f₀ harmonics. No matter change. Pure EM.",
                tech: "WNSP, fibre optics, WDM lasers",
                color: "#22c55e",
                status: "Now",
              },
              {
                stage: "Stage 2 — Thermal",
                desc: "Drive Δn via heat — stimulate octave transitions in bulk matter.",
                tech: "Plasma fusion, laser-heated targets",
                color: "#f59e0b",
                status: "2030s",
              },
              {
                stage: "Stage 3 — Coherent EM",
                desc: "Phase-lock two counter-propagating f₀ harmonics to drive specific Δn.",
                tech: "Petawatt lasers, coherent X-ray arrays",
                color: "#f97316",
                status: "2040s",
              },
              {
                stage: "Stage 4 — Weak Nuclear",
                desc: "Direct flavour-change at n ≈ +2..3, controlled beta decay rates.",
                tech: "Tuned Z-boson resonance sources",
                color: "#8b5cf6",
                status: "2060s",
              },
              {
                stage: "Stage 5 — Gravitational",
                desc: "Operate at n ≪ 0. Large-scale octave compression of spacetime.",
                tech: "Coherent gravitational wave emitters",
                color: "#64748b",
                status: "~2100",
              },
            ].map(({ stage, desc, tech, color, status }) => (
              <div key={stage} className="flex gap-4 rounded-lg border border-slate-700/40 p-4 items-start"
                style={{ background: color + "08" }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-bold" style={{ color }}>{stage}</p>
                    <span className="text-[10px] font-mono text-slate-500">{status}</span>
                  </div>
                  <p className="text-xs text-slate-300">{desc}</p>
                  <p className="text-[10px] font-mono text-slate-500">{tech}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* S7: WNSP as f₀ Interface */}
        <Section id="wnsp" title="7. WNSP — The f₀ Interface" icon={Radio} color="#06b6d4" badge="Architecture">
          <p className="text-sm text-slate-300 leading-relaxed">
            The 51,200 Ψ channels of the WNSP spectral protocol are not an arbitrary design choice.
            They are the directly addressable harmonic sub-space of f₀ within the photonic octave band
            (380–780 nm):
          </p>

          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-5 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-slate-300">
              <span className="text-cyan-400">N_λ (WDM channels)</span><span>256</span>
              <span className="text-cyan-400">N_OAM (orbital angular momentum)</span><span>50</span>
              <span className="text-cyan-400">N_Pol (polarisation)</span><span>2</span>
              <span className="text-cyan-400">N_Dir (propagation direction)</span><span>2</span>
              <span className="text-cyan-400">Total Ψ channels</span><span className="text-white font-bold">51,200</span>
            </div>
            <div className="border-t border-cyan-500/20 pt-3 text-center text-cyan-300">
              D_WNSP = N_λ × N_OAM × N_Pol × N_Dir = 51,200 orthogonal channels
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Each Ψ channel corresponds to a unique harmonic of f₀. The WDM dimension is a 256-point
            linear discretisation of the f₀ photonic octave (380–780 nm). OAM and polarisation add
            orthogonal Hilbert sub-spaces — each still anchored to f₀. The two propagation directions
            (+k̂ / −k̂) are the counter-propagating pair that, at sufficient intensity, form the
            standing wave described in Section 3.
          </p>

          <Eq>{"⟨Ψᵢ|Ψⱼ⟩ = 0  ∀ i ≠ j   [quantum orthogonality, not software policy]"}</Eq>

          <p className="text-sm text-slate-400 leading-relaxed">
            When photonic ASICs arrive (~2032), each Ψ channel will be a physical waveguide lane.
            The addressing will not need translation — WNSP already speaks in f₀ harmonics,
            exactly as the hardware will.
          </p>
        </Section>

        {/* S8: The Grand Unification */}
        <Section id="unification" title="8. The Grand Unification — ONE Equation" icon={Globe} color="#f43f5e" badge="Synthesis">
          <Quote
            text="God is Light. Light is motion of waves. Waves are the expression of the ONE universal desire."
            src="Walter Russell, The Universal One (1926)"
          />
          <p className="text-sm text-slate-300 leading-relaxed">
            Everything derived in this paper follows from a single equation with one free parameter — f₀:
          </p>

          <div className="bg-gradient-to-br from-rose-500/10 to-violet-500/10 border border-rose-500/30 rounded-xl p-6 space-y-4">
            <p className="text-center text-2xl font-bold text-white font-mono tracking-widest">
              Λₙ = 2ⁿ · hf₀/c²
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              {[
                { lhs: "n = 0",       rhs: "Photonic / WNSP band",           color: "#22c55e" },
                { lhs: "n < 0",       rhs: "Gravitational regime",            color: "#64748b" },
                { lhs: "n = +1..3",   rhs: "UV / Weak Nuclear onset",         color: "#a78bfa" },
                { lhs: "n ≈ +18",     rhs: "Electron rest mass",              color: "#38bdf8" },
                { lhs: "n ≈ +29",     rhs: "Proton rest mass",                color: "#f97316" },
                { lhs: "n → ∞",       rhs: "Planck scale / gravity unified",  color: "#f43f5e" },
              ].map(({ lhs, rhs, color }) => (
                <div key={lhs} className="flex gap-3 items-center">
                  <span className="text-slate-400 w-20">{lhs}</span>
                  <span className="text-slate-600">→</span>
                  <span style={{ color }}>{rhs}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Russell said it in 1926. The mathematics confirms it a century later. The four forces are
            not four different things — they are four octave regimes of one thing: f₀ experiencing
            itself through standing-wave interference at different scales of self-amplification.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            The "unobserved first oscillation" is unobserved precisely because observation itself
            requires a medium — and f₀ is what medium is made of. You cannot observe the instrument
            you are built from. But you can address its harmonics. And that is what WNSP does.
          </p>
        </Section>

        {/* S9: Conclusion */}
        <Section id="conclusion" title="9. Conclusion" icon={Circle} color="#94a3b8">
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              We have shown that f₀ — the ground-state frequency of the first oscillation — is the
              universal ONE of Walter Russell's cosmology expressed in SI units. The nine octave layers
              of the periodic table, the four fundamental forces, all compression states, and the
              WNSP protocol's 51,200 channels are all derivable from one number: 555 THz.
            </p>
            <p>
              This is not coincidence. It is the architecture. The universe was built by doubling
              one frequency until it forgot it was light.
            </p>
            <p>
              NexusOS is the first computational system designed to remember.
            </p>
          </div>

          <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center space-y-1">
            <p className="text-2xl font-bold text-emerald-400 font-mono">I AM</p>
            <p className="text-xs text-slate-500 font-mono">
              The universal ONE. The first oscillation. f₀ = 555 THz.
            </p>
          </div>
        </Section>

        {/* footer */}
        <div className="border-t border-slate-800 pt-6 space-y-3">
          <p className="text-[10px] font-mono text-slate-600 leading-relaxed">
            First Disclosure: {PAGE_DATE} · Author: Te Rata Pou / NexusOS Research ·
            License: AGPL-3.0 · wnsp.io/universal-one
          </p>
          <p className="text-[10px] font-mono text-slate-600">
            Constants: CODATA 2018 / SI 2019 exact. f₀ = 555 THz (WNSP photonic anchor).
            All octave derivations reproducible from Λₙ = 2ⁿ·hf₀/c².
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> GitHub Repository
            </a>
            <Link href="/unified-compression-theory" className="text-[10px] font-mono text-violet-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Unified Compression Theory
            </Link>
            <Link href="/oscillating-quanta" className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Oscillating Quanta
            </Link>
            <Link href="/octave-layers" className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Octave Layers
            </Link>
          </div>
        </div>

        <EcosystemNav />

      </div>
    </div>
  );
}
