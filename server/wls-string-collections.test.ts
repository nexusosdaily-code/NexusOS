import { describe, expect, it } from "vitest";
import { COLLECTION_LIMITS, CollectionVMError, compileCollection, executeCollection } from "../shared/wls-collection-vm";
import {
  STRING_COLLECTION_SOURCE as source,
  stringListConcat,
  stringListContains,
  stringListIndexOf,
} from "../shared/wls-string-collections";
import { encodeVMName } from "../shared/wnsp-model";

describe("reusable WavelengthScript string-list programs", () => {
  it.each(Object.entries(source))("compiles %s as frozen coordinate-tagged instructions", (_name, program) => {
    const code = compileCollection(program);
    expect(Object.isFrozen(code)).toBe(true);
    for (const instruction of code) {
      expect(Object.isFrozen(instruction)).toBe(true);
      expect(Object.isFrozen(instruction.args)).toBe(true);
      expect(instruction.nm).toBe(encodeVMName(instruction.op).nm);
    }
  });

  it("finds the first exact match without changing whitespace, case or Unicode", () => {
    const items = ["", "alpha", "alpha", " alpha ", "Alpha", "é", "e\u0301", "Ψ🌊"];
    for (const value of [...items, "missing", "ALPHA", "Ψ"]) {
      expect(stringListContains(items, value)).toBe(items.includes(value));
      expect(stringListIndexOf(items, value)).toBe(items.indexOf(value));
    }
    expect(stringListIndexOf(items, "alpha")).toBe(1);
  });

  it("returns false and -1 for empty lists", () => {
    expect(stringListContains([], "")).toBe(false);
    expect(stringListIndexOf([], "")).toBe(-1);
  });

  it("terminates a search at its first match rather than scanning every item", () => {
    for (const name of ["contains", "indexOf"] as const) {
      const items = ["match", ...Array.from({ length: 19 }, (_, i) => `item-${i}`)];
      const result = executeCollection(source[name], { items, value: "match" });
      expect(result.trace.filter(step => step.op === "LIST_AT")).toHaveLength(1);
      expect(result.trace.at(-1)?.op).toBe("RETURN");
    }
  });

  it("concatenates in order, preserves duplicates and returns independent copies", () => {
    const left = Object.freeze(["alpha", "alpha"]), right = Object.freeze(["", "Ψ🌊"]);
    const result = stringListConcat(left, right);
    expect(result).toEqual(["alpha", "alpha", "", "Ψ🌊"]);
    result[0] = "changed";
    expect(left).toEqual(["alpha", "alpha"]);
    expect(right).toEqual(["", "Ψ🌊"]);
    expect(stringListConcat([], [])).toEqual([]);
    expect(stringListConcat(left, [])).toEqual(left);
    expect(stringListConcat([], right)).toEqual(right);
    expect(stringListConcat(left, [])).not.toBe(left);
    expect(stringListConcat([], right)).not.toBe(right);
  });

  it("matches deterministic reference results across every legal combined size", () => {
    for (let size = 0; size <= COLLECTION_LIMITS.items; size++) {
      for (let split = 0; split <= size; split++) {
        const left = Array.from({ length: split }, (_, i) => `v${i % 4}`);
        const right = Array.from({ length: size - split }, (_, i) => `v${i % 3}`);
        const expected = [...left, ...right];
        const actual = stringListConcat(left, right);
        expect(actual).toEqual(expected);
        for (const needle of ["v0", "v1", "v2", "v3", "absent"]) {
          expect(stringListContains(actual, needle)).toBe(expected.includes(needle));
          expect(stringListIndexOf(actual, needle)).toBe(expected.indexOf(needle));
        }
      }
    }
  });

  it("stays inside the existing execution budget at the largest valid inputs", () => {
    const items = Array.from({ length: COLLECTION_LIMITS.items }, (_, i) => `item-${i}`);
    for (const [program, inputs] of [
      [source.contains, { items, value: "missing" }],
      [source.indexOf, { items, value: items.at(-1)! }],
      [source.concat, { left: [], right: items }],
    ] as const) {
      const result = executeCollection(program, inputs);
      expect(result.trace.length).toBeLessThan(COLLECTION_LIMITS.cycles);
      expect(result.trace.at(-1)?.op).toBe("RETURN");
    }
  });

  it("rejects combined overflow without mutating either caller list", () => {
    const left = Object.freeze(Array.from({ length: 11 }, (_, i) => `left-${i}`));
    const right = Object.freeze(Array.from({ length: 10 }, (_, i) => `right-${i}`));
    expect(() => stringListConcat(left, right)).toThrow(CollectionVMError);
    expect(left).toEqual(Array.from({ length: 11 }, (_, i) => `left-${i}`));
    expect(right).toEqual(Array.from({ length: 10 }, (_, i) => `right-${i}`));
    expect(stringListConcat(left, right.slice(0, 9))).toHaveLength(20);
  });

  it.each([null, undefined, 1, true, [], {}])("rejects non-string search value %j even for an empty list", value => {
    for (const program of [source.contains, source.indexOf]) {
      expect(() => executeCollection(program, { items: [], value })).toThrow(CollectionVMError);
    }
  });

  it.each([null, "text", [1], [true], new Array(1), ["x".repeat(257)], Array(21).fill("x")])(
    "rejects malformed or oversized list %j",
    items => {
      for (const program of [source.contains, source.indexOf]) {
        expect(() => executeCollection(program, { items, value: "x" })).toThrow(CollectionVMError);
      }
      expect(() => executeCollection(source.concat, { left: items, right: [] })).toThrow(CollectionVMError);
      expect(() => executeCollection(source.concat, { left: [], right: items })).toThrow(CollectionVMError);
    },
  );

  it("accepts the maximum string length and rejects a longer needle", () => {
    const value = "x".repeat(COLLECTION_LIMITS.stringLength);
    expect(stringListContains([value], value)).toBe(true);
    expect(stringListIndexOf([value], value)).toBe(0);
    expect(stringListConcat([], [value])).toEqual([value]);
    expect(() => stringListContains([], value + "x")).toThrow(CollectionVMError);
    expect(() => stringListIndexOf([], value + "x")).toThrow(CollectionVMError);
  });
});
