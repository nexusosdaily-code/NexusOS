import { describe, expect, it } from "vitest";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { compileMap, executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { mapEquals, mapIsSubmap, mapIntersectionEntries, mapDifferenceEntries } from "../shared/wls-map-library";
import { setEquals, setSymmetricDifference } from "../shared/wls-set-library";

const ids = ["map.equals", "map.isSubmap", "map.intersectionEntries", "map.differenceEntries", "set.symmetricDifference"] as const;
const m = (entries: readonly (readonly [string, string])[]): MapValue => ({ entries });
const keys = (items: readonly string[], payload = "") => m(items.map(key => [key, payload]));

describe("native full-entry comparisons and exclusive Set members", () => {
  it.each(ids)("loads identical canonical/portable %s source under unchanged limits", async id => {
    const source = getCollectionProgramSource(id);
    expect(source).toBe(await readCollectionProgramSource(id));
    expect(source.startsWith("WLS-MAP/1\n")).toBe(true);
    expect(source.length).toBeLessThanOrEqual(MAP_LIMITS.sourceLength);
    expect(compileMap(source).length).toBeLessThanOrEqual(MAP_LIMITS.instructions);
  });

  it("distinguishes Map entry equality from Set key equality", () => {
    const left = m([["b", "left"], ["a", "same"]]), right = m([["a", "same"], ["b", "right"]]);
    expect(setEquals(left, right)).toBe(true);
    expect(mapEquals(left, right)).toBe(false);
    expect(mapIsSubmap(left, right)).toBe(false);
    expect(mapIsSubmap(m([["a", "same"]]), right)).toBe(true);
    expect(mapIntersectionEntries(left, right)).toEqual(m([["a", "same"]]));
    expect(mapDifferenceEntries(left, right)).toEqual(m([["b", "left"]]));
    expect(mapEquals(left, m([...left.entries].reverse()))).toBe(true);
  });

  it("uses exact keys and values without normalization or prototype interpretation", () => {
    const left = m([["__proto__", "é"], ["2", "🙂"], ["1", "\ud800"], ["", ""]]);
    const right = m([["", ""], ["__proto__", "e\u0301"], ["2", "🙂"]]);
    expect(mapIntersectionEntries(left, right)).toEqual(m([["2", "🙂"], ["", ""]]));
    expect(mapDifferenceEntries(left, right)).toEqual(m([["__proto__", "é"], ["1", "\ud800"]]));
    expect(setSymmetricDifference(left, right)).toEqual(m([["1", ""]]));
    expect(mapEquals(keys(["A"]), keys(["a"]))).toBe(false);
  });

  it("handles empty operands, identities and directional submap semantics", () => {
    const empty = keys([]), one = m([["a", "one"]]);
    expect(mapEquals(empty, empty)).toBe(true);
    expect(mapEquals(empty, one)).toBe(false);
    expect(mapIsSubmap(empty, one)).toBe(true);
    expect(mapIsSubmap(one, empty)).toBe(false);
    expect(mapIntersectionEntries(one, empty)).toEqual(empty);
    expect(mapDifferenceEntries(one, empty)).toEqual(one);
    expect(mapDifferenceEntries(one, one)).toEqual(empty);
    expect(setSymmetricDifference(one, empty)).toEqual(keys(["a"]));
    expect(setSymmetricDifference(empty, one)).toEqual(keys(["a"]));
    expect(setSymmetricDifference(one, one)).toEqual(empty);
  });

  it.each(Array.from({ length: 60 }, (_, seed) => seed))("matches independent ordered references for case %i", seed => {
    const leftEntries = Array.from({ length: seed % 21 }, (_, i) => [`k${i}`, `v${(i + seed) % 7}`] as const);
    const rightEntries = Array.from({ length: seed * 7 % 21 }, (_, i) => [`k${i + seed % 5}`, `v${(i + 2 * seed) % 7}`] as const);
    const left = m(leftEntries), right = m(rightEntries), reference = new Map<string, string>(rightEntries);
    const matches = ([key, value]: readonly [string, string]) => reference.has(key) && reference.get(key) === value;
    const subset = leftEntries.every(matches);
    expect(mapIsSubmap(left, right)).toBe(subset);
    expect(mapEquals(left, right)).toBe(leftEntries.length === rightEntries.length && subset);
    expect(mapEquals(right, left)).toBe(mapEquals(left, right));
    expect(mapIntersectionEntries(left, right)).toEqual(m(leftEntries.filter(matches)));
    expect(mapDifferenceEntries(left, right)).toEqual(m(leftEntries.filter(entry => !matches(entry))));
    const leftKeys = new Set(leftEntries.map(([key]) => key));
    const exclusive = [
      ...leftEntries.filter(([key]) => !reference.has(key)),
      ...rightEntries.filter(([key]) => !leftKeys.has(key)),
    ].map(([key]) => key);
    if (exclusive.length > 20) expect(() => setSymmetricDifference(left, right)).toThrow("entry limit");
    else expect(setSymmetricDifference(left, right)).toEqual(keys(exclusive));
  });

  it("handles full-result entry operations with both Maps at maximum size", () => {
    const entries = Array.from({ length: 20 }, (_, i) => [`K${i}`.padEnd(256, "k"), `V${i}`.padEnd(256, "v")] as const);
    const left = m(entries), identical = m([...entries].reverse());
    const different = m(entries.map(([key, value]) => [key, `Z${value.slice(1)}`]));
    for (const [id, right, expected] of [
      ["map.intersectionEntries", identical, left],
      ["map.differenceEntries", different, left],
      ["map.equals", identical, true], ["map.isSubmap", identical, true],
    ] as const) {
      const result = executeMap(getCollectionProgramSource(id), { left, right });
      expect(result.value).toEqual(expected);
      expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    }
    const lastMismatch = m(entries.map(([key, value], index) => [key, index === 19 ? `Z${value.slice(1)}` : value]));
    expect(mapEquals(left, lastMismatch)).toBe(false);
    expect(mapIsSubmap(left, lastMismatch)).toBe(false);
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
  });

  it("allows a bounded symmetric difference even when the union would exceed 20", () => {
    const member = (index: number) => `K${index}`.padEnd(256, "k");
    const left = keys(Array.from({ length: 20 }, (_, i) => member(i)), "l".repeat(256));
    const right = keys(Array.from({ length: 20 }, (_, i) => member(i + 10)), "r".repeat(256));
    const result = executeMap(getCollectionProgramSource("set.symmetricDifference"), { left, right });
    const expected = [...Array.from({ length: 10 }, (_, i) => member(i)), ...Array.from({ length: 10 }, (_, i) => member(i + 20))];
    expect(result.value).toEqual(keys(expected));
    expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    expect(setSymmetricDifference(left, left)).toEqual(keys([]));
  });

  it("fails overflowing exclusive results without mutating inputs or earlier results", () => {
    const left = keys(Array.from({ length: 20 }, (_, i) => `a${i}`), "left");
    const right = keys(Array.from({ length: 20 }, (_, i) => `b${i}`), "right");
    const before = JSON.stringify({ left, right });
    const previous = setSymmetricDifference(left, keys([]));
    expect(() => setSymmetricDifference(left, right)).toThrow("entry limit");
    expect(JSON.stringify({ left, right })).toBe(before);
    expect(previous).toEqual(keys(left.entries.map(([key]) => key)));
  });

  it("returns deeply frozen independent Maps without changing either operand", () => {
    const left: { entries: [string, string][] } = { entries: [["a", "one"], ["b", "two"]] };
    const right = m([["a", "one"], ["c", "three"]]);
    const before = JSON.stringify({ left, right });
    const results = [mapIntersectionEntries(left, right), mapDifferenceEntries(left, right), setSymmetricDifference(left, right)];
    mapEquals(left, right); mapIsSubmap(left, right);
    expect(JSON.stringify({ left, right })).toBe(before);
    const snapshots = JSON.stringify(results);
    left.entries[0][1] = "changed";
    left.entries.push(["new", "value"]);
    expect(JSON.stringify(results)).toBe(snapshots);
    for (const result of results) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.entries)).toBe(true);
      expect(result.entries.every(Object.isFrozen)).toBe(true);
    }
  });

  it.each([
    true, 3, null, { entries: [["a", "x"], ["a", "y"]] },
    { entries: [["a", false]] }, { entries: Array(2) },
    { entries: [["a", "x".repeat(257)]] },
    { entries: Array.from({ length: 21 }, (_, i) => [`k${i}`, ""]) },
  ].map(invalid => ({ invalid })))("validates both operands before empty or size shortcuts", ({ invalid }) => {
    for (const id of ids) {
      expect(() => executeMap(getCollectionProgramSource(id), { left: keys([]), right: invalid })).toThrow(CollectionVMError);
      expect(() => executeMap(getCollectionProgramSource(id), { left: invalid, right: keys([]) })).toThrow(CollectionVMError);
    }
  });
});
