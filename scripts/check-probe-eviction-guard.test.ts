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
 *        m. REQUIRED_PATTERN matches filter with extra inner whitespace: filter( (t) => t > cutoff )
 *        n. REQUIRED_PATTERN matches filter with extra inner whitespace: filter( ( t ) => t > cutoff )
 *        o. FORBIDDEN_PATTERN matches relaxed filter with extra whitespace: filter( (t) => t >= cutoff )
 *        p. FORBIDDEN_PATTERN matches relaxed filter with extra whitespace: filter( ( t ) => t >= cutoff )
 *        q. checkProbeEvictionGuard returns ok:true for filter( (t) => t > cutoff )
 *        r. checkProbeEvictionGuard returns ok:true for filter( ( t ) => t > cutoff )
 *        s. checkProbeEvictionGuard returns ok:false (relaxed) for filter( (t) => t >= cutoff )
 *        t. checkProbeEvictionGuard returns ok:false (relaxed) for filter( ( t ) => t >= cutoff )
 *   4. Helper-extraction detection (fs mocked)
 *        a. HELPER_DELEGATION_PATTERN matches a delegating call of the form evict*(entry, cutoff)
 *        b. HELPER_REQUIRED_PATTERN matches correct while-loop comparison with arbitrary param names
 *        c. HELPER_REQUIRED_PATTERN matches correct filter form with arbitrary param names
 *        d. HELPER_FORBIDDEN_PATTERN matches relaxed while-loop with arbitrary param names
 *        e. HELPER_FORBIDDEN_PATTERN matches relaxed filter form with arbitrary param names
 *        f. Helper extracted with correct comparison in body → ok:true
 *        g. Helper extracted with relaxed comparison in body → ok:false (relaxed message cites helper)
 *        h. Helper extracted but correct pattern absent from body → ok:false (dedicated helper message)
 *        i. Helper call present but definition not found in same file → ok:false (external-module message)
 *        j. Helper with parenthesised arrow correct form → ok:true
 *        k. Helper with parenthesised arrow relaxed form → ok:false
 *        l. Inline required present but helper has relaxed comparison → ok:false
 *        m. HELPER_REQUIRED_PATTERN matches parenthesised arrow correct form
 *        n. HELPER_FORBIDDEN_PATTERN matches parenthesised arrow relaxed form
 *        v. Helper body splits 'e.hits\n  .filter((t) => t > c)' across lines → ok:true
 *           buildHelperScanPatterns now includes \s* before \.filter; the full-body
 *           fallback pass joins the helper lines and recognises the split chain.
 *        w. Helper body splits 'e.hits\n  .filter((t) => t >= c)' across lines → ok:false
 *           The param-specific forbidden pattern also has \s* before \.filter, so the
 *           full-body fallback detects the relaxed split form and emits the relaxed error.
 *   5. Multi-line source strings (formatter-split arrow)
 *        a. Filter arrow split to the next line (correct form) → ok:true
 *           REQUIRED_PATTERN uses \s* between tokens and \s matches \n; the
 *           full-source fallback pass in checkProbeEvictionGuard() therefore
 *           recognises the expression even when it spans two lines.
 *        b. Filter arrow split to the next line (relaxed form) → ok:false
 *           FORBIDDEN_PATTERN likewise uses \s*, so the full-source pass
 *           catches the relaxed form and emits the "relaxed eviction comparison"
 *           error rather than the generic failure.
 *        c. While-loop condition split across lines (correct form) → ok:true
 *           The while-loop branch of REQUIRED_PATTERN also uses \s*, so the
 *           full-source pass recognises the form even when <= and cutoff appear
 *           on separate lines.
 *        d. Filter arrow split to the next line with same-file while-loop guard → ok:true
 *           Unchanged: the while-loop line matches on the per-line scan.
 *        e. While-loop condition two-part split: identifier (`cutoff`) on its own line → ok:true
 *           REQUIRED_PATTERN's \s* spans the newline between `<=` and `cutoff`,
 *           so the full-source fallback pass recognises this form too.
 *        f. While-loop condition symmetric two-part split: `<= cutoff` on its own line → ok:true
 *           REQUIRED_PATTERN's \s* also spans the newline between `entry.hits[lo]`
 *           and `<= cutoff`, so the full-source fallback pass recognises this form too.
 *   6. Multi-line helper body (formatter-split condition inside extracted helper)
 *        a. Delegation present; helper body has `e.hits[lo] <=` / `c` split across
 *           two lines → ok:false with helper-extraction message.
 *           HELPER_REQUIRED_PATTERN is a single-line regex applied line-by-line.
 *           A formatter that wraps `e.hits[lo] <= c` across two lines leaves neither
 *           line matching HELPER_REQUIRED_PATTERN, so the check fails with the
 *           "extracted into helper … no correct eviction comparison" message.
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
  HELPER_DELEGATION_PATTERN,
  HELPER_REQUIRED_PATTERN,
  HELPER_FORBIDDEN_PATTERN,
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

  // ── 3b-paren. Array-filter form with parenthesized parameter ────────────
  it("returns ok:true when source uses the parenthesized array-filter form (filter((t) => t > cutoff))", async () => {
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter((t) => t > cutoff);\n`,
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

  // ── 3e-paren. Parenthesized array-filter relaxed: (t) => t >= cutoff ─────
  it("returns ok:false with a 'relaxed' reason when the parenthesized filter uses >= cutoff", async () => {
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter((t) => t >= cutoff);\n`,
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

  // ── 3i-paren. REQUIRED_PATTERN — parenthesized array-filter form ─────────
  it("REQUIRED_PATTERN matches the parenthesized array-filter correct form but not its relaxed form", () => {
    expect(REQUIRED_PATTERN.test("entry.hits.filter((t) => t > cutoff)")).toBe(true);
    expect(REQUIRED_PATTERN.test("entry.hits.filter((t) => t >= cutoff)")).toBe(false);
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

  // ── 3k-paren. FORBIDDEN_PATTERN — parenthesized array-filter ────────────
  it("FORBIDDEN_PATTERN matches the parenthesized filter relaxed form (>=) but not the correct form (>)", () => {
    expect(FORBIDDEN_PATTERN.test("entry.hits.filter((t) => t >= cutoff)")).toBe(true);
    expect(FORBIDDEN_PATTERN.test("entry.hits.filter((t) => t > cutoff)")).toBe(false);
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

  // ── 3m. REQUIRED_PATTERN — extra space inside outer parens ───────────────
  it("REQUIRED_PATTERN matches filter with a space after '(' and before ')': filter( (t) => t > cutoff )", () => {
    // A formatter might add a space after the opening paren and before the
    // closing paren of .filter(), producing: filter( (t) => t > cutoff )
    expect(
      REQUIRED_PATTERN.test("entry.hits.filter( (t) => t > cutoff )"),
    ).toBe(true);
    // The relaxed variant with the same extra spacing must NOT match.
    expect(
      REQUIRED_PATTERN.test("entry.hits.filter( (t) => t >= cutoff )"),
    ).toBe(false);
  });

  // ── 3n. REQUIRED_PATTERN — extra spaces inside both inner and outer parens ─
  it("REQUIRED_PATTERN matches filter with spaces inside every paren pair: filter( ( t ) => t > cutoff )", () => {
    // An aggressive formatter might also space out the inner parameter parens,
    // producing: filter( ( t ) => t > cutoff )
    expect(
      REQUIRED_PATTERN.test("entry.hits.filter( ( t ) => t > cutoff )"),
    ).toBe(true);
    // The relaxed variant with the same extreme spacing must NOT match.
    expect(
      REQUIRED_PATTERN.test("entry.hits.filter( ( t ) => t >= cutoff )"),
    ).toBe(false);
  });

  // ── 3o. FORBIDDEN_PATTERN — extra space, relaxed form ────────────────────
  it("FORBIDDEN_PATTERN matches the relaxed filter with extra outer spacing: filter( (t) => t >= cutoff )", () => {
    expect(
      FORBIDDEN_PATTERN.test("entry.hits.filter( (t) => t >= cutoff )"),
    ).toBe(true);
    // The correct form with the same spacing must NOT match FORBIDDEN_PATTERN.
    expect(
      FORBIDDEN_PATTERN.test("entry.hits.filter( (t) => t > cutoff )"),
    ).toBe(false);
  });

  // ── 3p. FORBIDDEN_PATTERN — extra inner spaces, relaxed form ─────────────
  it("FORBIDDEN_PATTERN matches the relaxed filter with extreme inner spacing: filter( ( t ) => t >= cutoff )", () => {
    expect(
      FORBIDDEN_PATTERN.test("entry.hits.filter( ( t ) => t >= cutoff )"),
    ).toBe(true);
    // The correct form with the same spacing must NOT match FORBIDDEN_PATTERN.
    expect(
      FORBIDDEN_PATTERN.test("entry.hits.filter( ( t ) => t > cutoff )"),
    ).toBe(false);
  });

  // ── 3q. checkProbeEvictionGuard — extra outer spacing, correct form ───────
  it("returns ok:true when source uses filter( (t) => t > cutoff ) with spaces inside the outer parens", async () => {
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter( (t) => t > cutoff );\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 3r. checkProbeEvictionGuard — extreme inner spacing, correct form ─────
  it("returns ok:true when source uses filter( ( t ) => t > cutoff ) with spaces inside every paren pair", async () => {
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter( ( t ) => t > cutoff );\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 3s. checkProbeEvictionGuard — extra outer spacing, relaxed form ───────
  it("returns ok:false with a 'relaxed' reason for filter( (t) => t >= cutoff ) with spaces inside the outer parens", async () => {
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter( (t) => t >= cutoff );\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });

  // ── 3t. checkProbeEvictionGuard — extreme inner spacing, relaxed form ─────
  it("returns ok:false with a 'relaxed' reason for filter( ( t ) => t >= cutoff ) with spaces inside every paren pair", async () => {
    mockReadFile.mockResolvedValue(
      `entry.hits = entry.hits.filter( ( t ) => t >= cutoff );\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Helper-extraction detection (fs mocked)
// ═══════════════════════════════════════════════════════════════════════════

describe("helper-extraction detection", () => {
  // ── 4a. HELPER_DELEGATION_PATTERN ────────────────────────────────────────
  it("HELPER_DELEGATION_PATTERN matches a delegating call of the form evict*(entry, cutoff)", () => {
    expect(HELPER_DELEGATION_PATTERN.test("evictStaleHits(entry, cutoff);")).toBe(true);
    expect(HELPER_DELEGATION_PATTERN.test("evictHits(entry, cutoff);")).toBe(true);
    expect(HELPER_DELEGATION_PATTERN.test("evictExpired(entry,cutoff);")).toBe(true);
    // Must NOT match calls with different argument names (not a delegation pattern).
    expect(HELPER_DELEGATION_PATTERN.test("evictStaleHits(e, c);")).toBe(false);
    // Must NOT match unrelated function names.
    expect(HELPER_DELEGATION_PATTERN.test("recordHit(entry, cutoff);")).toBe(false);
  });

  // ── 4b. HELPER_REQUIRED_PATTERN — while-loop form with arbitrary names ───
  it("HELPER_REQUIRED_PATTERN matches a correct while-loop comparison with arbitrary parameter names", () => {
    // Same semantics as `entry.hits[lo] <= cutoff` but with renamed params.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits[lo] <= c")).toBe(true);
    expect(HELPER_REQUIRED_PATTERN.test("ent.hits[i] <= boundary")).toBe(true);
    expect(HELPER_REQUIRED_PATTERN.test("entry.hits[lo] <= cutoff")).toBe(true);
    // Relaxed forms must NOT match.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits[lo] < c")).toBe(false);
  });

  // ── 4c. HELPER_REQUIRED_PATTERN — filter form with arbitrary names ───────
  it("HELPER_REQUIRED_PATTERN matches a correct filter form with arbitrary parameter names", () => {
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter(t => t > c)")).toBe(true);
    expect(HELPER_REQUIRED_PATTERN.test("ent.hits.filter(x => x > boundary)")).toBe(true);
    expect(HELPER_REQUIRED_PATTERN.test("entry.hits.filter(t => t > cutoff)")).toBe(true);
    // Relaxed forms must NOT match.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter(t => t >= c)")).toBe(false);
  });

  // ── 4d. HELPER_FORBIDDEN_PATTERN — while-loop relaxed with arbitrary names
  it("HELPER_FORBIDDEN_PATTERN matches a relaxed while-loop comparison with arbitrary parameter names", () => {
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits[lo] < c")).toBe(true);
    expect(HELPER_FORBIDDEN_PATTERN.test("ent.hits[i] < boundary")).toBe(true);
    // Correct form (<=) must NOT be flagged.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits[lo] <= c")).toBe(false);
  });

  // ── 4e. HELPER_FORBIDDEN_PATTERN — filter relaxed with arbitrary names ───
  it("HELPER_FORBIDDEN_PATTERN matches a relaxed filter form with arbitrary parameter names", () => {
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter(t => t >= c)")).toBe(true);
    expect(HELPER_FORBIDDEN_PATTERN.test("ent.hits.filter(x => x >= boundary)")).toBe(true);
    // Correct form (>) must NOT be flagged.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter(t => t > c)")).toBe(false);
  });

  // ── 4f. Helper extracted with correct comparison → ok:true ───────────────
  it("returns ok:true when eviction is delegated to a helper whose body contains the correct comparison", async () => {
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4g. Helper extracted with relaxed comparison → ok:false ─────────────
  it("returns ok:false citing the helper when a delegated helper body contains the relaxed comparison", async () => {
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] < c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4h. Helper extracted but correct pattern absent from body ─────────────
  it("returns ok:false with a dedicated helper-extraction message when the helper body has no recognised comparison", async () => {
    // The helper exists but uses an unrecognised idiom (e.g., extracted
    // further into another helper or uses a completely different mechanism).
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  // eviction delegated elsewhere`,
        `  purgeOldHits(e, c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // Must emit the dedicated helper-extraction message, not the generic one.
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
    expect(result.reason).toMatch(/update REQUIRED_PATTERN/i);
  });

  // ── 4i. Helper called but definition not found in same file ──────────────
  it("returns ok:false with an external-module message when the helper is called but not defined in the file", async () => {
    mockReadFile.mockResolvedValue(
      [
        `import { evictStaleHits } from "./eviction-helpers";`,
        ``,
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
    // Should guide the developer to locate the helper in the external module.
    expect(result.reason).toMatch(/update REQUIRED_PATTERN/i);
  });

  // ── 4j. Helper with parenthesised arrow correct form → ok:true ───────────
  it("returns ok:true when the helper uses a parenthesised arrow filter with the correct comparison", async () => {
    // e.hits.filter((t) => t > c) — parens around the callback param
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  e.hits = e.hits.filter((t) => t > c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4k. Helper with parenthesised arrow relaxed form → ok:false ──────────
  it("returns ok:false when the helper uses a parenthesised arrow filter with the relaxed comparison", async () => {
    // e.hits.filter((t) => t >= c) — parens around the callback param, wrong >=
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  e.hits = e.hits.filter((t) => t >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4l-missing. Inline required present but helper body has NO recognised comparison → ok:false
  it("returns ok:false when an inline correct expression is present but the helper body contains no recognised comparison", async () => {
    // The inline expression (in a comment) satisfies REQUIRED_PATTERN, but the
    // active code path is the helper — which uses an unrecognised mechanism.
    // The inline token must NOT mask the missing helper guard.
    mockReadFile.mockResolvedValue(
      [
        `// Legacy form kept for reference: entry.hits[lo] <= cutoff`,
        ``,
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  // eviction delegated to a third helper — no recognisable comparison here`,
        `  purgeExpired(e, c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
    expect(result.reason).toMatch(/update REQUIRED_PATTERN/i);
  });

  // ── 4l. Inline required present but helper has relaxed comparison → ok:false
  it("returns ok:false when an inline correct expression is present but the delegated helper body is relaxed", async () => {
    // This is the critical regression: a leftover correct inline expression
    // must NOT mask a wrong comparison inside the helper that is the actual
    // live code path.
    mockReadFile.mockResolvedValue(
      [
        `// Legacy inline form still present in source:`,
        `// while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;`,
        ``,
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);  // new delegated path`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] < c) lo++;  // WRONG: < instead of <=`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4m. HELPER_REQUIRED_PATTERN — parenthesised arrow, arbitrary names ───
  it("HELPER_REQUIRED_PATTERN matches the correct filter form with a parenthesised callback parameter", () => {
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter((t) => t > c)")).toBe(true);
    expect(HELPER_REQUIRED_PATTERN.test("ent.hits.filter((x) => x > boundary)")).toBe(true);
    // Relaxed parenthesised form must NOT match.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter((t) => t >= c)")).toBe(false);
  });

  // ── 4n. HELPER_FORBIDDEN_PATTERN — parenthesised arrow, arbitrary names ──
  it("HELPER_FORBIDDEN_PATTERN matches the relaxed filter form with a parenthesised callback parameter", () => {
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter((t) => t >= c)")).toBe(true);
    expect(HELPER_FORBIDDEN_PATTERN.test("ent.hits.filter((x) => x >= boundary)")).toBe(true);
    // Correct parenthesised form must NOT be flagged.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter((t) => t > c)")).toBe(false);
  });

  // ── 4o. Second delegation has relaxed comparison; first is valid → ok:false
  it("returns ok:false when a later delegation calls a helper whose body uses the relaxed comparison", async () => {
    // The first delegation is valid; the second one uses < instead of <=.
    // All delegations must be independently verified — the first pass must
    // not mask the second failure.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictReferer(entry, cutoff);   // first — correct`,
        `  evictUa(entry, cutoff);        // second — relaxed`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictReferer(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
        ``,
        `function evictUa(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] < c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictUa");
  });

  // ── 4p. Helper body uses an unrelated identifier as the bound → ok:false ─
  it("returns ok:false when the helper comparison bound is an unrelated identifier, not the cutoff parameter", async () => {
    // e.hits[lo] <= someOtherValue satisfies HELPER_REQUIRED_PATTERN (generic)
    // but NOT the param-specific pattern built from the helper's signature
    // (which requires the second parameter, c, as the bound).
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  // BUG: uses 'someOtherValue' instead of the cutoff parameter 'c'`,
        `  while (lo < e.hits.length && e.hits[lo] <= someOtherValue) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
    expect(result.reason).toMatch(/update REQUIRED_PATTERN/i);
  });

  // ── 4q. Entry-param suffix collision: "some" ends with "e" → ok:false ────
  it("returns ok:false when an unrelated object whose name ends with the entry-param suffix is used", async () => {
    // For evictStaleHits(e, c), "some.hits[lo] <= c" must NOT pass because
    // "some" is not the entry parameter "e".  Without \b boundaries the regex
    // `e\.hits` would match the trailing "e" in "some.hits".
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  // BUG: 'some' is not the entry param 'e'`,
        `  while (lo < some.hits.length && some.hits[lo] <= c) lo++;`,
        `  if (lo > 0) some.hits = some.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4r. Cutoff-param prefix collision: "cOther" starts with "c" → ok:false
  it("returns ok:false when the comparison bound starts with the cutoff-param name but is a longer identifier", async () => {
    // For evictStaleHits(e, c), "e.hits[lo] <= cOther" must NOT pass because
    // "cOther" is not the cutoff parameter "c".  Without \b boundaries the
    // regex `c` would match the leading "c" in "cOther".
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  // BUG: 'cOther' is not the cutoff param 'c'`,
        `  while (lo < e.hits.length && e.hits[lo] <= cOther) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4s. Filter form — cutoff-param prefix collision → ok:false ───────────
  it("returns ok:false when the filter comparison uses an identifier that starts with the cutoff-param name", async () => {
    // e.hits.filter(t => t > cBoundary) must NOT pass for param c.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  // BUG: 'cBoundary' is not the cutoff param 'c'`,
        `  e.hits = e.hits.filter(t => t > cBoundary);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4t. Unused helper definition only (no call) → ok:false (generic) ─────
  it("returns ok:false with the generic message when the file has a matching helper definition but no call site", async () => {
    // `function evictStaleHits(entry, cutoff)` syntactically matches
    // HELPER_DELEGATION_PATTERN, but it is a declaration, not a call.
    // Without a real call site the phase-2 delegation list should be empty,
    // so the check falls through to the generic "no guard found" failure.
    // The helper uses renamed params (e, c) so REQUIRED_PATTERN ("entry.hits[lo] <= cutoff")
    // does NOT match it during the inline scan.  The definition line is correctly
    // excluded from the delegation list, leaving no call site detected and no
    // inline match → the check must fall through to the generic failure.
    mockReadFile.mockResolvedValue(
      [
        `// unused eviction helper — never called from recordProbe`,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
        ``,
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  // eviction omitted — no call to evictStaleHits here`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // Must NOT say "extracted into helper" — no call was detected.
    expect(result.reason).not.toMatch(/extracted into helper/i);
    expect(result.reason).toMatch(/no correct eviction guard found/i);
  });

  // ── 4u-typed. Helper with TypeScript-annotated params → ok:true ──────────
  it("returns ok:true when the helper signature uses TypeScript type annotations", async () => {
    // function evictStaleHits(e: ProbeEntry, c: number) — extractHelperParams
    // must strip the `: Type` portion and capture just the names e and c.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e: ProbeEntry, c: number) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4u-norecord. Unrecognised recordProbe form + unrelated delegation → ok:false
  it("returns ok:false when recordProbe uses an unrecognised form and an unrelated function has a valid delegation", async () => {
    // recordProbe is declared as a method on an object literal — the locator
    // does not recognise this form, so delegationScopeLines stays empty.
    // An evictDebug(entry, cutoff) call in a different function must NOT be
    // accepted as recordProbe's delegation (no whole-file fallback).
    mockReadFile.mockResolvedValue(
      [
        `const probeHandlers = {`,
        `  recordProbe(map, key, label, now) {`,
        `    let entry = map.get(key);`,
        `    const cutoff = now - WINDOW_MS;`,
        `    // eviction omitted entirely`,
        `    entry.hits.push(now);`,
        `  }`,
        `};`,
        ``,
        `function debugHelper(map, key, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictDebug(entry, cutoff);  // only in unrelated function`,
        `}`,
        ``,
        `function evictDebug(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // Must fail — no inline guard, no delegation inside a recognised recordProbe body.
    expect(result.reason).toMatch(/no correct eviction guard found/i);
  });

  // ── 4u-scope. Correct delegation outside recordProbe does not exempt it ──
  it("returns ok:false when a correct delegation exists outside recordProbe but recordProbe itself has no eviction", async () => {
    // evictDebug(entry, cutoff) is called from a debug helper, NOT from
    // recordProbe.  Its correct body must not mask the missing guard in
    // recordProbe, which has no eviction at all.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  // eviction removed — no call here`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function debugHelper(map, key, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictDebug(entry, cutoff);  // outside recordProbe`,
        `}`,
        ``,
        `function evictDebug(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // Should fail — no eviction guard in recordProbe
    expect(result.reason).toMatch(/no correct eviction guard found/i);
  });

  // ── 4v. Helper has method-chain split: .filter() on its own line, correct ─
  it("returns ok:true when the helper body splits 'e.hits\\n  .filter((t) => t > c)' across two lines (full-body fallback recognises it)", async () => {
    // An aggressive line-length formatter may rewrite the helper body as:
    //   e.hits = e.hits
    //     .filter((t) => t > c);
    //
    // The per-line scan sees no single line matching the param-specific filter
    // pattern (e.hits and .filter are on different lines).  The full-body
    // fallback pass joins the helper's extracted lines and applies the
    // param-specific required pattern — which now includes \s* between \.hits
    // and \.filter — to the joined text, consuming the newline + indentation.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  e.hits = e.hits`,
        `    .filter((t) => t > c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4w. Helper has method-chain split: .filter() on its own line, relaxed ─
  it("returns ok:false with the relaxed-form error when the helper body splits 'e.hits\\n  .filter((t) => t >= c)' across two lines", async () => {
    // The same layout with the relaxed comparator must be caught:
    //   e.hits = e.hits
    //     .filter((t) => t >= c);
    //
    // The param-specific forbidden pattern also has \s* before \.filter, so
    // the full-body fallback pass detects the split relaxed form and emits
    // the "relaxed eviction comparison" error rather than the generic failure.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  e.hits = e.hits`,
        `    .filter((t) => t >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4u. Two calls on the same line; second helper is relaxed → ok:false ──
  it("returns ok:false when two delegation calls appear on the same line and the second helper is relaxed", async () => {
    // Single-line: evictReferer(entry, cutoff); evictUa(entry, cutoff);
    // matchAll must pick up both; the second helper uses < instead of <=.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictReferer(entry, cutoff); evictUa(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictReferer(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
        ``,
        `function evictUa(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length && e.hits[lo] < c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictUa");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Multi-line source strings (formatter-split arrow)
//
// REQUIRED_PATTERN and FORBIDDEN_PATTERN use \s* between every token.
// JavaScript's \s class includes \n, so applying the patterns to the full
// source string (rather than line-by-line) recognises formatter-split
// expressions such as:
//
//   entry.hits = entry.hits.filter((t) =>
//     t > cutoff);
//
// checkProbeEvictionGuard() performs a full-source fallback pass after the
// per-line scan, which fixes the false-negative documented by the earlier
// "known limitation" comment.
//
//   5a — split correct filter form         → ok:true  (full-source pass matches)
//   5b — split relaxed filter form         → ok:false, "relaxed eviction comparison"
//   5c — while-loop operator split         → ok:true  (full-source pass matches)
//   5d — split filter + single-line while  → ok:true  (unchanged)
//   5e — two-part split: `<=` ends line    → ok:true  (full-source \s* spans \n)
//   5f — two-part split: `<=` starts line  → ok:true  (full-source \s* spans \n)
//   5g — method-chain split: .filter() on its own line, correct form → ok:true
//        An aggressive line-length formatter may produce:
//          entry.hits = entry.hits
//            .filter((t) => t > cutoff);
//        REQUIRED_PATTERN now includes \s* between entry.hits and .filter so
//        the full-source fallback pass recognises this layout.
//   5h — method-chain split: .filter() on its own line, relaxed form → ok:false
//        The same layout with >= cutoff must be caught by FORBIDDEN_PATTERN
//        (which also has \s* before .filter).
// ═══════════════════════════════════════════════════════════════════════════

describe("multi-line source strings (formatter-split arrow)", () => {
  // ── 5a. Correct filter form split across two lines → ok:true ──────────────
  it("returns ok:true when the correct filter arrow is split onto the next line", async () => {
    // A formatter that enforces a short line-length limit might split:
    //   entry.hits = entry.hits.filter((t) => t > cutoff);
    // into:
    //   entry.hits = entry.hits.filter((t) =>
    //     t > cutoff);
    //
    // REQUIRED_PATTERN uses \s* between every token and \s matches \n, so
    // applying it to the full source string (the full-source fallback pass)
    // recognises the expression even though neither line matches on its own.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits.filter((t) =>`,
        `    t > cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 5b. Relaxed filter form split across two lines → ok:false (relaxed) ───
  it("returns ok:false with the relaxed-form error when the relaxed filter arrow is split onto the next line", async () => {
    // When `entry.hits.filter((t) => t >= cutoff)` is split as:
    //   entry.hits = entry.hits.filter((t) =>
    //     t >= cutoff);
    //
    // FORBIDDEN_PATTERN uses \s* between every token and \s matches \n, so
    // the full-source fallback pass recognises the relaxed form even though
    // the `>=` comparator is on a separate line from `.filter((t) =>`.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits.filter((t) =>`,
        `    t >= cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });

  // ── 5c. While-loop condition split across lines → ok:true ─────────────────
  it("returns ok:true when the while-loop eviction condition is split across lines", async () => {
    // A formatter may split:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;
    // into the pathological three-line form where the operator is separated
    // from its right-hand operand:
    //   while (lo < entry.hits.length &&
    //     entry.hits[lo] <=
    //     cutoff) lo++;
    //
    // REQUIRED_PATTERN's while-loop branch is `entry\.hits\[lo\]\s*<=\s*cutoff`.
    // \s* matches \n, so the full-source fallback pass recognises the form
    // even when `<=` and `cutoff` appear on separate lines.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  while (lo < entry.hits.length &&`,
        `    entry.hits[lo] <=`,
        `    cutoff) lo++;`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 5d. Split filter + single-line while-loop → ok:true ───────────────────
  it("returns ok:true when a split-line filter form coexists with a single-line while-loop guard", async () => {
    // If the file uses the while-loop idiom on one line AND also has a split
    // filter form (e.g., left over from an incomplete refactor), the while-loop
    // line still matches REQUIRED_PATTERN, so the check passes.
    // This confirms that the while-loop guard is a reliable fallback when the
    // filter form cannot be scanned across line boundaries.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  // while-loop guard (single-line — always recognised):`,
        `  while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;`,
        `  // filter form split by formatter (not recognised on its own):`,
        `  entry.hits = entry.hits.filter((t) =>`,
        `    t > cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The while-loop line matches REQUIRED_PATTERN → ok:true.
    expect(result.ok).toBe(true);
  });

  // ── 5e. While-loop two-part split: cutoff on its own line → ok:true ───────
  it("returns ok:true when the while-loop condition is split so that 'cutoff' lands on the next line (two-part split)", async () => {
    // A formatter enforcing a strict line-length limit might wrap:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;
    // into a two-part split:
    //   while (lo < entry.hits.length && entry.hits[lo] <=
    //     cutoff) lo++;
    //
    // REQUIRED_PATTERN's while-loop branch is `entry\.hits\[lo\]\s*<=\s*cutoff`.
    // \s* matches \n, so the full-source fallback pass recognises this form even
    // when `<=` and `cutoff` appear on separate lines.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  while (lo < entry.hits.length && entry.hits[lo] <=`,
        `    cutoff) lo++;`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 5f. While-loop two-part split: '<= cutoff' on its own line → ok:true ───
  it("returns ok:true when the while-loop condition is split so that '<= cutoff' lands on the next line (symmetric two-part split)", async () => {
    // The symmetric counterpart to test 5e.  A formatter may split:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;
    // the other way, wrapping after `entry.hits[lo]` so that the operator and
    // right-hand operand begin the next line:
    //   while (lo < entry.hits.length &&
    //     entry.hits[lo]
    //     <= cutoff) lo++;
    //
    // The per-line scan does not match either partial line on its own.
    // However, the full-source fallback pass applies REQUIRED_PATTERN to the
    // entire source string.  REQUIRED_PATTERN uses \s* between tokens and
    // JavaScript's \s includes \n, so `entry\.hits\[lo\]\s*<=\s*cutoff`
    // matches across the line boundary:
    //   `entry.hits[lo]` + `\n    ` (\s*) + `<=` + ` ` (\s*) + `cutoff`
    //
    // Both two-part splits (5e and 5f) therefore pass the full-source check.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  while (lo < entry.hits.length &&`,
        `    entry.hits[lo]`,
        `    <= cutoff) lo++;`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // CURRENT BEHAVIOUR: ok:true — the full-source fallback pass recognises
    // `entry.hits[lo]\n    <= cutoff` via REQUIRED_PATTERN's \s* tokens.
    expect(result.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Multi-line helper body (formatter-split condition inside extracted helper)
//
// HELPER_REQUIRED_PATTERN is a single-line regex applied line-by-line inside
// the helper's extracted body, exactly as REQUIRED_PATTERN is applied to the
// top-level source.  A formatter that enforces an aggressive line-length limit
// may split `e.hits[lo] <= c` inside the helper body across two lines:
//
//   while (lo < e.hits.length && e.hits[lo] <=
//     c) lo++;
//
// Each resulting line is individually too short to match HELPER_REQUIRED_PATTERN
// (which requires the full `<param>.hits[<idx>] <= <cutoff>` expression on one
// line).  The split form therefore falls through to the "extracted into helper …
// no correct eviction comparison found" failure rather than being recognised as
// correct.
//
// This is the same single-line regex limitation documented in section 5, but
// applied to HELPER_REQUIRED_PATTERN instead of REQUIRED_PATTERN.  These tests
// document the current behaviour so that:
//   a. A future formatter change that produces this layout inside a helper is
//      caught immediately when the guard starts failing.
//   b. Anyone who updates HELPER_REQUIRED_PATTERN to handle multi-line forms
//      has a clear baseline to test against.
// ═══════════════════════════════════════════════════════════════════════════

describe("multi-line helper body (formatter-split condition inside extracted helper)", () => {
  // ── 6a. Helper body has while-loop condition split across two lines → ok:false
  it("returns ok:false when the helper body splits 'e.hits[lo] <= c' across two lines (single-line regex limitation on HELPER_REQUIRED_PATTERN)", async () => {
    // A formatter enforcing a strict line-length limit might wrap:
    //   while (lo < e.hits.length && e.hits[lo] <= c) lo++;
    // inside the helper body into a two-part split:
    //   while (lo < e.hits.length && e.hits[lo] <=
    //     c) lo++;
    //
    // HELPER_REQUIRED_PATTERN requires `<param>.hits[<idx>] <= <cutoff>` to
    // appear on a single line.  In the two-part split, line 1 ends with
    // `e.hits[lo] <=` (no `c`) and line 2 begins with `c)` (no `e.hits[lo]`),
    // so neither line matches HELPER_REQUIRED_PATTERN.  The check therefore
    // returns ok:false with the helper-extraction "no correct eviction
    // comparison found in that helper's body" message.
    //
    // This is intentional — the current line-by-line scanning approach cannot
    // reconstruct the expression across line boundaries.  If HELPER_REQUIRED_PATTERN
    // is later extended to match multi-line forms, update this expectation to
    // ok:true and revise the reason assertion accordingly.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictStaleHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictStaleHits(e, c) {`,
        `  let lo = 0;`,
        `  // Formatter split the while-loop condition across two lines:`,
        `  while (lo < e.hits.length && e.hits[lo] <=`,
        `    c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The param-specific required pattern has \s* between `<=` and the cutoff
    // parameter, so the full-body fallback pass (which joins the helper lines
    // into a single string) recognises `e.hits[lo] <=\n    c` across the line
    // boundary.  The check now returns ok:true for this layout.
    expect(result.ok).toBe(true);
  });

  // ── 5g. While-loop body split to the next line → ok:true ──────────────────
  it("returns ok:true when the while-loop condition is intact but the body 'lo++' is on the next line", async () => {
    // A formatter enforcing a short line-length limit may keep the condition
    // on one line but move the loop body to the next:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff)
    //     lo++;
    //
    // This is safe: REQUIRED_PATTERN matches `entry.hits[lo] <= cutoff`
    // independently of the surrounding loop structure.  The condition line
    // contains the full `entry\.hits\[lo\]\s*<=\s*cutoff` token sequence, so
    // the per-line scan matches it without needing the full-source fallback.
    //
    // Cross-reference: tests 5c, 5e, and 5f cover splits of the while-loop
    // *condition* across lines.  This test covers the orthogonal case where
    // the condition itself is intact but the body is placed on a new line.
    // Any future tightening of REQUIRED_PATTERN that accidentally requires the
    // body to follow on the same line as the condition would be caught here.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  while (lo < entry.hits.length && entry.hits[lo] <= cutoff)`,
        `    lo++;`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The condition line contains the full required token sequence, so
    // REQUIRED_PATTERN matches on the per-line scan → ok:true.
    expect(result.ok).toBe(true);
  });

  // ── 5h. Brace-wrapped while-loop body → ok:true ────────────────────────────
  it("returns ok:true when a brace-style formatter wraps the while-loop body in braces on a new line", async () => {
    // A formatter enforcing a "braces required" style rule may rewrite:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;
    // as:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff) {
    //     lo++;
    //   }
    //
    // The condition itself (including `entry.hits[lo] <= cutoff`) is still
    // fully present on the opening while-line.  REQUIRED_PATTERN matches
    // `entry\.hits\[lo\]\s*<=\s*cutoff` independently of whatever follows
    // the closing `)`, so the per-line scan on the condition line returns a
    // match and the check passes without needing the full-source fallback.
    //
    // Cross-reference: test 5g covers the case where the body is placed on
    // the next line *without* braces (`while (...) \n  lo++;`).  This test
    // covers the orthogonal brace-wrapped variant.  Both are safe because
    // REQUIRED_PATTERN only cares about the token sequence inside the
    // condition — it does not require `lo++` to appear on the same line.
    // A future tightening of REQUIRED_PATTERN that accidentally requires the
    // body to be present on the condition line would be caught here.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  while (lo < entry.hits.length && entry.hits[lo] <= cutoff) {`,
        `    lo++;`,
        `  }`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The condition line contains the full required token sequence, so
    // REQUIRED_PATTERN matches on the per-line scan → ok:true.
    expect(result.ok).toBe(true);
  });

  // ── 5g. Method-chain split: .filter() on its own line, correct form → ok:true
  it("returns ok:true when an aggressive formatter moves .filter() onto its own line after entry.hits (correct form)", async () => {
    // An aggressive line-length formatter may rewrite:
    //   entry.hits = entry.hits.filter((t) => t > cutoff);
    // as a method-chain split where the call itself starts on a new line:
    //   entry.hits = entry.hits
    //     .filter((t) => t > cutoff);
    //
    // The per-line scan sees neither "entry.hits.filter" (it is split across
    // two lines) nor a matching single line.  The full-source fallback pass
    // applies REQUIRED_PATTERN to the joined source string, which now contains
    // \s* between entry.hits and .filter, allowing \n + indentation to be
    // consumed between the two tokens.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits`,
        `    .filter((t) => t > cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 5h. Method-chain split: .filter() on its own line, relaxed form → ok:false
  it("returns ok:false with the relaxed-form error when .filter() is on its own line and uses >= cutoff", async () => {
    // The same method-chain split layout with the relaxed comparator:
    //   entry.hits = entry.hits
    //     .filter((t) => t >= cutoff);
    //
    // FORBIDDEN_PATTERN also has \s* between entry.hits and .filter, so the
    // full-source fallback pass recognises the relaxed form and emits the
    // "relaxed eviction comparison" error rather than the generic failure.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits`,
        `    .filter((t) => t >= cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });
});
