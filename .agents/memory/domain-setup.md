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
- Status: **PENDING** — GoDaddy is still serving DNS, Cloudflare not yet active

## GoDaddy nameserver change
- Transfer lock is OFF — but nameserver field is still not allowing save
- Most likely cause: GoDaddy hosting/Website Builder product attached to domain locks nameservers
- Fix: cancel/detach any GoDaddy hosting product from the domain, then nameserver field becomes editable
- Alternative: GoDaddy live chat can override the lock directly (fastest path)

## Impact while pending
- wnsp.tech is NOT benefiting from Cloudflare CDN, DDoS protection, or SSL via Cloudflare
- App still accessible via Replit deployment URL
- Once nameservers propagate (up to 48h), Cloudflare becomes active automatically

## What NOT to do in code
This is purely a DNS/registrar issue — no code changes needed.
