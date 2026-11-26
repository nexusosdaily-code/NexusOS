# Publishing build correction — 27 November 2026

This supplements the [WLS achievements and trust roadmap disclosure](nexusos-wls-verifier-disclosure.md). It does not change the accepted offline workflow evidence or claim a new production release.

## What failed

The attempted website publish stopped during its build-time regression checks. The run reported 12,730 passing tests, 67 skipped tests and one failure in the collection-renaming watchdog suite.

The failing native browser fixture reported `Cannot read properties of null (reading 'useState')` before reaching its intended teardown-hang condition. Its entry and the imported application component resolve dependencies from different workspace roots. Separate React installations can give the renderer and component different hook dispatchers. A linked local installation can conceal this difference.

## Correction and regression protection

The fixture's Vite configuration explicitly deduplicates `react` and `react-dom`. This changes test dependency resolution, not WLS execution, receipt authority, financial behavior or application permissions.

A new regression check constructs two physical React package copies. Its control must observe two resolved React instances without deduplication; with the fixture's actual deduplication setting it must observe one. The existing native watchdog assertions, process cleanup checks and deadlines remain unchanged. No failing test was skipped and no release gate was removed.

## Verification and its scope

After the correction:

- Both original native watchdog tests passed.
- The duplicate-install regression check passed.
- The complete workspace publishing build, `npm run build:publish`, exited successfully: 388 test files passed and four were skipped; 12,732 tests passed and 67 were skipped.
- Client and server packaging, bundle-size limits, Wave Vault navigation, critical module preloads and the startup-artifact safety check passed.

Those full-build totals describe the corrected development workspace, not a clean build of every historical GitHub revision. The focused GitHub change must retain its own remote-tree dependency checks and current-head CI results. A passing workspace build is not evidence that GitHub merged the change or that the website was republished.

## Public and private boundaries

This correction includes no raw recordings, private proofs, credentials, account records or agent memory. It neither restarts Bluetooth work nor changes the disclosed limits on independent distribution, authoritative history or trustlessness.
