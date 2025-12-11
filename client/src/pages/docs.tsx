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
          </div>
        </div>
      </div>
    </div>
  );
}
