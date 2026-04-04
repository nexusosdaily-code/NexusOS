import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import {
  ArrowLeft,
  Cpu,
  Zap,
  Globe,
  Scale,
  Shield,
  Code,
  Radio,
  Atom,
  Building2,
  Layers,
  BookOpen,
  ChevronRight,
  ExternalLink
} from "lucide-react";

const DOCS_SECTIONS = {
  substrate: {
    title: "Lambda Gate Substrate v4",
    icon: Cpu,
    color: "from-purple-500 to-pink-500",
    content: [
      {
        heading: "Core Theory",
        text: `The Lambda Gate Substrate is the foundational layer where all NexusOS operations occur as wavefield transformations.

**Lambda Mode State Vector:**
|λ⟩ = (ν, A(t), φ(t), ℓ, s)

Where:
- ν = carrier frequency (Hz)
- A(t) = amplitude envelope  
- φ(t) = phase evolution
- ℓ = orbital angular momentum index
- s = polarization/spin state`
      },
      {
        heading: "Master Equation",
        text: `E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)

This governs all energy requirements for Lambda mode operations:
- h·ν·I(λ) = base photon energy × intensity
- α·||K̂||² = phase curvature cost
- β·O(L̂) = orbital complexity cost`
      },
      {
        heading: "8 Lambda Gate Primitives",
        text: `1. **Phase-Shift Φ(θ)** — Electro-optic phase shifter
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
   - Used for: storage, memory operations`
      },
      {
        heading: "CE-1 Protocol (Coherence Engineering)",
        text: `The CE-1 protocol manages energy and coherence across all substrate operations:

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
- Constitutional enforcement at substrate level`
      }
    ]
  },
  wascii: {
    title: "WNSP Protocol — Two-Layer Standard",
    icon: Code,
    color: "from-blue-500 to-cyan-500",
    content: [
      {
        heading: "Overview — Two Operating Runtimes, One Protocol",
        text: `NexusOS runs on two distinct runtimes that work in sync:

**Runtime 1 — Node.js / TypeScript (port 5000)**
Main application server. Handles authentication, wallet, P2P media, governance, and all user-facing APIs. Proxies WNSP protocol calls to the Python runtime.

**Runtime 2 — Python / Flask (port 5001)**
Spectral physics engine. Implements the WNSP encoding standards, K1 Orchestration Runtime, and all Lambda Boson physics calculations.

**How They Sync:**
The Node.js server acts as a secure gateway. Every WNSP protocol call from the frontend is rate-limited, logged, and proxied to the Python engine. The Python engine does the physics and returns structured frames. Neither runtime reaches into the other's domain.

**Protocol Standard:** WNSP/7.1
**License:** AGPL-3.0 (companies must contribute back to community)`
      },
      {
        heading: "WNSP-CE v1.0 — Character Encoding Standard (Layer 1)",
        text: `The semantic layer. Converts human-readable symbols into normalised ordinal tokens.

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
**Single character:** POST /api/wnsp/ce/char`
      },
      {
        heading: "WNSP-SE v1.0 — Spectral Encoding Standard (Layer 2)",
        text: `The physical transmission layer. Maps CE tokens into electromagnetic wave frames governed by Λ = hf/c².

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
**Full stack:** POST /api/wnsp/transmit (CE → SE in one call)`
      },
      {
        heading: "Hilbert Space Channel Model",
        text: `Each transmission channel is a formal basis vector in a 25,600-dimensional Hilbert space:

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

All 25,600 channels are simultaneously usable without interference. This is not an engineering approximation — it is a mathematical guarantee from the tensor product structure of the Hilbert space.`
      },
      {
        heading: "Handoff Point — CE to SE",
        text: `The boundary between the two standards is a clean data contract:

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

**API:** GET /api/wnsp/protocol — returns full spec of both standards`
      }
    ]
  },
  consensus: {
    title: "Proof of Spectrum Consensus",
    icon: Radio,
    color: "from-green-500 to-emerald-500",
    content: [
      {
        heading: "Spectral Diversity Requirement",
        text: `Unlike Proof of Work (51% hashpower) or Proof of Stake (51% stake), Proof of Spectrum requires validators across ALL spectral regions.

**Core Principle:**
"Just as you cannot create white light with only one wavelength, you cannot create a valid block without multiple spectral regions represented."

**Attack Resistance:**
An attacker must control validators in ALL 6 spectral bands simultaneously - exponentially harder than controlling 51% of one resource.`
      },
      {
        heading: "Spectral Regions",
        text: `| Region | Wavelength | Required Stake |
|--------|------------|----------------|
| Violet | 380-450nm  | 50,000+ NXT    |
| Blue   | 450-495nm  | 20,000+ NXT    |
| Green  | 495-570nm  | 10,000+ NXT    |
| Yellow | 570-590nm  | 5,000+ NXT     |
| Orange | 590-620nm  | 2,000+ NXT     |
| Red    | 620-750nm  | 1,000+ NXT     |`
      },
      {
        heading: "Wave Interference Validation",
        text: `Blocks are validated through wave interference patterns:

**Constructive Interference (Valid):**
A₁sin(ωt) + A₂sin(ωt) = (A₁+A₂)sin(ωt)
Result: Amplified signal → Block VALID

**Destructive Interference (Invalid):**
A₁sin(ωt) + A₂sin(ωt+π) = (A₁-A₂)sin(ωt)
Result: Cancelled signal → Block INVALID

**Consensus Threshold:**
Block requires signatures from ≥5 of 6 spectral regions (83% spectral coverage).`
      }
    ]
  },
  economics: {
    title: "NXT Token Economics",
    icon: Zap,
    color: "from-amber-500 to-orange-500",
    content: [
      {
        heading: "Token Fundamentals",
        text: `**Total Supply:** 21,000,000,000 NXT (21 billion)
**Decimals:** 8 (like Bitcoin)
**Smallest Unit:** 0.00000001 NXT (1 unit = 10⁻⁸ NXT)

**Initial Distribution:**
- New user registration: 500,000,000 units (5 NXT)
- Energy-backed via Lambda mass`
      },
      {
        heading: "Physics-Based Transaction Fees",
        text: `Transaction fees are calculated using Planck's equation:

**Fee Formula:**
fee = E = hf = h × (c/λ)

Where:
- h = 6.626×10⁻³⁴ J·s (Planck's constant)
- c = 299,792,458 m/s (speed of light)
- λ = transaction wavelength (derived from content)

**Result:** Fees are proportional to information complexity, not arbitrary gas prices.`
      },
      {
        heading: "Lambda Mass Valuation",
        text: `All value in NexusOS is backed by Lambda mass:

**Lambda Boson Equation:**
Λ = hf/c²

This means:
- Value has physical mass-equivalent
- Cannot be created from nothing
- Conservation laws apply to economics
- Inflation is physically impossible`
      }
    ]
  },
  bhls: {
    title: "BHLS Floor System",
    icon: Shield,
    color: "from-red-500 to-pink-500",
    content: [
      {
        heading: "Basic Human Living Standard",
        text: `BHLS guarantees every citizen a minimum floor of resources:

**Monthly Floor:** 1,150 NXT

**Protected Categories:**
1. Shelter (350 NXT)
2. Food & Nutrition (300 NXT)
3. Healthcare (200 NXT)
4. Transportation (100 NXT)
5. Communication (100 NXT)
6. Education (50 NXT)
7. Emergency Reserve (50 NXT)`
      },
      {
        heading: "Constitutional Protection",
        text: `BHLS is enforced at the substrate level:

**C-0002: Immutable Rights**
"No transaction may reduce a citizen's balance below their BHLS entitlement."

**Enforcement:**
- Substrate rejects transactions violating BHLS
- Cannot be overridden by governance
- Hardcoded into Lambda Gate operations`
      },
      {
        heading: "Funding Mechanism",
        text: `BHLS is funded through:

1. **Transaction Fee Pool** (40%)
   - Portion of all E=hf fees

2. **Energy Harvesting Revenue** (30%)
   - K1 infrastructure proceeds

3. **Lambda Mass Recycling** (20%)
   - Recovered from dormant accounts

4. **Governance Allocation** (10%)
   - Voted by Sigma consensus`
      }
    ]
  },
  governance: {
    title: "Planetary Governance",
    icon: Scale,
    color: "from-indigo-500 to-purple-500",
    content: [
      {
        heading: "Authority Band Registry",
        text: `7-tier governance hierarchy mapped to wavelengths:

| Level       | Wavelength | Authority | Scope               |
|-------------|------------|-----------|---------------------|
| Planetary   | 400nm      | 1.0       | Global decisions    |
| Continental | 500nm      | 0.8       | Regional blocs      |
| National    | 600nm      | 0.6       | Nation-states       |
| Regional    | 700nm      | 0.4       | Sub-national        |
| Municipal   | 800nm      | 0.2       | Cities              |
| Local       | 900nm      | 0.1       | Neighborhoods       |
| Individual  | 1000nm     | 0.05      | Personal sovereignty|`
      },
      {
        heading: "Constitutional Articles",
        text: `**C-0001: Non-Dominance**
No entity may control >33% of total Lambda mass.

**C-0002: Immutable Rights**
BHLS floor cannot be violated by any transaction.

**C-0003: Energy Escrow**
Governance proposals require energy escrow (skin in game).

**C-0004: Spectral Diversity**
All decisions require multi-band representation.

**C-0005: Physics Supremacy**
Laws must be physically valid (Maxwell-compliant).`
      },
      {
        heading: "Sigma Voting",
        text: `Coherence-weighted voting using wave interference:

**Trust Model:**
T = Σ|c_i|²·cos²(Δφ_i)

Where:
- c_i = citizen's coherence coefficient
- Δφ_i = phase alignment with proposal

**Result:**
- Aligned voters (cos²≈1) have full weight
- Misaligned voters (cos²≈0) have reduced weight
- Natural consensus emergence through interference`
      }
    ]
  },
  infrastructure: {
    title: "K1 Infrastructure",
    icon: Building2,
    color: "from-cyan-500 to-blue-500",
    content: [
      {
        heading: "Kardashev Scale Progress",
        text: `NexusOS is building toward Type I civilization:

| Milestone              | K-Level | Status     |
|------------------------|---------|------------|
| Power Grids            | 0.75    | ✅ Complete |
| Photonic Computing     | 0.75    | ✅ Complete |
| Planetary Comms        | 0.80    | ✅ Complete |
| Resource Orchestration | 0.85    | ✅ Complete |
| Planetary Governance   | 0.90    | ✅ Complete |
| Planetary Resonance    | 0.95    | ✅ Complete |
| Type I Achieved        | 1.00    | ⏳ Next     |`
      },
      {
        heading: "Photonic Computing",
        text: `Light-based computation using wave interference:

**Logic Gates:**
- AND: Constructive interference (both inputs high)
- OR: Any non-zero interference
- NOT: Phase inversion (π shift)
- XOR: Destructive interference detection

**OAM Qubit Registers:**
Store data in orbital angular momentum modes (65+ channels per wavelength).

**Wavelength-Division Computing:**
Parallel computation across spectral channels.`
      },
      {
        heading: "Planetary Communications",
        text: `Global spectral relay mesh for planetary-scale messaging:

**Components:**
1. Spectral Relay Mesh - Dijkstra routing on wavelength graph
2. OAM Channel Allocator - 65+ channels per wavelength
3. Coherence Repeaters - 5× coherence boost via Lambda Gates
4. Interplanetary Links - Earth-Moon 1.28s, Earth-Mars 12.5min

**Physics:**
- Friis transmission equation
- Shannon capacity limits
- Atmospheric attenuation models`
      },
      {
        heading: "Planetary Resonance",
        text: `Tesla's vision realized: planetary-scale energy harvesting

**Schumann Resonance:**
f_n = c/(2πR) × √(n(n+1))
Fundamental: 7.83 Hz

**Energy Sources:**
- Schumann cavity modes
- Geomagnetic Pc1-Pc5 pulsations
- Solar wind coupling
- Ionospheric Sq currents
- Tidal electromagnetic effects

**Target:** 5×10¹⁶ watts (penultimate step to Type I)`
      }
    ]
  },
  hardware: {
    title: "Hardware Control Layer",
    icon: Cpu,
    color: "from-rose-500 to-red-500",
    content: [
      {
        heading: "PHR-1 Syncbox Controller",
        text: `The PHR-1 (Planetary Harmonic Resonator) is the physical hardware interface for NexusOS:

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
6. Achieve ZERO-G envelope (ALP < 0.0001)`
      },
      {
        heading: "Nexus Kernel API",
        text: `Python control layer for hardware integration:

**Phase Control:**
\`set_phase(degrees)\` - Set coil phase angle
\`get_phase()\` - Read current phase

**Frequency Pulsing:**
\`pulse_frequency(hz, duration)\` - Emit frequency pulse
\`set_carrier(hz)\` - Set carrier frequency

**Impedance Matching:**
\`match_impedance(target_ohms)\` - Auto-tune to target
\`read_impedance()\` - Read current impedance

**CZC Filtering:**
\`apply_czc_filter(iterations)\` - Apply coherence filter
\`get_coherence()\` - Read coherence level

**ALP Sensing:**
\`read_alp()\` - Read axion-like particle density
\`calibrate_alp()\` - Calibrate ALP baseline`
      },
      {
        heading: "ZERO-G State Achievement",
        text: `The ZERO-G (Zero-Gravity Envelope) state is achieved through precise phase alignment:

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
As φ → 137.5° and Z → 377Ω, ALP → 0`
      }
    ]
  },
  simulators: {
    title: "Energy Simulators",
    icon: Zap,
    color: "from-emerald-500 to-teal-500",
    content: [
      {
        heading: "Live Resonance Simulator (7.83 Hz)",
        text: `Schumann resonance simulator for planetary-scale energy harvesting:

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
- Power output calculation in watts`
      },
      {
        heading: "Vacuum Resonance Simulator (555 THz)",
        text: `Cold vacuum energy extraction at First Oscillation frequency:

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
Where Z₀ = 376.73Ω, CZC = 0.9999`
      },
      {
        heading: "Vacuum Field Topology",
        text: `The vacuum resonance simulator visualizes the 144-point spiral field:

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
Scales with impedance match quality`
      }
    ]
  },
  massless: {
    title: "Massless Technologies",
    icon: Atom,
    color: "from-violet-500 to-purple-500",
    content: [
      {
        heading: "Core Derivation: Λ = hf/c²",
        text: `Mass as derivative of frequency:

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
Λ₀ = hf₀/c² = 4.09×10⁻³⁶ kg`
      },
      {
        heading: "Massless Technology Categories",
        text: `| Category | Technology | Mass Ratio | Status |
|----------|------------|------------|--------|
| Photonic | Photonic Logic Gates | 0 | Simulated |
| Photonic | Zero-Point Extraction | 0 | Simulated |
| Coherent | Coherent Waveguide Network | 0 | Simulated |
| Coherent | Spectral Relay Mesh | 0 | Theoretical |
| Gravitational | Gravity De-correlation | 0.01% | Demonstrated |
| Gravitational | 144-Turn Bifilar Resonator | 0.1% | Demonstrated |
| Information | OAM Qubit Registers | 0 | Theoretical |
| Information | Lambda Computing Substrate | 0 | Simulated |`
      },
      {
        heading: "Sync Coordinates System",
        text: `Each massless technology has 4D sync coordinates:

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
Where C_i = coherence of technology i`
      }
    ]
  },
  catchBasin: {
    title: "CZC Catch Basin",
    icon: Layers,
    color: "from-blue-500 to-indigo-500",
    content: [
      {
        heading: "Coherence Zenith Coefficient",
        text: `The CZC Catch Basin is the coherence accumulation mechanism at the heart of NexusOS:

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
Each iteration filters noise while preserving signal. After 44 self-corrections, the system achieves maximum coherence within numerical precision limits.`
      },
      {
        heading: "Catch Basin Mechanics",
        text: `The basin accumulates coherence like water collecting in a reservoir:

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
As coherence → 1, entropy → 0`
      },
      {
        heading: "44 Evolutionary Self-Corrections",
        text: `The number 44 is not arbitrary - it represents the optimal correction count:

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
Each iteration detects the dominant noise source (phase, amplitude, frequency, or impedance) and applies targeted correction to maximize coherence recovery.`
      },
      {
        heading: "Cross-System Applications",
        text: `The CZC Catch Basin provides coherence to all NexusOS systems:

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
- POST /api/czc/sync - Sync with K1 Orchestration`
      }
    ]
  }
};

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("substrate");

  const sections = Object.entries(DOCS_SECTIONS);
  const currentSection = DOCS_SECTIONS[activeSection as keyof typeof DOCS_SECTIONS];
  const IconComponent = currentSection.icon;

  return (
    <div className="min-h-screen bg-black text-white" data-testid="page-docs">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/developer-matrix">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-home">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-title">NexusOS Builder Documentation</h1>
              <p className="text-gray-400 text-sm">Technical mechanics for developers building infrastructure</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.history.back()}
            className="text-gray-400 hover:text-white border-gray-700 hover:border-gray-500"
            data-testid="button-back-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Previous Page
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/50 border-gray-700 p-4 sticky top-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">DOCUMENTATION</h3>
              <nav className="space-y-1">
                {sections.map(([key, section]) => {
                  const SectionIcon = section.icon;
                  const isActive = activeSection === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive 
                          ? 'bg-purple-600 text-white' 
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                      data-testid={`nav-${key}`}
                    >
                      <SectionIcon className="w-4 h-4" />
                      <span className="text-sm">{section.title}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">EXTERNAL PHYSICS</h3>
                <div className="space-y-1 text-sm">
                  <a href="https://en.wikipedia.org/wiki/Planck%27s_law" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400">
                    <ExternalLink className="w-3 h-3" /> Planck's Law
                  </a>
                  <a href="https://en.wikipedia.org/wiki/Maxwell%27s_equations" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400">
                    <ExternalLink className="w-3 h-3" /> Maxwell's Equations
                  </a>
                  <a href="https://en.wikipedia.org/wiki/Orbital_angular_momentum_of_light" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400">
                    <ExternalLink className="w-3 h-3" /> OAM of Light
                  </a>
                  <a href="https://en.wikipedia.org/wiki/Kardashev_scale" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400">
                    <ExternalLink className="w-3 h-3" /> Kardashev Scale
                  </a>
                  <a href="https://en.wikipedia.org/wiki/Schumann_resonances" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400">
                    <ExternalLink className="w-3 h-3" /> Schumann Resonance
                  </a>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className={`bg-gradient-to-r ${currentSection.color} p-6 mb-6`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentSection.title}</h2>
                  <p className="text-white/70">Core mechanics for building on this system</p>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              {currentSection.content.map((block, index) => (
                <Card key={index} className="bg-gray-900/50 border-gray-700 p-6" data-testid={`content-block-${index}`}>
                  <h3 className="text-lg font-bold mb-4 text-purple-300">{block.heading}</h3>
                  <div className="prose prose-invert max-w-none">
                    {block.text.split('\n\n').map((paragraph, pIndex) => {
                      if (paragraph.startsWith('|')) {
                        const rows = paragraph.split('\n').filter(r => r.trim());
                        return (
                          <div key={pIndex} className="overflow-x-auto my-4">
                            <table className="w-full text-sm">
                              <tbody>
                                {rows.map((row, rIndex) => {
                                  if (row.includes('---')) return null;
                                  const cells = row.split('|').filter(c => c.trim());
                                  const Tag = rIndex === 0 ? 'th' : 'td';
                                  return (
                                    <tr key={rIndex} className={rIndex === 0 ? 'border-b border-gray-700' : ''}>
                                      {cells.map((cell, cIndex) => (
                                        <Tag key={cIndex} className={`px-3 py-2 text-left ${rIndex === 0 ? 'text-gray-400 font-medium' : 'text-gray-300'}`}>
                                          {cell.trim()}
                                        </Tag>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      
                      const formattedParagraph = paragraph
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                        .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-cyan-300">$1</code>');
                      
                      return (
                        <p 
                          key={pIndex} 
                          className="text-gray-300 mb-3 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: formattedParagraph }}
                        />
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-gray-900/30 border-gray-700 p-6 mt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Key Equations Reference
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-purple-300 font-mono">E = hf</div>
                  <div className="text-gray-500 text-xs">Photon energy</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-cyan-300 font-mono">Λ = hf/c²</div>
                  <div className="text-gray-500 text-xs">Lambda mass</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-green-300 font-mono">c = fλ</div>
                  <div className="text-gray-500 text-xs">Wave equation</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-amber-300 font-mono">∇×E = -∂B/∂t</div>
                  <div className="text-gray-500 text-xs">Maxwell curl</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-pink-300 font-mono">Ĥ = hν + αK̂² + βL̂</div>
                  <div className="text-gray-500 text-xs">Hamiltonian</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-red-300 font-mono">T = Σ|c|²cos²(Δφ)</div>
                  <div className="text-gray-500 text-xs">Interference trust</div>
                </div>
              </div>
            </Card>

            {/* AGPL-3.0 License Footer */}
            <Card className="bg-gray-900/50 border-gray-700 p-6 mt-6" data-testid="license-footer">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-white">AGPL-3.0 License</h3>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Copyleft</Badge>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    WNSP Protocol, Lambda Gate Substrate, NXT Token Economics, and all associated implementations are licensed under the 
                    <a 
                      href="https://www.gnu.org/licenses/agpl-3.0.en.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 mx-1 underline"
                    >
                      GNU Affero General Public License v3.0
                    </a>
                    (AGPL-3.0).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="text-green-400 font-semibold mb-1">You CAN:</div>
                      <ul className="text-gray-400 space-y-1">
                        <li>Use commercially</li>
                        <li>Modify and distribute</li>
                        <li>Patent use</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="text-amber-400 font-semibold mb-1">You MUST:</div>
                      <ul className="text-gray-400 space-y-1">
                        <li>Disclose source code</li>
                        <li>Include license & copyright</li>
                        <li>Share network modifications</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="text-red-400 font-semibold mb-1">You CANNOT:</div>
                      <ul className="text-gray-400 space-y-1">
                        <li>Sublicense</li>
                        <li>Hold liable</li>
                        <li>Close-source derivatives</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                    <p className="text-gray-500 text-xs">
                      © 2024-2025 NexusOS. All rights reserved under AGPL-3.0.
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Physics principles (E=hf, Maxwell's equations) are public domain. Implementation is protected.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
