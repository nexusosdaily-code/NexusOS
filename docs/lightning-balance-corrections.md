# Authorized Lightning balance corrections

Application restarts must not restore or reset a wallet. The old startup repairs
have been removed; this does **not** reverse any already-corrected balance.
Production startup schema migrations in `server/index.ts` are disabled. Apply
needed schema migrations as a separate reviewed deployment operation.
`npm run build` checks the generated production entrypoint for the removed repairs
and development migration body. `npm run check:startup-corrections` also checks
the existing bundle used by `npm start`; this check is included in `test:all`.

## Historical baseline — not a current target

The removed phantom-deposit repair recorded a baseline of **961 sats available,
49,961 sats deposited, and 0 sats withdrawn**. These figures describe a historical
correction, not today's balance and not authorization to apply it again.
The older integer-overflow restoration also no longer runs: deposits minus
active stakes is not a complete account reconciliation.

Never infer an approved balance from these numbers alone. Deposits, withdrawals,
swaps, transfers, fees, staking/unstaking, collateral, liquidity activity and
previous corrections since the historical baseline must be accounted for.
Do not delete or alter historical transaction records to make totals match.

## Review (read-only)

Use the maintenance CLI against the **intended** database, through the existing
secure database configuration. Do not put credentials in command arguments:

```
npx tsx scripts/correct-lightning-balance.ts inspect <user-id>
```

This uses a consistent read-only transaction. Its output contains private ledger
records: review it securely, do not commit it or publish it. It includes a SHA-256
snapshot hash and exact string amounts. Missing tables or wallets fail explicitly;
the tool never creates schemas or supplies a fallback balance.

An authorized reviewer must verify provider deposits and withdrawals against the
application ledger, include pending payments, reconcile every other activity,
and verify original approvals and any agreement restrictions. Internal ledger
totals alone do not prove external payments. Record references to the reviewed
evidence, not credentials, invoices or private documents themselves.

If the current balance is valid, **leave it alone**. There is no need to reapply
the old baseline or manufacture a new adjustment on restart.

## Record explicit approval

The trusted database operator records the founder's explicit approval in the
existing `audit_logs` table as a separate, manually authorized maintenance
operation. The application provides no unauthenticated approval endpoint.
Database access is privileged: never treat a submitted founder ID as proof of
authorization. Verify the actual founder's approval before recording it.

Approval fields:

- `user_id`: the approving existing **Nexus admin** account, not the affected user.
- `action`: `lightning_balance_correction_approved`
- `resource`: `lightning_wallet`
- `resource_id`: affected user ID
- `status`: `success`
- `details`: the following JSON (replace placeholders with reviewed values).

```json
{
  "correctionKey": "unique-stable-incident-key",
  "userId": "<affected-user-uuid>",
  "snapshotHash": "<64-hex-character-hash-from-inspect>",
  "target": {
    "satsBalance": "<reviewed-nonnegative-integer-string>",
    "totalDeposited": "<reviewed-nonnegative-integer-string>",
    "totalWithdrawn": "<reviewed-nonnegative-integer-string>"
  },
  "reason": "<explanation-of-the-error-and-the-authorized-remedy>",
  "evidence": {
    "deposits": "<verified-provider-and-ledger-deposit-review-reference>",
    "withdrawals": "<verified-provider-and-ledger-withdrawal-review-reference>",
    "otherActivity": "<swaps-stakes-transfers-fees-collateral-review-reference>",
    "priorApprovals": "<original-approval-and-restriction-review-reference>"
  },
  "expiresAt": "<short-lived-UTC-ISO-timestamp>"
}
```

Use one stable correction key for the incident across retries and environments.
Do not change the key to bypass an already-applied result. Do not edit an
existing approval: changed account activity requires a newly reviewed approval,
with the same incident key if it has not been applied.

The CLI consumes an existing approval; it cannot generate its own authorization.
Only administrators with independently verified approval and existing database
write privileges should record approval entries. Restrict access to the audit
table and preserve its history.

## Execute once

Arrange a brief maintenance window, pause wallet processors, and drain in-flight
wallet requests before application. The short transaction locks affected tables
to exclude concurrent inserts/updates while verifying the snapshot; it times out
after five seconds rather than waiting indefinitely. Drain requests because a
handler that read a balance *before* the lock might later write stale values.

```
npx tsx scripts/correct-lightning-balance.ts apply <approval-audit-uuid> <exact-correction-key>
```

No automatic retry, startup hook, environment toggle or default target exists.
The process requires a currently valid recorded founder-admin approval,
explicit confirmation, and an unchanged snapshot (including wallet counters,
timestamps, ledger rows and restrictions). It atomically updates reviewed wallet
values, records a signed `balance_correction` ledger adjustment, and records the
approval ID, evidence, before/after values and the one-time marker in `audit_logs`.
It never changes account activation, withdrawal blocking, or NXT locking.

A retry after success returns `already_applied` without changing balances, even
if legitimate activity happened afterward. Audit/ledger failures roll everything
back. Changed activity or expired approval requires a fresh review, **not** an
override. Inspect again afterward to verify the resulting values and audit trail.

No production balance was corrected or production schema changed as part of
implementing this process.