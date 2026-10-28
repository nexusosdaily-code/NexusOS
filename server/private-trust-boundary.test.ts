import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { readFileSync } from "node:fs";
import { privateTrustInputBoundary, privateTrustInputError } from "./private-trust-boundary";
import { registerPrivateTrustRoutes } from "./private-trust-handler";

const fixtures=vi.hoisted(()=>({
  budget:1, failBudget:false,
  status:vi.fn(async()=>({storageReady:false,identityReady:false,walletForwardingEnabled:false,legalEnactmentEnabled:false})),
  detail:vi.fn(async()=>({records:[]})), create:vi.fn(async()=>({id:"synthetic-id"})),
}));
vi.mock("./auth",()=>({authenticate:(req:any,res:any,next:any)=>{
  if (req.headers.authorization!=="Bearer synthetic-session") return res.status(401).json({error:"Invalid synthetic session"});
  req.user={id:"synthetic-user",isActive:true};req.session={token:"synthetic-session"};next();
}}));
vi.mock("./db",()=>({pool:{query:async()=>{
  if (fixtures.failBudget) throw new Error("Synthetic database outage");
  return {rows:[{requests:fixtures.budget}]};
}}}));
vi.mock("./governance/private-trust-service",()=>({PrivateTrustService:class{
  status=fixtures.status; detail=fixtures.detail;create=fixtures.create;
  list=async()=>[];pruneExpired=async()=>({swept:0});
}}));

let server:Server,base:string;
beforeAll(async()=>{
  const app=express();
  app.use("/api/private-trusts",...privateTrustInputBoundary,privateTrustInputError);
  app.use(express.json());
  registerPrivateTrustRoutes(app,{} as any,(_req,_res,next)=>next());
  server=await new Promise<Server>(resolve=>{
    const listener=app.listen(0,"127.0.0.1",()=>resolve(listener));
  });
  base=`http://127.0.0.1:${(server.address() as any).port}/api/private-trusts`;
});
beforeEach(()=>{fixtures.budget=1;fixtures.failBudget=false;vi.clearAllMocks();vi.stubEnv("TRUST_EVIDENCE_UPLOADS_ENABLED","false");});
afterAll(async()=>{vi.unstubAllEnvs();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
describe("private trust HTTP boundary",()=>{
  it("rejects paused evidence before even parsing malformed document input",async()=>{
    const response=await fetch(`${base}/00000000-0000-4000-8000-000000000000/evidence`,{
      method:"POST",headers:{Authorization:"Bearer synthetic-session","Content-Type":"application/json"},
      body:'{"content":"synthetic private evidence", malformed',
    });
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"error":"Private evidence uploads are deliberately disabled"}');
  });
  it("rejects anonymous, cookie-only and API-key access before processing evidence",async()=>{
    for (const headers of [{},{Cookie:"auth_token=synthetic-session"},{Authorization:"ApiKey synthetic"}]) {
      const response=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json",...headers},body:'{"label":"synthetic confidential","consent":true}'});
      expect(response.status).toBe(401);
      expect(fixtures.create).not.toHaveBeenCalled();
      expect(await response.text()).not.toContain("confidential");
    }
  });
  it("returns no-store status and no wallet/legal execution capability",async()=>{
    const response=await fetch(`${base}/status`,{headers:{Authorization:"Bearer synthetic-session"}});
    expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({walletForwardingEnabled:false,legalEnactmentEnabled:false});
  });
  it("sanitises parser errors so request text is not echoed",async()=>{
    const response=await fetch(base,{method:"POST",headers:{Authorization:"Bearer synthetic-session","Content-Type":"application/json"},body:'{"label":"synthetic confidential evidence",bad'});
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('{"error":"Invalid private workspace request"}');
    expect(fixtures.create).not.toHaveBeenCalled();
  });
  it("fails closed on unavailable rate protection and enforces its request cap",async()=>{
    fixtures.failBudget=true;
    let response=await fetch(`${base}/status`,{headers:{Authorization:"Bearer synthetic-session"}});
    expect(response.status).toBe(503);expect(fixtures.status).not.toHaveBeenCalled();
    fixtures.failBudget=false;fixtures.budget=61;
    response=await fetch(`${base}/status`,{headers:{Authorization:"Bearer synthetic-session"}});
    expect(response.status).toBe(429);expect(response.headers.get("retry-after")).toBe("60");
  });
  it("rejects oversized uploads before service access",async()=>{
    const response=await fetch(base,{method:"POST",headers:{Authorization:"Bearer synthetic-session","Content-Type":"application/json"},body:JSON.stringify({content:"x".repeat(7*1024*1024+1)})});
    expect(response.status).toBe(413);expect(fixtures.create).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("xxx");
  });
  it("does not expose forwarding, wallet reassignment or legal enactment endpoints",async()=>{
    for(const path of ["forward","wallet-transfer","enact"]) {
      const response=await fetch(`${base}/00000000-0000-4000-8000-000000000000/${path}`,{method:"POST",headers:{Authorization:"Bearer synthetic-session"}});
      expect(response.status).toBe(404);
    }
  });
  it("excludes private paths/payloads before the global response-capture logger",()=>{
    const source=readFileSync("server/index.ts","utf8");
    expect(source).toContain("app.use(createApiResponseLogger(log))");
    const logger=readFileSync("server/api-response-logger.ts","utf8");
    expect(logger.indexOf('if (path.startsWith("/api/private-trusts"))')).toBeGreaterThan(-1);
    expect(logger.indexOf('if (path.startsWith("/api/private-trusts"))')).toBeLessThan(logger.indexOf("let capturedJsonResponse"));
    expect(source).toContain('if (!req.url?.startsWith("/api/private-trusts")) req.rawBody = buf');
  });
});
