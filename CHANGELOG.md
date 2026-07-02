# NexusOS — Changelog

> **First public disclosure: 2026-05-16** (AGPL-3.0)
> Physics-based blockchain OS — Kardashev Type I civilization blueprint.

---

## [Unreleased — 2026-05-29] Spectral DeFi & Bitcoin Bridge Layer

### Canonical WNSP Address → WavelengthScript → Spectral Database
- **Hub Canonical Address Panel** — live collapsible strip below the Identity Rail showing every user's `wnsp://Ψ(wdm,oam,pol)/username` URI with band-colored physics parameters.
- **WavelengthScript Declaration Generator** (`buildWavelengthScript`) — deterministic `.wls` code block for every canonical address:
  ```
  @587.3nm declare canonical {
    label    := "nexusos"
    psi      := Ψ(52,65,V)
    uri      := "wnsp://Ψ(52,65,V)/nexusos"
    band     := YELLOW
    freq_THz := 510.69
    energy_J := 3.383e-19
    mass_kg  := 3.765e-36
  }
  @emit(587.3nm, Ψ(52,65,V)) fn resolveCanonical() { … }
  ```
- **`POST /api/spectral/register-canonical`** — idempotent upsert into `wnsp_registry` with `isCanonical = true`, storing the WLS code in `spectralVector.wlsCode`.
- **`GET /api/spectral/my-canonical`** — returns full spectral params + registration status + WavelengthScript block for the logged-in user.
- **`GET /api/spectral/channel-lookup?q=…`** — search spectral database by `Ψ(wdm,oam,pol)`, `wnsp://` URI, or label. Returns enriched results with on-the-fly WLS generation.
- **Channel Lookup widget** in Hub — type any Ψ channel or label, get registered canonical info + copy WLS code instantly.

### NXT ↔ Fractal Bitcoin Atomic Swap Bridge (`/nxt-fb-swap`, `/swap`)
- **Direction A — NXT → wnsp on Fractal Bitcoin**: Burns NXT from user wallet → queues BRC-20 mint inscription → service wallet inscribes directly to user's Fractal Bitcoin Taproot address.
- **Direction B — wnsp → NXT**: User sends wnsp BRC-20 transfer to bridge address on Fractal Bitcoin, submits TX hash → verified against `mempool.fractalbitcoin.io` → NXT credited on confirmation.
- **Physics-governed rate**: 1 NXT = 20 wnsp (0.05 NXT/wnsp), consistent with Community Mint price (50 NXT / 1,000 wnsp).
- Min swap: 5 NXT · Max: 10,000 NXT per transaction.
- `nxt_fb_swaps` DB table — tracks direction, amounts, fractal address, TX hash, queue ID, status, rate snapshot.
- API: `GET /api/swap/rate` · `POST /api/swap/nxt-to-fb` · `POST /api/swap/fb-to-nxt` · `GET /api/swap/history` · `GET /api/swap/stats`.
- Compatible wallets: UniSat Fractal, OKX Web3, Xverse.

---

## [2026-05-28/29] Bitcoin DeFi Infrastructure

### GuideBot — AI Navigation Assistant
- Floating `Ask NexusOS` button available on every page.
- Understands natural language queries — maps to the correct NexusOS page with description and direct navigation link.
- Covers 35+ routes including all physics tools, DeFi features, and developer APIs.
- Context-aware: updates when new pages are added.

### Community Mint Portal (`/community-mint`)
- Burn **50 NXT** → queue inscription of **1,000 wnsp BRC-20** on Bitcoin mainnet.
- `community_mints` DB table — tracks user, mint amount, inscription status, queue ID.
- Connects to `btc_inscription_queue` — same auto-processor pipeline as all other inscriptions.
- Live queue position display, inscription ID link to UniSat explorer on confirmation.

### wnsp Staking Dashboard (`/wnsp-staking`)
- Lock any wnsp **inscription ID** → earn **100 NXT per 24-hour epoch**.
- Claim rewards anytime — accumulated since last claim, not last stake.
- Unstake at any time — accrued rewards credited on exit.
- `wnsp_stakes` DB table: `userId`, `inscriptionId`, `stakedAt`, `lastClaimedAt`, `status`.
- API: `POST /api/wnsp-staking/stake` · `POST /api/wnsp-staking/claim` · `POST /api/wnsp-staking/unstake` · `GET /api/wnsp-staking/my-stakes`.

### Fractal Bitcoin Bridge (`/fractal-btc`)
- Live fee rate display from `mempool.fractalbitcoin.io` (fastest/half-hour/economy).
- Address lookup — query any Fractal Bitcoin address for inscription history via UniSat Fractal API.
- Inscription submission panel — send raw content to Fractal Bitcoin L2 (~30-second blocks).
- Service wallet: `bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m`.

### wnsp BRC-20 — Live Bitcoin Mainnet Deployment
- **Ticker**: `wnsp` | **Max supply**: 21,000,000,000 | **Limit/mint**: 1,000
- **Deploy inscription**: `588252d8ebcdcb8542f26f944bc5f872c8edd7d5a09f7980c9afd4f9782b182bi0`
- Deployed via Taproot (P2TR) inscription — AGPL-3.0 protected first public disclosure 2026-05-16.
- Mint portal live at UniSat: `https://unisat.io/brc20/wnsp`

### Bitcoin Inscription Auto-Processor (`btc-bridge-service.ts`)
- Polls queue every 30 seconds — picks up `pending` inscriptions, broadcasts to Bitcoin mainnet.
- Taproot (P2TR) witness generation — `OP_FALSE OP_IF … OP_ENDIF` envelope format.
- Anchor UTXO system — persistent anchor address for chained inscription transactions.
- Auto fee selection from mempool.space (fastest confirmed rate).
- **Telegram low-balance alert** — fires when confirmed sats < 20,000, max once per hour, delivered via `sendAdminAlert()`.
- Service wallet WIF key loaded from `BTC_INSCRIPTION_WALLET_WIF` env secret.

### Rune Explorer Integration
- `WNSP•COMPRESSION•STATE` Rune on Bitcoin — spectral band visualization.
- Rune balance lookup via Ordiscan API with fallback to Ordinals.com.
- Band art inscriptions — SVG spectral band art inscribed as Ordinals.

### UniSat Marketplace Tab
- Live wnsp BRC-20 listing link on UniSat with current stats.
- Direct mint-from-UniSat link for users without NexusOS accounts.

### Telegram Bot (`/api/telegram`)
- Full-spectrum Telegram bot for NexusOS ecosystem advocacy.
- Commands: `/start`, `/whitepaper`, `/wnsp`, `/mint`, `/staking`, `/swap`, `/bridge`, `/help`.
- Admin alerts via `sendAdminAlert()` — used for low-balance warnings and bridge events.
- `TELEGRAM_BOT_TOKEN` env secret required.

---

## [2026-05-16 — First Public Disclosure] Core Protocol Stack

### Theory of Compression States (`/oscillating-quanta`)
- First principles — the universe's first unobserved oscillation.
- Compression mass equation: **Λ = hf/c²**
- Authority bands derived from wavelength: SYSTEM (UV) → KERNEL (Blue) → USER (Green) → GUEST (Red).

### WNSP Protocol (`/hardware-spec`)
- **AGPL-3.0 protected** formal specification — first public disclosure 2026-05-16.
- SNIC (Spectral Network Interface Controller), PHR-1 (Photonic Hash Register), Spectral Relay Mesh v1.
- 51,200 orthogonal channels: 256 WDM × 50 OAM × 2 Polarisations × 2 Propagation Directions.
- WNSP density: `D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M`.
- Maxwell equation validation replaces cryptographic hashing.

### CE-SE Pipeline (`/ce-se-pipeline`)
- **PRIMARY FEATURE** — 4-stage pipeline: paste any language → WavelengthScript transpile → bytecode compile → WNSP VM execute.
- WNSP-CE v1.0 (Character Encoding): `charCode % 128` → 128-band table (380–780nm, 3.125nm/band).
- WNSP-SE v1.0 (Spectral Encoding): CE output → Ψ channel deterministic address.

### WavelengthScript Compiler (`/wavelength-lang`)
- Physics-native language where variables bind to optical frequencies.
- Syntax: `@540nm let x := value` · `@emit(nm, Ψ) fn name() { … }` · `oscillate()`.
- Compiled to 8-byte WNSP bytecode instructions with wavelength operands.

### WNSP Virtual Machine (`/wnsp-vm`)
- Browser-native bytecode interpreter — step/run execution.
- Each Ψ channel acts as a spectral register.
- Instruction set: `EMIT`, `TUNE`, `AGENT`, `BROAD`, `PUSH`, `OSCILLATE`.

### Published Packages
- **`nexusos-ce-encoder@1.0.0`** — published on npmjs.com (`npm install nexusos-ce-encoder`). CJS + ESM, TypeScript types. `ceEncode(text) → { wavelength, band, psiChannel, energy }`.
- **`ce-encoder-py`** — installable from GitHub: `pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py`. Bit-identical output to npm package.

### Physics Engine (`server/physics.ts`)
- Deterministic channel derivation for all users.
- Fee calculation: `fee = base_fee × (E_sender / E_reference)`.
- Authority bands enforced: higher authority = shorter wavelength = higher energy = higher fees.

### NXT Token
- 8 decimal places · 21 billion max supply.
- Transaction costs derived from E=hf (user's spectral wavelength).
- Wallet transfers use the user's unique spectral channel wavelength.

### Governance System (Stage 5)
- On-chain protocol governance — 11 live protocol parameters adjustable by KERNEL+ band users.
- Voting weighted by spectral authority band.
- Proposals require vote count + weight thresholds — pass triggers immediate in-memory update.

### Other Core Features
- Phone-based authentication with bcrypt password hashing.
- P2P media sharing — chunk-based distribution, WebRTC/Socket.IO streaming, HTTP Range Requests.
- Spectral Contracts (`/spectral-contracts`) — document signing via `SHA-256(content) ⊕ hex(λ_signer)`.
- WNSP Bridge (`/wnsp-bridge`) — TCP/IP overlay mapping `wnsp://` URIs to HTTP resources.
- Spectral Search (`/spectral-search`) — cross-layer search ranked by EM proximity + Shannon coherence.
- Spectral Router (`/spectral-router`) — DNS-free packet routing via Ψ channel addressing.
- Compression Explorer (`/compression-explorer`) — interactive Λ=hf/c² curve visualization.
- K1 Orchestration (`/k1-orchestration`) — Kardashev Type I AI agent coordination layer.
- Developer API (`/developer`) — API key management with NXT creation fee.
- Mobile SDK (`/mobile-sdk`) — native iOS (Swift) and Android (Kotlin) SDKs.

---

## Architecture Summary

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Radix UI · shadcn/ui · Tailwind CSS v4 |
| Backend | Express/Node.js (port 5000) + Python/Flask (port 5001) |
| Database | PostgreSQL + Drizzle ORM |
| Bitcoin | Taproot P2TR inscriptions · BRC-20 · Ordinals · Fractal Bitcoin L2 |
| Protocol | WNSP (Wavelength Network Substrate Protocol) — replaces TCP/IP |
| Language | WavelengthScript v1.0 — compiled to WNSP bytecode |
| Physics | Maxwell equations · E=hf · Λ=hf/c² · 51,200 Hilbert space channels |
| License | AGPL-3.0 |

---

*NexusOS is written in the language of the destination hardware (photonic ASICs, ~2032), not the bridge hardware (silicon). When photonic computing arrives, no rewrite needed — the architecture already speaks in wavelengths.*
