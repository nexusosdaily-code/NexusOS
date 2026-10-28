import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import pg from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrivateTrustService } from "./private-trust-service";
import { openTrust, sealTrust, validateEvidence } from "./private-trust-security";
import { trustConsentVersion } from "../../shared/private-trust";

const storage = vi.hoisted(()=>({objects:new Map<string,string>(),failDelete:false,publicBucket:false}));
vi.mock("../objectStorage",()=>({
  objectStorageClient:{bucket:()=>({
    file:(path:string)=>({
      bucket:{getMetadata:async()=>[{iamConfiguration:{publicAccessPrevention:storage.publicBucket?"inherited":"enforced"}}]},
      save:async(content:string)=>{storage.objects.set(path,content);},
      download:async()=>[Buffer.from(storage.objects.get(path) ?? "")],
      delete:async()=>{if (storage.failDelete) throw new Error("Synthetic storage outage"); storage.objects.delete(path);},
    }),
  })},
}));

// Isolated synthetic test schema; no real names, evidence, accounts or wallet data.
const schema = `private_trust_test_${randomUUID().replaceAll("-","")}`;
const root = new pg.Pool({connectionString:process.env.DATABASE_URL});
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
const service = new PrivateTrustService(pool);
const owner = {id:randomUUID()}, other = {id:randomUUID()}, reader = {id:randomUUID()};
const reviewers = Array.from({length:4},()=>({id:randomUUID()}));
const consent = {consent:true as const,consentVersion:trustConsentVersion};
const syntheticEncryptionKey = randomBytes(32).toString("hex");
let workspaceId:string;

async function authority(actor:{id:string}, role:string, controller=actor.id) {
  await pool.query(
    `INSERT INTO private_identity_trust_authority(user_id,workspace_id,role,controller_id)
     VALUES($1,$2,$3,$4) ON CONFLICT(user_id,workspace_id,role)
     DO UPDATE SET controller_id=$4,revoked_at=NULL,verified_human=true,independently_verified=true,role_reviewed=true,
       identity_expires_at=now()+interval '1 day',authority_expires_at=now()+interval '1 day'`,
    [actor.id,workspaceId,role,controller]);
}
async function grant(actor:{id:string},role:"reviewer"|"reader"|"contributor"|"custodian",controller=actor.id) {
  await authority(actor,role,controller);
  await service.member(owner,workspaceId,{userId:actor.id,role});
  await service.consent(actor,workspaceId,consent);
}
async function draft() {
  return service.addRecord(owner,workspaceId,{...consent,type:"instrument",body:"Synthetic private draft only",retentionDays:3});
}
async function evidence() {
  return service.addEvidence(owner,workspaceId,{
    ...consent,type:"birth-certificate",mediaType:"application/pdf",
    content:Buffer.from("%PDF-synthetic-test-not-a-certificate").toString("base64"),retentionDays:1,
  });
}
beforeAll(async()=>{
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for isolated private trust tests");
  vi.stubEnv("TRUST_EVIDENCE_KEY",syntheticEncryptionKey);
  vi.stubEnv("PRIVATE_OBJECT_DIR","/synthetic-private-bucket/private");
  await root.query(`CREATE SCHEMA ${schema}`);
  await pool.query("CREATE TABLE users(id varchar(36) PRIMARY KEY)");
  for (const actor of [owner,other,reader,...reviewers]) await pool.query("INSERT INTO users(id) VALUES($1)",[actor.id]);
  await pool.query(await readFile("migrations/private-trust.sql","utf8"));
  // Synthetic adapter fixtures do not constitute actual independent verification.
  await pool.query(`CREATE TABLE private_identity_trust_authority(
    user_id varchar(36),workspace_id uuid,role text,controller_id text,
    verified_human boolean DEFAULT true, independently_verified boolean DEFAULT true,
    role_reviewed boolean DEFAULT true,identity_expires_at timestamptz DEFAULT now()+interval '1 day',
    authority_expires_at timestamptz DEFAULT now()+interval '1 day',revoked_at timestamptz,
    PRIMARY KEY(user_id,workspace_id,role))`);
},30000);
beforeEach(async()=>{
  vi.stubEnv("TRUST_EVIDENCE_UPLOADS_ENABLED","true"); // Synthetic fixtures only; deployed default is disabled.
  storage.objects.clear(); storage.failDelete=false; storage.publicBucket=false;
  const workspace = await service.create(owner,{...consent,kind:"family",label:"Synthetic draft room"});
  workspaceId=workspace.id;
  await authority(owner,"custodian");
});
afterAll(async()=>{
  vi.unstubAllEnvs();
  await pool.end();
  await root.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await root.end();
});

describe("private trust access and encryption",()=>{
  it("keeps evidence and lineage/beneficiary submissions disabled even with working encryption and storage",async()=>{
    for (const flag of [undefined,"false","TRUE","1"]) {
      vi.stubEnv("TRUST_EVIDENCE_UPLOADS_ENABLED",flag);
      expect(await service.status()).toMatchObject({storageReady:true,evidenceUploadsEnabled:false});
      await expect(evidence()).rejects.toMatchObject({status:503});
      for (const type of ["lineage","beneficiary"]) {
        await expect(service.addRecord(owner,workspaceId,{...consent,type,body:"Synthetic private note",retentionDays:1})).rejects.toMatchObject({status:503});
      }
    }
    expect(storage.objects.size).toBe(0);
    const {rows}=await pool.query("SELECT count(*)::int AS count FROM private_trust_records WHERE workspace_id=$1",[workspaceId]);
    expect(rows[0].count).toBe(0);
    await expect(draft()).resolves.toMatchObject({state:"draft"});
    await expect(service.addRecord(owner,workspaceId,{...consent,type:"discussion",body:"Synthetic non-evidence discussion",retentionDays:1})).resolves.toMatchObject({state:"draft"});
  });
  it("separates family and charitable purposes without issuing voting or wallet authority",async()=>{
    const charity = await service.create(owner,{...consent,kind:"charitable",label:"Synthetic charitable room"});
    expect(charity.kind).toBe("charitable");
    expect(charity.authorityPending).toBe(true);
    expect((await service.detail(owner,workspaceId)).kind).toBe("family");
    expect((await service.status()).walletForwardingEnabled).toBe(false);
    const {rows} = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema=$1",[schema]);
    expect(rows.some(r=>/ballot|wallet|blockchain|community_person/.test(r.table_name))).toBe(false);
  });
  it("encrypts metadata and forum records and binds ciphertext to its exact context",async()=>{
    const record = await service.addRecord(owner,workspaceId,{...consent,type:"lineage",body:"Synthetic confidential lineage note",retentionDays:2});
    const {rows} = await pool.query("SELECT payload FROM private_trust_records WHERE id=$1",[record.id]);
    expect(rows[0].payload).not.toContain("confidential");
    const detail = await service.detail(owner,workspaceId);
    expect(detail.records[0].body).toBe("Synthetic confidential lineage note");
    const cipher=sealTrust(Buffer.from("synthetic"),"test-a");
    expect(()=>openTrust(cipher,"test-b")).toThrow();
    const parts=cipher.split("."); parts[2]=Buffer.from("tamper").toString("base64");
    expect(()=>openTrust(parts.join("."),"test-a")).toThrow();
  });
  it("requires independent identity and reviewed role, never a certificate or admin bypass",async()=>{
    await pool.query("UPDATE private_identity_trust_authority SET independently_verified=false WHERE user_id=$1 AND workspace_id=$2",[owner.id,workspaceId]);
    await expect(service.detail(owner,workspaceId)).rejects.toMatchObject({status:403});
    await expect(evidence()).rejects.toMatchObject({status:403});
    expect(storage.objects.size).toBe(0);
    await expect(service.detail(other,workspaceId)).rejects.toMatchObject({status:404});
    await authority(owner,"custodian");
    await pool.query("UPDATE private_identity_trust_authority SET role_reviewed=false WHERE user_id=$1 AND workspace_id=$2",[owner.id,workspaceId]);
    await expect(service.detail(owner,workspaceId)).rejects.toMatchObject({status:403});
  });
  it("does not permit human=false, revoked, expired or wrong-workspace credentials",async()=>{
    for (const condition of ["verified_human=false","revoked_at=now()","identity_expires_at=now()","authority_expires_at=now()"]) {
      await authority(owner,"custodian");
      await pool.query(`UPDATE private_identity_trust_authority SET ${condition} WHERE user_id=$1 AND workspace_id=$2`,[owner.id,workspaceId]);
      await expect(service.detail(owner,workspaceId)).rejects.toMatchObject({status:403});
    }
  });
  it("fails closed when the shared identity adapter is missing",async()=>{
    await pool.query("ALTER TABLE private_identity_trust_authority RENAME TO unavailable_authority");
    try { await expect(service.detail(owner,workspaceId)).rejects.toMatchObject({status:503}); }
    finally { await pool.query("ALTER TABLE unavailable_authority RENAME TO private_identity_trust_authority"); }
  });
  it("requires participant consent, limits reader writes and immediately revokes reads",async()=>{
    await authority(reader,"reader");
    await service.member(owner,workspaceId,{userId:reader.id,role:"reader"});
    await expect(service.detail(reader,workspaceId)).rejects.toMatchObject({status:403});
    await service.consent(reader,workspaceId,consent);
    await service.detail(reader,workspaceId);
    await expect(service.addRecord(reader,workspaceId,{...consent,type:"discussion",body:"Synthetic note",retentionDays:1})).rejects.toMatchObject({status:403});
    await service.revoke(owner,workspaceId,reader.id);
    await expect(service.detail(reader,workspaceId)).rejects.toMatchObject({status:404});
  });
  it("cannot grant a role that the independent platform has not separately reviewed",async()=>{
    await expect(service.member(owner,workspaceId,{userId:other.id,role:"custodian"})).rejects.toMatchObject({status:403});
    await authority(other,"reader");
    await expect(service.member(owner,workspaceId,{userId:other.id,role:"custodian"})).rejects.toMatchObject({status:403});
    await expect(service.member(owner,workspaceId,{userId:owner.id,role:"reviewer"})).rejects.toMatchObject({status:403});
  });
});
describe("private trust evidence, audit and retention",()=>{
  it("stores only encrypted evidence in approved private storage and audits authorised download",async()=>{
    const record=await evidence();
    expect([...storage.objects.values()][0]).not.toContain("%PDF");
    expect((await service.download(owner,workspaceId,record.id)).content.toString()).toContain("%PDF-synthetic");
    await expect(service.download(other,workspaceId,record.id)).rejects.toMatchObject({status:404});
    const {rows}=await pool.query("SELECT * FROM private_trust_audit WHERE workspace_id=$1",[workspaceId]);
    expect(rows.some(r=>r.action==="evidence-downloaded")).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("%PDF");
    await expect(pool.query("DELETE FROM private_trust_audit WHERE workspace_id=$1",[workspaceId])).rejects.toThrow("immutable");
  });
  it("rejects non-private buckets and invalid evidence before persisting a record",async()=>{
    storage.publicBucket=true;
    await expect(evidence()).rejects.toMatchObject({status:503});
    expect(storage.objects.size).toBe(0);
    expect(()=>validateEvidence(Buffer.from("not-pdf").toString("base64"),"application/pdf")).toThrow();
    expect(()=>validateEvidence("invalid$$","image/png")).toThrow();
    expect(()=>validateEvidence(Buffer.alloc(5*1024*1024+1).toString("base64"),"image/jpeg")).toThrow();
  });
  it("makes retention-expired evidence inaccessible immediately and physically erases it",async()=>{
    const record=await evidence();
    await pool.query("UPDATE private_trust_records SET expires_at=now() WHERE id=$1",[record.id]);
    await expect(service.download(owner,workspaceId,record.id)).rejects.toMatchObject({status:404});
    expect((await service.detail(owner,workspaceId)).records).toHaveLength(0);
    await service.pruneExpired();
    expect(storage.objects.size).toBe(0);
    const {rows}=await pool.query("SELECT payload,object_id,deleted_at FROM private_trust_records WHERE id=$1",[record.id]);
    expect(rows[0].payload).toBe(""); expect(rows[0].object_id).toBeNull(); expect(rows[0].deleted_at).not.toBeNull();
  });
  it("allows privacy withdrawal after verifier expiry and erases contributed records",async()=>{
    await evidence(); await draft();
    await pool.query("UPDATE private_identity_trust_authority SET revoked_at=now() WHERE user_id=$1 AND workspace_id=$2",[owner.id,workspaceId]);
    await service.withdraw(owner,workspaceId);
    expect(storage.objects.size).toBe(0);
    expect(await service.list(owner)).not.toContainEqual(expect.objectContaining({id:workspaceId}));
    const {rows}=await pool.query("SELECT count(*)::integer AS count FROM private_trust_records WHERE workspace_id=$1 AND deleted_at IS NULL",[workspaceId]);
    expect(rows[0].count).toBe(0);
  });
  it("does not falsely report deletion when asset destruction fails",async()=>{
    const record=await evidence(); storage.failDelete=true;
    await expect(service.remove(owner,workspaceId,record.id)).rejects.toThrow();
    const {rows}=await pool.query("SELECT deleted_at FROM private_trust_records WHERE id=$1",[record.id]);
    expect(rows[0].deleted_at).toBeNull();
    expect(storage.objects.size).toBe(1);
  });
  it("destroys owner settings and ciphertext on withdrawal even when the encryption key is unavailable",async()=>{
    await evidence(); await draft();
    vi.stubEnv("TRUST_EVIDENCE_KEY","");
    try {
      await service.withdraw(owner,workspaceId);
      expect(storage.objects.size).toBe(0);
      const {rows}=await pool.query("SELECT payload FROM private_trust_workspaces WHERE id=$1",[workspaceId]);
      expect(rows[0].payload).toBe("");
    } finally {vi.stubEnv("TRUST_EVIDENCE_KEY",syntheticEncryptionKey);}
  });
  it("expires the whole workspace, destroys settings and evidence, and revokes participants",async()=>{
    await evidence(); await grant(reader,"reader");
    await pool.query("UPDATE private_trust_workspaces SET expires_at=now() WHERE id=$1",[workspaceId]);
    await expect(service.detail(reader,workspaceId)).rejects.toMatchObject({status:404});
    await service.pruneExpired();
    expect(storage.objects.size).toBe(0);
    const {rows}=await pool.query("SELECT payload,closed_at FROM private_trust_workspaces WHERE id=$1",[workspaceId]);
    expect(rows[0].payload).toBe("");expect(rows[0].closed_at).not.toBeNull();
  });
});
describe("immutable private instrument review",()=>{
  it("requires three separate current controllers for the exact version and records law privately without enacting or forwarding",async()=>{
    const record=await draft();
    const second=await draft();
    expect(second.version).toBe(record.version+1);
    await service.submit(owner,workspaceId,record.id);
    const legal={governingLaw:"Synthetic jurisdiction for tests only",instrumentId:record.id,authorisedInstrumentConfirmed:true,qualifiedLegalAdviceConfirmed:true};
    for (let i=0;i<3;i++) {
      await grant(reviewers[i],"reviewer");
      await service.review(reviewers[i],workspaceId,record.id,{decision:"approve"});
      if (i<2) await expect(service.legal(owner,workspaceId,legal)).rejects.toMatchObject({status:409});
    }
    const result=await service.legal(owner,workspaceId,legal);
    expect(result).toEqual({recorded:true,legalEnactmentEnabled:false,walletForwardingEnabled:false});
    await expect(service.legal(owner,workspaceId,{...legal,instrumentId:second.id})).rejects.toMatchObject({status:409});
    await service.remove(owner,workspaceId,record.id);
    expect((await service.detail(owner,workspaceId)).settings.confirmedInstrumentId).toBeNull();
  });
  it("rejects duplicate-controller and owner-controller approvals and blocks legal confirmation after revocation",async()=>{
    const record=await draft(); await service.submit(owner,workspaceId,record.id);
    await grant(reviewers[0],"reviewer");
    await grant(reviewers[1],"reviewer",reviewers[0].id);
    await service.review(reviewers[0],workspaceId,record.id,{decision:"approve"});
    await expect(service.review(reviewers[1],workspaceId,record.id,{decision:"approve"})).rejects.toMatchObject({code:"23505"});
    await authority(reviewers[1],"reviewer",owner.id);
    await expect(service.review(reviewers[1],workspaceId,record.id,{decision:"approve"})).rejects.toMatchObject({status:403});
    await authority(reviewers[1],"reviewer");
    await grant(reviewers[2],"reviewer");
    await service.review(reviewers[1],workspaceId,record.id,{decision:"approve"});
    await service.review(reviewers[2],workspaceId,record.id,{decision:"approve"});
    await service.revoke(owner,workspaceId,reviewers[0].id);
    await expect(service.legal(owner,workspaceId,{governingLaw:"Synthetic test law",instrumentId:record.id,authorisedInstrumentConfirmed:true,qualifiedLegalAdviceConfirmed:true})).rejects.toMatchObject({status:409});
  });
  it("keeps rejection final for that version and refuses review replay",async()=>{
    const record=await draft(); await service.submit(owner,workspaceId,record.id);
    await grant(reviewers[0],"reviewer");
    await service.review(reviewers[0],workspaceId,record.id,{decision:"reject"});
    await expect(service.review(reviewers[0],workspaceId,record.id,{decision:"approve"})).rejects.toMatchObject({status:409});
    expect((await service.detail(owner,workspaceId)).records[0].state).toBe("rejected");
  });
});
