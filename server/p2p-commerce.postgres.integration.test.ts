import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import pg from "pg";
import express from "express";
import { purchase, orderAction, tip } from "./p2p-commerce";

const fixture = vi.hoisted(() => ({ pool: null as pg.Pool | null }));
vi.mock("./storage", () => ({storage:{checkRateLimit:async()=>true}}));
vi.mock("./db", () => ({ pool: {
  query: (...args: any[]) => (fixture.pool!.query as any)(...args),
  connect: () => fixture.pool!.connect(),
} }));
vi.mock("./auth", () => ({
  authenticate(req: any, res: any, next: () => void) {
    const id = req.headers["x-fixture-user"];
    if (!["a","b","c","seller"].includes(id)) { res.sendStatus(401); return; }
    req.user = { id }; next();
  },
  optionalAuth(req: any, _res: any, next: () => void) {
    const id = req.headers["x-fixture-user"];
    if (["a","b","c","seller"].includes(id)) req.user = { id };
    next();
  },
}));
vi.mock("./wnsp-address-resolution", () => ({
  walletWaveForUser: async (_pool: unknown, id: string) => `wnsp://Ψ(12,3,H)/${id}`,
  resolveWalletWave: async (_pool: unknown, value: string) => {
    const id = ["a","b","c","seller"].find(id => value === `wnsp://Ψ(12,3,H)/${id}`);
    if (!id) throw new Error("Unknown fixture address");
    return { userId: id, address: value };
  },
}));
import { registerP2PCommerceRoutes } from "./p2p-commerce-routes";
import { canViewStream, watchPrivateStream, revokeStreamGuest } from "./p2p-stream-access";
import { EventEmitter } from "node:events";

let pool: pg.Pool, server: Server, origin: string, directory: string, started = false;
const wave = (id: string) => `wnsp://Ψ(12,3,H)/${id}`;
beforeAll(async () => {
  // Socket-only disposable database: NEVER reads DATABASE_URL or app credentials.
  directory = mkdtempSync(join(tmpdir(), "wnsp-p2p-pg-"));
  execFileSync("initdb", ["-D",join(directory,"data"),"-A","trust","--no-locale","-U",userInfo().username], { stdio:"pipe" });
  execFileSync("pg_ctl", ["-D",join(directory,"data"),"-l",join(directory,"postgres.log"),
    "-o",`-h '' -k ${directory} -p 55440 -c max_connections=20`,"-w","start"], { stdio:"pipe" });
  started = true;
  pool = new pg.Pool({ host:directory,port:55440,database:"postgres",user:userInfo().username,password:"",max:8 });
  fixture.pool = pool;
  await pool.query(`
    CREATE TABLE users(id varchar(36) PRIMARY KEY,is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE lightning_wallets(id serial PRIMARY KEY,user_id varchar(36) UNIQUE REFERENCES users,
      sats_balance bigint NOT NULL DEFAULT 0,updated_at timestamp DEFAULT now());
    CREATE TABLE lightning_transactions(id serial PRIMARY KEY,user_id varchar(36),type text,amount_sats bigint,memo text,status text,completed_at timestamp);
    CREATE TABLE streams(id varchar(36) PRIMARY KEY,broadcaster_id varchar(36),title text,is_public boolean,status text,created_at timestamp DEFAULT now());
    CREATE TABLE p2p_listings(id varchar(36) PRIMARY KEY,seller_id varchar(36) REFERENCES users,seller_wave text,title text,
      description text DEFAULT '',category text,price_sats bigint CHECK(price_sats>0 AND price_sats<=10000000000),
      is_public boolean DEFAULT true,status text DEFAULT 'active',created_at timestamp DEFAULT now());
    CREATE TABLE p2p_listing_recipients(listing_id varchar(36) REFERENCES p2p_listings,user_id varchar(36),UNIQUE(listing_id,user_id));
    CREATE TABLE p2p_orders(id varchar(36) PRIMARY KEY,listing_id varchar(36) UNIQUE REFERENCES p2p_listings,
      buyer_id varchar(36) REFERENCES users,seller_id varchar(36) REFERENCES users,buyer_wave text,seller_wave text,title text,
      amount_sats bigint CHECK(amount_sats>0),request_id varchar(36),status text DEFAULT 'funded',note text DEFAULT '',
      created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now(),UNIQUE(buyer_id,request_id),CHECK(buyer_id<>seller_id));
    CREATE TABLE p2p_order_events(id varchar(36) PRIMARY KEY,order_id varchar(36) REFERENCES p2p_orders,actor_id varchar(36),action text,note text);
    CREATE TABLE p2p_tips(id varchar(36) PRIMARY KEY,sender_id varchar(36),recipient_id varchar(36),
      amount_sats bigint,request_id varchar(36),UNIQUE(sender_id,request_id));
    CREATE TABLE p2p_stream_guests(stream_id varchar(36) REFERENCES streams,user_id varchar(36),wave_address text,UNIQUE(stream_id,user_id));
  `);
  const app = express(); app.use(express.json()); registerP2PCommerceRoutes(app, {paymentsEnabled:true});
  server = createServer(app);
  await new Promise<void>(done => server.listen(0,"127.0.0.1",done));
  origin = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  if (server) await new Promise<void>(done => server.close(() => done()));
  await pool?.end();
  if (started) execFileSync("pg_ctl",["-D",join(directory,"data"),"-m","immediate","-w","stop"],{stdio:"pipe"});
  if (directory) rmSync(directory,{recursive:true,force:true});
});
beforeEach(async () => {
  await pool.query("ALTER TABLE p2p_order_events DROP CONSTRAINT IF EXISTS synthetic_audit_failure");
  await pool.query("TRUNCATE users,streams,lightning_wallets,lightning_transactions,p2p_listings,p2p_listing_recipients,p2p_orders,p2p_order_events,p2p_tips,p2p_stream_guests CASCADE");
  await pool.query("INSERT INTO users(id) VALUES ('a'),('b'),('c'),('seller')");
  await pool.query("INSERT INTO lightning_wallets(user_id,sats_balance) VALUES ('a',1000),('b',1000),('c',1000),('seller',0)");
});
async function listing(price = 100, isPublic = true) {
  const id = randomUUID();
  await pool.query(`INSERT INTO p2p_listings(id,seller_id,seller_wave,title,category,price_sats,is_public)
    VALUES ($1,'seller',$2,'Fixture delivery','file',$3,$4)`,[id,wave("seller"),price,isPublic]);
  return id;
}
async function balance(id: string) { return BigInt((await pool.query("SELECT sats_balance FROM lightning_wallets WHERE user_id=$1",[id])).rows[0].sats_balance); }
const buy = async (id: string, buyer="a", key=randomUUID()) => purchase(pool,id,buyer,wave(buyer),key);
async function http(path: string, user?: string, body?: unknown, method = body ? "POST" : "GET") {
  return fetch(origin+path,{method,headers:{"Content-Type":"application/json",...(user?{"x-fixture-user":user}:{})},body:body?JSON.stringify(body):undefined});
}
describe("real PostgreSQL P2P settlement", () => {
  it("holds funds, records delivery, releases only after buyer acceptance, and tolerates duplicate acceptance", async () => {
    const order = await buy(await listing());
    expect(await balance("a")).toBe(900n); expect(await balance("seller")).toBe(0n);
    await expect(orderAction(pool,order.id,"seller","accept","",true)).rejects.toThrow("Only the buyer");
    await orderAction(pool,order.id,"seller","deliver","Sent via P2P");
    await expect(orderAction(pool,order.id,"a","accept","")).rejects.toThrow("confirmation");
    await orderAction(pool,order.id,"a","accept","Verified",true);
    await orderAction(pool,order.id,"a","accept","Verified",true);
    expect(await balance("seller")).toBe(100n);
    expect((await pool.query("SELECT count(*) AS n FROM lightning_transactions WHERE type='p2p_sale'")).rows[0].n).toBe("1");
  });
  it("serializes competing buyers for the same listing", async () => {
    const id = await listing();
    const outcomes = await Promise.allSettled([buy(id,"a"),buy(id,"b")]);
    expect(outcomes.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(await balance("a")+await balance("b")).toBe(1900n);
    expect((await pool.query("SELECT count(*) AS n FROM p2p_orders")).rows[0].n).toBe("1");
  });
  it("prevents overspending across two different listings", async () => {
    const first = await listing(800), second = await listing(800);
    const result = await Promise.allSettled([buy(first),buy(second)]);
    expect(result.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(await balance("a")).toBe(200n);
  });
  it("limits unresolved holds and lists them before newer completed orders", async () => {
    await pool.query(`INSERT INTO p2p_listings(id,seller_id,seller_wave,title,category,price_sats,status)
      SELECT 'fixture-'||n,'seller','wave','Fixture','file',1,'reserved' FROM generate_series(1,150) n`);
    await pool.query(`INSERT INTO p2p_orders(id,listing_id,buyer_id,seller_id,buyer_wave,seller_wave,title,amount_sats,request_id,status,updated_at)
      SELECT 'order-'||n,'fixture-'||n,'a','seller','a','seller','Fixture',1,'request-'||n,
        CASE WHEN n<=50 THEN 'funded' ELSE 'released' END,now()+n*interval '1 second' FROM generate_series(1,150) n`);
    await expect(buy(await listing())).rejects.toThrow("50 open orders");
    const account = await (await http("/api/p2p/account","a")).json();
    expect(account.orders).toHaveLength(100);
    expect(account.orders.slice(0,50).every((order:any)=>order.status==="funded")).toBe(true);
    expect(account.heldSats).toBe("50");
  });
  it("retries the same purchase without holding funds twice", async () => {
    const id = await listing(), key = randomUUID();
    const result = await Promise.all([buy(id,"a",key),buy(id,"a",key)]);
    expect(result[0].id).toBe(result[1].id); expect(await balance("a")).toBe(900n);
  });
  it("cannot both refund and release when the requests race", async () => {
    const order = await buy(await listing());
    await orderAction(pool,order.id,"seller","deliver","");
    const result = await Promise.allSettled([
      orderAction(pool,order.id,"a","accept","",true),orderAction(pool,order.id,"seller","refund","",true),
    ]);
    expect(result.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect(await balance("a")+await balance("seller")).toBe(1000n);
  });
  it("rolls back the seller credit and state change if event recording fails", async () => {
    const order = await buy(await listing()); await orderAction(pool,order.id,"seller","deliver","");
    await pool.query("ALTER TABLE p2p_order_events ADD CONSTRAINT synthetic_audit_failure CHECK(action<>'accept')");
    await expect(orderAction(pool,order.id,"a","accept","",true)).rejects.toThrow();
    expect(await balance("seller")).toBe(0n);
    expect((await pool.query("SELECT status FROM p2p_orders WHERE id=$1",[order.id])).rows[0].status).toBe("delivered");
  });
  it("keeps disputed funds held and only permits participant-authorized resolution", async () => {
    const order = await buy(await listing());
    await orderAction(pool,order.id,"a","dispute","No delivery");
    await expect(orderAction(pool,order.id,"c","refund","",true)).rejects.toThrow("unavailable");
    await expect(orderAction(pool,order.id,"a","refund","",true)).rejects.toThrow("seller");
    expect(await balance("a")).toBe(900n); expect(await balance("seller")).toBe(0n);
    await orderAction(pool,order.id,"seller","refund","Agreed refund",true);
    expect(await balance("a")).toBe(1000n);
  });
  it("cannot purchase a private listing without its recipient grant", async () => {
    const id = await listing(100,false);
    await expect(buy(id)).rejects.toThrow("unavailable");
    await pool.query("INSERT INTO p2p_listing_recipients VALUES ($1,'a')",[id]);
    expect((await buy(id)).status).toBe("funded");
    expect((await (await http("/api/p2p/listings")).json()).listings).toHaveLength(0);
  });
  it("makes tips atomic and idempotent and rejects invalid amounts", async () => {
    const key = randomUUID();
    await Promise.all([tip(pool,"a","seller",100,key),tip(pool,"a","seller",100,key)]);
    expect(await balance("a")).toBe(900n); expect(await balance("seller")).toBe(100n);
    await expect(tip(pool,"a","seller",-100,randomUUID())).rejects.toThrow("amount");
    await expect(tip(pool,"a","seller",1.5,randomUUID())).rejects.toThrow("amount");
    await expect(tip(pool,"a","seller",1000,randomUUID())).rejects.toThrow("Insufficient");
  });
  it("exposes orders only to participants and rejects malformed/unauthenticated purchases", async () => {
    await buy(await listing());
    expect((await (await http("/api/p2p/account","a")).json()).orders).toHaveLength(1);
    expect((await (await http("/api/p2p/account","c")).json()).orders).toHaveLength(0);
    expect((await http("/api/p2p/orders/nope/action","a",{action:"refund"})).status).toBe(400);
    expect((await http(`/api/p2p/listings/${randomUUID()}/buy`,undefined,{requestId:randomUUID()})).status).toBe(401);
  });
  it("defaults new production funding to fail closed without making database calls", async () => {
    const app = express(); app.use(express.json()); registerP2PCommerceRoutes(app);
    const s=createServer(app); await new Promise<void>(done=>s.listen(0,"127.0.0.1",done));
    const base=`http://127.0.0.1:${(s.address() as any).port}`;
    try {
      const policy=await (await fetch(base+"/api/p2p/payments-policy")).json();
      expect(policy.enabled).toBe(false);
      const response=await fetch(base+`/api/p2p/listings/${randomUUID()}/buy`,{
        method:"POST",headers:{"Content-Type":"application/json","x-fixture-user":"a"},body:JSON.stringify({requestId:randomUUID()}),
      });
      expect(response.status).toBe(423);
      expect(await balance("a")).toBe(1000n);
      expect((await pool.query("SELECT count(*) AS n FROM p2p_orders")).rows[0].n).toBe("0");
    } finally { await new Promise<void>(done=>s.close(()=>done())); }
  });
  it("validates prices, supports seller cancellation, and requires confirmed order actions over HTTP", async () => {
    const fields={title:"Music",description:"Manual delivery",category:"file",priceSats:30,isPublic:true,recipients:[]};
    expect((await http("/api/p2p/listings","seller",{...fields,priceSats:-1})).status).toBe(400);
    const created=await (await http("/api/p2p/listings","seller",fields)).json();
    expect((await http(`/api/p2p/listings/${created.listing.id}`,"a",undefined,"DELETE")).status).toBe(409);
    expect((await http(`/api/p2p/listings/${created.listing.id}`,"seller",undefined,"DELETE")).status).toBe(200);
    expect((await http(`/api/p2p/listings/${created.listing.id}/buy`,"a",{requestId:randomUUID()})).status).toBe(409);
  });
  it("requires owner invitations for private streams and immediately closes revoked viewers", async () => {
    const id=randomUUID(), stream={id,isPublic:false,broadcasterId:"seller"};
    await pool.query("INSERT INTO streams(id,broadcaster_id,title,is_public,status) VALUES ($1,'seller','Private',false,'live')",[id]);
    expect(await canViewStream(stream,"a")).toBe(false);
    expect((await http(`/api/p2p/live/${id}/guests`,"c",{address:wave("a")})).status).toBe(404);
    expect((await http(`/api/p2p/live/${id}/guests`,"seller",{address:wave("a")})).status).toBe(200);
    expect(await canViewStream(stream,"a")).toBe(true);
    expect((await (await http("/api/p2p/live")).json()).streams).toHaveLength(0);
    expect((await (await http("/api/p2p/live","a")).json()).streams).toHaveLength(1);
    const ws=Object.assign(new EventEmitter(),{close:vi.fn(()=>ws.emit("close"))});
    watchPrivateStream(ws as any,stream,"a");
    expect((await http(`/api/p2p/live/${id}/guests/a`,"seller",undefined,"DELETE")).status).toBe(200);
    expect(ws.close).toHaveBeenCalledWith(1008,"Private stream access revoked");
    expect(await canViewStream(stream,"a")).toBe(false);
    revokeStreamGuest(id,"a");
  });
  it("discovers pending multi-recipient rooms only for the owner and invited accounts", async () => {
    const id=randomUUID();
    await pool.query("INSERT INTO streams(id,broadcaster_id,title,is_public,status) VALUES ($1,'seller','Family live',false,'pending')",[id]);
    for (const recipient of ["a","b"]) {
      expect((await http(`/api/p2p/live/${id}/guests`,"seller",{address:wave(recipient)})).status).toBe(200);
    }
    for (const viewer of ["seller","a","b"]) {
      const response=await http("/api/p2p/live",viewer);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await response.json()).streams).toEqual([
        expect.objectContaining({id,status:"pending",isPublic:false}),
      ]);
    }
    for (const viewer of [undefined,"c"]) {
      expect((await (await http("/api/p2p/live",viewer)).json()).streams).toEqual([]);
    }
    expect((await http(`/api/p2p/live/${id}/guests`,"a")).status).toBe(404);
    await http(`/api/p2p/live/${id}/guests/a`,"seller",undefined,"DELETE");
    expect((await (await http("/api/p2p/live","a")).json()).streams).toEqual([]);
    expect((await (await http("/api/p2p/live","b")).json()).streams).toHaveLength(1);
  });
  it("retries existing invitations at capacity but refuses a new recipient", async () => {
    const id=randomUUID();
    await pool.query("INSERT INTO streams(id,broadcaster_id,title,is_public,status) VALUES ($1,'seller','Full private room',false,'pending')",[id]);
    await pool.query(`INSERT INTO p2p_stream_guests(stream_id,user_id,wave_address)
      SELECT $1,'fixture-' || n,'fixture-wave-' || n FROM generate_series(1,49) n`,[id]);
    expect((await http(`/api/p2p/live/${id}/guests`,"seller",{address:wave("a")})).status).toBe(200);
    expect((await http(`/api/p2p/live/${id}/guests`,"seller",{address:wave("a")})).status).toBe(200);
    expect((await http(`/api/p2p/live/${id}/guests`,"seller",{address:wave("b")})).status).toBe(409);
    expect((await pool.query("SELECT count(*) AS n FROM p2p_stream_guests WHERE stream_id=$1",[id])).rows[0].n).toBe("50");
  });
  it("does not add guests to ended, deleted or public rooms", async () => {
    for (const [status,isPublic] of [["ended",false],["pending",true]] as const) {
      const id=randomUUID();
      await pool.query("INSERT INTO streams(id,broadcaster_id,title,is_public,status) VALUES ($1,'seller','Unavailable audience',$2,$3)",[id,isPublic,status]);
      expect((await http(`/api/p2p/live/${id}/guests`,"seller",{address:wave("a")})).status).toBe(409);
      expect((await pool.query("SELECT count(*) AS n FROM p2p_stream_guests WHERE stream_id=$1",[id])).rows[0].n).toBe("0");
    }
    expect((await http(`/api/p2p/live/${randomUUID()}/guests`,"seller",{address:wave("a")})).status).toBe(404);
  });
});
