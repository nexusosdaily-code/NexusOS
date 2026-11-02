import assert from "node:assert/strict";

export function verifyWaveVaultBrowserReport(report) {
  assert.equal(report.success, true, "Wave Vault suite did not succeed");
  assert.equal(report.numFailedTests, 0, "Wave Vault has failed tests");
  assert.equal(report.numPendingTests, 0, "Skipped Wave Vault tests cannot satisfy release verification");
  assert.equal(report.numTodoTests, 0, "TODO tests cannot satisfy release verification");
  const assertions = report.testResults.flatMap(result => result.assertionResults);
  // GitHub's focused baseline has 23 tests; the workspace additionally carries
  // two separate unpublished fixtures. Neither may be silently exported here.
  assert.ok(assertions.length >= 23, "Incomplete Wave Vault security suite");
  assert.equal(assertions.length, report.numTotalTests, "Incomplete assertion evidence");
  assert.equal(report.numPassedTests, assertions.length, "Incomplete passing evidence");
  assert.ok(assertions.every(result => result.status === "passed"), "Every Wave Vault assertion must pass");
  const lifecycle = assertions.filter(result =>
    result.fullName.includes(": refreshes an already-open independent receiver after grant and restored-page revoke"));
  assert.equal(lifecycle.length, 3, "Expected all three independent receiver lifecycle checks");
  for (const engine of ["chromium", "firefox", "webkit"]) {
    assert.equal(lifecycle.filter(result => result.fullName.includes(`${engine}:`)).length,
      1, `Missing or duplicate ${engine} lifecycle evidence`);
  }
  return { verdict: "PASS", passed: assertions.length, skipped: 0,
    lifecycleEngines: ["chromium", "firefox", "webkit"] };
}
