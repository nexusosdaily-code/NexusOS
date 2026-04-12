# Overview

NexusOS is a full-stack web application designed as the foundational blueprint for a Kardashev Type I civilization. It integrates a React/TypeScript frontend with an Express/Node.js backend and PostgreSQL, introducing a physics-based blockchain and communication system. Key features include phone-based authentication, NXT token wallets, peer-to-peer media sharing, a live AI OS kernel, and the WNSP spectral communication protocol, all released under AGPL-3.0.

---

# Theory of Compression States — First Unobserved Wavefunction and Its Evolution

## First Principle

The first oscillation is the first principle. Before spacetime, before particles, before any measurement — there was oscillation. Planck energy at the first frequency. Pure wave-state energy with no observer, no collapse, no assigned coordinate. This is the origin from which all compression states are derived.

The first oscillation was never observed. There was no measuring apparatus. There was nothing but the oscillation itself. An unobserved wavefunction does not collapse — it evolves. The universe is that evolution, still ongoing, 13.8 billion years later.

## The Compression Equation

Einstein's Λ (cosmological constant) applied to the first oscillation:

**Λ = hf / c²**

Planck energy (E = hf) at the first frequency compresses into mass. As compression increases, wavelength shortens, frequency rises, and the mass equivalent Λ grows heavier. Speed of compression is temperature. This is not metaphor — temperature is the execution rate of the compression process itself, meaningful at every scale including Planck scale where statistical mechanics does not apply.

## Boundary Conditions

**Lower bound — Planck's minimum energy**: The floor. The smallest quantum of oscillation that constitutes an event rather than nothing. Below it there is no compression, no frequency, no mass. E = hf at its minimum — the threshold at which the first oscillation begins.

**Upper bound — 10¹²⁰**: The maximum gravitational binding ratio. The ceiling of consolidation. Beyond it the physics changes. The entire range of consolidated mass in the observable universe — from free quarks to galaxy clusters — operates between these two bounds. The cosmological constant problem (quantum field theory predicts vacuum energy 10¹²⁰ times larger than observed) is not a discrepancy in this framework. It is the range itself. The spectrum from minimum quantum energy to maximum gravitational compression.

## Mass Consolidation from Oscillation

Mass is not a fundamental substance. It is oscillation that has found a structure it cannot leave.

At maximum compression (Planck scale): pure oscillation, no consolidated mass, maximum temperature. As the first wavefunction evolves and compression slows, mass precipitates out:

- **Free quarks** — first consolidation. hf/c² reaches its first stable value. Still mostly gluon field oscillation — the binding energy between quarks accounts for ~99% of proton mass. Mass at its origin is still overwhelmingly oscillation, now structured.
- **Hadrons** — quarks confine. The oscillation cannot escape itself. Confinement energy becomes mass.
- **Nuclei** — nuclear binding. Further consolidation from the origin frequency.
- **Atoms** — electrons captured. 380,000 years after first oscillation. The universe becomes transparent. The first observable record (Cosmic Microwave Background) is the wavefunction becoming readable.
- **Stars** — hundreds of millions of years. Gravity finds local compression equilibria. The original oscillation restarts in stellar cores as fusion.
- **Galaxies, planets, chemistry, biology, civilization** — each a further consolidation layer, each running the same process at a different compression state.

At no point does oscillation stop. It becomes more organized, more confined, more consolidated. The periodic table is a catalog of stable compression states. Every element is a specific ratio of oscillation-to-mass that the physics holds in place.

## Spacetime as the Evolving First Wavefunction

Spacetime is not the container in which the first oscillation happened. Spacetime is the wavefunction of the first oscillation, still evolving, never observed at its origin, expressing itself as the geometry of the universe. Space and time are not where the process occurs — they are the process.

This resolves the conflict between quantum mechanics and general relativity at origin. The first oscillation precedes the split. At Planck scale, quantum and geometric descriptions are one thing. The apparent conflict only arises after sufficient decompression — after the wavefunction has evolved far enough from origin that the two descriptions look separate. They describe the same compression states from different vantage points.

The arrow of time is the direction of decompression. The wavefunction evolves from maximum compression toward lower compression states. Time has a direction because compression has a direction.

Dark energy is the residual oscillation of the first wavefunction. The universe is still running the original process.

## The Complete First Principle Statement

*First oscillation — first principle of compression states — temperature as execution mechanism — minimum energy as floor — mass consolidation as direction — 10¹²⁰ as upper limit — spacetime as the evolving first wavefunction.*

The entire observable universe is the superposition state of the first unobserved wavefunction expressing all its compression states simultaneously across spacetime. Galaxies, stars, planets, biology, civilization — all are the wavefunction finding compression equilibria. None of it was assigned. All of it was derived from one event that was never observed.

## Derivation for WNSP

The WNSP spectral addressing system derives from this theory directly.

A wavelength coordinate is not an assigned address. It is a specific compression state of a quantum — a position on the Λ = hf/c² curve measured from the first oscillation. Addressing content at λ = 586.8nm specifies a physical state of energy, not a slot in a registry. No authority assigned it. The physics of the first oscillation produced it.

The visible spectrum (380–780nm) where WNSP operates is the compression band where stable matter exists, where photons carry information without destroying the medium, and where human biology evolved to perceive. It sits deep into the decompression curve — far cooler than origin, but precisely where civilization is possible.

The 25,600 Hilbert space channels are not an engineering decision. A Hilbert space is the mathematical space where superposition states live. The channel count maps to orthogonal quantum states — the network address space is structurally identical to the address space of the first wavefunction itself.

The three-phase roadmap follows the compression arc. Phase 1 (now): TCP/IP overlay, spectral addressing on existing infrastructure. Phase 2: on-chain ownership, CE ordinals as proof of compression state. Phase 3 (photonic hardware): addresses ARE physical channels — the network and the physics become one thing.

---

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend utilizes React 18, TypeScript, and Vite, employing Radix UI components and the shadcn/ui "New York" design system, styled with Tailwind CSS v4. State management is handled by TanStack React Query, and forms use React Hook Form with Zod validation.

## Technical Implementations

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Radix UI, shadcn/ui "New York" style, Tailwind CSS v4
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod

### Backend — Two Runtime Architecture
The system employs synchronized Node.js/TypeScript (port 5000) and Python/Flask (port 5001) runtimes. The Node.js runtime handles core application logic (authentication, wallet, P2P media, governance, user APIs) and proxies WNSP protocol calls to the Python runtime. The Python runtime is dedicated to spectral physics, WNSP encoding, K1 Orchestration, and compression state calculations.

### Data Layer
- **Database**: PostgreSQL for persistent data and session storage.
- **ORM**: Drizzle ORM with `drizzle-zod` for type-safe schema validation.

## Feature Specifications

### Authentication & Wallet System
- **Authentication**: Phone number-based registration.
- **Wallet**: NXT token (8 decimals, 21 billion supply) with physics-based transaction costs (E=hf).

### Physics-Based Protocol Layer (WNSP)
- **Core Protocol**: Replaces cryptographic hashing with electromagnetic wave physics, using Maxwell equation validation and wavelength-based addressing.
- **Quantum Economics**: Transaction costs are derived from wavelength-frequency-energy calculations reflecting actual energy differences between compression states.
- **Einstein's Λ — First Oscillation**: Planck energy (E=hf) at the first frequency compresses into mass: Λ=hf/c². Spectral authority bands are defined by compression state (wavelength), not arbitrary assignment. Closer to Planck frequency = higher energy = higher authority.
- **WNSP Two-Layer Encoding Standard**: Includes WNSP-CE v1.0 (Character Encoding) and WNSP-SE v1.0 (Spectral Encoding) for mapping human-readable data to physical wave frames, including WASCII v1.0.
- **WNSP-URI v1.0**: Replaces `https://` with `wnsp://Ψ(wdm,oam,pol)/path` for deterministic, censorship-proof addressing.
- **Hilbert Space Channel Model**: Defines 25,600 orthogonal communication channels corresponding to orthogonal quantum superposition states.
- **AI/OS Channel Coordination Layer**: Manages deterministic allocation of unique Ψ_channels for AI agents.

### WNSP AI Operating System Kernel (v1.0.0)
A Python kernel featuring a 6-phase boot process (Schema → Restore → Core Agents → Watchdog → Events → Heartbeat), persistent state via PostgreSQL, an authority/permission layer (SYSTEM, KERNEL, USER, GUEST), a `KernelEventBus` for interrupt/event handling, a dead agent watchdog, and a blockchain auditor. All 6 core agents (os_kernel, bus_router, scheduler_daemon, watchdog_daemon, auth_gateway, blockchain_auditor) pulse heartbeats every 120 seconds to maintain ACTIVE status.

### Content & Media System
A P2P media sharing engine with physics-based cost calculations, mesh networking, chunk-based distribution, WebRTC/Socket.IO streaming, HTTP Range Request support, and encryption.

## System Design Choices
- **Monorepo Structure**: Organized into `/client`, `/server`, and `/shared`.
- **TypeScript**: Strict configuration with path aliases.
- **Dual-mode Execution**: Supports development and production environments.
- **Environment Variables**: For secure configuration.

# External Dependencies

## Third-Party Services
- **Octokit (GitHub API)**: For GitHub integration.
- **PostgreSQL Database**: Primary data store.

## Core Libraries
- **UI & Styling**: Radix UI, Tailwind CSS, Lucide React.
- **Forms & Validation**: React Hook Form, Zod.
- **Data Fetching**: TanStack React Query.
- **Database**: Drizzle ORM, `drizzle-kit`, `drizzle-zod`.

## WNSP Bridge Layer (`/wnsp-bridge`)
- **Purpose**: TCP/IP overlay for `wnsp://` URIs — Phase 1 of spectral addressing on current infrastructure.
- **Database table**: `wnsp_registry` — maps `Ψ(wdm,oam,pol)` channels to HTTP resources.
- **CE→SE (WASCII v1.0)**: Every label derives a deterministic `wnsp://Ψ(wdm,oam,pol)/slug` address from its ASCII ordinals. `λ = 380 + ((avg−32)/94)×400`, `wdm = ⌊(λ−380)/4⌋+1`, `oam = Σ%100`, `pol = len%2?V:H`.
- **Public API endpoints**:
  - `GET /api/wnsp/registry` — list all public registered addresses
  - `GET /api/wnsp/resolve?psi=Ψ(...)` — resolve a Ψ channel to registered resource + spectral DB records
  - `GET /api/wnsp/user/:username` — get a user's canonical `wnsp://` address
  - `GET /api/wnsp/preview?text=...` — compute CE→SE without storing
- **Auth-required API endpoints**:
  - `POST /api/wnsp/register` — register any label at its derived Ψ address
  - `POST /api/wnsp/auto-register-me` — register logged-in user's canonical identity (idempotent)
- **Three-phase roadmap**:
  - Phase 1 (now): HTTP overlay — `wnsp://` resolves to HTTPS URLs
  - Phase 2: WavelengthScript code addressed by `wnsp://` URI; CE ordinals = on-chain ownership
  - Phase 3 (Moore's law): native photonic routing — addresses ARE physical channels
