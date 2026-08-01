/**
 * Tests for check-unwired-handlers.ts
 *
 * Covers:
 *   1. package.json guard — `test:all` must include `check:unwired-handlers`
 *      so that removing it from the pipeline is caught immediately.
 *   2. checkUnwiredHandlers() logic — mocks fs/promises so no real
 *      server/routes.ts is needed.
 *        a. A clean routes file (all imports wired) returns no violations.
 *        b. A routes file with one unwired import returns that violation.
 *        c. An unreadable file throws with the expected message.
 *   3. Helper unit tests — stripAllComments() and collectDirectRouteArgs()
 *      behave correctly in edge cases.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ── mock fs/promises BEFORE importing the module under test ──────────────────
vi.mock("fs/promises", () => ({ readFile: vi.fn() }));

import { readFile } from "fs/promises";
import {
  checkUnwiredHandlers,
  stripAllComments,
  collectDirectRouteArgs,
  parseLocalNamedImports,
} from "./check-unwired-handlers.js";

const mockReadFile = readFile as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1. package.json pipeline guard ───────────────────────────────────────────

describe("package.json pipeline guard", () => {
  it('test:all script contains "check:unwired-handlers"', () => {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      scripts?: Record<string, string>;
    };

    const testAll: string = pkg.scripts?.["test:all"] ?? "";
    expect(testAll).toContain("check:unwired-handlers");
  });
});

// ── 2. checkUnwiredHandlers() integration-style tests ────────────────────────

/** Builds a minimal routes.ts source string. */
function buildRoutes(
  imports: string,
  registrations: string,
): string {
  return `
import express from "express";
${imports}

const app = express();

${registrations}
`.trim();
}

describe("checkUnwiredHandlers()", () => {
  it("returns no violations when every local import is wired", async () => {
    const src = buildRoutes(
      `import { fooHandler } from "./foo";`,
      `app.get("/api/foo", fooHandler);`,
    );
    mockReadFile.mockResolvedValue(src);

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });

  it("returns a violation for an import that is never wired", async () => {
    const src = buildRoutes(
      `import { barHandler } from "./bar";`,
      `// no registration for barHandler`,
    );
    mockReadFile.mockResolvedValue(src);

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(1);
    expect(violations[0].name).toBe("barHandler");
    expect(violations[0].source).toBe("./bar");
  });

  it("ignores imports annotated with routes:not-a-handler", async () => {
    const src = buildRoutes(
      `import { utilHelper } from "./util"; // routes:not-a-handler`,
      `// no registration — intentional`,
    );
    mockReadFile.mockResolvedValue(src);

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });

  it("throws when the routes file cannot be read", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

    await expect(checkUnwiredHandlers("/fake/routes.ts")).rejects.toThrow(
      /Cannot read file/,
    );
  });

  it("does not flag non-local (node_modules) imports", async () => {
    const src = buildRoutes(
      `import { something } from "some-package";`,
      `// no registration`,
    );
    mockReadFile.mockResolvedValue(src);

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });

  it("does not flag type-only imports", async () => {
    const src = buildRoutes(
      `import type { MyType } from "./my-types";`,
      `// no registration`,
    );
    mockReadFile.mockResolvedValue(src);

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });
});

// ── 3. stripAllComments() unit tests ─────────────────────────────────────────

describe("stripAllComments()", () => {
  it("removes line comments but keeps the newline", () => {
    const src = "const x = 1; // this is a comment\nconst y = 2;";
    const result = stripAllComments(src);
    expect(result).toContain("const x = 1;");
    expect(result).not.toContain("this is a comment");
    // newline preserved so line 2 stays on line 2
    expect(result.split("\n")).toHaveLength(2);
  });

  it("removes block comments while preserving newlines", () => {
    const src = "a /* block\ncomment */ b";
    const result = stripAllComments(src);
    expect(result).not.toContain("block");
    expect(result).not.toContain("comment");
    // original newline inside the block comment must be kept
    expect(result.split("\n")).toHaveLength(2);
  });

  it("does not strip content inside string literals", () => {
    const src = `const s = "// not a comment";`;
    const result = stripAllComments(src);
    expect(result).toContain("// not a comment");
  });
});

// ── 4. collectDirectRouteArgs() unit tests ───────────────────────────────────

describe("collectDirectRouteArgs()", () => {
  it("collects identifiers directly passed to app.post()", () => {
    const src = `app.post("/api/foo", authenticate, fooHandler);`;
    const args = collectDirectRouteArgs(src);
    expect(args.has("fooHandler")).toBe(true);
    expect(args.has("authenticate")).toBe(true);
  });

  it("does not collect identifiers inside nested callbacks", () => {
    const src = `app.post("/api/bar", async (req, res) => { barHelper(); });`;
    const args = collectDirectRouteArgs(src);
    expect(args.has("barHelper")).toBe(false);
  });

  it("does not collect identifiers in commented-out route registrations", () => {
    const src = `// app.post("/api/baz", bazHandler);`;
    const args = collectDirectRouteArgs(src);
    expect(args.has("bazHandler")).toBe(false);
  });
});

// ── 5. parseLocalNamedImports() unit tests ───────────────────────────────────

describe("parseLocalNamedImports()", () => {
  it("parses a single-line named import", () => {
    const src = `import { myHandler } from "./handlers";`;
    const imports = parseLocalNamedImports(src);
    expect(imports).toHaveLength(1);
    expect(imports[0].name).toBe("myHandler");
    expect(imports[0].source).toBe("./handlers");
  });

  it("parses multi-line named imports", () => {
    const src = `import {\n  handlerA,\n  handlerB\n} from "./multi";`;
    const imports = parseLocalNamedImports(src);
    expect(imports.map((i) => i.name)).toContain("handlerA");
    expect(imports.map((i) => i.name)).toContain("handlerB");
  });

  it("skips imports with the not-a-handler annotation", () => {
    const src = `import { util } from "./util"; // routes:not-a-handler`;
    const imports = parseLocalNamedImports(src);
    expect(imports).toHaveLength(0);
  });
});
