import { expect, it } from "vitest";
import { mapIndexOfKey } from "../../../shared/wls-map-library";
import { setIndexOf, setAtOrDefault } from "../../../shared/wls-set-library";
import { executeMap } from "../../../shared/wls-map-vm";
import { getCollectionProgramSource } from "../../../shared/wls-library";

it("executes canonical ordered membership queries in a browser environment", () => {
  const map = { entries: [["", "payload"], ["__proto__", ""], ["Ψ", "payload"]] as [string, string][] };
  expect(mapIndexOfKey(map, "")).toBe(0);
  expect(mapIndexOfKey(map, "Ψ")).toBe(2);
  expect(setIndexOf(map, "__proto__")).toBe(1);
  expect(setIndexOf(map, "payload")).toBe(-1);
  expect(setAtOrDefault(map, 0, "fallback")).toBe("");
  expect(setAtOrDefault(map, 3, "fallback")).toBe("fallback");
  expect(map.entries).toEqual([["", "payload"], ["__proto__", ""], ["Ψ", "payload"]]);
});

it.each(["map.indexOfKey", "set.indexOf", "set.atOrDefault"])(
  "rejects missing operands on empty containers in browser execution: %s", id => {
    expect(() => executeMap(getCollectionProgramSource(id), { map: { entries: [] }, set: { entries: [] } })).toThrow();
  });
