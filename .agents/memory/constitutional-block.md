---
name: Constitutional referrer block
description: HTTP-layer 403 block for all entities with criminal guilty pleas / convictions for financial crimes — domains, labels, implementation pattern
---

## What it is
`server/traffic-logger.ts` → `BLOCKED_REFERRER_DOMAINS` array + `isBlockedReferrer()`.
Any HTTP request with a `Referer` header from these domains receives a hard 403 before
reaching any application code. Logged to `traffic_logs` with `botName = "BLOCKED-REFERRER:<Label>"`.

## Source of truth
`server/genesis_user.ts` → `BLOCKED_ENTITIES` list. The domain list must mirror this exactly.

## Entities and domain counts (as of July 2026)
43 domains across 14 criminal organisations:
- Binance/CZ (AML 2023): 8 domains
- FTX/SBF (7 counts 2023): 4 domains
- Terraform/Do Kwon (guilty plea 2025): 4 domains
- Celsius/Mashinsky (guilty plea 2024): 2 domains
- BitMEX/Hayes (BSA 2022): 1 domain
- TD Bank (AML 2024): 3 domains
- JPMorgan (FX cartel 2015): 3 domains
- Citigroup (FX cartel 2015): 3 domains
- Barclays (FX rigging 2015): 3 domains
- Goldman Sachs (1MDB 2020): 2 domains
- HSBC (cartel laundering 2012): 4 domains
- BNP Paribas (sanctions 2014): 2 domains
- Credit Suisse (tax conspiracy 2014): 2 domains
- UBS (LIBOR 2015): 1 domain
- RBS/NatWest (FX cartel 2015): 4 domains

## isBlockedReferrer() signature
Returns `{ blocked: boolean; label: string }` — NOT a plain boolean.
Middleware must destructure: `const { blocked: refBlocked, label: refLabel } = isBlockedReferrer(referer);`

**Why:** Block is constitutional (genesis_user.ts BLOCKED_ENTITIES), not a policy setting.
Adding new entities: add to BLOCKED_ENTITIES in genesis_user.ts AND to BLOCKED_REFERRER_DOMAINS
in traffic-logger.ts simultaneously — they must stay in sync.
