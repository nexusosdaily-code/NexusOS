import { z } from "zod";

export const trustConsentVersion = "private-trust-v1";
export const trustCreateSchema = z.object({
  kind: z.enum(["family", "charitable"]),
  label: z.string().trim().min(1).max(120),
  consent: z.literal(true),
  consentVersion: z.literal(trustConsentVersion),
}).strict();
export const trustRecordSchema = z.object({
  type: z.enum(["lineage", "beneficiary", "discussion", "instrument"]),
  body: z.string().trim().min(1).max(40000),
  retentionDays: z.number().int().min(1).max(365),
  consent: z.literal(true),
  consentVersion: z.literal(trustConsentVersion),
}).strict();
export const trustEvidenceSchema = z.object({
  type: z.enum(["birth-certificate", "lineage-evidence", "authority-evidence"]),
  content: z.string().min(1).max(7_000_000),
  mediaType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  retentionDays: z.number().int().min(1).max(365),
  consent: z.literal(true),
  consentVersion: z.literal(trustConsentVersion),
}).strict();
export const trustMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["custodian", "contributor", "reviewer", "reader"]),
}).strict();
export const trustReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
}).strict();
export const trustLegalSchema = z.object({
  governingLaw: z.string().trim().min(2).max(500),
  instrumentId: z.string().uuid(),
  authorisedInstrumentConfirmed: z.literal(true),
  qualifiedLegalAdviceConfirmed: z.literal(true),
}).strict();
export type TrustRole = z.infer<typeof trustMemberSchema>["role"];
export type TrustRecordType = z.infer<typeof trustRecordSchema>["type"];
