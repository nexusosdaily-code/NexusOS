# Native WLS feature-scaling audit

This tests the actual `@wls/feature-scaling` 0.1.0 implementation and its
fractional-learning pipeline, rather than inferring preprocessing compatibility
from an earlier browser pass of the learner alone.

## Completed native evidence

| Engine | Observed version | Result |
| --- | --- | --- |
| Chromium | 152.0.7977.64 | PASS |
| Firefox | 157.0 | PASS |
| WebKit | 27.2 | PASS |

Every engine executes, from a normal page task:

- **134** fitting/transformation fixtures, including signed halfway rounding,
  tiny measurements, constant columns, zero columns, maximum batch sizes and
  seeded varied measurements.
- **47** scaling → training → transformation → evaluation pipelines.
- **30** required rejection checks: malformed decimals, labels and fitted
  models, accessors/iterators, size limits, zero-column extrapolation and
  nonzero out-of-range measurements—including a bad final sample in a
  sixteen-sample batch.
- **Three** spectrally valid, executable incorrect WLS programs that must
  produce observably wrong numbers. Parser rejection is not accepted as
  numerical sensitivity.
- A repeat fit after the other cases, proving no earlier fitted state leaked.
- **326** bounded VM-stage evidence records, including SHA-256 source digests,
  cycles, instruction counts and source lengths.

Fifteen demonstration learning rates use eight genuinely unseen points each.
The other 32 varied training regressions evaluate an existing in-range point;
those checks are trajectory/implementation evidence, not unseen-data claims.

An isolated CPython Fraction oracle independently fits and normalizes inputs.
The separate learner oracle consumes reference-normalized measurements, not
normalization results from the implementation under test. Native results must
match both those independent results and Node: fitted scales, normalized
coordinates, every parameter assignment, final models, predictions, margins,
source digests, scaler calls and budgets. Fitted state must remain unchanged
during evaluation and output snapshots must be frozen.

Caps remain **2,048 cycles**, **2,048 instructions** and **65,536 source
characters per stage**. There is no enlarged combined training budget.

## Fail-closed verification

`server/wls-browser-scaling-report.test.ts` tests the actual report validator
against missing cases/stages, changed source digests, wrong intermediate
updates, wrong normalized coordinates, altered fitted scales, incorrect
predictions, failed mutations/rejections, accessor calls, mutable/state-leaking
results, raised budgets and forbidden traffic/page faults. Damaging both the
native report and Node baseline cannot hide a disagreement with the independent
reference.

Missing requested engines, startup/reference failures, page faults, incomplete
page tasks and malformed reports fail the command. A report is reset before
validation, and failures write `FAIL`, not a stale earlier `PASS`. All requested
engines must finish once in the requested order.

## Network-isolation evidence

Vite uses an isolated fixture root, `configFile: false`, `envFile: false` and no
inherited PostCSS plugins. In-memory assets are served only at an ephemeral
loopback origin. Other methods, paths/origins and WebSockets are rejected.
Browser environments contain a narrow host-library/graphics allowlist, not
application secrets. Service workers are blocked and CSP prohibits connections
and workers.

Ordinary numerical runs have **zero forbidden requests, zero server arrivals
and zero page faults**. A normal button-triggered fetch is rejected by native
CSP, with a matching native policy-violation event. This is not initiated from
debugger evaluation.

A separate disposable sensitivity context deliberately permits only the known
loopback probe to reach the rejecting HTTP server. In every engine, one attempt
is recorded, the server receives one request and returns 403, and the ordinary
zero-traffic validator rejects that evidence. This permissive test context is
closed and is never the numerical test's security policy.

## Reproduction

```sh
npm run test:browser-feature-scaling
```

The default requests all three engines. Explicit names select only those
engines and are recorded as such. Reports are written to ignored
`generated-artifacts/browser-feature-scaling/`, not application storage.

Use the existing
[native-host library and graphics setup](test-browser-fractional-learning.md#reproducing-this-nix-host)
for the downloaded Firefox and WebKit engines. Engine-specific library paths
must remain isolated from Chromium. No native executable, application runtime,
WLS arithmetic or assertion is patched to obtain these passes.

This is native desktop-engine numerical evidence, not physical iPhone/iPad/
Samsung verification, a live-media test, general AI or a complete security
certification. No private participant, wallet, provider or production database
data is used.
