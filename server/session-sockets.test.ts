import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import {
  SessionSockets, SocketPeers, SOCKET_SESSION_RECHECK_MS, SOCKET_SESSION_LOOKUP_TIMEOUT_MS,
  type SocketSession,
} from "./session-sockets";
import { notifySessionRevoked, notifyUserSessionsRevoked, sessionLifecycle } from "./session-lifecycle";

class TestSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  send = vi.fn((_data: string, callback?: (error?: Error) => void) => callback?.());
  close = vi.fn((_code: number, _reason: string) => {
    this.readyState = WebSocket.CLOSED;
    this.emit("close");
  });
}
const socket = () => new TestSocket() as unknown as WebSocket;
let registry: SessionSockets;
let sessions: Map<string, SocketSession>;
let load: ReturnType<typeof vi.fn<(ids: string[]) => Promise<SocketSession[]>>>;
const session = (id: string, userId = "same-user", ttl = 60_000) => {
  const value = { id, userId, expiresAt: new Date(Date.now() + ttl) };
  sessions.set(id, value);
  return value;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  sessions = new Map();
  load = vi.fn(async ids => ids.flatMap(id => {
    const row = sessions.get(id);
    return row ? [{ ...row }] : [];
  }));
  registry = new SessionSockets(load);
});
afterEach(() => {
  registry.dispose();
  vi.useRealTimers();
});

describe("live socket session lifecycle", () => {
  it("closes all sockets of the revoked session, but not another session for that user", async () => {
    const a = session("session-a"), b = session("session-b");
    const signaling = socket(), streaming = socket(), other = socket();
    await Promise.all([registry.attach(signaling, a), registry.attach(streaming, a), registry.attach(other, b)]);
    notifySessionRevoked(a.id);
    expect(signaling.close).toHaveBeenCalledWith(1008, "Session ended");
    expect(streaming.close).toHaveBeenCalledWith(1008, "Session ended");
    expect(other.close).not.toHaveBeenCalled();
    expect(await registry.authorize(signaling)).toBe(false);
    expect(await registry.authorize(other)).toBe(true);
  });

  it("supports revoking every session of one user without touching another user", async () => {
    const a = socket(), b = socket(), c = socket();
    await Promise.all([
      registry.attach(a, session("a")), registry.attach(b, session("b")),
      registry.attach(c, session("c", "other-user")),
    ]);
    notifyUserSessionsRevoked("same-user");
    expect(a.close).toHaveBeenCalledOnce();
    expect(b.close).toHaveBeenCalledOnce();
    expect(c.close).not.toHaveBeenCalled();
  });

  it("does not revoke a sibling tab when a socket is ordinarily closing", async () => {
    const a = session("shared"), closing = socket(), sibling = socket();
    await Promise.all([registry.attach(closing, a), registry.attach(sibling, a)]);
    Object.defineProperty(closing, "readyState", { value: WebSocket.CLOSING });
    expect(await registry.authorize(closing)).toBe(false);
    expect(sibling.close).not.toHaveBeenCalled();
    expect(await registry.authorize(sibling)).toBe(true);
  });

  it("does not revoke a sibling tab when a socket closes during a pending check", async () => {
    const a = session("shared"), closing = socket(), sibling = socket();
    await Promise.all([registry.attach(closing, a), registry.attach(sibling, a)]);
    let release!: (rows: SocketSession[]) => void;
    load.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = registry.authorize(closing);
    await vi.advanceTimersByTimeAsync(0);
    closing.close(1000, "Normal tab close");
    release([a]);
    expect(await pending).toBe(false);
    expect(sibling.close).not.toHaveBeenCalled();
    expect(await registry.authorize(sibling)).toBe(true);
  });

  it("expires idle sockets at the deadline without waiting for a poll or traffic", async () => {
    const ws = socket();
    await registry.attach(ws, session("short", "user", 100));
    await vi.advanceTimersByTimeAsync(99);
    expect(ws.close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(ws.close).toHaveBeenCalledWith(1008, "Session ended");
  });

  it.each([0, -1, NaN])("rejects an initially expired or invalid deadline %s", async ttl => {
    const ws = socket();
    expect(await registry.attach(ws, session("bad", "user", ttl))).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalledOnce();
  });

  it("batches the shared idle sweep by distinct sessions, not sockets", async () => {
    const a = session("a"), b = session("b");
    const sockets = Array.from({ length: 12 }, () => socket());
    await Promise.all(sockets.map((ws, i) => registry.attach(ws, i === 11 ? b : a)));
    load.mockClear();
    sessions.delete(a.id); // Another process or a direct DB operation.
    await vi.advanceTimersByTimeAsync(SOCKET_SESSION_RECHECK_MS);
    expect(load).toHaveBeenCalledOnce();
    expect(new Set(load.mock.calls[0][0])).toEqual(new Set(["a", "b"]));
    for (const ws of sockets.slice(0, 11)) expect(ws.close).toHaveBeenCalledOnce();
    expect(sockets[11].close).not.toHaveBeenCalled();
  });

  it("fresh-checks incoming traffic and unsolicited outgoing delivery before the next idle sweep", async () => {
    const ws = socket();
    await registry.attach(ws, session("a"));
    sessions.delete("a");
    registry.send(ws, "private notification");
    expect(await registry.authorize(ws)).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(ws.send).not.toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalledOnce();
  });

  it("does not revive a locally revoked socket when an older DB check resolves", async () => {
    const ws = socket(), a = session("a");
    await registry.attach(ws, a);
    let release!: (rows: SocketSession[]) => void;
    load.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const allowed = registry.authorize(ws);
    await vi.advanceTimersByTimeAsync(0);
    notifySessionRevoked(a.id);
    release([a]); // Deliberately stale pre-revocation snapshot.
    expect(await allowed).toBe(false);
    expect(ws.close).toHaveBeenCalledOnce();
  });

  it("does not forward a message after its source is revoked during target validation", async () => {
    const source = socket(), target = socket();
    const a = session("a"), b = session("b", "other-user");
    await Promise.all([registry.attach(source, a), registry.attach(target, b)]);
    let release!: (rows: SocketSession[]) => void;
    load.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    registry.send(target, "must not arrive", source);
    await vi.advanceTimersByTimeAsync(0);
    notifySessionRevoked("a");
    release([a, b]);
    await vi.advanceTimersByTimeAsync(0);
    expect(target.send).not.toHaveBeenCalled();
    expect(target.close).not.toHaveBeenCalled();
  });

  it("fails closed without leaking store errors", async () => {
    const ws = socket();
    await registry.attach(ws, session("a"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    load.mockRejectedValueOnce(new Error("synthetic-sensitive-driver-message"));
    expect(await registry.authorize(ws)).toBe(false);
    expect(ws.close).toHaveBeenCalledWith(1008, "Session ended");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("bounds a stalled store lookup and closes instead of accepting stale authority", async () => {
    const ws = socket();
    await registry.attach(ws, session("a"));
    load.mockImplementationOnce(() => new Promise(() => {}));
    const allowed = registry.authorize(ws);
    await vi.advanceTimersByTimeAsync(SOCKET_SESSION_LOOKUP_TIMEOUT_MS + 1);
    expect(await allowed).toBe(false);
    expect(ws.close).toHaveBeenCalledOnce();
  });

  it("updates the expiry timer when the store shortens a session", async () => {
    const ws = socket();
    await registry.attach(ws, session("a"));
    sessions.get("a")!.expiresAt = new Date(Date.now() + 10);
    expect(await registry.authorize(ws)).toBe(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(ws.close).toHaveBeenCalledOnce();
  });

  it("sends a final stream-ended notification before closing the recipient", async () => {
    const ws = socket();
    await registry.attach(ws, session("a"));
    registry.send(ws, "stream-ended", undefined, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(ws.send).toHaveBeenCalledWith("stream-ended", expect.any(Function));
    expect(ws.close).toHaveBeenCalledWith(1000, "Stream ended");
    expect(vi.mocked(ws.send).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ws.close).mock.invocationCallOrder[0]);
  });

  it("bounds database query batches and cleans up shared timers/listeners", async () => {
    const previousListeners = sessionLifecycle.listenerCount("session");
    await Promise.all(Array.from({ length: 201 }, (_, i) => registry.attach(socket(), session(`session-${i}`))));
    expect(load.mock.calls.every(([ids]) => ids.length <= 200)).toBe(true);
    registry.dispose();
    expect(sessionLifecycle.listenerCount("session")).toBe(previousListeners - 1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

it("keeps older and newer same-user peer registrations independent", () => {
  const peers = new SocketPeers<{ ws: WebSocket; isBroadcaster: boolean }>();
  const old = socket(), current = socket();
  peers.set("user", { ws: old, isBroadcaster: false });
  peers.set("user", { ws: current, isBroadcaster: false });
  expect(peers.get("user")?.ws).toBe(current);
  expect(peers.remove("user", old)).toBe(false);
  expect(peers.get("user")?.ws).toBe(current);
  peers.set("user", { ws: old, isBroadcaster: false });
  expect(peers.remove("user", old)).toBe(false);
  expect(peers.get("user")?.ws).toBe(current);
  expect(peers.remove("user", current)).toBe(true);
  expect(peers.size).toBe(0);
});
