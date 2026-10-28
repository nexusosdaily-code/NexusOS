import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  trustConsentVersion, trustCreateSchema, trustRecordSchema, trustEvidenceSchema,
  trustMemberSchema, trustReviewSchema, trustLegalSchema, type TrustRole,
} from "../../shared/private-trust";
import {
  TrustError, sealTrust, openTrust, trustFile, trustStorageReady,
  verifiedTrustAuthority, validateEvidence, assertPrivateTrustStorage,
  trustEvidenceUploadsEnabled, assertTrustEvidenceUploadsEnabled,
} from "./private-trust-security";

type Actor = { id: string };
type Member = { role: TrustRole };
const jsonSeal = (data: unknown, context: string) => sealTrust(Buffer.from(JSON.stringify(data)), context);
const jsonOpen = (payload: string, context: string) => JSON.parse(openTrust(payload,context).toString());
const context = (workspaceId: string, recordId?: string) => `private-trust:${workspaceId}:${recordId ?? "settings"}`;
const writable: TrustRole[] = ["custodian","contributor"];

export class PrivateTrustService {
  constructor(private pool: Pool) {}

  private async transaction<T>(work: (client: PoolClient)=>Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const value = await work(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  private async audit(client: PoolClient, actor: Actor, workspaceId: string, action: string, targetId?: string) {
    await client.query("INSERT INTO private_trust_audit(workspace_id,actor_id,action,target_id) VALUES($1,$2,$3,$4)",
      [workspaceId,actor.id,action,targetId ?? null]);
  }
  private async access(client: PoolClient, actor: Actor, workspaceId: string, roles?: TrustRole[]) {
    // Lock the workspace throughout authorisation and mutation, including grant/revoke.
    const { rows: spaces } = await client.query("SELECT * FROM private_trust_workspaces WHERE id=$1 AND closed_at IS NULL AND expires_at>now() FOR UPDATE", [workspaceId]);
    const { rows } = await client.query(
      "SELECT role,consent_version FROM private_trust_members WHERE workspace_id=$1 AND user_id=$2 AND revoked_at IS NULL",
      [workspaceId,actor.id]);
    if (!spaces.length || !rows.length) throw new TrustError(404,"Private workspace not found");
    const member = rows[0] as Member & {consent_version:string};
    if (roles && !roles.includes(member.role)) throw new TrustError(403,"This trust role cannot perform that action");
    if (member.consent_version !== trustConsentVersion) throw new TrustError(403,"Current private workspace consent is required");
    const authority = await verifiedTrustAuthority(client,actor.id,workspaceId,member.role);
    return {member,authority,workspace:spaces[0]};
  }
  async status() {
    const {rows} = await this.pool.query("SELECT to_regclass('public.private_identity_trust_authority') IS NOT NULL AS identity_ready");
    return {
      storageReady:trustStorageReady(),
      evidenceUploadsEnabled:trustEvidenceUploadsEnabled(),
      identityReady:rows[0].identity_ready,
      consentVersion:trustConsentVersion,
      walletForwardingEnabled:false, legalEnactmentEnabled:false,
      verification:"Independent human verification plus separately reviewed workspace role required",
    };
  }
  async list(actor: Actor) {
    return this.transaction(async client=>{
      const {rows} = await client.query(
        `SELECT w.id,w.kind,w.owner_id,m.role,m.consent_version FROM private_trust_workspaces w
         JOIN private_trust_members m ON m.workspace_id=w.id
         WHERE m.user_id=$1 AND m.revoked_at IS NULL AND w.closed_at IS NULL AND w.expires_at>now() ORDER BY w.created_at DESC`,[actor.id]);
      // No private instrument/lineage/settings returned before full authority checking.
      return rows.map(({id,kind,role,consent_version})=>({id,kind,role,consentRequired:consent_version!==trustConsentVersion}));
    });
  }
  async create(actor: Actor, input: unknown) {
    const data = trustCreateSchema.parse(input);
    return this.transaction(async client=>{
      const id = randomUUID();
      await client.query("INSERT INTO private_trust_workspaces(id,owner_id,kind,payload) VALUES($1,$2,$3,$4)",
        [id,actor.id,data.kind,jsonSeal({label:data.label,governingLaw:null,confirmedInstrumentId:null},context(id))]);
      await client.query("INSERT INTO private_trust_members(workspace_id,user_id,role,consent_version,consent_at) VALUES($1,$2,'custodian',$3,now())",
        [id,actor.id,trustConsentVersion]);
      await this.audit(client,actor,id,"draft-workspace-created");
      // A custodian membership is not a reviewed authority credential.
      return {id,kind:data.kind,role:"custodian",authorityPending:true};
    });
  }
  async consent(actor: Actor, workspaceId: string, input: unknown) {
    trustCreateSchema.pick({consent:true,consentVersion:true}).parse(input);
    return this.transaction(async client=>{
      const {rowCount} = await client.query(
        "UPDATE private_trust_members SET consent_version=$3,consent_at=now() WHERE workspace_id=$1 AND user_id=$2 AND revoked_at IS NULL",
        [workspaceId,actor.id,trustConsentVersion]);
      if (!rowCount) throw new TrustError(404,"Private workspace not found");
      await this.audit(client,actor,workspaceId,"privacy-consent-recorded");
      return {consented:true};
    });
  }
  async detail(actor: Actor, workspaceId: string) {
    return this.transaction(async client=>{
      const {workspace,member} = await this.access(client,actor,workspaceId);
      const settings = workspace.payload ? jsonOpen(workspace.payload,context(workspaceId)) : {label:"Private workspace",governingLaw:null,confirmedInstrumentId:null};
      const {rows:records} = await client.query(
        `SELECT id,type,version,state,expires_at,created_at,author_id,object_id,payload
         FROM private_trust_records WHERE workspace_id=$1 AND deleted_at IS NULL AND expires_at>now() ORDER BY version DESC`,[workspaceId]);
      if (workspace.confirmation_invalidated || !records.some(r=>r.id===settings.confirmedInstrumentId)) settings.confirmedInstrumentId=null;
      const {rows:members} = member.role === "custodian"
        ? await client.query("SELECT user_id,role,consent_version,revoked_at FROM private_trust_members WHERE workspace_id=$1",[workspaceId])
        : {rows:[]};
      const {rows:audit} = member.role === "custodian"
        ? await client.query("SELECT action,target_id,created_at FROM private_trust_audit WHERE workspace_id=$1 ORDER BY id DESC LIMIT 100",[workspaceId])
        : {rows:[]};
      await this.audit(client,actor,workspaceId,"workspace-read");
      return {id:workspaceId,kind:workspace.kind,role:member.role,settings,members,audit,expiresAt:workspace.expires_at,
        records:records.map(({payload,object_id,author_id,...r})=>({
          ...r,own:author_id===actor.id,evidence:!!object_id,...jsonOpen(payload,context(workspaceId,r.id)),
        })),walletForwardingEnabled:false,legalEnactmentEnabled:false};
    });
  }
  private async insertRecord(client: PoolClient, actor: Actor, workspaceId: string, type: string, payload: unknown, days: number, objectId?: string, id = randomUUID()) {
    const {rows} = await client.query("SELECT COALESCE(MAX(version),0)+1 AS version FROM private_trust_records WHERE workspace_id=$1",[workspaceId]);
    await client.query(
      `INSERT INTO private_trust_records(id,workspace_id,author_id,type,version,payload,object_id,expires_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,now()+$8*interval '1 day')`,
      [id,workspaceId,actor.id,type,rows[0].version,jsonSeal(payload,context(workspaceId,id)),objectId ?? null,days]);
    await this.audit(client,actor,workspaceId,"private-record-created",id);
    return {id,version:rows[0].version,state:"draft"};
  }
  async addRecord(actor: Actor, workspaceId: string, input: unknown) {
    const data = trustRecordSchema.parse(input);
    if (data.type === "lineage" || data.type === "beneficiary") assertTrustEvidenceUploadsEnabled();
    return this.transaction(async client=>{
      await this.access(client,actor,workspaceId,writable);
      return this.insertRecord(client,actor,workspaceId,data.type,{body:data.body,consentVersion:data.consentVersion},data.retentionDays);
    });
  }
  async addEvidence(actor: Actor, workspaceId: string, input: unknown) {
    assertTrustEvidenceUploadsEnabled();
    const data = trustEvidenceSchema.parse(input);
    const content = validateEvidence(data.content,data.mediaType);
    const id = randomUUID(), objectId = randomUUID();
    let saved = false;
    try {
      return await this.transaction(async client=>{
        await this.access(client,actor,workspaceId,writable);
        const file = await assertPrivateTrustStorage(workspaceId,objectId);
        await file.save(sealTrust(content,context(workspaceId,id)), {
          resumable:false,contentType:"application/octet-stream",
          metadata:{metadata:{visibility:"private"}},
        });
        saved = true;
        return this.insertRecord(client,actor,workspaceId,data.type,{mediaType:data.mediaType,consentVersion:data.consentVersion},data.retentionDays,objectId,id);
      });
    } catch (error) {
      if (saved) await trustFile(workspaceId,objectId).delete({ignoreNotFound:true});
      throw error;
    }
  }
  async download(actor: Actor, workspaceId: string, recordId: string) {
    return this.transaction(async client=>{
      await this.access(client,actor,workspaceId);
      const record = await this.record(client,workspaceId,recordId);
      if (!record.object_id) throw new TrustError(404,"Evidence not found");
      const [encrypted] = await trustFile(workspaceId,record.object_id).download();
      const content = openTrust(encrypted.toString(),context(workspaceId,recordId));
      await this.audit(client,actor,workspaceId,"evidence-downloaded",recordId);
      // Always download as an attachment, never render an untrusted PDF inline.
      return {content};
    });
  }
  private async record(client: PoolClient, workspaceId: string, recordId: string) {
    const {rows} = await client.query(
      "SELECT * FROM private_trust_records WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL AND expires_at>now() FOR UPDATE",
      [recordId,workspaceId]);
    if (!rows.length) throw new TrustError(404,"Private record not found or retention expired");
    return rows[0];
  }
  private async currentReviewControllers(client: PoolClient, workspaceId: string, recordId: string) {
    const {rows:reviews} = await client.query(
      `SELECT r.reviewer_id,r.controller_id FROM private_trust_reviews r
       JOIN private_trust_members m ON m.user_id=r.reviewer_id AND m.workspace_id=$2
       WHERE r.record_id=$1 AND r.decision='approve' AND r.expires_at>now()
         AND m.role='reviewer' AND m.revoked_at IS NULL AND m.consent_version=$3`,
      [recordId,workspaceId,trustConsentVersion]);
    const controllers = new Set<string>();
    for (const review of reviews) {
      try {
        const authority = await verifiedTrustAuthority(client,review.reviewer_id,workspaceId,"reviewer");
        if (authority.controllerId===review.controller_id) controllers.add(authority.controllerId);
      } catch(error) {
        if (!(error instanceof TrustError && error.status===403)) throw error;
      }
    }
    return controllers;
  }
  async submit(actor: Actor, workspaceId: string, recordId: string) {
    return this.transaction(async client=>{
      await this.access(client,actor,workspaceId,writable);
      const record = await this.record(client,workspaceId,recordId);
      if (record.type!=="instrument" || record.state!=="draft") throw new TrustError(409,"Only a draft instrument can be submitted");
      await client.query("UPDATE private_trust_records SET state='under-review' WHERE id=$1",[recordId]);
      await this.audit(client,actor,workspaceId,"instrument-submitted",recordId);
      return {state:"under-review"};
    });
  }
  async review(actor: Actor, workspaceId: string, recordId: string, input: unknown) {
    const data = trustReviewSchema.parse(input);
    return this.transaction(async client=>{
      const {authority,workspace} = await this.access(client,actor,workspaceId,["reviewer"]);
      const record = await this.record(client,workspaceId,recordId);
      if (record.type!=="instrument" || record.state!=="under-review") throw new TrustError(409,"Instrument is not under review");
      if (record.author_id===actor.id || workspace.owner_id===actor.id) throw new TrustError(403,"Self-review is prohibited");
      // A common controller cannot review their own instrument through another account.
      const {rows:authors} = await client.query(
        "SELECT role FROM private_trust_members WHERE workspace_id=$1 AND user_id=$2 AND revoked_at IS NULL",
        [workspaceId,record.author_id]);
      if (!authors.length || !writable.includes(authors[0].role)) throw new TrustError(403,"Current instrument author authority is required");
      const authorAuthority = await verifiedTrustAuthority(client,record.author_id,workspaceId,authors[0].role);
      const ownerAuthority = await verifiedTrustAuthority(client,workspace.owner_id,workspaceId,"custodian");
      if ([authorAuthority.controllerId,ownerAuthority.controllerId].includes(authority.controllerId)) throw new TrustError(403,"Independent reviewer control is required");
      await client.query(
        "INSERT INTO private_trust_reviews(record_id,reviewer_id,controller_id,decision,expires_at) VALUES($1,$2,$3,$4,$5)",
        [recordId,actor.id,authority.controllerId,data.decision,authority.expiresAt]);
      if (data.decision==="reject") await client.query("UPDATE private_trust_records SET state='rejected' WHERE id=$1",[recordId]);
      else {
        const controllers = await this.currentReviewControllers(client,workspaceId,recordId);
        if (controllers.size>=3) await client.query("UPDATE private_trust_records SET state='approved' WHERE id=$1",[recordId]);
      }
      await this.audit(client,actor,workspaceId,`instrument-${data.decision}`,recordId);
      return {reviewRecorded:true};
    });
  }
  async member(actor: Actor, workspaceId: string, input: unknown) {
    const data = trustMemberSchema.parse(input);
    return this.transaction(async client=>{
      await this.access(client,actor,workspaceId,["custodian"]);
      if (data.userId===actor.id) throw new TrustError(403,"You cannot change your own trust role");
      await verifiedTrustAuthority(client,data.userId,workspaceId,data.role);
      await client.query(
        `INSERT INTO private_trust_members(workspace_id,user_id,role) VALUES($1,$2,$3)
         ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=$3,revoked_at=NULL,consent_version=NULL,consent_at=NULL`,
        [workspaceId,data.userId,data.role]);
      await this.audit(client,actor,workspaceId,"participant-role-granted",data.userId);
      return {granted:true,consentRequired:true};
    });
  }
  async revoke(actor: Actor, workspaceId: string, userId: string) {
    return this.transaction(async client=>{
      await this.access(client,actor,workspaceId,["custodian"]);
      if (actor.id===userId) throw new TrustError(409,"Use privacy withdrawal to revoke your own access");
      const {rowCount} = await client.query("UPDATE private_trust_members SET revoked_at=now() WHERE workspace_id=$1 AND user_id=$2 AND revoked_at IS NULL",[workspaceId,userId]);
      if (!rowCount) throw new TrustError(404,"Participant not found");
      await this.audit(client,actor,workspaceId,"participant-access-revoked",userId);
      return {revoked:true};
    });
  }
  private async erase(client: PoolClient, actor: Actor, record: any, action: string) {
    if (record.object_id) await trustFile(record.workspace_id,record.object_id).delete({ignoreNotFound:true});
    await client.query("UPDATE private_trust_records SET payload='',object_id=NULL,deleted_at=now() WHERE id=$1",[record.id]);
    await this.audit(client,actor,record.workspace_id,action,record.id);
    // Destruction invalidates preparation confirmation conservatively. Erasure
    // never depends on being able to decrypt a lost/retired key.
    await client.query("UPDATE private_trust_workspaces SET confirmation_invalidated=true WHERE id=$1",[record.workspace_id]);
  }
  async remove(actor: Actor, workspaceId: string, recordId: string) {
    return this.transaction(async client=>{
      const {member} = await this.access(client,actor,workspaceId);
      const record = await this.record(client,workspaceId,recordId);
      if (record.author_id!==actor.id && member.role!=="custodian") throw new TrustError(403,"Only the contributor or custodian may delete this record");
      await this.erase(client,actor,record,"private-record-deleted");
      return {deleted:true};
    });
  }
  async withdraw(actor: Actor, workspaceId: string) {
    // Withdrawal must remain available even when verifier/authority expires.
    return this.transaction(async client=>{
      const {rows:spaces} = await client.query("SELECT id,owner_id FROM private_trust_workspaces WHERE id=$1 FOR UPDATE",[workspaceId]);
      const {rows:members} = await client.query("SELECT user_id FROM private_trust_members WHERE workspace_id=$1 AND user_id=$2 AND revoked_at IS NULL",[workspaceId,actor.id]);
      if (!spaces.length || !members.length) throw new TrustError(404,"Private workspace not found");
      const {rows} = await client.query("SELECT * FROM private_trust_records WHERE workspace_id=$1 AND author_id=$2 AND deleted_at IS NULL FOR UPDATE",[workspaceId,actor.id]);
      for (const record of rows) await this.erase(client,actor,record,"consent-withdrawal-erasure");
      if (spaces[0].owner_id===actor.id) {
        await client.query("UPDATE private_trust_workspaces SET payload='',confirmation_invalidated=true WHERE id=$1",[workspaceId]);
      }
      await client.query("UPDATE private_trust_members SET consent_version=NULL,consent_at=NULL,revoked_at=now() WHERE workspace_id=$1 AND user_id=$2",[workspaceId,actor.id]);
      await this.audit(client,actor,workspaceId,"privacy-consent-withdrawn");
      return {withdrawn:true};
    });
  }
  async legal(actor: Actor, workspaceId: string, input: unknown) {
    const data = trustLegalSchema.parse(input);
    return this.transaction(async client=>{
      const {workspace} = await this.access(client,actor,workspaceId,["custodian"]);
      const record = await this.record(client,workspaceId,data.instrumentId);
      if (record.type!=="instrument" || record.state!=="approved") throw new TrustError(409,"The exact instrument version must first pass independent review");
      const controllers = await this.currentReviewControllers(client,workspaceId,record.id);
      if (controllers.size<3) throw new TrustError(409,"Three current independently controlled reviews are required");
      const settings = workspace.payload ? jsonOpen(workspace.payload,context(workspaceId)) : {label:"Private workspace"};
      await client.query("UPDATE private_trust_workspaces SET payload=$2,confirmation_invalidated=false WHERE id=$1",
        [workspaceId,jsonSeal({...settings,governingLaw:data.governingLaw,confirmedInstrumentId:data.instrumentId,legalAdviceAcknowledged:true},context(workspaceId))]);
      await this.audit(client,actor,workspaceId,"private-law-and-instrument-confirmed",data.instrumentId);
      return {recorded:true,legalEnactmentEnabled:false,walletForwardingEnabled:false};
    });
  }
  async pruneExpired() {
    // TTL blocks reads immediately; this sweep also physically destroys expired payloads.
    return this.transaction(async client=>{
      const {rows:expiredSpaces} = await client.query(
        "SELECT id,owner_id FROM private_trust_workspaces WHERE closed_at IS NULL AND expires_at<=now() ORDER BY id LIMIT 50 FOR UPDATE");
      for (const space of expiredSpaces) {
        const {rows:records} = await client.query("SELECT * FROM private_trust_records WHERE workspace_id=$1 AND deleted_at IS NULL FOR UPDATE",[space.id]);
        for (const record of records) await this.erase(client,{id:record.author_id},record,"workspace-expiry-erasure");
        await client.query("UPDATE private_trust_workspaces SET payload='',closed_at=now(),confirmation_invalidated=true WHERE id=$1",[space.id]);
        await client.query("UPDATE private_trust_members SET revoked_at=now(),consent_version=NULL,consent_at=NULL WHERE workspace_id=$1",[space.id]);
        await this.audit(client,{id:space.owner_id},space.id,"workspace-retention-closed");
      }
      const {rows:spaces} = await client.query(
        "SELECT DISTINCT workspace_id FROM private_trust_records WHERE deleted_at IS NULL AND expires_at<=now() LIMIT 50");
      for (const space of spaces) {
        await client.query("SELECT id FROM private_trust_workspaces WHERE id=$1 FOR UPDATE",[space.workspace_id]);
        const {rows} = await client.query(
          "SELECT * FROM private_trust_records WHERE workspace_id=$1 AND deleted_at IS NULL AND expires_at<=now() FOR UPDATE",[space.workspace_id]);
        for (const record of rows) await this.erase(client,{id:record.author_id},record,"retention-expiry-erasure");
      }
      return {swept:spaces.length+expiredSpaces.length};
    });
  }
}
