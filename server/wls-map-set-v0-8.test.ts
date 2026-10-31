import { describe, expect, it } from "vitest";
import { mapGet, mapGetOrDefault, mapSetIfAbsent, mapReplaceIfPresent } from "../shared/wls-map-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const m = (entries: MapValue["entries"]): MapValue => ({ entries });
const ids = ["map.getOrDefault", "map.setIfAbsent", "map.replaceIfPresent"] as const;
describe("0.8.0 native conditional Map operations", () => {
  it("distinguishes missing keys from empty values and preserves order", () => {
    const input = m([["b", ""], ["a", "one"]]);
    expect(mapGetOrDefault(input, "b", "fallback")).toBe("");
    expect(mapGetOrDefault(input, "c", "fallback")).toBe("fallback");
    expect(mapSetIfAbsent(input, "b", "new")).toEqual(input);
    expect(mapSetIfAbsent(input, "c", "new")).toEqual(m([["b", ""], ["a", "one"], ["c", "new"]]));
    expect(mapReplaceIfPresent(input, "b", "new")).toEqual(m([["b", "new"], ["a", "one"]]));
    expect(mapReplaceIfPresent(input, "c", "new")).toEqual(input);
    expect(() => mapGet(input, "c")).toThrow("key is missing");
  });

  it.each(Array.from({ length: 48 }, (_, seed) => seed))("matches independent references for input %i", seed => {
    const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
    const entries = pool.filter((_, i) => (seed + i) % 3 !== 0).map((key, i) => [key, i % 2 ? "" : `v${seed}`] as const);
    const input = m(entries), key = pool[seed % pool.length], value = `new${seed}`;
    const reference = new Map(entries);
    expect(mapGetOrDefault(input, key, value)).toBe(reference.has(key) ? reference.get(key) : value);
    const insert = new Map(reference), replace = new Map(reference);
    if (!insert.has(key)) insert.set(key, value);
    if (replace.has(key)) replace.set(key, value);
    expect(mapSetIfAbsent(input, key, value)).toEqual(m([...insert]));
    expect(mapReplaceIfPresent(input, key, value)).toEqual(m([...replace]));
    expect(input).toEqual(m(entries));
  });

  it("supports maximum-size values and full no-op/replacement results without raising budgets", () => {
    const input = m(Array.from({ length: 20 }, (_, i) => [`k${i}`.padEnd(256, "k"), "v".repeat(256)]));
    const key = input.entries[19][0], value = "z".repeat(256);
    for (const id of ids) {
      const result = executeMap(getCollectionProgramSource(id), { map: input, key, value, fallback: value });
      expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    }
    expect(mapSetIfAbsent(input, key, value)).toEqual(input);
    expect(mapReplaceIfPresent(input, key, value).entries[19]).toEqual([key, value]);
    expect(mapGetOrDefault(input, key, value)).toBe("v".repeat(256));
    expect(mapGetOrDefault(input, "missing", value)).toBe(value);
    expect(mapReplaceIfPresent(input, "missing", value)).toEqual(input);
    const previous = mapSetIfAbsent(input, key, value), before = JSON.stringify(input);
    expect(() => mapSetIfAbsent(input, "missing", value)).toThrow("entry limit");
    expect(JSON.stringify(input)).toBe(before);
    expect(previous).toEqual(input);
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
  });

  it.each([false, 0, null, {}, { entries: [["x", "a"], ["x", "b"]] }, { entries: Array(1) },
    { entries: [["x", false]] }, { entries: [["x", "a".repeat(257)]] },
  ].map(invalid => ({ invalid })))("rejects malformed Maps in every branch", ({ invalid }) => {
    for (const id of ids) expect(() => executeMap(getCollectionProgramSource(id),
      { map: invalid, key: "a", value: "", fallback: "" })).toThrow(CollectionVMError);
  });

  it.each([false, 0, null, { entries: [] }, "x".repeat(257)].map(invalid => ({ invalid })))(
    "validates keys and unused payloads, without bypassing branches", ({ invalid }) => {
      for (const id of ids) for (const map of [m([]), m([["a", "old"]])]) {
        expect(() => executeMap(getCollectionProgramSource(id),
          { map, key: invalid, value: "", fallback: "" })).toThrow(CollectionVMError);
        expect(() => executeMap(getCollectionProgramSource(id),
          { map, key: "a", value: invalid, fallback: invalid })).toThrow(CollectionVMError);
      }
    },
  );

  it("requires all inputs even when the candidate is not selected", () => {
    for (const id of ids) for (const map of [m([]), m([["a", "old"]])]) {
      expect(() => executeMap(getCollectionProgramSource(id), { map, key: "a" })).toThrow("Undefined");
    }
  });

  it("returns independent deeply frozen snapshots for changed and unchanged branches", () => {
    const input: { entries: [string, string][] } = { entries: [["a", "old"]] };
    const results = [mapSetIfAbsent(input, "a", "new"), mapSetIfAbsent(input, "b", "new"),
      mapReplaceIfPresent(input, "a", "new"), mapReplaceIfPresent(input, "b", "new")];
    const before = JSON.stringify(results);
    for (const output of results) {
      expect(output).not.toBe(input);
      expect(Object.isFrozen(output)).toBe(true);
      expect(Object.isFrozen(output.entries)).toBe(true);
      expect(output.entries.every(Object.isFrozen)).toBe(true);
    }
    input.entries[0][1] = "mutated";
    input.entries.push(["c", "later"]);
    expect(JSON.stringify(results)).toBe(before);
  });
});
