import { useState, type CSSProperties, type ChangeEvent } from "react";
import { compileCollection, executeCollection, COLLECTION_LIMITS, COLLECTION_PROFILE } from "@shared/wls-collection-vm";
import { compileMap, executeMap, MAP_LIMITS, MAP_PROFILE } from "@shared/wls-map-vm";
import { getCollectionProgramSource } from "@shared/wls-library";
import { RECIPIENT_COLLECTION_SOURCE } from "@shared/wls-recipient-collections";
import { trackCollectionStage } from "@/lib/analytics";
import { runBundledSetSuite, type BundledSetCaseResult } from "@/lib/bundled-set-suite";
import setPackage from "../../../scripts/fixtures/wls-set-package-v0-5.json";
import setSuite from "../../../scripts/fixtures/wls-set-v0-5-smoke.json";
import conditionalSuite from "../../../scripts/fixtures/wls-map-set-v0-8-smoke.json";
import selectionSuite from "../../../scripts/fixtures/wls-map-set-v0-9-smoke.json";
import valuesSuite from "../../../scripts/fixtures/wls-map-set-v0-10-smoke.json";
import transformsSuite from "../../../scripts/fixtures/wls-map-set-v0-11-smoke.json";
import orderedValuesSuite from "../../../scripts/fixtures/wls-map-set-v0-12-smoke.json";
import indexedSuite from "../../../scripts/fixtures/wls-map-set-v0-13-smoke.json";
import membershipSuite from "../../../scripts/fixtures/wls-map-set-v0-14-smoke.json";
import windowsSuite from "../../../scripts/fixtures/wls-map-set-v0-15-smoke.json";
import renamingSuite from "../../../scripts/fixtures/wls-map-set-v0-16-smoke.json";

const INPUT_LIMIT = 16_384;
type Instruction = ReturnType<typeof compileCollection>[number];
type TraceEntry = { op: string; nm: number; line: number };
type Profile = typeof COLLECTION_PROFILE | typeof MAP_PROFILE;
type Example = { key: string; label: string; inputs: Record<string, unknown>; source: string; expected?: { value?: unknown; error?: boolean }; fixture?: string };
type Comparison = { kind: "match" | "mismatch" | "invalid" | "execution-error"; message: string };

const collectionExamples: Example[] = [
  { key: "add", label: "Add · unique", inputs: { items: ["ops@wavelength.dev", "design@wavelength.dev"], value: "research@wavelength.dev" } },
  { key: "remove", label: "Remove · exact", inputs: { items: ["ops@wavelength.dev", "design@wavelength.dev", "research@wavelength.dev"], value: "design@wavelength.dev" } },
  { key: "count", label: "Count · list length", inputs: { items: ["ops@wavelength.dev", "design@wavelength.dev", "research@wavelength.dev"] } },
  { key: "at", label: "At · indexed item", inputs: { items: ["ops@wavelength.dev", "design@wavelength.dev", "research@wavelength.dev"], index: 1 } },
].map(example => ({ ...example, source: RECIPIENT_COLLECTION_SOURCE[example.key as keyof typeof RECIPIENT_COLLECTION_SOURCE] }));

const sampleMap = { entries: [["topic", "waves"], ["level", "beginner"]] };
const mapExamples: Example[] = [
  { key: "set", label: "Set · add key", inputs: { map: sampleMap, key: "language", value: "WLS" } },
  { key: "overwrite", label: "Set · replace value", inputs: { map: sampleMap, key: "level", value: "intermediate" } },
  { key: "get", label: "Get · existing key", inputs: { map: sampleMap, key: "topic" } },
  { key: "missing", label: "Get · missing-key error", inputs: { map: sampleMap, key: "missing" } },
  { key: "has", label: "Has · absent key", inputs: { map: sampleMap, key: "missing" } },
  { key: "delete", label: "Delete · exact key", inputs: { map: sampleMap, key: "level" } },
  { key: "size", label: "Size · entry count", inputs: { map: sampleMap } },
  { key: "keyAt", label: "Key at · insertion order", inputs: { map: sampleMap, index: 1 } },
  { key: "copy", label: "Copy · map snapshot", inputs: { map: sampleMap } },
  { key: "empty", label: "New · empty map", inputs: {} },
].map(example => ({
  ...example,
  source: getCollectionProgramSource(`map.${example.key === "overwrite" ? "set" : example.key === "missing" ? "get" : example.key}`),
}));

// Use the shipped fixture inputs/expectations and the canonical local sources,
// not hand-copied programs or a second Set interpreter.
const setExamples: Example[] = setSuite.cases
  .filter(example => example.program.startsWith("set."))
  .map(example => ({
    key: `${example.program}${"error" in example.expect ? ".invalid" : ""}`,
    label: `${example.program} · ${example.name}`,
    inputs: example.inputs,
    source: getCollectionProgramSource(example.program),
    expected: example.expect,
  }));
function releaseExamples(suite: { cases: { program: string; name: string; inputs: Record<string, unknown>; expect: { value?: unknown; error?: boolean } }[] }, programs: readonly string[], fixture: string): Example[] {
  const seen = new Set<string>();
  return suite.cases.filter(example => programs.includes(example.program)).map(example => {
    const key = seen.has(example.program) ? `${example.program}:${example.name}` : example.program;
    seen.add(example.program);
    return {
      key,
      label: `${example.program} · ${example.name}`,
      inputs: example.inputs,
      source: getCollectionProgramSource(example.program),
      expected: example.expect,
      fixture,
    };
  });
}
const conditionalExamples = releaseExamples(conditionalSuite,
  ["map.getOrDefault", "map.setIfAbsent", "map.replaceIfPresent"], "wls-map-set-v0-8-smoke.json");
const selectionExamples = releaseExamples(selectionSuite,
  ["map.take", "map.drop", "set.take", "set.drop"], "wls-map-set-v0-9-smoke.json");
const laterReleases = [
  { version: "0.10.0", suite: valuesSuite },
  { version: "0.11.0", suite: transformsSuite },
  { version: "0.12.0", suite: orderedValuesSuite },
  { version: "0.13.0", suite: indexedSuite },
  { version: "0.14.0", suite: membershipSuite },
  { version: "0.15.0", suite: windowsSuite },
  { version: "0.16.0", suite: renamingSuite },
].map(({ version, suite }) => ({
  version,
  examples: releaseExamples(suite, suite.cases.map(c => c.program), `wls-map-set-v0-${version.split(".")[1]}-smoke.json`),
}));
const mapAndSetExamples = [...mapExamples, ...setExamples, ...conditionalExamples, ...selectionExamples, ...laterReleases.flatMap(r => r.examples)];

const panel: CSSProperties = {
  border: "1px solid rgba(139, 92, 246, .28)",
  background: "rgba(15, 12, 27, .82)",
  borderRadius: 12,
};
const field: CSSProperties = {
  width: "100%", boxSizing: "border-box", resize: "vertical",
  border: "1px solid rgba(139, 92, 246, .3)", borderRadius: 8,
  background: "#090711", color: "#d9fbe7", padding: "12px 14px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12,
  lineHeight: 1.65, outlineColor: "#a78bfa",
};
const button: CSSProperties = {
  minHeight: 38, borderRadius: 8, border: "1px solid rgba(167,139,250,.38)",
  background: "rgba(109, 40, 217, .17)", color: "#e9ddff",
  padding: "8px 13px", fontSize: 12, fontWeight: 650, cursor: "pointer",
};

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

// Avoid recursion on deeply nested, bounded expected JSON.
function equalJson(actual: unknown, expected: unknown): boolean {
  const pending: [unknown, unknown][] = [[actual, expected]];
  while (pending.length) {
    const [left, right] = pending.pop()!;
    if (left === right) continue;
    if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftObject = left as Record<string, unknown>;
    const rightObject = right as Record<string, unknown>;
    const keys = Object.keys(leftObject);
    if (keys.length !== Object.keys(rightObject).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(rightObject, key)) return false;
      pending.push([leftObject[key], rightObject[key]]);
    }
  }
  return true;
}

function validateInputs(text: string): Record<string, unknown> {
  if (text.length > INPUT_LIMIT) throw new Error(`Inputs exceed the ${INPUT_LIMIT.toLocaleString()} character limit.`);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("Inputs must be valid JSON."); }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Inputs must be a non-null JSON object (not an array).");
  }
  return parsed as Record<string, unknown>;
}

export default function CollectionWorkspace({ profile = COLLECTION_PROFILE, startWithSets = false }: { profile?: Profile; startWithSets?: boolean }) {
  // Remount all editor/result state together, including direct prop changes.
  return <ProfileWorkspace key={`${profile}:${startWithSets}`} profile={profile} startWithSets={startWithSets} />;
}

function ProfileWorkspace({ profile, startWithSets }: { profile: Profile; startWithSets: boolean }) {
  const isMap = profile === MAP_PROFILE;
  const examples = isMap ? mapAndSetExamples : collectionExamples;
  const initialExample = isMap && startWithSets ? setExamples.find(example => example.key === "set.fromMap")! : examples[0];
  const limits = isMap ? MAP_LIMITS : COLLECTION_LIMITS;
  const kind = isMap ? "Map" : "Collection";
  const [selected, setSelected] = useState(initialExample.key);
  const [source, setSource] = useState(initialExample.source);
  const [inputs, setInputs] = useState(stringify(initialExample.inputs));
  const selectedExample = examples.find(example => example.key === selected)!;
  const [compiled, setCompiled] = useState<readonly Instruction[] | null>(null);
  const [output, setOutput] = useState<unknown>(undefined);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [error, setError] = useState("");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [expectedJson, setExpectedJson] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [suiteResults, setSuiteResults] = useState<BundledSetCaseResult[] | null>(null);
  const [suiteError, setSuiteError] = useState("");

  const runSetSuite = () => {
    setSuiteResults(null);
    setSuiteError("");
    try {
      setSuiteResults(runBundledSetSuite());
    } catch (cause) {
      setSuiteError(cause instanceof Error ? cause.message : "Unable to run the bundled Set suite.");
    }
  };

  const clearResults = () => {
    setCompiled(null);
    setOutput(undefined);
    setTrace([]);
    setError("");
    setComparison(null);
  };

  const loadExample = (key: string) => {
    const example = examples.find(item => item.key === key)!;
    setSelected(key);
    setSource(example.source);
    setInputs(stringify(example.inputs));
    setCompareEnabled(false);
    setExpectedJson("");
    clearResults();
  };

  const validateSource = () => {
    try {
      if (source.length > limits.sourceLength) throw new Error(`Source exceeds the ${limits.sourceLength.toLocaleString()} character limit.`);
      const program = isMap ? compileMap(source) : compileCollection(source);
      if (!isMap) trackCollectionStage("compile", "success", selected);
      return program;
    } catch (cause) {
      if (!isMap) trackCollectionStage("compile", "failure", selected);
      throw cause;
    }
  };

  const compile = () => {
    clearResults();
    try {
      const program = validateSource();
      setCompiled(program);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to compile ${kind.toLowerCase()} source.`);
    }
  };

  const execute = (compare = false) => {
    clearResults();
    let expected: unknown;
    if (compare) {
      if (expectedJson.length > INPUT_LIMIT) {
        setComparison({ kind: "invalid", message: `Invalid expected JSON: exceeds the ${INPUT_LIMIT.toLocaleString()} character limit. Program not executed.` });
        return;
      }
      try {
        expected = JSON.parse(expectedJson);
      } catch {
        setComparison({ kind: "invalid", message: "Invalid expected JSON: enter one valid JSON value. Program not executed." });
        return;
      }
    }
    try {
      const parsedInputs = validateInputs(inputs);
      const program = validateSource();
      const result = isMap ? executeMap(source, parsedInputs) : executeCollection(source, parsedInputs);
      setCompiled(program);
      setOutput(result.value);
      setTrace(result.trace);
      if (compare) {
        setComparison(equalJson(result.value, expected)
          ? { kind: "match", message: "Equal: returned JSON matches your expected value." }
          : { kind: "mismatch", message: "Mismatch: returned JSON differs from your expected value." });
      }
      if (!isMap) trackCollectionStage("execute", "success", selected);
    } catch (cause) {
      if (!isMap) trackCollectionStage("execute", "failure", selected);
      setError(cause instanceof Error ? cause.message : `Unable to execute ${kind.toLowerCase()} source.`);
      if (compare) setComparison({ kind: "execution-error", message: "Execution error: no returned JSON value to compare." });
    }
  };

  const textareaChange = (setter: (value: string) => void) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    setter(event.target.value);
    clearResults();
  };
  const visitedCount = new Map<string, number>();
  trace.forEach(item => {
    const key = `${item.line}:${item.op}`;
    visitedCount.set(key, (visitedCount.get(key) ?? 0) + 1);
  });

  return (
    <section style={{ color: "#e8e2f4", fontFamily: "inherit" }} aria-labelledby="collection-workspace-title">
      <header style={{ ...panel, padding: "22px clamp(16px, 3vw, 28px)", marginBottom: 16 }}>
        <div style={{ color: "#a78bfa", font: "600 10px ui-monospace, monospace", letterSpacing: ".17em", textTransform: "uppercase" }}>
          Bounded execution · browser-local
        </div>
        <h2 id="collection-workspace-title" style={{ margin: "8px 0 6px", fontSize: "clamp(21px, 3vw, 27px)", letterSpacing: "-.035em", color: "#f1eaff" }}>
          {kind} workspace
        </h2>
        <p style={{ margin: 0, maxWidth: 760, color: "#b8aecb", fontSize: 13, lineHeight: 1.65 }}>
          Inspect native {isMap ? "map" : "collection"} programs as source, compiled instructions, and an execution trace. Coordinates are metadata, not permissions.
        </p>
        <div style={{ marginTop: 14, padding: "10px 12px", borderLeft: "2px solid #8b5cf6", background: "rgba(139,92,246,.08)", color: "#c9bfd9", fontSize: 12, lineHeight: 1.6 }}>
          This focused VM is capability-free: no DOM, network, storage, or financial effects. It is not a general module system. Language previews elsewhere are not native collection programs.
        </div>
      </header>

      <div style={{ ...panel, padding: "16px clamp(14px, 2.5vw, 22px)", marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: "0 0 4px", color: "#e9ddff", fontSize: 14 }}>Boundaries</h3>
            <a href="/wavelengthscript-dependencies.html" style={{ color: "#c4b5fd", fontSize: 12 }}>Working dependency packages 0.1.0–0.16.0: guide and audit</a>
            <p style={{ margin: 0, color: "#8f869f", fontSize: 11 }}>Hard VM limits · rejected when exceeded</p>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {(isMap ? [
              [`${MAP_LIMITS.entries}`, "entries"],
              [`${MAP_LIMITS.keyLength}`, "chars / key"],
              [`${MAP_LIMITS.valueLength}`, "chars / value"],
              [`${MAP_LIMITS.instructions}`, "instructions"],
              [`${MAP_LIMITS.cycles}`, "cycles"],
              [`${MAP_LIMITS.registers}`, "registers"],
              [`${MAP_LIMITS.memoryBytes.toLocaleString()}`, "logical memory bytes"],
            ] : [
              [`${COLLECTION_LIMITS.items}`, "items"],
              [`${COLLECTION_LIMITS.stringLength}`, "chars / string"],
              [`${COLLECTION_LIMITS.instructions}`, "instructions"],
              [`${COLLECTION_LIMITS.cycles}`, "cycles"],
              [`${COLLECTION_LIMITS.registers}`, "registers"],
            ]).map(([value, label]) => (
              <span key={label} style={{ border: "1px solid rgba(134,239,172,.17)", borderRadius: 6, background: "rgba(34,197,94,.06)", padding: "6px 8px", color: "#b9f5cd", font: "11px ui-monospace, monospace" }}>
                {value} <span style={{ color: "#829888" }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ color: "#8f869f", fontSize: 11 }}>Source ≤ {limits.sourceLength.toLocaleString()} chars · JSON inputs ≤ {INPUT_LIMIT.toLocaleString()} chars</div>
        {isMap && <p style={{ color: "#b8aecb", fontSize: 12, lineHeight: 1.65, overflowWrap: "anywhere" }}>
          {MAP_PROFILE} is separate from WLS-COLLECTION/1. Maps use {"{\"entries\":[[\"key\",\"value\"]]}"} with unique string keys and string values, in insertion order (zero-based indexing).
          {" "}Setting an existing key replaces its value without changing order. MAP_GET fails explicitly when a key is missing; MAP_HAS returns false. Memory is a logical VM budget, not JavaScript heap usage.
        </p>}
        {isMap && <p style={{ color: "#b8aecb", fontSize: 12, lineHeight: 1.65, overflowWrap: "anywhere" }}>
          String Sets use unique Map keys for membership and empty output payloads ("").
          Valid input payloads are intentionally discarded by Set projection and map-returning Set operations.
          This is not a new VM Set type: Set programs execute under {MAP_PROFILE}, with the same finite limits.
          Membership is exact string equality, without Unicode normalization.
        </p>}
        {isMap && <p style={{ color: "#b8aecb", fontSize: 12, lineHeight: 1.65 }}>
          Conditional Maps (local dependency 0.8.0): map.getOrDefault returns a present value (even "") or the supplied fallback.
          {" "}map.setIfAbsent appends only missing keys; map.replaceIfPresent replaces only present keys, without changing their order.
          {" "}Keys, values and fallback must be bounded strings, even when an argument is unused. Missing arguments are errors.
          {" "}These are immutable local results, not shared-state atomic updates.
        </p>}
        {isMap && <p style={{ color: "#b8aecb", fontSize: 12, lineHeight: 1.65 }}>
          Ordered selection (local dependency 0.9.0): take keeps the first count entries; drop skips them, in insertion order, without sorting.
          {" "}Counts must be safe integers: negatives clamp to zero and oversize counts clamp to the operand size (not JavaScript negative slicing).
          {" "}Fractions, unsafe integers, non-numbers and missing counts are errors, even for empty operands.
          {" "}Operands are validated even when the result is empty. Map selection preserves payloads; Set selection always returns empty payloads ("").
        </p>}
      </div>

      <div style={{ ...panel, padding: "16px clamp(14px, 2.5vw, 22px)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "#e9ddff", fontSize: 14 }}>Native examples</h3>
          <label style={{ display: "flex", flexWrap: "wrap", maxWidth: "100%", alignItems: "center", gap: 9, color: "#a9a0b8", fontSize: 12 }}>
            Load program
            <select aria-label={`Load ${kind.toLowerCase()} example`} value={selected} onChange={event => loadExample(event.target.value)}
              style={{ ...field, width: "auto", maxWidth: "100%", minWidth: 190, padding: "8px 10px" }}>
              {isMap ? <>
                <optgroup label="Native Map examples">
                  {mapExamples.map(example => <option key={example.key} value={example.key}>{example.label}</option>)}
                </optgroup>
                <optgroup label={`String Set library · wls.collections ${setPackage.dependencies["wls.collections"]}`}>
                  {setExamples.map(example => <option key={example.key} value={example.key}>{example.label}</option>)}
                </optgroup>
                <optgroup label="Conditional Maps · local wls.collections 0.8.0">
                  {conditionalExamples.map(example => <option key={example.key} value={example.key}>{example.label}</option>)}
                </optgroup>
                <optgroup label="Ordered Map and Set selection · local wls.collections 0.9.0">
                  {selectionExamples.map(example => <option key={example.key} value={example.key}>{example.label}</option>)}
                </optgroup>
                {laterReleases.map(release => <optgroup key={release.version} label={`Native Map and Set examples · local wls.collections ${release.version}`}>
                  {release.examples.map(example => <option key={example.key} value={example.key}>{example.label}</option>)}
                </optgroup>)}
              </> : examples.map(example => <option key={example.key} value={example.key}>{example.label}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 14 }}>
          <label style={{ display: "block", color: "#c6bbd7", fontSize: 12, fontWeight: 600 }}>
            {kind} source
            <textarea data-testid="collection-source" aria-label={`${kind} source`} spellCheck={false} maxLength={limits.sourceLength}
              value={source} onChange={textareaChange(setSource)} rows={14} style={{ ...field, display: "block", marginTop: 7 }} />
            <span style={{ display: "block", marginTop: 5, color: source.length >= limits.sourceLength ? "#fca5a5" : "#776d88", font: "10px ui-monospace, monospace" }}>
              {source.length.toLocaleString()} / {limits.sourceLength.toLocaleString()} characters
            </span>
          </label>
          <label style={{ display: "block", color: "#c6bbd7", fontSize: 12, fontWeight: 600 }}>
            JSON inputs
            <textarea data-testid="collection-inputs" aria-label={`${kind} JSON inputs`} spellCheck={false} maxLength={INPUT_LIMIT}
              value={inputs} onChange={textareaChange(setInputs)} rows={14} style={{ ...field, display: "block", marginTop: 7 }} />
            <span style={{ display: "block", marginTop: 5, color: inputs.length >= INPUT_LIMIT ? "#fca5a5" : "#776d88", font: "10px ui-monospace, monospace" }}>
              {inputs.length.toLocaleString()} / {INPUT_LIMIT.toLocaleString()} characters · non-null object required
            </span>
          </label>
        </div>
        {selectedExample.expected && <section aria-label={selectedExample.fixture ? "Native fixture expected result" : "Set fixture expected result"} style={{ marginTop: 14, color: "#c6bbd7", fontSize: 12, overflowWrap: "anywhere" }}>
          <strong>Expected result · bundled example</strong>
          <p>{selectedExample.fixture
            ? `From ${selectedExample.fixture} · canonical native source under ${MAP_PROFILE}, with unchanged execution limits.`
            : `From wls-set-v0-5-smoke.json and wls-set-package-v0-5.json · exact dependency wls.collections ${setPackage.dependencies["wls.collections"]}.`}
            {" "}This is the fixture expectation, not verification of edited source or inputs. A version declaration is not a source-integrity lock.</p>
          <pre data-testid={selectedExample.fixture ? "native-expected" : "set-expected"} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {selectedExample.expected.error ? "Execution error expected (invalid input)." : stringify(selectedExample.expected.value)}
          </pre>
        </section>}
        <section aria-label="Learner JSON comparison" style={{ marginTop: 14, color: "#c6bbd7", fontSize: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={compareEnabled} onChange={event => {
              setCompareEnabled(event.target.checked);
              setComparison(null);
            }} />
            Compare with my expected JSON
          </label>
          {compareEnabled && <>
            <p>Browser-local value comparison only, not source authentication or a verified package lock.
              {" "}Object key order is ignored; array order (including Set entries) matters. JSON types must match.</p>
            <label style={{ display: "block" }}>
              My expected JSON
              <textarea aria-label="My expected JSON" spellCheck={false} maxLength={INPUT_LIMIT}
                value={expectedJson} onChange={event => {
                  setExpectedJson(event.target.value);
                  setComparison(null);
                }} rows={5} style={{ ...field, display: "block", marginTop: 7 }} />
            </label>
            <p>{expectedJson.length.toLocaleString()} / {INPUT_LIMIT.toLocaleString()} characters · any JSON value</p>
            <button type="button" onClick={() => execute(true)} style={button}>Execute and compare</button>
          </>}
          {comparison && <p role="status" data-testid="collection-comparison" data-outcome={comparison.kind}>
            {comparison.message}
          </p>}
        </section>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 16 }}>
          <button type="button" data-testid="collection-compile" style={button} onClick={compile}>Compile</button>
          <button type="button" data-testid="collection-execute" style={{ ...button, borderColor: "rgba(74,222,128,.45)", background: "rgba(22,163,74,.16)", color: "#c8f7d6" }} onClick={() => execute()}>Execute</button>
          <button type="button" data-testid="collection-run-all" style={{ ...button, background: "rgba(109,40,217,.35)" }} onClick={() => execute()}>Run all</button>
        </div>
      </div>

      {isMap && <section aria-labelledby="set-suite-title" style={{ ...panel, padding: "16px clamp(14px, 2.5vw, 22px)", marginBottom: 16 }}>
        <h3 id="set-suite-title" style={{ margin: "0 0 8px", color: "#e9ddff", fontSize: 14 }}>Bundled Set suite · offline</h3>
        <p style={{ color: "#b8aecb", fontSize: 12, lineHeight: 1.65, overflowWrap: "anywhere" }}>
          Run every case in wls-set-v0-5-smoke.json, including the Map compatibility case and expected execution failures,
          against wls-set-package-v0-5.json (exact dependency wls.collections {setPackage.dependencies["wls.collections"]}).
          {" "}Uses canonical bundled shared/wls-library.ts sources with unchanged {MAP_PROFILE} limits.
          {" "}No network requests. Editor changes are not used or replaced; Run all above still runs only the current editor program.
          {" "}The exact version declaration checks local compatibility, not source integrity; no source lock or author authentication is verified.
        </p>
        <button type="button" data-testid="set-suite-run" style={button} onClick={runSetSuite}>Run bundled Set suite (offline)</button>
        <div aria-live="polite" aria-atomic="true" style={{ marginTop: 12, color: "#c6bbd7", fontSize: 12 }}>
          {suiteResults
            ? `${suiteResults.filter(result => result.passed).length} / ${suiteResults.length} passed · ${suiteResults.filter(result => !result.passed).length} failed`
            : "Suite not run yet."}
        </div>
        {suiteError && <p role="alert" data-testid="set-suite-error" style={{ color: "#fecaca", fontSize: 12 }}>Suite stopped: {suiteError}</p>}
        {suiteResults && <ol aria-label="Bundled Set suite results" data-testid="set-suite-results" style={{ paddingLeft: 22, fontSize: 12 }}>
          {suiteResults.map(result => <li key={result.name} style={{ padding: "10px 0", borderBottom: "1px solid rgba(139,92,246,.2)", overflowWrap: "anywhere" }}>
            <strong style={{ color: result.passed ? "#bff3ce" : "#fecaca" }}>
              {result.passed ? "PASS" : "FAIL"} · {result.name}
            </strong>
            <div style={{ marginTop: 4, color: "#a9a0b8" }}>{result.program}{result.expected.error ? " · expected failure" : ""}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12, marginTop: 8 }}>
              <div>Expected
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {result.expected.error ? "Execution error (invalid input)" : stringify(result.expected.value)}
                </pre>
              </div>
              <div>Actual
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {"error" in result.actual ? `Execution error: ${result.actual.error}` : stringify(result.actual.value)}
                </pre>
              </div>
            </div>
          </li>)}
        </ol>}
      </section>}

      {error && <div role="alert" data-testid="collection-error" style={{ ...panel, padding: "12px 14px", marginBottom: 16, borderColor: "rgba(248,113,113,.48)", color: "#fecaca", fontSize: 12 }}>
        <strong style={{ marginRight: 7, color: "#fca5a5" }}>Execution stopped</strong>{error}
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 390px), 1fr))", gap: 14 }}>
        <section style={{ ...panel, overflow: "hidden" }} aria-labelledby="compiled-title">
          <div style={{ padding: "13px 15px", borderBottom: "1px solid rgba(139,92,246,.2)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 id="compiled-title" style={{ margin: 0, color: "#e9ddff", fontSize: 13 }}>Compiled instructions</h3>
            <span style={{ color: "#8f869f", font: "10px ui-monospace, monospace" }}>{compiled ? `${compiled.length} ops` : "compile to inspect"}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", font: "11px ui-monospace, monospace", textAlign: "left" }}>
              <thead><tr style={{ color: "#8f869f" }}>{["op", "args", "line", "nm"].map(label => <th key={label} style={{ padding: "9px 11px", borderBottom: "1px solid rgba(139,92,246,.14)", fontWeight: 500 }}>{label}</th>)}</tr></thead>
              <tbody>
                {compiled?.map((instruction, index) => (
                  <tr key={`${instruction.line}-${index}`} style={{ borderBottom: "1px solid rgba(139,92,246,.08)", color: "#c8f7d6" }}>
                    <td style={{ padding: "8px 11px", color: "#b99cff", whiteSpace: "nowrap" }}>{instruction.op}</td>
                    <td style={{ padding: "8px 11px", minWidth: 120, wordBreak: "break-word" }}>{stringify(instruction.args)}</td>
                    <td style={{ padding: "8px 11px", color: "#968ba8" }}>{instruction.line}</td>
                    <td style={{ padding: "8px 11px", color: "#8fe5ae" }}>{instruction.nm}</td>
                  </tr>
                ))}
                {!compiled && <tr><td colSpan={4} style={{ padding: 18, color: "#766d83", textAlign: "center" }}>No compiled program yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ ...panel, overflow: "hidden" }} aria-labelledby="trace-title">
          <div style={{ padding: "13px 15px", borderBottom: "1px solid rgba(139,92,246,.2)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 id="trace-title" style={{ margin: 0, color: "#e9ddff", fontSize: 13 }}>Visited trace</h3>
            <span style={{ color: "#8f869f", font: "10px ui-monospace, monospace" }}>{trace.length ? `${trace.length} visits · repeats retained` : "execution only"}</span>
          </div>
          <div style={{ maxHeight: 330, overflow: "auto", padding: "4px 0" }}>
            {trace.map((item, index) => {
              const count = visitedCount.get(`${item.line}:${item.op}`) ?? 1;
              return <div key={`${index}-${item.line}`} style={{ display: "grid", gridTemplateColumns: "42px minmax(100px, 1fr) 48px 62px", gap: 8, padding: "7px 13px", borderBottom: "1px solid rgba(139,92,246,.08)", color: "#bdebc9", font: "11px ui-monospace, monospace" }}>
                <span style={{ color: "#71687e" }}>{String(index + 1).padStart(2, "0")}</span>
                <span>{item.op}{count > 1 ? <span style={{ color: "#a78bfa" }}> ×{count}</span> : null}</span>
                <span style={{ color: "#91879f" }}>L{item.line}</span>
                <span style={{ color: "#8fe5ae" }}>{item.nm} nm</span>
              </div>;
            })}
            {!trace.length && <p style={{ margin: 0, padding: 18, color: "#766d83", fontSize: 12, textAlign: "center" }}>No visits recorded. Unvisited instructions are not shown here.</p>}
          </div>
        </section>
      </div>

      <section style={{ ...panel, marginTop: 14, overflow: "hidden" }} aria-labelledby="output-title">
        <div style={{ padding: "13px 15px", borderBottom: "1px solid rgba(139,92,246,.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 id="output-title" style={{ margin: 0, color: "#e9ddff", fontSize: 13 }}>Returned JSON value</h3>
          <span style={{ color: output !== undefined ? "#86efac" : "#8f869f", font: "10px ui-monospace, monospace" }}>{output !== undefined ? "RETURN" : "awaiting execution"}</span>
        </div>
        <pre data-testid="collection-output" style={{ margin: 0, minHeight: 48, padding: "14px 16px", color: output !== undefined ? "#bff3ce" : "#71687e", font: "12px/1.65 ui-monospace, monospace", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {output !== undefined ? stringify(output) : "—"}
        </pre>
      </section>
    </section>
  );
}
