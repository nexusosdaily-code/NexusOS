import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { LIBRARY_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { CollectionVMError } from "../shared/wls-library-compiler";
import { resolveCollectionPackage, executeCollectionPackageProgram } from "../shared/wls-package";
import { createCollectionPackageLock, executeLockedCollectionPackageProgram } from "../shared/wls-package-lock";

type Case = { name: string; program: string; inputs: Record<string, unknown>; expect: { value?: unknown; error?: boolean } };
const directory = new URL("../scripts/fixtures/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, directory), "utf8");
// Expected values are independently authored fixture data, never VM-generated.
const cases: Case[] = readdirSync(directory).filter(file => /^wls.*\.json$/.test(file))
  .flatMap(file => {
    const data = JSON.parse(read(file));
    return data.profile === "WLS-TEST/1" ? data.cases : [];
  });
cases.push(
  { name: "add absent exact member", program: "recipient.add", inputs: { items: ["b", "a"], value: "Ψ" }, expect: { value: ["b", "a", "Ψ"] } },
  { name: "add existing member", program: "recipient.add", inputs: { items: ["b", "a"], value: "a" }, expect: { value: ["b", "a"] } },
  { name: "remove exact matches", program: "recipient.remove", inputs: { items: ["a", "b", "a"], value: "a" }, expect: { value: ["b"] } },
  { name: "read exact indexed member", program: "recipient.at", inputs: { items: ["Ψ", "b"], index: 1 }, expect: { value: "b" } },
);
const manifests = readdirSync(directory).filter(file => /^wls-.*package(?:-v0-\d+)?\.json$/.test(file))
  .map(file => ({ file, text: read(file) }))
  .filter(item => JSON.parse(item.text).profile === "WLS-PACKAGE/1");
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe("actual package behavior across all thirty retained releases", () => {
  it("has independently expected successful outputs for every canonical operation", () => {
    expect([...new Set(cases.filter(c => Object.hasOwn(c.expect, "value")).map(c => c.program))].sort())
      .toEqual([...LIBRARY_PROGRAM_IDS].sort());
    expect([...new Set(manifests.map(m => resolveCollectionPackage(m.text).dependencies[0].version))].sort())
      .toEqual(Array.from({ length: 30 }, (_, i) => `0.${i + 1}.0`).sort());
  });
  for (const manifest of manifests) {
    describe(manifest.file, () => {
      const resolved = resolveCollectionPackage(manifest.text);
      let lock: string;
      beforeAll(async () => { lock = JSON.stringify(await createCollectionPackageLock(manifest.text)); });
      for (const program of resolved.programs) {
        it(`${program}: expected values/errors, executed instructions and preserved inputs`, async () => {
          const examples = cases.filter(c => c.program === program);
          expect(examples.some(c => Object.hasOwn(c.expect, "value")), program).toBe(true);
          let checked = 0;
          for (const example of examples) {
          const inputs = freeze(structuredClone(example.inputs));
          const before = JSON.stringify(inputs);
          if (example.expect.error) {
            expect(() => executeCollectionPackageProgram(manifest.text, program, inputs)).toThrow(CollectionVMError);
            await expect(executeLockedCollectionPackageProgram(manifest.text, lock, program, inputs)).rejects.toThrow(CollectionVMError);
          } else {
            for (const result of [
              executeCollectionPackageProgram(manifest.text, program, inputs),
              await executeLockedCollectionPackageProgram(manifest.text, lock, program, inputs),
            ]) {
              expect(result.value, `${program}: ${example.name}`).toEqual(example.expect.value);
              expect(result.trace.length).toBeGreaterThan(0);
              expect(result.trace.at(-1)?.op).toBe("RETURN");
              if (result.value && typeof result.value === "object") expect(result.value).not.toBe(inputs);
            }
          }
          expect(JSON.stringify(inputs)).toBe(before);
            checked++;
          }
          expect(checked).toBe(examples.length);
          expect(checked).toBeGreaterThanOrEqual(1);
        });
      }
    });
  }
});
