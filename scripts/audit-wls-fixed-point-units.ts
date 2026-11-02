import { strict as assert } from "node:assert";
import { fixedPointScalar, fixedPointVector, compileFixedPointScalar, compileFixedPointVector,
  FIXED_POINT_PACKAGE, FixedPointOverflowError, FixedPointDivisionByZeroError } from "../shared/wls-fixed-point-units";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { scalarFixtures, scalarReference, vectorFixtures, vectorReference } from "./wls-fixed-point-units-reference";

let comparisons = 0, overflowRejections = 0, zeroRejections = 0;
let maxCycles = 0, maxInstructions = 0, maxSourceCharacters = 0;
function audit(source: string, run: () => { units: number }, reference: bigint) {
  const raw = executePythonWavelength(source);
  assert.equal(BigInt(raw.variables.result as number), reference);
  const count = compilePythonWavelength(source).length;
  maxCycles = Math.max(maxCycles, raw.cycles);
  maxInstructions = Math.max(maxInstructions, count);
  maxSourceCharacters = Math.max(maxSourceCharacters, source.length);
  assert.ok(raw.cycles <= 2048 && count <= 2048 && source.length <= 65_536);
  if (reference < -1_000_000n || reference > 1_000_000n) {
    assert.throws(run, FixedPointOverflowError);
    overflowRejections++;
  } else assert.equal(BigInt(run().units), reference);
  comparisons++;
}
for (const op of ["add", "subtract", "multiply", "divide"] as const) {
  for (const a of scalarFixtures) for (const b of scalarFixtures) {
    if (op === "divide" && !b) {
      assert.throws(() => fixedPointScalar(op, a, b), FixedPointDivisionByZeroError);
      zeroRejections++;
    } else audit(compileFixedPointScalar(op, a, b), () => fixedPointScalar(op, a, b), scalarReference(op, a, b));
  }
}
for (const op of ["sum", "dot", "score"] as const) {
  for (const { left, right, bias } of vectorFixtures()) {
    const b = op === "sum" ? undefined : right, c = op === "score" ? bias : undefined;
    audit(compileFixedPointVector(op, left, b, c), () => fixedPointVector(op, left, b, c),
      vectorReference(op, left, right, bias));
  }
}
console.log(JSON.stringify({
  verdict: "PASS_BOUNDED_FIXED_POINT", package: FIXED_POINT_PACKAGE,
  evidence: { comparisons, overflowRejections, zeroRejections,
    maxCycles, maxInstructions, maxSourceCharacters },
  scope: "Synthetic, audit-only BigInt rational reference; real WLS arithmetic; no downloads, records, funds or persistence.",
}, null, 2));
