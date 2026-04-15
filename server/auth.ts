import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { User, Session, ApiKey } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
      apiKey?: ApiKey;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header provided" });
    }

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = await storage.getSessionByToken(token);
      
      if (!session) {
        await logAuthFailure(req, "Invalid or expired session token");
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.isActive) {
        await logAuthFailure(req, "User not found or inactive");
        return res.status(401).json({ error: "User not found or inactive" });
      }

      req.user = user;
      req.session = session;
      return next();
    }

    if (authHeader.startsWith("ApiKey ")) {
      const key = authHeader.substring(7);
      const prefix = key.substring(0, 12);
      const apiKey = await storage.getApiKeyByPrefix(prefix);
      
      if (!apiKey) {
        await logAuthFailure(req, "Invalid API key");
        return res.status(401).json({ error: "Invalid API key" });
      }

      const isValid = await storage.verifyApiKey(key, apiKey.keyHash);
      if (!isValid) {
        await logAuthFailure(req, "API key verification failed");
        return res.status(401).json({ error: "Invalid API key" });
      }

      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        await logAuthFailure(req, "API key expired");
        return res.status(401).json({ error: "API key expired" });
      }

      const user = await storage.getUser(apiKey.userId);
      if (!user || !user.isActive) {
        await logAuthFailure(req, "User not found or inactive");
        return res.status(401).json({ error: "User not found or inactive" });
      }

      req.user = user;
      return next();
    }

    return res.status(401).json({ error: "Invalid authorization format" });
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ error: "Internal authentication error" });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  return authenticate(req, res, next);
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
}

export async function rateLimit(limit: number, windowMs: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.user?.id || req.ip || "anonymous";
    const endpoint = req.path;

    try {
      const allowed = await storage.checkRateLimit(identifier, endpoint, limit, windowMs);
      
      if (!allowed) {
        await storage.createAuditLog({
          userId: req.user?.id,
          action: "rate_limit_exceeded",
          resource: "api",
          resourceId: endpoint,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          status: "blocked",
        });
        
        return res.status(429).json({ 
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      await storage.incrementRateLimit(identifier, endpoint, windowMs);
      return next();
    } catch (error) {
      console.error("Rate limit error:", error);
      return next();
    }
  };
}

async function logAuthFailure(req: Request, reason: string) {
  try {
    await storage.createAuditLog({
      action: "auth_failure",
      resource: "authentication",
      details: { reason, path: req.path, method: req.method },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status: "failed",
      errorMessage: reason,
    });
  } catch (error) {
    console.error("Failed to log auth failure:", error);
  }
}

export async function logAction(
  req: Request,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  status: "success" | "failed" = "success",
  errorMessage?: string
) {
  try {
    await storage.createAuditLog({
      userId: req.user?.id,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      status,
      errorMessage,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
