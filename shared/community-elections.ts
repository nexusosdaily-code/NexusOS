import { z } from "zod";

export const reviewRoles = ["constitutional-legal", "technical-security", "human-life-safety"] as const;
export const policyScopes = ["community-representation", "welfare", "wnsp-technology"] as const;
export const personVerificationSchema = z.object({
  userId: z.string().uuid(),
  personReference: z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  evidenceReference: z.string().trim().min(10).max(200),
  confirmUniqueHuman: z.literal(true),
  confirmNoOrganisation: z.literal(true),
}).strict();
export const nominationSchema = z.object({
  publicName: z.string().trim().min(2).max(80)
    .regex(/^[\p{L}\p{N} ._'’-]+$/u, "Use a public name, not an email address"),
  role: z.enum(reviewRoles),
  statement: z.string().trim().min(20).max(3000),
  publicKey: z.string().regex(/^[a-fA-F0-9]{64}$/, "Provide an Ed25519 public key (64 hex characters)"),
  consent: z.literal(true),
}).strict();
export const electionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reviewer"), nominationId: z.string().uuid(),
    designation: z.enum(["principal", "alternate"]).default("principal"),
    predecessorId: z.string().uuid().optional(),
    title: z.string().trim().min(5).max(200),
    body: z.string().trim().min(20).max(4000),
    opensAt: z.string().datetime(), closesAt: z.string().datetime(),
    confirmAuthorityPreserved: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("policy"), scope: z.enum(policyScopes),
    title: z.string().trim().min(5).max(200),
    body: z.string().trim().min(20).max(4000),
    opensAt: z.string().datetime(), closesAt: z.string().datetime(),
    confirmAuthorityPreserved: z.literal(true),
  }).strict(),
]);
export const ballotSchema = z.object({ choice: z.enum(["yes", "no"]) }).strict();

export const continuityRequestSchema = z.object({
  kind: z.enum(["appeal", "recall", "commission", "notice"]),
  targetId: z.string().uuid(),
  grounds: z.string().trim().min(20).max(4000),
  groundType: z.enum(["procedure", "voter-eligibility", "candidate-conflict", "record-inconsistency"]).optional(),
  confirmPublicNonSensitive: z.literal(true),
  confirmConstitutionBound: z.literal(true),
}).strict().superRefine((value, ctx) => {
  if (value.kind === "appeal" && !value.groundType)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select the appeal ground type" });
});
export const continuityScheduleSchema = z.object({
  opensAt: z.string().datetime(),
  confirmAuthorityPreserved: z.literal(true),
}).strict();
export const relinquishSchema = z.object({ confirmIrreversible: z.literal(true) }).strict();
export const CONTINUITY_DAY_MS = 86400000;
export function continuityDates(createdAt: Date, opensAt: Date) {
  if (!Number.isFinite(opensAt.getTime()) || opensAt.getTime() < createdAt.getTime() + 7 * CONTINUITY_DAY_MS)
    throw new Error("At least seven complete days of public notice are required");
  return { opensAt, closesAt: new Date(opensAt.getTime() + 14 * CONTINUITY_DAY_MS) };
}

export interface CommunityContinuityEvent {
  id: string; type: string; targetId: string; relatedId: string | null;
  content: string; digest: string; blockNumber: number; createdAt: string;
}
export interface CommunityContinuityRequest {
  id: string; kind: "appeal" | "recall" | "commission"; targetId: string;
  targetDigest: string; filingEndsAt: string | null; createdAt: string;
  status: "filing" | "awaiting-scheduling" | "scheduled" | "resolved";
  electionId: string | null; grounds: CommunityContinuityEvent[];
}
export interface CommunitySeat {
  role: typeof reviewRoles[number]; designation: "principal" | "alternate";
  state: "vacant" | "occupied" | "unavailable" | "unresolved";
  mandateIds: string[]; predecessorId: string | null; vacancyReason: string | null;
}
export interface CommunityContinuityOverview {
  requests: CommunityContinuityRequest[]; events: CommunityContinuityEvent[];
  seats: CommunitySeat[]; commissioning: "not-commissioned";
}

export interface CommunityNomination {
  id: string; publicName: string; role: typeof reviewRoles[number];
  statement: string; publicKey: string; createdAt: string; eligible: boolean;
}
export interface CommunityElection {
  id: string; kind: "reviewer" | "policy" | "appeal" | "recall" | "commission"; title: string; body: string; scope: string;
  nomination: CommunityNomination | null; opensAt: string; closesAt: string;
  status: "scheduled" | "open" | "awaiting-finalisation" | "approved" | "rejected" | "cancelled";
  yes: number; no: number; total: number; supportPercent: number;
  recordDigest: string | null; blockNumber: number | null; termStartsAt: string | null;
  termEndsAt: string | null; termActive: boolean; createdAt: string;
  finalisedAt?: string | null;
  designation?: "principal" | "alternate"; predecessorId?: string | null;
  targetId?: string | null;
  outcomeSetAside?: boolean;
  mandateState?: string;
}
export interface CommunityElectionOverview {
  elections: CommunityElection[]; nominations: CommunityNomination[];
  commissioning: "not-commissioned"; thresholdPercent: 51; termYears: 3;
}
export interface CommunityElectionMembership {
  eligible: boolean; personId: string | null; votedElectionIds: string[];
  nominationIds: string[];
}
export interface CommunityVerifiedPerson {
  personId: string; userId: string; verifiedAt: string; revokedAt: string | null;
}

export function meetsCommunityThreshold(yes: number, no: number): boolean {
  if (![yes, no].every(n => Number.isSafeInteger(n) && n >= 0)) return false;
  return yes + no > 0 && BigInt(yes) * 100n >= (BigInt(yes) + BigInt(no)) * 51n;
}

export function reviewerTermEnd(start: Date): Date {
  const end = new Date(start);
  const month = end.getUTCMonth();
  end.setUTCFullYear(end.getUTCFullYear() + 3);
  // February 29 expires on February 28 in the third (non-leap) year.
  if (end.getUTCMonth() !== month) end.setUTCDate(0);
  return end;
}
