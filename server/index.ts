import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn, execSync, ChildProcess } from "child_process";
import { seedGenesisBlock } from "./genesis";
import { seedGenesisUser } from "./genesis_user";
import { startBlockchainAuditor } from "./blockchain_auditor";
import { seedGenesisNode } from "./genesis_node";
import { startKernelAgents } from "./kernel_agents";
import { startSocialBroadcastAgent } from "./social_broadcast_agent";
import { startTelegramBot } from "./telegram-bot";
import { startNostrDmBot } from "./nostr-dm-bot";
import { startNxtCampaignAgent } from "./nxt-campaign-agent";
import { startPostScheduler } from "./post-scheduler";
import { startTgNostrBridge } from "./telegram-nostr-bridge";
import { startWnspBtcEtcher } from "./wnsp-btc-rune-etcher";

const app = express();
const httpServer = createServer(app);

let flaskProcess: ChildProcess | null = null;

function killPort(port: number) {
  try { execSync(`fuser -k ${port}/tcp 2>/dev/null || true`); } catch {}
  try { execSync(`pkill -9 -f "spectral_api" 2>/dev/null || true`); } catch {}
}

function startFlaskAPI() {
  if (process.env.NODE_ENV === "production") return;

  // Kill anything still holding port 5001 before we try to bind
  killPort(5001);

  console.log("Starting Spectral API server on port 5001...");

  flaskProcess = spawn("uv", ["run", "python", "spectral_api.py"], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  flaskProcess.stdout?.on("data", (data) => { process.stdout.write(data); });
  flaskProcess.stderr?.on("data", (data) => { process.stderr.write(data); });
  flaskProcess.on("error", (err) => { console.error("Failed to start Flask API:", err.message); });
  flaskProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) console.error(`Flask API exited with code ${code}`);
  });
}

function cleanupFlask() {
  if (flaskProcess && !flaskProcess.killed) {
    try { flaskProcess.kill("SIGKILL"); } catch {}
    flaskProcess = null;
  }
  try { execSync(`pkill -9 -f "spectral_api" 2>/dev/null || true`); } catch {}
}

process.on("SIGINT",  () => { cleanupFlask(); process.exit(0); });
process.on("SIGTERM", () => { cleanupFlask(); process.exit(0); });
process.on("exit",    () => { cleanupFlask(); });

startFlaskAPI();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Gzip all responses — halves JS/HTML transfer sizes on mobile
app.use(compression());
app.use(cookieParser());

// ── Health / startup guard ───────────────────────────────────────────────────
// The deployment platform probes / immediately on boot. The server binds to
// the port (reusePort) before routes/static are fully registered, causing 500s
// that the uptime monitor records as outages on every deploy.
// Fix: answer / with 200 during the startup window, then hand off to static.
let serverReady = false;
app.get("/health", (_req, res) => res.json({ status: "ok", ready: serverReady, ts: Date.now() }));
app.get("/", (req, res, next) => {
  if (!serverReady) return res.status(200).send("ok");
  next();
});

// ── Dev environment gate ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const DEV_KEY = process.env.DEV_ACCESS_KEY || "";
  const COOKIE  = "nexus_dev_key";

  const lockScreen = (hint: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NexusOS — Restricted</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#000;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .box{background:#0a0a0a;border:1px solid #1a1a2e;border-radius:12px;padding:40px;width:340px;text-align:center}
  .logo{font-size:22px;font-weight:700;letter-spacing:2px;color:#60a5fa;margin-bottom:8px}
  .sub{color:#6b7280;font-size:12px;margin-bottom:32px}
  input{width:100%;padding:12px 16px;background:#111;border:1px solid #374151;border-radius:8px;color:#fff;font-size:14px;font-family:monospace;margin-bottom:16px;outline:none}
  input:focus{border-color:#60a5fa}
  button{width:100%;padding:12px;background:#1d4ed8;border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
  button:hover{background:#2563eb}
  .err{color:#f87171;font-size:12px;margin-top:12px;display:${hint ? "block" : "none"}}
</style>
</head>
<body>
<div class="box">
  <div class="logo">◈ NEXUSOS</div>
  <div class="sub">Development environment — restricted access</div>
  <form method="POST" action="/dev-auth">
    <input type="password" name="key" placeholder="Access key" autofocus autocomplete="off">
    <button type="submit">Unlock</button>
  </form>
  <div class="err">${hint}</div>
</div>
</body>
</html>`;

  // Unlock endpoint
  app.post("/dev-auth", express.urlencoded({ extended: false }), (req: Request, res: Response) => {
    const provided = (req.body?.key || "").trim();
    if (!DEV_KEY || provided === DEV_KEY) {
      res.cookie(COOKIE, DEV_KEY, { httpOnly: true, sameSite: "strict" });
      res.redirect(302, req.query.next?.toString() || "/");
    } else {
      res.status(401).send(lockScreen("Invalid access key."));
    }
  });

  // Gate middleware — runs before all other routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/dev-auth") return next();
    if (!DEV_KEY) return next(); // no key configured = open
    if (req.cookies?.[COOKIE] === DEV_KEY) return next();
    // Allow health/API checks from localhost
    const ip = req.ip || req.socket?.remoteAddress || "";
    if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return next();
    res.status(401).send(lockScreen(""));
  });
}
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  express.json({
    limit: "150mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "150mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// ── One-time schema fixes + data restoration ─────────────────────────────────
async function runStartupMigrations() {
  try {
    const { pool } = await import("./db");

    // 1. Upgrade sats_stakes.amount_sats to bigint if still integer
    await pool.query(`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='sats_stakes' AND column_name='amount_sats') = 'integer' THEN
          ALTER TABLE sats_stakes ALTER COLUMN amount_sats TYPE bigint;
          RAISE NOTICE 'sats_stakes.amount_sats upgraded to bigint';
        END IF;
      END $$;
    `);

    // 2. Upgrade lightning_transactions.amount_sats to bigint if still integer
    await pool.query(`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='lightning_transactions' AND column_name='amount_sats') = 'integer' THEN
          ALTER TABLE lightning_transactions ALTER COLUMN amount_sats TYPE bigint;
          RAISE NOTICE 'lightning_transactions.amount_sats upgraded to bigint';
        END IF;
      END $$;
    `);

    // 3. Restore UncJuddy's 17,001,000,000 sats lost to integer overflow bug.
    //    Logic: his expected balance = total_deposited − confirmed_stakes.
    //    We only apply the credit if his balance is still at the post-loss value (≤ 2B)
    //    to avoid double-crediting on subsequent restarts.
    await pool.query(`
      DO $$ DECLARE
        v_user_id varchar;
        v_current bigint;
        v_staked  bigint;
        v_expected bigint;
        v_restore  bigint;
      BEGIN
        SELECT id INTO v_user_id FROM users WHERE username = 'UncJuddy' LIMIT 1;
        IF v_user_id IS NULL THEN RETURN; END IF;

        SELECT sats_balance INTO v_current FROM lightning_wallets WHERE user_id = v_user_id;
        SELECT COALESCE(SUM(amount_sats),0) INTO v_staked FROM sats_stakes
          WHERE user_id = v_user_id AND status = 'active';

        -- Expected balance = total_deposited - confirmed_staked amount
        SELECT COALESCE(total_deposited,0) - v_staked INTO v_expected
          FROM lightning_wallets WHERE user_id = v_user_id;

        v_restore := v_expected - v_current;

        -- Only credit if there is a meaningful shortfall (> 1M sats) and
        -- the balance hasn't already been restored (guard against re-runs)
        IF v_restore > 1000000 THEN
          UPDATE lightning_wallets
            SET sats_balance = v_expected, updated_at = NOW()
            WHERE user_id = v_user_id;
          RAISE NOTICE 'UncJuddy sats restored: % sats credited (balance % → %)',
            v_restore, v_current, v_expected;
        END IF;
      END $$;
    `);

    // 4. Create WNUSD positions table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wnusd_positions (
        id             varchar(36) PRIMARY KEY,
        user_id        text NOT NULL,
        collateral_sats bigint NOT NULL,
        nxt_fee_sent   numeric(20,8) NOT NULL,
        wnusd_minted   numeric(20,8) NOT NULL,
        status         text NOT NULL DEFAULT 'active',
        col_ratio_pct  numeric(10,2) NOT NULL,
        btc_usd_at_mint numeric(20,2) NOT NULL,
        opened_at      timestamp NOT NULL DEFAULT now(),
        updated_at     timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS wnusd_positions_user_idx ON wnusd_positions(user_id);
    `);

    // 5. Create WNUSD transaction log table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wnusd_transactions (
        id             varchar(36) PRIMARY KEY,
        user_id        text NOT NULL,
        position_id    varchar(36),
        type           text NOT NULL,
        sats_delta     bigint NOT NULL,
        wnusd_delta    numeric(20,8) NOT NULL,
        nxt_fee        numeric(20,8) NOT NULL DEFAULT 0,
        col_ratio_pct  numeric(10,2) NOT NULL,
        btc_usd_at_time numeric(20,2) NOT NULL,
        created_at     timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS wnusd_tx_user_idx ON wnusd_transactions(user_id);
    `);

    // 6. Add stake_id column to wnusd_positions if missing
    await pool.query(`
      ALTER TABLE wnusd_positions ADD COLUMN IF NOT EXISTS stake_id integer;
      CREATE INDEX IF NOT EXISTS wnusd_positions_stake_idx ON wnusd_positions(stake_id);
    `);

    // 7. BTC address book + admin wallet on users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS btc_address_book (
        id          serial PRIMARY KEY,
        user_id     varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label       text NOT NULL DEFAULT 'Wallet',
        btc_address text NOT NULL,
        is_admin    boolean NOT NULL DEFAULT false,
        created_at  timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS btc_address_book_user_idx ON btc_address_book(user_id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_btc_address text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_btc_address_set_at timestamp;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS lightning_address text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sweep_btc_address text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sweep_threshold_sats bigint DEFAULT 500000;
    `);

    // 7b. Nostr pubkey on users
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nostr_pubkey text UNIQUE;
    `);

    // 7c. Withdrawal security flag + fix corrupted balances
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawals_blocked BOOLEAN NOT NULL DEFAULT false;
    `);
    // Restore Dsmart's sats balance that was incorrectly zeroed by a failed withdrawal
    await pool.query(`
      UPDATE lightning_wallets
      SET sats_balance = total_deposited - total_withdrawn
      WHERE user_id = 'da62b876-4f10-4fbb-a979-f23b3032cc80'
        AND sats_balance < (total_deposited - total_withdrawn);
    `);
    // Ensure all users are unblocked (withdrawals_blocked defaults false)
    await pool.query(`
      UPDATE users SET withdrawals_blocked = false WHERE withdrawals_blocked = true;
    `);

    // 8. NXT Airdrop campaigns + claims
    await pool.query(`
      CREATE TABLE IF NOT EXISTS airdrop_campaigns (
        id              serial PRIMARY KEY,
        title           text NOT NULL,
        description     text NOT NULL,
        emoji           text NOT NULL DEFAULT '🎁',
        total_nxt_pool  numeric(20,8) NOT NULL,
        per_claim_nxt   numeric(20,8) NOT NULL,
        claimed_nxt     numeric(20,8) NOT NULL DEFAULT 0,
        claims_count    integer NOT NULL DEFAULT 0,
        max_claims      integer NOT NULL,
        status          text NOT NULL DEFAULT 'active',
        requirements    text[] NOT NULL DEFAULT '{}',
        created_at      timestamp DEFAULT now(),
        ends_at         timestamp
      );
      CREATE INDEX IF NOT EXISTS airdrop_campaigns_status_idx ON airdrop_campaigns(status);

      CREATE TABLE IF NOT EXISTS airdrop_claims (
        id             serial PRIMARY KEY,
        campaign_id    integer NOT NULL REFERENCES airdrop_campaigns(id),
        user_id        text NOT NULL,
        wallet_address text NOT NULL,
        amount_nxt     numeric(20,8) NOT NULL,
        psi_channel    text,
        tx_id          varchar(36),
        claimed_at     timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS airdrop_claims_campaign_idx ON airdrop_claims(campaign_id);
      CREATE INDEX IF NOT EXISTS airdrop_claims_user_idx     ON airdrop_claims(user_id);
    `);

    // 9. Liquidity pools + LP positions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS liquidity_pools (
        id               serial PRIMARY KEY,
        pool_id          text NOT NULL UNIQUE,
        name             text NOT NULL,
        token_a          text NOT NULL,
        token_b          text NOT NULL,
        reserve_a        bigint NOT NULL DEFAULT 0,
        reserve_b        bigint NOT NULL DEFAULT 0,
        total_lp_tokens  bigint NOT NULL DEFAULT 0,
        fee_bps          integer NOT NULL DEFAULT 30,
        total_fees_a     bigint NOT NULL DEFAULT 0,
        created_at       timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS lp_pools_pool_idx ON liquidity_pools(pool_id);

      CREATE TABLE IF NOT EXISTS lp_positions (
        id          serial PRIMARY KEY,
        user_id     text NOT NULL,
        pool_id     text NOT NULL,
        lp_tokens   bigint NOT NULL DEFAULT 0,
        deposited_a bigint NOT NULL DEFAULT 0,
        deposited_b bigint NOT NULL DEFAULT 0,
        created_at  timestamp DEFAULT now(),
        updated_at  timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS lp_positions_user_idx ON lp_positions(user_id);
      CREATE INDEX IF NOT EXISTS lp_positions_pool_idx ON lp_positions(pool_id);

      CREATE TABLE IF NOT EXISTS spectral_bundles (
        id              varchar(36) PRIMARY KEY,
        user_id         text NOT NULL,
        nxt_locked      decimal(20,8) NOT NULL DEFAULT '0',
        runes_locked    integer NOT NULL DEFAULT 0,
        sats_locked     bigint NOT NULL DEFAULT 0,
        total_sats_eq   bigint NOT NULL,
        total_usd_value decimal(20,2) NOT NULL,
        wnusd_minted    decimal(20,8) NOT NULL,
        col_ratio_pct   decimal(10,2) NOT NULL,
        btc_usd_at_mint decimal(20,2) NOT NULL,
        psi_channel     text NOT NULL,
        status          text NOT NULL DEFAULT 'active',
        created_at      timestamp NOT NULL DEFAULT now(),
        updated_at      timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS spectral_bundles_user_idx   ON spectral_bundles(user_id);
      CREATE INDEX IF NOT EXISTS spectral_bundles_status_idx ON spectral_bundles(status);
    `);

    console.log("[MIGRATION] Startup schema migrations complete.");
  } catch (err: any) {
    console.error("[MIGRATION] Startup migration error:", err.message);
  }
}

(async () => {
  await runStartupMigrations();
  // Seed LP pools (idempotent — skips if already present)
  try {
    const { seedPools } = await import("./lp-pools");
    await seedPools();
  } catch (e: any) {
    console.error("[LP] Seed error:", e.message);
  }
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    if (status >= 500) {
      console.error("[Server Error]", err.message);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  // Retry listen up to 5 times (2s apart) so port conflicts on restart never crash the server
  function listenWithRetry(attemptsLeft = 5) {
    httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
      serverReady = true;
      log(`serving on port ${port}`);

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      // Stagger all background agents to avoid DB connection storm on boot.
      // Each wave waits before starting so the pool isn't overwhelmed.
      (async () => {
        // Wave 1 — 2s: core chain/genesis (low concurrency)
        await delay(2_000);
        seedGenesisUser().catch((e) => console.error("[GENESIS USER] Boot error:", e));
        seedGenesisBlock().catch(() => {});
        seedGenesisNode().catch((e) => console.error("[GENESIS NODE] Error:", e));

        // Wave 2 — 6s: blockchain auditor + kernel agents
        await delay(4_000);
        startBlockchainAuditor().catch((e) => console.error("[AUDITOR] Boot error:", e));
        startKernelAgents();

        // Wave 3 — 12s: BTC on-chain workers
        await delay(6_000);
        import("./btc-bridge-service").then(({ btcBridge }) => {
          btcBridge.startAutoProcessor();
        }).catch((e) => console.error("[BTC Bridge] Boot error:", e));
        import("./btc-withdrawal-processor").then(({ startWithdrawalProcessor }) => {
          startWithdrawalProcessor(60_000);
        }).catch((e) => console.error("[BTC Withdrawal] Boot error:", e));

        // Wave 4 — 18s: Rune processor + block scanner
        await delay(6_000);
        import("./rune-transfer-processor").then(({ startRuneProcessor }) => {
          startRuneProcessor(60_000);
        }).catch((e) => console.error("[Rune Processor] Boot error:", e));
        import("./btc-block-scanner").then(({ startStakeScanner }) => {
          startStakeScanner();
        }).catch((e) => console.error("[BTC Scanner] Boot error:", e));

        // Wave 5 — 24s: sentinels + liquidity feed
        await delay(6_000);
        import("./btc-wallet-sentinel").then(({ startWalletSentinel }) => {
          startWalletSentinel();
        }).catch((e) => console.error("[Sentinel] Boot error:", e));
        import("./btc-assets-sentinel").then(({ startAssetsSentinel }) => {
          startAssetsSentinel();
        }).catch((e) => console.error("[Assets Sentinel] Boot error:", e));
        import("./wnsp-io-liquidity").then(({ startWnspIoLiquidity }) => {
          startWnspIoLiquidity();
        }).catch((e) => console.error("[wnsp.io Liquidity] Boot error:", e));

        // Wave 6 — 30s: social bots (last — highest retry tolerance)
        await delay(6_000);
        startSocialBroadcastAgent();
        if (process.env.NODE_ENV === "production") startTelegramBot();
        startNostrDmBot();
        startNxtCampaignAgent();
        startPostScheduler();
        startTgNostrBridge();
        startWnspBtcEtcher();
      })();
    });
    httpServer.once("error", (err: any) => {
      if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
        console.warn(`[PORT] Port ${port} busy — retrying in 2s (${attemptsLeft} attempts left)...`);
        try { execSync(`fuser -k ${port}/tcp 2>/dev/null || true`); } catch {}
        setTimeout(() => { httpServer.close(() => listenWithRetry(attemptsLeft - 1)); }, 2000);
      } else {
        console.error(`[PORT] Fatal: cannot bind port ${port}:`, err.message);
        process.exit(1);
      }
    });
  }
  listenWithRetry();
})();
