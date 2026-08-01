/**
 * seal-retry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Retry wrapper for sealConstitution() that handles transient DB connectivity
 * errors common on cold-start production boots (Neon serverless wake-up, DNS
 * not yet ready, pool initialisation race).
 *
 * Extracted from server/index.ts so it can be unit-tested independently of
 * the full express boot sequence.
 *
 * The authoritative transient-error classifier is isTransientDbError() in
 * constitution_seal.ts — imported here to avoid duplicating the list.
 */

import { sealConstitution, isTransientDbError } from "./constitution_seal";

/** Re-export so tests can import from one place. */
export { isTransientDbError as isTransientSealError } from "./constitution_seal";

/** All substrings that identify a transient / retry-able DB error (for test enumeration). */
export const TRANSIENT_ERROR_SUBSTRINGS: readonly string[] = [
  "ENOTFOUND",
  "ETIMEDOUT",
  "Connection terminated",
  "connection timeout",
  "connect ECONNREFUSED",
  "timeout exceeded",
  "Authentication timed out",
  "read ECONNRESET",
  "terminating connection due to administrator command",
] as const;

/**
 * Calls sealConstitution() with automatic retries for transient DB errors.
 *
 * @param sealFn       - The seal function to call (injectable for tests; defaults to sealConstitution)
 * @param maxAttempts  - Maximum number of attempts before giving up (default 5)
 * @param retryDelayMs - Milliseconds to wait between attempts (default 6 000)
 * @returns            - true if freshly sealed, false if already sealed
 * @throws             - Non-transient errors on first occurrence; transient errors after maxAttempts
 */
export async function sealConstitutionWithRetry(
  sealFn: () => Promise<boolean> = sealConstitution,
  maxAttempts = 5,
  retryDelayMs = 6_000,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await sealFn();
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      const transient = isTransientDbError(msg);
      if (!transient || attempt === maxAttempts) throw err;
      console.warn(
        `[CONSTITUTION] Seal attempt ${attempt}/${maxAttempts} failed (transient): ${msg.slice(0, 120)} — retrying in ${retryDelayMs / 1000}s`,
      );
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  // unreachable — loop always throws or returns
  throw new Error("sealConstitutionWithRetry: exhausted");
}
