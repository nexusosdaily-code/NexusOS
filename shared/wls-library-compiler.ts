import { encodeVMName } from "./wnsp-model";

/** Compiler-only module: never imports generated artifacts or execution adapters. */
export const COLLECTION_PROFILE = "WLS-COLLECTION/1";
export const COLLECTION_LIMITS = Object.freeze({
  items: 20, stringLength: 256, sourceLength: 8192, instructions: 128, cycles: 1024, registers: 32,
});
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

export const MAP_PROFILE = "WLS-MAP/1";
export const MAP_LIMITS = Object.freeze({
  entries: 20, keyLength: 256, valueLength: 256, sourceLength: 8192,
  instructions: 128, cycles: 1024, registers: 32, memoryBytes: 65_536,
});
const mapSignatures: Readonly<Record<string, string>> = Object.freeze({
  CONST: "rv", MAP_NEW: "r", MAP_COPY: "rr", MAP_SIZE: "rr", MAP_HAS: "rrr",
  MAP_GET: "rrr", MAP_SET: "rrrr", MAP_DELETE: "rrr", MAP_KEY_AT: "rrr",
  EQ: "rrr", LT: "rrr", INC: "r", JTRUE: "rl", JUMP: "l", RETURN: "r",
});
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
const text = (value: unknown, limit: number): value is string =>
  typeof value === "string" && value.length <= limit;

export function compileMap(source: string): readonly Instruction[] {
  if (typeof source !== "string" || source.length > MAP_LIMITS.sourceLength) fail("Map source exceeds its size limit.");
  const lines = source.split("\n");
  if (lines.shift()?.trim() !== MAP_PROFILE) fail("Unsupported map source version.");
  const labels = new Map<string, number>(), code: Instruction[] = [];
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("//")) return;
    if (line.startsWith(":")) {
      const name = line.slice(1);
      if (!register.test(name) || labels.has(name)) fail("Invalid or duplicate map label.");
      labels.set(name, code.length); return;
    }
    const match = /^([A-Z_]+)\s+(\[.*\])$/.exec(line);
    if (!match || !own(mapSignatures, match[1])) fail("Unknown map instruction.");
    const [, op, json] = match!;
    let args: unknown;
    try { args = JSON.parse(json); } catch { fail("Invalid map instruction arguments."); }
    const signature = mapSignatures[op];
    if (!Array.isArray(args) || args.length !== signature.length) fail("Invalid map instruction arity.");
    for (let i = 0; i < signature.length; i++) {
      const value = (args as unknown[])[i];
      if (signature[i] === "v") {
        if (!(text(value, MAP_LIMITS.valueLength) || typeof value === "boolean" ||
          (typeof value === "number" && Number.isSafeInteger(value)))) fail("Invalid map literal.");
      } else if (typeof value !== "string" || !register.test(value)) fail("Invalid map register or label.");
    }
    code.push({ op, args: args as Instruction["args"], nm: encodeVMName(op).nm, line: index + 2 });
    if (code.length > MAP_LIMITS.instructions) fail("Map instruction limit exceeded.");
  });
  if (!code.length || code.at(-1)!.op !== "RETURN") fail("Map program must end with RETURN.");
  for (const ins of code) {
    ins.args = ins.args.map((arg, i) => {
      if (mapSignatures[ins.op][i] !== "l") return arg;
      const target = labels.get(arg as string);
      if (target === undefined || target >= code.length) fail("Invalid map branch target.");
      return target!;
    });
    Object.freeze(ins.args); Object.freeze(ins);
  }
  return Object.freeze(code);
}

export function compileLibraryProgram(source: string) {
  if (typeof source !== "string" || source.length > COLLECTION_LIMITS.sourceLength) {
    throw new CollectionVMError("Library source exceeds its size limit.");
  }
  return source.split("\n", 1)[0].trim() === MAP_PROFILE ? compileMap(source) : compileCollection(source);
}
