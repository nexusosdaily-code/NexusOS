import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { COLLECTION_PROFILE, CollectionVMError, executeCollection } from "../shared/wls-collection-vm";
import { LIBRARY_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { getCollectionProgramSource } from "../shared/wls-library";
import { executeLibraryProgram } from "../shared/wls-execution";
import { resolveCollectionPackage, executeCollectionPackageProgram } from "../shared/wls-package";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { canonicalLibraryInputs } from "../shared/wls-library-inputs";

const fixture = (file: string) => readFileSync(new URL(`../scripts/fixtures/${file}`, import.meta.url), "utf8");
// Independent contract oracle: do not generate this from the runtime ABI table.
const inputs = new Map<string, Record<string, unknown>>();
const add = (ids: string, args: Record<string, unknown>) => ids.split(" ").forEach(id => inputs.set(id, args));
add("string.contains string.indexOf string.lastIndexOf recipient.add recipient.remove", { items: ["a"], value: "x" });
add("string.concat", { left: ["a"], right: ["b"] });
add("string.reverse recipient.count", { items: ["a"] });
add("recipient.at", { items: ["a"], index: 0 });
const map = { entries: [["a", "x"]] };
add("map.empty set.empty", {});
add("map.copy map.size map.invertLast map.invertFirst set.fromMap set.fromValues", { map });
add("map.has map.get map.delete", { map, key: "a" });
add("map.indexOfKey", { map, key: "a" });
add("map.set map.setIfAbsent map.replaceIfPresent", { map, key: "a", value: "x" });
add("map.getOrDefault", { map, key: "a", fallback: "fallback" });
add("map.keyAt map.valueAt", { map, index: 0 });
add("map.keyAtOrDefault map.valueAtOrDefault", { map, index: 0, fallback: "fallback" });
add("map.merge map.intersection map.difference map.equals map.isSubmap map.intersectionEntries map.differenceEntries set.union set.intersection set.difference set.isSubset set.isDisjoint set.equals set.symmetricDifference", { left: map, right: map });
add("map.filterByValue map.rejectByValue map.hasValue map.countValue", { map, value: "x" });
add("map.findKeyByValueOrDefault map.findLastKeyByValueOrDefault", { map, value: "x", fallback: "fallback" });
add("map.replaceValue map.replaceFirstValue map.replaceLastValue", { map, value: "x", replacement: "y" });
add("map.take map.drop", { map, count: 0 });
add("map.slice", { map, offset: 0, count: 1 });
add("map.renameKeyIfAbsent", { map, key: "a", replacement: "b" });
add("map.swapValues", { map, first: "a", second: "b" });
add("map.moveToEnd", { map, key: "a" });
add("set.moveToEnd", { set: map, value: "a" });
add("set.toggle", { set: map, value: "a" });
add("set.replaceIfAbsent", { set: map, value: "a", replacement: "b" });
add("set.size", { set: map });
add("set.has set.add set.delete", { set: map, value: "a" });
add("set.indexOf", { set: map, value: "a" });
add("set.at", { set: map, index: 0 });
add("set.atOrDefault", { set: map, index: 0, fallback: "fallback" });
add("set.take set.drop", { set: map, count: 0 });
add("set.slice", { set: map, offset: 0, count: 1 });

describe("all-release canonical operand audit", () => {
  it("covers every canonical program with an independent valid call and immutable ABI", () => {
    expect([...inputs.keys()].sort()).toEqual([...LIBRARY_PROGRAM_IDS].sort());
    for (const [id, args] of inputs) {
      const source = getCollectionProgramSource(id), abi = canonicalLibraryInputs(source);
      expect(abi.map(([name]) => name).sort()).toEqual(Object.keys(args).sort());
      expect(Object.isFrozen(abi)).toBe(true);
      expect(abi.every(Object.isFrozen)).toBe(true);
      expect(() => executeLibraryProgram(source, args)).not.toThrow();
    }
  });
  it.each([...inputs])("%s rejects missing and wrongly typed required operands before shortcuts", (id, args) => {
    const source = getCollectionProgramSource(id);
    for (const [name, original] of Object.entries(args)) {
      const missing = { ...args }; delete missing[name];
      expect(() => executeLibraryProgram(source, missing)).toThrow(CollectionVMError);
      const wrong = typeof original === "string" ? [false, 0, []] :
        typeof original === "number" ? [false, "", []] : [false, 0, ""];
      for (const value of wrong) {
        expect(() => executeLibraryProgram(source, { ...args, [name]: value })).toThrow(CollectionVMError);
        const empty = Object.fromEntries(Object.entries(args).map(([key, item]) =>
          [key, Array.isArray(item) ? [] : typeof item === "object" ? { entries: [] } : item]));
        expect(() => executeLibraryProgram(source, { ...empty, [name]: value })).toThrow(CollectionVMError);
      }
    }
  });
  it("does not impose a canonical library ABI on custom source", () => {
    const source = `${COLLECTION_PROFILE}\nCONST ["result",true]\nRETURN ["result"]`;
    expect(executeCollection(source, {}).value).toBe(true);
  });
});

describe("list interpreter host-data boundary", () => {
  const source = `${COLLECTION_PROFILE}\nRETURN ["items"]`;
  it.each([null, false, 1, "abc", [], new Date(), Object.create({ items: [] })])(
    "rejects a non-data input record", value => {
      expect(() => executeCollection(source, value as never)).toThrow(CollectionVMError);
    },
  );
  it("rejects enumerable and hidden input accessors without invoking them", () => {
    let calls = 0;
    for (const enumerable of [true, false]) {
      const record = Object.defineProperty({}, "items", { enumerable, get() { calls++; return []; } });
      expect(() => executeCollection(source, record)).toThrow(CollectionVMError);
    }
    expect(calls).toBe(0);
  });
  it("rejects list accessors without invoking them or mutating the source", () => {
    let calls = 0;
    const items = Object.defineProperty(["safe"], "0", {
      get() { calls++; throw new Error("Host callback must not run"); },
    });
    expect(() => executeCollection(source, { items })).toThrow(CollectionVMError);
    expect(calls).toBe(0);
  });
  it("rejects holes, extra/symbol array properties and subclasses", () => {
    class Exotic extends Array<string> {}
    for (const items of [Array(1), Object.assign(["a"], { hidden: "x" }),
      Object.assign(["a"], { [Symbol("hidden")]: "x" }), new Exotic("a")]) {
      expect(() => executeCollection(source, { items })).toThrow(CollectionVMError);
    }
    expect(() => executeCollection(source, { items: [], [Symbol("extra")]: true })).toThrow(CollectionVMError);
  });
  it("preserves supported null-prototype records, frozen arrays and independent output", () => {
    const items = Object.freeze(["", "Ψ🙂", "__proto__"]);
    const record = Object.assign(Object.create(null), { items });
    const result = executeCollection(source, record).value;
    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });
});

const releases = [
  ["wls-collection-package.json", "e197998ad2eaafa45feb55b2e7eb5750d2c9c650ea13fae57a6bb6f5468c8ecb"],
  ["wls-collection-package-v0-2.json", "9f5d2dd538a8660a11b6628e728081fb6d9fec52cbebdf49550d34e55ac8907c"],
  ["wls-map-package-v0-3.json", "c22e5f087003835e9dd9dbe2706d66c454eb2bce428dc96c856c5885f031100b"],
  ["wls-map-package-v0-4.json", "3f90e4cf95c0b13432bc2e242150318494c7d3b5eedf9c560cc7c8e9012845ce"],
  ["wls-set-package-v0-5.json", "5ffd6d6125ea6e20d8e39c05210f831e99c46a2144cc1f61e1fdb7f9f5b5d550"],
  ["wls-map-set-package-v0-6.json", "6e7f2cf308bd53d10a03610cebd4d975275922de72d06a8531df11752b29f189"],
  ["wls-map-set-package-v0-7.json", "bb361ff41262cf27539e140dd8bcb6c290bd1b03e21f8eec8a6b3fc1bcc5f928"],
  ["wls-map-set-package-v0-8.json", "57949f68be709c363a3657e6cbac72339b34d01b574d045a8201d4ef69c7508b"],
  ["wls-map-set-package-v0-9.json", "4b1aff7c26108409807e3b275d59045354b6392362abbf59a1d39b05929a0c50"],
  ["wls-map-set-package-v0-10.json", "3ee5961430d77f8e36c8c9e9c2343a513c3edb2ab4cce469d005ef4692818c64"],
  ["wls-map-set-package-v0-11.json", "f3b71a4eae855be2d2d9058b3c59927202cec17f91f95ff98405490d40fb7ca9"],
  ["wls-map-set-package-v0-12.json", "df08bedc387b22b859e0060c098cab54917fab49aa63022ab620b05bbed37651"],
  ["wls-map-set-package-v0-13.json", "845b07bf1fa6fa378dcc084a60d9e9216a58da3c0d63b35a9e70676572c8446c"],
  ["wls-map-set-package-v0-14.json", "1e8dbda57f2408cd30ebf6ae1ca6a99221b429a9f8c1713925cd1c975f3f181f"],
  ["wls-map-set-package-v0-15.json", "4167f0cd15f9925f032566ae67c2ee14b50cd2cd898542c5b2013ab195ae9d7b"],
  ["wls-map-set-package-v0-16.json", "a27550d21f349d8dddf61515b14c6846eb06ce07626a0c48e9ca0b372c271528"],
  ["wls-map-set-package-v0-17.json", "2d0f0314f2f891bc0e4bffb30ffed4508f7ebd661b9fc5695cc40058b12c45fb"],
  ["wls-map-set-package-v0-18.json", "b1911ada2f91330483adfe8ac9b80f523d73eebb9a8473ea2450bf748fd64e21"],
] as const;
it.each(releases)("preserves %s lock and validates all its declared APIs", async (file, digest) => {
  const text = fixture(file), resolved = resolveCollectionPackage(text);
  const lock = JSON.stringify(await createCollectionPackageLock(text));
  expect(createHash("sha256").update(lock).digest("hex")).toBe(digest);
  for (const id of resolved.programs) {
    const args = inputs.get(id)!;
    expect(() => executeCollectionPackageProgram(text, id, args)).not.toThrow();
    const result = await executeLockedCollectionPackageProgram(text, lock, id, args);
    expect(result.value).toEqual(executeLibraryProgram(getCollectionProgramSource(id), args).value);
    for (const name of Object.keys(args)) {
      const missing = { ...args }; delete missing[name];
      expect(() => executeCollectionPackageProgram(text, id, missing)).toThrow(CollectionVMError);
    }
  }
});
