import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "./db";
import { authenticate, optionalAuth } from "./auth";
import { storage } from "./storage";
import { resolveWalletWave, walletWaveForUser } from "./wnsp-address-resolution";
import { CommerceError, listingJSON, orderJSON, purchase, orderAction, tip, transaction } from "./p2p-commerce";
import { revokeStreamGuest } from "./p2p-stream-access";
import { ElectionError } from "./governance/community-election-service";

const uuid = z.string().uuid();
const amount = z.number().int().min(1).max(10_000_000_000);
const listingInput = z.object({
  title: z.string().trim().min(1).max(160), description: z.string().max(4000).default(""),
  category: z.enum(["file", "service", "goods", "advertising"]), priceSats: amount,
  isPublic: z.boolean().default(true), recipients: z.array(z.string().trim().min(1).max(600)).max(20).default([]),
}).strict();
const actionInput = z.object({
  action: z.enum(["deliver", "accept", "refund", "dispute"]), note: z.string().max(2000).default(""),
  confirm: z.boolean().optional(),
}).strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new CommerceError(400, "Invalid request fields");
  return parsed.data;
}
type Handler = (req: Request, res: Response) => Promise<unknown>;
const safe = (fn: Handler): Handler => async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try { return await fn(req, res); } catch (error) {
    if (error instanceof CommerceError) return res.status(error.status).json({ error: error.message });
    if (error instanceof ElectionError) return res.status(error.status).json({ error: "Use a registered, unambiguous wave address belonging to an active wallet" });
    // Never leak database details or claim a transaction succeeded on failure.
    if ((error as any)?.code === "23505") return res.status(409).json({ error: "This request was already processed; refresh your orders" });
    return res.status(503).json({ error: "P2P service unavailable; refresh to check the recorded outcome before retrying" });
  }
};
async function ensureWallet(id: string) {
  await pool.query("INSERT INTO lightning_wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [id]);
}
async function owner(streamId: string, id: string) {
  const row = (await pool.query("SELECT id FROM streams WHERE id=$1 AND broadcaster_id=$2", [streamId, id])).rows[0];
  if (!row) throw new CommerceError(404, "Stream unavailable");
}

// Deliberately closed until legacy wallet deposit/withdrawal writers have
// passed the same concurrency review. Tests enable only isolated fake funds.
export const P2P_PAYMENTS_RELEASED = false;
export function registerP2PCommerceRoutes(app: Express, options = { paymentsEnabled: P2P_PAYMENTS_RELEASED }) {
  const paymentHoldReason = "New P2P funding is paused pending the legacy wallet concurrency audit. No new purchase or tip will debit your balance.";
  app.get("/api/p2p/payments-policy", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ enabled: options.paymentsEnabled, reason: options.paymentsEnabled ? "" : paymentHoldReason });
  });
  app.get("/api/p2p/listings", safe(async (_req, res) => {
    const rows = await pool.query(`SELECT l.* FROM p2p_listings l JOIN users u ON u.id=l.seller_id
      WHERE l.is_public=true AND l.status='active' AND u.is_active=true ORDER BY l.created_at DESC LIMIT 100`);
    res.json({ listings: rows.rows.map(listingJSON) });
  }));
  app.get("/api/p2p/account", authenticate, safe(async (req, res) => {
    const id = req.user!.id;
    await ensureWallet(id);
    const [identity, wallet, sums, listings, orders] = await Promise.all([
      walletWaveForUser(pool, id),
      pool.query("SELECT sats_balance FROM lightning_wallets WHERE user_id=$1", [id]),
      pool.query(`SELECT COALESCE(SUM(amount_sats) FILTER (WHERE buyer_id=$1),0) AS held,
        COALESCE(SUM(amount_sats) FILTER (WHERE seller_id=$1),0) AS pending FROM p2p_orders
        WHERE status IN ('funded','delivered','disputed') AND (buyer_id=$1 OR seller_id=$1)`, [id]),
      pool.query(`SELECT l.* FROM p2p_listings l JOIN users u ON u.id=l.seller_id WHERE
        l.seller_id=$1 OR (l.status='active' AND u.is_active=true AND (l.is_public=true OR EXISTS
        (SELECT 1 FROM p2p_listing_recipients r WHERE r.listing_id=l.id AND r.user_id=$1)))
        ORDER BY l.created_at DESC LIMIT 100`, [id]),
      pool.query("SELECT * FROM p2p_orders WHERE buyer_id=$1 OR seller_id=$1 ORDER BY CASE WHEN status NOT IN ('released','refunded') THEN 0 ELSE 1 END,updated_at DESC LIMIT 100", [id]),
    ]);
    res.json({ address: identity, paymentsEnabled: options.paymentsEnabled, availableSats: String(wallet.rows[0]?.sats_balance ?? 0),
      heldSats: String(sums.rows[0].held), pendingSats: String(sums.rows[0].pending),
      listings: listings.rows.map(listingJSON), orders: orders.rows.map(orderJSON) });
  }));
  app.post("/api/p2p/listings", authenticate, safe(async (req, res) => {
    if (!await storage.checkRateLimit(req.user!.id, "p2p_listing", 10, 60_000)) throw new CommerceError(429, "Wait before creating more listings");
    const input = parse(listingInput, req.body), seller = req.user!.id;
    if (!input.isPublic && !input.recipients.length) throw new CommerceError(400, "Private listings need invited wave addresses");
    const address = await walletWaveForUser(pool, seller);
    const guests = [...new Set(await Promise.all(input.recipients.map(async a => (await resolveWalletWave(pool, a)).userId)))];
    await ensureWallet(seller);
    const row = await transaction(pool, async c => {
      const result = (await c.query(`INSERT INTO p2p_listings
        (id,seller_id,seller_wave,title,description,category,price_sats,is_public) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [randomUUID(),seller,address,input.title,input.description,input.category,input.priceSats,input.isPublic])).rows[0];
      for (const id of guests) await c.query("INSERT INTO p2p_listing_recipients (listing_id,user_id) VALUES ($1,$2)", [result.id,id]);
      return result;
    });
    res.status(201).json({ listing: listingJSON(row) });
  }));
  app.delete("/api/p2p/listings/:id", authenticate, safe(async (req, res) => {
    const id = parse(uuid, req.params.id);
    const rows = await pool.query("UPDATE p2p_listings SET status='cancelled' WHERE id=$1 AND seller_id=$2 AND status='active' RETURNING id",
      [id,req.user!.id]);
    if (!rows.rows.length) throw new CommerceError(409, "Only your available listings can be cancelled");
    res.json({ ok: true });
  }));
  app.post("/api/p2p/listings/:id/buy", authenticate, safe(async (req, res) => {
    if (!options.paymentsEnabled) throw new CommerceError(423, paymentHoldReason);
    if (!await storage.checkRateLimit(req.user!.id, "p2p_purchase", 20, 60_000)) throw new CommerceError(429, "Wait before retrying purchases");
    const id = parse(uuid, req.params.id);
    const input = parse(z.object({ requestId: uuid }).strict(), req.body);
    const buyerWave = await walletWaveForUser(pool, req.user!.id);
    res.json({ order: await purchase(pool,id,req.user!.id,buyerWave,input.requestId) });
  }));
  app.post("/api/p2p/orders/:id/action", authenticate, safe(async (req, res) => {
    if (!await storage.checkRateLimit(req.user!.id, "p2p_order", 60, 60_000)) throw new CommerceError(429, "Wait before updating more orders");
    const id = parse(uuid, req.params.id), input = parse(actionInput, req.body);
    res.json({ order: await orderAction(pool,id,req.user!.id,input.action,input.note,input.confirm) });
  }));
  app.post("/api/p2p/tips", authenticate, safe(async (req, res) => {
    if (!options.paymentsEnabled) throw new CommerceError(423, paymentHoldReason);
    if (!await storage.checkRateLimit(req.user!.id, "p2p_tip", 20, 60_000)) throw new CommerceError(429, "Wait before sending more tips");
    const input = parse(z.object({ recipient: z.string().trim().min(1).max(600), amountSats: amount, requestId: uuid }).strict(), req.body);
    const recipient = await resolveWalletWave(pool, input.recipient);
    res.json(await tip(pool,req.user!.id,recipient.userId,input.amountSats,input.requestId));
  }));
  app.get("/api/p2p/live", optionalAuth, safe(async (req, res) => {
    const rows = await pool.query(`SELECT s.id,s.title,s.broadcaster_id,s.is_public,s.status FROM streams s
      JOIN users u ON u.id=s.broadcaster_id WHERE u.is_active=true AND
      ((s.status='live' AND s.is_public=true) OR (s.status IN ('pending','live') AND
      (s.broadcaster_id=$1 OR EXISTS (SELECT 1 FROM p2p_stream_guests g WHERE g.stream_id=s.id AND g.user_id=$1))))
      ORDER BY s.created_at DESC LIMIT 100`, [req.user?.id ?? null]);
    res.json({ streams: rows.rows.map(r => ({ id:r.id,title:r.title,broadcasterId:r.broadcaster_id,isPublic:r.is_public,status:r.status })) });
  }));
  app.get("/api/p2p/live/:streamId/guests", authenticate, safe(async (req, res) => {
    const id = parse(uuid, req.params.streamId); await owner(id,req.user!.id);
    const result = await pool.query("SELECT user_id,wave_address FROM p2p_stream_guests WHERE stream_id=$1 ORDER BY user_id", [id]);
    res.json({ guests: result.rows.map(r => ({ userId:r.user_id,waveAddress:r.wave_address })) });
  }));
  app.post("/api/p2p/live/:streamId/guests", authenticate, safe(async (req, res) => {
    if (!await storage.checkRateLimit(req.user!.id, "p2p_invite", 30, 60_000)) throw new CommerceError(429, "Wait before inviting more guests");
    const id = parse(uuid, req.params.streamId); await owner(id,req.user!.id);
    const input = parse(z.object({ address:z.string().trim().min(1).max(600) }).strict(),req.body);
    const target = await resolveWalletWave(pool,input.address);
    await transaction(pool, async c => {
      const stream = (await c.query(
        "SELECT id,status,is_public FROM streams WHERE id=$1 AND broadcaster_id=$2 FOR UPDATE",
        [id,req.user!.id],
      )).rows[0];
      if (!stream) throw new CommerceError(404,"Stream unavailable");
      if (!["pending","live"].includes(stream.status) || stream.is_public) {
        throw new CommerceError(409,"Invitations require a pending or live private stream");
      }
      // A retry for an existing recipient must still succeed at capacity.
      // Locking the room serializes concurrent additions to its audience.
      const count = (await c.query(
        "SELECT count(*) AS n, bool_or(user_id=$2) AS existing FROM p2p_stream_guests WHERE stream_id=$1",
        [id,target.userId],
      )).rows[0];
      if (Number(count.n) >= 50 && !count.existing) throw new CommerceError(409,"Private stream invitation limit reached");
      await c.query(`INSERT INTO p2p_stream_guests (stream_id,user_id,wave_address) VALUES ($1,$2,$3)
        ON CONFLICT (stream_id,user_id) DO UPDATE SET wave_address=excluded.wave_address`, [id,target.userId,input.address]);
    });
    res.json({ ok:true });
  }));
  app.delete("/api/p2p/live/:streamId/guests/:userId", authenticate, safe(async (req, res) => {
    const id = parse(uuid,req.params.streamId); await owner(id,req.user!.id);
    const user = parse(z.string().min(1).max(36),req.params.userId);
    await pool.query("DELETE FROM p2p_stream_guests WHERE stream_id=$1 AND user_id=$2", [id,user]);
    revokeStreamGuest(id,user);
    res.json({ ok:true });
  }));
}
