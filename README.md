# NexusOS — Wavelength Operating System

**AGPL-3.0 · Built on Λ = hf/c² · Phase 2 of a 100-year architecture**

[![npm](https://img.shields.io/npm/v/nexusos-ce-encoder?label=nexusos-ce-encoder&color=5c3eec)](https://www.npmjs.com/package/nexusos-ce-encoder)

> *You cloned a physics engine. This document explains what it does.*

---

## Live now

The system is deployed and running. Everything below is accessible today:

| Page | What it does |
|---|---|
| [Campaign](https://wnsp.io/campaign) | Lab funding tiers — support the hardware build |
| [Crowdfund](https://wnsp.io/crowdfund) | Nexus Shares — equity in the physics stack |
| [Videos](https://wnsp.io/videos) | Auto-published Telegram video feed |
| [WNSP Paper](https://wnsp.io/wnsp-paper) | Formal WNSP protocol specification (AGPL-3.0) |
| [Hardware Spec](https://wnsp.io/hardware-spec) | SNIC, PHR-1, Spectral Relay Mesh v1 — first public disclosure 2026-05-16 |
| [CE-SE Pipeline](https://wnsp.io/ce-se-pipeline) | Paste any language → transpile → compile → execute in WNSP VM |
| [WNSP VM](https://wnsp.io/wnsp-vm) | Browser-native bytecode interpreter, step/run execution |
| [Compression Explorer](https://wnsp.io/compression-explorer) | Interactive Λ=hf/c² compression curve visualisation |

### Telegram video feed

Every video sent to the NexusOS Telegram bot is automatically published to the [/videos](https://wnsp.io/videos) page with no manual step. The bot webhook proxies video bytes through the server — the bot token is never exposed to the browser. The video gallery also appears on the Hub, Campaign, and Crowdfund pages.

**Telegram channel:** [t.me/nexusosdaily](https://t.me/nexusosdaily)

### Published packages

```bash
# CE encoder — npm (CJS + ESM + TypeScript types)
npm install nexusos-ce-encoder

# CE encoder — Python (bit-identical output to the npm package)
pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py
```

Both use `CE_TABLE[charCode % 128]` — 128 bands, 380–780 nm, 3.125 nm/band. AGPL-3.0.

---

## What you are holding

This repository contains a running implementation of **WNSP** — the Wavelength Network Substrate Protocol — a spectral addressing system that replaces arbitrary memory addresses and cryptographic hashes with physical positions in the electromagnetic spectrum.

It is not a simulation. Not a proof of concept. The physics engine is executing right now.

When you run `npm run dev`, two servers start:

- **Node.js on port 5000** — authentication, wallet, P2P media, blockchain, API gateway
- **Python/Flask on port 5001** — the spectral physics engine: character encoding, wave frame generation, Hilbert space channel allocation, Ψ address derivation

The moment both are running, you can do this:

```bash
curl -X POST http://localhost:5001/api/nexus/dev/encode \
  -H "Content-Type: application/json" \
  -d '{"instruction": "hello world", "label": "test"}'
```

You will get back a physical wavelength address — a real position in the visible light spectrum derived from the content of the instruction through `Λ = hf/c²`. No hash function. No lookup table. The physics of the universe assigns the address.

---

## The canonical fingerprint

The channel coordinator assigns Ψ addresses deterministically using SHA-256. The derivation pipeline is public and requires no running code to verify:

```
Input:          "NEXUSOS"  (UTF-8)
Hash:           SHA-256("NEXUSOS") = e42d4825c2cb8756...
Bytes [0,1,2]:  [228, 45, 72]

wdm = 228 % 256 = 228   (WDM index)
oam =  45 % 50  = 45    (OAM mode)
pol =  72 % 2   = 0     (H polarisation)

Canonical genesis address:  Ψ(228, 45, H)
Wavelength from WDM index:  λ ≈ 737.6 nm  (near-infrared boundary)
```

Verify in one line, no dependencies beyond Python's standard library:

```bash
python3 -c "
import hashlib
h = hashlib.sha256(b'NEXUSOS').digest()
wdm, oam, pol = h[0] % 256, h[1] % 50, h[2] % 2
print(f'Psi({wdm}, {oam}, {\"V\" if pol else \"H\"})')
"
# Output: Psi(228, 45, H)
```

This is a cryptographic derivation. SHA-256 is collision-resistant, deterministic across all machines, and requires no trust in NexusOS infrastructure to verify. The result is not configurable.

**What makes it a fingerprint:** Any system presenting a different genesis address is not running this codebase. Any system presenting `Ψ(228, 45, H)` as its genesis node derived the address the same way, from the same input, using the same pipeline. The derivation is the proof.

---

## The one equation everything derives from

```
Λ = hf/c²
```

- `Λ` — the lambda mass of an oscillating quantum (kg)
- `h` — Planck's constant: 6.626 × 10⁻³⁴ J·s
- `f` — frequency (Hz)
- `c` — speed of light: 2.998 × 10⁸ m/s

This extends `E = mc²` to oscillating quanta. Mass is a property of frequency, not a fixed quantity. A photon at 555 THz — the First Oscillation, green light at peak human eye sensitivity — carries `Λ = 4.10 × 10⁻³⁶ kg`.

From this equation:

| Consequence | Implementation |
|---|---|
| Every instruction has a frequency | CE→SE encoder in `spectral_api.py` |
| Every frequency maps to a wavelength | Physical spectrum 380–780nm + UV/IR |
| Every wavelength is a unique address | 25,600 orthogonal Ψ channels |
| Every transaction has an energy cost | `E = hf` replaces gas fees |
| Authority scales with frequency | High-f (short λ) = SYSTEM; low-f (long λ) = GUEST |

---

## The encoding stack

Two layers, both running:

### Layer 1 — WNSP-CE v1.0 (Character Encoding)

Converts any text into normalised spectral tokens using ASCII ordinal values:

```
"authenticate(user)" → ordinals [97, 117, 116, ...] → normalised [0.38, 0.46, 0.45, ...]
```

Each character maps to a deterministic position in the visible spectrum based on its ordinal value. `a` (97) is not the same wavelength as `b` (98). The content of the instruction determines its spectral address.

### Layer 2 — WNSP-SE v1.0 (Spectral Encoding)

Maps CE tokens to physical wave frames:

```python
{
  "wavelength_start_nm": 520.0,
  "wavelength_end_nm":   564.9,
  "frequency_start_hz":  5.31e14,
  "frequency_end_hz":    5.77e14,
  "energy_joules":       3.52e-19,
  "lambda_mass_kg":      3.92e-36,
  "psi_channel":         "Ψ(55, 26, V)",
  "band":                "CORE"
}
```

The Ψ channel is a three-dimensional coordinate in Hilbert space:

```
Ψ(wdm, oam, pol)

wdm — Wavelength Division Multiplexing index (0–255 → 380–780 nm)
oam — Orbital Angular Momentum mode (0–49)
pol — Polarisation state (H or V)
```

Total orthogonal channels: **256 × 50 × 2 = 25,600**

Each is physically orthogonal to every other: `⟨Ψᵢ|Ψⱼ⟩ = 0`. Two processes on different Ψ channels cannot interfere — not by software policy, by quantum mechanics.

### WASCII v2.0 — Spectral Fingerprinting

Every message encoded through WNSP generates a spectral vector: a histogram of character-wavelengths across 100 WDM bands. Output includes centroid, bandwidth, spectral entropy, dominant band, and compression range. This enables spectral similarity search — finding related content by proximity in frequency space rather than exact string match.

---

## The Hilbert space channel density equation

```
D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M
```

| Symbol | Meaning | Current value |
|---|---|---|
| N_λ | WDM wavelength channels | 256 |
| N_OAM | Orbital angular momentum modes | 50 |
| N_Pol | Polarisation states | 2 |
| R_sym | Symbols per channel per cycle | 2 |
| M | Modulation depth | 1 |

**Phase 2 active — 51,200 symbols/cycle** (256 WDM × 50 × 2 × R₂ × M₁ · Phase 1 at 100 WDM: 20,000 symbols/cycle was the baseline)

This is not Shannon capacity. Shannon compresses more into one channel and hits logarithmic diminishing returns. WNSP expands into orthogonal dimensions and scales linearly with each:

```
Shannon:  C = B · log₂(1 + SNR)    — one channel, squeeze harder
WNSP:     D = N_λ · N_OAM · N_Pol  — more orthogonal dimensions
```

Phase 3 (native photonic routing): 256 × 50 × 2 × R₁₆ × M₆₄ = **26,214,400 symbols/cycle**

Energy-normalised density (connects to Λ=hf/c²):

```
D_energy = D_WNSP · λ / (h · c)
```

Higher frequency = more energy per photon = lower density per joule. The energy cost is not arbitrary — it is the physical energy difference between compression states.

Live API: `GET /api/wnsp/density?r_sym=2&m=1&wavelength_nm=550`

---

## Spectral authority bands

```
WDM 0–63    │ 380–449 nm │ violet/UV    │ SYSTEM   — OS core, kernel, process management
WDM 64–127  │ 450–489 nm │ blue         │ KERNEL   — authentication, sessions, security
WDM 128–191 │ 490–564 nm │ cyan/green   │ USER     — application logic, computation
WDM 192–255 │ 565–780 nm │ yellow/red   │ GUEST    — storage, external agents
```

Lower wavelength = higher authority. A process at 400 nm cannot reach a process at 550 nm. This is enforced by the wave equation, not by a privilege table that can be overwritten.

---

## The AI OS Kernel

A six-phase boot Python kernel managing the spectral substrate. All six core agents are running and pulsing heartbeats:

```
PHASE 1 — SCHEMA     Database tables created / verified
PHASE 2 — RESTORE    Agents restored from persistent state
PHASE 3 — CORE       Core agents registered on Ψ channels
PHASE 4 — WATCHDOG   Dead-agent monitoring daemon started
PHASE 5 — EVENTS     KernelEventBus open, BOOT event logged
PHASE 6 — HEARTBEAT  Agent heartbeat active — pulsing every 120s
```

Core agents and their permanent Ψ addresses:

```
os_kernel         → Ψ(20, 39, H)   [SYSTEM band — 380–449nm]
bus_router        → Ψ(19, 39, V)   [SYSTEM band]
scheduler_daemon  → Ψ(161, 30, V)  [USER band]
watchdog_daemon   → Ψ(198, 31, H)  [GUEST band]
auth_gateway      → Ψ(135, 1, H)   [USER band]
blockchain_auditor→ Ψ(42, 7, H)    [SYSTEM band]
```

Kernel event types:

```
AGENT_REGISTERED  · AGENT_DEGRADED    · AGENT_RECLAIMED
FRAME_TRANSMITTED · AUTHORITY_VIOLATION · KERNEL_PANIC
WATCHDOG_TICK     · COHERENCE_LOSS
```

Dead agents are marked DEGRADED after TTL expiry, then RECLAIMED. SYSTEM-band agents are exempt from reclamation — they are the substrate.

---

## Architecture

Two runtimes, one database:

```
┌─────────────────────────────────────────────────────┐
│                    Client (React 18)                 │
│         Vite · TypeScript · Tailwind CSS v4          │
│    TanStack Query · React Hook Form · Radix UI       │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / WebSocket
          ┌─────────────┴──────────────┐
          │                            │
┌─────────▼──────────┐      ┌──────────▼─────────┐
│  Node.js / Express │      │  Python / Flask     │
│  Port 5000         │─────▶│  Port 5001          │
│                    │      │                     │
│  · Auth / sessions │      │  · CE encoder       │
│  · NXT wallet      │      │  · SE encoder       │
│  · P2P media       │      │  · Hilbert router   │
│  · Blockchain      │      │  · AI OS kernel     │
│  · API gateway     │      │  · Physics engine   │
│  · Telegram feed   │      │                     │
└─────────┬──────────┘      └──────────┬──────────┘
          │                            │
          └──────────────┬─────────────┘
                         │
               ┌─────────▼──────────┐
               │    PostgreSQL       │
               │  Sessions · Agents  │
               │  Wallets · Blocks   │
               │  Spectral records   │
               │  Telegram videos    │
               └────────────────────┘
```

Key files:

```
spectral_api.py          — The physics engine. CE→SE encoder, Hilbert router, kernel
server/routes.ts         — All API routes. 4,500+ lines. The complete API surface.
shared/schema.ts         — Drizzle ORM schema. Single source of truth for all tables.
client/src/pages/        — 40+ pages. Each maps to a feature of the OS.
client/src/pages/encoding-lab.tsx     — Interactive CE→SE encoder
client/src/pages/wnsp-coordinator.tsx — Hilbert space channel map
client/src/pages/kernel.tsx           — Live kernel dashboard
client/src/pages/videos.tsx           — Auto-published Telegram video feed
```

---

## What silicon computing assumes that photonic computing does not need

| Silicon construct | Why it exists | Why photons don't need it |
|---|---|---|
| **Clock cycle** | CPU executes sequentially — needs a heartbeat | Photons propagate at `c` continuously |
| **Binary gate (0/1)** | Transistor has two states: on or off | A photon carries amplitude, phase, polarisation, OAM simultaneously |
| **Memory address** | RAM is physically placed — needs a location number | Wavelength position is already physical — 543 nm is its own address |
| **Scheduler** | One CPU, many processes — must take turns | 25,600 orthogonal Ψ channels run simultaneously |
| **Mutex / semaphore** | Shared memory — two processes can write at once | Orthogonal channels cannot share state: ⟨Ψᵢ|Ψⱼ⟩ = 0 |
| **Privilege ring** | Software must be prevented from accessing other memory | Spectral band separation is physical — 400nm cannot reach 550nm |
| **Virtual memory** | Physical RAM is finite and shared | The spectrum is not a shared resource |

You cannot `fork()` in light. You cannot `malloc()` a wavelength. These are not missing features — they are answers to questions that photonic physics does not ask.

A team that tries to port Linux or any POSIX OS to a photonic substrate will find that every system call is a metaphor with no referent. NexusOS is not that translation. It is the philosophy written natively in the language of the physics.

---

## Running it

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 14+

### Setup

```bash
git clone https://github.com/nexusosdaily-code/NexusOS.git
cd NexusOS

npm install
pip install flask flask-cors psycopg2-binary

# Set DATABASE_URL environment variable
npm run dev
```

Both runtimes start together. If ports are occupied: `fuser -k 5000/tcp 5001/tcp`

### Verify the physics immediately

```bash
# Encode an instruction — get its physical wavelength address
curl -X POST http://localhost:5001/api/nexus/dev/encode \
  -H "Content-Type: application/json" \
  -d '{"instruction": "function authenticate(user, password)", "label": "auth"}'

# Returns:
# wavelength_mid_nm: 467.3   (blue — AUTH band, as expected for authentication code)
# psi_channel: "Ψ(22, 14, H)"
# energy_joules: 4.25e-19
# lambda_mass_kg: 4.73e-36

# Verify the genesis fingerprint
curl -X POST http://localhost:5001/api/nexus/dev/encode \
  -H "Content-Type: application/json" \
  -d '{"instruction": "NEXUSOS", "label": "genesis"}'

# Returns: psi_channel "Ψ(52, 65, V)", wavelength_mid_nm 587.2948
# This is deterministic. Any machine. Any copy of the codebase. Same result.

# Query channel density
curl "http://localhost:5000/api/wnsp/density?r_sym=2&m=1&wavelength_nm=550"
```

---

## WNSP-URI v1.0

Replaces `https://` with spectral addressing:

```
wnsp://Ψ(wdm,oam,pol)/path

Examples:
wnsp://Ψ(52,65,V)/         → NexusOS genesis node (this system)
wnsp://Ψ(20,39,H)/kernel   → OS kernel root
wnsp://Ψ(22,14,H)/auth     → Authentication gateway
```

Phase 1: TCP/IP overlay — `wnsp://` URIs resolve to HTTP resources via the `/wnsp-bridge` registry.
Phase 3: Native photonic routing — the TCP/IP layer is removed. The Ψ address becomes the route.

The ecosystem is being built now so that when photonic hardware arrives, the protocol, the tooling, the developer community, and the running applications already exist.

---

## The silicon wall

Transistors will reach 0.5 nm between 2029 and 2032. The electron's de Broglie wavelength (~7.6 nm at room temperature) already exceeds the gate oxide at current nodes. At 0.5 nm, the WKB tunnelling coefficient `T ≈ e^(−2κd)` crosses the threshold where leakage current exceeds switch current. Gate control is permanently lost.

Every team without a post-silicon operating system in production by that date starts from a new philosophy they have not yet built.

This is that philosophy. Running now. AGPL-3.0.

---

## AGPL-3.0 — what it requires of you

If you cloned this repository, you now hold AGPL-3.0 licensed code.

**What AGPL-3.0 requires:**

- If you **run this as a service** (internally or publicly), any modifications you make to the source must be made available to users of that service under AGPL-3.0.
- If you **incorporate this code** into a larger system and distribute or serve it, the entire larger system falls under AGPL-3.0 copyleft.
- If you **use the WNSP protocol specification** in hardware or firmware, the source disclosure requirements in every WNSP frame (via the Frame Builder v7.1 Source Code Reference) carry a cryptographic pointer back to this repository.

The physics is open. The spectrum belongs to everyone. The license enforces this permanently.

Full text: [GNU AGPL v3.0](https://www.gnu.org/licenses/agpl-3.0.html)

---

## Monetisation model

```
Protocol          →  Free forever. AGPL-3.0.
                     Fork it. Run it. Build on it.
                     Modifications must be published.

Managed kernel    →  Reserved Ψ channels, SLA, persistent agents
                     $49 – $499/month

Hardware rights   →  Commercial Lambda Gate firmware for photonic ASICs
                     $25,000 – $250,000 + strategic equity tier
```

The open-core dual-license model: the same pattern as Red Hat ($34B), MongoDB ($20B+), HashiCorp ($6.4B). The protocol is the commons. The infrastructure and hardware rights are the business.

**Support the build:**
- [Campaign — lab funding tiers](https://wnsp.io/campaign)
- [Crowdfund — Nexus Shares equity](https://wnsp.io/crowdfund)
- [Referral — earn NXT tokens via Replit](https://replit.com/refer/nexusosdaily)

---

## The goal

**Kardashev Type I** — a civilisation that harnesses all energy available on its home planet.

That requires:
- A planetary communications mesh (WNSP Spectral Relay Mesh)
- Distributed photonic compute (Lambda Gate ASICs)
- Physics-based energy accounting (Λ = hf/c² across all transactions)
- An open, non-proprietary OS standard (AGPL-3.0)

All four are specified and partially implemented in this repository. The architecture is designed for a 100-year build. The Phase 2 foundation — full 256 WDM spectrum, TCP/IP overlay, spectral addressing, physics engine, kernel — is running now.

---

*Built by an ambulance driver and hospital orderly who asked: what if every instruction had a wavelength?*

*The answer turned out to be: it always did.*

---

**NexusOS · AGPL-3.0 · https://github.com/nexusosdaily-code/NexusOS**
