import { execFileSync } from "node:child_process";

export interface NumericVectorFixture { left: number[]; right: number[]; bias: number }
/** Audit-only independent integer oracle. JSON data cannot become Python source. */
export function numericVectorReference(fixtures: readonly NumericVectorFixture[]) {
  const source = `
import json, sys
cases = json.load(sys.stdin)
results = []
for case in cases:
    left, right, bias = case["left"], case["right"], case["bias"]
    assert len(left) == len(right)
    dot = sum(a * b for a, b in zip(left, right))
    results.append(dict(total=sum(left), dot=dot, score=dot+bias))
print(json.dumps(results))
`;
  return JSON.parse(execFileSync("python3", ["-I", "-c", source], {
    input: JSON.stringify(fixtures), encoding: "utf8", timeout: 3000,
    maxBuffer: 65_536, env: { PATH: process.env.PATH ?? "" },
  })) as { total: number; dot: number; score: number }[];
}

export function numericVectorFixtures(): NumericVectorFixture[] {
  let state = 1729;
  const value = () => {
    state = (state * 48271) % 2147483647;
    return state % 2_000_001 - 1_000_000;
  };
  const cases: NumericVectorFixture[] = [
    { left: [], right: [], bias: 7 },
    { left: [1, -2, 3], right: [4, 5, -6], bias: -2 },
    { left: Array(16).fill(1_000_000), right: Array(16).fill(1_000_000), bias: 1_000_000 },
    { left: Array(16).fill(-1_000_000), right: Array(16).fill(1_000_000), bias: -1_000_000 },
    { left: Array.from({ length: 16 }, (_, i) => i % 2 ? -1_000_000 : 1_000_000),
      right: Array(16).fill(1_000_000), bias: 0 },
  ];
  for (let n = 0; n < 68; n++) {
    const length = n % 17;
    cases.push({ left: Array.from({ length }, value), right: Array.from({ length }, value), bias: value() });
  }
  return cases;
}
