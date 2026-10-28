import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import crypto from "node:crypto";
import pg from "pg";
import { createServer, type Server } from "node:http";
import express from "express";
import ts from "typescript";
import { drizzle } from "drizzle-orm/node-postgres";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import * as orm from "drizzle-orm";
import * as schema from "../shared/schema";
import { transactionAwareDatabase, afterWalletCommit } from "./wallet-transaction-context";
import { changeLegacySats, changeLegacyNxt } from "./legacy-sats";
import { settleLegacyInvoice } from "./legacy-invoice-settlement";
import { assertNewQueueInvoice, processLegacyLightningQueue, DefinitivePaymentFailure } from "./legacy-lightning-payments";
import { purchase } from "./p2p-commerce";

// This is the only database boundary. No app startup, environment URL or real
// provider module is imported by the route fixture.
const fixture = vi.hoisted(() => ({ db: null as any, pool: null as pg.Pool | null }));
vi.mock("./db", () => ({
  db: new Proxy({}, { get: (_t, key) => {
    const value = fixture.db[key]; return typeof value === "function" ? value.bind(fixture.db) : value;
  }}),
  pool: { connect: () => fixture.pool!.connect(), query: (...args: any[]) => (fixture.pool!.query as any)(...args) },
}));
import { installLegacyWalletBoundaries, LEGACY_WALLET_ROUTES, BLOCKED_LEGACY_WALLET_ROUTES, legacyWalletJob } from "./legacy-wallet-transaction";
import * as lpPools from "./lp-pools";
import { processBtcWithdrawalQueue } from "./btc-withdrawal-attempt";
import { address, payments, Transaction } from "bitcoinjs-lib";

let pool: pg.Pool, server: Server, directory: string, origin: string, started = false;
const paid = vi.fn(async () => true), pay = vi.fn(async () => "fixture-paid");
const sendBtc = vi.fn(async (hex: string) => Transaction.fromHex(hex).getId());
const btcDestination = payments.p2wpkh({ hash: Buffer.alloc(20, 2) }).address!;
const effects: Array<() => void | Promise<void>> = [];
let failAudit = false, failService = false;
let swapBarrier: (() => Promise<void>) | undefined;
const source = ts.createSourceFile("routes.ts", readFileSync("server/routes.ts", "utf8"), ts.ScriptTarget.Latest, true);
const handlers = new Map<string, { method: string; code: string }>(), functions = new Map<string, string>();
function walk(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(source));
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(source) === "app" && node.arguments.length &&
      ts.isStringLiteral(node.arguments[0])) {
    const fn = node.arguments.at(-1)!;
    if (ts.isArrowFunction(fn)) handlers.set(node.arguments[0].text, { method: node.expression.name.text, code: fn.getText(source) });
  }
  ts.forEachChild(node, walk);
}
walk(source);
const scope: Record<string, any> = {
  crypto, changeLegacySats, changeLegacyNxt, settleLegacyInvoice, assertNewQueueInvoice, legacyWalletJob, sendBtcOnChain: sendBtc,
  processBtcWithdrawalQueue, broadcastTx: sendBtc,
  constructBtcWithdrawal: async (destination: string, amount: number) => {
    const script = payments.p2wpkh({ hash: Buffer.alloc(20, 1) }).output!;
    const tx = new Transaction();
    tx.addInput(Buffer.alloc(32, 1), 0); tx.setWitness(0, [Buffer.alloc(64, 1)]);
    tx.addOutput(address.toOutputScript(destination), BigInt(amount));
    return { txHex: tx.toHex(), serviceScript: Buffer.from(script).toString("hex"),
      inputs: [{ txid: "01".repeat(32), vout: 0, valueSats: String(amount + 100), script: Buffer.from(script).toString("hex") }] };
  },
  // Outbox persistence is tested, but automatic sending is not run by HTTP tests.
  afterWalletCommit: (effect: () => void) => effects.push(effect),
  lnCheckInvoice: paid, lnDecodeInvoice: async () => 100,
  lnPayInvoice: pay, isUserOutgoingLocked: async () => false,
  checkWithdrawalLimits: async () => null, checkSwapLimits: async () => { await swapBarrier?.(); return null; },
  fireLargeSwapAlert: async () => {}, detectLnProvider: () => "fixture",
  lnCreateInvoice: async () => ({ payment_hash: randomUUID(), payment_request: `fixture-invoice-${randomUUID()}` }),
  _wallets: new Map(), _totalFed: 0, tgAlert: async () => {},
  LN_SATS_PER_NXT: 1000, API_KEY_FEE_SATS: 5000, PROPOSAL_FEE_SATS: 10000,
  COMMUNITY_MINT_SATS_FEE: 50000, COMMUNITY_MINT_WNSP_AMT: "1000",
  WSATS_MIN_SATS: 1000, WSATS_SATS_PER_NXT: 1000, WSATS_MINT_FEE_RATE: .001,
  COL_RATIO: 1.5, SATS_PER_BTC: 100000000, SATS_PER_NXT: 1000, MINT_FEE_RATE: .001,
  RUNE_SWAP_RATE: 1, PROPOSAL_DURATION_MS: 3600000,
  deriveChannel: () => ({ wdm: 10, nm: 550 }), getBand: () => "SYSTEM",
  hasAuthority: () => true, checkC0005: () => ({ passed: true }),
  fetchBtcForWnusd: async () => 66000, fetch: async () => ({ ok: true, json: async () => ({ USD: 66000 }) }),
  isValidMainnetBtcAddress: () => true, _fetchLiveMempool: async () => ({ fast: 1, medium: 1, slow: 1 }),
  lpPools, sql: orm.sql, ledgerEvent: async () => {},
  fireAutoSweep: () => {}, // Tested separately as an explicit job; no scheduling.
  lnurlPayBatchInvoices: async (_addr: string, amount: number) => [{ amountSats: amount, payment_request: `ln-fixture-${randomUUID()}`, payment_hash: randomUUID() }],
  logAction: async (req: any, action: string) => {
    if (failAudit) throw new Error("Synthetic audit failure");
    await fixture.db.insert(schema.auditLogs).values({ userId: req.user.id, action, resource: "fixture" });
  },
};
scope.fixtureImport = async (path: string) => {
  if (path === "./db" || path === "./db.js") return fixture;
  if (path.includes("shared/schema")) return schema;
  if (path === "drizzle-orm") return orm;
  if (path === "crypto") return crypto;
  if (path.includes("btc-withdrawal-processor")) return { processWithdrawalQueue: async () => {} };
  if (path.includes("telegram-bot")) return { sendAdminAlert: async () => {} };
  if (path.includes("nostr-service")) return { publishToNostr: async () => {} };
  if (path.includes("btc-bridge-service")) return { btcBridge: { queueRawContent: async () => {
    if (failService) throw new Error("Synthetic service failure");
    const [row] = await fixture.db.insert(schema.btcInscriptionQueue).values({
      eventType: "fixture", eventRef: randomUUID(), anchorName: "fixture", inscriptionContent: "{}",
      contentBytes: 2, psiChannel: "fixture", triggeredBy: "fixture",
    }).returning();
    return { id: row.id };
  }} };
  if (path.includes("physics")) return { GENESIS_EXECUTION_ADDRESS: "fixture-treasury" };
  if (path.includes("lattice-identity")) throw new Error("No real signing keys in fixture");
  if (path.includes("founder-wallet-lock")) return { isUserOutgoingLocked: async () => false };
  throw new Error(`Unmocked dependency prohibited: ${path}`);
};
scope.storage = {
  createApiKey: async (userId: string, name: string, permissions: string[]) => {
    if (failService) throw new Error("Synthetic key service failure");
    const [apiKey] = await fixture.db.insert(schema.apiKeys).values({ userId, name, permissions, keyHash: "fixture", keyPrefix: "fixture" }).returning();
    return { key: "SYNTHETIC-KEY", apiKey };
  },
  getGovernanceParam: async () => ({ value: "1", category: "fixture" }),
  createGovernanceProposal: async (values: any) => {
    if (failService) throw new Error("Synthetic proposal service failure");
    const [row] = await fixture.db.insert(schema.governanceProposals).values(values).returning(); return row;
  },
  getUserByUsername: async (name: string) => (await fixture.db.select().from(schema.users).where(orm.eq(schema.users.username, name)))[0],
  getWalletByUserId: async (id: string) => (await fixture.db.select().from(schema.wallets).where(orm.eq(schema.wallets.userId, id)))[0],
  getWallet: async (id: string) => (await fixture.db.select().from(schema.wallets).where(orm.eq(schema.wallets.userId, id)))[0],
  getWalletByAddress: async (address:string) => (await fixture.db.select().from(schema.wallets).where(orm.eq(schema.wallets.address,address)))[0],
  updateWalletBalance: async (id: string, balance: string) => fixture.db.update(schema.wallets).set({ balance }).where(orm.eq(schema.wallets.id, id)),
  createTransaction: async () => {},
};
function compile(code: string) {
  const js = ts.transpileModule(`const result=(${code.replaceAll("import(", "fixtureImport(")});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return new Function(...Object.keys(scope), `${js};return result;`)(...Object.values(scope));
}
function namedFunction(path: string, name: string) {
  const source=ts.createSourceFile(path,readFileSync(path,"utf8"),ts.ScriptTarget.Latest,true);
  let text: string | undefined;
  const visit=(node:ts.Node)=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name) text=node.getText(source).replace(/^export\s+/,"");ts.forEachChild(node,visit);};
  visit(source); if(!text) throw new Error(`Missing fixture function ${name}`);
  return compile(text);
}

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "wnsp-legacy-pg-"));
  execFileSync("initdb", ["-D",join(directory,"data"),"-A","trust","--no-locale","-U",userInfo().username], { stdio: "pipe" });
  execFileSync("pg_ctl", ["-D",join(directory,"data"),"-l",join(directory,"postgres.log"),
    "-o",`-h '' -k ${directory} -p 55441 -c max_connections=20`,"-w","start"], { stdio: "pipe" });
  started = true;
  pool = new pg.Pool({ host: directory, port: 55441, user: userInfo().username, database: "postgres", password: "", max: 10 });
  fixture.pool = pool; fixture.db = transactionAwareDatabase(drizzle(pool, { schema }));
  // Derive the fixture column names, types and defaults from the real schema,
  // without invoking application initialisers or any migration against app data.
  const tables = [schema.users,schema.wallets,schema.lightningWallets,schema.lightningTransactions,schema.auditLogs,
    schema.apiKeys,schema.governanceProposals,schema.btcInscriptionQueue,schema.communityMints,schema.satsStakes,
    schema.wnusdPositions,schema.wnusdTransactions,schema.wSatsPositions,schema.wSatsTransactions,
    schema.liquidityPools,schema.lpPositions,schema.runeSwaps,schema.transactions,
    schema.p2pListings,schema.p2pListingRecipients,schema.p2pOrders,schema.p2pOrderEvents];
  const dialect = new PgDialect();
  const literal = (v: any) => typeof v === "string" ? `'${v.replaceAll("'", "''")}'` : typeof v === "object" ? `'${JSON.stringify(v).replaceAll("'", "''")}'` : String(v);
  for (const table of tables) {
    const config = getTableConfig(table);
    const columns = config.columns.map(col => {
      let d = "";
      if (col.default !== undefined) {
        if (col.default instanceof orm.SQL) {
          const query = dialect.sqlToQuery(col.default);
          d = " DEFAULT " + query.sql.replace(/\$(\d+)/g, (_s, n) => literal(query.params[Number(n)-1]));
        } else d = " DEFAULT " + literal(col.default);
      }
      return `"${col.name}" ${col.getSQLType()}${col.primary ? " PRIMARY KEY" : ""}${col.notNull ? " NOT NULL" : ""}${col.isUnique ? " UNIQUE" : ""}${d}`;
    });
    await pool.query(`CREATE TABLE "${config.name}" (${columns.join(",")})`);
    for (const idx of config.indexes.filter(i => i.config.unique)) {
      const names = idx.config.columns.map(c => `"${(c as any).name}"`).join(",");
      await pool.query(`CREATE UNIQUE INDEX "${idx.config.name}" ON "${config.name}" (${names})`);
    }
  }
  await pool.query(`CREATE TABLE lightning_payment_queue(id serial PRIMARY KEY,user_id varchar(36),tx_id integer,
    invoice text,amount_sats bigint,status text DEFAULT 'queued',attempts integer DEFAULT 0,last_error text,paid_at timestamp,created_at timestamp DEFAULT now());
    CREATE TABLE orbital_treasury(id varchar(36),source_record_id text,source_label text,source_wavelength_nm numeric,
      source_frequency_hz numeric,source_psi_channel text,source_band text,ordinal_nxt_units bigint,operation_type text,deposited_by text,memo text);
    CREATE TABLE watched_btc_feeds(id serial PRIMARY KEY,address text,txid text UNIQUE,sats_received bigint,note text,credited_at timestamp DEFAULT now())`);
  for (const name of ["ensureLnWallet", "wnspSignTx", "queueBatchPayments"]) scope[name] = compile(functions.get(name)!);
  // queueBatchPayments closes over processBatchQueue; it is deliberately inert
  // until explicitly exercised through the mocked-provider worker below.
  scope.processBatchQueue = async () => {};
  scope.queueBatchPayments = compile(functions.get("queueBatchPayments")!);
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => { req.user = { id: req.get("x-user") ?? "a", username: req.get("x-user") ?? "a" }; next(); });
  for (const [path, { method, code }] of handlers) {
    if ([...LEGACY_WALLET_ROUTES, "/api/lightning/invoice/check", "/api/lightning/invoice/:hash",
      "/api/lightning/invoice/recheck-pending", "/api/lightning/unstake/:id", "/api/wnusd/redeem",
      "/api/wsats/redeem", ...Object.keys(BLOCKED_LEGACY_WALLET_ROUTES)].includes(path)) {
      (app as any)[method](path, compile(code));
    }
  }
  installLegacyWalletBoundaries(app);
  server = createServer(app); await new Promise<void>(done => server.listen(0,"127.0.0.1",done));
  origin = `http://127.0.0.1:${(server.address() as any).port}`;
}, 60000);
afterAll(async () => {
  if (server) await new Promise<void>(done => server.close(() => done()));
  await pool?.end();
  if (started) execFileSync("pg_ctl", ["-D",join(directory,"data"),"-m","immediate","-w","stop"], { stdio: "pipe" });
  if (directory) rmSync(directory,{ recursive: true, force: true });
});
beforeEach(async () => {
  effects.length = 0; failAudit = failService = false; swapBarrier = undefined; paid.mockClear(); pay.mockClear(); sendBtc.mockClear();
  await pool.query(`TRUNCATE users,wallets,lightning_wallets,lightning_transactions,audit_logs,api_keys,
    governance_proposals,btc_inscription_queue,community_mints,sats_stakes,wnusd_positions,wnusd_transactions,
    wsats_positions,wsats_transactions,liquidity_pools,lp_positions,rune_swaps,p2p_listings,p2p_listing_recipients,
    p2p_orders,p2p_order_events,lightning_payment_queue,orbital_treasury,transactions,watched_btc_feeds RESTART IDENTITY CASCADE`);
  for (const id of ["a","b","seller","treasury"]) {
    await fixture.db.insert(schema.users).values({ id, username: id, passwordHash: "synthetic-only" });
    await fixture.db.insert(schema.wallets).values({ id, userId: id, address: `fixture-${id}`, balance: "1000" });
    await fixture.db.insert(schema.lightningWallets).values({ userId: id, satsBalance: id === "seller" ? 0 : 100000, totalDeposited: 100000 });
  }
});
async function post(path: string, body: any = {}, key = randomUUID(), user = "a") {
  return fetch(origin+path, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key, "x-user": user }, body: JSON.stringify(body) });
}
async function balance(user = "a") { return BigInt((await pool.query("SELECT sats_balance FROM lightning_wallets WHERE user_id=$1", [user])).rows[0].sats_balance); }
async function listing(amount = 90000) {
  const id = randomUUID();
  await fixture.db.insert(schema.p2pListings).values({ id,sellerId:"seller",sellerWave:"fixture",title:"Synthetic sale",category:"file",priceSats:amount,isPublic:true });
  return id;
}
async function invoice(amount = 100, hash = randomUUID()) {
  const [row] = await fixture.db.insert(schema.lightningTransactions).values({
    userId: "a", type: "deposit", amountSats: amount, paymentHash: hash, paymentRequest: `fixture-${hash}`, spectralSig: "ORIGINAL-SIGNATURE",
  }).returning(); return row;
}
describe("audited legacy routes against socket-only PostgreSQL", () => {
  it("applies the staged non-destructive record widening without changing any history", async () => {
    await pool.query("ALTER TABLE rune_swaps ALTER COLUMN rune_amount TYPE integer;ALTER TABLE rune_swaps ALTER COLUMN rate TYPE numeric(10,4)");
    await fixture.db.insert(schema.runeSwaps).values({userId:"a",username:"a",direction:"historical",nxtAmount:"123.456",runeAmount:123456,rate:"1.2345",note:"Preserve exact historical record"});
    const before=(await pool.query("SELECT row_to_json(r) record FROM rune_swaps r")).rows;
    await pool.query(readFileSync("migrations/20261027_legacy_sats_record_capacity.sql","utf8"));
    expect((await pool.query("SELECT row_to_json(r) record FROM rune_swaps r")).rows).toEqual(before);
    await fixture.db.insert(schema.runeSwaps).values({userId:"a",username:"a",direction:"sats_to_rune",nxtAmount:"0",runeAmount:21000000000000,rate:"1000000"});
    expect((await pool.query("SELECT rune_amount::text FROM rune_swaps WHERE direction='sats_to_rune'")).rows[0].rune_amount).toBe("21000000000000");
  });
  it("rolls back a swap rather than deducting sats when the other wallet is missing", async () => {
    await pool.query("DELETE FROM wallets WHERE user_id='a'");
    expect((await post("/api/lightning/swap/to-nxt",{amountSats:1000})).status).toBe(500);
    expect(await balance()).toBe(100000n);
    expect((await pool.query("SELECT count(*) n FROM lightning_transactions")).rows[0].n).toBe("0");
  });
  it("serializes duplicate provider deposits across different wallets even if duplicate invoice text differs", async () => {
    const first=await invoice();
    const [second]=await fixture.db.insert(schema.lightningTransactions).values({
      userId:"b",type:"deposit",amountSats:100,paymentHash:first.paymentHash,paymentRequest:"fixture-historical-alias",
    }).returning();
    const results=await Promise.all([
      fetch(origin+`/api/lightning/invoice/check?txId=${first.id}`),
      fetch(origin+`/api/lightning/invoice/check?txId=${second.id}`,{headers:{"x-user":"b"}}),
    ]);
    expect(results.map(r=>r.status)).toEqual([200,200]);
    expect(await balance("a")+await balance("b")).toBe(200100n);
  });
  it("holds the old writer's row lock until its debit and token credit have committed", async () => {
    let entered!:()=>void, release!:()=>void;
    const ready=new Promise<void>(resolve=>{entered=resolve;}), gate=new Promise<void>(resolve=>{release=resolve;});
    swapBarrier=async()=>{entered();await gate;};
    const old=post("/api/lightning/swap/to-nxt",{amountSats:50000});
    await ready;
    const hold=purchase(pool,await listing(80000),"a","fixture",randomUUID()).then(()=>true,()=>false);
    release();
    expect((await old).status).toBe(200); expect(await hold).toBe(false);
    expect(await balance()).toBe(50000n);
    expect((await pool.query("SELECT balance FROM wallets WHERE user_id='a'")).rows[0].balance).toBe("1050.00000000");
  });
  it("credits an invoice concurrently with a hold without overwriting either operation", async () => {
    const row=await invoice(2000);
    const [response] = await Promise.all([
      fetch(origin+`/api/lightning/invoice/check?txId=${row.id}`),
      purchase(pool,await listing(99000),"a","fixture",randomUUID()),
    ]);
    expect(response.status).toBe(200); expect(await balance()).toBe(3000n);
  });
  it.each([
    ["/api/lightning/swap/to-nxt", { amountSats: 1000 }, -1000n, 200],
    ["/api/lightning/swap/to-sats", { nxtAmount: 1 }, 1000n, 200],
    ["/api/governance/proposals", { title:"Fixture",rationale:"Fixture rationale",parameterKey:"fixture",proposedValue:"2" }, -10000n, 201],
    ["/api/lightning/withdraw-to-btc", { amountSats: 10000,btcAddress:"bc1qfixture000000000000000000000000000" }, -10000n, 200],
    ["/api/lightning/withdraw-to-btc", { amountSats: 1000,btcAddress:"fixture@example.test" }, -1000n, 200],
    ["/api/lightning/send-to-ln-address", { amountSats:1000,lightningAddress:"fixture@example.test" }, -1000n, 200],
    ["/api/lightning/send", { recipientUsername:"b",amountSats:1000 }, -1000n, 200],
    ["/api/lightning/tip", { recipientUserId:"b",amountSats:1000 }, -1000n, 200],
    ["/api/lightning/stake", { amountSats:1000,lockDays:7 }, -1000n, 200],
    ["/api/wsats/mint", { satAmount:1000 }, -1000n, 200],
    ["/api/wnusd/mint", { satAmount:10000 }, -10000n, 200],
    ["/api/rune-swap/sats-to-rune", { runeAmount:1000000,btcAddress:"fixture" }, -1n, 200],
    ["/api/pipeline/step2", { nxwvGoal:1000000 }, 1n, 200],
    ["/api/lightning/invoice", { amountSats:1000 }, 0n, 200],
  ])("commits and retries the real legacy handler once: %s", async (path,body,delta,status) => {
    const key=randomUUID();
    const first=await post(path,body,key), value=await first.json();
    expect(first.status, JSON.stringify(value)).toBe(status);
    const repeated=await post(path,body,key);
    expect(repeated.status).toBe(status);
    expect(await repeated.json()).toEqual(value);
    expect(await balance()).toBe(100000n+delta);
    expect((await pool.query("SELECT count(*) n FROM audit_logs WHERE action='legacy_wallet_request'")).rows[0].n).toBe("1");
  });
  it("a rejected proposal rolls back its fee, and failed services cannot partially commit", async () => {
    expect((await post("/api/governance/proposals",{})).status).toBe(400);
    expect(await balance()).toBe(100000n);
    failService=true;
    expect((await post("/api/community/mint")).status).toBe(500);
    expect(await balance()).toBe(100000n);
    expect((await pool.query("SELECT count(*) n FROM lightning_transactions")).rows[0].n).toBe("0");
  });
  it("redemptions are single-use across retries and cannot separately return stake-backed collateral", async () => {
    const wsats=await (await post("/api/wsats/mint",{satAmount:1000})).json();
    const position=(await pool.query("SELECT id FROM wsats_positions")).rows[0].id;
    const responses=await Promise.all([post("/api/wsats/redeem",{positionId:position}),post("/api/wsats/redeem",{positionId:position})]);
    expect(responses.filter(r=>r.status===200)).toHaveLength(1);
    expect(await balance()).toBe(100000n);
    const minted=await (await post("/api/wnusd/mint",{satAmount:10000})).json();
    expect(minted.positionId).toBeTruthy();
    const redeemed=await Promise.all([post("/api/wnusd/redeem",{positionId:minted.positionId}),post("/api/wnusd/redeem",{positionId:minted.positionId})]);
    expect(redeemed.filter(r=>r.status===200)).toHaveLength(1);
    expect(await balance()).toBe(100000n);
    await post("/api/lightning/stake",{amountSats:1000,lockDays:7});
    const backed=(await pool.query("SELECT id FROM wnusd_positions WHERE stake_id IS NOT NULL")).rows[0].id;
    expect((await post("/api/wnusd/redeem",{positionId:backed})).status).toBe(409);
    expect(await balance()).toBe(99000n);
  });
  it("unstaking returns principal once even when two requests race", async () => {
    await post("/api/lightning/stake",{amountSats:1000,lockDays:7});
    await pool.query("UPDATE sats_stakes SET nxt_yield=0,matures_at=now()-interval '1 day'");
    const id=(await pool.query("SELECT id FROM sats_stakes")).rows[0].id;
    const results=await Promise.all([post(`/api/lightning/unstake/${id}`),post(`/api/lightning/unstake/${id}`)]);
    expect(results.filter(r=>r.status===200)).toHaveLength(1);
    expect(await balance()).toBe(100000n);
    expect((await pool.query("SELECT count(*) n FROM lightning_transactions WHERE type='unstake'")).rows[0].n).toBe("1");
  });
  it("locks shared LP reserves and rolls back both wallet debit and pool writes on failure", async () => {
    await fixture.db.insert(schema.liquidityPools).values({ poolId:"fixture",name:"Fixture",tokenA:"NXT",tokenB:"SATS",feeBps:30 });
    let response=await post("/api/lp/add",{poolId:"fixture",amountA:100000000,amountB:50000});
    const added=await response.json(); expect(response.status,JSON.stringify(added)).toBe(200);
    expect(await balance()).toBe(50000n);
    response=await post("/api/lp/swap",{poolId:"fixture",tokenIn:"B",amountIn:1000});
    expect(response.status,JSON.stringify(await response.json())).toBe(200);
    expect(await balance()).toBe(49000n);
    const count=Number((await pool.query("SELECT lp_tokens FROM lp_positions WHERE user_id='a'")).rows[0].lp_tokens);
    const key=randomUUID();
    response=await post("/api/lp/remove",{poolId:"fixture",lpTokens:count},key);
    expect(response.status,JSON.stringify(await response.json())).toBe(200);
    expect((await post("/api/lp/remove",{poolId:"fixture",lpTokens:count},key)).status).toBe(200);
    expect(await balance()).toBe(100000n);
    const before=await pool.query("SELECT * FROM liquidity_pools");
    await pool.query("ALTER TABLE audit_logs ADD CONSTRAINT fixture_reject_lp CHECK(action<>'legacy_wallet_request') NOT VALID");
    try {
      expect((await post("/api/lp/add",{poolId:"fixture",amountA:100000000,amountB:1000})).status).toBe(503);
      expect(await balance()).toBe(100000n);
      expect((await pool.query("SELECT * FROM liquidity_pools")).rows).toEqual(before.rows);
    } finally { await pool.query("ALTER TABLE audit_logs DROP CONSTRAINT fixture_reject_lp"); }
  });
  it("installs every inventoried boundary and rejects unsupported credits/corrections without provider calls", async () => {
    for (const path of Object.keys(BLOCKED_LEGACY_WALLET_ROUTES)) expect((await post(path)).status).toBe(423);
    expect(paid).not.toHaveBeenCalled(); expect(await balance()).toBe(100000n);
  });
  it.each([
    ["/api/lightning/swap/to-nxt", { amountSats: 50000 }],
    ["/api/lightning/pay", { bolt11: "fixture-invoice" }],
    ["/api/lightning/send-to-ln-address", { amountSats: 50000, lightningAddress: "fixture@example.test" }],
    ["/api/community/mint", {}],
    ["/api/keys", { name: "fixture key" }],
    ["/api/wsats/mint", { satAmount: 50000 }],
  ])("does not overwrite a concurrent P2P hold: %s", async (path, body) => {
    const id = await listing(99000);
    const outcomes = await Promise.allSettled([post(path, body), purchase(pool,id,"a","fixture",randomUUID())]);
    const old = outcomes[0];
    if (old.status !== "fulfilled") throw old.reason;
    const response = old.value as Response;
    const result = await response.json();
    expect([200,201,400,402]).toContain(response.status);
    if (response.status >= 400) expect(String(result.error)).toMatch(/Insufficient/i);
    const held = BigInt((await pool.query("SELECT COALESCE(sum(amount_sats),0) n FROM p2p_orders")).rows[0].n);
    expect(await balance()).toBeGreaterThanOrEqual(0n);
    expect(await balance()+held).toBeLessThanOrEqual(100000n);
    expect(response.status < 300 || outcomes[1].status === "fulfilled").toBe(true);
  });
  it("polls, rechecks, and legacy hash polling credit one invoice once, preserving its signature", async () => {
    const row = await invoice();
    const results = await Promise.all([
      fetch(origin+`/api/lightning/invoice/check?txId=${row.id}`),
      post("/api/lightning/invoice/recheck-pending"),
      fetch(origin+`/api/lightning/invoice/${row.paymentHash}`),
    ]);
    expect(results.map(r => r.status)).toEqual([200,200,200]);
    expect(await balance()).toBe(100100n);
    expect((await pool.query("SELECT spectral_sig FROM lightning_transactions WHERE id=$1",[row.id])).rows[0].spectral_sig).toBe("ORIGINAL-SIGNATURE");
  });
  it("does not credit historical duplicate invoice rows or interpret a withdrawal as a deposit", async () => {
    const first = await invoice(), second = await invoice(100,first.paymentHash!);
    await fetch(origin+`/api/lightning/invoice/check?txId=${first.id}`);
    await fetch(origin+`/api/lightning/invoice/check?txId=${second.id}`);
    await pool.query("UPDATE lightning_transactions SET type='withdrawal' WHERE id=$1",[second.id]);
    expect((await fetch(origin+`/api/lightning/invoice/check?txId=${second.id}`)).status).toBe(404);
    expect(await balance()).toBe(100100n);
  });
  it("rolls back invoice credit/state together on audit failure", async () => {
    const row = await invoice(); failAudit = true;
    expect((await fetch(origin+`/api/lightning/invoice/check?txId=${row.id}`)).status).toBe(500);
    expect(await balance()).toBe(100000n);
    expect((await pool.query("SELECT status FROM lightning_transactions WHERE id=$1",[row.id])).rows[0].status).toBe("pending");
  });
  it("reserves withdrawal and outbox once across retries and rejects invoice reuse with another key", async () => {
    const key=randomUUID(), body={ bolt11:"fixture-unique-invoice" };
    const responses = await Promise.all([post("/api/lightning/pay",body,key),post("/api/lightning/pay",body,key)]);
    expect(responses.map(r=>r.status)).toEqual([200,200]);
    expect(await responses[0].json()).toEqual(await responses[1].json());
    expect(await balance()).toBe(99900n);
    expect((await pool.query("SELECT count(*) n FROM lightning_payment_queue")).rows[0].n).toBe("1");
    expect(pay).not.toHaveBeenCalled();
    expect((await post("/api/lightning/pay",body)).status).toBeGreaterThanOrEqual(400);
    expect(await balance()).toBe(99900n);
  });
  it("rolls back fees and delivered service state when service creation or request journal fails", async () => {
    failService = true;
    expect((await post("/api/keys",{name:"fixture key"})).status).toBe(500);
    expect(await balance()).toBe(100000n);
    expect((await pool.query("SELECT count(*) n FROM lightning_transactions")).rows[0].n).toBe("0");
    failService = false;
    await pool.query("ALTER TABLE audit_logs ADD CONSTRAINT fixture_reject_request CHECK(action<>'legacy_wallet_request')");
    try {
      expect((await post("/api/keys",{name:"fixture key"})).status).toBe(503);
      expect(await balance()).toBe(100000n);
      expect((await pool.query("SELECT count(*) n FROM api_keys")).rows[0].n).toBe("0");
    } finally { await pool.query("ALTER TABLE audit_logs DROP CONSTRAINT fixture_reject_request"); }
  });
  it("rolls back withdrawal and outbox if audit fails, without calling a provider", async () => {
    failAudit = true;
    expect((await post("/api/lightning/pay",{bolt11:"fixture-rollback"})).status).toBe(500);
    expect(await balance()).toBe(100000n);
    expect((await pool.query("SELECT count(*) n FROM lightning_payment_queue")).rows[0].n).toBe("0");
    expect(pay).not.toHaveBeenCalled();
  });
  it("retries fees once and rejects the same key with changed fields", async () => {
    const key=randomUUID();
    expect((await post("/api/community/mint",{},key)).status).toBe(200);
    expect((await post("/api/community/mint",{},key)).status).toBe(200);
    expect(await balance()).toBe(50000n);
    expect((await post("/api/community/mint",{changed:true},key)).status).toBe(409);
    expect((await pool.query("SELECT count(*) n FROM community_mints")).rows[0].n).toBe("1");
  });
  it("guards malformed amounts and requires stable retry identities", async () => {
    for (const amountSats of [-1,1.5,"100",1e30]) expect((await post("/api/lightning/swap/to-nxt",{amountSats})).status).toBe(400);
    expect((await fetch(origin+"/api/community/mint",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})).status).toBe(400);
    expect(await balance()).toBe(100000n);
  });
  it("journalled background jobs cannot debit twice or spend held funds", async () => {
    const action=async()=>{await changeLegacySats(fixture.db,"a",-50000);};
    await Promise.all([legacyWalletJob("a","fixture-job",action),legacyWalletJob("a","fixture-job",action)]);
    expect(await balance()).toBe(50000n);
    await purchase(pool,await listing(49000),"a","fixture",randomUUID());
    await expect(legacyWalletJob("a","fixture-job-2",action)).rejects.toThrow("Insufficient");
    expect(await balance()).toBe(1000n);
  });
  it("runs after-commit effects only after a successful committed scope", async () => {
    const calls=vi.fn();
    await legacyWalletJob("a","effect-test",async()=>{afterWalletCommit(calls);});
    expect(calls).toHaveBeenCalledOnce();
    await expect(legacyWalletJob("a","effect-rollback",async()=>{afterWalletCommit(calls);throw new Error("rollback");})).rejects.toThrow();
    expect(calls).toHaveBeenCalledOnce();
  });
});

describe("mock-provider withdrawal worker", () => {
  async function queued(invoices = ["fixture-worker"]) {
    const response = await post("/api/lightning/pay", {bolt11:invoices[0]});
    expect(response.status).toBe(200);
    const {txId}=await response.json();
    return txId as number;
  }
  it("concurrent workers pay a reserved invoice once and never replay completed payments", async () => {
    const id=await queued();
    await Promise.all([processLegacyLightningQueue(pool,pay,async()=>false,id),processLegacyLightningQueue(pool,pay,async()=>false,id)]);
    await processLegacyLightningQueue(pool,pay,async()=>false,id);
    expect(pay).toHaveBeenCalledOnce(); expect(await balance()).toBe(99900n);
  });
  it("unknown outcomes neither refund nor retry, even after restart", async () => {
    const id=await queued();
    const unknown=vi.fn(async()=>{throw new Error("Timeout after provider may have paid");});
    await processLegacyLightningQueue(pool,unknown,async()=>false,id);
    await processLegacyLightningQueue(pool,unknown,async()=>false,id);
    expect(unknown).toHaveBeenCalledOnce(); expect(await balance()).toBe(99900n);
    expect((await pool.query("SELECT status FROM lightning_payment_queue WHERE tx_id=$1",[id])).rows[0].status).toBe("unknown");
  });
  it("definitive rejection refunds once and cannot be resent after refund", async () => {
    const id=await queued();
    await purchase(pool,await listing(99000),"a","fixture",randomUUID());
    const rejected=vi.fn(async()=>{throw new DefinitivePaymentFailure("Mocked definite rejection");});
    await processLegacyLightningQueue(pool,rejected,async()=>false,id);
    await processLegacyLightningQueue(pool,rejected,async()=>false,id);
    expect(rejected).toHaveBeenCalledOnce(); expect(await balance()).toBe(1000n);
    expect((await pool.query("SELECT amount_sats FROM p2p_orders")).rows[0].amount_sats).toBe("99000");
    expect((await pool.query("SELECT count(*) n FROM lightning_transactions WHERE type='withdrawal_refund'")).rows[0].n).toBe("1");
  });
  it("a partially successful batch refunds only its definitively rejected invoice", async () => {
    let id!:number;
    await legacyWalletJob("a","fixture-batch",async()=>{
      await changeLegacySats(fixture.db,"a",-300,{withdrawn:300});
      const [parent]=await fixture.db.insert(schema.lightningTransactions).values({
        userId:"a",type:"withdrawal",amountSats:300,status:"queued",paymentRequest:"fixture-batch",
      }).returning();id=parent.id;
      const entries=[{amountSats:100,payment_request:"fixture-batch-paid"},{amountSats:200,payment_request:"fixture-batch-rejected"}];
      await scope.queueBatchPayments("a",id,entries);
      await scope.queueBatchPayments("a",id,entries);
    });
    expect((await pool.query("SELECT count(*) n FROM lightning_payment_queue")).rows[0].n).toBe("2");
    const provider=vi.fn(async(invoice:string)=>{
      if(invoice.endsWith("rejected")) throw new DefinitivePaymentFailure("Definitively rejected");
      return "SYNTHETIC-RECEIPT";
    });
    await Promise.all([processLegacyLightningQueue(pool,provider,async()=>false,id),processLegacyLightningQueue(pool,provider,async()=>false,id)]);
    expect(provider).toHaveBeenCalledTimes(2);expect(await balance()).toBe(99900n);
    expect((await pool.query("SELECT status FROM lightning_transactions WHERE id=$1",[id])).rows[0].status).toBe("partially_refunded");
  });
  it("rolls back all reservation rows if any outbox write fails", async () => {
    await pool.query("ALTER TABLE lightning_payment_queue ADD CONSTRAINT fixture_outbox_failure CHECK(invoice<>'fixture-outbox-fail')");
    try {
      expect((await post("/api/lightning/pay",{bolt11:"fixture-outbox-fail"})).status).toBe(500);
      expect(await balance()).toBe(100000n);
      expect((await pool.query("SELECT count(*) n FROM lightning_transactions")).rows[0].n).toBe("0");
    } finally {await pool.query("ALTER TABLE lightning_payment_queue DROP CONSTRAINT fixture_outbox_failure");}
  });
  it("refund journal failure rolls back the refund; a possibly paid processing item cannot be retried", async () => {
    const id=await queued();
    await pool.query("ALTER TABLE lightning_transactions ADD CONSTRAINT fixture_no_refund CHECK(type<>'withdrawal_refund')");
    try {
      await expect(processLegacyLightningQueue(pool,async()=>{throw new DefinitivePaymentFailure("Rejected");},async()=>false,id)).rejects.toThrow();
      expect(await balance()).toBe(99900n);
      await processLegacyLightningQueue(pool,pay,async()=>false,id);
      expect(pay).not.toHaveBeenCalled();
      expect((await pool.query("SELECT status FROM lightning_payment_queue WHERE tx_id=$1",[id])).rows[0].status).toBe("processing");
    } finally { await pool.query("ALTER TABLE lightning_transactions DROP CONSTRAINT fixture_no_refund"); }
  });
});

describe("other shared-wallet writers",()=>{
  it("the real on-chain processor claims once before mocked broadcast and never sends historical pending rows",async()=>{
    const response=await post("/api/lightning/withdraw-to-btc",{amountSats:10000,btcAddress:btcDestination});
    expect(response.status).toBe(200);
    const worker=namedFunction("server/btc-withdrawal-processor.ts","processWithdrawalQueue");
    await fixture.db.insert(schema.lightningTransactions).values({userId:"a",type:"withdrawal",amountSats:1000,status:"pending",btcAddress:"fixture-history"});
    await Promise.all([worker(),worker()]);
    expect(sendBtc).toHaveBeenCalledOnce();
    expect((await pool.query("SELECT status FROM lightning_transactions WHERE btc_address='fixture-history'")).rows[0].status).toBe("pending");
    expect(await balance()).toBe(90000n);
  });
  it("an ambiguous on-chain broadcast cannot be retried or automatically refunded",async()=>{
    await post("/api/lightning/withdraw-to-btc",{amountSats:10000,btcAddress:btcDestination});
    sendBtc.mockRejectedValueOnce(new Error("Network failed after possible broadcast"));
    const worker=namedFunction("server/btc-withdrawal-processor.ts","processWithdrawalQueue");
    await worker();await worker();
    expect(sendBtc).toHaveBeenCalledOnce();expect(await balance()).toBe(90000n);
    expect((await pool.query("SELECT status FROM lightning_transactions")).rows[0].status).toBe("unknown");
  });
  it("a watched BTC provider event claims its receipt and arithmetic credit in one transaction",async()=>{
    const credit=namedFunction("server/wnsp-io-liquidity.ts","creditToBalance");
    await Promise.all([credit(100,"fixture-btc-event","fixture","fixture"),credit(100,"fixture-btc-event","fixture","fixture")]);
    expect(await balance()).toBe(100100n);
    expect((await pool.query("SELECT count(*) n FROM watched_btc_feeds")).rows[0].n).toBe("1");
    await pool.query("ALTER TABLE lightning_transactions ADD CONSTRAINT fixture_watcher_audit CHECK(type<>'btc_deposit') NOT VALID");
    try {
      await expect(credit(100,"fixture-btc-event-2","fixture","fixture")).rejects.toThrow();
      expect(await balance()).toBe(100100n);
      expect((await pool.query("SELECT count(*) n FROM watched_btc_feeds")).rows[0].n).toBe("1");
    } finally {await pool.query("ALTER TABLE lightning_transactions DROP CONSTRAINT fixture_watcher_audit");}
  });
});
