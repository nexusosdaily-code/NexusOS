/**
 * check-system-band-literal.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Recursively scans all TypeScript files under server/ and fails if any
 * contains the hard-coded literal "Ψ(52,20,H)" outside of comments or
 * explicitly annotated exemptions.
 *
 * Why: Task 217 replaced every bare literal with the imported CONSTITUTION_PSI
 * constant from server/constitution_seal.ts.  Without a CI guard, a contributor
 * can silently re-introduce the literal in any future change — including in
 * nested subdirectories such as server/scripts/.
 *
 * Allowed contexts (never flagged):
 *   1. server/constitution_seal.ts — the canonical source of truth; exempt entirely.
 *   2. Lines whose first non-whitespace characters are "//" or "*" — pure comments.
 *   3. Lines that contain the annotation `// check:allow-literal` — explicit
 *      opt-out for the rare case where the literal is genuinely required (e.g. a
 *      vi.mock factory that cannot import from the module it is mocking).
 *
 * Everything else is flagged as a violation and exits non-zero.
 *
 * Exported as `checkSystemBandLiteral()` for use in tests.
 * Runnable standalone via `npm run check:system-band`.
 * Also invoked by `npm run test:all` so the gate is part of the shipping path.
 */

import { readdir, readFile } from "fs/promises";
import path from "path";

/** The literal string that must not appear in server code. */
export const SYSTEM_BAND_LITERAL = "Ψ(52,20,H)";

/**
 * Basenames of files inside server/ that are exempt from the check.
 * These are the canonical source-of-truth definitions; all other files
 * must import the constant rather than repeating the literal.
 */
export const EXEMPT_BASENAMES: ReadonlySet<string> = new Set([
  "constitution_seal.ts",
]);

/** Inline annotation that marks a line as an intentional exception. */
export const ALLOW_ANNOTATION = "check:allow-literal";

export interface Violation {
  /** Relative path from serverDir (e.g. "routes.ts" or "scripts/foo.ts") */
  file: string;
  line: number;
  text: string;
}

/**
 * Recursively scan all *.ts files under serverDir for bare uses of
 * SYSTEM_BAND_LITERAL.
 *
 * Returns an array of violations — callers decide how to surface them.
 * Throws on file-system errors (missing directory, unreadable files).
 */
export async function checkSystemBandLiteral(
  serverDir: string = path.resolve("server"),
): Promise<Violation[]> {
  let allEntries: string[];
  try {
    // Node 18.17+ supports { recursive: true } — returns relative paths
    allEntries = (await readdir(serverDir, { recursive: true } as any)) as string[];
  } catch {
    throw new Error(
      `[check-system-band-literal] Cannot read directory: ${serverDir}`,
    );
  }

  const tsFiles = allEntries.filter((f) => {
    if (!f.endsWith(".ts")) return false;
    // Exempt by basename so constitution_seal.ts is skipped wherever it lives
    const basename = path.basename(f);
    return !EXEMPT_BASENAMES.has(basename);
  });

  const violations: Violation[] = [];

  for (const relPath of tsFiles) {
    const filePath = path.join(serverDir, relPath);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      throw new Error(
        `[check-system-band-literal] Cannot read file: ${filePath}`,
      );
    }

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.includes(SYSTEM_BAND_LITERAL)) continue;

      const trimmed = raw.trimStart();

      // 1. Pure comment lines — skip
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

      // 2. Lines with an explicit allow annotation — skip
      if (raw.includes(ALLOW_ANNOTATION)) continue;

      violations.push({
        file: relPath,
        line: i + 1,
        text: raw.trimEnd(),
      });
    }
  }

  return violations;
}

// ─── Standalone entry (npm run check:system-band) ────────────────────────────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkSystemBandLiteral()
    .then((violations) => {
      if (violations.length === 0) {
        console.log(
          `[check-system-band-literal] ✓ No hard-coded "${SYSTEM_BAND_LITERAL}" ` +
            `literals found outside constitution_seal.ts`,
        );
        return;
      }

      console.error(
        `[check-system-band-literal] ✗ Hard-coded "${SYSTEM_BAND_LITERAL}" ` +
          `literal found in server code — import CONSTITUTION_PSI instead:\n`,
      );
      for (const v of violations) {
        console.error(`  ${v.file}:${v.line}  ${v.text}`);
      }
      console.error(
        `\nFix: replace the literal with the imported CONSTITUTION_PSI constant.\n` +
          `  import { CONSTITUTION_PSI } from "./constitution_seal";\n` +
          `\nIf the occurrence is genuinely unavoidable (e.g. a vi.mock factory ` +
          `that cannot import from the module it mocks), append:\n` +
          `  // check:allow-literal`,
      );
      process.exit(1);
    })
    .catch((err: Error) => {
      console.error(err.message);
      process.exit(1);
    });
}
