import { encodeVMName } from "./wnsp-model";

/** Deliberately separate, capability-free collection extension; not the contract VM. */
export const COLLECTION_PROFILE = "WLS-COLLECTION/1";
export const COLLECTION_LIMITS = Object.freeze({
  items: 20, stringLength: 256, sourceLength: 8192, instructions: 128, cycles: 1024, registers: 32,
});
type Value = string | number | boolean | string[];
type Instruction = { op: string; args: (string | number | boolean)[]; nm: number; line: number };
export class CollectionVMError extends Error {
  constructor(message: string) { super(message); this.name = "CollectionVMError"; }
}
const fail = (message: string): never => { throw new CollectionVMError(message); };
const register = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
const signatures: Record<string, string> = {
  LIST_NEW: "r", LIST_COPY: "rr", LIST_LEN: "rr", LIST_AT: "rrr", LIST_PUSH: "rr",
  CONST: "rv", EQ: "rrr", LT: "rrr", INC: "r", JTRUE: "rl", JUMP: "l", RETURN: "r",
};

export function compileCollection(source: string): readonly Instruction[] {
  if (typeof source !== "string" || source.length > COLLECTION_LIMITS.sourceLength) fail("Collection source is too large.");
  const lines = source.split("\n");
  if (lines.shift()?.trim() !== COLLECTION_PROFILE) fail("Unsupported collection source version.");
  const labels = new Map<string, number>(), code: Instruction[] = [];
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("//")) return;
    if (line.startsWith(":")) {
      const name = line.slice(1);
      if (!register.test(name) || labels.has(name)) fail(`Invalid or duplicate label at line ${index + 2}.`);
      labels.set(name, code.length); return;
    }
    const match = /^([A-Z_]+)\s+(\[.*\])$/.exec(line);
    if (!match || !Object.prototype.hasOwnProperty.call(signatures, match[1])) fail(`Unknown collection instruction at line ${index + 2}.`);
    const [, op, json] = match!;
    let args: unknown;
    try { args = JSON.parse(json); } catch { fail(`Invalid instruction arguments at line ${index + 2}.`); }
    const signature = signatures[op];
    if (!Array.isArray(args) || args.length !== signature.length) fail("Invalid instruction arity.");
    for (let i = 0; i < signature.length; i++) {
      const value = (args as unknown[])[i];
      if (signature[i] === "v") {
        if (!(typeof value === "boolean" || (typeof value === "number" && Number.isSafeInteger(value)) ||
          (typeof value === "string" && value.length <= COLLECTION_LIMITS.stringLength))) fail("Invalid literal.");
      } else if (typeof value !== "string" || !register.test(value)) fail("Invalid register or label.");
    }
    code.push({ op, args: args as Instruction["args"], nm: encodeVMName(op).nm, line: index + 2 });
    if (code.length > COLLECTION_LIMITS.instructions) fail("Collection instruction limit exceeded.");
  });
  if (!code.length || code.at(-1)!.op !== "RETURN") fail("Collection program must end with RETURN.");
  for (const ins of code) {
    const signature = signatures[ins.op];
    ins.args = ins.args.map((arg, i) => {
      if (signature[i] !== "l") return arg;
      const target = labels.get(arg as string);
      if (target === undefined || target >= code.length) fail("Invalid collection branch target.");
      return target!;
    });
    Object.freeze(ins.args); Object.freeze(ins);
  }
  return Object.freeze(code);
}

function checkedValue(value: unknown): Value {
  if (Array.isArray(value)) {
    if (value.length > COLLECTION_LIMITS.items) fail(`Select at most ${COLLECTION_LIMITS.items} recipients.`);
    // Reject holes and non-string elements; snapshot before execution.
    const copy: string[] = [];
    for (let i = 0; i < value.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(value, i) || typeof value[i] !== "string" ||
        value[i].length > COLLECTION_LIMITS.stringLength) fail("Invalid collection item.");
      copy.push(value[i]);
    }
    return copy;
  }
  if (typeof value === "string" && value.length <= COLLECTION_LIMITS.stringLength) return value;
  if (typeof value === "boolean" || (typeof value === "number" && Number.isSafeInteger(value))) return value;
  return fail("Invalid collection value.");
}

/** No externally supplied bytecode, eval, DOM, network, storage or financial effects. */
export function executeCollection(source: string, inputs: Readonly<Record<string, unknown>>) {
  const code = compileCollection(source);
  const entries = Object.entries(inputs);
  if (entries.length > COLLECTION_LIMITS.registers) fail("Collection register limit exceeded.");
  const values = new Map<string, Value>();
  const put = (name: string, value: Value) => {
    if (!values.has(name) && values.size >= COLLECTION_LIMITS.registers) fail("Collection register limit exceeded.");
    values.set(name, value);
  };
  for (const [key, value] of entries) {
    if (!register.test(key)) fail("Invalid input register.");
    put(key, checkedValue(value));
  }
  const read = (name: string): Value => values.has(name) ? values.get(name)! : fail(`Undefined register: ${name}.`);
  const list = (name: string): string[] => {
    const value = read(name);
    return Array.isArray(value) ? value : fail("Expected a list.");
  };
  const integer = (name: string): number => {
    const value = read(name);
    return typeof value === "number" && Number.isSafeInteger(value) ? value : fail("Expected an integer.");
  };
  const trace: { op: string; nm: number; line: number }[] = [];
  for (let pc = 0; pc < code.length;) {
    if (trace.length >= COLLECTION_LIMITS.cycles) fail("Collection cycle limit exceeded.");
    const ins = code[pc++];
    trace.push({ op: ins.op, nm: ins.nm, line: ins.line });
    const [a, b, c] = ins.args as [string, string, string];
    switch (ins.op) {
      case "CONST": put(a, ins.args[1]); break;
      case "LIST_NEW": put(a, []); break;
      case "LIST_COPY": put(a, [...list(b)]); break;
      case "LIST_LEN": put(a, list(b).length); break;
      case "LIST_AT": {
        const items = list(b), index = integer(c);
        if (index < 0 || index >= items.length) fail("Collection index out of range.");
        put(a, items[index]); break;
      }
      case "LIST_PUSH": {
        const items = list(a), item = read(b);
        const text = typeof item === "string" ? item : fail("Expected a string item.");
        if (items.length >= COLLECTION_LIMITS.items) fail(`Select at most ${COLLECTION_LIMITS.items} recipients.`);
        put(a, [...items, text]); break;
      }
      case "EQ": {
        const left = read(b), right = read(c);
        if (Array.isArray(left) || Array.isArray(right)) fail("List equality is not a scalar operation.");
        put(a, left === right); break;
      }
      case "LT": put(a, integer(b) < integer(c)); break;
      case "INC": {
        const next = integer(a) + 1;
        if (!Number.isSafeInteger(next)) fail("Integer range exceeded.");
        put(a, next); break;
      }
      case "JTRUE": {
        const condition = read(a);
        if (typeof condition !== "boolean") fail("Expected a boolean branch condition.");
        if (condition) pc = ins.args[1] as number;
        break;
      }
      case "JUMP": pc = ins.args[0] as number; break;
      case "RETURN": return { value: checkedValue(read(a)), trace };
      default: fail("Unsupported collection instruction.");
    }
  }
  return fail("Collection program ended without a result.");
}
