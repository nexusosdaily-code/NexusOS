import type { Express } from "express";
import type { Server } from "node:http";
import { z } from "zod";
import { pool } from "./db";
import { storage } from "./storage";
import { authenticate } from "./auth";
import type { SessionSockets } from "./session-sockets";
import { registerP2PFileChannel } from "./p2p-file-channel";
import { resolveWalletWave, walletWaveForUser } from "./wnsp-address-resolution";

export function registerP2PFileRoutes(app: Express, server: Server, sessions: SessionSockets) {
  const settings = async (id: string) => {
    const [identity, result] = await Promise.all([
      walletWaveForUser(pool, id),
      pool.query("SELECT p2p_broadcast_muted FROM users WHERE id=$1 AND is_active=true", [id]),
    ]);
    if (!identity || !result.rows.length) throw new Error("Active wave identity required");
    return { address: identity, muted: result.rows[0].p2p_broadcast_muted === true };
  };
  const channel = registerP2PFileChannel(server, sessions, {
    session: token => storage.getSessionByToken(token),
    settings, resolve: address => resolveWalletWave(pool, address),
  });
  app.get("/api/p2p/files/settings", authenticate, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try { res.json(await settings(req.user!.id)); }
    catch { res.status(503).json({ error: "Wave identity or P2P preferences are unavailable" }); }
  });
  app.put("/api/p2p/files/settings", authenticate, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const input = z.object({ muted: z.boolean() }).strict().safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: "A boolean muted setting is required" }); return; }
    try {
      const result = await pool.query("UPDATE users SET p2p_broadcast_muted=$2 WHERE id=$1 AND is_active=true RETURNING id",
        [req.user!.id, input.data.muted]);
      if (!result.rows.length) { res.status(403).json({ error: "Active account required" }); return; }
      channel.settingsChanged(req.user!.id, input.data.muted);
      res.json({ muted: input.data.muted });
    } catch { res.status(503).json({ error: "Unable to save broadcast preference" }); }
  });
  server.once("close", () => channel.close());
  return channel;
}
