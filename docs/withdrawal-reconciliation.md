# Reserved withdrawal reconciliation

This is a founder-reviewed **operator tool**, not a retry worker, balance
correction, public endpoint, or permission to test funded accounts. No schema
migration, production operation or real provider call was performed to build
it. `P2P_PAYMENTS_RELEASED` and existing account restrictions are unchanged.

## Evidence and eligibility

Only `processing` / `unknown` obligations are eligible. For an outbox batch,
select the exact queue ID; its parent may still be `queued`. An older,
queue-less Lightning withdrawal is eligible only when its original BOLT11 is
present and any existing `payment_hash` matches that invoice's decoded payment
hash. Conflicting historical identities are refused, not overwritten.
Historical pending/failed records are not revived or reinterpreted.
Existing signatures, amounts, memos, reservations and ledger history remain.
Every batch leg must have a positive integer amount and the same owner as the
parent. The sum of **all** legs, including already-paid/refunded legs, must
equal the parent reservation exactly. Inconsistent historical batches are
refused at both inspection and application; founder approval cannot override
this arithmetic check or authorize an unsupported refund.

The supplied read-only adapter supports:

- **Blink BTC outgoing transactions**: authenticated
  `walletById.transactionsByPaymentHash`, exactly one SEND record, exact
  original invoice and decoded payment hash, BTC account, amount and stable
  provider transaction ID. Success additionally requires a preimage whose
  SHA256 equals the invoice payment hash. Incoming RECEIVE transactions and
  `lnInvoicePaymentStatus` are never used. Only an explicit final FAILURE
  outgoing record without contradictory settlement proof can authorize a
  refund. A pending result, missing record, HTTP error, timeout, conflicting
  attempts or unverifiable amount cannot.
- **Coinos outgoing history**: JWT-authenticated `/me.id` must equal the
  reviewed account. Authenticated `/payments` history must contain exactly one
  negative `lightning` entry whose `hash` is the original BOLT11. Its `amount`
  is signed principal sats (fees are separate), `confirmed` must be strictly
  `true`, and `ref` must be the SHA256-verified payment preimage. The payment
  `id` is the stable reference. Nonzero tips are refused. History pagination
  is bounded to 1,000 rows; repeated IDs, duplicates, malformed pages or an
  exhausted bound fail closed, even if an apparent match was seen.
  There is **no Coinos rejection/refund path**: the public invoice's `received`
  field, lack of a history entry and unconfirmed records are not outgoing
  rejection evidence.
- **Alby Wallet API outgoing settlements**: authenticated `/user/me.identifier`
  must equal the reviewed account. `/invoices/{payment_hash}` can return
  **either direction**; only `type: outgoing`, `currency: btc`,
  `state: SETTLED`, `settled: true` with the exact invoice/hash, integer principal
  sats, stable `identifier` and SHA256-verified preimage is accepted.
  Conflicting `value` or `r_hash_str` aliases are refused. There is **no Alby
  rejection/refund path**: this deprecated API does not document authoritative
  failed outgoing semantics; `CREATED`, expiry, unsettled and 404 remain reserved.
- **LNbits authenticated outgoing Payment details**:
  `/api/v1/payments/{payment_hash}` must include authenticated `details`,
  with the exact wallet ID, invoice/hash and negative integer principal amount
  in **millisatoshis**. Fractions of a sat and unsafe JSON integers are refused,
  not rounded. Fees are separate. `checking_id` is the stable reference.
  `details.status: success` plus `paid: true` and a SHA256-verified preimage
  establishes payment. There is **no LNbits rejection/refund path**: the status
  endpoint returns an already-failed local row without rechecking the funding
  source, and the payment service can later discover that this failed row was
  actually paid. Even matching `details.status: failed`, top-level `status:
  failed`, `paid: false` and no preimage cannot establish definitive rejection.
  Public `paid: true` alone, legacy `pending: false`, timeouts, missing details,
  or pending/contradictory statuses never establish outgoing proof.
  The account includes the configured instance URL as well as wallet ID,
  preventing a different LNbits instance from being substituted during review.
- **Bitcoin/Esplora**: a transaction observed by Blockstream, its raw
  transaction ID, the exact destination script, net amount and output index.
  Every spent prevout must belong to the independently founder-reviewed
  service script, verified against fetched previous raw transactions.
  An unrelated incoming payment to the destination is insufficient.
  Existing `btc_txid`, if present, must match. There is **no on-chain
  rejection/refund path**: absence, replacement claims and failed lookups do
  not prove that the reserved payment failed.

Other providers, missing original invoices, mixed service inputs, fee-inclusive
amounts not matching the reserved principal, conflicting historical invoice
identities, and unverifiable evidence fail closed. Do not substitute an incoming
invoice checker or hand-edit statuses to work around a refusal. A different
provider adapter requires its own reviewed read-only outgoing evidence mapping.
No adapter creates invoices, sends payments, signs transactions or broadcasts.

The original invoice's checksum and payment hash are decoded locally. The
stored original invoice is the obligation, not a newly submitted invoice.
References: [Blink proof-of-payment API](https://dev.blink.sv/api/proof-of-payment)
and [public schema](https://github.com/blinkbitcoin/blink/blob/main/core/api/src/graphql/public/schema.graphql).
Preimages and credentials are verified in memory and never included in
inspection output or the audit proof.

### Durable identity for new Bitcoin attempts

The Bitcoin worker claims only unattempted `queued_btc` rows. It constructs and
signs locally **without submitting**, then checks the exact destination output,
amount, service-only change and ordered input identities. A single
`btc_withdrawal_prepared` audit record holds a versioned attempt ID, parent
reservation ID, locally computed txid, output index/script/address/amount, and
each selected service input's txid/index/value/script. This is a local
construction review, not a new founder approval or proof of payment.

The append-only journal and parent's `btc_txid` commit together with
`synchronous_commit=on`, using existing tables; no migration is required.
Committed journal contents are read back and compared before the signed bytes
can leave the process. Signed bytes, private keys and raw provider errors are
not journaled. Existing amount, memo, signature and balance/counters are not
changed. There is no automatic attempt deletion, replacement or resend.

A prepared record proves intended identity only, **not that submission
occurred**. A crash after claiming but before preparation leaves `processing`
without submission. A crash after preparation, lost commit acknowledgement,
timeout after submission or final write failure leaves the obligation
`processing`/`unknown`, preserving any committed identity. Neither state is
selected by the worker, even if no provider observed the txid. Submission uses
one provider call: an ambiguous response does not trigger fallback broadcasts.
A provider-reported txid must equal the locally computed one.

For journaled withdrawals reconciliation additionally requires that exact
attempt's txid, destination output and every input identity/value/script,
independently checked against observed raw transaction/prevout evidence.
Journal rows participate in the reviewed snapshot, so changed attempts
invalidate approval. Conflicting or malformed attempts fail closed. Older
withdrawals without a journal retain the founder-reviewed historical evidence
path described above. Missing broadcast evidence never releases reserved sats.

No application workflow was started for these tests: startup can run wallet
workers against configured accounts. Verification uses mocked providers and a
disposable Unix-socket-only PostgreSQL cluster, never an app database or funds.

### Provider contracts checked on 2026-10-28

- [Coinos API documentation](https://www.coinos.io/docs) documents authenticated
  account details and sent/received history, but does **not** specify terminal
  outgoing failure or a full history response schema. Its linked GitHub server
  repository returned 404 during this work. The history mapping was therefore
  checked against Coinos's own publicly served client:
  [payment view](https://coinos.io/_app/immutable/nodes/88.Cxza8Uv0.js),
  [history/export view](https://coinos.io/_app/immutable/nodes/40.mLiUvP9h.js),
  and [account layout](https://coinos.io/_app/immutable/nodes/3.B8A7KyT_.js).
  These map `hash` to the invoice, `ref` to the preimage, negative amounts to
  sent payments, `confirmed` to settlement, user identity to `id`, and network/
  platform fees separately from principal. Strict acceptance plus cryptographic
  preimage verification is intentional; alternate/older response shapes remain
  reserved rather than guessed. These versioned client URLs may eventually be
  removed; reverify the provider contract before extending accepted shapes.
- [Alby account reference](https://guides.getalby.com/developer-guide/developer-guide/alby-wallet-api/reference/api-reference/account)
  and [invoice reference](https://guides.getalby.com/developer-guide/developer-guide/alby-wallet-api/reference/api-reference/invoices)
  document identity, direction, sats and settled semantics. This adapter targets
  the **deprecated Wallet REST API**, not Alby Hub or Nostr Wallet Connect.
- [LNbits payments documentation](https://docs.lnbits.com/api/core/payments)
  describes the authenticated endpoint and statuses, but its human-readable
  amount-unit summary says sats. The actual
  [Payment model](https://github.com/lnbits/lnbits/blob/main/lnbits/core/models/payments.py)
  exposes raw `amount` as msat (`sat` divides by 1,000), with negative values
  meaning outgoing. The
  [authenticated endpoint](https://github.com/lnbits/lnbits/blob/main/lnbits/core/views/payment_api.py)
  scopes details to the authenticated wallet; the
  [payment service](https://github.com/lnbits/lnbits/blob/main/lnbits/core/services/payments.py)
  distinguishes backend failure from unknown/pending, with timeouts remaining
  pending. However, its `_verify_external_payment` can discover that a locally
  failed payment was actually paid, whereas the status endpoint immediately
  returns cached failures. Consequently that endpoint cannot authorize refunds.
  The adapter follows the typed implementation, not the conflicting
  documentation summary. Deployments without these authenticated settlement
  details are deliberately refused. At the shared verifier boundary, only
  Blink is permitted to produce rejection evidence, regardless of a reader's
  `definitive` claim.

## Review and approve

Use an authorized maintenance session. Pause workers and drain in-flight wallet
requests before reviewing records, especially where historical duplicates need
investigation. Do not start the application merely to run this tool; it can
start funded payment workers. The CLI imports the database handle only, not the
application server or processors.

Prepare a private JSON review-request file (do not commit account/payment data).
The following is a **shape**, not an executable plan or a funded test:

```json
{
  "target": { "kind": "lightning", "transactionId": 123, "queueId": 456 },
  "request": { "kind": "lightning", "provider": "blink", "account": "<BTC-wallet-id>" }
}
```

For a queue-less Lightning record omit `queueId`. For Bitcoin:

```json
{
  "target": { "kind": "bitcoin", "transactionId": 123 },
  "request": {
    "kind": "bitcoin",
    "provider": "esplora",
    "account": "<independently-reviewed-service-output-script-hex>",
    "txid": "<reviewed-64-lowercase-hex-txid>",
    "vout": 0
  }
}
```

`account` is a public script or provider wallet identifier, **never a private
key or seed**. Review it independently; do not copy a script from an arbitrary
claimed payment and call it the service wallet. Blink uses the existing
BLINK_API_KEY/BLINK_KEY/BLINK_TOKEN or supported connection-string configuration.
No credential is accepted on the command line or in the review file.

For the additional Lightning providers keep `kind: lightning` and set:

| Provider | Reviewed `account` | Server-side read credential |
| --- | --- | --- |
| `coinos` | Exact authenticated `/me.id` | `COINOS_JWT`, or JWT-form `COINOS_TOKEN`; never NIP-98 fallback |
| `alby` | Exact authenticated `/user/me.identifier` | `ALBY_ACCESS_TOKEN`, with account and invoice read access |
| `lnbits` | `<canonical-https-instance-base>#<wallet-id>` | `LNBITS_URL` plus `LNBITS_INVOICE_KEY` (not the admin key) |

For example, a **synthetic** LNbits account is
`https://lnbits.fixture.invalid#fixture-wallet`. The instance base has no trailing
slash, embedded credentials, query or fragment. Only the server-configured
HTTPS instance is contacted; the review file cannot choose a fetch host.
All REST evidence requests are GET-only, reject redirects and have bounded
timeouts. No credentials are printed or requested from funded accounts for tests.

```sh
npx tsx scripts/reconcile-withdrawal.ts inspect <private-review-request.json>
```

Inspection is read-only and returns the exact transaction/batch snapshot,
`snapshotHash`, sanitized proof and `proofHash`. The founder must review the
obligation, original reservation, provider/account identity, outcome, historical
duplicates, and specific proof. For partial batches, review one ambiguous leg
at a time and inspect again after each applied transition; changes to another
leg invalidate the old snapshot.

An independently authorized, privileged database operator records that exact
founder approval in the existing `audit_logs` table:

- `id`: new UUID; `user_id`: actual founder Nexus admin account;
- `action`: `withdrawal_reconciliation_approved`;
- `resource`: `withdrawal`; `resource_id`: transaction ID as text;
- `status`: `success`;
- `details`: the following strict object:

```json
{
  "reconciliationKey": "<unique-explicit-key-at-least-8-characters>",
  "target": "<exact target OBJECT from inspection>",
  "request": "<exact request OBJECT from inspection>",
  "snapshotHash": "<inspection snapshotHash>",
  "proofHash": "<inspection proofHash>",
  "reason": "<independently verified review reference and reason, 20+ characters>",
  "expiresAt": "<short future ISO-8601 UTC expiry>"
}
```

Replace the illustrative target/request strings with the actual objects.
There is deliberately no automatic approval-writing command or unauthenticated
approval API. Knowing a founder ID is not authorization: database access is
privileged, and the operator must verify the founder's actual approval.
Do not alter an existing approval to make a failed reconciliation pass.

## Apply exactly once

```sh
npx tsx scripts/reconcile-withdrawal.ts apply lightning <approval-audit-uuid> <exact-key>
# or, only for a reviewed on-chain obligation:
npx tsx scripts/reconcile-withdrawal.ts apply bitcoin <approval-audit-uuid> <exact-key>
```

Application locks the approval/role and the parent plus queue rows, compares
the exact reviewed snapshot, fetches and verifies outgoing evidence again,
and requires the same proof hash. Competing reconcilers serialize on a
transaction-scoped advisory lock; a proof cannot resolve a second obligation.
Historical duplicate outgoing identities are refused, not merged or deleted.

The terminal transition and `withdrawal_reconciliation_applied` audit proof
commit together. A definitive Lightning rejection additionally commits the
exact per-invoice arithmetic refund, counter reduction and refund ledger entry
in that same transaction. Missing wallets/counters or any failed journal/audit
write roll everything back. Paid legs never refund; ambiguous legs stay
reserved; batch parents complete only when every leg is paid/refunded.
An exact retry after success returns `already_applied` without calling the
provider again or mutating balances, even after later wallet activity.
Other stale/expired/changed approvals require new inspection and approval.
The CLI's refusal message does not authorize a resend; if a client loses the
commit response, inspect the applied audit record or retry the exact approval.

## Isolated verification

```sh
node_modules/.bin/node node_modules/vitest/vitest.mjs run \
  --config vitest.p2p-security.config.ts
npm run check:types
```

The reconciliation suite starts its own disposable PostgreSQL cluster with
`-h ''`, connects by unique Unix socket, and deletes it afterward. It never
imports application startup/database/credential modules. All provider calls,
invoices, preimages, raw transactions, approvals and accounts are synthetic.
The config also poisons `DATABASE_URL` with an unreachable TCP address. The
suite is excluded from publish/database-free test runs. Verification does not
establish production provider availability, funded-account state or solvency.
