# WavelengthScript learning feasibility and first numerical dependency

## What is feasible now

A small supervised **two-input integer perceptron** can genuinely learn inside
the existing WavelengthScript pure VM. This demonstrates bounded numerical
learning, not a chatbot, large language model, general neural-network framework
or photonic computer. No external AI provider performs the learning.

The existing numerical foundation provides safe-integer arithmetic, comparisons,
functions and forward branches in `WLS-PY/1`. The current collection catalogue
provides string collections, Maps and Sets; it is not a numerical tensor
library. General numerical vectors/matrices, fixed/floating-point numerical
contracts, model storage and large-model execution are **not established by
this demonstration**.

An initial un-packaged learning probe used 604 of the existing 2,048 cycles.
The reusable package additionally calls canonical kernel functions and measures
before/after errors; its full demonstration training uses 1,140 cycles.
No engine limit was raised.

## Local dependency: `@wls/linear-learning` 0.1.0

This is a new local numerical package, **not a replacement or renumbering of
collection releases 0.1.0–0.40.0**, and not an npm or remote-registry publication.
It uses `WLS-PY/1`, not a newly privileged VM profile.

Canonical source: `shared/wls-learning/0.1.0/kernel.wls`.
Its adjacent manifest fixes the version, profile, function surface and lack of
external capabilities. A browser/Node-compatible embedded snapshot must equal
the canonical file byte-for-byte; the test build fails on drift. This equality
check is not a signature, author authentication or tamper-proof interpreter.

The real WLS kernel implements:

- `linearDot2(w1, w2, x1, x2)` — two-term integer dot product.
- `linearPredict2(w1, w2, bias, x1, x2)` — class 1 when the score is at least zero.
- `linearUpdate(weight, error, feature)` — `weight + error * feature`.

The TypeScript host validates data, unrolls bounded calls and extracts results.
**WLS performs the parameter updates, predictions, scores and error counting.**
Host loops do not calculate the trained model or substitute hard-coded weights.
The Python-like authoring route compiles to coordinate-tagged WLS instructions;
there is no Python subprocess or source evaluation in application execution.

### Use from local application/developer code

```typescript
import {
  trainLinearClassifier,
  evaluateLinearClassifier,
  compileLinearTraining,
} from "../shared/wls-learning";

const examples = [
  { x1: -1, x2: -1, label: 0 },
  { x1: -1, x2:  1, label: 0 },
  { x1:  1, x2: -1, label: 0 },
  { x1:  1, x2:  1, label: 1 },
];
const trained = trainLinearClassifier(examples, 3);
const checked = evaluateLinearClassifier(trained.model, [
  { x1: 2, x2: 2, label: 1 },
  { x1: 0, x2: 0, label: 0 },
]);
const inspectableWls = compileLinearTraining(examples, 3);
```

Only labels 0/1 and bounded integer features are accepted at runtime, including
when a TypeScript caller's inferred label type is wider than the literal union.
Inputs are plain dense data arrays/records, with no extra fields, record or
element getters, inherited data or custom array iterators. Malformed inputs
fail before program execution. Callers must provide data, not executable
objects or proxies.

There is no automatic `import` resolution for this package in JavaScript
conversion, generic financial contracts or the older collection package
manager. Use these working local APIs or inspect their returned WLS source.
This release introduces no public endpoint, installer, model upload or new
website controls.

### Limits and numerical contract

- Training: 1–4 labelled samples, 1–3 epochs, at most 12 updates.
- Training always starts with zero weights/bias, uses unit learning rate and
  input order. It does not silently resume a stored model.
- Evaluation: 1–16 labelled samples per call.
- Two integer features, each within −8…8.
- Supplied model coefficients/bias within −128…128. Zero-initialized bounded
  training stays within that representable evaluation range.
- Existing VM limits remain unchanged: 2,048 instructions/cycles per execution,
  65,536 source characters, stack depth 256 and call depth 32.
- Every helper call inside a training/evaluation program shares that program's
  cycle budget. Separate evaluations are independent executions, not a claim
  that an unlimited batch fits in one invocation.

The classifier does not handle fractional features, arbitrary-dimensional
vectors, stochastic optimization, probabilities or universal convergence.
Data order matters. Training metrics and failures are returned honestly.

## Feasibility evidence and audit gate

The synthetic task has labels defined by `x1 + x2 >= 1`. Four training points
produce weights `(1, 1)` and bias `−1` through actual WLS updates:

- Training mistakes decrease from **3/4 to 0/4**.
- Online mistakes by epoch are **1, 0, 0**.
- Eight distinct unseen points improve from **5/8 mistakes to 0/8**.
- All **289** integer coordinate pairs in −8…8 agree with the target and an
  independently executed CPython reference, evaluated in bounded batches.
- Training parameters, per-epoch errors, predictions and scores match the
  independent reference across additional datasets, orders and epoch counts.
- A validly encoded arithmetic mutation produces a detectable wrong result.
- XOR is a negative control: this single linear unit fails it and reports errors,
  rather than claiming general learning ability or universal success.

The standalone audit has 13 fail-closed checks:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/audit-wls-learning.ts
```

It prints computed evidence and exits nonzero on failure. Independent CPython
receives JSON data through standard input under isolated mode, without inherited
application secrets; it is audit-only, never an application fallback.

The automatic build also discovers `server/wls-learning.test.ts`, including
canonical-byte/manifest equality, independent numerical comparison, supported
boundaries, input/accessor rejection, financial-profile fences, mutation
sensitivity and honest XOR failure. No skips or placeholder implementations are
introduced for these checks.

**Development rule:** after each WLS addition, run its functional and safety
audit before moving to another addition. Run the complete regression build for
the delivered change and keep negative controls and failures visible.

### Completed verification

- Standalone feasibility audit: **13 checks passed, zero failed**.
- New dependency suite: **35 tests passed**, no skips or stand-in learner.
- Complete regression/build: **11,163 tests passed across 269 passing files**;
  51 existing conditional skips across four files remain unchanged.
- TypeScript checking, production client/server bundling, canonical collection
  checks, bundle-size gates, navigation, preloads and startup-safety checks passed.
- Security dependency scan: zero known vulnerabilities. Static/privacy scans
  reported no new findings: the existing four medium static warnings and one
  low physics-demo logging warning remain outside this package. Three static
  warnings concern Git-compatible SHA-1 object identifiers; the fourth flags
  the existing founder-access session-cookie path. These unchanged findings
  are not erased or described as proof of whole-project security.

Full verification used synthetic data and database-disabled tests. No main-app
or funded-worker restart, live participant account, private record, wallet
provider call, model storage, GitHub push or publishing action was performed.
No user-facing UI was added or claimed to be verified.

## What follows this proof

The next useful numerical dependency is an explicitly bounded numerical vector
representation with audited sum/dot operations. Fixed-point representation,
rounding/overflow rules and matrix operations should follow from measured needs,
not be declared available in advance.

Before handling real participant data or persisting models, return to the
privacy review. Model parameters can reveal training information; local pure
execution is not a blanket confidentiality guarantee. This work uses synthetic
data only and does not reopen private records, move funds, publish the site,
send campaigns or claim operator-inaccessible secrecy.
