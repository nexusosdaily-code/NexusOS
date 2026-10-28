import type { Express,Request,Response } from "express";
import { z } from "zod";
import { pool } from "./db";
import { storage } from "./storage";
import { authenticate } from "./auth";
import { resolveWalletWave,walletWaveForUser } from "./wnsp-address-resolution";
import { ElectionError } from "./governance/community-election-service";
import { WaveVault } from "./wave-vault-service";
import { PrivateVaultBlobStore,type VaultBlobStore } from "./wave-vault-storage";
import { VaultError } from "./wave-vault-streams";
import { VaultTransfers } from "./wave-vault-transfers";
import { WAVE_VAULT_LIMITS } from "../shared/wave-vault";
const uuid=z.string().uuid();
const filename=z.string().trim().min(1).max(200).refine(s=>!/[\/\\\x00-\x1f\x7f]/.test(s)&&Buffer.from(s).toString("utf8")===s,"Invalid filename");
const folder=z.string().trim().max(200).refine(s=>!/[\\\x00-\x1f\x7f]/.test(s)&&s.split("/").every(p=>p!==""&&p!=="."&&p!=="..")||s==="","Use a normal folder path");
const metadata=z.object({name:filename,folder:folder.default(""),mediaType:z.string().trim().min(1).max(160).refine(s=>! /[\x00-\x1f\x7f]/.test(s),"Invalid media type").default("application/octet-stream"),
  size:z.number().int().min(0).max(WAVE_VAULT_LIMITS.maxFileBytes)}).strict();
function parse<T>(schema:z.ZodType<T>,input:unknown):T {
  const r=schema.safeParse(input);if(!r.success)throw new VaultError(400,r.error.issues[0]?.message??"Invalid private file request");return r.data;
}
function attachment(name:string) {
  return `attachment; filename="private-file.bin"; filename*=UTF-8''${encodeURIComponent(name).replace(/[!'()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}
const safe=(handler:(req:Request,res:Response)=>Promise<unknown>)=>async(req:Request,res:Response)=>{
  res.set({"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"});
  try{await handler(req,res);}
  catch(error:any){
    if(res.headersSent){res.destroy();return;}
    if(error instanceof VaultError){res.status(error.status).json({error:error.message});return;}
    if(error instanceof ElectionError){res.status(error.status).json({error:"Use an exact registered wave address belonging to an active wallet"});return;}
    res.status(503).json({error:"Private file service unavailable; refresh to check the stored outcome"});
  }
};
export function registerWaveVaultRoutes(app:Express,blobs:VaultBlobStore=new PrivateVaultBlobStore()) {
  const vault=new WaveVault(pool,blobs);
  const transfers=new VaultTransfers(vault,ids=>storage.getActiveSocketSessions(ids));
  app.get("/api/wave-vault",authenticate,safe(async(req,res)=>{
    const [address,listing,storageReady]=await Promise.all([walletWaveForUser(pool,req.user!.id),vault.list(req.user!.id),blobs.ready()]);
    res.json({address,...listing,storageReady,limits:WAVE_VAULT_LIMITS});
  }));
  app.post("/api/wave-vault",authenticate,safe(async(req,res)=>{
    if(!await storage.checkRateLimit(req.user!.id,"wave_vault_create",10,60_000))throw new VaultError(429,"Wait before creating more files");
    const input=parse(metadata,req.body),address=await walletWaveForUser(pool,req.user!.id);
    const file=await vault.create(req.user!.id,address,input);
    res.status(201).json({file,uploadUrl:`/api/wave-vault/${file.id}/content`});
  }));
  app.put("/api/wave-vault/:id/content",authenticate,safe(async(req,res)=>{
    const id=parse(uuid,req.params.id);
    if(!req.is("application/octet-stream")||req.headers["content-encoding"]&&req.headers["content-encoding"]!=="identity")
      throw new VaultError(415,"Send original, uncompressed bytes as application/octet-stream");
    const file=await vault.file(req.user!.id,id,true);
    if(req.headers["content-length"]&&Number(req.headers["content-length"])!==Number(file.size))throw new VaultError(400,"Upload length does not match its reservation");
    const ticket=transfers.start(req.user!.id,req.session!.id,id,true);
    const disconnected=()=>ticket.abort();
    req.once("aborted",disconnected);res.once("close",disconnected);
    try{res.json({file:await vault.upload(req.user!.id,id,req,ticket.signal)});}
    finally{ticket.finish();req.off("aborted",disconnected);res.off("close",disconnected);}
  }));
  app.get("/api/wave-vault/:id/content",authenticate,safe(async(req,res)=>{
    const id=parse(uuid,req.params.id),file=await vault.file(req.user!.id,id);
    if(file.status!=="ready")throw new VaultError(409,"File upload is not verified yet");
    const ticket=transfers.start(req.user!.id,req.session!.id,id,false);
    const disconnected=()=>ticket.abort();res.once("close",disconnected);
    res.set({"Content-Type":"application/octet-stream","Content-Disposition":attachment(file.name),
      "Content-Length":String(file.size),"Content-Security-Policy":"default-src 'none'; sandbox"});
    try{await vault.download(req.user!.id,id,res,ticket.signal);}
    finally{ticket.finish();res.off("close",disconnected);}
  }));
  app.patch("/api/wave-vault/:id",authenticate,safe(async(req,res)=>{
    const id=parse(uuid,req.params.id),input=parse(z.object({name:filename,folder}).strict(),req.body);
    res.json({file:await vault.rename(req.user!.id,id,input.name,input.folder)});
  }));
  app.delete("/api/wave-vault/:id",authenticate,safe(async(req,res)=>{
    await vault.remove(req.user!.id,parse(uuid,req.params.id));res.json({ok:true});
  }));
  app.get("/api/wave-vault/:id/grants",authenticate,safe(async(req,res)=>{
    res.json({grants:await vault.grants(req.user!.id,parse(uuid,req.params.id))});
  }));
  app.post("/api/wave-vault/:id/grants",authenticate,safe(async(req,res)=>{
    if(!await storage.checkRateLimit(req.user!.id,"wave_vault_grant",30,60_000))throw new VaultError(429,"Wait before sharing more files");
    const id=parse(uuid,req.params.id),input=parse(z.object({address:z.string().trim().min(1).max(300)}).strict(),req.body);
    await vault.file(req.user!.id,id,true);
    const target=await resolveWalletWave(pool,input.address);
    await vault.grant(req.user!.id,id,target.userId,target.address);res.json({ok:true});
  }));
  app.delete("/api/wave-vault/:id/grants/:userId",authenticate,safe(async(req,res)=>{
    await vault.revoke(req.user!.id,parse(uuid,req.params.id),parse(uuid,req.params.userId));res.json({ok:true});
  }));
  return {vault,transfers};
}
