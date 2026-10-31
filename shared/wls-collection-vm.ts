import { COLLECTION_LIMITS, CollectionVMError, compileCollection } from "./wls-library-compiler";
import { canonicalLibraryInputs } from "./wls-library-inputs";
export { COLLECTION_PROFILE, COLLECTION_LIMITS, CollectionVMError, compileCollection } from "./wls-library-compiler";

type Value = string | number | boolean | string[];
const fail = (message: string): never => { throw new CollectionVMError(message); };
const register = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;

function checkedValue(value: unknown): Value {
  if (Array.isArray(value)) {
    if (value.length > COLLECTION_LIMITS.items) fail(`Select at most ${COLLECTION_LIMITS.items} recipients.`);
    if (Object.getPrototypeOf(value) !== Array.prototype ||
      Reflect.ownKeys(value).length !== value.length + 1) fail("Invalid collection item.");
    // Read data descriptors once: never invoke element getters while snapshotting.
    const copy: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        typeof descriptor.value !== "string" ||
        descriptor.value.length > COLLECTION_LIMITS.stringLength) fail("Invalid collection item.");
      copy.push(descriptor!.value);
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
  if (inputs === null || typeof inputs !== "object" || Array.isArray(inputs) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(inputs))) fail("Collection inputs must be a record.");
  const names = Reflect.ownKeys(inputs);
  if (names.length > COLLECTION_LIMITS.registers) fail("Collection register limit exceeded.");
  const values = new Map<string, Value>();
  const put = (name: string, value: Value) => {
    if (!values.has(name) && values.size >= COLLECTION_LIMITS.registers) fail("Collection register limit exceeded.");
    values.set(name, value);
  };
  for (const key of names) {
    if (typeof key !== "string" || !register.test(key)) fail("Invalid input register.");
    const descriptor = Object.getOwnPropertyDescriptor(inputs, key)!;
    if (!Object.prototype.hasOwnProperty.call(descriptor, "value")) fail("Collection input accessors are not supported.");
    put(key as string, checkedValue(descriptor.value));
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
  for (const [name, kind] of canonicalLibraryInputs(source)) {
    if (kind === "list") list(name);
    else if (kind === "integer") integer(name);
    else if (kind === "string") {
      if (typeof read(name) !== "string") fail("Expected a string item.");
    } else fail("Invalid collection library input contract.");
  }
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
