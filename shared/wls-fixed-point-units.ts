import { FIXED_POINT_KERNEL_SOURCE } from "./wls-fixed-point-units-kernel";
import { translatePython } from "./wavelength-python";
import { executePythonWavelength } from "./wavelength-python-vm";

export const FIXED_POINT_PACKAGE = Object.freeze({
  name: "@wls/fixed-point-units", version: "0.1.0", executionProfile: "WLS-PY/1",
  operations: Object.freeze(["fixedRound", "fixedAdd", "fixedSubtract", "fixedMultiply", "fixedDivide", "fixedDotStep"]),
  distribution: "local-only", externalCapabilities: Object.freeze([] as string[]),
  scale: 1000, magnitude: 1_000_000, length: 16, rounding: "nearest-ties-away-from-zero",
});
export class FixedPointInputError extends Error {}
export class FixedPointOverflowError extends Error {}
export class FixedPointDivisionByZeroError extends Error {}
const fail = (message: string): never => { throw new FixedPointInputError(message); };
export type FixedPointScalarOperation = "add" | "subtract" | "multiply" | "divide";
export type FixedPointVectorOperation = "sum" | "dot" | "score";

/** Units, not decimal JS numbers. Every required operand is checked first. */
function units(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) ||
      Math.abs(value) > FIXED_POINT_PACKAGE.magnitude) fail("Expected integer units within ±1000000 (scale 1000).");
  return Object.is(value, -0) ? 0 : value as number;
}

/** Exact representation conversion only, not a numerical execution substitute.
 * No implicit quantization: more than three fractional digits is an error. */
export function parseFixedPointDecimal(value: unknown): number {
  if (typeof value !== "string" || value.length > 9 ||
      !/^-?(?:0|[1-9]\d{0,3})(?:\.\d{1,3})?(?![\s\S])/.test(value)) {
    fail("Expected a canonical decimal string with at most three fractional digits.");
  }
  const text = value as string;
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  const magnitude = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  return units(text.startsWith("-") ? -magnitude : magnitude);
}

/** Ordinary trusted-realm data arrays only; no getters, iterators or coercion. */
export function createFixedPointVector(value: unknown): readonly number[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail("Expected a plain data array.");
  const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
  if (typeof length !== "number" || length > FIXED_POINT_PACKAGE.length) fail("Expected at most 16 entries.");
  if (Reflect.ownKeys(value as object).length !== length + 1) fail("Expected dense data without extra properties.");
  const copy: number[] = [];
  for (let i = 0; i < length; i++) {
    const item = Object.getOwnPropertyDescriptor(value, String(i));
    if (!item || !("value" in item)) fail("Entries must be data, not holes or accessors.");
    copy.push(units(item!.value));
  }
  return Object.freeze(copy);
}

export function getFixedPointKernelSource(): string { return FIXED_POINT_KERNEL_SOURCE; }
const compose = (body: string) => translatePython(`${FIXED_POINT_KERNEL_SOURCE}\n${body}`);

export function compileFixedPointScalar(operation: FixedPointScalarOperation, left: unknown, right: unknown): string {
  const a = units(left), b = units(right);
  const functions = { add: "fixedAdd", subtract: "fixedSubtract", multiply: "fixedMultiply", divide: "fixedDivide" };
  if (typeof operation !== "string" || !Object.prototype.hasOwnProperty.call(functions, operation)) fail("Unsupported scalar operation.");
  if (operation === "divide" && b === 0) throw new FixedPointDivisionByZeroError("Division by zero.");
  return compose(`result = ${functions[operation]}(${a}, ${b})\n`);
}

export function compileFixedPointVector(
  operation: FixedPointVectorOperation, left: unknown, right?: unknown, bias?: unknown,
): string {
  if (!["sum", "dot", "score"].includes(operation)) fail("Unsupported vector operation.");
  const a = createFixedPointVector(left);
  // Sum has one operand. Reject extraneous arguments rather than ignore invalid data.
  if (operation === "sum" && (right !== undefined || bias !== undefined)) fail("Sum accepts one vector.");
  const b = operation === "sum" ? [] : createFixedPointVector(right);
  if (operation !== "sum" && a.length !== b.length) fail("Expected equal vector lengths.");
  if (operation === "dot" && bias !== undefined) fail("Dot accepts no bias.");
  const offset = operation === "score" ? units(bias) : 0;
  let body = "total = 0\n";
  for (let i = 0; i < a.length; i++) {
    body += operation === "sum" ? `total = fixedAdd(total, ${a[i]})\n`
      : `total = fixedDotStep(total, ${a[i]}, ${b[i]})\n`;
  }
  if (operation === "score") body += `total = fixedDotStep(total, ${offset}, 1000)\n`;
  body += operation === "sum" ? "result = total\n" : "result = fixedRound(total, 1000)\n";
  return compose(body);
}

function execute(source: string) {
  const vm = executePythonWavelength(source);
  const value = vm.variables.result;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail("Invalid fixed-point VM result.");
  if (Math.abs(value as number) > FIXED_POINT_PACKAGE.magnitude) {
    throw new FixedPointOverflowError("Fixed-point result exceeds ±1000000 units; no saturation or wraparound.");
  }
  return {
    package: FIXED_POINT_PACKAGE, units: Object.is(value, -0) ? 0 : value as number,
    source, cycles: vm.cycles,
    kernelCalls: Object.freeze(vm.trace.filter(i => i.op === "CALL").map(i => String(i.args[0]))),
  };
}
export function fixedPointScalar(operation: FixedPointScalarOperation, left: unknown, right: unknown) {
  return execute(compileFixedPointScalar(operation, left, right));
}
export function fixedPointVector(operation: FixedPointVectorOperation, left: unknown, right?: unknown, bias?: unknown) {
  return execute(compileFixedPointVector(operation, left, right, bias));
}
