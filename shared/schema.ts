import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, jsonb, index } from "drizzle-orm/pg-core";
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
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
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
});

export const friendRequestSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
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
  psiChannel:      text("psi_channel").notNull().unique(),
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
