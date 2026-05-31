---
name: NXT Indestructibility Rule
description: NXT tokens are never burned or destroyed — any flow that looks like a burn must redirect NXT to the Orbital Treasury.
---

## The Rule

**NXT is indestructible.** The total supply (21 billion) is permanently conserved. Any action that would "burn" or "destroy" NXT must instead redirect it to the Orbital Treasury.

**Treasury address:** `NXT-NEXS-OS1K-7F3A-OMEGA`
**Constant:** `GENESIS_EXECUTION_ADDRESS` in `server/physics.ts`

**Why:** NXT is the economic backbone of a Kardashev Type I civilization OS. Energy is conserved, not annihilated. The treasury holds NXT for redistribution/distributions, never to remove it from supply.

**How to apply:**
- Any route that subtracts NXT from a user wallet must credit the same amount to the treasury wallet
- Use `storage.getWalletByAddress(GENESIS_EXECUTION_ADDRESS)` to fetch the treasury wallet
- Record a `treasury_deposit` transaction for the redirect
- Response messages must say "redirected to Orbital Treasury" — never "burned"

## Fixed locations (2026-05-31)
- `POST /api/swap/nxt-to-fb` — NXT now redirects to treasury
- `POST /api/marketplace/buy/:id` — 2.5% fee now redirects to treasury
