# WavelengthScript dependency documentation

**Documentation disclosure snapshot: 31 October 2026.**

WavelengthScript already exists. This work develops its bounded native libraries
and dependency tooling; it does not claim that the whole application, its AI,
or all third-party dependencies have been rewritten in WavelengthScript.

## Scope and evidence

This documentation-only disclosure synchronises the guides below with the
development workspace. It does **not** synchronise every referenced source file,
test, fixture or build configuration into the GitHub default branch. Source
paths and commands in the guides describe the matching workspace implementation;
check the actual repository files before trying to run those commands.

Versions below identify exact **repository-local library contracts**, not
published registry packages. Documentation and a passing workspace test are not
proof that an equivalent implementation or check is present on a GitHub branch.

The development workspace reports 492 passing focused checks for the map
composition increment, plus TypeScript, generated-source consistency and
documentation-link checks. Coverage included retained releases, bounded native
execution, maximum payloads, overflow safety, input immutability, guarded offline
CLI execution, browser-environment tests and standalone Node ESM/CommonJS bundles.
This is workspace evidence, not a claim that GitHub CI, new physical-device
Safari tests or an independent security audit passed for this documentation PR.

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

The map profile is separate from the retained string-list profile. A higher
version does not mix interpreters or silently add programs to older manifests.
Retained source commitments and locks stay fixed; deliberate version/manifest
changes require a deliberate new lock.

## Complete guide index

### Foundations and implementation boundaries

- [Language positioning and conventional-computer scope](WAVELENGTHSCRIPT_POSITIONING.md)
- [Ecosystem inventory: implemented, host-backed and missing areas](wavelengthscript-ecosystem-inventory.md)
- [Recipient collection pilot and its application boundary](wavelengthscript-recipient-pilot.md)
- [Native collection execution profile, limits and semantics](wavelengthscript-native-collections.md)

### Native libraries and release contracts

- [Reusable string-list and recipient library](wavelengthscript-string-library.md)
- [Collection library 0.2.0: last-index search and list reversal](wavelengthscript-collections-v0-2.md)
- [Bounded maps 0.3.0: values, ordering, errors and resource budgets](wavelengthscript-maps-v0-3.md)
- [Map composition 0.4.0: merge, key intersection and key difference](wavelengthscript-map-composition-v0-4.md)

### Offline dependency and developer tooling

- [Local compiler and execution commands](wavelengthscript-local-tools.md)
- [Strict dependency manifests and exact local versions](wavelengthscript-package-manifests.md)
- [Exact-source integrity locks and verified-source execution](wavelengthscript-package-locks.md)
- [Repeatable library test suites](wavelengthscript-test-tools.md)

## Still outside the implemented scope

General module resolution, arbitrary package installation, richer/general maps,
Set values, general structured-data parsing, host/file/network capability
interfaces, a complete dependency replacement, a fully native AI and a
whole-application migration are not established by these guides. The inventory
distinguishes these gaps from the existing bounded implementations.

This disclosure does not create financial, privacy or deployment authority and
does not change research, attribution or licensing boundaries.
