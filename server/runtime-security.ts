/**
 * October 21, 2026 Node security baseline:
 * https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
 * These minimums are a known-advisory baseline, not a future security guarantee.
 * Keep supported release lines explicit; unreviewed majors fail closed.
 */
const patchedMinors: Record<number, [number, number]> = {
  22: [23, 4],
  24: [22, 1],
  26: [12, 1],
};

export function assertPatchedNodeRuntime(version: string): void {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  const [major, minor, patch] = match ? match.slice(1).map(Number) : [];
  const minimum = patchedMinors[major];
  if (!minimum || minor < minimum[0] || (minor === minimum[0] && patch < minimum[1])) {
    throw new Error(
      `Unapproved Node.js runtime ${version}; use the patched project runtime via npm run dev/start.`,
    );
  }
}
