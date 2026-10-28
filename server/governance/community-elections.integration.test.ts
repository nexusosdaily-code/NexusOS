import { beforeAll, afterAll, describe, it, expect } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  verifyCommunityPerson, communityMembership, nominateCommunityReviewer,
  createCommunityElection, castCommunityBallot, finaliseCommunityElection,
  readCommunityElectionRecord, cancelCommunityElection, revokeCommunityPerson,
  withdrawCommunityNomination, communityOverview,
} from "./community-election-service";

// Isolated tables: never create accounts, elections or blocks in the app schema.
const schema = `election_test_${randomUUID().replaceAll("-","")}`;
const root = new pg.Pool({connectionString:process.env.DATABASE_URL});
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
const admin = {id:randomUUID(),role:"admin"};
const voters = Array.from({length:5},() => ({id:randomUUID(),role:"user"}));
beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for isolated election integration tests");
  await root.query(`CREATE SCHEMA ${schema}`);
  await pool.query(`CREATE TABLE users(id varchar(36) PRIMARY KEY, is_active boolean NOT NULL DEFAULT true);
    CREATE TABLE blockchain_blocks (LIKE public.blockchain_blocks INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);`);
  for (const actor of [admin,...voters]) await pool.query("INSERT INTO users(id) VALUES($1)",[actor.id]);
  await pool.query(await readFile("migrations/community-elections.sql","utf8"));
  await pool.query(await readFile("migrations/community-election-continuity.sql","utf8"));
  await pool.query(`INSERT INTO blockchain_blocks
    (block_number,content,wavelength_nm,psi_channel,wdm,oam,polarisation,band,energy_joules,lambda_mass_kg,frequency_hz)
    VALUES(0,'isolated test genesis',550,'Ψ(108,0,H)',108,0,'H','USER',0,0,1)`);
},30000);
afterAll(async () => {
  await pool.end();
  await root.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await root.end();
});
async function verify(index:number, ref = `opaque-unique-human-${index}`) {
  return verifyCommunityPerson(pool,admin,{
    userId:voters[index].id,personReference:ref,evidenceReference:"private-audit-reference",
    confirmUniqueHuman:true,confirmNoOrganisation:true,
  });
}
async function election(nominationId?:string) {
  const scheduledAt = Date.now();
  const result = await createCommunityElection(pool,admin,{
    ...(nominationId ? {kind:"reviewer" as const,nominationId} : {kind:"policy" as const,scope:"welfare" as const}),
    title:"Improve community welfare",body:"A community directive improving human wellbeing.",
    opensAt:new Date(scheduledAt+8*86400000).toISOString(),
    closesAt:new Date(scheduledAt+22*86400000).toISOString(),confirmAuthorityPreserved:true,
  });
  // Only test fixture changes time; no live endpoint can edit an election.
  await pool.query("UPDATE community_elections SET opens_at=now()-interval '1 minute' WHERE id=$1",[result.id]);
  return result.id;
}
async function close(id:string) {
  await pool.query("UPDATE community_elections SET closes_at=now()-interval '1 second' WHERE id=$1",[id]);
}
describe.sequential("durable community election lifecycle", () => {
  it("blocks unverified ballots, self-verification and non-admin setup", async () => {
    const id = await election();
    await expect(castCommunityBallot(pool,voters[0],id,"yes")).rejects.toThrow("verified unique human");
    await expect(verifyCommunityPerson(pool,admin,{
      userId:admin.id,personReference:"self-reference-1234",evidenceReference:"private-evidence",
      confirmUniqueHuman:true,confirmNoOrganisation:true,
    })).rejects.toThrow("own human membership");
    await expect(verifyCommunityPerson(pool,voters[0],{
      userId:voters[1].id,personReference:"reference-12345678",evidenceReference:"private-evidence",
      confirmUniqueHuman:true,confirmNoOrganisation:true,
    })).rejects.toThrow("Administrator required");
    await cancelCommunityElection(pool,admin,id);
    await expect(castCommunityBallot(pool,voters[0],id,"yes")).rejects.toThrow("not open");
  });
  it("enforces one stable person reference globally, including across accounts", async () => {
    await verify(0);
    await expect(verify(1,"opaque-unique-human-0")).rejects.toMatchObject({code:"23505"});
    for (let i=1;i<5;i++) await verify(i);
    expect((await communityMembership(pool,voters[0])).eligible).toBe(true);
  });
  it("accepts only one of simultaneous ballots and prevents cancellation after voting", async () => {
    const id = await election();
    const attempts = await Promise.allSettled([
      castCommunityBallot(pool,voters[0],id,"yes"),castCommunityBallot(pool,voters[0],id,"no"),
    ]);
    expect(attempts.filter(r => r.status==="fulfilled")).toHaveLength(1);
    expect((await pool.query("SELECT * FROM community_ballots WHERE election_id=$1",[id])).rows).toHaveLength(1);
    await expect(cancelCommunityElection(pool,admin,id)).rejects.toThrow("no ballots");
    await expect(finaliseCommunityElection(pool,admin,id)).rejects.toThrow("must close");
    await close(id);
    await expect(castCommunityBallot(pool,voters[1],id,"yes")).rejects.toThrow("not open");
  });
  it("records reviewer term and exact text atomically, never commissions or mints rewards", async () => {
    const n = await nominateCommunityReviewer(pool,voters[1],{
      publicName:"Test Reviewer",role:"human-life-safety",statement:"I consent to community review of my nomination.",
      publicKey:"ab".repeat(32),consent:true,
    });
    const id = await election(n.id);
    await expect(withdrawCommunityNomination(pool,voters[1],n.id)).rejects.toThrow("immutable");
    await castCommunityBallot(pool,voters[0],id,"yes");
    await castCommunityBallot(pool,voters[1],id,"yes");
    await castCommunityBallot(pool,voters[2],id,"no");
    await close(id);
    const outcomes = await Promise.all([
      finaliseCommunityElection(pool,admin,id),finaliseCommunityElection(pool,admin,id),
    ]);
    expect(outcomes[0].status).toBe("approved");
    expect(outcomes[0].blockNumber).toBe(outcomes[1].blockNumber);
    const readback = await readCommunityElectionRecord(pool,id);
    const record = JSON.parse(readback.content.slice("COMMUNITY_ELECTION[v1]:".length));
    expect(record.commissioned).toBe(false);
    expect(record.authorityRemovalPermitted).toBe(false);
    expect(record.yes).toBe(2);
    expect(record.no).toBe(1);
    expect(new Date(record.termEndsAt).getUTCFullYear()-new Date(record.termStartsAt).getUTCFullYear()).toBe(3);
    const block = (await pool.query("SELECT * FROM blockchain_blocks WHERE block_number=$1",[outcomes[0].blockNumber])).rows[0];
    expect(Number(block.nxt_reward)).toBe(0);
    expect((await pool.query("SELECT * FROM blockchain_blocks WHERE content=$1",[readback.content])).rows).toHaveLength(1);
    const overview = await communityOverview(pool);
    expect(JSON.stringify(overview)).not.toContain("private-audit-reference");
    expect(JSON.stringify(overview)).not.toContain("opaque-unique-human");
    expect(JSON.stringify(overview)).not.toContain(voters[0].id);
  });
  it("rejects tied and empty elections and never issues policy terms", async () => {
    for (const empty of [false,true]) {
      const id = await election();
      if (!empty) {
        await castCommunityBallot(pool,voters[0],id,"yes");
        await castCommunityBallot(pool,voters[1],id,"no");
      }
      await close(id);
      const result = await finaliseCommunityElection(pool,admin,id);
      expect(result.status).toBe("rejected");
      const record = await readCommunityElectionRecord(pool,id);
      expect(JSON.parse(record.content.slice("COMMUNITY_ELECTION[v1]:".length)).termEndsAt).toBeNull();
    }
  });
  it("rolls back status if the blockchain cannot persist the record", async () => {
    const id = await election();
    await castCommunityBallot(pool,voters[0],id,"yes");
    await close(id);
    await pool.query("ALTER TABLE blockchain_blocks ADD CONSTRAINT test_chain_failure CHECK(content NOT LIKE 'COMMUNITY_ELECTION%') NOT VALID");
    await expect(finaliseCommunityElection(pool,admin,id)).rejects.toThrow();
    expect((await pool.query("SELECT status,block_number FROM community_elections WHERE id=$1",[id])).rows[0])
      .toMatchObject({status:"pending",block_number:null});
    await pool.query("ALTER TABLE blockchain_blocks DROP CONSTRAINT test_chain_failure");
    expect((await finaliseCommunityElection(pool,admin,id)).status).toBe("approved");
  });
  it("detects blockchain readback alteration instead of claiming verification", async () => {
    const id = await election();
    await close(id);
    const result = await finaliseCommunityElection(pool,admin,id);
    await pool.query("UPDATE blockchain_blocks SET content='altered' WHERE block_number=$1",[result.blockNumber]);
    await expect(readCommunityElectionRecord(pool,id)).rejects.toThrow("integrity");
  });
  it("revocation prevents new ballots and re-enrolment of the same person", async () => {
    const id = await election();
    const membership = await communityMembership(pool,voters[4]);
    await revokeCommunityPerson(pool,admin,membership.personId!);
    await expect(castCommunityBallot(pool,voters[4],id,"yes")).rejects.toThrow("verified unique human");
    expect((await communityMembership(pool,voters[4])).eligible).toBe(false);
    await expect(verify(4)).rejects.toMatchObject({code:"23505"});
  });
});
