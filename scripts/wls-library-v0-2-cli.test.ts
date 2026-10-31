import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("checks, locks, verifies and tests the shipped new-release fixtures in real CLI processes", () => {
  const root = mkdtempSync(join(tmpdir(), "wls-release-"));
  try {
    const manifest = join(process.cwd(), "scripts/fixtures/wls-collection-package-v0-2.json");
    const suite = join(process.cwd(), "scripts/fixtures/wls-library-v0-2-smoke.json");
    const lock = join(root, "package.lock.json");
    const invoke = (...args: string[]) => {
      const result = spawnSync(process.execPath, [
        "--import", "tsx", "scripts/wls-collections-cli.ts", ...args,
      ], { cwd: process.cwd(), encoding: "utf8", timeout: 10_000, maxBuffer: 256_000 });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe("");
      return JSON.parse(result.stdout);
    };
    const checked = invoke("package-check", manifest);
    expect(checked.dependencies[0].version).toBe("0.2.0");
    const created = invoke("package-lock", manifest);
    writeFileSync(lock, JSON.stringify(created));
    expect(invoke("package-verify", manifest, lock).verified).toBe(true);
    const report = invoke("package-test-locked", manifest, lock, suite);
    expect(report.passed).toBe(6);
    expect(report.failed).toBe(0);
    expect(readFileSync(lock, "utf8")).toBe(JSON.stringify(created));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 30_000);
