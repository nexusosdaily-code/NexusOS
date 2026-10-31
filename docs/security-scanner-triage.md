# Broader security finding review

Reviewed 31 October 2026, following the internal WavelengthScript dependency
release audit. This security-only disclosure stands independently of the
subsequent language-expansion source synchronization.
This is a focused internal review of four scanner findings, not a security
certification or completion of the separate private-data engineering work.

## 1. Moderate minimatch denial of service — fixed

The dependency scanner reported GHSA-g3hv-75wg-m249 / CVE-2026-118764 in
`minimatch` 10.2.6. Attacker-controlled patterns at optimization level 2 could
amplify work and exhaust CPU/memory.

Upgraded the existing **development dependency** to 11.0.1, retained the
`$minimatch` override, and updated the lockfile. The only added dependency is
`@isaacs/nonrecursive-glob-match` 1.0.3; no other installed dependency version
changed. Repository usage is the test-discovery glob guard, not a website
request handler. Updating still removes a known vulnerable dependency.

Validation includes the existing glob-discovery check and a separate child
process compiling 64 repeated parent/globstar segments at optimization level 2,
limited to 96 MiB V8 old-space and five seconds. This is a regression case,
not a proof that every possible glob pattern has constant resource cost.

## 2. Medium SHA-1 warning — Git protocol constraint retained

`scripts/check-disclosure-export.mjs` computes Git's SHA-1 blob identity:
`SHA1("blob " + byteLength + NUL + bytes)`. It compares the read-back bytes
and size with the selected Git object's identity. Replacing this digest with
SHA-256 would not verify Git's 40-character SHA-1 identifiers and would break
the disclosure gate.

The warning is not a reason to remove verification or substitute a mismatched
algorithm. SHA-1 has collision limitations; this check does **not** establish
author authenticity, act as a password hash, or replace review/trust in the
selected repository tree and GitHub transport/API. Regression tests reject
bare-content hashes and SHA-256-shaped identifiers. Existing corrupt-content,
truncated-tree, missing-file and unavailable-readback checks remain.

## 3. Medium session-fixation warning — not reproduced

`server/founder-access.ts` passes request metadata to storage, but the cookie
value comes from a newly generated server-side session token, not a request
cookie, body token or Authorization header. The verified BTC login path
selects `founder_btc`; storage generates its fresh random, HMAC-signed token.

New tests submit attacker-chosen token fields, cookies and headers during
two valid synthetic logins and verify distinct server-issued signed tokens.
Another test confirms an existing signed cookie cannot replace BTC proof.
HttpOnly/SameSite cookie protection and the founder's access method remain.
These tests use mocked storage and synthetic credentials, never a real BTC key.

No authentication behavior was weakened or changed to silence this finding.
Re-review is required if storage starts accepting client-selected tokens or
the login route changes its token-generation path.

## 4. Low “Budget sent to Standard Output” — non-sensitive demo value

`wnsp_v7/protocol.py` prints a synthetic **energy budget in joules**, initialized
to the literal `1e-5`, inside its standalone `__main__` demonstration. It is
not a person's financial budget, wallet balance or confidential account data.

Kept the useful diagnostic and documented its units/origin. A standard-library
Python AST regression verifies that energy-budget print calls remain confined
to the standalone demo and its packet uses the fixed literal energy input.
This classification does not approve logging real participant or financial data.

## Final checks and remaining scanner output

- Dependency audit: **zero reported vulnerabilities** after the upgrade.
- Static scan: the two reviewed medium warnings remain visible.
- Dataflow scan: the reviewed low energy-budget warning remains visible.
- No scan-rule suppressions, global exclusions or deceptive label changes
  were added. The warnings are not claimed to have disappeared.
- Focused verification: **46 JavaScript/TypeScript tests** and **one Python
  regression** passed; project type checks and strict security-test checks
  passed. Strict checks used the project's path aliases and JavaScript-module
  resolution rather than an unrelated standalone compiler configuration.
- The public landing page rendered successfully in the app preview. Signed-in
  screens and physical-device calling were not part of this focused review.

The remaining three findings are retained for transparency with the contextual
review above. They are not three confirmed exploitable defects. Revisit them
if the source, units, provenance or trust boundary changes.
