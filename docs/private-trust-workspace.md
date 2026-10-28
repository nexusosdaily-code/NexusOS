# Private family and charitable trust workspace

## Boundary and legal status

This is an authenticated private preparation and review room, not a legally
established trust. Family trusts serve private lineage/beneficiary purposes;
charitable trusts serve public-benefit purposes. A shared review process does
not merge their purposes, property, beneficiaries or legal obligations.
Qualified local counsel must privately confirm the governing law and authorised
instrument. Three independent instrument reviews are internal preparation
records only. Protected constitutional or SYSTEM authority changes still need
the separate commissioned enforcement described in
`three-independent-review-framework.md`; this workspace cannot execute them.

There are no wallet transfer, pooled-key, wallet-owner assignment, electoral
credential or blockchain publication operations. Trusts and organisations
remain ineligible for human votes. Participation does not add a person to the
electoral register. Birth certificates support lineage, not presenter identity.
Independent human verification and separate reviewed role authority are required
on **every** private workspace/evidence access. Administrators and founders have
no bypass. Draft workspace creation is not proof of identity or role authority.

## Shared identity dependency

The independent identity platform must supply a **private database view** named
`private_identity_trust_authority`. This is an explicit integration contract,
not a local manual verification shortcut. Until that platform is connected,
all protected workspace access fails closed with a readiness message.

Columns:

* `user_id` — existing opaque account identifier;
* `workspace_id` — exact private trust workspace UUID;
* `role` — `custodian`, `contributor`, `reviewer` or `reader`;
* `controller_id` — opaque independently verified controlling-interest identifier;
* `verified_human`, `independently_verified`, `role_reviewed` — booleans;
* `identity_expires_at`, `authority_expires_at`, `revoked_at` — timestamps.

Exactly one current row must match account, workspace and requested role.
The platform, not this workspace, validates independent-verifier provenance,
account binding, competence, conflicts, recusal, scope and authority evidence.
It must exclude entity/AI identities and suppress revoked, recused or conflicted
reviewers. Local membership cannot manufacture a view row. A new workspace ID
can be sent privately to the platform for custodian role review; it is not a
legal appointment. Other participants require their exact reviewed role before
a custodian can grant membership. Invitees independently consent before access.

Approvals are bound to the exact immutable record UUID, not a mutable
instrument or just a version label. Author/owner self-review is forbidden;
shared author/reviewer control and duplicate controllers are rejected.
Only three current independently controlled approvals allow private legal
confirmation; reviewer membership, consent and authority are rechecked then.
This gate is not the protected constitutional review service.

## Storage and setup

Apply `migrations/private-trust.sql` through the existing explicit migration
process. The schema is additive; it does not migrate or replace the database.
Production migrations are not automatic on server startup.
Development post-merge setup runs the idempotent, development-only
`scripts/bootstrap-private-trust-dev.ts` under an advisory lock.

Evidence uploads and lineage/beneficiary submissions are deliberately disabled
by default and by the founder's current instruction. `TRUST_EVIDENCE_UPLOADS_ENABLED`
must remain `false` until the founder explicitly approves a later activation.
Configuring storage or adding a key must not activate evidence collection.
The API rejects disabled uploads before JSON parsing, and the service also
rejects evidence and lineage/beneficiary creation. Existing authorised
read/download, deletion, consent withdrawal and retention cleanup remain intact;
discussion and instrument drafts still require working encryption and authority.

For a later approved activation, configure a dedicated `TRUST_EVIDENCE_KEY` secret: a securely generated 32-byte
key encoded as 64 hexadecimal characters. Set it in Replit Secrets, never in
chat, source, scripts, logs or memory. Keep the same key available after deploy
and restart; do not rotate it without an authenticated re-encryption migration.
Neither session secrets nor wallet signing keys are reused.

Configure `PRIVATE_OBJECT_DIR` to an approved App Storage private prefix
(`/bucket/private-prefix`). Upload checks require the bucket's public access
prevention to be **enforced**. Never use local disk, a public bucket or public
upload URLs for evidence. No object paths, signed URLs, original filenames,
personal names or document hashes are returned in public APIs or logs.

All sensitive text/settings use AES-256-GCM encrypted database payloads.
Evidence is additionally AES-256-GCM encrypted before entering private App
Storage. Random nonces and workspace/record associated data prevent substitution.
In-transit protection is provided by the deployed HTTPS endpoint and storage
SDK. Evidence downloads are authorised per request and served as binary
attachments with no-store/nosniff, never active inline documents.
No permanent plaintext copy is written to the filesystem.

The service requires the existing bearer **session**, not a generic API key or
cookie-only request. The shared identity platform is a second, independent
gate, not a replacement login system. Existing founder BTC-secret sign-in is
unchanged.
Authentication and an atomic per-account 60-request/minute budget run before
body parsing. The private JSON parser has a 7 MiB request limit and sanitised
errors, and does not retain a raw-body copy.

## Privacy, audit and retention

Private consent must cover lawful authority to process the subject's evidence,
including lawful guardian consent where a minor is involved, the precise trust
purpose, access by authorised participants, and the chosen retention period.
Do not upload real evidence until the controller has approved its jurisdiction,
processor arrangements, guardian/beneficiary consent and storage/backup policy.
Do not solicit names, birth certificates or legal details in public chat.

Choose 1–365 days for each record. Expired records become inaccessible
immediately and are physically deleted by the hourly sweep. Explicit deletion
and consent withdrawal delete evidence objects and clear encrypted payloads.
Withdrawal works even if independent authority expires. If object deletion
fails, success is not reported and the sweep status becomes unavailable.
Record tombstones and append-only audits retain only opaque identifiers,
action, record reference and time, not private content. These are accountability
metadata, not anonymous data; the controller must approve their lawful retention
and access policy. Database backups and processor replicas have their own
retention; application deletion cannot promise immediate erasure from those.

Workspace settings (private label/law/confirmed instrument reference) are
encrypted administration records, not uploaded evidence. Keep them minimal.
Instrument deletion/expiry invalidates its confirmation. Browser forms use
transient component state, not persistent browser storage or shared query caches.
Operational logs exclude the entire private API's paths and response payloads.
Workspaces have a maximum 365-day lifetime. Expiry immediately blocks reads and
the sweep destroys their settings and any remaining records, then revokes all
memberships. Owner consent withdrawal also destroys the private administrative
settings they created. Erasure of ciphertext does not require decryption keys.
Deleting any private record conservatively invalidates the workspace's
instrument confirmation; it must be separately confirmed again if still lawful.

## Future wallet forwarding

Forwarding is deliberately unavailable. Readiness, lineage evidence, approvals,
registry creation and restart must never trigger funds movement or ownership
changes. A later separately scoped implementation must require authenticated
authorised holders, explicit transaction details, a second confirmation,
applicable legal authority and existing wallet/constitutional safeguards.
