import { encodeVMName } from "./wnsp-model";
import { assertBrowserInstructions, assertVmSource } from "./vm-security";
import {
  expressionInstructions, PY_IDENTIFIER, PY_RESERVED, PythonSubsetError,
  type PyInstruction, type PyOp, type PyValue,
} from "./wavelength-python-expression";

export { PythonSubsetError };
export const PYTHON_SUBSET_VERSION = "WLS-PY/1";
export const PYTHON_SUBSET_DESCRIPTION =
  "Python subset: safe-integer arithmetic (+ − * // %, unary +/−; True/False act as 1/0), " +
  "string-to-string concatenation only (no string repetition or mixed string/numeric arithmetic), True/False/None, assignments, print(), " +
  "comparisons (== != < <= > >=), short-circuit and/or/not, if/elif/else, and top-level functions with positional arguments and return. " +
  "No imports, loops, chained comparisons, collections, attributes, floats, external access or financial operations.";

/** Remove comments without confusing a # inside a quoted string with a comment. */
function withoutComment(source: string): string {
  let quote = "";
  let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (quote && ch === "\\") { escaped = true; continue; }
    if (quote && ch === quote) quote = "";
    else if (!quote && (ch === "'" || ch === '"')) quote = ch;
    else if (!quote && ch === "#") return source.slice(0, i).trimEnd();
  }
  return source.trimEnd();
}

function assertName(name: string, line: number): void {
  if (!PY_IDENTIFIER.test(name) || PY_RESERVED.has(name) || name === "print") {
    throw new PythonSubsetError(line, `Unsupported or reserved identifier: ${name}`);
  }
}

/** Translate to explicit, coordinate-tagged stack operations, not a JS payload. */
export function translatePython(source: string): string {
  assertVmSource(source);
  const output: PyInstruction[] = [];
  const add = (line: number, op: PyOp, ...args: PyValue[]) => {
    output.push({ op, args, line, nm: encodeVMName(op).nm });
    assertBrowserInstructions(output);
  };
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const statements: { number: number; indent: number; statement: string }[] = [];
  lines.forEach((raw, index) => {
    const number = index + 1;
    if (raw.includes("\t")) throw new PythonSubsetError(number, "Use spaces, not tabs");
    const text = withoutComment(raw);
    if (!text.trim()) return;
    const indent = text.length - text.trimStart().length;
    const statement = text.trim();
    if (/[^ ]/.test(text.slice(0, indent))) throw new PythonSubsetError(number, "Use spaces for indentation");
    statements.push({ number, indent, statement });
  });
  let cursor = 0;
  const patch = (index: number) => { output[index].args = [output.length]; };
  function body(parentIndent: number, inFunction: boolean, depth: number, line: number): void {
    const next = statements[cursor];
    if (!next || next.indent <= parentIndent) throw new PythonSubsetError(line, "Block requires an indented body");
    block(next.indent, inFunction, depth + 1);
  }
  function block(indent: number, inFunction: boolean, depth: number): void {
    if (depth > 64) throw new PythonSubsetError(statements[cursor].number, "Block nesting exceeds the safety limit");
    while (cursor < statements.length) {
      const { number, indent: currentIndent, statement } = statements[cursor];
      if (currentIndent < indent) return;
      if (currentIndent > indent) throw new PythonSubsetError(number, "Unexpected indentation");
      cursor++;
      const emit = (op: PyOp, ...args: PyValue[]) => add(number, op, ...args);
      const conditional = statement.match(/^if\s+(.+)\s*:$/);
      if (conditional) {
        const endJumps: number[] = [];
        let condition = conditional[1], branchLine = number;
        // Sibling elif clauses do not increase block depth. Each false edge
        // reaches the next condition; every taken body skips the entire tail.
        while (true) {
          const branchEmit = (op: PyOp, ...args: PyValue[]) => add(branchLine, op, ...args);
          expressionInstructions(condition, branchLine, branchEmit, output.length);
          const falseJump = output.length;
          branchEmit("JFALSE", 0);
          body(indent, inFunction, depth, branchLine);
          const next = statements[cursor];
          const elif = next?.indent === indent ? next.statement.match(/^elif\s+(.+)\s*:$/) : null;
          if (elif || (next?.indent === indent && next.statement === "else:")) {
            endJumps.push(output.length);
            branchEmit("JUMP", 0);
            patch(falseJump);
            cursor++;
            if (elif) {
              condition = elif[1];
              branchLine = next.number;
              continue;
            }
            body(indent, inFunction, depth, next.number);
          } else patch(falseJump);
          break;
        }
        endJumps.forEach(patch);
        continue;
      }
      const fn = statement.match(/^def ([A-Za-z_][A-Za-z_0-9]*)\s*\(([^)]*)\)\s*:$/);
      if (fn) {
        if (depth !== 0) throw new PythonSubsetError(number, "Only top-level function definitions are supported");
        assertName(fn[1], number);
        const params = fn[2].trim() ? fn[2].split(",").map(p => p.trim()) : [];
        if (params.at(-1) === "") params.pop();
        params.forEach(p => assertName(p, number));
        if (new Set(params).size !== params.length) throw new PythonSubsetError(number, "Duplicate function parameter");
        add(number, "FUNC", fn[1], ...params);
        body(indent, true, depth, number);
        add(number, "CONST", null);
        add(number, "RETURN");
        add(number, "END");
        continue;
      }
      if (/^return(?:\s|$)/.test(statement)) {
        if (!inFunction) throw new PythonSubsetError(number, "return outside a function");
        const expression = statement.slice(6).trim();
        if (expression) expressionInstructions(expression, number, emit, output.length);
        else emit("CONST", null);
        emit("RETURN"); continue;
      }
      const assignment = statement.match(/^([A-Za-z_][A-Za-z_0-9]*)\s*=(?!=)\s*(.+)$/);
      if (assignment) {
        assertName(assignment[1], number);
        expressionInstructions(assignment[2], number, emit, output.length);
        emit("STORE", assignment[1]); continue;
      }
      expressionInstructions(statement, number, emit, output.length);
      emit("DROP");
    }
  }
  block(0, false, 0);
  add(lines.length, "HALT");
  const wls = [
    `// ${PYTHON_SUBSET_VERSION} — pure computation; no external effects`,
    ...output.map(i => `@${i.nm}nm ${i.op} ${JSON.stringify({ line: i.line, args: i.args })}`),
  ].join("\n");
  assertVmSource(wls);
  return wls;
}

const ARITY: Record<PyOp, number | "function"> = {
  CONST: 1, LOAD: 1, STORE: 1, ADD: 0, SUB: 0, MUL: 0, FLOORDIV: 0, MOD: 0,
  POS: 0, NEG: 0, CALL: 2, DROP: 0, FUNC: "function", END: 0, RETURN: 0, HALT: 0,
  EQ: 0, NE: 0, LT: 0, LE: 0, GT: 0, GE: 0, JUMP: 1, JFALSE: 1,
  JFALSEKEEP: 1, JTRUEKEEP: 1, NOT: 0,
};
/** Strict second-stage compiler: unknown/malformed operations never become EXEC. */
export function compilePythonWavelength(source: string): PyInstruction[] {
  assertVmSource(source);
  if (!source.startsWith(`// ${PYTHON_SUBSET_VERSION} `)) {
    throw new PythonSubsetError(1, "Missing supported WavelengthScript subset version");
  }
  const result: PyInstruction[] = [];
  let functionOpen = false;
  source.split("\n").forEach((raw, index) => {
    if (!raw.trim() || raw.trimStart().startsWith("//")) return;
    const match = raw.match(/^@(\d+(?:\.\d+)?)nm ([A-Z]+) (.+)$/);
    const fail = (): never => { throw new PythonSubsetError(index + 1, "Invalid WavelengthScript subset instruction"); };
    if (!match || !Object.prototype.hasOwnProperty.call(ARITY, match[2])) return fail();
    const op = match[2] as PyOp;
    const nm = Number(match[1]);
    let data: { line: number; args: PyValue[] };
    try { data = JSON.parse(match[3]); } catch { return fail(); }
    if (!data || !Number.isSafeInteger(data.line) || data.line < 1 ||
        !Array.isArray(data.args) || data.args.some(v =>
          !(v === null || typeof v === "boolean" || typeof v === "string" ||
            (typeof v === "number" && Number.isSafeInteger(v))))) return fail();
    if (nm !== encodeVMName(op).nm) return fail();
    if (op === "FUNC") {
      if (functionOpen || !data.args.length || data.args.length > 257 || data.args.some(v =>
        typeof v !== "string" || !PY_IDENTIFIER.test(v) || PY_RESERVED.has(v) || v === "print") ||
        new Set(data.args.slice(1)).size !== data.args.length - 1) return fail();
      functionOpen = true;
    } else if (data.args.length !== ARITY[op]) return fail();
    if (op === "END") { if (!functionOpen) return fail(); functionOpen = false; }
    if (op === "RETURN" && !functionOpen) return fail();
    if (op === "HALT" && functionOpen) return fail();
    if ((op === "LOAD" || op === "STORE" || op === "CALL") &&
        (typeof data.args[0] !== "string" || !PY_IDENTIFIER.test(data.args[0]) ||
          PY_RESERVED.has(data.args[0]) || (op !== "CALL" && data.args[0] === "print"))) return fail();
    if (op === "CALL" && (typeof data.args[1] !== "number" || data.args[1] < 0 || data.args[1] > 256)) return fail();
    result.push({ op, nm, line: data.line, args: data.args });
    assertBrowserInstructions(result);
  });
  if (functionOpen || result.at(-1)?.op !== "HALT" ||
      result.slice(0, -1).some(i => i.op === "HALT")) {
    throw new PythonSubsetError(1, "Program must end with one top-level HALT");
  }
  // Every jump is forward and stays within its execution frame. Validate all
  // instructions, including unreachable branches, before any execution.
  let owner = -1;
  const owners = result.map((instruction, index) => {
    const current = owner;
    if (instruction.op === "FUNC") owner = index;
    if (instruction.op === "END") owner = -1;
    return current;
  });
  result.forEach((instruction, index) => {
    if (!["JUMP", "JFALSE", "JFALSEKEEP", "JTRUEKEEP"].includes(instruction.op)) return;
    const target = instruction.args[0];
    if (typeof target !== "number" || !Number.isSafeInteger(target) ||
        target <= index || target >= result.length || owners[target] !== owners[index] ||
        result[target].op === "END") {
      throw new PythonSubsetError(instruction.line, "Invalid bytecode branch target");
    }
  });
  return result;
}
