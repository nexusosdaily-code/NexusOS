import { execFileSync } from "node:child_process";
import type { FractionalLearningSample, FractionalLinearModel, FractionalParameterUpdate } from "../shared/wls-fractional-learning";

export type FractionalReferenceRequest =
  | { operation: "train"; samples: readonly FractionalLearningSample[]; epochs: number;
      evaluation?: readonly FractionalLearningSample[]; learningRate?: string }
  | { operation: "evaluate"; model: FractionalLinearModel; samples: readonly FractionalLearningSample[] };
export interface FractionalReferenceEvaluation {
  status: "ok" | "overflow";
  predictions?: number[]; scoreUnits?: number[]; scores?: string[]; rawMargins?: number[];
  marginScale?: number; mistakes?: number;
}
export interface FractionalReferenceResult {
  model?: FractionalLinearModel; initialMistakes?: number; finalMistakes?: number;
  mistakesByEpoch?: number[]; updates?: number; evaluation?: FractionalReferenceEvaluation;
  parameterUpdates?: FractionalParameterUpdate[];
}

/** Audit-only exact Fraction oracle. No source interpolation, secrets or runtime fallback. */
export function fractionalLearningReference(requests: readonly FractionalReferenceRequest[]): FractionalReferenceResult[] {
  const source = `
import json, sys
from fractions import Fraction
def display(units):
    sign = "-" if units < 0 else ""
    return f"{sign}{abs(units)//1000}.{abs(units)%1000:03d}"
def exact_units(value, scale):
    encoded = value * scale
    assert encoded.denominator == 1
    return encoded.numerator
def margin(model, p):
    return model[0]*Fraction(p["x1"]) + model[1]*Fraction(p["x2"]) + model[2]
def predict(model, p):
    return int(margin(model, p) >= 0)
def rounded_units(value):
    scaled = value * 1000
    result, remainder = divmod(abs(scaled.numerator), scaled.denominator)
    if 2*remainder >= scaled.denominator: result += 1
    return -result if scaled < 0 else result
def evaluate(model, samples):
    predictions = [predict(model, p) for p in samples]
    scores = [rounded_units(margin(model, p)) for p in samples]
    if any(abs(score) > 1000000 for score in scores): return dict(status="overflow")
    return dict(status="ok", predictions=predictions, scoreUnits=scores,
        scores=[display(score) for score in scores],
        rawMargins=[exact_units(margin(model,p),1000000) for p in samples],
        marginScale=1000000, mistakes=sum(pred != p["label"] for pred,p in zip(predictions,samples)))
results = []
for request in json.load(sys.stdin):
    if request["operation"] == "evaluate":
        model = [Fraction(request["model"][key]) for key in ("w1","w2","bias")]
        results.append(dict(evaluation=evaluate(model, request["samples"])))
        continue
    samples = request["samples"]
    rate = Fraction(request.get("learningRate", "1.000"))
    model = [Fraction(0), Fraction(0), Fraction(0)]
    initial = sum(predict(model,p) != p["label"] for p in samples)
    epochs, updates, parameter_updates = [], 0, []
    for epoch in range(request["epochs"]):
        mistakes = 0
        for p in samples:
            error = p["label"] - predict(model,p)
            mistakes += int(error != 0)
            for index, feature in enumerate((Fraction(p["x1"]), Fraction(p["x2"]), Fraction(1))):
                model[index] = Fraction(rounded_units(model[index] + rate * error * feature), 1000)
            parameter_updates.append({key:exact_units(value,1000) for key,value in zip(("w1","w2","bias"),model)})
        epochs.append(mistakes)
        updates += mistakes
    result = dict(model={key:display(exact_units(value,1000)) for key,value in zip(("w1","w2","bias"),model)},
        initialMistakes=initial, finalMistakes=sum(predict(model,p) != p["label"] for p in samples),
        mistakesByEpoch=epochs, updates=updates, parameterUpdates=parameter_updates)
    if "evaluation" in request: result["evaluation"] = evaluate(model, request["evaluation"])
    results.append(result)
print(json.dumps(results))
`;
  return JSON.parse(execFileSync("python3", ["-I", "-c", source], {
    input: JSON.stringify(requests), encoding: "utf8", timeout: 3000, maxBuffer: 262_144,
    env: { PATH: process.env.PATH ?? "" },
  })) as FractionalReferenceResult[];
}

export const FRACTIONAL_AND_SAMPLES: readonly FractionalLearningSample[] = Object.freeze([
  Object.freeze({ x1: "-0.500", x2: "-0.500", label: 0 as const }),
  Object.freeze({ x1: "-0.500", x2: "0.500", label: 0 as const }),
  Object.freeze({ x1: "0.500", x2: "-0.500", label: 0 as const }),
  Object.freeze({ x1: "0.500", x2: "0.500", label: 1 as const }),
]);
export const FRACTIONAL_HELD_OUT: readonly FractionalLearningSample[] = Object.freeze([
  { x1: "0.750", x2: "0.750", label: 1 as const },
  { x1: "-0.750", x2: "0.750", label: 0 as const },
  { x1: "0.750", x2: "-0.750", label: 0 as const },
  { x1: "0.250", x2: "0.250", label: 0 as const },
  { x1: "1.000", x2: "0.125", label: 1 as const },
  { x1: "-1.125", x2: "-0.375", label: 0 as const },
  { x1: "-0.001", x2: "0.001", label: 0 as const },
  { x1: "0.000", x2: "0.000", label: 0 as const },
].map(p => Object.freeze(p)));

export function fractionalTrainingFixtures(): FractionalReferenceRequest[] {
  const datasets: readonly FractionalLearningSample[][] = [
    [...FRACTIONAL_AND_SAMPLES],
    [...FRACTIONAL_AND_SAMPLES].reverse(),
    FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, label: (p.x1 !== p.x2 ? 1 : 0) as 0 | 1 })),
    FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, label: (p.x1.startsWith("-") && p.x2.startsWith("-") ? 0 : 1) as 0 | 1 })),
    FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, x1: p.x1.startsWith("-") ? "-0.001" : "0.001",
      x2: p.x2.startsWith("-") ? "-0.001" : "0.001" })),
    FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, x1: p.x1.startsWith("-") ? "-8.000" : "8.000",
      x2: p.x2.startsWith("-") ? "-8.000" : "8.000" })),
    FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, x1: p.x1.startsWith("-") ? "-0.125" : "0.375",
      x2: p.x2.startsWith("-") ? "-0.251" : "0.750" })),
    FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, label: 0 as const })),
    FRACTIONAL_AND_SAMPLES.map(p => ({ ...p, label: 1 as const })),
    [{ x1: "0", x2: "-0", label: 0 }],
    [{ x1: "0", x2: "0", label: 0 }, { x1: "0", x2: "0", label: 1 }],
    [{ x1: "-0.125", x2: "1.375", label: 0 }, { x1: "0.500", x2: "0.125", label: 1 },
      { x1: "0.001", x2: "-0.251", label: 0 }],
    Array.from({ length: 4 }, (_, i) => ({ x1: "-8.000", x2: "-8.000", label: i % 2 as 0 | 1 })),
  ];
  return datasets.flatMap(samples => [1, 2, 3].map(epochs => ({
    operation: "train" as const, samples, epochs, evaluation: FRACTIONAL_HELD_OUT,
  })));
}
/** Independent rate sweeps retain ordering, range edges and nonseparable controls. */
export function fractionalRateTrainingFixtures(learningRate: string): FractionalReferenceRequest[] {
  return [
    ...fractionalTrainingFixtures().map(request => ({ ...request, learningRate })),
    { operation: "train", learningRate, epochs: 3, samples: [
      { x1: "-0.002", x2: "0.002", label: 0 },
      { x1: "-0.001", x2: "0.001", label: 1 },
    ] },
    { operation: "train", learningRate, epochs: 3, samples: [
      { x1: "0.001", x2: "-0.001", label: 0 },
      { x1: "0.001", x2: "-0.001", label: 1 },
    ] },
  ];
}

export const FRACTIONAL_RATE_SWEEP_SEED = 0x5eed1234;
export interface FractionalRateSweepCase {
  name: string;
  seed: number;
  request: Extract<FractionalReferenceRequest, { operation: "train" }> & { learningRate: string };
}

/** Audit-only synthetic fixtures, independent of the production parser and update arithmetic.
 * Each rate has its own integer PRNG state, so a failure can be replayed in isolation.
 * Only fixture selection uses the PRNG; Python Fraction remains the numerical oracle.
 */
export function fractionalRateSweepFixtures(rateUnits: number): FractionalRateSweepCase[] {
  if (!Number.isInteger(rateUnits) || rateUnits < 1 || rateUnits > 1000) {
    throw new RangeError("Expected a supported rate unit from 1 through 1000");
  }
  const decimal = (units: number) =>
    `${units < 0 ? "-" : ""}${Math.floor(Math.abs(units) / 1000)}.${String(Math.abs(units) % 1000).padStart(3, "0")}`;
  const learningRate = decimal(rateUnits);
  const seed = (FRACTIONAL_RATE_SWEEP_SEED ^ rateUnits) >>> 0;
  let state = seed;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  // Doubling stays within ±8.000. Magnitudes >= 1 guarantee that the second
  // visit is a mistake and crosses both weight signs, even at rate 0.001.
  const a = 1000 + next() % 3001, b = 1000 + next() % 3001;
  const sample = (x1: number, x2: number, label: 0 | 1): FractionalLearningSample =>
    ({ x1: decimal(x1), x2: decimal(x2), label });
  return [-1, 1].flatMap(sign => [
    {
      name: `sign-crossing-${sign}`, seed,
      request: { operation: "train" as const, learningRate, epochs: 3, samples: [
        sample(sign * a, -sign * b, 0),
        sample(sign * 2 * a, -sign * 2 * b, 1),
      ] },
    },
    {
      name: `feature-boundary-${sign}`, seed,
      request: { operation: "train" as const, learningRate, epochs: 3, samples: [
        sample(sign * 8000, -sign * 7999, 0),
        sample(sign * 7999, -sign * 8000, 1),
        sample(sign, -sign, next() % 2 as 0 | 1),
        sample(0, 0, next() % 2 as 0 | 1),
      ] },
    },
  ]);
}

export function fractionalEvaluationFixtures(): FractionalReferenceRequest[] {
  const models: FractionalLinearModel[] = [
    { w1: "0", w2: "0", bias: "0" }, { w1: "0.001", w2: "0", bias: "0" },
    { w1: "-0.001", w2: "0.001", bias: "0" }, { w1: "1.001", w2: "-0.125", bias: "-0.001" },
    { w1: "1.500", w2: "0.500", bias: "-1" }, { w1: "128", w2: "128", bias: "128" },
    { w1: "-128", w2: "-128", bias: "-128" }, { w1: "0", w2: "0", bias: "-0" },
  ];
  const samples: FractionalLearningSample[] = [
    { x1: "-0.001", x2: "0", label: 0 }, { x1: "0", x2: "0", label: 1 },
    { x1: "0.001", x2: "0", label: 1 }, { x1: "0.500", x2: "0", label: 1 },
    { x1: "-0.500", x2: "0", label: 0 }, { x1: "8", x2: "8", label: 1 },
    { x1: "-8", x2: "-8", label: 0 }, { x1: "-0.000", x2: "0.000", label: 1 },
  ];
  return models.map(model => ({ operation: "evaluate" as const, model, samples }));
}
export function fractionalEvaluationGrid(): FractionalLearningSample[] {
  const axis = ["-2.000", "-1.750", "-1.500", "-1.250", "-1.000", "-0.750", "-0.500", "-0.250",
    "0.000", "0.250", "0.500", "0.750", "1.000", "1.250", "1.500", "1.750", "2.000"];
  return axis.flatMap((x1, i) => axis.map((x2, j) => ({
    x1, x2, label: (3 * (i - 8) + (j - 8) >= 8 ? 1 : 0) as 0 | 1,
  })));
}
