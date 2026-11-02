import { readFileSync } from "node:fs";
import { isDeepStrictEqual as equal } from "node:util";
import {
  compileFractionalTraining, compileFractionalEvaluation, evaluateFractionalClassifier,
  FRACTIONAL_LEARNING_PACKAGE, FractionalLearningRangeError, getFractionalLearningKernelSource,
  trainFractionalClassifier,
} from "../shared/wls-fractional-learning";
import { getFixedPointKernelSource, parseFixedPoint } from "../shared/wls-fixed-point";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, VM_MAX_CYCLES } from "../shared/vm-security";
import { runToHalt } from "../server/wnsp_vm";
import { auditFractionalSyntheticCorpus, FRACTIONAL_CORPUS_SEEDS,
  fractionalSyntheticSensitivity } from "./wls-fractional-learning-corpus";
import {
  FRACTIONAL_AND_SAMPLES, FRACTIONAL_HELD_OUT, fractionalTrainingFixtures, fractionalEvaluationFixtures,
  fractionalEvaluationGrid, fractionalLearningReference,
} from "./wls-fractional-learning-reference";

const rejects = (fn: () => unknown, match: (error: unknown) => boolean = () => true) => {
  try { fn(); return false; } catch (error) { return match(error); }
};
const evaluationFields = (result: ReturnType<typeof evaluateFractionalClassifier>) => ({
  status: "ok", predictions: result.predictions, scores: result.scores, scoreUnits: result.scoreUnits,
  rawMargins: result.rawMargins, marginScale: result.marginScale, mistakes: result.mistakes,
});
const trainingCases = fractionalTrainingFixtures(), evaluationCases = fractionalEvaluationFixtures();
const reference = fractionalLearningReference([...trainingCases, ...evaluationCases]);
let trainingMatches = true, evaluationMatches = true, limitsRespected = true, overflowsRejected = 0;
let parameterUpdatesMatch = true, parameterAssignmentsCompared = 0;
let maxTrainingCycles = 0, maxEvaluationCycles = 0, maxInstructions = 0, maxSourceCharacters = 0;
function measure(source: string, cycles: number, kind: "training" | "evaluation") {
  const count = compilePythonWavelength(source).length;
  maxInstructions = Math.max(maxInstructions, count); maxSourceCharacters = Math.max(maxSourceCharacters, source.length);
  if (kind === "training") maxTrainingCycles = Math.max(maxTrainingCycles, cycles);
  else maxEvaluationCycles = Math.max(maxEvaluationCycles, cycles);
  limitsRespected &&= count <= 2048 && cycles <= 2048 && source.length <= 65_536;
}
trainingCases.forEach((request, i) => {
  if (request.operation !== "train") throw new Error("Wrong training fixture");
  const trained = trainFractionalClassifier(request.samples, request.epochs);
  const expected = reference[i];
  parameterUpdatesMatch &&= equal(trained.parameterUpdates, expected.parameterUpdates);
  parameterAssignmentsCompared += trained.parameterUpdates.length * 3;
  trainingMatches &&= equal({
    model: trained.model, initialMistakes: trained.initialMistakes, finalMistakes: trained.finalMistakes,
    mistakesByEpoch: trained.mistakesByEpoch, updates: trained.updates,
  }, {
    model: expected.model, initialMistakes: expected.initialMistakes, finalMistakes: expected.finalMistakes,
    mistakesByEpoch: expected.mistakesByEpoch, updates: expected.updates,
  });
  measure(trained.source, trained.cycles, "training");
  const evaluated = evaluateFractionalClassifier(trained.model, request.evaluation!);
  evaluationMatches &&= equal(evaluationFields(evaluated), expected.evaluation);
  measure(evaluated.source, evaluated.cycles, "evaluation");
});
evaluationCases.forEach((request, i) => {
  if (request.operation !== "evaluate") throw new Error("Wrong evaluation fixture");
  const expected = reference[trainingCases.length + i].evaluation!;
  const source = compileFractionalEvaluation(request.model, request.samples);
  const raw = executePythonWavelength(source);
  measure(source, raw.cycles, "evaluation");
  if (expected.status === "overflow") {
    if (rejects(() => evaluateFractionalClassifier(request.model, request.samples),
      e => e instanceof FractionalLearningRangeError)) overflowsRejected++;
    else evaluationMatches = false;
  } else evaluationMatches &&= equal(evaluationFields(evaluateFractionalClassifier(request.model, request.samples)), expected);
});
const learned = trainFractionalClassifier(FRACTIONAL_AND_SAMPLES);
const baseline = evaluateFractionalClassifier({ w1: "0", w2: "0", bias: "0" }, FRACTIONAL_HELD_OUT);
const heldOut = evaluateFractionalClassifier(learned.model, FRACTIONAL_HELD_OUT);
const grid = fractionalEvaluationGrid();
const gridReference = fractionalLearningReference([{ operation: "evaluate", model: learned.model, samples: grid }])[0].evaluation!;
const gridResults = { status: "ok", predictions: [] as number[], scores: [] as string[], scoreUnits: [] as number[],
  rawMargins: [] as number[], marginScale: 1_000_000, mistakes: 0 };
for (let i = 0; i < grid.length; i += 16) {
  const result = evaluateFractionalClassifier(learned.model, grid.slice(i, i + 16));
  gridResults.predictions.push(...result.predictions); gridResults.scores.push(...result.scores);
  gridResults.scoreUnits.push(...result.scoreUnits); gridResults.rawMargins.push(...result.rawMargins);
  gridResults.mistakes += result.mistakes; measure(result.source, result.cycles, "evaluation");
}
const maximum = evaluateFractionalClassifier({ w1: "-128", w2: "-128", bias: "-128" },
  Array(16).fill({ x1: "-0.001", x2: "-0.001", label: 0 }));
measure(maximum.source, maximum.cycles, "evaluation");
const tinySamples = [{ x1: "-0.001", x2: "0", label: 0 }, { x1: "0", x2: "0", label: 1 },
  { x1: "0.001", x2: "0", label: 1 }];
const tiny = evaluateFractionalClassifier({ w1: "0.001", w2: "0", bias: "0" }, tinySamples);
const xor = trainFractionalClassifier(FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, label: p.x1 !== p.x2 ? 1 : 0 })));
const badUpdates = learned.source.replace('@581.42nm MUL {"line":8', '@528.94nm ADD {"line":8');
const biased = compileFractionalEvaluation({ w1: "0", w2: "0", bias: "-0.001" }, [{ x1: "0", x2: "0", label: 0 }]);
const badBias = biased.replace('"line":2,"args":[1000]', '"line":2,"args":[1]');
const badPrediction = tiny.source.replace('@550.21nm LOAD {"line":5,"args":["margin"]}',
  '@550.21nm LOAD {"line":5,"args":["margin"]}\n@576.6nm CONST {"line":5,"args":[1000]}\n@545.96nm CALL {"line":5,"args":["fixedRound",2]}');
const manifest = JSON.parse(readFileSync(new URL("../shared/wls-fractional-learning/0.1.0/manifest.json", import.meta.url), "utf8"));
const prefix = getFixedPointKernelSource().trimEnd().split("\n").slice(0, -1).join("\n") + "\n";
let calls = 0;
const getter = [{ x1: "0", x2: "0", label: 0 }];
Object.defineProperty(getter, "0", { get() { calls++; return FRACTIONAL_AND_SAMPLES[0]; } });
const iterator = [FRACTIONAL_AND_SAMPLES[0]];
Object.defineProperty(iterator, Symbol.iterator, { get() { calls++; return function* () {}; } });
const synthetic = auditFractionalSyntheticCorpus();
const syntheticSensitivity = fractionalSyntheticSensitivity();
const checks = {
  seededSyntheticCorpusMatches: synthetic.cases > 39 && synthetic.failures.length === 0,
  transientSyntheticAssignmentMutationsRejected: syntheticSensitivity.every(result => result.rejected),
  canonicalBytesMatch: getFractionalLearningKernelSource() ===
    readFileSync(new URL("../shared/wls-fractional-learning/0.1.0/kernel.wls", import.meta.url), "utf8"),
  exactManifestAndFunctionSurface: equal(manifest, { ...FRACTIONAL_LEARNING_PACKAGE, source: "kernel.wls" }) &&
    equal(compilePythonWavelength(getFractionalLearningKernelSource()).filter(i => i.op === "FUNC").map(i => i.args[0]), manifest.operations),
  actualFixedPointDependencyLinked: learned.source.startsWith(prefix),
  independentRationalTrainingMatches: trainingMatches,
  everyParameterAssignmentMatchesExactRational: parameterUpdatesMatch && parameterAssignmentsCompared > 0,
  independentRationalEvaluationMatches: evaluationMatches,
  realFractionalWeightsLearned: learned.model.w1 === "1.500" && learned.model.w2 === "0.500" && learned.model.bias === "-1.000",
  trainingErrorsImprove: learned.initialMistakes === 3 && learned.finalMistakes === 0,
  heldOutErrorsImprove: baseline.mistakes > heldOut.mistakes && heldOut.mistakes === 0,
  exactGridPredictionsMatch: equal(gridResults, gridReference) && gridResults.predictions.length === 289,
  nonseparableNegativeControlHonest: xor.finalMistakes > 0,
  actualUpdateCallsVisited: learned.kernelCalls.filter(n => n === "fractionalUpdate").length === 36,
  actualPredictionCallsVisited: learned.kernelCalls.filter(n => n === "fractionalPredict").length === 20,
  epochErrorsAndUpdatesComputed: equal(learned.mistakesByEpoch, [2, 1, 0]) && learned.updates === 3,
  rawDecisionPreservedBelowDisplayPrecision: equal(tiny.predictions, [0, 1, 1]) &&
    equal(tiny.rawMargins, [-1, 0, 1]) && equal(tiny.scores, ["0.000", "0.000", "0.000"]),
  scoreOverflowRejected: overflowsRejected === 2,
  unchangedVmLimitsRespected: limitsRespected && VM_MAX_CYCLES === 2048,
  numericalIntermediateBoundsExact: 12n * 8000n <= 128000n &&
    2n * 128000n * 8000n + 128000n * 1000n === 2176000000n,
  invalidDataNotCoerced: rejects(() => trainFractionalClassifier([{ x1: 0.5, x2: "0", label: 0 }])) &&
    rejects(() => trainFractionalClassifier([{ x1: "0.0001", x2: "0", label: 0 }])) &&
    rejects(() => trainFractionalClassifier([{ x1: "0", x2: "0", label: true }])),
  batchesAndEpochsBounded: rejects(() => trainFractionalClassifier(Array(5).fill(FRACTIONAL_AND_SAMPLES[0]))) &&
    rejects(() => trainFractionalClassifier(FRACTIONAL_AND_SAMPLES, 4)) &&
    rejects(() => evaluateFractionalClassifier(learned.model, Array(17).fill(FRACTIONAL_AND_SAMPLES[0]))),
  gettersAndIteratorsNotInvoked: rejects(() => trainFractionalClassifier(getter)) &&
    rejects(() => trainFractionalClassifier(iterator)) && calls === 0,
  modelSnapshotFrozen: Object.isFrozen(learned.model) && Object.isFrozen(learned.mistakesByEpoch),
  financialAndPreviewFences: [learned.source, learned.source.split("\n").slice(1).join("\n")].every(source =>
    rejects(() => runToHalt(source, 0)) && rejects(() => assertLegacyExecutionSource(source, true))),
  wrongUpdateMutationDetected: executePythonWavelength(badUpdates).variables.w1 !== parseFixedPoint(learned.model.w1).units,
  wrongBiasScaleMutationDetected: executePythonWavelength(badBias).variables.score_0 !== -1,
  roundedDecisionMutationDetected: executePythonWavelength(badPrediction).variables.prediction_0 === 1 &&
    executePythonWavelength(tiny.source).variables.prediction_0 === 0,
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
console.log(JSON.stringify({
  verdict: failed.length ? "FAIL" : "PASS_BOUNDED_FRACTIONAL_LEARNING",
  package: FRACTIONAL_LEARNING_PACKAGE, checks, passed: Object.keys(checks).length - failed.length, failed,
  evidence: { trainingCases: trainingCases.length, evaluationCases: evaluationCases.length, gridPoints: grid.length,
    learnedModel: learned.model, trainingMistakesBefore: learned.initialMistakes, trainingMistakesAfter: learned.finalMistakes,
    heldOutSamples: FRACTIONAL_HELD_OUT.length, heldOutMistakesBefore: baseline.mistakes, heldOutMistakesAfter: heldOut.mistakes,
    mistakesByEpoch: learned.mistakesByEpoch, nonzeroUpdates: learned.updates, xorFinalMistakes: xor.finalMistakes,
    maxTrainingCycles, maxEvaluationCycles, maxInstructions, maxSourceCharacters, scoreOverflowsRejected: overflowsRejected,
    parameterAssignmentsCompared, synthetic: { seeds: FRACTIONAL_CORPUS_SEEDS, ...synthetic },
    syntheticSensitivity },
  limitations: [
    "Two-feature online perceptron with fixed learning rate 1.000, not a general neural network or LLM.",
    "Three-place string features bounded to ±8.000; zero initial model; at most four samples/three epochs per run.",
    "Predictions use the exact margin; rounded scores are reporting only and must fit ±1000.000 or evaluation fails.",
    "Host validates/encodes data; WLS performs predictions, updates and metrics within one shared budget per run.",
    "Synthetic local audits only; no private data, persistence, funded operations, GitHub action or publishing.",
    "Browser compiler fences do not establish native cross-browser arithmetic parity.",
  ],
}, null, 2));
if (failed.length) process.exitCode = 1;
