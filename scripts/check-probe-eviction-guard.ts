/**
 * check-probe-eviction-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies that the eviction loop inside recordProbe() in
 * server/traffic-logger.ts still uses the inclusive `<= cutoff` comparison,
 * not the relaxed `< cutoff` form.
 *
 * Why this matters:
 *   The eviction loop reads:
 *     while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;
 *
 *   Using `<= cutoff` means a hit whose timestamp equals exactly
 *   (now − WINDOW_MS) is treated as outside the window and evicted.
 *   If the comparison were softened to `< cutoff`, that boundary hit would
 *   survive, inflating the in-window counter by 1 for up to a full second —
 *   no runtime error would surface this, making it a silent regression.
 *
 * What this script checks:
 *   1. The file server/traffic-logger.ts must contain at least one line that
 *      matches the eviction pattern: `hits[lo] <= cutoff`.
 *   2. No line in the eviction context may use `hits[lo] < cutoff` without
 *      the `=` (i.e. the strictly-less-than form must not appear inside the
 *      while-loop guard).
 *
 * Exit codes:
 *   0 — guard is intact (inclusive comparison found, relaxed form absent)
 *   1 — guard is broken (inclusive form missing OR relaxed form detected)
 *
 * Runnable standalone:  npm run check:probe-eviction-guard
 * Also included in:     npm run test:all
 */

import { readFile } from "fs/promises";
import path from "path";

/** Path to the file under inspection, relative to the workspace root. */
export const TARGET_FILE = path.resolve("server", "traffic-logger.ts");

/**
 * The exact token that must appear in the eviction while-loop guard.
 * Matching is done on the full line text (after trimming) so whitespace
 * variants are still caught.
 */
export const REQUIRED_PATTERN = /entry\.hits\[lo\]\s*<=\s*cutoff/;

/**
 * The relaxed form that must NOT appear as the sole comparison operator in
 * the while-loop guard.  We look for `hits[lo] < cutoff` where `<` is NOT
 * immediately followed by `=` — i.e. strictly-less-than only.
 */
export const FORBIDDEN_PATTERN = /entry\.hits\[lo\]\s*<(?!=)\s*cutoff/;

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
        `[check-probe-eviction-guard] Relaxed eviction comparison ` +
        `"entry.hits[lo] < cutoff" (strictly-less-than, without =) ` +
        `found at line(s) ${forbiddenLines.join(", ")} in ${filePath}.\n` +
        `This would silently keep boundary hits in the window. ` +
        `Change it back to "<= cutoff".`,
    };
  }

  if (!foundRequired) {
    return {
      ok: false,
      reason:
        `[check-probe-eviction-guard] The inclusive eviction guard ` +
        `"entry.hits[lo] <= cutoff" was not found in ${filePath}.\n` +
        `The comparison may have been changed or the loop removed.`,
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
            '"entry.hits[lo] <= cutoff" is present in server/traffic-logger.ts',
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
