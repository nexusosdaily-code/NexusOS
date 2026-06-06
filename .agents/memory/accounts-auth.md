---
name: Accounts and auth
description: Genesis account, password, registration lock, and developer keys gate
---

## Genesis / dev account — "Nexus"
- Username: `Nexus`
- User ID: `7eeff763-dabb-4f11-a219-163fc7b796c9`
- Password: `Wnsp_nexusos2026` (stored as bcrypt hash in `users` table)
- NXT wallet balance: **500,000,000 NXT** (500M — fixed from 400M in session)
- Sats staked: 194B+ across 13 positions (backfilled with WNUSD positions)
- Authority band: KERNEL/SYSTEM

## Production users
Known usernames: Nexus, Shusha, Over3496, jefffay95, Leps, UncJuddy
Registration is now **open** — the 403 gate was removed June 2026.

## Registration
`POST /api/auth/register` — open to all. Accepts `{ username, password, email? }`.
Auto-creates NXT wallet + WNSP canonical address on success.
Auth page Register tab is fully functional.

## Developer keys password gate
- Route: `/developer/keys`
- File: `client/src/pages/developer-keys.tsx`
- Pattern: outer component checks sessionStorage; if not unlocked, renders password form.
  Inner component `DeveloperKeysInner` contains all hooks + actual content.
- **Why inner component:** React rules — hooks cannot be called after early return. Putting them in the outer component (which returns the gate before hooks ran) caused runtime errors. Solution: gate in outer, hooks+content in inner.
- Password stored **client-side in sessionStorage** — cleared on tab close
- Hardcoded password: `"Wnsp_nexusos2026"`
- Session key: `"dev_keys_unlocked"` (or similar sessionStorage key)

## Rate limits
- Rate limit windows are stored in memory/DB — can be cleared via DB if a user gets locked out
- Nexus account rate limits were cleared manually in session after password reset locked the account out

## Password reset pattern (DB)
```sql
UPDATE users SET password_hash = '<bcrypt_hash>' WHERE username = 'Nexus';
```
Use `bcrypt.hash("Wnsp_nexusos2026", 10)` to generate the hash — do NOT store plaintext.

## NXT fee rule
NXT fees are NEVER burned — always route to `orbital_treasury` table.
**Why:** burning would deflate supply and harm stakers; treasury preserves value in protocol.
