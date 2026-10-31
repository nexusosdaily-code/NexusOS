# Ordered Map value operations: local dependency 0.12.0

Exact `wls.collections` **0.12.0** retains all 45 programs from 0.11.0 and
adds three native `.wls` algorithms: **48 programs, 31 Map operations and
17 map-backed string Set operations**. The profile remains `WLS-MAP/1`.

| Program | Required inputs | Result |
| --- | --- | --- |
| `map.findLastKeyByValueOrDefault` | `map`, `value`, `fallback` | Last matching key in insertion order, or the required fallback |
| `map.replaceFirstValue` | `map`, `value`, `replacement` | Independent Map with only the first matching payload replaced |
| `map.replaceLastValue` | `map`, `value`, `replacement` | Independent Map with only the last matching payload replaced |

“First” and “last” mean input insertion order, not sorted keys. Empty-string
keys are valid matches, not missing-value signals. A missing query preserves
Map entries; empty Maps return empty Maps or the fallback. Replacing a value
with itself preserves contents. Replacements never rename, reorder or add keys.

Equality is exact UTF-16 string equality, without Unicode normalization,
case folding, coercion, trimming or prototype-property lookup. Query,
replacement and fallback operands are required bounded strings, including
on empty Maps and paths that would not otherwise read them. Invalid Maps,
accessor-bearing inputs, missing operands and oversized inputs are errors.

## Native execution and host bridges

The canonical programs are in `shared/wls-library/map/`. TypeScript bridges
marshal inputs and validate outputs; they do not implement the algorithms:

```ts
import {
  mapFindLastKeyByValueOrDefault, mapReplaceFirstValue, mapReplaceLastValue,
} from "./shared/wls-map-library";

const map = { entries: [["b", "x"], ["a", "x"]] as [string, string][] };
mapFindLastKeyByValueOrDefault(map, "x", "missing"); // "a"
mapReplaceFirstValue(map, "x", "y"); // [["b", "y"], ["a", "x"]]
mapReplaceLastValue(map, "x", "y");  // [["b", "x"], ["a", "y"]]
// Replacement results have shape { entries: [...] }; inputs stay unchanged.
```

The retained `map.findKeyByValueOrDefault` still selects the first matching
key, while `map.replaceValue` still replaces all matching values.

## Unchanged limits and compatibility

- 20 entries per Map and 256 UTF-16 code units per key/value/string operand.
- 8,192 source code units, 128 compiled instructions, 1,024 executed
  instructions, 32 registers and 65,536 logical memory bytes across live
  registers. Logical memory is not a JavaScript heap measurement.
- No new opcode, value type, interpreter, network capability, permission,
  automatic download or installation hook.
- Older exact-version manifests do not gain the new APIs. Their source bytes
  and locks remain unchanged, including the complete 0.11.0 lock fingerprint.

Each program scans at most 20 entries. First replacement builds a new Map;
last replacement copies the Map and overwrites its final matching key.
This avoids an overflowing intermediate union and preserves existing limits.

## Manifest, source lock and offline smoke suite

The full 48-program manifest and 12-case smoke suite are:

- `scripts/fixtures/wls-map-set-package-v0-12.json`
- `scripts/fixtures/wls-map-set-v0-12-smoke.json`

Use a new lock path, not an existing trusted lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-12.json > ordered-values.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-12.json \
  ordered-values.lock.json scripts/fixtures/wls-map-set-v0-12-smoke.json
```

Locks compare exact declared source snapshots and manifest bytes against a
trusted expected lock. They do not prove author identity, unchanged host/VM
code, operator-inaccessible secrecy or complete security. Mismatches fail;
trusted locks are not silently regenerated.

Verification covers independent first/last reference results, duplicate-heavy
inputs, Unicode/empty/prototype-like data, mandatory operand validation,
immutable snapshots, maximum-size inputs, retained releases, source tampering,
offline CLI execution and standalone ESM/CommonJS bundles. Browser-environment
tests are not physical phone or Safari verification.

This is repository-local dependency work, not a published registry release,
GitHub merge, live P2P integration, financial release or privacy clearance.
No measured application-speed or physical photonic-computing claim is made.

See [the dependency index](wavelengthscript-dependencies.md),
[0.11.0](wavelengthscript-map-set-v0-11.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
