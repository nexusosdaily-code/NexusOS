import { describe, expect, it } from "vitest";
import { mapMerge, mapIntersection, mapDifference } from "@shared/wls-map-library";
import { compileMap, executeMap } from "@shared/wls-map-vm";
import { getCollectionProgramSource } from "@shared/wls-library";

describe("native map composition in the browser environment", () => {
  it.each([
    { id: "map.merge", run: mapMerge, expected: [["é", "left"], ["__proto__", "right"], ["new", "added"]] },
    { id: "map.intersection", run: mapIntersection, expected: [["__proto__", "left"]] },
    { id: "map.difference", run: mapDifference, expected: [["é", "left"]] },
  ])("compiles and executes $id without host interfaces", ({ id, run, expected }) => {
    const left = { entries: [["é", "left"], ["__proto__", "left"]] as [string, string][] };
    const right = { entries: [["__proto__", "right"], ["new", "added"]] as [string, string][] };
    const before = JSON.stringify({ left, right });
    const source = getCollectionProgramSource(id);
    expect(compileMap(source).length).toBeGreaterThan(0);
    expect(executeMap(source, { left, right }).value).toEqual({ entries: expected });
    expect(run(left, right)).toEqual({ entries: expected });
    expect(JSON.stringify({ left, right })).toBe(before);
  });
});
