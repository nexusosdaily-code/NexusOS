---
name: Lightning wallet tabs
description: Tab structure, labels, and layout decisions for the Lightning Wallet page
---

## Tab order and names
```typescript
const TABS = ["receive", "transmit", "swap", "send", "stake", "log"] as const;
```
- **receive** — deposit sats via Lightning invoice
- **transmit** — withdraw sats to external Lightning address or BTC address
- **swap** — swap between NXT and sats
- **send** — P2P send to another NexusOS user
- **stake** — lock sats for NXT yield
- **log** — transaction history (was called "transmissions" in early versions — now "log")

**Why:** "transmissions" was confusing; "log" matches the spectral/OS theme.

## Balance display (hub + wallet header)
- Yellow ⚡ pill = sats balance → links to /lightning-wallet
- Purple pill = NXT balance, labeled "HW FUND" → links to /wallet
- Both balances use `satsDisplay()` and `fmtNxt()` helpers respectively

## Stake tab defaults (as of latest session)
- Default amount pre-filled: **1,000,000 sats** (1M)
- Default lock period: **30 days**
- **Why:** Encourages larger stakes to boost WNUSD backing capacity

## HMR disabled
- `hmr: false` set in `server/vite.ts` — prevents hot-reload issues with the dual-runtime setup
