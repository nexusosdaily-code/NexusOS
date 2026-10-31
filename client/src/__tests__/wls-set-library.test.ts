import { describe, expect, it } from "vitest";
import { getCollectionProgramSource, SET_PROGRAM_IDS } from "@shared/wls-library";
import { executeMap } from "@shared/wls-map-vm";
import {
  setEmpty, setFromMap, setSize, setHas, setAdd, setDelete, setAt,
  setUnion, setIntersection, setDifference,
} from "@shared/wls-set-library";

describe("map-backed string Set browser environment", () => {
  it("executes the complete portable Set catalogue without host interfaces", () => {
    expect(SET_PROGRAM_IDS).toHaveLength(10);
    for (const id of SET_PROGRAM_IDS) {
      const inputs = {
        set: { entries: [["__proto__", "ordinary"]] },
        map: { entries: [["__proto__", "ordinary"]] },
        left: { entries: [["__proto__", "left"]] },
        right: { entries: [["__proto__", "right"]] },
        value: "__proto__", index: 0,
      };
      expect(executeMap(getCollectionProgramSource(id), inputs).trace.length).toBeGreaterThan(0);
    }
  });

  it("runs every typed bridge with exact membership, canonical outputs and frozen snapshots", () => {
    const empty = setEmpty();
    const input = { entries: [["é", "payload"], ["__proto__", "payload"]] as [string, string][] };
    const projected = setFromMap(input);
    expect(projected.entries).toEqual([["é", ""], ["__proto__", ""]]);
    expect(setSize(projected)).toBe(2);
    expect(setHas(projected, "e\u0301")).toBe(false);
    expect(setAt(projected, 1)).toBe("__proto__");
    expect(setAdd(projected, "🌊").entries).toEqual([["é", ""], ["__proto__", ""], ["🌊", ""]]);
    expect(setDelete(projected, "é").entries).toEqual([["__proto__", ""]]);
    expect(setUnion(projected, empty)).toEqual(projected);
    expect(setIntersection(projected, empty)).toEqual(empty);
    expect(setDifference(projected, empty)).toEqual(projected);
    expect(Object.isFrozen(projected.entries[0])).toBe(true);
    expect(input.entries[0][1]).toBe("payload");
  });
});
