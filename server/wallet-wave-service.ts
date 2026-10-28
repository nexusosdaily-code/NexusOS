import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { z } from "zod";
import {
  parseWaveInstructions, waveTopics, type waveBroadcastSchema, type waveSendSchema,
  type WaveItem, type WaveOverview, type WaveReceipt,
} from "../shared/wallet-wave-communications";
import { ElectionError, transaction, type Actor } from "./governance/community-election-service";
import { authorisedCommunicationCommission } from "./governance/community-election-continuity";
import { appendElectionRecord } from "./governance/community-election-record";
import { resolveWalletWave, walletWaveForUser } from "./wnsp-address-resolution";
import { communicationIdentityReady } from "./governance/communication-identity-gate";

// JSONB changes property order; canonicalise recursively before hashing or comparison.
export function waveCanonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(waveCanonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${waveCanonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash("sha256").update(waveCanonical(value)).digest("hex");
export const waveCommitment = (salt: string, envelope: unknown) =>
  digest({ protocol: "wallet-wave-private-commitment/v1", salt, envelope });
const ledgerText = (value: unknown) => `WALLET_WAVE[v1]:${waveCanonical(value)}`;
const date = (v: Date | string) => new Date(v).toISOString();
export interface WaveEncoding {
  encodedFrames?: unknown; spectralHash?: string; totalLambdaMass?: string;
  wavelengthMin?: string; wavelengthMax?: string;
}

/** Deny wins over both friend acceptance and direct consent. Check inside the delivery transaction. */
export async function privatePermission(client: PoolClient, senderId: string, recipientId: string) {
  const consent = (await client.query(
    "SELECT allowed FROM wave_consents WHERE recipient_id=$1 AND sender_id=$2", [recipientId, senderId],
  )).rows[0];
  if (consent) return consent.allowed === true;
  return !!(await client.query(`
    SELECT id FROM friendships WHERE status='accepted' AND
      ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))
    FOR SHARE
  `, [senderId, recipientId])).rows.length;
}

async function retried(client: PoolClient, actor: Actor, key: string, request: unknown) {
  const row = (await client.query("SELECT * FROM wave_communications WHERE sender_id=$1 AND idempotency_key=$2", [actor.id, key])).rows[0];
  if (row && row.request_digest !== digest(request))
    throw new ElectionError(409, "This retry key belongs to different content or a different action");
  return row;
}
async function store(client: PoolClient, actor: Actor, input: {
  kind: "private" | "broadcast" | "commission"; recipientId?: string; content: string;
  commissionId?: string; topic?: string; templateIndex?: number; instructionDigest?: string;
  idempotencyKey: string; request: unknown;
  encoding?: WaveEncoding; intensity?: number; cycles?: number;
}) {
  const id = randomUUID(), salt = randomBytes(32).toString("hex");
  const at = (await client.query("SELECT clock_timestamp() AS now")).rows[0].now;
  const senderAddress = await walletWaveForUser(client, actor.id);
  const recipientAddress = input.recipientId ? await walletWaveForUser(client, input.recipientId) : null;
  const envelope = {
    id, kind: input.kind, senderId: actor.id, recipientId: input.recipientId ?? null,
    senderAddress, recipientAddress, content: input.content, topic: input.topic ?? null,
    commissionId: input.commissionId ?? null, templateIndex: input.templateIndex ?? null,
    instructionDigest: input.instructionDigest ?? null, createdAt: date(at),
  };
  const commitment = waveCommitment(salt, envelope);
  // No content, account identifiers, address, unsalted content hash or identity evidence for private deliveries.
  const ledgerContent = ledgerText(input.kind === "broadcast" ? {
    kind: "public-broadcast", commitment, content: input.content, topic: input.topic,
    instructionDigest: input.instructionDigest, templateIndex: input.templateIndex,
  } : { kind: "private-communication", commitment });
  const blockNumber = await appendElectionRecord(client, ledgerContent, "WALLET_WAVE");
  let messageId: string | null = null;
  if (input.kind === "private") {
    messageId = randomUUID();
    await client.query(`
      INSERT INTO lambda_messages(id,sender_id,recipient_id,content,is_read,is_decoded,created_at,
        encoded_frames,spectral_hash,total_lambda_mass,wavelength_min,wavelength_max,intensity,cycles)
      VALUES($1,$2,$3,$4,false,$6,$5,$7,$8,$9,$10,$11,$12,$13)
    `, [messageId, actor.id, input.recipientId, input.content, at, !input.encoding?.encodedFrames,
      input.encoding?.encodedFrames ? JSON.stringify(input.encoding.encodedFrames) : null,
      input.encoding?.spectralHash ?? null, input.encoding?.totalLambdaMass ?? null,
      input.encoding?.wavelengthMin ?? null, input.encoding?.wavelengthMax ?? null,
      input.intensity ?? 32, input.cycles ?? 1]);
  }
  const row = (await client.query(`
    INSERT INTO wave_communications(id,kind,sender_id,recipient_id,message_id,commission_id,
      template_index,topic,content,envelope,salt,commitment,ledger_content,block_number,
      idempotency_key,request_digest,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
  `, [id, input.kind, actor.id, input.recipientId ?? null, messageId, input.commissionId ?? null,
    input.templateIndex ?? null, input.topic ?? null, input.content, envelope, salt, commitment,
    ledgerContent, blockNumber, input.idempotencyKey, digest(input.request), at])).rows[0];
  return row;
}

export async function sendWalletWave(pool: Pool, actor: Actor, input: z.infer<typeof waveSendSchema> & {
  encoding?: WaveEncoding; intensity?: number; cycles?: number;
}) {
  return transaction(pool, async client => {
    await walletWaveForUser(client, actor.id);
    const recipient = await resolveWalletWave(client, input.recipientAddress);
    const request = { kind: "private", recipientId: recipient.userId, content: input.content,
      intensity: input.intensity ?? 32, cycles: input.cycles ?? 1 };
    const previous = await retried(client, actor, input.idempotencyKey, request);
    // A retry of a committed operation does not deliver a second message, even if consent was later withdrawn.
    if (previous) return item(client, previous, actor.id);
    if (!await privatePermission(client, actor.id, recipient.userId))
      throw new ElectionError(403, "Recipient must be an accepted friend or explicitly consent; a refusal always wins");
    return item(client, await store(client, actor, {
      kind: "private", recipientId: recipient.userId, content: input.content,
      idempotencyKey: input.idempotencyKey, request,
      encoding: input.encoding, intensity: input.intensity, cycles: input.cycles,
    }), actor.id);
  });
}

export async function receiveWaveCommission(pool: Pool, actor: Actor, commissionId: string, key: string) {
  return transaction(pool, async client => {
    const request = { kind: "commission", commissionId };
    const previous = await retried(client, actor, key, request);
    if (previous) return item(client, previous, actor.id);
    const { election, mandate } = await authorisedCommunicationCommission(client, actor, commissionId);
    const existing = (await client.query(`
      SELECT * FROM wave_communications WHERE kind='commission' AND commission_id=$1 AND recipient_id=$2
    `, [commissionId, actor.id])).rows[0];
    if (existing) return item(client, existing, actor.id);
    // The elected holder deliberately requests their commission: no automatic execution or consent bypass.
    return item(client, await store(client, actor, {
      kind: "commission", recipientId: actor.id, content: election.body,
      commissionId, topic: mandate.scope, instructionDigest: election.record_digest,
      idempotencyKey: key, request,
    }), actor.id);
  });
}
export async function broadcastWalletWave(pool: Pool, actor: Actor, input: z.infer<typeof waveBroadcastSchema>) {
  return transaction(pool, async client => {
    const request = { kind: "broadcast", commissionId: input.commissionId, topic: input.topic, content: input.content };
    const previous = await retried(client, actor, input.idempotencyKey, request);
    if (previous) return item(client, previous, actor.id);
    const { election, mandate } = await authorisedCommunicationCommission(client, actor, input.commissionId);
    let instructions;
    try { instructions = parseWaveInstructions(election.body); }
    catch { throw new ElectionError(403, "These instructions do not explicitly authorise a machine-readable public broadcast"); }
    const index = instructions.publicBroadcasts.findIndex(t => t.topic === input.topic && t.content === input.content);
    if (index < 0 || mandate.scope !== input.topic)
      throw new ElectionError(403, "Content and audience must exactly match community instructions within this mandate");
    const existing = (await client.query(`
      SELECT * FROM wave_communications WHERE kind='broadcast' AND commission_id=$1 AND template_index=$2
    `, [input.commissionId, index])).rows[0];
    if (existing) return item(client, existing, actor.id);
    return item(client, await store(client, actor, {
      kind: "broadcast", commissionId: input.commissionId, topic: input.topic, content: input.content,
      templateIndex: index, instructionDigest: election.record_digest,
      idempotencyKey: input.idempotencyKey, request,
    }), actor.id);
  });
}

export async function setWaveConsent(pool: Pool, actor: Actor, address: string, allowed: boolean) {
  return transaction(pool, async client => {
    await walletWaveForUser(client, actor.id);
    const sender = await resolveWalletWave(client, address);
    await client.query(`
      INSERT INTO wave_consents(recipient_id,sender_id,allowed) VALUES($1,$2,$3)
      ON CONFLICT(recipient_id,sender_id) DO UPDATE SET allowed=$3,updated_at=clock_timestamp()
    `, [actor.id, sender.userId, allowed]);
    return { allowed, senderAddress: sender.address };
  });
}
export async function setWaveSubscription(pool: Pool, actor: Actor, topic: string, subscribed: boolean) {
  return transaction(pool, async client => {
    await walletWaveForUser(client, actor.id);
    if (!waveTopics.includes(topic as any)) throw new ElectionError(400, "Unknown community topic");
    await client.query(`
      INSERT INTO wave_subscriptions(user_id,topic,subscribed) VALUES($1,$2,$3)
      ON CONFLICT(user_id,topic) DO UPDATE SET subscribed=$3,updated_at=clock_timestamp()
    `, [actor.id, topic, subscribed]);
    return { topic, subscribed };
  });
}

async function verifyCommunication(client: PoolClient, row: any) {
  const stored = (await client.query("SELECT content FROM blockchain_blocks WHERE block_number=$1", [row.block_number])).rows[0];
  const e = row.envelope;
  const verified = stored?.content === row.ledger_content &&
    waveCommitment(row.salt, e) === row.commitment &&
    e.id === row.id && e.kind === row.kind && e.senderId === row.sender_id &&
    e.recipientId === row.recipient_id && e.content === row.content && e.topic === row.topic &&
    e.commissionId === row.commission_id && e.templateIndex === row.template_index && e.createdAt === date(row.created_at) &&
    row.ledger_content === ledgerText(row.kind === "broadcast" ? {
      kind: "public-broadcast", commitment: row.commitment, content: row.content,
      topic: row.topic, instructionDigest: e.instructionDigest, templateIndex: row.template_index,
    } : { kind: "private-communication", commitment: row.commitment });
  if (!verified) throw new ElectionError(503, "Communication permanent-record verification failed");
}
async function receipt(client: PoolClient, row: any, recipientId: string): Promise<WaveReceipt | null> {
  const r = (await client.query(`
    SELECT r.*,b.content AS chain_content FROM wave_receipts r
    LEFT JOIN blockchain_blocks b ON b.block_number=r.block_number
    WHERE r.communication_id=$1 AND r.recipient_id=$2
  `, [row.id, recipientId])).rows[0];
  if (!r) return null;
  const valid = r.chain_content === r.ledger_content &&
    waveCommitment(r.salt, r.envelope) === r.commitment &&
    r.ledger_content === ledgerText({ kind: "private-receipt", commitment: r.commitment }) &&
    r.envelope.communicationId === row.id && r.envelope.recipientId === recipientId &&
    r.envelope.communicationCommitment === row.commitment &&
    r.envelope.readAt === date(r.created_at);
  if (!valid) throw new ElectionError(503, "Receipt permanent-record verification failed");
  return { verified: true, blockNumber: r.block_number, commitment: r.commitment,
    readAt: date(r.created_at), proof: "authenticated-recipient-acknowledgement" };
}
async function item(client: PoolClient, row: any, actorId: string): Promise<WaveItem> {
  await verifyCommunication(client, row);
  const acknowledged = await receipt(client, row, row.recipient_id ?? actorId);
  return {
    id: row.id, kind: row.kind, content: row.content, senderAddress: row.envelope.senderAddress,
    recipientAddress: row.envelope.recipientAddress, topic: row.topic, commissionId: row.commission_id,
    createdAt: date(row.created_at), blockNumber: row.block_number, commitment: row.commitment,
    verified: true, status: acknowledged ? "acknowledged" : "available", receipt: acknowledged,
  };
}

/** Dynamic subscription query: wallets registered tomorrow can subscribe to still-live instructions.
 * Never fan out, publish subscriber identities, or reuse the public vm-feed websocket.
 */
export async function waveOverview(pool: Pool, actor: Actor): Promise<WaveOverview> {
  return transaction(pool, async client => {
    const address = await walletWaveForUser(client, actor.id);
    const inboxRows = (await client.query(`
      SELECT w.* FROM wave_communications w WHERE recipient_id=$1 OR
        (kind='broadcast' AND EXISTS(SELECT 1 FROM wave_subscriptions s
          WHERE s.user_id=$1 AND s.topic=w.topic AND s.subscribed=true))
      ORDER BY created_at DESC,id DESC LIMIT 100
    `, [actor.id])).rows;
    const inbox: WaveItem[] = [];
    for (const row of inboxRows) {
      if (row.kind === "broadcast") {
        try { await authorisedCommunicationCommission(client, { id: row.sender_id, role: "user" }, row.commission_id); }
        catch (error) { if (error instanceof ElectionError && [403,409,424].includes(error.status)) continue; throw error; }
      }
      inbox.push(await item(client, row, actor.id));
    }
    const outboxRows = (await client.query("SELECT * FROM wave_communications WHERE sender_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100", [actor.id])).rows;
    const outbox = await Promise.all(outboxRows.map(row => item(client, row, actor.id)));
    const subscriptions = (await client.query("SELECT topic,subscribed FROM wave_subscriptions WHERE user_id=$1", [actor.id])).rows;
    const consents = [];
    for (const r of (await client.query("SELECT sender_id,allowed FROM wave_consents WHERE recipient_id=$1", [actor.id])).rows) {
      const sender = (await client.query("SELECT address FROM wallets WHERE user_id=$1", [r.sender_id])).rows[0];
      if (sender) consents.push({ senderAddress: sender.address, allowed: r.allowed });
    }
    const commissions: WaveOverview["commissions"] = [];
    const candidates = (await client.query(`
      SELECT e.id FROM community_elections e JOIN community_election_links l ON l.election_id=e.id
      JOIN community_elections m ON m.id=l.target_id JOIN community_nominations n ON n.id=m.nomination_id
      JOIN community_persons p ON p.id=n.person_id
      WHERE e.kind='commission' AND e.status='approved' AND p.user_id=$1 ORDER BY e.block_number DESC
    `, [actor.id])).rows;
    for (const row of candidates) {
      try {
        const { election: e, mandate, expiresAt } = await authorisedCommunicationCommission(client, actor, row.id);
        let publicBroadcasts: { topic: string; content: string }[] = [];
        try { publicBroadcasts = parseWaveInstructions(e.body).publicBroadcasts.filter(t => t.topic === mandate.scope); }
        catch { /* Prose commissions can be received but never interpreted as broadcast authority. */ }
        commissions.push({ id: e.id, mandateId: mandate.id, topic: mandate.scope,
          exactInstructions: e.body, expiresAt, blockNumber: e.block_number, verified: true, publicBroadcasts });
      } catch (error) {
        if (!(error instanceof ElectionError && [403,409,424].includes(error.status))) throw error;
      }
    }
    return { address, inbox, outbox, subscriptions: waveTopics.map(topic => ({
      topic, subscribed: subscriptions.find(s => s.topic === topic)?.subscribed ?? false,
    })), consents, commissions, identityAuthorisationReady: communicationIdentityReady(),
      ledger: "NexusOS project blockchain" };
  });
}

export async function acknowledgeWalletWave(pool: Pool, actor: Actor, id: string) {
  return transaction(pool, async client => {
    await walletWaveForUser(client, actor.id);
    const row = (await client.query("SELECT * FROM wave_communications WHERE id=$1", [id])).rows[0];
    if (!row || (row.recipient_id !== actor.id && row.kind !== "broadcast"))
      throw new ElectionError(404, "Communication is not in your inbox");
    // Consent/mandate is checked even for duplicate receipts, to avoid acknowledging after unsubscribe.
    if (row.kind === "broadcast") {
      const subscription = (await client.query(
        "SELECT subscribed FROM wave_subscriptions WHERE user_id=$1 AND topic=$2", [actor.id, row.topic],
      )).rows[0];
      if (!subscription?.subscribed) throw new ElectionError(403, "Subscribe to this community before acknowledging");
      await authorisedCommunicationCommission(client, { id: row.sender_id, role: "user" }, row.commission_id);
    } else if (row.kind === "private") {
      if (!await privatePermission(client, row.sender_id, actor.id))
        throw new ElectionError(403, "Recipient permission has been withdrawn");
    } else await authorisedCommunicationCommission(client, actor, row.commission_id);
    await verifyCommunication(client, row);
    if (await receipt(client, row, actor.id)) return item(client, row, actor.id);
    const at = (await client.query("SELECT clock_timestamp() AS now")).rows[0].now;
    const envelope = { communicationId: id, recipientId: actor.id,
      communicationCommitment: row.commitment, readAt: date(at), proof: "authenticated-recipient-acknowledgement" };
    const salt = randomBytes(32).toString("hex"), commitment = waveCommitment(salt, envelope);
    const ledgerContent = ledgerText({ kind: "private-receipt", commitment });
    const block = await appendElectionRecord(client, ledgerContent, "WALLET_WAVE_RECEIPT");
    await client.query(`
      INSERT INTO wave_receipts(communication_id,recipient_id,salt,envelope,commitment,ledger_content,block_number,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    `, [id, actor.id, salt, envelope, commitment, ledgerContent, block, at]);
    if (row.message_id) await client.query("UPDATE lambda_messages SET is_read=true,read_at=$2 WHERE id=$1", [row.message_id, at]);
    return item(client, row, actor.id);
  });
}
