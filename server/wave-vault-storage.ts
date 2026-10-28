import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { File } from "@google-cloud/storage";
import { objectStorageClient } from "./objectStorage";
import { VaultByteStream, VaultError } from "./wave-vault-streams";
export interface VaultBlobStore {
  ready():Promise<boolean>;
  write(owner:string,id:string,source:Readable,signal?:AbortSignal):Promise<string>;
  read(owner:string,id:string,generation:string):Readable;
  remove(owner:string,id:string,generation?:string):Promise<void>;
}
/** Never signs a public URL, accepts an uploaded object path or changes bucket IAM. */
export class PrivateVaultBlobStore implements VaultBlobStore {
  readiness:"unverified"|"not-configured"|"not-private"|"ready"|"check-failed"="unverified";
  private checkedAt=0;private verified=false;
  private checking:Promise<boolean>|undefined;
  private pendingProbe:{file:File;generation?:string}|undefined;
  private async bounded<T>(operation:Promise<T>):Promise<T> {
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      return await Promise.race([operation,new Promise<never>((_,reject)=>{
        timer=setTimeout(()=>reject(new Error("Storage verification timeout")),5000);
      })]);
    } finally {if(timer)clearTimeout(timer);}
  }
  private async cleanProbe() {
    const probe=this.pendingProbe;
    if(!probe)return;
    await this.bounded(probe.file.delete({ignoreNotFound:true,
      ...(probe.generation?{ifGenerationMatch:probe.generation}:{})}));
    this.pendingProbe=undefined;
  }
  /** Managed Replit buckets enforce privacy but deny bucket-admin metadata.
   * Verify permitted object operations and anonymous denial instead. Only
   * non-sensitive random probe bytes are written; no user upload is admitted
   * before the probe has also been removed successfully. */
  private async verifyManagedBucket(bucket:string) {
    await this.cleanProbe();
    const id=randomUUID();
    const file=this.file("probe",id);
    const bytes=randomBytes(32);
    this.pendingProbe={file};
    try {
      try {
        await pipeline(Readable.from([bytes]),file.createWriteStream({
          resumable:false,validation:"crc32c",preconditionOpts:{ifGenerationMatch:0},
          metadata:{contentType:"application/octet-stream",cacheControl:"private, no-store"},
        }),{signal:AbortSignal.timeout(8000)});
      } catch(error) {
        // A pre-existing object is not ours to remove, even for a UUID collision.
        if((error as {code?:number}).code===412)this.pendingProbe=undefined;
        throw error;
      }
      const [metadata]=await this.bounded(file.getMetadata());
      if(!metadata.generation)throw new Error("Missing probe generation");
      const generation=String(metadata.generation);
      this.pendingProbe!.generation=generation;
      const meter=new VaultByteStream(bytes.length,createHash("sha256").update(bytes).digest("hex"));
      await pipeline(this.file("probe",id,generation).createReadStream({validation:"crc32c"}),
        meter,new Writable({write(_chunk,_encoding,done){done();}}),{signal:AbortSignal.timeout(8000)});
      const response=await fetch(`https://storage.googleapis.com/${bucket}/${encodeURIComponent(file.name)}?generation=${generation}`,{
        method:"HEAD",credentials:"omit",redirect:"error",signal:AbortSignal.timeout(5000),
      });
      if(response.status===200){this.readiness="not-private";return false;}
      if(response.status!==401&&response.status!==403)throw new Error("Anonymous denial was not verified");
      return true;
    } finally {await this.cleanProbe();}
  }
  private file(owner:string,id:string,generation?:string) {
    const dir=process.env.PRIVATE_OBJECT_DIR;
    if(!dir || !/^\/[^/]+\/.+/.test(dir)) throw new VaultError(503,"Private App Storage is not configured");
    if(!/^[a-zA-Z0-9_-]{1,64}$/.test(owner)||!/^[a-f0-9-]{36}$/i.test(id)) throw new VaultError(400,"Invalid storage identity");
    const [bucket,...prefix]=dir.slice(1).replace(/\/$/,"").split("/");
    return objectStorageClient.bucket(bucket).file(`${prefix.join("/")}/wave-vault/${owner}/${id}`,generation?{generation}:undefined);
  }
  async ready() {
    if(this.checking)return this.checking;
    if(Date.now()-this.checkedAt<30_000)return this.verified;
    this.checking=this.verify();
    try{return await this.checking;}finally{this.checking=undefined;}
  }
  private async verify() {
    this.checkedAt=Date.now();this.verified=false;
    this.readiness="check-failed";
    if(!process.env.PRIVATE_OBJECT_DIR||!/^\/[^/]+\/.+/.test(process.env.PRIVATE_OBJECT_DIR)){
      this.readiness="not-configured";return false;
    }
    try {
      const file=this.file("probe","00000000-0000-4000-8000-000000000000");
      let timeout:ReturnType<typeof setTimeout>|undefined;
      try {
        const [meta]=await Promise.race([file.bucket.getMetadata(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error("Storage verification timeout")),5000);})]);
        this.verified=meta.iamConfiguration?.publicAccessPrevention==="enforced";
        this.readiness=this.verified?"ready":"not-private";
      } finally {if(timeout)clearTimeout(timeout);}
    } catch(error) {
      const bucket=process.env.PRIVATE_OBJECT_DIR!.split("/")[1];
      if((error as {code?:number}).code===403&&
        /^replit-objstore-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(bucket)){
        try {
          this.verified=await this.verifyManagedBucket(bucket);
          if(this.verified)this.readiness="ready";
        } catch {this.verified=false;this.readiness="check-failed";}
      } else this.verified=false;
    }
    return this.verified;
  }
  async write(owner:string,id:string,source:Readable,signal?:AbortSignal) {
    if(!await this.ready()) throw new VaultError(503,"Private storage protection could not be verified");
    const file=this.file(owner,id);
    await pipeline(source,file.createWriteStream({
      resumable:false,validation:"crc32c",preconditionOpts:{ifGenerationMatch:0},
      metadata:{contentType:"application/octet-stream",cacheControl:"private, no-store"},
    }),{signal});
    const [metadata]=await file.getMetadata();
    if(!metadata.generation)throw new VaultError(503,"Storage receipt is unavailable");
    return String(metadata.generation);
  }
  read(owner:string,id:string,generation:string){return this.file(owner,id,generation).createReadStream({validation:"crc32c"});}
  async remove(owner:string,id:string,generation?:string) {
    await this.file(owner,id,generation).delete({ignoreNotFound:true,...(generation?{ifGenerationMatch:generation}:{})});
  }
}
