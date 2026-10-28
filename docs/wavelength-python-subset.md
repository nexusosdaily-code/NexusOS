# WavelengthScript Python computation subset — WLS-PY/1

This is a bounded, executable software subset in `/ce-se-pipeline`, not a
complete Python implementation, an optical hardware demonstration, or a change
to the existing contract/wallet VM. Other source-language tabs remain
pattern-based encoding previews and do not claim equivalent execution.

## The actual pipeline

1. Parse supported Python expressions and statements without JavaScript
   evaluation or calling a Python runtime.
2. Emit explicit coordinate-tagged WavelengthScript stack operations.
3. Strictly compile that versioned WavelengthScript text to instruction records.
4. Execute those records using the same pure TypeScript engine in the browser
   and Node test environment. The UI shows actual printed output and the
   instructions actually visited, not simply an animation of every instruction.

Coordinates use the existing versioned VM-name mapping. They are software
metadata, not proof of physical frequencies, collision-free naming,
cryptographic integrity or photonic interoperability.

For example:

```python
def add(a, b):
    return a + b

print(add(3, 4))
```

The result is `7`. Translation emits `FUNC`, `LOAD`, `ADD`, `RETURN`,
`CONST`, `CALL`, `DROP` and boundary operations with wavelength metadata.
The bytecode compiler rejects unknown operations, malformed arguments, changed
coordinate tags, unsupported versions, invalid function boundaries and invalid
branch targets.

Compound expressions short-circuit and retain Python operand values:

```python
print(False and (1 // 0), "ready" or missing())
print(0 or 7, "left" and 42, not 1 == 2)
```

The output is `False ready` followed by `7 42 True`. Neither the division nor
the undefined call runs. `and` returns its first false operand or its last
operand; `or` returns its first true operand or its last operand. `not` always
returns `True` or `False`. Operands are evaluated left-to-right, once each.
Precedence from weakest to strongest is `or`, `and`, `not`, comparisons,
addition/subtraction, multiplication/floor-division/remainder, unary signs.
Parentheses override precedence. All operands are parsed and bytecode-validated,
even when skipped at runtime; short-circuiting does not allow unsupported syntax.
Logical expressions emit `JFALSEKEEP`/`JTRUEKEEP` (keep the operand only when
jumping, otherwise discard it) and `NOT`. These jumps obey the same forward,
in-range, same-frame target rules and cycle/stack limits as statement branches.

Decisions execute only the selected body:

```python
def describe(n):
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    else:
        return "positive"

print(describe(-1), describe(0), describe(1))
```

The result is `negative zero positive`. Conditions compile to comparison
operations (`EQ`, `NE`, `LT`, `LE`, `GT`, `GE`) and `JFALSE`/`JUMP`.
Jump arguments are zero-based instruction indices, not wavelength coordinates
or byte offsets. The compiler checks every target, even in unreachable code:
it must be a forward, in-range integer in the same top-level/function frame,
never an `END` boundary. Runtime operand-stack checks still apply.

## Supported

- Decimal integers within ±9,007,199,254,740,991; operations must remain in range.
- Integer `+`, `-`, `*`, `//`, `%`, unary `+`/`-`, parentheses and precedence.
  Floor division and remainder follow Python's negative-number rules. BigInt
  intermediates avoid rounding errors; integer results outside the range fail.
- Single/double-quoted strings; concatenation with `+`; supported escapes
  `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\b`, `\f`.
- `True`, `False`, `None` as values, with Python-style printed spelling. Boolean
  arithmetic and mixed string/integer arithmetic are not supported.
- Simple assignments, variable lookup, expression statements, comments and
  `print()` with positional arguments.
- Single comparisons `==`, `!=`, `<`, `<=`, `>`, `>=`, with lower precedence
  than arithmetic. Explicit parentheses can combine comparison results.
  Equality compares integers/booleans numerically (`True == 1`), strings by
  value and `None` only with `None`; different remaining types are unequal.
  Ordering accepts two integers/booleans or two strings; strings use Unicode
  code-point order. Other ordering combinations fail at runtime.
- Short-circuit `and`/`or` and boolean `not` in assignments, call arguments,
  returns, expression statements and conditions, including nested expressions.
  Truthiness uses the same supported values as `if`; no eager boolean coercion
  replaces the operand selected by `and`/`or`.
- Space-indented `if` bodies with zero or more aligned `elif` clauses and an
  optional final aligned `else:` body, at top
  level or inside functions, including nested decisions. Each body is required
  and must use consistent indentation. `False`, `None`, zero and the empty
  string are false; other supported values are true. Conditions are evaluated
  once in source order until the first true condition; only its body runs.
  Later conditions and bodies are skipped, including any runtime errors in
  them. If no condition is true, the final `else` runs when present.
  All syntax is checked during translation, including skipped clauses.
  Sibling `elif` clauses do not increase nesting depth. Orphaned, misaligned,
  empty or post-`else` clauses are rejected with source-line diagnostics.
- Top-level function definitions with ASCII identifiers, space-indented
  bodies, fixed positional parameters, calls and `return` (including returns
  inside decisions). Definitions inside decisions are not supported.
  A function with no explicit return produces `None`.
- Function-local bindings and global reads. Reading a local before assignment
  fails even if a same-named global exists, including when the only assignment
  is in an untaken branch. Branches do not create scopes. Nested function definitions and
  first-class function values are not supported.

## Explicitly unsupported

Imports, packages, file access, DOM/network APIs, attributes, collections,
inline one-line bodies, loops, comprehensions, generators, classes, exceptions, decorators,
floats, `/`, exponentiation, chained comparisons (such as `a < b < c`),
`is`/`in`, keyword/default/variadic arguments,
multiline expressions/strings and general Unicode identifiers. Some restrictions
are syntax errors during translation; undefined calls and invalid operand types
are runtime errors. There is no permissive “EXEC” fallback.

The runtime has no wallet, transfer, contract, persistent storage, network or
browser API capabilities. Existing authenticated server-side financial routes
remain separate and unchanged.

## Bounds and errors

- Python input and generated WavelengthScript each have a 65,536-character cap
  (the existing safety helper describes this as 64 KB).
- At most 2,048 instructions and 2,048 executed cycles.
- At most 64 nested expression parses and indented blocks, 32 nested function calls and 256 stack
  values per frame; at most 256 positional call arguments.
- Each computed string and accumulated printed output is bounded.
- Errors include the original Python line where available. The UI clears stale
  successful output, prevents running an older translation after editing and
  does not report an erroring run as successful.
- Editing cancels the earlier walkthrough; Reset clears output and execution
  state. No partial runtime output is presented as a successful result.

## Verification

`server/wavelength-python.test.ts` compares fixed, trusted fixtures and signed
arithmetic vectors with isolated CPython, then tests unsupported syntax,
scope errors (including untaken local assignments), nested decisions, branches
inside functions, truthiness, comparison precedence/types/Unicode, untaken
erroring branches, numeric overflow, division by zero, recursion, bytecode tampering
and resource limits. Python subprocesses are **only** used on fixed test data;
user programs execute solely in the bounded interpreter.

`npm run test:browser-session`, after `npm run build`, checks actual built
desktop/mobile UI behaviour under the production CSP using a synthetic login
and in-memory sessions. It checks unsupported syntax, compile-then-execute,
printed results (including nested decisions inside functions), untaken erroring
branches, local-before-assignment failures, runtime-error recovery, reset and horizontal overflow, in
addition to existing session and CSP protections. It neither signs into the real
founder account nor touches real balances.

This does not prove arbitrary Python equivalence or all browser/device security.
The dependency scanner's unexplained Python inventory remains unresolved.

### Verification result — 2026-10-23

All 51 new language/VM tests passed, including comparisons with CPython. The
database-free build passed 1,512 tests; its two intentionally skipped opt-in
browser cases were then run explicitly and both passed on desktop/mobile.
No real credential or account balance was used. This is workspace/build
verification, not evidence that this feature is already published.

The first parallel build attempts failed unrelated real-time constitution
checks. Their suite passed independently; limiting build test concurrency to
two workers produced a passing full build with all assertions and timeouts
unchanged. No governance runtime code was modified.

### Decision-extension verification — 2026-10-23

The language/VM suite now has 93 passing cases, including trusted CPython
comparisons for nested decisions, function branches, evaluation order, Unicode
ordering, truthiness and local-before-assignment failures. Invalid forward,
backward, out-of-range, wrong-type and cross-function jump targets are rejected.
The database-free build passed 1,554 tests (two opt-in browser cases skipped),
and the explicit browser run then passed both desktop/mobile cases against the
built UI under the production CSP. TypeScript and bundle/preload checks passed.

The fresh dependency scan still reports 10 critical and 64 high Python alerts
from the unresolved inventory. SAST returned the existing medium session-cookie
finding; the dataflow scanner returned the existing low energy-budget stdout
finding. No new dependencies, financial/contract VM changes, real credentials,
live-fund tests or publishing were involved. These checks do not constitute
security clearance.

### Logical-expression verification — 2026-10-23

All 136 language/VM cases passed. Fixed isolated-CPython fixtures cover skipped
division-by-zero and undefined calls/loads, operand values across all supported
types, mixed precedence, single evaluation and ordered function effects,
function returns and compound conditions. Additional cases check unreachable
logical-jump tampering, cross-frame targets, stack underflow, malformed `NOT`,
and nesting, token, instruction, cycle, recursion and stack bounds.

The database-free build passed 1,597 tests (the two opt-in browser cases were
skipped there). Both explicit desktop/mobile browser cases then passed against
the updated built UI under the production CSP, including compound function
conditions, ordered calls, skipped errors, rejection of unsupported syntax in
skipped operands and recovery from an evaluated operand error. The bytecode
display includes the three new operations. TypeScript, bundle and preload checks
passed. No dependencies, credentials, live services, balances or publishing were
involved. No fresh security scan was run for this language extension; the earlier
unresolved scanner findings above remain unresolved.

### Elif-extension verification — 2026-10-23

The initial language/VM suite had 123 passing cases. Trusted fixtures match
isolated CPython for multi-way returns, assignments, nested chains, truthiness,
no-match fallthrough and first-match evaluation order. Skipped conditions do not
execute or appear in the trace. Tests reject malformed clauses, local reads
before assignment (including locals assigned only in an untaken `elif`),
tampered forward edges across function boundaries and over-limit programs.
Long sibling chains remain iterative rather than consuming block-nesting depth.

The initial database-free build passed 1,584 tests, with two opt-in browser
cases skipped by design. Both were then run explicitly and passed against the
built desktop/mobile UI under the production CSP. They compare trusted `elif`
fixtures with CPython stdout through actual compile/execute controls, check
stale-output clearing, malformed-clause errors and recovery, and retain the
non-Python preview label. TypeScript, bundle and preload checks passed.

The existing pure VM and bytecode validation needed no changes for `elif`:
it lowers to frame-checked `JFALSE`/`JUMP` operations, and assignments participate
in whole-function local analysis. Integration with Boolean expressions retains
their absolute instruction offsets in every clause, including function frames.
A combined CPython fixture covers `and`/`or`/`not` within `if`/`elif` conditions,
including a skipped undefined call. The combined language suite passes 167 cases.
The combined database-free build passed 1,674 tests (two opt-in browser cases
skipped), then both desktop/mobile browser cases passed explicitly under the
production CSP, retaining Boolean-expression and Unicode round-trip checks.

No financial VM changes, new dependencies, real credentials, live-fund tests
or publishing were involved. This is workspace verification, not a new security
scan or security clearance; the previously documented scanner discrepancy
remains unresolved.
