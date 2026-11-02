import { execFileSync } from "node:child_process";

export type FixedPointFixture =
  | { operation: "add" | "subtract" | "multiply" | "divide"; left: string; right: string }
  | { operation: "sum"; left: string[] }
  | { operation: "dot"; left: string[]; right: string[] }
  | { operation: "score"; left: string[]; right: string[]; bias: string };
export type FixedPointReference =
  | { status: "ok"; units: number; value: string }
  | { status: "overflow" | "division-by-zero" };

/** Audit-only oracle: Fraction arithmetic and divmod, independent of the WLS formula. */
export function fixedPointReference(fixtures: readonly FixedPointFixture[]): FixedPointReference[] {
  const source = `
import json, sys
from fractions import Fraction
results = []
for case in json.load(sys.stdin):
    try:
        op = case["operation"]
        if op in ("add", "subtract", "multiply", "divide"):
            a, b = Fraction(case["left"]), Fraction(case["right"])
            if op == "add": exact = a + b
            elif op == "subtract": exact = a - b
            elif op == "multiply": exact = a * b
            else: exact = a / b
        elif op == "sum":
            exact = sum((Fraction(v) for v in case["left"]), Fraction(0))
        else:
            assert len(case["left"]) == len(case["right"])
            exact = sum((Fraction(a)*Fraction(b) for a,b in zip(case["left"], case["right"])), Fraction(0))
            if op == "score": exact += Fraction(case["bias"])
        scaled = exact * 1000
        units, remainder = divmod(abs(scaled.numerator), scaled.denominator)
        if 2 * remainder >= scaled.denominator: units += 1
        if scaled < 0: units = -units
        if abs(units) > 1000000:
            results.append(dict(status="overflow"))
        else:
            sign = "-" if units < 0 else ""
            value = f"{sign}{abs(units)//1000}.{abs(units)%1000:03d}"
            results.append(dict(status="ok", units=units, value=value))
    except ZeroDivisionError:
        results.append(dict(status="division-by-zero"))
print(json.dumps(results))
`;
  return JSON.parse(execFileSync("python3", ["-I", "-c", source], {
    input: JSON.stringify(fixtures), encoding: "utf8", timeout: 3000, maxBuffer: 262_144,
    env: { PATH: process.env.PATH ?? "" },
  })) as FixedPointReference[];
}

export function fixedPointFixtures(): FixedPointFixture[] {
  const cases: FixedPointFixture[] = [];
  const values = ["-1000", "-2", "-0.500", "-0.001", "0", "0.001", "0.500", "2", "1000"];
  for (const left of values) for (const right of values) {
    for (const operation of ["add", "subtract", "multiply", "divide"] as const) {
      cases.push({ operation, left, right });
    }
  }
  for (const [left, right] of [
    ["1", "3"], ["-1", "3"], ["1", "-3"], ["-1", "-3"], ["2", "3"],
    ["0.001", "1.999"], ["0.001", "2.001"], ["-0.001", "1.999"],
    ["-0.001", "2.001"], ["1.001", "2"], ["-1.001", "2"],
    ["999.999", "1"], ["-999.999", "1"],
  ]) cases.push({ operation: "divide", left, right });
  for (const left of ["0.001", "-0.001"]) for (const right of ["0.499", "0.500", "0.501"]) {
    cases.push({ operation: "multiply", left, right });
  }
  for (let length = 0; length <= 16; length++) {
    const left = Array.from({ length }, (_, i) => i % 2 ? "-0.125" : "1.250");
    const right = Array.from({ length }, (_, i) => i % 3 ? "0.500" : "-2.001");
    cases.push({ operation: "sum", left });
    cases.push({ operation: "dot", left, right });
    cases.push({ operation: "score", left, right, bias: "-0.251" });
  }
  const all = (value: string) => Array(16).fill(value) as string[];
  const cancelling = [...Array(8).fill("1000"), ...Array(8).fill("-1000")] as string[];
  cases.push(
    { operation: "sum", left: all("1000") }, { operation: "sum", left: all("-1000") },
    { operation: "sum", left: cancelling },
    { operation: "dot", left: cancelling, right: all("1000") },
    { operation: "dot", left: all("1000"), right: all("1000") },
    { operation: "dot", left: all("-1000"), right: all("1000") },
    { operation: "score", left: all("1000"), right: all("1000"), bias: "1000" },
    { operation: "score", left: all("-1000"), right: all("1000"), bias: "-1000" },
    { operation: "dot", left: ["0.001", "0.001"], right: ["0.500", "0.500"] },
    { operation: "dot", left: ["0.001", "0.001"], right: ["0.400", "0.400"] },
    { operation: "dot", left: ["0.001", "-0.001"], right: ["0.500", "0.500"] },
    { operation: "dot", left: ["1000", "0.001"], right: ["1", "0.499"] },
    { operation: "dot", left: ["1000", "0.001"], right: ["1", "0.500"] },
    { operation: "dot", left: ["-1000", "-0.001"], right: ["1", "0.500"] },
    { operation: "score", left: ["0.001"], right: ["0.500"], bias: "-0.001" },
    { operation: "score", left: ["-0.001"], right: ["0.500"], bias: "0.001" },
    { operation: "score", left: [], right: [], bias: "-0.125" },
    { operation: "divide", left: "-0.000", right: "-1.500" },
    { operation: "dot", left: ["1.25"], right: ["2.5"] },
  );
  return cases;
}
