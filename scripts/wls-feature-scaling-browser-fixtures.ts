import type { ScalingPayload } from "../tests/browser/feature-scaling/main";
import { featureScalingFixtures, featureScalingReference, SCALED_AND_TRAINING, SCALED_AND_HELD_OUT } from "./wls-feature-scaling-reference";
import { fractionalLearningReference } from "./wls-fractional-learning-reference";
import type { ScalingReference } from "./wls-browser-scaling-report";

/** Node-only reference preparation. Never imported into the native page bundle. */
export function createScalingBrowserAudit(): { payload: ScalingPayload; expected: ScalingReference } {
  const scaling = featureScalingFixtures();
  const rates = ["0.001", "0.002", "0.003", "0.007", "0.010", "0.125", "0.250", "0.333",
    "0.499", "0.500", "0.501", "0.625", "0.875", "0.999", "1.000"];
  const payload: ScalingPayload = { scaling, pipelines: [
    ...rates.map(rate => ({ samples: SCALED_AND_TRAINING, heldOut: SCALED_AND_HELD_OUT, rate })),
    ...scaling.slice(6, 38).map(r => ({ samples: r.samples, heldOut: r.samples.slice(0, 1), rate: "0.333" })),
  ] };
  const fitted = featureScalingReference(payload.pipelines.map(p => ({ samples: p.samples })));
  const transformed = featureScalingReference(payload.pipelines.map((p, i) => ({ model: fitted[i].model, samples: p.heldOut })));
  const expected: ScalingReference = { scaling: featureScalingReference(scaling), fitted, transformed,
    pipelines: fractionalLearningReference(payload.pipelines.map((p, i) => ({
      operation: "train", samples: fitted[i].samples, epochs: 3, learningRate: p.rate, evaluation: transformed[i].samples,
    }))) };
  return { payload, expected };
}
