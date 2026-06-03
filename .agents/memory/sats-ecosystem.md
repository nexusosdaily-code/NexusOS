---
name: Sats ecosystem architecture
description: Key decisions and gotchas for the NexusOS sats/NXT wallet and Lightning features
---

## NXT wallet balance
- Stored as decimal string e.g. `"500000000.00000000"` in the `wallets` table
- NEVER pass directly to `BigInt()` — crashes with "Cannot convert X.Y to BigInt"
- Always use: `(parseFloat(balance) ± amount).toFixed(8)`

## Sats balance — MUST use bigint columns
- `lightning_wallets.sats_balance/total_deposited/total_withdrawn` → bigint ✅
- `lightning_transactions.amount_sats` → bigint ✅ (upgraded from integer)
- `sats_stakes.amount_sats` → bigint ✅ (upgraded from integer)
- **Never use integer for sats columns** — max INTEGER is 2.147B sats. Users routinely hold 1B+ per position. Overflow silently destroys funds.

## Atomicity rule — all debit+record pairs must be db.transaction()
- `POST /api/lightning/swap/to-sats` — atomic ✅
- `POST /api/lightning/stake` — atomic ✅ (fixed: was non-atomic, caused 17B sats loss)
- Any route that deducts a balance AND records the deduction must wrap both in `await db.transaction(async (tx) => { ... })`

## Production column upgrade pattern
Use `runStartupMigrations()` in `server/index.ts` with a DO $$ guard:
```sql
IF (SELECT data_type FROM information_schema.columns WHERE table_name='X' AND column_name='Y') = 'integer'
THEN ALTER TABLE X ALTER COLUMN Y TYPE bigint; END IF;
```
Idempotent across restarts. Also used for `ADD COLUMN IF NOT EXISTS` for new columns (e.g. `stake_id`).

## Lightning swap rate
- `LN_SATS_PER_NXT = 1000` (1 NXT = 1,000 sats)

## satsDisplay tiers (lightning-wallet.tsx)
- ≥ 1,000,000,000 → `"x.xxB"` (e.g. "7.99B")
- ≥ 1,000,000     → `"x.xxM"`
- ≥ 1,000         → `"x.xK"`
- < 1,000         → plain number
- Always 2 decimal places for B/M, 1 for K
- **Why:** Users stake 50B+ sats; previous display showed "49999.9940M" which was unreadable

## Deposit cap
- Max single deposit: **10,000,000,000 sats** (10B) — raised from 10M in session
- Enforced in `POST /api/lightning/invoice`

## pool export from server/db.ts
- `pool` is exported alongside `db` — needed by runStartupMigrations for raw SQL

## Governance sats vote weight bonus
- Every 10,000 sats = +1 vote weight, max +5
- Formula: `Math.min(5, Math.floor(satsBalance / 10000))`

## Tip route
- Accepts either `recipientUserId` OR `recipientUsername` (looks up userId server-side)

## P2P send route
- POST /api/lightning/send — by recipientUsername, no fees, instant
