import { describe, expect, it } from "vitest";
import { canDispatchScheduledPromotion, HARDWARE_REVIEW_HOLD, promotionsArePaused } from "../shared/hardware-readiness";

describe("explicit release and stale-post boundary", () => {
  it("requires both release controls and rejects pre-approval schedules after a future release", () => {
    const original = { ...HARDWARE_REVIEW_HOLD };
    try {
      // Test-only policy mutation; runtime callers cannot release the source
      // policy through an endpoint or environment toggle.
      Object.assign(HARDWARE_REVIEW_HOLD, { active: false, releaseApprovedAt: null });
      expect(promotionsArePaused()).toBe(true);
      Object.assign(HARDWARE_REVIEW_HOLD, { active: true, releaseApprovedAt: "2099-01-01T00:00:00Z" });
      expect(promotionsArePaused()).toBe(true);
      Object.assign(HARDWARE_REVIEW_HOLD, { active: false, releaseApprovedAt: "2099-01-01T00:00:00Z" });
      expect(promotionsArePaused()).toBe(false);
      expect(canDispatchScheduledPromotion("2098-12-31T23:59:59.999Z")).toBe(false);
      expect(canDispatchScheduledPromotion("2099-01-01T00:00:00Z")).toBe(true);
      expect(canDispatchScheduledPromotion("2099-01-01T00:00:00.001Z")).toBe(true);
      expect(canDispatchScheduledPromotion("not-a-date")).toBe(false);
      Object.assign(HARDWARE_REVIEW_HOLD, { releaseApprovedAt: "not-a-date" });
      expect(promotionsArePaused()).toBe(true);
      expect(canDispatchScheduledPromotion("2099-01-01")).toBe(false);
    } finally {
      Object.assign(HARDWARE_REVIEW_HOLD, original);
    }
  });
});
