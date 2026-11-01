import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { executeMap, MAP_LIMITS, type MapValue } from "../shared/wls-map-vm";
import { CollectionVMError } from "../shared/wls-library-compiler";
import { getCollectionProgramSource } from "../shared/wls-library";
import { resolveCollectionPackage, executeCollectionPackageProgram } from "../shared/wls-package";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";
import { runCollectionTestSuite } from "../shared/wls-test-runner";
import * as maps from "../shared/wls-map-library";
import * as sets from "../shared/wls-set-library";

type Args = { map: MapValue; set: MapValue; left: MapValue; right: MapValue;
  key: string; value: string; count: number; expected: string; replacement: string };
const box = (entries: MapValue["entries"]): MapValue => ({ entries });
const read = (file: string) => readFileSync(new URL(`../scripts/fixtures/${file}`, import.meta.url), "utf8");
export const pairs = [
  ["map.moveToFront", "set.moveToFront"],
  ["map.takeWhileValue", "map.dropWhileValue"],
  ["map.takeLast", "set.takeLast"], ["map.dropLast", "set.dropLast"],
  ["map.indexOfValue", "map.lastIndexOfValue"],
  ["map.countCommonKeys", "map.countMatchingEntries"],
  ["map.countDistinctValues", "map.hasDuplicateValues"],
  ["map.deleteFirstValue", "map.deleteLastValue"],
  ["set.intersectionSize", "set.unionSize"],
  ["set.differenceSize", "set.symmetricDifferenceSize"],
  ["map.mergeIfAbsent", "map.mergeExisting"],
  ["map.replaceEntryIfValue", "map.deleteEntryIfValue"],
] as const;
const ids = pairs.flat();
const hosts: Record<typeof ids[number], (a: Args) => unknown> = {
  "map.moveToFront": a => maps.mapMoveToFront(a.map, a.key),
  "set.moveToFront": a => sets.setMoveToFront(a.set, a.value),
  "map.takeWhileValue": a => maps.mapTakeWhileValue(a.map, a.value),
  "map.dropWhileValue": a => maps.mapDropWhileValue(a.map, a.value),
  "map.takeLast": a => maps.mapTakeLast(a.map, a.count),
  "set.takeLast": a => sets.setTakeLast(a.set, a.count),
  "map.dropLast": a => maps.mapDropLast(a.map, a.count),
  "set.dropLast": a => sets.setDropLast(a.set, a.count),
  "map.indexOfValue": a => maps.mapIndexOfValue(a.map, a.value),
  "map.lastIndexOfValue": a => maps.mapLastIndexOfValue(a.map, a.value),
  "map.countCommonKeys": a => maps.mapCountCommonKeys(a.left, a.right),
  "map.countMatchingEntries": a => maps.mapCountMatchingEntries(a.left, a.right),
  "map.countDistinctValues": a => maps.mapCountDistinctValues(a.map),
  "map.hasDuplicateValues": a => maps.mapHasDuplicateValues(a.map),
  "map.deleteFirstValue": a => maps.mapDeleteFirstValue(a.map, a.value),
  "map.deleteLastValue": a => maps.mapDeleteLastValue(a.map, a.value),
  "set.intersectionSize": a => sets.setIntersectionSize(a.left, a.right),
  "set.unionSize": a => sets.setUnionSize(a.left, a.right),
  "set.differenceSize": a => sets.setDifferenceSize(a.left, a.right),
  "set.symmetricDifferenceSize": a => sets.setSymmetricDifferenceSize(a.left, a.right),
  "map.mergeIfAbsent": a => maps.mapMergeIfAbsent(a.left, a.right),
  "map.mergeExisting": a => maps.mapMergeExisting(a.left, a.right),
  "map.replaceEntryIfValue": a => maps.mapReplaceEntryIfValue(a.map, a.key, a.expected, a.replacement),
  "map.deleteEntryIfValue": a => maps.mapDeleteEntryIfValue(a.map, a.key, a.expected),
};
// Independent contract table, not imported from the VM's required-operand ABI.
const operands: Record<typeof ids[number], readonly (keyof Args)[]> = {
  "map.moveToFront": ["map", "key"], "set.moveToFront": ["set", "value"],
  "map.takeWhileValue": ["map", "value"], "map.dropWhileValue": ["map", "value"],
  "map.takeLast": ["map", "count"], "set.takeLast": ["set", "count"],
  "map.dropLast": ["map", "count"], "set.dropLast": ["set", "count"],
  "map.indexOfValue": ["map", "value"], "map.lastIndexOfValue": ["map", "value"],
  "map.countCommonKeys": ["left", "right"], "map.countMatchingEntries": ["left", "right"],
  "map.countDistinctValues": ["map"], "map.hasDuplicateValues": ["map"],
  "map.deleteFirstValue": ["map", "value"], "map.deleteLastValue": ["map", "value"],
  "set.intersectionSize": ["left", "right"], "set.unionSize": ["left", "right"],
  "set.differenceSize": ["left", "right"], "set.symmetricDifferenceSize": ["left", "right"],
  "map.mergeIfAbsent": ["left", "right"], "map.mergeExisting": ["left", "right"],
  "map.replaceEntryIfValue": ["map", "key", "expected", "replacement"],
  "map.deleteEntryIfValue": ["map", "key", "expected"],
};
const args = (input: MapValue, right = input, query = "x", count = 1): Args =>
  ({ map: input, set: input, left: input, right, key: query, value: query, count, expected: query, replacement: "replacement" });
const select = (id: typeof ids[number], a: Args) =>
  Object.fromEntries(operands[id].map(k => [k, a[k]]));
function reference(id: typeof ids[number], a: Args): unknown {
  const entries = a.map.entries, left = a.left.entries, right = a.right.entries;
  const count = Math.min(entries.length, Math.max(0, a.count));
  const prefix = entries.findIndex(([, v]) => v !== a.value);
  const cut = prefix < 0 ? entries.length : prefix;
  const first = entries.findIndex(([, v]) => v === a.value);
  const last = entries.map(([, v]) => v).lastIndexOf(a.value);
  const common = left.filter(([k]) => right.some(([r]) => r === k)).length;
  switch (id) {
    case "map.moveToFront": return box([...entries.filter(([k]) => k === a.key), ...entries.filter(([k]) => k !== a.key)]);
    case "set.moveToFront": return box([...entries.filter(([k]) => k === a.value), ...entries.filter(([k]) => k !== a.value)].map(([k]) => [k, ""]));
    case "map.takeWhileValue": return box(entries.slice(0, cut));
    case "map.dropWhileValue": return box(entries.slice(cut));
    case "map.takeLast": return box(entries.slice(entries.length - count));
    case "set.takeLast": return box(entries.slice(entries.length - count).map(([k]) => [k, ""]));
    case "map.dropLast": return box(entries.slice(0, entries.length - count));
    case "set.dropLast": return box(entries.slice(0, entries.length - count).map(([k]) => [k, ""]));
    case "map.indexOfValue": return first;
    case "map.lastIndexOfValue": return last;
    case "map.countCommonKeys": case "set.intersectionSize": return common;
    case "map.countMatchingEntries": return left.filter(([k, v]) => right.some(([r, w]) => k === r && v === w)).length;
    case "map.countDistinctValues": return new Set(entries.map(([, v]) => v)).size;
    case "map.hasDuplicateValues": return new Set(entries.map(([, v]) => v)).size < entries.length;
    case "map.deleteFirstValue": return box(entries.filter((_, i) => i !== first));
    case "map.deleteLastValue": return box(entries.filter((_, i) => i !== last));
    case "set.unionSize": return new Set([...left, ...right].map(([k]) => k)).size;
    case "set.differenceSize": return left.length - common;
    case "set.symmetricDifferenceSize": return left.length + right.length - 2 * common;
    case "map.mergeIfAbsent": return box([...left, ...right.filter(([k]) => !left.some(([l]) => l === k))]);
    case "map.mergeExisting": return box(left.map(([k, v]) => [k, right.find(([r]) => k === r)?.[1] ?? v]));
    case "map.replaceEntryIfValue": return box(entries.map(([k, v]) => [k, k === a.key && v === a.expected ? a.replacement : v]));
    case "map.deleteEntryIfValue": return box(entries.filter(([k, v]) => k !== a.key || v !== a.expected));
  }
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function check(id: typeof ids[number], a: Args) {
  const before = JSON.stringify(a), expected = reference(id, a);
  const result = executeMap(getCollectionProgramSource(id), select(id, a));
  expect(result.value, id).toEqual(expected);
  expect(hosts[id](a), `${id} bridge`).toEqual(expected);
  expect(result.trace.at(-1)?.op).toBe("RETURN");
  expect(result.trace.length).toBeLessThanOrEqual(MAP_LIMITS.cycles);
  if (typeof result.value === "object") {
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.entries)).toBe(true);
    expect(result.value.entries.every(Object.isFrozen)).toBe(true);
    expect(result.value).not.toBe(a.map);
    expect(result.value).not.toBe(a.left);
    expect(result.value).not.toBe(a.right);
    expect(result.value.entries).not.toBe(a.map.entries);
  }
  expect(JSON.stringify(a)).toBe(before);
}
const pool = ["", "__proto__", "constructor", "0", "Ψ", "🙂", "é", "e\u0301"];
for (const id of ids) {
  it(`${id}: 96 independent Unicode/order/value reference cases through source and bridge`, () => {
    for (let n = 0; n < 96; n++) {
      const keys = pool.filter((_, i) => (n + i) % 4 !== 0);
      if (n % 2) keys.reverse();
      const input = box(keys.map((k, i) => [k, pool[(n + i) % 5]]));
      const right = box(pool.filter((_, i) => (n + i) % 3 !== 0).reverse().map((k, i) => [k, pool[(n + i) % 5]]));
      const a = args(input, right, [...pool, "absent"][n % 9],
        [-Number.MAX_SAFE_INTEGER, -1, 0, 1, 3, 20, 21, Number.MAX_SAFE_INTEGER][n % 8]);
      a.expected = n % 2 ? a.value : "absent";
      check(id, freeze(a));
    }
  });
  it(`${id}: empty and singleton paths and every full-capacity index at maximum text sizes`, () => {
    for (const input of [box([]), box([["", ""]]),
      box(Array.from({ length: 20 }, (_, i) => [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]))]) {
      for (let index = 0; index <= input.entries.length; index++) {
        const query = input.entries[index]?.[0] ?? "missing";
        const a = args(input, box([...input.entries].reverse()), query, index);
        a.value = input.entries[index]?.[1] ?? "missing";
        a.expected = a.value;
        a.replacement = "🙂".repeat(128);
        check(id, freeze(a));
      }
    }
  });
  it(`${id}: required operands fail explicitly on empty/no-op branches`, () => {
    for (const a of [args(box([])), args(box([["", ""]])), args(box([["x", "x"]]))]) {
      const valid = select(id, a);
      for (const name of operands[id]) {
        const missing = { ...valid }; delete missing[name];
        expect(() => executeMap(getCollectionProgramSource(id), missing)).toThrow(CollectionVMError);
        const value = valid[name];
        const invalid = typeof value === "number"
          ? [null, false, "1", [], {}, 1.1, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]
          : typeof value === "string"
            ? [null, false, 1, [], {}, "x".repeat(257), "🙂".repeat(129)]
            : [null, false, 1, [], {}, { entries: [["a", "x"], ["a", "y"]] }, { entries: new Array(1) },
              { entries: [["a", false]] }, { entries: [["a", "x".repeat(257)]] },
              { entries: [["x".repeat(257), ""]] }, { entries: Array.from({ length: 21 }, (_, n) => [String(n), ""]) }];
        for (const bad of invalid) expect(() =>
          executeMap(getCollectionProgramSource(id), { ...valid, [name]: bad })).toThrow(CollectionVMError);
      }
    }
  });
}

it("all-match last-position search and two-pass deletion stay below the original cycle budget", () => {
  const input = box(Array.from({ length: 20 }, (_, i) => [String(i), "x"]));
  for (const id of ["map.lastIndexOfValue", "map.deleteLastValue", "map.takeWhileValue", "map.dropWhileValue"] as const) {
    check(id, freeze(args(input, input, "x")));
  }
});
it("set scalar sizes support a 40-member union without constructing an over-limit collection", () => {
  const left = box(Array.from({ length: 20 }, (_, i) => [`a${i}`.padEnd(256, "a"), "x".repeat(256)]));
  const right = box(Array.from({ length: 20 }, (_, i) => [`b${i}`.padEnd(256, "b"), "y".repeat(256)]));
  const a = freeze(args(left, right));
  for (const id of ["set.intersectionSize", "set.unionSize", "set.differenceSize", "set.symmetricDifferenceSize",
    "map.countCommonKeys", "map.countMatchingEntries", "map.mergeExisting"] as const) check(id, a);
  expect(sets.setUnionSize(left, right)).toBe(40);
  expect(sets.setSymmetricDifferenceSize(left, right)).toBe(40);
  const before = JSON.stringify(a);
  expect(() => maps.mapMergeIfAbsent(left, right)).toThrow(/Map entry limit exceeded/);
  expect(JSON.stringify(a)).toBe(before);
});
it("overlap merging permits a full result with maximally long changed values", () => {
  const left = box(Array.from({ length: 20 }, (_, i) => [`k${i}`.padEnd(256, "k"), "x".repeat(256)]));
  const right = box([...left.entries].reverse().map(([k]) => [k, "y".repeat(256)]));
  check("map.mergeExisting", freeze(args(left, right)));
  check("map.mergeIfAbsent", freeze(args(left, right)));
});

for (let version = 19; version <= 30; version++) {
  it(`0.${version}.0: real ordinary/locked fixture outputs and tamper rejection`, async () => {
    const manifest = read(`wls-map-set-package-v0-${version}.json`);
    const suite = read(`wls-map-set-v0-${version}-smoke.json`);
    const lock = await createCollectionPackageLock(manifest), text = JSON.stringify(lock);
    expect(Object.keys(resolveCollectionPackage(manifest).dependencies[0]).sort())
      .toEqual(["executionProfile", "name", "version"]);
    expect(runCollectionTestSuite(suite)).toMatchObject({ failed: 0, passed: 4 });
    for (const c of JSON.parse(suite).cases) {
      expect(executeCollectionPackageProgram(manifest, c.program, c.inputs).value).toEqual(c.expect.value);
      expect((await executeLockedCollectionPackageProgram(manifest, text, c.program, c.inputs)).value).toEqual(c.expect.value);
    }
    await expect(executeLockedCollectionPackageProgram(manifest + " ", text,
      pairs[version - 19][0], JSON.parse(suite).cases[0].inputs)).rejects.toThrow(CollectionVMError);
    for (const id of pairs[version - 19]) {
      const changed = JSON.stringify({ ...lock, programs: lock.programs.map(p => p.id === id ? { ...p, sha256: "0".repeat(64) } : p) });
      expect(changed).not.toBe(text);
      await expect(executeLockedCollectionPackageProgram(manifest, changed,
        pairs[version - 19][0], JSON.parse(suite).cases[0].inputs)).rejects.toThrow(CollectionVMError);
    }
  });
  it(`0.${version}.0: fixed cumulative surface; prior releases refuse future operations`, () => {
    const baseline = JSON.parse(read("wls-map-set-package-v0-18.json"));
    const expected = [...baseline.programs, ...pairs.slice(0, version - 18).flat()];
    baseline.dependencies["wls.collections"] = `0.${version}.0`;
    baseline.programs = expected;
    expect(resolveCollectionPackage(JSON.stringify(baseline)).programs).toEqual(expected);
    expect(expected).toHaveLength(62 + (version - 18) * 2);
    for (let older = 3; older < version; older++) {
      for (const program of pairs[version - 19]) {
        baseline.dependencies["wls.collections"] = `0.${older}.0`;
        baseline.programs = [program];
        expect(() => resolveCollectionPackage(JSON.stringify(baseline))).toThrow(/not available/);
      }
    }
  });
}
