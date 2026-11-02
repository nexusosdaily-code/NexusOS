import { collectFixedPointEvidence } from "../../../scripts/wls-fixed-point-browser-evidence";
import { attemptNetwork } from "./network-controls";

Object.assign(globalThis, { fixedPointFixture: { run: collectFixedPointEvidence, attemptNetwork } });
