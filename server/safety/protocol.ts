import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";

export const POLICY_ID = "human-life-safety-v1";
export const REVIEW_MS = 15 * 60_000;
export const CONTAINMENT_MS = 60 * 60_000;
export const FOUNDER_REVIEW_MS = 24 * 60 * 60_000;
const text = z.string().min(1).max(4000);
const id = z.string().regex(/^[a-zA-Z0-9_.:-]{1,120}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const signatureSchema = z.object({ actor: id, signature: z.string().regex(/^[A-Za-z0-9+/]{86}==$/) }).strict();
export const actorSchema = z.object({
  id, publicKey: text, controller: id,
  role: z.enum(["founder", "reviewer", "source", "operator"]),
  notificationUrl: z.string().url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  }).optional(),
}).strict();
const commissioningTestSchema = z.object({
  source: id, artifactDigest: digest, essentialServiceInventoryDigest: digest,
  compromisedOperator: z.literal(true), forgedEvidence: z.literal(true),
  maliciousReviewer: z.literal(true), unavailableReviewer: z.literal(true),
  falseAlarm: z.literal(true), essentialContinuity: z.literal(true),
  safeRestoration: z.literal(true), signature: z.string(),
}).strict();
export const configSchema = z.object({
  policyId: z.literal(POLICY_ID),
  governanceMode: z.enum(["founder-only", "independent-review"]),
  actors: z.array(actorSchema).min(4).max(100),
  // Commissioning is signed by the independent reviewers, not inferred from an amendment.
  commissioning: z.object({
    policyDigest: digest, essentialServiceInventoryDigest: digest,
    fallbackTestDigest: digest, authorityReconciliationDigest: digest,
    tests: z.array(commissioningTestSchema).length(2),
    approvals: z.array(signatureSchema).min(1).max(2),
  }).strict(),
}).strict();
export type Config = z.infer<typeof configSchema>;
export type Signature = z.infer<typeof signatureSchema>;

export const evidenceSchema = z.object({
  source: id, operator: id, resource: id, capability: z.literal("contract.run"), policyDigest: digest,
  observation: text, harmPath: text, uncertainty: text,
  contraryEvidence: z.string().max(4000), observedAt: z.number().int().nonnegative(),
  signature: z.string(),
}).strict();
const base = {
  policyDigest: digest, sequence: z.number().int().positive(), previousHash: digest,
  caseId: id, initiator: id, createdAt: z.number().int().nonnegative(),
};
export const proposalSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base, kind: z.literal("contain"), operator: id, resource: id,
    capability: z.literal("contract.run"), emergency: z.boolean(), reason: text,
    evidence: z.array(evidenceSchema).min(2).max(10),
  }).strict(),
  z.object({ ...base, kind: z.literal("appeal"), reason: text, contraryEvidence: text }).strict(),
  z.object({ ...base, kind: z.literal("review"), reason: text }).strict(),
  z.object({
    ...base, kind: z.literal("restore"), reason: text,
    test: z.object({
      source: id, caseId: id, policyDigest: digest, testedAt: z.number().int().nonnegative(),
      integrity: z.literal(true), humanLife: z.literal(true),
      leastPrivilege: z.literal(true), stagedRecovery: z.literal(true),
      essentialContinuity: z.literal(true), artifactDigest: digest, signature: z.string(),
    }).strict(),
  }).strict(),
]);
export const eventSchema = z.object({
  proposal: proposalSchema,
  initiatorSignature: signatureSchema,
  approvals: z.array(signatureSchema).max(3),
}).strict();
export type Proposal = z.infer<typeof proposalSchema>;
export type SafetyEvent = z.infer<typeof eventSchema>;

/** Stable, domain-separated signing format. Object order is never trusted. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  if (value === undefined || (typeof value === "number" && !Number.isFinite(value))) throw new Error("Invalid signing value");
  return JSON.stringify(value);
}
export function hash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
export function signingBytes(domain: string, value: unknown): Buffer {
  return Buffer.from(`${POLICY_ID}:${domain}:${canonical(value)}`);
}
export function validSignature(key: string, domain: string, value: unknown, signature: string): boolean {
  try {
    if (!/^[A-Za-z0-9+/]{86}==$/.test(signature)) return false;
    const publicKey = createPublicKey(key);
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    return verify(null, signingBytes(domain, value), publicKey, Buffer.from(signature, "base64"));
  } catch { return false; }
}
export function policyDigest(actors: Config["actors"], governanceMode: Config["governanceMode"]): string {
  return hash({
    policyId: POLICY_ID, governanceMode, actors: [...actors].sort((a, b) => a.id.localeCompare(b.id)),
    reviewMs: governanceMode === "founder-only" ? FOUNDER_REVIEW_MS : REVIEW_MS,
    containmentMs: governanceMode === "founder-only" ? FOUNDER_REVIEW_MS : CONTAINMENT_MS,
    quorum: governanceMode === "founder-only" ? 1 : 2,
    emergencyQuorum: governanceMode === "founder-only" ? 0 : 1, evidenceQuorum: 2,
    capabilities: ["contract.run"], essentialFallback: "read-only",
    identityTransfer: false, replacement: false,
  });
}

export function validateConfig(raw: unknown): Config {
  const config = configSchema.parse(raw);
  const actors = config.actors;
  if (new Set(actors.map(a => a.id)).size !== actors.length) throw new Error("Duplicate actor");
  const keys = actors.map(a => {
    const key = createPublicKey(a.publicKey);
    if (key.asymmetricKeyType !== "ed25519") throw new Error("Only Ed25519 identities are accepted");
    return key.export({ type: "spki", format: "der" }).toString("hex");
  });
  if (new Set(keys).size !== keys.length) throw new Error("Shared signing key");
  const reviewers = actors.filter(a => a.role === "reviewer");
  const founders = actors.filter(a => a.role === "founder");
  if (config.governanceMode === "founder-only" && (founders.length !== 1 || reviewers.length !== 0)) {
    throw new Error("Living-founder mode requires the founder alone, not an authorising reviewer quorum");
  }
  if (config.governanceMode === "independent-review" &&
      (founders.length !== 0 || reviewers.length !== 3 || new Set(reviewers.map(a => a.controller)).size !== 3)) {
    throw new Error("Three separately controlled reviewers required");
  }
  const authorisers = config.governanceMode === "founder-only" ? founders : reviewers;
  if (authorisers.some(a => !a.notificationUrl)) throw new Error("Authoriser notification endpoints required");
  if (actors.filter(a => a.role === "source").length < 2 || !actors.some(a => a.role === "operator")) {
    throw new Error("Evidence sources and operator identity required");
  }
  // Do not let a source/operator masquerade as an independent reviewer.
  const reviewerControllers = new Set(authorisers.map(a => a.controller));
  if (actors.some(a => !authorisers.includes(a) && reviewerControllers.has(a.controller))) {
    throw new Error("Reviewer separation of duties violated");
  }
  const { approvals, ...commissioning } = config.commissioning;
  if (commissioning.policyDigest !== policyDigest(actors, config.governanceMode)) throw new Error("Policy digest mismatch");
  const sourceControllers = new Set<string>();
  const operatorControllers = new Set(actors.filter(a => a.role === "operator").map(a => a.controller));
  for (const attestation of commissioning.tests) {
    const { signature, ...test } = attestation;
    const source = actors.find(a => a.id === test.source);
    if (!source || source.role !== "source" || sourceControllers.has(source.controller) ||
        operatorControllers.has(source.controller) ||
        test.essentialServiceInventoryDigest !== commissioning.essentialServiceInventoryDigest ||
        test.artifactDigest !== commissioning.fallbackTestDigest ||
        !validSignature(source.publicKey, "commission-test", test, signature)) {
      throw new Error("Independent commissioning tests required");
    }
    sourceControllers.add(source.controller);
  }
  const controllers = new Set<string>();
  const quorum = config.governanceMode === "founder-only" ? 1 : 2;
  if (approvals.length !== quorum) throw new Error("Wrong commissioning authority");
  for (const approval of approvals) {
    const actor = authorisers.find(a => a.id === approval.actor);
    if (!actor || controllers.has(actor.controller) ||
        !validSignature(actor.publicKey, "commission", commissioning, approval.signature)) {
      throw new Error("Invalid independent commissioning approval");
    }
    controllers.add(actor.controller);
  }
  return config;
}
