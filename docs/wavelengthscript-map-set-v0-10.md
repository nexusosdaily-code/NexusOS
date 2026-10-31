# Map value queries: local dependency 0.10.0

Exact `wls.collections` **0.10.0** retains all 39 programs from 0.9.0 and
adds three native `.wls` value queries. Its fixed surface is **42 programs:
26 Map operations and 16 map-backed string Set operations**.

The execution profile remains `WLS-MAP/1`. No syntax, opcode, interpreter
value type, resource budget, host permission or installer is added.
Earlier exact versions and their source commitments remain unchanged.

## Query contract

| Program | Required inputs | Result |
| --- | --- | --- |
| `map.hasValue` | `map`, `value` | Boolean: at least one entry has the queried string value |
| `map.countValue` | `map`, `value` | Integer: number of entries with the queried string value |
| `map.findKeyByValueOrDefault` | `map`, `value`, `fallback` | First matching key in insertion order, or caller-provided fallback |

Queries compare **payload values, not keys**. Matching is exact UTF-16 string
equality: no normalization, coercion, case folding, trimming, substring search,
locale rules or prototype lookup. Empty strings and prototype-like strings
are ordinary data.

Different keys can have the same value. Counting includes every matching
entry, rather than counting distinct values. The count is between 0 and 20.
Lookup returns the **first** matching key in insertion order; it does not
use the last-key-wins behavior of the retained `map.invertLast`.

Empty Maps yield `false`, `0` or the supplied fallback, respectively.
An empty key is a valid match, not a missing-value marker. If the fallback
equals a possible key, use `map.hasValue` separately when absence must be
distinguished. There is no new Option/null interpreter type.

All required queries and fallbacks must be bounded strings. Invalid or missing
queries are rejected even for empty Maps. A fallback is validated even when
the first entry matches and the fallback is not selected. It is a supplied
string, not a lazy callback or implicit default.

These queries return scalars and do not alter the Map, its insertion order or
previous outputs. Valid operands are snapshotted by the existing interpreter;
malformed Maps, duplicate keys, sparse/accessor arrays and invalid payloads
remain rejected.

## Bounds and source implementation

The limits stay at 20 entries, 256 UTF-16 code units per key/value/query/fallback,
8,192 source code units, 128 instructions, 1,024 executed instructions,
32 registers and 65,536 logical memory bytes across live registers.
Maximum-length operands, absent queries, final-entry matches and all-20-entry
matches fit those limits. Scans are bounded by input cardinality.

The three algorithms are canonical files in `shared/wls-library/map/`.
They use only existing typed primitives and control flow. Host bridges
marshal values and check result types; they do not replace the algorithms
with JavaScript search/count implementations.

```ts
import {
  mapHasValue, mapCountValue, mapFindKeyByValueOrDefault,
} from "./shared/wls-map-library";

const input = { entries: [["b", "same"], ["a", "same"]] as [string, string][] };
mapHasValue(input, "same");                    // true
mapCountValue(input, "same");                  // 2
mapFindKeyByValueOrDefault(input, "same", "?"); // "b"
mapFindKeyByValueOrDefault(input, "none", "?"); // "?"
```

These are bounded local data queries, not identity verification, authorization,
database queries, financial operations or a claim of faster application
performance.

## Exact package and source locks

`MAP_SET_V0_10_PROGRAM_IDS` fixes the 42 IDs;
`MAP_SET_V0_10_LIBRARY_RELEASE` identifies the exact local release.
A consumer must explicitly select 0.10.0 and declare the programs it uses.
Old manifests do not gain the additions automatically. The independent
string-list profile is not silently included.

The full manifest is `scripts/fixtures/wls-map-set-package-v0-10.json`.
The corresponding `wls-map-set-v0-10-smoke.json` suite contains twelve cases
covering all three operations, duplicate values, key/value distinctions,
empty Maps/keys/strings, Unicode, insertion order and invalid arguments.

Choose a new lock path; do not overwrite a trusted existing lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-10.json > native-value-queries.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-10.json \
  native-value-queries.lock.json scripts/fixtures/wls-map-set-v0-10-smoke.json
```

Locks commit to the exact manifest and declared source snapshots. They do not
authenticate authors, validate the host/interpreter or establish operator-
inaccessible privacy. A mismatch fails rather than triggering automatic
relocking. Portable generated source and direct Node source reads must match.

Verification covers independent references, malformed arguments, maximum
inputs, unchanged input snapshots, the retained 0.9.0 lock fingerprint,
declaration restrictions, all-source tampering detection, guarded offline CLI
processes and standalone ESM/CommonJS bundles. Browser-environment tests are
not physical-device Safari verification or independent security clearance.

This is repository-local dependency work, not a registry release, GitHub
merge or live application rollout. No live P2P, wallet, authentication,
private-storage or tracking behavior is changed.

See [ordered selection 0.9.0](wavelengthscript-map-set-v0-9.md),
[the dependency index](wavelengthscript-dependencies.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
