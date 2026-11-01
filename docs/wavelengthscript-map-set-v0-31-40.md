# WavelengthScript collections 0.31.0–0.40.0

Ten repository-local dependency versions add 20 executable `WLS-MAP/1`
algorithms. Version 0.40.0 offers 106 Map/Set APIs; the full catalogue has
115 operations across the retained Map/Set and string-list profiles.

WavelengthScript already exists. This batch develops native dependency
libraries, not a new language, public package registry, complete application
rewrite or replacement for the host runtime. Each algorithm executes a real
`.wls` program. TypeScript bridges marshal inputs and check returned types;
they do not substitute JavaScript collection algorithms.

## Release contracts

Every release below retains the preceding Map/Set surface and adds exactly
two APIs. Earlier exact-version consumers cannot select later APIs. Versions
0.1.0 and 0.2.0 retain their separate string-list execution profile. Each of
the ten new example consumers selects only its two new APIs; applications
may explicitly declare other APIs supported by that release.

### 0.31.0 — select until an exact value

- `map.takeUntilValue(map, value)` retains the prefix **before** the first
  entry whose payload equals `value`. That matching entry is excluded.
- `map.dropUntilValue(map, value)` returns the suffix **including** that
  first matching entry and everything after it.
- If no entry matches, take returns all entries and drop returns an empty
  map. These are contiguous selections, not whole-map filters.

### 0.32.0 — matching value suffixes

- `map.takeLastWhileValue(map, value)` retains the final contiguous run of
  entries whose payloads exactly equal `value`.
- `map.dropLastWhileValue(map, value)` removes that run. Earlier matching
  entries remain if separated from the suffix by a mismatch.
- All-match input yields a full take and empty drop. A nonmatching final
  entry yields an empty take and full drop. The cut advances monotonically;
  this does not repeatedly restart a nested scan.

### 0.33.0 — retain entries with distinct values

- `map.distinctValuesFirst(map)` keeps the first original entry for every
  distinct exact value.
- `map.distinctValuesLast(map)` keeps the last original entry for every
  distinct exact value.
- Survivors retain their original keys, payloads and relative input order.
  Last-occurrence retention is not grouping by first value occurrence.
  Empty values are valid duplicates; empty keys are not absence sentinels.

### 0.34.0 — filter by value membership

- `map.filterByValueSet(map, right)` keeps entries whose payload occurs as a
  **key** in `right`.
- `map.rejectByValueSet(map, right)` keeps entries whose payload does not
  occur as a key in `right`.
- Right-hand payloads are ignored for membership. A right-hand Map is a
  bounded string-key membership set, not a list of its payloads. Original
  map keys, payloads and survivor order are preserved.

### 0.35.0 — dictionary value remapping

- `map.remapValues(map, right)` looks up each original payload as a key in
  `right`, replacing it with the dictionary value when present. Missing
  dictionary keys leave the original payload unchanged.
- `map.remapValuesOrDefault(map, right, fallback)` uses `fallback` for
  missing dictionary keys.
- A present dictionary key with an empty payload is a real replacement,
  not a missing lookup. Each original payload is translated **once**:
  replacements are not recursively translated, even for cyclic dictionaries.
  Map keys, size and insertion order do not change.

### 0.36.0 — order-sensitive equality

- `map.equalsOrdered(left, right)` requires identical entry counts and the
  same exact keys and payloads at each insertion-order position.
- `set.equalsOrdered(left, right)` compares key membership **and order**,
  ignoring payloads. Both operands must still be valid bounded Maps.
- These are distinct from the retained order-insensitive equality APIs.
  Empty operands compare equal. These comparisons are not constant-time
  cryptographic operations.

### 0.37.0 — directional change counts

- `map.countChangedEntries(left, right)` counts shared keys whose payload
  changed. Additions and removals are excluded.
- `map.countRemovedKeys(left, right)` counts left keys absent from right,
  irrespective of their payloads.
- Counts describe two local snapshots. They do not establish database
  transactions, authorization, synchronization or wallet settlement.

### 0.38.0 — first and last matching entries

- `map.findEntryByValue(map, value)` returns a Map containing the first
  matching original entry.
- `map.findLastEntryByValue(map, value)` returns the last matching original
  entry.
- No match returns an empty Map. A match returns exactly one entry. This
  representation distinguishes absence from an entry with an empty key
  and/or payload without inventing a sentinel string.

### 0.39.0 — contiguous key-membership prefixes

- `map.takeWhileKeyIn(map, right)` keeps the initial contiguous run of
  entries whose keys occur in `right`.
- `map.dropWhileKeyIn(map, right)` removes only that initial run.
- The first nonmember ends the run. Later matching keys are not gathered
  into the take or removed from the drop. Right-hand payloads are ignored.

### 0.40.0 — contiguous key-membership suffixes

- `map.takeLastWhileKeyIn(map, right)` keeps the final contiguous run of
  entries whose keys occur in `right`.
- `map.dropLastWhileKeyIn(map, right)` removes only that final run.
- The last nonmember determines the boundary. Earlier matching keys remain
  outside the suffix. All-member input yields full take and empty drop;
  a nonmember final key yields empty take and full drop.

## Execution limits and input rules

The existing limits are unchanged:

| Resource | Limit |
| --- | --- |
| Entries in one Map/Set | 20 |
| UTF-16 code units in one key/value/string operand | 256 |
| Compiled instructions | 128 |
| Executed cycles | 1,024 |
| Registers | 32 |
| Logical live-register memory | 65,536 bytes |

Every required operand is validated, including otherwise unused operands on
empty or no-op paths. Missing arguments, wrong types, duplicate keys, holes,
over-limit Maps and overlong strings fail explicitly.

All collection results are fresh, deeply frozen snapshots. Inputs are not
modified. Strings compare exactly, without case folding or Unicode
normalization. Prototype-like keys such as `__proto__` and `constructor` are
ordinary data keys, not object-property lookups.

No new opcode, interpreter permission, network fallback, installation hook,
execution profile or execution-budget increase was introduced. Source locks
commit to selected source and manifests; they do not authenticate the author,
pin the interpreter/host, or establish operator-inaccessible privacy.

## Use the actual packages

Each version has an exact consumer and four independently authored literal
examples under `scripts/fixtures/`. For example, using the installed Node
executable and CLI:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts package-check \
  scripts/fixtures/wls-map-set-package-v0-40.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts package-lock \
  scripts/fixtures/wls-map-set-package-v0-40.json > /tmp/wls-040.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts package-verify \
  scripts/fixtures/wls-map-set-package-v0-40.json /tmp/wls-040.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts package-test-locked \
  scripts/fixtures/wls-map-set-package-v0-40.json /tmp/wls-040.lock.json \
  scripts/fixtures/wls-map-set-v0-40-smoke.json
```

Replace `40` with any version from `31` through `40` to execute that consumer.
Lock verification fails on altered manifest bytes or selected source
commitments; it does not silently recreate mismatched locks.

Named host bridges are available from `shared/wls-map-library.ts` and
`shared/wls-set-library.ts`. Their marshal-only implementations are kept in
`shared/wls-map-batch-library.ts`. The Learn collection workspace includes
editable native source, inputs, execution traces and examples for all 20
new operations.

## Audit evidence

The implementation audit and production build completed before this guide
was linked into the public webpage or exported to GitHub.

- **Full database-free production build:** 10,612 tests passed across 259
  passing files. The 51 pre-existing skips across four files were unchanged.
  No tests or assertions were removed and no deadlines were increased.
- **82 new batch contract tests:** 1,920 independently expected reference
  scenarios execute through both native source and named host bridges.
  Additional cases cover every full-capacity cut, maximum UTF-16 payloads,
  empty/singleton inputs, all-match and alternating suffixes, no-op branches,
  and malformed or missing arguments.
- **Maximum live-register memory:** distinct-value retention and full-size
  remapping were exercised at maximum key/value lengths. No memory,
  instruction, register, entry or cycle cap was raised.
- **Ten real offline CLI pipelines:** each creates a lock, verifies it and
  executes all four literal cases under the existing process/network
  isolation guard. Guard readiness and drained successful exit are asserted.
- **Standalone ESM and CommonJS:** both bundles execute all 40 new literal
  fixture cases without network access.
- **Source locking:** all 40 consumer fingerprints are pinned. Earlier
  source commitments remain unchanged. Each new version rejects manifest
  byte changes and tampering with either new program commitment.
- **Compatibility and usability:** fixed cumulative surfaces, rejection of
  later APIs by every earlier Map release, immutable three-field dependency
  identities, ordinary and locked package execution, and all 20 new runnable
  learning-page examples passed.
- **Project safeguards:** TypeScript, canonical source generation,
  production bundle budgets, Wave Vault navigation, critical modulepreloads,
  startup guards, constitutional static checks and route-handler wiring
  passed. The entry chunk remained 34.0 KB gzip against its 35 KB limit.

The documentation CLI commands use the installed TypeScript runner, rather
than assuming bare Node resolves extensionless TypeScript module imports.

These results do **not** certify production database operations, the Python
suite, real-phone behavior, independent security clearance or native browser
worker execution of these new APIs. Browser-environment component tests are
not physical-device or native-worker tests. Existing large-chunk warnings
remain visible. No wallet action, merge, automatic merge or website
publication is implied by these results.
