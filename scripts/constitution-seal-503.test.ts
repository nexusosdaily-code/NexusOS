/**
 * constitution-seal-503.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the constitution seal query helpers in
 * client/src/lib/constitution-seal-query.ts.
 *
 * These test the REAL production functions — not duplicated copies — so any
 * change to fetchSeal, sealRetryFn, or sealRefetchIntervalFn will be caught
 * by this suite immediately.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Scenarios:
 *   fetchSeal()
 *     1. 503 JSON body → throws SealFetchError with status=503 + serverMessage
 *     2. 503 non-JSON body → throws with status=503, serverMessage undefined
 *     3. fetch called exactly ONCE for a 503 (fetchSeal itself never retries)
 *     4. Non-503 non-ok response → returns null
 *     5. 200 OK → returns parsed JSON
 *
 *   sealRetryFn()
 *     6. failureCount=0, status=503 → false (never retry a seal API 503)
 *     7. failureCount=2, status=503 → false (still never)
 *     8. failureCount=0, generic error → true  (retry transient errors)
 *     9. failureCount=2, generic error → true  (up to 3 attempts)
 *    10. failureCount=3, generic error → false (stop after 3 generic failures)
 *
 *   sealRefetchIntervalFn()
 *    11. data=null, error=null  → 5000 (poll while seal is pending)
 *    12. data=null, error set   → false (stop polling once 503 received)
 *    13. data=<SealData>        → false (stop polling once seal loaded)
 *    14. data=undefined         → false (initial undefined, no poll yet)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchSeal,
  sealRetryFn,
  sealRefetchIntervalFn,
  type SealData,
  type SealFetchError,
} from "../client/src/lib/constitution-seal-query";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFetchResponse(
  status: number,
  body: unknown,
  isJson = true,
): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: isJson
      ? () => Promise.resolve(body)
      : () => Promise.reject(new SyntaxError("not json")),
    text: () => Promise.resolve(isJson ? JSON.stringify(body) : String(body)),
  } as unknown as Response;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

// ═════════════════════════════════════════════════════════════════════════════
// fetchSeal()
// ═════════════════════════════════════════════════════════════════════════════

describe("fetchSeal() — 503 response", () => {
  it(
    "throws a SealFetchError with status=503 when the API returns 503 with JSON body",
    async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse(503, { message: "CONSTITUTION_PSI mismatch on boot" }),
      );

      const err = await fetchSeal().catch((e: SealFetchError) => e);

      expect(err).toBeInstanceOf(Error);
      expect((err as SealFetchError).status).toBe(503);
    },
  );

  it(
    "carries the server message in serverMessage when the API provides it",
    async () => {
      const serverMsg = "CONSTITUTION_PSI mismatch on boot";
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse(503, { message: serverMsg }),
      );

      const err = await fetchSeal().catch((e: SealFetchError) => e);

      expect((err as SealFetchError).serverMessage).toBe(serverMsg);
    },
  );

  it(
    "still throws with status=503 when the 503 body is not valid JSON",
    async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse(503, "Service Unavailable", false),
      );

      const err = await fetchSeal().catch((e: SealFetchError) => e);

      expect(err).toBeInstanceOf(Error);
      expect((err as SealFetchError).status).toBe(503);
    },
  );

  it(
    "calls fetch exactly once — fetchSeal itself never retries a 503",
    async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse(503, { message: "seal down" }),
      );

      await fetchSeal().catch(() => {});

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    },
  );
});

describe("fetchSeal() — non-503 responses", () => {
  it(
    "returns null for a non-ok, non-503 response",
    async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeFetchResponse(404, { error: "not found" }),
      );

      const result = await fetchSeal();

      expect(result).toBeNull();
    },
  );

  it(
    "returns the parsed JSON payload on a 200 OK response",
    async () => {
      const payload: Partial<SealData> = {
        blockNumber: 1,
        psiChannel: "Ψ(52,20,H)",
        wavelengthNm: 542.5,
        hash: "a".repeat(64),
        band: "SYSTEM",
      };
      vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, payload));

      const result = await fetchSeal();

      expect(result).toEqual(payload);
    },
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// sealRetryFn()
// ═════════════════════════════════════════════════════════════════════════════

describe("sealRetryFn() — 503 errors are never retried", () => {
  it("returns false on the first failure when status is 503", () => {
    const err: SealFetchError = Object.assign(new Error("seal down"), { status: 503 });
    expect(sealRetryFn(0, err)).toBe(false);
  });

  it("returns false on subsequent failures when status is 503", () => {
    const err: SealFetchError = Object.assign(new Error("seal down"), { status: 503 });
    expect(sealRetryFn(2, err)).toBe(false);
  });

  it("returns true for a generic error on the first attempt (failureCount=0)", () => {
    expect(sealRetryFn(0, new Error("network timeout"))).toBe(true);
  });

  it("returns true for a generic error on the third attempt (failureCount=2)", () => {
    expect(sealRetryFn(2, new Error("network timeout"))).toBe(true);
  });

  it("returns false for a generic error after the third attempt (failureCount=3)", () => {
    expect(sealRetryFn(3, new Error("network timeout"))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// sealRefetchIntervalFn() — confirms polling stops after a 503
// ═════════════════════════════════════════════════════════════════════════════

describe("sealRefetchIntervalFn() — polling behaviour", () => {
  it("returns 5000 when data is null and there is no error (seal pending, keep polling)", () => {
    expect(sealRefetchIntervalFn({ state: { data: null, error: null } })).toBe(5_000);
  });

  it("returns false when there is a 503 error — polling stops immediately", () => {
    const err: SealFetchError = Object.assign(new Error("seal down"), { status: 503 });
    expect(sealRefetchIntervalFn({ state: { data: null, error: err } })).toBe(false);
  });

  it("returns false when a SealData payload is loaded — no need to poll any further", () => {
    const sealData = { blockNumber: 1, band: "SYSTEM" } as SealData;
    expect(sealRefetchIntervalFn({ state: { data: sealData, error: null } })).toBe(false);
  });

  it("returns false when data is undefined (initial render before first fetch)", () => {
    expect(sealRefetchIntervalFn({ state: { data: undefined, error: null } })).toBe(false);
  });
});
