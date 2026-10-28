import { z } from "zod";

export const waveTopics = ["constitutional-legal", "technical-security", "human-life-safety"] as const;
export const waveSendSchema = z.object({
  recipientAddress: z.string().trim().min(1).max(300),
  content: z.string().min(1).max(4000),
  idempotencyKey: z.string().uuid(),
}).strict();
export const waveBroadcastSchema = z.object({
  commissionId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  topic: z.enum(waveTopics),
  idempotencyKey: z.string().uuid(),
  confirmPublic: z.literal(true),
}).strict();
/** No interpretation of prose as authority. The community votes on this exact envelope. */
export const waveInstructionSchema = z.object({
  protocol: z.literal("wallet-wave-broadcast/v1"),
  publicBroadcasts: z.array(z.object({
    topic: z.enum(waveTopics), content: z.string().min(1).max(3000),
  }).strict()).min(1).max(10),
}).strict();
/** Existing continuity votes wrap a single submitter's exact instructions in
 * a fixed constitutional question. Only that single JSON ground is executable;
 * multiple grounds, prose and malformed envelopes never imply broadcast authority.
 */
export function parseWaveInstructions(body: string) {
  let json = body;
  if (!body.startsWith("{")) {
    const prefix = "Approve only these exact community instructions and assistance limits for this elected person, within the constitution and original mandate expiry. No independent recommendations or changes.";
    const match = body.match(/^([^\n]+)\nTarget: ([a-f0-9-]+)\nResult digest: ([a-f0-9]+)\n\[commission\] ([\s\S]+)$/);
    if (!match || match[1] !== prefix) throw new Error("No explicit broadcast envelope");
    json = match[4];
  }
  return waveInstructionSchema.parse(JSON.parse(json));
}
export const waveConsentSchema = z.object({
  senderAddress: z.string().trim().min(1).max(300), allowed: z.boolean(),
}).strict();
export const waveSubscriptionSchema = z.object({
  topic: z.enum(waveTopics), subscribed: z.boolean(),
}).strict();

export interface WaveReceipt {
  verified: boolean; blockNumber: number; commitment: string; readAt: string;
  proof: "authenticated-recipient-acknowledgement";
}
export interface WaveItem {
  id: string; kind: "private" | "broadcast" | "commission";
  content: string; senderAddress: string; recipientAddress: string | null;
  topic: string | null; commissionId: string | null;
  createdAt: string; blockNumber: number; commitment: string; verified: boolean;
  status: "available" | "acknowledged";
  receipt: WaveReceipt | null;
}
export interface WaveCommission {
  id: string; mandateId: string; topic: string; exactInstructions: string;
  expiresAt: string; blockNumber: number; verified: boolean;
  publicBroadcasts: { topic: string; content: string }[];
}
export interface WaveOverview {
  address: string | null; inbox: WaveItem[]; outbox: WaveItem[];
  subscriptions: { topic: string; subscribed: boolean }[];
  consents: { senderAddress: string; allowed: boolean }[];
  commissions: WaveCommission[];
  identityAuthorisationReady: boolean;
  ledger: "NexusOS project blockchain";
}
