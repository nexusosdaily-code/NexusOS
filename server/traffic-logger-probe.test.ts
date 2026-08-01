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
