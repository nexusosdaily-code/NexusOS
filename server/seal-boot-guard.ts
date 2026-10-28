/**
 * seal-boot-guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Boot-sequence guard for sealConstitution().
 *
 * Extracted from server/index.ts so the behaviour can be unit-tested without
 * importing index.ts (which is an IIFE with heavy side-effects).
 *
 * Usage in server/index.ts:
 *
 *   import { bootState, handleSealError } from "./seal-boot-guard";
 *
 *   // health endpoint:
 *   app.get("/health", (_req, res) =>
 *     res.json({ status: "ok", ready: serverReady, degraded: bootState.degraded, ts: Date.now() })
 *   );
 *
 *   // boot chain:
 *   seedGenesisBlock()
 *     .then(() => sealConstitution())
 *     .then(...)
 *     .catch((e) => handleSealError(e));
 */

export interface BootState {
  /** true when sealConstitution() threw during the current process lifetime. */
  degraded: boolean;
  /** The error message that caused the degraded state, or null when healthy. */
  sealError: string | null;
}

/** Process-lifetime singleton shared between server/index.ts and the health endpoint. */
export const bootState: BootState = {
  degraded:  false,
  sealError: null,
};

/**
 * Called in the `.catch()` of the sealConstitution() boot chain.
 *
 * Responsibilities:
 *  1. Log a [FATAL]-prefixed message so the error is unmissable in server logs.
 *  2. Mark `state.degraded = true` so the /health endpoint can surface it and
 *     the founder / uptime monitor knows the server booted without a valid seal.
 *  3. Store the error message for inclusion in health-check responses.
 *
 * The server is NOT crashed — a degraded boot is preferable to a hard outage.
 * The constitution seal is idempotent; it will be retried on the next restart.
 *
 * @param err   The thrown value from sealConstitution().
 * @param state The boot-state object to mutate (defaults to the singleton).
 */
export function handleSealError(
  err: unknown,
  state: BootState = bootState,
): void {
  const msg = (err as any)?.message ?? String(err);

  console.error(
    `[FATAL] sealConstitution() FAILED — server is running DEGRADED.\n` +
    `  The constitution block was NOT written to the chain on this boot.\n` +
    `  The /api/constitution/seal endpoint will return 503 until fixed.\n` +
    `  Error: ${msg}`,
  );

  state.degraded  = true;
  state.sealError = msg;
}
