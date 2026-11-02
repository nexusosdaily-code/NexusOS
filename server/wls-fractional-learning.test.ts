import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compileFractionalEvaluation, compileFractionalTraining, evaluateFractionalClassifier,
  FRACTIONAL_LEARNING_LIMITS, FRACTIONAL_LEARNING_PACKAGE, FractionalLearningInputError,
  FractionalLearningRangeError, getFractionalLearningKernelSource, trainFractionalClassifier,
} from "../shared/wls-fractional-learning";
import {
  FIXED_POINT_PACKAGE, getFixedPointKernelSource, multiplyFixedPoint, parseFixedPoint,
} from "../shared/wls-fixed-point";
import { evaluateLinearClassifier, trainLinearClassifier } from "../shared/wls-learning";
import { compilePythonWavelength, translatePython } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, VM_MAX_CYCLES } from "../shared/vm-security";
import { runToHalt } from "./wnsp_vm";
import { auditFractionalSyntheticCorpus, fractionalSyntheticCorpus, fractionalSyntheticSensitivity,
  FRACTIONAL_CORPUS_SEEDS } from "../scripts/wls-fractional-learning-corpus";
import {
  FRACTIONAL_AND_SAMPLES, FRACTIONAL_HELD_OUT, fractionalEvaluationFixtures, fractionalEvaluationGrid,
  fractionalLearningReference, fractionalTrainingFixtures,
} from "../scripts/wls-fractional-learning-reference";

const zeroModel = Object.freeze({ w1: "0", w2: "0", bias: "0" });
function evaluationFields(result: ReturnType<typeof evaluateFractionalClassifier>) {
  return { status: "ok", predictions: result.predictions, scoreUnits: result.scoreUnits,
    scores: result.scores, rawMargins: result.rawMargins, marginScale: result.marginScale, mistakes: result.mistakes };
}
function trainingFields(result: ReturnType<typeof trainFractionalClassifier>) {
  return { model: result.model, initialMistakes: result.initialMistakes, finalMistakes: result.finalMistakes,
    mistakesByEpoch: result.mistakesByEpoch, updates: result.updates, parameterUpdates: result.parameterUpdates };
}
describe("bounded WLS fractional learning", () => {
  it("reproduces seeded synthetic inputs with every legal batch/epoch and evaluation size", () => {
    const corpus = fractionalSyntheticCorpus();
    expect(corpus).toEqual(fractionalSyntheticCorpus());
    expect(corpus).toHaveLength(192);
    expect(new Set(corpus.map(c => c.id)).size).toBe(corpus.length);
    expect(fractionalSyntheticCorpus([42])).not.toEqual(fractionalSyntheticCorpus([43]));
    for (const seed of FRACTIONAL_CORPUS_SEEDS) {
      const subset = corpus.filter(c => c.seed === seed);
      expect(fractionalSyntheticCorpus([seed])).toEqual(subset);
      expect(new Set(subset.map(c => c.request.evaluation!.length))).toEqual(new Set(
        Array.from({ length: 16 }, (_, i) => i + 1)));
      for (const mode of ["mixed", "zero", "boundary", "conflict"]) {
        const requests = subset.filter(c => c.mode === mode).map(c => c.request);
        expect(new Set(requests.map(r => `${r.samples.length}/${r.epochs}`))).toEqual(new Set(
          [1, 2, 3, 4].flatMap(batch => [1, 2, 3].map(epoch => `${batch}/${epoch}`))));
        for (const { samples } of requests) {
          if (mode === "mixed") expect(samples.every(p =>
            Number(p.x1) * Number(p.x2) < 0 && Number(p.x1) * 1000 % 1000 !== 0)).toBe(true);
          if (mode === "zero") expect(samples.every(p => Number(p.x1) === 0)).toBe(true);
          if (mode === "boundary") expect(samples.every(p => Math.abs(Number(p.x1)) === 8)).toBe(true);
          if (mode === "conflict" && samples.length > 1) {
            expect([samples[0].x1, samples[0].x2]).toEqual([samples[1].x1, samples[1].x2]);
            expect(samples[0].label).not.toBe(samples[1].label);
          }
        }
      }
    }
    for (const seed of [-1, 0x100000000, 1.5, NaN]) expect(() => fractionalSyntheticCorpus([seed])).toThrow(/seed/);
  });
  it("compares every seeded assignment, prediction and metric to the rational oracle within unchanged budgets", () => {
    const corpus = fractionalSyntheticCorpus(), report = auditFractionalSyntheticCorpus(corpus);
    expect(report.failures, JSON.stringify(report.failures)).toEqual([]);
    expect(report.parameterAssignmentsCompared).toBe(
      corpus.reduce((sum, c) => sum + c.request.samples.length * c.request.epochs * 3, 0));
    expect(report.maxTrainingCycles).toBeLessThanOrEqual(2048);
    expect(report.maxEvaluationCycles).toBeLessThanOrEqual(2048);
    expect(report.maxInstructions).toBeLessThanOrEqual(2048);
    expect(report.maxSourceCharacters).toBeLessThanOrEqual(65_536);
  }, 30_000);
  it("makes the expanded audit reject transient errors in each parameter at early, middle and last steps", () => {
    const results = fractionalSyntheticSensitivity();
    expect(results).toHaveLength(9);
    expect(results.every(result => result.rejected), JSON.stringify(results)).toBe(true);
  }, 20_000);
  it("records a replayable seed and inputs for errors and still checks later cases", () => {
    const cases = fractionalSyntheticCorpus([123]).slice(0, 2);
    const report = auditFractionalSyntheticCorpus(cases, (source, _testCase, phase) =>
      phase === "training" ? "invalid WLS" : source);
    expect(report.failures).toHaveLength(2);
    report.failures.forEach((failure, i) => {
      expect(failure).toMatchObject({ id: cases[i].id, seed: 123, request: cases[i].request });
      expect(failure.mismatches[0]).toMatch(/^execution:/);
    });
  });
  it("links exact canonical helpers and the real pinned fixed-point dependency", () => {
    const source = getFractionalLearningKernelSource();
    expect(readFileSync(new URL("../shared/wls-fractional-learning/0.1.0/kernel.wls", import.meta.url), "utf8")).toBe(source);
    const manifest = JSON.parse(readFileSync(new URL("../shared/wls-fractional-learning/0.1.0/manifest.json", import.meta.url), "utf8"));
    expect(manifest).toEqual({ ...FRACTIONAL_LEARNING_PACKAGE, source: "kernel.wls" });
    expect(manifest.dependencies).toEqual([{
      name: FIXED_POINT_PACKAGE.name, version: FIXED_POINT_PACKAGE.version, executionProfile: FIXED_POINT_PACKAGE.executionProfile,
    }]);
    expect(compilePythonWavelength(source).filter(i => i.op === "FUNC").map(i => i.args[0])).toEqual(manifest.operations);
    expect(executePythonWavelength(source).variables).toEqual({});
    const compiled = compileFractionalTraining(FRACTIONAL_AND_SAMPLES);
    const prefix = getFixedPointKernelSource().trimEnd().split("\n").slice(0, -1).join("\n") + "\n";
    expect(compiled.startsWith(prefix)).toBe(true);
    expect(compilePythonWavelength(compiled).filter(i => i.op === "HALT")).toHaveLength(1);
  });
  it("learns fractional weights through actual WLS calls with no host-trained substitute", () => {
    const result = trainFractionalClassifier(FRACTIONAL_AND_SAMPLES);
    expect(result.model).toEqual({ w1: "1.500", w2: "0.500", bias: "-1.000" });
    expect(result.initialMistakes).toBe(3);
    expect(result.finalMistakes).toBe(0);
    expect(result.mistakesByEpoch).toEqual([2, 1, 0]);
    expect(result.updates).toBe(3);
    expect(result.kernelCalls.filter(n => n === "fractionalUpdate")).toHaveLength(36);
    expect(result.kernelCalls.filter(n => n === "fractionalPredict")).toHaveLength(20);
    expect(result.kernelCalls.filter(n => n === "fractionalMargin2")).toHaveLength(20);
    const raw = executePythonWavelength(result.source);
    expect([raw.variables.w1, raw.variables.w2, raw.variables.bias]).toEqual([1500, 500, -1000]);
    expect(Object.isFrozen(result.model)).toBe(true);
    expect(Object.isFrozen(result.mistakesByEpoch)).toBe(true);
    expect(result.parameterUpdates).toHaveLength(12);
    expect(Object.isFrozen(result.parameterUpdates)).toBe(true);
    expect(result.parameterUpdates.every(Object.isFrozen)).toBe(true);
  });
  it("matches exact rational training for ordering, labels, bounds and all epoch counts", () => {
    const requests = fractionalTrainingFixtures(), references = fractionalLearningReference(requests);
    expect(requests).toHaveLength(39);
    requests.forEach((request, i) => {
      if (request.operation !== "train") throw new Error("Wrong fixture type");
      const trained = trainFractionalClassifier(request.samples, request.epochs);
      const { evaluation, ...expected } = references[i];
      expect(trainingFields(trained)).toEqual(expected);
      expect(trained.parameterUpdates).toHaveLength(request.samples.length * request.epochs);
      const raw = executePythonWavelength(trained.source);
      trained.parameterUpdates.forEach((snapshot, step) => {
        for (const key of ["w1", "w2", "bias"] as const) {
          expect(snapshot[key]).toBe(raw.variables[`step_${step}_${key}`]);
        }
      });
      expect(trained.cycles).toBeLessThanOrEqual(2048);
      expect(trained.source.length).toBeLessThanOrEqual(65_536);
      expect(compilePythonWavelength(trained.source).length).toBeLessThanOrEqual(2048);
      expect(evaluationFields(evaluateFractionalClassifier(trained.model, request.evaluation!))).toEqual(evaluation);
    });
  }, 20_000);
  it("detects a transient wrong update even when the final model is restored", () => {
    const samples = [{ x1: "0", x2: "0", label: 0 as const }];
    const trained = trainFractionalClassifier(samples, 1);
    const code = compilePythonWavelength(trained.source);
    const snapshot = code.findIndex(i => i.op === "STORE" && i.args[0] === "step_0_w1");
    expect(snapshot).toBeGreaterThan(0);
    // Corrupt the assignment before its snapshot, then restore it. Final-only
    // comparisons would miss this error; the exact per-assignment oracle must not.
    const lines = trained.source.split("\n");
    const store = lines.findIndex(line => line.includes('"args":["step_0_w1"]'));
    expect(store).toBeGreaterThan(0);
    const assignment = (value: number) => translatePython(`w1 = ${value}\n`).trimEnd().split("\n").slice(1, -1);
    const mutated = [...lines.slice(0, store - 1), ...assignment(1),
      ...lines.slice(store - 1, store + 1),
      ...assignment(0),
      ...lines.slice(store + 1)].join("\n");
    const raw = executePythonWavelength(mutated);
    const expected = fractionalLearningReference([{ operation: "train", samples, epochs: 1 }])[0];
    expect([raw.variables.w1, raw.variables.w2, raw.variables.bias]).toEqual(
      [0, 0, parseFixedPoint(expected.model!.bias).units]);
    expect(raw.variables.step_0_w1).not.toBe(expected.parameterUpdates![0].w1);
  });
  it("matches exact evaluation including honest score overflow", () => {
    const requests = fractionalEvaluationFixtures(), expected = fractionalLearningReference(requests);
    requests.forEach((request, i) => {
      if (request.operation !== "evaluate") throw new Error("Wrong fixture type");
      if (expected[i].evaluation!.status === "overflow") {
        expect(() => evaluateFractionalClassifier(request.model, request.samples)).toThrow(FractionalLearningRangeError);
      } else expect(evaluationFields(evaluateFractionalClassifier(request.model, request.samples))).toEqual(expected[i].evaluation);
    });
  });
  it("agrees with independent exact decisions on 289 unseen fractional grid points", () => {
    const trained = trainFractionalClassifier(FRACTIONAL_AND_SAMPLES);
    const grid = fractionalEvaluationGrid();
    const reference = fractionalLearningReference([{ operation: "evaluate", model: trained.model, samples: grid }])[0].evaluation!;
    const combined = { status: "ok", predictions: [] as number[], scoreUnits: [] as number[],
      scores: [] as string[], rawMargins: [] as number[], marginScale: 1_000_000, mistakes: 0 };
    for (let offset = 0; offset < grid.length; offset += 16) {
      const result = evaluateFractionalClassifier(trained.model, grid.slice(offset, offset + 16));
      combined.predictions.push(...result.predictions); combined.scoreUnits.push(...result.scoreUnits);
      combined.scores.push(...result.scores); combined.rawMargins.push(...result.rawMargins); combined.mistakes += result.mistakes;
      expect(result.cycles).toBeLessThanOrEqual(2048);
    }
    expect(combined).toEqual(reference);
    expect(combined.predictions).toHaveLength(289);
    expect(combined.mistakes).toBe(0);
  }, 20_000);
  it("classifies using the unrounded margin, including zero and sub-resolution values", () => {
    const result = evaluateFractionalClassifier({ w1: "0.001", w2: "0", bias: "0" }, [
      { x1: "-0.001", x2: "0", label: 0 }, { x1: "0", x2: "0", label: 1 },
      { x1: "0.001", x2: "0", label: 1 },
    ]);
    expect(result.rawMargins).toEqual([-1, 0, 1]);
    expect(result.scores).toEqual(["0.000", "0.000", "0.000"]);
    expect(result.predictions).toEqual([0, 1, 1]);
    expect(result.mistakes).toBe(0);
  });
  it("rounds reporting only, with bias inside the exact margin", () => {
    const samples = [{ x1: "0.500", x2: "0", label: 1 }];
    expect(evaluateFractionalClassifier({ w1: "1.001", w2: "0", bias: "0" }, samples).scores).toEqual(["0.501"]);
    expect(evaluateFractionalClassifier({ w1: "-1.001", w2: "0", bias: "0" }, samples).scores).toEqual(["-0.501"]);
    expect(evaluateFractionalClassifier({ w1: "0.001", w2: "0", bias: "-0.001" }, samples).scores).toEqual(["-0.001"]);
  });
  it("does not claim convergence for XOR or contradictory labels within the finite budget", () => {
    const xor = FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, label: p.x1 !== p.x2 ? 1 : 0 }));
    const contradictory = [{ x1: "0", x2: "0", label: 0 }, { x1: "0", x2: "0", label: 1 }];
    expect(trainFractionalClassifier(xor).finalMistakes).toBeGreaterThan(0);
    expect(trainFractionalClassifier(contradictory).finalMistakes).toBeGreaterThan(0);
    const allPositive = FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, label: 1 }));
    const unchanged = trainFractionalClassifier(allPositive);
    expect(unchanged.updates).toBe(0);
    expect(unchanged.model).toEqual({ w1: "0.000", w2: "0.000", bias: "0.000" });
  });
  it("fits the accepted maximum batches in one unchanged global VM budget", () => {
    const training = trainFractionalClassifier(Array(4).fill({ x1: "-8.000", x2: "-8.000", label: 0 }), 3);
    const evaluation = evaluateFractionalClassifier({ w1: "-128", w2: "-128", bias: "-128" },
      Array(16).fill({ x1: "-0.001", x2: "-0.001", label: 0 }));
    for (const result of [training, evaluation]) {
      expect(result.cycles).toBeLessThanOrEqual(2048);
      expect(result.source.length).toBeLessThanOrEqual(65_536);
      expect(compilePythonWavelength(result.source).length).toBeLessThanOrEqual(2048);
    }
    expect(VM_MAX_CYCLES).toBe(2048);
    expect(FRACTIONAL_LEARNING_LIMITS).toEqual({
      trainingSamples: 4, epochs: 3, updates: 12, evaluationSamples: 16, featureMagnitudeUnits: 8000,
      modelMagnitudeUnits: 128000, scoreMagnitudeUnits: 1000000, rawMarginMagnitude: 2176000000,
    });
    expect(12n * 8000n <= 128000n).toBe(true);
    expect(2n * 128000n * 8000n + 128000n * 1000n).toBe(2176000000n);
  });
  it("reports score overflow as a whole-operation failure, not partial success or saturation", () => {
    for (const sign of ["", "-"]) {
      const model = { w1: `${sign}128`, w2: `${sign}128`, bias: `${sign}128` };
      const data = [{ x1: "0", x2: "0", label: 1 }, { x1: "8", x2: "8", label: 1 }];
      const source = compileFractionalEvaluation(model, data);
      const raw = executePythonWavelength(source);
      expect(raw.variables.score_0).not.toBe(null);
      expect(raw.variables.score_1).toBe(null);
      expect(() => evaluateFractionalClassifier(model, data)).toThrow(FractionalLearningRangeError);
    }
  });
  it.each([0, -1, 4, 1.5, true, "3", NaN, Infinity, null, {}])("rejects invalid epoch count %#", epochs => {
    expect(() => trainFractionalClassifier(FRACTIONAL_AND_SAMPLES, epochs)).toThrow(FractionalLearningInputError);
    expect(() => compileFractionalTraining(FRACTIONAL_AND_SAMPLES, epochs)).toThrow(FractionalLearningInputError);
  });
  it.each([
    0, 0.5, true, null, undefined, 1n, {}, [], new String("0.5"),
    "8.001", "-8.001", "1000", "0.0001", "1e-3", "1.234\n", "0; pay(1)",
  ])("rejects invalid feature %# without coercing or executing it", feature => {
    for (const key of ["x1", "x2"]) {
      const sample = { x1: "0", x2: "0", label: 0, [key]: feature };
      expect(() => trainFractionalClassifier([sample])).toThrow(FractionalLearningInputError);
      expect(() => evaluateFractionalClassifier(zeroModel, [sample])).toThrow(FractionalLearningInputError);
    }
  });
  it.each([true, false, "0", "1", 2, -1, 0.5, null, undefined, 1n, {}])("rejects invalid label %#", label => {
    expect(() => trainFractionalClassifier([{ x1: "0", x2: "0", label }])).toThrow(FractionalLearningInputError);
  });
  it.each([
    null, undefined, {}, "samples", [], Array(1), Array(5).fill({ x1: "0", x2: "0", label: 0 }),
    [{ x1: "0", label: 0 }], [{ x1: "0", x2: "0", label: 0, extra: "no" }],
    [[0, 0, 0]], [null], [new Date()], new Float64Array([0]),
  ])("rejects invalid training shape %#", input => {
    expect(() => compileFractionalTraining(input)).toThrow(FractionalLearningInputError);
    expect(() => trainFractionalClassifier(input)).toThrow(FractionalLearningInputError);
  });
  it("enforces evaluation batch and model bounds independently of training", () => {
    expect(() => evaluateFractionalClassifier(zeroModel, [])).toThrow(FractionalLearningInputError);
    expect(() => evaluateFractionalClassifier(zeroModel, Array(17).fill(FRACTIONAL_AND_SAMPLES[0]))).toThrow(FractionalLearningInputError);
    for (const key of ["w1", "w2", "bias"]) for (const value of ["128.001", "-128.001", 1, true, undefined]) {
      expect(() => evaluateFractionalClassifier({ ...zeroModel, [key]: value }, FRACTIONAL_HELD_OUT)).toThrow(FractionalLearningInputError);
    }
    for (const model of [null, {}, [], { ...zeroModel, extra: 1 }]) {
      expect(() => compileFractionalEvaluation(model, FRACTIONAL_HELD_OUT)).toThrow(FractionalLearningInputError);
    }
  });
  it("never invokes accessors, iterators or scalar-coercion hooks", () => {
    let calls = 0;
    const scalar = { valueOf() { calls++; return 0; }, toString() { calls++; return "0"; } };
    const getter = [{ x1: "0", x2: "0", label: 0 }];
    Object.defineProperty(getter, "0", { get() { calls++; return FRACTIONAL_AND_SAMPLES[0]; } });
    const element = { x1: "0", x2: "0", label: 0 };
    Object.defineProperty(element, "x1", { get() { calls++; return "0"; } });
    const iterator = [FRACTIONAL_AND_SAMPLES[0]];
    Object.defineProperty(iterator, Symbol.iterator, { get() { calls++; return function* () {}; } });
    const hidden = [FRACTIONAL_AND_SAMPLES[0]];
    Object.defineProperty(hidden, "extra", { get() { calls++; return 0; } });
    class CustomArray extends Array {}
    for (const input of [getter, [element], iterator, hidden, new CustomArray(FRACTIONAL_AND_SAMPLES[0]),
      [{ x1: scalar, x2: "0", label: 0 }]]) expect(() => trainFractionalClassifier(input)).toThrow(FractionalLearningInputError);
    const model = { ...zeroModel };
    Object.defineProperty(model, "w1", { get() { calls++; return "0"; } });
    expect(() => evaluateFractionalClassifier(model, FRACTIONAL_HELD_OUT)).toThrow(FractionalLearningInputError);
    expect(() => trainFractionalClassifier(FRACTIONAL_AND_SAMPLES, scalar)).toThrow(FractionalLearningInputError);
    expect(calls).toBe(0);
  });
  it("accepts frozen/null-prototype data and retains no reference or shared model state", () => {
    const data = FRACTIONAL_AND_SAMPLES.map(p => Object.freeze(Object.assign(Object.create(null), p)));
    const frozen = Object.freeze(data);
    const first = trainFractionalClassifier(frozen);
    multiplyFixedPoint("0.125", "-0.5");
    trainFractionalClassifier([{ x1: "0", x2: "0", label: 1 }]);
    expect(trainFractionalClassifier(frozen)).toEqual(first);
    const mutable = FRACTIONAL_AND_SAMPLES.map(p => ({ ...p }));
    const compiled = compileFractionalTraining(mutable);
    mutable[0].x1 = "8";
    expect(executePythonWavelength(compiled).variables.w1).toBe(1500);
    const evaluated = evaluateFractionalClassifier(first.model, FRACTIONAL_HELD_OUT);
    expect(Object.isFrozen(evaluated.predictions)).toBe(true);
    expect(Object.isFrozen(evaluated.scores)).toBe(true);
    expect(first.model).toEqual({ w1: "1.500", w2: "0.500", bias: "-1.000" });
  });
  it("keeps the integer learner's numerical contract and old package untouched", () => {
    const integers = FRACTIONAL_AND_SAMPLES.map(p => ({ ...p,
      x1: p.x1.startsWith("-") ? -1 : 1, x2: p.x2.startsWith("-") ? -1 : 1 }));
    const old = trainLinearClassifier(integers);
    const fractional = trainFractionalClassifier(integers.map(p => ({ ...p, x1: String(p.x1), x2: String(p.x2) })));
    for (const key of ["w1", "w2", "bias"] as const) expect(parseFixedPoint(fractional.model[key]).units).toBe(old.model[key] * 1000);
    const oldEval = evaluateLinearClassifier(old.model, integers);
    const newEval = evaluateFractionalClassifier(fractional.model,
      integers.map(p => ({ ...p, x1: String(p.x1), x2: String(p.x2) })));
    expect(newEval.predictions).toEqual(oldEval.predictions);
    expect(newEval.scoreUnits).toEqual(oldEval.scores.map(score => score * 1000));
    expect(() => trainLinearClassifier(FRACTIONAL_AND_SAMPLES)).toThrow();
    expect(() => trainFractionalClassifier(integers)).toThrow(FractionalLearningInputError);
  });
  it("keeps training/evaluation compile-only and fences financial/legacy engines", () => {
    for (const source of [compileFractionalTraining(FRACTIONAL_AND_SAMPLES),
      compileFractionalEvaluation(zeroModel, FRACTIONAL_HELD_OUT)]) {
      expect(typeof source).toBe("string");
      expect(source.startsWith("// WLS-PY/1")).toBe(true);
      for (const variant of [source, source.split("\n").slice(1).join("\n")]) {
        expect(() => runToHalt(variant, 0)).toThrow();
        expect(() => assertLegacyExecutionSource(variant, true)).toThrow(/WLS-PY\/1/);
      }
    }
  });
  it("detects validly encoded wrong updates, bias scale and quantized decision mutations", () => {
    const training = compileFractionalTraining(FRACTIONAL_AND_SAMPLES);
    const badUpdate = training.replace('@581.42nm MUL {"line":8', '@528.94nm ADD {"line":8');
    expect(executePythonWavelength(badUpdate).variables.w1).not.toBe(1500);
    const evalSource = compileFractionalEvaluation({ w1: "0", w2: "0", bias: "-0.001" }, [
      { x1: "0", x2: "0", label: 0 },
    ]);
    const wrongBias = evalSource.replace('"line":2,"args":[1000]', '"line":2,"args":[1]');
    expect(executePythonWavelength(wrongBias).variables.score_0).not.toBe(-1);
    const tiny = compileFractionalEvaluation({ w1: "0.001", w2: "0", bias: "0" }, [
      { x1: "-0.001", x2: "0", label: 0 },
    ]);
    const anchor = '@550.21nm LOAD {"line":5,"args":["margin"]}';
    expect(tiny.split(anchor)).toHaveLength(2);
    const roundedPrediction = tiny.replace(anchor, anchor +
      '\n@576.6nm CONST {"line":5,"args":[1000]}\n@545.96nm CALL {"line":5,"args":["fixedRound",2]}');
    expect(executePythonWavelength(tiny).variables.prediction_0).toBe(0);
    expect(executePythonWavelength(roundedPrediction).variables.prediction_0).toBe(1);
  });
});
