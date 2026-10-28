import { pgTable, uuid, varchar, text, integer, timestamp, boolean, jsonb, primaryKey, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export function defineWalletWaveTables(users: any, lambdaMessages: any, communityElections: any, blockchainBlocks: any) {
  const stamp = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
  const waveCommunications = pgTable("wave_communications", {
    id: uuid("id").primaryKey(), kind: text("kind").notNull(),
    senderId: varchar("sender_id", { length: 36 }).notNull().references(() => users.id),
    recipientId: varchar("recipient_id", { length: 36 }).references(() => users.id),
    messageId: varchar("message_id", { length: 36 }).unique().references(() => lambdaMessages.id),
    commissionId: uuid("commission_id").references(() => communityElections.id), templateIndex: integer("template_index"),
    topic: text("topic"), content: text("content").notNull(),
    envelope: jsonb("envelope").notNull(), salt: text("salt").notNull(),
    commitment: text("commitment").notNull().unique(),
    ledgerContent: text("ledger_content").notNull(),
    blockNumber: integer("block_number").notNull().references(() => blockchainBlocks.blockNumber),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestDigest: text("request_digest").notNull(),
    createdAt: stamp("created_at").notNull(),
  }, t => [
    uniqueIndex("wave_sender_retry").on(t.senderId, t.idempotencyKey),
    uniqueIndex("wave_single_commission_delivery").on(t.commissionId, t.recipientId).where(sql`${t.kind}='commission'`),
    uniqueIndex("wave_single_broadcast_template").on(t.commissionId, t.templateIndex).where(sql`${t.kind}='broadcast'`),
    index("wave_recipient_time").on(t.recipientId,t.createdAt),
    index("wave_sender_time").on(t.senderId,t.createdAt),
    index("wave_broadcast_topic").on(t.topic,t.createdAt).where(sql`${t.kind}='broadcast'`),
    check("wave_communications_kind_check", sql`${t.kind} IN ('private','commission','broadcast')`),
    check("wave_communications_salt_check", sql`length(${t.salt})=64`),
    check("wave_communications_topic_check", sql`${t.topic} IN ('constitutional-legal','technical-security','human-life-safety')`),
    check("wave_communications_check", sql`(${t.kind}='private' AND ${t.recipientId} IS NOT NULL AND ${t.messageId} IS NOT NULL AND ${t.commissionId} IS NULL AND ${t.topic} IS NULL)
      OR (${t.kind}='commission' AND ${t.recipientId} IS NOT NULL AND ${t.commissionId} IS NOT NULL AND ${t.messageId} IS NULL)
      OR (${t.kind}='broadcast' AND ${t.recipientId} IS NULL AND ${t.messageId} IS NULL AND ${t.commissionId} IS NOT NULL AND ${t.templateIndex} IS NOT NULL AND ${t.topic} IS NOT NULL)`),
  ]);
  const waveReceipts = pgTable("wave_receipts", {
    communicationId: uuid("communication_id").notNull().references(() => waveCommunications.id),
    recipientId: varchar("recipient_id", { length: 36 }).notNull().references(() => users.id),
    salt: text("salt").notNull(), envelope: jsonb("envelope").notNull(),
    commitment: text("commitment").notNull().unique(),
    ledgerContent: text("ledger_content").notNull(), blockNumber: integer("block_number").notNull().references(() => blockchainBlocks.blockNumber),
    createdAt: stamp("created_at").notNull(),
  }, t => [primaryKey({ columns: [t.communicationId, t.recipientId] }),
    check("wave_receipts_salt_check",sql`length(${t.salt})=64`)]);
  const waveConsents = pgTable("wave_consents", {
    recipientId: varchar("recipient_id", { length: 36 }).notNull().references(() => users.id),
    senderId: varchar("sender_id", { length: 36 }).notNull().references(() => users.id),
    allowed: boolean("allowed").notNull(), updatedAt: stamp("updated_at").notNull().defaultNow(),
  }, t => [primaryKey({ columns: [t.recipientId, t.senderId] })]);
  const waveSubscriptions = pgTable("wave_subscriptions", {
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    topic: text("topic").notNull(), subscribed: boolean("subscribed").notNull(),
    updatedAt: stamp("updated_at").notNull().defaultNow(),
  }, t => [primaryKey({ columns: [t.userId, t.topic] }),
    check("wave_subscriptions_topic_check",sql`${t.topic} IN ('constitutional-legal','technical-security','human-life-safety')`)]);
  return { waveCommunications, waveReceipts, waveConsents, waveSubscriptions };
}
