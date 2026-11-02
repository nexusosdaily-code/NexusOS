import { FRACTIONAL_LEARNING_KERNEL_SOURCE } from "./wls-fractional-learning-kernel";
import { FRACTIONAL_RATE_KERNEL_SOURCE } from "./wls-fractional-rate-kernel";
import {
  FIXED_POINT_PACKAGE, FixedPointInputError, getFixedPointKernelSource, parseFixedPoint,
} from "./wls-fixed-point";
import { compilePythonWavelength, translatePython } from "./wavelength-python";
import { executePythonWavelength, type PythonVMResult } from "./wavelength-python-vm";

export const FRACTIONAL_LEARNING_PACKAGE = Object.freeze({
  name: "@wls/fractional-learning", version: "0.1.0", executionProfile: "WLS-PY/1",
  operations: Object.freeze(["fractionalMargin2", "fractionalPredict", "fractionalUpdate"]),
  scale: 1000, learningRate: "1.000", classification: "unrounded-margin-nonnegative",
  dependencies: Object.freeze([Object.freeze({
    name: "@wls/fixed-point", version: "0.1.0", executionProfile: "WLS-PY/1",
  })]),
  distribution: "local-only", externalCapabilities: Object.freeze([] as string[]),
});
/** Opt-in synthetic experiment; the retained API continues to select 0.1.0. */
export const FRACTIONAL_RATE_PACKAGE = Object.freeze({
  ...FRACTIONAL_LEARNING_PACKAGE, version: "0.2.0",
  operations: Object.freeze(["fractionalMargin2", "fractionalPredict", "fractionalRateUpdate"]),
  learningRate: "configurable-0.001-through-1.000",
  quantization: "complete-new-parameter-half-away-from-zero",
  syntheticOnly: true,
});
export const FRACTIONAL_LEARNING_LIMITS = Object.freeze({
  trainingSamples: 4, epochs: 3, updates: 12, evaluationSamples: 16,
  featureMagnitudeUnits: 8_000, modelMagnitudeUnits: 128_000, scoreMagnitudeUnits: 1_000_000,
  rawMarginMagnitude: 2_176_000_000,
});
export interface FractionalLearningSample { readonly x1: string; readonly x2: string; readonly label: 0 | 1 }
export interface FractionalLinearModel { readonly w1: string; readonly w2: string; readonly bias: string }
/** Post-assignment VM snapshots, including zero-error visits; units are thousandths. */
export interface FractionalParameterUpdate {
  readonly w1: number; readonly w2: number; readonly bias: number;
}
export class FractionalLearningInputError extends Error {}
export class FractionalLearningRangeError extends Error {}
const fail = (message: string): never => { throw new FractionalLearningInputError(message); };

function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Expected a plain learning data record.");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail("Expected a plain learning data record.");
  if (Reflect.ownKeys(value as object).length !== keys.length) fail("Unexpected fields in fractional learning data.");
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) fail("Missing fields or accessors in fractional learning data.");
    result[key] = descriptor!.value;
  }
  return result;
}
function decimalUnits(input: unknown, bound: number): number {
  let units: number;
  try { units = parseFixedPoint(input).units; } catch (error) {
    if (error instanceof FixedPointInputError) fail(error.message);
    throw error;
  }
  if (Math.abs(units!) > bound) fail(`Fractional learning value exceeds ±${bound} scaled units.`);
  return units!;
}
function epochsCount(input: unknown): number {
  if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 1 ||
      input > FRACTIONAL_LEARNING_LIMITS.epochs) fail("Expected 1–3 integer epochs.");
  return input as number;
}
function readSamples(input: unknown, max: number) {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) fail("Expected a plain sample array.");
  const count = Object.getOwnPropertyDescriptor(input, "length")?.value;
  if (!Number.isSafeInteger(count) || count < 1 || count > max) fail(`Expected 1–${max} labelled samples.`);
  if (Reflect.ownKeys(input as object).length !== count + 1) fail("Sparse samples and extra properties are unsupported.");
  const result: { x1: number; x2: number; label: 0 | 1 }[] = [];
  for (let i = 0; i < count; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(i));
    if (!descriptor || !("value" in descriptor)) fail("Sparse samples and accessors are unsupported.");
    const data = record(descriptor!.value, ["x1", "x2", "label"]);
    if (typeof data.label !== "number" || (data.label !== 0 && data.label !== 1)) fail("Labels must be numeric 0 or 1.");
    result.push({
      x1: decimalUnits(data.x1, FRACTIONAL_LEARNING_LIMITS.featureMagnitudeUnits),
      x2: decimalUnits(data.x2, FRACTIONAL_LEARNING_LIMITS.featureMagnitudeUnits), label: data.label as 0 | 1,
    });
  }
  return result;
}
function compose(body: string, configurable = false): string {
  const dependency = FRACTIONAL_LEARNING_PACKAGE.dependencies[0];
  if (FIXED_POINT_PACKAGE.name !== dependency.name || FIXED_POINT_PACKAGE.version !== dependency.version ||
      FIXED_POINT_PACKAGE.executionProfile !== dependency.executionProfile) fail("Incompatible local fixed-point dependency.");
  const prefix = getFixedPointKernelSource(), kernel = configurable ? FRACTIONAL_RATE_KERNEL_SOURCE : FRACTIONAL_LEARNING_KERNEL_SOURCE;
  const prefixCode = compilePythonWavelength(prefix), kernelCode = compilePythonWavelength(kernel);
  if (prefixCode[prefixCode.length - 1].op !== "HALT" || kernelCode[kernelCode.length - 1].op !== "HALT") {
    fail("Invalid numerical dependency termination.");
  }
  // Preserve absolute jumps in the fixed-point prefix. Linked helpers and caller have no branches.
  const linkedHelpers = new Set(["FUNC", "END", "CONST", "LOAD", "MUL", "ADD", "GE", "RETURN", "HALT"]);
  if (configurable) linkedHelpers.add("CALL");
  if (kernelCode.some(i => !linkedHelpers.has(i.op))) {
    fail("Fractional helper relocation requires an explicit linker change.");
  }
  const caller = translatePython(body);
  const allowed = new Set(["CONST", "LOAD", "STORE", "NEG", "ADD", "SUB", "NE", "CALL", "HALT"]);
  if (configurable) allowed.add("MUL");
  if (compilePythonWavelength(caller).some(i => !allowed.has(i.op))) fail("Unexpected fractional learning caller instruction.");
  const prefixLines = prefix.trimEnd().split("\n"), kernelLines = kernel.trimEnd().split("\n");
  prefixLines.pop(); kernelLines.pop();
  const source = [...prefixLines, ...kernelLines.slice(1), ...caller.split("\n").slice(1)].join("\n");
  compilePythonWavelength(source);
  return source;
}
function trainingProgram(input: unknown, epochs: unknown, rate?: number) {
  const data = readSamples(input, FRACTIONAL_LEARNING_LIMITS.trainingSamples), count = epochsCount(epochs);
  if (data.length * count > FRACTIONAL_LEARNING_LIMITS.updates) fail("Fractional update budget exceeded.");
  let body = "w1 = 0\nw2 = 0\nbias = 0\ninitial_errors = 0\nfinal_errors = 0\nupdates = 0\n";
  const prediction = (p: { x1: number; x2: number }) =>
    `fractionalPredict(fractionalMargin2(w1, w2, bias, ${p.x1}, ${p.x2}))`;
  const update = (weight: string, feature: number) => rate === undefined ?
    `fractionalUpdate(${weight}, error, ${feature})` :
    `fractionalRateUpdate(${weight}, error, ${feature}, ${rate})`;
  for (const p of data) body += `initial_errors = initial_errors + (${prediction(p)} != ${p.label})\n`;
  for (let epoch = 0; epoch < count; epoch++) {
    body += `epoch_${epoch}_errors = 0\n`;
    data.forEach((p, i) => {
      const step = epoch * data.length + i;
      body += `prediction = ${prediction(p)}\nerror = ${p.label} - prediction\n` +
        `epoch_${epoch}_errors = epoch_${epoch}_errors + (error != 0)\n` +
        `w1 = ${update("w1", p.x1)}\nstep_${step}_w1 = w1\n` +
        `w2 = ${update("w2", p.x2)}\nstep_${step}_w2 = w2\n` +
        // The unit bias feature makes this exactly integral; avoid a redundant
        // round call so all twelve visits retain the original shared VM budget.
        `bias = ${rate === undefined ? update("bias", 1000) : `bias + error * ${rate}`}\nstep_${step}_bias = bias\n`;
    });
    body += `updates = updates + epoch_${epoch}_errors\n`;
  }
  for (const p of data) body += `final_errors = final_errors + (${prediction(p)} != ${p.label})\n`;
  return { source: compose(body, rate !== undefined), epochs: count, count: data.length };
}
function evaluationProgram(modelInput: unknown, input: unknown) {
  const raw = record(modelInput, ["w1", "w2", "bias"]);
  const model = {
    w1: decimalUnits(raw.w1, FRACTIONAL_LEARNING_LIMITS.modelMagnitudeUnits),
    w2: decimalUnits(raw.w2, FRACTIONAL_LEARNING_LIMITS.modelMagnitudeUnits),
    bias: decimalUnits(raw.bias, FRACTIONAL_LEARNING_LIMITS.modelMagnitudeUnits),
  };
  const data = readSamples(input, FRACTIONAL_LEARNING_LIMITS.evaluationSamples);
  let body = "mistakes = 0\n";
  data.forEach((p, i) => {
    body += `margin_${i} = fractionalMargin2(${model.w1}, ${model.w2}, ${model.bias}, ${p.x1}, ${p.x2})\n` +
      `prediction_${i} = fractionalPredict(margin_${i})\n` +
      `score_${i} = fixedCheck(fixedRound(margin_${i}, 1000))\n` +
      `mistakes = mistakes + (prediction_${i} != ${p.label})\n`;
  });
  return { source: compose(body), count: data.length };
}
function scalar(result: PythonVMResult, name: string, min: number, max: number): number {
  const value = result.variables[name];
  if (value === null) throw new FractionalLearningRangeError("A reported score exceeds ±1000.000; no evaluation result is returned.");
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error("Invalid fractional learning VM result.");
  if (value < min || value > max) throw new FractionalLearningRangeError(`Fractional learning result ${name} is out of range.`);
  return Object.is(value, -0) ? 0 : value;
}
function decimal(units: number): string {
  const digits = String(Math.abs(units)).padStart(4, "0");
  return parseFixedPoint(`${units < 0 ? "-" : ""}${digits.slice(0, -3)}.${digits.slice(-3)}`).decimal;
}
function trace(result: PythonVMResult) {
  return Object.freeze(result.trace.filter(i => i.op === "CALL").map(i => String(i.args[0])));
}
export function getFractionalLearningKernelSource(): string { return FRACTIONAL_LEARNING_KERNEL_SOURCE; }
export function compileFractionalTraining(input: unknown, epochs: unknown = 3): string {
  return trainingProgram(input, epochs).source;
}
export function trainFractionalClassifier(input: unknown, epochs: unknown = 3) {
  return executeTraining(trainingProgram(input, epochs), FRACTIONAL_LEARNING_PACKAGE);
}
function rateUnits(input: unknown): number {
  const units = decimalUnits(input, 1000);
  if (units < 1) fail("Learning rate must be a decimal string from 0.001 through 1.000.");
  return units;
}
export function getFractionalRateKernelSource(): string { return FRACTIONAL_RATE_KERNEL_SOURCE; }
export function compileFractionalRateTraining(input: unknown, learningRate: unknown, epochs: unknown = 3): string {
  return trainingProgram(input, epochs, rateUnits(learningRate)).source;
}
/** Caller supplies synthetic data only. No network, storage or training-state persistence. */
export function trainFractionalRateClassifier(input: unknown, learningRate: unknown, epochs: unknown = 3) {
  const rate = rateUnits(learningRate);
  return {
    ...executeTraining(trainingProgram(input, epochs, rate), FRACTIONAL_RATE_PACKAGE),
    learningRate: decimal(rate),
  };
}
function executeTraining<T extends typeof FRACTIONAL_LEARNING_PACKAGE | typeof FRACTIONAL_RATE_PACKAGE>(
  program: ReturnType<typeof trainingProgram>, selectedPackage: T) {
  const result = executePythonWavelength(program.source);
  const limit = FRACTIONAL_LEARNING_LIMITS.modelMagnitudeUnits;
  return {
    package: selectedPackage, source: program.source, cycles: result.cycles,
    model: Object.freeze({
      w1: decimal(scalar(result, "w1", -limit, limit)), w2: decimal(scalar(result, "w2", -limit, limit)),
      bias: decimal(scalar(result, "bias", -limit, limit)),
    }),
    initialMistakes: scalar(result, "initial_errors", 0, program.count),
    finalMistakes: scalar(result, "final_errors", 0, program.count),
    updates: scalar(result, "updates", 0, program.count * program.epochs),
    mistakesByEpoch: Object.freeze(Array.from({ length: program.epochs },
      (_, i) => scalar(result, `epoch_${i}_errors`, 0, program.count))),
    parameterUpdates: Object.freeze(Array.from({ length: program.count * program.epochs },
      (_, i): Readonly<FractionalParameterUpdate> => Object.freeze({
        w1: scalar(result, `step_${i}_w1`, -limit, limit),
        w2: scalar(result, `step_${i}_w2`, -limit, limit),
        bias: scalar(result, `step_${i}_bias`, -limit, limit),
      }))),
    kernelCalls: trace(result),
  };
}
export function compileFractionalEvaluation(modelInput: unknown, input: unknown): string {
  return evaluationProgram(modelInput, input).source;
}
export function evaluateFractionalClassifier(modelInput: unknown, input: unknown) {
  const program = evaluationProgram(modelInput, input), result = executePythonWavelength(program.source);
  const scoreLimit = FRACTIONAL_LEARNING_LIMITS.scoreMagnitudeUnits;
  const scoreUnits = Object.freeze(Array.from({ length: program.count },
    (_, i) => scalar(result, `score_${i}`, -scoreLimit, scoreLimit)));
  return {
    package: FRACTIONAL_LEARNING_PACKAGE, source: program.source, cycles: result.cycles,
    mistakes: scalar(result, "mistakes", 0, program.count),
    predictions: Object.freeze(Array.from({ length: program.count }, (_, i) => scalar(result, `prediction_${i}`, 0, 1))),
    scoreUnits, scores: Object.freeze(scoreUnits.map(decimal)),
    rawMargins: Object.freeze(Array.from({ length: program.count }, (_, i) => scalar(result,
      `margin_${i}`, -FRACTIONAL_LEARNING_LIMITS.rawMarginMagnitude, FRACTIONAL_LEARNING_LIMITS.rawMarginMagnitude))),
    marginScale: 1_000_000 as const, kernelCalls: trace(result),
  };
}
