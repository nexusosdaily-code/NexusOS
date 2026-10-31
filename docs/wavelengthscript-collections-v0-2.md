# Native collection library 0.2.0

This offline dependency increment adds two actual WavelengthScript programs,
not host-language array implementations or a new language grammar:

| Program ID | Inputs | Result |
| --- | --- | --- |
| `string.lastIndexOf` | `items: string[]`, `value: string` | Last zero-based exact match, or `-1` |
| `string.reverse` | `items: string[]` | A fresh list in reverse order |

`lastIndexOf` does not trim, case-fold, coerce types or normalise Unicode.
The query must be a string even when the list is empty. It has no optional
JavaScript-style `fromIndex` argument. `reverse` preserves each complete
string and every duplicate; it does not reverse characters within strings.
Neither changes the caller's input.

## Runtime and limits

Both canonical sources live in `shared/wls-library/string/` and execute under
the unchanged **WLS-COLLECTION/1** interpreter. The typed host bridges are
`stringListLastIndexOf` and `stringListReverse` in
`shared/wls-string-collections.ts`. The algorithms themselves run as `.wls`
instructions, not JavaScript `lastIndexOf` or `reverse` calls.

Existing limits remain authoritative: 20 items per list, 256 UTF-16 code units
per string, 8,192 source characters, 128 instructions, 32 registers and 1,024
execution cycles. Invalid types, sparse lists and oversized values fail.

The profile has increment but no decrement or scalar-copy opcode. Last-match
search uses a bounded visited list to retain matching positions. Reversal uses
fixed unrolling of the 20 possible indices, with a bounds check before each
read. It compiles to 123 instructions and uses at most 103 executed cycles.
Any future item-limit increase requires reviewing that source rather than
silently assuming it handles larger lists. No VM opcode or limit is changed.

## Release compatibility

- Exact dependency **0.1.0** still exposes only its original seven programs.
- Exact dependency **0.2.0** exposes those seven plus the two additions.
- Old source bytes are unchanged, so existing valid 0.1.0 locks stay valid.
- Both releases use the same execution profile; compatibility versions and
  source-integrity hashes remain separate guarantees.
- `COLLECTION_LIBRARY_RELEASE` retains the initial identity for compatibility;
  `COLLECTION_LIBRARY_LATEST_RELEASE` identifies the new release.

Consumers must explicitly select 0.2.0 and declare the desired program IDs.
Changing a dependency or manifest requires deliberate lock creation; verification
never upgrades a manifest or regenerates its lock.

## Try the shipped fixtures

From the repository root, first check the packaged source:

```sh
npm run check:wls-library
```

Then run the local CLI. The lock command prints JSON; the shell redirection
below writes it to the chosen location and **overwrites that file if it exists**.
Use a new destination rather than overwriting a trusted lock without review.

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-check scripts/fixtures/wls-collection-package-v0-2.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-collection-package-v0-2.json > collection-v0-2.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-verify scripts/fixtures/wls-collection-package-v0-2.json collection-v0-2.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-collection-package-v0-2.json \
  collection-v0-2.lock.json scripts/fixtures/wls-library-v0-2-smoke.json
```

The six-case suite covers both new operations, rejected query types and reuse of
the original first-match operation. The new fixture is independent of the
original 0.1.0 manifest and smoke suite.

## Boundaries and verification

The interpreter, loader, cryptographic hashing and CLI are still TypeScript/host
bootstrap code. These additions do not establish a self-hosted toolchain,
general dependency resolver, author authentication, private storage, privacy
completion or photonic execution. No live P2P, media, wallet or account flow
is changed.

Focused coverage exercises every accepted reverse-list length, maximum string
lengths, exact Unicode and duplicate handling, malformed inputs, independent
results, old-release gating and old/new locks. Browser loader, moved source-tree
and portable bundle tests include the new catalogue entries. A real-process
CLI test checks, locks, verifies and executes the shipped fixture suite.
