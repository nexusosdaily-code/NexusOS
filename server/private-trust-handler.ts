import type { Express, Request, RequestHandler } from "express";
import type { Pool } from "pg";
import { z, ZodError } from "zod";
import { PrivateTrustService } from "./governance/private-trust-service";
import { TrustError } from "./governance/private-trust-security";

export function registerPrivateTrustRoutes(app: Express, pool: Pool, authenticate: RequestHandler) {
  const service = new PrivateTrustService(pool);
  const base = "/api/private-trusts";
  const uuid = (value: unknown) => z.string().uuid().parse(value);
  const actor = (req: Request) => {
    const user = req.user as {id?:string;isActive?:boolean} | undefined;
    if (!user?.id || user.isActive===false) throw new TrustError(401,"Active sign-in required");
    return {id:user.id};
  };
  const handle = (work:(req:Request)=>Promise<unknown>, status=200): RequestHandler => async (req,res)=>{
    res.set({"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"});
    try { res.status(status).json(await work(req)); }
    catch(error:any) {
      if (error instanceof TrustError) res.status(error.status).json({error:error.message});
      else if (error instanceof ZodError) res.status(400).json({error:"Invalid private workspace request; check consent, fields, format and size"});
      else if (error.code==="23505") res.status(409).json({error:"This version already has a review from that person or controller"});
      else res.status(503).json({error:"Private workspace operation unavailable; no successful result was confirmed"});
      // No error details, request bodies or private record content in operational logs.
    }
  };
  app.use(base, (req,res,next)=>{
    res.set("Cache-Control","no-store, private");
    // Do not permit cookie-only CSRF; the app's existing bearer session is required.
    if (!/^Bearer\s+\S+$/.test(req.headers.authorization ?? "")) return void res.status(401).json({error:"Authenticated bearer session required"});
    next();
  }, (req,res,next)=>req.user && req.session ? next() : authenticate(req,res,next));
  let retentionSweep: "pending" | "ok" | "unavailable" = "pending";
  app.get(`${base}/status`,handle(async ()=>({...await service.status(),retentionSweep})));
  app.get(base,handle(req=>service.list(actor(req))));
  app.post(base,handle(req=>service.create(actor(req),req.body),201));
  app.get(`${base}/:workspaceId`,handle(req=>service.detail(actor(req),uuid(req.params.workspaceId))));
  app.post(`${base}/:workspaceId/consent`,handle(req=>service.consent(actor(req),uuid(req.params.workspaceId),req.body)));
  app.post(`${base}/:workspaceId/withdraw`,handle(req=>service.withdraw(actor(req),uuid(req.params.workspaceId))));
  app.post(`${base}/:workspaceId/records`,handle(req=>service.addRecord(actor(req),uuid(req.params.workspaceId),req.body),201));
  app.post(`${base}/:workspaceId/evidence`,handle(req=>service.addEvidence(actor(req),uuid(req.params.workspaceId),req.body),201));
  app.post(`${base}/:workspaceId/members`,handle(req=>service.member(actor(req),uuid(req.params.workspaceId),req.body)));
  app.delete(`${base}/:workspaceId/members/:userId`,handle(req=>service.revoke(actor(req),uuid(req.params.workspaceId),uuid(req.params.userId))));
  app.post(`${base}/:workspaceId/legal-confirmation`,handle(req=>service.legal(actor(req),uuid(req.params.workspaceId),req.body)));
  app.delete(`${base}/:workspaceId/records/:recordId`,handle(req=>service.remove(actor(req),uuid(req.params.workspaceId),uuid(req.params.recordId))));
  app.post(`${base}/:workspaceId/records/:recordId/submit`,handle(req=>service.submit(actor(req),uuid(req.params.workspaceId),uuid(req.params.recordId))));
  app.post(`${base}/:workspaceId/records/:recordId/review`,handle(req=>service.review(actor(req),uuid(req.params.workspaceId),uuid(req.params.recordId),req.body)));
  app.get(`${base}/:workspaceId/records/:recordId/download`, async (req,res)=>{
    res.set({"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"});
    try {
      const {content} = await service.download(actor(req),uuid(req.params.workspaceId),uuid(req.params.recordId));
      res.set({"Content-Type":"application/octet-stream","Content-Disposition":'attachment; filename="private-evidence"'});
      res.send(content);
    } catch(error) {
      res.status(error instanceof TrustError ? error.status : 503).json({error:"Private evidence unavailable"});
    }
  });
  // No transfer/forwarding endpoint and no wallet/key imports in this module.
  const sweep = () => service.pruneExpired()
    .then(()=>{retentionSweep="ok";})
    .catch(()=>{retentionSweep="unavailable";});
  void sweep();
  const timer = setInterval(()=>void sweep(),60*60*1000);
  timer.unref();
}
