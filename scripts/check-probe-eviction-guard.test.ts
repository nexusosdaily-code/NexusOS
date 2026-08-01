/**
 * check-probe-eviction-guard.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for scripts/check-probe-eviction-guard.ts.
 *
 * Scenarios covered:
 *   1. package.json pipeline guards
 *        a. "test:all" script includes "check:probe-eviction-guard"
 *        b. "check:probe-eviction-guard" script entry exists and invokes
 *           the correct file
 *   2. Live file check — the real server/traffic-logger.ts currently contains
 *      the inclusive "<= cutoff" guard and does NOT contain the relaxed form
 *   3. checkProbeEvictionGuard() unit logic (fs mocked)
 *        a. Returns ok:true for the while-loop form (hits[lo] <= cutoff)
 *        b. Returns ok:true for the array-filter form (filter(t => t > cutoff))
 *        c. Returns ok:false (missing) for source without any recognised form
 *        d. Returns ok:false (relaxed) for while-loop using strictly-less-than
 *        e. Returns ok:false (relaxed) for filter using >= cutoff
 *        f. Required pattern + forbidden pattern together → ok:false (forbidden wins)
 *        g. Returns ok:false with a reason when the file cannot be read
 *        h. REQUIRED_PATTERN matches while-loop form but not its relaxed form
 *        i. REQUIRED_PATTERN matches filter form but not its relaxed form
 *        j. FORBIDDEN_PATTERN matches while-loop relaxed form but not correct form
 *        k. FORBIDDEN_PATTERN matches filter relaxed form but not correct form
 *        l. FORBIDDEN_PATTERN on a comment line containing the relaxed form (documented behaviour)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// ── mock fs/promises BEFORE importing the module under test ──────────────────
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "fs/promises";
import {
  checkProbeEvictionGuard,
  REQUIRED_PATTERN,
  FORBIDDEN_PATTERN,
  TARGET_FILE,
} from "./check-probe-eviction-guard.js";

const mockReadFile = readFile as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. package.json pipeline guards
// ═══════════════════════════════════════════════════════════════════════════

describe("package.json pipeline guards", () => {
  it('"test:all" script includes "check:probe-eviction-guard"', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve("package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };

    const testAll: string = pkg.scripts?.["test:all"] ?? "";
    expect(testAll).toContain("check:probe-eviction-guard");
  });

  it('"check:probe-eviction-guard" script entry exists and invokes the correct file', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve("package.json"), "utf-8"),
    ) as { scripts?: Record<string, string> };

    const script: string | undefined = pkg.scripts?.["check:probe-eviction-guard"];
    expect(script).toBeDefined();
    expect(script).toContain("tsx");
    expect(script).toContain("check-probe-eviction-guard");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Live file check
// ═══════════════════════════════════════════════════════════════════════════

describe("live server/traffic-logger.ts check", () => {
  it("the real file contains the inclusive <= cutoff guard and passes the check", async () => {
    // Bypass the vi.mock by reading the real file synchronously and testing
    // the patterns directly — no fs/promises mock involved.
    const source = readFileSync(TARGET_FILE, "utf-8");
    expect(REQUIRED_PATTERN.test(source)).toBe(true);
    expect(FORBIDDEN_PATTERN.test(source)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. TARGET_FILE tracks the eviction logic location
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recursively collect all *.ts files under `dir`.
 */
function walkTs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

describe("TARGET_FILE tracks the eviction logic location", () => {
  it(
    "REQUIRED_PATTERN is found in TARGET_FILE; if it moved, this test tells you where",
    () => {
      const serverDir = path.resolve("server");
      const allServerFiles = walkTs(serverDir);

      // Collect every server/*.ts file that contains the eviction pattern.
      const filesWithPattern = allServerFiles.filter((f) => {
        try {
          return REQUIRED_PATTERN.test(readFileSync(f, "utf-8"));
        } catch {
          return false;
        }
      });

      // The pattern must exist somewhere — if it's gone entirely that's a
      // different (already-covered) failure, but we still want a clear message.
      expect(
        filesWithPattern.length,
        `Eviction guard "entry.hits[lo] <= cutoff" was not found in any ` +
          `server/**/*.ts file.\n` +
          `Either the guard was deleted or its variable names were changed.\n` +
          `Check server/traffic-logger.ts and update REQUIRED_PATTERN in ` +
          `scripts/check-probe-eviction-guard.ts if the names changed.`,
      ).toBeGreaterThan(0);

      // The pattern must live in TARGET_FILE specifically.  If it has moved
      // to a different file this assertion fires with the exact new location
      // so the developer knows exactly what to update.
      const relativeMatches = filesWithPattern.map((f) =>
        path.relative(process.cwd(), f),
      );
      const inTargetFile = filesWithPattern.includes(TARGET_FILE);
      expect(
        inTargetFile,
        `Eviction guard "entry.hits[lo] <= cutoff" was NOT found in ` +
          `TARGET_FILE (${path.relative(process.cwd(), TARGET_FILE)}).\n` +
          `It was found in: ${relativeMatches.join(", ")}.\n` +
          `The eviction loop was likely extracted to a different module.\n` +
          `→ Update TARGET_FILE in scripts/check-probe-eviction-guard.ts ` +
          `to point to the new location (e.g. "${relativeMatches[0]}").`,
      ).toBe(true);
    },
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Script / scan agreement smoke-test
//      Confirms checkProbeEvictionGuard(TARGET_FILE) and the walkTs scan
//      both locate the eviction pattern in the same file.  If the loop is
//      extracted to a subdirectory this test fires before the script does,
//      and the error message names the exact file to update TARGET_FILE to.
// ═══════════════════════════════════════════════════════════════════════════

describe("script/scan agreement smoke-test", () => {
  it(
    "checkProbeEvictionGuard(TARGET_FILE) returns ok:true iff walkTs also finds the pattern in TARGET_FILE",
    async () => {
      const serverDir = path.resolve("server");
      const allServerFiles = walkTs(serverDir);

      // ── 1. Recursive scan: find every server/**/*.ts that has the guard ──
      const filesWithPattern = allServerFiles.filter((f) => {
        try {
          return REQUIRED_PATTERN.test(readFileSync(f, "utf-8"));
        } catch {
          return false;
        }
      });

      const relativeMatches = filesWithPattern.map((f) =>
        path.relative(process.cwd(), f),
      );

      // ── 2. Feed real file content into the mock so the script reads live ──
      const realContent = (() => {
        try {
          return readFileSync(TARGET_FILE, "utf-8");
        } catch {
          return null;
        }
      })();

      mockReadFile.mockImplementation(async () => {
        if (realContent === null) throw new Error("ENOENT: no such file");
        return realContent;
      });

      const scriptResult = await checkProbeEvictionGuard(TARGET_FILE);

      // Build a shared hint used in both assertions.
      const inTargetFile = filesWithPattern.includes(TARGET_FILE);
      const locationHint =
        !inTargetFile && filesWithPattern.length > 0
          ? `\nThe guard was found in: ${relativeMatches.join(", ")}.\n` +
            `→ Update TARGET_FILE in scripts/check-probe-eviction-guard.ts ` +
            `to point to "${relativeMatches[0]}".`
          : "";

      // ── 3. Script must pass when pointed at TARGET_FILE ──
      expect(
        scriptResult.ok,
        `checkProbeEvictionGuard(TARGET_FILE) returned ok:false.\n` +
          (scriptResult.reason ?? "") +
          locationHint,
      ).toBe(true);

      // ── 4. walkTs must confirm the pattern lives in TARGET_FILE ──
      expect(
        inTargetFile,
        `walkTs found the eviction guard but NOT in ` +
          `TARGET_FILE (${path.relative(process.cwd(), TARGET_FILE)}).` +
          locationHint +
          `\ncheckProbeEvictionGuard() will silently return ok:false once ` +
          `TARGET_FILE no longer holds the logic.`,
      ).toBe(true);
    },
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. checkProbeEvictionGuard() unit logic (fs mocked)
// ═══════════════════════════════════════════════════════════════════════════

describe("checkProbeEvictionGuard() unit logic", () => {
  // ── 3a. While-loop form (current implementation) ────────────────────────
  it("returns ok:true when source contains the while-loop form (hits[lo] <= cutoff)", async () => {
    mockReadFile.mockResolvedValue(
      `while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 3b. Array-filter form ────────────────────────────────────────────────
  it("returns ok:true when source uses the array-filter form (filter(t => t > cutoff))", async () => {
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter(t => t > cutoff);\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 3c. No recognised form ───────────────────────────────────────────────
  it("returns ok:false with a 'not found' reason when no recognised eviction expression is present", async () => {
    mockReadFile.mockResolvedValue(
      `// eviction loop removed\nwhile (lo < entry.hits.length) lo++;\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no correct eviction guard found/i);
  });

  // ── 3d. While-loop relaxed: < instead of <= ──────────────────────────────
  it("returns ok:false with a 'relaxed' reason when the while-loop uses strictly-less-than", async () => {
    // Simulate the regression: <= changed to <
    mockReadFile.mockResolvedValue(
      `while (lo < entry.hits.length && entry.hits[lo] < cutoff) lo++;\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });

  // ── 3e. Array-filter relaxed: >= instead of > ────────────────────────────
  it("returns ok:false with a 'relaxed' reason when the filter uses >= cutoff", async () => {
    // Simulate the regression: filter(t => t > cutoff) changed to filter(t => t >= cutoff)
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter(t => t >= cutoff);\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });

  // ── 3f. Required + forbidden both present → forbidden wins ───────────────
  it("returns ok:false when both required and forbidden patterns are present (forbidden wins)", async () => {
    // Both forms present — the forbidden form must still be caught.
    mockReadFile.mockResolvedValue(
      [
        `while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;`,
        `// old: while (lo < entry.hits.length && entry.hits[lo] < cutoff) lo++;`,
        // A non-comment line with the relaxed form:
        `if (entry.hits[lo] < cutoff) { /* stale branch */ }`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });

  // ── 3g. Unreadable file ──────────────────────────────────────────────────
  it("returns ok:false with a reason when the file cannot be read", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Cannot read file/i);
  });

  // ── 3h. REQUIRED_PATTERN — while-loop form ───────────────────────────────
  it("REQUIRED_PATTERN matches the while-loop inclusive form but not its relaxed form", () => {
    expect(REQUIRED_PATTERN.test("entry.hits[lo] <= cutoff")).toBe(true);
    expect(REQUIRED_PATTERN.test("entry.hits[lo] < cutoff")).toBe(false);
  });

  // ── 3i. REQUIRED_PATTERN — array-filter form ─────────────────────────────
  it("REQUIRED_PATTERN matches the array-filter correct form but not its relaxed form", () => {
    expect(REQUIRED_PATTERN.test("entry.hits.filter(t => t > cutoff)")).toBe(true);
    expect(REQUIRED_PATTERN.test("entry.hits.filter(t => t >= cutoff)")).toBe(false);
  });

  // ── 3j. FORBIDDEN_PATTERN — while-loop ──────────────────────────────────
  it("FORBIDDEN_PATTERN matches the while-loop relaxed form but not the inclusive form", () => {
    expect(FORBIDDEN_PATTERN.test("entry.hits[lo] < cutoff")).toBe(true);
    expect(FORBIDDEN_PATTERN.test("entry.hits[lo] <= cutoff")).toBe(false);
  });

  // ── 3k. FORBIDDEN_PATTERN — array-filter ────────────────────────────────
  it("FORBIDDEN_PATTERN matches the filter relaxed form (>=) but not the correct form (>)", () => {
    expect(FORBIDDEN_PATTERN.test("entry.hits.filter(t => t >= cutoff)")).toBe(true);
    expect(FORBIDDEN_PATTERN.test("entry.hits.filter(t => t > cutoff)")).toBe(false);
  });

  // ── 3l. Comment lines trigger FORBIDDEN_PATTERN (intentional strictness) ─
  it("FORBIDDEN_PATTERN triggers on a comment line containing the relaxed form (documented behaviour)", () => {
    // Note: FORBIDDEN_PATTERN is a regex on raw lines; the check script
    // applies it without comment filtering — comment lines inside the source
    // would still trigger it, by design (the check is intentionally strict).
    // This test documents the current behaviour: the pattern IS a match,
    // which means commented-out relaxed forms will also be flagged.
    const commentLine = "// entry.hits[lo] < cutoff — old form";
    expect(FORBIDDEN_PATTERN.test(commentLine)).toBe(true);
    // This is intentional: if someone "comments out" the <= guard and
    // writes a comment showing the < form, the check will still fail and
    // force an explicit review of the change.
  });
});
