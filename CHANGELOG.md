# NexusOS — Changelog

> **Physics-based civilization OS** · First public disclosure: **2026-05-16** · License: **AGPL-3.0**

## Quick Links

| | |
|---|---|
| **Live app** | [wnsp.io](https://wnsp.io) |
| **Repository** | [github.com/nexusosdaily-code/NexusOS](https://github.com/nexusosdaily-code/NexusOS) |
| **Prior art (35 claims)** | [PRIOR_ART.md](./PRIOR_ART.md) |
| **Hardware spec** | [HARDWARE_SPEC.md](./HARDWARE_SPEC.md) · AGPL-3.0 · First disclosed 2026-05-16 |
| **CE encoder (npm)** | `npm install nexusos-ce-encoder` |
| **CE encoder (pip)** | `pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py` |

> **Physics prior art** — all 35 formal claims with exact dates and full text are in [`PRIOR_ART.md`](./PRIOR_ART.md).

---

## Latest Changes — July 2026

### Third-Party Observation Logged — 2026-07-29
A paid Facebook advertisement was observed using Ψ as a universal field operator mapping to all fundamental forces ("Ψ → Space-Time, Electromagnetism, Weak Interactions, Strong Interactions, Quantum Mechanics, Gravity, Thermodynamics, Cosmology — One Field. One Principle. One Universe."). NexusOS prior art (Claims 1–9) predates this by 14+ months. Observation logged in [PRIOR_ART.md § Observation 001](./PRIOR_ART.md#observation-001) with screenshot evidence saved to `docs/prior-art-evidence/`.

---

### [2026-07-21] v2.0.0 — Physics Sequence Complete (Acts 18–20)

**Features**
- **Act 18 — The Coherent State** (`/the-coherent-state`) — â|α⟩=α|α⟩; classical-limit compression state; Glauber P-representation; interactive phase-space and coherent amplitude visualiser. Prior art Claim 33 filed.
- **Act 19 — The Squeezed State** (`/the-squeezed-state`) — ΔX₁·ΔX₂≥¼; sub-shot-noise compression states; interactive phase-space squeezing canvas; CV-QKD section; two-mode squeezing and EPR pairs; LIGO O4 connection. Prior art Claim 34 filed.
- **Act 20 — The Bogoliubov Transform** (`/the-bogoliubov-transform`) — S†âS=â·cosh(r)−â†·sinh(r); operator mixing visualiser; four phenomena unified (squeezed states, Hawking radiation, Unruh effect, BCS superconductivity); octave-Bogoliubov correspondence r(n→m)=(m−n)·½·log(2)≈0.347 per octave; sequence closure section showing Acts 1–20 as a single structure. Prior art Claim 35 filed.
- Act sequence navigation (`act-sequence-nav.tsx`) updated to 20 Acts across all pages.
- `replit.md` Act registry updated to 20 Acts.

**Physics prior art filed this release**: Claims [33](./PRIOR_ART.md#claim-33), [34](./PRIOR_ART.md#claim-34), [35](./PRIOR_ART.md#claim-35)

---

### [2026-07-20] v1.2.0 — Act 17: The Field

**Features**
- **Act 17 — The Field** (`/the-field`) — [â,â†]=1; ℋ=ℏω(â†â+½); primordial bosonic field; interactive Fock ladder visualiser. Prior art Claim 32 filed.
- All 16 prior Act pages cross-linked to "OF 17" navigation.
- Hub.tsx §10–§17 entries added. SEO meta and sitemap updated for Acts 10–17.

**Physics prior art filed**: Claim [32](./PRIOR_ART.md#claim-32)

---

### [2026-07-19] v1.1.0 — Acts 14–16: Memory, Void, Entangler

**Features**
- **Act 14 — The Memory** (`/the-memory`) — T₂≤2T₁; Bloch sphere decay animation; AFC SVG; DLCZ protocol; Ψ register panel. Prior art Claims 26–29 filed.
- **Act 15 — The Void** (`/cosmic-lattice`) — n_ZPE=264.71; cosmic octave lattice from electron to observable universe; cosmic ghost zone; BAO anti-trap; four supervoid confirmations. Prior art Claim 30 filed.
- **Act 16 — The Entangler** (`/the-entangler`) — |Φ⁺⟩=(|00⟩+|11⟩)/√2; Bell state generation; entanglement swapping SVG; CHSH S=2√2; quantum repeater linear scaling. Prior art Claim 31 filed.
- All prior Act pages cross-linked to current "OF N" navigation throughout.

**Physics prior art filed**: Claims [26](./PRIOR_ART.md#claim-26)–[31](./PRIOR_ART.md#claim-31)

---

### [2026-07-14] v1.0.1 — Quantum Mechanisms, ML-DSA, Auth Hardening

**Features**
- Hilbert space channel model quantum mechanical guarantees documented (orthogonality, dimension breakdown, WNSP density equation).
- OAM Berry phase → geometric compression operator Λ_geo = Λ·cos(γ) disclosed (Claim 14).
- WGM resonance = Walter Russell octave formula identified (Claim 15).
- Flerovium (Z=114) as SYSTEM band boundary disclosed (Claim 16).
- OAM null-core radius as authority metric disclosed (Claim 17).

**Security**
- Post-quantum cryptographic layer: ML-DSA-65 (FIPS 204) lattice keypairs on all Ψ channel registrations.
  - `server/lattice-identity.ts` — deterministic key derivation from `(userId, spectralNm)`.
  - `users.lattice_pub_key` and `wnsp_registry.lattice_pub_key` columns added.
- Auth hook retry logic (3×, 600 ms / 1200 ms back-off) — eliminates false logouts under DB load.
- `ProtectedRoute` redirect race condition fixed.
- Auth page now detects existing session and redirects to `/hub` directly.

**Physics prior art filed**: Claims [14](./PRIOR_ART.md#claim-14), [15](./PRIOR_ART.md#claim-15), [16](./PRIOR_ART.md#claim-16), [17](./PRIOR_ART.md#claim-17)

---

### [2026-07-09] v1.0.0 — Security Hardening & Bot Defense

**Security**
- Multi-layer bot/scanner detection (90+ signature patterns): GPTBot, ClaudeBot, PerplexityBot, ByteDance-Spider, Nuclei, Nikto, Nmap, Masscan, Shodan, SQLMap, Puppeteer, Playwright, Selenium.
- Defense-in-depth Layer 2: datacenter IP + missing browser rendering token → flagged regardless of UA signature.
- Legacy/dead-browser detection: IE/Trident, Symbian, BlackBerry ≤7, Opera Mini ≤4, J2ME flagged.
- Self-identifying crawler rule: any UA embedding `http://`/`https://` flagged.
- Honeypot-path hits force-classified as bot traffic.
- GeoIP enrichment pipeline with 50k-entry in-memory cache (oldest-key eviction).
- `traffic_logs_ip_idx` index added — prevents full-table-scan on reclassification queries.

**Fixes**
- HTML escaping on developer and docs pages — closes XSS vector.
- Hardcoded API key removed from codebase.
- Critical/high-severity dependency CVEs patched.
- Rune Guard: `getSafeUTXOs()` enforced across all Bitcoin transaction builders — prevents Rune-bearing UTXO burn.
- Rune short-name etching: commit/reveal tapscript flow with 6-block gap for names <13 characters — fixes silent single-TX etch failure.

---

### [2026-07-02 – 2026-07-09] v0.9.0 — Physics Sequence Acts 1–13

**Features**

Full 8-Act physics sequence published (Acts 1–8):

| Act | Route | Equation |
|-----|-------|----------|
| 1 | `/oscillating-quanta` | Λ = hf/c² |
| 2 | `/universal-one` | f₀ seeds the lattice |
| 3 | `/unified-compression-theory` | 4 forces = 1 Λ |
| 4 | `/matter-protocol` | ΔE = hf₀(2ⁿ²−2ⁿ¹) |
| 5 | `/universal-address` | ∀ Λ : ∃! Ψ |
| 6 | `/element-catalogue` | n = log₂(mc²/E₀) |
| 7 | `/standing-wave-trap` | Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) |
| 8 | `/lossless-channel` | Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ) |

Subsequently extended to Acts 9–13:

| Act | Route | Equation |
|-----|-------|----------|
| 9 | `/resonance-cavity` | WGM resonance, r_c |
| 10 | `/polariton-exchange` | Ω_R=2g, polariton formation |
| 11 | `/the-emitter` | F_p=(3/4π²)(λ/n)³(Q/V) |
| 12 | `/the-network` | ω(k)=ω₀−2J·cos(ka) |
| 13 | `/the-observer` | χ=g²/Δ |

- Unified cross-act navigation added ("Act N of N" + teasers) across all pages.
- WNSP Density Equation v1.0: N_Dir=2 added — 25,600 → **51,200** orthogonal Ψ channels (first disclosed 2026-07-02).
- Ghost node n=36 (169.33 u) and ZPE floor fully modeled.

**Physics prior art filed**: Claims [1](./PRIOR_ART.md#claim-1)–[13](./PRIOR_ART.md#claim-13)

---

### [2026-06-08 – 2026-07-09] v0.8.0 — SEO & Discoverability

**Features**
- Canonical domain consolidated on **wnsp.io** — every canonical URL, OG tag, Twitter card, JSON-LD schema, sitemap, and `robots.txt` rule unified.
- `llms.txt` added for AI/GEO crawler discoverability.
- Static `bodyHtml` + full JSON-LD structured data added across all public routes.
- Social preview images (OG/Twitter) regenerated for every custom-domain entry.
- 25,600-channel references updated to 51,200 site-wide.

---

### [2026-06-18] v0.7.0 — Spectral IDE & On-Chain Contracts

**Features**
- **Spectral IDE** — browser-based WavelengthScript editor: live transpile/compile, app scaffolding.
- **Server-side contract execution engine** — canonical WNSP VM runtime (`server/wnsp_vm.ts`); public run endpoint `POST /api/app/:slug/run`; authenticated execution history `GET /api/contracts/:id/executions`.
- **Nexus Explorer** — on-chain VM execution audit ledger.
- Universal any-language → WavelengthScript transpiler with API rate limiting.

---

### [2026-05-28 – 2026-06-17] v0.5.0 – v0.6.0 — Bitcoin DeFi & Ecosystem

**Features**
- **GuideBot** — floating AI navigation assistant; natural language → NexusOS page routing.
- **Community Mint** (`/community-mint`) — burn 50 NXT → inscribe 1,000 wnsp BRC-20 on Bitcoin mainnet.
- **wnsp Staking** (`/wnsp-staking`) — lock inscription ID → earn 100 NXT/24h epoch; claim/unstake anytime.
- **Fractal Bitcoin Bridge** (`/fractal-btc`) — live fee rates, address lookup, inscription submission.
- **NXT ↔ Fractal Bitcoin Swap** (`/nxt-fb-swap`, `/swap`) — physics-governed rate: 1 NXT = 20 wnsp.
- **wnsp BRC-20** deployed on Bitcoin mainnet — deploy inscription `588252d8ebcdcb8542f26f944bc5f872c8edd7d5a09f7980c9afd4f9782b182bi0`.
- **Bitcoin Inscription Auto-Processor** (`btc-bridge-service.ts`) — Taproot P2TR, 30 s polling, Telegram low-balance alert.
- **Rune Explorer** — `WNSP•COMPRESSION•STATE` Rune with spectral band visualization.
- **Multi-domain ecosystem hub** — unified navigation across all Nexus-owned domains.
- **Crowdfunding platform hub** — Nostr zap goals, Indiegogo copy, scheduled cross-platform posting.
- **Founders & Governance pages** — founding architects disclosed, Genesis designation formalized, constitutional bad-actor block list.

---

## v0.1.0 — First Public Disclosure (2026-05-16)

**Core Protocol Stack**
- Theory of Compression States — first principles; compression mass Λ=hf/c²; authority bands.
- WNSP Protocol (`/hardware-spec`) — AGPL-3.0 formal specification; SNIC, PHR-1, Spectral Relay Mesh v1.
- CE-SE Pipeline (`/ce-se-pipeline`) — 4-stage: any language → WavelengthScript → bytecode → WNSP VM.
- WavelengthScript Compiler (`/wavelength-lang`) — physics-native language; `@540nm let x := value`.
- WNSP Virtual Machine (`/wnsp-vm`) — browser-native bytecode interpreter; Ψ channels as spectral registers.
- NXT Token — 8 decimals, 21 billion max supply, E=hf transaction costs.
- Physics Engine (`server/physics.ts`) — deterministic channel derivation; fee=base_fee×(E_sender/E_ref).
- Governance System — 11 live protocol parameters; voting weighted by spectral authority band.
- Phone-based authentication, P2P media sharing, Spectral Contracts, WNSP Bridge, Spectral Search, Spectral Router.

**Published packages**
- `nexusos-ce-encoder@1.0.0` on npmjs.com
- `ce-encoder-py` on GitHub (pip-installable)

**Physics prior art filed**: Claims [18](./PRIOR_ART.md#claim-18)–[25](./PRIOR_ART.md#claim-25)

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Radix UI · shadcn/ui · Tailwind CSS v4 |
| Backend | Express/Node.js (port 5000) + Python/Flask (port 5001) |
| Database | PostgreSQL + Drizzle ORM |
| Bitcoin | Taproot P2TR · BRC-20 · Ordinals · Fractal Bitcoin L2 |
| Protocol | WNSP — replaces TCP/IP with Maxwell-equation-validated wavelength routing |
| Language | WavelengthScript v1.0 — compiled to WNSP bytecode |
| Physics | Λ=hf/c² · E=hf · 51,200 Hilbert space channels · AGPL-3.0 |

---

> See [PRIOR_ART.md](./PRIOR_ART.md) for the complete formal physics disclosure record (35 claims, 2026-05-16 → 2026-07-21).

*NexusOS is written in the language of the destination hardware (photonic ASICs, ~2032), not the bridge hardware (silicon). When photonic computing arrives, no rewrite needed — the architecture already speaks in wavelengths.*
