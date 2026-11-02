import { NUMERIC_VECTOR_KERNEL_SOURCE } from "./wls-numeric-vector-kernel";
import { compilePythonWavelength, translatePython } from "./wavelength-python";
import { executePythonWavelength } from "./wavelength-python-vm";

export const NUMERIC_VECTOR_PACKAGE = Object.freeze({
  name: "@wls/numeric-vectors", version: "0.1.0", executionProfile: "WLS-PY/1",
  operations: Object.freeze(["vectorSumStep", "vectorDotStep"]),
  distribution: "local-only", externalCapabilities: Object.freeze([] as string[]),
});
export const NUMERIC_VECTOR_LIMITS = Object.freeze({ length: 16, magnitude: 1_000_000, biasMagnitude: 1_000_000 });
export type BoundedNumericVector = readonly number[];
export class NumericVectorInputError extends Error {}
const fail = (message: string): never => { throw new NumericVectorInputError(message); };

function integer(value: unknown, bound: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > bound) {
    fail(`Expected an integer within ±${bound}.`);
  }
  return Object.is(value, -0) ? 0 : value as number;
}

/** Dense scalar data only; no iterator/getter evaluation or retained caller array. */
export function createBoundedNumericVector(input: unknown): BoundedNumericVector {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    fail("Expected a plain numeric data array.");
  }
  const length = Object.getOwnPropertyDescriptor(input, "length")?.value;
  if (typeof length !== "number" || length > NUMERIC_VECTOR_LIMITS.length) {
    fail(`Numeric vectors support at most ${NUMERIC_VECTOR_LIMITS.length} entries.`);
  }
  if (Reflect.ownKeys(input as object).length !== length + 1) fail("Sparse vectors and extra properties are unsupported.");
  const values: number[] = [];
  for (let i = 0; i < length; i++) {
    const item = Object.getOwnPropertyDescriptor(input, String(i));
    if (!item || !("value" in item)) fail("Vector entries must be data, not holes or accessors.");
    values.push(integer(item!.value, NUMERIC_VECTOR_LIMITS.magnitude));
  }
  return Object.freeze(values);
}

export function getNumericVectorKernelSource(): string { return NUMERIC_VECTOR_KERNEL_SOURCE; }

function compose(body: string): string {
  const kernel = compilePythonWavelength(NUMERIC_VECTOR_KERNEL_SOURCE);
  const lines = NUMERIC_VECTOR_KERNEL_SOURCE.trimEnd().split("\n");
  if (kernel[kernel.length - 1].op !== "HALT" || !/\bHALT /.test(lines[lines.length - 1])) {
    fail("Invalid numerical kernel termination.");
  }
  const caller = translatePython(body);
  const allowed = new Set(["CONST", "LOAD", "STORE", "NEG", "CALL", "HALT"]);
  if (compilePythonWavelength(caller).some(i => !allowed.has(i.op))) {
    fail("Unexpected instruction in numerical caller.");
  }
  lines.pop();
  const source = [...lines, ...caller.split("\n").slice(1)].join("\n");
  compilePythonWavelength(source);
  return source;
}

function sumProgram(input: unknown) {
  const vector = createBoundedNumericVector(input);
  let body = "result = 0\n";
  for (const value of vector) body += `result = vectorSumStep(result, ${value})\n`;
  return { source: compose(body), length: vector.length };
}
function dotProgram(leftInput: unknown, rightInput: unknown, bias?: number) {
  const left = createBoundedNumericVector(leftInput);
  const right = createBoundedNumericVector(rightInput);
  if (left.length !== right.length) fail("Dot products require equal vector lengths; padding and truncation are forbidden.");
  let body = "result = 0\n";
  for (let i = 0; i < left.length; i++) body += `result = vectorDotStep(result, ${left[i]}, ${right[i]})\n`;
  if (bias !== undefined) body += `result = vectorSumStep(result, ${bias})\n`;
  return { source: compose(body), length: left.length };
}
function execute(operation: "sum" | "dot" | "weighted_score", program: { source: string; length: number }) {
  const result = executePythonWavelength(program.source);
  const value = result.variables.result;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail("Invalid numerical VM result.");
  return {
    package: NUMERIC_VECTOR_PACKAGE, operation, value: value as number, length: program.length,
    cycles: result.cycles, source: program.source,
    kernelCalls: Object.freeze(result.trace.filter(i => i.op === "CALL").map(i => String(i.args[0]))),
  };
}

export function compileNumericVectorSum(input: unknown): string { return sumProgram(input).source; }
export function compileNumericVectorDot(left: unknown, right: unknown): string { return dotProgram(left, right).source; }
export function compileNumericVectorScore(left: unknown, right: unknown, bias: unknown): string {
  return dotProgram(left, right, integer(bias, NUMERIC_VECTOR_LIMITS.biasMagnitude)).source;
}
export function sumNumericVector(input: unknown) { return execute("sum", sumProgram(input)); }
export function dotNumericVectors(left: unknown, right: unknown) { return execute("dot", dotProgram(left, right)); }
export function scoreNumericVectors(left: unknown, right: unknown, bias: unknown) {
  return execute("weighted_score", dotProgram(left, right, integer(bias, NUMERIC_VECTOR_LIMITS.biasMagnitude)));
}
