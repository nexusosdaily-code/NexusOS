# WavelengthScript recipient collection pilot — 29 October 2026

## What is implemented

Private live-broadcast recipient preparation uses executable WavelengthScript
programs in the explicitly versioned `WLS-COLLECTION/1` profile. Both directory
selection and manual address entry use the same add/remove/count implementation.
Add performs unique selection; remove preserves the remaining order; count
returns the selected length. The library also implements indexed lookup.

- Programs: `shared/wls-recipient-collections.ts`
- Compiler and bounded execution engine: `shared/wls-collection-vm.ts`
- Existing coordinate encoder: `shared/wnsp-model.ts`
- UI integration: `client/src/pages/streaming.tsx`
- Public disclosure: `/live-guide`, rendered by
  `client/src/components/NativeCollectionDisclosure.tsx`

The programs contain actual collection control flow, not merely encoded
JavaScript strings or a generic instruction that logs unsupported source.
Compiled instructions carry wavelength-coordinate metadata; returned traces
identify the instructions that executed.

## Scope and limits

The execution engine and primitive array operations remain TypeScript. This
pilot is not a complete standard library, general module system, self-hosted
compiler, dependency migration or replacement for WebRTC/browser/OS services.
Coordinates do not provide encryption, identity verification or authority.

Execution is capability-free: no DOM, network, storage, database, wallet or
financial side effects. Input/output lists are copied and execution is bounded:
20 items, 256 UTF-16 units per string, 8,192 source units, 128 instructions,
1,024 cycles and 32 registers. The 20-item limit applies to prepared private
recipient selection, not global public broadcast reach or guaranteed audience
capacity. A selected address is not a granted invitation: the server's existing
authentication and invitation checks still decide access.

## Verification

The 45 tests in `server/wls-collections.test.ts` cover source compilation,
visited coordinate-tagged instructions, deterministic reference comparisons,
Unicode/order/case handling, duplicate selection, add/remove/count/index results,
input and runtime bounds, atomic failure and mutation isolation.

Run without connecting to a real database:

```sh
WNSP_PUBLISH_BUILD=1 \
DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:1/fixture \
npx vitest run server/wls-collections.test.ts
```

The disclosure component also has a focused rendering test. The broader local
verification record includes isolated native Chromium tests for manual and
directory selection, duplicate removal, the limit and public/private reset.
Those browser fixtures are not new physical iPhone/Samsung tests.
User-confirmed physical live broadcasts demonstrate media delivery separately,
not completeness of this dependency library or a universal security guarantee.

## Privacy gate and release status

Operator-inaccessible privacy is **not established** by this pilot or by private
room access controls. Account and operational records exist; coordinates alone
are not a cryptographic privacy boundary. Privacy review and appropriate
remediation must precede further WavelengthScript expansion.

Website publication, a GitHub pull request and merging that pull request are
separate actions. A source update or opened PR does not mean it is already
running on the public website.
