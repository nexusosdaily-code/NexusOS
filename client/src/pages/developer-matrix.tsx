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
    title: "W-ASCII Encoding",
    icon: Code,
    color: "from-blue-500 to-cyan-500",
    content: [
      {
        heading: "Wavelength Character Mapping",
        text: `W-ASCII encodes 170+ characters as electromagnetic wavelengths in the visible spectrum (380-780nm).

**Encoding Formula:**
wavelength = 380 + (char_code % 95) × 4.2 nm

**Example Mappings:**
- 'A' (65) → 380 + (65 % 95) × 4.2 = 653 nm (Red)
- 'Z' (90) → 380 + (90 % 95) × 4.2 = 758 nm (Deep Red)  
- 'a' (97) → 380 + (97 % 95) × 4.2 = 388.4 nm (Violet)
- '0' (48) → 380 + (48 % 95) × 4.2 = 581.6 nm (Yellow)`
      },
      {
        heading: "Spectral Signature",
        text: `Each message has a unique spectral signature based on its content:

**Signature Components:**
1. Wavelength array (one per character)
2. Frequency array (c/λ for each)
3. Energy array (E=hf for each)
4. Total message energy (sum of all)

**Validation:**
Messages are validated by checking:
- Maxwell equation compliance (∇×E = -∂B/∂t)
- Energy conservation
- Spectral coherence`
      },
      {
        heading: "Extended Character Set",
        text: `Beyond ASCII, W-ASCII supports:

**Scientific Symbols:**
- Greek letters (α, β, γ, δ, ε, λ, Σ, Φ, Ψ, Ω)
- Mathematical operators (∇, ∂, ∫, Σ, ∏)
- Physical constants (ℏ, ℵ)

**Special Mappings:**
- λ → 555nm (peak human eye sensitivity)
- Σ → 520nm (green, summation)
- Φ → 450nm (blue, phase)
- ∇ → 700nm (red, gradient)`
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
  }
};

const INTERNAL_RESOURCES = [
  {
    category: "Live Tools",
    icon: Zap,
    color: "from-purple-500 to-pink-500",
    links: [
      { name: "Document Transmission Center", path: "/transmission", description: "Transmit documents via wavelength encoding" },
      { name: "Quantum Wavefield Simulator", path: "/workspace/wavefield", description: "Interactive eigenstate superposition" },
      { name: "NXT Wallet Dashboard", path: "/wallet", description: "Manage NXT tokens and transactions" },
      { name: "K1 Infrastructure", path: "/k1", description: "Kardashev Type I civilization systems" }
    ]
  },
  {
    category: "Core Mechanics Documentation",
    icon: Cpu,
    color: "from-violet-500 to-purple-500",
    links: [
      { name: "Lambda Gate Substrate v4", path: "/docs", description: "8 photonic gate primitives: Phase-Shift, Gain, Mode-Mixer, OAM-Rotor" },
      { name: "W-ASCII Encoding", path: "/docs", description: "170+ character wavelength mapping (380-780nm)" },
      { name: "Proof of Spectrum Consensus", path: "/docs", description: "Physics-based Byzantine fault tolerance" }
    ]
  },
  {
    category: "Economics & Governance Docs",
    icon: Scale,
    color: "from-green-500 to-emerald-500",
    links: [
      { name: "NXT Token Economics", path: "/docs", description: "21B supply, 8 decimals, E=hf transaction fees" },
      { name: "BHLS Floor System", path: "/docs", description: "1,150 NXT/month basic living standard guarantee" },
      { name: "Planetary Governance", path: "/docs", description: "Authority bands, constitutional articles, Sigma voting" }
    ]
  },
  {
    category: "Infrastructure Building Docs",
    icon: Building2,
    color: "from-cyan-500 to-blue-500",
    links: [
      { name: "K1 Infrastructure Guide", path: "/docs", description: "Photonic computing, planetary comms, resonance harvesting" },
      { name: "K1 Orchestration Dashboard", path: "/k1/orchestration", description: "Live infrastructure management" }
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
      "BHLS floor enforcement",
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
    canBuild: ["Encryption systems", "Audit tools", "Constitutional validators", "BHLS enforcers"],
    startWith: ["constitutional", "bhls_economics"]
  }
];

const KNOWLEDGE_DOMAINS = [
  { id: "wave_physics", name: "Wave Physics", level: 1, description: "c=fλ, electromagnetic spectrum, E=hf", icon: Radio, color: "from-violet-500 to-purple-600" },
  { id: "lambda_boson", name: "Lambda Boson", level: 1, description: "Λ=hf/c², mass-equivalent of oscillation", icon: Sparkles, color: "from-purple-500 to-pink-600" },
  { id: "wascii_encoding", name: "W-ASCII Encoding", level: 2, description: "170+ character wavelength mapping", icon: Code, color: "from-blue-500 to-cyan-600" },
  { id: "spectral_routing", name: "Spectral Routing", level: 2, description: "Wavelength-based message routing", icon: Network, color: "from-cyan-500 to-teal-600" },
  { id: "lambda_gates", name: "Lambda Gates", level: 3, description: "8 photonic gate primitives", icon: Cpu, color: "from-green-500 to-emerald-600" },
  { id: "ce1_protocol", name: "CE-1 Protocol", level: 3, description: "Coherence Engineering protocol", icon: Zap, color: "from-emerald-500 to-green-600" },
  { id: "constitutional", name: "Constitutional Law", level: 4, description: "C-0001, C-0002, C-0003 clauses", icon: Scale, color: "from-yellow-500 to-orange-600" },
  { id: "bhls_economics", name: "BHLS Economics", level: 4, description: "1,150 NXT floor, 7 categories", icon: Shield, color: "from-orange-500 to-red-600" },
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
  { id: "governance_arch", name: "Governance Architect", description: "Voting & constitutional systems", domains: ["constitutional", "bhls_economics", "authority_bands", "sigma_voting"], icon: Scale, color: "from-orange-600 to-yellow-500" },
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
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-title">Developer Matrix</h1>
            <p className="text-gray-400 text-sm">What Engineers, Builders & Developers Can Build</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800 p-1 flex-wrap h-auto">
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
          </TabsList>

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
                        {category.links.map(link => (
                          <Link key={link.path} href={link.path}>
                            <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50 cursor-pointer group" data-testid={`link-${link.path.replace(/\//g, '-').slice(1)}`}>
                              <FileText className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-200 group-hover:text-purple-300">{link.name}</div>
                                <div className="text-xs text-gray-500 truncate">{link.description}</div>
                              </div>
                            </div>
                          </Link>
                        ))}
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
        </Tabs>

        <Card className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30 p-6 mt-8 text-center">
          <h3 className="text-lg font-bold mb-2">Physics-Based Credibility</h3>
          <p className="text-gray-400 text-sm">All credentials anchored to substrate. Attestations are permanent. Resonance cannot be faked.</p>
        </Card>
      </div>
    </div>
  );
}
