import { expect, it } from "vitest";
import { mapSlice } from "../../../shared/wls-map-library";
import { setSlice } from "../../../shared/wls-set-library";
import { executeMap } from "../../../shared/wls-map-vm";
import { getCollectionProgramSource } from "../../../shared/wls-library";

it("executes canonical bounded slices in a browser environment", () => {
  const map = { entries: [["b", "payload"], ["", "Ψ"], ["__proto__", "x"]] as [string, string][] };
  expect(mapSlice(map, 1, 2).entries).toEqual([["", "Ψ"], ["__proto__", "x"]]);
  expect(setSlice(map, 1, 2).entries).toEqual([["", ""], ["__proto__", ""]]);
  expect(mapSlice(map, -1, 1).entries).toEqual([["b", "payload"]]);
  expect(setSlice(map, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER).entries).toEqual([]);
  expect(map.entries).toEqual([["b", "payload"], ["", "Ψ"], ["__proto__", "x"]]);
});

it.each(["map.slice", "set.slice"])("validates all required numeric operands on empty input: %s", id => {
  const empty = { entries: [] };
  expect(() => executeMap(getCollectionProgramSource(id), { map: empty, set: empty, count: 0 })).toThrow();
  expect(() => executeMap(getCollectionProgramSource(id), { map: empty, set: empty, offset: 0, count: 0.5 })).toThrow();
});
