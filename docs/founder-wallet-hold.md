# Founder-controlled wallet hold

The founder requested an indefinite outgoing hold on the existing UncJuddy
application account. The default hold applies in the new build even when the
old withdrawal flag is false. There is no expiry and no startup balance repair.
It does not change allocations, keys, wallet ownership, or balances.

Protected outgoing HTTP wallet routes reject with HTTP 423. The shared NXT
balance updater also refuses debits. Incoming credits and balance reads remain
available, while automatic sweeps, queued Lightning invoices, BTC withdrawals
and Rune payouts are held without consuming retry attempts.

The spectral-bundle creation handler also checks the holder at its execution
boundary, independently of HTTP URL matching (including rune-only and sats-only
requests). The additive `migrations/founder-wallet-hold.sql` adds database
triggers for direct NXT and sats debits, increasing reservations/withdrawal
counters, wallet ownership changes/deletion, and held spectral-bundle mutations.
These triggers cover raw SQL and Drizzle updates that bypass the shared updater.
They serialise held execution against the same audited Nexus release rule.
Credits remain allowed. A denied statement raises an error, so its enclosing
transaction rolls back rather than silently skipping a debit.

Only Nexus, using the existing BTC-secret session, can explicitly release the
hold. `/api/admin/wallet-lock/uncjuddy` provides authenticated GET status and POST
changes. A release requires `locked: false` and
`confirmation: "RELEASE UNCJUDDY WALLET"`. Relocking requires `locked: true` and
`confirmation: "LOCK UNCJUDDY WALLET"`. The flag and audit entry commit in the
same database transaction. Other administrators and the old withdrawal toggle
cannot release this hold. Audit failure rolls back the change.

For full live enforcement, apply `migrations/founder-wallet-hold.sql` in an
explicitly approved production maintenance migration and publish the new build.
The development bootstrap and post-merge setup never migrate production.
Publishing the new build is required for live enforcement. Development changes
do not alter the published account. This is an application-custody hold, not a
freeze of Bitcoin addresses or keys that someone controls outside the app.
It also cannot reverse an already-broadcast transaction.
