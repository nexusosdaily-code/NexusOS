import { FIXED_POINT_KERNEL_SOURCE } from "./wls-fixed-point-kernel";
import { compilePythonWavelength, translatePython } from "./wavelength-python";
import { executePythonWavelength } from "./wavelength-python-vm";

export const FIXED_POINT_PACKAGE = Object.freeze({
  name: "@wls/fixed-point", version: "0.1.0", executionProfile: "WLS-PY/1",
  operations: Object.freeze(["add", "subtract", "multiply", "divide", "sum", "dot", "score"]),
  kernelFunctions: Object.freeze(["fixedCheck", "fixedRound", "fixedSumStep", "fixedDotStep"]),
  scale: 1000, rounding: "half-away-from-zero",
  distribution: "local-only", externalCapabilities: Object.freeze([] as string[]),
});
export const FIXED_POINT_LIMITS = Object.freeze({
  decimalPlaces: 3, magnitudeUnits: 1_000_000, vectorLength: 16, inputCharacters: 9,
});
export class FixedPointInputError extends Error {}
export class FixedPointRangeError extends Error {}
const fail = (message: string): never => { throw new FixedPointInputError(message); };

/** Encoding/decoding only: arithmetic and rounding are performed by WLS. */
function formatUnits(units: number): string {
  const digits = String(Math.abs(units)).padStart(4, "0");
  return `${units < 0 ? "-" : ""}${digits.slice(0, -3)}.${digits.slice(-3)}`;
}
export function parseFixedPoint(input: unknown) {
  if (typeof input !== "string" || input.length > FIXED_POINT_LIMITS.inputCharacters ||
      // Absolute end-of-input: JavaScript's bare $ also accepts a final newline.
      !/^-?(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,3})?(?![\s\S])/.test(input)) {
    fail("Expected a decimal string with up to three fractional digits, no whitespace, exponent or leading zeroes.");
  }
  const text = input as string;
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = (negative ? text.slice(1) : text).split(".");
  const encoded = Number(`${negative ? "-" : ""}${whole}${fraction.padEnd(3, "0")}`);
  if (!Number.isSafeInteger(encoded) || Math.abs(encoded) > FIXED_POINT_LIMITS.magnitudeUnits) {
    fail("Fixed-point inputs must be within -1000.000 through 1000.000.");
  }
  const units = Object.is(encoded, -0) ? 0 : encoded;
  return Object.freeze({ kind: "WLS-FIXED/1" as const, scale: 1000 as const, units, decimal: formatUnits(units) });
}

function readVector(input: unknown) {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    fail("Expected a plain array of fixed-point decimal strings.");
  }
  const length = Object.getOwnPropertyDescriptor(input, "length")?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > FIXED_POINT_LIMITS.vectorLength) {
    fail("Fixed-point vectors support at most 16 elements.");
  }
  if (Reflect.ownKeys(input as object).length !== length + 1) fail("Sparse vectors and extra properties are unsupported.");
  const values: ReturnType<typeof parseFixedPoint>[] = [];
  for (let i = 0; i < length; i++) {
    const item = Object.getOwnPropertyDescriptor(input, String(i));
    if (!item || !("value" in item)) fail("Vector elements must be data, not accessors or holes.");
    values.push(parseFixedPoint(item!.value));
  }
  return values;
}
export function createFixedPointVector(input: unknown): readonly string[] {
  return Object.freeze(readVector(input).map(value => value.decimal));
}
export function getFixedPointKernelSource(): string { return FIXED_POINT_KERNEL_SOURCE; }

function compose(body: string): string {
  const kernel = compilePythonWavelength(FIXED_POINT_KERNEL_SOURCE);
  const lines = FIXED_POINT_KERNEL_SOURCE.trimEnd().split("\n");
  if (kernel[kernel.length - 1].op !== "HALT" || !/\bHALT /.test(lines[lines.length - 1])) fail("Invalid kernel termination.");
  const caller = translatePython(body);
  // Keep callers branch-free: canonical kernel jumps retain their original indices.
  const allowed = new Set(["CONST", "LOAD", "STORE", "NEG", "CALL", "ADD", "SUB", "MUL", "HALT"]);
  if (compilePythonWavelength(caller).some(i => !allowed.has(i.op))) fail("Unexpected fixed-point caller instruction.");
  lines.pop();
  const source = [...lines, ...caller.split("\n").slice(1)].join("\n");
  compilePythonWavelength(source);
  return source;
}
function binaryProgram(operation: unknown, left: unknown, right: unknown) {
  if (operation !== "add" && operation !== "subtract" && operation !== "multiply" && operation !== "divide") {
    fail("Unsupported fixed-point binary operation.");
  }
  const a = parseFixedPoint(left).units, b = parseFixedPoint(right).units;
  const expression = operation === "add" ? `${a} + ${b}` :
    operation === "subtract" ? `${a} - ${b}` :
      operation === "multiply" ? `fixedRound(${a} * ${b}, 1000)` : `fixedRound(${a} * 1000, ${b})`;
  return { source: compose(`result = fixedCheck(${expression})\n`), length: null };
}
function sumProgram(input: unknown) {
  const vector = readVector(input);
  let body = "total = 0\n";
  for (const value of vector) body += `total = fixedSumStep(total, ${value.units})\n`;
  return { source: compose(`${body}result = fixedCheck(total)\n`), length: vector.length };
}
function dotProgram(leftInput: unknown, rightInput: unknown, biasInput?: { value: unknown }) {
  const left = readVector(leftInput), right = readVector(rightInput);
  const bias = biasInput ? parseFixedPoint(biasInput.value).units : null;
  if (left.length !== right.length) fail("Fixed-point dot products require equal vector lengths.");
  let body = "total = 0\n";
  for (let i = 0; i < left.length; i++) body += `total = fixedDotStep(total, ${left[i].units}, ${right[i].units})\n`;
  // Bias participates before the single final rounding, including sign-crossing ties.
  const numerator = bias === null ? "total" : `total + ${bias} * 1000`;
  return { source: compose(`${body}result = fixedCheck(fixedRound(${numerator}, 1000))\n`), length: left.length };
}
function execute(operation: string, program: { source: string; length: number | null }) {
  const result = executePythonWavelength(program.source);
  const raw = result.variables.result;
  // The real WLS fixedCheck returns None on representational overflow.
  if (raw === null) throw new FixedPointRangeError("Fixed-point result exceeds -1000.000 through 1000.000.");
  if (typeof raw !== "number" || !Number.isSafeInteger(raw) || Math.abs(raw) > FIXED_POINT_LIMITS.magnitudeUnits) {
    throw new Error("Invalid fixed-point VM result.");
  }
  const units = Object.is(raw, -0) ? 0 : raw;
  return {
    package: FIXED_POINT_PACKAGE, operation, value: formatUnits(units), units, scale: 1000 as const,
    length: program.length, source: program.source, cycles: result.cycles,
    kernelCalls: Object.freeze(result.trace.filter(i => i.op === "CALL").map(i => String(i.args[0]))),
  };
}
export function compileFixedPointBinary(operation: unknown, left: unknown, right: unknown): string {
  return binaryProgram(operation, left, right).source;
}
export function compileFixedPointSum(input: unknown): string { return sumProgram(input).source; }
export function compileFixedPointDot(left: unknown, right: unknown): string { return dotProgram(left, right).source; }
export function compileFixedPointScore(left: unknown, right: unknown, bias: unknown): string {
  return dotProgram(left, right, { value: bias }).source;
}
export function addFixedPoint(left: unknown, right: unknown) { return execute("add", binaryProgram("add", left, right)); }
export function subtractFixedPoint(left: unknown, right: unknown) { return execute("subtract", binaryProgram("subtract", left, right)); }
export function multiplyFixedPoint(left: unknown, right: unknown) { return execute("multiply", binaryProgram("multiply", left, right)); }
export function divideFixedPoint(left: unknown, right: unknown) { return execute("divide", binaryProgram("divide", left, right)); }
export function sumFixedPointVector(input: unknown) { return execute("sum", sumProgram(input)); }
export function dotFixedPointVectors(left: unknown, right: unknown) { return execute("dot", dotProgram(left, right)); }
export function scoreFixedPointVectors(left: unknown, right: unknown, bias: unknown) {
  return execute("score", dotProgram(left, right, { value: bias }));
}
