import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repository = fileURLToPath(new URL("../", import.meta.url));
const tsx = path.join(repository, "node_modules/tsx/dist/cli.mjs");

// Independent, executable expectations: do not derive the nine-program contract
// from the catalogue under test (a dropped catalogue entry must fail).
const examples = [
  { id: "string.contains", file: "string/contains.wls", inputs: { items: ["alpha", "beta"], value: "beta" }, value: true },
  { id: "string.indexOf", file: "string/indexOf.wls", inputs: { items: ["alpha", "beta", "beta"], value: "beta" }, value: 1 },
  { id: "string.concat", file: "string/concat.wls", inputs: { left: ["alpha"], right: ["beta", "alpha"] }, value: ["alpha", "beta", "alpha"] },
  { id: "recipient.add", file: "recipient/add.wls", inputs: { items: ["alpha"], value: "beta" }, value: ["alpha", "beta"] },
  { id: "recipient.remove", file: "recipient/remove.wls", inputs: { items: ["alpha", "beta", "alpha"], value: "alpha" }, value: ["beta"] },
  { id: "recipient.count", file: "recipient/count.wls", inputs: { items: ["alpha", "beta"] }, value: 2 },
  { id: "recipient.at", file: "recipient/at.wls", inputs: { items: ["alpha", "beta"], index: 1 }, value: "beta" },
  { id: "string.lastIndexOf", file: "string/lastIndexOf.wls", inputs: { items: ["alpha", "beta", "beta"], value: "beta" }, value: 2 },
  { id: "string.reverse", file: "string/reverse.wls", inputs: { items: ["alpha", "beta", "alpha", "gamma"] }, value: ["gamma", "alpha", "beta", "alpha"] },
];
// Fixed asset inventory includes the independent map release. Legacy execution
// expectations above stay intact; map execution has its own distribution tests.
const allFiles = [...examples.map(({ file }) => file),
  "map/renameKeyIfAbsent.wls", "set/replaceIfAbsent.wls",
  "map/swapValues.wls", "set/toggle.wls",
  "map/moveToEnd.wls", "set/moveToEnd.wls",
  "map/moveToFront.wls", "set/moveToFront.wls",
  "map/takeWhileValue.wls", "map/dropWhileValue.wls",
  "map/takeLast.wls", "set/takeLast.wls", "map/dropLast.wls", "set/dropLast.wls",
  "map/indexOfValue.wls", "map/lastIndexOfValue.wls",
  "map/countCommonKeys.wls", "map/countMatchingEntries.wls",
  "map/countDistinctValues.wls", "map/hasDuplicateValues.wls",
  "map/deleteFirstValue.wls", "map/deleteLastValue.wls",
  "set/intersectionSize.wls", "set/unionSize.wls",
  "set/differenceSize.wls", "set/symmetricDifferenceSize.wls",
  "map/mergeIfAbsent.wls", "map/mergeExisting.wls",
  "map/replaceEntryIfValue.wls", "map/deleteEntryIfValue.wls",
  "map/takeUntilValue.wls", "map/dropUntilValue.wls",
  "map/takeLastWhileValue.wls", "map/dropLastWhileValue.wls",
  "map/distinctValuesFirst.wls", "map/distinctValuesLast.wls",
  "map/filterByValueSet.wls", "map/rejectByValueSet.wls",
  "map/remapValues.wls", "map/remapValuesOrDefault.wls",
  "map/equalsOrdered.wls", "set/equalsOrdered.wls",
  "map/countChangedEntries.wls", "map/countRemovedKeys.wls",
  "map/findEntryByValue.wls", "map/findLastEntryByValue.wls",
  "map/takeWhileKeyIn.wls", "map/dropWhileKeyIn.wls",
  "map/takeLastWhileKeyIn.wls", "map/dropLastWhileKeyIn.wls",
  "map/empty.wls", "map/copy.wls", "map/size.wls", "map/has.wls",
  "map/get.wls", "map/set.wls", "map/delete.wls", "map/keyAt.wls",
  "map/merge.wls", "map/intersection.wls", "map/difference.wls",
  "set/empty.wls", "set/fromMap.wls", "set/size.wls", "set/has.wls",
  "set/add.wls", "set/delete.wls", "set/at.wls", "set/union.wls",
  "set/intersection.wls", "set/difference.wls",
  "map/filterByValue.wls", "map/rejectByValue.wls", "map/invertLast.wls",
  "set/isSubset.wls", "set/isDisjoint.wls", "set/equals.wls",
  "map/equals.wls", "map/isSubmap.wls", "map/intersectionEntries.wls",
  "map/differenceEntries.wls", "set/symmetricDifference.wls",
  "map/getOrDefault.wls", "map/setIfAbsent.wls", "map/replaceIfPresent.wls",
  "map/take.wls", "map/drop.wls", "set/take.wls", "set/drop.wls",
  "map/hasValue.wls", "map/countValue.wls", "map/findKeyByValueOrDefault.wls",
  "map/replaceValue.wls", "map/invertFirst.wls", "set/fromValues.wls",
  "map/findLastKeyByValueOrDefault.wls", "map/replaceFirstValue.wls", "map/replaceLastValue.wls",
  "map/valueAt.wls", "map/keyAtOrDefault.wls", "map/valueAtOrDefault.wls",
  "map/indexOfKey.wls", "set/indexOf.wls", "set/atOrDefault.wls",
  "map/slice.wls", "set/slice.wls",
].sort();

const expectedConcatSnapshot = {
  leftAfterExecution: ["alpha", "beta", "alpha"],
  rightAfterExecution: ["beta", "gamma", "beta"],
  outputAfterExecution: ["alpha", "beta", "alpha", "beta", "gamma", "beta"],
  rightAfterLeftMutation: ["beta", "gamma", "beta"],
  outputAfterLeftMutation: ["alpha", "beta", "alpha", "beta", "gamma", "beta"],
  leftAfterRightMutation: ["left-changed", "beta", "alpha", "left-only"],
  outputAfterRightMutation: ["alpha", "beta", "alpha", "beta", "gamma", "beta"],
  leftAfterOutputMutation: ["left-changed", "beta", "alpha", "left-only"],
  rightAfterOutputMutation: ["right-changed", "gamma", "beta", "right-only"],
  mutatedOutput: ["result-left-changed", "beta", "alpha", "result-right-changed", "gamma", "beta", "result-only"],
};

// Reuse deterministic text from the string/recipient collection tests, but
// spell out the packaged contract here rather than asking the source VM.
const exactItems = ["", "alpha", "alpha", " alpha ", "Alpha", "é", "e\u0301", "Ψ🌊"];
const exactSearches = [
  { needle: "", contains: true, index: 0 },
  { needle: "alpha", contains: true, index: 1 },
  { needle: " alpha ", contains: true, index: 3 },
  { needle: "Alpha", contains: true, index: 4 },
  { needle: "é", contains: true, index: 5 },
  { needle: "e\u0301", contains: true, index: 6 },
  { needle: "Ψ🌊", contains: true, index: 7 },
  { needle: "missing", contains: false, index: -1 },
  { needle: "ALPHA", contains: false, index: -1 },
  { needle: "Ψ", contains: false, index: -1 },
];
// Distinct endings expose truncation; cycling repeats maximum-length items
// within and across the two lists while filling the 20-item output capacity.
const maximumLengthConcatItems = Array.from(
  { length: 20 }, (_, i) => `item-${i % 7}`.padStart(256, "x"),
);
const textSemantics = [
  ...exactSearches.flatMap(({ needle, contains, index }) => [
    { name: `contains ${JSON.stringify(needle)}`, id: "string.contains", inputs: { items: exactItems, value: needle }, value: contains },
    { name: `indexOf ${JSON.stringify(needle)}`, id: "string.indexOf", inputs: { items: exactItems, value: needle }, value: index },
  ]),
  { name: "contains does not normalise Unicode", id: "string.contains", inputs: { items: ["é"], value: "e\u0301" }, value: false },
  { name: "indexOf does not normalise Unicode", id: "string.indexOf", inputs: { items: ["e\u0301"], value: "é" }, value: -1 },
  {
    name: "concat preserves both lists and duplicates", id: "string.concat",
    inputs: { left: ["alpha", "alpha", "Alpha", "é"], right: ["", "e\u0301", "Ψ🌊", "alpha"] },
    value: ["alpha", "alpha", "Alpha", "é", "", "e\u0301", "Ψ🌊", "alpha"],
  },
  {
    name: "concat preserves 20 maximum-length items, duplicates and order", id: "string.concat",
    inputs: { left: maximumLengthConcatItems.slice(0, 11), right: maximumLengthConcatItems.slice(11) },
    value: maximumLengthConcatItems,
  },
  {
    name: "add appends Unicode without reordering or deduplicating existing items", id: "recipient.add",
    inputs: { items: ["A", "a", "中文", "עברית", "__proto__", "<script>", "A"], value: "😀" },
    value: ["A", "a", "中文", "עברית", "__proto__", "<script>", "A", "😀"],
  },
  {
    name: "add an exact duplicate leaves order and multiplicity unchanged", id: "recipient.add",
    inputs: { items: ["A", "a", "中文", "עברית", "中文", "😀"], value: "中文" },
    value: ["A", "a", "中文", "עברית", "中文", "😀"],
  },
  {
    name: "add treats different case as a distinct item", id: "recipient.add",
    inputs: { items: ["A", "中文", "😀"], value: "a" },
    value: ["A", "中文", "😀", "a"],
  },
  {
    name: "add does not normalise Unicode", id: "recipient.add",
    inputs: { items: ["é", "Ψ🌊"], value: "e\u0301" },
    value: ["é", "Ψ🌊", "e\u0301"],
  },
  {
    name: "remove deletes every exact match but preserves case and survivor order", id: "recipient.remove",
    inputs: { items: ["A", "a", "中文", "A", "עברית", "a", "😀"], value: "A" },
    value: ["a", "中文", "עברית", "a", "😀"],
  },
  {
    name: "remove deletes duplicate Unicode text without normalising survivors", id: "recipient.remove",
    inputs: { items: ["é", "e\u0301", "中文", "é", "Ψ🌊", "e\u0301"], value: "é" },
    value: ["e\u0301", "中文", "Ψ🌊", "e\u0301"],
  },
  {
    name: "remove absent case leaves duplicates and order unchanged", id: "recipient.remove",
    inputs: { items: ["alpha", "Alpha", "中文", "alpha", "😀"], value: "ALPHA" },
    value: ["alpha", "Alpha", "中文", "alpha", "😀"],
  },
];

// Independent WLS-COLLECTION/1 boundaries, deliberately not calculated from
// exported limits or by executing the source-module implementation.
const program = (body: string) => `WLS-COLLECTION/1\n${body}`;
const returnItems = program('RETURN ["items"]');
const fullCollection = Array.from({ length: 20 }, (_, i) => `recipient-${i}`);
const fullDuplicateCollection = ["alpha", "Ψ🌊", "alpha", ...fullCollection.slice(0, 17)];
const registers = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`r${i}`, i]));
const registerProgram = (count: number) => program(
  Array.from({ length: count }, (_, i) => `CONST ["r${i}",${i}]`).join("\n") + '\nRETURN ["r0"]',
);
// Three padding instructions + 340 iterations of INC/LT/JTRUE + RETURN
// take exactly 1024 cycles. One extra padding instruction must be rejected.
const finiteLoop = (padding: number) => program(
  'CONST ["padding",0]\n'.repeat(padding) +
  ':loop\nINC ["i"]\nLT ["again","i","end"]\nJTRUE ["again","loop"]\nRETURN ["i"]',
);
const compileFailures = [
  { id: "unknown opcode", source: program('UNKNOWN []\nRETURN ["items"]'), message: "Unknown collection instruction at line 2." },
  { id: "invalid JSON", source: program('RETURN ["items",]'), message: "Invalid instruction arguments at line 2." },
  { id: "wrong arity", source: program('LIST_LEN ["size"]\nRETURN ["size"]'), message: "Invalid instruction arity." },
  { id: "invalid register", source: program('RETURN ["bad-name"]'), message: "Invalid register or label." },
  { id: "invalid literal", source: program('CONST ["value",null]\nRETURN ["value"]'), message: "Invalid literal." },
  { id: "missing branch", source: program('JUMP ["missing"]\nRETURN ["items"]'), message: "Invalid collection branch target." },
  { id: "duplicate label", source: program(':same\n:same\nRETURN ["items"]'), message: "Invalid or duplicate label at line 3." },
  { id: "missing return", source: program('CONST ["value",true]'), message: "Collection program must end with RETURN." },
  { id: "257-character literal", source: program(`CONST ["value","${"x".repeat(257)}"]\nRETURN ["value"]`), message: "Invalid literal." },
  { id: "8193-character source", source: returnItems.padEnd(8193, " "), message: "Collection source is too large." },
  { id: "129 instructions", source: program('CONST ["x",0]\n'.repeat(128) + 'RETURN ["x"]'), message: "Collection instruction limit exceeded." },
  // These opcodes must never acquire external effects in a portable bundle.
  ...["IMPORT", "FETCH", "EVAL", "STORE", "SEND", "PAY", "DOM"].map(op => ({
    id: `forbidden ${op}`, source: program(`${op} ["items"]\nRETURN ["items"]`),
    message: "Unknown collection instruction at line 2.",
  })),
];
const executionFailures = [
  { id: "21 input items", source: returnItems, inputs: { items: [...fullCollection, "extra"] }, message: "Select at most 20 recipients." },
  { id: "21st pushed item", source: program('LIST_PUSH ["items","value"]\nRETURN ["items"]'), inputs: { items: fullCollection, value: "extra" }, message: "Select at most 20 recipients." },
  { id: "257-character item", source: returnItems, inputs: { items: ["x".repeat(257)] }, message: "Invalid collection item." },
  { id: "257-character scalar", source: returnItems, inputs: { items: "x".repeat(257) }, message: "Invalid collection value." },
  { id: "33 input registers", source: program('RETURN ["r0"]'), inputs: registers(33), message: "Collection register limit exceeded." },
  { id: "33 allocated registers", source: registerProgram(33), inputs: {}, message: "Collection register limit exceeded." },
  { id: "1025 cycles", source: finiteLoop(4), inputs: { i: 0, end: 340 }, message: "Collection cycle limit exceeded." },
  { id: "infinite loop", source: program(':loop\nJUMP ["loop"]\nRETURN ["items"]'), inputs: { items: [] }, message: "Collection cycle limit exceeded." },
  { id: "undefined register", source: program('RETURN ["missing"]'), inputs: {}, message: "Undefined register: missing." },
];
const boundaryControls = [
  { id: "20 items of 256 characters", source: returnItems, inputs: { items: Array(20).fill("x".repeat(256)) }, value: Array(20).fill("x".repeat(256)), cycles: 1 },
  { id: "20th pushed item", source: program('LIST_PUSH ["items","value"]\nRETURN ["items"]'), inputs: { items: fullCollection.slice(0, 19), value: "recipient-19" }, value: fullCollection, cycles: 2 },
  { id: "8192-character source", source: returnItems.padEnd(8192, " "), inputs: { items: [] }, value: [], cycles: 1 },
  { id: "128 instructions", source: program('CONST ["x",0]\n'.repeat(127) + 'RETURN ["x"]'), inputs: {}, value: 0, cycles: 128 },
  { id: "32 input registers", source: program('RETURN ["r0"]'), inputs: registers(32), value: 0, cycles: 1 },
  { id: "32 allocated registers", source: registerProgram(32), inputs: {}, value: 0, cycles: 33 },
  { id: "1024 cycles", source: finiteLoop(3), inputs: { i: 0, end: 340 }, value: 340, cycles: 1024 },
];

// Only the harness can read the single bundled file. The library and all
// programs run in a separate realm without Node/browser/app capabilities.
const collectionSafetyConsumer = `
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const bundle = readFileSync(process.argv[1], "utf8");
const checks = ${JSON.stringify(`
const api = module.exports;
const compileFailures = ${JSON.stringify(compileFailures)};
const executionFailures = ${JSON.stringify(executionFailures)};
const controls = ${JSON.stringify(boundaryControls)};
function attempt(id, entry, action) {
  try { action(); return { id, entry, accepted: true }; }
  catch (error) {
    return { id, entry, typed: error instanceof api.CollectionVMError, name: error.name, message: error.message };
  }
}
const rejected = compileFailures.flatMap(({ id, source }) => [
  attempt(id, "compile", () => api.compileCollection(source)),
  attempt(id, "execute", () => api.executeCollection(source, { items: [] })),
]).concat(executionFailures.map(({ id, source, inputs }) =>
  attempt(id, "execute", () => api.executeCollection(source, inputs))));
const accepted = controls.map(({ id, source, inputs }) => {
  const code = api.compileCollection(source);
  const result = api.executeCollection(source, inputs);
  return { id, value: result.value, cycles: result.trace.length, compiled: Object.isFrozen(code) };
});
JSON.stringify({
  rejected, accepted,
  capabilities: [typeof process, typeof require, typeof fetch, typeof XMLHttpRequest, typeof WebSocket],
});
`)};
const result = runInNewContext(bundle + "\\n" + checks, { module: { exports: {} } }, {
  timeout: 2000, contextCodeGeneration: { strings: false, wasm: false },
});
console.log(JSON.stringify({ result: JSON.parse(result), environmentKeys: Object.keys(process.env).sort() }));
`;

// Injected into the ordinary, unbundled callers only after copied sources and
// assets are removed. Freeze in the child; JSON cannot preserve frozen state.
const frozenListConsumer = `
const differentRecipientAdditions = (() => {
  const source = api.getCollectionProgramSource("recipient.add");
  const items = Object.freeze(["alpha", "alpha", "Ψ🌊"]);
  const first = api.executeCollection(source, { items, value: "beta" }).value;
  const second = api.executeCollection(source, { items, value: "gamma" }).value;
  const beforeMutation = {
    first: first.slice(), second: second.slice(), input: items.slice(),
    distinctResults: first !== second,
    independentFromInput: first !== items && second !== items,
    frozenInput: Object.isFrozen(items),
  };
  first[0] = "changed";
  first.push("result-only");
  return {
    beforeMutation,
    afterMutation: { first: first.slice(), second: second.slice(), input: items.slice() },
  };
})();
// Keep a live result across a failed execution, not just a copied snapshot.
const concatFailureRecovery = (() => {
  const source = api.getCollectionProgramSource("string.concat");
  const left = Object.freeze(Array.from({ length: 11 }, (_, i) => "left-" + i));
  const right = Object.freeze(Array.from({ length: 9 }, (_, i) => "right-" + i));
  const overflowRight = Object.freeze([...right, "overflow"]);
  const lists = [left, right, overflowRight];
  const retained = api.executeCollection(source, { left, right }).value;
  const beforeFailure = retained.slice();
  let failure = null;
  try {
    api.executeCollection(source, { left, right: overflowRight });
  } catch (error) {
    failure = {
      name: error.name, message: error.message, typed: error instanceof api.CollectionVMError,
    };
  }
  const afterFailure = {
    retained: retained.slice(), inputs: lists.map(list => list.slice()),
    frozen: lists.every(Object.isFrozen),
  };
  // Reverse the inputs so stale results cannot masquerade as recovery.
  const recovered = api.executeCollection(source, { left: right, right: left }).value;
  return {
    beforeFailure, failure, afterFailure,
    afterRecovery: {
      retained: retained.slice(), recovered: recovered.slice(),
      inputs: lists.map(list => list.slice()), frozen: lists.every(Object.isFrozen),
      distinctResults: retained !== recovered,
      independentFromInputs: lists.every(list => retained !== list && recovered !== list),
    },
  };
})();
const frozenSnapshots = [
  {
    id: "append item",
    source: ${JSON.stringify(program('LIST_PUSH ["items","value"]\nRETURN ["items"]'))},
    inputs: { items: ["alpha", "alpha", "Ψ🌊"], value: "beta" },
  },
  {
    id: "recipient.add", source: api.getCollectionProgramSource("recipient.add"),
    inputs: { items: ["alpha", "alpha", "Ψ🌊"], value: "beta" },
  },
  {
    // A duplicate must succeed at capacity without growth or deduplication.
    id: "recipient.add existing item at capacity", source: api.getCollectionProgramSource("recipient.add"),
    inputs: { items: ${JSON.stringify(fullDuplicateCollection)}, value: "alpha" },
  },
  {
    id: "recipient.remove absent item", source: api.getCollectionProgramSource("recipient.remove"),
    inputs: { items: ["alpha", "Alpha", "Ψ🌊", "alpha"], value: "ALPHA" },
  },
  {
    id: "recipient.remove leaving survivors", source: api.getCollectionProgramSource("recipient.remove"),
    inputs: { items: ["alpha", "Alpha", "Ψ🌊", "alpha", "Alpha"], value: "alpha" },
  },
  {
    id: "recipient.remove all items", source: api.getCollectionProgramSource("recipient.remove"),
    inputs: { items: ["Ψ🌊", "Ψ🌊", "Ψ🌊"], value: "Ψ🌊" },
  },
  {
    id: "string.concat", source: api.getCollectionProgramSource("string.concat"),
    inputs: { left: ["alpha", "alpha", "Ψ🌊"], right: ["", "é", "e\\u0301", "alpha"] },
  },
  {
    id: "append 20th item",
    source: ${JSON.stringify(program('LIST_PUSH ["items","value"]\nRETURN ["items"]'))},
    inputs: { items: ${JSON.stringify(fullCollection.slice(0, 19))}, value: "recipient-19" },
  },
  {
    id: "concat 11 plus 9 items", source: api.getCollectionProgramSource("string.concat"),
    inputs: {
      left: Array.from({ length: 11 }, (_, i) => "left-" + i),
      right: Array.from({ length: 9 }, (_, i) => "right-" + i),
    },
  },
  {
    id: "string.concat empty left", source: api.getCollectionProgramSource("string.concat"),
    inputs: { left: [], right: ["alpha", "alpha", "Ψ🌊"] },
  },
  {
    id: "string.concat empty right", source: api.getCollectionProgramSource("string.concat"),
    inputs: { left: ["alpha", "alpha", "Ψ🌊"], right: [] },
  },
  {
    id: "string.concat empty left at capacity", source: api.getCollectionProgramSource("string.concat"),
    inputs: { left: [], right: ${JSON.stringify(fullDuplicateCollection)} },
  },
  {
    id: "string.concat empty right at capacity", source: api.getCollectionProgramSource("string.concat"),
    inputs: { left: ${JSON.stringify(fullDuplicateCollection)}, right: [] },
  },
  {
    id: "string.concat both empty", source: api.getCollectionProgramSource("string.concat"),
    inputs: { left: [], right: [] },
  },
].map(({ id, source, inputs }) => {
  const lists = Object.values(inputs).filter(Array.isArray);
  lists.forEach(list => Object.freeze(list));
  const output = api.executeCollection(source, inputs).value;
  const inputAfterExecution = lists.map(list => list.slice());
  const outputAfterExecution = output.slice();
  const independent = lists.every(list => output !== list);
  // Retain both results from the same frozen append/concat/add/removal inputs: snapshots of a
  // single execution cannot expose a mutable buffer reused by the next call.
  const repeatedKey = id.startsWith("append") ? "repeatedAppend"
    : id.startsWith("recipient.add") ? "repeatedAddition"
    : id.startsWith("recipient.remove") ? "repeatedRemoval" : "repeatedConcat";
  const secondOutput = lists.length === 2 || id.startsWith("recipient.") || id.startsWith("append")
    ? api.executeCollection(source, inputs).value : null;
  const repeatedResults = secondOutput === null ? {} : {
    distinctResults: output !== secondOutput,
    independentFromInputs: lists.every(list => secondOutput !== list),
    firstAfterSecondExecution: output.slice(),
    secondAfterExecution: secondOutput.slice(),
  };
  output[0] = "changed";
  output.push("result-only");
  return {
    id, frozen: lists.every(Object.isFrozen), independent,
    inputAfterExecution, outputAfterExecution,
    inputAfterOutputMutation: lists.map(list => list.slice()), mutatedOutput: output,
    ...(secondOutput === null ? {} : {
      [repeatedKey]: { ...repeatedResults, secondAfterFirstMutation: secondOutput.slice() },
    }),
  };
});
const frozenLimitFailures = [
  {
    id: "append 21st item",
    source: ${JSON.stringify(program('LIST_PUSH ["items","value"]\nRETURN ["items"]'))},
    inputs: { items: ${JSON.stringify(fullCollection)}, value: "overflow" },
  },
  {
    id: "recipient.add 21st item", source: api.getCollectionProgramSource("recipient.add"),
    inputs: { items: ${JSON.stringify(fullCollection)}, value: "overflow" },
  },
  {
    id: "concat 11 plus 10 items", source: api.getCollectionProgramSource("string.concat"),
    inputs: {
      left: Array.from({ length: 11 }, (_, i) => "left-" + i),
      right: Array.from({ length: 10 }, (_, i) => "right-" + i),
    },
  },
].map(({ id, source, inputs }) => {
  const lists = Object.values(inputs).filter(Array.isArray);
  lists.forEach(list => Object.freeze(list));
  let failure = null;
  try {
    api.executeCollection(source, inputs);
  } catch (error) {
    failure = {
      name: error.name, message: error.message, typed: error instanceof api.CollectionVMError,
    };
  }
  return {
    id, failure, frozen: lists.every(Object.isFrozen),
    inputAfterFailure: lists.map(list => list.slice()),
  };
});
`;
const expectedDifferentRecipientAdditions = {
  beforeMutation: {
    first: ["alpha", "alpha", "Ψ🌊", "beta"],
    second: ["alpha", "alpha", "Ψ🌊", "gamma"],
    input: ["alpha", "alpha", "Ψ🌊"],
    distinctResults: true, independentFromInput: true, frozenInput: true,
  },
  afterMutation: {
    first: ["changed", "alpha", "Ψ🌊", "beta", "result-only"],
    second: ["alpha", "alpha", "Ψ🌊", "gamma"],
    input: ["alpha", "alpha", "Ψ🌊"],
  },
};
const expectedFrozenSnapshots = [
  {
    id: "append item", inputs: [["alpha", "alpha", "Ψ🌊"]],
    output: ["alpha", "alpha", "Ψ🌊", "beta"],
    mutatedOutput: ["changed", "alpha", "Ψ🌊", "beta", "result-only"],
  },
  {
    id: "recipient.add", inputs: [["alpha", "alpha", "Ψ🌊"]],
    output: ["alpha", "alpha", "Ψ🌊", "beta"],
    mutatedOutput: ["changed", "alpha", "Ψ🌊", "beta", "result-only"],
  },
  {
    id: "recipient.add existing item at capacity", inputs: [fullDuplicateCollection],
    output: fullDuplicateCollection,
    mutatedOutput: ["changed", ...fullDuplicateCollection.slice(1), "result-only"],
  },
  {
    id: "recipient.remove absent item", inputs: [["alpha", "Alpha", "Ψ🌊", "alpha"]],
    output: ["alpha", "Alpha", "Ψ🌊", "alpha"],
    mutatedOutput: ["changed", "Alpha", "Ψ🌊", "alpha", "result-only"],
  },
  {
    id: "recipient.remove leaving survivors", inputs: [["alpha", "Alpha", "Ψ🌊", "alpha", "Alpha"]],
    output: ["Alpha", "Ψ🌊", "Alpha"],
    mutatedOutput: ["changed", "Ψ🌊", "Alpha", "result-only"],
  },
  {
    id: "recipient.remove all items", inputs: [["Ψ🌊", "Ψ🌊", "Ψ🌊"]],
    output: [],
    mutatedOutput: ["changed", "result-only"],
  },
  {
    id: "string.concat", inputs: [["alpha", "alpha", "Ψ🌊"], ["", "é", "e\u0301", "alpha"]],
    output: ["alpha", "alpha", "Ψ🌊", "", "é", "e\u0301", "alpha"],
    mutatedOutput: ["changed", "alpha", "Ψ🌊", "", "é", "e\u0301", "alpha", "result-only"],
  },
  {
    id: "append 20th item", inputs: [fullCollection.slice(0, 19)],
    output: fullCollection,
    mutatedOutput: ["changed", ...fullCollection.slice(1), "result-only"],
  },
  {
    id: "concat 11 plus 9 items",
    inputs: [
      Array.from({ length: 11 }, (_, i) => `left-${i}`),
      Array.from({ length: 9 }, (_, i) => `right-${i}`),
    ],
    output: [
      ...Array.from({ length: 11 }, (_, i) => `left-${i}`),
      ...Array.from({ length: 9 }, (_, i) => `right-${i}`),
    ],
    mutatedOutput: [
      "changed",
      ...Array.from({ length: 10 }, (_, i) => `left-${i + 1}`),
      ...Array.from({ length: 9 }, (_, i) => `right-${i}`),
      "result-only",
    ],
  },
  {
    id: "string.concat empty left", inputs: [[], ["alpha", "alpha", "Ψ🌊"]],
    output: ["alpha", "alpha", "Ψ🌊"],
    mutatedOutput: ["changed", "alpha", "Ψ🌊", "result-only"],
  },
  {
    id: "string.concat empty right", inputs: [["alpha", "alpha", "Ψ🌊"], []],
    output: ["alpha", "alpha", "Ψ🌊"],
    mutatedOutput: ["changed", "alpha", "Ψ🌊", "result-only"],
  },
  {
    id: "string.concat empty left at capacity", inputs: [[], fullDuplicateCollection],
    output: fullDuplicateCollection,
    mutatedOutput: ["changed", ...fullDuplicateCollection.slice(1), "result-only"],
  },
  {
    id: "string.concat empty right at capacity", inputs: [fullDuplicateCollection, []],
    output: fullDuplicateCollection,
    mutatedOutput: ["changed", ...fullDuplicateCollection.slice(1), "result-only"],
  },
  {
    id: "string.concat both empty", inputs: [[], []],
    output: [],
    mutatedOutput: ["changed", "result-only"],
  },
].map(({ id, inputs, output, mutatedOutput }) => ({
  id, frozen: true, independent: true,
  inputAfterExecution: inputs, outputAfterExecution: output,
  inputAfterOutputMutation: inputs, mutatedOutput,
  ...(inputs.length === 2 || id.startsWith("recipient.") || id.startsWith("append") ? {
    [id.startsWith("append") ? "repeatedAppend"
      : id.startsWith("recipient.add") ? "repeatedAddition"
      : id.startsWith("recipient.remove") ? "repeatedRemoval" : "repeatedConcat"]: {
      distinctResults: true, independentFromInputs: true,
      firstAfterSecondExecution: output, secondAfterExecution: output,
      secondAfterFirstMutation: output,
    },
  } : {}),
}));

// Run with mutable caller-owned lists too: freezing alone could conceal an
// empty-side shortcut that returns an input only when it is mutable.
const emptyConcatConsumer = `
const emptyConcatSnapshots = [
  { id: "empty left", left: [], right: ["alpha", "alpha", "Ψ🌊"] },
  { id: "empty right", left: ["alpha", "alpha", "Ψ🌊"], right: [] },
  { id: "empty left at capacity", left: [], right: ${JSON.stringify(fullDuplicateCollection)} },
  { id: "empty right at capacity", left: ${JSON.stringify(fullDuplicateCollection)}, right: [] },
  { id: "both empty", left: [], right: [] },
].map(({ id, left, right }) => {
  const output = api.executeCollection(api.getCollectionProgramSource("string.concat"), { left, right }).value;
  const capture = () => ({ left: left.slice(), right: right.slice(), output: output.slice() });
  const independentFromLeft = output !== left;
  const independentFromRight = output !== right;
  const afterExecution = capture();
  output[0] = "changed";
  output.push("result-only");
  const afterOutputMutation = capture();
  left[0] = "left-changed";
  left.push("left-only");
  const afterLeftMutation = capture();
  right[0] = "right-changed";
  right.push("right-only");
  return {
    id, independentFromLeft, independentFromRight,
    afterExecution, afterOutputMutation, afterLeftMutation, afterRightMutation: capture(),
  };
});
`;
const expectedEmptyConcatSnapshots = [
  {
    id: "empty left", left: [], right: ["alpha", "alpha", "Ψ🌊"],
    output: ["alpha", "alpha", "Ψ🌊"], mutatedOutput: ["changed", "alpha", "Ψ🌊", "result-only"],
    mutatedLeft: ["left-changed", "left-only"], mutatedRight: ["right-changed", "alpha", "Ψ🌊", "right-only"],
  },
  {
    id: "empty right", left: ["alpha", "alpha", "Ψ🌊"], right: [],
    output: ["alpha", "alpha", "Ψ🌊"], mutatedOutput: ["changed", "alpha", "Ψ🌊", "result-only"],
    mutatedLeft: ["left-changed", "alpha", "Ψ🌊", "left-only"], mutatedRight: ["right-changed", "right-only"],
  },
  {
    id: "empty left at capacity", left: [], right: fullDuplicateCollection,
    output: fullDuplicateCollection,
    mutatedOutput: ["changed", ...fullDuplicateCollection.slice(1), "result-only"],
    mutatedLeft: ["left-changed", "left-only"],
    mutatedRight: ["right-changed", ...fullDuplicateCollection.slice(1), "right-only"],
  },
  {
    id: "empty right at capacity", left: fullDuplicateCollection, right: [],
    output: fullDuplicateCollection,
    mutatedOutput: ["changed", ...fullDuplicateCollection.slice(1), "result-only"],
    mutatedLeft: ["left-changed", ...fullDuplicateCollection.slice(1), "left-only"],
    mutatedRight: ["right-changed", "right-only"],
  },
  {
    id: "both empty", left: [], right: [], output: [], mutatedOutput: ["changed", "result-only"],
    mutatedLeft: ["left-changed", "left-only"], mutatedRight: ["right-changed", "right-only"],
  },
].map(({ id, left, right, output, mutatedOutput, mutatedLeft, mutatedRight }) => ({
  id, independentFromLeft: true, independentFromRight: true,
  afterExecution: { left, right, output },
  afterOutputMutation: { left, right, output: mutatedOutput },
  afterLeftMutation: { left: mutatedLeft, right, output: mutatedOutput },
  afterRightMutation: { left: mutatedLeft, right: mutatedRight, output: mutatedOutput },
}));
// Construct the alias inside each child: JSON-serialised operands would lose
// shared identity and accidentally exercise two separate caller-owned arrays.
const selfConcatConsumer = `
const selfConcatSnapshot = (() => {
  const shared = ["alpha", "alpha", "", "Alpha", "é", "e\\u0301", "Ψ🌊", "beta", "alpha", "omega"];
  const inputs = { left: shared, right: shared };
  const output = api.executeCollection(api.getCollectionProgramSource("string.concat"), inputs).value;
  const capture = () => ({ input: shared.slice(), output: output.slice() });
  const afterExecution = capture();
  shared[0] = "caller-changed";
  shared.push("caller-only");
  const afterInputMutation = capture();
  // Change both copies independently, then grow the result.
  output[0] = "result-first-changed";
  output[10] = "result-second-changed";
  output.push("result-only");
  return {
    sameOperands: inputs.left === inputs.right,
    mutableInput: !Object.isFrozen(shared),
    independent: output !== shared,
    afterExecution, afterInputMutation, afterOutputMutation: capture(),
  };
})();
const oversizedSelfConcatSnapshot = (() => {
  const shared = ["alpha", "alpha", "", "Alpha", "é", "e\\u0301", "Ψ🌊", "beta", "alpha", "omega", "overflow"];
  const inputs = { left: shared, right: shared };
  let failure = null;
  try {
    api.executeCollection(api.getCollectionProgramSource("string.concat"), inputs);
  } catch (error) {
    failure = {
      name: error.name, message: error.message, typed: error instanceof api.CollectionVMError,
    };
  }
  return {
    sameOperands: inputs.left === inputs.right,
    mutableInput: !Object.isFrozen(shared),
    failure, inputAfterFailure: shared.slice(),
  };
})();
`;
const expectedOversizedSelfConcatSnapshot = {
  sameOperands: true, mutableInput: true,
  failure: {
    name: "CollectionVMError", message: "Select at most 20 recipients.", typed: true,
  },
  inputAfterFailure: ["alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega", "overflow"],
};
const expectedSelfConcatSnapshot = {
  sameOperands: true, mutableInput: true, independent: true,
  afterExecution: {
    input: ["alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega"],
    output: [
      "alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
      "alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
    ],
  },
  afterInputMutation: {
    input: ["caller-changed", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega", "caller-only"],
    output: [
      "alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
      "alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
    ],
  },
  afterOutputMutation: {
    input: ["caller-changed", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega", "caller-only"],
    output: [
      "result-first-changed", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
      "result-second-changed", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega", "result-only",
    ],
  },
};
// Freeze the shared operand in the child as well: serialisation preserves
// neither alias identity nor frozen storage.
const frozenSelfConcatConsumer = `
const frozenSelfConcatSnapshot = (() => {
  const shared = Object.freeze(["alpha", "alpha", "", "Alpha", "é", "e\\u0301", "Ψ🌊", "beta", "alpha", "omega"]);
  const inputs = { left: shared, right: shared };
  const output = api.executeCollection(api.getCollectionProgramSource("string.concat"), inputs).value;
  const capture = () => ({ input: shared.slice(), output: output.slice() });
  const afterExecution = capture();
  const mutableOutput = !Object.isFrozen(output);
  output[0] = "result-first-changed";
  output[10] = "result-second-changed";
  output.push("result-only");
  return {
    sameOperands: inputs.left === inputs.right,
    frozenInput: Object.isFrozen(shared),
    independent: output !== shared,
    mutableOutput,
    afterExecution, afterOutputMutation: capture(),
  };
})();
`;
const expectedFrozenSelfConcatSnapshot = {
  sameOperands: true, frozenInput: true, independent: true, mutableOutput: true,
  afterExecution: {
    input: ["alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega"],
    output: [
      "alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
      "alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
    ],
  },
  afterOutputMutation: {
    input: ["alpha", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega"],
    output: [
      "result-first-changed", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega",
      "result-second-changed", "alpha", "", "Alpha", "é", "e\u0301", "Ψ🌊", "beta", "alpha", "omega", "result-only",
    ],
  },
};
const expectedFrozenLimitFailures = [
  { id: "append 21st item", inputs: [fullCollection] },
  { id: "recipient.add 21st item", inputs: [fullCollection] },
  {
    id: "concat 11 plus 10 items",
    inputs: [
      Array.from({ length: 11 }, (_, i) => `left-${i}`),
      Array.from({ length: 10 }, (_, i) => `right-${i}`),
    ],
  },
].map(({ id, inputs }) => ({
  id, frozen: true, inputAfterFailure: inputs,
  failure: {
    name: "CollectionVMError", message: "Select at most 20 recipients.", typed: true,
  },
}));

// Keep the actual successful arrays alive across rejection and recovery in
// both standalone formats; serialising only each call would hide reuse.
const additionFailureRecoveryConsumer = `
const additionFailureRecovery = (() => {
  const source = api.getCollectionProgramSource("recipient.add");
  const items = Object.freeze(["alpha", "alpha", "Ψ🌊"]);
  const full = Object.freeze(${JSON.stringify(fullCollection)});
  const first = api.executeCollection(source, { items, value: "beta" }).value;
  const second = api.executeCollection(source, { items, value: "gamma" }).value;
  const capture = () => ({
    retained: [first.slice(), second.slice()],
    inputs: [items.slice(), full.slice()],
    frozen: [items, full].every(Object.isFrozen),
  });
  const beforeFailure = capture();
  let failure = null;
  try {
    api.executeCollection(source, { items: full, value: "overflow" });
  } catch (error) {
    failure = {
      name: error.name, message: error.message, typed: error instanceof api.CollectionVMError,
    };
  }
  const afterFailure = capture();
  const recovered = api.executeCollection(source, { items, value: "delta" }).value;
  const afterRecovery = { ...capture(), recovered: recovered.slice() };
  const results = [first, second, recovered];
  const distinctResults = new Set(results).size === results.length;
  const independentFromInputs = results.every(result => result !== items && result !== full);
  recovered[0] = "recovered-changed";
  recovered.push("recovered-only");
  const afterRecoveryMutation = { ...capture(), recovered: recovered.slice() };
  first[0] = "first-changed";
  first.push("first-only");
  return {
    beforeFailure, failure, afterFailure, afterRecovery,
    distinctResults, independentFromInputs,
    afterRecoveryMutation, afterRetainedMutation: { ...capture(), recovered: recovered.slice() },
  };
})();
`;
const expectedAdditionFailureRecovery = (() => {
  const items = ["alpha", "alpha", "Ψ🌊"];
  const first = [...items, "beta"];
  const second = [...items, "gamma"];
  const recovered = [...items, "delta"];
  const unchanged = { retained: [first, second], inputs: [items, fullCollection], frozen: true };
  const mutatedRecovered = ["recovered-changed", "alpha", "Ψ🌊", "delta", "recovered-only"];
  return {
    beforeFailure: unchanged,
    failure: {
      name: "CollectionVMError", message: "Select at most 20 recipients.", typed: true,
    },
    afterFailure: unchanged,
    afterRecovery: { ...unchanged, recovered },
    distinctResults: true, independentFromInputs: true,
    afterRecoveryMutation: { ...unchanged, recovered: mutatedRecovered },
    afterRetainedMutation: {
      ...unchanged,
      retained: [["first-changed", "alpha", "Ψ🌊", "beta", "first-only"], second],
      recovered: mutatedRecovered,
    },
  };
})();

const expectedConcatFailureRecovery = (() => {
  const left = Array.from({ length: 11 }, (_, i) => `left-${i}`);
  const right = Array.from({ length: 9 }, (_, i) => `right-${i}`);
  const retained = [...left, ...right];
  const inputs = [left, right, [...right, "overflow"]];
  return {
    beforeFailure: retained,
    failure: {
      name: "CollectionVMError", message: "Select at most 20 recipients.", typed: true,
    },
    afterFailure: { retained, inputs, frozen: true },
    afterRecovery: {
      retained, recovered: [...right, ...left], inputs, frozen: true,
      distinctResults: true, independentFromInputs: true,
    },
  };
})();

const portableConsumer = `
import { COLLECTION_PROGRAM_IDS, getCollectionProgramSource } from "./shared/wls-library";
import { executeCollection } from "./shared/wls-collection-vm";
const examples = ${JSON.stringify(examples)};
const portable = examples.map(({ id, inputs }) => {
  const source = getCollectionProgramSource(id);
  return { id, source, value: executeCollection(source, inputs).value };
});
`;
const sourceConsumer = `${portableConsumer}
import { readCollectionProgramSource } from "./shared/wls-library-node";
const direct = [];
for (const { id, inputs } of examples) {
  try {
    const source = await readCollectionProgramSource(id);
    direct.push({ id, source, value: executeCollection(source, inputs).value });
  } catch (error) {
    direct.push({ id, error: { code: error.code, path: error.path, message: error.message } });
  }
}
console.log(JSON.stringify({ cwd: process.cwd(), moduleURL: import.meta.url, ids: COLLECTION_PROGRAM_IDS, portable, direct }));
`;

// Observe the real builtin in this child only, after module loading. Synchronise
// named ESM bindings so the copied Node entry's readFile is observed as well.
const rejectionConsumer = `
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";
import { getCollectionProgramSource } from "./shared/wls-library";
import { readCollectionProgramSource } from "./shared/wls-library-node";
const ids = JSON.parse(process.argv[2]);
const reads = [];
const originalReadFile = fs.readFile;
fs.readFile = function (file, ...args) {
  reads.push(file instanceof URL ? fileURLToPath(file) : String(file));
  return originalReadFile.call(this, file, ...args);
};
syncBuiltinESMExports();
const entries = { portable: getCollectionProgramSource, direct: readCollectionProgramSource };
async function attempt(entry, id) {
  const before = reads.length;
  try {
    const source = await entries[entry](id);
    return { entry, id, source, reads: reads.slice(before) };
  } catch (error) {
    return { entry, id, error: { name: error.name, message: error.message, code: error.code }, reads: reads.slice(before) };
  }
}
try {
  const rejected = [];
  for (const entry of Object.keys(entries)) {
    for (const id of ids) rejected.push(await attempt(entry, id));
  }
  // Positive controls prove the observer sees the actual reader, including
  // failed reads, rather than passing because it patched an unused binding.
  const controls = [];
  for (const entry of Object.keys(entries)) controls.push(await attempt(entry, "string.contains"));
  console.log(JSON.stringify({ cwd: process.cwd(), rejected, controls }));
} finally {
  fs.readFile = originalReadFile;
  syncBuiltinESMExports();
}
`;

async function wlsFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    if (entry.isDirectory()) return (await wlsFiles(path.join(directory, entry.name))).map(file => `${entry.name}/${file}`);
    return entry.name.endsWith(".wls") ? [entry.name] : [];
  }));
  return nested.flat().sort();
}

describe("relocated WavelengthScript library distributions", () => {
  let temporary: string;
  let relocated: string;
  let unrelatedCwd: string;
  let canonical: Record<string, string>;

  beforeAll(async () => {
    temporary = await mkdtemp(path.join(tmpdir(), "wls-distribution-"));
    const staging = path.join(temporary, "staging-source-tool");
    relocated = path.join(temporary, "moved source tool");
    unrelatedCwd = path.join(temporary, "unrelated working directory");
    await mkdir(path.join(staging, "shared"), { recursive: true });
    await mkdir(unrelatedCwd);
    // Deliberately no repository symlink, aliases, package resolution or app
    // imports. Only the documented entries and their local TS dependencies.
    for (const file of [
      "wls-library-node.ts", "wls-library.ts", "wls-library-catalogue.ts",
      "wls-library-sources.generated.ts", "wls-collection-vm.ts", "wnsp-model.ts",
      "wls-library-inputs.ts",
      "wls-library-compiler.ts",
    ]) {
      await cp(path.join(repository, "shared", file), path.join(staging, "shared", file));
    }
    await cp(path.join(repository, "shared/wls-library"), path.join(staging, "shared/wls-library"), { recursive: true });
    await writeFile(path.join(staging, "package.json"), '{"type":"module"}');
    await writeFile(path.join(staging, "tsconfig.json"), '{"compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"bundler"}}');
    await writeFile(path.join(staging, "source-consumer.ts"), sourceConsumer);
    await writeFile(path.join(staging, "rejection-consumer.ts"), rejectionConsumer);
    await writeFile(path.join(staging, "portable-consumer.ts"), `${portableConsumer}
console.log(JSON.stringify({ cwd: process.cwd(), ids: COLLECTION_PROGRAM_IDS, portable }));
`);
    await rename(staging, relocated);
    canonical = Object.fromEntries(await Promise.all(examples.map(async ({ id, file }) =>
      [id, await readFile(path.join(repository, "shared/wls-library", file), "utf8")],
    )));
  });

  afterAll(async () => {
    if (temporary) await rm(temporary, { recursive: true, force: true });
  });

  async function runSourceConsumer() {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      tsx, "--tsconfig", path.join(relocated, "tsconfig.json"), path.join(relocated, "source-consumer.ts"),
    ], { cwd: unrelatedCwd, timeout: 15_000, env: { ...process.env, NODE_OPTIONS: "" } });
    expect(stderr).toBe("");
    return JSON.parse(stdout);
  }

  function expectedPrograms() {
    return examples.map(({ id, value }) => ({ id, source: canonical[id], value }));
  }

  it("ships every canonical .wls file and executes all nine IDs through both moved source entries", async () => {
    const originals = await wlsFiles(path.join(repository, "shared/wls-library"));
    expect(originals).toEqual(allFiles);
    expect(await wlsFiles(path.join(relocated, "shared/wls-library"))).toEqual(originals);
    for (const file of originals) {
      expect(await readFile(path.join(relocated, "shared/wls-library", file)))
        .toEqual(await readFile(path.join(repository, "shared/wls-library", file)));
    }
    const result = await runSourceConsumer();
    expect(result.cwd).toBe(unrelatedCwd);
    expect(fileURLToPath(result.moduleURL)).toBe(path.join(relocated, "source-consumer.ts"));
    expect(result.ids).toEqual(examples.map(({ id }) => id));
    expect(result.portable).toEqual(expectedPrograms());
    expect(result.direct).toEqual(expectedPrograms());
  }, 20_000);

  it.each(examples)("reports a real missing-file error for omitted $id without a generated-source fallback", async ({ id, file }) => {
    const asset = path.join(relocated, "shared/wls-library", file);
    const held = path.join(temporary, "omitted.wls");
    await rename(asset, held);
    try {
      const result = await runSourceConsumer();
      expect(result.portable).toEqual(expectedPrograms());
      expect(result.direct).toEqual(expectedPrograms().map(program => program.id === id
        ? { id, error: { code: "ENOENT", path: asset, message: expect.stringContaining("ENOENT") } }
        : program));
    } finally {
      await rename(held, asset);
    }
  }, 20_000);

  it.each([false, true])("rejects non-catalogue IDs through both copied entries before reading files (assets absent: %s)", async absent => {
    const assets = path.join(relocated, "shared/wls-library");
    const held = path.join(temporary, "held-assets");
    const asset = path.join(assets, "string/contains.wls");
    const ids = [
      "", "contains", "string.Contains", "recipient.add ", "string.missing",
      "__proto__", "constructor", "toString", "hasOwnProperty",
      "../string/contains.wls", "../wls-library/string/contains.wls",
      "string/contains.wls", "./shared/wls-library/string/contains.wls",
      asset, pathToFileURL(asset).href,
      "https://example.invalid/program.wls", "http://example.invalid/program.wls",
    ];
    if (absent) await rename(assets, held);
    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        tsx, "--tsconfig", path.join(relocated, "tsconfig.json"),
        path.join(relocated, "rejection-consumer.ts"), JSON.stringify(ids),
      ], { cwd: unrelatedCwd, timeout: 15_000, env: { ...process.env, NODE_OPTIONS: "" } });
      expect(stderr).toBe("");
      const result = JSON.parse(stdout);
      expect(result.cwd).toBe(unrelatedCwd);
      expect(result.rejected).toEqual(["portable", "direct"].flatMap(entry => ids.map(id => ({
        entry, id, error: { name: "CollectionVMError", message: "Unknown collection library program." }, reads: [],
      }))));
      expect(result.controls).toEqual([
        { entry: "portable", id: "string.contains", source: canonical["string.contains"], reads: [] },
        absent
          ? { entry: "direct", id: "string.contains", error: { name: "Error", code: "ENOENT", message: expect.stringContaining("ENOENT") }, reads: [asset] }
          : { entry: "direct", id: "string.contains", source: canonical["string.contains"], reads: [asset] },
      ]);
    } finally {
      if (absent) await rename(held, assets);
    }
  }, 20_000);

  it("runs a standalone portable Node bundle after removing the entire source-tool distribution", async () => {
    const bundleDirectory = path.join(temporary, "bundle only");
    await mkdir(bundleDirectory);
    const bundle = path.join(bundleDirectory, "consumer.mjs");
    const result = await build({
      absWorkingDir: relocated, entryPoints: ["portable-consumer.ts"],
      outfile: bundle, bundle: true, platform: "node", format: "esm",
      metafile: true, logLevel: "silent",
    });
    expect(Object.values(result.metafile!.outputs).flatMap(output => output.imports)).toEqual([]);
    for (const input of Object.keys(result.metafile!.inputs)) {
      expect(path.relative(relocated, path.resolve(relocated, input))).not.toMatch(/^\.\./);
      expect(input).not.toMatch(/wls-library-node|\.wls$/);
    }
    await rm(relocated, { recursive: true });
    expect(await readdir(bundleDirectory)).toEqual(["consumer.mjs"]);
    expect(await wlsFiles(temporary)).toEqual([]);
    const { stdout, stderr } = await execFileAsync(process.execPath, [bundle], {
      cwd: unrelatedCwd, timeout: 15_000, env: { ...process.env, NODE_OPTIONS: "" },
    });
    expect(stderr).toBe("");
    expect(JSON.parse(stdout)).toEqual({
      cwd: unrelatedCwd, ids: examples.map(({ id }) => id), portable: expectedPrograms(),
    });
  }, 20_000);

  it("imports a standalone ESM portable library from an unbundled caller without copied sources or .wls assets", async () => {
    // Own source tree: the bundled-consumer test above deletes its distribution.
    const esmTemporary = await mkdtemp(path.join(tmpdir(), "wls-esm-library-distribution-"));
    try {
      const sourceDirectory = path.join(esmTemporary, "copied source tool");
      const bundleDirectory = path.join(esmTemporary, "library only");
      const esmCwd = path.join(esmTemporary, "unrelated working directory");
      await mkdir(path.join(sourceDirectory, "shared"), { recursive: true });
      await mkdir(bundleDirectory);
      await mkdir(esmCwd);
      for (const file of [
        "wls-library.ts", "wls-library-catalogue.ts",
        "wls-library-sources.generated.ts", "wls-collection-vm.ts", "wnsp-model.ts",
        "wls-library-inputs.ts",
        "wls-library-compiler.ts",
      ]) {
        await cp(path.join(repository, "shared", file), path.join(sourceDirectory, "shared", file));
      }
      await cp(path.join(repository, "shared/wls-library"), path.join(sourceDirectory, "shared/wls-library"), { recursive: true });
      expect(await wlsFiles(sourceDirectory)).toEqual(allFiles.map(file => `shared/wls-library/${file}`));
      await writeFile(path.join(sourceDirectory, "portable-library.ts"), `
export * from "./shared/wls-library";
export * from "./shared/wls-collection-vm";
`);
      const library = path.join(bundleDirectory, "library.mjs");
      const libraryURL = pathToFileURL(library).href;
      const result = await build({
        absWorkingDir: sourceDirectory, entryPoints: ["portable-library.ts"],
        outfile: library, bundle: true, platform: "node", format: "esm",
        metafile: true, logLevel: "silent",
      });
      expect(Object.values(result.metafile!.outputs).flatMap(output => output.imports)).toEqual([]);
      for (const input of Object.keys(result.metafile!.inputs)) {
        expect(path.relative(sourceDirectory, path.resolve(sourceDirectory, input))).not.toMatch(/^\.\./);
        expect(input).not.toMatch(/wls-library-node|\.wls$/);
      }
      await rm(sourceDirectory, { recursive: true });
      expect((await readdir(esmTemporary)).sort()).toEqual(["library only", "unrelated working directory"]);
      expect(await readdir(bundleDirectory)).toEqual(["library.mjs"]);
      expect(await readdir(esmCwd)).toEqual([]);
      expect(await wlsFiles(esmTemporary)).toEqual([]);
      // Written only after deletion, and never passed to esbuild or a TS loader:
      // Node must link the library's real named exports across a file-URL import.
      const caller = path.join(esmCwd, "caller.mjs");
      await writeFile(caller, `
import * as api from ${JSON.stringify(libraryURL)};
import {
  COLLECTION_LIMITS, COLLECTION_PROFILE, COLLECTION_PROGRAM_IDS, CollectionVMError,
  compileCollection, executeCollection, getCollectionProgramSource,
} from ${JSON.stringify(libraryURL)};
const examples = ${JSON.stringify(examples)};
const portable = examples.map(({ id, inputs }) => {
  const source = getCollectionProgramSource(id);
  const code = compileCollection(source);
  return {
    id, source, value: executeCollection(source, inputs).value,
    compiled: Array.isArray(code) && code.length > 0 && Object.isFrozen(code),
  };
});
let typedError = false;
try { compileCollection("invalid profile"); }
catch (error) { typedError = error instanceof CollectionVMError; }
${frozenListConsumer}
${emptyConcatConsumer}
${selfConcatConsumer}
${frozenSelfConcatConsumer}
${additionFailureRecoveryConsumer}
// Keep these checks in the ordinary ESM caller, after source/asset removal:
// returned lists and caller-owned inputs must not share mutable storage.
const snapshots = [
  { id: "return input", source: ${JSON.stringify(returnItems)} },
  { id: "append item", source: ${JSON.stringify(program('LIST_PUSH ["items","value"]\nRETURN ["items"]'))} },
  { id: "existing recipient", source: getCollectionProgramSource("recipient.add"), value: "alpha" },
].map(({ id, source, value = "beta" }) => {
  const items = ["alpha"];
  const output = executeCollection(source, { items, value }).value;
  const inputAfterExecution = items.slice();
  const outputAfterExecution = output.slice();
  items.push("caller-only");
  const outputAfterInputMutation = output.slice();
  output[0] = "changed";
  output.push("result-only");
  return {
    id, inputAfterExecution, outputAfterExecution, outputAfterInputMutation,
    inputAfterOutputMutation: items, mutatedOutput: output,
  };
});
const left = ["alpha", "beta", "alpha"];
const right = ["beta", "gamma", "beta"];
const joined = executeCollection(getCollectionProgramSource("string.concat"), { left, right }).value;
const concatSnapshot = {
  leftAfterExecution: left.slice(),
  rightAfterExecution: right.slice(),
  outputAfterExecution: joined.slice(),
};
left[0] = "left-changed";
left.push("left-only");
concatSnapshot.rightAfterLeftMutation = right.slice();
concatSnapshot.outputAfterLeftMutation = joined.slice();
right[0] = "right-changed";
right.push("right-only");
concatSnapshot.leftAfterRightMutation = left.slice();
concatSnapshot.outputAfterRightMutation = joined.slice();
// Change positions from both input halves, then grow the returned list.
joined[0] = "result-left-changed";
joined[3] = "result-right-changed";
joined.push("result-only");
concatSnapshot.leftAfterOutputMutation = left.slice();
concatSnapshot.rightAfterOutputMutation = right.slice();
concatSnapshot.mutatedOutput = joined.slice();
const fullInput = ${JSON.stringify(fullCollection)};
let appendFailure = null;
try {
  executeCollection(getCollectionProgramSource("recipient.add"), { items: fullInput, value: "overflow" });
} catch (error) {
  appendFailure = {
    name: error.name, message: error.message, typed: error instanceof CollectionVMError,
  };
}
console.log(JSON.stringify({
  cwd: process.cwd(), moduleURL: import.meta.url,
  exports: Object.fromEntries(Object.keys(api).sort().map(key => [key, typeof api[key]])),
  ids: COLLECTION_PROGRAM_IDS, profile: COLLECTION_PROFILE, limits: COLLECTION_LIMITS,
  portable, typedError, snapshots, frozenSnapshots, differentRecipientAdditions, emptyConcatSnapshots, selfConcatSnapshot, oversizedSelfConcatSnapshot, frozenSelfConcatSnapshot, concatSnapshot, frozenLimitFailures, concatFailureRecovery, additionFailureRecovery, fullInput, appendFailure,
  environmentKeys: Object.keys(process.env).sort(),
}));
`);
      const imported = await execFileAsync(process.execPath, [caller], {
        cwd: esmCwd, timeout: 15_000, env: { NODE_OPTIONS: "" },
      });
      expect(imported.stderr).toBe("");
      expect(JSON.parse(imported.stdout)).toEqual({
        cwd: esmCwd, moduleURL: pathToFileURL(caller).href,
        exports: {
          COLLECTION_LIMITS: "object", COLLECTION_PROFILE: "string",
          COLLECTION_PROGRAM_IDS: "object", CollectionVMError: "function",
          LIBRARY_PROGRAM_IDS: "object", MAP_PROGRAM_IDS: "object", MAP_V0_4_PROGRAM_IDS: "object",
          SET_PROGRAM_IDS: "object", MAP_SET_V0_5_PROGRAM_IDS: "object",
          MAP_SET_V0_6_PROGRAM_IDS: "object",
          MAP_SET_V0_7_PROGRAM_IDS: "object",
          compileCollection: "function", executeCollection: "function",
          getCollectionProgramSource: "function",
        },
        ids: examples.map(({ id }) => id), profile: "WLS-COLLECTION/1",
        limits: { items: 20, stringLength: 256, sourceLength: 8192, instructions: 128, cycles: 1024, registers: 32 },
        portable: expectedPrograms().map(program => ({ ...program, compiled: true })),
        snapshots: [
          { id: "return input", output: ["alpha"], mutatedOutput: ["changed", "result-only"] },
          { id: "append item", output: ["alpha", "beta"], mutatedOutput: ["changed", "beta", "result-only"] },
          { id: "existing recipient", output: ["alpha"], mutatedOutput: ["changed", "result-only"] },
        ].map(({ id, output, mutatedOutput }) => ({
          id, inputAfterExecution: ["alpha"],
          outputAfterExecution: output, outputAfterInputMutation: output,
          inputAfterOutputMutation: ["alpha", "caller-only"], mutatedOutput,
        })),
        frozenSnapshots: expectedFrozenSnapshots,
        differentRecipientAdditions: expectedDifferentRecipientAdditions,
        emptyConcatSnapshots: expectedEmptyConcatSnapshots,
        selfConcatSnapshot: expectedSelfConcatSnapshot,
        oversizedSelfConcatSnapshot: expectedOversizedSelfConcatSnapshot,
        frozenSelfConcatSnapshot: expectedFrozenSelfConcatSnapshot,
        concatSnapshot: expectedConcatSnapshot,
        frozenLimitFailures: expectedFrozenLimitFailures,
        concatFailureRecovery: expectedConcatFailureRecovery,
        additionFailureRecovery: expectedAdditionFailureRecovery,
        fullInput: fullCollection,
        appendFailure: {
          name: "CollectionVMError", message: "Select at most 20 recipients.", typed: true,
        },
        typedError: true, environmentKeys: ["NODE_OPTIONS"],
      });
    } finally {
      await rm(esmTemporary, { recursive: true, force: true });
    }
  }, 20_000);

  it("runs and separately requires CommonJS portable bundles without copied sources or .wls assets", async () => {
    // Separate from the ESM fixture: neither bundle test may depend on the other
    // leaving its copied source distribution intact.
    const commonjsTemporary = await mkdtemp(path.join(tmpdir(), "wls-commonjs-distribution-"));
    try {
      const sourceDirectory = path.join(commonjsTemporary, "copied source tool");
      const bundleDirectory = path.join(commonjsTemporary, "bundle only");
      const commonjsCwd = path.join(commonjsTemporary, "unrelated working directory");
      await mkdir(path.join(sourceDirectory, "shared"), { recursive: true });
      await mkdir(bundleDirectory);
      await mkdir(commonjsCwd);
      for (const file of [
        "wls-library.ts", "wls-library-catalogue.ts",
        "wls-library-sources.generated.ts", "wls-collection-vm.ts", "wnsp-model.ts",
        "wls-library-inputs.ts",
        "wls-library-compiler.ts",
      ]) {
        await cp(path.join(repository, "shared", file), path.join(sourceDirectory, "shared", file));
      }
      await cp(path.join(repository, "shared/wls-library"), path.join(sourceDirectory, "shared/wls-library"), { recursive: true });
      expect(await wlsFiles(sourceDirectory)).toEqual(allFiles.map(file => `shared/wls-library/${file}`));
      await writeFile(path.join(sourceDirectory, "portable-consumer.ts"), `${portableConsumer}
console.log(JSON.stringify({ cwd: process.cwd(), filename: __filename, ids: COLLECTION_PROGRAM_IDS, portable }));
`);
      await writeFile(path.join(sourceDirectory, "portable-library.ts"), `
export * from "./shared/wls-library";
export * from "./shared/wls-collection-vm";
`);
      const bundle = path.join(bundleDirectory, "consumer.cjs");
      const library = path.join(bundleDirectory, "library.cjs");
      for (const [entryPoint, outfile] of [
        ["portable-consumer.ts", bundle], ["portable-library.ts", library],
      ]) {
        const result = await build({
          absWorkingDir: sourceDirectory, entryPoints: [entryPoint],
          outfile, bundle: true, platform: "node", format: "cjs",
          metafile: true, logLevel: "silent",
        });
        expect(Object.values(result.metafile!.outputs).flatMap(output => output.imports)).toEqual([]);
        for (const input of Object.keys(result.metafile!.inputs)) {
          expect(path.relative(sourceDirectory, path.resolve(sourceDirectory, input))).not.toMatch(/^\.\./);
          expect(input).not.toMatch(/wls-library-node|\.wls$/);
        }
      }
      await rm(sourceDirectory, { recursive: true });
      expect((await readdir(commonjsTemporary)).sort()).toEqual(["bundle only", "unrelated working directory"]);
      expect((await readdir(bundleDirectory)).sort()).toEqual(["consumer.cjs", "library.cjs"]);
      expect(await readdir(commonjsCwd)).toEqual([]);
      expect(await wlsFiles(commonjsTemporary)).toEqual([]);
      // This caller is not bundled: ordinary CommonJS require must return the
      // portable API after all copied TypeScript and canonical assets are gone.
      const caller = path.join(commonjsCwd, "caller.cjs");
      await writeFile(caller, `
const libraryPath = ${JSON.stringify(library)};
const api = require(libraryPath);
const examples = ${JSON.stringify(examples)};
const portable = examples.map(({ id, inputs }) => {
  const source = api.getCollectionProgramSource(id);
  const code = api.compileCollection(source);
  return {
    id, source, value: api.executeCollection(source, inputs).value,
    compiled: Array.isArray(code) && code.length > 0 && Object.isFrozen(code),
  };
});
let typedError = false;
try { api.compileCollection("invalid profile"); }
catch (error) { typedError = error instanceof api.CollectionVMError; }
${frozenListConsumer}
${emptyConcatConsumer}
${selfConcatConsumer}
${frozenSelfConcatConsumer}
${additionFailureRecoveryConsumer}
// Exercise the exported API from this unbundled caller, after the copied
// implementation and assets are gone. Both pass-through and growing results
// must be independent of the caller's mutable list in both directions.
const snapshots = [
  { id: "return input", source: ${JSON.stringify(returnItems)} },
  { id: "append item", source: ${JSON.stringify(program('LIST_PUSH ["items","value"]\nRETURN ["items"]'))} },
  { id: "existing recipient", source: api.getCollectionProgramSource("recipient.add"), value: "alpha" },
].map(({ id, source, value = "beta" }) => {
  const items = ["alpha"];
  const output = api.executeCollection(source, { items, value }).value;
  const inputAfterExecution = items.slice();
  const outputAfterExecution = output.slice();
  items.push("caller-only");
  const outputAfterInputMutation = output.slice();
  output[0] = "changed";
  output.push("result-only");
  return {
    id, inputAfterExecution, outputAfterExecution, outputAfterInputMutation,
    inputAfterOutputMutation: items, mutatedOutput: output,
  };
});
// Concatenation has two independently owned inputs: neither may alias the
// result or be changed by execution, result mutation, or the other input.
const concatSnapshots = (() => {
const left = ["alpha", "alpha"];
const right = ["beta", "alpha"];
const joined = api.executeCollection(
  api.getCollectionProgramSource("string.concat"), { left, right },
).value;
const captureConcat = () => ({
  left: left.slice(), right: right.slice(), output: joined.slice(),
});
const concatSnapshots = { afterExecution: captureConcat() };
joined[0] = "changed";
joined.push("result-only");
concatSnapshots.afterOutputMutation = captureConcat();
left[0] = "left-changed";
left.push("left-only");
concatSnapshots.afterLeftMutation = captureConcat();
right[0] = "right-changed";
right.push("right-only");
concatSnapshots.afterRightMutation = captureConcat();
return concatSnapshots;
})();
// Also check caller mutations before mutating the result, independently.
const left = ["alpha", "beta", "alpha"];
const right = ["beta", "gamma", "beta"];
const joined = api.executeCollection(api.getCollectionProgramSource("string.concat"), { left, right }).value;
const concatSnapshot = {
  leftAfterExecution: left.slice(),
  rightAfterExecution: right.slice(),
  outputAfterExecution: joined.slice(),
};
left[0] = "left-changed";
left.push("left-only");
concatSnapshot.rightAfterLeftMutation = right.slice();
concatSnapshot.outputAfterLeftMutation = joined.slice();
right[0] = "right-changed";
right.push("right-only");
concatSnapshot.leftAfterRightMutation = left.slice();
concatSnapshot.outputAfterRightMutation = joined.slice();
// Change positions from both input halves, then grow the returned list.
joined[0] = "result-left-changed";
joined[3] = "result-right-changed";
joined.push("result-only");
concatSnapshot.leftAfterOutputMutation = left.slice();
concatSnapshot.rightAfterOutputMutation = right.slice();
concatSnapshot.mutatedOutput = joined.slice();
const fullInput = ${JSON.stringify(fullCollection)};
let appendFailure = null;
try {
  api.executeCollection(api.getCollectionProgramSource("recipient.add"), { items: fullInput, value: "overflow" });
} catch (error) {
  appendFailure = {
    name: error.name, message: error.message, typed: error instanceof api.CollectionVMError,
  };
}
console.log(JSON.stringify({
  cwd: process.cwd(), filename: __filename, resolvedLibrary: require.resolve(libraryPath),
  exports: Object.fromEntries(Object.keys(api).sort().map(key => [key, typeof api[key]])),
  ids: api.COLLECTION_PROGRAM_IDS, profile: api.COLLECTION_PROFILE,
  portable, typedError, snapshots, concatSnapshots, frozenSnapshots, differentRecipientAdditions, emptyConcatSnapshots, selfConcatSnapshot, oversizedSelfConcatSnapshot, frozenSelfConcatSnapshot, concatSnapshot, frozenLimitFailures, concatFailureRecovery, additionFailureRecovery, fullInput, appendFailure,
  environmentKeys: Object.keys(process.env).sort(),
}));
`);
      const { stdout, stderr } = await execFileAsync(process.execPath, [bundle], {
        cwd: commonjsCwd, timeout: 15_000, env: { NODE_OPTIONS: "" },
      });
      expect(stderr).toBe("");
      expect(JSON.parse(stdout)).toEqual({
        cwd: commonjsCwd, filename: bundle,
        ids: examples.map(({ id }) => id), portable: expectedPrograms(),
      });
      const required = await execFileAsync(process.execPath, [caller], {
        cwd: commonjsCwd, timeout: 15_000, env: { NODE_OPTIONS: "" },
      });
      expect(required.stderr).toBe("");
      expect(JSON.parse(required.stdout)).toEqual({
        cwd: commonjsCwd, filename: caller, resolvedLibrary: library,
        exports: {
          COLLECTION_LIMITS: "object", COLLECTION_PROFILE: "string",
          COLLECTION_PROGRAM_IDS: "object", CollectionVMError: "function",
          LIBRARY_PROGRAM_IDS: "object", MAP_PROGRAM_IDS: "object", MAP_V0_4_PROGRAM_IDS: "object",
          SET_PROGRAM_IDS: "object", MAP_SET_V0_5_PROGRAM_IDS: "object",
          MAP_SET_V0_6_PROGRAM_IDS: "object",
          MAP_SET_V0_7_PROGRAM_IDS: "object",
          compileCollection: "function", executeCollection: "function",
          getCollectionProgramSource: "function",
        },
        ids: examples.map(({ id }) => id), profile: "WLS-COLLECTION/1",
        portable: expectedPrograms().map(program => ({ ...program, compiled: true })),
        concatSnapshots: {
          afterExecution: {
            left: ["alpha", "alpha"], right: ["beta", "alpha"],
            output: ["alpha", "alpha", "beta", "alpha"],
          },
          afterOutputMutation: {
            left: ["alpha", "alpha"], right: ["beta", "alpha"],
            output: ["changed", "alpha", "beta", "alpha", "result-only"],
          },
          afterLeftMutation: {
            left: ["left-changed", "alpha", "left-only"], right: ["beta", "alpha"],
            output: ["changed", "alpha", "beta", "alpha", "result-only"],
          },
          afterRightMutation: {
            left: ["left-changed", "alpha", "left-only"], right: ["right-changed", "alpha", "right-only"],
            output: ["changed", "alpha", "beta", "alpha", "result-only"],
          },
        },
        snapshots: [
          { id: "return input", output: ["alpha"], mutatedOutput: ["changed", "result-only"] },
          { id: "append item", output: ["alpha", "beta"], mutatedOutput: ["changed", "beta", "result-only"] },
          { id: "existing recipient", output: ["alpha"], mutatedOutput: ["changed", "result-only"] },
        ].map(({ id, output, mutatedOutput }) => ({
          id, inputAfterExecution: ["alpha"],
          outputAfterExecution: output, outputAfterInputMutation: output,
          inputAfterOutputMutation: ["alpha", "caller-only"], mutatedOutput,
        })),
        frozenSnapshots: expectedFrozenSnapshots,
        differentRecipientAdditions: expectedDifferentRecipientAdditions,
        emptyConcatSnapshots: expectedEmptyConcatSnapshots,
        selfConcatSnapshot: expectedSelfConcatSnapshot,
        oversizedSelfConcatSnapshot: expectedOversizedSelfConcatSnapshot,
        frozenSelfConcatSnapshot: expectedFrozenSelfConcatSnapshot,
        concatSnapshot: expectedConcatSnapshot,
        frozenLimitFailures: expectedFrozenLimitFailures,
        concatFailureRecovery: expectedConcatFailureRecovery,
        additionFailureRecovery: expectedAdditionFailureRecovery,
        fullInput: fullCollection,
        appendFailure: {
          name: "CollectionVMError", message: "Select at most 20 recipients.", typed: true,
        },
        typedError: true, environmentKeys: ["NODE_OPTIONS"],
      });
      const safety = await execFileAsync(process.execPath, ["--eval", collectionSafetyConsumer, library], {
        cwd: commonjsCwd, timeout: 15_000, env: { NODE_OPTIONS: "" },
      });
      expect(safety.stderr).toBe("");
      expect(JSON.parse(safety.stdout)).toEqual({
        environmentKeys: ["NODE_OPTIONS"],
        result: {
          capabilities: Array(5).fill("undefined"),
          rejected: [
            ...compileFailures.flatMap(({ id, message }) => ["compile", "execute"].map(entry => ({
              id, entry, typed: true, name: "CollectionVMError", message,
            }))),
            ...executionFailures.map(({ id, message }) => ({
              id, entry: "execute", typed: true, name: "CollectionVMError", message,
            })),
          ],
          accepted: boundaryControls.map(({ id, value, cycles }) => ({ id, value, cycles, compiled: true })),
        },
      });
    } finally {
      await rm(commonjsTemporary, { recursive: true, force: true });
    }
  }, 20_000);
});

describe.each([
  { format: "esm" as const, extension: "mjs" },
  { format: "cjs" as const, extension: "cjs" },
])("standalone $format collection text semantics", ({ format, extension }) => {
  it("preserves exact strings, duplicates and order through library exports after source/assets removal", async () => {
    const temporary = await mkdtemp(path.join(tmpdir(), `wls-${format}-text-`));
    try {
      const sourceDirectory = path.join(temporary, "copied source tool");
      const bundleDirectory = path.join(temporary, "bundle only");
      const unrelatedCwd = path.join(temporary, "unrelated working directory");
      await mkdir(path.join(sourceDirectory, "shared"), { recursive: true });
      await mkdir(bundleDirectory);
      await mkdir(unrelatedCwd);
      for (const file of [
        "wls-library.ts", "wls-library-catalogue.ts",
        "wls-library-sources.generated.ts", "wls-collection-vm.ts", "wnsp-model.ts",
        "wls-library-inputs.ts",
        "wls-library-compiler.ts",
      ]) {
        await cp(path.join(repository, "shared", file), path.join(sourceDirectory, "shared", file));
      }
      await cp(path.join(repository, "shared/wls-library"), path.join(sourceDirectory, "shared/wls-library"), { recursive: true });
      await writeFile(path.join(sourceDirectory, "library.ts"), `
export * from "./shared/wls-library";
export * from "./shared/wls-collection-vm";
`);
      const library = path.join(bundleDirectory, `library.${extension}`);
      const built = await build({
        absWorkingDir: sourceDirectory, entryPoints: ["library.ts"],
        outfile: library, bundle: true, platform: "node", format,
        metafile: true, logLevel: "silent",
      });
      expect(Object.values(built.metafile!.outputs).flatMap(output => output.imports)).toEqual([]);
      for (const input of Object.keys(built.metafile!.inputs)) {
        expect(path.relative(sourceDirectory, path.resolve(sourceDirectory, input))).not.toMatch(/^\.\./);
        expect(input).not.toMatch(/wls-library-node|\.wls$/);
      }
      await rm(sourceDirectory, { recursive: true });
      expect((await readdir(temporary)).sort()).toEqual(["bundle only", "unrelated working directory"]);
      expect(await readdir(bundleDirectory)).toEqual([`library.${extension}`]);
      expect(await wlsFiles(temporary)).toEqual([]);
      // An ordinary, unbundled caller uses only the exported API. Do not send
      // expected results to the child or import the repository VM as an oracle.
      const caller = path.join(unrelatedCwd, `caller.${extension}`);
      await writeFile(caller, `
${format === "esm"
  ? `import * as api from ${JSON.stringify(pathToFileURL(library).href)};`
  : `const api = require(${JSON.stringify(library)});`}
const cases = ${JSON.stringify(textSemantics.map(({ name, id, inputs }) => ({ name, id, inputs })))};
const results = cases.map(({ name, id, inputs }) => ({
  name, value: api.executeCollection(api.getCollectionProgramSource(id), inputs).value,
}));
console.log(JSON.stringify({ cwd: process.cwd(), results }));
`);
      const { stdout, stderr } = await execFileAsync(process.execPath, [caller], {
        cwd: unrelatedCwd, timeout: 5_000, killSignal: "SIGKILL",
        maxBuffer: 64 * 1024, env: { NODE_OPTIONS: "" },
      });
      expect(stderr).toBe("");
      const result = JSON.parse(stdout);
      expect(result.cwd).toBe(unrelatedCwd);
      expect(result.results).toHaveLength(textSemantics.length);
      for (const [index, { name, value }] of textSemantics.entries()) {
        expect(result.results[index], `${format}: ${name}`).toEqual({ name, value });
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 15_000);
});

describe.each([
  { format: "esm" as const, extension: "mjs" },
  { format: "cjs" as const, extension: "cjs" },
])("standalone $format collection safety limits", ({ format, extension }) => {
  const returnItems = 'WLS-COLLECTION/1\nRETURN ["items"]';
  const pushItem = 'WLS-COLLECTION/1\nLIST_PUSH ["items","value"]\nRETURN ["items"]';
  const instructionProgram = (count: number) =>
    'WLS-COLLECTION/1\n' + 'CONST ["x",0]\n'.repeat(count - 1) + 'RETURN ["x"]';
  // Literal boundaries are independent of the implementation's exported limits.
  const twentyItems = Array.from({ length: 20 }, (_, i) => `item-${i}`);
  const cases = [
    {
      name: "rejects a non-terminating loop with the cycle-limit error",
      source: 'WLS-COLLECTION/1\n:loop\nJUMP ["loop"]\nRETURN ["items"]',
      inputsExpression: '{ items: [] }',
      controlSource: returnItems, controlInputs: { items: twentyItems },
      controlValue: twentyItems,
      controlInstructions: 1,
      message: "Collection cycle limit exceeded.",
    },
    {
      name: "rejects 21 input items with the item-limit error",
      source: returnItems, inputsExpression: JSON.stringify({ items: [...twentyItems, "overflow"] }),
      controlSource: returnItems, controlInputs: { items: twentyItems },
      controlValue: twentyItems,
      controlInstructions: 1,
      message: "Select at most 20 recipients.",
    },
    {
      name: "rejects growth to 21 items with the item-limit error",
      source: pushItem, inputsExpression: JSON.stringify({ items: twentyItems, value: "overflow" }),
      controlSource: pushItem,
      controlInputs: { items: twentyItems.slice(0, 19), value: "item-19" },
      controlValue: twentyItems,
      controlInstructions: 2,
      message: "Select at most 20 recipients.",
    },
    ...[
      // Build these in the child: JSON serialization would replace holes and
      // undefined elements with null, testing a different validation branch.
      { name: "a sparse list", itemsExpression: '["first", , "last"]' },
      { name: "a numeric item", itemsExpression: '["first", 1]' },
      { name: "a boolean item", itemsExpression: '["first", true]' },
      { name: "a null item", itemsExpression: '["first", null]' },
      { name: "an undefined item", itemsExpression: '["first", undefined]' },
      { name: "an object item", itemsExpression: '["first", {}]' },
      { name: "a nested list item", itemsExpression: '["first", ["nested"]]' },
      { name: "a 257-character item", itemsExpression: '["first", "x".repeat(257)]' },
    ].map(({ name, itemsExpression }) => ({
      name: `rejects ${name} with the item-validation error`,
      source: returnItems, inputsExpression: `{ items: ${itemsExpression} }`,
      controlSource: returnItems,
      controlInputs: { items: ["first", "x".repeat(256)] },
      controlValue: ["first", "x".repeat(256)],
      controlInstructions: 1,
      message: "Invalid collection item.",
    })),
    {
      name: "rejects 8193 source characters but accepts exactly 8192",
      // Whitespace changes source length without adding instructions or literals.
      source: returnItems.padEnd(8193, " "), inputsExpression: '{ items: [] }',
      controlSource: returnItems.padEnd(8192, " "), controlInputs: { items: [] },
      controlValue: [], controlInstructions: 1,
      message: "Collection source is too large.",
    },
    {
      name: "rejects 129 instructions but accepts exactly 128",
      // Reuse one register and stay well below 8192 source characters.
      source: instructionProgram(129), inputsExpression: '{}',
      controlSource: instructionProgram(128), controlInputs: {},
      controlValue: 0, controlInstructions: 128,
      message: "Collection instruction limit exceeded.",
    },
  ];

  it.each(cases)("$name", async ({ source, inputsExpression, controlSource, controlInputs, controlValue, controlInstructions, message }) => {
    const temporary = await mkdtemp(path.join(tmpdir(), `wls-${format}-limits-`));
    try {
      const sourceDirectory = path.join(temporary, "copied source tool");
      const bundleDirectory = path.join(temporary, "bundle only");
      const unrelatedCwd = path.join(temporary, "unrelated working directory");
      await mkdir(path.join(sourceDirectory, "shared"), { recursive: true });
      await mkdir(bundleDirectory);
      await mkdir(unrelatedCwd);
      for (const file of ["wls-collection-vm.ts", "wls-library-compiler.ts", "wls-library-inputs.ts", "wls-library-sources.generated.ts", "wnsp-model.ts"]) {
        await cp(path.join(repository, "shared", file), path.join(sourceDirectory, "shared", file));
      }
      await cp(path.join(repository, "shared/wls-library"), path.join(sourceDirectory, "shared/wls-library"), { recursive: true });
      expect(await wlsFiles(sourceDirectory)).toEqual(allFiles.map(file => `shared/wls-library/${file}`));
      await writeFile(path.join(sourceDirectory, "limits-consumer.ts"), `
import { compileCollection, executeCollection, CollectionVMError } from "./shared/wls-collection-vm";
const controlInstructions = compileCollection(${JSON.stringify(controlSource)}).length;
const control = executeCollection(${JSON.stringify(controlSource)}, ${JSON.stringify(controlInputs)}).value;
let failure = null;
try {
  compileCollection(${JSON.stringify(source)});
  executeCollection(${JSON.stringify(source)}, ${inputsExpression});
} catch (error) {
  failure = { name: error.name, message: error.message, isCollectionVMError: error instanceof CollectionVMError };
}
console.log(JSON.stringify({ cwd: process.cwd(), control, controlInstructions, failure }));
`);
      const bundle = path.join(bundleDirectory, `consumer.${extension}`);
      const result = await build({
        absWorkingDir: sourceDirectory, entryPoints: ["limits-consumer.ts"],
        outfile: bundle, bundle: true, platform: "node", format,
        metafile: true, logLevel: "silent",
      });
      expect(Object.values(result.metafile!.outputs).flatMap(output => output.imports)).toEqual([]);
      for (const input of Object.keys(result.metafile!.inputs)) {
        expect(path.relative(sourceDirectory, path.resolve(sourceDirectory, input))).not.toMatch(/^\.\./);
        expect(input).not.toMatch(/wls-library-node|\.wls$/);
      }
      await rm(sourceDirectory, { recursive: true });
      expect((await readdir(temporary)).sort()).toEqual(["bundle only", "unrelated working directory"]);
      expect(await readdir(bundleDirectory)).toEqual([`consumer.${extension}`]);
      expect(await readdir(unrelatedCwd)).toEqual([]);
      expect(await wlsFiles(temporary)).toEqual([]);
      // A removed cycle guard must kill only this disposable child, not hang
      // Vitest. Timeout, signal, nonzero exit and excess output all fail the test.
      const { stdout, stderr } = await execFileAsync(process.execPath, [bundle], {
        cwd: unrelatedCwd, timeout: 3_000, killSignal: "SIGKILL",
        maxBuffer: 64 * 1024, env: { NODE_OPTIONS: "" },
      });
      expect(stderr).toBe("");
      const output = JSON.parse(stdout);
      expect(output.cwd).toBe(unrelatedCwd);
      expect(output.control).toEqual(controlValue);
      expect(output.controlInstructions).toBe(controlInstructions);
      expect(output.failure).not.toBeNull();
      expect(output.failure.name).toBe("CollectionVMError");
      expect(output.failure.isCollectionVMError).toBe(true);
      expect(output.failure.message).toBe(message);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 15_000);
});
