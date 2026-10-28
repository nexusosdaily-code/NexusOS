/**
 * check-probe-eviction-guard-test-file.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard against silent removal of scripts/check-probe-eviction-guard.test.ts
 * from the test suite.
 *
 * The test file is discovered by Vitest via the glob `scripts/**​/*.test.ts`
 * defined in vitest.config.ts.  Because glob discovery is implicit, renaming
 * or moving the file silently drops all of its test coverage with no error.
 *
 * This script asserts the file is present at its canonical path.  It is
 * invoked by `npm run test:all` so a missing or renamed file fails CI before
 * the absence is noticed in review.
 *
 * Runnable standalone via:
 *   npm run check:probe-eviction-guard-test-file
 */

import { access } from "fs/promises";
import path from "path";

/** Canonical location of the test file, relative to the project root. */
export const EXPECTED_TEST_FILE = "scripts/check-probe-eviction-guard.test.ts";

/**
 * Verify that EXPECTED_TEST_FILE exists on disk.
 *
 * Returns `{ ok: true }` when the file is present.
 * Returns `{ ok: false, reason: string }` when it is missing.
 */
export async function checkProbeEvictionGuardTestFile(
  rootDir: string = path.resolve("."),
): Promise<{ ok: boolean; reason?: string }> {
  const abs = path.join(rootDir, EXPECTED_TEST_FILE);
  try {
    await access(abs);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason:
        `Expected test file not found: ${EXPECTED_TEST_FILE}\n` +
        `  This file covers the probe-eviction guard and must remain at that\n` +
        `  exact path so Vitest's glob (scripts/**/*.test.ts) discovers it.\n` +
        `  If the file was renamed, restore it to "${EXPECTED_TEST_FILE}"\n` +
        `  or update EXPECTED_TEST_FILE in\n` +
        `  scripts/check-probe-eviction-guard-test-file.ts to match the new\n` +
        `  location and ensure the new path is still covered by the vitest glob.`,
    };
  }
}

// ─── Standalone entry (npm run check:probe-eviction-guard-test-file) ──────────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkProbeEvictionGuardTestFile()
    .then(({ ok, reason }) => {
      if (ok) {
        console.log(
          `[check-probe-eviction-guard-test-file] ✓ ${EXPECTED_TEST_FILE} exists.`,
        );
      } else {
        console.error(
          `[check-probe-eviction-guard-test-file] ✗ Guard failed:\n\n  ${reason}\n`,
        );
        process.exit(1);
      }
    })
    .catch((err: Error) => {
      console.error("[check-probe-eviction-guard-test-file]", err.message);
      process.exit(1);
    });
}
