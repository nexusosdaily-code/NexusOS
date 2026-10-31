import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { runCollectionCommand } from "./wls-collections-cli";

let root: string, manifest: string, inputs: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "wls-package-"));
  manifest = join(root, "manifest.json");
  inputs = join(root, "inputs.json");
  await writeFile(manifest, await readFile("scripts/fixtures/wls-collection-package.json"));
  await writeFile(inputs, await readFile("scripts/fixtures/wls-package-inputs.json"));
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("usable package-check and package-run commands", () => {
  it("checks a manifest without echoing sources or changing it", async () => {
    const before = await readFile(manifest, "utf8");
    const result = await runCollectionCommand(["package-check", manifest]);
    expect(result).toMatchObject({ profile: "WLS-PACKAGE/1", name: "example.collection-consumer" });
    expect(JSON.stringify(result)).not.toContain("LIST_LEN");
    expect(await readFile(manifest, "utf8")).toBe(before);
  });

  it("runs declared programs with optional visited traces", async () => {
    const args = ["package-run", manifest, "string.contains", inputs];
    expect(await runCollectionCommand(args)).toMatchObject({
      profile: "WLS-COLLECTION/1", program: "string.contains", value: true,
    });
    const traced = await runCollectionCommand([...args, "--trace"]);
    expect(traced).toMatchObject({ value: true, trace: expect.arrayContaining([{ op: "RETURN", nm: expect.any(Number), line: expect.any(Number) }]) });
    expect(await readFile(inputs, "utf8")).toBe(await readFile("scripts/fixtures/wls-package-inputs.json", "utf8"));
  });

  it("rejects undeclared programs before reading the inputs file", async () => {
    await expect(runCollectionCommand(["package-run", manifest, "recipient.at", join(root, "missing")])).rejects.toThrow("not declared");
  });

  it.each([
    ["package-check"], ["package-check", "a", "b"], ["package-run", "a", "b"],
    ["package-run", "a", "b", "c", "--unsafe"],
  ].map(args => ({ args })))("rejects unsupported shape $args without file reads", async ({ args }) => {
    await expect(runCollectionCommand(args)).rejects.toThrow("Usage:");
  });

  it("reports compatibility failures with nonzero process status", () => {
    const cli = resolve("scripts/wls-collections-cli.ts");
    const runner = resolve("node_modules/.bin/tsx");
    const options = { encoding: "utf8" as const, timeout: 10_000, maxBuffer: 256_000 };
    const success = spawnSync(runner, [cli, "package-run", manifest, "string.contains", inputs], options);
    expect(success.error).toBeUndefined();
    expect(success.status).toBe(0);
    expect(JSON.parse(success.stdout)).toMatchObject({ value: true, program: "string.contains" });
    const failure = spawnSync(runner, [cli, "package-run", manifest, "recipient.at", inputs], options);
    expect(failure.error).toBeUndefined();
    expect(failure.status).toBe(1);
    expect(failure.stdout).toBe("");
    expect(failure.stderr).toBe("WLS collection error: Program is not declared by this package.\n");
    expect(failure.stderr).not.toContain(root);
  });
});
