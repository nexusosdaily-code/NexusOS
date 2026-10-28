import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import { bech32 } from "bech32";
import { address, networks, payments, Transaction } from "bitcoinjs-lib";
import {
  applyWithdrawalReconciliation, inspectWithdrawal, type WithdrawalTarget,
  type EvidenceRequest, type WithdrawalEvidenceReader, invoicePaymentHash,
} from "./withdrawal-reconciliation";
import { reconcileLegacyLightningWithdrawal, processLegacyLightningQueue } from "./legacy-lightning-payments";
import { createWithdrawalEvidenceReader } from "./withdrawal-evidence-reader";

// No app db/startup/wallet/secret module imports, and no network providers.
// This cluster listens on a unique Unix socket ONLY, never a TCP port.
let pool: pg.Pool, directory: string, started = false;
const founder = randomUUID(), user = randomUUID(), other = randomUUID();
const account = "synthetic-blink-btc-wallet";
const request: EvidenceRequest = { kind: "lightning", provider: "blink", account };
let records: Map<string, any>, chain: Map<string, { hex: string; observed: boolean }>;
let reader: WithdrawalEvidenceReader;
let sequence = 0;
function invoice() {
  const preimage = (++sequence).toString(16).padStart(64, "0");
  const paymentHash = createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
  const bolt11 = bech32.encode("lnbc1u", [
    ...Array(7).fill(0), 1, 1, 20, ...bech32.toWords(Buffer.from(paymentHash, "hex")), ...Array(104).fill(0),
  ], 20000);
  return { preimage, paymentHash, bolt11 };
}
async function obligation(status = "unknown", queued = true, amount = "100") {
  const inv = invoice();
  const id = (await pool.query(`INSERT INTO lightning_transactions
    (user_id,type,amount_sats,status,payment_request,payment_hash,spectral_sig,memo)
    VALUES($1,'withdrawal',$2,$3,$4,$5,'original-signature','original-memo') RETURNING id`,
  [user, amount, queued ? "queued" : status, inv.bolt11, inv.paymentHash])).rows[0].id;
  let queueId: number | undefined;
  if (queued) queueId = (await pool.query(`INSERT INTO lightning_payment_queue
    (user_id,tx_id,invoice,amount_sats,status,attempts) VALUES($1,$2,$3,$4,$5,1) RETURNING id`,
  [user, id, inv.bolt11, amount, status])).rows[0].id;
  records.set(inv.paymentHash, {
    provider: "blink", account, reference: `outgoing-${sequence}`, direction: "SEND",
    invoice: inv.bolt11, paymentHash: inv.paymentHash, amountSats: amount,
    outcome: "paid", definitive: false, preimage: inv.preimage,
  });
  return { target: { kind: "lightning", transactionId: id, ...(queueId ? { queueId } : {}) } as WithdrawalTarget, inv };
}
async function approve(target: WithdrawalTarget, req = request, overrides: Record<string, unknown> = {}) {
  const inspected = await inspectWithdrawal(pool, target, req, reader);
  const id = randomUUID(), key = `reconcile-${randomUUID()}`;
  const plan = { reconciliationKey: key, target, request: req,
    snapshotHash: inspected.snapshotHash, proofHash: inspected.proofHash,
    reason: "Synthetic independently reviewed outgoing provider evidence",
    expiresAt: "2099-01-01T00:00:00.000Z", ...overrides };
  await pool.query(`INSERT INTO audit_logs(id,user_id,action,resource,resource_id,details,status)
    VALUES($1,$2,'withdrawal_reconciliation_approved','withdrawal',$3,$4,'success')`,
  [id, founder, String(target.transactionId), JSON.stringify(plan)]);
  return { id, key, plan };
}
const apply = (approval: { id: string; key: string }, kind: "lightning" | "bitcoin" = "lightning") =>
  applyWithdrawalReconciliation(pool, approval.id, approval.key, kind, reader);
async function wallet() {
  return (await pool.query("SELECT sats_balance::text,total_withdrawn::text FROM lightning_wallets WHERE user_id=$1", [user])).rows[0];
}
async function status(target: WithdrawalTarget) {
  return (await pool.query("SELECT status FROM lightning_transactions WHERE id=$1", [target.transactionId])).rows[0].status;
}
async function auditCount() {
  return (await pool.query("SELECT count(*)::int AS n FROM audit_logs WHERE action='withdrawal_reconciliation_applied'")).rows[0].n;
}
function reject(inv: ReturnType<typeof invoice>) {
  const record = records.get(inv.paymentHash);
  delete record.preimage; record.outcome = "rejected"; record.definitive = true;
}
beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "withdrawal-reconcile-pg-"));
  execFileSync("initdb", ["-D", join(directory, "data"), "-A", "trust", "--no-locale", "-U", userInfo().username], { stdio: "pipe" });
  execFileSync("pg_ctl", ["-D", join(directory, "data"), "-l", join(directory, "postgres.log"),
    "-o", `-h '' -k ${directory} -p 55443 -c max_connections=20`, "-w", "start"], { stdio: "pipe" });
  started = true;
  pool = new pg.Pool({ host: directory, port: 55443, user: userInfo().username, database: "postgres", password: "", max: 10 });
  await pool.query(`
    CREATE TABLE users(id text PRIMARY KEY,username text,role text,is_active boolean,withdrawals_blocked boolean);
    CREATE TABLE lightning_wallets(id serial PRIMARY KEY,user_id text UNIQUE,sats_balance bigint,total_deposited bigint,
      total_withdrawn bigint,updated_at timestamp DEFAULT now());
    CREATE TABLE lightning_transactions(id serial PRIMARY KEY,user_id text,type text,amount_sats bigint,status text,
      payment_request text,payment_hash text,btc_address text,btc_txid text,lnbits_payment_id text,
      memo text,spectral_sig text,completed_at timestamp,created_at timestamp DEFAULT now());
    CREATE TABLE lightning_payment_queue(id serial PRIMARY KEY,user_id text,tx_id integer,invoice text,amount_sats bigint,
      status text,attempts integer,last_error text,paid_at timestamp,created_at timestamp DEFAULT now());
    CREATE TABLE audit_logs(id text PRIMARY KEY,user_id text,action text,resource text,resource_id text,details jsonb,status text);
  `);
});
afterAll(async () => {
  await pool?.end();
  if (started) execFileSync("pg_ctl", ["-D", join(directory, "data"), "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
  if (directory) rmSync(directory, { recursive: true, force: true });
});
beforeEach(async () => {
  await pool.query("TRUNCATE users,lightning_wallets,lightning_transactions,lightning_payment_queue,audit_logs RESTART IDENTITY");
  await pool.query(`INSERT INTO users VALUES($1,'Nexus','admin',true,false),($2,'fixture','user',false,true),($3,'other','admin',true,false);
    `, [founder, user, other]);
  await pool.query(`INSERT INTO lightning_wallets(user_id,sats_balance,total_deposited,total_withdrawn)
    VALUES($1,9007199254740993,9007199254741993,1000)`, [user]);
  records = new Map(); chain = new Map();
  reader = {
    outgoingLightning: vi.fn(async (_a, h) => structuredClone(records.get(h))),
    bitcoinTransaction: vi.fn(async txid => {
      const result = chain.get(txid); if (!result) throw new Error("Provider timeout or not found");
      return result;
    }),
  };
});

describe("approved outgoing Lightning reconciliation", () => {
  it("records proof and completion atomically, preserves balances/signatures/restrictions, and replays without a provider call", async () => {
    const { target } = await obligation("processing"), approval = await approve(target), before = await wallet();
    expect(await reconcileLegacyLightningWithdrawal(pool, approval.id, approval.key, reader)).toEqual({ status: "applied" });
    expect(await status(target)).toBe("completed");
    expect(await wallet()).toEqual(before);
    const audit = (await pool.query("SELECT details FROM audit_logs WHERE action='withdrawal_reconciliation_applied'")).rows[0].details;
    expect(audit.proof.identity).toMatch(/^ln:[a-f0-9]{64}$/);
    expect(JSON.stringify(audit)).not.toContain("preimage");
    expect((await pool.query("SELECT spectral_sig,memo FROM lightning_transactions WHERE id=$1", [target.transactionId])).rows[0])
      .toEqual({ spectral_sig: "original-signature", memo: "original-memo" });
    expect((await pool.query("SELECT is_active,withdrawals_blocked FROM users WHERE id=$1", [user])).rows[0])
      .toEqual({ is_active: false, withdrawals_blocked: true });
    await pool.query("UPDATE lightning_wallets SET sats_balance=sats_balance+7 WHERE user_id=$1", [user]);
    vi.mocked(reader.outgoingLightning).mockRejectedValue(new Error("offline"));
    expect(await apply(approval)).toEqual({ status: "already_applied" });
    expect(await auditCount()).toBe(1);
  });
  it("supports a historical processing withdrawal without an outbox row", async () => {
    const { target } = await obligation("processing", false);
    await apply(await approve(target));
    expect(await status(target)).toBe("completed");
  });
  it.each(["paid", "rejected"])("rejects a queue-less stored hash conflict for a %s outcome without resolving or refunding it", async outcome => {
    const { target, inv } = await obligation("processing", false);
    if (outcome === "rejected") reject(inv);
    const approval = await approve(target), before = await wallet();
    await pool.query("UPDATE lightning_transactions SET payment_hash=$1 WHERE id=$2", ["f".repeat(64), target.transactionId]);
    const callsBefore = vi.mocked(reader.outgoingLightning).mock.calls.length;
    await expect(inspectWithdrawal(pool, target, request, reader)).rejects.toThrow("payment hash conflicts");
    expect(vi.mocked(reader.outgoingLightning).mock.calls.length).toBe(callsBefore);
    // Even an approval bound to the inconsistent snapshot must fail on identity,
    // not merely on stale-snapshot detection.
    const snapshot = {
      transaction: (await pool.query("SELECT * FROM lightning_transactions WHERE id=$1", [target.transactionId])).rows[0],
      queue: [],
    };
    approval.plan.snapshotHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
    await pool.query("UPDATE audit_logs SET details=$1 WHERE id=$2", [JSON.stringify(approval.plan), approval.id]);
    await expect(apply(approval)).rejects.toThrow("payment hash conflicts");
    expect(await wallet()).toEqual(before);
    expect(await status(target)).toBe("processing");
    expect((await pool.query("SELECT payment_hash FROM lightning_transactions WHERE id=$1", [target.transactionId])).rows[0].payment_hash).toBe("f".repeat(64));
    expect((await pool.query("SELECT count(*)::int AS n FROM lightning_transactions WHERE type='withdrawal_refund'")).rows[0].n).toBe(0);
    expect(await auditCount()).toBe(0);
  });
  it.each(["200", "50", "0", "-100"])("refuses an inconsistent %s-sat batch leg at inspection and application without a refund", async amount => {
    const { target, inv } = await obligation(); reject(inv);
    const approval = await approve(target), before = await wallet();
    await pool.query("UPDATE lightning_payment_queue SET amount_sats=$1 WHERE id=$2", [amount, target.queueId]);
    records.get(inv.paymentHash).amountSats = amount;
    await expect(inspectWithdrawal(pool, target, request, reader)).rejects.toThrow();
    await expect(apply(approval)).rejects.toThrow();
    expect(await wallet()).toEqual(before);
    expect(await status(target)).toBe("queued");
    expect((await pool.query("SELECT status FROM lightning_payment_queue WHERE id=$1", [target.queueId])).rows[0].status).toBe("unknown");
    expect((await pool.query("SELECT count(*)::int AS n FROM lightning_transactions WHERE type='withdrawal_refund'")).rows[0].n).toBe(0);
    expect(await auditCount()).toBe(0);
  });
  it("includes paid and refunded siblings when verifying the complete batch reservation", async () => {
    const { target, inv } = await obligation(); reject(inv);
    const approval = await approve(target), before = await wallet();
    await pool.query(`INSERT INTO lightning_payment_queue(user_id,tx_id,invoice,amount_sats,status,attempts)
      VALUES($1,$2,$3,100,'paid',1),($1,$2,$4,100,'refunded',1)`,
    [user, target.transactionId, invoice().bolt11, invoice().bolt11]);
    await expect(inspectWithdrawal(pool, target, request, reader)).rejects.toThrow("Batch amounts do not match");
    await expect(apply(approval)).rejects.toThrow("Batch amounts do not match");
    expect(await wallet()).toEqual(before); expect(await auditCount()).toBe(0);
  });
  it.each(["direction", "account", "invoice", "paymentHash", "amountSats", "preimage"])("rejects mismatched %s before any state change", async field => {
    const { target, inv } = await obligation(), approval = await approve(target), before = await wallet();
    records.get(inv.paymentHash)[field] = {
      direction: "RECEIVE", account: "wrong-wallet", invoice: invoice().bolt11,
      paymentHash: "f".repeat(64), amountSats: "101", preimage: "0".repeat(64),
    }[field as "direction"];
    await expect(apply(approval)).rejects.toThrow();
    expect(await wallet()).toEqual(before);
    expect(await status(target)).toBe("queued"); expect(await auditCount()).toBe(0);
  });
  it.each(["timeout", "pending", "missing", "not-definitive"])("keeps %s evidence reserved and never resends", async kind => {
    const { target, inv } = await obligation(), approval = await approve(target), before = await wallet();
    if (kind === "timeout") vi.mocked(reader.outgoingLightning).mockRejectedValue(new Error("timeout"));
    if (kind === "pending") records.get(inv.paymentHash).outcome = "pending";
    if (kind === "missing") records.delete(inv.paymentHash);
    if (kind === "not-definitive") { reject(inv); records.get(inv.paymentHash).definitive = false; }
    await expect(apply(approval)).rejects.toThrow();
    const send = vi.fn();
    await processLegacyLightningQueue(pool, send, async () => false, target.transactionId);
    expect(send).not.toHaveBeenCalled(); expect(await wallet()).toEqual(before);
    expect((await pool.query("SELECT status,attempts FROM lightning_payment_queue")).rows[0]).toEqual({ status: "unknown", attempts: 1 });
  });
  it("refunds only the explicitly rejected batch leg, leaving paid and ambiguous legs untouched", async () => {
    const { target, inv } = await obligation();
    const second = invoice(), third = invoice();
    await pool.query(`UPDATE lightning_transactions SET amount_sats=300 WHERE id=$1;
      `, [target.transactionId]);
    await pool.query(`INSERT INTO lightning_payment_queue(user_id,tx_id,invoice,amount_sats,status,attempts)
      VALUES($1,$2,$3,100,'paid',1),($1,$2,$4,100,'unknown',1)`,
    [user, target.transactionId, second.bolt11, third.bolt11]);
    reject(inv);
    await apply(await approve(target));
    expect(await wallet()).toEqual({ sats_balance: "9007199254741093", total_withdrawn: "900" });
    expect(await status(target)).toBe("queued");
    const thirdId = (await pool.query("SELECT id FROM lightning_payment_queue WHERE invoice=$1", [third.bolt11])).rows[0].id;
    records.set(third.paymentHash, { ...records.get(inv.paymentHash), reference: "third-proof", invoice: third.bolt11, paymentHash: third.paymentHash });
    await apply(await approve({ ...target, queueId: thirdId }));
    expect(await status(target)).toBe("partially_refunded");
    expect(await auditCount()).toBe(2);
    expect((await pool.query("SELECT count(*)::int AS n FROM lightning_transactions WHERE type='withdrawal_refund'")).rows[0].n).toBe(2);
  });
  it("finishes an all-paid batch only after every ambiguous leg has matching proof", async () => {
    const first = await obligation(), second = await obligation();
    await pool.query("UPDATE lightning_payment_queue SET tx_id=$1 WHERE id=$2", [first.target.transactionId, second.target.queueId]);
    await pool.query("DELETE FROM lightning_transactions WHERE id=$1", [second.target.transactionId]);
    await pool.query("UPDATE lightning_transactions SET amount_sats=200 WHERE id=$1", [first.target.transactionId]);
    await apply(await approve(first.target));
    expect(await status(first.target)).toBe("queued");
    await apply(await approve({ ...first.target, queueId: second.target.queueId }));
    expect(await status(first.target)).toBe("completed");
  });
  it("serializes competing reconcilers and refunds once", async () => {
    const { target, inv } = await obligation(); reject(inv);
    const a = await approve(target), b = await approve(target);
    const results = await Promise.allSettled([apply(a), apply(b), apply(a)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(2);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    expect(await wallet()).toEqual({ sats_balance: "9007199254741093", total_withdrawn: "900" });
    expect(await auditCount()).toBe(1);
    expect(await status(target)).toBe("refunded");
  });
  it("refuses to refund a rejection that also carries settlement evidence", async () => {
    const { target, inv } = await obligation(); reject(inv);
    const approval = await approve(target), before = await wallet();
    records.get(inv.paymentHash).preimage = inv.preimage;
    await expect(apply(approval)).rejects.toThrow("contradictory");
    expect(await wallet()).toEqual(before); expect(await auditCount()).toBe(0);
  });
  it.each(["audit", "refund-ledger"])("rolls back state, refund and proof if the %s write fails", async failing => {
    const { target, inv } = await obligation(); reject(inv);
    const approval = await approve(target), before = await wallet();
    const table = failing === "audit" ? "audit_logs" : "lightning_transactions";
    const check = failing === "audit" ? "action <> 'withdrawal_reconciliation_applied'" : "type <> 'withdrawal_refund'";
    await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT fixture_failure CHECK(${check})`);
    try {
      await expect(apply(approval)).rejects.toThrow();
      expect(await wallet()).toEqual(before); expect(await auditCount()).toBe(0);
      expect((await pool.query("SELECT status FROM lightning_payment_queue")).rows[0].status).toBe("unknown");
      expect((await pool.query("SELECT count(*)::int AS n FROM lightning_transactions WHERE type='withdrawal_refund'")).rows[0].n).toBe(0);
    } finally { await pool.query(`ALTER TABLE ${table} DROP CONSTRAINT fixture_failure`); }
    await apply(approval); expect(await auditCount()).toBe(1);
  });
  it("rolls a paid parent/queue transition back when recording proof fails", async () => {
    const { target } = await obligation(), approval = await approve(target);
    await pool.query("ALTER TABLE audit_logs ADD CONSTRAINT fixture_failure CHECK(action<>'withdrawal_reconciliation_applied')");
    try {
      await expect(apply(approval)).rejects.toThrow();
      expect(await status(target)).toBe("queued");
      expect((await pool.query("SELECT status FROM lightning_payment_queue")).rows[0].status).toBe("unknown");
    } finally { await pool.query("ALTER TABLE audit_logs DROP CONSTRAINT fixture_failure"); }
  });
  it.each(["snapshot", "proof", "expiry", "founder", "key", "resource", "kind"])("refuses stale or invalid %s approval", async failure => {
    const { target, inv } = await obligation(), approval = await approve(target);
    if (failure === "snapshot") await pool.query("UPDATE lightning_transactions SET amount_sats=101 WHERE id=$1", [target.transactionId]);
    if (failure === "proof") records.get(inv.paymentHash).reference = "changed-outgoing-reference";
    if (failure === "expiry") await pool.query(`UPDATE audit_logs SET details=jsonb_set(details,'{expiresAt}','"2020-01-01T00:00:00.000Z"')`);
    if (failure === "founder") await pool.query("UPDATE audit_logs SET user_id=$1", [other]);
    if (failure === "key") approval.key = "wrong-confirmation";
    if (failure === "resource") await pool.query("UPDATE audit_logs SET resource_id='999999'");
    await expect(apply(approval, failure === "kind" ? "bitcoin" : "lightning")).rejects.toThrow();
    expect(await auditCount()).toBe(0);
  });
  it("refuses queued, terminal and deposit records rather than fabricating a reservation", async () => {
    for (const state of ["queued", "completed", "failed", "refunded"]) {
      const { target } = await obligation(state);
      await expect(inspectWithdrawal(pool, target, request, reader)).rejects.toThrow("not reserved");
    }
    const { target } = await obligation();
    await pool.query("UPDATE lightning_transactions SET type='deposit' WHERE id=$1", [target.transactionId]);
    await expect(inspectWithdrawal(pool, target, request, reader)).rejects.toThrow("Withdrawal not found");
  });
  it("rejects duplicate historical outgoing identities across users and parents", async () => {
    const { target, inv } = await obligation(), approval = await approve(target);
    await pool.query(`INSERT INTO lightning_transactions(user_id,type,amount_sats,status,payment_hash)
      VALUES($1,'withdrawal',100,'completed',$2)`, [other, inv.paymentHash]);
    await expect(apply(approval)).rejects.toThrow("shared by another");
  });
});

function broadcast() {
  const service = payments.p2wpkh({ hash: Buffer.alloc(20, 1) });
  const destination = payments.p2wpkh({ hash: Buffer.alloc(20, 2) }).address!;
  const previous = new Transaction();
  previous.addInput(Buffer.alloc(32, 1), 0); previous.addOutput(service.output!, 1000n);
  const tx = new Transaction();
  tx.addInput(Buffer.from(previous.getId(), "hex").reverse(), 0);
  tx.addOutput(address.toOutputScript(destination, networks.bitcoin), 100n);
  tx.addOutput(service.output!, 800n);
  chain.set(previous.getId(), { hex: previous.toHex(), observed: true });
  chain.set(tx.getId(), { hex: tx.toHex(), observed: true });
  return { tx, previous, destination, request: {
    kind: "bitcoin", provider: "esplora", account: Buffer.from(service.output!).toString("hex"), txid: tx.getId(), vout: 0,
  } as EvidenceRequest };
}
async function btcObligation(b = broadcast()) {
  const id = (await pool.query(`INSERT INTO lightning_transactions(user_id,type,amount_sats,status,btc_address,spectral_sig)
    VALUES($1,'withdrawal',100,'processing',$2,'btc-original-signature') RETURNING id`, [user, b.destination])).rows[0].id;
  return { ...b, target: { kind: "bitcoin", transactionId: id } as WithdrawalTarget };
}
describe("approved outgoing broadcast reconciliation", () => {
  it("verifies txid, service inputs and exact output, records proof once, and never changes the balance", async () => {
    const b = await btcObligation(), approval = await approve(b.target, b.request), before = await wallet();
    expect(await apply(approval, "bitcoin")).toEqual({ status: "applied" });
    expect(await apply(approval, "bitcoin")).toEqual({ status: "already_applied" });
    expect(await wallet()).toEqual(before);
    expect((await pool.query("SELECT status,btc_txid,spectral_sig FROM lightning_transactions")).rows[0])
      .toEqual({ status: "completed", btc_txid: b.tx.getId(), spectral_sig: "btc-original-signature" });
    expect(await auditCount()).toBe(1);
  });
  it.each(["timeout", "not-observed", "raw-tx", "prevout", "source", "destination", "amount", "known-txid"])("rejects %s without a refund or terminal transition", async kind => {
    const b = await btcObligation(), approval = await approve(b.target, b.request), before = await wallet();
    if (kind === "timeout") chain.clear();
    if (kind === "not-observed") chain.get(b.tx.getId())!.observed = false;
    if (kind === "raw-tx") chain.get(b.tx.getId())!.hex = b.previous.toHex();
    if (kind === "prevout") chain.get(b.previous.getId())!.hex = b.tx.toHex();
    if (kind === "source") {
      approval.plan.request = { ...b.request, account: "0014" + "ff".repeat(20) };
      await pool.query("UPDATE audit_logs SET details=$1 WHERE id=$2", [JSON.stringify(approval.plan), approval.id]);
    }
    if (kind === "destination") await pool.query("UPDATE lightning_transactions SET btc_address=$1", [payments.p2wpkh({ hash: Buffer.alloc(20, 3) }).address]);
    if (kind === "amount") await pool.query("UPDATE lightning_transactions SET amount_sats=101");
    if (kind === "known-txid") await pool.query("UPDATE lightning_transactions SET btc_txid=$1", ["f".repeat(64)]);
    await expect(apply(approval, "bitcoin")).rejects.toThrow();
    expect(await wallet()).toEqual(before); expect(await status(b.target)).toBe("processing");
    expect(await auditCount()).toBe(0);
  });
  it("does not allow the same output to resolve a different obligation", async () => {
    const b = await btcObligation(), a = await approve(b.target, b.request);
    await apply(a, "bitcoin");
    const second = await btcObligation(b), otherApproval = await approve(second.target, second.request);
    await expect(apply(otherApproval, "bitcoin")).rejects.toThrow("already used");
    expect(await status(second.target)).toBe("processing"); expect(await auditCount()).toBe(1);
  });
  it("rolls back an on-chain terminal transition if proof recording fails", async () => {
    const b = await btcObligation(), approval = await approve(b.target, b.request);
    await pool.query("ALTER TABLE audit_logs ADD CONSTRAINT fixture_failure CHECK(action<>'withdrawal_reconciliation_applied')");
    try {
      await expect(apply(approval, "bitcoin")).rejects.toThrow();
      expect((await pool.query("SELECT status,btc_txid FROM lightning_transactions")).rows[0]).toEqual({ status: "processing", btc_txid: null });
    } finally { await pool.query("ALTER TABLE audit_logs DROP CONSTRAINT fixture_failure"); }
  });
  it.each(["amount", "destination", "output", "script", "txid"])("directly refuses a nonmatching broadcast %s at inspection", async mismatch => {
    const b = await btcObligation();
    const req = { ...b.request } as Extract<EvidenceRequest, { kind: "bitcoin" }>;
    if (mismatch === "amount") await pool.query("UPDATE lightning_transactions SET amount_sats=101");
    if (mismatch === "destination") await pool.query("UPDATE lightning_transactions SET btc_address=$1", [payments.p2wpkh({ hash: Buffer.alloc(20, 3) }).address]);
    if (mismatch === "output") req.vout = 1;
    if (mismatch === "script") req.account = "0014" + "ff".repeat(20);
    if (mismatch === "txid") await pool.query("UPDATE lightning_transactions SET btc_txid=$1", ["f".repeat(64)]);
    await expect(inspectWithdrawal(pool, b.target, req, reader)).rejects.toThrow(/mismatch|not verified/);
    expect(await status(b.target)).toBe("processing"); expect(await auditCount()).toBe(0);
  });
});

describe("read-only provider boundaries", () => {
  it("extracts the original hash and refuses malformed or non-mainnet invoices", () => {
    const inv = invoice();
    expect(invoicePaymentHash(inv.bolt11.toUpperCase())).toBe(inv.paymentHash);
    expect(() => invoicePaymentHash(inv.bolt11.slice(0, -1) + "x")).toThrow();
    expect(() => invoicePaymentHash(bech32.encode("lntb1u", bech32.decode(inv.bolt11, 20000).words, 20000))).toThrow();
  });
  it("uses SEND transaction records only; an incoming SUCCESS cannot resolve an outgoing obligation", async () => {
    const { target, inv } = await obligation();
    const http = vi.fn(async () => new Response(JSON.stringify({ data: { me: { defaultAccount: { walletById: {
      id: account, walletCurrency: "BTC", transactionsByPaymentHash: [
        { id: "incoming", direction: "RECEIVE", status: "SUCCESS", settlementAmount: 100,
          initiationVia: { paymentHash: inv.paymentHash, paymentRequest: inv.bolt11 }, settlementVia: { preImage: inv.preimage } },
      ],
    } } } } })));
    const actualReader = createWithdrawalEvidenceReader(() => "synthetic-credential", http as typeof fetch);
    await expect(inspectWithdrawal(pool, target, request, actualReader)).rejects.toThrow("Unique outgoing");
    const body = JSON.parse(http.mock.calls[0][1]!.body as string);
    expect(body.query).toContain("transactionsByPaymentHash");
    expect(body.query).not.toMatch(/\bmutation\b|lnInvoicePaymentStatus|lnInvoicePaymentSend/);
  });
  it("normalizes an authenticated BTC outgoing success and validates its preimage end-to-end", async () => {
    const { target, inv } = await obligation();
    const http = vi.fn(async () => new Response(JSON.stringify({ data: { me: { defaultAccount: { walletById: {
      id: account, walletCurrency: "BTC", transactionsByPaymentHash: [
        { id: "outgoing-verified", direction: "SEND", status: "SUCCESS", settlementAmount: -100,
          initiationVia: { paymentHash: inv.paymentHash, paymentRequest: inv.bolt11 }, settlementVia: { preImage: inv.preimage } },
      ],
    } } } } })));
    const actualReader = createWithdrawalEvidenceReader(() => "synthetic-credential", http as typeof fetch);
    const proof = await inspectWithdrawal(pool, target, request, actualReader);
    expect(proof.proof.paymentHash).toBe(inv.paymentHash);
    expect(JSON.stringify(proof)).not.toContain(inv.preimage);
  });
});

// Exercise the real adapters through inspection AND founder-approved application,
// against the same disposable socket-only cluster as the ledger/locking tests.
const addedProviders = ["coinos", "alby", "lnbits"] as const;
type AddedProvider = typeof addedProviders[number];
function providerFixture(provider: AddedProvider, inv: ReturnType<typeof invoice>) {
  const base = "https://lnbits.fixture.invalid";
  const req: EvidenceRequest = { kind: "lightning", provider,
    account: provider === "lnbits" ? `${base}#fixture-wallet` : "fixture-account" };
  const me: any = { id: req.account, identifier: req.account };
  const record: any = provider === "coinos"
    ? { id: "outgoing-record", type: "lightning", hash: inv.bolt11, amount: -100,
      ref: inv.preimage, confirmed: true, tip: 0, fee: 7, ourfee: 2 }
    : provider === "alby"
      ? { identifier: "outgoing-record", type: "outgoing", currency: "btc", amount: 100, value: 100,
        payment_hash: inv.paymentHash, r_hash_str: inv.paymentHash, payment_request: inv.bolt11,
        preimage: inv.preimage, settled: true, state: "SETTLED", fee: 7 }
      : { paid: true, preimage: inv.preimage, details: { wallet_id: "fixture-wallet", checking_id: "outgoing-record",
        amount: -100000, fee: -7000, payment_hash: inv.paymentHash, bolt11: inv.bolt11,
        preimage: inv.preimage, status: "success" } };
  const data = { code: 200, offline: false, records: [record], record, me };
  const http = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    if (data.offline) throw new Error("Synthetic timeout");
    const url = new URL(String(input));
    expect(init?.method).toBe("GET");
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeDefined();
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toEqual(provider === "lnbits"
      ? { "X-Api-Key": "synthetic-read-key" } : { Authorization: "Bearer synthetic-read-token" });
    expect(url.origin).toBe({ coinos: "https://coinos.io", alby: "https://api.getalby.com", lnbits: base }[provider]);
    expect(url.pathname).not.toMatch(/\/invoice\/|\/incoming|\/send|\/settle|\/cancel/);
    const body = url.pathname.endsWith("/me") ? data.me
      : provider === "coinos" ? { payments: data.records } : data.record;
    return new Response(JSON.stringify(body), { status: data.code });
  });
  const actual = createWithdrawalEvidenceReader(() => { throw new Error("Wrong provider dispatched"); }, http as typeof fetch, {
    coinosToken: () => "synthetic-read-token", albyToken: () => "synthetic-read-token",
    lnbits: () => ({ url: base, invoiceKey: "synthetic-read-key" }),
  });
  return { req, data, http, actual, record, me };
}

describe.each(addedProviders)("%s authenticated outgoing evidence", provider => {
  it("resolves a reviewed payment once without changing funds or release holds, or retaining credentials/preimages", async () => {
    const { target, inv } = await obligation(), f = providerFixture(provider, inv);
    reader = f.actual;
    const approval = await approve(target, f.req), before = await wallet();
    expect(await apply(approval)).toEqual({ status: "applied" });
    expect(await status(target)).toBe("completed");
    expect(await wallet()).toEqual(before);
    expect((await pool.query("SELECT status,attempts FROM lightning_payment_queue")).rows[0])
      .toEqual({ status: "paid", attempts: 1 });
    expect((await pool.query("SELECT is_active,withdrawals_blocked FROM users WHERE id=$1", [user])).rows[0])
      .toEqual({ is_active: false, withdrawals_blocked: true });
    const audit = (await pool.query("SELECT details FROM audit_logs WHERE action='withdrawal_reconciliation_applied'")).rows[0].details;
    expect(audit.proof.provider).toBe(provider);
    expect(audit.proof.account).toBe(f.req.account);
    expect(JSON.stringify(audit)).not.toMatch(/synthetic-read|preimage/);
    expect(JSON.stringify(audit)).not.toContain(inv.preimage);
    const calls = f.http.mock.calls.length;
    f.data.offline = true;
    expect(await apply(approval)).toEqual({ status: "already_applied" });
    expect(f.http).toHaveBeenCalledTimes(calls);
    expect(await auditCount()).toBe(1);
  });

  it.each(["account", "direction", "invoice", "hash", "amount", "unsafe-amount", "fractional-amount",
    "preimage", "pending", "missing", "timeout", "http-error", "reference"])(
    "keeps the original reservation and approval intact on %s evidence", async mismatch => {
      const { target, inv } = await obligation(), f = providerFixture(provider, inv);
      reader = f.actual;
      const approval = await approve(target, f.req), before = await wallet();
      const tx = provider === "lnbits" ? f.record.details : f.record;
      if (mismatch === "account") {
        if (provider === "lnbits") tx.wallet_id = "other-wallet";
        else { f.me.id = "other-account"; f.me.identifier = "other-account"; }
      }
      if (mismatch === "direction") {
        if (provider === "coinos" || provider === "lnbits") tx.amount = Math.abs(tx.amount);
        else tx.type = "incoming";
      }
      if (mismatch === "invoice") {
        const decoded = bech32.decode(inv.bolt11, 20000);
        decoded.words[0] = 1; // Different exact invoice, same payment hash.
        tx[{ coinos: "hash", alby: "payment_request", lnbits: "bolt11" }[provider]] =
          bech32.encode(decoded.prefix, decoded.words, 20000);
      }
      if (mismatch === "hash") {
        if (provider === "coinos") tx.hash = invoice().bolt11;
        else tx.payment_hash = "f".repeat(64);
      }
      if (mismatch === "amount") tx.amount += provider === "lnbits" ? -1000 : provider === "coinos" ? -1 : 1;
      if (mismatch === "unsafe-amount") tx.amount = provider === "alby" ? Number.MAX_SAFE_INTEGER + 1 : -Number.MAX_SAFE_INTEGER - 1;
      if (mismatch === "fractional-amount") tx.amount += 0.5;
      if (provider === "alby" && ["amount", "unsafe-amount", "fractional-amount"].includes(mismatch)) tx.value = tx.amount;
      if (mismatch === "preimage") {
        if (provider === "coinos") tx.ref = "0".repeat(64);
        else { tx.preimage = "0".repeat(64); if (provider === "lnbits") f.record.preimage = tx.preimage; }
      }
      if (mismatch === "pending") {
        if (provider === "coinos") tx.confirmed = false;
        if (provider === "alby") { tx.state = "CREATED"; tx.settled = false; }
        if (provider === "lnbits") { tx.status = "pending"; f.record.paid = false; }
      }
      if (mismatch === "missing") {
        if (provider === "coinos") f.data.records = [];
        else f.data.code = 404;
      }
      if (mismatch === "timeout") f.data.offline = true;
      if (mismatch === "http-error") f.data.code = 401;
      if (mismatch === "reference") tx[provider === "lnbits" ? "checking_id" : provider === "alby" ? "identifier" : "id"] = "changed-reference";
      await expect(apply(approval)).rejects.toThrow();
      expect(await wallet()).toEqual(before);
      expect(await auditCount()).toBe(0);
      expect((await pool.query("SELECT status,attempts FROM lightning_payment_queue")).rows[0])
        .toEqual({ status: "unknown", attempts: 1 });
      expect(await status(target)).toBe("queued");
      const send = vi.fn();
      await processLegacyLightningQueue(pool, send, async () => false, target.transactionId);
      expect(send).not.toHaveBeenCalled();
      expect((await pool.query("SELECT count(*)::int AS n FROM lightning_transactions WHERE type='withdrawal_refund'")).rows[0].n).toBe(0);
    });
  it("binds the reviewed provider as well as account and proof", async () => {
    const { target, inv } = await obligation(), f = providerFixture(provider, inv);
    reader = f.actual;
    const approval = await approve(target, f.req);
    const verified = await f.actual.outgoingLightning(f.req.account, inv.paymentHash, provider) as Record<string, unknown>;
    reader = { ...f.actual, outgoingLightning: async () => ({ ...verified, provider: "blink" }) };
    await expect(apply(approval)).rejects.toThrow("evidence mismatch");
    expect(await auditCount()).toBe(0);
  });
  it("rolls back the payment transition when the audit write fails", async () => {
    const { target, inv } = await obligation(), f = providerFixture(provider, inv);
    reader = f.actual;
    const approval = await approve(target, f.req), before = await wallet();
    await pool.query("ALTER TABLE audit_logs ADD CONSTRAINT fixture_failure CHECK(action<>'withdrawal_reconciliation_applied')");
    try {
      await expect(apply(approval)).rejects.toThrow();
      expect(await wallet()).toEqual(before); expect(await auditCount()).toBe(0);
      expect((await pool.query("SELECT status FROM lightning_payment_queue")).rows[0].status).toBe("unknown");
    } finally { await pool.query("ALTER TABLE audit_logs DROP CONSTRAINT fixture_failure"); }
  });
});

describe("provider-specific terminal semantics", () => {
  it.each(addedProviders)("refuses a forged definitive %s rejection even at the trusted reader boundary", async provider => {
    const { target, inv } = await obligation();
    const record = records.get(inv.paymentHash);
    Object.assign(record, { provider, outcome: "rejected", definitive: true });
    delete record.preimage;
    const before = await wallet();
    await expect(inspectWithdrawal(pool, target, { ...request, provider }, reader)).rejects.toThrow("does not support definitive");
    expect(await wallet()).toEqual(before); expect(await auditCount()).toBe(0);
  });
  it.each(["coinos", "alby"] as const)("%s cannot refund an undocumented failed, expired or unsettled send", async provider => {
    const { target, inv } = await obligation(), f = providerFixture(provider, inv);
    reader = f.actual;
    const approval = await approve(target, f.req), before = await wallet();
    f.record.confirmed = false; f.record.state = "FAILED"; f.record.settled = false;
    delete f.record.ref; delete f.record.preimage;
    await expect(apply(approval)).rejects.toThrow();
    expect(await wallet()).toEqual(before); expect(await auditCount()).toBe(0);
  });
  it("keeps a cached LNbits failed outgoing record reserved without refunding, even on concurrent application", async () => {
    const { target, inv } = await obligation(), f = providerFixture("lnbits", inv);
    reader = f.actual;
    const approval = await approve(target, f.req), before = await wallet();
    Object.assign(f.record, { paid: false, status: "failed", preimage: null });
    Object.assign(f.record.details, { status: "failed", preimage: null });
    const results = await Promise.allSettled([apply(approval), apply(approval)]);
    expect(results.every(r => r.status === "rejected")).toBe(true);
    expect(await wallet()).toEqual(before);
    expect(await status(target)).toBe("queued");
    expect(await auditCount()).toBe(0);
    expect((await pool.query("SELECT status,attempts FROM lightning_payment_queue")).rows[0])
      .toEqual({ status: "unknown", attempts: 1 });
    expect((await pool.query("SELECT count(*)::int AS n FROM lightning_transactions WHERE type='withdrawal_refund'")).rows[0].n).toBe(0);
    expect((await pool.query("SELECT is_active,withdrawals_blocked FROM users WHERE id=$1", [user])).rows[0])
      .toEqual({ is_active: false, withdrawals_blocked: true });
  });
  it.each(["public-paid", "instance", "millisats", "contradiction", "preimage-on-failure", "old-pending-flag"])(
    "does not trust LNbits %s as outgoing proof", async failure => {
      const { target, inv } = await obligation(), f = providerFixture("lnbits", inv), before = await wallet();
      if (failure === "public-paid") delete f.record.details;
      if (failure === "instance") f.req.account = "https://other.fixture.invalid#fixture-wallet";
      if (failure === "millisats") f.record.details.amount = -100001;
      if (failure === "contradiction") f.record.status = "failed";
      if (failure === "preimage-on-failure") {
        f.record.paid = false; f.record.status = "failed"; f.record.details.status = "failed";
      }
      if (failure === "old-pending-flag") {
        delete f.record.details.status; f.record.details.pending = false; f.record.paid = false;
      }
      await expect(inspectWithdrawal(pool, target, f.req, f.actual)).rejects.toThrow();
      expect(await wallet()).toEqual(before); expect(await auditCount()).toBe(0);
    });
  it.each(["duplicate", "pagination-loop", "non-lightning", "tip", "fake-preimage"])(
    "keeps ambiguous Coinos %s records reserved", async failure => {
      const { target, inv } = await obligation(), f = providerFixture("coinos", inv);
      if (failure === "duplicate") f.data.records.push({ ...f.record, id: "second-attempt" });
      if (failure === "pagination-loop") f.data.records = Array.from({ length: 100 }, (_, i) => ({ ...f.record, id: `record-${i}` }));
      if (failure === "non-lightning") f.record.type = "bitcoin";
      if (failure === "tip") f.record.tip = 1;
      if (failure === "fake-preimage") f.record.ref = randomUUID();
      await expect(inspectWithdrawal(pool, target, f.req, f.actual)).rejects.toThrow();
      expect(await auditCount()).toBe(0);
    });
  it("finds a Coinos outgoing record beyond the first page without interpreting the earlier absence as failure", async () => {
    const { target, inv } = await obligation(), f = providerFixture("coinos", inv);
    const incoming = invoice();
    f.data.records = Array.from({ length: 100 }, (_, i) => ({
      ...f.record, id: `incoming-${i}`, amount: 100, hash: incoming.bolt11,
    }));
    const original = f.http.getMockImplementation()!;
    f.http.mockImplementation(async (input, init) => {
      const response = await original(input, init);
      return new URL(String(input)).searchParams.get("offset") === "100"
        ? new Response(JSON.stringify({ payments: [f.record] })) : response;
    });
    const proof = await inspectWithdrawal(pool, target, f.req, f.actual);
    expect(proof.proof.outcome).toBe("paid");
    expect(f.http.mock.calls.map(([url]) => String(url))).toEqual([
      "https://coinos.io/api/me",
      "https://coinos.io/api/payments?limit=100&offset=0",
      "https://coinos.io/api/payments?limit=100&offset=100",
    ]);
    expect(await status(target)).toBe("queued");
  });
  it("refuses truncated Coinos history even if a settled match is present", async () => {
    const { target, inv } = await obligation(), f = providerFixture("coinos", inv);
    const incoming = invoice(), original = f.http.getMockImplementation()!;
    f.http.mockImplementation(async (input, init) => {
      const response = await original(input, init), url = new URL(String(input));
      if (!url.pathname.endsWith("/payments")) return response;
      const offset = Number(url.searchParams.get("offset"));
      const rows = Array.from({ length: 100 }, (_, i) => ({
        ...f.record, id: `incoming-${offset + i}`, amount: 100, hash: incoming.bolt11,
      }));
      if (offset === 0) rows[0] = f.record;
      return new Response(JSON.stringify({ payments: rows }));
    });
    await expect(inspectWithdrawal(pool, target, f.req, f.actual)).rejects.toThrow("history limit");
    expect(await auditCount()).toBe(0);
  });
  it.each(["http://insecure.fixture.invalid", "https://user:secret@fixture.invalid",
    "https://fixture.invalid?token=not-a-credential", "https://fixture.invalid#other"])(
    "refuses unsafe LNbits configuration before sending the read key", async url => {
      const { target } = await obligation(), http = vi.fn();
      const actual = createWithdrawalEvidenceReader(() => undefined, http as typeof fetch, {
        lnbits: () => ({ url, invoiceKey: "synthetic-read-key" }),
      });
      await expect(inspectWithdrawal(pool, target, { ...request, provider: "lnbits" }, actual)).rejects.toThrow("endpoint");
      expect(http).not.toHaveBeenCalled();
    });
  it("rejects unsupported providers and unavailable credentials before making any request", async () => {
    const { target, inv } = await obligation(), http = vi.fn();
    const actual = createWithdrawalEvidenceReader(() => undefined, http as typeof fetch, {});
    await expect(inspectWithdrawal(pool, target, { ...request, provider: "unknown" } as any, actual)).rejects.toThrow();
    for (const provider of ["blink", ...addedProviders] as const) {
      await expect(actual.outgoingLightning(account, inv.paymentHash, provider)).rejects.toThrow();
    }
    expect(http).not.toHaveBeenCalled();
  });
});
