# Internal dependency audit: 0.1.0–0.11.0

Date: 31 October 2026. Scope: the eleven repository-local `wls.collections`
releases, both bounded execution profiles, all 54 canonical programs,
manifests, source locks, test tooling, CLI isolation and portable distribution.
This is an internal engineering audit, not independent security certification.

## Findings and fixes

### 1. List interpreter could invoke input getters

**Severity: medium; direct JavaScript API boundary.**

The original list interpreter enumerated input values with `Object.entries`
and repeatedly read array elements while validating them. Ordinary property
getters could therefore run during input validation, or change their return
values between validation and snapshotting. JSON-only CLI inputs cannot
contain these accessors, but the exported JavaScript API also needed protection.

**Fixed:** require plain/null-prototype input records; inspect own data
descriptors without reading accessors; reject symbol register names, sparse
arrays, array accessors, extra array properties and array subclasses. Read
each accepted element once into an independent snapshot. Supported frozen
arrays and null-prototype records remain usable.

This matches the existing Map profile's data-boundary approach. It is not
a sandbox against arbitrary JavaScript supplied by a hostile host: proxies
can run reflection traps, and a compromised interpreter/host remains outside
the guarantee. Untrusted external data should enter through a serialized-data
boundary, not executable JavaScript objects.

### 2. Earlier library shortcuts skipped required operands

**Severity: medium; malformed-input correctness.**

Examples included `recipient.remove` accepting a non-string or missing query
on an empty list, and `map.intersection`, `map.difference`,
`set.intersection` and `set.difference` skipping right-operand checks when
the left input was empty. A skipped branch must not make an invalid API
argument valid.

**Fixed:** an exhaustive canonical-library input contract is checked against
the interpreter's safe input snapshot before execution. Every required list,
Map, string and integer argument is checked even when the algorithm would
otherwise return early. Missing registers fail explicitly.

Contracts bind to exact canonical source bytes. Identical-source aliases
must have identical contracts. Custom edited programs retain the generic
profile's opcode/type rules and must implement their own argument checks;
they do not inherit a standard-library API merely by resembling its source.

## Compatibility and distribution

- No versioned `.wls` source or generated source string was changed.
- Complete package-lock fingerprints for all eleven releases were captured
  before remediation and are checked after it.
- Existing exact-release surfaces, execution profiles, instructions, cycle
  limits, register limits, entry/string caps and Map memory budget remain.
- Valid library calls retain their results. Previously accepted malformed
  inputs now fail; this is intentional input-contract hardening.
- The protection is in the **host interpreter**, not the source digest.
  A source lock does not authenticate or pin the host/runtime implementation.
- Source-only interpreter distributions must include the new
  `wls-library-inputs.ts` module and its
  `wls-library-sources.generated.ts` dependency alongside the existing local
  dependencies, including `wls-library-compiler.ts`. Relocated-source fixtures
  were updated to exercise this.
  ESM/CommonJS bundles include these dependencies; they do not fetch them.
- Compiler validation and its shared error/limit definitions are separated
  from runtime ABI checks. The artifact generator uses the compiler-only
  path, so a missing generated artifact can be rebuilt without importing
  that missing artifact. Both rebuild and read-only check modes are tested.

No wallet, P2P authorization, privacy/key-recovery, database, live-media or
application-startup behavior was changed.

## Verification

Final verification:

| Check | Result |
| --- | --- |
| Server, library, CLI-isolation and distribution tests | 1,666 passed across 37 files |
| Browser-environment/component tests | 199 passed across 15 files |
| Project TypeScript and strict audit/tooling test type checks | Passed |
| Canonical generated-source consistency | Passed; no canonical source changes |
| Retained full-package lock fingerprints | All eleven matched |
| Extracted compiler function bodies | Identical to baseline except private Map table rename |
| Relative documentation links | 128 valid links across 22 documents |
| Patch whitespace checks | Passed |

The app preview was unavailable because the application workflow was stopped.
It was not started for this isolated dependency audit, so the running site was
not visually verified. Browser-environment tests are not physical phone tests.

The audit adds an independent contract oracle for all 54 programs, invalid
and missing arguments including empty-input shortcuts, getter non-execution,
strict list shapes, supported input compatibility and all eleven retained
lock fingerprints. Each release's declared APIs are also exercised through
package and locked-package execution.

Verification also includes the retained native algorithm/reference suites,
maximum-size resource tests, package/source tampering tests, guarded offline
CLI processes, malformed UTF-8/file handling and standalone/relocated
ESM/CommonJS distribution. These checks do not establish physical-device
compatibility, independent review or freedom from every possible defect.

## Broader scanner results outside this release audit

Dependency, static-code and privacy/dataflow scanners completed. None reported
a finding in `wls-*` code. Manual review nevertheless found the two issues
above; absence of scanner findings is not proof of correctness.

The wider repository scan reported four findings, not remediated or
independently triaged in this native-dependency audit:

| Area | Scanner severity | Location / subject |
| --- | --- | --- |
| npm dependency | Moderate | `minimatch` 10.2.6; scanner suggests major upgrade to 11.0.1 |
| Static code | Medium | Cryptographic algorithm warning in `scripts/check-disclosure-export.mjs` |
| Static code | Medium | Cookie/session warning in `server/founder-access.ts` |
| Dataflow | Low | Energy-budget stdout in `wnsp_v7/protocol.py` |

These are separate from the native package version numbers. Their applicability
and fixes need their own review; this audit does not silently change
authentication, Git object hashing, Python logging or major npm dependencies.

**Follow-up:** The [broader finding review](security-scanner-triage.md) upgrades
minimatch to its patched release and records the evidence for retaining the
other three warnings without suppressing scanner output. The table above is
the original audit snapshot, not the subsequent dependency-audit status.

See the [dependency index](wavelengthscript-dependencies.md) and
[source-lock boundaries](wavelengthscript-package-locks.md).
