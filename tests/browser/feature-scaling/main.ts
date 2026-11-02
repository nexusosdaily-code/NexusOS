import {
  fitFeatureScaler, transformFeatures, trainScaledFractionalClassifier, evaluateScaledFractionalClassifier,
  compileFeatureScalingFit, FeatureScalingInputError, FeatureScalingRangeError,
} from "../../../shared/wls-feature-scaling";
import { compilePythonWavelength } from "../../../shared/wavelength-python";
import { executePythonWavelength } from "../../../shared/wavelength-python-vm";
import { VM_MAX_CYCLES } from "../../../shared/vm-security";
import type { FractionalLearningSample } from "../../../shared/wls-fractional-learning";
import type { FeatureScaler } from "../../../shared/wls-feature-scaling";

export interface ScalingPayload {
  scaling: { samples: readonly FractionalLearningSample[]; model?: FeatureScaler }[];
  pipelines: { samples: readonly FractionalLearningSample[]; heldOut: readonly FractionalLearningSample[]; rate: string }[];
}
async function evidence(result: { source: string; cycles: number }) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(result.source));
  return { sourceSha256: Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join(""),
    cycles: result.cycles, instructions: compilePythonWavelength(result.source).length, characters: result.source.length };
}
function scalingFields(result: ReturnType<typeof fitFeatureScaler>) {
  return { model: result.model, samples: result.samples };
}
/** Same real implementation in Node and native pages; reference arithmetic is not bundled. */
export async function runScalingCases(payload: ScalingPayload) {
  const scaling = [], pipelines = [];
  for (const request of payload.scaling) {
    const result = request.model ? transformFeatures(request.model, request.samples) : fitFeatureScaler(request.samples);
    scaling.push({ semantic: scalingFields(result), evidence: await evidence(result), calls: result.kernelCalls,
      frozen: Object.isFrozen(result.model) && Object.isFrozen(result.samples) && result.samples.every(Object.isFrozen) });
  }
  for (const request of payload.pipelines) {
    const fitted = trainScaledFractionalClassifier(request.samples, request.rate);
    const before = JSON.stringify(fitted.scaling.model);
    const held = evaluateScaledFractionalClassifier(fitted.scaling.model, fitted.training.model, request.heldOut);
    const t = fitted.training, e = held.evaluation;
    pipelines.push({
      fitted: scalingFields(fitted.scaling), transformed: scalingFields(held.scaling),
      semantic: { model: t.model, initialMistakes: t.initialMistakes, finalMistakes: t.finalMistakes,
        mistakesByEpoch: t.mistakesByEpoch, updates: t.updates, parameterUpdates: t.parameterUpdates,
        evaluation: { status: "ok", predictions: e.predictions, scores: e.scores, scoreUnits: e.scoreUnits,
          rawMargins: e.rawMargins, marginScale: e.marginScale, mistakes: e.mistakes } },
      unchanged: JSON.stringify(fitted.scaling.model) === before,
      evidence: await Promise.all([fitted.scaling, t, held.scaling, e].map(evidence)),
    });
  }
  let getterCalls = 0;
  const p = { x1: "0", x2: "0", label: 0 }, zero = { maxAbsX1: "0", maxAbsX2: "0" };
  const reject = (fn: () => unknown, Type: typeof FeatureScalingInputError | typeof FeatureScalingRangeError) => {
    try { fn(); return false; } catch (error) { if (!(error instanceof Type)) throw error; return true; }
  };
  const rejections = [
    ...[null, [], {}, Array(1), Array(5).fill(p)].map(value => reject(() => fitFeatureScaler(value), FeatureScalingInputError)),
    ...["1e3", "1\n", " 1", "01", "1.0001", "1000.001", 1, null, {}, Infinity].map(value =>
      reject(() => fitFeatureScaler([{ ...p, x1: value }]), FeatureScalingInputError)),
    ...[null, {}, { ...zero, maxAbsX1: "-1" }, { ...zero, extra: 0 }].map(model =>
      reject(() => transformFeatures(model, [p]), FeatureScalingInputError)),
    reject(() => fitFeatureScaler([{ ...p, get label() { getterCalls++; return 0; } }]), FeatureScalingInputError),
    reject(() => transformFeatures({ ...zero, get maxAbsX1() { getterCalls++; return "0"; } }, [p]), FeatureScalingInputError),
    reject(() => fitFeatureScaler(Object.assign([p], { [Symbol.iterator]() { getterCalls++; throw Error("iterator"); } })), FeatureScalingInputError),
    reject(() => transformFeatures(zero, [{ ...p, x1: "0.001" }]), FeatureScalingRangeError),
    reject(() => transformFeatures(zero, [p, { ...p, x2: "-0.001" }]), FeatureScalingRangeError),
    reject(() => transformFeatures(zero, Array(17).fill(p)), FeatureScalingInputError),
    reject(() => fitFeatureScaler([{ ...p, label: "0" }]), FeatureScalingInputError),
    reject(() => fitFeatureScaler([{ ...p, extra: 1 }]), FeatureScalingInputError),
    reject(() => transformFeatures({ maxAbsX1: "1", maxAbsX2: "0.001" }, [{ ...p, x1: "1.001" }]), FeatureScalingRangeError),
    reject(() => transformFeatures({ maxAbsX1: "1", maxAbsX2: "0.001" }, [{ ...p, x2: "-0.002" }]), FeatureScalingRangeError),
    reject(() => transformFeatures({ maxAbsX1: "1", maxAbsX2: "0.001" },
      [...Array(15).fill(p), { ...p, x1: "1.001" }]), FeatureScalingRangeError),
  ];
  const mutations = [];
  for (const [value, needle, replacement] of [
    ["-2", '"line":9,"args":[1000]', '"line":9,"args":[999]'],
    ["-2", '"line":2,"args":[2]', '"line":2,"args":[0]'],
    ["2", '@573.62nm GT {"line":6', '@584.26nm LT {"line":6'],
  ]) {
    const source = compileFeatureScalingFit([{ x1: value, x2: "0", label: 0 }]);
    const start = source.indexOf('FUNC {"line":1,"args":["scalingAbs"');
    if (start < 0) throw Error("Missing scaling helper");
    const wrong = source.slice(0, start) + source.slice(start).replace(needle, replacement);
    if (wrong === source) throw Error("Mutation did not change a valid scaling program");
    const original = executePythonWavelength(source), changed = executePythonWavelength(wrong);
    mutations.push({ detected: original.variables.out_0_x1 !== changed.variables.out_0_x1,
      original: original.variables.out_0_x1, changed: changed.variables.out_0_x1,
      evidence: await evidence({ source: wrong, cycles: changed.cycles }) });
  }
  const repeat = fitFeatureScaler(payload.scaling[0].samples);
  return { scaling, pipelines, rejections, getterCalls, mutations, cycleLimit: VM_MAX_CYCLES,
    repeat: { semantic: scalingFields(repeat), evidence: await evidence(repeat), calls: repeat.kernelCalls,
      frozen: Object.isFrozen(repeat.model) && Object.isFrozen(repeat.samples) && repeat.samples.every(Object.isFrozen) } };
}
if (typeof document !== "undefined") {
  document.querySelector("#run")!.addEventListener("click", () => {
    const status = document.querySelector<HTMLElement>("#status")!;
    status.dataset.state = "running";
    // Normal page task, not debugger evaluation.
    setTimeout(() => { void (async () => {
      try {
        const report = await runScalingCases(JSON.parse(document.querySelector<HTMLTextAreaElement>("#inputs")!.value));
        document.querySelector("#report")!.textContent = JSON.stringify(report);
        status.dataset.state = "complete"; status.textContent = "Complete";
      } catch (error) { status.dataset.state = "error"; status.textContent = String(error); }
    })(); }, 0);
  });
  document.addEventListener("securitypolicyviolation", event => {
    if (event.effectiveDirective === "connect-src") {
      const status = document.querySelector<HTMLElement>("#policy")!;
      status.dataset.state = "blocked"; status.textContent = "Native CSP blocked the network probe";
    }
  });
  document.querySelector("#probe")!.addEventListener("click", () => {
    const target = document.querySelector<HTMLElement>("#network")!;
    void fetch("/scaler-probe").then(response => {
      target.textContent = String(response.status); target.dataset.state = "arrived";
    }, () => { target.dataset.state = "blocked"; target.textContent = "Network request blocked"; });
  });
}
