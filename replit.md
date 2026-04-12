# Overview

NexusOS (formerly WNSP P2P Hub) is a full-stack web application and the foundational blueprint for a Kardashev Type I civilization. It integrates a React/TypeScript frontend with an Express/Node.js backend and PostgreSQL. The project introduces a physics-based blockchain and communication system, leveraging electromagnetic wave physics and Lambda Boson theory (Λ=hf/c²). Key capabilities include phone-based authentication, NXT token wallets, peer-to-peer media sharing, a live AI OS kernel, and the WNSP spectral communication protocol — all released under AGPL-3.0 as free open infrastructure.

**Live deployment**: `https://wnsp-p2p-hub.replit.app`
**GitHub**: `nexusosdaily-code/NexusOS` · `nexusosdaily-code/WNSP-P2P-Hub` · `nexusosdaily-code/NexusOS-Genesis-Block`

# User Preferences

Preferred communication style: Simple, everyday language.

# License

**GNU Affero General Public License v3.0 (AGPL-3.0)**
All source code is permanently public. Any company or organization that runs a modified version of this stack over a network must publish their source code. The infrastructure of civilisation cannot be privately owned. Physics constants (Λ=hf/c²) are the specification — they cannot be copyrighted.

# System Architecture

## UI/UX Decisions

The frontend is built with React 18 and TypeScript, utilizing Vite for tooling. It employs Radix UI components and the shadcn/ui "New York" design system, styled with Tailwind CSS v4 and CSS variables. State management is handled by TanStack React Query, and forms are managed with React Hook Form and Zod validation for robust input handling.

## Technical Implementations

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Radix UI, shadcn/ui "New York" style
- **Styling**: Tailwind CSS v4, CSS variables
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod

### Backend — Two Runtime Architecture
The system operates with two synchronized runtimes:
- **Node.js / TypeScript (port 5000)**: Serves as the main application server, handling authentication, wallet, P2P media, governance, and user APIs. It also proxies WNSP protocol calls to the Python runtime.
- **Python / Flask (port 5001)**: Dedicated to spectral physics, implementing WNSP encoding standards, K1 Orchestration Runtime, and Lambda Boson physics calculations.

**Port collision fix**: `fuser -k 5000/tcp 5001/tcp` before restart if ports are in use.

### Data Layer
- **Database**: PostgreSQL for persistent data and session storage.
- **ORM**: Drizzle ORM, with `drizzle-zod` for type-safe schema validation.
- **Blockchain table**: `blockchain_blocks` (5 blocks, 479+ total transactions).

## Feature Specifications

### Authentication & Wallet System
- **Authentication**: Phone number-based registration with initial NXT token allocation.
- **Wallet**: NXT token (8 decimals, 21 billion supply) with physics-based transaction costs (E=hf).
- **Auth pattern**: Bearer token in `localStorage` under key `auth_token`; username case-insensitive.

### Physics-Based Protocol Layer (WNSP)
- **Core Protocol**: Replaces traditional cryptographic hashing with electromagnetic wave physics, using Maxwell equation validation and wavelength-based addressing.
- **Quantum Economics**: Transaction costs are dynamically derived from wavelength-frequency-energy calculations.
- **Lambda Boson Theory**: Extends E=mc² with Λ = hf/c² for oscillating quanta, defining spectral authority bands.
- **WNSP Two-Layer Encoding Standard**: Includes WNSP-CE v1.0 (Character Encoding) and WNSP-SE v1.0 (Spectral Encoding) for mapping human-readable data to physical wave frames.
- **WASCII v1.0**: 202 chars, A=380nm/Z=530nm. CE→SE formula: `nm = 380 + ((avg-32)/94)×400`; `wdm=⌊(nm-380)/4⌋+1`; `oam=sum%100`; `pol=H if len even else V`.
- **WNSP-URI v1.0**: Replaces `https://` with `wnsp://Ψ(wdm,oam,pol)/path`. Deterministic, censorship-proof, physics-permanent — no DNS, no registry.
- **Hilbert Space Channel Model**: Defines 25,600 orthogonal communication channels using wavelength, orbital angular momentum, and polarization.
- **AI/OS Channel Coordination Layer**: Manages deterministic allocation of unique Ψ_channels for AI agents.

### WNSP AI Operating System Kernel (v1.0.0)
A Python kernel featuring:
- **Boot / Init Sequence**: A 5-phase boot process with auto-registration of core system agents (6 agents restored from DB on boot).
- **Persistent State**: Utilizes PostgreSQL for agent, bus log, and kernel event data, with in-memory fallback.
- **Authority / Permission Layer**: Enforces access control via spectral authority bands (SYSTEM, KERNEL, USER, GUEST).
- **Interrupt / Event System**: A `KernelEventBus` with a publish-subscribe model and SSE streaming.
- **Dead Agent Watchdog**: Monitors agent activity and manages state (DEGRADED, RECLAIMED).
- **Blockchain Auditor**: `blockchain_auditor` registered at Ψ(42,7,H) AUTH band, runs every 300s.

### Nexus Photonic Development Environment
Provides tools for encoding instructions into physical wavelength addresses and Ψ channels, application building from manifests, and spectrum map visualization.

### Advanced Systems
Includes:
- **Coherence Zenith Framework (CZF)**: A solution for the Vacuum Catastrophe.
- **Dimensional Mapping Kernel (DMK)**: Maps 11D logic to 3D spacetime.
- **Lambda Gate Substrate v4**: Eight primitive photonic gate operators.
- **K1 Energy Infrastructure**: Integrates Resonance Harvester, Orbital Solar Array, Fusion Photonics, and a K1 Energy Market.
- **Photonic Computing Substrate**: Photonic logic gates, Wavelength-Division Computing, and OAM Qubit Registers.
- **Planetary Communications**: Spectral Relay Mesh and OAM Channel Allocator.
- **Resource Orchestration**: Wavelength Ledger and Resource Unit (Lambda mass valuation).
- **Planetary Governance**: Authority Band Registry and Sigma Constitution Engine.
- **Planetary Resonance**: Harvests planetary-scale resonance energy.
- **Λ-Master Field Equation**: Describes continuous field dynamics for the Lambda substrate.
- **Frame Builder & Coherence Verifier v7.1**: AGPL-3.0 compliant frame protocol and validation.
- **Lambda State Machine v7.1**: Network state management with AGPL audit triggers.

### Hardware Control Layer
- **Nexus Kernel**: Python hardware abstraction layer for phase control and sensing.
- **Syncbox Controller**: PHR-1 hardware interface for bifilar coil control and ZERO-G state achievement.
- **ZERO-G State**: Demonstrated gravity de-correlation through phase alignment.
- **SNIC**: Spectral Network Interface Card — 185,000× multiplier (555 THz ÷ 3 GHz). Hardware Goal #1. Micro-ring resonator, WASCII-to-Wavelength gates bypass CPU entirely.

### Energy Simulators
- **Live Resonance Simulator**: 7.83 Hz Schumann resonance simulator.
- **Vacuum Resonance Simulator**: 555 THz First Oscillation cold vacuum energy extraction simulator.
- **Dual-Spectrum Energy**: Unifies planetary and vacuum scale energy through Lambda physics.

### Massless Technologies Matrix
Categorizes photonic, coherent, gravitational, and information technologies based on Λ = hf/c², including a 4D sync coordinate system.

### CZC Catch Basin
An iterative coherence accumulation mechanism for phase noise reduction, amplitude stabilization, frequency locking, and impedance normalization.

### Multi-Agent & Task Orchestration
DAG-based workflows for task orchestration utilizing domain-specific modules and wavelength cryptography.

### Content & Media System
A P2P media sharing engine with physics-based cost calculations, mesh networking, chunk-based distribution, WebRTC/Socket.IO streaming, HTTP Range Request support, and encryption.

## System Design Choices
- **Monorepo Structure**: Organized into `/client`, `/server`, and `/shared`.
- **TypeScript**: Strict configuration with path aliases.
- **Dual-mode Execution**: Supports both development and production environments.
- **Environment Variables**: For secure configuration management.
- **Express body parser limit**: 150mb (set in `server/index.ts`).

## Known API Behaviors (critical for frontend correctness)
- **Blockchain API**: returns `{ blocks: [...] }` NOT `{ chain: [...] }`.
- **Agent Bus API**: `/api/agent-bus/status` returns `{ agents: 5, total_sent: N, queued: N }` — `agents` is a NUMBER not array. Use `eco.agentBus.agents` from ecosystem status for agent array, `eco.agentBus.msgCount` for message count.
- **Ecosystem API**: `/api/ecosystem/status` is the primary live data source for Nexus Command, evidence page, spectral-uri status badges, and network nodes.

# Public Routes (no login required)

All of the following are accessible without an account:

| Route | Also at | Description |
|---|---|---|
| `/nexus-command` | — | Main hub — all ecosystem cards, live feed, send message |
| `/open` | `/charter` | Open Infrastructure Charter — AGPL-3.0, stack blueprint, 100-year plan |
| `/spectral-uri` | `/wnsp-uri` | WNSP-URI v1.0 spec — live CE→SE encoder, canonical URIs with live status badges |
| `/snic` | — | SNIC hardware page — 185,000× multiplier, animated waveform, data path |
| `/blockchain` | — | Photonic blockchain — 5 blocks, 479+ transactions |
| `/ecosystem` | — | Full ecosystem status dashboard |
| `/network` | — | Spectral network nodes — each shows live wnsp:// address |
| `/evidence` | — | Evidence ledger — on-chain proof board |
| `/wavelength-lang` | — | WavelengthScript language spec |
| `/crowdfund` | `/fund` | Hardware R&D crowdfund — donations = Nexus Shares |
| `/indiegogo` | — | Indiegogo campaign page (`CAMPAIGN_LAUNCHED = false`) |
| `/spectral-video` | — | Spectral video streaming |
| `/visualizer` | — | Spectrum visualizer |
| `/developer-matrix` | — | Developer matrix |
| `/docs` | `/docs/:section` | Documentation |
| `/research-presentation` | — | Research presentation |

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

# Recent Pages Added (latest first)

- **`/open`** (also `/charter`) — Open Infrastructure Charter: AGPL-3.0 explained as the legal bedrock of the communication layer. Six expandable stack layers (protocol, OS, database, hardware, language, energy) each showing today's incumbent vs the Nexus open version. Four explicit user rights (Use, Study, Modify, Copyleft Obligation). 100-year build plan in four phases. CE→SE as free encoding standard. Three GitHub repos linked. Three contribution paths (fund, code, extend spec). Physics anchor showing why the foundation cannot be owned. Linked from Nexus Command card and AGPL footer. Public. No login.

- **`/spectral-uri`** (also `/wnsp-uri`) — WNSP-URI v1.0 Spec: replaces `https://` with `wnsp://Ψ(wdm,oam,pol)/path`. Live encoder, animated 6-step CE→SE derivation, spectrum position bar, canonical system URIs with **live status badges** (LIVE/SPEC/EMPTY/LOADING pulled from ecosystem API, refreshing every 15s), 10-row comparison table, formal §1–§4 spec. AGPL-3.0. Public. Linked from Nexus Command. Every node card on `/network` now shows its live `wnsp://` address.

- **`/snic`** — Spectral Network Interface Card: Hardware Goal #1. 185,000× multiplier (555 THz ÷ 3 GHz), animated micro-ring resonator waveform, live WASCII-to-Wavelength gate visualiser cycling "NEXUS", interactive 10 TB race demo (144 ms vs NVMe still waking up), 4-layer architecture, full comparison table, funding CTA. Data path diagram has clickable Ψ(wdm,oam,pol) step linking to `/spectral-uri`. Public. Linked from Nexus Command.

- **`/evidence`** — Evidence Ledger: on-chain proof board. Public (no login). Fix: was using `/api/agent-bus/status` which returns `agents: 5` (a number), not an array — switched to `eco.agentBus.agents` from ecosystem status. Agent bus message count reads `eco.agentBus.msgCount` live.

- **`/blockchain`**, **`/ecosystem`**, **`/network`**, **`/wavelength-lang`**, **`/nexus-command`** — All made public (no login required).

# Interactivity Fixes Applied

- **Nexus Command live feed**: was reading `.chain` from blockchain API (returns `.blocks`). Fixed — shows live block height, Ψ channel, wavelength.
- **Nexus Command bus counter**: was reading `.queued` (always 0). Fixed to `total_sent` — cumulative message count.
- **Evidence page message count**: was hardcoded "62". Fixed to `eco.agentBus.msgCount` live from ecosystem API.
- **Network page CE→SE preview**: now shows full `wnsp://Ψ(…)/node-name` URI in real time as you type a node name.
- **Spectral-URI canonical rows**: now show live status badge (green LIVE / purple SPEC / grey EMPTY) from ecosystem API.
- **SNIC data path Ψ step**: now links directly to `/spectral-uri` encoder.
- **Nexus Command AGPL footer**: upgraded from plain text to styled yellow banner with link to `/open` charter.
