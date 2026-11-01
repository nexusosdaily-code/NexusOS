import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildSync } from "esbuild";
import { expect, it } from "vitest";

const versions = Array.from({ length: 12 }, (_, i) => i + 19);
function guarded(file: string, args: string[], cwd: string) {
  const result = spawnSync(process.execPath, [
    "--require", resolve("scripts/fixtures/wls-cli-isolation-guard.cjs"), file, ...args,
  ], { cwd, encoding: "utf8", timeout: 10_000, maxBuffer: 256_000,
    env: { PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: "test", TZ: "UTC", NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe", "pipe"] });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(String(result.output[3]).trim().split("\n").map(line => JSON.parse(line)))
    .toEqual([{ ready: true }, { exit: 0, drained: true }]);
  return result.stdout;
}
it.each(versions)("0.%i.0: real offline lock, verify and test-locked pipeline", version => {
  const root = mkdtempSync(join(tmpdir(), "wls-batch-cli-"));
  try {
    const manifest = resolve(`scripts/fixtures/wls-map-set-package-v0-${version}.json`);
    const suite = resolve(`scripts/fixtures/wls-map-set-v0-${version}-smoke.json`);
    const lock = join(root, "lock.json");
    const run = (...args: string[]) => guarded(resolve("scripts/wls-collections-cli.ts"), args, resolve("."));
    const created = run("package-lock", manifest);
    writeFileSync(lock, created);
    expect(JSON.parse(run("package-verify", manifest, lock)).verified).toBe(true);
    expect(JSON.parse(run("package-test-locked", manifest, lock, suite)))
      .toMatchObject({ total: 4, passed: 4, failed: 0, integrity: "verified" });
    expect(readFileSync(lock, "utf8")).toBe(created);
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 30_000);

it.each(["esm", "cjs"] as const)("all batch operations execute offline in a standalone %s bundle", format => {
  const root = mkdtempSync(join(tmpdir(), "wls-batch-bundle-"));
  try {
    const out = join(root, format === "esm" ? "library.mjs" : "library.cjs");
    const cases = versions.flatMap(version => JSON.parse(readFileSync(
      resolve(`scripts/fixtures/wls-map-set-v0-${version}-smoke.json`), "utf8")).cases);
    buildSync({ stdin: { contents: `
      import assert from "node:assert/strict";
      import { executeMap } from ${JSON.stringify(resolve("shared/wls-map-vm.ts"))};
      import { getCollectionProgramSource } from ${JSON.stringify(resolve("shared/wls-library.ts"))};
      const cases = ${JSON.stringify(cases)};
      for (const c of cases) {
        const result = executeMap(getCollectionProgramSource(c.program), c.inputs);
        assert.deepEqual(result.value, c.expect.value);
        assert.equal(result.trace.at(-1).op, "RETURN");
      }
      console.log(JSON.stringify({passed: cases.length}));
    `, resolveDir: resolve(".") }, outfile: out, platform: "node", format, bundle: true });
    expect(JSON.parse(guarded(out, [], root))).toEqual({ passed: 48 });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
