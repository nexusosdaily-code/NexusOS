import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runCollectionCommand } from "./wls-collections-cli";

let root: string, manifest: string, lock: string, inputs: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "wls-lock-cli-"));
  manifest = join(root, "manifest.json"); lock = join(root, "lock.json"); inputs = join(root, "inputs.json");
  await writeFile(manifest, await readFile("scripts/fixtures/wls-collection-package.json"));
  await writeFile(inputs, await readFile("scripts/fixtures/wls-package-inputs.json"));
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("explicit local package locking commands", () => {
  it("creates a lock as output, verifies it and executes with a visited trace", async () => {
    const result = await runCollectionCommand(["package-lock", manifest]);
    await writeFile(lock, JSON.stringify(result));
    expect(await runCollectionCommand(["package-verify", manifest, lock])).toMatchObject({ verified: true });
    expect(await runCollectionCommand(["package-run-locked", manifest, lock, "string.contains", inputs, "--trace"])).toMatchObject({
      integrity: "verified", value: true, trace: expect.any(Array),
    });
  });

  it("never replaces a mismatched lock and rejects it before reading inputs", async () => {
    const result = await runCollectionCommand(["package-lock", manifest]);
    const text = JSON.stringify({ ...result, manifestSha256: "0".repeat(64) });
    await writeFile(lock, text);
    await expect(runCollectionCommand(["package-run-locked", manifest, lock, "string.contains", join(root, "missing")])).rejects.toThrow("integrity mismatch");
    expect(await readFile(lock, "utf8")).toBe(text);
  });

  it.each([
    ["package-lock"], ["package-lock", "a", "b"], ["package-verify", "a"],
    ["package-run-locked", "a", "b", "c"], ["package-run-locked", "a", "b", "c", "d", "--unsafe"],
  ].map(args => ({ args })))("rejects invalid command shape $args", async ({ args }) => {
    await expect(runCollectionCommand(args)).rejects.toThrow("Usage:");
  });

  it("runs the locked workflow as real CLI processes with nonzero failures", async () => {
    const runner = resolve("node_modules/.bin/tsx"), cli = resolve("scripts/wls-collections-cli.ts");
    const options = { encoding: "utf8" as const, timeout: 10_000, maxBuffer: 256_000 };
    const created = spawnSync(runner, [cli, "package-lock", manifest], options);
    expect(created.error).toBeUndefined(); expect(created.status).toBe(0);
    expect(JSON.parse(created.stdout).profile).toBe("WLS-LOCK/1");
    await writeFile(lock, created.stdout);
    const verified = spawnSync(runner, [cli, "package-verify", manifest, lock], options);
    expect(verified.error).toBeUndefined(); expect(verified.status).toBe(0);
    expect(JSON.parse(verified.stdout).verified).toBe(true);
    const executed = spawnSync(runner, [cli, "package-run-locked", manifest, lock, "string.contains", inputs], options);
    expect(executed.error).toBeUndefined(); expect(executed.status).toBe(0);
    expect(JSON.parse(executed.stdout)).toMatchObject({ value: true, integrity: "verified" });
    await writeFile(manifest, (await readFile(manifest, "utf8")) + "\n");
    const rejected = spawnSync(runner, [cli, "package-run-locked", manifest, lock, "string.contains", inputs], options);
    expect(rejected.error).toBeUndefined(); expect(rejected.status).toBe(1);
    expect(rejected.stdout).toBe("");
    expect(rejected.stderr).toContain("Package integrity mismatch");
    expect(rejected.stderr).not.toContain(root);
  });
});
