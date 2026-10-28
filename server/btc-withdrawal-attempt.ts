import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { address, networks, Transaction } from "bitcoinjs-lib";
import { z } from "zod";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const script = z.string().regex(/^(?:[a-f0-9]{2})+$/).max(10000);
export const btcAttemptSchema = z.object({
  version: z.literal(1), attemptId: z.string().uuid(),
  transactionId: z.number().int().positive(), txid: hash,
  destination: z.string().min(1).max(200), amountSats: z.string().regex(/^[1-9]\d*$/),
  outputIndex: z.number().int().nonnegative(), outputScript: script, serviceScript: script,
  inputs: z.array(z.object({
    txid: hash, vout: z.number().int().nonnegative(), valueSats: z.string().regex(/^[1-9]\d*$/),
    script,
  }).strict()).min(1),
}).strict();
export type BtcAttempt = z.infer<typeof btcAttemptSchema>;
export type ConstructedWithdrawal = {
  // Signed bytes stay in memory only: journal readers cannot replay a payment.
  txHex: string;
  serviceScript: string;
  inputs: BtcAttempt["inputs"];
};
type Obligation = { id: number; user_id: string; amount_sats: string; btc_address: string | null; memo: string | null };
export type BtcWithdrawalProviders = {
  isLocked(userId: string): Promise<boolean>;
  construct(destination: string, amountSats: number): Promise<ConstructedWithdrawal>;
  broadcast(txHex: string): Promise<string>;
};

/** Validate the signed construction locally, never trusting a provider's txid. */
export function reviewBtcAttempt(t: Obligation, built: ConstructedWithdrawal): BtcAttempt {
  const tx = Transaction.fromHex(built.txHex);
  const destination = t.btc_address!;
  const outputScript = Buffer.from(address.toOutputScript(destination, networks.bitcoin)).toString("hex");
  if (tx.isCoinbase() || tx.ins.length !== built.inputs.length || !tx.ins.length ||
      tx.outs.length < 1 || tx.outs.length > 2) throw new Error("Invalid withdrawal construction");
  const seen = new Set<string>();
  let inputValue = 0n, outputValue = 0n;
  for (let i = 0; i < tx.ins.length; i++) {
    const input = tx.ins[i], expected = built.inputs[i];
    const txid = Buffer.from(input.hash).reverse().toString("hex"), key = `${txid}:${input.index}`;
    if (seen.has(key) || txid !== expected.txid || input.index !== expected.vout ||
        expected.script !== built.serviceScript || !input.witness.length) throw new Error("Invalid service input");
    seen.add(key); inputValue += BigInt(expected.valueSats);
  }
  if (tx.outs[0].value !== BigInt(t.amount_sats) ||
      Buffer.from(tx.outs[0].script).toString("hex") !== outputScript) throw new Error("Invalid withdrawal output");
  if (tx.outs[1] && Buffer.from(tx.outs[1].script).toString("hex") !== built.serviceScript) {
    throw new Error("Invalid service change");
  }
  for (const out of tx.outs) outputValue += out.value;
  if (inputValue <= outputValue) throw new Error("Invalid withdrawal fee");
  return btcAttemptSchema.parse({
    version: 1, attemptId: randomUUID(), transactionId: t.id, txid: tx.getId(),
    destination, amountSats: String(t.amount_sats), outputIndex: 0, outputScript,
    serviceScript: built.serviceScript, inputs: built.inputs,
  });
}

/** Append-only journal in existing audit_logs; no DDL or startup migration.
 * Processing/unknown are deliberately NOT resumable, even before submission.
 * No error path credits balances, deletes an attempt or requeues a reservation.
 */
export async function processBtcWithdrawalQueue(
  pool: Pick<Pool, "connect">, providers: BtcWithdrawalProviders,
): Promise<void> {
  const c = await pool.connect();
  try {
    const pending = (await c.query(`SELECT id,user_id FROM lightning_transactions
      WHERE type='withdrawal' AND status='queued_btc' ORDER BY id`)).rows;
    for (const candidate of pending) {
      if (await providers.isLocked(candidate.user_id)) continue;
      const claimed = await c.query(`UPDATE lightning_transactions SET status='processing'
        WHERE id=$1 AND type='withdrawal' AND status='queued_btc' AND btc_txid IS NULL
        AND payment_request IS NULL
        AND NOT EXISTS (SELECT 1 FROM lightning_payment_queue WHERE tx_id=$1)
        AND NOT EXISTS (SELECT 1 FROM audit_logs WHERE resource='withdrawal' AND resource_id=$1::text
          AND action='btc_withdrawal_prepared')
        RETURNING id,user_id,amount_sats,btc_address,memo`, [candidate.id]);
      if (!claimed.rowCount) continue;
      const t: Obligation = claimed.rows[0];
      let attempt: BtcAttempt;
      try {
        if (!t.btc_address) {
          const match = t.memo?.match(/to\s+(bc1[a-z0-9]+|[13][a-zA-HJ-NP-Z0-9]+)/);
          if (!match) throw new Error("Withdrawal destination missing");
          t.btc_address = match[1];
          await c.query("UPDATE lightning_transactions SET btc_address=$2 WHERE id=$1 AND status='processing'", [t.id, t.btc_address]);
        }
        const amount = Number(t.amount_sats);
        if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Unsafe withdrawal amount");
        const built = await providers.construct(t.btc_address, amount);
        attempt = reviewBtcAttempt(t, built);
        await c.query("BEGIN");
        try {
          await c.query("SET LOCAL synchronous_commit=on");
          const locked = (await c.query("SELECT * FROM lightning_transactions WHERE id=$1 FOR UPDATE", [t.id])).rows[0];
          if (locked.status !== "processing" || locked.btc_txid || locked.user_id !== t.user_id ||
              locked.type !== "withdrawal" || locked.btc_address !== attempt.destination ||
              String(locked.amount_sats) !== attempt.amountSats) throw new Error("Reservation changed during construction");
          const prior = await c.query(`SELECT id FROM audit_logs WHERE resource='withdrawal' AND resource_id=$1
            AND action='btc_withdrawal_prepared'`, [String(t.id)]);
          if (prior.rowCount) throw new Error("Withdrawal already has an attempt");
          // Two identical constructions cannot pay two distinct reservations.
          // Serialize identity reuse even when separate workers claim them.
          await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`btc-withdrawal:${attempt.txid}`]);
          const reused = await c.query(`SELECT id FROM lightning_transactions
            WHERE id<>$1 AND type='withdrawal' AND btc_txid=$2
            UNION ALL SELECT resource_id::integer FROM audit_logs
            WHERE action='btc_withdrawal_prepared' AND resource='withdrawal' AND details->>'txid'=$2`,
          [t.id, attempt.txid]);
          if (reused.rowCount) throw new Error("Broadcast identity already belongs to a reservation");
          await c.query(`INSERT INTO audit_logs(id,user_id,action,resource,resource_id,details,status)
            VALUES($1,$2,'btc_withdrawal_prepared','withdrawal',$3,$4::jsonb,'success')`,
          [attempt.attemptId, t.user_id, String(t.id), JSON.stringify(attempt)]);
          await c.query("UPDATE lightning_transactions SET btc_txid=$2 WHERE id=$1", [t.id, attempt.txid]);
          await c.query("COMMIT");
        } catch (error) { await c.query("ROLLBACK"); throw error; }
        // Read back committed identity before the only irreversible boundary.
        const saved = (await c.query(`SELECT details FROM audit_logs WHERE id=$1
          AND action='btc_withdrawal_prepared' AND status='success'`, [attempt.attemptId])).rows[0];
        if (!saved || JSON.stringify(btcAttemptSchema.parse(saved.details)) !== JSON.stringify(attempt)) {
          throw new Error("Committed attempt readback mismatch");
        }
        // No provider fallback/retry after an ambiguous submission.
        const reported = await providers.broadcast(built.txHex);
        if (reported !== attempt.txid) throw new Error("Broadcast provider returned a different txid");
      } catch (error) {
        await c.query(`UPDATE lightning_transactions SET status='unknown'
          WHERE id=$1 AND status='processing'`, [t.id]);
        // Do not put raw provider errors or signed bytes in the ledger.
        console.error(`[BTC Withdrawal] #${t.id} requires reconciliation`);
        continue;
      }
      // A crash/write failure here leaves a durable identity and reserved sats.
      // It must not be classified as a definitive outgoing failure.
      const completed = await c.query(`UPDATE lightning_transactions SET status='completed',completed_at=now()
        WHERE id=$1 AND status='processing' AND btc_txid=$2 AND btc_address=$3 AND amount_sats=$4
        RETURNING id`, [t.id, attempt.txid, attempt.destination, attempt.amountSats]);
      if (completed.rowCount !== 1) throw new Error("Withdrawal final persistence lost");
    }
  } finally { c.release(); }
}
