---
name: Staking system
description: Full spec for NexusOS sats staking — periods, rates, extend, early-exit penalty
---

## Lock periods and yield rates
| Period | Label | NXT yield rate |
|--------|-------|---------------|
| 7 days | 7d | 5% |
| 14 days | 14d | 12% |
| 30 days | 30d | 28% |
| 90 days | 3mo | 90% |
| 180 days | 6mo | 200% |
| 365 days | 1yr | 420% |

Yield formula: `(amountSats / 1000) * (rate / 100)` → NXT
Backend RATES object: `{ 7: "5.00", 14: "12.00", 30: "28.00", 90: "90.00", 180: "200.00", 365: "420.00" }`

## Validation
- Minimum stake: 1,000 sats
- `lockDays` must be one of `[7, 14, 30, 90, 180, 365]`
- Max deposit per invoice: 10,000,000,000 sats (10B)

## Stakes GET endpoint — /api/lightning/stakes
Returns each stake enriched with `wnusdMinted` (string) from the linked
`wnusd_positions` row (status='active', stakeId match). Non-fatal if join fails.

## Stake card display (lightning-wallet.tsx)
Each card shows:
- sats amount
- status line (X days left / Matured / Withdrawn)
- NXT yield + "· $X.XX WNUSD backed" (green, only if wnusdMinted > 0 and status active)

## Extend route — POST /api/lightning/extend/:id
- Works on any active stake (matured or locked)
- Stacks additional yield on top of existing `nxtYield`
- Updates `maturesAt = now + lockDays × 86400000`, `lockDays`, `nxtYield`, `yieldRatePercent`
- WNUSD position stays active throughout (collateral remains locked)
- Returns: `{ ok, stakeId, lockDays, newMaturesAt, newTotalYield, extraYield }`

## Matured stake UI (isMatured && status === "active")
- Two buttons: **🔒 Extend** (amber) and **✅ Withdraw** (green)
- Extend opens inline period picker with NXT yield preview
- Withdraw calls unstake route — full yield, no penalty

## Early-exit penalty — POST /api/lightning/unstake/:id
When `maturesAt > now` (early):
- `penaltyFraction = msRemaining / totalLockMs`
- `penaltyNxt = nxtYield × penaltyFraction`
- `userNxt = nxtYield − penaltyNxt`
- Sats always returned in **full**
- `penaltyNxt → orbital_treasury` via INSERT with:
  - `ordinal_nxt_units = Math.round(penaltyNxt * 1e8)` (bigint)
  - `operation_type = 'EARLY_EXIT_PENALTY'`
  - `source_label = 'early_exit_penalty'`
  - `memo` includes NXT amount, days remaining, stake ID
- Response: `{ ok, amountSats, nxtYield: userNxt, isEarly: true, penaltyNxt, daysRemaining }`

## orbital_treasury correct columns (confirmed)
`id, source_record_id, source_label, source_wavelength_nm, source_frequency_hz,`
`source_psi_channel, source_band, ordinal_nxt_units (bigint), operation_type,`
`deposited_by, block_proof, memo, deposited_at`
**Never use `units` or `unit_type` — those columns do not exist.**

## Early-exit UI (locked stake card)
- Small "early exit" link (red underlined) on non-matured active stakes
- Click opens red penalty breakdown panel inline showing sats returned (full),
  NXT received (after penalty), NXT penalty → treasury, penalty % of yield
- Card border turns red while panel is open
- Confirm (red) or Cancel

## Stake card states summary
| State | UI |
|-------|----|
| Active, locked | days remaining · lock days · "early exit" link |
| Active, matured | "✅ Matured — choose an action" · Extend + Withdraw buttons |
| Claimed | "Withdrawn" badge |
| Early-exit panel open | Red border + penalty breakdown + Confirm/Cancel |
| Extend panel open | Amber period picker + NXT preview + Confirm/Cancel |

## Long-lock button colour
- 3mo / 6mo / 1yr buttons use amber theme to signal higher commitment tier

## Table: sats_stakes
Key columns: `id, userId, amountSats (bigint), lockDays, yieldRatePercent, maturesAt, nxtYield, status, claimedAt`
