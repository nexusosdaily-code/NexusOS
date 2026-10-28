# Sensitive-path security review — 11 October 2026

## Historical evidence and limits

Production traffic metadata contains two HTTP 200 records for `/.git/config`
and `/.env` on 26 June 2026. Neither record has a Binance referrer.
The recorded browser/bot identifiers are supplied by the caller, not verified
identities. Response bodies were not retained, so these records cannot prove
or conclusively rule out historical file disclosure.

Historical static-serving code used a dedicated public build directory and
Express's default dotfile exclusion. Its wildcard page fallback inspected
`req.url`, which Express rewrites when mounting the wildcard. This can classify
an unknown path as the home page and return HTTP 200 with application HTML.
That is a plausible explanation for the old status codes, not proof of their
actual response contents.

## Findings addressed

- Decode and inspect the original request path before file/page serving.
- Reject malformed, excessively encoded, hidden and traversal paths.
- Protect nested environment files, repository metadata and backend source.
- Do not let analytics exclusions for Vite/node_modules bypass path protection.
- Restrict development `@fs` access to browser-facing project directories and
  retain Vite's secret-file exclusions.
- Explicitly deny dotfiles in production static serving.
- Classify page-fallback paths using the original request target.
- Return JSON 404 for unknown API requests instead of successful HTML.
- Apply security headers to refused requests as well as ordinary responses.

Legitimate public pages, security.txt, browser assets and authenticated API
routes remain allowed by the path guard; authentication remains in place.
No wallet balances, permissions, credentials or production data were changed.

## Verification scope

Regression tests cover encoded and double-encoded probes, nested/backslash
variants, malformed paths, development asset exceptions, raw HTTP methods,
and wildcard fallback classification. Live probes use response metadata only;
actual credentials and private file contents are not fetched.

Dependency and static scans found no reported vulnerabilities. The privacy
scanner's low-severity “Budget sent to Standard Output” finding is a numerical
energy value in joules in a Python physics demo, not personal or financial data.

Workspace verification does not update the published service. These changes
require publishing, followed by production response-code checks.
