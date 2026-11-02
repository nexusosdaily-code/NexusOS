import { readFileSync } from "node:fs";
import {
  compileLinearTraining, evaluateLinearClassifier, getLearningKernelSource,
  LEARNING_PACKAGE, trainLinearClassifier, type LearningSample,
} from "../shared/wls-learning";
import { learningReference } from "./wls-learning-reference";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { runToHalt } from "../server/wnsp_vm";

const train: LearningSample[] = [
  { x1: -1, x2: -1, label: 0 }, { x1: -1, x2: 1, label: 0 },
  { x1: 1, x2: -1, label: 0 }, { x1: 1, x2: 1, label: 1 },
];
const test: LearningSample[] = [
  { x1: -2, x2: -2, label: 0 }, { x1: -2, x2: 1, label: 0 },
  { x1: 1, x2: -2, label: 0 }, { x1: 2, x2: 2, label: 1 },
  { x1: 0, x2: 0, label: 0 }, { x1: 2, x2: -1, label: 1 },
  { x1: 0, x2: 2, label: 1 }, { x1: 0, x2: -2, label: 0 },
];
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const rejects = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const training = trainLinearClassifier(train);
const evaluated = evaluateLinearClassifier(training.model, test);
const baseline = evaluateLinearClassifier({ w1: 0, w2: 0, bias: 0 }, test);
const reference = learningReference(train, test, 3);
const xor = train.map(p => ({ ...p, label: (p.x1 !== p.x2 ? 1 : 0) as 0 | 1 }));
const negative = trainLinearClassifier(xor);
const grid: LearningSample[] = [];
for (let x1 = -8; x1 <= 8; x1++) for (let x2 = -8; x2 <= 8; x2++) {
  grid.push({ x1, x2, label: x1 + x2 >= 1 ? 1 : 0 });
}
const gridReference = learningReference(train, grid, 3);
let gridMatches = true, gridMaxCycles = 0;
for (let i = 0; i < grid.length; i += 16) {
  const result = evaluateLinearClassifier(training.model, grid.slice(i, i + 16));
  gridMatches &&= result.mistakes === 0 && equal(result.predictions, gridReference.predictions.slice(i, i + 16))
    && equal(result.scores, gridReference.scores.slice(i, i + 16));
  gridMaxCycles = Math.max(gridMaxCycles, result.cycles);
}
const source = compileLinearTraining(train);
const broken = executePythonWavelength(source.split("@581.42nm MUL").join("@528.94nm ADD"));
const manifest = JSON.parse(readFileSync(new URL("../shared/wls-learning/0.1.0/manifest.json", import.meta.url), "utf8"));
const checks = {
  canonicalBytesMatch: readFileSync(new URL("../shared/wls-learning/0.1.0/kernel.wls", import.meta.url), "utf8") === getLearningKernelSource(),
  fixedManifestMatches: equal(manifest, { name: LEARNING_PACKAGE.name, version: LEARNING_PACKAGE.version,
    executionProfile: LEARNING_PACKAGE.executionProfile, source: "kernel.wls",
    operations: LEARNING_PACKAGE.operations, distribution: LEARNING_PACKAGE.distribution,
    externalCapabilities: LEARNING_PACKAGE.externalCapabilities }),
  learnedWeightsMatchIndependentPython: equal(training.model, reference.model),
  trainingMetricsMatchIndependentPython: training.initialMistakes === reference.initial &&
    training.finalMistakes === reference.final && equal(training.mistakesByEpoch, reference.epochs),
  trainingErrorReduced: training.initialMistakes > training.finalMistakes && training.finalMistakes === 0,
  unseenErrorReduced: baseline.mistakes > evaluated.mistakes && evaluated.mistakes === 0,
  unseenScoresAndPredictionsMatch: equal(evaluated.predictions, reference.predictions) && equal(evaluated.scores, reference.scores),
  fullBoundedGridMatchesIndependentPython: gridMatches,
  existingCycleBudgetRetained: Math.max(training.cycles, evaluated.cycles, gridMaxCycles) <= 2048,
  invalidInputRejected: rejects(() => trainLinearClassifier([{ x1: "fetch()", x2: 0, label: 1 }])) &&
    rejects(() => trainLinearClassifier(Array(5).fill(train[0]))) &&
    rejects(() => trainLinearClassifier(train, 4)),
  financialWrongProfileRejected: rejects(() => runToHalt(source, 0)) &&
    rejects(() => runToHalt(source.split("\n").slice(1).join("\n"), 0)),
  arithmeticMutationDetected: !equal({ w1: broken.variables.w1, w2: broken.variables.w2, bias: broken.variables.bias }, reference.model),
  nonlinearXorNotMisrepresented: negative.finalMistakes > 0 && evaluateLinearClassifier(negative.model, xor).mistakes > 0,
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
console.log(JSON.stringify({
  verdict: failed.length ? "FAIL" : "VIABLE_FOR_BOUNDED_LINEAR_LEARNING",
  scope: "Synthetic integer two-feature perceptron in the existing WLS-PY/1 VM; not a general AI model",
  package: LEARNING_PACKAGE, checks, passed: Object.keys(checks).length - failed.length, failed,
  evidence: {
    model: training.model, trainingSamples: train.length, epochs: 3,
    trainingMistakesBefore: training.initialMistakes, trainingMistakesAfter: training.finalMistakes,
    mistakesByEpoch: training.mistakesByEpoch, unseenSamples: test.length,
    unseenMistakesBefore: baseline.mistakes, unseenMistakesAfter: evaluated.mistakes,
    gridPoints: grid.length, trainingCycles: training.cycles, unseenEvaluationCycles: evaluated.cycles,
    gridMaxCyclesPerInvocation: gridMaxCycles, cycleBudgetPerInvocation: 2048,
    xorFinalMistakes: negative.finalMistakes,
  },
  limitations: [
    "No chat model, neural-network framework, floating-point tensor training or photonic execution established.",
    "The host validates/unrolls bounded calls; WLS performs dot products, predictions, updates and error counting.",
    "No real-user data, model persistence, financial authority, downloads or external AI service.",
    "Independent CPython is audit-only and is not an application dependency or execution fallback.",
  ],
}, null, 2));
if (failed.length) process.exitCode = 1;
