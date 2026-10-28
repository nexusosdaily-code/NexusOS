# Shared sats writer audit

## Safety and release decision

The legacy shared-sats writer inventory and code hardening are implemented.
**This is not permission to use funded accounts, send real payments, or enable
P2P funding.** `P2P_PAYMENTS_RELEASED` remains false. The server refuses new
purchases/tips even if a client bypasses the disabled controls.

The record-capacity migration below has only been exercised in disposable,
Unix-socket PostgreSQL. Before any release, confirm that the reviewed schema
has been applied in the target environment and review the paused capabilities
and reconciliation requirements below. No application database was connected
to by the audit tests. No balances, signatures or old transactions were rewritten.
The application workflow was deliberately not started: starting it with actual
credentials can start payment workers.

## Complete legacy writer inventory

All paths below refer to `server/routes.ts`. The explicit manifest in
`server/legacy-wallet-transaction.ts` wraps the final handler **after** existing
authentication/restriction middleware and fails startup if a route is missing.
It is installed before `registerRoutes` returns. This is not a prefix-wide
transaction around unrelated routes.

| Entry point | Money/state boundary and retry identity |
| --- | --- |
| `POST /api/keys` | Guarded 5,000-sat debit, fee ledger, API-key creation and request marker in one transaction. Secret response is never cached in audit logs; replay reports already processed without charging again. |
| `POST /api/governance/proposals` | Guarded 10,000-sat fee, proposal and ledger/request marker commit together. Validation rejection or proposal failure rolls the fee back. |
| `POST /api/community/mint` | Guarded 50,000-sat fee, inscription queue item, mint row and ledger/request marker commit together. No inscription is sent inside the transaction. |
| `POST /api/lightning/invoice` | Invoice creation has a client retry identity; pending row and original signature are retained. No balance credit at creation. |
| `GET /api/lightning/invoice/check` | Only the owning user's deposit row is eligible. Provider-paid confirmation goes through a pending-to-completed CAS and arithmetic credit in the same transaction. |
| `POST /api/lightning/invoice/recheck-pending` | Same shared settlement function; only newly claimed invoice events increment credited counts. |
| `GET /api/lightning/invoice/:hash` | Same settlement function; a withdrawal hash cannot become a deposit. |
| `POST /api/lightning/pay` | Guarded balance reservation, withdrawal record, invoice outbox and retry marker commit together; response says **queued**, not sent. |
| `POST /api/lightning/swap/to-nxt` | Guarded arithmetic sats debit, guarded arithmetic NXT credit and signed swap record commit together. Missing NXT wallet aborts instead of losing sats. |
| `POST /api/lightning/swap/to-sats` | Guarded NXT debit, arithmetic sats credit and signed swap record commit together. The existing counter semantics are preserved, not retroactively reinterpreted as external deposits. |
| `POST /api/lightning/withdraw-to-btc` — Lightning-address branch | Guarded debit, withdrawal, every batch invoice and retry marker commit together. |
| `POST /api/lightning/withdraw-to-btc` — on-chain branch | Guarded gross debit and signed net-withdrawal/fee description commit together. New rows use `queued_btc`, distinct from historically ambiguous `pending` rows. Checksum validation occurs before reserving funds. |
| `POST /api/lightning/send-to-ln-address` | Same transactional batch reservation; saved-address mutation also rolls back on failure. |
| `POST /api/lightning/send` | Guarded debit, arithmetic recipient credit, both signed ledger entries and retry marker commit together. |
| `POST /api/lightning/tip` | Same two-sided transfer boundary with stable client retry identity. |
| `POST /api/lightning/stake` | Guarded principal debit, stake and request marker commit together. Linked collateral uses a nested savepoint. |
| `POST /api/lightning/unstake/:id` | Locked active stake is the identity; principal, yield, stake state and ledgers commit together. Duplicate claims cannot return principal twice. |
| `POST /api/pipeline/step2` | Guarded NXT debit, arithmetic treasury fee credit, sats credit, history/request marker commit together. Missing treasury aborts: fees are not burned. |
| `POST /api/rune-swap/sats-to-rune` | Guarded integer-sats debit, queued Rune obligation and retry marker commit together. Failure to record the obligation rolls back the debit. |
| `POST /api/wnusd/mint` | Guarded sats collateral and NXT fee, treasury record, position and history commit together. |
| `POST /api/wnusd/redeem` | Position state is re-read under the wallet transaction lock. Collateral return and redemption/history are one transaction. Stake-linked collateral must go through unstaking, not a second independent return. |
| `POST /api/wsats/mint` | Guarded collateral/fee, treasury record, position and history commit together. |
| `POST /api/wsats/redeem` | Single-use position transition and arithmetic collateral return/history commit together. |
| `POST /api/lp/add` | Wallet legs, locked shared pool/position changes, delta journal and retry marker commit together. |
| `POST /api/lp/remove` | Same shared pool boundary; missing output wallet aborts rather than destroying the position without payment. |
| `POST /api/lp/swap` | Input debit, locked reserve mutation, output credit, delta journal and retry marker commit together. |
| `fireAutoSweep` — Lightning and on-chain branches | Runs after a newly committed deposit, in a separate per-user/per-deposit job transaction. Guarded current-balance debit, withdrawal and outbox/job marker commit together. It cannot reclaim sats already held or spent in the meantime. |
| Swap-to-sats automatic Lightning sweep | Separate post-commit job keyed to the swap request identity; same guarded reservation/outbox boundary. |
| `processBatchQueue` | Delegates to `server/legacy-lightning-payments.ts`; durable single-worker claim precedes any external call. Per-invoice terminal result, definite-rejection refund and refund journal are transactional. |

### Deliberately paused unsafe capabilities

The following final handlers return HTTP 423 without provider or database
writes. Their old bodies are retained as historical implementation context,
but are **not executable through the registered routes**:

| Route | Reason |
| --- | --- |
| `/api/lightning/sync-blink-balance` | A shared provider's aggregate balance cannot establish which user owns a new deposit. Internal transfers, swaps, holds and withdrawals make the old gap calculation unsuitable for crediting anyone. Use identified invoice events. |
| `/api/rune-swap/rune-to-sats` | A submitted transaction ID is not verified Rune custody, a unique output identity or confirmation evidence. Atomic arithmetic alone cannot make that credit legitimate. |
| `/api/rune-swap/rune-to-nxt` | The same unverified credit could otherwise be converted into sats through a later swap. |
| `/api/admin/fix-ln-balance` | An unreviewed absolute overwrite can invalidate holds and accounting. The separate snapshot-bound, founder-approved correction process is not automatically invoked. |

Non-NXT/SATS LP mutations are paused too: the old helpers did not debit a
backing token ledger for WNUSD/wSATS/NXWV pool legs. No existing position is
deleted or converted. Supporting those pools safely requires an explicit,
reviewed token-ownership/debit model, not silently treating a token as free.

### Adjacent shared writers outside routes.ts

- `server/genesis_user.ts` no longer tops up an existing sats wallet to an old
  allocation on startup. Initial provisioning is distinct from restoring spent,
  staked or held funds.
- `server/wnsp-io-liquidity.ts` claims a watched BTC receipt and credits its
  balance in the same transaction. `ON CONFLICT` is evaluated before any credit;
  a duplicate or failed journal write cannot leave a phantom deposit. Failed
  credits are not marked handled in memory. Unconfirmed events remain eligible
  when they become confirmed. Existing transaction-level receipt granularity
  is preserved; no destructive per-output history conversion was attempted.
- `server/btc-withdrawal-processor.ts` commits a `queued_btc` → `processing` CAS
  before broadcasting. Competing workers cannot send the same obligation twice.
  Historical `pending`, `failed`, `processing` and `unknown` rows are not
  automatically resubmitted.
- The separate approved correction utility retains its reviewed snapshot/CAS
  and transactional audit. This audit does not authorize a balance correction.

## Transaction and idempotency contract

`server/db.ts` exports a transaction-aware database handle. Only explicitly
wrapped handlers and jobs enter `wallet-transaction-context.ts`; storage and LP
helpers using that handle join the same transaction rather than committing a
second, independent write. Explicit nested transactions remain savepoints.
Do not introduce raw pool writes into a scoped handler: they would bypass this
boundary and must have their own reviewed transaction.

A per-user advisory lock serializes legacy requests even before a wallet
exists. Actual sats/NXT rows are locked **before** any balance/position reads;
P2P operations therefore contend on the real wallet rows, not only a
legacy-specific lock. LP reserves are locked before shared-state reads.
Sats debits additionally use `balance >= amount` guards and SQL arithmetic.
The other swap leg uses guarded NXT arithmetic too. A supplemental
before/after/delta audit journal is committed with the mutation.

Mandatory mutations accept `Idempotency-Key` or `requestId`. The key is scoped
to user and route; the request fingerprint includes params and body. Reusing a
key for changed fields returns 409. Success is emitted only after COMMIT.
Handler errors, rejected validations, failed ledger writes or failed request
markers roll everything back. Client retry identities survive ambiguous
network/server errors in session storage; neither amounts nor private request
fields appear in storage keys.

Deposit confirmation also locks normalized invoice/provider identities across
users, so duplicated historical rows are not credited twice. Existing duplicate
records are retained and marked duplicate, not deleted or re-signed.
Outgoing invoices have global normalized identities in the outbox and historical
withdrawal lookup; using a different request key or user does not pay an already
reserved invoice again.

## Unknown outcomes are not failures

- Timeouts, crashes, missing settlement receipts and provider-pending results
  leave funds reserved (`processing`/`unknown`). They are not automatically
  retried, refunded, or described as successful.
- The retry endpoint only kicks never-attempted `queued` work. It does not
  reset old failed attempts or revive refunded items.
- Only an explicit, definitive provider rejection permits a refund. A partial
  batch refunds just the rejected invoice, never invoices already paid or
  whose outcome is unknown. Refund amount, counter change, refund ledger entry
  and queue transition commit together.
- A persistence failure **after** an external success leaves the committed
  processing claim intact; it cannot be mistaken for a failed payment.
- Reconciliation needs trustworthy outgoing payment/broadcast evidence.
  Incoming invoice checks or an error message alone are not sufficient.
  No automated reconciliation or real-provider success was claimed here.

A separate, explicit founder-reviewed operator workflow now resolves eligible
reserved withdrawals using freshly verified outgoing evidence. See
[`withdrawal-reconciliation.md`](withdrawal-reconciliation.md) for the approval
format, read-only provider boundaries, refusal rules and isolated tests. It
does not run automatically, send or re-send payments, or lift any release hold.

These conservative reservations can require human/provider reconciliation.
This is a disclosed safety tradeoff, not a promise that every payment resolves
automatically.

## Non-destructive record-capacity prerequisite

`migrations/20261027_legacy_sats_record_capacity.sql` only widens:

- `rune_swaps.rune_amount`: integer → bigint (the route accepts up to 21T units);
- `rune_swaps.rate`: numeric(10,4) → numeric(20,4) (1,000,000 NXWV/sat did not fit).

All old values remain representable; there are no balance updates, deletions,
deduplication, signatures/history rewrites, or blanket schema pushes.
The migration is not run at server startup or automatically against application
data. The disposable suite verifies exact historical-record preservation and
the newly supported limits. A destructive accounting migration would need
separate approval, not an extension of this file.

## Reproducible verification

```sh
npm run check:types
node_modules/.bin/node node_modules/vitest/vitest.mjs run --config vitest.p2p-security.config.ts
npm run test:client -- client/src/lib/wallet-request.test.ts client/src/components/p2p-market-safety.test.tsx client/src/components/video-stream-revocation.test.tsx
npm run build
```

The isolated PostgreSQL config overrides `DATABASE_URL` with an unreachable
address as a second safety boundary. Each suite starts `initdb`/`pg_ctl` with
`-h ''` in a unique temporary directory, connects by Unix socket only and stops
and deletes the fixture afterward. Providers, credentials, external payments
and signatures are synthetic. Legacy handler bodies are extracted from the
actual source and run behind the real transaction boundary without importing
the application's startup workers. These tests do not establish signed-in
production browser behavior or provider reserve solvency.

Coverage includes concurrent legacy debit/hold and invoice/hold operations;
all modified legacy route families and retries; cross-wallet duplicate invoice
events; invalid inputs; fee/service rollback; missing opposite wallet; collateral
and stake replay; LP state rollback; outbox failure; concurrent worker claims;
unknown payment/broadcast outcomes; definite and partial refunds; failed refund
journals; watched-event replay and the widening migration.

The full build runs the database-free server/client regression projects with an
unreachable database URL. Do not run the project's generic database tests
against an available application database to verify this task.

Security scans found zero dependency vulnerabilities. The static scanner still
reports the existing founder cookie/session-fixation candidate: the cookie
comes from a newly generated signed cryptographic session token, not the
request input; IP/UA are metadata. The low privacy finding is a physics demo's
joule-valued “Energy budget” print, not a wallet balance. Neither finding was
suppressed, and this interpretation is not a claim of universal security.
