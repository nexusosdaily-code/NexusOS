/**
 * check-unimported-handlers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror-image guard for check-unwired-handlers.ts.
 *
 * That script catches: "imported in routes.ts but never wired to a route".
 * This script catches: "file named *-handler.ts exists under server/ but is
 *                       never imported in server/routes.ts at all".
 *
 * TypeScript won't catch this failure — the file just compiles and the
 * endpoint silently never exists.
 *
 * ── What counts as a valid import ────────────────────────────────────────────
 *   Only RUNTIME STATIC imports satisfy the check:
 *
 *     import { fooHandler } from "./foo-handler"        ✓ runtime named
 *     import { fooHandler } from "./foo-handler.js"     ✓ runtime named (.js)
 *     import fooHandler from "./foo-handler"            ✓ runtime default
 *     import * as fooHandler from "./foo-handler"       ✓ runtime namespace
 *     import "./foo-handler"                            ✓ side-effect
 *
 *   The following do NOT count:
 *     import type { Foo } from "./foo-handler"       -- erased at compile time
 *     import type * as Foo from "./foo-handler"      -- erased at compile time
 *     // import { fooHandler } from "./foo-handler"  -- line-commented out
 *     (block-comment wrapping the import line)       -- block-commented out
 *     const h = await import("./foo-handler")        -- dynamic import call
 *
 * ── Algorithm ────────────────────────────────────────────────────────────────
 *   1. Glob all `server/*-handler.ts` files (direct children only).
 *   2. For each file, derive its bare module name:
 *        server/foo-handler.ts  →  "./foo-handler"
 *      Also accept imports with a .js extension.
 *   3. Strip ALL comments from routes.ts (reusing stripAllComments from
 *      check-unwired-handlers.ts so comment-stripping logic is shared).
 *   4. Check that the comment-stripped content contains at least one static
 *      import declaration (not a dynamic import call) for the module.
 *
 * ── Escape hatch ─────────────────────────────────────────────────────────────
 *   Add `// check-unimported:ignore` on the FIRST line of the handler file:
 *
 *     // check-unimported:ignore — registered dynamically at runtime
 *
 * ── Exported API ─────────────────────────────────────────────────────────────
 *   checkUnimportedHandlers(serverDir?, routesFile?) → Promise<string[]>
 *   Runnable as `npm run check:unimported-handlers` for CI/local use.
 *   Also invoked by `npm run test:all`.
 */

import { readFile, readdir } from "fs/promises";
import path from "path";
import { stripAllComments } from "./check-unwired-handlers.js";

export { stripAllComments } from "./check-unwired-handlers.js";

export const IGNORE_ANNOTATION = "check-unimported:ignore";

/**
 * Returns true if the given import LINE is a type-only import that is erased
 * at compile time and does NOT cause the module to be loaded.
 *
 *   import type { Foo } from "./foo-handler"   → true  (type-only named)
 *   import type * as Foo from "./foo-handler"  → true  (type-only namespace)
 *   import { Foo } from "./foo-handler"        → false (runtime named)
 *   import "./foo-handler"                     → false (side-effect)
 */
export function isTypeOnlyImport(line: string): boolean {
  return /^\s*import\s+type\b/.test(line);
}

/**
 * Returns true if the text looks like a dynamic import() call rather than a
 * static import declaration.  Dynamic imports do not cause the module to be
 * registered at route-mount time.
 *
 *   import("./foo-handler")                    → true
 *   await import("./foo-handler")              → true
 *   import { fooHandler } from "./foo-handler" → false
 */
export function isDynamicImport(line: string): boolean {
  // A static import declaration MUST start with the `import` keyword at the
  // beginning of the statement (possibly with leading whitespace).
  // A dynamic import appears after other tokens (e.g. `const`, `=`, `await`).
  return !/^\s*import\b/.test(line);
}

/**
 * Returns the list of handler file stems (e.g. "foo-handler") that exist
 * under `serverDir` but have no runtime static import in `routesFile`.
 *
 * @param serverDir   Absolute path to the server/ directory.
 * @param routesFile  Absolute path to server/routes.ts.
 * @returns           Array of missing module stems — empty means all good.
 */
export async function checkUnimportedHandlers(
  serverDir: string = path.resolve("server"),
  routesFile: string = path.resolve("server", "routes.ts"),
): Promise<string[]> {
  // 1. Read routes.ts
  let routesRaw: string;
  try {
    routesRaw = await readFile(routesFile, "utf-8");
  } catch {
    throw new Error(
      `[check-unimported-handlers] Cannot read routes file: ${routesFile}`,
    );
  }

  // 2. Strip ALL comments (line and block) while preserving string literals.
  //    This ensures commented-out import lines cannot satisfy the check.
  const routesContent = stripAllComments(routesRaw);

  // 3. List all *-handler.ts files directly under server/
  let entries: string[];
  try {
    entries = await readdir(serverDir);
  } catch {
    throw new Error(
      `[check-unimported-handlers] Cannot read server directory: ${serverDir}`,
    );
  }

  const handlerFiles = entries.filter(
    (e) => e.endsWith("-handler.ts") && !e.endsWith(".test.ts"),
  );

  const missing: string[] = [];

  for (const filename of handlerFiles) {
    const stem = filename.replace(/\.ts$/, ""); // e.g. "amendment-handler"

    // 4. Check for the ignore annotation on the first line of the file
    try {
      const handlerSrc = await readFile(path.join(serverDir, filename), "utf-8");
      const firstLine = handlerSrc.split("\n")[0] ?? "";
      if (firstLine.includes(IGNORE_ANNOTATION)) {
        continue;
      }
    } catch {
      // If we can't read the file, treat it as not ignored
    }

    // 5. Check that routes.ts has at least one RUNTIME STATIC import for this
    //    module.  We work on the comment-stripped content so `// import …`
    //    and `/* import … */` lines are blank and cannot match.
    //
    //    Accept both  "./foo-handler"  and  "./foo-handler.js"
    const withoutExt = `./${stem}`;    // ./amendment-handler
    const withExt    = `./${stem}.js`; // ./amendment-handler.js

    // Match any line that references this module path inside an import statement.
    const pathPattern = new RegExp(
      `^([^\\n]*)import([^\\n]*)['"](?:${escapeRegex(withoutExt)}|${escapeRegex(withExt)})['"]`,
      "gm",
    );

    const allMatches = [...routesContent.matchAll(pathPattern)];

    // A match is a valid runtime static import when:
    //   a) it is NOT type-only (`import type …`)
    //   b) the `import` keyword starts the statement (not `import(…)`)
    //
    // We reconstruct the full import statement text from the capture groups to
    // apply both checks.
    const hasRuntimeImport = allMatches.some((m) => {
      const fullLine = m[0]; // entire matched text
      return !isTypeOnlyImport(fullLine) && !isDynamicImport(fullLine);
    });

    if (!hasRuntimeImport) {
      missing.push(stem);
    }
  }

  return missing;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Standalone entry (npm run check:unimported-handlers) ──────────────────────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkUnimportedHandlers()
    .then((missing) => {
      if (missing.length === 0) {
        console.log(
          "[check-unimported-handlers] ✓ All server/*-handler.ts files are imported in routes.ts.",
        );
        return;
      }

      console.error(
        `[check-unimported-handlers] ✗ ${missing.length} handler file(s) exist under server/ but are never imported in routes.ts:\n`,
      );
      for (const stem of missing) {
        console.error(`  server/${stem}.ts`);
      }
      console.error(
        `\nFix: add a static import to server/routes.ts, e.g.\n` +
          `  import { ${toCamelCase(missing[0] ?? "")} } from "./${missing[0]}";\n` +
          `\nIf the handler is loaded dynamically (not via a static import), add\n` +
          `  // ${IGNORE_ANNOTATION}\n` +
          `to the first line of that handler file to suppress this check.`,
      );
      process.exit(1);
    })
    .catch((err: Error) => {
      console.error(err.message);
      process.exit(1);
    });
}

/** Convert "foo-bar-handler" → "fooBarHandler" for the hint message. */
function toCamelCase(stem: string): string {
  return stem.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
