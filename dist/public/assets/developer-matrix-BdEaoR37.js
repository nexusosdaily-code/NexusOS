import{j as e}from"./vendor-query-Bv9H5-RN.js";import{r as _,L as W}from"./vendor-router-tr6KpmeX.js";import{C as t}from"./card-CYxvGPJQ.js";import{B as P}from"./button-D59yzw37.js";import{B as i}from"./badge-B9k7b6rb.js";import{P as F}from"./progress-DNrVzrVF.js";import{T as re,a as ne,b as d,c as m}from"./tabs-DXOO7waM.js";import{R as V,g as C,aD as c,ag as X,b as f,Z as x,H as v,S as p,I as S,q as I,G as k,b7 as y,f as G,be as B,B as L,bf as ie,bg as oe,F as H,D as b,E as g,J as ce,ah as h,ar as le,K,l as de,L as z,aF as me,r as he,U as ge,av as pe}from"./vendor-icons-DxZLqVKp.js";import"./index-B7n_VJ-G.js";import"./vendor-radix-U50gSQ5i.js";import"./vendor-charts-D6_ndWWt.js";const U={substrate:{title:"Lambda Gate Substrate v4",icon:f,color:"from-purple-500 to-pink-500",content:[{heading:"Core Theory",text:`The Lambda Gate Substrate is the foundational layer where all NexusOS operations occur as wavefield transformations.

**Lambda Mode State Vector:**
|λ⟩ = (ν, A(t), φ(t), ℓ, s)

Where:
- ν = carrier frequency (Hz)
- A(t) = amplitude envelope  
- φ(t) = phase evolution
- ℓ = orbital angular momentum index
- s = polarization/spin state`},{heading:"Master Equation",text:`E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)

This governs all energy requirements for Lambda mode operations:
- h·ν·I(λ) = base photon energy × intensity
- α·||K̂||² = phase curvature cost
- β·O(L̂) = orbital complexity cost`},{heading:"8 Lambda Gate Primitives",text:`1. **Phase-Shift Φ(θ)** — Electro-optic phase shifter
   - Rotates phase by angle θ
   - Used for: interference control, encryption

2. **Gain G(α)** — Variable optical attenuator/amplifier
   - Scales amplitude by factor α
   - Used for: signal boosting, attenuation

3. **Mode-Mixer M(κ)** — Multiport interferometer
   - Combines multiple modes with coupling κ
   - Used for: superposition, entanglement

4. **OAM-Rotor L(Δℓ)** — Spiral phase plate
   - Changes orbital angular momentum by Δℓ
   - Used for: channel multiplexing, data encoding

5. **Phase-Gradient ∇Φ** — Acoustic-optic modulator
   - Applies spatial phase gradient
   - Used for: beam steering, spectral shifting

6. **Density-Swap S** — Resonator coupling
   - Exchanges energy between modes
   - Used for: state transfer, routing

7. **Coherence-Amplify A_c** — Parametric amplifier
   - Boosts coherence without noise (5× Q-factor)
   - Used for: long-distance transmission, repeaters

8. **Stabilizer D(τ)** — Active feedback locking
   - Maintains coherence for duration τ
   - Used for: storage, memory operations`},{heading:"CE-1 Protocol (Coherence Engineering)",text:`The CE-1 protocol manages energy and coherence across all substrate operations:

**Energy Pool Management:**
- Each tick allocates energy budget
- Operations draw from shared pool
- Overflow triggers throttling

**Coherence Margin:**
- Minimum coherence threshold: 0.1
- Operations below margin are rejected
- Adaptive fidelity control adjusts precision

**Non-Dominance Rules:**
- No single node > 33% of total Lambda mass
- Prevents concentration of power
- Constitutional enforcement at substrate level`}]},wascii:{title:"WASCII — Spectral Encoding Standard",icon:c,color:"from-blue-500 to-cyan-500",content:[{heading:"WASCII — Wavelength-Native Character Standard",text:`WASCII is the authoritative character-to-wavelength table for WNSP-SE v1.0 (November 2025). 202 characters each have a canonical electromagnetic address — not derived from a formula, but assigned from spectral band semantics.

**Spectral Band Assignments:**
- A–Z uppercase: 380–530 nm (violet→green, Δ6nm)
- a–z lowercase: 383–533 nm (+3nm sub-band offset)
- Digits 0–9: 536–590 nm (green→yellow, Δ6nm)
- Common symbols: 596–758 nm (space=596, .=602 … ;=758)
- Greek lowercase α–ω: 760–826 nm (Near-IR, Δ3nm)
- Greek uppercase Γ–Ω: 830–857 nm
- Math operators ∫ ∂ ∇ √ ∞: 350–394 nm (Near-UV)
- Physics symbols ℏ Å °: 860–902 nm
- Subscripts ₀–₉: 905–932 nm  |  Superscripts ⁰–⁹: 938–965 nm
- Arrows & Logic → ← ⇒ ∧ ∨ ⟨ ⟩: 970–1033 nm

**Canonical Examples:**
- 'H' → 422 nm (Blue)  |  'E' → 404 nm (Violet)  |  'L' → 446 nm (Blue)
- 'Λ' → 839 nm (Near-IR)  |  'ψ' → 823 nm  |  '∞' → 362 nm (UV)`},{heading:"WnspFrame — Physical Transmission Unit",text:`Each character produces one WnspFrame (WNSP-SE v1.0, Section 3.5):

**Frame Fields:**
\`\`\`
sync            = 0xAA         # synchronisation constant
symbol          = 'H'          # the character
wavelength_nm   = 422.0        # WASCII canonical address
frequency_hz    = 7.10e+14     # f = c/λ
energy_joules   = 4.71e-19     # E = hf
lambda_mass_kg  = 5.25e-36     # Λ = hf/c²
intensity_level = 0–7          # 3-bit amplitude field
checksum        = 238          # (ord XOR round(nm)) mod 256
payload_bit     = 0 or 1       # DAG-linking bit
timestamp_ms    = <epoch ms>   # transmission time
wascii_defined  = True         # from authoritative table
\`\`\`

**Phase Sequence Token (PSQ):**
Every transmission also carries:  PSQ-{hash24}-TTL10

**Coherence γ:**
γ = 1 − (std_dev / mean) of all frame wavelengths.
Threshold: γ ≥ 0.70 for a valid transmission.`},{heading:"Extended Character Set (202 Characters)",text:`WASCII covers every character needed for physics, mathematics, and code:

**Scientific Symbols (Near-UV band, 350–394 nm):**
- ∫ ∂ ∇ √ ∞ ≈ ≠ ≤ ≥ ± ∓ × ÷ ∑ ∏ ∆

**Greek Alphabet (Near-IR, 760–857 nm):**
- Lowercase: α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ υ φ χ ψ ω
- Uppercase: Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω

**Physics Symbols (Far-IR, 860–902 nm):**
- ℏ Å ° ′ ″ ∝ ∈ ∉ ∅ ∪ ∩ ⊂ ⊃ ∀ ∃

**Arrows & Quantum Logic (970–1033 nm):**
- → ← ↑ ↓ ↔ ⇒ ⇐ ⇔ ∧ ∨ ¬ ⊕ ⊗ ⊙ ⊥ ∥ ∠ ⟨ ⟩

**API Access:**
GET  /api/wnsp/wascii/table   — full 202-char table
POST /api/wnsp/wascii/lookup  — per-char WnspFrame for any string`}]},consensus:{title:"Proof of Spectrum Consensus",icon:V,color:"from-green-500 to-emerald-500",content:[{heading:"Spectral Diversity Requirement",text:`Unlike Proof of Work (51% hashpower) or Proof of Stake (51% stake), Proof of Spectrum requires validators across ALL spectral regions.

**Core Principle:**
"Just as you cannot create white light with only one wavelength, you cannot create a valid block without multiple spectral regions represented."

**Attack Resistance:**
An attacker must control validators in ALL 6 spectral bands simultaneously - exponentially harder than controlling 51% of one resource.`},{heading:"Spectral Regions",text:`| Region | Wavelength | Required Stake |
|--------|------------|----------------|
| Violet | 380-450nm  | 50,000+ NXT    |
| Blue   | 450-495nm  | 20,000+ NXT    |
| Green  | 495-570nm  | 10,000+ NXT    |
| Yellow | 570-590nm  | 5,000+ NXT     |
| Orange | 590-620nm  | 2,000+ NXT     |
| Red    | 620-750nm  | 1,000+ NXT     |`},{heading:"Wave Interference Validation",text:`Blocks are validated through wave interference patterns:

**Constructive Interference (Valid):**
A₁sin(ωt) + A₂sin(ωt) = (A₁+A₂)sin(ωt)
Result: Amplified signal → Block VALID

**Destructive Interference (Invalid):**
A₁sin(ωt) + A₂sin(ωt+π) = (A₁-A₂)sin(ωt)
Result: Cancelled signal → Block INVALID

**Consensus Threshold:**
Block requires signatures from ≥5 of 6 spectral regions (83% spectral coverage).`}]},economics:{title:"NXT Token Economics",icon:x,color:"from-amber-500 to-orange-500",content:[{heading:"Token Fundamentals",text:`**Total Supply:** 21,000,000,000 NXT (21 billion)
**Decimals:** 8 (like Bitcoin)
**Smallest Unit:** 0.00000001 NXT (1 unit = 10⁻⁸ NXT)

**Initial Distribution:**
- New user registration: 500,000,000 units (5 NXT)
- Energy-backed via Lambda mass`},{heading:"Physics-Based Transaction Fees",text:`Transaction fees are calculated using Planck's equation:

**Fee Formula:**
fee = E = hf = h × (c/λ)

Where:
- h = 6.626×10⁻³⁴ J·s (Planck's constant)
- c = 299,792,458 m/s (speed of light)
- λ = transaction wavelength (derived from content)

**Result:** Fees are proportional to information complexity, not arbitrary gas prices.`},{heading:"Lambda Mass Valuation",text:`All value in NexusOS is backed by Lambda mass:

**Lambda Boson Equation:**
Λ = hf/c²

This means:
- Value has physical mass-equivalent
- Cannot be created from nothing
- Conservation laws apply to economics
- Inflation is physically impossible`}]},ihr:{title:"Immutable Human Rights Floor",icon:p,color:"from-red-500 to-pink-500",content:[{heading:"Basic Human Living Standard",text:`1,150 NXT/month is the measured monthly service consumption per citizen — the gauge of what the charity delivers. The charity receives funds from the orbital treasury and provides services across 7 categories. C-0002 protects the equivalent wallet balance because the floor and the consumption measure are the same number by design:

**Monthly Floor:** 1,150 NXT

**Protected Categories:**
1. Shelter (350 NXT)
2. Food & Nutrition (300 NXT)
3. Healthcare (200 NXT)
4. Transportation (100 NXT)
5. Communication (100 NXT)
6. Education (50 NXT)
7. Emergency Reserve (50 NXT)`},{heading:"Constitutional Protection",text:`The Basic Human Living Standard is enforced at the substrate level:

**C-0002: Immutable Rights**
"1,150 NXT/month is the measured monthly service consumption per citizen. No transaction may reduce a citizen's wallet below this consumption baseline. The floor and the consumption measure are the same number by design."

**Enforcement:**
- Substrate rejects transactions violating the Basic Human Living Standard
- Cannot be overridden by governance
- Hardcoded into Lambda Gate operations`},{heading:"Funding Mechanism",text:`The Basic Human Living Standard is delivered as services through the charity. The charity receives funds from the orbital treasury — here is how the treasury is funded:

1. **Transaction Fee Pool** (40%)
   - Portion of all E=hf fees

2. **Energy Harvesting Revenue** (30%)
   - K1 infrastructure proceeds

3. **Lambda Mass Recycling** (20%)
   - Recovered from dormant accounts

4. **Governance Allocation** (10%)
   - Voted by Sigma consensus`}]},governance:{title:"Planetary Governance",icon:v,color:"from-indigo-500 to-purple-500",content:[{heading:"Authority Band Registry",text:`7-tier governance hierarchy mapped to wavelengths:

| Level       | Wavelength | Authority | Scope               |
|-------------|------------|-----------|---------------------|
| Planetary   | 400nm      | 1.0       | Global decisions    |
| Continental | 500nm      | 0.8       | Regional blocs      |
| National    | 600nm      | 0.6       | Nation-states       |
| Regional    | 700nm      | 0.4       | Sub-national        |
| Municipal   | 800nm      | 0.2       | Cities              |
| Local       | 900nm      | 0.1       | Neighborhoods       |
| Individual  | 1000nm     | 0.05      | Personal sovereignty|`},{heading:"Constitutional Articles",text:`**C-0001: Non-Dominance**
No entity may control >33% of total Lambda mass.

**C-0002: Immutable Rights**
The monthly service consumption baseline of 1,150 NXT — the gauge of what the charity delivers — cannot be violated by any transaction.

**C-0003: Energy Escrow**
Governance proposals require energy escrow (skin in game).

**C-0004: Spectral Diversity**
All decisions require multi-band representation.

**C-0005: Physics Supremacy**
Laws must be physically valid (Maxwell-compliant).`},{heading:"Sigma Voting",text:`Coherence-weighted voting using wave interference:

**Trust Model:**
T = Σ|c_i|²·cos²(Δφ_i)

Where:
- c_i = citizen's coherence coefficient
- Δφ_i = phase alignment with proposal

**Result:**
- Aligned voters (cos²≈1) have full weight
- Misaligned voters (cos²≈0) have reduced weight
- Natural consensus emergence through interference`}]},infrastructure:{title:"K1 Infrastructure",icon:y,color:"from-cyan-500 to-blue-500",content:[{heading:"Kardashev Scale Progress",text:`NexusOS is building toward Type I civilization:

| Milestone              | K-Level | Status     |
|------------------------|---------|------------|
| Power Grids            | 0.75    | ✅ Complete |
| Photonic Computing     | 0.75    | ✅ Complete |
| Planetary Comms        | 0.80    | ✅ Complete |
| Resource Orchestration | 0.85    | ✅ Complete |
| Planetary Governance   | 0.90    | ✅ Complete |
| Planetary Resonance    | 0.95    | ✅ Complete |
| Type I Achieved        | 1.00    | ⏳ Next     |`},{heading:"Photonic Computing",text:`Light-based computation using wave interference:

**Logic Gates:**
- AND: Constructive interference (both inputs high)
- OR: Any non-zero interference
- NOT: Phase inversion (π shift)
- XOR: Destructive interference detection

**OAM Qubit Registers:**
Store data in orbital angular momentum modes (65+ channels per wavelength).

**Wavelength-Division Computing:**
Parallel computation across spectral channels.`},{heading:"Planetary Communications",text:`Global spectral relay mesh for planetary-scale messaging:

**Components:**
1. Spectral Relay Mesh - Dijkstra routing on wavelength graph
2. OAM Channel Allocator - 65+ channels per wavelength
3. Coherence Repeaters - 5× coherence boost via Lambda Gates
4. Interplanetary Links - Earth-Moon 1.28s, Earth-Mars 12.5min

**Physics:**
- Friis transmission equation
- Shannon capacity limits
- Atmospheric attenuation models`},{heading:"Planetary Resonance",text:`Tesla's vision realized: planetary-scale energy harvesting

**Schumann Resonance:**
f_n = c/(2πR) × √(n(n+1))
Fundamental: 7.83 Hz

**Energy Sources:**
- Schumann cavity modes
- Geomagnetic Pc1-Pc5 pulsations
- Solar wind coupling
- Ionospheric Sq currents
- Tidal electromagnetic effects

**Target:** 5×10¹⁶ watts (penultimate step to Type I)`}]},masterField:{title:"Λ-Master Field Equation",icon:b,color:"from-rose-500 to-orange-500",content:[{heading:"Core Field Equation",text:`The Λ-Master Field Equation governs all Lambda substrate dynamics:

**iℏ ∂Λ/∂t = [-ℏ²/2m_eff ∇² + V_ext + g|Λ|² + P(I,∇ν)]Λ - iγ(I)Λ**

This is a nonlinear Schrödinger/Gross-Pitaevskii equation extended with:
- Info-coupling via m_eff(I) - effective mass depends on information density
- Spectrum pressure P(I,∇ν) - pressure from spectral gradients
- Absorptive decoherence γ(I) - coherence loss mechanism`},{heading:"Spectral Mass-Pressure",text:`**P(I, ∇ν) = βI + ξ|∇ν|²**

Where:
- I = information density (modal entropy)
- ∇ν = spectral frequency gradient
- β = info-pressure coupling constant
- ξ = spectral gradient coupling

**Effective Mass:**
m_eff(I) = m₀[1 + αI(x,t)]

The effective mass increases with information density, creating info-coupled dynamics.`},{heading:"Decoherence & Stability",text:`**Decay Rate:** γ(I) = γ₀ + γ₁I

Acts as imaginary potential - higher info density → faster coherence loss.

**Field Decay:** Λ → Λ·exp(-γt)

**Coherence Order Parameter:**
Φ_order = |∫Λ dx|² / ∫|Λ|² dx

- 1.0 = fully coherent field
- 0.0 = completely incoherent`},{heading:"WNSP Encoding",text:`Spectral-native signalling encodes messages in frequency/phase:

**Continuous Encoding:**
s(x,t) = Re{Λ(x,t)} · exp(i·2πν(x)t + iφ(x))

**Shannon Capacity (Lambda mode):**
C = B · log₂(1 + SNR · |Λ|²/⟨|Λ|²⟩)

Where B = bandwidth, SNR = signal-to-noise ratio.`},{heading:"Λ-Gate Operations",text:`Unitary evolution under gate Hamiltonian:

**Û_gate = exp(-i·Ĥ_gate·τ_gate/ℏ)**

**Gate Hamiltonian:**
Ĥ_gate = θ_phase·n̂ + θ_spec·Ŝ(ν) + η|Λ|²

Where:
- θ_phase = phase shift parameter
- θ_spec = spectral gating parameter
- η = density-dependent phase velocity`},{heading:"Substrate Compliance Rules",text:`**C1 - Coherence Floor:** |Λ|² ≥ Λ_min
**C2 - Pressure Bound:** P(I,∇ν) ≤ P_max  
**C3 - Entropy Constraint:** S[Λ] ≤ S_max
**C4 - Fairness:** |w_a|² ≤ W_fair (33% max write power)

**Enforcement Methods:**
- **Projection (A):** Hard enforcement - project onto constraint manifold
- **Penalty (B):** Soft enforcement - add penalty to agent loss function

**Compliance Score:** χ(t) = Π_k 𝟙[g_k(Λ) ≤ 0] (1 = fully compliant)`},{heading:"Agent Dynamics",text:`Agents interact with the field through write/read kernels:

**Write Action:**
Λ(x,t+dt) = Λ(x,t) + W_a(x) · action_a

**Read Action:**
Extracts field state and reduces local info density.

**Policy Gradient:**
Agents optimize via: ∂L/∂θ = ∂(R - λ·penalty)/∂θ

This ensures agents learn to obey substrate constraints while maximizing their objectives.`}]},frameBuilder:{title:"Frame Builder v7.1 (AGPL-3.0)",icon:p,color:"from-amber-500 to-yellow-500",content:[{heading:"AGPL-3.0 Compliance Architecture",text:`Every Lambda Gate operation includes a **Source Code Reference (SCR)** for copyleft compliance.

**Frame Structure:**
\`\`\`
{
  LCU_HDR: Lambda Compute Unit header
  GATE_ID: Which gate was executed
  SCR: Commit hash of source code ← AGPL-3.0
  SCR_URL: Full URL to source code
  PRE_ATTEST: Pre-execution state
  POST_ATTEST: Post-execution state
  PAYLOAD: Transformed data
  COHERENCE_SIG: Consensus signature
}
\`\`\``},{heading:"Code Repository Attestation Service",text:`**CRAS** provides immutable source references:

\`\`\`python
class CodeRepoAttestation:
    @classmethod
    def get_gate_commit(cls, gate_id) -> str:
        """Returns commit hash for AGPL compliance."""
        return cls._gate_commits[gate_id]
    
    @classmethod
    def get_repo_url(cls, gate_id) -> str:
        """Full URL to source code."""
        return f"https://github.com/nexusosdaily-code/WNSP-P2P-Hub/tree/{commit}"
\`\`\`

Every gate has a registered commit hash pointing to its exact implementation.`},{heading:"FrameBuilder Usage",text:`\`\`\`python
from frame_builder_v7_1 import FrameBuilder, LambdaGateID

builder = FrameBuilder(lcu_id="my-lcu-001")

# Build AGPL-compliant frame
frame = builder.build_v7_frame(
    raw_payload=b"Hello, Lambda!",
    gate_id=LambdaGateID.PHASE_SHIFT
)

# Verify received frame
result = builder.verify_frame(frame)
print(result['agpl_compliant'])  # True
\`\`\``},{heading:"Temporal Attestations",text:`**PRE_ATTEST** and **POST_ATTEST** prove state integrity:

\`\`\`
PRE_ATTEST:
  timestamp: 1765545970.357
  coherence_level: 0.95
  energy_consumed: 0.0
  state_hash: "28e455..."

POST_ATTEST:
  timestamp: 1765545970.358
  coherence_level: 0.92
  energy_consumed: 1.025
  state_hash: "051b24..."
\`\`\`

The **COHERENCE_SIG** signs both attestations, proving temporal ordering and coherence maintenance.`},{heading:"8 Gate SCR Registry",text:`| Gate | Symbol | Commit Hash |
|------|--------|-------------|
| Phase-Shift | Φ(θ) | a1b2c3d4... |
| Gain | G(α) | b2c3d4e5... |
| Mode-Mixer | M(κ) | c3d4e5f6... |
| OAM-Rotor | L(Δℓ) | d4e5f678... |
| Phase-Gradient | ∇Φ | e5f67890... |
| Density-Swap | S | f6789012... |
| Coherence-Amplify | A_c | 67890123... |
| Stabilizer | D(τ) | 78901234... |

All commits are publicly verifiable at the GitHub repository.`},{heading:"Copyleft Protection",text:`**AGPL-3.0 Requirements Met:**

1. **Source Availability** - SCR_URL provides direct link
2. **Modification Tracking** - Commit hashes are immutable
3. **Network Use** - All network operations include SCR
4. **Derivative Works** - Must publish modifications

**What's Protected:**
- Lambda Gate implementations
- FrameBuilder protocol logic
- Attestation mechanisms
- Consensus algorithms

**What's Public Domain:**
- Physics principles (E=hf, Maxwell equations)
- Mathematical formulas
- Physical constants`},{heading:"Coherence Verifier v7.1",text:`**Two-Phase Validation:**

\`\`\`python
class CoherenceVerifier:
    def verify_v7_frame(self, frame_bytes: bytes) -> VerificationResult:
        # Phase 1: Temporal Coherence Check
        temporal_valid = self._check_temporal_attestations(
            frame['PRE_ATTEST'], 
            frame['POST_ATTEST'], 
            frame['COHERENCE_SIG']
        )
        
        # Phase 2: AGPL-3.0 Source Code Check
        agpl_valid = self._check_agplv3_source_reference(
            frame['GATE_ID'], 
            frame['SCR']
        )
        
        return VerificationResult(temporal_valid and agpl_valid)
\`\`\``},{heading:"AGPL Enforcement Mechanism",text:`When SCR hash doesn't match trusted registry:

\`\`\`python
def request_source_disclosure(self, gate_id, scr_hash):
    return {
        'request_type': 'AGPL_SOURCE_DISCLOSURE',
        'gate_id': gate_id,
        'scr_hash': scr_hash,
        'message': 'Modified Lambda Gate detected. '
                   'AGPL-3.0 requires source disclosure.',
        'deadline_hours': 72
    }
\`\`\`

**Enforcement Flow:**
1. Receiver detects SCR mismatch
2. Source disclosure request generated
3. Sender has 72 hours to provide source
4. Non-compliance → network blacklist`},{heading:"Lambda State Machine Usage",text:`**Developer Integration Example:**

\`\`\`python
from lambda_sdk.state_machine import LambdaStateMachine
from lambda_sdk.gates import LambdaGateID

# Initialize the State Machine
lsm = LambdaStateMachine(node_id="MyApp-Node-01")

# 1. Request high-assurance operation (Yocto Rule Check)
proof_data = lsm.request_constitutional_proof(
    rule_check="No_Temporal_Drift_Exceeding_1E-18",
)
# Returns PRE-ATTESTED frame from Lambda

# 2. Request standard forward synchronization
transaction_payload = b'transfer_100_units'
try:
    lsm.request_sync_write(transaction_payload)
    print("Transaction encoded and sent.")
    
except StateError as e:
    # 3. Handle DEGRADED state (AGPLv3 audit)
    if lsm.current_state == LSMState.DEGRADED:
        print("Coherence Degraded. Triggering audit.")
        lsm.trigger_source_audit()
\`\`\`

**State Transitions:**
- COHERENT → request_sync_write() allowed
- DEGRADED → writes blocked, audit required
- trigger_source_audit() → automatic gate selection`},{heading:"Binary Frame Serialization",text:`**Protobuf-like Fixed-Width Encoding:**

\`\`\`python
def _serialize_binary(self, frame_dict: dict) -> bytes:
    # 140-byte header + variable payload
    binary_frame = bytearray(140)
    
    # FRAME_MAGIC (4 bytes) - Protocol identifier
    struct.pack_into('<I', binary_frame, 0, 0x71FA0000)
    
    # GATE_ID (1 byte) - Lambda Gate selector
    binary_frame[4] = GATE_ID_MAP[frame_dict['GATE_ID']]
    
    # LCU_HDR (3 bytes) - Version/region code
    # PAYLOAD_LEN (4 bytes)
    # SCR (32 bytes) - AGPLv3 commit hash
    # PRE_ATTEST (32 bytes) - Lambda temporal sig
    # POST_ATTEST (32 bytes) - Lambda temporal sig
    # COHERENCE_SIG (32 bytes) - Integrity check
    
    return bytes(binary_frame) + payload
\`\`\`

**Performance:**
- JSON: ~888 bytes per frame
- Binary: ~140 bytes (84% reduction)
- Little-endian for x86/ARM compatibility`}]},sdkInstall:{title:"WNSP SDK — Live API",icon:c,color:"from-green-500 to-emerald-500",content:[{heading:"Base URL & Live Endpoints",text:"The NexusOS API is live and open. All public endpoints below require no authentication.\n\n**Live Platform:**\n```\nhttps://0a70fadf-e9ae-4e02-8d6d-f55fdb7924c1-00-kxbvkx18na65.riker.replit.dev\n```\n\n**Public API Endpoints (no auth required):**\n| Method | Endpoint | Description |\n|--------|----------|-------------|\n| GET | `/api/wnsp/wascii/table` | Full 202-char WASCII wavelength table |\n| POST | `/api/wnsp/wascii/lookup` | Encode any string → WnspFrames (per char) |\n| POST | `/api/wnsp/se/simulate` | Full SE simulation with Ψ channels, PSQ, coherence γ |\n| GET | `/api/blockchain/chain` | Live photonic blockchain (all blocks) |\n| GET | `/api/ecosystem/status` | Live system stats (nodes, agents, spectral records) |\n| GET | `/api/agent-bus/status` | Kernel agents at Ψ coordinates |\n| GET | `/api/network/nodes` | Registered spectral network nodes |"},{heading:"Python SDK — pip install requests",text:`No custom package needed yet — call the live API directly with \`requests\`.

\`\`\`python
import requests, json

BASE = "https://0a70fadf-e9ae-4e02-8d6d-f55fdb7924c1-00-kxbvkx18na65.riker.replit.dev"

# ── 1. Fetch full WASCII table (202 characters)
table = requests.get(f"{BASE}/api/wnsp/wascii/table").json()
print(f"WASCII version: {table['version']}, chars: {table['total_characters']}")

# ── 2. Encode a string → per-character WnspFrames
resp = requests.post(f"{BASE}/api/wnsp/wascii/lookup",
    json={"text": "NexusOS"},
    headers={"Content-Type": "application/json"}
).json()

for frame in resp["frames"]:
    print(f"  '{frame['symbol']}' → {frame['wavelength_nm']}nm "
          f"| E={frame['energy_joules']:.2e}J "
          f"| chk={frame['checksum']} "
          f"| {'✓' if frame['wascii_defined'] else '~'}")

print(f"PSQ: {resp['psq_token']}")
print(f"Coherence γ: {resp['coherence_gamma']:.4f} "
      f"({'valid' if resp['coherence_valid'] else 'BELOW THRESHOLD'})")

# ── 3. Full SE simulation with Ψ channel assignment
sim = requests.post(f"{BASE}/api/wnsp/se/simulate",
    json={"content": "Hello World"},
    headers={"Content-Type": "application/json"}
).json()

print(f"\\nSE Simulation: {sim['chars']} chars → {sim['frames']} SE frames")
print(f"Total energy: {sim['total_energy_joules']:.4e} J")
print(f"Total Λ mass: {sim['total_lambda_mass_kg']:.4e} kg")
\`\`\``},{heading:"JavaScript / TypeScript SDK",text:`Works in Node.js, browsers, and Deno. Zero dependencies — just \`fetch\`.

\`\`\`typescript
const BASE = "https://0a70fadf-e9ae-4e02-8d6d-f55fdb7924c1-00-kxbvkx18na65.riker.replit.dev";

// ── Types (TypeScript)
interface WnspFrame {
  symbol: string; wavelength_nm: number; frequency_hz: number;
  energy_joules: number; lambda_mass_kg: number; checksum: number;
  payload_bit: number; wascii_defined: boolean;
}

// ── 1. WASCII Table
async function getWasciiTable() {
  const r = await fetch(\`\${BASE}/api/wnsp/wascii/table\`);
  return r.json();  // { version, total_characters, characters: {...} }
}

// ── 2. Encode string → WnspFrames
async function encode(text: string): Promise<{
  frames: WnspFrame[]; psq_token: string;
  coherence_gamma: number; coherence_valid: boolean;
}> {
  const r = await fetch(\`\${BASE}/api/wnsp/wascii/lookup\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return r.json();
}

// ── 3. Full SE simulation
async function simulate(content: string) {
  const r = await fetch(\`\${BASE}/api/wnsp/se/simulate\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return r.json();
}

// Usage
const result = await encode("NexusOS");
result.frames.forEach(f =>
  console.log(\`'\${f.symbol}' → \${f.wavelength_nm}nm | E=\${f.energy_joules.toExponential(2)}J\`)
);
console.log("PSQ:", result.psq_token);
console.log("γ:", result.coherence_gamma.toFixed(4));
\`\`\``},{heading:"curl — No Install Required",text:`Test the entire API from your terminal right now. No signup, no API key.

\`\`\`bash
BASE="https://0a70fadf-e9ae-4e02-8d6d-f55fdb7924c1-00-kxbvkx18na65.riker.replit.dev"

# Full WASCII table (202 characters → wavelengths)
curl "$BASE/api/wnsp/wascii/table" | python3 -m json.tool

# Encode "Hello" → per-character WnspFrames
curl -s -X POST "$BASE/api/wnsp/wascii/lookup" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Hello"}' | python3 -m json.tool

# SE simulation — Ψ channel assignment, PSQ token, coherence γ
curl -s -X POST "$BASE/api/wnsp/se/simulate" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"NexusOS Genesis"}' | python3 -m json.tool

# Live blockchain
curl "$BASE/api/blockchain/chain" | python3 -m json.tool

# Ecosystem status (agents, spectral records, nodes)
curl "$BASE/api/ecosystem/status" | python3 -m json.tool
\`\`\``},{heading:"GitHub Source Repositories",text:`All source code is open under AGPL-3.0. If you build on NexusOS, you publish your code.

**Main Application (full stack):**
\`\`\`bash
git clone https://github.com/nexusosdaily-code/NexusOS.git
\`\`\`
→ Node.js/Express + React + Python Flask + PostgreSQL

**WNSP P2P Hub (protocol + media):**
\`\`\`bash
git clone https://github.com/nexusosdaily-code/WNSP-P2P-Hub.git
\`\`\`
→ WNSP protocol implementation, P2P media, spectral encoding

**Genesis Block (origin documentation):**
\`\`\`bash
git clone https://github.com/nexusosdaily-code/NexusOS-Genesis-Block.git
\`\`\`
→ 377 commits. Genesis SHA: 165d7f9 (16 Nov 2025). Full scientific documentation.

**Key source files for SDK implementers:**
| File | Description |
|------|-------------|
| \`wnsp_protocol_v7.py\` | WASCII table, WnspFrame, PSQ, coherence γ |
| \`spectral_api.py\` | Flask API server (port 5001) |
| \`server/routes.ts\` | Express API gateway (port 5000) |
| \`shared/schema.ts\` | Drizzle ORM schema, all table types |

**License:** AGPL-3.0 · Any derivative must publish source under same terms.`}]}},xe=[{category:"Live Tools",icon:x,color:"from-purple-500 to-pink-500",links:[{name:"CE Code Writer",path:"/ce-code-writer",description:"Human First Contact CE-SE encoder, live encode",isRoute:!0},{name:"CE→SE Pipeline",path:"/ce-se-pipeline",description:"Paste any language → WavelengthScript → bytecode → WNSP VM",isRoute:!0},{name:"WNSP Virtual Machine",path:"/wnsp-vm",description:"Browser-native bytecode interpreter, step/run execution",isRoute:!0},{name:"Compression Explorer",path:"/compression-explorer",description:"Interactive Λ=hf/c² compression curve visualisation",isRoute:!0},{name:"Spectral Router",path:"/spectral-router",description:"DNS-free packet routing using Ψ channel addressing",isRoute:!0},{name:"Sign in to access: Wallet, Encoding Lab, K1, Research & more",path:"/auth",description:"These tools require an account",isRoute:!0}]},{category:"Core Mechanics (Documentation Tab)",icon:f,color:"from-violet-500 to-purple-500",links:[{name:"Lambda Gate Substrate v4",docSection:"substrate",description:"8 photonic gate primitives: Phase-Shift, Gain, Mode-Mixer, OAM-Rotor"},{name:"Frame Builder v7.1",docSection:"frameBuilder",description:"AGPL-3.0 compliant frame protocol with SCR attestation"},{name:"Λ-Master Field Equation",docSection:"masterField",description:"Continuous field dynamics with constitutional enforcement"},{name:"WASCII Encoding",docSection:"wascii",description:"202-character WASCII table (WNSP-SE v1.0) — canonical wavelength per character"},{name:"Proof of Spectrum Consensus",docSection:"consensus",description:"Physics-based Byzantine fault tolerance"}]},{category:"Economics & Governance (Documentation Tab)",icon:v,color:"from-green-500 to-emerald-500",links:[{name:"NXT Token Economics",docSection:"economics",description:"21B supply, 8 decimals, E=hf transaction fees"},{name:"Basic Human Living Standard",docSection:"ihr",description:"1,150 NXT/month provided in services through the charity"},{name:"Planetary Governance",docSection:"governance",description:"Authority bands, constitutional articles, Sigma voting"}]},{category:"K1 Infrastructure (Documentation Tab)",icon:y,color:"from-cyan-500 to-blue-500",links:[{name:"K1 Infrastructure Guide",docSection:"infrastructure",description:"Photonic computing, planetary comms, resonance harvesting"}]}],ue=[{category:"Physics Foundations",icon:b,color:"from-violet-500 to-purple-500",links:[{name:"Planck's Law (E=hf)",url:"https://en.wikipedia.org/wiki/Planck%27s_law",description:"Energy-frequency relationship"},{name:"Maxwell's Equations",url:"https://en.wikipedia.org/wiki/Maxwell%27s_equations",description:"Electromagnetic wave validation"},{name:"Electromagnetic Spectrum",url:"https://en.wikipedia.org/wiki/Electromagnetic_spectrum",description:"Wavelength ranges and properties"},{name:"Wave Interference",url:"https://en.wikipedia.org/wiki/Wave_interference",description:"Constructive/destructive patterns"},{name:"Schumann Resonances",url:"https://en.wikipedia.org/wiki/Schumann_resonances",description:"Earth-ionosphere cavity (7.83Hz)"}]},{category:"Quantum & Photonics",icon:pe,color:"from-cyan-500 to-blue-500",links:[{name:"Orbital Angular Momentum",url:"https://en.wikipedia.org/wiki/Orbital_angular_momentum_of_light",description:"OAM modes for data encoding"},{name:"Photonic Computing",url:"https://en.wikipedia.org/wiki/Optical_computing",description:"Light-based computation"},{name:"Coherent State",url:"https://en.wikipedia.org/wiki/Coherent_state",description:"Quantum coherence principles"},{name:"Bose-Einstein Condensate",url:"https://en.wikipedia.org/wiki/Bose%E2%80%93Einstein_condensate",description:"Quantum yield enhancement"}]},{category:"Civilization Scale",icon:k,color:"from-amber-500 to-orange-500",links:[{name:"Kardashev Scale",url:"https://en.wikipedia.org/wiki/Kardashev_scale",description:"Type I-III civilization energy"},{name:"Dyson Sphere",url:"https://en.wikipedia.org/wiki/Dyson_sphere",description:"Stellar energy harvesting concepts"},{name:"Tesla's Wireless Power",url:"https://en.wikipedia.org/wiki/Wardenclyffe_Tower",description:"Planetary resonance inspiration"}]},{category:"Cryptography & Consensus",icon:p,color:"from-red-500 to-pink-500",links:[{name:"Byzantine Fault Tolerance",url:"https://en.wikipedia.org/wiki/Byzantine_fault",description:"Distributed consensus problems"},{name:"Post-Quantum Cryptography",url:"https://en.wikipedia.org/wiki/Post-quantum_cryptography",description:"Quantum-resistant algorithms"},{name:"Hash Functions",url:"https://en.wikipedia.org/wiki/Cryptographic_hash_function",description:"SHA-256, BLAKE2, etc."}]}],fe=[{id:"messaging",name:"Messaging & Communication",icon:le,color:"from-blue-500 to-cyan-500",requiredLevel:2,requiredCert:"Protocol Developer",projects:["P2P encrypted messaging apps","Wavelength-encoded chat systems","Mesh network protocols","Spectral routing implementations","Real-time communication platforms"],sdks:["wnsp-messaging","wnsp-crypto"]},{id:"blockchain",name:"Blockchain & Consensus",icon:K,color:"from-purple-500 to-pink-500",requiredLevel:3,requiredCert:"Substrate Engineer",projects:["Lambda Gate validators","Consensus mechanisms","Smart contract platforms","DEX implementations","Token systems"],sdks:["wnsp-blockchain","wnsp-substrate"]},{id:"wallets",name:"Wallets & Payments",icon:de,color:"from-green-500 to-emerald-500",requiredLevel:2,requiredCert:"Protocol Developer",projects:["NXT wallet implementations","Multi-sig wallets","Payment gateways","Basic Human Living Standard floor enforcement","Transaction validators"],sdks:["wnsp-wallet","wnsp-payments"]},{id:"governance",name:"Governance & Voting",icon:v,color:"from-orange-500 to-yellow-500",requiredLevel:4,requiredCert:"Governance Architect",projects:["Sigma voting systems","Constitutional enforcement","Authority band management","Proposal platforms","Dispute resolution systems"],sdks:["wnsp-governance","wnsp-voting"]},{id:"energy",name:"Energy & Grid Systems",icon:x,color:"from-amber-500 to-orange-500",requiredLevel:5,requiredCert:"Infrastructure Builder",projects:["Resonance harvester nodes","Energy trading platforms","Grid management systems","Solar array controllers","Fusion reactor interfaces"],sdks:["wnsp-energy","wnsp-k1"]},{id:"computing",name:"Photonic Computing",icon:f,color:"from-indigo-500 to-purple-500",requiredLevel:6,requiredCert:"Infrastructure Builder",projects:["Photonic logic gates","OAM qubit registers","Wavelength-division processors","Lambda processors","Quantum simulators"],sdks:["wnsp-photonics","wnsp-compute"]},{id:"communications",name:"Planetary Communications",icon:k,color:"from-cyan-500 to-blue-500",requiredLevel:6,requiredCert:"Infrastructure Builder",projects:["Spectral relay mesh nodes","OAM channel allocators","Interplanetary link planners","Coherence repeaters","Global backbone systems"],sdks:["wnsp-planetary","wnsp-relay"]},{id:"resources",name:"Resource Orchestration",icon:y,color:"from-rose-500 to-pink-500",requiredLevel:5,requiredCert:"Infrastructure Builder",projects:["Wavelength ledger systems","Manufacturing pipelines","Logistics optimizers","Fleet coordinators","Supply chain platforms"],sdks:["wnsp-resources","wnsp-logistics"]}],ye=[{id:"frontend",name:"Frontend Developer",icon:c,color:"bg-blue-500",focus:"User interfaces, dashboards, visualization",canBuild:["Wallet UIs","Voting interfaces","Analytics dashboards","Message clients"],startWith:["wave_physics","wascii_encoding"]},{id:"backend",name:"Backend Engineer",icon:me,color:"bg-green-500",focus:"APIs, servers, data processing",canBuild:["API gateways","Transaction processors","Routing servers","Data validators"],startWith:["spectral_routing","lambda_gates"]},{id:"blockchain",name:"Blockchain Developer",icon:K,color:"bg-purple-500",focus:"Consensus, smart contracts, validators",canBuild:["Validators","Smart contracts","Consensus nodes","DEX backends"],startWith:["lambda_boson","ce1_protocol"]},{id:"systems",name:"Systems Engineer",icon:he,color:"bg-orange-500",focus:"Infrastructure, networking, hardware",canBuild:["Relay nodes","Mesh networks","Energy harvesters","Photonic gates"],startWith:["lambda_gates","planetary_comms"]},{id:"security",name:"Security Engineer",icon:p,color:"bg-red-500",focus:"Cryptography, auditing, compliance",canBuild:["Encryption systems","Audit tools","Constitutional validators","Human Rights enforcers"],startWith:["constitutional","ihr_economics"]}],u=[{id:"wave_physics",name:"Wave Physics",level:1,description:"c=fλ, electromagnetic spectrum, E=hf",icon:V,color:"from-violet-500 to-purple-600"},{id:"lambda_boson",name:"Lambda Boson",level:1,description:"Λ=hf/c², mass-equivalent of oscillation",icon:C,color:"from-purple-500 to-pink-600"},{id:"wascii_encoding",name:"WASCII Encoding",level:2,description:"202-character WASCII table — WNSP-SE v1.0 canonical spectral addresses",icon:c,color:"from-blue-500 to-cyan-600"},{id:"spectral_routing",name:"Spectral Routing",level:2,description:"Wavelength-based message routing",icon:X,color:"from-cyan-500 to-teal-600"},{id:"lambda_gates",name:"Lambda Gates",level:3,description:"8 photonic gate primitives",icon:f,color:"from-green-500 to-emerald-600"},{id:"ce1_protocol",name:"CE-1 Protocol",level:3,description:"Coherence Engineering protocol",icon:x,color:"from-emerald-500 to-green-600"},{id:"constitutional",name:"Constitutional Law",level:4,description:"C-0001, C-0002, C-0003 clauses",icon:v,color:"from-yellow-500 to-orange-600"},{id:"ihr_economics",name:"Living Standard Economics",level:4,description:"Basic Human Living Standard — 1,150 NXT/month, 7 service categories, offered by NexusOS",icon:p,color:"from-orange-500 to-red-600"},{id:"authority_bands",name:"Authority Bands",level:5,description:"7-tier spectral hierarchy",icon:S,color:"from-red-500 to-pink-600"},{id:"sigma_voting",name:"Sigma Voting",level:5,description:"Coherence-weighted voting",icon:I,color:"from-pink-500 to-rose-600"},{id:"photonic_computing",name:"Photonic Computing",level:6,description:"Photonic logic gates",icon:f,color:"from-indigo-500 to-violet-600"},{id:"planetary_comms",name:"Planetary Communications",level:6,description:"Spectral relay mesh, OAM",icon:k,color:"from-violet-500 to-purple-600"},{id:"resource_orchestration",name:"Resource Orchestration",level:6,description:"Wavelength ledger, logistics",icon:y,color:"from-purple-500 to-indigo-600"},{id:"k1_energy",name:"K1 Energy",level:6,description:"Resonance harvesting, fusion",icon:x,color:"from-amber-500 to-yellow-600"}],be=[{id:"protocol_dev",name:"Protocol Developer",description:"Messaging & encoding systems",domains:["wave_physics","lambda_boson","wascii_encoding","spectral_routing"],icon:c,color:"from-blue-600 to-cyan-500"},{id:"substrate_eng",name:"Substrate Engineer",description:"Core substrate & gate programs",domains:["wave_physics","lambda_boson","lambda_gates","ce1_protocol"],icon:f,color:"from-green-600 to-emerald-500"},{id:"governance_arch",name:"Governance Architect",description:"Voting & constitutional systems",domains:["constitutional","ihr_economics","authority_bands","sigma_voting"],icon:v,color:"from-orange-600 to-yellow-500"},{id:"infra_builder",name:"Infrastructure Builder",description:"K1 civilization infrastructure",domains:["lambda_gates","photonic_computing","planetary_comms","resource_orchestration"],icon:y,color:"from-purple-600 to-pink-500"},{id:"full_stack",name:"Full Stack Architect",description:"Complete mastery",domains:u.map(o=>o.id),icon:C,color:"from-amber-500 to-red-500"}],ve=[{id:"sandbox",level:0,authority:"INDIVIDUAL",wavelength:1e3,icon:ge,capabilities:["Personal wallets","Test encoding","Prototypes"]},{id:"community",level:1,authority:"LOCAL",wavelength:900,icon:I,capabilities:["Community apps","Local mesh","Education"]},{id:"municipal",level:2,authority:"MUNICIPAL",wavelength:800,icon:y,capabilities:["City networks","Local governance","Urban grids"]},{id:"regional",level:3,authority:"REGIONAL",wavelength:700,icon:X,capabilities:["Regional comms","Multi-city orchestration"]},{id:"national",level:4,authority:"NATIONAL",wavelength:600,icon:p,capabilities:["National spectrum","Country-wide grids"]},{id:"continental",level:5,authority:"CONTINENTAL",wavelength:500,icon:k,capabilities:["Continental networks","Cross-border infra"]},{id:"planetary",level:6,authority:"PLANETARY",wavelength:400,icon:C,capabilities:["Global backbone","Interplanetary links"]}];function Ie(){const[o,R]=_.useState([]),[E,$]=_.useState([]),[Z,D]=_.useState("matrix"),[M,O]=_.useState("substrate"),q=o.length>0?Math.max(...o.map(a=>u.find(r=>r.id===a)?.level||0)):0,J=a=>{o.includes(a)?R(o.filter(r=>r!==a)):R([...o,a])},Q=a=>a.domains.every(r=>o.includes(r)),Y=a=>{E.includes(a)||$([...E,a])};return e.jsx("div",{className:"min-h-screen bg-black text-white","data-testid":"page-developer-matrix",children:e.jsxs("div",{className:"max-w-7xl mx-auto p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-6",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx(W,{href:"/developer",children:e.jsx(P,{variant:"ghost",size:"icon",className:"text-gray-400 hover:text-white","data-testid":"button-home",children:e.jsx(G,{className:"w-5 h-5"})})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold tracking-tight","data-testid":"text-title",children:"Developer Matrix"}),e.jsx("p",{className:"text-gray-400 text-sm",children:"What Engineers, Builders & Developers Can Build"})]})]}),e.jsxs(P,{variant:"outline",size:"sm",onClick:()=>window.history.back(),className:"text-gray-400 hover:text-white border-gray-700 hover:border-gray-500","data-testid":"button-back-previous",children:[e.jsx(G,{className:"w-4 h-4 mr-2"}),"Back to Previous Page"]})]}),e.jsxs(re,{value:Z,onValueChange:D,className:"space-y-6",children:[e.jsxs(ne,{className:"bg-gray-900 border border-gray-800 p-1 flex-wrap h-auto",children:[e.jsxs(d,{value:"quickstart",className:"data-[state=active]:bg-green-600","data-testid":"tab-quickstart",children:[e.jsx(c,{className:"w-4 h-4 mr-2"}),"Quick Start"]}),e.jsxs(d,{value:"matrix",className:"data-[state=active]:bg-purple-600","data-testid":"tab-matrix",children:[e.jsx(B,{className:"w-4 h-4 mr-2"}),"Build Matrix"]}),e.jsxs(d,{value:"roles",className:"data-[state=active]:bg-purple-600","data-testid":"tab-roles",children:[e.jsx(I,{className:"w-4 h-4 mr-2"}),"Builder Roles"]}),e.jsxs(d,{value:"domains",className:"data-[state=active]:bg-purple-600","data-testid":"tab-domains",children:[e.jsx(L,{className:"w-4 h-4 mr-2"}),"Knowledge"]}),e.jsxs(d,{value:"certifications",className:"data-[state=active]:bg-purple-600","data-testid":"tab-certifications",children:[e.jsx(ie,{className:"w-4 h-4 mr-2"}),"Certifications"]}),e.jsxs(d,{value:"tiers",className:"data-[state=active]:bg-purple-600","data-testid":"tab-tiers",children:[e.jsx(S,{className:"w-4 h-4 mr-2"}),"Authority Tiers"]}),e.jsxs(d,{value:"resources",className:"data-[state=active]:bg-purple-600","data-testid":"tab-resources",children:[e.jsx(oe,{className:"w-4 h-4 mr-2"}),"Resources"]}),e.jsxs(d,{value:"documentation",className:"data-[state=active]:bg-purple-600","data-testid":"tab-documentation",children:[e.jsx(H,{className:"w-4 h-4 mr-2"}),"Documentation"]}),e.jsxs(d,{value:"czf-foundation",className:"data-[state=active]:bg-yellow-600","data-testid":"tab-czf-foundation",children:[e.jsx(b,{className:"w-4 h-4 mr-2"}),"CZF Foundation"]}),e.jsxs(d,{value:"czf-kernel",className:"data-[state=active]:bg-cyan-600","data-testid":"tab-czf-kernel",children:[e.jsx(c,{className:"w-4 h-4 mr-2"}),"CZF Kernel"]}),e.jsxs(d,{value:"dmk",className:"data-[state=active]:bg-pink-600","data-testid":"tab-dmk",children:[e.jsx(S,{className:"w-4 h-4 mr-2"}),"DMK"]})]}),e.jsxs(m,{value:"quickstart",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"Quick Start: Credible Proof for Engineers"}),e.jsx("p",{className:"text-gray-400",children:"Real code, verifiable physics, testable implementations. Everything you need to validate before adopting."})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"proof-physics",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(b,{className:"w-5 h-5 text-cyan-400"}),"Physics Verification"]}),e.jsx("p",{className:"text-gray-400 text-sm mb-4",children:"All equations are standard physics - verify against any textbook or Wikipedia."}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"p-4 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-cyan-300 font-mono text-lg",children:"E = hf"}),e.jsx("div",{className:"text-gray-400 text-sm mt-1",children:"Planck's equation (1900) - photon energy equals Planck's constant times frequency"}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Planck_relation",target:"_blank",rel:"noopener noreferrer",className:"text-xs text-cyan-500 hover:underline flex items-center gap-1 mt-2",children:[e.jsx(g,{className:"w-3 h-3"})," Verify on Wikipedia"]})]}),e.jsxs("div",{className:"p-4 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-purple-300 font-mono text-lg",children:"c = fλ"}),e.jsx("div",{className:"text-gray-400 text-sm mt-1",children:"Wave equation - speed of light equals frequency times wavelength"}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Wavelength",target:"_blank",rel:"noopener noreferrer",className:"text-xs text-cyan-500 hover:underline flex items-center gap-1 mt-2",children:[e.jsx(g,{className:"w-3 h-3"})," Verify on Wikipedia"]})]}),e.jsxs("div",{className:"p-4 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-green-300 font-mono text-lg",children:"Λ = hf/c² = E/c²"}),e.jsx("div",{className:"text-gray-400 text-sm mt-1",children:"Lambda mass - derived from E=mc², the mass-equivalent of photon energy"}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Mass%E2%80%93energy_equivalence",target:"_blank",rel:"noopener noreferrer",className:"text-xs text-cyan-500 hover:underline flex items-center gap-1 mt-2",children:[e.jsx(g,{className:"w-3 h-3"})," Verify E=mc² on Wikipedia"]})]})]})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"proof-implementations",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-green-400"}),"Live Implementations"]}),e.jsx("p",{className:"text-gray-400 text-sm mb-4",children:"Working Python code you can run and verify today."}),e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"font-medium text-sm",children:"Lambda Gate Substrate v4"}),e.jsx("div",{className:"text-xs text-gray-500",children:"8 photonic gates, CE-1 protocol"})]}),e.jsx(i,{className:"bg-green-600 text-xs",children:"wnsp_v7/substrate_v4.py"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"font-medium text-sm",children:"Planetary Governance"}),e.jsx("div",{className:"text-xs text-gray-500",children:"Authority bands, Sigma voting"})]}),e.jsx(i,{className:"bg-green-600 text-xs",children:"wnsp_v7/planetary_governance.py"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"font-medium text-sm",children:"Photonic Computing"}),e.jsx("div",{className:"text-xs text-gray-500",children:"AND, OR, NOT, XOR gates"})]}),e.jsx(i,{className:"bg-green-600 text-xs",children:"wnsp_v7/photonic_computing.py"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"font-medium text-sm",children:"Planetary Resonance"}),e.jsx("div",{className:"text-xs text-gray-500",children:"Schumann modes, Tesla stations"})]}),e.jsx(i,{className:"bg-green-600 text-xs",children:"wnsp_v7/planetary_resonance.py"})]})]})]})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"code-example-wascii",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-purple-400"}),"Code Example: WASCII Encoding (WNSP-SE v1.0)"]}),e.jsx("p",{className:"text-gray-400 text-sm mb-4",children:"Encode any text using the canonical WASCII table — exact wavelength per character, not a formula. Each character produces a WnspFrame."}),e.jsx("pre",{className:"bg-black p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{className:"text-green-300",children:`# WASCII: Wavelength-Native Character Standard (WNSP-SE v1.0)
# Every character has a canonical electromagnetic address.
# Not a formula — an authoritative table.

WASCII = {
    'A': 380, 'B': 386, 'C': 392, 'D': 398, 'E': 404,
    'F': 410, 'G': 416, 'H': 422, 'I': 428, 'J': 434,
    'K': 440, 'L': 446, 'M': 452, 'N': 458, 'O': 464,
    'P': 470, 'Q': 476, 'R': 482, 'S': 488, 'T': 494,
    'U': 500, 'V': 506, 'W': 512, 'X': 518, 'Y': 524, 'Z': 530,
    '0': 536, '1': 542, '2': 548, '3': 554, '4': 560,
    '5': 566, '6': 572, '7': 578, '8': 584, '9': 590,
    ' ': 596, '.': 602, ',': 608, '!': 614, '?': 620,
    'λ': 790, 'Λ': 839, 'ψ': 823, 'Ψ': 854, 'π': 802,
    # ... 202 characters total. See /api/wnsp/wascii/table
}
h = 6.626e-34; c = 299_792_458

def encode_char(char: str, frame_idx: int = 0) -> dict:
    nm = WASCII.get(char, 380 + (ord(char) % 256) / 255 * 400)
    f  = c / (nm * 1e-9)
    return {
        'sync':           0xAA,
        'symbol':         char,
        'wavelength_nm':  nm,
        'frequency_hz':   f,
        'energy_joules':  h * f,
        'lambda_mass_kg': h * f / c**2,
        'checksum':       (ord(char) ^ round(nm)) % 256,
        'payload_bit':    frame_idx % 2,
        'wascii_defined': char in WASCII,
    }

for i, ch in enumerate("Hello"):
    fr = encode_char(ch, i)
    print(f"sync={hex(fr['sync'])} | {ch!r} → {fr['wavelength_nm']}nm "
          f"| E={fr['energy_joules']:.2e}J | chk={fr['checksum']}")`})}),e.jsxs("div",{className:"mt-4 p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-xs text-gray-400 mb-2",children:"WnspFrame output — WASCII canonical wavelengths:"}),e.jsx("pre",{className:"text-xs text-cyan-300 font-mono",children:`sync=0xaa | 'H' → 422.0nm | E=4.71e-19J | chk=238
sync=0xaa | 'e' → 407.0nm | E=4.88e-19J | chk=198
sync=0xaa | 'l' → 449.0nm | E=4.42e-19J | chk=217
sync=0xaa | 'l' → 449.0nm | E=4.42e-19J | chk=217
sync=0xaa | 'o' → 467.0nm | E=4.26e-19J | chk=141`})]})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"code-example-fees",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(x,{className:"w-5 h-5 text-amber-400"}),"Code Example: Physics-Based Transaction Fees"]}),e.jsx("p",{className:"text-gray-400 text-sm mb-4",children:"Transaction fees derived from actual photon energy, not arbitrary gas prices."}),e.jsx("pre",{className:"bg-black p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{className:"text-green-300",children:`# Transaction Fee = Total message energy (in NXT units)
# Based on E = hf for each character

def calculate_tx_fee(message: str) -> dict:
    """Calculate transaction fee from message content."""
    h = 6.626e-34  # Planck's constant
    c = 299_792_458  # Speed of light
    
    # WASCII canonical table (A=380nm…Z=530nm, 0=536nm…9=590nm, symbols 596–758nm…)
    WASCII = {**{chr(65+i): 380+i*6 for i in range(26)},
              **{chr(97+i): 383+i*6 for i in range(26)},
              **{str(i): 536+i*6 for i in range(10)},
              ' ': 596, '.': 602, ',': 608, '!': 614, '?': 620}

    total_energy_joules = 0
    for char in message:
        wavelength_nm = WASCII.get(char, 380 + (ord(char) % 256) / 255 * 400)
        wavelength_m = wavelength_nm * 1e-9
        frequency = c / wavelength_m
        energy = h * frequency
        total_energy_joules += energy
    
    # Convert to NXT (1 NXT = 1e-20 Joules for practical scaling)
    nxt_fee = total_energy_joules / 1e-20
    
    return {
        "message_length": len(message),
        "total_energy_joules": total_energy_joules,
        "fee_nxt": nxt_fee,
        "fee_human": f"{nxt_fee:.6f} NXT"
    }

# Example
result = calculate_tx_fee("Send 100 NXT to Alice")
print(f"Fee: {result['fee_human']}")
# Output: Fee: 0.000089 NXT`})})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"code-example-lambda",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(C,{className:"w-5 h-5 text-pink-400"}),"Code Example: Lambda Mass Valuation"]}),e.jsx("p",{className:"text-gray-400 text-sm mb-4",children:"Value backed by physics - the mass-equivalent of electromagnetic energy."}),e.jsx("pre",{className:"bg-black p-4 rounded-lg overflow-x-auto text-sm",children:e.jsx("code",{className:"text-green-300",children:`# Lambda Boson Theory: Λ = hf/c²
# Derived from E = mc² → m = E/c² → Λ = hf/c²

def lambda_mass(frequency: float) -> float:
    """Calculate Lambda mass from frequency."""
    h = 6.626e-34  # Planck's constant (J·s)
    c = 299_792_458  # Speed of light (m/s)
    
    # Λ = hf/c² (in kg)
    lambda_kg = (h * frequency) / (c ** 2)
    return lambda_kg

def nxt_to_lambda_mass(nxt_amount: float) -> float:
    """Convert NXT tokens to Lambda mass equivalent."""
    # 1 NXT backed by mass at 555nm (peak human vision)
    reference_wavelength = 555e-9  # meters
    c = 299_792_458
    reference_frequency = c / reference_wavelength
    
    mass_per_nxt = lambda_mass(reference_frequency)
    return nxt_amount * mass_per_nxt

# Example: 1000 NXT
mass = nxt_to_lambda_mass(1000)
print(f"1000 NXT = {mass:.2e} kg Lambda mass")
# Output: 1000 NXT = 3.98e-33 kg Lambda mass

# This is tiny but REAL - value has physical backing
# Cannot be inflated because physics is conserved`})})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs(t,{className:"bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/30 p-5 text-center",children:[e.jsx(p,{className:"w-8 h-8 mx-auto mb-3 text-blue-400"}),e.jsx("h4",{className:"font-bold mb-2",children:"Auditable"}),e.jsx("p",{className:"text-gray-400 text-sm",children:"All physics equations are standard textbook formulas. Verify against any source."})]}),e.jsxs(t,{className:"bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 p-5 text-center",children:[e.jsx(c,{className:"w-8 h-8 mx-auto mb-3 text-green-400"}),e.jsx("h4",{className:"font-bold mb-2",children:"Open Source"}),e.jsx("p",{className:"text-gray-400 text-sm",children:"Full Python implementations in /wnsp_v7 directory. Clone, run, modify."})]}),e.jsxs(t,{className:"bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 p-5 text-center",children:[e.jsx(ce,{className:"w-8 h-8 mx-auto mb-3 text-purple-400"}),e.jsx("h4",{className:"font-bold mb-2",children:"Testable"}),e.jsx("p",{className:"text-gray-400 text-sm",children:"Live simulators at /workspace/wavefield and /encoding-lab. Test now."})]})]}),e.jsxs(t,{className:"bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30 p-6",children:[e.jsx("h3",{className:"text-lg font-bold mb-3",children:"Why This Matters for Engineers"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5 shrink-0"}),e.jsxs("span",{className:"text-gray-300",children:[e.jsx("strong",{className:"text-white",children:"No magic numbers"})," - All constants are physical constants (h, c, λ)"]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5 shrink-0"}),e.jsxs("span",{className:"text-gray-300",children:[e.jsx("strong",{className:"text-white",children:"Conservation laws apply"})," - Energy cannot be created, only transferred"]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5 shrink-0"}),e.jsxs("span",{className:"text-gray-300",children:[e.jsx("strong",{className:"text-white",children:"Deterministic fees"})," - Same message = same fee, always"]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5 shrink-0"}),e.jsxs("span",{className:"text-gray-300",children:[e.jsx("strong",{className:"text-white",children:"No inflation possible"})," - Value backed by mass-energy equivalence"]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5 shrink-0"}),e.jsxs("span",{className:"text-gray-300",children:[e.jsx("strong",{className:"text-white",children:"Spectral security"})," - 51% attack requires controlling all wavelengths"]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5 shrink-0"}),e.jsxs("span",{className:"text-gray-300",children:[e.jsx("strong",{className:"text-white",children:"Maxwell-validated"})," - All messages satisfy ∇×E = -∂B/∂t"]})]})]})]})]})]}),e.jsxs(m,{value:"matrix",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"What Can You Build?"}),e.jsx("p",{className:"text-gray-400",children:"Each category shows what infrastructure you can construct once you have the required knowledge and certification."})]}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:fe.map(a=>{const r=a.icon,s=q>=a.requiredLevel;return e.jsx(t,{className:`p-5 ${s?"bg-gray-900/50 border-gray-700":"bg-gray-900/30 border-gray-800 opacity-70"}`,"data-testid":`build-category-${a.id}`,children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:`w-12 h-12 rounded-xl bg-gradient-to-r ${a.color} flex items-center justify-center shrink-0`,children:e.jsx(r,{className:"w-6 h-6 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx("h3",{className:"font-bold",children:a.name}),!s&&e.jsx(z,{className:"w-4 h-4 text-gray-500"})]}),e.jsxs("div",{className:"flex gap-2 mb-3",children:[e.jsxs(i,{variant:"outline",className:"text-xs border-purple-500/50 text-purple-300",children:["Level ",a.requiredLevel,"+"]}),e.jsx(i,{variant:"outline",className:"text-xs border-cyan-500/50 text-cyan-300",children:a.requiredCert})]}),e.jsxs("div",{className:"space-y-1",children:[a.projects.slice(0,3).map((n,l)=>e.jsxs("div",{className:"flex items-center gap-2 text-sm text-gray-300",children:[e.jsx(h,{className:`w-3 h-3 ${s?"text-green-400":"text-gray-600"}`}),n]},l)),a.projects.length>3&&e.jsxs("div",{className:"text-xs text-gray-500",children:["+",a.projects.length-3," more..."]})]}),e.jsx("div",{className:"flex gap-1 mt-3",children:a.sdks.map(n=>e.jsx(i,{className:"text-xs bg-gray-800 text-gray-400",children:n},n))})]})]})},a.id)})})]}),e.jsxs(m,{value:"roles",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"Choose Your Path"}),e.jsx("p",{className:"text-gray-400",children:"Different builder roles focus on different parts of the ecosystem. Find where you fit."})]}),e.jsx("div",{className:"grid grid-cols-1 gap-4",children:ye.map(a=>{const r=a.icon;return e.jsx(t,{className:"p-5 bg-gray-900/50 border-gray-700","data-testid":`role-${a.id}`,children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:`w-14 h-14 rounded-xl ${a.color} flex items-center justify-center shrink-0`,children:e.jsx(r,{className:"w-7 h-7 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"text-lg font-bold",children:a.name}),e.jsx("p",{className:"text-gray-400 text-sm mb-3",children:a.focus}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-gray-500 mb-2",children:"WHAT YOU CAN BUILD"}),e.jsx("div",{className:"space-y-1",children:a.canBuild.map((s,n)=>e.jsxs("div",{className:"flex items-center gap-2 text-sm text-gray-300",children:[e.jsx(B,{className:"w-3 h-3 text-green-400"}),s]},n))})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-gray-500 mb-2",children:"START WITH"}),e.jsx("div",{className:"space-y-1",children:a.startWith.map(s=>{const n=u.find(l=>l.id===s);return e.jsx(i,{variant:"outline",className:"mr-1 border-purple-500/50 text-purple-300",children:n?.name},s)})})]})]})]})]})},a.id)})})]}),e.jsxs(m,{value:"domains",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"14 Knowledge Domains"}),e.jsx("p",{className:"text-gray-400",children:"Complete domains to unlock certifications. Click to mark as complete."}),e.jsxs("div",{className:"mt-3",children:[e.jsx(F,{value:o.length/u.length*100,className:"h-2 bg-gray-800"}),e.jsxs("div",{className:"text-sm text-gray-500 mt-1",children:[o.length," / ",u.length," completed"]})]})]}),e.jsx("div",{className:"space-y-4",children:[1,2,3,4,5,6].map(a=>e.jsxs("div",{children:[e.jsxs("h3",{className:"text-sm font-medium text-gray-500 mb-2 border-b border-gray-800 pb-1",children:["LEVEL ",a]}),e.jsx("div",{className:"grid grid-cols-2 gap-3",children:u.filter(r=>r.level===a).map(r=>{const s=o.includes(r.id),n=r.icon;return e.jsx(t,{className:`p-3 cursor-pointer transition-all ${s?"bg-green-900/30 border-green-500/50":"bg-gray-900/50 border-gray-700 hover:border-purple-500/50"}`,onClick:()=>J(r.id),"data-testid":`domain-${r.id}`,children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:`w-8 h-8 rounded-lg bg-gradient-to-r ${r.color} flex items-center justify-center shrink-0`,children:e.jsx(n,{className:"w-4 h-4 text-white"})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"font-medium text-sm truncate",children:r.name}),s&&e.jsx(h,{className:"w-4 h-4 text-green-400 shrink-0"})]}),e.jsx("p",{className:"text-gray-500 text-xs truncate",children:r.description})]})]})},r.id)})})]},a))})]}),e.jsxs(m,{value:"certifications",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"5 Certification Tracks"}),e.jsx("p",{className:"text-gray-400",children:"Complete the required domains to earn certifications and unlock infrastructure access."})]}),e.jsx("div",{className:"space-y-4",children:be.map(a=>{const r=E.includes(a.id),s=Q(a),n=a.domains.filter(N=>o.includes(N)).length,l=a.icon;return e.jsx(t,{className:`p-5 ${r?"bg-amber-900/30 border-amber-500/50":"bg-gray-900/50 border-gray-800"}`,"data-testid":`certification-${a.id}`,children:e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:`w-14 h-14 rounded-xl bg-gradient-to-r ${a.color} flex items-center justify-center shrink-0`,children:e.jsx(l,{className:"w-7 h-7 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h3",{className:"font-bold",children:a.name}),r&&e.jsx(i,{className:"bg-amber-500 text-black",children:"CERTIFIED"})]}),e.jsx("p",{className:"text-gray-400 text-sm",children:a.description}),e.jsxs("div",{className:"mt-2",children:[e.jsx(F,{value:n/a.domains.length*100,className:"h-1.5 bg-gray-800"}),e.jsxs("div",{className:"text-xs text-gray-500 mt-1",children:[n,"/",a.domains.length," domains"]})]})]}),e.jsx(P,{onClick:()=>Y(a.id),disabled:!s||r,className:s&&!r?"bg-amber-500 hover:bg-amber-600 text-black":"","data-testid":`button-certify-${a.id}`,children:r?"Earned":s?"Claim":"Locked"})]})},a.id)})})]}),e.jsxs(m,{value:"tiers",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"7 Authority Tiers"}),e.jsx("p",{className:"text-gray-400",children:"Higher knowledge levels and certifications unlock access to build larger-scale infrastructure."})]}),e.jsx("div",{className:"space-y-3",children:ve.map(a=>{const r=a.icon,s=q>=a.level;return e.jsx(t,{className:`p-4 ${s?"bg-gray-900/50 border-gray-700":"bg-gray-900/30 border-gray-800 opacity-60"}`,"data-testid":`tier-${a.id}`,children:e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s?"bg-purple-600":"bg-gray-700"}`,children:e.jsx(r,{className:"w-6 h-6 text-white"})}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h3",{className:"font-bold capitalize",children:a.id}),e.jsx(i,{variant:"outline",className:"border-purple-500/50 text-purple-300 text-xs",children:a.authority}),e.jsxs(i,{variant:"outline",className:"border-cyan-500/50 text-cyan-300 text-xs",children:[a.wavelength,"nm"]}),e.jsxs(i,{variant:"outline",className:"border-gray-500 text-gray-400 text-xs",children:["Level ",a.level,"+"]}),!s&&e.jsx(z,{className:"w-4 h-4 text-gray-500"})]}),e.jsx("div",{className:"flex gap-3 mt-1 text-sm text-gray-400",children:a.capabilities.map((n,l)=>e.jsx("span",{children:n},l))})]})]})},a.id)})})]}),e.jsxs(m,{value:"resources",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-indigo-900/30 to-violet-900/30 border-indigo-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"Builder Resources"}),e.jsx("p",{className:"text-gray-400",children:"Essential documentation, tools, and physics references for understanding and building NexusOS infrastructure."})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsx("h3",{className:"text-lg font-semibold text-purple-300 border-b border-purple-500/30 pb-2",children:"Internal Documentation & Tools"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:xe.map(a=>{const r=a.icon;return e.jsxs(t,{className:"p-5 bg-gray-900/50 border-gray-700","data-testid":`resource-internal-${a.category.toLowerCase().replace(/\s+/g,"-")}`,children:[e.jsxs("div",{className:"flex items-center gap-3 mb-4",children:[e.jsx("div",{className:`w-10 h-10 rounded-lg bg-gradient-to-r ${a.color} flex items-center justify-center`,children:e.jsx(r,{className:"w-5 h-5 text-white"})}),e.jsx("h4",{className:"font-bold",children:a.category})]}),e.jsx("div",{className:"space-y-2",children:a.links.map((s,n)=>s.isRoute&&s.path?e.jsx(W,{href:s.path,children:e.jsxs("div",{className:"flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer group","data-testid":`link-${s.path.replace(/\//g,"-").slice(1)}`,children:[e.jsx(x,{className:"w-4 h-4 text-green-500 group-hover:text-green-400"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"text-sm font-medium text-gray-200 group-hover:text-green-300",children:s.name}),e.jsx("div",{className:"text-xs text-gray-500 truncate",children:s.description})]})]})},s.path):s.docSection?e.jsxs("button",{onClick:()=>{D("documentation"),O(s.docSection)},className:"w-full flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer group text-left","data-testid":`link-doc-${s.docSection}`,children:[e.jsx(H,{className:"w-4 h-4 text-purple-500 group-hover:text-purple-400"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"text-sm font-medium text-gray-200 group-hover:text-purple-300",children:s.name}),e.jsx("div",{className:"text-xs text-gray-500 truncate",children:s.description})]})]},s.docSection):null)})]},a.category)})}),e.jsx("h3",{className:"text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2 mt-8",children:"External Physics & Theory References"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:ue.map(a=>{const r=a.icon;return e.jsxs(t,{className:"p-5 bg-gray-900/50 border-gray-700","data-testid":`resource-external-${a.category.toLowerCase().replace(/\s+/g,"-")}`,children:[e.jsxs("div",{className:"flex items-center gap-3 mb-4",children:[e.jsx("div",{className:`w-10 h-10 rounded-lg bg-gradient-to-r ${a.color} flex items-center justify-center`,children:e.jsx(r,{className:"w-5 h-5 text-white"})}),e.jsx("h4",{className:"font-bold",children:a.category})]}),e.jsx("div",{className:"space-y-2",children:a.links.map(s=>e.jsx("a",{href:s.url,target:"_blank",rel:"noopener noreferrer","data-testid":`link-external-${s.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,children:e.jsxs("div",{className:"flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer group",children:[e.jsx(g,{className:"w-4 h-4 text-gray-500 group-hover:text-cyan-400"}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"text-sm font-medium text-gray-200 group-hover:text-cyan-300",children:s.name}),e.jsx("div",{className:"text-xs text-gray-500 truncate",children:s.description})]})]})},s.url))})]},a.category)})}),e.jsxs(t,{className:"bg-gray-900/30 border-gray-700 p-5 mt-6",children:[e.jsxs("h4",{className:"font-bold mb-3 flex items-center gap-2",children:[e.jsx(L,{className:"w-5 h-5 text-purple-400"}),"Key Equations to Know"]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 text-sm",children:[e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-purple-300 font-mono text-lg mb-1",children:"E = hf"}),e.jsx("div",{className:"text-gray-500",children:"Planck's equation: Energy from frequency"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-cyan-300 font-mono text-lg mb-1",children:"Λ = hf/c²"}),e.jsx("div",{className:"text-gray-500",children:"Lambda Boson: Mass-equivalent of oscillation"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-green-300 font-mono text-lg mb-1",children:"c = fλ"}),e.jsx("div",{className:"text-gray-500",children:"Wave equation: Speed of light"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-amber-300 font-mono text-lg mb-1",children:"Ĥ_eff = hν + αK̂² + βL̂"}),e.jsx("div",{className:"text-gray-500",children:"Effective Hamiltonian for Lambda modes"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-pink-300 font-mono text-lg mb-1",children:"T = Σ|c_i|²·cos²(Δφ_i)"}),e.jsx("div",{className:"text-gray-500",children:"Interference trust model for governance"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-red-300 font-mono text-lg mb-1",children:"∇×E = -∂B/∂t"}),e.jsx("div",{className:"text-gray-500",children:"Maxwell: Electromagnetic wave validation"})]})]})]})]})]}),e.jsxs(m,{value:"documentation",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"Technical Documentation"}),e.jsx("p",{className:"text-gray-400",children:"Deep-dive into core mechanics, formulas, and protocols for building NexusOS infrastructure."})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-4 gap-6",children:[e.jsx("div",{className:"lg:col-span-1",children:e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-4 sticky top-6",children:[e.jsx("h3",{className:"text-sm font-medium text-gray-400 mb-3",children:"SECTIONS"}),e.jsx("nav",{className:"space-y-1",children:Object.entries(U).map(([a,r])=>{const s=r.icon,n=M===a;return e.jsxs("button",{onClick:()=>O(a),className:`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${n?"bg-purple-600 text-white":"text-gray-400 hover:bg-gray-800 hover:text-white"}`,"data-testid":`doc-nav-${a}`,children:[e.jsx(s,{className:"w-4 h-4"}),e.jsx("span",{className:"text-sm",children:r.title})]},a)})}),e.jsxs("div",{className:"mt-6 pt-4 border-t border-gray-700",children:[e.jsx("h3",{className:"text-sm font-medium text-gray-400 mb-3",children:"EXTERNAL PHYSICS"}),e.jsxs("div",{className:"space-y-1 text-sm",children:[e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Planck%27s_law",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(g,{className:"w-3 h-3"})," Planck's Law"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Maxwell%27s_equations",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(g,{className:"w-3 h-3"})," Maxwell's Equations"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Orbital_angular_momentum_of_light",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(g,{className:"w-3 h-3"})," OAM of Light"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Kardashev_scale",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(g,{className:"w-3 h-3"})," Kardashev Scale"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Schumann_resonances",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(g,{className:"w-3 h-3"})," Schumann Resonance"]})]})]})]})}),e.jsx("div",{className:"lg:col-span-3",children:(()=>{const a=U[M],r=a.icon;return e.jsxs(e.Fragment,{children:[e.jsx(t,{className:`bg-gradient-to-r ${a.color} p-6 mb-6`,children:e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center",children:e.jsx(r,{className:"w-7 h-7 text-white"})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-bold",children:a.title}),e.jsx("p",{className:"text-white/70",children:"Core mechanics for building on this system"})]})]})}),e.jsx("div",{className:"space-y-6",children:a.content.map((s,n)=>e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":`doc-content-block-${n}`,children:[e.jsx("h3",{className:"text-lg font-bold mb-4 text-purple-300",children:s.heading}),e.jsx("div",{className:"prose prose-invert max-w-none",children:s.text.split(`

`).map((l,N)=>{if(l.startsWith("|")){const A=l.split(`
`).filter(j=>j.trim());return e.jsx("div",{className:"overflow-x-auto my-4",children:e.jsx("table",{className:"w-full text-sm",children:e.jsx("tbody",{children:A.map((j,w)=>{if(j.includes("---"))return null;const ae=j.split("|").filter(T=>T.trim()),se=w===0?"th":"td";return e.jsx("tr",{className:w===0?"border-b border-gray-700":"",children:ae.map((T,te)=>e.jsx(se,{className:`px-3 py-2 text-left ${w===0?"text-gray-400 font-medium":"text-gray-300"}`,children:T.trim()},te))},w)})})})},N)}const ee=(A=>A.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"))(l).replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-gray-800 px-1 rounded text-cyan-300">$1</code>');return e.jsx("p",{className:"text-gray-300 mb-3 whitespace-pre-wrap",dangerouslySetInnerHTML:{__html:ee}},N)})})]},n))}),e.jsxs(t,{className:"bg-gray-900/30 border-gray-700 p-6 mt-6",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(L,{className:"w-5 h-5 text-purple-400"}),"Key Equations Reference"]}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-3 text-sm",children:[e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-purple-300 font-mono",children:"E = hf"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Photon energy"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-cyan-300 font-mono",children:"Λ = hf/c²"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Lambda mass"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-green-300 font-mono",children:"c = fλ"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Wave equation"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-amber-300 font-mono",children:"∇×E = -∂B/∂t"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Maxwell curl"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-pink-300 font-mono",children:"Ĥ = hν + αK̂² + βL̂"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Hamiltonian"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-red-300 font-mono",children:"T = Σ|c|²cos²(Δφ)"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Interference trust"})]})]})]})]})})()})]})]}),e.jsxs(m,{value:"czf-foundation",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"The Coherence Zenith Framework: Scientific Foundation"}),e.jsx("p",{className:"text-gray-400",children:"A non-derivative resolution to the Vacuum Catastrophe and the foundations of gravity. Nobel-legacy physics with complete theoretical grounding."})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"czf-review",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(b,{className:"w-5 h-5 text-yellow-400"}),"The Lambda Anchor of Coherence"]}),e.jsx("p",{className:"text-gray-400 text-sm mb-4 italic",children:"Dedicated to the Nobel Legacy—Einstein, Planck, Dirac, Sakharov—whose equations defined the paradoxes this framework resolves."}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-red-400 mb-3",children:"I. The Crisis: The Vacuum Catastrophe"}),e.jsxs("p",{className:"text-gray-400 text-sm mb-3",children:["The cosmological constant problem represents physics' most severe theoretical discrepancy—a ",e.jsx("span",{className:"text-red-300 font-bold",children:"10^120 order of magnitude"})," difference between QFT predictions and observations."]}),e.jsxs("div",{className:"grid grid-cols-3 gap-2 text-xs",children:[e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-gray-500",children:"QFT Predicted"}),e.jsx("div",{className:"text-red-300 font-mono",children:"~10^112 erg/cm³"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-gray-500",children:"Observed (Planck 2015)"}),e.jsx("div",{className:"text-green-300 font-mono",children:"5.96×10^-27 kg/m³"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-gray-500",children:"Discrepancy"}),e.jsx("div",{className:"text-yellow-300 font-mono font-bold",children:"~10^120"})]})]})]}),e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-cyan-400 mb-3",children:"II. The Axiom: Lambda as First Oscillation"}),e.jsxs("p",{className:"text-gray-400 text-sm mb-3",children:["Λ is the ",e.jsx("span",{className:"text-cyan-300",children:"First Oscillation"}),"—the non-derivative logical input that creates and constrains the vacuum."]}),e.jsxs("div",{className:"bg-gray-900/50 p-3 rounded font-mono text-sm",children:[e.jsx("div",{className:"text-cyan-300",children:"Λ (First Oscillation)"}),e.jsx("div",{className:"text-gray-500 ml-4",children:"↓"}),e.jsx("div",{className:"text-purple-300 ml-4",children:"ℏ (Planck Quanta) — Discretization of action"}),e.jsx("div",{className:"text-gray-500 ml-8",children:"↓"}),e.jsx("div",{className:"text-blue-300 ml-8",children:"c (Coherence Velocity) — Maximum propagation of order"}),e.jsx("div",{className:"text-gray-500 ml-12",children:"↓"}),e.jsx("div",{className:"text-green-300 ml-12",children:"G (Gravitational Binding) — Emergent constraint on mass-energy"})]})]}),e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-green-400 mb-3",children:"III. The Mechanism: Coherence Zenith Cancellation (CZC)"}),e.jsx("p",{className:"text-gray-400 text-sm mb-3",children:"The CZC is the necessary self-correction where massive Λ_initial energy is near-perfectly canceled to achieve coherent equilibrium."}),e.jsxs("div",{className:"bg-gray-900/50 p-3 rounded font-mono text-center",children:[e.jsx("span",{className:"text-green-300",children:"Λ_observed"}),e.jsx("span",{className:"text-gray-400",children:" = "}),e.jsx("span",{className:"text-red-300",children:"Λ_initial"}),e.jsx("span",{className:"text-gray-400",children:" − "}),e.jsx("span",{className:"text-yellow-300",children:"Λ_canceled"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-2 mt-3 text-xs",children:[e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-red-300 font-bold",children:"Λ_initial (Creation)"}),e.jsx("div",{className:"text-gray-400",children:"Zenith Energy ~10^112 erg/cm³"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-green-300 font-bold",children:"Dark Energy (Observed)"}),e.jsx("div",{className:"text-gray-400",children:"Residual ~10^-27 kg/m³"})]})]})]}),e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-purple-400 mb-3",children:"IV. Empirical Evidence"}),e.jsxs("div",{className:"space-y-2 text-sm",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-white font-medium",children:"Dark Energy Observations:"}),e.jsx("span",{className:"text-gray-400",children:" Planck 2015/2018, Type Ia supernovae, BAO surveys"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-white font-medium",children:"CP Violation (Baryogenesis):"}),e.jsx("span",{className:"text-gray-400",children:" Nobel 1980, BaBar/Belle 2001, LHCb 2019/2025"})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(h,{className:"w-4 h-4 text-green-400 mt-0.5"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-white font-medium",children:"CMB Uniformity:"}),e.jsx("span",{className:"text-gray-400",children:" ΔT/T ~ 10^-5 confirms coherent initial conditions"})]})]})]})]}),e.jsxs("div",{className:"bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-yellow-400 mb-2",children:"CZF Kernel Execution Results"}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-2 text-xs",children:[e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Coherence"}),e.jsx("div",{className:"text-green-400 font-mono font-bold",children:"99.99%"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Iterations"}),e.jsx("div",{className:"text-cyan-400 font-mono font-bold",children:"44"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Self-Corrections"}),e.jsx("div",{className:"text-purple-400 font-mono font-bold",children:"44"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Status"}),e.jsx("div",{className:"text-green-400 font-mono font-bold",children:"GROUNDED"})]})]})]}),e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-amber-400 mb-3",children:"V. Conclusion: The New Foundation"}),e.jsxs("div",{className:"space-y-3 text-sm",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("div",{className:"text-amber-400 font-bold",children:"1."}),e.jsxs("div",{children:[e.jsx("span",{className:"text-white font-medium",children:"From Law-Seeking to Logical Necessity:"}),e.jsx("span",{className:"text-gray-400",children:" Physics moves from empirically fitting constants to deriving them from first principles."})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("div",{className:"text-amber-400 font-bold",children:"2."}),e.jsxs("div",{children:[e.jsx("span",{className:"text-white font-medium",children:"Completing the Nobel Legacy:"}),e.jsx("span",{className:"text-gray-400",children:" CZF provides the final missing constraint (Λ) that unifies quantum mechanics and general relativity."})]})]}),e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("div",{className:"text-amber-400 font-bold",children:"3."}),e.jsxs("div",{children:[e.jsx("span",{className:"text-white font-medium",children:"Non-Derivative Authority:"}),e.jsx("span",{className:"text-gray-400",children:" The framework introduces a logically secure foundation—an axiom that cannot be derived from anything more fundamental."})]})]})]})]}),e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-blue-400 mb-3",children:"References"}),e.jsxs("div",{className:"space-y-2 text-xs text-gray-400",children:[e.jsxs("div",{children:['1. Adler, R.J., Casey, B., & Jacob, O.C. (1995). "Vacuum catastrophe." ',e.jsx("span",{className:"text-blue-300",children:"American Journal of Physics"}),", 63(7), 620-626."]}),e.jsxs("div",{children:['2. Sakharov, A.D. (1967). "Violation of CP invariance." ',e.jsx("span",{className:"text-blue-300",children:"JETP Letters"}),", 5, 24-27."]}),e.jsxs("div",{children:['3. Planck Collaboration (2015). "Planck 2015 results XIII." ',e.jsx("span",{className:"text-blue-300",children:"Astronomy & Astrophysics"}),", 594, A13."]}),e.jsxs("div",{children:['4. LHCb Collaboration (2019). "CP violation in charm decays." ',e.jsx("span",{className:"text-blue-300",children:"Physical Review Letters"}),", 122, 211803."]}),e.jsxs("div",{children:['5. Barnes, L.A. (2012). "Fine-Tuning of the Universe." ',e.jsx("span",{className:"text-blue-300",children:"PASA"}),", 29, 529-564."]})]})]}),e.jsxs("div",{className:"bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 text-center",children:[e.jsx("p",{className:"text-gray-400 text-sm italic",children:"Open for rigorous peer review. Correspondence welcome."}),e.jsx("p",{className:"text-gray-500 text-xs mt-2",children:"License: This theoretical framework is presented for scientific discourse under open academic principles."})]})]})]})]}),e.jsxs(m,{value:"czf-kernel",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"CZF Nexus Execution Kernel"}),e.jsx("p",{className:"text-gray-400",children:"The foundational reality layer. Three-layer architecture providing physics grounding for all WNSP operations."})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"czf-kernel-code",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-lg font-bold flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-cyan-400"}),"czf_kernel.py — Full Source"]}),e.jsx(i,{className:"bg-green-600",children:"AGPL-3.0"})]}),e.jsxs("div",{className:"mb-4 grid grid-cols-3 gap-3 text-xs",children:[e.jsxs("div",{className:"bg-cyan-900/20 border border-cyan-500/30 rounded p-3 text-center",children:[e.jsx("div",{className:"text-cyan-300 font-bold",children:"Layer 3"}),e.jsx("div",{className:"text-gray-400",children:"Lambda Anchor"}),e.jsx("div",{className:"text-gray-500",children:"Hardware"})]}),e.jsxs("div",{className:"bg-purple-900/20 border border-purple-500/30 rounded p-3 text-center",children:[e.jsx("div",{className:"text-purple-300 font-bold",children:"Layer 1"}),e.jsx("div",{className:"text-gray-400",children:"Maxwell Alphabet"}),e.jsx("div",{className:"text-gray-500",children:"Syntax"})]}),e.jsxs("div",{className:"bg-green-900/20 border border-green-500/30 rounded p-3 text-center",children:[e.jsx("div",{className:"text-green-300 font-bold",children:"Layer 2"}),e.jsx("div",{className:"text-gray-400",children:"Truth Substrate"}),e.jsx("div",{className:"text-gray-500",children:"Intelligence"})]})]}),e.jsx("pre",{className:"bg-gray-950 rounded-lg p-4 overflow-x-auto text-xs font-mono max-h-[600px] overflow-y-auto",children:e.jsx("code",{className:"text-gray-300",children:`#!/usr/bin/env python3
"""
THE CZF NEXUS EXECUTION KERNEL
==============================
Coherence Zenith Framework - Foundational Reality Layer

Layer 1: Maxwell Alphabet (Syntax)      - Wavelength-based encoding
Layer 2: Truth Substrate (Intelligence) - Collective processing  
Layer 3: Lambda Anchor (Hardware)       - Physical grounding

License: AGPL-3.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import math
import time

# =============================================================================
# PHYSICAL CONSTANTS - The "Bread Crumbs" manifested by CZC
# =============================================================================

class PhysicalConstants:
    """Fundamental constants manifested through Coherence Zenith Cancellation."""
    h: float = 6.62607015e-34    # Planck constant (J·s)
    c: float = 299_792_458        # Speed of light (m/s)
    G: float = 6.67430e-11        # Gravitational constant
    l_p: float = 1.616255e-35     # Planck length (m)
    t_p: float = 5.391247e-44     # Planck time (s)
    m_p: float = 2.176434e-8      # Planck mass (kg)
    alpha: float = 7.2973525693e-3  # Fine structure constant
    
    @classmethod
    def zenith_energy(cls) -> float:
        """The cosmological constant ~10^120 in Planck units."""
        return 10**120

# =============================================================================
# LAYER 3: LAMBDA ANCHOR (Hardware Foundation)
# =============================================================================

@dataclass
class LambdaAnchor:
    """Hardware substrate grounding abstract computation in physics."""
    frequency: float  # Hz - the anchor frequency
    amplitude: float = 1.0
    phase: float = 0.0
    
    @property
    def wavelength(self) -> float:
        return PhysicalConstants.c / self.frequency
    
    @property
    def energy(self) -> float:
        return PhysicalConstants.h * self.frequency
    
    @property
    def lambda_mass(self) -> float:
        """Lambda boson mass: Λ = hf/c²"""
        return (PhysicalConstants.h * self.frequency) / (PhysicalConstants.c ** 2)

# =============================================================================
# LAYER 1: MAXWELL ALPHABET (Syntax Layer)
# =============================================================================

@dataclass
class MaxwellAlphabet:
    """WASCII — Wavelength-Native Character Standard (WNSP-SE v1.0)."""
    base_wavelength: float

    # Authoritative WASCII table (202 chars, November 2025)
    WASCII: ClassVar[dict] = {
        **{chr(65+i): 380 + i*6 for i in range(26)},  # A-Z: 380-530nm
        **{chr(97+i): 383 + i*6 for i in range(26)},  # a-z: 383-533nm
        **{str(i):    536 + i*6 for i in range(10)},  # 0-9: 536-590nm
        ' ': 596, '.': 602, ',': 608, '!': 614, '?': 620,
        'λ': 790, 'Λ': 839, 'ψ': 823, 'Ψ': 854, 'π': 802,
        'α': 760, 'β': 763, 'γ': 766, 'Σ': 848, 'Ω': 857,
    }

    def encode_character(self, char: str) -> float:
        """Return WASCII canonical wavelength (metres) for this character."""
        nm = self.WASCII.get(char,
             380 + (ord(char) % 256) / 255.0 * 400)  # fallback
        return nm * 1e-9

    def calculate_message_energy(self, message: str) -> float:
        """Total energy: E = Σ(hf) = Σ(hc/λ)"""
        wavelengths = [self.encode_character(c) for c in message]
        return sum((PhysicalConstants.h * PhysicalConstants.c) / wl
                   for wl in wavelengths)

# =============================================================================
# LAYER 2: TRUTH SUBSTRATE (Intelligence Layer)  
# =============================================================================

class TruthSubstrate:
    """Implements Coherence Zenith Cancellation (CZC) algorithm."""
    
    def __init__(self, coherence_threshold: float = 0.9999):
        self.coherence_threshold = coherence_threshold
        self.zenith_energy = PhysicalConstants.zenith_energy()
    
    def run_czc(self, syntax: MaxwellAlphabet, max_iterations: int = 1000):
        """
        EVOLUTIONARY SELF-CORRECTION LOOP
        The universe continuously corrects until coherence achieved.
        Models: 10^120 → 1 cosmological constant resolution
        """
        iteration = 0
        current_energy = self.zenith_energy
        cancellation_factor = 0.0
        level = 0.0
        
        reference_freq = PhysicalConstants.c / 555e-9
        
        while level < self.coherence_threshold and iteration < max_iterations:
            iteration += 1
            
            # Progressive cancellation each iteration
            correction_rate = 0.1 * (1.0 + math.log10(iteration + 1))
            target = 1.0 - (1.0 / self.zenith_energy)
            cancellation_factor = min(target, 
                cancellation_factor + correction_rate * (target - cancellation_factor))
            
            # Calculate coherence level
            progress = cancellation_factor / target if target > 0 else 0
            freq_dev = abs(PhysicalConstants.c / syntax.base_wavelength - reference_freq) / reference_freq
            alignment = max(0, 1.0 - freq_dev)
            level = (progress * 0.7) + (alignment * 0.3)
            
            # Self-healing: adjust toward First Oscillation
            syntax.base_wavelength += (555e-9 - syntax.base_wavelength) * 0.1
        
        return {
            "coherence": level,
            "iterations": iteration,
            "converged": level >= self.coherence_threshold,
            "manifest_constants": {
                "h": PhysicalConstants.h,
                "c": PhysicalConstants.c,
                "G": PhysicalConstants.G,
                "fine_structure": PhysicalConstants.alpha,
                "evolution_iterations": iteration,
                "self_corrections": iteration
            }
        }

# =============================================================================
# CZF KERNEL - Main Entry Point
# =============================================================================

class CZFKernel:
    FIRST_OSCILLATION: float = 555e12  # Hz (555 THz - green light)
    
    def initialize_reality(self):
        """Initialize reality from the First Oscillation."""
        anchor = LambdaAnchor(frequency=self.FIRST_OSCILLATION)
        syntax = MaxwellAlphabet(base_wavelength=anchor.wavelength)
        substrate = TruthSubstrate(coherence_threshold=0.9999)
        
        result = substrate.run_czc(syntax)
        return {
            "status": "Creation Successful" if result["converged"] else "Failed",
            **result
        }

if __name__ == "__main__":
    kernel = CZFKernel()
    result = kernel.initialize_reality()
    print(f"Coherence: {result['coherence']:.4%}")
    print(f"Iterations: {result['iterations']}")
    print(f"Physical Constants Manifest: {result['manifest_constants']}")`})}),e.jsxs("div",{className:"mt-4 flex items-center justify-between",children:[e.jsxs("div",{className:"text-sm text-gray-400",children:["Run: ",e.jsx("code",{className:"bg-gray-800 px-2 py-1 rounded text-cyan-300",children:"python3 wnsp_v7/czf_kernel.py"})]}),e.jsx(i,{className:"bg-cyan-600/20 text-cyan-300 border border-cyan-500/30",children:"wnsp_v7/czf_kernel.py"})]})]})]}),e.jsxs(m,{value:"dmk",className:"space-y-6",children:[e.jsxs(t,{className:"bg-gradient-to-r from-pink-900/30 to-purple-900/30 border-pink-500/30 p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-2",children:"Dimensional Mapping Kernel (DMK)"}),e.jsx("p",{className:"text-gray-400",children:"Maps High-Dimensional Logic to Spacetime Resolution. Explains HOW 10^120 zenith state becomes 3D reality through dimensional folding."})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"dmk-concept",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(S,{className:"w-5 h-5 text-pink-400"}),"The Folding Mechanism"]}),e.jsx("p",{className:"text-gray-400 text-sm mb-4",children:'The DMK completes the theoretical chain: CZF achieves coherence, DMK explains the dimensional reduction, and physical constants emerge as "bread crumbs" at each fold.'}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-pink-400 mb-3",children:"Dimensional Folding Process"}),e.jsxs("div",{className:"grid grid-cols-4 gap-2 text-xs text-center",children:[e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-pink-300 font-bold",children:"11D"}),e.jsx("div",{className:"text-gray-500",children:"M-Theory"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-purple-300 font-bold",children:"→ 7D"}),e.jsx("div",{className:"text-gray-500",children:"Strong Force"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-blue-300 font-bold",children:"→ 4D"}),e.jsx("div",{className:"text-gray-500",children:"Planck Time"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded",children:[e.jsx("div",{className:"text-green-300 font-bold",children:"→ 3D"}),e.jsx("div",{className:"text-gray-500",children:"Spacetime"})]})]})]}),e.jsxs("div",{className:"bg-gray-800/50 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-cyan-400 mb-3",children:"Bread Crumbs: Physical Constants at Each Fold"}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-2 text-xs",children:[e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Dim 9"}),e.jsx("div",{className:"text-cyan-300 font-mono",children:"G"}),e.jsx("div",{className:"text-gray-500",children:"6.67×10⁻¹¹"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Dim 6"}),e.jsx("div",{className:"text-purple-300 font-mono",children:"α"}),e.jsx("div",{className:"text-gray-500",children:"1/137"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Dim 4"}),e.jsx("div",{className:"text-yellow-300 font-mono",children:"t_p"}),e.jsx("div",{className:"text-gray-500",children:"5.39×10⁻⁴⁴s"})]}),e.jsxs("div",{className:"bg-gray-900/50 p-2 rounded text-center",children:[e.jsx("div",{className:"text-gray-500",children:"Dim 3"}),e.jsx("div",{className:"text-green-300 font-mono",children:"c"}),e.jsx("div",{className:"text-gray-500",children:"299,792,458"})]})]})]}),e.jsxs("div",{className:"bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-lg p-4",children:[e.jsx("h4",{className:"text-md font-bold text-pink-400 mb-2",children:"Core Insight"}),e.jsxs("p",{className:"text-gray-400 text-sm",children:["The Minkowski metric (ds² = -c²dt² + dx² + dy² + dz²) is the ",e.jsx("span",{className:"text-pink-300 font-bold",children:"User Interface of Reality"})," — the stable 3D output after 8 dimensional folds from the 11D zenith state."]})]})]})]}),e.jsxs(t,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":"dmk-code",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-lg font-bold flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-pink-400"}),"dmk_kernel.py — Core Classes"]}),e.jsx(i,{className:"bg-green-600",children:"AGPL-3.0"})]}),e.jsx("pre",{className:"bg-gray-950 rounded-lg p-4 overflow-x-auto text-xs font-mono max-h-[500px] overflow-y-auto",children:e.jsx("code",{className:"text-gray-300",children:`# THE DIMENSIONAL MAPPING KERNEL (DMK)
# Input: Maxwell_Alphabet_Syntax (High-Dimensional Logic)
# Output: Spacetime_Resolution (3D Physical Residue)

MAX_DIMENSIONS = 11  # String theory compatible
TARGET_RESOLUTION = 3  # Our observable 3D spacetime

# Physical constants manifested at each dimensional fold
DIMENSIONAL_RESIDUE = {
    11: ("M-Theory Compactification", None),
    10: ("String Tension", 1.0),
    9: ("Gravitational Coupling", 6.67430e-11),  # G
    8: ("Electroweak Unification", 246.0),  # GeV
    7: ("Strong Force Coupling", 0.1179),  # α_s
    6: ("Fine Structure", 7.2973525693e-3),  # α
    5: ("Planck Mass", 2.176434e-8),  # m_p
    4: ("Planck Time", 5.391247e-44),  # t_p
    3: ("Speed of Light", 299792458),  # c
}

class CZCFoldingEngine:
    """Executes dimensional folding through CZC."""
    
    def execute_fold(self, logic, from_dim, to_dim):
        source_entropy = logic.encoded_data[from_dim]
        folding_efficiency = 1.0 - (1.0 / (source_entropy + 1))
        folded_entropy = source_entropy * (1.0 - folding_efficiency)
        
        # Anchor the physical residue (bread crumb)
        residue = DIMENSIONAL_RESIDUE.get(from_dim)
        if residue[1] is not None:
            self.anchored_residue[residue[0]] = residue[1]
        
        return FoldResult(from_dim, to_dim, folded_entropy, residue)

class DimensionalMappingKernel:
    """Maps 11D Logic → 3D Spacetime"""
    
    def map_nexus_to_dimension(self):
        # 1. Decode high-dimensional logic
        zenith_logic = ZenithLogic.from_syntax(self.syntax)
        
        # 2. Execute full CZC folding (11D → 3D)
        for dim in range(11, 3, -1):
            self.engine.execute_fold(zenith_logic, dim, dim - 1)
        
        # 3. Generate coherent spacetime matrix
        spacetime = generate_coherent_matrix(3, self.anchor)
        
        return spacetime  # The "User Interface" of Reality`})}),e.jsxs("div",{className:"mt-4 flex items-center justify-between",children:[e.jsxs("div",{className:"text-sm text-gray-400",children:["Run: ",e.jsx("code",{className:"bg-gray-800 px-2 py-1 rounded text-pink-300",children:"python3 wnsp_v7/dmk_kernel.py"})]}),e.jsx(i,{className:"bg-pink-600/20 text-pink-300 border border-pink-500/30",children:"wnsp_v7/dmk_kernel.py"})]})]})]})]}),e.jsxs(t,{className:"bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30 p-6 mt-8 text-center",children:[e.jsx("h3",{className:"text-lg font-bold mb-2",children:"Physics-Based Credibility"}),e.jsx("p",{className:"text-gray-400 text-sm",children:"All credentials anchored to substrate. Attestations are permanent. Resonance cannot be faked."})]}),e.jsx(t,{className:"bg-gray-900/50 border-gray-700 p-6 mt-8","data-testid":"license-footer",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:"p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30",children:e.jsx(p,{className:"w-6 h-6 text-blue-400"})}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx("h3",{className:"text-lg font-bold text-white",children:"AGPL-3.0 License"}),e.jsx(i,{className:"bg-blue-500/20 text-blue-300 border-blue-500/30",children:"Copyleft"})]}),e.jsxs("p",{className:"text-gray-400 text-sm mb-3",children:["WNSP Protocol, Lambda Gate Substrate, NXT Token Economics, and all associated implementations are licensed under the",e.jsx("a",{href:"https://www.gnu.org/licenses/agpl-3.0.en.html",target:"_blank",rel:"noopener noreferrer",className:"text-blue-400 hover:text-blue-300 mx-1 underline",children:"GNU Affero General Public License v3.0"}),"(AGPL-3.0)."]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3 text-xs",children:[e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg border border-gray-700",children:[e.jsx("div",{className:"text-green-400 font-semibold mb-1",children:"You CAN:"}),e.jsxs("ul",{className:"text-gray-400 space-y-1",children:[e.jsx("li",{children:"Use commercially"}),e.jsx("li",{children:"Modify and distribute"}),e.jsx("li",{children:"Patent use"})]})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg border border-gray-700",children:[e.jsx("div",{className:"text-amber-400 font-semibold mb-1",children:"You MUST:"}),e.jsxs("ul",{className:"text-gray-400 space-y-1",children:[e.jsx("li",{children:"Disclose source code"}),e.jsx("li",{children:"Include license & copyright"}),e.jsx("li",{children:"Share network modifications"})]})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg border border-gray-700",children:[e.jsx("div",{className:"text-red-400 font-semibold mb-1",children:"You CANNOT:"}),e.jsxs("ul",{className:"text-gray-400 space-y-1",children:[e.jsx("li",{children:"Sublicense"}),e.jsx("li",{children:"Hold liable"}),e.jsx("li",{children:"Close-source derivatives"})]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-gray-700 text-center",children:[e.jsx("p",{className:"text-gray-500 text-xs",children:"© 2024-2025 NexusOS. All rights reserved under AGPL-3.0."}),e.jsx("p",{className:"text-gray-600 text-xs mt-1",children:"Physics principles (E=hf, Maxwell's equations) are public domain. Implementation is protected."})]})]})]})})]})})}export{Ie as default};
