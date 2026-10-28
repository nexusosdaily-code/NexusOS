# Practical security assessment — 23 October 2026

This assessment distinguishes confirmed application exposure, development
tooling, public protections and unknowns. It is not a guarantee of complete
security or permission to resume general development, publish, promote the
project or test with real funds.

## Confirmed findings and action

An independent OSV lookup of the actual development Python distributions found
advisories for installed pip, urllib3, cryptography and setuptools. This differs
from the platform scanner's unexplained inventory. The identified advisory
families concern package/archive processing, HTTP proxy/stream handling,
certificate verification and bundled OpenSSL. Installation alone does not
establish that a public application route can exploit them.

The managed installer updated:

| Package | Previous effective version | Updated project version |
|---|---|---|
| urllib3 | 2.6.3 | 2.8.0 |
| cryptography | 46.0.7 | 50.0.2 |
| setuptools | 80.9.0.post0 | 84.2.1 |
| pip | 25.0.1 | 26.2.2 |

The dependency constraints and uv.lock record these requirements. The Python
no-sync startup setting was restored after installation.

**Important pip boundary:** default Python still imports platform-supplied
pip 25.0.1 from the Nix module before the updated project copy. Installing the
new version did not replace that immutable module. `python -I -m pip --version`
selects project pip 26.2.2; the project's managed installation used uv. No
application pip import was identified in this review. This is a remaining
bootstrap/tooling finding, not a demonstrated remotely exploitable WNSP route.
Do not describe every shell Python invocation as patched.

## Independent dependency evidence

`scripts/audit-python-runtime.py` sends only package names and versions to the
OSV batch API. It checks both installed distributions and registry packages in
uv.lock, reports advisory IDs, and fails if the service is unavailable or its
response is incomplete. It never reads credentials or uses application data.

- Default interpreter: 53 distribution names, 27 locked registry packages;
  only legacy bootstrap pip remains flagged by this lookup.
- Isolated interpreter (`python -I scripts/audit-python-runtime.py`):
  53 distribution names and the same lockfile; **no reported advisories** at
  the time of the check.
- `npm audit --json`: **zero reported vulnerabilities**.
- The platform scanner still reports 10 critical and 64 high Python findings
  for a different inventory. Those findings remain unresolved, not suppressed,
  and are not attributed to production or the app without supporting evidence.
- Static/dataflow scans returned the previously reviewed medium session-cookie
  warning and low physics energy-budget logging warning, respectively.

OSV findings are limited to the queried inventories and available advisories.
An isolated-interpreter result does not prove the normal application or the
published runtime is isolated or free of vulnerabilities.

## Protections verified on the live website

Read-only requests to the verified public deployment domains established:

| Check | Observed result |
|---|---|
| HTTPS homepage at wnsp.io and platform-reported primary domain | HTTP 200 |
| HSTS | Present, two-year max-age, includeSubDomains |
| Content-Security-Policy | Present |
| MIME sniffing protection | `X-Content-Type-Options: nosniff` |
| Framing restriction | `X-Frame-Options: SAMEORIGIN` |
| Referrer/permissions policies | Present |
| HEAD `/.env` | HTTP 403 |
| HEAD `/.git/config` | HTTP 403 |
| Unsigned GET `/api/auth/me` | HTTP 401 |

Sensitive-path checks used HEAD only; no file bodies or credentials were read.
These are specific observed controls, not proof that all paths, identities,
GET variants or attacks have been tested.

The live CSP permits inline scripts and broad HTTPS connections. Header
presence is not evidence of a strict script-isolation sandbox or XSS immunity.

## Node.js and publication evidence

Development runs Node 22.23.4, the patched release listed in the official
[21 October advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
The actual executable and explicit npm dev/build/start commands were checked.

Deployment metadata reports a successful public VM deployment. Available
build records include a successful build from 21 October, but do not establish
the currently serving revision or its runtime version. The scoped runtime-log
reader returned an inconsistent “no deployment” error. No Node/Python version
was inferred from HTTP headers, a build timestamp or the development pin.
The live Node patch level therefore remains **unverified**.

Nothing was published, restarted in production, or changed in production
configuration as part of this assessment.

## Safeguard verification

- **75 tests passed** across founder authentication, browser VM bounds,
  server VM conformance and contract-action security.
- **8 PostgreSQL tests passed** in a fresh private temporary cluster with
  synthetic balances. They verify concurrent spending/funding, replay IDs,
  exact decimals, audit failure rollback and commit-before-delivery.
- TypeScript checks passed.
- Local Python API health/protocol smoke checks returned 200, and a synthetic
  cryptography SHA-256 operation passed. Importing this API also starts its
  existing development kernel; it is not a database-isolated smoke test.
- The existing Python protocol suite returned **38 passed, 6 failed**.
  Inspection found expectations concerning legacy dual frames, renamed
  packing fields, spectral-frame totals and a coordinate helper without the
  direction dimension. Neither that protocol nor its tests was changed in this
  security-only pass. This is an outstanding correctness/test-contract issue,
  not evidence of a specific security exploit or validation of physical hardware.

Earlier desktop/mobile browser-fixture checks remain applicable: no frontend
behaviour changed in this pass. They do not establish a real signed-in founder
journey.

## Decision

The evidence supports the specific patched development dependencies and tested
controls above. It does not support an unrestricted security all-clear.
Keep runtime provenance, legacy bootstrap pip, scanner provenance and the six
protocol-test failures explicitly separate. General development and promotion
holds remain in place pending a separate founder decision; publishing requires
explicit authorisation.

## Follow-up resolution of the identified concerns

The founder authorised working through these concerns individually on
2026-10-23. This bounded exception does not lift the wider development,
promotion, publishing or real-fund-test holds.

### Protocol tests — resolved

All 44 tests in `npm run test:protocol` now pass. The six failures were stale
test contracts, not changes needed to the encoding implementation:

- Canonical `frame_count` counts per-character `spectral_frames`; legacy
  `frames` still packs pairs and pads only the last odd pair.
- Packing is reported as `chars_per_dual_frame`, not the obsolete name.
- Totals aggregate canonical frames, not legacy pairs. Odd-length tests ensure
  synthetic padding is excluded.
- The test coordinate helper now includes direction alongside wavelength, OAM
  and polarisation. Bounds and round-trip checks cover all 51,200 labels.

Exact counts, padding symbols, packing ratios and totals remain asserted;
tests were not skipped or replaced with unconditional passes. An unrelated
always-true wavelength assertion was replaced with an actual inequality for
two distinct encoded characters. These are software checks, not evidence of
physical orthogonality, conserved hardware energy or photonic execution.

### Python tooling — patched supported invocation, platform copy remains

`npm run pip:project -- --version` uses `python -I -m pip` and selects pip
26.2.2 in the project installation. It does not modify the application's
import paths or claim to remove immutable platform tools. Package installation
remains subject to managed package tooling/firewall policy.

`npm run check:python-security` checks the selected isolated interpreter and
lockfile against OSV; it returned no known advisories. This does not clear the
older platform pip selected by an unqualified `python -m pip` invocation.

### Runtime — local enforcement added; live verification blocked

The server now checks the actual Node version before starting listeners,
the Python child or explicit background jobs. It accepts reviewed patched
release lines 22.23.4+, 24.22.1+ and 26.12.1+ within their respective major
versions, and rejects other majors, prereleases and malformed versions.
Startup logs record Node and OpenSSL versions without credentials or paths.
These minima reflect the October 21 advisory, not immunity to future flaws.

Seventeen runtime tests passed, including the executable actually running the
tests, bringing the focused security/runtime total to 92. TypeScript passed.
The guard only takes effect in production after an authorised publish; no
public version-disclosure endpoint or authentication bypass was added.

Deployment metadata confirms a successful public VM exists, but the runtime
log API again returns `This App has no deployment.` A successful build or a
local runtime version is not proof of the currently serving executable. No
further identical telemetry retries are useful without new evidence or a
platform fix.

### Scanner provenance — reproducible mismatch, not dismissed

A fresh platform dependency scan still reports the same seven Python package
versions: aiohttp 3.9.5, anyio 4.9.0, certifi 2026.7.22, h11 0.9.0, idna 3.9.0,
Pillow 9.5.0 and pycryptodome 3.9.9. It supplies no originating manifest path.
The scanner result was not rewritten, suppressed or marked harmless.

`scripts/reconcile-python-inventory.py` accepts only a JSON list of scanner
package names/versions on stdin and reports active package locations, versions
and lockfile matches without importing the application. It distinguishes
missing distributions from version mismatches. It is not a production audit.

Official documentation identifies Security Center SBOM export as an inventory
source; obtaining the scanner's originating paths/inventory remains necessary
to close this platform discrepancy. A broad filesystem search was bounded and
timed out; that timeout is not evidence that packages do not exist elsewhere.

### Browser clearance boundary

These fixes do not make the whole browser or phone secure. The earlier
allowlisted VM, action confirmation, owner checks, transactional state handling,
resource limits and public HTTP checks remain the relevant evidence.
Production CSP still allows inline scripts; browser authentication still has
the previously documented same-origin/script-access boundaries. No real
signed-in session, malicious browser extension or compromised device was
verified. Live runtime verification and scanner provenance remain open.

### Completed verification for this follow-up

- Full database-free production build succeeded: **1,458 tests passed in 77
  files**, bundle/preload checks passed, server artifact built successfully.
- The separate Python protocol suite passed all **44** tests.
- The isolated Python OSV audit returned no findings for its stated inventory.
- Static analysis completed, returning only the previously reviewed medium
  founder-cookie finding; dataflow analysis returned the previously reviewed
  low scientific-quantity stdout finding. No new findings were returned.
- The restarted development service logged **Node.js 22.23.4 / OpenSSL 3.5.9**.
- Desktop and 390-pixel mobile browser fixtures passed confirmation cancel and
  accept, unique request ID, visible rejection, non-owner disabling and local
  debugging checks. API calls were intercepted; this is not a real signed-in
  session or real-fund test.
- A mobile screenshot confirmed the public translator route renders. Expected
  unsigned account requests returned 401; no authentication bypass was used.
- The reconciliation script matched five absent distributions and two patched
  version mismatches against the scanner list, and rejects malformed input.

## Live verification after security-only publishing

Checked on 2026-10-23, approximately 06:39–06:45 Australia/Perth
(2026-10-22 22:39–22:45 UTC). This section supersedes the earlier *unknown live
runtime* status, not the unresolved scanner provenance or other review limits.

### Runtime confirmed

The read-only production investigation found current-serving startup output
through the documented legacy log reader:

`[Runtime security] Node.js 22.23.4; OpenSSL 3.5.9`

It appeared at 22:39:09 UTC, followed by successful serving on port 5000 at
22:39:10 UTC. This is direct runtime evidence rather than a workspace version
or build-only assumption. The latest successful build's completion window
aligns with these startup logs; the runtime lines themselves do not explicitly
label their build/commit identifier.

Startup health probes returned 500 before the new process came up. Subsequent
public `/health` returned 200, `status: ok`, `ready: true`, `degraded: false`.
This bounded observation is not a promise of continuous uptime.

### Live public HTTP checks

- The verified production domains `spectralmirror.io` and `wnsp.io` returned
  200 over certificate-verified HTTPS.
- HTTP on `wnsp.io` returned 301 to HTTPS.
- GET `/api/auth/me` without credentials returned 401.
- GET `/.env` and `/.git/config` returned 403. Sensitive response bodies were
  not read, including in case a request had unexpectedly returned 200.
- HSTS, CSP, nosniff, same-origin framing, referrer and permissions headers
  were present. HTML responses were marked no-cache/no-store.

These checks cover the named routes and methods, not all possible paths or
authentication states. No login, transfer or state-changing HTTP request was
performed.

### Actual public browser checks

Fresh desktop and 390-pixel mobile Chromium contexts loaded the live translator
with HTTPS secure-context status, no page JavaScript errors and no horizontal
overflow. State-changing HTTP methods were blocked by the test harness.
Mobile rendering was also visually inspected.

The live source textarea has `maxLength: 65536`; pasting 65,537 characters left
65,536 in the field. Browser permissions policy denied camera, microphone and
geolocation.

A harmless inline-script probe executed, confirming the existing
`script-src 'self' 'unsafe-inline'` allowance. A dynamic-evaluation probe run
in an ordinary asynchronous page task failed with EvalError, consistent with
unsafe-eval being excluded. Direct debugger/evaluation-context probes are not
reliable evidence here because automation can bypass that restriction.

### Current conclusion

The live runtime uncertainty is resolved and the listed public browser/HTTP
safeguards are verified. Inline scripts remain an XSS-hardening limitation;
broad HTTPS connection permission and same-origin script trust remain. These
are not proofs of an exploitable injection.

Real signed-in sessions, full device/extension security, all server routes,
and the Python scanner's originating inventory were not verified by this
read-only public check. Earlier fixture tests must not be relabelled as live
authenticated tests. No system-wide or absolute browser security clearance
is asserted.

## Further browser hardening prepared in development

This work has **not been published**. The live policy described above remains
the previously published inline-allowing policy until a separately
user-controlled publish; do not mistake the development test for live proof.

Production policy now uses `script-src 'self'` with no `unsafe-inline` or
`unsafe-eval`, and `script-src-attr 'none'`. The ordinary same-origin scripts
that handled the boot screen, skip-link focus and development WebSocket
rejection moved from inline HTML to a same-origin file. The old font
stylesheet `onload` attribute was replaced with a stylesheet link. The
structured-data JSON-LD remains inert data, not executable JavaScript.
Development retains Vite's `unsafe-inline`/`unsafe-eval` compatibility; it
must not be cited as proof of the production policy.

The production build completed with 1,461 tests passed and two intentionally
skipped opt-in browser-session cases. Those two cases were then run explicitly
with `npm run test:browser-session` and both passed against an isolated
self-signed HTTPS fixture, not the live website. The fixture serves the built
UI, invokes the actual founder BTC-login handler and authentication middleware,
rejects real database imports, accepts only a synthetic login key, and uses
an in-memory session store. Desktop and 390-pixel mobile runs checked:
bad key and attacker-chosen cookie rejected; new Secure, HttpOnly, SameSite=Lax
cookie issued; no founder token in localStorage or document.cookie; inactive,
expired and revoked sessions rejected; asynchronous inline JavaScript and
HTML event handlers blocked by the production CSP. All other fixture API
mutations are denied. The test's loopback certificate is self-signed and
trusted only within the fixture browser, **not** on the live site.

This does not validate real account access, persistent production session
storage, every authenticated endpoint, browser extensions or device security.
Founder BTC-secret-only access was not modified or bypassed. A screenshot
confirmed the public translator still renders on the restarted development
server. No real credential or transfer was used.

The platform dependency scanner was re-run and still reports 10 critical,
64 high, 64 moderate and 20 low advisories across the same seven Python
name/version pairs. Its returned finding source has only scanner name and
timestamp, not the originating manifest, image or environment. The active
development interpreter's package metadata and lockfile remain mismatched
with those records; this cannot establish the scanner's origin. We have not
suppressed findings, inserted absent vulnerable libraries into the app, or
called the platform results false positives. A Security Center SBOM from the
same scan run, or equivalent origin-labelled inventory, is needed before
those alerts can be attributed or closed. The platform docs describe
CycloneDX/SPDX SBOM download through Security Center.

Current status: the inline-script hardening and synthetic signed-in browser
checks are complete *in the workspace*. Publish and post-publish verification
are separate. Scanner provenance and a real authenticated production browser
journey remain unverified.
