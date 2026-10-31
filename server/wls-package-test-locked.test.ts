import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createCollectionPackageLock } from "../shared/wls-package-lock";
import { COLLECTION_TEST_LIMITS, runLockedCollectionTestSuite } from "../shared/wls-test-runner";
import * as library from "../shared/wls-library";
import * as vm from "../shared/wls-collection-vm";

const manifest = readFileSync("scripts/fixtures/wls-collection-package.json", "utf8");
const example = () => ({
  name: "count", program: "recipient.count", inputs: { items: ["alpha", "beta"] }, expect: { value: 2 },
});
const suite = (cases: unknown[]) => JSON.stringify({ profile: "WLS-TEST/1", cases });
const lock = async (text = manifest) => JSON.stringify(await createCollectionPackageLock(text));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("locked package test planning and execution", () => {
  it("uses the existing assertions and private report format for the entire suite", async () => {
    const base = example();
    const report = await runLockedCollectionTestSuite(suite([
      base,
      { ...base, name: "wrong", expect: { value: "2" } },
      { ...base, name: "missing error", expect: { error: true } },
      { ...base, name: "unexpected error", inputs: { items: [1] } },
      { ...base, name: "expected error", inputs: { items: [1] }, expect: { error: true } },
      {
        name: "private", program: "string.contains",
        inputs: { items: ["SYNTHETIC_PRIVATE_INPUT"], value: "SYNTHETIC_PRIVATE_INPUT" },
        expect: { value: false },
      },
      { name: "list", program: "string.concat", inputs: { left: ["é", "é"], right: ["🌊"] }, expect: { value: ["é", "é", "🌊"] } },
    ]), manifest, await lock());
    expect(report).toMatchObject({ profile: "WLS-TEST/1", integrity: "verified", total: 7, passed: 3, failed: 4 });
    expect(report.results.map(result => result.reason)).toEqual([
      "matched-value", "value-mismatch", "missing-error", "unexpected-error", "matched-error", "value-mismatch", "matched-value",
    ]);
    expect(JSON.stringify(report)).not.toContain("SYNTHETIC_PRIVATE_INPUT");
    expect(JSON.stringify(report)).not.toContain("inputs");
  });

  it.each([
    { program: "recipient.at" }, { program: "../source.wls" }, { program: "https://example.test/a" },
    { program: "file:///tmp/a" }, { program: "__proto__" }, { program: "unknown" },
    { inputs: null }, { inputs: [] }, { inputs: { value: "x".repeat(16_384) } },
    { expect: { value: null } }, { expect: { error: false } }, { expect: { value: 2, error: true } },
    { expect: { value: Array(21).fill("x") } }, { expect: { value: ["x".repeat(257)] } },
    { expect: { value: 1.5 } }, { name: "" }, { name: "x\nlog" }, { name: "x".repeat(81) },
    { source: "WLS-COLLECTION/1" },
  ])("rejects an invalid later case before even the first case executes: %j", async overlay => {
    const locked = await lock();
    const execution = vi.spyOn(vm, "executeCollection");
    await expect(runLockedCollectionTestSuite(
      suite([example(), { ...example(), name: "later", ...overlay }]), manifest, locked,
    )).rejects.toThrow();
    expect(execution).not.toHaveBeenCalled();
  });

  it("rejects malformed suites, duplicates and limits before execution", async () => {
    const locked = await lock();
    const execution = vi.spyOn(vm, "executeCollection");
    for (const text of [
      "{", "null", "[]", "{}", suite([]), suite([example(), example()]),
      JSON.stringify({ profile: "WLS-TEST/2", cases: [example()] }),
      JSON.stringify({ profile: "WLS-TEST/1", cases: [example()], extra: true }),
      " ".repeat(COLLECTION_TEST_LIMITS.text + 1),
      suite(Array.from({ length: 65 }, (_, i) => ({ ...example(), name: `case-${i}` }))),
    ]) await expect(runLockedCollectionTestSuite(text, manifest, locked)).rejects.toThrow();
    expect(execution).not.toHaveBeenCalled();
    const report = await runLockedCollectionTestSuite(suite(
      Array.from({ length: 64 }, (_, i) => ({ ...example(), name: `case-${i}` })),
    ), manifest, locked);
    expect(report.passed).toBe(64);
  });

  it("verifies even declared programs not used by any case", async () => {
    const locked = await lock();
    const original = library.getCollectionProgramSource;
    vi.spyOn(library, "getCollectionProgramSource").mockImplementation(id =>
      original(id) + (id === "string.concat" ? "\n// altered unused source\n" : ""));
    const execution = vi.spyOn(vm, "executeCollection");
    await expect(runLockedCollectionTestSuite(suite([example()]), manifest, locked)).rejects.toThrow("integrity mismatch");
    expect(execution).not.toHaveBeenCalled();
  });

  it("rejects malformed or mismatched manifests and locks without running expected-error cases", async () => {
    const locked = await lock();
    const execution = vi.spyOn(vm, "executeCollection");
    const tests = suite([{ ...example(), expect: { error: true } }]);
    for (const [text, lockText] of [
      ["{", locked], [manifest + "\n", locked],
      [JSON.stringify({ ...JSON.parse(manifest), dependencies: { "wls.collections": "99.0.0" } }), locked],
      [manifest, "{"], [manifest, JSON.stringify({ ...JSON.parse(locked), manifestSha256: "0".repeat(64) })],
      [manifest, JSON.stringify({ ...JSON.parse(locked), programs: JSON.parse(locked).programs.slice(1) })],
    ]) await expect(runLockedCollectionTestSuite(tests, text, lockText)).rejects.toThrow();
    expect(execution).not.toHaveBeenCalled();
  });

  it("never counts broken sources or unavailable hashing as expected runtime errors", async () => {
    const locked = await lock();
    const execution = vi.spyOn(vm, "executeCollection");
    const source = vi.spyOn(library, "getCollectionProgramSource").mockReturnValue("not a program");
    const tests = suite([{ ...example(), expect: { error: true } }]);
    await expect(runLockedCollectionTestSuite(tests, manifest, locked)).rejects.toThrow();
    source.mockRestore();
    vi.stubGlobal("crypto", undefined);
    await expect(runLockedCollectionTestSuite(tests, manifest, locked)).rejects.toThrow("SHA-256 is unavailable");
    expect(execution).not.toHaveBeenCalled();
  });

  it("hashes once and reuses one verified snapshot across awaits and every case", async () => {
    const locked = await lock();
    const original = library.getCollectionProgramSource;
    let changed = false;
    const loader = vi.spyOn(library, "getCollectionProgramSource").mockImplementation(id => changed
      ? 'WLS-COLLECTION/1\nCONST ["result",999]\nRETURN ["result"]' : original(id));
    const realDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    let loadsBeforeHash = 0;
    const hashing = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation((algorithm, data) => {
      if (!changed) loadsBeforeHash = loader.mock.calls.length;
      changed = true;
      return realDigest(algorithm, data);
    });
    const report = await runLockedCollectionTestSuite(suite([
      example(), { ...example(), name: "again" },
      { name: "another program", program: "string.contains", inputs: { items: ["a"], value: "a" }, expect: { value: true } },
    ]), manifest, locked);
    expect(changed).toBe(true);
    expect(report).toMatchObject({ total: 3, passed: 3, failed: 0 });
    expect(loader).toHaveBeenCalledTimes(loadsBeforeHash);
    expect(hashing).toHaveBeenCalledTimes(JSON.parse(manifest).programs.length + 1);
  });

  it("keeps the VM cycle bound and does not swallow unexpected host faults", async () => {
    vi.spyOn(library, "getCollectionProgramSource").mockReturnValue(
      'WLS-COLLECTION/1\n:loop\nJUMP ["loop"]\nRETURN ["unused"]',
    );
    const locked = await lock();
    const text = suite([{ ...example(), expect: { error: true } }]);
    expect(await runLockedCollectionTestSuite(text, manifest, locked)).toMatchObject({ passed: 1, failed: 0 });
    vi.spyOn(vm, "executeCollection").mockImplementation(() => { throw new Error("synthetic host fault"); });
    await expect(runLockedCollectionTestSuite(text, manifest, locked)).rejects.toThrow("synthetic host fault");
  });
});
