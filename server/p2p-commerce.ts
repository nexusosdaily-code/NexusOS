import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { P2PListing, P2POrder } from "../shared/p2p-market";

export class CommerceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const listingJSON = (r: any): P2PListing => ({
  id: r.id, sellerId: r.seller_id, sellerWave: r.seller_wave, title: r.title,
  description: r.description, category: r.category, priceSats: String(r.price_sats),
  isPublic: r.is_public, status: r.status, createdAt: r.created_at,
});
export const orderJSON = (r: any): P2POrder => ({
  id: r.id, listingId: r.listing_id, buyerId: r.buyer_id, sellerId: r.seller_id,
  buyerWave: r.buyer_wave, sellerWave: r.seller_wave, title: r.title,
  amountSats: String(r.amount_sats), status: r.status, note: r.note,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export async function transaction<T>(pool: Pool, operation: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL lock_timeout = '5s'");
    await c.query("SET LOCAL statement_timeout = '10s'");
    const result = await operation(c);
    await c.query("COMMIT");
    return result;
  } catch (error) {
    await c.query("ROLLBACK"); throw error;
  } finally { c.release(); }
}
async function ledger(c: PoolClient, user: string, type: string, amount: string, id: string) {
  await c.query(`INSERT INTO lightning_transactions (user_id,type,amount_sats,memo,status,completed_at)
    VALUES ($1,$2,$3,$4,'completed',now())`, [user, type, amount, `P2P ${id}`]);
}
async function event(c: PoolClient, id: string, actor: string, action: string, note = "") {
  await c.query(`INSERT INTO p2p_order_events (id,order_id,actor_id,action,note) VALUES ($1,$2,$3,$4,$5)`,
    [randomUUID(), id, actor, action, note]);
}
export async function purchase(pool: Pool, listingId: string, buyer: string, buyerWave: string, requestId: string) {
  return transaction(pool, async c => {
    const listing = (await c.query("SELECT * FROM p2p_listings WHERE id=$1 FOR UPDATE", [listingId])).rows[0];
    if (!listing) throw new CommerceError(404, "Listing unavailable");
    const previous = (await c.query("SELECT * FROM p2p_orders WHERE buyer_id=$1 AND request_id=$2", [buyer, requestId])).rows[0];
    if (previous) {
      if (previous.listing_id !== listingId) throw new CommerceError(409, "Request already used for another purchase");
      return orderJSON(previous);
    }
    if (listing.seller_id === buyer) throw new CommerceError(400, "Cannot buy your own listing");
    if (listing.status !== "active") throw new CommerceError(409, "Listing is no longer available");
    if (!listing.is_public && !(await c.query(
      "SELECT 1 FROM p2p_listing_recipients WHERE listing_id=$1 AND user_id=$2", [listingId, buyer])).rows.length) {
      throw new CommerceError(404, "Listing unavailable");
    }
    const amount = String(listing.price_sats);
    if (BigInt(amount) < 1n || BigInt(amount) > 10_000_000_000n) throw new CommerceError(409, "Invalid listing price");
    if (!(await c.query("SELECT 1 FROM users WHERE id=$1 AND is_active=true", [listing.seller_id])).rows.length) {
      throw new CommerceError(409, "Seller is unavailable");
    }
    const participants = [buyer, listing.seller_id].sort();
    const locked = await c.query("SELECT user_id FROM lightning_wallets WHERE user_id=ANY($1::varchar[]) ORDER BY user_id FOR UPDATE", [participants]);
    if (locked.rows.length !== 2) throw new CommerceError(409, "Both participants need a sats wallet");
    // All active holds must remain visible in the bounded account view.
    const backlog = await c.query(`SELECT participant FROM (
      SELECT buyer_id AS participant FROM p2p_orders WHERE status NOT IN ('released','refunded')
      UNION ALL SELECT seller_id AS participant FROM p2p_orders WHERE status NOT IN ('released','refunded')
      ) pending WHERE participant=ANY($1::varchar[]) GROUP BY participant HAVING count(*)>=50`, [participants]);
    if (backlog.rows.length) throw new CommerceError(409, "A participant has 50 open orders; settle existing orders first");
    // Guarded arithmetic update serializes against other atomic wallet debits.
    const debit = await c.query(`UPDATE lightning_wallets SET sats_balance=sats_balance-$2,updated_at=now()
      WHERE user_id=$1 AND sats_balance >= $2 RETURNING id`, [buyer, amount]);
    if (!debit.rows.length) throw new CommerceError(402, "Insufficient available sats");
    const id = randomUUID();
    const row = (await c.query(`INSERT INTO p2p_orders
      (id,listing_id,buyer_id,seller_id,buyer_wave,seller_wave,title,amount_sats,request_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id, listingId, buyer, listing.seller_id, buyerWave, listing.seller_wave, listing.title, amount, requestId])).rows[0];
    await c.query("UPDATE p2p_listings SET status='reserved' WHERE id=$1", [listingId]);
    await ledger(c, buyer, "p2p_hold", amount, id); await event(c, id, buyer, "funded");
    return orderJSON(row);
  });
}
export async function orderAction(pool: Pool, id: string, actor: string, action: string, note: string, confirm = false) {
  return transaction(pool, async c => {
    const row = (await c.query("SELECT * FROM p2p_orders WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!row || (actor !== row.buyer_id && actor !== row.seller_id)) throw new CommerceError(404, "Order unavailable");
    // A duplicated successful settlement is harmless; opposite settlement is not.
    if ((action === "accept" && actor === row.buyer_id && row.status === "released") ||
        (action === "refund" && actor === row.seller_id && row.status === "refunded")) return orderJSON(row);
    if (["released", "refunded"].includes(row.status)) throw new CommerceError(409, "Order already settled");
    let state: string;
    if (action === "deliver") {
      if (actor !== row.seller_id || !["funded", "delivered"].includes(row.status)) throw new CommerceError(403, "Only the seller can mark delivery");
      state = "delivered";
    } else if (action === "dispute") {
      if (!note.trim()) throw new CommerceError(400, "Describe the dispute");
      state = "disputed";
    } else if (action === "accept" || action === "refund") {
      if (!confirm) throw new CommerceError(400, "Explicit settlement confirmation required");
      if (action === "accept" && (actor !== row.buyer_id || !["delivered", "disputed"].includes(row.status))) {
        throw new CommerceError(403, "Only the buyer can accept delivery after delivery or a dispute");
      }
      if (action === "refund" && actor !== row.seller_id) throw new CommerceError(403, "Only the seller can refund");
      state = action === "accept" ? "released" : "refunded";
      const recipient = action === "accept" ? row.seller_id : row.buyer_id;
      const credited = await c.query(`UPDATE lightning_wallets SET sats_balance=sats_balance+$2,updated_at=now()
        WHERE user_id=$1 RETURNING id`, [recipient, String(row.amount_sats)]);
      if (!credited.rows.length) throw new CommerceError(409, "Settlement wallet unavailable; funds remain held");
      await ledger(c, recipient, action === "accept" ? "p2p_sale" : "p2p_refund", String(row.amount_sats), id);
      // Explicitly close the listing after refunds too; never silently resell a returned file/service.
      await c.query("UPDATE p2p_listings SET status=$2 WHERE id=$1",
        [row.listing_id, action === "accept" ? "sold" : "cancelled"]);
    } else throw new CommerceError(400, "Unknown action");
    const updated = (await c.query("UPDATE p2p_orders SET status=$2,note=$3,updated_at=now() WHERE id=$1 RETURNING *",
      [id, state, note])).rows[0];
    await event(c, id, actor, action, note);
    return orderJSON(updated);
  });
}
export async function tip(pool: Pool, sender: string, recipient: string, amount: number, requestId: string) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10_000_000_000) throw new CommerceError(400, "Invalid sats amount");
  if (sender === recipient) throw new CommerceError(400, "Cannot tip yourself");
  return transaction(pool, async c => {
    // Lock both wallets in stable order to prevent opposing transfers deadlocking.
    const rows = (await c.query(`SELECT user_id,sats_balance FROM lightning_wallets
      WHERE user_id=ANY($1::varchar[]) ORDER BY user_id FOR UPDATE`, [[sender, recipient]])).rows;
    const previous = (await c.query("SELECT * FROM p2p_tips WHERE sender_id=$1 AND request_id=$2", [sender, requestId])).rows[0];
    if (previous) {
      if (previous.recipient_id !== recipient || BigInt(previous.amount_sats) !== BigInt(amount)) throw new CommerceError(409, "Tip request already used");
      return { ok: true, id: previous.id, amountSats: String(previous.amount_sats) };
    }
    if (rows.length !== 2) throw new CommerceError(409, "Both participants need sats wallets");
    const debit = await c.query(`UPDATE lightning_wallets SET sats_balance=sats_balance-$2,updated_at=now()
      WHERE user_id=$1 AND sats_balance >= $2 RETURNING id`, [sender, amount]);
    if (!debit.rows.length) throw new CommerceError(402, "Insufficient available sats");
    await c.query("UPDATE lightning_wallets SET sats_balance=sats_balance+$2,updated_at=now() WHERE user_id=$1", [recipient, amount]);
    const id = randomUUID();
    await c.query("INSERT INTO p2p_tips (id,sender_id,recipient_id,amount_sats,request_id) VALUES ($1,$2,$3,$4,$5)", [id,sender,recipient,amount,requestId]);
    await ledger(c, sender, "tip_sent", String(amount), id); await ledger(c, recipient, "tip_received", String(amount), id);
    return { ok: true, id, amountSats: String(amount) };
  });
}
