import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildSync } from "esbuild";
import { expect, it } from "vitest";

it("locks and tests 0.16.0 offline with the process capability guard", () => {
  const root = mkdtempSync(join(tmpdir(), "wls-renaming-"));
  try {
    const manifest = resolve("scripts/fixtures/wls-map-set-package-v0-16.json");
    const suite = resolve("scripts/fixtures/wls-map-set-v0-16-smoke.json");
    const lock = join(root, "lock.json");
    const run = (...args: string[]) => {
      const result = spawnSync(process.execPath, [
        "--require", resolve("scripts/fixtures/wls-cli-isolation-guard.cjs"),
        resolve("scripts/wls-collections-cli.ts"), ...args,
      ], {
        cwd: resolve("."), encoding: "utf8", timeout: 10_000, maxBuffer: 256_000,
        env: { PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: "test", TZ: "UTC", NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe", "pipe"],
      });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(String(result.output[3]).trim().split("\n").map(line => JSON.parse(line)))
        .toEqual([{ ready: true }, { exit: 0, drained: true }]);
      return result.stdout;
    };
    const created = run("package-lock", manifest);
    writeFileSync(lock, created);
    expect(JSON.parse(run("package-verify", manifest, lock)).verified).toBe(true);
    expect(JSON.parse(run("package-test-locked", manifest, lock, suite)))
      .toMatchObject({ total: 6, passed: 6, failed: 0, integrity: "verified" });
    expect(readFileSync(lock, "utf8")).toBe(created);
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 30_000);

it.each(["esm", "cjs"] as const)("runs real WLS renaming from a standalone %s bundle", format => {
  const root = mkdtempSync(join(tmpdir(), "wls-renaming-bundle-"));
  try {
    const out = join(root, format === "esm" ? "library.mjs" : "library.cjs");
    const source = `
      import { mapRenameKeyIfAbsent } from ${JSON.stringify(resolve("shared/wls-map-library.ts"))};
      import { setReplaceIfAbsent } from ${JSON.stringify(resolve("shared/wls-set-library.ts"))};
      const input = {entries:[["a","x"],["b","y"]]};
      console.log(JSON.stringify([mapRenameKeyIfAbsent(input,"a","Ψ"),setReplaceIfAbsent(input,"a","Ψ")]));
    `;
    buildSync({ stdin: { contents: source, resolveDir: resolve(".") }, outfile: out, platform: "node", format, bundle: true });
    const result = spawnSync(process.execPath, [out], { cwd: root, encoding: "utf8", timeout: 10_000, env: { PATH: process.env.PATH } });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      { entries: [["Ψ", "x"], ["b", "y"]] },
      { entries: [["Ψ", ""], ["b", ""]] },
    ]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
