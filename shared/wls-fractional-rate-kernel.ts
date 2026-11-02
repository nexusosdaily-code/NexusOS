import { FRACTIONAL_LEARNING_KERNEL_SOURCE } from "./wls-fractional-learning-kernel";

// Reuse the exact retained margin/predict definitions; replace only its update.
// Canonical 0.2.0 bytes are checked independently against kernel.wls.
export const FRACTIONAL_RATE_KERNEL_SOURCE = FRACTIONAL_LEARNING_KERNEL_SOURCE.slice(
  0, FRACTIONAL_LEARNING_KERNEL_SOURCE.indexOf('@562.98nm FUNC {"line":7'),
) + `@562.98nm FUNC {"line":7,"args":["fractionalRateUpdate","weight","error","feature","rate"]}
@550.21nm LOAD {"line":8,"args":["weight"]}
@576.6nm CONST {"line":8,"args":[1000]}
@581.42nm MUL {"line":8,"args":[]}
@550.21nm LOAD {"line":8,"args":["rate"]}
@550.21nm LOAD {"line":8,"args":["error"]}
@581.42nm MUL {"line":8,"args":[]}
@550.21nm LOAD {"line":8,"args":["feature"]}
@581.42nm MUL {"line":8,"args":[]}
@528.94nm ADD {"line":8,"args":[]}
@576.6nm CONST {"line":8,"args":[1000]}
@545.96nm CALL {"line":8,"args":["fixedRound",2]}
@584.26nm RETURN {"line":8,"args":[]}
@576.6nm CONST {"line":7,"args":[null]}
@584.26nm RETURN {"line":7,"args":[]}
@548.79nm END {"line":7,"args":[]}
@559.79nm HALT {"line":9,"args":[]}
`;
