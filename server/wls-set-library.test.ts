import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { compileMap, executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { SET_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { getCollectionProgramSource } from "../shared/wls-library";
import { readCollectionProgramSource } from "../shared/wls-library-node";
import {
  setEmpty, setFromMap, setSize, setHas, setAdd, setDelete, setAt,
  setUnion, setIntersection, setDifference, type StringSetValue,
} from "../shared/wls-set-library";

const map = (keys: readonly string[], value = "ignored"): MapValue => ({ entries: keys.map(key => [key, value] as const) });
const canonical = (keys: readonly string[]) => ({ entries: keys.map(key => [key, ""]) });
const members = (set: StringSetValue) => set.entries.map(([key]) => key);
const operations = [
  { id: "set.union", run: setUnion },
  { id: "set.intersection", run: setIntersection },
  { id: "set.difference", run: setDifference },
] as const;

describe("native map-backed string Sets", () => {
  it.each(SET_PROGRAM_IDS)("loads identical canonical and portable source for %s", async id => {
    const source = getCollectionProgramSource(id);
    expect(source).toBe(await readCollectionProgramSource(id));
    expect(source).toBe(readFileSync(new URL(`../shared/wls-library/set/${id.slice(4)}.wls`, import.meta.url), "utf8"));
    expect(source.startsWith("WLS-MAP/1\n")).toBe(true);
    expect(compileMap(source).length).toBeLessThanOrEqual(MAP_LIMITS.instructions);
  });

  it("provides empty, projection, membership, size and ordered lookup operations", () => {
    expect(setEmpty()).toEqual(canonical([]));
    const input = map(["2", "1", "__proto__", "", "constructor", "🌊"]);
    const projected = setFromMap(input);
    expect(projected).toEqual(canonical(["2", "1", "__proto__", "", "constructor", "🌊"]));
    expect(setSize(projected)).toBe(6);
    expect(setHas(input, "__proto__")).toBe(true);
    expect(setHas(input, "missing")).toBe(false);
    expect(setAt(input, 0)).toBe("2");
    expect(setAt(input, 3)).toBe("");
    expect(setFromMap(projected)).not.toBe(projected);
  });

  it("adds and removes members without moving existing keys", () => {
    const input = map(["a", "b"]);
    expect(setAdd(input, "a")).toEqual(canonical(["a", "b"]));
    expect(setAdd(input, "c")).toEqual(canonical(["a", "b", "c"]));
    expect(setDelete(input, "a")).toEqual(canonical(["b"]));
    expect(setDelete(input, "missing")).toEqual(canonical(["a", "b"]));
    expect(setAdd(setDelete(input, "a"), "a")).toEqual(canonical(["b", "a"]));
  });

  it("compares exact UTF-16 strings, including empty and prototype-like keys", () => {
    const input = map(["é", "e\u0301", "A", "", "__proto__", "🙂", "\ud800"]);
    expect(setHas(input, "a")).toBe(false);
    expect(setIntersection(input, map(["e\u0301", "__proto__", "\ud800"])))
      .toEqual(canonical(["e\u0301", "__proto__", "\ud800"]));
    expect(setDifference(input, map(["e\u0301", "__proto__", "\ud800"])))
      .toEqual(canonical(["é", "A", "", "🙂"]));
  });

  it.each(Array.from({ length: 60 }, (_, i) => i))("matches independent ordered Set references for case %i", seed => {
    const left = Array.from({ length: seed % 21 }, (_, i) => `k${i}`);
    const right = Array.from({ length: seed * 7 % 21 }, (_, i) => `k${i + seed % 5}`);
    const reference = [...new Set([...left, ...right])];
    if (reference.length <= 20) expect(setUnion(map(left), map(right, "different"))).toEqual(canonical(reference));
    else expect(() => setUnion(map(left), map(right))).toThrow("entry limit");
    const rightKeys = new Set(right);
    expect(setIntersection(map(left), map(right))).toEqual(canonical(left.filter(key => rightKeys.has(key))));
    expect(setDifference(map(left), map(right))).toEqual(canonical(left.filter(key => !rightKeys.has(key))));
    expect(members(setFromMap(map(left)))).toEqual(left);
  });

  it.each(operations)("handles empty operands and algebraic identities in $id", ({ run, id }) => {
    const input = map(["a", "b"]), empty = map([]);
    expect(run(empty, empty)).toEqual(canonical([]));
    expect(run(input, input)).toEqual(canonical(id === "set.difference" ? [] : ["a", "b"]));
    expect(run(input, empty)).toEqual(canonical(id === "set.intersection" ? [] : ["a", "b"]));
    expect(run(empty, input)).toEqual(canonical(id === "set.union" ? ["a", "b"] : []));
  });

  it.each(operations)("fits maximum-length operands and full outputs within unchanged budgets in $id", ({ id, run }) => {
    const keys = Array.from({ length: 20 }, (_, i) => `L${i}`.padEnd(256, "x"));
    const other = id === "set.difference" ? keys.map(key => `R${key.slice(1)}`) : keys;
    const inputs = { left: map(keys, "l".repeat(256)), right: map(other, "r".repeat(256)) };
    const result = executeMap(getCollectionProgramSource(id), inputs);
    expect(result.value).toEqual(canonical(keys));
    expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
    expect(run(inputs.left, inputs.right)).toEqual(canonical(keys));
  });

  it("allows adding existing members at capacity and fails safely on growth", () => {
    const keys = Array.from({ length: 20 }, (_, i) => `k${i}`), input = map(keys);
    const previous = setAdd(input, "k0");
    const before = JSON.stringify({ input, previous });
    expect(previous).toEqual(canonical(keys));
    expect(() => setAdd(input, "new")).toThrow("entry limit");
    expect(() => setUnion(input, map(["k0", "new"]))).toThrow("entry limit");
    expect(JSON.stringify({ input, previous })).toBe(before);
  });

  it("snapshots inputs and returns deeply frozen, independent canonical results", () => {
    const input: { entries: [string, string][] } = { entries: [["a", "payload"]] };
    const result = setFromMap(input);
    input.entries[0][0] = "changed";
    input.entries.push(["new", "value"]);
    expect(result).toEqual(canonical(["a"]));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.entries)).toBe(true);
    expect(result.entries.every(Object.isFrozen)).toBe(true);
  });

  it.each([
    null, [], { entries: [["a", "1"], ["a", "2"]] }, { entries: [["a", 1]] },
    { entries: [["a"]] }, { entries: Array(1) }, { entries: [["a", "x".repeat(257)]] },
    { entries: [["x".repeat(257), ""]] }, { entries: Array.from({ length: 21 }, (_, i) => [`k${i}`, ""]) },
  ].map(invalid => ({ invalid })))("rejects malformed maps even when the result would be empty", ({ invalid }) => {
    for (const { id } of operations) {
      expect(() => executeMap(getCollectionProgramSource(id), { left: invalid, right: map([]) })).toThrow(CollectionVMError);
      expect(() => executeMap(getCollectionProgramSource(id), { left: map([]), right: invalid })).toThrow(CollectionVMError);
    }
    expect(() => executeMap(getCollectionProgramSource("set.fromMap"), { map: invalid })).toThrow(CollectionVMError);
  });

  it.each([null, true, 3, [], "x".repeat(257)])("rejects invalid query values without empty-set bypasses", value => {
    for (const id of ["set.has", "set.add", "set.delete"]) {
      expect(() => executeMap(getCollectionProgramSource(id), { set: map([]), value })).toThrow(CollectionVMError);
    }
  });

  it.each([-1, 0, 0.5, "0", true])("rejects invalid or missing member positions %s", index => {
    expect(() => executeMap(getCollectionProgramSource("set.at"), { set: map([]), index })).toThrow(CollectionVMError);
  });
});
