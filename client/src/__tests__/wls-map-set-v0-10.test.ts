import { expect, it } from "vitest";
import { mapHasValue, mapCountValue, mapFindKeyByValueOrDefault } from "@shared/wls-map-library";
import { executeMap } from "@shared/wls-map-vm";
import { getCollectionProgramSource } from "@shared/wls-library";

it("runs every portable value-query bridge with exact strings and insertion order", () => {
  const input = { entries: [["", "Ψ🙂"], ["__proto__", "Ψ🙂"], ["é", "e\u0301"]] as [string, string][] };
  const before = JSON.stringify(input);
  expect(mapHasValue(input, "Ψ🙂")).toBe(true);
  expect(mapCountValue(input, "Ψ🙂")).toBe(2);
  expect(mapFindKeyByValueOrDefault(input, "Ψ🙂", "missing")).toBe("");
  expect(mapFindKeyByValueOrDefault(input, "e\u0301", "missing")).toBe("é");
  expect(mapHasValue(input, "é")).toBe(false);
  expect(mapCountValue(input, "missing")).toBe(0);
  expect(mapFindKeyByValueOrDefault(input, "missing", "__proto__")).toBe("__proto__");
  expect(JSON.stringify(input)).toBe(before);
});
it.each(["map.hasValue", "map.countValue", "map.findKeyByValueOrDefault"])(
  "validates empty-map queries for %s", id => {
    expect(() => executeMap(getCollectionProgramSource(id), { map: { entries: [] }, value: false, fallback: "" })).toThrow();
  },
);
it("validates a fallback even when matching the first key", () => {
  expect(() => executeMap(getCollectionProgramSource("map.findKeyByValueOrDefault"),
    { map: { entries: [["a", "same"]] }, value: "same", fallback: false })).toThrow();
});
