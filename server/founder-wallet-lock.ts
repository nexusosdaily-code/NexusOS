import type { Pool, PoolClient } from "pg";
import type { Request, Response, NextFunction } from "express";
import { isFounderAccount, isFounderBtcSession } from "./founder-access";

type Queryable = Pick<PoolClient, "query">;
type WalletUser = { id: string; username: string; withdrawalsBlocked?: boolean };
export const HELD_WALLET_USERNAME = "uncjuddy";
export const WALLET_RELEASE_CONFIRMATION = "RELEASE UNCJUDDY WALLET";
export const WALLET_LOCK_MESSAGE = "This wallet is locked by Nexus until an explicitly confirmed founder release. Incoming credits remain allowed.";

async function queryable(): Promise<Queryable> {
  return (await import("./db")).pool;
}

/** No expiry or startup mutation: the founder's requested hold is the default. */
export async function isWalletOutgoingLocked(user: WalletUser, client?: Queryable): Promise<boolean> {
  if (user.withdrawalsBlocked) return true;
  if (user.username.toLowerCase() !== HELD_WALLET_USERNAME) return false;
  const db = client ?? await queryable();
  const { rows } = await db.query(
    `SELECT a.action FROM audit_logs a JOIN users founder ON founder.id=a.user_id
     WHERE a.resource='founder_wallet_lock' AND a.resource_id=$1 AND a.status='success'
       AND a.action IN ('founder_wallet_locked','founder_wallet_released')
       AND founder.username='Nexus' AND founder.role='admin'
     ORDER BY a.created_at DESC, a.id DESC LIMIT 1`, [user.id]);
  return rows[0]?.action !== "founder_wallet_released";
}

export async function isUserOutgoingLocked(userId: string, client?: Queryable) {
  const db = client ?? await queryable();
  const { rows } = await db.query(
    "SELECT id,username,withdrawals_blocked FROM users WHERE id=$1", [userId]);
  if (rows.length !== 1) return true;
  return isWalletOutgoingLocked({
    id: rows[0].id, username: rows[0].username, withdrawalsBlocked: rows[0].withdrawals_blocked,
  }, db);
}

export async function assertUserOutgoingAllowed(userId: string, client?: Queryable): Promise<void> {
  if (await isUserOutgoingLocked(userId, client)) {
    throw Object.assign(new Error(WALLET_LOCK_MESSAGE), {status:423,code:"FOUNDER_WALLET_LOCKED"});
  }
}

export function walletSpendingRequest(method: string, originalUrl: string) {
  if (["GET","HEAD","OPTIONS"].includes(method)) return false;
  // Express routes are case-insensitive by default; the policy must match.
  const path = originalUrl.split("?")[0].toLowerCase();
  // Receiving and safety settings do not authorise any outgoing value.
  if (/^\/api\/wallet\/pin\/(?:set|verify)$/.test(path)) return false;
  if ([
    "/api/lightning/invoice", "/api/lightning/invoice/recheck-pending",
    "/api/lightning/get-invoices", "/api/lightning/sync-blink-balance",
    "/api/lightning/address-book",
    "/api/btc/deposit/claim",
  ].includes(path)) return false;
  return /^\/api\/(?:wallet|lightning|swap|staking|rune-swap|rune|runes|wnusd|wsats|lp|marketplace|market|btc|btc-bridge|ordinals|inscriptions|spectral-bundles|pipeline)(?:\/|$)/.test(path)
    || /^\/api\/community\/mint(?:\/|$)/.test(path)
    || /^\/api\/contracts\/[^/]+\/fund$/.test(path)
    || /^\/api\/app\/[^/]+\/run$/.test(path)
    || path === "/api/crowdfund/zap-goal";
}

export async function enforceWalletOutgoingLock(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || (!req.user.withdrawalsBlocked && req.user.username.toLowerCase() !== HELD_WALLET_USERNAME)) return next();
    if (req.user && walletSpendingRequest(req.method, req.originalUrl)
      && await isWalletOutgoingLocked(req.user)) {
      return res.status(423).json({ error: WALLET_LOCK_MESSAGE, code: "FOUNDER_WALLET_LOCKED" });
    }
    return next();
  } catch {
    return res.status(503).json({ error: "Wallet lock verification unavailable; no outgoing action authorised" });
  }
}

export function founderWalletLockHandlers(pool: Pick<Pool,"connect"|"query">) {
  function authorised(req: Request) {
    return req.user?.role === "admin" && isFounderAccount(req.user) && isFounderBtcSession(req.session?.token);
  }
  const read = async (req: Request, res: Response) => {
    if (!authorised(req)) return res.status(403).json({error:"Nexus BTC-secret session required"});
    try {
      const {rows} = await pool.query("SELECT id,username,withdrawals_blocked FROM users WHERE lower(username)=$1",[HELD_WALLET_USERNAME]);
      if (rows.length !== 1) return res.status(404).json({error:"Wallet holder not found"});
      const target = rows[0];
      return res.json({username:target.username,locked:await isUserOutgoingLocked(target.id,pool),expiresAt:null,incomingAllowed:true});
    } catch { return res.status(503).json({error:"Wallet lock status unavailable"}); }
  };
  const write = async (req: Request, res: Response) => {
    if (!authorised(req)) return res.status(403).json({error:"Nexus BTC-secret session required"});
    const {locked,confirmation} = req.body ?? {};
    if (typeof locked !== "boolean" || confirmation !== (locked ? "LOCK UNCJUDDY WALLET" : WALLET_RELEASE_CONFIRMATION)) {
      return res.status(400).json({error:"Explicit wallet lock or release confirmation required"});
    }
    let client: PoolClient;
    try { client = await pool.connect(); }
    catch { return res.status(503).json({error:"Wallet lock change unavailable; no change committed"}); }
    try {
      await client.query("BEGIN");
      const {rows} = await client.query("SELECT id FROM users WHERE lower(username)=$1 FOR UPDATE",[HELD_WALLET_USERNAME]);
      if (rows.length !== 1) {
        await client.query("ROLLBACK");
        return res.status(404).json({error:"Wallet holder not found"});
      }
      const targetId = rows[0].id;
      await client.query("UPDATE users SET withdrawals_blocked=$1,updated_at=now() WHERE id=$2",[locked,targetId]);
      await client.query(
        `INSERT INTO audit_logs(user_id,action,resource,resource_id,details,status,created_at)
         VALUES($1,$2,'founder_wallet_lock',$3,$4::jsonb,'success',clock_timestamp())`,
        [req.user!.id,locked?"founder_wallet_locked":"founder_wallet_released",targetId,
          JSON.stringify({confirmation,incomingAllowed:true,expiresAt:null})]);
      await client.query("COMMIT");
      return res.json({username:"UncJuddy",locked,expiresAt:null,incomingAllowed:true});
    } catch {
      await client.query("ROLLBACK").catch(()=>{});
      return res.status(503).json({error:"Wallet lock change failed; no partial change committed"});
    } finally { client.release(); }
  };
  return {read,write};
}
