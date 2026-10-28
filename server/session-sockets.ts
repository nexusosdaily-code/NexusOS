import { WebSocket } from "ws";
import { sessionLifecycle } from "./session-lifecycle";

export interface SocketSession {
  id: string;
  userId: string;
  expiresAt: Date;
}
type Entry = { session: SocketSession; sockets: Set<WebSocket> };

const MAX_BATCH = 200;
const MAX_PENDING_PER_SOCKET = 64;
export const SOCKET_SESSION_RECHECK_MS = 5_000;
export const SOCKET_SESSION_LOOKUP_TIMEOUT_MS = 2_000;

export async function boundedSocketLookup<T>(load: () => Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Session lookup timeout")), SOCKET_SESSION_LOOKUP_TIMEOUT_MS);
        timeout.unref();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * One shared sweep, one expiry timer, and batched fresh checks for traffic.
 * No credential is kept here, and no positive authorization cache is used for
 * sends or incoming messages. Local revocations invalidate pending checks too.
 */
export class SessionSockets {
  private entries = new Map<string, Entry>();
  private sockets = new Map<WebSocket, Entry>();
  private pending = new Map<WebSocket, Array<(valid: boolean) => void>>();
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private scheduled = false;
  private draining = false;
  private disposed = false;
  private readonly onSession = (id: string) => this.revoke(id);
  private readonly onUser = (id: string) => {
    for (const entry of [...this.entries.values()]) {
      if (entry.session.userId === id) this.revoke(entry.session.id);
    }
  };

  constructor(private readonly load: (ids: string[]) => Promise<SocketSession[]>) {
    sessionLifecycle.on("session", this.onSession);
    sessionLifecycle.on("user", this.onUser);
  }

  async attach(ws: WebSocket, session: SocketSession): Promise<boolean> {
    if (this.disposed || ws.readyState !== WebSocket.OPEN ||
        !Number.isFinite(new Date(session.expiresAt).getTime()) ||
        new Date(session.expiresAt).getTime() <= Date.now()) {
      ws.close(1008, "Session unavailable");
      return false;
    }
    let entry = this.entries.get(session.id);
    if (entry && entry.session.userId !== session.userId) {
      ws.close(1008, "Session unavailable");
      return false;
    }
    if (!entry) {
      entry = {
        session: { id: session.id, userId: session.userId, expiresAt: new Date(session.expiresAt) },
        sockets: new Set(),
      };
      this.entries.set(session.id, entry);
    }
    entry.sockets.add(ws);
    this.sockets.set(ws, entry);
    const detach = () => this.detach(ws);
    ws.once("close", detach);
    ws.once("error", detach);
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        for (const socket of this.sockets.keys()) void this.authorize(socket);
      }, SOCKET_SESSION_RECHECK_MS);
      this.pollTimer.unref();
    }
    this.scheduleExpiry();
    return this.authorize(ws);
  }

  private live(ws: WebSocket, entry = this.sockets.get(ws)): entry is Entry {
    return !!entry && this.sockets.get(ws) === entry &&
      this.entries.get(entry.session.id) === entry && ws.readyState === WebSocket.OPEN &&
      entry.session.expiresAt.getTime() > Date.now();
  }

  authorize(ws: WebSocket): Promise<boolean> {
    // A tab's ordinary close is not a revocation of its shared session.
    if (ws.readyState !== WebSocket.OPEN) {
      this.detach(ws);
      return Promise.resolve(false);
    }
    if (!this.live(ws)) {
      if (this.sockets.has(ws)) this.revoke(this.sockets.get(ws)!.session.id);
      return Promise.resolve(false);
    }
    const waiting = this.pending.get(ws) ?? [];
    if (waiting.length >= MAX_PENDING_PER_SOCKET) {
      this.revoke(this.sockets.get(ws)!.session.id);
      return Promise.resolve(false);
    }
    const result = new Promise<boolean>(resolve => waiting.push(resolve));
    this.pending.set(ws, waiting);
    if (!this.scheduled && !this.draining) {
      this.scheduled = true;
      queueMicrotask(() => { this.scheduled = false; void this.drain(); });
    }
    return result;
  }

  /** All route sends must pass here, including unsolicited notifications. */
  send(ws: WebSocket, data: string, source?: WebSocket, closeAfter = false): void {
    void Promise.all([this.authorize(ws), source ? this.authorize(source) : Promise.resolve(true)]).then(([valid, sourceValid]) => {
      // Revocation/expiry can occur after the database check resolves.
      if (!valid || !sourceValid || !this.live(ws) || (source && !this.live(source))) return;
      try {
        ws.send(data, error => {
          if (error) this.close(ws, 1011, "Connection unavailable");
          else if (closeAfter) this.close(ws, 1000, "Stream ended");
        });
      } catch {
        this.close(ws, 1011, "Connection unavailable");
      }
    });
  }

  private async lookup(ids: string[]): Promise<SocketSession[]> {
    return boundedSocketLookup(() => this.load(ids));
  }

  private async drain(): Promise<void> {
    if (this.draining || this.disposed) return;
    this.draining = true;
    try {
      while (this.pending.size && !this.disposed) {
        const work = this.pending;
        this.pending = new Map();
        const snapshots = new Map<WebSocket, Entry>();
        for (const ws of work.keys()) {
          const entry = this.sockets.get(ws);
          if (entry) snapshots.set(ws, entry);
        }
        const ids = [...new Set([...snapshots.values()].map(entry => entry.session.id))];
        const valid = new Map<string, SocketSession>();
        let failed = false;
        try {
          for (let i = 0; i < ids.length; i += MAX_BATCH) {
            for (const row of await this.lookup(ids.slice(i, i + MAX_BATCH))) valid.set(row.id, row);
          }
        } catch {
          // Do not log store exceptions: connection strings or tokens may be
          // embedded in a driver's error. Store failures always fail closed.
          failed = true;
        }
        for (const [ws, resolvers] of work) {
          const entry = snapshots.get(ws);
          const row = entry && valid.get(entry.session.id);
          const accepted = !failed && this.live(ws, entry) && !!row &&
            row.userId === entry!.session.userId &&
            Number.isFinite(new Date(row.expiresAt).getTime()) &&
            new Date(row.expiresAt).getTime() > Date.now();
          if (accepted && entry && row) entry.session.expiresAt = new Date(row.expiresAt);
          else if (entry && this.entries.get(entry.session.id) === entry) {
            if (!failed && row && row.userId === entry.session.userId &&
                new Date(row.expiresAt).getTime() > Date.now() &&
                (ws.readyState !== WebSocket.OPEN || this.sockets.get(ws) !== entry)) {
              this.detach(ws);
            } else {
              this.revoke(entry.session.id);
            }
          }
          for (const resolve of resolvers) resolve(accepted && this.live(ws, entry));
        }
        this.scheduleExpiry();
      }
    } finally {
      this.draining = false;
    }
  }

  revoke(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id); // Invalidate synchronously, before close handshake.
    for (const ws of [...entry.sockets]) this.close(ws, 1008, "Session ended");
    this.scheduleExpiry();
  }

  private close(ws: WebSocket, code: number, reason: string): void {
    this.detach(ws);
    // Route cleanup must not wait for a potentially unresponsive peer's
    // close handshake. This is a server-only lifecycle event, not a message.
    ws.emit("session-ended");
    if (ws.readyState === WebSocket.OPEN) ws.close(code, reason);
    // ws bounds its close handshake internally; an unresponsive peer is not
    // retained in this registry while that handshake completes.
  }

  private detach(ws: WebSocket): void {
    const entry = this.sockets.get(ws);
    this.sockets.delete(ws);
    entry?.sockets.delete(ws);
    if (entry && entry.sockets.size === 0 && this.entries.get(entry.session.id) === entry) {
      this.entries.delete(entry.session.id);
    }
    for (const resolve of this.pending.get(ws) ?? []) resolve(false);
    this.pending.delete(ws);
    this.scheduleExpiry();
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    if (!this.entries.size) {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = undefined;
      return;
    }
    const deadline = Math.min(...[...this.entries.values()].map(entry => entry.session.expiresAt.getTime()));
    this.expiryTimer = setTimeout(() => {
      for (const entry of [...this.entries.values()]) {
        if (entry.session.expiresAt.getTime() <= Date.now()) this.revoke(entry.session.id);
      }
      this.scheduleExpiry();
    }, Math.max(1, Math.min(deadline - Date.now(), 2_147_483_647)));
    this.expiryTimer.unref();
  }

  dispose(): void {
    this.disposed = true;
    sessionLifecycle.off("session", this.onSession);
    sessionLifecycle.off("user", this.onUser);
    for (const id of [...this.entries.keys()]) this.revoke(id);
  }
}

/** Preserve a user's other connections when an older/newer tab disconnects. */
export class SocketPeers<T extends { ws: WebSocket }> {
  private users = new Map<string, T[]>();
  get size() { return this.users.size; }
  has(id: string) { return this.users.has(id); }
  get(id: string) { return this.users.get(id)?.at(-1); }
  set(id: string, peer: T) {
    this.users.set(id, [...(this.users.get(id) ?? []).filter(p => p.ws !== peer.ws), peer]);
  }
  /** True only when this was the user's final connection in this directory. */
  remove(id: string, ws: WebSocket): boolean {
    const peers = this.users.get(id);
    if (!peers?.some(p => p.ws === ws)) return false;
    const remaining = peers.filter(p => p.ws !== ws);
    if (remaining.length) { this.users.set(id, remaining); return false; }
    this.users.delete(id);
    return true;
  }
  entries(): Array<[string, T]> { return [...this.users].map(([id, peers]) => [id, peers.at(-1)!]); }
  values(): T[] { return this.entries().map(([, peer]) => peer); }
  all(): Array<[string, T]> { return [...this.users].flatMap(([id, peers]) => peers.map(peer => [id, peer] as [string, T])); }
}
