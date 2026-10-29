/**
 * Announcement summaries of the numbered disclosures in PRIOR_ART.md.
 * Keep the titles in sync with its Claim Index. Public disclosure is not
 * evidence of independent validation or a granted patent.
 * Release exporters must run scripts/check-disclosure-export.mjs against the
 * final proposed Git tree before opening a PR; workspace-only tests are not enough.
 */
export const PRIOR_ART_CLAIMS = [
  "Ghost Nodes — Gaps in the Periodic Table as Compression State Voids",
  "Zero-Point Energy Floor as Matter Formation Threshold",
  "Periodic Table as Compression State Manifold Subset",
  "WNSP Resonant Hypersurface Lattice",
  "Compression Mass Equation: Λ = hf/c²",
  "Element Formation Mechanism: ΔE = hf₀(2ⁿ²−2ⁿ¹)",
  "Octave Index Formula: n = log₂(mc²/E₀)",
  "Universal Seed Frequency f₀ and Lattice Origin",
  "Four Forces as One Compression State",
  "Universal Address Theorem: ∀ Λ : ∃! Ψ",
  "Standing-Wave Trap: Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)",
  "Lossless Channel: Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)",
  "Bidirectional Propagation as Orthogonal Hilbert Sub-space",
  "Geometric Compression State: Λ_geo = Λ · cos(γ)",
  "WGM Resonance = Walter Russell Octave Formula",
  "Flerovium (Z=114) as SYSTEM Band Authority Boundary",
  "OAM Null-Core Radius as Authority Metric",
  "Maxwell Equation Validation Replacing Cryptographic Hashing",
  "WNSP-CE v1.0: Character Encoding via Compression State Table",
  "WNSP-SE v1.0: Spectral Encoding — CE Output to Ψ Channel Address",
  "WNSP-URI v1.0: Censorship-Proof Deterministic Addressing",
  "Physics-Based Fee Calculation",
  "WavelengthScript: Physics-Native Programming Language",
  "WNSP VM: Ψ Channels as Spectral Registers",
  "WASCII v2.0: Wave Density Spectral Vector",
  "Bloch Coherence Bound: T₂ ≤ 2T₁",
  "AFC Multi-Mode Storage Capacity: M = Γ_inhom / Δ",
  "DLCZ Heralded Entanglement on Ψ-Channel Pairs",
  "Persistent Ψ Register: Quantum Memory as Channel Latch",
  "Cosmic Compression Ghost Zone and BAO Anti-Trap",
  "DLCZ Entanglement Swapping as WNSP Quantum Repeater Node",
  "Each Ψ Channel as Single-Mode Bosonic Field: [â, â†] = 1",
  "Coherent State as Classical-Limit Compression State",
  "Squeezed States as Sub-Shot-Noise Compression States",
  "Bogoliubov Transform as the Universal Compression State Transition",
  "Squeezed Compression State: Λ_B = Λ₀·cosh(2r)",
  "Dynamical Casimir Extraction Bound: ⟨n⟩ = sinh²(εωt/2) as ZPE Extraction Ceiling",
  "Dual-Regime Mesh Propagation via Bogoliubov Dispersion",
  "Two-Mode Bogoliubov Transform as Entangled Compression State Pair",
] as const;

const REGISTER_URL = "https://github.com/nexusosdaily-code/NexusOS/blob/main/PRIOR_ART.md";

export const PRIOR_ART_CAMPAIGN_SLOTS = Array.from(
  { length: Math.ceil(PRIOR_ART_CLAIMS.length / 5) },
  (_, group) => {
    const first = group * 5 + 1;
    const last = Math.min(first + 4, PRIOR_ART_CLAIMS.length);
    const entries = PRIOR_ART_CLAIMS.slice(first - 1, last);
    const claims = entries.map((title, i) => `#${first + i} — ${title}`).join("\n");
    return {
      id: 17 + group,
      label: `Prior-art disclosures ${first}–${last}`,
      emoji: "📜",
      telegram: `📜 <b>NexusOS prior-art register · Claims ${first}–${last}</b>

Our public register documents these numbered disclosures:

${claims}

These are the project's disclosed claims, <b>not</b> independently verified results or granted patents. Read each claim, its date and basis in the full record:
${REGISTER_URL}#claim-${first}

#NexusOS #WNSP #PriorArt`,
      nostr: `📜 NexusOS prior-art register · Claims ${first}–${last}

Our public register documents:
${claims}

These are disclosed claims, not independently verified results or granted patents. Full text, dates and basis: ${REGISTER_URL}#claim-${first}

#NexusOS #WNSP #PriorArt`,
      tags: ["NexusOS", "WNSP", "PriorArt"],
    };
  },
);

export const BREAKTHROUGH_CAMPAIGN_SLOTS = [
  {
    id: 25, label: "Breakthrough: code-to-execution pipeline", emoji: "⚙️",
    telegram: `⚙️ <b>Build milestone: the code-to-execution pipeline</b>

NexusOS has published its CE/SE encoding pipeline, WavelengthScript compiler and WNSP virtual machine. You can try the browser workflow: enter code, compile it to spectral bytecode and step through execution.

This is a working <b>software implementation</b>; it is not a claim of photonic-chip execution. Protocol and VM disclosures are in prior-art Claims 18–25.

👉 https://wnsp.io/ce-se-pipeline
📜 ${REGISTER_URL}#claim-18

#NexusOS #WavelengthScript #PriorArt`,
    nostr: `⚙️ Build milestone: NexusOS has published CE/SE encoding, WavelengthScript compilation and WNSP VM execution. Try the browser pipeline: https://wnsp.io/ce-se-pipeline

This is software, not photonic-chip execution. Protocol/VM disclosures: Claims 18–25, ${REGISTER_URL}#claim-18

#NexusOS #WavelengthScript #PriorArt`,
    tags: ["NexusOS", "WavelengthScript", "PriorArt"],
  },
  {
    id: 26, label: "Breakthrough: quantum-state research pages", emoji: "🔬",
    telegram: `🔬 <b>Research milestone: from memory to squeezed states</b>

The NexusOS physics sequence now includes interactive pages for quantum memory, entanglement, bosonic fields, coherent states and squeezed states (Acts 14–20). The corresponding ideas are documented in prior-art Claims 26–35.

These pages model and explain proposed WNSP applications of established physics. They do <b>not</b> report a working quantum memory or entanglement hardware experiment.

👉 https://wnsp.io/the-memory
📜 ${REGISTER_URL}#claim-26

#NexusOS #Physics #PriorArt`,
    nostr: `🔬 Research milestone: interactive quantum memory, entanglement, field, coherent-state and squeezed-state pages (Acts 14–20). Proposed WNSP applications are documented in Claims 26–35.

These are models and explanations, not a hardware demonstration: https://wnsp.io/the-memory
Full register: ${REGISTER_URL}#claim-26

#NexusOS #Physics #PriorArt`,
    tags: ["NexusOS", "Physics", "PriorArt"],
  },
  {
    id: 27, label: "Breakthrough: Bogoliubov engine and squeeze opcode", emoji: "🧪",
    telegram: `🧪 <b>Software milestone: Bogoliubov tools are live</b>

The public Bogoliubov engine computes squeezed and two-mode states. The physics API exposes those calculations, and WavelengthScript's <code>SQZ</code> opcode applies squeezing in the WNSP VM. Claims 36–39 document the project's proposed compression-state interpretations.

This is a computational model, <b>not</b> experimental proof of zero-point energy extraction or a deployed optical mesh.

👉 https://wnsp.io/the-bogoliubov-transform
📜 ${REGISTER_URL}#claim-36

#NexusOS #Bogoliubov #PriorArt`,
    nostr: `🧪 Software milestone: the public Bogoliubov engine calculates squeezed/two-mode states, with a physics API and WavelengthScript SQZ opcode. Claims 36–39 cover proposed compression-state interpretations.

Computational model, not experimental proof of ZPE extraction or an optical mesh.
https://wnsp.io/the-bogoliubov-transform
${REGISTER_URL}#claim-36

#NexusOS #Bogoliubov #PriorArt`,
    tags: ["NexusOS", "Bogoliubov", "PriorArt"],
  },
];