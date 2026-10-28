/**
 * check-probe-eviction-guard-test-file-meta.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Meta-guard: confirms that BOTH the guard script and its own test file still
 * exist at their canonical paths.
 *
 * Why this matters:
 *   scripts/check-probe-eviction-guard-test-file.ts is the guard that confirms
 *   scripts/check-probe-eviction-guard.test.ts is present in the Vitest suite.
 *   Its companion, scripts/check-probe-eviction-guard-test-file.test.ts, is
 *   discovered implicitly by Vitest via the glob `scripts/**​/*.test.ts`.
 *
 *   If either file is renamed or moved:
 *   • Renaming the .ts guard script → `npm run check:probe-eviction-guard-test-file`
 *     fails loudly (old path referenced in package.json), but the .test.ts
 *     companion silently drops out of the Vitest run.
 *   • Renaming the .test.ts companion → its coverage vanishes with no error
 *     because glob discovery is implicit.
 *
 *   This script asserts both files are present.  It is invoked by
 *   `npm run test:all` so a missing or renamed file fails CI before the
 *   absence reaches review.
 *
 * Runnable standalone via:
 *   npm run check:probe-eviction-guard-test-file-meta
 */

import { access } from "fs/promises";
import path from "path";

/** Canonical paths relative to the project root. */
export const EXPECTED_GUARD_SCRIPT =
  "scripts/check-probe-eviction-guard-test-file.ts";
export const EXPECTED_GUARD_TEST =
  "scripts/check-probe-eviction-guard-test-file.test.ts";

export interface MetaCheckResult {
  ok: boolean;
  missing: string[];
  reason?: string;
}

/**
 * Verify that both EXPECTED_GUARD_SCRIPT and EXPECTED_GUARD_TEST exist on disk.
 *
 * Returns `{ ok: true, missing: [] }` when both files are present.
 * Returns `{ ok: false, missing: [...], reason: string }` when any are absent.
 */
export async function checkProbeEvictionGuardTestFileMeta(
  rootDir: string = path.resolve("."),
): Promise<MetaCheckResult> {
  const files = [EXPECTED_GUARD_SCRIPT, EXPECTED_GUARD_TEST];
  const missing: string[] = [];

  for (const rel of files) {
    const abs = path.join(rootDir, rel);
    try {
      await access(abs);
    } catch {
      missing.push(rel);
    }
  }

  if (missing.length === 0) {
    return { ok: true, missing: [] };
  }

  const list = missing.map((p) => `  • ${p}`).join("\n");
  const reason =
    `The following file(s) were not found at their expected paths:\n${list}\n\n` +
    `Both files must remain at these exact paths:\n` +
    `  ${EXPECTED_GUARD_SCRIPT}\n` +
    `    — the guard script that verifies check-probe-eviction-guard.test.ts\n` +
    `      is present; invoked by "npm run check:probe-eviction-guard-test-file"\n` +
    `  ${EXPECTED_GUARD_TEST}\n` +
    `    — the test file for the guard above; discovered by Vitest via the\n` +
    `      glob scripts/**/*.test.ts in vitest.config.ts\n\n` +
    `If either file was renamed, restore it to the path shown above or update\n` +
    `EXPECTED_GUARD_SCRIPT / EXPECTED_GUARD_TEST in\n` +
    `scripts/check-probe-eviction-guard-test-file-meta.ts and ensure the new\n` +
    `path is still covered by the vitest glob.`;

  return { ok: false, missing, reason };
}

// ─── Standalone entry (npm run check:probe-eviction-guard-test-file-meta) ─────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkProbeEvictionGuardTestFileMeta()
    .then(({ ok, reason }) => {
      if (ok) {
        console.log(
          `[check-probe-eviction-guard-test-file-meta] ✓ Both guard files exist.`,
        );
      } else {
        console.error(
          `[check-probe-eviction-guard-test-file-meta] ✗ Guard failed:\n\n${reason}\n`,
        );
        process.exit(1);
      }
    })
    .catch((err: Error) => {
      console.error(
        "[check-probe-eviction-guard-test-file-meta]",
        err.message,
      );
      process.exit(1);
    });
}
