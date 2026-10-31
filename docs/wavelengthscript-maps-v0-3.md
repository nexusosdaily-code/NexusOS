# Bounded maps: offline library 0.3.0

This repository-local release adds a pure string-to-string map dependency.
It is not a general module system, a JavaScript `Map` replacement, a Set,
or an application integration. No host/file/network/storage/DOM/wallet
instruction, import hook, installer or financial authority is added.
There are no live P2P, authentication or privacy guarantees in this increment.

This guide retains the original 0.3.0 contract. The separate
[0.4.0 map composition release](wavelengthscript-map-composition-v0-4.md)
adds merge, key intersection and key difference without changing these source
commitments or the interpreter's profile and limits.

## Separate execution and release contracts

`WLS-MAP/1` is a **separate** interpreter in `shared/wls-map-vm.ts`.
`WLS-COLLECTION/1` has not gained map values or instructions. Its old sources,
limits, string-list behavior and APIs remain unchanged.

| Exact `wls.collections` version | Manifest execution profile | Fixed programs |
|---|---|---|
| 0.1.0 | WLS-COLLECTION/1 | Original seven string/recipient IDs |
| 0.2.0 | WLS-COLLECTION/1 | Those seven plus `string.lastIndexOf`, `string.reverse` |
| 0.3.0 | WLS-MAP/1 | The eight map IDs below, **not** the string-list IDs |

The 0.3.0 map-only surface is intentional: it selects a different value and
execution contract, not an implicit upgrade to the old interpreter. Use a
separate manifest for a string-list dependency. Mixing profiles in a manifest
is rejected. No ranges, downloads, transitive dependencies or profile
translation are supported.

`COLLECTION_LIBRARY_RELEASE` and `COLLECTION_LIBRARY_LATEST_RELEASE` retain
their 0.1.0 and 0.2.0 identities for existing consumers. `MAP_LIBRARY_RELEASE`
identifies 0.3.0. `COLLECTION_PROGRAM_IDS` still lists the nine collection IDs;
`MAP_PROGRAM_IDS` lists the eight map IDs and `LIBRARY_PROGRAM_IDS` lists both.

## Values, equality, order and errors

Maps cross the JSON boundary as ordered entries, not arbitrary object fields:

```json
{ "entries": [["name", "Ψ🙂"], ["__proto__", "ordinary text"]] }
```

- Keys and values must be strings. No nested maps, lists, objects, null or
  numeric coercion. Scalars available to programs are strings, booleans and
  safe integers.
- Key equality is exact JavaScript string equality (UTF-16 code units).
  No trimming, case folding, normalization or locale comparison occurs.
  `é` and `e\u0301` are different keys; empty strings, control characters,
  astral characters and lone surrogate code units are data. Limits count
  UTF-16 code units, so `🙂` counts as two. Files themselves require valid
  UTF-8 in the CLI; JSON escapes may represent lone surrogate code units.
- Incoming duplicate keys are **rejected**, never silently collapsed.
- Input entry order is insertion order, including numeric-looking keys.
  Setting a new key appends it. Overwriting an existing key replaces its
  value without moving it and is allowed at capacity. Delete preserves the
  order of surviving entries; delete then reinsert appends the key.
- Missing `get` throws `CollectionVMError("Map key is missing.")`.
  `has` returns false. Delete of an absent key returns a fresh unchanged map.
  Out-of-range indexes throw; no `undefined`, null or magic sentinel result.
- Every input map is validated and snapshotted. Every returned map, entry
  array and pair is frozen. Get has no side effects; copy/set/delete produce
  new maps without changing input or other registers, even when the destination
  register aliases an operand. Failure does not partially change caller data.
- Keys such as `__proto__`, `constructor` and `toString` are plain entry
  strings, never property lookups. Sparse arrays, malformed pairs, extra
  properties, accessors, inherited map data and cyclic/nested values fail.
  The boundary is JSON/data values, not sandboxing hostile JavaScript proxies
  or caller-defined platform built-ins.

## Fixed catalogue and instruction signatures

Each `.wls` file is canonical; the generated portable artifact contains its
verbatim source. Operations execute inside the separate interpreter; typed
bridges in `shared/wls-map-library.ts` only marshal inputs/results.

| Program ID | Inputs | Result |
|---|---|---|
| `map.empty` | none | empty map |
| `map.copy` | `map` | fresh map |
| `map.size` | `map` | entry count |
| `map.has` | `map`, `key` | boolean |
| `map.get` | `map`, `key` | string, or missing-key error |
| `map.set` | `map`, `key`, `value` | new map |
| `map.delete` | `map`, `key` | new map |
| `map.keyAt` | `map`, `index` | key at zero-based insertion position |

Map opcode JSON operands are register names:

```text
MAP_NEW [destination]
MAP_COPY [destination, map]
MAP_SIZE [destination, map]
MAP_HAS [destination, map, key]
MAP_GET [destination, map, key]
MAP_SET [destination, map, key, value]
MAP_DELETE [destination, map, key]
MAP_KEY_AT [destination, map, index]
```

`CONST [destination,literal]`, scalar-only `EQ [destination,left,right]`,
integer `LT [destination,left,right]`, checked `INC [register]`,
boolean `JTRUE [condition,label]`, `JUMP [label]`, `:label`, comments and
`RETURN [register]` are supported. A program must end in RETURN. Unknown
instructions, malformed operands, invalid labels, undefined registers and
type mismatches fail explicitly. Map equality is not a scalar operation.

```text
WLS-MAP/1
MAP_NEW ["initial"]
CONST ["key","__proto__"]
CONST ["text","Ψ🙂"]
MAP_SET ["updated","initial","key","text"]
MAP_GET ["answer","updated","key"]
RETURN ["answer"]
```

## Resource contract

| Resource | Hard limit |
|---|---:|
| Entries per map | 20 |
| Key / value length | 256 UTF-16 code units each |
| Source length | 8,192 code units |
| Instructions | 128 |
| Executed instructions (cycles) | 1,024, including RETURN |
| Live registers, including inputs | 32 |
| Charged live register memory | 65,536 logical bytes |

Logical memory is deterministic, not an assertion about the JavaScript
engine's actual heap: scalar number/boolean = 16; string = 16 + 2 × length;
map = 32 + sum(32 + 2 × (key length + value length)) over entries. Each
register is charged independently, even for shared immutable values.
Replacing a register releases its previous charge before charging the
replacement. Over-limit input or instruction results fail before register
commit. Source, instruction/label tables and traces have separate fixed
limits above; each operation scans/copies at most 20 pairs. Snapshot/return
and instruction temporaries are individually bounded by one maximum map,
not included in the live-register charge. This is finite interpreter work,
not a wall-clock timeout or host-process memory isolation.

## Browser and Node tools

Portable synchronous loading:

```ts
import { getCollectionProgramSource } from "./shared/wls-library";
import { executeMap } from "./shared/wls-map-vm";
const result = executeMap(getCollectionProgramSource("map.set"), {
  map: { entries: [["a", "one"]] }, key: "b", value: "two",
});
```

`readCollectionProgramSource` in `shared/wls-library-node.ts` reads only
fixed catalogue file names and requires adjacent source assets. Portable
browser/Node bundles need no filesystem, runtime source downloads or server.
`compileLibraryProgram` / `executeLibraryProgram` dispatch by an explicitly
supported source header; they do not change either profile.

The existing local CLI accepts both standalone source profiles. It also
checks 0.3.0 manifests, creates/verifies explicit locks, runs declared
programs (with optional trace), and runs plain or locked suites:

```sh
node_modules/.bin/node --import tsx scripts/wls-collections-cli.ts compile shared/wls-library/map/get.wls
node_modules/.bin/node --import tsx scripts/wls-collections-cli.ts package-check scripts/fixtures/wls-map-package-v0-3.json
node_modules/.bin/node --import tsx scripts/wls-collections-cli.ts test scripts/fixtures/wls-map-v0-3-smoke.json
```

Use `package-lock <manifest>` to explicitly write a reviewed lock, then
`package-verify`, `package-run-locked` or `package-test-locked` as described in
[source-integrity locks](wavelengthscript-package-locks.md). Lock/test JSON
envelopes remain WLS-LOCK/1 and WLS-TEST/1; expected values now explicitly
permit the bounded map entry shape with order-sensitive comparison.
Lock and suite size/case limits are unchanged. Sources are snapshotted
before asynchronous hashing; execution uses that verified snapshot.
Hash equality binds exact source and manifest bytes under a trusted lock,
not author identity, the interpreter or complete runtime.

Pre-map lock fixtures for both retained versions are tested without
regeneration. Release checks include VM validation, isolated no-network
CLI commands, standalone ESM/CommonJS Node bundles, and a native browser
fixture with Node/Web Crypto digest parity and denied requests. This does
not claim support for untested browsers or live application integration.
