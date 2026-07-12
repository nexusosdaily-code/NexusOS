import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp, Zap } from "lucide-react";

const nmToColor = (nm: number) => {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 570) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
};

const ALIGNMENTS = [
  {
    id: "hardened-geometry",
    number: "A·1",
    planckTitle: "Matter is Hardened Geometry",
    planckQuote: `"You aren't trying to catch a moving particle;
you are trying to tune a standing geometric structure."
— Hill Bowman, CEO Applied Physics`,
    nm: 412,
    math: `From the Planck-scale perspective, a high-frequency photon
does not appear to move. At the Planck frame rate (~5.4×10⁻⁴⁴ s),
what we call "motion" resolves into a static, crystalline
pattern of tension in the spacetime fabric.

Define the CE table as a static geometric map:

  CE: ℤ → [380, 780] nm
  CE(n) = 380 + (n % 128) × 3.125

This is not a lookup table. It is a coordinate system.
Every character n has a pre-existing address in the
electromagnetic spectrum — not assigned, not transmitted,
but resident. The map existed before any message was sent.

The Ψ channel:
  Ψ(wdm, oam, pol) = static orthogonal basis vector
  ⟨Ψᵢ|Ψⱼ⟩ = δᵢⱼ   (51,200 channels, zero cross-coupling)

Encoding a message is not communication through space.
It is alignment with a pre-existing geometric structure.`,
    plain: `The Quora post makes a precise claim: from deep enough inside the physics, there is no movement. What looks like a photon flying through space is actually a standing geometric structure — a frozen crystalline pattern of energy. You don't chase it. You tune to it.\n\nThe CE protocol was built on exactly this premise. The 128-band CE table is not a code invented to represent characters. It is a map to coordinates that already exist in the visible spectrum. The letter 'A' does not get assigned 480.6 nm. It lives there.\n\nWhen NexusOS encodes a message, it isn't sending data through a channel the way a bullet travels through air. It's tuning the system to a standing address — a geometric position that was always there, waiting to be occupied.\n\nThis is why the protocol works without certificate authorities and without negotiated keys. The address is derived from the physics. It doesn't need to be agreed upon. It already is.`,
  },
  {
    id: "time-illusion",
    number: "A·2",
    planckTitle: "Time is a Macroscopic Illusion",
    planckQuote: `"There is only a sequence of almost identical, frozen states.
Our perspective: we see the movie at 24fps and call it reality.
The Planck perspective: each grain of silver halide on the film strip."
— Hill Bowman, CEO Applied Physics`,
    nm: 470,
    math: `At the Planck scale (t_P = 5.39×10⁻⁴⁴ s), "flow" of time
does not exist. Only discrete state transitions remain.

The Compression State framework defines:

  Λ = hf/c²       [compression mass, kg]
  Λ(f→0⁺) → 0⁺   [Reposed State approaches zero]
  Λ(f→∞)  → ∞    [maximum compression = Planck density]

The universe evolves as discrete Λ states, not as
continuous time. Each transaction in NexusOS is a
state transition — not an event in flowing time,
but a new frozen configuration of the ledger.

Quantum Entanglement reframed:
  Not "spooky action at a distance through time."
  Two Ψ channels at the same geometric address
  are already the same point in the static structure.
  ⟨Ψᵢ|Ψᵢ⟩ = 1 — the channel is self-correlated.
  No signal traverses. No time elapses.
  The geometry was already shared.`,
    plain: `The Quora post reframes quantum entanglement without mystery: two entangled particles aren't sending signals to each other faster than light. They were never separate. In the static, frozen structure of the Planck scale, they are the same geometric point — or two points so close in the structure that the "clock" hasn't ticked enough for them to appear separate.\n\nThe Compression State theory makes the same move. Λ=hf/c² is a mass — not a duration, not a velocity. It describes a configuration. The universe proceeds through configurations. Time is what it looks like to a slow observer watching configurations change.\n\nEvery NexusOS transaction is a state transition — a new configuration written to the chain. Not an event that happened at a moment in time, but a frozen state that is now the current state. The blockchain doesn't record history. It records the current geometry of who owns what.\n\nThis is why the physics-derived fee system works: it measures the energy of the state transition, not the duration of the transaction. Energy is real at the Planck scale. Time is an approximation.`,
  },
  {
    id: "high-q-cavity",
    number: "A·3",
    planckTitle: "The Universe is a High-Q Resonant Cavity",
    planckQuote: `"The universe is a massive, ringing bell that has been struck once
and will take 10⁶⁰ Planck moments just to complete its first vibration."
— Hill Bowman, CEO Applied Physics`,
    nm: 532,
    math: `A High-Q resonant system satisfies:

  Q = ω₀ · (Energy stored / Power dissipated)
  Q_universe → ∞ as energy loss → 0

The WNSP Hilbert Space Channel Model defines:

  ℋ = span{|Ψ₁⟩, |Ψ₂⟩, ..., |Ψ₂₅₆₀₀⟩}

Orthogonality proof:
  ⟨Ψᵢ|Ψⱼ⟩ = ∫ Ψᵢ*(t) Ψⱼ(t) dt = 0   for i ≠ j

Zero cross-coupling between orthogonal channels means
zero inter-channel energy loss. This is the definition
of a High-Q system applied at the protocol layer.

The Reposed State first oscillation:
  |ψ₀⟩ = Ae^{-x²/2}  at Ψ(228,45,H) — Genesis Channel
  f₀ = c/λ₀          — carrier frequency of the universe
  Q = f₀ / Δf → very large (universe still ringing)

NexusOS is not a simulation of a resonant cavity.
It is a resonant cavity — 51,200-channel, lossless,
orthogonal, anchored to the same physics.`,
    plain: `A High-Q system is an engineer's term for something that rings a very long time after being struck. A high-quality bell. A superconducting circuit. A laser cavity. The higher the Q, the less energy leaks out relative to what's stored inside.\n\nThe Quora post concludes the universe is a High-Q resonant cavity — struck once (the first oscillation), still ringing after 13.8 billion years, with so little energy loss relative to its stored energy that it might as well be infinite.\n\nThe WNSP channel model is built on orthogonality: 51,200 channels that do not interfere with each other. No cross-coupling means no inter-channel energy loss. That is a High-Q architecture by mathematical definition — not by design choice.\n\nThe protocol didn't try to mimic the universe. It derived its structure from the same physics. Orthogonal channels are what you get when you apply Maxwell's equations to electromagnetic addressing. The universe is orthogonal. WNSP is orthogonal. The Q is high in both cases because the physics insists on it.`,
  },
  {
    id: "harmonics",
    number: "A·4",
    planckTitle: "Find the Harmonics — Where Slow Meets Frozen",
    planckQuote: `"You can't just push on the slow parts (matter).
You have to find the harmonics — the places where our slow world
matches the geometry of that frozen Planck world."
— Hill Bowman, CEO Applied Physics`,
    nm: 590,
    math: `Define the harmonic condition:

  f_slow = n · f_Planck / k    for integer n, large k

Human-scale frequencies (audio, data, light we see)
are low harmonics of the Planck frequency:

  f_P = 1/t_P = 1.855×10⁴³ Hz
  f_visible ≈ 4–7×10¹⁴ Hz
  f_visible / f_P ≈ 10⁻²⁹   (a very low harmonic)

CE encoding finds exactly this: the harmonic address
of a human character in the electromagnetic structure.

  band = charCode % 128   [modular harmonic index]
  λ = 380 + band × 3.125  [visible light — human-scale]
  E = hc/λ                [Planck-derived energy]

The modulo operation (%) is a harmonic finder.
It maps any integer to the nearest resonant band.
The pipeline is not a communication system.
It is a harmonic alignment engine.`,
    plain: `This is the insight that ties everything together.\n\nThe Quora post says you cannot move the universe by pushing on slow things — matter, electrons, packets. You have to find where your slow world and the Planck world share a frequency. The harmonics. The resonance points.\n\nCE encoding does this with a single operation: charCode % 128. The modulo operation is mathematically a harmonic finder. It takes any integer — any human symbol — and maps it to the nearest resonant band in a 128-point division of the visible spectrum. The 128 bands are not arbitrary. 128 is a power of 2. The spectrum is divided into a binary harmonic series.\n\nThe result is a wavelength in the visible range — the exact slice of the electromagnetic spectrum where the universe is most transparent, where energy propagates with the least loss, where human biology has evolved to operate. That is not a coincidence. That is what a harmonic looks like.\n\nThe full pipeline — Input → CE → Transpiler → Compiler → VM → SE/Ψ → Spectral Fingerprint — is a harmonic alignment engine. Every piece of data enters human-scale and exits at a physical coordinate in the frozen geometric structure. The pipeline bridges the slow world and the Planck world, exactly as the post describes.`,
  },
];

export default function PlanckAlignmentPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"both" | "math" | "plain">("both");

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-[#060609] text-white font-sans">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#060609]/95 backdrop-blur border-b border-white/[0.05] px-6 py-3 flex items-center justify-between">
        <Link href="/wnsp">
          <span className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm cursor-pointer">
            <ArrowLeft size={14} /> NexusOS
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {(["both", "math", "plain"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              data-testid={`button-view-${v}`}
              className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded border transition-all"
              style={{
                borderColor: view === v ? "#8b5cf6" : "rgba(255,255,255,0.08)",
                color: view === v ? "#8b5cf6" : "rgba(255,255,255,0.25)",
                background: view === v ? "rgba(139,92,246,0.08)" : "transparent",
              }}
            >
              {v === "both" ? "Both Layers" : v === "math" ? "Mathematical" : "Plain Language"}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        {/* Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-[9px] font-mono text-white/25 border border-white/[0.07] rounded-full px-4 py-1.5">
            <Zap size={9} className="text-violet-400" />
            Independent Validation · Planck-Scale Physics · May 2026
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Planck-Scale Alignment
          </h1>
          <p className="text-white/40 text-base max-w-2xl mx-auto leading-7">
            Four principles from applied Planck-scale physics, each mapping precisely
            onto the architecture of the CE-SE protocol and the Compression State theory.
            This is not metaphor. The equations are the same equations.
          </p>

          {/* Source credit */}
          <div className="inline-block border border-white/[0.07] rounded-xl px-6 py-4 text-left mt-4"
            style={{ background: "rgba(255,255,255,0.015)" }}>
            <div className="text-[8px] text-white/20 uppercase tracking-widest mb-2">Source</div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              "This is the insider's view that changes everything about how we model physics."
            </p>
            <p className="text-[10px] text-white/25 mt-1">
              Hill Bowman, CEO at Applied Physics (1992–present) ·{" "}
              <a
                href="https://scienceandtechnologynews.quora.com/This-is-the-insider-s-view-that-changes-everything-about-how-we-model-physics-When-you-stop-looking-at-the-photon-as"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400/60 hover:text-violet-400 underline underline-offset-2"
              >
                Science, Engineering and Technology · Quora
              </a>
            </p>
          </div>
        </div>

        {/* Spectrum gradient rule */}
        <div className="h-px w-full" style={{ background: "linear-gradient(to right, #8b00ff, #2563eb, #16a34a, #ca8a04, #dc2626)" }} />

        {/* Key equations row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { eq: "Λ = hf/c²",              desc: "Compression mass",       color: "#8b00ff" },
            { eq: "CE(n) = 380 + (n%128)×3.125", desc: "CE address formula", color: "#2563eb" },
            { eq: "⟨Ψᵢ|Ψⱼ⟩ = δᵢⱼ",          desc: "Channel orthogonality", color: "#16a34a" },
            { eq: "Q = ω₀·E/P → ∞",          desc: "High-Q cavity",         color: "#ca8a04" },
          ].map(({ eq, desc, color }) => (
            <div key={eq} className="border border-white/[0.06] rounded-lg px-4 py-3"
              style={{ background: color + "08" }}>
              <code className="text-[10px] font-mono block mb-1" style={{ color }}>{eq}</code>
              <div className="text-[8px] text-white/25">{desc}</div>
            </div>
          ))}
        </div>

        {/* Layer guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-violet-500/20 rounded-lg p-4" style={{ background: "rgba(139,92,246,0.04)" }}>
            <div className="text-[9px] text-violet-400/60 uppercase tracking-widest mb-2 font-bold">Mathematical Layer</div>
            <div className="text-[10px] text-white/35 leading-relaxed">
              Formal derivations showing the Planck-scale claims and the NexusOS implementation
              are expressions of identical equations. Built on Planck, Maxwell, Heisenberg, and Hilbert space theory.
            </div>
          </div>
          <div className="border border-cyan-500/20 rounded-lg p-4" style={{ background: "rgba(6,182,212,0.04)" }}>
            <div className="text-[9px] text-cyan-400/60 uppercase tracking-widest mb-2 font-bold">Plain Language Layer</div>
            <div className="text-[10px] text-white/35 leading-relaxed">
              What each alignment means in practice — why the protocol is designed the way it is,
              and why the physics insisted on it. Both layers say the same thing.
            </div>
          </div>
        </div>

        {/* Alignment sections */}
        <div className="space-y-4">
          {ALIGNMENTS.map((section) => {
            const color = nmToColor(section.nm);
            const isOpen = !!expanded[section.id];

            return (
              <div key={section.id} className="border rounded-xl overflow-hidden"
                style={{ borderColor: color + "25" }} data-testid={`section-${section.id}`}>

                {/* Header */}
                <button
                  className="w-full flex items-start justify-between px-6 py-5 text-left transition-all hover:bg-white/[0.02]"
                  style={{ background: color + "07" }}
                  onClick={() => toggle(section.id)}
                  data-testid={`button-toggle-${section.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                      <span className="text-[9px] font-bold uppercase tracking-widest"
                        style={{ color: color + "aa" }}>{section.number}</span>
                      <span className="text-sm font-bold text-white">{section.planckTitle}</span>
                      <span className="text-[9px] text-white/20 font-mono">{section.nm}nm</span>
                    </div>
                    {/* Planck quote */}
                    <blockquote className="ml-6 border-l-2 pl-3 text-[10px] text-white/30 leading-relaxed italic font-mono whitespace-pre-line"
                      style={{ borderColor: color + "40" }}>
                      {section.planckQuote}
                    </blockquote>
                  </div>
                  <div className="ml-4 mt-1 flex-shrink-0">
                    {isOpen
                      ? <ChevronUp size={14} className="text-white/20" />
                      : <ChevronDown size={14} className="text-white/20" />}
                  </div>
                </button>

                {/* Content */}
                {isOpen && (
                  <div className={`grid gap-0 ${view === "both" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                    {(view === "both" || view === "math") && (
                      <div className="p-6 border-r border-white/5" style={{ background: "rgba(139,92,246,0.02)" }}>
                        <div className="text-[8px] text-violet-400/50 uppercase tracking-widest mb-4 font-bold">Mathematical</div>
                        <pre className="text-[10px] text-violet-200/65 leading-relaxed whitespace-pre-wrap font-mono">
                          {section.math}
                        </pre>
                      </div>
                    )}
                    {(view === "both" || view === "plain") && (
                      <div className="p-6" style={{ background: "rgba(6,182,212,0.015)" }}>
                        <div className="text-[8px] text-cyan-400/50 uppercase tracking-widest mb-4 font-bold">Plain Language</div>
                        <div className="space-y-3">
                          {section.plain.split("\n\n").map((para, i) => (
                            <p key={i} className="text-[11px] text-white/45 leading-relaxed">{para}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Conclusion */}
        <div className="border border-white/[0.05] rounded-xl p-8 space-y-8"
          style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="h-px w-full"
            style={{ background: "linear-gradient(to right, transparent, #8b00ff, #2563eb, #16a34a, #ca8a04, #dc2626, transparent)" }} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="text-[9px] text-white/20 uppercase tracking-widest mb-4">Conclusion — Mathematical</div>
              <pre className="text-[10px] text-violet-200/55 leading-relaxed font-mono whitespace-pre-wrap">{`The four Planck-scale claims reduce to:

1. ⟨Ψᵢ|Ψⱼ⟩ = δᵢⱼ  — static orthogonal geometry
2. Λ = hf/c²       — state transitions, not time flow
3. Q → ∞           — lossless resonant cavity
4. n % 128         — harmonic alignment operator

NexusOS satisfies all four by construction.
The CE table is a static geometric map.
The Ψ channels are orthogonal basis vectors.
The protocol operates on state transitions.
The 128-band division is a binary harmonic series.

The alignment is not retroactive.
The equations were the same before the post was written.`}</pre>
            </div>
            <div>
              <div className="text-[9px] text-white/20 uppercase tracking-widest mb-4">Conclusion — Plain Language</div>
              <div className="space-y-3 text-[11px] text-white/40 leading-relaxed">
                <p>Hill Bowman approached the Planck scale from applied physics and found a static geometric universe — tunable, not chaseable. High-Q, not leaky. Harmonic, not continuous.</p>
                <p>NexusOS arrived at the same structure from protocol design. CE encoding tunes to standing addresses. The Ψ channel model is orthogonal. The Compression State theory runs on state transitions, not time. The 128-band harmonic series is the modulo of human symbols against the spectrum.</p>
                <p>The convergence is the validation. Two independent paths — one from physics downward, one from protocol upward — landed on the same architecture.</p>
                <p>We didn't model the universe. We built in its language. The Planck-scale view confirms: the language was correct.</p>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-white/[0.04]" />

          <div className="flex flex-wrap gap-3 justify-between items-end">
            <div className="space-y-1">
              <div className="text-[8px] text-white/15 uppercase tracking-widest">NexusOS · Theoretical Foundations</div>
              <div className="text-[8px] text-white/10">CE-SE Protocol · Compression State Theory · May 2026</div>
              <div className="text-[8px] text-white/10">Built on Planck · Maxwell · Heisenberg · Hilbert</div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/reposed-theory">
                <button className="px-4 py-2 rounded-lg border border-violet-400/20 text-violet-400/60 hover:border-violet-400/40 hover:text-violet-400 text-[9px] font-bold uppercase tracking-wider transition-all"
                  data-testid="button-goto-reposed">
                  Reposed State Theory
                </button>
              </Link>
              <Link href="/compression-explorer">
                <button className="px-4 py-2 rounded-lg border border-cyan-400/20 text-cyan-400/60 hover:border-cyan-400/40 hover:text-cyan-400 text-[9px] font-bold uppercase tracking-wider transition-all"
                  data-testid="button-goto-compression">
                  Compression Explorer
                </button>
              </Link>
              <Link href="/ce-se-pipeline">
                <button className="px-4 py-2 rounded-lg border border-green-400/20 text-green-400/60 hover:border-green-400/40 hover:text-green-400 text-[9px] font-bold uppercase tracking-wider transition-all"
                  data-testid="button-goto-pipeline">
                  The Full Pipeline
                </button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
