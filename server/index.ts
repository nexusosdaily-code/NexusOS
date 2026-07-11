import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn, execSync, ChildProcess } from "child_process";
import { seedGenesisBlock } from "./genesis";
import { seedGenesisUser, seedReplitAIAccount, seedBlockedEntities } from "./genesis_user";
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

// ── Global crash guards ────────────────────────────────────────────────────
// Without these, a single unhandled rejection in any background agent kills
// the entire process in Node 18+, causing the uptime monitor to record an outage.
process.on("uncaughtException", (err) => {
  console.error("[CRASH GUARD] Uncaught exception — server staying up:", err?.message ?? err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRASH GUARD] Unhandled rejection — server staying up:", reason);
});

startFlaskAPI();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Gzip all responses — halves JS/HTML transfer sizes on mobile
app.use(compression());
app.use(cookieParser());

import { trafficLoggerMiddleware } from "./traffic-logger";
app.use(trafficLoggerMiddleware);
import { startGeoIpEnricher } from "./geoip-enricher";

import { honeypotMiddleware } from "./honeypot";
app.use(honeypotMiddleware);

// Security headers — remove fingerprinting, add comprehensive protections
app.disable("x-powered-by");
app.use((req, res, next) => {
  // Request tracing — every request gets a unique ID for forensic correlation
  const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.setHeader("X-Request-ID", requestId);

  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Framing — allow only same-origin iframes
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // HSTS — force HTTPS for 1 year including subdomains
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Referrer — send origin only on cross-origin requests
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable browser features that NexusOS does not use
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");

  // Cross-origin isolation — allow popups for OAuth flows but isolate the main context
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  // Block Adobe Flash / PDF cross-domain policy files
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  // Content Security Policy — tightened per environment
  // Dev:  unsafe-eval allowed (Vite HMR source maps); ws: allowed (Vite HMR websocket)
  // Prod: unsafe-eval removed; ws: removed (HTTPS only, no plaintext WebSocket needed)
  const isProd = process.env.NODE_ENV === "production";
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  const connectSrc = isProd
    ? "connect-src 'self' wss: https:"
    : "connect-src 'self' ws: wss: https:";

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      connectSrc,
      "worker-src 'self' blob:",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  next();
});

// ── Attack-extension block ────────────────────────────────────────────────────
// Return 404 immediately for file extensions that do not exist in NexusOS.
// Without this, the SPA fallback serves HTTP 200 to PHP/ASP/CGI probes,
// which signals to scanners "something lives here — keep probing."
// Covers: server-side scripts, infrastructure secrets, backups, databases, archives.
const ATTACK_EXTS = /\.(php\d*|asp|aspx|cgi|do|jsp|jspx|pl|rb|sh|cfm|shtml|phtml|tfstate|tfvars|bak|backup|sql|sqlite|sqlite3|db|tar|gz|zip|rar|7z|swp|tmp|log|env|pem|key|p12|pfx|ovpn)$/i;
app.use((req: Request, res: Response, next: NextFunction) => {
  if (ATTACK_EXTS.test(req.path)) return res.status(404).end();
  next();
});

// ── Custom domain hostname redirects ─────────────────────────────────────────
// Each branded domain lands visitors on its product page.
const DOMAIN_ROUTES: Record<string, string> = {
  "ide-vm.io":             "/spectral-ide",
  "www.ide-vm.io":         "/spectral-ide",
  "psivm.io":              "/wnsp-vm",
  "www.psivm.io":          "/wnsp-vm",
  "k1os.io":               "/wavelength-lang",
  "www.k1os.io":           "/wavelength-lang",
  "spectralrouter.io":     "/spectral-router",
  "www.spectralrouter.io": "/spectral-router",
  "spectralcontracts.io":  "/spectral-contracts",
  "www.spectralcontracts.io": "/spectral-contracts",
  "wnspnostr.io":          "/nostr-relay",
  "www.wnspnostr.io":      "/nostr-relay",
  "nexussdk.io":           "/mobile-sdk",
  "www.nexussdk.io":       "/mobile-sdk",
  "octivetone.io":         "/resonance-cavity",
  "www.octivetone.io":     "/resonance-cavity",
  "wnspfounders.org":      "/founders",
  "www.wnspfounders.org":  "/founders",
};
app.use((req, res, next) => {
  const host = req.hostname ?? "";
  const target = DOMAIN_ROUTES[host];
  if (target && req.path === "/") return res.redirect(301, target);
  next();
});

// ── /.well-known — registered early so Vite dev middleware cannot intercept ──
// RFC 9116 security.txt — gives TLM-Audit-Scanner, pathscan, and SecurityResearch
// a clear responsible disclosure channel instead of silence.
app.get("/.well-known/security.txt", (_req, res) => {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  res.status(200).type("text/plain").send(
    [
      "# NexusOS Security Contact",
      "# WNSP Physics-Based Civilization OS — AGPL-3.0",
      "Contact: mailto:security@wnsp.io",
      "Contact: https://wnsp.io/contact",
      `Expires: ${expires.toISOString()}`,
      "Canonical: https://wnsp.io/.well-known/security.txt",
      "Policy: https://wnsp.io/contact",
      "Preferred-Languages: en",
      "Scope: https://wnsp.io",
      "Acknowledgments: https://wnsp.io/contact",
      "",
      "# NexusOS is governed under AGPL-3.0.",
      "# Responsible disclosure is welcomed and acknowledged.",
    ].join("\n")
  );
});

// Google Digital Asset Links — answers GoogleAssociationService probes.
// Package names for the NexusOS Android SDK (fingerprints added on Play Store publish).
app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.status(200).json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "io.wnsp.nexusos",
        sha256_cert_fingerprints: [],
      },
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "io.psivm.nexusos",
        sha256_cert_fingerprints: [],
      },
    },
  ]);
});

// Apple App Site Association — iOS Universal Links support
app.get("/.well-known/apple-app-site-association", (_req, res) => {
  res.status(200).type("application/json").json({
    applinks: {
      apps: [],
      details: [{ appID: "io.wnsp.nexusos", paths: ["*"] }],
    },
    webcredentials: { apps: ["io.wnsp.nexusos"] },
  });
});

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
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// ── Auth route body guard ─────────────────────────────────────────────────────
// Login / register payloads are tiny (username + password). Reject anything
// above 4 KB to make request-flooding and oversized-payload attacks impractical.
app.use("/api/auth", (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  const raw = (req as any).rawBody as Buffer | undefined;
  if (raw && raw.length > 4096) {
    return res.status(413).json({ error: "Payload too large" });
  }
  next();
});

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
    // Fix Dsmart's balance: phantom NXT→sats swap + repeated Blink sync bug inflated
    // total_deposited to 500B sats. Real Blink wallet only ever held 49,961 sats.
    // Residual real balance after legitimate small swaps = 961 sats.
    await pool.query(`
      UPDATE lightning_wallets
      SET sats_balance   = 961,
          total_deposited = 49961,
          total_withdrawn = 0,
          updated_at      = now()
      WHERE user_id = 'da62b876-4f10-4fbb-a979-f23b3032cc80';
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

    // 10. Contract executions — persistent server-side VM execution records
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contract_executions (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contract_id    UUID NOT NULL,
        caller_user_id UUID,
        caller_address TEXT,
        channel_load   INTEGER NOT NULL DEFAULT 42,
        output         JSONB NOT NULL DEFAULT '[]',
        final_registers JSONB NOT NULL DEFAULT '[]',
        final_agents   JSONB NOT NULL DEFAULT '[]',
        cycle_count    INTEGER NOT NULL DEFAULT 0,
        halted         BOOLEAN NOT NULL DEFAULT false,
        truncated      BOOLEAN NOT NULL DEFAULT false,
        chain_tx_id    VARCHAR(36),
        executed_at    TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ce_contract  ON contract_executions(contract_id);
      CREATE INDEX IF NOT EXISTS idx_ce_executed  ON contract_executions(executed_at DESC);
    `);

    // 11. Spectral contracts table (Spectral IDE)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spectral_contracts (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL,
        name         TEXT NOT NULL,
        description  TEXT NOT NULL DEFAULT '',
        source_code  TEXT NOT NULL,
        bytecode     TEXT,
        assembly     TEXT,
        manifest     JSONB DEFAULT '[]',
        instr_count  INTEGER DEFAULT 0,
        status       TEXT DEFAULT 'draft',
        app_slug     TEXT UNIQUE,
        is_public    BOOLEAN DEFAULT true,
        deployed_at  TIMESTAMPTZ,
        created_at   TIMESTAMPTZ DEFAULT now(),
        updated_at   TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_sc_user ON spectral_contracts(user_id);
      CREATE INDEX IF NOT EXISTS idx_sc_slug ON spectral_contracts(app_slug) WHERE app_slug IS NOT NULL;
    `);

    // 12. Contract persistent state K/V store + contract NXT wallet balance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contract_state (
        contract_id UUID NOT NULL,
        key         TEXT NOT NULL,
        value       JSONB NOT NULL DEFAULT 'null',
        updated_at  TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (contract_id, key)
      );
      CREATE INDEX IF NOT EXISTS idx_cs_contract ON contract_state(contract_id);

      ALTER TABLE spectral_contracts ADD COLUMN IF NOT EXISTS contract_nxt_balance NUMERIC(20,8) NOT NULL DEFAULT 0;
    `);

    // 13. Contract Execution Audit Ledger — enrich blockchain_tx_pool & contract_executions
    await pool.query(`
      ALTER TABLE blockchain_tx_pool ADD COLUMN IF NOT EXISTS tx_type TEXT DEFAULT 'transfer';
      ALTER TABLE blockchain_tx_pool ADD COLUMN IF NOT EXISTS audit_meta JSONB DEFAULT NULL;
      CREATE INDEX IF NOT EXISTS idx_btp_tx_type ON blockchain_tx_pool(tx_type);

      ALTER TABLE contract_executions ADD COLUMN IF NOT EXISTS state_delta       JSONB DEFAULT '{}';
      ALTER TABLE contract_executions ADD COLUMN IF NOT EXISTS transfer_results  JSONB DEFAULT '[]';
      ALTER TABLE contract_executions ADD COLUMN IF NOT EXISTS subcall_results   JSONB DEFAULT '[]';
      ALTER TABLE contract_executions ADD COLUMN IF NOT EXISTS effects_count     INTEGER DEFAULT 0;
      ALTER TABLE contract_executions ADD COLUMN IF NOT EXISTS contract_name     TEXT;
      ALTER TABLE contract_executions ADD COLUMN IF NOT EXISTS contract_slug     TEXT;
      CREATE INDEX IF NOT EXISTS idx_ce_slug ON contract_executions(contract_slug) WHERE contract_slug IS NOT NULL;
    `);

    console.log("[MIGRATION] Startup schema migrations complete.");
  } catch (err: any) {
    console.error("[MIGRATION] Startup migration error:", err.message);
  }
}

(async () => {
  const port = parseInt(process.env.PORT || "5000", 10);
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ── Step 1: Bind port FIRST ───────────────────────────────────────────────
  // The uptime monitor probes / immediately on boot. Binding here — before
  // migrations and route registration — means the health check answers
  // within milliseconds instead of after the full startup sequence.
  // serverReady stays false so "/" returns 200 "ok" until routes are loaded.
  await new Promise<void>((resolve) => {
    function tryListen(attemptsLeft: number) {
      httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
        log(`port ${port} open — running startup tasks…`);
        resolve();
      });
      httpServer.once("error", (err: any) => {
        if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
          console.warn(`[PORT] Port ${port} busy — retrying in 2s (${attemptsLeft} left)…`);
          try { execSync(`fuser -k ${port}/tcp 2>/dev/null || true`); } catch {}
          setTimeout(() => { httpServer.close(() => tryListen(attemptsLeft - 1)); }, 2000);
        } else {
          console.error(`[PORT] Fatal: cannot bind port ${port}:`, err.message);
          process.exit(1);
        }
      });
    }
    tryListen(5);
  });

  // ── Step 2: Migrations + route registration (server already answering) ────
  await runStartupMigrations();
  try {
    const { seedPools } = await import("./lp-pools");
    await seedPools();
  } catch (e: any) {
    console.error("[LP] Seed error:", e.message);
  }
  await registerRoutes(httpServer, app);

  // Stage B: backfill lattice pubkeys for all existing users missing one
  import("./lattice-identity").then(({ backfillLatticePubKeys }) =>
    backfillLatticePubKeys().then(n => {
      if (n > 0) console.log(`[LatticeID] Stage B backfill — ${n} user(s) now have a channel lattice pubkey`);
    }).catch(() => {})
  ).catch(() => {});

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) res.status(status).json({ message });
    if (status >= 500) console.error("[Server Error]", err.message);
  });

  // Static serving must come after routes so the catch-all doesn't swallow API calls
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ── Step 3: Mark ready — full app now serving ─────────────────────────────
  serverReady = true;
  log(`serving on port ${port}`);

  // ── Step 4: Staggered background agents (server already up, no rush) ──────
  (async () => {
    // Wave 1 — 2s: core chain/genesis
    await delay(2_000);
    seedGenesisUser().catch((e) => console.error("[GENESIS USER] Boot error:", e));
    seedGenesisBlock().catch(() => {});
    seedGenesisNode().catch((e) => console.error("[GENESIS NODE] Error:", e));
    seedReplitAIAccount().catch((e) => console.error("[GENESIS] Replit AI seed error:", e));
    seedBlockedEntities().catch((e) => console.error("[GENESIS] Blocked entities error:", e));

    // Wave 2 — 6s: blockchain auditor + kernel agents
    await delay(4_000);
    startBlockchainAuditor().catch((e) => console.error("[AUDITOR] Boot error:", e));
    startKernelAgents();
    startGeoIpEnricher();

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

    // Wave 6 — 30s: social bots (highest retry tolerance)
    await delay(6_000);
    const _safe = (name: string, fn: () => void) => {
      try { fn(); } catch (e: any) { console.error(`[Wave6] ${name} failed to start:`, e?.message ?? e); }
    };
    _safe("SocialBroadcast",  () => startSocialBroadcastAgent());
    if (process.env.NODE_ENV === "production") _safe("TelegramBot", () => startTelegramBot());
    _safe("NostrDmBot",       () => startNostrDmBot());
    _safe("NxtCampaign",      () => startNxtCampaignAgent());
    _safe("PostScheduler",    () => startPostScheduler());
    _safe("TgNostrBridge",    () => startTgNostrBridge());
    _safe("WnspBtcEtcher",    () => startWnspBtcEtcher());
    try {
      const { startWnspWavelengthscriptEtcher } = await import("./wnsp-wavelengthscript-rune-etcher");
      startWnspWavelengthscriptEtcher();
    } catch (e: any) { console.error("[Wave6] WavelengthscriptEtcher failed to start:", e?.message ?? e); }
  })();
})();
