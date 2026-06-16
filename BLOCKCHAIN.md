# NexusOS Blockchain — MVP Reference

> **Status: Experimental v0.1** — the physics substrate is live and functional; the consensus layer is single-node proof-of-spectral. Cryptographic multi-party consensus is a roadmap item.

---

## 1. Core Idea

Most blockchains use SHA-256 to identify blocks. NexusOS uses **wavelength**.

Every block has a Ψ channel address derived from its content via the spectral encoder:

```
Ψ(wdm, oam, pol)   →   380–780 nm   →   E = h·f   →   Λ = h·f / c²
```

Instead of `previousHash`, blocks carry `previousPsi` — the Ψ channel of the block before them. Chain integrity is a chain of spectral addresses, not cryptographic hashes.

---

## 2. Transaction Model

Three tables make up the economic and block layer.

### 2a. NXT Token Transfers (`transactions`)

The core money layer. Every transfer of NXT tokens writes a row here.

| Column | Type | Description |
|---|---|---|
| `from_wallet_id` | int | sender's wallet FK |
| `to_wallet_id` | int | recipient's wallet FK |
| `amount` | bigint | NXT in 10⁻⁸ units (8 decimals) |
| `fee` | bigint | physics fee deducted from sender |
| `action_type` | text | `wallet_transfer`, `message_send`, `stream_fee`, etc. |
| `status` | text | `pending` → `confirmed` |
| `wavelength_nm` | decimal | sender's spectral channel at time of tx |

Fee is **never burned for NXT transfers** — it always goes to the `orbital_treasury` wallet.

### 2b. Mempool (`blockchain_tx_pool`)

Pending transactions waiting to be proven in a block.

| Column | Type | Description |
|---|---|---|
| `from_address` / `to_address` | text | WNSP-format addresses |
| `amount_nxt` | decimal | NXT value |
| `memo` | text | `SPECTRAL_AUDIT:...` triggers block mining |
| `wavelength_nm` | decimal | sender's channel (for fee calc) |
| `psi_channel` | text | full Ψ(wdm,oam,pol) string |
| `energy_joules` | decimal | photon energy at sender's wavelength |
| `fee_paid` | decimal | NXT deducted |
| `status` | text | `pending` → `confirmed` |

### 2c. Blocks (`blockchain_blocks`)

Mined proof blocks. One block can contain many mempool transactions.

| Column | Type | Description |
|---|---|---|
| `block_number` | int | sequential, unique |
| `content` | text | human-readable block summary |
| `psi_channel` | text | block's spectral identity Ψ(wdm,oam,pol) |
| `wavelength_nm` | decimal | nm of the block's Ψ channel |
| `energy_joules` / `lambda_mass_kg` | decimal | physics of the block's channel |
| `previous_psi` | text | links to prior block (chain integrity) |
| `transactions` | jsonb | array of mempool tx IDs included |
| `nxt_reward` | decimal | 1.00 NXT minted to miner on each block |
| `miner_address` | text | who mined (currently `blockchain_auditor` agent) |

---

## 3. Validation

### Authority Bands

Every user and every block sits in a band determined by their WDM channel index (0–255):

| Band | WDM | Wavelength | Notes |
|---|---|---|---|
| SYSTEM | 0–63 | 380–405 nm | highest authority, ~1.4× fee multiplier |
| KERNEL | 64–127 | 405–480 nm | kernel agents, governance |
| USER | 128–191 | 480–630 nm | standard accounts |
| GUEST | 192–255 | 630–780 nm | ~0.8× fee multiplier |

Higher authority = shorter wavelength = higher photon energy = higher fees. This is not arbitrary policy — it follows `E = h·f`.

### Channel Derivation (deterministic)

Every username maps to exactly one Ψ channel:

```
SHA-256(username) → bytes
  byte[0] % 256   = wdm      (0–255)
  byte[1] % 50    = oam      (0–49)
  byte[2] & 1     = pol      (H or V)
  nm = 380 + wdm × (400 / 255)
```

The same username always produces the same channel. No key pair needed.

### Fee Calculation

```
E_sender  = h · (c / λ_sender)
E_ref     = h · (c / 560nm)          ← green, midpoint reference
multiplier = E_sender / E_ref

fee_nxt = base_fee[action_type] × multiplier
```

Base fees (governance-adjustable at runtime):

| Action | Base fee |
|---|---|
| `message_send` | 1.0 NXT |
| `stream_start` | 5.0 NXT |
| `stream_minute` | 0.5 NXT/min |
| `document_create` | 3.0 NXT |
| `upload_mb` | 0.25 NXT/MB |
| `spectral_record` | 2.0 NXT |
| `wallet_transfer` | 0.1% of amount |

### Block Mining (current — single-node proof-of-spectral)

The `blockchain_auditor` kernel agent runs every **5 minutes**:

1. Counts mempool rows with `memo LIKE 'SPECTRAL_AUDIT:%'`
2. If count ≥ threshold (default 1): triggers mining
3. Encodes block content through the Python spectral API → receives Ψ channel
4. Inserts a new row into `blockchain_blocks` with `previousPsi` set to the latest block's channel
5. Marks all included mempool rows `confirmed`
6. Awards 1.0 NXT to the miner address

No proof-of-work puzzle. The "work" is the physics encoding — the spectral API enforces that every block's channel is a valid point on the `E=hf` curve.

---

## 4. WNSP VM — What It Executes Today

The VM is a browser-native bytecode interpreter for **WavelengthScript**. Each Ψ channel acts as a named register. Source: `client/src/pages/wnsp-vm.tsx`.

### Instruction Set

| Mnemonic | Description |
|---|---|
| `TUNE λ` | Set active wavelength channel (e.g. `TUNE 520nm`) |
| `PUSH "name"` | Write a named value into the register at current λ |
| `EMIT msg` | Output a message on the current channel |
| `PHASE θ` | Apply a phase shift — updates channel coherence state |
| `BROAD msg` | Broadcast to all subscribers of the channel |
| `OCS expr` | Start a non-blocking oscillation loop |
| `LABEL fn` | Define a named function / subroutine |
| `?λ cond` | Photon branch — conditional jump based on wavelength |
| `node.register("name", @λnm)` | Register a named agent at a spectral address |
| `EXEC expr` | Execute an arbitrary expression in the current scope |
| `RET` | Return — wave collapses, scope ends |
| `HALT` | Terminate execution, print cycle count |

### Execution Lifecycle

```
1. Parse WavelengthScript source → instruction array
2. Initialise VM state: { pc: 0, registers: [], tuned: 520nm, halted: false }
3. stepVM():
     a. Read instruction at pc
     b. Apply side-effect (push to register, emit output, etc.)
     c. Increment pc
     d. Repeat until HALT or pc ≥ instruction count
4. Each Ψ channel register holds: { nm, name, value, band }
5. Channel load slider (0–10) simulates network congestion
```

The VM runs entirely in the browser — no server call needed. You can step through programs one instruction at a time or run to completion.

---

## 5. Dev Setup

**Requirements:** Node.js 20+, Python 3.10+, PostgreSQL 14+

```bash
# 1. Clone
git clone https://github.com/nexusosdaily-code/NexusOS
cd NexusOS

# 2. Install Node deps
npm install

# 3. Install Python deps
pip install flask flask-cors requests psycopg2-binary

# 4. Set environment
export DATABASE_URL="postgresql://user:password@localhost:5432/nexusos"

# 5. Run migrations (Drizzle)
npm run db:push

# 6. Start both runtimes
npm run dev
```

This starts:
- **Node.js / Express** on port 5000 — auth, wallets, P2P, governance, blockchain API
- **Python / Flask** on port 5001 — spectral encoder, WNSP physics, compression states

### Key API endpoints to test

```bash
# Physics: derive a Ψ channel
curl http://localhost:5001/api/nexus/dev/encode \
  -H "Content-Type: application/json" \
  -d '{"instruction": "hello world", "label": "test"}'

# Blockchain: latest blocks
curl http://localhost:5000/api/blockchain/blocks

# Blockchain: mempool
curl http://localhost:5000/api/blockchain/tx-pool

# Physics fee for a user action
curl http://localhost:5000/api/physics/fee \
  -H "Content-Type: application/json" \
  -d '{"actionType": "message_send", "senderWdm": 150}'
```

### Run the WNSP VM

Navigate to `/wnsp-vm` in the browser. Pick a sample program, hit **RUN** or step through with **STEP**.

---

## 6. What's Experimental

| Component | Status |
|---|---|
| Physics fee engine | ✅ Live, enforced on all actions |
| Channel derivation (SHA-256 → Ψ) | ✅ Live, deterministic |
| NXT wallet transfers | ✅ Live |
| Mempool + block mining | ✅ Live (single-node, auditor agent) |
| WNSP VM (browser) | ✅ Live, step-debuggable |
| WavelengthScript compiler | ✅ Live (`/wavelength-lang`) |
| Governance (on-chain parameter voting) | ✅ Live (KERNEL+ only) |
| Multi-party block validation | ❌ Not yet — single auditor agent today |
| Peer-to-peer node sync | ❌ Not yet — single PostgreSQL instance |
| Photonic hardware execution | 🔬 Research target (~2032) |

---

## 7. Contributor Areas

| Area | Files | What you can test today |
|---|---|---|
| Physics engine | `server/physics.ts` | Fee calc, channel derivation, band rules |
| Blockchain auditor | `server/blockchain_auditor.ts` | Mining cycle, mempool drain, block structure |
| WNSP VM | `client/src/pages/wnsp-vm.tsx` | Opcode execution, register state, step debugger |
| WavelengthScript | `client/src/pages/wavelength-lang.tsx` | Write and compile programs |
| CE→SE pipeline | `client/src/pages/learn.tsx` | Full 4-stage encode/compile/execute flow |
| Spectral API | `spectral_api.py` (port 5001) | Physics encoding, compression states |
| Schema | `shared/schema.ts` | All tables — transactions, blocks, mempool, wallets |
| Governance | `/governance` in the UI | Submit and vote on live protocol parameter changes |

---

*First public disclosure: 2026-05-16. License: AGPL-3.0.*
