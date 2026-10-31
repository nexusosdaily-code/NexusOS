import { describe, expect, it } from "vitest";
import { CollectionVMError, compileCollection, executeCollection } from "../shared/wls-collection-vm";
import { checkedMapValue, compileMap, executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { mapCopy, mapDelete, mapEmpty, mapGet, mapHas, mapKeyAt, mapSet, mapSize } from "../shared/wls-map-library";

const source = (...lines: string[]) => ["WLS-MAP/1", ...lines].join("\n");
const run = (id: string, inputs: Record<string, unknown>) => executeMap(getCollectionProgramSource(id), inputs).value;
const full = (): MapValue => ({ entries: Array.from({ length: 20 }, (_, i) => [String(i), "v"] as const) });

describe("immutable ordered string maps", () => {
  it("creates, copies, reads, replaces, deletes and reinserts with deterministic order", () => {
    const empty = mapEmpty();
    const a = mapSet(empty, "a", "1"), ab = mapSet(a, "b", "2");
    const replaced = mapSet(ab, "a", "new"), removed = mapDelete(replaced, "a");
    const reinserted = mapSet(removed, "a", "last");
    expect(empty.entries).toEqual([]);
    expect(a.entries).toEqual([["a", "1"]]);
    expect(ab.entries).toEqual([["a", "1"], ["b", "2"]]);
    expect(replaced.entries).toEqual([["a", "new"], ["b", "2"]]);
    expect(reinserted.entries).toEqual([["b", "2"], ["a", "last"]]);
    expect(mapSize(reinserted)).toBe(2);
    expect(mapHas(reinserted, "a")).toBe(true);
    expect(mapKeyAt(reinserted, 0)).toBe("b");
    expect(mapGet(reinserted, "a")).toBe("last");
    expect(mapCopy(reinserted)).toEqual(reinserted);
    expect(mapCopy(reinserted)).not.toBe(reinserted);
    expect(mapDelete(reinserted, "absent")).toEqual(reinserted);
    expect(mapDelete(reinserted, "absent")).not.toBe(reinserted);
  });

  it.each(["", "__proto__", "constructor", "prototype", "toString", "hasOwnProperty",
    "é", "e\u0301", "Ψ🙂", " a ", "A", "\0", "\ud800"])("matches the exact key %j as data", key => {
    const input: MapValue = { entries: [[key, "value"]] };
    expect(mapGet(input, key)).toBe("value");
    expect(mapHas(input, key + "x")).toBe(false);
    expect(mapGet(mapSet(input, key, "changed"), key)).toBe("changed");
    expect(mapDelete(input, key)).toEqual({ entries: [] });
    expect(input.entries).toEqual([[key, "value"]]);
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("does not trim, case-fold, normalize or coerce keys; numeric-looking order is insertion order", () => {
    const keys = ["é", "e\u0301", "a", "A", " a ", "10", "2", ""];
    let input = mapEmpty();
    for (const key of keys) input = mapSet(input, key, key);
    expect(input.entries.map(pair => pair[0])).toEqual(keys);
    for (const key of keys) expect(mapGet(input, key)).toBe(key);
    expect(() => run("map.get", { map: input, key: 2 })).toThrow("string");
  });

  it("explicitly rejects missing reads and invalid indexes, while has is false and delete is a no-op", () => {
    const input = mapEmpty();
    expect(() => mapGet(input, "missing")).toThrow("key is missing");
    expect(mapHas(input, "missing")).toBe(false);
    expect(mapDelete(input, "missing").entries).toEqual([]);
    for (const index of [-1, 0, 0.5, true, "0", Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => run("map.keyAt", { map: input, index })).toThrow(CollectionVMError);
    }
  });

  it("snapshots caller inputs and deeply freezes every successful map result", () => {
    const input = { entries: [["a", "one"]] };
    const first = run("map.copy", { map: input }) as MapValue;
    const second = run("map.copy", { map: input }) as MapValue;
    input.entries[0][1] = "changed"; input.entries.push(["b", "two"]);
    expect(first).toEqual({ entries: [["a", "one"]] });
    expect(second).toEqual(first);
    expect(first).not.toBe(second);
    expect(first.entries).not.toBe(second.entries);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.entries)).toBe(true);
    expect(Object.isFrozen(first.entries[0])).toBe(true);
    expect(() => { (first.entries[0] as string[])[1] = "no"; }).toThrow();
  });

  it("preserves source registers even when destination aliases a key/value/source operand", () => {
    const program = source(
      'MAP_COPY ["saved","map"]', 'MAP_SET ["map","map","key","value"]', 'RETURN ["saved"]',
    );
    const input = { entries: [["a", "old"]] };
    expect(executeMap(program, { map: input, key: "a", value: "new" }).value).toEqual(input);
    expect(executeMap(source('MAP_SET ["key","map","key","value"]', 'RETURN ["key"]'),
      { map: input, key: "a", value: "new" }).value).toEqual({ entries: [["a", "new"]] });
    expect(input).toEqual({ entries: [["a", "old"]] });
  });
});

describe("map validation and finite resource budgets", () => {
  it.each([
    null, [], {}, new Map(), { a: "v" }, { entries: null }, { entries: {} },
    { entries: [["a"]] }, { entries: [["a", "v", "extra"]] },
    { entries: [[1, "v"]] }, { entries: [["a", 1]] }, { entries: [["a", null]] },
    { entries: [["a", {}]] }, { entries: [["a", ["nested"]]] },
    { entries: [["a", "1"], ["a", "2"]] }, { entries: Array(2) },
    { entries: [["a", "v"]], extra: true }, { entries: [[, "v"]] },
    { entries: [["x".repeat(257), "v"]] }, { entries: [["a", "v".repeat(257)]] },
    { entries: Array.from({ length: 21 }, (_, i) => [String(i), "v"]) },
  ].map(value => ({ value })))("rejects malformed map $value", ({ value }) => {
    expect(() => run("map.copy", { map: value })).toThrow(CollectionVMError);
  });

  it("rejects cyclic values, inherited data, accessors, symbols, unsafe numbers and bad input records", () => {
    const cyclic: unknown[] = []; cyclic.push(cyclic);
    const accessor = { get entries(): never { throw Error("Getter must not run"); } };
    for (const value of [{ entries: cyclic }, Object.create({ entries: [] }), accessor,
      { entries: [], [Symbol()]: 1 }, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => checkedMapValue(value)).toThrow(CollectionVMError);
    }
    for (const inputs of [null, [], 1, Object.create({ map: { entries: [] } }),
      { get map(): never { throw Error("Getter must not run"); } }, { [Symbol()]: 1 }]) {
      expect(() => executeMap(getCollectionProgramSource("map.empty"), inputs as any)).toThrow(CollectionVMError);
    }
  });

  it("accepts exact entry/string limits, permits overwrite at capacity, rejects growth atomically", () => {
    const input = full();
    expect(mapSize(input)).toBe(20);
    expect(mapSize(mapSet(input, "0", "new"))).toBe(20);
    expect(() => mapSet(input, "21", "new")).toThrow("entry limit");
    expect(input).toEqual(full());
    const key = "🙂".repeat(128), value = "v".repeat(256);
    expect(mapGet(mapSet(mapEmpty(), key, value), key)).toBe(value);
    expect(() => mapSet(mapEmpty(), key + "x", value)).toThrow();
    expect(() => mapSet(mapEmpty(), key, value + "x")).toThrow();
  });

  it("bounds source, instructions, cycles, registers and logical live memory independently", () => {
    const small = source('CONST ["r",1]', 'RETURN ["r"]');
    expect(compileMap(small.padEnd(8192, " "))).toHaveLength(2);
    expect(() => compileMap(small.padEnd(8193, " "))).toThrow("size limit");
    const instructions = Array(127).fill('CONST ["r",1]');
    expect(compileMap(source(...instructions, 'RETURN ["r"]'))).toHaveLength(128);
    expect(() => compileMap(source(...instructions, 'CONST ["r",1]', 'RETURN ["r"]'))).toThrow("instruction limit");
    expect(() => executeMap(source(":again", 'JUMP ["again"]', 'RETURN ["r"]'), {})).toThrow("cycle limit");
    const registers = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`r${i}`, i]));
    expect(executeMap(source('RETURN ["r0"]'), registers).value).toBe(0);
    expect(() => executeMap(source('CONST ["extra",1]', 'RETURN ["extra"]'), registers)).toThrow("register limit");
    expect(() => executeMap(source('RETURN ["r0"]'), { ...registers, extra: 1 })).toThrow("register limit");
    const large = { entries: Array.from({ length: 20 }, (_, i) =>
      [String(i).padEnd(256, "k"), "v".repeat(256)]) };
    const memory = { a: large, b: large, c: large };
    expect(executeMap(source('RETURN ["a"]'), memory).value).toEqual(large);
    expect(() => executeMap(source('MAP_COPY ["d","a"]', 'RETURN ["d"]'), memory)).toThrow("memory limit");
    expect(() => executeMap(source('RETURN ["a"]'), { ...memory, d: large })).toThrow("memory limit");
    expect(executeMap(source('MAP_COPY ["a","a"]', 'RETURN ["a"]'), memory).value).toEqual(large);
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
  });

  it("accepts exactly 1024 cycles and rejects the next step", () => {
    const loop = (limit: number) => source('CONST ["i",0]', `CONST ["end",${limit}]`,
      ":loop", 'INC ["i"]', 'LT ["more","i","end"]', 'JTRUE ["more","loop"]', 'RETURN ["i"]');
    const exact = executeMap(loop(340) + "\n", {});
    expect(exact.trace.length).toBe(1023);
    const exact1024 = loop(340).replace('RETURN ["i"]', 'CONST ["x",0]\nRETURN ["i"]');
    expect(executeMap(exact1024, {}).trace).toHaveLength(1024);
    expect(() => executeMap(exact1024.replace('RETURN ["i"]', 'CONST ["y",0]\nRETURN ["i"]'), {})).toThrow("cycle limit");
  });

  it.each([
    'WLS-MAP/2\nRETURN ["r"]', source('IMPORT ["fs"]', 'RETURN ["r"]'),
    source('MAP_GET ["r"]', 'RETURN ["r"]'), source('CONST ["r",{}]', 'RETURN ["r"]'),
    source('CONST ["r",1.5]', 'RETURN ["r"]'), source('MAP_NEW ["__proto__"]', 'RETURN ["r"]'),
    source('CONST not-json', 'RETURN ["r"]'), source(":x", ":x", 'RETURN ["r"]'),
    source('JUMP ["missing"]', 'RETURN ["r"]'), source('RETURN ["r"]', ":end", 'JUMP ["end"]'),
    source('MAP_NEW ["r"]'),
  ])("rejects malformed sources without adding host capabilities", program => {
    expect(() => compileMap(program)).toThrow(CollectionVMError);
  });

  it("does not extend either legacy collection execution or permit list opcodes in the map profile", () => {
    const program = getCollectionProgramSource("map.empty");
    expect(() => compileCollection(program)).toThrow("version");
    expect(() => compileCollection(program.replace("WLS-MAP/1", "WLS-COLLECTION/1"))).toThrow("Unknown");
    expect(() => executeCollection('WLS-COLLECTION/1\nRETURN ["m"]', { m: { entries: [] } })).toThrow();
    expect(() => compileMap(source('LIST_NEW ["r"]', 'RETURN ["r"]'))).toThrow("Unknown");
    expect(() => executeMap(source('EQ ["same","a","a"]', 'RETURN ["same"]'), { a: mapEmpty() })).toThrow("scalar");
    expect(() => executeMap(source('JTRUE ["a","end"]', ":end", 'RETURN ["a"]'), { a: "true" })).toThrow("boolean");
    expect(() => executeMap(source('INC ["a"]', 'RETURN ["a"]'), { a: Number.MAX_SAFE_INTEGER })).toThrow("range");
  });
});
