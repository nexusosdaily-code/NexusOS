# Ordered Map and Set selection: local dependency 0.9.0

Exact `wls.collections` **0.9.0** retains the 35 programs from 0.8.0 and
adds four native `.wls` operations. Its fixed surface is **39 programs:
23 Map operations and 16 map-backed string Set operations**.

The execution profile is still `WLS-MAP/1`. The interpreter, opcode set,
permissions and resource budgets do not expand. Earlier exact releases and
source commitments remain fixed, including 0.8.0.

## Contract

| Program | Required inputs | Result |
| --- | --- | --- |
| `map.take` | `map`, `count` | The first count entries, preserving values and order |
| `map.drop` | `map`, `count` | Entries after the first count, preserving values and order |
| `set.take` | `set`, `count` | The first count keys, with canonical empty payloads |
| `set.drop` | `set`, `count` | Keys after the first count, with canonical empty payloads |

`count` is a **safe integer**, from -9,007,199,254,740,991 through
9,007,199,254,740,991. Negative counts, including the minimum safe integer,
clamp to zero. Counts larger than the operand size clamp to that size.
Positive and negative zero have the same behavior. This is a count contract,
**not JavaScript slice's negative-index convention**.

Fractions, unsafe integers, NaN, infinities, strings, booleans, null and missing
counts are rejected. Counts are validated even for empty operands; operands
are validated even when the selected result is empty.

For insertion order `[b,a,c]`, count 1 gives take `[b]` and drop `[a,c]`.
Count 0 gives empty take and full drop; count 20 gives full take and empty
drop for that three-entry operand. Neither operation sorts keys.

Sets retain the [0.5.0 Map-key representation](wavelengthscript-sets-v0-5.md).
Input payloads must be valid bounded strings but are otherwise ignored.
All returned Set payloads are `""`, including full-result and negative-count
paths. This is ordered selection from a stored representation, not a change
to mathematical Set equality or an introduction of general Set values.

Exact UTF-16 strings, empty strings, prototype-like keys and distinct Unicode
normalization forms remain unmodified. Map values remain attached to their
original keys.

## Bounds and immutable results

All outputs are fresh, deeply frozen snapshots, including empty and full-copy
paths. Input objects and earlier outputs remain unchanged after success or
failure. No intermediate union, entry expansion or truncation is necessary.

The unchanged limits are 20 entries, 256 UTF-16 code units per key/value,
8,192 source code units, 128 instructions, 1,024 executed instructions,
32 registers and 65,536 logical bytes across live registers.
Full 20-entry, maximum-length operands and every selection boundary fit these
budgets. A very large count does not cause a correspondingly large loop:
scanning remains bounded by the input's cardinality.

These operations do not implement network pagination, unbounded iteration,
file access, database queries or user permission checks.

## Bridges and offline package use

```ts
import { mapTake, mapDrop } from "./shared/wls-map-library";
import { setTake, setDrop } from "./shared/wls-set-library";

const input = { entries: [["b", "two"], ["a", "one"]] as [string, string][] };
mapTake(input, 1); // { entries: [["b", "two"]] }
mapDrop(input, 1); // { entries: [["a", "one"]] }
setTake(input, 1); // { entries: [["b", ""]] }
setDrop(input, 1); // { entries: [["a", ""]] }
```

Host bridges marshal inputs/outputs; canonical algorithms are the four files
in `shared/wls-library/map/` and `shared/wls-library/set/`. Portable generated
source and the direct Node loader agree with the canonical files.
`MAP_SET_V0_9_PROGRAM_IDS` fixes the 39-ID surface;
`MAP_SET_V0_9_LIBRARY_RELEASE` identifies the exact local version.

The full manifest is `scripts/fixtures/wls-map-set-package-v0-9.json`.
The matching `wls-map-set-v0-9-smoke.json` suite has twelve cases, covering
all four additions, ordering, payload canonicalization, clamping, validation
and retained conditional behavior.

Choose a new lock path rather than replacing an existing trusted lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-9.json > native-selection.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-9.json \
  native-selection.lock.json scripts/fixtures/wls-map-set-v0-9-smoke.json
```

Explicit program declarations, exact versions, matching profiles and source-lock
verification are required. A 0.8.0 manifest does not gain selection operations;
an intentional upgrade requires a new manifest and lock. Source hashes do not
authenticate an author or protect against a changed host/interpreter.

Verification includes independent reference selections, malformed input/count
rejection, maximum inputs, immutable snapshots, retained releases, complete
package source locks, guarded offline CLI processes, ESM/CommonJS distribution
and browser-environment tests. It is not a physical-device compatibility claim
or independent security audit.

This is local dependency implementation, not a registry publication, GitHub
merge or live application rollout. No live P2P, wallet, authentication, privacy
or tracking behavior changes.

See [conditional Maps 0.8.0](wavelengthscript-map-set-v0-8.md),
[the dependency index](wavelengthscript-dependencies.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
