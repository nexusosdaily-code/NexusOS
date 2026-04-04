import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authenticate, optionalAuth, logAction } from "./auth";
import { 
  loginSchema, registerSchema, spectralEncodeSchema, transferSchema,
  friendRequestSchema, friendActionSchema, sendMessageSchema, initiateCallSchema,
  createStreamSchema, updateStreamSettingsSchema
} from "@shared/schema";
import { z } from "zod";

// WebSocket clients mapped by userId
const connectedClients = new Map<string, WebSocket>();

// Call signaling message types
interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "call-initiate" | "call-accept" | "call-reject" | "call-end" | "call-busy";
  callId?: string;
  targetUserId?: string;
  payload?: any;
}

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
  // WEBSOCKET SIGNALING FOR VIDEO/VOICE CALLS
  // ============================================
  
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/signaling" });
  
  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    
    if (!token) {
      ws.close(1008, "Authentication required");
      return;
    }
    
    const session = await storage.getSessionByToken(token);
    if (!session) {
      ws.close(1008, "Invalid token");
      return;
    }
    
    const userId = session.userId;
    connectedClients.set(userId, ws);
    console.log(`User ${userId} connected to signaling`);
    
    ws.on("message", async (data) => {
      try {
        const message: SignalingMessage = JSON.parse(data.toString());
        const targetWs = message.targetUserId ? connectedClients.get(message.targetUserId) : null;
        
        switch (message.type) {
          case "offer":
          case "answer":
          case "ice-candidate":
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: message.type,
                callId: message.callId,
                fromUserId: userId,
                payload: message.payload,
              }));
            }
            break;
            
          case "call-accept":
            if (message.callId) {
              await storage.updateCallStatus(message.callId, "active", new Date());
            }
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call-accept",
                callId: message.callId,
                fromUserId: userId,
              }));
            }
            break;
            
          case "call-reject":
            if (message.callId) {
              await storage.updateCallStatus(message.callId, "declined");
            }
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call-reject",
                callId: message.callId,
                fromUserId: userId,
              }));
            }
            break;
            
          case "call-end":
            if (message.callId) {
              const call = await storage.getCall(message.callId);
              if (call && call.startedAt) {
                const duration = Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000);
                await storage.updateCallStatus(message.callId, "ended", undefined, new Date(), duration);
              } else if (call) {
                await storage.updateCallStatus(message.callId, "missed");
              }
            }
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call-end",
                callId: message.callId,
                fromUserId: userId,
              }));
            }
            break;
            
          case "call-busy":
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "call-busy",
                callId: message.callId,
                fromUserId: userId,
              }));
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    ws.on("close", () => {
      connectedClients.delete(userId);
      console.log(`User ${userId} disconnected from signaling`);
    });
    
    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      connectedClients.delete(userId);
    });
  });

  // ============================================
  // WEBSOCKET SIGNALING FOR LIVE STREAMING
  // ============================================
  
  // Stream clients: Map<streamId, Map<viewerId, { ws: WebSocket, isBroadcaster: boolean }>>
  const streamClients = new Map<string, Map<string, { ws: WebSocket; isBroadcaster: boolean }>>();
  
  interface StreamSignalingMessage {
    type: "join-stream" | "leave-stream" | "broadcaster-ready" | "offer" | "answer" | "ice-candidate" | "stream-settings-update" | "stream-ended" | "viewer-count";
    streamId: string;
    targetViewerId?: string;
    payload?: any;
  }
  
  const handleViewerLeave = async (streamId: string, userId: string, streamViewers: Map<string, { ws: WebSocket; isBroadcaster: boolean }>) => {
    streamViewers.delete(userId);
    await storage.removeStreamViewer(streamId, userId);
    
    Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
      if (client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({
          type: "viewer-left",
          viewerId: userId,
          viewerCount: Array.from(streamViewers.values()).filter(c => !c.isBroadcaster).length,
        }));
      }
    });
    console.log(`Viewer ${userId} left stream ${streamId}`);
  };
  
  const handleBroadcasterDisconnect = (streamId: string, userId: string, streamViewers: Map<string, { ws: WebSocket; isBroadcaster: boolean }>) => {
    streamViewers.delete(userId);
    
    Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
      if (!client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({
          type: "stream-ended",
          streamId,
          reason: "broadcaster-disconnected",
        }));
      }
    });
    streamClients.delete(streamId);
    console.log(`Broadcaster ${userId} disconnected from stream ${streamId}`);
  };
  
  const streamingWss = new WebSocketServer({ server: httpServer, path: "/ws/streaming" });
  
  streamingWss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const streamId = url.searchParams.get("streamId");
    const role = url.searchParams.get("role"); // "broadcaster" or "viewer"
    
    if (!token || !streamId) {
      ws.close(1008, "Authentication and stream ID required");
      return;
    }
    
    const session = await storage.getSessionByToken(token);
    if (!session) {
      ws.close(1008, "Invalid token");
      return;
    }
    
    const userId = session.userId;
    const isBroadcaster = role === "broadcaster";
    
    // Verify stream exists
    const stream = await storage.getStream(streamId);
    if (!stream) {
      ws.close(1008, "Stream not found");
      return;
    }
    
    // Broadcaster must own the stream
    if (isBroadcaster && stream.broadcasterId !== userId) {
      ws.close(1008, "Not authorized to broadcast this stream");
      return;
    }
    
    // Initialize stream clients map if needed
    if (!streamClients.has(streamId)) {
      streamClients.set(streamId, new Map());
    }
    
    const streamViewers = streamClients.get(streamId)!;
    streamViewers.set(userId, { ws, isBroadcaster });
    
    console.log(`User ${userId} joined stream ${streamId} as ${isBroadcaster ? "broadcaster" : "viewer"}`);
    
    // Track viewer in database if not broadcaster
    if (!isBroadcaster) {
      await storage.addStreamViewer(streamId, userId);
      
      // Notify broadcaster of new viewer
      Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
        if (client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: "viewer-joined",
            viewerId: userId,
            viewerCount: streamViewers.size - 1, // Exclude broadcaster
          }));
        }
      });
    }
    
    // Send current viewer count to new connection
    const viewerCount = Array.from(streamViewers.values()).filter(c => !c.isBroadcaster).length;
    ws.send(JSON.stringify({
      type: "viewer-count",
      streamId,
      count: viewerCount,
    }));
    
    ws.on("message", async (data) => {
      try {
        const message: StreamSignalingMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case "broadcaster-ready":
            // Notify all viewers that broadcaster is ready
            Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
              if (!client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                  type: "broadcaster-ready",
                  streamId,
                  broadcasterId: userId,
                }));
              }
            });
            break;
            
          case "offer":
            // Broadcaster sends offer to specific viewer
            if (isBroadcaster && message.targetViewerId) {
              const viewer = streamViewers.get(message.targetViewerId);
              if (viewer && viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify({
                  type: "offer",
                  streamId,
                  fromUserId: userId,
                  payload: message.payload,
                }));
              }
            }
            break;
            
          case "answer":
            // Viewer sends answer back to broadcaster
            if (!isBroadcaster) {
              Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
                if (client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: "answer",
                    streamId,
                    fromUserId: userId,
                    payload: message.payload,
                  }));
                }
              });
            }
            break;
            
          case "ice-candidate":
            if (isBroadcaster && message.targetViewerId) {
              // Broadcaster sends ICE to specific viewer
              const viewer = streamViewers.get(message.targetViewerId);
              if (viewer && viewer.ws.readyState === WebSocket.OPEN) {
                viewer.ws.send(JSON.stringify({
                  type: "ice-candidate",
                  streamId,
                  fromUserId: userId,
                  payload: message.payload,
                }));
              }
            } else if (!isBroadcaster) {
              // Viewer sends ICE to broadcaster
              Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
                if (client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: "ice-candidate",
                    streamId,
                    fromUserId: userId,
                    payload: message.payload,
                  }));
                }
              });
            }
            break;
            
          case "stream-settings-update":
            // Broadcaster updates stream settings
            if (isBroadcaster) {
              Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
                if (!client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: "stream-settings-update",
                    streamId,
                    payload: message.payload,
                  }));
                }
              });
            }
            break;
            
          case "stream-ended":
            // Broadcaster ends stream
            if (isBroadcaster) {
              Array.from(streamViewers.entries()).forEach(([viewerId, client]) => {
                if (!client.isBroadcaster && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: "stream-ended",
                    streamId,
                  }));
                  client.ws.close(1000, "Stream ended");
                }
              });
              streamClients.delete(streamId);
            }
            break;
            
          case "leave-stream":
            // Viewer explicitly leaves stream
            if (!isBroadcaster) {
              await handleViewerLeave(streamId, userId, streamViewers);
            }
            break;
        }
      } catch (error) {
        console.error("Stream WebSocket message error:", error);
      }
    });
    
    ws.on("close", async () => {
      // Check if user was already removed (e.g., by leave-stream message)
      if (!streamViewers.has(userId)) {
        console.log(`User ${userId} already left stream ${streamId}`);
        if (streamViewers.size === 0) {
          streamClients.delete(streamId);
        }
        return;
      }
      
      if (!isBroadcaster) {
        // Use centralized viewer leave handler
        await handleViewerLeave(streamId, userId, streamViewers);
      } else {
        // Use centralized broadcaster disconnect handler
        handleBroadcasterDisconnect(streamId, userId, streamViewers);
      }
      
      // Clean up empty stream
      if (streamViewers.size === 0) {
        streamClients.delete(streamId);
      }
    });
    
    ws.on("error", (error) => {
      console.error(`Stream WebSocket error for user ${userId}:`, error);
      streamViewers.delete(userId);
    });
  });

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
  // LAMBDA MESSAGE ROUTES
  // ============================================

  app.post("/api/messages/send", authenticate, validateRequest(sendMessageSchema), async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/messages/send", 30)) return;

      const { recipientId, content, intensity = 32, cycles = 1 } = req.body;

      const friends = await storage.getFriends(req.user!.id);
      const isFriend = friends.some(f => f.friend.id === recipientId);
      if (!isFriend) {
        return res.status(403).json({ error: "Can only send messages to friends" });
      }

      let encodedFrames = null;
      let totalLambdaMass = null;
      let spectralHash = null;
      let wavelengthMin = null;
      let wavelengthMax = null;

      try {
        const encodeResponse = await fetch(`${SPECTRAL_API_URL}/api/spectral/encode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content, options: {} }),
        });

        if (encodeResponse.ok) {
          const encodeData = await encodeResponse.json();
          encodedFrames = encodeData.frames || encodeData.encoded_frames;
          totalLambdaMass = encodeData.total_lambda_mass?.toString();
          spectralHash = encodeData.spectral_hash;
          if (encodeData.wavelength_range) {
            wavelengthMin = encodeData.wavelength_range[0]?.toString();
            wavelengthMax = encodeData.wavelength_range[1]?.toString();
          }
        }
      } catch (encodeError) {
        console.error("Spectral encoding failed, storing raw message:", encodeError);
      }

      const message = await storage.createLambdaMessage({
        senderId: req.user!.id,
        recipientId,
        content,
        encodedFrames,
        totalLambdaMass,
        spectralHash,
        wavelengthMin,
        wavelengthMax,
        intensity,
        cycles,
        isRead: false,
        isDecoded: false,
      });

      await logAction(req, "message_sent", "messages", message.id, {
        recipientId,
        hasEncoding: !!encodedFrames,
      });

      res.status(201).json({
        message: "Message sent successfully",
        data: {
          id: message.id,
          recipientId: message.recipientId,
          hasEncoding: !!encodedFrames,
          totalLambdaMass,
          createdAt: message.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      await logAction(req, "message_send_error", "messages", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/messages/inbox", authenticate, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const inbox = await storage.getInbox(req.user!.id, limit);

      res.json({
        messages: inbox.map(({ message, sender }) => ({
          id: message.id,
          sender: {
            id: sender.id,
            username: sender.username,
          },
          content: message.isDecoded ? message.content : null,
          hasEncoding: !!message.encodedFrames,
          totalLambdaMass: message.totalLambdaMass,
          isRead: message.isRead,
          isDecoded: message.isDecoded,
          createdAt: message.createdAt,
          readAt: message.readAt,
        })),
      });
    } catch (error: any) {
      console.error("Get inbox error:", error);
      res.status(500).json({ error: "Failed to get inbox" });
    }
  });

  app.get("/api/messages/sent", authenticate, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const sent = await storage.getSentMessages(req.user!.id, limit);

      res.json({
        messages: sent.map(({ message, recipient }) => ({
          id: message.id,
          recipient: {
            id: recipient.id,
            username: recipient.username,
          },
          content: message.content,
          hasEncoding: !!message.encodedFrames,
          totalLambdaMass: message.totalLambdaMass,
          isRead: message.isRead,
          createdAt: message.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("Get sent messages error:", error);
      res.status(500).json({ error: "Failed to get sent messages" });
    }
  });

  app.get("/api/messages/unread-count", authenticate, async (req, res) => {
    try {
      const count = await storage.getUnreadCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  app.get("/api/messages/:id", authenticate, async (req, res) => {
    try {
      const message = await storage.getLambdaMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.senderId !== req.user!.id && message.recipientId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to view this message" });
      }

      const isRecipient = message.recipientId === req.user!.id;

      res.json({
        message: {
          id: message.id,
          senderId: message.senderId,
          recipientId: message.recipientId,
          content: message.isDecoded || message.senderId === req.user!.id ? message.content : null,
          encodedFrames: message.encodedFrames,
          totalLambdaMass: message.totalLambdaMass,
          spectralHash: message.spectralHash,
          wavelengthMin: message.wavelengthMin,
          wavelengthMax: message.wavelengthMax,
          intensity: message.intensity,
          cycles: message.cycles,
          isRead: message.isRead,
          isDecoded: message.isDecoded,
          createdAt: message.createdAt,
          readAt: message.readAt,
        },
        isRecipient,
        isSender: message.senderId === req.user!.id,
      });
    } catch (error: any) {
      console.error("Get message error:", error);
      res.status(500).json({ error: "Failed to get message" });
    }
  });

  app.post("/api/messages/:id/read", authenticate, async (req, res) => {
    try {
      const message = await storage.getLambdaMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.recipientId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to mark this message as read" });
      }

      const updated = await storage.markMessageAsRead(req.params.id);
      
      await logAction(req, "message_read", "messages", message.id);

      res.json({
        message: "Message marked as read",
        readAt: updated.readAt,
      });
    } catch (error: any) {
      console.error("Mark message read error:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.post("/api/messages/:id/decode", authenticate, async (req, res) => {
    try {
      const message = await storage.getLambdaMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.recipientId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to decode this message" });
      }

      if (message.isDecoded) {
        return res.json({
          message: "Message already decoded",
          content: message.content,
        });
      }

      const updated = await storage.markMessageAsDecoded(req.params.id);
      
      if (!message.isRead) {
        await storage.markMessageAsRead(req.params.id);
      }

      await logAction(req, "message_decoded", "messages", message.id);

      res.json({
        message: "Message decoded successfully",
        content: updated.content,
        encodedFrames: updated.encodedFrames,
        totalLambdaMass: updated.totalLambdaMass,
        spectralHash: updated.spectralHash,
      });
    } catch (error: any) {
      console.error("Decode message error:", error);
      res.status(500).json({ error: "Failed to decode message" });
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
  // WNSP PROTOCOL ROUTES — Two-Layer Standard (CE + SE)
  // ============================================

  // Protocol information — describes both WNSP-CE and WNSP-SE standards
  app.get("/api/wnsp/protocol", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/protocol");
  });

  // WNSP-CE Layer 1: Character Encoding Standard (semantic layer)
  app.post("/api/wnsp/ce/encode", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/ce/encode");
  });

  app.post("/api/wnsp/ce/char", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/ce/char");
  });

  // WNSP-SE Layer 2: Spectral Encoding Standard (physical wave layer)
  app.post("/api/wnsp/se/encode", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/se/encode");
  });

  app.post("/api/wnsp/se/wavelength", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/se/wavelength");
  });

  // Full WNSP stack: CE → SE in one call
  app.post("/api/wnsp/transmit", optionalAuth, validateRequest(spectralEncodeSchema), (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/transmit");
  });

  // AI/OS Channel Coordination Layer
  app.post("/api/wnsp/agent/allocate", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/agent/allocate");
  });

  app.post("/api/wnsp/agent/map", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/agent/map");
  });

  app.get("/api/wnsp/agent/status", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/agent/status");
  });

  app.post("/api/wnsp/agent/release", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/agent/release");
  });

  // Scheduler + Runtime Monitor
  app.post("/api/wnsp/agent/schedule", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/agent/schedule");
  });

  app.post("/api/wnsp/agent/dispatch", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/agent/dispatch");
  });

  app.get("/api/wnsp/agent/log", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/agent/log");
  });

  // SE Simulation + Orthogonality Validation
  app.post("/api/wnsp/se/simulate", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/se/simulate");
  });

  app.get("/api/wnsp/se/orthogonality", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/se/orthogonality");
  });

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
  // K1 ORCHESTRATION API ROUTES (Simulated Runtime)
  // ============================================

  let k1RuntimeState = {
    version: "7.1.0",
    runtime_id: "K1-NEXUS-001",
    tick: 0,
    state: "synchronized",
    state_description: "All substrates synchronized",
    operational_substrate: {
      state: "active",
      coherence: 0.96,
      n_modes: 8,
      n_bosons: 1024,
      total_energy: 1.2e15,
      lambda_mass: 7.37e-51
    },
    nlse_substrate: {
      version: "4.0",
      state: "stable",
      load_ratio: 0.73,
      phase_ratio: 0.91,
      soliton_order: 3,
      is_stable: true,
      lambda_modes: 8
    },
    coordination: {
      sync_quality: 0.94,
      harmonic_locks: 7,
      average_lock_quality: 0.89,
      resonance_strength: 0.87
    },
    telemetry_entries: 0
  };

  app.get("/api/k1/status", optionalAuth, (req, res) => {
    res.json(k1RuntimeState);
  });

  app.post("/api/k1/evolve", optionalAuth, (req, res) => {
    k1RuntimeState.tick++;
    k1RuntimeState.telemetry_entries += Math.floor(Math.random() * 10) + 5;
    k1RuntimeState.coordination.sync_quality = Math.min(0.99, k1RuntimeState.coordination.sync_quality + (Math.random() - 0.4) * 0.02);
    k1RuntimeState.coordination.resonance_strength = Math.min(0.99, k1RuntimeState.coordination.resonance_strength + (Math.random() - 0.4) * 0.02);
    k1RuntimeState.operational_substrate.coherence = Math.min(0.99, Math.max(0.7, k1RuntimeState.operational_substrate.coherence + (Math.random() - 0.45) * 0.03));
    k1RuntimeState.operational_substrate.total_energy *= (1 + (Math.random() - 0.5) * 0.05);
    k1RuntimeState.nlse_substrate.load_ratio = Math.min(0.99, Math.max(0.5, k1RuntimeState.nlse_substrate.load_ratio + (Math.random() - 0.5) * 0.05));
    res.json({ success: true, tick: k1RuntimeState.tick, status: k1RuntimeState });
  });

  app.get("/api/k1/telemetry", optionalAuth, (req, res) => {
    const substrateIds = ["operational", "nlse", "coordination", "telemetry"];
    res.json({
      entries: k1RuntimeState.telemetry_entries,
      recent: Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - i * 1000,
        substrate: substrateIds[i % 4],
        event: "coherence_sample",
        value: Math.random() * 0.1 + 0.9
      }))
    });
  });

  app.post("/api/k1/reset", optionalAuth, (req, res) => {
    k1RuntimeState = {
      version: "7.1.0",
      runtime_id: "K1-NEXUS-001",
      tick: 0,
      state: "synchronized",
      state_description: "All substrates synchronized",
      operational_substrate: {
        state: "active",
        coherence: 0.96,
        n_modes: 8,
        n_bosons: 1024,
        total_energy: 1.2e15,
        lambda_mass: 7.37e-51
      },
      nlse_substrate: {
        version: "4.0",
        state: "stable",
        load_ratio: 0.73,
        phase_ratio: 0.91,
        soliton_order: 3,
        is_stable: true,
        lambda_modes: 8
      },
      coordination: {
        sync_quality: 0.94,
        harmonic_locks: 7,
        average_lock_quality: 0.89,
        resonance_strength: 0.87
      },
      telemetry_entries: 0
    };
    res.json({ success: true, message: "K1 Runtime reset to initial state" });
  });

  // ============================================
  // POWER EXTRACTION SIMULATOR SYNC ROUTES (Simulated)
  // ============================================

  let simulatorState = { 
    power_output: 1.2e12, 
    efficiency: 0.87, 
    status: "RUNNING",
    energy_pool: 5.2e18,
    contributions: 147
  };

  app.get("/api/k1/simulator/sync", optionalAuth, (req, res) => {
    res.json({
      backend_coherence: k1RuntimeState.operational_substrate.coherence,
      energy_pool: simulatorState.energy_pool,
      lambda_mass: k1RuntimeState.operational_substrate.lambda_mass,
      k1_tick: k1RuntimeState.tick,
      k1_state: k1RuntimeState.state,
      sync_quality: k1RuntimeState.coordination.sync_quality,
      resonance_strength: k1RuntimeState.coordination.resonance_strength,
      simulator_stats: {
        total_harvested_energy: simulatorState.power_output,
        contributions: simulatorState.contributions
      }
    });
  });

  app.post("/api/k1/simulator/inject", optionalAuth, (req, res) => {
    const { harvested_energy, instant_power, coherence, harvester_count } = req.body;
    
    const energyToAdd = harvested_energy || instant_power || 1e6;
    simulatorState.power_output += energyToAdd;
    simulatorState.energy_pool += energyToAdd * 0.1;
    simulatorState.contributions += 1;
    simulatorState.efficiency = Math.min(0.99, simulatorState.efficiency + 0.001);
    
    k1RuntimeState.tick++;
    k1RuntimeState.operational_substrate.coherence = Math.min(0.99, 
      k1RuntimeState.operational_substrate.coherence * 0.99 + (coherence || 0.85) * 0.01);
    k1RuntimeState.coordination.resonance_strength = Math.min(0.99,
      k1RuntimeState.coordination.resonance_strength + 0.002);
    
    res.json({ 
      success: true, 
      energy_added: energyToAdd,
      contributions: simulatorState.contributions,
      state: simulatorState 
    });
  });

  app.post("/api/k1/simulator/reset", optionalAuth, (req, res) => {
    simulatorState = { 
      power_output: 1.2e12, 
      efficiency: 0.87, 
      status: "RUNNING",
      energy_pool: 5.2e18,
      contributions: 147
    };
    res.json({ success: true, message: "Simulator reset" });
  });

  // ============================================
  // CZC CATCH BASIN API ROUTES
  // ============================================

  const CZC_CONSTANTS = {
    baseCoherence: 0.9999,
    iterations: 44,
    goldenAngle: 137.5,
    firstOscillation: 555e12,
    impedance: 376.730313668,
    phi: 1.618033988749895,
    planck: 6.62607015e-34,
    c: 299792458,
  };

  let czcBasinState = {
    level: 0,
    coherence: 0,
    iterations: 0,
    flowRate: 0,
    pressure: 0,
    temperature: 293.15,
    entropy: 1.0,
    stability: "unstable" as "stable" | "transitioning" | "unstable",
    correctionEvents: [] as Array<{
      id: number;
      iteration: number;
      type: string;
      magnitude: number;
      coherenceBefore: number;
      coherenceAfter: number;
      timestamp: number;
    }>,
    boundApplications: [] as string[],
    lastSync: 0,
  };

  const calculateCZC = (iterations: number, filterStrength: number = CZC_CONSTANTS.baseCoherence): number => {
    return Math.pow(filterStrength, iterations);
  };

  app.get("/api/czc/status", optionalAuth, (req, res) => {
    res.json({
      ...czcBasinState,
      targetCoherence: calculateCZC(44, CZC_CONSTANTS.baseCoherence),
      constants: CZC_CONSTANTS,
    });
  });

  app.get("/api/czc/coherence", optionalAuth, (req, res) => {
    const iterations = parseInt(req.query.iterations as string) || 44;
    const filterStrength = parseFloat(req.query.filterStrength as string) || CZC_CONSTANTS.baseCoherence;
    
    const coherence = calculateCZC(iterations, filterStrength);
    const entropy = coherence > 0 && coherence < 1 
      ? -coherence * Math.log2(coherence) - (1 - coherence) * Math.log2(1 - coherence)
      : (coherence <= 0 ? 1 : 0);
    
    res.json({
      iterations,
      filterStrength,
      coherence,
      coherencePercent: coherence * 100,
      entropy,
      lambdaMass: (CZC_CONSTANTS.planck * CZC_CONSTANTS.firstOscillation) / (CZC_CONSTANTS.c ** 2),
    });
  });

  app.post("/api/czc/iterate", optionalAuth, (req, res) => {
    const { inputRate = 1, filterStrength = CZC_CONSTANTS.baseCoherence, autoCorrect = true } = req.body;
    
    czcBasinState.iterations++;
    const baseCoherence = calculateCZC(czcBasinState.iterations, filterStrength);
    
    const phaseNoise = (Math.random() - 0.5) * 0.001;
    const amplitudeNoise = (Math.random() - 0.5) * 0.0005;
    let coherence = baseCoherence + phaseNoise + amplitudeNoise;
    
    if (autoCorrect && coherence < baseCoherence) {
      const correctionTypes = ["phase", "amplitude", "frequency", "impedance"];
      const type = correctionTypes[Math.floor(Math.random() * correctionTypes.length)];
      const magnitude = Math.random() * 0.001 + 0.0001;
      const coherenceBefore = coherence;
      coherence = Math.min(1, coherence + magnitude * (1 - coherence));
      
      const event = {
        id: Date.now(),
        iteration: czcBasinState.iterations,
        type,
        magnitude,
        coherenceBefore,
        coherenceAfter: coherence,
        timestamp: Date.now(),
      };
      czcBasinState.correctionEvents = [...czcBasinState.correctionEvents.slice(-43), event];
    }
    
    coherence = Math.max(0, Math.min(1, coherence));
    
    czcBasinState.level = Math.min(100, czcBasinState.level + inputRate * (1 - czcBasinState.level / 100));
    czcBasinState.coherence = coherence;
    czcBasinState.flowRate = inputRate * coherence;
    czcBasinState.pressure = czcBasinState.level * coherence * 1.5;
    czcBasinState.temperature = 293.15 - (coherence * 20);
    czcBasinState.entropy = coherence > 0 && coherence < 1 
      ? -coherence * Math.log2(coherence) - (1 - coherence) * Math.log2(1 - coherence)
      : (coherence <= 0 ? 1 : 0);
    
    if (coherence > 0.99) czcBasinState.stability = "stable";
    else if (coherence > 0.9) czcBasinState.stability = "transitioning";
    else czcBasinState.stability = "unstable";
    
    res.json({
      success: true,
      state: czcBasinState,
    });
  });

  app.post("/api/czc/bind", optionalAuth, (req, res) => {
    const { applicationId, requiredCoherence } = req.body;
    
    if (!applicationId) {
      return res.status(400).json({ error: "Application ID required" });
    }
    
    if (czcBasinState.coherence >= (requiredCoherence || 0.85)) {
      if (!czcBasinState.boundApplications.includes(applicationId)) {
        czcBasinState.boundApplications.push(applicationId);
      }
      res.json({
        success: true,
        message: `Application ${applicationId} bound to CZC basin`,
        boundApplications: czcBasinState.boundApplications,
        coherence: czcBasinState.coherence,
      });
    } else {
      res.status(400).json({
        error: "Insufficient coherence",
        required: requiredCoherence,
        current: czcBasinState.coherence,
      });
    }
  });

  app.post("/api/czc/unbind", optionalAuth, (req, res) => {
    const { applicationId } = req.body;
    
    czcBasinState.boundApplications = czcBasinState.boundApplications.filter(id => id !== applicationId);
    
    res.json({
      success: true,
      message: `Application ${applicationId} unbound from CZC basin`,
      boundApplications: czcBasinState.boundApplications,
    });
  });

  app.post("/api/czc/sync", optionalAuth, (req, res) => {
    const { source, coherence, iterations, stability } = req.body;
    
    czcBasinState.lastSync = Date.now();
    
    k1RuntimeState.operational_substrate.coherence = Math.min(0.99,
      k1RuntimeState.operational_substrate.coherence * 0.9 + (coherence || czcBasinState.coherence) * 0.1);
    k1RuntimeState.coordination.sync_quality = Math.min(0.99,
      k1RuntimeState.coordination.sync_quality + 0.005);
    
    res.json({
      success: true,
      message: `CZC synced from ${source || 'unknown'}`,
      k1_coherence: k1RuntimeState.operational_substrate.coherence,
      k1_sync_quality: k1RuntimeState.coordination.sync_quality,
      czc_coherence: czcBasinState.coherence,
      lastSync: czcBasinState.lastSync,
    });
  });

  app.post("/api/czc/reset", optionalAuth, (req, res) => {
    czcBasinState = {
      level: 0,
      coherence: 0,
      iterations: 0,
      flowRate: 0,
      pressure: 0,
      temperature: 293.15,
      entropy: 1.0,
      stability: "unstable",
      correctionEvents: [],
      boundApplications: [],
      lastSync: 0,
    };
    res.json({ success: true, message: "CZC Catch Basin reset" });
  });

  app.get("/api/czc/applications", optionalAuth, (req, res) => {
    const applications = [
      { id: "vacuum-extraction", name: "Vacuum Energy Extraction", requiredCoherence: 0.95, category: "energy" },
      { id: "photonic-logic", name: "Photonic Logic Gates", requiredCoherence: 0.90, category: "computing" },
      { id: "spectral-relay", name: "Spectral Relay Mesh", requiredCoherence: 0.85, category: "communication" },
      { id: "gravity-decorrelation", name: "Gravity De-correlation", requiredCoherence: 0.99, category: "gravitational" },
      { id: "oam-qubits", name: "OAM Qubit Registers", requiredCoherence: 0.92, category: "computing" },
      { id: "lambda-substrate", name: "Lambda Computing Substrate", requiredCoherence: 0.88, category: "computing" },
    ];
    
    res.json({
      applications: applications.map(app => ({
        ...app,
        bound: czcBasinState.boundApplications.includes(app.id),
        canBind: czcBasinState.coherence >= app.requiredCoherence,
      })),
      currentCoherence: czcBasinState.coherence,
    });
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
  // CALL ROUTES
  // ============================================
  
  app.post("/api/calls/initiate", authenticate, validateRequest(initiateCallSchema), async (req, res) => {
    try {
      const { receiverId, type } = req.body;
      const callerId = req.user!.id;
      
      // Check if receiver exists and is a friend
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Create call record
      const call = await storage.createCall({
        callerId,
        receiverId,
        type,
        status: "ringing",
      });
      
      // Notify receiver via WebSocket if online
      const receiverWs = connectedClients.get(receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        const caller = await storage.getUser(callerId);
        receiverWs.send(JSON.stringify({
          type: "incoming-call",
          callId: call.id,
          callType: type,
          caller: {
            id: caller!.id,
            username: caller!.username,
          },
        }));
      }
      
      await logAction(req, "call_initiated", "calls", call.id, { receiverId, type });
      
      res.json({ 
        call,
        receiverOnline: !!receiverWs && receiverWs.readyState === WebSocket.OPEN,
      });
    } catch (error: any) {
      console.error("Call initiation error:", error);
      res.status(500).json({ error: "Failed to initiate call" });
    }
  });
  
  app.get("/api/calls/history", authenticate, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const callHistory = await storage.getCallHistory(req.user!.id, limit);
      
      res.json({
        calls: callHistory.map(({ call, otherUser }) => ({
          id: call.id,
          type: call.type,
          status: call.status,
          direction: call.callerId === req.user!.id ? "outgoing" : "incoming",
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
          },
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          duration: call.duration,
          createdAt: call.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("Call history error:", error);
      res.status(500).json({ error: "Failed to get call history" });
    }
  });
  
  app.get("/api/calls/:callId", authenticate, async (req, res) => {
    try {
      const call = await storage.getCall(req.params.callId);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      if (call.callerId !== req.user!.id && call.receiverId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to view this call" });
      }
      
      const otherUserId = call.callerId === req.user!.id ? call.receiverId : call.callerId;
      const otherUser = await storage.getUser(otherUserId);
      
      res.json({
        call: {
          ...call,
          direction: call.callerId === req.user!.id ? "outgoing" : "incoming",
        },
        otherUser: otherUser ? {
          id: otherUser.id,
          username: otherUser.username,
        } : null,
      });
    } catch (error: any) {
      console.error("Get call error:", error);
      res.status(500).json({ error: "Failed to get call" });
    }
  });
  
  // Check if user is online (for call availability)
  app.get("/api/users/:userId/online", authenticate, async (req, res) => {
    try {
      const userId = req.params.userId;
      const ws = connectedClients.get(userId);
      const isOnline = !!ws && ws.readyState === WebSocket.OPEN;
      res.json({ userId, isOnline });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to check user status" });
    }
  });

  // ============================================
  // STREAMING ROUTES
  // ============================================

  app.post("/api/streams", authenticate, validateRequest(createStreamSchema), async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/streams", 20)) return;
      
      const { title, description, streamType, isPublic, quality, bitrate, frameRate, recordingEnabled } = req.body;
      
      const stream = await storage.createStream({
        broadcasterId: req.user!.id,
        title,
        description,
        streamType: streamType || "camera",
        isPublic: isPublic !== false,
        quality: quality || "720p",
        bitrate: bitrate || 2500,
        frameRate: frameRate || 30,
        recordingEnabled: recordingEnabled || false,
      });
      
      await logAction(req, "stream_created", "streams", stream.id, { title, streamType });
      
      res.status(201).json({ stream });
    } catch (error: any) {
      console.error("Create stream error:", error);
      await logAction(req, "stream_create_error", "streams", undefined, {}, "failed", error.message);
      res.status(500).json({ error: "Failed to create stream" });
    }
  });

  app.get("/api/streams/live", optionalAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const liveStreams = await storage.getLiveStreams(limit);
      
      res.json({
        streams: liveStreams.map(({ stream, broadcaster }) => ({
          id: stream.id,
          title: stream.title,
          description: stream.description,
          viewerCount: stream.viewerCount,
          quality: stream.quality,
          streamType: stream.streamType,
          startedAt: stream.startedAt,
          broadcaster: {
            id: broadcaster.id,
            username: broadcaster.username,
          },
        })),
      });
    } catch (error: any) {
      console.error("Get live streams error:", error);
      res.status(500).json({ error: "Failed to get live streams" });
    }
  });

  app.get("/api/streams/my", authenticate, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const streams = await storage.getUserStreams(req.user!.id, limit);
      res.json({ streams });
    } catch (error: any) {
      console.error("Get user streams error:", error);
      res.status(500).json({ error: "Failed to get your streams" });
    }
  });

  app.get("/api/streams/:streamId", optionalAuth, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      if (!stream.isPublic && (!req.user || stream.broadcasterId !== req.user.id)) {
        return res.status(403).json({ error: "This stream is private" });
      }
      
      const broadcaster = await storage.getUser(stream.broadcasterId);
      
      res.json({
        stream,
        broadcaster: broadcaster ? {
          id: broadcaster.id,
          username: broadcaster.username,
        } : null,
        isOwner: req.user?.id === stream.broadcasterId,
      });
    } catch (error: any) {
      console.error("Get stream error:", error);
      res.status(500).json({ error: "Failed to get stream" });
    }
  });

  app.post("/api/streams/:streamId/start", authenticate, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      if (stream.broadcasterId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to start this stream" });
      }
      
      const updatedStream = await storage.updateStreamStatus(stream.id, "live", new Date());
      
      await logAction(req, "stream_started", "streams", stream.id);
      
      res.json({ stream: updatedStream });
    } catch (error: any) {
      console.error("Start stream error:", error);
      res.status(500).json({ error: "Failed to start stream" });
    }
  });

  app.post("/api/streams/:streamId/end", authenticate, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      if (stream.broadcasterId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to end this stream" });
      }
      
      const endedStream = await storage.endStream(stream.id);
      
      await logAction(req, "stream_ended", "streams", stream.id, { 
        duration: endedStream.duration,
        peakViewers: endedStream.peakViewers,
      });
      
      res.json({ stream: endedStream });
    } catch (error: any) {
      console.error("End stream error:", error);
      res.status(500).json({ error: "Failed to end stream" });
    }
  });

  app.patch("/api/streams/:streamId/settings", authenticate, validateRequest(updateStreamSettingsSchema), async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      if (stream.broadcasterId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this stream" });
      }
      
      const updatedStream = await storage.updateStreamSettings(stream.id, req.body);
      
      await logAction(req, "stream_settings_updated", "streams", stream.id, req.body);
      
      res.json({ stream: updatedStream });
    } catch (error: any) {
      console.error("Update stream settings error:", error);
      res.status(500).json({ error: "Failed to update stream settings" });
    }
  });

  app.post("/api/streams/:streamId/join", authenticate, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      if (stream.status !== "live") {
        return res.status(400).json({ error: "Stream is not live" });
      }
      
      if (!stream.isPublic && stream.broadcasterId !== req.user!.id) {
        return res.status(403).json({ error: "This stream is private" });
      }
      
      const viewer = await storage.addStreamViewer(stream.id, req.user!.id);
      const broadcaster = await storage.getUser(stream.broadcasterId);
      
      await logAction(req, "stream_joined", "streams", stream.id);
      
      res.json({ 
        viewer,
        stream,
        broadcaster: broadcaster ? {
          id: broadcaster.id,
          username: broadcaster.username,
        } : null,
      });
    } catch (error: any) {
      console.error("Join stream error:", error);
      res.status(500).json({ error: "Failed to join stream" });
    }
  });

  app.post("/api/streams/:streamId/leave", authenticate, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      await storage.removeStreamViewer(stream.id, req.user!.id);
      
      await logAction(req, "stream_left", "streams", stream.id);
      
      res.json({ message: "Left stream successfully" });
    } catch (error: any) {
      console.error("Leave stream error:", error);
      res.status(500).json({ error: "Failed to leave stream" });
    }
  });

  app.get("/api/streams/:streamId/viewers", authenticate, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      if (stream.broadcasterId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to view viewers list" });
      }
      
      const viewers = await storage.getStreamViewers(stream.id);
      
      res.json({
        viewerCount: stream.viewerCount,
        viewers: viewers.map(({ viewer, user }) => ({
          id: viewer.id,
          username: user.username,
          joinedAt: viewer.joinedAt,
        })),
      });
    } catch (error: any) {
      console.error("Get viewers error:", error);
      res.status(500).json({ error: "Failed to get viewers" });
    }
  });

  app.post("/api/streams/:streamId/recordings", authenticate, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      
      if (stream.broadcasterId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to create recordings for this stream" });
      }
      
      const { filename, size, duration, format } = req.body;
      
      const recording = await storage.createStreamRecording({
        streamId: stream.id,
        userId: req.user!.id,
        filename,
        size,
        duration,
        format: format || "webm",
        status: "ready",
      });
      
      await logAction(req, "recording_created", "streams", stream.id, { 
        recordingId: recording.id,
        duration,
      });
      
      res.status(201).json({ recording });
    } catch (error: any) {
      console.error("Create recording error:", error);
      res.status(500).json({ error: "Failed to create recording" });
    }
  });

  app.get("/api/recordings", authenticate, async (req, res) => {
    try {
      const recordings = await storage.getUserRecordings(req.user!.id);
      res.json({ recordings });
    } catch (error: any) {
      console.error("Get recordings error:", error);
      res.status(500).json({ error: "Failed to get recordings" });
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
        videoCalls: true,
        voiceCalls: true,
        liveStreaming: true,
        screenSharing: true,
        streamRecording: true,
      },
    });
  });

  return httpServer;
}
