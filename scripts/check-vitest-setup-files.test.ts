/**
 * Tests for checkVitestSetupFiles() and extractSetupFiles().
 *
 * Uses vi.mock to avoid touching the real filesystem so the suite is fast
 * and hermetic.  The scenarios covered:
 *
 *   1. Everything is healthy — no violations.
 *   2. A setupFiles entry points to a file that does not exist on disk.
 *   3. A file matching the setup-name pattern lives outside __tests__/ and
 *      is not referenced in any config → orphan (client/src/).
 *   4. extractSetupFiles() correctly parses single and multi-entry arrays.
 *   5. An orphaned setup file under server/ is detected when both directories
 *      are scanned (default behaviour).
 *   6. Passing an explicit array of scan directories works correctly.
 *   7. No false positives when server/ contains no setup-like files.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// ── mock fs/promises BEFORE importing the module under test ──────────────────
vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  access: vi.fn(),
}));

import { readdir, readFile, access } from "fs/promises";
import {
  extractSetupFiles,
  checkVitestSetupFiles,
} from "./check-vitest-setup-files.js";

const mockReaddir = readdir as ReturnType<typeof vi.fn>;
const mockReadFile = readFile as ReturnType<typeof vi.fn>;
const mockAccess = access as ReturnType<typeof vi.fn>;

const ROOT = "/project";
const SCAN = path.join(ROOT, "client", "src");

// Minimal config source that references one setup file
const HEALTHY_CONFIG = `
export default defineConfig({
  test: {
    setupFiles: ["client/src/__tests__/setup.ts"],
  },
});
`;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── extractSetupFiles ────────────────────────────────────────────────────────

describe("extractSetupFiles()", () => {
  it("returns an empty array when there are no setupFiles entries", () => {
    expect(extractSetupFiles("export default {}")).toEqual([]);
  });

  it("extracts a single-entry setupFiles array", () => {
    const src = `setupFiles: ["client/src/__tests__/setup.ts"]`;
    expect(extractSetupFiles(src)).toEqual(["client/src/__tests__/setup.ts"]);
  });

  it("extracts multiple entries from one setupFiles array", () => {
    const src = `setupFiles: ["client/src/__tests__/setup.ts", "client/src/__tests__/extra.ts"]`;
    expect(extractSetupFiles(src)).toEqual([
      "client/src/__tests__/setup.ts",
      "client/src/__tests__/extra.ts",
    ]);
  });

  it("extracts entries spread across a multi-line array", () => {
    const src = `
      setupFiles: [
        "client/src/__tests__/setup.ts",
        "client/src/__tests__/extra.ts",
      ]
    `;
    expect(extractSetupFiles(src)).toEqual([
      "client/src/__tests__/setup.ts",
      "client/src/__tests__/extra.ts",
    ]);
  });

  it("handles single-quoted paths", () => {
    const src = `setupFiles: ['client/src/__tests__/setup.ts']`;
    expect(extractSetupFiles(src)).toEqual(["client/src/__tests__/setup.ts"]);
  });

  it("extracts from multiple setupFiles blocks in one file", () => {
    const src = `
      { setupFiles: ["client/src/__tests__/setup.ts"] },
      { setupFiles: ["client/src/__tests__/other.ts"] },
    `;
    const result = extractSetupFiles(src);
    expect(result).toContain("client/src/__tests__/setup.ts");
    expect(result).toContain("client/src/__tests__/other.ts");
  });
});

// ─── checkVitestSetupFiles ────────────────────────────────────────────────────

describe("checkVitestSetupFiles()", () => {
  it("passes when all setupFiles exist and no orphaned files are present", async () => {
    // Root readdir returns one vitest config
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      // scanDir (client/src) returns only the referenced setup file inside __tests__
      return Promise.resolve(["__tests__/setup.ts"]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined); // file exists

    const result = await checkVitestSetupFiles(ROOT, SCAN);
    expect(result.violations).toHaveLength(0);
  });

  it("reports a dead-reference violation when a setupFiles path does not exist", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      return Promise.resolve([]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    // access throws → file does not exist
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await checkVitestSetupFiles(ROOT, SCAN);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].kind).toBe("dead-reference");
    expect(result.violations[0].message).toContain(
      "client/src/__tests__/setup.ts",
    );
  });

  it("reports an orphaned-file violation when a setup file is not referenced", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      // scanDir returns an orphaned test-setup.ts outside __tests__
      return Promise.resolve(["test-setup.ts"]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined); // referenced file exists

    const result = await checkVitestSetupFiles(ROOT, SCAN);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].kind).toBe("orphaned-file");
    expect(result.violations[0].message).toContain("test-setup.ts");
  });

  it("does not flag setup files that live inside a __tests__ directory", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      // Only the referenced file; it is inside __tests__ so must not be orphaned
      return Promise.resolve(["__tests__/setup.ts"]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined);

    const result = await checkVitestSetupFiles(ROOT, SCAN);
    expect(result.violations).toHaveLength(0);
  });

  it("reports both violation kinds when both problems exist simultaneously", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      return Promise.resolve(["test-setup.ts"]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    // access throws for the referenced file → dead reference
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await checkVitestSetupFiles(ROOT, SCAN);
    const kinds = result.violations.map((v) => v.kind);
    expect(kinds).toContain("dead-reference");
    expect(kinds).toContain("orphaned-file");
  });
});

// ─── server/ orphan detection ─────────────────────────────────────────────────

const SERVER_SCAN = path.join(ROOT, "server");

describe("checkVitestSetupFiles() — server/ orphan detection", () => {
  it("detects an orphaned setup file under server/ when both dirs are scanned (default)", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      // client/src: only the legitimate referenced file inside __tests__
      if (dir === SCAN) return Promise.resolve(["__tests__/setup.ts"]);
      // server/: has an orphaned test-setup.ts outside __tests__
      if (dir === SERVER_SCAN) return Promise.resolve(["test-setup.ts"]);
      return Promise.resolve([]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined); // referenced file exists

    // Default call — both dirs are scanned automatically
    const result = await checkVitestSetupFiles(ROOT);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].kind).toBe("orphaned-file");
    expect(result.violations[0].message).toContain("test-setup.ts");
    expect(result.violations[0].message).toContain("server");
  });

  it("detects an orphaned setup file when server/ is passed as an explicit scan directory", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      if (dir === SERVER_SCAN) return Promise.resolve(["test-setup.ts"]);
      return Promise.resolve([]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined);

    // Explicit array with only server/
    const result = await checkVitestSetupFiles(ROOT, [SERVER_SCAN]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].kind).toBe("orphaned-file");
    expect(result.violations[0].message).toContain("test-setup.ts");
  });

  it("does not flag setup files inside server/__tests__/", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      if (dir === SERVER_SCAN)
        return Promise.resolve(["__tests__/setup.ts"]);
      return Promise.resolve([]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined);

    const result = await checkVitestSetupFiles(ROOT, [SERVER_SCAN]);
    expect(result.violations).toHaveLength(0);
  });

  it("produces no false positives when server/ has no setup-like files", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      if (dir === SCAN) return Promise.resolve(["__tests__/setup.ts"]);
      if (dir === SERVER_SCAN)
        return Promise.resolve(["routes.ts", "db.ts"]);
      return Promise.resolve([]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined);

    const result = await checkVitestSetupFiles(ROOT);
    expect(result.violations).toHaveLength(0);
  });

  it("handles a missing server/ directory without error", async () => {
    mockReaddir.mockImplementation((dir: string) => {
      if (dir === ROOT) return Promise.resolve(["vitest.config.ts"]);
      if (dir === SCAN) return Promise.resolve(["__tests__/setup.ts"]);
      // server/ does not exist — readdir rejects
      if (dir === SERVER_SCAN) return Promise.reject(new Error("ENOENT"));
      return Promise.resolve([]);
    });

    mockReadFile.mockResolvedValue(HEALTHY_CONFIG);
    mockAccess.mockResolvedValue(undefined);

    const result = await checkVitestSetupFiles(ROOT);
    expect(result.violations).toHaveLength(0);
  });
});
