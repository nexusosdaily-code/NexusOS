/**
 * check-system-band-literal.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for checkSystemBandLiteral().
 *
 * All file-system access is mocked so no live server/ directory is needed.
 *
 * Scenarios covered:
 *   1. Clean tree — no literal anywhere → zero violations.
 *   2. Literal in constitution_seal.ts → exempt by basename, zero violations.
 *   3. Literal on a "//" comment line → exempt, zero violations.
 *   4. Literal on a " * " JSDoc line → exempt, zero violations.
 *   5. Literal in functional code → violation reported with correct file+line.
 *   6. Literal with // check:allow-literal annotation → exempt.
 *   7. Multiple violations across multiple files → all reported.
 *   8. Literal in a nested subdirectory file (e.g. scripts/foo.ts) → flagged.
 *   9. Unreadable server/ directory → throws descriptive error.
 *  10. Non-.ts files are ignored entirely.
 *  11. package.json test:all includes check:system-band → CI regression guard.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ── mock fs/promises BEFORE importing the module under test ───────────────────
vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

import { readdir, readFile } from "fs/promises";
import {
  checkSystemBandLiteral,
  SYSTEM_BAND_LITERAL,
  ALLOW_ANNOTATION,
} from "./check-system-band-literal.js";

const mockReaddir = readdir as ReturnType<typeof vi.fn>;
const mockReadFile = readFile as ReturnType<typeof vi.fn>;

/**
 * Populate mocks with a flat map of relative path → file content.
 * readdir returns all keys; readFile resolves by basename lookup.
 */
function setupFiles(files: Record<string, string>) {
  const relPaths = Object.keys(files);
  mockReaddir.mockResolvedValue(relPaths);
  mockReadFile.mockImplementation(async (p: string) => {
    // Match on the relative path component after the fake serverDir
    const normalised = p.toString().replace(/\\/g, "/");
    const match = relPaths.find((rel) => normalised.endsWith("/" + rel) || normalised === rel);
    if (match !== undefined) return files[match];
    throw new Error(`ENOENT: unexpected path in test: ${p}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkSystemBandLiteral()", () => {
  it("returns zero violations when no server file contains the literal", async () => {
    setupFiles({
      "routes.ts": `import { CONSTITUTION_PSI } from "./constitution_seal";\nconst x = CONSTITUTION_PSI;\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("exempts constitution_seal.ts entirely (matched by basename)", async () => {
    setupFiles({
      // The definition file — must never be flagged regardless of its position
      "constitution_seal.ts": `export const CONSTITUTION_PSI = "${SYSTEM_BAND_LITERAL}";\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("exempts a line whose first non-whitespace chars are '//' (inline comment)", async () => {
    setupFiles({
      "genesis_user.ts": `//   SYSTEM  — Replit AI (wnsp://${SYSTEM_BAND_LITERAL}/test)\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("exempts a line whose first non-whitespace chars are '*' (JSDoc / block comment)", async () => {
    setupFiles({
      "some_module.ts": ` * block at the SYSTEM band — ${SYSTEM_BAND_LITERAL} · 542.5 nm.\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("flags a bare literal in functional code and reports file + 1-based line number", async () => {
    const badLine = `  psiChannel: "${SYSTEM_BAND_LITERAL}",`;
    setupFiles({
      "some_route.ts": `import something from "x";\n${badLine}\nexport default {};\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");

    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe("some_route.ts");
    expect(violations[0].line).toBe(2);
    expect(violations[0].text).toBe(badLine);
  });

  it(`exempts a line that carries the '${ALLOW_ANNOTATION}' annotation`, async () => {
    setupFiles({
      "amendment_route.test.ts":
        `  CONSTITUTION_PSI: "${SYSTEM_BAND_LITERAL}", // ${ALLOW_ANNOTATION}\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("reports all violations across multiple files and skips exempt lines", async () => {
    setupFiles({
      "routes.ts": [
        `const a = "${SYSTEM_BAND_LITERAL}";`,              // line 1 — bad
        `// comment ${SYSTEM_BAND_LITERAL}`,                 // line 2 — ok (comment)
        `const b = "${SYSTEM_BAND_LITERAL}";`,              // line 3 — bad
      ].join("\n") + "\n",
      "another.ts": [
        `import { CONSTITUTION_PSI } from "./constitution_seal";`,       // line 1 — ok
        `const c = "${SYSTEM_BAND_LITERAL}"; // ${ALLOW_ANNOTATION}`,   // line 2 — ok (annotated)
        `export const bad = "${SYSTEM_BAND_LITERAL}";`,                  // line 3 — bad
      ].join("\n") + "\n",
      // Exempt: definition file
      "constitution_seal.ts": `export const CONSTITUTION_PSI = "${SYSTEM_BAND_LITERAL}";\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");

    expect(violations).toHaveLength(3);

    const routeViolations = violations.filter((v) => v.file === "routes.ts");
    expect(routeViolations).toHaveLength(2);
    expect(routeViolations.map((v) => v.line)).toEqual([1, 3]);

    const anotherViolations = violations.filter((v) => v.file === "another.ts");
    expect(anotherViolations).toHaveLength(1);
    expect(anotherViolations[0].line).toBe(3);
  });

  it("flags a literal in a nested subdirectory file (recursive coverage)", async () => {
    // readdir with { recursive: true } returns relative paths like "scripts/foo.ts"
    const badLine = `const psi = "${SYSTEM_BAND_LITERAL}";`;
    setupFiles({
      "scripts/fire-update.ts": `import x from "y";\n${badLine}\n`,
    });

    const violations = await checkSystemBandLiteral("/fake/server");

    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe("scripts/fire-update.ts");
    expect(violations[0].line).toBe(2);
  });

  it("throws a descriptive error when the server directory cannot be read", async () => {
    mockReaddir.mockRejectedValue(new Error("ENOENT: no such file or directory"));

    await expect(checkSystemBandLiteral("/nonexistent")).rejects.toThrow(
      /Cannot read directory/,
    );
  });

  it("only processes .ts files (ignores .js, .json, and paths without extensions)", async () => {
    // readdir returns a mix; only .ts files should be opened
    mockReaddir.mockResolvedValue(["routes.ts", "schema.json", "helpers.js", "subdir"]);
    mockReadFile.mockImplementation(async (p: string) => {
      const name = p.toString().split("/").pop()!;
      if (name === "routes.ts") return `const ok = "no literal here";\n`;
      // Any other file being read means the filter failed
      throw new Error(`Should not have read non-.ts entry: ${name}`);
    });

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });
});

// ─── CI integration guard ─────────────────────────────────────────────────────

describe("package.json CI integration", () => {
  it("test:all script invokes check:system-band so the literal guard runs in CI", () => {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      scripts?: Record<string, string>;
    };

    const testAll = pkg.scripts?.["test:all"] ?? "";

    expect(testAll).toContain("check:system-band");
  });
});
