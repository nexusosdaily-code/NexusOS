import { execFileSync } from "node:child_process";
import type { LearningSample } from "../shared/wls-learning";

// Independent audit-only implementation. JSON is data, never executable input.
// This subprocess is never imported into the application or used as a fallback.
const reference = `
import json, sys
d = json.load(sys.stdin)
w1 = w2 = bias = 0
def predict(x1, x2):
    return int(w1 * x1 + w2 * x2 + bias >= 0)
initial = sum(predict(p["x1"], p["x2"]) != p["label"] for p in d["train"])
epochs = []
for _ in range(d["epochs"]):
    errors = 0
    for p in d["train"]:
        error = p["label"] - predict(p["x1"], p["x2"])
        errors += error != 0
        w1 += error * p["x1"]
        w2 += error * p["x2"]
        bias += error
    epochs.append(errors)
final = sum(predict(p["x1"], p["x2"]) != p["label"] for p in d["train"])
predictions = [predict(p["x1"], p["x2"]) for p in d["test"]]
scores = [w1 * p["x1"] + w2 * p["x2"] + bias for p in d["test"]]
print(json.dumps(dict(model=dict(w1=w1,w2=w2,bias=bias), initial=initial,
    final=final, epochs=epochs, predictions=predictions, scores=scores)))
`;
export function learningReference(train: readonly LearningSample[], test: readonly LearningSample[], epochs: number) {
  return JSON.parse(execFileSync("python3", ["-I", "-c", reference], {
    input: JSON.stringify({ train, test, epochs }), encoding: "utf8",
    timeout: 3000, maxBuffer: 65_536, env: { PATH: process.env.PATH ?? "" },
  })) as { model: { w1: number; w2: number; bias: number }; initial: number; final: number;
    epochs: number[]; predictions: number[]; scores: number[] };
}
