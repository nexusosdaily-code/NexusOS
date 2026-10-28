import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar, text, timestamp, integer, boolean, bigserial, primaryKey, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";

/** Match migrations/private-trust.sql so schema pushes preserve the private register. */
export function definePrivateTrustTables(users: { id: AnyPgColumn }) {
  const stamp = (name: string) => timestamp(name, { withTimezone: true });
  const privateTrustRequestWindows = pgTable("private_trust_request_windows", {
    userId:varchar("user_id",{length:36}).primaryKey().references(()=>users.id,{onDelete:"cascade"}),
    requests:integer("requests").notNull(), expiresAt:stamp("expires_at").notNull(),
  });
  const privateTrustWorkspaces = pgTable("private_trust_workspaces", {
    id: uuid("id").primaryKey().defaultRandom(), ownerId: varchar("owner_id",{length:36}).notNull().references(()=>users.id),
    kind: text("kind").notNull(), payload: text("payload").notNull(), createdAt: stamp("created_at").notNull().defaultNow(),
    confirmationInvalidated:boolean("confirmation_invalidated").notNull().default(false),
    expiresAt:stamp("expires_at").notNull().default(sql`now()+interval '365 days'`), closedAt:stamp("closed_at"),
  });
  const privateTrustMembers = pgTable("private_trust_members", {
    workspaceId: uuid("workspace_id").notNull().references(()=>privateTrustWorkspaces.id),
    userId: varchar("user_id",{length:36}).notNull().references(()=>users.id), role: text("role").notNull(),
    consentVersion: text("consent_version"), consentAt: stamp("consent_at"), revokedAt: stamp("revoked_at"),
  }, t=>[primaryKey({columns:[t.workspaceId,t.userId]})]);
  const privateTrustRecords = pgTable("private_trust_records", {
    id: uuid("id").primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull().references(()=>privateTrustWorkspaces.id),
    authorId: varchar("author_id",{length:36}).notNull().references(()=>users.id), type:text("type").notNull(),
    version:integer("version").notNull(), payload:text("payload").notNull(), objectId:uuid("object_id"),
    state:text("state").notNull().default("draft"), expiresAt:stamp("expires_at").notNull(), deletedAt:stamp("deleted_at"),
    createdAt:stamp("created_at").notNull().defaultNow(),
  }, t=>[uniqueIndex("private_trust_records_workspace_id_version_key").on(t.workspaceId,t.version)]);
  const privateTrustReviews = pgTable("private_trust_reviews", {
    recordId:uuid("record_id").notNull().references(()=>privateTrustRecords.id),
    reviewerId:varchar("reviewer_id",{length:36}).notNull().references(()=>users.id), controllerId:text("controller_id").notNull(),
    decision:text("decision").notNull(), expiresAt:stamp("expires_at").notNull(), createdAt:stamp("created_at").notNull().defaultNow(),
  },t=>[primaryKey({columns:[t.recordId,t.reviewerId]}),uniqueIndex("private_trust_reviews_record_id_controller_id_key").on(t.recordId,t.controllerId)]);
  const privateTrustAudit = pgTable("private_trust_audit", {
    id:bigserial("id",{mode:"number"}).primaryKey(), workspaceId:uuid("workspace_id").notNull().references(()=>privateTrustWorkspaces.id),
    actorId:varchar("actor_id",{length:36}).notNull().references(()=>users.id), action:text("action").notNull(),
    targetId:uuid("target_id"), createdAt:stamp("created_at").notNull().defaultNow(),
  });
  return { privateTrustWorkspaces, privateTrustMembers, privateTrustRecords, privateTrustReviews, privateTrustAudit, privateTrustRequestWindows };
}
