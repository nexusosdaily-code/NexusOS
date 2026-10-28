import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { browserSocketToken } from "./browser-session-policy";
import { boundedSocketLookup, type SessionSockets, type SocketSession } from "./session-sockets";
import { P2P_MAX_FILE_BYTES } from "../shared/p2p-files";

const fileSchema = z.object({
  name: z.string().min(1).max(255).refine(name => !/[\u0000-\u001f]/.test(name)),
  size: z.number().int().min(0).max(P2P_MAX_FILE_BYTES),
  type: z.string().max(128),
});
const offerSchema = z.object({
  type: z.literal("offer"), requestId: z.string().uuid(),
  recipient: z.string().trim().min(1).max(600).nullable(), file: fileSchema,
});
const routedSchema = z.object({
  type: z.enum(["accept", "decline", "cancel", "signal", "received"]),
  id: z.string().uuid(),
  signal: z.union([
    z.object({ type: z.enum(["offer", "answer"]), sdp: z.string().max(60_000) }),
    z.object({ candidate: z.string().max(4096), sdpMid: z.string().max(64).nullable().optional(),
      sdpMLineIndex: z.number().int().min(0).max(100).nullable().optional(), usernameFragment: z.string().max(256).nullable().optional() }),
  ]).optional(),
});
export type FileChannelDeps = {
  session: (token: string) => Promise<SocketSession | undefined>;
  settings: (id: string) => Promise<{ address: string; muted: boolean }>;
  resolve: (address: string) => Promise<{ userId: string; address: string }>;
};
type Peer = { ws: WebSocket; userId: string; address: string };
type Transfer = {
  id: string; sender: Peer; recipient: Peer; accepted: boolean;
  broadcast: boolean; file: z.infer<typeof fileSchema>; expires: number;
};

/** Signaling only: file bytes travel over WebRTC, never through this socket. */
export function registerP2PFileChannel(server: Server, sessions: SessionSockets, deps: FileChannelDeps) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 70_000 });
  const peers = new Set<Peer>();
  const transfers = new Map<string, Transfer>();
  const send = (peer: Peer, data: unknown) => sessions.send(peer.ws, JSON.stringify(data));
  const finish = (transfer: Transfer, type: "cancel" | "decline" | "received", reason?: string) => {
    transfers.delete(transfer.id);
    send(transfer.sender, { type, id: transfer.id, reason });
    send(transfer.recipient, { type, id: transfer.id, reason });
  };
  const sweep = setInterval(() => {
    for (const transfer of transfers.values()) {
      if (transfer.expires <= Date.now()) finish(transfer, "cancel", "Transfer timed out");
    }
  }, 5_000);
  sweep.unref();
  const upgrade = (req: Parameters<WebSocketServer["handleUpgrade"]>[0],
    socket: Parameters<WebSocketServer["handleUpgrade"]>[1], head: Buffer) => {
    if (req.url?.split("?")[0] === "/ws/p2p-files") {
      wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
    }
  };
  server.on("upgrade", upgrade);
  wss.on("error", () => console.error("P2P file signaling unavailable"));
  wss.on("connection", async (ws, req) => {
    let peer: Peer | undefined;
    let closed = false;
    const cleanup = () => {
      closed = true;
      if (!peer) return;
      peers.delete(peer);
      for (const transfer of [...transfers.values()]) {
        if (transfer.sender === peer || transfer.recipient === peer) finish(transfer, "cancel", "Peer disconnected");
      }
    };
    ws.once("close", cleanup); ws.once("session-ended", cleanup);
    ws.on("error", cleanup);
    try {
      const token = browserSocketToken(req);
      const session = token && await boundedSocketLookup(() => deps.session(token));
      if (!session || !await sessions.attach(ws, session)) { ws.close(1008, "Authentication required"); return; }
      const own = await boundedSocketLookup(() => deps.settings(session.userId));
      if (closed || !await sessions.authorize(ws)) return;
      peer = { ws, userId: session.userId, address: own.address };
      peers.add(peer);
      send(peer, { type: "ready", address: own.address, muted: own.muted,
        online: new Set([...peers].map(p => p.userId)).size });
      // Serialize processing and bound queued work; malformed frames do not
      // create transfers, and no client can choose the sender identity.
      let chain = Promise.resolve();
      let queued = 0;
      let windowStart = Date.now(), offersInWindow = 0;
      let frameWindowStart = Date.now(), framesInWindow = 0;
      const requests = new Set<string>();
      ws.on("message", (raw, binary) => {
        if (Date.now() - frameWindowStart > 60_000) { frameWindowStart = Date.now(); framesInWindow = 0; }
        if (binary || ++framesInWindow > 240 || ++queued > 80) {
          cleanup(); ws.close(1008, "Signaling limit exceeded"); return;
        }
        let requestId: string | undefined;
        chain = chain.then(async () => {
          if (!peer || closed || !await sessions.authorize(ws)) return;
          const message = JSON.parse(raw.toString());
          if (message.type === "offer") {
            if (z.string().uuid().safeParse(message.requestId).success) requestId = message.requestId;
            const input = offerSchema.parse(message);
            requestId = input.requestId;
            if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); offersInWindow = 0; requests.clear(); }
            if (++offersInWindow > 10) throw new Error("Please wait before sending more offers");
            if (requests.has(input.requestId)) throw new Error("Duplicate offer");
            requests.add(input.requestId);
            if ([...transfers.values()].filter(t => t.sender.userId === peer!.userId).length >= 128) {
              throw new Error("Too many pending transfers; cancel or wait for them to finish");
            }
            let targets: Peer[];
            if (input.recipient) {
              const target = await boundedSocketLookup(() => deps.resolve(input.recipient!));
              targets = [...peers].filter(p => p.userId === target.userId && p !== peer).slice(-1);
              if (!targets.length) throw new Error("Recipient is offline. Ask them to open P2P Receive");
            } else {
              // One destination tab per online account. All content categories
              // use this same deliberate broadcast action; there is no
              // emergency privilege or way to override a recipient's mute.
              const unique = new Map<string, Peer>();
              for (const p of peers) if (p.userId !== peer.userId) unique.set(p.userId, p);
              targets = [...unique.values()];
            }
            let offered = 0, capacityReached = false;
            for (const target of targets) {
              if (closed || !await sessions.authorize(ws)) break;
              if (!await sessions.authorize(target.ws)) continue;
              const settings = await boundedSocketLookup(() => deps.settings(target.userId));
              // A disconnect/revocation can occur during the preference read.
              // Do not recreate a transfer after that socket's cleanup ran.
              if (closed || !await sessions.authorize(ws)) break;
              if (!await sessions.authorize(target.ws) || closed) continue;
              if (input.recipient === null && settings.muted) continue;
              if ([...transfers.values()].filter(t => t.recipient.userId === target.userId).length >= 32) continue;
              if ([...transfers.values()].filter(t => t.sender.userId === peer!.userId).length >= 128) {
                capacityReached = true; break;
              }
              const transfer: Transfer = {
                id: randomUUID(), sender: peer, recipient: target, accepted: false,
                broadcast: input.recipient === null, file: input.file, expires: Date.now() + 120_000,
              };
              transfers.set(transfer.id, transfer);
              send(target, { type: "offer", id: transfer.id, file: transfer.file, from: peer.address, broadcast: transfer.broadcast });
              send(peer, { type: "offered", requestId: input.requestId, id: transfer.id, file: transfer.file,
                peer: target.address, broadcast: transfer.broadcast });
              offered++;
            }
            send(peer, { type: "offer-result", requestId: input.requestId, offered,
              reason: capacityReached ? `Partial broadcast: ${offered} offers sent; the 128 pending-offer limit was reached` :
                offered ? undefined : "No available recipients (offline, muted, or inbox full)" });
            return;
          }
          const input = routedSchema.parse(message);
          const transfer = transfers.get(input.id);
          if (!transfer || (transfer.sender !== peer && transfer.recipient !== peer)) throw new Error("Transfer unavailable");
          if (input.type === "cancel") { finish(transfer, "cancel", "Cancelled by participant"); return; }
          const receiver = transfer.recipient === peer;
          if (input.type === "accept" || input.type === "decline") {
            if (!receiver || transfer.accepted) throw new Error("Transfer is not awaiting acceptance");
            if (input.type === "decline") { finish(transfer, "decline"); return; }
            const settings = await boundedSocketLookup(() => deps.settings(peer!.userId));
            if (closed || transfers.get(input.id) !== transfer || !await sessions.authorize(ws)) return;
            if (transfer.broadcast && settings.muted) { finish(transfer, "cancel", "Broadcasts muted"); return; }
            transfer.accepted = true;
            transfer.expires = Date.now() + 30 * 60_000;
            send(transfer.sender, { type: "accept", id: transfer.id });
          } else if (input.type === "signal") {
            if (!transfer.accepted || !input.signal) throw new Error("Accept the transfer before connecting");
            if ("type" in input.signal && input.signal.type !== (receiver ? "answer" : "offer")) {
              throw new Error("Unexpected signaling role");
            }
            sessions.send((receiver ? transfer.sender : transfer.recipient).ws,
              JSON.stringify({ type: "signal", id: transfer.id, signal: input.signal }), ws);
          } else if (input.type === "received") {
            if (!receiver || !transfer.accepted) throw new Error("Recipient acknowledgement required");
            finish(transfer, "received");
          }
        }).catch(error => {
          if (peer && !closed) send(peer, { type: "error", requestId,
            // Schema errors are not useful public details; resolver failures
            // use a fixed address message rather than leaking DB exceptions.
            message: error instanceof z.ZodError ? "Invalid signaling message" :
              /^(Recipient is offline|Please wait|Duplicate offer|Too many pending|Transfer unavailable|Transfer is not|Accept the|Recipient acknowledgement)/.test(error?.message ?? "")
                ? error.message : "Unable to route this transfer. Check the exact registered wave address and connection." });
        }).finally(() => { queued--; });
      });
    } catch {
      cleanup(); ws.close(1011, "P2P connection unavailable");
    }
  });
  return {
    wss, transfers,
    settingsChanged(userId: string, muted: boolean) {
      for (const peer of peers) if (peer.userId === userId) send(peer, { type: "settings", muted });
      for (const transfer of [...transfers.values()]) {
        if (muted && transfer.recipient.userId === userId && transfer.broadcast) finish(transfer, "cancel", "Broadcasts muted");
      }
    },
    close() {
      clearInterval(sweep); server.off("upgrade", upgrade);
      for (const peer of peers) peer.ws.close(1001, "Server shutting down");
      wss.close();
    },
  };
}
