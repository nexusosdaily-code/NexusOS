import { describe, expect, it } from "vitest";
import { mapGetOrDefault, mapSetIfAbsent, mapReplaceIfPresent, mapTake, mapDrop } from "@shared/wls-map-library";
import { setTake, setDrop } from "@shared/wls-set-library";
import { executeMap } from "@shared/wls-map-vm";
import { getCollectionProgramSource } from "@shared/wls-library";

describe("portable 0.8.0 and 0.9.0 native dependency bridges", () => {
  it("runs conditional reads and updates, including Unicode and prototype-like keys", () => {
    const input = { entries: [["__proto__", ""], ["Ψ", "🙂"]] as [string, string][] };
    const before = JSON.stringify(input);
    expect(mapGetOrDefault(input, "__proto__", "fallback")).toBe("");
    expect(mapGetOrDefault(input, "missing", "fallback")).toBe("fallback");
    expect(mapSetIfAbsent(input, "Ψ", "new")).toEqual(input);
    expect(mapSetIfAbsent(input, "", "new").entries).toEqual([...input.entries, ["", "new"]]);
    expect(mapReplaceIfPresent(input, "Ψ", "new").entries).toEqual([["__proto__", ""], ["Ψ", "new"]]);
    expect(mapReplaceIfPresent(input, "missing", "new")).toEqual(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.isFrozen(mapSetIfAbsent(input, "Ψ", "new").entries[0])).toBe(true);
  });
  it.each([-1, 0, 1, 2, Number.MAX_SAFE_INTEGER])("preserves ordered selection at count %s", count => {
    const input = { entries: [["é", "one"], ["e\u0301", "two"]] as [string, string][] };
    const clamp = Math.min(2, Math.max(0, count));
    expect(mapTake(input, count).entries).toEqual(input.entries.slice(0, clamp));
    expect(mapDrop(input, count).entries).toEqual(input.entries.slice(clamp));
    expect(setTake(input, count).entries).toEqual(input.entries.slice(0, clamp).map(([key]) => [key, ""]));
    expect(setDrop(input, count).entries).toEqual(input.entries.slice(clamp).map(([key]) => [key, ""]));
  });
  it.each(["map.take", "map.drop", "set.take", "set.drop"])("validates empty %s counts", id => {
    const input = id.startsWith("set.") ? "set" : "map";
    expect(() => executeMap(getCollectionProgramSource(id), { [input]: { entries: [] }, count: false })).toThrow();
  });
  it.each(["map.getOrDefault", "map.setIfAbsent", "map.replaceIfPresent"])(
    "rejects unused non-string payloads for %s", id => {
      for (const map of [{ entries: [] }, { entries: [["a", "old"]] }]) {
        expect(() => executeMap(getCollectionProgramSource(id), { map, key: "a", value: false, fallback: false })).toThrow();
      }
    },
  );
});
