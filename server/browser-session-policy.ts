import type { IncomingMessage } from "node:http";
import type { Request, Response, NextFunction } from "express";

/** Exact request origin, including port. Do not trust arbitrary forwarded hosts. */
export function isSameOriginBrowserRequest(req: IncomingMessage): boolean {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (!origin) return req.headers["sec-fetch-site"] !== "same-site";
  try {
    const parsed = new URL(origin);
    return ["https:", "http:"].includes(parsed.protocol) &&
      (process.env.NODE_ENV !== "production" || parsed.protocol === "https:") &&
      parsed.origin === origin && parsed.host === req.headers.host;
  } catch {
    return false;
  }
}

/** WebSockets must prove browser origin; cookies are never accepted cross-origin. */
export function browserSocketToken(req: IncomingMessage): string | undefined {
  if (!req.headers.origin || !isSameOriginBrowserRequest(req)) return undefined;
  try {
    const matches = (req.headers.cookie ?? "").split(";")
      .map(part => part.trim()).filter(part => part.startsWith("auth_token="));
    if (matches.length !== 1) return undefined;
    return decodeURIComponent(matches[0].slice("auth_token=".length)) || undefined;
  } catch {
    return undefined;
  }
}

/** Protect cookie-authenticated mutations and login against cross-site requests. */
export function browserSessionRequestGuard(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/api/auth/")) res.setHeader("Cache-Control", "no-store");
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookie = req.cookies?.auth_token;
  const login = req.path.startsWith("/api/auth/");
  if ((cookie || login) && !isSameOriginBrowserRequest(req)) {
    return res.status(403).json({ error: "Cross-site session requests are not allowed" });
  }
  next();
}
