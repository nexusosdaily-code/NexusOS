import { MAP_LIMITS, CollectionVMError, compileMap } from "./wls-library-compiler";
import { canonicalLibraryInputs } from "./wls-library-inputs";
export { MAP_PROFILE, MAP_LIMITS, compileMap } from "./wls-library-compiler";

export type MapValue = { readonly entries: readonly (readonly [string, string])[] };
export type MapVMValue = string | number | boolean | MapValue;
const fail = (message: string): never => { throw new CollectionVMError(message); };
const register = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
const text = (value: unknown, limit: number): value is string =>
  typeof value === "string" && value.length <= limit;

/** Dense data arrays only: reject holes, accessors and hidden extra properties. */
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max ||
    Reflect.ownKeys(value).length !== value.length + 1) return fail("Invalid map entry array.");
  for (let i = 0; i < value.length; i++) {
    if (!own(value, i) || !own(Object.getOwnPropertyDescriptor(value, String(i))!, "value")) {
      fail("Invalid map entry array.");
    }
  }
  return value;
}

/** Validate and snapshot untrusted input; never use keys as object properties. */
export function checkedMapValue(value: unknown): MapVMValue {
  if (text(value, MAP_LIMITS.valueLength) || typeof value === "boolean" ||
    (typeof value === "number" && Number.isSafeInteger(value))) return value;
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
    Reflect.ownKeys(value).length !== 1 || !own(value, "entries")) return fail("Invalid map value.");
  const descriptor = Object.getOwnPropertyDescriptor(value, "entries")!;
  if (!own(descriptor, "value")) return fail("Invalid map value.");
  const seen = new Set<string>();
  const entries = array(descriptor.value, MAP_LIMITS.entries).map(raw => {
    const pair = array(raw, 2);
    if (pair.length !== 2 || !text(pair[0], MAP_LIMITS.keyLength) ||
      !text(pair[1], MAP_LIMITS.valueLength)) return fail("Invalid map key or value.");
    if (seen.has(pair[0])) fail("Duplicate map input key.");
    seen.add(pair[0]);
    return Object.freeze([pair[0], pair[1]] as const);
  });
  return Object.freeze({ entries: Object.freeze(entries) });
}


/**
 * Deterministic logical memory accounting, not a claim about JS heap bytes.
 * Charge each register independently even if values share an immutable snapshot.
 */
function bytes(value: MapVMValue): number {
  if (typeof value === "string") return 16 + 2 * value.length;
  if (typeof value !== "object") return 16;
  return 32 + value.entries.reduce((sum, [key, item]) => sum + 32 + 2 * (key.length + item.length), 0);
}

export function executeMap(source: string, inputs: Readonly<Record<string, unknown>>) {
  const code = compileMap(source);
  if (inputs === null || typeof inputs !== "object" || Array.isArray(inputs) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(inputs))) fail("Map inputs must be a record.");
  const names = Reflect.ownKeys(inputs);
  if (names.length > MAP_LIMITS.registers) fail("Map register limit exceeded.");
  const values = new Map<string, MapVMValue>();
  let memory = 0;
  const put = (name: string, value: MapVMValue) => {
    if (!values.has(name) && values.size >= MAP_LIMITS.registers) fail("Map register limit exceeded.");
    const next = memory - (values.has(name) ? bytes(values.get(name)!) : 0) + bytes(value);
    if (next > MAP_LIMITS.memoryBytes) fail("Map memory limit exceeded.");
    values.set(name, value); memory = next;
  };
  for (const name of names) {
    if (typeof name !== "string" || !register.test(name)) return fail("Invalid map input register.");
    const descriptor = Object.getOwnPropertyDescriptor(inputs, name)!;
    if (!own(descriptor, "value")) fail("Map input accessors are not supported.");
    put(name, checkedMapValue(descriptor.value));
  }
  const read = (name: string): MapVMValue => values.has(name) ? values.get(name)! : fail("Undefined map register.");
  const map = (name: string): MapValue => {
    const value = read(name);
    return typeof value === "object" ? value : fail("Expected a map.");
  };
  const string = (name: string): string => {
    const value = read(name);
    return typeof value === "string" ? value : fail("Expected a map string.");
  };
  const integer = (name: string): number => {
    const value = read(name);
    return typeof value === "number" ? value : fail("Expected a map integer.");
  };
  for (const [name, kind] of canonicalLibraryInputs(source)) {
    if (kind === "map") map(name);
    else if (kind === "string") string(name);
    else if (kind === "integer") integer(name);
    else fail("Invalid map library input contract.");
  }
  const putMap = (name: string, entries: readonly (readonly [string, string])[]) =>
    put(name, Object.freeze({ entries: Object.freeze(entries) }));
  const trace: { op: string; nm: number; line: number }[] = [];
  for (let pc = 0; pc < code.length;) {
    if (trace.length >= MAP_LIMITS.cycles) fail("Map cycle limit exceeded.");
    const ins = code[pc++];
    trace.push({ op: ins.op, nm: ins.nm, line: ins.line });
    const [a, b, c, d] = ins.args as string[];
    switch (ins.op) {
      case "CONST": put(a, ins.args[1]); break;
      case "MAP_NEW": putMap(a, []); break;
      case "MAP_COPY": putMap(a, [...map(b).entries]); break;
      case "MAP_SIZE": put(a, map(b).entries.length); break;
      case "MAP_HAS": {
        const entries = map(b).entries, key = string(c);
        put(a, entries.some(pair => pair[0] === key)); break;
      }
      case "MAP_GET": {
        const entries = map(b).entries, key = string(c);
        const pair = entries.find(pair => pair[0] === key);
        if (!pair) fail("Map key is missing.");
        put(a, pair![1]); break;
      }
      case "MAP_SET": {
        const entries = map(b).entries, key = string(c), value = string(d);
        const index = entries.findIndex(pair => pair[0] === key);
        if (index < 0 && entries.length >= MAP_LIMITS.entries) fail("Map entry limit exceeded.");
        const next = [...entries], pair = Object.freeze([key, value] as const);
        if (index < 0) next.push(pair); else next[index] = pair;
        putMap(a, next); break;
      }
      case "MAP_DELETE": {
        const entries = map(b).entries, key = string(c);
        putMap(a, entries.filter(pair => pair[0] !== key)); break;
      }
      case "MAP_KEY_AT": {
        const entries = map(b).entries, index = integer(c);
        if (index < 0 || index >= entries.length) fail("Map index out of range.");
        put(a, entries[index][0]); break;
      }
      case "EQ": {
        const left = read(b), right = read(c);
        if (typeof left === "object" || typeof right === "object") fail("Map equality is not a scalar operation.");
        put(a, left === right); break;
      }
      case "LT": put(a, integer(b) < integer(c)); break;
      case "INC": {
        const next = integer(a) + 1;
        if (!Number.isSafeInteger(next)) fail("Map integer range exceeded.");
        put(a, next); break;
      }
      case "JTRUE": {
        const condition = read(a);
        if (typeof condition !== "boolean") fail("Expected a map boolean branch condition.");
        if (condition) pc = ins.args[1] as number;
        break;
      }
      case "JUMP": pc = ins.args[0] as number; break;
      case "RETURN": return { value: checkedMapValue(read(a)), trace };
      default: fail("Unsupported map instruction.");
    }
  }
  return fail("Map program ended without a result.");
}
