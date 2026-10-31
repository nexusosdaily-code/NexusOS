import { COLLECTION_LIMITS, CollectionVMError } from "./wls-collection-vm";
import { checkedMapValue, type MapValue } from "./wls-map-vm";
import { compileLibraryProgram, executeLibraryProgram } from "./wls-execution";
import { requireLibraryProgramId, type LibraryProgramId } from "./wls-library-catalogue";
import { getCollectionProgramSource } from "./wls-library";
import { getLockedCollectionPackageSources } from "./wls-package-lock";

export const COLLECTION_TEST_PROFILE = "WLS-TEST/1";
export const COLLECTION_TEST_LIMITS = Object.freeze({
  cases: 64, text: 131_072, inputText: 16_384, name: 80,
});
type Value = string | number | boolean | string[] | MapValue;
type Expectation = { value: Value } | { error: true };
type TestCase = {
  name: string; program: LibraryProgramId;
  inputs: Record<string, unknown>; expect: Expectation;
};
type PlannedCase = TestCase & { source: string };
export type CollectionTestResult = {
  name: string; program: LibraryProgramId; passed: boolean;
  reason: "matched-value" | "matched-error" | "value-mismatch" | "missing-error" | "unexpected-error";
};

const fail = (message: string): never => { throw new CollectionVMError(message); };
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function keys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length &&
    expected.every(key => Object.prototype.hasOwnProperty.call(value, key));
}
function expectedValue(value: unknown): value is Value {
  if (record(value)) {
    try { checkedMapValue(value); return true; } catch (error) {
      if (error instanceof CollectionVMError) return false;
      throw error;
    }
  }
  const text = (item: unknown): item is string =>
    typeof item === "string" && item.length <= COLLECTION_LIMITS.stringLength;
  return text(value) || typeof value === "boolean" ||
    (typeof value === "number" && Number.isSafeInteger(value)) ||
    (Array.isArray(value) && value.length <= COLLECTION_LIMITS.items && value.every(text));
}

/** Validate the entire JSON suite before resolving sources or executing any case. */
function plan(text: string): TestCase[] {
  if (typeof text !== "string" || text.length > COLLECTION_TEST_LIMITS.text) fail("Suite exceeds its text limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { fail("Suite must contain valid JSON."); }
  if (!record(parsed) || !keys(parsed, ["profile", "cases"]) ||
    parsed.profile !== COLLECTION_TEST_PROFILE || !Array.isArray(parsed.cases)) {
    return fail("Unsupported or malformed collection test suite.");
  }
  if (!parsed.cases.length || parsed.cases.length > COLLECTION_TEST_LIMITS.cases) {
    fail("Suite must contain between 1 and 64 cases.");
  }
  const names = new Set<string>();
  return parsed.cases.map((test: unknown): TestCase => {
    if (!record(test) || !keys(test, ["name", "program", "inputs", "expect"])) return fail("Malformed test case.");
    const name = test.name;
    if (typeof name !== "string" || !name.trim() || name.length > COLLECTION_TEST_LIMITS.name ||
      /[\u0000-\u001f\u007f]/.test(name) || names.has(name)) return fail("Invalid or duplicate test name.");
    names.add(name);
    if (!record(test.inputs) || JSON.stringify(test.inputs).length > COLLECTION_TEST_LIMITS.inputText) {
      return fail("Test inputs must be a bounded JSON object.");
    }
    const expectation = test.expect;
    if (!record(expectation)) return fail("Malformed test expectation.");
    let expect: Expectation;
    if (keys(expectation, ["value"]) && expectedValue(expectation.value)) expect = { value: expectation.value };
    else if (keys(expectation, ["error"]) && expectation.error === true) expect = { error: true };
    else return fail("Declare exactly one valid expected value or error.");
    const program = requireLibraryProgramId(test.program);
    return { name, program, inputs: test.inputs, expect };
  });
}

function equal(left: Value, right: Value): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => item === right[index]);
  }
  if (record(left) && record(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return left === right;
}

/**
 * Host-backed test tooling for existing WavelengthScript programs, not a new
 * language grammar. JSON only; no source imports, callbacks, regex assertions,
 * filesystem, network, application startup or VM capability changes.
 */
export function runCollectionTestSuite(text: string) {
  const cases = plan(text).map(test => {
    const source = getCollectionProgramSource(test.program);
    // A broken package must not count as an expected runtime failure.
    compileLibraryProgram(source);
    return { ...test, source };
  });
  return executeCases(cases);
}

/**
 * Verify all declared sources once and bind every case before running any.
 * No caller-supplied source loader, resolved plan or bytecode is accepted.
 */
export async function runLockedCollectionTestSuite(text: string, manifestText: string, lockText: string) {
  const suite = plan(text);
  const sources = await getLockedCollectionPackageSources(manifestText, lockText);
  const cases = suite.map(test => {
    const selected = sources.find(entry => entry.id === test.program);
    if (!selected) return fail("Test program is not declared by this locked package.");
    return { ...test, source: selected.source };
  });
  return { ...executeCases(cases), integrity: "verified" as const };
}

function executeCases(cases: readonly PlannedCase[]) {
  const results = cases.map((test): CollectionTestResult => {
    try {
      const result = executeLibraryProgram(test.source, test.inputs);
      if ("error" in test.expect) return { name: test.name, program: test.program, passed: false, reason: "missing-error" };
      const passed = equal(result.value, test.expect.value);
      return { name: test.name, program: test.program, passed, reason: passed ? "matched-value" : "value-mismatch" };
    } catch (error) {
      // Unexpected host faults abort; they cannot satisfy an error assertion.
      if (!(error instanceof CollectionVMError)) throw error;
      const passed = "error" in test.expect;
      return { name: test.name, program: test.program, passed, reason: passed ? "matched-error" : "unexpected-error" };
    }
  });
  const passed = results.filter(result => result.passed).length;
  // Do not echo input values, source, actual values or raw exception text.
  return { profile: COLLECTION_TEST_PROFILE, total: results.length, passed, failed: results.length - passed, results };
}
