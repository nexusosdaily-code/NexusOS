import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import type { TrustRole } from "../../shared/private-trust";
import { objectStorageClient } from "../objectStorage";

export class TrustError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// Deliberately opt-in, independently of storage/key configuration.
export function trustEvidenceUploadsEnabled(): boolean {
  return process.env.TRUST_EVIDENCE_UPLOADS_ENABLED === "true";
}
export function assertTrustEvidenceUploadsEnabled(): void {
  if (!trustEvidenceUploadsEnabled()) throw new TrustError(503, "Private evidence uploads and lineage/beneficiary submissions are deliberately disabled");
}
export function trustKey(): Buffer {
  const value = process.env.TRUST_EVIDENCE_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new TrustError(503, "Private trust encryption is not configured");
  return Buffer.from(value, "hex");
}
export function sealTrust(data: Buffer, context: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", trustKey(), nonce);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return [nonce, cipher.getAuthTag(), encrypted].map(v=>v.toString("base64")).join(".");
}
export function openTrust(value: string, context: string): Buffer {
  const [nonce, tag, content] = value.split(".").map(v=>Buffer.from(v, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", trustKey(), nonce);
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(content), cipher.final()]);
}
export function trustStorageReady() {
  return /^\/[^/]+\/.+/.test(process.env.PRIVATE_OBJECT_DIR ?? "") && /^[a-f0-9]{64}$/i.test(process.env.TRUST_EVIDENCE_KEY ?? "");
}
export async function assertPrivateTrustStorage(workspaceId: string, objectId: string) {
  const file = trustFile(workspaceId,objectId);
  const [metadata] = await file.bucket.getMetadata();
  if (metadata.iamConfiguration?.publicAccessPrevention !== "enforced") {
    throw new TrustError(503,"Private evidence requires a bucket with public access prevention enforced");
  }
  return file;
}
export function trustFile(workspaceId: string, objectId: string) {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir || !/^\/[^/]+\/.+/.test(dir)) throw new TrustError(503, "Approved private asset storage is not configured");
  const [bucket, ...prefix] = dir.slice(1).replace(/\/$/, "").split("/");
  // No filename or uploaded path is used; no object URL is exposed.
  return objectStorageClient.bucket(bucket).file(`${prefix.join("/")}/private-trust/${workspaceId}/${objectId}`);
}
export type TrustAuthority = { controllerId: string; expiresAt: Date };
/**
 * Shared identity dependency, not a local attestation system.
 * The shared platform supplies this PRIVATE database view only after independent
 * human verification AND separate role review. Missing view fails closed.
 */
export async function verifiedTrustAuthority(client: PoolClient, userId: string, workspaceId: string, role: TrustRole): Promise<TrustAuthority> {
  try {
    const { rows } = await client.query(
      `SELECT controller_id, LEAST(identity_expires_at,authority_expires_at) AS expires_at
       FROM private_identity_trust_authority
       WHERE user_id=$1 AND workspace_id=$2 AND role=$3
         AND verified_human=true AND independently_verified=true AND role_reviewed=true
         AND identity_expires_at>now() AND authority_expires_at>now()
         AND revoked_at IS NULL`, [userId,workspaceId,role]);
    if (rows.length !== 1 || !rows[0].controller_id) throw new TrustError(403, "Independent identity verification and reviewed trust role authority are required");
    return {controllerId:rows[0].controller_id, expiresAt:new Date(rows[0].expires_at)};
  } catch (error: any) {
    if (error.code === "42P01") throw new TrustError(503, "Shared independent identity and trust-role verification is not connected");
    throw error;
  }
}
export function validateEvidence(content: string, mediaType: string): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)) throw new TrustError(400,"Invalid evidence encoding");
  const buffer = Buffer.from(content,"base64");
  if (!buffer.length || buffer.length > 5*1024*1024) throw new TrustError(400,"Evidence must be at most 5 MiB");
  const valid = mediaType === "application/pdf" ? buffer.subarray(0,5).toString()==="%PDF-"
    : mediaType === "image/png" ? buffer.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex"))
    : buffer[0]===0xff && buffer[1]===0xd8 && buffer[2]===0xff;
  if (!valid) throw new TrustError(400,"Evidence format does not match its declared media type");
  return buffer;
}
