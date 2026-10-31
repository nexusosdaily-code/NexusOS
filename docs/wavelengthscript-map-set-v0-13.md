# Indexed Map reads: local dependency 0.13.0

Exact `wls.collections` **0.13.0** retains the 48 programs from 0.12.0 and
adds three native `.wls` algorithms. Its fixed surface contains **51 programs:
34 Map operations and 17 map-backed string Set operations**, under the
unchanged `WLS-MAP/1` execution profile.

| Program | Required inputs | Result |
| --- | --- | --- |
| `map.valueAt` | `map`, `index` | Value at a valid zero-based insertion-order position; out-of-range indices fail |
| `map.keyAtOrDefault` | `map`, `index`, `fallback` | Key at the position, or the required string fallback |
| `map.valueAtOrDefault` | `map`, `index`, `fallback` | Value at the position, or the required string fallback |

## Precise behavior

- Positions follow insertion order, not alphabetical, numeric or Unicode sort
  order. Index zero is the first entry; negative zero is also index zero.
- Indices must be safe integers. The fallback variants return the fallback
  for negative indices, past-the-end positions and empty Maps. They do not
  clamp, wrap or interpret negative indices as offsets from the end.
- Fractions, unsafe integers, infinities, `NaN`, strings, booleans, missing
  indices and other malformed operands fail rather than selecting a fallback.
- A fallback is a required bounded string even when an entry exists.
  Empty-string keys and values are present entries, not fallback signals.
- Map keys and values are returned exactly, without coercion, trimming,
  Unicode normalization, prototype lookup or mutation of input entries.
- The retained `map.keyAt` remains strict and unchanged. Existing exact-version
  packages do not gain these APIs automatically.

## Native execution and host bridges

Canonical sources are in `shared/wls-library/map/`. Typed bridges marshal
arguments and check results; indexed reads execute the WavelengthScript
instructions rather than a host-side replacement algorithm.

```ts
import {
  mapValueAt, mapKeyAtOrDefault, mapValueAtOrDefault,
} from "./shared/wls-map-library";

const map = { entries: [["b", ""], ["a", "Ψ"]] as [string, string][] };
mapValueAt(map, 1);                     // "Ψ"
mapKeyAtOrDefault(map, 0, "missing");   // "b"
mapValueAtOrDefault(map, 0, "missing"); // ""
mapValueAtOrDefault(map, 2, "missing"); // "missing"
// mapValueAt(map, 2) throws; mapValueAtOrDefault(map, 0.5, "missing") throws.
```

No new opcode, VM, value type, callback, network/storage capability,
permission or automatic package installation is introduced. This is bounded
local data access, not a browser, database, AI or filesystem API.

## Limits and source compatibility

Existing limits remain: 20 entries per Map; 256 UTF-16 code units per
key/value/fallback; 8,192 source code units; 128 compiled instructions;
1,024 executed instructions; 32 registers; and 65,536 logical bytes across
live registers. Logical accounting is not a JavaScript heap measurement.

The fallback algorithms use safe-integer comparisons and a one-entry local
holder. They do not increment a potentially extreme index or create an
intermediate full Map. Strict value reads use the existing key-at primitive.
No measured application performance improvement is claimed.

All retained source bytes and locks remain unchanged. The retained-release
audit pins the new 0.13.0 lock as well as all earlier release fingerprints.
Locks compare exact declared source snapshots and manifest bytes against a
trusted expected lock; they do not establish author identity, host/VM
integrity, operator-inaccessible secrecy or independent security clearance.

## Manifest and offline smoke suite

- `scripts/fixtures/wls-map-set-package-v0-13.json`: all 51 program declarations.
- `scripts/fixtures/wls-map-set-v0-13-smoke.json`: 12 indexed-read cases.

Create a new reviewed lock path, not an overwrite of an existing trusted lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-13.json > indexed-map.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-13.json \
  indexed-map.lock.json scripts/fixtures/wls-map-set-v0-13-smoke.json
```

Coverage includes independent insertion-order references, empty/Unicode and
prototype-like data, extreme safe integers, malformed indices, mandatory
fallback validation on valid and absent paths, maximum-sized Maps, retained
strict behavior, source locks, offline CLI execution and standalone
ESM/CommonJS bundles. Browser-environment tests are not physical Safari or
phone verification.

This repository-local release does not change live P2P, wallets, private-file
encryption, access rules or tracking. It is not a GitHub merge, public package
registry release or live application integration.

See [the dependency index](wavelengthscript-dependencies.md),
[0.12.0](wavelengthscript-map-set-v0-12.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
