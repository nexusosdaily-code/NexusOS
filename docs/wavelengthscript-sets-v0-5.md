# Bounded map-backed string Sets: local release 0.5.0

WavelengthScript's existing `WLS-MAP/1` interpreter now supports a **library**
of ten string-key Set programs. The algorithms are canonical `.wls` source,
not JavaScript Set implementations hidden inside host bridges. No new grammar,
opcode, interpreter value type, resource allowance or host permission is added.

Exact `wls.collections` **0.5.0** includes the eleven 0.4.0 map programs and
these ten Set programs. Earlier exact releases retain their fixed surfaces,
profiles and source commitments. This is a local package contract, not a
registry publication or application migration.

## Representation and semantics

A Set is represented by a Map's unique keys. Returned Set payloads are always
the empty string:

```json
{"entries": [["alpha", ""], ["__proto__", ""], ["🌊", ""]]}
```

- Every input must be a valid bounded string-to-string Map. Duplicate keys,
  malformed entries, extra properties, sparse arrays and non-string/overlong
  payloads are rejected, even though Set algorithms ignore valid payload text.
- Membership compares keys, not payloads. Existing nonempty string payloads are
  accepted and **intentionally discarded** by operations returning Sets.
  Use Map operations instead when associated values must be preserved.
- This is a map-backed string-key library, **not** a distinct VM Set type,
  general JavaScript Set replacement, array-to-Set constructor or general
  module system. Incoming duplicate keys fail; they are not silently collapsed.
- Equality is exact UTF-16 string equality: no coercion, case folding, trimming,
  Unicode normalization or locale comparison. Empty and prototype-like strings
  remain ordinary members.
- Ordering follows insertion order. Union keeps left members first, then new
  right members. Intersection/difference retain left order. Adding an existing
  member does not move it; deleting and reinserting appends it.
- Set results are fresh, deeply frozen snapshots. Caller inputs and earlier
  results remain unchanged after success, overflow or any validation failure.
- A union or add exceeding 20 distinct members fails, rather than silently
  truncating or evicting members. Adding an existing member at capacity succeeds.

## Fixed program surface

| Program | Input registers | Result |
| --- | --- | --- |
| `set.empty` | none | Empty Set |
| `set.fromMap` | `map` | Canonical Set of the Map's keys |
| `set.size` | `set` | Number of members |
| `set.has` | `set`, `value` | Exact string membership |
| `set.add` | `set`, `value` | Canonical Set with the member |
| `set.delete` | `set`, `value` | Canonical Set without the member |
| `set.at` | `set`, `index` | Member at zero-based insertion position |
| `set.union` | `left`, `right` | Members in either operand |
| `set.intersection` | `left`, `right` | Members in both operands |
| `set.difference` | `left`, `right` | Left members absent from right |

Absent deletion is a fresh canonical copy. Out-of-range lookup fails explicitly.
Queries must be bounded strings; indexes must be safe integers. Empty operands
do not bypass Map validation or query-type checks.

All programs use the unchanged Map profile limits: 20 entries, 256 UTF-16 code
units per key/value, 8,192 source code units, 128 instructions, 1,024 executed
instructions, 32 registers and 65,536 logical memory bytes. Extra input registers
also consume the shared budget. These limits are not a JavaScript heap-byte
measurement or a performance advantage over JavaScript.

## Typed bridges and native source

Canonical source lives in `shared/wls-library/set/`. Portable generated source
and the direct Node source-tree loader expose the same exact program text.
`shared/wls-set-library.ts` marshals inputs, executes that text in the Map VM
and checks result shape; it does not implement membership or Set algebra itself.

```ts
import {
  setFromMap, setAdd, setHas, setUnion,
} from "./shared/wls-set-library";

const first = setFromMap({ entries: [["a", "ignored payload"]] });
const second = setAdd(first, "b");
setHas(second, "a");             // true
setUnion(first, second);         // { entries: [["a", ""], ["b", ""]] }
```

`StringSetValue` describes canonical empty-payload results. Valid `MapValue`
inputs can be interpreted as key sets. To copy an already canonical Set,
use `setFromMap`; payload normalization is deliberate, not data concealment.

`SET_PROGRAM_IDS` fixes the ten Set IDs; `MAP_SET_V0_5_PROGRAM_IDS` fixes all
21 IDs in release 0.5.0. `SET_LIBRARY_RELEASE` identifies that release.
The retained map-only release constants still identify 0.3.0 and 0.4.0.
The older nine-program collection profile is not automatically included.

## Offline package and verification workflow

Use `scripts/fixtures/wls-set-package-v0-5.json`, which declares all 21 programs.
The matching `wls-set-v0-5-smoke.json` suite contains thirteen cases, exercises
every Set operation, checks retained Map behavior and includes expected failures.

```sh
# Writes to your chosen lock path: do not overwrite an existing trusted lock.
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-set-package-v0-5.json > your-set.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-set-package-v0-5.json \
  your-set.lock.json scripts/fixtures/wls-set-v0-5-smoke.json
```

The existing compiler, runner, package-check, package-verify and locked execution
commands need no new capability. Version/declaration enforcement applies to
package APIs, not direct host bridges. Source-integrity checks execute the
verified source snapshot and never silently relock a mismatch.

Verification covers independent ordered-Set references, canonical portable
source, full-capacity operations, maximum payloads, immutable results, old
Map source locks, guarded no-network/no-startup CLI processes and standalone
Node ESM/CommonJS bundles. Browser-environment tests exercise the portable
catalogue and bridges; they are not physical-device Safari verification.

No live recipients, P2P behavior, wallet funds, authentication or privacy
settings change. A hash is not author authentication, host/runtime integrity
or operator-inaccessible secrecy. General Set values, list conversion,
application integration and third-party package replacement remain separate work.

See [dependency manifests](wavelengthscript-package-manifests.md),
[source locks](wavelengthscript-package-locks.md) and the
[complete documentation index](wavelengthscript-dependencies.md).
