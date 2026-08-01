/**
 * amendment-rate-limit.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the per-user sliding-window rate limiter in
 * server/amendment-rate-limit.ts.
 *
 * All tests use the optional `now` parameter to control the clock, so no
 * real timers are needed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import {
  checkAmendmentRateLimit,
  _resetAmendmentRateLimit,
  AMENDMENT_MAX_PER_DAY,
  AMENDMENT_WINDOW_MS,
} from "./amendment-rate-limit";

const USER_A = "user-a";
const USER_B = "user-b";
const NOW     = 1_000_000_000_000; // fixed epoch reference

beforeEach(() => {
  _resetAmendmentRateLimit(); // clear all state between tests
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. Within-quota behaviour
// ═══════════════════════════════════════════════════════════════════════════

describe("checkAmendmentRateLimit — within quota", () => {
  it("returns true for each of the first AMENDMENT_MAX_PER_DAY calls", () => {
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      expect(checkAmendmentRateLimit(USER_A, NOW + i)).toBe(true);
    }
  });

  it("returns false on the call that exceeds the quota", () => {
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(USER_A, NOW + i);
    }
    expect(checkAmendmentRateLimit(USER_A, NOW + AMENDMENT_MAX_PER_DAY)).toBe(false);
  });

  it("does not count a timestamp that has fallen outside the window", () => {
    // Record AMENDMENT_MAX_PER_DAY attempts just inside the window boundary
    const oldTime = NOW - AMENDMENT_WINDOW_MS - 1; // strictly outside
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(USER_A, oldTime);
    }
    // All old entries are now expired; a fresh call at NOW must succeed
    expect(checkAmendmentRateLimit(USER_A, NOW)).toBe(true);
  });

  it("treats a timestamp exactly equal to now - AMENDMENT_WINDOW_MS as expired (boundary is strict)", () => {
    // A timestamp at exactly the cutoff (t === now - AMENDMENT_WINDOW_MS) must
    // NOT be counted — the filter uses t > cutoff (strict greater-than).
    const exactCutoff = NOW - AMENDMENT_WINDOW_MS;
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(USER_A, exactCutoff);
    }
    // All entries sit exactly on the cutoff and are therefore expired;
    // a fresh call at NOW must succeed.
    expect(checkAmendmentRateLimit(USER_A, NOW)).toBe(true);
  });

  it("still counts a timestamp one millisecond inside the window (cutoff + 1)", () => {
    // A timestamp at now - AMENDMENT_WINDOW_MS + 1 is one ms inside the
    // window and must be counted toward the quota.
    const justInside = NOW - AMENDMENT_WINDOW_MS + 1;
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(USER_A, justInside);
    }
    // The quota is now full; a fresh call at NOW must be rejected.
    expect(checkAmendmentRateLimit(USER_A, NOW)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Per-user isolation
// ═══════════════════════════════════════════════════════════════════════════

describe("checkAmendmentRateLimit — per-user isolation", () => {
  it("exhausting one user's quota does not affect another user", () => {
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(USER_A, NOW + i);
    }
    expect(checkAmendmentRateLimit(USER_B, NOW)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Reset helpers
// ═══════════════════════════════════════════════════════════════════════════

describe("_resetAmendmentRateLimit", () => {
  it("resets only the specified user, leaving other users unaffected", () => {
    // Exhaust both users
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(USER_A, NOW + i);
      checkAmendmentRateLimit(USER_B, NOW + i);
    }

    // Reset only USER_A
    _resetAmendmentRateLimit(USER_A);

    expect(checkAmendmentRateLimit(USER_A, NOW)).toBe(true);  // reset → allowed
    expect(checkAmendmentRateLimit(USER_B, NOW)).toBe(false); // untouched → still blocked
  });

  it("resets all users when called with no argument", () => {
    for (let i = 0; i < AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(USER_A, NOW + i);
      checkAmendmentRateLimit(USER_B, NOW + i);
    }

    _resetAmendmentRateLimit(); // no argument → clear all

    expect(checkAmendmentRateLimit(USER_A, NOW)).toBe(true);
    expect(checkAmendmentRateLimit(USER_B, NOW)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Coverage guard — test count floor
//
// Reads this file's own source and counts it() blocks so that accidentally
// deleting a describe block or a test causes an immediate, explicit failure
// rather than a silent pass with reduced coverage.
// ═══════════════════════════════════════════════════════════════════════════

describe("amendment-rate-limit.test.ts — coverage guard", () => {
  it("contains at least 6 it() blocks (prevents silent coverage drop)", () => {
    // import.meta.url points to the TypeScript source in Vitest's ESM runtime
    const filePath = new URL(import.meta.url).pathname;
    const src = readFileSync(filePath, "utf8");
    // Count lines that open an it() call.
    // The regex matches this guard's own it() too, so the floor is 9
    // (8 substantive tests + 1 guard) — removing any real test drops the
    // count to 8 and triggers a failure.
    const itCalls = (src.match(/^\s+it\(/gm) ?? []).length;
    expect(itCalls).toBeGreaterThanOrEqual(9);
  });
});
