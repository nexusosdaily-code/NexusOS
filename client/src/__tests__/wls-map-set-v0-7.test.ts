import { describe, expect, it } from "vitest";
import { mapEquals, mapIsSubmap, mapIntersectionEntries, mapDifferenceEntries } from "@shared/wls-map-library";
import { setEquals, setSymmetricDifference } from "@shared/wls-set-library";
import { executeMap } from "@shared/wls-map-vm";
import { getCollectionProgramSource } from "@shared/wls-library";

describe("0.7.0 portable full-entry comparisons and exclusive Set members", () => {
  it("runs every new bridge and preserves the distinction between keys and entries", () => {
    const left = { entries: [["b", "é"], ["a", "same"]] as [string, string][] };
    const right = { entries: [["a", "same"], ["b", "e\u0301"], ["c", "third"]] as [string, string][] };
    const before = JSON.stringify({ left, right });
    expect(setEquals(left, { entries: right.entries.slice(0, 2) })).toBe(true);
    expect(mapEquals(left, right)).toBe(false);
    expect(mapIsSubmap(left, right)).toBe(false);
    expect(mapIntersectionEntries(left, right).entries).toEqual([["a", "same"]]);
    expect(mapDifferenceEntries(left, right).entries).toEqual([["b", "é"]]);
    expect(setSymmetricDifference(left, right).entries).toEqual([["c", ""]]);
    expect(JSON.stringify({ left, right })).toBe(before);
    expect(Object.isFrozen(mapIntersectionEntries(left, right).entries[0])).toBe(true);
    expect(mapEquals(left, { entries: [...left.entries].reverse() })).toBe(true);
  });

  it.each(["map.equals", "map.isSubmap", "map.intersectionEntries", "map.differenceEntries", "set.symmetricDifference"])(
    "validates empty-case right operands for %s", id => {
      expect(() => executeMap(getCollectionProgramSource(id), { left: { entries: [] }, right: false })).toThrow();
    },
  );
});
