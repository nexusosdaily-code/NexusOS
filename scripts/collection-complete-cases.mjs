import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

// Independent surface, matching the complete-consumer audit: not the live
// catalogue, and never VM output reused as an expected result.
export const additions = [
  "map.takeUntilValue", "map.dropUntilValue", "map.takeLastWhileValue", "map.dropLastWhileValue",
  "map.distinctValuesFirst", "map.distinctValuesLast", "map.filterByValueSet", "map.rejectByValueSet",
  "map.remapValues", "map.remapValuesOrDefault", "map.equalsOrdered", "set.equalsOrdered",
  "map.countChangedEntries", "map.countRemovedKeys", "map.findEntryByValue", "map.findLastEntryByValue",
  "map.takeWhileKeyIn", "map.dropWhileKeyIn", "map.takeLastWhileKeyIn", "map.dropLastWhileKeyIn",
];
const root = new URL("./fixtures/", import.meta.url);
const read = name => readFile(new URL(name, root), "utf8");
export const programs = [
  ...JSON.parse(await read("wls-map-set-package-v0-30.json")).programs, ...additions,
];
assert.equal(programs.length, 106);
assert.equal(new Set(programs).size, 106);
export const sources = new Map(await Promise.all(programs.map(async id => [
  id, await readFile(`shared/wls-library/${id.replace(".", "/")}.wls`, "utf8"),
])));
const fixtures = (await Promise.all((await readdir(root)).filter(n => /^wls-.*-smoke\.json$/.test(n)).sort()
  .map(async file => JSON.parse(await read(file)).cases.map(c => ({ ...c, fixture: file }))))).flat();
export const manifest = JSON.stringify({
  profile: "WLS-PACKAGE/1", name: "audit.complete-map-set", version: "1.0.0",
  executionProfile: "WLS-MAP/1", dependencies: { "wls.collections": "0.40.0" }, programs,
});
const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
// Trusted expectation comes from Node's independent SHA-256 over disk bytes.
// The worker verifies this lock; it must not silently create its own replacement.
export const lockText = JSON.stringify({
  profile: "WLS-LOCK/1", manifestSha256: sha256(manifest),
  package: { name: "audit.complete-map-set", version: "1.0.0", executionProfile: "WLS-MAP/1" },
  dependencies: [{ name: "wls.collections", version: "0.40.0", executionProfile: "WLS-MAP/1" }],
  programs: programs.map(id => ({ id, sha256: sha256(sources.get(id)) })),
});

const E = Array.from({ length: 20 }, (_, i) => [`k${i}`.padEnd(256, "k"), "v".repeat(256)]);
const K = E[0][0], LAST = E[19][0], V = E[0][1], R = "r".repeat(256), F = "f".repeat(256);
const M = entries => ({ entries });
const S = E.map(([key]) => [key, ""]);
const empty = M([]);
// Literal boundary oracle for a 20-entry collection with 256-code-unit keys
// and payloads. Small slices are fixed expected positions, not API algorithms.
// Columns: maximum input result, empty-container result.
const boundaries = {
  "map.empty": [empty, empty], "map.copy": [M(E), empty], "map.size": [20, 0],
  "map.has": [true, false], "map.get": [V, { error: true }],
  "map.set": [M(E), M([[K, V]])], "map.delete": [M(E.slice(1)), empty],
  "map.keyAt": [LAST, { error: true }], "map.merge": [M(E), empty],
  "map.intersection": [M(E), empty], "map.difference": [empty, empty],
  "set.empty": [empty, empty], "set.fromMap": [M(S), empty], "set.size": [20, 0],
  "set.has": [true, false], "set.add": [M(S), M([[K, ""]])],
  "set.delete": [M(S.slice(1)), empty], "set.at": [LAST, { error: true }],
  "set.union": [M(S), empty], "set.intersection": [M(S), empty], "set.difference": [empty, empty],
  "map.filterByValue": [M(E), empty], "map.rejectByValue": [empty, empty],
  "map.invertLast": [M([[V, LAST]]), empty],
  "set.isSubset": [true, true], "set.isDisjoint": [false, true], "set.equals": [true, true],
  "map.equals": [true, true], "map.isSubmap": [true, true],
  "map.intersectionEntries": [M(E), empty], "map.differenceEntries": [empty, empty],
  "set.symmetricDifference": [empty, empty], "map.getOrDefault": [V, F],
  "map.setIfAbsent": [M(E), M([[K, V]])], "map.replaceIfPresent": [M(E), empty],
  "map.take": [M(E), empty], "map.drop": [empty, empty],
  "set.take": [M(S), empty], "set.drop": [empty, empty],
  "map.hasValue": [true, false], "map.countValue": [20, 0],
  "map.findKeyByValueOrDefault": [K, F], "map.replaceValue": [M(E.map(([key]) => [key, R])), empty],
  "map.invertFirst": [M([[V, K]]), empty], "set.fromValues": [M([[V, ""]]), empty],
  "map.findLastKeyByValueOrDefault": [LAST, F],
  "map.replaceFirstValue": [M([[K, R], ...E.slice(1)]), empty],
  "map.replaceLastValue": [M([...E.slice(0, 19), [LAST, R]]), empty],
  "map.valueAt": [V, { error: true }], "map.keyAtOrDefault": [LAST, F],
  "map.valueAtOrDefault": [V, F], "map.indexOfKey": [0, -1], "set.indexOf": [0, -1],
  "set.atOrDefault": [LAST, F], "map.slice": [M(E), empty], "set.slice": [M(S), empty],
  "map.renameKeyIfAbsent": [M([[R, V], ...E.slice(1)]), empty],
  "set.replaceIfAbsent": [M([[R, ""], ...S.slice(1)]), empty],
  "map.swapValues": [M(E), empty], "set.toggle": [M(S.slice(1)), M([[K, ""]])],
  "map.moveToEnd": [M([...E.slice(1), E[0]]), empty],
  "set.moveToEnd": [M([...S.slice(1), S[0]]), empty],
  "map.moveToFront": [M(E), empty], "set.moveToFront": [M(S), empty],
  "map.takeWhileValue": [M(E), empty], "map.dropWhileValue": [empty, empty],
  "map.takeLast": [M(E), empty], "set.takeLast": [M(S), empty],
  "map.dropLast": [empty, empty], "set.dropLast": [empty, empty],
  "map.indexOfValue": [0, -1], "map.lastIndexOfValue": [19, -1],
  "map.countCommonKeys": [20, 0], "map.countMatchingEntries": [20, 0],
  "map.countDistinctValues": [1, 0], "map.hasDuplicateValues": [true, false],
  "map.deleteFirstValue": [M(E.slice(1)), empty], "map.deleteLastValue": [M(E.slice(0, 19)), empty],
  "set.intersectionSize": [20, 0], "set.unionSize": [20, 0],
  "set.differenceSize": [0, 0], "set.symmetricDifferenceSize": [0, 0],
  "map.mergeIfAbsent": [M(E), empty], "map.mergeExisting": [M(E), empty],
  "map.replaceEntryIfValue": [M([[K, R], ...E.slice(1)]), empty],
  "map.deleteEntryIfValue": [M(E.slice(1)), empty],
  "map.takeUntilValue": [empty, empty], "map.dropUntilValue": [M(E), empty],
  "map.takeLastWhileValue": [M(E), empty], "map.dropLastWhileValue": [empty, empty],
  "map.distinctValuesFirst": [M([E[0]]), empty], "map.distinctValuesLast": [M([E[19]]), empty],
  "map.filterByValueSet": [M(E), empty], "map.rejectByValueSet": [empty, empty],
  "map.remapValues": [M(E.map(([key]) => [key, R])), empty],
  "map.remapValuesOrDefault": [M(E.map(([key]) => [key, R])), empty],
  "map.equalsOrdered": [true, true], "set.equalsOrdered": [true, true],
  "map.countChangedEntries": [0, 0], "map.countRemovedKeys": [0, 0],
  "map.findEntryByValue": [M([E[0]]), empty], "map.findLastEntryByValue": [M([E[19]]), empty],
  "map.takeWhileKeyIn": [M(E), empty], "map.dropWhileKeyIn": [empty, empty],
  "map.takeLastWhileKeyIn": [M(E), empty], "map.dropLastWhileKeyIn": [empty, empty],
};
assert.deepEqual(Object.keys(boundaries).sort(), [...programs].sort(), "Every API has an independent boundary oracle");

export function completeCases(id) {
  const retained = fixtures.filter(c => c.program === id);
  const success = retained.find(c => Object.hasOwn(c.expect, "value"));
  assert.ok(success, `Independent successful smoke fixture for ${id}`);
  const max = Object.fromEntries(Object.entries(success.inputs).map(([name, value]) => [
    name, typeof value === "object" && value !== null ? M(E) :
      typeof value === "number" ? (name === "index" ? 19 : name === "count" ? 20 : 0) :
        ({ key: K, value: id.startsWith("set.") ? K : V, first: K, second: LAST,
          expected: V, replacement: R, fallback: F })[name],
  ]));
  assert.ok(Object.values(max).every(v => v !== undefined), `${id}: explicit operand assignment`);
  if (["map.filterByValueSet", "map.rejectByValueSet"].includes(id)) max.right = M([[V, ""]]);
  if (["map.remapValues", "map.remapValuesOrDefault"].includes(id)) max.right = M([[V, R]]);
  // Even nullary constructors validate supplied registers. Supply a maximum
  // valid collection without inventing a required argument for those two APIs.
  if (!Object.keys(max).length) max.boundary = M(E);
  const zero = Object.fromEntries(Object.entries(max).map(([name, value]) => [
    name, typeof value === "object" ? empty : value,
  ]));
  const expectation = value => value?.error === true ? value : { value };
  const result = [
    ...retained,
    { name: "maximum 20 entries / 256-unit strings", inputs: max, expect: expectation(boundaries[id][0]), boundary: "maximum" },
    { name: "empty/no-op operand validation", inputs: zero, expect: expectation(boundaries[id][1]), boundary: "empty" },
  ];
  const reject = (name, inputs, error) => result.push({ name, inputs, expect: { error: true }, ...(error ? { error } : {}) });
  if (["map.set", "map.setIfAbsent", "set.add", "set.toggle"].includes(id)) {
    reject("maximum: inserting a 21st entry", {
      ...max, [id.startsWith("set.") ? "value" : "key"]: "absent",
    }, "Map entry limit exceeded.");
  }
  if (["map.merge", "map.mergeIfAbsent", "set.union", "set.symmetricDifference"].includes(id)) {
    reject("maximum: combined output exceeds 20 entries", {
      ...max, right: M([["absent", "new"]]),
    }, "Map entry limit exceeded.");
  }
  for (const [name, value] of Object.entries(zero)) {
    // Required arguments must be checked even before an empty/no-op return.
    if (name !== "boundary") {
      const missing = { ...zero }; delete missing[name];
      reject(`empty: missing ${name}`, missing, "Undefined map register.");
      reject(`empty: wrong type ${name}`, { ...zero, [name]: typeof value === "object" ? false : empty },
        typeof value === "object" ? "Expected a map." : typeof value === "number" ? "Expected a map integer." : "Expected a map string.");
    }
    if (typeof value === "object") {
      for (const [label, invalid, error] of [
        ["21 entries", M([...E, ["extra", ""]]), "Invalid map entry array."],
        ["duplicate", M([["a", ""], ["a", "other"]]), "Duplicate map input key."],
        ["bad pair", M([["a"]]), "Invalid map key or value."],
        ["long stored key", M([["k".repeat(257), ""]]), "Invalid map key or value."],
        ["long payload", M([["a", "v".repeat(257)]]), "Invalid map key or value."],
        ["null container", null, "Invalid map value."],
      ]) reject(`${name}: ${label}`, { ...zero, [name]: invalid }, error);
    } else if (typeof value === "string") {
      reject(`empty: long ${name}`, { ...zero, [name]: "x".repeat(257) }, "Invalid map value.");
    } else {
      for (const invalid of [false, "1", 1.5, Number.MAX_SAFE_INTEGER + 1, null]) {
        reject(`empty: invalid ${name}=${JSON.stringify(invalid)}`, { ...zero, [name]: invalid });
      }
    }
  }
  result.push({ ...success, name: "recovery after malformed inputs", boundary: "recovery" });
  return result;
}
