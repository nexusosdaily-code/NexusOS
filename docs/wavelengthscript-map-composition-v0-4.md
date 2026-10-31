# Bounded native map composition: 0.4.0

Three new `.wls` programs compose the existing string-to-string map dependency.
They run entirely under the existing **WLS-MAP/1** profile. No VM instructions,
host permissions, memory limits or application behavior are changed.

| Program | Meaning |
| --- | --- |
| `map.merge` | Copy left, then apply right entries. Right values win on duplicate keys. |
| `map.intersection` | Keep left entries whose keys also exist in right. |
| `map.difference` | Keep left entries whose keys do not exist in right. |

All three accept `left` and `right` maps in the established JSON representation:

```json
{
  "left": {"entries": [["b", "left b"], ["a", "left a"]]},
  "right": {"entries": [["a", "right a"], ["c", "right c"]]}
}
```

The respective results are:

```json
{"entries": [["b", "left b"], ["a", "right a"], ["c", "right c"]]}
{"entries": [["a", "left a"]]}
{"entries": [["b", "left b"]]}
```

## Exact semantics

- Merge retains left-key insertion positions even when right overwrites their
  values. New right keys append in right insertion order. Overwriting is
  permitted at capacity; a union exceeding 20 entries fails rather than
  truncating, evicting entries or silently returning a partial result.
- Intersection and difference compare **keys only**. They retain left values
  and left insertion order, even when a common right key has a different value.
  These are not entry/value equality comparisons.
- Key matching is exact and case-sensitive. There is no trimming, coercion,
  Unicode normalization or locale comparison. `__proto__`, empty strings and
  numeric-looking keys remain ordinary ordered map entries.
- Incoming duplicate keys and malformed maps are rejected by the unchanged
  map boundary. Both operands are validated and snapshotted, including when
  the result will be empty.
- Results are fresh, deeply frozen map snapshots. Neither operand nor an earlier
  successful result changes after a later overflow or validation error.
- The programs operate on bounded, flat string maps. There is no recursive
  merge, general JSON handling, JavaScript object-property merge or Set value.
  They are not drop-in replacements for Lodash, access checks or financial logic.

## Source, limits and typed bridges

Canonical programs are `shared/wls-library/map/merge.wls`,
`intersection.wls` and `difference.wls`. They use existing map operations,
bounded index iteration and branches; the algorithms are not host-library
merge/filter implementations. Source is available through the same portable
browser/Node loader and direct source-tree Node loader as other library IDs.

TypeScript bridges in `shared/wls-map-library.ts` marshal results only:

```ts
import { mapMerge, mapIntersection, mapDifference } from "./shared/wls-map-library";
const left = { entries: [["a", "left"]] as [string, string][] };
const right = { entries: [["a", "right"]] as [string, string][] };
mapMerge(left, right);        // { entries: [["a", "right"]] }
mapIntersection(left, right); // { entries: [["a", "left"]] }
mapDifference(left, right);   // { entries: [] }
```

The map profile still enforces 20 entries per map, 256 UTF-16 code units per
key/value, 8,192 source code units, 128 instructions, 1,024 cycles, 32 registers
and 65,536 logical memory bytes. Programs use only `left` and `right` inputs;
extra input registers also consume the existing shared memory/register budget.
No faster-than-JavaScript or native-machine performance claim is made.

## Explicit dependency release

Exact `wls.collections` **0.4.0** uses WLS-MAP/1 and exposes the original eight
map IDs plus these three. **0.3.0** retains only its original eight. Collection
releases 0.1.0 and 0.2.0 remain unchanged and use WLS-COLLECTION/1.

`MAP_PROGRAM_IDS` and `MAP_LIBRARY_RELEASE` retain the original map surface and
identity. `MAP_V0_4_PROGRAM_IDS` and `MAP_LIBRARY_LATEST_RELEASE` identify the
new one. A higher version does not grant mixed-profile execution.

Dependency checks require the selected exact release and declared program IDs.
Direct host bridges do not accept manifests; use the package/locked APIs when
version/declaration enforcement is required. Neither is an OS security sandbox.

The new fixture is `scripts/fixtures/wls-map-package-v0-4.json`.
Its five-case test suite is `scripts/fixtures/wls-map-v0-4-smoke.json`.
The existing CLI's `package-check`, `package-lock`, `package-verify`,
`package-run-locked` and `package-test-locked` commands accept them. For example,
after explicitly creating and saving a new lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-package-v0-4.json \
  your-map-v0-4.lock.json scripts/fixtures/wls-map-v0-4-smoke.json
```

See [the lock guide](wavelengthscript-package-locks.md) for lock creation.
Changing versions/manifests requires a deliberate new lock, not silent relocking.
Hash checks detect differences against a trusted lock; they do not authenticate
an author or protect the interpreter or host.

## Verification scope

Focused checks cover independent ordered-map references, exact key handling,
all-empty/identical operands, full-capacity overwrites, maximum-size payloads,
partial-work overflow and input/result immutability. A committed 0.3.0 lock
captures pre-composition source commitments and must still verify unchanged.

Browser-environment tests exercise all three native programs and bridges.
Real Node ESM/CommonJS bundle tests run both map releases without source assets.
The CLI runs locked composition and expected failures under the existing
no-network/no-application-startup guard, with no inherited credentials.
This is not a new physical-device Safari test or an independent security audit.

No live P2P, authentication, wallet, private storage, tracking settings or
privacy guarantees are changed by this dependency increment.
