/**
 * check-probe-eviction-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies that the eviction logic inside recordProbe() in
 * server/traffic-logger.ts still uses the correct (strictly-exclusive)
 * boundary comparison, regardless of which idiom is used to implement it.
 *
 * Why this matters:
 *   The window is defined as hits where timestamp > (now − WINDOW_MS), i.e.
 *   a hit at exactly the boundary instant is treated as expired and must be
 *   evicted.  Two equivalent idioms implement this correctly:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  WHILE-LOOP FORM (current)                                          │
 *   │    while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++; │
 *   │    entry.hits[lo] <= cutoff  ← evict if timestamp ≤ boundary        │
 *   │                                                                     │
 *   │  ARRAY-FILTER FORM (acceptable refactor)                            │
 *   │    entry.hits = entry.hits.filter(t => t > cutoff);                 │
 *   │    t > cutoff                ← keep if timestamp > boundary         │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   Both forms evict the boundary hit.  The following relaxed variants are
 *   WRONG and will silently inflate the in-window counter by 1:
 *
 *   ✗  entry.hits[lo] < cutoff          (while-loop, relaxed)
 *   ✗  entry.hits.filter(t => t >= cutoff) (filter, relaxed)
 *
 * ─── HOW TO UPDATE THIS GUARD ────────────────────────────────────────────────
 *   If you refactor the eviction logic, update REQUIRED_PATTERN and
 *   FORBIDDEN_PATTERN below to match your new idiom.  Guidance by form:
 *
 *   While-loop  →  keep "entry.hits[lo] <= cutoff" (inclusive <=).
 *                  REQUIRED_PATTERN already matches this.
 *
 *   Array.filter →  keep "entry.hits.filter(t => t > cutoff)" (strict >).
 *                   REQUIRED_PATTERN already matches this.
 *
 *   Any other idiom must satisfy the same invariant:
 *     "a hit whose timestamp equals exactly (now − WINDOW_MS) is evicted."
 *     Add the new idiom's required form to REQUIRED_PATTERN (as an
 *     alternation) and add its relaxed/wrong form to FORBIDDEN_PATTERN.
 *
 *   Quick rule: if your expression KEEPS boundary hits, it is wrong.
 *     Wrong:  hits[lo] < cutoff         (keeps hit at exactly cutoff)
 *     Wrong:  filter(t => t >= cutoff)  (keeps hit at exactly cutoff)
 *
 * ─── HELPER-FUNCTION EXTRACTION ──────────────────────────────────────────────
 *   If you extract the eviction logic into a named helper (e.g.
 *   `evictStaleHits(entry, cutoff)`), REQUIRED_PATTERN will no longer match
 *   any line inside recordProbe() because the helper uses its own parameter
 *   names.  This script handles that case automatically:
 *
 *   1. It detects a delegating call of the form  evict*(entry, cutoff)  inside
 *      the source file (HELPER_DELEGATION_PATTERN).
 *   2. It extracts the helper's name and locates its definition in the same
 *      file.
 *   3. It then scans the helper's body with equivalent patterns that accept
 *      ANY single-word parameter name in place of "entry" and "cutoff", and
 *      that accept both bare and parenthesised arrow parameters
 *      (HELPER_REQUIRED_PATTERN / HELPER_FORBIDDEN_PATTERN).
 *
 *   IMPORTANT: helper forbidden checks are applied regardless of whether the
 *   inline REQUIRED_PATTERN is also present.  A correct inline expression does
 *   not excuse a wrong comparison inside a delegated helper — the helper IS
 *   the active code path and must be correct on its own.
 *
 *   If the helper body contains a correct comparison → the check passes.
 *   If the helper body contains a relaxed comparison → the check fails with
 *   the forbidden-form error.
 *   If the correct pattern is not found in the helper body → the check fails
 *   with a targeted message asking the developer to update REQUIRED_PATTERN
 *   to cover the helper's internal comparison.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What this script checks:
 *   1. server/traffic-logger.ts must contain at least one line matching
 *      REQUIRED_PATTERN (while-loop form OR filter form, both correct).
 *      OR: a helper delegation call (HELPER_DELEGATION_PATTERN) is present
 *      and that helper's body contains the correct pattern under any param
 *      names (HELPER_REQUIRED_PATTERN).
 *   2. No line may match FORBIDDEN_PATTERN (relaxed comparisons that keep
 *      the boundary hit) — whether inline or inside a helper.
 *      Helper forbidden checks run even when the inline REQUIRED_PATTERN is
 *      already satisfied.
 *
 * Exit codes:
 *   0 — guard is intact (correct form found, relaxed form absent)
 *   1 — guard is broken (correct form missing OR relaxed form detected)
 *
 * Runnable standalone:  npm run check:probe-eviction-guard
 * Also included in:     npm run test:all
 */

import { readFile } from "fs/promises";
import path from "path";

/** Path to the file under inspection, relative to the workspace root. */
export const TARGET_FILE = path.resolve("server", "traffic-logger.ts");

/**
 * Matches any CORRECT eviction expression in the eviction logic.
 * Two idioms are recognised:
 *
 *   While-loop form:   entry.hits[lo] <= cutoff
 *     (evict while timestamp is at-or-before the boundary)
 *
 *   Array-filter form: entry.hits.filter(t => t > cutoff)
 *                   or entry.hits.filter((t) => t > cutoff)
 *     (keep only timestamps strictly after the boundary)
 *     The callback parameter is optionally parenthesised so that formatters
 *     that add parens around single-argument arrows do not defeat the check.
 *
 * Both forms evict the boundary hit, which is the required behaviour.
 * If a new idiom is introduced, add it as a further alternation here.
 */
export const REQUIRED_PATTERN =
  /entry\.hits\[lo\]\s*<=\s*cutoff|entry\.hits\s*\.filter\(\s*\(?\s*t\s*\)?\s*=>\s*t\s*>\s*cutoff\s*\)/;

/**
 * Matches RELAXED (wrong) eviction expressions that silently keep the
 * boundary hit in the window.  Two relaxed idioms are covered:
 *
 *   While-loop relaxed:   entry.hits[lo] < cutoff   (strictly-less-than, no =)
 *   Array-filter relaxed: entry.hits.filter(t => t >= cutoff)  (>= keeps boundary)
 *                      or entry.hits.filter((t) => t >= cutoff)
 *
 * If a new idiom is introduced, add its relaxed/wrong form here too.
 */
export const FORBIDDEN_PATTERN =
  /entry\.hits\[lo\]\s*<(?!=)\s*cutoff|entry\.hits\s*\.filter\(\s*\(?\s*t\s*\)?\s*=>\s*t\s*>=\s*cutoff\s*\)/;

/**
 * Matches a call that delegates eviction to an extracted helper.
 *
 * Recognises:  evict<anything>(entry, cutoff)
 *   e.g.  evictStaleHits(entry, cutoff)
 *         evictHits(entry, cutoff)
 *         evictExpired(entry, cutoff)
 *
 * The captured group 1 is the helper function name.
 */
export const HELPER_DELEGATION_PATTERN =
  /\b(evict\w*)\s*\(\s*entry\s*,\s*cutoff\s*\)/;

/**
 * Matches any CORRECT eviction expression inside a helper function body,
 * where the parameter names may differ from "entry" / "cutoff".
 *
 * Covers the two canonical forms with ANY single-word identifiers:
 *
 *   While-loop form:   <anyParam>.hits[<anyVar>] <= <anyParam>
 *     e.g.  e.hits[lo] <= c    or   ent.hits[i] <= boundary
 *
 *   Array-filter form: <anyParam>.hits.filter(<anyVar> => <anyVar> > <anyParam>)
 *                   or <anyParam>.hits.filter((<anyVar>) => <anyVar> > <anyParam>)
 *     e.g.  e.hits.filter(t => t > c)
 *           e.hits.filter((t) => t > c)
 *
 * The callback parameter is optionally parenthesised (`\(?` … `\)?`) so
 * that formatters that add parens around single-argument arrows do not
 * defeat the check.
 *
 * This intentionally accepts any single-word identifier so that renaming
 * parameters does not defeat the check.
 */
export const HELPER_REQUIRED_PATTERN =
  /\w+\.hits\[\w+\]\s*<=\s*\w+|\w+\.hits\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\s*>\s*\w+\s*\)/;

/**
 * Matches RELAXED (wrong) eviction expressions inside a helper body,
 * regardless of parameter names.
 *
 * Covers:
 *   While-loop relaxed:   <anyParam>.hits[<anyVar>] < <anyParam>
 *   Array-filter relaxed: <anyParam>.hits.filter(<anyVar>  => <anyVar> >= <anyParam>)
 *                      or <anyParam>.hits.filter((<anyVar>) => <anyVar> >= <anyParam>)
 *
 * The callback parameter is optionally parenthesised so that formatters
 * adding parens around single-argument arrows do not bypass the check.
 */
export const HELPER_FORBIDDEN_PATTERN =
  /\w+\.hits\[\w+\]\s*<(?!=)\s*\w+|\w+\.hits\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\s*>=\s*\w+\s*\)/;

export interface CheckResult {
  ok: boolean;
  /** Human-readable explanation when ok === false. */
  reason?: string;
}

/**
 * Given the full array of source lines and a 0-based index pointing at the
 * first line of a function definition, returns the indices (inclusive) of the
 * lines that form that function's body.
 *
 * Uses brace-counting to find the matching closing `}`.  Returns null if the
 * function body cannot be determined (e.g. the function spans the end of the
 * file without closing).
 */
function extractFunctionBodyLines(
  lines: string[],
  startIndex: number,
): { start: number; end: number } | null {
  let depth = 0;
  let opened = false;
  for (let i = startIndex; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") {
        depth++;
        opened = true;
      } else if (ch === "}") {
        depth--;
        if (opened && depth === 0) {
          return { start: startIndex, end: i };
        }
      }
    }
  }
  return null;
}

/** Escape a string for literal use inside a RegExp source. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract the first two parameter names from a helper's definition signature.
 *
 * Handles plain JS and TypeScript-annotated forms:
 *   function evictX(e, c) { … }
 *   function evictX(e: ProbeEntry, c: number) { … }
 *   const evictX = (e, c) => { … }
 *   const evictX = (e: ProbeEntry, c: number) => { … }
 *   const evictX = function(e, c) { … }
 *
 * The optional `: Type` annotation after each name is consumed but not
 * captured.  Joins up to 6 lines to tolerate multi-line signatures.
 * Returns null when the parameter list cannot be parsed.
 */
function extractHelperParams(
  lines: string[],
  defIndex: number,
): [string, string] | null {
  const snippet = lines
    .slice(defIndex, Math.min(defIndex + 6, lines.length))
    .join(" ");
  // Capture the parameter name (first \w+ before an optional `: Type`) for
  // each of the first two parameters.
  const m = /\(\s*(\w+)(?:\s*:[^,)]+)?\s*,\s*(\w+)/.exec(snippet);
  if (!m) return null;
  return [m[1], m[2]];
}

/**
 * Build param-specific required / forbidden patterns for a helper body.
 *
 * `entryParam` is the helper's first argument (the ProbeEntry), and
 * `cutoffParam` is its second argument (the cutoff timestamp).
 *
 * The patterns verify that the comparison bound is actually the cutoff
 * parameter — not some unrelated identifier that happens to satisfy the
 * generic HELPER_REQUIRED_PATTERN.
 *
 * Arrow callback parameters are optionally parenthesised to tolerate
 * formatter-added parens.
 */
function buildHelperScanPatterns(
  entryParam: string,
  cutoffParam: string,
): { required: RegExp; forbidden: RegExp } {
  const ep = escapeRegExp(entryParam);
  const cp = escapeRegExp(cutoffParam);
  // Wrap both parameter tokens in word-boundary assertions (\b…\b) so that
  // short names like "e" or "c" do not accidentally match as substrings of
  // longer identifiers ("some" ending in "e", "cOther" starting with "c").
  return {
    required: new RegExp(
      `\\b${ep}\\b\\.hits\\[\\w+\\]\\s*<=\\s*\\b${cp}\\b` +
        `|\\b${ep}\\b\\.hits\\.filter\\(\\s*\\(?\\w+\\)?\\s*=>\\s*\\w+\\s*>\\s*\\b${cp}\\b\\s*\\)`,
    ),
    forbidden: new RegExp(
      `\\b${ep}\\b\\.hits\\[\\w+\\]\\s*<(?!=)\\s*\\b${cp}\\b` +
        `|\\b${ep}\\b\\.hits\\.filter\\(\\s*\\(?\\w+\\)?\\s*=>\\s*\\w+\\s*>=\\s*\\b${cp}\\b\\s*\\)`,
    ),
  };
}

/**
 * Scan a helper's body in `lines` and return the result.
 *
 * Uses param-specific patterns built from the helper signature so that
 * comparisons against unrelated identifiers are not accepted as correct.
 */
interface HelperScanResult {
  found: true;
  helperDefLine: number; // 1-based
  requiredFound: boolean;
  forbiddenLines: number[]; // 1-based
  /** false when brace-counting OR parameter extraction failed */
  bodyParsed: boolean;
}
interface HelperNotFound {
  found: false;
}
type HelperLookup = HelperScanResult | HelperNotFound;

function scanHelperBody(lines: string[], helperName: string): HelperLookup {
  const helperDefPattern = new RegExp(
    `(?:function\\s+${helperName}\\b|(?:const|let|var)\\s+${helperName}\\s*=)`,
  );

  let helperDefIndex: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (helperDefPattern.test(lines[i])) {
      helperDefIndex = i;
      break;
    }
  }

  if (helperDefIndex === null) {
    return { found: false };
  }

  // Extract the helper's parameter names to build param-specific patterns.
  const params = extractHelperParams(lines, helperDefIndex);
  if (params === null) {
    return {
      found: true,
      helperDefLine: helperDefIndex + 1,
      requiredFound: false,
      forbiddenLines: [],
      bodyParsed: false, // signature unparseable
    };
  }

  const bodyRange = extractFunctionBodyLines(lines, helperDefIndex);
  if (bodyRange === null) {
    return {
      found: true,
      helperDefLine: helperDefIndex + 1,
      requiredFound: false,
      forbiddenLines: [],
      bodyParsed: false, // braces unparseable
    };
  }

  const { required, forbidden } = buildHelperScanPatterns(params[0], params[1]);

  const helperLines = lines.slice(bodyRange.start, bodyRange.end + 1);
  const forbiddenLines: number[] = [];
  let requiredFound = false;

  for (let j = 0; j < helperLines.length; j++) {
    const ln = helperLines[j];
    if (required.test(ln)) requiredFound = true;
    if (forbidden.test(ln)) forbiddenLines.push(bodyRange.start + j + 1);
  }

  return {
    found: true,
    helperDefLine: helperDefIndex + 1,
    requiredFound,
    forbiddenLines,
    bodyParsed: true,
  };
}

/**
 * Read `filePath` and verify the probe-eviction guard is intact.
 * Returns `{ ok: true }` on success, or `{ ok: false, reason }` on failure.
 */
export async function checkProbeEvictionGuard(
  filePath: string = TARGET_FILE,
): Promise<CheckResult> {
  let source: string;
  try {
    source = await readFile(filePath, "utf-8");
  } catch {
    return {
      ok: false,
      reason: `[check-probe-eviction-guard] Cannot read file: ${filePath}`,
    };
  }

  const lines = source.split("\n");

  // ── Phase 1: inline scan ──────────────────────────────────────────────────

  let foundRequired = false;
  const forbiddenLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (REQUIRED_PATTERN.test(line)) foundRequired = true;
    if (FORBIDDEN_PATTERN.test(line)) forbiddenLines.push(i + 1);
  }

  // ── Full-source fallback ───────────────────────────────────────────────────
  //
  // REQUIRED_PATTERN and FORBIDDEN_PATTERN use \s* between every token.
  // JavaScript's \s class includes \n, so both patterns also match
  // formatter-split expressions such as:
  //
  //   entry.hits = entry.hits.filter((t) =>
  //     t > cutoff);
  //
  // The line-by-line scan above is retained so that single-line violations
  // can still report exact line numbers.  These two full-source checks only
  // fire when the per-line scan found nothing, making the two passes additive.
  let forbiddenInFullSource = false;

  if (!foundRequired && REQUIRED_PATTERN.test(source)) {
    foundRequired = true;
  }
  if (forbiddenLines.length === 0 && FORBIDDEN_PATTERN.test(source)) {
    forbiddenInFullSource = true;
  }

  // Inline forbidden wins immediately — report before anything else.
  if (forbiddenLines.length > 0 || forbiddenInFullSource) {
    const locationNote =
      forbiddenLines.length > 0
        ? `at line(s) ${forbiddenLines.join(", ")}`
        : `(expression split across lines)`;
    return {
      ok: false,
      reason:
        `[check-probe-eviction-guard] Relaxed eviction comparison found ` +
        `${locationNote} in ${filePath}.\n` +
        `Relaxed forms that silently keep boundary hits:\n` +
        `  ✗  entry.hits[lo] < cutoff              (while-loop, strictly-less-than)\n` +
        `  ✗  entry.hits.filter(t => t >= cutoff)  (filter, inclusive >=)\n` +
        `Both keep a hit at exactly (now − WINDOW_MS), inflating the window count.\n` +
        `Correct forms: "entry.hits[lo] <= cutoff"  OR  ` +
        `"entry.hits.filter(t => t > cutoff)"\n` +
        `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
    };
  }

  // ── Phase 2: helper delegation scan ──────────────────────────────────────
  //
  // Collect EVERY evict*(entry, cutoff) CALL SITE inside recordProbe's body
  // (de-duplicated by helper name) and verify each one independently.
  //
  // Scope restriction: only calls found within recordProbe's parsed body are
  // treated as delegations.  A matching call in a different function (e.g.
  // evictDebug called from a test helper) does not exempt recordProbe from
  // having its own eviction guard.
  //
  // Declaration filtering: a definition line `function evictX(entry, cutoff)`
  // syntactically matches HELPER_DELEGATION_PATTERN but is not a call.
  // We skip any matching line that also contains a function/var declaration
  // for that helper name.
  //
  // We use matchAll with a global copy of the pattern so that multiple calls
  // on the same line are all detected.

  interface Delegation { helperName: string; lineNumber: number }
  const delegations: Delegation[] = [];
  const seenHelpers = new Set<string>();
  const delegationPatternG = new RegExp(HELPER_DELEGATION_PATTERN.source, "g");

  // Locate recordProbe's body.
  //
  // Supported declaration forms:
  //   function recordProbe(...)         — plain or async
  //   export function recordProbe(...)  — exported
  //   export async function recordProbe(...)
  //   const | let | var recordProbe = … — arrow or function expression
  //   export const | let | var recordProbe = …
  //
  // If the definition is not found, or its braces cannot be parsed, the
  // delegation list stays EMPTY — we do NOT fall back to whole-file scanning.
  // Accepting calls from unrelated functions as recordProbe's delegations would
  // allow an unrelated evict*(entry, cutoff) call to mask a missing guard.
  // The check then falls through to Phase 3; if the inline REQUIRED_PATTERN
  // was also absent the guard will fail with the generic "no guard found" error.
  const RECORD_PROBE_DEF_PATTERN =
    /(?:export\s+)?(?:async\s+)?function\s+recordProbe\b|(?:export\s+)?(?:const|let|var)\s+recordProbe\s*=/;

  let searchLines: string[] = [];
  let searchOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    if (RECORD_PROBE_DEF_PATTERN.test(lines[i])) {
      const bodyRange = extractFunctionBodyLines(lines, i);
      if (bodyRange !== null) {
        searchLines = lines.slice(bodyRange.start, bodyRange.end + 1);
        searchOffset = bodyRange.start;
      }
      // Whether or not the body parsed, stop at the first definition found.
      break;
    }
  }

  for (let i = 0; i < searchLines.length; i++) {
    const line = searchLines[i];
    for (const m of line.matchAll(delegationPatternG)) {
      const helperName = m[1];
      // Skip declaration lines: `function evictX(...)` or `const evictX = ...`
      const isDeclaration = new RegExp(
        `(?:function\\s+${escapeRegExp(helperName)}\\b|(?:const|let|var)\\s+${escapeRegExp(helperName)}\\s*=)`,
      ).test(line);
      if (isDeclaration) continue;
      if (!seenHelpers.has(helperName)) {
        seenHelpers.add(helperName);
        delegations.push({ helperName, lineNumber: searchOffset + i + 1 });
      }
    }
  }

  if (delegations.length > 0) {
    for (const { helperName, lineNumber: delegationLineNumber } of delegations) {
      const lookup = scanHelperBody(lines, helperName);

      if (!lookup.found) {
        return {
          ok: false,
          reason:
            `[check-probe-eviction-guard] Eviction logic appears to have been ` +
            `extracted into helper "${helperName}" ` +
            `(called at line ${delegationLineNumber} in ${filePath}), ` +
            `but that helper's definition was not found in the same file.\n` +
            `\n` +
            `Action required:\n` +
            `  Locate "${helperName}", verify it uses the correct eviction comparison, and\n` +
            `  update REQUIRED_PATTERN in scripts/check-probe-eviction-guard.ts to cover\n` +
            `  the comparison inside that helper.\n` +
            `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
        };
      }

      if (!lookup.bodyParsed) {
        return {
          ok: false,
          reason:
            `[check-probe-eviction-guard] Eviction logic appears to have been ` +
            `extracted into helper "${helperName}" ` +
            `(called at line ${delegationLineNumber}, definition starts at line ${lookup.helperDefLine}), ` +
            `but the helper's body or parameter list could not be parsed.\n` +
            `\n` +
            `Action required:\n` +
            `  Update REQUIRED_PATTERN in scripts/check-probe-eviction-guard.ts to cover\n` +
            `  the comparison inside "${helperName}".\n` +
            `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
        };
      }

      if (lookup.forbiddenLines.length > 0) {
        return {
          ok: false,
          reason:
            `[check-probe-eviction-guard] Relaxed eviction comparison found ` +
            `inside helper "${helperName}" at line(s) ` +
            `${lookup.forbiddenLines.join(", ")} in ${filePath}.\n` +
            `The helper is called from line ${delegationLineNumber}.\n` +
            `Relaxed forms that silently keep boundary hits:\n` +
            `  ✗  <param>.hits[<idx>] < <cutoff>              (while-loop, strictly-less-than)\n` +
            `  ✗  <param>.hits.filter(<t> => <t> >= <cutoff>) (filter, inclusive >=)\n` +
            `Both keep a hit at exactly (now − WINDOW_MS), inflating the window count.\n` +
            `Correct forms use  <=  (while-loop) or  >  (filter).\n` +
            `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
        };
      }

      if (!lookup.requiredFound) {
        return {
          ok: false,
          reason:
            `[check-probe-eviction-guard] Eviction logic appears to have been ` +
            `extracted into helper "${helperName}" ` +
            `(called at line ${delegationLineNumber}, defined at line ${lookup.helperDefLine}), ` +
            `but no correct eviction comparison was found in that helper's body.\n` +
            `\n` +
            `Action required:\n` +
            `  Update REQUIRED_PATTERN in scripts/check-probe-eviction-guard.ts to cover\n` +
            `  the comparison inside "${helperName}".  The helper must satisfy:\n` +
            `    "a hit whose timestamp equals exactly (now − WINDOW_MS) is evicted."\n` +
            `  Correct while-loop form:   <param>.hits[<idx>] <= <cutoff>\n` +
            `  Correct array-filter form: <param>.hits.filter(<t> => <t> > <cutoff>)\n` +
            `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
        };
      }
    }

    // Every delegation passed — all helpers verified correct.
    return { ok: true };
  }

  // ── Phase 3: final verdict ────────────────────────────────────────────────

  if (foundRequired) {
    return { ok: true };
  }

  // No inline pattern and no helper delegation call found.
  return {
    ok: false,
    reason:
      `[check-probe-eviction-guard] No correct eviction guard found in ${filePath}.\n` +
      `Expected one of:\n` +
      `  ✓  entry.hits[lo] <= cutoff              (while-loop form)\n` +
      `  ✓  entry.hits.filter(t => t > cutoff)   (array-filter form)\n` +
      `  ✓  evict*(entry, cutoff)                 (helper-delegation form)\n` +
      `The eviction logic may have been changed or removed.\n` +
      `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
  };
}

// ─── Standalone entry (npm run check:probe-eviction-guard) ───────────────────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkProbeEvictionGuard()
    .then((result) => {
      if (result.ok) {
        console.log(
          "[check-probe-eviction-guard] ✓ Eviction guard intact: " +
            "a correct eviction expression is present in server/traffic-logger.ts " +
            '("entry.hits[lo] <= cutoff" or "entry.hits.filter(t => t > cutoff)")',
        );
        return;
      }
      console.error(result.reason);
      process.exit(1);
    })
    .catch((err: Error) => {
      console.error(err.message);
      process.exit(1);
    });
}
