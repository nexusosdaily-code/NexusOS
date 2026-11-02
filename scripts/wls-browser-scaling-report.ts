import assert from "node:assert/strict";
import type { runScalingCases } from "../tests/browser/feature-scaling/main";
import type { featureScalingReference } from "./wls-feature-scaling-reference";
import type { fractionalLearningReference } from "./wls-fractional-learning-reference";
export type ScalingReport = Awaited<ReturnType<typeof runScalingCases>>;
export interface ScalingReference {
  scaling: ReturnType<typeof featureScalingReference>;
  fitted: ReturnType<typeof featureScalingReference>;
  transformed: ReturnType<typeof featureScalingReference>;
  pipelines: ReturnType<typeof fractionalLearningReference>;
}
export function assertScalingIsolation(forbidden: string[], arrivals: string[], errors: string[]) {
  assert.deepEqual(forbidden, [], "Forbidden native browser requests");
  assert.deepEqual(arrivals, [], "Unexpected loopback arrivals");
  assert.deepEqual(errors, [], "Native page faults");
}
export function assertScalingReport(actual: ScalingReport, expected: ScalingReference, node: ScalingReport) {
  assert.equal(actual.scaling.length, 134);
  assert.equal(actual.pipelines.length, 47);
  assert.deepEqual(actual.scaling.map(r => r.semantic), expected.scaling, "Independent scaling arithmetic");
  assert.deepEqual(actual.pipelines.map(r => r.fitted), expected.fitted, "Training-only fitted scales");
  assert.deepEqual(actual.pipelines.map(r => r.transformed), expected.transformed, "Reference held-out transformation");
  assert.deepEqual(actual.pipelines.map(r => r.semantic), expected.pipelines, "Independent full learning trajectories");
  assert.deepEqual(actual.rejections, Array(30).fill(true));
  assert.equal(actual.cycleLimit, 2048, "Unchanged native VM budget");
  assert.deepEqual(actual.repeat, actual.scaling[0], "No fit state leaked between runs");
  assert.equal(actual.getterCalls, 0);
  assert.equal(actual.mutations.length, 3);
  assert.ok(actual.mutations.every(m => m.detected && m.original !== m.changed), "Valid wrong-program sensitivity");
  assert.ok(actual.scaling.every(r => r.frozen && r.calls.includes("fixedRound") && r.calls.includes("scalingValue")));
  assert.ok(actual.pipelines.every(r => r.unchanged));
  const evidence = [...actual.scaling.map(r => r.evidence), ...actual.pipelines.flatMap(r => r.evidence),
    ...actual.mutations.map(r => r.evidence), actual.repeat.evidence];
  assert.equal(evidence.length, 326);
  for (const row of evidence) {
    assert.match(row.sourceSha256, /^[0-9a-f]{64}$/);
    assert.ok(row.cycles > 0 && row.cycles <= 2048);
    assert.ok(row.instructions > 0 && row.instructions <= 2048);
    assert.ok(row.characters > 0 && row.characters <= 65_536);
  }
  assert.deepEqual(actual, node, "Node/native source hashes, calls, budgets and exact results");
}
