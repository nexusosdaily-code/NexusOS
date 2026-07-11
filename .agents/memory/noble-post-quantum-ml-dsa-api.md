---
name: noble-post-quantum ML-DSA API
description: Correct argument order and import path for @noble/post-quantum ml_dsa65 — easy to get wrong, causes silent or cryptic failures
---

# @noble/post-quantum — ML-DSA-65 API Quirks

## Import path requires .js extension
```ts
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";  // CORRECT
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa";     // WRONG — fails at runtime
```

## Argument order is msg-first (NOT secretKey-first)
```ts
// CORRECT
const sig = ml_dsa65.sign(message, secretKey);
const ok  = ml_dsa65.verify(sig, message, publicKey);

// WRONG (produces RangeError: "secretKey" expected length 4032, got length N)
const sig = ml_dsa65.sign(secretKey, message);
const ok  = ml_dsa65.verify(publicKey, message, sig);
```

## Key sizes (ML-DSA-65, NIST FIPS 204)
- publicKey: 1952 bytes → 3904 hex chars
- secretKey: 4032 bytes (expanded, returned by keygen)
- signature: 3309 bytes → 6618 hex chars

## Deterministic keygen from seed
```ts
const seed = pbkdf2Sync(domainString, secret, 100_000, 32, "sha256");
const { publicKey, secretKey } = ml_dsa65.keygen(seed); // 32-byte Uint8Array seed
```

**Why:** The library follows the NIST FIPS 204 wire format where sign() takes (M, sk) not (sk, M). This is the opposite of most crypto APIs (e.g. noble/ed25519, TweetNaCl) which are key-first.

**How to apply:** Any time ml_dsa65 sign/verify calls are written, put the data payload first, key material second.
