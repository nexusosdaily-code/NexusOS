---
name: Rune Guard — safe UTXO selection
description: Why Rune-bearing UTXOs must be excluded from BTC transaction inputs, and how getSafeUTXOs() enforces this.
---

## The rule
Never use Rune-bearing UTXOs as inputs in any transaction that does NOT contain an explicit Runestone Transfer for those Runes.

## Why
The Runes protocol burns any Rune balance that enters a transaction as an input but is not explicitly transferred by a Runestone output. A Mint Runestone only creates a new Rune output — it does NOT carry forward existing balances from inputs. This burned 20.916T NEXUS•WAVELENGTH tokens (996 of 1,000 mints) during a CPFP sweep cycle.

## How getSafeUTXOs() works
Exported from `server/btc-inscription-engine.ts`. Returns `{ utxos: UTXO[], blockedCount: number }`.
1. Primary: queries ordinals.com Rune index for the address; any UTXO with a non-zero Rune balance is excluded.
2. Fallback (ordinals.com unreachable): excludes all 546-sat UTXOs (dust heuristic — Rune outputs always land at dust limit).

## Where to use getSafeUTXOs()
All BTC transaction builders EXCEPT `transferRune()`:
- `inscribeText()` — inscription commit tx
- `sendBtcOnChain()` — plain BTC withdrawal
- `etchWnspBtc()` — Rune etching tx
- `mintOneNXWV()` — **root cause of the burn incident**; Mint Runestone does not protect existing Rune inputs

## Where to keep getUTXOs()
`transferRune()` intentionally uses ALL UTXOs because it explicitly builds a Runestone with Transfer instructions for the Rune carriers it consumes. Balance and reporting queries (threshold checks, status endpoints) also use getUTXOs() since they do not spend anything.
