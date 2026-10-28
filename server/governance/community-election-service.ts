import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { z } from "zod";
import {
  personVerificationSchema, nominationSchema, electionSchema,
  meetsCommunityThreshold, reviewerTermEnd,
  type CommunityElection, type CommunityNomination,
} from "../../shared/community-elections";
import { appendElectionRecord, electionRecordContent, electionRecordDigest } from "./community-election-record";

export class ElectionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type Actor = { id: string; role: string };
export function admin(actor: Actor) {
  if (actor.role !== "admin") throw new ElectionError(403, "Administrator required");
}
export async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Shared lock order across seat changes, membership, ballots and finalisation.
    await client.query("SELECT pg_advisory_xact_lock(706013)");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export async function audit(client: PoolClient, actor: Actor, action: string, id: string) {
  await client.query("INSERT INTO community_election_audit(actor_id,action,resource_id) VALUES($1,$2,$3)",
    [actor.id, action, id]);
}
export async function person(client: PoolClient, actor: Actor) {
  const row = (await client.query(`
    SELECT p.* FROM community_persons p JOIN users u ON u.id=p.user_id
    WHERE p.user_id=$1 AND p.revoked_at IS NULL AND u.is_active=true FOR UPDATE OF p
  `, [actor.id])).rows[0];
  if (!row) throw new ElectionError(403, "A verified unique human community membership is required");
  return row;
}
function nomination(row: any): CommunityNomination {
  return {
    id: row.id, publicName: row.public_name, role: row.role, statement: row.statement,
    publicKey: row.public_key, createdAt: new Date(row.created_at).toISOString(), eligible: row.eligible,
  };
}
const nominationSelect = `
  SELECT n.*, (p.revoked_at IS NULL AND u.is_active=true AND NOT EXISTS(
    SELECT 1 FROM community_nomination_successions s WHERE s.predecessor_id=n.id
  )) AS eligible
  FROM community_nominations n JOIN community_persons p ON p.id=n.person_id
  JOIN users u ON u.id=p.user_id WHERE n.withdrawn_at IS NULL`;

export async function communityOverview(pool: Pool) {
  const { electionSeatDetails } = await import("./community-election-continuity");
  const details = await electionSeatDetails(pool);
  const nominations = (await pool.query(nominationSelect)).rows.map(nomination);
  const rows = (await pool.query(`
    SELECT e.*, COUNT(b.person_id) FILTER(WHERE b.choice='yes')::int AS yes,
      COUNT(b.person_id) FILTER(WHERE b.choice='no')::int AS no
    FROM community_elections e LEFT JOIN community_ballots b ON b.election_id=e.id
    GROUP BY e.id ORDER BY e.created_at DESC
  `)).rows;
  const now = Date.now();
  const elections: CommunityElection[] = rows.map(row => ({
    id: row.id, kind: row.kind, title: row.title, body: row.body, scope: row.scope,
    nomination: nominations.find(n => n.id === row.nomination_id) ?? null,
    opensAt: new Date(row.opens_at).toISOString(), closesAt: new Date(row.closes_at).toISOString(),
    status: row.status !== "pending" ? row.status :
      now < new Date(row.opens_at).getTime() ? "scheduled" :
      now < new Date(row.closes_at).getTime() ? "open" : "awaiting-finalisation",
    yes: row.yes, no: row.no, total: row.yes + row.no,
    supportPercent: row.yes + row.no ? row.yes * 100 / (row.yes + row.no) : 0,
    recordDigest: row.record_digest, blockNumber: row.block_number,
    termStartsAt: row.term_starts_at ? new Date(row.term_starts_at).toISOString() : null,
    termEndsAt: row.term_ends_at ? new Date(row.term_ends_at).toISOString() : null,
    termActive: row.status === "approved" && row.kind === "reviewer" &&
      now >= new Date(row.term_starts_at).getTime() && now < new Date(row.term_ends_at).getTime(),
    createdAt: new Date(row.created_at).toISOString(),
    finalisedAt: row.finalised_at ? new Date(row.finalised_at).toISOString() : null,
    ...details.get(row.id),
  }));
  return { elections, nominations, commissioning: "not-commissioned", thresholdPercent: 51, termYears: 3 };
}
export async function communityMembership(pool: Pool, actor: Actor) {
  const p = (await pool.query(`
    SELECT p.* FROM community_persons p JOIN users u ON u.id=p.user_id
    WHERE p.user_id=$1 AND u.is_active=true`, [actor.id])).rows[0];
  if (!p) return { eligible: false, personId: null, votedElectionIds: [], nominationIds: [] };
  const votes = await pool.query("SELECT election_id FROM community_ballots WHERE person_id=$1", [p.id]);
  const nominations = await pool.query("SELECT id FROM community_nominations WHERE person_id=$1 AND withdrawn_at IS NULL", [p.id]);
  return { eligible: !p.revoked_at, personId: p.id, votedElectionIds: votes.rows.map(r => r.election_id),
    nominationIds: nominations.rows.map(r => r.id) };
}
export async function communityVerifiedPeople(pool: Pool, actor: Actor) {
  admin(actor);
  const { rows } = await pool.query(`
    SELECT id,user_id,verified_at,revoked_at FROM community_persons ORDER BY verified_at DESC
  `);
  return rows.map(row => ({
    personId: row.id, userId: row.user_id, verifiedAt: new Date(row.verified_at).toISOString(),
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
  }));
}
export async function verifyCommunityPerson(pool: Pool, actor: Actor, input: z.infer<typeof personVerificationSchema>) {
  admin(actor);
  if (actor.id === input.userId) throw new ElectionError(403, "A verifier cannot approve their own human membership");
  const digest = createHash("sha256").update(`wnsp-community-person:v1:${input.personReference}`).digest("hex");
  return transaction(pool, async client => {
    const account = (await client.query("SELECT id FROM users WHERE id=$1 AND is_active=true FOR UPDATE", [input.userId])).rows[0];
    if (!account) throw new ElectionError(404, "Active account not found");
    const row = (await client.query(`
      INSERT INTO community_persons(user_id,person_reference_digest,evidence_reference,verified_by)
      VALUES($1,$2,$3,$4) RETURNING id
    `, [input.userId, digest, input.evidenceReference, actor.id])).rows[0];
    await audit(client, actor, "human-membership-verified", row.id);
    return { personId: row.id };
  });
}
export async function revokeCommunityPerson(pool: Pool, actor: Actor, id: string) {
  admin(actor);
  return transaction(pool, async client => {
    const row = (await client.query(
      "UPDATE community_persons SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 RETURNING id", [id],
    )).rows[0];
    if (!row) throw new ElectionError(404, "Membership not found");
    await audit(client, actor, "human-membership-revoked", id);
    // Cast ballots are immutable; revocation prevents new ballots/nominations.
    return { revoked: true };
  });
}
export async function nominateCommunityReviewer(pool: Pool, actor: Actor, input: z.infer<typeof nominationSchema>) {
  return transaction(pool, async client => {
    const p = await person(client, actor);
    const { prepareFreshNomination } = await import("./community-election-continuity");
    const predecessor = await prepareFreshNomination(client, p.id, input.role, input.publicKey.toLowerCase());
    const row = (await client.query(`
      INSERT INTO community_nominations(person_id,public_name,role,statement,public_key)
      VALUES($1,$2,$3,$4,$5) RETURNING id
    `, [p.id, input.publicName, input.role, input.statement, input.publicKey.toLowerCase()])).rows[0];
    if (predecessor) await client.query(
      "INSERT INTO community_nomination_successions(predecessor_id,successor_id) VALUES($1,$2)",
      [predecessor,row.id]);
    await audit(client, actor, "reviewer-self-nominated", row.id);
    return { id: row.id };
  });
}
export async function withdrawCommunityNomination(pool: Pool, actor: Actor, id: string) {
  return transaction(pool, async client => {
    const p = await person(client, actor);
    const n = (await client.query(
      "SELECT id FROM community_nominations WHERE id=$1 AND person_id=$2 AND withdrawn_at IS NULL FOR UPDATE", [id,p.id],
    )).rows[0];
    if (!n) throw new ElectionError(404, "Own active nomination not found");
    if ((await client.query("SELECT id FROM community_elections WHERE nomination_id=$1", [id])).rowCount)
      throw new ElectionError(409, "A nomination referenced by an election is immutable");
    await client.query("UPDATE community_nominations SET withdrawn_at=now() WHERE id=$1", [id]);
    await audit(client, actor, "reviewer-nomination-withdrawn", id);
    return { withdrawn: true };
  });
}
export async function createCommunityElection(pool: Pool, actor: Actor, input: z.infer<typeof electionSchema>) {
  admin(actor);
  return transaction(pool, async client => {
    const now = (await client.query("SELECT clock_timestamp() AS now")).rows[0].now;
    const opens = new Date(input.opensAt), closes = new Date(input.closesAt);
    if (closes <= opens || closes <= now || opens < now)
      throw new ElectionError(400, "Set a future opening time and a later closing time");
    let scope: string;
    if (input.kind === "reviewer") {
      const n = (await client.query(`
        SELECT n.* FROM community_nominations n JOIN community_persons p ON p.id=n.person_id
        JOIN users u ON u.id=p.user_id
        WHERE n.id=$1 AND n.withdrawn_at IS NULL AND p.revoked_at IS NULL AND u.is_active=true
          AND NOT EXISTS(SELECT 1 FROM community_nomination_successions s WHERE s.predecessor_id=n.id)
        FOR UPDATE OF n,p
      `, [input.nominationId])).rows[0];
      if (!n) throw new ElectionError(409, "Eligible consenting nomination required");
      scope = n.role;
    } else scope = input.scope;
    const { prepareSeatElection, preventIndependentPolicy } = await import("./community-election-continuity");
    if (input.kind === "reviewer") await prepareSeatElection(client, input, now);
    else await preventIndependentPolicy(client, actor);
    const row = (await client.query(`
      INSERT INTO community_elections(kind,nomination_id,scope,title,body,opens_at,closes_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `, [input.kind, input.kind === "reviewer" ? input.nominationId : null, scope,
      input.title, input.body, opens, closes, actor.id])).rows[0];
    if (input.kind === "reviewer") await client.query(
      "INSERT INTO community_election_links(election_id,designation,predecessor_id) VALUES($1,$2,$3)",
      [row.id,input.designation ?? "principal",input.predecessorId ?? null]);
    await audit(client, actor, "community-election-created", row.id);
    return { id: row.id };
  });
}
export async function castCommunityBallot(pool: Pool, actor: Actor, id: string, choice: "yes" | "no") {
  return transaction(pool, async client => {
    // All voting/finalisation/cancellation operations lock the election first.
    const e = (await client.query("SELECT * FROM community_elections WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!e) throw new ElectionError(404, "Election not found");
    const now = (await client.query("SELECT clock_timestamp() AS now")).rows[0].now;
    if (e.status !== "pending" || now < e.opens_at || now >= e.closes_at)
      throw new ElectionError(409, "Election is not open");
    const p = await person(client, actor);
    await client.query("INSERT INTO community_ballots(election_id,person_id,choice) VALUES($1,$2,$3)", [id,p.id,choice]);
    // Do not put a person's ballot choice into the public audit or blockchain.
    await audit(client, actor, "community-ballot-cast", id);
    return { cast: true };
  });
}
export async function cancelCommunityElection(pool: Pool, actor: Actor, id: string) {
  admin(actor);
  return transaction(pool, async client => {
    const e = (await client.query("SELECT * FROM community_elections WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!e) throw new ElectionError(404, "Election not found");
    if (e.status !== "pending" || (await client.query("SELECT 1 FROM community_ballots WHERE election_id=$1 LIMIT 1", [id])).rowCount)
      throw new ElectionError(409, "Only an unfinalised election with no ballots may be cancelled");
    await client.query("UPDATE community_elections SET status='cancelled' WHERE id=$1", [id]);
    await audit(client, actor, "community-election-cancelled", id);
    return { cancelled: true };
  });
}
export async function finaliseCommunityElection(pool: Pool, actor: Actor, id: string) {
  admin(actor);
  return transaction(pool, async client => {
    const e = (await client.query("SELECT * FROM community_elections WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!e) throw new ElectionError(404, "Election not found");
    if (e.status === "approved" || e.status === "rejected") {
      const { verifiedTarget } = await import("./community-election-continuity");
      await verifiedTarget(client, id);
      return { id, status: e.status, blockNumber: e.block_number };
    }
    if (e.status !== "pending") throw new ElectionError(409, "Cancelled election cannot be finalised");
    const now: Date = (await client.query("SELECT clock_timestamp() AS now")).rows[0].now;
    if (now < e.closes_at) throw new ElectionError(409, "Voting must close before finalisation");
    const { validateContinuityFinalisation, finishContinuityElection } = await import("./community-election-continuity");
    const continuity = await validateContinuityFinalisation(client, e, now);
    const count = (await client.query(`
      SELECT COUNT(*) FILTER(WHERE choice='yes')::int AS yes,
        COUNT(*) FILTER(WHERE choice='no')::int AS no
      FROM community_ballots WHERE election_id=$1
    `, [id])).rows[0];
    let candidate: Record<string, unknown> | null = null;
    let eligible = true;
    if (e.kind === "reviewer") {
      const n = (await client.query(`
        SELECT n.*, p.revoked_at, u.is_active FROM community_nominations n
        JOIN community_persons p ON p.id=n.person_id JOIN users u ON u.id=p.user_id
        WHERE n.id=$1 FOR UPDATE OF n,p
      `, [e.nomination_id])).rows[0];
      eligible = !!n && !n.withdrawn_at && !n.revoked_at && n.is_active;
      candidate = n ? { nominationId: n.id, publicName: n.public_name,
        role: n.role, statement: n.statement, nominatedPublicKey: n.public_key,
        credentialsAuthenticated: false } : null;
    }
    const passed = eligible && continuity.eligible && meetsCommunityThreshold(count.yes, count.no);
    const status = passed ? "approved" : "rejected";
    // Start at the fixed close, not when an administrator happens to finalise.
    const start = passed && e.kind === "reviewer" ? new Date(e.closes_at) : null;
    const end = start ? reviewerTermEnd(start) : null;
    const content = electionRecordContent({
      electionId: id, kind: e.kind, title: e.title, body: e.body, scope: e.scope,
      opensAt: new Date(e.opens_at).toISOString(), closesAt: new Date(e.closes_at).toISOString(),
      candidate, yes: count.yes, no: count.no, thresholdPercent: 51,
      denominator: "votes-cast", status, candidateEligible: eligible,
      termStartsAt: start?.toISOString() ?? null, termEndsAt: end?.toISOString() ?? null,
      authorityRemovalPermitted: false, commissioned: false,
      continuityTargetEligible: continuity.eligible,
      ...continuity.record,
    });
    const digest = electionRecordDigest(content);
    const blockNumber = await appendElectionRecord(client, content);
    await client.query(`
      UPDATE community_elections SET status=$2,finalised_at=$3,record_digest=$4,
        record_content=$5,block_number=$6,term_starts_at=$7,term_ends_at=$8 WHERE id=$1
    `, [id,status,now,digest,content,blockNumber,start,end]);
    await finishContinuityElection(client, actor, e, passed, continuity.record, now);
    await audit(client, actor, "community-election-finalised", id);
    return { id, status, blockNumber, recordDigest: digest };
  });
}
export async function readCommunityElectionRecord(pool: Pool, id: string) {
  const row = (await pool.query(`
    SELECT e.record_content,e.record_digest,e.block_number,b.content AS chain_content
    FROM community_elections e LEFT JOIN blockchain_blocks b ON b.block_number=e.block_number WHERE e.id=$1
  `, [id])).rows[0];
  if (!row?.record_content) throw new ElectionError(404, "No finalised blockchain record");
  if (row.record_content !== row.chain_content || electionRecordDigest(row.chain_content) !== row.record_digest)
    throw new ElectionError(503, "Blockchain election record integrity check failed");
  return { blockNumber: row.block_number, digest: row.record_digest, content: row.chain_content,
    ledger: "NexusOS project blockchain", verified: true };
}
