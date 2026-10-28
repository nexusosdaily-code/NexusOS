import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// This nested manifest is resolved independently by the dependency scanner.
// Patched root uv.lock entries cannot protect its transitive dependencies.
const requirements = readFileSync(
  new URL("../nexus_wallet_package/requirements.txt", import.meta.url),
  "utf8",
);
const lines = requirements
  .split(/\r?\n/)
  .map((line) => line.split("#")[0].trim())
  .filter(Boolean);

function compareVersions(left: string, right: string): number {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

describe("independently resolved wallet dependency security floors", () => {
  it.each([
    ["aiohttp", "3.14.4"],
    ["anyio", "4.14.2"],
    ["certifi", "2026.10.19"],
    ["h11", "0.16.0"],
    ["pillow", "13.0.0"],
    ["idna", "3.15"],
    ["pycryptodome", "3.19.1"],
  ])("requires patched %s in the nested manifest", (name, minimum) => {
    const entries = lines.filter(
      (line) => line.match(/^[a-z0-9_.-]+/i)?.[0].toLowerCase() === name,
    );
    expect(entries).toHaveLength(1);
    // Do not accept an optional marker, extra, or alternative that can allow
    // the independently resolved scanner inventory to omit the security floor.
    const match = entries[0].match(/^[a-z0-9_.-]+\s*>=\s*(\d+(?:\.\d+)*)$/i);
    expect(match, `Expected an unconditional minimum for ${name}`).not.toBeNull();
    expect(compareVersions(match![1], minimum)).toBeGreaterThanOrEqual(0);
  });
});
