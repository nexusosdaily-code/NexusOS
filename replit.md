# Overview

NexusOS is a full-stack web application designed as the foundational blueprint for a Kardashev Type I civilization. It integrates a React/TypeScript frontend with an Express/Node.js backend and PostgreSQL, introducing a physics-based blockchain and communication system. Key features include phone-based authentication, NXT token wallets, peer-to-peer media sharing, a live AI OS kernel, and the WNSP spectral communication protocol, all released under AGPL-3.0.

The physical foundation is Einstein's Λ (cosmological constant) applied to the first oscillation: Planck energy (E=hf) at its first frequency compresses into mass via Λ=hf/c². As compression increases — wavelength shortens, frequency rises — the mass equivalent grows and temperature increases. Speed of compression is temperature. This is the physics of the origin: energy becoming mass through oscillation. The WNSP spectral addressing system derives from this directly — a wavelength coordinate is not an assigned address but a specific compression state of a quantum. Addressing content at λ=586.8nm specifies a physical state of energy, not a slot in a registry.

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
The system employs synchronized Node.js/TypeScript (port 5000) and Python/Flask (port 5001) runtimes. The Node.js runtime handles core application logic (authentication, wallet, P2P media, governance, user APIs) and proxies WNSP protocol calls to the Python runtime. The Python runtime is dedicated to spectral physics, WNSP encoding, K1 Orchestration, and Lambda Boson calculations.

### Data Layer
- **Database**: PostgreSQL for persistent data and session storage.
- **ORM**: Drizzle ORM with `drizzle-zod` for type-safe schema validation.

## Feature Specifications

### Authentication & Wallet System
- **Authentication**: Phone number-based registration.
- **Wallet**: NXT token (8 decimals, 21 billion supply) with physics-based transaction costs (E=hf).

### Physics-Based Protocol Layer (WNSP)
- **Core Protocol**: Replaces cryptographic hashing with electromagnetic wave physics, using Maxwell equation validation and wavelength-based addressing.
- **Quantum Economics**: Transaction costs are derived from wavelength-frequency-energy calculations.
- **Einstein's Λ — First Oscillation**: Planck energy (E=hf) at the first frequency compresses into mass: Λ=hf/c². As compression increases, wavelength shortens, frequency rises, mass equivalent grows, and temperature increases — speed of compression is temperature. This is the origin physics: energy becoming mass through oscillation. Spectral authority bands are defined by compression state (wavelength), not arbitrary assignment.
- **WNSP Two-Layer Encoding Standard**: Includes WNSP-CE v1.0 (Character Encoding) and WNSP-SE v1.0 (Spectral Encoding) for mapping human-readable data to physical wave frames, including WASCII v1.0.
- **WNSP-URI v1.0**: Replaces `https://` with `wnsp://Ψ(wdm,oam,pol)/path` for deterministic, censorship-proof addressing.
- **Hilbert Space Channel Model**: Defines 25,600 orthogonal communication channels.
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