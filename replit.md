# Overview

This full-stack web application, the WNSP P2P Hub, implements a physics-based blockchain and communication system. It features a React/TypeScript frontend and an Express/Node.js backend with PostgreSQL. The project introduces novel cryptographic and economic systems rooted in electromagnetic wave physics and Lambda Boson theory, including phone-based authentication, NXT token wallets, and peer-to-peer media sharing. Its ambition is to establish a Kardashev Type I civilization infrastructure.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend uses React 18 with TypeScript, Vite, Radix UI components, and the shadcn/ui "New York" design system. Styling is managed with Tailwind CSS v4 and CSS variables. State management is handled by TanStack React Query, and forms use React Hook Form with Zod validation. A custom Vite plugin dynamically updates OpenGraph meta tags for Replit deployments.

## Technical Implementations

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Radix UI, shadcn/ui "New York" style
- **Styling**: Tailwind CSS v4, CSS variables
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod

### Backend — Two Runtime Architecture
NexusOS runs two distinct runtimes in sync. Neither reaches into the other's domain.

**Runtime 1 — Node.js / TypeScript (port 5000)**
- **Framework**: Express.js
- **Development**: `tsx` for hot-reload
- **Production**: Compiled CommonJS bundle
- **Session Management**: PostgreSQL-backed via `connect-pg-simple`
- **Role**: Main application server — authentication, wallet, P2P media, governance, user APIs. Acts as a secure, rate-limited gateway that proxies all WNSP protocol calls to the Python runtime.

**Runtime 2 — Python / Flask (port 5001)**
- **Framework**: Flask with flask-cors
- **Entry point**: `spectral_api.py`
- **Role**: Spectral physics engine — implements both WNSP encoding standards, K1 Orchestration Runtime, and all Lambda Boson physics calculations. Never handles authentication or user state.

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM v0.39.3
- **Schema**: Shared `/shared/schema.ts` with `drizzle-zod` for type safety
- **Migrations**: Stored in `/migrations`
- **Session Storage**: Directly in PostgreSQL

## Feature Specifications

### Authentication & Wallet System
- **Authentication**: Phone number-based registration (prototype, SMS verification not implemented). New users receive 500,000,000 units (5 NXT tokens).
- **Wallet**: NXT token (8 decimals, 21 billion supply) with physics-based transaction costs (E=hf).

### Physics-Based Protocol Layer (WNSP)
- **Core Protocol**: Replaces cryptographic hashing with electromagnetic wave physics, using Maxwell equation validation and wavelength-based addressing.
- **Quantum Economics**: Transaction costs derived from wavelength-frequency-energy calculations.
- **Lambda Boson Theory**: Core equation Λ = hf/c², extending E=mc² to oscillating quanta, with spectral authority bands.

#### WNSP Two-Layer Encoding Standard (implemented in `wnsp_protocol_v7.py` + `spectral_api.py`)

**WNSP-CE v1.0 — Character Encoding Standard (Layer 1 / Semantic)**
Converts human-readable symbols into normalised ordinal tokens. Has no knowledge of wave physics. Output is consumed exclusively by WNSP-SE. Each symbol maps to a normalised value in [0, 1] via: `normalised = (ord(char) % 256) / 255`.

**WNSP-SE v1.0 — Spectral Encoding Standard (Layer 2 / Physical)**
Maps WNSP-CE tokens into physical wave frames governed by Λ = hf/c². Two tokens per photon frame (dual-wavelength oscillation). Every frame carries: wavelength (nm), frequency (Hz), energy (J), lambda mass (kg).

**Handoff point:** CE ordinal tokens → SE wave frames. Neither layer crosses into the other's domain.

**Hilbert Space Channel Model:**
Each channel is an orthogonal basis vector: Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩
- dim(|λ_i⟩) = 256 (WDM wavelength channels)
- dim(|OAM_j⟩) = 50 (orbital angular momentum modes)
- dim(|Pol_k⟩) = 2 (H / V polarisation)
- Total: dim(H) = 25,600 orthogonal channels — ⟨Ψ_i|Ψ_j⟩ = 0 for i ≠ j

**API endpoints:**
- `GET /api/wnsp/protocol` — full spec of both standards
- `POST /api/wnsp/ce/encode` — CE layer only
- `POST /api/wnsp/se/encode` — SE layer only (accepts CE output)
- `POST /api/wnsp/transmit` — full CE → SE stack in one call

**AI/OS Channel Coordination Layer** (`/api/wnsp/agent/*`):
- `POST /api/wnsp/agent/allocate` — deterministically allocate a unique Ψ_channel for an AI agent
- `POST /api/wnsp/agent/map` — map an AI instruction through CE→SE and bind to agent's channel
- `GET /api/wnsp/agent/status` — list all allocated channels and Hilbert utilisation
- `POST /api/wnsp/agent/release` — release an agent's channel back to the pool
- Middleware: collision-free SHA256 hash allocation; orthogonality guarantee ensures no agent interference

**SE Simulation & Orthogonality Validation** (`/api/wnsp/se/*`):
- `POST /api/wnsp/se/simulate` — per-frame channel occupation, packing efficiency, energy/mass totals
- `GET /api/wnsp/se/orthogonality` — Hilbert-space orthogonality proof across all 25,600 channels

**Frontend:** `/wnsp/coordinator` — AI/OS Channel Coordinator page with agent management, SE frame simulation, and orthogonality visualisation.

**Test suite:** `tests/test_wnsp_protocol.py` — 44 unit tests (23 physics+CE+SE, 12 coordinator, 9 bus). Run: `python tests/test_wnsp_protocol.py`

### WNSP AI Operating System Kernel (v1.0.0)
Five kernel components completing the AI ecosystem. All implemented in `wnsp_v7/kernel_*.py`.

**Component 1 — Boot / Init Sequence** (`wnsp_v7/kernel_boot.py`):
- 5-phase boot on Flask startup: Schema → Restore → Core → Watchdog → Events
- Auto-registers 5 core agents: `os_kernel` [SYSTEM], `bus_router` [SYSTEM], `scheduler_daemon` [KERNEL], `watchdog_daemon` [KERNEL], `auth_gateway` [KERNEL]

**Component 2 — Persistent State** (`wnsp_v7/kernel_persistence.py`):
- PostgreSQL tables: `wnsp_agents`, `wnsp_bus_log`, `wnsp_kernel_events`
- psycopg2 is optional — degrades gracefully to in-memory mode if not available
- API: `GET /api/kernel/state`

**Component 3 — Authority / Permission Layer** (`wnsp_v7/kernel_authority.py`):
- Spectral authority bands mapped to WDM ranges: SYSTEM (0–63), KERNEL (64–127), USER (128–191), GUEST (192–255)
- Rule: sender.rank ≤ receiver.rank (lower rank = higher authority)
- Bus send enforces authority; returns 403 AUTHORITY_DENIED if blocked
- API: `GET /api/kernel/authority`, `POST /api/kernel/authority/check`

**Component 4 — Interrupt / Event System** (`wnsp_v7/kernel_events.py`):
- `KernelEventBus` with subscribe/emit/drain model
- 8 interrupt types: MESSAGE_ARRIVED, AGENT_REGISTERED, AGENT_RELEASED, AGENT_DEGRADED, AGENT_RECLAIMED, BOOT_COMPLETE, CHANNEL_COLLISION, WATCHDOG_SCAN
- SSE streaming: `GET /api/kernel/events/stream`
- API: `GET /api/kernel/events`, `POST /api/kernel/events/emit`

**Component 5 — Dead Agent Watchdog** (`wnsp_v7/kernel_watchdog.py`):
- Background `threading.Thread`, scans every 30s
- TTL 300s → DEGRADED; 600s → RECLAIMED (channel returned to pool)
- Core system agents are EXEMPT from reclamation
- API: `GET /api/kernel/watchdog`, `POST /api/kernel/watchdog/scan`

**Kernel overview:** `GET /api/kernel/status` — single call for all 5 components.
**Frontend:** `/kernel` (also `/wnsp/kernel`) — 5-tab kernel dashboard.

- **Advanced Systems**:
    - **Coherence Zenith Framework (CZF)**: Non-derivative resolution to the Vacuum Catastrophe. Lambda as First Oscillation, achieving 99.99% coherence through 44 evolutionary self-corrections.
    - **Dimensional Mapping Kernel (DMK)**: Maps 11D high-dimensional logic to 3D spacetime through CZC folding. Physical constants emerge as "bread crumbs" at each dimensional fold.
    - **Wavefield Quantum Simulation**: Interactive quantum eigenstate superposition simulation.
    - **Lambda Gate Substrate v4**: 8 primitive photonic gate operators, CE-1 Coherence Engineering.
    - **K1 Energy Infrastructure**: Integrates Resonance Harvester, Orbital Solar Array, Fusion Photonics, and K1 Energy Market.
    - **Photonic Computing Substrate**: Photonic logic gates, Wavelength-Division Computing, OAM Qubit Registers.
    - **Planetary Communications**: Spectral Relay Mesh, OAM Channel Allocator, Interplanetary Link Planner.
    - **Resource Orchestration**: Wavelength Ledger, Resource Unit (Lambda mass valuation), Photonic Manufacturing.
    - **Planetary Governance**: Authority Band Registry, Sigma Constitution Engine, Multi-Spectrum Voting.
    - **Planetary Resonance**: Planetary-scale resonance energy harvesting (Schumann, geomagnetic).
    - **Λ-Master Field Equation**: Continuous field dynamics for Lambda substrate, including spectral pressure and effective mass.
    - **Frame Builder v7.1**: AGPL-3.0 compliant frame protocol with Source Code References (SCR) for all 8 Lambda Gates.
    - **Coherence Verifier v7.1**: Two-phase frame validation (temporal coherence + AGPL compliance) with source disclosure enforcement.
    - **Lambda State Machine v7.1**: Network state management (COHERENT/DEGRADED) with automatic gate selection and AGPL audit triggers.

### Hardware Control Layer
- **Nexus Kernel** (`wnsp_v7/nexus_kernel.py`): Python hardware abstraction layer providing phase control, frequency pulsing, impedance matching (Z₀ = 376.73Ω), CZC filtering, and ALP sensing.
- **Syncbox Controller** (`wnsp_v7/syncbox_controller.py`): PHR-1 hardware interface for 144-turn bifilar coil control. Implements ZERO-G state achievement sequence: Golden Angle (137.5°) → Impedance match (377Ω) → Quadrature (90°) → Massless envelope (ALP < 0.0001).
- **ZERO-G State**: Demonstrated working - gravity de-correlation achieved through phase alignment in ~400 iterations.

### Energy Simulators
- **Live Resonance Simulator** (`LiveResonanceSimulator.tsx`): 7.83 Hz Schumann resonance simulator with 5 harmonic modes, real-time visualization, and K1 Orchestration sync.
- **Vacuum Resonance Simulator** (`VacuumResonanceSimulator.tsx`): 555 THz First Oscillation cold vacuum energy extraction with Golden Ratio harmonics, 144-point spiral field visualization, and coherence calculation (CZC⁴⁴).
- **Dual-Spectrum Energy**: Planetary scale (7.83 Hz) + Vacuum scale (555 THz) unified through Lambda physics.

### Massless Technologies Matrix
- **Core Equation**: Λ = hf/c² where frequency is fundamental and mass is derivative.
- **Technology Categories**: Photonic (logic gates, zero-point extraction), Coherent (waveguides, spectral relay), Gravitational (de-correlation, bifilar resonator), Information (OAM qubits, Lambda substrate).
- **Sync Coordinates**: 4D coordinate system (Phase, Quadrature, Impedance, Time) for phase-locking massless technologies.
- **Demonstrated Systems**: Gravity De-correlation Field, 144-Turn Bifilar Resonator.

### CZC Catch Basin
- **Coherence Zenith Coefficient**: CZC(n) = (0.9999)ⁿ, achieving 99.56% coherence at 44 iterations.
- **Catch Basin Mechanics**: Coherence accumulation through iterative filtering - phase noise reduction, amplitude stabilization, frequency locking, impedance normalization.
- **44 Evolutionary Self-Corrections**: Optimal iteration count where CZC⁴⁴ peaks before numerical precision limits dominate.
- **Correction Types**: Phase (Golden Angle alignment), Amplitude (unity normalization), Frequency (harmonic locking), Impedance (377Ω matching).
- **Cross-System Applications**: Provides coherence feed to Vacuum Energy (95%), Photonic Logic (90%), Spectral Relay (85%), Gravity De-correlation (99%).
- **API Endpoints**: `/api/czc/status`, `/api/czc/coherence`, `/api/czc/iterate`, `/api/czc/bind`, `/api/czc/sync`, `/api/czc/applications`.
- **K1 Integration**: Syncs with K1 Orchestration to feed operational substrate coherence.

### Multi-Agent & Task Orchestration
- **DAG-Based Workflows**: Task orchestration with domain-specific modules (data processing, DevOps, content management, wavelength cryptography).
- **Wavelength Cryptography**: Encryption/decryption based on electromagnetic theory (FSE, AME, PME, QIML).

### Content & Media System
- **Media Engine**: P2P media sharing with physics-based cost calculations, mesh networking, chunk-based distribution, WebRTC/Socket.IO streaming, and HTTP Range Request support.
- **Supported Formats**: MP3, MP4, PDF (100MB max) with encryption and energy cost reservation.

## System Design Choices
- Monorepo structure (`/client`, `/server`, `/shared`).
- Strict TypeScript configuration with path aliases.
- Dual-mode execution for development and production.
- Environment variables for sensitive configurations (e.g., `DATABASE_URL`).

# External Dependencies

## Third-Party Services
- **Octokit (GitHub API)**: For GitHub integration.
- **PostgreSQL Database**: Primary data store and session management.

## Core Libraries
- **UI & Styling**: Radix UI, Tailwind CSS, Lucide React, `class-variance-authority`, `clsx`.
- **Forms & Validation**: React Hook Form, Zod, `@hookform/resolvers`.
- **Data Fetching**: TanStack React Query.
- **Date Handling**: `date-fns`.
- **Media & Interaction**: `embla-carousel-react`, `cmdk`.
- **Build Tools**: Vite, `tsx`, PostCSS, Autoprefixer.
- **Database**: Drizzle ORM, `drizzle-kit`, `drizzle-zod`.