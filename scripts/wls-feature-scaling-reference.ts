import { execFileSync } from "node:child_process";
import type { FeatureScaler } from "../shared/wls-feature-scaling";
import type { FractionalLearningSample } from "../shared/wls-fractional-learning";

export interface ScalingRequest {
  samples: readonly FractionalLearningSample[];
  model?: FeatureScaler;
}
export interface ScalingReferenceResult {
  model: FeatureScaler; samples: FractionalLearningSample[];
}
/** Independent audit oracle only. Never imported by the runtime package. */
export function featureScalingReference(requests: readonly ScalingRequest[]): ScalingReferenceResult[] {
  const source = `
import json, sys
from fractions import Fraction
def show(value):
    scaled = value*1000
    result, remainder = divmod(abs(scaled.numerator), scaled.denominator)
    if 2*remainder >= scaled.denominator: result += 1
    sign = "-" if scaled < 0 and result else ""
    return f"{sign}{result//1000}.{result%1000:03d}"
results = []
for request in json.load(sys.stdin):
    points = request["samples"]
    scales = ([Fraction(request["model"][key]) for key in ("maxAbsX1","maxAbsX2")]
        if "model" in request else [max(abs(Fraction(p[key])) for p in points) for key in ("x1","x2")])
    transformed = []
    for point in points:
        p = dict(label=point["label"])
        for key, scale in zip(("x1","x2"),scales):
            value = Fraction(point[key])
            assert abs(value) <= scale
            p[key] = show(value/scale) if scale else "0.000"
        transformed.append(p)
    results.append(dict(model=dict(zip(("maxAbsX1","maxAbsX2"),map(show,scales))),samples=transformed))
print(json.dumps(results))
`;
  return JSON.parse(execFileSync("python3", ["-I", "-c", source], {
    input: JSON.stringify(requests), encoding: "utf8", timeout: 3000, maxBuffer: 1_048_576,
    env: { PATH: process.env.PATH ?? "" },
  })) as ScalingReferenceResult[];
}

export const SCALED_AND_TRAINING: readonly FractionalLearningSample[] = Object.freeze([
  { x1: "-1000.000", x2: "-0.005", label: 0 as const },
  { x1: "-1000.000", x2: "0.005", label: 0 as const },
  { x1: "1000.000", x2: "-0.005", label: 0 as const },
  { x1: "1000.000", x2: "0.005", label: 1 as const },
].map(p => Object.freeze(p)));
export const SCALED_AND_HELD_OUT: readonly FractionalLearningSample[] = Object.freeze(
  [-750, -500, 500, 750].flatMap(x => [-3, 3].map(y => Object.freeze({
    x1: `${x < 0 ? "-" : ""}${Math.abs(x)}.000`,
    x2: `${y < 0 ? "-" : ""}0.00${Math.abs(y)}`,
    label: (x > 0 && y > 0 ? 1 : 0) as 0 | 1,
  }))),
);
export function featureScalingFixtures(): ScalingRequest[] {
  const cases: ScalingRequest[] = [
    { samples: SCALED_AND_TRAINING },
    { samples: [{ x1: "0", x2: "-0", label: 0 }] },
    { samples: [{ x1: "0.001", x2: "-0.001", label: 1 }] },
    { samples: [{ x1: "7.000", x2: "0", label: 1 }, { x1: "-7.000", x2: "0", label: 0 }] },
    { model: { maxAbsX1: "1000", maxAbsX2: "1000" }, samples:
      ["0.499", "0.500", "-0.499", "-0.500"].map(x => ({ x1: x, x2: x, label: 0 })) },
    { model: { maxAbsX1: "1", maxAbsX2: "0" }, samples:
      Array.from({ length: 16 }, (_, i) => ({ x1: i % 2 ? "1" : "-1", x2: "0", label: 0 })) },
  ];
  let state = 0x15eac;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
  const show = (u: number) => `${u < 0 ? "-" : ""}${Math.floor(Math.abs(u) / 1000)}.${String(Math.abs(u) % 1000).padStart(3, "0")}`;
  for (let i = 0; i < 128; i++) {
    cases.push({ samples: Array.from({ length: i % 4 + 1 }, () => ({
      x1: show(next() % 2_000_001 - 1_000_000), x2: show(next() % 2_000_001 - 1_000_000),
      label: next() % 2 as 0 | 1,
    })) });
  }
  return cases;
}
