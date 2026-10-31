import { expect, it } from "vitest";
import { mapSlice } from "../shared/wls-map-library";
import { setSlice } from "../shared/wls-set-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const ids = ["map.slice", "set.slice"] as const;
const m = (entries: MapValue["entries"]): MapValue => ({ entries });
function reference(map: MapValue, offset: number, count: number) {
  const start = Math.max(0, offset), length = Math.max(0, count);
  return map.entries.filter((_, index) => index >= start && index - start < length);
}

it.each(Array.from({ length: 96 }, (_, n) => n))("matches independent ordered-window references for case %i", seed => {
  const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
  const map = m(pool.filter((_, i) => (seed + i) % 4 !== 0)
    .map((key, i) => [key, pool[(seed + i * 2) % pool.length]]));
  const original = JSON.stringify(map), offset = seed % 12 - 3, count = Math.floor(seed / 3) % 12 - 3;
  const expected = reference(map, offset, count);
  const copied = mapSlice(map, offset, count), members = setSlice(map, offset, count);
  expect(copied.entries).toEqual(expected);
  expect(members.entries).toEqual(expected.map(([key]) => [key, ""]));
  for (const result of [copied, members]) {
    expect(result).not.toBe(map);
    expect(result.entries).not.toBe(map.entries);
    expect(Object.isFrozen(result.entries)).toBe(true);
    for (const entry of result.entries) expect(Object.isFrozen(entry)).toBe(true);
  }
  expect(JSON.stringify(map)).toBe(original);
});

it("handles empty outputs, negative arguments, negative zero and positional rather than sorted order", () => {
  const map = m([["b", "x"], ["", "Ψ"], ["a", "z"]]);
  expect(mapSlice(map, -1, 1).entries).toEqual([["b", "x"]]);
  expect(mapSlice(map, -0, 1).entries).toEqual([["b", "x"]]);
  expect(setSlice(map, 1, 1).entries).toEqual([["", ""]]);
  for (const input of [map, m([])]) {
    for (const [offset, count] of [[0, -1], [0, 0], [20, 1]]) {
      expect(mapSlice(input, offset, count).entries).toEqual([]);
      expect(setSlice(input, offset, count).entries).toEqual([]);
      expect(mapSlice(input, offset, count)).not.toBe(input);
    }
  }
});

it("fits full-sized maps and safe-integer extremes without computing an overflowing end position", () => {
  const map = m(Array.from({ length: 20 }, (_, i) =>
    [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
  const original = JSON.stringify(map);
  const bounds = [-Number.MAX_SAFE_INTEGER, -1, 0, 1, 19, 20, Number.MAX_SAFE_INTEGER];
  for (const offset of bounds) for (const count of bounds) {
    const expected = reference(map, offset, count);
    for (const id of ids) {
      const result = executeMap(getCollectionProgramSource(id), { map, set: map, offset, count });
      expect(result.value).toEqual(m(id === "map.slice" ? expected : expected.map(([key]) => [key, ""])));
      expect(result.trace.length).toBeGreaterThan(0);
      expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
    }
  }
  expect(JSON.stringify(map)).toBe(original);
});

for (const id of ids) {
  for (const map of [m([]), m([["a", ""]])]) {
    it.each([undefined, null, true, "0", [], {}, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
      `validates both numeric operands on empty and shortcut paths for ${id}, size ${map.entries.length}: %j`, bad => {
        expect(() => executeMap(getCollectionProgramSource(id), { map, set: map, offset: bad, count: 0 })).toThrow();
        expect(() => executeMap(getCollectionProgramSource(id), { map, set: map, offset: Number.MAX_SAFE_INTEGER, count: bad })).toThrow();
      });
    it(`requires both numeric operands for ${id}, size ${map.entries.length}`, () => {
      expect(() => executeMap(getCollectionProgramSource(id), { map, set: map, count: 0 })).toThrow();
      expect(() => executeMap(getCollectionProgramSource(id), { map, set: map, offset: 0 })).toThrow();
    });
  }
  it.each([null, [], {}, { entries: [["a", "x"], ["a", "y"]] },
    { entries: [["x".repeat(257), "y"]] }, { entries: [["a", false]] },
    { entries: Array.from({ length: 21 }, (_, i) => [String(i), "x"]) }])(
    `rejects invalid containers for ${id}: %j`, map => {
      expect(() => executeMap(getCollectionProgramSource(id), { map, set: map, offset: 0, count: 0 })).toThrow();
    });
}
