import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { SessionSockets } from "./session-sockets";
import { registerP2PFileChannel } from "./p2p-file-channel";
import { notifySessionRevoked } from "./session-lifecycle";
import { P2P_MAX_FILE_BYTES } from "../shared/p2p-files";

let server: Server, sessions: SessionSockets, channel: ReturnType<typeof registerP2PFileChannel>;
let origin: string, clients: WebSocket[];
let preferenceRead: ((id: string) => Promise<{ address: string; muted: boolean }>) | undefined;
const records = new Map<string, { id: string; userId: string; expiresAt: Date }>();
const muted = new Map<string, boolean>();
const inbox = new Map<WebSocket, any[]>();
const addr = (id: string) => `wnsp://Ψ(12,3,H)/${id}`;
async function until(test: () => boolean) {
  const end = Date.now() + 2500;
  while (!test()) {
    if (Date.now() > end) throw new Error("P2P fixture timed out");
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}
async function peer(id: string) {
  records.set(id, { id, userId: id, expiresAt: new Date(Date.now() + 60_000) });
  const ws = new WebSocket(origin.replace("http", "ws") + "/ws/p2p-files",
    { headers: { Origin: origin, Cookie: `auth_token=${id}` } });
  clients.push(ws); inbox.set(ws, []);
  ws.on("message", raw => inbox.get(ws)!.push(JSON.parse(raw.toString())));
  await until(() => inbox.get(ws)!.some(m => m.type === "ready"));
  return ws;
}
const offer = (recipient: string | null, size = 10, name = "movie.mp4") => ({
  type: "offer", requestId: randomUUID(), recipient, file: { name, size, type: "video/mp4" },
});
const send = (ws: WebSocket, value: unknown) => ws.send(JSON.stringify(value));
const messages = (ws: WebSocket, type: string) => inbox.get(ws)!.filter(m => m.type === type);
beforeEach(async () => {
  records.clear(); muted.clear(); inbox.clear(); clients = []; preferenceRead = undefined;
  server = createServer();
  sessions = new SessionSockets(async ids => [...records.values()].filter(row => ids.includes(row.id)));
  channel = registerP2PFileChannel(server, sessions, {
    session: async token => records.get(token),
    settings: async id => preferenceRead ? preferenceRead(id) : ({ address: addr(id), muted: muted.get(id) ?? false }),
    resolve: async address => {
      const id = [...records.keys()].find(id => addr(id) === address);
      if (!id) throw new Error("Private DB exception must never leak");
      return { userId: id, address };
    },
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => {
  sessions.dispose(); channel.close();
  for (const ws of clients) ws.terminate();
  for (const ws of channel.wss.clients) ws.terminate();
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});
describe("private addressed and system-wide file offers", () => {
  it("routes only to the exact recipient and binds the sender to the session", async () => {
    const a = await peer("a"), b = await peer("b"), c = await peer("c");
    send(a, { ...offer(addr("b")), from: addr("c") });
    await until(() => messages(b, "offer").length === 1 && messages(a, "offered").length === 1);
    expect(messages(b, "offer")[0]).toMatchObject({ from: addr("a"), broadcast: false });
    expect(messages(c, "offer")).toHaveLength(0);
    expect(messages(a, "offer")).toHaveLength(0);
    expect(channel.transfers.size).toBe(1);
  });
  it("offers broadcasts to every online unmuted account, while direct delivery still works when muted", async () => {
    const a = await peer("a"), b = await peer("b"), c = await peer("c");
    muted.set("c", true);
    send(a, offer(null));
    await until(() => messages(a, "offer-result").length === 1);
    expect(messages(b, "offer")).toHaveLength(1); expect(messages(c, "offer")).toHaveLength(0);
    send(a, offer(addr("c")));
    await until(() => messages(c, "offer").length === 1);
    expect(messages(c, "offer")[0].broadcast).toBe(false);
  });
  it("rejects empty recipient addresses rather than treating them as an unmuted broadcast", async () => {
    const a = await peer("a"), b = await peer("b");
    muted.set("b", true);
    send(a, offer("   "));
    await until(() => messages(a, "error").length === 1);
    expect(messages(b, "offer")).toHaveLength(0);
    expect(channel.transfers.size).toBe(0);
  });
  it("blocks negotiation before acceptance and refuses third-party signaling", async () => {
    const a = await peer("a"), b = await peer("b"), c = await peer("c");
    send(a, offer(addr("b")));
    await until(() => messages(b, "offer").length === 1);
    const id = messages(b, "offer")[0].id;
    send(a, { type: "signal", id, signal: { type: "offer", sdp: "not-yet" } });
    await until(() => messages(a, "error").length === 1);
    expect(messages(b, "signal")).toHaveLength(0);
    send(c, { type: "accept", id });
    await until(() => messages(c, "error").length === 1);
    expect(channel.transfers.get(id)?.accepted).toBe(false);
    send(b, { type: "accept", id });
    await until(() => messages(a, "accept").length === 1);
    send(a, { type: "signal", id, signal: { type: "offer", sdp: "valid-direction" } });
    await until(() => messages(b, "signal").length === 1);
    send(b, { type: "received", id });
    await until(() => messages(a, "received").length === 1);
    expect(channel.transfers.size).toBe(0);
  });
  it("cancels pending and active broadcasts on mute, without cancelling direct transfers", async () => {
    const a = await peer("a"), b = await peer("b");
    send(a, offer(null)); send(a, offer(addr("b")));
    await until(() => messages(b, "offer").length === 2);
    const broadcast = messages(b, "offer").find(m => m.broadcast);
    send(b, { type: "accept", id: broadcast.id });
    await until(() => messages(a, "accept").length === 1);
    muted.set("b", true); channel.settingsChanged("b", true);
    await until(() => messages(b, "cancel").length === 1);
    expect(channel.transfers.size).toBe(1);
    expect([...channel.transfers.values()][0].broadcast).toBe(false);
  });
  it("requires recipient confirmation; a sender cannot confirm its own delivery", async () => {
    const a = await peer("a"), b = await peer("b");
    send(a, offer(addr("b")));
    await until(() => messages(b, "offer").length === 1);
    const id = messages(b, "offer")[0].id;
    send(b, { type: "accept", id });
    await until(() => messages(a, "accept").length === 1);
    send(a, { type: "received", id });
    await until(() => messages(a, "error").length === 1);
    expect(messages(a, "received")).toHaveLength(0);
    send(b, { type: "decline", id }); // Already accepted: use cancel, not decline.
    await until(() => messages(b, "error").length === 1);
    send(b, { type: "cancel", id });
    await until(() => messages(a, "cancel").length === 1);
  });
  it("does not equate an offline or unknown recipient with delivery and redacts lookup failures", async () => {
    const a = await peer("a");
    records.set("offline", { id: "offline", userId: "offline", expiresAt: new Date(Date.now() + 60_000) });
    send(a, offer(addr("offline")));
    await until(() => messages(a, "error").length === 1);
    expect(messages(a, "error")[0].message).toContain("offline");
    const input = offer(addr("unknown")); send(a, input);
    await until(() => messages(a, "error").length === 2);
    expect(messages(a, "error")[1].requestId).toBe(input.requestId);
    expect(JSON.stringify(messages(a, "error"))).not.toContain("Private DB exception");
    expect(channel.transfers.size).toBe(0);
  });
  it("accepts arbitrary file formats and rejects oversize files without storing bytes", async () => {
    const a = await peer("a"), b = await peer("b");
    send(a, { ...offer(addr("b")), file: { name: "archive.unknown", size: 0, type: "" } });
    await until(() => messages(b, "offer").length === 1);
    send(a, offer(addr("b"), P2P_MAX_FILE_BYTES + 1));
    await until(() => messages(a, "error").length === 1);
    expect(messages(b, "offer")).toHaveLength(1);
    expect(channel.transfers.size).toBe(1);
  });
  it("cancels transfers when the relevant session is revoked", async () => {
    const a = await peer("a"), b = await peer("b");
    send(a, offer(addr("b")));
    await until(() => messages(b, "offer").length === 1);
    records.delete("b"); notifySessionRevoked("b");
    await until(() => b.readyState === WebSocket.CLOSED && messages(a, "cancel").length === 1);
    expect(channel.transfers.size).toBe(0);
  });
  it("does not recreate an offer after sender revocation races a preference lookup", async () => {
    const a = await peer("a"), b = await peer("b");
    let release!: (value: { address: string; muted: boolean }) => void;
    preferenceRead = async id => id === "b" ? new Promise(resolve => { release = resolve; }) :
      { address: addr(id), muted: false };
    send(a, offer(addr("b")));
    await until(() => !!release);
    records.delete("a"); notifySessionRevoked("a");
    await until(() => a.readyState === WebSocket.CLOSED);
    release({ address: addr("b"), muted: false });
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(channel.transfers.size).toBe(0);
    expect(messages(b, "offer")).toHaveLength(0);
  });
});
