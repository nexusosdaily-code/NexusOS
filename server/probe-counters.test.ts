/**
 * probe-counters.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Integration-style tests for the probe-counter persistence layer added in
 * traffic-logger.ts.  All DB and Telegram calls are mocked; no live DB needed.
 *
 * Scenarios covered
 * ─────────────────
 * 1. initProbeCounters() loads DB rows into the in-memory maps so a restarted
 *    process retains counts accumulated before the restart.
 * 2. A hit that arrives after restart triggers an alert when the pre-restart
 *    count already sat at the threshold — proving the 24-hour window survives
 *    a process recycle.
 * 3. The cooldown (lastAlerted) is also restored from the DB so a restarted
 *    process does not re-fire an alert that was already sent.
 * 4. persistProbeEntry issues an atomic SQL statement (INSERT … ON CONFLICT …
 *    DO UPDATE with jsonb_array_elements) — not a full-array overwrite — so
 *    concurrent requests cannot silently overwrite each other's hit counts.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Per-test module isolation ─────────────────────────────────────────────────
// Each test calls vi.resetModules() + vi.doMock() so module-level constants
// (ALERT_THRESHOLD, the _initPromise) are re-evaluated from scratch.

describe("probe-counters: restart persistence and atomic writes", () => {
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockFrom:    ReturnType<typeof vi.fn>;
  let mockSendProbeAlert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockExecute        = vi.fn().mockResolvedValue({});
    mockFrom           = vi.fn().mockResolvedValue([]);
    mockSendProbeAlert = vi.fn().mockResolvedValue(undefined);

    vi.doMock("./db", () => ({
      db: {
        execute: mockExecute,
        select:  () => ({ from: mockFrom }),
      },
    }));

    vi.doMock("../shared/schema", () => ({
      trafficLogs:  {},
      probeCounters: {},
    }));

    vi.doMock("./telegram-bot", () => ({
      sendProbeAlert: mockSendProbeAlert,
    }));

    // Silence modules that traffic-logger imports at the top level.
    vi.doMock("./honeypot",       () => ({ isHoneypotPath: () => false }));
    vi.doMock("./geoip-enricher", () => ({
      ipCountryCache: new Map(),
      ipHostingCache: new Map(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PROBE_ALERT_THRESHOLD;
  });

  // ── Test 1: startup hydration ───────────────────────────────────────────────
  it("loads persisted hits from DB so a restarted process retains pre-restart counts", async () => {
    const now = Date.now();
    const storedHits = [now - 5000, now - 4000, now - 3000]; // 3 recent hits

    mockFrom.mockResolvedValue([
      { fieldType: "ua", key: "ScrapyBot/1.0", hits: storedHits, lastAlerted: 0 },
    ]);

    const { initProbeCounters, _uaProbes } =
      await import("./traffic-logger");

    // Simulate a fresh process start: clear any maps populated by the
    // module-level _initPromise, then re-run initProbeCounters explicitly.
    _uaProbes.clear();
    await initProbeCounters();

    const entry = _uaProbes.get("ScrapyBot/1.0");
    expect(entry).toBeDefined();
    expect(entry!.hits).toHaveLength(3);
    expect(entry!.lastAlerted).toBe(0);
  });

  // ── Test 2: alert fires on first post-restart hit when at threshold ─────────
  it("fires the alert on the first post-restart hit when pre-restart hits sit at the threshold", async () => {
    // Use threshold = 2 so the alert fires when hits.length > 2 (i.e. at 3 hits).
    process.env.PROBE_ALERT_THRESHOLD = "2";

    const now = Date.now();
    const storedHits = [now - 5000, now - 4000]; // exactly 2 hits = at the threshold

    mockFrom.mockResolvedValue([
      { fieldType: "ua", key: "ScrapyBot/1.0", hits: storedHits, lastAlerted: 0 },
    ]);

    const { initProbeCounters, _uaProbes, _recordProbe } =
      await import("./traffic-logger");

    _uaProbes.clear();
    await initProbeCounters();

    // One more hit pushes the count to 3, which exceeds the threshold of 2.
    _recordProbe(_uaProbes, "ScrapyBot/1.0", "ua", Date.now());

    // Allow the dynamic import of telegram-bot and its promise chain to flush.
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(mockSendProbeAlert).toHaveBeenCalledOnce();
    // sendProbeAlert(field, value, hits) — check field and value arguments
    const [field, value] = mockSendProbeAlert.mock.calls[0] as [string, string, number];
    expect(field).toBe("ua");
    expect(value).toContain("ScrapyBot/1.0");
  });

  // ── Test 3: cooldown is restored — no duplicate alert after restart ─────────
  it("does not re-fire the alert after restart when lastAlerted is still within the cooldown window", async () => {
    process.env.PROBE_ALERT_THRESHOLD = "2";

    const now = Date.now();
    // lastAlerted was set 30 minutes ago — still inside the 1-hour cooldown.
    const recentAlerted = now - 30 * 60 * 1000;
    const storedHits    = [now - 5000, now - 4000, now - 3000]; // 3 hits (> threshold)

    mockFrom.mockResolvedValue([
      {
        fieldType:   "ua",
        key:         "ScrapyBot/1.0",
        hits:        storedHits,
        lastAlerted: recentAlerted,
      },
    ]);

    const { initProbeCounters, _uaProbes, _recordProbe } =
      await import("./traffic-logger");

    _uaProbes.clear();
    await initProbeCounters();

    // Another hit — count is now 4, still > threshold, but cooldown is active.
    _recordProbe(_uaProbes, "ScrapyBot/1.0", "ua", Date.now());

    await new Promise((resolve) => setTimeout(resolve, 60));

    // Alert must NOT fire because lastAlerted was restored from DB.
    expect(mockSendProbeAlert).not.toHaveBeenCalled();
  });

  // ── Test 4: atomic SQL — no full-array overwrite ────────────────────────────
  it("issues an atomic SQL append (not a full-array overwrite) to prevent concurrent-write races", async () => {
    mockFrom.mockResolvedValue([]);

    const { initProbeCounters, _uaProbes, _recordProbe } =
      await import("./traffic-logger");

    await initProbeCounters();

    const now = Date.now();
    _recordProbe(_uaProbes, "TestBot/1.0", "ua", now);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockExecute).toHaveBeenCalled();

    // initProbeCounters issues several CREATE TABLE/INDEX calls before the
    // probe upsert.  Find the call that contains the atomic append pattern.
    const allSqlStrs: string[] = mockExecute.mock.calls.map((call: unknown[]) => {
      const arg = call[0];
      return typeof arg === "string" ? arg : JSON.stringify(arg);
    });
    const upsertCall = allSqlStrs.find((s) => /ON CONFLICT/i.test(s));
    expect(upsertCall).toBeDefined();
    expect(upsertCall).toMatch(/jsonb_array_elements/i);
    expect(upsertCall).toMatch(/jsonb_build_array/i);
  });
});
