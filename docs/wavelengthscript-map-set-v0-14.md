# Ordered membership queries: local dependency 0.14.0

Exact `wls.collections` **0.14.0** retains all 51 programs from 0.13.0 and
adds three native `.wls` algorithms. Its fixed surface contains **54 programs:
35 Map operations and 19 map-backed string Set operations**, using the
unchanged `WLS-MAP/1` interpreter and limits.

| Program | Required inputs | Result |
| --- | --- | --- |
| `map.indexOfKey` | `map`, `key` | Zero-based insertion-order key position, or `-1` if absent |
| `set.indexOf` | `set`, `value` | Zero-based member position, or `-1` if absent |
| `set.atOrDefault` | `set`, `index`, `fallback` | Member at that position, or the required string fallback |

## Semantics and validation

Positions follow input insertion order, not sorting or JavaScript object-key
enumeration. Position zero and empty-string members are valid matches.
Map/Set keys are the members; valid string payloads are intentionally ignored
by Set queries. Looking for a string that occurs only as a payload returns
`-1`, unless it also exists as a member.

Comparisons are exact UTF-16 string comparisons: no normalization, case
folding, trimming, coercion or prototype-property lookup. Query strings are
required and bounded, even on empty containers. Inputs remain unchanged.

For `set.atOrDefault`, indices must be safe integers. Negative indices,
past-the-end positions and empty Sets return the fallback. Negative zero
selects position zero. Indices are not wrapped or clamped; negative indices
are not offsets from the end. Fractions, unsafe integers, infinities, `NaN`,
strings, booleans and missing indices fail instead of selecting a fallback.
The fallback must be a bounded string even when a member exists.

The retained `set.at` remains strict and fails on out-of-range positions.
Older exact-version packages do not gain the new APIs automatically.

## Native execution

Canonical programs are in `shared/wls-library/map/` and
`shared/wls-library/set/`. Host bridges marshal arguments and validate results;
the algorithms execute WavelengthScript instructions, not host-side substitutes.

```ts
import { mapIndexOfKey } from "./shared/wls-map-library";
import { setIndexOf, setAtOrDefault } from "./shared/wls-set-library";

const entries = { entries: [["b", "payload"], ["", "other"]] as [string, string][] };
mapIndexOfKey(entries, "b");             // 0
setIndexOf(entries, "");                 // 1
setIndexOf(entries, "payload");          // -1
setAtOrDefault(entries, 1, "missing");    // ""
setAtOrDefault(entries, 2, "missing");    // "missing"
// setAtOrDefault(entries, 0.5, "missing") throws.
```

Existing limits remain: 20 entries; 256 UTF-16 code units per key, value,
query or fallback; 8,192 source code units; 128 compiled instructions;
1,024 executed instructions; 32 registers; and 65,536 logical live-register
memory bytes. Logical accounting is not a JavaScript heap guarantee.

Position queries scan at most 20 members. The fallback read uses the existing
key-at primitive and a one-entry holder, without expanding a full container.
No new opcode, VM, arbitrary value type, callback, I/O permission, automatic
download or installation hook is added. No measured speed gain is claimed.

## Packaging and offline checks

- Full manifest: `scripts/fixtures/wls-map-set-package-v0-14.json`.
- Twelve-case suite: `scripts/fixtures/wls-map-set-v0-14-smoke.json`.

Use a new reviewed lock path, not an overwrite of a trusted lock:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-lock scripts/fixtures/wls-map-set-package-v0-14.json > ordered-membership.lock.json

node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/wls-collections-cli.ts \
  package-test-locked scripts/fixtures/wls-map-set-package-v0-14.json \
  ordered-membership.lock.json scripts/fixtures/wls-map-set-v0-14-smoke.json
```

Retained source bytes and lock fingerprints stay unchanged. The release audit
also pins the new 0.14.0 fingerprint. Source locks compare exact manifest bytes
and declared sources against a trusted expected lock; they do not prove author
identity, unchanged host/VM code, privacy or independent security clearance.

Tests cover independent references, empty/Unicode/prototype-like members,
ignored payloads, absent queries, malformed and missing operands, mandatory
fallback checks, extreme safe integers, maximum-sized inputs, retained strict
reads, source-lock tampering, offline CLI and standalone ESM/CommonJS bundles.
Browser-environment tests are not physical Safari or phone verification.

This is a repository-local dependency release. It does not change live P2P,
wallets, encryption, access rules or tracking, and is not a GitHub merge,
public registry release or live application integration.

See [the dependency index](wavelengthscript-dependencies.md),
[0.13.0](wavelengthscript-map-set-v0-13.md),
[manifests](wavelengthscript-package-manifests.md) and
[source locks](wavelengthscript-package-locks.md).
