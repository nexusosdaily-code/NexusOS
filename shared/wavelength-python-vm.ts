import { assertBrowserInstructions, VM_MAX_CYCLES, VM_MAX_SOURCE_LENGTH } from "./vm-security";
import { compilePythonWavelength } from "./wavelength-python";
import { PythonSubsetError, type PyInstruction, type PyValue } from "./wavelength-python-expression";

export interface PythonVMResult extends PythonVMDiagnostics {
  variables: Record<string, PyValue>;
}

/** A failed run is still an error, never a successful result with partial globals. */
export class PythonVMError extends PythonSubsetError {
  constructor(line: number, message: string, public diagnostics: PythonVMDiagnostics) {
    super(line, message);
    this.name = "PythonVMError";
  }
}
const display = (value: PyValue) =>
  value === null ? "None" : value === true ? "True" : value === false ? "False" : String(value);
const truthy = (value: PyValue): boolean =>
  value !== null && value !== false && value !== 0 && value !== "";
const numeric = (value: PyValue): value is number | boolean =>
  typeof value === "number" || typeof value === "boolean";

/** Identical pure engine in browser and Node. No eval, network, DOM or wallet APIs. */
export function executePythonWavelength(source: string): PythonVMResult {
  const code = compilePythonWavelength(source);
  assertBrowserInstructions(code);
  const globals = new Map<string, PyValue>();
  const functions = new Map<string, { start: number; end: number; params: string[]; locals: Set<string> }>();
  const output: string[] = [];
  let cycles = 0;
  let outputSize = 0;
  const trace: PyInstruction[] = [];
  const fail = (i: PyInstruction, message: string): never => {
    throw new PythonVMError(i.line, message, { output: [...output], cycles, trace: [...trace] });
  };
  function run(
    start: number, end: number, locals: Map<string, PyValue>,
    localNames: Set<string> | null, depth: number,
  ): PyValue {
    const stack: PyValue[] = [];
    const pop = (i: PyInstruction): PyValue => {
      if (!stack.length) return fail(i, "Invalid bytecode: empty operand stack");
      return stack.pop()!;
    };
    for (let pc = start; pc < end; pc++) {
      const i = code[pc];
      if (cycles >= VM_MAX_CYCLES) fail(i, "Execution cycle safety limit reached");
      cycles++;
      trace.push(i);
      const name = i.args[0] as string;
      const safeValue = (value: PyValue): PyValue => {
        if (typeof value === "number" && !Number.isSafeInteger(value)) fail(i, "Integer exceeds the safe integer range");
        if (typeof value === "string" && value.length > VM_MAX_SOURCE_LENGTH) fail(i, "String exceeds the safety limit");
        return value;
      };
      switch (i.op) {
        case "CONST": stack.push(i.args[0]); break;
        case "LOAD": {
          const source = localNames?.has(name) ? locals : globals;
          if (!source.has(name)) fail(i, `Undefined or uninitialised variable: ${name}`);
          stack.push(source.get(name)!); break;
        }
        case "STORE": locals.set(name, pop(i)); break;
        case "DROP": pop(i); break;
        case "NOT": stack.push(!truthy(pop(i))); break;
        case "JUMP": pc = (i.args[0] as number) - 1; break;
        case "JFALSEKEEP": case "JTRUEKEEP": {
          const value = pop(i);
          if (truthy(value) === (i.op === "JTRUEKEEP")) {
            stack.push(value);
            pc = (i.args[0] as number) - 1;
          }
          break;
        }
        case "JFALSE": {
          const value = pop(i);
          if (!truthy(value)) {
            pc = (i.args[0] as number) - 1;
          }
          break;
        }
        case "EQ": case "NE": case "LT": case "LE": case "GT": case "GE": {
          const right = pop(i), left = pop(i);
          if (i.op === "EQ" || i.op === "NE") {
            const equal = numeric(left) && numeric(right) ? Number(left) === Number(right) : left === right;
            stack.push(i.op === "EQ" ? equal : !equal);
            break;
          }
          let order: number;
          if (numeric(left) && numeric(right)) order = Math.sign(Number(left) - Number(right));
          else if (typeof left === "string" && typeof right === "string") {
            // Python compares Unicode code points, not JavaScript UTF-16 units.
            const a = Array.from(left, c => c.codePointAt(0)!);
            const b = Array.from(right, c => c.codePointAt(0)!);
            let p = 0;
            while (p < a.length && p < b.length && a[p] === b[p]) p++;
            order = p === a.length || p === b.length ? Math.sign(a.length - b.length) : Math.sign(a[p] - b[p]);
          } else return fail(i, "Ordering requires two strings or supported integers/booleans");
          stack.push(i.op === "LT" ? order < 0 : i.op === "LE" ? order <= 0 :
            i.op === "GT" ? order > 0 : order >= 0);
          break;
        }
        case "POS": case "NEG": {
          const value = pop(i);
          if (!numeric(value)) fail(i, "Unary arithmetic requires a supported integer/boolean");
          stack.push(safeValue(i.op === "NEG" ? -Number(value) : Number(value))); break;
        }
        case "ADD": case "SUB": case "MUL": case "FLOORDIV": case "MOD": {
          const right = pop(i), left = pop(i);
          if (i.op === "ADD" && typeof left === "string" && typeof right === "string") {
            stack.push(safeValue(left + right)); break;
          }
          if (!numeric(left) || !numeric(right)) {
            fail(i, "This arithmetic operation requires supported integers/booleans");
          }
          const a = Number(left), b = Number(right);
          if ((i.op === "FLOORDIV" || i.op === "MOD") && b === 0) fail(i, "Division by zero");
          // BigInt intermediates avoid silent precision loss in safe-integer operations.
          const x = BigInt(a), y = BigInt(b);
          let result: bigint;
          if (i.op === "ADD") result = x + y;
          else if (i.op === "SUB") result = x - y;
          else if (i.op === "MUL") result = x * y;
          else {
            let quotient = x / y;
            if (x % y !== 0n && (x < 0n) !== (y < 0n)) quotient--;
            result = i.op === "FLOORDIV" ? quotient : x - quotient * y;
          }
          stack.push(safeValue(Number(result))); break;
        }
        case "FUNC": {
          let end = pc + 1;
          while (end < code.length && code[end].op !== "END") end++;
          const params = i.args.slice(1) as string[];
          const names = new Set(params);
          for (let p = pc + 1; p < end; p++) {
            if (code[p].op === "STORE") names.add(code[p].args[0] as string);
          }
          functions.set(name, { start: pc + 1, end, params, locals: names });
          globals.delete(name); pc = end; break;
        }
        case "CALL": {
          const count = i.args[1] as number;
          if (stack.length < count) fail(i, "Invalid bytecode: missing call arguments");
          const args = count ? stack.splice(stack.length - count, count) : [];
          if (name === "print") {
            const text = args.map(display).join(" ");
            outputSize += text.length + 1;
            if (outputSize > VM_MAX_SOURCE_LENGTH) fail(i, "Output exceeds the safety limit");
            output.push(text); stack.push(null); break;
          }
          if (globals.has(name) || localNames?.has(name)) fail(i, `Variable is not a callable function: ${name}`);
          const fn = functions.get(name);
          if (!fn) fail(i, `Undefined function: ${name}`);
          if (fn!.params.length !== count) fail(i, `Function ${name} expects ${fn!.params.length} arguments, received ${count}`);
          if (depth >= 32) fail(i, "Function call depth safety limit reached");
          stack.push(run(fn!.start, fn!.end,
            new Map(fn!.params.map((p, n) => [p, args[n]])), fn!.locals, depth + 1));
          break;
        }
        case "RETURN": return pop(i);
        case "HALT": return null;
        case "END": fail(i, "Unexpected function boundary");
      }
      if (stack.length > 256) fail(i, "Operand stack safety limit reached");
    }
    return null;
  }
  run(0, code.length, globals, null, 0);
  return { output, variables: Object.fromEntries(globals), cycles, trace };
}

export interface PythonVMDiagnostics {
  output: string[];
  cycles: number;
  trace: PyInstruction[];
}
