/**
 * dynamic-blocks.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the dynamic block enforcement in traffic-logger.ts.
 *
 * Covers:
 *   1. isBlockedReferrer — returns blocked:true for a referer added to the
 *      dynamic snapshot, by exact URL match and by hostname match.
 *   2. detectBot — returns isBot:true for a UA added to the dynamic snapshot.
 *   3. Middleware — returns 403 for a dynamically blocked UA before next().
 *   4. Middleware — returns 403 for a dynamically blocked referer (URL form).
 *   5. Middleware — calls next() for requests that are not in the snapshot.
 *
 * All tests run without a live DB. The dynamic snapshot is seeded directly
 * via _testSetDynamicBlockSnapshot() and reset before each test.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mock DB and schema so traffic-logger never opens a real connection ────────
vi.mock("./db", () => ({ db: { insert: vi.fn(), select: vi.fn() } }));
vi.mock("../shared/schema", () => ({
  trafficLogs:   {},
  dynamicBlocks: {},
}));
vi.mock("./geoip-enricher", () => ({
  ipCountryCache: { get: vi.fn(() => undefined) },
  ipHostingCache: { get: vi.fn(() => false) },
}));
vi.mock("./honeypot", () => ({ isHoneypotPath: vi.fn(() => false) }));

import {
  trafficLoggerMiddleware,
  _testSetDynamicBlockSnapshot,
} from "./traffic-logger";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, any> = {}) {
  return {
    path:    "/",
    method:  "GET",
    headers: {},
    socket:  { remoteAddress: "1.2.3.4" },
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    _status: 200,
    _body:   null,
    locals:  {},
    status(code: number) { this._status = code; this.statusCode = code; return this; },
    json(body: any)      { this._body = body; return this; },
    on(_event: string, _cb: () => void) { /* no-op — finish not triggered in these tests */ },
  };
  return res;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset snapshot to empty before every test.
  _testSetDynamicBlockSnapshot({ referers: new Set(), uas: new Set() });
});

// ── 1. Referer block via dynamic snapshot ─────────────────────────────────────

describe("dynamic referer block", () => {
  it("blocks a referer whose exact lowercased value is in the snapshot", () => {
    _testSetDynamicBlockSnapshot({
      referers: new Set(["https://evil-scraper.example.com/path"]),
      uas:      new Set(),
    });

    const req  = makeReq({ headers: { referer: "https://evil-scraper.example.com/path" } });
    const res  = makeRes();
    const next = vi.fn();

    trafficLoggerMiddleware(req, res, next);

    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks a referer that matches by hostname when the stored value is a URL", () => {
    _testSetDynamicBlockSnapshot({
      referers: new Set(["https://scraper.io/"]),
      uas:      new Set(),
    });

    const req  = makeReq({ headers: { referer: "https://scraper.io/other-path" } });
    const res  = makeRes();
    const next = vi.fn();

    trafficLoggerMiddleware(req, res, next);

    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not block a referer that is not in the snapshot", () => {
    const req  = makeReq({ headers: { referer: "https://legit.example.com/" } });
    const res  = makeRes();
    const next = vi.fn();

    trafficLoggerMiddleware(req, res, next);

    expect(res._status).not.toBe(403);
    expect(next).toHaveBeenCalled();
  });
});

// ── 2. UA block via dynamic snapshot ─────────────────────────────────────────

describe("dynamic UA block", () => {
  it("returns 403 for a UA string that is in the snapshot", () => {
    const blockedUA = "ScrapyBot/2.0 (+https://scrapy.org)";
    _testSetDynamicBlockSnapshot({
      referers: new Set(),
      uas:      new Set([blockedUA]),
    });

    const req  = makeReq({ headers: { "user-agent": blockedUA } });
    const res  = makeRes();
    const next = vi.fn();

    trafficLoggerMiddleware(req, res, next);

    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not block a UA that is not in the snapshot", () => {
    _testSetDynamicBlockSnapshot({
      referers: new Set(),
      uas:      new Set(["OtherBot/1.0"]),
    });

    const req  = makeReq({ headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120" } });
    const res  = makeRes();
    const next = vi.fn();

    trafficLoggerMiddleware(req, res, next);

    expect(res._status).not.toBe(403);
    expect(next).toHaveBeenCalled();
  });

  it("does not block a request with no UA header", () => {
    _testSetDynamicBlockSnapshot({
      referers: new Set(),
      uas:      new Set(["SomeBot/1.0"]),
    });

    const req  = makeReq({ headers: {} });
    const res  = makeRes();
    const next = vi.fn();

    trafficLoggerMiddleware(req, res, next);

    // No UA → detectBot marks it Blank-User-Agent but not a dynamic block 403
    // (dynamic UA check gates on `ua && ...`).
    expect(next).toHaveBeenCalled();
  });
});

// ── 3. Normal request passes through ─────────────────────────────────────────

describe("normal request", () => {
  it("calls next() when snapshot is empty", () => {
    const req  = makeReq({ headers: { "user-agent": "Mozilla/5.0 Chrome/120" } });
    const res  = makeRes();
    const next = vi.fn();

    trafficLoggerMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
