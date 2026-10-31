import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runCollectionCommand } from "./wls-collections-cli";

let root: string, manifest: string, lock: string, suite: string;
const example = {
  name: "contains", program: "string.contains",
  inputs: { items: ["SYNTHETIC_PRIVATE_INPUT"], value: "SYNTHETIC_PRIVATE_INPUT" }, expect: { value: true },
};
const tests = (cases: unknown[]) => JSON.stringify({ profile: "WLS-TEST/1", cases });
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "wls-locked-test-cli-"));
  manifest = join(root, "manifest.json"); lock = join(root, "lock.json"); suite = join(root, "suite.json");
  await writeFile(manifest, await readFile("scripts/fixtures/wls-collection-package.json"));
  await writeFile(suite, tests([example]));
  await writeFile(lock, JSON.stringify(await runCollectionCommand(["package-lock", manifest])));
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

const cli = (...args: string[]) => {
  const child = spawnSync(resolve("node_modules/.bin/tsx"), [resolve("scripts/wls-collections-cli.ts"), ...args], {
    encoding: "utf8", timeout: 10_000, maxBuffer: 256_000,
  });
  expect(child.error).toBeUndefined();
  expect(child.signal).toBeNull();
  expect(child.stdout + child.stderr).not.toContain("SYNTHETIC_PRIVATE_INPUT");
  expect(child.stdout + child.stderr).not.toContain(root);
  return child;
};

describe("package-test-locked local CLI", () => {
  it("runs the documented package suite in a standalone process", () => {
    const result = cli("package-test-locked", manifest, lock, resolve("scripts/fixtures/wls-package-tests.json"));
    expect(result.status).toBe(0); expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ integrity: "verified", total: 4, passed: 4, failed: 0 });
  });

  it("advertises the explicit command and rejects extra flags or missing arguments", async () => {
    expect(await runCollectionCommand(["--help"])).toMatchObject({ help: expect.stringContaining(
      "package-test-locked <manifest.json> <lock.json> <suite.json>",
    ) });
    for (const args of [
      ["package-test-locked"], ["package-test-locked", manifest, lock],
      ["package-test-locked", manifest, lock, suite, "--trace"],
      ["package-test-locked", manifest, lock, suite, "--relock"],
    ]) await expect(runCollectionCommand(args)).rejects.toThrow("Usage:");
  });

  it("returns real process status and safe JSON for success, assertion and input failures", async () => {
    const originalLock = await readFile(lock, "utf8");
    const originalManifest = await readFile(manifest, "utf8");
    const passed = cli("package-test-locked", manifest, lock, suite);
    expect(passed.status).toBe(0); expect(passed.stderr).toBe("");
    expect(JSON.parse(passed.stdout)).toMatchObject({ profile: "WLS-TEST/1", integrity: "verified", total: 1, passed: 1, failed: 0 });

    await writeFile(suite, tests([{ ...example, expect: { value: false } }]));
    const failed = cli("package-test-locked", manifest, lock, suite);
    expect(failed.status).toBe(1); expect(failed.stderr).toBe("");
    expect(JSON.parse(failed.stdout)).toMatchObject({ failed: 1, results: [{ reason: "value-mismatch" }] });

    for (const [text, diagnostic] of [
      ["{SYNTHETIC_PRIVATE_INPUT", "Suite must contain valid JSON"],
      [tests([example, { ...example, name: "undeclared", program: "recipient.at" }]), "not declared"],
      [tests([example, { ...example, name: "url", program: "https://example.test/a" }]), "program"],
    ]) {
      await writeFile(suite, text);
      const rejected = cli("package-test-locked", manifest, lock, suite);
      expect(rejected.status).toBe(1); expect(rejected.stdout).toBe("");
      expect(rejected.stderr.toLowerCase()).toContain(diagnostic.toLowerCase());
    }
    await writeFile(suite, tests([example]));
    await writeFile(manifest, originalManifest + "\n");
    const mismatch = cli("package-test-locked", manifest, lock, suite);
    expect(mismatch.status).toBe(1); expect(mismatch.stdout).toBe("");
    expect(mismatch.stderr).toContain("Package integrity mismatch");
    await writeFile(manifest, originalManifest);
    await writeFile(lock, "{SYNTHETIC_PRIVATE_INPUT");
    const malformed = cli("package-test-locked", manifest, lock, suite);
    expect(malformed.status).toBe(1); expect(malformed.stdout).toBe("");
    expect(malformed.stderr).toContain("Lock must contain valid JSON");
    expect(await readFile(lock, "utf8")).toBe("{SYNTHETIC_PRIVATE_INPUT");
    await writeFile(lock, originalLock);
    expect(await readFile(manifest, "utf8")).toBe(originalManifest);
    expect(await readFile(suite, "utf8")).toBe(tests([example]));
  }, 30_000);

  it("bounds regular-file reads and strictly decodes suite UTF-8", async () => {
    await writeFile(suite, Buffer.from([0xc3, 0x28]));
    await expect(runCollectionCommand(["package-test-locked", manifest, lock, suite])).rejects.toThrow("valid UTF-8");
    await writeFile(suite, " ".repeat(131_073));
    await expect(runCollectionCommand(["package-test-locked", manifest, lock, suite])).rejects.toThrow("size limit");
    await expect(runCollectionCommand(["package-test-locked", manifest, lock, root])).rejects.toThrow("regular file");
    await expect(runCollectionCommand(["package-test-locked", manifest, lock, join(root, "missing")])).rejects.toThrow("Cannot read suite file");
  });
});
