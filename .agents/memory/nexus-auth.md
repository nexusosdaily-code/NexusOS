---
name: Nexus account auth
description: How the Nexus genesis admin account authenticates — password, WIF login, and force-reset
---

## Login methods for Nexus account

1. **WIF key login** (preferred, no password) — `POST /api/auth/wif-login` with `{ wifKey }`.
   Validates against `BTC_INSCRIPTION_WALLET_WIF` env var. Always logs in as Nexus.
   Frontend: "Sign in with Wallet Key" link on the login tab.

2. **Password login** — username `Nexus`, password `NexusOS2026` (no underscore, 11 chars).

3. **Recovery** — `POST /api/auth/recover` with `{ username, newPassword, recoveryKey }`.
   recoveryKey must equal `BTC_INSCRIPTION_WALLET_WIF`.

## Force-reset on every boot
`genesis_user.ts` unconditionally re-hashes and updates the Nexus password to `NexusOS2026`
on every server boot. This ensures the account is always accessible after a deploy.

**Why:** Previous password `Wnsp_nexusos2026` had an underscore that Android keyboards
silently drop or autocorrect, causing persistent lockout. Also, conditional bcrypt compare
was unreliable across environments.

## Rate limit
Login endpoint is rate-limited to 10 attempts. After too many failures, wait ~5 minutes
before trying again (even with the correct password/key).
