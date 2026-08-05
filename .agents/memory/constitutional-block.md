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
Both arrays are `export const` (exported as ReadonlyArray) so routes.ts and tests can import counts.

## Entities and domain counts (as of August 2026)
56 domains across 28 criminal organisations. BLOCKED_ENTITIES = 46 entries (includes individuals
with no associated domain).

Original 15 orgs (42 domains):
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

14 new orgs added Aug 2026 (14 domains):
- Bill Hwang / Archegos Capital Management (fraud 2024): 1 domain (archegos.com)
- Sanjay Shah / Solo Capital (cum-ex 2023): 2 domains (solocapital.com, solocap.com)
- Guo Wengui / GTV Media Group (wire fraud 2024): 1 domain (gtv.org)
- Himalaya Exchange (money laundering 2024): 2 domains (himalayaexchange.com, himalaya.exchange)
- Roman Storm / Tornado Cash (sanctions/laundering 2024): 1 domain (tornado.cash)
- Shi Qiren / BitShine Exchange (fraud): 2 domains (bitshine.io, bitshine.com)
- Bernie Madoff / BMIS (fraud): 0 domains
- Allen Stanford / Stanford Financial Group: 0 domains
- Caroline Ellison / Ryan Salame / Gary Wang / Nishad Singh (FTX co-conspirators): 0 domains
- Roger Ng (1MDB): 0 domains
- Tony Iervasi / Courtenay House: 0 domains
- Anthony Paul Torre / Rodney Forrest: 0 domains
- Leonardo Ayala / Nodus International Bank: 3 domains (dataindex.pro, nodus-related)
- Tomás Niembro Concha: 0 domains

## isBlockedReferrer() signature
Returns `{ blocked: boolean; label: string }` — NOT a plain boolean.
Middleware must destructure: `const { blocked: refBlocked, label: refLabel } = isBlockedReferrer(referer);`

**Why:** Block is constitutional (genesis_user.ts BLOCKED_ENTITIES), not a policy setting.
Adding new entities: add to BLOCKED_ENTITIES in genesis_user.ts AND to BLOCKED_REFERRER_DOMAINS
in traffic-logger.ts simultaneously — they must stay in sync.

## Health endpoint monitoring
`/api/health` returns `constitutionalBlock: { blockedEntities: 46, blockedReferrerDomains: 56 }`.
Counts are live from the actual arrays via static imports (not hard-coded).
Routes.ts imports: `import { BLOCKED_ENTITIES } from "./genesis_user"` and
`import { BLOCKED_REFERRER_DOMAINS } from "./traffic-logger"` — use static imports,
dynamic imports silently fail in the compiled CJS bundle.
