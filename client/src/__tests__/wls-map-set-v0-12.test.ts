import { expect, it } from "vitest";
import { mapFindLastKeyByValueOrDefault, mapReplaceFirstValue, mapReplaceLastValue } from "../../../shared/wls-map-library";
import { executeMap } from "../../../shared/wls-map-vm";
import { getCollectionProgramSource } from "../../../shared/wls-library";

it("executes ordered updates from canonical embedded sources in a browser environment", () => {
  const map = { entries: [["", "x"], ["Ψ", "x"], ["__proto__", "x"]] as [string, string][] };
  expect(mapFindLastKeyByValueOrDefault(map, "x", "fallback")).toBe("__proto__");
  expect(mapReplaceFirstValue(map, "x", "🙂").entries).toEqual([["", "🙂"], ["Ψ", "x"], ["__proto__", "x"]]);
  expect(mapReplaceLastValue(map, "x", "🙂").entries).toEqual([["", "x"], ["Ψ", "x"], ["__proto__", "🙂"]]);
  expect(map.entries[0][1]).toBe("x");
});

it.each(["map.findLastKeyByValueOrDefault", "map.replaceFirstValue", "map.replaceLastValue"])(
  "rejects missing operands on an empty Map in the browser: %s", id => {
    expect(() => executeMap(getCollectionProgramSource(id), { map: { entries: [] } })).toThrow();
  });
