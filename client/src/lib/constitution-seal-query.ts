/**
 * constitution-seal-query.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared query helpers for the Constitution page's On-Chain Seal section.
 *
 * Extracted from client/src/pages/constitution.tsx so they can be unit-tested
 * without importing the full React component tree.
 *
 * Consumed by:
 *   • client/src/pages/constitution.tsx  — SealSection useQuery config
 *   • scripts/constitution-seal-503.test.ts — unit tests (logic layer)
 *   • client/src/__tests__/SealSection-503.test.tsx — component tests (DOM layer)
 */

// ── Public types ──────────────────────────────────────────────────────────────

export interface SealAmendment {
  blockNumber: number;
  title: string;
  authoredBand: string;
  timestamp: string;
  body?: string;
}

export interface SealData {
  blockNumber: number;
  psiChannel: string;
  wavelengthNm: number;
  hash: string;
  timestamp: string;
  frequencyHz: number;
  energyJoules: number;
  band: string;
  declaration: string;
  amendments?: SealAmendment[];
}

export interface SealFetchError extends Error {
  status?: number;
  serverMessage?: string;
}

// ── fetchSeal ─────────────────────────────────────────────────────────────────

/**
 * Fetches the constitution seal from the server.
 *
 * - 200 OK  → returns the SealData JSON
 * - 503     → throws SealFetchError with status=503 (seal failed on boot)
 * - other   → returns null (seal not yet written; caller should poll)
 */
export async function fetchSeal(): Promise<SealData | null> {
  const res = await fetch("/api/constitution/seal", { credentials: "include" });
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    const err: SealFetchError = new Error(
      body.message || "Seal failed on last boot — contact the founder",
    );
    err.status = 503;
    err.serverMessage = body.message;
    throw err;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

// ── useQuery options ──────────────────────────────────────────────────────────

/**
 * useQuery `retry` option.
 *
 * Never retry a 503 — the server will not recover on its own and repeated
 * requests would just flood the logs.  Transient network errors are retried
 * up to 3 times.
 */
export function sealRetryFn(failureCount: number, err: unknown): boolean {
  if ((err as SealFetchError)?.status === 503) return false;
  return failureCount < 3;
}

/**
 * useQuery `refetchInterval` option.
 *
 * Poll every 5 s only while the seal is pending (data === null, no error).
 * Stop immediately once the seal loads or an error is recorded.
 */
export function sealRefetchIntervalFn(query: {
  state: { data: SealData | null | undefined; error: unknown };
}): number | false {
  return query.state.data === null && !query.state.error ? 5_000 : false;
}
