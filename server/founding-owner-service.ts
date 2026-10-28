import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { INITIAL_OWNER_REGISTER, type OwnerRegister } from "../shared/founding-owners";

export const OWNER_GIFT_AMOUNT = "500000000.00000000";
export const ownerGiftSchema = z.object({
  recipientEmail: z.string().trim().email().max(254),
  publicName: z.string().trim().min(1).max(40)
    .regex(/^[\p{L}\p{N} ._'’-]+$/u, "Use a public name or handle without email addresses or markup"),
  confirm: z.literal(true),
}).strict();

export class OwnerGiftError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function isFounder(user?: { role: string; username: string }): boolean {
  return user?.role === "admin" && user.username.toLowerCase() === "nexus";
}

export async function getOwnerRegister(pool: Pick<Pool, "query">): Promise<OwnerRegister> {
  const { rows } = await pool.query(`
    SELECT t.id, t.created_at, t.metadata->>'publicName' AS public_name,
           w.address, u.spectral_band, u.created_at AS joined
    FROM transactions t
    JOIN wallets w ON w.id = t.to_wallet_id
    JOIN users u ON u.id = w.user_id
    WHERE t.type = 'owner_reassignment' AND t.status = 'completed'
      AND t.metadata->>'ownerSeat' = '1'
      AND EXISTS (
        SELECT 1 FROM audit_logs a JOIN users founder ON founder.id=a.user_id
        WHERE a.action='founding_owner_gift' AND a.resource_id=t.id
          AND a.status='success' AND founder.role='admin' AND lower(founder.username)='nexus'
      )
    ORDER BY t.created_at DESC LIMIT 1
  `);
  const gift = rows[0];
  const owners = INITIAL_OWNER_REGISTER.map((owner) => ({ ...owner }));
  if (gift) {
    // Never expose the recipient's account username/email in the public register.
    owners[0] = {
      rank: 1, username: gift.public_name || "Owner 01",
      band: gift.spectral_band || "USER", nxt: Number(OWNER_GIFT_AMOUNT),
      joined: new Date(gift.joined).toISOString().slice(0, 10), wallet: gift.address,
    };
  }
  return {
    owners,
    disclosureDate: gift ? new Date(gift.created_at).toISOString().slice(0, 10) : "2026-06-17",
    replacementComplete: !!gift,
    transferId: gift?.id ?? null,
  };
}

export async function executeOwnerGift(
  pool: Pick<Pool, "connect">,
  actor: { id: string; role: string; username: string },
  rawInput: unknown,
): Promise<{ ok: true; alreadyCompleted: boolean; transferId: string }> {
  if (!isFounder(actor)) throw new OwnerGiftError(403, "Founder authorization required");
  const input = ownerGiftSchema.parse(rawInput);
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize both normal requests and retries for this one-time seat replacement.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nexus-owner-seat-1-gift'))");
    const recipients = await client.query(`
      SELECT id, is_active FROM users
      WHERE lower(email) = lower($1) OR lower(username) = lower($1)
      FOR UPDATE
    `, [input.recipientEmail]);
    if (recipients.rows.length !== 1)
      throw new OwnerGiftError(404, "Recipient must match exactly one existing member");
    const recipient = recipients.rows[0];
    const previous = await client.query(`
      SELECT t.id, w.user_id
      FROM transactions t JOIN wallets w ON w.id=t.to_wallet_id
      WHERE t.type='owner_reassignment' AND t.status='completed'
        AND t.metadata->>'ownerSeat'='1'
        AND EXISTS (
          SELECT 1 FROM audit_logs a JOIN users founder ON founder.id=a.user_id
          WHERE a.action='founding_owner_gift' AND a.resource_id=t.id
            AND a.status='success' AND founder.role='admin' AND lower(founder.username)='nexus'
        )
      LIMIT 1
    `);
    if (previous.rows[0]) {
      if (previous.rows[0].user_id !== recipient.id)
        throw new OwnerGiftError(409, "Owner seat 1 has already been reassigned to a different member");
      await client.query("COMMIT");
      return { ok: true, alreadyCompleted: true, transferId: previous.rows[0].id };
    }
    if (!recipient.is_active) throw new OwnerGiftError(409, "Recipient account is inactive");
    const donors = await client.query("SELECT id FROM users WHERE lower(username)='dsmart' FOR UPDATE");
    if (donors.rows.length !== 1) throw new OwnerGiftError(409, "Source account could not be identified uniquely");
    const donor = donors.rows[0];
    if (donor.id === recipient.id) throw new OwnerGiftError(400, "Source and recipient must differ");
    const { rows: wallets } = await client.query(`
      SELECT id, user_id FROM wallets WHERE user_id = ANY($1::varchar[])
      ORDER BY id FOR UPDATE
    `, [[donor.id, recipient.id]]);
    const source = wallets.find((wallet) => wallet.user_id === donor.id);
    const destination = wallets.find((wallet) => wallet.user_id === recipient.id);
    if (!source || !destination) throw new OwnerGiftError(409, "Both members must have an existing NXT wallet");
    const debit = await client.query(`
      UPDATE wallets SET balance=balance-$1::numeric, updated_at=now()
      WHERE id=$2 AND balance-locked_balance >= $1::numeric RETURNING id
    `, [OWNER_GIFT_AMOUNT, source.id]);
    if (debit.rows.length !== 1) throw new OwnerGiftError(409, "Source has insufficient unlocked NXT");
    const credit = await client.query(`
      UPDATE wallets SET balance=balance+$1::numeric, updated_at=now() WHERE id=$2 RETURNING id
    `, [OWNER_GIFT_AMOUNT, destination.id]);
    if (credit.rows.length !== 1) throw new OwnerGiftError(409, "Recipient wallet is unavailable");
    await client.query(`
      UPDATE users SET is_active=false, withdrawals_blocked=true, updated_at=now() WHERE id=$1
    `, [donor.id]);
    const metadata = {
      ownerSeat: 1, publicName: input.publicName, authorizedBy: actor.id,
      description: "Founder-authorized transfer of existing NXT allocation; owner seat 1 replacement",
      amountNxt: OWNER_GIFT_AMOUNT,
    };
    const transfer = await client.query(`
      INSERT INTO transactions (from_wallet_id,to_wallet_id,amount,fee,type,status,metadata,confirmed_at)
      VALUES ($1,$2,$3,0,'owner_reassignment','completed',$4::jsonb,now()) RETURNING id
    `, [source.id, destination.id, OWNER_GIFT_AMOUNT, JSON.stringify(metadata)]);
    await client.query(`
      INSERT INTO audit_logs (user_id,action,resource,resource_id,details,status)
      VALUES ($1,'founding_owner_gift','wallet',$2,$3::jsonb,'success')
    `, [actor.id, transfer.rows[0].id, JSON.stringify({
      transferId: transfer.rows[0].id, fromWalletId: source.id, toWalletId: destination.id,
      amountNxt: OWNER_GIFT_AMOUNT, ownerSeat: 1,
    })]);
    await client.query("COMMIT");
    return { ok: true, alreadyCompleted: false, transferId: transfer.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}