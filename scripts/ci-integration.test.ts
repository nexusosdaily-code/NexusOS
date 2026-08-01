/**
 * CI-pipeline integration guard.
 *
 * Reads `script/build.ts` as plain text and asserts that
 * `checkPreloads()` is both imported and explicitly called in the
 * production build path.  If a contributor removes either line the
 * test fails immediately — before the removal can ship.
 *
 * No build output is required; the file is read from source.
 */

import { readFile } from "fs/promises";
import path from "path";
import { describe, it, expect } from "vitest";

const BUILD_SCRIPT = path.resolve("script/build.ts");

describe("script/build.ts pipeline guard", () => {
  let src: string;

  // Read the file once and share across assertions.
  // Using a beforeAll-style approach via a top-level await isn't
  // supported in every vitest version, so we read lazily instead.
  async function getBuildSrc(): Promise<string> {
    if (!src) {
      src = await readFile(BUILD_SCRIPT, "utf-8");
    }
    return src;
  }

  it("imports checkPreloads from the check-preloads module", async () => {
    const content = await getBuildSrc();
    // Must import the function — either a named import or a namespace import.
    expect(content).toMatch(/checkPreloads/);
    expect(content).toMatch(/check-preloads/);
  });

  it("calls checkPreloads() in the build function body", async () => {
    const content = await getBuildSrc();
    // The call must appear as `checkPreloads()` or `await checkPreloads()`.
    expect(content).toMatch(/\bcheckPreloads\s*\(\s*\)/);
  });

  it("the checkPreloads call is awaited (not fire-and-forget)", async () => {
    const content = await getBuildSrc();
    // The call should be preceded by `await` so a thrown error actually
    // fails the build rather than producing an unhandled rejection.
    expect(content).toMatch(/await\s+checkPreloads\s*\(\s*\)/);
  });
});
