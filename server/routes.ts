import path from "path";
import * as nostrService from "./nostr-service.js";
import crypto from "crypto";
import { bech32 as _bech32 } from "bech32";
import * as tinySecp from "tiny-secp256k1";
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
import { deriveChannel, calcFee, hasAuthority, getBand, LIVE_BURNS, LIVE_FEES, applyGovernanceParam, checkC0001, checkC0002, checkC0005, IHR_FLOOR_NXT, NON_DOMINANCE_PCT, GENESIS_EXECUTION_ADDRESS } from "./physics";

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

// ── Live mempool cache (shared across all routes) ────────────────────────────
const _mpCache: { data: any; at: number } = { data: null, at: 0 };
async function _fetchLiveMempool() {
  if (Date.now() - _mpCache.at < 60_000 && _mpCache.data) return _mpCache.data;
  try {
    const sig = AbortSignal.timeout(7_000);
    const [fRes, mRes] = await Promise.allSettled([
      fetch("https://mempool.space/api/v1/fees/recommended", { signal: sig }),
      fetch("https://mempool.space/api/mempool", { signal: sig }),
    ]);
    const fees = fRes.status === "fulfilled" && fRes.value.ok ? await fRes.value.json() : null;
    const mp   = mRes.status === "fulfilled" && mRes.value.ok ? await mRes.value.json() : null;
    const fast    = fees?.fastestFee ?? 50;
    const medium  = fees?.halfHourFee ?? 20;
    const slow    = fees?.hourFee ?? 8;
    const economy = fees?.economyFee ?? 3;
    const lvl = medium >= 100 ? "extreme" : medium >= 30 ? "high" : medium >= 8 ? "medium" : "low";
    const yieldBoost = medium >= 100 ? 1.25 : medium >= 30 ? 1.15 : medium >= 8 ? 1.05 : 1.0;
    const d = {
      fast, medium, slow, economy,
      congestionLevel: lvl,
      yieldBoost,
      pendingTxs: mp?.count ?? null,
      pendingMb: mp ? +(mp.vsize / 1_000_000).toFixed(2) : null,
      confirmEta: { fast: 10, medium: 30, slow: 60, economy: 180 },
      fetchedAt: new Date().toISOString(),
    };
    _mpCache.data = d; _mpCache.at = Date.now();
    return d;
  } catch { return _mpCache.data; }
}

// ── Telegram fee-alert subscriber registry (in-memory, keyed by chat_id) ────
const _feeAlertSubs = new Set<string>();
let _lastFeeAlertSentAt = 0; // epoch ms — 1-hour cooldown
let _prevFeesWereLow = false;

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
      // ── REGISTRATION CLOSED ──────────────────────────────────────────────
      // NexusOS is in closed genesis phase. Only existing 500M NXT holders
      // may access the network. New registrations are not accepted.
      return res.status(403).json({
        error: "Registration is currently closed. NexusOS is in closed genesis phase — only existing members may log in.",
      });
      // ────────────────────────────────────────────────────────────────────

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

      // ── Assign deterministic spectral channel from username hash ──────────
      try {
        const ch = deriveChannel(username);
        await storage.updateUserSpectral(user.id, { wdm: ch.wdm, oam: ch.oam, pol: ch.pol, nm: ch.nm, band: ch.band });
      } catch (_e) { /* non-blocking */ }

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

      res.cookie("auth_token", session.token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });

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

      res.cookie("auth_token", session.token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });

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

  app.post("/api/auth/recover", async (req: Request, res: Response) => {
    try {
      const { username, newPassword, recoveryKey } = req.body;
      if (!username || !newPassword || !recoveryKey)
        return res.status(400).json({ error: "username, newPassword, and recoveryKey required" });
      if (newPassword.length < 8)
        return res.status(400).json({ error: "Password must be at least 8 characters" });

      const wif = process.env.BTC_INSCRIPTION_WALLET_WIF ?? "";
      const trimmed = recoveryKey.trim();
      if (!wif || trimmed !== wif.trim())
        return res.status(401).json({ error: "Invalid recovery key" });

      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(404).json({ error: "User not found" });

      const bcrypt = await import("bcrypt");
      const hash = await bcrypt.hash(newPassword, 12);
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));

      await logAction(req, "password_recovered", "auth", user.id, {}, "success", "Recovery via wallet key");
      res.json({ ok: true, message: "Password updated — you can now log in" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/auth/logout", authenticate, async (req, res) => {
    try {
      if (req.session) {
        await storage.deleteSession(req.session.id);
      }
      await logAction(req, "user_logout", "auth", req.user?.id);
      res.clearCookie("auth_token", { path: "/" });
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // ── Nexus Operations Lab Tier Donations ────────────────────────────────
  const LAB_TIER_DEF = [
    { tier: -1, name: "Quanta",       nxt: 1_000,       usd: "$1",      zone: "Community Supporter" },
    { tier: 0,  name: "Signal",       nxt: 10_000,      usd: "$10",     zone: "Community Supporter" },
    { tier: 1,  name: "Photon",       nxt: 50_000,      usd: "$50",     zone: "ESD Workstation" },
    { tier: 2,  name: "Wavelength",   nxt: 250_000,     usd: "$250",    zone: "Spectrometer Suite" },
    { tier: 3,  name: "Spectrum",     nxt: 1_000_000,   usd: "$1,000",  zone: "SNIC Fabrication Bench" },
    { tier: 4,  name: "Relay",        nxt: 5_000_000,   usd: "$5,000",  zone: "PHR-1 Alignment Chamber" },
    { tier: 5,  name: "Genesis Node", nxt: 25_000_000,  usd: "$25,000", zone: "Optical Testing Bay + Server Room" },
  ];

  app.post("/api/campaign/donate", authenticate, async (req, res) => {
    try {
      const tierNum = Number(req.body.tier);
      const tierDef = LAB_TIER_DEF.find(t => t.tier === tierNum);
      if (!tierDef) return res.status(400).json({ error: "Invalid tier" });

      const user = req.user!;
      const userWallet = await storage.getWallet(user.id);
      if (!userWallet) return res.status(404).json({ error: "Wallet not found" });

      const genesisWallet = await storage.getWalletByAddress(GENESIS_EXECUTION_ADDRESS);
      if (!genesisWallet) return res.status(503).json({ error: "Genesis wallet unavailable" });

      const genesisBalance = parseFloat(genesisWallet.balance);
      if (genesisBalance < tierDef.nxt) {
        return res.status(400).json({ error: "Hardware campaign pool exhausted" });
      }

      // Spectral channel
      const wdm          = user.spectralWdm ?? 100;
      const oam          = user.spectralOam ?? 25;
      const pol          = user.spectralPolarisation ?? "H";
      const wavelengthNm = parseFloat((380 + (wdm / 256) * 400).toFixed(4));
      const frequencyHz  = (3e8) / (wavelengthNm * 1e-9);
      const energyJ      = 6.626e-34 * frequencyHz;
      const psiChannel   = `Ψ(${wdm},${oam},${pol})`;
      const band         = getBand(wavelengthNm);

      // Transfer NXT: Genesis → user wallet
      await storage.updateWalletBalance(genesisWallet.id, (genesisBalance - tierDef.nxt).toFixed(8));
      const userBalance = parseFloat(userWallet.balance);
      await storage.updateWalletBalance(userWallet.id, (userBalance + tierDef.nxt).toFixed(8));

      const ts = new Date().toISOString();

      const tx = await storage.createTransaction({
        fromWalletId: genesisWallet.id,
        toWalletId:   userWallet.id,
        amount:       tierDef.nxt.toFixed(8),
        fee:          "0.00000000",
        type:         "lab_donation",
        wavelength:   wavelengthNm.toString(),
        frequency:    frequencyHz.toFixed(2),
        energyCost:   energyJ.toExponential(8),
        metadata: {
          tier: tierNum,
          tierName: tierDef.name,
          zone: tierDef.zone,
          usd: tierDef.usd,
          psiChannel,
          walletAddress: userWallet.address,
          timestamp: ts,
          source: "nexus_operations_lab_funding",
          github: "https://github.com/nexusosdaily-code/NexusOS",
        },
      });

      await storage.updateTransactionStatus(tx.id, "confirmed");

      // Build spectral contract — community tiers get a shareholder/public-ownership
      // declaration; hardware lab tiers get a lab-access contract.
      const isCommunityTier = tierNum <= 0;

      const contractLines = isCommunityTier ? [
        "NEXUSOS COMMUNITY SHAREHOLDER DECLARATION v1.0",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "This document certifies that the named contributor is a permanent shareholder",
        "and co-owner of NexusOS — a free, open-source, publicly owned civilisation",
        "infrastructure project licensed under the GNU Affero General Public License v3.0.",
        "",
        "CONTRIBUTOR          : " + user.username,
        `CONTRIBUTOR CHANNEL  : ${psiChannel}`,
        `WAVELENGTH           : ${wavelengthNm}nm`,
        `AUTHORITY BAND       : ${band}`,
        `WALLET ADDRESS       : ${userWallet.address}`,
        `CONTRIBUTION TIER    : ${tierDef.name} (Community Tier ${tierNum})`,
        `NXT ALLOCATION       : ${tierDef.nxt.toLocaleString()} NXT`,
        `USD CONTRIBUTION     : ${tierDef.usd}`,
        `TRANSACTION ID       : ${tx.id}`,
        `TIMESTAMP            : ${ts}`,
        "",
        "SHAREHOLDER RIGHTS",
        "By contributing to NexusOS, this holder becomes a permanent on-chain",
        "shareholder of the NexusOS publicly owned photonic infrastructure network.",
        "This includes present and future WNSP spectral relay nodes, SNIC photonic",
        "compute units, PHR-1 routing hardware, and all derivative public works",
        "produced under the NexusOS AGPL-3.0 open-source programme.",
        "",
        "Shareholder status is non-revocable, non-expiring, and recorded immutably",
        "on the NexusOS physics-based blockchain. No individual, company, government,",
        "or future operator of this infrastructure may revoke this declaration.",
        "",
        "PHYSICAL ACCESS NOTE",
        "Community tier shareholders do not receive physical lab access. Their",
        "ownership is of the public infrastructure layer — the open-source software,",
        "hardware specifications, spectral protocols, and WNSP network capacity",
        "that this infrastructure enables for all of humanity.",
        "",
        "CIVILISATION MANDATE",
        "NexusOS is designed to outlast any individual contributor, founder, or",
        "operator. This system is built for civilisation — not for any single",
        "person, company, or era. This shareholder declaration is therefore",
        "permanent by design: it persists on-chain regardless of whether any",
        "founding team member is alive or active.",
        "",
        "COPYRIGHT & LICENCE COMPLIANCE",
        "All NexusOS software, hardware schematics, spectral protocols, and",
        "associated intellectual works are published under AGPL-3.0.",
        "This licence guarantees the following rights to all shareholders:",
        "  · Freedom to use, study, and run the software for any purpose",
        "  · Freedom to distribute copies of the software",
        "  · Freedom to modify the software and distribute modified versions",
        "  · All derivative works and modifications must remain AGPL-3.0",
        "  · Any network use of this software must make full source available",
        "",
        "No proprietary fork, acquisition, or transfer of control can strip these",
        "rights from this shareholder or from the public. The AGPL-3.0 licence is",
        "irrevocable once applied to any published work.",
        "",
        "GITHUB REPOSITORY    : https://github.com/nexusosdaily-code/NexusOS",
        "FIRST DISCLOSURE     : 2026-05-16 (SNIC · PHR-1 · Spectral Relay Mesh v1)",
        "HARDWARE SPEC        : /hardware-spec (AGPL-3.0 Protected)",
        "LICENSE              : GNU Affero General Public License v3.0",
        "",
        "SPECTRAL OWNERSHIP RECORD",
        `This shareholder's permanent spectral address is ${psiChannel}.`,
        "This channel is registered on-chain as a NexusOS Community Founder.",
        "It is encoded in the WNSP network fabric and cannot be reassigned.",
        "",
        "Signed under NexusOS Physics Engine v1.0 · WNSP-CE v1.0 · WNSP-SE v1.0",
        "This is a physics-signed public ownership declaration.",
        "It is not a financial instrument. It confers no expectation of profit.",
        "It confers permanent co-ownership of publicly held open infrastructure.",
      ] : [
        "NEXUSOS LAB CONTRIBUTION CONTRACT v1.0",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
        "This document certifies a contribution to the Nexus Operations Hardware Lab",
        "— a free public works infrastructure project, open-source under AGPL-3.0.",
        "",
        `CONTRIBUTOR CHANNEL  : ${psiChannel}`,
        `WAVELENGTH           : ${wavelengthNm}nm`,
        `AUTHORITY BAND       : ${band}`,
        `WALLET ADDRESS       : ${userWallet.address}`,
        `CONTRIBUTION TIER    : ${tierDef.name} (Tier ${tierNum})`,
        `NXT ALLOCATION       : ${tierDef.nxt.toLocaleString()} NXT`,
        `USD EQUIVALENT       : ${tierDef.usd}`,
        `LAB ZONE FUNDED      : ${tierDef.zone}`,
        `TRANSACTION ID       : ${tx.id}`,
        `TIMESTAMP            : ${ts}`,
        "",
        "OPEN-SOURCE COMMITMENT",
        "All hardware schematics, calibration data, and test results produced by",
        "Nexus Operations are published under AGPL-3.0 as permanent public works.",
        "No intellectual property restrictions apply to any facility output.",
        "",
        "GITHUB REPOSITORY    : https://github.com/nexusosdaily-code/NexusOS",
        "FIRST DISCLOSURE     : 2026-05-16 (SNIC · PHR-1 · Spectral Relay Mesh v1 · WavelengthScript Compiler α)",
        "HARDWARE SPEC        : /hardware-spec (AGPL-3.0 Protected)",
        "LICENSE              : GNU Affero General Public License v3.0",
        "",
        "WAVE CHANNEL OPERABILITY",
        `The contributor's spectral address ${psiChannel} is permanently registered`,
        "as a Nexus Operations Founding Contributor. This channel receives",
        "tier-appropriate hardware access rights on the WNSP network.",
        "",
        "Signed under NexusOS Physics Engine v1.0 · WNSP-CE v1.0 · WNSP-SE v1.0",
        "This contract is a free public works declaration, not a financial instrument.",
      ];
      const contractText = contractLines.join("\n");

      // WNSP spectral signature (SHA-256 ⊕ hex(λ_signer))
      const contentHash = crypto.createHash("sha256").update(contractText, "utf8").digest("hex");
      const nmHex       = Math.round(wavelengthNm * 100).toString(16).padStart(8, "0");
      const nmRepeated  = nmHex.repeat(Math.ceil(contentHash.length / nmHex.length)).slice(0, contentHash.length);
      let rawSig = "";
      for (let i = 0; i < contentHash.length; i += 2) {
        rawSig += ((parseInt(contentHash.slice(i, i + 2), 16) ^ parseInt(nmRepeated.slice(i, i + 2), 16)) & 0xff)
          .toString(16).padStart(2, "0");
      }
      const sigBody   = `WNSP-SIG-v1::${user.username}::${psiChannel}::${wavelengthNm}::${rawSig}`;
      const checkHash = crypto.createHash("sha256").update(sigBody, "utf8").digest("hex");
      const signature = `WNSP-SIG-v1::${user.username}::${wavelengthNm}::${rawSig.slice(0, 16)}…::${checkHash.slice(0, 8)}`;

      await logAction(req, "lab_donation", "campaign", tx.id, {
        tier: tierNum, tierName: tierDef.name, nxt: tierDef.nxt, psiChannel,
      }, "success");

      res.json({
        txId:          tx.id,
        tier:          tierNum,
        tierName:      tierDef.name,
        nxtAllocation: tierDef.nxt,
        nxtLabel:      `${tierDef.nxt.toLocaleString()} NXT`,
        usd:           tierDef.usd,
        zone:          tierDef.zone,
        psiChannel,
        wavelengthNm,
        band,
        walletAddress: userWallet.address,
        contractText,
        signature,
        contentHash:   contentHash.slice(0, 16) + "…",
        timestamp:     ts,
        newBalance:    (userBalance + tierDef.nxt).toFixed(8),
      });
    } catch (error: any) {
      console.error("Campaign donate error:", error);
      res.status(500).json({ error: "Donation recording failed" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
      const user   = req.user!;
      const wallet = await storage.getWallet(user.id);

      // Ensure spectral channel is assigned (backfill if missing)
      let spectral = {
        wdm:  user.spectralWdm,
        oam:  user.spectralOam,
        pol:  user.spectralPol,
        nm:   user.spectralNm,
        band: user.spectralBand,
      };
      if (spectral.wdm == null) {
        const ch = deriveChannel(user.username);
        await storage.updateUserSpectral(user.id, ch);
        spectral = { wdm: ch.wdm, oam: ch.oam, pol: ch.pol, nm: ch.nm, band: ch.band };
      }

      const ch     = deriveChannel(user.username);
      const feeMsg = calcFee("message_send", spectral.wdm ?? ch.wdm);

      res.json({
        user: {
          id:          user.id,
          username:    user.username,
          email:       user.email,
          role:        user.role,
          isVerified:  user.isVerified,
          spectralWdm: spectral.wdm,
          spectralOam: spectral.oam,
          spectralPol: spectral.pol,
          spectralNm:  spectral.nm,
          spectralBand: spectral.band,
          psi: `Ψ(${spectral.wdm},${spectral.oam},${spectral.pol})`,
        },
        wallet: wallet ? {
          address:       wallet.address,
          balance:       wallet.balance,
          lockedBalance: wallet.lockedBalance,
        } : null,
        physics: {
          messageFeeNxt:  feeMsg.feeNxt,
          multiplier:     feeMsg.multiplier.toFixed(4),
          energyJ:        feeMsg.energyJ.toExponential(4),
          lambdaKg:       (feeMsg.energyJ / (299792458 ** 2)).toExponential(4),
          frequencyTHz:   (feeMsg.frequencyHz / 1e12).toFixed(4),
        },
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // ── Physics Profile ────────────────────────────────────────────────────────
  app.get("/api/physics/my", authenticate, async (req, res) => {
    try {
      const user   = req.user!;
      const wdm    = user.spectralWdm ?? 200;
      const ch     = deriveChannel(user.username);

      const fees = {
        message_send:    calcFee("message_send",    wdm),
        stream_start:    calcFee("stream_start",    wdm),
        document_create: calcFee("document_create", wdm),
        upload_mb:       calcFee("upload_mb",       wdm, { fileSizeBytes: 1024 * 1024 }),
        wallet_transfer: calcFee("wallet_transfer", wdm, { transferAmount: 100 }),
      };

      res.json({
        username: user.username,
        channel: {
          wdm:  user.spectralWdm ?? ch.wdm,
          oam:  user.spectralOam ?? ch.oam,
          pol:  user.spectralPol ?? ch.pol,
          nm:   user.spectralNm  ?? ch.nm,
          band: user.spectralBand ?? ch.band,
          psi:  `Ψ(${user.spectralWdm ?? ch.wdm},${user.spectralOam ?? ch.oam},${user.spectralPol ?? ch.pol})`,
          uri:  `wnsp://Ψ(${user.spectralWdm ?? ch.wdm},${user.spectralOam ?? ch.oam},${user.spectralPol ?? ch.pol})/${user.username.toLowerCase()}`,
          frequencyTHz: (ch.frequencyHz / 1e12).toFixed(4),
          energyJ:      ch.energyJ.toExponential(6),
          lambdaKg:     ch.lambdaKg.toExponential(6),
        },
        fees: Object.fromEntries(
          Object.entries(fees).map(([action, f]) => [
            action,
            {
              feeNxt:       f.feeNxt,
              baseFeeNxt:   f.baseFeeNxt,
              multiplier:   parseFloat(f.multiplier.toFixed(4)),
              wavelengthNm: f.wavelengthNm,
              energyJ:      f.energyJ.toExponential(6),
              band:         f.band,
            },
          ]),
        ),
        authority: {
          band:          user.spectralBand ?? ch.band,
          canSendMessages:    true,
          canStartStreams:     true,
          canCreateDocuments: true,
          canAccessKernel:    hasAuthority(wdm, "KERNEL"),
          canAccessSystem:    hasAuthority(wdm, "SYSTEM"),
          canGovernance:      hasAuthority(wdm, "KERNEL"),
        },
      });
    } catch (error: any) {
      console.error("Physics profile error:", error);
      res.status(500).json({ error: "Failed to get physics profile" });
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

  // ── Account settings — update profile (email, avatar, location, bio) ────────
  app.patch("/api/settings/profile", authenticate, async (req: Request, res: Response) => {
    try {
      const { email, country, stateRegion, bio, avatarUrl } = req.body;
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // validate email if provided
      if (email !== undefined && email !== null && email !== "") {
        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email)) return res.status(400).json({ error: "Invalid email address" });
        // check uniqueness
        const existing = await db.select({ id: users.id }).from(users)
          .where(eq(users.email, email));
        if (existing.length > 0 && existing[0].id !== req.user!.id)
          return res.status(409).json({ error: "Email already in use by another account" });
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (email      !== undefined) updates.email       = email || null;
      if (country    !== undefined) updates.country     = country || null;
      if (stateRegion!== undefined) updates.stateRegion = stateRegion || null;
      if (bio        !== undefined) updates.bio         = bio || null;
      if (avatarUrl  !== undefined) updates.avatarUrl   = avatarUrl || null;

      await db.update(users).set(updates).where(eq(users.id, req.user!.id));
      const [updated] = await db.select({
        email: users.email, country: users.country,
        stateRegion: users.stateRegion, bio: users.bio, avatarUrl: users.avatarUrl,
      }).from(users).where(eq(users.id, req.user!.id));
      res.json({ success: true, profile: updated });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Account settings — get profile ───────────────────────────────────────
  app.get("/api/settings/profile", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const [row] = await db.select({
        username: users.username, email: users.email,
        phoneNumber: users.phoneNumber, country: users.country,
        stateRegion: users.stateRegion, bio: users.bio, avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        spectralWdm: users.spectralWdm, spectralOam: users.spectralOam,
        spectralPol: users.spectralPol, spectralNm: users.spectralNm,
        spectralBand: users.spectralBand,
      }).from(users).where(eq(users.id, req.user!.id));
      res.json({ profile: row ?? null });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Account settings — change password ───────────────────────────────────
  app.post("/api/settings/password", authenticate, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword)
        return res.status(400).json({ error: "currentPassword and newPassword are required" });
      if (newPassword.length < 8)
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const valid = await storage.verifyPassword(user, currentPassword);
      if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
      const { default: bcrypt } = await import("bcrypt");
      const hash = await bcrypt.hash(newPassword, 12);
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, req.user!.id));
      res.json({ success: true, message: "Password updated successfully" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Wallet PIN routes ────────────────────────────────────────────────────
  app.get("/api/wallet/pin/status", authenticate, async (req: Request, res: Response) => {
    try {
      const pinSet = await storage.isPinSet(req.user!.id);
      res.json({ pinSet });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/wallet/pin/set", authenticate, async (req: Request, res: Response) => {
    try {
      const { pin, currentPin } = req.body;
      if (!pin || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: "PIN must be exactly 4 digits" });
      }
      const alreadySet = await storage.isPinSet(req.user!.id);
      if (alreadySet) {
        if (!currentPin) return res.status(400).json({ error: "Current PIN required to change PIN" });
        const valid = await storage.verifyWalletPin(req.user!.id, currentPin);
        if (!valid) return res.status(401).json({ error: "Current PIN is incorrect" });
      }
      await storage.setWalletPin(req.user!.id, pin);
      res.json({ success: true, message: alreadySet ? "PIN changed" : "PIN set" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/wallet/pin/verify", authenticate, async (req: Request, res: Response) => {
    try {
      const { pin } = req.body;
      if (!pin || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: "PIN must be exactly 4 digits" });
      }
      const valid = await storage.verifyWalletPin(req.user!.id, pin);
      res.json({ valid });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/wallet/transfer", authenticate, validateRequest(transferSchema), async (req, res) => {
    try {
      if (!await checkRateLimit(req, res, "/api/wallet/transfer", WALLET_RATE_LIMIT_MAX)) return;
      
      const { toAddress, amount, memo, pin } = req.body;

      // ── PIN enforcement ──────────────────────────────────────────────────
      const pinSet = await storage.isPinSet(req.user!.id);
      if (pinSet) {
        if (!pin) return res.status(401).json({ error: "Wallet PIN required", pinRequired: true });
        const pinValid = await storage.verifyWalletPin(req.user!.id, pin);
        if (!pinValid) return res.status(401).json({ error: "Incorrect wallet PIN", pinRequired: true });
      }
      
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

      // Physics fee: 0.1% of amount, wavelength derived from sender's actual spectral channel
      const senderWdm = req.user!.spectralWdm ?? 200;
      const physics   = calcFee("wallet_transfer", senderWdm, { transferAmount: amountNum });
      const fee        = parseFloat(physics.feeNxt);

      // ── Constitutional checks ─────────────────────────────────────────────
      const senderNewBalance    = balanceNum - amountNum - fee;
      const recipientNewBalance = parseFloat(toWallet.balance) + amountNum;
      const totalCirculating    = await storage.getTotalCirculatingSupply();

      const c0002 = checkC0002(senderNewBalance);
      if (!c0002.passed) {
        await logAction(req, "transfer_failed", "wallet", fromWallet.id, { amount, toAddress }, "failed", c0002.violation!.detail);
        return res.status(403).json({
          error: `Constitutional violation — ${c0002.violation!.rule}`,
          detail: c0002.violation!.detail,
          article: c0002.violation!.article,
        });
      }

      const c0001 = checkC0001(recipientNewBalance, totalCirculating, toAddress);
      if (!c0001.passed) {
        await logAction(req, "transfer_failed", "wallet", fromWallet.id, { amount, toAddress }, "failed", c0001.violation!.detail);
        return res.status(403).json({
          error: `Constitutional violation — ${c0001.violation!.rule}`,
          detail: c0001.violation!.detail,
          article: c0001.violation!.article,
        });
      }
      // ─────────────────────────────────────────────────────────────────────
      const wavelength = physics.wavelengthNm;
      const frequency  = physics.frequencyHz;
      const energyCost = physics.energyJ.toString();

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

      const newFromBalance = senderNewBalance.toFixed(8);
      const newToBalance = recipientNewBalance.toFixed(8);
      
      await storage.updateWalletBalance(fromWallet.id, newFromBalance);
      await storage.updateWalletBalance(toWallet.id, newToBalance);
      await storage.updateTransactionStatus(transaction.id, "confirmed");

      await logAction(req, "transfer_completed", "wallet", transaction.id, {
        from: fromWallet.address,
        to: toAddress,
        amount,
        fee: fee.toFixed(8),
      });

      // ── BTC auto-inscription hook ───────────────────────────────────────
      import("./btc-bridge-service").then(({ btcBridge }) => {
        btcBridge.triggerFromTransaction({
          id: transaction.id, type: "transfer", amount,
          fromWalletId: fromWallet.id, toWalletId: toWallet.id,
          wavelength: wavelength.toString(), frequency: frequency.toString(),
          status: "confirmed", triggeredBy: (req as any).user?.username ?? "user",
        }).catch(() => {});
      }).catch(() => {});

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

  // ══════════════════════════════════════════════════════════════════════════
  // STAGE 4 — DEVELOPER API LAYER
  // External services authenticate with Bearer nxt_<prefix>_<secret> keys.
  // Every API call costs NXT (same physics engine as UI), tracked in DB.
  // ══════════════════════════════════════════════════════════════════════════

  // ── API key middleware ────────────────────────────────────────────────────
  async function authenticateApiKey(
    req: Request, res: Response, next: Function
  ): Promise<void> {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token.startsWith("nxt_")) {
      res.status(401).json({ error: "Missing or invalid API key. Use: Authorization: Bearer nxt_<key>" });
      return;
    }
    const prefix = token.substring(0, 12);
    const apiKey = await storage.getApiKeyByPrefix(prefix);
    if (!apiKey || !apiKey.isActive) {
      res.status(401).json({ error: "Invalid or revoked API key" });
      return;
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      res.status(401).json({ error: "API key expired" });
      return;
    }
    const valid = await storage.verifyApiKey(token, apiKey.keyHash);
    if (!valid) {
      res.status(401).json({ error: "API key verification failed" });
      return;
    }
    const user = await storage.getUser(apiKey.userId);
    if (!user) {
      res.status(401).json({ error: "API key owner not found" });
      return;
    }
    // Stamp last-used async — don't block the request
    storage.updateApiKeyLastUsed(apiKey.id).catch(() => {});
    req.user = user;
    req.apiKey = apiKey;
    next();
  }

  // ── Key management — session-authenticated ────────────────────────────────

  // List all API keys for authenticated user
  app.get("/api/keys", authenticate, async (req, res) => {
    try {
      const keys = await storage.listApiKeysByUser(req.user!.id);
      res.json({
        keys: keys.map(k => ({
          id:          k.id,
          name:        k.name,
          prefix:      k.keyPrefix,
          permissions: k.permissions,
          isActive:    k.isActive,
          lastUsedAt:  k.lastUsedAt,
          expiresAt:   k.expiresAt,
          createdAt:   k.createdAt,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to list API keys" });
    }
  });

  const API_KEY_FEE_SATS = 5000;

  // Create a new API key — costs 5,000 sats (flat rate)
  app.post("/api/keys", authenticate, async (req, res) => {
    try {
      const { name, permissions = ["read"] } = req.body as { name?: string; permissions?: string[] };
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ error: "Key name is required (min 2 chars)" });
      }

      const { db } = await import("./db");
      const { lightningWallets, lightningTransactions } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const [lnWallet] = await db.select().from(lightningWallets).where(eq(lightningWallets.userId, req.user!.id));
      if (!lnWallet || lnWallet.satsBalance < API_KEY_FEE_SATS) {
        return res.status(402).json({
          error: `Insufficient sats. Need ${API_KEY_FEE_SATS} sats to create an API key`,
          required: API_KEY_FEE_SATS,
          available: lnWallet?.satsBalance ?? 0,
        });
      }

      await db.update(lightningWallets)
        .set({ satsBalance: lnWallet.satsBalance - API_KEY_FEE_SATS, updatedAt: new Date() })
        .where(eq(lightningWallets.userId, req.user!.id));
      await db.insert(lightningTransactions).values({
        userId:     req.user!.id,
        type:       "service_fee",
        amountSats: API_KEY_FEE_SATS,
        memo:       `API key creation: ${name.trim()}`,
        status:     "settled",
      });

      const { key, apiKey } = await storage.createApiKey(req.user!.id, name.trim(), permissions);

      res.status(201).json({
        key,
        apiKey: {
          id:          apiKey.id,
          name:        apiKey.name,
          prefix:      apiKey.keyPrefix,
          permissions: apiKey.permissions,
          createdAt:   apiKey.createdAt,
        },
        fee: { sats: API_KEY_FEE_SATS },
        warning: "Store this key now — it will not be shown again.",
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  // Revoke a key
  app.delete("/api/keys/:keyId", authenticate, async (req, res) => {
    try {
      const keys = await storage.listApiKeysByUser(req.user!.id);
      const target = keys.find(k => k.id === req.params.keyId);
      if (!target) return res.status(404).json({ error: "Key not found" });
      await storage.revokeApiKey(target.id);
      res.json({ revoked: true, keyId: target.id });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to revoke API key" });
    }
  });

  // ── External developer endpoints — API key authenticated ─────────────────

  // GET /api/dev/physics/:username — spectral channel + fee schedule
  app.get("/api/dev/physics/:username", authenticateApiKey, async (req, res) => {
    try {
      const { username } = req.params;
      const channel = deriveChannel(username);
      const fees = {
        message_send:     calcFee("message_send",     channel.wdm),
        stream_start:     calcFee("stream_start",     channel.wdm),
        document_create:  calcFee("document_create",  channel.wdm),
        wallet_transfer:  calcFee("wallet_transfer",  channel.wdm),
      };
      res.json({ username, channel, fees });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/dev/wallet — caller's wallet balance and recent transactions
  app.get("/api/dev/wallet", authenticateApiKey, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.user!.id);
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });
      const txs = await storage.getTransactions(wallet.id, 10);
      res.json({
        address:  wallet.address,
        balance:  wallet.balance,
        spectral: {
          wdm:  req.user!.spectralWdm,
          nm:   req.user!.spectralNm,
          band: req.user!.spectralBand,
        },
        recentTransactions: txs.map(t => ({
          type:   t.type,
          amount: t.amount,
          status: t.status,
          createdAt: t.createdAt,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/dev/message — send a message via API key (costs NXT)
  app.post("/api/dev/message", authenticateApiKey, async (req, res) => {
    try {
      const { recipientUsername, content } = req.body as { recipientUsername?: string; content?: string };
      if (!recipientUsername || !content) {
        return res.status(400).json({ error: "recipientUsername and content are required" });
      }
      if (content.length > 2000) {
        return res.status(400).json({ error: "content exceeds 2000 characters" });
      }

      const recipient = await storage.getUserByUsername(recipientUsername);
      if (!recipient) return res.status(404).json({ error: "Recipient not found" });

      const senderWdm    = req.user!.spectralWdm ?? 200;
      const msgFee       = calcFee("message_send", senderWdm);
      const msgFeeNum    = 0; // Text messages are free
      const senderWallet = await storage.getWallet(req.user!.id);
      if (!senderWallet) return res.status(402).json({ error: "Sender wallet not found" });

      const balance = parseFloat(senderWallet.balance);
      // No fee deduction — text messages are free
      const recipientEarning = msgFeeNum * 0.5;
      const recipientWallet  = await storage.getWallet(recipient.id);
      if (recipientWallet) {
        const newBal = (parseFloat(recipientWallet.balance) + recipientEarning).toFixed(8);
        await storage.updateWalletBalance(recipientWallet.id, newBal);
        await storage.createTransaction({
          fromWalletId: senderWallet.id,
          toWalletId:   recipientWallet.id,
          amount:       recipientEarning.toFixed(8),
          fee:          "0",
          type:         "message_earning",
          wavelength:   msgFee.wavelengthNm.toString(),
          frequency:    msgFee.frequencyHz.toString(),
          energyCost:   msgFee.energyJ.toString(),
          metadata:     { action: "message_received", via: "dev_api", senderId: req.user!.id },
        });
      }
      const burnTxMsg = await storage.createTransaction({
        fromWalletId: senderWallet.id,
        toWalletId:   undefined,
        amount:       (msgFeeNum * 0.5).toFixed(8),
        fee:          "0",
        type:         "protocol_burn",
        wavelength:   msgFee.wavelengthNm.toString(),
        frequency:    msgFee.frequencyHz.toString(),
        energyCost:   msgFee.energyJ.toString(),
        metadata:     { action: "message_send", via: "dev_api" },
      });
      // ── BTC auto-inscription hook — NXT burn ────────────────────────────────
      import("./btc-bridge-service").then(({ btcBridge }) => {
        btcBridge.triggerFromBurn({
          id: String(burnTxMsg?.id ?? Date.now()),
          amountNxt: (msgFeeNum * 0.5).toFixed(8),
          fromWalletAddress: senderWallet.address,
          reason: "message_send fee → Orbital Treasury (50%)",
          wavelength: msgFee.wavelengthNm.toString(),
          triggeredBy: (req as any).user?.username ?? "protocol",
        }).catch(() => {});
      }).catch(() => {});

      const message = await storage.createLambdaMessage({
        senderId:        req.user!.id,
        recipientId:     recipient.id,
        content,
        wavelengthMin:   msgFee.wavelengthNm.toFixed(4),
        wavelengthMax:   msgFee.wavelengthNm.toFixed(4),
        spectralHash:    `Ψ(${senderWdm})·λ=${msgFee.wavelengthNm.toFixed(2)}nm·dev_api`,
      });

      res.status(201).json({
        messageId: message.id,
        fee:       { nxt: msgFeeNum, band: msgFee.band, nm: msgFee.wavelengthNm },
        newBalance: (balance - msgFeeNum).toFixed(8),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/dev/status — platform health check (no fee)
  app.get("/api/dev/status", authenticateApiKey, async (req, res) => {
    res.json({
      status:  "operational",
      version: "NexusOS v1.0 — WNSP Developer API",
      caller:  {
        username: req.user!.username,
        band:     req.user!.spectralBand,
        nm:       req.user!.spectralNm,
      },
      endpoints: [
        "GET  /api/dev/status",
        "GET  /api/dev/wallet",
        "GET  /api/dev/physics/:username",
        "POST /api/dev/message",
      ],
      economics: "Every action costs NXT — E=hf · WNSP spectral fees apply",
    });
  });

  // ── End of Stage 4 Developer API ─────────────────────────────────────────

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

      const { phoneNumber: query } = req.body;

      const addressee =
        await storage.getUserByPhoneNumber(query) ||
        await storage.getUserByUsername(query);
      if (!addressee) {
        return res.status(404).json({ error: "User not found — try their phone number or username" });
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

      // ── Physics fee enforcement ─────────────────────────────────────────
      // Text messages are free — fee calculated for physics metadata only
      const senderWdm  = req.user!.spectralWdm ?? 200;
      const msgFee     = calcFee("message_send", senderWdm);
      const feeNum     = 0; // Text messages are free
      const senderWallet = await storage.getWallet(req.user!.id);
      if (!senderWallet) {
        return res.status(400).json({ error: "Sender wallet not found" });
      }
      const senderBalance = parseFloat(senderWallet.balance);
      // No deduction — text messages are free

      // 50% of fee flows to recipient as spectral earnings — closed economic loop
      const recipientEarning = feeNum * 0.5;
      const recipientWallet  = await storage.getWallet(recipientId);
      if (recipientWallet) {
        const newRecipientBalance = (parseFloat(recipientWallet.balance) + recipientEarning).toFixed(8);
        await storage.updateWalletBalance(recipientWallet.id, newRecipientBalance);
        await storage.createTransaction({
          fromWalletId: senderWallet.id,
          toWalletId:   recipientWallet.id,
          amount:       recipientEarning.toFixed(8),
          fee:          "0",
          type:         "message_earning",
          wavelength:   msgFee.wavelengthNm.toString(),
          frequency:    msgFee.frequencyHz.toString(),
          energyCost:   msgFee.energyJ.toString(),
          metadata:     { action: "message_received", band: msgFee.band, senderId: req.user!.id },
        });
      }
      // Remaining 50% is protocol fee → Orbital Treasury
      const burnTxMain = await storage.createTransaction({
        fromWalletId: senderWallet.id,
        toWalletId:   undefined,
        amount:       (feeNum * 0.5).toFixed(8),
        fee:          "0",
        type:         "protocol_burn",
        wavelength:   msgFee.wavelengthNm.toString(),
        frequency:    msgFee.frequencyHz.toString(),
        energyCost:   msgFee.energyJ.toString(),
        metadata:     { action: "message_send", band: msgFee.band, recipientId },
      });
      // ── BTC auto-inscription hook — NXT fee → Orbital Treasury ────────────
      import("./btc-bridge-service").then(({ btcBridge }) => {
        btcBridge.triggerFromBurn({
          id:               String(burnTxMain?.id ?? Date.now()),
          amountNxt:        (feeNum * 0.5).toFixed(8),
          fromWalletAddress: senderWallet.address,
          reason:           `message_send fee → Orbital Treasury (50%) · band:${msgFee.band}`,
          wavelength:       msgFee.wavelengthNm.toString(),
          triggeredBy:      (req as any).user?.username ?? "protocol",
        }).catch(() => {});
      }).catch(() => {});
      // ────────────────────────────────────────────────────────────────────

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
  // Hardware: spectrometer live readback (proxied to Python runtime)
  app.get("/api/hardware/spectrometer/read", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/hardware/spectrometer/read");
  });

  // ── WNSP Genesis Inscription — Bitcoin on-chain proof of NexusOS origin ─────
  const GENESIS = {
    inscriptionId: "ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542i0",
    txid:          "ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542",
    btcAddress:    "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m",
    content:       "nexustech_wnsp://Ψ(52,3,V).btc",
    outputSats:    330,
    wnspUri:       "wnsp://Ψ(52,3,V)",
    psiChannel:    "Ψ(52,3,V)",
    wdm:           52,
    oam:           3,
    pol:           "V",
    wavelengthNm:  586.8085,
    band:          "YELLOW",
    freqTHz:       510.886,
    disclosedAt:   "2026-05-16",
    inscribedAt:   "2026-05-31",
    uniscanUrl:    "https://uniscan.cc/inscription/ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542i0",
    mempoolUrl:    "https://mempool.space/tx/ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542",
    ordinalUrl:    "https://ordinals.com/inscription/ee8f6461ea2e39577b83350cb33c7bed0ae51ab1161a131369b054bb12939542i0",
  };

  // Seed genesis entry into wnsp_registry on startup (idempotent)
  (async () => {
    try {
      const { db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      await db.execute(S`
        INSERT INTO wnsp_registry (
          wnsp_uri, psi_channel, wdm, oam, polarisation, wavelength_nm, band,
          label, ce_input, resource_type, resource_id,
          http_url, description, is_public, is_canonical
        ) VALUES (
          ${GENESIS.wnspUri}, ${GENESIS.psiChannel}, ${GENESIS.wdm}, ${GENESIS.oam},
          ${GENESIS.pol}, ${GENESIS.wavelengthNm}, ${GENESIS.band},
          'NexusOS Genesis Node', 'nexusos', 'system', 'genesis',
          'https://nexusos.replit.app',
          ${'Bitcoin inscription ' + GENESIS.inscriptionId + ' — first public disclosure of wnsp://Ψ(52,3,V) on 2026-05-31'},
          true, true
        )
        ON CONFLICT (wnsp_uri) DO NOTHING
      `);
      console.log(`[Genesis] ✅ wnsp://Ψ(52,3,V) seeded in registry — inscription ${GENESIS.inscriptionId.slice(0, 16)}…`);
    } catch (e: any) {
      console.warn("[Genesis] Registry seed skipped:", e.message);
    }
  })();

  // GET /api/wnsp/genesis — returns Bitcoin inscription proof for the genesis node
  app.get("/api/wnsp/genesis", optionalAuth, (_req, res) => {
    res.json({ ok: true, genesis: GENESIS });
  });

  app.get("/api/wnsp/protocol", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/protocol");
  });

  app.get("/api/wnsp/sectors", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/sectors");
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

  app.post("/api/wnsp/quanta/oscillate", optionalAuth, (req, res) => {
    secureProxyToSpectralAPI(req, res, "/api/wnsp/quanta/oscillate");
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

      // ── Physics fee enforcement (authenticated users only) ──────────────
      // Files ≤ 5 MB are free; larger files pay the physics-based upload fee
      const FREE_UPLOAD_THRESHOLD = 5 * 1024 * 1024; // 5 MB
      if (req.user && size > FREE_UPLOAD_THRESHOLD) {
        const uploaderWdm   = req.user.spectralWdm ?? 200;
        const uploadFee     = calcFee("upload_mb", uploaderWdm, { fileSizeBytes: size });
        const uploadFeeNum  = parseFloat(uploadFee.feeNxt);
        const uploaderWallet = await storage.getWallet(req.user.id);
        if (uploaderWallet) {
          const uploaderBalance = parseFloat(uploaderWallet.balance);
          if (uploaderBalance < uploadFeeNum) {
            return res.status(402).json({
              error: "Insufficient NXT to upload this file",
              required: uploadFee.feeNxt,
              available: uploaderWallet.balance,
              physics: { wavelengthNm: uploadFee.wavelengthNm, band: uploadFee.band },
              freeThresholdMB: 5,
            });
          }
          await storage.updateWalletBalance(uploaderWallet.id, (uploaderBalance - uploadFeeNum).toFixed(8));
          await storage.createTransaction({
            fromWalletId: uploaderWallet.id,
            toWalletId:   undefined,
            amount:       uploadFee.feeNxt,
            fee:          "0",
            type:         "upload_fee",
            wavelength:   uploadFee.wavelengthNm.toString(),
            frequency:    uploadFee.frequencyHz.toString(),
            energyCost:   uploadFee.energyJ.toString(),
            metadata:     { action: "file_upload", band: uploadFee.band, filename: originalName, sizeBytes: size },
          });
        }
      }
      // ────────────────────────────────────────────────────────────────────

      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
      const sanitizedOriginalName = originalName.replace(/[<>:"/\\|?*]/g, "_").slice(0, 255);

      // Wavelength derived from uploader's actual spectral channel
      const uploaderWdm2  = req.user?.spectralWdm ?? 200;
      const uploadPhysics = calcFee("upload_mb", uploaderWdm2, { fileSizeBytes: size });
      const wavelengthMin = uploadPhysics.wavelengthNm - 10;
      const wavelengthMax = uploadPhysics.wavelengthNm + 10;
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
      
      // ── Physics fee enforcement ─────────────────────────────────────────
      const docCreatorWdm = req.user!.spectralWdm ?? 200;
      const docFee        = calcFee("document_create", docCreatorWdm);
      const docFeeNum     = parseFloat(docFee.feeNxt);
      const docWallet     = await storage.getWallet(req.user!.id);
      if (!docWallet) return res.status(400).json({ error: "Wallet not found" });
      const docBalance    = parseFloat(docWallet.balance);
      if (docBalance < docFeeNum) {
        return res.status(402).json({
          error: "Insufficient NXT to create a spectral document",
          required: docFee.feeNxt,
          available: docWallet.balance,
        });
      }
      await storage.updateWalletBalance(docWallet.id, (docBalance - docFeeNum).toFixed(8));
      await storage.createTransaction({
        fromWalletId: docWallet.id,
        toWalletId:   undefined,
        amount:       docFee.feeNxt,
        fee:          "0",
        type:         "document_fee",
        wavelength:   docFee.wavelengthNm.toString(),
        frequency:    docFee.frequencyHz.toString(),
        energyCost:   docFee.energyJ.toString(),
        metadata:     { action: "document_create", band: docFee.band, filename: originalName },
      });
      // ────────────────────────────────────────────────────────────────────

      // Physics wavelength derived from sender's actual channel (not filename)
      const wavelength = docFee.wavelengthNm;
      const frequency  = docFee.frequencyHz;
      const energy     = docFee.energyJ;
      const timestamp  = Date.now().toString(36);
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

      // ── Authority gate ─────────────────────────────────────────────────
      // Derive required band from the document's creation wavelength
      const docNm  = parseFloat(doc.wavelength);
      const docWdm = Math.round((docNm - 380) / ((780 - 380) / 255));
      const docBand = getBand(Math.max(0, Math.min(255, docWdm)));
      const readerWdm = req.user!.spectralWdm ?? 255;
      if (!hasAuthority(readerWdm, docBand)) {
        return res.status(403).json({
          error: `This document requires ${docBand}-band authority`,
          required: docBand,
          yourBand: getBand(readerWdm),
          physics: {
            documentNm: docNm,
            documentBand: docBand,
            readerNm: 380 + readerWdm * ((780 - 380) / 255),
          },
        });
      }
      // ────────────────────────────────────────────────────────────────────

      // Owner check OR authority — document owner can always access, higher band users too
      if (doc.userId !== req.user!.id && !hasAuthority(readerWdm, docBand)) {
        return res.status(403).json({ error: "Not authorized to download this document" });
      }

      // ── Reader pays creator — document access fee ─────────────────────
      if (doc.userId !== req.user!.id) {
        const readFee    = calcFee("document_create", readerWdm); // same base as creation
        const readFeeNxt = parseFloat(readFee.feeNxt) * 0.3;     // 30% of create fee to read
        const readerWallet  = await storage.getWallet(req.user!.id);
        const creatorWallet = await storage.getWallet(doc.userId);
        if (readerWallet && creatorWallet && readFeeNxt > 0) {
          const readerBalance = parseFloat(readerWallet.balance);
          if (readerBalance >= readFeeNxt) {
            await storage.updateWalletBalance(readerWallet.id, (readerBalance - readFeeNxt).toFixed(8));
            const creatorEarning = readFeeNxt * 0.9; // 90% to creator, 10% protocol
            const newCreatorBalance = (parseFloat(creatorWallet.balance) + creatorEarning).toFixed(8);
            await storage.updateWalletBalance(creatorWallet.id, newCreatorBalance);
            await storage.createTransaction({
              fromWalletId: readerWallet.id,
              toWalletId:   creatorWallet.id,
              amount:       creatorEarning.toFixed(8),
              fee:          (readFeeNxt * 0.1).toFixed(8),
              type:         "document_earning",
              wavelength:   readFee.wavelengthNm.toString(),
              frequency:    readFee.frequencyHz.toString(),
              energyCost:   readFee.energyJ.toString(),
              metadata:     { action: "document_read", docId: doc.id, readerWdm, band: readFee.band },
            });
          }
          // If reader can't afford, they can still download (soft gate — authority is the hard gate)
        }
      }
      // ────────────────────────────────────────────────────────────────────

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

      // ── Physics fee enforcement ─────────────────────────────────────────
      const streamerWdm    = req.user!.spectralWdm ?? 200;
      const streamFee      = calcFee("stream_start", streamerWdm);
      const streamFeeNum   = parseFloat(streamFee.feeNxt);
      const streamerWallet = await storage.getWallet(req.user!.id);
      if (!streamerWallet) return res.status(400).json({ error: "Wallet not found" });
      const streamerBalance = parseFloat(streamerWallet.balance);
      if (streamerBalance < streamFeeNum) {
        return res.status(402).json({
          error: "Insufficient NXT to open a broadcast channel",
          required: streamFee.feeNxt,
          available: streamerWallet.balance,
          physics: { wavelengthNm: streamFee.wavelengthNm, energyJ: streamFee.energyJ, band: streamFee.band },
        });
      }
      await storage.updateWalletBalance(streamerWallet.id, (streamerBalance - streamFeeNum).toFixed(8));
      await storage.createTransaction({
        fromWalletId: streamerWallet.id,
        toWalletId:   undefined,
        amount:       streamFee.feeNxt,
        fee:          "0",
        type:         "stream_fee",
        wavelength:   streamFee.wavelengthNm.toString(),
        frequency:    streamFee.frequencyHz.toString(),
        energyCost:   streamFee.energyJ.toString(),
        metadata:     { action: "stream_start", band: streamFee.band },
      });
      // ────────────────────────────────────────────────────────────────────

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

      // ── Viewer physics payment → broadcaster earnings ─────────────────
      // Broadcaster earns when viewers join — they don't pay the join fee, viewer does
      if (stream.broadcasterId !== req.user!.id) {
        const viewerWdm     = req.user!.spectralWdm ?? 200;
        const viewJoinFee   = calcFee("stream_start", viewerWdm); // same rate as opening a channel
        const viewFeeNum    = parseFloat(viewJoinFee.feeNxt) * 0.2; // 20% of stream_start as join fee
        const viewerWallet  = await storage.getWallet(req.user!.id);
        const broadcasterWallet = await storage.getWallet(stream.broadcasterId);

        if (viewerWallet && viewFeeNum > 0) {
          const viewerBalance = parseFloat(viewerWallet.balance);
          if (viewerBalance >= viewFeeNum) {
            await storage.updateWalletBalance(viewerWallet.id, (viewerBalance - viewFeeNum).toFixed(8));
            // 80% to broadcaster, 20% protocol burn
            if (broadcasterWallet) {
              const broadcasterEarning = viewFeeNum * 0.8;
              const newBroadcasterBalance = (parseFloat(broadcasterWallet.balance) + broadcasterEarning).toFixed(8);
              await storage.updateWalletBalance(broadcasterWallet.id, newBroadcasterBalance);
              await storage.createTransaction({
                fromWalletId: viewerWallet.id,
                toWalletId:   broadcasterWallet.id,
                amount:       broadcasterEarning.toFixed(8),
                fee:          (viewFeeNum * 0.2).toFixed(8),
                type:         "stream_earning",
                wavelength:   viewJoinFee.wavelengthNm.toString(),
                frequency:    viewJoinFee.frequencyHz.toString(),
                energyCost:   viewJoinFee.energyJ.toString(),
                metadata:     { action: "viewer_join", streamId: stream.id, viewerWdm, band: viewJoinFee.band },
              });
            }
          }
          // If viewer can't afford join fee, they can still watch (soft gate for now)
        }
      }
      // ────────────────────────────────────────────────────────────────────

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

  // ── Per-minute viewer billing (call every 60s from client) ─────────────
  app.post("/api/streams/:streamId/heartbeat", authenticate, async (req, res) => {
    try {
      const stream = await storage.getStream(req.params.streamId);
      if (!stream || stream.status !== "live") {
        return res.status(404).json({ error: "Stream not found or ended" });
      }
      // Broadcaster is never billed for their own heartbeat
      if (stream.broadcasterId === req.user!.id) {
        return res.json({ billed: false, reason: "broadcaster" });
      }

      const viewerWdm      = req.user!.spectralWdm ?? 200;
      const minuteFee      = calcFee("stream_start", viewerWdm);
      const minuteFeeNxt   = parseFloat(minuteFee.feeNxt) * 0.1; // 10% of stream_start per minute
      const viewerWallet   = await storage.getWallet(req.user!.id);
      const broadcasterWallet = await storage.getWallet(stream.broadcasterId);

      if (!viewerWallet) {
        return res.status(402).json({ error: "Viewer wallet not found" });
      }

      const balance = parseFloat(viewerWallet.balance);
      if (balance < minuteFeeNxt) {
        return res.status(402).json({
          error: "Insufficient NXT — cannot sustain stream",
          required: minuteFeeNxt,
          available: balance,
          physics: { wavelengthNm: minuteFee.wavelengthNm, band: minuteFee.band },
        });
      }

      await storage.updateWalletBalance(viewerWallet.id, (balance - minuteFeeNxt).toFixed(8));
      if (broadcasterWallet) {
        const earning = minuteFeeNxt * 0.85;
        const newBal  = (parseFloat(broadcasterWallet.balance) + earning).toFixed(8);
        await storage.updateWalletBalance(broadcasterWallet.id, newBal);
        await storage.createTransaction({
          fromWalletId: viewerWallet.id,
          toWalletId:   broadcasterWallet.id,
          amount:       earning.toFixed(8),
          fee:          (minuteFeeNxt * 0.15).toFixed(8),
          type:         "stream_earning",
          wavelength:   minuteFee.wavelengthNm.toString(),
          frequency:    minuteFee.frequencyHz.toString(),
          energyCost:   minuteFee.energyJ.toString(),
          metadata:     { action: "viewer_minute", streamId: stream.id, viewerWdm, band: minuteFee.band },
        });
      }

      res.json({
        billed: true,
        feeNxt: minuteFeeNxt,
        newBalance: (balance - minuteFeeNxt).toFixed(8),
        broadcasterEarning: (minuteFeeNxt * 0.85).toFixed(8),
      });
    } catch (error: any) {
      console.error("Stream heartbeat error:", error);
      res.status(500).json({ error: "Heartbeat failed" });
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

  // ── Kernel Agent Status ────────────────────────────────────────────────────
  app.get("/api/kernel/agents", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { getAllAgentStates } = await import("./kernel_agents");
      const agents = getAllAgentStates();
      res.json({ agents, count: agents.length, serverTime: Date.now() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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

      // ── BTC auto-inscription hook — spectral record ──────────────────────────
      import("./btc-bridge-service").then(({ btcBridge }) => {
        btcBridge.triggerFromSpectralRecord({
          id: record.id, label, psiChannel: enc.psi_channel ?? "Ψ(0,0,H)",
          band: enc.band ?? "CORE", wavelengthNm: String(enc.wavelength_mid_nm ?? 550),
          contentHash, walletAddress: (req as any).user?.walletAddress,
          triggeredBy: (req as any).user?.username ?? "system",
        }).catch(() => {});
      }).catch(() => {});

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
  app.get("/api/spectral-workspace/video/:id/stream", optionalAuth, async (req: Request, res: Response) => {
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

      // Auto-log peer receipt when a peer streams the first chunk (range start=0 or no range)
      const isFirstChunk = !rangeHeader || rangeHeader.startsWith("bytes=0-");
      if (isFirstChunk) {
        const peer = (req as any).user;
        const peerId = peer?.id ?? null;
        const peerName = peer?.username ?? (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? "anonymous";
        // Derive a deterministic Ψ channel from the peer's IP/id so each peer has a unique spectral address
        const seed = peerId ?? peerName;
        const seedCode = seed.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
        const peerWdm = seedCode % 256;
        const peerOam = seedCode % 50;
        const peerPol = seedCode % 2 === 0 ? "H" : "V";
        const peerPsi = `Ψ(${peerWdm},${peerOam},${peerPol})`;
        const peerNm = 380 + (peerWdm / 255) * 400;
        const peerHz = 299792458 / (peerNm * 1e-9);
        const peerBand = peerWdm < 64 ? "SYSTEM" : peerWdm < 128 ? "KERNEL" : peerWdm < 192 ? "USER" : "GUEST";

        // Derive srcPsiChannel deterministically from the uploader's name
        const uploaderSeed = ((video as any).uploaderName ?? "nexus").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
        const srcWdm = uploaderSeed % 256;
        const srcOam = uploaderSeed % 50;
        const srcPol = uploaderSeed % 2 === 0 ? "H" : "V";
        const srcPsi = `Ψ(${srcWdm},${srcOam},${srcPol})`;

        storage.logP2pReceipt({
          transmissionId: video.id,
          transmissionType: "video",
          filename: video.filename,
          peerId,
          peerName,
          peerPsiChannel: peerPsi,
          peerWavelengthNm: String(peerNm.toFixed(4)),
          peerFrequencyHz: String(peerHz.toFixed(4)),
          peerBand,
          srcPsiChannel: srcPsi,
          bytesReceived: total,
          status: "received",
        }).catch(() => {});
      }

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

  // ── P2P Receipt API ────────────────────────────────────────────────────────

  // Log a receipt manually (called by frontend when peer acknowledges a text/bus transmission)
  app.post("/api/p2p/receipt", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { transmissionId, transmissionType, filename, srcPsiChannel, bytesReceived } = req.body;
      if (!transmissionId) return res.status(400).json({ error: "transmissionId required" });

      const peer = (req as any).user;
      const peerId = peer?.id ?? null;
      const peerName = peer?.username ?? "anonymous";
      const seed = peerId ?? peerName;
      const seedCode = seed.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
      const peerWdm = seedCode % 256;
      const peerOam = seedCode % 50;
      const peerPol = seedCode % 2 === 0 ? "H" : "V";
      const peerPsi = `Ψ(${peerWdm},${peerOam},${peerPol})`;
      const peerNm = 380 + (peerWdm / 255) * 400;
      const peerHz = 299792458 / (peerNm * 1e-9);
      const peerBand = peerWdm < 64 ? "SYSTEM" : peerWdm < 128 ? "KERNEL" : peerWdm < 192 ? "USER" : "GUEST";

      const receipt = await storage.logP2pReceipt({
        transmissionId,
        transmissionType: transmissionType ?? "text",
        filename: filename ?? null,
        peerId,
        peerName,
        peerPsiChannel: peerPsi,
        peerWavelengthNm: String(peerNm.toFixed(4)),
        peerFrequencyHz: String(peerHz.toFixed(4)),
        peerBand,
        srcPsiChannel: srcPsiChannel ?? null,
        bytesReceived: bytesReceived ?? null,
        status: "received",
      });

      res.json({ success: true, receipt });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get receipts for a specific transmission or all recent receipts
  app.get("/api/p2p/receipts", optionalAuth, async (req: Request, res: Response) => {
    try {
      const transmissionId = req.query.transmissionId as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string || "50"), 200);
      const receipts = transmissionId
        ? await storage.getP2pReceipts(transmissionId, limit)
        : await storage.getRecentP2pReceipts(limit);
      res.json({ receipts, count: receipts.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Transmission Reports API ───────────────────────────────────────────────

  // Save a new transmission report (called by frontend after text or video transmission)
  app.post("/api/transmission/report", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const {
        documentName, transmissionType, psiChannel, wavelengthNm, frequencyHz, band,
        videoId, spectralRecordId, totalChars, wordCount, avgWavelength, totalEnergy,
        transmissionTimeMs, successRate, photonsEmitted, ordinalUnits, ordinalNxt,
        busSignalSent, rawSummary,
      } = req.body;

      if (!documentName) return res.status(400).json({ error: "documentName required" });

      const report = await storage.saveTransmissionReport({
        documentName,
        transmissionType: transmissionType ?? "text",
        psiChannel: psiChannel ?? null,
        wavelengthNm: wavelengthNm ? String(wavelengthNm) : null,
        frequencyHz: frequencyHz ? String(frequencyHz) : null,
        band: band ?? null,
        videoId: videoId ?? null,
        spectralRecordId: spectralRecordId ?? null,
        totalChars: totalChars ?? 0,
        wordCount: wordCount ?? 0,
        avgWavelength: avgWavelength ? String(avgWavelength) : null,
        totalEnergy: totalEnergy ? String(totalEnergy) : null,
        transmissionTimeMs: transmissionTimeMs ?? null,
        successRate: successRate ? String(successRate) : null,
        photonsEmitted: photonsEmitted ?? 0,
        ordinalUnits: ordinalUnits ?? null,
        ordinalNxt: ordinalNxt ?? null,
        busSignalSent: busSignalSent ?? false,
        uploaderId: user?.id ?? null,
        uploaderName: user?.username ?? null,
        rawSummary: rawSummary ?? null,
      });

      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all transmission reports, enriched with receipt counts
  app.get("/api/transmission/reports", optionalAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const limit = Math.min(parseInt(req.query.limit as string || "50"), 200);
      const uploaderId = req.query.uploaderId as string | undefined;

      const { db: drizzleDb } = await import("./db");
      const { transmissionReports: txReports, p2pReceipts: receipts } = await import("@shared/schema");
      const { sql: drizzleSql, desc: drizzleDesc, eq: drizzleEq } = await import("drizzle-orm");

      // Get reports
      const reports = await storage.getTransmissionReports(uploaderId, limit);

      // For each report, count receipts by matching psiChannel → srcPsiChannel or videoId → transmissionId
      const enriched = await Promise.all(reports.map(async (r) => {
        const [countRow] = await drizzleDb.select({
          count: drizzleSql<number>`count(*)::int`,
        }).from(receipts).where(
          r.videoId
            ? drizzleEq(receipts.transmissionId, r.videoId)
            : drizzleSql`false`
        );

        const peerRows = r.videoId
          ? await drizzleDb.select({
              peerName: receipts.peerName,
              peerPsiChannel: receipts.peerPsiChannel,
              peerWavelengthNm: receipts.peerWavelengthNm,
              peerBand: receipts.peerBand,
              receivedAt: receipts.receivedAt,
            }).from(receipts)
              .where(drizzleEq(receipts.transmissionId, r.videoId))
              .limit(10)
          : [];

        return {
          ...r,
          receiptCount: countRow?.count ?? 0,
          recentReceipts: peerRows,
        };
      }));

      res.json({ reports: enriched, count: enriched.length });
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

  // ── GitHub Bridge ─────────────────────────────────────────────────────
  app.get("/api/github/profile", authenticate, async (req: Request, res: Response) => {
    try {
      const { getGitHubClient } = await import("./github");
      const octokit = await getGitHubClient();
      const { data: user } = await octokit.users.getAuthenticated();
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({ per_page: 100, sort: "updated" });
      const stars = repos.reduce((s: number, r: any) => s + (r.stargazers_count || 0), 0);
      const forks = repos.reduce((s: number, r: any) => s + (r.forks_count || 0), 0);
      res.json({ user, repoCount: repos.length, totalStars: stars, totalForks: forks });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/github/repos", authenticate, async (req: Request, res: Response) => {
    try {
      const { getGitHubClient } = await import("./github");
      const octokit = await getGitHubClient();
      const { data } = await octokit.repos.listForAuthenticatedUser({
        per_page: 30, sort: "updated", affiliation: "owner",
      });
      // attach WNSP-URI derived from repo name
      const { deriveChannel, buildUri } = await import("./physics");
      const enriched = data.map((r: any) => {
        const enc = deriveChannel(r.name);
        return {
          id: r.id, name: r.name, full_name: r.full_name,
          description: r.description, html_url: r.html_url,
          language: r.language, stargazers_count: r.stargazers_count,
          forks_count: r.forks_count, open_issues_count: r.open_issues_count,
          private: r.private, fork: r.fork,
          updated_at: r.updated_at, pushed_at: r.pushed_at,
          default_branch: r.default_branch,
          topics: r.topics ?? [],
          wnsp: { psi: enc.psi, nm: enc.nm, band: enc.band, uri: buildUri(enc.wdm, enc.oam, enc.pol, r.name) },
        };
      });
      res.json({ repos: enriched, total: enriched.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/github/activity", authenticate, async (req: Request, res: Response) => {
    try {
      const { getGitHubClient } = await import("./github");
      const octokit = await getGitHubClient();
      const { data: user } = await octokit.users.getAuthenticated();
      const { data: events } = await octokit.activity.listPublicEventsForUser({
        username: user.login, per_page: 30,
      });
      res.json({ events, username: user.login });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Public ledger — all NXT transactions ─────────────────────────────
  app.get("/api/ledger", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: drizzleSql } = await import("drizzle-orm");

      const search  = (req.query.search  as string) || "";
      const type    = (req.query.type    as string) || "";
      const limit   = Math.min(parseInt(req.query.limit  as string) || 50, 200);
      const offset  = parseInt(req.query.offset as string) || 0;

      const whereSearch = search
        ? drizzleSql`AND (wf.address ILIKE ${'%'+search+'%'} OR wt.address ILIKE ${'%'+search+'%'} OR uf.username ILIKE ${'%'+search+'%'} OR ut.username ILIKE ${'%'+search+'%'})`
        : drizzleSql``;
      const whereType = type
        ? drizzleSql`AND t.type = ${type}`
        : drizzleSql``;

      const txRows = await db.execute(drizzleSql`
        SELECT
          t.id, t.amount, t.fee, t.type, t.status,
          t.wavelength, t.frequency, t.energy_cost,
          t.metadata, t.created_at, t.confirmed_at,
          wf.address AS from_address, uf.username AS from_username,
          wt.address AS to_address,   ut.username AS to_username
        FROM transactions t
        LEFT JOIN wallets wf ON wf.id = t.from_wallet_id
        LEFT JOIN users   uf ON uf.id = wf.user_id
        LEFT JOIN wallets wt ON wt.id = t.to_wallet_id
        LEFT JOIN users   ut ON ut.id = wt.user_id
        WHERE 1=1 ${whereSearch} ${whereType}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const statsRows = await db.execute(drizzleSql`
        SELECT
          COUNT(*)::int                                     AS total_count,
          COALESCE(SUM(amount::numeric), 0)::text           AS total_volume,
          COALESCE(SUM(fee::numeric), 0)::text              AS total_fees,
          COUNT(DISTINCT COALESCE(from_wallet_id::text,''))::int AS unique_senders,
          MIN(created_at)::text                             AS first_tx,
          MAX(created_at)::text                             AS last_tx
        FROM transactions
      `);

      const typeRows = await db.execute(drizzleSql`
        SELECT type, COUNT(*)::int AS cnt, COALESCE(SUM(amount::numeric),0)::text AS vol
        FROM transactions GROUP BY type ORDER BY cnt DESC
      `);

      res.json({
        transactions: txRows.rows,
        stats: statsRows.rows[0] ?? {},
        types: typeRows.rows,
        pagination: { limit, offset },
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── User directory (public) ───────────────────────────────────────────
  app.get("/api/directory", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { users: usersTable, wallets } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");
      const rows = await db.select({
        id: usersTable.id, username: usersTable.username,
        role: usersTable.role, createdAt: usersTable.createdAt,
        spectralWdm: usersTable.spectralWdm, spectralOam: usersTable.spectralOam,
        spectralPol: usersTable.spectralPol, spectralNm: usersTable.spectralNm,
        spectralBand: usersTable.spectralBand,
      }).from(usersTable)
        .where(eq(usersTable.isActive, true))
        .orderBy(asc(usersTable.spectralWdm));

      const enriched = await Promise.all(rows.map(async u => {
        const [wallet] = await db.select({ address: wallets.address })
          .from(wallets).where(eq(wallets.userId, u.id));
        const enc = ceSe(u.username);
        return {
          username: u.username, role: u.role, createdAt: u.createdAt,
          wallet: wallet ? { address: wallet.address } : null,
          spectral: { ...enc },
        };
      }));

      res.json({ users: enriched, total: enriched.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
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
        bio: usersTable.bio, avatarUrl: usersTable.avatarUrl,
        country: usersTable.country, stateRegion: usersTable.stateRegion,
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
        user: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt,
          bio: user.bio ?? null, avatarUrl: user.avatarUrl ?? null,
          country: user.country ?? null, stateRegion: user.stateRegion ?? null },
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

  // ── User Credentials — Upload ─────────────────────────────────────────
  app.post("/api/profile/credentials", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { userCredentials } = await import("@shared/schema");
      const userId = (req as any).user!.id;
      const { name, credentialType = "other", issuer, issuedDate, expiryDate,
              fileName, fileType, fileData, fileSize, visibility = "private" } = req.body;

      if (!name || !fileName || !fileData) {
        return res.status(400).json({ error: "name, fileName, and fileData are required" });
      }
      if (fileData.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "File too large — max 10 MB" });
      }

      // Derive spectral address from credential name via WASCII CE→SE
      const enc = ceSe(name);

      const [cred] = await db.insert(userCredentials).values({
        userId, name, credentialType, issuer: issuer ?? null,
        issuedDate: issuedDate ?? null, expiryDate: expiryDate ?? null,
        fileName, fileType: fileType ?? "application/octet-stream",
        fileData, fileSize: fileSize ?? null, visibility,
        psiChannel: enc.psi, wavelengthNm: String(enc.nm),
      }).returning();

      const { fileData: _fd, ...credSafe } = cred as any;
      res.status(201).json({ success: true, credential: credSafe, spectral: enc });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── User Credentials — List (own = all, others = public only) ─────────────
  app.get("/api/profile/:username/credentials", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { users: usersTable, userCredentials } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const { username } = req.params;

      const [targetUser] = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.username, username));
      if (!targetUser) return res.status(404).json({ error: "User not found" });

      const currentUserId = (req as any).user?.id ?? null;
      const isSelf = currentUserId === targetUser.id;

      const rows = await db.select({
        id: userCredentials.id,
        credentialType: userCredentials.credentialType,
        name: userCredentials.name,
        issuer: userCredentials.issuer,
        issuedDate: userCredentials.issuedDate,
        expiryDate: userCredentials.expiryDate,
        fileName: userCredentials.fileName,
        fileType: userCredentials.fileType,
        fileSize: userCredentials.fileSize,
        visibility: userCredentials.visibility,
        psiChannel: userCredentials.psiChannel,
        wavelengthNm: userCredentials.wavelengthNm,
        createdAt: userCredentials.createdAt,
      }).from(userCredentials)
        .where(
          isSelf
            ? eq(userCredentials.userId, targetUser.id)
            : and(eq(userCredentials.userId, targetUser.id), eq(userCredentials.visibility, "public"))
        );

      res.json({ credentials: rows, isSelf });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── User Credentials — Download file ──────────────────────────────────────
  app.get("/api/profile/credentials/:id/download", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { userCredentials } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [cred] = await db.select().from(userCredentials).where(eq(userCredentials.id, req.params.id));
      if (!cred) return res.status(404).json({ error: "Credential not found" });

      const currentUserId = (req as any).user?.id ?? null;
      if (cred.visibility !== "public" && cred.userId !== currentUserId) {
        return res.status(403).json({ error: "Private credential" });
      }

      const buf = Buffer.from(cred.fileData.replace(/^data:[^,]+,/, ""), "base64");
      res.setHeader("Content-Type", cred.fileType ?? "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${cred.fileName}"`);
      res.send(buf);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── User Credentials — Delete ─────────────────────────────────────────────
  app.delete("/api/profile/credentials/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { userCredentials } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const userId = (req as any).user!.id;
      const deleted = await db.delete(userCredentials)
        .where(and(eq(userCredentials.id, req.params.id), eq(userCredentials.userId, userId)))
        .returning();
      if (deleted.length === 0) return res.status(404).json({ error: "Not found or not your credential" });
      res.json({ success: true });
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
      // ── BTC auto-inscription hook — node registration ──────────────────────
      import("./btc-bridge-service").then(({ btcBridge }) => {
        btcBridge.triggerFromNodeRegister({
          nodeId:      node.nodeKey,
          psiChannel:  spectral.psiChannel,
          band:        spectral.emissionBand,
          wavelengthNm: String(spectral.wavelengthNm),
          walletAddress: (req as any).user?.walletAddress,
          triggeredBy:  (req as any).user?.username ?? "network",
        }).catch(() => {});
      }).catch(() => {});
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

  // ── Unified Feed ──────────────────────────────────────────────────────────
  app.get("/api/feed", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 40, 100);
      const items: any[] = [];

      // Messages (inbox)
      try {
        const inbox = await storage.getInbox(userId, 10);
        for (const { message, sender } of inbox) {
          items.push({
            id: `msg-${message.id}`,
            type: "message",
            title: `Message from ${sender.username}`,
            preview: message.content ? message.content.substring(0, 120) : "[spectral encoded]",
            meta: {
              senderId: sender.id,
              senderUsername: sender.username,
              isRead: message.isRead,
              hasEncoding: !!message.encodedFrames,
              wavelengthMin: message.wavelengthMin,
              wavelengthMax: message.wavelengthMax,
              totalLambdaMass: message.totalLambdaMass,
            },
            href: `/inbox`,
            createdAt: message.createdAt,
          });
        }
      } catch (_) {}

      // Live streams
      try {
        const liveStreams = await storage.getLiveStreams(8);
        for (const { stream, broadcaster } of liveStreams) {
          items.push({
            id: `stream-${stream.id}`,
            type: "stream",
            title: stream.title || `Live: ${broadcaster.username}`,
            preview: stream.description || "Live broadcast on WNSP channel",
            meta: {
              broadcasterId: broadcaster.id,
              broadcasterUsername: broadcaster.username,
              status: stream.status,
              streamType: stream.streamType,
              viewerCount: stream.viewerCount,
              spectralChannel: stream.spectralChannel,
            },
            href: `/streaming/${stream.id}`,
            createdAt: stream.createdAt,
          });
        }
      } catch (_) {}

      // User's own streams (recent)
      try {
        const myStreams = await storage.getUserStreams(userId, 5);
        for (const stream of myStreams) {
          if (stream.status !== "live") {
            items.push({
              id: `mystream-${stream.id}`,
              type: "stream",
              title: stream.title || "Your stream",
              preview: stream.description || "Your broadcast archive",
              meta: {
                status: stream.status,
                streamType: stream.streamType,
                viewerCount: stream.viewerCount,
                spectralChannel: stream.spectralChannel,
                isOwn: true,
              },
              href: `/streaming/${stream.id}`,
              createdAt: stream.createdAt,
            });
          }
        }
      } catch (_) {}

      // Secure documents
      try {
        const docs = await storage.getSecureDocuments(userId, 8);
        for (const doc of docs) {
          items.push({
            id: `doc-${doc.id}`,
            type: "document",
            title: doc.title || "Secure Document",
            preview: doc.content ? doc.content.substring(0, 120) : "Encrypted document",
            meta: {
              accessLevel: doc.accessLevel,
              lambdaSignature: doc.lambdaSignature,
              spectralHash: doc.spectralHash,
              isEncrypted: doc.isEncrypted,
            },
            href: `/secure-docs`,
            createdAt: doc.createdAt,
          });
        }
      } catch (_) {}

      // Uploaded files
      try {
        const files = await storage.getUploadedFiles(userId, 8);
        for (const file of files) {
          items.push({
            id: `file-${file.id}`,
            type: "upload",
            title: file.originalName || file.filename,
            preview: `${(file.fileSize / 1024 / 1024).toFixed(2)} MB · ${file.mimeType}`,
            meta: {
              mimeType: file.mimeType,
              fileSize: file.fileSize,
              status: file.status,
              spectralHash: file.spectralHash,
              downloadUrl: file.fileUrl,
            },
            href: `/workspace/transmission`,
            createdAt: file.createdAt,
          });
        }
      } catch (_) {}

      // Wallet transactions
      try {
        const wallet = await storage.getWallet(userId);
        if (wallet) {
          const txs = await storage.getTransactions(wallet.id, 10);
          for (const tx of txs) {
            const isSend = tx.fromAddress === wallet.address;
            items.push({
              id: `tx-${tx.id}`,
              type: "transaction",
              title: isSend ? `Sent ${tx.amount} NXT` : `Received ${tx.amount} NXT`,
              preview: tx.memo || (isSend ? `→ ${tx.toAddress}` : `← ${tx.fromAddress}`),
              meta: {
                amount: tx.amount,
                fee: tx.fee,
                fromAddress: tx.fromAddress,
                toAddress: tx.toAddress,
                status: tx.status,
                wavelength: tx.wavelength,
                energyCost: tx.energyCost,
                isSend,
              },
              href: `/wallet`,
              createdAt: tx.createdAt,
            });
          }
        }
      } catch (_) {}

      // Sort by createdAt descending, take top `limit`
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const feed = items.slice(0, limit);

      res.json({ feed, total: feed.length });
    } catch (error: any) {
      console.error("Feed error:", error);
      res.status(500).json({ error: "Failed to load feed" });
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

  // ── Governance ────────────────────────────────────────────────────────────
  const BAND_WEIGHT: Record<string, number> = { SYSTEM: 8, KERNEL: 4, USER: 2, GUEST: 1 };
  const PROPOSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ============================================
  // CONSTITUTION STATUS — live enforcement state
  // ============================================

  app.get("/api/constitution/status", async (req: Request, res: Response) => {
    try {
      const allWallets      = await storage.getAllWallets();
      const totalCirculating = await storage.getTotalCirculatingSupply();

      // C-0001: Non-Dominance — check every wallet's share
      // GENESIS_EXECUTION_ADDRESS is exempt by pre-constitutional right (Block #0 coinbase)
      const walletShares = allWallets.map(w => {
        const bal  = parseFloat(w.balance);
        const pct  = totalCirculating > 0 ? bal / totalCirculating : 0;
        const genesisExempt = w.address === GENESIS_EXECUTION_ADDRESS;
        return { address: w.address, balanceNxt: bal, sharePct: pct, violates: !genesisExempt && pct > NON_DOMINANCE_PCT, genesisExempt };
      });
      const c0001Violation = walletShares.find(w => w.violates);

      // C-0002: Immutable Rights — check every wallet vs Basic Human Living Standard (1,150 NXT provided in services through the charity)
      const ihrChecks = allWallets.map(w => {
        const bal = parseFloat(w.balance);
        return { address: w.address, balanceNxt: bal, floorNxt: IHR_FLOOR_NXT, aboveFloor: bal >= IHR_FLOOR_NXT };
      });
      const c0002Violation = ihrChecks.find(w => !w.aboveFloor);

      // C-0005: Physics Supremacy — validate every live parameter
      const paramChecks = Object.entries(LIVE_FEES).map(([key, val]) => {
        const r = checkC0005("fee", val);
        return { key: `fee.${key}`, value: val, passed: r.passed, detail: r.violation?.detail };
      }).concat(Object.entries(LIVE_BURNS).map(([key, val]) => {
        const r = checkC0005("burn", val);
        return { key: `burn.${key}`, value: val, passed: r.passed, detail: r.violation?.detail };
      }));
      const c0005Violation = paramChecks.find(p => !p.passed);

      res.json({
        constitution: {
          version: "v1.0",
          enforcedAt: new Date().toISOString(),
          articles: {
            "C-0001": {
              rule:    "Non-Dominance",
              ceiling: NON_DOMINANCE_PCT,
              status:  c0001Violation ? "VIOLATED" : "COMPLIANT",
              detail:  c0001Violation
                ? `${c0001Violation.address} holds ${(c0001Violation.sharePct * 100).toFixed(2)}% of circulating supply`
                : `All wallets within the ${(NON_DOMINANCE_PCT * 100).toFixed(0)}% ceiling`,
              walletShares,
              totalCirculatingNxt: totalCirculating,
            },
            "C-0002": {
              rule:    "Immutable Rights",
              floorNxt: IHR_FLOOR_NXT,
              status:  c0002Violation ? "VIOLATED" : "COMPLIANT",
              detail:  c0002Violation
                ? `${c0002Violation.address} holds ${c0002Violation.balanceNxt.toFixed(8)} NXT — below the Basic Human Living Standard of ${IHR_FLOOR_NXT} NXT provided in services through the charity`
                : `All wallets at or above the Basic Human Living Standard of ${IHR_FLOOR_NXT} NXT provided in services through the charity`,
              ihrChecks,
            },
            "C-0005": {
              rule:    "Physics Supremacy",
              status:  c0005Violation ? "VIOLATED" : "COMPLIANT",
              detail:  c0005Violation
                ? `Parameter ${c0005Violation.key} = ${c0005Violation.value} — ${c0005Violation.detail}`
                : "All live protocol parameters are Maxwell-compliant",
              paramChecks,
            },
            "C-0006": {
              rule:        "NXT Hard Cap",
              hardCap:     21_000_000_000,
              hardCapSats: 21_000_000_000_000,
              status:      totalCirculating <= 21_000_000_000 ? "COMPLIANT" : "VIOLATED",
              detail:      totalCirculating <= 21_000_000_000
                ? `Total circulating supply ${totalCirculating.toLocaleString()} NXT is within the 21B NXT hard cap`
                : `CRITICAL: circulating supply ${totalCirculating.toLocaleString()} NXT exceeds the 21B NXT constitutional ceiling`,
              totalCirculating,
              amendment:   "This ceiling may only be raised by a governance vote achieving a supermajority (>66%) weighted by spectral authority band. No code change, emergency action, or single entity may bypass this requirement.",
            },
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================
  // SOP — Spectral Orthogonal Protocol negotiate
  // ============================================
  app.post("/api/wnsp/sop/negotiate", optionalAuth, async (req: Request, res: Response) => {
    try {
      const { usernameA, usernameB, psiA, psiB } = req.body as {
        usernameA?: string; usernameB?: string;
        psiA?: { wdm: number; oam: number; pol: string };
        psiB?: { wdm: number; oam: number; pol: string };
      };

      let chA: { wdm: number; oam: number; pol: string; nm?: number; band?: string; psi?: string };
      let chB: { wdm: number; oam: number; pol: string; nm?: number; band?: string; psi?: string };

      if (usernameA && usernameB) {
        chA = deriveChannel(usernameA);
        chB = deriveChannel(usernameB);
      } else if (psiA && psiB) {
        chA = psiA;
        chB = psiB;
      } else {
        return res.status(400).json({ error: "Provide usernameA+usernameB or psiA+psiB" });
      }

      // Inner product: 1 if ALL three dimensions match, 0 if any differ
      const wdmMatch = chA.wdm === chB.wdm;
      const oamMatch = chA.oam === chB.oam;
      const polMatch = chA.pol === chB.pol;
      const innerProduct = (wdmMatch && oamMatch && polMatch) ? 1 : 0;
      const orthogonal  = innerProduct === 0;

      // Resolution: if collision, increment OAM on B until clear
      let resolvedB = { ...chB };
      let collisionSteps = 0;
      if (!orthogonal) {
        resolvedB = { ...chB };
        while (resolvedB.wdm === chA.wdm && resolvedB.oam === chA.oam && resolvedB.pol === chA.pol) {
          resolvedB.oam = (resolvedB.oam + 1) % 50;
          collisionSteps++;
          if (collisionSteps > 50) { resolvedB.pol = resolvedB.pol === "H" ? "V" : "H"; break; }
        }
      }

      // Build certificate
      const ts = new Date().toISOString();
      const certId = `SOP-${Date.now().toString(36).toUpperCase()}`;
      const certificate = orthogonal ? {
        id: certId,
        issuedAt: ts,
        psiA: chA.psi ?? `Ψ(${chA.wdm},${chA.oam},${chA.pol})`,
        psiB: chB.psi ?? `Ψ(${chB.wdm},${chB.oam},${chB.pol})`,
        innerProduct: 0,
        orthogonal: true,
        verdict: "CHANNEL_OPEN_APPROVED",
        proof: `WDM[${chA.wdm}≠${chB.wdm}]·OAM[${chA.oam}≠${chB.oam}]·POL[${chA.pol}≠${chB.pol}] → ⟨Ψ_A|Ψ_B⟩=0`,
      } : null;

      res.json({
        orthogonal,
        innerProduct,
        channelA: { ...chA, psi: chA.psi ?? `Ψ(${chA.wdm},${chA.oam},${chA.pol})` },
        channelB: { ...chB, psi: chB.psi ?? `Ψ(${chB.wdm},${chB.oam},${chB.pol})` },
        dimensions: { wdmMatch, oamMatch, polMatch },
        certificate,
        resolution: !orthogonal ? {
          action: "INCREMENT_OAM",
          steps: collisionSteps,
          resolvedPsi: `Ψ(${resolvedB.wdm},${resolvedB.oam},${resolvedB.pol})`,
          message: `OAM incremented ${collisionSteps} step(s) to resolve collision`,
        } : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/governance/params — list all governable protocol parameters
  app.get("/api/governance/params", async (req: Request, res: Response) => {
    try {
      const params = await storage.getGovernanceParams();
      res.json({ params });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/governance/proposals — list proposals (optional ?status=active|passed|rejected|executed)
  app.get("/api/governance/proposals", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const proposals = await storage.getGovernanceProposals(status);
      res.json({ proposals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/governance/proposals/:id — get single proposal with votes
  app.get("/api/governance/proposals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const proposal = await storage.getGovernanceProposal(id);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      const votes = await storage.getGovernanceVotes(id);
      res.json({ proposal, votes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/governance/proposals — create a proposal (KERNEL+ band required)
  app.post("/api/governance/proposals", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const channel = deriveChannel(user.username);
      const band = getBand(channel.wdm);
      if (!hasAuthority(channel.wdm, "KERNEL")) {
        return res.status(403).json({ error: `KERNEL band or higher required. Your band: ${band}` });
      }

      // 10,000 sats anti-spam fee for governance proposals
      const PROPOSAL_FEE_SATS = 10000;
      const { db: govDb } = await import("./db");
      const { lightningWallets: govLnW, lightningTransactions: govLnTx } = await import("../shared/schema");
      const { eq: govEq } = await import("drizzle-orm");
      const [govLnWallet] = await govDb.select().from(govLnW).where(govEq(govLnW.userId, user.id));
      if (!govLnWallet || govLnWallet.satsBalance < PROPOSAL_FEE_SATS) {
        return res.status(402).json({ error: `Insufficient sats. Need ${PROPOSAL_FEE_SATS} sats to submit a proposal`, required: PROPOSAL_FEE_SATS, available: govLnWallet?.satsBalance ?? 0 });
      }
      await govDb.update(govLnW).set({ satsBalance: govLnWallet.satsBalance - PROPOSAL_FEE_SATS, updatedAt: new Date() }).where(govEq(govLnW.userId, user.id));
      await govDb.insert(govLnTx).values({ userId: user.id, type: "service_fee", amountSats: PROPOSAL_FEE_SATS, memo: `Governance proposal fee`, status: "settled" });

      const { title, rationale, parameterKey, proposedValue } = req.body;
      if (!title || !rationale || !parameterKey || !proposedValue) {
        return res.status(400).json({ error: "title, rationale, parameterKey, proposedValue required" });
      }
      const param = await storage.getGovernanceParam(parameterKey);
      if (!param) return res.status(404).json({ error: "Unknown parameter key" });
      const proposed = parseFloat(proposedValue);
      if (isNaN(proposed) || proposed < 0) {
        return res.status(400).json({ error: "proposedValue must be a positive number" });
      }
      // ── C-0005: Physics Supremacy — all parameter values must be Maxwell-valid ─
      const c0005 = checkC0005(param.category, proposed);
      if (!c0005.passed) {
        return res.status(403).json({
          error: `Constitutional violation — ${c0005.violation!.rule}`,
          detail: c0005.violation!.detail,
          article: c0005.violation!.article,
        });
      }
      // ─────────────────────────────────────────────────────────────────────
      const closesAt = new Date(Date.now() + PROPOSAL_DURATION_MS);
      const proposal = await storage.createGovernanceProposal({
        proposerId:    user.id,
        proposerName:  user.username,
        proposerBand:  band,
        title, rationale, parameterKey,
        currentValue:  param.value,
        proposedValue: proposed.toString(),
        closesAt,
      });
      res.status(201).json({ proposal });
    } catch (err: any) {
      if (err.message?.includes("unique") || err.code === "23505") {
        res.status(409).json({ error: "You already have an active proposal for this parameter" });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // POST /api/governance/proposals/:id/vote — cast a vote (all authenticated users)
  app.post("/api/governance/proposals/:id/vote", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const proposalId = parseInt(req.params.id);
      const { vote } = req.body;
      if (!["yes", "no", "abstain"].includes(vote)) {
        return res.status(400).json({ error: "vote must be yes, no, or abstain" });
      }
      const proposal = await storage.getGovernanceProposal(proposalId);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      if (proposal.status !== "active") {
        return res.status(400).json({ error: `Proposal is ${proposal.status}, not active` });
      }
      const existing = await storage.getUserVoteOnProposal(proposalId, user.id);
      if (existing) return res.status(409).json({ error: "You have already voted on this proposal" });
      const channel = deriveChannel(user.username);
      const band = getBand(channel.wdm);
      const bandBase = BAND_WEIGHT[band] ?? 1;
      const lnWalletGov = await ensureLnWallet(user.id);
      const satsBonus = Math.min(5, Math.floor(lnWalletGov.satsBalance / 10000));
      const weight = bandBase + satsBonus;
      const govVote = await storage.castGovernanceVote(proposalId, user.id, user.username, vote, weight, band);
      // Check for early execution threshold (>= 5 votes, yes > 80% of yes+no)
      const refreshed = await storage.getGovernanceProposal(proposalId);
      if (refreshed && refreshed.voteCount >= 5) {
        const total = refreshed.yesWeight + refreshed.noWeight;
        if (total > 0 && refreshed.yesWeight / total >= 0.8) {
          const executed = await storage.executeGovernanceProposal(proposalId);
          applyGovernanceParam(executed.parameterKey, parseFloat(executed.proposedValue));
          return res.json({ vote: govVote, proposal: executed, earlyExecution: true });
        }
      }
      // Auto-tally when proposal closes
      if (refreshed && refreshed.closesAt <= new Date()) {
        const tallied = await storage.tallyGovernanceProposal(proposalId);
        if (tallied.status === "passed") {
          const executed = await storage.executeGovernanceProposal(proposalId);
          applyGovernanceParam(executed.parameterKey, parseFloat(executed.proposedValue));
          return res.json({ vote: govVote, proposal: executed });
        }
        return res.json({ vote: govVote, proposal: tallied });
      }
      res.json({ vote: govVote, proposal: refreshed });
    } catch (err: any) {
      if (err.message?.includes("unique") || err.code === "23505") {
        res.status(409).json({ error: "You have already voted on this proposal" });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // POST /api/governance/proposals/:id/tally — manually finalize a closed proposal (SYSTEM band)
  app.post("/api/governance/proposals/:id/tally", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const channel = deriveChannel(user.username);
      if (!hasAuthority(channel.wdm, "SYSTEM")) {
        return res.status(403).json({ error: "SYSTEM band required to manually tally" });
      }
      const proposalId = parseInt(req.params.id);
      const proposal = await storage.getGovernanceProposal(proposalId);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      if (proposal.status !== "active") {
        return res.status(400).json({ error: `Proposal already ${proposal.status}` });
      }
      const tallied = await storage.tallyGovernanceProposal(proposalId);
      if (tallied.status === "passed") {
        const executed = await storage.executeGovernanceProposal(proposalId);
        applyGovernanceParam(executed.parameterKey, parseFloat(executed.proposedValue));
        // ── BTC auto-inscription hook ─────────────────────────────────────
        import("./btc-bridge-service").then(({ btcBridge }) => {
          btcBridge.triggerFromGovernance({ id: executed.id, title: executed.title, status: "executed", executor: user.username }).catch(() => {});
        }).catch(() => {});
        return res.json({ proposal: executed });
      }
      res.json({ proposal: tallied });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── TELEGRAM VIDEO ENDPOINTS ──────────────────────────────────────────────

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
  const TG_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

  // Helper: fetch a Telegram file URL
  async function getTelegramFileUrl(fileId: string): Promise<string | null> {
    try {
      const r = await fetch(`${TG_API}/getFile?file_id=${encodeURIComponent(fileId)}`);
      const data = await r.json() as any;
      if (!data.ok || !data.result?.file_path) return null;
      return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
    } catch { return null; }
  }

  // POST /api/telegram/webhook — receives Telegram bot updates (no auth)
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    try {
      const update = req.body;
      const message = update?.message || update?.channel_post;
      if (!message) return res.json({ ok: true });

      // Track chat IDs for fee alert broadcasts
      if (message.chat?.id) _feeAlertSubs.add(String(message.chat.id));

      const video = message.video || message.document;
      if (!video) return res.json({ ok: true });

      const isVideo = !!(message.video || (message.document?.mime_type?.startsWith("video/")));
      if (!isVideo) return res.json({ ok: true });

      // De-duplicate by file_unique_id
      const existing = await storage.getTelegramVideoByFileUniqueId(video.file_unique_id);
      if (existing) return res.json({ ok: true, duplicate: true });

      const caption = message.caption || message.text || null;
      const thumb = video.thumbnail || video.thumb;

      const saved = await storage.saveTelegramVideo({
        fileId:       video.file_id,
        fileUniqueId: video.file_unique_id,
        caption,
        mimeType:     video.mime_type || "video/mp4",
        fileSize:     video.file_size || null,
        duration:     video.duration || null,
        width:        video.width || null,
        height:       video.height || null,
        thumbFileId:  thumb?.file_id || null,
        messageId:    message.message_id || null,
        chatId:       String(message.chat?.id || ""),
        source:       "bot",
        channelUsername: message.chat?.username || null,
        channelPostId:   update.channel_post ? message.message_id : null,
        isPublished:  true,
      });

      // Fire VIDEO_RECEIVED → Social Broadcast Agent queues Instagram + YouTube jobs
      try {
        const { queueBroadcastsForVideo } = await import("./social_broadcast_agent");
        await queueBroadcastsForVideo(saved.id);
      } catch (broadcastErr: any) {
        console.error("[TELEGRAM WEBHOOK] broadcast queue error:", broadcastErr.message);
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[TELEGRAM WEBHOOK]", err.message);
      return res.status(500).json({ ok: false });
    }
  });

  // GET /api/telegram/videos — list all published videos (public)
  app.get("/api/telegram/videos", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || "50")), 100);
      const videos = await storage.getTelegramVideos(limit);
      res.json({ videos });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/telegram/video/:fileId/stream — proxy video bytes (keeps token server-side)
  app.get("/api/telegram/video/:fileId/stream", async (req: Request, res: Response) => {
    try {
      const fileUrl = await getTelegramFileUrl(req.params.fileId);
      if (!fileUrl) return res.status(422).json({ error: "FILE_TOO_LARGE", message: "Video exceeds Telegram's 20 MB bot download limit — watch it on Telegram directly." });

      const upstream = await fetch(fileUrl, {
        headers: req.headers.range ? { Range: req.headers.range } : {},
      });

      res.status(upstream.status);
      const ct = upstream.headers.get("content-type");
      const cl = upstream.headers.get("content-length");
      const cr = upstream.headers.get("content-range");
      if (ct) res.setHeader("Content-Type", ct);
      if (cl) res.setHeader("Content-Length", cl);
      if (cr) res.setHeader("Content-Range", cr);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=3600");

      if (!upstream.body) return res.end();
      const { Readable } = await import("stream");
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/telegram/video/:fileId/thumb — proxy thumbnail bytes
  app.get("/api/telegram/video/:fileId/thumb", async (req: Request, res: Response) => {
    try {
      const fileUrl = await getTelegramFileUrl(req.params.fileId);
      if (!fileUrl) return res.status(404).json({ error: "Thumb not found" });
      const upstream = await fetch(fileUrl);
      res.status(upstream.status);
      const ct = upstream.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      if (!upstream.body) return res.end();
      const { Readable } = await import("stream");
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/telegram/setup-webhook — register webhook URL with Telegram (auth required)
  app.post("/api/telegram/setup-webhook", authenticate, async (req: Request, res: Response) => {
    try {
      if (!TELEGRAM_BOT_TOKEN) return res.status(400).json({ error: "TELEGRAM_BOT_TOKEN not configured" });
      const domains = process.env.REPLIT_DOMAINS || "";
      const domain = domains.split(",")[0]?.trim();
      if (!domain) return res.status(400).json({ error: "Cannot determine app URL (REPLIT_DOMAINS not set)" });
      const webhookUrl = `https://${domain}/api/telegram/webhook`;
      const r = await fetch(`${TG_API}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "channel_post"] }),
      });
      const data = await r.json();
      res.json({ webhookUrl, telegram: data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/telegram/webhook-info — check current webhook status
  app.get("/api/telegram/webhook-info", authenticate, async (req: Request, res: Response) => {
    try {
      const r = await fetch(`${TG_API}/getWebhookInfo`);
      const data = await r.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/github/adoption — live protocol adoption stats (no auth required, public + traffic data)
  app.get("/api/github/adoption", async (req: Request, res: Response) => {
    try {
      const { getGitHubClient } = await import("./github");
      const octokit = await getGitHubClient();
      const owner = "nexusosdaily-code";
      const repos = ["NexusOS", "SpectrumEncoder", "NexusOS-Blockchain-Hub", "WNSP-P2P-Hub"];

      const results = await Promise.all(repos.map(async (repo) => {
        const [repoData, clones, views] = await Promise.allSettled([
          octokit.repos.get({ owner, repo }),
          octokit.repos.getClones({ owner, repo, per: "week" }),
          octokit.repos.getViews({ owner, repo, per: "week" }),
        ]);
        const r = repoData.status === "fulfilled" ? repoData.value.data : null;
        const c = clones.status === "fulfilled" ? clones.value.data : null;
        const v = views.status === "fulfilled" ? views.value.data : null;
        return {
          repo,
          stars: r?.stargazers_count ?? 0,
          forks: r?.forks_count ?? 0,
          watchers: r?.watchers_count ?? 0,
          open_issues: r?.open_issues_count ?? 0,
          clones_14d: c?.count ?? null,
          unique_cloners_14d: c?.uniques ?? null,
          views_14d: v?.count ?? null,
          unique_visitors_14d: v?.uniques ?? null,
          updated_at: r?.updated_at ?? null,
        };
      }));

      res.json({ repos: results, fetched_at: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── SOCIAL BROADCAST AGENT ENDPOINTS ─────────────────────────────────────────

  const { getBroadcastAgentState, queueBroadcastsForVideo } = await import("./social_broadcast_agent");

  // GET /api/social/agent — agent status + platform info
  app.get("/api/social/agent", authenticate, async (req: Request, res: Response) => {
    res.json(getBroadcastAgentState());
  });

  const socialAgent = await import("./social_broadcast_agent");

  // GET /api/social/broadcasts — full broadcast log
  app.get("/api/social/broadcasts", authenticate, async (req: Request, res: Response) => {
    try {
      const broadcasts = await socialAgent.getBroadcastLog();
      res.json({ broadcasts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/social/queue/:videoId — manually queue a video for broadcast
  app.post("/api/social/queue/:videoId", authenticate, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.videoId);
      if (isNaN(videoId)) return res.status(400).json({ error: "Invalid videoId" });
      await socialAgent.queueBroadcastsForVideo(videoId);
      res.json({ ok: true, message: `Queued video ${videoId} for broadcast on all platforms` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/social/retry/:broadcastId — retry a failed broadcast
  app.post("/api/social/retry/:broadcastId", authenticate, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.broadcastId);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid broadcastId" });
      await socialAgent.retryBroadcast(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/social/broadcasts/:id — dismiss a broadcast entry
  app.delete("/api/social/broadcasts/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await socialAgent.skipBroadcast(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── BTC Names Bridge ─────────────────────────────────────────────────────
  // Resolve .sats / .btc names or raw bc1p addresses → WNSP Ψ channel

  function addressToWnspChannel(addr: string) {
    const BAND_WIDTH = 400 / 128;
    const Cspeed = 3e8, Hconst = 6.626e-34, EVconst = 1.602e-19;
    let sumLambda = 0, sumCode = 0;
    for (let i = 0; i < addr.length; i++) {
      const code = addr.charCodeAt(i);
      const band = code % 128;
      const lambda = 380 + band * BAND_WIDTH + BAND_WIDTH / 2;
      sumLambda += lambda; sumCode += code;
    }
    const meanLambda = sumLambda / addr.length;
    const wdm = Math.floor(((meanLambda - 380) / 400) * 256);
    const oam = sumCode % 50;
    const pol = sumCode % 2 === 0 ? "H" : "V";
    const freq = (Cspeed / (meanLambda * 1e-9)) / 1e12;
    const energy = (Hconst * freq * 1e12) / EVconst;
    return { wdm, oam, pol, lambda: meanLambda, freq, energy, psi: `Ψ(${wdm},${oam},${pol})` };
  }

  app.get("/api/btc-bridge/resolve/:name", async (req: Request, res: Response) => {
    const rawName = decodeURIComponent(req.params.name).trim().toLowerCase();
    try {
      // Raw bc1p / bc1q / 1... / 3... address → derive channel directly
      if (rawName.startsWith("bc1") || /^[13]/.test(rawName)) {
        const ch = addressToWnspChannel(rawName);
        return res.json({
          name: rawName, nameType: "address", btcAddress: rawName,
          psi: ch.psi, wdm: ch.wdm, oam: ch.oam, pol: ch.pol,
          lambdaNm: ch.lambda.toFixed(4), freqThz: ch.freq.toFixed(6), energyEv: ch.energy.toFixed(6),
          source: "direct", status: "live",
        });
      }

      // .btc → Stacks BNS API
      if (rawName.endsWith(".btc")) {
        const namePart = rawName.replace(/\.btc$/, "");
        const bnsUrl = `https://api.mainnet.hiro.so/v1/names/${namePart}.btc`;
        const bnsRes = await fetch(bnsUrl, { headers: { "Accept": "application/json" } });
        if (bnsRes.ok) {
          const bnsData: any = await bnsRes.json();
          const btcAddr = bnsData.address || bnsData.zonefile_hash || null;
          if (btcAddr) {
            const ch = addressToWnspChannel(btcAddr);
            return res.json({
              name: rawName, nameType: "btc", btcAddress: btcAddr,
              psi: ch.psi, wdm: ch.wdm, oam: ch.oam, pol: ch.pol,
              lambdaNm: ch.lambda.toFixed(4), freqThz: ch.freq.toFixed(6), energyEv: ch.energy.toFixed(6),
              source: "Stacks BNS API", status: "live", raw: bnsData,
            });
          }
        }
        // Not yet registered — derive channel from the name string itself
        const ch = addressToWnspChannel(rawName);
        return res.json({
          name: rawName, nameType: "btc", btcAddress: null,
          psi: ch.psi, wdm: ch.wdm, oam: ch.oam, pol: ch.pol,
          lambdaNm: ch.lambda.toFixed(4), freqThz: ch.freq.toFixed(6), energyEv: ch.energy.toFixed(6),
          source: "name-derived (not yet registered)", status: "unregistered",
        });
      }

      // .sats → Unisat public lookup or name-derived fallback
      if (rawName.endsWith(".sats") || !rawName.includes(".")) {
        const cleanName = rawName.replace(/\.sats$/, "");
        // Try Unisat public API (no key required for basic lookup)
        try {
          const unisatUrl = `https://open-api.unisat.io/v1/indexer/brc20/transferable-inscriptions?ticker=${encodeURIComponent(cleanName)}&start=0&limit=1`;
          const uRes = await fetch(unisatUrl, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(4000) });
          // Unisat public endpoints may 403 without key — fall through gracefully
          if (uRes.ok) {
            const uData: any = await uRes.json();
            if (uData?.data?.inscriptions?.length > 0) {
              const insc = uData.data.inscriptions[0];
              const addr = insc.address || insc.currentAddress;
              if (addr) {
                const ch = addressToWnspChannel(addr);
                return res.json({
                  name: rawName.endsWith(".sats") ? rawName : `${rawName}.sats`,
                  nameType: "sats", btcAddress: addr,
                  psi: ch.psi, wdm: ch.wdm, oam: ch.oam, pol: ch.pol,
                  lambdaNm: ch.lambda.toFixed(4), freqThz: ch.freq.toFixed(6), energyEv: ch.energy.toFixed(6),
                  source: "Unisat API", status: "live",
                });
              }
            }
          }
        } catch (_) { /* fall through to name-derived */ }

        // Name-derived channel (pre-registration preview)
        const ch = addressToWnspChannel(rawName.endsWith(".sats") ? rawName : `${rawName}.sats`);
        return res.json({
          name: rawName.endsWith(".sats") ? rawName : `${rawName}.sats`,
          nameType: "sats", btcAddress: null,
          psi: ch.psi, wdm: ch.wdm, oam: ch.oam, pol: ch.pol,
          lambdaNm: ch.lambda.toFixed(4), freqThz: ch.freq.toFixed(6), energyEv: ch.energy.toFixed(6),
          source: "name-derived (register at unisat.io)", status: "unregistered",
        });
      }

      return res.status(400).json({ error: "Unrecognised name format. Try: wnsp.sats, wnsp.sat, wnsp.btc, wnsp.unisat, or a bc1p... address." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/btc-bridge/inscription/:id — check inscription on ordinals.com
  app.get("/api/btc-bridge/inscription/:id", async (req: Request, res: Response) => {
    const id = req.params.id;
    try {
      const r = await fetch(`https://ordinals.com/inscription/${id}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return res.status(404).json({ error: "Inscription not found" });
      const data = await r.json().catch(() => null);
      res.json({ inscriptionId: id, url: `https://ordinals.com/inscription/${id}`, data });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/btc-bridge/names — list known WNSP Bitcoin names
  app.get("/api/btc-bridge/names", async (_req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { btcNames } = await import("../shared/schema");
      const rows = await db.select().from(btcNames).orderBy(btcNames.createdAt);
      res.json({ names: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/btc-bridge/names — register a Bitcoin name for WNSP
  app.post("/api/btc-bridge/names", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { btcNames } = await import("../shared/schema");
      const { name, nameType, btcAddress, inscriptionId, notes } = req.body;
      if (!name || !nameType) return res.status(400).json({ error: "name and nameType required" });
      const ch = btcAddress ? addressToWnspChannel(btcAddress) : addressToWnspChannel(name);
      const [row] = await db.insert(btcNames).values({
        name: name.toLowerCase().trim(),
        nameType,
        btcAddress: btcAddress || null,
        inscriptionId: inscriptionId || null,
        psiChannel: ch.psi,
        wdm: ch.wdm, oam: ch.oam, pol: ch.pol,
        lambdaNm: ch.lambda.toFixed(4),
        freqThz: ch.freq.toFixed(6),
        energyEv: ch.energy.toFixed(6),
        status: btcAddress ? "registered" : "pending",
        notes: notes || null,
        ownedByUserId: (req as any).user?.id || null,
      }).onConflictDoUpdate({
        target: btcNames.name,
        set: { btcAddress, inscriptionId, status: btcAddress ? "registered" : "pending", notes },
      }).returning();
      res.json({ ok: true, name: row });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/btc-bridge/inscriptions — list tracked WNSP inscriptions
  app.get("/api/btc-bridge/inscriptions", async (_req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { btcInscriptions } = await import("../shared/schema");
      const rows = await db.select().from(btcInscriptions).orderBy(btcInscriptions.createdAt);
      res.json({ inscriptions: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/btc-bridge/inscriptions/:key — update inscription ID once confirmed on-chain
  app.post("/api/btc-bridge/inscriptions/:key", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { btcInscriptions } = await import("../shared/schema");
      const { inscriptionId, blockHeight, satoshi, notes } = req.body;
      const key = req.params.key;
      await db.insert(btcInscriptions).values({
        inscriptionKey: key,
        title: req.body.title || key,
        inscriptionId: inscriptionId || null,
        contentType: "text/plain",
        byteSize: req.body.byteSize || null,
        status: inscriptionId ? "inscribed" : "pending",
        blockHeight: blockHeight || null,
        satoshi: satoshi || null,
        ordinalsCom: inscriptionId ? `https://ordinals.com/inscription/${inscriptionId}` : null,
        notes: notes || null,
        inscribedAt: inscriptionId ? new Date() : null,
      }).onConflictDoUpdate({
        target: btcInscriptions.inscriptionKey,
        set: { inscriptionId, blockHeight, satoshi, status: inscriptionId ? "inscribed" : "pending", inscribedAt: inscriptionId ? new Date() : null, notes },
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── BTC Full-Auto Inscription Bridge ─────────────────────────────────────
  app.get("/api/btc-bridge/status", async (_req: Request, res: Response) => {
    try {
      const { btcBridge } = await import("./btc-bridge-service");
      res.json(btcBridge.getStatus());
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/processor/toggle", authenticate, async (req: Request, res: Response) => {
    try {
      const { enabled } = req.body;
      const { btcBridge } = await import("./btc-bridge-service");
      btcBridge.setEnabled(!!enabled);
      res.json({ ok: true, enabled: !!enabled });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/btc-bridge/wallet", async (_req: Request, res: Response) => {
    try {
      const { getServiceWalletInfo, getWalletBalance } = await import("./btc-inscription-engine");
      const info = getServiceWalletInfo();
      let balance = null;
      if (info.address) {
        try { balance = await getWalletBalance(info.address); } catch { balance = null; }
      }
      res.json({ ...info, balance });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/btc-bridge/queue", async (req: Request, res: Response) => {
    try {
      const { btcBridge } = await import("./btc-bridge-service");
      const status = req.query.status as string | undefined;
      const items = await btcBridge.getQueue(status);
      res.json({ items, total: items.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/inscribe/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const { db } = await import("./db");
      const { btcInscriptionQueue } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const [item] = await db.select().from(btcInscriptionQueue).where(eq(btcInscriptionQueue.id, id));
      if (!item) return res.status(404).json({ error: "Queue item not found" });
      if (item.status !== "pending") return res.status(400).json({ error: `Item already ${item.status}` });

      const { inscribeText } = await import("./btc-inscription-engine");
      const result = await inscribeText(item.inscriptionContent, {
        parentInscriptionId: item.parentInscriptionId ?? undefined,
        feeRate: req.body.feeRate,
      });

      await db.update(btcInscriptionQueue)
        .set({
          status: "confirmed",
          inscriptionId: result.inscriptionId,
          signedAt: new Date(),
          confirmedAt: new Date(),
        })
        .where(eq(btcInscriptionQueue.id, id));

      // Also update btcInscriptions table if this is a known inscription key
      res.json({ ok: true, ...result });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/inscribe-manual", authenticate, async (req: Request, res: Response) => {
    try {
      const { content, eventType, eventRef, parentInscriptionId } = req.body;
      if (!content) return res.status(400).json({ error: "content required" });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueEvent({
        type: eventType ?? "WASCII_MANUAL",
        ref: eventRef ?? `manual-${Date.now()}`,
        triggeredBy: (req as any).user?.username ?? "user",
        data: { content_preview: content.slice(0, 80) },
      });
      const { inscribeText } = await import("./btc-inscription-engine");
      const result = await inscribeText(content, { parentInscriptionId });
      const { db } = await import("./db");
      const { btcInscriptionQueue } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(btcInscriptionQueue).set({ status: "confirmed", inscriptionId: result.inscriptionId, confirmedAt: new Date(), signedAt: new Date() }).where(eq(btcInscriptionQueue.id, queued.id));
      res.json({ ok: true, queueId: queued.id, ...result });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/queue/trigger", async (req: Request, res: Response) => {
    try {
      const { eventType, data } = req.body;
      if (!eventType) return res.status(400).json({ error: "eventType required" });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueEvent({
        type: eventType,
        ref: `manual-${Date.now()}`,
        triggeredBy: (req as any).user?.username ?? "wnsp.io",
        data: data ?? {},
      });
      res.json({ ok: true, queued });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── BRC-20 routes ───────────────────────────────────────────────────────────

  app.post("/api/btc-bridge/brc20/deploy", authenticate, async (req: Request, res: Response) => {
    try {
      const { tick = "wnsp", max = "21000000000", lim = "1000" } = req.body;
      if (!tick || tick.length > 5) return res.status(400).json({ error: "tick required (max 5 chars)" });
      const content = JSON.stringify({ p: "brc-20", op: "deploy", tick: tick.toLowerCase(), max: String(max), lim: String(lim) });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:  "BRC20_DEPLOY",
        ref:        `brc20-deploy-${tick}-${Date.now()}`,
        content,
        triggeredBy: (req as any).user?.username ?? "wnsp.io",
        psiChannel: "Ψ(27,56,H)", // KERNEL band — same as wnsp.sats anchor
      });
      res.json({ ok: true, queued, content, note: "BRC-20 deploy queued — auto-inscribing to Bitcoin" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/brc20/mint", authenticate, async (req: Request, res: Response) => {
    try {
      const { tick = "wnsp", amt = "1000" } = req.body;
      if (!tick) return res.status(400).json({ error: "tick required" });
      if (parseFloat(amt) <= 0) return res.status(400).json({ error: "amt must be > 0" });
      const content = JSON.stringify({ p: "brc-20", op: "mint", tick: tick.toLowerCase(), amt: String(amt) });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:  "BRC20_MINT",
        ref:        `brc20-mint-${tick}-${Date.now()}`,
        content,
        triggeredBy: (req as any).user?.username ?? "wnsp.io",
      });
      res.json({ ok: true, queued, content });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/brc20/transfer", authenticate, async (req: Request, res: Response) => {
    try {
      const { tick = "wnsp", amt } = req.body;
      if (!tick || !amt) return res.status(400).json({ error: "tick and amt required" });
      const content = JSON.stringify({ p: "brc-20", op: "transfer", tick: tick.toLowerCase(), amt: String(amt) });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:  "BRC20_TRANSFER",
        ref:        `brc20-transfer-${tick}-${Date.now()}`,
        content,
        triggeredBy: (req as any).user?.username ?? "wnsp.io",
      });
      res.json({ ok: true, queued, content });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── RUNES BRIDGE ─────────────────────────────────────────────────────────────
  // Canonical WNSP-band → Rune-name mapping
  const WNSP_RUNE_MAP = [
    { band: "SYSTEM",  nm: [380,450], color: "#8b5cf6", runeName: "NEXUSOS•SYSTEM•BAND",  symbol: "Υ", supply: "21000000000", desc: "UV authority band — root orchestration layer" },
    { band: "KERNEL",  nm: [450,490], color: "#3b82f6", runeName: "NEXUSOS•KERNEL•BAND",  symbol: "Κ", supply: "21000000000", desc: "Blue band — OS kernel & boot events" },
    { band: "STREAM",  nm: [490,520], color: "#22d3ee", runeName: "NEXUSOS•STREAM•BAND",  symbol: "Σ", supply: "21000000000", desc: "Cyan band — real-time data streams" },
    { band: "CORE",    nm: [520,565], color: "#34d399", runeName: "NEXUSOS•CORE•BAND",    symbol: "Ω", supply: "21000000000", desc: "Green band — protocol core operations" },
    { band: "UI",      nm: [565,590], color: "#fbbf24", runeName: "NEXUSOS•UI•BAND",      symbol: "Φ", supply: "21000000000", desc: "Yellow band — user interface events" },
    { band: "EVENT",   nm: [590,625], color: "#f97316", runeName: "NEXUSOS•EVENT•BAND",   symbol: "Ε", supply: "21000000000", desc: "Orange band — governance & triggers" },
    { band: "STORAGE", nm: [625,780], color: "#f87171", runeName: "NEXUSOS•STORAGE•BAND", symbol: "Δ", supply: "21000000000", desc: "Red band — persistent state & files" },
    { band: "NXT",     nm: [380,780], color: "#a78bfa", runeName: "NEXUSOS•NXT•TOKEN",    symbol: "N", supply: "21000000000", desc: "Full-spectrum — NexusOS native currency" },
    { band: "WNSP",    nm: [380,780], color: "#fb923c", runeName: "NEXUSOS•WNSP•PROTOCOL",symbol: "Ψ", supply: "25600",       desc: "25,600 orthogonal Ψ channels — Hilbert space density" },
  ];

  app.get("/api/btc-bridge/runes", async (req: Request, res: Response) => {
    try {
      const { getServiceWallet } = await import("./btc-inscription-engine");
      const wallet = getServiceWallet();
      const address = wallet?.address ?? null;

      // On-chain Rune balances — Hiro v1 deprecated, use UniSat open API
      let chainBalances: any[] = [];
      let hiroError: string | null = null;
      if (address) {
        try {
          const r = await fetch(
            `https://open-api.unisat.io/v1/indexer/address/${address}/runes/balance-list?start=0&limit=20`,
            { headers: { "Accept": "application/json", "Authorization": "Bearer " }, signal: AbortSignal.timeout(8000) }
          );
          if (r.ok) { const d = await r.json(); chainBalances = d.data?.detail ?? []; }
          else hiroError = `UniSat API ${r.status} — check balance on unisat.io`;
        } catch (e: any) { hiroError = "External rune balance API unavailable — verify on UniSat directly"; }
      }

      // Queued Rune events from our DB
      const { db } = await import("./db");
      const { btcInscriptionQueue } = await import("../shared/schema");
      const { inArray } = await import("drizzle-orm");
      const runeQueue = await db.select().from(btcInscriptionQueue)
        .where(inArray(btcInscriptionQueue.eventType as any, ["RUNE_ETCH","RUNE_MINT","RUNE_TRANSFER"] as any));

      res.json({
        address,
        unisatRunesUrl:   address ? `https://unisat.io/runes/address/${address}` : null,
        mempoolRunesUrl:  address ? `https://mempool.space/address/${address}` : null,
        etchWizardUrl:    "https://unisat.io/runes/etch",
        wnspRuneMap:    WNSP_RUNE_MAP.map(r => ({
          ...r,
          unisatUrl:   `https://unisat.io/runes/detail/${encodeURIComponent(r.runeName)}`,
          ordinalsUrl: `https://magiceden.io/runes/${encodeURIComponent(r.runeName)}`,
          marketUrl:   `https://unisat.io/market/rune?tick=${encodeURIComponent(r.runeName)}`,
        })),
        chainBalances,
        hiroError,
        runeQueue: runeQueue.map(i => ({
          id: i.id, eventType: i.eventType, status: i.status,
          inscriptionId: i.inscriptionId,
          contentPreview: i.inscriptionContent.slice(0, 200),
          confirmedAt: i.confirmedAt,
        })),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Etch a new Rune linked to a WNSP spectral channel — inscribes the claim on Bitcoin
  // ── Band art SVG generator ──────────────────────────────────────────────────
  const BAND_PHYSICS: Record<string, { nm: [number,number]; color: string; symbol: string; runeName: string; desc: string }> = {
    SYSTEM:  { nm:[380,450], color:"#8b5cf6", symbol:"Υ", runeName:"NEXUSOS•SYSTEM•BAND",  desc:"UV authority band — root orchestration layer" },
    KERNEL:  { nm:[450,490], color:"#3b82f6", symbol:"Κ", runeName:"NEXUSOS•KERNEL•BAND",  desc:"Blue band — OS kernel & boot events" },
    STREAM:  { nm:[490,520], color:"#22d3ee", symbol:"Σ", runeName:"NEXUSOS•STREAM•BAND",  desc:"Cyan band — real-time data streams" },
    CORE:    { nm:[520,565], color:"#34d399", symbol:"Ω", runeName:"NEXUSOS•CORE•BAND",    desc:"Green band — protocol core operations" },
    UI:      { nm:[565,590], color:"#fbbf24", symbol:"Φ", runeName:"NEXUSOS•UI•BAND",      desc:"Yellow band — user interface events" },
    EVENT:   { nm:[590,625], color:"#f97316", symbol:"Ε", runeName:"NEXUSOS•EVENT•BAND",   desc:"Orange band — governance & triggers" },
    STORAGE: { nm:[625,780], color:"#f87171", symbol:"Δ", runeName:"NEXUSOS•STORAGE•BAND", desc:"Red band — persistent state & files" },
    NXT:     { nm:[380,780], color:"#a78bfa", symbol:"N", runeName:"NEXUSOS•NXT•TOKEN",    desc:"Full-spectrum — NexusOS native currency" },
    WNSP:    { nm:[380,780], color:"#fb923c", symbol:"Ψ", runeName:"NEXUSOS•WNSP•PROTOCOL",desc:"25,600 orthogonal Ψ channels — Hilbert space" },
  };

  function xmlEsc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  function generateBandSvg(band: string): string {
    const b = BAND_PHYSICS[band];
    if (!b) return "";
    const C = 3e8, H = 6.626e-34, EV = 1.602e-19;
    const midNm = (b.nm[0] + b.nm[1]) / 2;
    const freqTHz = (C / (midNm * 1e-9) / 1e12).toFixed(3);
    const energyEv = (H * (C / (midNm * 1e-9)) / EV).toExponential(3);

    // Spectrum gradient stops (380→780nm, 7 colour stops)
    const specStops = [
      {pct:0,   c:"#8b5cf6"}, {pct:17,  c:"#3b82f6"}, {pct:27,  c:"#22d3ee"},
      {pct:43,  c:"#34d399"}, {pct:57,  c:"#fbbf24"}, {pct:68,  c:"#f97316"},
      {pct:100, c:"#f87171"},
    ];

    // Band highlight x/width on 400nm span
    const specW = 520, specX = 40;
    const hlStart = (b.nm[0] - 380) / 400 * specW + specX;
    const hlEnd   = (b.nm[1] - 380) / 400 * specW + specX;
    const hlW     = Math.max(hlEnd - hlStart, 4);

    const stopTags = specStops.map(s => `<stop offset="${s.pct}%" stop-color="${s.c}"/>`).join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">
  <defs>
    <linearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">${stopTags}</linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a1a"/><stop offset="100%" stop-color="#050510"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="420" fill="url(#bg)"/>
  <rect width="600" height="420" fill="${b.color}" fill-opacity="0.04"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="600" height="2" fill="${b.color}" opacity="0.6"/>

  <!-- Spectrum bar -->
  <rect x="${specX}" y="50" width="${specW}" height="28" rx="4" fill="url(#spectrum)" opacity="0.85"/>

  <!-- Band highlight overlay -->
  <rect x="${hlStart}" y="46" width="${hlW}" height="36" rx="3" fill="${b.color}" fill-opacity="0.35"/>
  <rect x="${hlStart}" y="46" width="${hlW}" height="36" rx="3" fill="none" stroke="${b.color}" stroke-width="2" filter="url(#glow)"/>

  <!-- Spectrum labels -->
  <text x="${specX}" y="98" fill="#ffffff30" font-size="9" font-family="monospace">380nm</text>
  <text x="${specX + specW - 30}" y="98" fill="#ffffff30" font-size="9" font-family="monospace">780nm</text>

  <!-- Band tick marks -->
  <line x1="${hlStart}" y1="82" x2="${hlStart}" y2="95" stroke="${b.color}" stroke-width="1" opacity="0.7"/>
  <line x1="${hlEnd}"   y1="82" x2="${hlEnd}"   y2="95" stroke="${b.color}" stroke-width="1" opacity="0.7"/>
  <text x="${(hlStart+hlEnd)/2}" y="108" fill="${b.color}" font-size="9" font-family="monospace" text-anchor="middle">${b.nm[0]}&#8211;${b.nm[1]}nm</text>

  <!-- Big symbol -->
  <text x="54" y="190" fill="${b.color}" font-size="80" font-family="serif" opacity="0.18">${xmlEsc(b.symbol)}</text>
  <text x="50" y="185" fill="${b.color}" font-size="80" font-family="serif" filter="url(#glow)" opacity="0.9">${xmlEsc(b.symbol)}</text>

  <!-- Band name -->
  <text x="150" y="148" fill="${b.color}" font-size="28" font-family="monospace" font-weight="bold" letter-spacing="3">${xmlEsc(band)}</text>
  <text x="150" y="172" fill="#ffffff60" font-size="12" font-family="monospace">WNSP Authority Band</text>

  <!-- Rune name -->
  <rect x="40" y="210" width="520" height="38" rx="6" fill="${b.color}" fill-opacity="0.1" stroke="${b.color}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="300" y="234" fill="${b.color}" font-size="15" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="2">${xmlEsc(b.runeName)}</text>

  <!-- Physics data -->
  <text x="40" y="280" fill="#ffffff40" font-size="10" font-family="monospace">&#955;  (mid)</text>
  <text x="160" y="280" fill="#ffffff80" font-size="10" font-family="monospace">${midNm.toFixed(1)} nm</text>
  <text x="40" y="298" fill="#ffffff40" font-size="10" font-family="monospace">&#957;  (freq)</text>
  <text x="160" y="298" fill="#ffffff80" font-size="10" font-family="monospace">${freqTHz} THz</text>
  <text x="40" y="316" fill="#ffffff40" font-size="10" font-family="monospace">E  (photon)</text>
  <text x="160" y="316" fill="#ffffff80" font-size="10" font-family="monospace">${xmlEsc(energyEv)} eV</text>
  <text x="40" y="334" fill="#ffffff40" font-size="10" font-family="monospace">E=hf / c&#178;</text>
  <text x="160" y="334" fill="#ffffff80" font-size="10" font-family="monospace">Compression State &#923;</text>

  <!-- Right column -->
  <text x="340" y="280" fill="#ffffff40" font-size="10" font-family="monospace">Protocol</text>
  <text x="420" y="280" fill="#ffffff80" font-size="10" font-family="monospace">WNSP v1.0</text>
  <text x="340" y="298" fill="#ffffff40" font-size="10" font-family="monospace">Standard</text>
  <text x="420" y="298" fill="#ffffff80" font-size="10" font-family="monospace">Runes + Ordinals</text>
  <text x="340" y="316" fill="#ffffff40" font-size="10" font-family="monospace">License</text>
  <text x="420" y="316" fill="#ffffff80" font-size="10" font-family="monospace">AGPL-3.0</text>
  <text x="340" y="334" fill="#ffffff40" font-size="10" font-family="monospace">Channels</text>
  <text x="420" y="334" fill="#ffffff80" font-size="10" font-family="monospace">25,600 &#936; (Hilbert)</text>

  <!-- Desc -->
  <text x="300" y="374" fill="#ffffff30" font-size="10" font-family="monospace" text-anchor="middle">${xmlEsc(b.desc)}</text>

  <!-- Footer -->
  <line x1="40" y1="388" x2="560" y2="388" stroke="${b.color}" stroke-opacity="0.2" stroke-width="1"/>
  <text x="40"  y="408" fill="${b.color}" font-size="9" font-family="monospace" opacity="0.5">NexusOS &#183; wnsp.io &#183; Bitcoin Ordinals &#183; First disclosure 2026</text>
  <text x="560" y="408" fill="${b.color}" font-size="9" font-family="monospace" opacity="0.5" text-anchor="end">Inscription Art v1.0</text>
</svg>`;
  }

  // Serve SVG preview (no auth needed — public art)
  app.get("/api/btc-bridge/runes/band-art/:band", (req: Request, res: Response) => {
    const band = req.params.band.toUpperCase();
    const svg = generateBandSvg(band);
    if (!svg) return res.status(404).json({ error: `Unknown band: ${band}` });
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(svg);
  });

  // Inscribe band art as an Ordinal (queues the SVG on-chain)
  app.post("/api/btc-bridge/runes/inscribe-art", authenticate, async (req: Request, res: Response) => {
    try {
      const { band } = req.body;
      if (!band) return res.status(400).json({ error: "band required" });
      const bp = BAND_PHYSICS[band.toUpperCase()];
      if (!bp) return res.status(404).json({ error: `Unknown band: ${band}` });
      const svg = generateBandSvg(band.toUpperCase());
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:   "RUNE_ETCH",
        ref:         `rune-art-${band.toUpperCase()}-${Date.now()}`,
        content:     svg,
        triggeredBy: (req as any).user?.username ?? "wnsp.io",
        psiChannel:  `Ψ(ART,${band},SVG)`,
      });
      await logAction(req, "rune_art_inscribed", "runes", queued.id?.toString(), {}, "success",
        `Band art inscription queued: ${band}`);
      res.json({
        ok: true, queued, band, svgBytes: svg.length,
        note: "Once this inscription confirms, use its inscription ID as the icon when etching the Rune on Unisat.",
        unisatEtchUrl: "https://unisat.io/runes/etch",
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/runes/etch", authenticate, async (req: Request, res: Response) => {
    try {
      const { runeName, band, symbol, supply, decimals = 0, mintCap, mintAmount, premine = "0", turbo = true, note } = req.body;
      if (!runeName || !band) return res.status(400).json({ error: "runeName and band required" });

      const cleanName = String(runeName).toUpperCase().replace(/[^A-Z•]/g, "").trim();
      if (cleanName.length < 3) return res.status(400).json({ error: "Rune name too short" });

      const content = JSON.stringify({
        p: "wnsp-rune",
        op: "etch",
        rune: cleanName,
        band,
        symbol: symbol ?? "Ψ",
        supply: supply ?? "21000000000",
        decimals,
        ...(mintCap   ? { mint_cap: String(mintCap) }    : {}),
        ...(mintAmount? { mint_amount: String(mintAmount)}: {}),
        premine: String(premine),
        turbo,
        psi: `WNSP-RUNE-ETCH-${cleanName}`,
        note: note ?? `NexusOS WNSP spectral channel claim — ${band} band`,
        timestamp: new Date().toISOString(),
        protocol: "wnsp://runes/v1",
      });

      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:   "RUNE_ETCH",
        ref:         `rune-etch-${cleanName}-${Date.now()}`,
        content,
        triggeredBy: (req as any).user?.username ?? "wnsp.io",
      });

      await logAction(req, "rune_etch_queued", "runes", queued.id?.toString(), {}, "success",
        `Rune etch queued: ${cleanName} (${band} band)`);
      res.json({ ok: true, queued, runeName: cleanName, content,
        unisatEtchUrl: "https://unisat.io/runes/etch",
        note: "Inscription claims this Rune name on Bitcoin. Complete the on-chain etch via Unisat wallet to activate the Rune protocol." });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Mint units of an existing Rune
  app.post("/api/btc-bridge/runes/mint", authenticate, async (req: Request, res: Response) => {
    try {
      const { runeName, amount } = req.body;
      if (!runeName || !amount) return res.status(400).json({ error: "runeName and amount required" });
      const cleanName = String(runeName).toUpperCase().replace(/[^A-Z•]/g, "").trim();
      const content = JSON.stringify({ p: "wnsp-rune", op: "mint", rune: cleanName, amt: String(amount), timestamp: new Date().toISOString() });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({ eventType: "RUNE_MINT", ref: `rune-mint-${cleanName}-${Date.now()}`, content, triggeredBy: (req as any).user?.username ?? "wnsp.io" });
      res.json({ ok: true, queued, runeName: cleanName });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Unisat Bridge — fetch on-chain inscriptions for our service wallet and cross-ref DB
  app.get("/api/btc-bridge/unisat-bridge", async (req: Request, res: Response) => {
    try {
      const { getServiceWallet } = await import("./btc-inscription-engine");
      const wallet = getServiceWallet();
      const address = wallet?.address ?? null;

      const { db } = await import("./db");
      const { btcInscriptionQueue } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      // All confirmed items from our DB
      const dbItems = await db.select().from(btcInscriptionQueue)
        .where(eq(btcInscriptionQueue.status, "confirmed"))
        .orderBy(desc(btcInscriptionQueue.confirmedAt));

      // Attempt to fetch on-chain inscriptions via Ordiscan (Hiro v1 deprecated)
      let hiroInscriptions: any[] = [];
      let hiroError: string | null = null;
      if (address) {
        try {
          const res = await fetch(
            `https://api.hiro.so/ordinals/v2/inscriptions?address=${address}&limit=60`,
            { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const d = await res.json();
            hiroInscriptions = d.results ?? [];
          } else {
            hiroError = `Ordinals API ${res.status} — showing DB records only`;
          }
        } catch (e: any) { hiroError = "Ordinals chain sync unavailable — showing DB records only"; }
      }

      // BRC-20 ticks we've deployed/minted
      const brc20Items = await db.select().from(btcInscriptionQueue)
        .where(eq(btcInscriptionQueue.status, "confirmed"));
      const brc20Ticks = [...new Set(
        brc20Items
          .filter(i => ["BRC20_DEPLOY","BRC20_MINT","BRC20_TRANSFER"].includes(i.eventType))
          .map(i => { try { return JSON.parse(i.inscriptionContent).tick; } catch { return null; } })
          .filter(Boolean)
      )];

      res.json({
        address,
        unisatWalletUrl:  address ? `https://unisat.io/address/${address}` : null,
        ordinalsWalletUrl: address ? `https://ordinals.com/address/${address}` : null,
        mempoolUrl:       address ? `https://mempool.space/address/${address}` : null,
        dbItems: dbItems.map(i => ({
          id: i.id,
          inscriptionId: i.inscriptionId,
          eventType: i.eventType,
          contentPreview: i.inscriptionContent.slice(0, 120),
          confirmedAt: i.confirmedAt,
          unisatUrl: i.inscriptionId ? `https://unisat.io/inscription/${i.inscriptionId}` : null,
          ordinalsUrl: i.inscriptionId ? `https://ordinals.com/inscription/${i.inscriptionId}` : null,
          gamma: i.inscriptionId ? `https://gamma.io/ordinals/inscriptions/${i.inscriptionId}` : null,
        })),
        hiroInscriptions,
        hiroError,
        brc20Ticks: brc20Ticks.map(tick => ({
          tick,
          unisatUrl: `https://unisat.io/brc20/${tick}`,
          marketUrl: `https://unisat.io/market/brc20?tick=${tick}`,
        })),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch("/api/btc-bridge/queue/:id/confirm", authenticate, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { inscriptionId } = req.body;
      const { db } = await import("./db");
      const { btcInscriptionQueue } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(btcInscriptionQueue).set({ status: "confirmed", inscriptionId, confirmedAt: new Date(), signedAt: new Date() }).where(eq(btcInscriptionQueue.id, id));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/btc-bridge/anchor", async (req: Request, res: Response) => {
    try {
      const { address, parentInscriptionId } = req.body;
      const { btcBridge } = await import("./btc-bridge-service");
      await btcBridge.saveAnchor(address ?? null, parentInscriptionId ?? null);
      res.json({ ok: true, address: address ?? null, parentInscriptionId: parentInscriptionId ?? null });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/btc-bridge/anchor", async (_req: Request, res: Response) => {
    try {
      const { btcBridge } = await import("./btc-bridge-service");
      res.json(btcBridge.getAnchor());
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/btc-bridge/fee-rate", async (_req: Request, res: Response) => {
    try {
      const { getFeeRate } = await import("./btc-inscription-engine");
      const [fast, medium, slow] = await Promise.all([getFeeRate("fast"), getFeeRate("medium"), getFeeRate("slow")]);
      res.json({ fast, medium, slow, unit: "sat/vbyte" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── COMMUNITY MINT PORTAL ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const COMMUNITY_MINT_SATS_FEE = 50000;
  const COMMUNITY_MINT_WNSP_AMT = "1000";

  app.post("/api/community/mint", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { db: mintDb } = await import("./db");
      const { lightningWallets: mintLnW, lightningTransactions: mintLnTx } = await import("../shared/schema");
      const { eq: mintEq } = await import("drizzle-orm");
      const [mintLnWallet] = await mintDb.select().from(mintLnW).where(mintEq(mintLnW.userId, user.id));
      if (!mintLnWallet || mintLnWallet.satsBalance < COMMUNITY_MINT_SATS_FEE) {
        return res.status(402).json({
          error: `Insufficient sats. Need ${COMMUNITY_MINT_SATS_FEE} sats to mint.`,
          required: COMMUNITY_MINT_SATS_FEE,
          available: mintLnWallet?.satsBalance ?? 0,
        });
      }
      const newBalance = mintLnWallet.satsBalance - COMMUNITY_MINT_SATS_FEE;
      await mintDb.update(mintLnW).set({ satsBalance: newBalance, updatedAt: new Date() }).where(mintEq(mintLnW.userId, user.id));
      await mintDb.insert(mintLnTx).values({ userId: user.id, type: "service_fee", amountSats: COMMUNITY_MINT_SATS_FEE, memo: `Community WNSP mint`, status: "settled" });

      // Queue BRC-20 mint inscription
      const content = JSON.stringify({ p: "brc-20", op: "mint", tick: "wnsp", amt: COMMUNITY_MINT_WNSP_AMT });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:  "BRC20_MINT",
        ref:        `community-mint-${user.username}-${Date.now()}`,
        content,
        triggeredBy: user.username,
      });

      // Record in community_mints table
      const { db: mintRecordDb } = await import("./db");
      const { communityMints } = await import("../shared/schema");
      const [row] = await mintRecordDb.insert(communityMints).values({
        userId:     user.id,
        username:   user.username,
        nxtFeePaid: (COMMUNITY_MINT_SATS_FEE / 1000).toFixed(8),
        queueId:    queued.id ? parseInt(String(queued.id)) : null,
        status:     "queued",
      }).returning();

      res.json({
        ok: true,
        mintId: row.id,
        queueId: queued.id,
        wnspAmount: COMMUNITY_MINT_WNSP_AMT,
        satsFee: COMMUNITY_MINT_SATS_FEE,
        remainingSats: newBalance,
        message: `Mint queued! ${COMMUNITY_MINT_WNSP_AMT} wnsp will be inscribed to Bitcoin. ${COMMUNITY_MINT_SATS_FEE.toLocaleString()} sats paid.`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/community/mints", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { db } = await import("./db");
      const { communityMints, btcInscriptionQueue } = await import("../shared/schema");
      const { desc, eq } = await import("drizzle-orm");

      const userMints = await db.select().from(communityMints)
        .where(eq(communityMints.userId, user.id))
        .orderBy(desc(communityMints.createdAt))
        .limit(20);

      // Enrich with queue status
      const enriched = await Promise.all(userMints.map(async (m) => {
        if (!m.queueId) return m;
        const [qItem] = await db.select().from(btcInscriptionQueue).where(eq(btcInscriptionQueue.id, m.queueId));
        return { ...m, queueStatus: qItem?.status, inscriptionId: qItem?.inscriptionId ?? m.inscriptionId };
      }));

      res.json(enriched);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/community/mints/all", async (_req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { communityMints } = await import("../shared/schema");
      const { desc } = await import("drizzle-orm");
      const rows = await db.select().from(communityMints).orderBy(desc(communityMints.createdAt)).limit(50);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── WNSP STAKING DASHBOARD ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const STAKING_NXT_PER_EPOCH = 100;    // NXT per epoch per stake
  const EPOCH_DURATION_MS     = 86_400_000;  // 24 hours

  function calcEpochsAndReward(stakedAt: Date, lastClaimAt: Date | null): { epochs: number; reward: number } {
    const from = lastClaimAt ?? stakedAt;
    const elapsed = Date.now() - from.getTime();
    const epochs = Math.floor(elapsed / EPOCH_DURATION_MS);
    return { epochs, reward: epochs * STAKING_NXT_PER_EPOCH };
  }

  app.post("/api/staking/stake", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { inscriptionId, wnspAmount = 1000 } = req.body;
      if (!inscriptionId) return res.status(400).json({ error: "inscriptionId required" });

      const { db } = await import("./db");
      const { wnspStakes } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // Check not already staked
      const existing = await db.select().from(wnspStakes).where(eq(wnspStakes.inscriptionId, inscriptionId)).limit(1);
      if (existing.length > 0) return res.status(409).json({ error: "Inscription already staked" });

      const [stake] = await db.insert(wnspStakes).values({
        userId: user.id,
        inscriptionId,
        wnspAmount: Math.min(Math.max(parseInt(String(wnspAmount)), 1), 100000),
        status: "active",
        epochsCompleted: 0,
        nxtEarned: "0",
        nxtClaimed: "0",
      }).returning();

      res.json({ ok: true, stake, message: `Inscription ${inscriptionId} staked. Earning ${STAKING_NXT_PER_EPOCH} NXT per 24h epoch.` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/staking/claim", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { stakeId } = req.body;
      if (!stakeId) return res.status(400).json({ error: "stakeId required" });

      const { db } = await import("./db");
      const { wnspStakes } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [stake] = await db.select().from(wnspStakes)
        .where(and(eq(wnspStakes.id, parseInt(String(stakeId))), eq(wnspStakes.userId, user.id)));
      if (!stake) return res.status(404).json({ error: "Stake not found" });
      if (stake.status !== "active") return res.status(400).json({ error: "Stake is not active" });

      const { epochs, reward } = calcEpochsAndReward(stake.stakedAt, stake.lastClaimAt);
      if (epochs === 0) return res.status(400).json({ error: "No complete epochs yet. Check back in 24 hours.", nextClaimIn: "24h" });

      // Credit NXT to user wallet
      const wallet = await storage.getWallet(user.id);
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });
      const newBalance = (parseFloat(wallet.balance) + reward).toFixed(8);
      await storage.updateWalletBalance(wallet.id, newBalance);

      // Update stake record
      const totalEarned = (parseFloat(stake.nxtEarned) + reward).toFixed(8);
      const totalClaimed = (parseFloat(stake.nxtClaimed) + reward).toFixed(8);
      await db.update(wnspStakes).set({
        epochsCompleted: stake.epochsCompleted + epochs,
        nxtEarned: totalEarned,
        nxtClaimed: totalClaimed,
        lastClaimAt: new Date(),
      }).where(eq(wnspStakes.id, stake.id));

      res.json({ ok: true, epochsClaimed: epochs, nxtRewarded: reward.toFixed(8), newBalance, message: `Claimed ${reward} NXT for ${epochs} epoch(s)!` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/staking/unstake", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { stakeId } = req.body;
      if (!stakeId) return res.status(400).json({ error: "stakeId required" });

      const { db } = await import("./db");
      const { wnspStakes } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [stake] = await db.select().from(wnspStakes)
        .where(and(eq(wnspStakes.id, parseInt(String(stakeId))), eq(wnspStakes.userId, user.id)));
      if (!stake) return res.status(404).json({ error: "Stake not found" });
      if (stake.status !== "active") return res.status(400).json({ error: "Stake is not active" });

      // Auto-claim any pending rewards before unstaking
      const { epochs, reward } = calcEpochsAndReward(stake.stakedAt, stake.lastClaimAt);
      if (reward > 0) {
        const wallet = await storage.getWallet(user.id);
        if (wallet) {
          const newBalance = (parseFloat(wallet.balance) + reward).toFixed(8);
          await storage.updateWalletBalance(wallet.id, newBalance);
        }
      }

      const totalEarned = (parseFloat(stake.nxtEarned) + reward).toFixed(8);
      const totalClaimed = (parseFloat(stake.nxtClaimed) + reward).toFixed(8);
      await db.update(wnspStakes).set({
        status: "unstaked",
        unstakedAt: new Date(),
        epochsCompleted: stake.epochsCompleted + epochs,
        nxtEarned: totalEarned,
        nxtClaimed: totalClaimed,
      }).where(eq(wnspStakes.id, stake.id));

      res.json({ ok: true, finalRewardClaimed: reward.toFixed(8), message: "Unstaked successfully. Auto-claimed remaining rewards." });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/staking/positions", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { db } = await import("./db");
      const { wnspStakes } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const stakes = await db.select().from(wnspStakes)
        .where(eq(wnspStakes.userId, user.id))
        .orderBy(desc(wnspStakes.stakedAt));
      // Enrich with pending reward
      const enriched = stakes.map(s => {
        if (s.status !== "active") return { ...s, pendingReward: "0", pendingEpochs: 0 };
        const { epochs, reward } = calcEpochsAndReward(s.stakedAt, s.lastClaimAt);
        return { ...s, pendingReward: reward.toFixed(8), pendingEpochs: epochs };
      });
      res.json(enriched);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/staking/stats", async (_req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspStakes } = await import("../shared/schema");
      const { eq, count, sum } = await import("drizzle-orm");
      const [{ total }] = await db.select({ total: count() }).from(wnspStakes).where(eq(wnspStakes.status, "active"));
      const [{ totalWnsp }] = await db.select({ totalWnsp: sum(wnspStakes.wnspAmount) }).from(wnspStakes).where(eq(wnspStakes.status, "active"));
      const [{ totalNxtPaid }] = await db.select({ totalNxtPaid: sum(wnspStakes.nxtClaimed) }).from(wnspStakes);
      res.json({
        activeStakes: total ?? 0,
        totalWnspStaked: totalWnsp ?? "0",
        totalNxtRewarded: totalNxtPaid ?? "0",
        nxtPerEpoch: STAKING_NXT_PER_EPOCH,
        epochDurationHours: 24,
        apy_estimate: "~36500% NXT yield on wnsp",
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── FRACTAL BITCOIN BRIDGE ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  const FRACTAL_MEMPOOL = "https://mempool.fractalbitcoin.io/api";

  app.get("/api/fractal/balance/:address", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const r = await fetch(`${FRACTAL_MEMPOOL}/address/${address}`);
      if (!r.ok) return res.status(502).json({ error: "Fractal mempool unavailable" });
      const data = await r.json() as any;
      res.json({
        address,
        confirmed:   data.chain_stats?.funded_txo_sum - data.chain_stats?.spent_txo_sum,
        unconfirmed: data.mempool_stats?.funded_txo_sum - data.mempool_stats?.spent_txo_sum,
        txCount:     data.chain_stats?.tx_count,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/fractal/fee-rate", async (_req: Request, res: Response) => {
    try {
      const r = await fetch(`${FRACTAL_MEMPOOL}/v1/fees/recommended`);
      if (!r.ok) return res.status(502).json({ error: "Fractal mempool unavailable" });
      const data = await r.json() as any;
      res.json({ ...data, network: "fractal-bitcoin" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/fractal/inscribe", authenticate, async (req: Request, res: Response) => {
    try {
      const { content, contentType = "text/plain", receiverAddress } = req.body;
      if (!content || !receiverAddress) return res.status(400).json({ error: "content and receiverAddress required" });
      // Queue as a bridge event — Fractal Bitcoin uses same Taproot inscription format
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:  "BRC20_MINT",
        ref:        `fractal-inscribe-${Date.now()}`,
        content:    typeof content === "string" ? content : JSON.stringify(content),
        triggeredBy: (req as any).user?.username ?? "fractal",
      });
      res.json({ ok: true, queued, network: "fractal-bitcoin", note: "Inscription queued. Fractal Bitcoin uses same Taproot format as mainnet." });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get("/api/fractal/inscriptions/:address", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const r = await fetch(`https://open-api.unisat.io/v1/indexer/fractal/address/${address}/inscription-data?size=10`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) {
        return res.json({ address, inscriptions: [], note: "Fractal indexer not available — check UniSat Fractal explorer manually" });
      }
      const data = await r.json() as any;
      res.json({ address, inscriptions: data?.data?.detail ?? [], total: data?.data?.total ?? 0 });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SPECTRAL CANONICAL ADDRESS — WavelengthScript registration & lookup ───────
  // ══════════════════════════════════════════════════════════════════════════════

  /** Generate deterministic WavelengthScript code block for a canonical address */
  function buildWavelengthScript(opts: {
    username: string; wdm: number; oam: number; pol: string;
    nm: number; band: string; uri: string; psi: string;
    registeredAt?: string;
  }): string {
    const C = 299_792_458;
    const H = 6.626e-34;
    const freqHz  = C / (opts.nm * 1e-9);
    const freqTHz = (freqHz / 1e12).toFixed(2);
    const energyJ = H * freqHz;
    const massKg  = energyJ / (C * C);
    const date    = opts.registeredAt
      ? new Date(opts.registeredAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    return [
      `// WavelengthScript v1.0 — Canonical Address Declaration`,
      `// User: ${opts.username} | Band: ${opts.band} | Date: ${date}`,
      `@${opts.nm.toFixed(1)}nm declare canonical {`,
      `  label    := "${opts.username}"`,
      `  psi      := ${opts.psi}`,
      `  uri      := "${opts.uri}"`,
      `  band     := ${opts.band}`,
      `  freq_THz := ${freqTHz}`,
      `  energy_J := ${energyJ.toExponential(3)}`,
      `  mass_kg  := ${massKg.toExponential(3)}`,
      `}`,
      `@emit(${opts.nm.toFixed(1)}nm, ${opts.psi}) fn resolveCanonical() {`,
      `  broadcast(psi.lookup.canonical("${opts.username}"))`,
      `}`,
    ].join("\n");
  }

  // ── GET my canonical address + WavelengthScript block ──────────────────────
  app.get("/api/spectral/my-canonical", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspRegistry } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const user = (req as any).user!;
      const enc  = ceSe(user.username);

      // Look up registration
      const [entry] = await db.select().from(wnspRegistry)
        .where(and(eq(wnspRegistry.resourceType, "user"), eq(wnspRegistry.resourceId, user.id)));

      const C = 299_792_458;
      const H = 6.626e-34;
      const freqHz  = C / (enc.nm * 1e-9);
      const freqTHz = freqHz / 1e12;
      const energyJ = H * freqHz;
      const massKg  = energyJ / (C * C);

      const wls = buildWavelengthScript({
        username:     user.username,
        wdm:          enc.wdm,
        oam:          enc.oam,
        pol:          enc.pol,
        nm:           enc.nm,
        band:         enc.band,
        uri:          enc.uri,
        psi:          enc.psi,
        registeredAt: entry?.createdAt?.toISOString(),
      });

      res.json({
        username:    user.username,
        spectral: {
          psi:          enc.psi,
          wdm:          enc.wdm,
          oam:          enc.oam,
          pol:          enc.pol,
          nm:           enc.nm,
          band:         enc.band,
          uri:          enc.uri,
          freqTHz,
          energyJ,
          massKg,
          resolveCount: entry?.resolveCount ?? 0,
        },
        registered:       !!entry,
        registeredAt:     entry?.createdAt ?? null,
        isCanonical:      entry?.isCanonical ?? false,
        registryId:       entry?.id ?? null,
        wavelengthScript: wls,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Register/refresh canonical address + attach WLS to spectralVector ───────
  app.post("/api/spectral/register-canonical", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspRegistry } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const user = (req as any).user!;
      const enc  = ceSe(user.username);

      const [existing] = await db.select().from(wnspRegistry)
        .where(and(eq(wnspRegistry.resourceType, "user"), eq(wnspRegistry.resourceId, user.id)));

      const wls = buildWavelengthScript({
        username:     user.username,
        wdm:          enc.wdm,
        oam:          enc.oam,
        pol:          enc.pol,
        nm:           enc.nm,
        band:         enc.band,
        uri:          enc.uri,
        psi:          enc.psi,
        registeredAt: existing?.createdAt?.toISOString() ?? new Date().toISOString(),
      });

      const C = 299_792_458;
      const H = 6.626e-34;
      const freqHz = C / (enc.nm * 1e-9);

      const spectralVector = {
        wlsCode:   wls,
        freqTHz:   freqHz / 1e12,
        energyJ:   H * freqHz,
        massKg:    (H * freqHz) / (C * C),
        registeredBy: user.username,
        protocol:  "WNSP-CE-SE v1.0",
        version:   "WavelengthScript v1.0",
      };

      if (existing) {
        // Refresh WLS stored in spectralVector
        const [updated] = await db.update(wnspRegistry)
          .set({ spectralVector, isCanonical: true, updatedAt: new Date() })
          .where(eq(wnspRegistry.id, existing.id))
          .returning();
        return res.json({ success: true, action: "refreshed", entry: updated, wavelengthScript: wls });
      }

      // Insert new canonical entry
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
        description:  `Canonical spectral identity for ${user.username} — WavelengthScript encoded`,
        registeredBy: user.id,
        isPublic:     true,
        isCanonical:  true,
        spectralVector,
      }).returning();

      res.status(201).json({ success: true, action: "created", entry, wavelengthScript: wls });
    } catch (err: any) {
      if (err.message?.includes("unique")) {
        const enc = ceSe((req as any).user!.username);
        return res.json({ success: true, action: "exists", note: "URI already registered at this channel", spectral: enc });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // ── Channel lookup — search wnsp_registry by Ψ, URI, or label ──────────────
  app.get("/api/spectral/channel-lookup", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { wnspRegistry } = await import("@shared/schema");
      const { eq, or, ilike, desc } = await import("drizzle-orm");

      const q = String(req.query.q ?? "").trim();
      if (!q) return res.status(400).json({ error: "q param required" });

      let results: any[] = [];

      // Try exact URI match first
      if (q.startsWith("wnsp://")) {
        results = await db.select().from(wnspRegistry).where(eq(wnspRegistry.wnspUri, q)).limit(5);
      }
      // Try Ψ channel match (e.g. "Ψ(84,23,H)" or "84,23,H")
      else if (q.startsWith("Ψ(") || q.match(/^\d+,\d+/)) {
        const psi = q.startsWith("Ψ(") ? q : `Ψ(${q})`;
        results = await db.select().from(wnspRegistry).where(eq(wnspRegistry.psiChannel, psi)).limit(5);
      }
      // Fallback: label / description ilike
      else {
        results = await db.select().from(wnspRegistry)
          .where(or(ilike(wnspRegistry.label, `%${q}%`), ilike(wnspRegistry.wnspUri, `%${q}%`)))
          .orderBy(desc(wnspRegistry.isCanonical), desc(wnspRegistry.resolveCount))
          .limit(10);
      }

      // Attach WLS to each result that has it stored; generate on-the-fly if not
      const enriched = results.map((r) => {
        const sv = r.spectralVector as any;
        const wls = sv?.wlsCode ?? buildWavelengthScript({
          username:  r.label,
          wdm:       r.wdm,
          oam:       r.oam,
          pol:       r.polarisation,
          nm:        parseFloat(r.wavelengthNm),
          band:      r.band,
          uri:       r.wnspUri,
          psi:       r.psiChannel,
          registeredAt: r.createdAt?.toISOString(),
        });
        return { ...r, wavelengthScript: wls };
      });

      res.json({ query: q, results: enriched, count: enriched.length });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ── NXT ↔ FRACTAL BITCOIN SWAP BRIDGE ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  //   Rate: 1 NXT = 20 wnsp  (0.05 NXT per wnsp — physics-governed)
  //   Direction A (nxt_to_fb): burn NXT → inscribe wnsp BRC-20 on Fractal BTC
  //   Direction B (fb_to_nxt): user submits Fractal TX hash → verify → credit NXT
  // ─────────────────────────────────────────────────────────────────────────────
  const SWAP_RATE_NXT_PER_WNSP = 0.05;   // 1 wnsp costs 0.05 NXT
  const SWAP_WNSP_PER_NXT      = 20;     // 1 NXT buys 20 wnsp
  const SWAP_MIN_NXT           = 5;      // minimum 5 NXT per swap
  const SWAP_MAX_NXT           = 10_000; // maximum 10,000 NXT per swap
  // Fractal Bitcoin bridge deposit address (service wallet, Taproot)
  const FRACTAL_BRIDGE_ADDRESS = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";

  app.get("/api/swap/rate", async (_req: Request, res: Response) => {
    res.json({
      nxtPerWnsp: SWAP_RATE_NXT_PER_WNSP,
      wnspPerNxt: SWAP_WNSP_PER_NXT,
      minNxt: SWAP_MIN_NXT,
      maxNxt: SWAP_MAX_NXT,
      bridgeAddress: FRACTAL_BRIDGE_ADDRESS,
      network: "fractal-bitcoin",
      note: "Physics-governed rate: 50 NXT = 1,000 wnsp (matching community mint price)",
    });
  });

  // ── Direction A: NXT → wnsp on Fractal Bitcoin ─────────────────────────────
  app.post("/api/swap/nxt-to-fb", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { nxtAmount, fractalAddress } = req.body;

      if (!fractalAddress || !String(fractalAddress).startsWith("bc1"))
        return res.status(400).json({ error: "Valid Fractal Bitcoin Taproot address (bc1…) required" });

      const nxt = parseFloat(String(nxtAmount));
      if (isNaN(nxt) || nxt < SWAP_MIN_NXT)
        return res.status(400).json({ error: `Minimum swap is ${SWAP_MIN_NXT} NXT` });
      if (nxt > SWAP_MAX_NXT)
        return res.status(400).json({ error: `Maximum swap is ${SWAP_MAX_NXT} NXT per transaction` });

      // Check balance
      const wallet = await storage.getWallet(user.id);
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });
      const bal = parseFloat(wallet.balance);
      if (bal < nxt)
        return res.status(402).json({ error: `Insufficient balance. Have ${bal.toFixed(2)} NXT, need ${nxt} NXT`, balance: wallet.balance });

      const wnspOut = Math.floor(nxt / SWAP_RATE_NXT_PER_WNSP); // NXT → wnsp

      // Redirect NXT to Orbital Treasury — NXT is NEVER destroyed
      const newBal = (bal - nxt).toFixed(8);
      await storage.updateWalletBalance(wallet.id, newBal);
      const { GENESIS_EXECUTION_ADDRESS } = await import("./physics");
      const treasuryWallet = await storage.getWalletByAddress(GENESIS_EXECUTION_ADDRESS);
      if (treasuryWallet) {
        const tBal = parseFloat(treasuryWallet.balance);
        await storage.updateWalletBalance(treasuryWallet.id, (tBal + nxt).toFixed(8));
        await storage.createTransaction({
          fromWalletId: wallet.id,
          toWalletId:   treasuryWallet.id,
          amount:       nxt.toFixed(8),
          fee:          "0.00000000",
          type:         "treasury_deposit",
          status:       "completed",
          metadata:     { reason: "nxt_to_fb_swap", fractalAddress, wnspOut, note: "NXT redirected to Orbital Treasury — not destroyed" },
        });
      }

      // Queue BRC-20 mint on Fractal Bitcoin (same inscription format)
      const content = JSON.stringify({ p: "brc-20", op: "mint", tick: "wnsp", amt: String(wnspOut) });
      const { btcBridge } = await import("./btc-bridge-service");
      const queued = await btcBridge.queueRawContent({
        eventType:  "BRC20_MINT",
        ref:        `swap-nxt-fb-${user.username}-${Date.now()}`,
        content,
        triggeredBy: user.username,
      });

      // Record swap
      const { db } = await import("./db");
      const { nxtFbSwaps } = await import("../shared/schema");
      const [row] = await db.insert(nxtFbSwaps).values({
        userId:         user.id,
        username:       user.username,
        direction:      "nxt_to_fb",
        nxtAmount:      nxt.toFixed(8),
        wnspAmount:     wnspOut,
        fractalAddress,
        queueId:        queued.id ? parseInt(String(queued.id)) : null,
        status:         "broadcasting",
        rateNxtPerWnsp: String(SWAP_RATE_NXT_PER_WNSP),
      }).returning();

      res.json({
        ok: true,
        swapId:     row.id,
        direction:  "nxt_to_fb",
        nxtToTreasury: nxt.toFixed(8),
        wnspOut,
        fractalAddress,
        queueId:    queued.id,
        newBalance: newBal,
        message:    `Swap queued! ${wnspOut} wnsp will be inscribed to ${fractalAddress.slice(0,14)}… on Fractal Bitcoin. ${nxt} NXT redirected to Orbital Treasury.`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Direction B: wnsp on Fractal Bitcoin → NXT ─────────────────────────────
  app.post("/api/swap/fb-to-nxt", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { fractalTxHash, wnspAmount, fractalAddress } = req.body;

      if (!fractalTxHash || fractalTxHash.length < 60)
        return res.status(400).json({ error: "Valid Fractal Bitcoin transaction hash required (64 hex chars)" });
      if (!fractalAddress)
        return res.status(400).json({ error: "Your Fractal Bitcoin sender address required for verification" });

      const wnsp = parseInt(String(wnspAmount));
      if (isNaN(wnsp) || wnsp < 1)
        return res.status(400).json({ error: "wnspAmount must be a positive integer" });

      const nxtOut = parseFloat((wnsp * SWAP_RATE_NXT_PER_WNSP).toFixed(8));

      // Check TX hasn't been used before
      const { db } = await import("./db");
      const { nxtFbSwaps } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const existing = await db.select().from(nxtFbSwaps).where(eq(nxtFbSwaps.fractalTxHash, fractalTxHash)).limit(1);
      if (existing.length > 0)
        return res.status(409).json({ error: "This Fractal Bitcoin transaction has already been redeemed" });

      // Try to verify against Fractal mempool
      let verified = false;
      let verifyNote = "Pending manual verification";
      try {
        const r = await fetch(`https://mempool.fractalbitcoin.io/api/tx/${fractalTxHash}`);
        if (r.ok) {
          const tx = await r.json() as any;
          // Check TX sends to bridge address
          const toUs = (tx.vout ?? []).some((o: any) =>
            o.scriptpubkey_address === FRACTAL_BRIDGE_ADDRESS
          );
          verified = toUs && tx.status?.confirmed;
          verifyNote = verified
            ? "Verified on Fractal Bitcoin mempool — confirmed"
            : "TX found but not yet confirmed or doesn't send to bridge address";
        }
      } catch { verifyNote = "Fractal mempool unreachable — manual review queued"; }

      // Record swap (allow optimistic pending even if unverified — admin can refund)
      const status = verified ? "confirmed" : "pending";
      const [row] = await db.insert(nxtFbSwaps).values({
        userId:         user.id,
        username:       user.username,
        direction:      "fb_to_nxt",
        nxtAmount:      nxtOut.toFixed(8),
        wnspAmount:     wnsp,
        fractalAddress,
        fractalTxHash,
        status,
        rateNxtPerWnsp: String(SWAP_RATE_NXT_PER_WNSP),
        completedAt:    verified ? new Date() : null,
      }).returning();

      // Credit NXT immediately if verified
      if (verified) {
        const wallet = await storage.getWallet(user.id);
        if (wallet) {
          const newBal = (parseFloat(wallet.balance) + nxtOut).toFixed(8);
          await storage.updateWalletBalance(wallet.id, newBal);
          return res.json({
            ok: true, swapId: row.id, direction: "fb_to_nxt",
            wnspIn: wnsp, nxtCredited: nxtOut.toFixed(8),
            verified: true, verifyNote, status: "confirmed",
            message: `${nxtOut} NXT credited to your wallet! Fractal TX verified on-chain.`,
          });
        }
      }

      res.json({
        ok: true, swapId: row.id, direction: "fb_to_nxt",
        wnspIn: wnsp, nxtPending: nxtOut.toFixed(8),
        verified: false, verifyNote, status,
        message: `Swap submitted (ID #${row.id}). ${verifyNote}. NXT credited once confirmed.`,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Swap history ────────────────────────────────────────────────────────────
  app.get("/api/swap/history", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { db } = await import("./db");
      const { nxtFbSwaps } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      // Enrich nxt_to_fb swaps with queue status
      const { btcInscriptionQueue } = await import("../shared/schema");
      const swaps = await db.select().from(nxtFbSwaps)
        .where(eq(nxtFbSwaps.userId, user.id))
        .orderBy(desc(nxtFbSwaps.createdAt)).limit(30);

      const enriched = await Promise.all(swaps.map(async (s) => {
        if (s.direction !== "nxt_to_fb" || !s.queueId) return s;
        const [q] = await db.select().from(btcInscriptionQueue).where(eq(btcInscriptionQueue.id, s.queueId));
        return { ...s, queueStatus: q?.status, inscriptionId: q?.inscriptionId ?? s.inscriptionId };
      }));

      res.json(enriched);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Lightning Network — Alby + LNbits unified adapter ──────────────────────
  const LN_SATS_PER_NXT = 1000; // 1 NXT = 1000 sats

  function detectLnProvider(): "coinos" | "alby" | "lnbits" | null {
    if (process.env.COINOS_TOKEN) return "coinos";
    if (process.env.ALBY_ACCESS_TOKEN) return "alby";
    if (process.env.LNBITS_URL && process.env.LNBITS_ADMIN_KEY && process.env.LNBITS_INVOICE_KEY) return "lnbits";
    return null;
  }

  // ── Coinos helpers ──────────────────────────────────────────────────────────

  // Authenticated Coinos API helper — works with JWT token or nsec-based token
  async function coinosReq(path: string, method = "GET", body?: object): Promise<any> {
    const token = process.env.COINOS_TOKEN ?? "";
    const opts: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    };
    if (body && method !== "GET") opts.body = JSON.stringify(body);
    const r = await fetch(`https://coinos.io/api${path}`, opts);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message ?? d.error ?? `Coinos API error ${r.status}: ${path}`);
    return d;
  }

  // Derives Lightning Address from an nsec Nostr private key (Coinos Nostr accounts
  // use their hex pubkey as the username: {pubkey}@coinos.io)
  function coinosNsecToAddress(nsec: string): string {
    const { words } = _bech32.decode(nsec, 100);
    const privKey = Buffer.from(_bech32.fromWords(words));
    const pubKey = Buffer.from(tinySecp.xOnlyPointFromScalar(privKey)!).toString("hex");
    return `${pubKey}@coinos.io`;
  }

  async function coinosGetLightningAddress(): Promise<string> {
    const token = process.env.COINOS_TOKEN ?? "";
    if (token.startsWith("nsec1")) return coinosNsecToAddress(token);
    // JWT path — get username from /me
    const r = await fetch("https://coinos.io/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error("Coinos /me failed — check COINOS_TOKEN");
    const d = await r.json();
    return d.username ? `${d.username}@coinos.io` : "";
  }

  // Create a Lightning invoice via Coinos LNURL-pay (works with nsec — no JWT required).
  // Returns { payment_hash, payment_request } where payment_hash is the LUD-21 verify URL
  // prefixed with "lnurlv:" for later payment checking.
  async function coinosLnurlInvoice(amountSats: number, memo: string): Promise<{ payment_hash: string; payment_request: string }> {
    const lightningAddr = await coinosGetLightningAddress();
    const [name, domain] = lightningAddr.split("@");
    const meta = await fetch(`https://${domain}/.well-known/lnurlp/${name}`).then(r => r.json());
    if (meta.status === "ERROR") throw new Error(meta.reason || "Coinos LNURL-pay metadata failed");

    const amountMsats = amountSats * 1000;
    if (amountMsats < (meta.minSendable ?? 1)) throw new Error(`Minimum is ${Math.ceil((meta.minSendable ?? 1) / 1000)} sats`);
    if (meta.maxSendable && amountMsats > meta.maxSendable) throw new Error(`Maximum is ${Math.floor(meta.maxSendable / 1000)} sats`);

    const cbUrl = new URL(meta.callback);
    cbUrl.searchParams.set("amount", String(amountMsats));
    if (memo && meta.commentAllowed && memo.length <= meta.commentAllowed) cbUrl.searchParams.set("comment", memo);

    const inv = await fetch(cbUrl.toString()).then(r => r.json());
    if (inv.status === "ERROR") throw new Error(inv.reason || "Coinos invoice callback failed");

    // Store the LUD-21 verify URL as payment_hash — used by lnCheckInvoice
    const payment_hash = inv.verify ? `lnurlv:${inv.verify}` : inv.pr;
    return { payment_hash, payment_request: inv.pr };
  }

  // Fetch the Alby account's Lightning Address (e.g. "nexusosdaily@getalby.com")
  async function albyGetLightningAddress(): Promise<string> {
    const r = await fetch("https://api.getalby.com/user/me", {
      headers: { Authorization: `Bearer ${process.env.ALBY_ACCESS_TOKEN}` },
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Alby: could not fetch account info");
    if (!d.lightning_address) throw new Error("Alby account has no Lightning Address — set one at getalby.com/settings");
    return d.lightning_address as string;
  }

  // Generate invoice via LNURL-pay (works without Alby Hub / funding source)
  async function lnurlPayCreateInvoice(lightningAddress: string, amountSats: number, memo: string): Promise<{ payment_hash: string; payment_request: string }> {
    const [name, domain] = lightningAddress.split("@");
    if (!name || !domain) throw new Error(`Invalid Lightning Address: ${lightningAddress}`);

    // Step 1 — fetch LNURL-pay metadata from the Lightning Address
    const metaR = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
    const meta  = await metaR.json();
    if (!metaR.ok || meta.status === "ERROR") throw new Error(meta.reason || "LNURL-pay metadata fetch failed");

    const amountMsats = amountSats * 1000;
    if (amountMsats < (meta.minSendable ?? 1) || amountMsats > (meta.maxSendable ?? Infinity)) {
      throw new Error(`Amount out of range — min ${Math.ceil((meta.minSendable ?? 1) / 1000)} sats, max ${Math.floor((meta.maxSendable ?? 0) / 1000)} sats`);
    }

    // Step 2 — request the bolt11 invoice
    const cbUrl = new URL(meta.callback);
    cbUrl.searchParams.set("amount", String(amountMsats));
    if (memo && meta.commentAllowed && memo.length <= (meta.commentAllowed as number)) {
      cbUrl.searchParams.set("comment", memo);
    }
    const invR = await fetch(cbUrl.toString());
    const inv  = await invR.json();
    if (!invR.ok || inv.status === "ERROR") throw new Error(inv.reason || "LNURL-pay invoice request failed");
    const payment_request: string = inv.pr;


    // Step 3 — get payment_hash using the available provider (payment_hash is metadata only)
    let payment_hash = payment_request; // safe fallback: store bolt11 itself
    const provider = detectLnProvider();
    try {
      if (provider === "coinos") {
        const dec = await coinosReq(`/decode?invoice=${encodeURIComponent(payment_request)}`);
        if (dec.id || dec.payment_hash) payment_hash = dec.id ?? dec.payment_hash;
      } else if (provider === "alby" && process.env.ALBY_ACCESS_TOKEN) {
        const decR = await fetch("https://api.getalby.com/decode/bolt11", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.ALBY_ACCESS_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ invoice: payment_request }),
        });
        const dec = await decR.json();
        if (decR.ok && dec.payment_hash) payment_hash = dec.payment_hash;
      }
    } catch { /* keep fallback */ }
    return { payment_hash, payment_request };
  }

  // Batch LNURL-pay: splits totalSats into ≤ maxSendable chunks and fetches one invoice per chunk.
  // Returns an array of { amountSats, payment_request, payment_hash }.
  // If totalSats fits in a single invoice the array will have length 1.
  async function lnurlPayBatchInvoices(
    lightningAddress: string, totalSats: number, memo: string
  ): Promise<Array<{ amountSats: number; payment_request: string; payment_hash: string }>> {
    const [name, domain] = lightningAddress.split("@");
    if (!name || !domain) throw new Error(`Invalid Lightning Address: ${lightningAddress}`);
    const metaR = await fetch(`https://${domain}/.well-known/lnurlp/${name}`);
    const meta  = await metaR.json();
    if (!metaR.ok || meta.status === "ERROR") throw new Error(meta.reason || "LNURL-pay metadata fetch failed");

    const maxPerSats = Math.floor((meta.maxSendable ?? Infinity) / 1000);
    const minPerSats = Math.ceil((meta.minSendable ?? 1) / 1000);
    if (totalSats < minPerSats) throw new Error(`Minimum is ${minPerSats} sats`);

    // Build chunk list
    const chunks: number[] = [];
    let rem = totalSats;
    while (rem > 0) { const c = Math.min(rem, maxPerSats); chunks.push(c); rem -= c; }

    // Fetch all invoices in parallel
    return await Promise.all(chunks.map(async (chunkSats) => {
      const amountMsats = chunkSats * 1000;
      const cbUrl = new URL(meta.callback);
      cbUrl.searchParams.set("amount", String(amountMsats));
      if (memo && meta.commentAllowed && memo.length <= (meta.commentAllowed as number))
        cbUrl.searchParams.set("comment", memo);
      const inv = await fetch(cbUrl.toString()).then(r => r.json());
      if (inv.status === "ERROR") throw new Error(inv.reason || "Invoice callback failed");
      const ph = inv.verify ? `lnurlv:${inv.verify}` : inv.pr;
      return { amountSats: chunkSats, payment_request: inv.pr, payment_hash: ph };
    }));
  }

  async function lnCreateInvoice(amountSats: number, memo: string): Promise<{ payment_hash: string; payment_request: string }> {
    const provider = detectLnProvider();
    if (provider === "coinos") {
      return await coinosLnurlInvoice(amountSats, memo);
    }
    if (provider === "alby") {
      // Use LNURL-pay via the account's Lightning Address — works without Alby Hub
      const lightningAddress = await albyGetLightningAddress();
      return await lnurlPayCreateInvoice(lightningAddress, amountSats, memo);
    }
    if (provider === "lnbits") {
      const base = (process.env.LNBITS_URL ?? "").replace(/\/$/, "");
      const r = await fetch(`${base}/api/v1/payments`, {
        method: "POST",
        headers: { "X-Api-Key": process.env.LNBITS_INVOICE_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ out: false, amount: amountSats, memo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || d.message || `LNbits error ${r.status}`);
      return { payment_hash: d.payment_hash, payment_request: d.payment_request };
    }
    throw new Error("No Lightning provider configured. Add ALBY_ACCESS_TOKEN (free) or LNBITS_URL + LNBITS_ADMIN_KEY + LNBITS_INVOICE_KEY to Secrets.");
  }

  async function lnCheckInvoice(hash: string): Promise<boolean> {
    const provider = detectLnProvider();
    if (provider === "coinos") {
      try {
        // hash may be a LUD-21 verify URL (prefixed "lnurlv:") or a raw bolt11
        const verifyUrl = hash.startsWith("lnurlv:") ? hash.slice(7) : null;
        if (verifyUrl) {
          const d = await fetch(verifyUrl).then(r => r.json());
          return d.settled === true;
        }
        // Fallback: try Coinos public invoice endpoint (no auth needed)
        const d = await fetch(`https://coinos.io/api/invoice/${hash}`).then(r => r.json());
        return (d.received ?? 0) > 0;
      } catch { return false; }
    }
    if (provider === "alby") {
      const r = await fetch(`https://api.getalby.com/invoices/${hash}`, {
        headers: { Authorization: `Bearer ${process.env.ALBY_ACCESS_TOKEN}` },
      });
      const d = await r.json();
      return d.settled === true;
    }
    if (provider === "lnbits") {
      const base = (process.env.LNBITS_URL ?? "").replace(/\/$/, "");
      const r = await fetch(`${base}/api/v1/payments/${hash}`, {
        headers: { "X-Api-Key": process.env.LNBITS_INVOICE_KEY! },
      });
      const d = await r.json();
      return d.paid === true;
    }
    throw new Error("No Lightning provider configured.");
  }

  async function lnPayInvoice(bolt11: string): Promise<string> {
    const provider = detectLnProvider();
    if (provider === "coinos") {
      // coinosReq throws on non-2xx; let it bubble so callers can handle gracefully
      const d = await coinosReq("/payments", "POST", { address: bolt11, type: "lightning" });
      return d.hash ?? d.id ?? "";
    }
    if (provider === "alby") {
      const r = await fetch("https://api.getalby.com/payments/bolt11", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.ALBY_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: bolt11 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || `Alby pay error ${r.status}`);
      return d.payment_hash ?? "";
    }
    if (provider === "lnbits") {
      const base = (process.env.LNBITS_URL ?? "").replace(/\/$/, "");
      const r = await fetch(`${base}/api/v1/payments`, {
        method: "POST",
        headers: { "X-Api-Key": process.env.LNBITS_ADMIN_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ out: true, bolt11 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || d.message || `LNbits pay error ${r.status}`);
      return d.payment_hash ?? "";
    }
    throw new Error("No Lightning provider configured.");
  }

  async function lnDecodeInvoice(bolt11: string): Promise<number> {
    const provider = detectLnProvider();
    if (provider === "coinos") {
      const d = await coinosReq(`/decode?invoice=${encodeURIComponent(bolt11)}`);
      return Math.ceil((d.amount ?? d.amount_msat ?? 0) / (d.amount_msat ? 1000 : 1));
    }
    if (provider === "alby") {
      const r = await fetch("https://api.getalby.com/decode/bolt11", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.ALBY_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: bolt11 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Alby decode error");
      return d.amount_in_sat ?? 0;
    }
    if (provider === "lnbits") {
      const base = (process.env.LNBITS_URL ?? "").replace(/\/$/, "");
      const r = await fetch(`${base}/api/v1/payments/decode`, {
        method: "POST",
        headers: { "X-Api-Key": process.env.LNBITS_INVOICE_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ data: bolt11 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "LNbits decode error");
      return Math.ceil((d.amount_msat ?? 0) / 1000);
    }
    throw new Error("No Lightning provider configured.");
  }

  async function lnGetBalance(): Promise<{ sats: number; name: string }> {
    const provider = detectLnProvider();
    if (provider === "coinos") {
      const token = process.env.COINOS_TOKEN ?? "";
      if (token.startsWith("nsec1")) {
        // nsec-based: balance not available without JWT, return address info only
        const addr = coinosNsecToAddress(token);
        return { sats: 0, name: addr };
      }
      const r = await fetch("https://coinos.io/api/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return { sats: 0, name: "coinos" };
      const d = await r.json();
      return { sats: Math.floor(d.balance ?? 0), name: d.username ? `coinos/${d.username}` : "Coinos wallet" };
    }
    if (provider === "alby") {
      const r = await fetch("https://api.getalby.com/balance", {
        headers: { Authorization: `Bearer ${process.env.ALBY_ACCESS_TOKEN}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Alby balance error");
      return { sats: d.balance ?? 0, name: "Alby wallet" };
    }
    if (provider === "lnbits") {
      const base = (process.env.LNBITS_URL ?? "").replace(/\/$/, "");
      const r = await fetch(`${base}/api/v1/wallet`, {
        headers: { "X-Api-Key": process.env.LNBITS_INVOICE_KEY! },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "LNbits balance error");
      return { sats: Math.floor((d.balance ?? 0) / 1000), name: d.name ?? "LNbits wallet" };
    }
    throw new Error("No Lightning provider configured.");
  }

  async function ensureLnWallet(userId: string) {
    const { db } = await import("./db");
    const { lightningWallets } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    const [existing] = await db.select().from(lightningWallets).where(eq(lightningWallets.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(lightningWallets).values({ userId }).returning();
    return created;
  }

  // Ensure DB tables exist
  (async () => {
    try {
      const { db } = await import("./db");
      const { sql: drizzleSql } = await import("drizzle-orm");
      await db.execute(drizzleSql`
        CREATE TABLE IF NOT EXISTS lightning_wallets (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          sats_balance INTEGER NOT NULL DEFAULT 0,
          total_deposited INTEGER NOT NULL DEFAULT 0,
          total_withdrawn INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS lightning_transactions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL REFERENCES users(id),
          type TEXT NOT NULL,
          amount_sats INTEGER NOT NULL,
          nxt_amount DECIMAL(20,8),
          payment_hash TEXT,
          payment_request TEXT,
          memo TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          lnbits_payment_id TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS lightning_payment_queue (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL REFERENCES users(id),
          tx_id INTEGER NOT NULL REFERENCES lightning_transactions(id) ON DELETE CASCADE,
          invoice TEXT NOT NULL,
          amount_sats BIGINT NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          paid_at TIMESTAMP
        );
      `);
    } catch (e: any) { console.error("[Lightning] Table init error:", e.message); }
  })();

  // ── Lightning Payment Queue ────────────────────────────────────────────────
  // Inserts all batch invoices into the queue and fires processing in background.
  async function queueBatchPayments(
    userId: string,
    txId: number,
    batchInvoices: Array<{ amountSats: number; payment_request: string }>
  ): Promise<void> {
    const { db } = await import("./db");
    const { sql: s } = await import("drizzle-orm");
    for (const inv of batchInvoices) {
      await db.execute(s`
        INSERT INTO lightning_payment_queue (user_id, tx_id, invoice, amount_sats, status, attempts)
        VALUES (${userId}, ${txId}, ${inv.payment_request}, ${inv.amountSats}, 'queued', 0)
      `);
    }
    // Fire-and-forget — process immediately in background
    processBatchQueue(txId).catch(() => { /* silenced — background */ });
  }

  // Attempts to pay all queued invoices for a given tx (or all queued across all txs if txId is null).
  async function processBatchQueue(txId?: number): Promise<void> {
    const { db } = await import("./db");
    const { sql: s } = await import("drizzle-orm");
    const MAX_ATTEMPTS = 5;
    try {
      // Fetch queued / retryable items
      const rows = (await db.execute(
        txId !== undefined
          ? s`SELECT * FROM lightning_payment_queue WHERE tx_id = ${txId} AND status IN ('queued','failed') AND attempts < ${MAX_ATTEMPTS} ORDER BY id`
          : s`SELECT * FROM lightning_payment_queue WHERE status IN ('queued','failed') AND attempts < ${MAX_ATTEMPTS} ORDER BY id`
      )).rows as any[];

      for (const row of rows) {
        // Mark processing
        await db.execute(s`UPDATE lightning_payment_queue SET status='processing' WHERE id=${row.id}`);
        try {
          await lnPayInvoice(row.invoice as string);
          await db.execute(s`
            UPDATE lightning_payment_queue SET status='paid', paid_at=NOW() WHERE id=${row.id}
          `);
          console.log(`[LN Queue] Paid invoice #${row.id} — ${row.amount_sats} sats for tx ${row.tx_id}`);
        } catch (err: any) {
          const attempts = (row.attempts as number) + 1;
          const newStatus = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
          await db.execute(s`
            UPDATE lightning_payment_queue
            SET status=${newStatus}, attempts=${attempts}, last_error=${err.message}
            WHERE id=${row.id}
          `);
        }

        // Check if parent tx is now fully paid
        const remaining = (await db.execute(s`
          SELECT COUNT(*) AS cnt FROM lightning_payment_queue
          WHERE tx_id=${row.tx_id} AND status NOT IN ('paid')
        `)).rows[0] as any;
        if (Number(remaining.cnt) === 0) {
          await db.execute(s`
            UPDATE lightning_transactions SET status='completed', completed_at=NOW()
            WHERE id=${row.tx_id}
          `);
          console.log(`[LN Queue] Tx #${row.tx_id} fully paid — all invoices settled`);
        }
      }
    } catch (err: any) {
      console.error("[LN Queue] processBatchQueue error:", err.message);
    }
  }

  // GET /api/lightning/queue/:txId — queue progress for a transaction
  app.get("/api/lightning/queue/:txId", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: s } = await import("drizzle-orm");
      const txId = parseInt(req.params.txId);
      if (isNaN(txId)) return res.status(400).json({ error: "Invalid txId" });
      const rows = (await db.execute(s`
        SELECT id, invoice, amount_sats, status, attempts, last_error, paid_at, created_at
        FROM lightning_payment_queue WHERE tx_id=${txId} AND user_id=${req.user!.id}
        ORDER BY id
      `)).rows as any[];
      const paid  = rows.filter(r => r.status === "paid").length;
      const total = rows.length;
      const paidSats = rows.filter(r => r.status === "paid").reduce((a,r) => a + Number(r.amount_sats), 0);
      const totalSats = rows.reduce((a,r) => a + Number(r.amount_sats), 0);
      res.json({ ok: true, txId, paid, total, paidSats, totalSats, items: rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/lightning/queue/retry/:txId — manually trigger re-processing
  app.post("/api/lightning/queue/retry/:txId", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: s } = await import("drizzle-orm");
      const txId = parseInt(req.params.txId);
      if (isNaN(txId)) return res.status(400).json({ error: "Invalid txId" });
      // Verify ownership
      const txRows = (await db.execute(s`SELECT id FROM lightning_transactions WHERE id=${txId} AND user_id=${req.user!.id}`)).rows;
      if (!txRows.length) return res.status(404).json({ error: "Transaction not found" });
      // Reset failed items back to queued so they can be retried
      await db.execute(s`
        UPDATE lightning_payment_queue SET status='queued', attempts=0
        WHERE tx_id=${txId} AND status='failed'
      `);
      // Kick off processing (fire-and-forget)
      processBatchQueue(txId).catch(() => {});
      res.json({ ok: true, message: "Queue processing started" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/lightning/status — check provider & reachability
  app.get("/api/lightning/status", authenticate, async (_req: Request, res: Response) => {
    const provider = detectLnProvider();
    if (!provider) return res.json({ configured: false, message: "No Lightning provider set" });
    try {
      const bal = await lnGetBalance();
      let lightningAddress: string | undefined;
      if (provider === "alby") {
        try { lightningAddress = await albyGetLightningAddress(); } catch {}
      } else if (provider === "coinos") {
        try { lightningAddress = await coinosGetLightningAddress(); } catch {}
      }
      res.json({ configured: true, provider, balance: bal.sats, name: bal.name, lightningAddress });
    } catch (err: any) {
      res.json({ configured: true, provider, reachable: false, error: err.message });
    }
  });

  // GET /api/lightning/balance — user's NexusOS sats balance
  app.get("/api/lightning/balance", authenticate, async (req: Request, res: Response) => {
    try {
      const lnWallet = await ensureLnWallet(req.user!.id);
      res.json({
        satsBalance: lnWallet.satsBalance,
        totalDeposited: lnWallet.totalDeposited,
        totalWithdrawn: lnWallet.totalWithdrawn,
        satsPerNxt: LN_SATS_PER_NXT,
        nxtEquivalent: (lnWallet.satsBalance / LN_SATS_PER_NXT).toFixed(8),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/invoice — create a deposit invoice
  app.post("/api/lightning/invoice", authenticate, async (req: Request, res: Response) => {
    try {
      const { amountSats, memo } = req.body;
      if (!amountSats || amountSats < 1) return res.status(400).json({ error: "amountSats must be >= 1" });
      if (amountSats > 10_000_000_000) return res.status(400).json({ error: "Max deposit: 10,000,000,000 sats" });

      const invoice = await lnCreateInvoice(amountSats, memo || `NexusOS deposit — ${req.user!.username}`);

      const { db } = await import("./db");
      const { lightningTransactions } = await import("../shared/schema");
      const [tx] = await db.insert(lightningTransactions).values({
        userId: req.user!.id,
        type: "deposit",
        amountSats,
        paymentHash: invoice.payment_hash,
        paymentRequest: invoice.payment_request,
        memo: memo || "",
        status: "pending",
        lnbitsPaymentId: invoice.payment_hash,
      }).returning();

      res.json({
        txId: tx.id,
        paymentHash: invoice.payment_hash,
        paymentRequest: invoice.payment_request,
        amountSats,
        expiresIn: 3600,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/lightning/invoice/check?txId=N — poll invoice payment status by DB row id
  app.get("/api/lightning/invoice/check", authenticate, async (req: Request, res: Response) => {
    try {
      const txId = parseInt(req.query.txId as string);
      if (!txId) return res.status(400).json({ error: "txId required" });
      const { db } = await import("./db");
      const { lightningTransactions, lightningWallets } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [tx] = await db.select().from(lightningTransactions)
        .where(and(eq(lightningTransactions.id, txId), eq(lightningTransactions.userId, req.user!.id)));
      if (!tx) return res.status(404).json({ error: "Invoice not found" });

      if (tx.status === "completed") return res.json({ paid: true, amountSats: tx.amountSats });

      const paid = await lnCheckInvoice(tx.paymentHash);
      if (paid) {
        const lnWallet = await ensureLnWallet(req.user!.id);
        await db.update(lightningWallets)
          .set({ satsBalance: lnWallet.satsBalance + tx.amountSats, totalDeposited: lnWallet.totalDeposited + tx.amountSats, updatedAt: new Date() })
          .where(eq(lightningWallets.userId, req.user!.id));
        await db.update(lightningTransactions)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(lightningTransactions.id, tx.id));
        await logAction(req, "lightning_deposit", "lightning", req.user!.id, { amountSats: tx.amountSats });
        return res.json({ paid: true, amountSats: tx.amountSats });
      }
      return res.json({ paid: false });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/lightning/invoice/:hash — legacy hash-based poll (kept for backwards compat)
  app.get("/api/lightning/invoice/:hash", authenticate, async (req: Request, res: Response) => {
    try {
      const { hash } = req.params;
      const { db } = await import("./db");
      const { lightningTransactions, lightningWallets } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [tx] = await db.select().from(lightningTransactions)
        .where(and(eq(lightningTransactions.paymentHash, hash), eq(lightningTransactions.userId, req.user!.id)));
      if (!tx) return res.status(404).json({ error: "Invoice not found" });

      if (tx.status === "completed") return res.json({ paid: true, tx });

      const paid = await lnCheckInvoice(hash);
      if (paid) {
        // Credit sats to user
        const lnWallet = await ensureLnWallet(req.user!.id);
        await db.update(lightningWallets)
          .set({
            satsBalance: lnWallet.satsBalance + tx.amountSats,
            totalDeposited: lnWallet.totalDeposited + tx.amountSats,
            updatedAt: new Date(),
          })
          .where(eq(lightningWallets.userId, req.user!.id));
        await db.update(lightningTransactions)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(lightningTransactions.id, tx.id));
        await logAction(req, "lightning_deposit", "lightning", req.user!.id, { amountSats: tx.amountSats });
        return res.json({ paid: true, amountSats: tx.amountSats });
      }
      res.json({ paid: false, tx });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/pay — pay a Lightning invoice (withdraw sats)
  app.post("/api/lightning/pay", authenticate, async (req: Request, res: Response) => {
    try {
      const { bolt11 } = req.body;
      if (!bolt11) return res.status(400).json({ error: "bolt11 invoice required" });

      const amountSats = await lnDecodeInvoice(bolt11);
      if (amountSats < 1) return res.status(400).json({ error: "Cannot decode invoice amount" });

      const lnWallet = await ensureLnWallet(req.user!.id);
      if (lnWallet.satsBalance < amountSats) {
        return res.status(400).json({ error: `Insufficient sats. Have ${lnWallet.satsBalance}, need ${amountSats}` });
      }

      const { db } = await import("./db");
      const { lightningTransactions, lightningWallets } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // Deduct first, then pay
      await db.update(lightningWallets)
        .set({
          satsBalance: lnWallet.satsBalance - amountSats,
          totalWithdrawn: lnWallet.totalWithdrawn + amountSats,
          updatedAt: new Date(),
        })
        .where(eq(lightningWallets.userId, req.user!.id));

      const [tx] = await db.insert(lightningTransactions).values({
        userId: req.user!.id,
        type: "withdrawal",
        amountSats,
        paymentRequest: bolt11,
        memo: "",
        status: "pending",
      }).returning();

      try {
        const payHash = await lnPayInvoice(bolt11);
        await db.update(lightningTransactions)
          .set({ status: "completed", paymentHash: payHash, lnbitsPaymentId: payHash, completedAt: new Date() })
          .where(eq(lightningTransactions.id, tx.id));
        await logAction(req, "lightning_withdrawal", "lightning", req.user!.id, { amountSats });
        res.json({ ok: true, paymentHash: payHash, amountSats });
      } catch (payErr: any) {
        // Refund on failure
        const fresh = await ensureLnWallet(req.user!.id);
        await db.update(lightningWallets)
          .set({ satsBalance: fresh.satsBalance + amountSats, totalWithdrawn: fresh.totalWithdrawn - amountSats, updatedAt: new Date() })
          .where(eq(lightningWallets.userId, req.user!.id));
        await db.update(lightningTransactions)
          .set({ status: "failed" })
          .where(eq(lightningTransactions.id, tx.id));
        res.status(500).json({ error: payErr.message });
      }
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/lightning/transactions — history
  app.get("/api/lightning/transactions", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { lightningTransactions } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const txs = await db.select().from(lightningTransactions)
        .where(eq(lightningTransactions.userId, req.user!.id))
        .orderBy(desc(lightningTransactions.createdAt))
        .limit(50);
      res.json({ transactions: txs });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/swap/to-nxt — sats → NXT
  app.post("/api/lightning/swap/to-nxt", authenticate, async (req: Request, res: Response) => {
    try {
      const { amountSats } = req.body;
      if (!amountSats || amountSats < 100) return res.status(400).json({ error: "Minimum swap: 100 sats" });
      const lnWallet = await ensureLnWallet(req.user!.id);
      if (lnWallet.satsBalance < amountSats) return res.status(400).json({ error: `Insufficient sats (have ${lnWallet.satsBalance})` });

      const nxtAmount = amountSats / LN_SATS_PER_NXT;
      const { db } = await import("./db");
      const { lightningWallets, lightningTransactions, wallets } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // Deduct sats
      await db.update(lightningWallets)
        .set({ satsBalance: lnWallet.satsBalance - amountSats, updatedAt: new Date() })
        .where(eq(lightningWallets.userId, req.user!.id));

      // Credit NXT
      const nxtRaw = nxtAmount;
      const [userWallet] = await db.select().from(wallets).where(eq(wallets.userId, req.user!.id));
      if (userWallet) {
        const newBal = (parseFloat(userWallet.balance) + nxtRaw).toFixed(8);
        await db.update(wallets).set({ balance: newBal }).where(eq(wallets.userId, req.user!.id));
      }

      await db.insert(lightningTransactions).values({
        userId: req.user!.id,
        type: "swap_to_nxt",
        amountSats,
        nxtAmount: nxtAmount.toFixed(8),
        memo: `Swap ${amountSats} sats → ${nxtAmount.toFixed(8)} NXT`,
        status: "completed",
        completedAt: new Date(),
      });

      await logAction(req, "lightning_swap_to_nxt", "lightning", req.user!.id, { amountSats, nxtAmount });
      res.json({ ok: true, amountSats, nxtAmount: nxtAmount.toFixed(8), rate: LN_SATS_PER_NXT });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/swap/to-sats — NXT → sats (atomic transaction)
  app.post("/api/lightning/swap/to-sats", authenticate, async (req: Request, res: Response) => {
    try {
      const { nxtAmount } = req.body;
      if (!nxtAmount || nxtAmount < 0.001) return res.status(400).json({ error: "Minimum swap: 0.001 NXT" });
      const amountSats = Math.floor(nxtAmount * LN_SATS_PER_NXT);

      const { db } = await import("./db");
      const { lightningWallets, lightningTransactions, wallets } = await import("../shared/schema");
      const { eq, sql: drizzleSql } = await import("drizzle-orm");

      // Pre-flight checks outside transaction
      const [userWallet] = await db.select().from(wallets).where(eq(wallets.userId, req.user!.id));
      if (!userWallet) return res.status(400).json({ error: "NXT wallet not found" });
      const currentBal = parseFloat(userWallet.balance);
      if (currentBal < nxtAmount) return res.status(400).json({ error: "Insufficient NXT balance" });

      const lnWallet = await ensureLnWallet(req.user!.id);

      // ── Atomic: deduct NXT and credit sats together ──
      await db.transaction(async (tx) => {
        const newBal = (currentBal - nxtAmount).toFixed(8);
        await tx.update(wallets)
          .set({ balance: newBal })
          .where(eq(wallets.userId, req.user!.id));

        await tx.update(lightningWallets)
          .set({
            satsBalance: drizzleSql`${lightningWallets.satsBalance} + ${amountSats}`,
            totalDeposited: drizzleSql`${lightningWallets.totalDeposited} + ${amountSats}`,
            updatedAt: new Date(),
          })
          .where(eq(lightningWallets.userId, req.user!.id));

        await tx.insert(lightningTransactions).values({
          userId:      req.user!.id,
          type:        "swap_to_sats",
          amountSats,
          nxtAmount:   nxtAmount.toFixed(8),
          memo:        `Swap ${nxtAmount.toFixed(8)} NXT → ${amountSats.toLocaleString()} sats`,
          status:      "completed",
          completedAt: new Date(),
        });
      });

      await logAction(req, "lightning_swap_to_sats", "lightning", req.user!.id, { amountSats, nxtAmount });
      res.json({ ok: true, amountSats, nxtAmount: nxtAmount.toFixed(8), rate: LN_SATS_PER_NXT });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/withdraw-to-btc — deduct sats, queue BTC on-chain withdrawal
  // Also accepts Lightning Addresses (user@domain) — routes them through Lightning pay
  app.post("/api/lightning/withdraw-to-btc", authenticate, async (req: Request, res: Response) => {
    try {
      const { amountSats, btcAddress, feeTier = "medium" } = req.body;
      if (!amountSats || typeof amountSats !== "number" || amountSats < 1)
        return res.status(400).json({ error: "Minimum withdrawal: 1 sat" });
      if (!btcAddress || typeof btcAddress !== "string")
        return res.status(400).json({ error: "btcAddress required" });
      const addr = btcAddress.trim();

      // ── Lightning Address path — delegate to LN pay flow ───────────────────
      if (addr.includes("@")) {
        if (!/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(addr))
          return res.status(400).json({ error: "Invalid Lightning Address (e.g. you@walletofsatoshi.com)" });

        const lnWalletLn = await ensureLnWallet(req.user!.id);
        if (lnWalletLn.satsBalance < amountSats)
          return res.status(400).json({ error: `Insufficient sats — have ${lnWalletLn.satsBalance.toLocaleString()}, need ${amountSats.toLocaleString()}` });

        let batchInvoices: Array<{ amountSats: number; payment_request: string; payment_hash: string }>;
        try {
          batchInvoices = await lnurlPayBatchInvoices(addr, amountSats, "NexusOS withdrawal");
        } catch (e: any) {
          return res.status(400).json({ error: `Cannot resolve Lightning Address: ${e.message}` });
        }

        const { db: dbLn } = await import("./db");
        const { lightningWallets: lwLn, lightningTransactions: ltLn } = await import("../shared/schema");
        const { eq: eqLn } = await import("drizzle-orm");

        await dbLn.update(lwLn)
          .set({ satsBalance: lnWalletLn.satsBalance - amountSats, totalWithdrawn: lnWalletLn.totalWithdrawn + amountSats, updatedAt: new Date() })
          .where(eqLn(lwLn.userId, req.user!.id));

        // Store batch as JSON if multiple invoices, else plain bolt11
        const storedPR = batchInvoices.length === 1
          ? batchInvoices[0].payment_request
          : JSON.stringify(batchInvoices.map(i => ({ amountSats: i.amountSats, payment_request: i.payment_request })));
        const firstInvoice = batchInvoices[0];

        const [txLn] = await dbLn.insert(ltLn).values({
          userId: req.user!.id, type: "withdrawal", amountSats,
          paymentRequest: storedPR, paymentHash: firstInvoice.payment_hash,
          memo: `⚡ Lightning → ${addr}`, status: "queued",
        }).returning();

        // Queue all invoices — background worker processes & retries automatically
        await queueBatchPayments(
          req.user!.id, txLn.id,
          batchInvoices.map(i => ({ amountSats: i.amountSats, payment_request: i.payment_request }))
        );
        await logAction(req, "lightning_send_queued", "lightning", req.user!.id, { amountSats, lightningAddress: addr, invoiceCount: batchInvoices.length });
        return res.json({
          ok: true, status: "queued", amountSats, lightningAddress: addr,
          invoices: batchInvoices.map(i => ({ amountSats: i.amountSats, invoice: i.payment_request })),
          txId: txLn.id, invoiceCount: batchInvoices.length,
          note: `⚡ ${batchInvoices.length} invoice${batchInvoices.length > 1 ? "s" : ""} queued. NexusOS is processing them automatically in the background.`,
        });
      }

      // ── On-chain BTC path ──────────────────────────────────────────────────
      if (amountSats < 1000)
        return res.status(400).json({ error: "Minimum on-chain withdrawal: 1,000 sats" });
      if (!/^(bc1[a-z0-9]{6,87}|[13][a-zA-HJ-NP-Z0-9]{25,34})$/.test(addr))
        return res.status(400).json({ error: "Invalid Bitcoin address. For Lightning, use format user@domain.com" });

      const lnWallet = await ensureLnWallet(req.user!.id);
      if (lnWallet.satsBalance < amountSats)
        return res.status(400).json({ error: `Insufficient sats (have ${lnWallet.satsBalance})` });

      // ── Dynamic fee from live mempool ─────────────────────────────────────
      let feeRateSatVbyte = 20; // fallback
      let confirmEtaMins = 30;
      try {
        const mp = await _fetchLiveMempool();
        if (mp) {
          feeRateSatVbyte = feeTier === "fast" ? mp.fast : feeTier === "slow" ? mp.slow : mp.medium;
          confirmEtaMins  = feeTier === "fast" ? 10 : feeTier === "slow" ? 60 : 30;
        }
      } catch { /* use fallback */ }
      const VBYTES_EST      = 200; // typical P2WPKH tx
      const networkFeeSats  = feeRateSatVbyte * VBYTES_EST;
      const platformFeeSats = Math.max(300, Math.round(amountSats * 0.003)); // 0.3% platform fee
      const FEE_SATS = networkFeeSats + platformFeeSats;
      const netSats  = amountSats - FEE_SATS;
      if (netSats <= 0)
        return res.status(400).json({ error: `Amount too small for ${feeTier} fee rate (${feeRateSatVbyte} sat/vB). Need at least ${FEE_SATS + 1000} sats.` });

      const { db } = await import("./db");
      const { lightningWallets, lightningTransactions } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      await db.update(lightningWallets)
        .set({ satsBalance: lnWallet.satsBalance - amountSats, updatedAt: new Date() })
        .where(eq(lightningWallets.userId, req.user!.id));

      const [tx] = await db.insert(lightningTransactions).values({
        userId:     req.user!.id,
        type:       "withdrawal",
        amountSats: netSats,           // net sats that will arrive on-chain
        btcAddress: addr,
        memo:       `Withdraw ${amountSats} sats → ${addr} (fee ${FEE_SATS} sats, net ${netSats} sats)`,
        status:     "pending",
      }).returning();

      // Trigger the processor immediately (non-blocking)
      import("./btc-withdrawal-processor.js")
        .then(m => m.processWithdrawalQueue())
        .catch(console.error);

      await logAction(req, "lightning_withdraw_btc", "lightning", req.user!.id, { amountSats, btcAddress: addr, feeSats: FEE_SATS, feeTier, feeRateSatVbyte });
      res.json({ ok: true, txId: tx.id, amountSats, feeSats: FEE_SATS, networkFeeSats, platformFeeSats, netSats, btcAddress: addr, status: "pending",
        feeTier, feeRateSatVbyte, confirmEtaMins,
        note: `Withdrawal submitted at ${feeRateSatVbyte} sat/vB (${feeTier}). BTC is being sent on-chain. ~${confirmEtaMins} min confirmation.` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // PUT /api/user/lightning-address — save the user's personal Lightning Address
  app.put("/api/user/lightning-address", authenticate, async (req: Request, res: Response) => {
    try {
      const { lightningAddress } = req.body;
      const addr = (lightningAddress ?? "").trim();
      if (addr && !/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(addr))
        return res.status(400).json({ error: "Invalid Lightning Address format (e.g. you@walletofsatoshi.com)" });
      const { db } = await import("./db");
      const { users: usersT } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(usersT)
        .set({ lightningAddress: addr || null, updatedAt: new Date() })
        .where(eq(usersT.id, req.user!.id));
      res.json({ ok: true, lightningAddress: addr || null });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/user/lightning-address — get the user's saved Lightning Address
  app.get("/api/user/lightning-address", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { users: usersT } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const [user] = await db.select({ lightningAddress: usersT.lightningAddress })
        .from(usersT).where(eq(usersT.id, req.user!.id));
      res.json({ lightningAddress: user?.lightningAddress ?? null });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/lightning/send-to-ln-address — resolve Lightning Address → invoice → pay (or return invoice for manual pay)
  app.post("/api/lightning/send-to-ln-address", authenticate, async (req: Request, res: Response) => {
    try {
      const { lightningAddress, amountSats, save = false } = req.body;
      const addr = (lightningAddress ?? "").trim();
      if (!addr || !/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(addr))
        return res.status(400).json({ error: "Invalid Lightning Address" });
      if (!amountSats || typeof amountSats !== "number" || amountSats < 1)
        return res.status(400).json({ error: "Minimum: 1 sat" });

      const lnWallet = await ensureLnWallet(req.user!.id);
      if (lnWallet.satsBalance < amountSats)
        return res.status(400).json({ error: `Insufficient sats — have ${lnWallet.satsBalance.toLocaleString()}, need ${amountSats.toLocaleString()}` });

      // Step 1 — resolve Lightning Address → batch of bolt11 invoices (auto-splits if amount > maxSendable)
      let batchInvoices: Array<{ amountSats: number; payment_request: string; payment_hash: string }>;
      try {
        batchInvoices = await lnurlPayBatchInvoices(addr, amountSats, "NexusOS withdrawal");
      } catch (e: any) {
        return res.status(400).json({ error: `Cannot resolve Lightning Address: ${e.message}` });
      }

      const { db } = await import("./db");
      const { lightningWallets, lightningTransactions, users: usersT } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // Optionally save the address to user profile
      if (save) {
        await db.update(usersT).set({ lightningAddress: addr, updatedAt: new Date() }).where(eq(usersT.id, req.user!.id));
      }

      const provider = detectLnProvider();

      // Deduct sats first
      await db.update(lightningWallets)
        .set({ satsBalance: lnWallet.satsBalance - amountSats, totalWithdrawn: lnWallet.totalWithdrawn + amountSats, updatedAt: new Date() })
        .where(eq(lightningWallets.userId, req.user!.id));

      // Store batch as JSON when multiple invoices, else plain bolt11
      const storedPR = batchInvoices.length === 1
        ? batchInvoices[0].payment_request
        : JSON.stringify(batchInvoices.map(i => ({ amountSats: i.amountSats, payment_request: i.payment_request })));

      const [tx] = await db.insert(lightningTransactions).values({
        userId:         req.user!.id,
        type:           "withdrawal",
        amountSats,
        paymentRequest: storedPR,
        paymentHash:    batchInvoices[0].payment_hash,
        memo:           `⚡ Lightning → ${addr}`,
        status:         "queued",
      }).returning();

      // Queue all invoices — background worker processes & retries automatically
      await queueBatchPayments(
        req.user!.id, tx.id,
        batchInvoices.map(i => ({ amountSats: i.amountSats, payment_request: i.payment_request }))
      );
      await logAction(req, "lightning_send_queued", "lightning", req.user!.id, { amountSats, lightningAddress: addr, invoiceCount: batchInvoices.length });
      res.json({
        ok: true, status: "queued", amountSats, lightningAddress: addr,
        invoices: batchInvoices.map(i => ({ amountSats: i.amountSats, invoice: i.payment_request })),
        txId: tx.id, invoiceCount: batchInvoices.length,
        note: `⚡ ${batchInvoices.length} invoice${batchInvoices.length > 1 ? "s" : ""} queued. NexusOS is processing them automatically in the background.`,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PUT /api/user/admin-btc-wallet — save / update the logged-in user's admin BTC wallet
  // Also accepts Lightning Addresses (user@domain) — routes them to lightningAddress field
  app.put("/api/user/admin-btc-wallet", authenticate, async (req: Request, res: Response) => {
    try {
      const { btcAddress, label = "Admin Wallet" } = req.body;
      if (!btcAddress) return res.status(400).json({ error: "btcAddress required" });
      const addr = btcAddress.trim();

      // ── Lightning Address path ──────────────────────────────────────────────
      if (addr.includes("@")) {
        if (!/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(addr))
          return res.status(400).json({ error: "Invalid Lightning Address format (e.g. you@walletofsatoshi.com)" });
        const { db } = await import("./db");
        const { users: usersTable } = await import("../shared/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(usersTable)
          .set({ lightningAddress: addr, updatedAt: new Date() })
          .where(eq(usersTable.id, req.user!.id));
        return res.json({ ok: true, lightningAddress: addr, type: "lightning" });
      }

      // ── On-chain BTC address path ───────────────────────────────────────────
      if (!/^(bc1[a-z0-9]{6,87}|[13][a-zA-HJ-NP-Z0-9]{25,34})$/.test(addr))
        return res.status(400).json({ error: "Invalid Bitcoin address. For Lightning, use format user@domain.com" });
      const { db } = await import("./db");
      const { users: usersTable, btcAddressBook } = await import("../shared/schema");
      const { eq, and, ne } = await import("drizzle-orm");
      await db.update(usersTable).set({ adminBtcAddress: addr, adminBtcAddressSetAt: new Date() }).where(eq(usersTable.id, req.user!.id));
      const [existing] = await db.select().from(btcAddressBook).where(and(eq(btcAddressBook.userId, req.user!.id), eq(btcAddressBook.btcAddress, addr)));
      if (existing) {
        await db.update(btcAddressBook).set({ isAdmin: true, label }).where(eq(btcAddressBook.id, existing.id));
      } else {
        await db.insert(btcAddressBook).values({ userId: req.user!.id, label, btcAddress: addr, isAdmin: true });
      }
      await db.update(btcAddressBook).set({ isAdmin: false }).where(and(eq(btcAddressBook.userId, req.user!.id), ne(btcAddressBook.btcAddress, addr)));
      res.json({ ok: true, adminBtcAddress: addr, type: "btc" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Multi-wallet BTC Watcher admin routes ────────────────────────────────────

  // GET /api/admin/watched-wallets — list all watched addresses + live snapshots
  app.get("/api/admin/watched-wallets", authenticate, async (req: Request, res: Response) => {
    try {
      const { getWatchedWallets, getTotalFed } = await import("./wnsp-io-liquidity");
      res.json({ ok: true, wallets: getWatchedWallets(), totalFed: getTotalFed() });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/admin/watched-wallets — add a BTC address to watch
  app.post("/api/admin/watched-wallets", authenticate, async (req: Request, res: Response) => {
    try {
      const { btcAddress, label = "" } = req.body;
      if (!btcAddress) return res.status(400).json({ error: "btcAddress required" });
      const addr = btcAddress.trim();
      if (!/^(bc1[a-zA-Z0-9]{6,87}|[13][a-zA-HJ-NP-Z0-9]{25,34})$/.test(addr))
        return res.status(400).json({ error: "Invalid Bitcoin address" });
      const { addWatchedWallet } = await import("./wnsp-io-liquidity");
      await addWatchedWallet(addr, label.trim());
      res.json({ ok: true, address: addr, label, message: `Now watching ${addr}` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/admin/watched-wallets/:address — stop watching an address
  app.delete("/api/admin/watched-wallets/:address", authenticate, async (req: Request, res: Response) => {
    try {
      const addr = decodeURIComponent(req.params.address);
      const { removeWatchedWallet } = await import("./wnsp-io-liquidity");
      await removeWatchedWallet(addr);
      res.json({ ok: true, removed: addr });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/admin/watched-wallets/history — all credited TXs across all wallets
  app.get("/api/admin/watched-wallets/history", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      const rows = await db.execute(S`
        SELECT address, txid, sats_received, credited_at, note
        FROM watched_btc_feeds
        ORDER BY credited_at DESC LIMIT 100
      `).catch(() => ({ rows: [] }));
      res.json({ ok: true, feeds: rows.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Legacy compat: PUT /api/admin/wnsp-io-address
  app.put("/api/admin/wnsp-io-address", authenticate, async (req: Request, res: Response) => {
    try {
      const { btcAddress } = req.body;
      if (!btcAddress) return res.status(400).json({ error: "btcAddress required" });
      const addr = btcAddress.trim();
      if (!/^(bc1[a-zA-Z0-9]{6,87}|[13][a-zA-HJ-NP-Z0-9]{25,34})$/.test(addr))
        return res.status(400).json({ error: "Invalid Bitcoin address" });
      const { addWatchedWallet } = await import("./wnsp-io-liquidity");
      await addWatchedWallet(addr, "wnsp.io UniSat");
      res.json({ ok: true, wnspIoAddress: addr, message: "Address added to watcher" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Legacy compat: GET /api/admin/wnsp-io-status
  app.get("/api/admin/wnsp-io-status", authenticate, async (req: Request, res: Response) => {
    try {
      const { getWatchedWallets, getTotalFed } = await import("./wnsp-io-liquidity");
      const wallets = getWatchedWallets();
      const first   = wallets[0];
      res.json({
        ok: true,
        address: first?.address ?? null,
        snapshot: first?.snapshot ?? null,
        sessionSatsFed: getTotalFed(),
        wallets,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Legacy compat: GET /api/admin/wnsp-io-history
  app.get("/api/admin/wnsp-io-history", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      const rows = await db.execute(S`
        SELECT address, txid, sats_received, credited_at, note
        FROM watched_btc_feeds
        ORDER BY credited_at DESC LIMIT 50
      `).catch(async () => {
        const r2 = await db.execute(S`
          SELECT txid, sats_received, credited_at, note
          FROM wnsp_io_liquidity_feeds
          ORDER BY credited_at DESC LIMIT 50
        `).catch(() => ({ rows: [] }));
        return r2;
      });
      res.json({ ok: true, feeds: rows.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/lightning/address-book — list saved BTC addresses for logged-in user
  app.get("/api/lightning/address-book", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { btcAddressBook } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const entries = await db.select().from(btcAddressBook).where(eq(btcAddressBook.userId, req.user!.id)).orderBy(desc(btcAddressBook.isAdmin), desc(btcAddressBook.createdAt));
      res.json({ ok: true, entries });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/lightning/address-book — add a new saved address (BTC on-chain or Lightning Address)
  app.post("/api/lightning/address-book", authenticate, async (req: Request, res: Response) => {
    try {
      const { btcAddress, label = "Wallet" } = req.body;
      if (!btcAddress) return res.status(400).json({ error: "address required" });
      const addr = btcAddress.trim();
      const isBtc = /^(bc1[a-z0-9]{6,87}|[13][a-zA-HJ-NP-Z0-9]{25,34})$/.test(addr);
      const isLnAddr = /^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(addr);
      if (!isBtc && !isLnAddr)
        return res.status(400).json({ error: "Enter a valid Bitcoin address (bc1…) or Lightning Address (you@domain.com)" });
      const { db } = await import("./db");
      const { btcAddressBook } = await import("../shared/schema");
      const [entry] = await db.insert(btcAddressBook).values({ userId: req.user!.id, label, btcAddress: addr }).returning();
      res.json({ ok: true, entry });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/lightning/address-book/:id — remove a saved address
  app.delete("/api/lightning/address-book/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { btcAddressBook } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.delete(btcAddressBook).where(and(eq(btcAddressBook.id, parseInt(req.params.id)), eq(btcAddressBook.userId, req.user!.id)));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/lightning/send — P2P sats transfer to another NexusOS user by username
  app.post("/api/lightning/send", authenticate, async (req: Request, res: Response) => {
    try {
      const { recipientUsername, amountSats, memo } = req.body;
      if (!recipientUsername) return res.status(400).json({ error: "recipientUsername required" });
      if (!amountSats || amountSats < 1) return res.status(400).json({ error: "Minimum 1 sat" });
      const { db } = await import("./db");
      const { lightningWallets, lightningTransactions, users: usersTable } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const [recipient] = await db.select().from(usersTable).where(eq(usersTable.username, recipientUsername));
      if (!recipient) return res.status(404).json({ error: `User '${recipientUsername}' not found` });
      if (recipient.id === req.user!.id) return res.status(400).json({ error: "Cannot send to yourself" });
      const senderWallet = await ensureLnWallet(req.user!.id);
      if (senderWallet.satsBalance < amountSats) return res.status(400).json({ error: `Insufficient sats (have ${senderWallet.satsBalance})` });
      await db.update(lightningWallets).set({ satsBalance: senderWallet.satsBalance - amountSats, updatedAt: new Date() }).where(eq(lightningWallets.userId, req.user!.id));
      const recipientWallet = await ensureLnWallet(recipient.id);
      await db.update(lightningWallets).set({ satsBalance: recipientWallet.satsBalance + amountSats, updatedAt: new Date() }).where(eq(lightningWallets.userId, recipient.id));
      const txMemo = memo || `P2P: ${req.user!.username} → ${recipientUsername}`;
      await db.insert(lightningTransactions).values({ userId: req.user!.id, type: "send_p2p", amountSats, memo: txMemo, status: "completed", completedAt: new Date() });
      await db.insert(lightningTransactions).values({ userId: recipient.id, type: "receive_p2p", amountSats, memo: txMemo, status: "completed", completedAt: new Date() });
      await logAction(req, "lightning_p2p_send", "lightning", req.user!.id, { recipientUsername, amountSats });
      res.json({ ok: true, amountSats, to: recipientUsername });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/stake — stake sats for NXT yield (atomic)
  app.post("/api/lightning/stake", authenticate, async (req: Request, res: Response) => {
    try {
      const { amountSats, lockDays } = req.body;
      if (!amountSats || amountSats < 1000) return res.status(400).json({ error: "Minimum stake: 1,000 sats" });
      if (![7, 14, 30, 90, 180, 365].includes(lockDays)) return res.status(400).json({ error: "lockDays must be 7, 14, 30, 90, 180, or 365" });
      const RATES: Record<number, string> = { 7: "5.00", 14: "12.00", 30: "28.00", 90: "90.00", 180: "200.00", 365: "420.00" };
      const { db } = await import("./db");
      const { lightningWallets, satsStakes } = await import("../shared/schema");
      const { eq, sql: drizzleSql } = await import("drizzle-orm");
      const wallet = await ensureLnWallet(req.user!.id);
      if (wallet.satsBalance < amountSats) return res.status(400).json({ error: "Insufficient sats" });
      const nxtYield = ((amountSats / 1000) * (parseFloat(RATES[lockDays]) / 100)).toFixed(8);
      const maturesAt = new Date(Date.now() + lockDays * 86_400_000);

      // ── Atomic: deduct sats and create stake record together ──
      let stake: any;
      await db.transaction(async (tx) => {
        await tx.update(lightningWallets)
          .set({ satsBalance: drizzleSql`${lightningWallets.satsBalance} - ${amountSats}`, updatedAt: new Date() })
          .where(eq(lightningWallets.userId, req.user!.id));
        [stake] = await tx.insert(satsStakes).values({
          userId: req.user!.id, amountSats, lockDays,
          yieldRatePercent: RATES[lockDays], maturesAt, nxtYield, status: "active",
        }).returning();
      });

      // ── Auto-mint WNUSD backed by the staked sats ──────────────────────────
      try {
        const { randomUUID } = await import("crypto");
        let btcUsd = 66_000;
        try {
          const pr = await fetch("https://mempool.space/api/v1/prices", { signal: AbortSignal.timeout(3000) });
          if (pr.ok) { const pd = await pr.json() as any; btcUsd = pd.USD ?? btcUsd; }
        } catch { /* use fallback */ }
        const satUsd   = btcUsd / 100_000_000;
        const wnusdAmt = parseFloat(((amountSats * satUsd) / 1.5).toFixed(8));
        const colPct   = 150;
        const posId    = randomUUID();
        const { wnusdPositions, wnusdTransactions } = await import("../shared/schema");
        await db.transaction(async (tx) => {
          await tx.insert(wnusdPositions).values({
            id: posId, userId: req.user!.id,
            collateralSats: BigInt(amountSats),
            nxtFeeSent: "0", wnusdMinted: String(wnusdAmt),
            status: "active", colRatioPct: String(colPct),
            btcUsdAtMint: String(btcUsd), stakeId: stake.id,
          });
          await tx.insert(wnusdTransactions).values({
            id: randomUUID(), userId: req.user!.id, positionId: posId,
            type: "auto_mint", satsDelta: BigInt(amountSats),
            wnusdDelta: String(wnusdAmt), nxtFee: "0",
            colRatioPct: String(colPct), btcUsdAtTime: String(btcUsd),
          });
        });
      } catch (wnusdErr: any) {
        console.warn("[STAKE] WNUSD auto-mint skipped:", wnusdErr.message);
      }

      await logAction(req, "sats_stake", "lightning", req.user!.id, { amountSats, lockDays, nxtYield });
      res.json({ ok: true, stake });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/lightning/stakes — get user's staking positions (with linked WNUSD amount)
  app.get("/api/lightning/stakes", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { satsStakes, wnusdPositions } = await import("../shared/schema");
      const { eq, desc, and } = await import("drizzle-orm");
      const stakes = await db.select().from(satsStakes).where(eq(satsStakes.userId, req.user!.id)).orderBy(desc(satsStakes.stakedAt));
      const now = new Date();
      // Attach linked WNUSD position amount to each stake
      const enriched = await Promise.all(stakes.map(async (s) => {
        let wnusdMinted = "0";
        try {
          const [pos] = await db.select({ wnusdMinted: wnusdPositions.wnusdMinted })
            .from(wnusdPositions)
            .where(and(eq((wnusdPositions as any).stakeId, s.id), eq(wnusdPositions.status, "active")))
            .limit(1);
          if (pos) wnusdMinted = pos.wnusdMinted;
        } catch { /* non-fatal */ }
        return { ...s, isMatured: s.status === "active" && s.maturesAt <= now, wnusdMinted };
      }));
      res.json({ stakes: enriched });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/unstake/:id — withdraw a staking position (mature = full yield; early = penalty)
  app.post("/api/lightning/unstake/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const stakeId = parseInt(req.params.id);
      const { db } = await import("./db");
      const { satsStakes, lightningWallets, wallets } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [stake] = await db.select().from(satsStakes).where(and(eq(satsStakes.id, stakeId), eq(satsStakes.userId, req.user!.id)));
      if (!stake) return res.status(404).json({ error: "Stake not found" });
      if (stake.status !== "active") return res.status(400).json({ error: `Stake already ${stake.status}` });

      // ── Early-exit penalty calculation ────────────────────────────────────────
      const now = new Date();
      const isEarly = stake.maturesAt > now;
      const totalMs   = stake.lockDays * 86_400_000;
      const remainMs  = isEarly ? stake.maturesAt.getTime() - now.getTime() : 0;
      const penaltyFraction = isEarly ? remainMs / totalMs : 0;          // fraction of lock left
      const fullYield   = parseFloat(stake.nxtYield);
      const penaltyNxt  = parseFloat((fullYield * penaltyFraction).toFixed(8));
      const userNxt     = parseFloat((fullYield - penaltyNxt).toFixed(8));
      const daysRemaining = Math.ceil(remainMs / 86_400_000);

      const lnWallet = await ensureLnWallet(req.user!.id);
      await db.update(lightningWallets).set({ satsBalance: lnWallet.satsBalance + stake.amountSats, updatedAt: new Date() }).where(eq(lightningWallets.userId, req.user!.id));
      const [nxtWallet] = await db.select().from(wallets).where(eq(wallets.userId, req.user!.id));
      if (nxtWallet && userNxt > 0) {
        const newBal = (parseFloat(nxtWallet.balance) + userNxt).toFixed(8);
        await db.update(wallets).set({ balance: newBal }).where(eq(wallets.userId, req.user!.id));
      }

      // ── Route penalty to orbital treasury ────────────────────────────────────
      if (isEarly && penaltyNxt > 0) {
        try {
          const { randomUUID: rU2 } = await import("crypto");
          const { sql: S3 } = await import("drizzle-orm");
          const ordinalUnits = Math.round(penaltyNxt * 1e8);
          await db.execute(S3`
            INSERT INTO orbital_treasury
              (id, source_record_id, source_label, source_wavelength_nm, source_frequency_hz,
               source_psi_channel, source_band, ordinal_nxt_units, operation_type, deposited_by, memo)
            VALUES
              (${rU2()}, ${String(stakeId)}, ${'early_exit_penalty'},
               ${580.0}, ${5.17e14}, ${'Ψ(0,0,H)'}, ${'USER'},
               ${ordinalUnits}, ${'EARLY_EXIT_PENALTY'}, ${req.user!.username},
               ${'Early exit penalty: ' + penaltyNxt.toFixed(8) + ' NXT · ' + daysRemaining + ' days remaining on stake #' + stakeId})
          `);
        } catch (e: any) { console.warn("[UNSTAKE] Treasury INSERT failed:", e.message); }
        console.log(`[UNSTAKE] Early exit — stake ${stakeId}: penalty ${penaltyNxt} NXT → orbital treasury`);
      }

      await db.update(satsStakes).set({ status: "claimed", claimedAt: new Date() }).where(eq(satsStakes.id, stakeId));

      // ── Auto-redeem the WNUSD position linked to this stake ────────────────
      try {
        const { wnusdPositions, wnusdTransactions } = await import("../shared/schema");
        const { randomUUID } = await import("crypto");
        const { sql: S2 } = await import("drizzle-orm");
        const [pos] = await db.select().from(wnusdPositions)
          .where(and(eq((wnusdPositions as any).stakeId, stakeId), eq(wnusdPositions.status, "active")));
        if (pos) {
          let btcUsd = 66_000;
          try {
            const pr = await fetch("https://mempool.space/api/v1/prices", { signal: AbortSignal.timeout(3000) });
            if (pr.ok) { const pd = await pr.json() as any; btcUsd = pd.USD ?? btcUsd; }
          } catch { /* fallback */ }
          await db.transaction(async (tx) => {
            await tx.update(wnusdPositions).set({ status: "redeemed", updatedAt: new Date() })
              .where(eq(wnusdPositions.id, pos.id));
            await tx.insert(wnusdTransactions).values({
              id: randomUUID(), userId: req.user!.id, positionId: pos.id,
              type: "auto_redeem", satsDelta: BigInt(-Number(pos.collateralSats)),
              wnusdDelta: String(-parseFloat(pos.wnusdMinted)), nxtFee: "0",
              colRatioPct: pos.colRatioPct, btcUsdAtTime: String(btcUsd),
            });
          });
        }
      } catch (wnusdErr: any) {
        console.warn("[UNSTAKE] WNUSD auto-redeem skipped:", wnusdErr.message);
      }

      await logAction(req, "sats_unstake", "lightning", req.user!.id, { stakeId, amountSats: stake.amountSats, nxtYield: stake.nxtYield, isEarly, penaltyNxt, daysRemaining });
      res.json({ ok: true, amountSats: stake.amountSats, nxtYield: String(userNxt), isEarly, penaltyNxt, daysRemaining });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/extend/:id — re-lock a stake for a further period
  app.post("/api/lightning/extend/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const stakeId = parseInt(req.params.id);
      const { lockDays } = req.body;
      if (![7, 14, 30, 90, 180, 365].includes(lockDays)) return res.status(400).json({ error: "lockDays must be 7, 14, 30, 90, 180, or 365" });
      const RATES: Record<number, string> = { 7: "5.00", 14: "12.00", 30: "28.00", 90: "90.00", 180: "200.00", 365: "420.00" };
      const { db } = await import("./db");
      const { satsStakes } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [stake] = await db.select().from(satsStakes).where(and(eq(satsStakes.id, stakeId), eq(satsStakes.userId, req.user!.id)));
      if (!stake) return res.status(404).json({ error: "Stake not found" });
      if (stake.status !== "active") return res.status(400).json({ error: `Stake already ${stake.status}` });

      // Additional yield earned on the extended period (stacks on top of existing)
      const extraYield = ((stake.amountSats / 1000) * (parseFloat(RATES[lockDays]) / 100));
      const newTotalYield = (parseFloat(stake.nxtYield) + extraYield).toFixed(8);
      const newMaturesAt = new Date(Date.now() + lockDays * 86_400_000);

      await db.update(satsStakes).set({
        lockDays,
        maturesAt: newMaturesAt,
        nxtYield: newTotalYield,
        yieldRatePercent: RATES[lockDays],
      }).where(eq(satsStakes.id, stakeId));

      // Keep WNUSD position active (collateral stays locked — that's the point)
      await logAction(req, "sats_stake_extend", "lightning", req.user!.id, { stakeId, lockDays, extraYield, newTotalYield });
      res.json({ ok: true, stakeId, lockDays, newMaturesAt, newTotalYield, extraYield: extraYield.toFixed(8) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/lightning/tip — tip a content creator / streamer with sats
  app.post("/api/lightning/tip", authenticate, async (req: Request, res: Response) => {
    try {
      const { recipientUserId: rawId, recipientUsername, amountSats, memo } = req.body;
      if (!rawId && !recipientUsername) return res.status(400).json({ error: "recipientUserId or recipientUsername required" });
      if (!amountSats || amountSats < 1) return res.status(400).json({ error: "Minimum 1 sat" });
      const { db } = await import("./db");
      const { lightningWallets, lightningTransactions, users: usersTable } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      let recipientUserId = rawId;
      if (!recipientUserId && recipientUsername) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.username, recipientUsername));
        if (!u) return res.status(404).json({ error: `User '${recipientUsername}' not found` });
        recipientUserId = u.id;
      }
      if (recipientUserId === req.user!.id) return res.status(400).json({ error: "Cannot tip yourself" });
      const senderWallet = await ensureLnWallet(req.user!.id);
      if (senderWallet.satsBalance < amountSats) return res.status(400).json({ error: "Insufficient sats" });
      await db.update(lightningWallets).set({ satsBalance: senderWallet.satsBalance - amountSats, updatedAt: new Date() }).where(eq(lightningWallets.userId, req.user!.id));
      const recipientWallet = await ensureLnWallet(recipientUserId);
      await db.update(lightningWallets).set({ satsBalance: recipientWallet.satsBalance + amountSats, updatedAt: new Date() }).where(eq(lightningWallets.userId, recipientUserId));
      const txMemo = memo || `⚡ Tip from ${req.user!.username}`;
      await db.insert(lightningTransactions).values({ userId: req.user!.id, type: "tip_sent", amountSats, memo: txMemo, status: "completed", completedAt: new Date() });
      await db.insert(lightningTransactions).values({ userId: recipientUserId, type: "tip_received", amountSats, memo: txMemo, status: "completed", completedAt: new Date() });
      await logAction(req, "sats_tip", "lightning", req.user!.id, { recipientUserId, amountSats });
      res.json({ ok: true, amountSats, memo: txMemo });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── End Lightning ─────────────────────────────────────────────────────────

  app.get("/api/swap/stats", async (_req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { nxtFbSwaps } = await import("../shared/schema");
      const { count, sum, eq } = await import("drizzle-orm");

      const [{ total }]       = await db.select({ total: count() }).from(nxtFbSwaps);
      const [{ nxtVolume }]   = await db.select({ nxtVolume: sum(nxtFbSwaps.nxtAmount) }).from(nxtFbSwaps);
      const [{ wnspBridged }] = await db.select({ wnspBridged: sum(nxtFbSwaps.wnspAmount) }).from(nxtFbSwaps);
      const [{ a2b }] = await db.select({ a2b: count() }).from(nxtFbSwaps).where(eq(nxtFbSwaps.direction, "nxt_to_fb"));
      const [{ b2a }] = await db.select({ b2a: count() }).from(nxtFbSwaps).where(eq(nxtFbSwaps.direction, "fb_to_nxt"));

      res.json({
        totalSwaps: total ?? 0,
        nxtVolume:  nxtVolume ?? "0",
        wnspBridged: wnspBridged ?? "0",
        nxtToFb:    a2b ?? 0,
        fbToNxt:    b2a ?? 0,
        rate:       { nxtPerWnsp: SWAP_RATE_NXT_PER_WNSP, wnspPerNxt: SWAP_WNSP_PER_NXT },
        bridgeAddress: FRACTAL_BRIDGE_ADDRESS,
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── BTC BLOCK SCANNER — on-chain verification + PSBT construction ────────────

  // GET /api/btc/verify-inscription/:id — verify wnsp BRC-20 inscription on-chain
  app.get("/api/btc/verify-inscription/:id", async (req: Request, res: Response) => {
    try {
      const { verifyWnspInscription } = await import("./btc-block-scanner");
      const result = await verifyWnspInscription(decodeURIComponent(req.params.id));
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/btc/verify-rune/:utxo — verify NEXUS•WAVELENGTH Rune UTXO on-chain
  app.get("/api/btc/verify-rune/:utxo", async (req: Request, res: Response) => {
    try {
      const { verifyRuneUtxo } = await import("./btc-block-scanner");
      const result = await verifyRuneUtxo(decodeURIComponent(req.params.utxo));
      res.json(result);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/btc/scan-stakes — manually trigger pending stake scan
  app.post("/api/btc/scan-stakes", authenticate, async (req: Request, res: Response) => {
    try {
      const { scanPendingStakes } = await import("./btc-block-scanner");
      const result = await scanPendingStakes();
      res.json({ ok: true, ...result });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/marketplace/psbt/:id — build unsigned PSBT for a listing purchase
  app.post("/api/marketplace/psbt/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const listingId = parseInt(req.params.id);
      const { buyerBtcAddress, buyerUtxoTxid, buyerUtxoVout } = req.body;
      if (!buyerBtcAddress) return res.status(400).json({ error: "buyerBtcAddress required" });

      const { db } = await import("./db");
      const { marketplaceListings } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [listing] = await db.select().from(marketplaceListings)
        .where(and(eq(marketplaceListings.id, listingId), eq(marketplaceListings.status, "active")));
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      if (listing.sellerId === req.user!.id) return res.status(400).json({ error: "Cannot buy your own listing" });

      const priceSats = listing.priceSats ?? Math.round(parseFloat(listing.priceNxt) * 100); // fallback: 1 NXT ≈ 100 sats
      const feeSats   = Math.round(priceSats * 0.025);

      // Fetch seller's UTXO details from the asset ID
      const { fetchUtxoDetails, constructMarketplacePsbt } = await import("./btc-block-scanner");
      const { getServiceWalletInfo } = await import("./btc-inscription-engine");
      const serviceInfo = getServiceWalletInfo();

      // Parse assetId into txid:vout
      let sellerTxid: string, sellerVout: number;
      if (listing.assetId.includes("i")) {
        // Inscription ID format: txidI0
        const sep = listing.assetId.lastIndexOf("i");
        sellerTxid = listing.assetId.slice(0, sep);
        sellerVout = parseInt(listing.assetId.slice(sep + 1)) || 0;
      } else if (listing.assetId.includes(":")) {
        [sellerTxid, sellerVout] = listing.assetId.split(":").map((s, i) => i === 0 ? s : parseInt(s)) as [string, number];
      } else {
        // Rune ID (BLOCK:TX) — no on-chain UTXO to construct PSBT from
        return res.status(400).json({
          error: "This asset type uses NXT-only settlement. Use the standard buy endpoint.",
          nxtOnly: true,
        });
      }

      const sellerUtxo = await fetchUtxoDetails(sellerTxid, sellerVout);
      if (!sellerUtxo) return res.status(400).json({ error: "Could not fetch seller UTXO from blockchain" });

      // Buyer UTXO (provided by frontend from wallet)
      let buyerUtxo = null;
      if (buyerUtxoTxid) {
        buyerUtxo = await fetchUtxoDetails(buyerUtxoTxid, buyerUtxoVout ?? 0);
      }
      if (!buyerUtxo) {
        // Return PSBT construction params for client-side assembly (buyer provides their UTXO via wallet)
        return res.json({
          ok: true,
          psbtReady: false,
          message: "Connect your Bitcoin wallet and provide a payment UTXO to complete the PSBT",
          listing: { id: listing.id, assetType: listing.assetType, assetId: listing.assetId, priceSats, feeSats },
          sellerUtxo,
        });
      }

      const psbt = await constructMarketplacePsbt({
        sellerUtxo,
        buyerUtxo,
        sellerBtcAddress: req.body.sellerBtcAddress ?? "",
        buyerBtcAddress,
        serviceWalletAddress: serviceInfo?.address ?? "",
        priceSats,
        feeSats,
      });

      res.json({ ok: true, psbtReady: true, ...psbt, priceSats, feeSats });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/btc/track-settlement — register a txid for settlement polling (called after pushPsbt)
  app.post("/api/btc/track-settlement", authenticate, async (req: Request, res: Response) => {
    try {
      const { txid, listingId } = req.body;
      if (!txid || !listingId) return res.status(400).json({ error: "txid and listingId required" });
      const { trackSettlement } = await import("./btc-block-scanner");
      trackSettlement(txid, parseInt(listingId));
      await logAction(req, "settlement_tracked", "marketplace", req.user!.id, { txid, listingId });
      res.json({ ok: true, message: `Tracking txid ${txid.slice(0, 16)}… for listing ${listingId}` });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/btc/broadcast — broadcast a fully-signed PSBT hex to Bitcoin network
  app.post("/api/btc/broadcast", authenticate, async (req: Request, res: Response) => {
    try {
      const { psbtHex, listingId } = req.body;
      if (!psbtHex) return res.status(400).json({ error: "psbtHex required" });

      // Finalize and extract raw tx
      const bitcoin = await import("bitcoinjs-lib");
      const psbt = bitcoin.Psbt.fromHex(psbtHex);
      psbt.finalizeAllInputs();
      const txHex = psbt.extractTransaction().toHex();

      // Broadcast — Blockstream first, mempool.space fallback
      let txid: string | null = null;
      for (const url of ["https://blockstream.info/api/tx", "https://mempool.space/api/tx"]) {
        try {
          const br = await fetch(url, {
            method: "POST", headers: { "Content-Type": "text/plain" }, body: txHex,
            signal: AbortSignal.timeout(15000),
          });
          if (br.ok) { txid = (await br.text()).trim(); break; }
        } catch { /* try next */ }
      }
      if (!txid) throw new Error("Broadcast failed on all APIs");

      await logAction(req, "psbt_broadcast", "marketplace", req.user!.id, { txid, listingId });

      // Wire into settlement poller — auto-marks listing as "sold" once 1 confirmation
      if (listingId) {
        const { trackSettlement } = await import("./btc-block-scanner");
        trackSettlement(txid, parseInt(listingId));
      }

      res.json({ ok: true, txid });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/btc/sentinel — wallet sentinel snapshot (REST fallback)
  app.get("/api/btc/sentinel", authenticate, async (_req: Request, res: Response) => {
    try {
      const { getSnapshot, getEvents } = await import("./btc-wallet-sentinel");
      const snapshot = getSnapshot();
      const events   = getEvents();
      const LOW_WARN = 20_000, LOW_CRIT = 5_000;
      const health = !snapshot ? "unknown"
        : snapshot.confirmed < LOW_CRIT ? "critical"
        : snapshot.confirmed < LOW_WARN ? "warning"
        : "ok";
      res.json({ ok: true, snapshot, events, health,
        mempoolUrl: snapshot ? `https://mempool.space/address/${snapshot.address}` : null });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/btc/sentinel/stream — SSE live push stream (no polling needed on client)
  app.get("/api/btc/sentinel/stream", authenticate, async (req: Request, res: Response) => {
    const { registerSSEClient, unregisterSSEClient, getSnapshot, getEvents } = await import("./btc-wallet-sentinel");

    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Send current state immediately so the page loads with data
    const snapshot = getSnapshot();
    const events   = getEvents();
    const LOW_WARN = 20_000, LOW_CRIT = 5_000;
    const health = !snapshot ? "unknown"
      : snapshot.confirmed < LOW_CRIT ? "critical"
      : snapshot.confirmed < LOW_WARN ? "warning"
      : "ok";
    res.write(`data: ${JSON.stringify({ snapshot, events, health,
      mempoolUrl: snapshot ? `https://mempool.space/address/${snapshot.address}` : null })}\n\n`);

    registerSSEClient(res);

    // Keepalive ping every 25 s to prevent proxy timeouts
    const ping = setInterval(() => {
      try { res.write(": ping\n\n"); } catch { clearInterval(ping); }
    }, 25_000);

    req.on("close", () => {
      clearInterval(ping);
      unregisterSSEClient(res);
    });
  });

  // GET /api/btc/assets-sentinel — assets sentinel snapshot (REST fallback)
  app.get("/api/btc/assets-sentinel", authenticate, async (_req: Request, res: Response) => {
    try {
      const { getAssetsSnapshot, getAssetsEvents } = await import("./btc-assets-sentinel");
      res.json({ ok: true, snapshot: getAssetsSnapshot(), events: getAssetsEvents() });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/btc/assets-sentinel/stream — SSE live push (Ordinals / Runes / BRC-20)
  app.get("/api/btc/assets-sentinel/stream", authenticate, async (req: Request, res: Response) => {
    const { registerAssetsSSEClient, unregisterAssetsSSEClient, getAssetsSnapshot, getAssetsEvents } = await import("./btc-assets-sentinel");

    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Send current state immediately
    res.write(`data: ${JSON.stringify({ snapshot: getAssetsSnapshot(), events: getAssetsEvents() })}\n\n`);

    registerAssetsSSEClient(res);

    const ping = setInterval(() => {
      try { res.write(": ping\n\n"); } catch { clearInterval(ping); }
    }, 25_000);

    req.on("close", () => {
      clearInterval(ping);
      unregisterAssetsSSEClient(res);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────

  // ── NEXUS•WAVELENGTH RUNE ────────────────────────────────────────────────────
  const RUNE_NAME        = "NEXUS•WAVELENGTH";
  const RUNE_SYMBOL      = "Ψ";
  const RUNE_DECIMALS    = 8;
  const RUNE_SUPPLY      = 21_000_000;
  const RUNE_MINT_AMOUNT = 1_000;
  const RUNE_MAX_MINTS   = 21_000;
  const RUNE_NXT_COST    = 100;
  const RUNE_STAKE_NXT_PER_EPOCH = 150; // NXT per epoch per 1,000 runes staked
  // Placeholder etched Rune ID (real etching tx to be submitted on mainnet)
  const RUNE_ID          = "840000:8472";
  const RUNE_BLOCK       = 840000;

  // GET /api/btc/mempool/stats — proxy mempool.space fee rates + mempool info + recent blocks
  app.get("/api/btc/mempool/stats", async (_req: Request, res: Response) => {
    try {
      const MSPACE = "https://mempool.space/api";
      const headers = { Accept: "application/json" };
      const sig = AbortSignal.timeout(10_000);

      const [feesRes, mempoolRes, blocksRes] = await Promise.allSettled([
        fetch(`${MSPACE}/v1/fees/recommended`, { headers, signal: sig }),
        fetch(`${MSPACE}/mempool`,             { headers, signal: sig }),
        fetch(`${MSPACE}/v1/blocks`,           { headers, signal: sig }),
      ]);

      const fees    = feesRes.status    === "fulfilled" && feesRes.value.ok    ? await feesRes.value.json()    : null;
      const mempool = mempoolRes.status === "fulfilled" && mempoolRes.value.ok ? await mempoolRes.value.json() : null;
      const blocks  = blocksRes.status  === "fulfilled" && blocksRes.value.ok  ? await blocksRes.value.json()  : null;

      // Summarise top 10 recent blocks
      const recentBlocks = Array.isArray(blocks) ? blocks.slice(0, 10).map((b: any) => ({
        height:    b.height,
        timestamp: b.timestamp,
        size:      b.size,
        weight:    b.weight,
        txCount:   b.tx_count,
        feeRange:  b.extras?.feeRange   ?? null,
        medianFee: b.extras?.medianFee  ?? null,
        reward:    b.extras?.reward     ?? null,
        miner:     b.extras?.pool?.name ?? null,
      })) : [];

      res.json({ ok: true, fees, mempool, recentBlocks, fetchedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  // GET /api/mempool/live — lightweight cached fee snapshot (60s TTL)
  app.get("/api/mempool/live", async (_req: Request, res: Response) => {
    try {
      const d = await _fetchLiveMempool();
      if (!d) return res.status(503).json({ ok: false, error: "Mempool data unavailable" });
      res.json({ ok: true, ...d });
    } catch (e: any) { res.status(502).json({ ok: false, error: e.message }); }
  });

  // GET /api/mempool/arbitrage — staking vs. BTC-move cost comparison for the logged-in user
  app.get("/api/mempool/arbitrage", authenticate, async (req: Request, res: Response) => {
    try {
      const mp = await _fetchLiveMempool();
      const feeRate     = mp?.medium ?? 20;
      const networkFee  = feeRate * 200;
      const LN_SATS_PER_NXT = 1000;
      const STAKE_RATE_7D   = 0.05;
      const { db } = await import("./db");
      const { lightningWallets } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const [lnWallet] = await db.select().from(lightningWallets).where(eq(lightningWallets.userId, req.user!.id));
      const satsBalance = lnWallet?.satsBalance ?? 0;
      const exampleSats      = Math.max(100_000, Math.floor(satsBalance * 0.1));
      const stakeYieldNxt    = (exampleSats / LN_SATS_PER_NXT) * STAKE_RATE_7D;
      const stakeYieldSats   = stakeYieldNxt * LN_SATS_PER_NXT;
      const netAdvantage     = stakeYieldSats - networkFee;
      res.json({
        ok: true,
        feeRateSatVbyte: feeRate,
        networkFee,
        exampleSats,
        stakeDays: 7,
        stakeYieldNxt: +stakeYieldNxt.toFixed(4),
        stakeYieldSats,
        netAdvantage,
        stakingWins: netAdvantage > 0,
        congestionLevel: mp?.congestionLevel ?? "medium",
        yieldBoost: mp?.yieldBoost ?? 1.0,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/mempool/miner-score — Herfindahl index + block time deviation from last 10 blocks
  app.get("/api/mempool/miner-score", async (_req: Request, res: Response) => {
    try {
      const sig = AbortSignal.timeout(8_000);
      const r = await fetch("https://mempool.space/api/v1/blocks", { signal: sig });
      if (!r.ok) return res.status(502).json({ error: "Mempool unavailable" });
      const blocks = (await r.json()).slice(0, 10);
      const minerCounts: Record<string, number> = {};
      for (const b of blocks) {
        const name = b.extras?.pool?.name ?? "Unknown";
        minerCounts[name] = (minerCounts[name] ?? 0) + 1;
      }
      const total = blocks.length;
      const hhi = Object.values(minerCounts).reduce((acc: number, c: any) => acc + (c / total) ** 2, 0);
      const miners = Object.entries(minerCounts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .map(([name, count]) => ({ name, count, sharePct: +((count as number) / total * 100).toFixed(0) }));
      const decentralization = hhi < 0.15 ? "healthy" : hhi < 0.25 ? "moderate" : "concentrated";
      const timestamps: number[] = blocks.map((b: any) => b.timestamp);
      const intervals = timestamps.slice(0, -1).map((t, i) => t - timestamps[i + 1]);
      const avgBlockSecs = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 600;
      const blockTimeDeviationPct = +((avgBlockSecs - 600) / 600 * 100).toFixed(1);
      res.json({ ok: true, miners, hhiPct: +(hhi * 100).toFixed(1), decentralization, avgBlockSecs, targetBlockSecs: 600, blockTimeDeviationPct, blockCount: total });
    } catch (e: any) { res.status(502).json({ error: e.message }); }
  });

  // GET /api/rune/info
  app.get("/api/rune/info", async (_req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { runeMints, runeStakes } = await import("../shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      const [mintStats] = await db.select({ count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(rune_amount),0)` }).from(runeMints).where(eq(runeMints.status, "confirmed"));
      const [stakeStats] = await db.select({ count: sql<number>`count(*)`, staked: sql<number>`coalesce(sum(rune_amount),0)` }).from(runeStakes).where(eq(runeStakes.status, "active"));
      res.json({
        name: RUNE_NAME, symbol: RUNE_SYMBOL, decimals: RUNE_DECIMALS,
        totalSupply: RUNE_SUPPLY, mintAmount: RUNE_MINT_AMOUNT,
        maxMints: RUNE_MAX_MINTS, nxtCost: RUNE_NXT_COST,
        runeId: RUNE_ID, block: RUNE_BLOCK,
        mintCount: Number(mintStats.count), mintedSupply: Number(mintStats.total),
        activeStakes: Number(stakeStats.count), totalStaked: Number(stakeStats.staked),
        stakeReward: RUNE_STAKE_NXT_PER_EPOCH,
        remaining: RUNE_MAX_MINTS - Number(mintStats.count),
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/rune/my-mints
  app.get("/api/rune/my-mints", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { runeMints } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const mints = await db.select().from(runeMints).where(eq(runeMints.userId, req.user!.id)).orderBy(desc(runeMints.createdAt)).limit(50);
      res.json({ mints });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/rune/mint
  app.post("/api/rune/mint", authenticate, async (req: Request, res: Response) => {
    try {
      const { btcAddress } = req.body;
      if (!btcAddress) return res.status(400).json({ error: "btcAddress required" });
      const { db } = await import("./db");
      const { runeMints } = await import("../shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      // Check supply cap
      const [mintStats] = await db.select({ count: sql<number>`count(*)` }).from(runeMints).where(eq(runeMints.status, "confirmed"));
      if (Number(mintStats.count) >= RUNE_MAX_MINTS)
        return res.status(400).json({ error: "All mints exhausted — 21,000 mints complete" });
      // Deduct NXT
      const wallet = await storage.getWallet(req.user!.id);
      if (!wallet) return res.status(400).json({ error: "Wallet not found" });
      const bal = parseFloat(wallet.balance);
      const cost = RUNE_NXT_COST * 1e8;
      if (bal < cost) return res.status(402).json({ error: `Need ${RUNE_NXT_COST} NXT, have ${(bal / 1e8).toFixed(2)}` });
      await storage.updateWalletBalance(wallet.id, (bal - cost).toFixed(8));
      // Generate a deterministic Rune ID for this mint
      const mintNum = Number(mintStats.count) + 1;
      const runeId = `${RUNE_BLOCK}:${8472 + mintNum}`;
      const [mint] = await db.insert(runeMints).values({
        userId: req.user!.id, username: req.user!.username,
        btcAddress, runeAmount: RUNE_MINT_AMOUNT,
        nxtPaid: RUNE_NXT_COST.toFixed(8), runeId, status: "confirmed",
      }).returning();
      await logAction(req, "rune_mint", "rune", req.user!.id, { runeId, btcAddress, nxtPaid: RUNE_NXT_COST });
      res.json({ ok: true, mint });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/rune/my-stakes
  app.get("/api/rune/my-stakes", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { runeStakes } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const stakes = await db.select().from(runeStakes).where(eq(runeStakes.userId, req.user!.id)).orderBy(desc(runeStakes.stakedAt)).limit(50);
      res.json({ stakes });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/rune/stake
  app.post("/api/rune/stake", authenticate, async (req: Request, res: Response) => {
    try {
      const { runeUtxo, runeAmount } = req.body;
      if (!runeUtxo) return res.status(400).json({ error: "runeUtxo required (format: BLOCK:TX or txid:vout)" });
      const amount = Math.max(1, parseInt(String(runeAmount ?? 1000)));
      const { db } = await import("./db");
      const { runeStakes } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      // Prevent duplicate UTXO staking
      const [existing] = await db.select().from(runeStakes).where(and(eq(runeStakes.runeUtxo, runeUtxo), eq(runeStakes.status, "active")));
      if (existing) return res.status(400).json({ error: "This Rune UTXO is already staked" });
      const [stake] = await db.insert(runeStakes).values({
        userId: req.user!.id, username: req.user!.username,
        runeAmount: amount, runeUtxo, epoch: 0,
        nxtEarned: "0", nxtClaimed: "0", status: "active",
      }).returning();
      await logAction(req, "rune_stake", "rune", req.user!.id, { runeUtxo, runeAmount: amount });
      res.json({ ok: true, stake });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/rune/claim/:id — claim earned NXT from a stake
  app.post("/api/rune/claim/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const stakeId = parseInt(req.params.id);
      const { db } = await import("./db");
      const { runeStakes } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [stake] = await db.select().from(runeStakes)
        .where(and(eq(runeStakes.id, stakeId), eq(runeStakes.userId, req.user!.id), eq(runeStakes.status, "active")));
      if (!stake) return res.status(404).json({ error: "Active stake not found" });
      // Calculate pending: each epoch earns RUNE_STAKE_NXT_PER_EPOCH NXT per 1000 runes
      const now   = Date.now();
      const since = stake.lastClaimAt ? new Date(stake.lastClaimAt).getTime() : new Date(stake.stakedAt).getTime();
      const hoursElapsed = (now - since) / 3_600_000;
      const epochsEarned = Math.floor(hoursElapsed / 24); // 1 epoch = 24 hours
      if (epochsEarned < 1) return res.status(400).json({ error: "No completed epochs yet — come back in 24h" });
      const rewardNxt = epochsEarned * RUNE_STAKE_NXT_PER_EPOCH * (stake.runeAmount / 1000);
      const rewardRaw = Math.round(rewardNxt * 1e8);
      // Credit NXT
      const wallet = await storage.getWallet(req.user!.id);
      if (wallet) await storage.updateWalletBalance(wallet.id, (parseFloat(wallet.balance) + rewardRaw).toFixed(8));
      const newEarned  = (parseFloat(stake.nxtEarned)  + rewardNxt).toFixed(8);
      const newClaimed = (parseFloat(stake.nxtClaimed) + rewardNxt).toFixed(8);
      await db.update(runeStakes).set({
        epoch: stake.epoch + epochsEarned,
        nxtEarned: newEarned, nxtClaimed: newClaimed,
        lastClaimAt: new Date(),
      }).where(eq(runeStakes.id, stakeId));
      res.json({ ok: true, epochsClaimed: epochsEarned, rewardNxt, newClaimed });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/rune/unstake/:id
  app.post("/api/rune/unstake/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const stakeId = parseInt(req.params.id);
      const { db } = await import("./db");
      const { runeStakes } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [stake] = await db.select().from(runeStakes)
        .where(and(eq(runeStakes.id, stakeId), eq(runeStakes.userId, req.user!.id), eq(runeStakes.status, "active")));
      if (!stake) return res.status(404).json({ error: "Active stake not found" });
      await db.update(runeStakes).set({ status: "unstaked" }).where(eq(runeStakes.id, stakeId));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  // ─────────────────────────────────────────────────────────────────────────────

  // ── BTC → NXT DEPOSIT PROCESSOR ──────────────────────────────────────────────
  const { BTC_DEPOSIT_SATS_PER_NXT, BTC_DEPOSIT_MIN_SATS } = await import("./btc-wallet-sentinel");

  // Ensure deposit tables exist on startup (IIFE — matches Lightning pattern)
  (async () => {
    try {
      const { db: _ddb } = await import("./db");
      const { sql: _sql } = await import("drizzle-orm");
      await _ddb.execute(_sql`
        CREATE TABLE IF NOT EXISTS btc_address_registry (
          id            SERIAL PRIMARY KEY,
          user_id       VARCHAR(36) NOT NULL,
          username      VARCHAR(100) NOT NULL,
          btc_address   TEXT NOT NULL UNIQUE,
          label         TEXT DEFAULT 'My BTC Sender Address',
          registered_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      await _ddb.execute(_sql`
        CREATE TABLE IF NOT EXISTS btc_deposits (
          id             SERIAL PRIMARY KEY,
          txid           TEXT NOT NULL UNIQUE,
          sender_address TEXT,
          sats_received  INTEGER NOT NULL,
          nxt_credited   DECIMAL(20,8),
          user_id        VARCHAR(36),
          username       TEXT,
          status         TEXT NOT NULL DEFAULT 'unmatched',
          detected_at    TIMESTAMP NOT NULL DEFAULT NOW(),
          credited_at    TIMESTAMP
        )
      `);
      console.log("[BTC Deposit] Tables ready");
    } catch (e: any) {
      console.error("[BTC Deposit] Table init error:", e.message);
    }
  })();

  // GET /api/btc/deposit/info — rate + deposit address (public)
  app.get("/api/btc/deposit/info", async (_req: Request, res: Response) => {
    res.json({
      depositAddress: "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m",
      satsPerNxt:     BTC_DEPOSIT_SATS_PER_NXT,
      minDepositSats: BTC_DEPOSIT_MIN_SATS,
      minDepositNxt:  BTC_DEPOSIT_MIN_SATS / BTC_DEPOSIT_SATS_PER_NXT,
      note:           "Send BTC from your registered address. NXT credited automatically within ~30 s of broadcast.",
    });
  });

  // GET /api/btc/deposit/address — get user's registered sender address
  app.get("/api/btc/deposit/address", authenticate, async (req: Request, res: Response) => {
    try {
      const { db: _db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      const rows = await _db.execute(S`SELECT * FROM btc_address_registry WHERE user_id = ${req.user!.id} LIMIT 1`);
      res.json({ registered: rows.rows[0] ?? null });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/btc/deposit/register — register or update sender BTC address
  app.post("/api/btc/deposit/register", authenticate, async (req: Request, res: Response) => {
    try {
      const { db: _db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      const { btcAddress, label } = req.body;
      if (!btcAddress || typeof btcAddress !== "string")
        return res.status(400).json({ error: "btcAddress required" });
      const trimmed = btcAddress.trim();
      // Accept all mainnet BTC address formats:
      // Legacy P2PKH (1…), P2SH (3…), native segwit bech32 (bc1q…), taproot bech32m (bc1p…)
      // bech32/bech32m max 90 chars total
      if (!/^(bc1[a-z0-9]{6,87}|[13][a-zA-HJ-NP-Z0-9]{25,34})$/.test(trimmed))
        return res.status(400).json({ error: "Invalid Bitcoin address. Paste your bc1p (Taproot), bc1q (Native SegWit), or legacy 1… / 3… address." });
      // Upsert — one registered address per user
      await _db.execute(S`
        INSERT INTO btc_address_registry (user_id, username, btc_address, label)
        VALUES (${req.user!.id}, ${req.user!.username}, ${trimmed}, ${label ?? "My BTC Sender Address"})
        ON CONFLICT (btc_address) DO UPDATE
          SET user_id = EXCLUDED.user_id, username = EXCLUDED.username,
              label = EXCLUDED.label, registered_at = NOW()
      `);
      // One address per user — remove any old registration
      await _db.execute(S`
        DELETE FROM btc_address_registry
        WHERE user_id = ${req.user!.id} AND btc_address != ${trimmed}
      `);
      await logAction(req, "btc_deposit_register", "btc", req.user!.id, { btcAddress: trimmed });
      res.json({ ok: true, btcAddress: trimmed, label: label ?? "My BTC Sender Address" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/btc/deposit/address — unregister
  app.delete("/api/btc/deposit/address", authenticate, async (req: Request, res: Response) => {
    try {
      const { db: _db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      await _db.execute(S`DELETE FROM btc_address_registry WHERE user_id = ${req.user!.id}`);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/btc/deposits — user's deposit history (last 50)
  app.get("/api/btc/deposits", authenticate, async (req: Request, res: Response) => {
    try {
      const { db: _db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      const rows = await _db.execute(S`
        SELECT * FROM btc_deposits
        WHERE user_id = ${req.user!.id}
        ORDER BY detected_at DESC LIMIT 50
      `);
      res.json({ deposits: rows.rows });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/btc/deposit/claim — claim an unmatched deposit by TX hash
  app.post("/api/btc/deposit/claim", authenticate, async (req: Request, res: Response) => {
    try {
      const { db: _db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");
      const { txid } = req.body;
      if (!txid || typeof txid !== "string" || !/^[a-f0-9]{64}$/i.test(txid.trim()))
        return res.status(400).json({ error: "Valid 64-char txid required" });
      const trimmed = txid.trim().toLowerCase();
      const rows = await _db.execute(S`SELECT * FROM btc_deposits WHERE txid = ${trimmed} LIMIT 1`);
      const dep = (rows.rows as any[])[0];
      if (!dep)
        return res.status(404).json({ error: "TX not found. Wait up to 30 s after broadcast, then try again." });
      if (dep.status === "credited" || dep.status === "claimed")
        return res.status(409).json({ error: `Deposit already ${dep.status} to ${dep.username ?? "another user"}.` });

      // Credit NXT to user
      const nxtAmount = dep.sats_received / BTC_DEPOSIT_SATS_PER_NXT;
      const wRows = await _db.execute(S`SELECT id, balance FROM wallets WHERE user_id = ${req.user!.id} LIMIT 1`);
      if ((wRows.rows as any[]).length === 0)
        return res.status(404).json({ error: "No NXT wallet found for your account" });
      const w = wRows.rows[0] as any;
      await _db.execute(S`UPDATE wallets SET balance = ${(parseFloat(w.balance) + nxtAmount).toFixed(8)} WHERE id = ${w.id}`);

      // Debit treasury reserve (NXT comes from treasury)
      const { GENESIS_EXECUTION_ADDRESS: _GEA } = await import("./physics");
      const tRows = await _db.execute(S`SELECT id, balance FROM wallets WHERE address = ${_GEA} LIMIT 1`);
      if ((tRows.rows as any[]).length > 0) {
        const tw = tRows.rows[0] as any;
        await _db.execute(S`UPDATE wallets SET balance = ${Math.max(0, parseFloat(tw.balance) - nxtAmount).toFixed(8)} WHERE id = ${tw.id}`);
      }

      // Mark claimed
      await _db.execute(S`
        UPDATE btc_deposits SET status = 'claimed',
          user_id = ${req.user!.id}, username = ${req.user!.username},
          nxt_credited = ${nxtAmount.toFixed(8)}, credited_at = NOW()
        WHERE txid = ${trimmed}
      `);
      await logAction(req, "btc_deposit_claim", "btc", req.user!.id, { txid: trimmed, satsReceived: dep.sats_received, nxtAmount });
      res.json({ ok: true, txid: trimmed, satsReceived: dep.sats_received, nxtCredited: nxtAmount.toFixed(8), newBalance: (parseFloat(w.balance) + nxtAmount).toFixed(8) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  // GET /api/btc/wallet/mempool — proxy user's registered BTC address mempool data
  app.get("/api/btc/wallet/mempool", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { sql: S } = await import("drizzle-orm");

      // Look up the user's registered BTC address
      const regRows = await db.execute(S`
        SELECT btc_address FROM btc_address_registry
        WHERE user_id = ${req.user!.id}
        LIMIT 1
      `);
      if ((regRows.rows as any[]).length === 0) {
        return res.json({ ok: false, noAddress: true, error: "No BTC address registered" });
      }
      const btcAddress: string = (regRows.rows as any[])[0].btc_address;

      // Serve from sentinel cache if fresh
      const { getOrFetchUserWallet } = await import("./btc-wallet-sentinel");
      const walletData = await getOrFetchUserWallet(btcAddress);
      if (!walletData) {
        return res.status(502).json({ ok: false, error: "Could not fetch wallet data from mempool.space" });
      }
      return res.json({ ok: true, wallet: walletData });
    } catch (err: any) {
      console.error("[BTC wallet/mempool]", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  // ── MARKETPLACE ──────────────────────────────────────────────────────────────
  const MARKETPLACE_FEE_PCT = 0.025; // 2.5% → Orbital Treasury (NXT is never destroyed)

  // GET /api/marketplace/listings — browse all active listings
  app.get("/api/marketplace/listings", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { marketplaceListings } = await import("../shared/schema");
      const { eq, desc, and } = await import("drizzle-orm");
      const assetType = req.query.assetType as string | undefined;
      const conditions = [eq(marketplaceListings.status, "active")];
      if (assetType) conditions.push(eq(marketplaceListings.assetType, assetType));
      const listings = await db.select().from(marketplaceListings)
        .where(and(...conditions))
        .orderBy(desc(marketplaceListings.createdAt))
        .limit(100);
      res.json({ listings });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/marketplace/my-listings — seller's own listings
  app.get("/api/marketplace/my-listings", authenticate, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { marketplaceListings } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const listings = await db.select().from(marketplaceListings)
        .where(eq(marketplaceListings.sellerId, req.user!.id))
        .orderBy(desc(marketplaceListings.createdAt))
        .limit(50);
      res.json({ listings });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/marketplace/list — create a new listing
  app.post("/api/marketplace/list", authenticate, async (req: Request, res: Response) => {
    try {
      const { assetType, assetId, assetName, amount, priceNxt, priceSats, description,
              sellerBtcAddress, ownershipSig } = req.body;
      if (!assetType || !assetId || !assetName || !priceNxt)
        return res.status(400).json({ error: "assetType, assetId, assetName, priceNxt required" });
      if (!["wnsp_brc20", "rune", "ordinal"].includes(assetType))
        return res.status(400).json({ error: "assetType must be wnsp_brc20 | rune | ordinal" });
      const priceNum = parseFloat(String(priceNxt));
      if (isNaN(priceNum) || priceNum <= 0)
        return res.status(400).json({ error: "priceNxt must be > 0" });

      const { db } = await import("./db");
      const { marketplaceListings } = await import("../shared/schema");

      const [listing] = await db.insert(marketplaceListings).values({
        sellerId:         req.user!.id,
        sellerUsername:   req.user!.username,
        sellerBtcAddress: sellerBtcAddress || null,
        ownershipSig:     ownershipSig || null,
        assetType,
        assetId,
        assetName,
        amount:           Math.max(1, parseInt(String(amount ?? 1000))),
        priceNxt:         priceNum.toFixed(8),
        priceSats:        priceSats ? parseInt(String(priceSats)) : null,
        status:           "active",
        description:      description || null,
      }).returning();

      await logAction(req, "marketplace_list", "marketplace", req.user!.id, {
        assetType, assetId, priceNxt: priceNum,
        btcVerified: !!(sellerBtcAddress && ownershipSig),
      });
      res.json({ ok: true, listing });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/marketplace/buy/:id — purchase a listing
  app.post("/api/marketplace/buy/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const listingId = parseInt(req.params.id);
      const { db } = await import("./db");
      const { marketplaceListings, wallets } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [listing] = await db.select().from(marketplaceListings)
        .where(and(eq(marketplaceListings.id, listingId), eq(marketplaceListings.status, "active")));
      if (!listing) return res.status(404).json({ error: "Listing not found or already sold" });
      if (listing.sellerId === req.user!.id)
        return res.status(400).json({ error: "Cannot buy your own listing" });

      const price = parseFloat(listing.priceNxt);
      const fee   = price * MARKETPLACE_FEE_PCT;
      const total = price + fee;

      // Check buyer balance
      const buyerWallet = await storage.getWallet(req.user!.id);
      if (!buyerWallet) return res.status(400).json({ error: "Buyer wallet not found" });
      const buyerBal = parseFloat(buyerWallet.balance);
      if (buyerBal < total)
        return res.status(402).json({ error: `Insufficient NXT. Need ${total.toFixed(4)}, have ${buyerBal.toFixed(4)}` });

      // Deduct from buyer (price + fee)
      await storage.updateWalletBalance(buyerWallet.id, (buyerBal - total).toFixed(8));

      // Credit seller (price only, not fee)
      const sellerWallet = await storage.getWallet(listing.sellerId);
      if (sellerWallet) {
        const newSellerBal = (parseFloat(sellerWallet.balance) + price).toFixed(8);
        await storage.updateWalletBalance(sellerWallet.id, newSellerBal);
      }

      // Redirect marketplace fee to Orbital Treasury — NXT is NEVER destroyed
      const { GENESIS_EXECUTION_ADDRESS: TREASURY_ADDR } = await import("./physics");
      const treasuryWlt = await storage.getWalletByAddress(TREASURY_ADDR);
      if (treasuryWlt) {
        const tBal2 = parseFloat(treasuryWlt.balance);
        await storage.updateWalletBalance(treasuryWlt.id, (tBal2 + fee).toFixed(8));
        await storage.createTransaction({
          fromWalletId: buyerWallet.id,
          toWalletId:   treasuryWlt.id,
          amount:       fee.toFixed(8),
          fee:          "0.00000000",
          type:         "treasury_deposit",
          status:       "completed",
          metadata:     { reason: "marketplace_fee", listingId, pct: "2.5%", note: "Fee redirected to Orbital Treasury — not destroyed" },
        });
      }

      // Mark listing sold
      await db.update(marketplaceListings)
        .set({ status: "sold", buyerId: req.user!.id, buyerUsername: req.user!.username, soldAt: new Date() })
        .where(eq(marketplaceListings.id, listingId));

      // Log transactions
      await storage.createTransaction({
        fromWalletId: buyerWallet.id,
        toWalletId:   sellerWallet?.id,
        amount:       price.toFixed(8),
        fee:          fee.toFixed(8),
        type:         "marketplace_sale",
        metadata:     { action: "marketplace_buy", listingId, assetType: listing.assetType, assetId: listing.assetId },
      });

      await logAction(req, "marketplace_buy", "marketplace", req.user!.id, { listingId, assetType: listing.assetType, price, fee });
      res.json({ ok: true, listing: { ...listing, status: "sold" }, paid: total.toFixed(8), fee: fee.toFixed(8) });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/marketplace/cancel/:id — cancel own listing
  app.post("/api/marketplace/cancel/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const listingId = parseInt(req.params.id);
      const { db } = await import("./db");
      const { marketplaceListings } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [listing] = await db.select().from(marketplaceListings)
        .where(and(eq(marketplaceListings.id, listingId), eq(marketplaceListings.sellerId, req.user!.id)));
      if (!listing) return res.status(404).json({ error: "Listing not found" });
      if (listing.status !== "active") return res.status(400).json({ error: "Listing is not active" });

      await db.update(marketplaceListings)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(marketplaceListings.id, listingId));

      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET /api/marketplace/stats — volume, listings count, sales
  app.get("/api/marketplace/stats", async (_req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { marketplaceListings } = await import("../shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      const [active] = await db.select({ count: sql<number>`count(*)` }).from(marketplaceListings).where(eq(marketplaceListings.status, "active"));
      const [sold]   = await db.select({ count: sql<number>`count(*)`, vol: sql<string>`coalesce(sum(price_nxt::numeric),0)` }).from(marketplaceListings).where(eq(marketplaceListings.status, "sold"));
      res.json({ activeListings: Number(active.count), totalSales: Number(sold.count), volumeNxt: sold.vol ?? "0" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
  // ── WNUSD STABLECOIN STATS ────────────────────────────────────────────────────
  // GET /api/stablecoin/stats — NXT treasury reserve → live USD backing → WNUSD model
  app.get("/api/stablecoin/stats", async (_req: Request, res: Response) => {
    try {
      const SATS_PER_NXT   = 1_000;
      const SATS_PER_BTC   = 100_000_000;
      const COL_RATIO      = 1.5;           // 150% over-collateralised
      const MAX_SUPPLY_CAP = 500_000_000;   // $500M hard cap

      // Fetch BTC price (same CoinGecko route used by /api/market/price)
      let btcUsd = 70_000; // fallback
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
          { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(4000) });
        if (r.ok) { const d = await r.json() as any; btcUsd = d.bitcoin.usd; }
      } catch { /* use fallback */ }

      // Genesis treasury — query NXT wallet for the genesis user
      const { db }    = await import("./db");
      const { wallets } = await import("../shared/schema");
      const { sql: S } = await import("drizzle-orm");
      const [genesis] = await db.select({ balance: wallets.balance })
        .from(wallets)
        .orderBy(S`balance::numeric DESC`)
        .limit(1);

      const NXT_HARD_CAP   = 21_000_000_000;  // 21B NXT total supply

      const treasuryNxt   = genesis ? parseFloat(genesis.balance) : 499_999_000;
      const satUsd        = btcUsd / SATS_PER_BTC;
      const nxtUsd        = satUsd * SATS_PER_NXT;
      const treasurySats  = Math.floor(treasuryNxt * SATS_PER_NXT);

      // Staked sats pool — auto-collateral from all active sats_stakes
      const { satsStakes: satsStakesT } = await import("../shared/schema");
      const { sql: stakesSql } = await import("drizzle-orm");
      const [stakeRow] = await db.select({
        totalStaked: stakesSql<number>`coalesce(sum(amount_sats),0)`,
        stakeCount:  stakesSql<number>`count(*)`,
      }).from(satsStakesT).where(stakesSql`status = 'active'`);
      const totalStakedSats  = Number(stakeRow?.totalStaked ?? 0);
      const totalBackingSats = treasurySats + totalStakedSats;
      const collateralUsd    = totalBackingSats * satUsd;
      const maxMintUsd       = Math.min(collateralUsd / COL_RATIO, MAX_SUPPLY_CAP);

      // Full-supply ceiling: when all 21B NXT are consumed → 21T sats
      const fullSupplyNxt     = NXT_HARD_CAP;
      const fullSupplySats    = NXT_HARD_CAP * SATS_PER_NXT;          // 21,000,000,000,000
      const fullSupplyUsd     = fullSupplySats * satUsd;               // NXT market cap
      const fullSupplyMaxMint = fullSupplyUsd / COL_RATIO;             // uncapped — that's the ceiling

      res.json({
        ok: true,
        token:          "WNUSD",
        peg:            1.0,
        btcUsd,
        satUsd,
        nxtUsd,
        treasuryNxt,
        treasurySats,
        collateralUsd,
        colRatio:       COL_RATIO,
        maxMintUsd,
        // Staked sats breakdown
        stakedSats: totalStakedSats,
        stakedSatsUsd: totalStakedSats * satUsd,
        treasurySats,
        totalBackingSats,
        circulatingSupply: 0,
        collateralRatioPct: 100 * COL_RATIO,
        // Full-supply ceiling
        fullSupplyNxt,
        fullSupplySats,
        fullSupplyUsd,
        fullSupplyMaxMint,
        mechanism: "NXT treasury → 1,000 sats/NXT → floating BTC/USD → over-collateralised WNUSD",
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── MARKET PRICE FEED ─────────────────────────────────────────────────────────
  // GET /api/market/price — live BTC/USD → derived NXT/USD and sat/USD prices
  {
    const NXT_SUPPLY        = 21_000_000_000;
    const SATS_PER_NXT      = 1_000;
    const SATS_PER_BTC      = 100_000_000;
    let   _priceCache: { btcUsd: number; fetchedAt: number } | null = null;
    const CACHE_TTL_MS      = 60_000;

    const fetchBtcPrice = async (): Promise<number> => {
      if (_priceCache && Date.now() - _priceCache.fetchedAt < CACHE_TTL_MS) return _priceCache.btcUsd;
      // CoinGecko free — no key required
      const r = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
      );
      if (!r.ok) throw new Error(`CoinGecko ${r.status}`);
      const d = await r.json() as { bitcoin: { usd: number } };
      const btcUsd = d.bitcoin.usd;
      _priceCache = { btcUsd, fetchedAt: Date.now() };
      return btcUsd;
    };

    app.get("/api/market/price", async (_req: Request, res: Response) => {
      try {
        const btcUsd   = await fetchBtcPrice();
        const satUsd   = btcUsd / SATS_PER_BTC;
        const nxtUsd   = satUsd * SATS_PER_NXT;           // 1 NXT = 1,000 sats
        const nxtMcap  = nxtUsd * NXT_SUPPLY;             // implied market cap
        res.json({
          ok: true,
          btcUsd,
          satUsd,
          nxtUsd,
          nxtMcap,
          satsPerNxt:  SATS_PER_NXT,
          nxtSupply:   NXT_SUPPLY,
          fetchedAt:   _priceCache?.fetchedAt ?? Date.now(),
          formula:     "nxtUsd = btcUsd / 100,000,000 × 1,000 = btcUsd / 100,000",
        });
      } catch (err: any) {
        // Fallback: return last cache if available, else 503
        if (_priceCache) {
          const btcUsd  = _priceCache.btcUsd;
          const satUsd  = btcUsd / SATS_PER_BTC;
          const nxtUsd  = satUsd * SATS_PER_NXT;
          const nxtMcap = nxtUsd * NXT_SUPPLY;
          return res.json({ ok: true, btcUsd, satUsd, nxtUsd, nxtMcap, satsPerNxt: SATS_PER_NXT, nxtSupply: NXT_SUPPLY, fetchedAt: _priceCache.fetchedAt, stale: true });
        }
        res.status(503).json({ error: err.message });
      }
    });
  }
  // ── Nostr relay bridge ────────────────────────────────────────────────────────
  app.get("/api/nostr/status", (_req: Request, res: Response) => {
    try {
      res.json({
        npub:       nostrService.getNpub(),
        pubkeyHex:  nostrService.getPubkeyHex(),
        relays:     nostrService.DEFAULT_RELAYS,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nostr/feed", async (_req: Request, res: Response) => {
    try {
      const events = await nostrService.fetchRecentEvents(20);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nostr/global", async (_req: Request, res: Response) => {
    try {
      const events = await nostrService.fetchGlobalWnspEvents(30);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nostr/publish", authenticate, async (req: Request, res: Response) => {
    try {
      const { kind, content, psi, uri, tags } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "content is required" });
      }
      const result = await nostrService.publishToNostr({ kind: kind ?? "note", content, psi, uri, tags });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── WNUSD Liquidity — Mint / Redeem / Positions ──────────────────────────────
  {
    const SATS_PER_NXT  = 1_000;
    const SATS_PER_BTC  = 100_000_000;
    const COL_RATIO     = 1.5;
    const MINT_FEE_RATE = 0.005; // 0.5% of NXT-equivalent as orbital treasury fee

    async function fetchBtcForWnusd(): Promise<number> {
      try {
        const r = await fetch("https://mempool.space/api/v1/prices",
          { signal: AbortSignal.timeout(4000) });
        if (r.ok) { const d = await r.json() as any; return d.USD; }
      } catch { /* ignore */ }
      return 66_000;
    }

    // GET /api/wnusd/positions — user's active positions with live col ratio
    app.get("/api/wnusd/positions", authenticate, async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const { db } = await import("./db");
        const { sql: S } = await import("drizzle-orm");
        const btcUsd  = await fetchBtcForWnusd();
        const satUsd  = btcUsd / SATS_PER_BTC;

        const positions = await db.execute(S`
          SELECT p.id, p.collateral_sats, p.nxt_fee_sent, p.wnusd_minted,
                 p.status, p.col_ratio_pct, p.btc_usd_at_mint, p.opened_at, p.updated_at
          FROM wnusd_positions p
          WHERE p.user_id = ${userId}
          ORDER BY p.opened_at DESC
        `);

        const rows = (positions.rows as any[]).map((p) => {
          const colUsd      = Number(p.collateral_sats) * satUsd;
          const minted      = parseFloat(p.wnusd_minted);
          const liveRatio   = minted > 0 ? (colUsd / minted) * 100 : 0;
          const liquidation = minted > 0 ? (minted * COL_RATIO) / satUsd : 0;
          return { ...p, liveColRatioPct: liveRatio.toFixed(2), satUsd, btcUsd, liquidationSats: Math.ceil(liquidation) };
        });

        // history
        const history = await db.execute(S`
          SELECT t.id, t.position_id, t.type, t.sats_delta, t.wnusd_delta,
                 t.nxt_fee, t.col_ratio_pct, t.btc_usd_at_time, t.created_at
          FROM wnusd_transactions t
          WHERE t.user_id = ${userId}
          ORDER BY t.created_at DESC LIMIT 50
        `);

        res.json({ ok: true, positions: rows, history: history.rows, btcUsd, satUsd });
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    // POST /api/wnusd/mint — lock sats + pay NXT fee to orbital treasury → mint WNUSD
    app.post("/api/wnusd/mint", authenticate, async (req: Request, res: Response) => {
      try {
        const user   = (req as any).user;
        const userId = user.id;
        const satAmount = parseInt(req.body.satAmount, 10);
        if (!satAmount || satAmount < 10_000) return res.status(400).json({ error: "Minimum 10,000 sats to mint" });

        const { db } = await import("./db");
        const { lightningWallets, wallets } = await import("../shared/schema");
        const { eq, sql: S } = await import("drizzle-orm");

        const btcUsd   = await fetchBtcForWnusd();
        const satUsd   = btcUsd / SATS_PER_BTC;
        const nxtEquiv = satAmount / SATS_PER_NXT;
        const nxtFee   = parseFloat((nxtEquiv * MINT_FEE_RATE).toFixed(8));
        const colUsd   = satAmount * satUsd;
        const wnusdOut = parseFloat((colUsd / COL_RATIO).toFixed(8));
        const colRatio = COL_RATIO * 100;

        // Check balances
        const [lw] = await db.select().from(lightningWallets).where(eq(lightningWallets.userId, userId));
        if (!lw) return res.status(400).json({ error: "No lightning wallet found" });
        if (lw.satsBalance < satAmount) return res.status(400).json({ error: `Insufficient sats — have ${lw.satsBalance.toLocaleString()}, need ${satAmount.toLocaleString()}` });

        const [nxtWallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
        if (!nxtWallet) return res.status(400).json({ error: "No NXT wallet found" });
        const nxtBalance = parseFloat(nxtWallet.balance);
        if (nxtBalance < nxtFee) return res.status(400).json({ error: `Insufficient NXT for fee — have ${nxtBalance.toFixed(4)}, need ${nxtFee.toFixed(4)}` });

        const posId = crypto.randomUUID();
        const txId  = crypto.randomUUID();
        const otId  = crypto.randomUUID();

        await db.transaction(async (tx) => {
          // 1. Deduct sats from lightning wallet
          await tx.update(lightningWallets)
            .set({ satsBalance: lw.satsBalance - satAmount })
            .where(eq(lightningWallets.userId, userId));

          // 2. Deduct NXT fee from NXT wallet
          const newBal = (nxtBalance - nxtFee).toFixed(8);
          await tx.update(wallets).set({ balance: newBal }).where(eq(wallets.userId, userId));

          // 3. Insert orbital_treasury record (ordinal_nxt_units = NXT fee × 1e8)
          const ordinalUnits = Math.round(nxtFee * 1e8);
          await tx.execute(S`
            INSERT INTO orbital_treasury
              (id, source_record_id, source_label, source_wavelength_nm, source_frequency_hz,
               source_psi_channel, source_band, ordinal_nxt_units, operation_type, deposited_by, memo)
            VALUES
              (${otId}, ${posId}, ${'WNUSD_MINT fee from ' + user.username},
               ${580.0}, ${5.17e14}, ${'Ψ(0,0,H)'}, ${'USER'},
               ${ordinalUnits}, ${'WNUSD_MINT'}, ${user.username},
               ${'WNUSD mint fee: ' + nxtFee.toFixed(8) + ' NXT from ' + satAmount.toLocaleString() + ' sats collateral'})
          `);

          // 4. Create position
          await tx.execute(S`
            INSERT INTO wnusd_positions
              (id, user_id, collateral_sats, nxt_fee_sent, wnusd_minted,
               status, col_ratio_pct, btc_usd_at_mint, opened_at, updated_at)
            VALUES
              (${posId}, ${userId}, ${satAmount}, ${nxtFee.toFixed(8)},
               ${wnusdOut.toFixed(8)}, ${'active'}, ${colRatio.toFixed(2)},
               ${btcUsd.toFixed(2)}, now(), now())
          `);

          // 5. Record transaction
          await tx.execute(S`
            INSERT INTO wnusd_transactions
              (id, user_id, position_id, type, sats_delta, wnusd_delta,
               nxt_fee, col_ratio_pct, btc_usd_at_time, created_at)
            VALUES
              (${txId}, ${userId}, ${posId}, ${'mint'}, ${satAmount},
               ${wnusdOut.toFixed(8)}, ${nxtFee.toFixed(8)},
               ${colRatio.toFixed(2)}, ${btcUsd.toFixed(2)}, now())
          `);

          // 6. Log audit
          await tx.execute(S`
            INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, status)
            VALUES (gen_random_uuid()::varchar, ${userId}, ${'wnusd_mint'}, ${'wnusd'}, ${posId},
              ${JSON.stringify({ satAmount, nxtFee, wnusdOut, btcUsd, colRatio })}::jsonb, ${'success'})
          `);
        });

        res.json({ ok: true, positionId: posId, wnusdMinted: wnusdOut, satAmount, nxtFee, colRatioPct: colRatio, btcUsd });
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    // POST /api/wnusd/redeem — burn WNUSD → unlock sats back to lightning wallet
    app.post("/api/wnusd/redeem", authenticate, async (req: Request, res: Response) => {
      try {
        const user      = (req as any).user;
        const userId    = user.id;
        const { positionId } = req.body;
        if (!positionId) return res.status(400).json({ error: "positionId required" });

        const { db } = await import("./db");
        const { lightningWallets } = await import("../shared/schema");
        const { eq, sql: S } = await import("drizzle-orm");

        const posRows = await db.execute(S`
          SELECT * FROM wnusd_positions WHERE id = ${positionId} AND user_id = ${userId}
        `);
        const pos = (posRows.rows as any[])[0];
        if (!pos) return res.status(404).json({ error: "Position not found" });
        if (pos.status !== "active") return res.status(400).json({ error: "Position is not active" });

        const collateral = Number(pos.collateral_sats);
        const wnusd      = parseFloat(pos.wnusd_minted);
        const btcUsd     = await fetchBtcForWnusd();
        const satUsd     = btcUsd / SATS_PER_BTC;
        const colUsd     = collateral * satUsd;
        const liveRatio  = wnusd > 0 ? (colUsd / wnusd) * 100 : 0;
        const txId       = crypto.randomUUID();

        const [lw] = await db.select().from(lightningWallets).where(eq(lightningWallets.userId, userId));
        if (!lw) return res.status(400).json({ error: "Lightning wallet not found" });

        await db.transaction(async (tx) => {
          // 1. Mark position redeemed
          await tx.execute(S`
            UPDATE wnusd_positions SET status = 'redeemed', updated_at = now()
            WHERE id = ${positionId}
          `);
          // 2. Return collateral sats
          await tx.update(lightningWallets)
            .set({ satsBalance: lw.satsBalance + collateral })
            .where(eq(lightningWallets.userId, userId));
          // 3. Record redemption
          await tx.execute(S`
            INSERT INTO wnusd_transactions
              (id, user_id, position_id, type, sats_delta, wnusd_delta,
               nxt_fee, col_ratio_pct, btc_usd_at_time, created_at)
            VALUES
              (${txId}, ${userId}, ${positionId}, ${'redeem'}, ${-collateral},
               ${(-wnusd).toFixed(8)}, ${'0'}, ${liveRatio.toFixed(2)}, ${btcUsd.toFixed(2)}, now())
          `);
          // 4. Audit
          await tx.execute(S`
            INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, status)
            VALUES (gen_random_uuid()::varchar, ${userId}, ${'wnusd_redeem'}, ${'wnusd'}, ${positionId},
              ${JSON.stringify({ collateral, wnusd, btcUsd })}::jsonb, ${'success'})
          `);
        });

        res.json({ ok: true, satsReturned: collateral, wnusdBurned: wnusd, positionId });
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    // GET /api/wnusd/stats — global circulating supply for stablecoin/stats
    app.get("/api/wnusd/supply", async (_req: Request, res: Response) => {
      try {
        const { db } = await import("./db");
        const { sql: S } = await import("drizzle-orm");
        const r = await db.execute(S`
          SELECT COALESCE(SUM(wnusd_minted::numeric), 0) AS total_minted,
                 COALESCE(SUM(collateral_sats), 0) AS total_collateral,
                 COUNT(*) AS position_count
          FROM wnusd_positions WHERE status = 'active'
        `);
        const row = (r.rows as any[])[0];
        res.json({ ok: true, totalMinted: parseFloat(row.total_minted), totalCollateralSats: Number(row.total_collateral), positionCount: Number(row.position_count) });
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
  }

  // ── Lightning Payment Queue auto-processor — runs every 60s, drains queued invoices ──
  setInterval(() => { processBatchQueue().catch(() => {}); }, 60_000);
  console.log("[LN Queue] Auto-processor started — retrying queued invoices every 60s");

  // ── Mempool fee-alert loop — runs every 5 min, sends Telegram alert when fees drop ──
  setInterval(async () => {
    try {
      const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TG_TOKEN || _feeAlertSubs.size === 0) return;
      const mp = await _fetchLiveMempool();
      if (!mp) return;
      const isLow = (mp.medium ?? 999) <= 5;
      if (isLow && !_prevFeesWereLow && Date.now() - _lastFeeAlertSentAt > 3_600_000) {
        const msg = `🟢 *Bitcoin fees are low right now!*\n\n⚡ Current rate: *${mp.medium} sat/vB* (Economy: ${mp.slow} sat/vB)\n💡 Good time to withdraw sats to BTC or top up your balance.\n\n→ Open NexusOS Wallet to act now.`;
        for (const chatId of _feeAlertSubs) {
          try {
            await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
              signal: AbortSignal.timeout(5_000),
            });
          } catch { /* non-fatal per-subscriber */ }
        }
        _lastFeeAlertSentAt = Date.now();
        console.log(`[FEE ALERT] Low-fee alert sent to ${_feeAlertSubs.size} subscriber(s) at ${mp.medium} sat/vB`);
      }
      _prevFeesWereLow = isLow;
    } catch { /* non-fatal */ }
  }, 5 * 60_000);

  // ─────────────────────────────────────────────────────────────────────────────

  return httpServer;
}
