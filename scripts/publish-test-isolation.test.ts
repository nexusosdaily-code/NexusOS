import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { databaseTestFiles } from "../vitest.database";

function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? testFiles(path) : path.endsWith(".test.ts") ? [path] : [];
  });
}
describe("publish test database isolation", () => {
  it("keeps database-writing suites out of the publish projects", () => {
    const build = readFileSync("script/build.ts", "utf8");
    expect(build).toContain("vitest run --project server --project client");
    expect(build).toContain('WNSP_PUBLISH_BUILD: "1"');
    expect(build).toContain('DATABASE_URL: "postgresql://build_test:build_test@127.0.0.1:1/build_tests"');
    const config = readFileSync("vitest.config.ts", "utf8");
    expect(config).toContain("exclude: databaseTestFiles");
    expect(config).toContain("include: databaseTestFiles");
    expect(config).toContain('setupFiles: ["scripts/database-test-setup.ts"]');
  });
  it("requires every real pg pool test to be classified as a database suite", () => {
    const writesDatabase = testFiles("server").filter(path =>
      /new\s+pg\.Pool\s*\(/.test(readFileSync(path, "utf8")));
    expect(writesDatabase.length).toBeGreaterThan(0);
    for (const path of writesDatabase) {
      expect(path.endsWith(".integration.test.ts") || databaseTestFiles.includes(path), path).toBe(true);
    }
  });
  it("refuses database test execution in production or publishing", () => {
    const setup = readFileSync("scripts/database-test-setup.ts", "utf8");
    expect(setup).toContain('process.env.NODE_ENV === "production"');
    expect(setup).toContain('process.env.WNSP_PUBLISH_BUILD === "1"');
    expect(setup).toContain("throw new Error");
  });
});
