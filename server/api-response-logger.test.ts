import express from "express";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiResponseLogger } from "./api-response-logger";
import { requestDiagnostics, requestErrorHandler } from "./http-diagnostics";

const filename = "SYNTHETIC_PRIVATE_FILENAME.pdf";
const address = "wnsp://SYNTHETIC_PRIVATE_WAVE/recipient";
const content = "SYNTHETIC_PRIVATE_FILE_BYTES";
const privateId = "SYNTHETIC_PRIVATE_ID";
const metadata = {
  files: [{ id: privateId, name: filename, folder: "SYNTHETIC_PRIVATE_FOLDER", ownerAddress: address }],
  grants: [{ address }], recipients: [{ address, name: filename }], content,
};
const levels = ["log", "info", "warn", "error", "debug"] as const;
const servers: Server[] = [];

beforeEach(() => {
  for (const level of levels) vi.spyOn(console, level).mockImplementation(() => {});
});
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  vi.restoreAllMocks();
});

function allLogs() {
  return JSON.stringify(levels.flatMap(level => vi.mocked(console[level]).mock.calls));
}
function diagnostics() {
  return vi.mocked(console.info).mock.calls.map(([line]) => JSON.parse(String(line)));
}
async function listen(app: express.Express) {
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
function fixture(status = 200, thrown = false) {
  const app = express();
  app.use(requestDiagnostics);
  app.use(createApiResponseLogger(line => console.log(line)));
  app.use(express.json());
  app.use((req, res, next) => {
    if (thrown) return next(Object.assign(new Error(JSON.stringify(metadata)), { status }));
    if (req.path.endsWith("/content") && req.method === "GET") {
      res.set("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(status).send(Buffer.from(content));
    }
    res.status(status).json(status >= 400 ? { error: JSON.stringify(metadata) } : metadata);
  });
  app.use(requestErrorHandler);
  return app;
}
function expectPrivateStatus(response: Response, method: string, status: number) {
  const requestId = response.headers.get("x-request-id");
  expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(diagnostics()).toEqual([expect.objectContaining({
    event: "http_response", requestId, method, status, path: expect.stringMatching(/^(\/api\/\*|\/other)$/), outcome: "finished",
    durationMs: expect.any(Number),
  })]);
  expect(diagnostics()[0].durationMs).toBeGreaterThanOrEqual(0);
  expect(allLogs()).not.toContain("SYNTHETIC_PRIVATE");
  expect(allLogs()).not.toContain("wnsp://");
  expect(console.log).not.toHaveBeenCalled();
}

describe("private live broadcast logging", () => {
  it.each([
    "/api/p2p/live",
    `/api/p2p/live/${privateId}/guests`,
    `/api/p2p/live/${privateId}/guests/${address}`,
    "/API/P2P/LIVE/",
    "/api/streams/my",
    `/api/streams/${privateId}`,
    `/api/streams/${privateId}/join`,
  ])("omits recipient identities and private room metadata at %s", async path => {
    const response = await fetch(`${await listen(fixture())}${path}`);
    expect(response.status).toBe(200);
    expectPrivateStatus(response, "GET", 200);
  });
});

describe("private file API response logging", () => {
  it("wires the tested logger after the always-on structured diagnostics", () => {
    const source = readFileSync("server/index.ts", "utf8");
    expect(source).toContain('import { createApiResponseLogger } from "./api-response-logger"');
    expect(source).toContain("app.use(createApiResponseLogger(log))");
    expect(source.indexOf("app.use(requestDiagnostics)")).toBeLessThan(source.indexOf("app.use(createApiResponseLogger(log))"));
    expect(source).not.toContain("capturedJsonResponse");
  });

  it.each([
    ["GET", "/api/wave-vault"],
    ["GET", "/api/wave-vault/"],
    ["POST", "/api/wave-vault"],
    ["PATCH", `/api/wave-vault/${privateId}`],
    ["DELETE", `/api/wave-vault/${privateId}`],
    ["GET", `/api/wave-vault/${privateId}/grants`],
    ["POST", `/api/wave-vault/${privateId}/grants`],
    ["DELETE", `/api/wave-vault/${privateId}/grants/${privateId}`],
    ["GET", "/api/directory/recipients"],
    ["GET", "/api/directory/recipients/"],
    ["GET", `/api/directory/recipients/${privateId}`],
    ["GET", `/API/WAVE-VAULT/${privateId}/grants`],
    ["GET", "/API/DIRECTORY/RECIPIENTS"],
  ])("keeps %s %s metadata out of every console level", async (method, path) => {
    const base = await listen(fixture());
    const response = await fetch(`${base}${path}?q=${encodeURIComponent(address)}&name=${filename}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Request-ID": filename },
      ...(["POST", "PATCH"].includes(method) ? { body: JSON.stringify(metadata) } : {}),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(metadata);
    expectPrivateStatus(response, method, 200);
  });

  it.each(["GET", "PUT"])("never logs %s file bytes, metadata headers or request content", async method => {
    const response = await fetch(`${await listen(fixture())}/api/wave-vault/${privateId}/content`, {
      method,
      ...(method === "PUT" ? { headers: { "Content-Type": "application/octet-stream" }, body: content } : {}),
    });
    expect(await response.text()).toContain(content);
    expectPrivateStatus(response, method, 200);
  });

  it.each([400, 401, 403, 404, 409, 413, 429, 500, 503])("retains HTTP %i without logging private error bodies", async status => {
    const base = await listen(fixture(status));
    for (const path of ["/api/wave-vault", "/api/directory/recipients"]) {
      vi.clearAllMocks();
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(status);
      expect(await response.text()).toContain(filename);
      expectPrivateStatus(response, "GET", status);
    }
  });

  it.each(["/api/wave-vault", "/api/directory/recipients"])("retains correlated server-error diagnostics for %s", async path => {
    const response = await fetch(`${await listen(fixture(503, true))}${path}`);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain(filename);
    expectPrivateStatus(response, "GET", 503);
    expect(JSON.parse(String(vi.mocked(console.error).mock.calls[0][0]))).toEqual({
      event: "http_error", requestId: response.headers.get("x-request-id"), status: 503,
      stage: "request", errorCategory: "unclassified",
    });
  });

  it("does not leak malformed JSON echoed by an error handler", async () => {
    const response = await fetch(`${await listen(fixture())}/api/wave-vault`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: `{"name":"${filename}","address":"${address}","content":"${content}",bad`,
    });
    expect(response.status).toBe(400);
    await response.text();
    expectPrivateStatus(response, "POST", 400);
  });

  it("retains diagnostics for guard/parser failures before legacy logging is reached", async () => {
    const app = express();
    app.use(requestDiagnostics);
    app.use((_req, res) => { res.status(401).json(metadata); });
    app.use(createApiResponseLogger(line => console.log(line)));
    const response = await fetch(`${await listen(app)}/api/wave-vault/${privateId}`);
    await response.text();
    expectPrivateStatus(response, "GET", 401);
  });

  it.each(["/api/auth/login", "/api/messages/inbox", "/api/nostr/bot-session", "/api/private-trusts/record"])(
    "preserves existing body redaction for %s", async path => {
      const response = await fetch(`${await listen(fixture())}${path}`);
      await response.text();
      expect(allLogs()).not.toContain("SYNTHETIC_PRIVATE");
    },
  );

  it.each(["/api/public-status", "/api/wave-vault-public", "/api/directory/recipients-public"])(
    "preserves unrelated API response logging for %s", async path => {
      const app = express();
      app.use(requestDiagnostics);
      app.use(createApiResponseLogger(line => console.log(line)));
      app.get(path, (_req, res) => res.status(503).json({ error: "Public service unavailable" }));
      const response = await fetch(`${await listen(app)}${path}`);
      await response.text();
      expect(response.status).toBe(503);
      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(
        new RegExp(`^GET ${path} 503 in \\d+ms :: \\{"error":"Public service unavailable"\\}$`),
      ));
    },
  );
});
