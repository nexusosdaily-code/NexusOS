import { describe, expect, it } from "vitest";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { compileMap, executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import { mapFilterByValue, mapRejectByValue, mapInvertLast } from "../shared/wls-map-library";
import { setIsSubset, setIsDisjoint, setEquals } from "../shared/wls-set-library";

const newIds = [
  "map.filterByValue", "map.rejectByValue", "map.invertLast",
  "set.isSubset", "set.isDisjoint", "set.equals",
] as const;
const m = (entries: readonly (readonly [string, string])[]): MapValue => ({ entries });
const keys = (items: readonly string[], payload = "") => m(items.map(key => [key, payload]));
const predicates = [
  { id: "set.isSubset", run: setIsSubset },
  { id: "set.isDisjoint", run: setIsDisjoint },
  { id: "set.equals", run: setEquals },
] as const;

describe("native value operations and Set comparisons", () => {
  it.each(newIds)("loads canonical %s source and compiles within existing limits", async id => {
    const source = getCollectionProgramSource(id);
    expect(source).toBe(await readCollectionProgramSource(id));
    expect(source.startsWith("WLS-MAP/1\n")).toBe(true);
    expect(source.length).toBeLessThanOrEqual(MAP_LIMITS.sourceLength);
    expect(compileMap(source).length).toBeLessThanOrEqual(MAP_LIMITS.instructions);
  });

  it("filters and rejects exact values without changing key order or payloads", () => {
    const input = m([["2", "é"], ["1", "e\u0301"], ["__proto__", "é"], ["", ""]]);
    expect(mapFilterByValue(input, "é")).toEqual(m([["2", "é"], ["__proto__", "é"]]));
    expect(mapRejectByValue(input, "é")).toEqual(m([["1", "e\u0301"], ["", ""]]));
    expect(mapFilterByValue(input, "")).toEqual(m([["", ""]]));
    expect(mapRejectByValue(input, "missing")).toEqual(input);
    expect(mapFilterByValue(input, "É")).toEqual(m([]));
  });

  it("inverts with last-key precedence and first-value insertion order", () => {
    const input = m([["a", "x"], ["b", "__proto__"], ["c", "x"], ["d", ""], ["e", "__proto__"]]);
    expect(mapInvertLast(input)).toEqual(m([["x", "c"], ["__proto__", "e"], ["", "d"]]));
    expect(mapInvertLast(m([["é", "é"], ["e\u0301", "e\u0301"], ["\ud800", "🙂"]])))
      .toEqual(m([["é", "é"], ["e\u0301", "e\u0301"], ["🙂", "\ud800"]]));
  });

  it("compares key sets rather than payloads or insertion positions", () => {
    const left = keys(["a", "b"], "left"), right = keys(["b", "a"], "different");
    expect(setEquals(left, right)).toBe(true);
    expect(setEquals(left, keys(["a", "c"]))).toBe(false);
    expect(setIsSubset(keys(["a"]), left)).toBe(true);
    expect(setIsSubset(left, keys(["a"]))).toBe(false);
    expect(setIsDisjoint(left, keys(["c"]))).toBe(true);
    expect(setIsDisjoint(left, right)).toBe(false);
    expect(setIsDisjoint(keys(["é"]), keys(["e\u0301"]))).toBe(true);
  });

  it("handles empty maps and Set identities", () => {
    const empty = keys([]), one = keys(["a"]);
    expect(mapFilterByValue(empty, "")).toEqual(empty);
    expect(mapRejectByValue(empty, "")).toEqual(empty);
    expect(mapInvertLast(empty)).toEqual(empty);
    expect(setEquals(empty, empty)).toBe(true);
    expect(setEquals(empty, one)).toBe(false);
    expect(setIsSubset(empty, one)).toBe(true);
    expect(setIsSubset(one, empty)).toBe(false);
    expect(setIsDisjoint(empty, one)).toBe(true);
    expect(setIsDisjoint(one, empty)).toBe(true);
  });

  it.each(Array.from({ length: 60 }, (_, i) => i))("matches independent references for case %i", seed => {
    const entries = Array.from({ length: seed % 21 }, (_, i) => [`k${i}`, `v${(i + seed) % 7}`] as const);
    const input = m(entries), query = `v${seed % 9}`;
    expect(mapFilterByValue(input, query)).toEqual(m(entries.filter(([, value]) => value === query)));
    expect(mapRejectByValue(input, query)).toEqual(m(entries.filter(([, value]) => value !== query)));
    const inverted = new Map<string, string>();
    for (const [key, value] of entries) inverted.set(value, key);
    expect(mapInvertLast(input)).toEqual(m([...inverted]));
    const rightKeys = Array.from({ length: seed * 7 % 21 }, (_, i) => `k${i + seed % 5}`);
    const right = keys(rightKeys, "other"), reference = new Set(rightKeys);
    const subset = entries.every(([key]) => reference.has(key));
    expect(setIsSubset(input, right)).toBe(subset);
    expect(setIsDisjoint(input, right)).toBe(entries.every(([key]) => !reference.has(key)));
    expect(setEquals(input, right)).toBe(entries.length === rightKeys.length && subset);
  });

  it("supports full-size value operations without enlarging interpreter budgets", () => {
    const entries = Array.from({ length: 20 }, (_, i) => [`K${i}`.padEnd(256, "k"), `V${i}`.padEnd(256, "v")] as const);
    const input = m(entries), same = m(entries.map(([key]) => [key, "x".repeat(256)]));
    const cases = [
      { id: "map.filterByValue", inputs: { map: same, value: "x".repeat(256) }, expected: same },
      { id: "map.rejectByValue", inputs: { map: same, value: "y".repeat(256) }, expected: same },
      { id: "map.invertLast", inputs: { map: input }, expected: m(entries.map(([key, value]) => [value, key])) },
    ];
    for (const { id, inputs, expected } of cases) {
      const result = executeMap(getCollectionProgramSource(id), inputs);
      expect(result.value).toEqual(expected);
      expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    }
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
  });

  it.each(predicates)("supports maximum-size Maps and worst-path membership in $id", ({ id }) => {
    const members = Array.from({ length: 20 }, (_, i) => `K${i}`.padEnd(256, "k"));
    const left = keys(members, "l".repeat(256));
    const right = keys([...members].reverse(), "r".repeat(256));
    const result = executeMap(getCollectionProgramSource(id), { left, right });
    expect(result.value).toBe(id !== "set.isDisjoint");
    expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    const lastMismatch = keys([...members.slice(0, 19), "different".padEnd(256, "k")], "r".repeat(256));
    expect(executeMap(getCollectionProgramSource(id), { left, right: lastMismatch }).value).toBe(false);
    const disjoint = keys(members.map(key => `Z${key.slice(1)}`), "r".repeat(256));
    const fullScan = executeMap(getCollectionProgramSource(id), { left, right: disjoint });
    expect(fullScan.value).toBe(id === "set.isDisjoint");
    expect(fullScan.trace.length).toBeLessThan(MAP_LIMITS.cycles);
  });

  it("returns deeply frozen independent Maps and leaves both Set operands unchanged", () => {
    const input: { entries: [string, string][] } = { entries: [["a", "x"], ["b", "x"]] };
    const results = [mapFilterByValue(input, "x"), mapRejectByValue(input, "y"), mapInvertLast(input)];
    const before = JSON.stringify(results);
    const right = keys(["b", "a"], "different");
    const operands = JSON.stringify({ input, right });
    for (const { run } of predicates) run(input, right);
    expect(JSON.stringify({ input, right })).toBe(operands);
    input.entries[0][0] = "changed";
    input.entries.push(["new", "v"]);
    expect(JSON.stringify(results)).toBe(before);
    for (const result of results) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.entries)).toBe(true);
      expect(result.entries.every(Object.isFrozen)).toBe(true);
    }
  });

  it.each([true, 3, null, { entries: [] }, "x".repeat(257)])("rejects invalid value queries even for empty maps", value => {
    for (const id of ["map.filterByValue", "map.rejectByValue"]) {
      expect(() => executeMap(getCollectionProgramSource(id), { map: keys([]), value })).toThrow(CollectionVMError);
    }
  });

  it.each([
    true, 3, null, { entries: [["a", "x"], ["a", "y"]] },
    { entries: [["a", false]] }, { entries: Array(2) }, { entries: [["x".repeat(257), ""]] },
    { entries: Array.from({ length: 21 }, (_, i) => [`k${i}`, ""]) },
  ].map(invalid => ({ invalid })))("validates both predicate inputs before any empty/size shortcut", ({ invalid }) => {
    for (const { id } of predicates) {
      expect(() => executeMap(getCollectionProgramSource(id), { left: keys([]), right: invalid })).toThrow(CollectionVMError);
      expect(() => executeMap(getCollectionProgramSource(id), { left: invalid, right: keys([]) })).toThrow(CollectionVMError);
    }
    for (const id of ["map.filterByValue", "map.rejectByValue", "map.invertLast"]) {
      expect(() => executeMap(getCollectionProgramSource(id), { map: invalid, value: "" })).toThrow(CollectionVMError);
    }
  });
});
