---
name: WNUSD auto-collateral system
description: How staking sats automatically mints and redeems WNUSD stablecoin positions
---

## Core concept
Every sats stake auto-creates a WNUSD position at 150% collateral ratio.
Every unstake/withdrawal auto-redeems the linked WNUSD position.
Stakers don't interact with WNUSD directly — it's fully automatic.

## Schema
- `wnusd_positions` has a `stake_id INTEGER` FK column (added via startup migration `ADD COLUMN IF NOT EXISTS`)
- Startup migration in `server/index.ts` adds it idempotently on every boot

## Auto-mint flow (POST /api/lightning/stake)
1. Stake transaction completes atomically
2. Fetch BTC/USD from mempool.space (3s timeout, fallback $66,000)
3. `wnusdAmt = (amountSats × satUsd) / 1.5`
4. Insert `wnusd_positions` with `stake_id = stake.id`, type `"auto_mint"`, `nxtFeeSent = "0"`
5. Insert `wnusd_transactions` with type `"auto_mint"`
6. Errors are caught and warned — do NOT fail the stake if WNUSD mint fails

## Auto-redeem flow (POST /api/lightning/unstake/:id)
1. Withdrawal completes (sats + NXT yield credited)
2. Find `wnusd_positions` where `stake_id = stakeId AND status = 'active'`
3. Mark position `status = "redeemed"`
4. Insert `wnusd_transactions` with type `"auto_redeem"`, negative deltas
5. Errors caught/warned — do NOT fail the withdrawal if WNUSD redeem fails

## stablecoin/stats backing calculation
`totalBackingSats = treasurySats (genesis NXT×1000) + stakedSats (all active sats_stakes)`
`collateralUsd = totalBackingSats × satUsd`
`maxMintUsd = min(collateralUsd / 1.5, $500M cap)`
Response also exposes: `stakedSats`, `stakedSatsUsd`, `totalBackingSats`

## stablecoin.tsx UI — Backing Pool card
Two sources displayed side by side:
- **Genesis Treasury**: shows NXT amount + sats equivalent (purple/yellow)
- **Staked Sats**: shows staked sats total + USD value (orange/green)
- **Total Backing**: combined USD + total sats (emerald highlight)

## Backfill pattern (for existing stakes without positions)
```sql
SELECT s.id, s.user_id, s.amount_sats
FROM sats_stakes s
LEFT JOIN wnusd_positions p ON p.stake_id = s.id
WHERE s.status = 'active' AND p.id IS NULL
```
Then INSERT a position for each result using current BTC price.

## COL_RATIO
- 150% (1.5) — hardcoded constant; `wnusdAmt = sats × satUsd / 1.5`
- MAX_SUPPLY_CAP = $500M

## circulatingSupply in stats
- Computed as `SUM(wnusd_minted) FROM wnusd_positions WHERE status='active'`
- Was returning 0 hardcoded — fixed to use actual DB sum
