import { LEARNING_KERNEL_SOURCE } from "./wls-learning-kernel";
import { compilePythonWavelength, translatePython } from "./wavelength-python";
import { executePythonWavelength, type PythonVMResult } from "./wavelength-python-vm";

export const LEARNING_PACKAGE = Object.freeze({
  name: "@wls/linear-learning", version: "0.1.0", executionProfile: "WLS-PY/1",
  operations: Object.freeze(["linearDot2", "linearPredict2", "linearUpdate"]),
  distribution: "local-only", externalCapabilities: Object.freeze([] as string[]),
});
export const LEARNING_LIMITS = Object.freeze({
  trainingSamples: 4, epochs: 3, updates: 12, evaluationSamples: 16,
  featureMagnitude: 8, modelMagnitude: 128,
});
export interface LearningSample { readonly x1: number; readonly x2: number; readonly label: 0 | 1 }
export interface LinearModel { readonly w1: number; readonly w2: number; readonly bias: number }
export class LearningInputError extends Error {}
const fail = (message: string): never => { throw new LearningInputError(message); };

function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Expected a plain data record.");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail("Expected a plain data record.");
  if (Reflect.ownKeys(value as object).length !== keys.length) fail("Unexpected fields in learning input.");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (keys.some(key => !descriptors[key] || !("value" in descriptors[key]))) {
    fail("Unexpected fields or accessors in learning input.");
  }
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}
function integer(value: unknown, bound: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Math.abs(value) > bound) {
    fail(`Expected an integer within ±${bound}.`);
  }
  return value as number;
}
function samples(value: unknown, max: number): LearningSample[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail("Expected a plain data array.");
  const count = Object.getOwnPropertyDescriptor(value, "length")?.value;
  if (typeof count !== "number" || count < 1 || count > max) fail(`Expected 1–${max} labelled samples.`);
  const entries = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(entries).length !== count + 1) fail(`Expected 1–${max} dense labelled samples.`);
  return Array.from({ length: count }, (_, i) => {
    if (!entries[i] || !("value" in entries[i])) fail("Sparse samples and accessors are unsupported.");
    const data = record(entries[i].value, ["x1", "x2", "label"]);
    const label = integer(data.label, 1);
    if (label !== 0 && label !== 1) fail("Labels must be 0 or 1.");
    return { x1: integer(data.x1, LEARNING_LIMITS.featureMagnitude),
      x2: integer(data.x2, LEARNING_LIMITS.featureMagnitude), label: label as 0 | 1 };
  });
}

/** Preserve kernel jump indices: append only branch-free caller instructions. */
function compose(body: string): string {
  const kernel = compilePythonWavelength(LEARNING_KERNEL_SOURCE);
  if (kernel[kernel.length - 1].op !== "HALT") fail("Invalid learning kernel termination.");
  const caller = translatePython(body);
  const instructions = compilePythonWavelength(caller);
  const allowed = new Set(["CONST", "LOAD", "STORE", "NEG", "ADD", "SUB", "NE", "CALL", "HALT"]);
  if (instructions.some(i => !allowed.has(i.op))) fail("Unsupported learning caller instruction.");
  const lines = LEARNING_KERNEL_SOURCE.trimEnd().split("\n");
  lines.pop(); // Remove the final HALT, never any function-local branch.
  const source = [...lines, ...caller.split("\n").slice(1)].join("\n");
  compilePythonWavelength(source); // Validate the combined profile and every jump.
  return source;
}
function scalar(result: PythonVMResult, name: string): number {
  const value = result.variables[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail("Invalid learning VM result.");
  return value as number;
}
export function getLearningKernelSource(): string { return LEARNING_KERNEL_SOURCE; }

export function compileLinearTraining(input: unknown, epochs: unknown = 3): string {
  const data = samples(input, LEARNING_LIMITS.trainingSamples);
  const count = integer(epochs, LEARNING_LIMITS.epochs);
  if (count < 1 || data.length * count > LEARNING_LIMITS.updates) fail("Training update budget exceeded.");
  let body = "w1 = 0\nw2 = 0\nbias = 0\ninitial_errors = 0\nfinal_errors = 0\n";
  for (const p of data) body += `initial_errors = initial_errors + (linearPredict2(w1, w2, bias, ${p.x1}, ${p.x2}) != ${p.label})\n`;
  for (let epoch = 0; epoch < count; epoch++) {
    body += `epoch_${epoch}_errors = 0\n`;
    for (const p of data) {
      body += `prediction = linearPredict2(w1, w2, bias, ${p.x1}, ${p.x2})\n` +
        `error = ${p.label} - prediction\nepoch_${epoch}_errors = epoch_${epoch}_errors + (error != 0)\n` +
        `w1 = linearUpdate(w1, error, ${p.x1})\nw2 = linearUpdate(w2, error, ${p.x2})\nbias = linearUpdate(bias, error, 1)\n`;
    }
  }
  for (const p of data) body += `final_errors = final_errors + (linearPredict2(w1, w2, bias, ${p.x1}, ${p.x2}) != ${p.label})\n`;
  return compose(body);
}

/** Training arithmetic and parameter updates run in WLS, not in these host loops. */
export function trainLinearClassifier(input: unknown, epochs: unknown = 3) {
  const source = compileLinearTraining(input, epochs);
  const result = executePythonWavelength(source);
  const count = integer(epochs, LEARNING_LIMITS.epochs);
  return {
    package: LEARNING_PACKAGE, source, cycles: result.cycles,
    model: Object.freeze({ w1: scalar(result, "w1"), w2: scalar(result, "w2"), bias: scalar(result, "bias") }),
    initialMistakes: scalar(result, "initial_errors"), finalMistakes: scalar(result, "final_errors"),
    mistakesByEpoch: Array.from({ length: count }, (_, i) => scalar(result, `epoch_${i}_errors`)),
  };
}

export function evaluateLinearClassifier(modelInput: unknown, input: unknown) {
  const raw = record(modelInput, ["w1", "w2", "bias"]);
  const model = { w1: integer(raw.w1, LEARNING_LIMITS.modelMagnitude),
    w2: integer(raw.w2, LEARNING_LIMITS.modelMagnitude), bias: integer(raw.bias, LEARNING_LIMITS.modelMagnitude) };
  const data = samples(input, LEARNING_LIMITS.evaluationSamples);
  let body = "mistakes = 0\n";
  data.forEach((p, i) => {
    body += `score_${i} = linearDot2(${model.w1}, ${model.w2}, ${p.x1}, ${p.x2}) + ${model.bias}\n` +
      `prediction_${i} = linearPredict2(${model.w1}, ${model.w2}, ${model.bias}, ${p.x1}, ${p.x2})\n` +
      `mistakes = mistakes + (prediction_${i} != ${p.label})\n`;
  });
  const source = compose(body);
  const result = executePythonWavelength(source);
  return {
    package: LEARNING_PACKAGE, source, cycles: result.cycles, mistakes: scalar(result, "mistakes"),
    predictions: data.map((_, i) => scalar(result, `prediction_${i}`)),
    scores: data.map((_, i) => scalar(result, `score_${i}`)),
  };
}
