# Dependency remediation status — updated 2026-10-28

**Status: the fresh platform dependency scan reports zero vulnerabilities.**

Replit's technical team identified the missing source in its reply supplied
by the founder: `nexus_wallet_package/requirements.txt` is scanned recursively
and resolved independently of the root `uv.lock`. The earlier inventory
mismatch was not evidence of a confirmed platform bug. It compared two
different dependency resolutions.

The nested manifest now includes explicit unconditional security floors:

| Dependency | Minimum allowed version |
| --- | --- |
| aiohttp | 3.14.4 |
| anyio | 4.14.2 |
| certifi | 2026.10.19 |
| h11 | 0.16.0 |
| Pillow | 13.0.0 |
| idna | 3.15 |
| pycryptodome | 3.19.1 |

The aiohttp minimum exceeds the initial support recommendation of 3.13.4:
later advisories already present in the original inventory require 3.14.4.
The wallet package is preserved, not deleted, and the root `pyproject.toml`
and `uv.lock` are unchanged. These requirements intentionally constrain the
separate package's resolution; they were not installed into the root runtime.

A new qs advisory appeared during the follow-up. The direct dependency and
lockfile were updated to 6.16.1, with the override referencing the direct
dependency to prevent version-range conflicts.

## Current verification

- Fresh platform dependency audit: zero critical, high, moderate, low or
  informational findings.
- `npm audit --json`: zero vulnerabilities.
- Independent Python 3.11 resolution of the wallet requirements succeeded.
  A read-only OSV query of all 78 resolved package versions reported no
  advisories. This was a resolution check, not an installation or live-wallet
  functional test.
- Regression tests protect all seven security floors in the nested manifest.
- TypeScript check passed.
- Full production build passed: 4,359 tests passed, two skipped, followed by
  successful client/server compilation, bundle limits, required preloads and
  the production startup-artifact check.
- The development workflow restarted and opened its expected ports. Only the
  unauthenticated research notice/loading view was inspected; the signed-in
  interface and live-wallet operations were not tested.

No scan was disabled and no finding was dismissed. No app was published by
this task; a clean dependency scan is not proof of a successful production
release. The AI-agent and migration implementation hold has not been lifted.

## Earlier remediation — 2026-10-24

| Dependency | Previous version | Installed version | Findings removed by fresh platform scan |
| --- | --- | --- | ---: |
| happy-dom | 20.11.1 | 21.0.4 | 1 high |
| multer | 2.4.0 | 2.5.0 | 1 high |
| undici (jsdom override) | 7.30.0 | 7.30.1 | 1 high, 2 moderate |

The manifest and npm lockfile contain the updates. The existing jsdom major
version is preserved. `npm audit --json` reports zero vulnerabilities across the
installed npm dependency tree, including development dependencies.

## Historical findings before the nested-manifest fix

The earlier platform dependency scan after npm installation reported **159 Python
findings: 11 critical, 64 high, 64 moderate and 20 low**. All five npm findings
above disappeared. The remaining reported versions still disagree with the
active development interpreter and current `uv.lock`:

| Package | Platform-reported version | Active interpreter and current lockfile | Remaining findings |
| --- | --- | --- | ---: |
| aiohttp | 3.9.5 | Absent from both | 76 |
| anyio | 4.9.0 | Absent from both | 4 |
| certifi | 2026.7.22 | 2026.10.19 in both | 2 |
| h11 | 0.9.0 | Absent from both | 2 |
| idna | 3.9.0 | 3.20 in both | 2 |
| pillow | 9.5.0 | Absent from both | 71 |
| pycryptodome | 3.9.9 | Absent from both | 2 |

Default and isolated Python metadata agree on these package versions and
absences. The read-only OSV check of actual installed distributions and current
lockfile (`npm run check:python-security`) reports no advisories. That does not
establish the inventory of the publishing environment.

The legacy `uv.lock.dev` contains certifi 2025.11.12 and pillow 12.0.0,
not the platform-reported versions. It does not explain these findings.
No unused Python dependency was added to disguise the mismatch, no finding
was suppressed and no security gate was bypassed.

## Compatibility checks

- TypeScript check passed (`npm run check:types`).
- Full production build passed, including the database-free test phase
  (4,352 tests passed, two skipped), bundle limits, required module preloads
  and the production startup-artifact check.
- Happy DOM's module compiler did not execute a malformed import-alias
  initializer from the reported injection path.
- The undici copy used by jsdom rejected incorrect integrity hashes and accepted
  correct hashes for lowercase, uppercase and mixed-case SHA-256 tokens.
- Multer handled a rejected multipart request while another asynchronous
  `fileFilter` callback remained pending; the process survived and answered a
  subsequent health request.
- The development application restarted and opened its expected ports. The
  unauthenticated preview showed the research notice and loading state; the
  signed-in interface was not verified.

The earlier request for inventory provenance is now answered by Replit's
identification of the nested requirements file. The current scan above verifies
the dependency remediation; production publishing and runtime verification are
separate.
