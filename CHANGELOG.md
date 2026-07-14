# NexusOS — Changelog

> **First public disclosure: 2026-05-16** (AGPL-3.0)
> Physics-based blockchain OS — Kardashev Type I civilization blueprint.

---

## [2026-07-14] WNSP Quantum Mechanisms & Attributes

### Hilbert Space Channel Model — Quantum Mechanical Guarantees
- **Channel orthogonality is a physics law, not software policy**: `⟨Ψᵢ|Ψⱼ⟩ = 0` holds by quantum mechanics for all 51,200 Ψ channels — no routing algorithm, no hash function, no consensus protocol required.
- **Quantum dimension breakdown** — each channel is a simultaneous eigenstate across four independent quantum numbers:
  | Quantum number | Variable | Count | Physical basis |
  |---|---|---|---|
  | WDM wavelength | `N_λ` | 256 | Optical frequency band (380–780 nm, 1.5625 nm/step) |
  | OAM (orbital angular momentum) | `N_OAM` | 50 | Laguerre-Gaussian mode index ℓ = 0…49 |
  | Polarisation | `N_Pol` | 2 | Photon spin eigenstate (H / V) |
  | Propagation direction | `N_Dir` | 2 | +k̂ forward / −k̂ backward (disclosed 2026-07-02) |
  **Total: 51,200 orthogonal Ψ channels** (256 × 50 × 2 × 2)
- WNSP Density Equation: `D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M`

### Compression State Quantum Attributes
- **Compression mass**: `Λ = hf/c²` — every photon carries a compression mass; heavier Λ = lower authority band (longer wavelength, more compressed).
- **Energy-authority duality**: `E = hf` maps directly to permission band — SYSTEM (UV, highest f) → KERNEL (Blue) → USER (Green) → GUEST (Red). Authority is a physical observable, not a database flag.
- **Quantised energy transitions**: `ΔE = hf₀(2ⁿ²− 2ⁿ¹)` — element formation follows discrete octave jumps, not a smooth continuum. Mass exists only at resonant hypersurfaces in compression subspace.
- **Ghost node n=36**: Nature builds no stable nucleus at octave index n=36 (mass ~169.33 u). This is the first empirically confirmed gap in the WNSP resonant hypersurface lattice — disclosed 2026-07-13 by Te Rata Pou. The periodic table is a subset of the compression state manifold, not its own separate system.

### Quantum Field Attributes — OAM & Berry Phase
- **Orbital Angular Momentum (OAM)** quantum number ℓ indexes the helical phase front of each Ψ channel (`e^{iℓφ}` azimuthal phase). ℓ = 0 is the fundamental Gaussian; ℓ ≠ 0 modes carry quantised angular momentum ℓℏ per photon.
- **Whispering Gallery Mode (WGM) resonance**: Each compression octave corresponds to a Russell-sequence resonant cavity. The mode spectrum maps to the same octave progression as musical harmonics — a direct physical link between standing-wave physics and compression state indexing.
- **Berry phase → Ψ topological encoding**: A photon traversing a Ψ channel accumulates a geometric (Berry) phase proportional to the solid angle swept in polarisation space. This phase encodes topology — it cannot be removed by local gauge transformations, making Ψ channel addresses intrinsically robust to local perturbations.
- **Sub-mm / THz validation (2025 research)**: Recent THz spectroscopy independently confirms that OAM modes in the sub-mm range exhibit the orthogonality and mode-capacity scaling predicted by the WNSP channel model.

### Zero-Point Energy Floor & Channel Capacity
- **ZPE noise floor**: Every Ψ channel has a minimum energy `E_ZPE = ½ℏω`. Shannon capacity at the ZPE floor: `C = B · log₂(1 + hf₀ / ½ℏω)`. This sets a physically-derived upper bound on lossless information density per channel — not an engineering choice.
- **Act 8 Lossless Channel** (`/lossless-channel`): `Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)` — tensor product of standing-wave traps forms a lossless composite channel. Each constituent trap is a counterpropagating superposition: `Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)`.

### Post-Quantum Cryptographic Layer (ML-DSA-65)
- Every Ψ channel registration is signed with an **ML-DSA-65 lattice keypair** (FIPS 204) — quantum-computer-resistant by construction.
- Lattice public key stored per-user in `users.lattice_pub_key`; per-channel key in `wnsp_registry.lattice_pub_key`.
- `server/lattice-identity.ts` — deterministic ML-DSA-65 key derivation from `(userId, spectralNm)`, reproducible without storage.
- Backfill on every login: if a user's lattice key is missing, it is silently derived and stored.
- **Why ML-DSA?** A Ψ channel address is permanent (derived from physics). Its signature must survive beyond the quantum-computing threshold (~2030s). RSA and ECDSA do not.

### Authentication Hardening (2026-07-14)
- Auth hook now retries `/api/auth/me` up to 3× on 401 (with 600 ms / 1200 ms back-off) before evicting the session token — eliminates false logouts from transient DB connection spikes under load.
- Guards against `"undefined"` / `"null"` string tokens in localStorage being sent as Bearer credentials.
- `ProtectedRoute` redirect logic simplified — removed intermediate state that could race against the async auth check.
- Auth page now detects an already-authenticated session and redirects directly to `/hub` — prevents the "login loop" symptom reported under high traffic.

---

## [2026-07-09] Platform Security & Bot Defense Hardening

### Traffic Logging & Bot Detection (`server/traffic-logger.ts`)
- Multi-layer bot/scanner detection: 90+ signature patterns covering known crawlers, AI bots (GPTBot, ClaudeBot, PerplexityBot, ByteDance-Spider…), pentest/recon tools (Nuclei, Nikto, Nmap, Masscan, Shodan, Censys, SQLMap, Gobuster, FFUF…), and headless automation (Puppeteer, Playwright, Selenium, HeadlessChrome).
- Defense-in-depth Layer 2: any request from a known datacenter/hosting IP that lacks a real browser rendering-engine token (Chrome/, Firefox/, Safari/, Gecko/…) is flagged even without a matching signature — catches unknown spoofed clients.
- Legacy/dead-browser detection: flags UAs spoofing extinct device stacks (Internet Explorer/Trident, Samsung SGH, Symbian, BlackBerry ≤7, Opera Mini ≤4, J2ME, Windows CE, Siemens) — no genuine 2026 visitor runs these.
- Self-identifying-crawler rule: any User-Agent embedding a URL (`http://`/`https://`) is flagged — real browsers never do this, only bots advertising a contact/operator link.
- Named scanner blocks added: Jagitek, LeadResearch, SecurityResearch, Assetnote, TLM-Audit-Scanner, RecordedFuture, Dataminr, and others.
- Honeypot-path hits are tagged and force-classified as bot traffic regardless of UA.
- GeoIP country + hosting-provider enrichment pipeline, with in-memory caches now capped at 50k entries (oldest-key eviction) to prevent unbounded memory growth under sustained scraper traffic.
- Added `traffic_logs_ip_idx` index — the country-fill and reclassification queries were doing full table scans on `ip` as the table grows.

### Vulnerability Fixes
- Added HTML escaping on developer and docs pages to close a cross-site-scripting (XSS) gap.
- Removed a hardcoded API key from the codebase.
- Patched dependencies flagged critical/high severity in security audits (multiple passes).
- Hardened admin-role checks to consistently accept `role === "admin"` OR the `isAdmin` flag, closing a gap where either check alone could lag in production.
- Rune Guard — enforced safe UTXO selection (`getSafeUTXOs()`) across every Bitcoin transaction builder so Mint/Transfer Runestones can no longer accidentally burn a Rune-bearing UTXO.
- Rune short-name etching now uses a proper commit/reveal (tapscript) flow with a 6-block gap for names under 13 characters, fixing a silent single-transaction etch failure.

---

## [2026-07-02 – 2026-07-09] WNSP Physics Sequence — 8-Act Series & Bidirectional Channels

### Full 8-Act Physics Sequence (published in order)
1. `/oscillating-quanta` — Theory of Compression States (Λ = hf/c²)
2. `/universal-one` — The Universal ONE (f₀ seeds the lattice)
3. `/unified-compression-theory` — Unified Compression Theory (4 forces = 1 Λ)
4. `/matter-protocol` — The Mechanism (ΔE = hf₀(2ⁿ²−2ⁿ¹))
5. `/universal-address` — The Address (∀ Λ : ∃! Ψ)
6. `/element-catalogue` — The Catalogue (n = log₂(mc²/E₀))
7. `/standing-wave-trap` — The Trap (Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)) — disclosed 2026-07-07
8. `/lossless-channel` — The Lossless Channel (Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)) — disclosed 2026-07-07
- Unified cross-act navigation added to every page in the series ("Act N of 8" + next/previous teasers).
- Matter-manipulation protocol documented: octave address calculation → energy requirement → instrument interface configuration.

### WNSP Density Equation v1.0 — Bidirectional Channels
- Added `N_Dir = 2` (bidirectional propagation, +k̂ forward / −k̂ backward) as a new orthogonal Hilbert sub-space.
- **Total orthogonal Ψ channels doubled: 25,600 → 51,200** (256 WDM × 50 OAM × 2 Polarisations × 2 Directions) — first disclosed 2026-07-02.
- All public copy, structured data, and SEO metadata updated site-wide for channel-model consistency.

### Ghost Node & ZPE Physics
- Ghost node n=36 (169.33 u, no stable nucleus) and neighboring occupancy (Tm, Yb, Kr, Rb) fully modeled.
- Zero-point-energy floor and Shannon capacity at the ZPE floor derived for Act 8 (`C = B·log₂(1 + hf₀/½ℏω)`).
- New quantum-field reservation services for ghost node ranges.

---

## [2026-06-08 – 2026-07-09] SEO & Discoverability Overhaul

- **Canonical domain consolidation** — every canonical URL, OG tag, Twitter card, JSON-LD schema, sitemap entry, and `robots.txt` rule unified on **wnsp.io** (wnsp.tech now redirects to it, never the reverse).
- `llms.txt` added for AI/GEO crawler discoverability (AI Readiness).
- Static `bodyHtml` + full structured data (JSON-LD) added across dozens of public routes and microsites for crawler/LLM visibility.
- Fixed recurring crawlability issues across many passes: noindex/canonical conflicts, sitemap accuracy, dead-end internal linking, route-metadata parity across custom domains, missing `<h1>` semantics on science pages.
- Social preview images (OG/Twitter) regenerated and fixed for every custom-domain entry.
- Channel-model consistency pass — replaced legacy 25,600-channel references with the current 51,200-channel model across all public-facing copy and metadata.

---

## [2026-06-18] Spectral IDE & On-Chain Contract Execution

- **Spectral IDE + Contract Apps** — browser-based WavelengthScript editor with live transpile/compile and app scaffolding.
- **Server-side contract execution engine** — canonical WNSP VM runtime, public run endpoint (`/api/app/:slug/run`) plus authenticated execution history (`/api/contracts/:id/executions`).
- **Nexus Explorer** — on-chain VM execution audit ledger.
- Universal any-language → WavelengthScript transpiler, with API rate limiting added.

---

## [2026-06-08 – 2026-06-17] Ecosystem Growth, Wallet Integrity & Governance

- **Multi-domain ecosystem hub** — unified navigation tabs across every Nexus-owned domain.
- **Crowdfunding platform hub** — Nostr zap goals, Indiegogo campaign copy generator, scheduled cross-platform posting to Discord/Telegram/Nostr/X.
- Founding-era free NXT allocation formally closed; withdrawal limits, balance-correction tooling, and duplicate-crediting fixes shipped for the wallet system.
- **Founders & Governance pages** — founding architects/stewards disclosed, System Operator (Genesis) designation formalized, and a constitutional declaration against financial misconduct added to the genesis layer, including a maintained list of blocked bad-actor entities.
- CoinGecko/CoinSniper listing preparation — audit, KYC, and verification documentation added.

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
