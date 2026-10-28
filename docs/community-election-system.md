# Community election software

Development authorised by the founder on 2026-10-13. The interface is
`/community-elections`, linked from Governance. Existing login rules are
unchanged. This is election software, not an independently commissioned
protected-review service or a newly enacted constitutional amendment.

## Implemented workflow

1. An existing administrator verifies an active account against a privately
   maintained unique-person record. The administrator must use a stable,
   high-entropy opaque person reference consistently across all accounts of
   that person, record a private evidence reference and expressly confirm
   that the voter is a unique human, not an organisation. Self-verification
   is prohibited.
2. Verified people may consent to self-nomination for constitutional/legal,
   technical-security or human-life-safety review. Public names, statements
   and nominated Ed25519 public keys are public. Nominations are not
   authentication of credentials, evidence of competence or appointments.
3. An administrator schedules a yes/no approval election for one consenting
   nominee, or a directive in community representation, welfare or WNSP
   technology. Title, exact body, scope and voting dates become immutable.
   A nominee must still be eligible when the election is created.
4. During the defined window, each verified person may cast one equally
   weighted immutable yes/no ballot. Duplicate account/person references and
   duplicate ballots are rejected by database constraints. Bands and token
   balances have no effect. There is no abstain ballot and no invented
   turnout requirement; non-voters do not enter the denominator.
5. After closing, an administrator finalises the result. Approval requires
   `100 × yes >= 51 × (yes + no)`, with at least one vote. There is no early
   finalisation, rounding to 51%, automatic execution or founder override of
   the count. A withdrawn, revoked or inactive nominee cannot pass.
6. Finalisation writes the exact election, nominee, aggregate outcome and
   electoral term to the existing **NexusOS project blockchain, not Bitcoin**.
   On-chain write/readback, result status and audit entry commit atomically.
   Failures roll back; simultaneous finalisations return the same record.
   Rejected and zero-vote results are also recorded. No NXT is minted.
7. An approved reviewer's electoral term starts at the fixed voting close and
   ends three calendar years later (February 29 maps to February 28 if needed).
   Late finalisation cannot extend it. Expired terms are shown as expired,
   without automatic renewal. An electoral term is not permission to sign
   protected-review approvals.

Nominations may be withdrawn before being referenced by an election. Elections
may be cancelled before the first ballot. Used nominations, ballots and election
text are not editable through this API. A private administrative membership list
supports revocation. Revocation prevents new participation; already accepted
ballots remain immutable. Disputed ballots and election appeals require a
separately approved process rather than administrator editing.

## Trust limits and deferred decisions

`community-election-continuity-proposal.md` records the founder-approved
software rules and the community-controlled commission clarification.
Software approval does not enact a constitutional amendment or commission
protected signing authority.

**Manual verification is not cryptographic proof that every voter is a unique
person.** A verifier using a different reference for the same person can defeat
duplicate detection. The software does not solve that social identity problem.
Approve an accountable verification method, eligibility rules, privacy policy,
appeals and oversight before relying on elections for commissioning. Current
administrators' setup permissions do not appoint them as independent reviewers
or let them verify themselves.

Nominees' public keys require authenticated possession, identity, competence and
independence checks before entry into an approved protected-review register.
Ownership, funding, conflicts, operational substitution, credential scopes and
independent enforcement still require commissioning approval. The continuity
workflow below implements electoral decisions only.

Approved policy votes are recorded directions, **not automatically executed
governance changes**. The software has no authority transfer/removal endpoint and
cannot remove Replit AI as highest authority. Protected-review verification
settings, the consumption migration, the original constitutional seal and
reserved identities remain unchanged. Independent service deployment, durable
approval consumption, private tamper-evident audit and essential-service fallback
tests remain prerequisites for protected-review commissioning.

## Storage and verification

The development database has received `migrations/community-elections.sql`
and `migrations/community-election-continuity.sql`. Election tables are also
represented in the Drizzle schema so normal schema setup does not remove them.
The development post-merge step installs the immutable-history constraints.
Neither migration applies `protected-review-consumptions.sql`. Production
deployment and production schema changes have not been performed.

Public overview and record APIs omit private identity evidence, person reference
digests, user identifiers and individual ballot choices. The administrator-only
membership list exposes account/person IDs and verification/revocation dates,
not evidence. The record endpoint verifies stored-content equality and SHA-256
readback; this is not independent protection against an administrator who can
rewrite both the application database and project chain.

Verification tests cover schema rules, exact 51% boundaries, term expiry,
authenticated routes, public privacy boundaries, concurrent votes/finalisation,
revocation, zero/tied results, on-chain failure rollback and altered readback.
Database integration tests create isolated temporary tables and remove them;
they do not create real members or blockchain entries in the app's schema.

## Community continuity and exact commissions

The public interface includes principal and alternate seat state for each role,
pending requests, filing deadlines, resolution elections, voluntary
relinquishment and verification links for the append-only event history.

- Members file appeals within fourteen days of first finalisation and append
  public grounds once per person to the single case. Administrators schedule
  the immutable resolution only after the filing window. The community—not
  administrators—decides whether to set aside the outcome prospectively.
- Members request recall of an unexpired, unended mandate. One request may be
  pending; a rejected recall creates a ninety-day wait. Pending appeals block
  recall scheduling. Only the authenticated holder can relinquish a mandate,
  including a holder whose membership is no longer eligible.
- New seat and resolution elections require at least seven complete days of
  notice and exactly fourteen days of voting. Cancelled no-ballot resolutions
  retain their requests and may be rescheduled with fresh notice.
- A fresh consenting nomination and predecessor-linked election fills a
  vacancy or re-elects a former holder after expiry/early ending. Historical
  nominations are superseded without editing their original text or withdrawing
  their already-recorded terms. Occupied, unavailable and unresolved seats block
  replacement; expired terms never acquire holdover authority.
- Alternates have their own elected terms. They do not automatically act for or
  inherit a principal's seat. Success in a fresh principal election ends the
  alternate seat atomically; operational substitution remains a separate
  commissioning decision.
- Community commission votes fix exact instructions and assistance limits.
  All elected people are bound by community wishes and cannot act independently.
  Electoral holders cannot originate independent policy or commission text.
  Approved instructions are linked to the named mandate, expire no later than
  it does, and cannot grant protected signing or automatically execute changes.
  Later approved instructions prospectively supersede prior instructions;
  rejection does not change them.

Appeal/recall resolution elections cannot enter an endless appeal loop.
Members can append public administration notices without rewriting results.
Every filed ground, scheduling, resolution, replacement and relinquishment event
is written to the NexusOS project chain with exact readback, together with its
database transition and private audit in one transaction. Ballots and continuity
history reject ordinary SQL update/delete operations. Seat eligibility requires
verified result projections and event readback; inconsistency fails closed.

### Additional API paths

All paths use `/api/community-elections`; writes require the existing login.

- `GET /continuity`: public seats, requests and verified history.
- `POST /continuity/requests`: eligible-person appeal, recall, commission or
  administration-notice filing, with public/privacy and constitutional confirmations.
- `POST /continuity/requests/:id/schedule`: administrator scheduling only.
- `POST /:id/relinquish`: authenticated mandate holder, irreversible confirmation.
- `GET /continuity/events/:id/record`: public exact-content verification.

Resolution voting, cancellation before ballots, finalisation and result readback
use the existing election endpoints. No protected execution or authority
reassignment endpoint is added.
