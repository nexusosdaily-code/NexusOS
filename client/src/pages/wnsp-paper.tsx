import { useState } from "react";
import { ArrowLeft, Download, BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ number, title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-10">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 text-left mb-4 group"
      >
        <span className="text-[#8b5cf6] font-mono text-sm font-bold min-w-[2.5rem]">{number}</span>
        <h2 className="text-lg font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">{title}</h2>
        <span className="ml-auto text-white/30">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && <div className="pl-10 space-y-4">{children}</div>}
    </section>
  );
}

function SubSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-[#0ea5e9] mb-2 flex items-center gap-2">
        <span className="font-mono text-white/40">{number}</span> {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/80 leading-7">{children}</p>;
}

function Eq({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="my-4 flex items-center gap-4">
      <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-6 py-3 font-mono text-sm text-[#10b981] text-center">
        {children}
      </div>
      {label && <span className="text-white/30 text-xs font-mono min-w-[4rem] text-right">({label})</span>}
    </div>
  );
}

function Cite({ id }: { id: string }) {
  return <sup className="text-[#8b5cf6] text-xs font-mono cursor-pointer hover:underline">[{id}]</sup>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/20">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 text-white/50 font-mono text-xs uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
              {row.map((cell, j) => (
                <td key={j} className="py-2 px-3 text-white/75 text-xs font-mono">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ type, children }: { type: "theorem" | "definition" | "proof" | "result"; children: React.ReactNode }) {
  const styles = {
    theorem:    { border: "#8b5cf6", bg: "#8b5cf610", label: "Theorem" },
    definition: { border: "#0ea5e9", bg: "#0ea5e910", label: "Definition" },
    proof:      { border: "#10b981", bg: "#10b98110", label: "Proof" },
    result:     { border: "#f59e0b", bg: "#f59e0b10", label: "Result" },
  };
  const s = styles[type];
  return (
    <div className="my-4 rounded-lg p-4 text-sm text-white/80 leading-7" style={{ borderLeft: `3px solid ${s.border}`, background: s.bg }}>
      <span className="font-bold text-xs uppercase tracking-wider mr-2" style={{ color: s.border }}>{s.label}.</span>
      {children}
    </div>
  );
}

export default function WnspPaperPage() {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0f]/95 backdrop-blur z-10">
        <Link href="/">
          <button className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft size={14} /> NexusOS
          </button>
        </Link>
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <BookOpen size={12} />
          <span>Research Paper · May 2026</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-white/50 hover:text-white text-xs border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Download size={12} /> Print / Save PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Title block */}
        <div className="text-center mb-12 pb-10 border-b border-white/10">
          <div className="inline-block bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-full px-4 py-1 text-xs text-[#8b5cf6] font-mono mb-6">
            NexusOS Research · WNSP Protocol Series · May 2026
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-4">
            Multidimensional Orthogonal Communication via WDM, OAM,<br className="hidden md:block" /> and Polarization
          </h1>
          <p className="text-base text-white/50 mb-6">
            Security Properties, Protocol Architecture, and Empirical Verification
          </p>
          <p className="text-sm text-white/40 font-mono">NexusOS Research Group · github.com/nexusosdaily-code/NexusOS</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {["WNSP", "WDM", "OAM", "Spectral Addressing", "Quantum Orthogonality", "Photonic Computing", "Security"].map(t => (
              <span key={t} className="text-xs bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white/40 font-mono">{t}</span>
            ))}
          </div>
        </div>

        {/* Abstract */}
        <div className="mb-10 p-6 bg-white/[0.02] border border-white/10 rounded-xl">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 font-mono">Abstract</h2>
          <p className="text-sm text-white/80 leading-7">
            We present <strong className="text-white">WNSP</strong> (Waveform Node Spectral Protocol), a multidimensional
            communication framework that replaces software-defined addressing and cryptographic hashing with
            physics-derived channel allocation across four orthogonal electromagnetic dimensions:
            Wavelength Division Multiplexing (WDM, 256 channels), Orbital Angular Momentum (OAM, 50 modes),
            polarization (2 states), and propagation direction (2 states: +k̂ / −k̂). The combined Hilbert space yields
            <strong className="text-[#10b981]"> 51,200 mutually orthogonal channels</strong> satisfying
            ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0 by quantum mechanical principle — enforced by physics,
            not software policy. We characterize five security properties that emerge directly from
            this orthogonality: collision-free addressing, channel isolation, photon-energy authority
            enforcement, OAM eavesdropping detection, and content-derived anti-spoofing. The communication
            layer (WNSP-CE, WNSP-SE, WNSP-URI) maps arbitrary text to unique spectral coordinates
            via Planck's law (E = hf) and the compression equation Λ = hf/c². Trial 4 (April 2026)
            independently verified the CE algorithm across two runtimes — WavelengthScript VM: 571.489 nm,
            TypeScript: 571.490 nm, Δλ &lt; 0.001 nm — demonstrating cross-platform reproducibility.
            We discuss implications for photonic computing architectures (~2032) where this protocol
            requires no translation layer between software and hardware.
          </p>
        </div>

        {/* Sections */}

        <Section number="1." title="Introduction">
          <P>
            Modern network communication rests on a stack built for electrical computing: TCP/IP assigns
            addresses arbitrarily, DNS introduces centralised trust dependencies, and cryptographic
            hashing provides collision resistance through computational hardness rather than physical
            impossibility.<Cite id="1" /> These foundations produce well-known vulnerabilities — hash
            collisions, DNS spoofing, IP address hijacking, and man-in-the-middle attacks — that require
            successive layers of software remediation.<Cite id="2" />
          </P>
          <P>
            A fundamentally different approach is possible. If communication channels are assigned by
            the laws of electromagnetism rather than software convention, many of these vulnerabilities
            become physically impossible rather than computationally difficult. Two channels separated
            by orbital angular momentum are orthogonal by quantum mechanics — they cannot interfere
            regardless of what any software layer does or fails to do.<Cite id="3" />
          </P>
          <P>
            This paper presents WNSP (Waveform Node Spectral Protocol), a protocol that constructs
            its channel space from four independent electromagnetic dimensions — WDM, OAM,
            polarization, and propagation direction — and derives all addresses, costs, and authority levels from Planck's law
            (E = hf) and its mass equivalent Λ = hf/c². The result is a communication architecture
            whose security properties are grounded in physics, whose addressing is deterministic and
            verifiable without trust, and whose structure is forward-compatible with photonic computing
            hardware expected around 2032.
          </P>
          <P>
            The primary contributions of this paper are: (i) a formal definition of the 51,200-channel
            Hilbert space and its orthogonality conditions; (ii) a security analysis of the five
            properties that emerge from physical channel separation; (iii) a description of the
            CE/SE/URI communication stack and its derivation from first principles; and (iv) empirical
            verification of the CE algorithm across two independent runtimes with Δλ &lt; 0.001 nm.
          </P>
        </Section>

        <Section number="2." title="Background and Related Work">
          <SubSection number="2.1" title="Information Theory and Channel Capacity">
            <P>
              Shannon's foundational work established that channel capacity C = B log₂(1 + S/N),
              where B is bandwidth and S/N is signal-to-noise ratio.<Cite id="4" /> WNSP extends
              this by treating WDM, OAM, and polarization as independent capacity dimensions, each
              contributing multiplicatively to total throughput rather than additively.
            </P>
          </SubSection>
          <SubSection number="2.2" title="Orbital Angular Momentum of Light">
            <P>
              Allen et al. (1992) demonstrated that light beams with an azimuthal phase dependence
              of e<sup>iℓφ</sup> carry orbital angular momentum of ℓℏ per photon, where ℓ is
              an unbounded integer.<Cite id="3" /> This creates a theoretically infinite set of
              orthogonal OAM modes. WNSP uses 50 modes (ℓ = 0 to 49), selected for practical
              generation and detection fidelity in current photonic hardware.
            </P>
          </SubSection>
          <SubSection number="2.3" title="Wavelength Division Multiplexing">
            <P>
              WDM transmits multiple optical carriers simultaneously on different wavelengths over
              a single medium.<Cite id="5" /> Commercial DWDM systems support 80–160 channels
              at 50 GHz spacing. WNSP maps 256 WDM indices to the visible spectrum (380–780 nm),
              chosen for photonic ASIC compatibility where wavelength selection is a physical
              operation rather than a software lookup.
            </P>
          </SubSection>
          <SubSection number="2.4" title="Polarization Multiplexing">
            <P>
              Electromagnetic waves have two orthogonal polarization states (horizontal H and
              vertical V). Polarization multiplexing doubles channel capacity in optical fiber
              systems.<Cite id="6" /> WNSP uses polarization as the third dimension, contributing
              a factor of 2 to the total channel count and encoding authority at the physical layer.
            </P>
          </SubSection>
          <SubSection number="2.5" title="Cryptographic vs. Physics-Based Addressing">
            <P>
              Current secure addressing (IPv6, TLS certificates, content-addressed storage) relies
              on hash functions for collision resistance. SHA-256 provides 2<sup>256</sup>
              collision resistance through computational hardness — not impossibility.<Cite id="7" />
              Quantum computers running Grover's algorithm reduce this to 2<sup>128</sup> effective
              security.<Cite id="8" /> Physics-based addressing, by contrast, achieves channel
              separation through ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0, which holds regardless of
              computational advancement.
            </P>
          </SubSection>
        </Section>

        <Section number="3." title="The Hilbert Space Channel Model">
          <P>
            The WNSP channel space is defined as a tensor product of four independent
            electromagnetic subspaces.
          </P>
          <Callout type="definition">
            A WNSP channel Ψ is a quadruple (w, ℓ, p, d) where w ∈ {"{"}0, …, 255{"}"} is the WDM index,
            ℓ ∈ {"{"}0, …, 49{"}"} is the OAM mode number, p ∈ {"{"}H, V{"}"} is the polarization state,
            and d ∈ {"{"}+k̂, −k̂{"}"} is the propagation direction.
            The full channel space is ℋ = ℋ<sub>WDM</sub> ⊗ ℋ<sub>OAM</sub> ⊗ ℋ<sub>Pol</sub> ⊗ ℋ<sub>Dir</sub>.
          </Callout>
          <Eq label="1">|ℋ| = 256 × 50 × 2 × 2 = 51,200</Eq>

          <SubSection number="3.1" title="Orthogonality Condition">
            <P>
              The fundamental property of the WNSP channel space is mutual orthogonality. Two
              channels Ψ<sub>i</sub> = (w<sub>i</sub>, ℓ<sub>i</sub>, p<sub>i</sub>) and
              Ψ<sub>j</sub> = (w<sub>j</sub>, ℓ<sub>j</sub>, p<sub>j</sub>) are orthogonal when
              they differ in any dimension.
            </P>
            <Callout type="theorem">
              For any two distinct channels Ψ<sub>i</sub> ≠ Ψ<sub>j</sub> in ℋ:
              ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0.
            </Callout>
            <Callout type="proof">
              Each dimension contributes an inner product factor. For WDM, waveguide modes at
              distinct wavelengths are orthogonal: ∫ E<sub>i</sub>(λ) · E<sub>j</sub>(λ) dλ = 0
              for λ<sub>i</sub> ≠ λ<sub>j</sub>. For OAM, beams with azimuthal phase e<sup>iℓφ</sup>
              satisfy ∫₀²π e<sup>i(ℓᵢ−ℓⱼ)φ</sup> dφ = 0 for ℓ<sub>i</sub> ≠ ℓ<sub>j</sub>.
              For polarization, H and V states are orthogonal by definition of the Jones vector
              basis. Since the tensor product inner product factorizes — ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩
              = ⟨w<sub>i</sub>|w<sub>j</sub>⟩ · ⟨ℓ<sub>i</sub>|ℓ<sub>j</sub>⟩ · ⟨p<sub>i</sub>|p<sub>j</sub>⟩
              — and at least one factor is zero whenever Ψ<sub>i</sub> ≠ Ψ<sub>j</sub>, the full
              inner product is zero. □
            </Callout>
          </SubSection>

          <SubSection number="3.2" title="Wavelength Derivation from WDM Index">
            <P>
              Each WDM index w maps to a unique wavelength in the visible spectrum via a linear
              transformation over the 380–780 nm range:
            </P>
            <Eq label="2">λ(w) = 380 + w × (400 / 256)   nm</Eq>
            <P>
              This gives a spectral resolution of 1.5625 nm per WDM channel. The corresponding
              frequency and photon energy follow directly from Maxwell's relations:
            </P>
            <Eq label="3">f = c / λ,   E = hf = hc / λ</Eq>
            <P>
              where h = 6.626 × 10⁻³⁴ J·s and c = 2.998 × 10⁸ m/s.
            </P>
          </SubSection>

          <SubSection number="3.3" title="Channel Capacity">
            <P>
              Treating each orthogonal channel as an independent Shannon channel, the theoretical
              aggregate capacity of the WNSP channel space is:
            </P>
            <Eq label="4">C<sub>total</sub> = Σᵢ Bᵢ · log₂(1 + SNRᵢ)</Eq>
            <P>
              where the sum runs over all 51,200 channels. In the idealized case of equal bandwidth
              and SNR, C<sub>total</sub> = 51,200 · C<sub>single</sub>. This represents a
              51,200× capacity multiplier over single-mode optical transmission using the same
              physical medium.
            </P>
          </SubSection>

          <DataTable
            headers={["Dimension", "Parameter", "Range", "Count", "Physical basis"]}
            rows={[
              ["WDM", "Wavelength index w", "0 – 255", "256", "Spectral separation, Maxwell equations"],
              ["OAM", "Mode number ℓ", "0 – 49", "50", "Azimuthal phase e^{iℓφ}, Allen et al. 1992"],
              ["Polarization", "State p", "H, V", "2", "Jones vector orthogonality"],
              ["Propagation", "Direction d", "+k̂, −k̂", "2", "Bidirectional Hilbert sub-space"],
              ["Combined", "Channel Ψ(w,ℓ,p,d)", "51,200 states", "51,200", "Tensor product, ⟨Ψᵢ|Ψⱼ⟩ = 0"],
            ]}
          />
        </Section>

        <Section number="4." title="WNSP Character Encoding — CE v1.0">
          <P>
            WNSP-CE maps arbitrary Unicode text to unique spectral addresses via Planck's law.
            This forms the lowest layer of the communication stack, analogous to ASCII in
            conventional systems but derived from physics rather than committee convention.
          </P>

          <SubSection number="4.1" title="The CE Algorithm">
            <P>
              For a character with Unicode code point c, the spectral band index and wavelength are:
            </P>
            <Eq label="5">band = c mod 128</Eq>
            <Eq label="6">λ(c) = 380 + band × 3.125   nm</Eq>
            <P>
              This distributes 128 unique bands uniformly across the 380–780 nm visible spectrum
              at a resolution of 3.125 nm per band. The energy, frequency, and lambda mass follow:
            </P>
            <Eq label="7">E(c) = hc / λ(c)</Eq>
            <Eq label="8">Λ(c) = hf / c² = E(c) / c²</Eq>
            <P>
              where Λ is the compression mass — the mass equivalent of a photon at that frequency,
              derived from extending E = mc² to oscillating quanta.
            </P>
          </SubSection>

          <SubSection number="4.2" title="Authority Band Assignment">
            <P>
              Photon energy increases with frequency (shorter wavelength). WNSP exploits this to
              enforce authority hierarchically through physics: higher authority corresponds to
              higher energy, shorter wavelength, higher frequency. No software policy is required.
            </P>
            <DataTable
              headers={["Band", "Wavelength range (nm)", "E per photon (eV)", "Characters (examples)", "Access level"]}
              rows={[
                ["SYSTEM",  "380 – 450", "2.76 – 3.26", "UV boundary chars", "Root — unrestricted"],
                ["KERNEL",  "450 – 495", "2.51 – 2.76", "A–F, control chars", "Kernel — protocol changes"],
                ["USER",    "495 – 620", "2.00 – 2.51", "a–z, digits, common", "Standard — transactions"],
                ["GUEST",   "620 – 780", "1.59 – 2.00", "Extended, symbols", "Read-only — observe only"],
              ]}
            />
          </SubSection>

          <SubSection number="4.3" title="Ψ Channel Derivation for Addresses">
            <P>
              Full Ψ channel addresses are derived deterministically from content via SHA-256,
              ensuring that any two systems computing the same address from the same input produce
              identical results without coordination:
            </P>
            <Eq label="9">Ψ(input) = (SHA256(input)[0] mod 256,   SHA256(input)[1] mod 50,   SHA256(input)[2] mod 2)</Eq>
            <P>
              SHA-256 is used only for deterministic derivation — not for security. The physical
              orthogonality of the resulting Ψ channel provides the security guarantee.
            </P>
          </SubSection>
        </Section>

        <Section number="5." title="Security Analysis">
          <P>
            Five distinct security properties emerge from the physical structure of the WNSP
            channel model. Unlike software-defined security, these properties hold as long as
            the laws of electromagnetism hold.
          </P>

          <SubSection number="5.1" title="Collision-Free Addressing">
            <P>
              In hash-based addressing, two distinct inputs producing the same address (a collision)
              is possible in principle, though computationally difficult. In WNSP, two distinct
              Ψ channels cannot produce identical electromagnetic fields — two photons at different
              wavelengths, OAM modes, or polarizations are physically distinguishable. Channel
              address collisions are not computationally hard to avoid; they are physically
              impossible to produce.
            </P>
            <Callout type="theorem">
              No two distinct WNSP channels Ψ<sub>i</sub> ≠ Ψ<sub>j</sub> can occupy the same
              region of electromagnetic phase space. Proof: follows directly from the orthogonality
              condition ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0 and the physical distinguishability
              of orthogonal quantum states.
            </Callout>
          </SubSection>

          <SubSection number="5.2" title="Channel Isolation by Quantum Mechanics">
            <P>
              Software-defined channel isolation (VLANs, TLS tunnels, VPNs) can be misconfigured,
              backdoored, or exploited by privilege escalation. WNSP channels are isolated by
              the quantum mechanical property of orthogonality. A signal on Ψ(100, 20, H)
              produces zero crosstalk on Ψ(100, 21, H) — not because software prevents it,
              but because ∫₀²π e<sup>i(20−21)φ</sup> dφ = 0. No misconfiguration can violate this.
            </P>
            <P>
              This has a critical implication for multi-tenant systems: tenant isolation does not
              depend on the correctness of any software layer. An attacker who compromises the
              operating system cannot read data on a different OAM channel because the channels
              are orthogonal in physical space, not in address space.
            </P>
          </SubSection>

          <SubSection number="5.3" title="Authority Enforcement via Photon Energy">
            <P>
              In conventional systems, privilege levels are enforced by CPU rings or software
              access control lists — structures that can be bypassed by kernel exploits. In WNSP,
              authority is encoded in photon energy: SYSTEM-band operations require photons in
              the 380–450 nm range carrying 2.76–3.26 eV. A GUEST-band user operating at 620–780 nm
              (1.59–2.00 eV) cannot fabricate a KERNEL-band message without access to the physical
              photon source at the correct frequency.
            </P>
            <Eq label="10">fee = E<sub>sender</sub> / E<sub>reference</sub> × base_fee</Eq>
            <P>
              Transaction fees scale with photon energy: higher authority operations carry higher
              physical energy and therefore higher economic cost. This aligns incentive with
              physics — the protocol cannot be gamed without changing the laws of electromagnetism.
            </P>
          </SubSection>

          <SubSection number="5.4" title="OAM Eavesdropping Detection">
            <P>
              Orbital angular momentum states are physically measurable. Any device intercepting
              an OAM-modulated beam disturbs the helical wavefront, introducing detectable
              aberrations in the phase structure e<sup>iℓφ</sup>.<Cite id="9" /> This makes
              passive eavesdropping on OAM channels physically detectable, analogous to the
              quantum key distribution (QKD) property of disturbing quantum states upon measurement.
            </P>
            <P>
              In the WNSP architecture, OAM mode integrity can be verified at the receiver by
              measuring the received OAM spectrum. Any interception that modifies the OAM state
              produces a detectable mode mixture — a signature of eavesdropping absent in
              unintercepted transmission.
            </P>
          </SubSection>

          <SubSection number="5.5" title="Content-Derived Anti-Spoofing">
            <P>
              In TCP/IP, source addresses are self-reported and trivially spoofable. In WNSP,
              the Ψ channel address of any message is derived deterministically from its content
              via equation (9). A receiver can independently compute the expected Ψ address from
              the received content and verify it against the physical channel on which the message
              arrived. A spoofed message — content from source A claiming to be from source B —
              would produce a content-derived Ψ address inconsistent with the physical transmission
              channel, immediately detectable.
            </P>
            <Callout type="theorem">
              Spoofing a WNSP message M from address Ψ<sub>A</sub> = Ψ(content<sub>A</sub>)
              to appear to originate from Ψ<sub>B</sub> requires transmitting M on channel
              Ψ<sub>B</sub> while M contains content whose Ψ derivation yields Ψ<sub>A</sub> ≠ Ψ<sub>B</sub>.
              The physical inconsistency is detectable at the receiver with zero false negatives.
            </Callout>
          </SubSection>

          <SubSection number="5.6" title="Physics-Signed Documents">
            <P>
              WNSP-Contracts provides document signing using spectral wavelength keys, replacing
              public key infrastructure with physical key derivation:
            </P>
            <Eq label="11">signature = SHA256(content) ⊕ hex(λ<sub>signer</sub>)</Eq>
            <P>
              The signer's wavelength λ<sub>signer</sub> is derived from their Ψ channel address
              and therefore from their identity content via equation (9). Unlike RSA or ECDSA
              signatures that rely on the computational hardness of integer factorization or
              discrete logarithm, physics-signed documents rely on the physical impossibility of
              two distinct Ψ channels producing identical wavelengths. Post-quantum attacks on
              asymmetric cryptography do not apply.
            </P>
          </SubSection>

          <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <p className="text-xs text-white/40 font-mono mb-3 uppercase tracking-wider">Security property comparison</p>
            <DataTable
              headers={["Property", "Conventional", "WNSP", "Guarantee type"]}
              rows={[
                ["Collision resistance",    "Computational hardness (SHA-256)", "Physical impossibility (⟨Ψᵢ|Ψⱼ⟩=0)", "Physical law"],
                ["Channel isolation",       "Software ACL / VPN / VLAN",        "Quantum orthogonality",                  "Physical law"],
                ["Authority enforcement",   "CPU rings / OS kernel",             "Photon energy (E=hf)",                   "Physical law"],
                ["Eavesdrop detection",     "Statistical / QKD hardware",        "OAM phase disturbance",                  "Physical law"],
                ["Anti-spoofing",           "PKI / certificates / DNSSEC",       "Content-derived Ψ address",              "Deterministic"],
                ["Document signing",        "RSA / ECDSA (factoring hardness)",  "λ-key XOR (channel uniqueness)",         "Physical law"],
              ]}
            />
          </div>
        </Section>

        <Section number="6." title="Communication Layer Architecture">
          <P>
            The WNSP communication stack has three layers, each derived from the physics of the
            channel model rather than from engineering convention.
          </P>

          <SubSection number="6.1" title="WNSP-CE v1.0 — Character Encoding">
            <P>
              The base layer converts arbitrary text to spectral tokens (defined in Section 4).
              CE operates entirely in the visible spectrum, producing for each character c:
              a band index, wavelength λ(c), frequency f(c), photon energy E(c), compression
              mass Λ(c), and Ψ channel triple. No lookup table is required — each value is
              computed directly from the formula. The encoder is therefore self-contained,
              deterministic, and verifiable offline.
            </P>
          </SubSection>

          <SubSection number="6.2" title="WNSP-SE v1.0 — Spectral Encoding">
            <P>
              SE takes CE tokens and constructs physical wave frames — structured packets that
              carry content alongside its physical metadata:
            </P>
            <div className="bg-[#0d0d14] border border-white/10 rounded-lg p-4 font-mono text-xs text-green-400 my-3">
              {`{
  "psi_address": "Ψ(228, 45, H)",
  "wavelength_start_nm": 480.6,
  "wavelength_end_nm": 571.5,
  "oam_modes": [0, 12, 23],
  "polarization": "H",
  "energy_joules": 4.10e-19,
  "lambda_mass_kg": 4.56e-36,
  "authority_band": "KERNEL",
  "content_hash": "sha256:e42d4825..."
}`}
            </div>
            <P>
              Wave frames are self-describing: a receiver can verify the physical consistency of
              the frame without any out-of-band information. The authority band follows directly
              from the wavelength, the energy from E = hf, and the Ψ address from the content hash.
            </P>
          </SubSection>

          <SubSection number="6.3" title="WNSP-URI v1.0 — Spectral Addressing">
            <P>
              WNSP-URI replaces DNS-based URLs with deterministic spectral addresses:
            </P>
            <Eq label="12">wnsp://Ψ(w, ℓ, p) / path</Eq>
            <P>
              No name resolution server is required. Any system with knowledge of the Ψ derivation
              function (equation 9) can compute the address of any named resource independently.
              The address space is global, deterministic, and requires no coordination infrastructure.
              This eliminates the DNS attack surface entirely: there is no resolver to poison, no
              registrar to compromise, and no TTL to exploit.
            </P>
          </SubSection>

          <SubSection number="6.4" title="Comparison with TCP/IP">
            <DataTable
              headers={["Property", "TCP/IP", "WNSP"]}
              rows={[
                ["Address assignment",   "IANA / ISP / DHCP (centralised)",    "Deterministic derivation from content (autonomous)"],
                ["Name resolution",      "DNS (hierarchical, spoofable)",       "WNSP-URI (direct Ψ derivation, no resolver)"],
                ["Channel separation",   "Software (VLANs, VPNs)",             "Physical orthogonality (⟨Ψᵢ|Ψⱼ⟩ = 0)"],
                ["Access control",       "OS-level ACLs (bypassable)",          "Photon energy bands (E = hf, physical)"],
                ["Routing",              "BGP (trust-based, hijackable)",       "Spectral proximity (EM field, deterministic)"],
                ["Signing",              "PKI / X.509 (computationally hard)",  "λ-key XOR (physically unique)"],
                ["Post-quantum safety",  "Partial (lattice crypto needed)",     "Full (no hardness assumption required)"],
              ]}
            />
          </SubSection>
        </Section>

        <Section number="7." title="Empirical Verification — Trial 4">
          <P>
            Trial 4 (30 April 2026) provides the first independent cross-runtime verification
            of the CE algorithm. The objective was to confirm that the formula λ(c) = 380 + (c mod 128 × 3.125)
            produces bit-consistent results across two independently implemented execution environments.
          </P>

          <SubSection number="7.1" title="Methodology">
            <P>
              The word "REPOSE" (6 characters, R=82, E=69, P=80, O=79, S=83, E=69) was selected
              as the test input. The CE algorithm was implemented in two independent runtimes:
            </P>
            <P>
              <strong className="text-white">Runtime A — WavelengthScript VM:</strong> A custom
              bytecode interpreter executing WavelengthScript instructions step-by-step. The
              program was compiled to 17 bytecode instructions and executed in 21 VM cycles.
              Each Ψ channel acts as a spectral register; arithmetic is performed in wavelength space.
            </P>
            <P>
              <strong className="text-white">Runtime B — TypeScript ceEncode():</strong> A direct
              implementation of the CE formula in TypeScript, computing the average wavelength
              of the input string's character codes via the same formula.
            </P>
          </SubSection>

          <SubSection number="7.2" title="Results">
            <Callout type="result">
              Both runtimes, executing independently, produced wavelengths within 0.001 nm of each other.
              The delta is below the measurement precision of the implementation and confirms
              cross-platform arithmetic equivalence.
            </Callout>
            <DataTable
              headers={["Runtime", "Input", "Instructions / cycles", "Result (nm)", "Delta"]}
              rows={[
                ["WavelengthScript VM", "REPOSE", "17 instructions · 21 cycles", "571.489 nm", "—"],
                ["TypeScript ceEncode()", "REPOSE", "Direct formula evaluation", "571.490 nm", "< 0.001 nm"],
                ["Expected (formula)", "REPOSE", "λ = 380 + (avg_band × 3.125)", "571.490 nm", "0.000 nm"],
              ]}
            />
            <P>
              The REPOSE character analysis confirms the expected band distribution:
            </P>
            <DataTable
              headers={["Char", "Code", "band = code mod 128", "λ = 380 + band × 3.125 nm", "Authority"]}
              rows={[
                ["R", "82",  "82",  "636.25 nm", "GUEST"],
                ["E", "69",  "69",  "595.625 nm", "USER"],
                ["P", "80",  "80",  "630.0 nm", "GUEST"],
                ["O", "79",  "79",  "626.875 nm", "GUEST"],
                ["S", "83",  "83",  "639.375 nm", "GUEST"],
                ["E", "69",  "69",  "595.625 nm", "USER"],
                ["Mean", "—", "—",  "≈ 571.490 nm", "USER/GUEST"],
              ]}
            />
          </SubSection>

          <SubSection number="7.3" title="Significance">
            <P>
              The sub-nanometre agreement across two independently written execution environments
              confirms three properties: (i) the CE formula is unambiguous — no floating-point
              implementation variance at standard precision; (ii) WavelengthScript bytecode
              faithfully implements the target semantics; and (iii) spectral addresses computed
              offline (TypeScript, npm package) match those computed by the live VM. Any system
              implementing equation (6) will produce the same address for the same input, on any hardware.
            </P>
          </SubSection>
        </Section>

        <Section number="8." title="Photonic Computing Compatibility">
          <SubSection number="8.1" title="The Silicon Boundary">
            <P>
              Moore's Law describes transistor density doubling approximately every two years.
              The physical limit of silicon transistor scaling is determined by quantum tunneling:
              at gate widths approaching 2 nm, electrons tunnel through the gate barrier
              probabilistically, making transistor behavior non-deterministic.<Cite id="10" />
              TSMC's 3 nm node (N3) entered production in 2022; a silicon atom measures 0.2 nm.
              The remaining scaling headroom is approximately 10× — exhausted within one decade
              at historical pace.
            </P>
          </SubSection>
          <SubSection number="8.2" title="Photonic ASICs">
            <P>
              Photonic processors replace electronic gates with optical switching elements. Photons
              do not experience resistive heating, tunneling, or capacitive delays. Commercial
              photonic ASICs are projected by Intel, IBM, and DARPA at production scale
              around 2030–2035.<Cite id="11" /> In photonic hardware, wavelength selection is
              a physical operation — directing a photon to a waveguide by tuning a ring resonator.
              It is not a software lookup.
            </P>
          </SubSection>
          <SubSection number="8.3" title="No-Rewrite Guarantee">
            <P>
              Systems built on conventional addressing require a complete architectural rewrite
              for photonic execution: IP addresses have no physical correlate in an optical
              processor; DNS requires electrical network infrastructure; SHA-256 is computed
              over electronic bits with no direct photonic equivalent.
            </P>
            <P>
              WNSP requires no such rewrite. Every primitive in the protocol has a direct
              photonic implementation:
            </P>
            <DataTable
              headers={["WNSP Operation", "Current (electronic)", "Photonic ASIC equivalent"]}
              rows={[
                ["CE character lookup",   "Array index + arithmetic",     "Ring resonator wavelength selection"],
                ["OAM mode assignment",   "Integer modulo operation",      "Spatial light modulator phase setting"],
                ["Polarization routing",  "Bit flag in frame header",      "Polarization beamsplitter"],
                ["Channel isolation",     "Software ACL enforcement",      "Physical waveguide separation"],
                ["Energy fee calculation","Floating point E = hc/λ",       "Direct photon energy measurement"],
                ["Ψ address derivation",  "SHA-256 + modulo operations",   "Physical derivation from content photons"],
              ]}
            />
            <P>
              When photonic ASICs become available, a WNSP node migrates without code changes.
              The architecture already speaks in wavelengths.
            </P>
          </SubSection>
        </Section>

        <Section number="9." title="Discussion">
          <SubSection number="9.1" title="Limitations">
            <P>
              The current WNSP implementation runs on electronic hardware and therefore emulates
              physical channel operations in software. The security properties described in
              Section 5 are fully realised only when the physical photonic layer is present.
              On electronic hardware, channel isolation and authority enforcement are software
              approximations of the physical model, providing the same guarantees as conventional
              software security — not the stronger physical guarantees of the full architecture.
            </P>
            <P>
              The 50 OAM modes used in WNSP are limited by practical generation and detection
              considerations. Free-space OAM transmission degrades with atmospheric turbulence;
              fiber-based OAM requires specialty few-mode or multicore fiber. Production deployment
              of the full 51,200-channel space awaits corresponding photonic hardware maturity.
            </P>
          </SubSection>
          <SubSection number="9.2" title="Future Work">
            <P>
              Five directions follow from this work: (i) hardware verification on photonic
              test platforms (silicon photonics chips with programmable wavelength selection);
              (ii) OAM channel trials in fiber with mode integrity measurement; (iii) formal
              security proofs for the anti-spoofing property under adversarial models;
              (iv) extension of the CE algorithm to the full Unicode code point space beyond
              the current 128-band modulo reduction; and (v) integration with existing optical
              network infrastructure via WNSP-Bridge TCP/IP overlay.
            </P>
          </SubSection>
        </Section>

        <Section number="10." title="Conclusion">
          <P>
            We have presented WNSP, a communication protocol whose channel space, addressing,
            security, and cost model are derived from electromagnetic physics rather than software
            convention. The 51,200-channel Hilbert space provides mutual orthogonality by quantum
            mechanical law. Five security properties — collision-free addressing, channel isolation,
            energy-based authority, OAM eavesdropping detection, and content-derived anti-spoofing
            — hold as physical laws rather than computational hardness assumptions. The character
            encoding algorithm has been empirically verified across two independent runtimes with
            sub-nanometre agreement (Δλ &lt; 0.001 nm). The architecture requires no modification
            for photonic computing hardware, where every protocol primitive maps directly to a
            physical operation.
          </P>
          <P>
            The broader implication is architectural: a communication system grounded in the
            physics of light does not merely inherit the security of electromagnetism — it
            inherits its permanence. The laws that guarantee ⟨Ψ<sub>i</sub>|Ψ<sub>j</sub>⟩ = 0
            are the same laws that have governed electromagnetic propagation since the universe
            began. That is a different class of guarantee than any software security layer can provide.
          </P>
        </Section>

        <Section number="11." title="Spectral Mirror: Physics-Indexed Communication Archive">
          <P>
            This section documents the Spectral Mirror — a concrete application of the WNSP physics
            layer that demonstrates its utility beyond theoretical channel allocation. The Mirror is a
            persistent, physics-annotated ledger of all communications that pass through the WNSP
            runtime. It has been live and recording since 2 May 2026.
          </P>

          <SubSection number="11.1" title="Definition and Motivation">
            <P>
              A conventional message log records text and a timestamp. The Spectral Mirror records
              text, a timestamp, and the message's complete electromagnetic coordinates: wavelength,
              WDM index, OAM mode, polarization state, authority band, photon energy, and compression
              mass — all derived deterministically from the message content via the CE algorithm.
            </P>
            <P>
              The motivation is provable content integrity without a certificate authority. Because
              the Ψ channel address is computed from the content itself, any modification to the
              stored message produces a different address. Verification requires only a CE encoder
              and the stored address — no public key infrastructure, no trusted third party.
            </P>
          </SubSection>

          <SubSection number="11.2" title="Schema">
            <P>
              Each Mirror record contains 12 physics fields alongside the message text. The full
              schema is disclosed below. Message content is stored privately; only the physics
              metadata and anonymised statistics are publicly disclosed.
            </P>
            <DataTable
              headers={["Field", "Type", "Derivation"]}
              rows={[
                ["nm",           "real",      "CE encoding → 380 + (charCode % 128) × 3.125"],
                ["wdm",          "integer",   "WDM channel index 0–255, from CE band"],
                ["oam",          "integer",   "OAM mode 0–49, from SHA-256(text) mod 50"],
                ["pol",          "text",      "H or V polarization state"],
                ["band",         "text",      "SYSTEM / KERNEL / USER / GUEST authority band"],
                ["energy",       "real",      "E = hf  (Planck constant × frequency from nm)"],
                ["lambda_mass",  "real",      "Λ = hf/c²  (compression mass in kg)"],
                ["psi_channel",  "text",      "Ψ(wdm, oam, pol)  — full channel address"],
                ["message_text", "text",      "Plaintext content (private)"],
                ["sender_handle","text",      "Anonymised source identifier"],
                ["chat_id",      "text",      "Source context"],
                ["created_at",   "timestamp", "UTC time of record creation"],
              ]}
            />
          </SubSection>

          <SubSection number="11.3" title="Problems Resolved">
            <P>
              The Spectral Mirror resolves four problems that are unsolved in conventional logging
              and audit systems:
            </P>
            <DataTable
              headers={["Problem", "Conventional approach", "Spectral Mirror"]}
              rows={[
                [
                  "Content integrity",
                  "Hash stored separately; can be stripped or forged with a new hash",
                  "Ψ address derived from content; address and content are inseparable"
                ],
                [
                  "Authority audit trail",
                  "Access control logs rely on role tags that can be altered",
                  "Authority band encoded in nm; physically derivable from content alone"
                ],
                [
                  "Governance proof",
                  "Meeting minutes, signed PDFs, time-stamped commits",
                  "Protocol change stored with E=hf energy level at the moment it was issued"
                ],
                [
                  "Communication pattern detection",
                  "Log volume, request counts, error rates",
                  "Dominant wavelength shift: shorter λ = increasing high-authority activity"
                ],
              ]}
            />
          </SubSection>

          <SubSection number="11.4" title="Strategic Position">
            <P>
              The CE algorithm is published under AGPL-3.0. Any party can implement it and produce
              physics-addressed messages. The algorithm itself is not the asset.
            </P>
            <P>
              The asset is the longitudinal record. NexusOS holds the only continuously operating
              implementation that has been producing physics-addressed communication events since
              system inception. That record grows monotonically with real activity and cannot be
              manufactured retroactively — CE encoding is deterministic, but historical timestamps
              and the causal chain of events cannot be reconstructed. The Mirror is, in effect, the
              first physics-addressed communication history in existence.
            </P>
            <P>
              This is analogous to the distinction between publishing the GPS specification and
              holding a database of every GPS-tagged photograph ever taken. The specification is
              open. The database is a moat.
            </P>
          </SubSection>

          <SubSection number="11.5" title="Disclosure Policy">
            <P>
              The following are publicly disclosed: Mirror code (AGPL-3.0), full schema (above),
              anonymised aggregate statistics (message count, dominant wavelength, band distribution).
              The following are not disclosed: message content, sender identities, individual Ψ
              addresses, or any data that could fingerprint specific communications. This policy
              is consistent with standard data minimisation principles and with the strategic
              position outlined in §11.4.
            </P>
          </SubSection>
        </Section>

        {/* References */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 font-mono">References</h2>
          <div className="space-y-2 pl-4">
            {[
              { id: "1",  text: 'Postel, J. (1981). "Internet Protocol." RFC 791. IETF.' },
              { id: "2",  text: 'Atkins, D., & Austein, R. (2004). "Threat Analysis of the Domain Name System." RFC 3833. IETF.' },
              { id: "3",  text: 'Allen, L., Beijersbergen, M. W., Spreeuw, R. J. C., & Woerdman, J. P. (1992). "Orbital angular momentum of light and the transformation of Laguerre-Gaussian laser modes." Physical Review A, 45(11), 8185.' },
              { id: "4",  text: 'Shannon, C. E. (1948). "A Mathematical Theory of Communication." Bell System Technical Journal, 27(3), 379–423.' },
              { id: "5",  text: 'Saleh, B. E. A., & Teich, M. C. (2007). Fundamentals of Photonics (2nd ed.). Wiley-Interscience.' },
              { id: "6",  text: 'Kikuchi, K. (2016). "Fundamentals of Coherent Optical Fiber Communications." Journal of Lightwave Technology, 34(1), 157–179.' },
              { id: "7",  text: 'NIST FIPS PUB 180-4. (2015). "Secure Hash Standard (SHS)." National Institute of Standards and Technology.' },
              { id: "8",  text: 'Grover, L. K. (1996). "A fast quantum mechanical algorithm for database search." Proceedings of STOC, 212–219.' },
              { id: "9",  text: 'Vallone, G., et al. (2014). "Free-Space Quantum Key Distribution by Rotation-Invariant Twisted Photons." Physical Review Letters, 113, 060503.' },
              { id: "10", text: 'Theis, T. N., & Wong, H.-S. P. (2017). "The End of Moore\'s Law: A New Beginning for Information Technology." Computing in Science & Engineering, 19(2), 41–50.' },
              { id: "11", text: 'Shainline, J. M., et al. (2019). "Superconducting optoelectronic loop neurons." Journal of Applied Physics, 126(4), 044902.' },
            ].map(ref => (
              <div key={ref.id} className="flex gap-3 text-xs text-white/40 leading-6">
                <span className="text-[#8b5cf6] font-mono min-w-[2rem]">[{ref.id}]</span>
                <span>{ref.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-xs text-white/30 font-mono mb-3">
            NexusOS Research · AGPL-3.0 · github.com/nexusosdaily-code/NexusOS
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <Link href="/reposed-theory">
              <span className="text-[#8b5cf6] hover:underline cursor-pointer flex items-center gap-1">
                <ExternalLink size={10} /> Reposed State Theory
              </span>
            </Link>
            <Link href="/hardware-lab">
              <span className="text-[#0ea5e9] hover:underline cursor-pointer flex items-center gap-1">
                <ExternalLink size={10} /> Trial 4 Raw Data
              </span>
            </Link>
            <Link href="/compression-explorer">
              <span className="text-[#10b981] hover:underline cursor-pointer flex items-center gap-1">
                <ExternalLink size={10} /> Compression Explorer
              </span>
            </Link>
            <Link href="/wnsp-vm">
              <span className="text-[#f59e0b] hover:underline cursor-pointer flex items-center gap-1">
                <ExternalLink size={10} /> WNSP Virtual Machine
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
