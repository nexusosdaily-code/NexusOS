import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export const FOUNDER_USERNAME = "Nexus";
export const FOUNDER_PASSWORD_DISABLED = "!BTC_SECRET_SIGN_IN_ONLY!";

export function isFounderAccount(user: { username?: string } | null | undefined): boolean {
  return user?.username === FOUNDER_USERNAME;
}

function founderSessionMac(nonce: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for founder BTC sign-in");
  return createHmac("sha256", secret).update(`founder-btc-session:v1:${nonce}`).digest("hex");
}

/** Only the verified BTC sign-in route may request this session provenance. */
export function createFounderSessionToken(): string {
  const nonce = randomBytes(32).toString("hex");
  return `fw1.${nonce}.${founderSessionMac(nonce)}`;
}

export function isFounderBtcSession(token: string | undefined): boolean {
  if (!token || !process.env.SESSION_SECRET) return false;
  const match = /^fw1\.([a-f0-9]{64})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(founderSessionMac(match[1]), "hex"));
}

export async function blockFounderPasswordAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { storage } = await import("./storage");
    const username = req.body?.username;
    if (typeof username === "string" && isFounderAccount(await storage.getUserByUsername(username))) {
      res.status(403).json({ error: "The founder account uses BTC-secret sign-in only. Use Sign in as Nexus (BTC)." });
      return;
    }
    next();
  } catch {
    res.status(503).json({ error: "Sign-in is temporarily unavailable." });
  }
}

export async function founderBtcLoginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { storage } = await import("./storage");
    const wifKey = req.body?.wifKey;
    if (typeof wifKey !== "string" || !wifKey.trim()) {
      res.status(400).json({ error: "wifKey required" });
      return;
    }
    const expected = process.env.BTC_INSCRIPTION_WALLET_WIF;
    if (!expected) {
      res.status(503).json({ error: "Founder BTC sign-in is not configured." });
      return;
    }
    // Hash to equal-length buffers before constant-time comparison.
    const digest = (value: string) => createHmac("sha256", "btc-login-input:v1").update(value.trim()).digest();
    if (!timingSafeEqual(digest(wifKey), digest(expected))) {
      res.status(401).json({ error: "Invalid wallet key" });
      return;
    }
    const user = await storage.getUserByUsername(FOUNDER_USERNAME);
    if (!user || !user.isActive || user.role !== "admin") {
      res.status(403).json({ error: "Founder account unavailable" });
      return;
    }
    const session = await storage.createSession(user.id, req.ip, req.headers["user-agent"], "founder_btc");
    await storage.updateUserLastLogin(user.id);
    res.cookie("auth_token", session.token, {
      httpOnly: true, sameSite: "lax", maxAge: 365 * 24 * 60 * 60 * 1000,
      path: "/", secure: process.env.NODE_ENV === "production",
    });
    const wallet = await storage.getWallet(user.id);
    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      wallet: wallet ? { address: wallet.address, balance: wallet.balance } : null,
      expiresAt: session.expiresAt,
    });
  } catch {
    res.status(500).json({ error: "Founder BTC sign-in failed" });
  }
}
