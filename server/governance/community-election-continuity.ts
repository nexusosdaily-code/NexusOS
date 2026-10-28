import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { z } from "zod";
import {
  continuityDates, CONTINUITY_DAY_MS, reviewRoles,
  type continuityRequestSchema, type electionSchema,
  type CommunityContinuityEvent, type CommunityContinuityOverview,
  type CommunityContinuityRequest, type CommunitySeat,
} from "../../shared/community-elections";
import {
  ElectionError, admin, audit, person, transaction, type Actor,
} from "./community-election-service";
import { appendElectionRecord, electionRecordContent, electionRecordDigest } from "./community-election-record";
import { requireCommunicationIdentity } from "./communication-identity-gate";

type Queryable = Pick<Pool, "query">;
const iso = (date: Date | string) => new Date(date).toISOString();
const endedTypes = ["relinquished", "recalled", "set-aside", "alternate-promoted"];

function verifiedProjection(e: any): boolean {
  if (!e.record_content || e.record_content !== e.chain_content ||
    electionRecordDigest(e.chain_content) !== e.record_digest) return false;
  try {
    const r = JSON.parse(e.record_content.slice("COMMUNITY_ELECTION[v1]:".length));
    return r.electionId === e.id && r.kind === e.kind && r.scope === e.scope &&
      r.status === e.status && r.title === e.title && r.body === e.body &&
      r.opensAt === iso(e.opens_at) && r.closesAt === iso(e.closes_at) &&
      r.termStartsAt === (e.term_starts_at ? iso(e.term_starts_at) : null) &&
      r.termEndsAt === (e.term_ends_at ? iso(e.term_ends_at) : null) &&
      (e.kind !== "reviewer" || r.candidate?.nominationId === e.nomination_id) &&
      (e.designation === undefined || (r.designation ?? "principal") === e.designation) &&
      (e.predecessor_id === undefined || (r.predecessorId ?? null) === e.predecessor_id);
  } catch { return false; }
}
async function now(client: Queryable): Promise<Date> {
  return (await client.query("SELECT clock_timestamp() AS now")).rows[0].now;
}
export async function verifiedTarget(client: Queryable, id: string) {
  const e = (await client.query(`
    SELECT e.*,b.content AS chain_content FROM community_elections e
    LEFT JOIN blockchain_blocks b ON b.block_number=e.block_number WHERE e.id=$1
  `, [id])).rows[0];
  if (!e?.record_content) throw new ElectionError(409, "A finalised permanent result is required");
  if (!verifiedProjection(e))
    throw new ElectionError(503, "Target election record integrity check failed");
  return e;
}
async function events(client: Queryable): Promise<CommunityContinuityEvent[]> {
  const rows = (await client.query(`
    SELECT e.*,b.content AS chain_content FROM community_continuity_events e
    LEFT JOIN blockchain_blocks b ON b.block_number=e.block_number ORDER BY e.created_at,e.id
  `)).rows;
  return rows.map(e => {
    if (e.content !== e.chain_content || electionRecordDigest(e.chain_content) !== e.digest)
      throw new ElectionError(503, "Continuity event record integrity check failed");
    const record = JSON.parse(e.content.slice("COMMUNITY_ELECTION[v1]:".length));
    if (record.eventId !== e.id || record.eventType !== e.type ||
      record.targetElectionId !== e.target_id || record.relatedId !== e.related_id ||
      record.recordedAt !== iso(e.created_at))
      throw new ElectionError(503, "Continuity event projection integrity check failed");
    return { id: e.id, type: e.type, targetId: e.target_id, relatedId: e.related_id,
      content: e.content, digest: e.digest, blockNumber: e.block_number, createdAt: iso(e.created_at) };
  });
}
async function appendEvent(
  client: PoolClient, actor: Actor, type: string, target: any,
  relatedId: string | null, payload: Record<string, unknown>, at: Date,
) {
  const id = randomUUID();
  const content = electionRecordContent({
    eventId: id, eventType: type, targetElectionId: target.id,
    targetDigest: target.record_digest, relatedId, recordedAt: iso(at),
    commissioned: false, authorityRemovalPermitted: false, constitutionBound: true, ...payload,
  });
  const blockNumber = await appendElectionRecord(client, content);
  const digest = electionRecordDigest(content);
  await client.query(`
    INSERT INTO community_continuity_events(id,type,target_id,related_id,content,digest,block_number,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
  `, [id,type,target.id,relatedId,content,digest,blockNumber,at]);
  await audit(client, actor, `community-${type}`, id);
  return { id, blockNumber, digest };
}

async function mandates(client: Queryable, at: Date, history: CommunityContinuityEvent[]) {
  const rows = (await client.query(`
    SELECT e.*,COALESCE(l.designation,'principal') AS designation,l.predecessor_id,
      n.person_id,(p.revoked_at IS NULL AND u.is_active=true) AS member_eligible,
      b.content AS chain_content
    FROM community_elections e
    JOIN community_nominations n ON n.id=e.nomination_id
    JOIN community_persons p ON p.id=n.person_id JOIN users u ON u.id=p.user_id
    LEFT JOIN community_election_links l ON l.election_id=e.id
    LEFT JOIN blockchain_blocks b ON b.block_number=e.block_number
    WHERE e.kind='reviewer' AND e.status='approved'
    ORDER BY e.block_number,e.id
  `)).rows;
  return rows.map(e => {
    const endEvent = history.find(h => h.targetId === e.id && endedTypes.includes(h.type));
    const valid = verifiedProjection(e);
    const unexpired = at >= e.term_starts_at && at < e.term_ends_at;
    return { ...e, valid, ended: !!endEvent, live: valid && unexpired && !endEvent,
      endReason: endEvent?.type ?? (at >= e.term_ends_at ? "expired" : null) };
  });
}
async function seatState(client: Queryable, at: Date, history: CommunityContinuityEvent[]) {
  const all = await mandates(client, at, history);
  const seats: CommunitySeat[] = reviewRoles.flatMap(role =>
    (["principal", "alternate"] as const).map(designation => {
      const candidates = all.filter(e => e.scope === role && e.designation === designation);
      const live = candidates.filter(e => e.live);
      const invalid = candidates.some(e => !e.valid && at < e.term_ends_at && !e.ended);
      const repeatedPerson = live.some(e => all.filter(m => m.live && m.person_id === e.person_id).length > 1);
      const previous = candidates.at(-1);
      return { role, designation, state: invalid || live.length > 1 || repeatedPerson ? "unresolved" :
        live.length ? (live[0].member_eligible ? "occupied" : "unavailable") : "vacant",
        mandateIds: live.map(e => e.id), predecessorId: previous?.id ?? null,
        vacancyReason: live.length ? null : previous?.endReason ?? "never-filled" };
    }));
  return { all, seats };
}
export async function electionSeatDetails(client: Queryable) {
  const at = await now(client), history = await events(client);
  const { all, seats } = await seatState(client, at, history);
  const links = (await client.query("SELECT * FROM community_election_links")).rows;
  const result = new Map<string, Record<string, unknown>>();
  for (const event of history.filter(h => h.type === "set-aside"))
    result.set(event.targetId, {outcomeSetAside:true});
  for (const l of links) result.set(l.election_id, {
    ...result.get(l.election_id),
    designation: l.designation ?? undefined, predecessorId: l.predecessor_id, targetId: l.target_id,
  });
  for (const e of all) result.set(e.id, {
    ...result.get(e.id), designation: e.designation, predecessorId: e.predecessor_id ?? null,
    termActive: e.live && e.member_eligible &&
      seats.find(s => s.role === e.scope && s.designation === e.designation)?.state === "occupied",
    mandateState: e.endReason ?? (!e.valid ? "unresolved" : !e.member_eligible ? "unavailable" :
      seats.find(s => s.role === e.scope && s.designation === e.designation)?.state ?? "unresolved"),
  });
  return result;
}
async function requestList(client: Queryable, at: Date, history: CommunityContinuityEvent[]) {
  const rows = (await client.query(`
    SELECT r.*, l.election_id, e.status AS election_status
    FROM community_continuity_requests r LEFT JOIN LATERAL (
      SELECT * FROM community_election_links l WHERE l.request_id=r.id
      ORDER BY (SELECT created_at FROM community_elections WHERE id=l.election_id) DESC,election_id DESC LIMIT 1
    ) l ON true LEFT JOIN community_elections e ON e.id=l.election_id ORDER BY r.created_at,r.id
  `)).rows;
  return rows.map(r => ({
    id: r.id, kind: r.kind, targetId: r.target_id, targetDigest: r.target_digest,
    filingEndsAt: r.filing_ends_at ? iso(r.filing_ends_at) : null, createdAt: iso(r.created_at),
    status: r.election_status === "approved" || r.election_status === "rejected" ? "resolved" :
      r.election_status === "pending" ? "scheduled" :
      r.filing_ends_at && at < r.filing_ends_at ? "filing" : "awaiting-scheduling",
    electionId: r.election_id ?? null,
    grounds: history.filter(e => e.relatedId === r.id && e.type === "request-grounds"),
  })) as CommunityContinuityRequest[];
}
export async function communityContinuityOverview(pool: Pool): Promise<CommunityContinuityOverview> {
  return transaction(pool, async client => {
    const at = await now(client), history = await events(client);
    const { seats } = await seatState(client, at, history);
    return { requests: await requestList(client, at, history), events: history,
      seats, commissioning: "not-commissioned" };
  });
}
export async function preventIndependentPolicy(client: Queryable, actor: Actor) {
  const history = await events(client);
  const at = await now(client);
  const { all } = await seatState(client, at, history);
  const p = (await client.query("SELECT id FROM community_persons WHERE user_id=$1", [actor.id])).rows[0];
  if (p && all.some(e => !e.ended && at >= e.term_starts_at && at < e.term_ends_at && e.person_id === p.id))
    throw new ElectionError(403, "Elected people cannot independently recommend policy or their commission");
}
export async function prepareFreshNomination(client: PoolClient, personId: string, role: string, publicKey: string) {
  const keyOwner = (await client.query(
    "SELECT person_id FROM community_nominations WHERE public_key=$1 AND person_id<>$2",
    [publicKey,personId],
  )).rows[0];
  if (keyOwner) throw new ElectionError(409, "A credential already belongs to another person");
  const prior = (await client.query(`
    SELECT n.id FROM community_nominations n WHERE n.person_id=$1 AND n.role=$2 AND n.withdrawn_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM community_nomination_successions s WHERE s.predecessor_id=n.id)
    ORDER BY n.created_at DESC,n.id DESC LIMIT 1
  `, [personId,role])).rows[0];
  if (!prior) return null;
  const uses = (await client.query("SELECT * FROM community_elections WHERE nomination_id=$1", [prior.id])).rows;
  if (!uses.length || uses.some(e => e.status === "pending"))
    throw new ElectionError(409, "An unused or pending nomination already exists for this role");
  const at = await now(client), history = await events(client);
  const { all } = await seatState(client, at, history);
  // Fresh principal nomination may follow an elected alternate; it does not end
  // the alternate until the new principal result is permanently recorded.
  if (all.some(e => e.live && e.person_id === personId && e.scope === role && e.designation === "principal"))
    throw new ElectionError(409, "Wait for the principal mandate to end before re-nomination");
  return prior.id as string;
}

export async function prepareSeatElection(
  client: PoolClient, input: Extract<z.infer<typeof electionSchema>, { kind: "reviewer" }>, at: Date,
) {
  let dates;
  try { dates = continuityDates(at, new Date(input.opensAt)); }
  catch (error) { throw new ElectionError(400, (error as Error).message); }
  if (dates.closesAt.getTime() !== new Date(input.closesAt).getTime())
    throw new ElectionError(400, "A seat election requires exactly fourteen complete days of voting");
  const n = (await client.query("SELECT * FROM community_nominations WHERE id=$1", [input.nominationId])).rows[0];
  const history = await events(client);
  const { all, seats } = await seatState(client, at, history);
  const designation = input.designation ?? "principal";
  const seat = seats.find(s => s.role === n.role && s.designation === designation)!;
  if (seat.state !== "vacant")
    throw new ElectionError(409, "Seat is occupied, unavailable or unresolved; no overlapping successor");
  if ((seat.predecessorId ?? null) !== (input.predecessorId ?? null))
    throw new ElectionError(409, "Identify the exact predecessor mandate for this vacancy");
  if (input.predecessorId) await verifiedTarget(client, input.predecessorId);
  const held = all.filter(e => e.live && e.person_id === n.person_id);
  if (held.some(e => e.scope !== n.role || designation !== "principal" || e.designation !== "alternate"))
    throw new ElectionError(409, "A person cannot hold multiple electoral roles or both seats");
  const pending = await client.query(`
    SELECT e.id,n.person_id FROM community_elections e JOIN community_nominations n ON n.id=e.nomination_id
    LEFT JOIN community_election_links l ON l.election_id=e.id
    WHERE e.status='pending' AND e.kind='reviewer'
      AND ((e.scope=$1 AND COALESCE(l.designation,'principal')=$2) OR n.person_id=$3)
  `, [n.role,designation,n.person_id]);
  if (pending.rowCount) throw new ElectionError(409, "A seat or this person already has a pending seat election");
  if ((await client.query("SELECT id FROM community_elections WHERE nomination_id=$1", [input.nominationId])).rowCount)
    throw new ElectionError(409, "A new seat election requires a fresh consenting nomination");
}

export async function fileContinuityRequest(
  pool: Pool, actor: Actor, input: z.infer<typeof continuityRequestSchema>,
) {
  return transaction(pool, async client => {
    const p = await person(client, actor), at = await now(client);
    const target = await verifiedTarget(client, input.targetId);
    const history = await events(client);
    if (input.kind === "notice") {
      if (!["appeal", "recall"].includes(target.kind))
        throw new ElectionError(400, "Notices are for appeal or recall resolution administration");
      return appendEvent(client, actor, "administration-notice", target, null, { grounds: input.grounds }, at);
    }
    let request: any;
    if (input.kind === "appeal") {
      if (!["reviewer", "policy"].includes(target.kind))
        throw new ElectionError(409, "Resolution elections cannot enter another appeal loop");
      const filingEnds = new Date(new Date(target.finalised_at).getTime() + 14 * CONTINUITY_DAY_MS);
      if (at >= filingEnds) throw new ElectionError(409, "The fourteen-day appeal filing window has closed");
      request = (await client.query(
        "SELECT * FROM community_continuity_requests WHERE target_id=$1 AND kind='appeal'", [target.id],
      )).rows[0];
      if (!request) request = (await client.query(`
        INSERT INTO community_continuity_requests(kind,target_id,target_digest,filing_ends_at)
        VALUES('appeal',$1,$2,$3) RETURNING *
      `, [target.id,target.record_digest,filingEnds])).rows[0];
    } else {
      const { all, seats } = await seatState(client, at, history);
      const mandate = all.find(e => e.id === target.id && e.live);
      if (!mandate) throw new ElectionError(409, "An unexpired, unended reviewer mandate is required");
      if (input.kind === "commission") {
        await preventIndependentPolicy(client, actor);
        if (seats.find(s => s.role === mandate.scope && s.designation === mandate.designation)?.state !== "occupied")
          throw new ElectionError(409, "An eligible resolved electoral seat is required for a commission vote");
      }
      const requests = await requestList(client, at, history);
      if (requests.some(r => r.kind === input.kind && r.targetId === target.id && r.status !== "resolved"))
        throw new ElectionError(409, "There is already a pending request for this mandate");
      if (input.kind === "recall") {
        const last = (await client.query(`
          SELECT e.closes_at FROM community_elections e JOIN community_election_links l ON l.election_id=e.id
          WHERE e.kind='recall' AND e.status='rejected' AND l.target_id=$1 ORDER BY e.closes_at DESC LIMIT 1
        `, [target.id])).rows[0];
        if (last && at.getTime() < new Date(last.closes_at).getTime() + 90 * CONTINUITY_DAY_MS)
          throw new ElectionError(409, "Wait ninety complete days after a rejected recall");
      }
      request = (await client.query(`
        INSERT INTO community_continuity_requests(kind,target_id,target_digest) VALUES($1,$2,$3) RETURNING *
      `, [input.kind,target.id,target.record_digest])).rows[0];
    }
    await client.query("INSERT INTO community_continuity_submitters(request_id,person_id) VALUES($1,$2)",
      [request.id,p.id]);
    await appendEvent(client, actor, "request-grounds", target, request.id, {
      requestKind: input.kind, grounds: input.grounds, groundType: input.groundType ?? null,
      filingEndsAt: request.filing_ends_at ? iso(request.filing_ends_at) : null,
    }, at);
    return { id: request.id };
  });
}
export async function scheduleContinuityRequest(pool: Pool, actor: Actor, id: string, opensAt: string) {
  admin(actor);
  return transaction(pool, async client => {
    const at = await now(client), history = await events(client);
    const request = (await requestList(client, at, history)).find(r => r.id === id);
    if (!request) throw new ElectionError(404, "Continuity request not found");
    if (request.status !== "awaiting-scheduling")
      throw new ElectionError(409, "Request must finish filing and cannot already have a live resolution");
    const target = await verifiedTarget(client, request.targetId);
    if (target.record_digest !== request.targetDigest) throw new ElectionError(503, "Request target digest mismatch");
    const requests = await requestList(client, at, history);
    if (request.kind === "recall" && requests.some(r =>
      r.kind === "appeal" && r.targetId === target.id && r.status !== "resolved"))
      throw new ElectionError(409, "Resolve the pending appeal before scheduling recall");
    if (request.kind !== "appeal") {
      const { all, seats } = await seatState(client, at, history);
      const mandate = all.find(e => e.id === target.id && e.live);
      if (!mandate) throw new ElectionError(409, "Target mandate has ended");
      if (request.kind === "commission" &&
        seats.find(s => s.role === mandate.scope && s.designation === mandate.designation)?.state !== "occupied")
        throw new ElectionError(409, "Commission target is unavailable or unresolved");
    }
    let dates;
    try { dates = continuityDates(at, new Date(opensAt)); }
    catch (error) { throw new ElectionError(400, (error as Error).message); }
    const decision = request.kind === "appeal" ?
      "Set aside this election's electoral outcome prospectively and require a fresh election on the same role or policy subject." :
      request.kind === "recall" ? "End this named electoral mandate." :
      "Approve only these exact community instructions and assistance limits for this elected person, within the constitution and original mandate expiry. No independent recommendations or changes.";
    const body = `${decision}\nTarget: ${target.id}\nResult digest: ${request.targetDigest}\n` +
      request.grounds.map(g => {
        const value = JSON.parse(g.content.slice("COMMUNITY_ELECTION[v1]:".length));
        return `[${value.groundType ?? request.kind}] ${value.grounds}`;
      }).join("\n\n");
    const result = (await client.query(`
      INSERT INTO community_elections(kind,scope,title,body,opens_at,closes_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [request.kind,target.scope,`${request.kind}: ${target.title}`,body,
      dates.opensAt,dates.closesAt,actor.id])).rows[0];
    await client.query(
      "INSERT INTO community_election_links(election_id,target_id,request_id) VALUES($1,$2,$3)",
      [result.id,target.id,id]);
    await appendEvent(client, actor, "request-scheduled", target, id, {
      resolutionElectionId: result.id, decisionText: body,
      opensAt: iso(dates.opensAt), closesAt: iso(dates.closesAt),
    }, at);
    return { id: result.id };
  });
}

export async function relinquishCommunityMandate(pool: Pool, actor: Actor, id: string) {
  return transaction(pool, async client => {
    // An inactive/revoked holder may still relinquish through their authenticated account.
    const at = await now(client), target = await verifiedTarget(client, id), history = await events(client);
    const { all } = await seatState(client, at, history);
    const mandate = all.find(e => e.id === id && e.live);
    const p = (await client.query("SELECT id FROM community_persons WHERE user_id=$1", [actor.id])).rows[0];
    if (!mandate || !p || mandate.person_id !== p.id)
      throw new ElectionError(403, "Only the authenticated holder may relinquish their unexpired mandate");
    return appendEvent(client, actor, "relinquished", target, null, {
      effectiveAt: iso(at), originalTermEndsAt: iso(target.term_ends_at), irreversible: true,
    }, at);
  });
}

export async function validateContinuityFinalisation(client: PoolClient, e: any, at: Date) {
  const link = (await client.query("SELECT * FROM community_election_links WHERE election_id=$1", [e.id])).rows[0];
  const history = await events(client);
  const { all, seats } = await seatState(client, at, history);
  const record: Record<string, unknown> = {
    designation: link?.designation ?? (e.kind === "reviewer" ? "principal" : null),
    predecessorId: link?.predecessor_id ?? null, targetId: link?.target_id ?? null,
    requestId: link?.request_id ?? null, constitutionBound: true,
    independentRecommendationsPermitted: false, independentChangesPermitted: false,
  };
  let eligible = true;
  if (e.kind === "reviewer") {
    const n = (await client.query("SELECT person_id FROM community_nominations WHERE id=$1", [e.nomination_id])).rows[0];
    const seat = seats.find(s => s.role === e.scope && s.designation === record.designation)!;
    eligible = seat.state === "vacant" &&
      (seat.predecessorId ?? null) === (link?.predecessor_id ?? null);
    const held = all.filter(m => m.live && m.person_id === n?.person_id);
    if (held.some(m => m.scope !== e.scope || m.designation !== "alternate" || record.designation !== "principal"))
      eligible = false;
    record.vacancyReason = seat.vacancyReason;
    record.promotedAlternateId = eligible ? held[0]?.id ?? null : null;
    if (link?.predecessor_id) await verifiedTarget(client, link.predecessor_id);
  } else if (["appeal", "recall", "commission"].includes(e.kind)) {
    if (!link?.target_id || !link.request_id) throw new ElectionError(503, "Resolution link is missing");
    const target = await verifiedTarget(client, link.target_id);
    const r = (await client.query("SELECT * FROM community_continuity_requests WHERE id=$1", [link.request_id])).rows[0];
    if (!r || r.target_id !== target.id || r.target_digest !== target.record_digest || r.kind !== e.kind)
      throw new ElectionError(503, "Resolution request does not match its target");
    record.targetDigest = target.record_digest;
    if (e.kind !== "appeal") {
      const mandate = all.find(m => m.id === target.id && m.live);
      eligible = !!mandate;
      if (e.kind === "commission") {
        eligible = eligible && seats.find(s =>
          s.role === mandate?.scope && s.designation === mandate?.designation)?.state === "occupied";
        record.commissionEndsAt = iso(target.term_ends_at);
        record.exactInstructions = e.body;
        record.executionAutomaticallyPermitted = false;
      }
    }
  }
  return { eligible, record };
}
export async function finishContinuityElection(
  client: PoolClient, actor: Actor, e: any, passed: boolean,
  record: Record<string, unknown>, at: Date,
) {
  if (e.kind === "reviewer") {
    const target = await verifiedTarget(client, e.id);
    await appendEvent(client, actor, passed ? "seat-elected" : "seat-election-rejected", target,
      record.predecessorId as string | null, {
        designation: record.designation, role: e.scope, predecessorId: record.predecessorId,
        vacancyReason: record.vacancyReason, termStartsAt: target.term_starts_at ? iso(target.term_starts_at) : null,
        termEndsAt: target.term_ends_at ? iso(target.term_ends_at) : null,
      }, at);
    if (passed && record.promotedAlternateId) {
      const alternate = await verifiedTarget(client, record.promotedAlternateId as string);
      await appendEvent(client, actor, "alternate-promoted", alternate, e.id, {
        effectiveAt: iso(e.closes_at), successorId: e.id,
      }, at);
    }
  } else if (["appeal", "recall", "commission"].includes(e.kind)) {
    const target = await verifiedTarget(client, record.targetId as string);
    const type = !passed ? `${e.kind}-rejected` :
      e.kind === "appeal" ? "set-aside" : e.kind === "recall" ? "recalled" : "commission-instructions-approved";
    await appendEvent(client, actor, type, target, e.id, {
      requestId: record.requestId, resolutionDigest: (await verifiedTarget(client, e.id)).record_digest,
      effectiveAt: iso(e.closes_at), originalTermEndsAt: target.term_ends_at ? iso(target.term_ends_at) : null,
      exactInstructions: e.kind === "commission" ? e.body : null,
      instructionsExpireAt: e.kind === "commission" ? iso(target.term_ends_at) : null,
      supersedesPriorCommissionInstructions: e.kind === "commission" && passed,
      retrospectiveUndoPermitted: false, automaticExecutionPermitted: false,
    }, at);
  }
}
export async function readContinuityEvent(pool: Pool, id: string) {
  const history = await events(pool);
  const event = history.find(e => e.id === id);
  if (!event) throw new ElectionError(404, "Continuity record not found");
  return { ...event, verified: true, ledger: "NexusOS project blockchain" };
}

/** Action-time guard shared by commission delivery, broadcast and broadcast acknowledgement.
 * Must run inside transaction(), which serialises membership, recall, appeal and seat changes.
 * No election grants policy, protected authority, role representation or payment.
 */
export async function authorisedCommunicationCommission(client: PoolClient, actor: Actor, id: string) {
  const member = await person(client, actor);
  const at = await now(client), history = await events(client);
  const e = await verifiedTarget(client, id);
  if (e.kind !== "commission" || e.status !== "approved")
    throw new ElectionError(403, "Community-approved instructions are required");
  const record = JSON.parse(e.record_content.slice("COMMUNITY_ELECTION[v1]:".length));
  const link = (await client.query("SELECT * FROM community_election_links WHERE election_id=$1", [id])).rows[0];
  if (!link?.target_id || record.targetId !== link.target_id || record.requestId !== link.request_id)
    throw new ElectionError(503, "Commission link does not match its immutable instruction record");
  const target = await verifiedTarget(client, link.target_id);
  const request = (await client.query("SELECT * FROM community_continuity_requests WHERE id=$1", [link.request_id])).rows[0];
  if (!request || request.kind !== "commission" || request.target_id !== target.id ||
    request.target_digest !== target.record_digest || record.targetDigest !== target.record_digest ||
    record.exactInstructions !== e.body || record.commissionEndsAt !== iso(target.term_ends_at) ||
    record.executionAutomaticallyPermitted !== false)
    throw new ElectionError(503, "Commission instructions or mandate integrity check failed");
  const { all, seats } = await seatState(client, at, history);
  const mandate = all.find(m => m.id === target.id && m.live && m.member_eligible);
  if (!mandate || mandate.person_id !== member.id || seats.find(s =>
    s.role === mandate.scope && s.designation === mandate.designation)?.state !== "occupied")
    throw new ElectionError(403, "Only the eligible holder of a live, resolved mandate may act");
  await requireCommunicationIdentity({ client, actor, personId: member.id, role: mandate.scope, at });
  const latest = history.filter(h => h.targetId === target.id &&
    h.type === "commission-instructions-approved").at(-1);
  if (latest?.relatedId !== id)
    throw new ElectionError(409, "Instructions have been superseded or not accepted into permanent history");
  const accepted = JSON.parse(latest.content.slice("COMMUNITY_ELECTION[v1]:".length));
  if (accepted.resolutionDigest !== e.record_digest || accepted.exactInstructions !== e.body ||
    accepted.instructionsExpireAt !== iso(target.term_ends_at) || at >= target.term_ends_at)
    throw new ElectionError(409, "Instructions are invalid or expired");
  const pending = (await requestList(client, at, history)).some(r =>
    ["appeal", "recall"].includes(r.kind) && [target.id, id].includes(r.targetId) && r.status !== "resolved");
  if (pending || history.some(h => h.targetId === id && h.type === "set-aside"))
    throw new ElectionError(409, "Communications are paused while recall or appeal is unresolved");
  return { election: e, mandate, expiresAt: iso(target.term_ends_at) };
}
