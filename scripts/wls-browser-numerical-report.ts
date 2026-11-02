import assert from "node:assert/strict";
import type { runNumericalCases } from "../tests/browser/fractional-learning/main";
import type { FixedPointReference } from "./wls-fixed-point-reference";
import type { FractionalReferenceEvaluation, FractionalReferenceResult } from "./wls-fractional-learning-reference";

export type NumericalReport = Awaited<ReturnType<typeof runNumericalCases>>;
export interface NumericalReference {
  fixed: FixedPointReference[];
  training: FractionalReferenceResult[];
  evaluation: FractionalReferenceEvaluation[];
}
export interface FractionalLearningIO {
  violations: { directive: string; blockedURI: string; disposition: string }[];
  forbidden: string[];
  arrivals: string[];
  errors: string[];
}

/** Both quiet runs and native injected faults must pass this exact verdict. */
export function assertFractionalLearningVerdict(
  actual: NumericalReport, expected: NumericalReference, node: NumericalReport, io: FractionalLearningIO,
) {
  assertNumericalReport(actual, expected, node);
  assert.deepEqual(io.errors, [], "No uncaught browser faults");
  assert.deepEqual(io.violations, [], "No CSP-blocked network or worker attempts");
  assert.deepEqual(io.forbidden, [], "No forbidden HTTP or WebSocket attempts");
  assert.deepEqual(io.arrivals, [], "No sentinel arrivals");
}

/** Real runner verdict, also exercised against deliberately damaged evidence. */
export function assertNumericalReport(actual: NumericalReport, expected: NumericalReference, node: NumericalReport) {
  assert.deepEqual(actual.fixed.map(r => r.semantic), expected.fixed, "Exact Fraction fixed-point results");
  assert.deepEqual(actual.training.map(r => r.semantic), expected.training, "Exact Fraction training results");
  assert.deepEqual(actual.evaluation.map(r => r.semantic), expected.evaluation, "Exact Fraction evaluation results");
  assert.equal(actual.rejections.length, 20);
  assert.ok(actual.rejections.every(passed => passed === true), "Input rejection failed");
  assert.equal(actual.rateRejections.length, 40, "Every configurable-rate rejection required");
  assert.deepEqual(actual.rateRejections, Array(40).fill(true), "Configurable-rate rejection failed");
  assert.equal(actual.getterCalls, 0);
  assert.equal(actual.mutations.length, 4);
  assert.ok(actual.mutations.every(passed => passed === true), "A valid incorrect-program mutation escaped detection");
  assert.equal(actual.cycleLimit, 2048, "VM budget changed");
  for (const row of [...actual.fixed, ...actual.training, ...actual.evaluation]) {
    assert.match(row.evidence.sourceSha256, /^[0-9a-f]{64}$/);
    if ("status" in row.semantic && row.semantic.status === "division-by-zero") assert.equal(row.evidence.cycles, null);
    else assert.ok(typeof row.evidence.cycles === "number" && row.evidence.cycles >= 0 && row.evidence.cycles <= 2048);
    assert.ok(row.evidence.instructions > 0 && row.evidence.instructions <= 2048);
    assert.ok(row.evidence.characters > 0 && row.evidence.characters <= 65_536);
  }
  for (const row of actual.training) if (row.evaluationEvidence) {
    assert.match(row.evaluationEvidence.sourceSha256, /^[0-9a-f]{64}$/);
    assert.ok(typeof row.evaluationEvidence.cycles === "number" &&
      row.evaluationEvidence.cycles > 0 && row.evaluationEvidence.cycles <= 2048);
    assert.ok(row.evaluationEvidence.instructions > 0 && row.evaluationEvidence.instructions <= 2048);
    assert.ok(row.evaluationEvidence.characters > 0 && row.evaluationEvidence.characters <= 65_536);
  }
  assert.deepEqual(actual, node, "Browser/Node source digests, traces, budgets and semantic results");
}
