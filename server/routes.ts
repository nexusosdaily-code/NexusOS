import path from "path";
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
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

    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${SPECTRAL_API_URL}${endpoint}${qs ? `?${qs}` : ""}`;
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

const VIDEO_EXTENSIONS = new Set([".mp4",".mov",".avi",".mkv",".webm",".m4v",".wmv",".flv",".ts",".3gp"]);
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideoMime = file.mimetype.startsWith("video/") || file.mimetype === "application/octet-stream";
    if (isVideoMime || VIDEO_EXTENSIONS.has(ext)) cb(null, true);
    else cb(new Error(`Only video files allowed. Received: ${file.mimetype}`));
  },
});

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

      // ── Auto-register canonical wnsp:// identity on signup ─────────────
      try {
        const { db: _db2 } = await import("./db");
        const { wnspRegistry: _wr2 } = await import("@shared/schema");
        const enc2 = (() => {
          const codes = username.toUpperCase().split("").map((c: string) => c.charCodeAt(0)).filter((c: number) => c >= 32 && c <= 126);
          const sum   = codes.reduce((a: number, b: number) => a + b, 0);
          const avg   = sum / (codes.length || 1);
          const nm    = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(4));
          const wdm   = Math.floor((nm - 380) / 4) + 1;
          const oam   = sum % 100;
          const pol   = codes.length % 2 === 0 ? "H" : "V";
          const band  = nm < 450 ? "VIOLET" : nm < 495 ? "BLUE" : nm < 520 ? "CYAN" : nm < 565 ? "GREEN" : nm < 590 ? "YELLOW" : nm < 625 ? "ORANGE" : "RED";
          const slug  = username.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
          return { nm, wdm, oam, pol, band, psi: `Ψ(${wdm},${oam},${pol})`, uri: `wnsp://Ψ(${wdm},${oam},${pol})/${slug}` };
        })();
        await _db2.insert(_wr2).values({
          wnspUri: enc2.uri, psiChannel: enc2.psi, wdm: enc2.wdm, oam: enc2.oam,
          polarisation: enc2.pol, wavelengthNm: String(enc2.nm), band: enc2.band,
          label: username, ceInput: username, resourceType: "user", resourceId: user.id,
          httpUrl: `/profile/${username}`, description: `Canonical spectral identity for ${username}`,
          registeredBy: user.id, isPublic: true, isCanonical: true,
        }).onConflictDoNothing();
      } catch (_e) { /* non-blocking — identity can be registered later */ }

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

  // Wallet balance alias — used by Transmission page
  app.get("/api/wallet/balance", authenticate, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.user!.id);
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });
      res.json({
        address: wallet.address,
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
        balanceNxt: (parseInt(wallet.balance) / 1e8).toFixed(8),
      });
    } catch (error: any) {
      console.error("Get wallet balance error:", error);
      res.status(500).json({ error: "Failed to get wallet balance" });
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
          userId: f.friend.id,
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

      // Push live delivery via WebSocket to recipient and sender
      const wsPayload = JSON.stringify({
        type: "new_message",
        message: {
          id: message.id,
          senderId: message.senderId,
          recipientId: message.recipientId,
          content: message.content,
          wavelengthMin: message.wavelengthMin,
          wavelengthMax: message.wavelengthMax,
          spectralHash: message.spectralHash,
          totalLambdaMass: message.totalLambdaMass,
          isRead: false,
          createdAt: message.createdAt,
        },
      });
      const recipientWs = connectedClients.get(recipientId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(wsPayload);
      }
      const senderWs = connectedClients.get(req.user!.id);
      if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        senderWs.send(wsPayload);
      }

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

  app.get("/api/messages/thread/:userId", authenticate, async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
      const messages = await storage.getMessageThread(req.user!.id, userId, limit);
      const otherUser = await storage.getUser(userId);
      if (!otherUser) return res.status(404).json({ error: "User not found" });

      res.json({
        messages: messages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          recipientId: m.recipientId,
          content: m.content,
          wavelengthMin: m.wavelengthMin,
          wavelengthMax: m.wavelengthMax,
          spectralHash: m.spectralHash,
          totalLambdaMass: m.totalLambdaMass,
          isRead: m.isRead,
          createdAt: m.createdAt,
        })),
        contact: { id: otherUser.id, username: otherUser.username },
      });
    } catch (error: any) {
      console.error("Get thread error:", error);
      res.status(500).json({ error: "Failed to get thread" });
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

  // Message Bus
  app.post("/api/wnsp/bus/send", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/bus/send");
  });

  app.post("/api/wnsp/bus/dispatch", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/bus/dispatch");
  });

  app.post("/api/wnsp/bus/receive", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/bus/receive");
  });

  app.get("/api/wnsp/bus/status", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/bus/status");
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

  // ── WASCII Table & Lookup — public, no auth required ─────────
  app.get("/api/wnsp/wascii/table", (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/wascii/table");
  });

  app.post("/api/wnsp/wascii/lookup", (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/wascii/lookup");
  });

  // ── WASCII v2.0 — Wave Density Spectral Vector ────────────────
  app.get("/api/wnsp/spectral-vector", (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/spectral-vector");
  });
  app.post("/api/wnsp/spectral-vector", (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/spectral-vector");
  });

  // ── WNSP Density Equation v1.0 ────────────────────────────────
  app.get("/api/wnsp/density", (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/density");
  });
  app.post("/api/wnsp/density", (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/density");
  });

  // ── Kernel Component 1: Boot ──────────────────────────────────
  app.get("/api/kernel/boot", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/boot");
  });

  // ── Kernel Component 2: Persistent State ─────────────────────
  app.get("/api/kernel/state", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/state");
  });

  // ── Kernel Component 3: Authority Layer ──────────────────────
  app.get("/api/kernel/authority", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/authority");
  });
  app.post("/api/kernel/authority/check", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/authority/check");
  });

  // ── Kernel Component 4: Events / Interrupts ───────────────────
  app.get("/api/kernel/events", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/events");
  });
  app.post("/api/kernel/events/emit", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/events/emit");
  });

  // ── Kernel Component 5: Watchdog ─────────────────────────────
  app.get("/api/kernel/watchdog", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/watchdog");
  });
  app.post("/api/kernel/watchdog/scan", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/watchdog/scan");
  });

  // ── Kernel Overview ───────────────────────────────────────────
  app.get("/api/kernel/status", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/kernel/status");
  });

  // ── Nexus Photonic Development Environment ────────────────────
  app.post("/api/nexus/dev/encode", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/nexus/dev/encode");
  });
  app.post("/api/nexus/dev/build", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/nexus/dev/build");
  });
  app.get("/api/nexus/dev/spec", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/nexus/dev/spec");
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

  // ── Agent Message Bus API ─────────────────────────────────────────
  // Proxy to the Python WNSP bus + persistent message history in PostgreSQL

  // All registered agents and their Ψ channels
  app.get("/api/agent-bus/agents", authenticate, async (req: Request, res: Response) => {
    try {
      const r = await fetch(`${SPECTRAL_API_URL}/api/wnsp/agent/status`);
      const d = await r.json();
      res.json(d);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Bus queue + route log status
  app.get("/api/agent-bus/status", async (req: Request, res: Response) => {
    try {
      const r = await fetch(`${SPECTRAL_API_URL}/api/wnsp/bus/status`);
      const d = await r.json();
      res.json(d);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Recent kernel events
  app.get("/api/agent-bus/events", authenticate, async (req: Request, res: Response) => {
    try {
      const n = req.query.n ?? 30;
      const r = await fetch(`${SPECTRAL_API_URL}/api/kernel/events?n=${n}`);
      const d = await r.json();
      res.json(d);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Persistent message history from PostgreSQL
  app.get("/api/agent-bus/history", authenticate, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(String(req.query.limit ?? 50));
      const { db } = await import("./db");
      const { sql: drizzleSql } = await import("drizzle-orm");
      const rows = await db.execute(
        drizzleSql`SELECT * FROM agent_messages ORDER BY created_at DESC LIMIT ${limit}`
      );
      res.json({ messages: rows.rows, count: rows.rows.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Send a message — proxy to Python bus AND persist to PostgreSQL
  app.post("/api/agent-bus/send", authenticate, async (req: Request, res: Response) => {
    try {
      const { src, dst, payload, priority = 5, msgType = "MESSAGE" } = req.body;
      if (!src || !dst || !payload) return res.status(400).json({ error: "src, dst, payload required" });

      const busRes = await fetch(`${SPECTRAL_API_URL}/api/wnsp/bus/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ src, dst, payload, priority }),
      });
      const busData = await busRes.json() as any;
      if (!busRes.ok) return res.status(busRes.status).json(busData);

      // Parse Ψ channels from route string "src Ψ(x,y,P) → dst Ψ(a,b,Q)"
      const routeMatch = busData.route?.match(/Ψ\([^)]+\).*?Ψ\([^)]+\)/);
      const psiParts   = busData.route?.match(/Ψ\([^)]+\)/g) ?? ["Ψ(0,0,H)", "Ψ(0,0,H)"];

      // Persist
      const { db } = await import("./db");
      const { sql: drizzleSql } = await import("drizzle-orm");
      await db.execute(drizzleSql`
        INSERT INTO agent_messages
          (src_agent, dst_agent, src_psi, dst_psi, src_band, dst_band,
           payload, msg_type, priority, status, route)
        VALUES
          (${src}, ${dst},
           ${psiParts[0] ?? "Ψ(0,0,H)"},
           ${psiParts[1] ?? "Ψ(0,0,H)"},
           ${busData.authority ?? "UNKNOWN"},
           'UNKNOWN',
           ${payload}, ${msgType}, ${priority}, ${busData.status === 'dispatched' ? 'dispatched' : 'queued'},
           ${busData.route ?? `${src} → ${dst}`})
      `);

      // ── ORDINAL: MESSAGE input deposits small ordinal to Treasury ────────────
      // Message carrier: Schumann microwave harmonic 7.83GHz → tiny ordinal (7,830 units = 0.0000783 NXT)
      // Higher priority messages use higher carrier: priority×1GHz
      const msgFreqHz = Math.max(1e9, (priority ?? 5) * 1e9); // 1GHz–5GHz carrier
      const msgNm = (2.998e8 / msgFreqHz) * 1e9; // convert to nm
      const { db: dbMsg } = await import("./db");
      const { sql: dsMsg } = await import("drizzle-orm");
      depositOrdinalForInput({
        db: dbMsg, ds: dsMsg,
        freqHz: msgFreqHz, wavelengthNm: msgNm,
        psiChannel: psiParts[0] ?? "Ψ(0,0,H)",
        band: busData.authority ?? "USER",
        operation: "MESSAGE",
        label: `MSG:${src}→${dst}`,
        depositor: (req as any).user?.username ?? "system",
      }).catch(() => {}); // fire-and-forget — never block message routing

      res.json({ success: true, ...busData });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Dispatch the next queued message — proxy + update persistence
  app.post("/api/agent-bus/dispatch", authenticate, async (req: Request, res: Response) => {
    try {
      const busRes = await fetch(`${SPECTRAL_API_URL}/api/wnsp/bus/dispatch`, { method: "POST" });
      const busData = await busRes.json() as any;

      if (busData.status === "dispatched") {
        const { db } = await import("./db");
        const { sql: drizzleSql } = await import("drizzle-orm");
        // Mark the oldest queued message for this route as dispatched
        await db.execute(drizzleSql`
          UPDATE agent_messages SET status = 'dispatched', dispatched_at = NOW()
          WHERE src_agent = ${busData.src} AND dst_agent = ${busData.dst}
            AND status = 'queued'
          ORDER BY created_at ASC LIMIT 1
        `);
      }
      res.json(busData);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Drain an agent's inbox
  app.post("/api/agent-bus/receive", authenticate, async (req: Request, res: Response) => {
    try {
      const { agent } = req.body;
      if (!agent) return res.status(400).json({ error: "agent required" });
      const r = await fetch(`${SPECTRAL_API_URL}/api/wnsp/bus/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent }),
      });
      res.json(await r.json());
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Emit a kernel event manually
  app.post("/api/agent-bus/emit", authenticate, async (req: Request, res: Response) => {
    try {
      const { event_type, agent_id, detail } = req.body;
      const r = await fetch(`${SPECTRAL_API_URL}/api/kernel/events/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type, agent_id, detail }),
      });
      res.json(await r.json());
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Genesis Kernel Block API ───────────────────────────────────────
  // The OS kernel's own boot-state genesis record — root_hash is a Ψ channel

  app.get("/api/kernel/genesis", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const rows = await db.execute(
        sql`SELECT * FROM kernel_genesis_blocks ORDER BY created_at ASC LIMIT 1`
      );
      if (!rows.rows.length) return res.status(404).json({ error: "Genesis kernel block not found" });
      res.json({ block: rows.rows[0] });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Wavelength Blockchain API ─────────────────────────────────────
  // Block identity = Ψ channel derived from physics, not SHA256

  // Full chain — ordered by block number
  app.get("/api/blockchain/chain", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { blockchainBlocks } = await import("@shared/schema");
      const { asc } = await import("drizzle-orm");
      const blocks = await db.select().from(blockchainBlocks).orderBy(asc(blockchainBlocks.blockNumber));
      res.json({ blocks, height: blocks.length, latestPsi: blocks.at(-1)?.psiChannel ?? null });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Single block by number
  app.get("/api/blockchain/block/:number", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { blockchainBlocks } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [block] = await db.select().from(blockchainBlocks)
        .where(eq(blockchainBlocks.blockNumber, parseInt(req.params.number)));
      if (!block) return res.status(404).json({ error: "Block not found" });
      res.json({ block });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Mempool — pending transactions
  app.get("/api/blockchain/mempool", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { blockchainTxPool } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const txs = await db.select().from(blockchainTxPool)
        .where(eq(blockchainTxPool.status, "pending"))
        .orderBy(desc(blockchainTxPool.createdAt));
      res.json({ txs, count: txs.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Submit a transaction to the mempool — encodes memo through CE→SE for fee calculation
  app.post("/api/blockchain/transact", authenticate, async (req: Request, res: Response) => {
    try {
      const { fromAddress, toAddress, amountNxt, memo } = req.body;
      if (!fromAddress || !toAddress || !amountNxt)
        return res.status(400).json({ error: "fromAddress, toAddress, amountNxt required" });

      let wlNm = null, psiCh = null, energyJ = null, feePaid = "0.00000001";
      if (memo) {
        try {
          const er = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instruction: memo, label: "tx_memo" }),
          });
          const enc = await er.json() as any;
          wlNm    = String(enc.wavelength_mid_nm ?? 540);
          psiCh   = enc.psi_channel;
          energyJ = String(enc.energy_joules ?? 0);
          // Fee = energy cost in NXT (1 NXT per 10^-17 J)
          const rawFee = (parseFloat(energyJ) / 1e-17) * 0.00000001;
          feePaid = String(Math.max(rawFee, 0.00000001).toFixed(8));
        } catch {}
      }

      const { db } = await import("./db");
      const { blockchainTxPool } = await import("@shared/schema");
      const [tx] = await db.insert(blockchainTxPool).values({
        fromAddress, toAddress,
        amountNxt: String(amountNxt),
        memo: memo ?? null,
        wavelengthNm: wlNm,
        psiChannel: psiCh,
        energyJoules: energyJ,
        feePaid,
        status: "pending",
      }).returning();
      // Density at this transaction's compression state — proves why the fee is correct physics:
      // lower compression state (longer λ) = lower energy per photon = lower fee = more symbols/joule
      const txWdm = wlNm ? Math.max(1, Math.min(256, Math.floor((parseFloat(wlNm) - 380) / 4) + 1)) : 39;
      const txDensity = channelDensity(txWdm);
      res.json({ success: true, tx, feePaid, wavelengthNm: wlNm, psiChannel: psiCh, density_context: {
        wdm_band:           txDensity.wdm_band,
        wavelength_nm:      txDensity.wavelength_nm,
        d_channel:          txDensity.d_channel,
        d_energy_per_joule: txDensity.d_energy_per_joule,
        compression_note:   txDensity.compression_note,
      }});
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Mine a new block — encodes content, links to previous block's Ψ channel
  app.post("/api/blockchain/mine", authenticate, async (req: Request, res: Response) => {
    try {
      const { content, minerAddress } = req.body;
      if (!content) return res.status(400).json({ error: "content required" });

      const encRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: content, label: "block_content" }),
      });
      if (!encRes.ok) return res.status(502).json({ error: "Spectral encode failed" });
      const enc = await encRes.json() as any;

      const psiMatch = enc.psi_channel?.match(/Ψ\((\d+),\s*(\d+),\s*([HV])\)/);
      const wdm = psiMatch ? parseInt(psiMatch[1]) : 0;
      const oam = psiMatch ? parseInt(psiMatch[2]) : 0;
      const pol = psiMatch ? psiMatch[3] : "H";

      const { db } = await import("./db");
      const { blockchainBlocks, blockchainTxPool } = await import("@shared/schema");
      const { desc, eq } = await import("drizzle-orm");

      // Get latest block
      const [latest] = await db.select().from(blockchainBlocks).orderBy(desc(blockchainBlocks.blockNumber)).limit(1);
      const nextNumber = (latest?.blockNumber ?? -1) + 1;
      const prevPsi    = latest?.psiChannel ?? null;

      // Collect pending txs
      const pendingTxs = await db.select().from(blockchainTxPool).where(eq(blockchainTxPool.status, "pending"));
      const txIds = pendingTxs.map(t => t.id);

      const [block] = await db.insert(blockchainBlocks).values({
        blockNumber:  nextNumber,
        content,
        wavelengthNm: String(enc.wavelength_mid_nm ?? 550),
        psiChannel:   enc.psi_channel,
        wdm, oam, polarisation: pol,
        band:         enc.band ?? "CORE",
        energyJoules: String(enc.energy_joules ?? 0),
        lambdaMassKg: String(enc.lambda_mass_kg ?? 0),
        frequencyHz:  String(enc.frequency_hz ?? 0),
        previousPsi:  prevPsi,
        nxtReward:    "1.00000000",
        minerAddress: minerAddress ?? req.user?.username ?? "anonymous",
        txCount:      txIds.length,
        transactions: txIds as any,
      }).returning();

      // Mark txs as confirmed
      if (txIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        await db.update(blockchainTxPool)
          .set({ status: "confirmed" })
          .where(inArray(blockchainTxPool.id, txIds));
      }

      res.json({ success: true, block, spectral: enc, confirmedTxs: txIds.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Spectral Database API ─────────────────────────────────────────
  // Content-addressed storage: data lives at its wavelength, not an assigned ID

  // Store content — encode through CE→SE then persist at the resulting Ψ channel
  app.post("/api/spectral-db/store", authenticate, async (req: Request, res: Response) => {
    try {
      const { content, label, data } = req.body;
      if (!content || !label) return res.status(400).json({ error: "content and label required" });

      // Encode through the Python spectral engine
      const encodeRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: content, label }),
      });
      if (!encodeRes.ok) return res.status(502).json({ error: "Spectral encode failed" });
      const enc = await encodeRes.json() as any;

      // Parse Ψ channel: "Ψ(wdm, oam, pol)"
      const psiMatch = enc.psi_channel?.match(/Ψ\((\d+),\s*(\d+),\s*([HV])\)/);
      const wdm = psiMatch ? parseInt(psiMatch[1]) : 0;
      const oam = psiMatch ? parseInt(psiMatch[2]) : 0;
      const pol = psiMatch ? psiMatch[3] : "H";

      // SHA-256 content hash — the physics-independent proof of content
      const { createHash } = await import("crypto");
      const contentHash = createHash("sha256").update(content).digest("hex");

      const { db } = await import("./db");
      const { spectralRecords, blockchainTxPool } = await import("@shared/schema");

      const [record] = await db.insert(spectralRecords).values({
        label,
        content,
        wavelengthNm:  String(enc.wavelength_mid_nm ?? 550),
        psiChannel:    enc.psi_channel ?? "Ψ(0,0,H)",
        wdm,
        oam,
        polarisation:  pol,
        band:          enc.band ?? "CORE",
        energyJoules:  String(enc.energy_joules ?? 0),
        lambdaMassKg:  String(enc.lambda_mass_kg ?? 0),
        frequencyHz:   String(enc.frequency_hz ?? 0),
        data:          { ...(data ?? {}), contentHash, auditStatus: "pending" },
      }).returning();

      // ── Blockchain audit transaction (auto-submitted to mempool) ─────────────
      // Proves: this content existed at this wavelength at this timestamp.
      // Anyone can re-encode the content through Λ=hf/c² and verify the nm matches.
      const auditMemo = `SPECTRAL_AUDIT:${record.id}:${contentHash.slice(0, 16)}:${enc.wavelength_mid_nm}nm:${enc.psi_channel}`;
      const energyFee = parseFloat(String(enc.energy_joules ?? 0));
      const feePaid   = String(Math.max((energyFee / 1e-17) * 0.00000001, 0.00000001).toFixed(8));
      const fromAddr  = (req as any).user?.walletAddress ?? "NXT-NEXS-OS1K-7F3A-OMEGA";

      const [auditTx] = await db.insert(blockchainTxPool).values({
        fromAddress:  fromAddr,
        toAddress:    "SPECTRAL-DB",
        amountNxt:    "0.00000001",
        memo:         auditMemo,
        wavelengthNm: String(enc.wavelength_mid_nm ?? 550),
        psiChannel:   enc.psi_channel ?? null,
        energyJoules: String(enc.energy_joules ?? 0),
        feePaid,
        status:       "pending",
      }).returning();

      // Patch data field with auditTxId so the record knows its pending proof
      await db.update(spectralRecords)
        .set({ data: { ...(data ?? {}), contentHash, auditStatus: "pending", auditTxId: auditTx.id } })
        .where((await import("drizzle-orm")).eq(spectralRecords.id, record.id));

      // ── ORDINAL: STORE input deposits to Orbital Treasury ────────────────────
      const { sql: dsOrd } = await import("drizzle-orm");
      const storeOrdinal = await depositOrdinalForInput({
        db, ds: dsOrd,
        freqHz: parseFloat(String(enc.frequency_hz ?? 5.45e14)),
        wavelengthNm: parseFloat(String(enc.wavelength_mid_nm ?? 550)),
        psiChannel: enc.psi_channel ?? "Ψ(0,0,H)",
        band: enc.band ?? "CORE",
        operation: "STORE", label,
        sourceRecordId: record.id,
        depositor: (req as any).user?.username ?? "system",
      }).catch(() => null); // never fail the main store operation

      res.json({ success: true, record: { ...record, data: { contentHash, auditStatus: "pending", auditTxId: auditTx.id } }, spectral: enc, auditTx,
        ordinal: storeOrdinal ? { units: storeOrdinal.ordinalUnits.toString(), nxt: (Number(storeOrdinal.ordinalUnits) / 1e8).toFixed(8) } : null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Store file — upload any file (code, PDF, book, assignment) to spectral DB ─
  const TEXT_EXTENSIONS = /\.(txt|md|markdown|js|ts|jsx|tsx|py|rb|go|java|c|cpp|h|hpp|cs|css|html|htm|json|xml|yml|yaml|sh|bash|sql|rs|swift|kt|scala|r|csv|log|conf|ini|toml|env|vue|svelte|php|lua|pl|ex|exs|clj|hs|ml|elm|dart|zig|v|nim|cr|fs|vb|asm|s|tex|bib|rst|adoc|org|ipynb|graphql|prisma|tf|hcl|dockerfile|makefile|gitignore|editorconfig|license|readme)$/i;
  const docUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  app.post("/api/spectral-db/store-file", authenticate, (req: Request, res: Response) => {
    docUpload.single("file")(req, res, async (uploadErr) => {
      try {
        if (uploadErr) return res.status(400).json({ error: uploadErr.message });
        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ error: "No file provided" });

        const label = (req.body.label || file.originalname).trim();
        const description = (req.body.description || "").trim();

        const ext = path.extname(file.originalname).toLowerCase();
        const isText = file.mimetype.startsWith("text/") || TEXT_EXTENSIONS.test(ext);
        const content = isText
          ? file.buffer.toString("utf-8")
          : `[Binary: ${file.originalname} | ${file.mimetype} | ${(file.size / 1024).toFixed(1)} KB]`;

        const encodeText = description ? `${label}: ${description}` : label;
        const encodeRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: encodeText, label }),
        });
        if (!encodeRes.ok) return res.status(502).json({ error: "Spectral encode failed" });
        const enc = await encodeRes.json() as any;

        const psiMatch = enc.psi_channel?.match(/Ψ\((\d+),\s*(\d+),\s*([HV])\)/);
        const wdm = psiMatch ? parseInt(psiMatch[1]) : 0;
        const oam = psiMatch ? parseInt(psiMatch[2]) : 0;
        const pol = psiMatch ? psiMatch[3] : "H";

        const { createHash } = await import("crypto");
        const contentHash = createHash("sha256").update(content).digest("hex");

        const { db } = await import("./db");
        const { spectralRecords, blockchainTxPool } = await import("@shared/schema");

        const [record] = await db.insert(spectralRecords).values({
          label,
          content,
          wavelengthNm:  String(enc.wavelength_mid_nm ?? 550),
          psiChannel:    enc.psi_channel ?? "Ψ(0,0,H)",
          wdm, oam, polarisation: pol,
          band:          enc.band ?? "CORE",
          energyJoules:  String(enc.energy_joules ?? 0),
          lambdaMassKg:  String(enc.lambda_mass_kg ?? 0),
          frequencyHz:   String(enc.frequency_hz ?? 0),
          data: {
            type: "file", filename: file.originalname, mimeType: file.mimetype,
            fileSize: file.size, isText, contentHash, auditStatus: "pending",
          },
        }).returning();

        const auditMemo = `SPECTRAL_FILE:${record.id}:${contentHash.slice(0, 16)}:${enc.wavelength_mid_nm}nm:${enc.psi_channel}`;
        const energyFee = parseFloat(String(enc.energy_joules ?? 0));
        const feePaid   = String(Math.max((energyFee / 1e-17) * 0.00000001, 0.00000001).toFixed(8));
        const [auditTx] = await db.insert(blockchainTxPool).values({
          fromAddress:  (req as any).user?.walletAddress ?? "NXT-NEXS-OS1K-7F3A-OMEGA",
          toAddress:    "SPECTRAL-DB",
          amountNxt:    "0.00000001",
          memo:         auditMemo,
          wavelengthNm: String(enc.wavelength_mid_nm ?? 550),
          psiChannel:   enc.psi_channel ?? null,
          energyJoules: String(enc.energy_joules ?? 0),
          feePaid,
          status:       "pending",
        }).returning();

        await db.update(spectralRecords)
          .set({ data: { type: "file", filename: file.originalname, mimeType: file.mimetype, fileSize: file.size, isText, contentHash, auditStatus: "pending", auditTxId: auditTx.id } })
          .where((await import("drizzle-orm")).eq(spectralRecords.id, record.id));

        const { sql: dsOrd } = await import("drizzle-orm");
        await depositOrdinalForInput({
          db, ds: dsOrd,
          freqHz: parseFloat(String(enc.frequency_hz ?? 5.45e14)),
          wavelengthNm: parseFloat(String(enc.wavelength_mid_nm ?? 550)),
          psiChannel: enc.psi_channel ?? "Ψ(0,0,H)",
          band: enc.band ?? "CORE",
          operation: "STORE", label,
          sourceRecordId: record.id,
          depositor: (req as any).user?.username ?? "system",
        }).catch(() => null);

        res.json({ success: true, record, spectral: enc, filename: file.originalname, isText, contentPreview: isText ? content.slice(0, 300) : content });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  // ── Audit mine — bundle all pending audit txs into one proof block ─────────
  app.post("/api/spectral-db/audit-mine", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { blockchainBlocks, blockchainTxPool, spectralRecords } = await import("@shared/schema");
      const { eq, inArray, desc, like } = await import("drizzle-orm");

      // Collect all pending SPECTRAL_AUDIT txs
      const pendingTxs = await db.select().from(blockchainTxPool)
        .where(eq(blockchainTxPool.status, "pending"));
      const auditTxs = pendingTxs.filter(t => t.memo?.startsWith("SPECTRAL_AUDIT:"));

      if (auditTxs.length === 0) {
        return res.json({ success: true, message: "No pending audit transactions", blockMined: false });
      }

      // Build block content — summary of what's being proven
      const blockContent = `SPECTRAL_AUDIT_BLOCK: ${auditTxs.length} records proven at λ addresses via Λ=hf/c² | hashes: ${auditTxs.map(t => t.memo?.split(":")[2]).join(",")}`;

      const encRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: blockContent, label: "audit_block" }),
      });
      if (!encRes.ok) return res.status(502).json({ error: "Spectral encode failed" });
      const enc = await encRes.json() as any;

      const psiMatch = enc.psi_channel?.match(/Ψ\((\d+),\s*(\d+),\s*([HV])\)/);
      const wdm = psiMatch ? parseInt(psiMatch[1]) : 0;
      const oam = psiMatch ? parseInt(psiMatch[2]) : 0;
      const pol = psiMatch ? psiMatch[3] : "H";

      const [latest] = await db.select().from(blockchainBlocks).orderBy(desc(blockchainBlocks.blockNumber)).limit(1);
      const nextNumber = (latest?.blockNumber ?? -1) + 1;

      const txIds = auditTxs.map(t => t.id);
      const [block] = await db.insert(blockchainBlocks).values({
        blockNumber:  nextNumber,
        content:      blockContent,
        wavelengthNm: String(enc.wavelength_mid_nm ?? 550),
        psiChannel:   enc.psi_channel,
        wdm, oam, polarisation: pol,
        band:         enc.band ?? "CORE",
        energyJoules: String(enc.energy_joules ?? 0),
        lambdaMassKg: String(enc.lambda_mass_kg ?? 0),
        frequencyHz:  String(enc.frequency_hz ?? 0),
        previousPsi:  latest?.psiChannel ?? null,
        nxtReward:    "1.00000000",
        minerAddress: (req as any).user?.walletAddress ?? "NXT-NEXS-OS1K-7F3A-OMEGA",
        txCount:      txIds.length,
        transactions: txIds as any,
      }).returning();

      // Mark audit txs as confirmed
      await db.update(blockchainTxPool)
        .set({ status: "confirmed" })
        .where(inArray(blockchainTxPool.id, txIds));

      // Update spectral records with proof block number
      for (const tx of auditTxs) {
        const recordId = tx.memo?.split(":")[1];
        if (!recordId) continue;
        try {
          const [rec] = await db.select().from(spectralRecords).where(eq(spectralRecords.id, recordId));
          if (rec) {
            const existing = (rec.data as any) ?? {};
            await db.update(spectralRecords)
              .set({ data: { ...existing, auditStatus: "confirmed", proofBlockNumber: nextNumber, proofBlockPsi: enc.psi_channel } })
              .where(eq(spectralRecords.id, recordId));
          }
        } catch {}
      }

      res.json({ success: true, block, blockMined: true, recordsProven: auditTxs.length, spectral: enc });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Audit backfill — queue all existing unaudited records into the mempool ──
  app.post("/api/spectral-db/audit-backfill", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { spectralRecords, blockchainTxPool } = await import("@shared/schema");
      const { sql: drizzleSql, eq } = await import("drizzle-orm");
      const { createHash } = await import("crypto");

      // Only records that have no auditTxId in their data yet
      const unaudited = await db.select({
        id: spectralRecords.id,
        label: spectralRecords.label,
        content: spectralRecords.content,
        wavelengthNm: spectralRecords.wavelengthNm,
        psiChannel: spectralRecords.psiChannel,
        energyJoules: spectralRecords.energyJoules,
        data: spectralRecords.data,
      }).from(spectralRecords)
        .where(drizzleSql`${spectralRecords.data}->>'auditTxId' IS NULL`);

      if (unaudited.length === 0) {
        return res.json({ success: true, queued: 0, message: "All records already have audit transactions" });
      }

      const fromAddr = (req as any).user?.walletAddress ?? "NXT-NEXS-OS1K-7F3A-OMEGA";
      let queued = 0;

      // Batch insert audit txs — reuse existing wavelength data (no re-encode needed)
      for (const rec of unaudited) {
        const contentHash = createHash("sha256").update(rec.content).digest("hex");
        const auditMemo   = `SPECTRAL_AUDIT:${rec.id}:${contentHash.slice(0, 16)}:${rec.wavelengthNm}nm:${rec.psiChannel}`;
        const energyFee   = parseFloat(String(rec.energyJoules ?? 0));
        const feePaid     = String(Math.max((energyFee / 1e-17) * 0.00000001, 0.00000001).toFixed(8));

        const [auditTx] = await db.insert(blockchainTxPool).values({
          fromAddress:  fromAddr,
          toAddress:    "SPECTRAL-DB",
          amountNxt:    "0.00000001",
          memo:         auditMemo,
          wavelengthNm: String(rec.wavelengthNm),
          psiChannel:   rec.psiChannel ?? null,
          energyJoules: String(rec.energyJoules ?? 0),
          feePaid,
          status:       "pending",
        }).returning();

        const existing = (rec.data as any) ?? {};
        await db.update(spectralRecords)
          .set({ data: { ...existing, contentHash, auditStatus: "pending", auditTxId: auditTx.id } })
          .where(eq(spectralRecords.id, rec.id));

        queued++;
      }

      res.json({ success: true, queued, message: `${queued} records queued for audit — now mine a proof block to confirm them` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Audit status overview ─────────────────────────────────────────────────
  app.get("/api/spectral-db/audit-status", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { spectralRecords, blockchainBlocks, blockchainTxPool } = await import("@shared/schema");
      const { sql: drizzleSql, eq, desc } = await import("drizzle-orm");

      const [{ total }] = await db.select({ total: drizzleSql<number>`count(*)` }).from(spectralRecords);
      const [{ confirmed }] = await db.select({ confirmed: drizzleSql<number>`count(*)` })
        .from(spectralRecords).where(drizzleSql`${spectralRecords.data}->>'auditStatus' = 'confirmed'`);
      const [{ pending }] = await db.select({ pending: drizzleSql<number>`count(*)` })
        .from(spectralRecords).where(drizzleSql`${spectralRecords.data}->>'auditStatus' = 'pending'`);
      const [{ blockCount }] = await db.select({ blockCount: drizzleSql<number>`count(*)` }).from(blockchainBlocks);
      const [{ pendingAuditTxs }] = await db.select({ pendingAuditTxs: drizzleSql<number>`count(*)` })
        .from(blockchainTxPool)
        .where(drizzleSql`${blockchainTxPool.status} = 'pending' AND ${blockchainTxPool.memo} LIKE 'SPECTRAL_AUDIT:%'`);

      const latestBlocks = await db.select().from(blockchainBlocks)
        .orderBy(desc(blockchainBlocks.blockNumber)).limit(5);

      res.json({ total: Number(total), confirmed: Number(confirmed), pending: Number(pending), unaudited: Number(total) - Number(confirmed) - Number(pending), blockCount: Number(blockCount), pendingAuditTxs: Number(pendingAuditTxs), latestBlocks });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Full-text search across label + content
  app.get("/api/spectral-db/text-search", async (req: Request, res: Response) => {
    try {
      const q    = String(req.query.q ?? "").trim();
      const band = String(req.query.band ?? "").trim().toUpperCase();
      const limit = Math.min(parseInt(String(req.query.limit ?? "200")), 500);

      const { db } = await import("./db");
      const { spectralRecords } = await import("@shared/schema");
      const { sql: drizzleSql, and, ilike, eq, or } = await import("drizzle-orm");

      const conditions: any[] = [];
      if (q) conditions.push(or(ilike(spectralRecords.label, `%${q}%`), ilike(spectralRecords.content, `%${q}%`)));
      if (band && band !== "ALL") conditions.push(eq(spectralRecords.band, band));

      const records = await db.select({
        id: spectralRecords.id,
        label: spectralRecords.label,
        wavelengthNm: spectralRecords.wavelengthNm,
        psiChannel: spectralRecords.psiChannel,
        band: spectralRecords.band,
        energyJoules: spectralRecords.energyJoules,
        frequencyHz: spectralRecords.frequencyHz,
        data: spectralRecords.data,
        createdAt: spectralRecords.createdAt,
      }).from(spectralRecords)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(drizzleSql`CAST(${spectralRecords.wavelengthNm} AS NUMERIC) ASC`)
        .limit(limit);

      res.json({ records, count: records.length, query: q, band });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch full content of a single record by ID
  app.get("/api/spectral-db/record/:id", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { spectralRecords } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [record] = await db.select().from(spectralRecords).where(eq(spectralRecords.id, req.params.id));
      if (!record) return res.status(404).json({ error: "Record not found" });
      res.json({ record });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Records list — returns total count + paginated records (used by Nexus Command)
  app.get("/api/spectral-db/records", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { spectralRecords } = await import("@shared/schema");
      const { desc: dDesc, sql: ds } = await import("drizzle-orm");
      const limit = Math.min(parseInt(String(req.query.limit ?? "20")), 100);
      const [records, countResult] = await Promise.all([
        db.select().from(spectralRecords).orderBy(dDesc(spectralRecords.createdAt)).limit(limit),
        db.execute(ds`SELECT COUNT(*) AS total FROM spectral_records`),
      ]);
      const total = parseInt((countResult.rows[0] as any)?.total ?? "0");
      res.json({ records, total, limit });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Public encode-preview — CE→SE physics result with no DB write, no auth ──
  app.post("/api/spectral-db/encode-preview", async (req: Request, res: Response) => {
    try {
      const { text, label } = req.body as { text?: string; label?: string };
      if (!text) return res.status(400).json({ error: "text is required" });
      const encodeRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, label: label || "preview" }),
      });
      if (!encodeRes.ok) return res.status(502).json({ error: "Spectral encode failed" });
      const enc = await encodeRes.json() as any;
      res.json({ success: true, spectral: enc });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/spectral-db/scan", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { spectralRecords } = await import("@shared/schema");
      const { asc } = await import("drizzle-orm");
      const records = await db.select().from(spectralRecords).orderBy(asc(spectralRecords.wavelengthNm));
      res.json({ records, count: records.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proximity search — find records within ±range nm of a target wavelength
  app.get("/api/spectral-db/search", async (req: Request, res: Response) => {
    try {
      const wavelength = parseFloat(String(req.query.wavelength ?? "550"));
      const range      = parseFloat(String(req.query.range ?? "20"));
      const { db } = await import("./db");
      const { spectralRecords } = await import("@shared/schema");
      const { sql: drizzleSql } = await import("drizzle-orm");

      const records = await db.select().from(spectralRecords).where(
        drizzleSql`CAST(${spectralRecords.wavelengthNm} AS NUMERIC)
                   BETWEEN ${wavelength - range} AND ${wavelength + range}`
      );
      res.json({ records, count: records.length, center: wavelength, range });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Retrieve by Ψ channel
  app.get("/api/spectral-db/channel/:psi", async (req: Request, res: Response) => {
    try {
      const psi = decodeURIComponent(req.params.psi);
      const { db } = await import("./db");
      const { spectralRecords } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const records = await db.select().from(spectralRecords).where(eq(spectralRecords.psiChannel, psi));
      res.json({ records, psiChannel: psi });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Transmit ordinal — record a P2P TRANSMIT event to treasury ───────────────
  app.post("/api/transmit/ordinal", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: ds } = await import("drizzle-orm");
      const { freqHz = 5.45e14, wavelengthNm = 550, psiChannel = "Ψ(0,0,H)", band = "CORE", label = "P2P Transmission" } = req.body;
      const ordinal = await depositOrdinalForInput({
        db, ds, freqHz: parseFloat(String(freqHz)), wavelengthNm: parseFloat(String(wavelengthNm)),
        psiChannel: String(psiChannel), band: String(band), operation: "TRANSMIT",
        label: String(label), depositor: (req as any).user?.username ?? "system",
      });
      res.json({ success: true, ordinal: { units: ordinal.ordinalUnits.toString(), nxt: (Number(ordinal.ordinalUnits) / 1e8).toFixed(8) } });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Ordinal Input Registry — formal definition of all communication input types ──
  app.get("/api/ordinals/registry", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: ds } = await import("drizzle-orm");

      // Live stats per operation_type from treasury + energy_ledger
      const [treasuryStats, energyStats, recentDeposits] = await Promise.all([
        db.execute(ds`SELECT operation_type, COUNT(*) AS count, COALESCE(SUM(ordinal_nxt_units), 0) AS total_units
          FROM orbital_treasury GROUP BY operation_type ORDER BY total_units DESC`),
        db.execute(ds`SELECT operation, COUNT(*) AS count, COALESCE(SUM(cost_nxt_units), 0) AS total_cost
          FROM energy_ledger GROUP BY operation ORDER BY count DESC`),
        db.execute(ds`SELECT source_label, source_wavelength_nm, source_frequency_hz, source_psi_channel,
          source_band, ordinal_nxt_units, operation_type, deposited_by, deposited_at, memo
          FROM orbital_treasury ORDER BY deposited_at DESC LIMIT 20`),
      ]);

      const byType: Record<string, any> = {};
      for (const row of treasuryStats.rows as any[]) {
        byType[row.operation_type] = { count: parseInt(row.count), totalUnits: parseInt(row.total_units), totalNxt: parseInt(row.total_units) / 1e8 };
      }

      // Canonical definition of all 9 input types
      const REGISTRY = [
        { operation: "STORE",     trigger: "Spectral record written to DB via CE→SE",     energyFactor: 200, example555thz: "555,000,000",  color: "#06b6d4", group: "data" },
        { operation: "UPLOAD",    trigger: "File or video encoded into spectrum",          energyFactor: 100, example555thz: "555,000,000",  color: "#8b5cf6", group: "media" },
        { operation: "DELETE",    trigger: "Spectral record removed (Ψ address reclaimed)", energyFactor: 50, example555thz: "555,000,000",  color: "#f43f5e", group: "data" },
        { operation: "TRANSMIT",  trigger: "P2P file/data transmission initiated",        energyFactor: 30,  example555thz: "555,000,000",  color: "#22c55e", group: "media" },
        { operation: "ENCODE",    trigger: "CE→SE encoding performed (standalone call)",  energyFactor: 10,  example555thz: "555,000,000",  color: "#f59e0b", group: "compute" },
        { operation: "MESSAGE",   trigger: "Agent bus message routed",                    energyFactor: 5,   example555thz: "1,000–5,000",  color: "#64748b", group: "comms", note: "carrier = priority×1GHz" },
        { operation: "BROADCAST", trigger: "Live stream started on spectral channel",     energyFactor: 150, example555thz: "555,000,000",  color: "#ea580c", group: "media" },
        { operation: "CALL",      trigger: "Voice/video call initiated",                  energyFactor: 120, example555thz: "555,000,000",  color: "#a855f7", group: "comms" },
        { operation: "RETRIEVE",  trigger: "Spectral record read from DB",                energyFactor: 10,  example555thz: "555,000,000",  color: "#3b82f6", group: "data" },
      ].map(t => ({
        ...t,
        liveStats: byType[t.operation] ?? { count: 0, totalUnits: 0, totalNxt: 0 },
        formula: "ordinal_nxt_units = ROUND(freq_hz / 1e6)",
        constitutionalBasis: "Λ = hf/c² — ordinal derived from physical wave frequency, never from policy",
      }));

      res.json({
        version: "1.0.0",
        constitutionalClause: "§8 — Any communication input subject to ordinals must be defined. The ordinal formula is Λ=hf/c². No arbitrary fees.",
        ordinalFormula: "ordinal_nxt_units = ROUND(frequency_hz / 1e6)",
        energyCostFormula: "energy_cost_units = ROUND((frequency_hz / 1e12) × energy_factor)",
        totalTreasuryDeposits: (treasuryStats.rows as any[]).reduce((s, r) => s + parseInt(r.total_units), 0),
        registry: REGISTRY,
        recentDeposits: recentDeposits.rows,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Ecosystem Status — unified cross-system aggregation ──────────────────
  app.get("/api/ecosystem/status", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: ds } = await import("drizzle-orm");

      const [spectral, chain, txPool, treasury, energy, agents, busLog, kernelEvts, auditor, netNodes] = await Promise.all([
        db.execute(ds`SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE data->>'auditStatus'='confirmed') AS confirmed,
          COUNT(*) FILTER (WHERE data->>'status'='deleted') AS deleted,
          COUNT(*) FILTER (WHERE data->>'auditStatus' IS NULL) AS unaudited
          FROM spectral_records`),
        db.execute(ds`SELECT COUNT(*) AS block_count, MAX(block_number) AS height,
          COALESCE((SELECT wavelength_nm::float FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1), 0) AS latest_nm,
          COALESCE((SELECT psi_channel FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1), '') AS latest_psi,
          COALESCE((SELECT band FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1), '') AS latest_band
          FROM blockchain_blocks`),
        db.execute(ds`SELECT COUNT(*) FILTER (WHERE status='pending') AS pending,
          COUNT(*) FILTER (WHERE status='confirmed') AS confirmed FROM blockchain_tx_pool`),
        db.execute(ds`SELECT COUNT(*) AS deposit_count,
          COALESCE(SUM(ordinal_nxt_units), 0) AS total_units,
          COALESCE(SUM(ordinal_nxt_units), 0)::float8 / 1e8 AS total_nxt
          FROM orbital_treasury`),
        db.execute(ds`SELECT COUNT(*) AS op_count,
          COALESCE(SUM(cost_nxt_units), 0) AS total_cost_units,
          COUNT(*) FILTER (WHERE operation='STORE') AS stores,
          COUNT(*) FILTER (WHERE operation='DELETE') AS deletes
          FROM energy_ledger`),
        db.execute(ds`SELECT agent_id, authority_band, intent, updated_at FROM wnsp_agents ORDER BY authority_band`),
        db.execute(ds`SELECT COUNT(*) AS msg_count, MAX(dispatched_at) AS last_at FROM wnsp_bus_log`),
        db.execute(ds`SELECT COUNT(*) AS event_count, MAX(created_at) AS last_at FROM wnsp_kernel_events`),
        db.execute(ds`SELECT agent_id, authority_band, intent, updated_at FROM wnsp_agents WHERE agent_id = 'blockchain_auditor'`),
        db.execute(ds`SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status='active') AS active,
          COUNT(*) FILTER (WHERE last_beacon_at > NOW() - INTERVAL '5 minutes') AS live,
          COALESCE((SELECT emission_band FROM network_nodes ORDER BY last_beacon_at DESC LIMIT 1), '') AS top_band,
          COALESCE((SELECT wavelength_nm::float FROM network_nodes ORDER BY last_beacon_at DESC LIMIT 1), 0) AS latest_nm
          FROM network_nodes`),
      ]);

      const sp: any = spectral.rows[0];
      const ch: any = chain.rows[0];
      const tx: any = txPool.rows[0];
      const tr: any = treasury.rows[0];
      const en: any = energy.rows[0];
      const ag: any[] = agents.rows as any[];
      const bl: any = busLog.rows[0];
      const ke: any = kernelEvts.rows[0];
      const aud: any = auditor.rows[0] ?? {};
      const nn: any = netNodes.rows[0] ?? {};

      const proofCoverage = parseInt(sp.total) > 0
        ? Math.round((parseInt(sp.confirmed) / parseInt(sp.total)) * 100) : 0;

      res.json({
        timestamp: Date.now(),
        systems: {
          spectralDb: {
            total: parseInt(sp.total), confirmed: parseInt(sp.confirmed),
            deleted: parseInt(sp.deleted), unaudited: parseInt(sp.unaudited),
            proofCoverage, status: proofCoverage === 100 ? "VERIFIED" : proofCoverage > 50 ? "PARTIAL" : "NEEDS_AUDIT",
          },
          blockchain: {
            height: parseInt(ch.height ?? 0), blockCount: parseInt(ch.block_count ?? 0),
            pendingTxs: parseInt(tx.pending ?? 0), confirmedTxs: parseInt(tx.confirmed ?? 0),
            latestWavelengthNm: parseFloat(ch.latest_nm ?? 0),
            latestPsiChannel: ch.latest_psi, latestBand: ch.latest_band,
            status: "ONLINE",
          },
          treasury: {
            depositCount: parseInt(tr.deposit_count ?? 0),
            totalUnits: parseInt(tr.total_units ?? 0),
            totalNxt: parseFloat(tr.total_nxt ?? 0),
            charitableTrustUnits: Math.round(parseInt(tr.total_units ?? 0) * 0.10),
            status: parseInt(tr.deposit_count ?? 0) > 0 ? "FUNDED" : "EMPTY",
          },
          energyLedger: {
            opCount: parseInt(en.op_count ?? 0), totalCostUnits: parseInt(en.total_cost_units ?? 0),
            stores: parseInt(en.stores ?? 0), deletes: parseInt(en.deletes ?? 0),
            status: parseInt(en.op_count ?? 0) > 0 ? "TRACKING" : "IDLE",
          },
          agentBus: {
            agentCount: ag.length,
            agents: ag.map(a => ({
              id: a.agent_id, band: a.authority_band, intent: a.intent,
              lastSeen: a.updated_at, status: (Date.now() / 1000 - parseFloat(a.updated_at)) < 600 ? "ACTIVE" : "DEGRADED",
            })),
            msgCount: parseInt(bl.msg_count ?? 0), lastMessageAt: bl.last_at,
            status: "ONLINE",
          },
          kernel: {
            eventCount: parseInt(ke.event_count ?? 0), lastEventAt: ke.last_at,
            auditorAgent: aud.agent_id
              ? { id: aud.agent_id, band: aud.authority_band, lastSeen: aud.updated_at }
              : null,
            status: "RUNNING",
          },
          networkNodes: {
            total: parseInt(nn.total ?? 0),
            active: parseInt(nn.active ?? 0),
            live: parseInt(nn.live ?? 0),
            topBand: nn.top_band ?? "",
            latestNm: parseFloat(nn.latest_nm ?? 0),
            status: parseInt(nn.live ?? 0) > 0 ? "ACTIVE" : parseInt(nn.total ?? 0) > 0 ? "IDLE" : "EMPTY",
          },
        },
        summary: {
          proofCoverage,
          totalNxt: parseFloat(tr.total_nxt ?? 0),
          activeAgents: ag.filter(a => (Date.now() / 1000 - parseFloat(a.updated_at)) < 600).length,
          blockchainHeight: parseInt(ch.height ?? 0),
          spectralRecords: parseInt(sp.total),
          networkNodes: parseInt(nn.total ?? 0),
          liveNodes: parseInt(nn.live ?? 0),
        },
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Orbital Treasury + Energy Ledger (Constitutional Economy) ────────────
  // Physical constants for E=hf ordinal valuation
  const H_PLANCK = 6.626e-34;
  const C_LIGHT  = 2.998e8;

  type OrdinalOperation = "STORE" | "UPLOAD" | "RETRIEVE" | "DELETE" | "TRANSMIT" | "ENCODE" | "MESSAGE" | "BROADCAST" | "CALL";

  function calcOrdinal(frequencyHz: number): bigint {
    // NXT ordinal units = ROUND(frequency_hz / 1e6)
    // At 555THz → 555,000,000 units = 5.55 NXT  |  7.83GHz → 7,830 units
    return BigInt(Math.round(frequencyHz / 1e6));
  }

  function calcEnergyCost(frequencyHz: number, op: OrdinalOperation): bigint {
    const factors: Record<string, number> = {
      STORE: 200, UPLOAD: 100, RETRIEVE: 10, DELETE: 50,
      TRANSMIT: 30, ENCODE: 10, MESSAGE: 5, BROADCAST: 150, CALL: 120,
    };
    return BigInt(Math.round((frequencyHz / 1e12) * (factors[op] ?? 10)));
  }

  // ── Universal ordinal deposit — called by every communication input ──────────
  // "Any communication input subject to ordinals must be defined" — NexusOS Constitution
  async function depositOrdinalForInput(params: {
    db: any; ds: any;
    freqHz: number; wavelengthNm: number; psiChannel: string; band: string;
    operation: OrdinalOperation; label: string; sourceRecordId?: string; depositor: string;
  }): Promise<{ ordinalUnits: bigint; energyCost: bigint }> {
    const { db, ds, freqHz, wavelengthNm, psiChannel, band, operation, label, sourceRecordId, depositor } = params;
    const ordinalUnits = calcOrdinal(freqHz);
    const energyCost   = calcEnergyCost(freqHz, operation);
    const srcId = sourceRecordId ?? "input:" + Date.now();
    const memo  = `${operation} ordinal: λ=${wavelengthNm.toFixed(2)}nm ${psiChannel} → ${ordinalUnits} NXT units`;

    await Promise.all([
      // 1. Deposit to Orbital Treasury
      db.execute(ds`
        INSERT INTO orbital_treasury (source_record_id, source_label, source_wavelength_nm, source_frequency_hz,
          source_psi_channel, source_band, ordinal_nxt_units, operation_type, deposited_by, memo)
        VALUES (${srcId}, ${label}, ${wavelengthNm}, ${freqHz}, ${psiChannel}, ${band},
                ${ordinalUnits.toString()}, ${operation}, ${depositor}, ${memo})
      `),
      // 2. Log energy cost to ledger
      db.execute(ds`
        INSERT INTO energy_ledger (record_id, user_address, operation, wavelength_nm, frequency_hz,
          energy_joules, cost_nxt_units, band, psi_channel, memo)
        VALUES (${srcId}, ${depositor}, ${operation}, ${wavelengthNm}, ${freqHz},
                ${H_PLANCK * freqHz}, ${energyCost.toString()}, ${band}, ${psiChannel},
                ${operation + ' energy cost at λ=' + wavelengthNm.toFixed(2) + 'nm'})
      `),
      // 3. Bus log — signals to ecosystem
      db.execute(ds`
        INSERT INTO wnsp_bus_log (src, dst, payload, priority, src_wdm, src_oam, src_pol,
          dst_wdm, dst_oam, dst_pol, route, dispatched_at)
        VALUES ('spectral_db', 'orbital_treasury',
                ${`ORDINAL_INPUT[${operation}]: "${label}" λ=${wavelengthNm.toFixed(2)}nm ordinal=${ordinalUnits} NXT units`},
                2, 0, 0, 0, 0, 0, 0, 'spectral_db→orbital_treasury', ${Date.now() / 1000})
      `),
    ]);
    return { ordinalUnits, energyCost };
  }

  // DELETE a spectral record — ordinal flows to Orbital Treasury
  app.delete("/api/spectral-db/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { db } = await import("./db");
      const { sql: ds } = await import("drizzle-orm");

      // Fetch record
      const recR = await db.execute(ds`SELECT * FROM spectral_records WHERE id = ${id}`);
      if (!recR.rows.length) return res.status(404).json({ error: "Record not found" });
      const rec: any = recR.rows[0];

      const freqHz = parseFloat(rec.frequency_hz) || 5.45e14;
      const ordinalUnits = calcOrdinal(freqHz);
      const energyCost   = calcEnergyCost(freqHz, "DELETE");
      const wavelengthNm = parseFloat(rec.wavelength_nm) || 550;
      const psiCh        = rec.psi_channel || "Ψ(0,0,H)";
      const band         = rec.band || "GUEST";

      // 1. Deposit ordinal to Orbital Treasury
      await db.execute(ds`
        INSERT INTO orbital_treasury (source_record_id, source_label, source_wavelength_nm, source_frequency_hz,
          source_psi_channel, source_band, ordinal_nxt_units, operation_type, deposited_by, memo)
        VALUES (${id}, ${rec.label}, ${wavelengthNm}, ${freqHz}, ${psiCh}, ${band},
                ${ordinalUnits.toString()}, 'DELETE', ${user?.username ?? 'system'},
                ${'Ordinal reclaimed from λ=' + wavelengthNm.toFixed(2) + 'nm ' + psiCh})
      `);

      // 2. Log energy cost
      await db.execute(ds`
        INSERT INTO energy_ledger (record_id, user_address, operation, wavelength_nm, frequency_hz,
          energy_joules, cost_nxt_units, band, psi_channel, memo)
        VALUES (${id}, ${user?.username ?? 'system'}, 'DELETE', ${wavelengthNm}, ${freqHz},
                ${H_PLANCK * freqHz}, ${energyCost.toString()}, ${band}, ${psiCh},
                ${'DELETE processing cost at λ=' + wavelengthNm.toFixed(2) + 'nm'})
      `);

      // 3. Queue blockchain proof of deletion
      await db.execute(ds`
        INSERT INTO blockchain_tx_pool (id, from_address, to_address, amount_nxt, memo, wavelength_nm, psi_channel, energy_joules, fee_paid, status)
        VALUES (gen_random_uuid()::varchar, ${user?.username ?? 'system'}, 'orbital_treasury',
                ${ordinalUnits.toString()},
                ${'TREASURY_DEPOSIT:' + id + ':ordinal_reclaim:' + wavelengthNm.toFixed(2) + ':' + psiCh},
                ${wavelengthNm}, ${psiCh}, ${H_PLANCK * freqHz}, ${energyCost.toString()}, 'pending')
      `);

      // 4. Mark record as deleted (soft delete — Ψ address preserved in blockchain)
      await db.execute(ds`
        UPDATE spectral_records SET data = COALESCE(data,'{}') ||
          ${JSON.stringify({ status: 'deleted', deletedAt: new Date().toISOString(),
            ordinalReclaimedUnits: ordinalUnits.toString(), deletedBy: user?.username ?? 'system' })}::jsonb
        WHERE id = ${id}
      `);

      // 5. Log to agent bus
      await db.execute(ds`
        INSERT INTO wnsp_bus_log (src, dst, payload, priority, src_wdm, src_oam, src_pol, dst_wdm, dst_oam, dst_pol, route, dispatched_at)
        VALUES ('spectral_db', 'orbital_treasury',
                ${'ORDINAL_DEPOSIT: record=' + id + ' ordinal=' + ordinalUnits + ' NXT units λ=' + wavelengthNm.toFixed(2) + 'nm'},
                2, 0, 0, 0, 0, 0, 0, 'spectral_db→orbital_treasury', ${Date.now() / 1000})
      `);

      res.json({
        success: true,
        recordId: id,
        label: rec.label,
        ordinalReclaimedNxtUnits: ordinalUnits.toString(),
        ordinalNxt: (Number(ordinalUnits) / 1e8).toFixed(8),
        energyCostNxtUnits: energyCost.toString(),
        wavelengthNm,
        psiChannel: psiCh,
        band,
        message: `Ordinal reclaimed: ${ordinalUnits.toLocaleString()} NXT units → Orbital Treasury`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET Orbital Treasury — balance, deposits, energy ledger
  app.get("/api/orbital-treasury", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: ds } = await import("drizzle-orm");
      const limit = parseInt(req.query.limit as string) || 50;

      const [totR, depositsR, energyR, bandR, txPending] = await Promise.all([
        db.execute(ds`SELECT
          COUNT(*) AS deposit_count,
          COALESCE(SUM(ordinal_nxt_units), 0) AS total_ordinal_units,
          COALESCE(SUM(ordinal_nxt_units), 0)::float8 / 1e8 AS total_nxt
          FROM orbital_treasury`),
        db.execute(ds`SELECT id, source_label, source_wavelength_nm, source_frequency_hz,
          source_psi_channel, source_band, ordinal_nxt_units, deposited_by, deposited_at, memo
          FROM orbital_treasury ORDER BY deposited_at DESC LIMIT ${limit}`),
        db.execute(ds`SELECT
          COALESCE(SUM(cost_nxt_units), 0) AS total_energy_cost_units,
          COUNT(*) AS operation_count,
          COUNT(*) FILTER (WHERE operation = 'STORE')    AS stores,
          COUNT(*) FILTER (WHERE operation = 'RETRIEVE') AS retrieves,
          COUNT(*) FILTER (WHERE operation = 'DELETE')   AS deletes,
          COUNT(*) FILTER (WHERE operation = 'TRANSMIT') AS transmits
          FROM energy_ledger`),
        db.execute(ds`SELECT source_band AS band, COUNT(*) AS count, SUM(ordinal_nxt_units) AS units
          FROM orbital_treasury GROUP BY source_band ORDER BY units DESC`),
        db.execute(ds`SELECT COUNT(*) AS cnt FROM blockchain_tx_pool WHERE status = 'pending' AND memo LIKE 'TREASURY_DEPOSIT:%'`),
      ]);

      res.json({
        treasury: totR.rows[0],
        deposits: depositsR.rows,
        energy:   energyR.rows[0],
        byBand:   bandR.rows,
        pendingProofs: (txPending.rows[0] as any)?.cnt ?? 0,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET energy cost preview for any operation
  app.get("/api/orbital-treasury/cost-preview", authenticate, async (req: Request, res: Response) => {
    try {
      const { recordId, operation = "DELETE" } = req.query as any;
      if (!recordId) return res.status(400).json({ error: "recordId query parameter is required" });
      const { db } = await import("./db");
      const { sql: ds } = await import("drizzle-orm");
      const [rec] = (await db.execute(ds`SELECT wavelength_nm, frequency_hz, psi_channel, band, label FROM spectral_records WHERE id = ${recordId}`)).rows;
      if (!rec) return res.status(404).json({ error: "Record not found" });
      const r: any = rec;
      const freqHz = parseFloat(r.frequency_hz) || 5.45e14;
      const ordinalUnits = calcOrdinal(freqHz);
      const energyCost   = calcEnergyCost(freqHz, operation);
      res.json({
        label: r.label,
        wavelengthNm: parseFloat(r.wavelength_nm),
        psiChannel: r.psi_channel,
        band: r.band,
        frequencyTHz: (freqHz / 1e12).toFixed(4),
        ordinalNxtUnits: ordinalUnits.toString(),
        ordinalNxt: (Number(ordinalUnits) / 1e8).toFixed(8),
        energyCostNxtUnits: energyCost.toString(),
        energyCostNxt: (Number(energyCost) / 1e8).toFixed(8),
        constitutionalFormula: `E=hf: h=${H_PLANCK.toExponential(3)}, f=${(freqHz/1e12).toFixed(4)}THz → ordinal=${ordinalUnits} NXT units`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Blockchain Auditor Agent API ──────────────────────────────────────────
  app.get("/api/blockchain-auditor/status", authenticate, async (req: Request, res: Response) => {
    try {
      const { getAuditorStatus } = await import("./blockchain_auditor");
      const status = getAuditorStatus();
      // Also pull recent bus log entries from this agent
      const { db } = await import("./db");
      const { sql: drizzleSql } = await import("drizzle-orm");
      const logs = await db.execute(drizzleSql`
        SELECT src, dst, payload, dispatched_at
        FROM wnsp_bus_log
        WHERE src = 'blockchain_auditor'
        ORDER BY dispatched_at DESC
        LIMIT 10
      `);
      res.json({ ...status, recentBusLog: logs.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/blockchain-auditor/config", authenticate, async (req: Request, res: Response) => {
    try {
      const { updateAuditorConfig } = await import("./blockchain_auditor");
      const { enabled, intervalMs, threshold } = req.body;
      const patch: any = {};
      if (typeof enabled    === "boolean") patch.enabled    = enabled;
      if (typeof intervalMs === "number")  patch.intervalMs = Math.max(30_000, intervalMs);
      if (typeof threshold  === "number")  patch.threshold  = Math.max(1, threshold);
      updateAuditorConfig(patch);
      const { getAuditorStatus } = await import("./blockchain_auditor");
      res.json({ success: true, ...getAuditorStatus() });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/blockchain-auditor/trigger", authenticate, async (req: Request, res: Response) => {
    try {
      const { triggerAuditCycle } = await import("./blockchain_auditor");
      const result = await triggerAuditCycle();
      res.json({ success: true, result });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Spectral Workspace — Video API ────────────────────────────────────────
  // Upload a video clip via multipart/form-data, encode title → wavelength, store

  app.post("/api/spectral-workspace/video", authenticate, (req: Request, res: Response) => {
    videoUpload.single("file")(req, res, async (uploadErr) => {
      try {
        if (uploadErr) {
          return res.status(400).json({ error: uploadErr.message });
        }
        const file = (req as any).file as Express.Multer.File | undefined;
        const { title, description } = req.body;

        if (!file) return res.status(400).json({ error: "No video file provided" });
        if (!title) return res.status(400).json({ error: "title is required" });

        const mimeType = file.mimetype;
        const fileSize = file.size;
        const filename = file.originalname;
        const videoData = file.buffer.toString("base64");

        const encodeText = `${title}${description ? ": " + description : ""}`;
        const encodeRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: encodeText, label: title }),
        });
        if (!encodeRes.ok) return res.status(502).json({ error: "Spectral encode failed" });
        const enc = await encodeRes.json() as any;

        const psiMatch = enc.psi_channel?.match(/Ψ\((\d+),\s*(\d+),\s*([HV])\)/);
        const wdm = psiMatch ? parseInt(psiMatch[1]) : 0;
        const oam = psiMatch ? parseInt(psiMatch[2]) : 0;
        const pol = psiMatch ? psiMatch[3] : "H";

        const { db } = await import("./db");
        const { videoUploads, spectralRecords } = await import("@shared/schema");
        const { randomUUID } = await import("crypto");

        const videoId = randomUUID();
        await db.insert(videoUploads).values({
          id: videoId,
          uploaderId: (req as any).user?.id ?? "anonymous",
          uploaderName: (req as any).user?.username ?? "anonymous",
          filename,
          mimeType,
          fileSize,
          videoData,
          status: "ready",
        });

        const nm = enc.wavelength_mid_nm ?? 550;
        const band = nm < 450 ? "SYSTEM" : nm < 520 ? "AUTH" : nm < 625 ? "USER" : "GUEST";

        const [record] = await db.insert(spectralRecords).values({
          id: randomUUID(),
          label: title,
          content: description ?? title,
          wavelengthNm: String(nm),
          psiChannel: enc.psi_channel ?? "Ψ(0,0,H)",
          wdm, oam, polarisation: pol,
          band,
          energyJoules: String(enc.energy_joules ?? 0),
          lambdaMassKg: String(enc.lambda_mass_kg ?? 0),
          frequencyHz: String(enc.frequency_hz ?? 0),
          data: { type: "video", videoId, mimeType, fileSize },
        }).returning();

        const { sql: dsVid } = await import("drizzle-orm");
        const uploadOrdinal = await depositOrdinalForInput({
          db, ds: dsVid,
          freqHz: parseFloat(String(enc.frequency_hz ?? 5.45e14)),
          wavelengthNm: parseFloat(String(nm)),
          psiChannel: enc.psi_channel ?? "Ψ(0,0,H)",
          band,
          operation: "UPLOAD",
          label: `VIDEO:${title}`,
          sourceRecordId: record.id,
          depositor: (req as any).user?.username ?? "system",
        }).catch(() => null);

        res.json({ success: true, record, spectral: enc, videoId,
          ordinal: uploadOrdinal ? { units: uploadOrdinal.ordinalUnits.toString(), nxt: (Number(uploadOrdinal.ordinalUnits) / 1e8).toFixed(8) } : null });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  app.get("/api/spectral-workspace/video/:id", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { videoUploads } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      // Return metadata only (no videoData blob) for the info endpoint
      const [video] = await db.select({
        id: videoUploads.id, uploaderId: videoUploads.uploaderId,
        uploaderName: videoUploads.uploaderName, filename: videoUploads.filename,
        mimeType: videoUploads.mimeType, fileSize: videoUploads.fileSize,
        duration: videoUploads.duration, status: videoUploads.status,
        createdAt: videoUploads.createdAt,
      }).from(videoUploads).where(eq(videoUploads.id, req.params.id));
      if (!video) return res.status(404).json({ error: "Video not found" });
      res.json({ video });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Video stream — serves raw binary so <video> tags can play it ───────────
  app.get("/api/spectral-workspace/video/:id/stream", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { videoUploads } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [video] = await db.select().from(videoUploads).where(eq(videoUploads.id, req.params.id));
      if (!video) return res.status(404).json({ error: "Video not found" });
      if (!video.videoData) return res.status(404).json({ error: "No video data stored" });

      const mimeType = video.mimeType || "video/mp4";
      const buf = Buffer.from(video.videoData, "base64");
      const total = buf.length;
      const rangeHeader = req.headers.range;

      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=3600");

      if (rangeHeader) {
        const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(startStr, 10);
        const end   = endStr ? parseInt(endStr, 10) : total - 1;
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader("Content-Range",  `bytes ${start}-${end}/${total}`);
        res.setHeader("Content-Length", chunkSize);
        res.end(buf.slice(start, end + 1));
      } else {
        res.setHeader("Content-Length", total);
        res.end(buf);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Network Node Discovery ─────────────────────────────────────────────────

  function ceseEncode(name: string): { wavelengthNm: number; frequencyThz: number; psiChannel: string; emissionBand: string } {
    const codes = name.toUpperCase().split("").map((c: string) => c.charCodeAt(0)).filter((c: number) => c >= 32 && c <= 126);
    if (!codes.length) codes.push(77); // fallback to 'M'
    const avg = codes.reduce((a: number, b: number) => a + b, 0) / codes.length;
    const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(4));
    const thz = parseFloat((299792458 / (nm * 1e-9) / 1e12).toFixed(4));
    const wdm = Math.floor((nm - 380) / 4) + 1;
    const oam = codes.reduce((a: number, b: number) => a + b, 0) % 100;
    const pol = codes.length % 2 === 0 ? "H" : "V";
    let band = "YELLOW";
    if (nm < 450) band = "VIOLET";
    else if (nm < 495) band = "BLUE";
    else if (nm < 520) band = "CYAN";
    else if (nm < 565) band = "GREEN";
    else if (nm < 590) band = "YELLOW";
    else if (nm < 625) band = "ORANGE";
    else band = "RED";
    return { wavelengthNm: nm, frequencyThz: thz, psiChannel: `Ψ(${wdm},${oam},${pol})`, emissionBand: band };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // WNSP REGISTRY — Spectral address bridge (TCP/IP overlay for wnsp:// URIs)
  // Phase 1: HTTP. Phase 2: native photonic when Moore's law hardware arrives.
  // CE→SE (WASCII v1.0): every label derives a deterministic Ψ(wdm,oam,pol) address.
  // ════════════════════════════════════════════════════════════════════════════

  // ── CE→SE helper (server-side WASCII v1.0) ──────────────────────────────
  function ceSe(text: string) {
    const codes = text.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
    const sum   = codes.reduce((a, b) => a + b, 0);
    const avg   = sum / (codes.length || 1);
    const nm    = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(4));
    const wdm   = Math.floor((nm - 380) / 4) + 1;
    const oam   = sum % 100;
    const pol   = codes.length % 2 === 0 ? "H" : "V";
    const band  = nm < 450 ? "VIOLET" : nm < 495 ? "BLUE" : nm < 520 ? "CYAN" : nm < 565 ? "GREEN" : nm < 590 ? "YELLOW" : nm < 625 ? "ORANGE" : "RED";
    const slug  = text.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return { nm, wdm, oam, pol, band, psi: `Ψ(${wdm},${oam},${pol})`, uri: `wnsp://Ψ(${wdm},${oam},${pol})/${slug}` };
  }

  // ── WNSP Density Equation helper (Node.js side) ────────────────────────────
  // D_channel = 1 · N_OAM · N_Pol · R_sym · M
  // D_energy  = D_channel · λ / (h · c)
  // This is the Λ=hf/c² curve applied per WDM channel:
  // higher WDM (longer λ, lower compression state) → lower energy per photon
  // → more symbols per joule → cheaper communication.
  function channelDensity(wdm: number, rSym = 2, m = 1) {
    const h           = 6.62607015e-34;          // Planck's constant
    const c           = 299_792_458;             // speed of light
    const N_OAM       = 50;
    const N_POL       = 2;
    const wdmClamped  = Math.max(1, Math.min(256, wdm));
    const wavelengthNm = 380 + (wdmClamped - 1) * 4 + 2;   // centre of WDM band
    const wavelengthM = wavelengthNm * 1e-9;
    const freqHz      = c / wavelengthM;
    const energyJ     = h * freqHz;
    const energyEv    = energyJ / 1.602176634e-19;
    const lambdaMass  = energyJ / (c * c);
    const subChannels = N_OAM * N_POL;           // 100 per WDM slot
    const dChannel    = subChannels * rSym * m;
    const dEnergy     = dChannel * wavelengthM / (h * c);
    return {
      equation:          "D_channel = 1 · N_OAM · N_Pol · R_sym · M",
      energy_equation:   "D_energy = D_channel · λ / (h · c)",
      wdm_band:          wdmClamped,
      wavelength_nm:     parseFloat(wavelengthNm.toFixed(2)),
      frequency_thz:     parseFloat((freqHz / 1e12).toFixed(4)),
      energy_ev:         parseFloat(energyEv.toFixed(4)),
      energy_joules:     energyJ,
      lambda_mass_kg:    lambdaMass,
      sub_channels:      subChannels,
      d_channel:         dChannel,                  // symbols / cycle at this WDM slot
      d_energy_per_joule: parseFloat(dEnergy.toFixed(2)),
      r_sym:             rSym,
      m,
      hilbert_note:      `This WDM band contributes ${subChannels} of the 25,600 Hilbert channels (${N_OAM} OAM × ${N_POL} Pol).`,
      compression_note:  `Higher λ = lower compression state = lower energy per photon = higher symbols/joule.`,
    };
  }

  // ── Public registry — list all public addresses ────────────────────────
  app.get("/api/wnsp/registry", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspRegistry } = await import("@shared/schema");
      const { desc, eq } = await import("drizzle-orm");
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const resourceType = req.query.type as string | undefined;

      const query = db.select().from(wnspRegistry)
        .where(eq(wnspRegistry.isPublic, true))
        .orderBy(desc(wnspRegistry.createdAt))
        .limit(limit);

      const entries = await (resourceType
        ? db.select().from(wnspRegistry).where(eq(wnspRegistry.resourceType, resourceType)).orderBy(desc(wnspRegistry.createdAt)).limit(limit)
        : query);

      res.json({ entries, total: entries.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Resolve a Ψ address → resource ────────────────────────────────────
  // GET /api/wnsp/resolve?psi=Ψ(39,7,H)&path=nexus
  app.get("/api/wnsp/resolve", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspRegistry } = await import("@shared/schema");
      const { eq, ilike, or } = await import("drizzle-orm");
      const psi  = decodeURIComponent((req.query.psi as string) || "");
      const path = decodeURIComponent((req.query.path as string) || "");
      const uri  = req.query.uri as string | undefined;

      if (!psi && !uri) return res.status(400).json({ error: "Provide psi or uri query param" });

      const lookupUri = uri || `wnsp://${psi}/${path}`.replace(/\/+$/, "");
      const lookupPsi = psi || lookupUri.match(/Ψ\([^)]+\)/)?.[0] || "";

      // exact URI match first, then Ψ channel match
      let entries = await db.select().from(wnspRegistry).where(eq(wnspRegistry.wnspUri, lookupUri));
      if (entries.length === 0 && lookupPsi) {
        entries = await db.select().from(wnspRegistry).where(eq(wnspRegistry.psiChannel, lookupPsi));
      }

      // increment resolve count
      if (entries.length > 0) {
        const { sql: dsql } = await import("drizzle-orm");
        await db.update(wnspRegistry)
          .set({ resolveCount: dsql`${wnspRegistry.resolveCount} + 1` })
          .where(eq(wnspRegistry.id, entries[0].id));
      }

      // also search spectral DB for records at this channel
      const { spectralRecords } = await import("@shared/schema");
      const spectral = lookupPsi ? await db.select().from(spectralRecords).where(eq(spectralRecords.psiChannel, lookupPsi)).limit(10) : [];

      // add density at resolved channel compression state
      const wdmMatch = lookupPsi.match(/Ψ\((\d+),/);
      const resolvedDensity = wdmMatch ? channelDensity(parseInt(wdmMatch[1])) : null;
      res.json({ resolved: entries.length > 0, entries, spectral, query: { psi: lookupPsi, path, uri: lookupUri }, channel_density: resolvedDensity });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Lookup a user's canonical wnsp:// address ─────────────────────────
  app.get("/api/wnsp/user/:username", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { users: usersTable, wnspRegistry } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const { username } = req.params;

      const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
      if (!user) return res.status(404).json({ error: "User not found" });

      const enc = ceSe(username);

      // find or return computed address
      const [entry] = await db.select().from(wnspRegistry)
        .where(and(eq(wnspRegistry.resourceType, "user"), eq(wnspRegistry.resourceId, user.id)));

      res.json({
        username,
        userId: user.id,
        spectral: {
          psiChannel: enc.psi, wavelengthNm: enc.nm, wdm: enc.wdm, oam: enc.oam,
          polarisation: enc.pol, band: enc.band, wnspUri: enc.uri,
          httpUrl: `/profile/${username}`,
        },
        registered: !!entry,
        entry: entry ?? null,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Register a wnsp:// address (auth required) ─────────────────────────
  app.post("/api/wnsp/register", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspRegistry } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const { label, resourceType = "user", resourceId, httpUrl, description, isPublic = true } = req.body;

      if (!label) return res.status(400).json({ error: "label is required" });
      const enc = ceSe(label);

      // check for duplicate
      const [existing] = await db.select().from(wnspRegistry).where(eq(wnspRegistry.wnspUri, enc.uri));
      if (existing) return res.status(409).json({ error: "Address already registered", existing });

      const [entry] = await db.insert(wnspRegistry).values({
        wnspUri:      enc.uri,
        psiChannel:   enc.psi,
        wdm:          enc.wdm,
        oam:          enc.oam,
        polarisation: enc.pol,
        wavelengthNm: String(enc.nm),
        band:         enc.band,
        label,
        ceInput:      label,
        resourceType,
        resourceId:   resourceId ?? null,
        httpUrl:      httpUrl ?? null,
        description:  description ?? null,
        registeredBy: (req as any).user?.id,
        isPublic,
        isCanonical:  false,
      }).returning();

      res.status(201).json({ success: true, entry, spectral: enc, channel_density: channelDensity(enc.wdm) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Auto-register canonical user address ──────────────────────────────
  app.post("/api/wnsp/auto-register-me", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspRegistry } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const user = (req as any).user!;
      const enc  = ceSe(user.username);

      // idempotent: upsert by resource
      const [existing] = await db.select().from(wnspRegistry)
        .where(and(eq(wnspRegistry.resourceType, "user"), eq(wnspRegistry.resourceId, user.id)));
      if (existing) return res.json({ success: true, entry: existing, spectral: enc, created: false, channel_density: channelDensity(enc.wdm) });

      const [entry] = await db.insert(wnspRegistry).values({
        wnspUri:      enc.uri,
        psiChannel:   enc.psi,
        wdm:          enc.wdm,
        oam:          enc.oam,
        polarisation: enc.pol,
        wavelengthNm: String(enc.nm),
        band:         enc.band,
        label:        user.username,
        ceInput:      user.username,
        resourceType: "user",
        resourceId:   user.id,
        httpUrl:      `/profile/${user.username}`,
        description:  `Canonical spectral identity for ${user.username}`,
        registeredBy: user.id,
        isPublic:     true,
        isCanonical:  true,
      }).returning();

      const cd = channelDensity(enc.wdm);
      res.status(201).json({ success: true, entry, spectral: enc, created: true, channel_density: cd });
    } catch (err: any) {
      if (err.message?.includes("unique")) {
        const e2 = ceSe((req as any).user!.username);
        return res.json({ success: true, note: "Address already claimed at this channel", spectral: e2, channel_density: channelDensity(e2.wdm) });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // ── Preview CE→SE for any text without storing ─────────────────────────
  app.get("/api/wnsp/preview", async (req: Request, res: Response) => {
    const text = (req.query.text as string) || "";
    if (!text) return res.status(400).json({ error: "text is required" });
    const enc = ceSe(text);
    res.json({
      ...enc,
      channel_density: channelDensity(enc.wdm),
    });
  });

  // ── Public profile endpoint ───────────────────────────────────────────
  app.get("/api/profile/:username", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { users: usersTable, wallets, spectralRecords, wnspRegistry, blockchainTxPool } = await import("@shared/schema");
      const { eq, and, desc, count } = await import("drizzle-orm");
      const { username } = req.params;

      const [user] = await db.select({
        id: usersTable.id, username: usersTable.username,
        role: usersTable.role, createdAt: usersTable.createdAt,
      }).from(usersTable).where(eq(usersTable.username, username));

      if (!user) return res.status(404).json({ error: "User not found" });

      // wallet (public address only)
      const [wallet] = await db.select({ address: wallets.address })
        .from(wallets).where(eq(wallets.userId, user.id));

      // wnsp identity
      const enc = ceSe(username);
      const [wnspEntry] = await db.select().from(wnspRegistry)
        .where(and(eq(wnspRegistry.resourceType, "user"), eq(wnspRegistry.resourceId, user.id)));

      // spectral records at the user's canonical Ψ channel (content at their wavelength)
      const channelRecords = await db.select({
        id: spectralRecords.id, label: spectralRecords.label,
        band: spectralRecords.band, wavelengthNm: spectralRecords.wavelengthNm,
        psiChannel: spectralRecords.psiChannel, data: spectralRecords.data,
        createdAt: spectralRecords.createdAt,
      }).from(spectralRecords)
        .where(eq(spectralRecords.psiChannel, enc.psi))
        .orderBy(desc(spectralRecords.createdAt))
        .limit(12);

      // blockchain tx count (sent from their wallet)
      const [{ value: txCount }] = wallet
        ? await db.select({ value: count() }).from(blockchainTxPool).where(eq(blockchainTxPool.fromAddress, wallet.address))
        : [{ value: 0 }];

      // wnsp addresses they registered
      const registered = await db.select().from(wnspRegistry)
        .where(eq(wnspRegistry.registeredBy, user.id))
        .orderBy(desc(wnspRegistry.createdAt)).limit(20);

      const profileDensity = channelDensity(enc.wdm);
      res.json({
        user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt },
        wallet: wallet ? { address: wallet.address } : null,
        spectral: {
          ...enc, registered: !!wnspEntry, entry: wnspEntry ?? null,
          httpUrl: `/profile/${username}`,
        },
        channel_density: profileDensity,
        content: { recent: channelRecords, total: channelRecords.length },
        blockchain: { txCount: Number(txCount) },
        wnspAddresses: registered,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/network/nodes", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const nodes = await storage.getNetworkNodes(status);
      const active = nodes.filter(n => {
        const secsSince = (Date.now() - new Date(n.lastBeaconAt).getTime()) / 1000;
        return n.status === "active" && secsSince < 300;
      }).length;
      res.json({ nodes, total: nodes.length, active });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get network nodes" });
    }
  });

  app.post("/api/network/nodes/register", authenticate, async (req, res) => {
    try {
      const { name, purpose, endpoint, capabilities = [] } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });
      const spectral = ceseEncode(name);
      const nodeKey = `${req.user!.id}-${name.toLowerCase().replace(/\s+/g, "-")}`;
      const node = await storage.registerNetworkNode({
        nodeKey,
        name,
        purpose: purpose || null,
        wavelengthNm: spectral.wavelengthNm.toString(),
        frequencyThz: spectral.frequencyThz.toString(),
        psiChannel: spectral.psiChannel,
        emissionBand: spectral.emissionBand,
        status: "active",
        endpoint: endpoint || null,
        capabilities: Array.isArray(capabilities) ? capabilities : [],
        lastBeaconAt: new Date(),
      });
      res.status(201).json({ node, spectral });
    } catch (error: any) {
      console.error("Register node error:", error);
      res.status(500).json({ error: "Failed to register node" });
    }
  });

  app.post("/api/network/nodes/:nodeKey/beacon", authenticate, async (req, res) => {
    try {
      const node = await storage.beaconNetworkNode(req.params.nodeKey);
      res.json({ node, beaconedAt: new Date() });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to beacon node" });
    }
  });

  app.get("/api/spectral-workspace/videos", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { videoUploads } = await import("@shared/schema");
      const { sql: drizzleSql, desc } = await import("drizzle-orm");
      const videos = await db.select({
        id: videoUploads.id,
        uploaderId: videoUploads.uploaderId,
        uploaderName: videoUploads.uploaderName,
        filename: videoUploads.filename,
        mimeType: videoUploads.mimeType,
        fileSize: videoUploads.fileSize,
        duration: videoUploads.duration,
        status: videoUploads.status,
        createdAt: videoUploads.createdAt,
      }).from(videoUploads)
        .where(drizzleSql`${videoUploads.status} = 'ready'`)
        .orderBy(desc(videoUploads.createdAt));
      res.json({ videos, count: videos.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
