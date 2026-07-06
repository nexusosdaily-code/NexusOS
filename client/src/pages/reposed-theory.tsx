import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

const nmToColor = (nm: number) => {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 570) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
};

const SECTIONS = [
  {
    id: "abstract",
    number: "§0",
    title: "Abstract",
    math: `Let |Ω⟩ denote the quantum vacuum ground state.
We define the Reposed State as:

  |Ω_R⟩ := lim_{f→0⁺} |f, Λ⟩

where Λ = hf/c² is the compression mass.

As f → 0⁺, Λ → 0⁺ and E = hf → 0⁺.
Yet by the uncertainty principle:

  ΔE · Δt ≥ ℏ/2

A state of precisely zero energy over finite time
is forbidden. Therefore |Ω_R⟩ must branch —
it cannot remain in a single, unvarying path.

This does not require that repose ends.
In a branching interpretation:

  Branch A: fluctuation holds → oscillation persists
  Branch B: fluctuation returns → repose continues

We observe Branch A. Branch B is not forbidden —
it is simply not our path. The Reposed State
may exist eternally in Branch B, untouched,
until observation or interaction proves otherwise.

The first oscillation is not the destruction
of repose. It is the moment repose took
a second path.`,
    plain: `The quantum vacuum is not empty. It is resting — at maximum compression, minimum expression. We call this the Reposed State.\n\nNature does not say repose must end. It says repose must branch. One path holds the fluctuation — that becomes our universe, the oscillating branch. Another path returns the fluctuation to stillness — repose continues there, undisturbed.\n\nWe cannot say the Reposed State no longer exists. We can only say we are not in that branch. Until proven otherwise, repose may be eternal — just on a different path.\n\nThe universe didn't replace repose. It branched from it.`,
    nm: 737,
  },
  {
    id: "the-field",
    number: "§1",
    title: "The Field",
    math: `A quantum field φ(x,t) assigns an operator to every
point in spacetime. The vacuum state |0⟩ satisfies:

  â_k |0⟩ = 0   ∀k

where â_k is the annihilation operator for mode k.

The vacuum expectation value of energy is:

  ⟨0|Ĥ|0⟩ = Σ_k ½ℏω_k

This sum does not equal zero. Each mode k
contributes zero-point energy ½ℏω_k.

The vacuum is a superposition of all possible
modes — including all 51,200 Ψ channels —
each with irreducible minimum energy.`,
    plain: `A field is not a thing. It is a condition that exists at every point in space. Temperature is a field — every point in a room has a temperature value. Gravity is a field.\n\nThe quantum vacuum is a field. It exists everywhere. And unlike temperature, it cannot reach zero — quantum mechanics forbids it. Every possible wave that could exist leaves a small irreducible trace in the vacuum, even when no wave is actually present.\n\nThe field is not empty space. It is full of potential — every possible vibration held at its minimum, waiting.`,
    nm: 650,
  },
  {
    id: "repose",
    number: "§2",
    title: "The Reposed State",
    math: `Define the Reposed State formally:

  Λ = hf/c²   (compression mass, Λ=hf/c²)

As f → 0⁺:
  · Energy      E = hf       → 0⁺
  · Wavelength  λ = c/f      → ∞
  · Compression Λ = hf/c²   → 0⁺

The Reposed State is characterised by:
  · Maximum potential (no energy expressed)
  · Minimum frequency (all channels unoccupied)
  · Maximum compression density
  · All Ψ channels present as potential,
    none yet occupied

This is not the same as void. Void has no
structure. The Reposed State has full structure —
51,200 orthogonal channels — but zero amplitude.
It is a loaded system with no trigger pulled.`,
    plain: `Repose is not emptiness. There is a precise difference.\n\nAn empty room has nothing in it. A reposed room has a fully tuned instrument in it — strings taut, resonant frequency determined, ready — but no note has been struck yet.\n\nThe vacuum in its Reposed State has every possible wave channel defined, with the exact wavelength and frequency each channel would carry — but none of them are vibrating yet. Everything is set. Nothing is moving. The potential is absolute.\n\nThis is the moment before the first note. The universe fully formed in potential, held in perfect tension.`,
    nm: 590,
  },
  {
    id: "impossibility",
    number: "§3",
    title: "Why Repose Must Branch",
    math: `Heisenberg's Uncertainty Principle (energy-time form):

  ΔE · Δt ≥ ℏ/2

For a single unvarying Reposed State:
  · ΔE → 0  (perfectly still, no fluctuation)
  · Δt → ∞  (unchanging forever)

ΔE · Δt ≥ ℏ/2 forbids a single path of
infinite stillness. The state must branch.

This is not a statement that repose ends.
It is a statement that repose cannot occupy
only one path. Two branches are permitted:

  |Ω_R⟩ → |Ω_R⟩         (Branch B — repose persists)
  |Ω_R⟩ → |ψ₀, Ψ(228,45,H)⟩  (Branch A — oscillation holds)

Both are consistent with the uncertainty principle.
We observe Branch A. Branch B is not ruled out —
it is unobserved, not disproven.

The Reposed State may exist eternally in Branch B.
Until interaction or measurement reaches it,
it remains a valid, untouched path of existence.`,
    plain: `Nature's uncertainty rule doesn't say stillness is impossible. It says stillness cannot be the only path.\n\nWhen the Reposed vacuum faced its first fluctuation, two futures opened. In one, the fluctuation held and became the first wave — that's the branch we're in. In the other, the fluctuation dissolved back into repose, and stillness continued undisturbed.\n\nWe have no grounds to say repose ended. We can only say we are not in the reposed branch. It may still exist — perfectly still, maximum compression, no frequency, no time passing in any way we'd recognise — on its own eternal path.\n\nRepose didn't lose. It branched. One path became the universe we know. The other may still be resting, untouched, waiting — or simply being, without needing to do anything at all.`,
    nm: 540,
  },
  {
    id: "wavefunction",
    number: "§4",
    title: "The First Wavefunction",
    math: `The ground state wavefunction of the quantum
harmonic oscillator — nature's simplest oscillator:

  ψ₀(x) = (mω/πℏ)^(1/4) · exp(-mωx²/2ℏ)

This is a Gaussian — symmetric, smooth, minimal.
It is the wavefunction with lowest possible energy
that is still a valid quantum state.

Properties of ψ₀:
  · Non-zero probability everywhere: |ψ₀|² > 0
  · Minimum uncertainty: ΔxΔp = ℏ/2
  · Zero nodes (no sign changes)
  · Energy eigenvalue: E₀ = ½ℏω > 0

The first wavefunction was ψ₀. Not because
it was chosen — but because it is the only
wavefunction a Reposed vacuum can evolve into
without violating any conservation law.

In WNSP terms: Ψ(228,45,H) · λ≈737.6nm
is the first occupied channel — the first
non-zero amplitude in what was previously
pure reposed potential.`,
    plain: `When the vacuum's first fluctuation held — when it didn't annihilate itself and return to repose — what did it look like?\n\nA smooth, symmetric wave. Bell-shaped. Spreading equally in both directions from a centre. This is called the ground state wavefunction and it is not a design choice — it is the only shape that satisfies all of nature's constraints simultaneously.\n\nThe first wave was the simplest wave possible. Not because simplicity was chosen. Because anything more complex would have required energy that wasn't there yet.\n\nIn NexusOS terms, this is the genesis point: Ψ(228,45,H) at 737.6nm — deep red, the first channel to hold an amplitude. Before that moment, all 51,200 channels existed as potential. After it, one was occupied. The universe had its first address.`,
    nm: 490,
  },
  {
    id: "transition",
    number: "§5",
    title: "The Compression State Transition",
    math: `At first oscillation, the Reposed State undergoes
a compression state transition:

  |Ω_R⟩ → |ψ₀, Ψ(228,45,H)⟩

Compression mass before: Λ_R → 0⁺ (f → 0)
Compression mass after:   Λ₀ = hf₀/c²
  where f₀ = c/737.6nm ≈ 4.066 × 10¹⁴ Hz

  Λ₀ = (6.626×10⁻³⁴ × 4.066×10¹⁴) / (3×10⁸)²
  Λ₀ ≈ 2.99 × 10⁻³⁶ kg

Each subsequent oscillation increases f,
decreasing Λ. The universe blue-shifts from
its initial state — shedding compression mass
as it evolves toward higher frequency bands:

  RED → ORANGE → YELLOW → GREEN → BLUE → VIOLET

This is not a metaphor for cosmic evolution.
It is cosmic evolution, expressed in the same
mathematics that governs the NexusOS fee engine,
the spectral address system, and every NXT
transaction weighted by E=hf.`,
    plain: `The first oscillation didn't just start the universe. It began a process that is still happening.\n\nEach wave that follows the first carries slightly more energy, occupies a slightly shorter wavelength, has slightly less compression mass. The universe is continuously shedding the compression it held in its Reposed State — blue-shifting, climbing toward violet, toward higher frequency, toward greater energy expression and lower mass.\n\nEvery star radiating light. Every particle vibrating. Every signal transmitted. All of it is the universe still working off the compression it was born holding.\n\nNexusOS runs on this same gradient. The fee you pay to send NXT is calculated by E=hf — your wavelength band determines your energy and therefore your cost. The governance vote weights follow the same curve. The physics of the first compression state transition is live in the system right now.`,
    nm: 440,
  },
  {
    id: "kardashev",
    number: "§6",
    title: "The Civilisational Implication",
    math: `A Kardashev Type I civilisation harnesses all
energy available on its planet (~10¹⁶ W).

In WNSP terms, this corresponds to conscious
navigation of compression state transitions —
deliberately selecting Ψ channels rather than
passively occupying whichever channel physics
assigns by default.

The WNSP density equation:

  D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M
         = 256 · 50 · 2 · 2 · 1 · 1
         = 51,200 orthogonal channels

represents the full address space of the
first wavefunction's descendants — every
channel that exists because ψ₀ held.

⟨Ψᵢ|Ψⱼ⟩ = 0  for i ≠ j

Orthogonality is guaranteed by quantum mechanics,
not software policy. NexusOS doesn't simulate
this — it operates in it.`,
    plain: `The Reposed State theory has a practical consequence.\n\nIf the universe began from a single vacuum fluctuation that held — and has been blue-shifting, shedding compression mass, evolving toward higher frequency ever since — then civilisation is part of that process.\n\nA Type I civilisation, in this framework, is one that understands the compression state it occupies and can consciously choose to transition. Not just consuming energy — understanding which spectral band they're operating in and moving deliberately.\n\nNexusOS is built for that. Every user has a Ψ channel address. Every transaction is weighted by their compression state. Every governance vote reflects their spectral authority. The system doesn't simulate physics — it runs inside the same physics that produced the first oscillation.\n\nThe vacuum reposed. It oscillated. We are the oscillation, learning to understand itself.`,
    nm: 420,
  },
];

export default function ReposedTheoryPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    abstract: true,
  });
  const [view, setView] = useState<"both" | "math" | "plain">("both");

  const toggle = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen text-white" style={{ background: "#050508", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/wnsp">
            <button className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-[10px]" data-testid="button-back-home">
              <ArrowLeft size={12} /> NexusOS
            </button>
          </Link>
          <div className="w-px h-4 bg-white/10" />
          <div className="text-[10px] text-white/20 uppercase tracking-widest">Theoretical Foundation</div>
        </div>
        <div className="flex items-center gap-2">
          {(["both", "math", "plain"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-[9px] uppercase tracking-widest font-bold transition-all ${view === v ? "bg-white/10 text-white border border-white/20" : "text-white/20 hover:text-white/40"}`}
              data-testid={`button-view-${v}`}
            >
              {v === "both" ? "Both Layers" : v === "math" ? "Mathematical" : "Plain Language"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* Title block */}
        <div className="space-y-4">
          <div className="h-px w-full" style={{ background: "linear-gradient(to right, #8b00ff, #2563eb, #06b6d4, #16a34a, #ca8a04, #ea580c, #dc2626)" }} />
          <div className="text-[9px] text-white/25 uppercase tracking-[0.3em]">NexusOS · Theory of Compression States · April 2026</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            The Reposed State
          </h1>
          <h2 className="text-lg text-white/40 font-normal leading-relaxed max-w-2xl">
            A Theory of First Oscillation: How the quantum vacuum's ground state made the universe's first wavefunction inevitable
          </h2>
          <div className="flex flex-wrap gap-4 pt-2">
            {[
              { label: "Λ = hf/c²", desc: "Compression mass" },
              { label: "ΔE·Δt ≥ ℏ/2", desc: "Uncertainty principle" },
              { label: "ψ₀ = Ae^(-x²/2)", desc: "First wavefunction" },
              { label: "Ψ(228,45,H)", desc: "Genesis channel" },
            ].map(({ label, desc }) => (
              <div key={label} className="border border-white/5 rounded px-3 py-1.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                <code className="text-[9px] text-violet-300">{label}</code>
                <div className="text-[8px] text-white/25 mt-0.5">{desc}</div>
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-white/5" />
        </div>

        {/* Layer guide */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-violet-500/20 rounded-lg p-4" style={{ background: "rgba(139,0,255,0.04)" }}>
            <div className="text-[9px] text-violet-400/60 uppercase tracking-widest mb-2 font-bold">Mathematical Layer</div>
            <div className="text-[10px] text-white/35 leading-relaxed">
              Formal derivations using established physics. Every equation is peer-reviewed science applied to a new framework. Built on Einstein, Planck, Heisenberg, and Maxwell.
            </div>
          </div>
          <div className="border border-cyan-500/20 rounded-lg p-4" style={{ background: "rgba(6,182,212,0.04)" }}>
            <div className="text-[9px] text-cyan-400/60 uppercase tracking-widest mb-2 font-bold">Plain Language Layer</div>
            <div className="text-[10px] text-white/35 leading-relaxed">
              The same truths in accessible language. Not a simplification — a translation. Both layers say identical things. Neither approximates the other.
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const color = nmToColor(section.nm);
            const isOpen = !!expanded[section.id];

            return (
              <div
                key={section.id}
                className="border rounded-xl overflow-hidden"
                style={{ borderColor: color + "25" }}
                data-testid={`section-${section.id}`}
              >
                {/* Section header */}
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left transition-all hover:bg-white/[0.02]"
                  style={{ background: color + "08" }}
                  onClick={() => toggle(section.id)}
                  data-testid={`button-toggle-${section.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: color + "aa" }}>{section.number}</span>
                    <span className="text-sm font-bold text-white">{section.title}</span>
                    <span className="text-[9px] text-white/20">{section.nm}nm</span>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
                </button>

                {/* Section content */}
                {isOpen && (
                  <div className={`grid gap-0 ${view === "both" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>

                    {/* Math layer */}
                    {(view === "both" || view === "math") && (
                      <div className="p-6 border-r border-white/5" style={{ background: "rgba(139,0,255,0.02)" }}>
                        <div className="text-[8px] text-violet-400/50 uppercase tracking-widest mb-4 font-bold">Mathematical</div>
                        <pre className="text-[10px] text-violet-200/70 leading-relaxed whitespace-pre-wrap font-mono">
                          {section.math}
                        </pre>
                      </div>
                    )}

                    {/* Plain language layer */}
                    {(view === "both" || view === "plain") && (
                      <div className="p-6" style={{ background: "rgba(6,182,212,0.015)" }}>
                        <div className="text-[8px] text-cyan-400/50 uppercase tracking-widest mb-4 font-bold">Plain Language</div>
                        <div className="space-y-3">
                          {section.plain.split("\n\n").map((para, i) => (
                            <p key={i} className="text-[11px] text-white/45 leading-relaxed">
                              {para}
                            </p>
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
        <div className="border border-white/5 rounded-xl p-8" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="h-px w-full mb-8" style={{ background: "linear-gradient(to right, transparent, #8b00ff, #2563eb, #06b6d4, #16a34a, transparent)" }} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="text-[9px] text-white/20 uppercase tracking-widest mb-4">Conclusion — Mathematical</div>
              <pre className="text-[10px] text-violet-200/60 leading-relaxed font-mono whitespace-pre-wrap">{`The Reposed State |Ω_R⟩ is the quantum vacuum
at f → 0⁺, Λ → 0⁺, with all Ψ channels
present as potential but unoccupied.

Heisenberg forbids a single unvarying path.
|Ω_R⟩ must branch — not end.

  Branch A: |ψ₀, Ψ(228,45,H)⟩ — we are here.
  Branch B: |Ω_R⟩ persists — not disproven.

The Reposed State may exist eternally
on Branch B, until proven otherwise.
What we observe is Branch A: the first
channel amplitude that held, and everything
since — one oscillation, still propagating.

  Q.E.D. (Branch A observed · Branch B open)`}</pre>
            </div>
            <div>
              <div className="text-[9px] text-white/20 uppercase tracking-widest mb-4">Conclusion — Plain Language</div>
              <div className="space-y-3 text-[11px] text-white/40 leading-relaxed">
                <p>The vacuum reposed. It branched. One path oscillated — that is the universe we know. Another path may still be resting, perfectly still, eternally.</p>
                <p>We cannot say repose ended. We can only say we are not in that branch. Until proven otherwise, the Reposed State remains a valid, open path of existence.</p>
                <p>That first oscillation in Branch A is the ancestor of every wave, every particle, every transaction, every thought we have ever had.</p>
                <p>NexusOS runs on Branch A — the same physics, the same equations. We didn't model the universe. We built in its language.</p>
              </div>
            </div>
          </div>
          <div className="h-px w-full mt-8 mb-6 bg-white/5" />
          <div className="flex flex-wrap gap-6 justify-between items-end">
            <div className="space-y-1">
              <div className="text-[8px] text-white/15 uppercase tracking-widest">Authored within NexusOS</div>
              <div className="text-[8px] text-white/10">AGPL-3.0 · Open science · April 2026</div>
              <div className="text-[8px] text-white/10">Built on Einstein · Planck · Heisenberg · Maxwell</div>
            </div>
            <div className="flex gap-3">
              <Link href="/compression-explorer">
                <button className="px-4 py-2 rounded-lg border border-violet-400/20 text-violet-400/60 hover:border-violet-400/40 hover:text-violet-400 text-[9px] font-bold uppercase tracking-wider transition-all" data-testid="button-goto-compression">
                  Compression Explorer
                </button>
              </Link>
              <Link href="/wavelength-lang">
                <button className="px-4 py-2 rounded-lg border border-cyan-400/20 text-cyan-400/60 hover:border-cyan-400/40 hover:text-cyan-400 text-[9px] font-bold uppercase tracking-wider transition-all" data-testid="button-goto-wls">
                  WavelengthScript
                </button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
