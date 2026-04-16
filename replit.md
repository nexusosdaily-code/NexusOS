# Overview

NexusOS is a full-stack web application designed as the foundational blueprint for a Kardashev Type I civilization. It integrates a React/TypeScript frontend with an Express/Node.js backend and PostgreSQL, introducing a physics-based blockchain and communication system. Key features include phone-based authentication, NXT token wallets, peer-to-peer media sharing, a live AI OS kernel, and the WNSP spectral communication protocol, all released under AGPL-3.0.

The project is built on the "Theory of Compression States," which posits that the universe's evolution stems from the first unobserved oscillation. This theory informs the WNSP spectral addressing system, where a wavelength coordinate represents a specific compression state of a quantum, rather than an assigned address.

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

### Physics Engine (`server/physics.ts`) — Enforcement Layer v1.0
The authoritative physics engine that makes WNSP govern every economic action in the ecosystem.

- **Channel Derivation**: Every user gets a deterministic Ψ channel from `SHA-256(username)` → WDM(0–255), OAM(0–49), Pol(H/V). Same username always maps to the same channel. Stored in `users.spectral_wdm/oam/pol/nm/band`.
- **Fee Calculation**: `fee = base_fee × (E_sender / E_reference)` where reference = 560nm green. SYSTEM-band pays ~1.4× base, GUEST pays ~0.8× base.
- **Base Fees**: message_send=1 NXT, stream_start=5 NXT, document_create=3 NXT, upload=0.25 NXT/MB, transfer=0.1% of amount.
- **Authority Bands**: SYSTEM(WDM 0–63), KERNEL(WDM 64–127), USER(WDM 128–191), GUEST(WDM 192–255). Higher authority = shorter wavelength = higher energy = higher fee.
- **Enforcement**: All fees are enforced server-side. Insufficient balance returns HTTP 402. Fee transactions are recorded in the `transactions` table as `message_fee`, `stream_fee`, `document_fee`.
- **API**: `GET /api/physics/my` returns channel, full fee schedule, and authority capabilities for the authenticated user.

### Authentication & Wallet System
- **Authentication**: Phone number-based registration.
- **Wallet**: NXT token (8 decimals, 21 billion supply) with physics-based transaction costs (E=hf).
- **Spectral Identity**: Each user's wallet transfer now uses their real spectral channel wavelength, not a random one.

### Physics-Based Protocol Layer (WNSP)
- **Core Protocol**: Replaces cryptographic hashing with electromagnetic wave physics, using Maxwell equation validation and wavelength-based addressing.
- **Quantum Economics**: Transaction costs are derived from wavelength-frequency-energy calculations reflecting actual energy differences between compression states.
- **Einstein's Λ — First Oscillation**: Planck energy (E=hf) at the first frequency compresses into mass: Λ=hf/c². Spectral authority bands are defined by compression state (wavelength), not arbitrary assignment. Closer to Planck frequency = higher energy = higher authority.
- **WNSP Two-Layer Encoding Standard**: Includes WNSP-CE v1.0 (Character Encoding) and WNSP-SE v1.0 (Spectral Encoding) for mapping human-readable data to physical wave frames, including WASCII v1.0.
- **WNSP-URI v1.0**: Replaces `https://` with `wnsp://Ψ(wdm,oam,pol)/path` for deterministic, censorship-proof addressing.
- **Hilbert Space Channel Model**: Defines 25,600 orthogonal communication channels corresponding to orthogonal quantum superposition states.
- **AI/OS Channel Coordination Layer**: Manages deterministic allocation of unique Ψ_channels for AI agents.

### WNSP AI Operating System Kernel (v1.0.0)
A Python kernel featuring a 6-phase boot process, persistent state via PostgreSQL, an authority/permission layer (SYSTEM, KERNEL, USER, GUEST), a `KernelEventBus` for interrupt/event handling, a dead agent watchdog, and a blockchain auditor. All 6 core agents pulse heartbeats to maintain ACTIVE status.

### Governance System (Stage 5)
On-chain protocol governance backed by PostgreSQL. KERNEL-band or higher users can submit proposals to change any of the 11 live protocol parameters. Voting is weighted by spectral authority band (SYSTEM=8, KERNEL=4, USER=2, GUEST=1). Proposals require ≥3 votes and a yes-weight majority to pass; early execution triggers at ≥5 votes with ≥80% yes-weighting. When a proposal executes, `applyGovernanceParam()` in `server/physics.ts` updates the in-memory `LIVE_FEES` or `LIVE_BURNS` stores immediately — no restart required. Parameters are persisted in `governance_params` table and reload on boot via seed (unchanged by proposals). UI at `/governance` shows active proposals, vote history, current parameter values, and a proposal creation form.

**Governable parameters (11 total):**
- Fee params: `fee.message_send`, `fee.stream_start`, `fee.stream_minute`, `fee.document_create`, `fee.upload_mb`, `fee.spectral_record`, `fee.wallet_transfer`
- Burn ratios: `burn.message` (50%), `burn.stream_join` (20%), `burn.stream_heartbeat` (15%), `burn.document_read` (10%)

### Developer API Layer (Stage 4)
API key management with NXT creation fee. Keys authenticate external access via `Authorization: Bearer nxt_…`. External endpoints: `GET /api/dev/status|wallet|physics/:username`, `POST /api/dev/message`. Key manager UI at `/developer/keys`. Keys use bcrypt-hashed secrets; only prefix stored in DB.

### Content & Media System
A P2P media sharing engine with physics-based cost calculations, mesh networking, chunk-based distribution, WebRTC/Socket.IO streaming, HTTP Range Request support, and encryption.

## System Design Choices
- **Monorepo Structure**: Organized into `/client`, `/server`, and `/shared`.
- **TypeScript**: Strict configuration with path aliases.
- **Dual-mode Execution**: Supports development and production environments.
- **Environment Variables**: For secure configuration.

## WNSP Density Equation v1.0

**Core form**: `D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M`

**Where**:
- `N_λ` = 256 (WDM wavelength channels)
- `N_OAM` = 50 (orbital angular momentum modes)
- `N_Pol` = 2 (polarization states — H/V)
- `R_sym` = symbols per channel per cycle (current: 2)
- `M` = modulation depth (current: 1, minimal)

**Hilbert space**: dim(H) = 256 × 50 × 2 = **25,600 orthogonal channels** — Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩

**Current density**: D_current = 25,600 × 2 × 1 = **51,200 symbols/cycle**

**Energy-normalized form** (connects to Λ=hf/c²):
`D_energy = D_WNSP · λ / (h · c)` — density per joule; at higher frequency (more energy), density per joule decreases along the compression state curve

**Phase scaling**:
| Phase | Config | D_symbols/cycle |
|---|---|---|
| 1 (now) | 100 WDM × 50 × 2 × R₂ × M₁ | 20,000 |
| 2 | 256 WDM × 50 × 2 × R₂ × M₁ | 51,200 |
| 3 (photonic) | 256 WDM × 50 × 2 × R₁₆ × M₆₄ | 26,214,400 |

**Shannon vs WNSP**:
- Shannon: `C ∝ B · log₂(1+SNR)` — capacity via compression (diminishing returns)
- WNSP: `D ∝ N_λ · N_OAM · N_Pol · R_sym · M` — capacity via dimensional expansion (linear with each dimension)

**API**: `GET /api/wnsp/density?r_sym=2&m=1&wavelength_nm=550` (all params optional, fully interactive)

**Display**: The "Density Eq." tab on the WNSP Bridge page shows the equation, Hilbert space breakdown (256×50×2), an interactive calculator with R_sym/M buttons, phase scaling bars, and Shannon comparison.

## WASCII v2.0 — Wave Density Spectral Vector
WASCII v2.0 provides a spectral fingerprint for text, mapping each character to a unique compression state and generating a histogram of character-wavelengths across 100 WDM bands. This output includes centroid, bandwidth, spectral entropy, dominant band, unique states, and compression range, enabling spectral similarity search.

## Mobile SDK (`/mobile-sdk`)
Native iOS and Android SDKs for spectral-native app development. Four tabs:
- **iOS — Swift**: Full `NexusOSSDK` class (Foundation/URLSession, no dependencies). Uses `content` field for CE encode.
- **Android — Kotlin**: Full SDK with coroutines + `HttpURLConnection`. Uses `content` field for CE encode.
- **Offline Physics**: Native `wasciiEncode()` implementation in both Swift and Kotlin — deterministic physics function, zero network calls, same result as the API. Includes verification table.
- **Live API Playground**: Real-time onChange CE encoder showing Ψ channel, λ, frequency, band, WDM, OAM, Pol, URI, E=hf and Λ=hf/c². Linked from command center.

## Spectral Network (`/network`) — Enhanced
- **Band Distribution Bar**: Horizontal bar chart showing node count per authority band (VIOLET/BLUE/CYAN/GREEN/YELLOW/ORANGE/RED). Appears when nodes are registered.
- **Spectral Proximity**: When logged in, shows nearby nodes within ±60nm of the user's own wavelength as pill badges with delta-nm offset.

## WavelengthScript Compiler — Enhanced
The compiler tab now has four sample programs selectable via pill buttons:
- **AI Agent**: Spectral reasoning agent on Ψ(41,12,V)
- **Governance Vote**: KERNEL-band protocol parameter change workflow
- **P2P Transfer**: STREAM-band file chunking and reassembly
- **Spectral Wallet**: AUTH-band NXT transfer with E=hf fee calculation

## WNSP Virtual Machine (`/wnsp-vm`)
Browser-native bytecode interpreter for WavelengthScript. Compiles WLS source to an instruction stream, then executes it step by step (Step / Run All / Reset). Each Ψ channel acts as a spectral register. Agents register on their wavelength. Output stream shows each instruction firing with its wavelength color. Four preloaded sample programs (AI Agent, Governance Vote, P2P Transfer, Spectral Wallet).

## Spectral Routing Engine (`/spectral-router`)
DNS-free packet routing between registered network nodes using Ψ channel addressing. Any word or name is CE-encoded to λ on the fly — no pre-registration required. Nearest-wavelength algorithm finds the closest active node and delivers via 2–3 hops. Packet trace visualization shows each hop with Δλ offset. Full packet history log.

## Spectral Search (`/spectral-search`)
Cross-layer search across nodes, agents, users, documents, and channels. Query is CE-encoded to λ — results ranked by electromagnetic proximity (Δλ from query wavelength), not keyword frequency. Spectral proximity score shown per result. Searches live network nodes, registered users, plus static ecosystem index.

## Compression State Explorer (`/compression-explorer`)
Interactive SVG visualization of the Λ=hf/c² compression curve across the full visible spectrum (380–780nm). Authority band overlays (SYSTEM → STORAGE). Hover or drag slider to explore any wavelength — shows frequency, photon energy, compression mass, fee multiplier, and normalized Λ. 7 key spectral landmarks clickable (NexusOS Kernel, Genesis fingerprint, reference green, etc.).

## Physics-Signed Contracts (`/spectral-contracts`)
Document signing using spectral wavelength keys — no RSA, no PKI, no certificate authority. Signature algorithm: `SHA-256(content) ⊕ hex(λ_signer)` → `WNSP-SIG-v1::{username}::{λ}::{sig_fragment}::{check}`. Verification re-derives signer's λ via CE encoding and checks signature integrity. Built-in verify panel for any username + signature + document.

## WNSP Bridge Layer (`/wnsp-bridge`)
This layer provides a TCP/IP overlay for `wnsp://` URIs, acting as Phase 1 of spectral addressing. It uses a `wnsp_registry` database table to map `Ψ(wdm,oam,pol)` channels to HTTP resources, allowing for deterministic address derivation from ASCII ordinals. Public and auth-required APIs support resolving and registering `wnsp://` addresses. The roadmap includes transitioning to WavelengthScript code and eventually native photonic routing.

# External Dependencies

## Third-Party Services
- **Octokit (GitHub API)**: For GitHub integration.
- **PostgreSQL Database**: Primary data store.

## Core Libraries
- **UI & Styling**: Radix UI, Tailwind CSS, Lucide React.
- **Forms & Validation**: React Hook Form, Zod.
- **Data Fetching**: TanStack React Query.
- **Database**: Drizzle ORM, `drizzle-kit`, `drizzle-zod`.