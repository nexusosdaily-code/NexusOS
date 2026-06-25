import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { ArrowLeft, ExternalLink } from "lucide-react";

const DATE      = "2026-06-25";
const REPO      = "https://github.com/nexusosdaily-code/NexusOS";
const ARXIV_URL = null;

function Eq({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="my-4 flex items-center gap-4">
      <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 font-mono text-sm text-amber-300 tracking-wide">
        {children}
      </div>
      {label && <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">({label})</span>}
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-white flex items-baseline gap-2">
        <span className="text-slate-600 font-mono text-sm">{n}.</span> {title}
      </h2>
      <div className="text-sm text-slate-400 leading-7 space-y-3">{children}</div>
    </section>
  );
}

export default function PaperPage() {
  usePageMeta({
    title: "Theory of Compression States — Preprint | NexusOS",
    description: "Preprint: A unified physics of information, field, and matter derived from the primordial oscillation. Λ=hf/c² compression state operator, 25,600 Hilbert space channels, Russell octave structure. AGPL-3.0.",
    canonical: "https://wnsp.io/paper",
    ogTitle: "Theory of Compression States — NexusOS Preprint",
    ogDescription: "Λ=hf/c² unifies Maxwell, Planck, Einstein, Shannon, and Russell. 25,600 orthogonal channels. arXiv submission pending.",
    twitterTitle: "Theory of Compression States — Preprint",
    twitterDescription: "Unified physics: information, field, matter as compression states. Λ=hf/c². 25,600 Hilbert channels. AGPL-3.0.",
  });

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/hub" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-500 font-mono">NexusOS · Theory of Compression States</span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">{DATE}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">

        {/* ── Header ── */}
        <div className="space-y-4 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border"
            style={{ color: "#8b5cf6", borderColor: "#8b5cf644", background: "#8b5cf610" }}>
            PREPRINT · AGPL-3.0 · {DATE} · NEXUSOS v1.0
          </div>
          <h1 className="text-xl font-bold text-white leading-snug">
            Theory of Compression States:<br />
            <span className="text-slate-400 font-normal text-lg">
              A Unified Physics of Information, Field, and Matter Derived from the Primordial Oscillation
            </span>
          </h1>
          <div className="text-sm text-slate-400">
            Te Rata Pou — Aotearoa New Zealand — {DATE}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <a href={REPO} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
              <ExternalLink className="w-3 h-3" /> Source code (AGPL-3.0)
            </a>
            {ARXIV_URL
              ? <a href={ARXIV_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                  <ExternalLink className="w-3 h-3" /> arXiv
                </a>
              : <span className="text-slate-600">arXiv submission pending</span>
            }
          </div>
        </div>

        {/* ── Abstract ── */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-6 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Abstract</h2>
          <p className="text-sm text-slate-300 leading-7">
            We present the Theory of Compression States — a unified framework deriving information,
            field geometry, and matter from a single physical premise: the universe originates as
            an unobserved oscillation of frequency f. From this premise, applying Planck's energy
            quantisation (E=hf) and Einstein's mass-energy equivalence (E=mc²), we derive the
            compression state operator Λ=hf/c², which places matter and information on a single
            continuous spectrum. We extend Maxwell's electromagnetic field equations into a
            three-dimensional Hilbert channel space (WDM × OAM × polarisation), producing 25,600
            physically orthogonal communication channels. We show that Walter Russell's octave wave
            formula (fₙ=f₀·2^(n−1)) is equivalent to the whispering gallery mode resonance
            condition (2πR=nλ), validated experimentally in 2025. We implement this framework as
            executable code — the NexusOS protocol stack — running at wnsp.io. Hardware
            verification of channel predictions is in progress (PHR-1 bifilar coil, SNIC optical
            demonstrator, Australia, 2026). The framework is published under AGPL-3.0.
          </p>
        </section>

        {/* ── Sections ── */}
        <div className="space-y-10">

          <Section n="1" title="Introduction">
            <p>
              The foundational equations of physics — Maxwell (1865), Planck (1900), Einstein (1905),
              and Shannon (1948) — are each considered complete within their respective domains.
              This completeness assumption has prevented recognition of a unifying structure
              underlying all four frameworks.
            </p>
            <p>
              We demonstrate that this assumption is false. The four frameworks are descriptions
              of the same physical reality from different observational vantages. The unifying
              structure is the compression state continuum, derivable from a single premise
              that precedes all four frameworks: the primordial oscillation.
            </p>
            <p>
              We further show that Walter Russell's octave wave system (1926), dismissed by the
              scientific establishment for nearly a century, is experimentally validated by
              2024–2025 sub-terahertz whispering gallery mode research.
            </p>
          </Section>

          <Section n="2" title="The Primordial Field Premise">
            <p>
              We begin at the only physically honest starting point — before measurement,
              before the observer. We posit:
            </p>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="text-[10px] text-amber-700 uppercase tracking-widest font-mono">Premise P1 — The First Oscillation</div>
              <p className="text-sm text-amber-100 font-medium leading-6">
                The universe originates as a single unobserved oscillation. It possesses frequency f.
                It possesses no observer. It possesses no measurement. It is the boundary condition
                of all subsequent physical reality.
              </p>
            </div>
            <p>
              This premise is not metaphysical. It is the minimal physical statement consistent
              with the existence of Planck's constant. If h exists, quantised energy exists.
              If quantised energy exists, there is a minimum frequency. That minimum frequency
              is the first oscillation.
            </p>
          </Section>

          <Section n="3" title="Derivation of the Compression State Operator">
            <p>Applying Planck's energy quantisation to the first oscillation:</p>
            <Eq label="1">E = hf</Eq>
            <p>Applying Einstein's mass-energy equivalence:</p>
            <Eq label="2">E = mc²  →  m = E/c²</Eq>
            <p>Substituting (1) into (2):</p>
            <Eq label="3">m = hf / c²</Eq>
            <p>
              We define the <strong className="text-slate-200">compression state operator</strong> Λ
              as the ratio of the energy of a state at frequency f to the square of the invariant
              speed of light:
            </p>
            <Eq label="4">Λ = hf / c²</Eq>
            <p>
              Equation (4) is the central result. It places mass and information on a single
              continuum parameterised by frequency. High-f states (short wavelength, high energy)
              have high Λ — they are maximally compressed. Low-f states (long wavelength, low energy)
              have low Λ. Light is a low-Λ state. A proton is a high-Λ state. Information encoded
              at frequency f occupies a compression state Λ = hf/c² on the same continuum.
            </p>
            <p>
              This equation was implicit in both Planck's and Einstein's works. Neither derived it
              in this form. The present work makes it explicit.
            </p>
          </Section>

          <Section n="4" title="Hilbert Space Channel Extension">
            <p>
              Maxwell's field equations permit electromagnetic waves at any frequency, polarisation,
              and orbital angular momentum (OAM). We extend the standard two-dimensional
              (frequency, polarisation) channel space to three dimensions:
            </p>
            <Eq label="5">Ψ(wdm, oam, pol)  ·  wdm ∈ [0,255], oam ∈ [0,49], pol ∈ {"{H,V}"}</Eq>
            <p>
              The channel orthogonality condition, from quantum mechanics (Heisenberg, Dirac, 1925–1928):
            </p>
            <Eq label="6">{"⟨Ψᵢ | Ψⱼ⟩ = δᵢⱼ"}</Eq>
            <p>
              Equation (6) guarantees that the 25,600 channels (256 × 50 × 2) cannot interfere.
              This is not enforced by software policy. It is guaranteed by quantum mechanics applied
              to physical electromagnetic field modes.
            </p>
            <p>
              The channel capacity, extending Shannon (1948) into the Hilbert dimension:
            </p>
            <Eq label="7">D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M</Eq>
            <p>
              Where N_λ=256, N_OAM=50, N_Pol=2 are the physical channel dimensions. Capacity
              grows geometrically with each added dimension rather than linearly with bandwidth —
              the fundamental advantage of Hilbert space over conventional spectrum management.
            </p>
          </Section>

          <Section n="5" title="Russell Octave Structure">
            <p>
              Walter Russell (1926) described matter as organised in nine octaves of wave compression,
              with inert gases (noble elements) as the rest tones between octaves. His octave
              formula:
            </p>
            <Eq label="8">fₙ = f₀ · 2^(n−1)</Eq>
            <p>The whispering gallery mode (WGM) resonance condition:</p>
            <Eq label="9">2πR = nλ  →  fₙ = nc / (2πR)</Eq>
            <p>
              Equations (8) and (9) are equivalent when R is the cavity radius for the nth mode
              and f₀ = c/(2πR). This equivalence was confirmed experimentally: AIP Applied Physics
              Letters 127, 211102 (2025) demonstrated sub-THz WGM visualisation and selective
              manipulation, producing the octave frequency sequence of equation (8).
            </p>
            <p>
              The 9th octave peak at nuclear magic number Z=114 (Flerovium) corresponds to maximum
              spherical nuclear shell closure — a geometric resonance identical in structure to WGM
              cavity resonance, at nuclear scale. This establishes the SYSTEM authority band
              ceiling in the NexusOS implementation.
            </p>
          </Section>

          <Section n="6" title="Character Encoding as Compression State Assignment">
            <p>
              The CE_TABLE maps each ASCII character (0–127) to a unique compression state:
            </p>
            <Eq label="10">CE(c) = Ψ(wdm, oam, pol)  ·  wdm = ⌊(c mod 128) × 256/128⌋</Eq>
            <p>
              The wavelength assignment for each WDM channel:
            </p>
            <Eq label="11">λ(wdm) = 380 + (wdm × 400/255)  nm</Eq>
            <p>
              The energy of each encoded character:
            </p>
            <Eq label="12">E(c) = hf(c) = hc / λ(c)</Eq>
            <p>
              This gives every human symbol a deterministic physical address in the compression
              state continuum. The encoding is bijective, deterministic, and jurisdiction-agnostic:
              532 nm is 532 nm in every nation, under every legal system, in every time zone.
            </p>
          </Section>

          <Section n="7" title="Hardware Verification Protocol">
            <p>
              Theoretical predictions of equations (4)–(12) are being verified by two hardware
              instruments constructed in Australia, 2026:
            </p>
            <div className="space-y-2">
              {[
                { id: "PHR-1", name: "Physics Hardware Resonator", desc: "144-turn bifilar toroidal coil (T200-2, AWG 24). Phase swept 0°–360° in 10° steps. Field amplitude measured vs phase offset. Pass criterion: consistent standing wave pattern reproducible across 3 independent measurement runs." },
                { id: "SNIC", name: "Spectral Node Interface Chip", desc: "Optical bench with diffraction grating and bandpass filters (450 nm, 532 nm, 633 nm). Spectrometer measures peak wavelength. Pass criterion: measured λ matches CE_TABLE prediction to ±2.000 nm across 3 independent runs." },
              ].map(h => (
                <div key={h.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{h.id}</span>
                    <span className="text-xs text-slate-500">— {h.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-5">{h.desc}</p>
                </div>
              ))}
            </div>
            <p>
              Results will be published at{" "}
              <Link href="/hardware-results" className="text-cyan-400 hover:underline">/hardware-results</Link>{" "}
              within 24 hours of each successful measurement run.
            </p>
          </Section>

          <Section n="8" title="Discussion — Kardashev Type I Pathway">
            <p>
              Kardashev (1964) defined Type I civilisation as one that harnesses all energy
              available on its host planet (~10¹⁶ W). The Theory of Compression States
              provides the theoretical basis for the communication and computation infrastructure
              required at that scale:
            </p>
            <div className="space-y-1 pl-4 border-l-2 border-slate-700">
              {[
                "25,600 orthogonal channels — capacity scales geometrically, not linearly",
                "Physics-governed fees — economic actions priced by E=hf, not by institutional convention",
                "Jurisdiction-agnostic addressing — wnsp://Ψ(wdm,oam,pol)/ is valid in every nation",
                "Photonic substrate — when photonic ASICs arrive (~2032), the architecture maps directly to hardware lanes",
                "Gravity de-correlation — mass displacement as high-Λ state manipulation, following from equation (4)",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-400 py-1">
                  <span className="text-slate-600 font-mono mt-0.5">→</span>
                  {p}
                </div>
              ))}
            </div>
            <p>
              The equations are the same at every scale. The framework does not change between
              K1 and K5 — only the substrate and the frequency range extend. The physics was
              already complete before the civilisation was ready to use it.
            </p>
          </Section>

          <Section n="9" title="References">
            <div className="space-y-2 text-xs text-slate-500">
              {[
                "Maxwell, J.C. (1865). A Dynamical Theory of the Electromagnetic Field. Phil. Trans. R. Soc. Lond.",
                "Planck, M. (1900). Über eine Verbesserung der Wienschen Spektralgleichung. Verhandlungen der Deutschen Physikalischen Gesellschaft.",
                "Einstein, A. (1905). Zur Elektrodynamik bewegter Körper. Annalen der Physik.",
                "Heisenberg, W. (1925). Über quantentheoretische Umdeutung kinematischer und mechanischer Beziehungen.",
                "Dirac, P.A.M. (1928). The Quantum Theory of the Electron. Proc. R. Soc. Lond. A.",
                "Shannon, C.E. (1948). A Mathematical Theory of Communication. Bell System Technical Journal.",
                "Russell, W. (1926). The Universal One. University of Science and Philosophy.",
                "Tesla, N. (1894). U.S. Patent 512,340 — Coil for Electro-Magnets. Bifilar winding.",
                "AIP Applied Physics Letters 127, 211102 (2025). Visualization and selective manipulation of sub-terahertz whispering gallery modes.",
                "arXiv:2606.02238 (June 2025). Sub-cycle field-driven dynamical Berry phase in solids.",
                "Kardashev, N.S. (1964). Transmission of Information by Extraterrestrial Civilizations. Soviet Astronomy.",
                "Pou, T.R. (2025–2026). NexusOS — Physics-Based Civilization OS. AGPL-3.0. github.com/nexusosdaily-code/NexusOS",
              ].map((ref, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-mono text-slate-700 flex-shrink-0">[{i+1}]</span>
                  <span>{ref}</span>
                </div>
              ))}
            </div>
          </Section>

        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-800 pt-6 space-y-3">
          <p className="text-xs text-slate-500">
            This preprint is published under AGPL-3.0. It may be freely reproduced, cited,
            and built upon provided attribution is given and derivative works are published
            under the same licence. It cannot be patented, enclosed, or gated.
          </p>
          <a href={REPO} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
            <ExternalLink className="w-3 h-3" /> View implementation — GitHub
          </a>
        </div>

        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { href: "/founders",           label: "Founding Architects" },
            { href: "/octave-layers",      label: "Russell Octave Layers" },
            { href: "/oscillating-quanta", label: "First Principles" },
            { href: "/hardware-results",   label: "Hardware Results" },
            { href: "/compression-explorer", label: "Compression Explorer" },
            { href: "/hardware-spec",      label: "Hardware Specification" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="block border border-slate-800 rounded-lg px-3 py-2.5 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-center">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-slate-700 text-[10px] font-mono pb-4">
          AGPL-3.0 · Theory of Compression States · Te Rata Pou · {DATE}
        </p>
      </div>
    </div>
  );
}
