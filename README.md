# NexusOS — Wavelength Operating System

**AGPL-3.0 project · WavelengthScript language technology and blockchain development**

## The direction has not changed

**WavelengthScript and the blockchain have always been the project's primary
focus.** WavelengthScript is the vehicle for developing the blockchain, supported
by WNSP's spectral-coordinate encoding and protocol work. This is a clarification
of the longstanding direction, not a new pivot.

The wider NexusOS vision is a century-long project looking toward 2126, for
future generations to continue building. Photonic hardware and other additions
are future development, not today's delivered capabilities or prerequisites
for progressing the language and blockchain. They can add credibility as they
are implemented, tested and supported by reproducible evidence and independent
review—not merely because they are proposed.

[Read the project direction and present/future scope](./docs/PROJECT_DIRECTION.md).

[![npm](https://img.shields.io/npm/v/nexusos-ce-encoder?label=nexusos-ce-encoder&color=5c3eec)](https://www.npmjs.com/package/nexusos-ce-encoder)
[![Disclosures](https://img.shields.io/badge/research-numbered%20disclosures-blueviolet)](./PRIOR_ART.md)
[![Changelog](https://img.shields.io/badge/changelog-v2.0.0-22c55e)](./CHANGELOG.md)

> **Hardware fundraising and promotional broadcasts are on hold.**
> [Engineering review and complete reference-system requirements](./docs/HARDWARE_ENGINEERING_REVIEW.md)
> distinguish current conventional-host software from unvalidated photonic concepts.
> Independent engineering review, a costed BOM, physical tests and explicit founder
> approval are required before release. Documentation is not hardware validation.
> This is a founder directive; live runtime enforcement must be deployed and verified.
>
> **Hardware correction:** Earlier descriptions, including AI-assisted explanations,
> overstated what the hardware evidence established. Reported electrical coil tests
> are not proof of photonic computation or a complete SNIC/PHR-1 system.
> See the [hardware evidence and correction record](./docs/HARDWARE_EVIDENCE.md).

> **Start here: [Research status, evidence and corrections](./docs/RESEARCH_STATUS.md).**
> NexusOS currently runs as software on conventional computers. Its spectral
> models and proposed photonic architecture are not a demonstrated photonic
> processor, force unification or gravity-control system.
> [Mapping distinctions](./docs/RESEARCH_STATUS.md#mapping-profiles) ·
> [Act-by-Act evidence limits](./docs/RESEARCH_STATUS.md#act-by-act-evidence-boundaries)

---

## What distinguishes WavelengthScript/WNSP?

> **WavelengthScript is the core language technology driving NexusOS blockchain development,
> alongside WNSP spectral-coordinate encoding. The current focus is working software
> on conventional computers; wider developments belong to a century-long vision.**

WavelengthScript is the programming-language component; WNSP is the associated
encoding, addressing and protocol research. The design philosophy assigns
supported human-readable characters to agreed spectral coordinates. The
contribution being investigated is the particular combination of these rules,
not the invention of colour alphabets, optical symbol encoding, photonic
programming or interoperability individually.

Earlier colour alphabets, wavelength-shift keying, Blackbird/Strawberry Fields,
Perceval interoperability and ITU optical grids overlap with different parts.
They are not automatically exact equivalents; their existence also means that
broad "first language for light" or "first assignment of letters to light"
claims are not substantiated here.

Read the [sourced differentiation and comparison](./docs/WAVELENGTHSCRIPT_POSITIONING.md)
for actual mapping examples, differences from earlier work and the tests still
needed. This initial comparison does not establish historical priority,
patentability, native photonic execution or universal interoperability.
The [website transparency record](https://wnsp.io/research-transparency)
is intended to use the same positioning; website changes require publication separately.

## P2P, Wave Vault and live broadcasting — 28 October 2026

The current implementation includes:

- **P2P file sharing** by registered wave-channel address, recipient selection
  through the directory, transfer acceptance/acknowledgement and broadcast mute.
- **Wave Vault** private whole-file storage, virtual folders, an incoming
  **Shared with me** view and explicit, revocable read grants. Original bytes
  are stored in private App Storage; PostgreSQL indexes the files and grants.
  Knowing a wave coordinate alone does not grant access.
- **Spectral Broadcast** public or privately invited live rooms, linked from
  P2P and Wave Vault. Sign-in and server-side authorization remain required.
  Camera-only broadcasters can switch front/rear video while keeping the room
  and microphone; switching is unavailable during recording or Screen/Both mode.
- A public **[live streaming guide](https://wnsp.io/live-guide)** explaining
  sender/receiver steps, permissions, sound controls and compatibility limits.
  Source updates and website publication are separate operations.

**Physical-device evidence reported by the project owner on 28 October 2026:**
Wave Vault sharing was successfully tested in both directions between iPhone
and Samsung, with an additional iPad sharing test. Live iPhone Chrome → Samsung
Chrome delivered visible video and audible voice/TV sound on the same Wi-Fi.
Live **iPhone Safari → iPad Safari** was also confirmed; audio and front/rear
camera switching were not separately confirmed for that test.

These are specific working-software results, not universal compatibility,
physical-photonic transmission or guaranteed emergency delivery. The earlier
Safari-to-Samsung failure remains unresolved. Live media uses direct WebRTC
without a TURN relay fallback. Wave Vault is server-stored private sharing,
not direct WebRTC file delivery or end-to-end encryption. Files and live rooms
have separate permissions; revocation cannot erase already downloaded copies.

**Sats commerce remains gated:** listings and buyer-acceptance settlement code
exist, but new P2P purchases and tips remain disabled pending the wider financial
audit. This update does not authorize moving real funds or clearing that gate.

Details and reproducible checks:
[P2P file exchange](./docs/p2p-file-exchange.md) ·
[Wave Vault](./docs/wave-vault.md) ·
[Live access and sats commerce](./docs/p2p-live-commerce.md) ·
[Native live-video verification](./docs/live-video-browser-verification.md) ·
[Shared sats writer audit](./docs/shared-sats-writer-audit.md).

## Current software scope and multilingual transparency

The development workspace now includes **23 curated language/script presets**
and a reversible, versioned Unicode-to-coordinate profile. Modern examples
include Hindi, Japanese, Korean, Tamil, Thai and Amharic; historical examples
include Egyptian hieroglyphs, Sumerian/Akkadian cuneiform, Ancient Greek,
Old Persian, Runic, Ogham and Linear B.

The merged workspace catalogue uses **Unicode 17.0.0** properties to browse
assigned characters, look up code points, search official character names and
typed aliases, and append selected characters into a text sequence.
These are **encoding and software tools**, not human-language translation,
ancient-script decipherment, a new Unicode standard or evidence of native
photonic execution. The same script may serve several languages.

The executable source-language path is a **defined Python subset** translated
to WavelengthScript and run in the VM. Unsupported syntax and libraries remain
unsupported; other source-language encoding previews must not be described as
complete compilers or runtimes.

**Release boundary:** These statements describe implemented and tested
development-workspace capabilities. Check the source branch and pull request
for implementation changes; documentation alone does not establish what has
merged into `main`, publish packages, deploy the website or establish that the
public website contains the latest changes.
Existing legacy coordinates, account identities and ledger addresses are not
reassigned by the opt-in Unicode profile.

Read the [multilingual software status and verification boundaries](./docs/MULTILINGUAL_TRANSPARENCY.md)
for the mapping, complete preset list, catalogue scope, test evidence,
unfinished work and the unresolved security-scanner discrepancy.

## Public project pages

Public project pages are listed below. Availability of an application page is
not evidence that the proposed physical hardware works; some services require
authentication or configuration.

| Page | What it does |
|---|---|
| [Campaign status](https://wnsp.io/campaign) | Hardware fundraising and promotions on hold; not a current solicitation |
| [Crowdfund](https://wnsp.io/crowdfund) | Project funding information; this README does not establish investment or ownership rights |
| [Videos](https://wnsp.io/videos) | Auto-published Telegram video feed |
| [WNSP Paper](https://wnsp.io/wnsp-paper) | Formal WNSP protocol specification (AGPL-3.0) |
| [Hardware requirements](https://wnsp.io/hardware-spec) | Engineering hold, draft conventional-host architecture, missing evidence and archived unvalidated concepts |
| [CE-SE Pipeline](https://wnsp.io/ce-se-pipeline) | Source-encoding and VM demonstrations; executable language support is bounded, not “any language” |
| [WNSP VM](https://wnsp.io/wnsp-vm) | Browser-native bytecode interpreter, step/run execution |
| [Compression Explorer](https://wnsp.io/compression-explorer) | Interactive Λ=hf/c² compression curve visualisation |
| [Physics Sequence](https://wnsp.io/oscillating-quanta) | 20-act sequence — one equation to the Bogoliubov transform |

---

## Physics Sequence — 20 Acts

A research sequence combining established equations, software models and
proposed extensions. It does not establish a first cosmic oscillation or a
unified physical theory. Historical titles are retained below; read them with
the [current evidence qualifications](./docs/RESEARCH_STATUS.md#act-by-act-evidence-boundaries).

| Act | Title | Equation | Route |
|-----|-------|----------|-------|
| 1 | Theory of Compression States | Λ=hf/c² | [/oscillating-quanta](https://wnsp.io/oscillating-quanta) |
| 2 | The Universal ONE | f₀ derives Λ | [/universal-one](https://wnsp.io/universal-one) |
| 3 | Unified Compression Theory | Proposed force-scale organisation; not established unification | [/unified-compression-theory](https://wnsp.io/unified-compression-theory) |
| 4 | The Mechanism | ΔE=hf₀(2ⁿ²−2ⁿ¹) | [/matter-protocol](https://wnsp.io/matter-protocol) |
| 5 | The Address | Finite spectral namespace; not a unique address for every physical state | [/universal-address](https://wnsp.io/universal-address) |
| 6 | The Catalogue | n=log₂(mc²/E₀) | [/element-catalogue](https://wnsp.io/element-catalogue) |
| 7 | The Trap | Standing-wave proposal; superposition is not a tensor product | [/standing-wave-trap](https://wnsp.io/standing-wave-trap) |
| 8 | The Lossless Channel | Low-loss proposal; no measured α=0 or universal ZPE noise-power floor | [/lossless-channel](https://wnsp.io/lossless-channel) |
| 9 | The Cavity | WGM resonance, r_c | [/resonance-cavity](https://wnsp.io/resonance-cavity) |
| 10 | The Exchange | Ω_R=2g, polariton | [/polariton-exchange](https://wnsp.io/polariton-exchange) |
| 11 | The Emitter | F_p=(3/4π²)(λ/n)³(Q/V) | [/the-emitter](https://wnsp.io/the-emitter) |
| 12 | The Network | ω(k)=ω₀−2J·cos(ka) | [/the-network](https://wnsp.io/the-network) |
| 13 | The Observer | χ=g²/Δ | [/the-observer](https://wnsp.io/the-observer) |
| 14 | The Memory | T₂≤2T₁ | [/the-memory](https://wnsp.io/the-memory) |
| 15 | The Void | Proposed void-scale comparisons; not a measured universal boundary | [/cosmic-lattice](https://wnsp.io/cosmic-lattice) |
| 16 | The Entangler | \|Φ⁺⟩=(|00⟩+\|11⟩)/√2 | [/the-entangler](https://wnsp.io/the-entangler) |
| 17 | The Field | [â,â†]=1 | [/the-field](https://wnsp.io/the-field) |
| 18 | The Coherent State | â\|α⟩=α\|α⟩ | [/the-coherent-state](https://wnsp.io/the-coherent-state) |
| 19 | The Squeezed State | ΔX₁·ΔX₂≥¼ | [/the-squeezed-state](https://wnsp.io/the-squeezed-state) |
| 20 | The Bogoliubov Transform | S†âS=â·cosh(r)−â†·sinh(r) | [/the-bogoliubov-transform](https://wnsp.io/the-bogoliubov-transform) |

Act 20 explores Bogoliubov transformations and a proposed compression-state
interpretation. Related transformations occur in multiple established theories,
but bosonic and fermionic cases have different constraints. Their mathematical
use does not establish that gravity is an octave boundary or that the project
has experimentally unified these phenomena.

### Historical numbered disclosures

See [`PRIOR_ART.md`](./PRIOR_ART.md) for the register and its stated disclosure
dates, rather than relying on an old claim-count summary. The original numbered
wording is preserved. Publication does not establish experimental truth,
independent validation, novelty, patentability or legal priority.

See [research attribution and corrections](./docs/RESEARCH_STATUS.md) for the
role of AI assistance and qualifications to earlier explanations.

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

This repository contains **NexusOS**, a hosted application with a WavelengthScript
compiler/interpreter, spectral addressing models and application services.
WNSP has had different expanded names in historical documents; those names do
not imply that every encoder or protocol version is interchangeable.

The software calculates wavelength-related values and executes supported
instructions. It does not replace cryptographic hashes, conventional physical
memory or a computer's underlying operating system. Native photonic execution
remains a hardware research objective.

In development, `npm run dev` starts:

- **Node.js on port 5000** — authentication, wallet, P2P media, blockchain, API gateway
- **Python/Flask on port 5001** — spectral encoding and numerical models

The development Flask subprocess is skipped in production by `server/index.ts`;
do not assume that the standalone Python endpoints are production services.

The moment both are running, you can do this:

```bash
curl -X POST http://localhost:5001/api/nexus/dev/encode \
  -H "Content-Type: application/json" \
  -d '{"instruction": "hello world", "label": "test"}'
```

This returns a software-derived spectral representation. A numerical wavelength
is not a measurement of emitted light. The repository uses both mapping tables
and cryptographic derivations, depending on the versioned profile.

---

## Account channel derivation is not authentication

The channel coordinator assigns Ψ addresses deterministically using SHA-256. The derivation pipeline is public and requires no running code to verify:

```
digest = SHA-256(input)
wdm = digest[0]
oam = digest[1] % 50
pol = H if digest[2] % 2 == 0 else V
wavelength_nm = 380 + wdm * (400 / 255)
```

Verify in one line, no dependencies beyond Python's standard library:

```bash
python3 -c "
import hashlib
h = hashlib.sha256(b'NEXUSOS').digest()
wdm, oam, pol = h[0] % 256, h[1] % 50, h[2] % 2
print(f'Psi({wdm}, {oam}, {\"V\" if pol else \"H\"})')
"
```

This illustrates one account-mapping profile, not a universal genesis address.
Reserved service coordinates and other encoders follow their own rules.
Although SHA-256 is collision-resistant, projecting its output into a small
coordinate set is not: different inputs can share an address. Reproducing a
public coordinate does not prove identity, origin or which code is running.

---

## Compression-state bookkeeping

```
Λ = hf/c²
```

- `Λ` — the project's name for photon energy expressed as a mass equivalent (kg)
- `h` — Planck's constant: 6.626 × 10⁻³⁴ J·s
- `f` — frequency (Hz)
- `c` — speed of light: 2.998 × 10⁸ m/s

This combines `E = hf` with the conversion `E/c²`; it does not give a photon
rest mass or specify compression pressure or volume. At the selected 555 THz
reference, the mass equivalent is approximately `4.09 × 10⁻³⁶ kg`.
That frequency is not an observed first oscillation.

The Russell-inspired model `f_n = 2^n f_0`, `Λ_n = 2^n Λ_0` organises scales
by octaves. Interpreting those coordinates as material stability or force
unification is an additional, unverified hypothesis. Spectral fees and
authority categories are software policies, not measured transaction energy
consumption or privileges enforced by fundamental physics.

---

## The encoding stack

Two layers, both running:

### Layer 1 — WNSP-CE v1.0 (Character Encoding)

Projects characters into spectral tokens using a selected mapping profile:

```
"authenticate(user)" → ordinals [97, 117, 116, ...] → normalised [0.38, 0.46, 0.45, ...]
```

The 128-entry CE table maps ASCII positions deterministically. Modulo projection
can alias non-ASCII characters; retain the original payload when lossless text
transport is required. Account, character, name and proposed optical-bin
mappings are distinct; see [mapping profiles](./docs/RESEARCH_STATUS.md#mapping-profiles).

### Layer 2 — WNSP-SE v1.0 (Spectral Encoding)

Maps CE tokens to numerical frame descriptions. The following illustrates
field names, not a calibrated physical measurement or a normative test vector:

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

The legacy Ψ label has three coordinates:

```
Ψ(wdm, oam, pol)

wdm — Wavelength Division Multiplexing index (0–255 → 380–780 nm)
oam — Orbital Angular Momentum mode (0–49)
pol — Polarisation state (H or V)
```

The extended model adds two propagation directions:
**256 × 50 × 2 × 2 = 51,200 nominal coordinate combinations**.
This is not measured simultaneous optical capacity. Physical mode independence,
loss and crosstalk must be established for a particular device.

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

With the listed inputs the model calculates **51,200 symbols/cycle**.
This is a configured arithmetic output, not a measured hardware rate. The
factor `R_sym` here must not be confused with the direction count above.

This label-counting model does not supersede Shannon capacity. Physical
capacity depends on bandwidth, noise, power and usable modes:

```
Shannon: C = B · log₂(1 + SNR) for the stated channel assumptions
Multiple channels: account for each usable channel and shared resource limits
```

An illustrative future parameter choice gives
256 × 50 × 2 × R₁₆ × M₆₄ = **26,214,400 symbols/cycle**.
It is a proposal, not a benchmark.

Energy-normalised density (connects to Λ=hf/c²):

```
D_energy = D_WNSP · λ / (h · c)
```

`λ/(hc)` has units of inverse photon energy. The expression is a model
normalisation, not a wall-plug energy-efficiency measurement; source, detection,
conversion, control and thermal overheads must be included in a real benchmark.

Live API: `GET /api/wnsp/density?r_sym=2&m=1&wavelength_nm=550`

---

## Spectral authority bands

```
WDM 0–63    │ 380–449 nm │ violet/UV    │ SYSTEM   — OS core, kernel, process management
WDM 64–127  │ 450–489 nm │ blue         │ KERNEL   — authentication, sessions, security
WDM 128–191 │ 490–564 nm │ cyan/green   │ USER     — application logic, computation
WDM 192–255 │ 565–780 nm │ yellow/red   │ GUEST    — storage, external agents
```

These are historical software classifications, not a universal physical
permission boundary or a single shared mapping across all profiles.
Authorisation is enforced by application controls; wavelength alone does not
prevent an unauthorised request.

---

## The AI OS Kernel

A software agent coordinator models boot phases, persistent agent records,
watchdog events and heartbeats. A boot log does not establish autonomous
general intelligence or physical optical execution:

```
PHASE 1 — SCHEMA     Database tables created / verified
PHASE 2 — RESTORE    Agents restored from persistent state
PHASE 3 — CORE       Core agents registered on Ψ channels
PHASE 4 — WATCHDOG   Dead-agent monitoring daemon started
PHASE 5 — EVENTS     KernelEventBus open, BOOT event logged
PHASE 6 — HEARTBEAT  Agent heartbeat active — pulsing every 120s
```

Illustrative historical agent labels (not authentication credentials or a
guarantee of the current deployment's state):

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

Development architecture: Node/Express and a Python model service with
PostgreSQL. The Python subprocess is not started by the production entry point.
The diagram summarises components rather than certifying a deployed topology:

```
┌─────────────────────────────────────────────────────┐
│                    Client (React)                    │
│         Vite · TypeScript · Tailwind CSS             │
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
server/routes.ts         — Main API route wiring; delegates to feature modules
shared/schema.ts         — Drizzle ORM schema. Single source of truth for all tables.
client/src/pages/        — Application and research pages
client/src/pages/encoding-lab.tsx     — Interactive CE→SE encoder
client/src/pages/wnsp-coordinator.tsx — Hilbert space channel map
client/src/pages/kernel.tsx           — Live kernel dashboard
client/src/pages/videos.tsx           — Auto-published Telegram video feed
```

---

## What photonic hardware still needs

Optical channels can support useful parallelism for selected workloads, but
they do not remove the need for timing, storage, scheduling, synchronisation,
security or finite-resource management. Propagation speed in a material is not
generally the vacuum speed `c`, and propagation alone is not computation.

The proposed architecture must demonstrate a useful instruction mapping,
interfaces and an end-to-end advantage against a relevant electronic or hybrid
baseline. Existing operating systems are not rendered meaningless by the use
of optical components.

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

Both runtimes start together in development. Configure required services and
credentials privately; do not commit credentials or production data.

### Inspect the development software model

```bash
# Encode an instruction — inspect calculated spectral fields, not emitted light
curl -X POST http://localhost:5001/api/nexus/dev/encode \
  -H "Content-Type: application/json" \
  -d '{"instruction": "function authenticate(user, password)", "label": "auth"}'

# Compare another input under the same endpoint's mapping profile
curl -X POST http://localhost:5001/api/nexus/dev/encode \
  -H "Content-Type: application/json" \
  -d '{"instruction": "NEXUSOS", "label": "genesis"}'

# Query the configured density model, not measured hardware throughput
curl "http://localhost:5000/api/wnsp/density?r_sym=2&m=1&wavelength_nm=550"
```

---

## WNSP-URI v1.0

An application-level spectral URI convention, not a replacement for HTTPS
transport security:

```
wnsp://Ψ(wdm,oam,pol)/path

Path example (illustrative coordinate, not a verified service identity):
wnsp://Ψ(20,39,H)/kernel
```

Current software uses conventional networking and a registry/bridge model.
Native optical routing is proposed future work; it has not been demonstrated
by the URI format. Resolution still requires infrastructure and access controls.

Software/hardware compatibility must be established experimentally; it is not
guaranteed that future devices can execute existing applications unchanged.

---

## Why investigate photonics?

Electronic scaling faces leakage, power, thermal, interconnect and fabrication
constraints. Node names are not literal dimensions of every transistor feature,
and there is no established universal date at which all electronic switching
fails. Photonics is a promising complement for some tasks, not a demonstrated
universal replacement. NexusOS investigates one proposed software/hardware
approach within that wider engineering effort.

---

## Licensing

The project describes its code as AGPL-3.0. Consult the applicable licence
notices, third-party licences and the full terms; this README is not a legal
determination. Software licensing does not by itself establish exclusive rights
over physical laws, every independent implementation, hardware or AI training.
This documentation update does not relicense the project.

Full text: [GNU AGPL v3.0](https://www.gnu.org/licenses/agpl-3.0.html)

---

## Proposed monetisation model

The following are planning figures, not evidence of delivered hardware,
guaranteed service levels, available commercial licensing rights or investment
entitlements. Actual offers require their own applicable terms.

```
Protocol          →  Free forever. AGPL-3.0.
                     Fork it. Run it. Build on it.
                     Subject to applicable licence terms.

Managed kernel    →  Reserved Ψ channels, SLA, persistent agents
                     $49 – $499/month

Hardware rights   →  Commercial Lambda Gate firmware for photonic ASICs
                     $25,000 – $250,000 + strategic equity tier
```

The project explores managed services and hardware-related commercial
arrangements alongside open-source software. This is not a claim of a
validated business valuation or independently confirmed commercial rights.

**Support the build:**
- [Campaign — lab funding tiers](https://wnsp.io/campaign)
- [Crowdfund — project funding information](https://wnsp.io/crowdfund)
- [Referral — earn NXT tokens via Replit](https://replit.com/refer/nexusosdaily)

---

## Core goal and long-term vision

The core development goal has always been **WavelengthScript and the blockchain**.
The wider proposals below are work for future generations; they do not replace
that priority or establish what is available today.

**Long-term aspiration: Kardashev Type I** — a civilisation that harnesses all
energy available on its home planet.

The project's long-term proposals include:
- A planetary communications mesh (WNSP Spectral Relay Mesh)
- Distributed photonic compute (Lambda Gate ASICs)
- Spectral energy models (not measured whole-system energy accounting)
- An open, non-proprietary OS standard (AGPL-3.0)

The repository implements software models and services; it does not establish
planetary infrastructure, a photonic ASIC or Kardashev-scale energy use.
The vision extends towards 2126 as an ambition, not a guaranteed delivery date.
Human-life safeguards and accountable AI operation are design objectives;
proposed governance is not automatically enacted or globally enforceable law.

---

Developed under the founder's direction with AI assistance, including Replit
Agent, in code and research explanations. Earlier AI-assisted overstatements
are acknowledged in the [research record](./docs/RESEARCH_STATUS.md).

---

**NexusOS · AGPL-3.0 · https://github.com/nexusosdaily-code/NexusOS**
