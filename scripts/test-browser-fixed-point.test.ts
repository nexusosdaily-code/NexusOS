import { describe, expect, it } from "vitest";
import { fixedPointFixtures, fixedPointReference } from "./wls-fixed-point-reference";
import { collectFixedPointEvidence } from "./wls-fixed-point-browser-evidence";
import { assertFixedPointEvidence, assertFixedPointMutationRejected, assertFixedPointVerdict, type FixedPointIO } from "./test-browser-fixed-point";
import { alteredFixedPointKernel, fixedPointMutations, fixedPointMutationPlugin } from "../tests/browser/fixed-point/mutations";
import { FIXED_POINT_KERNEL_SOURCE } from "../shared/wls-fixed-point-kernel";
import { executePythonWavelength } from "../shared/wavelength-python-vm";
import { compileFixedPointFixture } from "./wls-fixed-point-fixtures";
import path from "node:path";

const fixtures = fixedPointFixtures();
const reference = fixedPointReference(fixtures);
const evidence = collectFixedPointEvidence(fixtures);

describe("cross-browser fixed-point evidence contract", () => {
  it("accepts matching arithmetic only with quiet I/O", () => {
    expect(() => assertFixedPointVerdict(evidence, fixtures, reference, evidence,
      { violations: [], forbidden: [], arrivals: [], errors: [] })).not.toThrow();
  });
  it.each([
    ["violations", /No CSP-blocked I\/O attempts/],
    ["forbidden", /No API, socket or external attempts/],
    ["arrivals", /No requests forwarded, including to loopback/],
    ["errors", /No uncaught browser faults/],
  ] as const)("rejects matching arithmetic when %s are observed", (layer, message) => {
    const io: FixedPointIO = { violations: [], forbidden: [], arrivals: [], errors: [] };
    io[layer].push("synthetic detector contract evidence");
    expect(() => assertFixedPointVerdict(evidence, fixtures, reference, evidence, io)).toThrow(message);
  });
  it("checks the full corpus against independent Fraction results", () => {
    expect(() => assertFixedPointEvidence(evidence, fixtures, reference)).not.toThrow();
    expect(new Set(fixtures.map(f => f.operation))).toEqual(new Set([
      "add", "subtract", "multiply", "divide", "sum", "dot", "score",
    ]));
    for (const status of ["ok", "overflow", "division-by-zero"]) {
      expect(reference.some(result => result.status === status)).toBe(true);
    }
  });
  it("retains explicit negative ties, negative divisors, cancellation and maximum-length cases", () => {
    const find = (fixture: unknown) => {
      const index = fixtures.findIndex(f => JSON.stringify(f) === JSON.stringify(fixture));
      expect(index).toBeGreaterThanOrEqual(0);
      return reference[index];
    };
    expect(find({ operation: "multiply", left: "-0.001", right: "0.500" }))
      .toEqual({ status: "ok", units: -1, value: "-0.001" });
    expect(find({ operation: "divide", left: "0.001", right: "-2" }))
      .toEqual({ status: "ok", units: -1, value: "-0.001" });
    const cancelling = [...Array(8).fill("1000"), ...Array(8).fill("-1000")];
    expect(find({ operation: "dot", left: cancelling, right: Array(16).fill("1000") }))
      .toEqual({ status: "ok", units: 0, value: "0.000" });
    expect(find({ operation: "sum", left: cancelling }))
      .toEqual({ status: "ok", units: 0, value: "0.000" });
    expect(find({ operation: "dot", left: ["1000", "0.001"], right: ["1", "0.499"] }).status).toBe("ok");
    expect(find({ operation: "dot", left: ["1000", "0.001"], right: ["1", "0.500"] }).status).toBe("overflow");
  });
  it.each(["missing-case", "wrong-value", "wrong-error", "unvisited-call", "wrong-profile", "unbounded-vector"] as const)(
    "rejects misleading evidence: %s", mutation => {
      const changed = structuredClone(evidence);
      const success = changed.cases.find(c => c.status === "ok")!;
      switch (mutation) {
        case "missing-case": changed.cases.pop(); break;
        case "wrong-value":
          if (success.status === "ok") success.value = "999.999";
          break;
        case "wrong-error": {
          const index = changed.cases.findIndex(c => c.status === "overflow");
          changed.cases[index] = { ...changed.cases[index], status: "division-by-zero" };
          break;
        }
        case "unvisited-call": success.trace = success.trace.filter(i => i.op !== "CALL"); break;
        case "wrong-profile": success.profileRejections[1] = false; break;
        case "unbounded-vector": changed.oversizedRejected = false; break;
      }
      expect(() => assertFixedPointEvidence(changed, fixtures, reference)).toThrow();
    },
  );
  it.each(fixedPointMutations)("requires a real numeric mismatch for $name", mutation => {
    // Unmodified evidence cannot be credited as a successful sensitivity control.
    expect(() => assertFixedPointMutationRejected(evidence, fixtures, reference, mutation)).toThrow(/numeric witness/);
    const index = fixtures.findIndex(f => JSON.stringify(f) === JSON.stringify(mutation.witness));
    const original = compileFixedPointFixture(fixtures[index]);
    const prefix = FIXED_POINT_KERNEL_SOURCE.trimEnd().split("\n").slice(0, -1).join("\n");
    const alteredPrefix = alteredFixedPointKernel(mutation).trimEnd().split("\n").slice(0, -1).join("\n");
    expect(original.startsWith(prefix)).toBe(true);
    // These are encoded programs that actually run, not corrupted evidence.
    const source = original.replace(prefix, alteredPrefix);
    const result = executePythonWavelength(source);
    const expected = reference[index];
    expect(expected.status).toBe("ok");
    if (expected.status !== "ok") throw Error("Missing successful witness");
    expect(typeof result.variables.result).toBe("number");
    expect(result.variables.result).not.toBe(expected.units);
    expect(result.trace.some(i => i.op === "CALL")).toBe(true);
    const changed = structuredClone(evidence);
    const actual = changed.cases[index];
    if (actual.status !== "ok") throw Error("Missing successful execution");
    const units = result.variables.result as number;
    Object.assign(actual, {
      source, units, raw: units, value: (units / 1000).toFixed(3),
      cycles: result.cycles, adapterCycles: result.cycles, trace: result.trace,
      kernelCalls: result.trace.filter(i => i.op === "CALL").map(i => String(i.args[0])),
    });
    expect(() => assertFixedPointMutationRejected(changed, fixtures, reference, mutation)).not.toThrow();
  });
  it.each(fixedPointMutations)("does not credit missing execution or a typed failure for $name", mutation => {
    const index = fixtures.findIndex(f => JSON.stringify(f) === JSON.stringify(mutation.witness));
    const missing = structuredClone(evidence);
    missing.cases.pop();
    expect(() => assertFixedPointMutationRejected(missing, fixtures, reference, mutation)).toThrow(/complete execution/);
    const failed = structuredClone(evidence);
    failed.cases[index] = { ...failed.cases[index], status: "overflow", raw: null };
    expect(() => assertFixedPointMutationRejected(failed, fixtures, reference, mutation)).toThrow(/valid execution/);
  });
  it("scopes disposable transforms to the exact kernel and fails closed when unused or stale", async () => {
    const { plugin, assertApplied } = fixedPointMutationPlugin(fixedPointMutations[0]);
    expect(() => assertApplied()).toThrow(/exactly once/);
    const transform = plugin.transform;
    if (typeof transform !== "function") throw Error("Missing transform");
    const invoke = (code: string, id: string) => transform.call({} as never, code, id);
    expect(await invoke("unrelated", path.resolve("shared/wls-fixed-point.ts"))).toBeUndefined();
    expect(() => invoke("stale module", path.resolve("shared/wls-fixed-point-kernel.ts"))).toThrow(/anchor changed/);
    const changed = await invoke(`export const FIXED_POINT_KERNEL_SOURCE = \`${FIXED_POINT_KERNEL_SOURCE}\`;`,
      path.resolve("shared/wls-fixed-point-kernel.ts"));
    expect(changed).toEqual({ code: `export const FIXED_POINT_KERNEL_SOURCE = ${JSON.stringify(alteredFixedPointKernel(fixedPointMutations[0]))};`, map: null });
    expect(() => assertApplied()).not.toThrow();
    // A duplicate transform also cannot silently pass.
    await invoke(FIXED_POINT_KERNEL_SOURCE, path.resolve("shared/wls-fixed-point-kernel.ts"));
    expect(() => assertApplied()).toThrow(/exactly once/);
  });
});
