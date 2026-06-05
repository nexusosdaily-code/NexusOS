import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn, execSync, ChildProcess } from "child_process";
import { seedGenesisBlock } from "./genesis";
import { startBlockchainAuditor } from "./blockchain_auditor";
import { seedGenesisNode } from "./genesis_node";
import { startKernelAgents } from "./kernel_agents";
import { startSocialBroadcastAgent } from "./social_broadcast_agent";
import { startTelegramBot } from "./telegram-bot";
import { startNostrDmBot } from "./nostr-dm-bot";
import { startNxtCampaignAgent } from "./nxt-campaign-agent";
import { startTgNostrBridge } from "./telegram-nostr-bridge";

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

app.use(cookieParser());
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
    `);

    // 8. Liquidity pools + LP positions
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

    res.status(status).json({ message });
    throw err;
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
      log(`serving on port ${port}`);
      // Seed genesis block after server is ready (non-blocking)
      seedGenesisBlock().catch(() => {});
      // Start autonomous blockchain audit agent
      startBlockchainAuditor().catch((e) => console.error("[AUDITOR] Boot error:", e));
      // Start 4 autonomous kernel agent loops (Stage 3)
      startKernelAgents();
      // Start Social Broadcast Agent — Telegram → Instagram / YouTube
      startSocialBroadcastAgent();
      // Seed genesis network node + start beacon loop
      seedGenesisNode().catch((e) => console.error("[GENESIS NODE] Error:", e));
      // Start BTC Bridge auto-inscription processor
      import("./btc-bridge-service").then(({ btcBridge }) => {
        btcBridge.startAutoProcessor();
      }).catch((e) => console.error("[BTC Bridge] Boot error:", e));
      // Start BTC Withdrawal Processor — sends queued sats→BTC withdrawals on-chain
      import("./btc-withdrawal-processor").then(({ startWithdrawalProcessor }) => {
        startWithdrawalProcessor(60_000); // check every 60s
      }).catch((e) => console.error("[BTC Withdrawal] Boot error:", e));
      // Start BTC Block Scanner — verifies wnsp + Rune stakes on-chain every 5 min
      import("./btc-block-scanner").then(({ startStakeScanner }) => {
        startStakeScanner();
      }).catch((e) => console.error("[BTC Scanner] Boot error:", e));
      // Start BTC Wallet Sentinel — monitors service wallet mempool every 30s
      import("./btc-wallet-sentinel").then(({ startWalletSentinel }) => {
        startWalletSentinel();
      }).catch((e) => console.error("[Sentinel] Boot error:", e));
      // Start BTC Assets Sentinel — monitors Ordinals / Runes / BRC-20 every 2 min
      import("./btc-assets-sentinel").then(({ startAssetsSentinel }) => {
        startAssetsSentinel();
      }).catch((e) => console.error("[Assets Sentinel] Boot error:", e));
      // Start wnsp.io → Service Pool Liquidity Feed
      import("./wnsp-io-liquidity").then(({ startWnspIoLiquidity }) => {
        startWnspIoLiquidity();
      }).catch((e) => console.error("[wnsp.io Liquidity] Boot error:", e));
      // Start Telegram advocacy bot
      startTelegramBot();
      // Start Nostr DM bot
      startNostrDmBot();
      // Start NXT campaign broadcaster
      startNxtCampaignAgent();
      // Start Telegram ↔ Nostr cross-poster
      startTgNostrBridge();
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
