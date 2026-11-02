import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  FEATURE_SCALING_PACKAGE, fitFeatureScaler, transformFeatures,
  trainScaledFractionalClassifier, evaluateScaledFractionalClassifier,
  getFeatureScalingKernelSource, compileFeatureScalingFit,
  FeatureScalingInputError, FeatureScalingRangeError,
} from "../shared/wls-feature-scaling";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, UnsupportedExecutionError } from "../shared/vm-security";
import {
  featureScalingFixtures, featureScalingReference, SCALED_AND_TRAINING, SCALED_AND_HELD_OUT,
} from "./wls-feature-scaling-reference";
import { fractionalLearningReference } from "./wls-fractional-learning-reference";

const fixtures = featureScalingFixtures();
assert.equal(fixtures.length, 134, "The audited fixture inventory must not silently shrink");
const expected = featureScalingReference(fixtures);
assert.equal(expected.length, fixtures.length);
let maxCycles = 0, maxInstructions = 0, maxSourceCharacters = 0, coordinateResultsCompared = 0;
function measure(result: { source: string; cycles: number }) {
  const count = compilePythonWavelength(result.source).length;
  assert.ok(result.cycles > 0 && result.cycles <= 2048);
  assert.ok(count > 0 && count <= 2048 && result.source.length <= 65_536);
  maxCycles = Math.max(maxCycles, result.cycles);
  maxInstructions = Math.max(maxInstructions, count);
  maxSourceCharacters = Math.max(maxSourceCharacters, result.source.length);
}
fixtures.forEach((request, i) => {
  const result = request.model ? transformFeatures(request.model, request.samples) : fitFeatureScaler(request.samples);
  assert.deepEqual({ model: result.model, samples: result.samples }, expected[i]);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.model) &&
    Object.isFrozen(result.samples) && result.samples.every(Object.isFrozen));
  assert.ok(result.kernelCalls.includes("scalingValue") && result.kernelCalls.includes("fixedRound"));
  if (!request.model) assert.ok(result.kernelCalls.includes("scalingMaximum"));
  coordinateResultsCompared += result.samples.length * 2;
  measure(result);
});
const rates = ["0.001", "0.002", "0.003", "0.007", "0.010", "0.125", "0.250", "0.333",
  "0.499", "0.500", "0.501", "0.625", "0.875", "0.999", "1.000"];
const heldOut = featureScalingReference([{ model: expected[0].model, samples: SCALED_AND_HELD_OUT }])[0];
const requests = rates.map(learningRate => ({
  operation: "train" as const, samples: expected[0].samples, learningRate, epochs: 3,
  evaluation: heldOut.samples,
}));
const oracle = fractionalLearningReference(requests);
let parameterAssignmentsCompared = 0;
rates.forEach((rate, i) => {
  const trained = trainScaledFractionalClassifier(SCALED_AND_TRAINING, rate);
  const evaluated = evaluateScaledFractionalClassifier(trained.scaling.model, trained.training.model, SCALED_AND_HELD_OUT);
  assert.deepEqual(trained.training.model, oracle[i].model);
  assert.deepEqual(trained.training.parameterUpdates, oracle[i].parameterUpdates);
  assert.deepEqual(evaluated.scaling.samples, heldOut.samples);
  assert.deepEqual(evaluated.evaluation.rawMargins, oracle[i].evaluation!.rawMargins);
  assert.deepEqual(evaluated.evaluation.scoreUnits, oracle[i].evaluation!.scoreUnits);
  assert.deepEqual(evaluated.evaluation.predictions, oracle[i].evaluation!.predictions);
  assert.equal(trained.training.finalMistakes, 0);
  assert.equal(evaluated.evaluation.mistakes, 0);
  parameterAssignmentsCompared += trained.training.parameterUpdates.length * 3;
  [trained.scaling, trained.training, evaluated.scaling, evaluated.evaluation].forEach(measure);
});
const varied = expected.slice(6, 38);
const variedOracle = fractionalLearningReference(varied.map(p => ({
  operation: "train", samples: p.samples, learningRate: "0.333", epochs: 3,
})));
varied.forEach((p, i) => {
  const result = trainScaledFractionalClassifier(fixtures[i + 6].samples, "0.333");
  assert.deepEqual(result.scaling.samples, p.samples);
  assert.deepEqual(result.training.model, variedOracle[i].model);
  assert.deepEqual(result.training.parameterUpdates, variedOracle[i].parameterUpdates);
  assert.equal(result.training.finalMistakes, variedOracle[i].finalMistakes);
  parameterAssignmentsCompared += result.training.parameterUpdates.length * 3;
  [result.scaling, result.training].forEach(measure);
});
const source = compileFeatureScalingFit(SCALED_AND_TRAINING);
const wrong = source.replace('@576.6nm CONST {"line":9,"args":[1000]}', '@576.6nm CONST {"line":9,"args":[999]}');
assert.notEqual(source, wrong);
assert.equal(executePythonWavelength(source).variables.out_0_x1, -1000);
assert.equal(executePythonWavelength(wrong).variables.out_0_x1, -999);
assert.throws(() => assertLegacyExecutionSource(source, true), UnsupportedExecutionError);
assert.throws(() => transformFeatures(expected[0].model, [{ x1: "1000", x2: "0.006", label: 0 }]), FeatureScalingRangeError);
assert.throws(() => fitFeatureScaler([{ x1: "1\n", x2: "0", label: 0 }]), FeatureScalingInputError);
const canonical = readFileSync("shared/wls-feature-scaling/0.1.0/kernel.wls", "utf8");
assert.equal(canonical, getFeatureScalingKernelSource());
const { source: file, ...manifest } = JSON.parse(readFileSync("shared/wls-feature-scaling/0.1.0/manifest.json", "utf8"));
assert.equal(file, "kernel.wls");
assert.deepEqual(manifest, FEATURE_SCALING_PACKAGE);
const demo = trainScaledFractionalClassifier(SCALED_AND_TRAINING, "0.500");
console.log(JSON.stringify({
  verdict: "PASS_BOUNDED_FEATURE_SCALING", package: FEATURE_SCALING_PACKAGE,
  evidence: {
    fixtures: fixtures.length, coordinateResultsCompared, trainingPipelines: rates.length + varied.length,
    parameterAssignmentsCompared, maxCycles, maxInstructions, maxSourceCharacters,
    kernelSha256: createHash("sha256").update(canonical).digest("hex"),
    fittedScaler: demo.scaling.model, learnedModel: demo.training.model,
    heldOutSamples: SCALED_AND_HELD_OUT.length, heldOutMistakesAcrossDemonstrationRates: 0,
    ratesCompared: rates,
  },
  limits: ["Synthetic, local-only two-feature experiments, not general AI.",
    "Training fits 1–4 samples; transforms accept 1–16; at most three learner epochs.",
    "Out-of-fit-range measurements fail; zero training columns accept only zero later.",
    "Thousandth quantization can discard small values. No automatic refit or clamping.",
    "Each stage is a separate bounded VM run. No combined enlarged budget.",
    "Native browser verification of this new scaler is not established by Node audits."],
}, null, 2));
