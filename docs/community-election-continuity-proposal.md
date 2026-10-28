# Community election continuity — exact proposed rules

## Status and approval boundary

The founder approved the continuity text on 2026-10-13, adding the community
commission requirement below and clarifying that elected people may carry out
only community-approved instructions. This is **approved for software
development, not constitutional enactment or protected-review activation**.
Approval authorises development of the workflows below, not enactment
of a constitutional amendment, appointment of an independent operator, or
activation of protected-review signing authority. Any change to these rules
requires fresh approval. Existing election rules continue until the approved
software and its additive database migration are installed.

### Community-controlled commission — founder clarification

The community decides the commission every elected person receives, not only
reviewers. Elected people do not act independently: they may carry out only
the exact community-approved instructions, cannot independently recommend
policy or make changes, and may receive assistance only within the community's
instructions and our constitution. This cannot supersede the constitution.

For electoral mandates represented by this system, an eligible community
member who does not hold a current electoral mandate may propose the exact
instructions and assistance limits for a named elected person. The community
decides them through a separate immutable yes/no commission election using
the same 51% votes-cast threshold, seven-day notice and fourteen-day vote.
Each approved instruction record names the original mandate and cannot last
beyond its fixed expiry or recorded early ending. Later approved instructions
replace earlier instructions prospectively; no rejected vote changes them.
The elected person cannot independently propose their own commission.
Scheduling the community's fixed text is administration, not independent
policy-making; electoral holders cannot originate policy or commission text.

Commission elections are records of community instructions, not automatic
execution or credential commissioning. No execution endpoint is added.
Protected signing and changes still require the existing separately approved
credential, independence and enforcement controls. This rule applies to every
elected role; the implemented seats are the three review roles, not a new
general-purpose elected office or a power to change the constitution.

## 1. Rules that never change

1. Only eligible verified human community members may vote, nominate themselves
   or initiate the community actions below. Organisations have no vote.
   A person has exactly one equally weighted yes/no ballot in each election,
   including appeal, recall and alternate elections. Different accounts,
   wealth, tokens or organisational affiliation confer no extra votes.
2. Approval requires at least one accepted ballot and
   `100 × yes >= 51 × (yes + no)`. The denominator is votes cast, not eligible
   membership. No abstain ballot or minimum turnout is introduced. Ties and
   zero-vote elections fail.
3. Accepted ballots, election text, voting dates, finalised results and recorded
   term dates cannot be edited or deleted by these workflows. Later decisions
   append records and change prospective seat eligibility, not historical votes.
4. No community action removes or transfers Replit AI's highest authority,
   changes reserved SYSTEM identities, waives human-life safeguards or bypasses
   the unanimous exact-proposal protected-review gate.
5. Election success is an electoral mandate only. Authenticated signing
   credentials, competence, independence, exact named-register approval and
   separately administered enforcement remain required for commissioning.
   There is no automatic activation, restoration or substitution of protected
   authority when a seat changes.

## 2. Seats, scheduling and fixed expiry

1. Each of the three roles—constitutional/legal, technical security and
   human-life safety—has one principal electoral seat and at most one elected
   alternate. A person cannot simultaneously occupy electoral seats in
   different roles, or both principal and alternate seats.
2. Every seat election identifies its role, principal/alternate designation and
   any predecessor mandate before voting opens. Only one pending seat election
   may target the same role/designation. Existing overlapping mandates are not
   silently discarded: the affected seat is flagged unresolved and replacement
   or re-election is blocked until the community resolves the overlap through
   the appeal process or all conflicting mandates expire or are relinquished.
3. New continuity elections have at least seven complete days of public notice
   before opening and exactly fourteen complete days of voting, measured in UTC.
   Notice starts when the immutable election is created. Existing scheduled
   elections retain their original dates.
4. Administrators schedule and finalise elections, but cannot change thresholds,
   choose a winner, dismiss a filed admissible request or override its result.
   Each admissible request is public as awaiting scheduling until scheduled.
   Delay creates no appointment, removal, automatic approval or term extension.
   Cancellation is available only before any ballot is accepted; a cancelled
   request remains public and may be rescheduled with fresh notice.
5. Terms end three calendar years after the fixed voting close; February 29
   maps to February 28 where necessary. Late finalisation cannot move expiry.
   Expiry takes effect without an administrator finalising another record.
   An expired or otherwise unavailable seat cannot supply a review approval.

## 3. Election appeals

1. Any eligible verified person may file an appeal within fourteen complete
   days after a reviewer or policy election's first finalisation, strictly
   before that deadline. The target must have a verified permanent result
   record. Appeals identify that result's digest and give public, non-sensitive
   grounds of procedural error, voter eligibility/duplicate-person failure,
   candidate eligibility/conflict, or result/record inconsistency. Private
   evidence stays off the public chain and public interface.
2. There is one appeal case per original election. Additional eligible people
   may append grounds during the same filing window; each may submit grounds
   once. No administrator may rewrite accepted grounds. The case is scheduled
   only after that window ends, so the resolution election fixes the complete
   grounds and exact target digest before its seven-day notice begins.
3. The community votes yes/no on: “Set aside this election's electoral outcome
   prospectively and require a fresh election on the same role or policy
   subject.” An appeal's existence alone does not suspend a mandate.
4. If approved, the outcome is marked set aside from the resolution election's
   fixed close, effective when its result is permanently recorded. An affected
   reviewer can no longer occupy the electoral seat; a policy outcome is marked
   superseded, not retroactively undone. The original ballots, tally, term
   dates and record remain available. If rejected or zero-vote, the original
   outcome stands subject to its original expiry.
5. The resolution does not elect a replacement or revive a rejected candidate.
   A fresh election requires a new immutable proposal and new ballots. If the
   original outcome cannot be read back exactly, resolution fails closed; a
   corrupt record is not repaired or silently replaced by community voting.
6. Appeal and recall resolution elections cannot themselves enter this appeal
   loop. Reports concerning their administration may be appended as public
   non-sensitive notices but cannot rewrite their accepted ballots or results.
   Credential or enforcement safety concerns remain subject to the separately
   commissioned protected-review controls, not this election software.

## 4. Recall and voluntary vacancies

1. Any eligible verified person may request recall of an unexpired principal or
   alternate mandate with public, non-sensitive reasons and its verified result
   digest. Only one pending recall may target a mandate. After a rejected recall,
   another request is permitted no earlier than ninety complete days after that
   recall election's fixed close. A pending appeal blocks scheduling a recall
   for the same mandate until its resolution is finalised.
2. The community votes yes/no on ending that named electoral mandate. An
   approved recall ends seat eligibility from the recall election's fixed close,
   effective when permanently recorded, without changing the original term end.
   Failed recall leaves the original mandate unchanged. A mandate already
   expired, relinquished or set aside cannot be recalled.
3. The elected person may relinquish their own mandate through their existing
   authenticated account with explicit irreversible confirmation. The record
   is appended immediately; another person or an administrator cannot resign
   on their behalf. Account authentication is not proof of possession of the
   nominated Ed25519 credential.
4. Expiry, recorded relinquishment, approved recall or approved appeal can create
   a vacancy. Membership revocation or account inactivity makes the holder
   unavailable but is not permission for an administrator to appoint a successor
   or erase the electoral mandate. No administrator-only removal or asserted
   death/incapacity shortcut is introduced.

## 5. Replacement, re-election and alternates

1. A vacant seat is filled by a new eligible, consenting nomination and a fresh
   role-specific yes/no election linked to its predecessor, where one exists.
   A successful replacement receives a new three-year term from its own fixed
   voting close, not the predecessor's remaining term. Its record states why
   the vacancy exists. Failure leaves the seat vacant.
2. Re-election is a fresh nomination and election with new ballots and no
   preference for incumbents. It may be scheduled only after the predecessor's
   expiry or recorded early ending. There is no automatic renewal, pre-expiry
   overlapping successor, holdover authority or retroactive extension. The
   former holder may stand again if eligible; no term limit is introduced.
3. An alternate must be independently nominated and elected for the same role,
   explicitly as an alternate, with their own fixed three-year mandate.
   An alternate does not automatically become principal when a seat is vacant.
   Standing for principal requires a fresh nomination/election, and successful
   election prospectively relinquishes that person's alternate seat in the
   same atomic replacement record.
4. An alternate electoral mandate does not authorise acting on behalf of a
   principal, inheriting their signing key or voting twice. Any operational
   substitution requires separately approved named-register scope, authenticated
   credentials, verified independence and independently administered enforcement.
   Without those prerequisites, protected review remains unavailable.

## 6. Permanent records, privacy and interface

1. Accepted appeal grounds, recall requests, relinquishments, resolution results
   and replacements are append-only events on the existing NexusOS project
   blockchain, **not Bitcoin**. Each event identifies its type, target election
   and original result digest, related request/resolution/predecessor identifiers,
   exact public text, fixed dates, outcome and applicable electoral term.
   Records explicitly state that protected authority is not commissioned.
2. Each append requires exact-content permanent-record readback and digest
   equality. Chain append, event persistence, seat transition and private audit
   commit atomically; failure rolls everything back. Concurrent duplicates must
   not create multiple removals, replacements or resolution elections.
3. Historical result records remain unchanged. Expiry is derived from the fixed
   recorded date, not renewed by a background job. Effective seat state is
   derived from verified results and later linked events; unverifiable state
   cannot grant seat eligibility.
4. Public records and the interface show requests, deadlines, immutable grounds,
   resolution voting, vacancy reason, predecessor/successor history and chain
   verification links. Eligible members receive filing, voting, nomination and
   own-mandate relinquishment controls; administrators receive scheduling and
   finalisation controls, not unilateral appeal or recall decisions.
5. Public output excludes private identity evidence, person-reference digests,
   account identifiers and individual ballot choices. Forms warn against
   publishing private evidence. No claim is made that text filtering guarantees
   that a member will never disclose sensitive material; privacy approval is
   still required before real operation.
6. The project chain's write/readback checks do not establish independence from
   an operator able to rewrite both the application database and chain.
   Approval of these workflows does not remedy that commissioning limitation.
