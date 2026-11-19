# Release coverage review — 19 November 2026

## Scope and baseline confidence

This is a public-safe **source and disclosure coverage audit**, not a new security
scan, complete line-by-line code review, production-data audit or release test run.

The latest `Published your App` marker reachable from the reviewed branch is
`7af477db2b9a907629d7e9acf27265374e14f7ae`, dated **2 November 2026,
11:32:09 UTC**. The comparison endpoint is
`34c8a7a124744f48cddeeaea37ba78993167494d`, dated **19 November 2026**,
before this audit's documentation changes.

The comparison contains **142 commits and 418 changed tracked paths**. The
same-date publication marker on another branch has an identical file tree.
Publication metadata reports a successful public VM build, but does not identify
its source commit. Therefore this historical marker is the **latest available
publication baseline**, not a certified fingerprint of the currently served
application. Changes after an unrecorded publication could already be live.
This audit must not be described as an exact live-build-to-workspace diff.

Reproduce the inventory without exposing configuration contents:

```sh
git rev-list --count 7af477db2b9a907629d7e9acf27265374e14f7ae..34c8a7a124744f48cddeeaea37ba78993167494d
git diff --shortstat 7af477db2b9a907629d7e9acf27265374e14f7ae 34c8a7a124744f48cddeeaea37ba78993167494d
git diff --name-only 7af477db2b9a907629d7e9acf27265374e14f7ae 34c8a7a124744f48cddeeaea37ba78993167494d
```

These commands include internal paths; their contents and raw configuration are
not reproduced in this disclosure. Git snapshots describe source, not database
rows, provider settlement, actual browser sessions or publication success.

## Complete path inventory, grouped once

Every changed path was assigned once, using the order below. This is inventory
coverage, not a claim that every individual change is a new user-facing feature.

| Group | Changed paths | Disclosure treatment |
|---|---:|---|
| Internal project memory/metadata | 38 | Excluded from public feature claims and account narratives. |
| Tests, scripts, fixtures and audit harnesses | 204 | Includes CI and Vitest configuration; scripts also contain upload compatibility patches, not only tests. |
| Documentation and public disclosures | 36 | Includes repository reports, generated guides and the shared website record. |
| WLS language, libraries, learning, IDE and WLS file workflow | 56 | Described as bounded implementations, not a completed application rewrite. |
| P2P, media and shared workspace | 18 | Transport, worker, integrity and session integration changes. |
| Financial, identity and Explorer | 30 | Includes two additive schema files; no public account history. |
| Application integration, runtime and remaining configuration | 36 | Shared entry points, navigation, dependency/build configuration and safety integration; raw configuration excluded. |
| **Total** | **418** | All tracked changed paths accounted for at the fixed comparison endpoint. |

Grouping rules: internal memory first; then scripts/tests/CI; then documentation;
then WLS/learning/IDE paths; then P2P/session/media; then financial/identity/Explorer
paths; remaining integration/runtime paths last. General entry points can
implement several features despite appearing in only one inventory group.

## Feature-to-disclosure coverage

Paths shown as code are evidence references in the reviewed workspace, not files
included in the focused GitHub documentation export.

| Development area | What changed in the interval | Evidence and qualifications |
|---|---|---|
| Binary WLS and SHA-256 | Binary compiler/runtime profiles and host-backed hashing, with conformance and ownership controls. | `docs/wavelengthscript-binary.md`, `docs/wls-binary-hashing.md`. Established SHA-256, not newly invented or wholly WLS-authored cryptography. |
| Streaming hashes and locked libraries | Separate streaming execution profile, explicit chunk acknowledgement/EOF and exact-source dependency locks; whole-buffer compatibility retained. | `docs/wls-streaming-package.md`, `docs/wls-binary-package-audit.md`. Repository-local packages are not a registry publication or unrestricted dependency access. |
| Hash performance and audit integrity | Reproducible timing/control-responsiveness experiments; isolated attempts, atomic report publication, fail-closed validation and stale-PASS rejection. | `docs/wls-streaming-benchmark.md`, `docs/wls-locked-binary-browser-gate.md`, `docs/wls-hashing-completion-review-20261103.md`. Historical results are dated, not new throughput claims or fresh release clearance. |
| P2P integrity and transfer work | Worker-based hashing/integrity, batched local reads, negotiated SHA-256/Merkle modes, local chunk proofs and bounded operation controls. | `docs/p2p-live-integrity-audit-20261103.md`, `docs/p2p-mixed-browser-audit-20261116.md`. The recorded 256 MiB Chromium/Firefox mixed runs use SHA-256, not Merkle at that size; same-host results do not prove arbitrary-network delivery. |
| WLS-to-VM interfaces | Source handoff/new-tab handling, bounded core execution and clear rejection of non-executable previews. | `docs/wls-core-execution.md`, [architecture](ARCHITECTURE.md). No claim that arbitrary source languages or every contract operation execute. |
| Python protocol compatibility | Bounded module compilation, worker execution and dependency mapping for the recorded unchanged protocol. | `reports/wls-protocol-execution.md`, `reports/wls-protocol-dependency-coverage.md`. Not unrestricted Python or semantic human-language translation. |
| Learning Lab and IDE | Local bounded training/evaluation, inspectable WLS stages, fitted preprocessing and IDE state/navigation changes. | `docs/wls-learning-lab.md`, [repository overview](../README.md). Synthetic experiments are not general AI. |
| Combined calls/files/Lab workspace | Stable session owners and integrated panels; tests for worker errors/timeouts, cancellation and independent receivers. | `reports/shared-workspace-audit.html`. Participant confirmations and automated media tests are different evidence; no universal background/device guarantee. |
| Storage upload recovery | SDK compatibility patches and native/regression controls for multipart initiation, ordering, resume numbering and missing/unreadable/shortened sources. | Compatibility changes are in `scripts/patch-storage-multipart.cjs` and `scripts/patch-storage-resume.mjs`, with associated tests. Reproducibility does not make every cloud outage recoverable, and storage ACLs are not operator-inaccessible encryption. |
| Financial recording and bundle retry integrity | Durable account-bound intent, duplicate-debit prevention, recovery across lost responses and tabs, exact receipt lookup and a prospective return design. | `docs/financial-posting-boundaries.md`, `docs/spectral-bundle-receipt-lookup.md`, `docs/nxt-bundle-return-design.md`. A return design is not an enabled redemption path or historical repair. |
| Restricted Lightning and sats staking | Dedicated evidence-bound payment and individually approved/funded staking adapters, with financial worker holds retained elsewhere. | `client/public/monetary-verification-audit.html`, `docs/VERIFIED_SATS_STAKING.md`. No blanket financial reopening, custody proof or historical WNUSD certification. |
| Explorer and contract privacy | Bounded real block/receipt readers, detail/search/navigation, owner-only state/wallet views and safe legacy/public-contract projections. | `docs/blockchain-explorer.md`, `client/public/explorer-audit.html`. Linkage is not settlement; private payloads do not become public evidence. |
| Authentication and development reliability | Founder-access/login-response controls, isolated database tests, dependency patches, request diagnostics, startup-preview handling and HMR connection checks. | Source includes `server/founder-access.ts`, `server/http-diagnostics.ts`, `server/startup-preview.ts`, `server/vite-hmr.ts` and their tests. This review does not enable a new login method, expose configuration secrets, certify all production errors resolved or claim every browser tab is current. |
| WLS application file workflow | Recipient browsing, exact registered-wave ownership, real VM authorisation, native delivery, explicit acknowledgement and recoverable receipt/inclusion. | `docs/wls-application-file-workflow.md`. The 19 November physical test demonstrates both delivery directions and one direction through refreshed Explorer evidence; the WLS workflow remains limited to 64 KiB. |
| Website, research and historical disclosure | Qualified development index, connected evidence navigation and consistency across public wording. | [Development record](development-record.md). Historical scientific/hardware statements are not newly validated by publication. |

## Gaps found and corrected in this disclosure update

The previous index mentioned binary SHA-256 but did not give streaming execution,
locked hashing packages, anti-stale audit reporting and mixed-browser integrity
their own sufficient description. Storage compatibility/recovery, combined
workspace integration and development/runtime reliability were also too implicit.

The shared website record and generated repository index now explicitly cover
those areas and link their detailed evidence. Older entries about Unicode,
general dependencies, governance or hardware remain background context: an entry
in the index is not proof that it was newly implemented after this baseline.

## Remaining limits and release conditions

- Exact correspondence between the publication marker and the currently served
  build remains unverified. This prevents an unconditional claim that every
  inventoried change is unpublished.
- This documentation audit did not rerun the historical hash, browser, full-build
  or full-regression suites. Fresh disclosure checks must be reported separately;
  dated passing counts must not be promoted to current-source release clearance.
- The documented full WebKit native P2P RTC baseline limitation remains distinct
  from passing WebKit hashing/package gates and the physical PC/iPad example.
- The sender's stale 99% local progress display remains a known interface issue
  after recipient verification/acknowledgement. It is not a new delivery verdict.
- Interrupted physical transfer/recovery, server-restart durability and production
  validation of the WLS workflow are not established by the supplied screenshots.
- QR invitations, Bluetooth/nearby clients and offline reconciliation are future
  gated developments, not shipped capabilities.
- A 16 MiB WLS transfer pilot for larger files, including some audio and video,
  is a proposal only. It is not part of this release or the physical test.
- Schema review must preserve production data. Do not copy development balances,
  overwrite production data, infer financial reconciliation or fabricate original
  confirmations. GitHub review and website publication are separate actions.

## Handoff addendum — merged work after the fixed comparison

The interval from the audit endpoint `34c8a7a1` to `b483fb62` contains **10
commits and 54 changed paths**, including disclosure and configuration
maintenance. This addendum describes the major changes without changing the
earlier fixed inventory or claiming an exact production-build diff.

| Area | Merged result and scope |
|---|---|
| Ecosystem navigation | Nexus navigation connects the existing marketplace, collaboration tools, Wave Vault, WLS learning and execution tools, and Explorer. Navigation does not change access permissions. |
| Transfer feedback | Buttons and tabs can show send and receive activity using actual workflow states. Activity is not proof of peer receipt or final settlement. |
| Spectral IDE and Hub | The IDE distinguishes inspectable encoding previews from executable source. The Hub presents a matching account's registered canonical wave address without conflating it with a wallet or system authority. |
| Private ledger freshness | The Hub distinguishes current, cached and unavailable ledger data. This is a presentation and read-path change, not a balance adjustment, wallet network verification or reconciliation of development and live funds. |
| Bundle recovery | Synthetic Chromium coverage exercises wrong-identity confirmations and separately recovers two pending amounts after lost confirmations. It checks each original receipt and no extra synthetic debit. It is not a production payment, custody or historical-balance test. |

## Privacy and actions

No private screenshots, filenames, personal identities, public-wallet histories,
account balances, seed phrases, keys, connection strings or raw configuration
contents were added to this report. The audit itself did not write to the
production database or submit provider transactions.
