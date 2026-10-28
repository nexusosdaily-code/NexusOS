import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { pipeline } from "node:stream/promises";
import type { Readable, Writable } from "node:stream";
import { WAVE_VAULT_LIMITS, type VaultFile } from "../shared/wave-vault";
import type { VaultBlobStore } from "./wave-vault-storage";
import { VaultByteStream, VaultError } from "./wave-vault-streams";

export function vaultFileJSON(row:any,user:string):VaultFile {
  return {id:row.id,ownerId:row.owner_id,ownerWave:row.owner_wave,uri:row.uri,name:row.name,
    folder:row.folder,mediaType:row.media_type,size:Number(row.size),sha256:row.sha256,
    status:row.status,createdAt:new Date(row.created_at).toISOString(),isOwner:row.owner_id===user};
}
export function waveFileURI(address:string,id:string) {
  if(!/^wnsp:\/\/Ψ\(\d+,\d+,[HV]\)(?:\/[^\s?#]*)?$/.test(address))
    throw new VaultError(403,"Register your own wave-channel URI before creating a private file");
  return `${address.replace(/\/+$/,"")}/files/${id}`;
}
export class WaveVault {
  readonly events=new EventEmitter();
  constructor(readonly pool:Pool,readonly blobs:VaultBlobStore){}
  async list(user:string) {
    const [files,used]=await Promise.all([
      this.pool.query(`SELECT f.* FROM wave_vault_files f JOIN users owner ON owner.id=f.owner_id
        WHERE f.status<>'deleted' AND (f.owner_id=$1 OR (owner.is_active=true AND f.status='ready'
          AND EXISTS(SELECT 1 FROM wave_vault_grants g WHERE g.file_id=f.id AND g.user_id=$1)))
        ORDER BY f.created_at DESC LIMIT 400`,[user]),
      this.pool.query(`SELECT COALESCE(SUM(size),0) AS used FROM wave_vault_files
        WHERE owner_id=$1 AND status IN ('pending','uploading','ready','deleting')`,[user]),
    ]);
    return {files:files.rows.map(r=>vaultFileJSON(r,user)),usedBytes:String(used.rows[0].used)};
  }
  async file(user:string,id:string,ownerOnly=false) {
    const {rows}=await this.pool.query(`SELECT f.* FROM wave_vault_files f JOIN users owner ON owner.id=f.owner_id
      WHERE f.id=$1 AND f.status<>'deleted' AND owner.is_active=true AND
      (f.owner_id=$2 OR ($3=false AND f.status='ready' AND EXISTS(
        SELECT 1 FROM wave_vault_grants g WHERE g.file_id=f.id AND g.user_id=$2)))`,[id,user,ownerOnly]);
    if(!rows.length) throw new VaultError(404,"Private file unavailable");
    return rows[0];
  }
  async create(user:string,address:string,input:{name:string;folder:string;mediaType:string;size:number}) {
    if(!Number.isSafeInteger(input.size)||input.size<0||input.size>WAVE_VAULT_LIMITS.maxFileBytes)throw new VaultError(413,"File exceeds the private vault limit");
    if(!await this.blobs.ready())throw new VaultError(503,"Private App Storage protection is not configured or verified");
    const id=randomUUID(),uri=waveFileURI(address,id),c=await this.pool.connect();
    try {
      await c.query("BEGIN");
      if(!(await c.query("SELECT id FROM users WHERE id=$1 AND is_active=true FOR UPDATE",[user])).rows.length)
        throw new VaultError(403,"Active account required");
      await c.query("UPDATE wave_vault_files SET status='deleted',updated_at=now() WHERE owner_id=$1 AND status='pending' AND expires_at<=now()",[user]);
      const usage=(await c.query(`SELECT count(*) AS files,COALESCE(SUM(size) FILTER
        (WHERE status IN ('pending','uploading','ready','deleting')),0) AS used
        FROM wave_vault_files WHERE owner_id=$1 AND status<>'deleted'`,[user])).rows[0];
      if(Number(usage.files)>=WAVE_VAULT_LIMITS.maxFiles || BigInt(usage.used)+BigInt(input.size)>BigInt(WAVE_VAULT_LIMITS.maxAccountBytes))
        throw new VaultError(409,"Private vault quota reached; delete files or unused reservations first");
      const row=(await c.query(`INSERT INTO wave_vault_files
        (id,owner_id,owner_wave,uri,name,folder,media_type,size,expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '1 hour') RETURNING *`,
        [id,user,address,uri,input.name,input.folder,input.mediaType,input.size])).rows[0];
      await c.query("COMMIT");return vaultFileJSON(row,user);
    } catch(error){await c.query("ROLLBACK");throw error;}
    finally{c.release();}
  }
  async upload(user:string,id:string,source:Readable,signal:AbortSignal) {
    if(!await this.blobs.ready())throw new VaultError(503,"Private storage protection could not be verified");
    const row=(await this.pool.query(`UPDATE wave_vault_files SET status='uploading',expires_at=now()+interval '10 minutes',updated_at=now()
      WHERE id=$1 AND owner_id=$2 AND status='pending' AND expires_at>now() RETURNING *`,[id,user])).rows[0];
    if(!row)throw new VaultError(409,"File is unavailable, already uploading or its reservation expired");
    try {
      const meter=new VaultByteStream(Number(row.size));
      const writing=this.blobs.write(user,id,meter,signal).catch(error=>{meter.destroy(error);throw error;});
      const outcomes=await Promise.allSettled([
        pipeline(source,meter,{signal}),writing,
      ]);
      const error=outcomes.find(r=>r.status==="rejected");
      if(error?.status==="rejected")throw error.reason;
      if(signal.aborted)throw new VaultError(409,"Upload cancelled");
      const generation=(outcomes[1] as PromiseFulfilledResult<string>).value;
      const ready=(await this.pool.query(`UPDATE wave_vault_files SET status='ready',sha256=$3,generation=$4,updated_at=now()
        WHERE id=$1 AND owner_id=$2 AND status='uploading' RETURNING *`,[id,user,meter.digest,generation])).rows[0];
      if(!ready)throw new VaultError(409,"The upload reservation is no longer active");
      return vaultFileJSON(ready,user);
    } catch(error) {
      let removed=false;
      try{await this.blobs.remove(user,id);removed=true;}catch{/* keep quota reserved until cleanup succeeds */}
      await this.pool.query(`UPDATE wave_vault_files SET status=$3,updated_at=now()
        WHERE id=$1 AND owner_id=$2 AND status IN ('uploading','deleting')`,[id,user,removed?"failed":"deleting"]);
      throw error;
    }
  }
  async download(user:string,id:string,destination:Writable,signal:AbortSignal) {
    const file=await this.file(user,id);
    if(file.status!=="ready")throw new VaultError(409,"This file has not completed upload verification");
    if(!await this.blobs.ready())throw new VaultError(503,"Private storage protection could not be verified");
    await pipeline(this.blobs.read(file.owner_id,id,file.generation),
      new VaultByteStream(Number(file.size),file.sha256),destination,{signal});
  }
  async rename(user:string,id:string,name:string,folder:string) {
    await this.file(user,id,true);
    const row=(await this.pool.query(`UPDATE wave_vault_files SET name=$3,folder=$4,updated_at=now()
      WHERE id=$1 AND owner_id=$2 AND status IN ('pending','ready','failed') RETURNING *`,[id,user,name,folder])).rows[0];
    if(!row)throw new VaultError(409,"Cannot rename a file during upload or deletion");
    return vaultFileJSON(row,user);
  }
  async remove(user:string,id:string) {
    const file=await this.file(user,id,true);
    const claimed=(await this.pool.query(`UPDATE wave_vault_files SET status='deleting',updated_at=now()
      WHERE id=$1 AND owner_id=$2 AND (status IN ('pending','ready','failed','deleting') OR (status='uploading' AND expires_at<=now()))
      RETURNING id`,[id,user])).rows.length;
    if(!claimed)throw new VaultError(409,"Cancel the active upload before deleting this file");
    this.events.emit("revoke",id);
    try{await this.blobs.remove(user,id,file.generation??undefined);}
    catch{throw new VaultError(503,"Access is closed but storage cleanup is pending; retry deletion");}
    await this.pool.query("UPDATE wave_vault_files SET status='deleted',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='deleting'",[id,user]);
  }
  async grants(user:string,id:string) {
    await this.file(user,id,true);
    return (await this.pool.query("SELECT user_id,wave_address,created_at FROM wave_vault_grants WHERE file_id=$1 ORDER BY created_at",[id]))
      .rows.map(g=>({userId:g.user_id,waveAddress:g.wave_address,createdAt:new Date(g.created_at).toISOString()}));
  }
  async grant(user:string,id:string,target:string,address:string) {
    // Take the same file lock as delete; never re-create access after deletion.
    const c=await this.pool.connect();
    try {
      await c.query("BEGIN");
      const row=(await c.query("SELECT owner_id,status FROM wave_vault_files WHERE id=$1 FOR UPDATE",[id])).rows[0];
      if(!row||row.owner_id!==user)throw new VaultError(404,"Private file unavailable");
      if(row.status!=="ready")throw new VaultError(409,"Only verified files can be shared");
      if(target===user)throw new VaultError(400,"The owner already has access");
      if(!(await c.query("SELECT id FROM users WHERE id=$1 AND is_active=true FOR UPDATE",[target])).rows.length)
        throw new VaultError(404,"Recipient unavailable");
      const existing=(await c.query("SELECT 1 FROM wave_vault_grants WHERE file_id=$1 AND user_id=$2",[id,target])).rows.length;
      const incoming=(await c.query(`SELECT count(*) AS n FROM wave_vault_grants g
        JOIN wave_vault_files f ON f.id=g.file_id WHERE g.user_id=$1 AND f.status='ready'`,[target])).rows[0].n;
      if(!existing&&Number(incoming)>=WAVE_VAULT_LIMITS.maxSharedFiles)throw new VaultError(409,"Recipient shared-file limit reached");
      const n=(await c.query("SELECT count(*) AS n FROM wave_vault_grants WHERE file_id=$1",[id])).rows[0].n;
      if(Number(n)>=50 && !(await c.query("SELECT 1 FROM wave_vault_grants WHERE file_id=$1 AND user_id=$2",[id,target])).rows.length)
        throw new VaultError(409,"A private file supports at most 50 recipients");
      await c.query(`INSERT INTO wave_vault_grants(file_id,user_id,wave_address) VALUES($1,$2,$3)
        ON CONFLICT(file_id,user_id) DO UPDATE SET wave_address=EXCLUDED.wave_address`,[id,target,address]);
      await c.query("COMMIT");
    }catch(error){await c.query("ROLLBACK");throw error;}finally{c.release();}
  }
  async revoke(user:string,id:string,target:string) {
    const c=await this.pool.connect();
    try{
      await c.query("BEGIN");
      const f=(await c.query("SELECT owner_id,status FROM wave_vault_files WHERE id=$1 FOR UPDATE",[id])).rows[0];
      if(!f||f.owner_id!==user||f.status==="deleted")throw new VaultError(404,"Private file unavailable");
      await c.query("DELETE FROM wave_vault_grants WHERE file_id=$1 AND user_id=$2",[id,target]);
      await c.query("COMMIT");
    }catch(error){await c.query("ROLLBACK");throw error;}finally{c.release();}
    this.events.emit("revoke",id,target);
  }
  async allowed(user:string,id:string,upload:boolean) {
    try{const row=await this.file(user,id,upload);return row.status===(upload?"uploading":"ready");}catch{return false;}
  }
}
