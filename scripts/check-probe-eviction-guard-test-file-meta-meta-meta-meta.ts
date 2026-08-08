/**
 * check-probe-eviction-guard-test-file-meta-meta-meta-meta.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Meta-meta-meta-meta-guard: confirms that the meta-meta-meta-guard script
 * itself (check-probe-eviction-guard-test-file-meta-meta-meta.ts) and its
 * companion test file still exist at their canonical paths.
 *
 * Why this matters:
 *   scripts/check-probe-eviction-guard-test-file-meta-meta-meta.ts is the
 *   meta-meta-meta-guard that verifies the meta-meta-guard and lower-level
 *   guard files are present.  It is referenced by the package.json entry
 *   "check:probe-eviction-guard-test-file-meta-meta-meta".
 *
 *   If the meta-meta-meta-guard script is renamed:
 *   • `npm run check:probe-eviction-guard-test-file-meta-meta-meta` fails
 *     loudly (old path referenced in package.json), but only when that
 *     command is explicitly run — a stale package.json entry and a
 *     silently-missing file can coexist until someone notices.
 *   • The companion test file
 *     (check-probe-eviction-guard-test-file-meta-meta-meta.test.ts) can
 *     silently drop out of the Vitest run if it is renamed or moved because
 *     Vitest discovers it implicitly via the glob `scripts/**​/*.test.ts`.
 *
 *   This script asserts both meta-meta-meta-guard files are present.  It is
 *   invoked by `npm run test:all` so a missing or renamed file fails CI
 *   before the absence reaches review.
 *
 * Runnable standalone via:
 *   npm run check:probe-eviction-guard-test-file-meta-meta-meta-meta
 */

import { access } from "fs/promises";
import path from "path";

/** Canonical paths relative to the project root. */
export const EXPECTED_META_META_META_GUARD_SCRIPT =
  "scripts/check-probe-eviction-guard-test-file-meta-meta-meta.ts";
export const EXPECTED_META_META_META_GUARD_TEST =
  "scripts/check-probe-eviction-guard-test-file-meta-meta-meta.test.ts";

export interface MetaMetaMetaMetaCheckResult {
  ok: boolean;
  missing: string[];
  reason?: string;
}

/**
 * Verify that both EXPECTED_META_META_META_GUARD_SCRIPT and
 * EXPECTED_META_META_META_GUARD_TEST exist on disk.
 *
 * Returns `{ ok: true, missing: [] }` when both files are present.
 * Returns `{ ok: false, missing: [...], reason: string }` when any are absent.
 */
export async function checkProbeEvictionGuardTestFileMetaMetaMetaMeta(
  rootDir: string = path.resolve("."),
): Promise<MetaMetaMetaMetaCheckResult> {
  const files = [
    EXPECTED_META_META_META_GUARD_SCRIPT,
    EXPECTED_META_META_META_GUARD_TEST,
  ];
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
    `  ${EXPECTED_META_META_META_GUARD_SCRIPT}\n` +
    `    — the meta-meta-meta-guard script that verifies check-probe-eviction-guard-test-file-meta-meta.ts\n` +
    `      and check-probe-eviction-guard-test-file-meta-meta.test.ts are present;\n` +
    `      invoked by "npm run check:probe-eviction-guard-test-file-meta-meta-meta"\n` +
    `  ${EXPECTED_META_META_META_GUARD_TEST}\n` +
    `    — the test file for the meta-meta-meta-guard above; discovered by Vitest via the\n` +
    `      glob scripts/**/*.test.ts in vitest.config.ts\n\n` +
    `If either file was renamed, restore it to the path shown above or update\n` +
    `EXPECTED_META_META_META_GUARD_SCRIPT / EXPECTED_META_META_META_GUARD_TEST in\n` +
    `scripts/check-probe-eviction-guard-test-file-meta-meta-meta-meta.ts and ensure the\n` +
    `new path is still covered by the vitest glob.`;

  return { ok: false, missing, reason };
}

// ── Standalone entry (npm run check:probe-eviction-guard-test-file-meta-meta-meta-meta) ─

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkProbeEvictionGuardTestFileMetaMetaMetaMeta()
    .then(({ ok, reason }) => {
      if (ok) {
        console.log(
          "✓ check-probe-eviction-guard-test-file-meta-meta-meta.ts and its test file are present.",
        );
        process.exit(0);
      } else {
        console.error("✗ Meta-meta-meta-meta guard failed:\n\n" + reason);
        process.exit(1);
      }
    })
    .catch((err: unknown) => {
      console.error("✗ Unexpected error:", err);
      process.exit(1);
    });
}
