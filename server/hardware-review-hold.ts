import type { Express, RequestHandler } from "express";
import { HARDWARE_REVIEW_HOLD, promotionsArePaused } from "../shared/hardware-readiness";

export const HELD_HARDWARE_ACTIONS = [
  "/api/campaign/donate",
  "/api/campaign/start",
  "/api/campaign/fire",
  "/api/crowdfund/zap-goal",
  "/api/crowdfund/fire-promo",
  "/api/tg-nostr/sync",
  "/api/scheduled-posts/:id/fire-now",
] as const;

export const enforceHardwareReviewHold: RequestHandler = (_req, res, next) => {
  if (!promotionsArePaused()) return next();
  res.status(423).json({
    error: HARDWARE_REVIEW_HOLD.reason,
    code: "HARDWARE_REVIEW_HOLD",
    paused: true,
  });
};

export function registerHardwareReviewHold(app: Express): void {
  app.get("/api/hardware/readiness", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ ...HARDWARE_REVIEW_HOLD, paused: promotionsArePaused() });
  });
  // Register before the real mutations. No wallet, receipt, queue or ledger
  // writes are made by a held request, including unauthenticated requests.
  app.post([...HELD_HARDWARE_ACTIONS], enforceHardwareReviewHold);
}
