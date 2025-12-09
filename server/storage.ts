import { db } from "./db";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import {
  users, sessions, auditLogs, wallets, transactions,
  versionRegistry, apiKeys, rateLimits, friendships, uploadedFiles, secureDocuments,
  lambdaMessages, calls, streams, streamViewers, streamRecordings,
  type User, type InsertUser, type Session, type InsertSession,
  type AuditLog, type InsertAuditLog, type Wallet, type InsertWallet,
  type Transaction, type InsertTransaction, type VersionRegistry,
  type InsertVersionRegistry, type ApiKey, type InsertApiKey,
  type RateLimit, type InsertRateLimit, type Friendship, type InsertFriendship,
  type UploadedFile, type InsertUploadedFile,
  type SecureDocument, type InsertSecureDocument,
  type LambdaMessage, type InsertLambdaMessage,
  type Call, type InsertCall,
  type Stream, type InsertStream,
  type StreamViewer, type InsertStreamViewer,
  type StreamRecording, type InsertStreamRecording,
  type UpdateStreamSettingsInput,
} from "@shared/schema";

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const INITIAL_NXT_BALANCE = "500000000"; // 5 NXT (8 decimals)

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(username: string, password: string, email?: string, phoneNumber?: string): Promise<User>;
  verifyPassword(user: User, password: string): Promise<boolean>;
  updateUserLastLogin(userId: string): Promise<void>;

  // Session operations
  createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  cleanExpiredSessions(): Promise<number>;

  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId?: string, limit?: number): Promise<AuditLog[]>;

  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  getWalletByAddress(address: string): Promise<Wallet | undefined>;
  createWallet(userId: string): Promise<Wallet>;
  updateWalletBalance(walletId: string, newBalance: string): Promise<Wallet>;

  // Transaction operations
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getTransactions(walletId: string, limit?: number): Promise<Transaction[]>;
  updateTransactionStatus(txId: string, status: string): Promise<Transaction>;

  // Version registry operations
  getVersions(): Promise<VersionRegistry[]>;
  getVersion(version: string): Promise<VersionRegistry | undefined>;
  createVersion(version: InsertVersionRegistry): Promise<VersionRegistry>;

  // API key operations
  createApiKey(userId: string, name: string, permissions: string[]): Promise<{ key: string; apiKey: ApiKey }>;
  getApiKeyByPrefix(prefix: string): Promise<ApiKey | undefined>;
  verifyApiKey(key: string, keyHash: string): Promise<boolean>;
  revokeApiKey(keyId: string): Promise<void>;

  // Rate limiting
  checkRateLimit(identifier: string, endpoint: string, limit: number, windowMs: number): Promise<boolean>;
  incrementRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<void>;

  // Friendship operations
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship>;
  acceptFriendRequest(friendshipId: string): Promise<Friendship>;
  rejectFriendRequest(friendshipId: string): Promise<void>;
  removeFriend(friendshipId: string): Promise<void>;
  getFriendship(id: string): Promise<Friendship | undefined>;
  getFriends(userId: string): Promise<Array<{ friendship: Friendship; friend: User }>>;
  getPendingRequests(userId: string): Promise<Array<{ friendship: Friendship; requester: User }>>;
  getSentRequests(userId: string): Promise<Array<{ friendship: Friendship; addressee: User }>>;

  // File operations
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getUploadedFiles(userId?: string, limit?: number): Promise<UploadedFile[]>;
  getUploadedFile(id: string): Promise<UploadedFile | undefined>;
  updateUploadedFileStatus(id: string, status: string, spectralData?: Partial<InsertUploadedFile>): Promise<UploadedFile>;
  deleteUploadedFile(id: string): Promise<void>;

  // Secure document operations
  createSecureDocument(doc: InsertSecureDocument): Promise<SecureDocument>;
  getSecureDocuments(userId: string, limit?: number): Promise<SecureDocument[]>;
  getSecureDocument(id: string): Promise<SecureDocument | undefined>;
  updateSecureDocumentVerification(id: string, isVerified: boolean): Promise<SecureDocument>;
  deleteSecureDocument(id: string): Promise<void>;

  // Lambda message operations
  createLambdaMessage(message: InsertLambdaMessage): Promise<LambdaMessage>;
  getLambdaMessage(id: string): Promise<LambdaMessage | undefined>;
  getInbox(userId: string, limit?: number): Promise<Array<{ message: LambdaMessage; sender: User }>>;
  getSentMessages(userId: string, limit?: number): Promise<Array<{ message: LambdaMessage; recipient: User }>>;
  markMessageAsRead(messageId: string): Promise<LambdaMessage>;
  markMessageAsDecoded(messageId: string): Promise<LambdaMessage>;
  getUnreadCount(userId: string): Promise<number>;

  // Call operations
  createCall(call: InsertCall): Promise<Call>;
  getCall(id: string): Promise<Call | undefined>;
  updateCallStatus(callId: string, status: string, startedAt?: Date, endedAt?: Date, duration?: number): Promise<Call>;
  getCallHistory(userId: string, limit?: number): Promise<Array<{ call: Call; otherUser: User }>>;

  // Stream operations
  createStream(stream: InsertStream): Promise<Stream>;
  getStream(id: string): Promise<Stream | undefined>;
  updateStreamStatus(streamId: string, status: string, startedAt?: Date, endedAt?: Date): Promise<Stream>;
  updateStreamSettings(streamId: string, settings: UpdateStreamSettingsInput): Promise<Stream>;
  updateStreamViewerCount(streamId: string, count: number): Promise<Stream>;
  getLiveStreams(limit?: number): Promise<Array<{ stream: Stream; broadcaster: User }>>;
  getUserStreams(userId: string, limit?: number): Promise<Stream[]>;
  endStream(streamId: string): Promise<Stream>;

  // Stream viewer operations
  addStreamViewer(streamId: string, viewerId: string): Promise<StreamViewer>;
  removeStreamViewer(streamId: string, viewerId: string): Promise<void>;
  getStreamViewers(streamId: string): Promise<Array<{ viewer: StreamViewer; user: User }>>;

  // Stream recording operations
  createStreamRecording(recording: InsertStreamRecording): Promise<StreamRecording>;
  getStreamRecordings(streamId: string): Promise<StreamRecording[]>;
  getUserRecordings(userId: string): Promise<StreamRecording[]>;
}

function generateWalletAddress(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let address = "NXT_";
  for (let i = 0; i < 32; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "nxt_";
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export class DatabaseStorage implements IStorage {
  // ============================================
  // USER OPERATIONS
  // ============================================

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(username: string, password: string, email?: string, phoneNumber?: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.insert(users).values({
      username,
      passwordHash,
      email,
      phoneNumber,
    }).returning();
    
    const user = result[0];
    await this.createWallet(user.id);
    
    return user;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await db.update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // ============================================
  // SESSION OPERATIONS
  // ============================================

  async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<Session> {
    const token = randomUUID() + randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    
    const result = await db.insert(sessions).values({
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    }).returning();
    
    return result[0];
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const now = new Date();
    const result = await db.select().from(sessions)
      .where(and(eq(sessions.token, token), gte(sessions.expiresAt, now)))
      .limit(1);
    return result[0];
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async cleanExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await db.delete(sessions).where(lte(sessions.expiresAt, now)).returning();
    return result.length;
  }

  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(userId?: string, limit: number = 100): Promise<AuditLog[]> {
    if (userId) {
      return db.select().from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    }
    return db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // ============================================
  // WALLET OPERATIONS
  // ============================================

  async getWallet(userId: string): Promise<Wallet | undefined> {
    const result = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    return result[0];
  }

  async getWalletByAddress(address: string): Promise<Wallet | undefined> {
    const result = await db.select().from(wallets).where(eq(wallets.address, address)).limit(1);
    return result[0];
  }

  async createWallet(userId: string): Promise<Wallet> {
    const address = generateWalletAddress();
    const result = await db.insert(wallets).values({
      userId,
      address,
      balance: INITIAL_NXT_BALANCE,
    }).returning();
    return result[0];
  }

  async updateWalletBalance(walletId: string, newBalance: string): Promise<Wallet> {
    const result = await db.update(wallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(wallets.id, walletId))
      .returning();
    return result[0];
  }

  // ============================================
  // TRANSACTION OPERATIONS
  // ============================================

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(tx).returning();
    return result[0];
  }

  async getTransactions(walletId: string, limit: number = 50): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.fromWalletId, walletId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async updateTransactionStatus(txId: string, status: string): Promise<Transaction> {
    const result = await db.update(transactions)
      .set({ 
        status, 
        confirmedAt: status === "confirmed" ? new Date() : undefined 
      })
      .where(eq(transactions.id, txId))
      .returning();
    return result[0];
  }

  // ============================================
  // VERSION REGISTRY OPERATIONS
  // ============================================

  async getVersions(): Promise<VersionRegistry[]> {
    return db.select().from(versionRegistry).orderBy(desc(versionRegistry.createdAt));
  }

  async getVersion(version: string): Promise<VersionRegistry | undefined> {
    const result = await db.select().from(versionRegistry)
      .where(eq(versionRegistry.version, version))
      .limit(1);
    return result[0];
  }

  async createVersion(versionData: InsertVersionRegistry): Promise<VersionRegistry> {
    const result = await db.insert(versionRegistry).values(versionData).returning();
    return result[0];
  }

  // ============================================
  // API KEY OPERATIONS
  // ============================================

  async createApiKey(userId: string, name: string, permissions: string[]): Promise<{ key: string; apiKey: ApiKey }> {
    const key = generateApiKey();
    const keyHash = await bcrypt.hash(key, SALT_ROUNDS);
    const keyPrefix = key.substring(0, 12);
    
    const result = await db.insert(apiKeys).values({
      userId,
      name,
      keyHash,
      keyPrefix,
      permissions,
    }).returning();
    
    return { key, apiKey: result[0] };
  }

  async getApiKeyByPrefix(prefix: string): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys)
      .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.isActive, true)))
      .limit(1);
    return result[0];
  }

  async verifyApiKey(key: string, keyHash: string): Promise<boolean> {
    return bcrypt.compare(key, keyHash);
  }

  async revokeApiKey(keyId: string): Promise<void> {
    await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, keyId));
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  async checkRateLimit(identifier: string, endpoint: string, limit: number, windowMs: number): Promise<boolean> {
    const now = new Date();
    const result = await db.select().from(rateLimits)
      .where(and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.endpoint, endpoint),
        gte(rateLimits.windowEnd, now)
      ))
      .limit(1);
    
    if (result.length === 0) {
      return true;
    }
    
    return result[0].requestCount < limit;
  }

  async incrementRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowMs);
    
    const existing = await db.select().from(rateLimits)
      .where(and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.endpoint, endpoint),
        gte(rateLimits.windowEnd, now)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(rateLimits).values({
        identifier,
        endpoint,
        requestCount: 1,
        windowEnd,
      });
    } else {
      await db.update(rateLimits)
        .set({ requestCount: existing[0].requestCount + 1 })
        .where(eq(rateLimits.id, existing[0].id));
    }
  }

  // ============================================
  // FRIENDSHIP OPERATIONS
  // ============================================

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const result = await db.select().from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);
    return result[0];
  }

  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    const wavelength = 380 + Math.random() * 400;
    const frequency = (3e8) / (wavelength * 1e-9);
    const spectralBond = (6.626e-34 * frequency).toString();

    const result = await db.insert(friendships).values({
      requesterId,
      addresseeId,
      status: "pending",
      wavelength: wavelength.toString(),
      spectralBond,
    }).returning();
    return result[0];
  }

  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    const result = await db.update(friendships)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return result[0];
  }

  async rejectFriendRequest(friendshipId: string): Promise<void> {
    await db.update(friendships)
      .set({ status: "rejected" })
      .where(eq(friendships.id, friendshipId));
  }

  async removeFriend(friendshipId: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  async getFriendship(id: string): Promise<Friendship | undefined> {
    const result = await db.select().from(friendships)
      .where(eq(friendships.id, id))
      .limit(1);
    return result[0];
  }

  async getFriends(userId: string): Promise<Array<{ friendship: Friendship; friend: User }>> {
    const asRequester = await db.select()
      .from(friendships)
      .innerJoin(users, eq(friendships.addresseeId, users.id))
      .where(and(
        eq(friendships.requesterId, userId),
        eq(friendships.status, "accepted")
      ));

    const asAddressee = await db.select()
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(and(
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "accepted")
      ));

    const friends = [
      ...asRequester.map(r => ({ friendship: r.friendships, friend: r.users })),
      ...asAddressee.map(r => ({ friendship: r.friendships, friend: r.users })),
    ];

    return friends;
  }

  async getPendingRequests(userId: string): Promise<Array<{ friendship: Friendship; requester: User }>> {
    const result = await db.select()
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(and(
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "pending")
      ));

    return result.map(r => ({ friendship: r.friendships, requester: r.users }));
  }

  async getSentRequests(userId: string): Promise<Array<{ friendship: Friendship; addressee: User }>> {
    const result = await db.select()
      .from(friendships)
      .innerJoin(users, eq(friendships.addresseeId, users.id))
      .where(and(
        eq(friendships.requesterId, userId),
        eq(friendships.status, "pending")
      ));

    return result.map(r => ({ friendship: r.friendships, addressee: r.users }));
  }

  // ============================================
  // FILE OPERATIONS
  // ============================================

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const result = await db.insert(uploadedFiles).values(file).returning();
    return result[0];
  }

  async getUploadedFiles(userId?: string, limit: number = 50): Promise<UploadedFile[]> {
    if (userId) {
      return db.select().from(uploadedFiles)
        .where(eq(uploadedFiles.userId, userId))
        .orderBy(desc(uploadedFiles.createdAt))
        .limit(limit);
    }
    return db.select().from(uploadedFiles)
      .orderBy(desc(uploadedFiles.createdAt))
      .limit(limit);
  }

  async getUploadedFile(id: string): Promise<UploadedFile | undefined> {
    const result = await db.select().from(uploadedFiles)
      .where(eq(uploadedFiles.id, id))
      .limit(1);
    return result[0];
  }

  async updateUploadedFileStatus(id: string, status: string, spectralData?: Partial<InsertUploadedFile>): Promise<UploadedFile> {
    const updateData: any = { status };
    if (spectralData) {
      Object.assign(updateData, spectralData);
    }
    const result = await db.update(uploadedFiles)
      .set(updateData)
      .where(eq(uploadedFiles.id, id))
      .returning();
    return result[0];
  }

  async deleteUploadedFile(id: string): Promise<void> {
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
  }

  // ============================================
  // SECURE DOCUMENT OPERATIONS
  // ============================================

  async createSecureDocument(doc: InsertSecureDocument): Promise<SecureDocument> {
    const result = await db.insert(secureDocuments).values(doc).returning();
    return result[0];
  }

  async getSecureDocuments(userId: string, limit: number = 50): Promise<SecureDocument[]> {
    return db.select().from(secureDocuments)
      .where(eq(secureDocuments.userId, userId))
      .orderBy(desc(secureDocuments.createdAt))
      .limit(limit);
  }

  async getSecureDocument(id: string): Promise<SecureDocument | undefined> {
    const result = await db.select().from(secureDocuments)
      .where(eq(secureDocuments.id, id))
      .limit(1);
    return result[0];
  }

  async updateSecureDocumentVerification(id: string, isVerified: boolean): Promise<SecureDocument> {
    const result = await db.update(secureDocuments)
      .set({ isVerified })
      .where(eq(secureDocuments.id, id))
      .returning();
    return result[0];
  }

  async deleteSecureDocument(id: string): Promise<void> {
    await db.delete(secureDocuments).where(eq(secureDocuments.id, id));
  }

  // ============================================
  // LAMBDA MESSAGE OPERATIONS
  // ============================================

  async createLambdaMessage(message: InsertLambdaMessage): Promise<LambdaMessage> {
    const result = await db.insert(lambdaMessages).values(message).returning();
    return result[0];
  }

  async getLambdaMessage(id: string): Promise<LambdaMessage | undefined> {
    const result = await db.select().from(lambdaMessages)
      .where(eq(lambdaMessages.id, id))
      .limit(1);
    return result[0];
  }

  async getInbox(userId: string, limit: number = 50): Promise<Array<{ message: LambdaMessage; sender: User }>> {
    const result = await db.select()
      .from(lambdaMessages)
      .innerJoin(users, eq(lambdaMessages.senderId, users.id))
      .where(eq(lambdaMessages.recipientId, userId))
      .orderBy(desc(lambdaMessages.createdAt))
      .limit(limit);

    return result.map(r => ({ message: r.lambda_messages, sender: r.users }));
  }

  async getSentMessages(userId: string, limit: number = 50): Promise<Array<{ message: LambdaMessage; recipient: User }>> {
    const result = await db.select()
      .from(lambdaMessages)
      .innerJoin(users, eq(lambdaMessages.recipientId, users.id))
      .where(eq(lambdaMessages.senderId, userId))
      .orderBy(desc(lambdaMessages.createdAt))
      .limit(limit);

    return result.map(r => ({ message: r.lambda_messages, recipient: r.users }));
  }

  async markMessageAsRead(messageId: string): Promise<LambdaMessage> {
    const result = await db.update(lambdaMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(lambdaMessages.id, messageId))
      .returning();
    return result[0];
  }

  async markMessageAsDecoded(messageId: string): Promise<LambdaMessage> {
    const result = await db.update(lambdaMessages)
      .set({ isDecoded: true })
      .where(eq(lambdaMessages.id, messageId))
      .returning();
    return result[0];
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.select()
      .from(lambdaMessages)
      .where(and(
        eq(lambdaMessages.recipientId, userId),
        eq(lambdaMessages.isRead, false)
      ));
    return result.length;
  }

  // ============================================
  // CALL OPERATIONS
  // ============================================
  
  async createCall(call: InsertCall): Promise<Call> {
    const result = await db.insert(calls).values(call).returning();
    return result[0];
  }

  async getCall(id: string): Promise<Call | undefined> {
    const result = await db.select().from(calls)
      .where(eq(calls.id, id))
      .limit(1);
    return result[0];
  }

  async updateCallStatus(callId: string, status: string, startedAt?: Date, endedAt?: Date, duration?: number): Promise<Call> {
    const updateData: Partial<Call> = { status };
    if (startedAt) updateData.startedAt = startedAt;
    if (endedAt) updateData.endedAt = endedAt;
    if (duration !== undefined) updateData.duration = duration;
    
    const result = await db.update(calls)
      .set(updateData)
      .where(eq(calls.id, callId))
      .returning();
    return result[0];
  }

  async getCallHistory(userId: string, limit: number = 50): Promise<Array<{ call: Call; otherUser: User }>> {
    const result = await db.select()
      .from(calls)
      .where(
        eq(calls.callerId, userId)
      )
      .orderBy(desc(calls.createdAt))
      .limit(limit);

    const receivedCalls = await db.select()
      .from(calls)
      .where(eq(calls.receiverId, userId))
      .orderBy(desc(calls.createdAt))
      .limit(limit);

    const allCalls = [...result, ...receivedCalls]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const callsWithUsers: Array<{ call: Call; otherUser: User }> = [];
    for (const call of allCalls) {
      const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
      const otherUser = await this.getUser(otherUserId);
      if (otherUser) {
        callsWithUsers.push({ call, otherUser });
      }
    }
    return callsWithUsers;
  }

  // ============================================
  // STREAM OPERATIONS
  // ============================================

  async createStream(stream: InsertStream): Promise<Stream> {
    const result = await db.insert(streams).values(stream).returning();
    return result[0];
  }

  async getStream(id: string): Promise<Stream | undefined> {
    const result = await db.select().from(streams)
      .where(eq(streams.id, id))
      .limit(1);
    return result[0];
  }

  async updateStreamStatus(streamId: string, status: string, startedAt?: Date, endedAt?: Date): Promise<Stream> {
    const updateData: Partial<Stream> = { status };
    if (startedAt) updateData.startedAt = startedAt;
    if (endedAt) {
      updateData.endedAt = endedAt;
      const stream = await this.getStream(streamId);
      if (stream?.startedAt) {
        updateData.duration = Math.floor((endedAt.getTime() - new Date(stream.startedAt).getTime()) / 1000);
      }
    }
    
    const result = await db.update(streams)
      .set(updateData)
      .where(eq(streams.id, streamId))
      .returning();
    return result[0];
  }

  async updateStreamSettings(streamId: string, settings: UpdateStreamSettingsInput): Promise<Stream> {
    const result = await db.update(streams)
      .set(settings)
      .where(eq(streams.id, streamId))
      .returning();
    return result[0];
  }

  async updateStreamViewerCount(streamId: string, count: number): Promise<Stream> {
    const stream = await this.getStream(streamId);
    const peakViewers = stream && count > (stream.peakViewers || 0) ? count : stream?.peakViewers || 0;
    
    const result = await db.update(streams)
      .set({ viewerCount: count, peakViewers })
      .where(eq(streams.id, streamId))
      .returning();
    return result[0];
  }

  async getLiveStreams(limit: number = 50): Promise<Array<{ stream: Stream; broadcaster: User }>> {
    const result = await db.select()
      .from(streams)
      .innerJoin(users, eq(streams.broadcasterId, users.id))
      .where(and(
        eq(streams.status, "live"),
        eq(streams.isPublic, true)
      ))
      .orderBy(desc(streams.viewerCount))
      .limit(limit);

    return result.map(r => ({ stream: r.streams, broadcaster: r.users }));
  }

  async getUserStreams(userId: string, limit: number = 50): Promise<Stream[]> {
    return db.select().from(streams)
      .where(eq(streams.broadcasterId, userId))
      .orderBy(desc(streams.createdAt))
      .limit(limit);
  }

  async endStream(streamId: string): Promise<Stream> {
    const stream = await this.getStream(streamId);
    const endedAt = new Date();
    let duration = 0;
    
    if (stream?.startedAt) {
      duration = Math.floor((endedAt.getTime() - new Date(stream.startedAt).getTime()) / 1000);
    }
    
    const result = await db.update(streams)
      .set({ status: "ended", endedAt, duration, viewerCount: 0 })
      .where(eq(streams.id, streamId))
      .returning();
    return result[0];
  }

  // ============================================
  // STREAM VIEWER OPERATIONS
  // ============================================

  async addStreamViewer(streamId: string, viewerId: string): Promise<StreamViewer> {
    const result = await db.insert(streamViewers).values({
      streamId,
      viewerId,
      joinedAt: new Date(),
    }).returning();
    
    const viewerCount = await this.getStreamViewerCount(streamId);
    await this.updateStreamViewerCount(streamId, viewerCount);
    
    return result[0];
  }

  async removeStreamViewer(streamId: string, viewerId: string): Promise<void> {
    const viewer = await db.select().from(streamViewers)
      .where(and(
        eq(streamViewers.streamId, streamId),
        eq(streamViewers.viewerId, viewerId)
      ))
      .limit(1);
    
    if (viewer[0]) {
      const joinedAt = new Date(viewer[0].joinedAt);
      const leftAt = new Date();
      const watchDuration = Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000);
      
      await db.update(streamViewers)
        .set({ leftAt, watchDuration })
        .where(eq(streamViewers.id, viewer[0].id));
    }
    
    const viewerCount = await this.getStreamViewerCount(streamId);
    await this.updateStreamViewerCount(streamId, viewerCount);
  }

  private async getStreamViewerCount(streamId: string): Promise<number> {
    const result = await db.select().from(streamViewers)
      .where(and(
        eq(streamViewers.streamId, streamId),
        isNull(streamViewers.leftAt)
      ));
    return result.length;
  }

  async getStreamViewers(streamId: string): Promise<Array<{ viewer: StreamViewer; user: User }>> {
    const result = await db.select()
      .from(streamViewers)
      .innerJoin(users, eq(streamViewers.viewerId, users.id))
      .where(and(
        eq(streamViewers.streamId, streamId),
        isNull(streamViewers.leftAt)
      ));

    return result.map(r => ({ viewer: r.stream_viewers, user: r.users }));
  }

  // ============================================
  // STREAM RECORDING OPERATIONS
  // ============================================

  async createStreamRecording(recording: InsertStreamRecording): Promise<StreamRecording> {
    const result = await db.insert(streamRecordings).values(recording).returning();
    return result[0];
  }

  async getStreamRecordings(streamId: string): Promise<StreamRecording[]> {
    return db.select().from(streamRecordings)
      .where(eq(streamRecordings.streamId, streamId))
      .orderBy(desc(streamRecordings.createdAt));
  }

  async getUserRecordings(userId: string): Promise<StreamRecording[]> {
    return db.select().from(streamRecordings)
      .where(eq(streamRecordings.userId, userId))
      .orderBy(desc(streamRecordings.createdAt));
  }
}

export const storage = new DatabaseStorage();
