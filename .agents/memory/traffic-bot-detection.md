---
name: Traffic bot detection layering
description: How traffic_logs bot classification is layered (sync patterns + async datacenter-IP reclassification) and why single-layer UA regex isn't enough
---

Bot classification in `server/traffic-logger.ts` uses two layers, not one:

1. **Synchronous UA pattern match** (`BOT_PATTERNS`) — known bot signatures, headless/automation frameworks (HeadlessChrome, Selenium, Puppeteer, Playwright, jsdom), and legacy/feature-phone device signatures (NetFront, MIDP/CLDC, UP.Browser, SEC-SGH/SAMSUNG-SGH, SymbianOS, old BlackBerry/Opera Mini/J2ME/Windows CE). Blank/empty UA is also flagged immediately (`Blank-User-Agent`).
2. **Async datacenter-IP reclassification** (`server/geoip-enricher.ts`) — the periodic GeoIP enrichment pass also asks ip-api.com for `hosting`/`proxy` flags per IP. Any traffic from a confirmed datacenter/hosting IP whose stored `user_agent` contains **no real browser rendering-engine token** (Chrome/, Safari/, Firefox/, Gecko/, Edg/, etc.) gets reclassified as bot (`Cloud-Datacenter-NonBrowser`), even if it slipped past the synchronous regex list.

**Why:** A single flip-phone-era UA string spoofed from an AWS IP (`SEC-SGHX820/1.0 NetFront/3.2 ...` from `3.91.177.95`) passed through undetected as `is_bot=false` — it wasn't a known bot signature, just an implausible device/IP combination. Layer 2 exists specifically to catch spoofed-UA-from-cloud-IP patterns that Layer 1's finite pattern list hasn't catalogued yet, without over-flagging legitimate VPN/corporate users (who still carry real browser engine tokens).

**How to apply:** When adding new bot signatures, prefer adding to `BOT_PATTERNS` (immediate, no dependency on GeoIP timing). Only rely on Layer 2 for the "unknown/future" spoofing case. `is_datacenter_ip` column on `traffic_logs` is populated by the same enrichment pass that fills `country` — both are best-effort and lag by up to the enrichment interval (2 min). Historic rows enriched *before* this system existed won't be retroactively reclassified since the enrichment query only targets rows with `country IS NULL`.
