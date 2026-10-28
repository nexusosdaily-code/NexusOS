import { beforeAll, afterAll, describe, it, expect } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  acknowledgeWalletWave, broadcastWalletWave, receiveWaveCommission,
  sendWalletWave, setWaveConsent, setWaveSubscription, waveOverview, waveCommitment,
} from "./wallet-wave-service";
import { resolveWalletWave } from "./wnsp-address-resolution";
import {
  verifyCommunityPerson, nominateCommunityReviewer, createCommunityElection,
  castCommunityBallot, finaliseCommunityElection, ElectionError,
} from "./governance/community-election-service";
import { fileContinuityRequest, scheduleContinuityRequest, relinquishCommunityMandate } from "./governance/community-election-continuity";
import { installCommunicationIdentityAuthorizer } from "./governance/communication-identity-gate";

// All delivery/election/ledger effects stay inside this disposable schema.
const schema = `wave_test_${randomUUID().replaceAll("-", "")}`;
const root = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},pg_catalog` });
const admin = { id: randomUUID(), role: "admin" };
const holder = { id: randomUUID(), role: "user" };
const voter = { id: randomUUID(), role: "user" };
const recipient = { id: randomUUID(), role: "user" };
const stranger = { id: randomUUID(), role: "user" };
const topic = "technical-security" as const;
const text = "Exact synthetic community announcement; never sent to real wallets.";
const instructions = JSON.stringify({ protocol: "wallet-wave-broadcast/v1", publicBroadcasts: [{ topic, content: text }] });
const common = { confirmPublicNonSensitive: true as const, confirmConstitutionBound: true as const };
let mandate: string, commission: string, privateId: string, broadcastId: string;
const uri = (a: { id: string }) => `wnsp://Ψ(84,23,H)/${a.id}`;
const count = async (table: string) => Number((await pool.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
async function register(a: { id: string }, withMembership = false) {
  await pool.query("INSERT INTO users(id) VALUES($1)", [a.id]);
  await pool.query("INSERT INTO wallets(user_id,address) VALUES($1,$2)", [a.id, `wallet-${a.id}`]);
  await pool.query(`INSERT INTO wnsp_registry(wnsp_uri,psi_channel,resource_type,resource_id,registered_by,is_canonical)
    VALUES($1,'Ψ(84,23,H)','user',$2::text,$2::varchar(36),true)`, [uri(a), a.id]);
  if (withMembership) await verifyCommunityPerson(pool, admin, {
    userId: a.id, personReference: `opaque-synthetic-${a.id}`, evidenceReference: "private-test-evidence",
    confirmUniqueHuman: true, confirmNoOrganisation: true,
  });
}
async function finish(id: string, approve = true) {
  await pool.query("UPDATE community_elections SET opens_at=now()-interval '2 days',closes_at=now()+interval '1 day' WHERE id=$1", [id]);
  await castCommunityBallot(pool, voter, id, approve ? "yes" : "no");
  await pool.query("UPDATE community_elections SET closes_at=now()-interval '1 day' WHERE id=$1", [id]);
  return finaliseCommunityElection(pool, admin, id);
}
async function commissionVote(grounds = instructions) {
  const request = await fileContinuityRequest(pool, voter, { kind: "commission", targetId: mandate, grounds, ...common });
  const e = await scheduleContinuityRequest(pool, admin, request.id, new Date(Date.now() + 8 * 86400000).toISOString());
  await finish(e.id);
  return e.id;
}
beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for isolated wallet wave tests");
  await root.query(`CREATE SCHEMA ${schema}`);
  await pool.query(`
    CREATE TABLE users(id varchar(36) PRIMARY KEY,is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE wallets(id varchar(36) UNIQUE NOT NULL DEFAULT gen_random_uuid(),user_id varchar(36) PRIMARY KEY REFERENCES users(id),address text UNIQUE NOT NULL);
    CREATE TABLE wnsp_registry(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),wnsp_uri text UNIQUE NOT NULL,
      psi_channel text NOT NULL,resource_type text NOT NULL,resource_id text,registered_by varchar(36),
      is_canonical boolean NOT NULL DEFAULT false,created_at timestamptz DEFAULT now());
    CREATE TABLE friendships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),requester_id varchar(36),
      addressee_id varchar(36),status text);
    CREATE TABLE lambda_messages(id varchar(36) PRIMARY KEY,sender_id varchar(36),recipient_id varchar(36),
      content text,is_read boolean,is_decoded boolean,created_at timestamp,read_at timestamp,
      encoded_frames jsonb,spectral_hash text,total_lambda_mass numeric,wavelength_min numeric,
      wavelength_max numeric,intensity integer,cycles integer);
    CREATE TABLE blockchain_blocks (LIKE public.blockchain_blocks INCLUDING ALL);
    CREATE TABLE test_independent_verifications(user_id varchar(36) PRIMARY KEY,role text,valid boolean NOT NULL);
    CREATE TABLE test_clock(at timestamptz);
    CREATE FUNCTION clock_timestamp() RETURNS timestamptz LANGUAGE sql AS $$
      SELECT COALESCE((SELECT at FROM test_clock LIMIT 1),pg_catalog.clock_timestamp())
    $$;
  `);
  await register(admin);
  await pool.query(await readFile("migrations/community-elections.sql", "utf8"));
  await pool.query(await readFile("migrations/community-election-continuity.sql", "utf8"));
  await pool.query(await readFile("migrations/wallet-wave-communications.sql", "utf8"));
  await pool.query(`INSERT INTO blockchain_blocks
    (block_number,content,wavelength_nm,psi_channel,wdm,oam,polarisation,band,energy_joules,lambda_mass_kg,frequency_hz)
    VALUES(0,'isolated genesis',550,'Ψ(108,0,H)',108,0,'H','USER',0,0,1)`);
  for (const a of [holder, voter, recipient, stranger]) await register(a, true);
  await pool.query("INSERT INTO friendships(requester_id,addressee_id,status) VALUES($1,$2,'accepted')", [holder.id, recipient.id]);
  const n = await nominateCommunityReviewer(pool, holder, {
    publicName: "Synthetic test holder", role: topic, statement: "Only community-approved instructions, no independent policy.",
    publicKey: (randomUUID() + randomUUID()).replaceAll("-", ""), consent: true,
  });
  const start = new Date(Date.now() + 8 * 86400000);
  mandate = (await createCommunityElection(pool, admin, {
    kind: "reviewer", nominationId: n.id, designation: "principal", title: "Synthetic reviewer seat",
    body: "Elect a consenting synthetic reviewer within constitutional limits.",
    opensAt: start.toISOString(), closesAt: new Date(start.getTime() + 14 * 86400000).toISOString(),
    confirmAuthorityPreserved: true,
  })).id;
  await finish(mandate);
  commission = await commissionVote();
}, 30000);
afterAll(async () => {
  await pool.end();
  await root.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await root.end();
});

describe.sequential("wallet wave consent, privacy and atomic delivery", () => {
  it("reuses exact canonical registry resolution and refuses ambiguous or forged owner mappings", async () => {
    expect(await resolveWalletWave(pool, uri(recipient))).toMatchObject({ userId: recipient.id });
    expect(await resolveWalletWave(pool, `wallet-${recipient.id}`)).toMatchObject({ userId: recipient.id });
    await expect(resolveWalletWave(pool, "Ψ(84,23,H)")).rejects.toThrow("ambiguous");
    await pool.query(`INSERT INTO wnsp_registry(wnsp_uri,psi_channel,resource_type,resource_id,registered_by)
      VALUES('wnsp://Ψ(2,2,H)/forged','Ψ(2,2,H)','user',$1,$2)`, [holder.id, stranger.id]);
    await expect(resolveWalletWave(pool, "wnsp://Ψ(2,2,H)/forged")).rejects.toThrow("unregistered");
    await expect(resolveWalletWave(pool, "Synthetic test holder")).rejects.toThrow("exact wallet");
    await pool.query(`INSERT INTO wnsp_registry(wnsp_uri,psi_channel,resource_type,registered_by)
      VALUES('wnsp://Ψ(3,2,H)/legacy','Ψ(3,2,H)','user',$1)`, [recipient.id]);
    expect(await resolveWalletWave(pool, "wnsp://Ψ(3,2,H)/legacy")).toMatchObject({ userId: recipient.id });
    const wallet = (await pool.query("SELECT id FROM wallets WHERE user_id=$1", [recipient.id])).rows[0];
    await pool.query(`INSERT INTO wnsp_registry(wnsp_uri,psi_channel,resource_type,resource_id,registered_by)
      VALUES('wnsp://Ψ(3,3,H)/wallet','Ψ(3,3,H)','wallet',$1,$2)`, [wallet.id, recipient.id]);
    expect(await resolveWalletWave(pool, "wnsp://Ψ(3,3,H)/wallet")).toMatchObject({ userId: recipient.id });
  });
  it("blocks unsolicited private messages and grants only recipient-controlled consent", async () => {
    const input = { recipientAddress: uri(stranger), content: "private", idempotencyKey: randomUUID() };
    await expect(sendWalletWave(pool, holder, input)).rejects.toThrow("Recipient must");
    expect(await count("wave_communications")).toBe(0);
    await setWaveConsent(pool, stranger, uri(holder), true);
    const sent = await sendWalletWave(pool, holder, input);
    expect(sent.verified).toBe(true);
    const ledger = (await pool.query("SELECT content FROM blockchain_blocks WHERE block_number=$1", [sent.blockNumber])).rows[0].content;
    expect(ledger).not.toContain(holder.id);
    expect(ledger).not.toContain(stranger.id);
    expect(ledger).not.toContain("private-test-evidence");
    expect(ledger).not.toContain('"content"');
  });
  it("atomically sends one private message and one ledger entry across concurrent retries", async () => {
    const key = randomUUID(), before = await count("blockchain_blocks");
    const input = { recipientAddress: uri(recipient), content: "Private low-entropy content stays off the chain", idempotencyKey: key };
    const results = await Promise.all(Array.from({ length: 4 }, () => sendWalletWave(pool, holder, input)));
    expect(new Set(results.map(r => r.id)).size).toBe(1);
    expect(await count("blockchain_blocks")).toBe(before + 1);
    privateId = results[0].id;
    const row = (await pool.query("SELECT * FROM wave_communications WHERE id=$1", [privateId])).rows[0];
    expect(row.salt).toHaveLength(64);
    expect(row.commitment).toBe(waveCommitment(row.salt, row.envelope));
    const duplicateText = await sendWalletWave(pool, holder, { ...input, idempotencyKey: randomUUID() });
    expect(duplicateText.commitment).not.toBe(row.commitment);
    await expect(sendWalletWave(pool, holder, { ...input, content: "changed" })).rejects.toThrow("different content");
    expect((await waveOverview(pool, recipient)).inbox.find(m => m.id === privateId)?.content).toBe(input.content);
    await expect(acknowledgeWalletWave(pool, stranger, privateId)).rejects.toThrow("not in your inbox");
  });
  it("recipient denial overrides friendship, blocks new acknowledgements and does not duplicate a committed retry", async () => {
    await setWaveConsent(pool, recipient, uri(holder), false);
    await expect(sendWalletWave(pool, holder, {
      recipientAddress: uri(recipient), content: "refused", idempotencyKey: randomUUID(),
    })).rejects.toThrow("Recipient must");
    await expect(acknowledgeWalletWave(pool, recipient, privateId)).rejects.toThrow("withdrawn");
    const row = (await pool.query("SELECT * FROM wave_communications WHERE id=$1", [privateId])).rows[0];
    expect((await sendWalletWave(pool, holder, {
      recipientAddress: uri(recipient), content: row.content, idempotencyKey: row.idempotency_key,
    })).id).toBe(privateId);
    await setWaveConsent(pool, recipient, uri(holder), true);
  });
  it("authorises a receipt atomically and returns the same verified record on retry", async () => {
    const before = await count("blockchain_blocks");
    const results = await Promise.all(Array.from({ length: 3 }, () => acknowledgeWalletWave(pool, recipient, privateId)));
    expect(results.every(r => r.receipt?.verified)).toBe(true);
    expect(new Set(results.map(r => r.receipt!.commitment)).size).toBe(1);
    expect(await count("blockchain_blocks")).toBe(before + 1);
    const linked = (await pool.query(`SELECT l.* FROM lambda_messages l
      JOIN wave_communications w ON w.message_id=l.id WHERE w.id=$1`, [privateId])).rows[0];
    expect(linked.is_read).toBe(true);
    const r = (await pool.query("SELECT * FROM wave_receipts WHERE communication_id=$1", [privateId])).rows[0];
    const ledger = (await pool.query("SELECT content FROM blockchain_blocks WHERE block_number=$1", [r.block_number])).rows[0].content;
    expect(ledger).not.toContain(recipient.id);
    expect(ledger).not.toContain(privateId);
    expect(ledger).not.toContain(r.salt);
  });
  it("rolls back the ledger and private message when final insertion fails, then safely retries", async () => {
    const before = [await count("blockchain_blocks"), await count("lambda_messages"), await count("wave_communications")];
    await pool.query(`CREATE FUNCTION test_fail_wave_insert() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'synthetic insert failure'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_fail_wave BEFORE INSERT ON wave_communications FOR EACH ROW EXECUTE FUNCTION test_fail_wave_insert()`);
    const input = { recipientAddress: uri(recipient), content: "rollback test", idempotencyKey: randomUUID() };
    await expect(sendWalletWave(pool, holder, input)).rejects.toThrow("synthetic insert failure");
    expect([await count("blockchain_blocks"), await count("lambda_messages"), await count("wave_communications")]).toEqual(before);
    await pool.query("DROP TRIGGER test_fail_wave ON wave_communications");
    expect((await sendWalletWave(pool, holder, input)).verified).toBe(true);
  });
  it("rolls back a failed receipt append without marking the message read", async () => {
    const sent = await sendWalletWave(pool, holder, {
      recipientAddress: uri(recipient), content: "Receipt rollback test", idempotencyKey: randomUUID(),
    });
    const before = await count("blockchain_blocks");
    await pool.query(`CREATE FUNCTION test_fail_receipt_insert() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'synthetic receipt failure'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_fail_receipt BEFORE INSERT ON wave_receipts FOR EACH ROW EXECUTE FUNCTION test_fail_receipt_insert()`);
    await expect(acknowledgeWalletWave(pool, recipient, sent.id)).rejects.toThrow("synthetic receipt failure");
    expect(await count("blockchain_blocks")).toBe(before);
    expect((await pool.query(`SELECT l.is_read FROM lambda_messages l JOIN wave_communications w
      ON w.message_id=l.id WHERE w.id=$1`, [sent.id])).rows[0].is_read).toBe(false);
    await pool.query("DROP TRIGGER test_fail_receipt ON wave_receipts");
    expect((await acknowledgeWalletWave(pool, recipient, sent.id)).receipt?.verified).toBe(true);
  });
});

describe.sequential("exact community instructions and future-wallet subscriptions", () => {
  it("fails closed without independent verification; an election or manual membership is not enough", async () => {
    await expect(receiveWaveCommission(pool, holder, commission, randomUUID())).rejects.toThrow("independent human");
    await expect(broadcastWalletWave(pool, holder, {
      commissionId: commission, topic, content: text, idempotencyKey: randomUUID(), confirmPublic: true,
    })).rejects.toThrow("independent human");
    expect((await waveOverview(pool, holder)).identityAuthorisationReady).toBe(false);
    // Synthetic provider only in this isolated test process, never app startup or live data.
    installCommunicationIdentityAuthorizer(async ({ client, actor, role }) => {
      const row = (await client.query("SELECT * FROM test_independent_verifications WHERE user_id=$1", [actor.id])).rows[0];
      if (!row?.valid || row.role !== role) throw new ElectionError(403, "Independent identity or separate role authorisation invalid");
    });
    await pool.query("INSERT INTO test_independent_verifications VALUES($1,$2,true)", [holder.id, topic]);
  });
  it("delivers only the exact approved commission to its holder and deduplicates keys", async () => {
    await expect(receiveWaveCommission(pool, stranger, commission, randomUUID())).rejects.toThrow("Only the eligible holder");
    const key = randomUUID(), first = await receiveWaveCommission(pool, holder, commission, key);
    const again = await receiveWaveCommission(pool, holder, commission, randomUUID());
    expect(again.id).toBe(first.id);
    const e = (await pool.query("SELECT body FROM community_elections WHERE id=$1", [commission])).rows[0];
    expect(first.content).toBe(e.body);
    expect(first.kind).toBe("commission");
    expect((await acknowledgeWalletWave(pool, holder, first.id)).receipt?.verified).toBe(true);
  });
  it("publishes only exact text and audience once, with explicit public confirmation", async () => {
    const base = { commissionId: commission, topic, content: text, idempotencyKey: randomUUID(), confirmPublic: true as const };
    await expect(broadcastWalletWave(pool, stranger, base)).rejects.toThrow("Only the eligible holder");
    await expect(broadcastWalletWave(pool, holder, { ...base, content: text + " extra discretion" })).rejects.toThrow("exactly match");
    await expect(broadcastWalletWave(pool, holder, { ...base, topic: "constitutional-legal" })).rejects.toThrow("exactly match");
    const before = await count("blockchain_blocks");
    const first = await broadcastWalletWave(pool, holder, base);
    const again = await broadcastWalletWave(pool, holder, { ...base, idempotencyKey: randomUUID() });
    expect(first.id).toBe(again.id);
    broadcastId = first.id;
    expect(await count("blockchain_blocks")).toBe(before + 1);
    expect((await pool.query("SELECT content FROM blockchain_blocks WHERE block_number=$1", [first.blockNumber])).rows[0].content).toContain(text);
    expect((await waveOverview(pool, recipient)).inbox.some(m => m.id === broadcastId)).toBe(false);
  });
  it("dynamically serves future wallets only after opt-in and respects unsubscribe at receipt time", async () => {
    const future = { id: randomUUID(), role: "user" };
    await register(future);
    expect((await waveOverview(pool, future)).inbox).toHaveLength(0);
    await setWaveSubscription(pool, future, topic, true);
    expect((await waveOverview(pool, future)).inbox.find(m => m.id === broadcastId)?.verified).toBe(true);
    const before = await count("blockchain_blocks");
    const first = await acknowledgeWalletWave(pool, future, broadcastId);
    const again = await acknowledgeWalletWave(pool, future, broadcastId);
    expect(again.receipt?.commitment).toBe(first.receipt?.commitment);
    expect(await count("blockchain_blocks")).toBe(before + 1);
    await setWaveSubscription(pool, future, topic, false);
    expect((await waveOverview(pool, future)).inbox).toHaveLength(0);
    await expect(acknowledgeWalletWave(pool, future, broadcastId)).rejects.toThrow("Subscribe");
    // Subscriber identities/individual receipts never appear in the holder's public broadcast outbox.
    expect((await waveOverview(pool, holder)).outbox.find(m => m.id === broadcastId)?.receipt).toBeNull();
  });
  it("checks independent identity/role revocation again at delivery time", async () => {
    await pool.query("UPDATE test_independent_verifications SET valid=false WHERE user_id=$1", [holder.id]);
    const fresh = await commissionVote();
    await expect(receiveWaveCommission(pool, holder, fresh, randomUUID())).rejects.toThrow("Independent identity");
    await expect(broadcastWalletWave(pool, holder, {
      commissionId: fresh, topic, content: text, idempotencyKey: randomUUID(), confirmPublic: true,
    })).rejects.toThrow("Independent identity");
    await pool.query("UPDATE test_independent_verifications SET valid=true WHERE user_id=$1", [holder.id]);
    await expect(broadcastWalletWave(pool, holder, {
      commissionId: commission, topic, content: "changed", idempotencyKey: randomUUID(), confirmPublic: true,
    })).rejects.toThrow("superseded");
    commission = fresh;
  });
  it("rejects naturally expired mandates without modifying the accepted records", async () => {
    const end = (await pool.query("SELECT term_ends_at FROM community_elections WHERE id=$1", [mandate])).rows[0].term_ends_at;
    await pool.query("INSERT INTO test_clock(at) VALUES($1)", [new Date(new Date(end).getTime() + 1)]);
    try {
      await expect(receiveWaveCommission(pool, holder, commission, randomUUID())).rejects.toThrow("live, resolved mandate");
      await expect(broadcastWalletWave(pool, holder, {
        commissionId: commission, topic, content: text, idempotencyKey: randomUUID(), confirmPublic: true,
      })).rejects.toThrow("live, resolved mandate");
    } finally { await pool.query("DELETE FROM test_clock"); }
  });
  it("pauses during a mandate appeal and resumes only after community rejection of the appeal", async () => {
    const r = await fileContinuityRequest(pool, voter, { kind: "appeal", targetId: mandate,
      groundType: "procedure", grounds: "Synthetic procedural appeal, not a new instruction.", ...common });
    await expect(receiveWaveCommission(pool, holder, commission, randomUUID())).rejects.toThrow("paused");
    // Isolated test clock fixtures; production has no history edit endpoint.
    await pool.query("ALTER TABLE community_continuity_requests DISABLE TRIGGER community_immutable_requests");
    try { await pool.query("UPDATE community_continuity_requests SET filing_ends_at=now()-interval '1 day' WHERE id=$1", [r.id]); }
    finally { await pool.query("ALTER TABLE community_continuity_requests ENABLE TRIGGER community_immutable_requests"); }
    const resolution = await scheduleContinuityRequest(pool, admin, r.id, new Date(Date.now() + 8 * 86400000).toISOString());
    await finish(resolution.id, false);
    expect((await receiveWaveCommission(pool, holder, commission, randomUUID())).verified).toBe(true);
  });
  it("pauses new delivery and subscriber receipts during unresolved recall", async () => {
    const first = await broadcastWalletWave(pool, holder, {
      commissionId: commission, topic, content: text, idempotencyKey: randomUUID(), confirmPublic: true,
    });
    await setWaveSubscription(pool, recipient, topic, true);
    await fileContinuityRequest(pool, voter, { kind: "recall", targetId: mandate,
      grounds: "Synthetic recall grounds; community alone resolves this request.", ...common });
    await expect(receiveWaveCommission(pool, holder, commission, randomUUID())).rejects.toThrow("paused");
    await expect(acknowledgeWalletWave(pool, recipient, first.id)).rejects.toThrow("paused");
    expect((await waveOverview(pool, recipient)).inbox.some(m => m.id === first.id)).toBe(false);
    await relinquishCommunityMandate(pool, holder, mandate);
    await expect(receiveWaveCommission(pool, holder, commission, randomUUID())).rejects.toThrow("live, resolved mandate");
  });
  it("refuses modified permanent content and receipt records rather than silently claiming verification", async () => {
    const row = (await pool.query("SELECT * FROM wave_communications WHERE id=$1", [privateId])).rows[0];
    await expect(pool.query("UPDATE wave_communications SET content='altered' WHERE id=$1", [privateId])).rejects.toThrow("immutable");
    await expect(pool.query("DELETE FROM wave_receipts WHERE communication_id=$1", [privateId])).rejects.toThrow("immutable");
    await pool.query("UPDATE blockchain_blocks SET content='tampered' WHERE block_number=$1", [row.block_number]);
    await expect(waveOverview(pool, holder)).rejects.toThrow("verification failed");
    await pool.query("UPDATE blockchain_blocks SET content=$2 WHERE block_number=$1", [row.block_number, row.ledger_content]);
    const receiptRow = (await pool.query("SELECT * FROM wave_receipts WHERE communication_id=$1", [privateId])).rows[0];
    await pool.query("UPDATE blockchain_blocks SET content='tampered receipt' WHERE block_number=$1", [receiptRow.block_number]);
    await expect(waveOverview(pool, holder)).rejects.toThrow("Receipt permanent-record verification failed");
  });
});
