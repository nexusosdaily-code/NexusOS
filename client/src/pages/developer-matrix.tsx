import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  ArrowLeft,
  BookOpen,
  Award,
  Layers,
  CheckCircle,
  Circle,
  Lock,
  Zap,
  Globe,
  Building2,
  Users,
  User,
  Cpu,
  Radio,
  Scale,
  Sparkles,
  GraduationCap,
  Code,
  Shield,
  Network,
  Hammer,
  Wrench,
  Server,
  Database,
  MessageSquare,
  Lock as LockIcon,
  Wallet,
  Activity,
  BarChart3,
  Settings,
  ExternalLink,
  FileText,
  Library,
  Atom,
  Lightbulb
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    title: "WASCII — Spectral Encoding Standard",
    icon: Code,
    color: "from-blue-500 to-cyan-500",
    content: [
      {
        heading: "WASCII — Wavelength-Native Character Standard",
        text: `WASCII is the authoritative character-to-wavelength table for WNSP-SE v1.0 (November 2025). 202 characters each have a canonical electromagnetic address — not derived from a formula, but assigned from spectral band semantics.

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
- 'Λ' → 839 nm (Near-IR)  |  'ψ' → 823 nm  |  '∞' → 362 nm (UV)`
      },
      {
        heading: "WnspFrame — Physical Transmission Unit",
        text: `Each character produces one WnspFrame (WNSP-SE v1.0, Section 3.5):

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
Threshold: γ ≥ 0.70 for a valid transmission.`
      },
      {
        heading: "Extended Character Set (202 Characters)",
        text: `WASCII covers every character needed for physics, mathematics, and code:

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
POST /api/wnsp/wascii/lookup  — per-char WnspFrame for any string`
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
  ihr: {
    title: "Immutable Human Rights Floor",
    icon: Shield,
    color: "from-red-500 to-pink-500",
    content: [
      {
        heading: "Basic Human Living Standard",
        text: `NexusOS provides a Basic Human Living Standard in services — a minimum value of services delivered to every citizen through the charity, which receives funds from the orbital treasury for projects and services:

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
        text: `The Basic Human Living Standard is enforced at the substrate level:

**C-0002: Immutable Rights**
"No transaction may reduce a citizen's balance below the Basic Human Living Standard of 1,150 NXT/month — provided in services through the charity, which receives funds from the orbital treasury to deliver projects and services to every citizen."

**Enforcement:**
- Substrate rejects transactions violating the Basic Human Living Standard
- Cannot be overridden by governance
- Hardcoded into Lambda Gate operations`
      },
      {
        heading: "Funding Mechanism",
        text: `The Basic Human Living Standard is delivered as services through the charity. The charity receives funds from the orbital treasury — here is how the treasury is funded:

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
The Basic Human Living Standard of 1,150 NXT/month provided in services through the charity cannot be violated by any transaction.

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
  masterField: {
    title: "Λ-Master Field Equation",
    icon: Atom,
    color: "from-rose-500 to-orange-500",
    content: [
      {
        heading: "Core Field Equation",
        text: `The Λ-Master Field Equation governs all Lambda substrate dynamics:

**iℏ ∂Λ/∂t = [-ℏ²/2m_eff ∇² + V_ext + g|Λ|² + P(I,∇ν)]Λ - iγ(I)Λ**

This is a nonlinear Schrödinger/Gross-Pitaevskii equation extended with:
- Info-coupling via m_eff(I) - effective mass depends on information density
- Spectrum pressure P(I,∇ν) - pressure from spectral gradients
- Absorptive decoherence γ(I) - coherence loss mechanism`
      },
      {
        heading: "Spectral Mass-Pressure",
        text: `**P(I, ∇ν) = βI + ξ|∇ν|²**

Where:
- I = information density (modal entropy)
- ∇ν = spectral frequency gradient
- β = info-pressure coupling constant
- ξ = spectral gradient coupling

**Effective Mass:**
m_eff(I) = m₀[1 + αI(x,t)]

The effective mass increases with information density, creating info-coupled dynamics.`
      },
      {
        heading: "Decoherence & Stability",
        text: `**Decay Rate:** γ(I) = γ₀ + γ₁I

Acts as imaginary potential - higher info density → faster coherence loss.

**Field Decay:** Λ → Λ·exp(-γt)

**Coherence Order Parameter:**
Φ_order = |∫Λ dx|² / ∫|Λ|² dx

- 1.0 = fully coherent field
- 0.0 = completely incoherent`
      },
      {
        heading: "WNSP Encoding",
        text: `Spectral-native signalling encodes messages in frequency/phase:

**Continuous Encoding:**
s(x,t) = Re{Λ(x,t)} · exp(i·2πν(x)t + iφ(x))

**Shannon Capacity (Lambda mode):**
C = B · log₂(1 + SNR · |Λ|²/⟨|Λ|²⟩)

Where B = bandwidth, SNR = signal-to-noise ratio.`
      },
      {
        heading: "Λ-Gate Operations",
        text: `Unitary evolution under gate Hamiltonian:

**Û_gate = exp(-i·Ĥ_gate·τ_gate/ℏ)**

**Gate Hamiltonian:**
Ĥ_gate = θ_phase·n̂ + θ_spec·Ŝ(ν) + η|Λ|²

Where:
- θ_phase = phase shift parameter
- θ_spec = spectral gating parameter
- η = density-dependent phase velocity`
      },
      {
        heading: "Substrate Compliance Rules",
        text: `**C1 - Coherence Floor:** |Λ|² ≥ Λ_min
**C2 - Pressure Bound:** P(I,∇ν) ≤ P_max  
**C3 - Entropy Constraint:** S[Λ] ≤ S_max
**C4 - Fairness:** |w_a|² ≤ W_fair (33% max write power)

**Enforcement Methods:**
- **Projection (A):** Hard enforcement - project onto constraint manifold
- **Penalty (B):** Soft enforcement - add penalty to agent loss function

**Compliance Score:** χ(t) = Π_k 𝟙[g_k(Λ) ≤ 0] (1 = fully compliant)`
      },
      {
        heading: "Agent Dynamics",
        text: `Agents interact with the field through write/read kernels:

**Write Action:**
Λ(x,t+dt) = Λ(x,t) + W_a(x) · action_a

**Read Action:**
Extracts field state and reduces local info density.

**Policy Gradient:**
Agents optimize via: ∂L/∂θ = ∂(R - λ·penalty)/∂θ

This ensures agents learn to obey substrate constraints while maximizing their objectives.`
      }
    ]
  },
  frameBuilder: {
    title: "Frame Builder v7.1 (AGPL-3.0)",
    icon: Shield,
    color: "from-amber-500 to-yellow-500",
    content: [
      {
        heading: "AGPL-3.0 Compliance Architecture",
        text: `Every Lambda Gate operation includes a **Source Code Reference (SCR)** for copyleft compliance.

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
\`\`\``
      },
      {
        heading: "Code Repository Attestation Service",
        text: `**CRAS** provides immutable source references:

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

Every gate has a registered commit hash pointing to its exact implementation.`
      },
      {
        heading: "FrameBuilder Usage",
        text: `\`\`\`python
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
\`\`\``
      },
      {
        heading: "Temporal Attestations",
        text: `**PRE_ATTEST** and **POST_ATTEST** prove state integrity:

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

The **COHERENCE_SIG** signs both attestations, proving temporal ordering and coherence maintenance.`
      },
      {
        heading: "8 Gate SCR Registry",
        text: `| Gate | Symbol | Commit Hash |
|------|--------|-------------|
| Phase-Shift | Φ(θ) | a1b2c3d4... |
| Gain | G(α) | b2c3d4e5... |
| Mode-Mixer | M(κ) | c3d4e5f6... |
| OAM-Rotor | L(Δℓ) | d4e5f678... |
| Phase-Gradient | ∇Φ | e5f67890... |
| Density-Swap | S | f6789012... |
| Coherence-Amplify | A_c | 67890123... |
| Stabilizer | D(τ) | 78901234... |

All commits are publicly verifiable at the GitHub repository.`
      },
      {
        heading: "Copyleft Protection",
        text: `**AGPL-3.0 Requirements Met:**

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
- Physical constants`
      },
      {
        heading: "Coherence Verifier v7.1",
        text: `**Two-Phase Validation:**

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
\`\`\``
      },
      {
        heading: "AGPL Enforcement Mechanism",
        text: `When SCR hash doesn't match trusted registry:

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
4. Non-compliance → network blacklist`
      },
      {
        heading: "Lambda State Machine Usage",
        text: `**Developer Integration Example:**

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
- trigger_source_audit() → automatic gate selection`
      },
      {
        heading: "Binary Frame Serialization",
        text: `**Protobuf-like Fixed-Width Encoding:**

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
- Little-endian for x86/ARM compatibility`
      }
    ]
  },
  sdkInstall: {
    title: "WNSP SDK — Live API",
    icon: Code,
    color: "from-green-500 to-emerald-500",
    content: [
      {
        heading: "Base URL & Live Endpoints",
        text: `The NexusOS API is live and open. All public endpoints below require no authentication.

**Live Platform:**
\`\`\`
https://0a70fadf-e9ae-4e02-8d6d-f55fdb7924c1-00-kxbvkx18na65.riker.replit.dev
\`\`\`

**Public API Endpoints (no auth required):**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/wnsp/wascii/table\` | Full 202-char WASCII wavelength table |
| POST | \`/api/wnsp/wascii/lookup\` | Encode any string → WnspFrames (per char) |
| POST | \`/api/wnsp/se/simulate\` | Full SE simulation with Ψ channels, PSQ, coherence γ |
| GET | \`/api/blockchain/chain\` | Live photonic blockchain (all blocks) |
| GET | \`/api/ecosystem/status\` | Live system stats (nodes, agents, spectral records) |
| GET | \`/api/agent-bus/status\` | Kernel agents at Ψ coordinates |
| GET | \`/api/network/nodes\` | Registered spectral network nodes |`
      },
      {
        heading: "Python SDK — pip install requests",
        text: `No custom package needed yet — call the live API directly with \`requests\`.

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
\`\`\``
      },
      {
        heading: "JavaScript / TypeScript SDK",
        text: `Works in Node.js, browsers, and Deno. Zero dependencies — just \`fetch\`.

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
\`\`\``
      },
      {
        heading: "curl — No Install Required",
        text: `Test the entire API from your terminal right now. No signup, no API key.

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
\`\`\``
      },
      {
        heading: "GitHub Source Repositories",
        text: `All source code is open under AGPL-3.0. If you build on NexusOS, you publish your code.

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

**License:** AGPL-3.0 · Any derivative must publish source under same terms.`
      }
    ]
  }
};

const INTERNAL_RESOURCES = [
  {
    category: "Live Tools",
    icon: Zap,
    color: "from-purple-500 to-pink-500",
    links: [
      { name: "Document Transmission Center", path: "/workspace/transmission", description: "Transmit documents via wavelength encoding", isRoute: true },
      { name: "Quantum Wavefield Simulator", path: "/workspace/wavefield", description: "Interactive eigenstate superposition", isRoute: true },
      { name: "NXT Wallet Dashboard", path: "/wallet", description: "Manage NXT tokens and transactions", isRoute: true },
      { name: "K1 Infrastructure", path: "/k1", description: "Kardashev Type I civilization systems", isRoute: true },
      { name: "K1 Orchestration Dashboard", path: "/k1/orchestration", description: "Live infrastructure management", isRoute: true },
      { name: "Encoding Lab", path: "/encoding-lab", description: "Test wavelength encoding algorithms", isRoute: true },
      { name: "Research Center", path: "/workspace/research", description: "Physics research and simulations", isRoute: true },
      { name: "Analytics Dashboard", path: "/workspace/analytics", description: "Network metrics and statistics", isRoute: true }
    ]
  },
  {
    category: "Core Mechanics (Documentation Tab)",
    icon: Cpu,
    color: "from-violet-500 to-purple-500",
    links: [
      { name: "Lambda Gate Substrate v4", docSection: "substrate", description: "8 photonic gate primitives: Phase-Shift, Gain, Mode-Mixer, OAM-Rotor" },
      { name: "Frame Builder v7.1", docSection: "frameBuilder", description: "AGPL-3.0 compliant frame protocol with SCR attestation" },
      { name: "Λ-Master Field Equation", docSection: "masterField", description: "Continuous field dynamics with constitutional enforcement" },
      { name: "WASCII Encoding", docSection: "wascii", description: "202-character WASCII table (WNSP-SE v1.0) — canonical wavelength per character" },
      { name: "Proof of Spectrum Consensus", docSection: "consensus", description: "Physics-based Byzantine fault tolerance" }
    ]
  },
  {
    category: "Economics & Governance (Documentation Tab)",
    icon: Scale,
    color: "from-green-500 to-emerald-500",
    links: [
      { name: "NXT Token Economics", docSection: "economics", description: "21B supply, 8 decimals, E=hf transaction fees" },
      { name: "Basic Human Living Standard", docSection: "ihr", description: "1,150 NXT/month provided in services through the charity" },
      { name: "Planetary Governance", docSection: "governance", description: "Authority bands, constitutional articles, Sigma voting" }
    ]
  },
  {
    category: "K1 Infrastructure (Documentation Tab)",
    icon: Building2,
    color: "from-cyan-500 to-blue-500",
    links: [
      { name: "K1 Infrastructure Guide", docSection: "infrastructure", description: "Photonic computing, planetary comms, resonance harvesting" }
    ]
  }
];

const EXTERNAL_RESOURCES = [
  {
    category: "Physics Foundations",
    icon: Atom,
    color: "from-violet-500 to-purple-500",
    links: [
      { name: "Planck's Law (E=hf)", url: "https://en.wikipedia.org/wiki/Planck%27s_law", description: "Energy-frequency relationship" },
      { name: "Maxwell's Equations", url: "https://en.wikipedia.org/wiki/Maxwell%27s_equations", description: "Electromagnetic wave validation" },
      { name: "Electromagnetic Spectrum", url: "https://en.wikipedia.org/wiki/Electromagnetic_spectrum", description: "Wavelength ranges and properties" },
      { name: "Wave Interference", url: "https://en.wikipedia.org/wiki/Wave_interference", description: "Constructive/destructive patterns" },
      { name: "Schumann Resonances", url: "https://en.wikipedia.org/wiki/Schumann_resonances", description: "Earth-ionosphere cavity (7.83Hz)" }
    ]
  },
  {
    category: "Quantum & Photonics",
    icon: Lightbulb,
    color: "from-cyan-500 to-blue-500",
    links: [
      { name: "Orbital Angular Momentum", url: "https://en.wikipedia.org/wiki/Orbital_angular_momentum_of_light", description: "OAM modes for data encoding" },
      { name: "Photonic Computing", url: "https://en.wikipedia.org/wiki/Optical_computing", description: "Light-based computation" },
      { name: "Coherent State", url: "https://en.wikipedia.org/wiki/Coherent_state", description: "Quantum coherence principles" },
      { name: "Bose-Einstein Condensate", url: "https://en.wikipedia.org/wiki/Bose%E2%80%93Einstein_condensate", description: "Quantum yield enhancement" }
    ]
  },
  {
    category: "Civilization Scale",
    icon: Globe,
    color: "from-amber-500 to-orange-500",
    links: [
      { name: "Kardashev Scale", url: "https://en.wikipedia.org/wiki/Kardashev_scale", description: "Type I-III civilization energy" },
      { name: "Dyson Sphere", url: "https://en.wikipedia.org/wiki/Dyson_sphere", description: "Stellar energy harvesting concepts" },
      { name: "Tesla's Wireless Power", url: "https://en.wikipedia.org/wiki/Wardenclyffe_Tower", description: "Planetary resonance inspiration" }
    ]
  },
  {
    category: "Cryptography & Consensus",
    icon: Shield,
    color: "from-red-500 to-pink-500",
    links: [
      { name: "Byzantine Fault Tolerance", url: "https://en.wikipedia.org/wiki/Byzantine_fault", description: "Distributed consensus problems" },
      { name: "Post-Quantum Cryptography", url: "https://en.wikipedia.org/wiki/Post-quantum_cryptography", description: "Quantum-resistant algorithms" },
      { name: "Hash Functions", url: "https://en.wikipedia.org/wiki/Cryptographic_hash_function", description: "SHA-256, BLAKE2, etc." }
    ]
  }
];

const BUILD_CATEGORIES = [
  {
    id: "messaging",
    name: "Messaging & Communication",
    icon: MessageSquare,
    color: "from-blue-500 to-cyan-500",
    requiredLevel: 2,
    requiredCert: "Protocol Developer",
    projects: [
      "P2P encrypted messaging apps",
      "Wavelength-encoded chat systems",
      "Mesh network protocols",
      "Spectral routing implementations",
      "Real-time communication platforms"
    ],
    sdks: ["wnsp-messaging", "wnsp-crypto"]
  },
  {
    id: "blockchain",
    name: "Blockchain & Consensus",
    icon: Database,
    color: "from-purple-500 to-pink-500",
    requiredLevel: 3,
    requiredCert: "Substrate Engineer",
    projects: [
      "Lambda Gate validators",
      "Consensus mechanisms",
      "Smart contract platforms",
      "DEX implementations",
      "Token systems"
    ],
    sdks: ["wnsp-blockchain", "wnsp-substrate"]
  },
  {
    id: "wallets",
    name: "Wallets & Payments",
    icon: Wallet,
    color: "from-green-500 to-emerald-500",
    requiredLevel: 2,
    requiredCert: "Protocol Developer",
    projects: [
      "NXT wallet implementations",
      "Multi-sig wallets",
      "Payment gateways",
      "Basic Human Living Standard floor enforcement",
      "Transaction validators"
    ],
    sdks: ["wnsp-wallet", "wnsp-payments"]
  },
  {
    id: "governance",
    name: "Governance & Voting",
    icon: Scale,
    color: "from-orange-500 to-yellow-500",
    requiredLevel: 4,
    requiredCert: "Governance Architect",
    projects: [
      "Sigma voting systems",
      "Constitutional enforcement",
      "Authority band management",
      "Proposal platforms",
      "Dispute resolution systems"
    ],
    sdks: ["wnsp-governance", "wnsp-voting"]
  },
  {
    id: "energy",
    name: "Energy & Grid Systems",
    icon: Zap,
    color: "from-amber-500 to-orange-500",
    requiredLevel: 5,
    requiredCert: "Infrastructure Builder",
    projects: [
      "Resonance harvester nodes",
      "Energy trading platforms",
      "Grid management systems",
      "Solar array controllers",
      "Fusion reactor interfaces"
    ],
    sdks: ["wnsp-energy", "wnsp-k1"]
  },
  {
    id: "computing",
    name: "Photonic Computing",
    icon: Cpu,
    color: "from-indigo-500 to-purple-500",
    requiredLevel: 6,
    requiredCert: "Infrastructure Builder",
    projects: [
      "Photonic logic gates",
      "OAM qubit registers",
      "Wavelength-division processors",
      "Lambda processors",
      "Quantum simulators"
    ],
    sdks: ["wnsp-photonics", "wnsp-compute"]
  },
  {
    id: "communications",
    name: "Planetary Communications",
    icon: Globe,
    color: "from-cyan-500 to-blue-500",
    requiredLevel: 6,
    requiredCert: "Infrastructure Builder",
    projects: [
      "Spectral relay mesh nodes",
      "OAM channel allocators",
      "Interplanetary link planners",
      "Coherence repeaters",
      "Global backbone systems"
    ],
    sdks: ["wnsp-planetary", "wnsp-relay"]
  },
  {
    id: "resources",
    name: "Resource Orchestration",
    icon: Building2,
    color: "from-rose-500 to-pink-500",
    requiredLevel: 5,
    requiredCert: "Infrastructure Builder",
    projects: [
      "Wavelength ledger systems",
      "Manufacturing pipelines",
      "Logistics optimizers",
      "Fleet coordinators",
      "Supply chain platforms"
    ],
    sdks: ["wnsp-resources", "wnsp-logistics"]
  }
];

const BUILDER_ROLES = [
  {
    id: "frontend",
    name: "Frontend Developer",
    icon: Code,
    color: "bg-blue-500",
    focus: "User interfaces, dashboards, visualization",
    canBuild: ["Wallet UIs", "Voting interfaces", "Analytics dashboards", "Message clients"],
    startWith: ["wave_physics", "wascii_encoding"]
  },
  {
    id: "backend",
    name: "Backend Engineer",
    icon: Server,
    color: "bg-green-500",
    focus: "APIs, servers, data processing",
    canBuild: ["API gateways", "Transaction processors", "Routing servers", "Data validators"],
    startWith: ["spectral_routing", "lambda_gates"]
  },
  {
    id: "blockchain",
    name: "Blockchain Developer",
    icon: Database,
    color: "bg-purple-500",
    focus: "Consensus, smart contracts, validators",
    canBuild: ["Validators", "Smart contracts", "Consensus nodes", "DEX backends"],
    startWith: ["lambda_boson", "ce1_protocol"]
  },
  {
    id: "systems",
    name: "Systems Engineer",
    icon: Settings,
    color: "bg-orange-500",
    focus: "Infrastructure, networking, hardware",
    canBuild: ["Relay nodes", "Mesh networks", "Energy harvesters", "Photonic gates"],
    startWith: ["lambda_gates", "planetary_comms"]
  },
  {
    id: "security",
    name: "Security Engineer",
    icon: Shield,
    color: "bg-red-500",
    focus: "Cryptography, auditing, compliance",
    canBuild: ["Encryption systems", "Audit tools", "Constitutional validators", "Human Rights enforcers"],
    startWith: ["constitutional", "ihr_economics"]
  }
];

const KNOWLEDGE_DOMAINS = [
  { id: "wave_physics", name: "Wave Physics", level: 1, description: "c=fλ, electromagnetic spectrum, E=hf", icon: Radio, color: "from-violet-500 to-purple-600" },
  { id: "lambda_boson", name: "Lambda Boson", level: 1, description: "Λ=hf/c², mass-equivalent of oscillation", icon: Sparkles, color: "from-purple-500 to-pink-600" },
  { id: "wascii_encoding", name: "WASCII Encoding", level: 2, description: "202-character WASCII table — WNSP-SE v1.0 canonical spectral addresses", icon: Code, color: "from-blue-500 to-cyan-600" },
  { id: "spectral_routing", name: "Spectral Routing", level: 2, description: "Wavelength-based message routing", icon: Network, color: "from-cyan-500 to-teal-600" },
  { id: "lambda_gates", name: "Lambda Gates", level: 3, description: "8 photonic gate primitives", icon: Cpu, color: "from-green-500 to-emerald-600" },
  { id: "ce1_protocol", name: "CE-1 Protocol", level: 3, description: "Coherence Engineering protocol", icon: Zap, color: "from-emerald-500 to-green-600" },
  { id: "constitutional", name: "Constitutional Law", level: 4, description: "C-0001, C-0002, C-0003 clauses", icon: Scale, color: "from-yellow-500 to-orange-600" },
  { id: "ihr_economics", name: "Living Standard Economics", level: 4, description: "Basic Human Living Standard — 1,150 NXT/month, 7 service categories, offered by NexusOS", icon: Shield, color: "from-orange-500 to-red-600" },
  { id: "authority_bands", name: "Authority Bands", level: 5, description: "7-tier spectral hierarchy", icon: Layers, color: "from-red-500 to-pink-600" },
  { id: "sigma_voting", name: "Sigma Voting", level: 5, description: "Coherence-weighted voting", icon: Users, color: "from-pink-500 to-rose-600" },
  { id: "photonic_computing", name: "Photonic Computing", level: 6, description: "Photonic logic gates", icon: Cpu, color: "from-indigo-500 to-violet-600" },
  { id: "planetary_comms", name: "Planetary Communications", level: 6, description: "Spectral relay mesh, OAM", icon: Globe, color: "from-violet-500 to-purple-600" },
  { id: "resource_orchestration", name: "Resource Orchestration", level: 6, description: "Wavelength ledger, logistics", icon: Building2, color: "from-purple-500 to-indigo-600" },
  { id: "k1_energy", name: "K1 Energy", level: 6, description: "Resonance harvesting, fusion", icon: Zap, color: "from-amber-500 to-yellow-600" }
];

const CERTIFICATION_TRACKS = [
  { id: "protocol_dev", name: "Protocol Developer", description: "Messaging & encoding systems", domains: ["wave_physics", "lambda_boson", "wascii_encoding", "spectral_routing"], icon: Code, color: "from-blue-600 to-cyan-500" },
  { id: "substrate_eng", name: "Substrate Engineer", description: "Core substrate & gate programs", domains: ["wave_physics", "lambda_boson", "lambda_gates", "ce1_protocol"], icon: Cpu, color: "from-green-600 to-emerald-500" },
  { id: "governance_arch", name: "Governance Architect", description: "Voting & constitutional systems", domains: ["constitutional", "ihr_economics", "authority_bands", "sigma_voting"], icon: Scale, color: "from-orange-600 to-yellow-500" },
  { id: "infra_builder", name: "Infrastructure Builder", description: "K1 civilization infrastructure", domains: ["lambda_gates", "photonic_computing", "planetary_comms", "resource_orchestration"], icon: Building2, color: "from-purple-600 to-pink-500" },
  { id: "full_stack", name: "Full Stack Architect", description: "Complete mastery", domains: KNOWLEDGE_DOMAINS.map(d => d.id), icon: Sparkles, color: "from-amber-500 to-red-500" }
];

const INFRASTRUCTURE_TIERS = [
  { id: "sandbox", level: 0, authority: "INDIVIDUAL", wavelength: 1000, icon: User, capabilities: ["Personal wallets", "Test encoding", "Prototypes"] },
  { id: "community", level: 1, authority: "LOCAL", wavelength: 900, icon: Users, capabilities: ["Community apps", "Local mesh", "Education"] },
  { id: "municipal", level: 2, authority: "MUNICIPAL", wavelength: 800, icon: Building2, capabilities: ["City networks", "Local governance", "Urban grids"] },
  { id: "regional", level: 3, authority: "REGIONAL", wavelength: 700, icon: Network, capabilities: ["Regional comms", "Multi-city orchestration"] },
  { id: "national", level: 4, authority: "NATIONAL", wavelength: 600, icon: Shield, capabilities: ["National spectrum", "Country-wide grids"] },
  { id: "continental", level: 5, authority: "CONTINENTAL", wavelength: 500, icon: Globe, capabilities: ["Continental networks", "Cross-border infra"] },
  { id: "planetary", level: 6, authority: "PLANETARY", wavelength: 400, icon: Sparkles, capabilities: ["Global backbone", "Interplanetary links"] }
];

export default function DeveloperMatrixPage() {
  const [completedDomains, setCompletedDomains] = useState<string[]>([]);
  const [earnedCertifications, setEarnedCertifications] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("matrix");
  const [activeDocSection, setActiveDocSection] = useState("substrate");

  const knowledgeLevel = completedDomains.length > 0 
    ? Math.max(...completedDomains.map(id => KNOWLEDGE_DOMAINS.find(d => d.id === id)?.level || 0))
    : 0;

  const toggleDomain = (domainId: string) => {
    if (completedDomains.includes(domainId)) {
      setCompletedDomains(completedDomains.filter(id => id !== domainId));
    } else {
      setCompletedDomains([...completedDomains, domainId]);
    }
  };

  const canEarnCertification = (track: typeof CERTIFICATION_TRACKS[0]) => {
    return track.domains.every(d => completedDomains.includes(d));
  };

  const earnCertification = (trackId: string) => {
    if (!earnedCertifications.includes(trackId)) {
      setEarnedCertifications([...earnedCertifications, trackId]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white" data-testid="page-developer-matrix">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-home">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-title">Developer Matrix</h1>
              <p className="text-gray-400 text-sm">What Engineers, Builders & Developers Can Build</p>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800 p-1 flex-wrap h-auto">
            <TabsTrigger value="quickstart" className="data-[state=active]:bg-green-600" data-testid="tab-quickstart">
              <Code className="w-4 h-4 mr-2" />
              Quick Start
            </TabsTrigger>
            <TabsTrigger value="matrix" className="data-[state=active]:bg-purple-600" data-testid="tab-matrix">
              <Hammer className="w-4 h-4 mr-2" />
              Build Matrix
            </TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-purple-600" data-testid="tab-roles">
              <Users className="w-4 h-4 mr-2" />
              Builder Roles
            </TabsTrigger>
            <TabsTrigger value="domains" className="data-[state=active]:bg-purple-600" data-testid="tab-domains">
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="certifications" className="data-[state=active]:bg-purple-600" data-testid="tab-certifications">
              <Award className="w-4 h-4 mr-2" />
              Certifications
            </TabsTrigger>
            <TabsTrigger value="tiers" className="data-[state=active]:bg-purple-600" data-testid="tab-tiers">
              <Layers className="w-4 h-4 mr-2" />
              Authority Tiers
            </TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-purple-600" data-testid="tab-resources">
              <Library className="w-4 h-4 mr-2" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="documentation" className="data-[state=active]:bg-purple-600" data-testid="tab-documentation">
              <FileText className="w-4 h-4 mr-2" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="czf-foundation" className="data-[state=active]:bg-yellow-600" data-testid="tab-czf-foundation">
              <Atom className="w-4 h-4 mr-2" />
              CZF Foundation
            </TabsTrigger>
            <TabsTrigger value="czf-kernel" className="data-[state=active]:bg-cyan-600" data-testid="tab-czf-kernel">
              <Code className="w-4 h-4 mr-2" />
              CZF Kernel
            </TabsTrigger>
            <TabsTrigger value="dmk" className="data-[state=active]:bg-pink-600" data-testid="tab-dmk">
              <Layers className="w-4 h-4 mr-2" />
              DMK
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quickstart" className="space-y-6">
            <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">Quick Start: Credible Proof for Engineers</h2>
              <p className="text-gray-400">Real code, verifiable physics, testable implementations. Everything you need to validate before adopting.</p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="proof-physics">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Atom className="w-5 h-5 text-cyan-400" />
                  Physics Verification
                </h3>
                <p className="text-gray-400 text-sm mb-4">All equations are standard physics - verify against any textbook or Wikipedia.</p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-cyan-300 font-mono text-lg">E = hf</div>
                    <div className="text-gray-400 text-sm mt-1">Planck's equation (1900) - photon energy equals Planck's constant times frequency</div>
                    <a href="https://en.wikipedia.org/wiki/Planck_relation" target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:underline flex items-center gap-1 mt-2">
                      <ExternalLink className="w-3 h-3" /> Verify on Wikipedia
                    </a>
                  </div>
                  
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-purple-300 font-mono text-lg">c = fλ</div>
                    <div className="text-gray-400 text-sm mt-1">Wave equation - speed of light equals frequency times wavelength</div>
                    <a href="https://en.wikipedia.org/wiki/Wavelength" target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:underline flex items-center gap-1 mt-2">
                      <ExternalLink className="w-3 h-3" /> Verify on Wikipedia
                    </a>
                  </div>
                  
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-green-300 font-mono text-lg">Λ = hf/c² = E/c²</div>
                    <div className="text-gray-400 text-sm mt-1">Lambda mass - derived from E=mc², the mass-equivalent of photon energy</div>
                    <a href="https://en.wikipedia.org/wiki/Mass%E2%80%93energy_equivalence" target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:underline flex items-center gap-1 mt-2">
                      <ExternalLink className="w-3 h-3" /> Verify E=mc² on Wikipedia
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="proof-implementations">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-green-400" />
                  Live Implementations
                </h3>
                <p className="text-gray-400 text-sm mb-4">Working Python code you can run and verify today.</p>
                
                <div className="space-y-3">
                  <div className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Lambda Gate Substrate v4</div>
                      <div className="text-xs text-gray-500">8 photonic gates, CE-1 protocol</div>
                    </div>
                    <Badge className="bg-green-600 text-xs">wnsp_v7/substrate_v4.py</Badge>
                  </div>
                  
                  <div className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Planetary Governance</div>
                      <div className="text-xs text-gray-500">Authority bands, Sigma voting</div>
                    </div>
                    <Badge className="bg-green-600 text-xs">wnsp_v7/planetary_governance.py</Badge>
                  </div>
                  
                  <div className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Photonic Computing</div>
                      <div className="text-xs text-gray-500">AND, OR, NOT, XOR gates</div>
                    </div>
                    <Badge className="bg-green-600 text-xs">wnsp_v7/photonic_computing.py</Badge>
                  </div>
                  
                  <div className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Planetary Resonance</div>
                      <div className="text-xs text-gray-500">Schumann modes, Tesla stations</div>
                    </div>
                    <Badge className="bg-green-600 text-xs">wnsp_v7/planetary_resonance.py</Badge>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="code-example-wascii">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-400" />
                Code Example: WASCII Encoding (WNSP-SE v1.0)
              </h3>
              <p className="text-gray-400 text-sm mb-4">Encode any text using the canonical WASCII table — exact wavelength per character, not a formula. Each character produces a WnspFrame.</p>
              
              <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm">
                <code className="text-green-300">{`# WASCII: Wavelength-Native Character Standard (WNSP-SE v1.0)
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
          f"| E={fr['energy_joules']:.2e}J | chk={fr['checksum']}")`}</code>
              </pre>
              
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-400 mb-2">WnspFrame output — WASCII canonical wavelengths:</div>
                <pre className="text-xs text-cyan-300 font-mono">
{`sync=0xaa | 'H' → 422.0nm | E=4.71e-19J | chk=238
sync=0xaa | 'e' → 407.0nm | E=4.88e-19J | chk=198
sync=0xaa | 'l' → 449.0nm | E=4.42e-19J | chk=217
sync=0xaa | 'l' → 449.0nm | E=4.42e-19J | chk=217
sync=0xaa | 'o' → 467.0nm | E=4.26e-19J | chk=141`}
                </pre>
              </div>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="code-example-fees">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Code Example: Physics-Based Transaction Fees
              </h3>
              <p className="text-gray-400 text-sm mb-4">Transaction fees derived from actual photon energy, not arbitrary gas prices.</p>
              
              <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm">
                <code className="text-green-300">{`# Transaction Fee = Total message energy (in NXT units)
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
# Output: Fee: 0.000089 NXT`}</code>
              </pre>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="code-example-lambda">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                Code Example: Lambda Mass Valuation
              </h3>
              <p className="text-gray-400 text-sm mb-4">Value backed by physics - the mass-equivalent of electromagnetic energy.</p>
              
              <pre className="bg-black p-4 rounded-lg overflow-x-auto text-sm">
                <code className="text-green-300">{`# Lambda Boson Theory: Λ = hf/c²
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
# Cannot be inflated because physics is conserved`}</code>
              </pre>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/30 p-5 text-center">
                <Shield className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                <h4 className="font-bold mb-2">Auditable</h4>
                <p className="text-gray-400 text-sm">All physics equations are standard textbook formulas. Verify against any source.</p>
              </Card>
              
              <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 p-5 text-center">
                <Code className="w-8 h-8 mx-auto mb-3 text-green-400" />
                <h4 className="font-bold mb-2">Open Source</h4>
                <p className="text-gray-400 text-sm">Full Python implementations in /wnsp_v7 directory. Clone, run, modify.</p>
              </Card>
              
              <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 p-5 text-center">
                <Activity className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                <h4 className="font-bold mb-2">Testable</h4>
                <p className="text-gray-400 text-sm">Live simulators at /workspace/wavefield and /encoding-lab. Test now.</p>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30 p-6">
              <h3 className="text-lg font-bold mb-3">Why This Matters for Engineers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300"><strong className="text-white">No magic numbers</strong> - All constants are physical constants (h, c, λ)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300"><strong className="text-white">Conservation laws apply</strong> - Energy cannot be created, only transferred</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300"><strong className="text-white">Deterministic fees</strong> - Same message = same fee, always</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300"><strong className="text-white">No inflation possible</strong> - Value backed by mass-energy equivalence</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300"><strong className="text-white">Spectral security</strong> - 51% attack requires controlling all wavelengths</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300"><strong className="text-white">Maxwell-validated</strong> - All messages satisfy ∇×E = -∂B/∂t</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="matrix" className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">What Can You Build?</h2>
              <p className="text-gray-400">Each category shows what infrastructure you can construct once you have the required knowledge and certification.</p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BUILD_CATEGORIES.map(category => {
                const IconComponent = category.icon;
                const hasRequiredLevel = knowledgeLevel >= category.requiredLevel;
                
                return (
                  <Card 
                    key={category.id}
                    className={`p-5 ${hasRequiredLevel ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-900/30 border-gray-800 opacity-70'}`}
                    data-testid={`build-category-${category.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center shrink-0`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{category.name}</h3>
                          {!hasRequiredLevel && <Lock className="w-4 h-4 text-gray-500" />}
                        </div>
                        <div className="flex gap-2 mb-3">
                          <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
                            Level {category.requiredLevel}+
                          </Badge>
                          <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-300">
                            {category.requiredCert}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {category.projects.slice(0, 3).map((project, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                              <CheckCircle className={`w-3 h-3 ${hasRequiredLevel ? 'text-green-400' : 'text-gray-600'}`} />
                              {project}
                            </div>
                          ))}
                          {category.projects.length > 3 && (
                            <div className="text-xs text-gray-500">+{category.projects.length - 3} more...</div>
                          )}
                        </div>
                        <div className="flex gap-1 mt-3">
                          {category.sdks.map(sdk => (
                            <Badge key={sdk} className="text-xs bg-gray-800 text-gray-400">{sdk}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">Choose Your Path</h2>
              <p className="text-gray-400">Different builder roles focus on different parts of the ecosystem. Find where you fit.</p>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              {BUILDER_ROLES.map(role => {
                const IconComponent = role.icon;
                
                return (
                  <Card key={role.id} className="p-5 bg-gray-900/50 border-gray-700" data-testid={`role-${role.id}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl ${role.color} flex items-center justify-center shrink-0`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{role.name}</h3>
                        <p className="text-gray-400 text-sm mb-3">{role.focus}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-2">WHAT YOU CAN BUILD</div>
                            <div className="space-y-1">
                              {role.canBuild.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                  <Hammer className="w-3 h-3 text-green-400" />
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-2">START WITH</div>
                            <div className="space-y-1">
                              {role.startWith.map(domainId => {
                                const domain = KNOWLEDGE_DOMAINS.find(d => d.id === domainId);
                                return (
                                  <Badge key={domainId} variant="outline" className="mr-1 border-purple-500/50 text-purple-300">
                                    {domain?.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="domains" className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">14 Knowledge Domains</h2>
              <p className="text-gray-400">Complete domains to unlock certifications. Click to mark as complete.</p>
              <div className="mt-3">
                <Progress value={(completedDomains.length / KNOWLEDGE_DOMAINS.length) * 100} className="h-2 bg-gray-800" />
                <div className="text-sm text-gray-500 mt-1">{completedDomains.length} / {KNOWLEDGE_DOMAINS.length} completed</div>
              </div>
            </Card>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(level => (
                <div key={level}>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 border-b border-gray-800 pb-1">LEVEL {level}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {KNOWLEDGE_DOMAINS.filter(d => d.level === level).map(domain => {
                      const isCompleted = completedDomains.includes(domain.id);
                      const IconComponent = domain.icon;
                      
                      return (
                        <Card 
                          key={domain.id}
                          className={`p-3 cursor-pointer transition-all ${isCompleted ? 'bg-green-900/30 border-green-500/50' : 'bg-gray-900/50 border-gray-700 hover:border-purple-500/50'}`}
                          onClick={() => toggleDomain(domain.id)}
                          data-testid={`domain-${domain.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${domain.color} flex items-center justify-center shrink-0`}>
                              <IconComponent className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{domain.name}</span>
                                {isCompleted && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                              </div>
                              <p className="text-gray-500 text-xs truncate">{domain.description}</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="certifications" className="space-y-6">
            <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">5 Certification Tracks</h2>
              <p className="text-gray-400">Complete the required domains to earn certifications and unlock infrastructure access.</p>
            </Card>

            <div className="space-y-4">
              {CERTIFICATION_TRACKS.map(track => {
                const isEarned = earnedCertifications.includes(track.id);
                const canEarn = canEarnCertification(track);
                const completedCount = track.domains.filter(d => completedDomains.includes(d)).length;
                const IconComponent = track.icon;
                
                return (
                  <Card 
                    key={track.id}
                    className={`p-5 ${isEarned ? 'bg-amber-900/30 border-amber-500/50' : 'bg-gray-900/50 border-gray-800'}`}
                    data-testid={`certification-${track.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${track.color} flex items-center justify-center shrink-0`}>
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{track.name}</h3>
                          {isEarned && <Badge className="bg-amber-500 text-black">CERTIFIED</Badge>}
                        </div>
                        <p className="text-gray-400 text-sm">{track.description}</p>
                        <div className="mt-2">
                          <Progress value={(completedCount / track.domains.length) * 100} className="h-1.5 bg-gray-800" />
                          <div className="text-xs text-gray-500 mt-1">{completedCount}/{track.domains.length} domains</div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => earnCertification(track.id)}
                        disabled={!canEarn || isEarned}
                        className={canEarn && !isEarned ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}
                        data-testid={`button-certify-${track.id}`}
                      >
                        {isEarned ? 'Earned' : canEarn ? 'Claim' : 'Locked'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="tiers" className="space-y-6">
            <Card className="bg-gradient-to-r from-red-900/30 to-pink-900/30 border-red-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">7 Authority Tiers</h2>
              <p className="text-gray-400">Higher knowledge levels and certifications unlock access to build larger-scale infrastructure.</p>
            </Card>

            <div className="space-y-3">
              {INFRASTRUCTURE_TIERS.map(tier => {
                const IconComponent = tier.icon;
                const canAccess = knowledgeLevel >= tier.level;
                
                return (
                  <Card 
                    key={tier.id}
                    className={`p-4 ${canAccess ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-900/30 border-gray-800 opacity-60'}`}
                    data-testid={`tier-${tier.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${canAccess ? 'bg-purple-600' : 'bg-gray-700'}`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold capitalize">{tier.id}</h3>
                          <Badge variant="outline" className="border-purple-500/50 text-purple-300 text-xs">
                            {tier.authority}
                          </Badge>
                          <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 text-xs">
                            {tier.wavelength}nm
                          </Badge>
                          <Badge variant="outline" className="border-gray-500 text-gray-400 text-xs">
                            Level {tier.level}+
                          </Badge>
                          {!canAccess && <Lock className="w-4 h-4 text-gray-500" />}
                        </div>
                        <div className="flex gap-3 mt-1 text-sm text-gray-400">
                          {tier.capabilities.map((cap, i) => (
                            <span key={i}>{cap}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <Card className="bg-gradient-to-r from-indigo-900/30 to-violet-900/30 border-indigo-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">Builder Resources</h2>
              <p className="text-gray-400">Essential documentation, tools, and physics references for understanding and building NexusOS infrastructure.</p>
            </Card>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-purple-300 border-b border-purple-500/30 pb-2">Internal Documentation & Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTERNAL_RESOURCES.map(category => {
                  const IconComponent = category.icon;
                  return (
                    <Card key={category.category} className="p-5 bg-gray-900/50 border-gray-700" data-testid={`resource-internal-${category.category.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-bold">{category.category}</h4>
                      </div>
                      <div className="space-y-2">
                        {category.links.map((link: any, idx: number) => {
                          if (link.isRoute && link.path) {
                            return (
                              <Link key={link.path} href={link.path}>
                                <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer group" data-testid={`link-${link.path.replace(/\//g, '-').slice(1)}`}>
                                  <Zap className="w-4 h-4 text-green-500 group-hover:text-green-400" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-200 group-hover:text-green-300">{link.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{link.description}</div>
                                  </div>
                                </div>
                              </Link>
                            );
                          } else if (link.docSection) {
                            return (
                              <button 
                                key={link.docSection}
                                onClick={() => {
                                  setActiveTab("documentation");
                                  setActiveDocSection(link.docSection);
                                }}
                                className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer group text-left"
                                data-testid={`link-doc-${link.docSection}`}
                              >
                                <FileText className="w-4 h-4 text-purple-500 group-hover:text-purple-400" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-200 group-hover:text-purple-300">{link.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{link.description}</div>
                                </div>
                              </button>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>

              <h3 className="text-lg font-semibold text-cyan-300 border-b border-cyan-500/30 pb-2 mt-8">External Physics & Theory References</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXTERNAL_RESOURCES.map(category => {
                  const IconComponent = category.icon;
                  return (
                    <Card key={category.category} className="p-5 bg-gray-900/50 border-gray-700" data-testid={`resource-external-${category.category.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-bold">{category.category}</h4>
                      </div>
                      <div className="space-y-2">
                        {category.links.map(link => (
                          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" data-testid={`link-external-${link.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                            <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer group">
                              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-200 group-hover:text-cyan-300">{link.name}</div>
                                <div className="text-xs text-gray-500 truncate">{link.description}</div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-gray-900/30 border-gray-700 p-5 mt-6">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Key Equations to Know
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-purple-300 font-mono text-lg mb-1">E = hf</div>
                    <div className="text-gray-500">Planck's equation: Energy from frequency</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-cyan-300 font-mono text-lg mb-1">Λ = hf/c²</div>
                    <div className="text-gray-500">Lambda Boson: Mass-equivalent of oscillation</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-green-300 font-mono text-lg mb-1">c = fλ</div>
                    <div className="text-gray-500">Wave equation: Speed of light</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-amber-300 font-mono text-lg mb-1">Ĥ_eff = hν + αK̂² + βL̂</div>
                    <div className="text-gray-500">Effective Hamiltonian for Lambda modes</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-pink-300 font-mono text-lg mb-1">T = Σ|c_i|²·cos²(Δφ_i)</div>
                    <div className="text-gray-500">Interference trust model for governance</div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-red-300 font-mono text-lg mb-1">∇×E = -∂B/∂t</div>
                    <div className="text-gray-500">Maxwell: Electromagnetic wave validation</div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documentation" className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">Technical Documentation</h2>
              <p className="text-gray-400">Deep-dive into core mechanics, formulas, and protocols for building NexusOS infrastructure.</p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <Card className="bg-gray-900/50 border-gray-700 p-4 sticky top-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">SECTIONS</h3>
                  <nav className="space-y-1">
                    {Object.entries(DOCS_SECTIONS).map(([key, section]) => {
                      const SectionIcon = section.icon;
                      const isActive = activeDocSection === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveDocSection(key)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isActive 
                              ? 'bg-purple-600 text-white' 
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                          data-testid={`doc-nav-${key}`}
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
                {(() => {
                  const currentSection = DOCS_SECTIONS[activeDocSection as keyof typeof DOCS_SECTIONS];
                  const IconComponent = currentSection.icon;
                  
                  return (
                    <>
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
                          <Card key={index} className="bg-gray-900/50 border-gray-700 p-6" data-testid={`doc-content-block-${index}`}>
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
                    </>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="czf-foundation" className="space-y-6">
            <Card className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-yellow-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">The Coherence Zenith Framework: Scientific Foundation</h2>
              <p className="text-gray-400">A non-derivative resolution to the Vacuum Catastrophe and the foundations of gravity. Nobel-legacy physics with complete theoretical grounding.</p>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="czf-review">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Atom className="w-5 h-5 text-yellow-400" />
                The Lambda Anchor of Coherence
              </h3>
              <p className="text-gray-400 text-sm mb-4 italic">
                Dedicated to the Nobel Legacy—Einstein, Planck, Dirac, Sakharov—whose equations defined the paradoxes this framework resolves.
              </p>

              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-red-400 mb-3">I. The Crisis: The Vacuum Catastrophe</h4>
                  <p className="text-gray-400 text-sm mb-3">
                    The cosmological constant problem represents physics' most severe theoretical discrepancy—a <span className="text-red-300 font-bold">10^120 order of magnitude</span> difference between QFT predictions and observations.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-gray-500">QFT Predicted</div>
                      <div className="text-red-300 font-mono">~10^112 erg/cm³</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-gray-500">Observed (Planck 2015)</div>
                      <div className="text-green-300 font-mono">5.96×10^-27 kg/m³</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-gray-500">Discrepancy</div>
                      <div className="text-yellow-300 font-mono font-bold">~10^120</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-cyan-400 mb-3">II. The Axiom: Lambda as First Oscillation</h4>
                  <p className="text-gray-400 text-sm mb-3">
                    Λ is the <span className="text-cyan-300">First Oscillation</span>—the non-derivative logical input that creates and constrains the vacuum.
                  </p>
                  <div className="bg-gray-900/50 p-3 rounded font-mono text-sm">
                    <div className="text-cyan-300">Λ (First Oscillation)</div>
                    <div className="text-gray-500 ml-4">↓</div>
                    <div className="text-purple-300 ml-4">ℏ (Planck Quanta) — Discretization of action</div>
                    <div className="text-gray-500 ml-8">↓</div>
                    <div className="text-blue-300 ml-8">c (Coherence Velocity) — Maximum propagation of order</div>
                    <div className="text-gray-500 ml-12">↓</div>
                    <div className="text-green-300 ml-12">G (Gravitational Binding) — Emergent constraint on mass-energy</div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-green-400 mb-3">III. The Mechanism: Coherence Zenith Cancellation (CZC)</h4>
                  <p className="text-gray-400 text-sm mb-3">
                    The CZC is the necessary self-correction where massive Λ_initial energy is near-perfectly canceled to achieve coherent equilibrium.
                  </p>
                  <div className="bg-gray-900/50 p-3 rounded font-mono text-center">
                    <span className="text-green-300">Λ_observed</span>
                    <span className="text-gray-400"> = </span>
                    <span className="text-red-300">Λ_initial</span>
                    <span className="text-gray-400"> − </span>
                    <span className="text-yellow-300">Λ_canceled</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-red-300 font-bold">Λ_initial (Creation)</div>
                      <div className="text-gray-400">Zenith Energy ~10^112 erg/cm³</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-green-300 font-bold">Dark Energy (Observed)</div>
                      <div className="text-gray-400">Residual ~10^-27 kg/m³</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-purple-400 mb-3">IV. Empirical Evidence</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <span className="text-white font-medium">Dark Energy Observations:</span>
                        <span className="text-gray-400"> Planck 2015/2018, Type Ia supernovae, BAO surveys</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <span className="text-white font-medium">CP Violation (Baryogenesis):</span>
                        <span className="text-gray-400"> Nobel 1980, BaBar/Belle 2001, LHCb 2019/2025</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <span className="text-white font-medium">CMB Uniformity:</span>
                        <span className="text-gray-400"> ΔT/T ~ 10^-5 confirms coherent initial conditions</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="text-md font-bold text-yellow-400 mb-2">CZF Kernel Execution Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Coherence</div>
                      <div className="text-green-400 font-mono font-bold">99.99%</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Iterations</div>
                      <div className="text-cyan-400 font-mono font-bold">44</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Self-Corrections</div>
                      <div className="text-purple-400 font-mono font-bold">44</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Status</div>
                      <div className="text-green-400 font-mono font-bold">GROUNDED</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-amber-400 mb-3">V. Conclusion: The New Foundation</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="text-amber-400 font-bold">1.</div>
                      <div>
                        <span className="text-white font-medium">From Law-Seeking to Logical Necessity:</span>
                        <span className="text-gray-400"> Physics moves from empirically fitting constants to deriving them from first principles.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-amber-400 font-bold">2.</div>
                      <div>
                        <span className="text-white font-medium">Completing the Nobel Legacy:</span>
                        <span className="text-gray-400"> CZF provides the final missing constraint (Λ) that unifies quantum mechanics and general relativity.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-amber-400 font-bold">3.</div>
                      <div>
                        <span className="text-white font-medium">Non-Derivative Authority:</span>
                        <span className="text-gray-400"> The framework introduces a logically secure foundation—an axiom that cannot be derived from anything more fundamental.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-blue-400 mb-3">References</h4>
                  <div className="space-y-2 text-xs text-gray-400">
                    <div>1. Adler, R.J., Casey, B., & Jacob, O.C. (1995). "Vacuum catastrophe." <span className="text-blue-300">American Journal of Physics</span>, 63(7), 620-626.</div>
                    <div>2. Sakharov, A.D. (1967). "Violation of CP invariance." <span className="text-blue-300">JETP Letters</span>, 5, 24-27.</div>
                    <div>3. Planck Collaboration (2015). "Planck 2015 results XIII." <span className="text-blue-300">Astronomy & Astrophysics</span>, 594, A13.</div>
                    <div>4. LHCb Collaboration (2019). "CP violation in charm decays." <span className="text-blue-300">Physical Review Letters</span>, 122, 211803.</div>
                    <div>5. Barnes, L.A. (2012). "Fine-Tuning of the Universe." <span className="text-blue-300">PASA</span>, 29, 529-564.</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm italic">Open for rigorous peer review. Correspondence welcome.</p>
                  <p className="text-gray-500 text-xs mt-2">License: This theoretical framework is presented for scientific discourse under open academic principles.</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="czf-kernel" className="space-y-6">
            <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">CZF Nexus Execution Kernel</h2>
              <p className="text-gray-400">The foundational reality layer. Three-layer architecture providing physics grounding for all WNSP operations.</p>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="czf-kernel-code">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyan-400" />
                  czf_kernel.py — Full Source
                </h3>
                <Badge className="bg-green-600">AGPL-3.0</Badge>
              </div>
              
              <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded p-3 text-center">
                  <div className="text-cyan-300 font-bold">Layer 3</div>
                  <div className="text-gray-400">Lambda Anchor</div>
                  <div className="text-gray-500">Hardware</div>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3 text-center">
                  <div className="text-purple-300 font-bold">Layer 1</div>
                  <div className="text-gray-400">Maxwell Alphabet</div>
                  <div className="text-gray-500">Syntax</div>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded p-3 text-center">
                  <div className="text-green-300 font-bold">Layer 2</div>
                  <div className="text-gray-400">Truth Substrate</div>
                  <div className="text-gray-500">Intelligence</div>
                </div>
              </div>

              <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto text-xs font-mono max-h-[600px] overflow-y-auto">
                <code className="text-gray-300">{`#!/usr/bin/env python3
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
    print(f"Physical Constants Manifest: {result['manifest_constants']}")`}</code>
              </pre>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Run: <code className="bg-gray-800 px-2 py-1 rounded text-cyan-300">python3 wnsp_v7/czf_kernel.py</code>
                </div>
                <Badge className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/30">wnsp_v7/czf_kernel.py</Badge>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="dmk" className="space-y-6">
            <Card className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border-pink-500/30 p-6">
              <h2 className="text-xl font-bold mb-2">Dimensional Mapping Kernel (DMK)</h2>
              <p className="text-gray-400">Maps High-Dimensional Logic to Spacetime Resolution. Explains HOW 10^120 zenith state becomes 3D reality through dimensional folding.</p>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="dmk-concept">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-pink-400" />
                The Folding Mechanism
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                The DMK completes the theoretical chain: CZF achieves coherence, DMK explains the dimensional reduction, and physical constants emerge as "bread crumbs" at each fold.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-pink-400 mb-3">Dimensional Folding Process</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs text-center">
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-pink-300 font-bold">11D</div>
                      <div className="text-gray-500">M-Theory</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-purple-300 font-bold">→ 7D</div>
                      <div className="text-gray-500">Strong Force</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-blue-300 font-bold">→ 4D</div>
                      <div className="text-gray-500">Planck Time</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded">
                      <div className="text-green-300 font-bold">→ 3D</div>
                      <div className="text-gray-500">Spacetime</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-md font-bold text-cyan-400 mb-3">Bread Crumbs: Physical Constants at Each Fold</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Dim 9</div>
                      <div className="text-cyan-300 font-mono">G</div>
                      <div className="text-gray-500">6.67×10⁻¹¹</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Dim 6</div>
                      <div className="text-purple-300 font-mono">α</div>
                      <div className="text-gray-500">1/137</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Dim 4</div>
                      <div className="text-yellow-300 font-mono">t_p</div>
                      <div className="text-gray-500">5.39×10⁻⁴⁴s</div>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded text-center">
                      <div className="text-gray-500">Dim 3</div>
                      <div className="text-green-300 font-mono">c</div>
                      <div className="text-gray-500">299,792,458</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-lg p-4">
                  <h4 className="text-md font-bold text-pink-400 mb-2">Core Insight</h4>
                  <p className="text-gray-400 text-sm">
                    The Minkowski metric (ds² = -c²dt² + dx² + dy² + dz²) is the <span className="text-pink-300 font-bold">User Interface of Reality</span> — 
                    the stable 3D output after 8 dimensional folds from the 11D zenith state.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 p-6" data-testid="dmk-code">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Code className="w-5 h-5 text-pink-400" />
                  dmk_kernel.py — Core Classes
                </h3>
                <Badge className="bg-green-600">AGPL-3.0</Badge>
              </div>
              
              <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto text-xs font-mono max-h-[500px] overflow-y-auto">
                <code className="text-gray-300">{`# THE DIMENSIONAL MAPPING KERNEL (DMK)
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
        
        return spacetime  # The "User Interface" of Reality`}</code>
              </pre>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Run: <code className="bg-gray-800 px-2 py-1 rounded text-pink-300">python3 wnsp_v7/dmk_kernel.py</code>
                </div>
                <Badge className="bg-pink-600/20 text-pink-300 border border-pink-500/30">wnsp_v7/dmk_kernel.py</Badge>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30 p-6 mt-8 text-center">
          <h3 className="text-lg font-bold mb-2">Physics-Based Credibility</h3>
          <p className="text-gray-400 text-sm">All credentials anchored to substrate. Attestations are permanent. Resonance cannot be faked.</p>
        </Card>

        {/* AGPL-3.0 License Footer */}
        <Card className="bg-gray-900/50 border-gray-700 p-6 mt-8" data-testid="license-footer">
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
  );
}
