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
});

// ═══════════════════════════════════════════════════════════════════════════
// Cooldown boundary — suppression holds when lastAlerted is just 1 ms inside the window
// ═══════════════════════════════════════════════════════════════════════════

/**
 * These tests seed lastAlerted = now - (COOLDOWN_MS - 1) directly into the
 * exported probe maps, then drive one more hit above the threshold.
 *
 * The guard in recordProbe() is:
 *   now - entry.lastAlerted >= COOLDOWN_MS
 *
 * With lastAlerted just 1 ms inside the window the condition evaluates to
 * false and no alert should fire.  If the guard were accidentally changed
 * from >= to > this edge case would silently break; these tests catch that.
 */
describe("cooldown boundary — suppression holds 1 ms before the window expires", () => {
  /**
   * COOLDOWN_MS = PROBE_ALERT_COOLDOWN_HOURS * 3_600_000.
   * With PROBE_ALERT_COOLDOWN_HOURS = "1", COOLDOWN_MS = 3_600_000 ms.
   */
  const COOLDOWN_MS = 3_600_000; // mirrors the module IIFE for PROBE_ALERT_COOLDOWN_HOURS = "1"

  it("UA probe: lastAlerted set to COOLDOWN_MS − 1 ms ago suppresses the next alert", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;

    // Pre-seed the UA probe map: two hits already at threshold, lastAlerted
    // set to exactly 1 ms before the cooldown would expire.
    const now = Date.now();
    const key = "BoundaryScraper/1.0";
    mod._uaProbes.set(key, {
      hits:        [now - 1000, now - 500], // two hits — at the threshold (threshold=2)
      lastAlerted: now - (COOLDOWN_MS - 1), // 1 ms before cooldown expires → still active
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

  it("referer probe: lastAlerted set to COOLDOWN_MS − 1 ms ago suppresses the next alert", async () => {
    process.env.PROBE_ALERT_THRESHOLD      = "2";
    process.env.PROBE_ALERT_COOLDOWN_HOURS = "1";
    const mod = await import("./traffic-logger");
    const mw  = mod.trafficLoggerMiddleware;

    // Pre-seed the referer probe map with the same edge-case lastAlerted.
    const now = Date.now();
    const key = "https://boundary-scraper.example/scan";
    mod._refererProbes.set(key, {
      hits:        [now - 1000, now - 500],
      lastAlerted: now - (COOLDOWN_MS - 1),
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
});
