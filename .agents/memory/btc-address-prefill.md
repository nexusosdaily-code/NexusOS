---
name: Saved BTC address prefill pattern
description: How NexusOS captures and reuses a user's BTC receiving address across Rune swap/pipeline forms
---

Users can optionally save a BTC receiving address at registration (or update it later via a
dedicated endpoint). It is stored in its own `defaultBtcAddress` / `defaultBtcAddressSetAt`
columns on `users` — NOT reused from `btcAddressBook`/`btcAddressRegistry`, which model different
things (multi-address books / registry entries, not "the one address to prefill").

**Why:** Reusing an existing address-book table would conflate distinct semantics (a *list* of
addresses vs. a single default) and risk incorrect behavior in unrelated address-book features.
A dedicated nullable pair of columns keeps the concept isolated and the migration purely additive.

**How to apply:**
- Validate any BTC address (registration, saved-address update, and all rune-swap endpoints) with
  real bech32/bech32m checksum validation (`isValidMainnetBtcAddress` in
  `server/btc-address-validate.ts`, built on bitcoinjs-lib `toOutputScript`) — never weak
  prefix/length checks (`startsWith("bc1")` etc.), since those accept typo'd addresses that would
  silently misdirect real BTC/Rune sends.
- The saved address is only ever used to **prefill** a form field client-side, once, when the
  field is empty (`if (saved && !current) setCurrent(saved)`), and the field stays fully editable.
- The server must never substitute the saved address automatically into a swap/send request —
  every transfer-affecting endpoint still requires an explicit `btcAddress` in the request body.
  This matters because BTC sends are irreversible; a silent server-side fallback could send funds
  to a stale or wrong address the user never actually saw before submitting.
