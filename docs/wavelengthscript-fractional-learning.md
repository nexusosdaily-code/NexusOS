# Bounded fractional learning

## Opt-in synthetic configurable rates — 0.2.0

The separately versioned **0.2.0** experiment accepts smaller learning steps:

```ts
import {
  compileFractionalRateTraining, trainFractionalRateClassifier,
} from "../shared/wls-fractional-learning";

const synthetic = [
  { x1: "-0.500", x2: "0.500", label: 0 },
  { x1: "0.500", x2: "0.500", label: 1 },
];
const result = trainFractionalRateClassifier(synthetic, "0.125", 3);
const source = compileFractionalRateTraining(synthetic, "0.125", 3);
```

The rate is a required primitive decimal string, **0.001 through 1.000**,
with at most three decimal places. Zero, negative values, rates above one,
binary floats, excess precision, whitespace and exponent notation are rejected.
The returned `learningRate` is normalized to three places. The old
`trainFractionalClassifier`/`compileFractionalTraining` still select **0.1.0**
and rate **1.000**; its manifest, canonical kernel and fixed-point release bytes
are unchanged. No default or global rate is changed.

### Quantization is on the complete new parameter

Let `r` be the rate in thousandths, `e` the label minus the prediction, `w` an
integer parameter in thousandths, and `x` a feature in thousandths:

```text
wNew = roundHalfAwayFromZero((w*1000 + r*e*x) / 1000)
biasNew = bias + r*e
```

There is **one rounding of the complete new weight**, not a rounded delta
added afterwards. The bias feature is exactly 1.000, so its complete expression
is already integral in scaled units; the VM executes its exact integer update
without an unnecessary rounding call. Both weights use the real pinned
fixed-point `fixedRound` helper. No host arithmetic performs learning.
Prediction still uses the full exact margin, not a rounded display score.

For example, at rate 0.500 an update from `w=0.001` with error +1 and feature
−0.001 gives a complete new value +0.0005, rounded to **+0.001**.
Rounding the delta first would incorrectly give zero. The mirrored negative
case rounds −0.0005 to **−0.001**. From zero, signed half-grid updates also
round away from zero.

Rates do not increase model resolution: the model grid is still **0.001**.
At rate 0.001, a feature 0.001 contributes only 0.000001 to an erroneous
weight update and can leave that weight unchanged indefinitely. There is no
hidden residual accumulator. The `updates` metric counts mistaken sample visits,
not the number of changed coordinates; `parameterUpdates` records all three
assigned values on every visit, including zero-error visits and stalled updates.
Smaller steps may stall or alter the trajectory. **No convergence, faster
training, accuracy improvement or generalisation is promised.**

### Versioned scope, limits and evidence

Canonical source and manifest are in `shared/wls-fractional-learning/0.2.0/`.
This is a local **synthetic-data-only** experiment, not a remote publication or
new registered execution route. The flag describes the supported use, not a
claim that software can authenticate whether caller-supplied numbers came from
synthetic or private data. Use only deliberately constructed synthetic samples.
There is no persistence, network, wallet capability, private-record access or
live-fund test. The existing evaluator can inspect returned model strings under
its unchanged 0.1.0 evaluation contract.

All retained data limits apply: four training samples, three epochs, twelve
visits, features ±8.000 and a zero initial model on every call. Each run still has
one shared budget of **2,048 cycles/instructions, 65,536 source characters,
stack depth 256 and call depth 32**. No fresh per-update budgets are used.
With `1 <= r <= 1000`, an update changes a weight by at most 8,000 units:
rounding cannot exceed that integral upper bound. Twelve visits therefore
bound weights by 96,000 units and bias by 12,000 units. Even using the
accepted evaluation-model bound, the update numerator has absolute value at
most `128000*1000 + 1000*8000 = 136000000`; the fixed-point rounding
intermediates and retained raw-margin bound remain exactly representable.

`server/wls-fractional-rate.test.ts` compares every assigned coordinate, final
model and mistake metric against isolated CPython **Fraction** arithmetic,
which quantizes the complete rational new value independently using `divmod`.
The sweep covers **287 training runs** (41 scenarios at seven rates: 0.001,
0.002, 0.125, 0.499, 0.500, 0.999 and 1.000), all epoch counts, sample ordering,
boundary magnitudes, zero-error visits and nonseparable controls. At rate
1.000, every assignment also matches the retained learner. Signed ties,
stalls, rate rejection, immutable snapshots, stateless repeatability, release
bytes, actual WLS helper calls, program limits and financial fences are checked.
A valid native delta-rounding mutation produces the wrong signed-tie assignments
and is detected. The existing 0.1.0 audit remains unchanged in contract and passes.
The oracle is audit-only and has no inherited application secrets; it is not a
runtime fallback. A new native run now also measures **0.2.0** in Chromium
152.0.7977.64, Firefox 157.0 and WebKit 27.2: all three pass **288 explicit-rate
training runs** and **6,051 assigned coordinates** against the same independent
reference, including signed complete-parameter ties, sub-resolution stalls and
zero-error visits. The 39 retained runs remain in the suite. See the
[native numerical runner guide](../scripts/test-browser-fractional-learning.md)
for measured counts, isolation controls and reproduction instructions.
Earlier browser results below covered only 0.1.0; this new measurement does not
retroactively extend them, nor certify physical iPhone/iPad or Samsung devices.

Run the focused checks with:

```sh
node_modules/.bin/node node_modules/vitest/vitest.mjs run --project server \
  server/wls-fractional-rate.test.ts server/wls-fractional-learning.test.ts \
  server/wls-fixed-point.test.ts server/wls-fixed-point-units.test.ts --maxWorkers=2
```

Latest full-project validation, including the separate feature-scaling
addition, passes **11,795 server/client tests** with 51 unchanged conditional
skips, the complete build and all 399 Python tests. See
[the feature-scaling release validation](wavelengthscript-feature-scaling.md#complete-release-validation).
Earlier focused and full-suite counts below record their respective stages,
not the latest project-wide total.

Recorded 0.2.0 focused validation: the focused set passes **232 tests**, including
**27 new rate tests**. Project and standalone reference type checks pass.
Retained fractional-learning, fixed-point, numeric-vector and integer-learning
audits pass **26/26, 25/25, 17/17 and 13/13** respectively.
The initial full build and completion regression found a retained browser-report
integration gap: the semantic report omitted `parameterUpdates`, already emitted
by the reference before this increment. The report now includes the actual VM
snapshots, with an additional rejection test for a transient assignment error
whose final model is unchanged. No reference field or failing assertion was
removed. The public app renders after restart; no signed-in UI or new learner
UI was tested.

The corrected full `npm run build` passes: **11,469 tests passed**, **51
unchanged conditional skips**, across **276 passing files** and four skipped
files. Client/server bundling, bundle-size budgets, Wave Vault navigation,
critical modulepreloads and startup-migration artifact safety checks all pass.
No new skips, raised VM budgets or weakened assertions were introduced.

## Retained 0.1.0 contract

`@wls/fractional-learning` **0.1.0** extends the working bounded learner to
fractional training inputs and fractional weights. It is a separate local
dependency using the existing **WLS-PY/1** engine and the real pinned
`@wls/fixed-point` **0.1.0** package.

The old integer learner, integer vectors and fixed-point package remain
unchanged. This is a two-feature online perceptron, not a general neural network,
LLM, unrestricted AI agent, remote-registry publication or new VM number type.

## Working contract

| Property | Limit or rule |
| --- | --- |
| Features | Two primitive decimal strings, up to three decimal places |
| Feature range | **−8.000…8.000** |
| Labels | Numeric **0 or 1**, not booleans or strings |
| Training batch | **1–4** labelled samples |
| Epochs | **1–3**, default 3 |
| Initial model | Zero weights and zero bias on every training call |
| Learning rate | Fixed **1.000** |
| Update attempts | At most **12** per run |
| Evaluated model range | Each weight/bias **−128.000…128.000** |
| Evaluation batch | **1–16** labelled samples |
| Decision | Class 1 when the **unrounded** margin is nonnegative |
| Reported score | Three-place, ties-away-from-zero, bounded to **±1000.000** |

All values use exact scaled integers. Weights and feature units use scale 1,000.
The raw margin uses scale 1,000,000:

```text
margin = w1Units*x1Units + w2Units*x2Units + biasUnits*1000
prediction = 1 if margin >= 0 else 0
error = label - prediction
w1Units = w1Units + error*x1Units
w2Units = w2Units + error*x2Units
biasUnits = biasUnits + error*1000
```

The fixed unit learning rate makes each update exact at three places. There is
no hidden floating-point arithmetic or lossy per-update quantization. The update
grid is exactly **0.001**: both weights and features are thousandths, and
`error` is −1, 0 or 1. Thus `weight + error*feature` is already on that grid.
Inputs finer than the grid are rejected, never silently rounded. Configurable
learning rates are not supported by this retained API; use the explicit
0.2.0 synthetic entry points above for that separately versioned contract.
Epoch mistake counts are mistakes observed while visiting samples in order;
initial/final mistake counts evaluate the complete training set before/after
training. Nonzero update counts are calculated in WLS.

## Use

```typescript
import {
  trainFractionalClassifier, evaluateFractionalClassifier,
  compileFractionalTraining, compileFractionalEvaluation,
} from "../shared/wls-fractional-learning";

const data = [
  { x1: "-0.500", x2: "-0.500", label: 0 },
  { x1: "-0.500", x2: "0.500", label: 0 },
  { x1: "0.500", x2: "-0.500", label: 0 },
  { x1: "0.500", x2: "0.500", label: 1 },
];
const trained = trainFractionalClassifier(data, 3);
// model: { w1: "1.500", w2: "0.500", bias: "-1.000" }
// initialMistakes: 3, finalMistakes: 0
// mistakesByEpoch: [2, 1, 0], updates: 3

const evaluated = evaluateFractionalClassifier(trained.model, [
  { x1: "0.750", x2: "0.750", label: 1 },
]);
// predictions: [1], scores: ["0.500"], rawMargins: [500000]

const inspectableTrainingWls = compileFractionalTraining(data);
const inspectableEvaluationWls = compileFractionalEvaluation(trained.model, data);
// Compile-only helpers do not execute or return a trained model.
```

The host validates/encodes data and emits a bounded schedule. **Actual WLS
instructions perform all margin computation, classifications, parameter updates,
rounding, mistakes and update-count calculations.** No host-trained model, stored
answer or external AI service substitutes for execution. Results expose actual
source, cycles and visited kernel-call names.

Training also returns a frozen `parameterUpdates` array of frozen
`{ w1, w2, bias }` **scaled-integer** snapshots. These are actual WLS
post-assignment values, not host-recomputed updates. Entries follow epoch-major,
sample-major order, include zero-error visits, and number `samples * epochs`.
Each field is captured immediately after its corresponding parameter assignment.
Capturing them consumes instructions and cycles within the same shared budget;
no observer execution gets a fresh budget.

### Precision must not change decisions

A raw margin of `−1` at scale 1,000,000 means `−0.000001`. Its displayed score
rounds to `"0.000"`, but its prediction remains **class 0**. Exact zero is class 1.
Tests deliberately substitute a rounded-margin decision to demonstrate that the
audit detects this otherwise easy-to-miss error.

Bias is included in the exact margin before score rounding. Reported scores
must fit the existing fixed-point range. For example, a permitted model with
all fields `"128"` and both features `"8"` produces an unrepresentable displayed
score. Native `fixedCheck` returns None/null and the typed evaluator throws
`FractionalLearningRangeError` for the **whole evaluation**. It does not return
partial predictions, clamp the score or pretend evaluation succeeded.

## Real dependency integration and boundaries

Canonical helpers and the manifest are in
`shared/wls-fractional-learning/0.1.0/`. Their runtime snapshot must match the
canonical `.wls` bytes. The runner checks the exact local fixed-point version
and profile and links its real canonical instruction prefix.

Fixed-point jump indices remain unchanged. Newly linked learning helpers and
the generated caller are restricted to branch-free instructions; a future
control-flow extension requires an explicit linker change. The completed
program is validated by the real compiler before execution.

Every run has **one shared** unchanged VM budget: **2,048 instructions and
cycles, 65,536 source characters, stack depth 256 and call depth 32**. Each
training run is one execution, not a series of fresh per-update budgets.
The audit's larger grid is explicitly split into separate bounded evaluations;
there is no public API silently bypassing the 16-sample evaluation limit.

Numerical bounds are explicit. Twelve updates change a weight by at most
96.000 and the bias by at most 12.000. The accepted model/feature evaluation
bounds give a maximum absolute raw margin of **2,176,000,000**, safely exact
within the existing integer engine. Score rounding/range checks use the linked
fixed-point implementation, not copied host formulas.

Inputs are plain dense arrays of exact-field plain/null-prototype data records.
Reject holes, accessors, custom iterators, extra fields/properties, array
subclasses and typed arrays. Decimal validation reuses the fixed-point parser:
no binary floats, coercion, exponent notation, whitespace/newlines or excess
precision. Copies are validated before compilation; no caller-array/model
reference is retained as training state. Returned model and metric arrays are
frozen. These ordinary-data APIs do not sandbox executable Proxy objects or a
compromised host JavaScript realm.

Generic financial/legacy preview compilers reject these programs with or without
the profile header. No wallet operation, filesystem/network capability, private
record access, model persistence or new public execution route is added.
Local source/manifest equality is consistency evidence, not cryptographic
authentication of an altered client or interpreter.

## Audit

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/audit-wls-fractional-learning.ts
```

An independent isolated CPython process uses exact **Fraction** arithmetic for
training and classification and divmod-based score rounding. It receives only
synthetic audit JSON over stdin, without inherited application secrets. It is
never an application fallback.

Coverage includes 39 training scenarios across ordering, labels, fractional
precision, sample bounds and all three epoch counts; eight model-evaluation
scenarios; and an unseen 289-point fractional grid. Other checks cover raw
sub-resolution decisions, score overflow, zero initialization, immutable
snapshots, input rejection, actual call traces and unchanged VM limits.
The exact rational oracle records every attempted update, including no-ops.
All **828 parameter assignments** across those 39 training cases are compared
individually, not just the final model. A regression test also corrupts a
transient update and restores the final value, showing why final-only equality
is insufficient.
Validly encoded wrong updates, wrong bias scaling and prematurely rounded
decisions must produce detectably wrong results.

The standalone audit passes **26/26** checks. The focused learner,
fixed-point and integer regression set passes **252 tests**, including
**67 learner tests**. Observed audit maxima with snapshots enabled are:

| Measurement | Observed maximum | Unchanged cap |
| --- | ---: | ---: |
| Training cycles | 1,242 | 2,048 |
| Evaluation cycles | 1,242 | 2,048 |
| Compiled instructions | 774 | 2,048 |
| Source characters | 33,809 | 65,536 |

XOR, conflicting labels and difficult finite-budget datasets are retained as
honest negative controls. Failure to converge is reported, not hidden by extra
epochs, canned outputs or a different host classifier.
Even a linearly separable dataset is not guaranteed to converge in three
epochs; ordering, feature scale and margin affect the required number of
updates. Training-set convergence does not establish generalisation to other
data. This bounded experiment does not implement a convergence proof or
adaptive stopping, and does not expand the budget to obtain a favourable result.

Real browser compiler-fence tests cover all three compiler paths, including
Learn's sync/async entry points. Those tests alone are not numerical parity
evidence. The separate [native numerical suite](../scripts/test-browser-fractional-learning.md)
now verifies actual fixed-point arithmetic and fractional training/evaluation in
Chromium 152.0.7977.64, Firefox 157.0 and WebKit 27.2. All three pass against
independent exact rational references, with matching sources, call counts and
budgets. This is not physical iPhone/iPad Safari or Samsung-device certification.

Post-merge operational audit (2026-11-02):

The complete build now passes, superseding earlier incomplete attempts without
changing timeout limits. The merged snapshot extension exposed an out-of-date
browser evidence projection. That projection now retains the actual WLS
parameter snapshots, checks their immutability and compares them with the
independent reference. A new test rejects a changed intermediate update even
when final model weights are unchanged.

- Project and standalone audit/reference TypeScript checks pass.
- Latest full regression, including native-verdict safeguards: **11,442 passed**,
  **51 unchanged pre-existing conditional skips**, across 275 passing files and
  four skipped files. All 67 learner
  tests run and pass; no new skips or weakened assertions were introduced.
- All **399 Python tests** pass; one nonblocking async-plugin deprecation
  warning remains. All **228 focused numerical/browser-verdict tests** pass.
- All three native browser engines pass the complete fractional suite, including
  all 828 parameter assignments. The separate fixed-point evidence runner also
  passes all 413 cases in Chromium.
- Complete client/server build, bundle budgets, Wave Vault navigation,
  modulepreloads and startup-migration safety checks pass.
- Retained fixed-point, integer-vector, integer-learning and JavaScript/Map
  conversion audits pass: 25/25, 17/17, 13/13 and 13/13 respectively.
- Fresh dependency scanning reports zero known dependency vulnerabilities.
  Static/privacy scans show no new findings: four existing medium static
  alerts and one existing low privacy alert remain outside this addition.
- The existing public IDE renders in the running app. This is a baseline
  appearance check, not a claim that fractional learning has a new UI or that
  signed-in screens were verified. Native arithmetic verification is documented
  separately above.

See the [operational audit report](wavelengthscript-operation-audit.md) for
security-alert triage, measured performance and verification boundaries.

These checks do not certify general AI capability or complete security. No
VM budgets were increased, no placeholders substituted for execution, and no
private or funded operation was used to validate this package.
