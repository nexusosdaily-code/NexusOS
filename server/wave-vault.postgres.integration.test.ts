import { afterAll,beforeAll,beforeEach,describe,expect,it,vi } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync,mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir,userInfo } from "node:os";
import { join } from "node:path";
import { createServer,type Server } from "node:http";
import { createHash,randomUUID } from "node:crypto";
import { Readable,Writable } from "node:stream";
import express from "express";
import cookieParser from "cookie-parser";
import { build } from "esbuild";
import { chromium,firefox,webkit } from "playwright-core";
import pg from "pg";
import { WaveVault } from "./wave-vault-service";
import { VaultTransfers } from "./wave-vault-transfers";
import type { VaultBlobStore } from "./wave-vault-storage";
import { notifySessionRevoked } from "./session-lifecycle";
const ids=vi.hoisted(()=>({owner:"10000000-0000-4000-8000-000000000001",friend:"10000000-0000-4000-8000-000000000002",stranger:"10000000-0000-4000-8000-000000000003"}));
const fixture=vi.hoisted(()=>({pool:null as pg.Pool|null,rate:true}));
vi.mock("./db",()=>({pool:{query:(...a:any[])=>(fixture.pool!.query as any)(...a),connect:()=>fixture.pool!.connect()}}));
vi.mock("./storage",()=>({storage:{
  checkRateLimit:async()=>fixture.rate,
  getActiveSocketSessions:async(list:string[])=>Object.values(ids).filter(id=>list.includes("session-"+id))
    .map(userId=>({id:"session-"+userId,userId,expiresAt:new Date(Date.now()+60_000)})),
}}));
vi.mock("./auth",()=>({authenticate(req:any,res:any,next:()=>void){
  const id=req.headers["x-fixture-user"]??req.cookies?.fixture_user;
  if(!Object.values(ids).includes(id)){res.sendStatus(401);return;}
  req.user={id};req.session={id:"session-"+id,userId:id,expiresAt:new Date(Date.now()+60_000)};next();
}}));
vi.mock("./wnsp-address-resolution",()=>({
  walletWaveForUser:async(_pool:unknown,id:string)=>`wnsp://Ψ(12,3,H)/${id}`,
  resolveWalletWave:async(_pool:unknown,address:string)=>{
    const userId=Object.values(ids).find(id=>address===`wnsp://Ψ(12,3,H)/${id}`);
    if(!userId)throw new Error("Unknown synthetic address");return{userId,address};
  },
}));
vi.mock("./objectStorage",()=>({objectStorageClient:{bucket(){throw new Error("Real App Storage forbidden in fixture");}}}));
import { registerWaveVaultRoutes } from "./wave-vault-routes";
import { waveVaultInputBoundary,waveVaultInputError } from "./wave-vault-boundary";

class MemoryBlobs implements VaultBlobStore {
  values=new Map<string,Buffer>();enabled=true;failRemove=false;failWrite=false;
  async ready(){return this.enabled;}
  key(user:string,id:string){return user+"/"+id;}
  async write(user:string,id:string,source:Readable,signal?:AbortSignal){
    if(this.failWrite)throw new Error("Synthetic storage write failure");
    const parts:Buffer[]=[];for await(const part of source){if(signal?.aborted)throw new Error("Aborted");parts.push(Buffer.from(part));}
    const key=this.key(user,id);if(this.values.has(key))throw new Error("Immutable object already exists");
    this.values.set(key,Buffer.concat(parts));return"1";
  }
  read(user:string,id:string){const data=this.values.get(this.key(user,id));if(!data)throw new Error("Object absent");return Readable.from([data]);}
  async remove(user:string,id:string){if(this.failRemove)throw new Error("Synthetic cleanup failure");this.values.delete(this.key(user,id));}
}
let pool:pg.Pool,server:Server,origin:string,directory:string,started=false,clientBundle:string;
let blobs:MemoryBlobs,vault:WaveVault,transfers:VaultTransfers;
const wave=(id:string)=>`wnsp://Ψ(12,3,H)/${id}`;
const input=(size=5)=>({name:"你好-document.mp4",folder:"Private/Family",mediaType:"video/mp4",size});
beforeAll(async()=>{
  // No DATABASE_URL, application storage, credentials or funded accounts.
  directory=mkdtempSync(join(tmpdir(),"wnsp-vault-pg-"));
  execFileSync("initdb",["-D",join(directory,"data"),"-A","trust","--no-locale","-U",userInfo().username],{stdio:"pipe"});
  execFileSync("pg_ctl",["-D",join(directory,"data"),"-l",join(directory,"postgres.log"),
    "-o",`-h '' -k ${directory} -p 55441 -c max_connections=20`,"-w","start"],{stdio:"pipe"});
  started=true;
  pool=new pg.Pool({host:directory,port:55441,database:"postgres",user:userInfo().username,password:"",max:8});
  fixture.pool=pool;
  await pool.query(`
    CREATE TABLE users(id varchar(36) PRIMARY KEY,is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE wave_vault_files(id varchar(36) PRIMARY KEY,owner_id varchar(36) NOT NULL REFERENCES users,
      owner_wave text NOT NULL,uri text NOT NULL UNIQUE,name text NOT NULL,folder text NOT NULL DEFAULT '',
      media_type text NOT NULL DEFAULT 'application/octet-stream',size bigint NOT NULL CHECK(size>=0 AND size<=268435456),
      sha256 varchar(64),generation text,status text NOT NULL DEFAULT 'pending',
      created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL DEFAULT now(),expires_at timestamp NOT NULL,
      CHECK(status IN ('pending','uploading','ready','failed','deleting','deleted')),
      CHECK(status<>'ready' OR (sha256 IS NOT NULL AND generation IS NOT NULL)));
    CREATE TABLE wave_vault_grants(file_id varchar(36) NOT NULL REFERENCES wave_vault_files ON DELETE CASCADE,
      user_id varchar(36) NOT NULL REFERENCES users,wave_address text NOT NULL,created_at timestamp NOT NULL DEFAULT now(),UNIQUE(file_id,user_id));
  `);
  blobs=new MemoryBlobs();
  const bundle=await build({
    stdin:{contents:`import React from "react";import{createRoot}from"react-dom/client";
      import{QueryClient,QueryClientProvider}from"@tanstack/react-query";
      import Page from ${JSON.stringify(join(process.cwd(),"client/src/pages/wave-vault.tsx"))};
      createRoot(document.getElementById("root")).render(React.createElement(QueryClientProvider,
        {client:new QueryClient()},React.createElement(Page)));`,resolveDir:process.cwd(),loader:"tsx"},
    bundle:true,write:false,format:"iife",platform:"browser",jsx:"automatic",
    alias:{"@":join(process.cwd(),"client/src"),"@shared":join(process.cwd(),"shared")},
    plugins:[{name:"fixture-auth-only",setup(plugin){
      plugin.onResolve({filter:/use-auth$/},()=>({path:"synthetic-auth",namespace:"fixture"}));
      plugin.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:
        `import React from "react";export function useAuth(){
          const id=React.useSyncExternalStore(window.subscribeFixture,()=>window.fixtureUser);
          return {user:{id,username:"Fixture account"},isAuthenticated:true,isLoading:false};}`,loader:"js",resolveDir:process.cwd()}));
    }}],
  });
  clientBundle=bundle.outputFiles[0].text;
  const app=express();app.use(cookieParser());
  app.get("/fixture",(req,res)=>{
    const fixtureUser=Object.values(ids).find(id=>id===req.query.user)??ids.owner;
    res.cookie("fixture_user",fixtureUser,{httpOnly:true,sameSite:"lax"});
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div>
      <script>window.fixtureUser=${JSON.stringify(fixtureUser)};window.fixtureListeners=new Set();
      window.subscribeFixture=cb=>{window.fixtureListeners.add(cb);return()=>window.fixtureListeners.delete(cb)};
      window.switchFixture=id=>{window.fixtureUser=id;window.fixtureListeners.forEach(cb=>cb())};</script>
      <script src="/fixture.js"></script></body></html>`);
  });
  app.get("/fixture.js",(_req,res)=>res.type("application/javascript").send(clientBundle));
  app.get("/api/directory/recipients",(req,res)=>{
    if(!Object.values(ids).includes(req.cookies?.fixture_user)){res.sendStatus(401);return;}
    res.setHeader("Cache-Control","private, no-store");
    res.json({recipients:[{username:"Family fixture",waveAddress:wave(ids.friend)}],hasMore:false});
  });
  app.use("/api/wave-vault",...waveVaultInputBoundary,waveVaultInputError);
  ({vault,transfers}=registerWaveVaultRoutes(app,blobs));
  server=createServer(app);await new Promise<void>(done=>server.listen(0,"127.0.0.1",done));
  origin=`http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async()=>{
  transfers?.dispose();
  if(server)await new Promise<void>(done=>server.close(()=>done()));
  await pool?.end();
  if(started)execFileSync("pg_ctl",["-D",join(directory,"data"),"-m","immediate","-w","stop"],{stdio:"pipe"});
  if(directory)rmSync(directory,{recursive:true,force:true});
});
beforeEach(async()=>{
  await pool.query("TRUNCATE users,wave_vault_files,wave_vault_grants CASCADE");
  await pool.query("INSERT INTO users(id) VALUES($1),($2),($3)",Object.values(ids));
  blobs.values.clear();blobs.enabled=true;blobs.failRemove=false;blobs.failWrite=false;fixture.rate=true;
});
const signal=()=>new AbortController().signal;
const create=(size=5)=>vault.create(ids.owner,wave(ids.owner),input(size));
async function ready(bytes=Buffer.from("hello")){
  const file=await create(bytes.length);await vault.upload(ids.owner,file.id,Readable.from([bytes]),signal());return file;
}
async function request(path="",user:string|null=ids.owner,body?:unknown,method=body?"POST":"GET"){
  return fetch(origin+"/api/wave-vault"+path,{method,
    headers:{"Content-Type":"application/json",...(user?{"x-fixture-user":user}:{})},
    body:body?JSON.stringify(body):undefined});
}
async function bytes(user:string,id:string){
  const chunks:Buffer[]=[];await vault.download(user,id,new Writable({write(c,_e,done){chunks.push(Buffer.from(c));done();}}),signal());
  return Buffer.concat(chunks);
}
describe("private wave filing with real isolated PostgreSQL",()=>{
  it("stores complete original bytes and immutable coordinate/catalogue metadata",async()=>{
    const payload=Buffer.from([0,255,12,78,92]),file=await ready(payload);
    const list=await vault.list(ids.owner),stored=list.files[0];
    expect(stored.uri).toBe(wave(ids.owner)+"/files/"+file.id);
    expect(stored.sha256).toBe(createHash("sha256").update(payload).digest("hex"));
    expect(await bytes(ids.owner,file.id)).toEqual(payload);
    expect(JSON.stringify(list)).not.toContain("generation");
    expect((await vault.list(ids.stranger)).files).toHaveLength(0);
  });
  it("uses authenticated permissions, never possession of a URI or guessed UUID",async()=>{
    const file=await ready();
    await expect(vault.file(ids.stranger,file.id)).rejects.toThrow("unavailable");
    expect((await request(`/${file.id}/content`,ids.stranger)).status).toBe(404);
    expect((await request(`/${file.id}/content`,null)).status).toBe(401);
    expect((await request(`/${file.id}`,ids.stranger,{name:"stolen",folder:""},"PATCH")).status).toBe(404);
  });
  it("shares with one stable account, revokes future reads and forbids forwarding/deletion by recipients",async()=>{
    const file=await ready();
    await vault.grant(ids.owner,file.id,ids.friend,wave(ids.friend));
    expect((await vault.list(ids.friend)).files[0].isOwner).toBe(false);
    expect(await bytes(ids.friend,file.id)).toEqual(Buffer.from("hello"));
    await expect(vault.grant(ids.friend,file.id,ids.stranger,wave(ids.stranger))).rejects.toThrow("unavailable");
    await expect(vault.remove(ids.friend,file.id)).rejects.toThrow("unavailable");
    await vault.revoke(ids.owner,file.id,ids.friend);
    await expect(bytes(ids.friend,file.id)).rejects.toThrow("unavailable");
    expect((await vault.list(ids.stranger)).files).toHaveLength(0);
  });
  it("closes an in-flight transfer on grant or session revocation",async()=>{
    const file=await ready();await vault.grant(ids.owner,file.id,ids.friend,wave(ids.friend));
    const ticket=transfers.start(ids.friend,"session-"+ids.friend,file.id,false);
    await vault.revoke(ids.owner,file.id,ids.friend);expect(ticket.signal.aborted).toBe(true);ticket.finish();
    const owner=transfers.start(ids.owner,"session-"+ids.owner,file.id,false);
    notifySessionRevoked("session-"+ids.owner);expect(owner.signal.aborted).toBe(true);owner.finish();
  });
  it("rejects duplicate uploads and never exposes pending files to a recipient",async()=>{
    const file=await create();
    await expect(vault.grant(ids.owner,file.id,ids.friend,wave(ids.friend))).rejects.toThrow("verified");
    const out=await Promise.allSettled([
      vault.upload(ids.owner,file.id,Readable.from([Buffer.from("hello")]),signal()),
      vault.upload(ids.owner,file.id,Readable.from([Buffer.from("hello")]),signal()),
    ]);
    expect(out.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect((await vault.file(ids.owner,file.id)).status).toBe("ready");
  });
  it("cleans up incomplete bytes without a ready catalogue record",async()=>{
    const file=await create(10);
    await expect(vault.upload(ids.owner,file.id,Readable.from([Buffer.from("short")]),signal())).rejects.toThrow();
    expect((await vault.file(ids.owner,file.id)).status).toBe("failed");
    expect(blobs.values.size).toBe(0);expect((await vault.list(ids.owner)).usedBytes).toBe("0");
  });
  it("does not hang or claim success when storage fails before consuming the upload",async()=>{
    const file=await create();blobs.failWrite=true;
    await expect(vault.upload(ids.owner,file.id,Readable.from([Buffer.from("hello")]),signal())).rejects.toThrow("storage write");
    expect((await vault.file(ids.owner,file.id)).status).toBe("failed");
  });
  it("detects corrupted bytes before releasing the final download chunk",async()=>{
    const file=await ready();blobs.values.set(blobs.key(ids.owner,file.id),Buffer.from("wrong"));
    const writes:Buffer[]=[];
    await expect(vault.download(ids.owner,file.id,new Writable({write(c,_e,next){writes.push(c);next();}}),signal())).rejects.toThrow("integrity");
    expect(writes).toHaveLength(0);
  });
  it("serializes quota reservations from competing uploads",async()=>{
    for(let n=0;n<3;n++)await create(256*1024*1024);
    const out=await Promise.allSettled([create(256*1024*1024),create(256*1024*1024)]);
    expect(out.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    expect((await vault.list(ids.owner)).usedBytes).toBe(String(1024*1024*1024));
  });
  it("releases expired unused reservations but never silently drops stored data",async()=>{
    const f=await create(256*1024*1024);
    await pool.query("UPDATE wave_vault_files SET expires_at=now()-interval '1 second' WHERE id=$1",[f.id]);
    await create(0);
    await expect(vault.file(ids.owner,f.id)).rejects.toThrow("unavailable");
    expect((await vault.list(ids.owner)).usedBytes).toBe("0");
  });
  it("keeps deletion private and quota held until physical cleanup succeeds",async()=>{
    const f=await ready();await vault.grant(ids.owner,f.id,ids.friend,wave(ids.friend));blobs.failRemove=true;
    await expect(vault.remove(ids.owner,f.id)).rejects.toThrow("cleanup is pending");
    expect((await vault.file(ids.owner,f.id)).status).toBe("deleting");
    await expect(bytes(ids.friend,f.id)).rejects.toThrow("unavailable");
    expect((await vault.list(ids.owner)).usedBytes).toBe("5");
    blobs.failRemove=false;await vault.remove(ids.owner,f.id);
    expect((await vault.list(ids.owner)).usedBytes).toBe("0");
  });
  it("does not grant access after concurrent deletion",async()=>{
    const f=await ready();
    await Promise.allSettled([vault.remove(ids.owner,f.id),vault.grant(ids.owner,f.id,ids.friend,wave(ids.friend))]);
    await expect(bytes(ids.friend,f.id)).rejects.toThrow("unavailable");
  });
  it("serves unsafe types as private attachments with no inline execution",async()=>{
    const payload=Buffer.from("<script>window.compromised=true</script>");
    const f=await vault.create(ids.owner,wave(ids.owner),{...input(payload.length),name:"private.html",mediaType:"text/html"});
    const uploaded=await fetch(origin+`/api/wave-vault/${f.id}/content`,{method:"PUT",
      headers:{"x-fixture-user":ids.owner,"Content-Type":"application/octet-stream"},body:payload});
    expect(uploaded.status).toBe(200);
    const response=await request(`/${f.id}/content`);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(payload);
  });
  it("authenticates before parsing oversized metadata, validates folder paths and enforces rate limits",async()=>{
    expect((await request("",null,{name:"x".repeat(14_000)})).status).toBe(401);
    expect((await request("",ids.owner,{name:"x".repeat(14_000)})).status).toBe(413);
    expect((await request("",ids.owner,{...input(),folder:"../private"})).status).toBe(400);
    expect((await request("",ids.owner,{...input(),ownerId:ids.stranger})).status).toBe(400);
    expect((await request("",ids.owner,{...input(),mediaType:"video/mp4; codecs=avc1"})).status).toBe(201);
    fixture.rate=false;expect((await request("",ids.owner,input())).status).toBe(429);
  });
  it("fails closed when private storage protection cannot be verified",async()=>{
    blobs.enabled=false;
    expect((await (await request()).json()).storageReady).toBe(false);
    expect((await request("",ids.owner,input())).status).toBe(503);
    expect((await vault.list(ids.owner)).files).toHaveLength(0);
  });
  it("preserves empty files and owner-only rename/move without altering content",async()=>{
    const f=await ready(Buffer.alloc(0));
    await vault.rename(ids.owner,f.id,"empty.bin","Archives/2026");
    expect(await bytes(ids.owner,f.id)).toEqual(Buffer.alloc(0));
    expect((await vault.file(ids.owner,f.id)).folder).toBe("Archives/2026");
  });
  for(const engine of [chromium,firefox,webkit]){
  it(`${engine.name()}: refreshes an already-open independent receiver after grant and restored-page revoke`,async(test)=>{
    const executablePath=engine===chromium
      ?process.env.WNSP_TEST_CHROMIUM_PATH||(existsSync("/repl/tools/bin/chromium")?"/repl/tools/bin/chromium":engine.executablePath())
      :engine.executablePath();
    if(!existsSync(executablePath)){
      const reason=`UNAVAILABLE ${engine.name()}: missing ${executablePath}. Install matching engines with node node_modules/playwright-core/cli.js install ${engine.name()}; lifecycle NOT verified.`;
      process.stderr.write(reason+"\n");
      test.skip(reason);
    }
    // Missing executables/libraries are explicit skips, never passes. Other
    // launch/runtime failures must fail, with no fallback to a different engine.
    const browser=await engine.launch({executablePath,headless:true,
      ...(engine===chromium?{args:["--no-sandbox"]}:{})}).catch(error=>{
      const message=String(error);
      if(/Host system is missing dependencies|lib[\w.+-]+\.so(?:\.\d+)*: cannot open shared object file/.test(message)){
        const dependency=message.split("\n").find(line=>/missing dependencies|cannot open shared object file/.test(line));
        const reason=`UNAVAILABLE ${engine.name()}: ${dependency?.trim()}. Install the engine's host libraries; lifecycle NOT verified.`;
        process.stderr.write(reason+"\n");
        test.skip(reason);
      }
      throw error;
    });
    try {
      const receiverContext=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
      const senderContext=await browser.newContext({viewport:{width:1024,height:768}});
      const receiver=await receiverContext.newPage(),sender=await senderContext.newPage();
      await receiver.clock.install();
      const runtimeErrors:string[]=[];
      receiver.on("pageerror",error=>runtimeErrors.push(error.message));
      sender.on("pageerror",error=>runtimeErrors.push(error.message));
      await receiver.goto(origin+`/fixture?user=${ids.friend}`);
      await receiver.getByTestId("vault-tab-shared").click();
      await receiver.getByTestId("vault-empty").waitFor();
      const receiverNavigations:string[]=[];
      receiver.on("framenavigated",frame=>{if(frame===receiver.mainFrame())receiverNavigations.push(frame.url());});
      await sender.goto(origin+"/fixture");
      await sender.getByTestId("vault-upload-open").click();
      const payload=Buffer.concat([Buffer.from("Private family file: separate sender and receiver sessions"),Buffer.from([0,255,128,13,10])]);
      await sender.getByTestId("vault-file-input").setInputFiles({
        name:"family-test.txt",mimeType:"text/plain",buffer:payload,
      });
      const createdPromise=sender.waitForResponse(r=>r.url()===origin+"/api/wave-vault"&&r.request().method()==="POST");
      await sender.getByTestId("vault-upload-submit").click();
      const id=(await (await createdPromise).json()).file.id;
      await sender.getByTestId(`vault-share-${id}`).click();
      await sender.getByTestId("vault-grant-address").fill(wave(ids.friend));
      await sender.getByRole("button",{name:"Grant access",exact:true}).click();
      await sender.getByTestId(`vault-revoke-${ids.friend}`).waitFor();
      // No receiver reload, account switch, manual Refresh or synthetic focus event:
      // the foreground interval must discover a grant made by a different session.
      await receiver.getByTestId(`vault-file-${id}`).waitFor({timeout:15_000});
      expect(receiverNavigations).toEqual([]);
      expect(await receiver.evaluate(()=>(window as any).fixtureUser)).toBe(ids.friend);
      const downloaded=receiver.waitForEvent("download");
      await receiver.getByTestId(`vault-download-${id}`).click();
      expect(readFileSync(await (await downloaded).path())).toEqual(payload);
      // Switch only AFTER discovery/download: a new account key must not be
      // responsible for discovering the incoming grant. Reuse the populated cache
      // to test isolation, with both server cookies and client identity changed.
      await receiverContext.addCookies([{name:"fixture_user",value:ids.stranger,url:origin,httpOnly:true,sameSite:"Lax"}]);
      await receiver.evaluate(id=>(window as any).switchFixture(id),ids.stranger);
      await receiver.getByTestId("vault-tab-shared").click();
      await receiver.getByTestId("vault-empty").waitFor();
      expect(await receiver.getByTestId(`vault-file-${id}`).count()).toBe(0);
      const isolatedIndex=await receiverContext.request.get(origin+"/api/wave-vault");
      expect(isolatedIndex.status()).toBe(200);
      expect((await isolatedIndex.json()).files).toEqual([]);
      expect((await receiverContext.request.get(origin+`/api/wave-vault/${id}/content`)).status()).toBe(404);
      await receiverContext.addCookies([{name:"fixture_user",value:ids.friend,url:origin,httpOnly:true,sameSite:"Lax"}]);
      await receiver.evaluate(id=>(window as any).switchFixture(id),ids.friend);
      await receiver.getByTestId("vault-tab-shared").click();
      await receiver.getByTestId(`vault-file-${id}`).waitFor();
      // Stop polling before revocation so a later interval cannot accidentally
      // satisfy the restoration assertion if the pageshow handler is removed.
      await receiver.clock.pauseAt(await receiver.evaluate(()=>Date.now()+1_000));
      sender.on("dialog",dialog=>void dialog.accept());
      await sender.getByTestId(`vault-revoke-${ids.friend}`).click();
      await sender.getByText("No addresses have access yet.").waitFor();
      expect(await receiver.getByTestId(`vault-file-${id}`).isVisible()).toBe(true);
      const restoredIndex=receiver.waitForResponse(r=>r.url()===origin+"/api/wave-vault"&&r.request().method()==="GET");
      // Exercise the restored-page handler deterministically, not browser BFCache
      // eligibility or real iOS suspension. Linux WebKit is not physical iPhone proof.
      await receiver.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
      expect((await (await restoredIndex).json()).files).toEqual([]);
      await receiver.clock.resume();
      await receiver.getByTestId("vault-empty").waitFor({timeout:10_000});
      expect(await receiver.getByTestId(`vault-file-${id}`).count()).toBe(0);
      expect((await receiverContext.request.get(origin+`/api/wave-vault/${id}/content`)).status()).toBe(404);
      expect((await senderContext.request.get(origin+`/api/wave-vault/${id}/content`)).status()).toBe(200);
      expect(receiverNavigations).toEqual([]);
      expect(runtimeErrors).toEqual([]);
      await receiverContext.close();await senderContext.close();
    } finally {await browser.close();}
  },60_000);
  }
  it("handles real browser upload/download, sharing and account-switch privacy",async()=>{
    const browser=await chromium.launch({executablePath:process.env.WNSP_TEST_CHROMIUM_PATH||"/repl/tools/bin/chromium",headless:true,args:["--no-sandbox"]});
    try {
      const context=await browser.newContext({viewport:{width:402,height:874},acceptDownloads:true});
      const page=await context.newPage(),runtimeErrors:string[]=[];
      page.on("pageerror",error=>runtimeErrors.push(error.message));
      await page.goto(origin+"/fixture");
      await page.getByTestId("vault-upload-open").click();
      const payload=Buffer.from("<script>window.compromised=true</script>");
      await page.getByTestId("vault-file-input").setInputFiles({name:"private.html",mimeType:"text/html",buffer:payload});
      await page.getByTestId("vault-upload-folder").fill("Private/Family");
      const reserved=page.waitForResponse(response=>response.url()===origin+"/api/wave-vault"&&response.request().method()==="POST",{timeout:10_000});
      await page.getByTestId("vault-upload-submit").click();
      const created=await reserved;
      expect(created.status()).toBe(201);
      const id=(await created.json()).file.id;
      await page.getByTestId(`vault-download-${id}`).waitFor({timeout:10_000});
      const downloaded=page.waitForEvent("download");
      await page.getByTestId(`vault-download-${id}`).click();
      expect(readFileSync(await (await downloaded).path())).toEqual(payload);
      expect(await page.evaluate(()=>Boolean((window as any).compromised))).toBe(false);
      await page.getByTestId(`vault-share-${id}`).click();
      await page.getByTestId("recipient-picker-open").click();
      await page.getByTestId("recipient-picker-select").click();
      expect(await page.getByTestId("vault-grant-address").inputValue()).toBe(wave(ids.friend));
      expect(await vault.grants(ids.owner,id)).toHaveLength(0);
      await page.getByRole("button",{name:"Grant access",exact:true}).click();
      await page.getByTestId(`vault-revoke-${ids.friend}`).waitFor({timeout:10_000});
      await page.getByRole("button",{name:"Close access dialog"}).click();
      await context.addCookies([{name:"fixture_user",value:ids.friend,url:origin,httpOnly:true,sameSite:"Lax"}]);
      await page.evaluate(id=>(window as any).switchFixture(id),ids.friend);
      await page.getByTestId("vault-tab-shared").click();
      await page.getByTestId(`vault-file-${id}`).waitFor({timeout:10_000});
      await page.getByTestId("vault-tab-owned").click();
      await page.getByTestId("vault-empty").waitFor({timeout:10_000});
      // A refresh must not strand a failed physical deletion behind a disabled button.
      blobs.failRemove=true;
      await expect(vault.remove(ids.owner,id)).rejects.toThrow("cleanup is pending");
      await page.reload();
      const retry=page.getByTestId(`vault-delete-${id}`);
      await retry.waitFor({timeout:10_000});
      expect(await retry.isEnabled()).toBe(true);
      expect(await retry.innerText()).toContain("Retry cleanup");
      blobs.failRemove=false;
      page.once("dialog",dialog=>void dialog.accept());
      await retry.click();
      await page.getByTestId(`vault-file-${id}`).waitFor({state:"hidden",timeout:10_000});
      expect(runtimeErrors).toEqual([]);
      await context.close();
    }finally{await browser.close();}
  },60_000);
});
