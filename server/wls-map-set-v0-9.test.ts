import { describe, expect, it } from "vitest";
import { mapTake, mapDrop } from "../shared/wls-map-library";
import { setTake, setDrop } from "../shared/wls-set-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { CollectionVMError } from "../shared/wls-collection-vm";
import { getCollectionProgramSource } from "../shared/wls-library";

const m = (entries: MapValue["entries"]): MapValue => ({ entries });
const operations = [
  { id: "map.take", input: "map", run: mapTake, take: true, set: false },
  { id: "map.drop", input: "map", run: mapDrop, take: false, set: false },
  { id: "set.take", input: "set", run: setTake, take: true, set: true },
  { id: "set.drop", input: "set", run: setDrop, take: false, set: true },
] as const;
describe.each(operations)("0.9.0 native $id", operation => {
  it.each([Number.MIN_SAFE_INTEGER, -21, -1, -0, 0, 1, 2, 3, 19, 20, 21, Number.MAX_SAFE_INTEGER])(
    "clamps safe integer count %s without losing order or Map payloads", count => {
      const input = m([["b", "two"], ["", ""], ["__proto__", "Ψ🙂"]]);
      const clamped = Math.min(input.entries.length, Math.max(0, count));
      const selected = operation.take ? input.entries.slice(0, clamped) : input.entries.slice(clamped);
      const expected = operation.set ? selected.map(([key]) => [key, ""] as const) : selected;
      const before = JSON.stringify(input);
      expect(operation.run(input, count)).toEqual(m(expected));
      expect(JSON.stringify(input)).toBe(before);
      expect(operation.run(m([]), count)).toEqual(m([]));
    },
  );

  it.each([false, true, "1", null, {}, { entries: [] }, 0.5, NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1].map(count => ({ count })))(
    "rejects non-integer counts even on empty input", ({ count }) => {
      for (const input of [m([]), m([["a", "payload"]])]) expect(() =>
        executeMap(getCollectionProgramSource(operation.id), { [operation.input]: input, count })).toThrow(CollectionVMError);
    },
  );

  it.each([true, 0, null, {}, { entries: [["a", false]] }, { entries: Array(2) },
    { entries: [["a", "1"], ["a", "2"]] }, { entries: [["a", "x".repeat(257)]] },
    { entries: Array.from({ length: 21 }, (_, i) => [`k${i}`, ""]) },
  ].map(input => ({ input })))("validates operands even for zero selection", ({ input }) => {
    expect(() => executeMap(getCollectionProgramSource(operation.id), { [operation.input]: input, count: 0 }))
      .toThrow(CollectionVMError);
  });

  it("handles all full-size selection boundaries under unchanged resource caps", () => {
    const input = m(Array.from({ length: 20 }, (_, i) => [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
    for (const count of [-1, 0, 1, 19, 20, 21, Number.MAX_SAFE_INTEGER]) {
      const clamped = Math.min(20, Math.max(0, count));
      const selected = operation.take ? input.entries.slice(0, clamped) : input.entries.slice(clamped);
      const expected = operation.set ? selected.map(([key]) => [key, ""] as const) : selected;
      const result = executeMap(getCollectionProgramSource(operation.id), { [operation.input]: input, count });
      expect(result.value).toEqual(m(expected));
      expect(result.trace.length).toBeLessThan(MAP_LIMITS.cycles);
    }
    expect(MAP_LIMITS.memoryBytes).toBe(65_536);
  });

  it("uses exact Unicode strings, including empty, prototype and non-normalized keys", () => {
    const input = m([["", ""], ["__proto__", "p"], ["é", "one"], ["e\u0301", "two"], ["🙂", "𐐀"]]);
    for (let count = 0; count <= input.entries.length; count++) {
      const selected = operation.take ? input.entries.slice(0, count) : input.entries.slice(count);
      expect(operation.run(input, count)).toEqual(m(operation.set ? selected.map(([key]) => [key, ""]) : selected));
    }
  });

  it("requires count rather than silently choosing a default", () => {
    expect(() => executeMap(getCollectionProgramSource(operation.id), { [operation.input]: m([]) })).toThrow("Undefined");
  });

  it("returns deeply frozen independent snapshots, including full-copy and empty paths", () => {
    const input: { entries: [string, string][] } = { entries: [["a", "payload"], ["b", "two"]] };
    const outputs = [operation.run(input, 0), operation.run(input, 1), operation.run(input, 2)];
    const before = JSON.stringify(outputs);
    for (const output of outputs) {
      expect(output).not.toBe(input);
      expect(Object.isFrozen(output)).toBe(true);
      expect(Object.isFrozen(output.entries)).toBe(true);
      expect(output.entries.every(Object.isFrozen)).toBe(true);
    }
    input.entries[0][1] = "later";
    input.entries.push(["c", "new"]);
    expect(JSON.stringify(outputs)).toBe(before);
  });
});
