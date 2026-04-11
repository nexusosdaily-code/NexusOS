# Overview

The WNSP P2P Hub is a full-stack web application designed to be the foundational infrastructure for a Kardashev Type I civilization. It integrates a React/TypeScript frontend with an Express/Node.js backend and PostgreSQL. The project introduces a physics-based blockchain and communication system, leveraging novel cryptographic and economic systems derived from electromagnetic wave physics and Lambda Boson theory. Key capabilities include phone-based authentication, NXT token wallets, and peer-to-peer media sharing, all rooted in scientific principles for a scalable, secure, and decentralized network.

# User Preferences

Preferred communication style: Simple, everyday language.

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

### Data Layer
- **Database**: PostgreSQL for persistent data and session storage.
- **ORM**: Drizzle ORM, with `drizzle-zod` for type-safe schema validation.

## Feature Specifications

### Authentication & Wallet System
- **Authentication**: Phone number-based registration with initial NXT token allocation.
- **Wallet**: NXT token (8 decimals, 21 billion supply) with physics-based transaction costs (E=hf).

### Physics-Based Protocol Layer (WNSP)
- **Core Protocol**: Replaces traditional cryptographic hashing with electromagnetic wave physics, using Maxwell equation validation and wavelength-based addressing.
- **Quantum Economics**: Transaction costs are dynamically derived from wavelength-frequency-energy calculations.
- **Lambda Boson Theory**: Extends E=mc² with Λ = hf/c² for oscillating quanta, defining spectral authority bands.
- **WNSP Two-Layer Encoding Standard**: Includes WNSP-CE v1.0 (Character Encoding) and WNSP-SE v1.0 (Spectral Encoding) for mapping human-readable data to physical wave frames.
- **Hilbert Space Channel Model**: Defines 25,600 orthogonal communication channels using wavelength, orbital angular momentum, and polarization.
- **AI/OS Channel Coordination Layer**: Manages deterministic allocation of unique Ψ_channels for AI agents.

### WNSP AI Operating System Kernel (v1.0.0)
A Python kernel featuring:
- **Boot / Init Sequence**: A 5-phase boot process with auto-registration of core system agents.
- **Persistent State**: Utilizes PostgreSQL for agent, bus log, and kernel event data, with in-memory fallback.
- **Authority / Permission Layer**: Enforces access control via spectral authority bands (SYSTEM, KERNEL, USER, GUEST).
- **Interrupt / Event System**: A `KernelEventBus` with a publish-subscribe model and SSE streaming.
- **Dead Agent Watchdog**: Monitors agent activity and manages state (DEGRADED, RECLAIMED).

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