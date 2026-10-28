import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";

// No startup imports, schema changes, account defaults or unrestricted HTTP API.
// The existing audit ledger is both the approval source and the one-time marker.
const sats = z.string().max(19).regex(/^(0|[1-9]\d*)$/).refine(
  value => /^(0|[1-9]\d*)$/.test(value) && value.length <= 19 &&
    BigInt(value) <= 9223372036854775807n, "Exceeds PostgreSQL bigint",
);
export const correctionApprovalSchema = z.object({
  correctionKey: z.string().min(8).max(160),
  userId: z.string().uuid(),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  target: z.object({
    satsBalance: sats, totalDeposited: sats, totalWithdrawn: sats,
  }).strict(),
  reason: z.string().min(20).max(4000),
  // References to reviewed evidence, not credentials or payment secrets.
  evidence: z.object({
    deposits: z.string().min(10).max(2000),
    withdrawals: z.string().min(10).max(2000),
    otherActivity: z.string().min(10).max(2000),
    priorApprovals: z.string().min(10).max(2000),
  }).strict(),
  expiresAt: z.string().datetime(),
}).strict();

// Keep numeric amounts as strings: JSON conversion of bigint loses precision.
// Ledger rows are text (not parsed JSON) to preserve all bigint digits.
export async function readCorrectionSnapshot(client: Pick<PoolClient, "query">, userId: string) {
  const wallet = await client.query(`
    SELECT id, user_id, sats_balance::text, total_deposited::text,
           total_withdrawn::text, updated_at::text
    FROM lightning_wallets WHERE user_id=$1`, [userId]);
  if (wallet.rows.length !== 1) throw new Error("Expected exactly one Lightning wallet");
  const account = await client.query(`
    SELECT id, is_active, withdrawals_blocked FROM users WHERE id=$1`, [userId]);
  if (account.rows.length !== 1) throw new Error("Account not found");
  const ledgers: Record<string, string[]> = {};
  for (const table of ["lightning_transactions", "sats_stakes", "wnusd_positions",
    "wnusd_transactions", "spectral_bundles", "lp_positions"] as const) {
    const result = await client.query(
      `SELECT row_to_json(t)::text AS record FROM ${table} t WHERE user_id=$1 ORDER BY id`, [userId],
    );
    ledgers[table] = result.rows.map(row => row.record);
  }
  const prior = await client.query(`
    SELECT row_to_json(a)::text AS record FROM audit_logs a
    WHERE resource_id=$1 AND action <> 'lightning_balance_correction_approved'
    ORDER BY id`, [userId]);
  const snapshot = { wallet: wallet.rows[0], account: account.rows[0], ledgers,
    priorAudit: prior.rows.map(row => row.record) };
  return { snapshot, snapshotHash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
}

export async function inspectCorrection(pool: Pick<Pool, "connect">, userId: string) {
  z.string().uuid().parse(userId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const result = await readCorrectionSnapshot(client, userId);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function applyApprovedCorrection(
  pool: Pick<Pool, "connect">, approvalId: string, confirmedKey: string,
) {
  z.string().uuid().parse(approvalId);
  if (!confirmedKey) throw new Error("Explicit correction-key confirmation required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    // A short maintenance transaction: exclude inserts/updates as well as
    // wallet writes while verifying the reviewed snapshot. Stable lock order.
    await client.query(`LOCK TABLE users, lightning_wallets, lightning_transactions,
      sats_stakes, wnusd_positions, wnusd_transactions, spectral_bundles,
      lp_positions, audit_logs IN SHARE ROW EXCLUSIVE MODE`);
    const approval = await client.query(`
      SELECT a.details, a.resource_id, a.user_id, u.role, u.username
      FROM audit_logs a JOIN users u ON u.id=a.user_id
      WHERE a.id=$1 AND a.action='lightning_balance_correction_approved'
        AND a.resource='lightning_wallet' AND a.status='success'`, [approvalId]);
    const record = approval.rows[0];
    if (!record || record.role !== "admin" || record.username?.toLowerCase() !== "nexus") {
      throw new Error("A recorded founder-admin approval is required");
    }
    const plan = correctionApprovalSchema.parse(record.details);
    if (record.resource_id !== plan.userId || confirmedKey !== plan.correctionKey) {
      throw new Error("Approval account or confirmation does not match");
    }
    const used = await client.query(`
      SELECT id FROM audit_logs WHERE action='lightning_balance_correction_applied'
      AND details->>'correctionKey'=$1 AND status='success'`, [plan.correctionKey]);
    if (used.rows.length) {
      await client.query("COMMIT");
      return { status: "already_applied" as const };
    }
    if (Date.parse(plan.expiresAt) <= Date.now()) throw new Error("Approval expired");
    const { snapshot, snapshotHash } = await readCorrectionSnapshot(client, plan.userId);
    if (snapshotHash !== plan.snapshotHash) throw new Error("Account activity changed since review; obtain a new approval");
    const before = snapshot.wallet;
    const delta = (BigInt(plan.target.satsBalance) - BigInt(before.sats_balance)).toString();
    const updated = await client.query(`
      UPDATE lightning_wallets
      SET sats_balance=$1::bigint, total_deposited=$2::bigint,
          total_withdrawn=$3::bigint, updated_at=now()
      WHERE id=$4 AND sats_balance=$5::bigint AND total_deposited=$6::bigint
        AND total_withdrawn=$7::bigint RETURNING id`,
    [plan.target.satsBalance, plan.target.totalDeposited, plan.target.totalWithdrawn,
      before.id, before.sats_balance, before.total_deposited, before.total_withdrawn]);
    if (updated.rows.length !== 1) throw new Error("Wallet changed; correction aborted");
    // Corrections are NOT deposits or withdrawals. Record the signed balance
    // adjustment separately so totals and provider reconciliations remain valid.
    await client.query(`
      INSERT INTO lightning_transactions (user_id,type,amount_sats,status,memo,completed_at)
      VALUES ($1,'balance_correction',$2::bigint,'completed',$3,now())`,
    [plan.userId, delta, `Approved correction ${plan.correctionKey}; approval ${approvalId}`]);
    await client.query(`
      INSERT INTO audit_logs (id,user_id,action,resource,resource_id,details,status)
      VALUES ($1,$2,'lightning_balance_correction_applied','lightning_wallet',$3,$4::jsonb,'success')`,
    [randomUUID(), record.user_id, plan.userId, JSON.stringify({
      ...plan, approvalId, before, after: plan.target, balanceDelta: delta,
      restrictionsUnchanged: snapshot.account,
    })]);
    await client.query("COMMIT");
    return { status: "applied" as const, balanceDelta: delta };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}