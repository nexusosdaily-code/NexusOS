import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapRenameKeyIfAbsent } from "../shared/wls-map-library";
import { setReplaceIfAbsent } from "../shared/wls-set-library";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { resolveCollectionPackage } from "../shared/wls-package";
import { MAP_SET_V0_16_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runCollectionTestSuite } from "../shared/wls-test-runner";

const read = (file: string) => readFileSync(new URL(`../scripts/fixtures/${file}`, import.meta.url), "utf8");
const manifest = read("wls-map-set-package-v0-16.json");
const map = (entries: MapValue["entries"]): MapValue => ({ entries });
const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];

it.each(Array.from({ length: 96 }, (_, n) => n))("matches independent rename reference %i", seed => {
  const input = map(pool.filter((_, i) => (seed + i) % 4 !== 0)
    .map((key, i) => [key, pool[(seed + i) % pool.length]]));
  const key = pool[seed % pool.length], replacement = [...pool, "new"][Math.floor(seed / 8) % 9];
  const occupied = input.entries.some(([k]) => k === replacement);
  const expected = input.entries.map(([k, v]) => [!occupied && k === key ? replacement : k, v]);
  Object.freeze(input.entries);
  input.entries.forEach(Object.freeze);
  Object.freeze(input);
  const original = JSON.stringify(input);
  expect(mapRenameKeyIfAbsent(input, key, replacement).entries).toEqual(expected);
  expect(setReplaceIfAbsent(input, key, replacement).entries).toEqual(expected.map(([k]) => [k, ""]));
  for (const output of [mapRenameKeyIfAbsent(input, key, replacement), setReplaceIfAbsent(input, key, replacement)]) {
    expect(output).not.toBe(input);
    expect(output.entries).not.toBe(input.entries);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.entries)).toBe(true);
    expect(output.entries.every(Object.isFrozen)).toBe(true);
  }
  expect(JSON.stringify(input)).toBe(original);
});

it("handles maximum payloads, first/last positions, absent source, collisions and identical names within existing budgets", () => {
  const input = map(Array.from({ length: 20 }, (_, i) =>
    [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
  for (const key of [input.entries[0][0], input.entries[19][0], "absent"]) {
    for (const replacement of ["r".repeat(256), key, input.entries[10][0]]) {
      const occupied = input.entries.some(([k]) => k === replacement);
      const expected = input.entries.map(([k, v]) => [!occupied && k === key ? replacement : k, v]);
      for (const id of ["map.renameKeyIfAbsent", "set.replaceIfAbsent"]) {
        const inputs = id.startsWith("map.") ? { map: input, key, replacement } : { set: input, value: key, replacement };
        const result = executeMap(getCollectionProgramSource(id), inputs);
        expect(result.value).toEqual(map((id.startsWith("map.") ? expected : expected.map(([k]) => [k, ""])) as [string, string][]));
        expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
        expect(result.trace.at(-1)?.op).toBe("RETURN");
      }
    }
  }
});

for (const id of ["map.renameKeyIfAbsent", "set.replaceIfAbsent"]) {
  const container = id.startsWith("map.") ? "map" : "set";
  const query = id.startsWith("map.") ? "key" : "value";
  for (const entries of [[], [["a", "x"], ["b", "y"]]] as [string, string][][]) {
    it(`${id} validates missing/malformed queries even on empty and collision paths`, () => {
      const valid = { [container]: map(entries), [query]: "a", replacement: "b" };
      for (const operand of [query, "replacement"]) {
        const missing = { ...valid }; delete missing[operand];
        expect(() => executeMap(getCollectionProgramSource(id), missing)).toThrow();
        for (const bad of [null, false, 1, [], {}, "x".repeat(257)]) {
          expect(() => executeMap(getCollectionProgramSource(id), { ...valid, [operand]: bad })).toThrow();
        }
      }
      for (const bad of [undefined, null, false, [], {}, { entries: [["a", "x"], ["a", "y"]] },
        { entries: [["a", false]] }, { entries: Array.from({ length: 21 }, (_, n) => [String(n), ""]) }]) {
        expect(() => executeMap(getCollectionProgramSource(id), { ...valid, [container]: bad })).toThrow();
      }
    });
  }
}

it("runs the real smoke suite, locks declared sources and rejects tampering", async () => {
  const lock = JSON.stringify(await createCollectionPackageLock(manifest));
  const suite = read("wls-map-set-v0-16-smoke.json");
  const report = runCollectionTestSuite(suite);
  expect(report.failed).toBe(0);
  expect(report.passed).toBe(6);
  const cases = JSON.parse(suite).cases;
  for (const c of cases) {
    expect((await executeLockedCollectionPackageProgram(manifest, lock, c.program, c.inputs)).value).toEqual(c.expect.value);
  }
  await expect(executeLockedCollectionPackageProgram(manifest + " ", lock, cases[0].program, cases[0].inputs)).rejects.toThrow();
});

it("exposes the full new surface explicitly, without expanding old releases", () => {
  const consumer = JSON.parse(manifest);
  consumer.programs = [...MAP_SET_V0_16_PROGRAM_IDS];
  expect(resolveCollectionPackage(JSON.stringify(consumer)).programs).toHaveLength(58);
  for (let version = 3; version <= 15; version++) {
    for (const id of ["map.renameKeyIfAbsent", "set.replaceIfAbsent"]) {
      consumer.dependencies["wls.collections"] = `0.${version}.0`;
      consumer.programs = [id];
      expect(() => resolveCollectionPackage(JSON.stringify(consumer))).toThrow(/not available/);
    }
  }
});
