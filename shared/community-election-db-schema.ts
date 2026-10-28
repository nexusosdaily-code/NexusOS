import { sql } from "drizzle-orm";
import {
  pgTable, text, varchar, timestamp, integer, uuid, bigserial,
  uniqueIndex, index, primaryKey, check, type AnyPgColumn,
} from "drizzle-orm/pg-core";

/** Keep raw election migrations represented in the ORM schema so db:push
 * cannot mistake the append-only register for tables to remove. */
export function defineCommunityElectionTables(users: { id: AnyPgColumn }) {
  const stamp = (name: string) => timestamp(name, { withTimezone: true });
  const communityPersons = pgTable("community_persons", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", {length:36}).notNull().unique().references(() => users.id),
    personReferenceDigest: text("person_reference_digest").notNull().unique(),
    evidenceReference: text("evidence_reference").notNull(),
    verifiedBy: varchar("verified_by", {length:36}).notNull().references(() => users.id),
    verifiedAt: stamp("verified_at").notNull().defaultNow(),
    revokedAt: stamp("revoked_at"),
  });
  const communityNominations = pgTable("community_nominations", {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").notNull().references(() => communityPersons.id),
    publicName: text("public_name").notNull(),
    role: text("role").notNull(),
    statement: text("statement").notNull(),
    publicKey: text("public_key").notNull(),
    withdrawnAt: stamp("withdrawn_at"),
    createdAt: stamp("created_at").notNull().defaultNow(),
  }, t => [
    check("community_nominations_role_check",sql`${t.role} IN ('constitutional-legal','technical-security','human-life-safety')`),
    check("community_nominations_public_key_check",sql`${t.publicKey} ~ '^[a-f0-9]{64}$'`),
  ]);
  const communityElections = pgTable("community_elections", {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    nominationId: uuid("nomination_id").references(() => communityNominations.id),
    scope: text("scope").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    opensAt: stamp("opens_at").notNull(),
    closesAt: stamp("closes_at").notNull(),
    status: text("status").notNull().default("pending"),
    createdBy: varchar("created_by", {length:36}).notNull().references(() => users.id),
    createdAt: stamp("created_at").notNull().defaultNow(),
    finalisedAt: stamp("finalised_at"),
    recordDigest: text("record_digest").unique(),
    recordContent: text("record_content"),
    blockNumber: integer("block_number"),
    termStartsAt: stamp("term_starts_at"),
    termEndsAt: stamp("term_ends_at"),
  }, t => [
    check("community_elections_kind_check",sql`${t.kind} IN ('reviewer','policy','appeal','recall','commission')`),
    check("community_elections_scope_check",sql`${t.scope} IN ('constitutional-legal','technical-security','human-life-safety','community-representation','welfare','wnsp-technology')`),
    check("community_elections_status_check",sql`${t.status} IN ('pending','approved','rejected','cancelled')`),
    check("community_elections_check",sql`${t.closesAt} > ${t.opensAt}`),
    check("community_elections_nomination_check",sql`(${t.kind}='reviewer' AND ${t.nominationId} IS NOT NULL) OR (${t.kind}<>'reviewer' AND ${t.nominationId} IS NULL)`),
  ]);
  const communityBallots = pgTable("community_ballots", {
    electionId: uuid("election_id").notNull().references(() => communityElections.id),
    personId: uuid("person_id").notNull().references(() => communityPersons.id),
    choice: text("choice").notNull(),
    createdAt: stamp("created_at").notNull().defaultNow(),
  }, t => [
    primaryKey({name:"community_ballots_pkey",columns:[t.electionId,t.personId]}),
    check("community_ballots_choice_check",sql`${t.choice} IN ('yes','no')`),
  ]);
  const communityElectionAudit = pgTable("community_election_audit", {
    id: bigserial("id", {mode:"number"}).primaryKey(),
    actorId: varchar("actor_id", {length:36}).notNull().references(() => users.id),
    action: text("action").notNull(),
    resourceId: uuid("resource_id").notNull(),
    createdAt: stamp("created_at").notNull().defaultNow(),
  });
  const communityContinuityRequests = pgTable("community_continuity_requests", {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    targetId: uuid("target_id").notNull().references(() => communityElections.id),
    targetDigest: text("target_digest").notNull(),
    filingEndsAt: stamp("filing_ends_at"),
    createdAt: stamp("created_at").notNull().default(sql`clock_timestamp()`),
  }, t => [
    check("community_continuity_requests_kind_check",sql`${t.kind} IN ('appeal','recall','commission')`),
    uniqueIndex("community_single_appeal").on(t.targetId).where(sql`${t.kind}='appeal'`),
  ]);
  const communityContinuitySubmitters = pgTable("community_continuity_submitters", {
    requestId: uuid("request_id").notNull().references(() => communityContinuityRequests.id),
    personId: uuid("person_id").notNull().references(() => communityPersons.id),
  }, t => [primaryKey({name:"community_continuity_submitters_pkey",columns:[t.requestId,t.personId]})]);
  const communityElectionLinks = pgTable("community_election_links", {
    electionId: uuid("election_id").primaryKey().references(() => communityElections.id),
    designation: text("designation"),
    predecessorId: uuid("predecessor_id").references(() => communityElections.id),
    targetId: uuid("target_id").references(() => communityElections.id),
    requestId: uuid("request_id").references(() => communityContinuityRequests.id),
  }, t => [check("community_election_links_designation_check",sql`${t.designation} IN ('principal','alternate')`)]);
  const communityNominationSuccessions = pgTable("community_nomination_successions", {
    predecessorId: uuid("predecessor_id").primaryKey().references(() => communityNominations.id),
    successorId: uuid("successor_id").notNull().unique().references(() => communityNominations.id),
    createdAt: stamp("created_at").notNull().default(sql`clock_timestamp()`),
  });
  const communityContinuityEvents = pgTable("community_continuity_events", {
    id: uuid("id").primaryKey(),
    type: text("type").notNull(),
    targetId: uuid("target_id").notNull().references(() => communityElections.id),
    relatedId: uuid("related_id"),
    content: text("content").notNull(),
    digest: text("digest").notNull().unique(),
    blockNumber: integer("block_number").notNull(),
    createdAt: stamp("created_at").notNull(),
  }, t => [index("community_continuity_target").on(t.targetId)]);
  return {communityPersons,communityNominations,communityElections,communityBallots,communityElectionAudit,
    communityContinuityRequests,communityContinuitySubmitters,communityElectionLinks,
    communityNominationSuccessions,communityContinuityEvents};
}
