---
name: Sats-first pricing model
description: NexusOS business model — sats pay for services, NXT is held as hardware crowdfund stake
---

## Model
- **Sats**: the transactional currency — users spend sats to use NexusOS products and services
- **NXT**: the hardware crowdfund token — earned via staking sats, held to represent a stake in the hardware future (SNIC, PHR-1, Spectral Relay Mesh); NOT spent on daily services

## Service prices (sats, flat rates)
- API key creation: **5,000 sats**
- Governance proposal submission: **10,000 sats**
- Community WNSP mint: **50,000 sats**
- Marketplace listings: priced in sats (seller sets `priceSats`, `priceNxt` auto-derived at 1 NXT = 1,000 sats)

## Implementation pattern
All sats service fees follow this backend pattern:
1. Select from `lightningWallets` where `userId = req.user!.id`
2. Check `satsBalance >= FEE`
3. `UPDATE lightningWallets SET satsBalance = balance - FEE`
4. `INSERT lightningTransactions (type: "service_fee", amountSats: FEE, status: "settled")`

## Hub nav
- Yellow ⚡ pill: Lightning sats balance (links to /lightning-wallet) — PRIMARY
- Purple Wallet pill: NXT balance labeled "HW FUND" (links to /wallet)

**Why:** Users shouldn't have to sell NXT to pay for services — that creates sell pressure on the crowdfund token. Sats (Bitcoin Lightning) creates a clean separation and a universal, instantly-understood payment layer.
