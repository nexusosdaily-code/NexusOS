/**
 * seal-retry-glob.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * CI guard: confirms that server/seal-retry.test.ts is discovered by the
 * full `npm run test:all` run (i.e. vitest run with the default config).
 *
 * Why this matters:
 *   The fake-timer retry delay tests in seal-retry.test.ts are validated in
 *   isolation.  If the vitest include glob were narrowed (e.g. changed from
 *   "server/**‌/*.test.ts" to something more specific), the file could be
 *   silently dropped from the full run.  This file — itself matched by
 *   "scripts/**‌/*.test.ts" — asserts the guard at build time.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { minimatch } from "minimatch";

const ROOT = resolve(__dirname, "..");

// ── 1. The file must exist ────────────────────────────────────────────────────
describe("seal-retry.test.ts existence", () => {
  it("server/seal-retry.test.ts exists on disk", () => {
    const filePath = resolve(ROOT, "server", "seal-retry.test.ts");
    expect(
      existsSync(filePath),
      `Expected ${filePath} to exist. If it was moved or renamed, update this guard and the vitest config globs.`
    ).toBe(true);
  });
});

// ── 2. The vitest config glob must match the file ────────────────────────────
describe("vitest config covers seal-retry.test.ts", () => {
  let includeGlobs: string[];

  beforeAll(() => {
    const configPath = resolve(ROOT, "vitest.config.ts");
    const configSrc = readFileSync(configPath, "utf-8");

    // Extract the `include` array from the config source.  We look for the
    // quoted strings inside the `include: [ ... ]` block.
    const includeBlock = configSrc.match(/include\s*:\s*\[([^\]]+)\]/s);
    expect(
      includeBlock,
      "Could not locate the `include` array in vitest.config.ts"
    ).not.toBeNull();

    includeGlobs = [...(includeBlock![1].matchAll(/"([^"]+)"/g))].map(
      (m) => m[1]
    );
    expect(includeGlobs.length).toBeGreaterThan(0);
  });

  it("at least one include glob matches server/seal-retry.test.ts", () => {
    const target = "server/seal-retry.test.ts";
    const matched = includeGlobs.some((glob) => minimatch(target, glob));
    expect(
      matched,
      `No vitest include glob matches "${target}". ` +
        `Current globs: ${JSON.stringify(includeGlobs)}. ` +
        `Add "server/**/*.test.ts" (or equivalent) to the include array in vitest.config.ts.`
    ).toBe(true);
  });
});
