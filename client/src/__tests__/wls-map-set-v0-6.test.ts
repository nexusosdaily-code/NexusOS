import { describe, expect, it } from "vitest";
import { mapFilterByValue, mapRejectByValue, mapInvertLast } from "@shared/wls-map-library";
import { setIsSubset, setIsDisjoint, setEquals } from "@shared/wls-set-library";
import { executeMap } from "@shared/wls-map-vm";
import { getCollectionProgramSource } from "@shared/wls-library";

describe("0.6.0 portable Map values and Set comparisons", () => {
  it("runs every new typed bridge without host interfaces or mutation", () => {
    const input = { entries: [["a", "é"], ["__proto__", "e\u0301"], ["b", "é"]] as [string, string][] };
    const other = { entries: [["b", "other"], ["__proto__", "other"], ["a", "other"]] as [string, string][] };
    const before = JSON.stringify({ input, other });
    expect(mapFilterByValue(input, "é").entries).toEqual([["a", "é"], ["b", "é"]]);
    expect(mapRejectByValue(input, "é").entries).toEqual([["__proto__", "e\u0301"]]);
    expect(mapInvertLast(input).entries).toEqual([["é", "b"], ["e\u0301", "__proto__"]]);
    expect(setEquals(input, other)).toBe(true);
    expect(setIsSubset(input, other)).toBe(true);
    expect(setIsDisjoint(input, other)).toBe(false);
    expect(JSON.stringify({ input, other })).toBe(before);
    expect(Object.isFrozen(mapInvertLast(input).entries[0])).toBe(true);
  });

  it.each(["map.filterByValue", "map.rejectByValue"])("validates empty-map value queries in %s", id => {
    expect(() => executeMap(getCollectionProgramSource(id), { map: { entries: [] }, value: false })).toThrow();
  });

  it.each(["set.isSubset", "set.isDisjoint", "set.equals"])("validates both empty-case operands in %s", id => {
    expect(() => executeMap(getCollectionProgramSource(id), { left: { entries: [] }, right: true })).toThrow();
  });
});
