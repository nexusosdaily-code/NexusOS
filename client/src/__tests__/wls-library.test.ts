import { describe, expect, it } from "vitest";
import { COLLECTION_PROGRAM_IDS, getCollectionProgramSource, type CollectionProgramId } from "@shared/wls-library";
import { executeCollection } from "@shared/wls-collection-vm";
import { executeMap } from "@shared/wls-map-vm";
import { MAP_PROGRAM_IDS } from "@shared/wls-library";

const cases: Record<CollectionProgramId, { inputs: Record<string, unknown>; expected: unknown }> = {
  "string.contains": { inputs: { items: ["a", "b", "a"], value: "a" }, expected: true },
  "string.indexOf": { inputs: { items: ["a", "b", "a"], value: "a" }, expected: 0 },
  "string.concat": { inputs: { left: ["a"], right: ["a", "b"] }, expected: ["a", "a", "b"] },
  "recipient.add": { inputs: { items: ["a"], value: "b" }, expected: ["a", "b"] },
  "recipient.remove": { inputs: { items: ["a", "b", "a"], value: "a" }, expected: ["b"] },
  "recipient.count": { inputs: { items: ["a", "b"] }, expected: 2 },
  "recipient.at": { inputs: { items: ["a", "b"], index: 1 }, expected: "b" },
  "string.lastIndexOf": { inputs: { items: ["a", "b", "a"], value: "a" }, expected: 2 },
  "string.reverse": { inputs: { items: ["a", "b", "a", "c"] }, expected: ["c", "a", "b", "a"] },
};

describe("portable WLS library in the browser environment", () => {
  it("loads the separate map profile without fetching or changing collection IDs", () => {
    expect(COLLECTION_PROGRAM_IDS).toHaveLength(9);
    expect(MAP_PROGRAM_IDS).toHaveLength(8);
    for (const id of MAP_PROGRAM_IDS) expect(getCollectionProgramSource(id)).toMatch(/^WLS-MAP\/1\n/);
    expect(executeMap(getCollectionProgramSource("map.set"), {
      map: { entries: [["__proto__", "Ψ🙂"]] }, key: "constructor", value: "é",
    }).value).toEqual({ entries: [["__proto__", "Ψ🙂"], ["constructor", "é"]] });
  });
  it.each(COLLECTION_PROGRAM_IDS)("loads and executes %s synchronously", id => {
    const { inputs, expected } = cases[id];
    const before = JSON.stringify(inputs);
    const source = getCollectionProgramSource(id);
    expect(typeof source).toBe("string");
    expect(executeCollection(source, inputs).value).toEqual(expected);
    expect(JSON.stringify(inputs)).toBe(before);
  });

  it("refuses unlisted programs rather than fetching or resolving them", () => {
    for (const id of ["constructor", "__proto__", "../contains.wls", "https://example.invalid/x.wls"]) {
      expect(() => getCollectionProgramSource(id)).toThrow("Unknown collection library program.");
    }
  });
});
