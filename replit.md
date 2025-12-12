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
    - **Wavefield Quantum Simulation**: Interactive quantum eigenstate superposition simulation.
    - **Lambda Gate Substrate v4**: 8 primitive photonic gate operators, CE-1 Coherence Engineering.
    - **K1 Energy Infrastructure**: Integrates Resonance Harvester, Orbital Solar Array, Fusion Photonics, and K1 Energy Market.
    - **Photonic Computing Substrate**: Photonic logic gates, Wavelength-Division Computing, OAM Qubit Registers.
    - **Planetary Communications**: Spectral Relay Mesh, OAM Channel Allocator, Interplanetary Link Planner.
    - **Resource Orchestration**: Wavelength Ledger, Resource Unit (Lambda mass valuation), Photonic Manufacturing.
    - **Planetary Governance**: Authority Band Registry, Sigma Constitution Engine, Multi-Spectrum Voting.
    - **Planetary Resonance**: Planetary-scale resonance energy harvesting (Schumann, geomagnetic).
    - **Λ-Master Field Equation**: Continuous field dynamics for Lambda substrate, including spectral pressure and effective mass.

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