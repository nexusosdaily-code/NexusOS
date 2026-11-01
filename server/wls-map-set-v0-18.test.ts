import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapMoveToEnd } from "../shared/wls-map-library";
import { setMoveToEnd } from "../shared/wls-set-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { CollectionVMError } from "../shared/wls-library-compiler";
import { getCollectionProgramSource } from "../shared/wls-library";
import { resolveCollectionPackage } from "../shared/wls-package";
import { MAP_SET_V0_18_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runCollectionTestSuite } from "../shared/wls-test-runner";

const read = (file: string) => readFileSync(new URL(`../scripts/fixtures/${file}`, import.meta.url), "utf8");
const manifest = read("wls-map-set-package-v0-18.json");
const map = (entries: MapValue["entries"]): MapValue => ({ entries });
const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];

it.each(Array.from({ length: 128 }, (_, n) => n))("matches independent ordered-update reference %i", seed => {
  const keys = pool.filter((_, i) => (seed + i) % 4 !== 0);
  if (seed % 2) keys.reverse();
  const input = map(keys.map((key, i) => [key, pool[(seed + i) % pool.length]]));
  const key = [...pool, "absent"][Math.floor(seed / 2) % 9];
  const selected = input.entries.find(([k]) => k === key);
  const ordered = input.entries.filter(([k]) => k !== key);
  if (selected) ordered.push(selected);
  input.entries.forEach(Object.freeze);
  Object.freeze(input.entries); Object.freeze(input);
  const original = JSON.stringify(input);
  const outputs = [mapMoveToEnd(input, key), setMoveToEnd(input, key)];
  expect(outputs.map(o => o.entries)).toEqual([ordered, ordered.map(([k]) => [k, ""])]);
  for (const output of outputs) {
    expect(output).not.toBe(input);
    expect(output.entries).not.toBe(input.entries);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.entries)).toBe(true);
    expect(output.entries.every(Object.isFrozen)).toBe(true);
    expect(output.entries).toHaveLength(input.entries.length);
  }
  expect(mapMoveToEnd(outputs[0], key)).toEqual(outputs[0]);
  expect(setMoveToEnd(outputs[1], key)).toEqual(outputs[1]);
  expect(JSON.stringify(input)).toBe(original);
});

it("handles every full-capacity position and an absent key with maximum payloads within unchanged budgets", () => {
  const input = map(Array.from({ length: 20 }, (_, i) =>
    [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
  const before = JSON.stringify(input);
  for (const key of [...input.entries.map(([k]) => k), "x".repeat(256)]) {
    const expected = input.entries.filter(([k]) => k !== key);
    const selected = input.entries.find(([k]) => k === key);
    if (selected) expected.push(selected);
    for (const id of ["map.moveToEnd", "set.moveToEnd"]) {
      const inputs = id.startsWith("map.") ? { map: input, key } : { set: input, value: key };
      const result = executeMap(getCollectionProgramSource(id), inputs);
      expect(result.value).toEqual(map(id.startsWith("map.") ? expected : expected.map(([k]) => [k, ""])));
      expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
      expect(result.trace.at(-1)?.op).toBe("RETURN");
    }
  }
  expect(JSON.stringify(input)).toBe(before);
});

it.each([map([]), map([["", "payload"]])])("supports empty and single-entry collections: %j", input => {
  for (const key of ["", "absent"]) {
    expect(mapMoveToEnd(input, key)).toEqual(input);
    expect(setMoveToEnd(input, key)).toEqual(map(input.entries.map(([k]) => [k, ""])));
  }
});

for (const id of ["map.moveToEnd", "set.moveToEnd"]) {
  const container = id.startsWith("map.") ? "map" : "set";
  const query = id.startsWith("map.") ? "key" : "value";
  for (const entries of [[], [["a", "x"], ["b", "y"]]] as [string, string][][]) {
    it(`${id} validates all operands on empty, absent and already-last paths (${entries.length})`, () => {
      for (const key of ["absent", "b"]) {
        const valid = { [container]: map(entries), [query]: key };
        for (const operand of [container, query]) {
          const missing = { ...valid }; delete missing[operand];
          expect(() => executeMap(getCollectionProgramSource(id), missing)).toThrow(CollectionVMError);
        }
        for (const bad of [null, false, 1, [], {}, "x".repeat(257), "🙂".repeat(129)]) {
          expect(() => executeMap(getCollectionProgramSource(id), { ...valid, [query]: bad })).toThrow(CollectionVMError);
        }
        for (const bad of [undefined, null, false, [], {}, { entries: [["a", "x"], ["a", "y"]] },
          { entries: [["a", false]] }, { entries: [["a", "x".repeat(257)]] },
          { entries: [["x".repeat(257), "a"]] },
          { entries: Array.from({ length: 21 }, (_, n) => [String(n), ""]) }]) {
          expect(() => executeMap(getCollectionProgramSource(id), { ...valid, [container]: bad })).toThrow(CollectionVMError);
        }
      }
    });
  }
}

it("counts UTF-16 units rather than Unicode code points for maximum accepted keys", () => {
  const key = "🙂".repeat(128), input = map([[key, ""], ["a", "b"]]);
  expect(mapMoveToEnd(input, key)).toEqual(map([["a", "b"], [key, ""]]));
  expect(setMoveToEnd(input, key)).toEqual(map([["a", ""], [key, ""]]));
});

it("runs literal expectations through normal and locked execution and rejects tampered commitments", async () => {
  const locked = await createCollectionPackageLock(manifest), lock = JSON.stringify(locked);
  const suite = read("wls-map-set-v0-18-smoke.json");
  expect(runCollectionTestSuite(suite)).toMatchObject({ failed: 0, passed: 6 });
  const cases = JSON.parse(suite).cases;
  for (const c of cases) {
    expect((await executeLockedCollectionPackageProgram(manifest, lock, c.program, c.inputs)).value).toEqual(c.expect.value);
  }
  await expect(executeLockedCollectionPackageProgram(manifest + " ", lock, cases[0].program, cases[0].inputs)).rejects.toThrow(CollectionVMError);
  for (const id of ["map.moveToEnd", "set.moveToEnd"]) {
    const tampered = JSON.stringify({ ...locked,
      programs: locked.programs.map(p => p.id === id ? { ...p, sha256: "0".repeat(64) } : p) });
    expect(tampered).not.toBe(lock);
    await expect(executeLockedCollectionPackageProgram(manifest, tampered, cases[0].program, cases[0].inputs)).rejects.toThrow(CollectionVMError);
  }
});

it("declares the complete 62-operation surface and rejects new APIs in all previous Map/Set versions", () => {
  const consumer = JSON.parse(manifest);
  expect(resolveCollectionPackage(manifest).programs).toEqual([...MAP_SET_V0_18_PROGRAM_IDS]);
  expect(resolveCollectionPackage(manifest).programs).toHaveLength(62);
  for (let version = 3; version <= 17; version++) {
    for (const id of ["map.moveToEnd", "set.moveToEnd"]) {
      consumer.dependencies["wls.collections"] = `0.${version}.0`;
      consumer.programs = [id];
      expect(() => resolveCollectionPackage(JSON.stringify(consumer))).toThrow(/not available/);
    }
  }
});
