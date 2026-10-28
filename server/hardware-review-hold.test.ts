import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { HELD_HARDWARE_ACTIONS, registerHardwareReviewHold } from "./hardware-review-hold";
import { canDispatchScheduledPromotion, promotionsArePaused } from "../shared/hardware-readiness";

describe("hardware review hold HTTP boundary", () => {
  let server: Server;
  let base: string;
  const mutation = vi.fn();
  beforeAll(async () => {
    const app = express();
    registerHardwareReviewHold(app);
    app.post([...HELD_HARDWARE_ACTIONS], (_req, res) => {
      mutation();
      res.json({ ok: true });
    });
    app.post("/api/ordinary-wallet-operation", (_req, res) => res.json({ ok: true }));
    await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test HTTP port");
    base = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  it.each(HELD_HARDWARE_ACTIONS)("blocks %s before any mutation", async path => {
    const response = await fetch(`${base}${path.replace(":id", "test-post")}`, { method: "POST" });
    expect(response.status).toBe(423);
    expect(await response.json()).toMatchObject({ paused: true, code: "HARDWARE_REVIEW_HOLD" });
    expect(mutation).not.toHaveBeenCalled();
  });

  it("exposes an uncached public status without private information", async () => {
    const response = await fetch(`${base}/api/hardware/readiness`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      paused: true, active: true, releaseApprovedAt: null, status: "engineering_review_required",
    });
  });

  it("does not block unrelated wallet operations", async () => {
    const response = await fetch(`${base}/api/ordinary-wallet-operation`, { method: "POST" });
    expect(response.status).toBe(200);
  });

  it("cannot release on a timer and never dispatches historical queued posts during the hold", () => {
    expect(promotionsArePaused()).toBe(true);
    for (const date of ["2000-01-01", "2099-01-01", "not-a-date"]) {
      expect(canDispatchScheduledPromotion(date)).toBe(false);
    }
  });
});
