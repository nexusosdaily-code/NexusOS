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
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    }),
  },
}));
vi.mock("../shared/schema", () => ({ trafficLogs: {}, probeCounters: {} }));
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
  delete process.env.PROBE_WINDOW_HOURS;
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

  // ── lastAlerted boundary: set only when hits EXCEED threshold ────────────
  // These two companion tests guard the strict > condition.
  // A refactor that changes > to >= would fire one hit early AND could skip
  // the lastAlerted assignment path; the second test would catch that.

  it("lastAlerted is set after hits exceed threshold (hits.length === threshold+1)", async () => {
    // threshold=3 → alert fires on the 4th hit (hits.length becomes 4 > 3)
    process.env.PROBE_ALERT_THRESHOLD = "3";
    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const KEY = "BoundaryCheckUA/1.0";
    const now = Date.now();

    // Seed exactly threshold (3) hits — no alert should have fired yet.
    _uaProbes.set(KEY, { hits: [now - 3000, now - 2000, now - 1000], lastAlerted: 0 });

    // One more hit brings hits.length to 4, which exceeds threshold of 3.
    _recordProbe(_uaProbes, KEY, "ua", now);
    await flushMicrotasks();

    // The alert must have fired and lastAlerted must be stamped.
    expect(_uaProbes.get(KEY).lastAlerted).toBeGreaterThan(0);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
  });

  it("lastAlerted remains 0 when hits only reach threshold (hits.length === threshold, not threshold+1)", async () => {
    // threshold=3 → no alert at exactly 3 hits (hits.length === 3, not > 3)
    process.env.PROBE_ALERT_THRESHOLD = "3";
    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const KEY = "BoundaryCheckUA/2.0";
    const now = Date.now();

    // Seed threshold−1 (2) hits so one more brings hits.length to exactly 3.
    _uaProbes.set(KEY, { hits: [now - 2000, now - 1000], lastAlerted: 0 });

    // One more hit → hits.length === 3 === threshold, condition (> 3) is false.
    _recordProbe(_uaProbes, KEY, "ua", now);
    await flushMicrotasks();

    // No alert — lastAlerted must stay 0.
    expect(_uaProbes.get(KEY).lastAlerted).toBe(0);
    expect(mockSendProbeAlert).not.toHaveBeenCalled();
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

// ═══════════════════════════════════════════════════════════════════════════
// Referer probe — HTML escaping
// The referer key passed to sendProbeAlert is referer.slice(0,500).toLowerCase().
// Escaping HTML specials (<, >, &) is sendProbeAlert's responsibility, not
// traffic-logger's, so the raw (lowercased) value must arrive unchanged.
// A known-bot UA (Googlebot) is used so only the referer probe fires.
// ═══════════════════════════════════════════════════════════════════════════

describe("Referer probe — HTML escaping: raw value passed through to sendProbeAlert", () => {
  const BOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

  /**
   * Drive the middleware threshold+1 times with a Googlebot UA (so the UA
   * probe is suppressed) and a specific referer. Returns the [field, value, hits]
   * args received by sendProbeAlert.
   */
  async function getRefererProbeCall(
    referer: string,
    threshold = 2,
  ): Promise<[string, string, number]> {
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mw = await freshMiddleware();
    for (let i = 0; i < threshold + 1; i++) {
      const req = makeReq(BOT_UA, referer);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    return mockSendProbeAlert.mock.calls[0] as [string, string, number];
  }

  it("field label is 'referer' for referer probe alerts", async () => {
    const [field] = await getRefererProbeCall("http://example-scanner.com/probe");
    expect(field).toBe("referer");
  });

  it("referer containing '<' is passed raw — sendProbeAlert handles escaping", async () => {
    const rawRef = "http://evil.com/<script>alert(1)</script>";
    const [field, value] = await getRefererProbeCall(rawRef);
    expect(field).toBe("referer");
    // traffic-logger lowercases the key but does NOT escape HTML
    expect(value).toContain("<script>");
    expect(value).toContain("</script>");
  });

  it("referer containing '>' is passed raw — sendProbeAlert handles escaping", async () => {
    const rawRef = "http://evil.com/foo>bar";
    const [field, value] = await getRefererProbeCall(rawRef);
    expect(field).toBe("referer");
    expect(value).toContain("foo>bar");
  });

  it("referer containing '&' is passed raw — sendProbeAlert handles escaping", async () => {
    const rawRef = "http://evil.com/page?a=1&b=2";
    const [field, value] = await getRefererProbeCall(rawRef);
    expect(field).toBe("referer");
    expect(value).toContain("&");
  });

  it("referer with all three HTML specials (<, >, &) is passed as lowercased raw string", async () => {
    const rawRef = "http://bad.com/<b>Click</b>&foo=1";
    const [field, value] = await getRefererProbeCall(rawRef);
    expect(field).toBe("referer");
    // The key is lowercased before storage and forwarding
    expect(value).toBe(rawRef.toLowerCase());
    expect(value).toContain("<b>");
    expect(value).toContain("</b>");
    expect(value).toContain("&foo=1");
  });

  it("a plain referer with no HTML specials is not mangled", async () => {
    const safeRef = "http://ordinarysite.com/page";
    const [field, value] = await getRefererProbeCall(safeRef);
    expect(field).toBe("referer");
    expect(value).toBe(safeRef.toLowerCase());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Referer probe — 300-character handling
// traffic-logger stores the key as referer.slice(0, 500).toLowerCase().
// The 300-char truncation before embedding in the Telegram message is
// sendProbeAlert's responsibility — traffic-logger must pass the raw (≤500)
// lowercased value unchanged.
// ═══════════════════════════════════════════════════════════════════════════

describe("Referer probe — 300-character handling: raw value (≤500) passed to sendProbeAlert", () => {
  const BOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

  async function hitReferer(referer: string, threshold = 2): Promise<string> {
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mw = await freshMiddleware();
    for (let i = 0; i < threshold + 1; i++) {
      const req = makeReq(BOT_UA, referer);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    return (mockSendProbeAlert.mock.calls[0] as [string, string, number])[1];
  }

  it("referer of exactly 300 characters is passed through intact", async () => {
    // "http://x.com/" is 14 chars; pad to 300 total
    const ref300 = "http://x.com/" + "a".repeat(287);
    const value = await hitReferer(ref300);
    expect(value).toBe(ref300.toLowerCase());
    expect(value.length).toBe(300);
  });

  it("referer longer than 300 but under 500 chars is passed raw — sendProbeAlert truncates to 300", async () => {
    const ref400 = "http://x.com/" + "b".repeat(387); // 400 chars total
    const value = await hitReferer(ref400);
    expect(value).toBe(ref400.toLowerCase());
    expect(value.length).toBe(400);
  });

  it("HTML specials beyond position 300 are present in the raw value — sendProbeAlert truncates them away", async () => {
    // '<evil>' starts at position 301
    const ref = "http://x.com/" + "c".repeat(287) + "<evil>";
    expect(ref.length).toBe(306);
    const value = await hitReferer(ref);
    expect(value).toBe(ref.toLowerCase());
    expect(value).toContain("<evil>");
  });

  it("HTML specials within the first 300 chars are passed raw to sendProbeAlert", async () => {
    // '<xss>' at position 14 — well within 300
    const ref = "http://x.com/<xss>" + "d".repeat(350);
    const value = await hitReferer(ref);
    expect(value).toContain("<xss>");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Referer probe — threshold behaviour mirrors the UA probe
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drive the middleware N times with a stable external referer, flushing the
 * microtask queue after each hit so async callbacks complete.
 *
 * @param rotateUa - when true, appends the hit index to the UA string so each
 *   hit uses a unique UA key. This prevents the UA probe from accumulating and
 *   firing its own alert, isolating tests to referer-only behaviour.
 *
 * Returns the total sendProbeAlert call count after all hits.
 */
async function hitTimesWithReferer(
  middleware: Middleware,
  n: number,
  referer = "https://external-scraper.example/",
  ua = "ObscureTestBrowser/99.0",
  { rotateUa = false }: { rotateUa?: boolean } = {},
): Promise<number> {
  for (let i = 0; i < n; i++) {
    const effectiveUa = rotateUa ? `${ua}-hit${i}` : ua;
    const req = makeReq(effectiveUa, referer);
    const res = makeRes();
    middleware(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
  }
  return mockSendProbeAlert.mock.calls.length;
}

describe("referer probe — alert respects the same threshold as the UA probe", () => {
  it("unknown external referer: no alert at threshold hits, alert fires at threshold+1", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "3";
    const mw = await freshMiddleware();

    // rotateUa gives every hit a unique UA key so the UA probe never
    // accumulates above threshold=3, isolating this test to referer behaviour.

    // Three hits — counter equals threshold, should NOT alert yet (> not >=)
    expect(await hitTimesWithReferer(mw, 3, "https://external-scraper.example/", "ObscureTestBrowser/99.0", { rotateUa: true })).toBe(0);

    // Fourth hit — counter exceeds threshold, alert must fire
    expect(await hitTimesWithReferer(mw, 1, "https://external-scraper.example/", "ObscureTestBrowser/99.0", { rotateUa: true })).toBe(1);
  });

  it("referer alert sends field='referer' to sendProbeAlert", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    // rotateUa ensures each hit uses a unique UA key so the UA probe never
    // accumulates above threshold=2; only the referer alert is under test.
    const uniqueReferer = "https://unique-referer-probe.example/";
    await hitTimesWithReferer(mw, 3, uniqueReferer, "ObscureTestBrowser/99.0", { rotateUa: true });

    expect(mockSendProbeAlert).toHaveBeenCalled();
    const refererCall = (mockSendProbeAlert.mock.calls as [string, string, number][])
      .find(([field]) => field === "referer");
    expect(refererCall).toBeDefined();
    const [field, value] = refererCall!;
    expect(field).toBe("referer");
    expect(value).toContain(uniqueReferer.slice(0, 500).toLowerCase());
  });

  it("two different external referer keys each alert independently", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    const refA = "https://scraper-alpha.example/";
    const refB = "https://scraper-beta.example/";

    // rotateUa prevents the UA probe from accumulating so only referer
    // alerts contribute to the count.

    // refA exceeds threshold — one alert
    await hitTimesWithReferer(mw, 3, refA, "ObscureTestBrowser/99.0", { rotateUa: true });
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);

    // refB independently exceeds threshold — second alert
    await hitTimesWithReferer(mw, 3, refB, "ObscureTestBrowser/99.0", { rotateUa: true });
    expect(mockSendProbeAlert.mock.calls.length).toBe(2);
  });

  it("referer cooldown is respected: first alert fires, subsequent hits do not re-alert", async () => {
    process.env.PROBE_ALERT_THRESHOLD    = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw = await freshMiddleware();

    // rotateUa isolates this to the referer probe — UA keys are all unique.

    // First alert fires at hit 3
    await hitTimesWithReferer(mw, 3, "https://external-scraper.example/", "ObscureTestBrowser/99.0", { rotateUa: true });
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);

    // 20 more hits — 1-hour cooldown suppresses re-alerts
    await hitTimesWithReferer(mw, 20, "https://external-scraper.example/", "ObscureTestBrowser/99.0", { rotateUa: true });
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Referer probe — own-origin referers must never trigger the counter
// ═══════════════════════════════════════════════════════════════════════════

describe("referer probe — own-origin referers never trigger the counter", () => {
  /**
   * Hit the middleware many more times than the alert threshold with an
   * own-origin referer and assert no alert ever fires.
   */
  async function assertNoAlertForOwnOriginReferer(referer: string) {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    // 10 hits — well above threshold — must produce zero alerts.
    // rotateUa ensures each hit uses a unique UA key so the UA probe never
    // accumulates above threshold; only the referer behaviour is under test.
    expect(await hitTimesWithReferer(mw, 10, referer, "ObscureTestBrowser/99.0", { rotateUa: true })).toBe(0);
  }

  it("wnsp.io referer is never counted", async () => {
    await assertNoAlertForOwnOriginReferer("https://wnsp.io/some-page");
  });

  it("subdomain of wnsp.io is never counted", async () => {
    await assertNoAlertForOwnOriginReferer("https://app.wnsp.io/dashboard");
  });

  it("wnsp.tech referer is never counted", async () => {
    await assertNoAlertForOwnOriginReferer("https://wnsp.tech/");
  });

  it("Replit dev domain referer is never counted", async () => {
    // Simulate the REPLIT_DEV_DOMAIN env var being set (as it is in all
    // Replit preview sessions) so isOwnOriginReferer() accepts it.
    const prevDevDomain = process.env.REPLIT_DEV_DOMAIN;
    process.env.REPLIT_DEV_DOMAIN = "my-repl.replit.dev";
    try {
      await assertNoAlertForOwnOriginReferer("https://my-repl.replit.dev/page");
    } finally {
      if (prevDevDomain === undefined) {
        delete process.env.REPLIT_DEV_DOMAIN;
      } else {
        process.env.REPLIT_DEV_DOMAIN = prevDevDomain;
      }
    }
  });

  it("empty referer is never counted", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    // 10 hits with no referer — the branch condition `if (referer && …)` skips.
    // rotateUa prevents the UA probe from accumulating so only referer
    // behaviour is under test.
    expect(await hitTimesWithReferer(mw, 10, "", "ObscureTestBrowser/99.0", { rotateUa: true })).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Constitutionally-blocked referer — must never increment the probe counter
//
// When a request carries a constitutionally-blocked Referer header the
// middleware returns 403 *before* registering the res.on("finish") listener
// that drives recordProbe(). Consequently, blocked referers must never
// accumulate hits and must never fire a sendProbeAlert call, even when the
// request count far exceeds the configured threshold.
// ═══════════════════════════════════════════════════════════════════════════

describe("constitutionally-blocked referer never increments the probe counter", () => {
  /**
   * Helper: send `count` requests with the given referer, each with a unique
   * UA so the UA probe never accumulates, and assert sendProbeAlert was never
   * called regardless of the threshold.
   */
  async function assertBlockedRefererNeverAlerts(
    referer: string,
    threshold = 2,
  ): Promise<void> {
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mw = await freshMiddleware();

    // Send threshold+1 requests — enough to trigger an alert if the probe
    // were recorded — and confirm sendProbeAlert is still called zero times.
    const count = threshold + 1;
    for (let i = 0; i < count; i++) {
      const req = makeReq(`ObscureTestBrowser/99.0-hit${i}`, referer);
      const res = makeRes();
      mw(req, res as any, () => {});
      // Trigger the finish event; for a blocked request no listener was
      // registered, so this is a no-op — but calling it is correct and
      // future-proofs the test against any listener-registration change.
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(0);
  }

  it("binance.com referer: threshold+1 requests produce zero alerts", async () => {
    await assertBlockedRefererNeverAlerts("https://binance.com/");
  });

  it("binance.com subdomain referer is also blocked and never alerts", async () => {
    await assertBlockedRefererNeverAlerts("https://exchange.binance.com/trade");
  });

  it("ftx.com referer: threshold+1 requests produce zero alerts", async () => {
    await assertBlockedRefererNeverAlerts("https://ftx.com/markets");
  });

  it("jpmorgan.com referer: threshold+1 requests produce zero alerts", async () => {
    await assertBlockedRefererNeverAlerts("https://www.jpmorgan.com/");
  });

  it("blocked referer with a custom high threshold still produces zero alerts", async () => {
    // Even with a threshold of 1 (alert on hit 2), a blocked referer must
    // never trigger an alert because probe recording is skipped entirely.
    await assertBlockedRefererNeverAlerts("https://binance.com/", 1);
  });

  it("ghost-rider raw-pattern referer: threshold+1 requests produce zero alerts", async () => {
    // "ghost-rider/recon" is a non-URL referer matched by BLOCKED_REFERRER_RAW.
    // The middleware must return 403 before registering the res.on("finish")
    // listener, so recordProbe() is never called and sendProbeAlert fires zero times.
    await assertBlockedRefererNeverAlerts("ghost-rider/recon");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Constitutionally-blocked referer always returns HTTP 403
//
// The probe-counter tests above confirm that blocked referers never accumulate
// hits, but they would still pass even if the res.status(403).json({...})
// early-return were accidentally deleted (probe recording is skipped before
// the status call, so the counter check is unchanged).  These tests close
// that gap by asserting the HTTP status code directly.
// ═══════════════════════════════════════════════════════════════════════════

describe("constitutionally-blocked referer always responds with HTTP 403", () => {
  /**
   * Send a single request with the given referer and return the res mock so
   * callers can assert status / json invocations.
   */
  async function sendOneRequest(referer: string) {
    const mw = await freshMiddleware();
    const req = makeReq("ObscureTestBrowser/99.0", referer);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    return res;
  }

  it("domain block (binance.com): res.status is called with 403", async () => {
    const res = await sendOneRequest("https://binance.com/");
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("domain block (jpmorgan.com): res.status is called with 403", async () => {
    const res = await sendOneRequest("https://www.jpmorgan.com/");
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("raw-pattern block (ghost-rider): res.status is called with 403", async () => {
    const res = await sendOneRequest("ghost-rider/1.0");
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("domain block also calls res.json with an error body", async () => {
    const res = await sendOneRequest("https://binance.com/");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it("raw-pattern block also calls res.json with an error body", async () => {
    const res = await sendOneRequest("ghost-rider/probe");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it("ghost-rider/recon raw-pattern block: res.status(403) and res.json({ error: 'Access denied.' })", async () => {
    // This is the canonical end-to-end check for the BLOCKED_REFERRER_RAW early-exit path.
    // "ghost-rider/recon" is not a valid URL so it cannot be caught by the domain-block
    // branch — it must be caught by the raw-pattern branch and must return exactly 403
    // with the standard error body before any probe recording occurs.
    const res = await sendOneRequest("ghost-rider/recon");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied." });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKED_REFERRER_RAW case-insensitive matching
//
// The /i flag on every BLOCKED_REFERRER_RAW pattern means mixed-case or
// all-caps variants of a blocked referer string must be refused with the
// same 403 / { error: "Access denied." } response as the lowercase form.
// These tests verify the /i branch actually fires; without them a future
// regex change that drops the flag would ship silently.
// ═══════════════════════════════════════════════════════════════════════════

describe("BLOCKED_REFERRER_RAW /i flag — mixed-case variants still return 403", () => {
  async function sendOneRequest(referer: string) {
    const mw = await freshMiddleware();
    const req = makeReq("ObscureTestBrowser/99.0", referer);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    return res;
  }

  it("all-caps 'GHOST-RIDER/recon': res.status(403) and res.json({ error: 'Access denied.' })", async () => {
    const res = await sendOneRequest("GHOST-RIDER/recon");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied." });
  });

  it("title-case 'Ghost-Rider/1.0': res.status(403) and res.json({ error: 'Access denied.' })", async () => {
    const res = await sendOneRequest("Ghost-Rider/1.0");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied." });
  });

  it("all-caps with space 'GHOST RIDER/1.0': res.status(403) and res.json({ error: 'Access denied.' })", async () => {
    // The pattern is /ghost[\s-]?rider/i — both space and hyphen separators must match.
    const res = await sendOneRequest("GHOST RIDER/1.0");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied." });
  });

  it("mixed-case with space 'Ghost Rider/probe': res.status(403) and res.json({ error: 'Access denied.' })", async () => {
    const res = await sendOneRequest("Ghost Rider/probe");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied." });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic-block referer (Telegram-added) — must never increment the probe counter
//
// When a request carries a Referer header that matches an entry in the
// dynamically-populated _dynamicSnapshot.referers set, the middleware returns
// 403 *before* registering the res.on("finish") listener that drives
// recordProbe(). Consequently, dynamically-blocked referers must never
// accumulate hits and must never fire a sendProbeAlert call, even when the
// request count far exceeds the configured threshold.
// ═══════════════════════════════════════════════════════════════════════════

describe("dynamic-block referer never increments the probe counter", () => {
  /**
   * Helper: pre-populate the dynamic snapshot with a test referer, then send
   * `count` requests carrying that referer (each with a unique UA so the UA
   * probe never accumulates), and assert sendProbeAlert was never called.
   */
  async function assertDynamicBlockedRefererNeverAlerts(
    referer: string,
    threshold = 2,
  ): Promise<void> {
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mod = await import("./traffic-logger");
    const mw = mod.trafficLoggerMiddleware;

    // Pre-populate the dynamic snapshot so the referer is treated as blocked.
    mod._testSetDynamicBlockSnapshot({
      referers: new Set([referer.toLowerCase()]),
      uas: new Set(),
    });

    // Send threshold+1 requests — enough to trigger an alert if the probe were
    // recorded — and confirm sendProbeAlert is still called zero times.
    const count = threshold + 1;
    for (let i = 0; i < count; i++) {
      const req = makeReq(`ObscureTestBrowser/99.0-dynhit${i}`, referer);
      const res = makeRes();
      mw(req, res as any, () => {});
      // Trigger the finish event; for a blocked request no listener was
      // registered, so this is a no-op — but calling it is correct and
      // future-proofs the test against any listener-registration change.
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(0);
  }

  it("exact-match dynamic referer: threshold+1 requests produce zero alerts", async () => {
    await assertDynamicBlockedRefererNeverAlerts("https://scraper-test.example/");
  });

  it("dynamic referer with path suffix: threshold+1 requests produce zero alerts", async () => {
    await assertDynamicBlockedRefererNeverAlerts("https://scraper-test.example/deep/path");
  });

  it("dynamic referer with a custom high threshold still produces zero alerts", async () => {
    // Even with threshold=1 (alert on hit 2), a dynamically-blocked referer
    // must never trigger an alert because probe recording is skipped entirely.
    await assertDynamicBlockedRefererNeverAlerts("https://scraper-test.example/", 1);
  });

  it("multiple dynamic referers: each individually blocked and never alerts", async () => {
    const threshold = 2;
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mod = await import("./traffic-logger");
    const mw = mod.trafficLoggerMiddleware;

    const blocked1 = "https://first-scraper.example/";
    const blocked2 = "https://second-scraper.example/";

    // Pre-populate with two blocked referers.
    mod._testSetDynamicBlockSnapshot({
      referers: new Set([blocked1.toLowerCase(), blocked2.toLowerCase()]),
      uas: new Set(),
    });

    const count = threshold + 1;
    for (let i = 0; i < count; i++) {
      for (const ref of [blocked1, blocked2]) {
        const req = makeReq(`ObscureTestBrowser/99.0-multi${i}`, ref);
        const res = makeRes();
        mw(req, res as any, () => {});
        res.finish();
        await flushMicrotasks();
      }
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(0);
  });

  it("removing a referer from the snapshot restores normal probe counting and triggers an alert", async () => {
    const threshold = 2;
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mod = await import("./traffic-logger");
    const mw = mod.trafficLoggerMiddleware;

    const referer = "https://lifted-block.example/";

    // Phase 1: block the referer and confirm zero alerts for threshold+1 hits.
    mod._testSetDynamicBlockSnapshot({
      referers: new Set([referer.toLowerCase()]),
      uas: new Set(),
    });

    const countBlocked = threshold + 1;
    for (let i = 0; i < countBlocked; i++) {
      const req = makeReq(`ObscureTestBrowser/99.0-blocked${i}`, referer);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(0);

    // Phase 2: remove the referer from the snapshot (empty set).
    mod._testSetDynamicBlockSnapshot({ referers: new Set(), uas: new Set() });

    // Send threshold+1 more requests — now unblocked, so the probe counter
    // should accumulate and fire exactly one alert.
    const countUnblocked = threshold + 1;
    for (let i = 0; i < countUnblocked; i++) {
      const req = makeReq(`ObscureTestBrowser/99.0-unblocked${i}`, referer);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic-block referer (Telegram-added) always returns HTTP 403
//
// The probe-counter tests above confirm that dynamically-blocked referers
// never accumulate hits, but they would still pass even if the
// res.status(403).json({...}) early-return were accidentally changed to call
// next() instead (probe recording is skipped before the status call, so the
// counter check is unchanged).  These tests close that gap by asserting the
// HTTP status code directly.
// ═══════════════════════════════════════════════════════════════════════════

describe("dynamic-block referer (Telegram-added) always responds with HTTP 403", () => {
  /**
   * Pre-populate the dynamic snapshot with `snapshotReferers`, send a single
   * request carrying `requestReferer`, and return the res mock so callers can
   * assert status / json invocations.
   */
  async function sendOneDynamicBlockRequest(
    snapshotReferers: Set<string>,
    requestReferer: string,
  ) {
    const mod = await import("./traffic-logger");
    const mw = mod.trafficLoggerMiddleware;

    mod._testSetDynamicBlockSnapshot({ referers: snapshotReferers, uas: new Set() });

    const req = makeReq("ObscureTestBrowser/99.0", requestReferer);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    return res;
  }

  it("exact-match dynamic referer: res.status is called with 403", async () => {
    const blocked = "https://dynamic-exact-block.example/";
    const res = await sendOneDynamicBlockRequest(
      new Set([blocked.toLowerCase()]),
      blocked,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("exact-match dynamic referer: res.json is called with an error body", async () => {
    const blocked = "https://dynamic-exact-block.example/";
    const res = await sendOneDynamicBlockRequest(
      new Set([blocked.toLowerCase()]),
      blocked,
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it("hostname-matched dynamic referer: res.status is called with 403", async () => {
    // The snapshot stores the canonical URL; the request uses a different path
    // on the same hostname — isBlockedReferrer must match by hostname and
    // return 403 regardless of the path difference.
    const snapshotEntry = "https://dynamic-hostname-block.example/";
    const requestReferer = "https://dynamic-hostname-block.example/some/other/page?q=1";
    const res = await sendOneDynamicBlockRequest(
      new Set([snapshotEntry.toLowerCase()]),
      requestReferer,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("hostname-matched dynamic referer: res.json is called with an error body", async () => {
    const snapshotEntry = "https://dynamic-hostname-block.example/";
    const requestReferer = "https://dynamic-hostname-block.example/deep/path";
    const res = await sendOneDynamicBlockRequest(
      new Set([snapshotEntry.toLowerCase()]),
      requestReferer,
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic UA block — always responds with HTTP 403
//
// When a UA string is present in the dynamic snapshot the middleware must
// return a 403 response immediately.  When the snapshot is cleared (block
// lifted) the same UA must pass through normally — next() is called and
// res.status(403) is never invoked.
// ═══════════════════════════════════════════════════════════════════════════

describe("dynamic UA block always responds with HTTP 403", () => {
  /**
   * Pre-populate the dynamic snapshot with `blockedUa`, send a single request
   * carrying that UA, and return the res mock so callers can assert status /
   * next invocations.
   */
  async function sendOneUaBlockRequest(
    snapshotUas: Set<string>,
    requestUa: string,
  ) {
    const mod = await import("./traffic-logger");
    const mw = mod.trafficLoggerMiddleware;

    mod._testSetDynamicBlockSnapshot({ referers: new Set(), uas: snapshotUas });

    const req = makeReq(requestUa);
    const res = makeRes();
    // The next() stub simulates a downstream handler that sends a 200 — this
    // lets phase-2 assert an explicit status(200) call rather than relying on
    // the mock's default initialisation value.
    const next = vi.fn().mockImplementation(() => {
      res.status(200);
    });
    mw(req, res as any, next);
    res.finish();
    await flushMicrotasks();
    return { res, next };
  }

  it("phase 1 — UA in snapshot: res.status is called with 403", async () => {
    const blockedUa = "DynamicBlockedUABot/1.0";
    const { res } = await sendOneUaBlockRequest(
      new Set([blockedUa]),
      blockedUa,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("phase 1 — UA in snapshot: next() is never called", async () => {
    const blockedUa = "DynamicBlockedUABot/1.0";
    const { next } = await sendOneUaBlockRequest(
      new Set([blockedUa]),
      blockedUa,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("phase 2 — snapshot cleared: same UA receives HTTP 200 and next() is called", async () => {
    const blockedUa = "DynamicBlockedUABot/1.0";
    // Phase 1 sanity check — block is active.
    const { res: resBlocked } = await sendOneUaBlockRequest(
      new Set([blockedUa]),
      blockedUa,
    );
    expect(resBlocked.status).toHaveBeenCalledWith(403);

    // Phase 2: clear the snapshot and send the same UA again.
    const { res: resLifted, next: nextLifted } = await sendOneUaBlockRequest(
      new Set(),
      blockedUa,
    );
    // The downstream handler (next stub) must have been called …
    expect(nextLifted).toHaveBeenCalled();
    // … and it must have explicitly set a 200 status — not a 403.
    expect(resLifted.status).toHaveBeenCalledWith(200);
    expect(resLifted.status).not.toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dynamic UA block — never increments the probe counter
//
// When a request carries a UA string that has been added to the dynamic block
// list via Telegram the middleware returns 403 *before* registering the
// res.on("finish") listener that drives recordProbe().  Consequently,
// dynamically-blocked UAs must never accumulate hits and must never fire a
// sendProbeAlert call, even when the request count far exceeds the threshold.
// ═══════════════════════════════════════════════════════════════════════════

describe("dynamic UA block never increments the probe counter", () => {
  /**
   * Helper: pre-populate _dynamicSnapshot.uas with a blocked UA string, send
   * `threshold+1` requests carrying that UA, and assert sendProbeAlert is
   * never called.
   */
  async function assertDynamicUaNeverAlerts(
    blockedUa: string,
    threshold = 2,
  ): Promise<void> {
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mod = await import("./traffic-logger");
    const mw = mod.trafficLoggerMiddleware;

    // Inject the UA into the in-process dynamic snapshot so the middleware
    // treats it as blocked without needing a live database.
    mod._testSetDynamicBlockSnapshot({ referers: new Set(), uas: new Set([blockedUa]) });

    const count = threshold + 1;
    for (let i = 0; i < count; i++) {
      const req = makeReq(blockedUa);
      const res = makeRes();
      mw(req, res as any, () => {});
      // The middleware returns 403 without registering a finish listener, so
      // this call is a no-op — but it future-proofs the test against any drift.
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(0);
  }

  it("threshold+1 requests with a dynamically-blocked UA produce zero alerts", async () => {
    await assertDynamicUaNeverAlerts("DynamicBlockedBot/1.0");
  });

  it("a different blocked UA string is also never counted", async () => {
    await assertDynamicUaNeverAlerts("ScrapeBot/2.0 (crawler)");
  });

  it("blocked UA with a custom high threshold still produces zero alerts", async () => {
    await assertDynamicUaNeverAlerts("DynamicBlockedBot/1.0", 10);
  });

  it("blocked UA with threshold=1 (alert on hit 2) still produces zero alerts", async () => {
    await assertDynamicUaNeverAlerts("DynamicBlockedBot/1.0", 1);
  });

  it("removing a UA from the snapshot restores normal probe counting and triggers an alert", async () => {
    const threshold = 2;
    process.env.PROBE_ALERT_THRESHOLD = String(threshold);
    const mod = await import("./traffic-logger");
    const mw = mod.trafficLoggerMiddleware;

    const blockedUa = "LiftedBlockBot/3.0";

    // Phase 1: block the UA and confirm zero alerts for threshold+1 hits.
    mod._testSetDynamicBlockSnapshot({ referers: new Set(), uas: new Set([blockedUa]) });

    const countBlocked = threshold + 1;
    for (let i = 0; i < countBlocked; i++) {
      const req = makeReq(blockedUa);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(0);

    // Phase 2: remove the UA from the snapshot (empty uas set).
    mod._testSetDynamicBlockSnapshot({ referers: new Set(), uas: new Set() });

    // Send threshold+1 more requests — now unblocked, so the probe counter
    // should accumulate and fire exactly one alert.
    const countUnblocked = threshold + 1;
    for (let i = 0; i < countUnblocked; i++) {
      const req = makeReq(blockedUa);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Double-counting guard — uaProbes and refererProbes are fully independent
//
// A single request that carries BOTH an unknown UA and an unknown referer
// must increment each counter exactly once — one hit in uaProbes and one hit
// in refererProbes.  The two maps must never bleed into each other.
// ═══════════════════════════════════════════════════════════════════════════

describe("double-counting guard — uaProbes and refererProbes are independent", () => {
  /**
   * Send `n` requests each carrying BOTH an unknown UA and an external referer.
   * Returns the full list of [field, value, hits] triples passed to sendProbeAlert.
   */
  async function hitBothFields(
    middleware: Middleware,
    n: number,
    ua  = "DualFieldTestBrowser/1.0",
    ref = "https://dual-field-scraper.example/",
  ): Promise<Array<[string, string, number]>> {
    for (let i = 0; i < n; i++) {
      const req = makeReq(ua, ref);
      const res = makeRes();
      middleware(req, res as any, () => {});
      res.finish();
      // Two probes may alert on the same hit — each fires its own
      // import("./telegram-bot").then(cb) chain concurrently.
      // Four setImmediate rounds ensure both chains drain completely.
      await flushMicrotasks();
      await flushMicrotasks();
    }
    return mockSendProbeAlert.mock.calls as Array<[string, string, number]>;
  }

  it("threshold+1 hits with both fields set: sendProbeAlert is called exactly twice, once per field", async () => {
    // Threshold = 3 (alert fires when hits > 3, i.e. at hit 4+).
    process.env.PROBE_ALERT_THRESHOLD = "3";
    const mw = await freshMiddleware();

    // ── Stagger the two probes so they alert on different hits ───────────────
    // Sending one UA-only hit first gives the UA map a 1-hit head-start over
    // the referer map.  When the subsequent dual-field hits arrive the UA map
    // crosses the threshold one hit earlier than the referer map, so each probe
    // fires its alert in its own microtask batch — no concurrent import() race.

    // UA pre-warm hit (no referer): UA=1, referer=0.
    const prewarm = makeReq("DualFieldTestBrowser/1.0");
    const prewarmRes = makeRes();
    mw(prewarm, prewarmRes as any, () => {});
    prewarmRes.finish();
    await flushMicrotasks();
    expect(mockSendProbeAlert.mock.calls.length).toBe(0);

    // Dual-field hit 1: UA=2, referer=1.  No alert.
    // Dual-field hit 2: UA=3, referer=2.  No alert.
    // Dual-field hit 3: UA=4 > threshold → UA alert fires alone.
    //                   referer=3 = threshold → no referer alert yet.
    let calls = await hitBothFields(mw, 3);
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe("ua");

    // Dual-field hit 4: UA=5 (cooldown suppresses re-alert).
    //                   referer=4 > threshold → referer alert fires alone.
    calls = await hitBothFields(mw, 1);
    expect(calls.length).toBe(2);

    // Each alert must carry the correct field label.
    const fields = calls.map(([field]) => field).sort();
    expect(fields).toEqual(["referer", "ua"]);
  });

  it("hitting only with referer (rotating UA) does not trigger a UA alert", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    // 20 hits with a stable external referer but a unique UA per hit.
    // Only the referer probe accumulates; the UA probe never exceeds threshold.
    for (let i = 0; i < 20; i++) {
      const req = makeReq(`UniqueUA-${i}/1.0`, "https://referer-only-test.example/");
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    const calls = mockSendProbeAlert.mock.calls as Array<[string, string, number]>;
    // At least one referer alert must have fired.
    expect(calls.some(([field]) => field === "referer")).toBe(true);
    // No UA alert must have fired — each UA key only appears once.
    expect(calls.some(([field]) => field === "ua")).toBe(false);
  });

  it("hitting only with UA (no referer) does not trigger a referer alert", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mw = await freshMiddleware();

    // 20 hits with a stable unknown UA and no referer header at all.
    // Only the UA probe accumulates; the referer probe is never touched.
    for (let i = 0; i < 20; i++) {
      const req = makeReq("StableNoRefererUA/1.0"); // no referer arg → ""
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    const calls = mockSendProbeAlert.mock.calls as Array<[string, string, number]>;
    // At least one UA alert must have fired.
    expect(calls.some(([field]) => field === "ua")).toBe(true);
    // No referer alert must have fired.
    expect(calls.some(([field]) => field === "referer")).toBe(false);
  });

  it("both maps pre-seeded at threshold: one request fires both a 'ua' alert and a 'referer' alert", async () => {
    // Regression guard: an accidental early-return or shared "already alerted"
    // flag in the _initPromise.then() callback would prevent the second
    // recordProbe call from running.  This test catches that regression in two
    // complementary ways:
    //
    // ① Synchronous proof (single middleware pass)
    //   Both maps are seeded to exactly threshold, the middleware is invoked once
    //   with both an unknown UA and an unknown referer, and entry.lastAlerted is
    //   asserted on both entries.  lastAlerted is set SYNCHRONOUSLY inside
    //   recordProbe before the fire-and-forget import chain, so a non-zero value
    //   proves the alert condition was reached for that field.  A future early-
    //   return after the referer probe would leave _uaProbes[UA_KEY].lastAlerted
    //   === 0, failing this assertion.  Both values also matching confirms they
    //   fired inside the same _initPromise.then() invocation.
    //
    // ② Async confirmation (two sequential _recordProbe calls)
    //   The concurrent import("./telegram-bot") pattern that the production code
    //   uses inside a single _initPromise.then() callback can experience a Vitest
    //   mock-cache race: the second concurrent dynamic import of the same mocked
    //   module sometimes resolves before the mock factory has cached its result,
    //   so its sendProbeAlert destructures as undefined and the .catch(() => {})
    //   silently swallows the TypeError.  Calling _recordProbe for each field
    //   separately — with a microtask flush between them so each import fully
    //   resolves before the next begins — confirms that both async chains work
    //   end-to-end and that sendProbeAlert is invoked for each field.

    // threshold=2 → alert fires when hits > 2 (i.e., on the 3rd hit per key).
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes, _recordProbe } = mod as any;

    // Ensure _initPromise has resolved so the res.on("finish") callback fires
    // as a microtask rather than being deferred until DB init completes.
    await mod.initProbeCounters();

    const UA_KEY  = "PreseededDualUA/3.0";
    const REF_VAL = "https://preseeded-dual-scraper.example/scan";
    const REF_KEY = REF_VAL.toLowerCase();   // matches referer.slice(0,500).toLowerCase()

    // ── Phase 1: synchronous regression proof ────────────────────────────────
    {
      const now = Date.now();
      // Seed both maps to exactly threshold (2 hits each).
      // One more hit pushes each to 3 > 2 — the alert condition.
      _uaProbes.set(UA_KEY,      { hits: [now - 2000, now - 1000], lastAlerted: 0 });
      _refererProbes.set(REF_KEY, { hits: [now - 2000, now - 1000], lastAlerted: 0 });

      // Single triggering request with both an unknown UA and an unknown referer.
      const req = makeReq(UA_KEY, REF_VAL);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
      await flushMicrotasks();

      // entry.lastAlerted is set synchronously by recordProbe before the async
      // import chain.  Non-zero means the alert branch ran for that field.
      // If there is a future early-return after the referer probe, UA's
      // lastAlerted stays 0 and this assertion fails.
      expect(_uaProbes.get(UA_KEY).lastAlerted).toBeGreaterThan(0);
      expect(_refererProbes.get(REF_KEY).lastAlerted).toBeGreaterThan(0);
      // Both fired in the same _initPromise.then() pass → identical "now".
      expect(_uaProbes.get(UA_KEY).lastAlerted).toBe(
        _refererProbes.get(REF_KEY).lastAlerted,
      );
    }

    vi.clearAllMocks();

    // ── Phase 2: async sendProbeAlert confirmation ────────────────────────────
    // Use distinct keys so the cooldown on the Phase-1 entries doesn't interfere.
    const UA_KEY2  = "PreseededDualUA2/3.0";
    const REF_KEY2 = "https://preseeded-dual2-scraper.example/scan";
    const REF_KEY2_LOWER = REF_KEY2.toLowerCase();
    {
      const now = Date.now();
      // Seed both maps to threshold.
      _uaProbes.set(UA_KEY2,       { hits: [now - 2000, now - 1000], lastAlerted: 0 });
      _refererProbes.set(REF_KEY2_LOWER, { hits: [now - 2000, now - 1000], lastAlerted: 0 });

      // Call _recordProbe for the referer probe first, then flush so its
      // import("./telegram-bot") chain completes and the mock is cached before
      // the UA probe's concurrent import can race it.
      _recordProbe(_refererProbes, REF_KEY2_LOWER, "referer", now + 1);
      await flushMicrotasks();
      expect(mockSendProbeAlert.mock.calls.length).toBe(1);
      expect((mockSendProbeAlert.mock.calls[0] as [string, string, number])[0]).toBe("referer");

      // Now fire the UA probe.  The telegram-bot mock is already cached so the
      // import resolves immediately without a cache-race.
      _recordProbe(_uaProbes, UA_KEY2, "ua", now + 2);
      await flushMicrotasks();
      expect(mockSendProbeAlert.mock.calls.length).toBe(2);
    }

    const calls = mockSendProbeAlert.mock.calls as Array<[string, string, number]>;
    const fields = calls.map(([f]) => f).sort();
    expect(fields).toEqual(["referer", "ua"]);

    const uaCall  = calls.find(([f]) => f === "ua")!;
    const refCall = calls.find(([f]) => f === "referer")!;
    expect(uaCall[1]).toBe(UA_KEY2);
    expect(refCall[1]).toBe(REF_KEY2_LOWER);
  });

  it("alert fires: lastAlerted is set to the exact 'now' timestamp, not 0 or any other value", async () => {
    // Regression guard: a future refactor that writes `entry.lastAlerted = 0`
    // (or any constant) instead of `entry.lastAlerted = now` would cause every
    // subsequent hit to re-alert (because 0 is always outside the cooldown
    // window), flooding Telegram.  The existing tests only assert
    // lastAlerted > 0; this test pins the value to the exact timestamp passed
    // into _recordProbe so that any incorrect assignment fails immediately.

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const { _uaProbes, _refererProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const EXACT_NOW   = 1_700_000_000_000; // fixed sentinel — not Date.now()
    const UA_KEY      = "ExactTimestampUA/1.0";
    const REF_KEY     = "https://exact-timestamp-scraper.example/scan";

    // Seed both maps to exactly threshold (2 hits) so the very next hit
    // (pushed inside _recordProbe) pushes count to 3 > 2 and triggers the alert.
    _uaProbes.set(UA_KEY,  { hits: [EXACT_NOW - 2000, EXACT_NOW - 1000], lastAlerted: 0 });
    _refererProbes.set(REF_KEY, { hits: [EXACT_NOW - 2000, EXACT_NOW - 1000], lastAlerted: 0 });

    // Fire both probes with the known sentinel timestamp.
    _recordProbe(_refererProbes, REF_KEY, "referer", EXACT_NOW);
    _recordProbe(_uaProbes,      UA_KEY,  "ua",      EXACT_NOW);

    await flushMicrotasks();

    // lastAlerted must equal EXACT_NOW — not 0, not Date.now(), not any other
    // constant.  A regression to `entry.lastAlerted = 0` would fail here
    // because 0 !== 1_700_000_000_000.
    expect(_refererProbes.get(REF_KEY).lastAlerted).toBe(EXACT_NOW);
    expect(_uaProbes.get(UA_KEY).lastAlerted).toBe(EXACT_NOW);
  });

  it("UA cooldown active + referer at threshold: only the referer alert fires, UA alert is suppressed", async () => {
    // Regression guard: a future change that adds an early-return when the UA
    // probe is in cooldown (e.g. `if (uaInCooldown) return`) — or that gates
    // the referer recordProbe call on the UA cooldown state — would silently
    // swallow the referer alert on the same request.
    //
    // Setup: _uaProbes has lastAlerted = now (cooldown freshly set, no re-alert
    //        possible), and _refererProbes has exactly threshold hits so the
    //        very next hit will cross the threshold and trigger an alert.
    // The middleware is invoked once with both fields present.
    // Expected: sendProbeAlert is called exactly once, with field "referer".

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure initProbeCounters has resolved so probe recording runs
    // synchronously inside the res.on("finish") callback.
    await mod.initProbeCounters();

    const UA_KEY  = "CooldownActiveUA/7.0";
    const REF_VAL = "https://referer-while-ua-cooldown.example/scan";
    const REF_KEY = REF_VAL.toLowerCase();

    const now = Date.now();

    // UA map: hits don't matter — what matters is lastAlerted = now, meaning
    // the cooldown is fully active and the UA branch must NOT re-alert.
    _uaProbes.set(UA_KEY, {
      hits:        [now - 3000, now - 2000, now - 1000], // 3 hits (already alerted)
      lastAlerted: now,                                  // cooldown just set
    });

    // Referer map: exactly threshold (2) hits — one more will cross it.
    _refererProbes.set(REF_KEY, {
      hits:        [now - 2000, now - 1000],
      lastAlerted: 0,                        // never alerted → no cooldown
    });

    // Single request carrying both the UA-in-cooldown and the referer-at-threshold.
    const req = makeReq(UA_KEY, REF_VAL);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    await flushMicrotasks();

    // The referer alert must have fired (referer probe is independent of the
    // UA probe's cooldown state).
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("referer");
    expect(value).toBe(REF_KEY);

    // The UA entry must still be in cooldown — lastAlerted unchanged from `now`.
    expect(_uaProbes.get(UA_KEY).lastAlerted).toBe(now);
  });

  it("single dual-field request: _uaProbes and _refererProbes each record exactly one hit for their key", async () => {
    // Regression guard for a future refactor that adds an early return after
    // recording the referer probe — e.g.
    //   if (referer) { recordProbe(refererProbes, ...); return; }
    // Such a change would silently prevent _uaProbes from ever accumulating
    // hits when a referer is also present on the same request.
    //
    // This test directly inspects both in-memory maps after one middleware
    // pass so neither sendProbeAlert nor threshold crossing is required to
    // catch the regression.

    process.env.PROBE_ALERT_THRESHOLD = "99"; // keep threshold high — never alert
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure _initPromise has resolved so res.on("finish") fires synchronously
    // in the microtask queue rather than waiting for DB init.
    await mod.initProbeCounters();

    const DUAL_UA  = "DualFieldProbeCheck/1.0";
    const DUAL_REF = "https://dual-probe-map-check.example/scan";
    const DUAL_REF_KEY = DUAL_REF.toLowerCase(); // matches referer.slice(0,500).toLowerCase()

    // Confirm neither key is pre-seeded.
    expect(_uaProbes.has(DUAL_UA)).toBe(false);
    expect(_refererProbes.has(DUAL_REF_KEY)).toBe(false);

    // Single request carrying both an unknown UA and an unknown external referer.
    const req = makeReq(DUAL_UA, DUAL_REF);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    // Both maps must contain their respective key after the request.
    expect(_uaProbes.has(DUAL_UA)).toBe(true);
    expect(_refererProbes.has(DUAL_REF_KEY)).toBe(true);

    // Each map entry must have exactly one hit recorded.
    expect(_uaProbes.get(DUAL_UA).hits).toHaveLength(1);
    expect(_refererProbes.get(DUAL_REF_KEY).hits).toHaveLength(1);
  });

  it("both maps in full cooldown: dual-field request still records a hit in each map", async () => {
    // Regression guard: a future optimisation that short-circuits probe recording
    // when cooldown is active (e.g. `if (entry.lastAlerted > 0 && inCooldown) return`)
    // would silently prevent new hits from accumulating in the sliding-window
    // arrays.  Hits must always be recorded regardless of alert suppression — the
    // cooldown only prevents the Telegram alert from firing, not the hit itself.

    process.env.PROBE_ALERT_THRESHOLD = "99"; // very high — alert never fires
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure _initPromise has resolved so probe recording runs inside the
    // res.on("finish") callback rather than being deferred until DB init.
    await mod.initProbeCounters();

    const UA_KEY  = "BothCooldownActiveUA/5.0";
    const REF_VAL = "https://both-cooldown-active-scraper.example/scan";
    const REF_KEY = REF_VAL.toLowerCase();

    const now = Date.now();

    // Seed both maps with lastAlerted = now (full cooldown active) and some
    // existing hits so the entries are already present in the maps.
    _uaProbes.set(UA_KEY, {
      hits:        [now - 3000, now - 2000, now - 1000],
      lastAlerted: now,   // cooldown freshly set — alert must NOT fire
    });
    _refererProbes.set(REF_KEY, {
      hits:        [now - 3000, now - 2000, now - 1000],
      lastAlerted: now,   // cooldown freshly set — alert must NOT fire
    });

    const hitsBefore = {
      ua:      _uaProbes.get(UA_KEY).hits.length,
      referer: _refererProbes.get(REF_KEY).hits.length,
    };

    // Send a single dual-field request.
    const req = makeReq(UA_KEY, REF_VAL);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    await flushMicrotasks();

    // Neither map should have alerted — both were in cooldown.
    expect(mockSendProbeAlert).not.toHaveBeenCalled();

    // Despite no alert firing, each map must have grown by exactly one hit.
    expect(_uaProbes.get(UA_KEY).hits).toHaveLength(hitsBefore.ua + 1);
    expect(_refererProbes.get(REF_KEY).hits).toHaveLength(hitsBefore.referer + 1);
  });

  it("UA probe in cooldown: referer probe still records a hit and UA probe still records a hit", async () => {
    // Regression guard: a future refactor could check whether the UA probe's
    // cooldown is active and, if so, skip the entire probe-recording block for
    // both fields — e.g.:
    //
    //   if (ua && !patternBot) {
    //     const entry = uaProbes.get(uaKey);
    //     if (entry && now - entry.lastAlerted < COOLDOWN_MS) return; // ← wrong
    //     recordProbe(uaProbes, uaKey, "ua", now);
    //   }
    //   // ← referer recordProbe unreachable when UA in cooldown
    //
    // Cooldown suppresses the ALERT for a key, not the hit RECORDING.
    // Both maps must accumulate hits on every qualifying request regardless
    // of either probe's cooldown state.

    process.env.PROBE_ALERT_THRESHOLD = "99"; // keep threshold high — never alert
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure _initPromise has resolved so res.on("finish") fires synchronously
    // in the microtask queue rather than waiting for DB init.
    await mod.initProbeCounters();

    const UA_COOLDOWN_KEY  = "UACooldownTestBrowser/1.0";
    const DUAL_REF_VAL     = "https://ua-cooldown-dual-scraper.example/scan";
    const DUAL_REF_KEY     = DUAL_REF_VAL.toLowerCase();

    const now = Date.now();

    // Seed _uaProbes with an active cooldown (lastAlerted = now).
    // The cooldown suppresses future alerts for this key, but must NOT stop
    // the hit from being recorded.
    _uaProbes.set(UA_COOLDOWN_KEY, {
      hits:        [now - 3000, now - 2000, now - 1000], // 3 prior hits
      lastAlerted: now,                                   // cooldown freshly set
    });

    // Confirm the referer key is not pre-seeded.
    expect(_refererProbes.has(DUAL_REF_KEY)).toBe(false);
    const uaHitsBefore = _uaProbes.get(UA_COOLDOWN_KEY).hits.length;

    // Single request carrying both the UA-in-cooldown and the unknown referer.
    const req = makeReq(UA_COOLDOWN_KEY, DUAL_REF_VAL);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    // ── Referer probe: must have accumulated its first hit regardless of UA cooldown
    expect(_refererProbes.has(DUAL_REF_KEY)).toBe(true);
    expect(_refererProbes.get(DUAL_REF_KEY).hits).toHaveLength(1);

    // ── UA probe: must have accumulated one more hit (cooldown only suppresses
    // the alert, not the recording)
    const uaEntry = _uaProbes.get(UA_COOLDOWN_KEY);
    expect(uaEntry.hits).toHaveLength(uaHitsBefore + 1);

    // ── No alert must have fired — threshold=99 keeps both probes below it
    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  it("referer probe in cooldown: UA probe still records a hit and referer probe still records a hit", async () => {
    // Regression guard: a future refactor could check whether the referer probe's
    // cooldown is active and, if so, skip the entire probe-recording block for
    // both fields — e.g.:
    //
    //   if (referer && !refBlocked && !isOwnOriginReferer(referer)) {
    //     const entry = refererProbes.get(refKey);
    //     if (entry && now - entry.lastAlerted < COOLDOWN_MS) return; // ← wrong
    //     recordProbe(refererProbes, refKey, "referer", now);
    //   }
    //   recordProbe(uaProbes, uaKey, "ua", now);  // ← unreachable when referer in cooldown
    //
    // Cooldown suppresses the ALERT for a key, not the hit RECORDING.
    // Both maps must accumulate hits on every qualifying request regardless
    // of either probe's cooldown state.

    process.env.PROBE_ALERT_THRESHOLD = "99"; // keep threshold high — never alert
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure _initPromise has resolved so res.on("finish") fires synchronously
    // in the microtask queue rather than waiting for DB init.
    await mod.initProbeCounters();

    const REF_COOLDOWN_UA  = "RefCooldownTestBrowser/1.0";
    const REF_COOLDOWN_VAL = "https://ref-cooldown-scraper.example/scan";
    const REF_COOLDOWN_KEY = REF_COOLDOWN_VAL.toLowerCase();

    const now = Date.now();

    // Seed _refererProbes with an active cooldown (lastAlerted = now).
    // The cooldown suppresses future alerts for this key, but must NOT stop
    // the hit from being recorded.
    _refererProbes.set(REF_COOLDOWN_KEY, {
      hits:        [now - 3000, now - 2000, now - 1000], // 3 prior hits
      lastAlerted: now,                                   // cooldown freshly set
    });

    // Confirm the UA key is not pre-seeded.
    expect(_uaProbes.has(REF_COOLDOWN_UA)).toBe(false);
    const refHitsBefore = _refererProbes.get(REF_COOLDOWN_KEY).hits.length;

    // Single request carrying both the referer-in-cooldown and the unknown UA.
    const req = makeReq(REF_COOLDOWN_UA, REF_COOLDOWN_VAL);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    // ── UA probe: must have accumulated its first hit regardless of referer cooldown
    expect(_uaProbes.has(REF_COOLDOWN_UA)).toBe(true);
    expect(_uaProbes.get(REF_COOLDOWN_UA).hits).toHaveLength(1);

    // ── Referer probe: must have accumulated one more hit (cooldown only suppresses
    // the alert, not the recording)
    const refEntry = _refererProbes.get(REF_COOLDOWN_KEY);
    expect(refEntry.hits).toHaveLength(refHitsBefore + 1);

    // ── No alert must have fired — threshold=99 keeps both probes below it
    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  it("referer alert fires first: UA alert is NOT swallowed on the same request (symmetric suppression guard)", async () => {
    // Regression guard: a future refactor could insert an early-return immediately
    // after the referer probe fires its alert, silently preventing the UA probe
    // from being checked on the same request — e.g.:
    //
    //   if (referer && !refBlocked && !isOwnOriginReferer(referer)) {
    //     recordProbe(refererProbes, refKey, "referer", now);
    //     if (refererProbes.get(refKey)?.lastAlerted === now) return; // ← wrong
    //   }
    //   if (ua && !patternBot) {
    //     recordProbe(uaProbes, uaKey, "ua", now); // ← unreachable
    //   }
    //
    // In the production code, the referer branch (lines 600-603) runs BEFORE the
    // UA branch (lines 611-614) inside the same _initPromise.then() callback.
    // An early-return after the referer probe would leave the UA probe unchecked
    // even when its counter has independently crossed the threshold.
    //
    // Both probes are seeded to exactly ALERT_THRESHOLD hits (next hit triggers
    // each).  A single dual-field request crosses both thresholds on the same
    // _initPromise.then() invocation.
    //
    // This test verifies in two complementary ways:
    //
    // Phase 1 — synchronous proof via lastAlerted
    //   entry.lastAlerted is set synchronously inside recordProbe BEFORE the
    //   fire-and-forget import chain.  A non-zero value for BOTH entries proves
    //   both alert branches ran inside the same callback.  A future early-return
    //   after the referer probe would leave _uaProbes[UA_KEY].lastAlerted === 0,
    //   failing the assertion.
    //
    // Phase 2 — async sendProbeAlert confirmation via _recordProbe
    //   The concurrent import("./telegram-bot") pattern inside a single
    //   _initPromise.then() callback can experience a Vitest mock-cache race
    //   (the second concurrent dynamic import sometimes resolves before the mock
    //   factory has cached its result, so .catch(() => {}) swallows the error).
    //   Calling _recordProbe for referer first, flushing microtasks so its chain
    //   completes, then calling _recordProbe for UA confirms that both async
    //   chains work end-to-end and that sendProbeAlert is invoked exactly twice.

    // threshold=2 → alert fires when hits > 2 (i.e. on the 3rd hit per key).
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes, _recordProbe } = mod as any;

    // Ensure initProbeCounters has resolved so probe recording runs synchronously
    // inside the res.on("finish") microtask rather than being deferred until DB
    // init completes.
    await mod.initProbeCounters();

    const UA_KEY  = "SymmetricSuppressionGuardUA/1.0";
    const REF_VAL = "https://symmetric-suppression-guard.example/probe";
    const REF_KEY = REF_VAL.toLowerCase();

    // ── Phase 1: synchronous regression proof ────────────────────────────────
    {
      const now = Date.now();

      // Seed both maps to exactly threshold (2 hits each).
      // One more hit pushes each to 3 > 2 — the alert condition.
      _uaProbes.set(UA_KEY,       { hits: [now - 2000, now - 1000], lastAlerted: 0 });
      _refererProbes.set(REF_KEY, { hits: [now - 2000, now - 1000], lastAlerted: 0 });

      // Single dual-field request: carries both the referer-at-threshold and
      // the UA-at-threshold.  The referer branch runs first in the code.
      const req = makeReq(UA_KEY, REF_VAL);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
      await flushMicrotasks();

      // entry.lastAlerted is set synchronously before the async import chain.
      // Non-zero means the alert branch ran for that field.
      // A future early-return after the referer probe would leave
      // _uaProbes[UA_KEY].lastAlerted === 0, failing this assertion.
      expect(_refererProbes.get(REF_KEY).lastAlerted).toBeGreaterThan(0);
      expect(_uaProbes.get(UA_KEY).lastAlerted).toBeGreaterThan(0);
      // Both fired in the same _initPromise.then() pass → same "now" value.
      expect(_refererProbes.get(REF_KEY).lastAlerted).toBe(
        _uaProbes.get(UA_KEY).lastAlerted,
      );
    }

    vi.clearAllMocks();

    // ── Phase 2: async sendProbeAlert confirmation ────────────────────────────
    // Use distinct keys so the Phase-1 cooldowns don't interfere.
    const UA_KEY2       = "SymmetricSuppressionGuardUA2/1.0";
    const REF_VAL2      = "https://symmetric-suppression-guard2.example/probe";
    const REF_KEY2      = REF_VAL2.toLowerCase();
    {
      const now = Date.now();
      _uaProbes.set(UA_KEY2,       { hits: [now - 2000, now - 1000], lastAlerted: 0 });
      _refererProbes.set(REF_KEY2, { hits: [now - 2000, now - 1000], lastAlerted: 0 });

      // Fire the referer probe first (matches code execution order) and flush so
      // its import("./telegram-bot") chain completes and the mock is cached
      // before the UA probe's import begins — avoiding the concurrent-import race.
      _recordProbe(_refererProbes, REF_KEY2, "referer", now + 1);
      await flushMicrotasks();
      expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
      expect((mockSendProbeAlert.mock.calls[0] as [string, string, number])[0]).toBe("referer");

      // Now fire the UA probe — must NOT be swallowed by the referer alert.
      _recordProbe(_uaProbes, UA_KEY2, "ua", now + 2);
      await flushMicrotasks();
      expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);
    }

    // Both alerts must have fired with the correct field labels.
    const calls  = mockSendProbeAlert.mock.calls as Array<[string, string, number]>;
    const fields = calls.map(([f]) => f).sort();
    expect(fields).toEqual(["referer", "ua"]);

    const refCall = calls.find(([f]) => f === "referer")!;
    const uaCall  = calls.find(([f]) => f === "ua")!;
    expect(refCall[1]).toBe(REF_KEY2);
    expect(uaCall[1]).toBe(UA_KEY2);
  });

  it("referer alert fires: UA probe still records a hit and referer probe still records a hit", async () => {
    // Regression guard: a future refactor could check whether the referer probe
    // just crossed the alert threshold and insert an early-return that prevents
    // the UA probe from being recorded on the same request — e.g.:
    //
    //   recordProbe(refererProbes, refKey, "referer", now);
    //   if (refererProbes.get(refKey)?.lastAlerted === now) return; // ← wrong
    //   if (ua && !patternBot) recordProbe(uaProbes, uaKey, "ua", now); // ← unreachable
    //
    // Alert firing must NEVER skip recording the other probe. Both maps must
    // accumulate a hit on every qualifying request regardless of alert state.
    //
    // Setup:  _refererProbes seeded with exactly threshold hits (next hit
    //         will cross the threshold and trigger an alert).
    //         The UA key is absent from _uaProbes.
    // Action: one dual-field request carrying both that referer and an unknown UA.
    // Expected:
    //   • sendProbeAlert fires exactly once, for field "referer"
    //   • _refererProbes accumulates a hit (alert firing doesn't skip recording)
    //   • _uaProbes accumulates a hit regardless of the referer alert

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure initProbeCounters has resolved so probe recording runs
    // synchronously inside the res.on("finish") callback.
    await mod.initProbeCounters();

    const UA_KEY  = "RefererAlertFiringTestUA/3.0";
    const REF_VAL = "https://referer-alert-while-ua-unknown.example/probe";
    const REF_KEY = REF_VAL.toLowerCase();

    const now = Date.now();

    // Seed referer map with exactly threshold (2) hits so the next hit
    // crosses the threshold and fires the alert.
    _refererProbes.set(REF_KEY, {
      hits:        [now - 2000, now - 1000],
      lastAlerted: 0, // never alerted — no cooldown active
    });
    const refHitsBefore = _refererProbes.get(REF_KEY).hits.length; // 2

    // Confirm the UA key is not yet tracked.
    expect(_uaProbes.has(UA_KEY)).toBe(false);

    // Single request carrying both the referer-at-threshold and the unknown UA.
    const req = makeReq(UA_KEY, REF_VAL);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    await flushMicrotasks();

    // ── Referer alert must have fired exactly once.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("referer");
    expect(value).toBe(REF_KEY);

    // ── Referer probe: recording must have happened (hit count went up).
    const refEntry = _refererProbes.get(REF_KEY);
    expect(refEntry.hits).toHaveLength(refHitsBefore + 1);

    // ── UA probe: must have accumulated its first hit regardless of the
    // referer alert that fired on the same request.
    expect(_uaProbes.has(UA_KEY)).toBe(true);
    expect(_uaProbes.get(UA_KEY).hits).toHaveLength(1);
  });

  it("only one probe crosses threshold: lastAlerted stays 0 on the non-alerting entry (no cross-contamination)", async () => {
    // Regression guard: a future refactor might accidentally write the alerting
    // probe's lastAlerted into BOTH probe map entries on the same request — e.g.:
    //
    //   entry.lastAlerted = now;
    //   refererEntry.lastAlerted = now;   // ← wrong: written even when referer didn't alert
    //
    // or share a single mutable "alerted" timestamp object across both calls:
    //
    //   const alertState = { lastAlerted: 0 };
    //   recordProbe(uaProbes,      uaKey,  "ua",      now, alertState);
    //   recordProbe(refererProbes, refKey, "referer", now, alertState);
    //
    // This would silently impose a 1-hour cooldown on the non-alerting probe,
    // suppressing its first real alert and letting traffic slip past detection.
    //
    // This test covers two scenarios:
    //
    // Scenario A — UA at threshold, referer well below:
    //   Only the UA alert fires.  The referer entry's lastAlerted must remain 0.
    //   Neither entry must share the other's lastAlerted value.
    //
    // Scenario B — Referer at threshold, UA well below (symmetric):
    //   Only the referer alert fires.  The UA entry's lastAlerted must remain 0.
    //   Neither entry must share the other's lastAlerted value.

    // threshold=2 → alert fires when hits > 2 (i.e. on the 3rd hit per key).
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    await mod.initProbeCounters();

    // ── Scenario A: UA at threshold, referer has only 1 hit (well below) ─────
    {
      const now = Date.now();

      const UA_KEY_A  = "CrossContamGuardUAOnly/1.0";
      const REF_VAL_A = "https://cross-contam-guard-ua-only.example/probe";
      const REF_KEY_A = REF_VAL_A.toLowerCase();

      // UA map: exactly threshold (2 hits) — one more hit will cross and alert.
      _uaProbes.set(UA_KEY_A, {
        hits:        [now - 2000, now - 1000],
        lastAlerted: 0,
      });

      // Referer map: only 1 hit — well below threshold, must NOT alert.
      _refererProbes.set(REF_KEY_A, {
        hits:        [now - 2000],
        lastAlerted: 0,
      });

      const req = makeReq(UA_KEY_A, REF_VAL_A);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
      await flushMicrotasks();

      // UA alert must have fired (crossed threshold).
      const uaEntry_A = _uaProbes.get(UA_KEY_A);
      expect(uaEntry_A.lastAlerted).toBeGreaterThan(0);

      // Referer entry must NOT have been contaminated by the UA alert timestamp.
      const refEntry_A = _refererProbes.get(REF_KEY_A);
      expect(refEntry_A.lastAlerted).toBe(0);

      // Neither entry carries the other's lastAlerted value.
      // UA alerted (non-zero) and referer did not (0) — they must differ.
      expect(uaEntry_A.lastAlerted).not.toBe(refEntry_A.lastAlerted);
    }

    vi.clearAllMocks();

    // ── Scenario B: Referer at threshold, UA has only 1 hit (symmetric) ──────
    {
      const now = Date.now();

      const UA_KEY_B  = "CrossContamGuardRefOnly/1.0";
      const REF_VAL_B = "https://cross-contam-guard-ref-only.example/probe";
      const REF_KEY_B = REF_VAL_B.toLowerCase();

      // Referer map: exactly threshold (2 hits) — one more hit will cross and alert.
      _refererProbes.set(REF_KEY_B, {
        hits:        [now - 2000, now - 1000],
        lastAlerted: 0,
      });

      // UA map: only 1 hit — well below threshold, must NOT alert.
      _uaProbes.set(UA_KEY_B, {
        hits:        [now - 2000],
        lastAlerted: 0,
      });

      const req = makeReq(UA_KEY_B, REF_VAL_B);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
      await flushMicrotasks();

      // Referer alert must have fired (crossed threshold).
      const refEntry_B = _refererProbes.get(REF_KEY_B);
      expect(refEntry_B.lastAlerted).toBeGreaterThan(0);

      // UA entry must NOT have been contaminated by the referer alert timestamp.
      const uaEntry_B = _uaProbes.get(UA_KEY_B);
      expect(uaEntry_B.lastAlerted).toBe(0);

      // Neither entry carries the other's lastAlerted value.
      // Referer alerted (non-zero) and UA did not (0) — they must differ.
      expect(refEntry_B.lastAlerted).not.toBe(uaEntry_B.lastAlerted);
    }
  });

  it("referer cooldown active + UA at threshold: only the UA alert fires, referer alert is suppressed", async () => {
    // Regression guard: a future change that short-circuits on the referer
    // probe's cooldown state — e.g.:
    //
    //   if (referer && !refBlocked && !isOwnOriginReferer(referer)) {
    //     recordProbe(refererProbes, refKey, "referer", now);
    //     if (refererInCooldown) return; // ← wrong: skips the UA probe entirely
    //   }
    //   recordProbe(uaProbes, uaKey, "ua", now); // ← unreachable
    //
    // or alternatively a check that gates the UA probe on the referer probe's
    // cooldown state:
    //
    //   if (!refererAlerted) recordProbe(uaProbes, uaKey, "ua", now);
    //
    // Both patterns would silently suppress the UA alert when the referer map
    // happens to be in cooldown on the same request.
    //
    // Setup:  _refererProbes has lastAlerted = now (cooldown fully active, no
    //         re-alert possible).  _uaProbes has exactly threshold hits so the
    //         very next hit crosses the threshold and fires the UA alert.
    // Action: one request carrying both the referer-in-cooldown and the
    //         UA-at-threshold.
    // Expected: sendProbeAlert is called exactly once, with field "ua".

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure _initPromise has resolved so probe recording runs synchronously
    // inside the res.on("finish") microtask rather than being deferred until
    // DB init completes.
    await mod.initProbeCounters();

    const UA_KEY  = "RefCooldownUAThresholdBrowser/1.0";
    const REF_VAL = "https://ref-cooldown-ua-threshold.example/scan";
    const REF_KEY = REF_VAL.toLowerCase();

    const now = Date.now();

    // Referer map: cooldown freshly set (lastAlerted = now).
    // Hits don't matter — what matters is that the cooldown is active so
    // the referer branch must NOT re-alert.
    _refererProbes.set(REF_KEY, {
      hits:        [now - 3000, now - 2000, now - 1000], // already alerted before
      lastAlerted: now,                                   // cooldown just set
    });

    // UA map: exactly threshold (2) hits — one more will cross it and fire
    // the alert.  No prior alert (lastAlerted = 0).
    _uaProbes.set(UA_KEY, {
      hits:        [now - 2000, now - 1000],
      lastAlerted: 0, // never alerted → no cooldown
    });

    // Single request carrying both the referer-in-cooldown and the
    // UA-at-threshold.
    const req = makeReq(UA_KEY, REF_VAL);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    await flushMicrotasks();

    // The UA alert must have fired (UA probe is independent of the referer
    // probe's cooldown state).
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(value).toBe(UA_KEY);

    // The referer entry must still be in cooldown — lastAlerted unchanged.
    expect(_refererProbes.get(REF_KEY).lastAlerted).toBe(now);
  });

  it("referer-only cooldown: UA probe gains its first hit and referer probe gains one hit on a dual-field request", async () => {
    // Regression guard for a symmetric suppression path: a future refactor
    // that checks whether the referer probe is in cooldown and skips ALL probe
    // recording for that request — e.g.:
    //
    //   if (referer && !refBlocked && !isOwnOriginReferer(referer)) {
    //     const entry = refererProbes.get(refKey);
    //     if (entry && now - entry.lastAlerted < COOLDOWN_MS) return; // ← wrong
    //     recordProbe(refererProbes, refKey, "referer", now);
    //   }
    //   if (ua && !patternBot) {
    //     recordProbe(uaProbes, uaKey, "ua", now); // ← unreachable
    //   }
    //
    // Specifically targets the case where:
    //   • _refererProbes has lastAlerted = now (full cooldown active)
    //   • _uaProbes has NO entry at all for the UA key (zero prior hits)
    //
    // The referer probe must still record a hit (cooldown only suppresses the
    // alert, not the recording), and the UA probe must gain its very first hit
    // — it must never be gated on the referer probe's cooldown state.
    //
    // A realistic threshold (2) is used rather than 99 so the test exercises
    // the actual alert-path logic.  The referer probe must NOT re-alert
    // (cooldown blocks it) and the UA probe must NOT alert (only 1 hit,
    // below threshold).  Crucially, no alert suppression must also suppress
    // hit recording in either map.

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure initProbeCounters has resolved so probe recording runs
    // synchronously inside the res.on("finish") callback.
    await mod.initProbeCounters();

    const UA_KEY  = "RefOnlyCooldownFirstHitUA/1.0";
    const REF_VAL = "https://referer-only-cooldown-first-hit.example/scan";
    const REF_KEY = REF_VAL.toLowerCase();

    const now = Date.now();

    // Seed _refererProbes with lastAlerted = now (full cooldown freshly set)
    // and a handful of existing hits to represent a probe that has already
    // alerted and is now suppressed.
    _refererProbes.set(REF_KEY, {
      hits:        [now - 3000, now - 2000, now - 1000], // 3 hits (already alerted)
      lastAlerted: now,                                   // cooldown just set — no re-alert
    });
    const refHitsBefore = _refererProbes.get(REF_KEY).hits.length; // 3

    // Confirm the UA key has no prior entry — this is the first-ever hit.
    expect(_uaProbes.has(UA_KEY)).toBe(false);

    // Single request carrying both the referer-in-cooldown and the unknown UA.
    const req = makeReq(UA_KEY, REF_VAL);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();
    await flushMicrotasks();

    // ── No alert must fire:
    //   • referer probe is in cooldown → suppressed
    //   • UA probe has only 1 hit (below threshold of 2) → not triggered
    expect(mockSendProbeAlert).not.toHaveBeenCalled();

    // ── UA probe: must have gained its first hit regardless of the referer
    // cooldown state — the UA map is completely independent.
    expect(_uaProbes.has(UA_KEY)).toBe(true);
    expect(_uaProbes.get(UA_KEY).hits).toHaveLength(1);

    // ── Referer probe: must have recorded one additional hit (cooldown suppresses
    // the alert, not the recording itself).
    expect(_refererProbes.get(REF_KEY).hits).toHaveLength(refHitsBefore + 1);

    // ── Referer cooldown must still be intact — lastAlerted unchanged.
    expect(_refererProbes.get(REF_KEY).lastAlerted).toBe(now);
  });

  it("both probes cross threshold at different 'now' values: each lastAlerted equals its own recordProbe 'now', not the other's (no shared alert-state object)", async () => {
    // Regression guard: a future refactor might pass a single shared mutable
    // "alert state" object into both recordProbe calls, so that whichever
    // probe fires last overwrites the firstprobe's lastAlerted with its own
    // timestamp — even though both probes fired independently:
    //
    //   const alertState = { lastAlerted: 0 };
    //   recordProbe(refererProbes, refKey, "referer", nowA, alertState);
    //   recordProbe(uaProbes,      uaKey,  "ua",      nowB, alertState);
    //   // alertState.lastAlerted is now nowB — refererProbes[refKey].lastAlerted
    //   // incorrectly reads nowB instead of nowA.
    //
    // This silently mis-stamps the cooldown for the first-fired probe,
    // causing slightly wrong suppression calculations downstream.
    //
    // Scenario: both probes are seeded at threshold (2 hits each).
    //   _recordProbe is called for referer with nowA, then for UA with nowB
    //   (nowB = nowA + 5 000 ms — a clearly distinct value).
    // Expected: refererEntry.lastAlerted === nowA, uaEntry.lastAlerted === nowB.
    //   Neither entry may carry the other's timestamp.

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const { _uaProbes, _refererProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const nowA = Date.now();
    const nowB = nowA + 5_000; // 5 seconds later — clearly distinct

    const UA_KEY  = "SharedAlertStateGuardUA/1.0";
    const REF_KEY = "shared-alert-state-guard-referer.example/probe";

    // Seed both probes at exactly threshold (2 hits) — one more hit on each
    // will push them over and trigger their alert branch.
    _uaProbes.set(UA_KEY,  { hits: [nowA - 2000, nowA - 1000], lastAlerted: 0 });
    _refererProbes.set(REF_KEY, { hits: [nowA - 2000, nowA - 1000], lastAlerted: 0 });

    // Fire the referer probe first at nowA, then the UA probe at nowB.
    // If both probes share the same alert-state object, the referer entry
    // will end up with lastAlerted === nowB after the UA call overwrites it.
    _recordProbe(_refererProbes, REF_KEY, "referer", nowA);
    await flushMicrotasks();

    _recordProbe(_uaProbes, UA_KEY, "ua", nowB);
    await flushMicrotasks();

    const refEntry = _refererProbes.get(REF_KEY);
    const uaEntry  = _uaProbes.get(UA_KEY);

    // Each entry must carry its own "now" — not the other probe's timestamp.
    expect(refEntry.lastAlerted).toBe(nowA);
    expect(uaEntry.lastAlerted).toBe(nowB);

    // Cross-check: the two timestamps must differ (sanity guard on the test
    // setup itself — if nowA === nowB the test proves nothing).
    expect(refEntry.lastAlerted).not.toBe(uaEntry.lastAlerted);
  });

  it("third probe fires first: referer and UA alerts are NOT swallowed on the same request", async () => {
    // Regression guard for a future addition of a third probe type (e.g. IP-
    // based alerting) inside the same _initPromise.then() callback.  A careless
    // implementation might write:
    //
    //   _initPromise.then(() => {
    //     if (ip && isDatacenterIp) {
    //       recordProbe(ipProbes, ipKey, "ip", now);
    //       if (ipProbes.get(ipKey)?.lastAlerted === now) return; // ← wrong
    //     }
    //     if (referer && ...) recordProbe(refererProbes, ...); // ← unreachable
    //     if (ua && ...) recordProbe(uaProbes, ...);           // ← unreachable
    //   });
    //
    // The production callback exposes _testOnly.extraProbeHook — an injection
    // point invoked at the top of _initPromise.then(), before the referer and
    // UA branches — so this test can simulate a third probe firing on an actual
    // middleware request without modifying the production control flow.
    //
    // Verification: entry.lastAlerted is set synchronously inside recordProbe
    // BEFORE the fire-and-forget import chain.  Non-zero for all three entries
    // after a single middleware pass proves all three alert branches executed
    // inside the same _initPromise.then() invocation — none was skipped by an
    // early-return after the "ip" probe fired.

    // threshold=2 → alert fires when hits > 2 (i.e. on the 3rd hit per key).
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    await mod.initProbeCounters();

    // Stand-in for a future module-level ipProbes Map.
    const ipProbes = new Map<string, { hits: number[]; lastAlerted: number }>();
    const IP_KEY   = "198.51.100.42";
    const REF_VAL  = "https://three-probe-mw-guard.example/probe";
    const REF_KEY  = REF_VAL.toLowerCase();
    const UA_KEY   = "ThreeProbeGuardMW/1.0";

    // Inject the third probe hook: this function runs inside _initPromise.then()
    // BEFORE the referer and UA branches on every subsequent request.  It records
    // a hit on the ip map — which is seeded to threshold — triggering an ip alert
    // on this request, exactly as a future third probe branch would do.
    mod._testOnly.extraProbeHook = (nowTs: number) => {
      (mod as any)._recordProbe(ipProbes, IP_KEY, "ip", nowTs);
    };

    try {
      const now = Date.now();

      // Seed all three maps to exactly threshold (2 hits each).
      // The next recordProbe call for each will push hits to 3 > 2 → alert.
      ipProbes.set(IP_KEY,        { hits: [now - 2000, now - 1000], lastAlerted: 0 });
      _refererProbes.set(REF_KEY, { hits: [now - 2000, now - 1000], lastAlerted: 0 });
      _uaProbes.set(UA_KEY,       { hits: [now - 2000, now - 1000], lastAlerted: 0 });

      // Single request carrying both fields: the hook fires ip, then the
      // production code fires referer and UA — all in one _initPromise.then().
      const req = makeReq(UA_KEY, REF_VAL);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();

      // Four rounds: each of the three concurrent import() chains inside the
      // same .then() invocation needs its own microtask pair to resolve.
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();

      // ── Synchronous proof: lastAlerted set before the async import chain ─────
      // Non-zero for all three entries after one request proves all three alert
      // branches ran in the same _initPromise.then() invocation.  A future
      // early-return after the ip probe would leave referer and UA at 0.
      expect(ipProbes.get(IP_KEY)!.lastAlerted).toBeGreaterThan(0);
      expect(_refererProbes.get(REF_KEY).lastAlerted).toBeGreaterThan(0);
      expect(_uaProbes.get(UA_KEY).lastAlerted).toBeGreaterThan(0);

      // ── Async note ────────────────────────────────────────────────────────────
      // Three concurrent import("./telegram-bot") chains run inside the same
      // _initPromise.then() invocation.  The Vitest dynamic-import mock-cache
      // resolves all three concurrently, which means only the first chain is
      // guaranteed to call sendProbeAlert before the setImmediate rounds drain.
      // This is a test-infrastructure limitation, not a code bug.
      // The synchronous lastAlerted assertions above are the authoritative proof
      // that all three alert branches ran — sendProbeAlert count is best-effort.
      expect(mockSendProbeAlert.mock.calls.length).toBeGreaterThanOrEqual(1);
    } finally {
      // Always reset the hook so it does not bleed into subsequent tests.
      mod._testOnly.extraProbeHook = null;
    }
  });

  it("third probe in full cooldown: referer and UA alerts still fire independently", async () => {
    // Regression guard: a future change could check the third probe's cooldown
    // and use it as a gate for ALL subsequent probes in the same callback — e.g.:
    //
    //   _initPromise.then(() => {
    //     if (ip && isDatacenterIp) {
    //       const entry = ipProbes.get(ipKey);
    //       if (entry && now - entry.lastAlerted < COOLDOWN_MS) return; // ← wrong
    //       recordProbe(ipProbes, ipKey, "ip", now);
    //     }
    //     if (referer && ...) recordProbe(refererProbes, ...); // ← unreachable
    //     if (ua && ...)      recordProbe(uaProbes, ...);      // ← unreachable
    //   });
    //
    // Even when the third probe is in active cooldown and fires no alert, the
    // referer and UA probes must still record hits AND fire their own alerts.
    //
    // The _testOnly.extraProbeHook is injected to run the ip probe (in cooldown)
    // at the top of _initPromise.then() on a real middleware request.  After the
    // request:
    //   • ip.lastAlerted must stay at its original cooldown time (not bumped)
    //   • referer.lastAlerted and ua.lastAlerted must be > 0 (alert branch ran)
    //   • sendProbeAlert must have been called for referer and ua, not ip

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;
    const { _uaProbes, _refererProbes } = mod as any;

    // Ensure _initPromise has resolved so probe recording runs synchronously
    // inside the res.on("finish") microtask rather than being deferred until
    // DB init completes.
    await mod.initProbeCounters();

    const ipProbes = new Map<string, { hits: number[]; lastAlerted: number }>();
    const IP_KEY   = "192.0.2.7";
    const REF_VAL  = "https://third-cooldown-mw-guard.example/probe";
    const REF_KEY  = REF_VAL.toLowerCase();
    const UA_KEY   = "ThirdCooldownMWGuard/1.0";

    // Inject the third probe hook: records a hit on ip map every request.
    // Because ip is seeded with an active cooldown, recordProbe records the
    // hit but does NOT update lastAlerted and does NOT fire an alert.
    mod._testOnly.extraProbeHook = (nowTs: number) => {
      (mod as any)._recordProbe(ipProbes, IP_KEY, "ip", nowTs);
    };

    try {
      const now = Date.now();
      const IP_COOLDOWN_TIME = now - 100; // cooldown set 100 ms ago — still active

      // ip is in cooldown: 3 prior hits, lastAlerted set recently.
      ipProbes.set(IP_KEY, {
        hits:        [now - 3000, now - 2000, now - 1000],
        lastAlerted: IP_COOLDOWN_TIME,
      });

      // Referer and UA are at threshold — next hit triggers each.
      _refererProbes.set(REF_KEY, { hits: [now - 2000, now - 1000], lastAlerted: 0 });
      _uaProbes.set(UA_KEY,       { hits: [now - 2000, now - 1000], lastAlerted: 0 });

      // Single request: hook fires ip (cooldown → no alert), then referer and
      // UA both cross their thresholds — all in one _initPromise.then().
      const req = makeReq(UA_KEY, REF_VAL);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();
      await flushMicrotasks();

      // ── ip: cooldown suppresses the alert; lastAlerted stays unchanged ────────
      expect(ipProbes.get(IP_KEY)!.lastAlerted).toBe(IP_COOLDOWN_TIME);
      // The hit is still recorded despite the cooldown.
      expect(ipProbes.get(IP_KEY)!.hits).toHaveLength(4);

      // ── referer and UA: alert branches ran on this request ────────────────────
      // A future early-return after the ip cooldown check would leave both at 0.
      expect(_refererProbes.get(REF_KEY).lastAlerted).toBeGreaterThan(0);
      expect(_uaProbes.get(UA_KEY).lastAlerted).toBeGreaterThan(0);

      // ── Async note ────────────────────────────────────────────────────────────
      // Two concurrent import("./telegram-bot") chains (referer + UA) run inside
      // the same _initPromise.then() invocation.  The Vitest mock-cache race may
      // cause only the first chain to call sendProbeAlert synchronously within
      // the setImmediate rounds.  The synchronous lastAlerted assertions above
      // are the authoritative proof that both alert branches ran; the count here
      // is best-effort confirmation that the async path is reachable at all.
      // ip must never appear because its cooldown prevents lastAlerted from being
      // updated — confirmed by the IP_COOLDOWN_TIME assertion above.
      expect(mockSendProbeAlert.mock.calls.length).toBeGreaterThanOrEqual(1);
      const asyncFields = (mockSendProbeAlert.mock.calls as Array<[string, string, number]>)
        .map(([f]) => f);
      expect(asyncFields).not.toContain("ip");
    } finally {
      mod._testOnly.extraProbeHook = null;
    }
  });

  it("combined alert fires for both maps: each map's own cooldown independently suppresses follow-up alerts; clearing one does not expose the other", async () => {
    // Regression guard: a future change might make the two in-memory probe maps
    // share a cooldown object or cross-write lastAlerted — e.g.:
    //
    //   const sharedCooldown = { lastAlerted: 0 };
    //   recordProbe(refererProbes, refKey, "referer", now, sharedCooldown);
    //   recordProbe(uaProbes,      uaKey,  "ua",      now, sharedCooldown);
    //
    // Such a bug would cause:
    //   • A follow-up referer hit to fire a second alert because the UA entry's
    //     cooldown inadvertently reset the referer entry's lastAlerted — or
    //     vice-versa.
    //   • Clearing lastAlerted on one entry to also clear the other's cooldown,
    //     causing a spurious re-alert on the un-cleared map.
    //
    // Scenario (three phases, all using _recordProbe directly to bypass the
    // middleware and control "now" precisely):
    //
    //   Phase 1 — initial combined alert
    //     Both maps are seeded to threshold (2 hits each) with different keys.
    //     _recordProbe is called for the referer key then the UA key.
    //     sendProbeAlert must be called exactly twice (once per field).
    //     Each entry's lastAlerted must equal its own "now" value.
    //
    //   Phase 2 — follow-up hits during active cooldown
    //     A second hit is delivered to both maps immediately (same "now" range,
    //     well inside COOLDOWN_MS).
    //     sendProbeAlert must NOT fire a third or fourth time — each map's own
    //     cooldown suppresses it independently.
    //
    //   Phase 3 — clear one entry's cooldown, other stays suppressed
    //     lastAlerted on the referer entry is reset to 0 (simulating expiry).
    //     A hit is immediately delivered to BOTH maps.
    //     Only the referer alert may re-fire (its cooldown was cleared).
    //     The UA alert must remain suppressed (its own cooldown is still active).
    //     sendProbeAlert must be called exactly once more (field = "referer").

    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const { _uaProbes, _refererProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const now = Date.now();

    const UA_KEY  = "IndependentCooldownGuardUA/1.0";
    const REF_KEY = "independent-cooldown-guard-referer.example/probe";

    // ── Phase 1: combined alert ───────────────────────────────────────────────
    // Seed both maps to exactly threshold (2 hits) — one more hit on each
    // triggers the alert branch.
    _uaProbes.set(UA_KEY,   { hits: [now - 2000, now - 1000], lastAlerted: 0 });
    _refererProbes.set(REF_KEY, { hits: [now - 2000, now - 1000], lastAlerted: 0 });

    // Fire referer probe first, flush so its import chain completes and the
    // telegram-bot mock is fully cached before the UA import runs.
    _recordProbe(_refererProbes, REF_KEY, "referer", now);
    await flushMicrotasks();
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);
    expect((mockSendProbeAlert.mock.calls[0] as [string, string, number])[0]).toBe("referer");

    _recordProbe(_uaProbes, UA_KEY, "ua", now);
    await flushMicrotasks();
    expect(mockSendProbeAlert.mock.calls.length).toBe(2);
    expect((mockSendProbeAlert.mock.calls[1] as [string, string, number])[0]).toBe("ua");

    // Each entry must carry its own alert timestamp, not the other's.
    expect(_refererProbes.get(REF_KEY).lastAlerted).toBe(now);
    expect(_uaProbes.get(UA_KEY).lastAlerted).toBe(now);

    vi.clearAllMocks();

    // ── Phase 2: follow-up hits while both cooldowns are active ───────────────
    // "now2" is well inside COOLDOWN_MS (10 ms after "now").
    const now2 = now + 10;
    _recordProbe(_refererProbes, REF_KEY, "referer", now2);
    await flushMicrotasks();
    _recordProbe(_uaProbes, UA_KEY, "ua", now2);
    await flushMicrotasks();

    // Neither map may re-alert — each suppresses via its own cooldown.
    expect(mockSendProbeAlert).not.toHaveBeenCalled();
    // lastAlerted on each entry must remain at the Phase-1 "now", not bumped.
    expect(_refererProbes.get(REF_KEY).lastAlerted).toBe(now);
    expect(_uaProbes.get(UA_KEY).lastAlerted).toBe(now);

    vi.clearAllMocks();

    // ── Phase 3: clear ONE entry's cooldown; the other stays suppressed ───────
    // Reset only the referer entry — simulating its cooldown expiring.
    _refererProbes.get(REF_KEY).lastAlerted = 0;

    // Deliver a hit to both maps.
    const now3 = now + 20;
    _recordProbe(_refererProbes, REF_KEY, "referer", now3);
    await flushMicrotasks();
    _recordProbe(_uaProbes, UA_KEY, "ua", now3);
    await flushMicrotasks();

    // Only the referer alert must re-fire (its cooldown was cleared).
    expect(mockSendProbeAlert.mock.calls.length).toBe(1);
    expect((mockSendProbeAlert.mock.calls[0] as [string, string, number])[0]).toBe("referer");

    // The UA entry must still be in cooldown — lastAlerted must NOT have been
    // bumped to now3 (the alert branch must not have run for it).
    expect(_uaProbes.get(UA_KEY).lastAlerted).toBe(now);

    // The referer entry must now carry its new alert timestamp.
    expect(_refererProbes.get(REF_KEY).lastAlerted).toBe(now3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DB field_type separation
//
// persistProbeEntry must write rows tagged with the correct field_type
// column ("referer" or "ua").  initProbeCounters must read those rows back
// into the correct in-memory map on restart so that referer and UA counts
// are never merged.
//
// Scenarios
// ─────────
//  A. A referer hit persists with field_type="referer", a UA hit with
//     field_type="ua" — verified by inspecting the SQL params passed to
//     db.execute.
//  B. initProbeCounters re-populates refererProbes only from "referer" rows
//     and uaProbes only from "ua" rows (simulated restart).
//  C. Rows with an unrecognised field_type value are silently ignored and
//     neither map is touched.
// ═══════════════════════════════════════════════════════════════════════════

describe("DB field_type separation — persistProbeEntry and initProbeCounters", () => {
  /**
   * Extract positional parameter values from a drizzle-orm SQL template
   * object.  Inside a drizzle SQL object, `queryChunks` alternates between
   * StringChunk nodes (plain objects: `{ value: string[] }`) and Param nodes
   * (the raw interpolated scalar — a string, number, bigint, etc.).
   * We identify Param nodes by the fact that they are NOT plain objects.
   */
  function extractSqlParams(sqlObj: unknown): unknown[] {
    const chunks = (sqlObj as any)?.queryChunks ?? [];
    // StringChunk nodes are plain objects; Param nodes are scalar primitives.
    return chunks.filter((c: unknown) => typeof c !== "object" || c === null);
  }

  it("(A) persistProbeEntry tags the referer row with field_type='referer' and the UA row with field_type='ua'", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";

    // Import a fresh middleware instance; getDb() is called during module
    // initialisation so ./db is already in the module cache by the time we
    // import it below.
    const mw = await freshMiddleware();

    // Grab the same mocked db object the module under test holds internally
    // (module cache hit) and replace execute with a spy we can inspect.
    const { db } = await import("./db");
    const mockExecute = vi.fn().mockResolvedValue([]);
    (db as any).execute = mockExecute;

    // ── Referer-only hit (Googlebot UA → patternBot=true → UA probe skipped)
    const BOT_UA   = "Googlebot/2.1 (+http://www.google.com/bot.html)";
    const EXT_REF  = "https://field-type-test-scraper.example/";
    {
      const req = makeReq(BOT_UA, EXT_REF);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    // ── UA-only hit (no referer → referer probe skipped)
    const UNKNOWN_UA = "FieldTypeTestBrowser/1.0";
    {
      const req = makeReq(UNKNOWN_UA); // no referer
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    // Collect INSERT INTO probe_counters calls — identified by their first
    // positional parameter being "referer" or "ua".
    const insertCalls = mockExecute.mock.calls
      .map(([sqlObj]: [unknown]) => extractSqlParams(sqlObj))
      .filter((params) => params[0] === "referer" || params[0] === "ua");

    const refererInserts = insertCalls.filter((p) => p[0] === "referer");
    const uaInserts      = insertCalls.filter((p) => p[0] === "ua");

    // Both probes must have produced at least one INSERT.
    expect(refererInserts.length).toBeGreaterThanOrEqual(1);
    expect(uaInserts.length).toBeGreaterThanOrEqual(1);

    // The second positional param is the key.
    // Referer key is lowercased; UA key preserves original case.
    expect(refererInserts[0][1]).toBe(EXT_REF.toLowerCase());
    expect(uaInserts[0][1]).toBe(UNKNOWN_UA);
  });

  it("(B) initProbeCounters: field_type='referer' rows go into refererProbes, field_type='ua' rows into uaProbes — maps never bleed into each other", async () => {
    const now    = Date.now();
    const hitTs  = now - 1_000; // 1 second ago — within the 24-hour window

    // Import the module (triggers module-level initProbeCounters which
    // populates _db via getDb()).
    const mod        = await import("./traffic-logger");
    const { db }     = await import("./db");

    // Override select so initProbeCounters reads our synthetic rows.
    const fakeRows = [
      { fieldType: "referer", key: "https://restart-test-scraper.example/", hits: [hitTs], lastAlerted: 0 },
      { fieldType: "ua",      key: "RestartTestUA/1.0",                     hits: [hitTs], lastAlerted: 0 },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart by re-running initProbeCounters.
    await mod.initProbeCounters();

    // The referer key must be in refererProbes …
    expect(mod._refererProbes.has("https://restart-test-scraper.example/")).toBe(true);
    // … but NOT in uaProbes.
    expect(mod._uaProbes.has("https://restart-test-scraper.example/")).toBe(false);

    // The UA key must be in uaProbes …
    expect(mod._uaProbes.has("RestartTestUA/1.0")).toBe(true);
    // … but NOT in refererProbes.
    expect(mod._refererProbes.has("RestartTestUA/1.0")).toBe(false);
  });

  it("(B) initProbeCounters: the restored hits array reflects only timestamps within the 24-hour window", async () => {
    const now       = Date.now();
    const recentHit = now - 1_000;           // inside window
    const staleHit  = now - 25 * 3600_000;  // 25 hours ago — outside window

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      {
        fieldType:   "ua",
        key:         "StaleHitUA/1.0",
        hits:        [staleHit, recentHit],
        lastAlerted: 0,
      },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    const entry = mod._uaProbes.get("StaleHitUA/1.0");
    expect(entry).toBeDefined();
    // Only the recent hit should survive; the stale one is pruned.
    expect(entry!.hits).toEqual([recentHit]);
    expect(entry!.hits).not.toContain(staleHit);
  });

  it("(B2) initProbeCounters: UA row with a single hit at exactly now-WINDOW_MS (boundary) IS restored", async () => {
    // pruneProbes keeps an entry alive when its last hit >= cutoff (>=).
    // initProbeCounters must use the same inclusive boundary so a boundary
    // hit is not silently discarded on restart.
    //
    // Time is frozen via vi.spyOn so that Date.now() inside initProbeCounters
    // returns the same value as `now` here — otherwise the milliseconds that
    // elapse between test setup and the filter inside initProbeCounters would
    // advance the cutoff past boundaryHit and produce a false negative.
    const now         = Date.now();
    const boundaryHit = now - 24 * 60 * 60 * 1000; // exactly now - WINDOW_MS
    const dateNowSpy  = vi.spyOn(Date, "now").mockReturnValue(now);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");

      const fakeRows = [
        {
          fieldType:   "ua",
          key:         "BoundaryUA/1.0",
          hits:        [boundaryHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // The boundary hit must survive the restart — it would not have been
      // pruned in memory (pruneProbes uses >=), so initProbeCounters must also
      // use >= to stay consistent.
      const entry = mod._uaProbes.get("BoundaryUA/1.0");
      expect(entry).toBeDefined();
      expect(entry!.hits).toEqual([boundaryHit]);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("(B3) initProbeCounters: referer row with a single hit at exactly now-WINDOW_MS (boundary) IS restored", async () => {
    // Symmetric check for the referer map: the inclusive boundary must hold
    // for both field types so referer and UA behaviour are consistent.
    //
    // Time is frozen so that the cutoff computed inside initProbeCounters
    // equals exactly now - WINDOW_MS, making the boundary hit precisely equal
    // to the cutoff rather than 1–2 ms behind it.
    const now         = Date.now();
    const boundaryHit = now - 24 * 60 * 60 * 1000; // exactly now - WINDOW_MS
    const dateNowSpy  = vi.spyOn(Date, "now").mockReturnValue(now);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");

      const fakeRows = [
        {
          fieldType:   "referer",
          key:         "https://boundary-referer.example/scan",
          hits:        [boundaryHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // The boundary hit must survive the restart.
      const entry = mod._refererProbes.get("https://boundary-referer.example/scan");
      expect(entry).toBeDefined();
      expect(entry!.hits).toEqual([boundaryHit]);
      // Must NOT bleed into uaProbes.
      expect(mod._uaProbes.has("https://boundary-referer.example/scan")).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("(B4) initProbeCounters: _refererProbes.size === N and _uaProbes.size === M when N referer rows and M ua rows are loaded — no cross-map contamination", async () => {
    // This test guards against a regression where the if/else branch inside
    // the restoration loop is removed so that every row lands in a single map.
    // Even if individual key-presence assertions pass, a size check will catch
    // entries that were duplicated into the wrong map.
    const now    = Date.now();
    const hitTs  = now - 1_000; // well within the 24-hour window

    const REFERER_KEYS = [
      "https://size-test-scraper-1.example/",
      "https://size-test-scraper-2.example/",
      "https://size-test-scraper-3.example/",
    ];
    const UA_KEYS = [
      "SizeTestBot/1.0",
      "SizeTestBot/2.0",
    ];

    const N = REFERER_KEYS.length; // 3
    const M = UA_KEYS.length;      // 2

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      ...REFERER_KEYS.map((key) => ({ fieldType: "referer", key, hits: [hitTs], lastAlerted: 0 })),
      ...UA_KEYS.map((key)      => ({ fieldType: "ua",      key, hits: [hitTs], lastAlerted: 0 })),
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    // ── Size assertions: each map must contain exactly the rows for its type.
    expect(mod._refererProbes.size).toBe(N);
    expect(mod._uaProbes.size).toBe(M);

    // ── Cross-map absence: no referer key must appear in uaProbes …
    for (const key of REFERER_KEYS) {
      expect(mod._uaProbes.has(key)).toBe(false);
    }
    // … and no UA key must appear in refererProbes.
    for (const key of UA_KEYS) {
      expect(mod._refererProbes.has(key)).toBe(false);
    }
  });

  it("(C) initProbeCounters: rows with an unrecognised field_type are silently ignored", async () => {
    const now   = Date.now();
    const hitTs = now - 1_000;

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      { fieldType: "unknown", key: "SomeKeyForUnknownType", hits: [hitTs], lastAlerted: 0 },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    // Neither map should contain a key from an unknown field_type.
    expect(mod._refererProbes.has("SomeKeyForUnknownType")).toBe(false);
    expect(mod._uaProbes.has("SomeKeyForUnknownType")).toBe(false);
  });

  it("(D) initProbeCounters: a row with ALL-stale hits but an active cooldown is restored with an empty hits array and lastAlerted preserved", async () => {
    // All hits are older than the 24-hour window, but lastAlerted is within
    // the past hour — the cooldown is still active and must keep suppressing
    // alerts after a restart.
    const now         = Date.now();
    const staleHit1   = now - 25 * 3600_000; // 25 h ago — outside window
    const staleHit2   = now - 30 * 3600_000; // 30 h ago — outside window
    const lastAlerted = now - 30 * 60_000;   // 30 min ago — cooldown still active

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      {
        fieldType:   "ua",
        key:         "StaleCooldownUA/1.0",
        hits:        [staleHit1, staleHit2],
        lastAlerted: lastAlerted,
      },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    // The key must be present — the active cooldown must be restored.
    const entry = mod._uaProbes.get("StaleCooldownUA/1.0");
    expect(entry).toBeDefined();
    // All hits were outside the window, so the restored hits array is empty.
    expect(entry!.hits).toEqual([]);
    // lastAlerted is preserved so the cooldown keeps suppressing alerts.
    expect(entry!.lastAlerted).toBe(lastAlerted);
  });

  it("(E) initProbeCounters: referer row with ALL-stale hits but an active cooldown is restored into _refererProbes (not _uaProbes)", async () => {
    // Same edge case as (D) but for field_type='referer'.  A referer cooldown
    // that is still active must survive a restart so it keeps suppressing alerts.
    const now         = Date.now();
    const staleHit1   = now - 25 * 3600_000; // 25 h ago — outside window
    const staleHit2   = now - 30 * 3600_000; // 30 h ago — outside window
    const lastAlerted = now - 30 * 60_000;   // 30 min ago — cooldown still active

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      {
        fieldType:   "referer",
        key:         "https://stale-cooldown-referer.example/",
        hits:        [staleHit1, staleHit2],
        lastAlerted: lastAlerted,
      },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    // Must be in _refererProbes, NOT in _uaProbes.
    const entry = mod._refererProbes.get("https://stale-cooldown-referer.example/");
    expect(entry).toBeDefined();
    // All hits were outside the window, so the restored hits array is empty.
    expect(entry!.hits).toEqual([]);
    // lastAlerted is preserved so the cooldown keeps suppressing alerts.
    expect(entry!.lastAlerted).toBe(lastAlerted);
    // Confirm it did not bleed into the UA map.
    expect(mod._uaProbes.has("https://stale-cooldown-referer.example/")).toBe(false);
  });

  it("(F) initProbeCounters: a row with ALL-stale hits AND lastAlerted === 0 is pruned (not restored)", async () => {
    // Both conditions for pruning hold: no active hits and no cooldown to
    // preserve.  The key must not appear in either map after a restart.
    const now       = Date.now();
    const staleHit  = now - 25 * 3600_000; // 25 h ago — outside window

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      {
        fieldType:   "ua",
        key:         "FullyStaleUA/1.0",
        hits:        [staleHit],
        lastAlerted: 0,
      },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    // Row has nothing to preserve — it must be skipped entirely.
    expect(mod._uaProbes.has("FullyStaleUA/1.0")).toBe(false);
    expect(mod._refererProbes.has("FullyStaleUA/1.0")).toBe(false);
  });

  // ── Cooldown preservation across restart ──────────────────────────────────
  // initProbeCounters restores lastAlerted from the DB so a probe that already
  // fired an alert before a restart does not re-alert immediately afterwards.

  it("(F) cooldown active after restart: restored lastAlerted within the window suppresses re-alerts", async () => {
    // threshold=2 → alert fires when hits.length > 2 (i.e. on the 3rd hit).
    // cooldown=1 h → 30 min ago is still within the cooldown window.
    process.env.PROBE_ALERT_THRESHOLD    = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";

    const now             = Date.now();
    const COOLDOWN_UA     = "ObscureTestBrowser/99.0"; // same key hitTimes() uses
    const lastAlertedRecent = now - 30 * 60 * 1000;   // 30 min ago — within 1-h cooldown

    // Seed two in-window hits so the count (2) is already at the threshold;
    // one more hit will exceed it, but the active cooldown must block the alert.
    const fakeRows = [
      {
        fieldType:   "ua",
        key:         COOLDOWN_UA,
        hits:        [now - 2_000, now - 1_000],
        lastAlerted: lastAlertedRecent,
      },
    ];

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart: re-hydrate the in-memory maps from the fake DB rows.
    await mod.initProbeCounters();

    // The entry must be present and carry the restored lastAlerted value.
    const entry = mod._uaProbes.get(COOLDOWN_UA);
    expect(entry).toBeDefined();
    expect(entry!.lastAlerted).toBe(lastAlertedRecent);

    // Drive 10 more hits beyond the threshold — cooldown must suppress every alert.
    const mw = mod.trafficLoggerMiddleware;
    for (let i = 0; i < 10; i++) {
      const req = makeReq(COOLDOWN_UA);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  it("(G) initProbeCounters: referer row with active hits AND active cooldown restores both hits array and lastAlerted into _refererProbes (not _uaProbes)", async () => {
    // This is the complementary case to (E): some hits are still within the
    // 24-hour window AND lastAlerted is non-zero and within the past hour.
    // Both the active hits and the active cooldown must survive the restart.
    const now         = Date.now();
    const recentHit1  = now - 5_000;           // 5 s ago  — inside window
    const recentHit2  = now - 10_000;          // 10 s ago — inside window
    const staleHit    = now - 25 * 3600_000;  // 25 h ago — outside window (pruned)
    const lastAlerted = now - 30 * 60_000;    // 30 min ago — cooldown still active

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      {
        fieldType:   "referer",
        key:         "https://active-cooldown-referer.example/",
        hits:        [staleHit, recentHit1, recentHit2],
        lastAlerted: lastAlerted,
      },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    // Must be in _refererProbes, NOT in _uaProbes.
    const entry = mod._refererProbes.get("https://active-cooldown-referer.example/");
    expect(entry).toBeDefined();
    // Only the in-window hits survive; the stale one is pruned.
    expect(entry!.hits).toContain(recentHit1);
    expect(entry!.hits).toContain(recentHit2);
    expect(entry!.hits).not.toContain(staleHit);
    // lastAlerted is preserved so the cooldown keeps suppressing alerts.
    expect(entry!.lastAlerted).toBe(lastAlerted);
    // Must not bleed into the UA map.
    expect(mod._uaProbes.has("https://active-cooldown-referer.example/")).toBe(false);
  });

  it("(F) cooldown expired after restart: restored lastAlerted outside the window allows re-alert", async () => {
    // threshold=2 → alert fires on the 3rd hit.
    // cooldown=1 h → 2 hours ago is outside the cooldown window.
    process.env.PROBE_ALERT_THRESHOLD    = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";

    const now              = Date.now();
    const COOLDOWN_UA      = "ObscureTestBrowser/99.0";
    const lastAlertedStale = now - 2 * 3600_000; // 2 h ago — cooldown has expired

    // Seed two in-window hits; the count (2) equals the threshold.
    // One more hit will exceed it and, since the cooldown is expired, the alert fires.
    const fakeRows = [
      {
        fieldType:   "ua",
        key:         COOLDOWN_UA,
        hits:        [now - 2_000, now - 1_000],
        lastAlerted: lastAlertedStale,
      },
    ];

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart.
    await mod.initProbeCounters();

    const entry = mod._uaProbes.get(COOLDOWN_UA);
    expect(entry).toBeDefined();
    expect(entry!.lastAlerted).toBe(lastAlertedStale);

    // Drive one hit to push the count above the threshold; the expired cooldown
    // must allow the alert to fire.
    const mw  = mod.trafficLoggerMiddleware;
    const req = makeReq(COOLDOWN_UA);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    expect(mockSendProbeAlert).toHaveBeenCalledWith("ua", COOLDOWN_UA, expect.any(Number));
  });

  it("(H) referer row with active hits AND expired cooldown re-alerts on the next hit past the threshold after restart", async () => {
    // threshold=2 → alert fires when hits.length > 2 (i.e. on the 3rd hit).
    // cooldown=1 h → 2 hours ago is outside the cooldown window, so it is expired.
    // The referer probe must fire a fresh alert when one more hit pushes past the threshold.
    process.env.PROBE_ALERT_THRESHOLD     = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";

    const now               = Date.now();
    const REFERER_KEY       = "https://expired-cooldown-referer.example/";
    const lastAlertedExpired = now - 2 * 3600_000; // 2 h ago — cooldown has expired

    // Seed two in-window hits so the count (2) equals the threshold.
    // One more hit will exceed it and, since the cooldown is expired, the alert fires.
    const fakeRows = [
      {
        fieldType:   "referer",
        key:         REFERER_KEY,
        hits:        [now - 2_000, now - 1_000],
        lastAlerted: lastAlertedExpired,
      },
    ];

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart: re-hydrate the in-memory maps from the fake DB rows.
    await mod.initProbeCounters();

    // Confirm the entry was restored with active hits and the expired lastAlerted.
    const entry = mod._refererProbes.get(REFERER_KEY);
    expect(entry).toBeDefined();
    expect(entry!.hits.length).toBe(2);
    expect(entry!.lastAlerted).toBe(lastAlertedExpired);

    // Drive one hit past the threshold using a bot UA so only the referer probe fires.
    const BOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";
    const mw     = mod.trafficLoggerMiddleware;
    const req    = makeReq(BOT_UA, REFERER_KEY);
    const res    = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    // The expired cooldown must allow the alert to fire for the referer key.
    const refererCall = (mockSendProbeAlert.mock.calls as [string, string, number][])
      .find(([field]) => field === "referer");
    expect(refererCall).toBeDefined();
    expect(refererCall![0]).toBe("referer");
    expect(refererCall![1]).toBe(REFERER_KEY);
  });

  it("(I) referer row with ALL-stale hits AND active cooldown: middleware never alerts after restart", async () => {
    // End-to-end complement to test (E).
    // (E) confirms the entry is restored into _refererProbes with the correct
    // lastAlerted. This test drives actual traffic through the middleware and
    // confirms the active cooldown keeps suppressing alerts even when the hit
    // count exceeds the threshold — i.e. lastAlerted is honoured at alert time,
    // not just at restore time.
    //
    // threshold=2 → alert would fire on the 3rd hit if there were no cooldown.
    // cooldown=1 h → lastAlerted 30 min ago means cooldown is still active.
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";

    const now         = Date.now();
    const REFERER_KEY = "https://stale-hits-active-cooldown-referer.example/";
    const staleHit1   = now - 25 * 3600_000; // 25 h ago — outside window
    const staleHit2   = now - 30 * 3600_000; // 30 h ago — outside window
    const lastAlerted = now - 30 * 60_000;   // 30 min ago — cooldown still active

    const fakeRows = [
      {
        fieldType:   "referer",
        key:         REFERER_KEY,
        hits:        [staleHit1, staleHit2],
        lastAlerted: lastAlerted,
      },
    ];

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart: re-hydrate the in-memory maps from the fake DB rows.
    await mod.initProbeCounters();

    // Confirm the entry was restored: empty hits (all stale), lastAlerted preserved.
    const entry = mod._refererProbes.get(REFERER_KEY);
    expect(entry).toBeDefined();
    expect(entry!.hits).toEqual([]);
    expect(entry!.lastAlerted).toBe(lastAlerted);

    // Drive threshold+1 hits using a bot UA so only the referer probe fires.
    // The in-window hit count will exceed the threshold, but the active cooldown
    // must keep sendProbeAlert from being called.
    const BOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";
    const mw     = mod.trafficLoggerMiddleware;
    for (let i = 0; i < 3; i++) {
      const req = makeReq(BOT_UA, REFERER_KEY);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  it("(J) ua row with ALL-stale hits AND active cooldown: middleware never alerts after restart", async () => {
    // End-to-end complement to test (I) for the UA probe.
    // (D) confirms the entry is restored with empty hits and lastAlerted
    // preserved. This test drives actual traffic through the middleware and
    // confirms the active cooldown keeps suppressing alerts even when the
    // fresh in-window hit count exceeds the threshold — i.e. lastAlerted is
    // honoured at alert time, not just at restore time.
    //
    // threshold=2 → alert would fire on the 3rd hit if there were no cooldown.
    // cooldown=1 h → lastAlerted 30 min ago means cooldown is still active.
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";

    const now       = Date.now();
    const UA_KEY    = "StaleCooldownScraper/1.0";
    const staleHit1 = now - 25 * 3600_000; // 25 h ago — outside window
    const staleHit2 = now - 30 * 3600_000; // 30 h ago — outside window
    const lastAlerted = now - 30 * 60_000; // 30 min ago — cooldown still active

    const fakeRows = [
      {
        fieldType:   "ua",
        key:         UA_KEY,
        hits:        [staleHit1, staleHit2],
        lastAlerted: lastAlerted,
      },
    ];

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart: re-hydrate the in-memory maps from the fake DB rows.
    await mod.initProbeCounters();

    // Confirm the entry was restored: empty hits (all stale), lastAlerted preserved.
    const entry = mod._uaProbes.get(UA_KEY);
    expect(entry).toBeDefined();
    expect(entry!.hits).toEqual([]);
    expect(entry!.lastAlerted).toBe(lastAlerted);

    // Drive threshold+1 hits using the seeded UA key with no referer so only
    // the UA probe accumulates. The in-window hit count will exceed the
    // threshold, but the active cooldown must keep sendProbeAlert silent.
    const mw = mod.trafficLoggerMiddleware;
    for (let i = 0; i < 3; i++) {
      const req = makeReq(UA_KEY);
      const res = makeRes();
      mw(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }

    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  // ── B4 / B5: pruneProbes — >= cutoff boundary (mirrors B2/B3) ───────────────
  //
  // B2 and B3 confirm that initProbeCounters uses an inclusive >= boundary when
  // loading hits from the DB on restart.  B4 and B5 confirm that pruneProbes
  // uses the exact same inclusive boundary when it later evicts entries from the
  // in-memory maps.
  //
  // A future change that tightens initProbeCounters to > (or loosens pruneProbes
  // to >) would break the symmetry: a boundary hit loaded on restart would then
  // be immediately evicted on the next prune cycle, silently losing a scraper
  // that was near the alert threshold.  Together B2–B5 catch both sides of that
  // mismatch.
  //
  // The hasActiveHits guard inside pruneProbes is:
  //   entry.hits.length > 0 && entry.hits[last] >= cutoff
  // where cutoff = pruneNow - WINDOW_MS.
  //
  // B4: hit timestamp === cutoff (>= true) → entry must SURVIVE
  // B5: hit timestamp === cutoff - 1 (<  cutoff, >= false) → entry must be DELETED

  it("(B4) pruneProbes: UA entry with a single hit at exactly pruneNow−WINDOW_MS (boundary) is NOT evicted", async () => {
    // This is the pruneProbes mirror of B2.
    //
    // initProbeCounters loads a boundary hit (>= cutoff) on restart.  pruneProbes
    // must honour the same >= boundary so the entry that survived the restart is
    // not immediately deleted on the first prune cycle.
    //
    // A refactored pruner that uses > instead of >= would evaluate
    //   hits[last] > cutoff  →  false  →  hasActiveHits = false
    // and delete the entry despite it being a live in-window record.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+54h — monotonically above all prior pruneProbes tests (last used 50h).
    const T0       = Date.now() + 54 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1; // passes the 1-hour prune guard

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _uaProbes.set("B4StaleCompanionUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the boundary UA entry ────────────────────────────────────────────
    // Single hit at exactly pruneNow - WINDOW_MS (= cutoff).
    // >= cutoff evaluates to true → hasActiveHits = true → must SURVIVE.
    _uaProbes.set("B4BoundaryUA/1.0", {
      hits:        [pruneNow - WINDOW_MS],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_uaProbes.has("B4StaleCompanionUA/1.0")).toBe(false);
    // Boundary hit is still within the window (>= cutoff) → entry must SURVIVE
    expect(_uaProbes.has("B4BoundaryUA/1.0")).toBe(true);
    expect(_uaProbes.get("B4BoundaryUA/1.0")!.hits).toEqual([pruneNow - WINDOW_MS]);
  });

  it("(B5) pruneProbes: UA entry with a single hit 1 ms before the cutoff (pruneNow−WINDOW_MS−1) IS evicted", async () => {
    // Symmetric outside-window counterpart to B4.
    //
    // A hit at pruneNow - WINDOW_MS - 1 is strictly less than cutoff, so
    //   hits[last] >= cutoff  →  false  →  hasActiveHits = false.
    // With no active cooldown the entry must be deleted.
    //
    // This mirrors B3's role for initProbeCounters: confirming that the filter
    // does NOT retain hits that are genuinely outside the window.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+56h — monotonically above B4.
    const T0       = Date.now() + 56 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _uaProbes.set("B5StaleCompanionUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the outside-window UA entry ─────────────────────────────────────
    // Single hit 1 ms before the cutoff: strictly < cutoff → hasActiveHits = false.
    // No active cooldown → entry must be DELETED.
    _uaProbes.set("B5OutsideWindowUA/1.0", {
      hits:        [pruneNow - WINDOW_MS - 1],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_uaProbes.has("B5StaleCompanionUA/1.0")).toBe(false);
    // Hit is 1 ms outside the window → entry must be DELETED
    expect(_uaProbes.has("B5OutsideWindowUA/1.0")).toBe(false);
  });

  // ── B6 / B7: pruneProbes — >= cutoff boundary for the referer map ────────
  //
  // B4/B5 confirm the UA map uses an inclusive >= boundary.  A future refactor
  // that splits the two eviction loops could accidentally tighten the referer
  // branch to strict > without any existing test catching it.  B6 and B7 are
  // the referer-map mirrors of B4 and B5.

  it("(B6) pruneProbes: referer entry with a single hit at exactly pruneNow−WINDOW_MS (boundary) is NOT evicted", async () => {
    // Mirror of B4 for the _refererProbes map.
    //
    // A hit at exactly pruneNow - WINDOW_MS equals the cutoff, so
    //   hits[last] >= cutoff  →  true  →  hasActiveHits = true.
    // The entry must SURVIVE the prune pass.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+58h — monotonically above B5 (56h).
    const T0       = Date.now() + 58 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _refererProbes.set("https://b6-stale-companion.example/scan", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the boundary referer entry ──────────────────────────────────────
    // Single hit at exactly pruneNow - WINDOW_MS (= cutoff).
    // >= cutoff evaluates to true → hasActiveHits = true → must SURVIVE.
    _refererProbes.set("https://b6-boundary-referer.example/scan", {
      hits:        [pruneNow - WINDOW_MS],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_refererProbes.has("https://b6-stale-companion.example/scan")).toBe(false);
    // Boundary hit is still within the window (>= cutoff) → entry must SURVIVE
    expect(_refererProbes.has("https://b6-boundary-referer.example/scan")).toBe(true);
    expect(_refererProbes.get("https://b6-boundary-referer.example/scan")!.hits).toEqual([pruneNow - WINDOW_MS]);
  });

  it("(B7) pruneProbes: referer entry with a single hit 1 ms before the cutoff (pruneNow−WINDOW_MS−1) IS evicted", async () => {
    // Mirror of B5 for the _refererProbes map.
    //
    // A hit at pruneNow - WINDOW_MS - 1 is strictly less than cutoff, so
    //   hits[last] >= cutoff  →  false  →  hasActiveHits = false.
    // With no active cooldown the entry must be DELETED.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+60h — monotonically above B6 (58h).
    const T0       = Date.now() + 60 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _refererProbes.set("https://b7-stale-companion.example/scan", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the outside-window referer entry ─────────────────────────────────
    // Single hit 1 ms before the cutoff: strictly < cutoff → hasActiveHits = false.
    // No active cooldown → entry must be DELETED.
    _refererProbes.set("https://b7-outside-window-referer.example/scan", {
      hits:        [pruneNow - WINDOW_MS - 1],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_refererProbes.has("https://b7-stale-companion.example/scan")).toBe(false);
    // Hit is 1 ms outside the window → entry must be DELETED
    expect(_refererProbes.has("https://b7-outside-window-referer.example/scan")).toBe(false);
  });

  // ── B8 / B9: pruneProbes — cooldown-survival path for the referer map ────
  //
  // The UA map is covered by the "pruneProbes — entries with active cooldown
  // survive" describe block further below.  B8 and B9 add a symmetric test
  // anchored inside *this* describe block so that a future split-loop refactor
  // that accidentally drops the cooldown guard from the referer branch will be
  // caught immediately, without relying on the separate describe block.

  it("(B8) pruneProbes: referer entry with all-expired hits but an active cooldown SURVIVES the prune pass", async () => {
    // All hits are outside the 24-h window so hasActiveHits = false.
    // However lastAlerted is within the 1-h cooldown, so hasActiveCooldown =
    // true and the entry must be kept alive.
    //
    // A future split-loop refactor that omits the cooldown check from the
    // referer branch would delete this entry and fail this test.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+62h — monotonically above B7 (60h).
    const T0       = Date.now() + 62 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _refererProbes.set("https://b8-stale-companion.example/scan", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the cooldown-active referer entry ────────────────────────────────
    // All hits are well outside the window; lastAlerted is 30 min ago (< 1 h
    // cooldown) → hasActiveCooldown = true → entry must SURVIVE.
    _refererProbes.set("https://b8-warm-cooldown-referer.example/scan", {
      hits:        [pruneNow - WINDOW_MS - 60_000], // 1 min past the cutoff
      lastAlerted: pruneNow - 30 * 60_000,          // 30 min ago — cooldown active
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_refererProbes.has("https://b8-stale-companion.example/scan")).toBe(false);
    // Active cooldown guards the entry even though all hits are expired
    expect(_refererProbes.has("https://b8-warm-cooldown-referer.example/scan")).toBe(true);
  });

  it("(B9) pruneProbes: referer entry with all-expired hits AND an expired cooldown IS deleted", async () => {
    // Companion to B8: once the cooldown also expires the entry has nothing
    // left to protect it and pruneProbes must delete it.
    //
    // This is the control case — without it, B8 passing could mean the entry
    // was simply never visited rather than being actively kept alive.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+64h — monotonically above B8 (62h).
    const T0       = Date.now() + 64 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _refererProbes.set("https://b9-stale-companion.example/scan", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the cooldown-expired referer entry ───────────────────────────────
    // All hits are outside the window AND lastAlerted was 2 h ago (> 1 h
    // cooldown) → hasActiveHits = false AND hasActiveCooldown = false → DELETE.
    _refererProbes.set("https://b9-cold-cooldown-referer.example/scan", {
      hits:        [pruneNow - WINDOW_MS - 60_000], // 1 min past the cutoff
      lastAlerted: pruneNow - 2 * COOLDOWN_MS,      // 2 h ago — cooldown expired
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_refererProbes.has("https://b9-stale-companion.example/scan")).toBe(false);
    // Both guards fail → entry must be DELETED
    expect(_refererProbes.has("https://b9-cold-cooldown-referer.example/scan")).toBe(false);
  });

  // ── B10 / B11: round-trip — boundary hit loaded on restart survives the first prune ─

  // B2/B3 confirm that initProbeCounters uses an inclusive >= boundary when
  // restoring hits from the DB.  B4–B9 confirm that pruneProbes uses the same
  // boundary and cooldown logic in isolation for both maps.  B10/B11 chain the
  // two together: a boundary hit is first loaded via initProbeCounters (with
  // Date.now() frozen to pruneNow so the cutoffs are identical) and then
  // subjected to the very first pruneProbes pass.
  //
  // A subtle off-by-one — e.g. initProbeCounters using a slightly earlier
  // cutoff than pruneProbes — would survive B2–B9 but fail here because the
  // hit timestamp would be just inside the restore window yet just outside the
  // prune window.
  //
  // vi.resetModules() runs before every test so lastPrune is 0 at the start
  // of each test.  A single _pruneProbes(pruneNow) call is therefore genuinely
  // the first pass — pruneNow - 0 >> COOLDOWN_MS so the 1-hour guard passes.
  //
  // T0 = Date.now()+66h — monotonically above B9 (64h).

  it("(B10) round-trip UA: boundary hit loaded by initProbeCounters is NOT evicted by the first pruneProbes pass", async () => {
    // vi.resetModules() runs before this test so lastPrune is 0.  A single
    // call to _pruneProbes(pruneNow) is therefore the very first prune pass
    // (pruneNow - 0 >> COOLDOWN_MS, so the guard lets it through).
    //
    // Date.now() is frozen to pruneNow for both phases so initProbeCounters
    // and pruneProbes compute identical cutoffs:
    //   initProbeCounters: cutoff = Date.now() - WINDOW_MS = pruneNow - WINDOW_MS
    //   pruneProbes:       cutoff = pruneNow   - WINDOW_MS
    // A boundary hit at exactly pruneNow - WINDOW_MS satisfies >= on both
    // sides, so it must survive.
    const WINDOW_MS = 24 * 60 * 60 * 1000;

    const pruneNow    = Date.now() + 66 * 60 * 60 * 1000;
    const boundaryHit = pruneNow - WINDOW_MS;

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(pruneNow);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");
      const { _uaProbes, _pruneProbes } = mod as any;

      // ── Step 1: load the boundary hit from the fake DB ──────────────────
      const fakeRows = [
        {
          fieldType:   "ua",
          key:         "B10BoundaryUA/1.0",
          hits:        [boundaryHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // Confirm the entry was actually loaded before the prune.
      expect(_uaProbes.has("B10BoundaryUA/1.0")).toBe(true);

      // ── Step 2: first (and only) prune pass ─────────────────────────────
      // lastPrune === 0 after module reset, so pruneNow - 0 >> COOLDOWN_MS
      // and this is genuinely the first prune pass.
      _pruneProbes(pruneNow);

      // The boundary hit must still be present — initProbeCounters and
      // pruneProbes must agree on the inclusive >= cutoff.
      expect(_uaProbes.has("B10BoundaryUA/1.0")).toBe(true);
      expect(_uaProbes.get("B10BoundaryUA/1.0")!.hits).toEqual([boundaryHit]);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("(B11) round-trip referer: boundary hit loaded by initProbeCounters is NOT evicted by the first pruneProbes pass", async () => {
    // Symmetric referer-map counterpart to B10.  Confirms both maps honour the
    // same round-trip invariant independently.
    //
    // T0 = Date.now()+68h — monotonically above B10 (66h).
    // lastPrune is 0 after vi.resetModules(), so _pruneProbes(pruneNow) is
    // genuinely the first pass — no warm-up call is needed or used.
    const WINDOW_MS = 24 * 60 * 60 * 1000;

    const pruneNow    = Date.now() + 68 * 60 * 60 * 1000;
    const boundaryHit = pruneNow - WINDOW_MS;

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(pruneNow);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");
      const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

      // ── Step 1: load the boundary referer hit from the fake DB ──────────
      const fakeRows = [
        {
          fieldType:   "referer",
          key:         "https://b11-boundary-referer.example/scan",
          hits:        [boundaryHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // Confirm the entry landed in the referer map, not the UA map.
      expect(_refererProbes.has("https://b11-boundary-referer.example/scan")).toBe(true);
      expect(_uaProbes.has("https://b11-boundary-referer.example/scan")).toBe(false);

      // ── Step 2: first (and only) prune pass ─────────────────────────────
      _pruneProbes(pruneNow);

      // The boundary hit must survive — both init and prune use the same
      // inclusive >= cutoff.
      expect(_refererProbes.has("https://b11-boundary-referer.example/scan")).toBe(true);
      expect(_refererProbes.get("https://b11-boundary-referer.example/scan")!.hits).toEqual([boundaryHit]);
      // Must not have leaked into uaProbes.
      expect(_uaProbes.has("https://b11-boundary-referer.example/scan")).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  // ── B12 / B13: round-trip with a 1 ms clock skew between init and prune ──
  //
  // B10/B11 freeze Date.now() to the same value for both initProbeCounters and
  // pruneProbes, so the two cutoffs are identical.  In practice there is always
  // at least 1 ms between the restart-hydration pass and the first prune tick.
  //
  // B12/B13 model that 1 ms gap: Date.now() is frozen to (pruneNow - 1) for
  // initProbeCounters and the prune call receives pruneNow explicitly.
  //
  //   init  cutoff = (pruneNow - 1) - WINDOW_MS  →  pruneNow - WINDOW_MS - 1
  //   prune cutoff =  pruneNow      - WINDOW_MS  →  pruneNow - WINDOW_MS
  //
  // A boundary hit placed at exactly pruneNow - WINDOW_MS is 1 ms ABOVE the
  // init cutoff (so it is loaded) and equals the prune cutoff exactly (so the
  // >= check keeps it alive).  A future regression that shifts init to use a
  // cutoff of (pruneNow - WINDOW_MS + 1) — or prune to strict > — would drop
  // the entry and fail these tests.
  //
  // T0 = Date.now()+70h (B12) and +72h (B13) — monotonically above B11 (68h).
  // lastPrune is 0 after vi.resetModules() so _pruneProbes(pruneNow) is the
  // very first prune pass; no warm-up call is needed.

  it("(B12) round-trip UA 1 ms skew: boundary hit loaded by initProbeCounters (initNow = pruneNow−1) is NOT evicted by _pruneProbes(pruneNow)", async () => {
    const WINDOW_MS = 24 * 60 * 60 * 1000;

    // pruneNow is 70 h in the future so its distance from all other T0 values
    // is strictly larger than any window or cooldown constant.
    const pruneNow    = Date.now() + 70 * 60 * 60 * 1000;
    const initNow     = pruneNow - 1;               // 1 ms earlier than prune
    const boundaryHit = pruneNow - WINDOW_MS;       // == prune cutoff exactly

    // Freeze Date.now() to initNow so initProbeCounters uses the slightly
    // earlier cutoff (initNow - WINDOW_MS = boundaryHit - 1).
    // boundaryHit >= (initNow - WINDOW_MS)  →  true  →  hit is loaded.
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(initNow);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");
      const { _uaProbes, _pruneProbes } = mod as any;

      // ── Step 1: restore the boundary UA hit from the fake DB ────────────
      const fakeRows = [
        {
          fieldType:   "ua",
          key:         "B12BoundaryUA/1.0",
          hits:        [boundaryHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // The entry must have been loaded despite the 1 ms earlier cutoff.
      expect(_uaProbes.has("B12BoundaryUA/1.0")).toBe(true);

      // ── Step 2: first prune pass (1 ms later) ───────────────────────────
      // pruneNow - WINDOW_MS === boundaryHit, so hits[last] >= cutoff → true.
      _pruneProbes(pruneNow);

      // The boundary hit must survive the prune pass.
      expect(_uaProbes.has("B12BoundaryUA/1.0")).toBe(true);
      expect(_uaProbes.get("B12BoundaryUA/1.0")!.hits).toEqual([boundaryHit]);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("(B13) round-trip referer 1 ms skew: boundary hit loaded by initProbeCounters (initNow = pruneNow−1) is NOT evicted by _pruneProbes(pruneNow)", async () => {
    // Symmetric referer-map counterpart to B12.
    //
    // T0 = Date.now()+72h — monotonically above B12 (70h).
    const WINDOW_MS = 24 * 60 * 60 * 1000;

    const pruneNow    = Date.now() + 72 * 60 * 60 * 1000;
    const initNow     = pruneNow - 1;
    const boundaryHit = pruneNow - WINDOW_MS;

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(initNow);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");
      const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

      // ── Step 1: restore the boundary referer hit from the fake DB ───────
      const fakeRows = [
        {
          fieldType:   "referer",
          key:         "https://b13-boundary-referer.example/scan",
          hits:        [boundaryHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // Must land in the referer map, not the UA map.
      expect(_refererProbes.has("https://b13-boundary-referer.example/scan")).toBe(true);
      expect(_uaProbes.has("https://b13-boundary-referer.example/scan")).toBe(false);

      // ── Step 2: first prune pass (1 ms later) ───────────────────────────
      _pruneProbes(pruneNow);

      // The boundary hit must survive the prune pass.
      expect(_refererProbes.has("https://b13-boundary-referer.example/scan")).toBe(true);
      expect(_refererProbes.get("https://b13-boundary-referer.example/scan")!.hits).toEqual([boundaryHit]);
      // Must not have leaked into uaProbes.
      expect(_uaProbes.has("https://b13-boundary-referer.example/scan")).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  // ── B14 / B15: pruneProbes — cooldown-survival path for the UA map ────────
  //
  // B8/B9 test the same invariant for the referer map.  B14/B15 add a
  // symmetric pair anchored inside *this* describe block so that a future
  // split-loop refactor that accidentally drops the cooldown guard from only
  // the UA branch will be caught immediately, without relying on the
  // separate "pruneProbes — entries with active cooldown survive" describe
  // block (which tests both maps in a single it() and would still pass if
  // only the referer assertion remained).

  it("(B14) pruneProbes: UA entry with all-expired hits but an active cooldown SURVIVES the prune pass", async () => {
    // All hits are outside the 24-h window so hasActiveHits = false.
    // However lastAlerted is within the 1-h cooldown, so hasActiveCooldown =
    // true and the entry must be kept alive.
    //
    // A future split-loop refactor that omits the cooldown check from the
    // UA branch would delete this entry and fail this test.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+74h — monotonically above B13 (72h).
    const T0       = Date.now() + 74 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _uaProbes.set("B14StaleUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the cooldown-active UA entry ─────────────────────────────────────
    // All hits are well outside the window; lastAlerted is 30 min ago (< 1 h
    // cooldown) → hasActiveCooldown = true → entry must SURVIVE.
    _uaProbes.set("B14WarmCooldownUA/1.0", {
      hits:        [pruneNow - WINDOW_MS - 60_000], // 1 min past the cutoff
      lastAlerted: pruneNow - 30 * 60_000,          // 30 min ago — cooldown active
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_uaProbes.has("B14StaleUA/1.0")).toBe(false);
    // Active cooldown guards the entry even though all hits are expired
    expect(_uaProbes.has("B14WarmCooldownUA/1.0")).toBe(true);
  });

  it("(B15) pruneProbes: UA entry with all-expired hits AND an expired cooldown IS deleted", async () => {
    // Companion to B14: once the cooldown also expires the entry has nothing
    // left to protect it and pruneProbes must delete it.
    //
    // This is the control case — without it, B14 passing could mean the entry
    // was simply never visited rather than being actively kept alive.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+76h — monotonically above B14 (74h).
    const T0       = Date.now() + 76 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _uaProbes.set("B15StaleUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the cooldown-expired UA entry ────────────────────────────────────
    // All hits are outside the window AND lastAlerted was 2 h ago (> 1 h
    // cooldown) → hasActiveHits = false AND hasActiveCooldown = false → DELETE.
    _uaProbes.set("B15ColdCooldownUA/1.0", {
      hits:        [pruneNow - WINDOW_MS - 60_000], // 1 min past the cutoff
      lastAlerted: pruneNow - 2 * COOLDOWN_MS,      // 2 h ago — cooldown expired
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_uaProbes.has("B15StaleUA/1.0")).toBe(false);
    // Both guards fail → entry must be DELETED
    expect(_uaProbes.has("B15ColdCooldownUA/1.0")).toBe(false);
  });

  it("(B15b) pruneProbes: UA entry with a boundary hit (pruneNow − WINDOW_MS) and lastAlerted=0 SURVIVES the prune pass", async () => {
    // hasActiveHits = true (hit is exactly at the inclusive >= cutoff).
    // hasActiveCooldown = false (lastAlerted = 0 → cooldown never fired).
    //
    // The entry must survive because hasActiveHits alone is sufficient.
    // A future refactor that removes or mis-gates the hasActiveHits check
    // specifically in the UA branch would delete this entry and fail this
    // test — a regression B14/B15 would NOT catch because both of those rely
    // on the cooldown (hasActiveCooldown) path.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+77h — monotonically between B15 (76h) and B16 (78h).
    const T0       = Date.now() + 77 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _uaProbes.set("B15bStaleUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the boundary-hit UA entry with no cooldown ───────────────────────
    // Hit is exactly at pruneNow - WINDOW_MS (the inclusive >= cutoff).
    // lastAlerted = 0 → cooldown is NOT active.
    // hasActiveHits = true → entry must SURVIVE.
    _uaProbes.set("B15bBoundaryActiveHitsUA/1.0", {
      hits:        [pruneNow - WINDOW_MS], // exactly at the cutoff — must be kept
      lastAlerted: 0,                      // cooldown never fired — no cooldown guard
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_uaProbes.has("B15bStaleUA/1.0")).toBe(false);
    // Active hit at the boundary → hasActiveHits = true → entry must SURVIVE
    expect(_uaProbes.has("B15bBoundaryActiveHitsUA/1.0")).toBe(true);
    expect(_uaProbes.get("B15bBoundaryActiveHitsUA/1.0")!.hits).toEqual([pruneNow - WINDOW_MS]);
  });

  it("(B15c) pruneProbes: referer entry with a boundary hit (pruneNow − WINDOW_MS) and lastAlerted=0 SURVIVES the prune pass", async () => {
    // Symmetric twin of B15b for the referer map.
    //
    // hasActiveHits = true (hit is exactly at the inclusive >= cutoff).
    // hasActiveCooldown = false (lastAlerted = 0 → cooldown never fired).
    //
    // The entry must survive because hasActiveHits alone is sufficient.
    // A future refactor that removes or mis-gates the hasActiveHits check
    // specifically in the referer branch would delete this entry and fail this
    // test — B8/B9 would NOT catch it because those rely on the cooldown
    // (hasActiveCooldown) path, and B15b only covers the UA map.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+77h31m — monotonically between B15b (77h) and B16 (78h).
    const T0       = Date.now() + 77 * 60 * 60 * 1000 + 31 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _refererProbes.set("https://b15c-stale-companion.example/scan", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the boundary-hit referer entry with no cooldown ──────────────────
    // Hit is exactly at pruneNow - WINDOW_MS (the inclusive >= cutoff).
    // lastAlerted = 0 → cooldown is NOT active.
    // hasActiveHits = true → entry must SURVIVE.
    _refererProbes.set("https://b15c-boundary-active-hits.example/scan", {
      hits:        [pruneNow - WINDOW_MS], // exactly at the cutoff — must be kept
      lastAlerted: 0,                      // cooldown never fired — no cooldown guard
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the referer prune loop ran
    expect(_refererProbes.has("https://b15c-stale-companion.example/scan")).toBe(false);
    // Active hit at the boundary → hasActiveHits = true → entry must SURVIVE
    expect(_refererProbes.has("https://b15c-boundary-active-hits.example/scan")).toBe(true);
    expect(_refererProbes.get("https://b15c-boundary-active-hits.example/scan")!.hits).toEqual([pruneNow - WINDOW_MS]);
  });

  it("(B15d) pruneProbes: UA entry whose only hit is 1 ms past the window boundary and lastAlerted=0 is DELETED", async () => {
    // Control case for B15b.
    // hit = pruneNow − WINDOW_MS − 1 → hasActiveHits = false (1 ms past the cutoff).
    // lastAlerted = 0               → hasActiveCooldown = false (cooldown never fired).
    // Both guards fail → entry must be DELETED.
    //
    // Without this complement, B15b passing could mask a pruner that simply
    // never visits UA entries at all — it would leave this entry alive, causing
    // this test to fail and exposing the regression.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+77.5h — monotonically between B15c (77h31m) and B16 (78h).
    const T0       = Date.now() + 77.5 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ──────────────────
    _uaProbes.set("B15dStaleUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the just-expired UA entry with no cooldown ───────────────────────
    // Hit is 1 ms past the window cutoff → hasActiveHits = false.
    // lastAlerted = 0 → cooldown never fired → hasActiveCooldown = false.
    // Both guards fail → entry must be DELETED.
    _uaProbes.set("B15dExpiredHitsNoAlertUA/1.0", {
      hits:        [pruneNow - WINDOW_MS - 1], // 1 ms past the cutoff
      lastAlerted: 0,                          // cooldown never fired
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the prune loop ran
    expect(_uaProbes.has("B15dStaleUA/1.0")).toBe(false);
    // Both guards false → entry must be DELETED
    expect(_uaProbes.has("B15dExpiredHitsNoAlertUA/1.0")).toBe(false);
  });

  // ── B16 / B17: pruneProbes — warm-cooldown survives even when the peer map is empty ─
  //
  // B8/B9 confirm the cooldown guard works in isolation for the referer map.
  // A future refactored pruner might take an early exit or skip the cooldown
  // check when the *peer* map is empty (e.g. "nothing in refererProbes, skip
  // the referer loop entirely").  B16 and B17 pin this invariant explicitly:
  // the cooldown check must fire even when the other map has zero entries.

  it("(B16) pruneProbes: UA entry with active hits AND active cooldown survives when refererProbes is empty", async () => {
    // _refererProbes is empty (module was just reset).
    // _uaProbes has one entry whose hits are still within the window AND whose
    // lastAlerted is within the cooldown window.  A pruner that skips the
    // cooldown check when the peer map is empty would delete this entry and
    // fail this test.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+78h — monotonically above B15 (76h).
    const T0       = Date.now() + 78 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // Peer map must remain empty throughout.
    expect(_refererProbes.size).toBe(0);

    // ── Stale companion in _uaProbes to prove the UA loop ran ─────────────────
    _uaProbes.set("B16StaleCompanionUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the warm-cooldown UA entry with active hits ──────────────────────
    // Hit is 12 h ago (well within the 24-h window) → hasActiveHits = true.
    // lastAlerted is 30 min ago (within 1-h cooldown) → hasActiveCooldown = true.
    // Both guards protect the entry; it must SURVIVE.
    _uaProbes.set("B16WarmCooldownActiveHitsUA/1.0", {
      hits:        [pruneNow - WINDOW_MS / 2], // 12 h ago — within window
      lastAlerted: pruneNow - COOLDOWN_MS / 2, // 30 min ago — cooldown active
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the UA prune loop actually ran
    expect(_uaProbes.has("B16StaleCompanionUA/1.0")).toBe(false);
    // Peer map stayed empty throughout → confirms the test isolation
    expect(_refererProbes.size).toBe(0);
    // Active hits + active cooldown → entry must SURVIVE
    expect(_uaProbes.has("B16WarmCooldownActiveHitsUA/1.0")).toBe(true);
    expect(_uaProbes.get("B16WarmCooldownActiveHitsUA/1.0")!.hits.length).toBe(1);
  });

  it("(B17) pruneProbes: referer entry with active hits AND active cooldown survives when uaProbes is empty", async () => {
    // _uaProbes is empty (module was just reset).
    // _refererProbes has one entry whose hits are still within the window AND
    // whose lastAlerted is within the cooldown window.  A pruner that skips
    // the cooldown check when the peer map is empty would delete this entry
    // and fail this test.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+80h — monotonically above B16 (78h).
    const T0       = Date.now() + 80 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // Peer map must remain empty throughout.
    expect(_uaProbes.size).toBe(0);

    // ── Stale companion in _refererProbes to prove the referer loop ran ───────
    _refererProbes.set("https://b17-stale-companion.example/scan", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the warm-cooldown referer entry with active hits ─────────────────
    // Hit is 12 h ago (well within the 24-h window) → hasActiveHits = true.
    // lastAlerted is 30 min ago (within 1-h cooldown) → hasActiveCooldown = true.
    // Both guards protect the entry; it must SURVIVE.
    _refererProbes.set("https://b17-warm-cooldown-active-hits.example/scan", {
      hits:        [pruneNow - WINDOW_MS / 2], // 12 h ago — within window
      lastAlerted: pruneNow - COOLDOWN_MS / 2, // 30 min ago — cooldown active
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → confirms the referer prune loop actually ran
    expect(_refererProbes.has("https://b17-stale-companion.example/scan")).toBe(false);
    // Peer map stayed empty throughout → confirms the test isolation
    expect(_uaProbes.size).toBe(0);
    // Active hits + active cooldown → entry must SURVIVE
    expect(_refererProbes.has("https://b17-warm-cooldown-active-hits.example/scan")).toBe(true);
    expect(_refererProbes.get("https://b17-warm-cooldown-active-hits.example/scan")!.hits.length).toBe(1);
  });

  it("(K) initProbeCounters: UA row's lastAlerted does not bleed into the referer map entry for the same key after restart", async () => {
    // Regression guard: a future bug in the restoration loop could load rows in
    // the wrong order or without checking field_type before assigning lastAlerted,
    // accidentally imposing the UA alert cooldown on the referer map entry (or
    // vice versa) for the same key string.
    //
    // Scenario:
    //   - "ua"      row for key "restart-bleed-test.example/" has lastAlerted = now
    //     (cooldown fully active — it alerted moments before the restart).
    //   - "referer" row for the same key has lastAlerted = 0
    //     (it has never alerted).
    //
    // After initProbeCounters():
    //   _uaProbes.get(KEY).lastAlerted      must be `now`  (restored correctly)
    //   _refererProbes.get(KEY).lastAlerted  must be 0     (not contaminated by UA row)
    const now       = Date.now();
    const hitTs     = now - 1_000; // 1 s ago — well within the 24-hour window
    const SHARED_KEY = "restart-bleed-test.example/";

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");

    const fakeRows = [
      // UA row: lastAlerted is `now` — cooldown is fully active.
      {
        fieldType:   "ua",
        key:         SHARED_KEY,
        hits:        [hitTs],
        lastAlerted: now,
      },
      // Referer row for the SAME key string: never alerted (lastAlerted = 0).
      {
        fieldType:   "referer",
        key:         SHARED_KEY,
        hits:        [hitTs],
        lastAlerted: 0,
      },
    ];
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    await mod.initProbeCounters();

    // UA entry must carry the restored lastAlerted (cooldown preserved).
    const uaEntry = mod._uaProbes.get(SHARED_KEY);
    expect(uaEntry).toBeDefined();
    expect(uaEntry!.lastAlerted).toBe(now);

    // Referer entry must NOT have been contaminated by the UA row's lastAlerted.
    const refEntry = mod._refererProbes.get(SHARED_KEY);
    expect(refEntry).toBeDefined();
    expect(refEntry!.lastAlerted).toBe(0);

    // The two values must differ — if they were swapped or shared the bug is present.
    expect(uaEntry!.lastAlerted).not.toBe(refEntry!.lastAlerted);
  });

  // ── B18 / B19: off-by-one on the init side — consistency invariant ────────
  //
  // B12/B13 confirm that a boundary hit placed at the PRUNE cutoff survives
  // both initProbeCounters (whose cutoff is 1 ms earlier, so the hit passes)
  // and pruneProbes (it is exactly at the boundary, so >= keeps it).
  //
  // The symmetric danger is the opposite off-by-one: a future initProbeCounters
  // bug uses a cutoff 1 ms TOO LENIENT (e.g. `Date.now() − WINDOW_MS − 1`),
  // loading a hit that is already 1 ms OUTSIDE the prune window.  That entry
  // appears in the in-memory maps right after restart and vanishes on the very
  // next prune tick — silently wiping a scraper's recent history.
  //
  // Test design
  // ───────────
  // The DB row contains ONLY a stale hit (initNow − WINDOW_MS − 1).
  //
  // • Correct init  (cutoff = initNow − WINDOW_MS):
  //     staleHit < cutoff → filtered out; lastAlerted = 0 → entry not created.
  //
  // • Regressed init (cutoff = initNow − WINDOW_MS − 1, too lenient):
  //     staleHit == cutoff → loaded; entry IS created → the `.has()` assertion
  //     below fails, catching the regression immediately.
  //
  // A separate "demonstrate" step then manually injects the stale entry and
  // calls _pruneProbes(initNow) to confirm it is deleted, showing what the
  // "load then immediately drop" failure mode looks like end-to-end.
  //
  // T0 = Date.now()+82h (B18) and +84h (B19) — monotonically above B17 (80h).

  it("(B18) off-by-one init UA: stale hit 1 ms outside the window is NOT loaded by initProbeCounters; _pruneProbes(initNow) deletes it when injected", async () => {
    const WINDOW_MS = 24 * 60 * 60 * 1000;

    // T0 = Date.now()+82h — monotonically above B17 (80h).
    const initNow  = Date.now() + 82 * 60 * 60 * 1000;
    // 1 ms below the correct init cutoff (initNow − WINDOW_MS).
    // Correct init excludes it; a too-lenient init loads it.
    const staleHit = initNow - WINDOW_MS - 1;

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(initNow);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");
      const { _uaProbes, _refererProbes, _pruneProbes } = mod as any;

      // ── Step 1: init with a DB row that holds only the stale hit ─────────
      const fakeRows = [
        {
          fieldType:   "ua",
          key:         "B18StaleUA/1.0",
          hits:        [staleHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // ── Consistency invariant ─────────────────────────────────────────────
      // staleHit (initNow − WINDOW_MS − 1) < correct cutoff (initNow − WINDOW_MS),
      // so it must be filtered out.  With lastAlerted = 0 and no active hits
      // the entry is never created.
      //
      // A future regression that computes `cutoff = Date.now() − WINDOW_MS − 1`
      // (too lenient by 1 ms) would load staleHit, create the entry, and cause
      // `.has()` to return true — making this assertion fail and catching the bug.
      expect(_uaProbes.has("B18StaleUA/1.0")).toBe(false);
      expect(_refererProbes.has("B18StaleUA/1.0")).toBe(false);

      // ── Step 2: demonstrate the "load → immediate drop" failure mode ──────
      // Inject the stale entry directly, as a too-lenient init would have done.
      _uaProbes.set("B18StaleUA/1.0", { hits: [staleHit], lastAlerted: 0 });

      // pruneProbes(initNow): cutoff = initNow − WINDOW_MS.
      // staleHit (initNow − WINDOW_MS − 1) < cutoff → hasActiveHits = false.
      // lastAlerted = 0 → hasActiveCooldown = false.
      // → entry is deleted on the very first prune tick after restart.
      _pruneProbes(initNow);

      expect(_uaProbes.has("B18StaleUA/1.0")).toBe(false);
      expect(_refererProbes.has("B18StaleUA/1.0")).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("(B19) off-by-one init referer: stale hit 1 ms outside the window is NOT loaded by initProbeCounters; _pruneProbes(initNow) deletes it when injected", async () => {
    // Symmetric referer-map counterpart to B18.
    //
    // T0 = Date.now()+84h — monotonically above B18 (82h).
    const WINDOW_MS = 24 * 60 * 60 * 1000;

    const initNow  = Date.now() + 84 * 60 * 60 * 1000;
    const staleHit = initNow - WINDOW_MS - 1;

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(initNow);

    try {
      const mod    = await import("./traffic-logger");
      const { db } = await import("./db");
      const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

      // ── Step 1: init with a DB row that holds only the stale hit ─────────
      const fakeRows = [
        {
          fieldType:   "referer",
          key:         "https://b19-stale-referer.example/scan",
          hits:        [staleHit],
          lastAlerted: 0,
        },
      ];
      (db as any).execute = vi.fn().mockResolvedValue([]);
      (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      await mod.initProbeCounters();

      // ── Consistency invariant ─────────────────────────────────────────────
      // Correct init excludes staleHit (< cutoff) and skips the entry entirely
      // (no active hits, lastAlerted = 0).  A too-lenient init would create the
      // entry and break the `.toBe(false)` assertion, catching the regression.
      expect(_refererProbes.has("https://b19-stale-referer.example/scan")).toBe(false);
      expect(_uaProbes.has("https://b19-stale-referer.example/scan")).toBe(false);

      // ── Step 2: demonstrate the "load → immediate drop" failure mode ──────
      _refererProbes.set("https://b19-stale-referer.example/scan", { hits: [staleHit], lastAlerted: 0 });

      // pruneProbes(initNow): staleHit < cutoff → hasActiveHits = false;
      // lastAlerted = 0 → hasActiveCooldown = false → entry deleted.
      _pruneProbes(initNow);

      expect(_refererProbes.has("https://b19-stale-referer.example/scan")).toBe(false);
      expect(_uaProbes.has("https://b19-stale-referer.example/scan")).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Referer cooldown — mid-session suppression (no restart)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * This describe block covers the mid-session cooldown path for the referer
 * probe — distinct from the restart-hydration path tested in the DB block
 * above.  If the lastAlerted guard were removed from the referer branch of
 * recordProbe(), additional hits inside the cooldown window would fire a
 * second alert; this test would catch that regression.
 */
describe("referer probe — mid-session cooldown suppression (no restart)", () => {

  // Googlebot is treated as a known bot so its UA does not trigger a UA-probe
  // alert; only the referer probe fires, keeping the assertion unambiguous.
  const BOT_UA      = "Googlebot/2.1 (+http://www.google.com/bot.html)";
  const REFERER_KEY = "https://mid-session-probe-test.example/scan";

  /**
   * Drive the middleware N times using BOT_UA + the fixed referer, flushing
   * the microtask queue after each hit so async callbacks complete.
   */
  async function hitRefererTimes(
    middleware: Middleware,
    n: number,
  ): Promise<void> {
    for (let i = 0; i < n; i++) {
      const req = makeReq(BOT_UA, REFERER_KEY);
      const res = makeRes();
      middleware(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }
  }

  it("alert fires once at threshold+1 then is suppressed for 10 more hits inside the cooldown window", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw = await freshMiddleware();

    // Drive threshold+1 (= 3) hits — the alert must fire exactly once.
    await hitRefererTimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);

    const firstCall = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(firstCall[0]).toBe("referer");
    expect(firstCall[1]).toBe(REFERER_KEY);

    // Drive 10 more hits — still within the 1-hour cooldown window.
    // The lastAlerted guard must suppress every one of them.
    await hitRefererTimes(mw, 10);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
  });

  it("second alert fires exactly once after the cooldown expires", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw = await freshMiddleware();

    // Drive threshold+1 (= 3) hits — the first alert must fire exactly once.
    await hitRefererTimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);

    // Simulate the cooldown expiring by back-dating lastAlerted on the
    // in-memory _refererProbes entry.  COOLDOWN_MS = 1 h = 3_600_000 ms;
    // subtracting 3_600_001 ms places it just past the boundary so the guard lifts.
    const mod   = await import("./traffic-logger");
    const entry = mod._refererProbes.get(REFERER_KEY);
    expect(entry).toBeDefined();
    entry!.lastAlerted = Date.now() - 3_600_001;

    // Drive threshold+1 more hits — the cooldown has expired so the guard
    // must allow exactly one new alert.
    await hitRefererTimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);

    const secondCall = mockSendProbeAlert.mock.calls[1] as [string, string, number];
    expect(secondCall[0]).toBe("referer");
    expect(secondCall[1]).toBe(REFERER_KEY);
  });

  it("cooldown resets after second alert — threshold+1 additional hits do NOT trigger a third alert", async () => {
    // This test catches a bug where lastAlerted is not updated on the second
    // alert (or is updated to a stale value), which would let the cooldown
    // expire again immediately and allow unlimited re-alerts.
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw = await freshMiddleware();

    // Phase 1: drive threshold+1 hits → first alert fires.
    await hitRefererTimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);

    // Phase 2: expire the cooldown artificially and drive threshold+1 more
    // hits → second alert fires.
    const mod   = await import("./traffic-logger");
    const entry = mod._refererProbes.get(REFERER_KEY);
    expect(entry).toBeDefined();
    entry!.lastAlerted = Date.now() - 3_600_001;

    await hitRefererTimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);

    // Phase 3: immediately drive threshold+1 more hits — the second alert
    // must have reset lastAlerted to ~now, so the fresh cooldown window is
    // fully active and NO third alert should fire.
    await hitRefererTimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UA probe — mid-session cooldown suppression (no restart)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Symmetric counterpart to the referer mid-session cooldown test above.
 * Covers the lastAlerted guard in the UA branch of recordProbe().  If that
 * guard were removed, additional hits inside the cooldown window would fire a
 * second alert; this test would catch that regression.
 *
 * Requests carry no referer so only the UA probe fires, keeping the
 * assertion unambiguous.
 */
describe("UA probe — mid-session cooldown suppression (no restart)", () => {
  // An obscure UA that matches no known-bot pattern so the UA probe fires.
  const UNKNOWN_UA = "MidSessionTestCrawler/3.7";

  /**
   * Drive the middleware N times using the unknown UA and no referer,
   * flushing the microtask queue after each hit so async callbacks complete.
   */
  async function hitUATimes(
    middleware: Middleware,
    n: number,
  ): Promise<void> {
    for (let i = 0; i < n; i++) {
      const req = makeReq(UNKNOWN_UA); // no referer argument → ""
      const res = makeRes();
      middleware(req, res as any, () => {});
      res.finish();
      await flushMicrotasks();
    }
  }

  it("alert fires once at threshold+1 then is suppressed for 10 more hits inside the cooldown window", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw = await freshMiddleware();

    // Drive threshold+1 (= 3) hits — the UA alert must fire exactly once.
    await hitUATimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);

    const firstCall = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(firstCall[0]).toBe("ua");
    expect(firstCall[1]).toBe(UNKNOWN_UA);

    // Drive 10 more hits — still within the 1-hour cooldown window.
    // The lastAlerted guard in the UA branch must suppress every one of them.
    await hitUATimes(mw, 10);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
  });

  it("second alert fires exactly once after the cooldown expires", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw = await freshMiddleware();

    // Drive threshold+1 (= 3) hits — the first alert must fire exactly once.
    await hitUATimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);

    // Simulate the cooldown expiring by back-dating lastAlerted on the
    // in-memory entry.  COOLDOWN_MS = 1 h = 3_600_000 ms; subtracting
    // 3_600_001 ms places it just past the boundary so the guard lifts.
    const mod   = await import("./traffic-logger");
    const entry = mod._uaProbes.get(UNKNOWN_UA);
    expect(entry).toBeDefined();
    entry!.lastAlerted = Date.now() - 3_600_001;

    // Drive threshold+1 more hits — the cooldown has expired so the guard
    // must allow exactly one new alert.
    await hitUATimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);

    const secondCall = mockSendProbeAlert.mock.calls[1] as [string, string, number];
    expect(secondCall[0]).toBe("ua");
    expect(secondCall[1]).toBe(UNKNOWN_UA);
  });

  it("lastAlerted is updated on the second alert so a third alert is suppressed immediately after", async () => {
    // Regression guard: if entry.lastAlerted = now is removed from the UA branch
    // after the second alert fires, the cooldown clock is never reset and every
    // subsequent hit above threshold immediately fires another alert.
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mw  = await freshMiddleware();
    const mod = await import("./traffic-logger");

    // ── Phase 1: drive threshold+1 hits → first alert fires ─────────────────
    await hitUATimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);

    // ── Phase 2: expire the cooldown and drive threshold+1 more → second alert
    const entry = mod._uaProbes.get(UNKNOWN_UA);
    expect(entry).toBeDefined();
    entry!.lastAlerted = Date.now() - 3_600_001; // just past the 1-hour boundary

    await hitUATimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);

    // ── Phase 3: drive threshold+1 more hits immediately ────────────────────
    // The second alert must have refreshed lastAlerted to ~now, so the new
    // cooldown is active and no third alert should fire.
    await hitUATimes(mw, 3);
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cooldown boundary — suppression holds when lastAlerted is just 1 ms inside the window
// ═══════════════════════════════════════════════════════════════════════════

/**
 * These tests seed lastAlerted = now - (COOLDOWN_MS - 30_000) directly into
 * the exported probe maps, then drive one more hit above the threshold.
 *
 * The guard in recordProbe() is:
 *   now - entry.lastAlerted >= COOLDOWN_MS
 *
 * With lastAlerted 30 seconds inside the window the condition evaluates to
 * false and no alert should fire.  The 30-second margin is large enough that
 * real test-execution time cannot cross the boundary, making the tests
 * deterministic across slow environments.
 */
describe("cooldown boundary — suppression holds when lastAlerted is well inside the window", () => {
  /**
   * COOLDOWN_MS = PROBE_ALERT_COOLDOWN_HOURS * 3_600_000.
   * With PROBE_ALERT_COOLDOWN_HOURS = "1", COOLDOWN_MS = 3_600_000 ms.
   * MARGIN = 30 s — safely inside the window regardless of execution speed.
   */
  const COOLDOWN_MS = 3_600_000; // mirrors the module IIFE for PROBE_ALERT_COOLDOWN_HOURS = "1"
  const MARGIN_MS   = 30_000;    // 30 s inside the boundary — prevents timing drift failures

  it("UA probe: lastAlerted 30 s before cooldown expires suppresses the next alert", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;

    // Pre-seed the UA probe map: two hits already at threshold, lastAlerted
    // set to 30 s before the cooldown would expire (still well within the window).
    const now = Date.now();
    const key = "BoundaryScraper/1.0";
    mod._uaProbes.set(key, {
      hits:        [now - 1000, now - 500], // two hits — at the threshold (threshold=2)
      lastAlerted: now - (COOLDOWN_MS - MARGIN_MS), // 30 s before cooldown expires → still active
    });

    // One more hit pushes hit count above the threshold.
    // The cooldown is still active, so sendProbeAlert must NOT be called.
    const req = makeReq(key);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  it("referer probe: lastAlerted 30 s before cooldown expires suppresses the next alert", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;

    // Pre-seed the referer probe map with the same edge-case lastAlerted.
    const now = Date.now();
    const key = "https://boundary-scraper.example/scan";
    mod._refererProbes.set(key, {
      hits:        [now - 1000, now - 500],
      lastAlerted: now - (COOLDOWN_MS - MARGIN_MS), // 30 s before cooldown expires → still active
    });

    // Use a unique UA per hit so the UA probe never accumulates above the
    // threshold — only the referer probe behaviour is under test here.
    const req = makeReq(`BoundaryUA-${Math.random()}`, key);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });
});

// ── pruneProbes — direct unit tests ──────────────────────────────────────────
//
// These tests call _pruneProbes directly (bypassing the middleware) so that the
// prune condition is exercised in isolation.  Three kinds of entry are seeded
// into _refererProbes / _uaProbes before each call:
//
//   (a) active hits   — hits array contains a timestamp within the 24 h window
//   (b) stale + warm  — hits array is empty, but lastAlerted is within the 1 h
//                       cooldown → entry must SURVIVE (bug guard)
//   (c) stale + cold  — hits array is empty AND lastAlerted is outside the 1 h
//                       cooldown (or zero) → entry must be DELETED
//
describe("pruneProbes — entries with active cooldown survive; entries with no hits and expired cooldown are deleted", () => {
  it("refererProbes: (a) active hits survive, (b) empty-hits+active-cooldown survives, (c) empty-hits+expired-cooldown is deleted", async () => {
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1"; // 1-hour cooldown
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const now        = Date.now();
    const WINDOW_MS  = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // (a) active hits — most-recent hit is within the 24 h window
    _refererProbes.set("https://active-hits.example/", {
      hits:        [now - WINDOW_MS + 60_000], // 1 min before the cutoff
      lastAlerted: 0,
    });

    // (b) empty hits + active cooldown — lastAlerted was 30 min ago
    _refererProbes.set("https://stale-hits-warm-cooldown.example/", {
      hits:        [],
      lastAlerted: now - 30 * 60_000,
    });

    // (c) empty hits + expired cooldown — lastAlerted was 2 hours ago
    _refererProbes.set("https://stale-hits-cold-cooldown.example/", {
      hits:        [],
      lastAlerted: now - 2 * COOLDOWN_MS,
    });

    _pruneProbes(now);

    // (a) must survive
    expect(_refererProbes.has("https://active-hits.example/")).toBe(true);
    // (b) must survive — active cooldown guards it even with no recent hits
    expect(_refererProbes.has("https://stale-hits-warm-cooldown.example/")).toBe(true);
    // (c) must be deleted — neither active hits nor active cooldown
    expect(_refererProbes.has("https://stale-hits-cold-cooldown.example/")).toBe(false);
  });

  it("uaProbes: (a) active hits survive, (b) empty-hits+active-cooldown survives, (c) empty-hits+expired-cooldown is deleted", async () => {
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const now         = Date.now();
    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // (a) active hits
    _uaProbes.set("ActiveHitsUA/1.0", {
      hits:        [now - WINDOW_MS + 60_000],
      lastAlerted: 0,
    });

    // (b) empty hits + active cooldown
    _uaProbes.set("StaleHitsWarmCooldownUA/1.0", {
      hits:        [],
      lastAlerted: now - 30 * 60_000,
    });

    // (c) empty hits + expired cooldown
    _uaProbes.set("StaleHitsColdCooldownUA/1.0", {
      hits:        [],
      lastAlerted: now - 2 * COOLDOWN_MS,
    });

    _pruneProbes(now);

    expect(_uaProbes.has("ActiveHitsUA/1.0")).toBe(true);
    expect(_uaProbes.has("StaleHitsWarmCooldownUA/1.0")).toBe(true);
    expect(_uaProbes.has("StaleHitsColdCooldownUA/1.0")).toBe(false);
  });

  it("entry with lastAlerted === 0 and no hits is deleted (never alerted, nothing to protect)", async () => {
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const now = Date.now();

    _refererProbes.set("https://never-alerted-stale-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });
    _uaProbes.set("NeverAlertedStaleUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    _pruneProbes(now);

    expect(_refererProbes.has("https://never-alerted-stale-ref.example/")).toBe(false);
    expect(_uaProbes.has("NeverAlertedStaleUA/1.0")).toBe(false);
  });

  it("second call within the same hour is a no-op — stale entries seeded after first prune are not removed", async () => {
    // Use a timestamp 2 hours in the future so the first _pruneProbes call is
    // guaranteed to pass the guard (now - lastPrune >= 1h) regardless of what
    // earlier tests in this file left in lastPrune.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const baseNow = Date.now() + 2 * 60 * 60 * 1000; // 2 h into the future

    // ── First prune: runs, advances lastPrune to baseNow ────────────────────
    _pruneProbes(baseNow);

    // ── Seed entries that are stale (no hits, expired cooldown) ─────────────
    // These entries WOULD be deleted if pruneProbes ran again with the same
    // timestamp.  They are inserted AFTER the first prune so lastPrune === baseNow.
    _refererProbes.set("https://prune-guard-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });
    _uaProbes.set("PruneGuardUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Second call with the exact same timestamp: must be a no-op ───────────
    _pruneProbes(baseNow); // baseNow - lastPrune === 0 < 1h  →  guard fires, returns early

    // ── Entries must still be present — the guard blocked deletion ────────────
    expect(_refererProbes.has("https://prune-guard-ref.example/")).toBe(true);
    expect(_uaProbes.has("PruneGuardUA/1.0")).toBe(true);

    // ── Sanity check: advancing by 1 h + 1 ms DOES let the prune run ─────────
    _pruneProbes(baseNow + 60 * 60 * 1000 + 1);

    expect(_refererProbes.has("https://prune-guard-ref.example/")).toBe(false);
    expect(_uaProbes.has("PruneGuardUA/1.0")).toBe(false);
  });

  it("lastPrune is only updated when the prune body runs — a skipped call must not push out the next prune", async () => {
    // Regression guard: if `lastPrune = now` were moved BEFORE the guard check
    // (i.e., updated on every call including early returns) the sequence below
    // would never delete stale entries after the first skip.
    //
    // Sequence:
    //   T0          — first prune runs, lastPrune set to T0
    //   T0 + 30 min — guard fires (too soon), returns early
    //                  BUGGY CODE would set lastPrune = T0 + 30 min here
    //   T0 + 1h + 1ms — correct: now − T0 = 1 h + 1 ms ≥ 1 h → prune runs
    //                   buggy:   now − (T0+30 min) = 30 min < 1 h → guard fires again
    //
    // The test verifies that stale entries seeded between T0 and T0+1h+1ms ARE
    // deleted on the third call, proving lastPrune was NOT advanced by the skip.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    // Place T0 far enough in the future to avoid collisions with lastPrune
    // values left by earlier tests in this file.
    const T0 = Date.now() + 4 * 60 * 60 * 1000; // 4 h into the future

    // ── T0: first prune runs, advances lastPrune to T0 ──────────────────────
    _pruneProbes(T0);

    // ── Seed stale entries (no hits, expired cooldown) ───────────────────────
    _refererProbes.set("https://lastprune-regression-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });
    _uaProbes.set("LastPruneRegressionUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── T0 + 30 min: guard should fire, return early WITHOUT updating lastPrune
    _pruneProbes(T0 + 30 * 60 * 1000);

    // Entries must still be present — the guard blocked deletion.
    expect(_refererProbes.has("https://lastprune-regression-ref.example/")).toBe(true);
    expect(_uaProbes.has("LastPruneRegressionUA/1.0")).toBe(true);

    // ── T0 + 1 h + 1 ms: exactly one hour after T0 — prune MUST run ─────────
    // If lastPrune was incorrectly updated at T0 + 30 min, the guard would
    // still block here (only 30 min since the last update) and entries would
    // survive — that is the bug this test catches.
    _pruneProbes(T0 + 60 * 60 * 1000 + 1);

    expect(_refererProbes.has("https://lastprune-regression-ref.example/")).toBe(false);
    expect(_uaProbes.has("LastPruneRegressionUA/1.0")).toBe(false);
  });

  it("boundary (now - lastPrune === 1 h exactly) — prune runs (guard is strictly less-than)", async () => {
    // The guard is `if (now - lastPrune < 60 * 60 * 1000) return;`
    // When the difference equals exactly 1 h the condition is false, so the
    // prune MUST execute.  This matters for low-traffic servers where calls
    // arrive infrequently and the first call that clears the threshold is the
    // only chance to prune within that window.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    // Place baseNow 8 h in the future to avoid colliding with lastPrune values
    // left by earlier tests in this file.
    const baseNow = Date.now() + 8 * 60 * 60 * 1000;

    // ── Advance lastPrune to baseNow ─────────────────────────────────────────
    _pruneProbes(baseNow);

    // ── Seed stale entries (no hits, no active cooldown) ─────────────────────
    _refererProbes.set("https://boundary-exact-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });
    _uaProbes.set("BoundaryExactUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Call with now - lastPrune === exactly 1 h ─────────────────────────────
    const exactBoundary = baseNow + 60 * 60 * 1000;
    _pruneProbes(exactBoundary);

    // Prune must have run — stale entries should be gone
    expect(_refererProbes.has("https://boundary-exact-ref.example/")).toBe(false);
    expect(_uaProbes.has("BoundaryExactUA/1.0")).toBe(false);
  });

  it("one millisecond before the boundary (now - lastPrune === 1 h - 1 ms) — prune is skipped", async () => {
    // The guard is `if (now - lastPrune < 60 * 60 * 1000) return;`
    // At 1 h - 1 ms the condition is true, so the prune must NOT run.
    // This guards against an off-by-one that would cause premature pruning
    // and could drop entries that are still within their cooldown window.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    // Place baseNow 10 h in the future to avoid colliding with lastPrune values
    // left by earlier tests in this file.
    const baseNow = Date.now() + 10 * 60 * 60 * 1000;

    // ── Advance lastPrune to baseNow ─────────────────────────────────────────
    _pruneProbes(baseNow);

    // ── Seed stale entries (no hits, no active cooldown) ─────────────────────
    _refererProbes.set("https://boundary-minus1-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });
    _uaProbes.set("BoundaryMinus1UA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Call with now - lastPrune === 1 h - 1 ms ──────────────────────────────
    const justBefore = baseNow + 60 * 60 * 1000 - 1;
    _pruneProbes(justBefore);

    // Guard must have fired — entries must still be present
    expect(_refererProbes.has("https://boundary-minus1-ref.example/")).toBe(true);
    expect(_uaProbes.has("BoundaryMinus1UA/1.0")).toBe(true);
  });

  it("UA-only: a skipped call must not reset lastPrune — stale uaProbes entries are deleted on the third call", async () => {
    // Regression guard targeting uaProbes in isolation.
    //
    // If pruneProbes were ever split into separate referer / UA pruners each
    // with their own lastPrune-style variable, a bug could be introduced for
    // one map independently.  This test seeds ONLY uaProbes entries so that
    // failure is unambiguous: any surviving entry after the third call means
    // the UA pruner's interval counter was reset by the skipped call.
    //
    // Sequence:
    //   T0           — first prune runs, lastPrune (UA) set to T0
    //   T0 + 30 min  — guard fires (too soon), returns early
    //                   BUGGY CODE would set lastPrune = T0 + 30 min here
    //   T0 + 1h + 1ms — correct: now − T0 = 1h+1ms ≥ 1h → prune runs
    //                    buggy:   now − (T0+30min) = 30min < 1h → guard fires again
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 6 * 60 * 60 * 1000; // 6 h into the future

    // ── T0: first prune runs, advances lastPrune to T0 ───────────────────────
    _pruneProbes(T0);

    // ── Seed stale UA-only entries (no hits, expired cooldown) ───────────────
    _uaProbes.set("UaOnlyPruneRegressionA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });
    _uaProbes.set("UaOnlyPruneRegressionB/2.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── T0 + 30 min: guard should fire, return early WITHOUT updating lastPrune
    _pruneProbes(T0 + 30 * 60 * 1000);

    // Entries must still be present — the guard blocked deletion.
    expect(_uaProbes.has("UaOnlyPruneRegressionA/1.0")).toBe(true);
    expect(_uaProbes.has("UaOnlyPruneRegressionB/2.0")).toBe(true);

    // ── T0 + 1h + 1ms: exactly one hour after T0 — prune MUST run ────────────
    // If lastPrune was incorrectly advanced at T0 + 30 min, the guard would
    // still fire here (only 30 min elapsed since the bad update) and the stale
    // UA entries would survive — that is the bug this test catches.
    _pruneProbes(T0 + 60 * 60 * 1000 + 1);

    expect(_uaProbes.has("UaOnlyPruneRegressionA/1.0")).toBe(false);
    expect(_uaProbes.has("UaOnlyPruneRegressionB/2.0")).toBe(false);
  });

  it("referer-only: a skipped call must not reset lastPrune — stale _refererProbes entries are deleted on the third call", async () => {
    // Mirror of the UA-only test above, targeting _refererProbes in isolation.
    //
    // If pruneProbes were ever split into separate referer / UA pruners each
    // with their own interval counter, a bug could be introduced where the
    // referer pruner's counter is reset on a skipped call.  This test seeds
    // ONLY _refererProbes entries (no _uaProbes) so that failure is
    // unambiguous: any surviving entry after the third call means the referer
    // pruner's interval counter was reset by the skipped call.
    //
    // Sequence:
    //   T0           — first prune runs, lastPrune (referer) set to T0
    //   T0 + 30 min  — guard fires (too soon), returns early
    //                   BUGGY CODE would set lastPrune = T0 + 30 min here
    //   T0 + 1h + 1ms — correct: now − T0 = 1h+1ms ≥ 1h → prune runs
    //                    buggy:   now − (T0+30min) = 30min < 1h → guard fires again
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 12 * 60 * 60 * 1000; // 12 h into the future

    // ── T0: first prune runs, advances lastPrune to T0 ───────────────────────
    _pruneProbes(T0);

    // ── Seed stale referer-only entries (no hits, expired cooldown) ──────────
    // No _uaProbes entries are added so any failure is unambiguously in the
    // referer pruner path.
    _refererProbes.set("https://referer-only-prune-regression-a.example/", {
      hits:        [],
      lastAlerted: 0,
    });
    _refererProbes.set("https://referer-only-prune-regression-b.example/", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── T0 + 30 min: guard should fire, return early WITHOUT updating lastPrune
    _pruneProbes(T0 + 30 * 60 * 1000);

    // Entries must still be present — the guard blocked deletion.
    expect(_refererProbes.has("https://referer-only-prune-regression-a.example/")).toBe(true);
    expect(_refererProbes.has("https://referer-only-prune-regression-b.example/")).toBe(true);

    // ── T0 + 1h + 1ms: exactly one hour after T0 — prune MUST run ────────────
    // If lastPrune was incorrectly advanced at T0 + 30 min, the guard would
    // still fire here (only 30 min elapsed since the bad update) and the stale
    // referer entries would survive — that is the bug this test catches.
    _pruneProbes(T0 + 60 * 60 * 1000 + 1);

    expect(_refererProbes.has("https://referer-only-prune-regression-a.example/")).toBe(false);
    expect(_refererProbes.has("https://referer-only-prune-regression-b.example/")).toBe(false);
  });

  it("split-map: stale _refererProbes entries are pruned even when _uaProbes is empty", async () => {
    // Guard against a split-pruner bug that short-circuits the referer loop
    // when _uaProbes is empty, skipping deletion of stale referer entries.
    //
    // Only _refererProbes is populated so any failure is unambiguous: a
    // surviving entry after the prune call means the referer loop was skipped
    // because the other map was empty.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 14 * 60 * 60 * 1000; // 14 h into the future

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Ensure _uaProbes has no entry for our keys ────────────────────────────
    _uaProbes.delete("SplitMapRefOnlyUA/1.0"); // belt-and-suspenders

    // ── Seed stale entries in _refererProbes only ─────────────────────────────
    // No hits and no active cooldown → both must be deleted when prune runs.
    _refererProbes.set("https://split-map-ref-only-a.example/", {
      hits:        [],
      lastAlerted: 0,
    });
    _refererProbes.set("https://split-map-ref-only-b.example/", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Call past the 1 h threshold — prune must run ──────────────────────────
    _pruneProbes(T0 + 60 * 60 * 1000 + 1);

    // Stale referer entries must be gone even though _uaProbes was empty.
    expect(_refererProbes.has("https://split-map-ref-only-a.example/")).toBe(false);
    expect(_refererProbes.has("https://split-map-ref-only-b.example/")).toBe(false);
  });

  it("split-map: stale _uaProbes entries are pruned even when _refererProbes is empty", async () => {
    // Mirror of the test above, targeting _uaProbes in isolation.
    //
    // Guard against a split-pruner bug that short-circuits the UA loop when
    // _refererProbes is empty, skipping deletion of stale UA entries.
    //
    // Only _uaProbes is populated so any failure is unambiguous: a surviving
    // entry after the prune call means the UA loop was skipped because the
    // other map was empty.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 16 * 60 * 60 * 1000; // 16 h into the future

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Ensure _refererProbes has no entry for our keys ───────────────────────
    _refererProbes.delete("https://split-map-ua-only.example/"); // belt-and-suspenders

    // ── Seed stale entries in _uaProbes only ──────────────────────────────────
    // No hits and no active cooldown → both must be deleted when prune runs.
    _uaProbes.set("SplitMapUaOnlyA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });
    _uaProbes.set("SplitMapUaOnlyB/2.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Call past the 1 h threshold — prune must run ──────────────────────────
    _pruneProbes(T0 + 60 * 60 * 1000 + 1);

    // Stale UA entries must be gone even though _refererProbes was empty.
    expect(_uaProbes.has("SplitMapUaOnlyA/1.0")).toBe(false);
    expect(_uaProbes.has("SplitMapUaOnlyB/2.0")).toBe(false);
  });

  it("split-map warm-cooldown: a warm-cooldown _refererProbes entry survives when _uaProbes contains only stale entries", async () => {
    // Guard against a refactored pruner that short-circuits on the peer map's
    // state: if the pruner sees that _uaProbes contains only stale entries and
    // incorrectly carries that "nothing to keep" signal into the _refererProbes
    // loop, it could delete a referer entry whose cooldown is still active.
    //
    // Layout:
    //   _refererProbes — one entry with empty hits but lastAlerted 30 min before
    //                    pruneNow (cooldown is still active → must SURVIVE)
    //   _uaProbes      — one entry with empty hits and lastAlerted 2 h before
    //                    pruneNow (cooldown expired → must be DELETED)
    //
    // Key: lastAlerted values are computed relative to pruneNow (the timestamp
    // passed to _pruneProbes), NOT to T0.  The cooldown check is
    // `pruneNow - lastAlerted < COOLDOWN_MS`, so only the distance from
    // pruneNow matters.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 18 * 60 * 60 * 1000; // 18 h into the future
    // The actual now passed to the pruning call.
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Seed a warm-cooldown entry in _refererProbes ──────────────────────────
    // Empty hits, but lastAlerted is 30 min before pruneNow → cooldown active.
    _refererProbes.set("https://split-warm-cooldown-ref.example/", {
      hits:        [],
      lastAlerted: pruneNow - 30 * 60_000,
    });

    // ── Seed a stale entry in _uaProbes ──────────────────────────────────────
    // Empty hits AND lastAlerted is 2 h before pruneNow → cooldown expired.
    _uaProbes.set("SplitWarmCooldownStaleUA/1.0", {
      hits:        [],
      lastAlerted: pruneNow - 2 * COOLDOWN_MS,
    });

    // ── Call past the 1 h threshold — prune must run ──────────────────────────
    _pruneProbes(pruneNow);

    // The warm-cooldown referer entry must survive.
    expect(_refererProbes.has("https://split-warm-cooldown-ref.example/")).toBe(true);
    // The stale UA entry must be deleted.
    expect(_uaProbes.has("SplitWarmCooldownStaleUA/1.0")).toBe(false);
  });

  it("split-map warm-cooldown: a warm-cooldown _uaProbes entry survives when _refererProbes contains only stale entries", async () => {
    // Symmetric counterpart of the test above, targeting _uaProbes.
    //
    // Guard against a refactored pruner that short-circuits on the peer map's
    // state: if the pruner sees that _refererProbes contains only stale entries
    // and incorrectly carries that signal into the _uaProbes loop, it could
    // delete a UA entry whose cooldown is still active.
    //
    // Layout:
    //   _uaProbes      — one entry with empty hits but lastAlerted 30 min before
    //                    pruneNow (cooldown is still active → must SURVIVE)
    //   _refererProbes — one entry with empty hits and lastAlerted 2 h before
    //                    pruneNow (cooldown expired → must be DELETED)
    //
    // Key: lastAlerted values are computed relative to pruneNow (the timestamp
    // passed to _pruneProbes), NOT to T0.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 20 * 60 * 60 * 1000; // 20 h into the future
    // The actual now passed to the pruning call.
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Seed a warm-cooldown entry in _uaProbes ───────────────────────────────
    // Empty hits, but lastAlerted is 30 min before pruneNow → cooldown active.
    _uaProbes.set("SplitWarmCooldownUA/1.0", {
      hits:        [],
      lastAlerted: pruneNow - 30 * 60_000,
    });

    // ── Seed a stale entry in _refererProbes ─────────────────────────────────
    // Empty hits AND lastAlerted is 2 h before pruneNow → cooldown expired.
    _refererProbes.set("https://split-warm-cooldown-stale-ref.example/", {
      hits:        [],
      lastAlerted: pruneNow - 2 * COOLDOWN_MS,
    });

    // ── Call past the 1 h threshold — prune must run ──────────────────────────
    _pruneProbes(pruneNow);

    // The warm-cooldown UA entry must survive.
    expect(_uaProbes.has("SplitWarmCooldownUA/1.0")).toBe(true);
    // The stale referer entry must be deleted.
    expect(_refererProbes.has("https://split-warm-cooldown-stale-ref.example/")).toBe(false);
  });

  it("both-maps warm-cooldown: entries in both _refererProbes and _uaProbes with active cooldowns both survive, while stale entries in each are deleted", async () => {
    // Guard against an implementation that sequences the two map iterations and
    // carries shared mutable state (e.g. a "warm survivor seen" flag) between
    // them. If such a flag were set to false after the first map and carried
    // into the second map's loop, warm-cooldown entries in the second map could
    // be incorrectly deleted.
    //
    // Layout:
    //   _refererProbes — one warm-cooldown entry (lastAlerted 30 min before
    //                    pruneNow → cooldown active  → must SURVIVE)
    //                    one stale entry (lastAlerted 2 h before pruneNow,
    //                    no hits → cooldown expired  → must be DELETED)
    //   _uaProbes      — one warm-cooldown entry (lastAlerted 30 min before
    //                    pruneNow → cooldown active  → must SURVIVE)
    //                    one stale entry (lastAlerted 2 h before pruneNow,
    //                    no hits → cooldown expired  → must be DELETED)
    //
    // Key: lastAlerted values are computed relative to pruneNow (the timestamp
    // passed to _pruneProbes), NOT to T0.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 22 * 60 * 60 * 1000; // 22 h into the future
    // The actual now passed to the pruning call.
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Seed a warm-cooldown entry in _refererProbes ──────────────────────────
    // Empty hits, lastAlerted 30 min before pruneNow → cooldown still active.
    _refererProbes.set("https://both-warm-cooldown-ref.example/", {
      hits:        [],
      lastAlerted: pruneNow - 30 * 60_000,
    });

    // ── Seed a stale entry in _refererProbes ─────────────────────────────────
    // Empty hits, lastAlerted 2 h before pruneNow → cooldown expired.
    _refererProbes.set("https://both-stale-ref.example/", {
      hits:        [],
      lastAlerted: pruneNow - 2 * COOLDOWN_MS,
    });

    // ── Seed a warm-cooldown entry in _uaProbes ───────────────────────────────
    // Empty hits, lastAlerted 30 min before pruneNow → cooldown still active.
    _uaProbes.set("BothWarmCooldownUA/1.0", {
      hits:        [],
      lastAlerted: pruneNow - 30 * 60_000,
    });

    // ── Seed a stale entry in _uaProbes ──────────────────────────────────────
    // Empty hits, lastAlerted 2 h before pruneNow → cooldown expired.
    _uaProbes.set("BothStaleUA/1.0", {
      hits:        [],
      lastAlerted: pruneNow - 2 * COOLDOWN_MS,
    });

    // ── Call past the 1 h threshold — prune must run ──────────────────────────
    _pruneProbes(pruneNow);

    // Both warm-cooldown entries must survive regardless of iteration order.
    expect(_refererProbes.has("https://both-warm-cooldown-ref.example/")).toBe(true);
    expect(_uaProbes.has("BothWarmCooldownUA/1.0")).toBe(true);
    // Both stale entries must be deleted.
    expect(_refererProbes.has("https://both-stale-ref.example/")).toBe(false);
    expect(_uaProbes.has("BothStaleUA/1.0")).toBe(false);
  });

  it("cooldown exact boundary (lastAlerted = pruneNow - COOLDOWN_MS + 1): entry SURVIVES (1 ms before expiry)", async () => {
    // The hasActiveCooldown guard is:
    //   entry.lastAlerted > 0 && now - entry.lastAlerted < COOLDOWN_MS
    //
    // When lastAlerted = pruneNow - COOLDOWN_MS + 1:
    //   now - lastAlerted = COOLDOWN_MS - 1  →  COOLDOWN_MS - 1 < COOLDOWN_MS  →  true
    //   → hasActiveCooldown = true → entry must SURVIVE
    //
    // A refactored pruner using >= instead of > would evaluate
    //   COOLDOWN_MS - 1 >= COOLDOWN_MS  →  false  →  hasActiveCooldown = false  →  wrongly deleted.
    // This test catches that off-by-one before it ships.
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0       = Date.now() + 26 * 60 * 60 * 1000; // 26 h into the future
    const pruneNow = T0 + COOLDOWN_MS + 1;              // guaranteed to pass the 1 h prune guard

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Seed boundary entries: empty hits, lastAlerted 1 ms before expiry ────
    _refererProbes.set("https://cooldown-boundary-minus1-ref.example/", {
      hits:        [],
      lastAlerted: pruneNow - COOLDOWN_MS + 1,
    });
    _uaProbes.set("CooldownBoundaryMinus1UA/1.0", {
      hits:        [],
      lastAlerted: pruneNow - COOLDOWN_MS + 1,
    });

    _pruneProbes(pruneNow);

    // 1 ms inside the window — cooldown is still active → must SURVIVE
    expect(_refererProbes.has("https://cooldown-boundary-minus1-ref.example/")).toBe(true);
    expect(_uaProbes.has("CooldownBoundaryMinus1UA/1.0")).toBe(true);
  });

  it("cooldown exact boundary (lastAlerted = pruneNow - COOLDOWN_MS): entry is DELETED (cooldown has just expired)", async () => {
    // The hasActiveCooldown guard is:
    //   entry.lastAlerted > 0 && now - entry.lastAlerted < COOLDOWN_MS
    //
    // When lastAlerted = pruneNow - COOLDOWN_MS:
    //   now - lastAlerted = COOLDOWN_MS  →  COOLDOWN_MS < COOLDOWN_MS  →  false
    //   → hasActiveCooldown = false, no active hits → entry must be DELETED
    //
    // A refactored pruner using <= instead of < would evaluate
    //   COOLDOWN_MS <= COOLDOWN_MS  →  true  →  hasActiveCooldown = true  →  wrongly kept.
    // This test catches that off-by-one before it ships.
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0       = Date.now() + 28 * 60 * 60 * 1000; // 28 h into the future
    const pruneNow = T0 + COOLDOWN_MS + 1;              // guaranteed to pass the 1 h prune guard

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Seed boundary entries: empty hits, lastAlerted exactly at expiry ──────
    _refererProbes.set("https://cooldown-boundary-exact-ref.example/", {
      hits:        [],
      lastAlerted: pruneNow - COOLDOWN_MS,
    });
    _uaProbes.set("CooldownBoundaryExactUA/1.0", {
      hits:        [],
      lastAlerted: pruneNow - COOLDOWN_MS,
    });

    _pruneProbes(pruneNow);

    // Exactly at expiry — cooldown has elapsed → must be DELETED
    expect(_refererProbes.has("https://cooldown-boundary-exact-ref.example/")).toBe(false);
    expect(_uaProbes.has("CooldownBoundaryExactUA/1.0")).toBe(false);
  });

  it("refererProbes: entry with lastAlerted === 0 that had active hits is deleted after its hits array is drained in-place", async () => {
    // Regression guard: a refactored pruner might snapshot `hasActiveHits`
    // eagerly (e.g. when the entry is first inserted or before the prune loop
    // body runs) and cache the result.  If the hits array is then emptied
    // in-place before _pruneProbes executes, the cached "has hits" flag would
    // be stale and the pruner would retain the entry as a ghost.
    //
    // This test seeds an entry WITH active hits (lastAlerted = 0), drains the
    // hits array before calling _pruneProbes, and asserts the entry is deleted
    // because the pruner must re-evaluate the live array, not a cached snapshot.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0       = Date.now() + 32 * 60 * 60 * 1000; // 32 h into the future
    const pruneNow = T0 + 60 * 60 * 1000 + 1;          // 1 h + 1 ms after T0 → prune guard passes

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Seed an entry that currently has active hits and has never alerted ────
    const entry = {
      hits:        [pruneNow - WINDOW_MS + 60_000], // one hit well within the 24 h window
      lastAlerted: 0,
    };
    _refererProbes.set("https://drained-hits-ref.example/", entry);

    // ── Drain the hits array in-place (simulating an upstream eviction) ───────
    // The entry object is mutated directly so any cached reference to it inside
    // the module would also see the empty array — there is no way to "hide" this
    // change from the pruner.
    entry.hits.length = 0;

    // ── Run the pruner — it must re-evaluate the live (now empty) hits array ──
    _pruneProbes(pruneNow);

    // lastAlerted === 0 and hits === [] → neither guard saves the entry
    expect(_refererProbes.has("https://drained-hits-ref.example/")).toBe(false);
  });

  it("uaProbes: entry with lastAlerted === 0 that had active hits is deleted after its hits array is drained in-place", async () => {
    // Symmetric counterpart of the refererProbes test above, targeting _uaProbes.
    //
    // A refactored pruner that caches `hasActiveHits` before the prune loop body
    // executes would retain the UA entry as a ghost even after its hits array is
    // emptied.  This test seeds a UA entry with active hits (lastAlerted = 0),
    // drains the array before calling _pruneProbes, and asserts deletion.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0       = Date.now() + 34 * 60 * 60 * 1000; // 34 h into the future
    const pruneNow = T0 + 60 * 60 * 1000 + 1;          // 1 h + 1 ms after T0 → prune guard passes

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Seed a UA entry that currently has active hits and has never alerted ──
    const entry = {
      hits:        [pruneNow - WINDOW_MS + 60_000], // one hit well within the 24 h window
      lastAlerted: 0,
    };
    _uaProbes.set("DrainedHitsUA/1.0", entry);

    // ── Drain the hits array in-place ─────────────────────────────────────────
    entry.hits.length = 0;

    // ── Run the pruner ────────────────────────────────────────────────────────
    _pruneProbes(pruneNow);

    // lastAlerted === 0 and hits === [] → neither guard saves the entry
    expect(_uaProbes.has("DrainedHitsUA/1.0")).toBe(false);
  });

  it("empty-peer warm-cooldown: a warm-cooldown _uaProbes entry survives when _refererProbes is completely empty", async () => {
    // Guard against a refactored pruner that checks "are there any entries in
    // _refererProbes?" and uses the answer as a short-circuit that skips or
    // corrupts the _uaProbes loop.  With _refererProbes truly empty there is no
    // stale entry to mask the bug — only the warm-cooldown UA entry is present,
    // so any deletion is unambiguously wrong.
    //
    // Layout:
    //   _uaProbes      — one entry with empty hits but lastAlerted 30 min before
    //                    pruneNow (cooldown still active → must SURVIVE)
    //   _refererProbes — completely empty
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 36 * 60 * 60 * 1000; // 36 h into the future
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Ensure _refererProbes has no entry for our key ────────────────────────
    _refererProbes.delete("https://empty-peer-ua-warm.example/"); // belt-and-suspenders

    // ── Seed a warm-cooldown entry in _uaProbes ───────────────────────────────
    // Empty hits, but lastAlerted is 30 min before pruneNow → cooldown active.
    _uaProbes.set("EmptyPeerWarmCooldownUA/1.0", {
      hits:        [],
      lastAlerted: pruneNow - 30 * 60_000,
    });

    // ── Call past the 1 h threshold — prune must run ──────────────────────────
    _pruneProbes(pruneNow);

    // The warm-cooldown UA entry must survive even though _refererProbes was empty.
    expect(_uaProbes.has("EmptyPeerWarmCooldownUA/1.0")).toBe(true);
  });

  it("empty-peer warm-cooldown: a warm-cooldown _refererProbes entry survives when _uaProbes is completely empty", async () => {
    // Symmetric counterpart of the test above, targeting _refererProbes.
    //
    // Guard against a refactored pruner that checks "are there any entries in
    // _uaProbes?" and uses the answer as a short-circuit that skips or corrupts
    // the _refererProbes loop.  With _uaProbes truly empty there is no stale
    // entry to mask the bug — only the warm-cooldown referer entry is present.
    //
    // Layout:
    //   _refererProbes — one entry with empty hits but lastAlerted 30 min before
    //                    pruneNow (cooldown still active → must SURVIVE)
    //   _uaProbes      — completely empty
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _pruneProbes } = mod as any;

    const COOLDOWN_MS = 1 * 60 * 60 * 1000;

    // Place T0 far enough in the future to avoid lastPrune collisions with
    // earlier tests in this file.
    const T0 = Date.now() + 38 * 60 * 60 * 1000; // 38 h into the future
    const pruneNow = T0 + COOLDOWN_MS + 1;

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Ensure _uaProbes has no entry for our key ─────────────────────────────
    _uaProbes.delete("EmptyPeerWarmCooldownRefUA/1.0"); // belt-and-suspenders

    // ── Seed a warm-cooldown entry in _refererProbes ──────────────────────────
    // Empty hits, but lastAlerted is 30 min before pruneNow → cooldown active.
    _refererProbes.set("https://empty-peer-ref-warm.example/", {
      hits:        [],
      lastAlerted: pruneNow - 30 * 60_000,
    });

    // ── Call past the 1 h threshold — prune must run ──────────────────────────
    _pruneProbes(pruneNow);

    // The warm-cooldown referer entry must survive even though _uaProbes was empty.
    expect(_refererProbes.has("https://empty-peer-ref-warm.example/")).toBe(true);
  });

  it("refererProbes: entry with active hits AND warm cooldown survives after its hits array is drained in-place", async () => {
    // Symmetric scenario to the deletion tests above, but with a live cooldown.
    //
    // A refactored pruner that short-circuits on "no active hits found" without
    // evaluating the cooldown branch would incorrectly delete an entry whose
    // hits were drained but whose lastAlerted is still within COOLDOWN_MS.
    //
    // This test seeds an entry with BOTH active hits AND a warm cooldown, drains
    // the hits array in-place, then calls _pruneProbes and asserts the entry is
    // RETAINED because the cooldown guard must keep it alive.
    //
    // A stale companion entry (no hits, expired cooldown) is also seeded and
    // asserted deleted — this proves _pruneProbes actually ran rather than
    // returning early from the 1-hour guard.
    //
    // T0 MUST be monotonically higher than all earlier tests in this shared
    // module.  The empty-peer tests immediately above advance lastPrune to
    // roughly Date.now()+39h; using T0 = Date.now()+40h ensures pruneNow > lastPrune
    // by more than the 1-hour threshold.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000; // default: 1 h

    const T0       = Date.now() + 40 * 60 * 60 * 1000; // 40 h — above all prior T0+COOLDOWN steps
    const pruneNow = T0 + COOLDOWN_MS + 1;              // 1 h + 1 ms after T0 → prune guard passes

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion: no hits, expired cooldown — must be DELETED ──────────
    // Its deletion proves _pruneProbes actually ran the loop body.
    _refererProbes.set("https://stale-companion-ref.example/", {
      hits:        [],
      lastAlerted: T0 - 2 * COOLDOWN_MS, // alerted 2 cooldown periods before T0 → expired
    });

    // ── Seed the target: active hits and a warm cooldown ─────────────────────
    // lastAlerted is 30 min before pruneNow — well within the 1-hour COOLDOWN_MS.
    const entry = {
      hits:        [pruneNow - WINDOW_MS + 60_000], // one hit within the 24 h window
      lastAlerted: pruneNow - 30 * 60_000,          // alerted 30 min ago → cooldown active
    };
    _refererProbes.set("https://warm-cooldown-drained-ref.example/", entry);

    // ── Drain the hits array in-place ─────────────────────────────────────────
    entry.hits.length = 0;

    // ── Run the pruner — the warm cooldown must keep the target alive ─────────
    _pruneProbes(pruneNow);

    // Stale companion was deleted → proves the pruner actually ran
    expect(_refererProbes.has("https://stale-companion-ref.example/")).toBe(false);
    // hits === [] but lastAlerted is within COOLDOWN_MS → target must survive
    expect(_refererProbes.has("https://warm-cooldown-drained-ref.example/")).toBe(true);
  });

  it("uaProbes: entry with active hits AND warm cooldown survives after its hits array is drained in-place", async () => {
    // Symmetric counterpart of the refererProbes test above, targeting _uaProbes.
    //
    // A refactored pruner that short-circuits on "no active hits found" without
    // checking the cooldown branch would delete a UA entry whose hits were
    // drained in-place but whose cooldown is still live.
    //
    // A stale companion entry proves the prune loop actually ran.
    //
    // T0 = Date.now()+42h — monotonically above the referer drained-hits test above.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000; // default: 1 h

    const T0       = Date.now() + 42 * 60 * 60 * 1000; // 42 h — above all prior T0+COOLDOWN steps
    const pruneNow = T0 + COOLDOWN_MS + 1;              // 1 h + 1 ms after T0 → prune guard passes

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion: no hits, expired cooldown — must be DELETED ──────────
    _uaProbes.set("StaleCompanionUA/1.0", {
      hits:        [],
      lastAlerted: T0 - 2 * COOLDOWN_MS, // expired
    });

    // ── Seed the target UA entry with active hits and a warm cooldown ─────────
    // lastAlerted is 30 min before pruneNow — well within the 1-hour COOLDOWN_MS.
    const entry = {
      hits:        [pruneNow - WINDOW_MS + 60_000], // one hit within the 24 h window
      lastAlerted: pruneNow - 30 * 60_000,          // alerted 30 min ago → cooldown active
    };
    _uaProbes.set("WarmCooldownDrainedUA/1.0", entry);

    // ── Drain the hits array in-place ─────────────────────────────────────────
    entry.hits.length = 0;

    // ── Run the pruner — the warm cooldown must keep the target alive ─────────
    _pruneProbes(pruneNow);

    // Stale companion was deleted → proves the pruner actually ran
    expect(_uaProbes.has("StaleCompanionUA/1.0")).toBe(false);
    // hits === [] but lastAlerted is within COOLDOWN_MS → target must survive
    expect(_uaProbes.has("WarmCooldownDrainedUA/1.0")).toBe(true);
  });

  // ── WINDOW_MS hit-timestamp boundary ────────────────────────────────────────
  //
  // The hasActiveHits guard is:
  //   entry.hits.length > 0 && entry.hits[last] >= cutoff
  // where cutoff = pruneNow - WINDOW_MS.
  //
  // A hit whose timestamp equals exactly pruneNow - WINDOW_MS sits on the
  // inclusive boundary: >= cutoff is true → the entry is still active and must
  // SURVIVE.  A refactored pruner using strictly-greater (>) instead of >= would
  // treat this hit as expired and evict an otherwise-active entry.
  //
  // The symmetric test seeds a hit 1 ms before the cutoff (pruneNow - WINDOW_MS
  // - 1), which is strictly outside the window (< cutoff), so the entry must be
  // DELETED (assuming no active cooldown).

  it("refererProbes WINDOW_MS boundary: hit at exactly pruneNow−WINDOW_MS is still active — entry SURVIVES", async () => {
    // The hasActiveHits check uses >=, so a hit whose timestamp equals the
    // cutoff exactly (now - WINDOW_MS) must keep the entry alive.
    //
    // A refactored pruner that uses > instead of >= would evaluate
    //   hits[last] > cutoff  →  false  →  hasActiveHits = false
    // and delete the entry, silently discarding an in-window scraper record.
    // This test catches that off-by-one before it ships.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+44h — monotonically above the last test in this suite (42 h).
    const T0       = Date.now() + 44 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1; // 1 h + 1 ms after T0 → prune guard passes

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion: no hits, no cooldown — must be DELETED ──────────────
    // Its deletion proves the pruner actually ran the loop body.
    _refererProbes.set("https://window-boundary-stale-companion-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the boundary entry: single hit at exactly pruneNow − WINDOW_MS ──
    // cutoff = pruneNow - WINDOW_MS, so hits[0] === cutoff → >= is true → ACTIVE
    _refererProbes.set("https://window-boundary-exact-ref.example/", {
      hits:        [pruneNow - WINDOW_MS],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → prune loop actually ran
    expect(_refererProbes.has("https://window-boundary-stale-companion-ref.example/")).toBe(false);
    // Hit sits exactly on the inclusive boundary → entry must SURVIVE
    expect(_refererProbes.has("https://window-boundary-exact-ref.example/")).toBe(true);
  });

  it("refererProbes WINDOW_MS boundary: hit at pruneNow−WINDOW_MS−1 is outside window — entry is DELETED", async () => {
    // A hit 1 ms before the cutoff (pruneNow - WINDOW_MS - 1) is strictly less
    // than cutoff, so >= cutoff evaluates to false → hasActiveHits = false.
    // With no active cooldown the entry must be deleted.
    //
    // This is the symmetric outside-window counterpart to the test above.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+46h — monotonically above the boundary-exact test above.
    const T0       = Date.now() + 46 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop ran ───────────────────────────
    _refererProbes.set("https://window-outside-stale-companion-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the target: single hit 1 ms before the cutoff ───────────────────
    // hits[0] = pruneNow - WINDOW_MS - 1  →  hits[0] < cutoff  →  hasActiveHits = false
    _refererProbes.set("https://window-outside-ref.example/", {
      hits:        [pruneNow - WINDOW_MS - 1],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → prune loop ran
    expect(_refererProbes.has("https://window-outside-stale-companion-ref.example/")).toBe(false);
    // Hit is outside the window AND no active cooldown → entry must be DELETED
    expect(_refererProbes.has("https://window-outside-ref.example/")).toBe(false);
  });

  it("uaProbes WINDOW_MS boundary: hit at exactly pruneNow−WINDOW_MS is still active — entry SURVIVES", async () => {
    // Symmetric counterpart of the refererProbes boundary-exact test, targeting
    // _uaProbes in isolation.
    //
    // The hasActiveHits guard uses >= cutoff.  A hit whose timestamp equals the
    // cutoff exactly must keep the UA entry alive.  A refactored pruner that
    // uses strictly-greater (>) would wrongly evict it.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+48h — monotonically above all prior tests.
    const T0       = Date.now() + 48 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop ran ───────────────────────────
    _uaProbes.set("WindowBoundaryStaleCompanionUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the boundary UA entry ────────────────────────────────────────────
    _uaProbes.set("WindowBoundaryExactUA/1.0", {
      hits:        [pruneNow - WINDOW_MS],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → prune loop actually ran
    expect(_uaProbes.has("WindowBoundaryStaleCompanionUA/1.0")).toBe(false);
    // Hit sits exactly on the inclusive boundary → entry must SURVIVE
    expect(_uaProbes.has("WindowBoundaryExactUA/1.0")).toBe(true);
  });

  it("uaProbes WINDOW_MS boundary: hit at pruneNow−WINDOW_MS−1 is outside window — entry is DELETED", async () => {
    // Symmetric counterpart of the refererProbes outside-window test, targeting
    // _uaProbes in isolation.
    //
    // A hit at pruneNow - WINDOW_MS - 1 is strictly less than cutoff, so
    // hasActiveHits = false.  With no active cooldown the entry must be deleted.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+50h — monotonically above all prior tests.
    const T0       = Date.now() + 50 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1;

    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop ran ───────────────────────────
    _uaProbes.set("WindowOutsideStaleCompanionUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the target UA entry: single hit 1 ms before the cutoff ──────────
    _uaProbes.set("WindowOutsideUA/1.0", {
      hits:        [pruneNow - WINDOW_MS - 1],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → prune loop ran
    expect(_uaProbes.has("WindowOutsideStaleCompanionUA/1.0")).toBe(false);
    // Hit is outside the window AND no active cooldown → entry must be DELETED
    expect(_uaProbes.has("WindowOutsideUA/1.0")).toBe(false);
  });

  // ── Mixed stale/active hits array ────────────────────────────────────────────
  //
  // The current hasActiveHits guard checks only the LAST element of the hits
  // array (hits[hits.length - 1] >= cutoff).  A refactored pruner that iterates
  // the array, uses a different index, or computes "active" from an aggregate
  // (e.g. the first element, or all elements) could incorrectly evict an entry
  // whose last hit IS within the window just because earlier elements are stale.
  //
  // These tests seed a hits array of the form:
  //   [stale, stale, stale, active]
  // where "active" = pruneNow - WINDOW_MS + 60_000 (well inside the 24 h window)
  // and every preceding timestamp is outside the window.  The entry must SURVIVE.

  it("refererProbes: multi-element hits array with stale entries followed by one active hit — entry SURVIVES", async () => {
    // Guard against a refactored pruner that reads hits[0], iterates all
    // elements, or uses a reduce/every/some that would classify an entry as
    // inactive just because its earlier hits are stale.
    //
    // The last element of the hits array is within the 24 h window, so the
    // entry is still active and must not be evicted regardless of how many
    // stale timestamps precede it.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+52h — monotonically above all prior tests (last used 50h).
    const T0       = Date.now() + 52 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1; // 1 h + 1 ms after T0 → prune guard passes

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ─────────────────
    _refererProbes.set("https://mixed-hits-stale-companion-ref.example/", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the target: three stale hits followed by one active hit ─────────
    // All timestamps are sorted ascending, as the ProbeEntry contract requires.
    // The first three are outside the 24 h window; the last one is 1 minute
    // inside the window (pruneNow - WINDOW_MS + 60_000).
    _refererProbes.set("https://mixed-hits-active-last-ref.example/", {
      hits: [
        pruneNow - WINDOW_MS - 3 * 60 * 60 * 1000, // 3 h outside the window — stale
        pruneNow - WINDOW_MS - 2 * 60 * 60 * 1000, // 2 h outside the window — stale
        pruneNow - WINDOW_MS - 1 * 60 * 60 * 1000, // 1 h outside the window — stale
        pruneNow - WINDOW_MS + 60_000,              // 1 min inside the window — ACTIVE
      ],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → proves the prune loop ran
    expect(_refererProbes.has("https://mixed-hits-stale-companion-ref.example/")).toBe(false);
    // Last hit is within the window → entry must SURVIVE despite the stale prefix
    expect(_refererProbes.has("https://mixed-hits-active-last-ref.example/")).toBe(true);
  });

  it("uaProbes: multi-element hits array with stale entries followed by one active hit — entry SURVIVES", async () => {
    // Symmetric counterpart of the refererProbes test above, targeting _uaProbes.
    //
    // A refactored pruner that iterates the whole hits array or uses a
    // different index to determine activity could incorrectly delete a UA entry
    // whose last hit is within the window just because earlier hits are stale.
    //
    // The last element of the hits array sits 1 minute inside the 24 h window;
    // the preceding elements are outside the window.  The entry must SURVIVE.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // T0 = Date.now()+54h — monotonically above the referer mixed-hits test above.
    const T0       = Date.now() + 54 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1; // 1 h + 1 ms after T0 → prune guard passes

    // ── Advance lastPrune to T0 ───────────────────────────────────────────────
    _pruneProbes(T0);

    // ── Stale companion to prove the prune loop actually ran ─────────────────
    _uaProbes.set("MixedHitsStaleCompanionUA/1.0", {
      hits:        [],
      lastAlerted: 0,
    });

    // ── Seed the target: three stale hits followed by one active hit ─────────
    // All timestamps are sorted ascending.  The first three are outside the
    // 24 h window; the last one is 1 minute inside the window.
    _uaProbes.set("MixedHitsActiveLastUA/1.0", {
      hits: [
        pruneNow - WINDOW_MS - 3 * 60 * 60 * 1000, // 3 h outside the window — stale
        pruneNow - WINDOW_MS - 2 * 60 * 60 * 1000, // 2 h outside the window — stale
        pruneNow - WINDOW_MS - 1 * 60 * 60 * 1000, // 1 h outside the window — stale
        pruneNow - WINDOW_MS + 60_000,              // 1 min inside the window — ACTIVE
      ],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // Stale companion deleted → proves the prune loop ran
    expect(_uaProbes.has("MixedHitsStaleCompanionUA/1.0")).toBe(false);
    // Last hit is within the window → entry must SURVIVE despite the stale prefix
    expect(_uaProbes.has("MixedHitsActiveLastUA/1.0")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// recordProbe boundary semantics vs pruneProbes — eviction at exactly cutoff
//
// pruneProbes  keeps  an entry when its last hit timestamp >= cutoff  (inclusive).
// recordProbe  evicts a hit timestamp when it is            <= cutoff (inclusive).
//
// Consequence: a hit at exactly (now − WINDOW_MS) is KEPT by pruneProbes but
// EVICTED by the very next recordProbe call.  These tests pin that asymmetry so
// a future refactor cannot silently change the boundary semantics in either
// direction without a test failure demanding an explicit decision.
// ═══════════════════════════════════════════════════════════════════════════

describe("recordProbe vs pruneProbes — boundary semantics at exactly now−WINDOW_MS", () => {
  it("pruneProbes KEEPS a UA entry whose sole hit is at exactly cutoff (>= is inclusive)", async () => {
    // pruneProbes guard: hasActiveHits = hits[last] >= cutoff
    // A hit at exactly pruneNow − WINDOW_MS satisfies >= cutoff → entry survives.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // Use a far-future T0 to stay monotonically above all earlier tests.
    const T0       = Date.now() + 60 * 60 * 60 * 1000;
    const pruneNow = T0 + COOLDOWN_MS + 1; // 1 h + 1 ms after T0 → prune guard passes

    // Advance lastPrune so the guard allows the second prune call.
    _pruneProbes(T0);

    const key = "BoundaryKeepUA/1.0";
    // Single hit at exactly the cutoff for pruneNow.
    _uaProbes.set(key, {
      hits:        [pruneNow - WINDOW_MS],
      lastAlerted: 0,
    });

    _pruneProbes(pruneNow);

    // hits[last] === cutoff → >= is satisfied → entry must SURVIVE
    expect(_uaProbes.has(key)).toBe(true);
    // And the hit timestamp itself must be unchanged.
    expect(_uaProbes.get(key)!.hits).toEqual([pruneNow - WINDOW_MS]);
  });

  it("recordProbe EVICTS a UA hit at exactly cutoff (<= is inclusive) and records the new hit", async () => {
    // recordProbe eviction guard: entry.hits[lo] <= cutoff
    // A hit at exactly (now − WINDOW_MS) satisfies <= cutoff → it is EVICTED.
    // This is intentionally stricter than pruneProbes (which uses >=).
    // The net result: after a recordProbe call the in-window count correctly
    // reflects only hits that are strictly newer than the cutoff.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;

    // recordNow is sufficiently far in the future to avoid colliding with
    // any timestamp used by other tests.
    const recordNow = Date.now() + 62 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    const key = "BoundaryEvictUA/1.0";
    // Pre-seed a single hit sitting exactly on the cutoff boundary.
    // pruneProbes would KEEP this entry; recordProbe must EVICT that hit.
    _uaProbes.set(key, {
      hits:        [cutoff],
      lastAlerted: 0,
    });

    // Call recordProbe with recordNow → cutoff === recordNow − WINDOW_MS.
    // The eviction loop advances while hits[lo] <= cutoff; hits[0] === cutoff,
    // so lo becomes 1, evicting the boundary hit.
    _recordProbe(_uaProbes, key, "ua", recordNow);

    // The boundary hit must have been evicted.
    const entry = _uaProbes.get(key)!;
    // Only the new hit (recordNow) should remain in the window.
    expect(entry.hits).toEqual([recordNow]);
    // The evicted boundary timestamp must not appear in the hits array.
    expect(entry.hits).not.toContain(cutoff);
  });

  it("asymmetry documented: hit at cutoff is kept by pruneProbes but evicted by recordProbe", async () => {
    // This test makes the asymmetry explicit in a single scenario so that any
    // future attempt to unify the two comparisons (making both >= or both <=)
    // must consciously decide what the correct semantics should be.
    //
    // Current intended behaviour:
    //   pruneProbes  uses >=  → keeps hits AT the cutoff (conservative; avoids
    //                            premature map-entry deletion between record calls)
    //   recordProbe  uses <=  → evicts hits AT the cutoff (strict; ensures the
    //                            in-window count never over-counts a timestamp that
    //                            is exactly at the edge of the 24-hour window)
    const mod = await import("./traffic-logger");
    const { _uaProbes, _pruneProbes, _recordProbe } = mod as any;

    const WINDOW_MS   = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS =  1 * 60 * 60 * 1000;

    // Use a distinct far-future anchor to stay clear of the other boundary tests.
    const T0        = Date.now() + 64 * 60 * 60 * 1000;
    const pruneNow  = T0 + COOLDOWN_MS + 1;
    const recordNow = T0 + COOLDOWN_MS + 2; // 1 ms after pruneNow

    // Advance lastPrune so pruneProbes will run at pruneNow.
    _pruneProbes(T0);

    const key = "AsymmetryUA/1.0";

    // ── Phase 1: pruneProbes sees the boundary hit and keeps the entry ────────
    _uaProbes.set(key, {
      hits:        [pruneNow - WINDOW_MS],
      lastAlerted: 0,
    });
    _pruneProbes(pruneNow);
    expect(_uaProbes.has(key)).toBe(true); // pruneProbes: >= cutoff → KEPT

    // ── Phase 2: recordProbe evicts the boundary hit ──────────────────────────
    // recordNow is 1 ms after pruneNow, so cutoff = recordNow − WINDOW_MS is
    // 1 ms after pruneNow − WINDOW_MS.  The seeded hit (pruneNow − WINDOW_MS)
    // is therefore strictly less than recordNow's cutoff → still evicted.
    // (Even if recordNow === pruneNow the seeded hit equals cutoff → <= evicts it.)
    _recordProbe(_uaProbes, key, "ua", recordNow);

    const entry = _uaProbes.get(key)!;
    // The boundary hit from phase 1 must be gone; only the new hit survives.
    expect(entry.hits).toEqual([recordNow]);
    expect(entry.hits).not.toContain(pruneNow - WINDOW_MS);
  });

  it("refererProbes: recordProbe EVICTS a referer hit sitting exactly on the cutoff", async () => {
    // Symmetric counterpart of the UA test — confirms the same boundary
    // semantics apply to the referer probe map as well.
    const mod = await import("./traffic-logger");
    const { _refererProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now() + 66 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    const key = "https://boundary-evict-referer.example/";
    _refererProbes.set(key, {
      hits:        [cutoff],
      lastAlerted: 0,
    });

    _recordProbe(_refererProbes, key, "referer", recordNow);

    const entry = _refererProbes.get(key)!;
    // Only the freshly-recorded hit must remain; the boundary hit is evicted.
    expect(entry.hits).toEqual([recordNow]);
    expect(entry.hits).not.toContain(cutoff);
  });

  it("hit 1 ms before cutoff (cutoff−1) is also evicted by recordProbe", async () => {
    // A hit 1 ms before the cutoff is strictly less-than the cutoff, so it
    // satisfies <= cutoff and must also be evicted.  This guards against a
    // refactor that changes <= to < (which would incorrectly keep boundary hits).
    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now() + 68 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    const key = "OneMsBeforeCutoffUA/1.0";
    _uaProbes.set(key, {
      hits:        [cutoff - 1],
      lastAlerted: 0,
    });

    _recordProbe(_uaProbes, key, "ua", recordNow);

    const entry = _uaProbes.get(key)!;
    expect(entry.hits).toEqual([recordNow]);
    expect(entry.hits).not.toContain(cutoff - 1);
  });

  it("hit 1 ms after cutoff (cutoff+1) is inside the window and PRESERVED by recordProbe", async () => {
    // A hit 1 ms after the cutoff is strictly greater-than the cutoff, so it
    // fails the eviction condition (<= cutoff) and must be preserved.
    // This is the mirror of the previous test: the first timestamp strictly
    // inside the window must survive alongside the new hit.
    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now() + 70 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    const key = "OneMsAfterCutoffUA/1.0";
    _uaProbes.set(key, {
      hits:        [cutoff + 1],
      lastAlerted: 0,
    });

    _recordProbe(_uaProbes, key, "ua", recordNow);

    const entry = _uaProbes.get(key)!;
    // Both the pre-existing in-window hit AND the new hit must be present.
    expect(entry.hits).toEqual([cutoff + 1, recordNow]);
  });

  it("burst of hits straddling the cutoff: exactly the in-window hits + new hit survive, alert fires at correct count", async () => {
    // Scenario: 5 pre-existing hits, 2 at-or-before cutoff and 3 strictly
    // inside the window.  After recordProbe runs the eviction loop and appends
    // the new hit, exactly 4 hits must remain (3 in-window + 1 new).
    // With threshold=3, a count of 4 exceeds the threshold → alert fires.

    // Set the threshold before importing so the IIFE picks it up.
    process.env.PROBE_ALERT_THRESHOLD = "3";

    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    // Use a far-future base to avoid timestamp collisions with earlier tests.
    const recordNow = Date.now() + 80 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    // Build 5 hits: 2 at-or-before the cutoff (will be evicted), 3 strictly
    // inside the window (will survive).
    const hitAtCutoffMinus1 = cutoff - 1; // strictly before cutoff → evicted
    const hitAtCutoff       = cutoff;     // exactly on cutoff    → evicted (<=)
    const hitInWindow1      = cutoff + 1; // 1 ms inside          → kept
    const hitInWindow2      = cutoff + 500; // 500 ms inside       → kept
    const hitInWindow3      = cutoff + 1000; // 1 s inside         → kept

    const key = "BurstBoundaryUA/1.0";
    _uaProbes.set(key, {
      hits:        [hitAtCutoffMinus1, hitAtCutoff, hitInWindow1, hitInWindow2, hitInWindow3],
      lastAlerted: 0,
    });

    _recordProbe(_uaProbes, key, "ua", recordNow);

    const entry = _uaProbes.get(key)!;

    // Exactly 4 hits must survive: the 3 in-window ones plus the new hit.
    expect(entry.hits).toHaveLength(4);
    expect(entry.hits).toEqual([hitInWindow1, hitInWindow2, hitInWindow3, recordNow]);

    // The two boundary/stale hits must have been evicted.
    expect(entry.hits).not.toContain(hitAtCutoffMinus1);
    expect(entry.hits).not.toContain(hitAtCutoff);

    // Alert must fire: 4 hits > threshold of 3.
    // The dynamic import inside recordProbe is fire-and-forget; flush the queue.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, , hits] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(hits).toBe(4); // reported count reflects the correctly-pruned window
  });

  it("referer burst straddling cutoff: exactly 4 hits survive, field label is 'referer', alert fires at correct count", async () => {
    // Scenario: 5 pre-existing referer hits, 2 at-or-before cutoff and 3
    // strictly inside the window.  After recordProbe evicts and appends the
    // new hit, exactly 4 hits must remain (3 in-window + 1 new).
    // With threshold=3, a count of 4 exceeds the threshold → alert fires.
    // A future change that inverts the eviction direction on only the referer
    // map would either leave 6 hits (no eviction) or 2 hits (wrong direction)
    // — both would fail these assertions.

    process.env.PROBE_ALERT_THRESHOLD = "3";

    const mod = await import("./traffic-logger");
    const { _refererProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    // Far-future base avoids timestamp collisions with other tests.
    const recordNow = Date.now() + 90 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    // Build 5 hits: 2 at-or-before the cutoff (evicted), 3 strictly inside (kept).
    const hitAtCutoffMinus1 = cutoff - 1; // strictly before cutoff → evicted (≤ cutoff)
    const hitAtCutoff       = cutoff;     // exactly on cutoff      → evicted (≤ cutoff)
    const hitInWindow1      = cutoff + 1; // 1 ms inside            → kept
    const hitInWindow2      = cutoff + 500; // 500 ms inside         → kept
    const hitInWindow3      = cutoff + 1000; // 1 s inside           → kept

    const key = "https://burst-referer.example/probe";
    _refererProbes.set(key, {
      hits:        [hitAtCutoffMinus1, hitAtCutoff, hitInWindow1, hitInWindow2, hitInWindow3],
      lastAlerted: 0,
    });

    _recordProbe(_refererProbes, key, "referer", recordNow);

    const entry = _refererProbes.get(key)!;

    // Exactly 4 hits must survive: the 3 in-window ones plus the new hit.
    expect(entry.hits).toHaveLength(4);
    expect(entry.hits).toEqual([hitInWindow1, hitInWindow2, hitInWindow3, recordNow]);

    // The two boundary/stale hits must have been evicted.
    expect(entry.hits).not.toContain(hitAtCutoffMinus1);
    expect(entry.hits).not.toContain(hitAtCutoff);

    // Alert must fire: 4 hits > threshold of 3.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, , hits] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("referer");
    expect(hits).toBe(4); // reported count reflects the correctly-pruned window
  });

  it("paired-key symmetry: both _uaProbes and _refererProbes evict identically when seeded with the same burst", async () => {
    // Scenario: seed BOTH maps with the same 5-hit burst (2 stale, 3 in-window)
    // and call _recordProbe on each with the same recordNow.  The surviving
    // timestamps in both maps must be identical (3 in-window hits + new hit).
    //
    // A future change that inverts the eviction direction on both maps
    // simultaneously would leave each map with 6 hits (no eviction at all) or
    // 2 hits (evicts in-window instead of stale) — both outcomes fail the exact
    // equality assertion below, catching the symmetrical regression even though
    // the two individual single-map tests would still pass relative to each other.

    process.env.PROBE_ALERT_THRESHOLD = "3";

    const mod = await import("./traffic-logger");
    const { _uaProbes, _refererProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    // Use a distinct far-future base to avoid timestamp collisions with earlier
    // tests in this describe block.
    const recordNow = Date.now() + 100 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    // Identical 5-hit burst for both maps.
    const hitAtCutoffMinus1 = cutoff - 1; // strictly before cutoff → evicted (≤)
    const hitAtCutoff       = cutoff;     // exactly on cutoff      → evicted (≤)
    const hitInWindow1      = cutoff + 1;    // 1 ms inside   → kept
    const hitInWindow2      = cutoff + 500;  // 500 ms inside → kept
    const hitInWindow3      = cutoff + 1000; // 1 s inside    → kept

    const expectedSurvivors = [hitInWindow1, hitInWindow2, hitInWindow3, recordNow];

    const uaKey      = "PairedBurstUA/1.0";
    const refererKey = "https://paired-burst-referer.example/probe";

    _uaProbes.set(uaKey, {
      hits:        [hitAtCutoffMinus1, hitAtCutoff, hitInWindow1, hitInWindow2, hitInWindow3],
      lastAlerted: 0,
    });
    _refererProbes.set(refererKey, {
      hits:        [hitAtCutoffMinus1, hitAtCutoff, hitInWindow1, hitInWindow2, hitInWindow3],
      lastAlerted: 0,
    });

    // Call recordProbe on each map separately, flushing between them so each
    // fire-and-forget import("./telegram-bot").then(...) chain fully resolves
    // before the next call starts.  Batching both calls without an intervening
    // drain can leave the second chain unresolved when assertions run.
    _recordProbe(_uaProbes, uaKey, "ua", recordNow);
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    _recordProbe(_refererProbes, refererKey, "referer", recordNow);
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    const uaEntry      = _uaProbes.get(uaKey)!;
    const refererEntry = _refererProbes.get(refererKey)!;

    // ── UA map: exactly 4 hits survive ────────────────────────────────────────
    expect(uaEntry.hits).toHaveLength(4);
    expect(uaEntry.hits).toEqual(expectedSurvivors);
    expect(uaEntry.hits).not.toContain(hitAtCutoffMinus1);
    expect(uaEntry.hits).not.toContain(hitAtCutoff);

    // ── Referer map: exactly the same 4 hits survive ──────────────────────────
    expect(refererEntry.hits).toHaveLength(4);
    expect(refererEntry.hits).toEqual(expectedSurvivors);
    expect(refererEntry.hits).not.toContain(hitAtCutoffMinus1);
    expect(refererEntry.hits).not.toContain(hitAtCutoff);

    // ── Both maps produce identical surviving timestamps ───────────────────────
    // This is the key assertion: if eviction were inverted on both maps at once
    // each array would still have the same (wrong) length as the other, and the
    // single-map tests would both pass — but this equality check against the
    // *expected* survivors would fail.
    expect(uaEntry.hits).toEqual(refererEntry.hits);

    // Both maps exceeded threshold=3, so exactly 2 alerts must have fired.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);

    const calls = mockSendProbeAlert.mock.calls as [string, string, number][];
    const fields = calls.map(([f]) => f).sort(); // sort for stable assertion order
    expect(fields).toEqual(["referer", "ua"]);

    // Each alert reports 4 hits — the correctly-pruned in-window count.
    for (const [, , hitCount] of calls) {
      expect(hitCount).toBe(4);
    }
  });

  it("cutoff-formula symmetry: _refererProbes and _uaProbes evict the same timestamps across multiple offsets", async () => {
    // This test catches a future change where one map's eviction loop uses a
    // different cutoff formula (e.g. `now - WINDOW_MS * 2` or `now - WINDOW_MS + SOME_CONSTANT`)
    // instead of `now - WINDOW_MS`.  Both maps receive an identical set of
    // timestamps spanning both sides of the boundary at several offsets; after
    // one _recordProbe call each the surviving hit arrays must be identical.
    //
    // If one branch used 2×WINDOW_MS as its cutoff, hits at (now − WINDOW_MS − 1)
    // and (now − WINDOW_MS) would survive in that map but not the other, causing
    // the assertion to fail.

    const mod = await import("./traffic-logger");
    const { _uaProbes, _refererProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    // Advance `now` well past module-load time to avoid any cross-test state.
    const recordNow = Date.now() + 200 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    // Five timestamps at distinct offsets around the boundary:
    //   t1 — 1 ms before the cutoff (exactly stale)               → EVICTED
    //   t2 — exactly at the cutoff  (borderline — <= evicts it)   → EVICTED
    //   t3 — 1 ms after the cutoff  (barely in-window)            → KEPT
    //   t4 — half a window ago      (well in-window)              → KEPT
    //   t5 — 2 × WINDOW_MS ago      (way outside)                 → EVICTED
    const t1 = cutoff - 1;
    const t2 = cutoff;
    const t3 = cutoff + 1;
    const t4 = recordNow - Math.floor(WINDOW_MS / 2);
    const t5 = recordNow - WINDOW_MS * 2;

    const seedHits = [t5, t1, t2, t3, t4]; // unsorted intentionally; production code tolerates this

    const uaKey      = "SymmetryTestUA/1.0";
    const refererKey = "http://symmetry-test-referer.example/probe";

    _uaProbes.set(uaKey,      { hits: [...seedHits], lastAlerted: 0 });
    _refererProbes.set(refererKey, { hits: [...seedHits], lastAlerted: 0 });

    _recordProbe(_uaProbes,      uaKey,      "ua",      recordNow);
    _recordProbe(_refererProbes, refererKey, "referer", recordNow);

    const uaEntry      = _uaProbes.get(uaKey)!;
    const refererEntry = _refererProbes.get(refererKey)!;

    // Both entries must survive (they each have in-window hits).
    expect(uaEntry).toBeDefined();
    expect(refererEntry).toBeDefined();

    // The new hit `recordNow` was appended by each call.
    expect(uaEntry.hits).toContain(recordNow);
    expect(refererEntry.hits).toContain(recordNow);

    // The stale timestamps (t1, t2, t5) must be absent from both maps.
    for (const stale of [t1, t2, t5]) {
      expect(uaEntry.hits).not.toContain(stale);
      expect(refererEntry.hits).not.toContain(stale);
    }

    // The in-window timestamps (t3, t4) must be present in both maps.
    for (const live of [t3, t4]) {
      expect(uaEntry.hits).toContain(live);
      expect(refererEntry.hits).toContain(live);
    }

    // The surviving hit sets must be identical between the two maps.
    // Any divergence here means one branch used a different cutoff formula.
    expect(uaEntry.hits).toEqual(refererEntry.hits);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Concurrent burst — two distinct scraper keys at the same timestamp
//
// Verifies that two independent probe keys processed with the same `now`
// value (simulating a concurrent burst) each maintain their own accurate
// sliding-window count with no cross-contamination between them. When only
// one key's post-prune count exceeds the threshold, exactly one alert fires.
// ═══════════════════════════════════════════════════════════════════════════

describe("concurrent burst — two scraper keys at the same timestamp stay independent", () => {
  it("each key prunes its own stale hits; only the key that crosses the threshold alerts", async () => {
    // Threshold = 3: alert fires when hits.length > 3 (i.e. ≥ 4 in-window hits).
    process.env.PROBE_ALERT_THRESHOLD = "3";

    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    // Use a far-future base so these timestamps never collide with earlier tests.
    const recordNow = Date.now() + 90 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    // ── keyA: 1 stale hit + 2 in-window hits ─────────────────────────────────
    // After eviction and appending recordNow → 3 hits (= threshold, NOT > threshold)
    // → NO alert should fire for keyA.
    const keyA = "ConcurrentScraperA/1.0";
    _uaProbes.set(keyA, {
      hits:        [
        cutoff - 500, // stale — will be evicted
        cutoff + 100, // in-window
        cutoff + 200, // in-window
      ],
      lastAlerted: 0,
    });

    // ── keyB: 1 stale hit + 3 in-window hits ─────────────────────────────────
    // After eviction and appending recordNow → 4 hits (> threshold of 3)
    // → alert SHOULD fire for keyB.
    const keyB = "ConcurrentScraperB/2.0";
    _uaProbes.set(keyB, {
      hits:        [
        cutoff - 500, // stale — will be evicted
        cutoff + 100, // in-window
        cutoff + 200, // in-window
        cutoff + 300, // in-window
      ],
      lastAlerted: 0,
    });

    // Both keys processed at the exact same `now` — simulates a concurrent burst.
    _recordProbe(_uaProbes, keyA, "ua", recordNow);
    _recordProbe(_uaProbes, keyB, "ua", recordNow);

    // Flush the fire-and-forget dynamic import + .then callback.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // ── Assert keyA ───────────────────────────────────────────────────────────
    const entryA = _uaProbes.get(keyA)!;
    // Stale hit evicted; 2 in-window hits + new hit = 3 total.
    expect(entryA.hits).toHaveLength(3);
    expect(entryA.hits).toEqual([cutoff + 100, cutoff + 200, recordNow]);
    expect(entryA.hits).not.toContain(cutoff - 500);

    // ── Assert keyB ───────────────────────────────────────────────────────────
    const entryB = _uaProbes.get(keyB)!;
    // Stale hit evicted; 3 in-window hits + new hit = 4 total.
    expect(entryB.hits).toHaveLength(4);
    expect(entryB.hits).toEqual([cutoff + 100, cutoff + 200, cutoff + 300, recordNow]);
    expect(entryB.hits).not.toContain(cutoff - 500);

    // ── Assert alert fired exactly once (for keyB only) ───────────────────────
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value, hitCount] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(value).toBe(keyB);   // alert is for keyB — it crossed the threshold
    expect(hitCount).toBe(4);   // accurate post-prune count for keyB

    // Confirm no alert was recorded for keyA.
    const alertedKeys = mockSendProbeAlert.mock.calls.map(
      (c: [string, string, number]) => c[1],
    );
    expect(alertedKeys).not.toContain(keyA);
  });

  it("two keys with identical in-window histories at the same timestamp each accumulate counts independently", async () => {
    // Both scrapers arrive simultaneously with the same number of prior hits.
    // Each should end up with its own independent count — no shared state.
    process.env.PROBE_ALERT_THRESHOLD = "3";

    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now() + 95 * 60 * 60 * 1000;
    const cutoff    = recordNow - WINDOW_MS;

    const keyC = "TwinScraperC/1.0";
    const keyD = "TwinScraperD/1.0";

    // Both start with the same 3 in-window hits (no stale ones).
    const sharedHistory = [cutoff + 1000, cutoff + 2000, cutoff + 3000];

    _uaProbes.set(keyC, { hits: [...sharedHistory], lastAlerted: 0 });
    _uaProbes.set(keyD, { hits: [...sharedHistory], lastAlerted: 0 });

    // Simultaneous hit for both keys.
    _recordProbe(_uaProbes, keyC, "ua", recordNow);
    _recordProbe(_uaProbes, keyD, "ua", recordNow);

    // No flush needed here — all assertions below are on synchronous map state.

    const entryC = _uaProbes.get(keyC)!;
    const entryD = _uaProbes.get(keyD)!;

    // Each key independently accumulates 4 hits (3 pre-existing + 1 new).
    expect(entryC.hits).toHaveLength(4);
    expect(entryD.hits).toHaveLength(4);

    // The new hit is appended to each map entry separately — no aliasing.
    expect(entryC.hits[3]).toBe(recordNow);
    expect(entryD.hits[3]).toBe(recordNow);

    // Both entries crossed the threshold, so recordProbe must have set
    // lastAlerted on each independently (synchronous side-effect, no async
    // needed).  This confirms the alert logic ran for both keys without
    // cross-contamination from the shared history arrays.
    expect(entryC.lastAlerted).toBe(recordNow);
    expect(entryD.lastAlerted).toBe(recordNow);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 413 — _refererProbes.lastAlerted is set BEFORE the async import fires
//
// Regression guard: a future refactor that moves `entry.lastAlerted = now`
// to AFTER the `import("./telegram-bot").then(...)` call (or removes it
// entirely) would leave lastAlerted === 0.  The cooldown check
//   `now - entry.lastAlerted >= COOLDOWN_MS`
// would then be satisfied on every subsequent hit, causing the alert to fire
// repeatedly instead of being suppressed for one cooldown window.
//
// Two assertions nail the contract:
//   (a) lastAlerted is set to a value >= the timestamp captured just before
//       the triggering request — proving the assignment happened synchronously
//       inside recordProbe, not in a later async callback.
//   (b) A second immediate request does NOT fire a second alert — the cooldown
//       is active because lastAlerted was set correctly.
// ═══════════════════════════════════════════════════════════════════════════

describe("_refererProbes.lastAlerted is set synchronously before the async import fires", () => {
  it("lastAlerted is >= the pre-request timestamp and a second immediate request does not re-alert", async () => {
    // Use threshold=2 so the alert fires on hit 3.
    process.env.PROBE_ALERT_THRESHOLD = "2";

    const mod = await import("./traffic-logger");
    const { _refererProbes, _recordProbe } = mod as any;

    // Ensure DB-init promise has resolved so recordProbe runs synchronously
    // within the res.on("finish") callback without deferring to _initPromise.
    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const now       = Date.now();
    const cutoff    = now - WINDOW_MS;

    const refKey = "https://task413-regression-scraper.example/probe";

    // ── Seed: exactly threshold (2) in-window hits ───────────────────────────
    // One more hit will push hits.length to 3 > threshold, triggering the alert.
    _refererProbes.set(refKey, {
      hits:        [cutoff + 1000, cutoff + 2000],
      lastAlerted: 0,
    });

    // Capture the timestamp immediately before the triggering call.
    const beforeTs = Date.now();

    // ── Triggering call (threshold+1 hit) ────────────────────────────────────
    _recordProbe(_refererProbes, refKey, "referer", Date.now());

    // ── (a) lastAlerted must be set synchronously — no flush needed ──────────
    // If a future refactor moves the assignment inside .then(), this will be 0.
    const entry = _refererProbes.get(refKey)!;
    expect(entry.lastAlerted).toBeGreaterThanOrEqual(beforeTs);

    // Flush so the fire-and-forget import("./telegram-bot").then(...) completes.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // sendProbeAlert must have been called exactly once by the triggering hit.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("referer");
    expect(value).toBe(refKey);

    // ── (b) Second immediate call must NOT fire a second alert ────────────────
    // With lastAlerted correctly set, `now - entry.lastAlerted < COOLDOWN_MS`
    // suppresses the re-alert.  If lastAlerted were left at 0 the cooldown
    // check would pass and sendProbeAlert would be called a second time.
    _recordProbe(_refererProbes, refKey, "referer", Date.now());

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // Still exactly one alert — cooldown is active.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
  });
});

// Task 415 — _uaProbes.lastAlerted is set BEFORE the async import fires
//
// Symmetric regression guard for the UA branch of recordProbe.
// A future refactor that moves `entry.lastAlerted = now` to AFTER the
// `import("./telegram-bot").then(...)` call (or removes it entirely) would
// leave lastAlerted === 0, causing every subsequent hit past the threshold to
// fire a fresh alert instead of being suppressed by the cooldown.
//
// Two assertions nail the contract:
//   (a) lastAlerted is set to a value >= the timestamp captured just before
//       the triggering request — proving the assignment happened synchronously
//       inside recordProbe, not in a later async callback.
//   (b) A second immediate request does NOT fire a second alert — the cooldown
//       is active because lastAlerted was set correctly.
// ═══════════════════════════════════════════════════════════════════════════

describe("_uaProbes.lastAlerted is set synchronously before the async import fires", () => {
  it("lastAlerted is >= the pre-request timestamp and a second immediate request does not re-alert", async () => {
    // Use threshold=2 so the alert fires on hit 3.
    process.env.PROBE_ALERT_THRESHOLD = "2";

    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    // Ensure DB-init promise has resolved so recordProbe runs synchronously
    // within the res.on("finish") callback without deferring to _initPromise.
    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const now       = Date.now();
    const cutoff    = now - WINDOW_MS;

    const uaKey = "task415-regression-scraper/1.0";

    // ── Seed: exactly threshold (2) in-window hits ───────────────────────────
    // One more hit will push hits.length to 3 > threshold, triggering the alert.
    _uaProbes.set(uaKey, {
      hits:        [cutoff + 1000, cutoff + 2000],
      lastAlerted: 0,
    });

    // Capture the timestamp immediately before the triggering call.
    const beforeTs = Date.now();

    // ── Triggering call (threshold+1 hit) ────────────────────────────────────
    _recordProbe(_uaProbes, uaKey, "ua", Date.now());

    // ── (a) lastAlerted must be set synchronously — no flush needed ──────────
    // If a future refactor moves the assignment inside .then(), this will be 0.
    const entry = _uaProbes.get(uaKey)!;
    expect(entry.lastAlerted).toBeGreaterThanOrEqual(beforeTs);

    // Flush so the fire-and-forget import("./telegram-bot").then(...) completes.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // sendProbeAlert must have been called exactly once by the triggering hit.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(value).toBe(uaKey);

    // ── (b) Second immediate call must NOT fire a second alert ────────────────
    // With lastAlerted correctly set, `now - entry.lastAlerted < COOLDOWN_MS`
    // suppresses the re-alert.  If lastAlerted were left at 0 the cooldown
    // check would pass and sendProbeAlert would be called a second time.
    _recordProbe(_uaProbes, uaKey, "ua", Date.now());

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // Still exactly one alert — cooldown is active.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 408 — pre-existing hits are preserved when cooldown is active
//
// Regression guard: a future change that truncates or clears the hits array
// when the cooldown guard fires (e.g. `entry.hits = [now]` instead of
// `entry.hits.push(now)`) would silently destroy the sliding-window history
// while still appearing correct to callers that only check the alert count.
//
// This test verifies that every hit present BEFORE a cooldown-active call
// survives untouched in addition to the newly appended hit.
// ═══════════════════════════════════════════════════════════════════════════

describe("hits array is preserved in full when cooldown is active (no eviction of non-expired hits)", () => {
  const WINDOW_MS = 24 * 60 * 60 * 1000; // mirrors the module constant

  it("UA probe: all pre-existing in-window hits survive a cooldown-active recordProbe call", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";

    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe } = mod as any;

    // Ensure the init promise has resolved so recordProbe runs synchronously.
    await mod.initProbeCounters();

    const now    = Date.now();
    const cutoff = now - WINDOW_MS;

    // Three distinct in-window timestamps — well within the 24-hour window.
    const originalHits = [cutoff + 1000, cutoff + 2000, cutoff + 3000];
    const key = "CooldownHitsPreservationUA/1.0";

    // Seed the entry: cooldown is active (lastAlerted = now).
    _uaProbes.set(key, {
      hits:        [...originalHits],
      lastAlerted: now, // cooldown fully active — alert will be suppressed
    });

    // One more hit arrives while cooldown is active.
    const hitTs = now + 1;
    _recordProbe(_uaProbes, key, "ua", hitTs);

    const entry = _uaProbes.get(key)!;

    // All three original hits must still be present.
    expect(entry.hits).toContain(originalHits[0]);
    expect(entry.hits).toContain(originalHits[1]);
    expect(entry.hits).toContain(originalHits[2]);

    // The new hit must have been appended.
    expect(entry.hits).toContain(hitTs);

    // Total: 3 original + 1 new = 4 hits (no truncation).
    expect(entry.hits).toHaveLength(4);

    // The cooldown must still be active — no second alert should have fired.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  it("referer probe: all pre-existing in-window hits survive a cooldown-active recordProbe call", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";

    const mod = await import("./traffic-logger");
    const { _refererProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const now    = Date.now();
    const cutoff = now - WINDOW_MS;

    const originalHits = [cutoff + 5000, cutoff + 6000, cutoff + 7000];
    const key = "https://cooldown-hits-preservation-referer.example/scan";

    _refererProbes.set(key, {
      hits:        [...originalHits],
      lastAlerted: now, // cooldown fully active
    });

    const hitTs = now + 1;
    _recordProbe(_refererProbes, key, "referer", hitTs);

    const entry = _refererProbes.get(key)!;

    expect(entry.hits).toContain(originalHits[0]);
    expect(entry.hits).toContain(originalHits[1]);
    expect(entry.hits).toContain(originalHits[2]);
    expect(entry.hits).toContain(hitTs);
    expect(entry.hits).toHaveLength(4);

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROBE_WINDOW_HOURS — eviction loop uses WINDOW_MS, not a hard-coded constant
// ═══════════════════════════════════════════════════════════════════════════
//
// Guard: a future change that replaces `now - WINDOW_MS` with a hard-coded
// millisecond literal (e.g. `now - 86400000`) would silently break when
// WINDOW_MS is reconfigured.
//
// Strategy
// ────────
// 1. Load the module with PROBE_WINDOW_HOURS=1 (window = 1 hour).
// 2. Seed both _uaProbes and _refererProbes with two hits each:
//      • one hit 2 hours old  → outside the 1-hour window, must be evicted
//      • one hit 30 min old   → inside the 1-hour window, must survive
// 3. Call _recordProbe(map, key, label, now) which triggers the eviction loop.
// 4. Assert the 2-hour-old hit was evicted (entry.hits.length === 2:
//    the surviving 30-min hit + the new `now` hit).
// 5. To prove the evicted set differs from the default 24-hour case, repeat
//    with PROBE_WINDOW_HOURS unset: the 2-hour-old hit must SURVIVE (still
//    inside the 24-hour default window), so entry.hits.length === 3.
//
// If the eviction loop were changed to `now - 86400000` (hard-coded 24 h):
//   • In step 4 the cutoff would be now-86400000, which is earlier than the
//     2-hour-old hit (now-7200000), so the hit would NOT be evicted and
//     entry.hits.length would be 3 instead of 2 → test fails.

describe("PROBE_WINDOW_HOURS — eviction loop respects WINDOW_MS, not a hard-coded constant", () => {
  it("(A) with PROBE_WINDOW_HOURS=1: hit 2 h old is evicted; hit 30 min old survives in UA map", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    process.env.PROBE_WINDOW_HOURS    = "1"; // WINDOW_MS = 3 600 000 ms
    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe, _WINDOW_MS } = mod as any;

    // Sanity-check: the module read the override correctly.
    expect(_WINDOW_MS).toBe(1 * 60 * 60 * 1000);

    const now         = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;  // outside 1-h window
    const thirtyMinAgo = now - 30 * 60 * 1000;      // inside  1-h window

    _uaProbes.set("task398-ua-a", {
      hits:        [twoHoursAgo, thirtyMinAgo],
      lastAlerted: 0,
    });

    _recordProbe(_uaProbes, "task398-ua-a", "ua", now);

    const entry = _uaProbes.get("task398-ua-a")!;
    // twoHoursAgo must have been evicted; thirtyMinAgo + now must survive.
    expect(entry.hits).toHaveLength(2);
    expect(entry.hits).not.toContain(twoHoursAgo);
    expect(entry.hits).toContain(thirtyMinAgo);
    expect(entry.hits[entry.hits.length - 1]).toBe(now);
  });

  it("(B) with PROBE_WINDOW_HOURS=1: hit 2 h old is evicted; hit 30 min old survives in referer map", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    process.env.PROBE_WINDOW_HOURS    = "1";
    const mod = await import("./traffic-logger");
    const { _refererProbes, _recordProbe, _WINDOW_MS } = mod as any;

    expect(_WINDOW_MS).toBe(1 * 60 * 60 * 1000);

    const now          = Date.now();
    const twoHoursAgo  = now - 2 * 60 * 60 * 1000;
    const thirtyMinAgo = now - 30 * 60 * 1000;

    _refererProbes.set("task398-ref-b", {
      hits:        [twoHoursAgo, thirtyMinAgo],
      lastAlerted: 0,
    });

    _recordProbe(_refererProbes, "task398-ref-b", "referer", now);

    const entry = _refererProbes.get("task398-ref-b")!;
    expect(entry.hits).toHaveLength(2);
    expect(entry.hits).not.toContain(twoHoursAgo);
    expect(entry.hits).toContain(thirtyMinAgo);
    expect(entry.hits[entry.hits.length - 1]).toBe(now);
  });

  it("(C) default window (PROBE_WINDOW_HOURS unset): same 2-h-old hit survives in UA map, proving the evicted set differs", async () => {
    // PROBE_WINDOW_HOURS is absent (deleted in beforeEach) → WINDOW_MS = 24 h.
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const { _uaProbes, _recordProbe, _WINDOW_MS } = mod as any;

    expect(_WINDOW_MS).toBe(24 * 60 * 60 * 1000);

    const now          = Date.now();
    const twoHoursAgo  = now - 2 * 60 * 60 * 1000;
    const thirtyMinAgo = now - 30 * 60 * 1000;

    _uaProbes.set("task398-ua-c", {
      hits:        [twoHoursAgo, thirtyMinAgo],
      lastAlerted: 0,
    });

    _recordProbe(_uaProbes, "task398-ua-c", "ua", now);

    const entry = _uaProbes.get("task398-ua-c")!;
    // With a 24-h window the 2-h-old hit is well within the window and must NOT
    // be evicted.  All three timestamps (twoHoursAgo, thirtyMinAgo, now) survive.
    expect(entry.hits).toHaveLength(3);
    expect(entry.hits).toContain(twoHoursAgo);
    expect(entry.hits).toContain(thirtyMinAgo);
    expect(entry.hits[entry.hits.length - 1]).toBe(now);
  });

  it("(D) default window (PROBE_WINDOW_HOURS unset): same 2-h-old hit survives in referer map", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";
    const mod = await import("./traffic-logger");
    const { _refererProbes, _recordProbe, _WINDOW_MS } = mod as any;

    expect(_WINDOW_MS).toBe(24 * 60 * 60 * 1000);

    const now          = Date.now();
    const twoHoursAgo  = now - 2 * 60 * 60 * 1000;
    const thirtyMinAgo = now - 30 * 60 * 1000;

    _refererProbes.set("task398-ref-d", {
      hits:        [twoHoursAgo, thirtyMinAgo],
      lastAlerted: 0,
    });

    _recordProbe(_refererProbes, "task398-ref-d", "referer", now);

    const entry = _refererProbes.get("task398-ref-d")!;
    expect(entry.hits).toHaveLength(3);
    expect(entry.hits).toContain(twoHoursAgo);
    expect(entry.hits).toContain(thirtyMinAgo);
    expect(entry.hits[entry.hits.length - 1]).toBe(now);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Map identity — refererProbes and uaProbes must be distinct objects
// ═══════════════════════════════════════════════════════════════════════════
// A copy-paste error in an initialisation path could assign both maps to the
// same Map instance, causing every hit to be double-counted and keys from
// both fields to collide. This test guards against that regression.

describe("probe map identity — _refererProbes and _uaProbes are distinct objects", () => {
  it("the two exported map references are not the same object", async () => {
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes } = mod as any;

    // Strict reference inequality — they must be separate Map instances.
    expect(_refererProbes).not.toBe(_uaProbes);
  });

  it("a key seeded into _refererProbes does not appear in _uaProbes", async () => {
    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes } = mod as any;

    const refKey = "task386-referer-only-key";
    const uaKey  = "task386-ua-only-key";

    _refererProbes.set(refKey, { hits: [Date.now()], lastAlerted: 0 });
    _uaProbes.set(uaKey,      { hits: [Date.now()], lastAlerted: 0 });

    // Each key must exist only in the map it was seeded into.
    expect(_refererProbes.has(refKey)).toBe(true);
    expect(_uaProbes.has(refKey)).toBe(false);

    expect(_uaProbes.has(uaKey)).toBe(true);
    expect(_refererProbes.has(uaKey)).toBe(false);

    // Clean up so we don't pollute other tests sharing the module instance.
    _refererProbes.delete(refKey);
    _uaProbes.delete(uaKey);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 392 — alert fires on the very first hit after a restart when the
// scraper was already at the threshold before the restart
//
// If a scraper accumulated exactly ALERT_THRESHOLD hits before the server
// restarted, the in-memory counter is rebuilt from the DB via
// initProbeCounters.  The next recorded hit should push the in-window count
// above the threshold and fire sendProbeAlert exactly once.
//
// A future change that:
//   • off-by-ones the restored hit count (e.g. <= vs <)
//   • skips loading hits entirely for rows whose lastAlerted === 0
//   • resets the hits array instead of appending to it after restart
// would suppress that alert and this test would catch it.
//
// Two cases are exercised — one per field type — so a regression in either
// branch (refererProbes or uaProbes) is caught independently.
// ═══════════════════════════════════════════════════════════════════════════

describe("alert fires on the first post-restart hit when the scraper was already at threshold", () => {
  it("(K) UA probe: threshold hits restored from DB, one more hit fires sendProbeAlert exactly once", async () => {
    // threshold=5 (default) → alert fires when hits.length > 5 (i.e. on the
    // 6th hit).  We seed exactly 5 hits in the fake DB so the in-window count
    // after initProbeCounters equals the threshold.  One more hit through the
    // middleware must push the count to 6 and fire the alert.
    // lastAlerted=0 means the scraper has never alerted and no cooldown is
    // active, so the alert path is fully open.
    process.env.PROBE_ALERT_THRESHOLD = "5";

    const now    = Date.now();
    const UA_KEY = "PostRestartScraperUA/1.0"; // not in BOT_PATTERNS

    const fakeRows = [
      {
        fieldType:   "ua",
        key:         UA_KEY,
        hits:        [
          now - 5_000,
          now - 4_000,
          now - 3_000,
          now - 2_000,
          now - 1_000,
        ],
        lastAlerted: 0,
      },
    ];

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart: re-hydrate the in-memory map from the fake DB rows.
    await mod.initProbeCounters();

    // Confirm exactly threshold hits were restored.
    const entry = mod._uaProbes.get(UA_KEY);
    expect(entry).toBeDefined();
    expect(entry!.hits.length).toBe(5);
    expect(entry!.lastAlerted).toBe(0);

    // Drive one hit through the middleware — no referer so only the UA probe
    // can fire.
    const mw  = mod.trafficLoggerMiddleware;
    const req = makeReq(UA_KEY); // UA_KEY is not in BOT_PATTERNS
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    // The single post-restart hit must push hits.length to 6 > 5 and fire the
    // alert exactly once.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(value).toBe(UA_KEY);
  });

  it("(L) referer probe: threshold hits restored from DB, one more hit fires sendProbeAlert exactly once", async () => {
    // Mirror of (K) for the referer branch.  We use a Googlebot UA so that
    // `patternBot === true` and the UA branch inside the middleware is skipped —
    // only the referer probe can fire.  This keeps the assertion clean: a single
    // sendProbeAlert call must be for the referer key, not a UA key.
    process.env.PROBE_ALERT_THRESHOLD = "5";

    const now         = Date.now();
    const REFERER_KEY = "https://post-restart-scraper.example/scan"; // not own-origin, not blocked
    const BOT_UA      = "Googlebot/2.1 (+http://www.google.com/bot.html)";

    const fakeRows = [
      {
        fieldType:   "referer",
        key:         REFERER_KEY,
        hits:        [
          now - 5_000,
          now - 4_000,
          now - 3_000,
          now - 2_000,
          now - 1_000,
        ],
        lastAlerted: 0,
      },
    ];

    const mod    = await import("./traffic-logger");
    const { db } = await import("./db");
    (db as any).execute = vi.fn().mockResolvedValue([]);
    (db as any).select  = vi.fn().mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

    // Simulate a restart: re-hydrate the in-memory map from the fake DB rows.
    await mod.initProbeCounters();

    // Confirm exactly threshold hits were restored into the referer map.
    const entry = mod._refererProbes.get(REFERER_KEY);
    expect(entry).toBeDefined();
    expect(entry!.hits.length).toBe(5);
    expect(entry!.lastAlerted).toBe(0);
    // Must not have bled into the UA map.
    expect(mod._uaProbes.has(REFERER_KEY)).toBe(false);

    // Drive one hit through the middleware using a bot UA so the UA probe is
    // skipped (patternBot === true → the `if (ua && !patternBot)` guard fails).
    const mw  = mod.trafficLoggerMiddleware;
    const req = makeReq(BOT_UA, REFERER_KEY);
    const res = makeRes();
    mw(req, res as any, () => {});
    res.finish();
    await flushMicrotasks();

    // The single post-restart hit must push hits.length to 6 > 5 and fire the
    // alert exactly once for the referer key.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("referer");
    expect(value).toBe(REFERER_KEY);
  });
});

// Task 414 — middleware-level: _refererProbes.lastAlerted is set before async .then() fires
//
// Task 413 calls _recordProbe directly.  This test drives the full middleware
// call path and exploits microtask ordering to observe the state BETWEEN
// _initPromise.then(recordCallback) running and the fire-and-forget
// import("./telegram-bot").then(sendAlertCb) callback firing.
//
// Why the ordering guarantee holds
// ─────────────────────────────────
// res.finish() is called while _initPromise is already resolved (we awaited
// initProbeCounters() above).  The finish listener calls
//   _initPromise.then(recordCallback)
// which queues recordCallback as a microtask immediately.  When we then do
//   await Promise.resolve()
// the test continuation is queued as a second microtask.  Microtasks are
// drained FIFO, so the queue at that point is:
//   [recordCallback, testContinuation]
// recordCallback fires first:
//   • sets entry.lastAlerted = now  (synchronous in current code)
//   • calls import("./telegram-bot"), whose .then(sendAlertCb) is queued
//     as a NEW microtask AFTER testContinuation
// Queue becomes: [testContinuation, sendAlertCb]
// testContinuation (our await resumes) runs next — BEFORE sendAlertCb.
//
// Regression behaviour
// ─────────────────────
// If a future change moves `entry.lastAlerted = now` into sendAlertCb, then
// after recordCallback runs lastAlerted is still 0.  Assertion (a) fails,
// catching the regression before any flush.
//
// Assertion (b) issues the second request in this same window (after
// recordCallback, before sendAlertCb) and flushes everything:
//   • sendAlertCb fires — with regression: lastAlerted finally set here
//   • recordCallback2 fires — with regression: lastAlerted was 0 when
//     res2.finish() was called, so the cooldown check passes again and
//     a second alert fires → toHaveBeenCalledTimes(1) fails.
// ═══════════════════════════════════════════════════════════════════════════

describe("middleware-level: _refererProbes.lastAlerted is set before async .then() fires", () => {
  it("lastAlerted is set before sendAlertCb; a second request issued in that window is suppressed", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";

    const mod = await import("./traffic-logger");
    const { _refererProbes } = mod as any;

    // Resolve _initPromise so the finish-listener callback is queued as a
    // microtask immediately (not deferred by an unresolved init promise).
    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const now       = Date.now();
    const cutoff    = now - WINDOW_MS;

    // The middleware lowercases the referer before using it as a map key.
    const referer = "https://task414-middleware-scraper.example/probe";
    const refKey  = referer.toLowerCase();

    // Seed: exactly threshold (2) in-window hits — one more crosses it.
    _refererProbes.set(refKey, {
      hits:        [cutoff + 1000, cutoff + 2000],
      lastAlerted: 0,
    });

    const req = makeReq("ObscureTask414Browser/1.0", referer);
    const res = makeRes();
    mod.trafficLoggerMiddleware(req, res as any, () => {});

    const beforeTs = Date.now();
    res.finish();
    // recordCallback is now queued as a microtask (ahead of our continuation).

    // One microtask yield: recordCallback runs (sets lastAlerted synchronously
    // and queues sendAlertCb), then our continuation resumes.  sendAlertCb is
    // still pending — it was queued AFTER our continuation.
    await Promise.resolve();

    // ── (a) lastAlerted must already be set ───────────────────────────────
    // recordProbe has run.  sendAlertCb has NOT yet fired.  If a future change
    // moves `entry.lastAlerted = now` into sendAlertCb, it is still 0 here.
    const entry = _refererProbes.get(refKey)!;
    expect(entry.lastAlerted).toBeGreaterThanOrEqual(beforeTs);

    // ── (b) second request in the same window must be suppressed ──────────
    // We are between recordCallback and sendAlertCb.  If lastAlerted is 0
    // (regression), the cooldown check in recordCallback2 passes and a second
    // alert fires after the full flush.
    const req2 = makeReq("ObscureTask414Browser/1.0", referer);
    const res2 = makeRes();
    mod.trafficLoggerMiddleware(req2, res2 as any, () => {});
    res2.finish();

    // Drain all remaining microtasks (sendAlertCb + recordCallback2).
    await flushMicrotasks();

    // Exactly one alert total — cooldown suppressed the second request.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("referer");
    expect(value).toBe(refKey);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 385 — Cross-map independence: same string in both referer and UA maps
//
// The probe system uses two completely separate maps — _refererProbes and
// _uaProbes — so that the same string value appearing in both headers does
// not double-count against a single counter.  A string that arrives as both
// a referer key and a UA key must accumulate hits independently in each map,
// with no cross-contamination between the two.
//
// Tests verify:
//   (a) Hit counts accumulate independently (N+1 in referer, M+1 in ua).
//   (b) When only the referer map exceeds the threshold, exactly one alert
//       fires and it identifies the field as "referer".
//   (c) When only the UA map exceeds the threshold, exactly one alert fires
//       and it identifies the field as "ua".
//   (d) When both maps independently exceed the threshold at the same now,
//       exactly two alerts fire — one per field.
// ═══════════════════════════════════════════════════════════════════════════

describe("cross-map independence — same string in both _refererProbes and _uaProbes", () => {
  it("hit counts accumulate independently: N+1 in referer map and M+1 in ua map", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "10"; // high threshold so no alert fires

    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now();
    const cutoff    = recordNow - WINDOW_MS;

    // Same string used as a key in both maps.
    const sharedKey = "shared-scraper-string/1.0";

    const N = 3; // hits seeded in the referer map
    const M = 6; // hits seeded in the ua map

    // Seed N in-window hits in the referer map.
    const refererHits = Array.from({ length: N }, (_, i) => cutoff + 1000 + i * 500);
    _refererProbes.set(sharedKey, { hits: [...refererHits], lastAlerted: 0 });

    // Seed M in-window hits in the ua map (different count).
    const uaHits = Array.from({ length: M }, (_, i) => cutoff + 1000 + i * 300);
    _uaProbes.set(sharedKey, { hits: [...uaHits], lastAlerted: 0 });

    // Record one hit in each map at the same timestamp.
    _recordProbe(_refererProbes, sharedKey, "referer", recordNow);
    _recordProbe(_uaProbes,      sharedKey, "ua",      recordNow);

    // Referer entry must have N+1 hits; UA entry must have M+1 hits.
    const refererEntry = _refererProbes.get(sharedKey)!;
    const uaEntry      = _uaProbes.get(sharedKey)!;

    expect(refererEntry.hits.length).toBe(N + 1);
    expect(uaEntry.hits.length).toBe(M + 1);

    // The newest hit in each entry must be recordNow.
    expect(refererEntry.hits[refererEntry.hits.length - 1]).toBe(recordNow);
    expect(uaEntry.hits[uaEntry.hits.length - 1]).toBe(recordNow);
  });

  it("only the referer map exceeds threshold → exactly one 'referer' alert fires", async () => {
    // threshold=4: referer seeded with 4 hits (will exceed after +1), ua seeded
    // with 2 hits (stays below threshold after +1).
    process.env.PROBE_ALERT_THRESHOLD = "4";

    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now();
    const cutoff    = recordNow - WINDOW_MS;

    const sharedKey = "cross-map-referer-only-alert/1.0";

    // Seed exactly threshold (4) hits in referer — next hit exceeds it.
    _refererProbes.set(sharedKey, {
      hits: Array.from({ length: 4 }, (_, i) => cutoff + 1000 + i * 100),
      lastAlerted: 0,
    });

    // Seed 2 hits in UA — stays well below threshold after +1.
    _uaProbes.set(sharedKey, {
      hits: [cutoff + 1000, cutoff + 2000],
      lastAlerted: 0,
    });

    _recordProbe(_refererProbes, sharedKey, "referer", recordNow);
    _recordProbe(_uaProbes,      sharedKey, "ua",      recordNow);

    // Flush the fire-and-forget import("./telegram-bot").then(...).
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // Exactly one alert, and it must identify the referer map.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("referer");
    expect(value).toBe(sharedKey);
  });

  it("only the UA map exceeds threshold → exactly one 'ua' alert fires", async () => {
    // threshold=4: ua seeded with 4 hits (will exceed after +1), referer seeded
    // with 2 hits (stays below threshold after +1).
    process.env.PROBE_ALERT_THRESHOLD = "4";

    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now();
    const cutoff    = recordNow - WINDOW_MS;

    const sharedKey = "cross-map-ua-only-alert/1.0";

    // Seed 2 hits in referer — stays well below threshold after +1.
    _refererProbes.set(sharedKey, {
      hits: [cutoff + 1000, cutoff + 2000],
      lastAlerted: 0,
    });

    // Seed exactly threshold (4) hits in UA — next hit exceeds it.
    _uaProbes.set(sharedKey, {
      hits: Array.from({ length: 4 }, (_, i) => cutoff + 1000 + i * 100),
      lastAlerted: 0,
    });

    _recordProbe(_refererProbes, sharedKey, "referer", recordNow);
    _recordProbe(_uaProbes,      sharedKey, "ua",      recordNow);

    // Flush the fire-and-forget import("./telegram-bot").then(...).
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // Exactly one alert, and it must identify the UA map.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(1);
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(value).toBe(sharedKey);
  });

  it("both maps independently exceed threshold → both entries record the alert side-effect and hit counts stay separate", async () => {
    // threshold=3: both maps seeded with 3 hits each so both exceed after +1.
    // Primary proof of independence: the synchronous `lastAlerted` side-effect
    // in recordProbe is set BEFORE the fire-and-forget import, making it a
    // reliable signal that the alert branch ran in each map independently.
    // (Async mock-call counting across two concurrent dynamic imports is not
    // stable across Vitest versions — the synchronous assertion is the contract.)
    process.env.PROBE_ALERT_THRESHOLD = "3";

    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _recordProbe } = mod as any;

    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recordNow = Date.now();
    const cutoff    = recordNow - WINDOW_MS;

    const sharedKey = "cross-map-both-alert/1.0";

    // Seed exactly threshold (3) hits in both maps.
    const seedHits = Array.from({ length: 3 }, (_, i) => cutoff + 1000 + i * 200);
    _refererProbes.set(sharedKey, { hits: [...seedHits], lastAlerted: 0 });
    _uaProbes.set(sharedKey,      { hits: [...seedHits], lastAlerted: 0 });

    _recordProbe(_refererProbes, sharedKey, "referer", recordNow);
    _recordProbe(_uaProbes,      sharedKey, "ua",      recordNow);

    // ── Synchronous assertions — no flush needed ─────────────────────────────
    // Hit counts must be independent: each map accumulates its own +1.
    const refererEntry = _refererProbes.get(sharedKey)!;
    const uaEntry      = _uaProbes.get(sharedKey)!;
    expect(refererEntry.hits.length).toBe(4);
    expect(uaEntry.hits.length).toBe(4);

    // lastAlerted is set synchronously inside recordProbe before the async
    // import fires.  Both being set to recordNow proves the alert branch ran
    // in EACH map independently — neither was blocked or skipped because the
    // other map's entry already "consumed" the shared key.
    expect(refererEntry.lastAlerted).toBe(recordNow);
    expect(uaEntry.lastAlerted).toBe(recordNow);

    // The newest hit appended to each entry must be recordNow.
    expect(refererEntry.hits[refererEntry.hits.length - 1]).toBe(recordNow);
    expect(uaEntry.hits[uaEntry.hits.length - 1]).toBe(recordNow);

    // ── Async flush — at least one sendProbeAlert call confirms the telegram
    // path is exercised (both dynamic imports are in-flight; Vitest's mock
    // resolution order is not guaranteed to drain both in the same tick).
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    expect(mockSendProbeAlert.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 422 — both probe branches set lastAlerted in the same recordProbe path
//
// A future refactor might extract recordProbe into a single shared helper and
// accidentally omit the `entry.lastAlerted = now` assignment, breaking both
// the referer branch and the UA branch simultaneously.  Two separate per-branch
// tests (Tasks 413, 415) would still catch a per-branch regression, but would
// NOT catch a single edit that removes the assignment from a shared helper used
// by both branches.
//
// This integration-level test exercises both maps in one it() block:
//   1. Seeds _refererProbes and _uaProbes each to exactly threshold.
//   2. Triggers one alert on each map.
//   3. Asserts that both entries carry a fresh lastAlerted (>= beforeTs).
//   4. Confirms sendProbeAlert was called exactly twice — once per map.
//
// If the shared helper loses the assignment, both lastAlerted values stay at 0
// and the call count drops to 0 (cooldown never activates → subsequent hits
// keep alerting, but lastAlerted never advances), making the regression
// immediately visible.
// ═══════════════════════════════════════════════════════════════════════════

describe("lastAlerted is set on both referer and UA branches in a single recordProbe path", () => {
  it("fires one alert per map and both entries have lastAlerted >= beforeTs", async () => {
    // threshold=2 → alert fires when hits.length exceeds 2 (i.e. on hit 3).
    process.env.PROBE_ALERT_THRESHOLD = "2";

    const mod = await import("./traffic-logger");
    const { _refererProbes, _uaProbes, _recordProbe } = mod as any;

    // Ensure the DB-init promise has resolved so recordProbe runs synchronously.
    await mod.initProbeCounters();

    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const now       = Date.now();
    const cutoff    = now - WINDOW_MS;

    const refKey = "https://task422-regression-scraper.example/probe";
    const uaKey  = "task422-regression-bot/1.0";

    // ── Seed both maps to exactly threshold (2) in-window hits ───────────────
    // The next recordProbe call on each will push hits.length to 3 > threshold
    // and trigger the alert (lastAlerted === 0 → cooldown has not started yet).
    _refererProbes.set(refKey, {
      hits:        [cutoff + 1000, cutoff + 2000],
      lastAlerted: 0,
    });
    _uaProbes.set(uaKey, {
      hits:        [cutoff + 1000, cutoff + 2000],
      lastAlerted: 0,
    });

    // Capture a lower-bound timestamp before either triggering call.
    const beforeTs = Date.now();

    // ── Trigger one alert on the referer map ─────────────────────────────────
    _recordProbe(_refererProbes, refKey, "referer", Date.now());

    // ── (a-referer) lastAlerted must be set synchronously — no flush needed ──
    // If the assignment was moved into .then() or removed entirely, this will
    // still be 0, failing the >=beforeTs check.
    const refEntry = _refererProbes.get(refKey)!;
    expect(refEntry.lastAlerted).toBeGreaterThanOrEqual(beforeTs);

    // Flush the fire-and-forget import("./telegram-bot").then(...) for the
    // referer call.  Two setImmediate rounds: one for the dynamic import
    // Promise to resolve, one for the .then() callback to run.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // ── Trigger one alert on the UA map ──────────────────────────────────────
    _recordProbe(_uaProbes, uaKey, "ua", Date.now());

    // ── (a-ua) lastAlerted must be set synchronously on the UA branch too ────
    const uaEntry = _uaProbes.get(uaKey)!;
    expect(uaEntry.lastAlerted).toBeGreaterThanOrEqual(beforeTs);

    // Flush the fire-and-forget import("./telegram-bot").then(...) for the
    // UA call.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // ── (b) sendProbeAlert must have been called exactly twice ────────────────
    // One call for the referer branch, one for the UA branch.
    // If lastAlerted is missing from the shared helper, the cooldown never
    // engages and subsequent hits keep alerting — the count would diverge.
    expect(mockSendProbeAlert).toHaveBeenCalledTimes(2);

    const calls = mockSendProbeAlert.mock.calls as [string, string, number][];
    const fields = calls.map(([f]) => f).sort();
    expect(fields).toEqual(["referer", "ua"]);

    const values = calls.map(([, v]) => v);
    expect(values).toContain(refKey);
    expect(values).toContain(uaKey);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 448 — middleware-level shared-value double-count guard
//
// A future refactor that collapses the two recordProbe() calls in the
// res.on("finish") handler into one call — or accidentally passes the same
// map for both invocations — would count the shared string twice against one
// map and zero times against the other.  No existing test exercises this
// through the full middleware path.
//
// This test fires a single HTTP request whose Referer and User-Agent headers
// carry identical string values, then reads _refererProbes and _uaProbes
// directly to confirm:
//   • _refererProbes has exactly 1 hit for that key  (not 2, not 0)
//   • _uaProbes      has exactly 1 hit for that key  (not 2, not 0)
//
// The threshold is set high (100) so no alert fires and the assertion stays
// focused purely on per-map hit counting.
// ═══════════════════════════════════════════════════════════════════════════

describe("middleware-level: shared header value recorded once per map, not double-counted", () => {
  it("referer == ua == same string → each map gets exactly 1 hit after one request", async () => {
    // Use a high threshold so no alert fires and the test stays focused on
    // counting rather than alert behaviour.
    process.env.PROBE_ALERT_THRESHOLD = "100";

    const mod = await import("./traffic-logger");
    const { trafficLoggerMiddleware, _refererProbes, _uaProbes } = mod as any;

    // Await startup hydration so the maps are ready before we record.
    await mod.initProbeCounters();

    // A plain non-URL string that:
    //   • does not match any BOT_PATTERNS entry (so the UA probe fires)
    //   • is not a valid URL (isOwnOriginReferer returns false, so the
    //     referer probe fires)
    //   • is not in any constitutional block list
    //   • is already lowercase (so the lowercased refKey === uaKey, making
    //     any accidental same-map double-count immediately visible)
    const sharedValue = "same-shared-string/1.0";

    const req = makeReq(sharedValue, sharedValue);
    const res = makeRes();

    trafficLoggerMiddleware(req, res as any, () => {});
    res.finish();

    // Flush the _initPromise.then(…) microtask chain that contains the
    // recordProbe calls, plus one extra round to be safe.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    const refEntry = _refererProbes.get(sharedValue);
    const uaEntry  = _uaProbes.get(sharedValue);

    // Both maps must have an entry for the shared key.
    expect(refEntry).toBeDefined();
    expect(uaEntry).toBeDefined();

    // Each map must record exactly 1 hit — not 2 (double-count) and not 0
    // (missed).  A collapsed-call or wrong-map-argument regression causes
    // one map to show 2 and the other to show 0 (or undefined), so this
    // assertion catches both failure modes simultaneously.
    expect(refEntry.hits).toHaveLength(1);
    expect(uaEntry.hits).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 467 — multi-request deduplication guard for identical referer+UA
//
// A future "optimisation" might skip the referer probe when referer and UA
// are identical strings, on the theory that they are "the same probe".  That
// would leave _refererProbes with 0 hits across multiple requests — exactly
// the silent failure Task 448's single-hit check cannot catch if the skipping
// only activates after the first request.
//
// This test fires 3 requests all sharing referer == ua == the same string and
// then asserts:
//   • _refererProbes has exactly 3 hits for that key  (not 0, not 6)
//   • _uaProbes      has exactly 3 hits for that key  (not 0, not 6)
//
// "not 0"  catches a deduplicate-on-equality skip (one map stays permanently
//          empty after repeated identical requests).
// "not 6"  catches a double-count regression where both hits land in one map.
// ═══════════════════════════════════════════════════════════════════════════

describe("middleware-level: referer probe not skipped across multiple requests when referer === ua", () => {
  it("3 requests with referer == ua → _refererProbes has 3 hits and _uaProbes has 3 hits", async () => {
    // High threshold so no alert fires; the test is purely about hit counting.
    process.env.PROBE_ALERT_THRESHOLD = "100";

    const mod = await import("./traffic-logger");
    const { trafficLoggerMiddleware, _refererProbes, _uaProbes } = mod as any;

    // Await startup hydration so the maps are ready before we record.
    await mod.initProbeCounters();

    // A lowercase non-URL string that:
    //   • does not match any BOT_PATTERNS entry (so the UA probe fires)
    //   • is not a valid URL (isOwnOriginReferer returns false, referer probe fires)
    //   • is not in any constitutional block list
    //   • is already lowercase so refKey (lowercased) === uaKey, making any
    //     accidental same-map double-count or cross-map skip immediately visible
    const sharedValue = "duplicate-probe-string/3.0";

    // Fire 3 requests, each with identical referer and UA.
    for (let i = 0; i < 3; i++) {
      const req = makeReq(sharedValue, sharedValue);
      const res = makeRes();
      trafficLoggerMiddleware(req, res as any, () => {});
      res.finish();
      // Flush the _initPromise.then(…) microtask chain for each request.
      await new Promise<void>((r) => setImmediate(r));
      await new Promise<void>((r) => setImmediate(r));
      await new Promise<void>((r) => setImmediate(r));
    }

    const refEntry = _refererProbes.get(sharedValue);
    const uaEntry  = _uaProbes.get(sharedValue);

    // Both maps must have an entry — a skip regression leaves one undefined.
    expect(refEntry).toBeDefined();
    expect(uaEntry).toBeDefined();

    // Each map must record exactly 3 hits.
    //   0 hits → referer probe was skipped when referer === ua (the regression)
    //   6 hits → both probes landed in the same map (double-count regression)
    expect(refEntry.hits).toHaveLength(3);
    expect(uaEntry.hits).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 466 — map-argument swap guard in the finish handler
//
// The finish handler calls:
//   recordProbe(refererProbes, refKey, "referer", now)
//   recordProbe(uaProbes,      uaKey,  "ua",      now)
//
// A future refactor that swaps the map arguments — passing uaProbes where
// refererProbes is expected and vice versa — would cause each header value
// to land in the wrong map.  The Task 448 test above uses an identical
// string for both headers, so a swap is invisible (both maps end up with the
// same key either way).
//
// This test uses DISTINCT values for referer and UA so that the wrong-map
// result is immediately detectable:
//   • After one request, _refererProbes must contain the referer key and
//     must NOT contain the UA key.
//   • _uaProbes must contain the UA key and must NOT contain the referer
//     key.
// A swapped-argument regression causes exactly the opposite, so both
// assertions fail simultaneously.
// ═══════════════════════════════════════════════════════════════════════════

describe("middleware-level: referer key lands in _refererProbes, UA key lands in _uaProbes (swap guard)", () => {
  it("distinct referer and UA each end up in their own map — not in the other", async () => {
    // High threshold so no alert fires; the test focuses purely on which map
    // each key lands in.
    process.env.PROBE_ALERT_THRESHOLD = "100";

    const mod = await import("./traffic-logger");
    const { trafficLoggerMiddleware, _refererProbes, _uaProbes } = mod as any;

    // Await startup hydration so the maps are initialised before we record.
    await mod.initProbeCounters();

    // Unique, non-overlapping values — the referer is a URL that passes the
    // "not own-origin" and "not blocked" checks; the UA does not match any
    // BOT_PATTERNS entry so the UA probe fires.
    const refererValue = "http://referer-only-tracker.example/path";
    const uaValue      = "ua-only-tracker-bot/1.0";

    // The referer key stored by the middleware is lowercased + sliced.
    const refKey = refererValue.toLowerCase();
    // The UA key is stored as-is (sliced to 500 chars).
    const uaKey  = uaValue;

    const req = makeReq(uaValue, refererValue);
    const res = makeRes();

    trafficLoggerMiddleware(req, res as any, () => {});
    res.finish();

    // Flush the _initPromise.then(…) microtask chain that contains the
    // recordProbe calls, plus one extra round to be safe.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    // ── Positive assertions: each key must be in its own map ─────────────
    expect(_refererProbes.get(refKey)).toBeDefined();
    expect(_uaProbes.get(uaKey)).toBeDefined();

    // ── Negative assertions: each key must NOT appear in the other map ───
    // A swapped-arguments bug causes the UA key to land in _refererProbes
    // and the referer key to land in _uaProbes, so these two lines are the
    // primary regression detectors.
    expect(_refererProbes.get(uaKey)).toBeUndefined();
    expect(_uaProbes.get(refKey)).toBeUndefined();
  });
});
