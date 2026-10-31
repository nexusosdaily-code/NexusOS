import { describe, expect, it } from "vitest";
import { mapFindLastKeyByValueOrDefault, mapReplaceFirstValue, mapReplaceLastValue } from "../shared/wls-map-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const ids = ["map.findLastKeyByValueOrDefault", "map.replaceFirstValue", "map.replaceLastValue"] as const;
const input = (entries: MapValue["entries"]): MapValue => ({ entries });

describe("0.12.0 ordered value queries and updates", () => {
  it.each(Array.from({ length: 72 }, (_, n) => n))("matches independent references for case %i", seed => {
    const pool = ["", "__proto__", "constructor", "Ψ", "🙂", "é", "e\u0301", "x"];
    const map = input(pool.filter((_, i) => (i + seed) % 4 !== 0)
      .map((key, i) => [key, pool[(Math.floor(i / 2) + seed) % pool.length]]));
    const before = JSON.stringify(map);
    const value = pool[seed % pool.length], replacement = pool[(seed + 2) % pool.length];
    const indices = map.entries.flatMap(([, v], i) => v === value ? [i] : []);
    const first = indices[0], last = indices[indices.length - 1];
    expect(mapFindLastKeyByValueOrDefault(map, value, "fallback"))
      .toBe(last === undefined ? "fallback" : map.entries[last][0]);
    for (const [index, result] of [
      [first, mapReplaceFirstValue(map, value, replacement)],
      [last, mapReplaceLastValue(map, value, replacement)],
    ] as const) {
      expect(result.entries).toEqual(map.entries.map(([key, item], i) =>
        [key, i === index ? replacement : item]));
      expect(result).not.toBe(map);
      expect(result.entries).not.toBe(map.entries);
      expect(Object.isFrozen(result.entries)).toBe(true);
      for (const entry of result.entries) expect(Object.isFrozen(entry)).toBe(true);
    }
    expect(JSON.stringify(map)).toBe(before);
  });

  it.each(["all", "first", "last", "none"] as const)("fits existing maximum bounds for %s matches", mode => {
    const value = "v".repeat(256), replacement = "r".repeat(256);
    const map = input(Array.from({ length: 20 }, (_, i) =>
      [`k${i}`.padEnd(256, "k"), mode === "all" || mode === "first" && i === 0 || mode === "last" && i === 19 ? value : "n".repeat(256)]));
    const indices = map.entries.flatMap(([, v], i) => v === value ? [i] : []);
    const first = indices[0], last = indices[indices.length - 1];
    const expected = [
      last === undefined ? replacement : map.entries[last][0],
      input(map.entries.map(([k, v], i) => [k, i === first ? replacement : v])),
      input(map.entries.map(([k, v], i) => [k, i === last ? replacement : v])),
    ];
    ids.forEach((id, i) => {
      const result = executeMap(getCollectionProgramSource(id), { map, value, replacement, fallback: replacement });
      expect(result.value).toEqual(expected[i]);
      expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
      expect(result.trace.length).toBeGreaterThan(0);
    });
  });

  it("distinguishes first/last matches, empty keys, absent queries and identical replacements", () => {
    const map = input([["", "x"], ["__proto__", "x"]]);
    expect(mapFindLastKeyByValueOrDefault(map, "x", "fallback")).toBe("__proto__");
    expect(mapFindLastKeyByValueOrDefault(input([["", "x"]]), "x", "fallback")).toBe("");
    expect(mapReplaceFirstValue(map, "x", "y").entries).toEqual([["", "y"], ["__proto__", "x"]]);
    expect(mapReplaceLastValue(map, "x", "y").entries).toEqual([["", "x"], ["__proto__", "y"]]);
    expect(mapReplaceLastValue(map, "missing", "y").entries).toEqual(map.entries);
    expect(mapReplaceFirstValue(map, "x", "x").entries).toEqual(map.entries);
  });

  for (const id of ids) {
    const other = id === ids[0] ? "fallback" : "replacement";
    for (const map of [input([]), input([["a", "x"]])]) {
      it.each([undefined, null, 1, true, [], {}, "x".repeat(257)])(
        `rejects invalid value or ${other} for ${id}, size ${map.entries.length}: %j`, bad => {
          expect(() => executeMap(getCollectionProgramSource(id), { map, value: bad, [other]: "ok" })).toThrow();
          expect(() => executeMap(getCollectionProgramSource(id), { map, value: "x", [other]: bad })).toThrow();
        });
      it(`rejects missing operands for ${id}, size ${map.entries.length}`, () => {
        expect(() => executeMap(getCollectionProgramSource(id), { map, value: "x" })).toThrow();
        expect(() => executeMap(getCollectionProgramSource(id), { map, [other]: "ok" })).toThrow();
      });
    }
    it.each([null, [], {}, { entries: [["a", "x"], ["a", "y"]] }, { entries: Array.from({ length: 21 }, (_, i) => [String(i), "x"]) }])(
      `rejects invalid maps for ${id}: %j`, map => {
        expect(() => executeMap(getCollectionProgramSource(id), { map, value: "x", [other]: "y" })).toThrow();
      });
  }
});
