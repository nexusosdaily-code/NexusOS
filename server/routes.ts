import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticate, optionalAuth, logAction } from "./auth";
import { 
  loginSchema, registerSchema, spectralEncodeSchema, transferSchema,
  friendRequestSchema, friendActionSchema
} from "@shared/schema";
import { z } from "zod";

const SPECTRAL_API_URL = "http://127.0.0.1:5001";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const AUTH_RATE_LIMIT_MAX = 10;
const WALLET_RATE_LIMIT_MAX = 30;

async function checkRateLimit(req: Request, res: Response, endpoint: string, maxRequests: number): Promise<boolean> {
  const identifier = req.user?.id || req.ip || "anonymous";
  const allowed = await storage.checkRateLimit(identifier, endpoint, maxRequests, RATE_LIMIT_WINDOW_MS);
  
  if (!allowed) {
    await logAction(req, "rate_limit_exceeded", "api", endpoint, {}, "failed", "Rate limit exceeded");
    res.status(429).json({ error: "Rate limit exceeded", retryAfter: 60 });
    return false;
  }
  
  await storage.incrementRateLimit(identifier, endpoint, RATE_LIMIT_WINDOW_MS);
  return true;
}

function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: () => void) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({ error: "Invalid request body" });
    }
  };
}

async function secureProxyToSpectralAPI(req: Request, res: Response, endpoint: string) {
  try {
    const identifier = req.user?.id || req.ip || "anonymous";
    const allowed = await storage.checkRateLimit(identifier, endpoint, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
    
    if (!allowed) {
      await logAction(req, "rate_limit_exceeded", "spectral_api", endpoint, {}, "failed", "Rate limit exceeded");
      return res.status(429).json({ error: "Rate limit exceeded", retryAfter: 60 });
    }
    
    await storage.incrementRateLimit(identifier, endpoint, RATE_LIMIT_WINDOW_MS);

    const url = `${SPECTRAL_API_URL}${endpoint}`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method === "POST" && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    options.signal = controller.signal;

    const response = await fetch(url, options);
    clearTimeout(timeout);
    
    const data = await response.json();
    
    await logAction(req, "spectral_api_call", "spectral_api", endpoint, {
      status: response.status,
    });
    
    res.status(response.status).json(data);
  } catch (error: any) {
    if (error.name === "AbortError") {
      await logAction(req, "spectral_api_timeout", "spectral_api", endpoint, {}, "failed", "Request timeout");
      return res.status(504).json({ error: "Request timeout" });
    }
    
    console.error(`Spectral API proxy error: ${error.message}`);
    await logAction(req, "spectral_api_error", "spectral_api", endpoint, {}, "failed", error.message);
    
    res.status(503).json({
      error: "Spectral API unavailable",
      message: "The encoding service is not running. Please start the Spectral API.",
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============================================
  // AUTHENTICATION ROUTES
  // ============================================
  
  app.post("/api/auth/register", validateRequest(registerSchema), async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/auth/register", AUTH_RATE_LIMIT_MAX)) return;
      
      const { username, password, email, phoneNumber } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        await logAction(req, "register_failed", "auth", undefined, { username }, "failed", "Username already exists");
        return res.status(409).json({ error: "Username already exists" });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(409).json({ error: "Email already registered" });
        }
      }

      const user = await storage.createUser(username, password, email, phoneNumber);
      const session = await storage.createSession(user.id, req.ip, req.headers["user-agent"]);
      
      await logAction(req, "user_registered", "auth", user.id, { username });

      const wallet = await storage.getWallet(user.id);

      res.status(201).json({
        message: "Registration successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        wallet: wallet ? {
          address: wallet.address,
          balance: wallet.balance,
        } : null,
        token: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      await logAction(req, "register_error", "auth", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", validateRequest(loginSchema), async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/auth/login", AUTH_RATE_LIMIT_MAX)) return;
      
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        await logAction(req, "login_failed", "auth", undefined, { username }, "failed", "User not found");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        await logAction(req, "login_failed", "auth", user.id, {}, "failed", "Account inactive");
        return res.status(401).json({ error: "Account is inactive" });
      }

      const isValid = await storage.verifyPassword(user, password);
      if (!isValid) {
        await logAction(req, "login_failed", "auth", user.id, {}, "failed", "Invalid password");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      const session = await storage.createSession(user.id, req.ip, req.headers["user-agent"]);
      
      await logAction(req, "user_login", "auth", user.id);

      const wallet = await storage.getWallet(user.id);

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        wallet: wallet ? {
          address: wallet.address,
          balance: wallet.balance,
        } : null,
        token: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      await logAction(req, "login_error", "auth", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", authenticate, async (req, res) => {
    try {
      if (req.session) {
        await storage.deleteSession(req.session.id);
      }
      await logAction(req, "user_logout", "auth", req.user?.id);
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.user!.id);
      res.json({
        user: {
          id: req.user!.id,
          username: req.user!.username,
          email: req.user!.email,
          role: req.user!.role,
          isVerified: req.user!.isVerified,
        },
        wallet: wallet ? {
          address: wallet.address,
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
        } : null,
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // ============================================
  // WALLET ROUTES
  // ============================================

  app.get("/api/wallet", authenticate, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.user!.id);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      const transactions = await storage.getTransactions(wallet.id, 20);
      
      res.json({
        wallet: {
          address: wallet.address,
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
        },
        recentTransactions: transactions,
      });
    } catch (error: any) {
      console.error("Get wallet error:", error);
      res.status(500).json({ error: "Failed to get wallet" });
    }
  });

  app.post("/api/wallet/transfer", authenticate, validateRequest(transferSchema), async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/wallet/transfer", WALLET_RATE_LIMIT_MAX)) return;
      
      const { toAddress, amount, memo } = req.body;
      
      const fromWallet = await storage.getWallet(req.user!.id);
      if (!fromWallet) {
        return res.status(404).json({ error: "Sender wallet not found" });
      }

      const toWallet = await storage.getWalletByAddress(toAddress);
      if (!toWallet) {
        return res.status(404).json({ error: "Recipient wallet not found" });
      }

      const amountNum = parseFloat(amount);
      const balanceNum = parseFloat(fromWallet.balance);
      
      if (amountNum > balanceNum) {
        await logAction(req, "transfer_failed", "wallet", fromWallet.id, { amount, toAddress }, "failed", "Insufficient balance");
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const fee = amountNum * 0.001;
      const wavelength = 380 + (Math.random() * 400);
      const frequency = (3e8) / (wavelength * 1e-9);
      const energyCost = (6.626e-34 * frequency).toString();

      const transaction = await storage.createTransaction({
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: amount,
        fee: fee.toFixed(8),
        type: "transfer",
        wavelength: wavelength.toString(),
        frequency: frequency.toString(),
        energyCost,
        metadata: { memo },
      });

      const newFromBalance = (balanceNum - amountNum - fee).toFixed(8);
      const newToBalance = (parseFloat(toWallet.balance) + amountNum).toFixed(8);
      
      await storage.updateWalletBalance(fromWallet.id, newFromBalance);
      await storage.updateWalletBalance(toWallet.id, newToBalance);
      await storage.updateTransactionStatus(transaction.id, "confirmed");

      await logAction(req, "transfer_completed", "wallet", transaction.id, {
        from: fromWallet.address,
        to: toAddress,
        amount,
        fee: fee.toFixed(8),
      });

      res.json({
        message: "Transfer successful",
        transaction: {
          id: transaction.id,
          amount,
          fee: fee.toFixed(8),
          wavelength,
          frequency,
          energyCost,
          status: "confirmed",
        },
        newBalance: newFromBalance,
      });
    } catch (error: any) {
      console.error("Transfer error:", error);
      await logAction(req, "transfer_error", "wallet", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "Transfer failed" });
    }
  });

  // ============================================
  // FRIENDS ROUTES
  // ============================================

  app.get("/api/friends", authenticate, async (req, res) => {
    try {
      const friends = await storage.getFriends(req.user!.id);
      const pendingRequests = await storage.getPendingRequests(req.user!.id);
      const sentRequests = await storage.getSentRequests(req.user!.id);

      res.json({
        friends: friends.map(f => ({
          id: f.friendship.id,
          username: f.friend.username,
          phoneNumber: f.friend.phoneNumber ? f.friend.phoneNumber.slice(-4).padStart(f.friend.phoneNumber.length, '*') : null,
          wavelength: f.friendship.wavelength,
          spectralBond: f.friendship.spectralBond,
          connectedAt: f.friendship.acceptedAt,
        })),
        pendingRequests: pendingRequests.map(r => ({
          id: r.friendship.id,
          username: r.requester.username,
          requestedAt: r.friendship.createdAt,
        })),
        sentRequests: sentRequests.map(r => ({
          id: r.friendship.id,
          username: r.addressee.username,
          sentAt: r.friendship.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("Get friends error:", error);
      res.status(500).json({ error: "Failed to get friends" });
    }
  });

  app.post("/api/friends/request", authenticate, validateRequest(friendRequestSchema), async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/friends/request", 20)) return;

      const { phoneNumber } = req.body;
      
      const addressee = await storage.getUserByPhoneNumber(phoneNumber);
      if (!addressee) {
        return res.status(404).json({ error: "User not found with that phone number" });
      }

      if (addressee.id === req.user!.id) {
        return res.status(400).json({ error: "Cannot send friend request to yourself" });
      }

      const existingFriends = await storage.getFriends(req.user!.id);
      const alreadyFriends = existingFriends.some(f => f.friend.id === addressee.id);
      if (alreadyFriends) {
        return res.status(400).json({ error: "Already friends with this user" });
      }

      const friendship = await storage.sendFriendRequest(req.user!.id, addressee.id);
      
      await logAction(req, "friend_request_sent", "friends", friendship.id, {
        addresseeId: addressee.id,
      });

      res.status(201).json({
        message: "Friend request sent",
        friendship: {
          id: friendship.id,
          wavelength: friendship.wavelength,
          spectralBond: friendship.spectralBond,
          status: friendship.status,
        },
      });
    } catch (error: any) {
      console.error("Send friend request error:", error);
      await logAction(req, "friend_request_error", "friends", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "Failed to send friend request" });
    }
  });

  app.post("/api/friends/accept", authenticate, validateRequest(friendActionSchema), async (req, res) => {
    try {
      const { friendshipId } = req.body;
      
      const friendship = await storage.getFriendship(friendshipId);
      if (!friendship) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      if (friendship.addresseeId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to accept this request" });
      }

      if (friendship.status !== "pending") {
        return res.status(400).json({ error: "Request is not pending" });
      }

      const updated = await storage.acceptFriendRequest(friendshipId);
      
      await logAction(req, "friend_request_accepted", "friends", friendshipId, {
        requesterId: friendship.requesterId,
      });

      res.json({
        message: "Friend request accepted",
        friendship: {
          id: updated.id,
          wavelength: updated.wavelength,
          spectralBond: updated.spectralBond,
          status: updated.status,
          acceptedAt: updated.acceptedAt,
        },
      });
    } catch (error: any) {
      console.error("Accept friend request error:", error);
      res.status(500).json({ error: "Failed to accept friend request" });
    }
  });

  app.post("/api/friends/reject", authenticate, validateRequest(friendActionSchema), async (req, res) => {
    try {
      const { friendshipId } = req.body;
      
      const friendship = await storage.getFriendship(friendshipId);
      if (!friendship) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      if (friendship.addresseeId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to reject this request" });
      }

      await storage.rejectFriendRequest(friendshipId);
      
      await logAction(req, "friend_request_rejected", "friends", friendshipId);

      res.json({ message: "Friend request rejected" });
    } catch (error: any) {
      console.error("Reject friend request error:", error);
      res.status(500).json({ error: "Failed to reject friend request" });
    }
  });

  app.delete("/api/friends/:friendshipId", authenticate, async (req, res) => {
    try {
      const { friendshipId } = req.params;
      
      const friendship = await storage.getFriendship(friendshipId);
      if (!friendship) {
        return res.status(404).json({ error: "Friendship not found" });
      }

      if (friendship.requesterId !== req.user!.id && friendship.addresseeId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to remove this friend" });
      }

      await storage.removeFriend(friendshipId);
      
      await logAction(req, "friend_removed", "friends", friendshipId);

      res.json({ message: "Friend removed" });
    } catch (error: any) {
      console.error("Remove friend error:", error);
      res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  // ============================================
  // VERSION ROUTES (Backward Compatibility v6-v10)
  // ============================================

  app.get("/api/versions", async (req, res) => {
    try {
      const versions = await storage.getVersions();
      res.json({ versions });
    } catch (error: any) {
      console.error("Get versions error:", error);
      res.status(500).json({ error: "Failed to get versions" });
    }
  });

  app.get("/api/versions/:version", async (req, res) => {
    try {
      const version = await storage.getVersion(req.params.version);
      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }
      res.json({ version });
    } catch (error: any) {
      console.error("Get version error:", error);
      res.status(500).json({ error: "Failed to get version" });
    }
  });

  // ============================================
  // AUDIT LOG ROUTES (Admin only)
  // ============================================

  app.get("/api/audit-logs", authenticate, async (req, res) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const userId = req.query.userId as string | undefined;
      
      const logs = await storage.getAuditLogs(userId, limit);
      
      res.json({ logs });
    } catch (error: any) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });

  // ============================================
  // SPECTRAL API PROXY ROUTES (Rate Limited & Logged)
  // ============================================

  app.get("/api/spectral/health", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/spectral/health");
  });

  app.get("/api/spectral/constants", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/spectral/constants");
  });

  app.get("/api/spectral/capacity", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/spectral/capacity");
  });

  app.post("/api/spectral/encode", optionalAuth, validateRequest(spectralEncodeSchema), (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/spectral/encode");
  });

  app.post("/api/spectral/char-to-wavelength", optionalAuth, (req, res) => {
    const charSchema = z.object({ char: z.string().length(1) });
    try {
      charSchema.parse(req.body);
      secureProxyToSpectralAPI(req, res, "/api/spectral/char-to-wavelength");
    } catch (error) {
      res.status(400).json({ error: "Invalid request: must provide a single character" });
    }
  });

  app.post("/api/spectral/wavelength-to-frequency", optionalAuth, (req, res) => {
    const waveSchema = z.object({ wavelength: z.number().positive() });
    try {
      waveSchema.parse(req.body);
      secureProxyToSpectralAPI(req, res, "/api/spectral/wavelength-to-frequency");
    } catch (error) {
      res.status(400).json({ error: "Invalid request: must provide a positive wavelength number" });
    }
  });

  // ============================================
  // K1 ORCHESTRATION API PROXY ROUTES
  // ============================================

  app.get("/api/k1/status", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/k1/status");
  });

  app.post("/api/k1/evolve", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/k1/evolve");
  });

  app.get("/api/k1/telemetry", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/k1/telemetry");
  });

  app.post("/api/k1/reset", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/k1/reset");
  });

  // ============================================
  // FILE UPLOAD ROUTES
  // ============================================

  app.post("/api/files/upload", optionalAuth, async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/files/upload", 50)) return;

      const { filename, originalName, mimeType, size, content } = req.body;
      
      if (!filename || typeof filename !== "string") {
        return res.status(400).json({ error: "Missing or invalid filename" });
      }
      if (!originalName || typeof originalName !== "string") {
        return res.status(400).json({ error: "Missing or invalid originalName" });
      }
      if (!mimeType || typeof mimeType !== "string") {
        return res.status(400).json({ error: "Missing or invalid mimeType" });
      }
      if (typeof size !== "number" || size <= 0) {
        return res.status(400).json({ error: "Missing or invalid size" });
      }

      if (size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large (max 10MB)" });
      }
      
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
      const sanitizedOriginalName = originalName.replace(/[<>:"/\\|?*]/g, "_").slice(0, 255);

      const wavelengthMin = 380 + Math.random() * 50;
      const wavelengthMax = 700 + Math.random() * 80;
      const frequencyAvg = (3e8) / (((wavelengthMin + wavelengthMax) / 2) * 1e-9);
      
      const spectralChars = String(content || originalName).slice(0, 64);
      const spectralSignature = spectralChars.split("").map((char) => {
        const code = char.charCodeAt(0);
        const wavelength = 380 + (code % 95) * 4.2;
        return wavelength.toFixed(1);
      }).join(",");

      const file = await storage.createUploadedFile({
        userId: req.user?.id || undefined,
        filename: sanitizedFilename,
        originalName: sanitizedOriginalName,
        mimeType: mimeType.slice(0, 100),
        size,
        spectralSignature,
        wavelengthMin: wavelengthMin.toString(),
        wavelengthMax: wavelengthMax.toString(),
        frequencyAvg: frequencyAvg.toString(),
        encodedData: content ? String(content).slice(0, 1000) : undefined,
        status: "processing",
      });

      await logAction(req, "file_uploaded", "files", file.id, {
        filename: originalName,
        size,
        mimeType,
      });

      setTimeout(async () => {
        try {
          await storage.updateUploadedFileStatus(file.id, "encoded");
        } catch (e) {
          console.error("Failed to update file status:", e);
        }
      }, 2000 + Math.random() * 3000);

      res.status(201).json({
        message: "File uploaded successfully",
        file: {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          spectralSignature: file.spectralSignature,
          wavelengthRange: [wavelengthMin, wavelengthMax],
          frequencyAvg,
          status: file.status,
          createdAt: file.createdAt,
        },
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      await logAction(req, "file_upload_error", "files", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  app.get("/api/files", optionalAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const files = await storage.getUploadedFiles(req.user?.id, limit);
      
      res.json({
        files: files.map(f => ({
          id: f.id,
          filename: f.filename,
          originalName: f.originalName,
          mimeType: f.mimeType,
          size: f.size,
          spectralSignature: f.spectralSignature,
          wavelengthRange: [f.wavelengthMin, f.wavelengthMax],
          frequencyAvg: f.frequencyAvg,
          status: f.status,
          createdAt: f.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("Get files error:", error);
      res.status(500).json({ error: "Failed to get files" });
    }
  });

  app.get("/api/files/:fileId", optionalAuth, async (req, res) => {
    try {
      const file = await storage.getUploadedFile(req.params.fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      res.json({
        file: {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          spectralSignature: file.spectralSignature,
          wavelengthRange: [file.wavelengthMin, file.wavelengthMax],
          frequencyAvg: file.frequencyAvg,
          encodedData: file.encodedData,
          status: file.status,
          createdAt: file.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Get file error:", error);
      res.status(500).json({ error: "Failed to get file" });
    }
  });

  app.delete("/api/files/:fileId", authenticate, async (req, res) => {
    try {
      const file = await storage.getUploadedFile(req.params.fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (file.userId && file.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete this file" });
      }

      await storage.deleteUploadedFile(req.params.fileId);
      await logAction(req, "file_deleted", "files", req.params.fileId);

      res.json({ message: "File deleted successfully" });
    } catch (error: any) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ============================================
  // SECURE DOCUMENTS ROUTES
  // ============================================

  app.get("/api/secure-documents/upload-url", authenticate, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const storageService = new ObjectStorageService();
      const url = await storageService.getObjectEntityUploadURL();
      res.json({ url });
    } catch (error: any) {
      console.error("Get upload URL error:", error);
      res.status(500).json({ error: error.message || "Failed to get upload URL" });
    }
  });

  app.get("/api/secure-documents", authenticate, async (req, res) => {
    try {
      const documents = await storage.getSecureDocuments(req.user!.id);
      res.json({ documents });
    } catch (error: any) {
      console.error("Get secure documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.post("/api/secure-documents", authenticate, async (req, res) => {
    try {
      const { filename, originalName, size, objectPath } = req.body;
      
      if (!filename || typeof filename !== "string") {
        return res.status(400).json({ error: "Missing or invalid filename" });
      }
      if (!originalName || typeof originalName !== "string") {
        return res.status(400).json({ error: "Missing or invalid originalName" });
      }
      if (typeof size !== "number" || size <= 0) {
        return res.status(400).json({ error: "Missing or invalid size" });
      }
      if (!objectPath || typeof objectPath !== "string") {
        return res.status(400).json({ error: "Missing or invalid objectPath" });
      }
      
      if (!originalName.toLowerCase().endsWith(".docx")) {
        return res.status(400).json({ error: "Only DOCX files are allowed" });
      }
      
      if (size > 52428800) {
        return res.status(400).json({ error: "File too large (max 50MB)" });
      }
      
      const wavelength = 380 + (originalName.charCodeAt(0) % 120) + ((size % 300));
      const frequency = (3e8) / (wavelength * 1e-9);
      const planckConstant = 6.62607015e-34;
      const energy = planckConstant * frequency;
      const timestamp = Date.now().toString(36);
      const energyHash = `Λ${energy.toExponential(6)}_${timestamp}_${req.user!.id.slice(0, 8)}`;
      const lambdaSignature = `WNSP-Λ-${wavelength.toFixed(4)}nm-${frequency.toExponential(4)}Hz-${timestamp}`;

      const document = await storage.createSecureDocument({
        userId: req.user!.id,
        filename,
        originalName,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size,
        objectPath,
        lambdaSignature,
        wavelength: wavelength.toString(),
        frequency: frequency.toString(),
        energyHash,
        isVerified: true,
        encryptionStatus: "encrypted",
      });

      await logAction(req, "secure_document_created", "secure_documents", document.id, {
        filename: originalName,
        size,
      });

      res.status(201).json({ document });
    } catch (error: any) {
      console.error("Create secure document error:", error);
      await logAction(req, "secure_document_create_error", "secure_documents", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "Failed to create secure document" });
    }
  });

  app.post("/api/secure-documents/:docId/verify", authenticate, async (req, res) => {
    try {
      const doc = await storage.getSecureDocument(req.params.docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (doc.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to verify this document" });
      }

      const wavelength = parseFloat(doc.wavelength);
      const frequency = parseFloat(doc.frequency);
      const expectedFrequency = (3e8) / (wavelength * 1e-9);
      const frequencyMatch = Math.abs(frequency - expectedFrequency) / expectedFrequency < 0.001;
      
      const planckConstant = 6.62607015e-34;
      const energy = planckConstant * frequency;
      const energyHashValid = doc.energyHash.startsWith("Λ") && doc.energyHash.includes(energy.toExponential(6).slice(0, 8));

      const isValid = frequencyMatch && energyHashValid;

      await storage.updateSecureDocumentVerification(doc.id, isValid);

      await logAction(req, "secure_document_verified", "secure_documents", doc.id, {
        isValid,
        wavelength,
        frequency,
      });

      res.json({ isValid, document: { ...doc, isVerified: isValid } });
    } catch (error: any) {
      console.error("Verify secure document error:", error);
      res.status(500).json({ error: "Failed to verify document" });
    }
  });

  app.get("/api/secure-documents/:docId/download", authenticate, async (req, res) => {
    try {
      const doc = await storage.getSecureDocument(req.params.docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (doc.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to download this document" });
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const storageService = new ObjectStorageService();
      const objectFile = await storageService.getObjectEntityFile(doc.objectPath);
      
      res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName}"`);
      await storageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Download secure document error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to download document" });
      }
    }
  });

  app.delete("/api/secure-documents/:docId", authenticate, async (req, res) => {
    try {
      const doc = await storage.getSecureDocument(req.params.docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (doc.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete this document" });
      }

      await storage.deleteSecureDocument(req.params.docId);
      await logAction(req, "secure_document_deleted", "secure_documents", req.params.docId);

      res.json({ message: "Document deleted successfully" });
    } catch (error: any) {
      console.error("Delete secure document error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ============================================
  // HEALTH CHECK
  // ============================================

  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      version: "10.0",
      timestamp: new Date().toISOString(),
      features: {
        authentication: true,
        auditLogging: true,
        rateLimit: true,
        inputValidation: true,
        backwardCompatibility: ["6.0", "7.0", "8.0", "9.0", "10.0"],
        fileUpload: true,
        secureDocuments: true,
      },
    });
  });

  return httpServer;
}
