# Wave Vault native browser verification

Verified on 2026-11-02 with:

```sh
npm run test:browser-wave-vault
```

Result: **25 assertions passed, zero skipped**, including the independent
receiver lifecycle in Chromium, Firefox and WebKit.

The focused GitHub proposal retains that repository's existing **23-test**
suite. Two separate unpublished workspace fixtures (an encryption pilot and
listing-performance comparison) are not included in this browser fix.
Both suites must pass every discovered assertion with zero skips and all
three lifecycle engines; a filtered run cannot satisfy the gate.

## Coverage

- Separate sender and already-open receiver browser contexts.
- Incoming grants discovered by foreground polling without receiver navigation,
  account switching or manual refresh.
- Exact original bytes downloaded by the authorised recipient.
- Account switching clears the incoming list and denies unauthorised reads.
- Restored-page refresh removes revoked access while normal polling is paused.
- Storage corruption, incomplete uploads, quota races, attachment safety,
  transfer interruption and recipient-directory privacy.

The fixtures use disposable local PostgreSQL and synthetic identities, not
the application database or participant files.

## Reproducible host setup

The Nix runner evaluates `scripts/browser-host-libraries.nix` against the
workspace's pinned package channel and refuses absent library/renderer paths.
Downloaded Firefox/WebKit receive their own library closure and explicit
software EGL renderer. The override is not applied to packaged Chromium,
PostgreSQL or application processes. Browser cache location is preserved.

On Nix only, the runner bypasses Playwright's distro-cache dependency
heuristic, which cannot describe these library paths. This does not bypass
browser launch or page execution. All assertions still run. On non-Nix CI,
Playwright's normal host validation remains enabled.

## Fail-closed release evidence

`generated-artifacts/ci/wave-vault.json` records the complete suite.
`generated-artifacts/ci/wave-vault-browser-summary.json` records the gate result.
The runner removes the old test report and marks the summary RUNNING before
execution. It requires every assertion to pass, no pending/TODO/skipped tests,
and exactly one lifecycle result for each of the three browser engines.
A nonzero exit, timeout, missing report or incomplete result fails verification.
The GitHub Wave Vault step uses the same command.

## Limits

Restoration is a deterministic `pageshow` handler test, not a claim about native
BFCache eligibility, physical iPhone suspension or universal device support.
Linux WebKit execution is not physical Safari device verification.
This suite does not certify completion of the separate privacy programme.
