# NexusOS development record

Evidence review: 2026-11-20.

WavelengthScript is the core language we're engineering for NexusOS. Our goal is to build NexusOS software in WavelengthScript using our spectral coordinate system, so those coordinates are part of how programs work, not just how they're displayed. Current execution runs on conventional computers. The wider hardware vision remains research, not a delivered photonic computer.

On 20 November 2026, a signed-in desktop test showed a native WavelengthScript build compile, run and save a private Explorer receipt. A second native build verified a private PDF attachment. After explicit opt-in, Explorer checked the public block linkage for each receipt. Separately, the CE–SE Pipeline ran a supported Python example through a translation path, a way to bring code into the ecosystem rather than a substitute for native WavelengthScript. These were development-environment observations, not production verification.

This is a development disclosure. Workspace code, historical disclosures, test results, remote repository updates and website publication are different events. Evidence marked as a workspace reference is not included in the GitHub documentation export.

## Current financial boundary

In this source version, NXT-only bundles, verified Blink BOLT11 payments and individually approved, funded sats staking operations have dedicated adapters. Other monetary actions and financial automation remain held. These prepared controls do not establish which code an older deployment is running. New sats stakes issue no WNUSD. Existing balances, disputed positions and old confirmations are not repaired or retrospectively certified.

## Development index

This consolidated index covers the major development areas and links their detailed histories; it is not a claim that every old statement remains valid today.

### Native WavelengthScript builds and Explorer receipts

**Period:** 20 November 2026. **Status:** Participant-tested in signed-in desktop development Preview.

**Improvement:** A program written in native WavelengthScript was compiled and executed under WLS-CORE-LAUNCH/2, completing in 10 VM cycles and saving a private Explorer receipt. A separate native launch verified the stored bytes of one 213,767-byte PDF against its SHA-256 checksum and recorded the attachment on the private receipt without passing the file to the VM. The CE–SE Pipeline translated a supported Python example to wavelength-tagged instructions and ran them in a dedicated WLS-PY/1 executor in 34 VM cycles, not in the native WLS VM. After explicit opt-in, Explorer checked public linkage for all three non-financial build receipts.

**Limits:** The public record contains a blinded commitment and block linkage, not the source, output, or attachment. Linkage does not independently verify execution or establish Bitcoin settlement. The PDF test did not establish the full 16 MiB attachment limit or production storage readiness. These tests do not establish full Python compatibility, a completed NexusOS rewrite in WLS, or native photonic execution.

**Evidence:** [docs/wavelengthscript-dependencies.md](../docs/wavelengthscript-dependencies.md) · [docs/wavelength-python-subset.md](../docs/wavelength-python-subset.md) · `shared/wls-build-launch.ts` (workspace reference) · `server/wls-build-records.ts` (workspace reference)

### CE/WNSP representations and conformance

**Period:** Historical specifications; dates retained in source. **Status:** Implemented software and documented models.

**Improvement:** Character and spectral representations, reference tables and conformance guidance make the encoding reproducible and inspectable rather than relying on an interface illustration.

**Limits:** A software spectral coordinate or energy-equivalent calculation does not establish physical orthogonality, transmission, hardware performance or cryptographic security.

**Evidence:** [docs/wnsp-conformance.md](../docs/wnsp-conformance.md) · [docs/ASCII-Wavelength-Table.md](../docs/ASCII-Wavelength-Table.md)

### WavelengthScript compiler and virtual machines

**Period:** Continuing language development. **Status:** Implemented, bounded execution profiles.

**Improvement:** Source-to-instruction workflows, compilation validation and browser workers provide inspectable execution paths. Supported semantics and limits are documented; unsupported source must fail rather than succeed through a logging-only fallback.

**Limits:** Not every Python or other programming-language construct is supported. Encoding previews are not executable programs. This is not WLS self-hosting or a completed rewrite of the application in WLS.

**Evidence:** [docs/wavelength-python-subset.md](../docs/wavelength-python-subset.md) · [docs/wavelengthscript-dependencies.md](../docs/wavelengthscript-dependencies.md)

### Dependencies, collections and offline tooling

**Period:** Current dependency index preserves release history. **Status:** Implemented software.

**Improvement:** Versioned libraries, bounded collections, Maps and string Sets, manifests, compatibility checks and source-integrity locks make capabilities reusable. Offline tooling separates execution-profile compatibility from dependency identity and file resolution.

**Limits:** A manifest or integrity lock is not unrestricted package support, source authorship, filesystem access or a grant of financial authority.

**Evidence:** [docs/wavelengthscript-dependencies.md](../docs/wavelengthscript-dependencies.md) · [docs/disclosure-export-check.md](../docs/disclosure-export-check.md)

### Human writing systems and Unicode

**Period:** Documented opt-in catalogue expansion. **Status:** Implemented encoding and catalogue tools.

**Improvement:** Pinned Unicode identities, official character-name and sequence discovery, and reversible coordinate representations extend text handling beyond English while preserving exact character data and existing mappings.

**Limits:** Writing systems are not interchangeable with languages. Encoding characters does not translate their meaning, identify an ancient language automatically or decipher historical scripts. Catalogue coverage is not a claim to understand every human language.

**Evidence:** [docs/unicode-catalogue.md](../docs/unicode-catalogue.md) · [docs/unicode-coordinate-profile.md](../docs/unicode-coordinate-profile.md)

### Binary values and established hashing

**Period:** Versioned binary runtime documentation. **Status:** Implemented host-backed computation.

**Improvement:** Binary WLS profiles reuse established SHA-256 through bounded host-backed execution. A separate streaming profile accepts acknowledged chunks and explicit EOF, including declared inputs up to 256 MiB. Reviewed repository-local binary and streaming packages pin exact WLS source bytes through dependency locks. Benchmarks and native audit gates check reproducible results, report ownership and stale-PASS rejection.

**Limits:** This is not a new hash or SHA-256 authored entirely in WLS. Streaming hash capacity is not the 64 KiB application-transfer limit or a guarantee of whole-application memory use. Locked packages are not registry publication. Dated browser/benchmark results are not current release clearance or proof of universal speed gains.

**Evidence:** `docs/wavelengthscript-binary.md` (workspace reference) · `docs/wls-streaming-package.md` (workspace reference) · `docs/wls-binary-package-audit.md` (workspace reference) · `docs/wls-streaming-benchmark.md` (workspace reference) · `docs/wls-locked-binary-browser-gate.md` (workspace reference)

### Unchanged Python protocol through WLS

**Period:** Evidence record dated 17 November 2026. **Status:** Implemented and tested compatibility workflow.

**Improvement:** The recorded unchanged wnsp_protocol_v7.py passes through the WLS-PY/2 translation, compiler and browser-worker execution workflow. Exported entries accept bounded JSON arguments; supported clock input is explicit. Hashing reuses the existing dependency.

**Limits:** A TypeScript parser/compiler/interpreter supplies this compatibility profile. It is not unrestricted Python, CPython/Pyodide, arbitrary imports, semantic human-language translation, a natively WLS-authored protocol or photonic execution. Historical browser and test counts remain dated in the evidence record.

**Evidence:** `reports/wls-protocol-execution.md` (workspace reference) · `reports/wls-protocol-dependency-coverage.md` (workspace reference)

### Bounded learning and fitted preprocessing

**Period:** Learning Lab and numerical feasibility records. **Status:** Implemented synthetic-data experiment.

**Improvement:** Browser-local training, held-out predictions, visible parameters and inspectable generated stages demonstrate a small constrained linear classifier. Fitted preprocessing belongs to training and is reused for evaluation, not refitted on held-out rows.

**Limits:** This is not general AI, unrestricted Python, automatic learning from user data or an externally validated intelligence result. Dataset, feature, epoch and execution limits remain part of the experiment.

**Evidence:** [docs/wavelengthscript-learning-feasibility.md](../docs/wavelengthscript-learning-feasibility.md)

### P2P files, Wave Vault and shared access

**Period:** October–November 2026 evidence and implementation records. **Status:** Implemented file/storage workflows with stated limits.

**Improvement:** Whole-file filing, addressed delivery, incoming-share discovery, grants and quotas connect collaboration to private storage. P2P work adds real integrity workers, batched reads, negotiated SHA-256/Merkle checks and local chunk proofs. Dated independent Chromium/Firefox tests cover both directions at 256 MiB using SHA-256. Storage SDK patches and regressions address initiation, ordered parts, resume numbering and unreadable or shortened sources without silently discarding saved progress.

**Limits:** The 256 MiB P2P audit is same-host native-browser evidence, not a WebKit transport pass, physical arbitrary-network proof or the separate 64 KiB WLS workflow limit. Access control is not operator-inaccessible encryption; revocation cannot erase obtained copies. SDK recovery tests are not a guarantee against every storage outage. Commerce remains subject to financial holds.

**Evidence:** [docs/wave-vault.md](../docs/wave-vault.md) · [docs/wave-vault-browser-verification.md](../docs/wave-vault-browser-verification.md) · [docs/p2p-live-commerce.md](../docs/p2p-live-commerce.md) · `docs/p2p-live-integrity-audit-20261103.md` (workspace reference) · `docs/p2p-mixed-browser-audit-20261116.md` (workspace reference) · [docs/release-coverage-20261119.md](../docs/release-coverage-20261119.md)

### Live broadcasting and browser/device evidence

**Period:** Dated automated and owner-reported records. **Status:** Implemented media workflows; bounded compatibility evidence.

**Improvement:** Room access, signalling, live media and cleanup are documented separately from actual decoded playback. Native automated tests and specific reported physical-device combinations are identified as different kinds of evidence.

**Limits:** Signalling success alone is not delivery. Recorded failures, absent TURN fallback and unverified browser/device combinations are not hidden by successful examples. No universal availability, privacy or emergency-delivery guarantee is made.

**Evidence:** [docs/live-video-browser-verification.md](../docs/live-video-browser-verification.md) · [docs/p2p-live-commerce.md](../docs/p2p-live-commerce.md)

### Financial recording and historical evidence

**Period:** Prospective recording fixes and separate reconciliation. **Status:** Implemented safeguards; historical reconciliation remains separate.

**Improvement:** Exact-unit accounting, shared writer reviews, transaction records, atomicity and durable retry identities address partial or duplicated financial outcomes. Historical audit entries are distinguished from modern authoritative transaction receipts.

**Limits:** Later reconciliation or anchoring cannot manufacture an original confirmation. Development and production data are not made equal by copying screenshot balances. Private account histories and lost-wallet details are excluded from this public record.

**Evidence:** [docs/shared-sats-writer-audit.md](../docs/shared-sats-writer-audit.md) · `client/public/monetary-verification-audit.html` (workspace reference)

### NexusOS monetary verification

**Period:** 18 November 2026 restricted rollout. **Status:** Implemented application-managed integrity records.

**Improvement:** The NXT-only bundle adapter commits its exact debit, linked internal WNUSD issuance, authoritative receipt, authorisation snapshot and blinded hash-linked inclusion together. Owner reads recompute evidence; unintegrated monetary writers and automatic financial workers are held.

**Limits:** This is an application-managed database integrity chain, not independently distributed consensus, Bitcoin anchoring, proof of custody, dollars or reserves. A privileged operator controlling both code and database can rewrite both. The verifier fails closed above its documented segment capacity.

**Evidence:** `client/public/monetary-verification-audit.html` (workspace reference) · `server/monetary-verification.ts` (workspace reference)

### Individually reviewed and funded sats staking

**Period:** 18 November 2026 prospective V2 adapter. **Status:** Implemented restricted adapter, not blanket reopening.

**Improvement:** Exact founder-reviewed approvals bind an owner, operation, backing/funding evidence and position snapshot. Principal and pre-funded NXT rewards, maturity, retry identity, zero fees and treasury penalties are recorded atomically with inclusion.

**Limits:** No automatic approval is generated. Historical/unreviewed stakes remain unavailable; new stakes issue no WNUSD. Recorded operator review is not an independently authenticated reserve proof. No historical backfill, redemption, balance repair or outgoing-lock release is authorised.

**Evidence:** `server/verified-sats-staking.ts` (workspace reference) · `client/public/monetary-verification-audit.html` (workspace reference)

### Settlement-linked Blink Lightning payments

**Period:** 18 November 2026 verified-payment adapter. **Status:** Implemented restricted mainnet BTC-wallet BOLT11 workflow.

**Improvement:** A durable owner-bound intent and exact sats reservation precede a one-shot provider submission. Independent outgoing account evidence checks identity, network, units, amount, fees and payment proof. Settlement persistence and recoverable NexusOS inclusion are separate steps.

**Limits:** Only the named adapter is enabled, not deposits, other providers or legacy queue replay. A local fee reserve is not a provider-enforced routing cap or proof of provider solvency. Ambiguous outcomes do not automatically refund or resend. Explorer reads never contact the provider.

**Evidence:** `server/verified-lightning.ts` (workspace reference) · `server/verified-lightning-provider.ts` (workspace reference) · `client/public/monetary-verification-audit.html` (workspace reference)

### Connected read-only blockchain explorer

**Period:** 18 November 2026 enhancement; run-specific checks in audit. **Status:** Implemented, with release validation recorded separately.

**Improvement:** Bounded block/receipt browsing, stable identifier search, linked details and exact owner-only financial views replace the contract-only explorer. Public execution rows require deployed public contracts and exclude caller identity, output, state, financial payloads and balances. Legacy chain and public-app history readers use the same safe projection. Contract wallet/state inspection now requires the owning session and account binding; failed reads never imply zero funds.

**Limits:** Public linkage checks do not reveal or verify private source data. VM execution does not prove settlement. Legacy records remain unverified, private address histories are not public, and the legacy mempool view is unavailable rather than presented as empty. Owner lists are latest-50 windows with exact-ID lookup, not exhaustive statements.

**Evidence:** `docs/blockchain-explorer.md` (workspace reference) · `client/public/explorer-audit.html` (workspace reference)

### Scientific, governance and hardware disclosures

**Period:** Original dated disclosures preserved. **Status:** Mixed: software, calculations, reports and proposals explicitly separated.

**Improvement:** Evidence records distinguish implemented software, calculations, reported measurements and proposed capabilities. Original numbered claims and licensing provenance remain historical records; current summaries should use the live register rather than an obsolete fixed claim count.

**Limits:** Public disclosure is not independent validation, a granted patent, legal enactment or experimental proof. Electrically tested coils do not establish integrated photonic computing, optical relay, quantum memory or ZERO-G operation. Protected authority and promotional holds are not lifted by this release.

**Evidence:** [PRIOR_ART.md](../PRIOR_ART.md) · [CHANGELOG.md](../CHANGELOG.md) · [docs/PROJECT_DIRECTION.md](../docs/PROJECT_DIRECTION.md)

### Application WLS file requests and blockchain receipts

**Period:** 18 November 2026 integration; 19 November 2026 participant physical-device test. **Status:** Implemented; participant-demonstrated transfer and Explorer-linked receipt.

**Improvement:** Explicit WLS compilation and VM authorisation connect existing identities and native file transport to integrity checking, acknowledgement, durable receipts and Nexus Explorer details. A searchable recipient directory and exact registered-wave ownership validation avoid confusing wave addresses with internal wallet addresses. Participant screenshots showed a 52.7 KiB document delivered in both directions between a PC and iPad; the reverse transfer was opened in Word, explicitly acknowledged, included and inspected in Explorer, retaining Public linkage checked after refresh.

**Limits:** Files are limited to 64 KiB. Physical evidence is participant-provided and limited to the tested development-device pair; automated isolation/recovery tests are separate evidence. Both-direction inclusion, physical interrupted-recovery testing, arbitrary-network compatibility and production verification are not established. Participant assertions are not remote attestation, independent consensus or external settlement. QR, Bluetooth and offline sharing remain future work; other features and a whole-project WLS rewrite are not complete.

**Evidence:** `docs/wls-application-file-workflow.md` (workspace reference) · `server/wls-file-records.ts` (workspace reference) · `server/wls-file-routes.ts` (workspace reference)

### Combined calls, files and Learning Lab

**Period:** 16–17 November 2026 integration and dated evidence. **Status:** Implemented combined workspace; evidence scopes retained.

**Improvement:** Shared session owners connect calls, file delivery and local Learning Lab panels without remounting active media on panel changes. Native checks exercise worker failures, edited-source deadlines, recovery and independent receivers; participant confirmations of combined use are recorded separately.

**Limits:** Successful signalling is not decoded playback. Synthetic browser checks and participant-reported physical use are not interchangeable, and untested headset, background or device combinations remain unverified. This does not route every media feature through WLS or provide Bluetooth/offline operation.

**Evidence:** `reports/shared-workspace-audit.html` (workspace reference) · `docs/wls-learning-lab.md` (workspace reference)

### Development, upload and audit reliability

**Period:** November 2026 source changes and dated checks. **Status:** Implemented safeguards; not blanket production clearance.

**Improvement:** Database-inclusive tests use disposable isolation; publishing keeps database-writing suites out of the build. Native hash audit reports are attempt-scoped, atomically admitted and fail closed on missing or stale evidence. Runtime work adds request diagnostics, startup-preview and HMR checks, founder-access/login-response safeguards and dependency compatibility/security patches.

**Limits:** Test isolation and source fixes do not establish that all production errors or old-tab differences are resolved. This record does not enable new login methods, expose secret configuration or reproduce private account histories. Prior full-build counts apply to their tested source, not automatically to every later change.

**Evidence:** [docs/release-coverage-20261119.md](../docs/release-coverage-20261119.md) · `docs/wls-hashing-completion-review-20261103.md` (workspace reference) · `docs/wls-locked-binary-browser-gate.md` (workspace reference)

### Navigation, transfer feedback and balance freshness

**Period:** 19 November 2026 release handoff. **Status:** Merged software and synthetic regression coverage.

**Improvement:** Shared Nexus navigation makes collaboration, Wave Vault, marketplace, WLS tooling and the Explorer easier to find. Send and receive controls distinguish activity from confirmed outcomes. The Spectral IDE distinguishes encoding previews from executable source, and the Hub uses matching registered data for the canonical wave badge. The private ledger display labels cached or unavailable data instead of treating it as a fresh balance. Synthetic Chromium coverage verifies that two pending bundle amounts recover their own original receipts without extra debits.

**Limits:** This does not change account funds, establish live custody or verify a browser wallet's network. The synthetic ledger test is not a real-funds run. Encoding previews do not execute as programs. A status highlight is not proof of settlement or a substitute for a receipt.

**Evidence:** [docs/release-coverage-20261119.md](../docs/release-coverage-20261119.md)

### Publication-baseline coverage review

**Period:** 19 November 2026 disclosure audit. **Status:** Source inventory complete for a fixed historical comparison.

**Improvement:** The fixed historical review inventories 142 commits and 418 changed paths since the latest reachable 2 November publication marker. A handoff addendum covers 10 further commits through the completed bundle recovery check. The review maps hashing, integrity, upload recovery, shared workspace, runtime and other major changes to evidence. Internal metadata and sensitive configuration are excluded from public feature claims.

**Limits:** The marker is not a verified fingerprint of the currently served build. This is not an exact live-release diff, line-by-line code/security audit or a fresh full-build run. Historical or unchanged background capabilities are not relabelled as new, and publication and GitHub updates remain separate actions.

**Evidence:** [docs/release-coverage-20261119.md](../docs/release-coverage-20261119.md)

### Long-term whole-project WLS direction

**Period:** Standing product direction, not a completed migration. **Status:** Future goal supported by incremental software work.

**Improvement:** Language semantics, dependencies, protocol compatibility and inspectable execution provide reusable progress toward eventually authoring the project in WLS.

**Limits:** The existing web application still relies on its conventional host stack. Host-language wrappers and AI-assisted coding are not a completed WLS rewrite or a delivered specialised migration agent.

**Evidence:** [docs/PROJECT_DIRECTION.md](../docs/PROJECT_DIRECTION.md) · [README.md](../README.md)

## Release audit

See the [release coverage review](release-coverage-20261119.md) for the public scope, evidence and limits. Historical counts in linked reports are not fresh clearance for this combined build.
