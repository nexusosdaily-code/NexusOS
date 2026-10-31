# Map value transformations: local dependency 0.11.0

Exact `wls.collections` **0.11.0** retains all 42 programs from 0.10.0 and
adds three native `.wls` algorithms. The fixed surface is **45 programs:
28 Map operations and 17 map-backed string Set operations**.

This remains the bounded `WLS-MAP/1` profile, not a new interpreter,
general-purpose JavaScript collection replacement or package registry release.
No syntax, opcode, value type, installer or host permission is added.

## Operations and behavior

| Program | Required input registers | Result |
| --- | --- | --- |
| `map.replaceValue` | `map`, `value`, `replacement` | Map with every exactly matching payload replaced; keys and insertion order retained |
| `map.invertFirst` | `map` | Map from distinct input values to their first input keys |
| `set.fromValues` | `map` | String Set containing distinct input values, in first-occurrence order |

All three return independent immutable snapshots. They do not mutate the
input, alter previous outputs or change retained programs.

Replacement compares **values, not keys**. It replaces all matching entries,
not just the first. An absent query preserves the entries; replacing a value
with itself also preserves them. Empty Maps return empty Maps.
Both `value` and `replacement` must be bounded strings, even for an empty
Map or when no value matches. Missing/invalid arguments are errors, not
silent no-ops.

Inversion keeps distinct values in first-occurrence order. Duplicate values
retain the first original key, including a first key equal to `""`.
The retained `map.invertLast` still keeps the **last** original key for
duplicates; its source and behavior are unchanged.

`set.fromValues` intentionally discards the original keys. Distinct values
become Set keys and every output payload is `""`. This differs from
`set.fromMap`, which extracts the original **keys**. A Map-backed Set is
not a new general-purpose Set value type; passing its output into
`set.fromValues` again extracts its empty payloads, not its members.

All equality is exact UTF-16 string equality. There is no Unicode
normalization, case folding, coercion, trimming or prototype lookup.
Empty strings, composed/decomposed Unicode and prototype-like strings
remain ordinary, distinct data where their code units differ.

## Typed host bridges

```ts
import { mapReplaceValue, mapInvertFirst } from "./shared/wls-map-library";
import { setFromValues } from "./shared/wls-set-library";

const input = {
  entries: [["b", "same"], ["a", "same"], ["c", "other"]] as [string, string][],
};
mapReplaceValue(input, "same", "new");
// { entries: [["b", "new"], ["a", "new"], ["c", "other"]] }
mapInvertFirst(input);
// { entries: [["same", "b"], ["other", "c"]] }
setFromValues(input);
// { entries: [["same", ""], ["other", ""]] }
```

Host bridges marshal arguments and validate results. The algorithms execute
the canonical sources in `shared/wls-library/map/` and
`shared/wls-library/set/`; they are not JavaScript transformation
implementations hidden behind `.wls` names.

## Unchanged limits

- 20 entries per Map; 256 UTF-16 code units per key/value/query/replacement.
- 8,192 source code units and 128 instructions.
- 1,024 executed instructions, 32 registers and 65,536 logical memory bytes
  across all live registers, not a promise about JavaScript heap consumption.

Each algorithm scans at most 20 input entries and creates at most 20 output
entries. Maximum-size keys and values, all-match/no-match replacement,
duplicate-heavy inversion and full unique-value output fit the existing
budgets. No limits were raised to accommodate this release. This is not a
measured application-performance improvement.

## Exact declarations and source locks

`MAP_SET_V0_11_PROGRAM_IDS` fixes the 45 IDs and
`MAP_SET_V0_11_LIBRARY_RELEASE` identifies the exact repository-local release.
Consumers must select `0.11.0`, declare the IDs they use and select the Map
execution profile. Older manifests do not gain these operations automatically.
String-list programs still require their separate profile.

Full example: `scripts/fixtures/wls-map-set-package-v0-11.json`.
Native smoke suite: `scripts/fixtures/wls-map-set-v0-11-smoke.json` (12 cases).

Use a new lock path rather than overwriting an existing trusted lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-11.json > native-value-transforms.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-11.json \
  native-value-transforms.lock.json scripts/fixtures/wls-map-set-v0-11-smoke.json
```

Locks commit to exact manifest bytes and declared source snapshots, not
author identity, interpreter/host integrity or operator-inaccessible privacy.
Verification must fail on mismatches, not silently recreate a trusted lock.
The complete previous 0.10.0 lock fingerprint is checked for stability.

Tests cover independent reference results, Unicode/empty/prototype-like data,
invalid and missing operands, immutable output and input preservation, maximum
bounds, retained first/last policies, fixed-version declarations, source
tampering, guarded offline CLI processes and standalone ESM/CommonJS bundles.
Browser-environment tests are not physical Safari/iPhone verification.

This release does not enable live P2P, financial, authentication, private-storage,
tracking or AI-agent capabilities. It is local dependency work, not a GitHub
merge, published registry package or application rollout.

See [value queries 0.10.0](wavelengthscript-map-set-v0-10.md),
[dependency index](wavelengthscript-dependencies.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
