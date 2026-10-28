import type { RequestHandler } from "express";

/** Legacy response logging; private file requests use requestDiagnostics only. */
export function createApiResponseLogger(log: (message: string) => void): RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    const path = req.path;
    // Express routing is case-insensitive by default. Cover mounted roots,
    // trailing slashes and future subroutes without capturing any private body
    // or logging dynamic path segments (file IDs, recipients, filenames).
    const privateFilePath = /^\/api\/(?:wave-vault|directory\/recipients|streams|p2p\/live)(?:\/|$)/i.test(path);
    if (privateFilePath) return next();

    if (path.startsWith("/api/private-trusts")) {
      res.on("finish", () => log(`Private trust request ${res.statusCode} in ${Date.now()-start}ms`));
      return next();
    }
    let capturedJsonResponse: Record<string, any> | undefined = undefined;
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        // Authentication responses include tokens; messaging responses include
        // private content, participants and receipts. Never log those bodies.
        if (capturedJsonResponse && !path.startsWith("/api/auth/") &&
          !path.startsWith("/api/messages/") && !path.startsWith("/api/private-trusts") &&
          path !== "/api/nostr/bot-session") {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        log(logLine);
      }
    });
    next();
  };
}
