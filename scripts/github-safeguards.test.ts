import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
// @ts-expect-error Standalone Node CI utility has no declaration file.
import { publicRegistryLock } from "./prepare-public-ci-lock.mjs";

const workflow = readFileSync(".github/workflows/p2p-wave-vault.yml", "utf8");
const script = resolve("scripts/summarize-safeguards.mjs");

describe("pull-request safeguard boundaries", () => {
  it("uses unprivileged PRs, bounded jobs and a read-only checkout without secrets", () => {
    expect(workflow).toContain("  pull_request:");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow.match(/persist-credentials: false/g)).toHaveLength(2);
    expect(workflow.match(/timeout-minutes: \d+/g)).toHaveLength(2);
    expect(workflow).toContain("cancel-in-progress: true");
    expect(workflow).toContain('WNSP_PUBLISH_BUILD: "1"');
    expect(workflow).toContain("127.0.0.1:1/forbidden");
    expect(workflow).not.toMatch(/secrets\.|id-token:|npm run (?:start|dev|db:push)/);
  });

  it("runs the heavy build only once and installs the isolated fixture prerequisites", () => {
    expect(workflow.match(/run: npm run build\n/g)).toHaveLength(1);
    expect(workflow).toContain("run: npm run check:types");
    expect(workflow).not.toMatch(/run:.*(?:test:all|test:client|check:release-wave-vault)/);
    for (const config of ["p2p-security", "wave-vault-security"]) {
      expect(workflow).toContain(`--config vitest.${config}.config.ts`);
    }
    expect(workflow).toContain("run: npm run test:browser-live-video");
    expect(workflow).toContain("postgresql-16");
    expect(workflow).toContain("/usr/lib/postgresql/16/bin");
    expect(workflow).toContain("install --with-deps chromium firefox webkit");
    expect(workflow).toContain("WNSP_TEST_CHROMIUM_PATH");
    expect(workflow).toContain("if: ${{ always() }}");
    expect(workflow.match(/run: node scripts\/prepare-public-ci-lock\.mjs/g)).toHaveLength(2);
  });
});

describe("public runner registry portability", () => {
  it("changes only known proxy prefixes, preserving all locked package metadata", () => {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    const converted = publicRegistryLock(lock);
    expect(converted).not.toBe(lock);
    for (const [key, value] of Object.entries(converted.packages) as [string, any][]) {
      const original = lock.packages[key];
      expect({ ...value, resolved: original.resolved }).toEqual(original);
      if (value.resolved) expect(new URL(value.resolved).origin).toBe("https://registry.npmjs.org");
    }
    expect(publicRegistryLock(converted)).toEqual(converted);
    expect(Object.keys(converted)).toEqual(Object.keys(lock));
  });

  it("refuses unknown hosts, credentials, unexpected paths and missing integrity", () => {
    for (const resolved of [
      "https://evil.invalid/npm/pkg/-/pkg-1.0.0.tgz",
      "http://package-firewall.replit.local/unexpected/pkg.tgz",
      "http://secret@package-firewall.replit.local/npm/pkg.tgz",
      "http://package-firewall.replit.local/npm/pkg.tgz?token=secret",
    ]) {
      expect(() => publicRegistryLock({ lockfileVersion: 3, packages: {
        pkg: { version: "1.0.0", integrity: "sha512-fixture", resolved },
      } })).toThrow();
    }
    expect(() => publicRegistryLock({ lockfileVersion: 3, packages: {
      pkg: { version: "1.0.0", resolved: "http://package-firewall.replit.local/npm/pkg.tgz" },
    } })).toThrow();
  });
});

describe("safeguard results summary", () => {
  function run(reports: Record<string, unknown>) {
    const cwd = mkdtempSync(join(tmpdir(), "safeguard-summary-"));
    try {
      mkdirSync(join(cwd, "generated-artifacts/ci"), { recursive: true });
      for (const [suite, report] of Object.entries(reports)) {
        writeFileSync(join(cwd, `generated-artifacts/ci/${suite}.json`), JSON.stringify(report));
      }
      const summaryPath = join(cwd, "summary.md");
      const result = spawnSync(process.execPath, [script], {
        cwd, encoding: "utf8",
        env: { GITHUB_STEP_SUMMARY: summaryPath },
      });
      return { ...result, summary: readFileSync(summaryPath, "utf8") };
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }
  const report = (statuses: string[], success = true) => ({
    success, testResults: [{ assertionResults: statuses.map(status => ({
      status, fullName: `${status} engine <test>`,
    })) }],
  });

  it("reports unavailable engines as skipped, not passed", () => {
    const good = report(["passed"]);
    const result = run({ p2p: good, "wave-vault": report(["passed", "pending", "skipped"]), "live-video": good });
    expect(result.status).toBe(0);
    expect(result.summary).toContain("| wave-vault | 1 | 0 | 2 |");
    expect(result.summary).toContain("SKIPPED/NOT VERIFIED: wave-vault:");
    expect(result.summary).not.toContain("<test>");
  });

  it("fails when a fixture report is absent rather than silently passing", () => {
    const result = run({ p2p: report(["passed"]) });
    expect(result.status).toBe(1);
    expect(result.summary).toContain("| wave-vault | — | Report unavailable | NOT VERIFIED |");
  });

  it("fails for test failures, suite-level failures, and empty reports", () => {
    const good = report(["passed"]);
    for (const bad of [report(["failed"], false), report(["passed"], false), report([])]) {
      expect(run({ p2p: bad, "wave-vault": good, "live-video": good }).status).toBe(1);
    }
  });
});
