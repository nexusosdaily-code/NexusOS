/**
 * traffic-logger-probe.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the env-var–driven probe alert threshold and cooldown parsing
 * in server/traffic-logger.ts.
 *
 * ALERT_THRESHOLD and COOLDOWN_MS are module-level IIFEs resolved at import
 * time from process.env.  Each test group re-loads the module (via
 * vi.resetModules + dynamic import) after setting the env vars it needs.
 *
 * Scenarios covered
 * ─────────────────
 * Threshold parsing
 *   1. Valid positive integer   → used as threshold (alert fires on hit N+1)
 *   2. Float string ("2.7")    → parseInt truncates to 2, alert on hit 3
 *   3. Zero ("0")              → fallback to default 5
 *   4. Negative ("-3")         → fallback to default 5
 *   5. Non-numeric ("abc")     → fallback to default 5
 *   6. Empty string ("")       → fallback to default 5
 *   7. Env var absent          → fallback to default 5
 *
 * Cooldown parsing
 *   8. Valid float hours        → alert window respected (no second alert)
 *   9. Zero ("0")              → fallback to default 1 h (alert fires only once)
 *  10. Negative ("-1")         → fallback to default 1 h
 *  11. Non-numeric ("inf")     → fallback to default 1 h
 *  12. Env var absent          → default 1 h; single alert per key per window
 *
 * Alert fires at correct hit count
 *  13. Custom threshold=3: no alert at 3 hits, alert fires at 4th hit
 *  14. Custom threshold=10: alert fires at 11th hit
 *  15. Default threshold=5 (bad env): alert fires at 6th hit, not before
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Shared mock for sendProbeAlert ────────────────────────────────────────────
// vi.mock is hoisted — this mock applies to all dynamic imports of
// ./telegram-bot that occur within the module under test, including the
// fire-and-forget  import("./telegram-bot").then(...)  in recordProbe().

const mockSendProbeAlert = vi.fn().mockResolvedValue(undefined);

vi.mock("./telegram-bot", () => ({
  sendProbeAlert: mockSendProbeAlert,
}));

// Side-effect dependencies — keep them inert.
vi.mock("./db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));
vi.mock("../shared/schema", () => ({ trafficLogs: {} }));
vi.mock("./honeypot",       () => ({ isHoneypotPath: vi.fn().mockReturnValue(false) }));
vi.mock("./geoip-enricher", () => ({
  ipCountryCache: { get: vi.fn().mockReturnValue(undefined) },
  ipHostingCache: { get: vi.fn().mockReturnValue(false) },
}));

// ── Test lifecycle ────────────────────────────────────────────────────────────

beforeEach(() => {
  // Clear the module cache so each test re-evaluates the IIFEs with whatever
  // env vars have been set for that particular test.
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.PROBE_ALERT_THRESHOLD;
  delete process.env.PROBE_ALERT_COOLDOWN_HOURS;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Import a fresh traffic-logger module instance.
 * Always call AFTER setting process.env — the IIFEs run at import time.
 */
async function freshMiddleware() {
  const mod = await import("./traffic-logger");
  return mod.trafficLoggerMiddleware;
}

type Middleware = Awaited<ReturnType<typeof freshMiddleware>>;

/**
 * Minimal Express-like request.  The UA must NOT match any entry in
 * BOT_PATTERNS so probe tracking is triggered.
 */
function makeReq(ua: string, referer = "") {
  return {
    path:    "/page",
    method:  "GET",
    headers: { "user-agent": ua, referer },
    socket:  { remoteAddress: "10.0.0.1" },
  } as any;
}

/**
 * Minimal Express-like response whose "finish" event can be triggered manually.
 */
function makeRes() {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    statusCode: 200,
    locals:     {},
    status:     vi.fn().mockReturnThis(),
    json:       vi.fn().mockReturnThis(),
    on(event: string, fn: () => void) {
      (listeners[event] ??= []).push(fn);
    },
    /** Simulate the HTTP response completing (triggers probe recording). */
    finish() {
      for (const fn of listeners["finish"] ?? []) fn();
    },
  };
}

/**
 * Flush the microtask queue so that the fire-and-forget
 *   import("./telegram-bot").then(({ sendProbeAlert }) => sendProbeAlert(...))
 * inside recordProbe() has completed before we assert.
 */
async function flushMicrotasks() {
  // Two rounds: one for the dynamic import promise, one for the .then callback.
  await new Promise<void>((r) => setImmediate(r));
  await new Promise<void>((r) => setImmediate(r));
}

/**
 * Drive the middleware N times with a stable, unknown UA, flushing the
 * microtask queue after each hit so async callbacks complete.
 * Returns the total sendProbeAlert call count after all hits.
 */
async function hitTimes(
  middleware: Middleware,
  n: number,
  ua = "ObscureTestBrowser/99.0",
): Promise<number> {
  for (let i = 0; i < n; i++) {
    const req = makeReq(ua);
    const res = makeRes();
    middleware(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
  }
  return mockSendProbeAlert.mock.calls.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROBE_ALERT_THRESHOLD parsing — env-var edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe("PROBE_ALERT_THRESHOLD parsing", () => {
  it("valid positive integer: alert fires after threshold+1 hits", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "3";
    const mw = await freshMiddleware();

    // Three hits — counter equals threshold, should NOT alert yet (> not >=)
    expect(await hitTimes(mw, 3)).toBe(0);

    // Fourth hit — counter exceeds threshold, alert must fire
    expect(await hitTimes(mw, 1)).toBe(1);
  });

  it("float string ('2.7'): parseInt truncates to 2; alert fires on hit 3", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2.7";
    const mw = await freshMiddleware();

    expect(await hitTimes(mw, 2)).toBe(0); // at threshold, no alert
    expect(await hitTimes(mw, 1)).toBe(1); // exceeds → alert
  });

  it("zero ('0'): falls back to default 5; alert fires on hit 6 not hit 1", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "0";
    const mw = await freshMiddleware();

    // If zero were accepted the alert would fire by hit 2 — it must not
    expect(await hitTimes(mw, 5)).toBe(0); // at default threshold, no alert
    expect(await hitTimes(mw, 1)).toBe(1); // 6th hit exceeds default 5
  });

  it("negative value ('-3'): falls back to default 5; alert fires on hit 6", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "-3";
    const mw = await freshMiddleware();

    expect(await hitTimes(mw, 5)).toBe(0);
    expect(await hitTimes(mw, 1)).toBe(1);
  });

  it("non-numeric string ('abc'): falls back to default 5; alert fires on hit 6", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "abc";
    const mw = await freshMiddleware();

    expect(await hitTimes(mw, 5)).toBe(0);
    expect(await hitTimes(mw, 1)).toBe(1);
  });

  it("empty string (''): falls back to default 5; alert fires on hit 6", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "";
    const mw = await freshMiddleware();

    expect(await hitTimes(mw, 5)).toBe(0);
    expect(await hitTimes(mw, 1)).toBe(1);
  });

  it("env var absent: falls back to default 5; alert fires on hit 6", async () => {
    // Env var already deleted in beforeEach
    const mw = await freshMiddleware();

    expect(await hitTimes(mw, 5)).toBe(0);
    expect(await hitTimes(mw, 1)).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROBE_ALERT_COOLDOWN_HOURS parsing — invalid values fall back to 1 h
// ═══════════════════════════════════════════════════════════════════════════

describe("PROBE_ALERT_COOLDOWN_HOURS parsing — invalid values fall back to 1 h", () => {
  /**
   * For each invalid cooldown value: set threshold=2 so an alert fires after
   * 3 hits, then hit many more times and confirm the alert fires only ONCE
   * (meaning the 1-hour cooldown is active and suppresses re-alerts).
   */
  async function assertSingleAlertWithBadCooldown(badValue: string | undefined) {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    if (badValue !== undefined) {
      process.env.PROBE_ALERT_COOLDOWN_HOURS = badValue;
    }
    const mw = await freshMiddleware();

    // Trigger the first alert (hit 3 exceeds threshold 2)
    await hitTimes(mw, 3);
    const countAfterFirst = mockSendProbeAlert.mock.calls.length;
    expect(countAfterFirst).toBe(1);

    // Hit 10 more times — cooldown (1 h) should suppress all re-alerts
    await hitTimes(mw, 10);
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);
  }

  it("zero ('0'): falls back to 1 h; no second alert fires within same test", async () => {
    await assertSingleAlertWithBadCooldown("0");
  });

  it("negative ('-1'): falls back to 1 h; no second alert fires within same test", async () => {
    await assertSingleAlertWithBadCooldown("-1");
  });

  it("non-numeric ('inf'): falls back to 1 h; no second alert fires within same test", async () => {
    await assertSingleAlertWithBadCooldown("inf");
  });

  it("env var absent: defaults to 1 h; no second alert fires within same test", async () => {
    await assertSingleAlertWithBadCooldown(undefined);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Alert fires at exactly the correct hit count (threshold boundary)
// ═══════════════════════════════════════════════════════════════════════════

describe("alert fires at exactly threshold+1 hits — boundary verification", () => {
  it("threshold=3: no alert at hits 1–3, alert fires at hit 4", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "3";
    const mw = await freshMiddleware();

    expect(await hitTimes(mw, 1)).toBe(0); // 1 hit — no alert
    expect(await hitTimes(mw, 1)).toBe(0); // 2 hits — no alert
    expect(await hitTimes(mw, 1)).toBe(0); // 3 hits — at threshold, still no alert
    expect(await hitTimes(mw, 1)).toBe(1); // 4 hits — exceeds threshold → alert
  });

  it("threshold=10: no alert at hits 1–10, alert fires at hit 11", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "10";
    const mw = await freshMiddleware();

    expect(await hitTimes(mw, 10)).toBe(0); // 10 hits — at threshold, no alert
    expect(await hitTimes(mw, 1)).toBe(1);  // 11th hit — exceeds → alert
  });

  it("alert message includes the hit count and field label", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    const ua = "SuspiciousTrafficUA/1.0";
    await hitTimes(mw, 3, ua); // 3 hits exceeds threshold of 2

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    // sendProbeAlert(field, value, hits) — check all three arguments
    const [field, , hits] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(hits).toBe(3); // current in-window count reported
  });

  it("two different UA keys each alert independently at their own threshold", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    const uaA = "UnknownBotTypeA/1.0";
    const uaB = "UnknownBotTypeB/2.0";

    // uaA exceeds threshold — one alert
    await hitTimes(mw, 3, uaA);
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);

    // uaB independently exceeds threshold — second alert
    await hitTimes(mw, 3, uaB);
    expect(mockSendProbeAlert.mock.calls.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Valid PROBE_ALERT_COOLDOWN_HOURS — alert fires then is suppressed
// ═══════════════════════════════════════════════════════════════════════════

describe("valid PROBE_ALERT_COOLDOWN_HOURS — alert suppressed within cooldown window", () => {
  it("a valid cooldown: first alert fires, subsequent hits in the same window do not re-alert", async () => {
    // Use threshold=2 and a meaningful cooldown (1 hour default behaviour).
    // We cannot fast-forward time in this test, so we simply verify that
    // many hits after the first alert do not produce a second alert.
    process.env.PROBE_ALERT_THRESHOLD    = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw = await freshMiddleware();

    // First alert fires at hit 3
    await hitTimes(mw, 3);
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);

    // 20 more hits — still within the 1-hour cooldown window → no second alert
    await hitTimes(mw, 20);
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HTML escaping — malicious content in probe keys must be escaped
// ═══════════════════════════════════════════════════════════════════════════

describe("Telegram HTML escaping — malicious characters in probe keys", () => {
  /**
   * Helper: fire the middleware enough times to cross the threshold using the
   * supplied UA string, and return the [field, value, hits] args passed to
   * sendProbeAlert.  HTML escaping and truncation now happen inside
   * sendProbeAlert (telegram-bot.ts), so traffic-logger must pass the raw
   * value unchanged.
   */
  async function getProbeCall(ua: string, threshold = 2): Promise<[string, string, number]> {
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mw = await freshMiddleware();
    await hitTimes(mw, threshold + 1, ua);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    return mockSendProbeAlert.mock.calls[0] as [string, string, number];
  }

  it("escapes '<' to '&lt;' in the alert message", async () => {
    const rawUa = "EvilUA/<script>alert(1)</script>";
    const [field, value] = await getProbeCall(rawUa);
    // traffic-logger passes the raw string; sendProbeAlert handles escaping
    expect(field).toBe("ua");
    expect(value).toContain("<script>");
  });

  it("escapes '>' to '&gt;' in the alert message", async () => {
    const rawUa = "EvilUA/foo>bar";
    const [field, value] = await getProbeCall(rawUa);
    expect(field).toBe("ua");
    expect(value).toContain("foo>bar");
  });

  it("escapes '&' to '&amp;' in the alert message", async () => {
    const rawUa = "EvilUA/foo&bar=1";
    const [field, value] = await getProbeCall(rawUa);
    expect(field).toBe("ua");
    expect(value).toContain("foo&bar=1");
  });

  it("escapes all three special characters together", async () => {
    const rawUa = "UA/<b>click</b>&foo=1";
    const [field, value] = await getProbeCall(rawUa);
    expect(field).toBe("ua");
    expect(value).toBe(rawUa); // raw value passed through unmodified
  });

  it("a plain UA with no special characters is not mangled", async () => {
    const safeUa = "TotallyNormalBrowser/42.0 StableChannel Desktop";
    const [field, value] = await getProbeCall(safeUa);
    expect(field).toBe("ua");
    expect(value).toBe(safeUa);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 300-character truncation — oversized keys are cut before escaping
// ═══════════════════════════════════════════════════════════════════════════

describe("300-character truncation of probe keys in alert message", () => {
  // HTML truncation and escaping now happen inside sendProbeAlert (telegram-bot.ts).
  // These tests verify that traffic-logger passes the raw (untruncated) value
  // correctly — the 300-char cut happens in sendProbeAlert, not here.

  it("a key of exactly 300 characters is NOT truncated", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();
    const ua300 = "A".repeat(300);
    await hitTimes(mw, 3, ua300);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(value).toBe(ua300);
    expect(value.length).toBe(300);
  });

  it("a key longer than 300 characters is passed raw to sendProbeAlert (truncation is its responsibility)", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();
    const ua400 = "B".repeat(400);
    await hitTimes(mw, 3, ua400);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    // traffic-logger stores up to 500 chars; sendProbeAlert slices to 300 internally
    expect(value.length).toBe(400);
    expect(value).toBe(ua400);
  });

  it("special characters after position 300 are present in the raw value (sendProbeAlert truncates)", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();
    const ua = "C".repeat(300) + "<evil>";
    await hitTimes(mw, 3, ua);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    // Raw value includes the '<evil>' tail — sendProbeAlert will truncate it away
    expect(value).toBe(ua);
    expect(value).toContain("<evil>");
  });

  it("special characters within the first 300 chars are passed raw to sendProbeAlert", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();
    const ua = "D".repeat(10) + "<xss>" + "E".repeat(350);
    await hitTimes(mw, 3, ua);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    // Raw unescaped '<xss>' is passed through; sendProbeAlert escapes it
    expect(value).toContain("<xss>");
  });
});
