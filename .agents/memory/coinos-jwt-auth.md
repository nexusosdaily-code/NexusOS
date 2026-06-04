---
name: Coinos JWT auth
description: How NexusOS authenticates to Coinos — NIP-98 is blocked, JWT Bearer is the working path
---

# Rule
Always use COINOS_JWT (Bearer token) for Coinos API calls. Never rely on NIP-98 from a server/datacenter IP.

**Why:** Coinos/Cloudflare blocks server-originated NIP-98 HTTP auth with 401 for datacenter IPs (Replit). The NIP-98 auth works fine in a browser but not from Node.js running on Replit.

**How to apply:**
- `coinosReq()` checks COINOS_JWT first (starts with "ey"), then COINOS_TOKEN if it's a JWT, then NIP-98 fallback.
- Account: `nexusosmain@coinos.io` registered with NOSTR_NSEC key; JWT stored as `COINOS_JWT` env var.
- Original account `nexusos@coinos.io` (COINOS_TOKEN nsec1 key) is unreachable server-side.
- If JWT expires, re-register via NIP-98 `/api/register` with the same NOSTR_NSEC pubkey — Coinos returns a fresh JWT even for existing accounts.
- The JWT payload has no `exp` field, but the server may still expire sessions; handle 401 by refreshing.
