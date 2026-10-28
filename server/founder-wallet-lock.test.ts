import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { founderWalletLockHandlers, isWalletOutgoingLocked, isUserOutgoingLocked, walletSpendingRequest, enforceWalletOutgoingLock } from "./founder-wallet-lock";

vi.mock("./founder-access",()=>({
  isFounderAccount:(user:any)=>user?.username==="Nexus",
  isFounderBtcSession:(token:string)=>token==="synthetic-verified-founder-session",
}));
const schema = `wallet_hold_test_${randomUUID().replace(/-/g,"")}`;
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`,ssl:process.env.DATABASE_URL?.includes("localhost")||process.env.DATABASE_URL?.includes("127.0.0.1")?false:{rejectUnauthorized:false}});
const founder = {id:randomUUID(),username:"Nexus",role:"admin"};
const target = {id:randomUUID(),username:"UncJuddy",role:"user"};
const other = {id:randomUUID(),username:"SyntheticOther",role:"user"};

beforeAll(async()=>{
  const client=await pool.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`CREATE TABLE users(id text PRIMARY KEY,username text,role text,withdrawals_blocked boolean DEFAULT false,updated_at timestamptz DEFAULT now());
      CREATE TABLE audit_logs(id text DEFAULT gen_random_uuid()::text PRIMARY KEY,user_id text,action text,resource text,resource_id text,details jsonb,status text,created_at timestamptz DEFAULT now())`);
    for (const user of [founder,target,other]) await client.query("INSERT INTO users(id,username,role) VALUES($1,$2,$3)",[user.id,user.username,user.role]);
  } finally {client.release();}
});
beforeEach(async()=>{
  await pool.query("DELETE FROM audit_logs");
  await pool.query("UPDATE users SET withdrawals_blocked=false");
});
afterAll(async()=>{await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end();});
function response() {
  const res:any={statusCode:200};
  res.status=(code:number)=>{res.statusCode=code;return res;};
  res.json=(body:any)=>{res.body=body;return res;};
  return res;
}
function request(body:any={}) {
  return {user:founder,session:{token:"synthetic-verified-founder-session"},body} as any;
}

describe("indefinite founder wallet hold",()=>{
  it("defaults the requested account to locked without writes, amounts, expiry or changes to other accounts",async()=>{
    expect(await isWalletOutgoingLocked({...target,username:"uncJUDDY"},pool)).toBe(true);
    expect(await isUserOutgoingLocked(other.id,pool)).toBe(false);
    expect((await pool.query("SELECT withdrawals_blocked FROM users WHERE id=$1",[target.id])).rows[0].withdrawals_blocked).toBe(false);
    expect((await pool.query("SELECT count(*) FROM audit_logs")).rows[0].count).toBe("0");
  });
  it("preserves ordinary administrative restrictions and holds a missing account",async()=>{
    await pool.query("UPDATE users SET withdrawals_blocked=true WHERE id=$1",[other.id]);
    expect(await isUserOutgoingLocked(other.id,pool)).toBe(true);
    expect(await isUserOutgoingLocked(randomUUID(),pool)).toBe(true);
  });
  it("keeps reads, PIN safety and receiving routes available while covering wallet spending",()=>{
    for (const path of ["/api/wallet/transfer","/api/lightning/pay","/api/lightning/tip","/api/lightning/send","/api/lightning/send-to-ln-address","/api/lightning/queue/retry/1","/api/lightning/withdraw-to-btc","/api/lightning/swap/to-sats","/api/staking/unstake","/api/rune-swap/nxt-to-rune","/api/wsats/redeem","/api/lp/swap","/api/market/buy/1","/api/contracts/1/fund"]) {
      expect(walletSpendingRequest("POST",path+"?source=test"),path).toBe(true);
      expect(walletSpendingRequest("GET",path),path).toBe(false);
    }
    for (const path of ["/api/lightning/invoice","/api/lightning/invoice/recheck-pending","/api/wallet/pin/set","/api/auth/logout","/api/private-trusts/1/withdraw-consent"]) {
      expect(walletSpendingRequest("POST",path),path).toBe(false);
    }
  });
  it("requires the actual founder session and explicit confirmation before release",async()=>{
    const handlers=founderWalletLockHandlers(pool);
    for (const req of [
      {...request({locked:false,confirmation:"RELEASE UNCJUDDY WALLET"}),session:undefined},
      {...request({locked:false,confirmation:"RELEASE UNCJUDDY WALLET"}),user:{...founder,username:"Leps"}},
      request({locked:false}),request({locked:false,confirmation:"yes"}),
    ]) {
      const res=response(); await handlers.write(req,res);
      expect([400,403]).toContain(res.statusCode);
      expect(await isUserOutgoingLocked(target.id,pool)).toBe(true);
    }
  });
  it("records a separately confirmed release, survives service recreation, and can be deliberately relocked",async()=>{
    const handlers=founderWalletLockHandlers(pool);
    const release=response();
    await handlers.write(request({locked:false,confirmation:"RELEASE UNCJUDDY WALLET"}),release);
    expect(release.statusCode).toBe(200);expect(release.body.locked).toBe(false);
    expect(await isUserOutgoingLocked(target.id,pool)).toBe(false);
    const recreated=founderWalletLockHandlers(pool);
    const status=response();await recreated.read(request(),status);
    expect(status.body).toMatchObject({locked:false,incomingAllowed:true,expiresAt:null});
    const relock=response();await recreated.write(request({locked:true,confirmation:"LOCK UNCJUDDY WALLET"}),relock);
    expect(await isUserOutgoingLocked(target.id,pool)).toBe(true);
    expect((await pool.query("SELECT action FROM audit_logs ORDER BY created_at")).rows.map(r=>r.action))
      .toEqual(["founder_wallet_released","founder_wallet_locked"]);
  });
  it("does not accept a release audit from an unrelated actor",async()=>{
    await pool.query("INSERT INTO audit_logs(user_id,action,resource,resource_id,status) VALUES($1,'founder_wallet_released','founder_wallet_lock',$2,'success')",[other.id,target.id]);
    expect(await isUserOutgoingLocked(target.id,pool)).toBe(true);
  });
  it("rolls back the flag if the mandatory release audit fails",async()=>{
    await pool.query("UPDATE users SET withdrawals_blocked=true WHERE id=$1",[target.id]);
    const faultyPool:any={
      query:pool.query.bind(pool),
      connect:async()=>{
        const client=await pool.connect();
        return {query:(sql:string,params:any[])=>sql.startsWith("INSERT INTO audit_logs")?Promise.reject(new Error("synthetic audit failure")):client.query(sql,params),release:()=>client.release()};
      },
    };
    const res=response();await founderWalletLockHandlers(faultyPool).write(request({locked:false,confirmation:"RELEASE UNCJUDDY WALLET"}),res);
    expect(res.statusCode).toBe(503);
    expect((await pool.query("SELECT withdrawals_blocked FROM users WHERE id=$1",[target.id])).rows[0].withdrawals_blocked).toBe(true);
  });
  it("denies flagged session/API-key spending before the handler without blocking receipts",async()=>{
    const next=vi.fn();const res=response();
    await enforceWalletOutgoingLock({user:{...other,withdrawalsBlocked:true},method:"POST",originalUrl:"/api/wallet/transfer"} as any,res,next);
    expect(res.statusCode).toBe(423);expect(next).not.toHaveBeenCalled();
    await enforceWalletOutgoingLock({user:{...other,withdrawalsBlocked:true},method:"POST",originalUrl:"/api/lightning/invoice"} as any,response(),next);
    expect(next).toHaveBeenCalledOnce();
  });
  it("gates background payouts, auto-sweeps and exact-decimal NXT debits at their execution boundaries",()=>{
    const routes=readFileSync("server/routes.ts","utf8");
    const sweep=routes.slice(routes.indexOf("async function fireAutoSweep"));
    expect(sweep.indexOf("isUserOutgoingLocked(userId)")).toBeLessThan(sweep.indexOf("const useOnChain"));
    const queue=routes.slice(routes.indexOf("async function processBatchQueue"));
    expect(queue).toContain("await processLegacyLightningQueue(pool, lnPayInvoice, isUserOutgoingLocked, txId)");
    const worker=readFileSync("server/legacy-lightning-payments.ts","utf8");
    const lockCheck=worker.indexOf("await outgoingLocked(candidate.user_id)");
    const providerCall=worker.indexOf("await pay(row.invoice)");
    expect(lockCheck).toBeGreaterThanOrEqual(0);
    expect(providerCall).toBeGreaterThan(lockCheck);
    const btcWrapper=readFileSync("server/btc-withdrawal-processor.ts","utf8");
    expect(btcWrapper).toContain("isLocked: isUserOutgoingLocked");
    const btcWorker=readFileSync("server/btc-withdrawal-attempt.ts","utf8");
    const btcLock=btcWorker.indexOf("await providers.isLocked(candidate.user_id)");
    expect(btcLock).toBeGreaterThanOrEqual(0);
    expect(btcWorker.indexOf("const claimed = await c.query")).toBeGreaterThan(btcLock);
    expect(btcWorker.indexOf("await providers.broadcast(built.txHex)")).toBeGreaterThan(btcLock);
    const runeWorker=readFileSync("server/rune-transfer-processor.ts","utf8").split("for (const order of pending)")[1];
    expect(runeWorker).toMatch(/isUserOutgoingLocked\(order\.userId\)\) continue/);
    const storage=readFileSync("server/storage.ts","utf8");
    expect(storage).toContain("locked ? sql`${wallets.balance} <= ${newBalance}::numeric`");
    expect(storage).not.toContain("Number(newBalance) < Number(current.balance)");
  });
  it("does not claim or pay a queued invoice for an outgoing-locked wallet",async()=>{
    const {processLegacyLightningQueue}=await import("./legacy-lightning-payments");
    const query=vi.fn().mockResolvedValue({rows:[{id:1,user_id:"locked-fixture"}]});
    const connect=vi.fn();
    const pay=vi.fn();
    const outgoingLocked=vi.fn().mockResolvedValue(true);
    await processLegacyLightningQueue({query,connect} as any,pay,outgoingLocked);
    expect(outgoingLocked).toHaveBeenCalledWith("locked-fixture");
    expect(connect).not.toHaveBeenCalled();
    expect(pay).not.toHaveBeenCalled();
  });
});
