import { isDeepStrictEqual } from "node:util";
import { compileFractionalTraining, compileFractionalEvaluation,
  type FractionalLearningSample } from "../shared/wls-fractional-learning";
import { compilePythonWavelength, translatePython } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { parseFixedPoint } from "../shared/wls-fixed-point";
import { fractionalLearningReference, type FractionalReferenceRequest,
  type FractionalReferenceResult } from "./wls-fractional-learning-reference";

export const FRACTIONAL_CORPUS_SEEDS = [0, 1, 0x5eed1224, 0xffffffff] as const;
const modes = ["mixed", "zero", "boundary", "conflict"] as const;
type TrainingRequest = Extract<FractionalReferenceRequest, { operation: "train" }>;
type MutableSample = { -readonly [K in keyof FractionalLearningSample]: FractionalLearningSample[K] };
export interface FractionalSyntheticCase {
  seed: number;
  id: string;
  mode: typeof modes[number];
  request: TrainingRequest;
}
const decimal = (units: number) =>
  `${units < 0 ? "-" : ""}${Math.floor(Math.abs(units) / 1000)}.${String(Math.abs(units) % 1000).padStart(3, "0")}`;

/** Versioned LCG; only integer operations, no clock/random/global state. */
export function fractionalSyntheticCorpus(seeds: readonly number[] = FRACTIONAL_CORPUS_SEEDS): FractionalSyntheticCase[] {
  const cases: FractionalSyntheticCase[] = [];
  for (const seed of seeds) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Expected a uint32 seed");
    let state = seed;
    const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
    const sample = (): MutableSample => ({
      x1: decimal(next() % 16001 - 8000), x2: decimal(next() % 16001 - 8000),
      label: (next() >>> 31) as 0 | 1,
    });
    let ordinal = 0;
    for (const mode of modes) for (let batch = 1; batch <= 4; batch++) for (let epochs = 1; epochs <= 3; epochs++) {
      const samples = Array.from({ length: batch }, sample);
      samples.forEach((p, i) => {
        if (mode === "mixed") {
          p.x1 = decimal(-(next() % 7999 + 1)); p.x2 = decimal(next() % 7999 + 1);
          if (i % 2) [p.x1, p.x2] = [p.x2, p.x1];
        } else if (mode === "zero") {
          p.x1 = "0.000"; p.x2 = i % 2 ? p.x2 : "-0.000";
        } else if (mode === "boundary") {
          p.x1 = i % 2 ? "8.000" : "-8.000";
          p.x2 = ["7.999", "-7.999", "-8.000", "8.000"][i];
        } else {
          p.x1 = samples[0].x1; p.x2 = samples[0].x2; p.label = (i % 2) as 0 | 1;
        }
      });
      const evaluation = Array.from({ length: ordinal++ % 16 + 1 }, sample);
      // Include unseen zero, minimum nonzero and maximum magnitudes.
      const probes = [
        { x1: "0.000", x2: "-0.000", label: 0 as const },
        { x1: "-0.001", x2: "0.001", label: 1 as const },
        { x1: "8.000", x2: "-8.000", label: 0 as const },
        { x1: "-8.000", x2: "8.000", label: 1 as const },
      ];
      probes.slice(0, evaluation.length).forEach((p, i) => { evaluation[i] = p; });
      cases.push({ seed, mode, id: `lcg-v1:${seed}:${mode}:b${batch}:e${epochs}`,
        request: { operation: "train", samples, epochs, evaluation } });
    }
  }
  return cases;
}

export type FractionalSourceTransform = (source: string, testCase: FractionalSyntheticCase,
  phase: "training" | "evaluation") => string;

/** The CLI and sensitivity tests use this same comparison path. Each execute
 * keeps the VM's default shared budget; oracle chunks only bound Python I/O. */
export function auditFractionalSyntheticCorpus(
  cases = fractionalSyntheticCorpus(), transform: FractionalSourceTransform = source => source,
) {
  const failures: { id: string; seed: number; request: TrainingRequest; mismatches: string[] }[] = [];
  let parameterAssignmentsCompared = 0, maxTrainingCycles = 0, maxEvaluationCycles = 0;
  let maxInstructions = 0, maxSourceCharacters = 0;
  const references: FractionalReferenceResult[] = [];
  for (let i = 0; i < cases.length; i += 32) {
    references.push(...fractionalLearningReference(cases.slice(i, i + 32).map(c => c.request)));
  }
  cases.forEach((testCase, index) => {
    const mismatches: string[] = [], expected = references[index], request = testCase.request;
    const check = (name: string, actual: unknown, wanted: unknown) => {
      if (!isDeepStrictEqual(actual, wanted)) mismatches.push(name);
    };
    const execute = (source: string, phase: "training" | "evaluation") => {
      const changed = transform(source, testCase, phase);
      const instructions = compilePythonWavelength(changed).length;
      const result = executePythonWavelength(changed);
      maxInstructions = Math.max(maxInstructions, instructions);
      maxSourceCharacters = Math.max(maxSourceCharacters, changed.length);
      if (phase === "training") maxTrainingCycles = Math.max(maxTrainingCycles, result.cycles);
      else maxEvaluationCycles = Math.max(maxEvaluationCycles, result.cycles);
      if (instructions > 2048 || result.cycles > 2048 || changed.length > 65_536) mismatches.push(`${phase}.budget`);
      return result.variables;
    };
    try {
      const raw = execute(compileFractionalTraining(request.samples, request.epochs), "training");
      for (const key of ["w1", "w2", "bias"] as const) {
        check(`model.${key}`, raw[key], parseFixedPoint(expected.model![key]).units);
      }
      expected.parameterUpdates!.forEach((step, i) => {
        for (const key of ["w1", "w2", "bias"] as const) {
          check(`step_${i}_${key}`, raw[`step_${i}_${key}`], step[key]);
          parameterAssignmentsCompared++;
        }
      });
      check("initial_errors", raw.initial_errors, expected.initialMistakes);
      check("final_errors", raw.final_errors, expected.finalMistakes);
      check("updates", raw.updates, expected.updates);
      expected.mistakesByEpoch!.forEach((value, i) => check(`epoch_${i}_errors`, raw[`epoch_${i}_errors`], value));
      // Evaluate the actual model, not the oracle's model.
      const model = { w1: decimal(raw.w1 as number), w2: decimal(raw.w2 as number), bias: decimal(raw.bias as number) };
      const evaluated = execute(compileFractionalEvaluation(model, request.evaluation!), "evaluation");
      const evaluation = expected.evaluation!;
      if (evaluation.status === "overflow") {
        check("overflow", request.evaluation!.some((_, i) => evaluated[`score_${i}`] === null), true);
      } else {
        request.evaluation!.forEach((_, i) => {
          check(`prediction_${i}`, evaluated[`prediction_${i}`], evaluation.predictions![i]);
          check(`margin_${i}`, evaluated[`margin_${i}`], evaluation.rawMargins![i]);
          check(`score_${i}`, evaluated[`score_${i}`], evaluation.scoreUnits![i]);
          check(`display_${i}`, decimal(evaluated[`score_${i}`] as number), evaluation.scores![i]);
        });
        check("mistakes", evaluated.mistakes, evaluation.mistakes);
      }
    } catch (error) {
      mismatches.push(`execution: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (mismatches.length) failures.push({ id: testCase.id, seed: testCase.seed, request, mismatches });
  });
  return { cases: cases.length, failures, parameterAssignmentsCompared,
    maxTrainingCycles, maxEvaluationCycles, maxInstructions, maxSourceCharacters };
}

/** A validly encoded wrong assignment, captured then restored before the next
 * computation. Final models/predictions/metrics are deliberately unchanged. */
export function transientFractionalAssignment(source: string, step: number, key: "w1" | "w2" | "bias"): string {
  const lines = source.split("\n");
  const store = lines.findIndex(line => line.includes(`"args":["step_${step}_${key}"]`));
  if (store < 1 || !lines[store - 1].includes(`"args":["${key}"]`)) throw new Error("Missing snapshot anchor");
  const encode = (body: string) => translatePython(body).trimEnd().split("\n").slice(1, -1);
  return [...lines.slice(0, store - 1),
    ...encode(`${key} = ${key} + 1\n`),
    ...lines.slice(store - 1, store + 1),
    ...encode(`${key} = ${key} - 1\n`),
    ...lines.slice(store + 1)].join("\n");
}

export function fractionalSyntheticSensitivity(cases = fractionalSyntheticCorpus()) {
  // Multiple positions and all three parameters, including a late no-op update.
  const target = cases.find(c => c.mode === "conflict" && c.request.samples.length === 4 && c.request.epochs === 3);
  if (!target) throw new Error("Missing synthetic sensitivity fixture");
  return (["w1", "w2", "bias"] as const).flatMap(key => [0, 5, 11].map(step => {
    const report = auditFractionalSyntheticCorpus([target], (source, _testCase, phase) =>
      phase === "training" ? transientFractionalAssignment(source, step, key) : source);
    return { key, step, id: target.id, rejected: report.failures.length === 1 &&
      isDeepStrictEqual(report.failures[0].mismatches, [`step_${step}_${key}`]) };
  }));
}
