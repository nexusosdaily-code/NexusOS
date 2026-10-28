import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";

// Deliberately low-cardinality: URL segments can contain wallet addresses,
// private workspace IDs or credentials. Never log raw URLs or query strings.
function diagnosticPath(url: string): string {
  const pathname = url.split("?")[0];
  if (pathname === "/") return "/";
  if (pathname === "/health" || pathname === "/__ready") return "/health";
  if (pathname === "/api" || pathname.startsWith("/api/")) return "/api/*";
  if (pathname.startsWith("/assets/")) return "/assets/*";
  return "/other";
}

export const requestDiagnostics: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const started = performance.now();
  const path = diagnosticPath(req.originalUrl);
  const method = /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(req.method)
    ? req.method : "OTHER";
  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  let recorded = false;
  function record(outcome: "finished" | "aborted") {
    if (recorded) return;
    recorded = true;
    console.info(JSON.stringify({
      event: "http_response",
      requestId,
      method,
      path,
      status: outcome === "finished" ? res.statusCode : null,
      durationMs: Math.round(performance.now() - started),
      outcome,
    }));
  }
  res.once("finish", () => record("finished"));
  res.once("close", () => record(res.writableFinished ? "finished" : "aborted"));
  next();
};

// Express 4 does not forward rejected async-handler promises automatically.
export function forwardAsyncErrors(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

// Register after BOTH API routes and the static/SPA fallback.
export const requestErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const privateWorkspace = req.originalUrl.startsWith("/api/private-trusts");
  const candidate = Number(err?.status || err?.statusCode || 500);
  const status = privateWorkspace ? 503
    : Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
      ? candidate : 500;
  if (status >= 500) {
    // Error messages/stacks can contain credentials or private request content.
    // Only fixed categories are permitted; never log arbitrary error names/codes.
    const stage = ["static_delivery", "spa_routing", "spa_template_read", "spa_metadata", "spa_send"]
      .includes(res.locals.errorStage) ? res.locals.errorStage : "request";
    const errorCategory = ["ENOENT", "EACCES", "EIO", "EMFILE", "ENFILE"]
      .includes(err?.code) ? "filesystem"
      : err instanceof TypeError ? "type_error"
      : err instanceof RangeError ? "range_error" : "unclassified";
    console.error(JSON.stringify({
      event: "http_error",
      requestId: res.locals.requestId,
      status,
      stage,
      errorCategory,
    }));
  }
  if (res.headersSent) return next(err);
  const message = privateWorkspace ? "Private workspace request unavailable"
    : req.originalUrl.startsWith("/api/") ? err?.message || "Internal Server Error"
      : status >= 500 ? "Internal Server Error" : err?.message || "Request failed";
  res.status(status).json({ message });
};
