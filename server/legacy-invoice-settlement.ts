import { sql } from "drizzle-orm";
import { changeLegacySats } from "./legacy-sats";

// Called only after provider settlement has been checked, inside the legacy
// transaction. Hash advisory lock also protects against duplicate historical
// invoice rows across users; no uniqueness migration deletes those rows.
export async function settleLegacyInvoice(db: any, userId: string, id: number): Promise<boolean> {
  const row = (await db.execute(sql`SELECT * FROM lightning_transactions
    WHERE id=${id} AND user_id=${userId} AND type='deposit' FOR UPDATE`)).rows[0] as any;
  if (!row || row.status !== "pending") return false;
  const identities: string[] = [...new Set<string>([row.payment_request?.toLowerCase(), row.payment_hash].filter(Boolean))].sort();
  if (!identities.length) throw new Error("Invoice has no stable provider identity");
  for (const identity of identities) {
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`ln-deposit:${identity}`},0))`);
  }
  const prior = (await db.execute(sql`SELECT id FROM lightning_transactions WHERE type='deposit'
    AND status='completed' AND id<>${id} AND
    (payment_hash=${row.payment_hash} OR lower(payment_request)=lower(${row.payment_request})) LIMIT 1`)).rows;
  if (prior.length) {
    await db.execute(sql`UPDATE lightning_transactions SET status='duplicate' WHERE id=${id} AND status='pending'`);
    return false;
  }
  const changed = (await db.execute(sql`UPDATE lightning_transactions SET status='completed',completed_at=now()
    WHERE id=${id} AND user_id=${userId} AND type='deposit' AND status='pending' RETURNING id`)).rows;
  if (!changed.length) return false;
  const amount = Number(row.amount_sats);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid invoice amount");
  await changeLegacySats(db, userId, amount, { deposited: amount });
  return true;
}
