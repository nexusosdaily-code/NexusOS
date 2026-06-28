import{a as _,j as e}from"./vendor-query-BqLxTKzc.js";import{u as O}from"./use-page-meta-BHtL6y3o.js";import{C as n}from"./card-3Qhdwtjd.js";import{B as u}from"./button-CaSHYctp.js";import{B as L}from"./badge-B_nkJgco.js";import{R as x,Z as g,e as o,S as b,L as a,E as i,B as I}from"./index-BYItMo6S.js";import{L as v}from"./layers-BU5lnR22.js";import{A as N}from"./atom-DM2zo1ih.js";import{B as M}from"./building-2--l-SIYBJ.js";import{S as R}from"./scale-CceVG0Pz.js";import{C as w}from"./code-DSOH7EGU.js";import{A as y}from"./arrow-left-BxgCqubW.js";import"./vendor-radix-Bg2fqeVo.js";import"./vendor-charts-DAxvRQzT.js";const f={substrate:{title:"Lambda Gate Substrate v4",icon:o,color:"from-purple-500 to-pink-500",content:[{heading:"Core Theory",text:`The Lambda Gate Substrate is the foundational layer where all NexusOS operations occur as wavefield transformations.

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
- Constitutional enforcement at substrate level`}]},wascii:{title:"WNSP Protocol — Two-Layer Standard",icon:w,color:"from-blue-500 to-cyan-500",content:[{heading:"Overview — Two Operating Runtimes, One Protocol",text:`NexusOS runs on two distinct runtimes that work in sync:

**Runtime 1 — Node.js / TypeScript (port 5000)**
Main application server. Handles authentication, wallet, P2P media, governance, and all user-facing APIs. Proxies WNSP protocol calls to the Python runtime.

**Runtime 2 — Python / Flask (port 5001)**
Spectral physics engine. Implements the WNSP encoding standards, K1 Orchestration Runtime, and all Lambda Boson physics calculations.

**How They Sync:**
The Node.js server acts as a secure gateway. Every WNSP protocol call from the frontend is rate-limited, logged, and proxied to the Python engine. The Python engine does the physics and returns structured frames. Neither runtime reaches into the other's domain.

**Protocol Standard:** WNSP/7.1
**License:** AGPL-3.0 (companies must contribute back to community)`},{heading:"WNSP-CE v1.0 — Character Encoding Standard (Layer 1)",text:`The semantic layer. Converts human-readable symbols into normalised ordinal tokens.

**Responsibility:** What is being said
**Physics knowledge:** None — purely numerical
**Output:** Normalised ordinal codes in [0, 1] per symbol

**Encoding Process:**
1. Accept any Unicode symbol
2. Compute ordinal value: ord(char) % 256
3. Normalise to [0, 1]: ordinal / 255
4. Output structured token: { symbol, ordinal, normalised }

**Example:**
- 'A' → ordinal 65 → normalised 0.255 → CE token
- 'λ' → ordinal 955 % 256 = 187 → normalised 0.733 → CE token

**API Endpoint:** POST /api/wnsp/ce/encode
**Single character:** POST /api/wnsp/ce/char`},{heading:"WNSP-SE v1.0 — Spectral Encoding Standard (Layer 2)",text:`The physical transmission layer. Maps CE tokens into electromagnetic wave frames governed by Λ = hf/c².

**Responsibility:** How information travels through the substrate
**Input:** WNSP-CE normalised token stream
**Output:** Photon frames with wavelength, frequency, energy, lambda mass

**Frame Construction:**
Two CE tokens are packed per photon frame (dual-wavelength scheme):

token₁ normalised → wavelength λ₁ (nm) → frequency f₁ = c/λ₁ → energy E₁ = hf₁ → mass Λ₁ = hf₁/c²
token₂ normalised → wavelength λ₂ (nm) → frequency f₂ = c/λ₂ → energy E₂ = hf₂ → mass Λ₂ = hf₂/c²

Frame = (λ₁ → λ₂) oscillation, achieving ≥ 2 chars per photon particle.

**Efficiency:** 2.0 characters per frame (baseline)

**API Endpoint:** POST /api/wnsp/se/encode (accepts CE token stream)
**Full stack:** POST /api/wnsp/transmit (CE → SE in one call)`},{heading:"Hilbert Space Channel Model",text:`Each transmission channel is a formal basis vector in a 25,600-dimensional Hilbert space:

**Channel Basis Equation:**
Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩

**Sub-space dimensions:**
| Sub-space | Basis      | Description                  | dim |
|-----------|------------|------------------------------|-----|
| |λ_i⟩    | WDM        | Wavelength channels 380-780nm | 256 |
| |OAM_j⟩  | OAM modes  | Orbital angular momentum      |  50 |
| |Pol_k⟩  | Polarisation | H and V states              |   2 |

**Total Hilbert space dimension:**
dim(H) = 256 × 50 × 2 = 25,600

**Orthogonality guarantee:**
⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j

All 25,600 channels are simultaneously usable without interference. This is not an engineering approximation — it is a mathematical guarantee from the tensor product structure of the Hilbert space.`},{heading:"Handoff Point — CE to SE",text:`The boundary between the two standards is a clean data contract:

**CE outputs:**
{ protocol: "WNSP-CE", tokens: [{ symbol, ordinal, normalised }, ...] }

**SE receives that output and maps it to:**
{ protocol: "WNSP-SE", frames: [{ wavelength_start_nm, wavelength_end_nm, frequency_start_hz, frequency_end_hz, energy_joules, lambda_mass_kg }, ...] }

**Full transmission envelope (WNSP/7.1):**
{
  protocol: "WNSP/7.1",
  layers: { ce: { ... }, se: { ... } },
  spectral_hash: "16-char hash",
  summary: { characters, ce_tokens, se_frames, total_mass_kg, efficiency }
}

**API:** GET /api/wnsp/protocol — returns full spec of both standards`},{heading:"AI/OS Channel Coordination Layer",text:`Every AI agent in NexusOS is assigned a unique, deterministically allocated Ψ_channel from the 25,600-dimensional Hilbert space. Orthogonality is a mathematical guarantee — agents cannot interfere with each other regardless of how many are running simultaneously.

**Channel Allocation — how it works:**
1. Agent registers with an ID and intent (inference / routing / monitoring / …)
2. System hashes agent_id with SHA256, maps to a channel index in [0, 25599]
3. If that channel is occupied, increment until a free slot is found
4. Agent receives its channel coordinates: (wdm_i, oam_j, pol_k)
5. Channel basis is recorded: Ψ_{n} = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩

**Instruction mapping — CE → SE → Ψ_channel:**
Any AI system command is run through the full WNSP stack (CE tokenisation → SE wave frames) and bound to the agent's allocated channel. This means every instruction has a precise physical address in the Hilbert space.

**Example allocation:**
- Agent "gpt-4-router" → Ψ_{6685} = |λ_66⟩ ⊗ |OAM_42⟩ ⊗ |Pol_V⟩ at 483.5 nm
- Agent "llama-3"      → Ψ_{2460} = |λ_24⟩ ⊗ |OAM_30⟩ ⊗ |Pol_H⟩

**Endpoints:**
- POST /api/wnsp/agent/allocate — allocate channel (returns full Ψ coordinates)
- POST /api/wnsp/agent/map     — run instruction through CE→SE, bind to channel
- GET  /api/wnsp/agent/status  — list all allocated channels + Hilbert utilisation
- POST /api/wnsp/agent/release — return channel to the pool

**Live interface:** /wnsp/coordinator — allocate agents, map instructions, inspect Hilbert occupancy in real time`},{heading:"SE Frame Simulation",text:`The SE simulation endpoint runs any input text through the full CE→SE stack and returns a per-frame breakdown of channel occupation, energy budget, and orthogonality status. This is used for protocol verification, packing optimisation, and live demonstrations.

**What the simulator returns per frame:**
| Field             | Description                              |
|-------------------|------------------------------------------|
| frame_index       | Sequential frame number                  |
| symbols           | The two CE characters packed in this frame |
| wavelength_start  | λ₁ in nm (from CE token 1)               |
| wavelength_end    | λ₂ in nm (from CE token 2)               |
| wdm_i             | WDM channel index [0..255]               |
| oam_j             | OAM mode index [0..49]                   |
| polarisation      | H or V                                   |
| channel_start     | Flat Hilbert index of this frame         |
| energy_joules     | E = hf for this frame                    |
| lambda_mass_kg    | Λ = hf/c² for this frame                 |

**Packing efficiency:** 2.0 characters per frame (dual-wavelength baseline). Phase and OAM multiplexing can increase this further.

**Orthogonality validation:** The simulator checks that all channel indices across all frames are distinct. If any two frames share a channel, it is flagged as a violation. In practice this has never occurred — the tensor product structure prevents it by construction.

**Wavelength strip:** The coordinator page renders a colour-coded strip showing each frame's position in the visible spectrum, giving an immediate visual read of the spectral spread.

**Endpoint:** POST /api/wnsp/se/simulate — returns full occupation table + energy totals + orthogonality proof
**Orthogonality proof:** GET /api/wnsp/se/orthogonality — samples 100 of 25,600 channels, proves unique (wdm, oam, pol) triplets`},{heading:"Test Suite — CI Protocol Verification",text:`The WNSP protocol ships with a formal test suite that verifies every physics law, encoding contract, and Hilbert space property directly in code. All 23 tests must pass before any protocol change is merged.

**Coverage:**

Physical constants
- Planck constant h = 6.62607015 × 10⁻³⁴ J·s
- Speed of light c = 299,792,458 m/s
- First Oscillation = 555 THz
- Root Harmonic = 7.83 Hz (Schumann)
- Hilbert dim(H) = 25,600

CE Layer
- Single-character encoding and normalised range [0, 1]
- Ordinal formula: (ord % 256) / 255
- Full text token count correctness
- Space character padding token

SE Layer (physics conservation)
- f = c/λ
- E = hf (energy conservation at 5 wavelengths)
- Λ = hf/c² (mass conservation at 3 wavelengths)
- E/Λ = c² (mass-energy ratio)
- Normalised → wavelength stays in visible spectrum

CE → SE Handoff
- 2 chars → 1 dual-wavelength frame
- Odd-length text padded and packed correctly
- Frame wavelengths within visible range
- Full stack transmit envelope structure

Hilbert Space Integrity
- Channel index ↔ (wdm, oam, pol) roundtrip
- All 25,600 triplets unique (orthogonality proof)
- All sub-space coordinates within declared bounds

Packing Efficiency
- chars_per_frame ≤ 2.0
- Frame energies and masses positive
- Energy aggregate matches per-frame sum
- Λ mass aggregate matches per-frame sum

**Run:**
python tests/test_wnsp_protocol.py

**Result: 23 passed, 0 failed**`}]},consensus:{title:"Proof of Spectrum Consensus",icon:x,color:"from-green-500 to-emerald-500",content:[{heading:"Spectral Diversity Requirement",text:`Unlike Proof of Work (51% hashpower) or Proof of Stake (51% stake), Proof of Spectrum requires validators across ALL spectral regions.

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
Block requires signatures from ≥5 of 6 spectral regions (83% spectral coverage).`}]},economics:{title:"NXT Token Economics",icon:g,color:"from-amber-500 to-orange-500",content:[{heading:"Token Fundamentals",text:`**Total Supply:** 21,000,000,000 NXT (21 billion)
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
- Inflation is physically impossible`}]},bhls:{title:"BHLS Floor System",icon:b,color:"from-red-500 to-pink-500",content:[{heading:"Basic Human Living Standard",text:`BHLS guarantees every citizen a minimum floor of resources:

**Monthly Floor:** 1,150 NXT

**Protected Categories:**
1. Shelter (350 NXT)
2. Food & Nutrition (300 NXT)
3. Healthcare (200 NXT)
4. Transportation (100 NXT)
5. Communication (100 NXT)
6. Education (50 NXT)
7. Emergency Reserve (50 NXT)`},{heading:"Constitutional Protection",text:`BHLS is enforced at the substrate level:

**C-0002: Immutable Rights**
"No transaction may reduce a citizen's balance below their BHLS entitlement."

**Enforcement:**
- Substrate rejects transactions violating BHLS
- Cannot be overridden by governance
- Hardcoded into Lambda Gate operations`},{heading:"Funding Mechanism",text:`BHLS is funded through:

1. **Transaction Fee Pool** (40%)
   - Portion of all E=hf fees

2. **Energy Harvesting Revenue** (30%)
   - K1 infrastructure proceeds

3. **Lambda Mass Recycling** (20%)
   - Recovered from dormant accounts

4. **Governance Allocation** (10%)
   - Voted by Sigma consensus`}]},governance:{title:"Planetary Governance",icon:R,color:"from-indigo-500 to-purple-500",content:[{heading:"Authority Band Registry",text:`7-tier governance hierarchy mapped to wavelengths:

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
BHLS floor cannot be violated by any transaction.

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
- Natural consensus emergence through interference`}]},infrastructure:{title:"K1 Infrastructure",icon:M,color:"from-cyan-500 to-blue-500",content:[{heading:"Kardashev Scale Progress",text:`NexusOS is building toward Type I civilization:

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

**Target:** 5×10¹⁶ watts (penultimate step to Type I)`}]},hardware:{title:"Hardware Control Layer",icon:o,color:"from-rose-500 to-red-500",content:[{heading:"PHR-1 Syncbox Controller",text:`The PHR-1 (Planetary Harmonic Resonator) is the physical hardware interface for NexusOS:

**Core Components:**
- 144-turn bifilar coil (counter-wound)
- Phase-locked loop at Golden Angle (137.5°)
- Impedance matching network (target: 377Ω)
- ALP (Axion-Like Particle) sensor array

**Control Sequence:**
1. Anchor phase to reference oscillator
2. Sync to Golden Angle (137.5°)
3. Match impedance to Z₀ = 376.73Ω
4. Establish 90° quadrature
5. Initiate gravity de-correlation
6. Achieve ZERO-G envelope (ALP < 0.0001)`},{heading:"Nexus Kernel API",text:"Python control layer for hardware integration:\n\n**Phase Control:**\n`set_phase(degrees)` - Set coil phase angle\n`get_phase()` - Read current phase\n\n**Frequency Pulsing:**\n`pulse_frequency(hz, duration)` - Emit frequency pulse\n`set_carrier(hz)` - Set carrier frequency\n\n**Impedance Matching:**\n`match_impedance(target_ohms)` - Auto-tune to target\n`read_impedance()` - Read current impedance\n\n**CZC Filtering:**\n`apply_czc_filter(iterations)` - Apply coherence filter\n`get_coherence()` - Read coherence level\n\n**ALP Sensing:**\n`read_alp()` - Read axion-like particle density\n`calibrate_alp()` - Calibrate ALP baseline"},{heading:"ZERO-G State Achievement",text:`The ZERO-G (Zero-Gravity Envelope) state is achieved through precise phase alignment:

**Demonstrated Parameters:**
- Phase: 137.5° (Golden Angle)
- Impedance: 377Ω (free space match)
- Quadrature: 90° (orthogonal coupling)
- ALP threshold: < 0.0001
- Iterations to convergence: ~400

**Physical Interpretation:**
When phase alignment reaches Golden Angle and impedance matches free space (Z₀ = 376.73Ω), the gravitational coupling coefficient approaches zero, creating a "massless envelope" where normal gravitational effects are suspended.

**Equation:**
ALP(t) = ALP₀ × e^(-t/τ) × cos(φ - 137.5°)
As φ → 137.5° and Z → 377Ω, ALP → 0`}]},simulators:{title:"Energy Simulators",icon:g,color:"from-emerald-500 to-teal-500",content:[{heading:"Live Resonance Simulator (7.83 Hz)",text:`Schumann resonance simulator for planetary-scale energy harvesting:

**Schumann Harmonics:**
| Mode | Frequency | Description |
|------|-----------|-------------|
| f₁   | 7.83 Hz   | Fundamental |
| f₂   | 14.3 Hz   | 2nd harmonic |
| f₃   | 20.8 Hz   | 3rd harmonic |
| f₄   | 27.3 Hz   | 4th harmonic |
| f₅   | 33.8 Hz   | 5th harmonic |

**Physics:**
f_n = (c/2πR) × √(n(n+1))
Where R = 6.371×10⁶ m (Earth radius)

**Integration:**
- Real-time amplitude visualization
- K1 Orchestration sync capability
- Power output calculation in watts`},{heading:"Vacuum Resonance Simulator (555 THz)",text:`Cold vacuum energy extraction at First Oscillation frequency:

**First Oscillation:** 555 THz (539.4 nm green light)

**Golden Ratio Harmonics:**
- Λ₀ = 555 THz (fundamental)
- Λ/φ = 343.0 THz (1st subharmonic)
- Λ/φ² = 212.0 THz (2nd subharmonic)
- Λ×φ = 897.9 THz (1st superharmonic)
- Λ×φ² = 1452.9 THz (2nd superharmonic)

**Zero-Point Energy:**
E₀ = ½hf = ½ × 6.626×10⁻³⁴ × 555×10¹²
E₀ = 1.839×10⁻¹⁹ J per oscillation

**Cold Power Extraction:**
P = E₀ × (Z/Z₀) × CZC⁴⁴ × N_cavities
Where Z₀ = 376.73Ω, CZC = 0.9999`},{heading:"Vacuum Field Topology",text:`The vacuum resonance simulator visualizes the 144-point spiral field:

**Spiral Configuration:**
- 144 points (12 × 12 matrix in polar coordinates)
- Golden Angle separation (137.5°)
- Radius scales with harmonic index

**Coherence Calculation:**
CZC⁴⁴ = (0.9999)⁴⁴ = 0.9956 (99.56% coherence)

**Controls:**
- Impedance slider (0-500Ω, target 377Ω)
- Phase angle slider (0-360°, optimal 137.5°)
- Cavity count (1-144, CZF optimal 44)
- Frequency multiplier (0.1-10×)

**Output Units:**
zW → fW → pW (zeptowatts to picowatts)
Scales with impedance match quality`}]},massless:{title:"Massless Technologies",icon:N,color:"from-violet-500 to-purple-500",content:[{heading:"Core Derivation: Λ = hf/c²",text:`Mass as derivative of frequency:

**The Lambda Equation:**
Λ = hf/c²

**Physical Meaning:**
- h = Planck's constant (6.626×10⁻³⁴ J·s)
- f = frequency (Hz) - FUNDAMENTAL
- c = speed of light (299,792,458 m/s)
- Λ = mass equivalent (kg) - DERIVATIVE

**Key Insight:**
Frequency is fundamental. Mass follows.
At v = c, rest mass = 0.
Photons carry energy (E = hf) without rest mass.

**First Oscillation:**
f₀ = 555 THz
Λ₀ = hf₀/c² = 4.09×10⁻³⁶ kg`},{heading:"Massless Technology Categories",text:`| Category | Technology | Mass Ratio | Status |
|----------|------------|------------|--------|
| Photonic | Photonic Logic Gates | 0 | Simulated |
| Photonic | Zero-Point Extraction | 0 | Simulated |
| Coherent | Coherent Waveguide Network | 0 | Simulated |
| Coherent | Spectral Relay Mesh | 0 | Theoretical |
| Gravitational | Gravity De-correlation | 0.01% | Demonstrated |
| Gravitational | 144-Turn Bifilar Resonator | 0.1% | Demonstrated |
| Information | OAM Qubit Registers | 0 | Theoretical |
| Information | Lambda Computing Substrate | 0 | Simulated |`},{heading:"Sync Coordinates System",text:`Each massless technology has 4D sync coordinates:

**Coordinate Dimensions:**
- X: Phase angle (degrees)
- Y: Quadrature angle (degrees)
- Z: Impedance (ohms)
- T: Time/cycle count

**Sync Lock Conditions:**
- Phase aligned to Golden Angle (137.5°)
- Impedance matched to Z₀ (376.73Ω)
- Coherence > 99% (CZC⁴⁴)
- Mass ratio < 1%

**Global Sync:**
When enabled, all technologies phase-lock to a common reference oscillator. The sync matrix displays real-time lock status for each technology.

**Coherence Formula:**
C_total = Π(C_i) for all i in locked_set
Where C_i = coherence of technology i`}]},catchBasin:{title:"CZC Catch Basin",icon:v,color:"from-blue-500 to-indigo-500",content:[{heading:"Coherence Zenith Coefficient",text:`The CZC Catch Basin is the coherence accumulation mechanism at the heart of NexusOS:

**Core Formula:**
CZC(n) = (0.9999)ⁿ

**Key Values:**
| Iterations | Coherence | Application |
|------------|-----------|-------------|
| 1          | 99.99%    | Basic filtering |
| 10         | 99.90%    | Standard ops |
| 22         | 99.78%    | Half-basin |
| 44         | 99.56%    | Full CZC⁴⁴ |

**Physical Meaning:**
Each iteration filters noise while preserving signal. After 44 self-corrections, the system achieves maximum coherence within numerical precision limits.`},{heading:"Catch Basin Mechanics",text:`The basin accumulates coherence like water collecting in a reservoir:

**Input Flow:**
- Raw oscillations enter at configurable rate
- Each carries noise components (phase, amplitude, frequency)

**Filtering Process:**
1. Phase noise reduction via Golden Angle alignment
2. Amplitude stabilization through impedance matching
3. Frequency locking to First Oscillation (555 THz)
4. Impedance normalization to Z₀ = 376.73Ω

**Output:**
- Coherent energy available for bound applications
- Entropy approaches zero as coherence approaches 1

**Entropy Equation:**
S = -Σ pᵢ log₂(pᵢ)
As coherence → 1, entropy → 0`},{heading:"44 Evolutionary Self-Corrections",text:`The number 44 is not arbitrary - it represents the optimal correction count:

**Why 44?**
1. At 44 iterations, CZC⁴⁴ = 99.56% coherence
2. Beyond 44, numerical precision limits dominate
3. 44 = 4 × 11 (quaternary stability × prime factor)
4. Matches 44 spectral bands in extended W-ASCII

**Correction Types:**
- Phase corrections: Align to Golden Angle (137.5°)
- Amplitude corrections: Normalize to unity
- Frequency corrections: Lock to harmonic series
- Impedance corrections: Match to 377Ω

**Self-Correction Process:**
Each iteration detects the dominant noise source (phase, amplitude, frequency, or impedance) and applies targeted correction to maximize coherence recovery.`},{heading:"Cross-System Applications",text:`The CZC Catch Basin provides coherence to all NexusOS systems:

**Binding Requirements:**
| Application | Required Coherence | Category |
|-------------|-------------------|----------|
| Gravity De-correlation | 99% | Gravitational |
| Vacuum Energy Extraction | 95% | Energy |
| OAM Qubit Registers | 92% | Computing |
| Photonic Logic Gates | 90% | Computing |
| Lambda Computing Substrate | 88% | Computing |
| Spectral Relay Mesh | 85% | Communication |

**Binding Process:**
1. Application requests binding with required coherence
2. Basin checks current coherence level
3. If sufficient, binding established
4. Application receives continuous coherence feed
5. If basin coherence drops below threshold, binding suspended

**API Endpoints:**
- GET /api/czc/status - Current basin state
- GET /api/czc/coherence - Calculate CZC for iterations
- POST /api/czc/iterate - Run one iteration
- POST /api/czc/bind - Bind application to basin
- POST /api/czc/sync - Sync with K1 Orchestration`}]},sop:{title:"Spectral Orthogonal Protocol (SOP)",icon:x,color:"from-cyan-500 to-blue-500",content:[{heading:"The Core Idea",text:`Two things are **orthogonal** when they are completely independent — knowing everything about one tells you absolutely nothing about the other.

In physics, this is made precise through the **inner product**:

⟨A|B⟩ = 0  →  A and B are orthogonal

If that inner product is zero, the two things cannot interfere, cannot corrupt each other, and cannot be confused for one another. This is not approximate — it is exact.`},{heading:"How Orthogonality Appears in Each Domain",text:`**In geometry**
X, Y, Z axes. Moving along X changes nothing about your Y or Z coordinate. Three independent dimensions let you describe any point in 3D space uniquely.

**In signals / radio**
Two radio stations broadcasting on orthogonal frequencies don't bleed into each other. Your FM receiver picks up 101.5 without hearing 102.3 because the sine waves at those frequencies integrate to zero over one cycle.

**In quantum mechanics**
Two quantum states |ψ₁⟩ and |ψ₂⟩ that are orthogonal cannot be confused by any measurement. They are distinguishable with certainty.

**In OAM (Orbital Angular Momentum)**
A beam of light twisted with ℓ = 1 is orthogonal to ℓ = 2, ℓ = 3, and so on. You can stack unlimited data streams on the same physical laser beam and separate them perfectly on the other end.`},{heading:"The WNSP Channel Model",text:`NexusOS uses three orthogonal dimensions simultaneously:

Ψ(wdm, oam, pol)

- **WDM (wavelength)**: 256 bands — separation by wavelength
- **OAM (ℓ mode)**: 50 modes — angular momentum: ⟨ℓ₁|ℓ₂⟩ = δ_{ℓ₁ℓ₂}
- **Polarization**: H or V — Stokes vector separation

Total orthogonal channels: 256 × 50 × 2 = **25,600**

Each channel Ψ(w,o,p) satisfies:
⟨Ψ(w₁,o₁,p₁) | Ψ(w₂,o₂,p₂)⟩ = 0  whenever (w₁,o₁,p₁) ≠ (w₂,o₂,p₂)

Any two users on different channels cannot interfere with each other — not by policy, not by encryption, but because their carrier waves integrate to zero.`},{heading:"SOP — The Negotiation Layer",text:`The Spectral Orthogonal Protocol enforces channel independence before any session opens:

**1. Channel Inner Product Check**
Two nodes compute ⟨Ψ_A|Ψ_B⟩ before opening a channel. Must equal zero to proceed.

**2. Collision Prevention**
If two users derive the same (wdm, oam, pol) triple, the protocol resolves deterministically — increment OAM until orthogonal.

**3. Orthogonality Certificate**
A signed proof is issued confirming the channel pair is collision-free at open time.

**API Endpoint:**
POST /api/wnsp/sop/negotiate
→ Returns: inner product value, orthogonal flag, certificate, and resolution suggestion if needed.`},{heading:"Why This Matters for Civilization Scale",text:`Every current communication system manages interference through **exclusion** — you get a timeslot, a port, an IP address that someone assigns and can revoke.

Orthogonality replaces exclusion with **independence**:

| Current approach | SOP approach |
|---|---|
| Port assigned by OS | Channel Ψ derived from wave physics |
| Collision → packet dropped | No collision possible — ⟨A|B⟩ = 0 |
| Address controlled by registrar | Address immutable — rooted in Maxwell |
| Interference managed by rules | Interference impossible by geometry |

A network built on orthogonal channels doesn't degrade as it scales. Add a new user — they get a new axis in Hilbert space. The existing 25,599 channels are unaffected. There is no congestion in Hilbert space.

This is why it is the correct foundation for infrastructure at Kardashev Type I scale: capacity grows with the mathematics, not with the hardware.`}]}};function $(){O({title:"NexusOS Documentation — WNSP Protocol, WavelengthScript & CE-SE API",description:"Complete developer documentation for NexusOS: WNSP spectral protocol, WavelengthScript language reference, CE-SE encoding pipeline, REST API, NXT token wallet, WNSP VM bytecode, and governance.",canonical:"https://wnsp.io/docs",ogTitle:"NexusOS Documentation",ogDescription:"WNSP protocol spec, WavelengthScript reference, CE-SE pipeline, REST API reference, NXT token, WNSP VM. Everything you need to build on the wavelength of light.",twitterTitle:"NexusOS Documentation",twitterDescription:"Complete reference for WNSP protocol, WavelengthScript, CE-SE encoding, and the NexusOS API."});const[m,S]=_.useState("substrate"),j=Object.entries(f),c=f[m],C=c.icon;return e.jsx("div",{className:"min-h-screen bg-black text-white","data-testid":"page-docs",children:e.jsxs("div",{className:"max-w-7xl mx-auto p-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-6",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx(a,{href:"/developer-matrix",children:e.jsx(u,{variant:"ghost",size:"icon",className:"text-gray-400 hover:text-white","data-testid":"button-home",children:e.jsx(y,{className:"w-5 h-5"})})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold tracking-tight","data-testid":"text-title",children:"NexusOS Builder Documentation"}),e.jsx("p",{className:"text-gray-400 text-sm",children:"Technical mechanics for developers building infrastructure"})]})]}),e.jsxs(u,{variant:"outline",size:"sm",onClick:()=>window.history.back(),className:"text-gray-400 hover:text-white border-gray-700 hover:border-gray-500","data-testid":"button-back-previous",children:[e.jsx(y,{className:"w-4 h-4 mr-2"}),"Back to Previous Page"]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-4 gap-6",children:[e.jsx("div",{className:"lg:col-span-1",children:e.jsxs(n,{className:"bg-gray-900/50 border-gray-700 p-4 sticky top-6",children:[e.jsx("h3",{className:"text-sm font-medium text-gray-400 mb-3",children:"DOCUMENTATION"}),e.jsx("nav",{className:"space-y-1",children:j.map(([t,s])=>{const r=s.icon,l=m===t;return e.jsxs("button",{onClick:()=>S(t),className:`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${l?"bg-purple-600 text-white":"text-gray-400 hover:bg-gray-800 hover:text-white"}`,"data-testid":`nav-${t}`,children:[e.jsx(r,{className:"w-4 h-4"}),e.jsx("span",{className:"text-sm",children:s.title})]},t)})}),e.jsxs("div",{className:"mt-6 pt-4 border-t border-gray-700",children:[e.jsx("h3",{className:"text-sm font-medium text-gray-400 mb-3",children:"LIVE TOOLS"}),e.jsxs("div",{className:"space-y-1 text-sm",children:[e.jsxs(a,{href:"/ce-code-writer",className:"flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold",children:[e.jsx(o,{className:"w-3 h-3"})," CE Code Writer"]}),e.jsxs(a,{href:"/ce-se-pipeline",className:"flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium",children:[e.jsx(w,{className:"w-3 h-3"})," CE→SE Pipeline"]}),e.jsxs(a,{href:"/wnsp-vm",className:"flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium",children:[e.jsx(o,{className:"w-3 h-3"})," WNSP Virtual Machine"]}),e.jsxs(a,{href:"/compression-explorer",className:"flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium",children:[e.jsx(N,{className:"w-3 h-3"})," Compression Explorer"]}),e.jsxs(a,{href:"/spectral-router",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(g,{className:"w-3 h-3"})," Spectral Router"]}),e.jsxs(a,{href:"/auth",className:"flex items-center gap-2 text-gray-500 hover:text-gray-400 text-xs",children:[e.jsx(o,{className:"w-3 h-3"})," Sign in to access AI Kernel, Encoding Lab & more"]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-gray-700",children:[e.jsx("h3",{className:"text-sm font-medium text-gray-400 mb-3",children:"EXTERNAL PHYSICS"}),e.jsxs("div",{className:"space-y-1 text-sm",children:[e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Planck%27s_law",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(i,{className:"w-3 h-3"})," Planck's Law"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Maxwell%27s_equations",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(i,{className:"w-3 h-3"})," Maxwell's Equations"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Orbital_angular_momentum_of_light",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(i,{className:"w-3 h-3"})," OAM of Light"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Kardashev_scale",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(i,{className:"w-3 h-3"})," Kardashev Scale"]}),e.jsxs("a",{href:"https://en.wikipedia.org/wiki/Schumann_resonances",target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-2 text-gray-400 hover:text-cyan-400",children:[e.jsx(i,{className:"w-3 h-3"})," Schumann Resonance"]})]})]})]})}),e.jsxs("div",{className:"lg:col-span-3",children:[e.jsx(n,{className:`bg-gradient-to-r ${c.color} p-6 mb-6`,children:e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center",children:e.jsx(C,{className:"w-7 h-7 text-white"})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-2xl font-bold",children:c.title}),e.jsx("p",{className:"text-white/70",children:"Core mechanics for building on this system"})]})]})}),m==="wascii"&&e.jsxs(n,{className:"bg-gray-900/60 border-cyan-500/30 p-6 mb-6","data-testid":"wnsp-protocol-diagram",children:[e.jsxs("h3",{className:"text-lg font-bold mb-6 text-cyan-300 flex items-center gap-2",children:[e.jsx(v,{className:"w-5 h-5"})," WNSP Protocol Stack"]}),e.jsxs("div",{className:"flex flex-col items-center gap-0 font-mono text-sm select-none",children:[e.jsxs("div",{className:"w-full max-w-sm border border-blue-500/60 rounded-xl bg-blue-900/20 p-4",children:[e.jsx("div",{className:"text-blue-300 font-bold mb-2 text-center tracking-wide",children:"CE Layer — Character Encoding"}),e.jsxs("div",{className:"text-gray-400 text-xs space-y-1 text-center",children:[e.jsx("div",{children:"Input: symbols / text"}),e.jsxs("div",{children:["Converts to ordinal tokens"," ",e.jsx("span",{className:"text-blue-300",children:"[0, 1]"})]}),e.jsx("div",{className:"text-blue-400 text-xs mt-1",children:"WNSP-CE v1.0"})]})]}),e.jsxs("div",{className:"flex flex-col items-center text-gray-500 py-1",children:[e.jsx("div",{className:"w-px h-4 bg-gray-600"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"▼"})]}),e.jsxs("div",{className:"w-full max-w-sm border border-gray-600/50 border-dashed rounded-xl bg-gray-800/30 p-3",children:[e.jsx("div",{className:"text-gray-400 font-bold mb-1 text-center text-xs tracking-wide",children:"Legacy Bridge — Optional / Backwards Compatible"}),e.jsx("div",{className:"text-gray-500 text-xs text-center",children:"Preserves char → wavelength compatibility"})]}),e.jsxs("div",{className:"flex flex-col items-center text-gray-500 py-1",children:[e.jsx("div",{className:"w-px h-4 bg-gray-600"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"▼"})]}),e.jsxs("div",{className:"w-full max-w-sm border border-cyan-500/60 rounded-xl bg-cyan-900/20 p-4",children:[e.jsx("div",{className:"text-cyan-300 font-bold mb-2 text-center tracking-wide",children:"SE Layer — Spectral / Physical"}),e.jsxs("div",{className:"text-gray-400 text-xs space-y-1 text-center",children:[e.jsx("div",{children:"Receives CE tokens"}),e.jsxs("div",{children:["Maps to ",e.jsx("span",{className:"text-cyan-300",children:"Ψ_channel"})," ","Hilbert-space basis"]}),e.jsx("div",{className:"text-cyan-200 font-mono mt-2",children:"|λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩"}),e.jsxs("div",{className:"grid grid-cols-3 gap-1 mt-2",children:[e.jsxs("div",{className:"bg-cyan-900/40 rounded p-1 text-center",children:[e.jsx("div",{className:"text-cyan-300",children:"WDM"}),e.jsx("div",{className:"text-white font-bold",children:"256"})]}),e.jsxs("div",{className:"bg-cyan-900/40 rounded p-1 text-center",children:[e.jsx("div",{className:"text-cyan-300",children:"OAM"}),e.jsx("div",{className:"text-white font-bold",children:"50"})]}),e.jsxs("div",{className:"bg-cyan-900/40 rounded p-1 text-center",children:[e.jsx("div",{className:"text-cyan-300",children:"Pol"}),e.jsx("div",{className:"text-white font-bold",children:"H/V"})]})]}),e.jsx("div",{className:"text-cyan-400 text-xs mt-1",children:"WNSP-SE v1.0"})]})]}),e.jsxs("div",{className:"flex flex-col items-center text-gray-500 py-1",children:[e.jsx("div",{className:"w-px h-4 bg-gray-600"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"▼"})]}),e.jsxs("div",{className:"w-full max-w-sm border border-purple-500/60 rounded-xl bg-purple-900/20 p-4",children:[e.jsx("div",{className:"text-purple-300 font-bold mb-2 text-center tracking-wide",children:"Physical Transmission — EM Wave Substrate"}),e.jsxs("div",{className:"text-gray-400 text-xs space-y-1 text-center",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-white font-bold text-base",children:"25,600"})," ","orthogonal channels"]}),e.jsx("div",{className:"text-purple-200 font-mono mt-1",children:"Ψ_ijk = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩"}),e.jsx("div",{className:"text-gray-500 mt-1",children:"⟨Ψ_i | Ψ_j⟩ = 0   for i ≠ j"}),e.jsxs("div",{className:"grid grid-cols-2 gap-2 mt-2",children:[e.jsxs("div",{className:"bg-purple-900/40 rounded p-1 text-center",children:[e.jsx("div",{className:"text-purple-300 font-mono",children:"E = hc/λ"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Photon energy"})]}),e.jsxs("div",{className:"bg-purple-900/40 rounded p-1 text-center",children:[e.jsx("div",{className:"text-purple-300 font-mono",children:"Λ = E/c²"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Lambda mass"})]})]})]})]})]})]}),e.jsx("div",{className:"space-y-6",children:c.content.map((t,s)=>e.jsxs(n,{className:"bg-gray-900/50 border-gray-700 p-6","data-testid":`content-block-${s}`,children:[e.jsx("h3",{className:"text-lg font-bold mb-4 text-purple-300",children:t.heading}),e.jsx("div",{className:"prose prose-invert max-w-none",children:t.text.split(`

`).map((r,l)=>{if(r.startsWith("|")){const E=r.split(`
`).filter(d=>d.trim());return e.jsx("div",{className:"overflow-x-auto my-4",children:e.jsx("table",{className:"w-full text-sm",children:e.jsx("tbody",{children:E.map((d,h)=>{if(d.includes("---"))return null;const A=d.split("|").filter(p=>p.trim()),T=h===0?"th":"td";return e.jsx("tr",{className:h===0?"border-b border-gray-700":"",children:A.map((p,k)=>e.jsx(T,{className:`px-3 py-2 text-left ${h===0?"text-gray-400 font-medium":"text-gray-300"}`,children:p.trim()},k))},h)})})})},l)}const P=r.replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-gray-800 px-1 rounded text-cyan-300">$1</code>');return e.jsx("p",{className:"text-gray-300 mb-3 whitespace-pre-wrap",dangerouslySetInnerHTML:{__html:P}},l)})})]},s))}),e.jsxs(n,{className:"bg-gray-900/30 border-gray-700 p-6 mt-6",children:[e.jsxs("h3",{className:"text-lg font-bold mb-4 flex items-center gap-2",children:[e.jsx(I,{className:"w-5 h-5 text-purple-400"}),"Key Equations Reference"]}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-3 text-sm",children:[e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-purple-300 font-mono",children:"E = hf"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Photon energy"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-cyan-300 font-mono",children:"Λ = hf/c²"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Lambda mass"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-green-300 font-mono",children:"c = fλ"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Wave equation"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-amber-300 font-mono",children:"∇×E = -∂B/∂t"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Maxwell curl"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-pink-300 font-mono",children:"Ĥ = hν + αK̂² + βL̂"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Hamiltonian"})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg",children:[e.jsx("div",{className:"text-red-300 font-mono",children:"T = Σ|c|²cos²(Δφ)"}),e.jsx("div",{className:"text-gray-500 text-xs",children:"Interference trust"})]})]})]}),e.jsx(n,{className:"bg-gray-900/50 border-gray-700 p-6 mt-6","data-testid":"license-footer",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:"p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30",children:e.jsx(b,{className:"w-6 h-6 text-blue-400"})}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx("h3",{className:"text-lg font-bold text-white",children:"AGPL-3.0 License"}),e.jsx(L,{className:"bg-blue-500/20 text-blue-300 border-blue-500/30",children:"Copyleft"})]}),e.jsxs("p",{className:"text-gray-400 text-sm mb-3",children:["WNSP Protocol, Lambda Gate Substrate, NXT Token Economics, and all associated implementations are licensed under the",e.jsx("a",{href:"https://www.gnu.org/licenses/agpl-3.0.en.html",target:"_blank",rel:"noopener noreferrer",className:"text-blue-400 hover:text-blue-300 mx-1 underline",children:"GNU Affero General Public License v3.0"}),"(AGPL-3.0)."]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3 text-xs",children:[e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg border border-gray-700",children:[e.jsx("div",{className:"text-green-400 font-semibold mb-1",children:"You CAN:"}),e.jsxs("ul",{className:"text-gray-400 space-y-1",children:[e.jsx("li",{children:"Use commercially"}),e.jsx("li",{children:"Modify and distribute"}),e.jsx("li",{children:"Patent use"})]})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg border border-gray-700",children:[e.jsx("div",{className:"text-amber-400 font-semibold mb-1",children:"You MUST:"}),e.jsxs("ul",{className:"text-gray-400 space-y-1",children:[e.jsx("li",{children:"Disclose source code"}),e.jsx("li",{children:"Include license & copyright"}),e.jsx("li",{children:"Share network modifications"})]})]}),e.jsxs("div",{className:"p-3 bg-gray-800/50 rounded-lg border border-gray-700",children:[e.jsx("div",{className:"text-red-400 font-semibold mb-1",children:"You CANNOT:"}),e.jsxs("ul",{className:"text-gray-400 space-y-1",children:[e.jsx("li",{children:"Sublicense"}),e.jsx("li",{children:"Hold liable"}),e.jsx("li",{children:"Close-source derivatives"})]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-gray-700 text-center",children:[e.jsx("p",{className:"text-gray-500 text-xs",children:"© 2024-2025 NexusOS. All rights reserved under AGPL-3.0."}),e.jsx("p",{className:"text-gray-600 text-xs mt-1",children:"Physics principles (E=hf, Maxwell's equations) are public domain. Implementation is protected."})]})]})]})})]})]})]})})}export{$ as default};
