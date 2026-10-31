import { expect, it } from "vitest";
import { mapValueAt, mapKeyAtOrDefault, mapValueAtOrDefault } from "../../../shared/wls-map-library";
import { executeMap } from "../../../shared/wls-map-vm";
import { getCollectionProgramSource } from "../../../shared/wls-library";

it("executes canonical indexed Map reads in a browser environment", () => {
  const map = { entries: [["__proto__", ""], ["", "Ψ"]] as [string, string][] };
  expect(mapValueAt(map, 0)).toBe("");
  expect(mapValueAt(map, 1)).toBe("Ψ");
  expect(mapKeyAtOrDefault(map, 1, "fallback")).toBe("");
  expect(mapValueAtOrDefault(map, 0, "fallback")).toBe("");
  expect(mapKeyAtOrDefault(map, -1, "fallback")).toBe("fallback");
  expect(mapValueAtOrDefault(map, 2, "fallback")).toBe("fallback");
  expect(map.entries).toEqual([["__proto__", ""], ["", "Ψ"]]);
});

it.each(["map.valueAt", "map.keyAtOrDefault", "map.valueAtOrDefault"])(
  "rejects fractional indices in browser execution: %s", id => {
    expect(() => executeMap(getCollectionProgramSource(id), {
      map: { entries: [] }, index: 0.5, fallback: "fallback",
    })).toThrow();
  });
