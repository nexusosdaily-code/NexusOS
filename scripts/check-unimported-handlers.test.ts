/**
 * check-unimported-handlers.test.ts
 *
 * Unit tests for checkUnimportedHandlers() and isTypeOnlyImport().
 * All file-system access is mocked — no live server/ directory is needed.
 *
 * Scenarios covered:
 *   1.  Clean file — handler has a runtime import in routes.ts → passes.
 *   2.  Handler file exists but is NOT imported at all → flagged.
 *   3.  Runtime import with .js extension → passes.
 *   4.  Only a type-only import (import type …) → still flagged.
 *   5.  Only a type-only namespace import → still flagged.
 *   6.  Both type-only AND runtime import → passes.
 *   7.  Ignore annotation on first line of handler file → skipped.
 *   8.  One of two handler files missing → only that one reported.
 *   9.  Multiple handler files all missing → all reported.
 *  10.  A *.test.ts file is not treated as a handler file.
 *  11.  Side-effect import passes.
 *  12.  Namespace runtime import passes.
 *  13.  Line-commented import is still flagged (comment-stripped).
 *  14.  Block-commented import is still flagged (comment-stripped).
 *  15.  Dynamic import() call is still flagged.
 *  16.  Unreadable routes.ts throws a descriptive error.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { readFile, readdir } from "fs/promises";
import {
  checkUnimportedHandlers,
  isTypeOnlyImport,
  isDynamicImport,
  IGNORE_ANNOTATION,
} from "./check-unimported-handlers.js";

const mockReadFile = readFile as ReturnType<typeof vi.fn>;
const mockReaddir  = readdir  as ReturnType<typeof vi.fn>;

import path from "path";
const SERVER_DIR  = path.resolve("server");
const ROUTES_FILE = path.resolve("server", "routes.ts");

function setup(options: {
  handlerFiles: string[];
  routesContent: string;
  handlerFirstLines?: Record<string, string>;
}) {
  mockReaddir.mockImplementation(async (dir: string) => {
    if (dir === SERVER_DIR) return options.handlerFiles;
    return [];
  });

  mockReadFile.mockImplementation(async (filePath: string) => {
    if (filePath === ROUTES_FILE) return options.routesContent;
    const filename = path.basename(filePath as string);
    const firstLine = options.handlerFirstLines?.[filename] ?? "export function handler() {}";
    return firstLine;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── isTypeOnlyImport() ────────────────────────────────────────────────────────

describe("isTypeOnlyImport()", () => {
  it("returns true for a type-only named import line", () => {
    expect(isTypeOnlyImport('import type { FooHandler } from "./foo-handler"')).toBe(true);
  });

  it("returns true for a type-only namespace import line", () => {
    expect(isTypeOnlyImport('import type * as FooNS from "./foo-handler"')).toBe(true);
  });

  it("returns false for a normal named import", () => {
    expect(isTypeOnlyImport('import { fooHandler } from "./foo-handler"')).toBe(false);
  });

  it("returns false for a default import", () => {
    expect(isTypeOnlyImport('import fooHandler from "./foo-handler"')).toBe(false);
  });

  it("returns false for a namespace runtime import", () => {
    expect(isTypeOnlyImport('import * as fooHandler from "./foo-handler"')).toBe(false);
  });

  it("returns false for a side-effect import", () => {
    expect(isTypeOnlyImport('import "./foo-handler"')).toBe(false);
  });
});

// ── isDynamicImport() ─────────────────────────────────────────────────────────

describe("isDynamicImport()", () => {
  it("returns true when import does not start the statement", () => {
    expect(isDynamicImport('const { h } = await import("./foo-handler")')).toBe(true);
  });

  it("returns false for a static named import", () => {
    expect(isDynamicImport('import { fooHandler } from "./foo-handler"')).toBe(false);
  });

  it("returns false for a static side-effect import", () => {
    expect(isDynamicImport('import "./foo-handler"')).toBe(false);
  });
});

// ── checkUnimportedHandlers() ─────────────────────────────────────────────────

describe("checkUnimportedHandlers()", () => {
  it("passes when the handler has a runtime named import (no extension)", async () => {
    setup({
      handlerFiles: ["foo-handler.ts"],
      routesContent: 'import { fooHandler } from "./foo-handler";\napp.post("/api/foo", fooHandler);',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toHaveLength(0);
  });

  it("passes when the handler has a runtime import with .js extension", async () => {
    setup({
      handlerFiles: ["foo-handler.ts"],
      routesContent: 'import { fooHandler } from "./foo-handler.js";\napp.post("/api/foo", fooHandler);',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toHaveLength(0);
  });

  it("flags a handler file that has NO import at all in routes.ts", async () => {
    setup({
      handlerFiles: ["bar-handler.ts"],
      routesContent: 'import { otherHandler } from "./other-handler";\napp.post("/api/other", otherHandler);',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("bar-handler");
  });

  it("flags a handler with only a type-only import", async () => {
    // type-only imports are erased at compile time; the module never loads
    setup({
      handlerFiles: ["typed-handler.ts"],
      routesContent: 'import type { TypedHandler } from "./typed-handler";\n// no runtime import',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("typed-handler");
  });

  it("flags a handler with only a type-only namespace import", async () => {
    setup({
      handlerFiles: ["typed-ns-handler.ts"],
      routesContent: 'import type * as TypedNS from "./typed-ns-handler";\n// no runtime import',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("typed-ns-handler");
  });

  it("passes when routes.ts has both a type-only AND a runtime import for the same handler", async () => {
    setup({
      handlerFiles: ["dual-handler.ts"],
      routesContent: [
        'import type { DualHandlerType } from "./dual-handler";',
        'import { dualHandler } from "./dual-handler";',
        'app.post("/api/dual", dualHandler);',
      ].join("\n"),
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toHaveLength(0);
  });

  it("skips a handler file whose first line contains the ignore annotation", async () => {
    setup({
      handlerFiles: ["dynamic-handler.ts"],
      routesContent: "// no static import for dynamic-handler",
      handlerFirstLines: {
        "dynamic-handler.ts": `// ${IGNORE_ANNOTATION} — registered at runtime`,
      },
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toHaveLength(0);
  });

  it("reports only the missing handler when one of two is properly imported", async () => {
    setup({
      handlerFiles: ["alpha-handler.ts", "beta-handler.ts"],
      routesContent: 'import { alphaHandler } from "./alpha-handler";\napp.post("/api/alpha", alphaHandler);',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("beta-handler");
    expect(missing).not.toContain("alpha-handler");
  });

  it("reports all missing handlers when multiple are unimported", async () => {
    setup({
      handlerFiles: ["x-handler.ts", "y-handler.ts", "z-handler.ts"],
      routesContent: "// no handler imports",
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("x-handler");
    expect(missing).toContain("y-handler");
    expect(missing).toContain("z-handler");
  });

  it("does NOT treat a *.test.ts file as a handler file", async () => {
    setup({
      handlerFiles: ["foo-handler.test.ts"],
      routesContent: "// no imports",
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toHaveLength(0);
  });

  it("passes for a side-effect import", async () => {
    setup({
      handlerFiles: ["foo-handler.ts"],
      routesContent: 'import "./foo-handler";\n// side-effect only',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toHaveLength(0);
  });

  it("passes for a namespace runtime import", async () => {
    setup({
      handlerFiles: ["foo-handler.ts"],
      routesContent: 'import * as fooHandler from "./foo-handler";\napp.use("/api/foo", fooHandler.handle);',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toHaveLength(0);
  });

  it("flags a handler whose import is commented out with a line comment", async () => {
    // The comment-stripping step must blank this line before matching
    setup({
      handlerFiles: ["foo-handler.ts"],
      routesContent: '// import { fooHandler } from "./foo-handler";\napp.post("/api/foo", fooHandler);',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("foo-handler");
  });

  it("flags a handler whose import is inside a block comment", async () => {
    // Block-commented import: content between /* and end-of-block is stripped
    const commentedImport = [
      "/*",
      ' * import { fooHandler } from "./foo-handler";',
      " */",
    ].join("\n");
    setup({
      handlerFiles: ["foo-handler.ts"],
      routesContent: commentedImport + '\napp.post("/api/foo", fooHandler);',
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("foo-handler");
  });

  it("flags a handler referenced only via a dynamic import() call", async () => {
    // Dynamic imports do not register the handler at mount time
    const dynamicOnly = [
      'app.post("/api/foo", async (req, res) => {',
      '  const { fooHandler } = await import("./foo-handler");',
      "  fooHandler(req, res);",
      "});",
    ].join("\n");
    setup({
      handlerFiles: ["foo-handler.ts"],
      routesContent: dynamicOnly,
    });
    const missing = await checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE);
    expect(missing).toContain("foo-handler");
  });

  it("throws a descriptive error when routes.ts cannot be read", async () => {
    mockReaddir.mockResolvedValue(["foo-handler.ts"]);
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath === ROUTES_FILE) throw new Error("ENOENT");
      return "export function handler() {}";
    });
    await expect(
      checkUnimportedHandlers(SERVER_DIR, ROUTES_FILE),
    ).rejects.toThrow("[check-unimported-handlers] Cannot read routes file");
  });
});
