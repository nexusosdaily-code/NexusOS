---
name: Accounts and auth
description: Genesis account, all login methods, password, registration lock, and developer keys gate
---

## Genesis / Nexus admin account
- Username: `Nexus`
- User ID: `7eeff763-dabb-4f11-a219-163fc7b796c9`
- Password: `NexusOS2026` (force-reset on EVERY boot in `genesis_user.ts`)
- Authority band: SYSTEM

## Login methods — all log in directly as Nexus
1. **Password** — `POST /api/auth/login` with `{ username: "Nexus", password: "NexusOS2026" }`
2. **BTC WIF key** — `POST /api/auth/wif-login` with `{ wifKey }` — validates against `BTC_INSCRIPTION_WALLET_WIF` secret
3. **Nostr nsec key** — `POST /api/auth/nsec-login` with `{ nsecKey }` — validates against `NOSTR_NSEC` secret
4. **Nostr NIP-07 extension** — requires Alby or nos2x browser extension; uses `POST /api/auth/nostr`
5. **Recovery** — `POST /api/auth/recover` with `{ username, newPassword, recoveryKey }` where recoveryKey = `BTC_INSCRIPTION_WALLET_WIF`

Frontend: WIF + nsec buttons are collapsed links at the bottom of the Login tab (orange / purple).

## Force-reset on every boot
`genesis_user.ts` unconditionally re-hashes + updates Nexus password to `NexusOS2026` on boot.
**Why:** Old password `Wnsp_nexusos2026` had underscore that Android keyboards silently drop.
Conditional bcrypt compare was also unreliable across environments.

## Rate limit
Login is rate-limited to 10 attempts per window. After lockout wait ~5 min.
WIF and nsec endpoints are NOT rate-limited (they require full key match).

## Production users
Known usernames: Nexus, Shusha, Over3496, jefffay95, Leps, UncJuddy
Registration is open — 403 gate removed June 2026.

## Developer keys password gate
- Route: `/developer/keys`  — client-side sessionStorage gate
- Hardcoded password: `"NexusOS2026"` (updated from old `Wnsp_nexusos2026`)
