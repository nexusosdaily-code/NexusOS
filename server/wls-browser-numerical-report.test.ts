import { beforeAll, describe, expect, it, vi } from "vitest";
import * as fractionalLearning from "../shared/wls-fractional-learning";
import { runNumericalCases, type NumericalPayload } from "../tests/browser/fractional-learning/main";
import { assertNumericalReport, assertFractionalLearningVerdict, type FractionalLearningIO,
  type NumericalReference, type NumericalReport } from "../scripts/wls-browser-numerical-report";
import { fractionalLearningReference, fractionalRateTrainingFixtures, FRACTIONAL_AND_SAMPLES, FRACTIONAL_HELD_OUT } from "../scripts/wls-fractional-learning-reference";
import { fixedPointReference } from "../scripts/wls-fixed-point-reference";

const payload: NumericalPayload = {
  fixed: [
    { operation: "multiply", left: "0.001", right: "0.500" },
    { operation: "divide", left: "1", right: "0" },
    { operation: "multiply", left: "1000", right: "2" },
  ],
  training: [
    { operation: "train", samples: FRACTIONAL_AND_SAMPLES, epochs: 3, evaluation: FRACTIONAL_HELD_OUT },
    ...["0.001", "0.500", "1.000"].flatMap(fractionalRateTrainingFixtures),
  ],
  evaluation: [{ operation: "evaluate", model: { w1: "0.001", w2: "0", bias: "0" },
    samples: [{ x1: "-0.001", x2: "0", label: 0 }] }],
};
let report: NumericalReport;
let reference: NumericalReference;
beforeAll(async () => {
  report = await runNumericalCases(payload);
  reference = { fixed: fixedPointReference(payload.fixed),
    training: fractionalLearningReference(payload.training),
    evaluation: fractionalLearningReference(payload.evaluation).map(r => r.evaluation!) };
});
describe("native numerical evidence verdict", () => {
  it("accepts matching arithmetic only with clean isolation evidence", () => {
    expect(() => assertFractionalLearningVerdict(report, reference, report,
      { violations: [], forbidden: [], arrivals: [], errors: [] })).not.toThrow();
  });
  it.each([
    { layer: "violations", value: { directive: "connect-src", blockedURI: "http://127.0.0.1/probe", disposition: "enforce" },
      message: /No CSP-blocked network or worker attempts/ },
    { layer: "violations", value: { directive: "worker-src", blockedURI: "http://127.0.0.1/worker.js", disposition: "enforce" },
      message: /No CSP-blocked network or worker attempts/ },
    { layer: "forbidden", value: "http://127.0.0.1/probe", message: /No forbidden HTTP or WebSocket attempts/ },
    { layer: "forbidden", value: "ws://127.0.0.1/probe", message: /No forbidden HTTP or WebSocket attempts/ },
    { layer: "arrivals", value: "/probe", message: /No sentinel arrivals/ },
    { layer: "errors", value: "Broken probe", message: /No uncaught browser faults/ },
  ] as const)("rejects $layer evidence even when every arithmetic result matches ($value)", ({ layer, value, message }) => {
    const io: FractionalLearningIO = { violations: [], forbidden: [], arrivals: [], errors: [] };
    if (typeof value === "string") io[layer].push(value);
    else if (typeof value !== "string") io.violations.push(value);
    expect(() => assertFractionalLearningVerdict(report, reference, report, io)).toThrow(message);
  });
  it("does not let clean isolation evidence bypass the numerical verdict", () => {
    const damaged = structuredClone(report);
    damaged.fixed.pop();
    expect(() => assertFractionalLearningVerdict(damaged, reference, report,
      { violations: [], forbidden: [], arrivals: [], errors: [] })).toThrow(/Exact Fraction fixed-point results/);
  });
  it("accepts real execution matched to independent exact arithmetic", () => {
    expect(() => assertNumericalReport(report, reference, report)).not.toThrow();
    expect(report.fixed[1].evidence.cycles).toBe(null);
    expect(report.training[0].semantic.evaluation!.mistakes).toBe(0);
    expect(report.training[0].semantic.parameterUpdates).toHaveLength(12);
    expect(report.training[0].semantic.parameterUpdates[0]).toEqual({ w1: 500, w2: 500, bias: -1000 });
    expect(report.training[0].semantic.parameterUpdates).toEqual(reference.training[0].parameterUpdates);
  });
  it.each(["fixed", "training", "evaluation"] as const)("rejects missing %s evidence", section => {
    const damaged = structuredClone(report);
    damaged[section].pop();
    expect(() => assertNumericalReport(damaged, reference, report)).toThrow();
  });
  it("rejects altered arithmetic despite otherwise matching evidence", () => {
    const damaged = structuredClone(report);
    damaged.fixed[0].semantic = { status: "ok", units: 0, value: "0.000" };
    expect(() => assertNumericalReport(damaged, reference, report)).toThrow();
  });
  it("rejects altered learned weights", () => {
    const damaged = structuredClone(report);
    damaged.training[0].semantic.model = { ...damaged.training[0].semantic.model, w1: "0.000" };
    expect(() => assertNumericalReport(damaged, reference, report)).toThrow();
  });
  it("rejects an altered intermediate update even when final weights are unchanged", () => {
    const damaged = structuredClone(report);
    damaged.training[0].semantic.parameterUpdates = damaged.training[0].semantic.parameterUpdates.map(
      (update, i) => i === 1 ? { ...update, w1: update.w1 + 1 } : update,
    );
    expect(damaged.training[0].semantic.model).toEqual(report.training[0].semantic.model);
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow(/Exact Fraction training results/);
  });
  it("rejects a transient assignment error even when the final model is unchanged", () => {
    const damaged = structuredClone(report);
    const assignments = [...damaged.training[0].semantic.parameterUpdates];
    assignments[0] = { ...assignments[0], w1: assignments[0].w1 + 1 };
    damaged.training[0].semantic.parameterUpdates = assignments;
    expect(damaged.training[0].semantic.model).toEqual(report.training[0].semantic.model);
    expect(() => assertNumericalReport(damaged, reference, report)).toThrow();
  });
  it.each((["w1", "w2", "bias"] as const).flatMap(key =>
    [0, 5, 11].map(step => ({ key, step }))))("rejects an altered $key at step $step despite final-model agreement", ({ key, step }) => {
    const damaged = structuredClone(report);
    const semantic = damaged.training[0].semantic;
    semantic.parameterUpdates = semantic.parameterUpdates.map((update, i) =>
      i === step ? { ...update, [key]: update[key] + 1 } : update);
    expect(semantic.model).toEqual(reference.training[0].model);
    expect(semantic.evaluation).toEqual(reference.training[0].evaluation);
    // Even agreeing Node/browser reports cannot override the independent oracle.
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow(/Exact Fraction training results/);
  });
  it.each(["missing", "truncated", "reversed"] as const)("rejects %s parameter assignment evidence", kind => {
    const damaged = structuredClone(report);
    const semantic = damaged.training[0].semantic;
    if (kind === "missing") Reflect.deleteProperty(semantic, "parameterUpdates");
    else if (kind === "truncated") semantic.parameterUpdates = semantic.parameterUpdates.slice(0, -1);
    else semantic.parameterUpdates = [...semantic.parameterUpdates].reverse();
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow(/Exact Fraction training results/);
  });
  it.each(["w1", "w2", "bias"] as const)("rejects altered 0.2.0 intermediate %s even if Node agrees", coordinate => {
    const damaged = structuredClone(report);
    // 0.500 complete-parameter tie case, after the retained case and 0.001 sweep.
    const row = damaged.training[1 + 41 + 39];
    const assignments = [...row.semantic.parameterUpdates];
    assignments[1] = { ...assignments[1], [coordinate]: assignments[1][coordinate] + 1 };
    row.semantic.parameterUpdates = assignments;
    expect(row.semantic.model).toEqual(report.training[1 + 41 + 39].semantic.model);
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow(/Exact Fraction training results/);
  });
  it("requires snapshots for both stalled and zero-error visits", () => {
    for (const index of [1 + 40, 1 + 26]) {
      const damaged = structuredClone(report);
      damaged.training[index].semantic.parameterUpdates = damaged.training[index].semantic.parameterUpdates.slice(0, -1);
      expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow(/Exact Fraction training results/);
    }
  });
  it("does not silently route an invalid explicit rate through the retained API", async () => {
    await expect(runNumericalCases({ fixed: [], evaluation: [], training: [
      { operation: "train", samples: FRACTIONAL_AND_SAMPLES, epochs: 1, learningRate: "0" },
    ] })).rejects.toThrow(/Learning rate/);
  });
  it("preserves the 20 retained controls and requires 40 native compile/train rate rejections", () => {
    expect(report.rejections).toEqual(Array(20).fill(true));
    expect(report.rateRejections).toEqual(Array(40).fill(true));
    expect(report.getterCalls).toBe(0);
  });
  it.each(Array.from({ length: 40 }, (_, index) => index))(
    "rejects failed configurable-rate control %i even if Node agrees", index => {
      const damaged = structuredClone(report);
      damaged.rateRejections[index] = false;
      expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow(/Configurable-rate rejection failed/);
    },
  );
  it.each(["missing", "truncated", "extra", "nonboolean", "sparse"] as const)(
    "rejects %s configurable-rate evidence even if Node agrees", kind => {
      const damaged = structuredClone(report);
      if (kind === "missing") Reflect.deleteProperty(damaged, "rateRejections");
      else if (kind === "truncated") damaged.rateRejections.pop();
      else if (kind === "extra") damaged.rateRejections.push(true);
      else if (kind === "sparse") Reflect.deleteProperty(damaged.rateRejections, "0");
      else Reflect.set(damaged.rateRejections, "0", "true");
      expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow();
    },
  );
  it("rejects accessor invocation even if all rejection flags and Node agree", () => {
    const damaged = structuredClone(report);
    damaged.getterCalls = 1;
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow();
  });
  it.each(["compileFractionalRateTraining", "trainFractionalRateClassifier"] as const)(
    "detects %s accepting invalid rates instead of rejecting them", async api => {
      const spy = vi.spyOn(fractionalLearning, api).mockImplementation(() => undefined as never);
      try {
        const damaged = await runNumericalCases({ fixed: [], training: [], evaluation: [] });
        expect(damaged.rateRejections.filter(passed => !passed)).toHaveLength(20);
        expect(() => assertNumericalReport(damaged, { fixed: [], training: [], evaluation: [] }, damaged))
          .toThrow(/Configurable-rate rejection failed/);
      } finally { spy.mockRestore(); }
    },
  );
  it("detects an actual retained-API fallback for malformed rates", async () => {
    const spy = vi.spyOn(fractionalLearning, "trainFractionalRateClassifier").mockImplementation(
      samples => fractionalLearning.trainFractionalClassifier(samples) as never,
    );
    try {
      const damaged = await runNumericalCases({ fixed: [], training: [], evaluation: [] });
      expect(damaged.rateRejections.filter(passed => !passed)).toHaveLength(20);
      expect(() => assertNumericalReport(damaged, { fixed: [], training: [], evaluation: [] }, damaged))
        .toThrow(/Configurable-rate rejection failed/);
    } finally { spy.mockRestore(); }
  });
  it("does not count unexpected faults as explicit rate rejection", async () => {
    const spy = vi.spyOn(fractionalLearning, "compileFractionalRateTraining").mockImplementation(
      () => { throw new TypeError("Broken rate control"); },
    );
    try {
      await expect(runNumericalCases({ fixed: [], training: [], evaluation: [] }))
        .rejects.toThrow("Broken rate control");
    } finally { spy.mockRestore(); }
  });
  it("detects accessor reads even when the API subsequently rejects the rate", async () => {
    const spy = vi.spyOn(fractionalLearning, "trainFractionalRateClassifier").mockImplementation(
      (_samples, rate) => {
        if (rate !== null && typeof rate === "object") {
          for (const key of ["valueOf", "toString", Symbol.toPrimitive]) Reflect.get(rate, key);
        }
        throw new fractionalLearning.FractionalLearningInputError("Rejected after reading accessor");
      },
    );
    try {
      await expect(runNumericalCases({ fixed: [], training: [], evaluation: [] }))
        .rejects.toThrow("Invalid input invoked an accessor");
    } finally { spy.mockRestore(); }
  });
  it("rejects rounded-away negative margins even when the displayed score matches", () => {
    const damaged = structuredClone(report);
    damaged.evaluation[0].semantic = { ...damaged.evaluation[0].semantic, rawMargins: [0] };
    expect(() => assertNumericalReport(damaged, reference, report)).toThrow();
  });
  it("rejects missing train-to-evaluation pipeline results", () => {
    const damaged = structuredClone(report);
    delete damaged.training[0].semantic.evaluation;
    expect(() => assertNumericalReport(damaged, reference, report)).toThrow();
  });
  it.each(["sourceSha256", "cycles"] as const)("rejects mismatching native %s", key => {
    const damaged = structuredClone(report);
    if (key === "sourceSha256") damaged.training[0].evidence.sourceSha256 = "0".repeat(64);
    else damaged.training[0].evidence.cycles!++;
    expect(() => assertNumericalReport(damaged, reference, report)).toThrow();
  });
  it("rejects over-budget evidence even if Node and browser agree", () => {
    const damaged = structuredClone(report);
    damaged.training[0].evidence.cycles = 2049;
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow();
  });
  it("rejects invented cycle measurements for throwing executions", () => {
    const damaged = structuredClone(report);
    damaged.fixed[1].evidence.cycles = 0;
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow();
  });
  it.each(["rejections", "mutations"] as const)("requires every %s control to pass", section => {
    const damaged = structuredClone(report);
    damaged[section][0] = false;
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow();
    damaged[section].pop();
    expect(() => assertNumericalReport(damaged, reference, damaged)).toThrow();
  });
});
