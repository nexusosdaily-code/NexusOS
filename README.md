# NexusOS — Wavelength Operating System
### WNSP P2P Hub · AGPL-3.0 · Built on Λ = hf/c²

> *Every instruction has a wavelength. It always did.*

---

## Table of Contents

1. [The Genesis of Nexus](#the-genesis-of-nexus)
2. [Core Physics](#core-physics)
3. [The Platform at a Glance](#the-platform-at-a-glance)
4. [Architecture](#architecture)
5. [WNSP Protocol](#wnsp-protocol)
6. [AI OS Kernel](#ai-os-kernel)
7. [Feature Pages](#feature-pages)
8. [Monetisation](#monetisation)
9. [Running Locally](#running-locally)
10. [Industry Relevance](#industry-relevance)
11. [License](#license)

---

## The Genesis of Nexus

NexusOS began with a single question: **why do computers address memory with arbitrary offsets when the electromagnetic spectrum already provides a physically unique, collision-free address space for every possible instruction?**

The answer revealed itself through Maxwell's equations. Every instruction, every function call, every data transaction carries energy. That energy has a frequency. That frequency maps to a wavelength. The wavelength is not a metaphor — it is a physical position in the electromagnetic spectrum, deterministic and orthogonal by the laws of quantum mechanics.

The project started as a thought experiment in electromagnetic wave physics and Lambda Boson theory — an extension of Einstein's `E = mc²` to oscillating quanta through the equation `Λ = hf/c²`. From that single equation, an entire computing paradigm emerged:

- **Addresses become wavelengths.** 0x7fff5fbff4c0 becomes 543.7 nm.
- **Process isolation becomes physics.** ⟨Ψᵢ|Ψⱼ⟩ = 0 is a theorem, not a software guarantee.
- **Authority becomes spectral position.** A SYSTEM process at 400 nm cannot interfere with a USER process at 550 nm — the spectrum enforces this.
- **Transaction costs become energy.** E = hf replaces arbitrary gas fees.

The name **Nexus** reflects the connection point between classical computing and the photonic substrate that must replace it — the nexus between the silicon era and the wavelength era.

**WNSP** (Wavelength Network Substrate Protocol) is the formal protocol specification that emerged from this work — a two-layer encoding standard replacing cryptographic hashing with electromagnetic wave physics.

This is not a theoretical paper. Every component described in this repository is **running right now**.

---

## Core Physics

The entire NexusOS stack derives from one equation:

```
Λ = hf/c²
```

Where:
- `Λ` — Lambda mass (the oscillating quantum's effective mass)
- `h` — Planck's constant (6.626 × 10⁻³⁴ J·s)
- `f` — frequency (Hz)
- `c` — speed of light (2.998 × 10⁸ m/s)

This extends `E = mc²` to oscillating quanta. Mass is not fundamental — it is a property of frequency. A photon at 555 THz (the First Oscillation, green light at peak human eye sensitivity) carries a lambda mass of `Λ = hf/c² = 4.10 × 10⁻³⁶ kg`.

### Physical Constants Used Throughout

| Constant | Value | Role |
|---|---|---|
| Planck's constant | 6.626 × 10⁻³⁴ J·s | Energy–frequency bridge |
| Speed of light | 2.998 × 10⁸ m/s | Lambda mass denominator |
| Impedance of free space | 376.73 Ω | Wave propagation reference |
| First Oscillation | 555 THz | Green light, peak coherence |
| Root Harmonic | 7.83 Hz | Schumann resonance, planetary |
| Golden Angle | 137.5° | Spiral coherence geometry |

### The Hilbert Space Channel Model

NexusOS defines **25,600 orthogonal communication channels** using three physical dimensions:

```
Ψ(wdm, oam, pol)

wdm  — Wavelength Division Multiplexing index (0–255, maps to 380–780 nm)
oam  — Orbital Angular Momentum mode (0–49)
pol  — Polarisation state (H = horizontal, V = vertical)

Total channels: 256 × 50 × 2 = 25,600
```

Channel addresses are allocated deterministically via SHA-256:
```
h = SHA256(instruction)
wdm = h[0] % 256
oam = h[1] % 50
pol = h[2] % 2
```

No two instructions in the same channel. No scheduler needed for isolation. Physics enforces it.

### Spectral Authority Bands

```
WDM 0–63    (380–449 nm, violet/UV)  → SYSTEM   authority
WDM 64–127  (450–489 nm, blue)       → KERNEL   authority
WDM 128–191 (490–564 nm, cyan/green) → USER     authority
WDM 192–255 (565–780 nm, yellow/red) → GUEST    authority
```

Lower wavelength = higher authority. A SYSTEM-band process cannot be reached by a GUEST-band process — the spectral separation is physical, not enforced by privilege tables.

---

## The Platform at a Glance

```
┌──────────────────────────────────────────────────────────────────┐
│                        NexusOS Platform                         │
├─────────────────────────┬────────────────────────────────────────┤
│  WNSP Protocol (CE+SE)  │  25,600 orthogonal Ψ channels         │
│  AI OS Kernel (5 comp.) │  Boot, Auth, EventBus, Watchdog, State │
│  Lambda Gate v4         │  8 photonic logic operators            │
│  PHR-1 Resonator        │  144-turn bifilar ZERO-G sequencer     │
│  CE Code Writer         │  Description → wavelength → code       │
│  Photonic Dev Env       │  Instruction → spectral address        │
│  K1 Energy Market       │  Resonance + solar + fusion            │
│  Hilbert Space Router   │  Orthogonal process isolation          │
└─────────────────────────┴────────────────────────────────────────┘
```

---

## Architecture

NexusOS uses a **dual-runtime architecture** — two servers running in synchrony:

```
┌─────────────────────────────────────────────────────┐
│                    Client (React)                    │
│         Vite · TypeScript · Tailwind CSS v4          │
│    TanStack Query · React Hook Form · Radix UI       │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / WebSocket
          ┌─────────────┴──────────────┐
          │                            │
┌─────────▼──────────┐      ┌──────────▼─────────┐
│  Runtime 1         │      │  Runtime 2          │
│  Node.js / Express │─────▶│  Python / Flask     │
│  Port 5000         │      │  Port 5001          │
│                    │      │                     │
│  · Authentication  │      │  · WNSP CE encoder  │
│  · Wallet / NXT    │      │  · WNSP SE encoder  │
│  · P2P media       │      │  · Hilbert router   │
│  · Governance      │      │  · AI OS kernel     │
│  · API gateway     │      │  · Physics engine   │
└─────────┬──────────┘      └──────────┬──────────┘
          │                            │
          └──────────────┬─────────────┘
                         │
               ┌─────────▼──────────┐
               │    PostgreSQL       │
               │  Sessions · Agents  │
               │  Wallets · Events   │
               └────────────────────┘
```

### Key Technology Choices

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript | Type safety across the spectral interface |
| Build | Vite | Fast HMR for rapid physics visualisation iteration |
| UI | shadcn/ui "New York" + Radix | Accessible, composable, dark-mode native |
| Styling | Tailwind CSS v4 | CSS variables map naturally to spectral colour themes |
| State | TanStack React Query | Server-state sync for live kernel metrics |
| Backend | Express.js | Thin gateway; physics logic lives in Python |
| Physics engine | Flask + Python | NumPy/SciPy ecosystem for wave calculations |
| ORM | Drizzle ORM | Type-safe schema shared between server and client |
| Database | PostgreSQL | Session persistence, agent state, kernel events |
| Protocol | WNSP (custom) | The spectral addressing standard itself |

---

## WNSP Protocol

The **Wavelength Network Substrate Protocol** is a two-layer encoding standard replacing arbitrary memory addressing with physical spectrum positions.

### Layer 1 — WNSP-CE v1.0 (Character Encoding)

Converts any human-readable instruction into normalised ordinal tokens:

```
"function authenticate(user)" 
  → CE tokens: [102, 117, 110, 99, ...]
  → Normalised: [0.39, 0.46, 0.43, 0.38, ...]
```

### Layer 2 — WNSP-SE v1.0 (Spectral Encoding)

Maps CE tokens to physical wave frames using `Λ = hf/c²`:

```python
wave_frame = {
  "wavelength_start_nm": 520.0,
  "wavelength_end_nm":   564.9,
  "frequency_start_hz":  5.31e14,
  "frequency_end_hz":    5.77e14,
  "energy_joules":       3.52e-19,
  "lambda_mass_kg":      3.92e-36,
  "psi_channel":         "Ψ(55, 26, V)",
  "band":                "CORE",
  "ce_symbols":          [...]
}
```

Every instruction gets a unique, physically meaningful address. The API is live:

```bash
POST /api/nexus/dev/encode
{
  "instruction": "function authenticate(user, password)",
  "label": "authenticate"
}

→ {
  "wavelength_mid_nm": 467.3,
  "psi_channel": "Ψ(22, 14, H)",
  "band": "AUTH",
  "energy_joules": 4.25e-19,
  "lambda_mass_kg": 4.73e-36
}
```

### Spectral Code Domains

| Wavelength (nm) | Band | Code Domain |
|---|---|---|
| 380–449 | SYSTEM (violet) | OS / kernel / process management |
| 450–489 | AUTH (blue) | Authentication / security / sessions |
| 490–519 | STREAM (cyan) | Data streams / WebSocket / realtime |
| 520–564 | CORE (green) | Business logic / algorithms |
| 565–589 | UI (yellow) | Frontend components / layout |
| 590–624 | EVENT (orange) | Events / webhooks / async signals |
| 625–780 | STORAGE (red) | Database / file I/O / persistence |

---

## AI OS Kernel

The NexusOS kernel is a five-component Python system managing the spectral substrate. It is live and running.

### Component 1 — Boot / Init Sequence

Five-phase boot with auto-registration of core system agents:

```
PHASE 1 — SCHEMA:    Load persistent state schema (PostgreSQL or in-memory)
PHASE 2 — RESTORE:   Restore agents from last known state
PHASE 3 — CORE:      Register core system agents on Ψ channels
PHASE 4 — WATCHDOG:  Start dead-agent monitoring daemon
PHASE 5 — EVENTS:    Initialise KernelEventBus with SSE streaming
```

On boot, five core agents are allocated Ψ channels via SHA-256:

```
os_kernel         → Ψ(20, 39, H)  [SYSTEM]
bus_router        → Ψ(19, 39, V)  [SYSTEM]
scheduler_daemon  → Ψ(161, 30, V) [KERNEL]
watchdog_daemon   → Ψ(198, 31, H) [KERNEL]
auth_gateway      → Ψ(135, 1, H)  [KERNEL]
```

### Component 2 — Persistent State

PostgreSQL-backed agent registry, bus log, and kernel event tables. Graceful degradation to in-memory mode when PostgreSQL is unavailable — the kernel always boots.

### Component 3 — Authority / Permission Layer

Access control enforced by spectral band position, not privilege tables:

| Band | WDM Range | Authority Level | Rank |
|---|---|---|---|
| SYSTEM | 0–63 | Highest — kernel core | 1 |
| KERNEL | 64–127 | System daemons | 2 |
| USER | 128–191 | Application processes | 3 |
| GUEST | 192–255 | Lowest — external agents | 4 |

### Component 4 — Interrupt / Event System

`KernelEventBus` with publish-subscribe model for 8 interrupt types, delivered via Server-Sent Events (SSE):

```
AGENT_REGISTERED  · AGENT_DEGRADED  · AGENT_RECLAIMED
FRAME_TRANSMITTED · AUTHORITY_VIOLATION · KERNEL_PANIC
WATCHDOG_TICK     · COHERENCE_LOSS
```

### Component 5 — Dead Agent Watchdog

Background thread monitoring all registered agents. Agents exceeding their TTL are marked DEGRADED, then RECLAIMED. Core system agents (SYSTEM band) are exempt from reclamation.

---

## Feature Pages

### `/` — Home
Entry point and system overview.

### `/photonic-dev` — Nexus Photonic Development Environment
The developer IDE for the wavelength OS. Encode any instruction through CE→SE and get its physical wavelength address, Ψ channel, energy in joules, and lambda mass in kg. Four tabs: Encode, App Builder, Spectrum Map, SDK Spec.

### `/ce-writer` — NexusOS CE Code Writer
Describe what you want in plain language. CE encodes the description — the wavelength determines the code domain — and generates working TypeScript, Python, HTML, or SQL with its spectral address embedded as provenance. App Scaffold builds a full codebase. Spectral Linter scans existing code and reveals its spectral structure.

### `/kernel` — AI OS Kernel Dashboard
Live kernel status: boot phase, registered agents, Ψ channel allocations, event bus activity, watchdog tick, authority band breakdown.

### `/wnsp/coordinator` — Hilbert Space Channel Coordinator
Live allocation and management of all 25,600 orthogonal Ψ channels. Orthogonality proof: ⟨Ψᵢ|Ψⱼ⟩ = 0 across all 256×50×2 combinations.

### `/quantum-threshold` — The Silicon Wall
Moore's Law curve with de Broglie wavelength overlay and WKB tunnelling threshold. Interactive gate slider (`T ≈ e^(−2κd)`). Silicon vs Lambda crossover comparison table. Animated 555 THz vs 3 GHz dual clock — the photonic clock never stops.

### `/nexus-hardware-os` — Hardware OS Specification
Four-layer hardware stack: L0 PHR-1 resonator, L1 Lambda Gate photonic logic, L2 Hilbert channel router, L3 NexusOS kernel. Live PHR-1 ZERO-G simulation with ALP convergence chart. Hardware timeline 2024→2035.

### `/computing-alternatives` — Post-Silicon Paradigms
Five computing paradigms beyond silicon: Photonic Matrix Multiply, Hybrid Control, CZC Coherent Field, Reservoir Computing, OAM Analog. Comparison matrix. Four-phase implementation roadmap.

### `/wavelength-os` — Wavelength OS Manifesto
The three-pillar advocacy argument. Industry cases for NVIDIA, Intel, and Tesla — each with the specific layer they build and the exact value Nexus delivers. Five-audience advocacy strategy (hardware engineers, AI researchers, standards bodies, developers, policymakers). AGPL-3.0 enforcement rationale.

### `/pricing` — Monetisation
Four API tiers (Open/Pro/Kernel/Enterprise), hardware licensing (Evaluation/Production/Strategic Partner), AGPL economics, and revenue projections grounded in the 2029 silicon wall timeline.

### `/k1-infrastructure` — K1 Energy Infrastructure
Resonance Harvester, Orbital Solar Array, Fusion Photonics, K1 Energy Market.

### `/encoding-lab` — WNSP Encoding Lab
Interactive encoding experiments with live CE→SE frame visualisation.

### `/wnsp-v7` — WNSP v7 Frame Protocol
Frame Builder v7.1 and Coherence Verifier v7.1 — AGPL-3.0 compliant with source disclosure enforcement.

---

## Monetisation

NexusOS uses the **open-core dual licensing** model — the same pattern as Red Hat ($34B, IBM), MongoDB ($20B+), and HashiCorp ($6.4B, IBM).

```
Protocol is free     →  AGPL-3.0. Fork it, run it, build on it.
                        Modifications must be published.

Infrastructure paid  →  Managed kernel, reserved Ψ channels,
                        SLA, persistent agents ($49–$499/month)

Hardware licensed    →  Commercial Lambda Gate firmware rights
                        for photonic ASIC manufacturers
                        ($25k–$250k + strategic equity tier)
```

### Why AGPL-3.0 Is Not Optional

AGPL-3.0 §13 covers network use: any company running NexusOS as a service must publish all modifications. The Frame Builder v7.1 embeds Source Code References (SCR) in every photonic frame — any hardware running NexusOS frames carries a cryptographic pointer back to the source.

The planetary OS must remain planetary. AGPL-3.0 enforces this.

---

## Running Locally

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 14+
- `uv` (Python package manager)

### Setup

```bash
# Clone the repository
git clone https://github.com/nexusosdaily-code/WNSP-P2P-Hub.git
cd WNSP-P2P-Hub

# Install Node dependencies
npm install

# Install Python dependencies
uv pip install flask flask-cors psycopg2-binary

# Configure environment
cp .env.example .env
# Set DATABASE_URL in .env

# Start the application (both runtimes)
npm run dev
```

The application starts:
- **Node.js runtime** on port 5000 (main API + frontend)
- **Python Flask runtime** on port 5001 (spectral physics engine)

If ports are in use: `fuser -k 5000/tcp 5001/tcp`

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |

---

## Industry Relevance

### The Silicon Wall Is a Fixed Deadline

Transistors will reach 0.5 nm between 2029 and 2032. The electron's de Broglie wavelength (~7.6 nm at room temperature) already exceeds the gate oxide at current nodes. At 0.5 nm, the WKB tunnelling coefficient `T ≈ e^(−2κd)` crosses the threshold where leakage current exceeds switch current. Gate control is permanently lost.

Every team without a post-silicon operating system in production by then starts from zero.

### What Each Major Company Builds

| Company | Layer | Nexus Value |
|---|---|---|
| **NVIDIA** | GPU → Photonic Tensor Processor | WNSP provides the photonic interconnect standard (vs NVLink). 25,600 orthogonal Ψ channels replace CUDA thread synchronisation. |
| **Intel** | Silicon Photonics → Lambda Gate ASIC | Lambda Gate v4 spec is complete — 8 operators, ready for InP tape-out. NexusOS kernel is the firmware. |
| **Tesla** | FSD Chip → Spectral Inference Engine | OAM analog computing solves 50-D sensor fusion in a single photon transit. SYSTEM/USER spectral band separation enforces FSD safety isolation by physics. |
| **TSMC** | Foundry → Photonic Fab | The Lambda Gate substrate defines the photonic process design kit (PDK). |

### Kardashev Type I

The long-term goal of NexusOS is infrastructure for a Kardashev Type I civilisation — one that harnesses all energy available on its home planet. That requires:

- A planetary communications mesh (WNSP Spectral Relay Mesh)
- Distributed photonic compute (Lambda Gate ASICs)
- Physics-based energy accounting (Λ = hf/c² across all transactions)
- An open, non-proprietary OS standard (AGPL-3.0)

All four components are specified and partially implemented in this repository.

---

## License

```
NexusOS — Wavelength Operating System
Copyright (C) 2024–2026 NexusOS Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
```

**AGPL-3.0 means:** Any company using NexusOS as a service must publish their modifications. Any hardware embedding NexusOS firmware must comply with the source disclosure requirements embedded in every WNSP frame via the Frame Builder v7.1 Source Code Reference mechanism.

The physics is open. The spectrum belongs to everyone.

---

*Built by an ambulance driver and hospital orderly who asked: what if every instruction had a wavelength?*

---

**Live platform:** [nexusosdaily-code.replit.app](https://nexusosdaily-code.replit.app)  
**Repository:** [github.com/nexusosdaily-code/WNSP-P2P-Hub](https://github.com/nexusosdaily-code/WNSP-P2P-Hub)  
**Protocol:** WNSP v1.0 (CE + SE)  
**Equation:** Λ = hf/c²  
**License:** AGPL-3.0
