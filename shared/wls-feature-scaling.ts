import { compilePythonWavelength, translatePython } from "./wavelength-python";
import { executePythonWavelength } from "./wavelength-python-vm";
import { FixedPointInputError, getFixedPointKernelSource, parseFixedPoint } from "./wls-fixed-point";
import {
  trainFractionalRateClassifier, evaluateFractionalClassifier,
} from "./wls-fractional-learning";

export const FEATURE_SCALING_PACKAGE = Object.freeze({
  name: "@wls/feature-scaling", version: "0.1.0", executionProfile: "WLS-PY/1",
  operations: Object.freeze(["scalingAbs", "scalingMaximum", "scalingValue"]),
  dependencies: Object.freeze([Object.freeze({ name: "@wls/fixed-point", version: "0.1.0" })]),
  pipelineDependency: Object.freeze({ name: "@wls/fractional-learning", version: "0.2.0" }),
  distribution: "local-only", syntheticOnly: true, externalCapabilities: Object.freeze([] as string[]),
});
export const FEATURE_SCALING_LIMITS = Object.freeze({
  trainingSamples: 4, evaluationSamples: 16, inputMagnitudeUnits: 1_000_000,
  outputMagnitudeUnits: 1000, scale: 1000,
});
export interface FeatureScaler { readonly maxAbsX1: string; readonly maxAbsX2: string }
export class FeatureScalingInputError extends Error {}
export class FeatureScalingRangeError extends Error {}
const fail = (message: string): never => { throw new FeatureScalingInputError(message); };

// These algorithms are compiled to WLS instructions, not executed as Python.
const kernel = translatePython(`def scalingAbs(value):
    return value * (1 - 2 * (value < 0))

def scalingMaximum(current, value):
    magnitude = scalingAbs(value)
    return current + (magnitude - current) * (magnitude > current)

def scalingValue(value, maximum):
    return fixedRound(value * 1000, maximum + (maximum == 0))
`).concat("\n");
export function getFeatureScalingKernelSource(): string { return kernel; }

function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Expected a plain scaling record.");
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) fail("Expected a plain scaling record.");
  if (Reflect.ownKeys(input as object).length !== keys.length) fail("Unexpected scaling fields.");
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const item = Object.getOwnPropertyDescriptor(input, key);
    if (!item || !("value" in item)) fail("Scaling fields must be own data properties.");
    result[key] = item!.value;
  }
  return result;
}
function decimal(input: unknown): ReturnType<typeof parseFixedPoint> {
  try { return parseFixedPoint(input); }
  catch (error) {
    if (error instanceof FixedPointInputError) fail(error.message);
    throw error;
  }
}
function samples(input: unknown, max: number) {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) fail("Expected a plain scaling sample array.");
  const length = Object.getOwnPropertyDescriptor(input, "length")?.value;
  if (!Number.isSafeInteger(length) || length < 1 || length > max) fail(`Expected 1–${max} scaling samples.`);
  if (Reflect.ownKeys(input as object).length !== length + 1) fail("Sparse samples and extra properties are unsupported.");
  return Array.from({ length }, (_, i) => {
    const item = Object.getOwnPropertyDescriptor(input, String(i));
    if (!item || !("value" in item)) fail("Samples must be own data properties.");
    const p = record(item!.value, ["x1", "x2", "label"]);
    if (p.label !== 0 && p.label !== 1) fail("Labels must be numeric 0 or 1.");
    return { x1: decimal(p.x1).units, x2: decimal(p.x2).units, label: p.label as 0 | 1 };
  });
}
function scaler(input: unknown) {
  const value = record(input, ["maxAbsX1", "maxAbsX2"]);
  const a = decimal(value.maxAbsX1), b = decimal(value.maxAbsX2);
  if (a.units < 0 || b.units < 0) fail("Scaler maxima cannot be negative.");
  return { a: a.units, b: b.units };
}
function format(units: number): string {
  const digits = String(Math.abs(units)).padStart(4, "0");
  return `${units < 0 ? "-" : ""}${digits.slice(0, -3)}.${digits.slice(-3)}`;
}
function compose(body: string): string {
  const prefix = getFixedPointKernelSource();
  const helperOps = new Set(["FUNC", "LOAD", "CONST", "SUB", "MUL", "LT", "GT", "EQ", "ADD", "STORE", "CALL", "RETURN", "END", "HALT"]);
  if (compilePythonWavelength(kernel).some(i => !helperOps.has(i.op))) fail("Scaling helper requires an explicit linker change.");
  const caller = translatePython(body);
  const callerOps = new Set(["CONST", "LOAD", "STORE", "NEG", "CALL", "HALT"]);
  if (compilePythonWavelength(caller).some(i => !callerOps.has(i.op))) fail("Unexpected scaling caller instruction.");
  const lines = [prefix, kernel].map(source => {
    const code = compilePythonWavelength(source), parts = source.trimEnd().split("\n");
    if (code.at(-1)?.op !== "HALT" || !/\bHALT /.test(parts.at(-1)!)) fail("Invalid scaling kernel termination.");
    parts.pop();
    return parts;
  });
  const source = [...lines[0], ...lines[1].slice(1), ...caller.split("\n").slice(1)].join("\n");
  compilePythonWavelength(source);
  return source;
}
function transformedBody(data: ReturnType<typeof samples>) {
  return data.map((p, i) => `out_${i}_x1 = scalingValue(${p.x1}, scale_x1)\nout_${i}_x2 = scalingValue(${p.x2}, scale_x2)\n`).join("");
}
function fitProgram(input: unknown) {
  const data = samples(input, FEATURE_SCALING_LIMITS.trainingSamples);
  const body = "scale_x1 = 0\nscale_x2 = 0\n" + data.map(p =>
    `scale_x1 = scalingMaximum(scale_x1, ${p.x1})\nscale_x2 = scalingMaximum(scale_x2, ${p.x2})\n`,
  ).join("") + transformedBody(data);
  return { data, source: compose(body) };
}
function transformProgram(model: unknown, input: unknown) {
  const bounds = scaler(model), data = samples(input, FEATURE_SCALING_LIMITS.evaluationSamples);
  // This is contract validation, not normalization. No held-out refitting/clamping.
  if (data.some(p => Math.abs(p.x1) > bounds.a || Math.abs(p.x2) > bounds.b)) {
    throw new FeatureScalingRangeError("Sample is outside the fitted feature range; explicit refitting is required.");
  }
  return { data, source: compose(`scale_x1 = ${bounds.a}\nscale_x2 = ${bounds.b}\n${transformedBody(data)}`) };
}
function execute(program: ReturnType<typeof fitProgram>) {
  const result = executePythonWavelength(program.source);
  const integer = (name: string, max: number): number => {
    const value = result.variables[name];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > max) {
      throw new FeatureScalingRangeError(`Invalid WLS scaling result: ${name}`);
    }
    return value;
  };
  const a = integer("scale_x1", 1_000_000), b = integer("scale_x2", 1_000_000);
  if (a < 0 || b < 0) throw new FeatureScalingRangeError("WLS returned a negative scaler.");
  return Object.freeze({
    package: FEATURE_SCALING_PACKAGE, source: program.source, cycles: result.cycles,
    instructions: compilePythonWavelength(program.source).length,
    kernelCalls: Object.freeze(result.trace.filter(row => row.op === "CALL").map(row => row.args[0])),
    model: Object.freeze({ maxAbsX1: format(a), maxAbsX2: format(b) }),
    samples: Object.freeze(program.data.map((p, i) => Object.freeze({
      x1: format(integer(`out_${i}_x1`, 1000)), x2: format(integer(`out_${i}_x2`, 1000)), label: p.label,
    }))),
  });
}
export function compileFeatureScalingFit(input: unknown): string { return fitProgram(input).source; }
export function compileFeatureScalingTransform(model: unknown, input: unknown): string { return transformProgram(model, input).source; }
export function fitFeatureScaler(input: unknown) { return execute(fitProgram(input)); }
export function transformFeatures(model: unknown, input: unknown) { return execute(transformProgram(model, input)); }

/** Separate bounded WLS invocations, not a larger combined VM budget. */
export function trainScaledFractionalClassifier(input: unknown, learningRate: unknown = "1.000", epochs: unknown = 3) {
  const scaling = fitFeatureScaler(input);
  const training = trainFractionalRateClassifier(scaling.samples, learningRate, epochs);
  return Object.freeze({ scaling, training });
}
export function evaluateScaledFractionalClassifier(scalerInput: unknown, modelInput: unknown, input: unknown) {
  const scaling = transformFeatures(scalerInput, input);
  const evaluation = evaluateFractionalClassifier(modelInput, scaling.samples);
  return Object.freeze({ scaling, evaluation });
}
