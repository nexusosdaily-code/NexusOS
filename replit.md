# Overview

The WNSP P2P Hub is a full-stack web application implementing a physics-based blockchain and communication system. It integrates a React/TypeScript frontend with an Express/Node.js backend and PostgreSQL. The project introduces novel cryptographic and economic systems rooted in electromagnetic wave physics and Lambda Boson theory, including phone-based authentication, NXT token wallets, and peer-to-peer media sharing. Its ultimate goal is to provide infrastructure for a Kardashev Type I civilization.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend uses React 18 with TypeScript, Vite, Radix UI components, and the shadcn/ui "New York" design system, styled with Tailwind CSS v4 and CSS variables. State management is handled by TanStack React Query, and forms use React Hook Form with Zod validation.

## Technical Implementations

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Radix UI, shadcn/ui "New York" style
- **Styling**: Tailwind CSS v4, CSS variables
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod

### Backend — Two Runtime Architecture
The system employs two distinct, synchronized runtimes:

**Runtime 1 — Node.js / TypeScript (port 5000)**
- **Framework**: Express.js
- **Role**: Main application server for authentication, wallet, P2P media, governance, and user APIs. It acts as a secure, rate-limited gateway, proxying WNSP protocol calls to the Python runtime.
- **Session Management**: PostgreSQL-backed via `connect-pg-simple`

**Runtime 2 — Python / Flask (port 5001)**
- **Framework**: Flask with flask-cors
- **Role**: Spectral physics engine, implementing WNSP encoding standards, K1 Orchestration Runtime, and Lambda Boson physics calculations. It does not handle authentication or user state.

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema**: Shared `/shared/schema.ts` with `drizzle-zod` for type safety
- **Session Storage**: Directly in PostgreSQL

## Feature Specifications

### Authentication & Wallet System
- **Authentication**: Phone number-based registration (prototype). New users receive 500,000,000 units (5 NXT tokens).
- **Wallet**: NXT token (8 decimals, 21 billion supply) with physics-based transaction costs (E=hf).

### Physics-Based Protocol Layer (WNSP)
- **Core Protocol**: Replaces cryptographic hashing with electromagnetic wave physics, using Maxwell equation validation and wavelength-based addressing.
- **Quantum Economics**: Transaction costs derived from wavelength-frequency-energy calculations.
- **Lambda Boson Theory**: Core equation Λ = hf/c², extending E=mc² to oscillating quanta, with spectral authority bands.
- **WNSP Two-Layer Encoding Standard**:
    - **WNSP-CE v1.0 (Character Encoding)**: Converts human-readable symbols into normalized ordinal tokens.
    - **WNSP-SE v1.0 (Spectral Encoding)**: Maps WNSP-CE tokens into physical wave frames based on Λ = hf/c².
- **Hilbert Space Channel Model**: Defines 25,600 orthogonal channels using wavelength, orbital angular momentum, and polarization for collision-free communication.
- **AI/OS Channel Coordination Layer**: Manages deterministic allocation, mapping, and release of unique Ψ_channels for AI agents.

### WNSP AI Operating System Kernel (v1.0.0)
A five-component Python kernel managing system operations:
1.  **Boot / Init Sequence**: 5-phase boot with auto-registration of core system agents.
2.  **Persistent State**: Uses PostgreSQL tables for agent, bus log, and kernel event data, with graceful degradation to in-memory mode if PostgreSQL is unavailable.
3.  **Authority / Permission Layer**: Enforces access control based on spectral authority bands (SYSTEM, KERNEL, USER, GUEST) where lower rank equals higher authority.
4.  **Interrupt / Event System**: A `KernelEventBus` with publish-subscribe model for 8 interrupt types, including SSE streaming.
5.  **Dead Agent Watchdog**: A background thread that monitors agent activity, marking agents as DEGRADED or RECLAIMED based on TTL, exempting core system agents.

### Nexus Photonic Development Environment
Tools for encoding instructions into physical wavelength addresses and Ψ channels, building applications from manifests, and visualizing spectrum maps.

### Advanced Systems
Includes:
-   **Coherence Zenith Framework (CZF)**: A non-derivative solution to the Vacuum Catastrophe, achieving high coherence through self-corrections.
-   **Dimensional Mapping Kernel (DMK)**: Maps 11D logic to 3D spacetime.
-   **Lambda Gate Substrate v4**: 8 primitive photonic gate operators.
-   **K1 Energy Infrastructure**: Integrates Resonance Harvester, Orbital Solar Array, Fusion Photonics, and a K1 Energy Market.
-   **Photonic Computing Substrate**: Photonic logic gates, Wavelength-Division Computing, OAM Qubit Registers.
-   **Planetary Communications**: Spectral Relay Mesh, OAM Channel Allocator.
-   **Resource Orchestration**: Wavelength Ledger, Resource Unit (Lambda mass valuation).
-   **Planetary Governance**: Authority Band Registry, Sigma Constitution Engine.
-   **Planetary Resonance**: Harvests planetary-scale resonance energy.
-   **Λ-Master Field Equation**: Describes continuous field dynamics for the Lambda substrate.
-   **Frame Builder v7.1 & Coherence Verifier v7.1**: AGPL-3.0 compliant frame protocol and validation with source disclosure enforcement.
-   **Lambda State Machine v7.1**: Network state management and AGPL audit triggers.

### Hardware Control Layer
-   **Nexus Kernel**: Python hardware abstraction layer for phase control, frequency pulsing, impedance matching, CZC filtering, and ALP sensing.
-   **Syncbox Controller**: PHR-1 hardware interface for 144-turn bifilar coil control, implementing the ZERO-G state achievement sequence.
-   **ZERO-G State**: Demonstrated gravity de-correlation through phase alignment.

### Energy Simulators
-   **Live Resonance Simulator**: 7.83 Hz Schumann resonance simulator with 5 harmonic modes and K1 Orchestration sync.
-   **Vacuum Resonance Simulator**: 555 THz First Oscillation cold vacuum energy extraction with Golden Ratio harmonics and coherence calculation.
-   **Dual-Spectrum Energy**: Unifies planetary (7.83 Hz) and vacuum (555 THz) scale energy through Lambda physics.

### Massless Technologies Matrix
Technologies based on Λ = hf/c², categorizing photonic, coherent, gravitational, and information technologies. Includes a 4D sync coordinate system for phase-locking.

### CZC Catch Basin
Iterative coherence accumulation mechanism (44 self-corrections) for phase noise reduction, amplitude stabilization, frequency locking, and impedance normalization, providing coherence feed to various system applications.

### Multi-Agent & Task Orchestration
DAG-based workflows for task orchestration with domain-specific modules and wavelength cryptography.

### Content & Media System
P2P media sharing engine with physics-based cost calculations, mesh networking, chunk-based distribution, WebRTC/Socket.IO streaming, HTTP Range Request support, and encryption.

## System Design Choices
-   Monorepo structure (`/client`, `/server`, `/shared`).
-   Strict TypeScript configuration with path aliases.
-   Dual-mode execution for development and production.
-   Environment variables for sensitive configurations.

# External Dependencies

## Third-Party Services
-   **Octokit (GitHub API)**: For GitHub integration.
-   **PostgreSQL Database**: Primary data store and session management.

## Core Libraries
-   **UI & Styling**: Radix UI, Tailwind CSS, Lucide React, `class-variance-authority`, `clsx`.
-   **Forms & Validation**: React Hook Form, Zod, `@hookform/resolvers`.
-   **Data Fetching**: TanStack React Query.
-   **Date Handling**: `date-fns`.
-   **Media & Interaction**: `embla-carousel-react`, `cmdk`.
-   **Build Tools**: Vite, `tsx`, PostCSS, Autoprefixer.
-   **Database**: Drizzle ORM, `drizzle-kit`, `drizzle-zod`.