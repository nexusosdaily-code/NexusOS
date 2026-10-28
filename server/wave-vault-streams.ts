import { createHash } from "node:crypto";
import { Transform, type TransformCallback } from "node:stream";
export class VaultError extends Error {
  constructor(public status:number,message:string){super(message);}
}
/** Verifies unchanged bytes; retains the final 64 KiB until integrity passes. */
export class VaultByteStream extends Transform {
  private hash=createHash("sha256");
  private received=0;
  private last=Buffer.alloc(0);
  digest:string|null=null;
  constructor(private expectedSize:number,private expectedHash?:string){super();}
  _transform(chunk:Buffer,_encoding:BufferEncoding,callback:TransformCallback) {
    this.received+=chunk.length;
    if(this.received>this.expectedSize) return callback(new VaultError(413,"File exceeds its reserved size"));
    this.hash.update(chunk);
    if(this.expectedHash) {
      if(this.last.length) this.push(this.last);
      if(chunk.length>65536) this.push(chunk.subarray(0,chunk.length-65536));
      this.last=Buffer.from(chunk.subarray(Math.max(0,chunk.length-65536)));
    } else this.push(chunk);
    callback();
  }
  _flush(callback:TransformCallback) {
    if(this.received!==this.expectedSize) return callback(new VaultError(400,"Incomplete file: byte length does not match"));
    this.digest=this.hash.digest("hex");
    if(this.expectedHash && this.digest!==this.expectedHash) return callback(new VaultError(409,"Stored file integrity check failed"));
    if(this.last.length) this.push(this.last);
    callback();
  }
}
