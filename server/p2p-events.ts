// @ts-ignore — socket.io types resolved at runtime
import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";

export interface P2pEvent {
  type: "receipt" | "transmission" | "chunk";
  filename: string | null;
  transmissionType: string;
  srcPsiChannel: string | null;
  peerPsiChannel: string | null;
  peerNm: number | null;
  peerBand: string | null;
  bytesReceived: number | null;
  timestamp: string;
}

let _io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer) {
  _io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/ws/p2p",
  });
  _io.on("connection", (socket: any) => {
    socket.join("vm-feed");
  });
  return _io;
}

export function getIO(): SocketIOServer | null {
  return _io;
}

export function emitP2pEvent(event: P2pEvent) {
  if (!_io) return;
  _io.to("vm-feed").emit("p2p:event", event);
}
