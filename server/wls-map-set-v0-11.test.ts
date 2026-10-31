import { describe, expect, it } from "vitest";
import { mapReplaceValue, mapInvertFirst, mapInvertLast } from "../shared/wls-map-library";
import { setFromValues, setFromMap } from "../shared/wls-set-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const m = (entries: MapValue["entries"]): MapValue => ({ entries });
const ids = ["map.replaceValue", "map.invertFirst", "set.fromValues"] as const;

describe("0.11.0 bounded value transformations", () => {
  it.each(Array.from({ length: 64 }, (_, seed) => seed))("agrees with independent references for case %i", seed => {
    const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
    const input = m(pool.filter((_, i) => (seed + i) % 3 !== 0)
      .map((key, i) => [key, pool[(seed + i * 2) % pool.length]] as const));
    const value = pool[seed % pool.length], replacement = pool[(seed + 3) % pool.length];
    const before = JSON.stringify(input);
    const first = new Map<string, string>();
    for (const [key, item] of input.entries) if (!first.has(item)) first.set(item, key);
    expect(mapInvertFirst(input).entries).toEqual([...first]);
    expect(setFromValues(input).entries).toEqual([...new Set(input.entries.map(([, item]) => item))].map(item => [item, ""]));
    const replaced = mapReplaceValue(input, value, replacement);
    expect(replaced.entries).toEqual(input.entries.map(([key, item]) => [key, item === value ? replacement : item]));
    expect(Object.isFrozen(replaced.entries)).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("keeps first/last inversion policies and key/value extraction distinct", () => {
    const input = m([["b", "same"], ["a", "same"], ["c", "other"]]);
    expect(mapInvertFirst(input).entries).toEqual([["same", "b"], ["other", "c"]]);
    expect(mapInvertLast(input).entries).toEqual([["same", "a"], ["other", "c"]]);
    expect(setFromValues(input).entries).toEqual([["same", ""], ["other", ""]]);
    expect(setFromMap(input).entries).toEqual([["b", ""], ["a", ""], ["c", ""]]);
    expect(mapInvertFirst(m([["", ""], ["b", ""]])).entries).toEqual([["", ""]]);
    expect(mapReplaceValue(input, "b", "wrong").entries).toEqual(input.entries);
    expect(mapReplaceValue(input, "same", "same").entries).toEqual(input.entries);
  });

  it("returns independent snapshots including empty results", () => {
    for (const input of [m([]), m([["", ""], ["a", "é"], ["b", "e\u0301"]])]) {
      const before = JSON.stringify(input);
      for (const result of [mapInvertFirst(input), setFromValues(input), mapReplaceValue(input, "", "")]) {
        expect(result).not.toBe(input);
        expect(result.entries).not.toBe(input.entries);
        expect(Object.isFrozen(result.entries)).toBe(true);
      }
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  it("fits maximum cardinality and string lengths on every scan path", () => {
    const value = "q".repeat(256), replacement = "r".repeat(256);
    for (const mode of ["unique", "all", "last", "none"] as const) {
      const input = m(Array.from({ length: 20 }, (_, i) =>
        [`k${i}`.padEnd(256, "k"), mode === "all" || (mode === "last" && i === 19)
          ? value : `v${i}`.padEnd(256, "v")] as const));
      const original = JSON.stringify(input);
      const first = new Map<string, string>();
      for (const [key, item] of input.entries) if (!first.has(item)) first.set(item, key);
      const expected = [
        m(input.entries.map(([key, item]) => [key, item === value ? replacement : item])),
        m([...first]),
        m([...first.keys()].map(item => [item, ""])),
      ];
      ids.forEach((id, index) => {
        const result = executeMap(getCollectionProgramSource(id), { map: input, value, replacement });
        expect(result.value).toEqual(expected[index]);
        expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
      });
      expect(JSON.stringify(input)).toBe(original);
    }
    expect(MAP_LIMITS).toMatchObject({ entries: 20, cycles: 1024, memoryBytes: 65_536 });
  });

  it.each([true, 0, null, {}, { entries: Array(2) }, { entries: [["a", false]] },
    { entries: [["a", "one"], ["a", "two"]] }, { entries: [["a", "x".repeat(257)]] },
    { entries: Array.from({ length: 21 }, (_, i) => [`k${i}`, ""]) },
  ].map(map => ({ map })))("rejects malformed Maps for each transform", ({ map }) => {
    for (const id of ids) expect(() => executeMap(getCollectionProgramSource(id), { map, value: "", replacement: "" }))
      .toThrow(CollectionVMError);
  });

  it.each([false, 1, null, { entries: [] }, "x".repeat(257)].map(bad => ({ bad })))(
    "validates query and replacement even on empty/no-match inputs", ({ bad }) => {
      for (const map of [m([]), m([["a", "same"]])]) {
        for (const args of [{ value: bad, replacement: "" }, { value: "absent", replacement: bad },
          { value: "same", replacement: bad }]) {
          expect(() => executeMap(getCollectionProgramSource("map.replaceValue"), { map, ...args })).toThrow(CollectionVMError);
        }
      }
    },
  );
  it("rejects missing registers and preserves input on errors", () => {
    const input = m([["a", "same"]]), before = JSON.stringify(input);
    for (const id of ids) expect(() => executeMap(getCollectionProgramSource(id), {})).toThrow("Undefined");
    for (const args of [{ map: input, value: "same" }, { map: input, replacement: "" }]) {
      expect(() => executeMap(getCollectionProgramSource("map.replaceValue"), args)).toThrow("Undefined");
    }
    expect(JSON.stringify(input)).toBe(before);
  });
});
