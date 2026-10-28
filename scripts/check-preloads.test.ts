/**
 * Unit tests for checkPreloads().
 *
 * Mocks `fs/promises` so no actual build output is needed.
 * Verifies that:
 *   1. A fully-populated index.html (all CRITICAL_CHUNKS present) passes.
 *   2. An index.html that is missing one chunk entry throws with that chunk name.
 *   3. An index.html that is missing ALL chunk entries throws listing every name.
 *   4. A file-read failure (no dist/public/index.html) throws the "run build first" message.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mock fs/promises BEFORE importing checkPreloads ──────────────────────────
vi.mock("fs/promises", () => ({ readFile: vi.fn() }));

import { readFile } from "fs/promises";
import { checkPreloads } from "./check-preloads.js";
import { CRITICAL_CHUNKS } from "./critical-chunks.js";

const mockReadFile = readFile as ReturnType<typeof vi.fn>;

// Builds a minimal index.html that contains modulepreload tags for the given
// chunk names (with a fake hash suffix, matching Vite's output pattern).
function buildHtml(chunks: readonly string[]): string {
  const tags = chunks
    .map(
      (name) =>
        `<link rel="modulepreload" crossorigin href="/assets/${name}-ABC12345.js">`,
    )
    .join("\n");
  return `<!DOCTYPE html><html><head>${tags}</head><body></body></html>`;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkPreloads()", () => {
  it("passes when every CRITICAL_CHUNKS entry has a modulepreload tag", async () => {
    mockReadFile.mockResolvedValue(buildHtml(CRITICAL_CHUNKS));
    await expect(checkPreloads()).resolves.toBeUndefined();
  });

  it("throws when one chunk is missing its modulepreload tag", async () => {
    // Drop the last chunk from the HTML but keep it in CRITICAL_CHUNKS.
    const missingChunk = CRITICAL_CHUNKS[CRITICAL_CHUNKS.length - 1];
    const presentChunks = CRITICAL_CHUNKS.slice(0, -1);

    mockReadFile.mockResolvedValue(buildHtml(presentChunks));

    await expect(checkPreloads()).rejects.toThrow(missingChunk);
  });

  it("throws and names all missing chunks when the HTML has no preload tags at all", async () => {
    mockReadFile.mockResolvedValue(
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );

    const error = await checkPreloads().catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    for (const chunk of CRITICAL_CHUNKS) {
      expect((error as Error).message).toContain(`"${chunk}"`);
    }
  });

  it("throws a 'run build first' message when index.html cannot be read", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

    await expect(checkPreloads()).rejects.toThrow(/run.*build/i);
  });
});
