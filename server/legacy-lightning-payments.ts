import type { Pool, PoolClient } from "pg";
import { createHash } from "node:crypto";
import { applyWithdrawalReconciliation, type WithdrawalEvidenceReader } from "./withdrawal-reconciliation";

/** Operator-only: consumes an exact recorded founder approval and outgoing proof.
 * This does not call pay(), reset attempts, or revive queued work. */
export function reconcileLegacyLightningWithdrawal(
  pool: Pick<Pool, "connect">, approvalId: string, confirmedKey: string, reader: WithdrawalEvidenceReader,
) {
  return applyWithdrawalReconciliation(pool, approvalId, confirmedKey, "lightning", reader);
}

export class DefinitivePaymentFailure extends Error {}
export class PaymentOutcomeUnknown extends Error {}

async function atomic<T>(pool: Pick<Pool, "connect">, action: (client: PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try { await c.query("BEGIN"); const result = await action(c); await c.query("COMMIT"); return result; }
  catch (error) { await c.query("ROLLBACK"); throw error; }
  finally { c.release(); }
}

/** Claim once before calling the provider. A crash leaves processing/unknown
 * reserved, NEVER automatically retryable or refundable. An operator/provider
 * reconciliation must establish a terminal outcome before funds can move. */
export async function processLegacyLightningQueue(
  pool: Pick<Pool, "connect" | "query">,
  pay: (invoice: string) => Promise<string>,
  outgoingLocked: (userId: string) => Promise<boolean>,
  txId?: number,
) {
  const rows = (await pool.query(`SELECT q.id,q.user_id FROM lightning_payment_queue q
    JOIN lightning_transactions t ON t.id=q.tx_id
    WHERE q.status='queued' AND t.status='queued' AND ($1::integer IS NULL OR q.tx_id=$1)
    ORDER BY q.id`, [txId ?? null])).rows;
  for (const candidate of rows) {
    if (await outgoingLocked(candidate.user_id)) continue;
    const row = await atomic(pool, async c => {
      // Parent lock serializes refunds/completion across multiple invoice workers.
      const parent = (await c.query(`SELECT t.* FROM lightning_transactions t
        JOIN lightning_payment_queue q ON q.tx_id=t.id WHERE q.id=$1 FOR UPDATE OF t`, [candidate.id])).rows[0];
      if (!parent || parent.status !== "queued") return;
      return (await c.query(`UPDATE lightning_payment_queue SET status='processing',attempts=attempts+1
        WHERE id=$1 AND status='queued' RETURNING *`, [candidate.id])).rows[0];
    });
    if (!row) continue;
    let outcome: "paid" | "rejected" | "unknown" = "unknown", paymentHash = "", message = "";
    try {
      paymentHash = await pay(row.invoice);
      // Empty acknowledgements are not proof of settlement.
      if (!paymentHash) throw new PaymentOutcomeUnknown("Provider did not confirm settlement");
      outcome = "paid";
    } catch (error) {
      message = (error as Error).message;
      outcome = error instanceof DefinitivePaymentFailure ? "rejected" : "unknown";
    }
    // A database error here leaves 'processing', which is intentionally NOT
    // selected by another worker. Do not turn a persistence failure into a refund.
    await atomic(pool, async c => {
      await c.query("SELECT id FROM lightning_transactions WHERE id=$1 FOR UPDATE", [row.tx_id]);
      const changed = await c.query(`UPDATE lightning_payment_queue SET status=$2,last_error=$3,
        paid_at=CASE WHEN $2='paid' THEN now() ELSE NULL END WHERE id=$1 AND status='processing' RETURNING id`,
      [row.id, outcome, outcome === "paid" ? null : message.slice(0, 1000)]);
      if (!changed.rowCount) return;
      if (outcome === "paid") {
        const remaining = (await c.query(`SELECT id FROM lightning_payment_queue WHERE tx_id=$1 AND status<>'paid'`, [row.tx_id])).rowCount;
        if (!remaining) await c.query(`UPDATE lightning_transactions SET status='completed',completed_at=now(),
          payment_hash=$2,lnbits_payment_id=$2 WHERE id=$1 AND status='queued'`, [row.tx_id, paymentHash]);
      }
      if (outcome === "rejected") {
        // Refund ONLY this definitively rejected invoice, not the whole parent:
        // other batch invoices may have settled, be in-flight or be unknown.
        const credited = await c.query(`UPDATE lightning_wallets SET sats_balance=sats_balance+$2,
          total_withdrawn=total_withdrawn-$2,updated_at=now() WHERE user_id=$1 RETURNING id`, [row.user_id, row.amount_sats]);
        if (credited.rowCount !== 1) throw new Error("Refund wallet missing");
        await c.query(`INSERT INTO lightning_transactions(user_id,type,amount_sats,status,memo,completed_at)
          VALUES ($1,'withdrawal_refund',$2,'completed',$3,now())`,
        [row.user_id, row.amount_sats, `Definitively rejected queue invoice ${row.id}; parent ${row.tx_id}`]);
        await c.query("UPDATE lightning_payment_queue SET status='refunded' WHERE id=$1 AND status='rejected'", [row.id]);
      }
      const states = (await c.query("SELECT status FROM lightning_payment_queue WHERE tx_id=$1", [row.tx_id])).rows.map(r => r.status);
      if (states.length && states.every(s => s === "refunded")) {
        await c.query("UPDATE lightning_transactions SET status='refunded',completed_at=now() WHERE id=$1 AND status='queued'", [row.tx_id]);
      } else if (states.every(s => s === "paid" || s === "refunded") && states.includes("refunded")) {
        await c.query("UPDATE lightning_transactions SET status='partially_refunded',completed_at=now() WHERE id=$1 AND status='queued'", [row.tx_id]);
      }
    });
  }
}

/** Stable global invoice identity. Never accept the same external obligation
 * under another parent or another user's retry key. Keep historical rows. */
export async function assertNewQueueInvoice(db: any, invoice: string, txId: number) {
  const { sql } = await import("drizzle-orm");
  const identity = createHash("sha256").update(invoice.toLowerCase()).digest("hex");
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`ln-out:${identity}`},0))`);
  const existing = (await db.execute(sql`SELECT id,tx_id FROM lightning_payment_queue
    WHERE lower(invoice)=lower(${invoice}) LIMIT 1`)).rows as Array<{id:number;tx_id:number}>;
  const historic = (await db.execute(sql`SELECT id FROM lightning_transactions
    WHERE type='withdrawal' AND lower(payment_request)=lower(${invoice}) AND id<>${txId} LIMIT 1`)).rows;
  if (existing.some(row => row.tx_id !== txId) || historic.length) throw new Error("Invoice already reserved or processed; inspect the original withdrawal");
  return existing.length === 0;
}
