import { readFileSync } from "node:fs";
import { isDeepStrictEqual as equal } from "node:util";
import {
  addFixedPoint, compileFixedPointBinary, compileFixedPointDot, compileFixedPointScore,
  createFixedPointVector, dotFixedPointVectors, FIXED_POINT_PACKAGE, FixedPointRangeError,
  getFixedPointKernelSource, multiplyFixedPoint, parseFixedPoint, scoreFixedPointVectors, sumFixedPointVector,
} from "../shared/wls-fixed-point";
import { compileFixedPointFixture, executeFixedPointFixture } from "./wls-fixed-point-fixtures";
import { fixedPointFixtures, fixedPointReference } from "./wls-fixed-point-reference";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, VM_MAX_CYCLES } from "../shared/vm-security";
import { runToHalt } from "../server/wnsp_vm";
import { trainLinearClassifier, evaluateLinearClassifier } from "../shared/wls-learning";
import { dotNumericVectors } from "../shared/wls-numeric-vectors";

const rejects = (fn: () => unknown, matches: (error: unknown) => boolean = () => true) => {
  try { fn(); return false; } catch (error) { return matches(error); }
};
const fixtures = fixedPointFixtures(), oracle = fixedPointReference(fixtures);
const outcomes = { ok: 0, overflow: 0, divisionByZero: 0 };
let arithmeticMatches = true, overflowMatches = true, zeroDivisionMatches = true, boundsRetained = true;
let visitedChecks = true, maxCycles = 0, maxInstructions = 0, maxSourceCharacters = 0;
fixtures.forEach((fixture, i) => {
  const source = compileFixedPointFixture(fixture), expected = oracle[i];
  const instructions = compilePythonWavelength(source).length;
  maxInstructions = Math.max(maxInstructions, instructions);
  maxSourceCharacters = Math.max(maxSourceCharacters, source.length);
  boundsRetained &&= instructions <= 2048 && source.length <= 65_536;
  if (expected.status === "division-by-zero") {
    outcomes.divisionByZero++;
    const divisionError = (e: unknown) => e instanceof Error && /Division by zero/.test(e.message);
    zeroDivisionMatches &&= rejects(() => executePythonWavelength(source), divisionError) &&
      rejects(() => executeFixedPointFixture(fixture), divisionError);
    return;
  }
  const raw = executePythonWavelength(source);
  maxCycles = Math.max(maxCycles, raw.cycles);
  boundsRetained &&= raw.cycles <= 2048;
  visitedChecks &&= raw.trace.some(i => i.op === "CALL" && i.args[0] === "fixedCheck");
  if (expected.status === "overflow") {
    outcomes.overflow++;
    overflowMatches &&= raw.variables.result === null &&
      rejects(() => executeFixedPointFixture(fixture), e => e instanceof FixedPointRangeError);
  } else {
    outcomes.ok++;
    const actual = executeFixedPointFixture(fixture);
    arithmeticMatches &&= raw.variables.result === expected.units &&
      actual.units === expected.units && actual.value === expected.value && actual.scale === 1000;
  }
});
const canonical = getFixedPointKernelSource();
const manifest = JSON.parse(readFileSync(new URL("../shared/wls-fixed-point/0.1.0/manifest.json", import.meta.url), "utf8"));
const product = compileFixedPointDot(["1.25"], ["2.5"]);
const wrongProduct = product.replace('@581.42nm MUL {"line":20', '@528.94nm ADD {"line":20');
const tie = compileFixedPointBinary("multiply", "0.001", "0.500");
const subtractionTag = compileFixedPointBinary("subtract", "1", "0").match(/(@[\d.]+nm) SUB /)![1];
const wrongRounding = tie.replace('@528.94nm ADD {"line":14', `${subtractionTag} SUB {"line":14`);
const overflow = compileFixedPointBinary("add", "1000", "0.001");
const weakenedCheck = overflow.replace('"line":4,"args":[1000000]', '"line":4,"args":[1000001]');
const model = trainLinearClassifier([
  { x1: -1, x2: -1, label: 0 }, { x1: -1, x2: 1, label: 0 },
  { x1: 1, x2: -1, label: 0 }, { x1: 1, x2: 1, label: 1 },
]).model;
const weights = [String(model.w1), String(model.w2)], bias = String(model.bias);
const whole = [{ x1: 2, x2: 2, label: 1 }, { x1: -2, x2: 1, label: 0 }];
const oldScores = evaluateLinearClassifier(model, whole).scores;
const newScores = whole.map(p => scoreFixedPointVectors(weights, [String(p.x1), String(p.x2)], bias).units);
const fractional = scoreFixedPointVectors(weights, ["0.750", "0.500"], bias);
const input = ["1.2", "-0"], vector = createFixedPointVector(input);
input[0] = "999";
let getterCalls = 0;
const getter = ["1"];
Object.defineProperty(getter, "0", { get() { getterCalls++; return "1"; } });
const iterator = ["1"];
Object.defineProperty(iterator, Symbol.iterator, { get() { getterCalls++; return function* () { yield "1"; }; } });
const cancelling = [...Array(8).fill("1000"), ...Array(8).fill("-1000")];
const maxRawNumerator = 16n * 1_000_000n ** 2n + 1_000_000n * 1000n;
const checks = {
  canonicalBytesMatch: readFileSync(new URL("../shared/wls-fixed-point/0.1.0/kernel.wls", import.meta.url), "utf8") === canonical,
  manifestAndFunctionSurfaceMatch: equal(manifest, { ...FIXED_POINT_PACKAGE, source: "kernel.wls" }) &&
    equal(compilePythonWavelength(canonical).filter(i => i.op === "FUNC").map(i => i.args[0]), FIXED_POINT_PACKAGE.kernelFunctions),
  allSevenOperationsExercised: new Set(fixtures.map(c => c.operation)).size === 7,
  everyVectorDimensionExercised: new Set(fixtures.filter(c => Array.isArray(c.left)).map(c => c.left.length)).size === 17,
  independentRationalResultsMatch: arithmeticMatches && outcomes.ok > 0,
  nativeOverflowReturnsNoneAndPackageThrows: overflowMatches && outcomes.overflow > 0,
  nativeDivisionByZeroFails: zeroDivisionMatches && outcomes.divisionByZero > 0,
  realWlsRangeChecksVisited: visitedChecks,
  unchangedVmLimitsRespected: boundsRetained && VM_MAX_CYCLES === 2048,
  maximumIntermediatesExactlyRepresentable: 2n * maxRawNumerator + 1_000_000n <= BigInt(Number.MAX_SAFE_INTEGER),
  noPerTermRounding: dotFixedPointVectors(["0.001", "0.001"], ["0.500", "0.500"]).value === "0.001",
  biasBeforeRounding: scoreFixedPointVectors(["0.001"], ["0.500"], "-0.001").value === "-0.001",
  boundedCancellationPreserved: sumFixedPointVector(cancelling).units === 0 &&
    dotFixedPointVectors(cancelling, Array(16).fill("1000")).units === 0,
  explicitDecimalInputsOnly: [1.25, "1.0000", "1.234\n", "1e-3", "+1", ".5", "1000.001"].every(
    value => rejects(() => parseFixedPoint(value))),
  allZeroFormsCanonicalized: ["0", "-0", "0.000", "-0.000"].every(
    value => parseFixedPoint(value).decimal === "0.000" && !Object.is(parseFixedPoint(value).units, -0)),
  noGetterOrIteratorExecution: rejects(() => sumFixedPointVector(getter)) &&
    rejects(() => sumFixedPointVector(iterator)) && getterCalls === 0,
  vectorCopiedAndFrozen: equal(vector, ["1.200", "0.000"]) && Object.isFrozen(vector),
  invalidOperandsNotMasked: rejects(() => dotFixedPointVectors(["0"], [true])) &&
    rejects(() => dotFixedPointVectors([], ["1"])) && rejects(() => scoreFixedPointVectors([], [], undefined)),
  financialAndPreviewFencesPreserved: [product, product.split("\n").slice(1).join("\n")].every(
    source => rejects(() => runToHalt(source, 0)) && rejects(() => assertLegacyExecutionSource(source, true))),
  multiplicationMutationDetected: executePythonWavelength(wrongProduct).variables.result !== 3125,
  roundingMutationDetected: executePythonWavelength(wrongRounding).variables.result !== 1,
  rangeMutationDetected: executePythonWavelength(weakenedCheck).variables.result === 1_000_001 &&
    rejects(() => addFixedPoint("1000", "0.001"), e => e instanceof FixedPointRangeError),
  pinnedIntegerPackageUnaffected: dotNumericVectors([1, 2], [3, 4]).value === 11 &&
    rejects(() => dotNumericVectors(["1"], ["2"])) && rejects(() => dotFixedPointVectors([1], [2])),
  learnedWholeNumberScoresPreserved: equal(newScores, oldScores.map(score => score * 1000)),
  fractionalMeasurementScoringWorks: fractional.value === "0.250",
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
console.log(JSON.stringify({
  verdict: failed.length ? "FAIL" : "PASS_BOUNDED_FIXED_POINT",
  package: FIXED_POINT_PACKAGE, checks, passed: Object.keys(checks).length - failed.length, failed,
  evidence: { fixtures: fixtures.length, outcomes, maxCyclesPerExecution: maxCycles,
    maxSourceCharacters, maxInstructions, scale: 1000,
    multiplyExample: multiplyFixedPoint("1.250", "2.500").value,
    fractionalLearningScore: fractional.value,
    maximumRoundingIntermediateBound: String(2n * maxRawNumerator + 1_000_000n) },
  limitations: [
    "Three decimal places; nearest rounding with exact ties away from zero; output overflow is an error, not saturation.",
    "Host-managed decimal encoding/vector representation; all arithmetic, rounding and result-range checking execute in WLS.",
    "Raw kernels contain internal widened-accumulator primitives, not a new first-class fixed-point VM type.",
    "Fractional scoring only; the existing training package still accepts its original bounded integer samples.",
    "Local-only package; synthetic data, no private records, financial effects, remote registry or publishing.",
    "Native cross-browser numerical parity is not established by compiler-fence tests.",
  ],
}, null, 2));
if (failed.length) process.exitCode = 1;
