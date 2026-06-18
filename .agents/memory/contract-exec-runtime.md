---
name: Contract execution runtime
description: WNSP VM v1.1 — opcode set, effect dispatch split, persistent state, contract wallet
---

## Core rule: effect dispatch is split by concern

`fireEffects()` handles **kernel-only** side-effects: AGENT_REGISTER, KERNEL_EMIT, KERNEL_BROAD. Non-blocking fire-and-forget.

The **route handler** owns all financial and state effects:
- STATE_WRITE → UPSERT into `contract_state` (PK: contract_id + key, JSONB value)
- XFER_NXT / XFER_SATS → balance check on `contract_nxt_balance`, INSERT `blockchain_tx_pool`
- SUBCALL → load sub-contract source, `runToHalt` inline, depth-1 only (no state or financial ops for sub-contracts)

**Why:** Financial errors must not be silent and need DB transactions. `fireEffects` is fire-and-forget and must not touch user balances.

## VM architecture (v1.1)

Server `stepVM` returns `{ state: VMState; effect: StepEffect | null }`. `runToHalt` collects effects array, dispatches after halt. Returns `stateDelta` (keys written by STORE).

Browser IDE `stepVM` (spectral-ide.tsx) returns `VMState` directly — simpler, no effect collection. XFER/CALL opcodes show simulation notices.

## Opcode set (v1.1 additions)

| Op   | Mnem     | Syntax                                     | StepEffect     |
|------|----------|--------------------------------------------|----------------|
| 0x10 | STORE    | `@store key := value` / `@store key`       | STATE_WRITE    |
| 0x11 | LOAD     | `@load key`                                | none           |
| 0x12 | XFER_NXT | `transfer_nxt("Ψ(x,y,p)", "amount")`      | XFER_NXT       |
| 0x13 | XFER_SATS| `transfer_sats("Ψ(x,y,p)", "amount")`     | XFER_SATS      |
| 0x14 | CALL     | `call("slug")`                             | SUBCALL        |

## Schema

`contract_state (contract_id UUID, key TEXT, value JSONB, updated_at TIMESTAMPTZ)` — composite PK (contract_id, key). UPSERT on conflict.

`spectral_contracts.contract_nxt_balance NUMERIC(20,8)` — contract's own NXT wallet.

## Routes

- `POST /api/app/:slug/run` — public; loads state, runs VM, persists delta, executes transfers, resolves sub-calls
- `GET /api/app/:slug/state` — public; returns contract_state rows + contract_nxt_balance
- `POST /api/contracts/:id/fund` — authenticated, deployer-only; deducts from user NXT wallet, credits contract_nxt_balance
- `isValidUUID` is defined inside `registerRoutes()` (not module-level) — reuse it for new contract routes

## Pitfall (v1.0, preserved)
`parseInt(...) || 42` collapses channel_load=0 to 42 (falsy bug). Correct: `isNaN(rawLoad) ? 42 : clamp(rawLoad, 0, 100)`.

## How to extend

New opcode: add to StepEffect union, collect in runToHalt effects array, handle in route handler (not fireEffects) for anything touching DB/finances. Mirror opcode in spectral-ide.tsx (compileWLS + stepVM + outputColor + OPS/KWS sets).
