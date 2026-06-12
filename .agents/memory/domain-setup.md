---
name: Domain setup
description: wnsp.tech domain status and Cloudflare DNS configuration — fully resolved June 2026
---

## Domain
- `wnsp.tech` — registered on GoDaddy

## Cloudflare
- Nameservers: `edna.ns.cloudflare.com` and `yisroel.ns.cloudflare.com` (active)
- **Root cause of week-long failure**: A records were hardcoded to wrong IP `34.111.179.208` instead of Replit's IP `34.117.33.233`. Fix was to delete the A records and replace with CNAME records pointing to `file-haven--nexusosdaily.replit.app`.

## Live domains (all verified in Replit)
- `wnsp.io` ✅ primary
- `wnsp.tech` ✅ verified June 12 2026
- `www.wnsp.tech` ✅ verified June 12 2026
- `file-haven--nexusosdaily.replit.app` ✅ base URL

## Correct CNAME records in Cloudflare (DNS only — grey cloud)
- `@` → `file-haven--nexusosdaily.replit.app` (DNS only)
- `www` → `file-haven--nexusosdaily.replit.app` (DNS only)

## TXT verification records (leave in place)
- `replit-verify=0a70fadf-e9ae-4e02-8d6d-f55fdb7924c1`
- `replit-verify=0x70fedf-e9ae-4e02-8d66-f65fdb7924c1`

## What NOT to do
- Never use A records with hardcoded IPs for Replit — use CNAME to replit.app subdomain
- Never enable Cloudflare orange cloud proxy for Replit custom domains — DNS only only
