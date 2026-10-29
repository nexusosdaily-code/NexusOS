import { appendFileSync, readFileSync } from "node:fs";

// Missing reports mean the suite did not finish; they are not a passing check.
const lines = [
  "## Isolated safeguards",
  "",
  "Skipped/unavailable engines are **not passed**. Linux browser fixtures do not verify physical Safari/iOS, Android, TURN or real networks.",
  "",
  "| Suite | Passed | Failed | Skipped/pending |",
  "| --- | ---: | ---: | ---: |",
];
const skippedLines = [];
let incomplete = false;
for (const suite of ["p2p", "wave-vault", "live-video"]) {
  let report;
  try {
    report = JSON.parse(readFileSync(`generated-artifacts/ci/${suite}.json`, "utf8"));
  } catch (error) {
    lines.push(`| ${suite} | — | Report unavailable | NOT VERIFIED |`);
    console.error(`${suite}: report unavailable: ${error.message}`);
    incomplete = true;
    continue;
  }
  const assertions = report.testResults.flatMap(result => result.assertionResults);
  const count = status => assertions.filter(test => test.status === status).length;
  const skipped = assertions.filter(test => !["passed", "failed"].includes(test.status));
  lines.push(`| ${suite} | ${count("passed")} | ${count("failed")} | ${skipped.length} |`);
  for (const test of skipped) {
    // Test titles are repository code, not trusted Markdown.
    skippedLines.push(`- SKIPPED/NOT VERIFIED: ${suite}: ${test.fullName.replace(/[<>&|`\\\r\n]/g, " ")}`);
  }
  if (!assertions.length || report.success !== true || count("failed")) incomplete = true;
}
const summary = [...lines, "", ...skippedLines].join("\n") + "\n";
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
if (incomplete) process.exitCode = 1;
