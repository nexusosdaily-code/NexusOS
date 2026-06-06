---
name: Domain setup
description: wnsp.tech domain status and Cloudflare nameserver configuration
---

## Domain
- `wnsp.tech` — registered on GoDaddy

## Cloudflare
- Domain has been added to Cloudflare account
- Required nameservers:
  - `edna.ns.cloudflare.com`
  - `yisroel.ns.cloudflare.com`
- Status: **ACTIVE** — Cloudflare managing DNS, both domains live as of June 2026

## Live domains
- `wnsp.tech` ✅ live
- `www.wnsp.tech` ✅ live (confirmed active in Replit custom domains)
- `wnsp.io` ✅ live (original Replit custom domain)

## CNAME records in Cloudflare
- `@` → `file-haven--nexusosdaily.replit.app` (proxied)
- `www` → `file-haven--nexusosdaily.replit.app` (proxied)

## What NOT to do in code
This is purely a DNS/registrar issue — no code changes needed.
