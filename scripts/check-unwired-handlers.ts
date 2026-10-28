/**
 * check-unwired-handlers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses server/routes.ts and verifies that every named import drawn from a
 * local relative module (paths starting with "./" or "../") appears at least
 * once as a DIRECT argument to an Express route registration call:
 *
 *   app.get / app.post / app.put / app.delete / app.patch / app.use
 *
 * "Direct argument" means the identifier appears inside the outermost
 * parentheses of the call (depth 1), NOT nested inside a callback literal
 * such as `async (req, res) => { ... }`.  This catches the mirror-image of a
 * TypeScript missing-import error: a handler that is imported at the top of
 * routes.ts but whose wiring line (app.post("/api/...", handler)) was
 * accidentally omitted.
 *
 * ── What is skipped ──────────────────────────────────────────────────────────
 *   • `import type { ... }` — type-only imports have no runtime presence.
 *   • `import * as ns from "..."` — namespace imports; checked by usage.
 *   • Non-local imports (paths that do NOT start with "./" or "../").
 *   • Any import line containing `// routes:not-a-handler` — use this
 *     annotation to mark utility imports (constants, helpers, middleware
 *     factories) that are intentionally used inside handler bodies rather
 *     than wired directly to a route.
 *
 * ── Escape hatch ─────────────────────────────────────────────────────────────
 *   Add `// routes:not-a-handler` to the import line (or the opening line of
 *   a multi-line import) to suppress the check for every binding on that line:
 *
 *     import { ledgerEvent } from "./spectral-ledger"; // routes:not-a-handler
 *
 * ── Exported API ─────────────────────────────────────────────────────────────
 *   checkUnwiredHandlers(routesFile?)  →  Promise<Violation[]>
 *   Runnable as `npm run check:unwired-handlers` for CI/local use.
 *   Also invoked by `npm run test:all`.
 */

import { readFile } from "fs/promises";
import path from "path";

export const NOT_A_HANDLER_ANNOTATION = "routes:not-a-handler";

export interface Violation {
  /** Local binding name that was imported but never wired. */
  name: string;
  /** Source module path (as written in the import statement). */
  source: string;
  /** 1-based line number of the import statement in routes.ts. */
  importLine: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Collect every identifier that appears as a direct argument (paren depth == 1)
 * of any `app.get(`, `app.post(`, `app.put(`, `app.delete(`,
 * `app.patch(`, or `app.use(` call in `content`.
 *
 * "Direct argument" means the identifier is at the first level of nesting
 * inside the call's argument list, NOT inside a nested callback body.
 *
 *   app.post("/path", authenticate, amendmentHandler)
 *                     ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^   ← captured
 *
 *   app.post("/path", authenticate, async (req, res) => { storage.foo() })
 *                     ^^^^^^^^^^^^                         ↑ NOT captured (depth 2+)
 */
/**
 * Advance `i` past a string literal starting at position `i` in `src`.
 * `src[i]` must be the opening quote character (", ', or `).
 * Returns the index of the character AFTER the closing quote.
 */
function skipStringLiteral(src: string, i: number): number {
  const quote = src[i];
  i++; // move past the opening quote
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      i += 2; // skip escaped character
      continue;
    }
    if (ch === quote) return i + 1; // past closing quote
    // Template literal: skip ${...} expressions naively by tracking braces
    if (quote === "`" && ch === "$" && src[i + 1] === "{") {
      i += 2; // skip ${
      let braceDepth = 1;
      while (i < src.length && braceDepth > 0) {
        if (src[i] === "{") braceDepth++;
        else if (src[i] === "}") braceDepth--;
        i++;
      }
      continue;
    }
    i++;
  }
  return i;
}

/**
 * Advance `i` past a block comment starting at position `i` in `src`.
 * `src[i]` must be `/` and `src[i+1]` must be `*`.
 * Returns the index of the character AFTER the closing `*\/`.
 */
function skipBlockComment(src: string, i: number): number {
  i += 2; // skip /*
  while (i < src.length) {
    if (src[i] === "*" && src[i + 1] === "/") return i + 2;
    i++;
  }
  return i;
}

/**
 * Strip ALL JavaScript comments from `src` while preserving string literals.
 *
 * Both forms are handled:
 *   - `// …` line comments (including mid-line ones): blanked to end of line.
 *   - `/* … *\/` block comments: replaced with whitespace (newlines kept so
 *     line numbers stay intact).
 *
 * String/template literals are passed through unchanged so identifiers
 * inside route path strings (e.g. `"/fooHandler"`) are not accidentally
 * exposed as real code.
 */
export function stripAllComments(src: string): string {
  let out = "";
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    // ── String/template literals: copy verbatim ───────────────────────────
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipStringLiteral(src, i);
      out += src.slice(i, end);
      i = end;
      continue;
    }

    // ── Block comment /* … */: replace non-newline chars with spaces ──────
    if (ch === "/" && src[i + 1] === "*") {
      const end = skipBlockComment(src, i);
      const comment = src.slice(i, end);
      // Preserve newlines so line numbering stays intact
      out += comment.replace(/[^\n]/g, " ");
      i = end;
      continue;
    }

    // ── Line comment // …: blank to end of line (leave \n) ───────────────
    if (ch === "/" && src[i + 1] === "/") {
      let j = i;
      while (j < src.length && src[j] !== "\n") j++;
      out += " ".repeat(j - i); // replace comment chars with spaces
      i = j;                     // \n will be copied in the next iteration
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

export function collectDirectRouteArgs(content: string): Set<string> {
  const args = new Set<string>();

  // Strip ALL comments (line and block) while preserving string literals,
  // so that commented-out routes — `// app.post(…, handler)`,
  // `/* app.post(…, handler) */`, trailing `// … handler` — cannot
  // masquerade as real registrations.
  const stripped = stripAllComments(content);

  // Match app.get(  app.post(  app.put(  app.delete(  app.patch(  app.use(
  const RE = /\bapp\.(get|post|put|delete|patch|use)\s*\(/g;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(stripped)) !== null) {
    const callStart = m.index + m[0].length; // character after the opening (
    let depth = 1;
    let identStart = -1;
    let i = callStart;

    while (i < stripped.length) {
      const ch = stripped[i];

      // ── Skip string literals (path strings, template literals) ────────────
      if (ch === '"' || ch === "'" || ch === "`") {
        if (identStart !== -1) {
          if (depth === 1) args.add(stripped.slice(identStart, i));
          identStart = -1;
        }
        i = skipStringLiteral(stripped, i);
        continue;
      }

      // ── Depth tracking ────────────────────────────────────────────────────
      if (ch === "(" || ch === "[" || ch === "{") {
        if (identStart !== -1) {
          if (depth === 1) args.add(stripped.slice(identStart, i));
          identStart = -1;
        }
        depth++;
      } else if (ch === ")" || ch === "]" || ch === "}") {
        if (identStart !== -1) {
          if (depth === 1) args.add(stripped.slice(identStart, i));
          identStart = -1;
        }
        depth--;
        if (depth === 0) break;
      } else if (depth === 1) {
        // Direct argument list — collect identifier tokens
        if (identStart === -1 && /[a-zA-Z_$]/.test(ch)) {
          identStart = i;
        } else if (identStart !== -1 && !/[a-zA-Z0-9_$]/.test(ch)) {
          args.add(stripped.slice(identStart, i));
          identStart = -1;
        }
      } else {
        // Nested depth — discard any partial identifier
        identStart = -1;
      }

      i++;
    }
  }

  return args;
}

/**
 * Parse named imports from local relative modules out of `content`.
 * Returns an array of { name, source, importLine } records.
 *
 * Rules:
 *   • `import type { ... }` — skipped entirely.
 *   • `import * as ns from "..."` — skipped (namespace, not a named handler).
 *   • Non-local paths (not starting with "./" or "../") — skipped.
 *   • Import lines carrying `// routes:not-a-handler` — every binding on
 *     that line (or its opening line for multi-line imports) is skipped.
 */
export function parseLocalNamedImports(
  content: string,
): Array<{ name: string; source: string; importLine: number }> {
  const results: Array<{ name: string; source: string; importLine: number }> =
    [];
  const lines = content.split("\n");

  // We match single- and multi-line named imports.
  // Pattern: import [type] { ... } from "..."
  // We'll use a line-by-line accumulator for multi-line imports.

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Check for the start of a named import
    if (!trimmed.startsWith("import ")) {
      i++;
      continue;
    }

    // Skip type-only imports
    if (/^import\s+type\b/.test(trimmed)) {
      i++;
      continue;
    }

    // Skip namespace imports (import * as ...)
    if (/^import\s+\*\s+as\b/.test(trimmed)) {
      i++;
      continue;
    }

    // Must contain { to be a named import
    if (!trimmed.includes("{")) {
      i++;
      continue;
    }

    const importLineNo = i + 1; // 1-based

    // Check the escape annotation on THIS line (the opening line)
    if (line.includes(NOT_A_HANDLER_ANNOTATION)) {
      // Skip this entire import block — advance until the closing from "..."
      while (i < lines.length && !lines[i].includes(" from ")) i++;
      i++;
      continue;
    }

    // Accumulate the full import statement (handles multi-line)
    let block = line;
    while (!block.includes(" from ") && i + 1 < lines.length) {
      i++;
      // Also check continuation lines for the annotation
      if (lines[i].includes(NOT_A_HANDLER_ANNOTATION)) {
        // Annotated on a continuation line — skip the whole block
        while (i < lines.length && !lines[i].includes(" from ")) i++;
        block = ""; // signal to skip
        break;
      }
      block += "\n" + lines[i];
    }

    if (!block) {
      i++;
      continue;
    }

    // Extract the source path
    const fromMatch = block.match(/from\s+["']([^"']+)["']/);
    if (!fromMatch) {
      i++;
      continue;
    }
    const source = fromMatch[1];

    // Only care about local relative paths
    if (!source.startsWith("./") && !source.startsWith("../")) {
      i++;
      continue;
    }

    // Extract named bindings between { and }
    const braceMatch = block.match(/\{([^}]+)\}/s);
    if (!braceMatch) {
      i++;
      continue;
    }

    const bindingsRaw = braceMatch[1];
    // Split on commas; each binding is either "name" or "original as alias"
    const bindings = bindingsRaw.split(",").map((b) => b.trim()).filter(Boolean);

    for (const binding of bindings) {
      // Skip type-only bindings: `type Foo`
      if (/^type\b/.test(binding)) continue;

      // Handle "original as localName" — we want the LOCAL name
      const asMatch = binding.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
      const name = asMatch ? asMatch[1] : binding.replace(/\s+as\s+.*$/, "").trim();

      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
        results.push({ name, source, importLine: importLineNo });
      }
    }

    i++;
  }

  return results;
}

// ── Main exported check ───────────────────────────────────────────────────────

/**
 * Check that every named import from a local module in routes.ts is wired to
 * at least one Express route registration.
 *
 * @param routesFile  Absolute path to routes.ts (defaults to server/routes.ts).
 * @returns           Array of violations — empty means the file is clean.
 */
export async function checkUnwiredHandlers(
  routesFile: string = path.resolve("server", "routes.ts"),
): Promise<Violation[]> {
  let content: string;
  try {
    content = await readFile(routesFile, "utf-8");
  } catch {
    throw new Error(
      `[check-unwired-handlers] Cannot read file: ${routesFile}`,
    );
  }

  const imports = parseLocalNamedImports(content);
  const directArgs = collectDirectRouteArgs(content);

  const violations: Violation[] = [];
  for (const imp of imports) {
    if (!directArgs.has(imp.name)) {
      violations.push(imp);
    }
  }

  return violations;
}

// ── Standalone entry (npm run check:unwired-handlers) ─────────────────────────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkUnwiredHandlers()
    .then((violations) => {
      if (violations.length === 0) {
        console.log(
          "[check-unwired-handlers] ✓ All locally-imported handlers are wired to a route.",
        );
        return;
      }

      console.error(
        `[check-unwired-handlers] ✗ ${violations.length} imported handler(s) found with no Express route registration:\n`,
      );
      for (const v of violations) {
        console.error(
          `  routes.ts:${v.importLine}  '${v.name}' from '${v.source}'`,
        );
      }
      console.error(
        `\nFix: add a route registration, e.g.\n` +
          `  app.post("/api/your-endpoint", authenticate, ${violations[0]?.name});\n` +
          `\nIf the import is a utility/constant (not a route handler), add:\n` +
          `  // ${NOT_A_HANDLER_ANNOTATION}\n` +
          `to the import line to suppress this check.`,
      );
      process.exit(1);
    })
    .catch((err: Error) => {
      console.error(err.message);
      process.exit(1);
    });
}
