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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SpectralEncodeInput = z.infer<typeof spectralEncodeSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
