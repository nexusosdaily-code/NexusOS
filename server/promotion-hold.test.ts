import { afterEach, describe, expect, it, vi } from "vitest";

const io = vi.hoisted(() => ({ database: vi.fn(), publish: vi.fn() }));
vi.mock("./db", () => ({
  db: { select: io.database, insert: io.database, update: io.database },
  pool: { query: io.database },
}));
vi.mock("./nostr-service", () => ({ publishToNostr: io.publish }));
vi.mock("./founding-owner-service", () => ({ getOwnerRegister: io.database }));

import { fireCampaignSlot, fireEventBroadcast, getCampaignState, startNxtCampaignAgent, stopNxtCampaignAgent } from "./nxt-campaign-agent";
import { runSchedulerTick, startPostScheduler } from "./post-scheduler";
import { getBridgeState, manualSync, startTgNostrBridge } from "./telegram-nostr-bridge";
import { getBroadcastAgentState, startSocialBroadcastAgent } from "./social_broadcast_agent";

afterEach(() => {
  stopNxtCampaignAgent();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("promotion hold has no outbound or queue side effects", () => {
  it("refuses scheduled and manual campaign sends even with legacy enable flags", async () => {
    vi.stubEnv("CAMPAIGN_ENABLED", "true");
    vi.stubEnv("NXT_CAMPAIGN_DISABLED", "false");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const interval = vi.spyOn(globalThis, "setInterval");
    startNxtCampaignAgent(1);
    expect(getCampaignState()).toMatchObject({ paused: true, running: false, nextFireAt: null });
    expect(interval).not.toHaveBeenCalled();
    await expect(fireCampaignSlot(0)).rejects.toThrow(/paused/i);
    const result = await fireEventBroadcast({ emoji: "", title: "test", body: "test", hashtags: [] });
    expect(result).toMatchObject({ tg: { ok: false }, nostr: { ok: false }, discord: { ok: false } });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(io.publish).not.toHaveBeenCalled();
    expect(io.database).not.toHaveBeenCalled();
  });

  it("does not consume pending scheduled posts or mark them sent", async () => {
    const interval = vi.spyOn(globalThis, "setInterval");
    startPostScheduler();
    await runSchedulerTick();
    expect(interval).not.toHaveBeenCalled();
    expect(io.database).not.toHaveBeenCalled();
  });

  it("blocks automatic and manual cross-posting and video promotion", async () => {
    const interval = vi.spyOn(globalThis, "setInterval");
    startTgNostrBridge();
    await manualSync();
    startSocialBroadcastAgent();
    expect(getBridgeState().running).toBe(false);
    expect(getBroadcastAgentState()).toMatchObject({ status: "IDLE" });
    expect(interval).not.toHaveBeenCalled();
    expect(io.publish).not.toHaveBeenCalled();
    expect(io.database).not.toHaveBeenCalled();
  });
});
