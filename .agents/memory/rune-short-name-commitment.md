---
name: Rune short-name commitment requirement
description: Rune names under 13 characters need a commitment inscription (tapscript) in the etch TX inputs — omitting it silently fails the etch, no Cenotaph.
---

## Rule
Rune names **shorter than 13 characters** require a "commitment" to be present in one of the etch TX inputs at the time of etching, and that input must be at least **6 blocks old** (COMMIT_CONFIRMATIONS = 6).

- NEXUS•WAVELENGTH (15 chars) — no commitment needed. Works in a single TX.
- WNSP•BTC (7 chars, base name WNSPBTC) — **commitment required**. Single-TX etch silently fails.

**Why:** The ord protocol uses this to prevent name squatting on short names. Without the commitment, the Runestone is syntactically valid but the etch is simply skipped by indexers (no Cenotaph, Rune ID never assigned).

The previous WNSP•BTC etch TX `32c29e6e…` confirmed at block 952733 but produced no Rune for exactly this reason.

## Commitment bytes
`commitment = little-endian bytes of rune name integer, trailing zeros stripped`

For WNSPBTC (name int = 7,280,367,746):
- Hex LE: `82 98 f1 b1 01` (5 bytes)

## How to apply
All short Rune name etches need a **2-step commit/reveal** flow:

1. **Commit TX** — Build a P2TR address from a tapscript:
   `<commitment_bytes> OP_DROP <internal_pubkey> OP_CHECKSIG`
   Send sats (546 + reveal_fee + buffer) to that address.
   Sign commit TX inputs with **tweaked** keypair (key-path spend from service wallet).

2. **Wait ≥ 6 blocks** — Store commit_txid in DB, poll confirmations.

3. **Reveal/Etch TX** — Spend the commit UTXO via **script-path** (un-tweaked keypair + tapLeafScript + controlBlock). Add extra UTXOs for fees (key-path). Include Runestone OP_RETURN.

## Implementation in NexusOS
- `server/wnsp-btc-rune-etcher.ts` — `commitEtch()` + `revealEtch()` functions
- DB states: `pending` → `committed` (stores commit_txid) → `etched`
- `COMMITMENT_BYTES = Buffer.from([0x82, 0x98, 0xf1, 0xb1, 0x01])`
- Tapscript pattern borrowed from `btc-inscription-engine.ts` commit/reveal
- Reveal TX: input 0 = script-path (un-tweaked key), inputs 1+ = key-path (tweaked key)
