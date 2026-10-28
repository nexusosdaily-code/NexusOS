/**
 * Real PostgreSQL verification using connection-local temporary tables.
 * No application users, balances or ledger records are changed.
 * Run: NODE_ENV=development npx tsx scripts/verify-owner-gift.ts
 */
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { pool } from "../server/db";
import { executeOwnerGift, getOwnerRegister } from "../server/founding-owner-service";

if (process.env.NODE_ENV !== "development") {
  throw new Error("This verifier is development-only");
}

const client = await pool.connect();
try {
  for (const table of ["users", "wallets", "transactions", "audit_logs"]) {
    // Identifiers come only from this fixed allowlist. PostgreSQL resolves all
    // subsequent unqualified service queries to these temporary shadows.
    await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS)`);
  }
  const users = await client.query(`
    INSERT INTO users (username,email,password_hash,role)
    VALUES ('Nexus','founder@example.test','test-only','admin'),
           ('Dsmart','source@example.test','test-only','user'),
           ('Recipient','recipient@example.test','test-only','user')
    RETURNING id,username,role
  `);
  const actor = users.rows.find((u) => u.username === "Nexus");
  const donor = users.rows.find((u) => u.username === "Dsmart");
  const recipient = users.rows.find((u) => u.username === "Recipient");
  await client.query(`
    INSERT INTO wallets (user_id,address,balance)
    VALUES ($1,'NXT-TEST-SOURCE',500000977.727),($2,'NXT-TEST-DEST',0)
  `, [donor.id, recipient.id]);
  const testPool = {
    connect: async () => ({ query: client.query.bind(client), release: () => {} }),
    query: client.query.bind(client),
  } as unknown as Pool;
  const input = { recipientEmail: "recipient@example.test", publicName: "Owner 01", confirm: true };
  const result = await executeOwnerGift(testPool, actor, input);
  assert.equal(result.alreadyCompleted, false);
  const balances = await client.query("SELECT address,balance FROM wallets ORDER BY address");
  assert.equal(balances.rows.find((w) => w.address === "NXT-TEST-SOURCE").balance, "977.72700000");
  assert.equal(balances.rows.find((w) => w.address === "NXT-TEST-DEST").balance, "500000000.00000000");
  const retry = await executeOwnerGift(testPool, actor, input);
  assert.equal(retry.alreadyCompleted, true);
  assert.equal(retry.transferId, result.transferId);
  const ledger = await client.query("SELECT count(*) AS count FROM transactions");
  assert.equal(ledger.rows[0].count, "1");
  const restricted = await client.query("SELECT is_active,withdrawals_blocked FROM users WHERE id=$1", [donor.id]);
  assert.equal(restricted.rows[0].is_active, false);
  assert.equal(restricted.rows[0].withdrawals_blocked, true);
  const register = await getOwnerRegister(testPool);
  assert.equal(register.replacementComplete, true);
  assert.equal(register.owners.length, 21);
  assert.equal(register.owners[0].username, "Owner 01");
  assert.equal(register.owners[0].wallet, "NXT-TEST-DEST");
  assert.equal(JSON.stringify(register).includes("recipient@example.test"), false);

  await client.query("DELETE FROM transactions");
  await client.query("DELETE FROM audit_logs");
  await client.query("UPDATE wallets SET balance=1 WHERE address='NXT-TEST-SOURCE'");
  const beforeFailure = await client.query("SELECT address,balance FROM wallets ORDER BY address");
  await assert.rejects(() => executeOwnerGift(testPool, actor, input), /insufficient unlocked NXT/);
  const afterFailure = await client.query("SELECT address,balance FROM wallets ORDER BY address");
  assert.deepEqual(afterFailure.rows, beforeFailure.rows);
  console.log("Verified with temporary tables: exact gift, residual, conservation, restrictions, retry safety, public register and rollback. No application data changed.");
} finally {
  client.release();
  await pool.end();
}