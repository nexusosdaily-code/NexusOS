import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import pg from "pg";
import * as bitcoin from "bitcoinjs-lib";
import * as secp from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import {
  processBtcWithdrawalQueue, reviewBtcAttempt, type BtcWithdrawalProviders, type ConstructedWithdrawal,
} from "./btc-withdrawal-attempt";
import { inspectWithdrawal, applyWithdrawalReconciliation, type WithdrawalEvidenceReader } from "./withdrawal-reconciliation";

const engine = vi.hoisted(() => ({ wallet: vi.fn(), utxos: vi.fn(), fee: vi.fn() }));
// Never import a real wallet, app startup, environment database or live provider.
vi.mock("./btc-inscription-engine.js", () => ({
  getServiceWallet: engine.wallet, getSafeUTXOs: engine.utxos, getFeeRate: engine.fee,
}));
import { constructBtcWithdrawal } from "./btc-withdrawal-processor";

let pool: pg.Pool, directory: string, started = false;
const user = randomUUID(), founder = randomUUID();
const service = bitcoin.payments.p2wpkh({ hash: Buffer.alloc(20, 1) });
const destination = bitcoin.payments.p2wpkh({ hash: Buffer.alloc(20, 2) }).address!;
let built: ConstructedWithdrawal, previous: bitcoin.Transaction;
let providers: BtcWithdrawalProviders;
const state = async () => (await pool.query("SELECT * FROM lightning_transactions ORDER BY id")).rows[0];
const journal = async () => (await pool.query("SELECT * FROM audit_logs WHERE action='btc_withdrawal_prepared'")).rows;
const wallet = async () => (await pool.query("SELECT * FROM lightning_wallets")).rows;
const run = (p = pool) => processBtcWithdrawalQueue(p, providers);
function fixture() {
  previous = new bitcoin.Transaction();
  previous.addInput(Buffer.alloc(32, 1), 0); previous.addOutput(service.output!, 10000n);
  const tx = new bitcoin.Transaction();
  tx.addInput(Buffer.from(previous.getId(), "hex").reverse(), 0);
  tx.setWitness(0, [Buffer.alloc(64, 1)]);
  tx.addOutput(bitcoin.address.toOutputScript(destination), 1000n);
  tx.addOutput(service.output!, 8900n);
  return { txHex: tx.toHex(), serviceScript: Buffer.from(service.output!).toString("hex"),
    inputs: [{ txid: previous.getId(), vout: 0, valueSats: "10000", script: Buffer.from(service.output!).toString("hex") }] };
}
// Faults cross real PostgreSQL commit boundaries, not a pretend transaction.
function faulty(query: (sql: string, next: () => Promise<any>) => Promise<any>) {
  return { connect: async () => {
    const c = await pool.connect();
    return { release: () => c.release(), query: (sql: string, values?: any[]) => query(sql, () => c.query(sql, values)) };
  } } as unknown as pg.Pool;
}
beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "btc-attempt-pg-"));
  execFileSync("initdb", ["-D", join(directory, "data"), "-A", "trust", "--no-locale", "-U", userInfo().username], { stdio: "pipe" });
  execFileSync("pg_ctl", ["-D", join(directory, "data"), "-l", join(directory, "postgres.log"),
    "-o", `-h '' -k ${directory} -p 55444 -c max_connections=20`, "-w", "start"], { stdio: "pipe" });
  started = true;
  pool = new pg.Pool({ host: directory, port: 55444, user: userInfo().username, database: "postgres", password: "", max: 10 });
  await pool.query(`
    CREATE TABLE users(id text PRIMARY KEY,username text,role text);
    CREATE TABLE lightning_wallets(user_id text,sats_balance bigint,total_withdrawn bigint);
    CREATE TABLE lightning_transactions(id serial PRIMARY KEY,user_id text,type text,amount_sats bigint,status text,
      payment_request text,btc_address text,btc_txid text,payment_hash text,memo text,spectral_sig text,completed_at timestamp);
    CREATE TABLE lightning_payment_queue(id serial PRIMARY KEY,tx_id integer);
    CREATE TABLE audit_logs(id text PRIMARY KEY,user_id text,action text,resource text,resource_id text,details jsonb,status text);
    CREATE TABLE fixture_provider_acceptances(txid text);
  `);
});
afterAll(async () => {
  await pool?.end();
  if (started) execFileSync("pg_ctl", ["-D", join(directory, "data"), "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
  if (directory) rmSync(directory, { recursive: true, force: true });
});
beforeEach(async () => {
  vi.clearAllMocks();
  built = fixture();
  await pool.query("TRUNCATE users,lightning_wallets,lightning_transactions,lightning_payment_queue,audit_logs,fixture_provider_acceptances RESTART IDENTITY");
  await pool.query("INSERT INTO users VALUES($1,'Nexus','admin'),($2,'fixture','user')", [founder, user]);
  await pool.query("INSERT INTO lightning_wallets VALUES($1,9007199254740993,1000)", [user]);
  await pool.query(`INSERT INTO lightning_transactions(user_id,type,amount_sats,status,btc_address,memo,spectral_sig)
    VALUES($1,'withdrawal',1000,'queued_btc',$2,'original memo','original signature')`, [user, destination]);
  providers = {
    isLocked: vi.fn(async () => false), construct: vi.fn(async () => built),
    broadcast: vi.fn(async hex => bitcoin.Transaction.fromHex(hex).getId()),
  };
});

describe("durable BTC identity before irreversible submission", () => {
  it("commits and reads back exact identity before submission; two workers send once without changing the reservation", async () => {
    const before = await wallet();
    providers.broadcast = vi.fn(async hex => {
      const rows = await journal(), t = await state(), txid = bitcoin.Transaction.fromHex(hex).getId();
      expect(rows).toHaveLength(1);
      expect(t).toMatchObject({ status: "processing", btc_txid: txid, memo: "original memo", spectral_sig: "original signature" });
      expect(rows[0].details).toMatchObject({
        transactionId: t.id, txid, amountSats: "1000", destination, outputIndex: 0,
        serviceScript: built.serviceScript, inputs: built.inputs,
        outputScript: Buffer.from(bitcoin.address.toOutputScript(destination)).toString("hex"),
      });
      expect(JSON.stringify(rows)).not.toContain(hex);
      return txid;
    });
    await Promise.all([run(), run()]);
    expect(providers.broadcast).toHaveBeenCalledTimes(1);
    expect((await state()).status).toBe("completed");
    expect(await wallet()).toEqual(before);
    expect(await journal()).toHaveLength(1);
  });
  it("leaves a claim reserved when the worker dies before construction, with no retry on restart", async () => {
    const p = faulty(async (sql, next) => {
      const result = await next();
      if (sql.includes("RETURNING id,user_id")) throw new Error("worker stopped after claim commit");
      return result;
    });
    await expect(run(p)).rejects.toThrow("worker stopped");
    expect((await state()).status).toBe("processing"); expect(await journal()).toHaveLength(0);
    await run(); expect(providers.construct).not.toHaveBeenCalled(); expect(providers.broadcast).not.toHaveBeenCalled();
  });
  it.each(["journal", "commit-before", "commit", "readback"])("does not submit if %s persistence fails before submission", async point => {
    const p = faulty(async (sql, next) => {
      if (point === "journal" && sql.includes("INSERT INTO audit_logs")) throw new Error("journal unavailable");
      if (point === "commit-before" && sql === "COMMIT") throw new Error("commit unavailable");
      if (point === "readback" && sql.includes("SELECT details FROM audit_logs")) throw new Error("worker stopped before POST");
      const result = await next();
      if (point === "commit" && sql === "COMMIT") throw new Error("lost commit acknowledgement");
      return result;
    });
    const before = await wallet();
    await run(p);
    expect((await state()).status).toBe("unknown");
    const rolledBack = point === "journal" || point === "commit-before";
    expect(await journal()).toHaveLength(rolledBack ? 0 : 1);
    expect((await state()).btc_txid).toBe(rolledBack ? null : bitcoin.Transaction.fromHex(built.txHex).getId());
    await run(); expect(providers.broadcast).not.toHaveBeenCalled();
    expect(await wallet()).toEqual(before);
  });
  it("keeps the committed attempt when the worker stops before POST and cannot write an error status", async () => {
    const before = await wallet();
    const p = faulty(async (sql, next) => {
      if (sql.includes("SELECT details FROM audit_logs") || sql.includes("SET status='unknown'")) {
        throw new Error("worker stopped before submission");
      }
      return next();
    });
    await expect(run(p)).rejects.toThrow("worker stopped");
    expect((await state())).toMatchObject({
      status: "processing", btc_txid: bitcoin.Transaction.fromHex(built.txHex).getId(),
    });
    expect(await journal()).toHaveLength(1);
    await run(); expect(providers.broadcast).not.toHaveBeenCalled(); expect(await wallet()).toEqual(before);
  });
  it.each(["before-post", "after-post", "after-final-commit"])("retains durable identity across a real worker SIGKILL %s", async point => {
    const before = await wallet();
    const moduleUrl = pathToFileURL(join(process.cwd(), "server/btc-withdrawal-attempt.ts")).href;
    const source = `
      import pg from "pg";
      import { processBtcWithdrawalQueue } from ${JSON.stringify(moduleUrl)};
      const pool = new pg.Pool(${JSON.stringify({
        host: directory, port: 55444, user: userInfo().username, database: "postgres", password: "", max: 3,
      })});
      const built = ${JSON.stringify(built)};
      const point = ${JSON.stringify(point)};
      const txid = ${JSON.stringify(bitcoin.Transaction.fromHex(built.txHex).getId())};
      const boundary = { connect: async () => {
        const c = await pool.connect();
        return { release: () => c.release(), query: async (sql, values) => {
          const final = sql.includes("SET status='completed'");
          if (final && point === "after-post") process.kill(process.pid, "SIGKILL");
          const result = await c.query(sql, values);
          if (final && point === "after-final-commit") process.kill(process.pid, "SIGKILL");
          return result;
        }};
      }};
      await processBtcWithdrawalQueue(boundary, {
        isLocked: async () => false, construct: async () => built,
        broadcast: async () => {
          if (point === "before-post") process.kill(process.pid, "SIGKILL");
          await pool.query("INSERT INTO fixture_provider_acceptances VALUES($1)", [txid]);
          return txid;
        },
      });
      throw new Error("Expected worker termination");
    `;
    // No app env, database URL, wallet keys or provider credentials reach child.
    const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", source], {
      cwd: process.cwd(), env: { NODE_ENV: "test" }, encoding: "utf8", timeout: 15000,
    });
    expect(child.stderr).toBe("");
    expect(child.signal).toBe("SIGKILL");
    expect((await state())).toMatchObject({
      status: point === "after-final-commit" ? "completed" : "processing",
      btc_txid: bitcoin.Transaction.fromHex(built.txHex).getId(),
    });
    const rows = await journal();
    expect(rows).toHaveLength(1);
    expect((await pool.query("SELECT * FROM fixture_provider_acceptances")).rowCount).toBe(point === "before-post" ? 0 : 1);
    await run();
    expect(providers.construct).not.toHaveBeenCalled(); expect(providers.broadcast).not.toHaveBeenCalled();
    expect(await journal()).toEqual(rows); expect(await wallet()).toEqual(before);
  });
  it("refuses a committed journal whose readback differs", async () => {
    const p = faulty(async (sql, next) => {
      const result = await next();
      if (sql.includes("SELECT details FROM audit_logs")) result.rows[0].details.txid = "f".repeat(64);
      return result;
    });
    await run(p);
    expect(providers.broadcast).not.toHaveBeenCalled(); expect((await state()).status).toBe("unknown");
    expect(await journal()).toHaveLength(1);
  });
  it.each(["timeout-after-acceptance", "wrong-provider-txid"])("retains locally computed identity after %s without fallback or resending", async failure => {
    const before = await wallet();
    providers.broadcast = vi.fn(async () => {
      if (failure === "timeout-after-acceptance") throw new Error("accepted but response lost");
      return "f".repeat(64);
    });
    await run();
    expect((await state())).toMatchObject({ status: "unknown", btc_txid: bitcoin.Transaction.fromHex(built.txHex).getId() });
    expect(await journal()).toHaveLength(1); expect(await wallet()).toEqual(before);
    await run(); expect(providers.broadcast).toHaveBeenCalledTimes(1);
  });
  it("survives a persistence failure after acceptance and reconciles from a fresh connection", async () => {
    const before = await wallet();
    const p = faulty(async (sql, next) => {
      if (sql.includes("SET status='completed'")) throw new Error("connection lost after broadcast");
      return next();
    });
    await expect(run(p)).rejects.toThrow("connection lost");
    const rows = await journal();
    expect(rows).toHaveLength(1); expect((await state()).status).toBe("processing");
    await run(); expect(providers.broadcast).toHaveBeenCalledTimes(1);
    expect(await wallet()).toEqual(before);
    // A fresh connection/operator can reconcile the exact journaled broadcast
    // using independent raw transaction and prevout evidence, without sending.
    const t = await state(), attempt = rows[0].details;
    const target = { kind: "bitcoin" as const, transactionId: t.id };
    const request = { kind: "bitcoin" as const, provider: "esplora" as const,
      account: built.serviceScript, txid: attempt.txid, vout: 0 };
    const reader: WithdrawalEvidenceReader = {
      outgoingLightning: vi.fn(),
      bitcoinTransaction: vi.fn(async txid => ({
        hex: txid === attempt.txid ? built.txHex : previous.toHex(), observed: true,
      })),
    };
    const inspected = await inspectWithdrawal(pool, target, request, reader);
    const approvalId = randomUUID(), key = `reconcile-${randomUUID()}`;
    await pool.query(`INSERT INTO audit_logs VALUES($1,$2,'withdrawal_reconciliation_approved','withdrawal',$3,$4,'success')`,
    [approvalId, founder, String(t.id), JSON.stringify({
      reconciliationKey: key, target, request, snapshotHash: inspected.snapshotHash, proofHash: inspected.proofHash,
      reason: "Synthetic founder review of journaled outgoing broadcast", expiresAt: "2099-01-01T00:00:00.000Z",
    })]);
    expect(await applyWithdrawalReconciliation(pool, approvalId, key, "bitcoin", reader)).toEqual({ status: "applied" });
    expect(await applyWithdrawalReconciliation(pool, approvalId, key, "bitcoin", reader)).toEqual({ status: "already_applied" });
    expect((await state()).status).toBe("completed"); expect(await wallet()).toEqual(before);
    expect(await journal()).toEqual(rows); expect(providers.broadcast).toHaveBeenCalledTimes(1);
  });
  it.each(["processing", "unknown", "completed", "failed"])("never constructs or submits an existing %s obligation", async status => {
    await pool.query("UPDATE lightning_transactions SET status=$1", [status]);
    await run(); expect(providers.construct).not.toHaveBeenCalled(); expect(providers.broadcast).not.toHaveBeenCalled();
  });
  it("keeps founder-locked withdrawals queued", async () => {
    providers.isLocked = vi.fn(async () => true);
    await run(); expect((await state()).status).toBe("queued_btc"); expect(providers.construct).not.toHaveBeenCalled();
  });
  it("refuses a previously journaled attempt even if someone clears its txid and requeues it", async () => {
    await run();
    await pool.query("UPDATE lightning_transactions SET status='queued_btc',btc_txid=NULL");
    await run(); expect(providers.broadcast).toHaveBeenCalledTimes(1); expect(await journal()).toHaveLength(1);
  });
  it("does not assign an identical broadcast to a second reservation", async () => {
    await pool.query(`INSERT INTO lightning_transactions(user_id,type,amount_sats,status,btc_address)
      VALUES($1,'withdrawal',1000,'queued_btc',$2)`, [user, destination]);
    await Promise.all([run(), run()]);
    expect(providers.broadcast).toHaveBeenCalledTimes(1); expect(await journal()).toHaveLength(1);
    const rows = (await pool.query("SELECT status,btc_txid FROM lightning_transactions ORDER BY id")).rows;
    expect(rows.map(r => r.status).sort()).toEqual(["completed", "unknown"]);
    expect(rows.filter(r => r.btc_txid !== null)).toHaveLength(1);
  });
  it("does not submit a reservation whose destination changes while building", async () => {
    providers.construct = vi.fn(async () => {
      await pool.query("UPDATE lightning_transactions SET btc_address=$1", [service.address]);
      return built;
    });
    await run(); expect(providers.broadcast).not.toHaveBeenCalled(); expect(await journal()).toHaveLength(0);
    expect((await state()).status).toBe("unknown");
  });
  it.each(["amount", "destination", "input", "change"])("rejects a construction with mismatched %s before submission", async mismatch => {
    const tx = bitcoin.Transaction.fromHex(built.txHex);
    if (mismatch === "amount") tx.outs[0].value = 999n;
    if (mismatch === "destination") tx.outs[0].script = service.output!;
    if (mismatch === "input") built.inputs[0].vout = 1;
    if (mismatch === "change") tx.outs[1].script = bitcoin.address.toOutputScript(destination);
    built.txHex = tx.toHex();
    await run(); expect(providers.broadcast).not.toHaveBeenCalled(); expect(await journal()).toHaveLength(0);
    expect((await state()).status).toBe("unknown");
  });
  it.each(["txid", "outputIndex", "serviceScript", "inputs", "status", "duplicate"])("refuses conflicting journal %s during evidence inspection", async field => {
    providers.broadcast = vi.fn(async () => { throw new Error("lost response"); });
    await run();
    const [row] = await journal(), details = structuredClone(row.details);
    if (field === "txid") details.txid = "f".repeat(64);
    if (field === "outputIndex") details.outputIndex = 1;
    if (field === "serviceScript") details.serviceScript = "0014" + "ff".repeat(20);
    if (field === "inputs") details.inputs[0].valueSats = "9999";
    if (field === "duplicate") {
      await pool.query("INSERT INTO audit_logs SELECT $1,user_id,action,resource,resource_id,details,status FROM audit_logs WHERE id=$2", [randomUUID(), row.id]);
    } else {
      await pool.query("UPDATE audit_logs SET details=$2,status=$3 WHERE id=$1",
        [row.id, JSON.stringify(details), field === "status" ? "failed" : "success"]);
    }
    const txid = bitcoin.Transaction.fromHex(built.txHex).getId();
    const reader: WithdrawalEvidenceReader = {
      outgoingLightning: vi.fn(), bitcoinTransaction: vi.fn(async id => ({
        hex: id === txid ? built.txHex : previous.toHex(), observed: true,
      })),
    };
    await expect(inspectWithdrawal(pool, { kind: "bitcoin", transactionId: 1 }, {
      kind: "bitcoin", provider: "esplora", account: built.serviceScript, txid, vout: 0,
    }, reader)).rejects.toThrow(/attempt|Conflicting/);
    expect((await state()).status).toBe("unknown");
  });
});

describe("real construction with synthetic service wallet and mocked UTXO providers", () => {
  it.each([1, 2])("signs synthetic key %s locally without submitting and records exactly the Rune Guard-selected inputs", async keyByte => {
    bitcoin.initEccLib(secp);
    const keyPair = ECPairFactory(secp).fromPrivateKey(Buffer.alloc(32, keyByte));
    const internalPubkey = Buffer.from(keyPair.publicKey).subarray(1, 33);
    const p2tr = bitcoin.payments.p2tr({ internalPubkey });
    engine.wallet.mockReturnValue({ keyPair, p2tr, address: p2tr.address! });
    engine.fee.mockResolvedValue(1);
    engine.utxos.mockResolvedValue({ utxos: [{
      txid: "a".repeat(64), vout: 2, value: 10000, status: { confirmed: true },
    }], blockedCount: 1 });
    const http = vi.fn(() => { throw new Error("Unexpected network call"); });
    vi.stubGlobal("fetch", http);
    try {
      const result = await constructBtcWithdrawal(destination, 1000);
      expect(http).not.toHaveBeenCalled();
      const attempt = reviewBtcAttempt(await state(), result);
      expect(attempt.txid).toBe(bitcoin.Transaction.fromHex(result.txHex).getId());
      expect(attempt.inputs).toEqual([{ txid: "a".repeat(64), vout: 2, valueSats: "10000", script: result.serviceScript }]);
      expect(engine.utxos).toHaveBeenCalledWith(p2tr.address);
    } finally { vi.unstubAllGlobals(); }
  });
});
