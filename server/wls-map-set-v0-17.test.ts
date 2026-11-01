import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapSwapValues } from "../shared/wls-map-library";
import { setToggle } from "../shared/wls-set-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { resolveCollectionPackage } from "../shared/wls-package";
import { MAP_SET_V0_17_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runCollectionTestSuite } from "../shared/wls-test-runner";

const read = (file: string) => readFileSync(new URL(`../scripts/fixtures/${file}`, import.meta.url), "utf8");
const manifest = read("wls-map-set-package-v0-17.json");
const map = (entries: MapValue["entries"]): MapValue => ({ entries });
const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];

it.each(Array.from({ length: 96 }, (_, n) => n))("matches independent swap/toggle reference %i", seed => {
  const input = map(pool.filter((_, i) => (seed + i) % 4 !== 0)
    .map((key, i) => [key, pool[(seed + i) % pool.length]]));
  const first = pool[seed % pool.length], second = pool[Math.floor(seed / 8) % 8];
  const a = input.entries.find(([k]) => k === first), b = input.entries.find(([k]) => k === second);
  const swap = input.entries.map(([k, v]) => [k, a && b ? k === first ? b[1] : k === second ? a[1] : v : v]);
  const toggle = input.entries.filter(([k]) => k !== first).map(([k]) => [k, ""]);
  if (!a) toggle.push([first, ""]);
  input.entries.forEach(Object.freeze);
  Object.freeze(input.entries); Object.freeze(input);
  const original = JSON.stringify(input);
  const outputs = [mapSwapValues(input, first, second), setToggle(input, first)];
  expect(outputs.map(o => o.entries)).toEqual([swap, toggle]);
  for (const output of outputs) {
    expect(output).not.toBe(input);
    expect(output.entries).not.toBe(input.entries);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.entries)).toBe(true);
    expect(output.entries.every(Object.isFrozen)).toBe(true);
  }
  expect(JSON.stringify(input)).toBe(original);
});

it("handles full-size payloads, missing/same keys, removals and overflow within unchanged bounds", () => {
  const input = map(Array.from({ length: 20 }, (_, i) =>
    [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
  const before = JSON.stringify(input);
  for (const [first, second] of [
    [input.entries[0][0], input.entries[19][0]],
    [input.entries[0][0], input.entries[0][0]],
    ["missing", input.entries[19][0]],
    [input.entries[19][0], "missing"],
  ]) {
    const result = executeMap(getCollectionProgramSource("map.swapValues"), { map: input, first, second });
    const a = input.entries.find(([k]) => k === first), b = input.entries.find(([k]) => k === second);
    expect(result.value).toEqual(map(input.entries.map(([k, v]) =>
      [k, a && b ? k === first ? b[1] : k === second ? a[1] : v : v])));
    expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
    expect(result.trace.at(-1)?.op).toBe("RETURN");
  }
  for (const value of [input.entries[0][0], input.entries[19][0]]) {
    const result = executeMap(getCollectionProgramSource("set.toggle"), { set: input, value });
    expect(result.value).toEqual(map(input.entries.filter(([k]) => k !== value).map(([k]) => [k, ""])));
    expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
    expect(result.trace.at(-1)?.op).toBe("RETURN");
  }
  expect(() => setToggle(input, "new")).toThrow();
  expect(JSON.stringify(input)).toBe(before);
  const nineteen = map(input.entries.slice(0, 19));
  expect(setToggle(nineteen, "x".repeat(256)).entries).toEqual([
    ...nineteen.entries.map(([k]) => [k, ""]), ["x".repeat(256), ""],
  ]);
});

for (const id of ["map.swapValues", "set.toggle"]) {
  const container = id.startsWith("map.") ? "map" : "set";
  const operands = id.startsWith("map.") ? ["first", "second"] : ["value"];
  for (const entries of [[], [["a", "x"], ["b", "y"]]] as [string, string][][]) {
    it(`${id} validates every operand even on empty and no-op paths (${entries.length})`, () => {
      const valid = { [container]: map(entries), ...Object.fromEntries(operands.map(name => [name, "absent"])) };
      for (const operand of operands) {
        const missing = { ...valid }; delete missing[operand];
        expect(() => executeMap(getCollectionProgramSource(id), missing)).toThrow();
        for (const bad of [null, false, 1, [], {}, "x".repeat(257)]) {
          expect(() => executeMap(getCollectionProgramSource(id), { ...valid, [operand]: bad })).toThrow();
        }
      }
      for (const bad of [undefined, null, false, [], {}, { entries: [["a", "x"], ["a", "y"]] },
        { entries: [["a", false]] }, { entries: [["a", "x".repeat(257)]] },
        { entries: Array.from({ length: 21 }, (_, n) => [String(n), ""]) }]) {
        expect(() => executeMap(getCollectionProgramSource(id), { ...valid, [container]: bad })).toThrow();
      }
    });
  }
}

it("runs literal smoke expectations through normal and locked packages and rejects changed manifests/sources", async () => {
  const locked = await createCollectionPackageLock(manifest);
  const lock = JSON.stringify(locked);
  const suite = read("wls-map-set-v0-17-smoke.json");
  expect(runCollectionTestSuite(suite)).toMatchObject({ failed: 0, passed: 6 });
  const cases = JSON.parse(suite).cases;
  for (const c of cases) {
    expect((await executeLockedCollectionPackageProgram(manifest, lock, c.program, c.inputs)).value).toEqual(c.expect.value);
  }
  await expect(executeLockedCollectionPackageProgram(manifest + " ", lock, cases[0].program, cases[0].inputs)).rejects.toThrow();
  const tampered = JSON.stringify({
    ...locked,
    programs: locked.programs.map(p => p.id === "map.swapValues" ? { ...p, sha256: "0".repeat(64) } : p),
  });
  expect(tampered).not.toBe(lock);
  await expect(executeLockedCollectionPackageProgram(manifest, tampered, cases[0].program, cases[0].inputs)).rejects.toThrow();
});

it("declares the complete 60-operation surface and keeps all previous versions closed to new APIs", () => {
  const consumer = JSON.parse(manifest);
  expect(resolveCollectionPackage(manifest).programs).toEqual([...MAP_SET_V0_17_PROGRAM_IDS]);
  expect(resolveCollectionPackage(manifest).programs).toHaveLength(60);
  for (let version = 3; version <= 16; version++) {
    for (const id of ["map.swapValues", "set.toggle"]) {
      consumer.dependencies["wls.collections"] = `0.${version}.0`;
      consumer.programs = [id];
      expect(() => resolveCollectionPackage(JSON.stringify(consumer))).toThrow(/not available/);
    }
  }
});
