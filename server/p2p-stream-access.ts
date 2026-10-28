import { EventEmitter } from "node:events";
import { WebSocket } from "ws";
import { pool } from "./db";

const revoked = new EventEmitter(); revoked.setMaxListeners(0);
type Stream = { id: string; isPublic: boolean; broadcasterId: string };
export async function canViewStream(stream: Stream, userId?: string): Promise<boolean> {
  if (stream.isPublic || stream.broadcasterId === userId) return true;
  if (!userId) return false;
  return (await pool.query("SELECT 1 FROM p2p_stream_guests WHERE stream_id=$1 AND user_id=$2", [stream.id, userId])).rows.length > 0;
}
export function revokeStreamGuest(streamId: string, userId: string) { revoked.emit("revoke", streamId, userId); }

// Local revocations close immediately; fresh periodic ACL reads cover other
// processes. Closing signaling makes our client stop its existing RTC stream.
export function watchPrivateStream(ws: WebSocket, stream: Stream, userId: string) {
  if (stream.isPublic || stream.broadcasterId === userId) return;
  let busy = false, closed = false;
  const close = () => { if (!closed) ws.close(1008, "Private stream access revoked"); };
  const revoke = (id: string, uid: string) => { if (id === stream.id && uid === userId) close(); };
  revoked.on("revoke", revoke);
  const timer = setInterval(async () => {
    if (busy || closed) return;
    busy = true;
    try { if (!await canViewStream(stream, userId)) close(); } catch { close(); }
    finally { busy = false; }
  }, 5000);
  timer.unref();
  ws.once("close", () => { closed = true; clearInterval(timer); revoked.off("revoke", revoke); });
}
