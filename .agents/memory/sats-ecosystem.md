---
name: Sats ecosystem architecture
description: Key decisions and gotchas for the NexusOS sats/NXT wallet and Lightning features
---

## NXT wallet balance
- Stored as decimal string e.g. `"500000000.00000000"` in the `wallets` table
- NEVER pass directly to `BigInt()` — crashes with "Cannot convert X.Y to BigInt"
- Always use: `parseFloat(balance) ± amount).toFixed(8)`

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
Idempotent across restarts. Also used for one-time data restoration.

## Lightning swap rate
- `LN_SATS_PER_NXT = 1000` (1 NXT = 1,000 sats)

## Sats staking rates
- 7 days = 5% NXT yield, 14 days = 12%, 30 days = 28%
- Yield formula: `(amountSats / 1000) * (rate / 100)` → NXT
- Table: `sats_stakes`

## Governance sats vote weight bonus
- Every 10,000 sats = +1 vote weight, max +5
- Formula: `Math.min(5, Math.floor(satsBalance / 10000))`

## Tip route
- Accepts either `recipientUserId` OR `recipientUsername` (looks up userId server-side)

## P2P send route
- POST /api/lightning/send — by recipientUsername, no fees, instant

## pool export from server/db.ts
- `pool` is exported (added alongside `db`) — needed by runStartupMigrations for raw SQL
