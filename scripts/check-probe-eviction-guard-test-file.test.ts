/**
 * check-probe-eviction-guard-test-file.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for scripts/check-probe-eviction-guard-test-file.ts.
 *
 * Scenarios covered:
 *   1. package.json pipeline guards
 *        a. "test:all" includes "check:probe-eviction-guard-test-file"
 *        b. "check:probe-eviction-guard-test-file" script entry exists and
 *           invokes the correct file
 *   2. Live file check — scripts/check-probe-eviction-guard.test.ts really
 *      exists on disk right now
 *   3. checkProbeEvictionGuardTestFile() unit logic (fs/promises mocked)
 *        a. Returns ok:true when the file exists
 *        b. Returns ok:false with a clear reason when the file is missing
 *        c. The reason message names the expected path
 *        d. The reason message names the vitest glob that must cover it
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ── mock fs/promises BEFORE importing the module under test ──────────────────
vi.mock("fs/promises", () => ({
  access: vi.fn(),
}));

import { access } from "fs/promises";
import {
  checkProbeEvictionGuardTestFile,
  EXPECTED_TEST_FILE,
} from "./check-probe-eviction-guard-test-file.js";

const mockAccess = access as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. package.json pipeline guards
// ═══════════════════════════════════════════════════════════════════════════

describe("package.json pipeline guards", () => {
  it('"test:all" script includes "check:probe-eviction-guard-test-file"', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve("package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };

    const testAll: string = pkg.scripts?.["test:all"] ?? "";
    expect(testAll).toContain("check:probe-eviction-guard-test-file");
  });

  it('"check:probe-eviction-guard-test-file" script entry exists and invokes the correct file', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve("package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };

    const script: string | undefined =
      pkg.scripts?.["check:probe-eviction-guard-test-file"];
    expect(script).toBeDefined();
    expect(script).toContain("tsx");
    expect(script).toContain("check-probe-eviction-guard-test-file");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Live file check
// ═══════════════════════════════════════════════════════════════════════════

describe("live file check", () => {
  it("scripts/check-probe-eviction-guard.test.ts exists at the expected path", () => {
    // Read directly via fs.readFileSync — bypasses the vi.mock above which
    // only affects fs/promises.  A missing file throws and the test fails with
    // a clear Node error naming the absent path.
    expect(() =>
      readFileSync(path.resolve(EXPECTED_TEST_FILE), "utf-8"),
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. checkProbeEvictionGuardTestFile() unit logic (fs/promises mocked)
// ═══════════════════════════════════════════════════════════════════════════

describe("checkProbeEvictionGuardTestFile() unit logic", () => {
  it("returns ok:true when the test file is accessible", async () => {
    mockAccess.mockResolvedValue(undefined);

    const result = await checkProbeEvictionGuardTestFile("/fake/root");
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns ok:false when the test file is missing", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT: no such file or directory"));

    const result = await checkProbeEvictionGuardTestFile("/fake/root");
    expect(result.ok).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("the failure reason names the expected file path", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT: no such file or directory"));

    const result = await checkProbeEvictionGuardTestFile("/fake/root");
    expect(result.reason).toContain(EXPECTED_TEST_FILE);
  });

  it("the failure reason references the vitest glob that must cover the file", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT: no such file or directory"));

    const result = await checkProbeEvictionGuardTestFile("/fake/root");
    // The reason should remind the developer to keep the file under the glob.
    expect(result.reason).toMatch(/scripts\/\*\*\/\*\.test\.ts/);
  });
});
