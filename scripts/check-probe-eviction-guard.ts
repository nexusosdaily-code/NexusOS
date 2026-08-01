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
 * ─────────────────────────────────────────────────────────────────────────────
 * What this script checks:
 *   1. server/traffic-logger.ts must contain at least one line matching
 *      REQUIRED_PATTERN (while-loop form OR filter form, both correct).
 *   2. No line may match FORBIDDEN_PATTERN (relaxed comparisons that keep
 *      the boundary hit).
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
 *     (keep only timestamps strictly after the boundary)
 *
 * Both forms evict the boundary hit, which is the required behaviour.
 * If a new idiom is introduced, add it as a further alternation here.
 */
export const REQUIRED_PATTERN =
  /entry\.hits\[lo\]\s*<=\s*cutoff|entry\.hits\.filter\(\s*\(?\s*t\s*\)?\s*=>\s*t\s*>\s*cutoff\s*\)/;

/**
 * Matches RELAXED (wrong) eviction expressions that silently keep the
 * boundary hit in the window.  Two relaxed idioms are covered:
 *
 *   While-loop relaxed:   entry.hits[lo] < cutoff   (strictly-less-than, no =)
 *   Array-filter relaxed: entry.hits.filter(t => t >= cutoff)  (>= keeps boundary)
 *
 * If a new idiom is introduced, add its relaxed/wrong form here too.
 */
export const FORBIDDEN_PATTERN =
  /entry\.hits\[lo\]\s*<(?!=)\s*cutoff|entry\.hits\.filter\(\s*\(?\s*t\s*\)?\s*=>\s*t\s*>=\s*cutoff\s*\)/;

export interface CheckResult {
  ok: boolean;
  /** Human-readable explanation when ok === false. */
  reason?: string;
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

  let foundRequired = false;
  const forbiddenLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (REQUIRED_PATTERN.test(line)) foundRequired = true;
    if (FORBIDDEN_PATTERN.test(line)) forbiddenLines.push(i + 1);
  }

  // Check forbidden form first: a relaxed `< cutoff` loop is the specific
  // regression this guard protects against, and it also implies the required
  // `<= cutoff` form is absent — so reporting the more specific error first
  // gives the developer an actionable message.
  if (forbiddenLines.length > 0) {
    return {
      ok: false,
      reason:
        `[check-probe-eviction-guard] Relaxed eviction comparison found ` +
        `at line(s) ${forbiddenLines.join(", ")} in ${filePath}.\n` +
        `Relaxed forms that silently keep boundary hits:\n` +
        `  ✗  entry.hits[lo] < cutoff              (while-loop, strictly-less-than)\n` +
        `  ✗  entry.hits.filter(t => t >= cutoff)  (filter, inclusive >=)\n` +
        `Both keep a hit at exactly (now − WINDOW_MS), inflating the window count.\n` +
        `Correct forms: "entry.hits[lo] <= cutoff"  OR  ` +
        `"entry.hits.filter(t => t > cutoff)"\n` +
        `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
    };
  }

  if (!foundRequired) {
    return {
      ok: false,
      reason:
        `[check-probe-eviction-guard] No correct eviction guard found in ${filePath}.\n` +
        `Expected one of:\n` +
        `  ✓  entry.hits[lo] <= cutoff              (while-loop form)\n` +
        `  ✓  entry.hits.filter(t => t > cutoff)   (array-filter form)\n` +
        `The eviction logic may have been changed or removed.\n` +
        `See the HOW TO UPDATE THIS GUARD comment in scripts/check-probe-eviction-guard.ts.`,
    };
  }

  return { ok: true };
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
