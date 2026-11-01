# WavelengthScript collections 0.18.0: ordered collection updates

Exact local dependency `wls.collections: 0.18.0` uses `WLS-MAP/1` and provides
62 Map/Set operations (71 operations across all profiles).
Both new algorithms execute actual WavelengthScript instructions; TypeScript
adapters marshal values only. No new opcode, capability or I/O is introduced.

## Contracts

- `map.moveToEnd(map, key)` moves an existing entry to the last position,
  preserving its payload and the relative order of all other entries.
  `[["a","x"],["b","y"]]`, `"a"` yields `[["b","y"],["a","x"]]`.
- `set.moveToEnd(set, value)` moves an existing member last. Output payloads
  are canonical empty strings. `[["a","x"],["b","y"]]`, `"a"` yields
  `[["b",""],["a",""]]`.
- Missing keys/members are never inserted. Empty collections remain empty.
  Moving an already-last item preserves content. Every return is a fresh
  immutable snapshot; inputs are not changed.
- Cardinality is unchanged, including at full capacity. Repeating a move is
  content-idempotent. Order matters: neither operation sorts or normalizes.
- Every operand is required and validated, including empty, absent and
  already-last paths. Empty strings, Unicode and prototype-like keys are
  ordinary exact strings. Duplicate/malformed and over-limit inputs fail.

Limits remain 20 entries, 256 UTF-16 code units per key/value, 1,024 cycles and
65,536 logical live-register bytes. These are execution bounds, not heap or
speed guarantees. Each program uses a single bounded scan with lookups/updates
inside the existing VM. Old source bytes, manifests and lock commitments remain
unchanged; older exact-version packages cannot select the new APIs.

## Use and verify

Native algorithms: `shared/wls-library/map/moveToEnd.wls` and
`shared/wls-library/set/moveToEnd.wls`.

Full 62-API consumer: `scripts/fixtures/wls-map-set-package-v0-18.json`.
Six literal expected examples: `scripts/fixtures/wls-map-set-v0-18-smoke.json`.
The learning workspace exposes editable runnable examples of these same sources.

```sh
npm run generate:wls-library
npm run check:wls-library
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-18.json > ordered.lock.json
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-18.json \
  ordered.lock.json scripts/fixtures/wls-map-set-v0-18-smoke.json
```

Review and retain trusted locks; do not regenerate them to conceal a mismatch.
Locks bind manifest/source content, not author identity or host behavior.

## Internal audit

Completed 1 November 2026:

- Production build passed: **9,405 tests across 255 passing files**, with
  **51 pre-existing skips across four files unchanged**. This command runs
  database-free server/client projects, not database or Python suites.
- **138 new direct tests** cover independent reference results, every position
  at full capacity with maximum payloads, absent/empty/single-item inputs,
  repeated moves, UTF-16 boundaries, immutable results and unchanged cardinality.
- Missing/malformed operands fail with the collection VM error type, including
  on empty, absent and already-last branches. No placeholder fallback is used.
- Three new guarded offline CLI / standalone ESM and CommonJS bundle tests
  passed. Two new browser-environment learning examples execute the actual
  native sources with independently expected results.
- All 71 canonical operations have independently expected successful examples.
  All 18 retained releases execute through ordinary and source-locked packages.
  Earlier source-lock fingerprints are unchanged. The new lock fingerprint is
  `b1911ada2f91330483adfe8ac9b80f523d73eebb9a8473ea2450bf748fd64e21`.
  Tests reject changes to the manifest and either new source commitment.
- TypeScript, generated-source consistency, bundle budgets, Wave Vault
  navigation, critical preloads and startup-artifact safety passed.
- The generated guide was checked visually at a 402-pixel phone viewport;
  production output matches its generated source. Real guide-serving/build
  tests remain part of the successful suite.

No new skips, removed assertions, timeout increases, execution-budget increases
or edits to retained native program sources were needed. Existing large-chunk
and non-failing Vite test WebSocket-port warnings remain visible.

This is a repository-local dependency, not a public registry release, application
rewrite, financial migration or privacy sign-off. Browser-environment component
tests are not native-browser-worker or physical-device verification of these new
APIs. Workspace results do not establish GitHub CI, owner merge or website
publication. See [the dependency index](wavelengthscript-dependencies.md).
