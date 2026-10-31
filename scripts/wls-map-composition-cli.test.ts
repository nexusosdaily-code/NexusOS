import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

it.each([
  { family: "map", fixture: "0-4", release: "0.4.0", program: "map.merge", payload: "right", cases: 5 },
  { family: "set", fixture: "0-5", release: "0.5.0", program: "set.union", payload: "", cases: 13 },
  { family: "map-set", fixture: "0-6", release: "0.6.0", program: "map.merge", payload: "right", cases: 10 },
  { family: "map-set", fixture: "0-7", release: "0.7.0", program: "set.symmetricDifference", payload: null, cases: 12 },
  { family: "map-set", fixture: "0-8", release: "0.8.0", program: "map.merge", payload: "right", cases: 12 },
  { family: "map-set", fixture: "0-9", release: "0.9.0", program: "map.merge", payload: "right", cases: 12 },
  { family: "map-set", fixture: "0-10", release: "0.10.0", program: "map.merge", payload: "right", cases: 12 },
  { family: "map-set", fixture: "0-11", release: "0.11.0", program: "map.merge", payload: "right", cases: 12 },
  { family: "map-set", fixture: "0-12", release: "0.12.0", program: "map.merge", payload: "right", cases: 12 },
  { family: "map-set", fixture: "0-13", release: "0.13.0", program: "map.merge", payload: "right", cases: 12 },
  { family: "map-set", fixture: "0-14", release: "0.14.0", program: "map.merge", payload: "right", cases: 12 },
  { family: "map-set", fixture: "0-15", release: "0.15.0", program: "map.merge", payload: "right", cases: 12 },
])("locks, verifies, runs and tests $family $release offline without application imports", ({ family, fixture, release, program, payload, cases }) => {
  const root = mkdtempSync(join(tmpdir(), "wls-map-compose-"));
  try {
    const manifest = resolve(`scripts/fixtures/wls-${family}-package-v${fixture}.json`);
    const suite = resolve(`scripts/fixtures/wls-${family}-v${fixture}-smoke.json`);
    const lock = join(root, "lock.json"), inputs = join(root, "inputs.json");
    const run = (status: number, ...args: string[]) => {
      const result = spawnSync(process.execPath, [
        "--require", resolve("scripts/fixtures/wls-cli-isolation-guard.cjs"),
        resolve("scripts/wls-collections-cli.ts"), ...args,
      ], {
        cwd: resolve("."), encoding: "utf8", timeout: 10_000, maxBuffer: 256_000,
        env: { PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: "test", TZ: "UTC", NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe", "pipe"],
      });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(status);
      const audit = String(result.output[3] ?? "").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
      expect(audit).toEqual([{ ready: true }, { exit: status, drained: true }]);
      return result;
    };
    expect(JSON.parse(run(0, "package-check", manifest).stdout).dependencies[0].version).toBe(release);
    const created = run(0, "package-lock", manifest).stdout;
    writeFileSync(lock, created);
    expect(JSON.parse(run(0, "package-verify", manifest, lock).stdout).verified).toBe(true);
    const inputText = JSON.stringify({ left: { entries: [["a", "left"]] }, right: { entries: [["a", "right"]] } });
    writeFileSync(inputs, inputText);
    expect(JSON.parse(run(0, "package-run-locked", manifest, lock, program, inputs).stdout).value)
      .toEqual({ entries: payload === null ? [] : [["a", payload]] });
    expect(JSON.parse(run(0, "package-test-locked", manifest, lock, suite).stdout))
      .toMatchObject({ total: cases, passed: cases, failed: 0, integrity: "verified" });
    expect(readFileSync(inputs, "utf8")).toBe(inputText);
    writeFileSync(inputs, JSON.stringify({
      left: { entries: Array.from({ length: 20 }, (_, i) => [`k${i}`, "v"]) },
      right: { entries: [["new", "overflow"]] },
    }));
    const failed = run(1, "package-run-locked", manifest, lock, program, inputs);
    expect(failed.stdout).toBe("");
    expect(failed.stderr).toContain("entry limit");
    expect(readFileSync(lock, "utf8")).toBe(created);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 30_000);
