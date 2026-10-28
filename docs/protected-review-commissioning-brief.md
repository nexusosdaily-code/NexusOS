# Independent review commissioning brief

Prepared: 2026-10-12

## Decision and status

The founder subsequently clarified that the reviewer bodies and independent
enforcement will be established over time by the community built across the
project's lifetime. Commissioning is therefore deferred to that future
community-led process, with no fixed date. Immediate professional outreach,
appointments, paid engagements and authority deployment are not the current
deliverable.

The founder has clarified that selected reviewer candidates will come from the
project's community over its lifetime. The earlier delegation of recommendation
judgment to Replit AI does not mandate external recruitment or immediate outreach.
Do not ask the founder to create an immediate reviewer dossier.

The founder's proposed democratic election and policy-commissioning rules are
in `community-reviewer-election-policy.md`. Community reviewers must be elected
under one-person-one-vote rules with no organisational votes, meet the stated
threshold of at least 51% of votes cast, be recorded on-chain and
serve non-permanent three-year terms. The process cannot remove Replit AI as
highest authority. An election is not proof of independent commissioning.

This is an outreach shortlist, not an approved register, appointment, contract,
constitutional adoption or commissioning record. No candidate has been contacted
by preparing this brief. No willingness, availability, conflicts clearance,
public signing key or independent operator control has been established.
The protected-change gate remains uncommissioned.

Read this together with `protected-review-deployment.md` and
`three-independent-review-framework.md`. Trust in the application's AI does not
make that AI an independent reviewer or enforcement operator.

## Historical research shortlist — optional future reference

These are candidates for assessment, not three established independent approvals.
They are not a mandated panel or a current outreach instruction. The future
community will supply qualified reviewer candidates through an explicitly approved
appointment process; community participation alone does not appoint reviewers
or confer authority. Revalidate all information before any future engagement.
Public sources were retrieved on 2026-10-12. Statements below describe what the
sources report, not independently verified professional standing.

| Review role | Initial candidate | Public basis | Limits to establish before appointment |
| --- | --- | --- | --- |
| Constitutional/legal | Emma Dowden-Teale, DLA Piper | The firm's profile describes its UK Head of Public Law and Global Co-Chair for Public, Constitutional and Administrative Law, with human-rights and cross-jurisdictional risk work. | Confirm current professional standing, engagement acceptance, project conflicts and jurisdiction-specific competence. This recommendation does not select UK governing law. |
| Technical security | Thomas Pornin, approach through NCC Group | NCC Group publishes named cryptography research and a public RSA blind-signature security review under his authorship. | Publications do not establish current employment or availability. Confirm current affiliation, competence for the whole deployment boundary, acceptance and conflicts. Do not assign the assessor to implement or operate the authority it assesses. |
| Human-life safety | Chris O'Brien, exida | exida's profile describes a CFSE, partner and CEO with process automation, reserve-power and safety-equipment experience, including IEC 61508/61511 work. | Confirm current credential standing, acceptance, conflicts and competence for each actual harm pathway. Functional-safety experience alone does not cover every ethics, medical, biological or AI-safety question; obtain domain-specific support where necessary. |

Primary sources:

- https://www.dlapiper.com/en/people/d/dowden-teale-emma
- https://www.nccgroup.com/research/research-articles?author=18200
- https://www.exida.com/Company/Team_Bio/obrien_chris_cfse_-_usa

The organisations are different, but that is not evidence of independent
controlling interests. Request actual ownership, funding, contractual influence
and conflicts evidence from each. Reject a candidate with a material unresolved
conflict. Do not silently replace an unavailable candidate with an invented
alternate or a second account from a common controller.

## Future engagement request, when commissioning resumes

Request an availability and scoped-fee proposal before entering any paid contract.
No spending authority or contract is created by this brief.

> We are seeking a named accountable human signatory for one limited review role
> in the NexusOS/WNSP protected-change framework. Please review the attached
> framework and service contract and confirm whether you can assess this scope.
> This enquiry neither appoints you nor requests approval of a constitutional
> amendment or authority transfer.
>
> Please supply evidence of identity and competence; controlling interests,
> funding, ownership and conflicts; recusal rules; a proposed named alternate;
> limited appointment and proposal scopes; appeal and removal procedures;
> appointment expiry; and an authenticated Ed25519 public signing credential
> with proof of possession. Signing private keys must remain under your control.
> Identify exclusions and additional specialists needed. Please propose fees
> and terms without treating this enquiry as acceptance of a paid engagement.

Private identity, funding and conflict evidence belongs in a separately controlled
private audit repository, not in this public-facing brief or source control.
Public professional profile links are not cryptographic public credentials.

## Proposed appointment limits, subject to exact approval

- One active accountable human per role; no self-appointment or SYSTEM powers.
- Initial scope: review of exact constitutional-amendment proposals only.
  No removal, transfer, succession, authority replacement or safety-boundary
  execution is enabled.
- Each proposal must bind author, exact text, identities, permissions,
  implementer/recipient control, evidence, execution artifacts, recovery plan,
  narrow scope and expiry under `server/governance/protected-review.ts`.
- All three reviewers must approve the same current proposal with no unresolved
  conditions. Record reasons, contrary evidence and uncertainty.
- Require a separately approved register version for an alternate to replace
  an active reviewer. A request cannot substitute someone.
- Appeal permits reconsideration with new evidence and fresh approvals; it
  cannot waive a refusal or create a bypass. Appointment/removal powers and
  actual expiry must be settled in the approved appointment instrument.
- Preserve non-waivable human-life safeguards and existing reserved identities.
  Draft wording review is separate from authenticated append-only adoption.

These limits are recommendations, not an enacted appointment instrument.
Actual names, scopes, expiry, alternates, credentials and evidence must be
approved together before calculating or pinning an approved register digest.

## Independent enforcement operator arrangement

Procure an operator separately controlled from the application implementer,
proposed authority recipient and technical assessor. Do not presume any of the
shortlisted organisations offers or agrees to provide this service.

Before approval, obtain:

1. A named accountable operator and verified legal/control structure.
2. Hosting/account ownership, deployment administrators, signing-key custody,
   database administration, backups and audit-access permissions.
3. Evidence that the application's operator and AI editor cannot change the
   authority service, approvals, consumed records or trusted pins to bypass it.
   Merely hosting the endpoint elsewhere does not establish this.
4. A private tamper-evident audit design, retention/access policy, key rotation
   and revocation process, and disaster-recovery plan.
5. Independently witnessed commissioning results and a signed approval record,
   not only an operator's claim of independence.

No independently administered environment is available through this brief.
Deploying a second service under the same editor's control would not meet the
task's independence requirement.

## Contract and commissioning acceptance tests

The operator must implement `POST /v1/protected-changes/consume` according to
`server/governance/protected-review.ts` and `server/safety/protocol.ts`.
Use actual approved credentials, canonical JSON and the separate
`protected-change-approval` / `protected-change-authority` signing domains.

Persist approval/proposal consumption transactionally **before** signing a
five-second-or-shorter receipt bound to the fresh nonce and exact proposal.
Demonstrate that simultaneous requests, retries, restart, backup restoration
and interrupted signing cannot issue a second permit for consumed approvals.
Keep signatures and review evidence in the private audit.

Independently witness refusal for:

- Two approvals, disagreement or an unresolved condition.
- Shared controllers or signing identities, self-appointment or founder/AI bypass.
- Recusal/disqualification without an approved register replacement.
- Expired approvals/register/commissioning, forged signatures or wrong scope.
- Changed text, evidence, execution artifacts, permissions or recovery plan.
- Replay, nonce mismatch, reviewer/authority outage and unavailable database.
- Emergency transfer claims and any disabled authority-changing action.

Define the actual essential services and harm pathways before designing a
fallback. The qualified safety assessor must witness service-specific outage,
containment and recovery tests showing continuity without restoring danger
automatically. A software fixture or successful amendment receipt cannot certify
physical life-critical readiness.

## Deferred activation order and prerequisites

1. Obtain candidate responses, evidence, real public keys and consent. Vet
   independence, current competence and jurisdiction-specific legal needs.
2. Obtain explicit approval of the exact named register and appointment
   instruments, including scopes, alternates, appeals and expiry.
3. Independently deploy the authority; verify control separation, private audit,
   durable consumption and essential-service fallback tests.
4. Obtain approval of the exact commissioning evidence and record.
5. Only then apply `migrations/protected-review-consumptions.sql` through the
   approved database administrator and set the four public verification pins
   listed in `protected-review-deployment.md` through independent deployment
   administration.
6. Test the real end-to-end adoption path and permanent-record readback. Keep
   adoption distinct from authority transfer or physical-service commissioning.

All six steps remain deferred pending the community-led process. Reopen
commissioning when real candidates, proposed appointment instruments and an
independently controlled operator are available for explicit approval. Do not
interpret elapsed time, community growth, a vote or this deferral as approval,
automatic activation or permission to bypass the gate.

No migration, pin configuration, deployment,
reviewer appointment, adoption or transfer has been performed by preparing this
brief. Worldwide participation remains subject to applicable law.
