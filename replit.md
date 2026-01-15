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

### Backend
- **Runtime**: Node.js with TypeScript (ESM)
- **Framework**: Express.js
- **Development**: `tsx` for hot-reload
- **Production**: Compiled CommonJS bundle
- **Session Management**: PostgreSQL-backed via `connect-pg-simple`

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