import { describe, expect, it } from "vitest";
import { mapHasValue, mapCountValue, mapFindKeyByValueOrDefault } from "../shared/wls-map-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const m = (entries: MapValue["entries"]): MapValue => ({ entries });
const ids = ["map.hasValue", "map.countValue", "map.findKeyByValueOrDefault"] as const;
describe("0.10.0 native Map value queries", () => {
  it.each(Array.from({ length: 64 }, (_, seed) => seed))("agrees with independent value references for case %i", seed => {
    const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
    const entries = pool.filter((_, i) => (seed + i) % 3 !== 0)
      .map((key, i) => [key, pool[(seed + i * 2) % pool.length]] as const);
    const input = m(entries), value = pool[seed % pool.length];
    const matching = entries.filter(([, item]) => item === value);
    const before = JSON.stringify(input);
    expect(mapHasValue(input, value)).toBe(matching.length > 0);
    expect(mapCountValue(input, value)).toBe(matching.length);
    expect(mapFindKeyByValueOrDefault(input, value, "fallback")).toBe(matching.length ? matching[0][0] : "fallback");
    expect(JSON.stringify(input)).toBe(before);
  });

  it("distinguishes values from keys, counts duplicates and selects the first match", () => {
    const input = m([["same", "other"], ["", "same"], ["b", "same"], ["a", "same"]]);
    expect(mapHasValue(input, "other")).toBe(true);
    expect(mapCountValue(input, "same")).toBe(3);
    expect(mapFindKeyByValueOrDefault(input, "same", "missing")).toBe("");
    expect(mapFindKeyByValueOrDefault(m([...input.entries].reverse()), "same", "missing")).toBe("a");
    expect(mapHasValue(m([["only-a-key", "value"]]), "only-a-key")).toBe(false);
    expect(mapCountValue(m([]), "")).toBe(0);
    expect(mapHasValue(m([]), "")).toBe(false);
    expect(mapFindKeyByValueOrDefault(m([]), "", "")).toBe("");
  });

  it("supports all maximum-size scan paths within unchanged budgets", () => {
    const query = "v".repeat(256), fallback = "f".repeat(256);
    const keys = Array.from({ length: 20 }, (_, i) => `k${i}`.padEnd(256, "k"));
    for (const mode of ["all", "last", "none"] as const) {
      const input = m(keys.map((key, i) => [key, mode === "all" || (mode === "last" && i === 19) ? query : "x".repeat(256)]));
      const values = [mode !== "none", mode === "all" ? 20 : mode === "last" ? 1 : 0,
        mode === "all" ? keys[0] : mode === "last" ? keys[19] : fallback];
      ids.forEach((id, index) => {
        const result = executeMap(getCollectionProgramSource(id), { map: input, value: query, fallback });
        expect(result.value).toBe(values[index]);
        expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
      });
    }
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
  });

  it.each([true, 0, null, {}, { entries: [["a", false]] }, { entries: Array(2) },
    { entries: [["a", "one"], ["a", "two"]] }, { entries: [["a", "x".repeat(257)]] },
    { entries: Array.from({ length: 21 }, (_, i) => [`k${i}`, ""]) },
  ].map(map => ({ map })))("rejects malformed Maps for every query", ({ map }) => {
    for (const id of ids) expect(() => executeMap(getCollectionProgramSource(id),
      { map, value: "", fallback: "" })).toThrow(CollectionVMError);
  });

  it.each([false, 1, null, { entries: [] }, "x".repeat(257)].map(value => ({ value })))(
    "rejects invalid queries, including empty-Map shortcuts", ({ value }) => {
      for (const map of [m([]), m([["a", "present"]])]) for (const id of ids) {
        expect(() => executeMap(getCollectionProgramSource(id), { map, value, fallback: "" })).toThrow(CollectionVMError);
      }
    },
  );

  it.each([false, 1, null, { entries: [] }, "x".repeat(257)].map(fallback => ({ fallback })))(
    "validates unused fallback strings", ({ fallback }) => {
      for (const map of [m([]), m([["a", "present"]])]) {
        expect(() => executeMap(getCollectionProgramSource("map.findKeyByValueOrDefault"),
          { map, value: "present", fallback })).toThrow(CollectionVMError);
      }
    },
  );

  it("requires query/fallback registers even for an empty Map", () => {
    for (const id of ids) expect(() => executeMap(getCollectionProgramSource(id), { map: m([]) })).toThrow("Undefined");
    expect(() => executeMap(getCollectionProgramSource("map.findKeyByValueOrDefault"),
      { map: m([["a", "present"]]), value: "present" })).toThrow("Undefined");
  });

  it("does not coerce or normalize strings and leaves input unchanged after failures", () => {
    const input = m([["a", "é"], ["b", "e\u0301"], ["c", "0"], ["d", "__proto__"]]);
    const before = JSON.stringify(input);
    expect(mapCountValue(input, "é")).toBe(1);
    expect(mapFindKeyByValueOrDefault(input, "e\u0301", "missing")).toBe("b");
    expect(mapFindKeyByValueOrDefault(input, "__proto__", "missing")).toBe("d");
    expect(() => executeMap(getCollectionProgramSource("map.countValue"), { map: input, value: 0 })).toThrow();
    expect(JSON.stringify(input)).toBe(before);
  });
});
