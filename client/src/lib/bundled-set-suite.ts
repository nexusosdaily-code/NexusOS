import { CollectionVMError } from "@shared/wls-collection-vm";
import { compileMap, executeMap } from "@shared/wls-map-vm";
import { getCollectionProgramSource } from "@shared/wls-library";
import { resolveCollectionPackage } from "@shared/wls-package";
import setPackage from "../../../scripts/fixtures/wls-set-package-v0-5.json";
import setSuite from "../../../scripts/fixtures/wls-set-v0-5-smoke.json";

type Outcome = { value: unknown; error?: never } | { error: string; value?: never };
export type BundledSetCaseResult = {
  name: string;
  program: string;
  expected: { value?: unknown; error?: boolean };
  actual: Outcome;
  passed: boolean;
};

/** Fixed, bundled fixtures only. No editor state, downloads, or source-lock claim. */
export function runBundledSetSuite(): BundledSetCaseResult[] {
  const manifest = resolveCollectionPackage(JSON.stringify(setPackage));
  // Resolve and compile every source before running: a broken package is not
  // an expected invalid-input failure.
  const cases = setSuite.cases.map(test => {
    if (!manifest.programs.some(id => id === test.program)) {
      throw new Error(`Suite program is not declared by the bundled package: ${test.program}`);
    }
    const source = getCollectionProgramSource(test.program);
    compileMap(source);
    return { ...test, source };
  });
  return cases.map(test => {
    let actual: Outcome;
    try {
      actual = { value: executeMap(test.source, test.inputs).value };
    } catch (cause) {
      // Host faults must abort, not count as a passing expected VM rejection.
      if (!(cause instanceof CollectionVMError)) throw cause;
      actual = { error: cause.message };
    }
    const expectedError = "error" in test.expect && test.expect.error === true;
    const passed = expectedError
      ? "error" in actual
      : !("error" in actual) && JSON.stringify(actual.value) === JSON.stringify(test.expect.value);
    return { name: test.name, program: test.program, expected: test.expect, actual, passed };
  });
}
