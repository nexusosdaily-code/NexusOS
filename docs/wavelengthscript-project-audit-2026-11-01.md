# Project audit and rerun — 1 November 2026

## Outcome

**The identified Python collection blocker is resolved.** All 399 Python tests
pass, including all original tests and 27 additional regression cases. The
fresh server/client build gate passes 8,922 tests, with 51 existing skips, and
all remaining project structural checks pass.

The original audit findings and verification snapshot are retained below,
followed by the recovery results. No dependency release was advanced during
this repair.

This is an internal code and test audit, not an independent security review.
It does not certify operator-inaccessible privacy, physical-device media
compatibility or financial readiness.

## Scope and fixes

Reviewed the bounded 0.15.0 Map/Set windows, retained package/source-lock
boundaries, and the recently merged offline export-resolution safeguards.
No change was needed to the native algorithms or earlier release sources.

Resolved issues exposed by the wider rerun:

1. **Build runner depended on `npx` shell configuration.** An isolated run
   failed before tests because the wrapper required an absent configuration
   variable. The build now invokes installed Vitest with `process.execPath`
   and an explicit argument vector. Projects, worker limits and the unreachable
   test database remain unchanged. A mocked execution test verifies actual
   invocation and database substitution without running services.
2. **Two safety tests assumed the old shell-command spelling.** Updated their
   assertions for the explicit runner; suite-discovery, project selection and
   database-exclusion checks remain enforced. The security discovery assertion
   parses the command's TypeScript syntax and checks the complete argument list.
3. **Three database fixtures relied on `public.blockchain_blocks`.** They
   failed against an empty database. They now create a reviewed synthetic table
   in their own test schemas from `tests/fixtures/blockchain-blocks.sql`, rather
   than cloning an existing application table. The election fixture also
   explicitly supplies its existing default principal designation.
4. **Python lacked its test runner.** Declared and locked pytest and verified
   the installed runner. Temporarily enabled managed dependency synchronization,
   then restored the existing no-sync setting. Installing the runner exposed
   the missing-module blockers below; it did not make those suites pass.

No runtime wallet, governance, authentication, encryption or broadcasting
behavior was changed.

## Initial audit verification

| Check | Result |
| --- | --- |
| Full server/client run inside `npm run build` | **8,916 passed; 51 skipped**, across 241 passing and four skipped files |
| Database project against fresh socket-only PostgreSQL | **340 passed; two skipped**, across all 15 files |
| Collectable Python suites | **52 passed** |
| Remaining `test:all` structural checks | Passed system-band, Vitest setup, handler wiring/imports, all probe-guard layers, channel count and project type checks |
| Changed build/CI test strict type checks | Passed with the project's ES2020 settings |
| Changed integration test strict type checks | Passed with ES2022 libraries matching the installed Node runtime |
| Generated WavelengthScript sources | Matched canonical programs |
| Client and server build | Passed |
| Bundle budgets | Entry 34.0 KB gzip / 35 KB limit; React vendor 59.0 KB / 70 KB limit |
| Wave Vault production navigation artifact | Passed |
| Required modulepreloads | Passed |
| Production startup artifact | Passed: no historical balance repairs or development startup migrations |
| Public landing-page preview | Loaded before stopping the development server |

The collectable Python suites were `test_wnsp_protocol.py`,
`test_spectral_gateway.py` and `test_security_finding_triage.py`. Passing these
individually does **not** replace the failed full Python collection.

The full `test:all` components were exercised through the build's server/client
gate, a separate disposable database run, and its remaining named checks.
The old managed `test:all` workflow was not restarted against the configured
application database; its historical failed status is not a new passing run.

## Initial Python collection failures

The initial `python -m pytest tests` run stopped with **15 collection errors**, including
missing imports of:

- `contract_generator`, `oracle_sources`, `signal_generators`;
- `task_orchestration`, `transaction_dag`, `validation`, `wavelength_map`;
- third-party packages `sqlalchemy` and `pandas`.

The named source modules were absent from the then-current tracked files, and
the recent earlier tree inspected also lacked those paths. A subsequent search
farther back in Git history recovered the original implementations. No affected
test was deleted, excluded or marked skipped to hide these failures.

## Recovery follow-up

Restored 17 original modules from the historical tree `722e5a91` into
`python_legacy/`, retaining its historical license notice. Pytest explicitly
adds that directory to its import path; the website's runtime path does not.
See [the compatibility library guide](../python_legacy/README.md) for scope,
configuration and limitations.

Declared, locked and installed the actual missing libraries, including
SQLAlchemy, pandas, Numba, NetworkX, bcrypt and Streamlit. ReportLab supports
real PDF output. Managed installation supplied the required native libraries;
the existing no-sync startup policy was restored afterward.

The original test suite passed 372 cases after recovery, but source review also
found historical print-only handlers that fabricated successful delivery and
report IDs. Those implementations were replaced, not accepted as completion:

- Real SMTP submissions and configured HTTP adapter requests, with explicit
  acceptance receipts and rejection/error paths.
- Durable notification/scheduling queue files labelled **queued**, not
  delivered or posted. No daemon or campaign was activated.
- Reports querying real persisted simulation records and writing actual
  JSON/HTML/PDF files.
- Real bounded filter/map/aggregation results without arbitrary Python `eval`.
- Explicit failures when configuration, records or receipts are missing.

Database helpers require a separate `LEGACY_DATABASE_URL`, never the
application database URL, and no schema is created on import. Automatic database
failure logs no longer include private SQL parameters or exception traces.
No live login route, funded wallet writer or broadcasting behavior was added.

The follow-up full build also exposed two timing-sensitive tests. The complete
browser-source audit now has a local timeout appropriate to an I/O audit, with
all patterns and assertions retained. The synchronous two-branch probe-alert
test now seeds recent hits rather than hits one second from expiry; its alert
count and synchronous timestamp assertions are unchanged.

### Final verification

| Check | Result |
| --- | --- |
| `npm run test:python` | **399 passed**, no collection errors or skipped tests |
| Fresh full server/client run inside `npm run build` | **8,922 passed; 51 existing skips**, 241 passing files and four skipped files |
| Client/server build, bundle budgets, Wave Vault navigation, preloads and startup artifact | Passed |
| All remaining named structural/type checks from `test:all` | Passed |

The Python runner clears inherited application credentials and uses disposable
SQLite/cache settings. Tests inspect actual submissions to loopback SMTP/HTTP
receivers and actual output files; they do not contact real messaging or social
providers. Python external DNS/TCP connections are guarded against during tests.
The local transport checks are not claims of downstream external delivery.

One upstream AnyIO pytest-plugin deprecation warning remains nonblocking.
The initial disposable-PostgreSQL result above is retained as the earlier
database snapshot, not represented as a new database run during this recovery.

## Boundaries and remaining warnings

All test commands used synthetic settings rather than application credentials.
Database tests used disposable local socket-only clusters, removed afterward.
The development application was stopped before package installation and left
stopped to avoid restarting funded background workers just for verification.
Signed-in UI and physical phones were not verified.

Vite still reports large optional chunks. The enforced entry/vendor budgets
pass; that is not a statement that total page JavaScript equals the entry size.
Opt-in/skipped browser tests are not represented as passing physical-device
checks.

No GitHub push or merge was performed as part of this audit.
