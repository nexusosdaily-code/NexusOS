import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addFixedPoint, subtractFixedPoint, multiplyFixedPoint, divideFixedPoint,
  compileFixedPointBinary, compileFixedPointDot, compileFixedPointScore, compileFixedPointSum,
  createFixedPointVector, dotFixedPointVectors, FIXED_POINT_LIMITS, FIXED_POINT_PACKAGE,
  FixedPointInputError, FixedPointRangeError, getFixedPointKernelSource, parseFixedPoint,
  scoreFixedPointVectors, sumFixedPointVector,
} from "../shared/wls-fixed-point";
import { fixedPointFixtures, fixedPointReference } from "../scripts/wls-fixed-point-reference";
import { compileFixedPointFixture, executeFixedPointFixture } from "../scripts/wls-fixed-point-fixtures";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, VM_MAX_CYCLES } from "../shared/vm-security";
import { dotNumericVectors, NUMERIC_VECTOR_PACKAGE } from "../shared/wls-numeric-vectors";
import { trainLinearClassifier, evaluateLinearClassifier, LEARNING_PACKAGE } from "../shared/wls-learning";
import { runToHalt } from "./wnsp_vm";

describe("bounded WLS fixed-point dependency", () => {
  it("executes byte-identical canonical WLS with the exact manifest and function surface", () => {
    const source = readFileSync(new URL("../shared/wls-fixed-point/0.1.0/kernel.wls", import.meta.url), "utf8");
    const manifest = JSON.parse(readFileSync(new URL("../shared/wls-fixed-point/0.1.0/manifest.json", import.meta.url), "utf8"));
    expect(getFixedPointKernelSource()).toBe(source);
    expect(manifest).toEqual({ ...FIXED_POINT_PACKAGE, source: "kernel.wls" });
    expect(compilePythonWavelength(source).filter(i => i.op === "FUNC").map(i => i.args[0])).toEqual(FIXED_POINT_PACKAGE.kernelFunctions);
    expect(executePythonWavelength(source).variables).toEqual({});
    expect(FIXED_POINT_PACKAGE.scale).toBe(1000);
    expect(FIXED_POINT_PACKAGE.rounding).toBe("half-away-from-zero");
    expect(FIXED_POINT_LIMITS).toEqual({ decimalPlaces: 3, magnitudeUnits: 1_000_000, vectorLength: 16, inputCharacters: 9 });
  });
  it("matches independent exact rational arithmetic, including overflow and division by zero", () => {
    const fixtures = fixedPointFixtures(), oracle = fixedPointReference(fixtures);
    expect(oracle.length).toBe(fixtures.length);
    expect(new Set(fixtures.map(c => c.operation)).size).toBe(7);
    expect(oracle.some(r => r.status === "overflow")).toBe(true);
    expect(oracle.some(r => r.status === "division-by-zero")).toBe(true);
    fixtures.forEach((fixture, i) => {
      const expected = oracle[i];
      const program = compileFixedPointFixture(fixture);
      expect(program.length).toBeLessThanOrEqual(65_536);
      expect(compilePythonWavelength(program).length).toBeLessThanOrEqual(2048);
      if (expected.status === "division-by-zero") {
        expect(() => executePythonWavelength(program)).toThrow(/Division by zero/);
        expect(() => executeFixedPointFixture(fixture)).toThrow(/Division by zero/);
      } else {
        const native = executePythonWavelength(program);
        expect(native.cycles).toBeLessThanOrEqual(2048);
        if (expected.status === "overflow") {
          expect(native.variables.result).toBe(null);
          expect(() => executeFixedPointFixture(fixture)).toThrow(FixedPointRangeError);
        } else {
          const actual = executeFixedPointFixture(fixture);
          expect(native.variables.result).toBe(expected.units);
          expect(actual.units).toBe(expected.units);
          expect(actual.value).toBe(expected.value);
          expect(actual.scale).toBe(1000);
          expect(parseFixedPoint(actual.value).units).toBe(actual.units);
          expect(actual.kernelCalls).toContain("fixedCheck");
        }
      }
    });
  }, 20_000);
  it.each([
    ["1", 1000, "1.000"], ["-1.2", -1200, "-1.200"], ["0.001", 1, "0.001"],
    ["1000", 1_000_000, "1000.000"], ["-1000.000", -1_000_000, "-1000.000"],
    ["-0", 0, "0.000"], ["-0.000", 0, "0.000"], ["0.01", 10, "0.010"],
  ])("parses %s exactly without float arithmetic", (text, units, decimal) => {
    const value = parseFixedPoint(text);
    expect(value).toEqual({ kind: "WLS-FIXED/1", scale: 1000, units, decimal });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.is(value.units, -0)).toBe(false);
  });
  it.each([
    undefined, null, 0, 1, 1.25, -0, NaN, Infinity, true, false, 1n, Symbol("1"),
    {}, [], new String("1.25"), "", " ", " 1", "1 ", "+1", ".5", "-.5", "1.",
    "01", "-01.0", "1e-3", "1_000", "1,25", "1/2", "1.0000", "0x10",
    "1000.001", "-1000.001", "1001", "-1001", "10000", "１２", "١", "1\n",
    "1.234\n", "1.234\r", "1.234\u2028", "1.234\u2029",
    "1\u0000", "1.2;pay(9)", "9".repeat(65536),
  ])("rejects unsupported scalar input %#", value => {
    expect(() => parseFixedPoint(value)).toThrow(FixedPointInputError);
    expect(() => addFixedPoint("0", value)).toThrow(FixedPointInputError);
    expect(() => compileFixedPointBinary("multiply", value, "1")).toThrow(FixedPointInputError);
  });
  it.each([
    ["0.001", "0.499", "0.000"], ["0.001", "0.500", "0.001"],
    ["0.001", "0.501", "0.001"], ["-0.001", "0.499", "0.000"],
    ["-0.001", "0.500", "-0.001"], ["-0.001", "0.501", "-0.001"],
    ["0.001", "-0.500", "-0.001"], ["-0.001", "-0.500", "0.001"],
  ])("rounds multiplication %s * %s consistently", (left, right, expected) => {
    expect(multiplyFixedPoint(left, right).value).toBe(expected);
  });
  it.each([
    ["0.001", "2", "0.001"], ["-0.001", "2", "-0.001"],
    ["0.001", "-2", "-0.001"], ["-0.001", "-2", "0.001"],
    ["0.001", "1.999", "0.001"], ["0.001", "2.001", "0.000"],
    ["1", "3", "0.333"], ["-1", "3", "-0.333"], ["2", "3", "0.667"],
  ])("rounds division %s / %s consistently", (left, right, expected) => {
    expect(divideFixedPoint(left, right).value).toBe(expected);
  });
  it.each(["0", "0.000", "-0", "-0.000"])("fails native division by %s without a successful envelope", zero => {
    const source = compileFixedPointBinary("divide", "1", zero);
    expect(() => executePythonWavelength(source)).toThrow(/Division by zero/);
    expect(() => divideFixedPoint("1", zero)).toThrow(/Division by zero/);
    expect(() => divideFixedPoint("0", zero)).toThrow(/Division by zero/);
  });
  it("rejects rounded output overflow through the real WLS check, never clamps or wraps", () => {
    for (const fixture of [
      { operation: "add" as const, left: "1000", right: "0.001" },
      { operation: "subtract" as const, left: "-1000", right: "0.001" },
      { operation: "multiply" as const, left: "1000", right: "1.001" },
      { operation: "divide" as const, left: "1000", right: "0.001" },
    ]) {
      expect(executePythonWavelength(compileFixedPointFixture(fixture)).variables.result).toBe(null);
      expect(() => executeFixedPointFixture(fixture)).toThrow(FixedPointRangeError);
    }
    expect(addFixedPoint("999.999", "0.001").value).toBe("1000.000");
    expect(subtractFixedPoint("-999.999", "0.001").value).toBe("-1000.000");
    expect(dotFixedPointVectors(["1000", "0.001"], ["1", "0.499"]).value).toBe("1000.000");
    expect(() => dotFixedPointVectors(["1000", "0.001"], ["1", "0.500"])).toThrow(FixedPointRangeError);
  });
  it("accumulates before rounding and includes bias before sign-crossing ties", () => {
    expect(dotFixedPointVectors(["0.001", "0.001"], ["0.500", "0.500"]).value).toBe("0.001");
    expect(dotFixedPointVectors(["0.001", "0.001"], ["0.400", "0.400"]).value).toBe("0.001");
    expect(dotFixedPointVectors(["0.001", "-0.001"], ["0.500", "0.500"]).value).toBe("0.000");
    expect(scoreFixedPointVectors(["0.001"], ["0.500"], "-0.001").value).toBe("-0.001");
    expect(scoreFixedPointVectors(["-0.001"], ["0.500"], "0.001").value).toBe("0.001");
    expect(scoreFixedPointVectors([], [], "-0.125").value).toBe("-0.125");
    expect(sumFixedPointVector([]).value).toBe("0.000");
    expect(dotFixedPointVectors([], []).value).toBe("0.000");
  });
  it("supports bounded cancellation without early output-range truncation", () => {
    const cancelling = [...Array(8).fill("1000"), ...Array(8).fill("-1000")];
    expect(sumFixedPointVector(cancelling).value).toBe("0.000");
    expect(dotFixedPointVectors(cancelling, Array(16).fill("1000")).value).toBe("0.000");
    expect(() => sumFixedPointVector(Array(16).fill("1000"))).toThrow(FixedPointRangeError);
    expect(() => scoreFixedPointVectors(Array(16).fill("1000"), Array(16).fill("1000"), "1000"))
      .toThrow(FixedPointRangeError);
    const maxNumerator = 16n * 1_000_000n ** 2n + 1_000_000n * 1000n;
    expect(2n * maxNumerator + 1_000_000n <= BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(VM_MAX_CYCLES).toBe(2048);
  });
  it.each([
    null, undefined, {}, "1", [1], [true], [null], [undefined], Array(1),
    new Float64Array([1]), Array(17).fill("0"), ["0", "1.0000"], [["1"]],
  ])("rejects unsupported vector input %#", value => {
    expect(() => createFixedPointVector(value)).toThrow(FixedPointInputError);
    expect(() => compileFixedPointSum(value)).toThrow(FixedPointInputError);
    expect(() => sumFixedPointVector(value)).toThrow(FixedPointInputError);
    expect(() => dotFixedPointVectors([], value)).toThrow();
  });
  it("rejects mismatches and invalid operands/bias even with zero or empty partners", () => {
    for (const [left, right] of [[[], ["1"]], [["1"], []], [["0"], [true]], [[true], ["0"]]]) {
      expect(() => dotFixedPointVectors(left, right)).toThrow(FixedPointInputError);
      expect(() => compileFixedPointScore(left, right, "0")).toThrow(FixedPointInputError);
    }
    expect(() => scoreFixedPointVectors([], [], undefined)).toThrow(FixedPointInputError);
    expect(() => compileFixedPointDot(Array(17).fill("0"), Array(17).fill("0"))).toThrow(FixedPointInputError);
  });
  it("does not invoke coercion, getters or custom iterators and retains no input reference", () => {
    let calls = 0;
    const scalar = { toString() { calls++; return "1"; }, valueOf() { calls++; return 1; } };
    const getter = ["1"], iterator = ["1"], extra = ["1"];
    Object.defineProperty(getter, "0", { get() { calls++; return "1"; } });
    Object.defineProperty(iterator, Symbol.iterator, { get() { calls++; return function* () { yield "1"; }; } });
    Object.defineProperty(extra, "hidden", { get() { calls++; return "1"; } });
    class CustomArray extends Array {}
    for (const vector of [[scalar], getter, iterator, extra, new CustomArray("1")]) {
      expect(() => sumFixedPointVector(vector)).toThrow(FixedPointInputError);
    }
    expect(calls).toBe(0);
    const original = ["1.2", "-0"], vector = createFixedPointVector(original);
    original[0] = "999";
    expect(vector).toEqual(["1.200", "0.000"]);
    expect(Object.isFrozen(vector)).toBe(true);
    const first = sumFixedPointVector(vector);
    multiplyFixedPoint("-2", "1.5");
    expect(sumFixedPointVector(vector)).toEqual(first);
    expect(sumFixedPointVector(Object.freeze(["1", "2"])).value).toBe("3.000");
  });
  it("runs actual WLS arithmetic and rejects unknown operations without executing input text", () => {
    for (const operation of ["pow", "ADD", "__proto__", "constructor", null, {}, 0]) {
      expect(() => compileFixedPointBinary(operation, "1", "2")).toThrow(FixedPointInputError);
    }
    const source = compileFixedPointBinary("multiply", "1.250", "2.500");
    const executed = executePythonWavelength(source);
    expect(executed.variables.result).toBe(3125);
    expect(executed.trace.some(i => i.op === "MUL")).toBe(true);
    expect(executed.trace.some(i => i.op === "FLOORDIV")).toBe(true);
    expect(multiplyFixedPoint("1.250", "2.500").kernelCalls).toEqual(["fixedRound", "fixedCheck"]);
    expect(dotFixedPointVectors(["1", "2"], ["3", "4"]).kernelCalls)
      .toEqual(["fixedDotStep", "fixedDotStep", "fixedRound", "fixedCheck"]);
  });
  it("interoperates with learned integer weights without silently changing either old package", () => {
    const model = trainLinearClassifier([
      { x1: -1, x2: -1, label: 0 }, { x1: -1, x2: 1, label: 0 },
      { x1: 1, x2: -1, label: 0 }, { x1: 1, x2: 1, label: 1 },
    ]).model;
    const whole = [{ x1: 2, x2: 2, label: 1 }, { x1: -2, x2: 1, label: 0 }];
    const old = evaluateLinearClassifier(model, whole);
    whole.forEach((p, i) => {
      const score = scoreFixedPointVectors([String(model.w1), String(model.w2)], [String(p.x1), String(p.x2)], String(model.bias));
      expect(score.units).toBe(old.scores[i] * 1000);
    });
    expect(scoreFixedPointVectors([String(model.w1), String(model.w2)], ["0.750", "0.500"], String(model.bias)).value)
      .toBe("0.250");
    expect(NUMERIC_VECTOR_PACKAGE.version).toBe("0.1.0");
    expect(LEARNING_PACKAGE.version).toBe("0.1.0");
    expect(dotNumericVectors([1, 2], [3, 4]).value).toBe(11);
    expect(() => dotNumericVectors(["1"], ["2"])).toThrow();
    expect(() => dotFixedPointVectors([1], [2])).toThrow(FixedPointInputError);
  });
  it("fences financial and legacy preview execution with or without the profile header", () => {
    for (const source of [
      compileFixedPointBinary("multiply", "1.25", "2"), compileFixedPointSum(["1"]),
      compileFixedPointDot(["1"], ["2"]), compileFixedPointScore(["1"], ["2"], "0.5"),
    ]) for (const variant of [source, source.split("\n").slice(1).join("\n")]) {
      expect(() => runToHalt(variant, 0)).toThrow();
      expect(() => assertLegacyExecutionSource(variant, true)).toThrow(/WLS-PY\/1/);
    }
  });
  it("detects valid arithmetic, rounding and range-check mutations rather than canned success", () => {
    const dot = compileFixedPointDot(["1.25"], ["2.5"]);
    const wrongProduct = dot.replace('@581.42nm MUL {"line":20', '@528.94nm ADD {"line":20');
    expect(executePythonWavelength(wrongProduct).variables.result).not.toBe(3125);
    const rounding = compileFixedPointBinary("multiply", "0.001", "0.500");
    const subtractionTag = compileFixedPointBinary("subtract", "1", "0").match(/(@[\d.]+nm) SUB /)![1];
    const truncated = rounding.replace('@528.94nm ADD {"line":14', `${subtractionTag} SUB {"line":14`);
    // A correctly encoded variant must still run, and must fail independent expected rounding.
    expect(executePythonWavelength(truncated).variables.result).not.toBe(1);
    const overflow = compileFixedPointBinary("add", "1000", "0.001");
    const weakened = overflow.replace('"line":4,"args":[1000000]', '"line":4,"args":[1000001]');
    expect(executePythonWavelength(weakened).variables.result).toBe(1_000_001);
    expect(() => addFixedPoint("1000", "0.001")).toThrow(FixedPointRangeError);
  });
});
