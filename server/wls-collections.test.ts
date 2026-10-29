import { describe, expect, it } from "vitest";
import { compileCollection, executeCollection, COLLECTION_LIMITS, CollectionVMError } from "../shared/wls-collection-vm";
import { RECIPIENT_COLLECTION_SOURCE as source, updateRecipientSelection, recipientAt, recipientCount } from "../shared/wls-recipient-collections";
import { encodeVMName } from "../shared/wnsp-model";

const program = (body: string) => `WLS-COLLECTION/1\n${body}`;
describe("native WavelengthScript recipient collections", () => {
  it("executes add, duplicate detection, removal, count and index through coordinate-tagged instructions", () => {
    const a = "wnsp://Ψ(12,3,H)/alice", b = "wnsp://Ψ(12,3,H)/bob";
    const start: string[] = [];
    const one = updateRecipientSelection(start, "add", ` ${a} `);
    const two = updateRecipientSelection(one, "add", b);
    expect(start).toEqual([]); expect(one).toEqual([a]);
    expect(two).toEqual([a, b]);
    expect(updateRecipientSelection(two, "add", a)).toEqual(two);
    expect(updateRecipientSelection(two, "remove", a)).toEqual([b]);
    expect(updateRecipientSelection(two, "remove", "missing")).toEqual(two);
    expect(recipientCount(two)).toBe(2); expect(recipientAt(two, 1)).toBe(b);
    const { value, trace } = executeCollection(source.add, { items: [a], value: b });
    expect(value).toEqual(two);
    expect(trace.map(i => i.op)).toContain("JTRUE");
    expect(trace.map(i => i.op)).toContain("LIST_AT");
    for (const step of trace) expect(step.nm).toBe(encodeVMName(step.op).nm);
    expect(Object.isFrozen(compileCollection(source.add))).toBe(true);
  });
  it("handles zero/one/full boundaries atomically without mutating inputs", () => {
    expect(recipientCount([])).toBe(0);
    expect(updateRecipientSelection([], "remove", "x")).toEqual([]);
    const full = Array.from({ length: 20 }, (_, i) => `recipient-${i}`);
    const before = [...full];
    expect(updateRecipientSelection(full, "add", "recipient-0")).toEqual(full);
    expect(() => updateRecipientSelection(full, "add", "new")).toThrow(/at most 20/);
    expect(full).toEqual(before);
    const reduced = updateRecipientSelection(full, "remove", "recipient-19");
    expect(updateRecipientSelection(reduced, "add", "new")).toHaveLength(20);
    expect(updateRecipientSelection(["x", "x", "y"], "remove", "x")).toEqual(["y"]);
  });
  it("preserves exact case, Unicode and order; returns independent snapshots", () => {
    const values = ["A", "a", "中文", "עברית", "__proto__", "<script>", "😀"];
    let actual: string[] = [];
    for (const value of values) actual = updateRecipientSelection(actual, "add", value);
    expect(actual).toEqual(values);
    const output = updateRecipientSelection(actual, "add", "A");
    output[0] = "changed";
    expect(actual).toEqual(values);
    expect(recipientAt(actual, 6)).toBe("😀");
    const max = "x".repeat(256);
    expect(updateRecipientSelection([], "add", max)).toEqual([max]);
  });
  it.each(["", "  ", "a\nb", "a\u0000b", "a\u007fb", "x".repeat(257)])("rejects malformed selection input %j", value => {
    expect(() => updateRecipientSelection([], "add", value)).toThrow(CollectionVMError);
  });
  it.each([-1, 1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid index %s", index => {
    expect(() => recipientAt(["x"], index)).toThrow(CollectionVMError);
  });
  it.each([
    new Array(1), [null], [1], [{}], [["x"]], ["x".repeat(257)], Array(21).fill("x"),
  ].map(items => ({ items })))("rejects invalid collection values", ({ items }) => {
    expect(() => executeCollection(source.count, { items })).toThrow(CollectionVMError);
  });
  it("matches an independent reference over deterministic mixed operation sequences", () => {
    let actual: string[] = [], expected: string[] = [], state = 7301;
    for (let step = 0; step < 1000; step++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const address = `address-${state % 27}`;
      const action = state % 3 === 0 ? "remove" : "add";
      if (action === "add" && !expected.includes(address) && expected.length === 20) {
        expect(() => updateRecipientSelection(actual, action, address)).toThrow(/at most 20/);
      } else {
        expected = action === "add" ? expected.includes(address) ? expected : [...expected, address] :
          expected.filter(item => item !== address);
        actual = updateRecipientSelection(actual, action, address);
      }
      expect(actual).toEqual(expected);
      expect(recipientCount(actual)).toBe(expected.length);
      if (expected.length) expect(recipientAt(actual, expected.length - 1)).toBe(expected.at(-1));
    }
  });
});

describe("collection VM fail-closed boundaries", () => {
  it.each([
    "", "WLS-COLLECTION/2\nRETURN [\"items\"]", program("UNKNOWN []"),
    program("LIST_LEN [\"size\"]\nRETURN [\"size\"]"),
    program("LIST_LEN [\"size\",{}]\nRETURN [\"size\"]"),
    program("CONST [\"value\",[]]\nRETURN [\"value\"]"),
    program("CONST [\"value\",null]\nRETURN [\"value\"]"),
    program("CONST [\"value\",1.5]\nRETURN [\"value\"]"),
    program("RETURN [\"bad-name\"]"), program("RETURN not-json"),
    program("JUMP [\"missing\"]\nRETURN [\"items\"]"),
    program("JUMP [\"end\"]\nRETURN [\"items\"]\n:end"),
    program(":same\n:same\nRETURN [\"items\"]"),
    program("CONST [\"value\",true]"), program("RETURN [\"undefined\"]"),
  ])("rejects malformed or undefined programs", code => {
    expect(() => executeCollection(code, { items: [] })).toThrow(CollectionVMError);
  });
  it("caps loops, instructions, source and register allocations", () => {
    expect(() => executeCollection(program(":loop\nJUMP [\"loop\"]\nRETURN [\"items\"]"), { items: [] })).toThrow(/cycle limit/);
    expect(() => compileCollection(program('CONST ["x",0]\n'.repeat(129) + 'RETURN ["x"]'))).toThrow(/instruction limit/);
    expect(() => compileCollection("x".repeat(COLLECTION_LIMITS.sourceLength + 1))).toThrow(/source/);
    const inputs = Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`r${i}`, i]));
    expect(() => executeCollection(source.count, inputs)).toThrow(/register limit/);
    const many = Array.from({ length: 33 }, (_, i) => `CONST ["r${i}",0]`).join("\n");
    expect(() => executeCollection(program(many + '\nRETURN ["r0"]'), {})).toThrow(/register limit/);
  });
  it.each([
    'JTRUE ["value","end"]\n:end\nRETURN ["items"]',
    'LIST_LEN ["size","value"]\nRETURN ["size"]',
    'INC ["value"]\nRETURN ["value"]',
    'LT ["result","value","value"]\nRETURN ["result"]',
    'EQ ["result","items","items"]\nRETURN ["result"]',
  ])("rejects type confusion", body => {
    expect(() => executeCollection(program(body), { items: [], value: "x" })).toThrow(CollectionVMError);
  });
  it("does not coerce literals, accepts safe register names without prototype lookup, and bounds integer arithmetic", () => {
    expect(() => executeCollection(program('INC ["x"]\nRETURN ["x"]'), { x: Number.MAX_SAFE_INTEGER })).toThrow(/range/);
    expect(() => executeCollection(source.count, { items: null })).toThrow(/value/);
    expect(executeCollection(program('RETURN ["constructor"]'), { constructor: "plain" }).value).toBe("plain");
    expect(() => executeCollection(program('constructor []\nRETURN ["items"]'), { items: [] })).toThrow(/Unknown/);
    expect(() => updateRecipientSelection([], "bogus" as "add", "x")).toThrow(/Unknown/);
  });
});
