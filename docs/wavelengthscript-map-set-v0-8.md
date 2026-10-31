# Conditional Map operations: local dependency 0.8.0

Exact `wls.collections` **0.8.0** retains the 32 programs from 0.7.0 and
adds three native `.wls` operations. The fixed surface is **35 programs:
21 Map operations and 14 map-backed string Set operations**.

This uses the existing `WLS-MAP/1` interpreter. There is no new opcode,
value type, permission, installer or resource-budget increase. All earlier
exact release surfaces and source commitments remain fixed.

## Contract

| Program | Required inputs | Result |
| --- | --- | --- |
| `map.getOrDefault` | `map`, `key`, `fallback` | Present value, otherwise the supplied string fallback |
| `map.setIfAbsent` | `map`, `key`, `value` | Append a missing key; preserve an existing entry |
| `map.replaceIfPresent` | `map`, `key`, `value` | Replace a present value in place; do not insert a missing key |

Every key, value and fallback is a bounded string. Present empty strings are
not missing. Comparisons are exact, without normalization, coercion, locale
rules or prototype-property lookup. Empty, Unicode, numeric-looking and
prototype-like strings are ordinary data.

All required inputs are validated even when a branch would not use them.
A non-string fallback is rejected even for a present key; an invalid candidate
value is rejected even for a no-op update. Missing inputs are errors, not
implicit defaults. The original `map.get` still rejects absent keys.

Updates preserve insertion order. Insertion appends only a genuinely missing
key; replacement keeps its original position. Update results, including no-op
results, are independent deeply frozen snapshots. Neither success nor failure
modifies the caller's input or previously returned results.

Inserting a new key into a full 20-entry Map fails explicitly. Replacing or
leaving an entry unchanged in a full Map succeeds. Maximum-length keys and
values remain supported under the unchanged aggregate register-memory budget.
No result is silently truncated.

These are immutable, local collection algorithms, **not shared-state atomic
updates, database transactions, compare-and-swap, authorization or wallet
operations**. The fallback is a supplied value, not a lazy callback.

## Bridges, manifests and locks

```ts
import {
  mapGetOrDefault, mapSetIfAbsent, mapReplaceIfPresent,
} from "./shared/wls-map-library";

const input = { entries: [["a", ""]] as [string, string][] };
mapGetOrDefault(input, "a", "fallback"); // ""
mapGetOrDefault(input, "b", "fallback"); // "fallback"
mapSetIfAbsent(input, "a", "new");      // [["a", ""]]
mapReplaceIfPresent(input, "b", "new"); // [["a", ""]]
```

The last two comments abbreviate the returned `{ entries: [...] }` structure.
Host bridges only marshal values; the algorithms execute canonical files in
`shared/wls-library/map/`. Portable generated source and the direct Node
source loader must match those files exactly.

`MAP_SET_V0_8_PROGRAM_IDS` fixes the surface;
`MAP_SET_V0_8_LIBRARY_RELEASE` names the exact local release. Earlier manifests
do not gain these IDs automatically. A consumer must explicitly select 0.8.0
and declare each operation it needs. The string-list profile remains separate.

The complete example manifest is
`scripts/fixtures/wls-map-set-package-v0-8.json`. Its corresponding
`wls-map-set-v0-8-smoke.json` suite contains twelve cases spanning all three
additions, validation failures and retained behavior.

Choose a new lock path; do not overwrite an existing trusted lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-8.json > native-conditions.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-8.json \
  native-conditions.lock.json scripts/fixtures/wls-map-set-v0-8-smoke.json
```

Source locks commit to the exact declared source snapshots and manifest.
They do not authenticate authors or verify the host/interpreter. Upgrading
requires an intentional new manifest and lock; mismatches never trigger
automatic relocking.

Verification covers independent reference behavior, empty/Unicode keys,
malformed operands, unused argument validation, maximum-size inputs, overflow,
immutability, retained lock fingerprints, guarded offline CLI processes and
standalone ESM/CommonJS bundles. Browser-environment tests are not physical
Safari/device verification or independent security clearance.

This is repository-local dependency work, not a registry publication, GitHub
merge or application rollout. No live P2P, funds, private storage, authentication
or tracking behavior changes.

See [0.7.0](wavelengthscript-map-set-v0-7.md),
[ordered selection 0.9.0](wavelengthscript-map-set-v0-9.md),
[the dependency index](wavelengthscript-dependencies.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
