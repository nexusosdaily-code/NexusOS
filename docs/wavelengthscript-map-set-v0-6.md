# Map value operations and Set comparisons: local package 0.6.0

Exact `wls.collections` **0.6.0** retains all 21 Map and map-backed string Set
programs from 0.5.0 and adds six native `.wls` programs. The release therefore
contains **27 programs: 14 Map operations and 13 Set operations**.

These programs execute in the existing `WLS-MAP/1` interpreter. They add no
syntax, opcode, value type, host interface, download hook or resource allowance.
Earlier exact versions retain their program surfaces and source commitments.
This is a local library release, not an assertion of a registry publication,
GitHub merge, application migration or production rollout.

## New operations

| Program | Input registers | Result |
| --- | --- | --- |
| `map.filterByValue` | `map`, `value` | Map entries whose payload exactly equals `value` |
| `map.rejectByValue` | `map`, `value` | Map entries whose payload does not equal `value` |
| `map.invertLast` | `map` | Inverse Map, with explicit last-key precedence for repeated values |
| `set.isSubset` | `left`, `right` | Whether every left key appears on the right |
| `set.isDisjoint` | `left`, `right` | Whether no key appears in both operands |
| `set.equals` | `left`, `right` | Whether both operands have exactly the same keys |

### Map value operations

Filtering preserves original keys, payloads and insertion order. Queries must
be bounded strings, including when the input is empty. There is no coercion,
Unicode normalization, trimming, regular expression or caller-provided callback.

Inversion uses input payloads as output keys and input keys as output payloads.
For repeated input values, **the last input key wins**, while the output key's
position follows that value's first appearance:

```text
[["a","x"], ["b","y"], ["c","x"]]
becomes
[["x","c"], ["y","b"]]
```

The `Last` suffix is intentional. This operation is lossy when values repeat;
it is not a uniqueness check, bijection, lossless reverse index or a multi-map.
Empty, numeric-looking and prototype-like strings remain ordinary strings.
Duplicate input keys are still invalid Maps, not resolved by inversion.

### Set comparisons

Sets retain the [0.5.0 map-key representation](wavelengthscript-sets-v0-5.md).
Membership and equality ignore valid payload text and insertion order, but not
case or Unicode differences. They return booleans, not normalized Maps.

An empty Set is a subset of every valid Set. Two empty Sets are equal.
An empty Set is disjoint from every valid Set, including itself.
Subset is directional; equality and disjointness are symmetric.

Both operands must be valid bounded Maps, even if an empty operand or unequal
cardinality determines the answer immediately. General VM scalar validity does
not establish a library function's operand type. Native programs validate both
Map operands before shortcuts; value filters validate the string query before
their scan. No host-side Set algorithm substitutes for the native source.

## Bounds and immutable behavior

The unchanged profile allows 20 entries, 256 UTF-16 code units per key/value,
8,192 source code units, 128 instructions, 1,024 executed instructions,
32 registers and 65,536 logical memory bytes across live registers.

Map results are fresh, deeply frozen snapshots. Neither success nor failure
mutates caller inputs or earlier results. Invalid Maps, invalid query types,
oversized strings and exceeded budgets fail explicitly. Inversion cannot
increase cardinality above its valid input's 20 entries.

Maximum-cardinality, maximum-length inputs and full-result/full-scan paths are
tested without increasing VM budgets. These checks are not a heap measurement,
performance superiority claim, physical-device test or photonic demonstration.

## Integration and offline tooling

Native source is in `shared/wls-library/map/` and `shared/wls-library/set/`.
The generated portable artifact and direct Node loader expose identical source.
Typed host bridges marshal and check results:

```ts
import {
  mapFilterByValue, mapRejectByValue, mapInvertLast,
} from "./shared/wls-map-library";
import {
  setIsSubset, setIsDisjoint, setEquals,
} from "./shared/wls-set-library";
```

`MAP_SET_V0_6_PROGRAM_IDS` is the fixed 27-program surface and
`MAP_SET_LIBRARY_RELEASE` identifies 0.6.0. Retained constants, including the
ten-ID `SET_PROGRAM_IDS` and 21-ID `MAP_SET_V0_5_PROGRAM_IDS`, do not expand.
The older string-list execution profile is not implicitly mixed into this one.
Direct bridges use the current catalogue; package APIs additionally enforce
the consumer's exact version and declared programs.

The complete example manifest is `scripts/fixtures/wls-map-set-package-v0-6.json`.
Its matching `wls-map-set-v0-6-smoke.json` suite contains ten cases covering all
six additions, retained Map/Set behavior and two expected validation failures.

```sh
# Write only to a chosen new lock path, never over an existing trusted lock.
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-6.json > your-map-set.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-6.json \
  your-map-set.lock.json scripts/fixtures/wls-map-set-v0-6-smoke.json
```

The existing package-check, package-verify and locked run commands also work
without new permissions. Locks cover every declared source, including sources
not selected by the next execution. Verification executes the verified source
snapshot and does not recreate a mismatched lock.

Tests include independent Map/Set references, exact Unicode behavior, canonical
source equality, fixed prior-release surfaces, the pre-0.6.0 fingerprint of
the complete 0.5.0 example lock, guarded offline CLI processes, standalone
Node ESM/CommonJS bundles and browser-environment bridges. Browser-environment
tests are not claims of independent physical Safari/device verification.

This does not replace general structured-data libraries, add list-to-Set
conversion or migrate P2P code. No recipient permissions, wallets, authentication
or privacy settings change. Key membership is not participant authentication,
and source-lock equality is not author or runtime authentication.

See [the dependency index](wavelengthscript-dependencies.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
