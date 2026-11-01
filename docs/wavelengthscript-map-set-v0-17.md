# WavelengthScript collections 0.17.0: swapping and membership toggling

Exact local dependency `wls.collections: 0.17.0` uses `WLS-MAP/1`.
It provides 60 Map/Set operations (69 operations across all profiles).
The algorithms below are actual `.wls` programs; TypeScript bridges only
marshal arguments and results. No new opcode, runtime capability or I/O.

## Contracts and examples

- `map.swapValues(map, first, second)` exchanges the string payloads of two
  existing keys without changing key positions. Missing either key, identical
  keys, or identical payloads return a fresh unchanged-content copy.
  Example: `[["a","x"],["b","y"]]`, `"a"`, `"b"` yields
  `[["a","y"],["b","x"]]`. Values are read from the original map before writing.
- `set.toggle(set, value)` removes an existing member, or appends an absent
  member at the end. Remaining order is preserved; every output payload is `""`.
  Example: `[["a","x"],["b","y"]]`, `"a"` yields `[["b",""]]`.
  Toggling again restores membership but appends at the end, not the old position.
- Both return fresh immutable snapshots without modifying inputs, including
  no-op paths. Every operand is required and validated even on empty inputs.
- Empty strings, Unicode and prototype-like keys are exact ordinary strings.
  There is no normalization or case folding. Duplicate/malformed entries fail.
- Existing limits remain 20 entries, 256 UTF-16 code units per key/value,
  1,024 cycles and 65,536 logical live-register bytes. Adding an absent member
  to a full set throws; removing a present member from a full set succeeds.
  These logical bounds are not host-heap guarantees or performance claims.

Native sources: `shared/wls-library/map/swapValues.wls` and
`shared/wls-library/set/toggle.wls`. The swap performs bounded lookups and
updates; the toggle performs one bounded scan. Previous source bytes,
manifests and lock fingerprints remain retained.

## Runnable package and developer tools

Full 60-API consumer: `scripts/fixtures/wls-map-set-package-v0-17.json`.
Six literal expected examples: `scripts/fixtures/wls-map-set-v0-17-smoke.json`.
The learning workspace offers these actual sources and editable examples.

```sh
npm run generate:wls-library
npm run check:wls-library
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-17.json > swapping.lock.json
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-17.json \
  swapping.lock.json scripts/fixtures/wls-map-set-v0-17-smoke.json
```

Review and retain trusted locks; do not regenerate them to conceal drift.
Locks bind source and manifest content, not author identity or host execution.
This is not a registry publication, live P2P migration, privacy sign-off,
physical-device certification or completion of the whole-project rewrite.

## Internal verification

Completed 1 November 2026:

- Production build passed: **9,246 tests across 251 passing files**. The
  **51 pre-existing skips across four files remain unchanged**. This build
  runs the database-free server/client projects, not database or Python suites.
- The new operations have 103 direct tests, three guarded offline CLI /
  standalone ESM and CommonJS bundle tests, and two new learning examples.
- All 69 canonical operations have independently expected successful examples.
  All 17 retained versions run through ordinary and source-locked packages.
  Earlier lock fingerprints are unchanged; the 0.17.0 lock is pinned to
  `2d0f0314f2f891bc0e4bffb30ffed4508f7ebd661b9fc5695cc40058b12c45fb`.
- TypeScript, canonical source consistency, bundle budgets, Wave Vault
  navigation, critical preloads and startup-artifact safety passed.
- Two real Vite tests verify exact guide bytes over GET/HEAD, query handling,
  refusal of unintended paths/methods, asset inclusion and missing-source
  build failure. The actual production guide matches its generated source.

The audit caught a real disclosure usability gap: the generated public guide
was not served by the application's frontend root or included in its build.
A narrowly scoped plugin now serves/emits that file only; unrelated repository
directories are not exposed. The bundle-size checker import now resolves the
actual TypeScript source without relying on `.js` extension substitution.

An initial guide-serving fixture scanned the main frontend and exceeded its
deadline under the full suite. It now uses a disposable project root with
automatic dependency discovery disabled. The final complete build passed
without removing assertions, adding skips or raising deadlines. Interrupted
runs are not counted as successful verification.

No refreshed signed-in UI screenshot, native-browser-worker or physical-device
verification is claimed for these new APIs. Workspace build evidence is
separate from GitHub CI, an owner merge and website publication. The existing
large-chunk build warning and a non-failing Vite test WebSocket-port warning
remain visible; they are not reported as faults in the WavelengthScript results.

See [the dependency index](wavelengthscript-dependencies.md).
