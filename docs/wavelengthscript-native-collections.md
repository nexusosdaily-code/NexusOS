# Native collections: workspace profile and P2P recipient pilot

The isolated [string-list library expansion](wavelengthscript-string-library.md)
adds executable `contains`, `indexOf` and `concat` programs under the same
profile and bounds. It does not change the live recipient-selection path.
The [local compile/run tool](wavelengthscript-local-tools.md) also accepts
standalone source files without starting the website.

## Coding workspace: explicit WLS-COLLECTION/1 profile

Open the existing **CE→SE Pipeline** at `/ce-se-pipeline`. In **Execution
profile / version**, choose **Native collections · WLS-COLLECTION/1**.
The default remains the existing Python `WLS-PY/1` pipeline and
other-language encoding previews. The contract VM has a separately labelled
workspace link; choosing collections never uses that VM.

The collection workspace loads the actual reusable `add`, `remove`, `count`
and `at` source strings from `shared/wls-recipient-collections.ts`. You can
edit that source directly, not just invoke the P2P wrapper:

1. **Load program** picks a source example and matching local sample inputs.
2. **Collection source** accepts the explicit first-line `WLS-COLLECTION/1`
   header followed by instructions. This field is native collection source,
   not Python, JavaScript, an import statement or a contract program.
3. **JSON inputs** is a non-null object of named input registers. For example,
   `{"items":["alpha","beta"],"value":"gamma"}` with the `add` program returns
   `["alpha","beta","gamma"]`. Change `value` to `"alpha"` to inspect duplicate
   handling. `count` returns `2` for `{"items":["alpha","beta"]}`, and `at`
   returns `"beta"` for `{"items":["alpha","beta"],"index":1}`.
4. **Compile** shows every compiled instruction, resolved branch operands,
   original source line and coordinate-derived wavelength metadata.
5. **Execute** or **Run all** validates and recompiles the current source,
   runs the bounded interpreter and shows the returned JSON value and **only
   actually visited instructions**. Repeated loop visits remain visible.
   Compiled instructions are not accepted back as executable input.

Source, input, example or profile changes clear stale compilation and results.
Compilation/runtime/input errors are explicit and never display a prior result
as a fresh success. Failed executions do not claim a successful trace. Profile
switches reset the workspace; there is no implicit persistence or filesystem.
JSON text is separately limited to 16,384 characters before parsing; all VM
value and resource limits below still apply after parsing.

The selector and required header are separate checks: unknown versions,
missing headers and foreign-profile source are rejected by the collection
compiler. Collection source and recognizable headerless `LIST_*` instructions
are rejected before other-language preview translation and by the browser and
server contract compilers, rather than silently going through generic `EXEC`.
Python parsing and its `WLS-PY/1` instruction format remain unchanged.

### Instruction interface

Each instruction is an uppercase operation followed by a JSON argument array.
Register and label names start with an ASCII letter and contain at most 32
letters, digits or underscores. Define a label on its own line as `:scan`.
Blank lines and whole-line `//` comments are ignored after the required header.

| Instruction | Arguments | Behaviour |
| --- | --- | --- |
| `LIST_NEW` | `["dest"]` | Empty string list |
| `LIST_COPY` | `["dest","items"]` | Independent list copy |
| `LIST_LEN` | `["dest","items"]` | List length |
| `LIST_AT` | `["dest","items","index"]` | Checked zero-based retrieval |
| `LIST_PUSH` | `["items","value"]` | Bounded string append |
| `CONST` | `["dest", literal]` | String, safe integer or boolean literal |
| `EQ` | `["dest","left","right"]` | Exact scalar comparison |
| `LT` | `["dest","left","right"]` | Safe-integer comparison |
| `INC` | `["integer"]` | Checked integer increment |
| `JTRUE` | `["condition","label"]` | Branch on a boolean |
| `JUMP` | `["label"]` | Unconditional branch |
| `RETURN` | `["value"]` | Return a scalar or copied string list |

Example of an independently editable program:

```text
WLS-COLLECTION/1
LIST_LEN ["size","items"]
RETURN ["size"]
```

This is an explicitly versioned, capability-free instruction profile, not a
general module/import system. Source reuse currently means loading or copying
these bounded source programs and supplying named input registers.

## Delivered scope

The private broadcast preparation form at `/streaming?create=private` uses
executable WavelengthScript collection programs for adding an exact address
without duplicates, removing matching addresses and counting recipients.
The library also provides checked indexed retrieval. Directory selection and
manual address entry use the same code path.

The selection is a browser-local preparation list, limited to 20 strings of up
to 256 UTF-16 code units each. This is not a system-wide audience limit or an
access grant. Creating a private room still uses the existing authenticated
server invitation flow. Public discovery, file grants, live media transport,
wallet operations and payment gates are unchanged.

## What “native” means here

`shared/wls-recipient-collections.ts` contains executable source strings for
the explicitly versioned **WLS-COLLECTION/1** extension. The source implements
duplicate search and removal using branches, indexed list access and scalar
comparison. The JavaScript bridge does not perform those algorithms using
`Set`, `includes` or `filter`.

`shared/wls-collection-vm.ts` compiles that source into instructions with
coordinate metadata from the existing VM-name mapping, and executes them.
An execution trace reports the instructions actually visited.

The interpreter and primitive allocation/indexing operations remain TypeScript,
just as the existing VM has a host implementation. This is a bounded
string-collection pilot, **not** a completed general module system, standard
library, self-hosting compiler or rewrite of the browser. It does not extend the
Python-subset grammar or send collection source through the contract VM's
permissive EXEC fallback.

The canonical programs now live in `shared/wls-library/recipient/*.wls`.
A generated portable artifact supplies the unchanged TypeScript compatibility
exports for browser and Node bundlers. Their control flow is parsed as collection
instructions, not evaluated as JavaScript. The existing workspace exposes this
profile directly. See the [local library loading guide](wavelengthscript-string-library.md)
for standalone sources and the fixed catalogue loaders; general module/import
grammar remains outside this profile.

## Bounds and failure behaviour

- Source: 8,192 characters; at most 128 instructions.
- Execution: at most 1,024 visited instructions and 32 registers.
- Lists: at most 20 strings; each string at most 256 UTF-16 code units.
- Invalid instructions, literals, registers, labels, types and indices fail
  explicitly. Infinite loops exhaust the cycle budget.
- Programs and argument arrays are frozen after compilation. The public runner
  recompiles source instead of accepting caller-forged instruction records.
- Input/output lists are copied; errors do not mutate the selected list.
- A duplicate at the 20-item boundary remains valid; a 21st distinct entry
  fails and the manual input remains available for correction.
- Address equality is exact and case-sensitive. The bridge trims surrounding
  whitespace and rejects empty, oversized or embedded ASCII-control input.
  Server-side address resolution and authorisation remain authoritative.
- A synchronous selection snapshot prevents batched UI selections from
  overwriting each other. Account changes and switching to a public room clear
  that snapshot through the same reset path.
- No network, DOM, file, database, wallet or financial capabilities exist in
  the collection interpreter. Coordinates are metadata, not permissions or
  cryptographic protection.

## Verification

### Automated checks

The following counts record the original P2P pilot verification, not a fresh
whole-project run for every later workspace change. Workspace regression cases
are in `client/src/__tests__/learn-collections.test.tsx` and
`server/wls-collection-profile.test.ts`. Together with the original collection
suite and Python failure diagnostics they check real outputs, malformed source
and JSON, exact visited coordinate-tagged instructions, resource limits, stale
result invalidation and profile separation.

Run the focused workspace and compatibility checks:

```sh
node_modules/.bin/node node_modules/vitest/vitest.mjs run \
  client/src/__tests__/learn-collections.test.tsx \
  client/src/__tests__/learn-python-failure.test.tsx \
  server/wls-collection-profile.test.ts server/wls-collections.test.ts
npm run check:types
```

Workspace verification: the focused collection/Python suites passed (80 tests),
and TypeScript passed. A native Chromium check at 390×844 also exercised
profile selection, compile/execute, returned count, visited trace, rejected
version, stale-result clearing and duplicate add. It found no page-wide
horizontal overflow, page errors or API requests from collection interactions.
The unauthenticated workspace itself is accessible; this check did not bypass
authentication, grant recipients access or exercise financial operations.

- TypeScript check passed.
- New collection suite: **45 tests passed**, including a deterministic
  1,000-operation reference comparison, Unicode/case preservation, snapshot
  independence, empty/full boundaries, invalid bytecode-source inputs, type
  confusion, bounds and resource exhaustion.
- Full database-free build: **139 test files passed, 3 skipped; 4,769 tests
  passed, 26 skipped**. Client/server bundles, bundle-size budgets, critical
  preloads, Wave Vault navigation and safe-startup artifact checks passed.
- Two opt-in isolated native-browser cases passed. They use the real streaming
  page, collection source and independent Chromium processes with synthetic
  identities, ACLs and fake camera media:
  - Manual add, duplicate handling, removal and directory re-add; both selected
    guests are invited, an outsider is rejected, and a separate receiver decodes
    frames.
  - 20-item boundary, rejected overflow with retained input, removal/re-add and
    public/private reset; preparation alone creates no grants or capture tracks.

Browser command:

```sh
WNSP_LIVE_VIDEO_BROWSER_TEST=1 WNSP_PUBLISH_BUILD=1 \
DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture \
node_modules/.bin/node node_modules/vitest/vitest.mjs run \
  --config vitest.live-video.config.ts \
  -t 'selects multiple private recipients|bounds native recipient selection'
```

The unauthenticated phone-width application screenshot rendered the sign-in
page, as expected. It did not visually verify the signed-in selector. Signed-in
interaction evidence comes from the isolated browser fixture, not a real
customer account or a physical iPhone/Samsung retest.

### Post-build audit

Dependency scan: **zero findings**.

Static scan: two existing medium findings outside the changed collection
implementation, reviewed in context:

1. `scripts/check-disclosure-export.mjs`: SHA-1 is used to reproduce a Git blob
   object identifier for export readback, not a newly chosen password,
   signature or private-file protection algorithm. Replacing it with SHA-256
   without changing the Git object format would break this comparison.
2. `server/founder-access.ts`: the flagged cookie receives a newly created
   server-side session token, not a token copied from the request. The
   corresponding storage method generates the token; founder tokens include a
   cryptographically random nonce. The flagged line did not demonstrate
   attacker-selected session fixation.

Privacy/dataflow scan: one existing low finding on
`wnsp_v7/protocol.py` printing “Energy budget” in its `__main__` demonstration.
The inspected value is the demonstration packet's physical-energy quantity,
not a customer's financial budget.

No new findings were reported in the changed implementation. This is a
contextual review of these findings, not a scanner suppression, exhaustive
security clearance or evidence that all unrelated code is vulnerability-free.

Manual review also checked exact address handling, atomic failure, bounded
backward jumps, absence of host side effects and separation of selections from
server ACLs. No provider calls, funded workers, real-money operations or
private stored files were used for verification.
