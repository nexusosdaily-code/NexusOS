/** A deliberately small Python expression parser. Never invokes JS evaluation. */
export type PyValue = string | number | boolean | null;
export type PyOp = "CONST" | "LOAD" | "STORE" | "ADD" | "SUB" | "MUL" |
  "FLOORDIV" | "MOD" | "POS" | "NEG" | "CALL" | "DROP" | "FUNC" |
  "END" | "RETURN" | "HALT" | "EQ" | "NE" | "LT" | "LE" | "GT" | "GE" |
  "JUMP" | "JFALSE" | "JFALSEKEEP" | "JTRUEKEEP" | "NOT";
export interface PyInstruction {
  op: PyOp;
  args: PyValue[];
  line: number;
  nm: number;
}
export class PythonSubsetError extends Error {
  constructor(public line: number, message: string) {
    super(`Line ${line}: ${message}`);
    this.name = "PythonSubsetError";
  }
}
interface Token { kind: string; value: PyValue }
export const PY_IDENTIFIER = /^[A-Za-z_][A-Za-z_0-9]*$/;
export const PY_RESERVED = new Set([
  "if", "else", "elif", "for", "while", "import", "from", "class", "lambda",
  "async", "await", "yield", "try", "except", "finally", "with", "as", "in",
  "is", "and", "or", "not", "def", "return", "global", "nonlocal", "del",
  "pass", "break", "continue", "raise", "assert", "True", "False", "None",
]);

export function expressionInstructions(
  source: string, line: number, output: (op: PyOp, ...args: PyValue[]) => void,
  instructionOffset = 0,
): void {
  const fail = (message: string): never => { throw new PythonSubsetError(line, message); };
  // Assemble locally so expression jumps can be relocated into the containing
  // program, including expressions nested inside call arguments and functions.
  const instructions: { op: PyOp; args: PyValue[] }[] = [];
  const emit = (op: PyOp, ...args: PyValue[]) => { instructions.push({ op, args }); };
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "#") break;
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let value = "";
      i++;
      let closed = false;
      while (i < source.length) {
        const c = source[i++];
        if (c === quote) { closed = true; break; }
        if (c === "\\") {
          const escaped = source[i++];
          const escapes: Record<string, string> = {
            n: "\n", r: "\r", t: "\t", b: "\b", f: "\f",
            "\\": "\\", "'": "'", '"': '"',
          };
          if (!Object.prototype.hasOwnProperty.call(escapes, escaped)) fail("String escape is outside the supported subset");
          value += escapes[escaped];
        } else value += c;
      }
      if (!closed) fail("Unterminated string");
      tokens.push({ kind: "value", value });
    } else if (/\d/.test(ch)) {
      const start = i;
      while (/\d/.test(source[i] ?? "") && i < source.length) i++;
      const text = source.slice(start, i);
      if (text.length > 1 && text.startsWith("0") && /[1-9]/.test(text)) {
        fail("Leading-zero decimal integers are not supported");
      }
      const value = Number(text);
      if (!Number.isSafeInteger(value)) fail("Integer exceeds the safe integer range");
      tokens.push({ kind: "value", value });
    } else if (/[A-Za-z_]/.test(ch)) {
      const start = i++;
      while (i < source.length && /[A-Za-z_0-9]/.test(source[i])) i++;
      const name = source.slice(start, i);
      if (name === "True" || name === "False" || name === "None") {
        tokens.push({ kind: "value", value: name === "None" ? null : name === "True" });
      } else if (name === "and" || name === "or" || name === "not") {
        tokens.push({ kind: name, value: null });
      } else {
        if (PY_RESERVED.has(name)) fail(`Unsupported expression keyword: ${name}`);
        tokens.push({ kind: "name", value: name });
      }
    } else if (["//", "==", "!=", "<=", ">="].includes(source.slice(i, i + 2))) {
      tokens.push({ kind: source.slice(i, i + 2), value: null }); i += 2;
    } else if ("+-*%(),<>".includes(ch)) {
      tokens.push({ kind: ch, value: null }); i++;
    } else fail(`Unsupported expression syntax: ${ch}`);
    if (tokens.length > 2048) fail("Expression exceeds the token safety limit");
  }
  tokens.push({ kind: "eof", value: null });
  let pos = 0;
  let depth = 0;
  const peek = () => tokens[pos].kind;
  const require = (kind: string) => {
    if (peek() !== kind) fail(`Expected ${kind}, found ${peek()}`);
    pos++;
  };
  const precedence: Record<string, number> = {
    "or": 0, "and": 1,
    "==": 3, "!=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3,
    "+": 4, "-": 4, "*": 5, "//": 5, "%": 5,
  };
  const ops: Record<string, PyOp> = {
    "==": "EQ", "!=": "NE", "<": "LT", "<=": "LE", ">": "GT", ">=": "GE",
    "+": "ADD", "-": "SUB", "*": "MUL", "//": "FLOORDIV", "%": "MOD",
  };
  function parse(minimum = 0): void {
    if (++depth > 64) fail("Expression nesting exceeds the safety limit");
    if (peek() === "not" && minimum <= 2) {
      pos++; parse(2); emit("NOT");
    } else if (peek() === "+" || peek() === "-") {
      const sign = peek(); pos++; parse(6); emit(sign === "+" ? "POS" : "NEG");
    } else if (peek() === "value") emit("CONST", tokens[pos++].value);
    else if (peek() === "name") {
      const name = tokens[pos++].value as string;
      if (peek() === "(") {
        pos++;
        let count = 0;
        if (peek() !== ")") {
          while (true) {
            parse(); count++;
            if (peek() !== ",") break;
            pos++;
            if (peek() === ")") break;
          }
        }
        require(")");
        emit("CALL", name, count);
      } else emit("LOAD", name);
    } else if (peek() === "(") {
      pos++; parse(); require(")");
    } else fail(`Expected a value, found ${peek()}`);
    let compared = false;
    while (Object.prototype.hasOwnProperty.call(precedence, peek()) && precedence[peek()] >= minimum) {
      const op = peek(); pos++;
      if (precedence[op] === 3) {
        if (compared) fail("Chained comparisons are outside the supported subset");
        compared = true;
      }
      if (op === "and" || op === "or") {
        const jump = instructions.length;
        emit(op === "and" ? "JFALSEKEEP" : "JTRUEKEEP", 0);
        parse(precedence[op] + 1);
        instructions[jump].args = [instructionOffset + instructions.length];
        // A comparison in the next boolean operand is a separate comparison.
        compared = false;
      } else {
        parse(precedence[op] + 1); emit(ops[op]);
      }
    }
    depth--;
  }
  parse();
  if (peek() !== "eof") fail(`Unsupported expression syntax: ${peek()}`);
  instructions.forEach(i => output(i.op, ...i.args));
}
