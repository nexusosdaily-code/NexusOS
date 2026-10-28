import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { SessionSockets } from "./session-sockets";
const fixture = vi.hoisted(() => ({ preferences: new Map<string, boolean>(), query: vi.fn() }));
vi.mock("./db", () => ({ pool: { query: fixture.query } }));
vi.mock("./storage", () => ({ storage: { getSessionByToken: async () => undefined } }));
vi.mock("./auth", () => ({
  authenticate(req: any, _res: any, next: () => void) { req.user = { id: req.headers["x-fixture-user"] ?? "a" }; next(); },
}));
vi.mock("./wnsp-address-resolution", () => ({
  walletWaveForUser: async (_pool: unknown, id: string) => `wnsp://Ψ(12,3,H)/${id}`,
  resolveWalletWave: async () => { throw new Error("Unexpected routing in preference test"); },
}));
import { registerP2PFileRoutes } from "./p2p-file-routes";
let server: Server, registry: SessionSockets, origin: string;
beforeEach(async () => {
  fixture.preferences.clear(); fixture.query.mockReset();
  fixture.query.mockImplementation(async (sql: string, params: any[]) => {
    if (sql.startsWith("SELECT p2p_broadcast_muted")) {
      return { rows: [{ p2p_broadcast_muted: fixture.preferences.get(params[0]) ?? false }] };
    }
    if (sql.startsWith("UPDATE users SET p2p_broadcast_muted")) {
      fixture.preferences.set(params[0], params[1]); return { rows: [{ id: params[0] }] };
    }
    throw new Error("Unexpected query");
  });
  const app = express(); app.use(express.json());
  server = createServer(app); registry = new SessionSockets(async () => []);
  registerP2PFileRoutes(app, server, registry);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => { registry.dispose(); await new Promise<void>(resolve => server.close(() => resolve())); });
it("persists mute to the authenticated account, ignores body account selection, and supports unmute", async () => {
  const save = (body: unknown) => fetch(origin + "/api/p2p/files/settings", {
    method: "PUT", headers: { "Content-Type": "application/json", "x-fixture-user": "a" }, body: JSON.stringify(body),
  });
  expect((await save({ muted: true, userId: "b" })).status).toBe(400);
  expect((await save({ muted: true })).status).toBe(200);
  expect(fixture.preferences.get("a")).toBe(true); expect(fixture.preferences.has("b")).toBe(false);
  const read = await fetch(origin + "/api/p2p/files/settings");
  expect(await read.json()).toEqual({ address: "wnsp://Ψ(12,3,H)/a", muted: true });
  expect(read.headers.get("cache-control")).toBe("no-store");
  expect((await save({ muted: false })).status).toBe(200);
  expect(fixture.preferences.get("a")).toBe(false);
});
it("rejects invalid settings and reports persistence failures without claiming a save", async () => {
  const response = await fetch(origin + "/api/p2p/files/settings", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ muted: "false" }),
  });
  expect(response.status).toBe(400); expect(fixture.query).not.toHaveBeenCalled();
  fixture.query.mockRejectedValueOnce(new Error("private-driver-details"));
  const failed = await fetch(origin + "/api/p2p/files/settings", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ muted: true }),
  });
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("private-driver-details");
});
