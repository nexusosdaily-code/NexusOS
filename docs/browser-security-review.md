# Browser and contract security review

Historical review: the browser-token limitation below is superseded by
[`browser-session-hardening.md`](browser-session-hardening.md). For the resolved
dependency inventory discrepancy, see
[`dependency-remediation-status.md`](dependency-remediation-status.md).

This is a security-only change under the founder's development halt. It does
not authorise feature expansion, promotions, publication, or real wallet tests.
It covers our website in desktop and mobile browsers, not the entire device.

For the subsequent independent inventory audit, additional package fixes,
live read-only checks and outstanding correctness findings, see
[`practical-security-assessment.md`](practical-security-assessment.md).

## Controls implemented

- Browser compilation rejects source over 65,536 characters and programs over
  2,048 instructions. The browser interpreters and server execution have a
  2,048-cycle budget. These are software resource limits, not hardware claims.
- Compilation failures are shown to the user instead of leaving a program
  available to run as if the new compilation succeeded.
- Public contract viewing and local previews remain available. Persistent,
  financial and external server actions require the authenticated contract
  owner; the page explains this and requests confirmation before execution.
- Contract actions require JSON, reject browser cross-site requests, and have
  an authenticated-user rate limit.
- Server execution rechecks wallet restrictions. It records the caller, uses
  a unique request ID to reject repeat execution, and locks the contract row.
- State changes, NXT debits, queued transfers and execution audit records use
  one database transaction. Errors roll them back. External kernel effects
  are dispatched only after commit, with the existing safety-permit checks.
- Funding uses one transaction and a conditional, exact-decimal wallet debit.
  Contract transfers reject non-finite, malformed or overly precise amounts.
- The execution route explicitly rejects unsupported sats-transfer effects
  rather than silently ignoring them.
- Private execution-history requests are limited to the contract owner.
- Vite and Vitest were updated to compatible patched versions.

## Verification boundaries

Unit tests use synthetic accounts, wallets and query responses. Additional
PostgreSQL integration tests now execute the actual route bodies against a
fresh, private, temporary PostgreSQL cluster with no TCP listener. They never
use the application's DATABASE_URL. The cluster contains a minimal synthetic
schema and balances, not copied accounts or funds, and is removed afterwards.
Authentication, wallet-hold decisions, VM output and external delivery remain
fixtures in this suite: this does not verify the entire production integration.

`npm run test:contract-security:postgres` verifies concurrent execution,
duplicate execution IDs, simultaneous funding of the same and different
contracts sharing a wallet, eight-decimal arithmetic, audit-trigger failures
and full rollback. A separate database connection verifies execution records
are committed before the external-delivery stub runs.

Browser tests exercise the actual compiler and interpreter functions, including
the existing Python-to-WavelengthScript pipeline. The Playwright check at
`scripts/test-browser-contract-security.mjs` also verifies desktop and mobile
confirmation cancellation, one uniquely identified request on acceptance,
visible rejection, disabled non-owner execution and local Debug access.
All API responses in that browser context are synthetic; all mutations are
intercepted. It does not sign in to a real account or verify a real founder
session. Phone-width execution controls were corrected after this check found
they extended beyond the viewport.

The interpreter uses an allowlisted instruction switch, not evaluation of
arbitrary JavaScript. It still runs in the page's JavaScript context: this change
does not introduce a separate-origin execution sandbox. A compromised browser,
device or same-origin script remains outside these guarantees. Existing
JavaScript-readable authentication tokens have not been migrated here.

Database commit and external message delivery are not a single atomic
transaction. Existing asynchronous kernel effects can fail after commit;
exactly-once external delivery is not claimed.

## Remaining findings — no system-wide all-clear

The dependency scanner still reports 10 critical and 64 high alerts, all Python,
including aiohttp, anyio, certifi, h11 and Pillow. No npm alerts were returned.
The reported aiohttp, anyio, h11, Pillow and pycryptodome distributions are
absent from the active project interpreter and were not found in the searched
workspace manifests or local installation metadata. The scanner provides no
originating manifest path. Re-running it after upgrades still reports the old,
different certifi and idna versions. These findings are unresolved, not
dismissed or proven harmless.

The actual installed certifi and idna packages were updated and checked using
the active Python interpreter: certifi 2026.10.19 and idna 3.20. The lockfile
records them. UV_NO_SYNC was restored after the update. Installed runtime
versions and scan inventory must not be represented as the same evidence.

The application's runtime is now the locally installed Node 22.23.4 package.
This is a patched release identified by the official October 21, 2026 advisory:
https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
The managed module catalogue still offers older versions, so the npm dev,
build and start commands explicitly select the local binary. The running
development process executable was checked; the full build and tests also ran
under that runtime. Publishing configuration now selects those npm commands,
but nothing has been published and the live deployment has not been upgraded
or verified. The shell/module bootstrap Node version is not the application
runtime and remains older.

The static scanner flags the founder sign-in cookie as possible session
fixation. Inspection shows the cookie comes from a newly server-created,
cryptographically random session after the BTC-secret check, not from a caller
chosen cookie value. Existing founder authentication is preserved. The
dataflow scanner also flags a physics demo's “energy budget” stdout message;
that is a scientific quantity, not a financial budget.

No claim of complete device security, production verification, or independent
penetration testing is made.
