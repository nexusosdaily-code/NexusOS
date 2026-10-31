import { describe, expect, it } from "vitest";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { compileMap, executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { mapMerge, mapIntersection, mapDifference } from "../shared/wls-map-library";

const map = (entries: readonly (readonly [string, string])[]): MapValue => ({ entries });
const operations = [
  { id: "map.merge", run: mapMerge },
  { id: "map.intersection", run: mapIntersection },
  { id: "map.difference", run: mapDifference },
] as const;

describe("bounded native map composition", () => {
  it("uses right values for merge and left values for key intersection/difference", () => {
    const left = map([["b", "left b"], ["a", "left a"]]);
    const right = map([["a", "right a"], ["c", "right c"]]);
    expect(mapMerge(left, right).entries).toEqual([["b", "left b"], ["a", "right a"], ["c", "right c"]]);
    expect(mapIntersection(left, right).entries).toEqual([["a", "left a"]]);
    expect(mapDifference(left, right).entries).toEqual([["b", "left b"]]);
  });

  it.each(Array.from({ length: 60 }, (_, seed) => seed))("agrees with independent ordered-map references for case %i", seed => {
    const leftEntries = Array.from({ length: seed % 21 }, (_, i) => [`k${i}`, `left${i}`] as const);
    const rightEntries = Array.from({ length: (seed * 7) % 21 }, (_, i) => [`k${i + seed % 5}`, `right${i}`] as const);
    const left = map(leftEntries), right = map(rightEntries);
    const reference = new Map<string, string>(leftEntries);
    for (const [key, value] of rightEntries) reference.set(key, value);
    if (reference.size <= 20) expect(mapMerge(left, right).entries).toEqual([...reference]);
    else expect(() => mapMerge(left, right)).toThrow("entry limit");
    const keys = new Set(rightEntries.map(([key]) => key));
    expect(mapIntersection(left, right).entries).toEqual(leftEntries.filter(([key]) => keys.has(key)));
    expect(mapDifference(left, right).entries).toEqual(leftEntries.filter(([key]) => !keys.has(key)));
  });

  it.each(operations)("keeps exact Unicode and prototype-like keys in $id", ({ id, run }) => {
    const left = map([["é", "composed"], ["e\u0301", "decomposed"], ["__proto__", "left"], ["", "empty"], ["A", "upper"], ["🌊", "wave"]]);
    const right = map([["e\u0301", "different"], ["__proto__", "right"], ["a", "lower"]]);
    const before = JSON.stringify({ left, right });
    const result = run(left, right);
    expect(result).toEqual(executeMap(getCollectionProgramSource(id), { left, right }).value);
    expect(result).toEqual(id === "map.merge" ? map([
      ["é", "composed"], ["e\u0301", "different"], ["__proto__", "right"], ["", "empty"], ["A", "upper"], ["🌊", "wave"], ["a", "lower"],
    ]) : id === "map.intersection" ? map([["e\u0301", "decomposed"], ["__proto__", "left"]]) :
      map([["é", "composed"], ["", "empty"], ["A", "upper"], ["🌊", "wave"]]));
    expect(JSON.stringify({ left, right })).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.entries)).toBe(true);
    expect(result.entries.every(Object.isFrozen)).toBe(true);
  });

  it.each(operations)("handles empty maps and identical operands in $id", ({ run, id }) => {
    const original = map([["a", "one"]]), empty = map([]);
    expect(run(empty, empty).entries).toEqual([]);
    expect(run(original, original).entries).toEqual(id === "map.difference" ? [] : original.entries);
    expect(run(original, empty).entries).toEqual(id === "map.intersection" ? [] : original.entries);
    expect(run(empty, original).entries).toEqual(id === "map.merge" ? original.entries : []);
    expect(run(original, original)).not.toBe(original);
  });

  it.each(operations)("fits maximum-size operands within all unchanged limits in $id", ({ id }) => {
    const entries = Array.from({ length: 20 }, (_, i) => [`L${i}`.padEnd(256, "k"), "x".repeat(256)] as const);
    const other = id === "map.difference" ?
      entries.map(([key]) => [`R${key.slice(1)}`, "y".repeat(256)] as const) :
      entries.map(([key]) => [key, "y".repeat(256)] as const);
    const source = getCollectionProgramSource(id);
    const result = executeMap(source, { left: map(entries), right: map(other) });
    expect((result.value as MapValue).entries).toHaveLength(20);
    expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
    expect(compileMap(source).length).toBeLessThan(MAP_LIMITS.instructions);
  });

  it("leaves inputs and earlier results unchanged when merging overflows after partial work", () => {
    const left = map(Array.from({ length: 19 }, (_, i) => [`k${i}`, "old"] as const));
    const successful = mapMerge(left, map([["k0", "safe"]]));
    const snapshot = JSON.stringify(successful);
    const right = map([["k0", "changed"], ["new1", "one"], ["new2", "two"]]);
    const before = JSON.stringify({ left, right });
    expect(() => mapMerge(left, right)).toThrow("entry limit");
    expect(JSON.stringify({ left, right })).toBe(before);
    expect(JSON.stringify(successful)).toBe(snapshot);
  });

  it.each([
    null, [], { entries: [["same", "a"], ["same", "b"]] }, { entries: [["a", 1]] },
    { entries: [["a"]] }, { entries: Array(2) }, { entries: [["a", "x".repeat(257)]] },
  ].map(invalid => ({ invalid })))("rejects invalid operands before doing useful work", ({ invalid }) => {
    for (const { id } of operations) {
      expect(() => executeMap(getCollectionProgramSource(id), { left: invalid, right: map([]) })).toThrow(CollectionVMError);
      expect(() => executeMap(getCollectionProgramSource(id), { left: map([]), right: invalid })).toThrow(CollectionVMError);
    }
  });
});
