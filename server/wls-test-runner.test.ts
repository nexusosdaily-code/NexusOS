import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { COLLECTION_TEST_LIMITS, runCollectionTestSuite } from "../shared/wls-test-runner";
import * as vm from "../shared/wls-collection-vm";
import * as library from "../shared/wls-library";

const example = () => ({
  name: "count", program: "recipient.count", inputs: { items: ["alpha", "beta"] },
  expect: { value: 2 },
});
const suite = (cases: unknown[]) => JSON.stringify({ profile: "WLS-TEST/1", cases });
afterEach(() => vi.restoreAllMocks());

describe("WavelengthScript program test tooling", () => {
  it("runs the shipped suite against actual packaged programs", () => {
    const report = runCollectionTestSuite(readFileSync("scripts/fixtures/wls-library-smoke.json", "utf8"));
    expect(report).toMatchObject({ profile: "WLS-TEST/1", total: 4, passed: 4, failed: 0 });
    expect(report.results.every(result => result.passed)).toBe(true);
  });

  it("distinguishes exact values, expected errors and all assertion failures", () => {
    const base = example();
    const report = runCollectionTestSuite(suite([
      base,
      { ...base, name: "wrong type", expect: { value: "2" } },
      { ...base, name: "missing error", expect: { error: true } },
      { ...base, name: "unexpected error", inputs: { items: [1] } },
      { ...base, name: "matched error", inputs: { items: [1] }, expect: { error: true } },
    ]));
    expect(report).toMatchObject({ total: 5, passed: 2, failed: 3 });
    expect(report.results.map(result => result.reason)).toEqual([
      "matched-value", "value-mismatch", "missing-error", "unexpected-error", "matched-error",
    ]);
  });

  it("compares list order, duplicates and Unicode exactly", () => {
    const base = { ...example(), program: "string.concat", inputs: { left: ["é", "é"], right: ["e\u0301", "🌊"] } };
    const report = runCollectionTestSuite(suite([
      { ...base, name: "exact", expect: { value: ["é", "é", "e\u0301", "🌊"] } },
      { ...base, name: "different order", expect: { value: ["🌊", "é", "é", "e\u0301"] } },
      { ...base, name: "missing duplicate", expect: { value: ["é", "e\u0301", "🌊"] } },
    ]));
    expect(report).toMatchObject({ passed: 1, failed: 2 });
  });

  it.each(["unknown", "__proto__", "../recipient/count.wls", "file:///tmp/test", "https://example.test/a"])(
    "rejects program reference %s before executing even earlier valid cases", program => {
      const execution = vi.spyOn(vm, "executeCollection");
      expect(() => runCollectionTestSuite(suite([example(), { ...example(), name: "bad", program }]))).toThrow();
      expect(execution).not.toHaveBeenCalled();
    },
  );

  it.each([
    null, [], {}, { profile: "WLS-TEST/2", cases: [example()] },
    { profile: "WLS-TEST/1", cases: [example()], command: "ignored?" },
    { profile: "WLS-TEST/1", cases: [] },
  ].map(value => ({ value })))("rejects malformed suite $value", ({ value }) => {
    expect(() => runCollectionTestSuite(JSON.stringify(value))).toThrow();
  });

  it.each([
    { name: "" }, { name: " " }, { name: "x\nlog injection" }, { name: "x".repeat(81) },
    { inputs: null }, { inputs: [] }, { expect: { value: null } },
    { expect: { error: false } }, { expect: { value: 2, error: true } },
    { expect: { value: {} } }, { expect: { value: ["x".repeat(257)] } },
    { expect: { value: Array(21).fill("x") } }, { expect: { value: 1.5 } },
    { source: "RETURN" }, { program: 42 },
  ])("rejects malformed case overlay %j", overlay => {
    expect(() => runCollectionTestSuite(suite([{ ...example(), ...overlay }]))).toThrow();
  });

  it("rejects duplicate names, oversized per-case inputs, suite text and case counts", () => {
    expect(() => runCollectionTestSuite(suite([example(), example()]))).toThrow("duplicate");
    expect(() => runCollectionTestSuite(suite([{ ...example(), inputs: { value: "x".repeat(16_384) } }]))).toThrow("bounded");
    expect(() => runCollectionTestSuite(" ".repeat(COLLECTION_TEST_LIMITS.text + 1))).toThrow("text limit");
    expect(() => runCollectionTestSuite("{")).toThrow("valid JSON");
    const cases = Array.from({ length: 65 }, (_, i) => ({ ...example(), name: `case-${i}` }));
    expect(() => runCollectionTestSuite(suite(cases))).toThrow("between 1 and 64");
    expect(runCollectionTestSuite(suite(cases.slice(0, 64))).passed).toBe(64);
  });

  it("never treats a broken library source as an expected runtime error", () => {
    vi.spyOn(library, "getCollectionProgramSource").mockReturnValue("not a program");
    const execution = vi.spyOn(vm, "executeCollection");
    expect(() => runCollectionTestSuite(suite([{ ...example(), expect: { error: true } }]))).toThrow();
    expect(execution).not.toHaveBeenCalled();
  });

  it("does not swallow unexpected host failures as passing assertions", () => {
    vi.spyOn(vm, "executeCollection").mockImplementation(() => { throw new Error("synthetic host fault"); });
    expect(() => runCollectionTestSuite(suite([{ ...example(), expect: { error: true } }]))).toThrow("synthetic host fault");
  });

  it("preserves the VM cycle bound and treats bounded runtime errors explicitly", () => {
    vi.spyOn(library, "getCollectionProgramSource").mockReturnValue(
      'WLS-COLLECTION/1\n:loop\nJUMP ["loop"]\nRETURN ["unused"]',
    );
    const report = runCollectionTestSuite(suite([{ ...example(), expect: { error: true } }]));
    expect(report).toMatchObject({ passed: 1, failed: 0 });
  });

  it("does not echo supplied private values or raw runtime diagnostics in reports", () => {
    const secret = "SYNTHETIC_PRIVATE_VALUE";
    const report = runCollectionTestSuite(suite([{
      ...example(), program: "string.contains", inputs: { items: [secret], value: secret },
      expect: { value: false },
    }]));
    expect(report.failed).toBe(1);
    expect(JSON.stringify(report)).not.toContain(secret);
  });
});
