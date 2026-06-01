---
name: Sats ecosystem architecture
description: Key decisions and gotchas for the NexusOS sats/NXT wallet and Lightning features
---

## NXT wallet balance
- Stored as decimal string e.g. `"500000000.00000000"` in the `wallets` table
- NEVER pass directly to `BigInt()` — crashes with "Cannot convert X.Y to BigInt"
- Always use: `parseFloat(balance) ± amount).toFixed(8)`

## Sats balance
- Stored as integer (sats) in `lightning_wallets.sats_balance`
- Standard integer arithmetic is fine

## Lightning swap rate
- `LN_SATS_PER_NXT = 1000` (1 NXT = 1,000 sats)

## Sats staking rates
- 7 days = 5% NXT yield, 14 days = 12%, 30 days = 28%
- Yield formula: `(amountSats / 1000) * (rate / 100)` → NXT
- Table: `sats_stakes` (created June 2026 via raw SQL, not drizzle push)
- db:push needs TTY — use raw psql for schema changes in non-interactive shells

## Governance sats vote weight bonus
- Every 10,000 sats = +1 vote weight, max +5
- Formula: `Math.min(5, Math.floor(satsBalance / 10000))`
- Added on top of band weight (SYSTEM=8, KERNEL=4, USER=2, GUEST=1)

## Tip route
- Accepts either `recipientUserId` OR `recipientUsername` (looks up userId server-side)

## P2P send route
- POST /api/lightning/send — by recipientUsername, no fees, instant
