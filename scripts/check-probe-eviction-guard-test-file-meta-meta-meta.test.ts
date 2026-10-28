/**
 * check-probe-eviction-guard-test-file-meta-meta-meta.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for scripts/check-probe-eviction-guard-test-file-meta-meta-meta.ts.
 *
 * Scenarios covered:
 *   1. package.json pipeline guards
 *        a. "test:all" includes "check:probe-eviction-guard-test-file-meta-meta-meta"
 *        b. "check:probe-eviction-guard-test-file-meta-meta-meta" script entry
 *           exists and invokes the correct file
 *        c. The file referenced by tsx in that script actually exists on disk
 *   2. Live file checks — both meta-meta-guard files really exist on disk right now
 *        a. scripts/check-probe-eviction-guard-test-file-meta-meta.ts
 *        b. scripts/check-probe-eviction-guard-test-file-meta-meta.test.ts
 *   3. checkProbeEvictionGuardTestFileMetaMetaMeta() unit logic (fs/promises mocked)
 *        a. Returns ok:true / missing:[] when both files are accessible
 *        b. Returns ok:false when the meta-meta-guard script is missing
 *        c. Returns ok:false when the meta-meta-guard test file is missing
 *        d. Returns ok:false when both files are missing
 *        e. The failure reason names the missing meta-meta-guard script path
 *        f. The failure reason names the missing meta-meta-guard test path
 *        g. The failure reason references the vitest glob that must cover the
 *           test file
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
  checkProbeEvictionGuardTestFileMetaMetaMeta,
  EXPECTED_META_META_GUARD_SCRIPT,
  EXPECTED_META_META_GUARD_TEST,
} from "./check-probe-eviction-guard-test-file-meta-meta-meta.js";

const mockAccess = access as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. package.json pipeline guards
// ═══════════════════════════════════════════════════════════════════════════

describe("package.json pipeline guards", () => {
  it('"test:all" script includes "check:probe-eviction-guard-test-file-meta-meta-meta"', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve("package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };

    const testAll: string = pkg.scripts?.["test:all"] ?? "";
    expect(testAll).toContain("check:probe-eviction-guard-test-file-meta-meta-meta");
  });

  it('"check:probe-eviction-guard-test-file-meta-meta-meta" script entry exists and invokes the correct file', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve("package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };

    const script: string | undefined =
      pkg.scripts?.["check:probe-eviction-guard-test-file-meta-meta-meta"];
    expect(script).toBeDefined();
    expect(script).toContain("tsx");
    expect(script).toContain("check-probe-eviction-guard-test-file-meta-meta-meta");
  });

  it("the file referenced by tsx in the check:probe-eviction-guard-test-file-meta-meta-meta script actually exists on disk", () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve("package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };

    const script: string =
      pkg.scripts?.["check:probe-eviction-guard-test-file-meta-meta-meta"] ?? "";

    // Extract the filename argument passed to tsx (the token after "tsx")
    const tokens = script.trim().split(/\s+/);
    const tsxIndex = tokens.findIndex((t) => t === "tsx");
    expect(tsxIndex).toBeGreaterThanOrEqual(0);
    const fileArg = tokens[tsxIndex + 1];
    expect(fileArg).toBeDefined();

    // The referenced file must exist on disk
    expect(() =>
      readFileSync(path.resolve(fileArg), "utf-8"),
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Live file checks
// ═══════════════════════════════════════════════════════════════════════════

describe("live file checks", () => {
  it("scripts/check-probe-eviction-guard-test-file-meta-meta.ts exists at the expected path", () => {
    expect(() =>
      readFileSync(path.resolve(EXPECTED_META_META_GUARD_SCRIPT), "utf-8"),
    ).not.toThrow();
  });

  it("scripts/check-probe-eviction-guard-test-file-meta-meta.test.ts exists at the expected path", () => {
    expect(() =>
      readFileSync(path.resolve(EXPECTED_META_META_GUARD_TEST), "utf-8"),
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. checkProbeEvictionGuardTestFileMetaMetaMeta() unit logic (fs/promises mocked)
// ═══════════════════════════════════════════════════════════════════════════

describe("checkProbeEvictionGuardTestFileMetaMetaMeta() unit logic", () => {
  it("returns ok:true and empty missing[] when both files are accessible", async () => {
    mockAccess.mockResolvedValue(undefined);

    const result = await checkProbeEvictionGuardTestFileMetaMetaMeta("/fake/root");
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.reason).toBeUndefined();
  });

  it("returns ok:false when the meta-meta-guard script is missing", async () => {
    // First call (meta-meta-guard script) rejects; second call (test file) resolves.
    mockAccess
      .mockRejectedValueOnce(new Error("ENOENT"))
      .mockResolvedValueOnce(undefined);

    const result = await checkProbeEvictionGuardTestFileMetaMetaMeta("/fake/root");
    expect(result.ok).toBe(false);
    expect(result.missing).toContain(EXPECTED_META_META_GUARD_SCRIPT);
  });

  it("returns ok:false when the meta-meta-guard test file is missing", async () => {
    // First call (meta-meta-guard script) resolves; second call (test file) rejects.
    mockAccess
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("ENOENT"));

    const result = await checkProbeEvictionGuardTestFileMetaMetaMeta("/fake/root");
    expect(result.ok).toBe(false);
    expect(result.missing).toContain(EXPECTED_META_META_GUARD_TEST);
  });

  it("returns ok:false and lists both when both files are missing", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await checkProbeEvictionGuardTestFileMetaMetaMeta("/fake/root");
    expect(result.ok).toBe(false);
    expect(result.missing).toContain(EXPECTED_META_META_GUARD_SCRIPT);
    expect(result.missing).toContain(EXPECTED_META_META_GUARD_TEST);
  });

  it("the failure reason names the expected meta-meta-guard script path", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await checkProbeEvictionGuardTestFileMetaMetaMeta("/fake/root");
    expect(result.reason).toContain(EXPECTED_META_META_GUARD_SCRIPT);
  });

  it("the failure reason names the expected meta-meta-guard test file path", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await checkProbeEvictionGuardTestFileMetaMetaMeta("/fake/root");
    expect(result.reason).toContain(EXPECTED_META_META_GUARD_TEST);
  });

  it("the failure reason references the vitest glob that must cover the test file", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await checkProbeEvictionGuardTestFileMetaMetaMeta("/fake/root");
    expect(result.reason).toMatch(/scripts\/\*\*\/\*\.test\.ts/);
  });
});
