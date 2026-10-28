/**
 * amendment-rate-limit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Per-user sliding-window rate limit for POST /api/constitution/amendments.
 *
 * Extracted into its own module so tests can exercise the real guard rather
 * than a mocked stand-in.
 *
 * Limit: AMENDMENT_MAX_PER_DAY submissions per user within a rolling
 * AMENDMENT_WINDOW_MS window.  State is in-process (a Map); a server restart
 * resets the counters.  Persistence across restarts is tracked separately.
 */

export const AMENDMENT_MAX_PER_DAY = 5;
export const AMENDMENT_WINDOW_MS   = 24 * 60 * 60 * 1000; // 24 hours

// userId → array of submission timestamps still inside the current window
const _amendmentTimestamps = new Map<string, number[]>();

/**
 * Returns `true` (and records the attempt) when the user is within their
 * quota, or `false` when the 24-hour window is already full.
 *
 * Pass a custom `now` value in tests to control the clock.
 */
export function checkAmendmentRateLimit(userId: string, now = Date.now()): boolean {
  const cutoff = now - AMENDMENT_WINDOW_MS;
  const times  = (_amendmentTimestamps.get(userId) ?? []).filter(t => t > cutoff);
  if (times.length >= AMENDMENT_MAX_PER_DAY) return false;
  times.push(now);
  _amendmentTimestamps.set(userId, times);
  return true;
}

/**
 * Reset the counter for a specific user.  Intended for tests only.
 */
export function _resetAmendmentRateLimit(userId?: string): void {
  if (userId === undefined) {
    _amendmentTimestamps.clear();
  } else {
    _amendmentTimestamps.delete(userId);
  }
}
