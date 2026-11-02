import {
  trainFractionalClassifier, trainFractionalRateClassifier, compileFractionalRateTraining,
  evaluateFractionalClassifier, compileFractionalEvaluation,
  FractionalLearningInputError, FractionalLearningRangeError,
} from "../../../shared/wls-fractional-learning";
import { FixedPointInputError, FixedPointRangeError, parseFixedPoint } from "../../../shared/wls-fixed-point";
import { executeFixedPointFixture, compileFixedPointFixture } from "../../../scripts/wls-fixed-point-fixtures";
import type { FixedPointFixture } from "../../../scripts/wls-fixed-point-reference";
import type { FractionalReferenceRequest } from "../../../scripts/wls-fractional-learning-reference";
import { executePythonWavelength } from "../../../shared/wavelength-python-vm";
import { compilePythonWavelength } from "../../../shared/wavelength-python";
import { VM_MAX_CYCLES } from "../../../shared/vm-security";

export interface NumericalPayload {
  fixed: FixedPointFixture[];
  training: FractionalReferenceRequest[];
  evaluation: FractionalReferenceRequest[];
}
async function evidence(source: string, cycles: number | null) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return {
    sourceSha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join(""),
    cycles, instructions: compilePythonWavelength(source).length, characters: source.length,
  };
}
function evaluationFields(result: ReturnType<typeof evaluateFractionalClassifier>) {
  return { status: "ok", predictions: result.predictions, scores: result.scores, scoreUnits: result.scoreUnits,
    rawMargins: result.rawMargins, marginScale: result.marginScale, mistakes: result.mistakes };
}
function callCounts(calls: readonly string[]) {
  return calls.reduce<Record<string, number>>((counts, name) => {
    counts[name] = (counts[name] ?? 0) + 1; return counts;
  }, {});
}
/** Used unchanged by the native page and Node baseline. Oracles stay outside this bundle. */
export async function runNumericalCases(payload: NumericalPayload) {
  const fixed = [];
  for (const fixture of payload.fixed) {
    const source = compileFixedPointFixture(fixture);
    try {
      const actual = executeFixedPointFixture(fixture);
      fixed.push({ semantic: { status: "ok", units: actual.units, value: actual.value },
        evidence: await evidence(source, actual.cycles) });
    } catch (error) {
      if (error instanceof FixedPointRangeError) {
        const raw = executePythonWavelength(source);
        if (raw.variables.result !== null) throw new Error("Overflow did not originate in native range checking");
        fixed.push({ semantic: { status: "overflow" }, evidence: await evidence(source, raw.cycles) });
      } else if (fixture.operation === "divide" && error instanceof Error && /Division by zero/.test(error.message)) {
        // A thrown VM call has no returned cycle measurement. Do not invent one.
        fixed.push({ semantic: { status: "division-by-zero" }, evidence: await evidence(source, null) });
      } else throw error;
    }
  }
  const training = [];
  for (const request of payload.training) {
    if (request.operation !== "train") throw new Error("Invalid training fixture");
    const configurable = Object.hasOwn(request, "learningRate");
    const trained = configurable
      ? trainFractionalRateClassifier(request.samples, request.learningRate, request.epochs)
      : trainFractionalClassifier(request.samples, request.epochs);
    if (trained.package.version !== (configurable ? "0.2.0" : "0.1.0")) {
      throw new Error("Wrong fractional learning release");
    }
    if (configurable && (!("learningRate" in trained) || trained.learningRate !== parseFixedPoint(request.learningRate).decimal)) {
      throw new Error("Wrong normalized learning rate");
    }
    if (!Object.isFrozen(trained.parameterUpdates) || !trained.parameterUpdates.every(update => Object.isFrozen(update))) {
      throw new Error("Native parameter update snapshots must be immutable");
    }
    const checked = request.evaluation ? evaluateFractionalClassifier(trained.model, request.evaluation) : undefined;
    training.push({
      semantic: { model: trained.model, initialMistakes: trained.initialMistakes, finalMistakes: trained.finalMistakes,
        mistakesByEpoch: trained.mistakesByEpoch, updates: trained.updates, parameterUpdates: trained.parameterUpdates,
        ...(checked ? { evaluation: evaluationFields(checked) } : {}) },
      evidence: await evidence(trained.source, trained.cycles), calls: callCounts(trained.kernelCalls),
      ...(checked ? { evaluationEvidence: await evidence(checked.source, checked.cycles),
        evaluationCalls: callCounts(checked.kernelCalls) } : {}),
    });
  }
  const evaluation = [];
  for (const request of payload.evaluation) {
    if (request.operation !== "evaluate") throw new Error("Invalid evaluation fixture");
    const source = compileFractionalEvaluation(request.model, request.samples);
    try {
      const actual = evaluateFractionalClassifier(request.model, request.samples);
      evaluation.push({ semantic: evaluationFields(actual), evidence: await evidence(source, actual.cycles),
        calls: callCounts(actual.kernelCalls) });
    } catch (error) {
      if (!(error instanceof FractionalLearningRangeError)) throw error;
      const raw = executePythonWavelength(source);
      if (!request.samples.some((_, i) => raw.variables[`score_${i}`] === null)) {
        throw new Error("Overflow did not originate in native score checking");
      }
      evaluation.push({ semantic: { status: "overflow" }, evidence: await evidence(source, raw.cycles) });
    }
  }
  const rejects = (fn: () => unknown, kind: typeof FractionalLearningInputError | typeof FixedPointInputError) => {
    try { fn(); return false; } catch (error) { if (error instanceof kind) return true; throw error; }
  };
  const valid = [{ x1: "0", x2: "0", label: 0 }];
  const model = { w1: "0", w2: "0", bias: "0" };
  const invalid: unknown[] = [[], Array(1), Array(5).fill(valid[0]), [null],
    [{ x1: 0.5, x2: "0", label: 0 }], [{ x1: "0.0001", x2: "0", label: 0 }],
    [{ x1: "8.001", x2: "0", label: 0 }], [{ x1: "-8.001", x2: "0", label: 0 }],
    [{ x1: "0", x2: "0", label: true }], [{ x1: "0", x2: "0", label: "1" }],
    [{ x1: "0\n", x2: "0", label: 0 }], [{ x1: "0", x2: "0", label: 0, extra: 1 }]];
  let getterCalls = 0;
  const getter = [{ x1: "0", x2: "0", label: 0 }];
  Object.defineProperty(getter, "0", { get() { getterCalls++; return valid[0]; } });
  const iterator = [valid[0]];
  Object.defineProperty(iterator, Symbol.iterator, { get() { getterCalls++; return function* () {}; } });
  invalid.push(getter, iterator);
  const rejections = [
    ...invalid.map(input => rejects(() => trainFractionalClassifier(input), FractionalLearningInputError)),
    ...[0, 4, true, "3"].map(epochs => rejects(() => trainFractionalClassifier(valid, epochs), FractionalLearningInputError)),
    rejects(() => evaluateFractionalClassifier(model, Array(17).fill(valid[0])), FractionalLearningInputError),
    rejects(() => evaluateFractionalClassifier({ ...model, w1: "128.001" }, valid), FractionalLearningInputError),
  ];
  // Construct these in the native task: JSON cannot preserve undefined,
  // omitted arguments or accessor descriptors.
  const invalidRates: unknown[] = [undefined, null, 0.5, 1, "0", "-0", "-0.001", "1.001", "1000",
    "0.0001", "1e-3", " 0.5", "0.5\n", "00.5", {}, []];
  for (const key of ["valueOf", "toString", Symbol.toPrimitive]) {
    const rate = {};
    Object.defineProperty(rate, key, { get() { getterCalls++; return () => "0.500"; } });
    invalidRates.push(rate);
  }
  const rateRejections = [
    // A truly omitted argument must not select the retained 0.1.0 API either.
    rejects(() => Reflect.apply(compileFractionalRateTraining, undefined, [valid]), FractionalLearningInputError),
    rejects(() => Reflect.apply(trainFractionalRateClassifier, undefined, [valid]), FractionalLearningInputError),
    ...invalidRates.flatMap(rate => [
      rejects(() => compileFractionalRateTraining(valid, rate), FractionalLearningInputError),
      rejects(() => trainFractionalRateClassifier(valid, rate), FractionalLearningInputError),
    ]),
  ];
  if (getterCalls !== 0) throw new Error("Invalid input invoked an accessor");
  const original = trainFractionalClassifier([
    { x1: "-0.5", x2: "-0.5", label: 0 }, { x1: "-0.5", x2: "0.5", label: 0 },
    { x1: "0.5", x2: "-0.5", label: 0 }, { x1: "0.5", x2: "0.5", label: 1 },
  ]);
  const updated = original.source.replace('@581.42nm MUL {"line":8', '@528.94nm ADD {"line":8');
  const tiny = compileFractionalEvaluation({ w1: "0.001", w2: "0", bias: "0" },
    [{ x1: "-0.001", x2: "0", label: 0 }]);
  const anchor = '@550.21nm LOAD {"line":5,"args":["margin"]}';
  if (tiny.split(anchor).length !== 2) throw new Error("Mutation anchor is not unique");
  const rounded = tiny.replace(anchor, anchor +
    '\n@576.6nm CONST {"line":5,"args":[1000]}\n@545.96nm CALL {"line":5,"args":["fixedRound",2]}');
  const biased = compileFractionalEvaluation({ w1: "0", w2: "0", bias: "-0.001" }, valid);
  const wrongBias = biased.replace('"line":2,"args":[1000]', '"line":2,"args":[1]');
  const zero = compileFractionalEvaluation(model, valid);
  const wrongTie = zero.replace('@541.7nm GE {"line":5', '@573.62nm GT {"line":5');
  const mutations = [
    executePythonWavelength(updated).variables.w1 !== executePythonWavelength(original.source).variables.w1,
    executePythonWavelength(tiny).variables.prediction_0 === 0 && executePythonWavelength(rounded).variables.prediction_0 === 1,
    executePythonWavelength(biased).variables.score_0 === -1 && executePythonWavelength(wrongBias).variables.score_0 !== -1,
    executePythonWavelength(zero).variables.prediction_0 === 1 && executePythonWavelength(wrongTie).variables.prediction_0 === 0,
  ];
  return { fixed, training, evaluation, rejections, rateRejections, getterCalls, mutations, cycleLimit: VM_MAX_CYCLES };
}

// The normal native click task performs the calculations, not debugger evaluation.
if (typeof document !== "undefined") {
  document.querySelector<HTMLButtonElement>("#run")!.addEventListener("click", async () => {
    const status = document.querySelector("#status")!, report = document.querySelector("#report")!;
    status.setAttribute("data-state", "running"); status.textContent = "Running";
    try {
      const payload = JSON.parse(document.querySelector<HTMLTextAreaElement>("#inputs")!.value);
      report.textContent = JSON.stringify(await runNumericalCases(payload));
      status.setAttribute("data-state", "complete"); status.textContent = "Complete";
    } catch (error) {
      report.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
      status.setAttribute("data-state", "error"); status.textContent = "Failed";
    }
  });
}
