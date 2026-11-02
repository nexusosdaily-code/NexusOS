// Node/build-time controls only. Never imported by the fixture page or production.
import assert from "node:assert/strict";
import path from "node:path";
import type { Plugin } from "vite";
import { FIXED_POINT_KERNEL_SOURCE } from "../../../shared/wls-fixed-point-kernel";
import { compilePythonWavelength, translatePython } from "../../../shared/wavelength-python";
import type { FixedPointFixture } from "../../../scripts/wls-fixed-point-reference";

// Recompile the early-range control so all encoded jump targets stay valid.
const kernelPython = `def fixedCheck(value):
    if value < -1000000:
        return None
    if value > 1000000:
        return None
    return value + 0

def fixedRound(numerator, denominator):
    if denominator < 0:
        numerator = -numerator
        denominator = -denominator
    if numerator < 0:
        return -((-numerator * 2 + denominator) // (denominator * 2))
    return (numerator * 2 + denominator) // (denominator * 2)

def fixedSumStep(total, value):
    return total + value

def fixedDotStep(total, left, right):
    return total + left * right
`;

export const fixedPointMutations = [
  {
    name: "dot-product-add",
    from: '@581.42nm MUL {"line":20,"args":[]}',
    to: '@528.94nm ADD {"line":20,"args":[]}',
    witness: { operation: "dot", left: ["1.25"], right: ["2.5"] },
  },
  {
    name: "positive-tie-rounding",
    from: '@528.94nm ADD {"line":14,"args":[]}',
    to: 'SUB_TAG SUB {"line":14,"args":[]}',
    witness: { operation: "multiply", left: "0.001", right: "0.500" },
  },
  {
    name: "negative-tie-rounding",
    from: '@528.94nm ADD {"line":13,"args":[]}',
    to: 'SUB_TAG SUB {"line":13,"args":[]}',
    witness: { operation: "multiply", left: "-0.001", right: "0.500" },
  },
  {
    name: "early-intermediate-range",
    witness: {
      operation: "dot",
      left: [...Array(8).fill("1000"), ...Array(8).fill("-1000")],
      right: Array(16).fill("1000"),
    },
  },
] as const satisfies readonly {
  name: string; from?: string; to?: string; witness: FixedPointFixture;
}[];
export type FixedPointMutation = typeof fixedPointMutations[number];

export function alteredFixedPointKernel(mutation: FixedPointMutation): string {
  let altered: string;
  if ("from" in mutation) {
    assert.equal(FIXED_POINT_KERNEL_SOURCE.split(mutation.from).length, 2, `${mutation.name}: unique opcode anchor`);
    // Derive SUB's wavelength from the real encoder, not a guessed opcode tag.
    const subtractionTag = translatePython("result = 1 - 0\n").match(/(@[\d.]+nm) SUB /)![1];
    altered = FIXED_POINT_KERNEL_SOURCE.replace(mutation.from, mutation.to.replace("SUB_TAG", subtractionTag));
  } else {
    assert.equal(translatePython(kernelPython) + "\n", FIXED_POINT_KERNEL_SOURCE, "Early-range fixture must match the canonical kernel before alteration");
    altered = translatePython(kernelPython.replace("    return total + left * right", `    value = total + left * right
    if value > 1000000:
        return 1000000
    if value < -1000000:
        return -1000000
    return value`));
  }
  assert.notEqual(altered, FIXED_POINT_KERNEL_SOURCE);
  compilePythonWavelength(altered); // Reject invalid wavelength/opcode pairs.
  return altered;
}

export function fixedPointMutationPlugin(mutation: FixedPointMutation): { plugin: Plugin; assertApplied: () => void } {
  const target = path.resolve("shared/wls-fixed-point-kernel.ts");
  let applications = 0;
  return {
    plugin: {
      name: `fixture-only-fixed-point-${mutation.name}`, enforce: "pre",
      transform(code, id) {
        if (id !== target) return;
        assert.ok(code.includes(FIXED_POINT_KERNEL_SOURCE), "Canonical kernel module anchor changed");
        applications++;
        return { code: `export const FIXED_POINT_KERNEL_SOURCE = ${JSON.stringify(alteredFixedPointKernel(mutation))};`, map: null };
      },
    },
    assertApplied: () => assert.equal(applications, 1, `${mutation.name}: browser-only kernel transformed exactly once`),
  };
}
