import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { translatePython, compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength, PythonVMError } from "../shared/wavelength-python-vm";
import { VM_MAX_CYCLES, VM_MAX_SOURCE_LENGTH } from "../shared/vm-security";
import { encodeVMName } from "../shared/wnsp-model";

const run = (source: string) => executePythonWavelength(translatePython(source));

const examples = [
  'print("Hello, world")',
  'x = 2 + 3 * 4\nprint(x, (2 + 3) * 4, -x, +x)',
  'print(-7 // 3, -7 % 3, 7 // -3, 7 % -3)',
  'print(9007199254740991 % -9007199254740990)',
  'text = "hello # world"\nprint(text + "!", True, False, None)',
  'print("quote: \\" and \\\' and \\\\ and \\nnewline") # trailing comment',
  'def greet(name):\n    message = "Hello, " + name\n    print(message)\n    return message\n\ndef add(a, b):\n    result = a + b\n    return result\n\ngreet("World")\nprint(add(3, 4))',
  'x = 10\ndef add(a):\n    x = a + 1\n    return x\nprint(add(x), x)',
  'def one():\n    return 1\n    print("unreachable")\nprint(one())',
  'def noop():\n    print("inside")\nprint(noop())',
  'def empty():\n    return\nprint(empty())\nprint()',
  'def twice(a,):\n    return a * 2\nprint(twice(5,))',
  'def unused():\n    print("must not execute")\nprint("top level")',
  'def f():\n    return 1\ndef f():\n    return 2\nprint(f())',
  'print(1 == 1, 1 != 2, 1 < 2, 2 <= 2, 3 > 2, 3 >= 3)',
  'print(1 + 2 * 3 == 7, (1 < 2) == True, -3 < -2)',
  'print(True == 1, False == 0, True > False, None == None, None != 0, "1" == 1)',
  'print("a" < "aa", "b" > "aa", "😀" > "￿", "é" >= "z", "" <= "")',
  'if 2 < 3:\n    print("taken")\nelse:\n    print(1 // 0)\nprint("done")',
  'if False:\n    missing()\nelse:\n    print("else")',
  'if True:\n    if False:\n        print("wrong")\n    else:\n        print("inner")\nelse:\n    print("outer")',
  'if False:\n    print("wrong")\nelse:\n    if True:\n        print("nested else")\nprint("after")',
  'x = 5\nif x:\n    y = 2\nprint(y)\nif 0:\n    missing()\nprint(x)',
  'if "":\n    missing()\nif None:\n    missing()\nif False:\n    missing()\nif -1:\n    print("nonzero")\nif "False":\n    print("nonempty")',
  'def choose(a):\n    if a < 0:\n        return "negative"\n    else:\n        if a == 0:\n            return "zero"\n        else:\n            return "positive"\nprint(choose(-2), choose(0), choose(2))',
  'def f(a):\n    if a:\n        x = 3\n    else:\n        x = 4\n    return x\nprint(f(True), f(False))',
  'x = 7\ndef f(a):\n    if a:\n        return x\n    return 0\nprint(f(True), f(False), x)',
  'def f(a):\n    if a:\n        return 1\nprint(f(True), f(False))',
  'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\nprint(fact(6))',
  'if True: # comment\n  print("yes: #")\n\n# ignored\nelse: # other\n  print("no")\ndef f():\n    return 3\nprint(f())',
  'def check():\n    print("once")\n    return 1\nif check() == 1:\n    print("yes")',
  'def f(x):\n    if x:\n        print(x)\n    return x\nprint(f(3) > f(2))',
  'print(False and (1 // 0), True or (1 // 0), None and missing(), "ready" or missing())',
  'print(0 and missing, 7 or missing, "" and missing(), -2 or missing())',
  'print(0 or "fallback", "left" and 42, None or False, True and None, "" or 0)',
  'print(not False, not None, not 0, not "", not -1, not "False", not not 4)',
  'print(True or False and False, (True or False) and False, not 1 == 2, not 1 + 2 < 4)',
  'print(1 < 2 and 3 < 4, 1 == 2 or 3 >= 3, not 1 < 2 or 4 != 5 and not 0)',
  'print(1 or 2 or 3, 1 and 2 and 3, 0 or "" or None, 1 and "" and missing())',
  'print((0 or 2) + 3, 1 == (0 or 1), (not 0) == True, -(0 or 3), not -2 * 3)',
  'andrew = 3\norigin = 4\nnothing = 5\nprint(andrew and origin or nothing, "and or not")',
  'def mark(value):\n    print(value)\n    return value\nprint(mark(0) and mark(9), mark(2) or mark(8), mark(3) and mark(4), mark("") or mark(5))',
  'def mark(value):\n    print(value)\n    return value\nprint(mark(1) and (mark(0) or mark(2)) or mark(3))\nprint(not mark(0) and mark(4))',
  'def pair(a, b):\n    print(a, b)\n    return b\nx = 9\ny = 0 or 6\nprint(pair(x and y, False or "ok"))',
  'def choose(a, b):\n    if a and not b:\n        return a or missing()\n    else:\n        return b and "fallback"\nprint(choose(4, 0), choose(0, 5))',
  'def f():\n    return 0 or 5\n    missing()\nprint(f())\nFalse and missing()\nTrue or missing()',
  'def f():\n    return False and f()\ndef g():\n    return True or g()\nprint(f(), g())',
  'if False and missing():\n    print("wrong")\nelse:\n    if True or missing():\n        print("right")',
  'x = 9\ndef f():\n    print(False and x, True or x)\n    x = 3\n    return not x\nprint(f())',
  'print(print("first") or print("second"))\nprint(print("third") and missing())',
  'def choose(n):\n    if n < 0:\n        return "negative"\n    elif n == 0:\n        return "zero"\n    elif n == 1:\n        return "one"\n    else:\n        return "many"\nprint(choose(-1), choose(0), choose(1), choose(2))',
  'if False:\n    missing()\nelif 0:\n    missing()\nelif None:\n    missing()\nelif "":\n    missing()\nelif "yes":\n    print("truthy")\nelif 1 // 0:\n    missing()\nelse:\n    missing()\nprint("done")',
  'if True:\n    print("first")\nelif missing():\n    print(1 // 0)\nelse:\n    missing()',
  'x = 7\nif False:\n    x = 1\nelif False:\n    x = 2\nprint(x)\nif False:\n    print(1)\nelif True:\n    x = 3\nprint(x)',
  'def check(n):\n    print("check", n)\n    return n\nif check(0):\n    missing()\nelif check(1):\n    print("selected")\nelif check(2):\n    missing()\nelse:\n    missing()',
  'if False:\n    missing()\nelif True:\n    if False:\n        missing()\n    elif False:\n        missing()\n    else:\n        print("inner else")\nelif True:\n    missing()\nelse:\n    missing()\nif True:\n    if False:\n        missing()\n    elif True:\n        print("inner elif")\nelse:\n    missing()',
  'if False: # first\n  missing()\n\n# next clause\nelif True: # selected\n  print("elif: #")\nelse: # last\n  missing()',
  'def f(n):\n    if n == 1:\n        x = 10\n    elif n == 2:\n        x = 20\n    else:\n        x = 30\n    return x\nprint(f(1), f(2), f(3))',
  'def f(n):\n    if n == 1:\n        return 1\n    elif n == 2:\n        return 2\nprint(f(1), f(2), f(3))',
  'if False:\n    missing()\nelif False:\n    missing()\nelse:\n    print("fallback")\ndef f():\n    if False:\n        missing()\n    elif False:\n        missing()\n    else:\n        print("function fallback")\nprint(f())',
  'def choose(n):\n    if n < 0 and not n == -2:\n        return "negative"\n    elif n == 0 or n == -2:\n        return "special"\n    elif n and (True or missing()):\n        return "positive"\n    else:\n        return "fallback"\nprint(choose(-1), choose(-2), choose(0), choose(2))',
];

// Test-owned grammar only: no file, environment, request or browser input can
// become a program for the CPython oracle. Chains intentionally remain excluded.
const LOGICAL_SEED = 0x726c0de;
const LOGICAL_DEPTH = 3;
const LOGICAL_RANDOM_CASES = 96;
const logicalLiterals = ["None", "False", "True", "0", "-2", '""', '"chosen"'] as const;
const logicalComparisons = ["==", "!=", "<", "<=", ">", ">="] as const;
type LogicalExpression =
  | { kind: "atom"; text: string }
  | { kind: "not"; child: LogicalExpression }
  | { kind: "group"; child: LogicalExpression }
  | { kind: "mark"; child: LogicalExpression }
  | { kind: "and" | "or" | "compare"; left: LogicalExpression; right: LogicalExpression; op?: string };

function generatedLogicalCorpus() {
  let state = LOGICAL_SEED;
  const pick = (length: number) => {
    // Unsigned LCG: reproducible across platforms, with no clock/random input.
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % length;
  };
  const atom = (text: string): LogicalExpression => ({ kind: "atom", text });
  const generate = (depth: number): LogicalExpression => {
    if (depth === 0) return atom(logicalLiterals[pick(logicalLiterals.length)]);
    const kind = pick(7);
    if (kind < 3) {
      return { kind: (["not", "group", "mark"] as const)[kind], child: generate(depth - 1) };
    }
    if (kind < 5) {
      return {
        kind: kind === 3 ? "and" : "or",
        left: generate(depth - 1), right: generate(depth - 1),
      };
    }
    // Equality accepts all supported values; ordering stays numeric/boolean.
    // Explicitly grouped children prevent accidental chained comparisons.
    const op = logicalComparisons[pick(logicalComparisons.length)];
    const operands = op === "==" || op === "!="
      ? logicalLiterals : ["False", "True", "0", "-2", "3"];
    return {
      kind: "compare", op,
      left: { kind: "mark", child: atom(operands[pick(operands.length)]) },
      right: { kind: "mark", child: atom(operands[pick(operands.length)]) },
    };
  };
  let marker = 0;
  const render = (node: LogicalExpression, minimum = 0): string => {
    if (node.kind === "atom") return node.text;
    if (node.kind === "group") return `(${render(node.child)})`;
    if (node.kind === "mark") return `mark("m${marker++}", ${render(node.child)})`;
    const precedence = node.kind === "or" ? 0 : node.kind === "and" ? 1 : node.kind === "not" ? 2 : 3;
    const text = node.kind === "not" ? `not ${render(node.child, precedence)}`
      : node.kind === "compare" ? `(${render(node.left)}) ${node.op} (${render(node.right)})`
      : `${render(node.left, precedence)} ${node.kind} ${render(node.right, precedence + 1)}`;
    return precedence < minimum ? `(${text})` : text;
  };
  const expressions = Array.from({ length: LOGICAL_RANDOM_CASES }, () => render(generate(LOGICAL_DEPTH)));
  // A bounded product guarantees each operator, truthiness class and reached/
  // skipped failure, rather than relying on a lucky distribution from the seed.
  for (const [index, literal] of logicalLiterals.entries()) {
    const left = `mark("left${index}", ${literal})`;
    const right = `mark("right${index}", ${logicalLiterals[(index + 1) % logicalLiterals.length]})`;
    for (const op of ["and", "or"]) {
      expressions.push(
        `${left} ${op} ${right}`,
        `not (${left} ${op} not ${right})`,
        `(${left} ${op} ${right}) or (not ${left} and ${right})`,
      );
      for (const hazard of ["1 // 0", "missing()", "None < 1"]) {
        expressions.push(`${left} ${op} (mark("before_error", 1) and (${hazard}))`);
      }
    }
  }
  for (const op of logicalComparisons) {
    expressions.push(
      `not mark("a", 0) ${op} mark("b", 1) and mark("c", "yes") or mark("d", "")`,
      `(mark("a", 0) or mark("b", 2)) ${op} (mark("c", 3) and mark("d", 1))`,
      `mark("a", "😀") ${op} mark("b", "￿") or not mark("c", "")`,
    );
  }
  return expressions.map((expression, index) => {
    const prelude = 'def mark(label, value):\n    print(label, value)\n    return value\n';
    // Exercise jump relocation at top level, within return expressions and
    // within call arguments. Every success also exercises conditional truthiness.
    const body = index % 3 === 0 ? `result = ${expression}`
      : index % 3 === 1 ? `def evaluate():\n    return ${expression}\nresult = evaluate()`
      : `result = mark("selected", ${expression})`;
    const source = `${prelude}${body}\nprint("value", result)\nif result:\n    print("truthy")\nelse:\n    print("falsy")`;
    return { expression, source };
  });
}

const logicalCorpus = generatedLogicalCorpus();

type LogicalOracleResult = {
  stdout: string;
  value: string | number | boolean | null;
  error: "ZeroDivisionError" | "NameError" | "TypeError" | null;
  line: number | null;
};

function logicalCPythonOracle(): LogicalOracleResult[] {
  // One isolated, bounded process for this closed corpus, not a general-purpose
  // subprocess helper. No loops/recursion/imports are generated in its programs.
  const driver = `
import contextlib, io, json, traceback
programs = json.loads(${JSON.stringify(JSON.stringify(logicalCorpus.map(c => c.source)))})
results = []
for source in programs:
    namespace = {}
    output = io.StringIO()
    error = None
    line = None
    with contextlib.redirect_stdout(output):
        try:
            exec(compile(source, "<logical-corpus>", "exec"), namespace)
        except Exception as failure:
            error = type(failure).__name__
            line = [frame.lineno for frame in traceback.extract_tb(failure.__traceback__)
                    if frame.filename == "<logical-corpus>"][-1]
    results.append(dict(stdout=output.getvalue(), value=namespace.get("result"), error=error, line=line))
print(json.dumps(results))
`;
  return JSON.parse(execFileSync("python", ["-I", "-c", driver], {
    encoding: "utf8", timeout: 5000, maxBuffer: 200_000, stdio: "pipe",
  }));
}

describe("Python subset → WavelengthScript → shared VM", () => {
  it("matches a bounded fixed-seed logical corpus against isolated CPython", () => {
    expect(generatedLogicalCorpus()).toEqual(logicalCorpus);
    expect(logicalCorpus).toHaveLength(198);
    expect(new Set(logicalCorpus.map(c => c.expression)).size).toBeGreaterThan(150);
    expect(Math.max(...logicalCorpus.map(c => c.source.length))).toBeLessThan(2000);
    const expected = logicalCPythonOracle();
    expect(expected).toHaveLength(logicalCorpus.length);
    const errorPatterns = {
      ZeroDivisionError: /Division by zero/,
      NameError: /Undefined function: missing/,
      TypeError: /Ordering requires/,
    };
    const outcomes = new Map<string, number>();
    for (const [index, { expression, source }] of logicalCorpus.entries()) {
      const oracle = expected[index];
      const context = `seed=${LOGICAL_SEED} case=${index}: ${expression}\n${source}`;
      outcomes.set(oracle.error ?? "success", (outcomes.get(oracle.error ?? "success") ?? 0) + 1);
      if (oracle.error !== null) {
        expect(errorPatterns, context).toHaveProperty(oracle.error);
        let failure: unknown;
        try { run(source); } catch (error) { failure = error; }
        expect(failure, context).toBeInstanceOf(PythonVMError);
        expect((failure as Error).message, context).toMatch(errorPatterns[oracle.error]);
        expect((failure as Error).message, context).toMatch(new RegExp(`^Line ${oracle.line}:`));
        const partial = (failure as PythonVMError).diagnostics;
        expect(partial.output.length ? partial.output.join("\n") + "\n" : "", context).toBe(oracle.stdout);
        expect(partial.cycles, context).toBe(partial.trace.length);
      } else {
        const actual = run(source);
        expect(actual.variables.result, context).toBe(oracle.value);
        expect(actual.output.join("\n") + "\n", context).toBe(oracle.stdout);
        expect(actual.cycles, context).toBe(actual.trace.length);
      }
    }
    expect([...outcomes.keys()].sort()).toEqual(["NameError", "TypeError", "ZeroDivisionError", "success"]);
    expect(outcomes.get("success")).toBeGreaterThan(150);
    for (const error of Object.keys(errorPatterns)) expect(outcomes.get(error)).toBe(7);
  }, 10_000);

  it.each(examples)("matches isolated CPython stdout: %s", source => {
    // Fixed test fixtures only; user-provided browser code never reaches Python.
    const expected = execFileSync("python", ["-I", "-c", source], {
      encoding: "utf8", timeout: 3000, maxBuffer: 100_000,
    });
    const actual = run(source).output;
    expect(actual.length ? actual.join("\n") + "\n" : "").toBe(expected);
  });

  it("reports real globals and records only instructions actually executed", () => {
    const result = run('def unused():\n    print("not executed")\nx = 3\nprint(x)');
    expect(result.variables).toEqual({ x: 3 });
    expect(result.output).toEqual(["3"]);
    expect(result.trace.some(i => i.op === "CONST" && i.args[0] === "not executed")).toBe(false);
    expect(result.cycles).toBe(result.trace.length);
  });

  it("matches Python across deterministic signed arithmetic vectors", () => {
    const lines: string[] = [];
    for (let n = 1; n <= 20; n++) {
      const a = n * 13 - 155;
      const b = n % 2 ? -n : n;
      lines.push(`print((${a}) + (${b}) * 2, (${a}) // (${b}), (${a}) % (${b}))`);
    }
    const source = lines.join("\n");
    expect(run(source).output.join("\n") + "\n").toBe(
      execFileSync("python", ["-I", "-c", source], { encoding: "utf8", timeout: 3000 }),
    );
  });

  it("matches isolated CPython for boolean and integer arithmetic in either operand position", () => {
    // Trusted literals only. Include signed divisors to check Python floor/modulo rules.
    const values = ["True", "False", "-7", "0", "3"];
    for (const left of values) {
      const lines = [`print(+(${left}), -(${left}))`];
      for (const right of values) {
        for (const op of ["+", "-", "*", "//", "%"]) {
          if ((op === "//" || op === "%") && (right === "False" || right === "0")) continue;
          lines.push(`print((${left}) ${op} (${right}))`);
        }
      }
      const source = lines.join("\n");
      expect(run(source).output.join("\n") + "\n").toBe(
        execFileSync("python", ["-I", "-c", source], { encoding: "utf8", timeout: 3000 }),
      );
    }
  });

  it.each([
    'a = (False or (True and True))\nb = (True and (False or False))\nprint(+a, -b, a + b, b - a, a * b, b // a, b % a)\nprint(a, b)',
    'def choose(a, b):\n    return a and (False or b)\na = choose(True, True)\nprint(-a, 4 + a, a - 4, -7 * a, -7 // a, a % -7)',
    'print((not False) + (1 < 2), -(2 == 2), (not True) * 7)',
    'print(+(True or missing()), -(False and (1 // 0)), (False or True) + (True or missing()))',
    'print(9007199254740991 + False, False + 9007199254740991, 9007199254740991 - True, True * 9007199254740991, -9007199254740991 // True, True % -9007199254740991)',
  ])("matches isolated CPython for selected booleans and safe-integer boundaries: %s", source => {
    expect(run(source).output.join("\n") + "\n").toBe(
      execFileSync("python", ["-I", "-c", source], { encoding: "utf8", timeout: 3000 }),
    );
  });

  it("produces integer results without changing boolean operands", () => {
    expect(run("a = True\nb = False\np = +a\nn = -a\nz = +b\ns = a + b\nd = b - a\nm = a * b\nq = b // a\nr = b % a").variables)
      .toEqual({ a: true, b: false, p: 1, n: -1, z: 0, s: 1, d: -1, m: 0, q: 0, r: 0 });
  });

  it.each([
    "print(True // False)", "print(False % False)", "print(-7 // False)", "print(7 % False)",
    "print(True // (True and (False or False)))",
    "print(True % (False or (True and False)))",
  ])("matches CPython zero-division failures for boolean divisors: %s", source => {
    expect(() => execFileSync("python", ["-I", "-c", source], {
      encoding: "utf8", timeout: 3000, stdio: "pipe",
    })).toThrow(/ZeroDivisionError/);
    expect(() => run(source)).toThrow(/Line 1: Division by zero/);
  });

  it.each([
    "print(9007199254740991 + True)",
    "print(True + 9007199254740991)",
    "print(-9007199254740991 - True)",
    "print(True - -9007199254740991)",
    "print(9007199254740991 + (False or (True and True)))",
  ])("preserves safe-integer limits with boolean operands: %s", source => {
    expect(() => run(source)).toThrow(/safe integer range/);
  });

  it.each([
    "print(True + 'x')", "print('x' + False)", "print(True - '1')",
    "print('x' * True)", "print(False * 'x')", "print('x' * 2)", "print(2 * 'x')",
    "print('7' // True)", "print(True % '1')", "print('x' % True)",
    "print(None + True)", "print(True * None)", "print(+None)", "print(-'1')",
    "print((True and (False or '1')) + True)",
  ])("keeps string and None arithmetic outside the supported numeric subset: %s", source => {
    expect(() => run(source)).toThrow(/requires (a supported integer|supported integers)/);
  });

  it.each([
    "import os", "for x in range(3):\n    print(x)", "while True:\n    print(1)",
    "print(open('secret'))", "print(window.location)", "print([1,2])",
    "print(1.5)", "print(2 ** 3)", "print(3 / 2)", "print(f'hi')",
    "x = lambda: 1", "class A:\n    pass", "print(1); print(2)",
    "def f(a, a):\n    return a", "def f(a=1):\n    return a", "def f():",
    "    x = 1", "return 1", "x = 01", "print('\\u0061')",
    "print(9007199254740992)", "print = 2",
    "print(1 < 2 < 3)", "print(1 == 1 != 0)", "print(1 is 1)",
    "elif True:\n    print(1)",
    "if True:\n    print(1)\nelif:\n    print(2)",
    "if True:\n    print(1)\nelif False\n    print(2)",
    "if True:\n    print(1)\nelif False:",
    "if True:\n    print(1)\nelif False:\nelse:\n    print(2)",
    "if True:\n    print(1)\n  elif False:\n    print(2)",
    "if True:\n    print(1)\n    elif False:\n        print(2)",
    "if True:\n    print(1)\nelse:\n    print(2)\nelif True:\n    print(3)",
    "if True:\n    print(1)\nx = 1\nelif True:\n    print(2)",
    "if True:\n    print(1)\nelif False: print(2)",
    "if True:\n    print(1)\nelif False:\n    import os",
    "if True:\n    print(1)\nelif 1 < 2 < 3:\n    print(2)",
    "if False:\n    print(1)\nelif True:\n    def f():\n        return 1",
    "if True: print(1)", "else:\n    print(1)", "if True:\nelse:\n    print(1)",
    "if True:\n    print(1)\nelse:", "if True\n    print(1)",
    "if True:\n    print(1)\n  print(2)", "if True:\n\tprint(1)",
    "if True:\n    def f():\n        return 1",
    "def f():\n    def g():\n        return 1",
    "if False:\n    import os", "if True:\n    print(1)\nelse:\n    print([1])",
    "if True:\n    print(1)\nelse:\n    print(2)\nelse:\n    print(3)",
    "print(1 + not 2)", "print(1 == not 2)", "print(-not 1)",
    "print(and 1)", "print(1 or)", "print(not)", "print(1 and or 2)",
    "and = 1", "def not():\n    return 1", "def f(or):\n    return 1",
    "print(True or [1])", "print(False and window.location)",
    "print(True or (1 < 2 < 3))", "print(False and (1 == 2 == 3))",
  ])("rejects unsupported Python without fallback execution: %s", source => {
    expect(() => run(source)).toThrow(/Line \d+:/);
  });

  it.each([
    ["print(x)", /Line 1: Undefined/],
    ["print(1 + 'x')", /Line 1:.*requires supported integers/],
    ["print(5 // 0)", /Line 1: Division by zero/],
    ["print(5 % 0)", /Line 1: Division by zero/],
    ["print(9007199254740991 + 1)", /safe integer/],
    ["print(9007199254740991 * 2)", /safe integer/],
    ["def f(a):\n    return a\nf()", /expects 1 arguments/],
    ["f()\ndef f():\n    return 1", /Undefined function/],
    ["x = 1\nx()", /not a callable/],
    ["x = 1\ndef f():\n    print(x)\n    x = 2\nf()", /uninitialised variable/],
    ["def f():\n    return f()\nf()", /depth safety limit/],
    ["print(None < 1)", /Ordering requires/],
    ["print('1' >= 1)", /Ordering requires/],
    ["if True:\n    print(1 // 0)", /Line 2: Division by zero/],
    ["if False:\n    print(1)\nelse:\n    print(missing)", /Line 4: Undefined/],
    ["print(True and (1 // 0))", /Line 1: Division by zero/],
    ["print(False or missing())", /Line 1: Undefined function/],
    ["print(not missing)", /Line 1: Undefined/],
    ["print(1 and (9007199254740991 + 1))", /safe integer/],
    ["print(0 or (None < 1))", /Ordering requires/],
    ["x = 9\ndef f():\n    print(True and x)\n    x = 3\nf()", /uninitialised variable/],
    ["if False:\n    print(1)\nelif 1 // 0:\n    print(2)", /Line 3: Division by zero/],
    ["if False:\n    print(1)\nelif True:\n    print(missing)", /Line 4: Undefined/],
  ])("fails explicitly at runtime: %s", (source, error) => {
    expect(() => run(source)).toThrow(error);
  });

  it("rejects bytecode tampering and unknown operations before execution", () => {
    const wls = translatePython("print(1)");
    expect(compilePythonWavelength(wls).at(-1)?.op).toBe("HALT");
    expect(() => executePythonWavelength(wls.replace("CONST", "EXEC"))).toThrow();
    expect(() => executePythonWavelength(wls.replace(/@\d+(\.\d+)?nm/, "@1nm"))).toThrow();
    expect(() => executePythonWavelength(wls.replace(/HALT .*/, "HALT invalid"))).toThrow();
    expect(() => executePythonWavelength(wls.replace("WLS-PY/1", "WLS-PY/99"))).toThrow();
  });

  it.each([
    "x = 9\ndef f():\n    print(x)\n    if False:\n        x = 2\nf()",
    "x = 9\ndef f(a):\n    if a:\n        x = 2\n    return x\nf(False)",
    "x = 9\ndef f():\n    print(x)\n    if False:\n        print(1)\n    elif False:\n        x = 2\nf()",
    "x = 9\ndef f():\n    if False:\n        x = 1\n    elif False:\n        x = 2\n    return x\nf()",
    "def f():\n    if False:\n        return 1\n    elif False:\n        x = 2\n    elif x:\n        return 3\nf()",
  ])("matches CPython's local-before-assignment failure across branches", source => {
    expect(() => execFileSync("python", ["-I", "-c", source], {
      encoding: "utf8", timeout: 3000, stdio: "pipe",
    })).toThrow(/UnboundLocalError/);
    expect(() => run(source)).toThrow(/uninitialised variable: x/);
  });

  it("does not trace or execute untaken instructions", () => {
    const result = run('if False:\n    print("untaken", 1 // 0)\nelse:\n    print("taken")');
    expect(result.output).toEqual(["taken"]);
    expect(result.trace.some(i => i.op === "FLOORDIV" || i.args[0] === "untaken")).toBe(false);
    expect(result.trace.some(i => i.op === "JFALSE")).toBe(true);
    expect(result.cycles).toBe(result.trace.length);
    const taken = run('if True:\n    print("taken")\nelse:\n    print("untaken")');
    expect(taken.trace.some(i => i.op === "JUMP")).toBe(true);
    expect(taken.trace.some(i => i.args[0] === "untaken")).toBe(false);
  });

  it("preserves the type and value of each selected boolean operand", () => {
    const values = ["None", "False", "True", "0", "-2", '""', '"nonempty"'];
    // Deterministic literal fixtures only, never user input.
    for (const left of values) {
      const lines = values.map(right => `print(${left} and ${right}, ${left} or ${right})`);
      const source = lines.join("\n");
      expect(run(source).output.join("\n") + "\n").toBe(
        execFileSync("python", ["-I", "-c", source], { encoding: "utf8", timeout: 3000 }),
      );
    }
    expect(run('a = 0 and "unused"\nb = None or "chosen"\nc = True and None\nd = not ""').variables)
      .toEqual({ a: 0, b: "chosen", c: null, d: true });
  });

  it("traces only evaluated logical operands and charges each visited operation", () => {
    const result = run('print(False and (1 // 0), True or missing(), not "")');
    expect(result.output).toEqual(["False True True"]);
    expect(result.trace.some(i => i.op === "FLOORDIV" || i.args[0] === "missing")).toBe(false);
    expect(result.trace.filter(i => ["JFALSEKEEP", "JTRUEKEEP", "NOT"].includes(i.op)).map(i => i.op))
      .toEqual(["JFALSEKEEP", "JTRUEKEEP", "NOT"]);
    expect(result.cycles).toBe(result.trace.length);
    expect(run('print(True and 2, False or 3)').output).toEqual(["2 3"]);
  });

  it.each(["and", "or"])("validates every %s branch, even in skipped expressions", op => {
    const original = compilePythonWavelength(translatePython(
      `x = False and (True ${op} missing())\ndef f():\n    return False ${op} 4\ndef g():\n    return 5\nprint(x)`,
    ));
    const serialize = (code: typeof original) => "// WLS-PY/1 — test fixture\n" +
      code.map(i => `@${i.nm}nm ${i.op} ${JSON.stringify({ line: i.line, args: i.args })}`).join("\n");
    const branches = original.flatMap((i, index) =>
      i.op === "JFALSEKEEP" || i.op === "JTRUEKEEP" ? [index] : []);
    const fn = original.findIndex(i => i.op === "FUNC");
    const end = original.findIndex(i => i.op === "END");
    const g = original.findIndex(i => i.op === "FUNC" && i.args[0] === "g");
    for (const pc of branches) {
      for (const target of [-1, 0, pc, original.length, 1.5, "2", null, true, end,
        pc < fn ? fn + 1 : original.length - 1, g + 1]) {
        const code = original.map(i => ({ ...i, args: [...i.args] }));
        code[pc].args = [target];
        expect(() => executePythonWavelength(serialize(code))).toThrow(/branch target|Invalid WavelengthScript/);
      }
    }
  });

  it("rejects logical stack underflow and malformed NOT before reporting success", () => {
    for (const source of ["False and 1", "True or 1", "not 1"]) {
      const code = compilePythonWavelength(translatePython(source));
      code[0] = { ...code[0], op: "JUMP", nm: encodeVMName("JUMP").nm, args: [1] };
      const wls = "// WLS-PY/1 — test fixture\n" +
        code.map(i => `@${i.nm}nm ${i.op} ${JSON.stringify({ line: i.line, args: i.args })}`).join("\n");
      expect(() => executePythonWavelength(wls)).toThrow(/empty operand stack/);
    }
    const wls = translatePython("not 1");
    expect(() => executePythonWavelength(wls.replace(/NOT (.*)"args":\[\]/,
      'NOT $1"args":[1]'))).toThrow(/Invalid WavelengthScript/);
  });

  it("rejects invalid jumps, including unreachable and cross-frame targets", () => {
    const original = compilePythonWavelength(translatePython(
      "if True:\n    print(1)\nelse:\n    print(2)\ndef f():\n    if True:\n        return 1\nprint(f())",
    ));
    const serialize = (code: typeof original) => "// WLS-PY/1 — test fixture\n" +
      code.map(i => `@${i.nm}nm ${i.op} ${JSON.stringify({ line: i.line, args: i.args })}`).join("\n");
    const top = original.findIndex(i => i.op === "JFALSE");
    const skip = original.findIndex(i => i.op === "JUMP");
    const fn = original.findIndex(i => i.op === "FUNC");
    const inside = original.findIndex((i, p) => p > fn && i.op === "JFALSE");
    for (const [pc, target] of [
      [top, -1], [top, 0], [top, top], [top, original.length], [top, 1.5],
      [top, "2"], [top, null], [top, true], [top, fn + 1],
      [inside, original.length - 1], [inside, original.findIndex(i => i.op === "END")],
      [skip, -1],
    ]) {
      const code = original.map(i => ({ ...i, args: [...i.args] }));
      code[pc as number].args = [target];
      expect(() => executePythonWavelength(serialize(code))).toThrow(/branch target|Invalid WavelengthScript/);
    }
    const twoFunctions = compilePythonWavelength(translatePython(
      "def f():\n    if True:\n        return 1\ndef g():\n    return 2\nprint(f())",
    ));
    twoFunctions.find(i => i.op === "JFALSE")!.args = [twoFunctions.findIndex(i => i.op === "FUNC" && i.args[0] === "g") + 1];
    expect(() => executePythonWavelength(serialize(twoFunctions))).toThrow(/branch target/);
  });

  it("skips and does not trace later elif conditions or bodies after a match", () => {
    const result = run('if False:\n    missing()\nelif True:\n    print("selected")\nelif 1 // 0:\n    print("untaken")\nelse:\n    missing()');
    expect(result.output).toEqual(["selected"]);
    expect(result.trace.some(i => i.op === "FLOORDIV" || i.args[0] === "missing" || i.args[0] === "untaken")).toBe(false);
    expect(result.trace.filter(i => i.op === "JFALSE")).toHaveLength(2);
    expect(result.cycles).toBe(result.trace.length);
  });

  it("validates every elif edge even when unreachable, retaining frame boundaries", () => {
    const code = compilePythonWavelength(translatePython(
      "if True:\n    print(1)\nelif False:\n    print(2)\nelif True:\n    print(3)\ndef f():\n    if False:\n        return 1\n    elif True:\n        return 2\ndef g():\n    return 3\nprint(f())",
    ));
    const fn = code.findIndex(i => i.op === "FUNC");
    const end = code.findIndex(i => i.op === "END");
    const otherFn = code.findIndex(i => i.op === "FUNC" && i.args[0] === "g");
    const serialize = () => "// WLS-PY/1 — test fixture\n" +
      code.map(i => `@${i.nm}nm ${i.op} ${JSON.stringify({ line: i.line, args: i.args })}`).join("\n");
    code.forEach((i, pc) => {
      if (i.op !== "JUMP" && i.op !== "JFALSE") return;
      const original = i.args;
      expect(original[0]).toBeGreaterThan(pc);
      for (const target of [pc, code.length, end, pc < fn ? fn + 1 : otherFn + 1]) {
        i.args = [target];
        expect(() => executePythonWavelength(serialize())).toThrow(/branch target/);
      }
      i.args = original;
    });
  });

  it("keeps long elif chains iterative and bounded by instruction and cycle limits", () => {
    const chain = (n: number) => "if False:\n    print(0)\n" +
      Array.from({ length: n }, () => "elif False:\n    print(0)\n").join("") +
      'else:\n    print("done")';
    expect(run(chain(80)).output).toEqual(["done"]);
    expect(() => translatePython(chain(350))).toThrow(/instruction/);
    const source = "def f():\n    " + chain(80).replaceAll("\n", "\n    ") +
      "\n" + "f()\n".repeat(15);
    expect(() => run(source)).toThrow(/cycle safety/);
  });

  it("bounds source, expansion, nesting, execution and output", () => {
    expect(() => translatePython("x".repeat(VM_MAX_SOURCE_LENGTH + 1))).toThrow(/64 KB/);
    expect(() => run("print(" + "(".repeat(70) + "1" + ")".repeat(70) + ")")).toThrow(/nesting/);
    expect(() => translatePython("x = 1\n".repeat(1025))).toThrow(/instruction/);
    expect(run("def f():\n    return 1\n" + "f()\n".repeat(511)).cycles).toBe(2046);
    const calls = "def f():\n    return 1\n" + "f()\n".repeat(512);
    expect(() => run(calls)).toThrow(/cycle safety/);
    const growth = 'x = "0123456789"\n' + "x = x + x\n".repeat(13) + "print(x)";
    expect(() => run(growth)).toThrow(/String exceeds/);
    expect(() => run(`x = "${"x".repeat(5000)}"\n` + "print(x)\n".repeat(14))).toThrow(/Output exceeds/);
    const nested = Array.from({ length: 66 }, (_, n) => " ".repeat(n) + "if True:").join("\n");
    expect(() => run(nested + "\n" + " ".repeat(66) + "print(1)")).toThrow(/Block nesting/);
    expect(() => translatePython("if True:\n    print(1)\n".repeat(410))).toThrow(/instruction/);
    expect(() => run("def f():\n    if True:\n        return 1\n" + "f()\n".repeat(350))).toThrow(/cycle safety/);
    expect(() => run("def f():\n    if True:\n        return f()\nf()")).toThrow(/depth safety/);
    expect(() => run("not ".repeat(70) + "True")).toThrow(/nesting/);
    expect(() => translatePython("x = " + "True and ".repeat(1024) + "True")).toThrow(/token safety/);
    expect(() => translatePython("x = " + "True or ".repeat(1023) + "True")).toThrow(/instruction|64 KB/);
    expect(() => run("def f():\n    return True and f()\nf()")).toThrow(/depth safety/);
    expect(() => run("def f():\n    return False or f()\nf()")).toThrow(/depth safety/);
    expect(() => run("def f():\n    return not False\n" + "False or f()\n".repeat(343))).toThrow(/cycle safety/);
    expect(() => run("print(" + "True or 1,".repeat(256) + "2)")).toThrow(/Operand stack|Invalid WavelengthScript/);
    expect(run("print(" + "True and 2,".repeat(255) + "False or 3)").output[0].split(" ")).toHaveLength(256);
    expect(() => run("print(" + "1,".repeat(255) + "True and (1 + 2))")).toThrow(/Operand stack/);
  });
});

describe("Python partial failure diagnostics", () => {
  it.each([
    { expression: 'mark("left", 2) + mark("right", 3) // 0', op: "FLOORDIV", error: "ZeroDivisionError", message: "Division by zero" },
    { expression: 'mark("left", 2) + mark("right", 3) + missing', op: "LOAD", error: "NameError", message: "Undefined or uninitialised variable: missing" },
    { expression: 'mark("left", 2) + mark("right", 3) + missing()', op: "CALL", error: "NameError", message: "Undefined function: missing" },
  ])("preserves ordered output and trace on $error: $expression", fixture => {
    const partialSource = 'def mark(label, value):\n    print(label, value)\n    return value\nprint("before")\n' +
      `result = ${fixture.expression}\nprint("never")`;
    // Closed trusted fixtures only; user programs never reach a subprocess.
    const partialDriver = `
import contextlib, io, json, traceback
output = io.StringIO()
with contextlib.redirect_stdout(output):
    try:
        exec(compile(${JSON.stringify(partialSource)}, "<partial-fixture>", "exec"), {})
    except Exception as failure:
        error = type(failure).__name__
        line = [f.lineno for f in traceback.extract_tb(failure.__traceback__)
                if f.filename == "<partial-fixture>"][-1]
print(json.dumps(dict(stdout=output.getvalue(), error=error, line=line)))
`;
    const partialOracle = JSON.parse(execFileSync("python", ["-I", "-c", partialDriver], {
      encoding: "utf8", timeout: 3000, maxBuffer: 100_000, stdio: "pipe",
    }));
    expect(partialOracle.error).toBe(fixture.error);
    let partialFailure: unknown;
    try { run(partialSource); } catch (error) { partialFailure = error; }
    expect(partialFailure).toBeInstanceOf(PythonVMError);
    const stopped = partialFailure as PythonVMError;
    expect(stopped.message).toBe(`Line ${partialOracle.line}: ${fixture.message}`);
    expect(stopped.line).toBe(5);
    expect(stopped.diagnostics.output).toEqual(["before", "left 2", "right 3"]);
    expect(stopped.diagnostics.output.join("\n") + "\n").toBe(partialOracle.stdout);
    expect(stopped.diagnostics.cycles).toBe(stopped.diagnostics.trace.length);
    expect(stopped.diagnostics.trace.at(-1)).toMatchObject({ op: fixture.op, line: 5 });
    expect(stopped.diagnostics.trace.some(i => i.op === "HALT" || i.args[0] === "never")).toBe(false);
    expect(stopped.diagnostics).not.toHaveProperty("variables");
  });

  it("keeps cycle-limit and output-limit diagnostics bounded", () => {
    const boundedFixtures = [
      { source: 'print("before")\ndef f():\n    return 1\n' + "f()\n".repeat(511), cycleLimit: true },
      { source: `x = "${"x".repeat(5000)}"\n` + "print(x)\n".repeat(14), cycleLimit: false },
    ];
    for (const bounded of boundedFixtures) {
      let boundedFailure: unknown;
      try { run(bounded.source); } catch (error) { boundedFailure = error; }
      expect(boundedFailure).toBeInstanceOf(PythonVMError);
      const stopped = boundedFailure as PythonVMError;
      expect(stopped.message).toMatch(bounded.cycleLimit ? /cycle safety/ : /Output exceeds/);
      const diagnostics = stopped.diagnostics;
      expect(diagnostics.output.length).toBeGreaterThan(0);
      expect(diagnostics.cycles).toBe(diagnostics.trace.length);
      expect(diagnostics.trace.length).toBeLessThanOrEqual(VM_MAX_CYCLES);
      expect(diagnostics.output.reduce((size, line) => size + line.length + 1, 0)).toBeLessThanOrEqual(VM_MAX_SOURCE_LENGTH);
      if (bounded.cycleLimit) expect(diagnostics.cycles).toBe(VM_MAX_CYCLES);
      else expect(diagnostics.output).toEqual(Array(13).fill("x".repeat(5000)));
    }
    expect(run('print("fresh")').output).toEqual(["fresh"]);
  });
});
