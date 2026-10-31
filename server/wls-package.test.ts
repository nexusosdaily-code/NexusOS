import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COLLECTION_LIBRARY_RELEASE, COLLECTION_PACKAGE_TEXT_LIMIT,
  executeCollectionPackageProgram, getCollectionPackageProgramSource, resolveCollectionPackage,
} from "../shared/wls-package";
import { getCollectionProgramSource } from "../shared/wls-library";
import * as library from "../shared/wls-library";
import * as vm from "../shared/wls-collection-vm";

const manifest = () => ({
  profile: "WLS-PACKAGE/1", name: "example.consumer", version: "1.2.3",
  executionProfile: "WLS-COLLECTION/1",
  dependencies: { "wls.collections": "0.1.0" },
  programs: ["string.contains", "recipient.count"],
});
const json = (overlay = {}) => JSON.stringify({ ...manifest(), ...overlay });
afterEach(() => vi.restoreAllMocks());

describe("offline exact-version WavelengthScript dependencies", () => {
  it("resolves declared local requirements and freezes every metadata container", () => {
    const resolved = resolveCollectionPackage(json());
    expect(resolved).toMatchObject({
      name: "example.consumer", version: "1.2.3",
      dependencies: [COLLECTION_LIBRARY_RELEASE], programs: ["string.contains", "recipient.count"],
    });
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.programs)).toBe(true);
    expect(Object.isFrozen(resolved.dependencies)).toBe(true);
    expect(Object.isFrozen(resolved.dependencies[0])).toBe(true);
  });

  it("loads exactly packaged source and executes a permitted program", () => {
    expect(getCollectionPackageProgramSource(json(), "string.contains")).toBe(getCollectionProgramSource("string.contains"));
    const items = Object.freeze(["alpha", "beta"]);
    expect(executeCollectionPackageProgram(json(), "string.contains", { items, value: "beta" }).value).toBe(true);
    expect(items).toEqual(["alpha", "beta"]);
    expect(executeCollectionPackageProgram(json(), "recipient.count", { items }).value).toBe(2);
  });

  it("refuses a known but undeclared program before executing it", () => {
    const execution = vi.spyOn(vm, "executeCollection");
    expect(() => executeCollectionPackageProgram(json(), "recipient.at", { items: ["x"], index: 0 })).toThrow("not declared");
    expect(execution).not.toHaveBeenCalled();
  });

  it.each(["^0.1.0", "~0.1.0", "*", "latest", "99.0.0", "0.1", "file:./lib", "https://example.test/lib", 1])(
    "rejects unsupported or nonexact dependency version %j", value => {
      expect(() => resolveCollectionPackage(json({ dependencies: { "wls.collections": value } }))).toThrow("version");
    },
  );

  it.each([
    {}, [], null, { other: "0.1.0" }, { "wls.collections": "0.1.0", other: "0.1.0" },
  ].map(dependencies => ({ dependencies })))("rejects dependency declaration $dependencies", ({ dependencies }) => {
    expect(() => resolveCollectionPackage(json({ dependencies }))).toThrow("supported local");
  });

  it.each(["unknown", "../string/contains.wls", "file:///tmp/a", "https://example.test/a", "__proto__", "constructor"])(
    "rejects program identifiers %s, not treating them as paths or imports", program => {
      expect(() => resolveCollectionPackage(json({ programs: [program] }))).toThrow("Unknown");
      expect(() => getCollectionPackageProgramSource(json(), program)).toThrow("Unknown");
    },
  );

  it.each([
    { profile: "WLS-PACKAGE/2" }, { name: "../consumer" }, { name: "UpperCase" },
    { name: "x".repeat(65) }, { name: "wls.collections" }, { version: "^1.0.0" },
    { version: "01.0.0" }, { version: "1.0.0-beta" }, { version: "1000000.0.0" },
    { executionProfile: "WLS-PY/1" }, { programs: [] }, { programs: null },
    { programs: ["recipient.count", "recipient.count"] },
    { programs: Array(8).fill("recipient.count") }, { source: "arbitrary code" },
  ])("rejects invalid manifest overlay %j", overlay => {
    expect(() => resolveCollectionPackage(json(overlay))).toThrow();
  });

  it("rejects malformed, incomplete, oversized and nonobject JSON", () => {
    for (const text of ["{", "null", "[]", "{}", '"text"', " ".repeat(COLLECTION_PACKAGE_TEXT_LIMIT + 1)]) {
      expect(() => resolveCollectionPackage(text)).toThrow();
    }
  });

  it("compiles every declared source before any execution", () => {
    const original = library.getCollectionProgramSource;
    vi.spyOn(library, "getCollectionProgramSource").mockImplementation(id =>
      id === "recipient.count" ? "broken" : original(id),
    );
    const execution = vi.spyOn(vm, "executeCollection");
    expect(() => executeCollectionPackageProgram(json(), "string.contains", { items: [], value: "" })).toThrow();
    expect(execution).not.toHaveBeenCalled();
  });

  it("preserves VM data and execution limits rather than granting package capabilities", () => {
    expect(() => executeCollectionPackageProgram(json(), "recipient.count", { items: Array(21).fill("x") })).toThrow(vm.CollectionVMError);
    vi.spyOn(library, "getCollectionProgramSource").mockReturnValue(
      'WLS-COLLECTION/1\n:loop\nJUMP ["loop"]\nRETURN ["unused"]',
    );
    expect(() => executeCollectionPackageProgram(json(), "recipient.count", {})).toThrow("cycle limit");
  });
});
