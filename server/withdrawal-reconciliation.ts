import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { bech32 } from "bech32";
import { address, networks, Transaction } from "bitcoinjs-lib";
import { btcAttemptSchema } from "./btc-withdrawal-attempt";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const sats = z.string().regex(/^[1-9]\d{0,18}$/).refine(v => BigInt(v) <= 9223372036854775807n);
const targetSchema = z.object({
  kind: z.enum(["lightning", "bitcoin"]), transactionId: z.number().int().positive(),
  queueId: z.number().int().positive().optional(),
}).strict();
export const lightningProviderSchema = z.enum(["blink", "coinos", "alby", "lnbits"]);
export type LightningEvidenceProvider = z.infer<typeof lightningProviderSchema>;
const requestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("lightning"), provider: lightningProviderSchema, account: z.string().trim().min(1).max(160) }).strict(),
  z.object({
    kind: z.literal("bitcoin"), provider: z.literal("esplora"), account: z.string().regex(/^(?:[a-f0-9]{2})+$/).max(10000),
    txid: hash, vout: z.number().int().nonnegative(),
  }).strict(),
]);
export const withdrawalApprovalSchema = z.object({
  reconciliationKey: z.string().min(8).max(160),
  target: targetSchema, request: requestSchema, snapshotHash: hash, proofHash: hash,
  reason: z.string().min(20).max(4000), expiresAt: z.string().datetime(),
}).strict().refine(v => v.target.kind === v.request.kind, "Evidence kind mismatch");
export type WithdrawalTarget = z.infer<typeof targetSchema>;
export type EvidenceRequest = z.infer<typeof requestSchema>;
type Proof = {
  kind: "lightning" | "bitcoin"; provider: string; account: string; reference: string;
  identity: string; outcome: "paid" | "rejected"; amountSats: string;
  invoice?: string; paymentHash?: string; txid?: string; vout?: number;
};

/** Trusted, read-only provider boundary. Never use invoice-status/deposit APIs
 * here. Adapters are server code, not evidence supplied by an HTTP caller. */
export interface WithdrawalEvidenceReader {
  outgoingLightning(account: string, paymentHash: string, provider: LightningEvidenceProvider): Promise<unknown>;
  bitcoinTransaction(txid: string): Promise<{ hex: string; observed: boolean }>;
}
const outgoingSchema = z.object({
  provider: lightningProviderSchema, account: z.string(), reference: z.string().min(1).max(200),
  direction: z.literal("SEND"), invoice: z.string(), paymentHash: hash,
  amountSats: sats, outcome: z.enum(["paid", "rejected"]),
  // Only an authoritative final outgoing rejection permits release of a hold.
  definitive: z.boolean(), preimage: hash.optional(),
}).strict();
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalized = (invoice: string) => invoice.toLowerCase();

/** Extract only the payment hash from the original, checksum-valid BOLT11.
 * No invoice expiry or incoming settlement can establish outgoing failure. */
export function invoicePaymentHash(invoice: string) {
  if (invoice !== invoice.toLowerCase() && invoice !== invoice.toUpperCase()) throw new Error("Mixed-case invoice");
  const { prefix, words } = bech32.decode(normalized(invoice), 20000);
  if (!/^lnbc\d*[munp]?$/.test(prefix) || words.length < 111) throw new Error("Expected mainnet BOLT11");
  const end = words.length - 104; // 65-byte signature
  let result: string | undefined;
  for (let i = 7; i < end;) {
    if (i + 3 > end) throw new Error("Malformed invoice tags");
    const tag = words[i++], length = words[i++] * 32 + words[i++];
    if (i + length > end) throw new Error("Malformed invoice tag length");
    if (tag === 1) {
      if (result || length !== 52) throw new Error("Invalid invoice payment hash");
      result = Buffer.from(bech32.fromWords(words.slice(i, i + length))).toString("hex");
    }
    i += length;
  }
  if (!result || !hash.safeParse(result).success) throw new Error("Missing invoice payment hash");
  return result;
}

async function readSnapshot(c: PoolClient, target: WithdrawalTarget, lock = false) {
  const t = (await c.query(`SELECT * FROM lightning_transactions WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
    [target.transactionId])).rows[0];
  if (!t || t.type !== "withdrawal") throw new Error("Withdrawal not found");
  const queue = (await c.query(`SELECT * FROM lightning_payment_queue WHERE tx_id=$1 ORDER BY id${lock ? " FOR UPDATE" : ""}`,
    [t.id])).rows;
  const reserved = BigInt(sats.parse(String(t.amount_sats)));
  if (queue.length) {
    let total = 0n;
    for (const leg of queue) {
      if (leg.user_id !== t.user_id) throw new Error("Queue ownership mismatch");
      // Include paid/refunded legs too: they consumed part of the same original
      // reservation. Historical inconsistent batches must not create credits.
      total += BigInt(sats.parse(String(leg.amount_sats)));
    }
    if (total !== reserved) throw new Error("Batch amounts do not match the parent reservation");
  }
  const q = target.queueId === undefined ? undefined : queue.find(row => row.id === target.queueId);
  if (target.queueId !== undefined && (!q || q.user_id !== t.user_id)) throw new Error("Queue ownership mismatch");
  if (target.kind === "bitcoin" && (queue.length || target.queueId !== undefined || t.payment_request)) {
    throw new Error("Not an on-chain obligation");
  }
  if (target.kind === "lightning" && (t.btc_address || (queue.length && !q))) throw new Error("Select the exact Lightning queue invoice");
  const attempts = target.kind === "bitcoin" ? (await c.query(`SELECT id,user_id,details,status FROM audit_logs
    WHERE action='btc_withdrawal_prepared' AND resource='withdrawal' AND resource_id=$1 ORDER BY id`,
  [String(t.id)])).rows : [];
  // Preserve historical approval hashes when there is no new journal.
  const snapshot = { transaction: t, queue, ...(attempts.length ? { attempts } : {}) };
  return { snapshot, snapshotHash: digest(snapshot), t, q, attempts };
}
function requireReserved(state: Awaited<ReturnType<typeof readSnapshot>>, target: WithdrawalTarget) {
  const { t, q } = state;
  if (!["processing", "unknown"].includes(q?.status ?? t.status) ||
      (q && !["queued", "processing", "unknown"].includes(t.status))) throw new Error("Obligation is not reserved for reconciliation");
  if (target.kind === "lightning" && !(q?.invoice ?? t.payment_request)) throw new Error("Original invoice missing");
}
async function verifyProof(
  state: Awaited<ReturnType<typeof readSnapshot>>, request: EvidenceRequest, reader: WithdrawalEvidenceReader,
): Promise<Proof> {
  const { t, q } = state;
  const amountSats = sats.parse(String(q?.amount_sats ?? t.amount_sats));
  if (request.kind === "lightning") {
    const invoice = normalized(q?.invoice ?? t.payment_request);
    const paymentHash = invoicePaymentHash(invoice);
    // A queue-less historical withdrawal has a single payment identity. Never
    // silently replace a conflicting stored hash using the invoice alone.
    // Batch parent hashes describe only one leg, so do not apply this to q.
    if (!q && t.payment_hash !== null && t.payment_hash !== undefined &&
        t.payment_hash.toLowerCase() !== paymentHash) {
      throw new Error("Stored withdrawal payment hash conflicts with the original invoice");
    }
    const evidence = outgoingSchema.parse(await reader.outgoingLightning(request.account, paymentHash, request.provider));
    if (evidence.provider !== request.provider || evidence.account !== request.account || normalized(evidence.invoice) !== invoice ||
        evidence.paymentHash !== paymentHash || evidence.amountSats !== amountSats) throw new Error("Outgoing payment evidence mismatch");
    if (evidence.outcome === "paid") {
      if (!evidence.preimage || createHash("sha256").update(Buffer.from(evidence.preimage, "hex")).digest("hex") !== paymentHash) {
        throw new Error("Outgoing settlement preimage not verified");
      }
    } else {
      if (evidence.provider !== "blink") {
        throw new Error("Provider does not support definitive outgoing rejection");
      }
      if (!evidence.definitive || evidence.preimage) {
        throw new Error("Outgoing rejection is not definitive or has contradictory settlement evidence");
      }
    }
    // Do not store preimages, credentials or unbounded raw provider responses.
    return { kind: "lightning", provider: evidence.provider, account: evidence.account,
      reference: evidence.reference, identity: `ln:${paymentHash}`, outcome: evidence.outcome,
      amountSats, invoice, paymentHash };
  }
  if (!t.btc_address || (t.btc_txid && t.btc_txid !== request.txid)) throw new Error("Broadcast identity mismatch");
  const journal = state.attempts;
  if (journal.length > 1) throw new Error("Conflicting withdrawal attempts");
  const attempt = journal.length ? btcAttemptSchema.parse(journal[0].details) : undefined;
  if (attempt && (journal[0].id !== attempt.attemptId || journal[0].user_id !== t.user_id ||
      journal[0].status !== "success" || attempt.transactionId !== t.id ||
      attempt.txid !== request.txid || t.btc_txid !== attempt.txid ||
      attempt.outputIndex !== request.vout || attempt.destination !== t.btc_address ||
      attempt.amountSats !== amountSats || attempt.serviceScript !== request.account)) {
    throw new Error("Broadcast attempt identity mismatch");
  }
  const result = await reader.bitcoinTransaction(request.txid);
  if (result.observed !== true) throw new Error("Broadcast not observed; keep reservation");
  const tx = Transaction.fromHex(result.hex);
  if (tx.getId() !== request.txid || tx.ins.length === 0 || tx.isCoinbase()) throw new Error("Broadcast transaction mismatch");
  const output = tx.outs[request.vout];
  if (!output || output.value !== BigInt(amountSats) ||
      !Buffer.from(output.script).equals(Buffer.from(address.toOutputScript(t.btc_address, networks.bitcoin)))) {
    throw new Error("Broadcast destination or amount mismatch");
  }
  if (attempt && (attempt.inputs.length !== tx.ins.length ||
      attempt.outputScript !== Buffer.from(output.script).toString("hex"))) {
    throw new Error("Broadcast attempt output or inputs mismatch");
  }
  // Destination alone is not outgoing proof: verify every spent prevout belongs
  // to the founder-reviewed service script, using independently fetched raw txs.
  const inputs = new Set<string>();
  for (const [index, input] of tx.ins.entries()) {
    const txid = Buffer.from(input.hash).reverse().toString("hex");
    const key = `${txid}:${input.index}`;
    if (inputs.has(key)) throw new Error("Duplicate broadcast input");
    inputs.add(key);
    const previous = Transaction.fromHex((await reader.bitcoinTransaction(txid)).hex);
    if (previous.getId() !== txid || !previous.outs[input.index] ||
        Buffer.from(previous.outs[input.index].script).toString("hex") !== request.account) {
      throw new Error("Broadcast service input not verified");
    }
    const recorded = attempt?.inputs[index];
    if (recorded && (recorded.txid !== txid || recorded.vout !== input.index ||
        recorded.script !== request.account || recorded.valueSats !== String(previous.outs[input.index].value))) {
      throw new Error("Broadcast attempt service input mismatch");
    }
  }
  return { kind: "bitcoin", provider: request.provider, account: request.account, reference: request.txid,
    identity: `btc:${request.txid}:${request.vout}`, outcome: "paid", amountSats, txid: request.txid, vout: request.vout };
}

export async function inspectWithdrawal(
  pool: Pick<Pool, "connect">, targetInput: WithdrawalTarget, requestInput: EvidenceRequest, reader: WithdrawalEvidenceReader,
) {
  const target = targetSchema.parse(targetInput), request = requestSchema.parse(requestInput);
  if (target.kind !== request.kind) throw new Error("Evidence kind mismatch");
  const c = await pool.connect();
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const state = await readSnapshot(c, target);
    requireReserved(state, target);
    const proof = await verifyProof(state, request, reader);
    await c.query("COMMIT");
    return { target, request, snapshot: state.snapshot, snapshotHash: state.snapshotHash, proof, proofHash: digest(proof) };
  } catch (error) { await c.query("ROLLBACK"); throw error; }
  finally { c.release(); }
}

/** No automatic startup hook or public approval endpoint. A privileged operator
 * consumes an independently recorded founder approval, never creates one. */
export async function applyWithdrawalReconciliation(
  pool: Pick<Pool, "connect">, approvalId: string, confirmedKey: string,
  kind: WithdrawalTarget["kind"], reader: WithdrawalEvidenceReader,
) {
  z.string().uuid().parse(approvalId);
  if (!confirmedKey) throw new Error("Explicit reconciliation-key confirmation required");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL lock_timeout='5s'");
    // Also serializes proof reuse across different obligations and approvals.
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended('withdrawal-reconciliation',0))");
    const record = (await c.query(`SELECT a.details,a.resource_id,a.user_id,u.role,u.username FROM audit_logs a
      JOIN users u ON u.id=a.user_id WHERE a.id=$1 AND a.action='withdrawal_reconciliation_approved'
      AND a.resource='withdrawal' AND a.status='success' FOR SHARE OF a,u`, [approvalId])).rows[0];
    if (!record || record.role !== "admin" || record.username?.toLowerCase() !== "nexus") throw new Error("Recorded founder-admin approval required");
    const plan = withdrawalApprovalSchema.parse(record.details);
    if (plan.target.kind !== kind || record.resource_id !== String(plan.target.transactionId) ||
        confirmedKey !== plan.reconciliationKey) throw new Error("Approval or confirmation mismatch");
    const used = (await c.query(`SELECT details FROM audit_logs WHERE action='withdrawal_reconciliation_applied'
      AND status='success' AND details->>'reconciliationKey'=$1`, [confirmedKey])).rows;
    if (used.length) {
      if (used.length !== 1 || used[0].details.approvalId !== approvalId) throw new Error("Reconciliation key already used by another approval");
      await c.query("COMMIT");
      return { status: "already_applied" as const };
    }
    if (Date.parse(plan.expiresAt) <= Date.now()) throw new Error("Approval expired");
    const state = await readSnapshot(c, plan.target, true);
    requireReserved(state, plan.target);
    if (state.snapshotHash !== plan.snapshotHash) throw new Error("Obligation changed since review");
    const proof = await verifyProof(state, plan.request, reader);
    if (digest(proof) !== plan.proofHash) throw new Error("Provider proof changed since review");
    const reused = await c.query(`SELECT id FROM audit_logs WHERE action='withdrawal_reconciliation_applied'
      AND status='success' AND details->'proof'->>'identity'=$1`, [proof.identity]);
    if (reused.rowCount) throw new Error("Outgoing proof already used");
    // Historical terminal withdrawals must not reuse the same outgoing identity.
    const historical = proof.kind === "bitcoin"
      ? await c.query(`SELECT id FROM lightning_transactions WHERE type='withdrawal' AND id<>$1 AND btc_txid=$2`, [state.t.id, proof.txid])
      : await c.query(`SELECT id FROM lightning_transactions WHERE type='withdrawal' AND id<>$1
          AND (lower(payment_request)=$2 OR payment_hash=$3)`, [state.t.id, proof.invoice, proof.paymentHash]);
    const otherInvoice = proof.kind === "lightning" ? await c.query(`SELECT id FROM lightning_payment_queue
      WHERE lower(invoice)=$1 AND id<>$2`, [proof.invoice, state.q?.id ?? -1]) : undefined;
    if (historical.rowCount || otherInvoice?.rowCount) throw new Error("Outgoing identity is shared by another obligation; review required");
    const { t, q } = state;
    if (proof.outcome === "rejected") {
      const wallet = await c.query(`UPDATE lightning_wallets SET sats_balance=sats_balance+$2::bigint,
        total_withdrawn=total_withdrawn-$2::bigint,updated_at=now()
        WHERE user_id=$1 AND total_withdrawn >= $2::bigint RETURNING id`, [t.user_id, proof.amountSats]);
      if (wallet.rowCount !== 1) throw new Error("Refund wallet or reserved counter missing");
      await c.query(`INSERT INTO lightning_transactions(user_id,type,amount_sats,status,memo,completed_at)
        VALUES($1,'withdrawal_refund',$2,'completed',$3,now())`,
      [t.user_id, proof.amountSats, `Approved outgoing rejection ${confirmedKey}; parent ${t.id}; queue ${q?.id ?? "none"}`]);
    }
    if (q) {
      const changed = await c.query(`UPDATE lightning_payment_queue SET status=$2,last_error=NULL,
        paid_at=CASE WHEN $2='paid' THEN now() ELSE NULL END WHERE id=$1 AND status IN ('processing','unknown') RETURNING id`,
      [q.id, proof.outcome === "paid" ? "paid" : "refunded"]);
      if (changed.rowCount !== 1) throw new Error("Queue transition lost");
      const states = (await c.query("SELECT status FROM lightning_payment_queue WHERE tx_id=$1", [t.id])).rows.map(r => r.status);
      if (states.every(s => s === "paid" || s === "refunded")) {
        const status = states.every(s => s === "paid") ? "completed" : states.every(s => s === "refunded") ? "refunded" : "partially_refunded";
        await c.query("UPDATE lightning_transactions SET status=$2,completed_at=now() WHERE id=$1", [t.id, status]);
      }
    } else {
      const changed = await c.query(`UPDATE lightning_transactions SET status=$2,completed_at=now(),
        btc_txid=COALESCE($3,btc_txid),payment_hash=COALESCE($4,payment_hash)
        WHERE id=$1 AND status IN ('processing','unknown') RETURNING id`,
      [t.id, proof.outcome === "paid" ? "completed" : "refunded", proof.txid ?? null, proof.paymentHash ?? null]);
      if (changed.rowCount !== 1) throw new Error("Withdrawal transition lost");
    }
    await c.query(`INSERT INTO audit_logs(id,user_id,action,resource,resource_id,details,status)
      VALUES($1,$2,'withdrawal_reconciliation_applied','withdrawal',$3,$4::jsonb,'success')`,
    [randomUUID(), record.user_id, String(t.id), JSON.stringify({
      reconciliationKey: confirmedKey, approvalId, target: plan.target, snapshotHash: plan.snapshotHash,
      proofHash: plan.proofHash, reason: plan.reason, before: state.snapshot, proof,
    })]);
    await c.query("COMMIT");
    return { status: "applied" as const };
  } catch (error) { await c.query("ROLLBACK"); throw error; }
  finally { c.release(); }
}
