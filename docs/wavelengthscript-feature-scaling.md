# Bounded WLS feature scaling and scaled learning

`@wls/feature-scaling` **0.1.0** is a working, repository-local numerical
dependency for synthetic two-feature learning experiments. It fits maximum
absolute magnitudes using **training data only**, then applies those same
scales to training and held-out measurements.

Native preprocessing execution now passes independently checked runs in
**Chromium, Firefox and WebKit**. This verifies the scaler itself, not merely
the earlier fractional learner.

This makes it possible to train the existing fractional learner on values with
very different magnitudes—for example `1000.000` in one coordinate and `0.005`
in the other—without changing its retained ±8.000 feature contract.

## What actually executes

The released `shared/wls-feature-scaling/0.1.0/kernel.wls` contains real
WLS-PY/1 functions:

- `scalingAbs(value)` computes magnitude.
- `scalingMaximum(current, value)` updates a fitted column maximum.
- `scalingValue(value, maximum)` normalizes through the retained WLS
  `fixedRound` implementation.

The compiler produces a reproducible canonical snapshot from the bounded
source definition. Tests compare its complete bytes with the released file and
check manifest identity. Linked programs preserve the fixed-point kernel's
existing jump indices; scaling helpers and generated callers are branch-free.
Visited VM calls and actual result variables establish execution—not logging,
embedded source text or an unsupported legacy `EXEC` instruction.

TypeScript still supplies validation, representation conversion, linking and
the existing compiler/VM host. It does **not** compute fitted maxima,
normalized coordinates or learner updates as a fallback.

Dependencies are the retained local `@wls/fixed-point` 0.1.0 and, for the
learning pipeline, `@wls/fractional-learning` 0.2.0. No external package,
network, database, file-storage capability or autonomous agent is added.

## Input and numerical contract

- Fit **1–4** labelled samples; transform **1–16**.
- Each sample has exactly `x1`, `x2`, `label`; labels are numeric `0` or `1`.
- Coordinates are strict decimal strings with at most three fractional places,
  within **−1000.000 through 1000.000**.
- The frozen scaler contains exactly `maxAbsX1` and `maxAbsX2`, both
  nonnegative decimal strings.
- Fitting ignores labels numerically. Each column scale is the greatest
  absolute training value in that column.
- Nonzero columns normalize to ±1.000 at their extrema, using nearest rounding
  with halfway values away from zero.
- A zero training column normalizes to zero; **only zero** may subsequently
  appear in that column.
- An input outside either fitted magnitude fails the **whole transform**.
  There is no silent clamping, refitting on held-out data or successful partial
  batch.

Canonical formatting is not adaptive precision. Thousandth quantization can
erase small distinctions: with a fitted maximum of `1000.000`, an input of
`0.499` becomes `0.000`, while `0.500` becomes `0.001`. Signed halfway cases
round symmetrically. Scaling cannot guarantee preservation of all labels or
general model convergence.

Plain dense data arrays and own data fields are required. Sparse arrays,
accessors, custom iterators, unknown fields, coercible numbers and malformed
models fail explicitly. Host validation is for ordinary trusted-realm data;
it is not a sandbox for hostile JavaScript Proxies.

## Working integration

```ts
import {
  trainScaledFractionalClassifier,
  evaluateScaledFractionalClassifier,
} from "./shared/wls-feature-scaling";

const training = [
  { x1: "-1000", x2: "-0.005", label: 0 },
  { x1: "-1000", x2: "0.005", label: 0 },
  { x1: "1000", x2: "-0.005", label: 0 },
  { x1: "1000", x2: "0.005", label: 1 },
];
const fitted = trainScaledFractionalClassifier(training, "0.500", 3);
const heldOut = [
  { x1: "500", x2: "0.003", label: 1 },
  { x1: "-500", x2: "0.003", label: 0 },
];
const result = evaluateScaledFractionalClassifier(
  fitted.scaling.model, fitted.training.model, heldOut,
);
console.log(fitted.scaling.model);
// { maxAbsX1: "1000.000", maxAbsX2: "0.005" }
console.log(fitted.training.model);
// { w1: "0.500", w2: "0.500", bias: "-0.500" }
console.log(result.evaluation.predictions); // [1, 0]
console.log(result.evaluation.mistakes); // 0
```

Keep the fitted scaler together with its learned classifier; substituting a
different scaler changes the model's meaning. Refit only as a deliberate new
training operation. The package stores no persistent model and never learns
from held-out labels during evaluation.

Individual APIs are `fitFeatureScaler`, `transformFeatures`,
`compileFeatureScalingFit` and `compileFeatureScalingTransform`. Results include
frozen model/sample data, actual source, cycles, compiled instruction count
and visited function calls. Each fit/transform/train/evaluate stage runs in its
own ordinary bounded VM invocation—not an enlarged combined budget.

## Audit evidence

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs \
  scripts/audit-wls-feature-scaling.ts
```

The independent oracle runs isolated CPython **Fraction** arithmetic, with no
inherited application secrets and no runtime fallback. Normalization is
compared against reference-fitted data. The learner oracle then trains on
those **reference** coordinates, not the WLS coordinates being tested.

Observed standalone audit:

- **134** fit/transform fixtures, including 128 seeded synthetic datasets.
- **696** normalized coordinate results compared with exact rational results.
- **47** complete scaled training pipelines: 15 demonstrated learning rates
  and 32 varied synthetic datasets.
- **1,260** actual parameter assignments compared with the independent learner.
- All 15 demonstration rates correctly classify **eight unseen points**.
- A valid incorrect WLS scaling multiplier produces a detectably wrong result.
- **169** focused tests cover execution, bounds, malformed data, zero columns,
  rounding, immutability, repeatability and rejected extrapolation.

Observed maxima across the audited stages are **1,796 cycles**, **792 compiled
instructions** and **34,377 source characters**, below unchanged
2,048 / 2,048 / 65,536 caps.

## Native browser preprocessing audit

The complete new workflow passes in Chromium **152.0.7977.64**, Firefox
**157.0** and WebKit **27.2**, with no requested engine skipped. Each engine
executes all 134 scaling fixtures, 47 training pipelines, **30 rejection
checks**, three valid incorrect-program controls and a repeat fit after the
other cases.

The audit compares **1,260 parameter assignments** and **326 VM-stage evidence
records** per engine. Fitted scales, normalized measurements, every learner
update, evaluation results, unchanged/frozen fitted state, source SHA-256
digests, scaler calls and resource bounds match independent Fraction
references and Node. The 15 demonstration rates use genuinely unseen points;
the other 32 varied regressions check implementation trajectories and do not
claim unseen-data accuracy.

Normal native runs make zero forbidden requests, cause zero loopback arrivals
and have zero page faults. Native CSP blocks a button-triggered fetch. In a
separate disposable sensitivity context, one deliberately forwarded probe
reaches the rejecting server and the ordinary zero-traffic validator rejects
it. Network controls are not inferred from an unobserved request attempt.

**27 fail-closed validator tests** reject incomplete or damaged results,
including wrong intermediate updates even when final outputs could recover.
Together with the original package tests, the focused set passes **196 tests**.
Startup/reference failures and missing engines cannot reuse a stale passing
report. See the
[native audit and reproduction notes](../scripts/test-browser-feature-scaling.md).

No arithmetic fault was found in the retained scaler under these audited
bounds. The previous gap was missing direct native preprocessing evidence;
earlier learner-only passes were not used as a substitute.

Physical devices,
production throughput, live participant data, unrestricted datasets, neural
networks, general AI and a fully WLS-hosted runtime remain outside this release.

## Complete release validation

The completed full build passes **11,795 server/client tests**, with
**51 unchanged pre-existing conditional skips**, across 278 passing files and
four existing skipped files. All **399 Python tests** pass; one nonblocking
async-plugin deprecation warning remains.

Project and supplemental strict TypeScript checks pass. The client/server
bundles, entry budgets, dependency-guide consistency, Wave Vault navigation,
critical preloads and startup-migration safety checks pass. Retained arithmetic
and fractional-learning audits continue to pass.

Fresh scans report zero known dependency vulnerabilities and no new static or
privacy findings. Four existing medium static alerts and one low privacy alert
remain; this release does not suppress them or establish complete security.

The repository documentation and generated public dependency guide carry this
same bounded disclosure. Local implementation is not a public npm release,
GitHub merge, publication instruction or change to financial/privacy authority.
