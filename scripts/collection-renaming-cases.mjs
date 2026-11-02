// Independent expected data, never a second implementation of either operation.
export const renamingPrograms = ["map.renameKeyIfAbsent", "set.replaceIfAbsent"];

export function renamingCases(program) {
  const isSet = program.startsWith("set.");
  const entries = [["b", "one"], ["a", "two"], ["c", "three"]];
  const maximum = Array.from({ length: 20 }, (_, i) =>
    [`k${i}`.padEnd(256, "k"), `v${i}`.padEnd(256, "v")]);
  const destination = "r".repeat(256);
  const cases = [
    ["middle rename", entries, "a", "Ψ", [["b", "one"], ["Ψ", "two"], ["c", "three"]]],
    ["collision preserves destination and source", entries, "a", "b", entries],
    ["missing source in populated input", entries, "missing", "new", entries],
    ["missing source with occupied destination", entries, "missing", "b", entries],
    ["identical source/destination", entries, "a", "a", entries],
    ["empty input", [], "a", "b", []],
    ["empty key and payload", [["", ""], ["a", "payload"]], "", "new", [["new", ""], ["a", "payload"]]],
    ["prototype-like keys", [["__proto__", "x"], ["constructor", "y"]], "__proto__", "toString",
      [["toString", "x"], ["constructor", "y"]]],
    ["Unicode exactness", [["é", "x"], ["e\u0301", "y"], ["🙂", "z"]], "é", "Ψ",
      [["Ψ", "x"], ["e\u0301", "y"], ["🙂", "z"]]],
    ["maximum first", maximum, maximum[0][0], destination, [[destination, maximum[0][1]], ...maximum.slice(1)]],
    ["maximum last", maximum, maximum[19][0], destination, [...maximum.slice(0, 19), [destination, maximum[19][1]]]],
    ["maximum collision", maximum, maximum[0][0], maximum[10][0], maximum],
    ["maximum identical names", maximum, maximum[19][0], maximum[19][0], maximum],
    ["maximum absent source", maximum, "a".repeat(256), destination, maximum],
  ].map(([name, input, source, replacement, expected]) => ({
    name,
    inputs: { [isSet ? "set" : "map"]: { entries: input }, [isSet ? "value" : "key"]: source, replacement },
    // Set semantics discard *all* input payloads, including unchanged entries.
    expected: { entries: isSet ? expected.map(([key]) => [key, ""]) : expected },
  }));

  for (const input of [[], entries]) {
    const base = { [isSet ? "set" : "map"]: { entries: input }, [isSet ? "value" : "key"]: "a", replacement: "b" };
    for (const operand of [isSet ? "value" : "key", "replacement"]) {
      for (const invalid of [undefined, null, false, 1, [], {}, "x".repeat(257)]) {
        const inputs = { ...base, [operand]: invalid };
        if (invalid === undefined) delete inputs[operand];
        cases.push({ name: `reject ${operand}=${JSON.stringify(invalid)} (${input.length} entries)`, inputs, error: true });
      }
    }
  }
  cases.push({
    name: "reject 21 entries",
    inputs: {
      [isSet ? "set" : "map"]: { entries: [...maximum, ["extra", ""]] },
      [isSet ? "value" : "key"]: maximum[0][0], replacement: destination,
    },
    error: true,
  });
  // JSON-representable malformed containers must reach both the real editor
  // and native structured cloning. These are literal error oracles, not VM
  // output reused as an expectation. Put bad entries after valid members so
  // early collision/identity/absence returns cannot hide invalid stored data.
  const malformed = [
    ["duplicate key", { entries: [...entries, ["a", "different"]] }, "Duplicate map input key."],
    ["duplicate empty key", { entries: [["", ""], ["", "other"]] }, "Duplicate map input key."],
    ["empty pair", { entries: [...entries, []] }, "Invalid map key or value."],
    ["short pair", { entries: [...entries, ["d"]] }, "Invalid map key or value."],
    ["long pair", { entries: [...entries, ["d", "four", "extra"]] }, "Invalid map entry array."],
    ...[null, false, 1, "pair", {}].map(pair =>
      [`non-array pair ${JSON.stringify(pair)}`, { entries: [...entries, pair] }, "Invalid map entry array."]),
    ...[null, false, 1, [], {}].flatMap(value => [
      [`non-string stored key ${JSON.stringify(value)}`, { entries: [...entries, [value, "four"]] }, "Invalid map key or value."],
      [`non-string payload ${JSON.stringify(value)}`, { entries: [...entries, ["d", value]] }, "Invalid map key or value."],
    ]),
    ["oversized stored key", { entries: [...entries, ["k".repeat(257), "four"]] }, "Invalid map key or value."],
    ["oversized stored payload", { entries: [...entries, ["d", "v".repeat(257)]] }, "Invalid map key or value."],
    ["missing entries", {}, "Invalid map value."],
    ["extra container property", { entries, extra: true }, "Invalid map value."],
    ...[null, false, 1, "entries", {}].map(value =>
      [`non-array entries ${JSON.stringify(value)}`, { entries: value }, "Invalid map entry array."]),
    ...[null, [], [entries]].map(value =>
      [`invalid container ${JSON.stringify(value)}`, value, "Invalid map value."]),
    ...[false, 1, "container"].map(value =>
      [`scalar container ${JSON.stringify(value)}`, value, "Expected a map."]),
    ["missing container", undefined, "Undefined map register."],
  ];
  for (const [name, container, error] of malformed) {
    for (const [path, source, replacement] of [
      ["rename", "a", "new"],
      ["collision", "a", "b"],
      ["identity", "a", "a"],
      ["missing source", "missing", "new"],
    ]) {
      const inputs = {
        [isSet ? "set" : "map"]: container,
        [isSet ? "value" : "key"]: source,
        replacement,
      };
      if (container === undefined) delete inputs[isSet ? "set" : "map"];
      cases.push({ name: `reject ${name} (${path})`, inputs, error, malformedContainer: true });
    }
  }
  return cases;
}
