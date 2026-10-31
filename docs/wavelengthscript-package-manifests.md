# Repository-local WavelengthScript dependency manifests

`WLS-PACKAGE/1` adds explicit dependency declarations for programs using the
`WLS-COLLECTION/1` library and the separate `WLS-MAP/1` map release. It is a tooling manifest, **not** a change
to the language instruction format or a general package installer.

The initial repository-local library identity is `wls.collections` at `0.1.0`.
This is not an npm publication, registry listing or assertion that the library
is complete. The version labels the current local collection dependency.

## Check and run the example

```sh
npm run check:wls-library
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-check scripts/fixtures/wls-collection-package.json
node_modules/.bin/tsx scripts/wls-collections-cli.ts package-run scripts/fixtures/wls-collection-package.json string.contains scripts/fixtures/wls-package-inputs.json
```

The check prints resolved, immutable metadata. The run returns `true` for the
example inputs. Add `--trace` after the input file to inspect visited
instructions. Errors exit with status `1`; success exits with status `0`.

## Manifest format

```json
{
  "profile": "WLS-PACKAGE/1",
  "name": "example.collection-consumer",
  "version": "0.1.0",
  "executionProfile": "WLS-COLLECTION/1",
  "dependencies": {"wls.collections":"0.1.0"},
  "programs": ["string.contains","string.concat","recipient.count"]
}
```

All six fields are required; unknown fields are rejected.

- `name`: lowercase ASCII letters/digits, with single dot/hyphen separators,
  beginning with a letter, at most 64 characters. A consumer cannot use the
  dependency's own name.
- `version`: the consumer's exact `major.minor.patch`, with each component
  between 0 and 999999 and no leading zeroes except `0` itself. No ranges,
  prerelease/build suffixes or tags in this initial format.
- `executionProfile`: `WLS-COLLECTION/1` for 0.1.0/0.2.0, or `WLS-MAP/1`
  for the map-only 0.3.0/0.4.0 or Map + string-key Set 0.5.0/0.6.0/0.7.0 releases.
  The dependency and source profile must match.
- `dependencies`: exactly the supported local library and its exact version.
  Unknown dependencies, ranges, mismatched versions, paths and URLs fail.
- `programs`: a nonempty, duplicate-free subset of the chosen release's fixed
  catalogue IDs. Declaration order is preserved.

Release 0.1.0 provides `string.contains`, `string.indexOf`, `string.concat`,
`recipient.add`, `recipient.remove`, `recipient.count` and `recipient.at`.
Release 0.2.0 retains those seven and adds `string.lastIndexOf` and
`string.reverse`. Release 0.3.0 provides a **separate map-only surface** in
`WLS-MAP/1`; see [bounded maps 0.3.0](wavelengthscript-maps-v0-3.md) for its
eight program IDs, entry format and limits. These retained exact versions are
supported locally; no ranges or
automatic upgrades are accepted. The original manifest example remains valid,
and unchanged old locks do not need to be regenerated.
Release 0.4.0 retains the eight map IDs and adds `map.merge`,
`map.intersection` and `map.difference`, under the same bounded map profile.
See [map composition 0.4.0](wavelengthscript-map-composition-v0-4.md).
Old exact-version manifests do not gain these programs automatically.

Release 0.5.0 retains the eleven Map programs and adds ten map-backed
string-key Set programs, still under `WLS-MAP/1`. See
[bounded string Sets 0.5.0](wavelengthscript-sets-v0-5.md). It does not add a
new Set interpreter, mix the string-list profile or upgrade old manifests.

Release 0.6.0 retains all 21 Map/Set programs and adds `map.filterByValue`,
`map.rejectByValue`, `map.invertLast`, `set.isSubset`, `set.isDisjoint` and
`set.equals`, for 27 programs under the unchanged Map profile.
See [Map values and Set comparisons 0.6.0](wavelengthscript-map-set-v0-6.md),
including the explicit lossy last-key policy for inversion.

Release 0.7.0 retains the 27 prior Map/Set programs and adds `map.equals`,
`map.isSubmap`, `map.intersectionEntries`, `map.differenceEntries` and
`set.symmetricDifference`, for 32 programs under the unchanged Map profile.
See [entry comparisons and exclusive Set members 0.7.0](wavelengthscript-map-set-v0-7.md).
Entry comparison does not change the older key-only intersection/difference.

See [collection library 0.2.0](wavelengthscript-collections-v0-2.md) for
new-release fixtures and a locked test command.
A valid catalogue ID is still refused if the consumer did not declare it.
All declared program sources are compiled before any program is executed.

Manifest text is limited to 8,192 UTF-16 code units. The CLI uses bounded,
strict UTF-8 regular-file reads, the existing 16,384-character JSON input limit,
and unchanged VM resource/type limits. It validates the manifest and selected
program before reading the explicitly selected input file.

## Reuse and boundaries

`shared/wls-package.ts` exports:

- `resolveCollectionPackage(text)` — validate requirements and return deeply
  frozen metadata.
- `getCollectionPackageProgramSource(text, id)` — resolve only a declared
  catalogue program to its packaged source.
- `executeCollectionPackageProgram(text, id, inputs)` — resolve source afresh
  and run it through the existing bounded interpreter.

These are TypeScript bootstrap APIs usable by Node/browser bundlers; they are
not yet additional exports in separately built portable distribution bundles.
There are no install scripts, remote fetches, dynamic host-code imports,
filesystem instructions, wallet effects or application startup.

This declaration check is not an OS sandbox or account permission system.
Host JavaScript can still call other host APIs directly. Existing application
authorization and financial safeguards remain authoritative.

An exact version label is **not a cryptographic source lock or signature**.
The separate [source-integrity lock workflow](wavelengthscript-package-locks.md)
now supplies hashes and explicit locked execution. Ordinary `package-run`
remains unlocked. Neither workflow supplies a transitive dependency graph,
semver solver, downloads, signatures or an independent trust system.
Run `check:wls-library` to detect stale generated source.

## Verification

`server/wls-package.test.ts` covers exact-version requirements, strict manifests,
unknown/undeclared programs, frozen metadata, compile-before-execute validation
and unchanged VM limits. `scripts/wls-package-cli.test.ts` covers the real CLI,
input-file ordering, returned traces, unchanged files and process exit codes.

See [local tools](wavelengthscript-local-tools.md),
[library test suites](wavelengthscript-test-tools.md) and
[reusable collection programs](wavelengthscript-string-library.md).
