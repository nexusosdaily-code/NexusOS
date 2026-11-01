# WavelengthScript collections 0.19.0–0.30.0

Twelve repository-local dependency versions add 24 real `WLS-MAP/1`
algorithms. Version 0.30.0 offers 86 Map/Set APIs; the full catalogue has 95
operations across the retained Map/Set and string-list profiles.

The language already exists. These are dependency implementations, not a new
language, package registry or whole-application rewrite. Algorithms execute
native `.wls` instructions; TypeScript bridges only marshal inputs and validate
result types. No new opcode, I/O permission, download fallback or execution
budget was added.

## Release contracts

Every version below retains the preceding Map/Set surface and adds exactly the
two named APIs. Earlier versions cannot select later APIs. The original 0.1.0
and 0.2.0 string-list releases keep their separate execution profile.

### 0.19.0 — move existing entries first

- `map.moveToFront(map, key)` moves an existing entry to the first position,
  preserving its payload and the relative order of other entries.
- `set.moveToFront(set, value)` moves an existing member first and returns
  canonical empty payloads.
- Missing members are not inserted. Already-first and empty cases return
  fresh immutable snapshots without changing membership.

### 0.20.0 — contiguous value prefixes

- `map.takeWhileValue(map, value)` keeps the initial contiguous entries whose
  values exactly equal `value`; it stops at the first mismatch.
- `map.dropWhileValue(map, value)` removes that prefix and retains everything
  after it, including any later matches.
- These are prefix operations, not whole-map filtering. All-match input yields
  the whole map for take and an empty map for drop.

### 0.21.0 — tail selection

- `map.takeLast(map, count)` returns the final `count` entries in original order.
- `set.takeLast(set, count)` returns the final members with empty payloads.
- Counts are safe integers clamped to `[0, size]`. Negative or zero takes
  nothing; counts beyond size take everything. Even a maximum safe integer
  does not cause a count-sized loop.

### 0.22.0 — tail removal

- `map.dropLast(map, count)` removes the final `count` entries.
- `set.dropLast(set, count)` removes final members and canonicalizes payloads.
- Counts use the same clamping as 0.21.0. Negative or zero removes nothing;
  counts beyond size remove everything.

### 0.23.0 — value positions

- `map.indexOfValue(map, value)` returns the first matching value's zero-based
  insertion-order position, or `-1` when absent.
- `map.lastIndexOfValue(map, value)` returns the last such position, or `-1`.
- Values compare exactly; empty strings are present values, not absence.
  The last-position algorithm advances its saved index monotonically, avoiding
  repeatedly restarting an inner scan on all-match inputs.

### 0.24.0 — map overlap counts

- `map.countCommonKeys(left, right)` counts keys present in both maps,
  regardless of values.
- `map.countMatchingEntries(left, right)` counts keys whose values also match.
- Neither constructs an intermediate intersection. Absent keys are not equal
  to present keys carrying empty strings.

### 0.25.0 — value uniqueness

- `map.countDistinctValues(map)` counts distinct exact value strings.
- `map.hasDuplicateValues(map)` reports whether at least two entries share a
  value. Empty and singleton inputs return false.
- A bounded native Map tracks seen values; no host-language algorithm or
  Unicode normalization is substituted.

### 0.26.0 — targeted value deletion

- `map.deleteFirstValue(map, value)` removes only the first matching entry.
- `map.deleteLastValue(map, value)` removes only the last matching entry.
- All other entries retain order and values. Missing matches return an
  unchanged-content copy. A present empty key is not a missing-match sentinel.

### 0.27.0 — intersection and union cardinality

- `set.intersectionSize(left, right)` counts common members.
- `set.unionSize(left, right)` counts distinct members across both inputs.
- Payloads do not affect membership. Scalar union size may be 40 for two
  disjoint 20-entry inputs; no over-limit 40-member Set is constructed.

### 0.28.0 — exclusive-member cardinality

- `set.differenceSize(left, right)` counts left-only members; it is directional.
- `set.symmetricDifferenceSize(left, right)` counts members appearing on exactly
  one side. This scalar may also reach 40 without creating a collection.

### 0.29.0 — controlled merges

- `map.mergeIfAbsent(left, right)` retains all left entries and values, then
  appends right entries whose keys were absent from left, in right order.
  A result exceeding 20 entries explicitly fails; inputs remain unchanged.
- `map.mergeExisting(left, right)` replaces values only for keys already in
  left, preserving left membership and order. Right-only keys are ignored.
- Both validate both operands even if one is empty. Maximum-size overlapping
  maps with changed maximum-length values remain within the existing budget.

### 0.30.0 — value-checked immutable updates

- `map.replaceEntryIfValue(map, key, expected, replacement)` replaces an existing
  entry's payload only when its current value exactly matches `expected`.
- `map.deleteEntryIfValue(map, key, expected)` removes that entry only on a match.
- Missing keys and mismatches return fresh unchanged-content snapshots.
  All arguments, including replacement on a no-op path, must be valid.
- These operate on local immutable snapshots. They are **not** atomic
  compare-and-swap on database rows, wallet authorization or concurrency locks.

## Common limits and semantics

Inputs contain dense unique string-key entries, not JavaScript object-property
maps. Empty strings, `__proto__`, `constructor`, Unicode and visually similar
but differently encoded strings are ordinary exact data.

Limits remain 20 entries per collection, 256 UTF-16 code units per key/value,
128 instructions per source, 1,024 execution cycles, 32 registers and 65,536
logical live-register bytes. All live operands and temporaries count toward
memory. Logical accounting is not a host-heap or performance guarantee.

Returned collections are fresh, deeply frozen snapshots. Inputs do not mutate.
Set outputs use empty string payloads. Required operands are checked before
empty/no-op shortcuts; malformed, sparse, duplicate-key, overlong or oversized
inputs fail explicitly. Safe integer counts can be negative; fractions,
non-finite numbers and unsafe integers fail.

## Source, consumers and executable examples

Canonical sources are the identically named files in `shared/wls-library/map/`
and `shared/wls-library/set/`. Named host bridges are in
`shared/wls-map-library.ts` and `shared/wls-set-library.ts`.

Each version has a real `WLS-PACKAGE/1` consumer:
`scripts/fixtures/wls-map-set-package-v0-N.json`, where N is 19 through 30.
Versions 19–29 intentionally declare their two new APIs, demonstrating
least-privilege selection. Version 30 declares all 86 Map/Set APIs.
The compatibility audit additionally resolves each intermediate version's full
cumulative surface and proves older versions reject future APIs.

Each matching `wls-map-set-v0-N-smoke.json` contains four independently written
literal expected examples, not VM-generated expected outputs. The Learn
workspace offers source-editable examples for both APIs in every version.

For example, run from the repository root using the existing pinned toolchain:

```sh
npm run check:types
npm run check:wls-library
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-30.json > collections.lock.json
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-verify scripts/fixtures/wls-map-set-package-v0-30.json collections.lock.json
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-30.json \
  collections.lock.json scripts/fixtures/wls-map-set-v0-30-smoke.json
```

Replace N for the other versions. Review and retain trusted locks; never
regenerate them just to conceal a mismatch. Locks commit manifest and source
content, not author identity or the interpreter/host implementation.

## Audit evidence and disclosure boundary

Internal batch audit completed on 1 November 2026, before linking this disclosure:

- Full database-free production build passed: **10,388 tests across 257 passing
  files**, with **51 pre-existing skips across four files unchanged**.
  Database and Python suites are not included in this command's result.
- All 99 new batch contract tests passed, including 2,304 seeded reference
  scenarios checked through both `.wls` execution and the named host bridges.
- All 12 guarded offline lock/verify/test-locked CLI pipelines passed, as did
  standalone ESM and CommonJS bundles executing all 48 literal examples.
- All 24 new Learn examples executed with independently expected output.
  The complete compatibility matrix passed at per-operation granularity.
- All 30 retained package manifests have pinned lock fingerprints. The earlier
  fingerprints and released native source files remain unchanged. Tests reject
  changed manifests or either new program commitment for each added version.
- The audit caught and fixed a batch release-descriptor error: allowed-program
  metadata is kept separate from the stable three-field dependency identity
  consumed by source locks. Ordinary execution alone did not reveal that error.
- TypeScript, generated-source consistency, bundle limits, navigation, critical
  preloads, startup-artifact safety, handler wiring and constitutional static
  checks passed.
- No placeholders, new skips, removed assertions, raised timeouts or expanded
  execution budgets were used. Existing large-chunk build warnings remain
  visible; they do not represent a failed build.

The audit includes 96 independent seeded reference cases for each of the 24
operations through both native execution and its named host bridge. It exercises
every full-capacity position with maximum key/value lengths, malformed operands
on no-op paths, empty/singleton inputs, repeated values and absent keys.
Additional checks cover the all-match search cycle budget, disjoint 40-member
scalar cardinalities, explicit merge overflow, full-size changed-value merges,
48 literal fixture outputs, per-version locked execution and tampering, offline
CLI pipelines, standalone ESM/CommonJS bundles and all 24 Learn examples.

The cumulative compatibility matrix is organized by operation within each
consumer package, retaining all previous examples/assertions and the existing
five-second per-test deadline. An 86-API package is not treated as one unbounded
test or made to pass by raising deadlines.

This is internal engineering evidence, not independent security certification,
physical-device or native-worker certification of these new APIs, privacy
clearance, a financial migration or experimental proof of photonic computation.
Local results do not establish GitHub CI, owner merge or publication.
