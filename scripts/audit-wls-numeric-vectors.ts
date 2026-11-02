import { readFileSync } from "node:fs";
import {
  compileNumericVectorDot, createBoundedNumericVector, dotNumericVectors,
  getNumericVectorKernelSource, NUMERIC_VECTOR_PACKAGE, scoreNumericVectors, sumNumericVector,
} from "../shared/wls-numeric-vectors";
import { numericVectorFixtures, numericVectorReference } from "./wls-numeric-vector-reference";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { assertLegacyExecutionSource, VM_MAX_CYCLES } from "../shared/vm-security";
import { runToHalt } from "../server/wnsp_vm";
import { trainLinearClassifier, evaluateLinearClassifier } from "../shared/wls-learning";

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const rejects = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const cases = numericVectorFixtures(), oracle = numericVectorReference(cases);
let sumsMatch = true, dotsMatch = true, scoresMatch = true, callsMatch = true, boundsRetained = true;
let maxCycles = 0, maxSourceCharacters = 0, maxInstructions = 0;
cases.forEach((fixture, i) => {
  const sum = sumNumericVector(fixture.left), dot = dotNumericVectors(fixture.left, fixture.right);
  const score = scoreNumericVectors(fixture.left, fixture.right, fixture.bias);
  sumsMatch &&= sum.value === oracle[i].total;
  dotsMatch &&= dot.value === oracle[i].dot;
  scoresMatch &&= score.value === oracle[i].score;
  callsMatch &&= equal(sum.kernelCalls, Array(fixture.left.length).fill("vectorSumStep")) &&
    equal(dot.kernelCalls, Array(fixture.left.length).fill("vectorDotStep")) &&
    equal(score.kernelCalls, [...Array(fixture.left.length).fill("vectorDotStep"), "vectorSumStep"]);
  for (const result of [sum, dot, score]) {
    const count = compilePythonWavelength(result.source).length;
    maxCycles = Math.max(maxCycles, result.cycles);
    maxSourceCharacters = Math.max(maxSourceCharacters, result.source.length);
    maxInstructions = Math.max(maxInstructions, count);
    boundsRetained &&= result.cycles <= 2048 && result.source.length <= 65_536 && count <= 2048;
  }
});
const manifest = JSON.parse(readFileSync(new URL("../shared/wls-numeric-vectors/0.1.0/manifest.json", import.meta.url), "utf8"));
const source = compileNumericVectorDot([2, 3], [4, 5]);
const mutated = source.split("@581.42nm MUL").join("@528.94nm ADD");
let getterCalls = 0;
const accessor = [1];
Object.defineProperty(accessor, "0", { get() { getterCalls++; return 1; } });
const learner = trainLinearClassifier([
  { x1: -1, x2: -1, label: 0 }, { x1: -1, x2: 1, label: 0 },
  { x1: 1, x2: -1, label: 0 }, { x1: 1, x2: 1, label: 1 },
]);
const unseen = [{ x1: 2, x2: 2, label: 1 }, { x1: -2, x2: 1, label: 0 }];
const learnedScores = evaluateLinearClassifier(learner.model, unseen).scores;
const vectorScores = unseen.map(p => scoreNumericVectors(
  [learner.model.w1, learner.model.w2], [p.x1, p.x2], learner.model.bias).value);
const original = [1, 2, 3], snapshot = createBoundedNumericVector(original);
original[0] = 99;
const checks = {
  canonicalBytesMatch: readFileSync(new URL("../shared/wls-numeric-vectors/0.1.0/kernel.wls", import.meta.url), "utf8") === getNumericVectorKernelSource(),
  fixedManifestMatches: equal(manifest, {
    name: NUMERIC_VECTOR_PACKAGE.name, version: NUMERIC_VECTOR_PACKAGE.version,
    executionProfile: NUMERIC_VECTOR_PACKAGE.executionProfile, source: "kernel.wls",
    operations: NUMERIC_VECTOR_PACKAGE.operations, distribution: NUMERIC_VECTOR_PACKAGE.distribution,
    externalCapabilities: NUMERIC_VECTOR_PACKAGE.externalCapabilities,
  }),
  everySupportedDimensionExercised: new Set(cases.map(c => c.left.length)).size === 17,
  sumMatchesIndependentIntegers: sumsMatch,
  dotMatchesIndependentIntegers: dotsMatch,
  weightedScoresMatchIndependentIntegers: scoresMatch,
  actualKernelCallsObserved: callsMatch,
  existingVmBoundsRetained: boundsRetained && VM_MAX_CYCLES === 2048,
  emptyIdentities: sumNumericVector([]).value === 0 && dotNumericVectors([], []).value === 0 &&
    scoreNumericVectors([], [], 7).value === 7,
  mismatchesRejected: rejects(() => dotNumericVectors([], [1])) && rejects(() => dotNumericVectors([1], [])),
  invalidOperandsRejected: rejects(() => dotNumericVectors([0], [true])) &&
    rejects(() => sumNumericVector(Array(17).fill(0))) && rejects(() => sumNumericVector([1_000_001])) &&
    rejects(() => sumNumericVector(["wallet.transfer(99)"])) && rejects(() => scoreNumericVectors([], [], 1.5)),
  gettersNotInvoked: rejects(() => sumNumericVector(accessor)) && getterCalls === 0,
  representationCopiedAndFrozen: equal(snapshot, [1, 2, 3]) && Object.isFrozen(snapshot),
  financialWrongProfileRejected: rejects(() => runToHalt(source, 0)) &&
    rejects(() => runToHalt(source.split("\n").slice(1).join("\n"), 0)),
  headerStrippedPreviewRejected: rejects(() => assertLegacyExecutionSource(source.split("\n").slice(1).join("\n"), true)),
  arithmeticMutationDetected: executePythonWavelength(mutated).variables.result !== 23,
  existingLearnerScoresPreserved: equal(learnedScores, vectorScores),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
console.log(JSON.stringify({
  verdict: failed.length ? "FAIL" : "PASS_BOUNDED_INTEGER_VECTORS",
  package: NUMERIC_VECTOR_PACKAGE, checks, passed: Object.keys(checks).length - failed.length, failed,
  evidence: { fixtures: cases.length, numericalResultsCompared: cases.length * 3,
    maxCyclesPerExecution: maxCycles, maxSourceCharacters, maxInstructions,
    sumExample: sumNumericVector([1, -2, 3]).value, dotExample: dotNumericVectors([1, -2, 3], [4, 5, -6]).value,
    scoreExample: scoreNumericVectors([1, -2, 3], [4, 5, -6], -2).value,
    exactMaximumDot: dotNumericVectors(Array(16).fill(1_000_000), Array(16).fill(1_000_000)).value },
  limitations: [
    "Host-managed frozen vector representation, not a newly added numerical-array VM value type.",
    "WLS performs every accumulation/multiplication; the host validates data and emits bounded calls.",
    "Integer vectors only; no floating-point tensors, matrices or general neural-network training.",
    "Synthetic audit data and an audit-only independent CPython reference; no real-user records or financial effects.",
  ],
}, null, 2));
if (failed.length) process.exitCode = 1;
