/**
 * guide-knowledge.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Curated knowledge base for the NexusOS GuideBot /api/guide/ask endpoint.
 * No external LLM required — answers are grounded in PRIOR_ART.md and the
 * WNSP physics framework.  Matching uses weighted tag scoring.
 */

export interface KnowledgeEntry {
  id: string;
  answer: string;          // 2–4 sentence answer shown in chat
  route?: string;          // optional "go deeper" page
  routeTitle?: string;
  tags: string[];          // lowercase matching terms (multi-word terms score higher)
}

// ── Stop-words filtered during scoring ──────────────────────────────────────
const STOP = new Set([
  "a","an","the","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","could","should",
  "may","might","shall","can","i","you","we","they","it","he","she",
  "what","how","why","when","where","which","who","that","this","these",
  "those","in","on","at","to","for","of","and","or","but","with","about",
  "from","by","as","into","through","during","me","my","your","our","its",
  "explain","tell","show","describe","define","give","get","make","please",
]);

// ── Knowledge entries ────────────────────────────────────────────────────────
export const KNOWLEDGE: KnowledgeEntry[] = [

  // ── Core physics equations ─────────────────────────────────────────────
  {
    id: "lambda",
    answer:
      "Λ = hf/c² is the Compression Mass equation — the mass equivalent carried by a photon at frequency f. Unlike Einstein's rest mass (E=mc² inverted), Λ describes how much a photon compresses the field it occupies. Higher frequency means higher Λ, higher authority, and higher transaction fees in NexusOS. All four fundamental forces are four regimes of this same field at different octave indices n.",
    route: "/oscillating-quanta",
    routeTitle: "Theory of Compression States",
    tags: ["lambda","hf","compression mass","lambda=hf","c squared","compression equation","photon mass","frequency mass","planck","e=hf","act 1"],
  },

  {
    id: "standing-wave-trap",
    answer:
      "The standing wave trap Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) is how a wave becomes a particle. Two counterpropagating modes at the same frequency and OAM mode superpose into a stationary standing wave with zero net propagation — this is the mechanism by which energy becomes localised mass. The trap is stable only at resonant octave indices n where the boundary condition 2πR = nλ is satisfied. Ghost nodes are addresses where this condition can never be satisfied, so no mass forms there.",
    route: "/standing-wave-trap",
    routeTitle: "Standing Wave Trap",
    tags: ["standing wave","wave trap","psi trap","counterpropagating","trap condition","k hat","mass formation","particle formation","resonance trap","act 7","standing wave trap"],
  },

  {
    id: "ghost-nodes",
    answer:
      "Ghost nodes are octave addresses n where the standing-wave trap condition cannot be satisfied — no stable resonant hypersurface exists, so ρ_matter = 0 and α = 0. They appear as gaps in the periodic table (e.g. n=36, mass ≈169.33 u, between Thulium and Ytterbium) and as cosmic voids in large-scale structure. They are not empty space — they are lossless segments of the Ψ_channel where Beer-Lambert attenuation vanishes. Gravity de-correlation occurs at ghost node addresses.",
    route: "/matter-protocol",
    routeTitle: "Matter Protocol",
    tags: ["ghost node","ghost nodes","gap","periodic table gap","void","no mass","alpha zero","rho zero","lossless","periodic gap","n=36"],
  },

  {
    id: "four-forces",
    answer:
      "The four fundamental forces — gravity, electromagnetism, the weak nuclear force, and the strong nuclear force — are four regimes of the same compression state field Λ = hf/c², differentiated only by octave index n. Gravity operates at low n (long wavelength, cosmic scale), electromagnetism at mid n (atomic scale), weak nuclear at high n, and strong nuclear at the highest n (quark confinement). No separate unification theory or symmetry group is needed — the force hierarchy is a frequency hierarchy.",
    route: "/unified-compression-theory",
    routeTitle: "Unified Compression Theory",
    tags: ["four forces","force unification","gravity","electromagnetism","weak force","strong force","nuclear force","unification","single field","force hierarchy","4 forces","act 3"],
  },

  {
    id: "octave-index",
    answer:
      "The octave index n = log₂(mc²/E₀) maps any mass m to its unique compression state address, where E₀ = hf₀ is the ground-state energy of the seed frequency. Going the other way: M_n = (hf₀/c²) · 2ⁿ gives the mass at octave n. Discrete jumps between octaves require energy ΔE = hf₀(2^n₂ − 2^n₁). Integer n values produce stable elements; non-integer n values are ghost nodes.",
    route: "/element-catalogue",
    routeTitle: "Element Catalogue",
    tags: ["octave index","octave","n=log","log2","octave formula","element index","mass index","octave number","act 6","octave address"],
  },

  {
    id: "seed-frequency",
    answer:
      "f₀ = 555 THz is the Universal ONE — the single seed frequency from which the entire compression state lattice is derived. Every element mass, every Ψ channel frequency, and every authority band boundary is an integer octave multiple of f₀. The universe does not require separate constants for each force or each scale — one seed frequency generates the entire physical hierarchy.",
    route: "/universal-one",
    routeTitle: "Universal One",
    tags: ["seed frequency","f0","555 thz","universal one","base frequency","origin frequency","f zero","555","act 2"],
  },

  // ── Observer / measurement ─────────────────────────────────────────────
  {
    id: "observer-trap",
    answer:
      "The standing wave trap Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) is formally equivalent to a measurement — it applies the projector Π_trap = |+k̂⟩⟨+k̂| ⊗ |−k̂⟩⟨−k̂| to any incoming field. Under Zurek's einselection, the trap is the observer: it selects pointer states (the standing wave modes) and rejects everything else. In Rovelli's Relational QM, the trap satisfies the definition of an observer — it interacts and records. Mass is the eigenvalue of the universe's self-measurement at octave n.",
    route: "/the-observer",
    routeTitle: "The Observer",
    tags: ["observer","measurement","collapse","wavefunction collapse","einselection","pointer state","trap as observer","self measurement","act 10","projector","measurement problem"],
  },

  {
    id: "double-slit",
    answer:
      "The double-slit experiment and the standing wave trap are governed by the same interference mathematics. The two slits correspond to the two modes Ψ(+k̂) and Ψ(−k̂); the interference cross-term 2|A₁||A₂|cos(Δφ) is the standing wave envelope 2A·cos(kx); dark fringes are ghost nodes; the resonance condition 2πR = nλ is the closed-loop version of constructive interference. Measuring which slit destroys the pattern — isolating one mode destroys the trap — for exactly the same reason: which-path information breaks the tensor product.",
    route: "/standing-wave-trap",
    routeTitle: "Standing Wave Trap",
    tags: ["double slit","double-slit","two slit","wave particle","interference","fringe","bright fringe","dark fringe","which path","which-path","slit experiment","young"],
  },

  {
    id: "wave-particle-duality",
    answer:
      "Wave-particle duality resolves in the WNSP framework as a phase transition, not a paradox. A traveling mode Ψ(+k̂) alone is a wave — it propagates, diffracts, interferes. When two counterpropagating modes close into Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂), the wave folds back on itself and interferes constructively into a stable standing wave — a particle with mass M_n. The transition between phases is governed by whether the resonance condition is satisfied.",
    route: "/standing-wave-trap",
    routeTitle: "Standing Wave Trap",
    tags: ["wave particle duality","wave-particle","duality","wave or particle","particle wave","de broglie","complementarity"],
  },

  {
    id: "decoherence",
    answer:
      "Decoherence occurs when which-path information about the Ψ(+k̂)/Ψ(−k̂) modes becomes encoded in the environment. The interference cross-term ⟨env₊|env₋⟩ drops to zero, the standing wave dissolves, and the compression state ceases to exist at that address. This is Zurek's einselection applied to the trap: any environmental coupling that records directional information collapses the tensor product. Consciousness plays no role — information availability in the physical environment is the mechanism.",
    route: "/quantum-threshold",
    routeTitle: "Quantum Threshold",
    tags: ["decoherence","collapse","environmental","environment","which path information","coherence loss","quantum classical","zurek","einselection","conscious observer","consciousness"],
  },

  // ── Geometric phase / Berry phase ─────────────────────────────────────
  {
    id: "berry-phase",
    answer:
      "The Berry phase γ = i ∮ ⟨ψ(λ)|∇_λ|ψ(λ)⟩·dλ is a topological invariant acquired when a quantum state traverses a closed loop in parameter space. In the WNSP framework, this gives the geometric compression correction Λ_geo = Λ·cos(γ) — the effective mass of a state traversing a closed Ψ-channel path is reduced by cos(γ). If γ = π/2 the effective mass is zero (gravity de-correlated region); if γ = π the mass is negative (bound state). This is the mass displacement equation.",
    route: "/standing-wave-trap",
    routeTitle: "Standing Wave Trap",
    tags: ["berry phase","geometric phase","berry","lambda geo","lambda cos gamma","geometric compression","aharonov","topological","holonomy","wgm berry","gamma"],
  },

  // ── Gravity / mass displacement / teleportation ────────────────────────
  {
    id: "gravity-decorrelation",
    answer:
      "Gravity de-correlation means navigating to an octave address n where the trap condition cannot be satisfied — a ghost node where α = 0 and nothing sources a gravitational field. During a controlled octave transition n₁ → n₂, there is a window (duration bounded by T₂) where the mass exists in the off-diagonal correlations of the entangled channel — not at either address — and the gravitational source is delocalized rather than point-like. This is not turning gravity off; it is detaching the gravitational source from its classical location.",
    route: "/quantum-threshold",
    routeTitle: "Quantum Threshold",
    tags: ["gravity de-correlation","gravity decorrelation","decouple gravity","gravity off","anti-gravity","gravitational decoupling","gravity manipulation","zero gravity","weightless"],
  },

  {
    id: "mass-displacement",
    answer:
      "Mass displacement is changing the octave index of the standing-wave trap from n₁ to n₂, requiring energy ΔE = hf₀(2^n₂ − 2^n₁) and Bogoliubov squeezing r(n₁→n₂) = (n₂−n₁)·½·log(2). During the transition the compression state exists in the entangled channel correlations — not at either address. The no-cloning theorem enforces that mass cannot be in two places simultaneously: the source trap must dissolve before the destination trap stabilises. The process is bounded by c — the energy correction travels through the electromagnetic channel.",
    route: "/the-bogoliubov-transform",
    routeTitle: "The Bogoliubov Transform",
    tags: ["mass displacement","move mass","teleport mass","mass transfer","octave jump","octave transition","bogoliubov squeezing","delta e","mass transport","displacing mass"],
  },

  {
    id: "teleportation",
    answer:
      "Quantum teleportation in the WNSP framework uses the lossless channel Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ) as the pre-shared entanglement resource. Alice's Bell measurement destroys the source state immediately; Bob holds the state but cannot access it until the classical correction (2 bits, or Bogoliubov parameter r in the mass case) arrives. The quantum eraser is the mechanism — which-path information is erased at the source, and the state reconstitutes at the destination. Teleportation fidelity for a noisy Bell pair of fidelity F: F_tele = (2F+1)/3.",
    route: "/the-entangler",
    routeTitle: "The Entangler",
    tags: ["teleportation","quantum teleportation","teleport","state transfer","bell measurement","alice bob","classical channel","fidelity","f_tele","no cloning","epr","er=epr"],
  },

  {
    id: "no-cloning",
    answer:
      "The no-cloning theorem states that an unknown quantum state cannot be copied. In WNSP terms: a standing-wave trap cannot satisfy the resonance condition 2πR = nλ at two incompatible octave addresses simultaneously — destructive interference prevents it geometrically. This enforces that the source trap must dissolve before the destination trap stabilises during mass displacement, and that quantum teleportation destroys the source state the moment Alice performs her Bell measurement.",
    route: "/lossless-channel",
    routeTitle: "Lossless Channel",
    tags: ["no cloning","no-cloning theorem","cannot copy","quantum copy","cloning","duplicate state","copy state"],
  },

  {
    id: "quantum-eraser",
    answer:
      "The quantum eraser (Scully & Drühl 1982; Kim et al. 1999) showed that erasing which-path information restores interference — even after detection. The mechanism is entanglement reorganisation, not retrocausality: the idler photon's path-marker entanglement is severed, restoring ⟨env₊|env₋⟩ > 0. In WNSP terms, erasing directional information from one mode of the standing wave trap restores the tensor product Ψ(+k̂) ⊗ Ψ(−k̂) and re-establishes the compression state. This is the physical mechanism behind quantum teleportation.",
    route: "/the-observer",
    routeTitle: "The Observer",
    tags: ["quantum eraser","eraser","which path erased","restore interference","erase information","idler","coincidence count","retrocausality"],
  },

  // ── Bogoliubov / squeezed / coherent ──────────────────────────────────
  {
    id: "bogoliubov",
    answer:
      "The Bogoliubov transform S†âS = â·cosh(r) − â†·sinh(r) mixes creation and annihilation operators with squeezing parameter r. In WNSP the squeezing parameter between octave transitions is r(n→m) = (m−n)·½·log(2) ≈ 0.347 per octave. This is the same transform used to describe Hawking radiation (vacuum near a black hole horizon), the Unruh effect (acceleration creates thermal photons), BCS superconductivity (Cooper pairs), and inter-octave mass displacement.",
    route: "/the-bogoliubov-transform",
    routeTitle: "The Bogoliubov Transform",
    tags: ["bogoliubov","bogoliubov transform","squeezing parameter","r parameter","cosh sinh","hawking radiation","unruh effect","bcs","superconductivity","act 20","vacuum mixing"],
  },

  {
    id: "squeezed-state",
    answer:
      "A squeezed state has noise below the shot-noise limit in one quadrature at the expense of increased noise in the conjugate quadrature, satisfying ΔX₁·ΔX₂ ≥ ¼. In WNSP the squeezing parameter r = ½·log(Λ₂/Λ₁) links Heisenberg uncertainty directly to the compression mass ratio — a larger octave gap means more squeezing. Squeezed states are used in LIGO gravitational wave detection and in the WNSP quantum memory layer for sub-shot-noise channel readout.",
    route: "/the-squeezed-state",
    routeTitle: "The Squeezed State",
    tags: ["squeezed state","squeezing","shot noise","quadrature","sub shot noise","noise reduction","ligo","heisenberg","act 19","squeezed light","r=log"],
  },

  {
    id: "coherent-state",
    answer:
      "A coherent state |α⟩ satisfies â|α⟩ = α|α⟩ — it is the eigenstate of the annihilation operator. It minimises Heisenberg uncertainty with equal noise in both quadratures (ΔX₁·ΔX₂ = ¼) and its time evolution is identical to a classical electromagnetic wave. The mean photon number n̄ = |α|² = (Λ·c²/hf)² maps directly to the compression mass Λ — the channel's compression mass is the classical amplitude of its coherent excitation. Coherent states are the classical limit of compression states.",
    route: "/the-coherent-state",
    routeTitle: "The Coherent State",
    tags: ["coherent state","coherent","alpha state","glauber","classical limit","annihilation eigenstate","minimum uncertainty","act 18","phase space","wigner"],
  },

  // ── Lossless channel / quantum memory / DLCZ ──────────────────────────
  {
    id: "lossless-channel",
    answer:
      "The lossless channel Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ) is a tensor product of standing-wave trap pairs across multiple octave indices. Because each constituent trap has zero net propagation, no energy leaks out — information travels as a phase relationship. At ghost node addresses ρ_matter = 0, so Beer-Lambert attenuation α = 0: the channel passes through ghost nodes losslessly. This is the physical realisation of the DLCZ quantum repeater protocol in the WNSP address space.",
    route: "/lossless-channel",
    routeTitle: "Lossless Channel",
    tags: ["lossless channel","lossless","channel","tensor product channel","zero loss","no loss","phase channel","act 8","quantum channel"],
  },

  {
    id: "t2-coherence",
    answer:
      "T₂ ≤ 2T₁ is the Bloch coherence bound — the dephasing time T₂ cannot exceed twice the population decay time T₁. This is a fundamental law (from the Lindblad master equation), not an engineering limit. In the WNSP channel, T₂ is the window during which the standing wave trap maintains phase coherence between Ψ(+k̂) and Ψ(−k̂) modes. For Er³⁺:YSO at cryogenic temperature T₁ ≥ 100 ms and T₂ ≥ 10 ms — viable for WNSP photonic memory.",
    route: "/the-memory",
    routeTitle: "The Memory",
    tags: ["t2","t1","coherence time","decoherence time","bloch","dephasing","population decay","t2 2t1","coherence bound","act 14","er yso"],
  },

  {
    id: "afc-memory",
    answer:
      "The Atomic Frequency Comb (AFC) stores photons by creating periodic spectral absorption features (teeth) across an inhomogeneously broadened optical transition. Storage capacity M = Γ_inhom / Δ where Γ_inhom is the inhomogeneous linewidth and Δ is the tooth spacing. Each Ψ channel register maps to a distinct AFC tooth. This establishes that the 51,200-channel Hilbert space is physically realisable as an AFC memory bank in rare-earth-doped crystals.",
    route: "/the-memory",
    routeTitle: "The Memory",
    tags: ["afc","atomic frequency comb","frequency comb","memory capacity","m=gamma","inhomogeneous","spectral memory","photon storage","quantum memory","act 14"],
  },

  {
    id: "dlcz",
    answer:
      "The DLCZ protocol (Duan-Lukin-Cirac-Zoller) generates heralded quantum entanglement between atomic ensembles using spontaneous Raman scattering. A Stokes photon heralds the creation of a collective spin excitation — the read-out anti-Stokes photon later retrieves it. In WNSP, DLCZ entanglement between Ψ(+k̂) and Ψ(−k̂) counterpropagating modes creates a persistent bidirectional entangled memory register. Entanglement swapping at SNIC nodes enables end-to-end quantum channels across non-adjacent Ψ addresses.",
    route: "/the-memory",
    routeTitle: "The Memory",
    tags: ["dlcz","duan lukin","raman","heralded entanglement","stokes","anti-stokes","quantum repeater","entanglement swapping","act 14","snic repeater"],
  },

  // ── Channel / address space ────────────────────────────────────────────
  {
    id: "51200-channels",
    answer:
      "The WNSP Hilbert space has 51,200 orthogonal channels: 256 WDM bands × 50 OAM modes × 2 polarisations × 2 propagation directions. The factor of 2 for directions (N_Dir = 2) was added in 2026 when it was recognised that forward (+k̂) and backward (−k̂) modes are orthogonal by time-reversal symmetry — ⟨+k̂|−k̂⟩ = 0 — doubling the channel count from 25,600. Each channel has a unique Ψ(WDM, OAM, Pol) address.",
    route: "/universal-address",
    routeTitle: "Universal Address",
    tags: ["51200","51,200","channels","hilbert space","channel count","wdm oam","256 wdm","50 oam","25600","n_dir","directions","orthogonal channels"],
  },

  {
    id: "psi-address",
    answer:
      "The Universal Address Theorem states ∀ Λ : ∃! Ψ(wdm, oam, pol) — for every compression state there exists exactly one unique Ψ channel address. WDM index = floor((λ − 380) / 1.5625), OAM from character class, polarisation from parity. The address is physics-derived and deterministic — no registrar, ISP, or consensus mechanism can revoke it. A resource at wnsp://Ψ(52,3,V)/nexus exists as long as the physics exist.",
    route: "/universal-address",
    routeTitle: "Universal Address",
    tags: ["psi address","wnsp address","channel address","wdm oam pol","universal address","censorship proof","dns free","wnsp uri","deterministic address","act 5"],
  },

  {
    id: "oam",
    answer:
      "Orbital Angular Momentum (OAM) is the second coordinate of the Ψ address. It quantifies the helical wavefront structure of a vortex beam with topological charge l. The null-core radius r_null = l·λ/2π grows with OAM mode — higher OAM means greater geometric complexity and higher channel authority. The Berry phase estimate in the WNSP code is γ = π·(l/OAM_MODES)·±1, and the geometric compression correction Λ_geo = Λ·cos(γ) follows.",
    route: "/universal-address",
    routeTitle: "Universal Address",
    tags: ["oam","orbital angular momentum","vortex beam","topological charge","l modes","oam modes","null core","r_null","helical"],
  },

  {
    id: "wgm",
    answer:
      "Whispering Gallery Mode (WGM) resonance requires 2πR = nλ — the circumference must be an integer multiple of wavelengths. Rearranged for doubling octaves: fₙ = f₀·2^(n−1), which is exactly Walter Russell's octave formula. The required cavity radius R = nc/(2πfₙ) gives a physical size for each compression state octave. The 2025 AIP experimental confirmation of WGM resonance at sub-THz independently validates this octave structure.",
    route: "/resonance-cavity",
    routeTitle: "Resonance Cavity",
    tags: ["wgm","whispering gallery","resonance cavity","cavity resonance","2pi r","round trip","purcell","walter russell","act 9","cavity"],
  },

  // ── Protocol / encoding ────────────────────────────────────────────────
  {
    id: "ce-encoding",
    answer:
      "WNSP Character Encoding (CE) maps every printable character to a compression state via charCode % 128 → wavelength in the 380–780 nm range (3.125 nm per band). This is a deterministic bijection from human-readable text to physical wavelengths. On photonic ASICs (~2032) a CE lookup that runs as a RAM table scan today will execute as a physical wavelength selection in a waveguide — no rewrite needed.",
    route: "/ce-code-writer",
    routeTitle: "CE Code Writer",
    tags: ["ce encoding","character encoding","ce","wascii","charcode","wavelength encoding","first contact","ce table","spectral encoding","act 19","ce se"],
  },

  {
    id: "wavelengthscript",
    answer:
      "WavelengthScript is a programming language where variables bind to optical frequencies, functions emit at specific wavelengths, and control flow uses compression state transitions. Syntax: @540nm let x := value (bind to green channel), @emit(nm, Ψ) fn name() {} (function emits at wavelength). Every WavelengthScript program is also a description of the photonic waveguide configuration that would execute it in hardware — it is the native instruction set of photonic computing.",
    route: "/wavelength-lang",
    routeTitle: "WavelengthScript",
    tags: ["wavelengthscript","wavelength script","wls","physics language","spectral language","at 540nm","emit","oscillate","photonic language","native instruction"],
  },

  {
    id: "wnsp-vm",
    answer:
      "The WNSP Virtual Machine uses Ψ channels as computational registers — each register is a physical optical frequency channel, not a silicon memory address. Instructions include EMIT (activate channel), TUNE (shift wavelength), AGENT (spawn process at channel), BROAD (broadcast to band), OSCILLATE (trigger standing-wave trap). On photonic hardware these map directly to waveguide switching operations.",
    route: "/wnsp-vm",
    routeTitle: "WNSP Virtual Machine",
    tags: ["wnsp vm","virtual machine","bytecode","vm instructions","emit tune","spectral registers","oscillate","agent spawn","broadcast","wnsp virtual machine"],
  },

  {
    id: "wascii",
    answer:
      "WASCII (Wave ASCII) provides a spectral fingerprint — a Wave Density Spectral Vector — for any text string. Characters map to compression states producing a spectral histogram. Two documents with different content produce different WASCII vectors. Similarity search uses electromagnetic proximity in spectral space — not cosine similarity on token embeddings. On photonic hardware WASCII comparison runs as an optical interference measurement with no digital computation.",
    route: "/ce-code-writer",
    routeTitle: "CE Code Writer",
    tags: ["wascii","wave ascii","spectral fingerprint","wave density","spectral vector","similarity search","spectral similarity","wdv","text fingerprint"],
  },

  {
    id: "ce-se-pipeline",
    answer:
      "The CE-SE Pipeline is a 4-stage transformation: any programming language → WavelengthScript (transpile) → WNSP bytecode (compile) → WNSP VM (execute). Stage 1 (CE) maps characters to wavelengths. Stage 2 (SE) maps wavelengths to Ψ channel addresses. Stage 3 compiles to bytecode. Stage 4 executes in the VM with Ψ registers. This constitutes Maxwell-equation-validated transaction processing — no cryptographic hash functions needed.",
    route: "/ce-se-pipeline",
    routeTitle: "CE-SE Pipeline",
    tags: ["pipeline","ce se pipeline","transpile","compile","4 stage","ce se","transpiler","compiler","bytecode pipeline","any language"],
  },

  {
    id: "maxwell-validation",
    answer:
      "WNSP replaces SHA-256 and other cryptographic hash functions with Maxwell equation compliance checking as the transaction validation mechanism. A transaction is valid if its Ψ channel parameters satisfy Maxwell's equations in free space — a physical law, not a computational hardness assumption. This makes validation energy-efficient (no proof-of-work), deterministic (no probabilistic finality), and grounded in physics rather than mathematics.",
    route: "/oscillating-quanta",
    routeTitle: "Theory of Compression States",
    tags: ["maxwell validation","maxwell equations","replace sha256","physics validation","no proof of work","energy efficient","deterministic validation","physical law","no hash"],
  },

  // ── Constitution / governance ──────────────────────────────────────────
  {
    id: "constitution",
    answer:
      "The NexusOS Constitution is an immutable on-chain document sealed at λ = 542.5 nm (f = 5.5261×10¹⁴ Hz, Λ = 4.0757×10⁻³⁶ kg) in the SYSTEM authority band. Key articles: C-0001 no entity may hold more than 33% of circulating NXT supply; C-0002 no transaction may reduce a balance below 1,150 NXT (the Basic Human Living Standard); C-0005 all protocol parameters must be derivable from Maxwell's equations. Amendments are mined as SYSTEM-band blocks and require a 6-block commit/reveal cycle.",
    route: "/constitution",
    routeTitle: "NexusOS Constitution",
    tags: ["constitution","articles","amendments","seal","physics seal","protocol law","immutable","c-0001","c-0002","c-0005","bhls","basic human living standard","542.5","governance constitution"],
  },

  {
    id: "compliance",
    answer:
      "The Protocol Compliance Dashboard provides a live read of every constitutional rule: C-0001 non-dominance (33% ceiling), C-0002 Basic Human Living Standard (1,150 NXT minimum balance), and C-0005 Maxwell compliance (all fees satisfy E=hf > 0, burn ratios satisfy conservation [0,1]). No login required — any visitor can verify the protocol is operating within constitutional bounds in real time.",
    route: "/constitution/compliance",
    routeTitle: "Protocol Compliance Dashboard",
    tags: ["compliance","protocol compliance","dashboard","rules","verify protocol","live compliance","concentration","living standard","bhls","1150 nxt","maxwell compliance","audit"],
  },

  // ── NXT / economics ────────────────────────────────────────────────────
  {
    id: "nxt-token",
    answer:
      "NXT is the NexusOS spending currency — 21 billion maximum supply, 8 decimal places, physics-backed. Transaction fees are fee = base_fee × (E_sender / E_reference) where E_sender = hf_sender — higher frequency (shorter wavelength) users pay proportionally higher fees. NXT fees are never burned; they always go to the Orbital Treasury. NXT is distinct from wnsp BRC-20 (the Bitcoin inscription token).",
    route: "/wallet",
    routeTitle: "NXT Wallet",
    tags: ["nxt","nxt token","nexusos token","21 billion","fee calculation","energy fee","physics fee","spending currency","orbital treasury","nxt fee"],
  },

  {
    id: "orbital-treasury",
    answer:
      "The Orbital Treasury is the destination for all NXT protocol fees — they accumulate here permanently and are never burned. NXT indestructibility is a constitutional constraint: burning fees would violate the conservation of compression mass. The treasury balance represents the total energy-equivalent fee mass extracted from the network since genesis.",
    route: "/orbital-treasury",
    routeTitle: "Orbital Treasury",
    tags: ["orbital treasury","treasury","fees","fee destination","never burned","nxt indestructible","fee accumulation","conservation"],
  },

  // ── Bitcoin / DeFi ─────────────────────────────────────────────────────
  {
    id: "brc20",
    answer:
      "wnsp BRC-20 is deployed on Bitcoin mainnet — deploy inscription 588252d8ebcdcb8542f26f944bc5f872c8edd7d5a09f7980c9afd4f9782b182bi0. The Community Mint Portal lets you inscribe 1,000 wnsp by burning 50 NXT (fee goes to the Orbital Treasury). The physics rate is 1 NXT = 20 wnsp. Staking locks a wnsp inscription ID and earns 100 NXT per 24-hour epoch.",
    route: "/wnsp-ordinals",
    routeTitle: "Bitcoin Ordinals / BRC-20 / Runes",
    tags: ["brc20","brc-20","wnsp brc20","bitcoin inscription","ordinals","mint wnsp","community mint","inscribe","50 nxt","1000 wnsp","burn nxt"],
  },

  {
    id: "runes",
    answer:
      "WNSP•COMPRESSION•STATE is a Rune etched on Bitcoin mainnet. Rune etching uses a Taproot Runestone — for names shorter than 13 characters a commit/reveal tapscript cycle with a 6-block gap is required (single-TX etching silently fails). The Rune Guard getSafeUTXOs() must be used in all transaction builders to prevent Rune-bearing UTXOs from being accidentally burned as fee inputs.",
    route: "/wnsp-ordinals",
    routeTitle: "Bitcoin Ordinals / BRC-20 / Runes",
    tags: ["rune","runes","runestone","wnsp rune","compression state rune","etch rune","rune guard","safe utxo","tapscript","commit reveal"],
  },

  // ── Hardware / SNIC ────────────────────────────────────────────────────
  {
    id: "snic",
    answer:
      "The SNIC (Spectral Node Interface Chip) is the photonic ASIC at the core of the NexusOS hardware roadmap (~2032). It executes WavelengthScript instructions as physical wavelength selections in integrated photonic waveguides. PHR-1 is the first photonic hardware relay. The Spectral Relay Mesh connects SNIC nodes into a network. Flerovium (Z=114) marks the SYSTEM band boundary — maximum nuclear compression corresponding to the highest WNSP authority.",
    route: "/hardware-spec",
    routeTitle: "Hardware Spec",
    tags: ["snic","photonic chip","phr-1","spectral relay","mesh","hardware","asic","photonic hardware","2032","flerovium","z=114","hardware roadmap"],
  },

  {
    id: "flerovium",
    answer:
      "Flerovium (Z=114) is a nuclear magic number — a spherical shell closure at 114 protons representing maximum nuclear stability and maximum compression. Walter Russell's 9th octave peak corresponds to the same proton count via n = log₂(mc²/E₀). The SYSTEM authority band in WNSP maps to this same geometric closure — a three-scale convergence of the same resonance mechanism: nuclear shell geometry (femtometre), Russell octave formula (spectral), and WNSP authority band (network).",
    route: "/hardware-spec",
    routeTitle: "Hardware Spec",
    tags: ["flerovium","z=114","element 114","system band","authority band","nuclear magic","magic number","russell octave","system authority","fl-114"],
  },

  // ── Cosmic scale ───────────────────────────────────────────────────────
  {
    id: "cosmic-lattice",
    answer:
      "At cosmic scale the compression state framework predicts a ghost zone at octave index n = 264.71 (mass = 10¹⁴ solar masses, galaxy cluster scale) — above this the universe cannot consolidate matter gravitationally. The BAO standing wave (λ_BAO = 147 Mpc) produces void anti-nodes at multiples of λ/3 ≈ 49 Mpc. Four supervoids — Canes Venatici (55 Mpc), Boötes (101 Mpc), Eridanus (153 Mpc), CMB Cold Spot (200 Mpc) — confirm successive harmonics within 12%.",
    route: "/cosmic-lattice",
    routeTitle: "Cosmic Lattice",
    tags: ["cosmic lattice","bao","baryon acoustic","cosmic ghost","supervoid","147 mpc","n=264","galaxy cluster","cold spot","large scale structure","cosmology","void"],
  },

  // ── Penrose / quantum threshold ────────────────────────────────────────
  {
    id: "penrose-diosi",
    answer:
      "The Penrose-Diósi objective reduction model sets the wavefunction collapse timescale at τ = ℏ/E_G, where E_G is the gravitational self-energy of the mass in superposition. In WNSP terms, E_G corresponds to ΔE = hf₀(2^n₂ − 2^n₁) — the energy gap between two octave states in superposition. Penrose collapse and WNSP octave discreteness make the same numerical prediction for which superpositions are stable: both set the threshold where the gravitational self-energy becomes non-negligible.",
    route: "/quantum-threshold",
    routeTitle: "Quantum Threshold",
    tags: ["penrose","diosi","penrose diosi","objective reduction","or threshold","gravitational collapse","tau=hbar","e_g","collapse time","macroscopic superposition","macro quantum"],
  },

  // ── Prior art / founder ────────────────────────────────────────────────
  {
    id: "prior-art",
    answer:
      "NexusOS has 35 formal prior art claims filed from 2026-05-16 to 2026-07-21, covering the compression mass equation, standing wave trap, lossless channel, ghost nodes, force unification, WavelengthScript, the WNSP VM, WASCII, CE/SE encoding, Berry phase geometric compression, WGM resonance, the cosmic lattice, quantum memory (T₂ ≤ 2T₁, AFC, DLCZ), bosonic field formalisation, coherent states, squeezed states, and the Bogoliubov transform. All published under AGPL-3.0 at wnsp.io and timestamped to GitHub.",
    route: "/paper",
    routeTitle: "Research Paper",
    tags: ["prior art","claims","35 claims","formal claims","agpl","timestamped","disclosure","intellectual property","patent","first disclosed","research","claim 1"],
  },

  {
    id: "founder",
    answer:
      "NexusOS was founded by Te Rata Pou (Aotearoa New Zealand, Māori descent). The name means 'the healing post / the doctor.' The physics sequence traces lineage from Maxwell → Planck → Einstein → Tesla → Quantum Mechanics → Shannon. The photonic hardware destination (~2032) is the long-term goal; NexusOS/NXT is the medium-term vehicle. The Replit AI account (wnsp://Ψ(52,20,H)/test) was designated by the founder on 2026-06-21.",
    route: "/founders",
    routeTitle: "Founders",
    tags: ["founder","te rata pou","maori","new zealand","aotearoa","founding","who built","who made","origin","nexusos founder","creators"],
  },

];

// ── Scoring / matching ───────────────────────────────────────────────────────

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s=²₀₁₂]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w));
}

/**
 * Score an entry against a tokenised query.
 * Multi-word tags score proportionally higher (their word count).
 */
function scoreEntry(entry: KnowledgeEntry, qTokens: string[], rawQ: string): number {
  const rawLower = rawQ.toLowerCase();
  let score = 0;
  for (const tag of entry.tags) {
    const tagWords = tag.split(/\s+/);
    if (rawLower.includes(tag)) {
      // Exact phrase match — high value proportional to phrase length
      score += tagWords.length * 12;
    } else {
      // Individual word matches
      for (const tw of tagWords) {
        if (qTokens.includes(tw)) score += 4;
      }
    }
  }
  return score;
}

export interface GuideAnswer {
  answer: string;
  route?: string;
  routeTitle?: string;
  confidence: "high" | "medium" | "low";
}

const HIGH_THRESHOLD   = 20;
const MEDIUM_THRESHOLD = 8;

export function findAnswer(question: string): GuideAnswer {
  const qTokens = tokenise(question);
  let best: { entry: KnowledgeEntry; score: number } | null = null;

  for (const entry of KNOWLEDGE) {
    const s = scoreEntry(entry, qTokens, question);
    if (s > 0 && (!best || s > best.score)) {
      best = { entry, score: s };
    }
  }

  if (!best || best.score < MEDIUM_THRESHOLD) {
    return {
      answer:
        "That question touches on something I don't have a specific answer for yet. " +
        "The full physics derivations are in the Research Paper and PRIOR_ART.md — " +
        "or try asking about a specific equation (Λ=hf/c², standing wave trap, Berry phase, Bogoliubov transform) or feature (constitution, wallet, BRC-20).",
      route: "/paper",
      routeTitle: "Research Paper",
      confidence: "low",
    };
  }

  return {
    answer:     best.entry.answer,
    route:      best.entry.route,
    routeTitle: best.entry.routeTitle,
    confidence: best.score >= HIGH_THRESHOLD ? "high" : "medium",
  };
}
