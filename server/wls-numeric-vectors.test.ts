import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compileNumericVectorDot, compileNumericVectorScore, compileNumericVectorSum,
  createBoundedNumericVector, dotNumericVectors, getNumericVectorKernelSource,
  NUMERIC_VECTOR_LIMITS, NUMERIC_VECTOR_PACKAGE, scoreNumericVectors, sumNumericVector,
} from "../shared/wls-numeric-vectors";
import { numericVectorFixtures, numericVectorReference } from "../scripts/wls-numeric-vector-reference";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, VM_MAX_CYCLES } from "../shared/vm-security";
import { trainLinearClassifier, evaluateLinearClassifier } from "../shared/wls-learning";
import { runToHalt } from "./wnsp_vm";

describe("bounded WLS numeric vectors", () => {
  it("executes exact canonical source and preserves its fixed function surface", () => {
    const canonical = readFileSync(new URL("../shared/wls-numeric-vectors/0.1.0/kernel.wls", import.meta.url), "utf8");
    const manifest = JSON.parse(readFileSync(new URL("../shared/wls-numeric-vectors/0.1.0/manifest.json", import.meta.url), "utf8"));
    expect(getNumericVectorKernelSource()).toBe(canonical);
    expect(manifest).toEqual({ ...NUMERIC_VECTOR_PACKAGE, source: "kernel.wls" });
    expect(compilePythonWavelength(canonical).filter(i => i.op === "FUNC").map(i => i.args[0])).toEqual(manifest.operations);
    expect(executePythonWavelength(canonical).variables).toEqual({});
  });
  it("matches independent Python integers for every length, signs, extremes and cancellation", () => {
    const cases = numericVectorFixtures();
    const expected = numericVectorReference(cases);
    expect(new Set(cases.map(c => c.left.length)).size).toBe(17);
    cases.forEach((fixture, i) => {
      const sum = sumNumericVector(fixture.left);
      const dot = dotNumericVectors(fixture.left, fixture.right);
      const scored = scoreNumericVectors(fixture.left, fixture.right, fixture.bias);
      expect(sum.value).toBe(expected[i].total);
      expect(dot.value).toBe(expected[i].dot);
      expect(scored.value).toBe(expected[i].score);
      for (const result of [sum, dot, scored]) {
        expect(Number.isSafeInteger(result.value)).toBe(true);
        expect(result.cycles).toBeLessThanOrEqual(2048);
        expect(result.source.length).toBeLessThanOrEqual(65_536);
        expect(compilePythonWavelength(result.source).length).toBeLessThanOrEqual(2048);
      }
      expect(sum.kernelCalls).toEqual(Array(fixture.left.length).fill("vectorSumStep"));
      expect(dot.kernelCalls).toEqual(Array(fixture.left.length).fill("vectorDotStep"));
      expect(scored.kernelCalls).toEqual([...Array(fixture.left.length).fill("vectorDotStep"), "vectorSumStep"]);
    });
  });
  it("provides empty identities, exact maximum results, and canonical integer zero", () => {
    expect(sumNumericVector([]).value).toBe(0);
    expect(dotNumericVectors([], []).value).toBe(0);
    expect(scoreNumericVectors([], [], -5).value).toBe(-5);
    expect(sumNumericVector(Array(16).fill(1_000_000)).value).toBe(16_000_000);
    expect(dotNumericVectors(Array(16).fill(1_000_000), Array(16).fill(1_000_000)).value)
      .toBe(Number(16n * 1_000_000n * 1_000_000n));
    expect(scoreNumericVectors(Array(16).fill(1_000_000), Array(16).fill(1_000_000), 1_000_000).value)
      .toBe(16_000_001_000_000);
    expect(Object.is(createBoundedNumericVector([-0])[0], 0)).toBe(true);
    expect(VM_MAX_CYCLES).toBe(2048);
    expect(NUMERIC_VECTOR_LIMITS).toEqual({ length: 16, magnitude: 1_000_000, biasMagnitude: 1_000_000 });
  });
  it("compiles without precomputing the answer and runs the emitted kernel calls", () => {
    const sum = compileNumericVectorSum([2, -3]);
    const dot = compileNumericVectorDot([2, 3], [4, 5]);
    const score = compileNumericVectorScore([2, 3], [4, 5], -2);
    expect(sum).toContain('"vectorSumStep",2');
    expect(dot).toContain('"vectorDotStep",3');
    expect(executePythonWavelength(sum).variables.result).toBe(-1);
    expect(executePythonWavelength(dot).variables.result).toBe(23);
    expect(executePythonWavelength(score).variables.result).toBe(21);
    expect(dotNumericVectors([2, 3], [4, 5]).value).toBe(23);
  });
  it("satisfies commutativity, linearity and permutation checks through actual VM calls", () => {
    const a = [1, -2, 3], b = [4, 5, -6], c = [-3, 2, 7];
    expect(dotNumericVectors(a, b).value).toBe(dotNumericVectors(b, a).value);
    expect(dotNumericVectors(a.map((v, i) => v + b[i]), c).value)
      .toBe(dotNumericVectors(a, c).value + dotNumericVectors(b, c).value);
    expect(sumNumericVector(a).value).toBe(sumNumericVector([...a].reverse()).value);
  });
  it.each([
    undefined, null, 1, "1,2", true, {}, new Float64Array([1]), new Int32Array([1]),
    Array(17).fill(1), Array(2), [true], [false], [null], [undefined], [NaN], [Infinity],
    [-Infinity], [0.5], [1_000_001], [-1_000_001], [Number.MAX_SAFE_INTEGER], [1n],
    ["1"], ['1); wallet.transfer(99)'], [[1]], [{ valueOf: () => 1 }],
  ])("rejects unsupported vector data %#", value => {
    expect(() => createBoundedNumericVector(value)).toThrow();
    expect(() => sumNumericVector(value)).toThrow();
    expect(() => compileNumericVectorSum(value)).toThrow();
  });
  it.each([[[], [1]], [[1], []], [[1], [1, 2]], [Array(16).fill(0), Array(15).fill(0)]])(
    "rejects unequal lengths without padding or truncating %#", (left, right) => {
      expect(() => dotNumericVectors(left, right)).toThrow(/equal vector lengths/);
      expect(() => scoreNumericVectors(left, right, 0)).toThrow(/equal vector lengths/);
      expect(() => compileNumericVectorDot(left, right)).toThrow();
    });
  it.each([true, null, undefined, "0", NaN, Infinity, 0.5, 1_000_001, -1_000_001])(
    "rejects invalid score bias %s", bias => {
      expect(() => scoreNumericVectors([], [], bias)).toThrow();
      expect(() => compileNumericVectorScore([], [], bias)).toThrow();
    });
  it("validates every operand before zero/empty shortcuts", () => {
    expect(() => dotNumericVectors([], [true])).toThrow();
    expect(() => dotNumericVectors([0], [true])).toThrow();
    expect(() => dotNumericVectors([true], [0])).toThrow();
    expect(() => scoreNumericVectors([], null, 0)).toThrow();
  });
  it("does not invoke getters, custom iterators or scalar coercion hooks", () => {
    let calls = 0;
    const getter = [1];
    Object.defineProperty(getter, "0", { get() { calls++; return 1; } });
    const iterator = [1];
    Object.defineProperty(iterator, Symbol.iterator, { get() { calls++; return function* () { yield 1; }; } });
    const coercion = [{ valueOf() { calls++; return 1; }, toString() { calls++; return "1"; } }];
    const extra = [1];
    Object.defineProperty(extra, "hidden", { get() { calls++; return 1; } });
    const holesWithExtra = Array(2);
    Object.defineProperty(holesWithExtra, "other", { value: 1 });
    Object.defineProperty(holesWithExtra, "another", { value: 1 });
    class CustomArray extends Array {}
    for (const value of [getter, iterator, coercion, extra, holesWithExtra, new CustomArray(1)]) {
      expect(() => sumNumericVector(value)).toThrow();
    }
    expect(calls).toBe(0);
  });
  it("copies/fixes the vector representation and stays independent between runs", () => {
    const input = [1, 2, 3], vector = createBoundedNumericVector(input);
    expect(Object.isFrozen(vector)).toBe(true);
    input[0] = 100;
    expect(vector).toEqual([1, 2, 3]);
    const a = sumNumericVector(vector);
    dotNumericVectors([1], [9]);
    expect(sumNumericVector(vector)).toEqual(a);
    expect(sumNumericVector(Object.freeze([1, 2, 3])).value).toBe(6);
    expect(input).toEqual([100, 2, 3]);
  });
  it("matches the working learner's scores without changing its pinned package", () => {
    const trained = trainLinearClassifier([
      { x1: -1, x2: -1, label: 0 }, { x1: -1, x2: 1, label: 0 },
      { x1: 1, x2: -1, label: 0 }, { x1: 1, x2: 1, label: 1 },
    ]);
    const samples = Array.from({ length: 16 }, (_, i) => ({ x1: i - 8, x2: 8 - i, label: 0 }));
    const old = evaluateLinearClassifier(trained.model, samples);
    const scores = samples.map(p => scoreNumericVectors(
      [trained.model.w1, trained.model.w2], [p.x1, p.x2], trained.model.bias).value);
    expect(scores).toEqual(old.scores);
    expect(scores.map(value => value >= 0 ? 1 : 0)).toEqual(old.predictions);
    expect(trained.package.version).toBe("0.1.0");
  });
  it("rejects financial/generic execution including header-stripped numerical source", () => {
    for (const source of [
      compileNumericVectorSum([1]), compileNumericVectorDot([1], [2]),
      compileNumericVectorScore([1], [2], 3),
    ]) {
      for (const value of [source, source.split("\n").slice(1).join("\n")]) {
        expect(() => runToHalt(value, 0)).toThrow();
        expect(() => assertLegacyExecutionSource(value, true)).toThrow();
      }
    }
  });
  it("recognises stripped records with reordered JSON while preserving ordinary quoted data", () => {
    const stripped = compileNumericVectorDot([1], [2]).split("\n").slice(1).join("\n");
    const reordered = stripped.replace(/\{"line":(\d+),"args":(\[[^\r\n]*\])\}/g, '{"args":$2,"line":$1}');
    expect(() => assertLegacyExecutionSource(reordered, true)).toThrow(/WLS-PY\/1/);
    expect(() => assertLegacyExecutionSource(compileNumericVectorSum([]).split("\n").slice(1).join("\n"), true)).toThrow();
    for (const ordinary of [
      '// @520nm LOAD {"line":1,"args":[]}',
      '@store message := "@520nm LOAD {\\"line\\":1,\\"args\\":[]}"',
      '@520nm EMIT {"line":1,"args":[]}',
    ]) expect(() => assertLegacyExecutionSource(ordinary, true)).not.toThrow();
  });
  it("rejects malformed instructions and detects validly encoded arithmetic corruption", () => {
    const source = compileNumericVectorDot([2, 3], [4, 5]);
    expect(() => executePythonWavelength(source.replace("@581.42nm MUL", "@0nm MUL"))).toThrow();
    expect(() => executePythonWavelength(source.replace(" MUL ", " EXEC "))).toThrow();
    const mutated = source.split("@581.42nm MUL").join("@528.94nm ADD");
    expect(executePythonWavelength(mutated).variables.result).not.toBe(numericVectorReference([
      { left: [2, 3], right: [4, 5], bias: 0 },
    ])[0].dot);
  });
});
