import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { getCollectionProgramSource } from "../shared/wls-library";
import { CollectionVMError } from "../shared/wls-library-compiler";
import { executeCollectionPackageProgram, resolveCollectionPackage } from "../shared/wls-package";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import * as host from "../shared/wls-map-batch-library";

const pairs = [
  ["map.takeUntilValue", "map.dropUntilValue"],
  ["map.takeLastWhileValue", "map.dropLastWhileValue"],
  ["map.distinctValuesFirst", "map.distinctValuesLast"],
  ["map.filterByValueSet", "map.rejectByValueSet"],
  ["map.remapValues", "map.remapValuesOrDefault"],
  ["map.equalsOrdered", "set.equalsOrdered"],
  ["map.countChangedEntries", "map.countRemovedKeys"],
  ["map.findEntryByValue", "map.findLastEntryByValue"],
  ["map.takeWhileKeyIn", "map.dropWhileKeyIn"],
  ["map.takeLastWhileKeyIn", "map.dropLastWhileKeyIn"],
] as const;
type Id = typeof pairs[number][number];
type Args = { map: MapValue; left: MapValue; right: MapValue; value: string; fallback: string };
const box = (entries: MapValue["entries"]): MapValue => ({ entries });
const args = (map: MapValue, right = map, value = "x"): Args =>
  ({ map, left: map, right, value, fallback: "fallback" });
const file = (name: string) => readFileSync(new URL(`../scripts/fixtures/${name}`, import.meta.url), "utf8");
// Independent public operand table; do not derive expectations from the runtime ABI.
const operands: Record<Id, readonly (keyof Args)[]> = {
  "map.takeUntilValue": ["map", "value"], "map.dropUntilValue": ["map", "value"],
  "map.takeLastWhileValue": ["map", "value"], "map.dropLastWhileValue": ["map", "value"],
  "map.distinctValuesFirst": ["map"], "map.distinctValuesLast": ["map"],
  "map.filterByValueSet": ["map", "right"], "map.rejectByValueSet": ["map", "right"],
  "map.remapValues": ["map", "right"], "map.remapValuesOrDefault": ["map", "right", "fallback"],
  "map.equalsOrdered": ["left", "right"], "set.equalsOrdered": ["left", "right"],
  "map.countChangedEntries": ["left", "right"], "map.countRemovedKeys": ["left", "right"],
  "map.findEntryByValue": ["map", "value"], "map.findLastEntryByValue": ["map", "value"],
  "map.takeWhileKeyIn": ["map", "right"], "map.dropWhileKeyIn": ["map", "right"],
  "map.takeLastWhileKeyIn": ["map", "right"], "map.dropLastWhileKeyIn": ["map", "right"],
};
const bridges: Record<Id, (a: Args) => unknown> = {
  "map.takeUntilValue": a => host.mapTakeUntilValue(a.map, a.value),
  "map.dropUntilValue": a => host.mapDropUntilValue(a.map, a.value),
  "map.takeLastWhileValue": a => host.mapTakeLastWhileValue(a.map, a.value),
  "map.dropLastWhileValue": a => host.mapDropLastWhileValue(a.map, a.value),
  "map.distinctValuesFirst": a => host.mapDistinctValuesFirst(a.map),
  "map.distinctValuesLast": a => host.mapDistinctValuesLast(a.map),
  "map.filterByValueSet": a => host.mapFilterByValueSet(a.map, a.right),
  "map.rejectByValueSet": a => host.mapRejectByValueSet(a.map, a.right),
  "map.remapValues": a => host.mapRemapValues(a.map, a.right),
  "map.remapValuesOrDefault": a => host.mapRemapValuesOrDefault(a.map, a.right, a.fallback),
  "map.equalsOrdered": a => host.mapEqualsOrdered(a.left, a.right),
  "set.equalsOrdered": a => host.setEqualsOrdered(a.left, a.right),
  "map.countChangedEntries": a => host.mapCountChangedEntries(a.left, a.right),
  "map.countRemovedKeys": a => host.mapCountRemovedKeys(a.left, a.right),
  "map.findEntryByValue": a => host.mapFindEntryByValue(a.map, a.value),
  "map.findLastEntryByValue": a => host.mapFindLastEntryByValue(a.map, a.value),
  "map.takeWhileKeyIn": a => host.mapTakeWhileKeyIn(a.map, a.right),
  "map.dropWhileKeyIn": a => host.mapDropWhileKeyIn(a.map, a.right),
  "map.takeLastWhileKeyIn": a => host.mapTakeLastWhileKeyIn(a.map, a.right),
  "map.dropLastWhileKeyIn": a => host.mapDropLastWhileKeyIn(a.map, a.right),
};
const select = (id: Id, a: Args) => Object.fromEntries(operands[id].map(k => [k, a[k]]));
function reference(id: Id, a: Args): unknown {
  const entries = a.map.entries, right = new Map(a.right.entries);
  const stop = entries.findIndex(([, v]) => v === a.value);
  let suffix = entries.length, keySuffix = entries.length;
  while (suffix > 0 && entries[suffix - 1][1] === a.value) suffix--;
  while (keySuffix > 0 && right.has(entries[keySuffix - 1][0])) keySuffix--;
  const keyStop = entries.findIndex(([k]) => !right.has(k));
  const prefix = keyStop < 0 ? entries.length : keyStop;
  switch (id) {
    case "map.takeUntilValue": return box(entries.slice(0, stop < 0 ? entries.length : stop));
    case "map.dropUntilValue": return box(stop < 0 ? [] : entries.slice(stop));
    case "map.takeLastWhileValue": return box(entries.slice(suffix));
    case "map.dropLastWhileValue": return box(entries.slice(0, suffix));
    case "map.distinctValuesFirst": return box(entries.filter(([, v], i) => entries.findIndex(([, w]) => w === v) === i));
    case "map.distinctValuesLast": return box(entries.filter(([, v], i) => entries.map(([, w]) => w).lastIndexOf(v) === i));
    case "map.filterByValueSet": return box(entries.filter(([, v]) => right.has(v)));
    case "map.rejectByValueSet": return box(entries.filter(([, v]) => !right.has(v)));
    case "map.remapValues": return box(entries.map(([k, v]) => [k, right.has(v) ? right.get(v)! : v]));
    case "map.remapValuesOrDefault": return box(entries.map(([k, v]) => [k, right.has(v) ? right.get(v)! : a.fallback]));
    case "map.equalsOrdered": return JSON.stringify(a.left.entries) === JSON.stringify(a.right.entries);
    case "set.equalsOrdered": return JSON.stringify(a.left.entries.map(([k]) => k)) === JSON.stringify(a.right.entries.map(([k]) => k));
    case "map.countChangedEntries": return a.left.entries.filter(([k, v]) => right.has(k) && right.get(k) !== v).length;
    case "map.countRemovedKeys": return a.left.entries.filter(([k]) => !right.has(k)).length;
    case "map.findEntryByValue": return box(entries.filter(([, v]) => v === a.value).slice(0, 1));
    case "map.findLastEntryByValue": return box(entries.filter(([, v]) => v === a.value).slice(-1));
    case "map.takeWhileKeyIn": return box(entries.slice(0, prefix));
    case "map.dropWhileKeyIn": return box(entries.slice(prefix));
    case "map.takeLastWhileKeyIn": return box(entries.slice(keySuffix));
    case "map.dropLastWhileKeyIn": return box(entries.slice(0, keySuffix));
  }
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function check(id: Id, a: Args) {
  freeze(a);
  const before = JSON.stringify(a), expected = reference(id, a);
  const result = executeMap(getCollectionProgramSource(id), select(id, a));
  expect(result.value, id).toEqual(expected);
  expect(bridges[id](a), `${id} host bridge`).toEqual(expected);
  expect(result.trace.at(-1)?.op).toBe("RETURN");
  expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
  if (typeof result.value === "object") {
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.entries)).toBe(true);
    expect(result.value.entries.every(Object.isFrozen)).toBe(true);
    for (const input of [a.map, a.left, a.right]) {
      expect(result.value).not.toBe(input);
      expect(result.value.entries).not.toBe(input.entries);
    }
  }
  expect(JSON.stringify(a)).toBe(before);
}
const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
for (const id of pairs.flat()) {
  it(`${id}: 96 independent reference cases through source and bridge`, () => {
    for (let n = 0; n < 96; n++) {
      const keys = pool.filter((_, i) => (i + n) % 4 !== 0);
      if (n % 2) keys.reverse();
      const map = box(keys.map((k, i) => [k, pool[(i + n) % pool.length]]));
      const right = n % 5 === 0 ? box(map.entries.map(([k, v]) => [k, v])) :
        box(pool.filter((_, i) => (i + n) % 3 !== 0).reverse().map((k, i) => [k, pool[(i + n + 1) % pool.length]]));
      const a = args(map, right, [...pool, "missing"][n % 9]);
      a.fallback = pool[n % pool.length];
      check(id, a);
    }
  });
  it(`${id}: every full-capacity cut, empty/singleton and maximum payloads`, () => {
    const full = box(Array.from({ length: 20 }, (_, i) => [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
    for (const map of [box([]), box([["", ""]]), full]) {
      for (let cut = 0; cut <= map.entries.length; cut++) {
        const variants = [
          box(map.entries.slice(cut).map(([k, v]) => [k, v])),
          box(map.entries.slice(0, cut).map(([, v]) => [v, "🙂".repeat(128)])),
        ];
        for (const right of variants) {
          const a = args(map, right, map.entries[cut]?.[1] ?? "missing");
          a.fallback = "🙂".repeat(128);
          check(id, a);
        }
      }
    }
  });
  it(`${id}: missing/malformed operands rejected even on empty and no-op paths`, () => {
    for (const a of [args(box([])), args(box([["", ""]])), args(box([["x", "x"]]))]) {
      const valid = select(id, a);
      for (const name of operands[id]) {
        const missing = { ...valid }; delete missing[name];
        expect(() => executeMap(getCollectionProgramSource(id), missing)).toThrow(CollectionVMError);
        const invalid = typeof valid[name] === "string"
          ? [undefined, null, false, 1, [], {}, "x".repeat(257), "🙂".repeat(129)]
          : [undefined, null, false, 1, [], {}, { entries: [["a", "x"], ["a", "y"]] },
            { entries: Array(1) }, { entries: [["a", false]] }, { entries: [["a", "x".repeat(257)]] },
            { entries: [["x".repeat(257), ""]] }, { entries: Array.from({ length: 21 }, (_, i) => [String(i), ""]) }];
        for (const value of invalid) expect(() =>
          executeMap(getCollectionProgramSource(id), { ...valid, [name]: value })).toThrow(CollectionVMError);
      }
    }
  });
}
it("all-match, alternating and last-mismatch suffix scans stay within unchanged budgets", () => {
  for (let mask = 0; mask < 4; mask++) {
    const map = box(Array.from({ length: 20 }, (_, i) => [String(i), mask === 0 || (mask === 1 && i % 2 === 0) || (mask === 2 && i < 19) ? "x" : "y"]));
    const right = box(map.entries.filter(([, v]) => v === "x").map(([k]) => [k, ""]));
    for (const id of pairs.flat()) check(id, args(map, right, "x"));
  }
});
it("three maximum-size maps in distinct-last retention and remapping fit the live-register cap", () => {
  const map = box(Array.from({ length: 20 }, (_, i) => [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]));
  const right = box(map.entries.map(([, v]) => [v, "🙂".repeat(128)]));
  // Unary operations receive no second map in their VM input record.
  for (const id of ["map.distinctValuesFirst", "map.distinctValuesLast", "map.remapValues",
    "map.remapValuesOrDefault", "map.filterByValueSet"] as const) check(id, args(map, right));
});
for (let version = 31; version <= 40; version++) {
  it(`0.${version}.0: real locked/ordinary literal cases and source/manifest tamper rejection`, async () => {
    const manifest = file(`wls-map-set-package-v0-${version}.json`);
    const suite = JSON.parse(file(`wls-map-set-v0-${version}-smoke.json`));
    const lock = await createCollectionPackageLock(manifest), text = JSON.stringify(lock);
    expect(Object.keys(resolveCollectionPackage(manifest).dependencies[0]).sort())
      .toEqual(["executionProfile", "name", "version"]);
    expect(suite.cases).toHaveLength(4);
    for (const c of suite.cases) {
      expect(executeCollectionPackageProgram(manifest, c.program, c.inputs).value).toEqual(c.expect.value);
      expect((await executeLockedCollectionPackageProgram(manifest, text, c.program, c.inputs)).value).toEqual(c.expect.value);
    }
    const first = suite.cases[0];
    await expect(executeLockedCollectionPackageProgram(manifest + " ", text, first.program, first.inputs))
      .rejects.toThrow(CollectionVMError);
    for (const id of pairs[version - 31]) {
      const changed = JSON.stringify({ ...lock, programs: lock.programs.map(p => p.id === id ? { ...p, sha256: "0".repeat(64) } : p) });
      expect(changed).not.toBe(text);
      await expect(executeLockedCollectionPackageProgram(manifest, changed, first.program, first.inputs))
        .rejects.toThrow(CollectionVMError);
    }
  });
  it(`0.${version}.0: exact cumulative surface and rejection by all earlier map releases`, () => {
    const manifest = JSON.parse(file("wls-map-set-package-v0-30.json"));
    const expected = [...manifest.programs, ...pairs.slice(0, version - 30).flat()];
    manifest.dependencies["wls.collections"] = `0.${version}.0`;
    manifest.programs = expected;
    expect(resolveCollectionPackage(JSON.stringify(manifest)).programs).toEqual(expected);
    expect(expected).toHaveLength(86 + 2 * (version - 30));
    for (let old = 3; old < version; old++) {
      manifest.dependencies["wls.collections"] = `0.${old}.0`;
      manifest.programs = pairs[version - 31];
      expect(() => resolveCollectionPackage(JSON.stringify(manifest))).toThrow(CollectionVMError);
    }
  });
}
