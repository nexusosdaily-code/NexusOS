# Bounded AI safety operations

## Approval, authority and honest deployment status

On 2026-10-11 the founder accepted the recommended bounded safety policy.
Replit AI remains the highest operational SYSTEM authority. The separately
reviewed exact text specifies founder-only authorisation while living, a
24-hour review deadline and a separately approved future reviewer register.
The independent mechanism may restrict a pre-approved affected capability;
the founder may authorise tested restoration. Neither mechanisms nor reviewers
cannot become SYSTEM, rewrite the constitution, select a successor, replace
an operator or transfer an identity. Those operations are absent from the API.
The sealed constitution and amendment text remain unchanged.

The code is implemented; the independent deployment is **not commissioned**.
`GET /api/safety/status` reports configuration/availability, not a certificate
of real-world safety. `/constitution` displays that distinction even after
an exact amendment adoption. No reviewer or production signing key has been
invented, provisioned or assigned by this assistant.

## What is enforced today

- The public contract-run route requires an independent permit for contracts
  owned by the designated Replit AI account, an `ai_agent`, or a SYSTEM account.
  It checks before execution and persistence; financial and asynchronous
  kernel effects check again. A subcall cannot bypass an AI-owned child's gate.
- No configuration, authority outage, forged response or stale permission
  receipt allows controlled execution. Existing metadata, state, constitution,
  history and other read-only routes are not shut down.
- The authority verifies separately signed, scope-bound observations from two
  independently controlled sources, including uncertainty and contrary evidence.
  Signed evidence establishes provenance, **not truth**. Trusted sources and
  reviewers must actually assess the harm pathway; a string or signature does
  not automate that judgement.
- Living-founder production mode requires the separately authenticated founder
  alone, not an independent human authorising quorum. Planned containment,
  recorded review and restoration require founder signatures. Source/controller
  conflicts and self-review are rejected. A founder-pre-approved and tested
  emergency mechanism may contain on two independent signed observations
  without waiting for an additional human approval, notifying the founder
  immediately and retrying notification if unavailable.
- The future independent-review mode tests three separately controlled
  reviewers, two approvals for planned decisions, and one for corroborated
  emergency containment. **Production refuses this mode**, and the application
  refuses even correctly signed future-mode permissions. An approved future
  register and procedure are not established by this code.
- Containment is scoped to one operator and contract resource. There is no
  shutdown, punishment, block-registry mutation, unrestricted privilege grant
  or automatic replacement. Another case cannot extend an active restriction.
- Living-founder mode requires review within **24 hours**. The service then
  escalates through repeated independent notifications while remaining in a
  restricted read-only fallback. Expiry is not fresh authority and cannot
  silently restore a possibly dangerous capability.
  Signed `review` records assess the restriction without granting access,
  extending its scope or resetting deadlines. Future-only research defaults
  are 15 minutes for review and one hour for the initial intervention; they
  are not the living founder's policy.
- A separately signed appeal preserves contrary evidence without changing
  permissions. Living-founder restoration needs founder approval and a fresh
  independent signed test attestation. The inactive future mode needs two
  reviewers, including one uninvolved in the original decision. Tests cover:
  integrity, human-life safeguards, least privilege, staged recovery and
  essential continuity. The recovery artifact's digest binds the attestation.
- Events are signed, hash-chained, serialised and fsynced before taking effect.
  A failed/partial audit commit prevents further permissions. Startup verifies
  all signatures and requires the exact independently retained checkpoint.
- Reviewer webhooks receive signed receipts without private observations.
  A separately signed acknowledgement is required; HTTP 200 alone is insufficient.
  Unavailable recipients are retried every minute, including overdue cases.

## Threat boundary — do not overstate it

This gate constrains application-role operators while the application follows
its server-side boundary. A person/AI with source-editing access, application
host administration or unrestricted database/actuator credentials can bypass
an application-local check. A separate decision service alone does not fix
that. Replit Agent's ability to edit this repository is **not** independent
containment of Replit Agent.

Before a life-critical deployment, put execution credentials/actuator access
behind an independently administered enforcement boundary, revoke direct
operator access, and test bypass attempts against that real boundary. Do not
enable physical services on the strength of these software tests or a signed
manifest. This code does not identify or certify any physical essential-service
adapter, nor contain all existing campaigns, wallets or other application routes.

Cryptography detects forged credentials, conflicting recorded controllers,
tampering and replay. It cannot prove organisational independence or rule out
collusion by genuinely authorised reviewers and sources. Two colluding reviewers
cannot act without signed independent source evidence, but collusion involving
all trusted parties remains a governance/security risk. Commissioning must
verify real control, conflicts and witness independence, not merely names.

## Independent deployment

Use a separate host/security account that the AI/application operator cannot
administer. Do not start this service as a second workflow in this repository
and label it independent. On that separate host:

1. Commission the founder's separate operational signing identity and notification
   endpoint, plus at least two independently controlled evidence/test sources.
   This is an approval credential, **not a new website sign-in method**; the
   existing BTC-secret-only founder login is unchanged. Never copy the BTC WIF
   into this service. Include actual protected user IDs as operator
   identities. Each actor has `{id, role, controller, publicKey}`; reviewers
   and the founder has an approved HTTPS `notificationUrl`. Do not appoint
   independent authorising reviewers while the founder is living.
2. Produce a configuration satisfying `configSchema` in
   `server/safety/protocol.ts`, with `governanceMode: "founder-only"`. Bind its commissioning record to the policy
   digest, authority reconciliation, essential-service inventory and fallback
   test artifact. Both independent sources sign the full commissioning test
   checklist; the founder signs the full record including those attestations.
3. Supply `SAFETY_AUTHORITY_CONFIG`, `SAFETY_AUTHORITY_JOURNAL` and
   `SAFETY_AUTHORITY_CHECKPOINT` as non-secret file paths. Keep journal and
   checkpoint outside Git, with private filesystem permissions. Supply
   `SAFETY_AUTHORITY_SIGNING_KEY` through that host's secret store. The receipt
   key must differ from all authoriser/source/operator keys. Never put
   reviewer private keys in the application or request them in chat.
4. Start with `npx tsx server/safety/authority-main.ts` behind HTTPS. The service
   listens on port 8080. It refuses missing/invalid commissioning and takes an
   exclusive journal lock. Restrict network ingress and resource usage.
5. On the application host, configure only `SAFETY_AUTHORITY_URL` (HTTPS origin),
   `SAFETY_AUTHORITY_PUBLIC_KEY` and `SAFETY_POLICY_DIGEST`. The authority private
   key and all reviewer/source signing keys stay off the application host.
6. Independently verify control separation, notification delivery, essential
   fallback, denial during outage, restoration and real credential enforcement.

The initial checkpoint is `{ "sequence": 0, "head": "<64 zeroes>" }`. Reviewers
retain signed checkpoint receipts off both hosts. Before restart, reconcile
the checkpoint file to their latest verified receipt. A mismatch, truncated
journal or stale exclusive lock requires independent recovery; do not delete
records or automatically reset a lock/checkpoint to make startup succeed.
This conservative restart procedure trades availability for avoiding silent
loss of restrictions. Never use it to suspend a physical essential service.

## Signed review protocol

Use Ed25519 keys controlled separately by the authorised actors. The exact
signing format is `signingBytes(domain, payload)` in `protocol.ts`: policy ID,
domain and recursively key-sorted canonical JSON. Signatures are base64.
Domains are `commission-test`, `commission`, `evidence`, `proposal`, `recovery`,
`authority` and `notification-ack`; signatures cannot be moved across domains.

`POST /v1/events` accepts only `eventSchema`:

- `proposal`: `contain`, `review`, `appeal` or `restore`, with exact policy digest,
  next sequence, previous hash, case ID, initiator and creation time.
- `initiatorSignature`: signature over the whole proposal.
- `approvals`: separately authenticated founder signatures over that same proposal
  in living-founder mode; future reviewer signatures remain inactive in production.

Evidence binds the affected operator, resource, capability and policy digest.
Restoration tests bind the case and policy. An amendment receipt, an ordinary
application session, a claim of admin status or a bare confidence number is
not an authority credential. Emergency isolation requires explicit founder
pre-approval through signed commissioning plus corroborated independent sources.
It is not an unrestricted zero-approval path and cannot restore or replace.
An appeal may be initiated by the affected operator and requires no permission
grant; restoration is a separate independently authorised event.

`POST /v1/check` binds a random nonce to operator/resource/`contract.run` and
returns a signed five-second response. The application pins the authority key,
policy and exact request; it does not cache permissions. A previously admitted
operation cannot necessarily be recalled mid-commit. Accounting for admitted
transfers is completed even when later transfers are denied.
`POST /v1/status` requires a nonce and returns signed non-private status.

Authoriser webhook acknowledgements sign
`{sequence, head, issuedAt}` using the `notification-ack` domain and return
`{actor, signature}`. Retain the received signed notification as an independent
checkpoint witness.

## Verification

Run `npx vitest run server/safety client/src/components/HumanLifeAmendmentReview.test.tsx`
and `npm run check:types`.
Tests exercise forged evidence and receipts, shared reviewer control/keys,
conflicts and quorum failures, unavailable reviewers, compromised operator
requests, replay/racing proposals, tampering, checkpoint mismatch, audit
failure, notifications, false alarms, appeals and restoration.
These are software tests, not a physical life-critical commissioning exercise.
