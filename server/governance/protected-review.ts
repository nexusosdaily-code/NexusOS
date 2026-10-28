import { createHash, createPublicKey, randomBytes } from "node:crypto";
import { z } from "zod";
import { canonical, validSignature } from "../safety/protocol";

// Deliberately separate from the two-of-three containment protocol.
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().min(1).max(4000);
const roles = ["constitutional-legal", "technical-security", "human-life-safety"] as const;
const action = z.enum(["constitutional-amendment", "authority-removal", "authority-transfer", "authority-replacement", "safety-boundary-change"]);
export const proposalSchema = z.object({
  id: z.string().uuid(), action,
  authorId: text, implementerController: text,
  recipientController: text.nullable(),
  title: text, body: text,
  affectedIdentities: z.array(text).min(1),
  permissions: z.array(text).min(1),
  evidenceDigest: digest, executionArtifactDigest: digest, recoveryPlanDigest: digest,
  scope: text, expiresAt: z.number().int().positive(),
}).strict();
export type ProtectedProposal = z.infer<typeof proposalSchema>;
export function proposalDigest(proposal: ProtectedProposal) {
  return createHash("sha256").update(canonical(proposal)).digest("hex");
}
export function recordDigest(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
const reviewerSchema = z.object({
  id: text, authenticatedAccountId: text, controller: text,
  accountableSignatory: z.literal("human"),
  role: z.enum(roles), publicKey: text,
  expertiseEvidenceDigest: digest, independenceEvidenceDigest: digest,
  fundingOwnershipConflictsDigest: digest,
  appointmentScope: z.array(action).min(1),
  appointmentProposalScopes: z.array(text).min(1),
  recused: z.boolean(), disqualified: z.boolean(),
}).strict();
const registerSchema = z.object({
  version: text, approved: z.literal(true), approvalRecordDigest: digest,
  appointmentAndAppealProcedureDigest: digest,
  expiresAt: z.number().int().positive(),
  reviewers: z.array(reviewerSchema).length(3),
}).strict();
const approvalPayloadSchema = z.object({
  reviewerId: text, authenticatedAccountId: text,
  proposalDigest: digest, registerDigest: digest, registerVersion: text,
  action, scope: text, issuedAt: z.number().int().positive(), expiresAt: z.number().int().positive(),
  decision: z.literal("approve"), unresolvedConditions: z.literal(false),
  reasons: text, contraryEvidence: text, uncertainty: text,
}).strict();
const receiptSchema = z.object({
  request: z.object({ nonce: digest, proposal: proposalSchema }).strict(),
  issuedAt: z.number().int().positive(), expiresAt: z.number().int().positive(),
  register: registerSchema,
  commissioning: z.object({
    approved: z.literal(true), independentControlVerified: z.literal(true),
    implementerController: text,
    enforcementTestDigest: digest, essentialServiceFallbackTestDigest: digest,
    approvalRecordDigest: digest, expiresAt: z.number().int().positive(),
  }).strict(),
  // External authority durably consumes the approval set BEFORE issuing a permit.
  consumed: z.literal(true),
  approvals: z.array(z.object({ payload: approvalPayloadSchema, signature: text }).strict()).length(3),
}).strict();
const settingsSchema = z.object({
  url: z.string().url().refine(value => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && u.pathname === "/" && !u.search && !u.hash;
  }),
  publicKey: text, approvedRegisterDigest: digest, approvedCommissioningDigest: digest,
}).strict();
export type ProtectedReviewSettings = z.infer<typeof settingsSchema>;
export class ProtectedReviewBlocked extends Error {}
export function protectedReviewSettings(): ProtectedReviewSettings | null {
  const raw = {
    url: process.env.PROTECTED_REVIEW_AUTHORITY_URL,
    publicKey: process.env.PROTECTED_REVIEW_AUTHORITY_PUBLIC_KEY,
    approvedRegisterDigest: process.env.PROTECTED_REVIEW_REGISTER_DIGEST,
    approvedCommissioningDigest: process.env.PROTECTED_REVIEW_COMMISSIONING_DIGEST,
  };
  if (Object.values(raw).every(value => !value)) return null;
  return settingsSchema.parse(raw);
}

export function verifyProtectedReceipt(
  raw: unknown, signature: string, request: { nonce: string; proposal: ProtectedProposal },
  settings: ProtectedReviewSettings, now: number,
) {
  const receipt = receiptSchema.parse(raw);
  if (!validSignature(settings.publicKey, "protected-change-authority", receipt, signature) ||
      canonical(receipt.request) !== canonical(request) ||
      receipt.issuedAt > now || receipt.expiresAt <= now ||
      receipt.expiresAt <= receipt.issuedAt || receipt.expiresAt - receipt.issuedAt > 5000) {
    throw new ProtectedReviewBlocked("Unverified, stale or replayed protected-change receipt");
  }
  const proposal = request.proposal;
  const registerHash = recordDigest(receipt.register);
  if (registerHash !== settings.approvedRegisterDigest ||
      recordDigest(receipt.commissioning) !== settings.approvedCommissioningDigest ||
      receipt.register.expiresAt <= now || receipt.commissioning.expiresAt <= now ||
      receipt.commissioning.implementerController !== proposal.implementerController ||
      proposal.expiresAt <= now) throw new ProtectedReviewBlocked("Approved register, scope or commissioning missing/expired");
  const reviewers = receipt.register.reviewers;
  for (const key of ["id", "authenticatedAccountId", "controller", "publicKey", "role"] as const) {
    if (new Set(reviewers.map(r => r[key])).size !== 3) throw new ProtectedReviewBlocked("Three separately controlled reviewers required");
  }
  const signingKeys = reviewers.map(r => {
    const key = createPublicKey(r.publicKey);
    if (key.asymmetricKeyType !== "ed25519") throw new ProtectedReviewBlocked("Registered Ed25519 signing credentials required");
    return key.export({ type: "spki", format: "der" }).toString("hex");
  });
  if (new Set(signingKeys).size !== 3) throw new ProtectedReviewBlocked("Separate signing credentials required");
  const seen = new Set<string>();
  for (const { payload: approval, signature: approvalSignature } of receipt.approvals) {
    const reviewer = reviewers.find(r => r.id === approval.reviewerId);
    if (!reviewer || seen.has(reviewer.id) || reviewer.recused || reviewer.disqualified ||
        reviewer.authenticatedAccountId === proposal.authorId ||
        [proposal.implementerController, proposal.recipientController].includes(reviewer.controller) ||
        !reviewer.appointmentScope.includes(proposal.action) ||
        !reviewer.appointmentProposalScopes.includes(proposal.scope) ||
        approval.authenticatedAccountId !== reviewer.authenticatedAccountId ||
        approval.proposalDigest !== proposalDigest(proposal) ||
        approval.registerDigest !== registerHash || approval.registerVersion !== receipt.register.version ||
        approval.action !== proposal.action || approval.scope !== proposal.scope ||
        approval.issuedAt > now || approval.expiresAt <= now || approval.expiresAt <= approval.issuedAt ||
        approval.expiresAt > proposal.expiresAt || approval.expiresAt > receipt.register.expiresAt ||
        !validSignature(reviewer.publicKey, "protected-change-approval", approval, approvalSignature)) {
      throw new ProtectedReviewBlocked("All three current authenticated independent approvals of one identical scoped proposal are required");
    }
    seen.add(reviewer.id);
  }
  return { proposalId: proposal.id, proposalDigest: proposalDigest(proposal), registerDigest: registerHash };
}

export async function requireProtectedReview(
  proposal: ProtectedProposal, settings = protectedReviewSettings(), fetcher = fetch, clock = Date.now,
) {
  try {
    proposalSchema.parse(proposal);
    // No execution mechanism or emergency exception for protected authority decisions.
    if (proposal.action !== "constitutional-amendment") throw new ProtectedReviewBlocked("Authority removal, transfer, replacement and boundary changes remain disabled");
    if (!settings) throw new ProtectedReviewBlocked("Protected changes blocked: no explicitly approved reviewer register or independently commissioned enforcement");
    settingsSchema.parse(settings);
    const request = { nonce: randomBytes(32).toString("hex"), proposal };
    const response = await fetcher(`${settings.url.replace(/\/$/, "")}/v1/protected-changes/consume`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request), redirect: "error", signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new ProtectedReviewBlocked("Independent protected-change review unavailable or refused");
    const envelope = z.object({ payload: z.unknown(), signature: text }).strict().parse(await response.json());
    return verifyProtectedReceipt(envelope.payload, envelope.signature, request, settings, clock());
  } catch (error) {
    if (error instanceof ProtectedReviewBlocked) throw error;
    throw new ProtectedReviewBlocked("Protected changes blocked: register, signatures, scope or commissioning could not be verified");
  }
}

// Durable, fail-closed local replay protection supplements external consumption.
// Installation is a separately approved migration, never auto-created by a request.
export async function reserveProtectedProposal(permit: Awaited<ReturnType<typeof requireProtectedReview>>) {
  const { pool } = await import("../db");
  const result = await pool.query(
    `INSERT INTO protected_review_consumptions (proposal_id, proposal_digest, register_digest)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING proposal_id`,
    [permit.proposalId, permit.proposalDigest, permit.registerDigest],
  );
  if (result.rows.length !== 1) throw new ProtectedReviewBlocked("Protected proposal already consumed; fresh review required");
}
