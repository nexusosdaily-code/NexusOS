import type { Express, Request, RequestHandler } from "express";
import type { Pool } from "pg";
import { z, ZodError } from "zod";
import { waveBroadcastSchema, waveConsentSchema, waveSendSchema, waveSubscriptionSchema } from "../shared/wallet-wave-communications";
import { ElectionError, type Actor } from "./governance/community-election-service";
import { acknowledgeWalletWave, broadcastWalletWave, receiveWaveCommission, sendWalletWave,
  setWaveConsent, setWaveSubscription, waveOverview } from "./wallet-wave-service";

export function registerWalletWaveRoutes(app: Express, pool: Pool, authenticate: RequestHandler,
  rateLimit?: (req: Request, res: import("express").Response) => Promise<boolean>) {
  const base = "/api/messages/wave";
  const actor = (req: Request): Actor => (req as any).user;
  const handle = (work: (req: Request) => Promise<unknown>, status = 200): RequestHandler => async (req,res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      if (req.method !== "GET" && rateLimit && !await rateLimit(req,res)) return;
      res.status(status).json(await work(req));
    }
    catch (error: any) {
      if (error instanceof ElectionError) res.status(error.status).json({ error: error.message });
      else if (error instanceof ZodError) res.status(400).json({ error: error.issues.map(i => i.message).join("; ") });
      else {
        console.error("[WALLET WAVE] Operation failed", error.code ?? error.name);
        res.status(503).json({ error: "Communication storage or ledger unavailable; no partial delivery was committed. Retry with the same key." });
      }
    }
  };
  app.get(base, authenticate, handle(req => waveOverview(pool, actor(req))));
  app.post(`${base}/send`, authenticate, handle(req => sendWalletWave(pool, actor(req), waveSendSchema.parse(req.body)), 201));
  app.post(`${base}/broadcast`, authenticate, handle(req => broadcastWalletWave(pool, actor(req), waveBroadcastSchema.parse(req.body)), 201));
  app.post(`${base}/consent`, authenticate, handle(req => {
    const input = waveConsentSchema.parse(req.body);
    return setWaveConsent(pool, actor(req), input.senderAddress, input.allowed);
  }));
  app.post(`${base}/subscription`, authenticate, handle(req => {
    const input = waveSubscriptionSchema.parse(req.body);
    return setWaveSubscription(pool, actor(req), input.topic, input.subscribed);
  }));
  app.post(`${base}/commissions/:id/receive`, authenticate, handle(req => {
    const input = z.object({ idempotencyKey: z.string().uuid() }).strict().parse(req.body);
    return receiveWaveCommission(pool, actor(req), z.string().uuid().parse(req.params.id), input.idempotencyKey);
  }, 201));
  app.post(`${base}/:id/receipt`, authenticate, handle(req =>
    acknowledgeWalletWave(pool, actor(req), z.string().uuid().parse(req.params.id))));
}
