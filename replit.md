# Overview

NexusOS is a full-stack web application designed as the foundational blueprint for a Kardashev Type I civilization. It integrates a React/TypeScript frontend with an Express/Node.js backend and PostgreSQL, introducing a physics-based blockchain and communication system. Key features include phone-based authentication, NXT token wallets, peer-to-peer media sharing, a live AI OS kernel, and the WNSP spectral communication protocol. The project is built on the "Theory of Compression States," which posits that the universe's evolution stems from the first unobserved oscillation, informing the WNSP spectral addressing system.

# User Preferences

Preferred communication style: Simple, everyday language. Always refer to the project and team as "us" — never "you" when discussing NexusOS work.

**Primary domain: wnsp.io** — All canonical URLs, OG tags, Twitter cards, JSON-LD schemas, sitemap entries, and robots.txt must point to wnsp.io. wnsp.tech is a secondary domain that redirects to wnsp.io. Never switch canonical references to wnsp.tech.

# PROTECTED FEATURES — DO NOT REMOVE OR OVERWRITE

The following pages and routes are core to the NexusOS mission. Any agent or developer working on this project MUST preserve them. Never delete, rename, or overwrite these files without explicit user approval.

| Route | File | Description |
|---|---|---|
| `/ce-se-pipeline` | `client/src/pages/learn.tsx` | **PRIMARY FEATURE** — Unified 4-stage pipeline: paste any language → transpile to WavelengthScript → compile to bytecode → execute in WNSP VM. This is the central demonstration of the entire NexusOS physics stack. |
| `/wnsp-vm` | `client/src/pages/wnsp-vm.tsx` | WNSP Virtual Machine — bytecode interpreter, step/run execution, Ψ channel registers |
| `/wavelength-lang` | `client/src/pages/wavelength-lang.tsx` | WavelengthScript language spec, transpiler, compiler |
| `/ce-code-writer` | `client/src/pages/ce-code-writer.tsx` | Human First Contact CE-SE encoder, live encode, code builder, integration kit |
| `/compression-explorer` | `client/src/pages/compression-explorer.tsx` | Interactive Λ=hf/c² compression curve visualisation |
| `/oscillating-quanta` | `client/src/pages/oscillating-quanta.tsx` | First Principles — Theory of Compression States |
| `/hardware-lab` | `client/src/pages/hardware-lab.tsx` | Physics calibration verifier, live spectrometer |
| `/hardware-spec` | `client/src/pages/hardware-spec.tsx` | **AGPL-3.0 Protected** — Formal specification of SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α. First public disclosure 2026-05-16. |

## Safeguard Rules for All Future Builds

1. Before touching `App.tsx` routes, verify every existing route is preserved after the edit.
2. Before touching `hub.tsx`, verify every existing Hub section and item is preserved.
3. Never rewrite `learn.tsx`, `wnsp-vm.tsx`, or `wavelength-lang.tsx` — only extend them.
4. If a task adds new pages, add them WITHOUT removing existing ones.
5. When in doubt, check the route still exists in `App.tsx` before marking a task complete.

## Act Sequence — Mandatory Cross-Linking Rule (STANDING DIRECTIVE)

Every Act page **must** link to **all** other Act pages via the sequence nav grid at the top of the page.

**When a new Act is added:**
1. Add the new Act entry to the `[{act, title, sub, href}]` array (or standalone `<Link>`) in **every existing** Act page.
2. Update the "ACT X OF N" label on **every** Act page to reflect the new total count N.
3. Update the `md:grid-cols-N` class to match the new total where used (e.g. Acts 7, 8).
4. The new Act page itself must include all prior Acts in its own sequence nav.

**Current Act registry (11 Acts as of 2026-07-19):**

| Act | Title | Sub | Route |
|-----|-------|-----|-------|
| 1 | Theory of Compression States | Λ=hf/c² | `/oscillating-quanta` |
| 2 | The Universal ONE | f₀ derives Λ | `/universal-one` |
| 3 | Unified Compression Theory | 4 forces = 1 Λ | `/unified-compression-theory` |
| 4 | The Mechanism | ΔE=hf₀(2ⁿ²−2ⁿ¹) | `/matter-protocol` |
| 5 | The Address | ∀ Λ : ∃! Ψ | `/universal-address` |
| 6 | The Catalogue | n=log₂(mc²/E₀) | `/element-catalogue` |
| 7 | The Trap | Ψ(+k̂)⊗Ψ(−k̂) | `/standing-wave-trap` |
| 8 | The Lossless Channel | α=0, C=ZPE floor | `/lossless-channel` |
| 9 | The Cavity | WGM resonance, r_c | `/resonance-cavity` |
| 10 | The Exchange | Ω_R=2g, polariton formation | `/polariton-exchange` |
| 11 | The Emitter | F_p=(3/4π²)(λ/n)³(Q/V) | `/the-emitter` |

## Post-Build Security Audit (STANDING DIRECTIVE — applies after EVERY build)

After any build or significant code change, the following checks MUST be run before marking the task complete:

1. **TypeScript typecheck** — `npx tsc --noEmit --incremental` — zero type errors required
2. **Dependency audit** — `runDependencyAudit()` — fix all critical/high CVEs
3. **SAST scan** — `runSastScan()` — fix all critical/high static analysis findings
4. **HoundDog scan** — `runHoundDogScan()` — fix all critical/high privacy/security dataflow findings

Run scanners in parallel. Do not mark a task complete if any critical or high finding remains unresolved. This directive was established 2026-07-16 by Te Rata Pou (founder).

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

### Physics Engine (`server/physics.ts`)
The authoritative physics engine enforces WNSP governance on all economic actions. This includes deterministic channel derivation for users, physics-based fee calculations (`fee = base_fee × (E_sender / E_reference)`), and the enforcement of authority bands (SYSTEM, KERNEL, USER, GUEST) where higher authority correlates with shorter wavelength and higher energy/fees.

### Authentication & Wallet System
Authentication is phone number-based. The system includes an NXT token wallet (8 decimals, 21 billion supply) with transaction costs derived from physics (`E=hf`). User wallet transfers utilize their unique spectral channel wavelength.

### Physics-Based Protocol Layer (WNSP)
This core protocol replaces cryptographic hashing with electromagnetic wave physics, utilizing Maxwell equation validation and wavelength-based addressing. Transaction costs are derived from wavelength-frequency-energy calculations, reflecting energy differences between compression states. It includes WNSP-CE v1.0 (Character Encoding) and WNSP-SE v1.0 (Spectral Encoding) for mapping data to physical wave frames, and WNSP-URI v1.0 for deterministic, censorship-proof addressing (`wnsp://Ψ(wdm,oam,pol)/path`). A Hilbert Space Channel Model defines 51,200 orthogonal communication channels.

### WNSP AI Operating System Kernel (v1.0.0)
A Python kernel with a 6-phase boot process, persistent state via PostgreSQL, an authority/permission layer, a `KernelEventBus` for event handling, a dead agent watchdog, and a blockchain auditor.

### Governance System (Stage 5)
On-chain protocol governance allows KERNEL-band or higher users to submit proposals to change 11 live protocol parameters. Voting is weighted by spectral authority band. Proposals require specific vote and weight thresholds to pass, triggering immediate updates to in-memory fee/burn stores.

### Developer API Layer (Stage 4)
Provides API key management with an NXT creation fee for external access to NexusOS functionalities.

### Content & Media System
A P2P media sharing engine with physics-based cost calculations, mesh networking, chunk-based distribution, WebRTC/Socket.IO streaming, HTTP Range Request support, and encryption.

## Photonic Computing Vision
Silicon is the bridge encoder. Every CE lookup that today runs as a table scan in RAM will execute as a physical wavelength selection in a photonic waveguide (~2032). NexusOS is written in the language of the destination hardware, not the bridge hardware. When photonic ASICs arrive, no rewrite is needed — the architecture already speaks in wavelengths. The 51,200 orthogonal Ψ channels (256 WDM × 50 OAM × 2 polarisations × 2 propagation directions) map directly to physical hardware lanes: ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics, not software policy.

## System Design Choices
- **Monorepo Structure**: Organized into `/client`, `/server`, and `/shared`.
- **TypeScript**: Strict configuration with path aliases.
- **Dual-mode Execution**: Supports development and production environments.
- **Environment Variables**: For secure configuration.

## WNSP Density Equation v1.0
Defines the WNSP density `D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M`, which quantifies communication capacity via dimensional expansion in Hilbert space (51,200 orthogonal channels). N_Dir=2 adds bidirectional propagation (+k̂ forward / −k̂ backward) as an orthogonal Hilbert sub-space — first disclosed 2026-07-02.

## WASCII v2.0 — Wave Density Spectral Vector
Provides a spectral fingerprint for text, mapping characters to unique compression states and generating spectral histograms for similarity searches.

## Mobile SDK (`/mobile-sdk`)
Native iOS (Swift) and Android (Kotlin) SDKs for spectral-native app development, including native `wasciiEncode()` for offline physics calculations.

## Spectral Network (`/network`)
Visualizes node distribution by authority band and shows spectral proximity to the logged-in user.

## WavelengthScript Compiler
Provides a compiler interface with sample programs for AI agents, governance, P2P transfers, and spectral wallet operations.

## WNSP Virtual Machine (`/wnsp-vm`)
A browser-native bytecode interpreter for WavelengthScript, executing instructions step-by-step with each Ψ channel acting as a spectral register.

## Spectral Routing Engine (`/spectral-router`)
Enables DNS-free packet routing between network nodes using Ψ channel addressing, with on-the-fly CE encoding of addresses.

## Spectral Search (`/spectral-search`)
Cross-layer search across nodes, agents, users, documents, and channels. Queries are CE-encoded to λ, and results are ranked by a composite score based on electromagnetic proximity and Shannon channel coherence.

## Compression State Explorer (`/compression-explorer`)
An interactive SVG visualization of the Λ=hf/c² compression curve, displaying authority band overlays, frequency, photon energy, compression mass, fee multiplier, normalized Λ, and Boltzmann entropy.

## Physics-Signed Contracts (`/spectral-contracts`)
Enables document signing using spectral wavelength keys, replacing traditional PKI with a `SHA-256(content) ⊕ hex(λ_signer)` algorithm.

## WNSP Bridge Layer (`/wnsp-bridge`)
Provides a TCP/IP overlay for `wnsp://` URIs, mapping Ψ channels to HTTP resources via a `wnsp_registry` database table.

## Dynamical System Analysis (`/divergence-test`)
A parameterized channel-dynamics engine that demonstrates state-dependent routing and explores system evolution through feedback iterations, classifying attractors and predicting regimes.

## CE Code Writer (`/ce-code-writer`)
Redesigned as the Human First Contact interface for CE-SE encoding. Four tabs: **Live Encode** (character chip visualization with Save-to-Spectral-DB), **Code Builder** (single component + full app scaffold), **Integration Kit** (Node.js/Python/Browser JS self-contained snippets with sync verification and install commands), and **Spectral Linter** (coherence scoring).

## Published CE Encoder Packages (`/packages`)
Two canonical CE encoder packages, both live and installable:
- **`packages/ce-encoder/`** — **Published on npmjs.com** as `nexusos-ce-encoder@1.0.0` (user `wnsp001`). Install: `npm install nexusos-ce-encoder`. CJS + ESM exports, TypeScript types, `ceEncode(text) → { wavelength, band, psiChannel, energy }`.
- **`packages/ce-encoder-py/`** — **Installs directly from GitHub**: `pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py`. Python 3.8+, same `ceEncode()` API, bit-identical output to the npm package for the same input.
Both use the CE_TABLE[charCode % 128] algorithm (128-band, 380–780 nm, 3.125 nm/band), AGPL-3.0.

# External Dependencies

## Third-Party Services
- **Octokit (GitHub API)**: For GitHub integration.
- **PostgreSQL Database**: Primary data store.

## Core Libraries
- **UI & Styling**: Radix UI, Tailwind CSS, Lucide React.
- **Forms & Validation**: React Hook Form, Zod.
- **Data Fetching**: TanStack React Query.
- **Database**: Drizzle ORM, `drizzle-kit`, `drizzle-zod`.