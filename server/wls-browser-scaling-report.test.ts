import { beforeAll, describe, expect, it } from "vitest";
import { runScalingCases } from "../tests/browser/feature-scaling/main";
import { createScalingBrowserAudit } from "../scripts/wls-feature-scaling-browser-fixtures";
import { assertScalingReport, assertScalingIsolation, type ScalingReport, type ScalingReference } from "../scripts/wls-browser-scaling-report";

let baseline: ScalingReport, expected: ScalingReference;
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
beforeAll(async () => {
  const prepared = createScalingBrowserAudit();
  expected = prepared.expected; baseline = await runScalingCases(prepared.payload);
});
describe("preprocessing browser verdict fails closed", () => {
  it("accepts the complete independently verified report", () => {
    expect(() => assertScalingReport(baseline, expected, baseline)).not.toThrow();
  });
  const faults: [string, (r: Mutable<ScalingReport>) => void][] = [
    ["missing scaling case", r => { r.scaling.pop(); }],
    ["wrong fitted scale", r => { r.scaling[0].semantic.model.maxAbsX1 = "0.000"; }],
    ["wrong normalized measurement", r => { r.scaling[0].semantic.samples[0].x1 = "0.000"; }],
    ["missing pipeline", r => { r.pipelines.pop(); }],
    ["wrong intermediate parameter", r => { r.pipelines[0].semantic.parameterUpdates[0].w1++; }],
    ["wrong held-out prediction", r => { r.pipelines[0].semantic.evaluation.predictions[0] = 1; }],
    ["refitted held-out scale", r => { r.pipelines[0].transformed.model.maxAbsX1 = "750.000"; }],
    ["changed fitted state", r => { r.pipelines[0].unchanged = false; }],
    ["mutable fitted state", r => { r.scaling[0].frozen = false; }],
    ["missing WLS call", r => { r.scaling[0].calls = []; }],
    ["failed rejection", r => { r.rejections[0] = false; }],
    ["missing rejection", r => { r.rejections.pop(); }],
    ["accessor invoked", r => { r.getterCalls = 1; }],
    ["escaped numerical mutation", r => { r.mutations[0].detected = false; }],
    ["missing mutation", r => { r.mutations.pop(); }],
    ["changed native source", r => { r.scaling[0].evidence.sourceSha256 = "a".repeat(64); }],
    ["over-budget cycles", r => { r.scaling[0].evidence.cycles = 2049; }],
    ["missing stage evidence", r => { r.pipelines[0].evidence.pop(); }],
    ["zero instructions", r => { r.pipelines[0].evidence[0].instructions = 0; }],
    ["oversized source", r => { r.pipelines[0].evidence[0].characters = 65_537; }],
    ["changed VM budget", r => { r.cycleLimit = 4096; }],
    ["state leak on repeat", r => { r.repeat.semantic.model.maxAbsX1 = "0.000"; }],
  ];
  it.each(faults)("rejects %s", (_, damage) => {
    const modified = structuredClone(baseline) as Mutable<ScalingReport>;
    damage(modified);
    expect(() => assertScalingReport(modified, expected, baseline)).toThrow();
  });
  it("cannot make a damaged result pass by also damaging the Node baseline", () => {
    const modified = structuredClone(baseline) as Mutable<ScalingReport>;
    modified.scaling[0].semantic.samples[0].x1 = "0.000";
    expect(() => assertScalingReport(modified, expected, modified)).toThrow();
  });
  it.each([
    [["http://forbidden.test"], [], []],
    [[], ["/scaler-probe"], []],
    [[], [], ["native page fault"]],
  ])("rejects traffic or native faults %#", (attempts, arrivals, errors) => {
    expect(() => assertScalingIsolation(attempts, arrivals, errors)).toThrow();
  });
});
