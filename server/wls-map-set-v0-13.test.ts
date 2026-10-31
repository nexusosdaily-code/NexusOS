import { expect, it } from "vitest";
import { mapValueAt, mapKeyAtOrDefault, mapValueAtOrDefault, mapKeyAt } from "../shared/wls-map-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const ids = ["map.valueAt", "map.keyAtOrDefault", "map.valueAtOrDefault"] as const;
const m = (entries: MapValue["entries"]): MapValue => ({ entries });

it.each(Array.from({ length: 48 }, (_, n) => n))("matches independent indexed references for case %i", seed => {
  const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
  const map = m(pool.filter((_, i) => (i + seed) % 3 !== 0)
    .map((key, i) => [key, pool[(seed + i * 2) % pool.length]]));
  const original = JSON.stringify(map);
  for (let index = -2; index <= map.entries.length + 1; index++) {
    const pair = map.entries[index];
    expect(mapKeyAtOrDefault(map, index, "absent")).toBe(pair === undefined ? "absent" : pair[0]);
    expect(mapValueAtOrDefault(map, index, "absent")).toBe(pair === undefined ? "absent" : pair[1]);
    if (pair) {
      expect(mapKeyAt(map, index)).toBe(pair[0]);
      expect(mapValueAt(map, index)).toBe(pair[1]);
    } else {
      expect(() => mapKeyAt(map, index)).toThrow();
      expect(() => mapValueAt(map, index)).toThrow();
    }
  }
  expect(JSON.stringify(map)).toBe(original);
});

it("preserves empty keys, empty values and zero-based insertion order", () => {
  const map = m([["b", ""], ["", "Ψ"], ["__proto__", "x"]]);
  expect(mapValueAtOrDefault(map, 0, "fallback")).toBe("");
  expect(mapKeyAtOrDefault(map, 1, "fallback")).toBe("");
  expect(mapValueAt(map, 1)).toBe("Ψ");
  expect(mapKeyAtOrDefault(map, -0, "fallback")).toBe("b");
});

it("handles empty Maps and extreme safe-integer indices without clamping or wrapping", () => {
  for (const map of [m([]), m([["a", "x"]])]) {
    for (const index of [-Number.MAX_SAFE_INTEGER, -1, map.entries.length, Number.MAX_SAFE_INTEGER]) {
      expect(mapKeyAtOrDefault(map, index, "")).toBe("");
      expect(mapValueAtOrDefault(map, index, "fallback")).toBe("fallback");
      expect(() => mapValueAt(map, index)).toThrow();
    }
  }
});

it("fits maximum entry and string sizes on valid and fallback paths", () => {
  const map = m(Array.from({ length: 20 }, (_, i) =>
    [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
  const original = JSON.stringify(map);
  for (const index of [0, 19, -1, 20, Number.MAX_SAFE_INTEGER]) {
    for (const id of ids) {
      if (id === "map.valueAt" && !map.entries[index]) continue;
      const result = executeMap(getCollectionProgramSource(id), { map, index, fallback: "f".repeat(256) });
      expect(result.value).toBe(map.entries[index]?.[id === "map.keyAtOrDefault" ? 0 : 1] ?? "f".repeat(256));
      expect(result.trace.length).toBeGreaterThan(0);
      expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
    }
  }
  expect(JSON.stringify(map)).toBe(original);
});

for (const id of ids) {
  for (const map of [m([]), m([["a", ""]])]) {
    it.each([undefined, null, true, "0", [], {}, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
      `rejects malformed indices for ${id}, size ${map.entries.length}: %j`, index => {
        expect(() => executeMap(getCollectionProgramSource(id), { map, index, fallback: "fallback" })).toThrow();
      });
    it(`requires index for ${id}, size ${map.entries.length}`, () => {
      expect(() => executeMap(getCollectionProgramSource(id), { map, fallback: "fallback" })).toThrow();
    });
    if (id !== "map.valueAt") {
      it.each([undefined, null, true, 1, {}, [], "x".repeat(257)])(
        `validates fallback before valid or absent lookup for ${id}, size ${map.entries.length}: %j`, fallback => {
          for (const index of [0, -1, 20]) {
            expect(() => executeMap(getCollectionProgramSource(id), { map, index, fallback })).toThrow();
          }
        });
      it(`requires fallback for ${id}, size ${map.entries.length}`, () => {
        expect(() => executeMap(getCollectionProgramSource(id), { map, index: 0 })).toThrow();
      });
    }
  }
  it.each([null, [], {}, { entries: [["a", "x"], ["a", "y"]] },
    { entries: [["x".repeat(257), "y"]] },
    { entries: Array.from({ length: 21 }, (_, i) => [String(i), "x"]) }])(
    `rejects invalid Map input for ${id}: %j`, map => {
      expect(() => executeMap(getCollectionProgramSource(id), { map, index: 0, fallback: "fallback" })).toThrow();
    });
}
