import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compileFractionalRateTraining, trainFractionalRateClassifier, trainFractionalClassifier,
  getFractionalRateKernelSource, FRACTIONAL_RATE_PACKAGE, FractionalLearningInputError,
  evaluateFractionalClassifier,
} from "../shared/wls-fractional-learning";
import { getFixedPointKernelSource } from "../shared/wls-fixed-point";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, VM_MAX_CYCLES, VM_MAX_SOURCE_LENGTH } from "../shared/vm-security";
import { runToHalt } from "./wnsp_vm";
import {
  fractionalLearningReference, fractionalRateTrainingFixtures, FRACTIONAL_AND_SAMPLES,
  fractionalRateSweepFixtures, FRACTIONAL_RATE_SWEEP_SEED,
} from "../scripts/wls-fractional-learning-reference";

const ties = [
  { x1: "-0.002", x2: "0.002", label: 0 as const },
  { x1: "-0.001", x2: "0.001", label: 1 as const },
];

describe("synthetic configurable-rate release 0.2.0", () => {
  it("pins canonical bytes, manifest, surface and unchanged fixed-point prefix", () => {
    const kernel = getFractionalRateKernelSource();
    expect(kernel).toBe(readFileSync("shared/wls-fractional-learning/0.2.0/kernel.wls", "utf8"));
    expect(JSON.parse(readFileSync("shared/wls-fractional-learning/0.2.0/manifest.json", "utf8")))
      .toEqual({ ...FRACTIONAL_RATE_PACKAGE, source: "kernel.wls" });
    expect(compilePythonWavelength(kernel).filter(i => i.op === "FUNC").map(i => i.args[0]))
      .toEqual(FRACTIONAL_RATE_PACKAGE.operations);
    const prefix = getFixedPointKernelSource().trimEnd().split("\n").slice(0, -1).join("\n") + "\n";
    expect(compileFractionalRateTraining(ties, "0.500")).toMatch(new RegExp("^" +
      prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  for (const rate of ["0.001", "0.002", "0.125", "0.499", "0.500", "0.999", "1.000"]) {
    it(`compares every assignment and metric to exact rational arithmetic at ${rate}`, () => {
      const requests = fractionalRateTrainingFixtures(rate);
      const references = fractionalLearningReference(requests);
      requests.forEach((request, index) => {
        if (request.operation !== "train") throw new Error("Expected training fixture");
        const actual = trainFractionalRateClassifier(request.samples, rate, request.epochs);
        const { evaluation, ...expected } = references[index];
        expect({
          model: actual.model, initialMistakes: actual.initialMistakes, finalMistakes: actual.finalMistakes,
          mistakesByEpoch: actual.mistakesByEpoch, updates: actual.updates, parameterUpdates: actual.parameterUpdates,
        }, `case ${index}`).toEqual(expected);
        expect(actual.parameterUpdates).toHaveLength(request.samples.length * request.epochs);
        expect(actual.cycles).toBeLessThanOrEqual(2048);
        expect(compilePythonWavelength(actual.source).length).toBeLessThanOrEqual(2048);
        expect(actual.source.length).toBeLessThanOrEqual(65536);
        expect(actual.kernelCalls.filter(n => n === "fractionalRateUpdate"))
          .toHaveLength(2 * request.samples.length * request.epochs);
        if (request.evaluation) {
          const evaluated = evaluateFractionalClassifier(actual.model, request.evaluation);
          expect({
            status: "ok", predictions: evaluated.predictions, scoreUnits: evaluated.scoreUnits,
            scores: evaluated.scores, rawMargins: evaluated.rawMargins,
            marginScale: evaluated.marginScale, mistakes: evaluated.mistakes,
          }).toEqual(evaluation);
        }
        if (rate === "1.000") {
          const retained = trainFractionalClassifier(request.samples, request.epochs);
          expect(actual.parameterUpdates).toEqual(retained.parameterUpdates);
          expect(actual.model).toEqual(retained.model);
          expect(retained.package.version).toBe("0.1.0");
        }
      });
      expect(VM_MAX_CYCLES).toBe(2048);
      expect(VM_MAX_SOURCE_LENGTH).toBe(65536);
    });
  }

  it("pins the deterministic sweep's complete rate, feature and visit coverage", () => {
    expect(FRACTIONAL_RATE_SWEEP_SEED).toBe(0x5eed1234);
    const rates = new Set<string>();
    let runs = 0, assignments = 0;
    for (let units = 1; units <= 1000; units++) {
      const fixtures = fractionalRateSweepFixtures(units);
      expect(fixtures).toEqual(fractionalRateSweepFixtures(units));
      expect(fixtures).toHaveLength(4);
      const axes = [new Set<string>(), new Set<string>()];
      for (const { request } of fixtures) {
        rates.add(request.learningRate);
        runs++;
        assignments += request.samples.length * request.epochs;
        expect(request.samples.length).toBeLessThanOrEqual(4);
        expect(request.epochs).toBe(3);
        request.samples.forEach(p => { axes[0].add(p.x1); axes[1].add(p.x2); });
      }
      for (const axis of axes) {
        for (const edge of ["-8.000", "-7.999", "-0.001", "0.000", "0.001", "7.999", "8.000"]) {
          expect(axis.has(edge), `rate unit ${units}, feature ${edge}`).toBe(true);
        }
      }
    }
    expect(rates).toEqual(new Set(Array.from({ length: 1000 }, (_, i) =>
      i === 999 ? "1.000" : `0.${String(i + 1).padStart(3, "0")}`)));
    expect(runs).toBe(4000);
    expect(assignments).toBe(36000);
    expect(VM_MAX_CYCLES).toBe(2048);
    expect(VM_MAX_SOURCE_LENGTH).toBe(65536);
  });

  // 20 rates × 4 fixtures keeps each Fraction subprocess far below its existing
  // 256 KiB output limit. Each fixture is a separate, unmodified single VM run.
  for (let firstUnit = 1; firstUnit <= 1000; firstUnit += 20) {
    it(`checks every VM assignment against Fraction at rate units ${firstUnit}–${firstUnit + 19}`, () => {
      const fixtures = Array.from({ length: 20 }, (_, i) =>
        fractionalRateSweepFixtures(firstUnit + i)).flat();
      const references = fractionalLearningReference(fixtures.map(f => f.request));
      expect(references).toHaveLength(fixtures.length);
      expect(Buffer.byteLength(JSON.stringify(references))).toBeLessThan(262_144);
      fixtures.forEach(({ name, seed, request }, index) => {
        const context = JSON.stringify({ rate: request.learningRate, name, seed, samples: request.samples });
        const actual = trainFractionalRateClassifier(request.samples, request.learningRate, request.epochs);
        const expected = references[index];
        const visits = request.samples.length * request.epochs;
        expect(expected.parameterUpdates, context).toHaveLength(visits);
        expect(actual.parameterUpdates, context).toHaveLength(visits);
        actual.parameterUpdates.forEach((assignment, step) => {
          expect(assignment, `${context}, assignment ${step}`).toEqual(expected.parameterUpdates![step]);
        });
        expect({
          model: actual.model, initialMistakes: actual.initialMistakes, finalMistakes: actual.finalMistakes,
          mistakesByEpoch: actual.mistakesByEpoch, updates: actual.updates,
          parameterUpdates: actual.parameterUpdates,
        }, context).toEqual(expected);
        if (name.startsWith("sign-crossing")) {
          // Verify that generated cases really exercise both sign directions,
          // rather than silently degenerating into no-op or zero-only updates.
          for (const coordinate of ["w1", "w2"] as const) {
            expect(actual.parameterUpdates[0][coordinate] * actual.parameterUpdates[1][coordinate], context)
              .toBeLessThan(0);
          }
        }
        expect(actual.cycles, context).toBeLessThanOrEqual(2048);
        expect(compilePythonWavelength(actual.source).length, context).toBeLessThanOrEqual(2048);
        expect(actual.source.length, context).toBeLessThanOrEqual(65536);
        expect(actual.kernelCalls.filter(n => n === "fractionalRateUpdate"), context).toHaveLength(2 * visits);
      });
    });
  }

  it("rounds positive/negative half-grid ties on the complete parameter, not the delta", () => {
    const result = trainFractionalRateClassifier(ties, "0.500", 1);
    expect(result.parameterUpdates).toEqual([
      { w1: 1, w2: -1, bias: -500 }, { w1: 1, w2: -1, bias: 0 },
    ]);
    const fromZero = trainFractionalRateClassifier([{ x1: "-0.001", x2: "0.001", label: 0 }], "0.500", 1);
    expect(fromZero.parameterUpdates).toEqual([{ w1: 1, w2: -1, bias: -500 }]);
    // Valid native instructions implementing the tempting, incorrect delta-only alternative.
    const mutant = result.source.replace(
      '@550.21nm LOAD {"line":8,"args":["weight"]}\n@576.6nm CONST {"line":8,"args":[1000]}\n@581.42nm MUL {"line":8,"args":[]}\n', "",
    ).replace(
      '@528.94nm ADD {"line":8,"args":[]}\n@576.6nm CONST {"line":8,"args":[1000]}',
      '@576.6nm CONST {"line":8,"args":[1000]}',
    ).replace(
      '@545.96nm CALL {"line":8,"args":["fixedRound",2]}',
      '@545.96nm CALL {"line":8,"args":["fixedRound",2]}\n@550.21nm LOAD {"line":8,"args":["weight"]}\n@528.94nm ADD {"line":8,"args":[]}',
    );
    const wrong = executePythonWavelength(mutant);
    expect(wrong.variables.step_1_w1).toBe(0);
    expect(wrong.variables.step_1_w2).toBe(0);
    expect(wrong.variables.step_1_w1).not.toBe(result.parameterUpdates[1].w1);
  });

  it("reports repeated sub-resolution stalls honestly, with no residual accumulation", () => {
    const result = trainFractionalRateClassifier([
      { x1: "0.001", x2: "-0.001", label: 0 },
      { x1: "0.001", x2: "-0.001", label: 1 },
    ], "0.001", 3);
    expect(result.updates).toBe(6); // mistakes, not a count of changed coordinates
    expect(result.finalMistakes).toBe(1);
    expect(result.parameterUpdates).toEqual(Array.from({ length: 6 }, (_, i) => ({
      w1: 0, w2: 0, bias: i % 2 === 0 ? -1 : 0,
    })));
    expect(Object.isFrozen(result.model)).toBe(true);
    expect(Object.isFrozen(result.parameterUpdates)).toBe(true);
    expect(result.parameterUpdates.every(Object.isFrozen)).toBe(true);
  });

  it.each([undefined, null, 0.5, 1, "0", "-0", "-0.001", "1.001", "1000",
    "0.0001", "1e-3", " 0.5", "0.5\n", "00.5", {}, []])("rejects invalid rate %j", rate => {
    expect(() => compileFractionalRateTraining(ties, rate)).toThrow(FractionalLearningInputError);
    expect(() => trainFractionalRateClassifier(ties, rate)).toThrow(FractionalLearningInputError);
  });

  it("preserves batch, feature, epoch, financial fences and stateless repeatability", () => {
    expect(() => trainFractionalRateClassifier(Array(5).fill(ties[0]), "0.5")).toThrow();
    expect(() => trainFractionalRateClassifier(ties, "0.5", 4)).toThrow();
    expect(() => trainFractionalRateClassifier([{ x1: "8.001", x2: "0", label: 0 }], "0.5")).toThrow();
    const first = trainFractionalRateClassifier(FRACTIONAL_AND_SAMPLES, "0.5");
    trainFractionalRateClassifier(ties, "0.001");
    expect(trainFractionalRateClassifier(FRACTIONAL_AND_SAMPLES, "0.5")).toEqual(first);
    for (const source of [first.source, first.source.split("\n").slice(1).join("\n")]) {
      expect(() => runToHalt(source, 0)).toThrow();
      expect(() => assertLegacyExecutionSource(source, true)).toThrow(/WLS-PY\/1/);
    }
    expect(FRACTIONAL_RATE_PACKAGE.externalCapabilities).toEqual([]);
  });
});
