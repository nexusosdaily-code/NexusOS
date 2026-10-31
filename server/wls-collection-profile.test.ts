import { describe, expect, it } from "vitest";
import { compileWLS } from "./wnsp_vm";
import { compileCollection, executeCollection } from "../shared/wls-collection-vm";
import { RECIPIENT_COLLECTION_SOURCE } from "../shared/wls-recipient-collections";
import { translatePython, compilePythonWavelength } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { assertNotCollectionSource } from "../shared/vm-security";

describe("explicit collection profile boundary", () => {
  it.each(Object.values(RECIPIENT_COLLECTION_SOURCE))("never turns collection source into contract EXEC", source => {
    expect(() => compileWLS(source)).toThrow(/explicit WLS-COLLECTION\/1 profile/);
    expect(() => compilePythonWavelength(source)).toThrow();
    expect(() => translatePython(source)).toThrow();
  });
  it.each([
    'WLS-COLLECTION/99\nRETURN ["items"]',
    '// a misplaced header must not enable EXEC\nWLS-COLLECTION/1\nRETURN ["items"]',
    'LIST_NEW ["items"]\nRETURN ["items"]',
    'WLS-COLLECTION/1',
  ])("rejects missing, unknown or misplaced collection profile at the generic entry point", source => {
    expect(() => compileWLS(source)).toThrow(/explicit WLS-COLLECTION\/1 profile/);
  });
  it("does not route Python/contract source into the collection VM, even under a collection header", () => {
    const python = translatePython("print(6 * 7)");
    for (const source of [python, "print(1)", '@store key := 1', `WLS-COLLECTION/1\n${python}`]) {
      expect(() => compileCollection(source)).toThrow();
      expect(() => executeCollection(source, {})).toThrow();
    }
    expect(executePythonWavelength(python).output).toEqual(["42"]);
    expect(() => compileWLS('@store key := 1')).not.toThrow();
    expect(() => assertNotCollectionSource('// WLS-COLLECTION/1\nprint("WLS-COLLECTION/1")')).not.toThrow();
    expect(executePythonWavelength(translatePython('print("WLS-COLLECTION/1")')).output).toEqual(["WLS-COLLECTION/1"]);
  });
});
