import { describe, expect, it, vi } from "vitest";
import { ReviewerNotifications } from "./notifications";
import { fixture } from "./test-fixture";

describe("independent reviewer notification and escalation", () => {
  it("notifies all reviewers with a signed checkpoint and requires separately signed acknowledgements", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    const fetcher = vi.fn(async (url: any, options: any) => {
      const actor = f.config.actors.find(a => a.notificationUrl === url)!;
      const body = JSON.parse(options.body);
      const acknowledgement = { sequence: body.payload.sequence, head: body.payload.head, issuedAt: body.payload.issuedAt };
      return {
        ok: true,
        json: async () => ({ actor: actor.id, signature: f.signature(actor.id, "notification-ack", acknowledgement) }),
      } as Response;
    });
    const notifications = new ReviewerNotifications(f.controller, f.config, f.keys.get("r3")!, fetcher as typeof fetch, f.now);
    expect(await notifications.deliver()).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).payload.cases[0]).toMatchObject({ caseId: "case1", overdue: false, restored: false });
  });
  it("retries unavailable reviewers and never restores on delivery failure or a forged HTTP 200 acknowledgement", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    f.advance(2 * 60 * 60_000);
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ actor: "r1", signature: "forged" }) });
    const notifications = new ReviewerNotifications(f.controller, f.config, f.keys.get("r3")!, fetcher, f.now);
    expect(await notifications.deliver()).toBe(false);
    expect(await notifications.deliver()).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(f.controller.check("operator", "contract1", "contract.run")).toMatchObject({ allowed: false, overdue: true, expired: true });
  });
});
