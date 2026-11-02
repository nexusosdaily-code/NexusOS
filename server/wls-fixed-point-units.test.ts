import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FIXED_POINT_PACKAGE, FixedPointInputError, FixedPointOverflowError, FixedPointDivisionByZeroError,
  compileFixedPointScalar, compileFixedPointVector, createFixedPointVector,
  fixedPointScalar, fixedPointVector, getFixedPointKernelSource, parseFixedPointDecimal,
  type FixedPointScalarOperation, type FixedPointVectorOperation,
} from "../shared/wls-fixed-point-units";
import { scalarFixtures, scalarReference, vectorFixtures, vectorReference } from "../scripts/wls-fixed-point-units-reference";
import { compilePythonWavelength, translatePython } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, VM_MAX_CYCLES, VM_MAX_SOURCE_LENGTH } from "../shared/vm-security";
import { runToHalt } from "./wnsp_vm";
import { sumNumericVector } from "../shared/wls-numeric-vectors";
import { evaluateLinearClassifier } from "../shared/wls-learning";
import * as decimal from "../shared/wls-fixed-point";

const inRange = (value: bigint) => value >= -1_000_000n && value <= 1_000_000n;
function compare(source: string, run: () => { units: number; cycles: number }, expected: bigint) {
  // Check the actual VM output even for final-range failures.
  const raw = executePythonWavelength(source);
  expect(BigInt(raw.variables.result as number)).toBe(expected);
  expect(raw.cycles).toBeLessThanOrEqual(2048);
  expect(source.length).toBeLessThanOrEqual(65_536);
  expect(compilePythonWavelength(source).length).toBeLessThanOrEqual(2048);
  if (inRange(expected)) expect(BigInt(run().units)).toBe(expected);
  else expect(run).toThrow(FixedPointOverflowError);
}

describe("separately versioned fixed-point WLS arithmetic", () => {
  it("keeps decimal-string release source, identity and input types separate", () => {
    expect(FIXED_POINT_PACKAGE.name).toBe("@wls/fixed-point-units");
    expect(decimal.FIXED_POINT_PACKAGE.name).toBe("@wls/fixed-point");
    expect(decimal.addFixedPoint("1.234", "0.001").units).toBe(fixedPointScalar("add", 1234, 1).units);
    expect(decimal.createFixedPointVector(["1.234"])).toEqual(["1.234"]);
    expect(createFixedPointVector([1234])).toEqual([1234]);
    expect(() => decimal.createFixedPointVector([1234])).toThrow(decimal.FixedPointInputError);
    expect(() => createFixedPointVector(["1.234"])).toThrow(FixedPointInputError);
    expect(decimal.getFixedPointKernelSource()).not.toBe(getFixedPointKernelSource());
  });
  it("matches canonical pure source, manifest and fixed function surface", () => {
    const root = new URL("../shared/wls-fixed-point-units/0.1.0/", import.meta.url);
    expect(readFileSync(new URL("kernel.py", root), "utf8")).toBe(getFixedPointKernelSource());
    expect(JSON.parse(readFileSync(new URL("manifest.json", root), "utf8")))
      .toEqual({ ...FIXED_POINT_PACKAGE, source: "kernel.py" });
    const source = translatePython(getFixedPointKernelSource());
    expect(compilePythonWavelength(source).filter(i => i.op === "FUNC").map(i => i.args[0]))
      .toEqual(FIXED_POINT_PACKAGE.operations);
    expect(executePythonWavelength(source).variables).toEqual({});
    expect(VM_MAX_CYCLES).toBe(2048);
    expect(VM_MAX_SOURCE_LENGTH).toBe(65_536);
  });
  it.each(["add", "subtract", "multiply", "divide"] as const)(
    "audits every signed scalar fixture for %s against independent exact rationals", operation => {
      for (const a of scalarFixtures) for (const b of scalarFixtures) {
        if (operation === "divide" && !b) {
          expect(() => fixedPointScalar(operation, a, b)).toThrow(FixedPointDivisionByZeroError);
        } else compare(compileFixedPointScalar(operation, a, b),
          () => fixedPointScalar(operation, a, b), scalarReference(operation, a, b));
      }
    });
  it.each(["sum", "dot", "score"] as const)(
    "audits %s at all dimensions, extrema and cancellation", operation => {
      const cases = vectorFixtures();
      expect(new Set(cases.map(c => c.left.length)).size).toBe(17);
      for (const { left, right, bias } of cases) {
        const b = operation === "sum" ? undefined : right;
        const c = operation === "score" ? bias : undefined;
        compare(compileFixedPointVector(operation, left, b, c),
          () => fixedPointVector(operation, left, b, c), vectorReference(operation, left, right, bias));
      }
    });
  it("rounds negative and positive ties away, not toward zero or even", () => {
    for (const [a, b, expected] of [[1, 500, 1], [-1, 500, -1], [3, 500, 2], [-3, 500, -2],
      [1, 499, 0], [-1, 499, 0], [1, 501, 1], [-1, 501, -1]]) {
      expect(fixedPointScalar("multiply", a, b).units).toBe(expected);
    }
    for (const [a, b, expected] of [[1, 2000, 1], [-1, 2000, -1], [1, -2000, -1], [-1, -2000, 1]]) {
      expect(fixedPointScalar("divide", a, b).units).toBe(expected);
    }
    // Round once after the full dot, not once per product.
    expect(fixedPointVector("dot", [1, -1], [500, 499]).units).toBe(0);
    expect(fixedPointVector("dot", [1, 1], [499, 499]).units).toBe(1);
    expect(Object.is(fixedPointScalar("multiply", -1, 1).units, 0)).toBe(true);
  });
  it("records real kernel calls, handles empty identities, and exposes compile-only output", () => {
    expect(fixedPointScalar("divide", 1000, 3000).kernelCalls).toEqual(["fixedDivide", "fixedRound"]);
    expect(fixedPointVector("score", [1000], [500], 25).kernelCalls)
      .toEqual(["fixedDotStep", "fixedDotStep", "fixedRound"]);
    expect(fixedPointVector("sum", []).units).toBe(0);
    expect(fixedPointVector("dot", [], []).units).toBe(0);
    expect(fixedPointVector("score", [], [], -123).units).toBe(-123);
    const source = compileFixedPointScalar("add", 1_000_000, 1);
    expect(executePythonWavelength(source).variables.result).toBe(1_000_001);
    expect(() => fixedPointScalar("add", 1_000_000, 1)).toThrow(FixedPointOverflowError);
    expect(() => fixedPointScalar("divide", 0, -0)).toThrow(FixedPointDivisionByZeroError);
    expect(() => executePythonWavelength(translatePython(`${getFixedPointKernelSource()}\nresult = fixedDivide(0, 0)`)))
      .toThrow(/Division by zero/);
  });
  it.each([undefined, null, true, "1000", 1n, NaN, Infinity, -Infinity, 0.1, 1_000_001, -1_000_001, {},
    ["1"], { valueOf: () => 0 }])("rejects invalid units before arithmetic and shortcuts %#", value => {
    for (const op of ["add", "subtract", "multiply", "divide"] as const) {
      expect(() => fixedPointScalar(op, value, 0)).toThrow(FixedPointInputError);
      expect(() => fixedPointScalar(op, 0, value)).toThrow(FixedPointInputError);
    }
    expect(() => fixedPointVector("score", [], [], value)).toThrow(FixedPointInputError);
    expect(() => createFixedPointVector([value])).toThrow(FixedPointInputError);
  });
  it.each([undefined, null, {}, true, new Float64Array([1]), Array(17).fill(0), Array(1), [[1]]])(
    "rejects unsupported arrays %#", value => {
      expect(() => createFixedPointVector(value)).toThrow(FixedPointInputError);
      expect(() => fixedPointVector("dot", [], value)).toThrow(FixedPointInputError);
    });
  it("rejects mismatches, unknown operations and extraneous operands", () => {
    expect(() => fixedPointVector("dot", [0], [])).toThrow(/equal/);
    expect(() => fixedPointVector("dot", [], [true])).toThrow(FixedPointInputError);
    expect(() => fixedPointVector("sum", [], [0])).toThrow(FixedPointInputError);
    expect(() => fixedPointVector("dot", [], [], 0)).toThrow(FixedPointInputError);
    for (const operation of ["toString", "__proto__", "transfer", {}, null]) {
      expect(() => fixedPointScalar(operation as FixedPointScalarOperation, 0, 0)).toThrow(FixedPointInputError);
      expect(() => fixedPointVector(operation as FixedPointVectorOperation, [])).toThrow(FixedPointInputError);
    }
  });
  it("never invokes getters, iterators or coercion and freezes independent copies", () => {
    let calls = 0;
    const getter = [0], iterator = [0], extra = [0];
    Object.defineProperty(getter, "0", { get() { calls++; return 0; } });
    Object.defineProperty(iterator, Symbol.iterator, { get() { calls++; return () => []; } });
    Object.defineProperty(extra, "extra", { get() { calls++; return 0; } });
    class Subclass extends Array {}
    for (const input of [getter, iterator, extra, new Subclass(1), [{ valueOf() { calls++; return 0; } }]]) {
      expect(() => createFixedPointVector(input)).toThrow(FixedPointInputError);
    }
    expect(calls).toBe(0);
    const a = [-0, 1000], b = createFixedPointVector(a);
    a[1] = 2;
    expect(b).toEqual([0, 1000]);
    expect(Object.isFrozen(b)).toBe(true);
    expect(createFixedPointVector(Object.freeze([1]))).toEqual([1]);
  });
  it("parses exact decimal representations without implicit input quantization", () => {
    for (const [text, value] of [["0", 0], ["-0.000", 0], ["1.234", 1234], ["-0.001", -1],
      ["1000.000", 1_000_000], ["-1000", -1_000_000]] as const) {
      expect(parseFixedPointDecimal(text)).toBe(value);
    }
    for (const value of [1.234, true, null, "1.2340", "1e2", "01", "+1", ".1", " 1", "1.", "1000.001",
      "-1000.001", "NaN", "Infinity", "1\n", "1.234\n", "1.234\r", "1.234\u2028",
      "1.234\u2029", "9".repeat(65536), { toString: () => "1" }]) {
      expect(() => parseFixedPointDecimal(value)).toThrow(FixedPointInputError);
    }
  });
  it("keeps pinned integer and learner contracts unchanged", () => {
    expect(() => sumNumericVector([0.5])).toThrow();
    expect(() => evaluateLinearClassifier({ w1: 1, w2: 0, bias: 0 }, [{ x1: 0.5, x2: 0, label: 1 }])).toThrow();
    const model = { w1: 2, w2: -3, bias: 1 };
    const old = evaluateLinearClassifier(model, [{ x1: 2, x2: 1, label: 1 }]);
    expect(fixedPointVector("score", [2000, -3000], [2000, 1000], 1000).units).toBe(old.scores[0] * 1000);
    expect(fixedPointVector("score", [2000, -3000], [2250, 1125], 1000).units).toBe(2125);
  });
  it("retains financial and generic profile fences including stripped headers", () => {
    const sources = [
      ...(["add", "subtract", "multiply", "divide"] as const).map(op => compileFixedPointScalar(op, 1, 2)),
      ...(["sum", "dot", "score"] as const).map(op =>
        compileFixedPointVector(op, [1], op === "sum" ? undefined : [2], op === "score" ? 3 : undefined)),
    ];
    for (const source of sources) for (const text of [source, source.split("\n").slice(1).join("\n")]) {
      expect(() => runToHalt(text, 0)).toThrow();
      expect(() => assertLegacyExecutionSource(text, true)).toThrow();
    }
  });
  it("detects validly encoded mutations in every arithmetic path and tie rule", () => {
    // Re-translation retains valid coordinates/jumps: numerical tests, not parser rejection, must catch corruption.
    const kernel = getFixedPointKernelSource();
    const mutations = [
      ["return left + right", "return left - right", "fixedAdd(1200, 300)", 1500],
      ["return left - right", "return left + right", "fixedSubtract(1200, 300)", 900],
      ["left * right, 1000", "left + right, 1000", "fixedMultiply(1200, 500)", 600],
      ["left * 1000, right", "left + 1000, right", "fixedDivide(1200, 500)", 2400],
      ["total + left * right", "total - left * right", "fixedDotStep(10, 2, 3)", 16],
      ["remainder * 2 >= denominator", "remainder * 2 > denominator", "fixedMultiply(-1, 500)", -1],
      ["sign = -1", "sign = 1", "fixedMultiply(-3, 500)", -2],
      ["denominator = -denominator", "denominator = denominator", "fixedDivide(1, -2000)", -1],
      ["numerator % denominator", "numerator // denominator", "fixedMultiply(1, 500)", 1],
    ] as const;
    for (const [before, after, call, expected] of mutations) {
      expect(kernel.split(before)).toHaveLength(2);
      const source = translatePython(`${kernel.replace(before, after)}\nresult = ${call}`);
      expect(executePythonWavelength(source).variables.result).not.toBe(expected);
    }
  });
});
