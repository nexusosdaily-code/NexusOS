import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import { WebSocket, WebSocketServer } from "ws";
import ts from "typescript";
import { SessionSockets, SocketPeers, boundedSocketLookup } from "./session-sockets";
import { browserSocketToken, browserSessionRequestGuard } from "./browser-session-policy";
import { notifySessionRevoked } from "./session-lifecycle";
import { canViewStream, watchPrivateStream, revokeStreamGuest } from "./p2p-stream-access";

const fixture = vi.hoisted(() => ({
  sessions: new Map<string, any>(),
  active: true,
  streamPublic: true,
  guests: new Set<string>(),
  viewerRows: new Set<string>(),
  getSessionByToken: vi.fn(), getActiveSocketSessions: vi.fn(),
  deleteSession: vi.fn(), getUser: vi.fn(), createAuditLog: vi.fn(),
  getStream: vi.fn(), addStreamViewer: vi.fn(), removeStreamViewer: vi.fn(),
  getCall: vi.fn(), updateCallStatus: vi.fn(),
}));
vi.mock("./db", () => ({ pool: { query: async (sql: string, params: unknown[]) => {
  if (sql.includes("SELECT 1 FROM p2p_stream_guests")) return {rows:fixture.guests.has(String(params[1]))?[{allowed:1}]:[]};
  throw new Error("Unexpected DB query forbidden in socket fixture");
} } }));
vi.mock("./storage", () => ({ storage: fixture }));
import { authenticate, logoutSessionHandler } from "./auth";

// Run the actual two route blocks with real local ws sockets, while excluding
// unrelated route registration, startup agents, DB imports and financial APIs.
function wireActualRoutes(server: Server, registry: SessionSockets, peers: SocketPeers<{ ws: WebSocket }>) {
  const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  const start = source.indexOf("  const wss = new WebSocketServer");
  const end = source.indexOf("  // AUTHENTICATION ROUTES", start);
  if (start < 0 || end < 0) throw new Error("Socket route fixture extraction failed");
  const js = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(
    "httpServer", "storage", "socketSessions", "connectedClients", "WebSocketServer", "WebSocket",
    "browserSocketToken", "boundedSocketLookup", "SocketPeers", "canViewStream", "watchPrivateStream",
    `${js}; return {wss, streamingWss, streamClients};`,
  )(server, fixture, registry, peers, WebSocketServer, WebSocket, browserSocketToken, boundedSocketLookup, SocketPeers, canViewStream, watchPrivateStream);
}

let server: Server, registry: SessionSockets, peers: SocketPeers<{ ws: WebSocket }>;
let wired: ReturnType<typeof wireActualRoutes>;
let origin: string;
let clients: WebSocket[];
const inbox = new Map<WebSocket, any[]>();
function makeSession(id: string, userId: string, ttl = 60_000) {
  const row = { id, userId, token: `synthetic-${id}`, expiresAt: new Date(Date.now() + ttl) };
  fixture.sessions.set(row.token, row);
  return row;
}
async function until(check: () => boolean, message = "socket condition") {
  const deadline = Date.now() + 3_000;
  while (!check()) {
    if (Date.now() >= deadline) throw new Error(`Timed out: ${message}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}
async function connect(path: string, session: ReturnType<typeof makeSession>, waitReady = true) {
  const client = new WebSocket(origin.replace("http:", "ws:") + path, {
    headers: { Origin: origin, Cookie: `auth_token=${session.token}` },
  });
  clients.push(client);
  inbox.set(client, []);
  client.on("message", raw => inbox.get(client)!.push(JSON.parse(raw.toString())));
  await new Promise<void>((resolve, reject) => { client.once("open", resolve); client.once("error", reject); });
  if (waitReady) {
    if (path.startsWith("/ws/streaming")) await until(() => inbox.get(client)!.some(m => m.type === "viewer-count"));
    else await until(() => peers.has(session.userId));
  }
  return client;
}

beforeEach(async () => {
  vi.clearAllMocks();
  fixture.sessions.clear(); fixture.viewerRows.clear(); fixture.active = true;
  fixture.streamPublic=true; fixture.guests.clear();
  fixture.getSessionByToken.mockImplementation(async token => {
    const row = fixture.sessions.get(token);
    return row && row.expiresAt.getTime() > Date.now() ? row : undefined;
  });
  fixture.getActiveSocketSessions.mockImplementation(async ids =>
    fixture.active ? [...fixture.sessions.values()]
      .filter(row => ids.includes(row.id) && row.expiresAt.getTime() > Date.now())
      .map(({ id, userId, expiresAt }) => ({ id, userId, expiresAt })) : [],
  );
  fixture.deleteSession.mockImplementation(async id => {
    for (const [token, row] of fixture.sessions) if (row.id === id) fixture.sessions.delete(token);
  });
  fixture.getUser.mockImplementation(async id => ({ id, username: `Test-${id}`, isActive: fixture.active, role: "user" }));
  fixture.createAuditLog.mockResolvedValue(undefined);
  fixture.getStream.mockImplementation(async()=>({ id: "stream", broadcasterId: "owner",isPublic:fixture.streamPublic }));
  fixture.addStreamViewer.mockImplementation(async (_stream, user) => { fixture.viewerRows.add(user); });
  fixture.removeStreamViewer.mockImplementation(async (_stream, user) => { fixture.viewerRows.delete(user); });
  clients = []; inbox.clear();
  const app = express();
  app.use(cookieParser(), browserSessionRequestGuard);
  app.post("/api/auth/logout", authenticate, logoutSessionHandler);
  server = createServer(app);
  registry = new SessionSockets(ids => fixture.getActiveSocketSessions(ids));
  peers = new SocketPeers();
  wired = wireActualRoutes(server, registry, peers);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Local socket fixture unavailable");
  origin = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  registry.dispose();
  for (const client of clients) client.terminate();
  for (const ws of [...wired.wss.clients, ...wired.streamingWss.clients]) ws.terminate();
  await Promise.all([
    new Promise<void>(resolve => wired.wss.close(() => resolve())),
    new Promise<void>(resolve => wired.streamingWss.close(() => resolve())),
  ]);
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("actual signaling and streaming session lifecycle", () => {
  it("rejects uninvited private viewers and closes an invited viewer when the guest grant is revoked", async () => {
    fixture.streamPublic = false;
    const outsider = await connect("/ws/streaming?streamId=stream&role=viewer",makeSession("private-outsider","outsider"),false);
    await until(()=>outsider.readyState===WebSocket.CLOSED);
    expect(fixture.viewerRows.has("outsider")).toBe(false);
    fixture.guests.add("friend");
    const allowed=await connect("/ws/streaming?streamId=stream&role=viewer",makeSession("private-friend","friend"));
    expect(fixture.viewerRows.has("friend")).toBe(true);
    fixture.guests.delete("friend");
    revokeStreamGuest("stream","friend");
    await until(()=>allowed.readyState===WebSocket.CLOSED && !fixture.viewerRows.has("friend"));
  });
  it("HTTP logout closes both channels of its session, preserves another session and notifies the broadcaster", async () => {
    const owner = await connect("/ws/streaming?streamId=stream&role=broadcaster", makeSession("owner", "owner"));
    const a = makeSession("a", "viewer"), b = makeSession("b", "viewer");
    const oldSignaling = await connect("/ws/signaling", a);
    const currentSignaling = await connect("/ws/signaling", b);
    await until(() => fixture.getActiveSocketSessions.mock.calls.length >= 3);
    const viewer = await connect("/ws/streaming?streamId=stream&role=viewer", a);
    const response = await fetch(origin + "/api/auth/logout", {
      method: "POST", headers: { Cookie: `auth_token=${a.token}`, Origin: origin },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("auth_token=;");
    await until(() => oldSignaling.readyState === WebSocket.CLOSED && viewer.readyState === WebSocket.CLOSED);
    expect(currentSignaling.readyState).toBe(WebSocket.OPEN);
    expect(peers.get("viewer")?.ws.readyState).toBe(WebSocket.OPEN);
    await until(() => inbox.get(owner)!.some(m => m.type === "viewer-left" && m.viewerCount === 0));
    expect(fixture.viewerRows.has("viewer")).toBe(false);
    expect(fixture.removeStreamViewer).toHaveBeenCalledTimes(1);
  });

  it("does not remove the older same-user connection when the newest is revoked", async () => {
    const a = makeSession("a", "caller"), b = makeSession("b", "caller");
    const old = await connect("/ws/signaling", a);
    const newest = await connect("/ws/signaling", b);
    const recipient = await connect("/ws/signaling", makeSession("target", "target"));
    fixture.sessions.delete(b.token); notifySessionRevoked(b.id);
    await until(() => newest.readyState === WebSocket.CLOSED);
    old.send(JSON.stringify({ type: "offer", targetUserId: "target", payload: "surviving-session" }));
    await until(() => inbox.get(recipient)!.some(m => m.payload === "surviving-session"));
    expect(peers.get("caller")?.ws.readyState).toBe(WebSocket.OPEN);
  });

  it("only ends the stream after the broadcaster's last independent session disconnects", async () => {
    const a = makeSession("owner-a", "owner"), b = makeSession("owner-b", "owner");
    const first = await connect("/ws/streaming?streamId=stream&role=broadcaster", a);
    const second = await connect("/ws/streaming?streamId=stream&role=broadcaster", b);
    const viewer = await connect("/ws/streaming?streamId=stream&role=viewer", makeSession("viewer", "viewer"));
    fixture.sessions.delete(b.token); notifySessionRevoked(b.id);
    await until(() => second.readyState === WebSocket.CLOSED);
    expect(first.readyState).toBe(WebSocket.OPEN);
    expect(wired.streamClients.has("stream")).toBe(true);
    expect(inbox.get(viewer)!.filter(m => m.type === "stream-ended")).toHaveLength(0);
    fixture.sessions.delete(a.token); notifySessionRevoked(a.id);
    await until(() => inbox.get(viewer)!.some(m => m.type === "stream-ended"));
    expect(inbox.get(viewer)!.filter(m => m.type === "stream-ended")).toHaveLength(1);
    expect(wired.streamClients.has("stream")).toBe(false);
  });

  it("shares a viewer registration across independent sessions and only removes the final one", async () => {
    const owner = await connect("/ws/streaming?streamId=stream&role=broadcaster", makeSession("owner", "owner"));
    const a = makeSession("a", "viewer"), b = makeSession("b", "viewer");
    const first = await connect("/ws/streaming?streamId=stream&role=viewer", a);
    const second = await connect("/ws/streaming?streamId=stream&role=viewer", b);
    expect(fixture.addStreamViewer).toHaveBeenCalledTimes(1);
    fixture.sessions.delete(a.token); notifySessionRevoked(a.id);
    await until(() => first.readyState === WebSocket.CLOSED);
    expect(second.readyState).toBe(WebSocket.OPEN);
    expect(fixture.removeStreamViewer).not.toHaveBeenCalled();
    expect(inbox.get(owner)!.filter(m => m.type === "viewer-left")).toHaveLength(0);
    fixture.sessions.delete(b.token); notifySessionRevoked(b.id);
    await until(() => second.readyState === WebSocket.CLOSED);
    await until(() => inbox.get(owner)!.some(m => m.type === "viewer-left" && m.viewerCount === 0));
    expect(fixture.removeStreamViewer).toHaveBeenCalledTimes(1);
  });

  it("rejects incoming traffic after an out-of-process revocation, without forwarding it", async () => {
    const a = makeSession("a", "caller");
    const source = await connect("/ws/signaling", a);
    const recipient = await connect("/ws/signaling", makeSession("b", "recipient"));
    fixture.sessions.delete(a.token); // No in-process revocation notification.
    source.send(JSON.stringify({ type: "offer", targetUserId: "recipient", payload: "forbidden" }));
    await until(() => source.readyState === WebSocket.CLOSED);
    expect(inbox.get(recipient)!).toHaveLength(0);
  });

  it("rejects unsolicited delivery to a revoked target before the next poll", async () => {
    const targetSession = makeSession("a", "recipient");
    const client = await connect("/ws/signaling", targetSession);
    fixture.sessions.delete(targetSession.token);
    registry.send(peers.get("recipient")!.ws, JSON.stringify({ type: "private" }));
    await until(() => client.readyState === WebSocket.CLOSED);
    expect(inbox.get(client)!).toHaveLength(0);
  });

  it("cleans up an expiry during an in-flight viewer registration after that insert completes", async () => {
    await connect("/ws/streaming?streamId=stream&role=broadcaster", makeSession("owner", "owner"));
    let release!: () => void;
    fixture.addStreamViewer.mockImplementationOnce((_stream, user) => new Promise<void>(resolve => {
      release = () => { fixture.viewerRows.add(user); resolve(); };
    }));
    const a = makeSession("viewer", "viewer");
    const viewer = await connect("/ws/streaming?streamId=stream&role=viewer", a, false);
    await until(() => fixture.addStreamViewer.mock.calls.length === 1);
    fixture.sessions.delete(a.token); notifySessionRevoked(a.id);
    await until(() => viewer.readyState === WebSocket.CLOSED);
    release();
    await until(() => fixture.removeStreamViewer.mock.calls.length === 1);
    expect(fixture.viewerRows.has("viewer")).toBe(false);
  });

  it("fails closed if the session store fails after connection", async () => {
    const client = await connect("/ws/signaling", makeSession("a", "caller"));
    fixture.getActiveSocketSessions.mockRejectedValueOnce(new Error("synthetic-store-unavailable"));
    client.send(JSON.stringify({ type: "call-end", callId: "must-not-mutate" }));
    await until(() => client.readyState === WebSocket.CLOSED);
    expect(fixture.updateCallStatus).not.toHaveBeenCalled();
  });

  it("closes idle signaling and streaming sockets at session expiry and removes the viewer", async () => {
    const owner = await connect("/ws/streaming?streamId=stream&role=broadcaster", makeSession("owner", "owner"));
    const a = makeSession("short", "viewer", 300);
    const signaling = await connect("/ws/signaling", a);
    const streaming = await connect("/ws/streaming?streamId=stream&role=viewer", a);
    await until(() => signaling.readyState === WebSocket.CLOSED && streaming.readyState === WebSocket.CLOSED);
    await until(() => inbox.get(owner)!.some(m => m.type === "viewer-left"));
    expect(fixture.viewerRows.has("viewer")).toBe(false);
  });

  it("delivers an explicit stream-ended message before closing and cleaning up viewers", async () => {
    const owner = await connect("/ws/streaming?streamId=stream&role=broadcaster", makeSession("owner", "owner"));
    const viewer = await connect("/ws/streaming?streamId=stream&role=viewer", makeSession("viewer", "viewer"));
    owner.send(JSON.stringify({ type: "stream-ended", streamId: "stream" }));
    await until(() => viewer.readyState === WebSocket.CLOSED);
    await until(() => !fixture.viewerRows.has("viewer"));
    expect(inbox.get(viewer)!.filter(m => m.type === "stream-ended")).toHaveLength(1);
  });

  it("rejects traffic when the account becomes inactive", async () => {
    const client = await connect("/ws/signaling", makeSession("a", "caller"));
    fixture.active = false;
    client.send(JSON.stringify({ type: "call-accept", callId: "must-not-mutate" }));
    await until(() => client.readyState === WebSocket.CLOSED);
    expect(fixture.updateCallStatus).not.toHaveBeenCalled();
  });

  it("handles a handshake store failure without registering a live peer", async () => {
    fixture.getSessionByToken.mockRejectedValueOnce(new Error("synthetic-store-unavailable"));
    const client = await connect("/ws/signaling", makeSession("a", "caller"), false);
    await until(() => client.readyState === WebSocket.CLOSED);
    expect(peers.size).toBe(0);
  });

  it("keeps route notifications behind session validation rather than raw socket sends", () => {
    const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\b(?:ws|targetWs|recipientWs|requesterWs|senderWs|receiverWs|client\.ws|viewer\.ws)\.send\s*\(/);
  });
});
