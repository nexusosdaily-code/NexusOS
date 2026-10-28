import { describe, it, expect } from "vitest";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { encodeVMName } from "../shared/wnsp-model";
import * as limits from "../shared/vm-security";

/** Run the real pure browser functions without importing React or live services. */
function browserFunctions(page: string) {
  const file = readFileSync(new URL(`../client/src/pages/${page}.tsx`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(`${page}.tsx`, file, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = ast.statements
    .filter(ts.isFunctionDeclaration)
    .filter(fn => ["compileWLS", "stepVM", "freshVM", "freshState", "nmToBand", "nmToColor", "processWLSLine", "transpile"].includes(fn.name?.text ?? ""))
    .map(fn => fn.getText(ast)).join("\n");
  const exported = page === "learn" ? "{compileWLS, transpile}" :
    `{compileWLS, stepVM, fresh: ${page === "wnsp-vm" ? "freshState" : "freshVM"}}`;
  const js = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const dependencies = { ...limits, encodeVMName, ceEncode: encodeVMName };
  return new Function(...Object.keys(dependencies), `${js};return ${exported}`)(...Object.values(dependencies));
}

describe.each(["wnsp-vm", "spectral-ide", "contract-app", "learn"])("%s browser bounds", page => {
  it("still compiles a normal WavelengthScript program", () => {
    expect(browserFunctions(page).compileWLS("tune(520nm)\nemit hello").some((i: any) => i.mnem === "EMIT")).toBe(true);
  });
  it("rejects overlong source before compiling", () => {
    expect(() => browserFunctions(page).compileWLS("x".repeat(limits.VM_MAX_SOURCE_LENGTH + 1))).toThrow(/source limit/);
  });
  it("rejects too many instructions within an otherwise small source", () => {
    expect(() => browserFunctions(page).compileWLS("x\n".repeat(limits.BROWSER_VM_MAX_INSTRUCTIONS))).toThrow(/instruction.*safety/);
  });
});

describe.each(["wnsp-vm", "spectral-ide", "contract-app"])("%s browser execution", page => {
  it("halts at the cycle budget, even if instructions are supplied directly", () => {
    const vm = browserFunctions(page);
    const state = vm.fresh();
    state.cycleCount = limits.VM_MAX_CYCLES;
    const next = vm.stepVM(state, [{ op: 3, mnem: "EMIT", args: "should not execute" }], 0);
    expect(next.halted).toBe(true);
    expect(next.output).toEqual([]);
  });
});

it("still translates Python to executable WavelengthScript in our pipeline", () => {
  const pipeline = browserFunctions("learn");
  const wls = pipeline.transpile('def hello():\n    return 42', "python");
  expect(pipeline.compileWLS(wls).some((i: any) => i.mnem === "EMIT")).toBe(true);
});
