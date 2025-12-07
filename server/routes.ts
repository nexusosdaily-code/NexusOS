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
      },
    });
  });

  return httpServer;
}
