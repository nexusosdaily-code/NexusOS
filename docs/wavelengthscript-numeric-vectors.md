# Bounded numerical vectors and dot products

`@wls/numeric-vectors` **0.1.0** is a working local WavelengthScript numerical
dependency. It builds on the existing `WLS-PY/1` pure execution profile without
increasing its limits or adding external capabilities.

It is separate from collection releases and `@wls/linear-learning` 0.1.0.
Those pinned package sources, manifests and operations remain unchanged.
This is not a remote registry/npm publication or automatic source-language
package-import feature.

## What is implemented

- **Bounded vector representation:** a validated, copied, frozen dense array of
  integers. The host manages the representation; this release does not introduce
  a numerical-array value type into the VM.
- **Vector sum:** add every element through the real WLS `vectorSumStep`.
- **Dot product:** add each pair's product through the real WLS `vectorDotStep`.
- **Weighted score:** the dot product plus an explicit integer bias, also added
  through the WLS sum kernel. This supports the working classifier's scoring
  operation without claiming that its training now supports 16 features.
- **Compile-only helpers:** return inspectable coordinate-tagged WLS. Execution
  is a separate explicit helper call.

The host validates and serializes scalars, emits bounded calls and extracts the
result. **It does not calculate the sum, products or score as a substitute for
the WLS program.** Execution results include actual visited kernel-call names,
cycle counts and source.

## Use

```typescript
import {
  createBoundedNumericVector, sumNumericVector, dotNumericVectors,
  scoreNumericVectors, compileNumericVectorDot,
} from "../shared/wls-numeric-vectors";

const a = createBoundedNumericVector([1, -2, 3]);
const b = createBoundedNumericVector([4, 5, -6]);

sumNumericVector(a).value;              // 2
dotNumericVectors(a, b).value;          // -24
scoreNumericVectors(a, b, -2).value;    // -26
const inspectableWls = compileNumericVectorDot(a, b); // no execution
```

For a trained two-feature model, pass `[model.w1, model.w2]`, `[x1, x2]`
and `model.bias` to `scoreNumericVectors`. The returned value agrees with
the existing learning package's WLS score. Each evaluation is an explicit,
separate bounded execution, not an unlimited compound invocation.

## Exact numerical and input contract

- Length **0–16**. Empty sum and empty dot product are both zero; an empty
  weighted score is its validated bias.
- Each element is an integer within **−1,000,000…1,000,000**.
- Bias has the same integer bounds.
- Dot-product operands must have **equal lengths**. No padding, truncation,
  coercion or zip-to-shorter behaviour.
- Negative zero is accepted as the integer zero and normalized in the copy.
- Reject fractional numbers, NaN/infinity, booleans, strings, BigInts, objects,
  nested arrays, typed arrays, sparse arrays, inherited custom-array
  representations, extra properties, element getters and custom iterators.
- Arrays are copied before use. Existing frozen arrays are accepted. Caller
  mutation cannot alter the returned frozen snapshot.
- Inputs must be ordinary data in a trusted host realm, not executable Proxy
  objects or a compromised JavaScript runtime.

Bounds are chosen jointly: even 16 maximum products total exactly
**16,000,000,000,000**, and adding the maximum bias gives
**16,000,001,000,000**. Every possible prefix sum stays inside the safe-integer
range. This release does not accept arbitrary safe-integer inputs merely because
each individual scalar fits; their products could otherwise overflow.

The existing profile's **2,048 instructions, 2,048 cycles, 65,536 source
characters, stack depth 256 and call depth 32** remain unchanged. All kernel
calls inside one sum/dot/score share its execution budget.

## Canonical WLS source and profile safety

The versioned source and manifest are in
`shared/wls-numeric-vectors/0.1.0/`. The browser/Node snapshot must match the
canonical `.wls` file byte-for-byte. Tests verify equality, compilation and the
declared fixed function surface. This is a trusted-local consistency check,
not author authentication or proof that an interpreter cannot be replaced.

The implementation uses no `eval`, host source execution, runtime downloads,
filesystem, network, wallet access, model persistence or external AI service.
It exposes local functions, not a new public execution API or website UI.

The audit found and closed a legacy-preview boundary gap: removing a WLS-PY
header previously evaded the common preview guard, although strict server
execution still rejected the source. The guard now recognizes Python
instruction-record envelopes, including reordered JSON fields. All three
browser compilers and Learn's synchronous/asynchronous preview paths reject
the numerical profile, with or without its header. Ordinary comments and
quoted strings remain valid.

## Audit after this addition

Run the computed-evidence audit:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/audit-wls-numeric-vectors.ts
```

It checks actual WLS execution against independently executed CPython integer
arithmetic on **73 fixtures / 219 numerical results**, spanning every supported
length, signs, maximum magnitudes, cancellation and empty operands. The Python
process receives only audit JSON through stdin under isolated mode with no
inherited application secrets. It is not part of application execution.

Other checks include the fixed manifest/source snapshot, actual call traces,
existing VM limits, zero/empty operand validation, length mismatch rejection,
getter non-invocation, immutable copies, wrong-profile fencing and a validly
encoded arithmetic mutation that must produce a detectable wrong result.

Automatic tests also cover commutativity, linearity, canonical zero, all input
rejection categories and scoring interoperability with a genuinely trained
model. No placeholder learner, increased VM limit or new test skip is used.

### Measured audit result

The standalone audit passed **17/17 checks** with zero failures. Across its
73 fixtures / 219 numerical comparisons, the largest observed execution used
**208 cycles**, **124 instructions** and **5,428 source characters**, within
the unchanged profile caps. These are observed maxima for the audited fixtures,
not a new configurable budget.

The vector suite passed **51 tests**; the combined vector, retained learner and
actual browser-compiler boundary checks passed **113 tests**. Both existing
standalone semantic audits were rerun: learning passed 13/13, and JavaScript/Map
conversion passed 13/13. TypeScript checking passed.

Fresh dependency scanning found zero known vulnerabilities. Static/privacy scans
reported no new findings: the same four pre-existing medium static warnings and
one low physics-demo logging warning remain documented outside this package.
The default desktop IDE rendered successfully; no signed-in participant UI or
private session was used for this local library work.

The final complete project build passed with **11,214 tests across 270 passing
files**, plus the **51 unchanged conditional skips across four files**.
Production client/server bundling, canonical library checks, bundle-size
limits, Wave Vault navigation, required preloads and startup-safety checks
passed. No added tests were disabled to obtain this result.

No main-app/funded-worker restart, private-record access, live participant
execution, wallet provider call, GitHub push or publishing action was performed.

Fractional measurements and fixed-point rounding rules are now available through
the separate [`@wls/fixed-point` 0.1.0 decimal-string dependency](wavelengthscript-fixed-point.md)
and [`@wls/fixed-point-units` 0.1.0 integer-unit dependency](wavelengthscript-fixed-point-units.md),
not this integer-only release. Matrices and a wider training engine remain
future dependencies. All tests use synthetic data; this work does not authorize
private-data use, real-money operations or publishing.
