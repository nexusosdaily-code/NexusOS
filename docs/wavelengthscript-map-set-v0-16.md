# WavelengthScript collections 0.16.0: collision-safe renaming

Repository-local exact dependency `wls.collections: 0.16.0`, using the existing
`WLS-MAP/1` profile. This adds two real WavelengthScript programs to the
58-operation Map/Set release surface (67 operations across all profiles).
All retained releases, source bytes and locks remain unchanged.

## Contracts

- `map.renameKeyIfAbsent(map, key, replacement)` renames an existing key at its
  original insertion position, preserving its string payload.
- `set.replaceIfAbsent(set, value, replacement)` replaces a member at its
  original position. All returned payloads are the canonical empty string.
- Missing source, occupied destination, and identical source/destination
  return a fresh unchanged-content copy (with canonical Set payloads).
- No overwrite, merging, sorting, Unicode normalization or input mutation.
  Empty strings and prototype-like keys are ordinary strings.
- All operands are required and validated, including empty/no-op paths.
  Duplicate keys, non-string entries and over-limit inputs fail explicitly.

Algorithms are in `shared/wls-library/map/renameKeyIfAbsent.wls` and
`shared/wls-library/set/replaceIfAbsent.wls`. TypeScript bridges only marshal
inputs/results. No new opcode, VM permission, callback, network or file I/O.
Existing bounds remain 20 entries, 256 UTF-16 code units per key/value,
1,024 cycles and 65,536 logical live-register bytes. These are logical limits,
not heap or speed guarantees. The single bounded scan preserves key order.

## Use and verify

The full 58-operation runnable consumer manifest is
`scripts/fixtures/wls-map-set-package-v0-16.json`; its six-case suite is
`scripts/fixtures/wls-map-set-v0-16-smoke.json`.

```sh
npm run generate:wls-library
npm run check:wls-library
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-16.json > renaming.lock.json
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-16.json \
  renaming.lock.json scripts/fixtures/wls-map-set-v0-16-smoke.json
npm run test:wls-dependencies
```

Keep a reviewed lock; do not overwrite a trusted lock to conceal a mismatch.
The smoke suite demonstrates the two new APIs; the consumer also declares
all retained Map/Set APIs under 0.16.0. Older manifests cannot select new APIs.
Browser workspace examples execute these same sources.

## Build and internal audit — 1 November 2026

- Clean production build: **9,126 passing tests across 248 passing files**;
  **51 pre-existing skips across four files**, unchanged. No added skips,
  removed assertions, placeholder implementations or timeout increases.
- TypeScript check, generated-source consistency, bundle budgets, Wave Vault
  navigation, critical preloads and production-startup artifact checks passed.
- The new release has **103 direct behavior/boundary tests** and **three
  guarded offline CLI / standalone ESM and CommonJS bundle tests**.
- All 67 operations have independently expected successful examples across
  the 16 retained releases. The full 58-operation 0.16.0 manifest runs through
  normal and source-locked package paths; all retained lock fingerprints pass,
  and the new release fingerprint is pinned.
- Browser-environment examples exercise both new APIs. The public guide was
  visually checked at a 402-pixel phone viewport. This does not verify the
  signed-in learning screen visually or replace real browser-worker/phone tests.

The full audit caught a distribution inventory omission: the independent list
of shipped assets had not included the two new `.wls` files. The inventory was
extended to require those real files, preserving exact file-equality checks.
One subsequent full run encountered an unrelated five-second recovery-runner
test deadline. Its 67 tests passed in isolation and then in the final complete
build without changing its assertions or timeouts. Neither failed run is
counted as a successful build.

These are workspace results. GitHub CI, an owner merge and website publication
are separate steps; this is not an independent security clearance.

Source locks commit to the declared source and manifest, not the host runtime,
author identity or operator-inaccessible privacy. This release is not a
registry publication, GitHub merge, live P2P migration or physical-phone test.
See [the dependency index](wavelengthscript-dependencies.md).
