import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import { request, type Server } from "node:http";
import fs from "fs";
import { join } from "node:path";
import { requestDiagnostics, requestErrorHandler, forwardAsyncErrors } from "./http-diagnostics";
import { serveStatic } from "./static";
import * as seoMeta from "./seo-meta";

vi.mock("./storage", () => ({ storage: {} }));

const servers: Server[] = [];
const fixtureHtml = "<!doctype html><html><head><title>Fixture</title></head><body>Public page</body></html>";

async function listen(app: Express): Promise<number> {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return (server.address() as { port: number }).port;
}

function probe(port: number, path = "/", headers = {}): Promise<{
  status: number; body: string; requestId: string | undefined;
}> {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({
        status: res.statusCode!, body, requestId: res.headers["x-request-id"] as string,
      }));
    });
    req.on("error", reject);
    req.setTimeout(2000, () => req.destroy(new Error("Test response timed out")));
    req.end();
  });
}

function records() {
  return vi.mocked(console.info).mock.calls.map(([value]) => JSON.parse(String(value)));
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()));
  }
  vi.restoreAllMocks();
});

function staticApp(fail: boolean | Error = false) {
  const distPath = join(__dirname, "public");
  const exists = fs.existsSync.bind(fs);
  const read = fs.readFileSync.bind(fs);
  vi.spyOn(fs, "existsSync").mockImplementation((file) =>
    String(file) === distPath || exists(file));
  vi.spyOn(fs, "readFileSync").mockImplementation(((file: fs.PathOrFileDescriptor, options: unknown) => {
    if (String(file) === join(distPath, "index.html")) {
      if (fail) throw fail instanceof Error ? fail : new Error("PRIVATE_ERROR_PAYLOAD");
      return fixtureHtml;
    }
    return read(file, options as never);
  }) as typeof fs.readFileSync);
  const app = express();
  app.use(requestDiagnostics);
  serveStatic(app);
  app.use(requestErrorHandler);
  return app;
}

describe("privacy-safe HTTP diagnostics and fallback error handling", () => {
  it("records the actual root SPA response once, correlated with its generated request ID", async () => {
    const result = await probe(await listen(staticApp()), "/?token=PRIVATE_QUERY", {
      "X-Request-ID": "PRIVATE_UNTRUSTED_ID",
      Cookie: "session=PRIVATE_COOKIE",
      Authorization: "Bearer PRIVATE_AUTH",
    });
    expect(result.status).toBe(200);
    expect(result.body).toContain("Public page");
    expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(records()).toHaveLength(1);
    expect(records()[0]).toMatchObject({
      event: "http_response", path: "/", method: "GET",
      requestId: result.requestId, status: 200, outcome: "finished",
    });
    expect(records()[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("PRIVATE");
  });

  it("forwards a real SPA template failure to the final error handler instead of hanging", async () => {
    const result = await probe(await listen(staticApp(true)));
    expect(result.status).toBe(500);
    expect(result.body).toBe('{"message":"Internal Server Error"}');
    expect(records()).toHaveLength(1);
    expect(records()[0]).toMatchObject({
      requestId: result.requestId, path: "/", status: 500, outcome: "finished",
    });
    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[0][0]))).toEqual({
      event: "http_error", requestId: result.requestId, status: 500,
      stage: "spa_template_read", errorCategory: "unclassified",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE_ERROR_PAYLOAD");
  });

  it("categorizes filesystem failures without exposing the path or error code", async () => {
    const error = Object.assign(new Error("PRIVATE_FILE_PATH"), { code: "ENOENT", path: "PRIVATE_PATH" });
    const result = await probe(await listen(staticApp(error)));
    expect(result.status).toBe(500);
    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[0][0]))).toMatchObject({
      stage: "spa_template_read", errorCategory: "filesystem", requestId: result.requestId,
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/PRIVATE|ENOENT/);
  });

  it("distinguishes metadata failure from reading the SPA template", async () => {
    vi.spyOn(seoMeta, "injectMeta").mockImplementation(() => {
      throw new TypeError("PRIVATE_METADATA");
    });
    const result = await probe(await listen(staticApp()));
    expect(result.status).toBe(500);
    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[0][0]))).toMatchObject({
      stage: "spa_metadata", errorCategory: "type_error",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE_METADATA");
  });

  it("does not log arbitrary error codes or names as categories", async () => {
    const app = express();
    app.use(requestDiagnostics);
    app.get("/", forwardAsyncErrors(() => {
      throw { name: "PRIVATE_NAME", code: "PRIVATE_CODE", message: "PRIVATE_MESSAGE" };
    }));
    app.use(requestErrorHandler);
    expect((await probe(await listen(app))).status).toBe(500);
    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[0][0]))).toMatchObject({
      stage: "request", errorCategory: "unclassified",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE");
  });

  it("records guard responses before routing and redacts dynamic path segments", async () => {
    const app = express();
    app.use(requestDiagnostics);
    app.use((_req, res) => { res.status(403).end(); });
    const result = await probe(await listen(app), "/api/wallet/PRIVATE_WALLET?key=PRIVATE_KEY");
    expect(result.status).toBe(403);
    expect(records()[0]).toMatchObject({ status: 403, path: "/api/*", outcome: "finished" });
    expect(JSON.stringify(records())).not.toContain("PRIVATE");
  });

  it("records an interrupted response once without misreporting it as HTTP 200", async () => {
    const app = express();
    app.use(requestDiagnostics);
    app.get("/", (_req, res) => { res.write("partial"); });
    const port = await listen(app);
    await new Promise<void>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port }, (res) => {
        res.once("data", () => { res.destroy(); resolve(); });
      });
      req.on("error", reject);
      req.end();
    });
    await vi.waitFor(() => expect(records()).toHaveLength(1));
    expect(records()[0]).toMatchObject({ status: null, outcome: "aborted", path: "/" });
  });

  it("preserves private-workspace failure redaction and status", async () => {
    const app = express();
    app.use(requestDiagnostics);
    app.use(forwardAsyncErrors(async () => { throw new Error("PRIVATE_WORKSPACE_DATA"); }));
    app.use(requestErrorHandler);
    const result = await probe(await listen(app), "/api/private-trusts/PRIVATE_ID");
    expect(result.status).toBe(503);
    expect(result.body).toBe('{"message":"Private workspace request unavailable"}');
    expect(JSON.stringify([records(), vi.mocked(console.error).mock.calls, result.body]))
      .not.toContain("PRIVATE_");
  });

  it("preserves API client-error messages while containing invalid status codes", async () => {
    const app = express();
    app.use(requestDiagnostics);
    app.get("/api/client-error", forwardAsyncErrors(() => {
      throw Object.assign(new Error("Invalid input"), { status: 422 });
    }));
    app.get("/", forwardAsyncErrors(() => {
      throw Object.assign(new Error("PRIVATE_INTERNAL_ERROR"), { status: 700 });
    }));
    app.use(requestErrorHandler);
    const port = await listen(app);
    expect(await probe(port, "/api/client-error")).toMatchObject({
      status: 422, body: '{"message":"Invalid input"}',
    });
    expect(await probe(port)).toMatchObject({
      status: 500, body: '{"message":"Internal Server Error"}',
    });
  });
});
