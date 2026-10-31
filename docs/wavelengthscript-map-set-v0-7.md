# Full-entry Map comparisons and Set symmetric difference: local 0.7.0

Exact `wls.collections` **0.7.0** retains all 27 programs from 0.6.0 and adds
five native `.wls` algorithms. Its fixed surface contains **32 programs:
18 Map operations and 14 map-backed string Set operations**.

The execution profile remains `WLS-MAP/1`. No new syntax, interpreter value
type, opcode, host capability, installer or resource limit is introduced.
Earlier exact release surfaces and source commitments remain unchanged.
This describes local library work, not a GitHub merge or application rollout.

## New operations

| Program | Input registers | Result |
| --- | --- | --- |
| `map.equals` | `left`, `right` | Equal cardinality and identical key/value associations |
| `map.isSubmap` | `left`, `right` | Every left key/value association occurs on the right |
| `map.intersectionEntries` | `left`, `right` | Left entries with the same key and value on the right |
| `map.differenceEntries` | `left`, `right` | Left entries absent or differently valued on the right |
| `set.symmetricDifference` | `left`, `right` | Keys present in exactly one operand, with empty payloads |

### Map entries versus keys

Map comparisons check **both** keys and string payloads, but ignore insertion
order. Submap is directional; equality is symmetric. An empty Map is a
submap of any valid Map, and two empty Maps are equal.

New entry intersection/difference preserve the left operand's entry order and
payloads. They do not replace the older key-based `map.intersection` and
`map.difference`, which retain their original behavior:

```text
left:  [["a","one"], ["b","left"]]
right: [["b","right"], ["a","one"]]

set.equals                 -> true  (same keys)
map.equals                 -> false (different b payload)
map.intersection           -> [["a","one"], ["b","left"]]
map.intersectionEntries    -> [["a","one"]]
map.difference             -> []
map.differenceEntries      -> [["b","left"]]
```

Equality is exact string equality: no normalization, coercion, case folding,
trimming or locale rules. Empty, prototype-like, numeric-looking and Unicode
strings remain ordinary data. This is not byte-for-byte serialization equality,
cryptographic equality, identity verification or an authorization check.

### Set symmetric difference

Sets keep the [0.5.0 Map-key representation](wavelengthscript-sets-v0-5.md).
Input payloads must be valid bounded strings but are otherwise ignored.
Returned payloads are empty strings. Left-only members come first in left
order, followed by right-only members in right order.

For example, left `[b,a]` and right `[a,c]` produce `[b,c]`, with empty payloads.
Membership is symmetric, but reversing operands can change output order.
An operand compared with itself yields an empty Set; an empty operand yields
a canonical Set of the other operand's keys.

Only the **result** must fit the 20-member cap. Two 20-member inputs sharing
ten members have a 30-member union but a valid 20-member symmetric difference.
The native algorithm scans both operands directly instead of constructing an
oversized union. Results exceeding 20 members fail explicitly without truncation
or partial return.

## Validation, bounds and immutable behavior

Both inputs must be valid bounded Maps, even when an empty operand or a size
mismatch could determine a result early. Duplicate keys, invalid payloads,
sparse arrays, malformed structures and non-Map scalars are rejected.

The unchanged limits are 20 entries, 256 UTF-16 code units per key/value,
8,192 source code units, 128 instructions, 1,024 executed instructions,
32 registers and 65,536 logical memory bytes across live registers.
Maximum-size operands, full Map results, late mismatches and long Set scans
are tested without enlarging these limits.

Map/Set results are fresh, deeply frozen snapshots. Success and failure leave
both inputs and previously returned results unchanged. No host-side Map/Set
algorithm replaces the canonical `.wls` implementation.

## Typed bridges and offline packages

The existing bridge modules expose:

```ts
import {
  mapEquals, mapIsSubmap, mapIntersectionEntries, mapDifferenceEntries,
} from "./shared/wls-map-library";
import { setSymmetricDifference } from "./shared/wls-set-library";
```

Native source is in `shared/wls-library/map/` and `shared/wls-library/set/`.
Portable generated source and the direct Node source-tree loader agree exactly.
`MAP_SET_V0_7_PROGRAM_IDS` fixes the 32 IDs;
`MAP_SET_V0_7_LIBRARY_RELEASE` identifies the exact new release.
Retained release constants do not silently expand. The independent string-list
profile is not implicitly mixed in.

Direct bridges use the current catalogue. Package APIs additionally require the
exact dependency version and declared program IDs. Lock verification checks all
declared sources and executes the verified snapshot, not a newly loaded copy.
A source lock is not author authentication or protection against a changed host.

The full manifest is `scripts/fixtures/wls-map-set-package-v0-7.json`.
The matching `wls-map-set-v0-7-smoke.json` suite has twelve cases covering all
five additions, retained behavior, semantic distinctions and expected failures.

```sh
# Choose a new lock path; do not overwrite an existing trusted lock.
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-7.json > your-entry-set.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-7.json \
  your-entry-set.lock.json scripts/fixtures/wls-map-set-v0-7-smoke.json
```

Verification includes independent references, Unicode and ordering cases,
maximum inputs, overflow/immutability checks, retained release source commitments,
guarded offline CLI processes and standalone ESM/CommonJS bundles.
Browser-environment tests are not physical Safari/device verification.

This adds no general structured-data parser, list-to-Set conversion, file/network
access or application migration. No live P2P, funds, authentication or privacy
behavior is changed by these library operations.

See [the dependency index](wavelengthscript-dependencies.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
