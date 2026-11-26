# WLS source and incremental trust roadmap

Disclosure revision: 1.0 — 27 November 2026.

Generated from the same disclosure source as the website. See [demonstrated achievements and evidence boundaries](nexusos-wls-verifier-disclosure.md).

## Incremental WLS source and trust roadmap — version 1.0

Roadmap revision 1.0, 27 November 2026. These are proposed gated stages, not completion dates or permission to implement protected changes. Whole-project WLS application source means authored application logic, not an automatic rewrite of the compiler, runtime, browser, operating system, native adapters or hardware. Every remaining host component must be inventoried and attributed. WLS self-hosting, if later chosen, is a separate bootstrap and compiler-trust problem.

Starting evidence is the disclosed CE–SE, Compiler and VM workflow, supported WLS-PY/1, WLS-CORE/1 and WLS-CORE-LAUNCH/2 receipt replay, exact Explorer receipt linkage, and accepted Samsung recordings for blocks #30 and #33 including altered-proof rejection. The historical block #25 public reference remains a comparison, not an independent checkpoint. No stage below is declared passed solely from these observations.

Trust inventory: local computation checks the supplied instructions and signed result; issuer trust authenticates an assertion under an accepted key; software distribution determines which checker and trust roots reached the device; historical linkage checks hashes within a named record domain; authoritative history requires independently authenticated checkpoints and a reviewed finality rule; physical-world claims require separate device, human or external evidence. None implies the others or complete trustlessness.

Approval boundary for every stage: ordinary non-financial language work may be reviewed within the existing bounded direction. The founder must explicitly approve transport restarts, authentication changes, financial authority, privacy or public-inclusion changes. Protected authority changes must also satisfy the existing three independent reviews and applicable governance requirements; this roadmap neither enacts a governance model nor delegates that authority. No stage authorises historical backfill, balance repair or disclosure of private files.

## Stage 0 — publish a capability and trust inventory

Prerequisite and starting evidence: use this versioned disclosure and the dated development record; retain the original source/evidence dates. Inventory every user-facing workflow, its authored language, executable profile, host calls, data authority, issuer, distributor, native adapter and physical-evidence status. Mark implemented, demonstrated, untested, stopped and proposed separately.

Acceptance evidence: a revision-pinned coverage matrix accounts for every application entry point and external capability, with a public-safe evidence link or an explicit evidence gap in each row; check that no private source, recording, identity or proof-opening value is exported. Affordable older Android devices remain intended users, not tested compatibility: record browser/resource/security constraints and available existing online or offline-verifier paths without promising support or restarting legacy Android/BLE work.

Remaining assumptions and unresolved choices: inventory completeness, evidence ownership, minimum secure device baseline and sustainable resource budgets require review. Native adapters and device OS security remain external dependencies. Approval: founder review of scope and exclusions; protected changes follow the roadmap approval boundary.

Compatibility and rollback: this stage changes descriptions only. Keep dated evidence and existing features intact; correct the inventory with a new version rather than rewriting history or changing runtime behaviour.

## Stage 1 — pin WLS semantics and conformance

Prerequisite: Stage 0 capability inventory. Start from the existing bounded profiles and reference compiler/runtime, not a claim of general Python support. Specify grammar, types, numeric overflow and rounding, Unicode/binary behaviour, deterministic inputs, errors, resource limits, cycle accounting, capability effects and canonical source/program/result encodings for each version.

Acceptance evidence: publish immutable semantics and positive, negative and boundary vectors; every specified operation has expected results or rejection, with byte-identical digests and cycle counts across the named reference environments. Unsupported instructions and effects must fail closed. Record compiler/runtime versions and test source revisions; differential results must be explained rather than normalised away.

Remaining assumptions and unresolved choices: numeric representation, deterministic scheduling and future capability ABI remain design decisions; passing a shared implementation's tests does not prove a specification or compiler correct. Approval: language-maintainer review under founder-approved scope; authority-bearing effects still need separate protected approval.

Compatibility and rollback: pin profile and semantics versions in proofs and packages. Keep old replay vectors and supported readers; reject unknown versions explicitly. Introduce incompatible semantics under a new profile, with an opt-in migration and return to the previous release without reinterpreting or resigning historical evidence.

## Stage 2 — independent checking and authenticated distribution

Prerequisite: Stages 0–1. Start with the reproducible synthetic-only standalone candidate and rehearsed test-key updates. Separate proof issuance, release approval, trust-checkpoint authority and recovery. A second origin alone is not independent control, and reusing the same runtime is not an independently implemented checker.

Acceptance evidence: at least two independently controlled clean builders reproduce the same pinned release bytes; authenticate the digest and trust bootstrap outside NexusOS. An independently maintained checker must pass the published conformance and adversarial vectors and compare actual saved proof results. Verify the hosted bytes, origin ownership and release permissions; rehearse key compromise, retirement, expiry, rollback-floor persistence and recovery with disposable keys before any public-key policy approval.

Remaining assumptions and unresolved choices: root quorum, independent maintainers, build toolchains, browser/OS supply chain, trusted clock and update reachability remain trust assumptions. An offline client cannot discover new revocations. Select maintainers and recovery channels explicitly, not by this roadmap. Approval: founder and independent release/security reviewers approve issuer and distribution policies; protected authority rules remain mandatory.

Compatibility and rollback: retain authenticated prior releases and old proof-format fixtures. A safe rollback must not lower trust-checkpoint floors or revive compromised issuers. Use separately authenticated recovery for a broken trust root; never accept an in-band root reset solely vouched for by the compromised distributor.

## Stage 3 — migrate bounded application logic to WLS

Prerequisite: Stages 0–2 for any independently distributed migration claim. Start with pure, non-financial application modules and the specified profile; maintain an explicit ledger of WLS-authored logic, translated compatibility code and host/native adapters. Whole-project source is reached only when every application module is accounted for, not when a wrapper calls existing host logic.

Acceptance evidence: for each small migration publish public-safe source provenance and a reproducible build, differential fixtures against the previous implementation, negative/capability-denial tests, measured memory/time limits and user-visible create/read/edit/delete or recovery parity where applicable. Test approved affordable-device/browser combinations separately and label unsupported or untested cases. Private inputs stay private. No BLE expansion is a dependency of this stage.

Remaining assumptions and unresolved choices: migration order, UI authoring, storage/network capability interfaces, compiler bootstrap and acceptable performance budgets require review. The runtime, compiler, OS, hardware and native adapters remain trusted until independently addressed. Review external-world effects separately from deterministic replay. Approval: founder approves each bounded migration; authentication, financial and protected authority changes require their separate existing approvals.

Compatibility and rollback: use opt-in versioned adapters and reversible routing to the previous implementation; preserve APIs, saved data, original receipts and consent. Shadow comparisons must have no duplicate writes. Do not migrate live balances, backfill history or silently change existing authorisations. Stop and revert the new path on parity, privacy or resource failures.

## Stage 4 — independently check history and review finality

Prerequisite: Stages 0–2 and stable record-domain semantics; Stage 3 parity is additionally required before migrated writers participate. Start from today's single exact-receipt/block check, not from assumed whole-chain validation. Specify a bounded public history export with domain identity, canonical genesis bytes/hash, versioned blocks and independently authenticated later checkpoints.

Acceptance evidence: a separate checker recomputes every supplied previous-hash link and commitment, and rejects deletion, reordering, mutation, domain substitution, truncation presented as complete, and forks inconsistent with an independently obtained checkpoint. Demonstrate that two internally consistent histories sharing genesis are not automatically authoritative. Before calling any history final, publish and independently review the threat model, membership/Sybil assumptions, quorum, fork choice, finality, censorship/liveness and recovery rules; exercise conflicting histories and authority failures with disposable data.

Remaining assumptions and unresolved choices: who witnesses checkpoints, who can write history, adversary and quorum thresholds, availability and the consensus/finality design remain undecided. Hash linkage alone is not authoritative history, Bitcoin settlement or consensus. Approval: founder plus all required independent and governance reviews for protected authority; no consensus model is enacted by this roadmap.

Compatibility and rollback: keep record domains and historical envelopes immutable; old blocks do not gain new guarantees. Add explicitly versioned prospective checkpoints and readers. On disagreement stop finality claims and new affected writes, retain both evidence sets for review and fall back to labelled single-record checking, never silently choose or rewrite history.

## Stage 5 — external validation and reduced operator authority

Prerequisite: the applicable accepted evidence from Stages 0–4; each claimed reduction names precisely which prerequisite passed. Start from the disclosed shared-operator limitations, not a claim of operator-inaccessible storage or complete trustlessness. Independent distribution and independent history authority are separately measured outcomes.

Acceptance evidence: external reviewers reproduce the released source/build/conformance and migration results, publish public-safe findings and retest fixes. Demonstrate with disposable adversarial exercises that a single compromised operator cannot substitute accepted releases, trust roots or checkpoint history under the approved policy. Publish a before/after authority matrix, named residual powers, incident/recovery evidence and measured affordable-device access results.

Remaining assumptions and unresolved choices: reviewers, independent hosting/funding, multi-party authority thresholds, recovery availability and privacy architecture need explicit approval. Physical delivery, human consent, custody, sensors and external-world truth cannot be inferred from a VM receipt. Cryptography still depends on algorithms, implementations, keys, operating systems and hardware. Do not promise an absolute absence of trust or universal device access.

Compatibility and rollback: reductions are prospective, separately versioned and independently reviewed. Preserve old evidence and readers without relabelling their guarantees. If independence or safety fails, withdraw the affected claim and suspend the affected path; do not silently restore unilateral authority. Approval: founder and the applicable independent/governance authorities must approve protected changes and any recovery, with no automatic campaign or transport restart.
