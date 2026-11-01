import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const read = (path: string) => readFileSync(path, "utf8");
const overview = read("docs/wavelengthscript-dependencies.md");
const docs = [...new Set(["docs/wavelengthscript-dependencies.md",
  ...[...overview.matchAll(/\]\(([^)]+\.md)\)/g)].map(match => `docs/${match[1]}`)])];
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

describe("complete public dependency disclosure", () => {
  it("contains every linked guide verbatim as escaped text, not metadata-only summaries", () => {
    const html = read("public/wavelengthscript-dependencies.html");
    for (const doc of docs) expect(html).toContain(`<pre>${escape(read(doc))}</pre>`);
    for (let i = 1; i <= 40; i++) expect(html).toContain(`0.${i}.0`);
    expect(html).not.toMatch(/<script\b|<iframe\b|<img\b|(?:src|href)\s*=\s*["']https?:\/\//i);
    expect(html).toContain('name="viewport"');
  });
  it("checks current output and rejects drift in a complete copied source distribution", () => {
    const root = mkdtempSync(join(tmpdir(), "wls-guide-audit-"));
    try {
      for (const dir of ["scripts", "docs", "public"]) mkdirSync(join(root, dir));
      for (const file of [...docs, "scripts/generate-wls-dependency-guide.mjs", "public/wavelengthscript-dependencies.html"]) {
        copyFileSync(file, join(root, file));
      }
      const run = () => spawnSync(process.execPath, ["scripts/generate-wls-dependency-guide.mjs", "--check"], {
        cwd: root, env: { PATH: process.env.PATH }, encoding: "utf8", timeout: 10_000,
      });
      expect(run().status).toBe(0);
      appendFileSync(join(root, "docs/wavelengthscript-map-set-v0-15.md"), "\nChanged disclosure.\n");
      const stale = run();
      expect(stale.status).not.toBe(0);
      expect(stale.stderr).toContain("Dependency webpage is stale");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
