import { sql } from "drizzle-orm";
import { pgTable, varchar, text, bigint, boolean, timestamp, uniqueIndex, index, check } from "drizzle-orm/pg-core";

export function defineP2PCommerceTables(users: any, streams: any) {
  const p2pListings = pgTable("p2p_listings", {
    id: varchar("id", { length: 36 }).primaryKey(),
    sellerId: varchar("seller_id", { length: 36 }).notNull().references(() => users.id),
    sellerWave: text("seller_wave").notNull(),
    title: text("title").notNull(), description: text("description").notNull().default(""),
    category: text("category").notNull(), priceSats: bigint("price_sats", { mode: "bigint" }).notNull(),
    isPublic: boolean("is_public").notNull().default(true), status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  }, t => [check("p2p_listing_price_valid", sql`${t.priceSats} > 0 AND ${t.priceSats} <= 10000000000`),
    index("p2p_listing_feed_idx").on(t.status, t.isPublic, t.createdAt)]);
  const p2pListingRecipients = pgTable("p2p_listing_recipients", {
    listingId: varchar("listing_id", { length: 36 }).notNull().references(() => p2pListings.id),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  }, t => [uniqueIndex("p2p_listing_recipient_unique").on(t.listingId, t.userId)]);
  const p2pOrders = pgTable("p2p_orders", {
    id: varchar("id", { length: 36 }).primaryKey(),
    listingId: varchar("listing_id", { length: 36 }).notNull().references(() => p2pListings.id).unique(),
    buyerId: varchar("buyer_id", { length: 36 }).notNull().references(() => users.id),
    sellerId: varchar("seller_id", { length: 36 }).notNull().references(() => users.id),
    buyerWave: text("buyer_wave").notNull(), sellerWave: text("seller_wave").notNull(),
    title: text("title").notNull(), amountSats: bigint("amount_sats", { mode: "bigint" }).notNull(),
    requestId: varchar("request_id", { length: 36 }).notNull(), status: text("status").notNull().default("funded"),
    note: text("note").notNull().default(""), createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }, t => [uniqueIndex("p2p_order_request_unique").on(t.buyerId, t.requestId),
    check("p2p_order_amount_valid", sql`${t.amountSats} > 0 AND ${t.amountSats} <= 10000000000`),
    check("p2p_order_parties_distinct", sql`${t.buyerId} <> ${t.sellerId}`),
    check("p2p_order_state_valid", sql`${t.status} IN ('funded','delivered','disputed','released','refunded')`),
    index("p2p_order_buyer_idx").on(t.buyerId), index("p2p_order_seller_idx").on(t.sellerId)]);
  const p2pOrderEvents = pgTable("p2p_order_events", {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull().references(() => p2pOrders.id),
    actorId: varchar("actor_id", { length: 36 }).notNull().references(() => users.id),
    action: text("action").notNull(), note: text("note").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  });
  const p2pTips = pgTable("p2p_tips", {
    id: varchar("id", { length: 36 }).primaryKey(),
    senderId: varchar("sender_id", { length: 36 }).notNull().references(() => users.id),
    recipientId: varchar("recipient_id", { length: 36 }).notNull().references(() => users.id),
    requestId: varchar("request_id", { length: 36 }).notNull(),
    amountSats: bigint("amount_sats", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  }, t => [uniqueIndex("p2p_tip_request_unique").on(t.senderId, t.requestId)]);
  const p2pStreamGuests = pgTable("p2p_stream_guests", {
    streamId: varchar("stream_id", { length: 36 }).notNull().references(() => streams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    waveAddress: text("wave_address").notNull(),
  }, t => [uniqueIndex("p2p_stream_guest_unique").on(t.streamId, t.userId)]);
  return { p2pListings, p2pListingRecipients, p2pOrders, p2pOrderEvents, p2pTips, p2pStreamGuests };
}
