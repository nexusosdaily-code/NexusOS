# Ordered Map/Set slices: local dependency 0.15.0

Exact `wls.collections` **0.15.0** retains all 54 programs from 0.14.0 and
adds two native `.wls` algorithms. The fixed surface contains **56 programs:
36 Map operations and 20 map-backed string Set operations**, under the
unchanged `WLS-MAP/1` execution profile.

| Program | Required inputs | Result |
| --- | --- | --- |
| `map.slice` | `map`, `offset`, `count` | Independent Map containing up to `count` entries after skipping `offset` entries |
| `set.slice` | `set`, `offset`, `count` | Independent member window with canonical empty-string payloads |

## Window semantics

This API uses **offset and count**, not JavaScript's start/end arguments.
Positions follow insertion order, without sorting or object-key enumeration.
For a Map, keys and values are retained exactly. For a Set, keys are members
and all output payloads are `""`; valid input Map payloads are ignored.

Both numeric operands are required safe integers, including on empty inputs,
zero-count windows and offsets beyond the end. Fractions, unsafe integers,
infinities, `NaN`, strings, booleans and missing operands fail explicitly.

Negative offsets behave as zero, not offsets from the end. Negative counts
behave as zero. Negative zero is zero. Offsets at or beyond the input size
return an empty result; oversized counts select only the available remainder.
No index wraps and no operand is coerced.

Results are independent immutable snapshots, including empty and full-input
windows. Inputs remain unchanged. Empty strings, Unicode and prototype-like
keys remain ordinary data with exact UTF-16 equality and no normalization.

## Native execution and bridges

Canonical programs are `shared/wls-library/map/slice.wls` and
`shared/wls-library/set/slice.wls`. Host bridges marshal operands and validate
results; the algorithms execute WavelengthScript instructions rather than
host-side slicing.

```ts
import { mapSlice } from "./shared/wls-map-library";
import { setSlice } from "./shared/wls-set-library";

const input = { entries: [["b", "x"], ["", "Ψ"], ["a", "z"]] as [string, string][] };
mapSlice(input, 1, 2); // { entries: [["", "Ψ"], ["a", "z"]] }
setSlice(input, 1, 2); // { entries: [["", ""], ["a", ""]] }
mapSlice(input, -1, 1); // { entries: [["b", "x"]] }
mapSlice(input, 20, 1); // { entries: [] }
// setSlice(input, 0, 0.5) throws.
```

Each program performs a bounded scan and builds only its output window.
It does not construct a full dropped intermediate Map or calculate
`offset + count`, avoiding end-position overflow at safe-integer extremes.
Counters advance no more than the 20-entry input bound.

Existing limits remain: 20 entries; 256 UTF-16 code units per key/value;
8,192 source code units; 128 compiled instructions; 1,024 executed
instructions; 32 registers; and 65,536 logical live-register memory bytes.
Logical accounting is not a JavaScript heap guarantee or measured speed gain.
There is no new VM, opcode, value type, callback, I/O capability or install hook.

## Manifest and offline suite

- Full manifest: `scripts/fixtures/wls-map-set-package-v0-15.json`.
- Twelve-case suite: `scripts/fixtures/wls-map-set-v0-15-smoke.json`.

Use a new reviewed lock path rather than overwriting an existing trusted lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-15.json > ordered-windows.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-15.json \
  ordered-windows.lock.json scripts/fixtures/wls-map-set-v0-15-smoke.json
```

Older exact-version packages do not gain these programs. Retained source bytes
and fingerprints stay unchanged; the audit also pins the new 0.15.0 lock.
Locks compare exact manifest bytes and declared sources against a trusted
expected lock. They do not authenticate an author, pin the host/VM, prove
privacy or replace independent security review.

Coverage includes independent window references, immutable results,
Unicode/empty/prototype-like keys, canonical Set payloads, malformed and
missing operands even on shortcut paths, maximum-sized inputs, safe-integer
extremes, retained locks, offline CLI and standalone ESM/CommonJS bundles.
Browser-environment tests are not physical Safari or phone verification.

This repository-local release does not change live P2P, wallets, encryption,
access rules or tracking. It is not a GitHub merge, public registry release or
live application integration.

See [the dependency index](wavelengthscript-dependencies.md),
[0.14.0](wavelengthscript-map-set-v0-14.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
