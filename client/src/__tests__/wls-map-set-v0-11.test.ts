import { expect, it } from "vitest";
import { mapReplaceValue, mapInvertFirst, mapInvertLast } from "../../../shared/wls-map-library";
import { setFromValues } from "../../../shared/wls-set-library";
import { executeMap } from "../../../shared/wls-map-vm";
import { getCollectionProgramSource } from "../../../shared/wls-library";

it("runs all three native transforms in the browser environment without mutating inputs", () => {
  const input = { entries: [["", "__proto__"], ["Ψ", "__proto__"], ["🙂", "é"], ["constructor", "e\u0301"]] as [string, string][] };
  const before = JSON.stringify(input);
  expect(mapReplaceValue(input, "__proto__", "").entries).toEqual([["", ""], ["Ψ", ""], ["🙂", "é"], ["constructor", "e\u0301"]]);
  expect(mapInvertFirst(input).entries).toEqual([["__proto__", ""], ["é", "🙂"], ["e\u0301", "constructor"]]);
  expect(mapInvertLast(input).entries[0]).toEqual(["__proto__", "Ψ"]);
  expect(setFromValues(input).entries).toEqual([["__proto__", ""], ["é", ""], ["e\u0301", ""]]);
  expect(JSON.stringify(input)).toBe(before);
});
it.each(["map.replaceValue", "map.invertFirst", "set.fromValues"])("rejects invalid Map input for %s", id => {
  expect(() => executeMap(getCollectionProgramSource(id), { map: false, value: "", replacement: "" })).toThrow();
});
it("validates replacement operands even on empty Maps", () => {
  for (const args of [{ value: false, replacement: "" }, { value: "", replacement: false }]) {
    expect(() => executeMap(getCollectionProgramSource("map.replaceValue"), { map: { entries: [] }, ...args })).toThrow();
  }
});
