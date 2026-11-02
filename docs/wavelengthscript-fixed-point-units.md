# Fractional measurements: bounded fixed-point integer units

`@wls/fixed-point-units` **0.1.0** is a separate, local-only numerical dependency.
It translates a supported pure source subset into real coordinate-tagged
`WLS-PY/1` instructions and executes those instructions in the existing VM.
It does not change `@wls/numeric-vectors` 0.1.0 or `@wls/linear-learning` 0.1.0.
No fractional training engine, tensors or new interpreter capabilities are added.

This is deliberately separate from the already retained `@wls/fixed-point`
0.1.0 decimal-string API. That release's entry point, canonical WLS source,
manifest, behavior, CPython reference and tests remain intact. Here the
integer-unit entry point is `shared/wls-fixed-point-units.ts`: `1234` means
`1.234` in this API only. The decimal-string release never accepts that number
as a substitute for `"1.234"`. Do not resolve the two packages interchangeably.

## Numerical contract

- **Representation:** signed integer units with a fixed scale of **1,000**.
  `1234` units means `1.234`, not `1234`. All scalar inputs, vector entries,
  bias and final results lie within **−1,000,000…1,000,000 units**,
  representing **−1,000…1,000**. The distinct API prevents reinterpretation
  of the integer-vector release.
- **Conversion:** `parseFixedPointDecimal` accepts canonical decimal strings
  with at most three fractional digits. It converts representation exactly.
  It rejects binary fractional JS numbers, exponents, whitespace, leading
  plus signs/zeros, and excess fractional digits instead of quantizing them.
  All arithmetic APIs take integer units only; no coercion. Negative zero
  becomes canonical positive zero.
- **Rounding:** nearest unit, **ties away from zero**. In exact unit algebra,
  multiplication rounds `a*b/1000`; division rounds `a*1000/b`.
  Addition/subtraction are exact unit operations.
- **Vectors:** dense ordinary data arrays of length **0–16**, copied and
  frozen. Sum adds units exactly. Dot accumulates exact unscaled products,
  then rounds **once**, not per product. Score adds `bias*1000` to the dot
  accumulator before this single rounding. Operands must have equal lengths;
  there is no padding/truncation. Empty sum/dot is zero; empty score is bias.
- **Overflow:** final rounded result outside the unit range throws
  `FixedPointOverflowError`. No saturation, wrapping or partial success.
  Exact intermediate values may exceed the final representable range;
  cancellation is valid. Out-of-range inputs throw `FixedPointInputError`.
- **Zero divisor:** both signs of zero throw `FixedPointDivisionByZeroError`
  after operand validation, including `0/0`. The WLS kernel's division itself
  also fails on zero when directly executed.
- **Typed validation:** reject NaN/infinity, booleans, strings in unit APIs,
  BigInts, nested arrays, typed arrays, holes, extra properties, array subclasses
  and accessors without invoking getters, iterators or coercion hooks. These
  local helpers assume ordinary data in a trusted host realm, not malicious
  Proxy objects or an already compromised JavaScript runtime.

### Exactness and budgets

A product is at most `10^12` in magnitude. Across 16 entries, every prefix
accumulator is at most `16*10^12`; the optional scaled bias adds at most
`10^9`, giving **16,001,000,000,000**. This stays below `2^53−1`.
The rounding remainder doubling is bounded by twice the denominator;
scalar division's numerator is at most `10^9`. Sign normalization stays
within these same exact integer limits. No avoidable intermediate is used
as a final-range gate, so large cancelling products work.

The VM's 2,048 instruction and cycle limits, 65,536 source characters,
256 stack depth and 32 call depth are unchanged. All nested kernel calls
share one execution budget. The host validates/copies input, emits bounded
calls, extracts the VM result and enforces its final range. It does not
compute a numerical answer in place of WLS. Result envelopes include source,
cycles, actual visited kernel calls, package identity and integer `units`.

Compile helpers validate inputs and return inspectable WLS without execution.
They cannot promise final-range success: executing the resulting WLS directly
returns a raw VM integer, whereas the package execution wrappers additionally
enforce the final fixed-point range. This is a library contract, not a new VM
scalar type. Arbitrarily edited source does not inherit the package guarantee.

## Example: synthetic fractional learning measurements

```typescript
import {
  parseFixedPointDecimal as units, fixedPointScalar, fixedPointVector,
  compileFixedPointScalar,
} from "../shared/wls-fixed-point-units";

fixedPointScalar("multiply", units("-0.001"), units("0.500")).units; // -1
fixedPointScalar("divide", units("1"), units("3")).units;           // 333
fixedPointVector("sum", [units("1.250"), units("-0.125")]).units;    // 1125
fixedPointVector("score",
  [units("2"), units("-3")],       // explicit model coefficients
  [units("2.250"), units("1.125")], // fractional measurements
  units("1")).units;               // 2125 = 2.125
const source = compileFixedPointScalar("multiply", 1250, 500); // no execution
```

An existing two-feature integer model can be explicitly converted to units
using decimal strings and scored against fractional synthetic measurements.
This does **not** change the retained learner's integer-only training/evaluation
contracts. A general fractional trainer requires a separately reviewed release.
Each helper invocation is a separate bounded execution, not an unlimited
compound training run.

## Source, safety and audit

The canonical pure kernel and manifest live in
`shared/wls-fixed-point-units/0.1.0/`; the browser/Node source snapshot must match
`kernel.py` byte for byte. That file is compiler input, never host-executed
Python. The fixed operation surface and canonical equality are checked in tests.
This is local source consistency, not author authentication or a runtime lock.
This dependency is not added to the unrelated collection registry.

There are no remote downloads, import/install hooks, network or filesystem
capabilities in the runtime, participant records, model persistence, wallet
actions, public execution routes, UI changes or publication steps. Financial
and generic execution paths reject emitted WLS, with and without its header.

Run the independent computed-evidence audit:

```sh
node_modules/.bin/node node_modules/tsx/dist/cli.mjs scripts/audit-wls-fixed-point-units.ts
```

The audit-only BigInt reference selects the nearest integer by comparing exact
rational distances to candidate integers. It is independent of the WLS
quotient/remainder rounding implementation and is not imported by runtime code.
The audit compares actual raw VM results and package results/rejections across
all dimensions, extrema, large cancelling intermediates, negative ties,
neighboring values and zero division. It reports observed resource maxima.

`server/wls-fixed-point-units.test.ts` additionally checks canonical bytes, typed
invalid-input failures, no getter execution, frozen copies, real kernel calls,
old release rejection contracts, fractional scoring interoperability and
financial/profile fences. Validly compiled mutations in add, subtract,
multiply, divide, accumulation, tie comparison, remainder and sign handling
must produce detectable wrong numerical results rather than parser errors.
All fixtures are synthetic.

### Measured numerical audit

The standalone audit passed **1,683 exact comparisons**, including **340
final-range overflow rejections**, plus **19 zero-divisor rejections**. Observed
maxima were **251 cycles**, **203 instructions** and **8,875 source characters**.
These are measurements, not new execution limits.

The focused fixed-point, retained vector and retained learner suites passed
**124 tests**. TypeScript checking passed. Fresh dependency scanning reported
zero known vulnerabilities. Static scanning reported four existing medium
findings outside this dependency (three export-script hashing warnings and one
founder-access cookie warning); privacy scanning reported the existing low
physics-demo energy-budget logging warning. No finding was in the new package.
These unrelated warnings were not silently suppressed or treated as fixed.

Before integration with the retained decimal-string release, the complete
database-free regression build passed **11,252 tests across 271
passing files**, retaining the **51 existing conditional skips across four
files** and adding no skips. Client/server bundling, canonical dependency checks,
bundle-size limits, Wave Vault navigation, required preloads and startup-safety
checks passed. The additional repository guard commands and type check passed.
An initial build hit an existing export-isolation test's five-second deadline
while scans ran concurrently; its unchanged 126-test suite and the unchanged
full build both passed when rerun without scans. No deadlines were increased.

The application preview was not running, so no rendered UI was verified.
No UI was changed and the funded application backend was not started.

### Integration verification

The merged tree preserves the decimal-string package unchanged and names this
unit-based dependency `@wls/fixed-point-units` to avoid replacing a retained
release with incompatible inputs or raw-VM overflow behavior. The focused
combined suites passed **251 tests**. Both standalone audits passed: this
package's **1,683 exact comparisons** and the decimal-string package's **25
checks across 413 fixtures**. Explicit cross-package tests reject swapped input
types while confirming equivalent numerical answers.

The complete merged-tree build passed **11,352 tests across 272 passing files**
with the same **51 existing conditional skips**, followed by client/server
bundling and all production-artifact checks. TypeScript checking passed.
Repeated security scans found zero dependency vulnerabilities and only the
same four unrelated medium static findings and one unrelated low logging
finding. No test deadlines, VM budgets or skip settings were changed.
