import { describe, it, expect, vi, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { Pool } from "pg";
import { registerCommunityElectionRoutes } from "./community-election-handler";

const query = vi.fn().mockImplementation(async (sql: string) =>
  ({ rows: sql.includes("clock_timestamp()") ? [{now:new Date()}] : [] }));
const pool = {query,connect:vi.fn()} as unknown as Pool;
const app = express();
app.use(express.json());
registerCommunityElectionRoutes(app,pool,(req,res,next) => {
  if (!req.headers.authorization) { res.status(401).json({error:"Sign in required"}); return; }
  req.user = {id:"22222222-2222-4222-8222-222222222222",role:"user"} as any;
  next();
});
const server: Server = app.listen(0,"127.0.0.1");
const ready = new Promise<string>(resolve => server.on("listening",() => {
  const address = server.address() as {port:number};
  resolve(`http://127.0.0.1:${address.port}/api/community-elections`);
}));
afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
describe("community election route boundaries", () => {
  it("serves public overview without authentication and never caches it",async () => {
    const result = await fetch(await ready);
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(await result.json()).toMatchObject({elections:[],nominations:[],commissioning:"not-commissioned"});
  });
  it("requires authentication for all write and private membership endpoints",async () => {
    for (const [path,method] of [
      ["/me","GET"],["/persons","GET"],["","POST"],["/verify-person","POST"],
      ["/nominations","POST"],["/nominations/x","DELETE"],["/x/vote","POST"],
      ["/x/finalise","POST"],["/x/cancel","POST"],["/persons/x/revoke","POST"],
      ["/continuity/requests","POST"],["/continuity/requests/x/schedule","POST"],
      ["/x/relinquish","POST"],
    ]) {
      const result = await fetch((await ready)+path,{method});
      expect(result.status).toBe(401);
    }
    expect(pool.connect).not.toHaveBeenCalled();
  });
  it("forbids non-admin access to private verified-person lists",async () => {
    const result = await fetch((await ready)+"/persons",{headers:{Authorization:"test-session"}});
    expect(result.status).toBe(403);
  });
  it("rejects malformed IDs and weighted votes before persistence",async () => {
    const result = await fetch((await ready)+"/bad-id/vote",{
      method:"POST",headers:{Authorization:"test-session","Content-Type":"application/json"},
      body:JSON.stringify({choice:"yes",weight:999}),
    });
    expect(result.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
