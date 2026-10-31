# Exact-source integrity locks for local WavelengthScript dependencies

Locks also cover the separate [map-only 0.3.0 release](wavelengthscript-maps-v0-3.md)
and [map composition 0.4.0](wavelengthscript-map-composition-v0-4.md),
plus [Map + string-key Sets 0.5.0](wavelengthscript-sets-v0-5.md),
and [Map values/Set comparisons 0.6.0](wavelengthscript-map-set-v0-6.md),
and [Map entries/Set symmetric difference 0.7.0](wavelengthscript-map-set-v0-7.md),
with `WLS-MAP/1` source. Retained 0.1.0/0.2.0 collection locks stay valid
without regeneration; switching execution profiles or dependency versions
requires an explicit reviewed new lock.

`WLS-LOCK/1` adds SHA-256 commitments to the existing offline dependency
manifests. It detects changes to the exact manifest text and each declared
packaged program source, including whitespace changes under the same version.

This is an integrity comparison against a lock you trust. It is **not** a digital
signature, author authentication, full runtime verification or a privacy claim.

## Create, verify and execute

First check that the packaged library matches the canonical `.wls` files:

```sh
npm run check:wls-library
```

Create a new lock explicitly, after reviewing the manifest and its sources:

```sh
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-lock scripts/fixtures/wls-collection-package.json > collection.lock.json
```

The command emits JSON to stdout; it does not select or overwrite a lockfile
itself. The shell's `>` will overwrite an existing destination: choose a new
file or preserve your reviewed lock before deliberately replacing it.

```sh
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-verify scripts/fixtures/wls-collection-package.json collection.lock.json
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-run-locked scripts/fixtures/wls-collection-package.json collection.lock.json string.contains scripts/fixtures/wls-package-inputs.json
```

The example returns `value: true` and `integrity: "verified"`. Add `--trace`
after the input file to inspect visited instructions. Verification failures
exit with code `1`, without executing the program or regenerating the lock.
The manifest, lock and input files are not modified.

## Test a suite against a locked package

Select the locked test workflow explicitly:

```sh
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-test-locked scripts/fixtures/wls-collection-package.json collection.lock.json scripts/fixtures/wls-package-tests.json
```

The arguments are the manifest, trusted lock and existing `WLS-TEST/1` JSON
suite, in that order. Every case must use a fixed catalogue program ID declared
by the manifest. Case program references cannot be source paths or URLs.
No `--trace`, relocking option or additional suite fields are accepted.

The entire suite is validated, all declared sources are captured, compiled
and verified against the lock (including programs unused by the suite), and
every case is bound to a declared source before any case executes. All cases
use that one verified snapshot; there is no reloading between verification
and cases or per-case re-verification. Invalid sources, missing declarations
and integrity failures cannot satisfy an expected runtime-error assertion.

Success emits the ordinary `WLS-TEST/1` report with `integrity: "verified"` and
exits `0`. Assertion failures emit the report with failure reasons and exit `1`.
Malformed/unreadable inputs, unsupported declarations and integrity mismatches
exit `1` with a diagnostic on stderr and no partial report or executed cases.
Reports do not include input values, actual values, sources or raw runtime
diagnostics. The command does not modify the manifest, lock or suite.

Existing limits remain: 64 cases, 131,072 UTF-16 code units of suite text,
16,384 per-case input JSON code units, the existing name/expectation limits,
and the VM's source, value, instruction and cycle bounds. CLI reads remain
bounded regular-file reads with strict UTF-8. This command starts no application,
database or network service and grants no new VM capabilities.

## What is bound

The strict lock contains:

- `profile`: exactly `WLS-LOCK/1`.
- `manifestSha256`: SHA-256 of the exact manifest text encoded as UTF-8.
- `package`: consumer name, version and execution profile.
- `dependencies`: the resolved exact-version local dependency identity.
- `programs`: the declared IDs in manifest order, each with its exact packaged
  source's UTF-8 SHA-256 digest.

Hash strings are exactly 64 lowercase hexadecimal characters. Unknown fields,
missing/extra/duplicate/reordered program entries, unsupported IDs and malformed
identity/hash fields fail. JSON whitespace and property ordering in the lock
itself may change; the manifest and source commitments remain exact.

Limits are unchanged for manifests, source and program execution. Lock text is
limited to 16,384 UTF-16 code units, with strict UTF-8 and bounded regular-file
reads at the CLI. SHA-256 must be available through Web Crypto; there is no
weaker fallback. Malformed Unicode source cannot be silently replaced while
hashing.

## Safe execution sequence

All sources are captured and compiled before the first asynchronous hash
operation. Locked execution uses the **same captured source** that was verified,
not a later library lookup. Every declared source must match, not only the
selected program.

The CLI finishes integrity and declaration checks before reading the selected
input file. Runtime inputs are then checked by the existing VM immediately
before execution. No externally forged resolved plan or bytecode is accepted.

`shared/wls-package-lock.ts` exports asynchronous creation, verification,
verified-source loading and locked-execution APIs. These are TypeScript/Web
Crypto bootstrap tools for Node/browser bundlers; portable distribution
bundles do not automatically acquire these exports.

## Boundaries that remain

- Creating a lock does not decide whether its sources are safe or reviewed.
- Someone who can replace both a lock and its sources can create matching
  malicious content. Protect/review the expected lock independently.
- Only the manifest and declared program sources are committed. The
  interpreter, host JavaScript, compiler, tooling dependencies and browser
  delivery are not covered by these digests.
- Undeclared catalogue programs and canonical on-disk `.wls` files outside the
  packaged source snapshot are not hashed.
- `package-run`, ordinary `run` and the current `test` command remain
  **unlocked** workflows. Select `package-run-locked` or `package-test-locked`
  explicitly for integrity-checked execution.
- There is no registry, download, installer, install hook, signature custody,
  general transitive dependency solver, live-service change or activation of
  operator-inaccessible privacy.

See [dependency manifests](wavelengthscript-package-manifests.md) and
[local tools](wavelengthscript-local-tools.md).

## Verification

`server/wls-package-lock.test.ts` checks independent Node SHA-256 agreement,
determinism, metadata/hash/source changes, strict schemas, crypto unavailability
and source changes during asynchronous hashing. The CLI tests exercise
creation/verification/locked execution in separate processes, failure status,
unchanged locks and refusal before input-file reading.

`server/wls-package-test-locked.test.ts` and
`scripts/wls-package-test-locked-cli.test.ts` cover locked suites, validation
before any execution, unused declared source verification, snapshot reuse
across asynchronous hashing and multiple cases, unchanged limits, safe
reports and real CLI success/failure statuses.
