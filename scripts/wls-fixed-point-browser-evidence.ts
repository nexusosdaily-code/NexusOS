// Shared test dispatch/evidence only: the numerical oracle stays in Node/Python.
import { compileFixedPointFixture, executeFixedPointFixture } from "./wls-fixed-point-fixtures";
import type { FixedPointFixture } from "./wls-fixed-point-reference";
import { FixedPointInputError, FixedPointRangeError, sumFixedPointVector } from "../shared/wls-fixed-point";
import { executePythonWavelength, PythonVMError } from "../shared/wavelength-python-vm";
import { assertLegacyExecutionSource, UnsupportedExecutionError } from "../shared/vm-security";

export function collectFixedPointEvidence(fixtures: readonly FixedPointFixture[]) {
  const cases = fixtures.map(fixture => {
    const source = compileFixedPointFixture(fixture);
    const profileRejections = [source, source.split("\n").slice(1).join("\n")].map(variant => {
      try { assertLegacyExecutionSource(variant, true); }
      catch (error) {
        if (error instanceof UnsupportedExecutionError && error.message.includes("WLS-PY/1")) return true;
        throw error;
      }
      throw Error("Fixed-point source accepted by the wrong execution profile");
    });
    let raw;
    try {
      raw = executePythonWavelength(source);
    } catch (error) {
      if (!(error instanceof PythonVMError) || !error.message.includes("Division by zero")) throw error;
      try { executeFixedPointFixture(fixture); }
      catch (adapterError) {
        if (!(adapterError instanceof PythonVMError) || !adapterError.message.includes("Division by zero")) throw adapterError;
        return {
          status: "division-by-zero" as const, source, profileRejections,
          cycles: error.diagnostics.cycles, trace: error.diagnostics.trace,
        };
      }
      throw Error("Adapter accepted a VM division-by-zero failure");
    }
    const diagnostics = { source, profileRejections, cycles: raw.cycles, trace: raw.trace };
    try {
      const result = executeFixedPointFixture(fixture);
      if (result.source !== source) throw Error("Adapter executed a different compiled source");
      return {
        ...diagnostics, status: "ok" as const, units: result.units, value: result.value,
        raw: raw.variables.result, scale: result.scale, length: result.length,
        kernelCalls: result.kernelCalls, adapterCycles: result.cycles,
      };
    } catch (error) {
      if (!(error instanceof FixedPointRangeError)) throw error;
      return { ...diagnostics, status: "overflow" as const, raw: raw.variables.result };
    }
  });
  // A maximum-length success must not mean that unbounded vectors are accepted.
  let oversizedRejected = false;
  try { sumFixedPointVector(Array(17).fill("0")); }
  catch (error) {
    if (!(error instanceof FixedPointInputError)) throw error;
    oversizedRejected = true;
  }
  if (!oversizedRejected) throw Error("Oversized vector accepted");
  return { cases, oversizedRejected };
}
