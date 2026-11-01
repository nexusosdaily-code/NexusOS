import { MAP_LIMITS } from "../../../shared/wls-map-vm";
import { executeCollectionPackageProgram, getCollectionPackageProgramSource, resolveCollectionPackage } from "../../../shared/wls-package";
import { executeLockedCollectionPackageProgram, verifyCollectionPackageLock } from "../../../shared/wls-package-lock";

function freeze(value: unknown): void {
  if (!value || typeof value !== "object") return;
  Object.values(value).forEach(freeze);
  Object.freeze(value);
}
function frozen(value: unknown): boolean {
  return !value || typeof value !== "object" ||
    (Object.isFrozen(value) && Object.values(value).every(frozen));
}

// Fixture-only adapter. Both paths invoke the public consumer entry points;
// no copied operation, mocked crypto, relaxed VM or page fallback.
export async function completeConsumer({ manifest, lockText, program, cases }: {
  manifest: string; lockText: string; program: string;
  cases: { inputs: Record<string, unknown> }[];
}) {
  let evalBlocked = false;
  try { new Function("return 1")(); } catch (error) { evalBlocked = error instanceof EvalError; }
  const resolved = resolveCollectionPackage(manifest);
  const verified = await verifyCollectionPackageLock(manifest, lockText);
  const results = [];
  for (const test of cases) {
    const inputs = test.inputs;
    freeze(inputs);
    const before = JSON.stringify(inputs);
    const traces: unknown[] = [];
    const outcomes = [];
    for (const locked of [false, true]) {
      try {
        const result = locked
          ? await executeLockedCollectionPackageProgram(manifest, lockText, program, inputs)
          : executeCollectionPackageProgram(manifest, program, inputs);
        traces.push(result.trace);
        outcomes.push({
          value: result.value, cycles: result.trace.length, lastOp: result.trace.at(-1)?.op,
          resultFrozen: frozen(result.value),
          freshResult: !Object.values(inputs).some(input => input && typeof input === "object" &&
            (input === result.value || ("entries" in input && typeof result.value === "object" &&
              input.entries === result.value.entries))),
        });
      } catch (error) {
        traces.push(null);
        outcomes.push({ error: error instanceof Error ? error.message : String(error) });
      }
    }
    results.push({
      outcomes, before, after: JSON.stringify(inputs), inputsFrozen: frozen(inputs),
      tracesEqual: JSON.stringify(traces[0]) === JSON.stringify(traces[1]),
    });
  }
  return {
    source: getCollectionPackageProgramSource(manifest, program), programs: resolved.programs,
    verified, results, evalBlocked, limits: MAP_LIMITS, networkAttempts: [], importAttempts: [],
  };
}
