import { randomBytes } from "node:crypto";
import { z } from "zod";
import { canonical, validSignature } from "./protocol";
import { checkSchema } from "./authority-app";

const settingsSchema = z.object({
  url: z.string().url().refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  }, "Independent authority must use an HTTPS origin"),
  publicKey: z.string().min(1),
  policyDigest: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type GatewaySettings = z.infer<typeof settingsSchema>;
export function gatewaySettings(): GatewaySettings | null {
  const raw = { url: process.env.SAFETY_AUTHORITY_URL, publicKey: process.env.SAFETY_AUTHORITY_PUBLIC_KEY, policyDigest: process.env.SAFETY_POLICY_DIGEST };
  if (!raw.url && !raw.publicKey && !raw.policyDigest) return null;
  return settingsSchema.parse(raw); // Partial/bad configuration is never treated as disabled.
}
const receiptSchema = z.object({ payload: z.unknown(), signature: z.string() }).strict();
const permitSchema = z.object({
  request: checkSchema, issuedAt: z.number().int(), expiresAt: z.number().int(),
  allowed: z.boolean(), mode: z.enum(["normal", "restricted"]), overdue: z.boolean(),
  expired: z.boolean(),
  essentialFallback: z.literal("read-only"), sequence: z.number().int().nonnegative(),
  head: z.string().regex(/^[a-f0-9]{64}$/), policyDigest: z.string().regex(/^[a-f0-9]{64}$/),
  governanceMode: z.literal("founder-only"),
}).strict();
export class SafetyUnavailable extends Error {}

async function signedResponse(settings: GatewaySettings, endpoint: string, body: unknown, fetcher: typeof fetch) {
  const response = await fetcher(`${settings.url.replace(/\/$/, "")}/v1/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(3000), redirect: "error",
  });
  if (!response.ok) throw new SafetyUnavailable("Independent safety authority unavailable");
  const receipt = receiptSchema.parse(await response.json());
  if (!validSignature(settings.publicKey, "authority", receipt.payload, receipt.signature)) {
    throw new SafetyUnavailable("Independent safety receipt could not be verified");
  }
  return receipt.payload;
}
export async function requireSafetyPermit(
  operator: string, resource: string,
  settings: GatewaySettings | null = gatewaySettings(), fetcher = fetch, clock = Date.now,
) {
  if (!settings) throw new SafetyUnavailable("AI contract execution requires a commissioned independent safety authority");
  settingsSchema.parse(settings);
  const request = { nonce: randomBytes(32).toString("hex"), operator, resource, capability: "contract.run" as const };
  try {
    const payload = permitSchema.parse(await signedResponse(settings, "check", request, fetcher));
    const now = clock();
    if (canonical(payload.request) !== canonical(request) || payload.policyDigest !== settings.policyDigest ||
        payload.issuedAt > now + 1000 || now >= payload.expiresAt ||
        payload.expiresAt - payload.issuedAt > 5000 || payload.expiresAt <= payload.issuedAt ||
        payload.allowed !== (payload.mode === "normal")) {
      throw new Error("Invalid or expired permission receipt");
    }
    if (!payload.allowed) throw new SafetyUnavailable("This AI capability is contained; read-only services remain available");
  } catch (error) {
    if (error instanceof SafetyUnavailable) throw error;
    throw new SafetyUnavailable("AI capability restricted because independent safety verification failed");
  }
}
const statusSchema = z.object({
  nonce: z.string(), issuedAt: z.number().int(), sequence: z.number().int().nonnegative(),
  head: z.string().regex(/^[a-f0-9]{64}$/), policyDigest: z.string().regex(/^[a-f0-9]{64}$/),
  ready: z.boolean(), activeCases: z.number().int().nonnegative(), overdueCases: z.number().int().nonnegative(),
  expiredCases: z.number().int().nonnegative(),
  replacementEnabled: z.literal(false), identityTransferEnabled: z.literal(false),
  governanceMode: z.literal("founder-only"),
}).strict();
export async function safetyStatus(fetcher = fetch) {
  const base = {
    policyApproved: true, scope: "AI/SYSTEM-owned contract execution",
    replacementEnabled: false, identityTransferEnabled: false,
    governanceMode: "founder-only",
    essentialServices: "Existing read-only routes are not contained. No physical life-critical service is commissioned.",
  };
  try {
    const settings = gatewaySettings();
    if (!settings) return { ...base, state: "unconfigured", independentAuthorityVerified: false };
    const nonce = randomBytes(32).toString("hex");
    const status = statusSchema.parse(await signedResponse(settings, "status", { nonce }, fetcher));
    if (status.nonce !== nonce || status.policyDigest !== settings.policyDigest ||
        Math.abs(Date.now() - status.issuedAt) > 5000 || !status.ready) throw new Error("Stale authority status");
    return {
      ...base, state: status.activeCases ? "restricted" : "connected",
      independentAuthorityVerified: true, activeCases: status.activeCases, overdueCases: status.overdueCases,
      expiredCases: status.expiredCases,
    };
  } catch {
    return { ...base, state: "unavailable", independentAuthorityVerified: false };
  }
}
