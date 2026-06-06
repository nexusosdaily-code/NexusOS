---
name: Runes protocol Runestone encoding
description: Correct tag numbers and integer sequences for transfer and mint Runestones; CPFP chaining for sequential mints
---

## Correct Runes Protocol Tag Numbers (ord source)

| Tag | Meaning |
|-----|---------|
| 0   | Body — separates header tag-value pairs from edict data |
| 20  | Mint — Rune ID to mint (block then tx, each as separate [20, value] pairs) |
| 22  | Pointer — default output index for unallocated Runes (Rune change) |

Odd tags are ignored (no-op). Unknown even tags cause a Cenotaph (burns all Rune inputs).

## Transfer Runestone (send exact amount, return change)

Integer sequence: `[22, changeOut, 0, block, tx, amount, recipientOut]`

- `[22, changeOut]` — Pointer: unallocated Runes → service wallet change output
- `[0]` — Body tag: everything after this is edict data
- `[block, tx, amount, recipientOut]` — one edict: Rune ID, raw amount, destination output index

Transaction output layout:
- out0: OP_RETURN (Runestone script)
- out1: recipient address, 546 sats (receives exactly `amount` raw Runes)
- out2: service wallet, 546 sats (receives all remaining/unallocated Runes via Pointer)
- out3: service wallet, BTC change

**Why the Pointer matters:** Without it, all unallocated Runes default to the first non-OP_RETURN output (out1 = recipient). That would send the entire Rune inventory to the buyer, not just the ordered amount.

## Mint Runestone

Integer sequence: `[20, block, 20, tx, 22, receiverOut]`

- `[20, block]` — Mint.block
- `[20, tx]`    — Mint.tx
- `[22, receiverOut]` — Pointer: minted Runes → receiverOut

Transaction output layout:
- out0: OP_RETURN (Mint Runestone)
- out1: service wallet, 546 sats (receives newly minted Runes)
- out2: service wallet, BTC change

## NEXUS•WAVELENGTH specific values

- Rune ID: `952596:379` (block 952596, tx index 379)
- Divisibility: 0 (raw units = display units)
- Amount per mint: 21,000,000,000 raw
- Cap: 1,000 mints → 21,000,000,000,000 raw total supply (21 trillion NXWV)
- Supply sealed: all 1000 mints claimed (4 final mints via CPFP chain, June 2026)

## CPFP Chaining for Sequential Mints

When minting multiple times in one session without waiting for confirms:
- Each mint tx spends the outputs of the previous (unconfirmed) tx
- `getUTXOs()` returns unconfirmed UTXOs too — chaining works
- 5s delay between mints is NOT enough for new UTXOs to appear in the API
- For reliable chaining, build each successive mint by explicitly referencing the previous tx's output indices (vout 1 = Rune carrier 546 sats, vout 2 = BTC change)
- Duplicate txid = UTXO not yet visible, same inputs used → only 1 mint counted

## The Cenotaph Bug (what NOT to do)

Old broken encoding: `[20, 952596, 379, 1000, 1]`

Protocol reads this as:
- (tag=20, value=952596) → Mint.block
- (tag=379, value=1000) → unknown ODD tag → ignored
- Remaining: [1] → trailing integer with no tag → CENOTAPH

A Cenotaph burns ALL Runes in the transaction inputs. The test transaction survived only because the recipient was the service wallet itself.

## Script structure

```
OP_RETURN (0x6a) + OP_13 (0x5d) + <length byte(s)> + <LEB128 payload>
```

LEB128 varint: 7 bits per byte, LSB first, high bit = more bytes follow.
