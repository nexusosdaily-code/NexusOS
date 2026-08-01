/**
 * Tests for check-system-band-literal.ts
 *
 * Covers:
 *   1. package.json guard — `test:all` must include `check:system-band`
 *      so that removing it from the pipeline is caught immediately.
 *   2. checkSystemBandLiteral() logic — mocks fs/promises so no real
 *      server/ directory is needed.
 *        a. A clean directory (no violations) returns an empty array.
 *        b. A file containing the bare literal returns that violation.
 *        c. A comment line containing the literal is not flagged.
 *        d. A line with the allow annotation is not flagged.
 *        e. An unreadable directory throws with the expected message.
 *   3. Exempt file — constitution_seal.ts is never flagged even when it
 *      contains the literal.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ── mock fs/promises BEFORE importing the module under test ──────────────────
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1. package.json pipeline guard ───────────────────────────────────────────

describe("package.json pipeline guard", () => {
  it('test:all script contains "check:system-band"', () => {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      scripts?: Record<string, string>;
    };

    const testAll: string = pkg.scripts?.["test:all"] ?? "";
    expect(testAll).toContain("check:system-band");
  });
});

// ── 2. checkSystemBandLiteral() logic tests ───────────────────────────────────

describe("checkSystemBandLiteral()", () => {
  it("returns no violations when no file contains the literal", async () => {
    mockReaddir.mockResolvedValue(["routes.ts"]);
    mockReadFile.mockResolvedValue(`import { CONSTITUTION_PSI } from "./constitution_seal";\n`);

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("returns a violation when a file contains the bare literal", async () => {
    mockReaddir.mockResolvedValue(["routes.ts"]);
    mockReadFile.mockResolvedValue(
      `const band = "${SYSTEM_BAND_LITERAL}";\n`,
    );

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe("routes.ts");
    expect(violations[0].line).toBe(1);
  });

  it("does not flag a line comment containing the literal", async () => {
    mockReaddir.mockResolvedValue(["routes.ts"]);
    mockReadFile.mockResolvedValue(
      `// This used to be "${SYSTEM_BAND_LITERAL}" — now use CONSTITUTION_PSI\n`,
    );

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("does not flag a JSDoc/block-comment line containing the literal", async () => {
    mockReaddir.mockResolvedValue(["routes.ts"]);
    mockReadFile.mockResolvedValue(
      ` * The system band is ${SYSTEM_BAND_LITERAL} per the constitution.\n`,
    );

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("does not flag a line annotated with the allow annotation", async () => {
    mockReaddir.mockResolvedValue(["routes.ts"]);
    mockReadFile.mockResolvedValue(
      `const band = "${SYSTEM_BAND_LITERAL}"; // ${ALLOW_ANNOTATION}\n`,
    );

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
  });

  it("skips the exempt file constitution_seal.ts entirely", async () => {
    mockReaddir.mockResolvedValue(["constitution_seal.ts"]);
    // Even if this file has the literal, no violation should be reported
    mockReadFile.mockResolvedValue(
      `export const CONSTITUTION_PSI = "${SYSTEM_BAND_LITERAL}";\n`,
    );

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(0);
    // readFile should not have been called at all for the exempt file
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("throws when the server directory cannot be read", async () => {
    mockReaddir.mockRejectedValue(new Error("ENOENT: no such directory"));

    await expect(checkSystemBandLiteral("/fake/server")).rejects.toThrow(
      /Cannot read directory/,
    );
  });

  it("throws when a file cannot be read", async () => {
    mockReaddir.mockResolvedValue(["routes.ts"]);
    mockReadFile.mockRejectedValue(new Error("EACCES: permission denied"));

    await expect(checkSystemBandLiteral("/fake/server")).rejects.toThrow(
      /Cannot read file/,
    );
  });

  it("skips non-.ts files", async () => {
    mockReaddir.mockResolvedValue(["routes.ts", "config.json"]);
    mockReadFile.mockResolvedValue("clean content\n");

    await checkSystemBandLiteral("/fake/server");
    // Only the .ts file should be read
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it("reports the correct line number for a violation on a later line", async () => {
    mockReaddir.mockResolvedValue(["handler.ts"]);
    mockReadFile.mockResolvedValue(
      `import { foo } from "bar";\n\nconst x = "${SYSTEM_BAND_LITERAL}";\n`,
    );

    const violations = await checkSystemBandLiteral("/fake/server");
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(3);
  });
});
