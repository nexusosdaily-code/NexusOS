/**
 * Pipeline guard: test:all must include check:types (tsc --noEmit).
 *
 * If someone quietly removes `npm run check:types` from the test:all script,
 * this test fails immediately, preventing TypeScript type regressions from
 * slipping through CI undetected.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("package.json pipeline guard", () => {
  it('test:all script contains "check:types"', () => {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      scripts?: Record<string, string>;
    };

    const testAll: string = pkg.scripts?.["test:all"] ?? "";
    expect(
      testAll,
      'test:all must include "check:types" so TypeScript type errors are caught in CI',
    ).toContain("check:types");
  });
});
