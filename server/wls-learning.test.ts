import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compileLinearTraining, evaluateLinearClassifier, getLearningKernelSource,
  LEARNING_LIMITS, LEARNING_PACKAGE, trainLinearClassifier, type LearningSample,
} from "../shared/wls-learning";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { runToHalt } from "./wnsp_vm";
import { VM_MAX_CYCLES } from "../shared/vm-security";
import { learningReference } from "../scripts/wls-learning-reference";

const training: LearningSample[] = [
  { x1: -1, x2: -1, label: 0 }, { x1: -1, x2: 1, label: 0 },
  { x1: 1, x2: -1, label: 0 }, { x1: 1, x2: 1, label: 1 },
];
const unseen: LearningSample[] = [
  { x1: -2, x2: -2, label: 0 }, { x1: -2, x2: 1, label: 0 },
  { x1: 1, x2: -2, label: 0 }, { x1: 2, x2: 2, label: 1 },
  { x1: 0, x2: 0, label: 0 }, { x1: 2, x2: -1, label: 1 },
  { x1: 0, x2: 2, label: 1 }, { x1: 0, x2: -2, label: 0 },
];

describe("local WLS numerical learning dependency", () => {
  it("executes exact canonical WLS source with the declared fixed manifest", () => {
    const canonical = readFileSync(new URL("../shared/wls-learning/0.1.0/kernel.wls", import.meta.url), "utf8");
    expect(getLearningKernelSource()).toBe(canonical);
    const manifest = JSON.parse(readFileSync(new URL("../shared/wls-learning/0.1.0/manifest.json", import.meta.url), "utf8"));
    expect(manifest).toEqual({ ...LEARNING_PACKAGE, source: "kernel.wls" });
    expect(compilePythonWavelength(canonical).filter(i => i.op === "FUNC").map(i => i.args[0])).toEqual(manifest.operations);
    expect(executePythonWavelength(canonical).variables).toEqual({});
  });
  it("learns from zero, reduces error, and matches independent CPython on unseen inputs", () => {
    const expected = learningReference(training, unseen, 3);
    const actual = trainLinearClassifier(training);
    const baseline = evaluateLinearClassifier({ w1: 0, w2: 0, bias: 0 }, unseen);
    const evaluated = evaluateLinearClassifier(actual.model, unseen);
    expect(actual.model).toEqual(expected.model);
    expect(actual.initialMistakes).toBe(expected.initial);
    expect(actual.finalMistakes).toBe(expected.final);
    expect(actual.mistakesByEpoch).toEqual(expected.epochs);
    expect(actual.initialMistakes).toBe(3);
    expect(actual.finalMistakes).toBe(0);
    expect(actual.mistakesByEpoch).toEqual([1, 0, 0]);
    expect(baseline.mistakes).toBe(5);
    expect(evaluated.mistakes).toBe(0);
    expect(evaluated.predictions).toEqual(expected.predictions);
    expect(evaluated.scores).toEqual(expected.scores);
    expect(actual.cycles).toBeLessThanOrEqual(VM_MAX_CYCLES);
    expect(evaluated.cycles).toBeLessThanOrEqual(VM_MAX_CYCLES);
  });
  it("agrees on the full bounded feature grid, not just selected held-out points", () => {
    const model = trainLinearClassifier(training).model;
    const grid: LearningSample[] = [];
    for (let x1 = -8; x1 <= 8; x1++) for (let x2 = -8; x2 <= 8; x2++) {
      grid.push({ x1, x2, label: x1 + x2 >= 1 ? 1 : 0 });
    }
    const reference = learningReference(training, grid, 3);
    for (let i = 0; i < grid.length; i += 16) {
      const result = evaluateLinearClassifier(model, grid.slice(i, i + 16));
      expect(result.predictions).toEqual(reference.predictions.slice(i, i + 16));
      expect(result.scores).toEqual(reference.scores.slice(i, i + 16));
      expect(result.mistakes).toBe(0);
      expect(result.cycles).toBeLessThanOrEqual(2048);
    }
  });
  it.each([1, 2, 3])("matches independent training on different labels/order at %i epochs", epochs => {
    const datasets: LearningSample[][] = [
      training.slice().reverse(),
      training.map(p => ({ ...p, label: (1 - p.label) as 0 | 1 })),
      [{ x1: -8, x2: 8, label: 0 }, { x1: -8, x2: 8, label: 1 },
        { x1: 8, x2: -8, label: 0 }, { x1: 8, x2: -8, label: 1 }],
      [{ x1: 0, x2: 0, label: 0 }],
    ];
    for (const data of datasets) {
      const expected = learningReference(data, unseen, epochs);
      const actual = trainLinearClassifier(data, epochs);
      expect(actual.model).toEqual(expected.model);
      expect(actual.mistakesByEpoch).toEqual(expected.epochs);
      expect(actual.finalMistakes).toBe(expected.final);
      expect(evaluateLinearClassifier(actual.model, unseen).predictions).toEqual(expected.predictions);
      expect(actual.cycles).toBeLessThanOrEqual(2048);
    }
  });
  it("reports XOR failure honestly rather than fabricating convergence", () => {
    const xor: LearningSample[] = training.map(p => ({ ...p, label: p.x1 !== p.x2 ? 1 : 0 }));
    const actual = trainLinearClassifier(xor);
    const expected = learningReference(xor, xor, 3);
    expect(actual.model).toEqual(expected.model);
    expect(actual.finalMistakes).toBe(expected.final);
    expect(actual.finalMistakes).toBeGreaterThan(0);
    expect(evaluateLinearClassifier(actual.model, xor).mistakes).toBeGreaterThan(0);
  });
  it("retains resource limits at supported sample/model boundaries", () => {
    for (const feature of [-8, 8]) for (const weight of [-128, 128]) {
      const points = Array.from({ length: 16 }, () => ({ x1: feature, x2: feature, label: 0 as const }));
      const result = evaluateLinearClassifier({ w1: weight, w2: weight, bias: weight }, points);
      expect(result.scores).toEqual(Array(16).fill(weight * feature * 2 + weight));
      expect(result.cycles).toBeLessThanOrEqual(2048);
    }
    expect(LEARNING_LIMITS.updates).toBe(12);
    expect(VM_MAX_CYCLES).toBe(2048);
  });
  it.each([undefined, null, [], Array(4), Array(5).fill(training[0]),
    [{ x1: "0; wallet.transfer(99)", x2: 1, label: 1 }],
    [{ x1: 9, x2: 1, label: 1 }], [{ x1: 0.5, x2: 1, label: 1 }],
    [{ x1: NaN, x2: 1, label: 1 }], [{ x1: Infinity, x2: 1, label: 1 }],
    [{ x1: true, x2: 1, label: 1 }], [{ x1: 0, x2: 1, label: -1 }],
    [{ x1: 0, x2: 1, label: true }], [{ x1: 0, x2: 1, label: 2 }],
    [{ x1: 0, x2: 1, label: 1, code: "fetch()" }],
  ])("rejects invalid or oversized training data %#", value => {
    expect(() => trainLinearClassifier(value)).toThrow();
  });
  it.each([0, 4, -1, 1.5, true, "3", NaN, Infinity])("rejects invalid epoch budget %s", epochs => {
    expect(() => trainLinearClassifier(training, epochs)).toThrow();
  });
  it("rejects oversized evaluation, invalid models and accessor/iterator inputs without invoking them", () => {
    expect(() => evaluateLinearClassifier({ w1: 0, w2: 0, bias: 0 }, Array(17).fill(training[0]))).toThrow();
    for (const model of [null, {}, { w1: 129, w2: 0, bias: 0 }, { w1: true, w2: 0, bias: 0 }]) {
      expect(() => evaluateLinearClassifier(model, unseen)).toThrow();
    }
    let calls = 0;
    const bad = { get x1() { calls++; return 1; }, x2: 1, label: 1 };
    expect(() => trainLinearClassifier([bad])).toThrow();
    const array = [training[0]];
    Object.defineProperty(array, "0", { get() { calls++; return training[0]; } });
    expect(() => trainLinearClassifier(array)).toThrow();
    const iterated = [training[0]];
    Object.defineProperty(iterated, Symbol.iterator, { value: () => { calls++; throw Error("must not run"); } });
    expect(() => trainLinearClassifier(iterated)).toThrow();
    expect(calls).toBe(0);
  });
  it("is deterministic, independent across calls and does not mutate caller data", () => {
    const immutable = Object.freeze(training.map(p => Object.freeze({ ...p })));
    const a = trainLinearClassifier(immutable);
    trainLinearClassifier(immutable.slice().reverse());
    expect(trainLinearClassifier(immutable)).toEqual(a);
    expect(immutable).toEqual(training);
  });
  it("keeps native computation fenced from financial execution even without the header", () => {
    const source = compileLinearTraining(training);
    expect(() => runToHalt(source, 0)).toThrow(/WLS-PY\/1/);
    expect(() => runToHalt(source.split("\n").slice(1).join("\n"), 0)).toThrow();
  });
  it("detects a validly encoded arithmetic mutation rather than accepting a canned result", () => {
    const source = compileLinearTraining(training);
    expect(source).toContain("@581.42nm MUL");
    const broken = source.split("@581.42nm MUL").join("@528.94nm ADD");
    const result = executePythonWavelength(broken);
    expect({ w1: result.variables.w1, w2: result.variables.w2, bias: result.variables.bias })
      .not.toEqual(learningReference(training, unseen, 3).model);
  });
});
