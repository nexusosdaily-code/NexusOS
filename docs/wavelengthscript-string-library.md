# WavelengthScript expansion: reusable string-list operations

This increment adds three reusable programs to the existing
`WLS-COLLECTION/1` instruction profile. It does not introduce a new language
version, module/import grammar, runtime capability or live P2P integration.

| Program | Named inputs | Result |
| --- | --- | --- |
| `contains` | `items`: string list, `value`: string | Exact match exists |
| `indexOf` | `items`: string list, `value`: string | First zero-based match, or `-1` |
| `concat` | `left`, `right`: string lists | Independent combined list, preserving order and duplicates |

Each canonical executable program is a standalone `.wls` file in
`shared/wls-library/string/`. The compatibility export `STRING_COLLECTION_SOURCE`
from `shared/wls-string-collections.ts` loads those same programs.
The same file exports typed host bridges:
`stringListContains`, `stringListIndexOf` and `stringListConcat`.
Search and append control flow runs as WavelengthScript instructions, not
host-language `includes`, `indexOf`, `concat` or `Set` algorithms.

## Reuse without copying embedded strings

This is a fixed local catalogue of nine programs, not a general module
grammar, package registry, network import facility or new execution capability.
Loading a source string does not execute it.

| Exact catalogue ID | Canonical file below `shared/wls-library/` |
| --- | --- |
| `string.contains` | `string/contains.wls` |
| `string.indexOf` | `string/indexOf.wls` |
| `string.concat` | `string/concat.wls` |
| `recipient.add` | `recipient/add.wls` |
| `recipient.remove` | `recipient/remove.wls` |
| `recipient.count` | `recipient/count.wls` |
| `recipient.at` | `recipient/at.wls` |
| `string.lastIndexOf` | `string/lastIndexOf.wls` |
| `string.reverse` | `string/reverse.wls` |

The original seven programs remain in the exact `wls.collections` **0.1.0**
release. **0.2.0** adds `string.lastIndexOf` and `string.reverse` while retaining
the original APIs and source bytes. Manifests pinned to 0.1.0 cannot declare
these additions. See [the new-release guide](wavelengthscript-collections-v0-2.md).

### Browser bundlers and Node (portable, synchronous)

Use the same entry in Vite/browser code or Node tooling run through `tsx`:

```ts
import { getCollectionProgramSource } from "./shared/wls-library";
import { executeCollection } from "./shared/wls-collection-vm";

const source = getCollectionProgramSource("string.contains");
const result = executeCollection(source, { items: ["alpha", "beta"], value: "alpha" });
console.log(result.value); // true
```

The paths above are relative to a file at the repository root. Client code may
use the existing `@shared/wls-library` and `@shared/wls-collection-vm` aliases.
For a root-level Node TypeScript script, run
`node_modules/.bin/node node_modules/tsx/dist/cli.mjs your-script.ts`.
Plain Node JavaScript consumers must first compile/bundle the TypeScript entry;
this is repository-local tooling, not a published npm package.

The portable loader includes a deterministic generated source artifact, requiring
no runtime filesystem, fetch, raw-import plugin or asynchronous initialization.
Production browser and server bundles include these strings; they do not need
the `.wls` files deployed separately. Existing `STRING_COLLECTION_SOURCE` and
`RECIPIENT_COLLECTION_SOURCE` exports and all typed bridges remain available.

### Node source-tree tools (read canonical files directly)

```ts
import { readCollectionProgramSource } from "./shared/wls-library-node";
import { executeCollection } from "./shared/wls-collection-vm";

const source = await readCollectionProgramSource("recipient.count");
console.log(executeCollection(source, { items: ["alpha", "beta"] }).value); // 2
```

This separate Node-only entry reads files relative to its own module, not the
current working directory. Keep `shared/wls-library/` adjacent to it when
distributing source-tree tools. Do not import it in browsers or the bundled
production server; use the portable entry there. File read failures propagate
explicitly, with no generated-source fallback.

Both loaders accept **only exact catalogue IDs**. Unknown IDs, inherited
property names, file paths and URLs are rejected before file access. The VM
still rejects `IMPORT` and other unsupported instructions.

### Editing and checking the canonical sources

Edit only the `.wls` program files, then run:

```sh
npm run generate:wls-library
npm run check:wls-library
```

`shared/wls-library-sources.generated.ts` is a committed, mechanically generated
transport artifact, not another authored source. Serialization preserves the
canonical file bytes, including the final newline. Do not edit that artifact.
The check fails if it is stale or missing; the production build runs the check
before tests. Tests independently compare every file, loader and compatibility
export, and pin the original instruction text (apart from the new ending newline).

## Use in the existing coding workspace

1. Open **CE→SE Pipeline** at `/ce-se-pipeline`.
2. Select **Native collections · WLS-COLLECTION/1**.
3. Open the desired standalone `.wls` file and paste its contents, including its header, into
   **Collection source**.
4. Enter matching JSON inputs, then select **Run all**.

For `contains` or `indexOf`, try:

```json
{"items":["alpha","beta","alpha"],"value":"alpha"}
```

The respective results are `true` and `0`. For `concat`, try:

```json
{"left":["alpha","beta"],"right":["beta","gamma"]}
```

The result is `["alpha","beta","beta","gamma"]`. `string.lastIndexOf` accepts
the same inputs as `indexOf` and returns the last exact match, or `-1`.
`string.reverse` accepts `{"items":["alpha","beta"]}` and returns
`["beta","alpha"]`; it reverses list order, not characters inside each string.
These generic library programs
are not additional built-in dropdown examples; load the file contents into the
editor. The existing recipient examples and live selection behavior are unchanged.

## Preserved limits and semantics

- At most 20 items per input list **and** at most 20 items in the result.
- At most 256 UTF-16 code units per string. Empty strings are valid.
- Exact, case-sensitive equality; no trimming or Unicode normalisation.
- Existing source, instruction, register and 1,024-cycle execution limits.
- Both search programs stop at the first match and validate the string query
  even when the input list is empty.
- Invalid types, sparse lists and overflow fail explicitly. Inputs remain
  unchanged, including when concatenation fails after partially building its
  internal result.

This is generic data manipulation, not address validation, deduplicated
recipient selection, invitation authority, encryption or privacy clearance.
Concatenation deliberately keeps duplicates; do not substitute it for the
existing recipient-selection rules.

## Implementation boundary and verification

The interpreter, allocation primitives and browser/Node bridges remain
TypeScript. These additions do not claim a self-hosting compiler, complete
standard library, dependency replacement or photonic execution.

`server/wls-library.test.ts` checks canonical source equivalence, generation
drift, exact-ID rejection before I/O, browser bundling and unchanged VM
resource/capability limits. `client/src/__tests__/wls-library.test.ts` exercises
the portable entry in the browser-like test environment.
`server/wls-library-distribution.test.ts` copies the source-tool dependency set
and every canonical `.wls` file into a disposable directory, moves it, and
launches a real Node/`tsx` consumer from an unrelated working directory. It
checks all nine catalogue IDs through both loaders against canonical bytes
and independent execution results. Omitting each source asset must produce
an explicit `ENOENT` from the direct reader while the portable loader keeps
working. A portable Node consumer is then bundled from that relocated tree;
after the entire source tree is deleted, plain Node must still execute all
nine programs from the standalone bundle without adjacent `.wls` files.
`server/wls-string-collections.test.ts` checks executable sources and bridges,
coordinate-tagged compilation, first-match traces, deterministic reference
comparisons, limits, invalid values and mutation isolation. Run alongside the
existing recipient pilot tests without a real database:

```sh
WNSP_PUBLISH_BUILD=1 \
DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture \
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server \
  server/wls-library.test.ts server/wls-library-distribution.test.ts \
  server/wls-string-collections.test.ts server/wls-collections.test.ts
```

Privacy engineering remains separate and incomplete; see the
[public disclosure scope and evidence boundaries](wavelengthscript-dependencies.md#scope-and-evidence).
The founder explicitly directed this bounded packaging work to begin. The later
priority clarification permits dependency/library/tooling work for the existing
language before privacy is complete. Neither direction establishes real-user
privacy clearance or authorizes activation, publishing, migration, unrelated
language redesign or changes to live recipient authority.
