import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CollectionVMError, COLLECTION_LIMITS, compileCollection, executeCollection } from "../shared/wls-collection-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { stringListLastIndexOf, stringListReverse } from "../shared/wls-string-collections";
import { COLLECTION_LIBRARY_LATEST_RELEASE, COLLECTION_LIBRARY_RELEASE, resolveCollectionPackage, executeCollectionPackageProgram } from "../shared/wls-package";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram, verifyCollectionPackageLock } from "../shared/wls-package-lock";
import { runLockedCollectionTestSuite } from "../shared/wls-test-runner";

const manifest = (version: string, programs: string[]) => JSON.stringify({
  profile: "WLS-PACKAGE/1", name: "test.list-tools", version: "1.0.0",
  executionProfile: "WLS-COLLECTION/1", dependencies: { "wls.collections": version }, programs,
});

describe("native WavelengthScript list operations", () => {
  it.each(Array.from({ length: 21 }, (_, length) => length))("reverses %i maximum-length items within the unchanged VM limits", length => {
    const items = Object.freeze(Array.from({ length }, (_, i) => `${i % 5}:é:e\u0301:🌊`.padEnd(256, "x")));
    const expected = [...items].reverse();
    const source = getCollectionProgramSource("string.reverse");
    const result = executeCollection(source, { items });
    expect(result.value).toEqual(expected);
    expect(stringListReverse(items)).toEqual(expected);
    expect(stringListReverse(expected)).toEqual(items);
    expect(result.value).not.toBe(items);
    expect(compileCollection(source).length).toBeLessThanOrEqual(COLLECTION_LIMITS.instructions);
    expect(result.trace.length).toBeLessThanOrEqual(103);
  });

  it.each([
    { items: [], value: "", expected: -1 },
    { items: [""], value: "", expected: 0 },
    { items: ["a", "b", "a"], value: "a", expected: 2 },
    { items: ["a", "b", "a"], value: "b", expected: 1 },
    { items: ["A", "a", "A"], value: "a", expected: 1 },
    { items: ["é", "e\u0301", "é"], value: "e\u0301", expected: 1 },
    { items: ["é"], value: "e\u0301", expected: -1 },
    { items: ["🌊", "Ψ", "🌊"], value: "🌊", expected: 2 },
    { items: Array(20).fill("x"), value: "x", expected: 19 },
    { items: Array(20).fill("x"), value: "missing", expected: -1 },
    { items: ["__proto__", "constructor", "__proto__"], value: "__proto__", expected: 2 },
  ])("finds the last exact match $expected", ({ items, value, expected }) => {
    const before = [...items];
    Object.freeze(items);
    const result = executeCollection(getCollectionProgramSource("string.lastIndexOf"), { items, value });
    expect(result.value).toBe(expected);
    expect(stringListLastIndexOf(items, value)).toBe(expected);
    expect(result.trace.length).toBeLessThan(COLLECTION_LIMITS.cycles);
    expect(items).toEqual(before);
  });

  it.each([undefined, null, true, 1, [], {}].map(value => ({ value })))("rejects non-string queries even with empty lists: $value", ({ value }) => {
    expect(() => executeCollection(getCollectionProgramSource("string.lastIndexOf"), { items: [], value })).toThrow(CollectionVMError);
  });

  it.each([
    null, "not a list", [1], Array(2), Array(21).fill("x"), ["x".repeat(257)],
  ].map(items => ({ items })))("rejects malformed and oversized lists in both programs", ({ items }) => {
    for (const id of ["string.lastIndexOf", "string.reverse"]) {
      expect(() => executeCollection(getCollectionProgramSource(id), { items, value: "x" })).toThrow(CollectionVMError);
    }
  });

  it("never aliases successful results or changes caller inputs on a later failure", () => {
    const items = ["alpha", "beta", "alpha"];
    const first = stringListReverse(items);
    const second = stringListReverse(items);
    first[0] = "changed";
    expect(second).toEqual(["alpha", "beta", "alpha"]);
    expect(items).toEqual(["alpha", "beta", "alpha"]);
    expect(() => stringListReverse(Array(21).fill("x"))).toThrow(CollectionVMError);
    expect(second).toEqual(["alpha", "beta", "alpha"]);
    expect(items).toEqual(["alpha", "beta", "alpha"]);
  });
});

describe("coexisting offline collection releases", () => {
  it.each(["string.reverse", "string.lastIndexOf"])("requires the new release for %s", id => {
    expect(() => resolveCollectionPackage(manifest("0.1.0", [id]))).toThrow("not available");
    const resolved = resolveCollectionPackage(manifest("0.2.0", [id]));
    expect(resolved.dependencies).toEqual([COLLECTION_LIBRARY_LATEST_RELEASE]);
    expect(Object.isFrozen(resolved.dependencies[0])).toBe(true);
    expect(COLLECTION_LIBRARY_RELEASE.version).toBe("0.1.0");
  });

  it("keeps existing locked source commitments verifiable without regenerating them", async () => {
    const text = manifest("0.1.0", ["string.indexOf"]);
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    // Construct the original lock shape independently, not with the new creator.
    const lock = JSON.stringify({
      profile: "WLS-LOCK/1", manifestSha256: hash(text),
      package: { name: "test.list-tools", version: "1.0.0", executionProfile: "WLS-COLLECTION/1" },
      dependencies: [{ name: "wls.collections", version: "0.1.0", executionProfile: "WLS-COLLECTION/1" }],
      programs: [{ id: "string.indexOf", sha256: hash(getCollectionProgramSource("string.indexOf")) }],
    });
    expect((await verifyCollectionPackageLock(text, lock)).verified).toBe(true);
    expect((await executeLockedCollectionPackageProgram(text, lock, "string.indexOf", { items: ["a", "a"], value: "a" })).value).toBe(0);
  });

  it("runs old and new operations through new release manifests and locked suites", async () => {
    const text = manifest("0.2.0", ["string.reverse", "string.lastIndexOf", "string.indexOf"]);
    const lock = JSON.stringify(await createCollectionPackageLock(text));
    expect(executeCollectionPackageProgram(text, "string.reverse", { items: ["a", "b"] }).value).toEqual(["b", "a"]);
    const cases = [
      { name: "reverse", program: "string.reverse", inputs: { items: ["a", "b"] }, expect: { value: ["b", "a"] } },
      { name: "last", program: "string.lastIndexOf", inputs: { items: ["a", "a"], value: "a" }, expect: { value: 1 } },
      { name: "first", program: "string.indexOf", inputs: { items: ["a", "a"], value: "a" }, expect: { value: 0 } },
    ];
    const report = await runLockedCollectionTestSuite(JSON.stringify({ profile: "WLS-TEST/1", cases }), text, lock);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(3);
    // An exact-version switch is not an authorised lock upgrade.
    const different = manifest("0.1.0", ["string.indexOf"]);
    await expect(verifyCollectionPackageLock(different, lock)).rejects.toThrow("integrity mismatch");
  });
});
