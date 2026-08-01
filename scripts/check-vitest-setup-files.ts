/**
 * check-vitest-setup-files.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-pronged guard against orphaned Vitest setup files:
 *
 *   1. DEAD REFERENCE — every path listed under `setupFiles` in any
 *      vitest*.ts config at the project root must resolve to a file that
 *      actually exists on disk.
 *
 *   2. ORPHANED FILE — any *.ts file whose basename matches the pattern
 *      /setup/ that lives under client/src but NOT inside a __tests__/
 *      directory must appear in at least one `setupFiles` list; otherwise
 *      it is flagged as orphaned.
 *
 * Why: `client/src/test-setup.ts` was silently abandoned after the
 * single-source-of-truth consolidation into vitest.shared.ts.  No tooling
 * caught it.  This script prevents the same mistake from recurring.
 *
 * Exported as `checkVitestSetupFiles()` for use in tests.
 * Runnable standalone via `npm run check:vitest-setup`.
 * Also invoked by `npm run test:all` so the gate is part of the shipping path.
 */

import { readdir, readFile, access } from "fs/promises";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetupViolation {
  kind: "dead-reference" | "orphaned-file";
  /** Human-readable detail */
  message: string;
}

export interface CheckResult {
  violations: SetupViolation[];
  /** All setupFiles paths collected across all vitest configs (relative to root) */
  referencedSetupFiles: string[];
  /** All candidate files scanned for orphan detection */
  candidateFiles: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract every string literal that appears inside a `setupFiles: [...]`
 * array in the given file content.  Works across multi-line arrays.
 *
 * Returns paths exactly as written in the config (e.g. "client/src/__tests__/setup.ts").
 */
export function extractSetupFiles(source: string): string[] {
  // Match `setupFiles` followed by an array (may span multiple lines).
  const blockRe = /setupFiles\s*:\s*\[([^\]]*)\]/gs;
  const stringRe = /["']([^"']+)["']/g;

  const paths: string[] = [];
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRe.exec(source)) !== null) {
    const arrayBody = blockMatch[1];
    let strMatch: RegExpExecArray | null;
    while ((strMatch = stringRe.exec(arrayBody)) !== null) {
      paths.push(strMatch[1]);
    }
  }

  return paths;
}

/**
 * Return all vitest*.ts config files in `rootDir` (non-recursive, root only).
 */
async function findVitestConfigs(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir);
  return entries
    .filter((f) => /^vitest.*\.ts$/.test(f))
    .map((f) => path.join(rootDir, f));
}

/**
 * Return all *.ts files under `scanDir` whose basename contains "setup"
 * (case-insensitive) but whose path does NOT contain a `__tests__` directory
 * segment.
 */
async function findCandidateFiles(scanDir: string): Promise<string[]> {
  let allEntries: string[];
  try {
    allEntries = (await readdir(scanDir, {
      recursive: true,
    } as Parameters<typeof readdir>[1])) as string[];
  } catch {
    // scanDir doesn't exist — nothing to flag
    return [];
  }

  return allEntries
    .filter((rel) => {
      if (!rel.endsWith(".ts")) return false;
      if (rel.includes("__tests__")) return false;
      const basename = path.basename(rel).toLowerCase();
      return basename.includes("setup");
    })
    .map((rel) => path.join(scanDir, rel));
}

// ─── Main check ───────────────────────────────────────────────────────────────

/**
 * Run both guards and return a structured result.
 *
 * @param rootDir  Project root (defaults to process.cwd())
 * @param scanDir  Directory to scan for orphaned setup files
 *                 (defaults to `<rootDir>/client/src`)
 */
export async function checkVitestSetupFiles(
  rootDir: string = path.resolve("."),
  scanDir: string = path.join(path.resolve("."), "client", "src"),
): Promise<CheckResult> {
  // ── 1. Collect all setupFiles references from vitest configs ─────────────
  const configPaths = await findVitestConfigs(rootDir);

  const referencedSetupFiles: string[] = [];

  for (const cfgPath of configPaths) {
    const source = await readFile(cfgPath, "utf-8");
    const found = extractSetupFiles(source);
    for (const p of found) {
      if (!referencedSetupFiles.includes(p)) {
        referencedSetupFiles.push(p);
      }
    }
  }

  const violations: SetupViolation[] = [];

  // ── 2. Dead-reference check ───────────────────────────────────────────────
  for (const setupPath of referencedSetupFiles) {
    const abs = path.resolve(rootDir, setupPath);
    try {
      await access(abs);
    } catch {
      violations.push({
        kind: "dead-reference",
        message:
          `setupFiles entry "${setupPath}" does not exist on disk.\n` +
          `  Either create the file or remove it from the vitest config.`,
      });
    }
  }

  // ── 3. Orphaned-file check ────────────────────────────────────────────────
  const candidateFiles = await findCandidateFiles(scanDir);

  // Normalise the referenced set to absolute paths for comparison
  const referencedAbs = new Set(
    referencedSetupFiles.map((p) => path.resolve(rootDir, p)),
  );

  for (const candidateAbs of candidateFiles) {
    if (!referencedAbs.has(candidateAbs)) {
      const rel = path.relative(rootDir, candidateAbs);
      violations.push({
        kind: "orphaned-file",
        message:
          `"${rel}" looks like a setup file but is not listed in any ` +
          `vitest config's setupFiles.\n` +
          `  Either add it to a setupFiles array, move it into a __tests__/ ` +
          `directory, or delete it if it is no longer needed.`,
      });
    }
  }

  return { violations, referencedSetupFiles, candidateFiles };
}

// ─── Standalone entry (npm run check:vitest-setup) ───────────────────────────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkVitestSetupFiles()
    .then(({ violations }) => {
      if (violations.length === 0) {
        console.log(
          "[check-vitest-setup-files] ✓ All setupFiles references are valid " +
            "and no orphaned setup files found.",
        );
        return;
      }

      console.error(
        `[check-vitest-setup-files] ✗ ${violations.length} problem(s) found:\n`,
      );
      for (const v of violations) {
        const label = v.kind === "dead-reference" ? "DEAD REF" : "ORPHANED";
        console.error(`  [${label}] ${v.message}\n`);
      }
      process.exit(1);
    })
    .catch((err: Error) => {
      console.error("[check-vitest-setup-files]", err.message);
      process.exit(1);
    });
}
