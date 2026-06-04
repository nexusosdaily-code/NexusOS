import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, bigint, boolean, decimal, jsonb, index, real, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// USERS TABLE - Core authentication with hashed passwords
// ============================================
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  phoneNumber: text("phone_number").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  isVerified: boolean("is_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // ── WNSP Spectral Identity ── deterministic channel derived from username hash
  spectralWdm:  integer("spectral_wdm"),
  spectralOam:  integer("spectral_oam"),
  spectralPol:  text("spectral_pol"),
  spectralNm:   real("spectral_nm"),
  spectralBand: text("spectral_band"),
  // ── Profile extras ──
  avatarUrl:    text("avatar_url"),
  country:      text("country"),
  stateRegion:  text("state_region"),
  bio:          text("bio"),
  // ── Admin BTC wallet (UniSat / on-chain) ──
  adminBtcAddress:      text("admin_btc_address"),
  adminBtcAddressSetAt: timestamp("admin_btc_address_set_at"),
  // ── Lightning Address (e.g. user@walletofsatoshi.com) ──
  lightningAddress: text("lightning_address"),
}, (table) => ({
  usernameIdx: index("users_username_idx").on(table.username),
  emailIdx: index("users_email_idx").on(table.email),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  phoneNumber: true,
  passwordHash: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================
// SESSIONS TABLE - Secure session management
// ============================================
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  tokenIdx: index("sessions_token_idx").on(table.token),
}));

export const insertSessionSchema = createInsertSchema(sessions).pick({
  userId: true,
  token: true,
  ipAddress: true,
  userAgent: true,
  expiresAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// ============================================
// AUDIT LOGS TABLE - Security and compliance logging
// ============================================
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  userId: true,
  action: true,
  resource: true,
  resourceId: true,
  details: true,
  ipAddress: true,
  userAgent: true,
  status: true,
  errorMessage: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================
// WALLETS TABLE - NXT Token wallets
// ============================================
export const wallets = pgTable("wallets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  address: text("address").notNull().unique(),
  balance: decimal("balance", { precision: 20, scale: 8 }).notNull().default("0"),
  lockedBalance: decimal("locked_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  walletPin: text("wallet_pin"),            // bcrypt hash of 4-digit PIN (null = not set)
  pinSet: boolean("pin_set").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("wallets_user_id_idx").on(table.userId),
  addressIdx: index("wallets_address_idx").on(table.address),
}));

export const insertWalletSchema = createInsertSchema(wallets).pick({
  userId: true,
  address: true,
  balance: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// ============================================
// TRANSACTIONS TABLE - NXT token transactions
// ============================================
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  fromWalletId: varchar("from_wallet_id", { length: 36 }).references(() => wallets.id),
  toWalletId: varchar("to_wallet_id", { length: 36 }).references(() => wallets.id),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  fee: decimal("fee", { precision: 20, scale: 8 }).notNull().default("0"),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  wavelength: decimal("wavelength", { precision: 20, scale: 12 }),
  frequency: decimal("frequency", { precision: 30, scale: 2 }),
  energyCost: decimal("energy_cost", { precision: 20, scale: 8 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => ({
  fromWalletIdx: index("transactions_from_wallet_idx").on(table.fromWalletId),
  toWalletIdx: index("transactions_to_wallet_idx").on(table.toWalletId),
  statusIdx: index("transactions_status_idx").on(table.status),
  createdAtIdx: index("transactions_created_at_idx").on(table.createdAt),
}));

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  fromWalletId: true,
  toWalletId: true,
  amount: true,
  fee: true,
  type: true,
  wavelength: true,
  frequency: true,
  energyCost: true,
  metadata: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ============================================
// VERSION REGISTRY TABLE - v6-v10 backward compatibility
// ============================================
export const versionRegistry = pgTable("version_registry", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  version: text("version").notNull().unique(),
  codename: text("codename"),
  features: jsonb("features").notNull().default("[]"),
  schemaVersion: integer("schema_version").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  deprecatedAt: timestamp("deprecated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVersionRegistrySchema = createInsertSchema(versionRegistry).pick({
  version: true,
  codename: true,
  features: true,
  schemaVersion: true,
  isActive: true,
});

export type InsertVersionRegistry = z.infer<typeof insertVersionRegistrySchema>;
export type VersionRegistry = typeof versionRegistry.$inferSelect;

// ============================================
// API KEYS TABLE - External service authentication
// ============================================
export const apiKeys = pgTable("api_keys", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  permissions: jsonb("permissions").notNull().default("[]"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("api_keys_user_id_idx").on(table.userId),
  keyPrefixIdx: index("api_keys_key_prefix_idx").on(table.keyPrefix),
}));

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  userId: true,
  name: true,
  keyHash: true,
  keyPrefix: true,
  permissions: true,
  expiresAt: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// ============================================
// RATE LIMITS TABLE - API rate limiting
// ============================================
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  identifier: text("identifier").notNull(),
  endpoint: text("endpoint").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  windowStart: timestamp("window_start").notNull().defaultNow(),
  windowEnd: timestamp("window_end").notNull(),
}, (table) => ({
  identifierEndpointIdx: index("rate_limits_identifier_endpoint_idx").on(table.identifier, table.endpoint),
}));

export const insertRateLimitSchema = createInsertSchema(rateLimits).pick({
  identifier: true,
  endpoint: true,
  requestCount: true,
  windowEnd: true,
});

export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;
export type RateLimit = typeof rateLimits.$inferSelect;

// ============================================
// FRIENDSHIPS TABLE - User connections
// ============================================
export const friendships = pgTable("friendships", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  addresseeId: varchar("addressee_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  spectralBond: decimal("spectral_bond", { precision: 20, scale: 12 }),
  wavelength: decimal("wavelength", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => ({
  requesterIdx: index("friendships_requester_idx").on(table.requesterId),
  addresseeIdx: index("friendships_addressee_idx").on(table.addresseeId),
  statusIdx: index("friendships_status_idx").on(table.status),
}));

export const insertFriendshipSchema = createInsertSchema(friendships).pick({
  requesterId: true,
  addresseeId: true,
  status: true,
  spectralBond: true,
  wavelength: true,
});

export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(8).max(100),
});

export const spectralEncodeSchema = z.object({
  text: z.string().min(1).max(10000),
  options: z.object({
    wavelengthRange: z.tuple([z.number(), z.number()]).optional(),
    encoding: z.string().optional(),
  }).optional(),
});

export const transferSchema = z.object({
  toAddress: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  memo: z.string().max(500).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(), // 4-digit wallet PIN
});

export const friendRequestSchema = z.object({
  phoneNumber: z.string().min(3).max(40),
});

export const friendActionSchema = z.object({
  friendshipId: z.string().min(1),
});

// ============================================
// UPLOADED FILES TABLE - File storage with spectral encoding
// ============================================
export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  spectralSignature: text("spectral_signature"),
  wavelengthMin: decimal("wavelength_min", { precision: 10, scale: 4 }),
  wavelengthMax: decimal("wavelength_max", { precision: 10, scale: 4 }),
  frequencyAvg: decimal("frequency_avg", { precision: 30, scale: 2 }),
  encodedData: text("encoded_data"),
  status: text("status").notNull().default("processing"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("uploaded_files_user_id_idx").on(table.userId),
  statusIdx: index("uploaded_files_status_idx").on(table.status),
}));

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).pick({
  userId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  spectralSignature: true,
  wavelengthMin: true,
  wavelengthMax: true,
  frequencyAvg: true,
  encodedData: true,
  status: true,
});

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SpectralEncodeInput = z.infer<typeof spectralEncodeSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type FriendActionInput = z.infer<typeof friendActionSchema>;

// ============================================
// LAMBDA MESSAGES TABLE - Spectral-encoded messaging
// ============================================
export const lambdaMessages = pgTable("lambda_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  encodedFrames: jsonb("encoded_frames"),
  totalLambdaMass: decimal("total_lambda_mass", { precision: 50, scale: 30 }),
  spectralHash: text("spectral_hash"),
  wavelengthMin: decimal("wavelength_min", { precision: 10, scale: 4 }),
  wavelengthMax: decimal("wavelength_max", { precision: 10, scale: 4 }),
  intensity: integer("intensity").default(32),
  cycles: integer("cycles").default(1),
  isRead: boolean("is_read").notNull().default(false),
  isDecoded: boolean("is_decoded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
}, (table) => ({
  senderIdx: index("lambda_messages_sender_idx").on(table.senderId),
  recipientIdx: index("lambda_messages_recipient_idx").on(table.recipientId),
  createdAtIdx: index("lambda_messages_created_at_idx").on(table.createdAt),
}));

export const insertLambdaMessageSchema = createInsertSchema(lambdaMessages).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertLambdaMessage = z.infer<typeof insertLambdaMessageSchema>;
export type LambdaMessage = typeof lambdaMessages.$inferSelect;

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().min(1).max(10000),
  intensity: z.number().min(1).max(100).optional(),
  cycles: z.number().min(1).max(10).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ============================================
// SECURE DOCUMENTS TABLE - Lambda-signed DOCX storage
// ============================================
export const secureDocuments = pgTable("secure_documents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  objectPath: text("object_path").notNull(),
  lambdaSignature: text("lambda_signature").notNull(),
  wavelength: decimal("wavelength", { precision: 20, scale: 12 }).notNull(),
  frequency: decimal("frequency", { precision: 30, scale: 2 }).notNull(),
  energyHash: text("energy_hash").notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  encryptionStatus: text("encryption_status").notNull().default("encrypted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("secure_documents_user_id_idx").on(table.userId),
  lambdaSignatureIdx: index("secure_documents_lambda_signature_idx").on(table.lambdaSignature),
}));

export const insertSecureDocumentSchema = createInsertSchema(secureDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertSecureDocument = z.infer<typeof insertSecureDocumentSchema>;
export type SecureDocument = typeof secureDocuments.$inferSelect;

// ============================================
// CALLS TABLE - Video/Voice call history
// ============================================
export const calls = pgTable("calls", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  callerId: varchar("caller_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "video" | "voice"
  status: text("status").notNull().default("pending"), // pending, ringing, active, ended, missed, declined
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  callerIdx: index("calls_caller_idx").on(table.callerId),
  receiverIdx: index("calls_receiver_idx").on(table.receiverId),
  statusIdx: index("calls_status_idx").on(table.status),
}));

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

export const initiateCallSchema = z.object({
  receiverId: z.string().min(1),
  type: z.enum(["video", "voice"]),
});

export type InitiateCallInput = z.infer<typeof initiateCallSchema>;

// ============================================
// STREAMS TABLE - Live video streaming
// ============================================
export const streams = pgTable("streams", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  broadcasterId: varchar("broadcaster_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, live, ended, paused
  streamType: text("stream_type").notNull().default("camera"), // camera, screen, both
  isPublic: boolean("is_public").notNull().default(true),
  viewerCount: integer("viewer_count").notNull().default(0),
  peakViewers: integer("peak_viewers").notNull().default(0),
  quality: text("quality").notNull().default("720p"), // 480p, 720p, 1080p, 4k
  bitrate: integer("bitrate").notNull().default(2500), // kbps
  frameRate: integer("frame_rate").notNull().default(30),
  recordingEnabled: boolean("recording_enabled").notNull().default(false),
  recordingPath: text("recording_path"),
  thumbnailUrl: text("thumbnail_url"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // seconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  broadcasterIdx: index("streams_broadcaster_idx").on(table.broadcasterId),
  statusIdx: index("streams_status_idx").on(table.status),
  isPublicIdx: index("streams_is_public_idx").on(table.isPublic),
}));

export const insertStreamSchema = createInsertSchema(streams).omit({
  id: true,
  createdAt: true,
  viewerCount: true,
  peakViewers: true,
});

export type InsertStream = z.infer<typeof insertStreamSchema>;
export type Stream = typeof streams.$inferSelect;

// ============================================
// STREAM VIEWERS TABLE - Track stream viewers
// ============================================
export const streamViewers = pgTable("stream_viewers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id", { length: 36 }).notNull().references(() => streams.id, { onDelete: "cascade" }),
  viewerId: varchar("viewer_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  watchDuration: integer("watch_duration"), // seconds
}, (table) => ({
  streamIdx: index("stream_viewers_stream_idx").on(table.streamId),
  viewerIdx: index("stream_viewers_viewer_idx").on(table.viewerId),
}));

export const insertStreamViewerSchema = createInsertSchema(streamViewers).omit({
  id: true,
});

export type InsertStreamViewer = z.infer<typeof insertStreamViewerSchema>;
export type StreamViewer = typeof streamViewers.$inferSelect;

// ============================================
// STREAM RECORDINGS TABLE - Recorded streams
// ============================================
export const streamRecordings = pgTable("stream_recordings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id", { length: 36 }).notNull().references(() => streams.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  duration: integer("duration").notNull(), // seconds
  format: text("format").notNull().default("webm"),
  status: text("status").notNull().default("processing"), // processing, ready, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  streamIdx: index("stream_recordings_stream_idx").on(table.streamId),
  userIdx: index("stream_recordings_user_idx").on(table.userId),
}));

export const insertStreamRecordingSchema = createInsertSchema(streamRecordings).omit({
  id: true,
  createdAt: true,
});

export type InsertStreamRecording = z.infer<typeof insertStreamRecordingSchema>;
export type StreamRecording = typeof streamRecordings.$inferSelect;

// Streaming validation schemas
export const createStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  streamType: z.enum(["camera", "screen", "both"]).optional(),
  isPublic: z.boolean().optional(),
  quality: z.enum(["480p", "720p", "1080p", "4k"]).optional(),
  bitrate: z.number().min(500).max(20000).optional(),
  frameRate: z.number().min(15).max(60).optional(),
  recordingEnabled: z.boolean().optional(),
});

export const updateStreamSettingsSchema = z.object({
  quality: z.enum(["480p", "720p", "1080p", "4k"]).optional(),
  bitrate: z.number().min(500).max(20000).optional(),
  frameRate: z.number().min(15).max(60).optional(),
});

export type CreateStreamInput = z.infer<typeof createStreamSchema>;
export type UpdateStreamSettingsInput = z.infer<typeof updateStreamSettingsSchema>;

// ============================================
// WAVELENGTH BLOCKCHAIN — first photonic ledger
// Block identity is a Ψ channel derived from physics, not SHA256
// ============================================
export const blockchainBlocks = pgTable("blockchain_blocks", {
  id:              varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  blockNumber:     integer("block_number").notNull().unique(),
  content:         text("content").notNull(),
  wavelengthNm:    decimal("wavelength_nm", { precision: 10, scale: 4 }).notNull(),
  psiChannel:      text("psi_channel").notNull(),
  wdm:             integer("wdm").notNull(),
  oam:             integer("oam").notNull(),
  polarisation:    text("polarisation").notNull(),
  band:            text("band").notNull(),
  energyJoules:    decimal("energy_joules", { precision: 30, scale: 20 }).notNull(),
  lambdaMassKg:    decimal("lambda_mass_kg", { precision: 30, scale: 20 }).notNull(),
  frequencyHz:     decimal("frequency_hz", { precision: 30, scale: 4 }).notNull(),
  previousPsi:     text("previous_psi"),
  nxtReward:       decimal("nxt_reward", { precision: 20, scale: 8 }).notNull().default("0"),
  minerAddress:    text("miner_address"),
  txCount:         integer("tx_count").notNull().default(0),
  transactions:    jsonb("transactions").default([]),
  minedAt:         timestamp("mined_at").notNull().defaultNow(),
}, (table) => ({
  blockNumberIdx:  index("blockchain_blocks_number_idx").on(table.blockNumber),
  psiIdx:          index("blockchain_blocks_psi_idx").on(table.psiChannel),
  bandIdx:         index("blockchain_blocks_band_idx").on(table.band),
}));

export const insertBlockchainBlockSchema = createInsertSchema(blockchainBlocks).omit({
  id: true, minedAt: true,
});
export type InsertBlockchainBlock = z.infer<typeof insertBlockchainBlockSchema>;
export type BlockchainBlock = typeof blockchainBlocks.$inferSelect;

// Pending transactions pool (mempool)
export const blockchainTxPool = pgTable("blockchain_tx_pool", {
  id:           varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  fromAddress:  text("from_address").notNull(),
  toAddress:    text("to_address").notNull(),
  amountNxt:    decimal("amount_nxt", { precision: 20, scale: 8 }).notNull(),
  memo:         text("memo"),
  wavelengthNm: decimal("wavelength_nm", { precision: 10, scale: 4 }),
  psiChannel:   text("psi_channel"),
  energyJoules: decimal("energy_joules", { precision: 30, scale: 20 }),
  feePaid:      decimal("fee_paid", { precision: 20, scale: 8 }).notNull().default("0"),
  status:       text("status").notNull().default("pending"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const insertBlockchainTxSchema = createInsertSchema(blockchainTxPool).omit({
  id: true, createdAt: true,
});
export type InsertBlockchainTx = z.infer<typeof insertBlockchainTxSchema>;
export type BlockchainTx = typeof blockchainTxPool.$inferSelect;

// ============================================
// SPECTRAL DATABASE — content-addressed storage
// Data lives at its wavelength, not at an assigned ID
// ============================================
export const spectralRecords = pgTable("spectral_records", {
  id:             varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  label:          text("label").notNull(),
  content:        text("content").notNull(),
  wavelengthNm:   decimal("wavelength_nm", { precision: 10, scale: 4 }).notNull(),
  psiChannel:     text("psi_channel").notNull(),
  wdm:            integer("wdm").notNull(),
  oam:            integer("oam").notNull(),
  polarisation:   text("polarisation").notNull(),
  band:           text("band").notNull(),
  energyJoules:   decimal("energy_joules", { precision: 30, scale: 20 }).notNull(),
  lambdaMassKg:   decimal("lambda_mass_kg", { precision: 30, scale: 20 }).notNull(),
  frequencyHz:    decimal("frequency_hz", { precision: 30, scale: 4 }).notNull(),
  data:           jsonb("data"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  wavelengthIdx:  index("spectral_records_wavelength_idx").on(table.wavelengthNm),
  bandIdx:        index("spectral_records_band_idx").on(table.band),
  psiIdx:         index("spectral_records_psi_idx").on(table.psiChannel),
}));

export const insertSpectralRecordSchema = createInsertSchema(spectralRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertSpectralRecord = z.infer<typeof insertSpectralRecordSchema>;
export type SpectralRecord = typeof spectralRecords.$inferSelect;

// ── Video Uploads — Spectral Workspace media ──────────────────────────────────
export const videoUploads = pgTable("video_uploads", {
  id:           varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  uploaderId:   varchar("uploader_id").notNull(),
  uploaderName: text("uploader_name").notNull(),
  filename:     text("filename").notNull(),
  mimeType:     text("mime_type").notNull(),
  fileSize:     integer("file_size").notNull(),
  duration:     real("duration"),
  thumbnailUrl: text("thumbnail_url"),
  videoData:    text("video_data"),
  status:       text("status").notNull().default("processing"),
  createdAt:    timestamp("created_at").defaultNow(),
});

export const insertVideoUploadSchema = createInsertSchema(videoUploads).omit({ id: true, createdAt: true });
export type InsertVideoUpload = z.infer<typeof insertVideoUploadSchema>;
export type VideoUpload = typeof videoUploads.$inferSelect;

// ============================================
// NETWORK NODES — Spectral node discovery
// Each node emits at its CE→SE frequency so other nodes can see it
// ============================================
export const networkNodes = pgTable("network_nodes", {
  id:             varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  nodeKey:        text("node_key").notNull().unique(),
  name:           text("name").notNull(),
  purpose:        text("purpose"),
  wavelengthNm:   decimal("wavelength_nm", { precision: 10, scale: 4 }).notNull(),
  frequencyThz:   decimal("frequency_thz", { precision: 10, scale: 4 }).notNull(),
  psiChannel:     text("psi_channel").notNull(),
  emissionBand:   text("emission_band").notNull(),
  status:         text("status").notNull().default("active"),
  endpoint:       text("endpoint"),
  capabilities:   jsonb("capabilities").notNull().default("[]"),
  lastBeaconAt:   timestamp("last_beacon_at").notNull().defaultNow(),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  nodeKeyIdx:     index("network_nodes_key_idx").on(table.nodeKey),
  statusIdx:      index("network_nodes_status_idx").on(table.status),
  wavelengthIdx:  index("network_nodes_wavelength_idx").on(table.wavelengthNm),
}));

export const insertNetworkNodeSchema = createInsertSchema(networkNodes).omit({ id: true, createdAt: true });
export type InsertNetworkNode = z.infer<typeof insertNetworkNodeSchema>;
export type NetworkNode = typeof networkNodes.$inferSelect;

export const registerNodeSchema = z.object({
  name: z.string().min(1).max(100),
  purpose: z.string().max(300).optional(),
  endpoint: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
});
export type RegisterNodeInput = z.infer<typeof registerNodeSchema>;

// ============================================
// WNSP REGISTRY — Spectral address book
// Maps wnsp://Ψ(wdm,oam,pol)/path → TCP/IP resource (bridge layer).
// Phase 1: HTTP overlay. Phase 2: native photonic when hardware arrives.
// Address is deterministic: derived from CE→SE (WASCII v1.0) of the label.
// ============================================
export const wnspRegistry = pgTable("wnsp_registry", {
  id:            varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  wnspUri:       text("wnsp_uri").notNull().unique(),
  psiChannel:    text("psi_channel").notNull(),
  wdm:           integer("wdm").notNull(),
  oam:           integer("oam").notNull(),
  polarisation:  text("polarisation").notNull().default("H"),
  wavelengthNm:  decimal("wavelength_nm", { precision: 10, scale: 4 }).notNull(),
  band:          text("band").notNull().default("GREEN"),
  label:         text("label").notNull(),
  ceInput:       text("ce_input").notNull(),
  resourceType:  text("resource_type").notNull().default("user"),
  resourceId:    text("resource_id"),
  httpUrl:       text("http_url"),
  description:   text("description"),
  registeredBy:  varchar("registered_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  isPublic:      boolean("is_public").notNull().default(true),
  isCanonical:   boolean("is_canonical").notNull().default(false),
  spectralVector: jsonb("spectral_vector"),
  resolveCount:  integer("resolve_count").notNull().default(0),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  psiIdx:        index("wnsp_registry_psi_idx").on(table.psiChannel),
  labelIdx:      index("wnsp_registry_label_idx").on(table.label),
  resourceIdx:   index("wnsp_registry_resource_idx").on(table.resourceType, table.resourceId),
  registeredByIdx: index("wnsp_registry_registered_by_idx").on(table.registeredBy),
}));

export const insertWnspRegistrySchema = createInsertSchema(wnspRegistry).omit({ id: true, createdAt: true, updatedAt: true, resolveCount: true });
export type InsertWnspRegistry = z.infer<typeof insertWnspRegistrySchema>;
export type WnspRegistryEntry = typeof wnspRegistry.$inferSelect;

// ============================================
// USER CREDENTIALS — Business & personal credential uploads
// Stored encrypted as base64; users decide public/private visibility.
// Spectral-signed: every credential is encoded via CE→SE at upload time.
// ============================================
export const userCredentials = pgTable("user_credentials", {
  id:             varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId:         varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialType: text("credential_type").notNull().default("other"),
  name:           text("name").notNull(),
  issuer:         text("issuer"),
  issuedDate:     text("issued_date"),
  expiryDate:     text("expiry_date"),
  fileName:       text("file_name").notNull(),
  fileType:       text("file_type").notNull().default("application/octet-stream"),
  fileData:       text("file_data").notNull(),
  fileSize:       integer("file_size"),
  visibility:     text("visibility").notNull().default("private"),
  psiChannel:     text("psi_channel"),
  wavelengthNm:   decimal("wavelength_nm", { precision: 10, scale: 4 }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx:        index("user_credentials_user_idx").on(table.userId),
  typeIdx:        index("user_credentials_type_idx").on(table.credentialType),
}));

export const insertUserCredentialSchema = createInsertSchema(userCredentials).omit({ id: true, createdAt: true });
export type InsertUserCredential = z.infer<typeof insertUserCredentialSchema>;
export type UserCredential = typeof userCredentials.$inferSelect;

// ============================================
// P2P RECEIPTS — Peer delivery confirmation
// Every time a peer downloads or acknowledges a P2P transmission,
// a receipt is logged with their spectral channel address and timestamp.
// This provides cryptographic proof of delivery to named peers.
// ============================================
export const p2pReceipts = pgTable("p2p_receipts", {
  id:              varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  transmissionId:  varchar("transmission_id", { length: 36 }).notNull(),
  transmissionType: text("transmission_type").notNull().default("video"),
  filename:        text("filename"),
  peerId:          varchar("peer_id", { length: 36 }),
  peerName:        text("peer_name").notNull().default("anonymous"),
  peerPsiChannel:  text("peer_psi_channel").notNull(),
  peerWavelengthNm: decimal("peer_wavelength_nm", { precision: 10, scale: 4 }),
  peerFrequencyHz: decimal("peer_frequency_hz", { precision: 20, scale: 4 }),
  peerBand:        text("peer_band"),
  srcPsiChannel:   text("src_psi_channel"),
  bytesReceived:   integer("bytes_received"),
  status:          text("status").notNull().default("received"),
  receivedAt:      timestamp("received_at").notNull().defaultNow(),
}, (table) => ({
  transmissionIdx: index("p2p_receipts_transmission_idx").on(table.transmissionId),
  peerIdx:         index("p2p_receipts_peer_idx").on(table.peerId),
  receivedAtIdx:   index("p2p_receipts_received_at_idx").on(table.receivedAt),
}));

export const insertP2pReceiptSchema = createInsertSchema(p2pReceipts).omit({ id: true, receivedAt: true });
export type InsertP2pReceipt = z.infer<typeof insertP2pReceiptSchema>;
export type P2pReceipt = typeof p2pReceipts.$inferSelect;

// ============================================
// TRANSMISSION REPORTS
// Persistent per-transmission analysis reports linking spectral metadata,
// document analysis, and peer receipt counts into a single audit record.
// ============================================
export const transmissionReports = pgTable("transmission_reports", {
  id:                  varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  documentName:        text("document_name").notNull(),
  transmissionType:    text("transmission_type").notNull().default("text"),
  psiChannel:          text("psi_channel"),
  wavelengthNm:        decimal("wavelength_nm", { precision: 10, scale: 4 }),
  frequencyHz:         decimal("frequency_hz", { precision: 20, scale: 4 }),
  band:                text("band"),
  videoId:             varchar("video_id", { length: 36 }),
  spectralRecordId:    varchar("spectral_record_id", { length: 36 }),
  totalChars:          integer("total_chars").default(0),
  wordCount:           integer("word_count").default(0),
  avgWavelength:       decimal("avg_wavelength", { precision: 10, scale: 4 }),
  totalEnergy:         decimal("total_energy", { precision: 30, scale: 20 }),
  transmissionTimeMs:  integer("transmission_time_ms"),
  successRate:         decimal("success_rate", { precision: 5, scale: 2 }),
  photonsEmitted:      integer("photons_emitted").default(0),
  ordinalUnits:        text("ordinal_units"),
  ordinalNxt:          text("ordinal_nxt"),
  busSignalSent:       boolean("bus_signal_sent").default(false),
  uploaderId:          text("uploader_id"),
  uploaderName:        text("uploader_name"),
  rawSummary:          jsonb("raw_summary"),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index("tx_reports_created_idx").on(table.createdAt),
  uploaderIdx:  index("tx_reports_uploader_idx").on(table.uploaderId),
}));

export const insertTransmissionReportSchema = createInsertSchema(transmissionReports).omit({ id: true, createdAt: true });
export type InsertTransmissionReport = z.infer<typeof insertTransmissionReportSchema>;
export type TransmissionReportRow = typeof transmissionReports.$inferSelect;

// ── Governance ────────────────────────────────────────────────────────────────

export const governanceParams = pgTable("governance_params", {
  key:                text("key").primaryKey(),
  value:              text("value").notNull(),
  description:        text("description").notNull(),
  category:           text("category").notNull(),   // "fee" | "burn"
  unit:               text("unit").notNull(),         // "NXT" | "ratio" | "fraction"
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
  updatedByProposalId: integer("updated_by_proposal_id"),
});

export const governanceProposals = pgTable("governance_proposals", {
  id:            serial("id").primaryKey(),
  proposerId:    text("proposer_id").notNull(),
  proposerName:  text("proposer_name").notNull(),
  proposerBand:  text("proposer_band").notNull(),
  title:         text("title").notNull(),
  rationale:     text("rationale").notNull(),
  parameterKey:  text("parameter_key").notNull(),
  currentValue:  text("current_value").notNull(),
  proposedValue: text("proposed_value").notNull(),
  status:        text("status").notNull().default("active"), // active|passed|rejected|executed
  yesWeight:     integer("yes_weight").notNull().default(0),
  noWeight:      integer("no_weight").notNull().default(0),
  abstainWeight: integer("abstain_weight").notNull().default(0),
  voteCount:     integer("vote_count").notNull().default(0),
  closesAt:      timestamp("closes_at").notNull(),
  executedAt:    timestamp("executed_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx:   index("gov_proposals_status_idx").on(table.status),
  proposerIdx: index("gov_proposals_proposer_idx").on(table.proposerId),
}));

export const governanceVotes = pgTable("governance_votes", {
  id:              serial("id").primaryKey(),
  proposalId:      integer("proposal_id").notNull(),
  voterId:         text("voter_id").notNull(),
  voterName:       text("voter_name").notNull(),
  vote:            text("vote").notNull(),           // yes|no|abstain
  authorityWeight: integer("authority_weight").notNull(),
  voterBand:       text("voter_band").notNull(),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  proposalIdx: index("gov_votes_proposal_idx").on(table.proposalId),
  voterIdx:    index("gov_votes_voter_idx").on(table.voterId),
  uniqueVote:  uniqueIndex("gov_votes_unique_idx").on(table.proposalId, table.voterId),
}));

export const insertGovernanceProposalSchema = createInsertSchema(governanceProposals).omit({ id: true, yesWeight: true, noWeight: true, abstainWeight: true, voteCount: true, executedAt: true, createdAt: true });
export type InsertGovernanceProposal = z.infer<typeof insertGovernanceProposalSchema>;
export type GovernanceProposal = typeof governanceProposals.$inferSelect;
export type GovernanceParam   = typeof governanceParams.$inferSelect;
export type GovernanceVote    = typeof governanceVotes.$inferSelect;

// ============================================
// TELEGRAM VIDEOS TABLE
// ============================================
export const telegramVideos = pgTable("telegram_videos", {
  id:              serial("id").primaryKey(),
  fileId:          text("file_id").notNull(),
  fileUniqueId:    text("file_unique_id").notNull().unique(),
  caption:         text("caption"),
  mimeType:        text("mime_type").default("video/mp4"),
  fileSize:        integer("file_size"),
  duration:        integer("duration"),
  width:           integer("width"),
  height:          integer("height"),
  thumbFileId:     text("thumb_file_id"),
  messageId:       integer("message_id"),
  chatId:          text("chat_id"),
  source:          text("source").notNull().default("bot"),
  channelUsername: text("channel_username"),
  channelPostId:   integer("channel_post_id"),
  isPublished:     boolean("is_published").notNull().default(true),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  publishedIdx: index("telegram_videos_published_idx").on(table.isPublished),
}));

export const insertTelegramVideoSchema = createInsertSchema(telegramVideos).omit({ id: true, createdAt: true });
export type InsertTelegramVideo = z.infer<typeof insertTelegramVideoSchema>;
export type TelegramVideo = typeof telegramVideos.$inferSelect;

// ============================================
// SOCIAL BROADCASTS TABLE
// ============================================
export const socialBroadcasts = pgTable("social_broadcasts", {
  id:            serial("id").primaryKey(),
  videoId:       integer("video_id").notNull().references(() => telegramVideos.id),
  platform:      text("platform").notNull(),           // "instagram" | "youtube"
  status:        text("status").notNull().default("pending"), // pending | broadcasting | posted | failed | skipped
  postUrl:       text("post_url"),
  errorMessage:  text("error_message"),
  agentNote:     text("agent_note"),
  attemptCount:  integer("attempt_count").notNull().default(0),
  scheduledAt:   timestamp("scheduled_at").notNull().defaultNow(),
  broadcastAt:   timestamp("broadcast_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  videoIdx:   index("social_broadcasts_video_idx").on(table.videoId),
  statusIdx:  index("social_broadcasts_status_idx").on(table.status),
  platformIdx: index("social_broadcasts_platform_idx").on(table.platform),
}));

export const insertSocialBroadcastSchema = createInsertSchema(socialBroadcasts).omit({ id: true, createdAt: true });
export type InsertSocialBroadcast = z.infer<typeof insertSocialBroadcastSchema>;
export type SocialBroadcast = typeof socialBroadcasts.$inferSelect;

// ============================================
// BTC NAMES BRIDGE TABLE
// ============================================
export const btcNames = pgTable("btc_names", {
  id:            serial("id").primaryKey(),
  name:          text("name").notNull().unique(),        // e.g. "wnsp.sats" or "wnsp.btc"
  nameType:      text("name_type").notNull(),             // "sats" | "btc" | "4letter" | "bitmap"
  btcAddress:    text("btc_address"),                     // resolved Bitcoin address
  inscriptionId: text("inscription_id"),                  // ordinal inscription ID
  psiChannel:    text("psi_channel"),                     // derived WNSP Ψ channel
  wdm:           integer("wdm"),
  oam:           integer("oam"),
  pol:           text("pol"),
  lambdaNm:      text("lambda_nm"),
  freqThz:       text("freq_thz"),
  energyEv:      text("energy_ev"),
  status:        text("status").notNull().default("pending"),   // "pending" | "registered" | "verified"
  resolvedAt:    timestamp("resolved_at"),
  ownedByUserId: integer("owned_by_user_id"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const insertBtcNameSchema = createInsertSchema(btcNames).omit({ id: true, createdAt: true });
export type InsertBtcName = z.infer<typeof insertBtcNameSchema>;
export type BtcName = typeof btcNames.$inferSelect;

// ============================================
// BTC ORDINAL INSCRIPTIONS TABLE
// ============================================
export const btcInscriptions = pgTable("btc_inscriptions", {
  id:            serial("id").primaryKey(),
  inscriptionKey: text("inscription_key").notNull().unique(), // "CE-TABLE-v1" | "SPEC-v1" | etc.
  title:         text("title").notNull(),
  inscriptionId: text("inscription_id"),                      // actual on-chain ID once inscribed
  contentType:   text("content_type").notNull().default("text/plain"),
  contentHash:   text("content_hash"),                        // SHA-256 of inscribed content
  byteSize:      integer("byte_size"),
  status:        text("status").notNull().default("pending"),  // "pending" | "inscribed" | "verified"
  blockHeight:   integer("block_height"),
  satoshi:       text("satoshi"),                              // specific sat number
  inscribedAt:   timestamp("inscribed_at"),
  verifiedAt:    timestamp("verified_at"),
  ordinalsCom:   text("ordinals_com_url"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export const insertBtcInscriptionSchema = createInsertSchema(btcInscriptions).omit({ id: true, createdAt: true });
export type InsertBtcInscription = z.infer<typeof insertBtcInscriptionSchema>;
export type BtcInscription = typeof btcInscriptions.$inferSelect;

// ============================================
// BTC INSCRIPTION QUEUE — NexusOS → Bitcoin bridge
// ============================================
export const btcInscriptionQueue = pgTable("btc_inscription_queue", {
  id:              serial("id").primaryKey(),
  eventType:       text("event_type").notNull(),   // "NXT_TRANSFER" | "GOVERNANCE" | "KERNEL" | "WASCII_MANUAL"
  eventRef:        text("event_ref"),               // NexusOS tx id / proposal id / kernel event id
  anchorName:      text("anchor_name").notNull().default("wnsp.sats"),
  anchorAddress:   text("anchor_address"),          // bc1p... Taproot address of anchor name
  parentInscriptionId: text("parent_inscription_id"), // wnsp.sats inscription ID for parent linking
  inscriptionContent: text("inscription_content").notNull(),  // full WASCII text ready to paste
  contentBytes:    integer("content_bytes"),
  psiChannel:      text("psi_channel"),             // Ψ channel derived from event
  status:          text("status").notNull().default("pending"), // "pending" | "signed" | "confirmed" | "failed"
  unisatDeepLink:  text("unisat_deep_link"),
  inscriptionId:   text("inscription_id"),          // Bitcoin inscription ID once confirmed
  blockHeight:     integer("block_height"),
  triggeredBy:     text("triggered_by"),            // username who triggered
  signedAt:        timestamp("signed_at"),
  confirmedAt:     timestamp("confirmed_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("btc_queue_status_idx").on(table.status),
  eventTypeIdx: index("btc_queue_event_type_idx").on(table.eventType),
}));

export const insertBtcInscriptionQueueSchema = createInsertSchema(btcInscriptionQueue).omit({ id: true, createdAt: true });
export type InsertBtcInscriptionQueue = z.infer<typeof insertBtcInscriptionQueueSchema>;
export type BtcInscriptionQueueItem = typeof btcInscriptionQueue.$inferSelect;

// ── BTC Bridge persistent config (anchor address + parent inscription ID) ──
export const btcBridgeConfig = pgTable("btc_bridge_config", {
  key:       text("key").primaryKey(),
  value:     text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── wnsp Staking ─────────────────────────────────────────────────────────────
export const wnspStakes = pgTable("wnsp_stakes", {
  id:              serial("id").primaryKey(),
  userId:          text("user_id").notNull(),
  inscriptionId:   text("inscription_id").notNull().unique(),
  wnspAmount:      integer("wnsp_amount").notNull().default(1000),
  status:          text("status").notNull().default("active"),  // active | unstaked | claimed
  epochsCompleted: integer("epochs_completed").notNull().default(0),
  nxtEarned:       decimal("nxt_earned", { precision: 20, scale: 8 }).notNull().default("0"),
  nxtClaimed:      decimal("nxt_claimed", { precision: 20, scale: 8 }).notNull().default("0"),
  stakedAt:        timestamp("staked_at").notNull().defaultNow(),
  lastClaimAt:     timestamp("last_claim_at"),
  unstakedAt:      timestamp("unstaked_at"),
}, (t) => ({ userIdx: index("wnsp_stakes_user_idx").on(t.userId) }));

export const insertWnspStakeSchema = createInsertSchema(wnspStakes).omit({ id: true, stakedAt: true });
export type InsertWnspStake = z.infer<typeof insertWnspStakeSchema>;
export type WnspStake = typeof wnspStakes.$inferSelect;

// ── Community Mint Requests ──────────────────────────────────────────────────
export const communityMints = pgTable("community_mints", {
  id:            serial("id").primaryKey(),
  userId:        text("user_id").notNull(),
  username:      text("username").notNull(),
  nxtFeePaid:    decimal("nxt_fee_paid", { precision: 20, scale: 8 }).notNull(),
  inscriptionId: text("inscription_id"),
  queueId:       integer("queue_id"),
  status:        text("status").notNull().default("queued"),  // queued | confirmed | failed
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  confirmedAt:   timestamp("confirmed_at"),
}, (t) => ({ userIdx: index("community_mints_user_idx").on(t.userId) }));

export const insertCommunityMintSchema = createInsertSchema(communityMints).omit({ id: true, createdAt: true });
export type InsertCommunityMint = z.infer<typeof insertCommunityMintSchema>;
export type CommunityMint = typeof communityMints.$inferSelect;

// ── NXT ↔ Fractal Bitcoin Swap Bridge ────────────────────────────────────────
export const nxtFbSwaps = pgTable("nxt_fb_swaps", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id").notNull(),
  username:        text("username").notNull(),
  direction:       text("direction").notNull(),          // "nxt_to_fb" | "fb_to_nxt"
  nxtAmount:       decimal("nxt_amount", { precision: 20, scale: 8 }).notNull(),
  wnspAmount:      integer("wnsp_amount").notNull(),
  fractalAddress:  text("fractal_address").notNull(),    // Fractal Bitcoin address
  fractalTxHash:   text("fractal_tx_hash"),              // for fb_to_nxt: submitted TX
  queueId:         integer("queue_id"),                  // for nxt_to_fb: inscription queue
  inscriptionId:   text("inscription_id"),               // confirmed inscription ID
  status:          text("status").notNull().default("pending"),
  // pending | broadcasting | confirmed | failed | refunded
  rateNxtPerWnsp:  decimal("rate_nxt_per_wnsp", { precision: 10, scale: 6 }).notNull().default("0.05"),
  errorMsg:        text("error_msg"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  completedAt:     timestamp("completed_at"),
}, (t) => ({
  userIdx:      index("nxt_fb_swaps_user_idx").on(t.userId),
  statusIdx:    index("nxt_fb_swaps_status_idx").on(t.status),
  directionIdx: index("nxt_fb_swaps_dir_idx").on(t.direction),
}));

export const insertNxtFbSwapSchema = createInsertSchema(nxtFbSwaps).omit({ id: true, createdAt: true });
export type InsertNxtFbSwap = z.infer<typeof insertNxtFbSwapSchema>;
export type NxtFbSwap = typeof nxtFbSwaps.$inferSelect;

// ── Lightning Network / LNbits Integration ────────────────────────────────────
export const lightningWallets = pgTable("lightning_wallets", {
  id:             serial("id").primaryKey(),
  userId:         varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  satsBalance:    bigint("sats_balance",    { mode: "number" }).notNull().default(0),
  totalDeposited: bigint("total_deposited", { mode: "number" }).notNull().default(0),
  totalWithdrawn: bigint("total_withdrawn", { mode: "number" }).notNull().default(0),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const lightningTransactions = pgTable("lightning_transactions", {
  id:               serial("id").primaryKey(),
  userId:           varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  type:             text("type").notNull(), // "deposit" | "withdrawal" | "swap_to_nxt" | "swap_to_sats"
  amountSats:       bigint("amount_sats", { mode: "number" }).notNull(),
  nxtAmount:        decimal("nxt_amount", { precision: 20, scale: 8 }),
  paymentHash:      text("payment_hash"),
  paymentRequest:   text("payment_request"),
  memo:             text("memo"),
  btcAddress:       text("btc_address"),
  btcTxid:          text("btc_txid"),
  status:           text("status").notNull().default("pending"), // pending | completed | failed
  lnbitsPaymentId:  text("lnbits_payment_id"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  completedAt:      timestamp("completed_at"),
}, (t) => ({
  userIdx:   index("ln_tx_user_idx").on(t.userId),
  statusIdx: index("ln_tx_status_idx").on(t.status),
  typeIdx:   index("ln_tx_type_idx").on(t.type),
}));

export const insertLightningTransactionSchema = createInsertSchema(lightningTransactions).omit({ id: true, createdAt: true });
export type InsertLightningTransaction = z.infer<typeof insertLightningTransactionSchema>;
export type LightningTransaction = typeof lightningTransactions.$inferSelect;
export type LightningWallet = typeof lightningWallets.$inferSelect;

// ── NexusOS Marketplace ───────────────────────────────────────────────────────
export const marketplaceListings = pgTable("marketplace_listings", {
  id:              serial("id").primaryKey(),
  sellerId:        text("seller_id").notNull(),
  sellerUsername:  text("seller_username").notNull(),
  sellerBtcAddress:text("seller_btc_address"),           // BTC address that holds the asset
  ownershipSig:    text("ownership_sig"),                 // UniSat signed message proving ownership
  assetType:       text("asset_type").notNull(),          // wnsp_brc20 | rune | ordinal
  assetId:         text("asset_id").notNull(),            // inscription_id or rune_id
  assetName:       text("asset_name").notNull(),          // display name e.g. "wnsp", "NEXUS•WAVELENGTH"
  amount:          integer("amount").notNull().default(1000),
  priceNxt:        decimal("price_nxt", { precision: 20, scale: 8 }).notNull(),
  priceSats:       integer("price_sats"),                 // optional BTC price in sats
  status:          text("status").notNull().default("active"), // active | sold | cancelled
  buyerId:         text("buyer_id"),
  buyerUsername:   text("buyer_username"),
  soldAt:          timestamp("sold_at"),
  cancelledAt:     timestamp("cancelled_at"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  description:     text("description"),
}, (t) => ({
  sellerIdx: index("marketplace_seller_idx").on(t.sellerId),
  statusIdx: index("marketplace_status_idx").on(t.status),
  assetTypeIdx: index("marketplace_asset_type_idx").on(t.assetType),
}));

export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({ id: true, createdAt: true });
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;

// ── NEXUS•WAVELENGTH Rune ─────────────────────────────────────────────────────
export const runeMints = pgTable("rune_mints", {
  id:          serial("id").primaryKey(),
  userId:      text("user_id").notNull(),
  username:    text("username").notNull(),
  btcAddress:  text("btc_address").notNull(),
  runeAmount:  integer("rune_amount").notNull().default(1000),
  nxtPaid:     decimal("nxt_paid", { precision: 20, scale: 8 }).notNull(),
  runeId:      text("rune_id").notNull().default("pending"),
  btcTxid:     text("btc_txid"),
  status:      text("status").notNull().default("pending"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});
export const insertRuneMintSchema = createInsertSchema(runeMints).omit({ id: true, createdAt: true });
export type RuneMint = typeof runeMints.$inferSelect;

export const runeStakes = pgTable("rune_stakes", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull(),
  username:     text("username").notNull(),
  runeAmount:   integer("rune_amount").notNull(),
  runeUtxo:     text("rune_utxo").notNull(),
  epoch:        integer("epoch").notNull().default(0),
  nxtEarned:    decimal("nxt_earned", { precision: 20, scale: 8 }).notNull().default("0"),
  nxtClaimed:   decimal("nxt_claimed", { precision: 20, scale: 8 }).notNull().default("0"),
  status:       text("status").notNull().default("active"),
  lastClaimAt:  timestamp("last_claim_at"),
  stakedAt:     timestamp("staked_at").notNull().defaultNow(),
});
export const insertRuneStakeSchema = createInsertSchema(runeStakes).omit({ id: true, stakedAt: true });
export type RuneStake = typeof runeStakes.$inferSelect;

// ── BTC Deposit Address Registry ─────────────────────────────────────────────
export const btcAddressRegistry = pgTable("btc_address_registry", {
  id:           serial("id").primaryKey(),
  userId:       varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  username:     varchar("username", { length: 100 }).notNull(),
  btcAddress:   text("btc_address").notNull().unique(),
  label:        text("label").default("My BTC Sender Address"),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});
export type BtcAddressRegistryEntry = typeof btcAddressRegistry.$inferSelect;

// ── BTC Address Book (saved distribution addresses per user) ──────────────────
export const btcAddressBook = pgTable("btc_address_book", {
  id:         serial("id").primaryKey(),
  userId:     varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  label:      text("label").notNull().default("Wallet"),
  btcAddress: text("btc_address").notNull(),
  isAdmin:    boolean("is_admin").notNull().default(false),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("btc_address_book_user_idx").on(t.userId),
}));
export type BtcAddressBookEntry = typeof btcAddressBook.$inferSelect;

// ── Sats Staking Pool ─────────────────────────────────────────────────────────
export const satsStakes = pgTable("sats_stakes", {
  id:               serial("id").primaryKey(),
  userId:           varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  amountSats:       bigint("amount_sats", { mode: "number" }).notNull(),
  lockDays:         integer("lock_days").notNull().default(7),
  yieldRatePercent: decimal("yield_rate_percent", { precision: 5, scale: 2 }).notNull().default("5.00"),
  stakedAt:         timestamp("staked_at").notNull().defaultNow(),
  maturesAt:        timestamp("matures_at").notNull(),
  claimedAt:        timestamp("claimed_at"),
  nxtYield:         decimal("nxt_yield", { precision: 20, scale: 8 }),
  status:           text("status").notNull().default("active"), // active | claimed
}, (t) => ({
  userIdx:   index("sats_stakes_user_idx").on(t.userId),
  statusIdx: index("sats_stakes_status_idx").on(t.status),
}));
export type SatsStake = typeof satsStakes.$inferSelect;

// ── WNUSD Collateral Positions ────────────────────────────────────────────────
export const wnusdPositions = pgTable("wnusd_positions", {
  id:             varchar("id", { length: 36 }).primaryKey(),
  userId:         text("user_id").notNull(),
  collateralSats: bigint("collateral_sats", { mode: "number" }).notNull(),
  nxtFeeSent:     decimal("nxt_fee_sent",  { precision: 20, scale: 8 }).notNull(),
  wnusdMinted:    decimal("wnusd_minted",  { precision: 20, scale: 8 }).notNull(),
  status:         text("status").notNull().default("active"), // active | redeemed | liquidated
  colRatioPct:    decimal("col_ratio_pct", { precision: 10, scale: 2 }).notNull(),
  btcUsdAtMint:   decimal("btc_usd_at_mint", { precision: 20, scale: 2 }).notNull(),
  stakeId:        integer("stake_id"),
  openedAt:       timestamp("opened_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ userIdx: index("wnusd_positions_user_idx").on(t.userId) }));
export type WnusdPosition = typeof wnusdPositions.$inferSelect;

// ── WNUSD Transaction Log ─────────────────────────────────────────────────────
export const wnusdTransactions = pgTable("wnusd_transactions", {
  id:           varchar("id",  { length: 36 }).primaryKey(),
  userId:       text("user_id").notNull(),
  positionId:   varchar("position_id", { length: 36 }),
  type:         text("type").notNull(), // mint | redeem | add_collateral
  satsDelta:    bigint("sats_delta",  { mode: "number" }).notNull(),
  wnusdDelta:   decimal("wnusd_delta", { precision: 20, scale: 8 }).notNull(),
  nxtFee:       decimal("nxt_fee",    { precision: 20, scale: 8 }).notNull().default("0"),
  colRatioPct:  decimal("col_ratio_pct", { precision: 10, scale: 2 }).notNull(),
  btcUsdAtTime: decimal("btc_usd_at_time", { precision: 20, scale: 2 }).notNull(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ userIdx: index("wnusd_tx_user_idx").on(t.userId) }));
export type WnusdTransaction = typeof wnusdTransactions.$inferSelect;

// ── BTC Deposits — every detected incoming TX ─────────────────────────────────
export const btcDeposits = pgTable("btc_deposits", {
  id:            serial("id").primaryKey(),
  txid:          text("txid").notNull().unique(),
  senderAddress: text("sender_address"),
  satsReceived:  integer("sats_received").notNull(),
  nxtCredited:   decimal("nxt_credited", { precision: 20, scale: 8 }),
  userId:        varchar("user_id", { length: 36 }),
  username:      text("username"),
  status:        text("status").notNull().default("unmatched"), // unmatched | credited | claimed
  detectedAt:    timestamp("detected_at").notNull().defaultNow(),
  creditedAt:    timestamp("credited_at"),
});
export type BtcDeposit = typeof btcDeposits.$inferSelect;
