/** Audit-only exact rational reference. Never imported by application code.
 * Select the nearest integer by comparing distances to three candidates,
 * independently of the WLS quotient/remainder rounding algorithm. */
export function nearestRational(numerator: bigint, denominator: bigint): bigint {
  if (!denominator) throw new Error("zero reference denominator");
  const abs = (x: bigint) => x < 0n ? -x : x;
  const center = numerator / denominator;
  const candidates = [center - 1n, center, center + 1n];
  candidates.sort((a, b) => {
    const da = abs(a * denominator - numerator), db = abs(b * denominator - numerator);
    return da === db ? (abs(a) > abs(b) ? -1 : 1) : da < db ? -1 : 1;
  });
  return candidates[0];
}
export function scalarReference(operation: string, left: number, right: number): bigint {
  const a = BigInt(left), b = BigInt(right);
  if (operation === "add") return a + b;
  if (operation === "subtract") return a - b;
  if (operation === "multiply") return nearestRational(a * b, 1000n);
  if (operation === "divide") return nearestRational(a * 1000n, b);
  throw new Error("unsupported reference operation");
}
export function vectorReference(operation: string, left: readonly number[], right: readonly number[] = [], bias = 0): bigint {
  if (operation === "sum") return left.reduce((a, b) => a + BigInt(b), 0n);
  const dot = left.reduce((a, b, i) => a + BigInt(b) * BigInt(right[i]), 0n);
  return nearestRational(dot + (operation === "score" ? BigInt(bias) * 1000n : 0n), 1000n);
}
export const scalarFixtures = [-1_000_000, -999_999, -2001, -1501, -1000, -501, -500, -499, -1,
  0, 1, 499, 500, 501, 1000, 1501, 2001, 999_999, 1_000_000];
export function vectorFixtures() {
  const cases: { left: number[]; right: number[]; bias: number }[] = [];
  for (let n = 0; n <= 16; n++) {
    cases.push(
      { left: Array(n).fill(1_000_000), right: Array(n).fill(1_000_000), bias: 1_000_000 },
      { left: Array(n).fill(-1_000_000), right: Array(n).fill(1_000_000), bias: -1_000_000 },
      { left: Array.from({ length: n }, (_, i) => i % 2 ? -1_000_000 : 1_000_000),
        right: Array(n).fill(1_000_000), bias: 0 },
      { left: Array.from({ length: n }, (_, i) => scalarFixtures[(i * 7 + n) % scalarFixtures.length]),
        right: Array.from({ length: n }, (_, i) => scalarFixtures[(i * 3 + n) % scalarFixtures.length]), bias: n * 499 },
      { left: Array(n).fill(-1), right: Array(n).fill(500), bias: -1 },
    );
  }
  // Maximum prefix accumulation followed by complete cancellation.
  cases.push({ left: [...Array(8).fill(1_000_000), ...Array(8).fill(-1_000_000)],
    right: Array(16).fill(1_000_000), bias: 1 });
  return cases;
}
