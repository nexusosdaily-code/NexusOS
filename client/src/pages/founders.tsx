import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { ArrowLeft } from "lucide-react";

const DATE = "2026-06-25";

const FOUNDERS = [
  {
    name: "James Clerk Maxwell",
    years: "1831 – 1879",
    nation: "Scotland",
    equation: "∇ × E = −∂B/∂t  ·  ∇ × B = μ₀ε₀ ∂E/∂t",
    contribution: "Maxwell's field equations prove that electromagnetic waves exist, propagate at c, and are fully described by frequency and wavelength. Every Ψ channel in NexusOS is a solution to these equations. The 25,600 orthogonal channels are not software constructs — they are orthogonal field modes permitted by Maxwell's mathematics. The PHR-1 bifilar coil produces a standing field described entirely in his language.",
    nexusos: "WNSP channel space · PHR-1 field geometry · all wnsp:// addressing",
  },
  {
    name: "Max Planck",
    years: "1858 – 1947",
    nation: "Germany",
    equation: "E = hf",
    contribution: "Planck's constant h connects energy to frequency — not metaphorically, but exactly. Every transaction fee in NexusOS is derived from E=hf. Higher frequency means higher energy means higher cost. This is not a design decision. It is physics enforced in code. Planck discovered that energy is quantised; NexusOS makes every economic action a quantum of energy exchange.",
    nexusos: "All fee calculations · authority band energy levels · NXT transaction costs",
  },
  {
    name: "Albert Einstein",
    years: "1879 – 1955",
    nation: "Germany / Switzerland",
    equation: "E = mc²  ·  Λ = hf / c²",
    contribution: "Einstein's invariance of c gives NexusOS its anchor. c is the same in every jurisdiction, for every nation, at every frequency. The compression state equation Λ=hf/c² — the foundation of the Theory of Compression States — is Einstein's mass-energy equivalence extended to information. Matter is a high-compression state. Light is a lower one. NexusOS encodes that continuum.",
    nexusos: "Λ=hf/c² compression equation · all compression state calculations · Lambda Gate substrate",
  },
  {
    name: "Nikola Tesla",
    years: "1856 – 1943",
    nation: "Serbia / United States",
    equation: "Bifilar coil — phase-opposed winding cancels self-inductance, amplifies field symmetry",
    contribution: "Tesla demonstrated that wound coils produce controllable, measurable electromagnetic fields with geometric precision. The PHR-1 hardware proof uses a bifilar toroidal winding — his technique, unchanged. He also understood resonance as a physical mechanism, not an analogy. When the PHR-1 is phase-swept from 0° to 360°, it traces a resonance landscape Tesla would have recognised immediately.",
    nexusos: "PHR-1 bifilar coil design · hardware resonator · standing field generation",
  },
  {
    name: "Werner Heisenberg  ·  Erwin Schrödinger  ·  Paul Dirac",
    years: "1901–1976  ·  1887–1961  ·  1902–1984",
    nation: "Germany  ·  Austria  ·  England",
    equation: "⟨Ψᵢ | Ψⱼ⟩ = δᵢⱼ",
    contribution: "Quantum mechanics gave us Hilbert space — an infinite-dimensional space where states are orthogonal by mathematical necessity, not policy. The 25,600 WNSP channels are orthogonal in exactly this sense: ⟨Ψᵢ|Ψⱼ⟩ = 0 is guaranteed by physics, not enforced by software. Interference between channels is impossible by construction. This is the security model. No cryptographic primitive needed — just quantum mechanics.",
    nexusos: "Hilbert space channel orthogonality · all 25,600 Ψ registers · WNSP VM channel isolation",
  },
  {
    name: "Claude Shannon",
    years: "1916 – 2001",
    nation: "United States",
    equation: "H = −∑ pᵢ log₂ pᵢ  ·  C = B log₂(1 + S/N)",
    contribution: "Shannon proved that information is physical — it has entropy, capacity, and geometric structure. His channel capacity theorem defines the maximum information any physical channel can carry. The WNSP density equation D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M is Shannon's capacity theorem applied to the Ψ channel Hilbert space. WASCII spectral histograms are Shannon entropy made visible. Every CE encoding is an assignment of a symbol to a physical state, exactly as Shannon described.",
    nexusos: "WNSP density equation · WASCII spectral encoding · all channel capacity reasoning",
  },
];

export default function FoundersPage() {
  usePageMeta("/founders");

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">

      {/* Nav */}
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/hub" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-500 font-mono">NexusOS · The Founding Architects</span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">{DATE}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">

        {/* ── Opening dedication ── */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border"
            style={{ color: "#8b5cf6", borderColor: "#8b5cf644", background: "#8b5cf610" }}>
            DEDICATION · THE FOUNDING ARCHITECTS OF NEXUSOS
          </div>

          <h1 className="text-2xl font-bold text-white leading-tight">
            The Founding Architects
          </h1>

          <div className="space-y-4 text-slate-400 text-sm leading-7">
            <p>
              NexusOS did not originate from a startup, a lab, or a whitepaper. It originated from
              six scientists who lived across two centuries and never met in the same room. They each
              described a part of the same thing — the physical structure of reality at the level
              of energy, field, and information.
            </p>
            <p>
              Someone needed to turn their equations into a language. That is all that happened here.
            </p>
            <p>
              The architects are them. This work belongs to them. Every Ψ channel, every fee
              calculation, every compression state, every orthogonal register — traceable to one
              of the six names below. Not metaphorically. Directly. Line by line.
            </p>
            <p className="text-slate-300 font-medium border-l-2 border-slate-700 pl-4">
              If you follow their science to its logical conclusion — without stopping, without
              approximating, without substituting convention for physics — you arrive at exactly this:
              a wavelength-addressed, energy-governed, jurisdiction-agnostic communication and
              computation system. Kardashev Type I infrastructure is not an ambition. It is the
              predicted outcome of the equations. They wrote it. NexusOS runs it.
            </p>
          </div>
        </div>

        {/* ── Founders ── */}
        <div className="space-y-10">
          {FOUNDERS.map((f, i) => (
            <div key={i} className="space-y-4">

              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400 font-mono mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{f.name}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500 font-mono">{f.years}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-500">{f.nation}</span>
                  </div>
                </div>
              </div>

              {/* Equation */}
              <div className="ml-12 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5 font-mono">Equation</div>
                <div className="font-mono text-sm text-purple-300 tracking-wide">{f.equation}</div>
              </div>

              {/* Contribution */}
              <div className="ml-12 space-y-3">
                <p className="text-sm text-slate-400 leading-7">{f.contribution}</p>
                <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-4 py-2.5">
                  <span className="text-[10px] text-cyan-700 uppercase tracking-widest font-mono">In NexusOS — </span>
                  <span className="text-xs text-cyan-400">{f.nexusos}</span>
                </div>
              </div>

              {i < FOUNDERS.length - 1 && (
                <div className="ml-12 border-b border-slate-800/60 mt-6" />
              )}
            </div>
          ))}
        </div>

        {/* ── The Extension ── */}
        <section className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border"
              style={{ color: "#f59e0b", borderColor: "#f59e0b44", background: "#f59e0b10" }}>
              THE EXTENSION · THEORY OF COMPRESSION STATES · 2025–2026
            </div>
            <h2 className="text-lg font-bold text-white">What Was Extended</h2>
          </div>

          <div className="text-sm text-slate-400 leading-7 space-y-4">
            <p>
              The six founding scientists each described a piece of the same structure.
              None of them unified the pieces. Maxwell did not connect his field equations
              to Planck's quantisation. Planck did not connect E=hf to Einstein's E=mc².
              Shannon described information entropy without knowing the field geometry that
              carries it. Each worked in their domain and handed their fragment forward.
            </p>
            <p>
              The <span className="text-amber-300 font-semibold">Theory of Compression States</span> is
              the unifying extension. It begins at the only honest starting point — before measurement,
              before the observer:
            </p>
          </div>

          {/* Primordial field premise */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <div className="text-[10px] text-amber-700 uppercase tracking-widest font-mono">Primordial Field Theory — First Premise</div>
            <p className="text-sm text-amber-100 font-medium leading-6">
              The universe begins with a single unobserved oscillation. It has frequency.
              Therefore it has energy. Therefore it has a compression state. Everything
              that follows — matter, light, field, information — is that oscillation
              at different stages of compression.
            </p>
            <div className="font-mono text-lg text-amber-300 tracking-wide pt-1">
              Λ = hf / c²
            </div>
            <p className="text-xs text-slate-500 leading-5">
              Where Λ is the compression state, h is Planck's constant, f is frequency,
              and c is the invariant speed of light. This equation bridges Planck and Einstein
              directly — it was in both their works, unrealised. Mass is high-Λ (high frequency,
              high compression). Light is low-Λ. Information occupies every point on that continuum.
            </p>
          </div>

          {/* Extension table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-2.5 text-left text-slate-500 uppercase tracking-widest text-[9px]">Original Work</th>
                  <th className="px-4 py-2.5 text-left text-slate-500 uppercase tracking-widest text-[9px]">The Extension</th>
                  <th className="px-4 py-2.5 text-left text-slate-500 uppercase tracking-widest text-[9px]">Result in NexusOS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    original: "Maxwell — EM field equations",
                    extension: "Extended field modes to a 3-dimensional Ψ channel space: WDM × OAM × polarisation, producing 25,600 orthogonal channels from physical field geometry",
                    result: "WNSP Hilbert channel space",
                  },
                  {
                    original: "Planck — E = hf",
                    extension: "Combined with Einstein's c² to derive Λ=hf/c², making energy and compression state the same quantity measured at different scales",
                    result: "Compression state equation · all fee physics",
                  },
                  {
                    original: "Einstein — E = mc²",
                    extension: "Inverted to m=hf/c² — mass re-read as a high-frequency compression state, not a separate substance. Matter and information on one continuum",
                    result: "Λ=hf/c² · Lambda Gate · gravity de-correlation path",
                  },
                  {
                    original: "Heisenberg / Dirac — Hilbert space ⟨Ψᵢ|Ψⱼ⟩ = δᵢⱼ",
                    extension: "Applied Hilbert orthogonality to physical EM channels, not abstract quantum states. Each Ψ channel is a physical field mode, orthogonal by Maxwell + QM simultaneously",
                    result: "25,600 channel registers · WNSP VM · zero-interference routing",
                  },
                  {
                    original: "Shannon — H = −∑ pᵢ log₂ pᵢ",
                    extension: "Extended channel capacity into Hilbert space dimensions: D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M — capacity as a physical geometric quantity, not a bandwidth budget",
                    result: "WNSP density equation · WASCII spectral histograms",
                  },
                  {
                    original: "All six — isolated domains",
                    extension: "Unified by the primordial field premise: one oscillation, one compression continuum, one language. CE encoding maps every human symbol to a physical compression state on that continuum",
                    result: "CE_TABLE · WavelengthScript · the entire NexusOS protocol stack",
                  },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors align-top">
                    <td className="px-4 py-3 text-slate-300 font-semibold text-[11px] leading-5 whitespace-nowrap pr-6">{row.original}</td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] leading-5">{row.extension}</td>
                    <td className="px-4 py-3 text-cyan-400 text-[11px] leading-5 whitespace-nowrap">{row.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-slate-400 leading-7 space-y-3">
            <p>
              The founding scientists handed their fragments forward. The extension was to
              recognise they were describing the same structure from different angles — and to
              derive the bridge equations that complete the picture. Not new physics. The
              same physics, finally connected.
            </p>
            <p className="text-slate-300 font-medium border-l-2 border-amber-500/40 pl-4">
              The primordial field asks one question: what is the universe before the first observation?
              The answer — a single oscillation — produces every equation in the founding corpus,
              unified. That unification is the Theory of Compression States. NexusOS is what
              that theory looks like when you write it as executable code.
            </p>
          </div>
        </section>

        {/* ── Kardashev conclusion ── */}
        <section className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-4">
          <h2 className="text-sm font-bold text-purple-300">The Inevitable Conclusion</h2>
          <div className="text-xs text-slate-400 leading-6 space-y-3">
            <p>
              Nikolai Kardashev described a civilisation's advancement by its capacity to harness
              energy — planetary scale (Type I), stellar scale (Type II), galactic scale (Type III).
              He was measuring a physical quantity: watts mastered.
            </p>
            <p>
              What Maxwell, Planck, Einstein, Tesla, the quantum mechanicians, and Shannon collectively
              described is the physics of how information and energy relate. Follow those equations
              without approximation and you get a communication system that operates at the speed of
              light, is governed by energy cost, requires no trusted intermediary, and scales to any
              physical substrate — including photonic ASICs, including stellar distances.
            </p>
            <p className="text-slate-300 font-medium">
              NexusOS is not an attempt to build Kardashev Type I. It is the natural language
              that a Kardashev Type I civilisation would already be speaking. The founders wrote
              that language between 1864 and 1948. We are running it now.
            </p>
            <p>
              Energy generation, global distribution, gravity de-correlation, mass displacement —
              these are extensions of the same physics. The same six equations. The same founders.
              The work continues until the science runs out. The science does not run out.
            </p>
          </div>
        </section>

        {/* ── Closing dedication ── */}
        <section className="border-t border-slate-800 pt-8 space-y-3 text-center">
          <p className="text-slate-600 text-xs uppercase tracking-widest font-mono">Dedicated to</p>
          <div className="space-y-1">
            {["James Clerk Maxwell", "Max Planck", "Albert Einstein", "Nikola Tesla",
              "Werner Heisenberg  ·  Erwin Schrödinger  ·  Paul Dirac", "Claude Shannon"].map(n => (
              <p key={n} className="text-slate-300 text-sm font-semibold">{n}</p>
            ))}
          </div>
          <p className="text-slate-600 text-xs pt-4 max-w-md mx-auto leading-5">
            Scientists who described the universe honestly, published what they found,
            and handed it forward without condition. NexusOS runs on their work.
            The work belongs to them.
          </p>
          <p className="text-slate-700 text-xs font-mono pt-2">
            Te Rata Pou · Aotearoa New Zealand · {DATE}
          </p>
        </section>

        {/* ── Navigation ── */}
        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { href: "/oscillating-quanta", label: "First Principles" },
            { href: "/hardware-spec",      label: "Hardware Specification" },
            { href: "/joint-venture",      label: "Global Joint Venture" },
            { href: "/poc",               label: "Hardware PoC Scope" },
            { href: "/compression-explorer", label: "Compression Explorer" },
            { href: "/constitution",       label: "Constitution" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="block border border-slate-800 rounded-lg px-3 py-2.5 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-center">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-slate-700 text-[10px] font-mono pb-4">
          AGPL-3.0 · NexusOS · The Founding Architects · {DATE}
        </p>

      </div>
    </div>
  );
}
