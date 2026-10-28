import type { Express, Request, Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { walletScope, type WalletScope } from "./wallet-transaction-context";
import { db } from "./db";

type Handler = (req: Request, res: Response) => Promise<unknown>;
class RejectedResponse extends Error {}

/**
 * Explicit boundary for the legacy multi-table wallet handlers. The exported db
 * (including storage helpers) uses this transaction. Lock BEFORE any balance or
 * position reads, so a concurrent P2P hold cannot invalidate a legacy snapshot.
 * No HTTP success or external payment is allowed before COMMIT.
 *
 * New mutations require a client retry identity. Resource-state operations
 * (invoice confirmation, redemption) instead have their own durable identity.
 */
export function legacyWalletRoute(handler: Handler, options: { resourceIdentity?: boolean; secretResponse?: boolean } = {}): Handler {
  return async (req, res) => {
    const key = req.get("Idempotency-Key") ?? req.body?.requestId;
    if (!options.resourceIdentity && (typeof key !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(key))) {
      return res.status(400).json({ error: "A stable Idempotency-Key (16–128 letters, digits, _ or -) is required. Reuse it when retrying." });
    }
    const userId = req.user!.id;
    for (const field of ["amountSats", "satAmount", "amountA", "amountB", "amountIn", "lpTokens"]) {
      const value = req.body?.[field];
      if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0 || value > 10_000_000_000)) {
        return res.status(400).json({ error: `${field} must be a positive integer no greater than 10,000,000,000` });
      }
    }
    if (req.body?.nxtAmount !== undefined &&
        (typeof req.body.nxtAmount !== "number" || !Number.isFinite(req.body.nxtAmount) ||
          req.body.nxtAmount <= 0 || !Number.isSafeInteger(Math.floor(req.body.nxtAmount * 1000)))) {
      return res.status(400).json({ error: "Invalid NXT amount" });
    }
    const route = `${req.method}:${req.route.path}`;
    const fingerprint = createHash("sha256").update(JSON.stringify({ route, params: req.params, body: req.body })).digest("hex");
    const identity = createHash("sha256").update(`${userId}:${route}:${key}`).digest("hex");
    let status = 200, body: any, replay = false;
    const effects: WalletScope["afterCommit"] = [];
    // Capture, do not emit: even a successful json() is held until COMMIT.
    let response: Response;
    response = new Proxy(res, {
      get(target, property) {
        if (property === "status") return (code: number) => { status = code; return response; };
        if (property === "json") return (value: unknown) => { body = value; return response; };
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    try {
      await db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL lock_timeout = '10s'`);
        await tx.execute(sql`SET LOCAL idle_in_transaction_session_timeout = '30s'`);
        // Serialise all legacy invocations for one user, even if no wallet exists.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`legacy-wallet:${userId}`}, 0))`);
        if (!options.resourceIdentity) {
          const prior = (await tx.execute(sql`SELECT details FROM audit_logs
            WHERE action='legacy_wallet_request' AND resource_id=${identity} AND user_id=${userId} LIMIT 1`)).rows[0] as any;
          if (prior) {
            if (prior.details.fingerprint !== fingerprint) {
              status = 409; body = { error: "Idempotency key already used for different fields" }; replay = true; return;
            }
            status = prior.details.status;
            body = options.secretResponse ? { error: "Already processed. Secret keys are shown only once; check your API keys." } : prior.details.response;
            if (options.secretResponse) status = 409;
            replay = true; return;
          }
        }
        const before = (await tx.execute(sql`SELECT sats_balance FROM lightning_wallets WHERE user_id=${userId} FOR UPDATE`)).rows[0] as any;
        await tx.execute(sql`SELECT user_id FROM wallets WHERE user_id=${userId} FOR UPDATE`);
        // LP state is shared by different users. Lock before the helper reads it.
        if (req.route.path.startsWith("/api/lp/") && typeof req.body?.poolId === "string") {
          const pool = (await tx.execute(sql`SELECT * FROM liquidity_pools WHERE pool_id=${req.body.poolId} FOR UPDATE`)).rows[0] as any;
          if (pool && (pool.token_a !== "NXT" || pool.token_b !== "SATS")) {
            status = 423; body = { error: "This pool is paused until both token balances have an implemented backing ledger." };
            throw new RejectedResponse();
          }
        }
        const scope: WalletScope = { db: tx, active: true, afterCommit: effects };
        try {
          await walletScope.run(scope, () => handler(req, response));
          if (status >= 400 || body === undefined) throw new RejectedResponse();
          const after = (await tx.execute(sql`SELECT sats_balance FROM lightning_wallets WHERE user_id=${userId}`)).rows[0] as any;
          // Supplemental signed delta journal. Existing transaction signatures,
          // provider IDs and specialised stake/collateral histories are untouched.
          const delta = BigInt(after?.sats_balance ?? 0) - BigInt(before?.sats_balance ?? 0);
          if (delta !== 0n || !options.resourceIdentity) await tx.execute(sql`INSERT INTO audit_logs(id,user_id,action,resource,resource_id,details,status)
            VALUES (${randomUUID()},${userId},'legacy_wallet_delta','lightning_wallet',${options.resourceIdentity ? route : identity},
              ${JSON.stringify({ route, before: String(before?.sats_balance ?? 0), after: String(after?.sats_balance ?? 0), delta: String(delta) })}::jsonb,'success')`);
          if (!options.resourceIdentity) {
            await tx.execute(sql`INSERT INTO audit_logs(id,user_id,action,resource,resource_id,details,status)
              VALUES (${randomUUID()},${userId},'legacy_wallet_request','lightning_wallet',${identity},
                ${JSON.stringify({ fingerprint, status, response: options.secretResponse ? null : body })}::jsonb,'success')`);
          }
        } finally { scope.active = false; }
      });
    } catch (error) {
      effects.length = 0;
      if (!(error instanceof RejectedResponse)) {
        console.error("[Legacy wallet] Transaction aborted", (error as Error).message);
        status = 503; body = { error: "Wallet operation not committed. Retry with the same Idempotency-Key." };
      }
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(status).json(body);
    if (!replay && status < 400) {
      for (const effect of effects) {
        void Promise.resolve().then(effect).catch(error => console.error("[Wallet after commit]", error.message));
      }
    }
  };
}

// Explicit inventory, not a URL-prefix interception. Wrap only the final handler;
// authentication and account restrictions continue to run before this boundary.
export const LEGACY_WALLET_ROUTES = [
  "/api/keys", "/api/governance/proposals", "/api/community/mint",
  "/api/lightning/swap/to-nxt", "/api/lightning/swap/to-sats",
  "/api/lightning/withdraw-to-btc", "/api/lightning/send-to-ln-address",
  "/api/lightning/pay",
  "/api/lightning/invoice",
  "/api/lightning/send", "/api/lightning/tip", "/api/lightning/stake",
  "/api/pipeline/step2", "/api/rune-swap/sats-to-rune",
  "/api/wnusd/mint", "/api/wsats/mint", "/api/lp/add", "/api/lp/remove", "/api/lp/swap",
] as const;
const RESOURCE_ROUTES = [
  "/api/lightning/invoice/check", "/api/lightning/invoice/:hash",
  "/api/lightning/invoice/recheck-pending", "/api/lightning/unstake/:id",
  "/api/wnusd/redeem", "/api/wsats/redeem",
] as const;
export const BLOCKED_LEGACY_WALLET_ROUTES: Record<string, string> = {
  "/api/lightning/sync-blink-balance": "An aggregate provider balance is not an attributable deposit. Confirm individual invoices instead.",
  "/api/rune-swap/rune-to-sats": "Rune credits require verified custody, output identity and confirmations; a submitted transaction ID is not proof.",
  "/api/rune-swap/rune-to-nxt": "Rune credits require verified custody before minting a token that can be swapped for sats.",
  "/api/admin/fix-ln-balance": "Unreviewed absolute corrections are disabled. Use the snapshot-bound founder approval process.",
};
export function installLegacyWalletBoundaries(app: Express) {
  const routes = [...LEGACY_WALLET_ROUTES, ...RESOURCE_ROUTES];
  for (const path of routes) {
    const layer = (app as any)._router.stack.find((entry: any) =>
      entry.route?.path === path && entry.route.methods[path === "/api/lightning/invoice/check" || path === "/api/lightning/invoice/:hash" ? "get" : "post"]);
    if (!layer) throw new Error(`Missing audited wallet route: ${path}`);
    const handler = layer.route.stack.at(-1);
    handler.handle = legacyWalletRoute(handler.handle, {
      resourceIdentity: (RESOURCE_ROUTES as readonly string[]).includes(path),
      secretResponse: path === "/api/keys",
    });
  }
  for (const [path, reason] of Object.entries(BLOCKED_LEGACY_WALLET_ROUTES)) {
    const layer = (app as any)._router.stack.find((entry: any) => entry.route?.path === path && entry.route.methods.post);
    if (!layer) throw new Error(`Missing blocked wallet route: ${path}`);
    layer.route.stack.at(-1).handle = (_req: Request, res: Response) => res.status(423).json({ error: reason });
  }
}

export async function legacyWalletJob(userId: string, eventId: string, action: () => Promise<void>) {
  const effects: WalletScope["afterCommit"] = [];
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`legacy-wallet:${userId}`},0))`);
    const existing = (await tx.execute(sql`SELECT id FROM audit_logs
      WHERE action='legacy_wallet_job' AND user_id=${userId} AND resource_id=${eventId} LIMIT 1`)).rows;
    if (existing.length) return;
    await tx.execute(sql`SELECT user_id FROM lightning_wallets WHERE user_id=${userId} FOR UPDATE`);
    await tx.execute(sql`SELECT user_id FROM wallets WHERE user_id=${userId} FOR UPDATE`);
    const scope: WalletScope = { db: tx, active: true, afterCommit: effects };
    try {
      await walletScope.run(scope, action);
      await tx.execute(sql`INSERT INTO audit_logs(id,user_id,action,resource,resource_id,details,status)
        VALUES (${randomUUID()},${userId},'legacy_wallet_job','lightning_wallet',${eventId},'{}'::jsonb,'success')`);
    } finally { scope.active = false; }
  });
  for (const effect of effects) await effect();
}
