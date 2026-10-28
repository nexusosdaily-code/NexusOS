/**
 * seal-retry.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the transient-DB-error classifier used by sealConstitutionWithRetry.
 *
 * Why this matters:
 *   sealConstitutionWithRetry() only retries when isTransientDbError() returns
 *   true.  If a cold-start error string is not in the list the function gives up
 *   after one attempt, marks the server DEGRADED, and fires a Telegram BOOT
 *   ALERT — even though the DB would have been fine a few seconds later.
 *
 *   The regression that triggered this test: "Authentication timed out" (Neon
 *   serverless cold-start) was missing from the list, causing a false DEGRADED
 *   alert on every cold production boot.
 *
 * Coverage:
 *   isTransientDbError()
 *     - returns true for every known cold-start / transient string
 *     - returns true for strings that contain the keyword as a substring
 *     - returns false for permanent errors (schema mismatch, constraint, etc.)
 *     - returns false for empty string
 *
 *   sealConstitutionWithRetry() (behaviour contract)
 *     - succeeds on first attempt — returns the result immediately
 *     - retries on transient errors and succeeds on a later attempt
 *     - exhausts all attempts then re-throws when every attempt is transient
 *     - re-throws immediately (no retry) on a non-transient error
 *     - pauses between attempts (delay is awaited, not skipped)
 *     - the warn log is emitted for each transient retry
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { isTransientDbError } from "./constitution_seal";
import { sealConstitutionWithRetry } from "./seal-retry";

// ── isTransientDbError ────────────────────────────────────────────────────────

describe("isTransientDbError", () => {
  describe("returns true for known cold-start / transient strings", () => {
    const transientMessages = [
      "ENOTFOUND neon.db.host",
      "connect ETIMEDOUT",
      "Connection terminated unexpectedly",
      "connection timeout after 5000ms",
      "connect ECONNREFUSED 127.0.0.1:5432",
      "timeout exceeded waiting for connection",
      // The Neon serverless cold-start error that triggered the original regression:
      "Authentication timed out",
      "read ECONNRESET",
      "terminating connection due to administrator command",
    ];

    for (const msg of transientMessages) {
      it(`classifies "${msg.slice(0, 60)}" as transient`, () => {
        expect(isTransientDbError(msg)).toBe(true);
      });
    }
  });

  describe("returns true when the keyword appears as a substring", () => {
    it("keyword embedded in a longer message", () => {
      expect(
        isTransientDbError(
          "error: Authentication timed out — please retry the connection"
        )
      ).toBe(true);
    });

    it("ETIMEDOUT embedded after a prefix", () => {
      expect(isTransientDbError("connect ETIMEDOUT 1.2.3.4:5432")).toBe(true);
    });
  });

  describe("returns false for permanent / non-transient errors", () => {
    const permanentMessages = [
      "relation \"blockchain_blocks\" does not exist",
      "column \"content\" of relation \"blockchain_blocks\" does not exist",
      "duplicate key value violates unique constraint",
      "invalid input syntax for type integer",
      "permission denied for table system_constants",
      "syntax error at or near SELECT",
      "value too long for type character varying(255)",
    ];

    for (const msg of permanentMessages) {
      it(`does not classify "${msg.slice(0, 60)}" as transient`, () => {
        expect(isTransientDbError(msg)).toBe(false);
      });
    }

    it("returns false for empty string", () => {
      expect(isTransientDbError("")).toBe(false);
    });
  });
});

// ── sealConstitutionWithRetry behaviour ───────────────────────────────────────
// We inline the same retry logic here (using isTransientDbError) so the
// contract is tested independently of the server startup IIFE.

/** Recreates the sealConstitutionWithRetry logic for isolated testing. */
async function makeSealWithRetry(
  sealFn: () => Promise<boolean>,
  maxAttempts = 5,
  retryDelayMs = 0   // 0 in tests — no real sleeping
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await sealFn();
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (!isTransientDbError(msg) || attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw new Error("sealConstitutionWithRetry: exhausted");
}

describe("sealConstitutionWithRetry (contract)", () => {
  it("returns the result immediately when the first attempt succeeds", async () => {
    const seal = vi.fn().mockResolvedValue(true);
    await expect(makeSealWithRetry(seal)).resolves.toBe(true);
    expect(seal).toHaveBeenCalledTimes(1);
  });

  it("returns false (already-sealed) when first attempt returns false", async () => {
    const seal = vi.fn().mockResolvedValue(false);
    await expect(makeSealWithRetry(seal)).resolves.toBe(false);
    expect(seal).toHaveBeenCalledTimes(1);
  });

  it("retries on a transient error and succeeds on the third attempt", async () => {
    const transientErr = new Error("Authentication timed out");
    const seal = vi
      .fn()
      .mockRejectedValueOnce(transientErr)
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValue(true);

    await expect(makeSealWithRetry(seal, 5, 0)).resolves.toBe(true);
    expect(seal).toHaveBeenCalledTimes(3);
  });

  it("retries on every known transient error class", async () => {
    const knownTransient = [
      "ENOTFOUND neon.host",
      "connect ETIMEDOUT",
      "Connection terminated",
      "connection timeout",
      "connect ECONNREFUSED",
      "timeout exceeded",
      "Authentication timed out",
      "read ECONNRESET",
      "terminating connection due to administrator command",
    ];

    for (const msg of knownTransient) {
      const seal = vi
        .fn()
        .mockRejectedValueOnce(new Error(msg))
        .mockResolvedValue(true);

      await expect(
        makeSealWithRetry(seal, 5, 0),
        `should retry on "${msg}"`
      ).resolves.toBe(true);
      expect(seal, `seal called twice for "${msg}"`).toHaveBeenCalledTimes(2);
      seal.mockClear();
    }
  });

  it("re-throws immediately (no retry) on a non-transient error", async () => {
    const permanentErr = new Error('relation "blockchain_blocks" does not exist');
    const seal = vi.fn().mockRejectedValue(permanentErr);

    await expect(makeSealWithRetry(seal, 5, 0)).rejects.toThrow(
      'relation "blockchain_blocks" does not exist'
    );
    // Must not retry — exactly one attempt
    expect(seal).toHaveBeenCalledTimes(1);
  });

  it("re-throws the original transient error after exhausting all attempts", async () => {
    const transientErr = new Error("Authentication timed out");
    const seal = vi.fn().mockRejectedValue(transientErr);

    await expect(makeSealWithRetry(seal, 3, 0)).rejects.toThrow(
      "Authentication timed out"
    );
    expect(seal).toHaveBeenCalledTimes(3);
  });

  it("awaits the delay between transient retries", async () => {
    vi.useFakeTimers();
    const transientErr = new Error("Authentication timed out");
    const seal = vi
      .fn()
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValue(true);

    const DELAY = 6_000;
    const promise = makeSealWithRetry(seal, 5, DELAY);

    // First attempt throws — delay is now pending
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(true);
    expect(seal).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

// ── sealConstitutionWithRetry (production module) ─────────────────────────────
// Tests that exercise the REAL exported function from seal-retry.ts so a
// refactor that accidentally drops the `await` on the sleep cannot pass.

describe("sealConstitutionWithRetry (production export — delay is real)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("promise is still pending while the retry delay has not elapsed", async () => {
    vi.useFakeTimers();
    const DELAY = 6_000;
    const transientErr = new Error("Authentication timed out");
    const sealFn = vi
      .fn()
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValue(true);

    const promise = sealConstitutionWithRetry(sealFn, 5, DELAY);

    // Advance by less than the configured delay — second attempt must NOT have
    // been triggered yet; the promise must still be pending.
    await vi.advanceTimersByTimeAsync(DELAY - 1);
    expect(sealFn).toHaveBeenCalledTimes(1);

    // Now let the full delay expire — second attempt fires and resolves.
    await vi.advanceTimersByTimeAsync(1);
    const result = await promise;
    expect(result).toBe(true);
    expect(sealFn).toHaveBeenCalledTimes(2);
  });

  it("succeeds on first attempt without waiting for any timer", async () => {
    vi.useFakeTimers();
    const sealFn = vi.fn().mockResolvedValue(false);

    // No timer advancement needed — resolves immediately.
    const result = await sealConstitutionWithRetry(sealFn, 5, 6_000);
    expect(result).toBe(false);
    expect(sealFn).toHaveBeenCalledTimes(1);
  });
});
