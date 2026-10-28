/**
 * Development-only real PostgreSQL verification. All fixtures are connection-
 * local temporary tables; no application balance, schema or account is changed.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { applyApprovedCorrection, inspectCorrection } from "../server/lightning-balance-correction";

if (process.env.NODE_ENV !== "development") throw new Error("Development-only verifier");
const { pool } = await import("../server/db");
const client = await pool.connect();
try {
  // Only temp tables can resolve: never accidentally fall through to public.
  await client.query("SET search_path TO pg_temp");
  await client.query(`
    CREATE TEMP TABLE users (id text PRIMARY KEY, username text, role text,
      is_active boolean, withdrawals_blocked boolean);
    CREATE TEMP TABLE lightning_wallets (id serial PRIMARY KEY, user_id text UNIQUE,
      sats_balance bigint, total_deposited bigint, total_withdrawn bigint,
      updated_at timestamp DEFAULT now());
    CREATE TEMP TABLE lightning_transactions (id serial PRIMARY KEY, user_id text,
      type text, amount_sats bigint, status text, memo text, completed_at timestamp);
    CREATE TEMP TABLE audit_logs (id text PRIMARY KEY, user_id text, action text,
      resource text, resource_id text, details jsonb, status text);
  `);
  for (const table of ["sats_stakes", "wnusd_positions", "wnusd_transactions", "spectral_bundles", "lp_positions"]) {
    await client.query(`CREATE TEMP TABLE ${table} (id serial PRIMARY KEY, user_id text, amount_sats bigint)`);
  }
  const founder = randomUUID(), user = randomUUID();
  await client.query(`INSERT INTO users VALUES ($1,'Nexus','admin',true,false),
    ($2,'test-wallet','user',false,true)`, [founder, user]);
  await client.query(`INSERT INTO lightning_wallets (user_id,sats_balance,total_deposited,total_withdrawn)
    VALUES ($1,800,49800,0)`, [user]);
  const testPool = { connect: async () => ({
    query: client.query.bind(client), release: () => {},
  }) } as unknown as Pool;
  const key = "isolated-postgres-verification";
  async function approve(target = "961") {
    const { snapshotHash } = await inspectCorrection(testPool, user);
    const id = randomUUID();
    await client.query(`INSERT INTO audit_logs VALUES
      ($1,$2,'lightning_balance_correction_approved','lightning_wallet',$3,$4,'success')`,
    [id, founder, user, JSON.stringify({
      correctionKey: key, userId: user, snapshotHash,
      target: { satsBalance: target, totalDeposited: "49961", totalWithdrawn: "0" },
      reason: "Verified isolated fixture correction, not a real balance change",
      evidence: { deposits: "test-deposit-review", withdrawals: "test-withdrawal-review",
        otherActivity: "test-activity-review", priorApprovals: "test-approval-review" },
      expiresAt: "2099-01-01T00:00:00.000Z",
    })]);
    return id;
  }
  const staleApproval = await approve();
  await client.query(`INSERT INTO lightning_transactions (user_id,type,amount_sats,status)
    VALUES ($1,'withdrawal',5,'pending')`, [user]);
  await assert.rejects(applyApprovedCorrection(testPool, staleApproval, key), /activity changed/);
  assert.equal((await client.query("SELECT sats_balance::text FROM lightning_wallets")).rows[0].sats_balance, "800");

  const approval = await approve();
  // Deliberately fail the audit INSERT after wallet + ledger writes.
  await client.query(`ALTER TABLE audit_logs ADD CONSTRAINT reject_applied
    CHECK (action <> 'lightning_balance_correction_applied')`);
  await assert.rejects(applyApprovedCorrection(testPool, approval, key), /reject_applied/);
  assert.equal((await client.query("SELECT sats_balance::text FROM lightning_wallets")).rows[0].sats_balance, "800");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM lightning_transactions WHERE type='balance_correction'")).rows[0].n, 0);
  await client.query("ALTER TABLE audit_logs DROP CONSTRAINT reject_applied");
  assert.deepEqual(await applyApprovedCorrection(testPool, approval, key), { status: "applied", balanceDelta: "161" });
  const restrictions = (await client.query("SELECT is_active, withdrawals_blocked FROM users WHERE id=$1", [user])).rows[0];
  assert.deepEqual(restrictions, { is_active: false, withdrawals_blocked: true });

  // Simulate legitimate later activity, then a restart/retry.
  await client.query("UPDATE lightning_wallets SET sats_balance=sats_balance+100, total_deposited=total_deposited+100 WHERE user_id=$1", [user]);
  assert.deepEqual(await applyApprovedCorrection(testPool, approval, key), { status: "already_applied" });
  assert.equal((await client.query("SELECT sats_balance::text FROM lightning_wallets")).rows[0].sats_balance, "1061");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM audit_logs WHERE action='lightning_balance_correction_applied'")).rows[0].n, 1);
  console.log("PASS: PostgreSQL stale-approval refusal, atomic rollback, ledger/audit, preserved restrictions and retry after later activity");
} finally {
  client.release();
  await pool.end();
}