import assert from "node:assert/strict";
import { programs, sources, manifest, lockText, completeCases } from "./collection-complete-cases.mjs";

export async function checkCompleteWorkers(page, workerLoads) {
  let count = 0;
  const totals = { retained: 0, maximum: 0, empty: 0, malformed: 0, recovery: 0 };
  for (const program of programs) {
    const cases = completeCases(program);
    const beforeLoads = workerLoads.length;
    const evidence = await page.evaluate(async complete =>
      window.runCompleteConsumerWorker(complete), { manifest, lockText, program, cases });
    assert.equal(workerLoads.length, beforeLoads + 1, `${program}: real emitted worker load`);
    assert.equal(evidence.source, sources.get(program), `${program}: canonical disk bytes`);
    assert.deepEqual(evidence.programs, programs, "Full ordinary declaration");
    assert.deepEqual(evidence.verified.programs, programs, "Full source-locked declaration");
    assert.equal(evidence.verified.verified, true);
    assert.deepEqual(evidence.verified.dependencies, [
      { name: "wls.collections", version: "0.40.0", executionProfile: "WLS-MAP/1" },
    ]);
    assert.equal(evidence.evalBlocked, true, "Native worker CSP, not debugger evaluation");
    assert.deepEqual(evidence.limits, {
      entries: 20, keyLength: 256, valueLength: 256, sourceLength: 8192,
      instructions: 128, cycles: 1024, registers: 32, memoryBytes: 65_536,
    }, "No relaxed execution limits");
    assert.deepEqual(evidence.networkAttempts, []);
    assert.deepEqual(evidence.importAttempts, []);
    assert.equal(evidence.results.length, cases.length);
    for (const [index, test] of cases.entries()) {
      const result = evidence.results[index];
      const label = `${program}: ${test.fixture ?? test.boundary ?? "malformed"}: ${test.name}`;
      assert.equal(result.before, JSON.stringify(test.inputs), label);
      assert.equal(result.after, result.before, `${label}: immutable inputs`);
      assert.equal(result.inputsFrozen, true, `${label}: worker-side deep freeze`);
      assert.equal(result.tracesEqual, true, `${label}: ordinary/locked exact trace parity`);
      assert.equal(result.outcomes.length, 2);
      assert.deepEqual(result.outcomes[0], result.outcomes[1], `${label}: consumer outcome parity`);
      for (const outcome of result.outcomes) {
        if (test.expect.error) {
          assert.equal(typeof outcome.error, "string", `${label}: explicit rejection`);
          assert.ok(outcome.error.length > 0);
          if (test.error) assert.equal(outcome.error, test.error, label);
          assert.equal(Object.hasOwn(outcome, "value"), false, label);
          assert.equal(Object.hasOwn(outcome, "cycles"), false, label);
        } else {
          assert.equal(outcome.error, undefined, `${label}: ${outcome.error}`);
          assert.deepEqual(outcome.value, test.expect.value, label);
          assert.equal(outcome.resultFrozen, true, label);
          assert.equal(outcome.freshResult, true, label);
          assert.ok(outcome.cycles > 0 && outcome.cycles <= 1024, label);
          assert.equal(outcome.lastOp, "RETURN", label);
        }
      }
      totals[test.boundary ?? (test.fixture ? "retained" : "malformed")]++;
      count++;
    }
  }
  // Lock rejection in the native worker, including commitments unrelated to
  // the selected operation. This must fail transport, never run an unlocked VM.
  for (const index of [0, 53, 105]) {
    const corrupt = JSON.parse(lockText);
    corrupt.programs[index].sha256 = "0".repeat(64);
    const failure = await page.evaluate(async complete => {
      try { await window.runCompleteConsumerWorker(complete); return "unexpected success"; }
      catch (error) { return error.message; }
    }, { manifest, lockText: JSON.stringify(corrupt), program: programs[1], cases: [] });
    assert.match(failure, /Package integrity mismatch/);
  }
  const lifecycle = await page.evaluate(() => window.renamingWorkerLifecycle);
  assert.equal(lifecycle.created, lifecycle.terminated, "Every native worker terminated");
  assert.equal(lifecycle.deadlines, 0, "No live worker deadline");
  return { apis: programs.length, cases: count, executions: count * 2, ...totals };
}
