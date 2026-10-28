import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import type {Server} from "node:http";
import express from "express";
import pg from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import {eq,sql} from "drizzle-orm";
import {wallets} from "../shared/schema";
import {createSpectralBundleHandler} from "./spectral-bundle-create-handler";
import {founderWalletLockHandlers,walletSpendingRequest} from "./founder-wallet-lock";

vi.mock("./founder-access",()=>({
  isFounderAccount:(user:any)=>user?.username==="Nexus",
  isFounderBtcSession:(token:string)=>token==="synthetic-founder-session",
}));
// Disposable synthetic schema only; never inspect or mutate real wallets.
const schema=`wallet_debit_test_${randomUUID().replaceAll("-","")}`;
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
const db=drizzle(pool);
const founder={id:randomUUID(),username:"Nexus",role:"admin"};
const target={id:randomUUID(),username:"UncJuddy",role:"user"};
const other={id:randomUUID(),username:"SyntheticOther",role:"user"};
let server:Server,base:string;
beforeAll(async()=>{
  await pool.query(`CREATE SCHEMA ${schema};
    CREATE TABLE users(id text PRIMARY KEY,username text,role text,withdrawals_blocked boolean DEFAULT false,updated_at timestamptz DEFAULT now());
    CREATE TABLE audit_logs(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,user_id text,action text,resource text,resource_id text,details jsonb,status text,created_at timestamptz DEFAULT now());
    CREATE TABLE wallets(id text PRIMARY KEY,user_id text,balance numeric(20,8),locked_balance numeric(20,8) DEFAULT 0,updated_at timestamptz DEFAULT now());
    CREATE TABLE lightning_wallets(id serial PRIMARY KEY,user_id text,sats_balance bigint,total_withdrawn bigint DEFAULT 0);
    CREATE TABLE spectral_bundles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text,nxt_locked numeric DEFAULT 0,runes_locked bigint DEFAULT 0,sats_locked bigint DEFAULT 0);
    CREATE TABLE wnusd_positions(id uuid PRIMARY KEY,user_id text)`);
  for (const user of [founder,target,other]) await pool.query("INSERT INTO users(id,username,role) VALUES($1,$2,$3)",[user.id,user.username,user.role]);
  const policy=await readFile("migrations/founder-wallet-hold.sql","utf8");
  // Reapplication must be safe and must not change holdings.
  await pool.query(`BEGIN;${policy}COMMIT;`);
  await pool.query(`BEGIN;${policy}COMMIT;`);
  const app=express();app.use(express.json());
  // Intentionally omit the URL-based hold middleware. This is the actual
  // production handler, proving its debit boundary protects all bundle assets.
  app.post("/api/spectral-bundles/create",(req,_res,next)=>{
    req.user=target as any;next();
  },createSpectralBundleHandler(pool));
  server=await new Promise(resolve=>{
    const listener=app.listen(0,"127.0.0.1",()=>resolve(listener));
  });
  base=`http://127.0.0.1:${(server.address() as any).port}`;
});
beforeEach(async()=>{
  await pool.query("TRUNCATE wallets,lightning_wallets,spectral_bundles,wnusd_positions,audit_logs");
  await pool.query("UPDATE users SET withdrawals_blocked=false");
  await pool.query("INSERT INTO wallets(id,user_id,balance) VALUES($1,$1,100)",[target.id]);
  await pool.query("INSERT INTO lightning_wallets(user_id,sats_balance) VALUES($1,5000)",[target.id]);
});
afterAll(async()=>{
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();
});
async function snapshot() {
  const {rows}=await pool.query(`SELECT
    (SELECT balance::text FROM wallets WHERE user_id=$1) AS nxt,
    (SELECT sats_balance::text FROM lightning_wallets WHERE user_id=$1) AS sats,
    (SELECT count(*)::int FROM spectral_bundles) AS bundles,
    (SELECT count(*)::int FROM wnusd_positions) AS positions`,[target.id]);
  return rows[0];
}
async function changeHold(locked:boolean) {
  const res:any={statusCode:200,status(code:number){this.statusCode=code;return this;},json(body:any){this.body=body;return this;}};
  await founderWalletLockHandlers(pool).write({
    user:founder,session:{token:"synthetic-founder-session"},
    body:{locked,confirmation:locked?"LOCK UNCJUDDY WALLET":"RELEASE UNCJUDDY WALLET"},
  } as any,res);
  expect(res.statusCode).toBe(200);
}
describe("founder hold at actual debit execution boundaries",()=>{
  it("denies actual bundle creation for NXT, rune-only and sats-only inputs without changing any holdings",async()=>{
    const before=await snapshot();
    for (const body of [{nxtAmount:1},{runesAmount:1},{satsAmount:1000}]) {
      const response=await fetch(`${base}/api/spectral-bundles/create`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
      });
      expect(response.status).toBe(423);
      expect(await response.json()).toMatchObject({code:"FOUNDER_WALLET_LOCKED"});
      expect(await snapshot()).toEqual(before);
    }
  });
  it("matches Express case-insensitive financial routes, including the pipeline",()=>{
    for (const path of ["/api/spectral-bundles/create","/API/SPECTRAL-BUNDLES/CREATE","/api/pipeline/step2"]) {
      expect(walletSpendingRequest("POST",path)).toBe(true);
    }
  });
  it("rejects raw SQL and Drizzle debits without relying on authentication or route names",async()=>{
    const before=await snapshot();
    await expect(pool.query("UPDATE wallets SET balance=balance-0.00000001 WHERE user_id=$1",[target.id]))
      .rejects.toMatchObject({code:"P0001",message:"FOUNDER_WALLET_LOCKED"});
    await expect(db.update(wallets).set({balance:sql`${wallets.balance}-1`}).where(eq(wallets.userId,target.id)))
      .rejects.toMatchObject({cause:{code:"P0001",message:"FOUNDER_WALLET_LOCKED"}});
    await expect(pool.query("UPDATE lightning_wallets SET sats_balance=sats_balance-1 WHERE user_id=$1",[target.id]))
      .rejects.toMatchObject({code:"P0001"});
    expect(await snapshot()).toEqual(before);
  });
  it("refuses reservations, ownership changes, deletion and withdrawal counter changes",async()=>{
    for (const statement of [
      "UPDATE wallets SET locked_balance=1 WHERE user_id=$1",
      "UPDATE wallets SET user_id='synthetic-reassigned' WHERE user_id=$1",
      "DELETE FROM wallets WHERE user_id=$1",
      "UPDATE lightning_wallets SET total_withdrawn=1 WHERE user_id=$1",
    ]) await expect(pool.query(statement,[target.id])).rejects.toMatchObject({code:"P0001"});
  });
  it("rejects direct collateral inserts even when they have no NXT debit",async()=>{
    for (const column of ["nxt_locked","runes_locked","sats_locked"]) {
      await expect(pool.query(`INSERT INTO spectral_bundles(user_id,${column}) VALUES($1,1)`,[target.id]))
        .rejects.toMatchObject({code:"P0001"});
    }
    expect(await snapshot()).toMatchObject({bundles:0,positions:0});
  });
  it("rolls back earlier transaction writes when a later held debit is denied",async()=>{
    const client=await pool.connect(),before=await snapshot();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO spectral_bundles(user_id,nxt_locked) VALUES($1,1)",[other.id]);
      await expect(client.query("UPDATE wallets SET balance=balance-1 WHERE user_id=$1",[target.id])).rejects.toMatchObject({code:"P0001"});
      await client.query("ROLLBACK");
    } finally {client.release();}
    expect(await snapshot()).toEqual(before);
  });
  it("permits incoming credits under the hold and outgoing debits only after confirmed Nexus release",async()=>{
    await pool.query("UPDATE wallets SET balance=balance+1 WHERE user_id=$1",[target.id]);
    await pool.query("UPDATE lightning_wallets SET sats_balance=sats_balance+1 WHERE user_id=$1",[target.id]);
    expect(await snapshot()).toMatchObject({nxt:"101.00000000",sats:"5001"});
    await changeHold(false);
    await pool.query("UPDATE wallets SET balance=balance-1 WHERE user_id=$1",[target.id]);
    await pool.query("INSERT INTO spectral_bundles(user_id,sats_locked) VALUES($1,1)",[target.id]);
    await changeHold(true);
    await expect(pool.query("UPDATE wallets SET balance=balance-1 WHERE user_id=$1",[target.id])).rejects.toMatchObject({code:"P0001"});
    await expect(pool.query("DELETE FROM spectral_bundles WHERE user_id=$1",[target.id])).rejects.toMatchObject({code:"P0001"});
    expect(await snapshot()).toMatchObject({nxt:"100.00000000",bundles:1});
  });
});
