import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  FEATURE_SCALING_PACKAGE, fitFeatureScaler, transformFeatures,
  compileFeatureScalingFit, compileFeatureScalingTransform, getFeatureScalingKernelSource,
  FeatureScalingInputError, FeatureScalingRangeError,
  trainScaledFractionalClassifier, evaluateScaledFractionalClassifier,
} from "../shared/wls-feature-scaling";
import { trainFractionalRateClassifier } from "../shared/wls-fractional-learning";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, UnsupportedExecutionError } from "../shared/vm-security";
import {
  featureScalingFixtures, featureScalingReference, SCALED_AND_TRAINING, SCALED_AND_HELD_OUT,
} from "../scripts/wls-feature-scaling-reference";
import { fractionalLearningReference } from "../scripts/wls-fractional-learning-reference";

const fixtures = featureScalingFixtures();
let reference: ReturnType<typeof featureScalingReference>;
beforeAll(() => { reference = featureScalingReference(fixtures); });
describe("bounded native WLS feature scaling", () => {
  it("retains reproducible canonical WLS and manifest identity", () => {
    expect(readFileSync("shared/wls-feature-scaling/0.1.0/kernel.wls", "utf8")).toBe(getFeatureScalingKernelSource());
    const manifest = JSON.parse(readFileSync("shared/wls-feature-scaling/0.1.0/manifest.json", "utf8"));
    const { source, ...metadata } = manifest;
    expect(source).toBe("kernel.wls");
    expect(metadata).toEqual(FEATURE_SCALING_PACKAGE);
  });
  it.each(fixtures.map((request, i) => ({ request, i })))("matches exact independent Fraction fixture $i", ({ request, i }) => {
    const result = request.model ? transformFeatures(request.model, request.samples) : fitFeatureScaler(request.samples);
    expect({ model: result.model, samples: result.samples }).toEqual(reference[i]);
    expect(result.cycles).toBeGreaterThan(0);
    expect(result.cycles).toBeLessThanOrEqual(2048);
    expect(result.instructions).toBeLessThanOrEqual(2048);
    expect(result.source.length).toBeLessThanOrEqual(65_536);
    expect(result.kernelCalls).toContain("scalingValue");
    expect(result.kernelCalls).toContain("fixedRound");
    if (!request.model) expect(result.kernelCalls).toContain("scalingMaximum");
  });
  it.each(["1.000", "0.500", "0.125"])("actually trains and evaluates different-scale inputs at rate %s", rate => {
    expect(() => trainFractionalRateClassifier(SCALED_AND_TRAINING, rate)).toThrow();
    const expected = featureScalingReference([{ samples: SCALED_AND_TRAINING }])[0];
    const expectedHeldOut = featureScalingReference([{ model: expected.model, samples: SCALED_AND_HELD_OUT }])[0];
    const oracle = fractionalLearningReference([{
      operation: "train", samples: expected.samples, learningRate: rate, epochs: 3,
      evaluation: expectedHeldOut.samples,
    }])[0];
    const trained = trainScaledFractionalClassifier(SCALED_AND_TRAINING, rate);
    const evaluated = evaluateScaledFractionalClassifier(trained.scaling.model, trained.training.model, SCALED_AND_HELD_OUT);
    expect(trained.training.model).toEqual(oracle.model);
    expect(trained.training.parameterUpdates).toEqual(oracle.parameterUpdates);
    expect(trained.training.finalMistakes).toBe(0);
    expect(evaluated.evaluation.mistakes).toBe(0);
    expect(evaluated.evaluation.rawMargins).toEqual(oracle.evaluation!.rawMargins);
    expect(evaluated.evaluation.predictions).toEqual(oracle.evaluation!.predictions);
    for (const r of [trained.scaling, trained.training, evaluated.scaling, evaluated.evaluation]) {
      expect(r.cycles).toBeLessThanOrEqual(2048);
      expect(compilePythonWavelength(r.source).length).toBeLessThanOrEqual(2048);
      expect(r.source.length).toBeLessThanOrEqual(65_536);
    }
  });
  it("does not refit on held-out data, clamp outliers or accept a nonzero unseen constant feature", () => {
    const fit = fitFeatureScaler([{ x1: "1", x2: "0", label: 0 }]);
    for (const point of [{ x1: "1.001", x2: "0", label: 0 }, { x1: "0", x2: "0.001", label: 0 }]) {
      expect(() => transformFeatures(fit.model, [point])).toThrow(FeatureScalingRangeError);
      expect(() => compileFeatureScalingTransform(fit.model, [point])).toThrow(FeatureScalingRangeError);
    }
    expect(fit.model).toEqual({ maxAbsX1: "1.000", maxAbsX2: "0.000" });
  });
  it("matches exact model trajectories on varied normalized synthetic training sets", () => {
    const expected = reference.slice(6, 38);
    const oracle = fractionalLearningReference(expected.map(p => ({
      operation: "train", samples: p.samples, learningRate: "0.333", epochs: 3,
    })));
    expected.forEach((p, i) => {
      const actual = trainScaledFractionalClassifier(fixtures[i + 6].samples, "0.333");
      expect(actual.scaling.samples).toEqual(p.samples);
      expect(actual.training.model).toEqual(oracle[i].model);
      expect(actual.training.parameterUpdates).toEqual(oracle[i].parameterUpdates);
      expect(actual.training.finalMistakes).toEqual(oracle[i].finalMistakes);
    });
  });
  it("returns immutable independent samples and a repeatable, stateless fit", () => {
    const input = [{ x1: "10", x2: "-0.001", label: 1 }];
    const a = fitFeatureScaler(input);
    input[0].x1 = "1";
    fitFeatureScaler([{ x1: "3", x2: "5", label: 0 }]);
    const b = fitFeatureScaler([{ x1: "10", x2: "-0.001", label: 1 }]);
    expect(a).toEqual(b);
    for (const object of [a, a.model, a.samples, a.samples[0], a.kernelCalls]) expect(Object.isFrozen(object)).toBe(true);
    expect(() => assertLegacyExecutionSource(a.source, true)).toThrow(UnsupportedExecutionError);
  });
  it("makes a valid incorrect WLS scaling program observably wrong", () => {
    const source = compileFeatureScalingFit(SCALED_AND_TRAINING);
    const wrong = source.replace('@576.6nm CONST {"line":9,"args":[1000]}', '@576.6nm CONST {"line":9,"args":[999]}');
    expect(wrong).not.toBe(source);
    expect(executePythonWavelength(source).variables.out_0_x1).toBe(-1000);
    expect(executePythonWavelength(wrong).variables.out_0_x1).toBe(-999);
  });
  it.each([undefined, null, true, {}, [], Array(1), Array(5).fill({ x1: "0", x2: "0", label: 0 }),
    new Float64Array([1])])("rejects unsupported fitting inputs %#", value => {
    expect(() => fitFeatureScaler(value)).toThrow(FeatureScalingInputError);
  });
  it.each([null, true, 1, 1n, NaN, Infinity, "1e3", "01", "1.0001", "1\n", " 1", "1000.001", {}])(
    "rejects invalid feature encodings before zero shortcuts %#", value => {
      const point = { x1: value, x2: "0", label: 0 };
      expect(() => fitFeatureScaler([point])).toThrow(FeatureScalingInputError);
      expect(() => transformFeatures({ maxAbsX1: "0", maxAbsX2: "0" }, [point])).toThrow(FeatureScalingInputError);
    });
  it.each([null, {}, { maxAbsX1: "-1", maxAbsX2: "0" }, { maxAbsX1: "1", maxAbsX2: "0", extra: 0 }])(
    "rejects malformed fitted models %#", model => {
      expect(() => transformFeatures(model, [{ x1: "0", x2: "0", label: 0 }])).toThrow(FeatureScalingInputError);
    });
  it("validates every sample/model field without invoking accessors, iterators or coercion", () => {
    let calls = 0;
    const point = { x1: "0", x2: "0", get label() { calls++; return 0; } };
    const array = [point];
    const accessor = Object.defineProperty([], "0", { get() { calls++; return point; } });
    const iterator = Object.assign([{ x1: "0", x2: "0", label: 0 }], {
      [Symbol.iterator]() { calls++; throw Error("must not iterate"); },
    });
    const invalids = [array, accessor, iterator, [{ x1: "0", x2: "0", label: "0" }],
      [{ x1: "0", x2: "0", label: 2 }], [{ x1: "0", x2: "0", label: 0, extra: 1 }]];
    for (const value of invalids) expect(() => fitFeatureScaler(value)).toThrow(FeatureScalingInputError);
    const model = { get maxAbsX1() { calls++; return "0"; }, maxAbsX2: "0" };
    expect(() => transformFeatures(model, [{ x1: "0", x2: "0", label: 0 }])).toThrow(FeatureScalingInputError);
    expect(calls).toBe(0);
  });
  it("rejects an invalid late held-out sample as a whole and enforces the transform cap", () => {
    const fit = fitFeatureScaler(SCALED_AND_TRAINING);
    const point = { x1: "1", x2: "0", label: 0 };
    expect(() => transformFeatures(fit.model, [point, { ...point, x2: "0.006" }])).toThrow(FeatureScalingRangeError);
    expect(() => transformFeatures(fit.model, Array(17).fill(point))).toThrow(FeatureScalingInputError);
    expect(() => trainScaledFractionalClassifier(SCALED_AND_TRAINING, "0")).toThrow();
  });
});
