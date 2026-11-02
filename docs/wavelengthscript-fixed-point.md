# Bounded fixed-point dependency

This release's decimal-string API and canonical WLS source are preserved.
For an explicitly distinct integer-unit API, see
[`@wls/fixed-point-units` 0.1.0](wavelengthscript-fixed-point-units.md).
The two dependencies share a scale, not an input type or source identity.

`@wls/fixed-point` **0.1.0** adds real, bounded fractional arithmetic to the
existing **WLS-PY/1** pure execution profile. The integer-vector and linear-learning
packages remain pinned and unchanged.

This is a local source package, not an npm/remote-registry publication, new
first-class VM number type, arbitrary-precision decimal engine or completed
fractional-training system.

## Numerical contract

| Property | Contract |
| --- | --- |
| Representation | Exact integer units with scale **1,000** |
| Decimal precision | **3 places** |
| Input and rounded-result range | **−1000.000 through 1000.000** |
| Scalar input | A primitive decimal **string**, never a JavaScript float |
| Rounding | Nearest thousandth; exact ties **away from zero** |
| Vector length | **0–16**, equal lengths for dot products |
| Overflow | Explicit error after final rounding; never wrap or saturate |
| Division by zero | Native VM error; no successful/partial package result |

Accepted examples: `"1"`, `"1.25"`, `"-0.001"`, `"1000.000"`. Output always has
three decimal places. `"-0"` and `"-0.000"` normalize to `"0.000"`.

Inputs with excess precision are **rejected**, not silently rounded. Reject
numbers (including integer JavaScript numbers), booleans, boxed strings, BigInts,
NaN/infinity, exponents, whitespace/newlines, leading zeroes, leading plus signs,
`.5`/`1.` notation, Unicode digits and executable-looking source text.
This intentionally avoids guessing the original decimal intent of a binary
floating-point number. Integer-vector values are not silently reinterpreted.

## Working operations

```typescript
import {
  addFixedPoint, subtractFixedPoint, multiplyFixedPoint, divideFixedPoint,
  createFixedPointVector, sumFixedPointVector, dotFixedPointVectors,
  scoreFixedPointVectors, compileFixedPointBinary, parseFixedPoint,
} from "../shared/wls-fixed-point";

parseFixedPoint("1.25");                  // frozen descriptor: units 1250
addFixedPoint("1.250", "2.500").value;    // "3.750"
subtractFixedPoint("1.250", "2.500").value; // "-1.250"
multiplyFixedPoint("1.250", "2.500").value; // "3.125"
divideFixedPoint("1", "3").value;         // "0.333"
multiplyFixedPoint("-0.001", "0.500").value; // "-0.001"

const features = createFixedPointVector(["0.750", "0.500"]);
sumFixedPointVector(features).value;     // "1.250"
dotFixedPointVectors(["1", "1"], features).value; // "1.250"
scoreFixedPointVectors(["1", "1"], features, "-1").value; // "0.250"

// Compiles only. No execution or arithmetic result is returned.
const source = compileFixedPointBinary("multiply", "1.250", "2.500");
```

Corresponding `compileFixedPointSum`, `compileFixedPointDot` and
`compileFixedPointScore` helpers expose inspectable WLS without executing it.
Compilation can succeed for an operation that subsequently fails on overflow or
division by zero. Each explicit execution has its own existing bounded budget;
there is no unlimited aggregate invocation hidden behind these APIs.

### Accumulation and rounding

Products in a dot product are accumulated at their full scaled precision.
The completed dot product is rounded **once**. Weighted scores include the
bias in that unrounded accumulator before rounding. For example:

- Two terms of `0.001 × 0.500` produce `"0.001"`, not `"0.002"`.
- `0.001 × 0.500 − 0.001` produces `"-0.001"`: rounding the product first would
  incorrectly give `"0.000"` because ties-away rounding is not translation
  invariant across zero.
- A large intermediate prefix may cancel later. A vector with eight `"1000"`
  terms and eight `"-1000"` terms can return zero; range validation applies to
  the final result, not each partial sum.

An exact result slightly outside the range may round to the boundary and be
accepted. A value rounding past the boundary fails. This is part of the public
contract, not implicit clamping.

## Actual WLS implementation and safety

The canonical versioned `.wls` source and manifest are in
`shared/wls-fixed-point/0.1.0/`. Runtime source is a byte-identical local snapshot,
verified by build tests. No Python process, source download or host arithmetic
fallback is used by application execution.

The host validates/encodes primitive decimal data, copies bounded vectors,
emits branch-free WLS calls and decodes results. WLS performs scalar arithmetic,
sum/product accumulation, rounding and the final range check.

The canonical functions are:

- `fixedCheck`: returns the integer units, or **None/null** when the result is
  outside the representable range. The typed package runner turns this failure
  into `FixedPointRangeError`; it never returns a successful numeric envelope.
- `fixedRound`: exact sign-aware rounding using integer arithmetic.
- `fixedSumStep` and `fixedDotStep`: widened internal accumulation primitives.

The latter helpers are internal building blocks, not independently range-checked
fixed-point values. A caller bypassing the typed runner must handle the checked
`result` and its null error explicitly. Arbitrary altered source is not
authenticated simply because it names this package.

All supported intermediates remain exact integers. The largest absolute raw
weighted-dot numerator is **16,001,000,000,000**. A conservative bound including
rounding's doubling and denominator addition is **32,002,001,000,000**, below
the safe-integer ceiling. The original **2,048 instructions/cycles, 65,536 source
characters, stack depth 256 and call depth 32** remain unchanged.
Kernel calls within an execution share its global budget.

Vectors must be plain dense arrays of decimal strings. Reject holes, accessors,
custom iterators, extra properties, array subclasses and typed arrays. Copies
are frozen, with no retained caller-array reference. These are ordinary-data
APIs in a trusted host realm, not a sandbox for executable Proxy objects or a
compromised JavaScript environment.

No filesystem, network, wallet provider, model persistence, private-data access,
external AI service or new public execution route is added. Financial and
legacy-preview compilers must reject this numerical profile, including
header-stripped instruction records.

## What this enables for learning

The working integer-trained two-feature model can now score fractional input
measurements through `scoreFixedPointVectors`, using explicit decimal strings
for its existing weights and bias. Tests preserve its old whole-number scores
and verify a genuine learned model produces `"0.250"` for the example above.

The old training package still accepts its original bounded integer samples.
Larger models, configurable precision and matrix/tensor operations are not
added by this arithmetic release.
Scores are quantized to three places; applications must consider that precision
before making decisions near a threshold.

The separate [fractional-learning package](wavelengthscript-fractional-learning.md)
now builds on this pinned implementation for bounded fractional training.
That companion package classifies using exact margins rather than rounded
display scores; it does not change this release's own arithmetic contract.

The separate [native numerical suite](../scripts/test-browser-fractional-learning.md)
now verifies all 413 fixed-point fixtures and fractional learning in real
Chromium, Firefox and WebKit processes against exact rational references.
All three engines pass; physical-device/mobile Safari verification remains
separate.

## Audit after this addition

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/audit-wls-fixed-point.ts
```

The audit compares real WLS runs against independent CPython **Fraction**
arithmetic and divmod-based rounding, using synthetic JSON data and an isolated
audit-only process without inherited application secrets. This is never a
runtime fallback.

Coverage includes every supported vector length, all seven operations, signs,
positive/negative ties and their neighbours, division by zero, rounded boundary
overflow, cancellation, bias-before-rounding, parser rejection and immutable
copies. Validly encoded arithmetic, rounding and range-check mutations must
produce detectable wrong results. Tests also execute the real browser-compiler
fences synchronously/asynchronously where applicable; those are boundary tests,
not physical-device or cross-browser execution evidence.

No placeholder results, increased budgets or newly skipped tests are acceptable
as an audit pass. Full regression build, type checking and fresh security scans
must complete before this addition is considered finished.

### Measured results

The standalone audit passed **25/25 checks** over **413 independent-reference
fixtures**: **344 successful exact results**, **60 correctly rejected
representational overflows** and **9 correctly rejected zero divisions**.
Maximum observed execution used **240 cycles**, **188 instructions** and
**8,068 source characters**, within the unchanged limits.

The new fixed-point suite passed **99 tests**. Together with the retained
integer-vector/learning suites and the real browser-compiler boundary tests,
the focused regression passed **212 tests**. TypeScript checking passed.

Fresh dependency scanning found **zero known vulnerabilities**. Static/privacy
scanners found no new findings: four pre-existing medium static warnings and
one low demo-logging warning remain outside this addition. The default desktop
IDE rendered successfully without accessing a signed-in participant session;
that screenshot does not establish native cross-browser arithmetic parity.

The complete project build then passed with **11,313 tests across 271 passing
files**, plus the **51 unchanged conditional skips across four files**.
Canonical library checks, client/server bundling, bundle-size limits, Wave Vault
navigation, required modulepreloads and startup-safety checks all passed.
The existing vector, learning and JavaScript/Map standalone audits were rerun
without changing their implementations.

No new tests were skipped. No main-app/funded-worker restart, private-record
access, wallet provider call, GitHub push or publishing action was performed.
