# Wallet wave communications

The authenticated `/api/messages/wave` endpoints share the existing wallet,
WNSP registry, lambda message storage, election continuity guard and project ledger.
Private sends require accepted friendship or explicit recipient consent; explicit
refusal overrides friendship. No websocket event is sent to the public `vm-feed`.
Inbox/outbox refresh every 15 seconds; delivery means durable inbox availability,
not a claim that a human read it. A receipt is an explicit authenticated account
acknowledgement, verified against the stored project-ledger record.

Private content, addresses, subscriber lists, salts and identity evidence are never
published in these ledger records. Private messages and receipts use independently
random 256-bit salts. The private database holds the salts for authorised verification;
this protects the public commitment from content guessing, not from database operators.
Public broadcasts permanently publish the exact deliberately approved text and topic.
This is the NexusOS project blockchain, not a Bitcoin inscription or payment.

## Instructions and delivery

A prose commission may be deliberately received by its live elected holder but
does not permit automated interpretation or broadcasts. To approve a broadcast,
the community must vote on an exact JSON commission instruction such as:

```json
{"protocol":"wallet-wave-broadcast/v1","publicBroadcasts":[{"topic":"technical-security","content":"The exact public announcement approved by the community."}]}
```

Submit the JSON as the sole commission-request ground in the existing election
continuity form. The scheduled vote retains its fixed constitutional question,
target and digest, followed by that exact JSON. Multiple grounds or prose are not
interpreted as broadcast authority. Instructions must fit the existing
4000-character commission limit. Each template can
be published only once. The topic must equal the holder's mandate scope. Every new
delivery checks the immutable instruction projection, latest approval, live seat,
expiry, recall/appeal state, active membership, wallet ownership and identity/role
authorisation. Election approval grants neither independent policy, protected
authority nor automatic payment. No charity or trust-representation authority is
conferred by these reviewer-only broadcasts.

Subscriptions are opt-in, dynamic and wallet/account-bound. Future registered wallets
can subscribe to still-live broadcasts without mass fan-out. Unsubscribe immediately
removes availability and prevents new acknowledgements. Historical committed records
are not erased by consent withdrawal or recall; receipts remain private.

Every wave send/broadcast/commission request requires a UUID retry key. Keep the
same key and payload when the outcome is unknown. A replay returns the committed
result; different content with the same key fails. Replays do not perform another
delivery. Receipts have a unique communication/recipient pair. Message, commitment,
ledger append and receipt state changes commit or roll back together.
The legacy `/api/messages/send` accepts the same retry key; old clients without one
remain compatible, but must be upgraded to supply a key for safe network retries.

## Independent identity dependency

The real-person verification task is awaiting a provider decision. Commission
actions therefore fail closed with HTTP 424 until server bootstrap installs
`installCommunicationIdentityAuthorizer` from
`server/governance/communication-identity-gate.ts`. This is an integration seam,
not a manual substitute or an admin override. The provider must check independent
human verification and **separate** current reviewer-role authorisation, including
revocation and expiry, using the supplied transaction client. It must throw on
failure and must not disclose identity evidence. Existing community membership,
profiles, lattice keys and marketing alone cannot unlock communications authority.
Private friend/consent messaging does not claim human verification and remains usable.
Trust-role authorisation belongs to its own platform and is never inferred here.

## Setup and tests

`migrations/wallet-wave-communications.sql` is additive and transactional.
`scripts/apply-wallet-wave-dev.ts` applies it only in development; the post-merge
script invokes it after existing community migrations. Production schema changes
must use the approved publish process, never app-startup or build-time migration.
Integration tests use temporary isolated schemas and synthetic users; they must
never broadcast to the live community.
