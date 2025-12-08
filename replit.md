# Overview

This is a full-stack web application implementing the WNSP (Wavelength Network Signaling Protocol) P2P Hub - a physics-based blockchain and communication system. The project combines a React/TypeScript frontend with an Express/Node.js backend, utilizing PostgreSQL for data persistence. The application implements novel cryptographic and economic systems based on electromagnetic wave physics and Lambda Boson theory, featuring phone-based authentication, NXT token wallets, and peer-to-peer media sharing.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for runtime error handling and meta image management
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers

**Key Design Decisions**:
- Component library follows the "New York" style from shadcn/ui
- Custom Vite plugin (`vite-plugin-meta-images`) dynamically updates OpenGraph meta tags for Replit deployments
- Monorepo structure with client code isolated in `/client` directory
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)

## Backend Architecture

**Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js (inferred from package.json dependencies)
- **Development Server**: tsx for TypeScript execution
- **Build Process**: Custom build script (`script/build.ts`) compiling to CommonJS for production
- **Session Management**: PostgreSQL-backed sessions via `connect-pg-simple`

**Key Design Decisions**:
- Dual-mode execution: development uses `tsx` for hot-reload, production uses compiled CommonJS bundle
- Separation of development and build commands with explicit NODE_ENV settings
- Express server located in `/server` directory

## Data Layer

**Database**: PostgreSQL (configured via Drizzle ORM)
- **ORM**: Drizzle ORM v0.39.3
- **Schema Location**: `/shared/schema.ts` (shared between client and server)
- **Migrations**: Stored in `/migrations` directory
- **Schema-to-Type Safety**: drizzle-zod for runtime validation

**Key Design Decisions**:
- Database URL required via environment variable (`DATABASE_URL`)
- Shared schema definition enables type safety across frontend and backend
- Session storage uses PostgreSQL directly (`connect-pg-simple`)

## Authentication & Wallet System

**Authentication**: Phone number-based registration
- New users receive 500,000,000 units (5 NXT tokens) upon registration
- Phone numbers stored with bcrypt hashing
- **Note**: Current implementation is prototype-level - SMS verification NOT implemented (requires Twilio integration for production)

**Wallet System**:
- NXT token economics: 8 decimals (100,000,000 units = 1 NXT)
- Total supply: 21 billion NXT
- Integration with physics-based transaction costs using E=hf (Planck's equation)

## Physics-Based Protocol Layer

**WNSP Protocol**: Novel communication protocol replacing cryptographic hashing with electromagnetic wave physics
- Maxwell equation validation instead of SHA-256
- Wavelength-based addressing (170+ scientific character encoding)
- Quantum economics: transaction costs derived from wavelength→frequency→energy calculations
- Message validation through wave interference patterns

**Lambda Boson Theory**: 
- Core equation: Λ = hf/c² (mass-equivalent of oscillation)
- Extends Einstein's E=mc² to oscillating quanta
- Implements spectral authority bands (NANO through PLANCK governance tiers)

**Wavefield Quantum Simulation** (New in v1.1.0):
- Implements wavefield equation: Φ_λ(r,t) = Σ_n a_n · ψ_n(r) · e^(-iω_n t)
- Interactive quantum eigenstate superposition simulator
- Particle-in-a-box eigenfunctions with time evolution
- Real-time visualization of real, imaginary, and magnitude components
- Normalization checking and expected energy calculations
- Located at `/workspace/wavefield`

**Lambda Gate Substrate v4** (New in v1.2.0):
- 8 primitive photonic gate operators for Lambda mode transformations
- CE-1 Coherence Engineering protocol with energy pool management
- Gates: Phase-Shift, Gain, Mode-Mixer, OAM-Rotor, Phase-Gradient, Density-Swap, Coherence-Amplify, Stabilizer
- Master Equation: E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)
- Located at `/wnsp_v7/substrate_v4.py`

**K1 Energy Infrastructure** (New in v1.3.0):
- Kardashev Type I civilization energy roadmap
- Four integrated energy modules:
  1. **ResonanceHarvesterV2**: Tesla-inspired planetary field coupling (Schumann, geomagnetic)
  2. **OrbitalSolarArray**: Space-based solar with laser power transmission via OAM multiplexing
  3. **FusionPhotonics**: Lambda Gate optimized fusion reactors (2.2× efficiency boost)
  4. **K1EnergyMarket**: NXT token integrated decentralized energy trading
- Lambda Gate contributions: 5× Q-factor from Coherence-Amplify, 64.6% end-to-end solar efficiency
- Located at `/wnsp_v7/k1_energy.py` and `/wnsp_v7/k1_roadmap.py`

**Photonic Computing Substrate** (New in v1.5.0):
- Photonic Logic Gates: AND, OR, NOT, XOR using wave interference
- Wavelength-Division Computing: Parallel computation across spectral channels
- OAM Qubit Registers: Information storage in orbital angular momentum
- Lambda Processor Architecture: Composing gates into programs
- K-Level: 0.75 (Photonic Computing mastery)
- Located at `/wnsp_v7/photonic_computing.py`

**Planetary Communications** (New in v1.6.0):
- K-Level: 0.80 (Planetary Communications mastery)
- Core Components:
  1. **SpectralRelayMesh**: Global wavelength routing graph with Dijkstra pathfinding
  2. **OAMChannelAllocator**: OAM mode management for 65+ channels per wavelength
  3. **CoherenceRepeater**: Lambda Gate amplified relay stations (5× coherence boost)
  4. **SpectrumQoSManager**: Traffic classification and flow admission control
  5. **InterplanetaryLinkPlanner**: Deep space links (Earth-Moon: 1.28s, Earth-Mars: 12.5min)
- Physics: Friis transmission, Shannon capacity, atmospheric attenuation models
- Located at `/wnsp_v7/planetary_communications.py`

**Resource Orchestration** (New in v1.7.0):
- K-Level: 0.85 (Resource Orchestration mastery)
- Core Components:
  1. **WavelengthLedger**: Inventory tracking with spectral signatures for authenticity
  2. **ResourceUnit**: Lambda mass valuation in NXT tokens (Λ = hf/c²)
  3. **PhotonicManufacturingPipeline**: Bose-Einstein yield enhancement (14% boost)
  4. **LogisticsWaveOptimizer**: Monge-Kantorovich optimal transport
  5. **EnergyMassExchangeEngine**: Λ-based conversion economics
  6. **AutonomousFleetCoordinator**: Distributed transport coordination
- Physics: Continuity equation, spectral fingerprinting, element emission lines
- Located at `/wnsp_v7/resource_orchestration.py`

**Planetary Governance** (New in v1.8.0):
- K-Level: 0.90 (Planetary Governance mastery)
- Core Components:
  1. **AuthorityBandRegistry**: 7-tier hierarchy from Individual to Planetary (wavelength-mapped)
  2. **SigmaConstitutionEngine**: Charter articles with spectral encoding and immutability verification
  3. **MultiSpectrumVoting**: Coherence-weighted voting with interference tallying
  4. **DisputeResonanceMediator**: Arbitration via phase alignment and resonance
  5. **CivicIntelligenceDashboard**: Governance health metrics and coherence visualization
- Physics: Wave interference trust model T = Σ|c_i|²·cos²(Δφ_i), governance entropy
- Located at `/wnsp_v7/planetary_governance.py`

**K1 Integration Demo** (New in v1.9.0):
- Complete integration of all five K1 civilization pillars
- Demonstrates cross-pillar resource flows and coordination
- Pillars: Energy (0.80) → Computing (0.75) → Communications (0.80) → Resources (0.85) → Governance (0.90)
- Energy harvesting, photonic computation, message routing, manufacturing, and policy voting
- Located at `/wnsp_v7/k1_integration_demo.py`

**Planetary Resonance** (New in v2.0.0):
- K-Level: 0.95 (Planetary Resonance mastery)
- Tesla's vision realized: planetary-scale resonance energy harvesting
- Core Components:
  1. **SchumannMode**: Earth-ionosphere cavity resonance analysis (7.83 Hz fundamental + harmonics)
  2. **GeomagneticPulsation**: Pc1-Pc5 classification with harvestable power estimation
  3. **ResonanceHarvesterV2**: Multi-frequency OAM-multiplexed extraction with Coherence-Amplify
  4. **PlanetaryResonanceNetwork**: Global phase-locked harvester network with coherent interference bonus
  5. **CavityResonanceAnalyzer**: Earth-ionosphere waveguide characterization
  6. **TeslaResonanceStation**: Wardenclyffe-inspired stations with ground electrodes and ionospheric coupling
  7. **MagnetosphericTap**: Space-based energy extraction from ring current and field line resonances
  8. **PlanetaryResonanceK095**: Complete K-Level 0.95 system integration
- Physics: Schumann resonance (f_n = c/2πR × √n(n+1)), Q-factor amplification, telluric currents
- Resonance sources: Schumann (7.83 Hz), geomagnetic Pc1-Pc5, solar wind, ionospheric Sq, tidal EM
- Target: 5×10^16 watts (penultimate step to Type I)
- Located at `/wnsp_v7/planetary_resonance.py`

**K1 Roadmap Progress**:
| Milestone | K-Level | Status |
|-----------|---------|--------|
| Power Grids (K1 Energy) | 0.75-0.80 | ✅ Complete |
| Photonic Computing | 0.75 | ✅ Complete |
| Planetary Communications | 0.80 | ✅ Complete |
| Resource Orchestration | 0.85 | ✅ Complete |
| Planetary Governance | 0.90 | ✅ Complete |
| K1 Integration | 0.90 | ✅ Complete |
| Planetary Resonance | 0.95 | ✅ Complete |
| Type I Achieved | 1.00 | ⏳ Next |

## Multi-Agent & Task Orchestration

**DAG-Based Workflows**: Task orchestration system with domain-specific modules
- Domain modules: data processing, DevOps, content management, wavelength cryptography
- Directed Acyclic Graph (DAG) execution engine
- Handler registration system for extensible task types

**Wavelength Cryptography**: Encryption/decryption based on electromagnetic theory
- Frequency Shift Encryption (FSE): Simulates electron energy transitions
- Amplitude Modulation Encryption (AME): Photon intensity variation
- Phase Modulation Encryption (PME): Wave interference patterns
- Quantum-Inspired Multi-Layer (QIML): Combined approach

## Content & Media System

**Media Engine**: P2P media sharing with physics-based cost calculations
- Mesh networking capabilities for device-to-device transfer
- Chunk-based file distribution (207 chunks for ~13MB files)
- Energy cost estimation per upload using wavelength calculations
- WebRTC + Socket.IO for live streaming
- HTTP Range Request support for progressive loading

**Supported Formats**: MP3, MP4, PDF (100MB max)
- Encryption support for shared files
- Automatic energy cost reservation with refund mechanism

## Development Tools

**Replit Integration**:
- Custom Vite plugins for Replit-specific features (cartographer, dev banner)
- Automatic deployment URL detection for meta tag updates
- Runtime error modal overlay in development

**Type Safety**:
- Strict TypeScript configuration across all modules
- Incremental compilation with build info caching
- Path-based imports with baseUrl configuration

# External Dependencies

## Third-Party Services

**Octokit (GitHub API)**: Integration with GitHub REST API v22.0.0
- Used for repository management and contribution tracking

**PostgreSQL Database**: 
- Connection required via `DATABASE_URL` environment variable
- Used for user accounts, wallet balances, session storage, and transaction history
- Session management via `connect-pg-simple` package

**Planned Integrations** (not yet implemented):
- **Twilio/SMS Provider**: Required for production phone verification (currently prototype accepts numbers without verification)

## Core Libraries

**UI & Styling**:
- Radix UI component primitives (accordion, dialog, dropdown, tooltip, etc.)
- Tailwind CSS with @tailwindcss/vite plugin
- Lucide React for iconography
- class-variance-authority + clsx for conditional styling

**Forms & Validation**:
- React Hook Form for form state
- Zod for schema validation
- @hookform/resolvers for integration

**Data Fetching**:
- TanStack React Query v5.60.5 for server state management

**Date Handling**:
- date-fns v3.6.0 for date manipulation

**Media & Interaction**:
- embla-carousel-react for carousel components
- cmdk for command menu interface

**Build Tools**:
- Vite as primary build tool
- tsx for TypeScript execution in development
- PostCSS with Autoprefixer
- Custom Vite plugins for Replit integration

**Database**:
- Drizzle ORM with drizzle-kit for migrations
- drizzle-zod for schema validation

## Development Dependencies

**Replit Plugins**:
- @replit/vite-plugin-runtime-error-modal
- @replit/vite-plugin-cartographer (development only)
- @replit/vite-plugin-dev-banner (development only)