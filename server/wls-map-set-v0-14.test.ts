import { expect, it } from "vitest";
import { mapIndexOfKey } from "../shared/wls-map-library";
import { setIndexOf, setAtOrDefault, setAt } from "../shared/wls-set-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const ids = ["map.indexOfKey", "set.indexOf", "set.atOrDefault"] as const;
const m = (entries: MapValue["entries"]): MapValue => ({ entries });

it.each(Array.from({ length: 64 }, (_, n) => n))("agrees with independent membership references for case %i", seed => {
  const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
  const map = m(pool.filter((_, i) => (seed + i) % 3 !== 0)
    .map((key, i) => [key, pool[(i + seed + 2) % pool.length]]));
  const original = JSON.stringify(map);
  for (const key of [...pool, "not-present"]) {
    const expected = map.entries.findIndex(([member]) => member === key);
    expect(mapIndexOfKey(map, key)).toBe(expected);
    expect(setIndexOf(map, key)).toBe(expected);
  }
  for (let index = -1; index <= map.entries.length; index++) {
    expect(setAtOrDefault(map, index, "fallback")).toBe(map.entries[index]?.[0] ?? "fallback");
    if (map.entries[index]) expect(setAt(map, index)).toBe(map.entries[index][0]);
    else expect(() => setAt(map, index)).toThrow();
  }
  expect(JSON.stringify(map)).toBe(original);
});

it("distinguishes a member at zero, absent members and non-member payloads", () => {
  const map = m([["", "payload"], ["__proto__", "payload"], ["a", ""]]);
  expect(mapIndexOfKey(map, "")).toBe(0);
  expect(setIndexOf(map, "")).toBe(0);
  expect(mapIndexOfKey(map, "payload")).toBe(-1);
  expect(setIndexOf(map, "payload")).toBe(-1);
  expect(setAtOrDefault(map, 0, "fallback")).toBe("");
  expect(setAtOrDefault(map, -0, "fallback")).toBe("");
});

it("handles maximum-sized keys, payloads and all scan/fallback paths within existing budgets", () => {
  const map = m(Array.from({ length: 20 }, (_, i) =>
    [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
  const original = JSON.stringify(map);
  for (const key of [map.entries[0][0], map.entries[19][0], "z".repeat(256)]) {
    const expected = map.entries.findIndex(([member]) => member === key);
    for (const id of ids.slice(0, 2)) {
      const result = executeMap(getCollectionProgramSource(id), { map, set: map, key, value: key });
      expect(result.value).toBe(expected);
      expect(result.trace.length).toBeGreaterThan(0);
      expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
    }
  }
  for (const index of [0, 19, -1, 20, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]) {
    const result = executeMap(getCollectionProgramSource("set.atOrDefault"), {
      set: map, index, fallback: "f".repeat(256),
    });
    expect(result.value).toBe(map.entries[index]?.[0] ?? "f".repeat(256));
    expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
  }
  expect(JSON.stringify(map)).toBe(original);
});

for (const map of [m([]), m([["", ""]])]) {
  it.each([undefined, null, true, 0, [], {}, "x".repeat(257)])(
    `requires bounded string queries, including an empty input of size ${map.entries.length}: %j`, key => {
      expect(() => executeMap(getCollectionProgramSource("map.indexOfKey"), { map, key })).toThrow();
      expect(() => executeMap(getCollectionProgramSource("set.indexOf"), { set: map, value: key })).toThrow();
    });
  it(`requires query operands on input size ${map.entries.length}`, () => {
    expect(() => executeMap(getCollectionProgramSource("map.indexOfKey"), { map })).toThrow();
    expect(() => executeMap(getCollectionProgramSource("set.indexOf"), { set: map })).toThrow();
  });
  it.each([undefined, null, true, "0", [], {}, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    `rejects malformed indices on input size ${map.entries.length}: %j`, index => {
      expect(() => executeMap(getCollectionProgramSource("set.atOrDefault"), { set: map, index, fallback: "fallback" })).toThrow();
    });
  it.each([undefined, null, true, 0, [], {}, "x".repeat(257)])(
    `requires a bounded fallback even on valid lookup, input size ${map.entries.length}: %j`, fallback => {
      for (const index of [0, -1, Number.MAX_SAFE_INTEGER]) {
        expect(() => executeMap(getCollectionProgramSource("set.atOrDefault"), { set: map, index, fallback })).toThrow();
      }
    });
  it(`requires fallback and index operands on input size ${map.entries.length}`, () => {
    expect(() => executeMap(getCollectionProgramSource("set.atOrDefault"), { set: map, index: 0 })).toThrow();
    expect(() => executeMap(getCollectionProgramSource("set.atOrDefault"), { set: map, fallback: "fallback" })).toThrow();
  });
}

for (const id of ids) {
  it.each([null, [], {}, { entries: [["a", "x"], ["a", "y"]] },
    { entries: [["x".repeat(257), "y"]] }, { entries: [["a", false]] },
    { entries: Array.from({ length: 21 }, (_, i) => [String(i), "x"]) }])(
    `rejects invalid containers for ${id}: %j`, map => {
      expect(() => executeMap(getCollectionProgramSource(id), {
        map, set: map, key: "a", value: "a", index: 0, fallback: "fallback",
      })).toThrow();
    });
}
