/**
 * check-unwired-handlers.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for checkUnwiredHandlers(), collectDirectRouteArgs(), and
 * parseLocalNamedImports().
 *
 * All file-system access is mocked so no live server/ directory is needed.
 *
 * Scenarios covered:
 *   1.  Clean file — handler imported AND wired → zero violations.
 *   2.  Handler imported but never appears in any app.* call → violation.
 *   3.  Handler wired on a single line as a direct arg → passes.
 *   4.  Handler wired in a multi-line app.post() call → passes.
 *   5.  Utility used only inside an inline async lambda body → violation
 *       (it is at depth > 1, i.e. not a direct route arg).
 *   6.  Import annotated with `// routes:not-a-handler` → skipped entirely.
 *   7.  `import type { ... }` → skipped entirely.
 *   8.  `import * as ns from "..."` → skipped entirely.
 *   9.  Non-local import (bare package name / @scope) → skipped entirely.
 *  10.  `as`-aliased import — local alias checked, not the original name.
 *  11.  Multiple violations across several imports → all reported.
 *  12.  Unreadable routes.ts → throws descriptive error.
 *  13.  Real-world pattern: amendmentHandler wired via authenticate middleware.
 *  14.  Dummy handler imported but not wired → violation flagged (the
 *       "accidentally omitted route" scenario the check is designed to catch).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "fs/promises";
import {
  checkUnwiredHandlers,
  collectDirectRouteArgs,
  parseLocalNamedImports,
  NOT_A_HANDLER_ANNOTATION,
} from "./check-unwired-handlers.js";

const mockReadFile = readFile as ReturnType<typeof vi.fn>;

function setupRoutes(content: string) {
  mockReadFile.mockResolvedValue(content);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── collectDirectRouteArgs ────────────────────────────────────────────────────

describe("collectDirectRouteArgs()", () => {
  it("captures an identifier that is a direct argument to app.post()", () => {
    const content = `app.post("/api/foo", authenticate, fooHandler);`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("fooHandler")).toBe(true);
    expect(args.has("authenticate")).toBe(true);
  });

  it("does NOT capture an identifier used only inside an async lambda body", () => {
    const content = `app.post("/api/foo", async (req, res) => { storage.doThing(); });`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("storage")).toBe(false);
  });

  it("handles multi-line app.post() with handler on its own line", () => {
    const content = [
      `app.post(`,
      `  "/api/constitution/amendments",`,
      `  authenticate,`,
      `  amendmentHandler`,
      `);`,
    ].join("\n");
    const args = collectDirectRouteArgs(content);
    expect(args.has("amendmentHandler")).toBe(true);
    expect(args.has("authenticate")).toBe(true);
  });

  it("captures args across all HTTP method variants", () => {
    const content = [
      `app.get("/a", handlerA);`,
      `app.put("/b", handlerB);`,
      `app.delete("/c", handlerC);`,
      `app.patch("/d", handlerD);`,
      `app.use("/e", handlerE);`,
    ].join("\n");
    const args = collectDirectRouteArgs(content);
    for (const h of ["handlerA", "handlerB", "handlerC", "handlerD", "handlerE"]) {
      expect(args.has(h)).toBe(true);
    }
  });

  it("does not capture identifiers inside a nested object literal arg", () => {
    const content = `app.get("/a", mw, async (req, res) => { const x = { key: helper() }; });`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("helper")).toBe(false);
  });

  it("does NOT treat a handler-like word inside the route path string as a direct arg", () => {
    // e.g. app.get("/newHandler", async (req, res) => { ... })
    // "newHandler" appears in the string but is not a real argument
    const content = `app.get("/newHandler", async (req, res) => { res.json({}); });`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("newHandler")).toBe(false);
  });

  it("does NOT treat a handler-like word inside a double-quoted string arg as a direct arg", () => {
    const content = `app.post("/api/foo", "fakeHandler", async (req, res) => { res.json({}); });`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("fakeHandler")).toBe(false);
  });

  it("does NOT treat a handler-like word inside a block comment as a direct arg", () => {
    // e.g. app.post("/api/x", /* ghostHandler */ authenticate, async ...)
    const content = `app.post("/api/x", /* ghostHandler */ authenticate, async (req, res) => { res.json({}); });`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("ghostHandler")).toBe(false);
    expect(args.has("authenticate")).toBe(true); // real arg still captured
  });

  it("does NOT treat a handler-like word inside a template-literal path as a direct arg", () => {
    const content = "app.get(`/api/fooHandler/${id}`, async (req, res) => { res.json({}); });";
    const args = collectDirectRouteArgs(content);
    expect(args.has("fooHandler")).toBe(false);
  });

  it("does NOT treat a handler inside a trailing // comment as a direct arg", () => {
    // Trailing comment on a real route line — the handler name is in the comment, not the call
    const content = `app.post("/api/x", realHandler); // was: ghostHandler`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("ghostHandler")).toBe(false);
    expect(args.has("realHandler")).toBe(true);
  });

  it("does NOT treat a handler inside a mid-line // comment as a direct arg", () => {
    const content = `something();\napp.post("/api/x", realHandler); // app.post("/api/old", oldHandler)`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("oldHandler")).toBe(false);
    expect(args.has("realHandler")).toBe(true);
  });

  it("does NOT match app.post() inside a /* */ block comment", () => {
    // Entire route registration commented out with a block comment
    const content = `/* app.post("/api/x", ghostHandler); */\napp.get("/api/y", realHandler);`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("ghostHandler")).toBe(false);
    expect(args.has("realHandler")).toBe(true);
  });

  it("does NOT capture a name inside an inline /* */ block comment within a call", () => {
    // Block comment inside the argument list — only realHandler is a true arg
    const content = `app.post("/api/x", /* ghostHandler */ realHandler);`;
    const args = collectDirectRouteArgs(content);
    expect(args.has("ghostHandler")).toBe(false);
    expect(args.has("realHandler")).toBe(true);
  });
});

// ── parseLocalNamedImports ────────────────────────────────────────────────────

describe("parseLocalNamedImports()", () => {
  it("extracts named bindings from a local relative import", () => {
    const content = `import { fooHandler } from "./foo-handler";\n`;
    const imports = parseLocalNamedImports(content);
    expect(imports).toHaveLength(1);
    expect(imports[0].name).toBe("fooHandler");
    expect(imports[0].source).toBe("./foo-handler");
    expect(imports[0].importLine).toBe(1);
  });

  it("skips import type { ... }", () => {
    const content = `import type { FooType } from "./foo";\n`;
    expect(parseLocalNamedImports(content)).toHaveLength(0);
  });

  it("skips namespace imports (import * as)", () => {
    const content = `import * as ns from "./some-module";\n`;
    expect(parseLocalNamedImports(content)).toHaveLength(0);
  });

  it("skips non-local imports (bare package names, @scoped)", () => {
    const content = [
      `import { z } from "zod";\n`,
      `import { something } from "@shared/schema";\n`,
    ].join("");
    expect(parseLocalNamedImports(content)).toHaveLength(0);
  });

  it("resolves 'original as alias' to the local alias name", () => {
    const content = `import { getPublicKey as latticeGetPublicKey } from "./lattice-identity";\n`;
    const imports = parseLocalNamedImports(content);
    expect(imports).toHaveLength(1);
    expect(imports[0].name).toBe("latticeGetPublicKey");
  });

  it("skips individual type-only bindings inside a mixed import", () => {
    const content = `import { transpileToWLS, SUPPORTED_LANGS, type SupportedLang } from "./lang-transpiler";\n`;
    const imports = parseLocalNamedImports(content);
    const names = imports.map((i) => i.name);
    expect(names).toContain("transpileToWLS");
    expect(names).toContain("SUPPORTED_LANGS");
    expect(names).not.toContain("SupportedLang");
  });

  it(`skips every binding on a line annotated with '${NOT_A_HANDLER_ANNOTATION}'`, () => {
    const content = `import { ledgerEvent } from "./spectral-ledger"; // ${NOT_A_HANDLER_ANNOTATION}\n`;
    expect(parseLocalNamedImports(content)).toHaveLength(0);
  });

  it("handles multi-line imports and records the opening line number", () => {
    const content = [
      `import {`,
      `  fooHandler,`,
      `  barHandler`,
      `} from "./handlers";`,
    ].join("\n") + "\n";
    const imports = parseLocalNamedImports(content);
    expect(imports).toHaveLength(2);
    expect(imports.map((i) => i.name).sort()).toEqual(["barHandler", "fooHandler"]);
    // All bindings report the opening import line
    expect(imports.every((i) => i.importLine === 1)).toBe(true);
  });
});

// ── checkUnwiredHandlers ──────────────────────────────────────────────────────

describe("checkUnwiredHandlers()", () => {
  it("returns zero violations when the handler is wired on the same line", async () => {
    setupRoutes([
      `import { fooHandler } from "./foo-handler";`,
      `export async function registerRoutes(app) {`,
      `  app.post("/api/foo", authenticate, fooHandler);`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });

  it("flags a handler that is imported but never appears in any app.* call", async () => {
    setupRoutes([
      `import { dummyHandler } from "./dummy-handler";`,
      `export async function registerRoutes(app) {`,
      `  app.post("/api/other", authenticate, async (req, res) => { res.json({}); });`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(1);
    expect(violations[0].name).toBe("dummyHandler");
    expect(violations[0].source).toBe("./dummy-handler");
  });

  it("flags a utility function used only inside a lambda body (not a direct arg)", async () => {
    setupRoutes([
      `import { helperUtil } from "./helper-util";`,
      `export async function registerRoutes(app) {`,
      `  app.get("/api/x", async (req, res) => { helperUtil(req); res.json({}); });`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(1);
    expect(violations[0].name).toBe("helperUtil");
  });

  it(`skips an import annotated with '${NOT_A_HANDLER_ANNOTATION}'`, async () => {
    setupRoutes([
      `import { helperUtil } from "./helper-util"; // ${NOT_A_HANDLER_ANNOTATION}`,
      `export async function registerRoutes(app) {`,
      `  app.get("/api/x", async (req, res) => { helperUtil(req); res.json({}); });`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });

  it("returns zero violations when handler appears in a multi-line route call", async () => {
    setupRoutes([
      `import { amendmentHandler } from "./amendment-handler";`,
      `export async function registerRoutes(app) {`,
      `  app.post(`,
      `    "/api/constitution/amendments",`,
      `    authenticate,`,
      `    amendmentHandler`,
      `  );`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });

  it("reports all violations across multiple imports", async () => {
    setupRoutes([
      `import { alphaHandler } from "./alpha-handler";`,
      `import { betaHandler } from "./beta-handler";`,
      `export async function registerRoutes(app) {`,
      `  app.get("/api/something", async (req, res) => { res.json({}); });`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(2);
    const names = violations.map((v) => v.name).sort();
    expect(names).toEqual(["alphaHandler", "betaHandler"]);
  });

  it("throws a descriptive error when routes.ts cannot be read", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: file not found"));
    await expect(checkUnwiredHandlers("/nonexistent/routes.ts")).rejects.toThrow(
      /Cannot read file/,
    );
  });

  it("real-world pattern: amendmentHandler wired alongside middleware passes", async () => {
    setupRoutes([
      `import { authenticate } from "./auth";`,
      `import { amendmentHandler } from "./amendment-handler.js";`,
      `export async function registerRoutes(app) {`,
      `  app.post("/api/constitution/amendments", authenticate, amendmentHandler);`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(0);
  });

  it("dummy-handler scenario: import without wiring is flagged (the core regression guard)", async () => {
    // This is the exact scenario the check is designed to catch:
    // a developer adds an import for a new handler module but forgets
    // to add the corresponding app.post() registration.
    setupRoutes([
      `import { authenticate } from "./auth";`,
      `import { amendmentHandler } from "./amendment-handler.js";`,
      `import { dummyHandler } from "./dummy-handler";`,   // ← forgotten route
      `export async function registerRoutes(app) {`,
      `  app.post("/api/constitution/amendments", authenticate, amendmentHandler);`,
      `  // app.post("/api/dummy", authenticate, dummyHandler);  <-- accidentally commented out`,
      `}`,
    ].join("\n"));

    const violations = await checkUnwiredHandlers("/fake/routes.ts");
    expect(violations).toHaveLength(1);
    expect(violations[0].name).toBe("dummyHandler");
    expect(violations[0].source).toBe("./dummy-handler");
  });
});
