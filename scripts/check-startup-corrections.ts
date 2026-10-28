import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Inspect the actual npm-start artifact, not merely TypeScript source.
 * esbuild defines NODE_ENV=production and eliminates the development migration
 * body. Its presence means a stale or incorrectly configured bundle shipped.
 */
export function checkStartupCorrections(bundle: string): void {
  const forbidden = [
    /UPDATE\s+lightning_wallets\s+SET\s+sats_balance\s*=\s*961\b/i,
    /da62b876-4f10-4fbb-a979-f23b3032cc80/i,
    /UncJuddy sats restored/i,
    /v_restore\s*:=\s*v_expected\s*-\s*v_current/i,
    /Startup schema migrations complete/i,
    /sats_stakes\.amount_sats upgraded to bigint/i,
    /lightning_transactions\.amount_sats upgraded to bigint/i,
    /UPDATE\s+users\s+SET\s+withdrawals_blocked\s*=\s*false/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(bundle)) {
      throw new Error(`Unsafe production startup artifact matches ${pattern}; rebuild from the corrected source`);
    }
  }
}

export function checkProductionStartupArtifact(path = "dist/index.cjs"): void {
  checkStartupCorrections(readFileSync(path, "utf8"));
  console.log(`PASS: ${path} contains no historical balance repairs or development startup migrations`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  checkProductionStartupArtifact();
}