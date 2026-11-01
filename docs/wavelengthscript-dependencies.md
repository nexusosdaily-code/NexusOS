# WavelengthScript dependency documentation

**Documentation disclosure snapshot: 1 November 2026.**

This workspace index can include additions beyond an earlier GitHub disclosure
snapshot. Updating it locally does not itself update GitHub, establish passing
remote checks or change the published application.

WavelengthScript already exists. This work develops its bounded native libraries
and dependency tooling; it does not claim that the whole application, its AI,
or all third-party dependencies have been rewritten in WavelengthScript.

## Scope and evidence

The latest local increment is [0.17.0: swapping and membership toggling](wavelengthscript-map-set-v0-17.md),
with real native programs, a full 60-API consumer and executable learning examples.

These guides describe the matching development workspace. Runnable releases
need their actual source, tests, fixtures and build configuration, not only
documentation. Source exports are reviewed through separate GitHub pull
requests; check the actual repository tree and CI for the commit you intend
to use. Workspace changes do not automatically update the default branch
or the published website.

Versions below identify exact **repository-local library contracts**, not
published registry packages. Documentation and a passing workspace test are not
proof that an equivalent implementation or check is present on a GitHub branch.

Recorded workspace verification at the completion of each dependency increment:

| Increment | Passing focused tests |
| --- | --- |
| Map composition 0.4.0 | 492 |
| Map-backed string Sets 0.5.0 | 623 |
| Map values and Set comparisons 0.6.0 | 736 |
| Full-entry comparisons and symmetric difference 0.7.0 | 854 |

These are historical results from different focused suites and workspace
snapshots, not additive totals or claims that every later change was tested.
The increments also passed TypeScript, generated-source consistency and
documentation-link checks. Coverage included retained releases and source
commitments, bounded native execution, maximum payloads, overflow safety,
input immutability, guarded offline CLI execution, browser-environment tests
and standalone Node ESM/CommonJS bundles.
This is workspace evidence, not a claim that GitHub CI, new physical-device
Safari tests or an independent security audit passed for this documentation PR.

The **0.8.0–0.9.0 increment** was verified together: **1,291 server/tooling
tests across 31 files and 83 browser-environment tests across eight files**.
The initial broad run found an outdated independent distribution asset inventory;
after adding the seven new native filenames, all 43 tests in that affected suite
passed on a focused rerun. The other 30 server/tooling suites remained passing.
TypeScript (including strict checks for the new server tests), canonical-source
artifact consistency and 109 relative documentation links also passed.
These are workspace checks, not GitHub CI or physical-device certification.

For **0.10.0**, targeted dependency verification passed **1,118 server/tooling
tests across 30 files and 88 browser-environment tests across nine files**,
including retained releases, guarded offline package CLI execution and
standalone/relocated distribution. TypeScript, strict checks for the new
server tests, canonical-source artifact consistency and 117 relative
documentation links also passed. This was a focused dependency run, not a
claim that the entire project's `test:all`, GitHub CI or physical-device
checks passed. The unauthenticated preview rendered the sign-in screen;
the signed-in learning UI was not visually verified.

For **0.11.0**, focused verification passed **1,207 server/tooling tests in
32 files and 151 browser-environment tests in 12 files**, including the
merged conditional/ordered-selection learning examples. Exact-release
surfaces, the retained 0.10.0 lock fingerprint, offline CLI processes and
standalone ESM/CommonJS bundles passed. TypeScript, strict new-server-test
checks, canonical-source consistency and 125 relative links also passed.
This is not a full-project, GitHub CI or physical-device certification.
The application was not running, so its signed-in UI was not visually
verified; no application startup was performed for this dependency-only work.

No live P2P, wallet, authentication, private-storage or tracking behavior is
changed by this disclosure. Privacy engineering remains a separate, unfinished
workstream. Neither bounded execution nor a source hash proves operator-
inaccessible secrecy, author authenticity or complete runtime integrity.
No new physical photonic execution or speed advantage is asserted.

## Exact library releases

| Local dependency | Execution profile | Fixed program surface |
| --- | --- | --- |
| `wls.collections` 0.1.0 | `WLS-COLLECTION/1` | Original seven string/recipient programs |
| `wls.collections` 0.2.0 | `WLS-COLLECTION/1` | Those seven plus `string.lastIndexOf` and `string.reverse` |
| `wls.collections` 0.3.0 | `WLS-MAP/1` | Eight bounded string-to-string map programs |
| `wls.collections` 0.4.0 | `WLS-MAP/1` | Those eight plus `map.merge`, `map.intersection` and `map.difference` |
| `wls.collections` 0.5.0 | `WLS-MAP/1` | Those eleven Map programs plus ten map-backed string-key Set programs |
| `wls.collections` 0.6.0 | `WLS-MAP/1` | Those 21 programs plus three Map value operations and three Set comparisons |
| `wls.collections` 0.7.0 | `WLS-MAP/1` | Those 27 programs plus four full-entry Map operations and Set symmetric difference |
| `wls.collections` 0.8.0 | `WLS-MAP/1` | Those 32 programs plus fallback reads and two conditional Map updates |
| `wls.collections` 0.9.0 | `WLS-MAP/1` | Those 35 programs plus ordered take/drop for Maps and map-backed string Sets |
| `wls.collections` 0.10.0 | `WLS-MAP/1` | Those 39 programs plus value membership, match counting and first-key lookup with fallback |
| `wls.collections` 0.11.0 | `WLS-MAP/1` | Those 42 programs plus matching-value replacement, first-key inversion and unique value Sets |
| `wls.collections` 0.12.0 | `WLS-MAP/1` | Those 45 programs plus last-key lookup and first/last matching-value replacement |
| `wls.collections` 0.13.0 | `WLS-MAP/1` | Those 48 programs plus strict indexed value reads and key/value indexed reads with fallbacks |
| `wls.collections` 0.14.0 | `WLS-MAP/1` | Those 51 programs plus key/member position queries and Set indexed reads with a fallback |
| `wls.collections` 0.15.0 | `WLS-MAP/1` | Those 54 programs plus native ordered Map/Set offset-and-count slices |
| `wls.collections` 0.16.0 | `WLS-MAP/1` | Those 56 programs plus collision-safe Map key and Set member renaming |

The map profile is separate from the retained string-list profile. A higher
version does not mix interpreters or silently add programs to older manifests.
Retained source commitments and locks stay fixed; deliberate version/manifest
changes require a deliberate new lock.

## 0.12.0 workspace verification

The combined dependency regression run covered 1,882 tests across 49
server/tooling and browser-environment files. Its three failures were outdated
negative tests that treated 0.12.0 as unsupported. After correcting those
expectations, all 59 tests in the affected three files passed on rerun.
Type checking, strict new-test type checking, generated-source consistency,
offline CLI tests and standalone ESM/CommonJS bundle tests passed.
The retained-release audit also pins the new 0.12.0 lock fingerprint.

The public landing-page preview loaded; signed-in UI and physical devices
were not tested for this library-only release. These counts describe the
specific runs, not full-project or independent security clearance.

## 0.13.0 workspace verification

The complete dependency regression selection passed: **2,076 tests across 52
server/tooling and browser-environment files**. This includes retained-release
source fingerprints through 0.13.0, indexed-read boundaries, malformed operands,
maximum-size Maps, offline CLI execution, relocated source distributions and
standalone ESM/CommonJS bundles.

Project type checking, strict new-server-test type checking, generated-source
consistency, whitespace checks and 70 relative links across the updated
documentation passed. The public landing-page preview loaded. Signed-in UI and
physical devices were not verified for this library-only release; this is not
full-project or independent security clearance.

## 0.14.0 workspace verification

The complete dependency regression selection passed: **2,237 tests across 55
server/tooling and browser-environment files**. Coverage includes independent
ordered-membership references, malformed and missing operands, ignored Set
payloads, extreme indices, maximum-sized inputs, retained source fingerprints
through 0.14.0, offline CLI, relocated sources and standalone ESM/CommonJS
bundles.

Project type checking, strict new-server-test type checking, generated-source
consistency, whitespace checks and 74 relative documentation links passed.
The application development server was stopped, so the preview could not be
captured. No signed-in UI or physical-device verification is claimed for this
library-only release; this is not independent security clearance.

## 0.15.0 workspace verification

The clean completed-batch dependency selection passed: **2,413 tests across
58 server/tooling and browser-environment files**. This includes all 243
standalone CLI isolation cases, window reference/boundary tests, immutable
results, retained source fingerprints through 0.15.0, offline CLI, relocated
sources and standalone ESM/CommonJS bundles.

Project type checking, strict new-server-test type checking, generated-source
consistency, whitespace checks and 78 relative documentation links passed.
The public landing-page preview loaded. Signed-in UI and physical devices
were not verified for this library-only release.

Historical 0.15.0 checkpoint: an earlier full-project `test:all` run overlapped active edits and failed 41
CLI lifecycle assertions in `scripts/wls-package-isolation.test.ts`. That
entire file passed in the clean dependency run above. The separate full-project
workflow and its subsequent chained checks had not been rerun at that checkpoint.
For the later completed production-build and typecheck results, see the
[0.1.0–0.15.0 dependency audit](wavelengthscript-dependency-audit-0-1-to-0-15.md).
Neither checkpoint is an independent security clearance.

## Complete guide index

- [Working-package audit and usability remediation, releases 0.1.0–0.15.0](wavelengthscript-dependency-audit-0-1-to-0-15.md).
- Public disclosure: `/wavelengthscript-dependencies.html`, generated from this index and all linked guides. Check with `npm run check:wls-dependency-guide`.

- [Wider project audit and rerun, 1 November 2026](wavelengthscript-project-audit-2026-11-01.md) — Python blocker repaired: 399 Python tests and the fresh full build gate pass.

### Foundations and implementation boundaries

- [Language positioning and conventional-computer scope](WAVELENGTHSCRIPT_POSITIONING.md)
- [Internal audit and remediation of releases 0.1.0–0.11.0](wavelengthscript-release-audit.md)
- [Ecosystem inventory: implemented, host-backed and missing areas](wavelengthscript-ecosystem-inventory.md)
- [Recipient collection pilot and its application boundary](wavelengthscript-recipient-pilot.md)
- [Native collection execution profile, limits and semantics](wavelengthscript-native-collections.md)

### Native libraries and release contracts

- [Reusable string-list and recipient library](wavelengthscript-string-library.md)
- [Collection library 0.2.0: last-index search and list reversal](wavelengthscript-collections-v0-2.md)
- [Bounded maps 0.3.0: values, ordering, errors and resource budgets](wavelengthscript-maps-v0-3.md)
- [Map composition 0.4.0: merge, key intersection and key difference](wavelengthscript-map-composition-v0-4.md)
- [Map-backed string Sets 0.5.0: unique membership and Set algebra](wavelengthscript-sets-v0-5.md)
- [Map values and Set comparisons 0.6.0](wavelengthscript-map-set-v0-6.md)
- [Full-entry Map comparisons and Set symmetric difference 0.7.0](wavelengthscript-map-set-v0-7.md)
- [Conditional Map operations 0.8.0](wavelengthscript-map-set-v0-8.md)
- [Ordered Map and Set selection 0.9.0](wavelengthscript-map-set-v0-9.md)
- [Map value queries 0.10.0](wavelengthscript-map-set-v0-10.md)
- [Map value transformations 0.11.0](wavelengthscript-map-set-v0-11.md)
- [Ordered Map value operations 0.12.0](wavelengthscript-map-set-v0-12.md)
- [Indexed Map reads 0.13.0](wavelengthscript-map-set-v0-13.md)
- [Ordered membership queries 0.14.0](wavelengthscript-map-set-v0-14.md)
- [Ordered Map/Set slices 0.15.0](wavelengthscript-map-set-v0-15.md)
- [Collision-safe Map/Set renaming 0.16.0](wavelengthscript-map-set-v0-16.md)

## 0.16.0 build and internal audit

The collision-safe renaming increment passed a clean production build with
**9,126 tests passing and 51 pre-existing skips unchanged**, plus TypeScript,
generated-source, bundle-budget, navigation, preload and startup-artifact
checks. The release has 103 direct behavior/boundary tests and three offline
CLI / standalone bundle tests. The independent distribution asset inventory
was extended to require both new real `.wls` programs. See the
[0.16.0 guide](wavelengthscript-map-set-v0-16.md) for complete evidence, failed-run
history and limits. No new interpreter permissions or live P2P changes.

### Offline dependency and developer tooling

- [Local compiler and execution commands](wavelengthscript-local-tools.md)
- [Strict dependency manifests and exact local versions](wavelengthscript-package-manifests.md)
- [Exact-source integrity locks and verified-source execution](wavelengthscript-package-locks.md)
- [Repeatable library test suites](wavelengthscript-test-tools.md)

## Still outside the implemented scope

General module resolution, arbitrary package installation, richer/general Maps,
general Set values and list-to-Set conversion, general structured-data parsing,
host/file/network capability interfaces, a complete dependency replacement, a fully native AI and a
whole-application migration are not established by these guides. The inventory
distinguishes these gaps from the existing bounded implementations.

This disclosure does not create financial, privacy or deployment authority and
does not change research, attribution or licensing boundaries.
