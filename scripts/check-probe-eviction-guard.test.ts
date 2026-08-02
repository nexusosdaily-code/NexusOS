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
 *        u. Inline for-loop condition contains `entry.hits[lo] <= cutoff` but never mutates hits → ok:false
 *        v. Inline for-loop condition uses `entry.hits[lo] < cutoff` (strictly-less-than) →
 *           ok:false with reason matching /relaxed eviction comparison/i.
 *           FORBIDDEN_PATTERN catches the relaxed form even when followed by `;`.
 *        x. Inline for-loop: correct `<=` condition split across two lines
 *           (`entry.hits[lo] <=\n  cutoff; lo++`) → ok:false with reason
 *           matching /no correct eviction guard found/i.  REQUIRED_PATTERN's
 *           negative lookahead `(?!\s*;)` rejects the form even though `<=` is
 *           correct, because `\s*` spans the newline and the cutoff token is
 *           then immediately followed by `;` (the for-loop separator).
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
 *        n-bare-ok.  HELPER_FORBIDDEN_PATTERN matches bare-arrow relaxed form (t => t >= c)
 *        n-bare-neg. HELPER_FORBIDDEN_PATTERN does NOT match bare-arrow correct form (t => t > c)
 *        c-bare-ok.  HELPER_REQUIRED_PATTERN matches bare-arrow correct form (t => t > c)
 *        c-bare-neg. HELPER_REQUIRED_PATTERN does NOT match bare-arrow relaxed form (t => t >= c)
 *        b-index-ok.  HELPER_REQUIRED_PATTERN matches while-loop with a single-letter index (e.hits[i] <= c)
 *        b-index-neg. HELPER_REQUIRED_PATTERN does NOT match while-loop with relaxed index form (e.hits[i] < c)
 *        b-index-forbidden-ok.  HELPER_FORBIDDEN_PATTERN matches relaxed while-loop with a non-standard index (e.hits[i] < c)
 *        b-index-forbidden-neg. HELPER_FORBIDDEN_PATTERN does NOT match correct while-loop with a non-standard index (e.hits[i] <= c)
 *        x-callback-required-ok.  HELPER_REQUIRED_PATTERN matches correct filter form with a non-standard callback name (x => x > c)
 *        x-callback-required-neg. HELPER_REQUIRED_PATTERN does NOT match relaxed filter form with a non-standard callback name (x => x >= c)
 *        x-callback-forbidden-ok.  HELPER_FORBIDDEN_PATTERN matches relaxed filter form with a non-standard callback name (x => x >= c)
 *        x-callback-forbidden-neg. HELPER_FORBIDDEN_PATTERN does NOT match correct filter form with a non-standard callback name (x => x > c)
 *        xp-callback-required-ok.  HELPER_REQUIRED_PATTERN matches correct parenthesised filter form with a non-standard callback name ((x) => x > c)
 *        xp-callback-required-neg. HELPER_REQUIRED_PATTERN does NOT match relaxed parenthesised filter form with a non-standard callback name ((x) => x >= c)
 *        xp-callback-forbidden-ok.  HELPER_FORBIDDEN_PATTERN matches relaxed parenthesised filter form with a non-standard callback name ((x) => x >= c)
 *        xp-callback-forbidden-neg. HELPER_FORBIDDEN_PATTERN does NOT match correct parenthesised filter form with a non-standard callback name ((x) => x > c)
 *        xp-callback-integration-ok. checkProbeEvictionGuard returns ok:true for helper body using (x) => x > c
 *           (parenthesised non-standard callback, correct comparison — full end-to-end integration)
 *        xp-callback-integration-fail. checkProbeEvictionGuard returns ok:false (relaxed) for helper body using (x) => x >= c
 *           (parenthesised non-standard callback, relaxed comparison — reason must match /relaxed eviction comparison/i)
 *        o. Helper body with filter arrow split across lines (correct form) → ok:true
 *        p. Helper body with filter arrow split across lines (relaxed form) → ok:false
 *        v. Helper body splits 'e.hits\n  .filter((t) => t > c)' across lines → ok:true
 *           buildHelperScanPatterns now includes \s* before \.filter; the full-body
 *           fallback pass joins the helper lines and recognises the split chain.
 *        w. Helper body splits 'e.hits\n  .filter((t) => t >= c)' across lines → ok:false
 *           The param-specific forbidden pattern also has \s* before \.filter, so the
 *           full-body fallback detects the relaxed split form and emits the relaxed error.
 *        x. Helper body uses a for-loop eviction (keep-condition e.hits[i] > c) →
 *           ok:false with the helper-extraction message.  HELPER_REQUIRED_PATTERN only
 *           recognises the while-loop and filter idioms, not a for-loop keep-condition.
 *        y. Opt-in flag guard (ok:true): split-only correct form with full-length param
 *           names (entry/cutoff) → ok:true.  The full-body fallback must run
 *           unconditionally; if it were gated behind a flag that defaults to false this
 *           test would fail with the helper-extraction "no correct eviction" message.
 *        z. Opt-in flag guard (ok:false): split-only helper whose filter body uses a
 *           wrong comparator (t !== cutoff) that matches neither required nor forbidden
 *           → ok:false with the helper-extraction message.  Confirms the fallback is
 *           selective and does not return a false-positive ok:true for arbitrary splits.
 *        af. Full-body fallback — filter with non-standard callback name AND wrong
 *           comparator together → ok:false.  Guards against a future change that
 *           hard-codes the callback variable in HELPER_FORBIDDEN_PATTERN's filter
 *           branch.  The helper splits the arrow body across lines; the full-body
 *           forbidden pass must still emit the "relaxed eviction comparison / split
 *           across lines" message attributed to the helper.
 *        split-for-correct. Helper body: for-loop correct condition (`e.hits[i] <=\n    c`)
 *           split across two lines → ok:false.  The negative lookahead (?!\s*;) in
 *           HELPER_REQUIRED_PATTERN rejects the for-loop form even when the correct
 *           <= comparator is used, because the cutoff token is followed by `;` (the
 *           for-loop separator) after the newline is consumed.  The check is therefore
 *           intentionally strict: only a while-loop or filter form qualifies as proof
 *           of correct eviction.
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
 *        g. Inline bare-arrow split (correct form): `entry.hits.filter(t =>\n  t > cutoff)` → ok:true
 *           REQUIRED_PATTERN uses \(? making the callback-param parens optional, and
 *           \s* between `=>` and `t` spans the newline; the full-source fallback pass
 *           therefore recognises the bare (non-parenthesised) arrow split form.
 *        h. Inline bare-arrow split (relaxed form): `entry.hits.filter(t =>\n  t >= cutoff)` → ok:false
 *           FORBIDDEN_PATTERN likewise uses \(? and \s*, so the full-source pass
 *           catches the relaxed bare-arrow split and emits the "relaxed eviction comparison"
 *           error rather than the generic failure.
 *   6. Multi-line helper body (formatter-split condition inside extracted helper)
 *        a. Delegation present; helper body has `e.hits[lo] <=` / `c` split across
 *           two lines → ok:false with helper-extraction message.
 *           HELPER_REQUIRED_PATTERN is a single-line regex applied line-by-line.
 *           A formatter that wraps `e.hits[lo] <= c` across two lines leaves neither
 *           line matching HELPER_REQUIRED_PATTERN, so the check fails with the
 *           "extracted into helper … no correct eviction comparison" message.
 *        d. Helper body splits filter arrow body `t > c` to its own line (correct
 *           form) → ok:true.  buildHelperScanPatterns' required pattern has \s*
 *           between `=>` and the callback token, so the full-body fallback pass
 *           spans the newline and recognises the expression.
 *        e. Helper body splits filter arrow body `t >= c` to its own line (relaxed
 *           form) → ok:false.  The param-specific forbidden pattern also has \s*
 *           between `=>` and the callback token, so the full-body fallback detects
 *           the relaxed split form and emits the "relaxed eviction comparison" error.
 *        f. Helper body has BOTH the method-chain split (`.filter` on its own line)
 *           AND the arrow body split (`t > c` on its own line) — three-line form
 *           (correct) → ok:true.  The `\s*` before `.filter` consumes the first
 *           newline; the `\s*` between `=>` and `\w+` consumes the second.
 *        g. Helper body has BOTH splits as above but with the relaxed comparator
 *           (`t >= c`) — three-line form (relaxed) → ok:false.  Both `\s*` spans
 *           apply equally to the forbidden pattern, so the combined split is caught.
 *        h. Helper body uses a bare (non-parenthesised) arrow `t =>` split across
 *           lines (correct form) → ok:true.  buildHelperScanPatterns uses \(?
 *           to make the callback-param parens optional; the full-body fallback's
 *           \s* spans the newline and recognises the bare split form.
 *        i. Helper body uses a bare (non-parenthesised) arrow `t =>` split across
 *           lines (relaxed form) → ok:false.  The param-specific forbidden pattern
 *           also uses \(? and \s*, so the full-body fallback detects the relaxed
 *           bare-arrow split and emits the "relaxed eviction comparison" error.
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

  // ── 3v. Inline for-loop condition uses < instead of <= → ok:false (relaxed) ─
  it("returns ok:false (relaxed eviction comparison) when an inline for-loop condition uses entry.hits[lo] < cutoff (strictly-less-than)", async () => {
    // A future developer might write the eviction loop as a for-loop and
    // accidentally use the relaxed operator:
    //
    //   for (; lo < entry.hits.length && entry.hits[lo] < cutoff; lo++) {}
    //
    // `entry.hits[lo] < cutoff` keeps a hit whose timestamp equals exactly
    // (now − WINDOW_MS), silently inflating the in-window counter by 1.
    //
    // FORBIDDEN_PATTERN must catch the relaxed `< cutoff` form even when it
    // is followed by `;` (the for-loop separator) rather than `)`.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  let lo = 0;`,
        `  for (; lo < entry.hits.length && entry.hits[lo] < cutoff; lo++) {}`,
        `  entry.hits = entry.hits.slice(lo);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });

  // ── 3u. Inline for-loop condition contains entry.hits[lo] <= cutoff but never mutates hits → ok:false
  it("returns ok:false when an inline for-loop condition contains entry.hits[lo] <= cutoff but the body never mutates hits", async () => {
    // A developer might write eviction as a for-loop directly inside recordProbe:
    //
    //   for (; lo < entry.hits.length && entry.hits[lo] <= cutoff; lo++) {}
    //
    // The substring `entry.hits[lo] <= cutoff` superficially satisfies the
    // while-loop branch of REQUIRED_PATTERN, but the for-loop body is empty —
    // `entry.hits` is never sliced or reassigned — so no eviction occurs.
    //
    // In the for-loop the cutoff token is immediately followed by `;` (the
    // for-loop separator).  REQUIRED_PATTERN now includes a negative lookahead
    // `(?!\s*;)` after the cutoff operand so that this form is rejected.
    // In the canonical while-loop the token after cutoff is `)`, not `;`, so
    // correct code is unaffected.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  let lo = 0;`,
        `  for (; lo < entry.hits.length && entry.hits[lo] <= cutoff; lo++) {}`,
        `  // hits array never reassigned — eviction is absent`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no correct eviction guard found/i);
  });

  // ── 3v. While-loop with trailing spaces before closing paren → ok:true ───
  it("returns ok:true for while-loop where cutoff is followed by two spaces before the closing paren", async () => {
    // A formatter may add trailing spaces inside the while-condition, producing:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff  )
    // The negative lookahead (?!\s*;) only rejects a `;` after cutoff, not
    // spaces followed by `)`, so this whitespace variation must still pass.
    mockReadFile.mockResolvedValue(
      `while (lo < entry.hits.length && entry.hits[lo] <= cutoff  ) lo++;\n`,
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 3w. While-loop with a tab before closing paren → ok:true ─────────────
  it("returns ok:true for while-loop where cutoff is followed by a tab character before the closing paren", async () => {
    // A tab character between cutoff and `)` must also be accepted — it is
    // neither `;` nor any lookahead-blocking sequence.
    mockReadFile.mockResolvedValue(
      "while (lo < entry.hits.length && entry.hits[lo] <= cutoff\t) lo++;\n",
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 3x. Inline for-loop: correct <= condition split across two lines → ok:false ─
  it("returns ok:false (no correct eviction guard) when an inline for-loop splits 'entry.hits[lo] <=\\n  cutoff;' across two lines", async () => {
    // A future developer might write the eviction loop as a for-loop directly
    // inside recordProbe() and let a formatter split the condition across lines:
    //
    //   for (; lo < entry.hits.length && entry.hits[lo] <=
    //     cutoff; lo++) {}
    //
    // The correct `<=` comparator is present, but the cutoff token is followed
    // by `;` (the for-loop separator) on the same line after the newline is
    // consumed by `\s*`.  REQUIRED_PATTERN's negative lookahead `(?!\s*;)`
    // therefore rejects this form: the full-source fallback matches
    // `entry.hits[lo] <=\n  cutoff` but then sees `;` immediately after, so
    // the lookahead fires and the match fails.
    //
    // The check must emit the "no correct eviction guard found" message — not
    // the "relaxed eviction comparison" message — because the operator itself
    // is correct; it is only the split+for-loop form that disqualifies it.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  let lo = 0;`,
        `  for (; lo < entry.hits.length && entry.hits[lo] <=`,
        `    cutoff; lo++) {}`,
        `  entry.hits = entry.hits.slice(lo);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no correct eviction guard found/i);
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

  // ── 4n-bare-ok. HELPER_FORBIDDEN_PATTERN — bare-arrow relaxed form matches ─
  it("HELPER_FORBIDDEN_PATTERN matches the relaxed filter form with a bare (non-parenthesised) callback parameter", () => {
    // If HELPER_FORBIDDEN_PATTERN were tightened to require parens around the
    // callback parameter (e.g. \(\w+\) instead of \(?\w+\)?), it would silently
    // stop catching bare-arrow violations such as `e.hits.filter(t => t >= c)`.
    // This test pins the bare-arrow relaxed form so that such a tightening is
    // caught at the export-level unit test before it reaches the full-body logic.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter(t => t >= c)")).toBe(true);
  });

  // ── 4n-bare-neg. HELPER_FORBIDDEN_PATTERN — bare-arrow correct form not flagged
  it("HELPER_FORBIDDEN_PATTERN does NOT match the correct filter form with a bare (non-parenthesised) callback parameter", () => {
    // The correct bare-arrow form (strict >) must never be flagged as relaxed.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter(t => t > c)")).toBe(false);
  });

  // ── 4c-bare-ok. HELPER_REQUIRED_PATTERN — bare-arrow correct form matches ─
  it("HELPER_REQUIRED_PATTERN matches the correct filter form with a bare (non-parenthesised) callback parameter", () => {
    // If HELPER_REQUIRED_PATTERN were tightened to require parens around the
    // callback parameter (e.g. \(\w+\) instead of \(?\w+\)?), it would silently
    // stop recognising bare-arrow correct forms such as `e.hits.filter(t => t > c)`.
    // This test pins the bare-arrow correct form so that such a tightening is
    // caught at the export-level unit test before it reaches the full-body logic.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter(t => t > c)")).toBe(true);
  });

  // ── 4c-bare-neg. HELPER_REQUIRED_PATTERN — bare-arrow relaxed form not matched
  it("HELPER_REQUIRED_PATTERN does NOT match the relaxed filter form with a bare (non-parenthesised) callback parameter", () => {
    // The bare-arrow relaxed form (>=) must never be accepted as correct.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter(t => t >= c)")).toBe(false);
  });

  // ── 4b-index-ok. HELPER_REQUIRED_PATTERN — while-loop index flexibility ───
  it("HELPER_REQUIRED_PATTERN matches the while-loop correct form with a single-letter index variable (e.hits[i] <= c)", () => {
    // If the \w+ bracket expression were tightened to a literal form (e.g. \[lo\]),
    // it would silently stop accepting helpers that use a differently-named index
    // variable such as `i`.  This test pins the flexibility of the bracket
    // expression in the while-loop arm so that such a tightening is caught before
    // it ships.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits[i] <= c")).toBe(true);
  });

  // ── 4b-index-neg. HELPER_REQUIRED_PATTERN — while-loop relaxed index form ─
  it("HELPER_REQUIRED_PATTERN does NOT match the while-loop relaxed form with a single-letter index variable (e.hits[i] < c)", () => {
    // The strictly-less-than form must never be accepted as correct, regardless
    // of what identifier is used as the bracket index.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits[i] < c")).toBe(false);
  });

  // ── 4b-index-forbidden-ok. HELPER_FORBIDDEN_PATTERN — non-standard index, relaxed form ─
  it("HELPER_FORBIDDEN_PATTERN matches the relaxed while-loop with a non-standard index variable (e.hits[i] < c)", () => {
    // If the \[\w+\] bracket expression in HELPER_FORBIDDEN_PATTERN were
    // tightened to a literal (e.g. \[lo\]), it would silently stop catching
    // relaxed while-loops written with any other index name (e.g. `i`).
    // This test pins the flexibility of the bracket expression on the
    // forbidden side so that such a tightening is caught before it ships.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits[i] < c")).toBe(true);
  });

  // ── 4b-index-forbidden-neg. HELPER_FORBIDDEN_PATTERN — non-standard index, correct form ─
  it("HELPER_FORBIDDEN_PATTERN does NOT match the correct while-loop with a non-standard index variable (e.hits[i] <= c)", () => {
    // The inclusive (<= ) form must never be treated as a forbidden expression,
    // regardless of what identifier is used as the bracket index.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits[i] <= c")).toBe(false);
  });

  // ── 4x-callback-required-ok. HELPER_REQUIRED_PATTERN — non-standard callback name, correct form ─
  it("HELPER_REQUIRED_PATTERN matches the correct filter form with a non-standard callback name (x => x > c)", () => {
    // If the \w+ callback parameter in HELPER_REQUIRED_PATTERN's filter branch
    // were tightened to a literal (e.g. \bt\b), it would silently stop
    // recognising correct helpers written with any other callback name such as
    // `x`.  This test pins the flexibility of that expression so that such a
    // tightening is caught at the export-level unit test before it reaches
    // the full-body logic.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter(x => x > c)")).toBe(true);
  });

  // ── 4x-callback-required-neg. HELPER_REQUIRED_PATTERN — non-standard callback name, relaxed form not matched ─
  it("HELPER_REQUIRED_PATTERN does NOT match the relaxed filter form with a non-standard callback name (x => x >= c)", () => {
    // The relaxed form (>=) must never be accepted as correct, regardless of
    // what identifier is used as the callback parameter.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter(x => x >= c)")).toBe(false);
  });

  // ── 4x-callback-forbidden-ok. HELPER_FORBIDDEN_PATTERN — non-standard callback name, relaxed form flagged ─
  it("HELPER_FORBIDDEN_PATTERN matches the relaxed filter form with a non-standard callback name (x => x >= c)", () => {
    // If the \w+ callback parameter in HELPER_FORBIDDEN_PATTERN's filter branch
    // were tightened to a literal (e.g. \bt\b), it would silently stop catching
    // relaxed helpers written with any other callback name such as `x`.
    // This test pins the flexibility on the forbidden side so that such a
    // tightening is caught before it ships.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter(x => x >= c)")).toBe(true);
  });

  // ── 4x-callback-forbidden-neg. HELPER_FORBIDDEN_PATTERN — non-standard callback name, correct form not flagged ─
  it("HELPER_FORBIDDEN_PATTERN does NOT match the correct filter form with a non-standard callback name (x => x > c)", () => {
    // The correct form (strict >) must never be treated as a forbidden
    // expression, regardless of what identifier is used as the callback.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter(x => x > c)")).toBe(false);
  });

  // ── 4xp-callback-required-ok. HELPER_REQUIRED_PATTERN — parenthesised non-standard callback name, correct form ─
  it("HELPER_REQUIRED_PATTERN matches the correct parenthesised filter form with a non-standard callback name ((x) => x > c)", () => {
    // The \(? optional-paren branch covers `(x) => x > c`.  A future
    // tightening that hard-codes the callback variable only in the
    // parenthesised branch (e.g. `\(t\)` instead of `\(\w+\)`) would break
    // this case while leaving the bare-arrow tests passing.  This test pins
    // the parenthesised path for non-standard names so that such a regression
    // is caught at the export-level unit test before it reaches full-body logic.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter((x) => x > c)")).toBe(true);
  });

  // ── 4xp-callback-required-neg. HELPER_REQUIRED_PATTERN — parenthesised non-standard callback name, relaxed form not matched ─
  it("HELPER_REQUIRED_PATTERN does NOT match the relaxed parenthesised filter form with a non-standard callback name ((x) => x >= c)", () => {
    // The relaxed form (>=) must never be accepted as correct, regardless of
    // whether the callback parameter is parenthesised or what identifier is used.
    expect(HELPER_REQUIRED_PATTERN.test("e.hits.filter((x) => x >= c)")).toBe(false);
  });

  // ── 4xp-callback-forbidden-ok. HELPER_FORBIDDEN_PATTERN — parenthesised non-standard callback name, relaxed form flagged ─
  it("HELPER_FORBIDDEN_PATTERN matches the relaxed parenthesised filter form with a non-standard callback name ((x) => x >= c)", () => {
    // A future tightening that hard-codes the callback variable only in the
    // parenthesised branch of HELPER_FORBIDDEN_PATTERN (e.g. `\(t\)` instead
    // of `\(\w+\)`) would silently stop flagging relaxed helpers that use any
    // callback name other than `t` with parens.  This test pins the
    // flexibility of the parenthesised path on the forbidden side.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter((x) => x >= c)")).toBe(true);
  });

  // ── 4xp-callback-forbidden-neg. HELPER_FORBIDDEN_PATTERN — parenthesised non-standard callback name, correct form not flagged ─
  it("HELPER_FORBIDDEN_PATTERN does NOT match the correct parenthesised filter form with a non-standard callback name ((x) => x > c)", () => {
    // The correct form (strict >) must never be treated as a forbidden
    // expression, regardless of whether the parameter is parenthesised or
    // what identifier is used as the callback.
    expect(HELPER_FORBIDDEN_PATTERN.test("e.hits.filter((x) => x > c)")).toBe(false);
  });

  // ── 4xp-callback-integration-ok. Full integration: helper uses (x) => x > c → ok:true ──
  it("returns ok:true when the helper body uses a parenthesised non-standard callback with the correct comparison ((x) => x > c)", async () => {
    // This integration test exercises checkProbeEvictionGuard() end-to-end with
    // the combined case that pattern tests alone cannot catch: a parenthesised
    // callback parameter AND a non-standard callback name together.  A future
    // tightening of buildHelperScanPatterns that hard-codes the callback variable
    // only inside the parenthesised branch (e.g. `\(t\)` instead of `\(\w+\)`)
    // would pass the export-level pattern tests for `(t) => t > c` but silently
    // fail this case.
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
        `  e.hits = e.hits.filter((x) => x > c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4xp-callback-integration-fail. Full integration: helper uses (x) => x >= c → ok:false ──
  it("returns ok:false with a relaxed-comparison reason when the helper body uses a parenthesised non-standard callback with the relaxed comparison ((x) => x >= c)", async () => {
    // Mirror of the previous test with >= instead of >.  A future tightening
    // that hard-codes the callback variable only in the parenthesised forbidden
    // branch would silently stop catching this regression when the callback name
    // is not `t`.  Reason must cite the helper name and match /relaxed eviction comparison/i.
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
        `  e.hits = e.hits.filter((x) => x >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4o. Helper body: filter arrow split across lines (correct form) → ok:true
  it("returns ok:true when the helper body uses a filter arrow split across lines (correct form)", async () => {
    // A formatter that enforces a short line-length limit might split:
    //   e.hits = e.hits.filter((t) => t > c);
    // into:
    //   e.hits = e.hits.filter((t) =>
    //     t > c);
    //
    // The per-line scan in scanHelperBody() matches neither individual line.
    // The full-body fallback joins all body lines into a single string and
    // re-tests, so \s* spanning the newline correctly recognises the form.
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
        `  e.hits = e.hits.filter((t) =>`,
        `    t > c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4p. Helper body: filter arrow split across lines (relaxed form) → ok:false
  it("returns ok:false with the relaxed-form error when the helper body uses a split filter arrow with >= (relaxed)", async () => {
    // Same formatter-split scenario as 4o, but with >= instead of >.
    // The full-body forbidden check catches it even though neither line
    // matches the forbidden pattern on its own.
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
        `  e.hits = e.hits.filter((t) =>`,
        `    t >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
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

  // ── 4v + 4w. Branch-isolation pair ──────────────────────────────────────
  //
  // scanHelperBody() contains TWO independent full-body fallback branches:
  //
  //   if (!requiredFound && required.test(bodyText))  requiredFound = true;
  //   if (forbiddenLines.length === 0 && forbidden.test(bodyText))  forbiddenInFullBody = true;
  //
  // A future refactor might keep only one of the two (e.g. running only
  // `forbidden.test(bodyText)` and deleting the `required.test` check).
  // 4v catches that for the required branch, 4w catches it for the forbidden
  // branch; together they mean both branches must remain active.
  //
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

  // ── 4v2 + 4w2. OR-guard isolation pair ──────────────────────────────────
  //
  // The outer condition that gates the full-body fallback block is:
  //
  //   if (!requiredFound || forbiddenLines.length === 0) { … }
  //
  // A future refactor might tighten this to AND (&&), meaning the block only
  // runs when BOTH per-line scans found nothing.  This would silently skip the
  // full-body forbidden check whenever the per-line pass had already set
  // requiredFound=true, even though a split forbidden form is still lurking in
  // the joined body text.
  //
  // 4v2 catches that regression for the forbidden branch: the helper's correct
  // form is visible per-line (requiredFound=true), while the forbidden form is
  // split across two lines so the per-line scan misses it (forbiddenLines=[]).
  // With the OR guard the full-body forbidden branch fires and the check
  // returns ok:false.  With AND the branch is skipped and the check silently
  // returns ok:true — 4v2 catches that.
  //
  // ── 4v2. Helper: correct form on one line, forbidden split → ok:false ────
  it("returns ok:false when the helper body has the correct form on one line but the forbidden split form also present (full-body forbidden branch must fire despite requiredFound=true)", async () => {
    // The per-line scan sees the while-loop correct form on its own line and
    // sets requiredFound=true.  It does NOT see the relaxed filter form because
    // that is split across two lines:
    //
    //   e.hits = e.hits
    //     .filter((t) => t >= c);
    //
    // The outer guard is `if (!requiredFound || forbiddenLines.length === 0)`.
    // Because forbiddenLines is still empty the OR fires and the full-body
    // forbidden branch runs, joining the helper's lines and matching the split
    // relaxed pattern → forbiddenInFullBody=true → ok:false with the relaxed-
    // eviction error message.
    //
    // If the guard were narrowed to AND the branch would be skipped
    // (!requiredFound is false) and the split forbidden form would go undetected,
    // making the check return ok:true — a silent miss that this test catches.
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

  // ── 4x. Helper uses a for-loop with correct comparison → ok:false ─────────
  it("returns ok:false with the helper-extraction message when the helper body uses a for-loop eviction", async () => {
    // A developer might rewrite eviction as a for-loop that collects
    // surviving hits into a new array, e.g.:
    //
    //   const kept = [];
    //   for (let i = 0; i < e.hits.length; i++) {
    //     if (e.hits[i] > c) kept.push(e.hits[i]);
    //   }
    //   e.hits = kept;
    //
    // This is semantically equivalent to e.hits.filter(t => t > c) and
    // therefore correct — but HELPER_REQUIRED_PATTERN only recognises:
    //   • the while-loop idiom:  <param>.hits[<idx>] <= <cutoff>
    //   • the filter idiom:      <param>.hits.filter(... => ... > <cutoff>)
    //
    // The for-loop uses `e.hits[i] > c` as a keep-condition, not `<= c`,
    // and does not call .filter(), so it matches neither branch of
    // HELPER_REQUIRED_PATTERN.  The check must therefore fail with the
    // "extracted into helper / update REQUIRED_PATTERN" message.
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
        `  const kept = [];`,
        `  for (let i = 0; i < e.hits.length; i++) {`,
        `    if (e.hits[i] > c) kept.push(e.hits[i]);`,
        `  }`,
        `  e.hits = kept;`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // Must cite the helper and direct the developer to update REQUIRED_PATTERN.
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
    expect(result.reason).toMatch(/update REQUIRED_PATTERN/i);
  });

  // ── 4y. Opt-in flag guard (ok:true): split correct form, full param names ─
  it("returns ok:true when the helper body splits the correct filter form across lines using full-length param names (full-body fallback must be unconditional)", async () => {
    // Guard against a future refactor that gates the full-body fallback behind
    // an opt-in flag.  The helper body below has NO single-line form of the
    // eviction comparison — the per-line scan finds nothing.  Only the
    // full-body fallback (joining helperLines with "\n" and re-applying the
    // param-specific required pattern) can detect the split chain:
    //
    //   entry.hits = entry.hits
    //     .filter((t) => t > cutoff);
    //
    // If the fallback were gated behind a flag that defaults to false, this
    // test would fail with the helper-extraction "no correct eviction" message.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(entry, cutoff) {`,
        `  entry.hits = entry.hits`,
        `    .filter((t) => t > cutoff);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4aa. Full-body fallback — split while-loop condition → ok:true ──────────
  it("returns ok:true when the helper body splits the while-loop condition so that '<= c' lands on its own line (helper full-body fallback must activate)", async () => {
    // Guard against a future refactor that activates the helper full-body
    // fallback only for the filter form but forgets the while-loop branch.
    //
    // The helper uses short parameter names (e, c) so that the global Phase 1
    // REQUIRED_PATTERN ("entry.hits[lo] <= cutoff") cannot match — Phase 1 is
    // entirely bypassed.  The while-loop comparison is then split across two
    // lines so the per-line helper scan also finds nothing:
    //
    //   while (lo < e.hits.length &&
    //     e.hits[lo] <=
    //     c) lo++;
    //
    // No single line contains both "e.hits[lo] <=" AND "c", so requiredFound
    // stays false after the per-line pass.  Only the helper full-body fallback
    // (joining helperLines with "\n" and testing the param-specific required
    // pattern "\be\b\.hits\[\w+\]\s*<=\s*\bc\b", whose \s* spans the newline)
    // can return requiredFound=true and ultimately ok:true.
    //
    // If the fallback were restricted to the filter form only, this test would
    // fail with the helper-extraction "no correct eviction" message.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(e, c) {`,
        `  let lo = 0;`,
        `  while (lo < e.hits.length &&`,
        `    e.hits[lo] <=`,
        `    c) lo++;`,
        `  e.hits.splice(0, lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4ab. Full-body fallback — split while-loop, wrong comparator → ok:false ─
  it("returns ok:false when the split while-loop in the helper uses strictly-less-than (< c instead of <= c), detected by the helper forbidden full-body fallback", async () => {
    // Confirms the helper full-body fallback is SELECTIVE for the while-loop
    // branch: it only promotes requiredFound=true when the param-specific
    // required pattern (which requires <=) matches the joined body text.
    //
    // The helper again uses short param names (e, c) so Phase 1 cannot match.
    // The split condition uses < instead of <=:
    //
    //   while (lo < e.hits.length &&
    //     e.hits[lo] <
    //     c) lo++;
    //
    // The per-line scan finds nothing.  The helper forbidden full-body fallback
    // ("\be\b\.hits\[\w+\]\s*<(?!=)\s*\bc\b", \s* spanning the newline) sets
    // forbiddenInFullBody=true, producing ok:false with the relaxed-comparison
    // message attributed to the helper (not the global pattern).
    //
    // If the fallback unconditionally returned ok:true for any split while-loop
    // form, this test would catch that regression.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(e, c) {`,
        `  let lo = 0;`,
        `  // BUG: < instead of <= causes the hit at exactly cutoff to survive`,
        `  while (lo < e.hits.length &&`,
        `    e.hits[lo] <`,
        `    c) lo++;`,
        `  e.hits.splice(0, lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // forbiddenInFullBody=true → location note says "inside helper" (no line number)
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toMatch(/inside helper.*evictOldHits/i);
  });

  // ── 4ac. Full-body fallback — split while-loop with non-standard index name → ok:true ─
  it("returns ok:true when the helper's split while-loop uses a non-standard index variable name (e.g. 'idx' instead of 'lo')", async () => {
    // Guards against a future refactor that only accepts a specific index
    // variable name (e.g. hard-coded "lo") in the helper full-body fallback.
    // The pattern uses \w+ for the index position, so any identifier must be
    // accepted.
    //
    // The helper uses a non-standard index name ("idx") and splits the
    // while-loop condition across three lines so neither the global Phase 1
    // pattern nor the per-line helper scan can match:
    //
    //   while (idx < e.hits.length &&
    //     e.hits[idx] <=
    //     c) idx++;
    //
    // Only the helper full-body fallback (\be\b\.hits\[\w+\]\s*<=\s*\bc\b,
    // with \s* spanning the newline) must promote requiredFound=true.
    //
    // If the implementation hard-coded "lo" (or any single name), this test
    // would fail with the helper-extraction "no correct eviction" message.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(e, c) {`,
        `  let idx = 0;`,
        `  while (idx < e.hits.length &&`,
        `    e.hits[idx] <=`,
        `    c) idx++;`,
        `  e.hits.splice(0, idx);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 4ad. Full-body fallback — split while-loop against unrelated array → ok:false ─
  it("returns ok:false with the helper-extraction message when the split while-loop in the helper scans an unrelated array (not .hits)", async () => {
    // Confirms the full-body fallback is SELECTIVE: it only promotes
    // requiredFound=true when the joined body text matches the param-specific
    // required pattern, which requires the entry parameter followed by ".hits".
    //
    // A helper that splits its while-loop condition across lines but iterates
    // over an unrelated array (e.data instead of e.hits) must still produce
    // ok:false — the pattern \be\b\.hits\[\w+\]\s*<=\s*\bc\b will not match
    // "e.data[idx]".
    //
    // This closes the gap where a creative but incorrect refactor could slip
    // past the full-body fallback by splitting a condition that looks
    // superficially similar but touches the wrong array.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(e, c) {`,
        `  let idx = 0;`,
        `  // BUG: iterates e.data instead of e.hits`,
        `  while (idx < e.data.length &&`,
        `    e.data[idx] <=`,
        `    c) idx++;`,
        `  e.hits.splice(0, idx);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictOldHits");
    expect(result.reason).toMatch(/no correct eviction comparison|update REQUIRED_PATTERN/i);
  });

  // ── 4ae. Full-body fallback — non-standard index name AND wrong comparator together → ok:false ─
  it("returns ok:false with the relaxed-comparison message when the helper's split while-loop uses BOTH a non-standard index name (idx) AND the wrong comparator (<)", async () => {
    // Guards against a combined mutation that 4ac and 4ad test separately but
    // not together:
    //   • 4ac confirms "idx" with correct "<=" is accepted (ok:true)
    //   • 4ab confirms "lo" with wrong "<" is rejected (ok:false)
    //   • THIS test confirms "idx" with wrong "<" is also rejected (ok:false)
    //
    // The helper splits the condition across three lines so neither the global
    // Phase 1 pattern nor the per-line helper scan fires:
    //
    //   while (idx < e.hits.length &&
    //     e.hits[idx] <
    //     c) idx++;
    //
    // The full-body forbidden pattern \be\b\.hits\[\w+\]\s*<(?!=)\s*\bc\b must
    // match when \s* consumes the newline + indentation between "<" and "c".
    // The \w+ wildcard must accept "idx" — if it were hard-coded to "lo" the
    // pattern would miss the violation and return ok:true instead.
    //
    // Expected outcome: ok:false, reason contains "Relaxed eviction comparison"
    // and "split across lines", attributed to helper "evictOldHits".
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(e, c) {`,
        `  let idx = 0;`,
        `  // BUG: wrong comparator < instead of <=`,
        `  while (idx < e.hits.length &&`,
        `    e.hits[idx] <`,
        `    c) idx++;`,
        `  e.hits.splice(0, idx);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toMatch(/split across lines/i);
    expect(result.reason).toContain("evictOldHits");
  });

  // ── 4af. Full-body fallback — filter with non-standard callback name AND wrong comparator → ok:false ─
  it("returns ok:false with the relaxed-comparison message when the helper's filter uses BOTH a non-standard callback name (x) AND the wrong comparator (>=)", async () => {
    // Guards against a combined mutation that existing filter tests do not cover:
    //   • 4e confirms HELPER_FORBIDDEN_PATTERN rejects any param name at pattern level
    //   • 4p confirms the relaxed split filter form is caught at integration level
    //   • THIS test confirms that non-standard callback "x" WITH wrong ">=" is also
    //     rejected at integration level (ok:false) even when split across lines.
    //
    // A future refactor that hard-codes the callback variable name (e.g. "t") inside
    // HELPER_FORBIDDEN_PATTERN's filter branch would pass 4p (which uses "t") but
    // silently miss this combined mutation, returning ok:true instead of ok:false.
    //
    // The helper splits the arrow body across two lines so neither line alone
    // triggers the per-line scan:
    //
    //   e.hits = e.hits.filter((x) =>
    //     x >= c);
    //
    // The full-body forbidden pattern must match when \s* consumes the newline
    // between "(x) =>" and "x >= c", and \w+ must accept "x" as the callback.
    //
    // Expected outcome: ok:false, reason contains "Relaxed eviction comparison",
    // "split across lines", and is attributed to helper "evictOldHits".
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(e, c) {`,
        `  // BUG: non-standard callback name 'x' with wrong '>=' comparator`,
        `  e.hits = e.hits.filter((x) =>`,
        `    x >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toMatch(/split across lines/i);
    expect(result.reason).toContain("evictOldHits");
  });

  // ── 4z. Opt-in flag guard (ok:false): split form, wrong comparator ────────
  it("returns ok:false with the helper-extraction message when the split filter body uses a wrong comparator (t !== cutoff) that matches neither required nor forbidden", async () => {
    // Confirms the full-body fallback is SELECTIVE: it only promotes
    // requiredFound=true when the param-specific required pattern actually
    // matches the joined body text.  A helper that uses the wrong comparator
    // must still produce ok:false, not a false-positive ok:true, regardless of
    // whether the comparator appears on one line or is split across two.
    //
    // If the fallback were unconditionally returning ok:true for any split
    // form, this test would catch that regression.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  evictOldHits(entry, cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
        ``,
        `function evictOldHits(entry, cutoff) {`,
        `  // BUG: !== is neither the correct (>) nor the relaxed (>=) comparator`,
        `  entry.hits = entry.hits`,
        `    .filter((t) => t !== cutoff);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictOldHits");
    expect(result.reason).toMatch(/no correct eviction comparison|update REQUIRED_PATTERN/i);
  });

  // ── 4inline-for-relaxed. Helper body: inline for-loop uses relaxed < operator → ok:false
  it("returns ok:false (relaxed eviction comparison) when the helper body contains an inline for-loop whose condition uses e.hits[i] < c (strictly-less-than)", async () => {
    // A developer might write the eviction loop inside a helper as a for-loop
    // and accidentally use the relaxed operator:
    //
    //   for (; i < e.hits.length && e.hits[i] < c; i++) {}
    //   e.hits = e.hits.slice(i);
    //
    // `e.hits[i] < c` keeps a hit whose timestamp equals exactly (now − WINDOW_MS),
    // silently inflating the in-window counter by 1.
    //
    // HELPER_FORBIDDEN_PATTERN must catch `e.hits[i] < c` even when it is
    // followed by `;` (the for-loop separator) rather than `)`.  The pattern
    // `\w+\.hits\[\w+\]\s*<(?!=)\s*\w+` has no lookahead that would let a
    // trailing `;` suppress the match — the relaxed operator is flagged
    // regardless of what follows the cutoff operand.
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
        `  let i = 0;`,
        `  for (; i < e.hits.length && e.hits[i] < c; i++) {}`,
        `  e.hits = e.hits.slice(i);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4aa. Helper body: for-loop condition contains e.hits[i] <= c but body never mutates hits → ok:false
  it("returns ok:false when the helper body has a for-loop with e.hits[i] <= c in the condition but never mutates the hits array", async () => {
    // A for-loop written as:
    //   for (; i < e.hits.length && e.hits[i] <= c; i++) {}
    // contains the substring `e.hits[i] <= c`, which superficially matches the
    // while-loop branch of HELPER_REQUIRED_PATTERN.  However, the loop body is
    // empty — `e.hits` is never sliced or reassigned — so no eviction actually
    // occurs.
    //
    // The culprit is that HELPER_REQUIRED_PATTERN previously matched
    // `\w+\.hits\[\w+\]\s*<=\s*\w+` without regard to syntactic context.  In
    // the for-loop the cutoff operand is immediately followed by `;` (the
    // for-loop separator), whereas in the canonical while-loop form it is
    // followed by `)`.  HELPER_REQUIRED_PATTERN now includes a negative
    // lookahead `(?!\s*;)` after the cutoff token, which rejects the for-loop-
    // condition form and ensures that the presence of the comparison substring
    // alone is insufficient to pass the guard.
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
        `  let i = 0;`,
        `  for (; i < e.hits.length && e.hits[i] <= c; i++) {}`,
        `  // hits array never reassigned — eviction is absent`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // Must cite the helper and direct the developer to update REQUIRED_PATTERN.
    expect(result.reason).toMatch(/extracted into helper/i);
    expect(result.reason).toContain("evictStaleHits");
    expect(result.reason).toMatch(/update REQUIRED_PATTERN/i);
  });

  // ── 4split-for-relaxed. Helper body: for-loop relaxed condition split across two lines → ok:false
  it("returns ok:false (relaxed eviction comparison, citing helper) when the helper body has a for-loop whose relaxed '< c' condition is split across two lines", async () => {
    // A formatter may wrap a long for-loop condition so that the cutoff operand
    // ends up on its own line:
    //
    //   for (; i < e.hits.length && e.hits[i] <
    //       c; i++) {}
    //
    // The per-line scan sees only `e.hits[i] <` on one line and `c; i++) {}`
    // on the next, so neither line alone triggers HELPER_FORBIDDEN_PATTERN.
    // The full-body fallback joins the helper lines with "\n" and applies the
    // param-specific forbidden pattern, which uses \s* between `<(?!=)` and
    // the cutoff token so that the newline + indentation between them is
    // consumed.  The match must still fire, and the result must be ok:false
    // with a reason that cites both "relaxed eviction comparison" and the
    // helper name.
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
        `  let i = 0;`,
        `  for (; i < e.hits.length && e.hits[i] <`,
        `      c; i++) {}`,
        `  e.hits = e.hits.slice(i);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
  });

  // ── 4split-for-correct. Helper body: for-loop correct condition split across two lines → ok:false
  it("returns ok:false (helper-extraction message) when the helper body has a for-loop whose correct '<= c' condition is split across two lines", async () => {
    // A formatter may wrap a long for-loop condition so that the cutoff
    // operand ends up on the next line:
    //
    //   for (; i < e.hits.length && e.hits[i] <=
    //       c; i++) {}
    //
    // This uses the CORRECT comparator (<=), so HELPER_FORBIDDEN_PATTERN does
    // not fire.  However, after the newline is consumed by \s*, the joined
    // text reads `e.hits[i] <= c;` — the cutoff token `c` is immediately
    // followed by `;` (the for-loop separator).  The negative lookahead
    // `(?!\s*;)` in HELPER_REQUIRED_PATTERN therefore rejects the match.
    //
    // This is intentional: a for-loop condition expresses the keep/discard
    // threshold but the body must separately mutate e.hits.  The guard only
    // accepts the while-loop or filter form as proof of correct eviction, so
    // the result is ok:false with the helper-extraction "no correct eviction
    // comparison" message — not a relaxed-comparison error.
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
        `  let i = 0;`,
        `  for (; i < e.hits.length && e.hits[i] <=`,
        `      c; i++) {}`,
        `  e.hits = e.hits.slice(i);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    // The negative lookahead blocks the for-loop form even with the correct
    // comparator — the check fails with the helper-extraction message, not
    // the relaxed-comparison message.
    expect(result.reason).toMatch(/no correct eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
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
//   5i — three-line combined split at the inline level (correct form) → ok:true
//        A formatter that applies BOTH the method-chain split AND the arrow-body
//        split at the same time produces:
//          entry.hits = entry.hits
//            .filter((t) =>
//              t > cutoff);
//        REQUIRED_PATTERN has \s* before \.filter AND \s* between => and \w+,
//        so the full-source fallback pass consumes both newlines and recognises
//        the three-line form.
//   5j — three-line combined split at the inline level (relaxed form) → ok:false
//        The same three-line layout with >= cutoff must be caught by
//        FORBIDDEN_PATTERN, which has the same \s* spans and therefore detects
//        the relaxed comparator across line boundaries.
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

  // ── 5f. While-loop two-part split: 'entry.hits[lo]' on one line, '<= cutoff' on the next → ok:true
  it("returns ok:true when the while-loop condition is split so that '<= cutoff' lands on the next line (symmetric two-part split)", async () => {
    // The symmetric counterpart to test 5e.  A formatter may split:
    //   while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;
    // the other way, wrapping after `entry.hits[lo]` so that the operator and
    // right-hand operand begin the next line:
    //   while (lo < entry.hits.length &&
    //     entry.hits[lo]
    //     <= cutoff) lo++;
    //
    // REQUIRED_PATTERN's while-loop branch is `entry\.hits\[lo\]\s*<=\s*cutoff`.
    // \s* matches \n and any surrounding whitespace, so the full-source fallback
    // pass recognises `entry.hits[lo]\n    <= cutoff` even though the two tokens
    // straddle a line break.  The check therefore returns ok:true.
    //
    // Cross-reference: test 5e covers the case where `entry.hits[lo] <=` ends
    // one line and `cutoff` begins the next.  Both two-part splits are handled
    // by the full-source pass for the same reason (\s* spans newlines).
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
    // The full-source fallback pass joins all lines and matches the split
    // expression via \s* spanning the newline.
    expect(result.ok).toBe(true);
  });

  // ── 5g. Inline bare-arrow split (correct form) → ok:true ──────────────────
  it("returns ok:true when the inline filter uses a bare (non-parenthesised) arrow split across two lines (correct form)", async () => {
    // A formatter may split `entry.hits.filter(t => t > cutoff)` — using the
    // bare (non-parenthesised) callback parameter — across two lines:
    //
    //   entry.hits = entry.hits.filter(t =>
    //     t > cutoff);
    //
    // REQUIRED_PATTERN's filter branch uses \(? making the opening paren for
    // the callback parameter optional, and \s* between `=>` and `t` spans the
    // newline.  The full-source fallback pass therefore recognises the bare
    // arrow split form and returns ok:true.
    //
    // Cross-reference: tests 6h/6i cover the same bare-arrow split form inside
    // an extracted helper body.  This test (5g) confirms the inline path is also
    // covered so that a future change narrowing REQUIRED_PATTERN to require
    // parentheses would be caught here before it ships.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits.filter(t =>`,
        `    t > cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 5h. Inline bare-arrow split (relaxed form) → ok:false (relaxed) ────────
  it("returns ok:false with the relaxed-form error when the inline filter uses a bare arrow split with the relaxed comparator", async () => {
    // The relaxed counterpart to test 5g.  A formatter may produce:
    //
    //   entry.hits = entry.hits.filter(t =>
    //     t >= cutoff);
    //
    // FORBIDDEN_PATTERN likewise uses \(? and \s* between `=>` and `t`, so
    // the full-source fallback pass detects the relaxed bare-arrow split and
    // emits the "relaxed eviction comparison" error rather than the generic
    // "no correct eviction guard found" message.
    //
    // Cross-reference: test 5b covers the same relaxed split using the
    // parenthesised `(t) =>` form.  This test (5h) confirms the bare form
    // is also caught so that a future narrowing of FORBIDDEN_PATTERN to require
    // parentheses would be detected here.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits.filter(t =>`,
        `    t >= cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
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
//
//   6f — BOTH splits at once (correct):  e.hits = e.hits\n  .filter((t) =>\n    t > c);
//        → ok:true.  The \s* before \.filter consumes the first newline and the
//        \s* between => and \w+ consumes the second; the full-body fallback
//        recognises the combined three-line form.
//   6g — BOTH splits at once (relaxed):  e.hits = e.hits\n  .filter((t) =>\n    t >= c);
//        → ok:false with "relaxed eviction comparison".  Both \s* spans apply
//        equally to the forbidden pattern so the combined split is caught.
// ═══════════════════════════════════════════════════════════════════════════

describe("multi-line helper body (formatter-split condition inside extracted helper)", () => {
  // ── 6a. Helper body has while-loop condition split across two lines → ok:true
  it("returns ok:true when the helper body splits 'e.hits[lo] <= c' across two lines (full-body fallback in scanHelperBody)", async () => {
    // A formatter enforcing a strict line-length limit might wrap:
    //   while (lo < e.hits.length && e.hits[lo] <= c) lo++;
    // inside the helper body into a two-part split:
    //   while (lo < e.hits.length && e.hits[lo] <=
    //     c) lo++;
    //
    // The per-line scan inside scanHelperBody() does not match either partial
    // line on its own.  However, the full-body fallback joins all extracted body
    // lines into a single string and re-applies the param-specific required
    // pattern.  The pattern uses \s* between tokens and \s matches \n, so
    // `e\.hits\[\w+\]\s*<=\s*\bc\b` recognises `e.hits[lo] <=\n    c` across
    // the line boundary.  The check therefore returns ok:true.
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

  // ── 6b. Brace-wrapped while-loop body inside extracted helper → ok:true ─────
  it("returns ok:true when a brace-style formatter wraps the while-loop body in braces on a new line inside the extracted helper", async () => {
    // A formatter enforcing a "braces required" style rule may rewrite the
    // helper body from:
    //   while (lo < e.hits.length && e.hits[lo] <= c) lo++;
    // to:
    //   while (lo < e.hits.length && e.hits[lo] <= c) {
    //     lo++;
    //   }
    //
    // The condition line (including `e.hits[lo] <= c`) is still fully present
    // on the opening while-line.  HELPER_REQUIRED_PATTERN matches
    // `\w+\.hits\[\w+\]\s*<=\s*\w+` independently of whatever follows the
    // closing `)`, so the per-line scan on the condition line returns a match
    // and the check passes without needing any fallback.
    //
    // Cross-reference: test 5h covers the same brace-wrapped layout at the
    // top-level recordProbe function where REQUIRED_PATTERN is used.  This
    // test covers the orthogonal case where the eviction logic has been
    // extracted into a helper and HELPER_REQUIRED_PATTERN is applied instead.
    // Both are safe because the patterns only inspect the token sequence inside
    // the condition — they do not require `lo++` to appear on the same line.
    // Any future tightening of HELPER_REQUIRED_PATTERN that accidentally
    // requires the loop body to follow on the condition line would be caught
    // here.
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
        `  while (lo < e.hits.length && e.hits[lo] <= c) {`,
        `    lo++;`,
        `  }`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The condition line `while (lo < e.hits.length && e.hits[lo] <= c) {`
    // contains the full token sequence `e.hits[lo] <= c`, so
    // HELPER_REQUIRED_PATTERN matches on the per-line scan → ok:true.
    expect(result.ok).toBe(true);
  });

  // ── 6c. Helper body has symmetric two-part split: '<= c' on its own line → ok:true
  it("returns ok:true when the helper body splits 'e.hits[lo]' from '<= c) lo++' across two lines (symmetric split — full-body fallback recognises it)", async () => {
    // The symmetric counterpart to test 6a.  A formatter enforcing a strict
    // line-length limit might wrap:
    //   while (lo < e.hits.length && e.hits[lo] <= c) lo++;
    // the OTHER way — breaking after `e.hits[lo]` so that the operator and
    // right-hand operand begin the next line:
    //   while (lo < e.hits.length && e.hits[lo]
    //     <= c) lo++;
    //
    // The per-line scan sees:
    //   line 1:  "  while (lo < e.hits.length && e.hits[lo]"  — no '<= c'
    //   line 2:  "    <= c) lo++;"                            — no 'e.hits[lo]'
    // so neither line matches HELPER_REQUIRED_PATTERN on its own.
    //
    // The full-body fallback pass in scanHelperBody() joins the helper lines
    // into a single string and applies the param-specific `required` pattern
    // built by buildHelperScanPatterns().  That pattern is:
    //   \be\b\.hits\[\w+\]\s*<=\s*\bc\b
    //
    // In the joined body string the relevant fragment is:
    //   "e.hits[lo]\n    <= c"
    //
    // \s* matches \n + indentation, so the full-body pattern spans the line
    // boundary and recognises the expression.  The check returns ok:true.
    //
    // This mirrors test 5f for the main source file, which showed that
    // REQUIRED_PATTERN's \s* also handles the symmetric split inline.
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
        `  // Formatter split the while-loop condition: '<= c' on its own line:`,
        `  while (lo < e.hits.length && e.hits[lo]`,
        `    <= c) lo++;`,
        `  if (lo > 0) e.hits = e.hits.slice(lo);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // CURRENT BEHAVIOUR: ok:true — the full-body fallback pass in scanHelperBody()
    // joins the helper lines and the param-specific required pattern's \s* consumes
    // the newline between `e.hits[lo]` and `<= c`, recognising the expression.
    expect(result.ok).toBe(true);
  });

  // ── 6d. Helper body splits filter arrow body to its own line (correct form) → ok:true
  it("returns ok:true when the helper body splits the filter arrow body 't > c' to its own line (full-body fallback recognises it)", async () => {
    // A formatter enforcing a strict arrow-body line-length limit may rewrite:
    //   e.hits = e.hits.filter((t) => t > c);
    // inside the helper body as:
    //   e.hits = e.hits.filter((t) =>
    //     t > c);
    //
    // The per-line scan inside scanHelperBody() sees:
    //   line 1:  "  e.hits = e.hits.filter((t) =>"  — no 't > c'
    //   line 2:  "    t > c);"                       — no 'e.hits.filter'
    // so neither line matches HELPER_REQUIRED_PATTERN on its own.
    //
    // The full-body fallback pass in scanHelperBody() joins the helper lines
    // into a single string and applies the param-specific `required` pattern
    // built by buildHelperScanPatterns().  For params (e, c) that pattern is:
    //
    //   \be\b\.hits\s*\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\s*>\s*\bc\b\s*\)
    //
    // The `\s*` between `=>` and `\w+` (the callback return value) matches
    // the newline + indentation, so the joined body text
    //   "e.hits = e.hits.filter((t) =>\n    t > c);"
    // satisfies the pattern.  The check therefore returns ok:true.
    //
    // Cross-reference: tests 5h and 6b cover brace-wrapped while-loop bodies
    // where the condition line is still intact.  This test covers the
    // orthogonal case where the FILTER form's arrow body is split to a new
    // line.  Any future tightening of HELPER_REQUIRED_PATTERN that accidentally
    // requires the comparator (`t > c`) to follow the arrow on the same line
    // would break this test and surface the regression before it ships.
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
        `  // Formatter split the filter arrow body to its own line:`,
        `  e.hits = e.hits.filter((t) =>`,
        `    t > c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The param-specific required pattern's \s* between `=>` and the callback
    // token spans the newline, so the full-body fallback pass recognises the
    // split form → ok:true.
    expect(result.ok).toBe(true);
  });

  // ── 6e. Helper body splits filter arrow body to its own line (relaxed form) → ok:false
  it("returns ok:false with the relaxed-form error when the helper body splits the filter arrow body 't >= c' to its own line", async () => {
    // The same formatter-split layout but with the relaxed comparator:
    //   e.hits = e.hits.filter((t) =>
    //     t >= c);
    //
    // The param-specific forbidden pattern built by buildHelperScanPatterns()
    // for params (e, c) is:
    //
    //   \be\b\.hits\s*\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\s*>=\s*\bc\b\s*\)
    //
    // The `\s*` between `=>` and `\w+` also matches the newline + indentation
    // in the relaxed form, so the full-body fallback pass detects the wrong
    // comparison and the check emits the "relaxed eviction comparison" error.
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
        `  // Relaxed form — formatter split the arrow body to its own line:`,
        `  e.hits = e.hits.filter((t) =>`,
        `    t >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The param-specific forbidden pattern's \s* between `=>` and the callback
    // token spans the newline, so the full-body fallback pass detects the
    // relaxed split form → ok:false with "relaxed eviction comparison" reason.
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });

  // ── 6f. Helper body has BOTH method-chain split AND arrow body split (correct form) → ok:true
  it("returns ok:true when the helper body has both the method-chain split and the arrow body split (three-line correct form)", async () => {
    // A formatter enforcing a very short line-length limit might produce both
    // splits at once, yielding the three-line form:
    //
    //   e.hits = e.hits
    //     .filter((t) =>
    //       t > c);
    //
    // The per-line scan inside scanHelperBody() sees three lines, none of which
    // matches the param-specific required pattern on its own:
    //   line 1:  "  e.hits = e.hits"               — no '.filter'
    //   line 2:  "    .filter((t) =>"               — no 't > c'
    //   line 3:  "      t > c);"                    — no 'e.hits.filter'
    //
    // The full-body fallback pass joins all helper lines into a single string
    // and applies the param-specific required pattern built by
    // buildHelperScanPatterns().  For params (e, c) that pattern is:
    //
    //   \be\b\.hits\s*\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\s*>\s*\bc\b\s*\)
    //
    // The `\s*` before `\.filter` consumes the first newline + indentation, and
    // the `\s*` between `=>` and `\w+` consumes the second.  The joined body
    // text therefore satisfies the pattern and the check returns ok:true.
    //
    // This test guards against a future refactor that breaks either of the two
    // `\s*` expansions inside buildHelperScanPatterns — if either one is
    // accidentally removed, this combined form would silently fail with the
    // "no correct eviction comparison" message instead of passing.
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
        `    .filter((t) =>`,
        `      t > c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // Both \s* spans in the param-specific required pattern consume the two
    // newlines in the three-line form → full-body fallback recognises it → ok:true.
    expect(result.ok).toBe(true);
  });

  // ── 6g. Helper body has BOTH method-chain split AND arrow body split (relaxed form) → ok:false
  it("returns ok:false with the relaxed-form error when the helper body has both splits but uses the relaxed comparator (>=)", async () => {
    // The same three-line layout as 6f but with the relaxed comparator:
    //
    //   e.hits = e.hits
    //     .filter((t) =>
    //       t >= c);
    //
    // The param-specific forbidden pattern built by buildHelperScanPatterns()
    // for params (e, c) is:
    //
    //   \be\b\.hits\s*\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\s*>=\s*\bc\b\s*\)
    //
    // The same two `\s*` spans that recognise the correct combined split apply
    // equally to the forbidden pattern, so the full-body fallback pass detects
    // the relaxed three-line form and emits the "relaxed eviction comparison"
    // error rather than the generic "no correct eviction comparison" message.
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
        `    .filter((t) =>`,
        `      t >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // Both \s* spans in the param-specific forbidden pattern consume the two
    // newlines → full-body fallback detects the relaxed combined split → ok:false.
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
    expect(result.reason).toContain("evictStaleHits");
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

  // ── 6h. Helper body uses a bare (non-parenthesised) arrow split across lines (correct form) → ok:true
  it("returns ok:true when the helper body uses a bare arrow 't =>' split across lines with the correct comparator (full-body fallback recognises it)", async () => {
    // A formatter may split the bare-parameter form:
    //   e.hits = e.hits.filter(t => t > c);
    // as:
    //   e.hits = e.hits.filter(t =>
    //     t > c);
    //
    // The per-line scan sees:
    //   line 1:  "  e.hits = e.hits.filter(t =>"  — no 't > c'
    //   line 2:  "    t > c);"                    — no 'e.hits.filter'
    // so neither line matches the param-specific required pattern on its own.
    //
    // buildHelperScanPatterns() uses \(?\w+\)? for the callback parameter,
    // which tolerates the bare (non-parenthesised) `t` just as well as `(t)`.
    // When the full-body fallback joins all helper lines into a single string,
    // the \s* between `=>` and `\w+` (the return token) spans the newline +
    // indentation, so the joined text satisfies the required pattern → ok:true.
    //
    // If a future tightening accidentally makes the optional-parens group
    // required (changing `\(?` to `\(`) this test surfaces the regression
    // before it ships.
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
        `  // Formatter split the bare-arrow filter to its own line:`,
        `  e.hits = e.hits.filter(t =>`,
        `    t > c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The \(? in the param-specific required pattern tolerates the bare `t`
    // without enclosing parens, and the \s* between `=>` and the return token
    // spans the newline → the full-body fallback recognises the form → ok:true.
    expect(result.ok).toBe(true);
  });

  // ── 6i. Helper body uses a bare (non-parenthesised) arrow split across lines (relaxed form) → ok:false
  it("returns ok:false with the relaxed-form error when the helper body uses a bare arrow 't =>' split across lines with the relaxed comparator (>= instead of >)", async () => {
    // The same formatter-split layout as 6h, but with >= instead of >:
    //   e.hits = e.hits.filter(t =>
    //     t >= c);
    //
    // The param-specific forbidden pattern built by buildHelperScanPatterns()
    // uses \(?\w+\)? (bare or parenthesised) and \s* between `=>` and `\w+`,
    // so it detects this relaxed split form when the full-body fallback applies
    // the pattern to the joined helper-body string.
    //
    // If a future tightening of the optional-parens group accidentally excluded
    // the bare form, the forbidden pattern would also miss it — returning
    // ok:false for the wrong reason (no guard found rather than relaxed form).
    // This test confirms the forbidden path also works correctly.
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
        `  // Relaxed bare-arrow form split across lines:`,
        `  e.hits = e.hits.filter(t =>`,
        `    t >= c);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    // The param-specific forbidden pattern's \(? and \s* together detect the
    // relaxed bare-arrow split form → ok:false with "relaxed eviction comparison".
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
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

  // ── 5i. Three-line combined split at inline level (correct form) → ok:true ─
  it("returns ok:true when the formatter applies both the method-chain split and the arrow-body split at the inline level (three-line correct form)", async () => {
    // A formatter applying both an aggressive method-chain rule AND a short
    // callback-body rule at the same time may rewrite:
    //   entry.hits = entry.hits.filter((t) => t > cutoff);
    // into the three-line combined split:
    //   entry.hits = entry.hits
    //     .filter((t) =>
    //       t > cutoff);
    //
    // This form combines the two splits tested in isolation by tests 5g and 5a:
    //   • 5g: method-chain split — entry.hits\n  .filter(…)
    //   • 5a: arrow-body split  — .filter((t) =>\n    t > cutoff)
    //
    // REQUIRED_PATTERN has \s* between entry\.hits and \.filter (consuming the
    // first newline) AND \s* between => and \w+ (consuming the second), so the
    // full-source fallback pass recognises the three-line form as correct.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits`,
        `    .filter((t) =>`,
        `      t > cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(true);
  });

  // ── 5j. Three-line combined split at inline level (relaxed form) → ok:false ─
  it("returns ok:false with the relaxed-form error when the three-line combined split uses >= cutoff at the inline level", async () => {
    // The same three-line combined split with the relaxed comparator:
    //   entry.hits = entry.hits
    //     .filter((t) =>
    //       t >= cutoff);
    //
    // FORBIDDEN_PATTERN has the same \s* spans before \.filter and between =>
    // and \w+, so the full-source fallback pass detects the relaxed form across
    // both line breaks and emits the "relaxed eviction comparison" error rather
    // than the generic "no correct eviction guard found" failure.
    mockReadFile.mockResolvedValue(
      [
        `function recordProbe(map, key, label, now) {`,
        `  let entry = map.get(key);`,
        `  const cutoff = now - WINDOW_MS;`,
        `  entry.hits = entry.hits`,
        `    .filter((t) =>`,
        `      t >= cutoff);`,
        `  entry.hits.push(now);`,
        `}`,
      ].join("\n"),
    );

    const result = await checkProbeEvictionGuard("/fake/traffic-logger.ts");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/relaxed eviction comparison/i);
  });
});
