import { describe, expect, it } from "vitest";
import { compilePythonWavelength, PythonSubsetError } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import type { PyInstruction, PyOp, PyValue } from "../shared/wavelength-python-expression";
import { encodeVMName } from "../shared/wnsp-model";

// Exhaustive on purpose: adding a PyOp requires choosing a trusted valid seed.
// Wrong types for zero-argument operations are tested through the args container;
// there is no valid operand position to change for those operations.
const seeds = {
  CONST: [1], LOAD: ["value"], STORE: ["value"],
  ADD: [], SUB: [], MUL: [], FLOORDIV: [], MOD: [], POS: [], NEG: [],
  CALL: ["print", 0], DROP: [], FUNC: ["unused"], END: [], RETURN: [], HALT: [],
  EQ: [], NE: [], LT: [], LE: [], GT: [], GE: [],
  JUMP: [0], JFALSE: [0], JFALSEKEEP: [0], JTRUEKEEP: [0], NOT: [],
} satisfies Record<PyOp, PyValue[]>;
const ops = Object.keys(seeds) as PyOp[];
const branches = new Set<PyOp>(["JUMP", "JFALSE", "JFALSEKEEP", "JTRUEKEEP"]);
const instruction = (op: PyOp, args: PyValue[] = seeds[op]): PyInstruction =>
  ({ op, args: [...args], line: 1, nm: encodeVMName(op).nm });
const serializeInstruction = (i: PyInstruction) =>
  `@${i.nm}nm ${i.op} ${JSON.stringify({ line: i.line, args: i.args })}`;
const payload = (i: PyInstruction, data: unknown) =>
  `@${i.nm}nm ${i.op} ${JSON.stringify(data)}`;
const argsPayload = (i: PyInstruction, args: unknown) =>
  payload(i, { line: i.line, args });

type Context = "skipped top-level" | "uncalled function" | "after return" | "terminal";
interface Fixture { op: PyOp; context: Context; code: PyInstruction[]; pc: number }

function fixture(op: PyOp, context: Context): Fixture {
  let code: PyInstruction[];
  let pc: number;
  if (op === "HALT") {
    // HALT must be the single final top-level instruction. A skipped function
    // HALT cannot be a valid control, so do not claim that context is supported.
    code = [instruction("HALT")];
    pc = 0;
  } else if (op === "FUNC") {
    // A function cannot be nested; skip its entire definition at top level.
    code = [
      instruction("JUMP", [5]), instruction("FUNC"), instruction("CONST", [null]),
      instruction("RETURN"), instruction("END"), instruction("HALT"),
    ];
    pc = 1;
  } else if (op === "END" || op === "RETURN") {
    code = [
      instruction("FUNC"), instruction("CONST", [null]), instruction("RETURN"),
      instruction("CONST", [null]), instruction("RETURN"), instruction("END"),
    ];
    pc = op === "END" ? 5 : 4;
    if (context === "after return") code.push(instruction("CALL", ["unused", 0]), instruction("DROP"));
    code.push(instruction("HALT"));
  } else if (context === "skipped top-level") {
    code = [instruction("JUMP", [2]), instruction(op), instruction("HALT")];
    pc = 1;
  } else {
    code = [instruction("FUNC")];
    if (context === "after return") code.push(instruction("CONST", [null]), instruction("RETURN"));
    pc = code.length;
    code.push(instruction(op), instruction("CONST", [null]), instruction("RETURN"), instruction("END"));
    if (context === "after return") code.push(instruction("CALL", ["unused", 0]), instruction("DROP"));
    code.push(instruction("HALT"));
  }
  if (branches.has(op)) code[pc].args = [pc + 1];
  // Distinguish the target even when a wrapper uses the same opcode/arguments.
  code[pc].line = 777;
  return { op, context, code, pc };
}

const fixtures = ops.flatMap(op => {
  const contexts: Context[] = op === "HALT" ? ["terminal"] :
    op === "FUNC" ? ["skipped top-level"] :
    op === "END" || op === "RETURN" ? ["uncalled function", "after return"] :
    ["skipped top-level", "uncalled function", "after return"];
  return contexts.map(context => fixture(op, context));
});

function serialize(f: Fixture, replacement = serializeInstruction(f.code[f.pc])): string {
  return "// WLS-PY/1 — trusted malformed-bytecode fixture\n" +
    f.code.map((i, pc) => pc === f.pc ? replacement : serializeInstruction(i)).join("\n");
}

interface Mutation {
  name: string;
  change: (i: PyInstruction) => string;
  applies?: (op: PyOp) => boolean;
}
const mutations: Mutation[] = [
  {
    name: "too many arguments",
    change: i => argsPayload(i, i.op === "FUNC"
      ? ["unused", ...Array.from({ length: 257 }, (_, n) => `param${n}`)]
      : [...i.args, null]),
  },
  {
    name: "missing required argument",
    applies: op => seeds[op].length > 0,
    change: i => argsPayload(i, i.args.slice(0, -1)),
  },
  ...[null, false, 1, "args", {}].map(args => ({
    name: `non-array args: ${JSON.stringify(args)}`,
    change: (i: PyInstruction) => argsPayload(i, args),
  })),
  ...[{}, [], 1.5, Number.MAX_SAFE_INTEGER + 1].map(value => ({
    name: `unsupported operand: ${JSON.stringify(value)}`,
    // For operand-bearing ops, replace rather than append: preserve arity so a
    // broken value check cannot be hidden by a still-working arity check.
    change: (i: PyInstruction) => argsPayload(i,
      i.args.length ? [value, ...i.args.slice(1)] : [value]),
  })),
  {
    name: "changed coordinate tag",
    change: i => serializeInstruction({ ...i, nm: i.nm + 1 }),
  },
  { name: "unknown opcode", change: i => serializeInstruction(i).replace(` ${i.op} `, " EXEC ") },
  { name: "truncated JSON", change: i => serializeInstruction(i).slice(0, -1) },
  { name: "trailing JSON garbage", change: i => serializeInstruction(i) + " false" },
  ...[null, false, 1, "payload", []].map(data => ({
    name: `non-record payload: ${JSON.stringify(data)}`,
    change: (i: PyInstruction) => payload(i, data),
  })),
  { name: "missing args", change: i => payload(i, { line: i.line }) },
  { name: "missing line", change: i => payload(i, { args: i.args }) },
  ...[null, true, "1", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map(line => ({
    name: `invalid line: ${JSON.stringify(line)}`,
    change: (i: PyInstruction) => payload(i, { line, args: i.args }),
  })),
  ...[null, true, 2, "", "bad-name", "and", "print"].map(name => ({
    name: `invalid identifier: ${JSON.stringify(name)}`,
    applies: (op: PyOp) => ["LOAD", "STORE", "FUNC", "CALL"].includes(op) &&
      !(op === "CALL" && name === "print"),
    change: (i: PyInstruction) => argsPayload(i, [name, ...i.args.slice(1)]),
  })),
  ...[null, true, "0", -1, 257, 1.5].map(count => ({
    name: `invalid call count: ${JSON.stringify(count)}`,
    applies: (op: PyOp) => op === "CALL",
    change: (i: PyInstruction) => argsPayload(i, [i.args[0], count]),
  })),
  ...[null, true, "2", -1, 0, 1.5, Number.MAX_SAFE_INTEGER].map(target => ({
    name: `invalid forward target: ${JSON.stringify(target)}`,
    applies: (op: PyOp) => branches.has(op),
    change: (i: PyInstruction) => argsPayload(i, [target]),
  })),
  ...[["unused", "arg", "arg"], ["unused", "not"], ["unused", 1], ["unused", "print"]].map(args => ({
    name: `invalid function parameters: ${JSON.stringify(args)}`,
    applies: (op: PyOp) => op === "FUNC",
    change: (i: PyInstruction) => argsPayload(i, args),
  })),
];

describe("Python bytecode validates the complete opcode set before execution", () => {
  it.each(fixtures)("accepts valid $op in $context without executing skipped code", f => {
    const source = serialize(f);
    expect(compilePythonWavelength(source)).toEqual(f.code);
    const result = executePythonWavelength(source);
    expect(result.output).toEqual([]);
    expect(result.variables).toEqual({});
    expect(result.trace.some(i => i.line === 777)).toBe(f.op === "HALT");
    expect(result.cycles).toBe(result.trace.length);
  });

  const cases = fixtures.flatMap(f => mutations
    .filter(m => !m.applies || m.applies(f.op))
    .map(m => ({ ...f, mutation: m.name, source: serialize(f, m.change(f.code[f.pc])) })));

  it.each(cases)("rejects $op / $context / $mutation at compile time", ({ source }) => {
    // Test the compiler directly, not just the executor: a runtime failure,
    // stack underflow, or skipped invalid instruction is not a passing result.
    expect(() => compilePythonWavelength(source)).toThrow(PythonSubsetError);
    expect(() => compilePythonWavelength(source))
      .toThrow(/Invalid WavelengthScript subset instruction|Invalid bytecode branch target/);
  });
});
