import { describe, expect, it } from "vitest";
import { verifyWaveVaultBrowserReport } from "./verify-wave-vault-browser-report.mjs";

function passing() {
  const assertionResults = [
    ...["chromium", "firefox", "webkit"].map(engine => ({
      fullName: `${engine}: refreshes an already-open independent receiver after grant and restored-page revoke`,
      status: "passed",
    })),
    ...Array.from({ length: 22 }, (_, i) => ({ fullName: `security assertion ${i}`, status: "passed" })),
  ];
  return { success: true, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0,
    numTotalTests: 25, numPassedTests: 25, testResults: [{ assertionResults }] };
}
describe("strict Wave Vault native browser evidence", () => {
  it("requires a complete, zero-skip three-browser run", () => {
    expect(verifyWaveVaultBrowserReport(passing())).toMatchObject({ verdict: "PASS", skipped: 0, passed: 25 });
  });
  it("accepts the complete focused GitHub baseline without unrelated workspace fixtures", () => {
    const report = passing();
    report.testResults[0].assertionResults.splice(-2);
    report.numTotalTests = report.numPassedTests = 23;
    expect(verifyWaveVaultBrowserReport(report)).toMatchObject({ verdict: "PASS", passed: 23, skipped: 0 });
  });
  it.each(["skipped", "failed", "pending", "todo"])("rejects a %s engine even with stale passing totals", status => {
    const report = passing();
    report.testResults[0].assertionResults[1].status = status;
    expect(() => verifyWaveVaultBrowserReport(report)).toThrow();
  });
  it("rejects filtered runs with skipped security tests", () => {
    expect(() => verifyWaveVaultBrowserReport({ ...passing(), numPendingTests: 22 })).toThrow();
  });
  it("rejects a missing or duplicated browser", () => {
    const report = passing();
    report.testResults[0].assertionResults[1].fullName =
      report.testResults[0].assertionResults[0].fullName;
    expect(() => verifyWaveVaultBrowserReport(report)).toThrow();
  });
  it("rejects incomplete evidence despite a successful process result", () => {
    const report = passing();
    report.testResults[0].assertionResults.pop();
    expect(() => verifyWaveVaultBrowserReport(report)).toThrow();
  });
});
