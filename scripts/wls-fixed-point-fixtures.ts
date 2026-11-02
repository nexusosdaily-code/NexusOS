// Audit/test dispatch only. No independent numerical implementation or application fallback.
import {
  compileFixedPointBinary, compileFixedPointDot, compileFixedPointScore, compileFixedPointSum,
  addFixedPoint, subtractFixedPoint, multiplyFixedPoint, divideFixedPoint,
  sumFixedPointVector, dotFixedPointVectors, scoreFixedPointVectors,
} from "../shared/wls-fixed-point";
import type { FixedPointFixture } from "./wls-fixed-point-reference";

export function compileFixedPointFixture(fixture: FixedPointFixture): string {
  switch (fixture.operation) {
    case "sum": return compileFixedPointSum(fixture.left);
    case "dot": return compileFixedPointDot(fixture.left, fixture.right);
    case "score": return compileFixedPointScore(fixture.left, fixture.right, fixture.bias);
    default: return compileFixedPointBinary(fixture.operation, fixture.left, fixture.right);
  }
}
export function executeFixedPointFixture(fixture: FixedPointFixture) {
  switch (fixture.operation) {
    case "sum": return sumFixedPointVector(fixture.left);
    case "dot": return dotFixedPointVectors(fixture.left, fixture.right);
    case "score": return scoreFixedPointVectors(fixture.left, fixture.right, fixture.bias);
    case "add": return addFixedPoint(fixture.left, fixture.right);
    case "subtract": return subtractFixedPoint(fixture.left, fixture.right);
    case "multiply": return multiplyFixedPoint(fixture.left, fixture.right);
    case "divide": return divideFixedPoint(fixture.left, fixture.right);
  }
}
