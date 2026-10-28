import { beforeAll, afterAll, describe, it, expect } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  verifyCommunityPerson, nominateCommunityReviewer, createCommunityElection,
  castCommunityBallot, finaliseCommunityElection, communityOverview,
  cancelCommunityElection, readCommunityElectionRecord, revokeCommunityPerson,
} from "./community-election-service";
import {
  communityContinuityOverview, fileContinuityRequest, scheduleContinuityRequest,
  relinquishCommunityMandate, readContinuityEvent,
} from "./community-election-continuity";
import { CONTINUITY_DAY_MS as DAY } from "../../shared/community-elections";

// Isolated temporary schema; no real voters, ballots or chain entries.
const schema = `continuity_test_${randomUUID().replaceAll("-", "")}`;
const root = new pg.Pool({connectionString:process.env.DATABASE_URL});
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
const admin = {id:randomUUID(),role:"admin"};
const voters = Array.from({length:8},() => ({id:randomUUID(),role:"user"}));
const common = {confirmPublicNonSensitive:true as const,confirmConstitutionBound:true as const};
beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for isolated continuity tests");
  await root.query(`CREATE SCHEMA ${schema}`);
  await pool.query(`CREATE TABLE users(id varchar(36) PRIMARY KEY,is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE blockchain_blocks (LIKE public.blockchain_blocks INCLUDING ALL);`);
  for (const a of [admin,...voters]) await pool.query("INSERT INTO users(id) VALUES($1)",[a.id]);
  await pool.query(await readFile("migrations/community-elections.sql","utf8"));
  await pool.query(await readFile("migrations/community-election-continuity.sql","utf8"));
  await pool.query(`INSERT INTO blockchain_blocks
    (block_number,content,wavelength_nm,psi_channel,wdm,oam,polarisation,band,energy_joules,lambda_mass_kg,frequency_hz)
    VALUES(0,'isolated genesis',550,'Ψ(108,0,H)',108,0,'H','USER',0,0,1)`);
  for (let i=0;i<voters.length;i++) await verifyCommunityPerson(pool,admin,{
    userId:voters[i].id,personReference:`unique-opaque-continuity-${i}`,evidenceReference:"private-identity-evidence",
    confirmUniqueHuman:true,confirmNoOrganisation:true,
  });
},30000);
afterAll(async () => {
  await pool.end();
  await root.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await root.end();
});
async function nomination(index: number, role: "constitutional-legal" | "technical-security" | "human-life-safety") {
  return (await nominateCommunityReviewer(pool,voters[index],{
    publicName:`Reviewer ${index}`,role,statement:"I consent to serving only the community's exact instructions.",
    publicKey:(randomUUID()+randomUUID()).replaceAll("-",""),consent:true,
  })).id;
}
async function seat(nominationId: string, designation: "principal" | "alternate" = "principal", predecessorId?: string) {
  const opens = new Date(Date.now()+8*DAY);
  return (await createCommunityElection(pool,admin,{
    kind:"reviewer",nominationId,designation,predecessorId,
    title:"Community reviewer electoral seat",body:"Elect this consenting person within constitutional boundaries.",
    opensAt:opens.toISOString(),closesAt:new Date(opens.getTime()+14*DAY).toISOString(),
    confirmAuthorityPreserved:true,
  })).id;
}
async function finish(id: string, approve = true) {
  // Test-only clock fixtures: production has no election-edit endpoint.
  await pool.query("UPDATE community_elections SET opens_at=now()-interval '2 days',closes_at=now()+interval '1 day' WHERE id=$1",[id]);
  await castCommunityBallot(pool,voters[7],id,approve ? "yes" : "no");
  await pool.query("UPDATE community_elections SET closes_at=now()-interval '1 day' WHERE id=$1",[id]);
  return finaliseCommunityElection(pool,admin,id);
}
async function file(kind: "appeal" | "recall" | "commission", targetId: string, voter = 6) {
  return fileContinuityRequest(pool,voters[voter],{
    kind,targetId,grounds:"Public procedural grounds or exact instructions and assistance limits.",
    ...(kind==="appeal" ? {groundType:"procedure" as const} : {}),...common,
  });
}
async function schedule(id: string) {
  return (await scheduleContinuityRequest(pool,admin,id,new Date(Date.now()+8*DAY).toISOString())).id;
}
async function advanceAppealWindow(id: string) {
  await pool.query("UPDATE community_elections SET finalised_at=now()-interval '15 days' WHERE id=$1",[id]);
  // Test-only bypass for an immutable request clock, never a live API.
  await pool.query("ALTER TABLE community_continuity_requests DISABLE TRIGGER community_immutable_requests");
  try {
    await pool.query("UPDATE community_continuity_requests SET filing_ends_at=now()-interval '1 day' WHERE target_id=$1",[id]);
  } finally { await pool.query("ALTER TABLE community_continuity_requests ENABLE TRIGGER community_immutable_requests"); }
}
let legal: string, technical: string, safety: string;
describe.sequential("community-controlled continuity", () => {
  it("enforces 7-day notice, exact 14-day vote, seat uniqueness and person-role independence",async () => {
    const n = await nomination(0,"constitutional-legal");
    const opens = new Date(Date.now()+DAY);
    await expect(createCommunityElection(pool,admin,{
      kind:"reviewer",nominationId:n,designation:"principal",title:"Elect a legal reviewer",
      body:"This proposal must obey the constitution.",opensAt:opens.toISOString(),
      closesAt:new Date(opens.getTime()+14*DAY).toISOString(),confirmAuthorityPreserved:true,
    })).rejects.toThrow("seven complete days");
    legal = await seat(n);
    await expect(seat(n)).rejects.toThrow("pending");
    expect((await finish(legal)).status).toBe("approved");
    await expect(seat(n)).rejects.toThrow("overlapping successor");
    const crossRole = await nomination(0,"technical-security");
    await expect(seat(crossRole)).rejects.toThrow("multiple electoral roles");
    technical = await seat(await nomination(1,"technical-security"));
    safety = await seat(await nomination(2,"human-life-safety"));
    await finish(technical); await finish(safety);
    expect((await communityContinuityOverview(pool)).seats.filter(s => s.state==="occupied")).toHaveLength(3);
  });
  it("community approves exact commissions; elected people cannot independently originate one",async () => {
    await expect(file("commission",legal,0)).rejects.toThrow("independently");
    const request = await file("commission",legal);
    await expect(scheduleContinuityRequest(pool,voters[6],request.id,new Date(Date.now()+8*DAY).toISOString()))
      .rejects.toThrow("Administrator required");
    const election = await schedule(request.id);
    await finish(election);
    const history = await communityContinuityOverview(pool);
    const event = history.events.find(e => e.type==="commission-instructions-approved")!;
    const record = JSON.parse(event.content.slice("COMMUNITY_ELECTION[v1]:".length));
    expect(record.exactInstructions).toContain("No independent recommendations or changes");
    expect(record.automaticExecutionPermitted).toBe(false);
    expect(record.commissioned).toBe(false);
    const target = (await communityOverview(pool)).elections.find(e => e.id===legal)!;
    expect(record.instructionsExpireAt).toBe(target.termEndsAt);
    expect((await readContinuityEvent(pool,event.id)).verified).toBe(true);
    expect(history.requests.find(r => r.id===request.id)?.status).toBe("resolved");
  });
  it("consolidates immutable appeal grounds, preserves ballots and sets aside only through community vote",async () => {
    const original = await readCommunityElectionRecord(pool,technical);
    const request = await file("appeal",technical);
    await expect(file("appeal",technical)).rejects.toMatchObject({code:"23505"});
    expect((await file("appeal",technical,5)).id).toBe(request.id);
    await expect(schedule(request.id)).rejects.toThrow("finish filing");
    await advanceAppealWindow(technical);
    await expect(file("appeal",technical,4)).rejects.toThrow("window has closed");
    const resolution = await schedule(request.id);
    const originalCount = (await pool.query("SELECT COUNT(*)::int AS count FROM community_ballots WHERE election_id=$1",[technical])).rows[0].count;
    expect((await communityOverview(pool)).elections.find(e => e.id===technical)?.termActive).toBe(true);
    await finish(resolution);
    expect((await communityOverview(pool)).elections.find(e => e.id===technical)?.termActive).toBe(false);
    expect(await readCommunityElectionRecord(pool,technical)).toEqual(original);
    expect((await pool.query("SELECT COUNT(*)::int AS count FROM community_ballots WHERE election_id=$1",[technical])).rows[0].count).toBe(originalCount);
    await expect(file("appeal",resolution)).rejects.toThrow("another appeal loop");
    await fileContinuityRequest(pool,voters[5],{
      kind:"notice",targetId:resolution,grounds:"A public notice about resolution administration only.",...common,
    });
    const n = await nomination(3,"technical-security");
    await expect(seat(n)).rejects.toThrow("exact predecessor");
    const replacement = await seat(n,"principal",technical);
    await finish(replacement);
    const next = (await communityOverview(pool)).elections.find(e => e.id===replacement)!;
    expect(next.termActive).toBe(true);
    expect(next.predecessorId).toBe(technical);
    expect(new Date(next.termEndsAt!).getUTCFullYear()-new Date(next.termStartsAt!).getUTCFullYear()).toBe(3);
    const history = await communityContinuityOverview(pool);
    expect(history.events.find(e => e.targetId===replacement && e.type==="seat-elected")?.content).toContain("set-aside");
  });
  it("requires recall votes, serialises duplicate requests and enforces rejected-recall cooldown",async () => {
    const attempts = await Promise.allSettled([file("recall",safety),file("recall",safety,5)]);
    expect(attempts.filter(a => a.status==="fulfilled")).toHaveLength(1);
    const request = (attempts.find(a => a.status==="fulfilled") as PromiseFulfilledResult<{id:string}>).value;
    const recall = await schedule(request.id);
    await finish(recall,false);
    expect((await communityOverview(pool)).elections.find(e => e.id===safety)?.termActive).toBe(true);
    await expect(file("recall",safety,5)).rejects.toThrow("ninety complete days");
    // Fixture advances the cooldown only, preserving the stored result's dates afterwards.
    const old = (await pool.query("SELECT closes_at FROM community_elections WHERE id=$1",[recall])).rows[0].closes_at;
    await pool.query("UPDATE community_elections SET opens_at=now()-interval '100 days',closes_at=now()-interval '91 days' WHERE id=$1",[recall]);
    const second = await file("recall",safety,5);
    await pool.query("UPDATE community_elections SET closes_at=$2 WHERE id=$1",[recall,old]);
    await finish(await schedule(second.id));
    expect((await communityContinuityOverview(pool)).seats.find(s => s.role==="human-life-safety" && s.designation==="principal")?.state).toBe("vacant");
    await expect(file("recall",safety,4)).rejects.toThrow("unexpired");
  });
  it("elected alternates need a fresh principal election and cannot automatically inherit a vacancy",async () => {
    const n = await nomination(4,"human-life-safety");
    const alternate = await seat(n,"alternate");
    await finish(alternate);
    const before = await communityContinuityOverview(pool);
    expect(before.seats.find(s => s.role==="human-life-safety" && s.designation==="principal")?.state).toBe("vacant");
    await expect(seat(n,"principal",safety)).rejects.toThrow("fresh consenting nomination");
    const replacement = await seat(await nomination(4,"human-life-safety"),"principal",safety);
    await finish(replacement);
    const after = await communityOverview(pool);
    expect(after.elections.find(e => e.id===alternate)?.termActive).toBe(false);
    expect(after.elections.find(e => e.id===replacement)?.termActive).toBe(true);
    expect((await communityContinuityOverview(pool)).events.some(e =>
      e.type==="alternate-promoted" && e.targetId===alternate && e.relatedId===replacement)).toBe(true);
  });
  it("permits only the authenticated holder to relinquish, even after membership revocation",async () => {
    await expect(relinquishCommunityMandate(pool,admin,legal)).rejects.toThrow("Only the authenticated holder");
    const p = (await pool.query("SELECT id FROM community_persons WHERE user_id=$1",[voters[0].id])).rows[0];
    await revokeCommunityPerson(pool,admin,p.id);
    expect((await communityContinuityOverview(pool)).seats.find(s => s.role==="constitutional-legal" && s.designation==="principal")?.state).toBe("unavailable");
    await relinquishCommunityMandate(pool,voters[0],legal);
    await expect(relinquishCommunityMandate(pool,voters[0],legal)).rejects.toThrow("unexpired mandate");
    expect((await communityContinuityOverview(pool)).seats.find(s => s.role==="constitutional-legal" && s.designation==="principal")?.vacancyReason).toBe("relinquished");
  });
  it("keeps cancellation history and permits rescheduling with fresh notice, not administrator appeal decisions",async () => {
    const request = await file("appeal",safety);
    await advanceAppealWindow(safety);
    const cancelled = await schedule(request.id);
    await cancelCommunityElection(pool,admin,cancelled);
    expect((await communityContinuityOverview(pool)).requests.find(r => r.id===request.id)?.status).toBe("awaiting-scheduling");
    const next = await schedule(request.id);
    expect(next).not.toBe(cancelled);
    await finish(next,false);
  });
  it("rolls back request and audit on chain failure; rejects database mutation of accepted history",async () => {
    const requestCount = (await pool.query("SELECT COUNT(*)::int AS n FROM community_continuity_requests")).rows[0].n;
    await pool.query("ALTER TABLE blockchain_blocks ADD CONSTRAINT fail_continuity CHECK(content NOT LIKE '%request-grounds%') NOT VALID");
    await expect(file("commission",(await communityOverview(pool)).elections.find(e => e.kind==="reviewer" && e.scope==="technical-security" && e.termActive)!.id,5)).rejects.toThrow();
    expect((await pool.query("SELECT COUNT(*)::int AS n FROM community_continuity_requests")).rows[0].n).toBe(requestCount);
    await pool.query("ALTER TABLE blockchain_blocks DROP CONSTRAINT fail_continuity");
    await expect(pool.query("UPDATE community_ballots SET choice='no'")).rejects.toThrow("immutable");
    await expect(pool.query("DELETE FROM community_continuity_events")).rejects.toThrow("immutable");
    const history = await communityContinuityOverview(pool);
    const publicJson = JSON.stringify(history);
    for (const value of [voters[0].id,"unique-opaque-continuity","private-identity-evidence"])
      expect(publicJson).not.toContain(value);
  });
  it("keeps late-finalised terms expired and permits a fresh nomination for re-election",async () => {
    const n = await nomination(5,"constitutional-legal");
    const expired = await seat(n,"principal",legal);
    await pool.query("UPDATE community_elections SET opens_at=now()-interval '2 days',closes_at=now()+interval '1 day' WHERE id=$1",[expired]);
    await castCommunityBallot(pool,voters[7],expired,"yes");
    await pool.query(`UPDATE community_elections SET opens_at=now()-interval '4 years 2 days',
      closes_at=now()-interval '4 years' WHERE id=$1`,[expired]);
    expect((await finaliseCommunityElection(pool,admin,expired)).status).toBe("approved");
    const old = (await communityOverview(pool)).elections.find(e => e.id===expired)!;
    expect(old.termActive).toBe(false);
    expect(new Date(old.termEndsAt!).getTime()).toBeLessThan(Date.now());
    expect((await communityContinuityOverview(pool)).seats.find(s =>
      s.role==="constitutional-legal" && s.designation==="principal")?.vacancyReason).toBe("expired");
    const fresh = await nomination(5,"constitutional-legal");
    expect(fresh).not.toBe(n);
    await expect(seat(n,"principal",expired)).rejects.toThrow("Eligible consenting nomination");
    const next = await seat(fresh,"principal",expired);
    await finish(next);
    expect((await communityOverview(pool)).elections.find(e => e.id===next)?.termActive).toBe(true);
    expect((await communityOverview(pool)).elections.find(e => e.id===expired)?.termEndsAt).toBe(old.termEndsAt);
  });
  it("never grants a seat through altered term projections or tampered chain events",async () => {
    const mandate = (await communityOverview(pool)).elections.find(e => e.scope==="technical-security" && e.termActive)!;
    await pool.query("UPDATE community_elections SET term_ends_at=term_ends_at+interval '1 year' WHERE id=$1",[mandate.id]);
    expect((await communityOverview(pool)).elections.find(e => e.id===mandate.id)?.termActive).toBe(false);
    expect((await communityContinuityOverview(pool)).seats.find(s => s.role==="technical-security" && s.designation==="principal")?.state).toBe("unresolved");
    await expect(file("recall",mandate.id)).rejects.toThrow("integrity");
    const event = (await communityContinuityOverview(pool)).events[0];
    await pool.query("UPDATE blockchain_blocks SET content='tampered continuity event' WHERE block_number=$1",[event.blockNumber]);
    await expect(readContinuityEvent(pool,event.id)).rejects.toThrow("integrity");
    await expect(communityContinuityOverview(pool)).rejects.toThrow("integrity");
  });
});
