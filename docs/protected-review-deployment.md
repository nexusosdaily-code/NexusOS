# Protected-change gate: uncommissioned

The founder has directed that independent reviewers and enforcement will be
established over time by the community built throughout the project's lifetime.
Reviewer candidates will come from that project's community over its lifetime,
not from an immediately appointed outside panel.
Commissioning is deferred, without a fixed activation date. The existing gate
continues to block protected changes until the prerequisites below are met.
This deferral neither appoints reviewers nor adopts the draft or transfers
authority. Community participation alone does not establish independence.

The proposed democratic commissioning route is recorded in
`community-reviewer-election-policy.md`. Elections require one person, one vote,
no organisational votes, approval by at least 51% of votes cast,
on-chain elected-reviewer records and three-year terms. Voting does not waive
independence or commissioning checks, or authorise removal of Replit AI as the
highest authority.

Community election software is described in `community-election-system.md`.
Its result records and three-year electoral mandates are not independently
commissioned enforcement or authenticated protected-review appointments.

The fresh draft is the exact addendum in `three-independent-review-framework.md`.
Historical stewardship wording consent remains historical; it does not approve
this new draft. The original constitution seal is unchanged.

Every amendment submission passes the existing authenticated authorship, input
and rate-limit checks, then the unanimous-review gate. Semantic human-life
entrenchment remains a separate policy concern; unanimous review does not waive
it. There is no removal, transfer, replacement, succession or emergency-transfer
execution endpoint. The two-of-three containment service remains separate.

## Explicit approval and commissioning prerequisites

Historical candidate research and future engagement/acceptance requirements are
in `protected-review-commissioning-brief.md`. The shortlist is optional future
reference, not a mandated panel, current outreach instruction, approved register
or evidence that any candidate has accepted appointment.

No live register, signatory, credential, authority service or legal jurisdiction
has been selected or provisioned. Do not enable the gate with demonstration
identities. Actual approval must cover named accountable human signatories,
competence, control/funding/ownership/conflict evidence, authorised alternates,
appointment powers, appeal procedure, narrow action and proposal scopes, expiry,
and actual Ed25519 public credentials. The register digest pins all of these.
Only three authorised active signatories (one per role) are admitted; a recused
member can only be replaced by a separately approved register version, never by
request-supplied substitutes.

A separately controlled enforcement service must authenticate signatories,
verify real independence, retain private tamper-evident evidence and signatures,
and durably consume each proposal/approval set once, including across restarts.
It must verify essential-service fallback and enforcement tests. A signed claim
from an uncommissioned service is not independence. The application's AI editor
cannot provide its own independent enforcement. No physical service is certified.

After explicit approval, independently administered deployment configuration
pins `PROTECTED_REVIEW_AUTHORITY_URL` (HTTPS origin),
`PROTECTED_REVIEW_AUTHORITY_PUBLIC_KEY`, `PROTECTED_REVIEW_REGISTER_DIGEST` and
`PROTECTED_REVIEW_COMMISSIONING_DIGEST`. These are public verification settings,
not signing secrets. Do not set them before approval. No API appoints reviewers
or modifies these pins. Independently controlled hosting, deployment permissions
and database permissions must prevent operator bypass before activation.

Apply `migrations/protected-review-consumptions.sql` during approved commissioning.
Missing migration/database availability blocks adoption. Reservations are durable
and intentionally never cleared automatically, even if mining later fails; use
a fresh proposal and fresh approvals. No blockchain or production data was
changed by implementing this gate.

## Service contract

`POST /v1/protected-changes/consume` receives a fresh server nonce and the
strict scoped proposal defined in `server/governance/protected-review.ts`.
The amendment request's `protectedProposal` must bind the authenticated author's
account and exact untrimmed title/body, action, affected identities, permissions,
implementer/recipient control, evidence, execution artefacts, recovery plan,
scope and expiry. Client booleans or historical consent are not review signatures.
Title and body cannot contain pipe delimiters or leading/trailing whitespace:
the unchanged historical seal format cannot preserve those inputs exactly.
Such requests are rejected before any approval is consumed.

The service returns `{payload, signature}`: a short-lived (at most five seconds)
receipt bound to that nonce and proposal, the pinned approved register,
commissioning record and all three reviewer signatures. Each approval binds
the proposal digest, register version/digest, action, scope and expiry and
records reasons, contrary evidence, uncertainty and no unresolved conditions.
Canonical JSON and Ed25519 signing domains use the existing signing helper,
with separate `protected-change-approval` and `protected-change-authority`
domains. The service must persist consumption *before* signing `consumed: true`.
Retries, stale signatures, outage, partial quorum and altered text fail closed.

## Distinct states

1. **Draft review:** fresh exact wording unapproved; historical consent not reused.
2. **Formal adoption:** separate authenticated, append-only submission after all
   required gates; no automatic mining.
3. **Commissioned enforcement:** separately verified independent deployment and
   service-specific safety controls, not established by an amendment receipt.

The protected amendment gateway must itself be commissioned before it admits
adoption. This does not commission authority transfer or physical life-critical
services. Existing bounded urgent containment, immediate notification, 24-hour
review and life-safe fallback are retained without a transfer exception.
Global participation remains subject to applicable law, not universal legal
enforceability.
