import express from "express";
import { createPrivateKey, sign } from "node:crypto";
import { z } from "zod";
import { signingBytes, type SafetyEvent } from "./protocol";
import type { SafetyController } from "./controller";

export const checkSchema = z.object({
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
  operator: z.string().min(1).max(120),
  resource: z.string().min(1).max(120),
  capability: z.literal("contract.run"),
}).strict();

/** Deploy on a different host/security account from the AI/application operator. */
export function createAuthorityApp(controller: SafetyController, signingKey: string, notify: () => void, clock = Date.now) {
  const key = createPrivateKey(signingKey);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Authority requires an Ed25519 signing key");
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "96kb" }));
  app.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  const receipt = (payload: unknown) => ({
    payload, signature: sign(null, signingBytes("authority", payload), key).toString("base64"),
  });
  app.post("/v1/check", (req, res) => {
    try {
      const request = checkSchema.parse(req.body);
      res.json(receipt({
        request, issuedAt: clock(), expiresAt: clock() + 5000,
        ...controller.check(request.operator, request.resource, request.capability),
        ...controller.checkpoint(),
      }));
    } catch { res.status(503).json({ error: "Safety check unavailable" }); }
  });
  app.post("/v1/status", (req, res) => {
    const parsed = z.object({ nonce: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Challenge required" }); return; }
    res.json(receipt({ nonce: parsed.data.nonce, issuedAt: clock(), ...controller.status() }));
  });
  app.post("/v1/events", async (req, res) => {
    try {
      const checkpoint = await controller.submit(req.body as SafetyEvent);
      notify();
      // Reviewers/witnesses must retain this receipt outside BOTH application and authority hosts.
      res.status(201).json(receipt({ issuedAt: clock(), ...checkpoint }));
    } catch {
      // Do not disclose private evidence or signing identities in errors.
      res.status(403).json({ error: "Safety event rejected; no permissions granted" });
    }
  });
  app.use((_req, res) => { res.status(404).json({ error: "Not found" }); });
  return app;
}
