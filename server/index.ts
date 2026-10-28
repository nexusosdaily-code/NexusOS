import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { browserSessionRequestGuard } from "./browser-session-policy";
import { registerRoutes } from "./routes";
import { privateTrustInputBoundary, privateTrustInputError } from "./private-trust-boundary";
import { waveVaultInputBoundary, waveVaultInputError } from "./wave-vault-boundary";
import { serveStatic } from "./static";
import { createServer } from "http";
import { execSync } from "child_process";
import { SpectralProcess } from "./spectral-process";
import { seedGenesisBlock } from "./genesis";
import { seedGenesisUser, seedReplitAIAccount, seedBlockedEntities } from "./genesis_user";
import { sealConstitution, isTransientDbError } from "./constitution_seal";
import { bootState, handleSealError } from "./seal-boot-guard";
import { startBlockchainAuditor } from "./blockchain_auditor";
import { seedGenesisNode } from "./genesis_node";
import { startKernelAgents } from "./kernel_agents";
import { startSocialBroadcastAgent } from "./social_broadcast_agent";
import { startTelegramBot } from "./telegram-bot";
import { startNostrDmBot } from "./nostr-dm-bot";
import { startNxtCampaignAgent } from "./nxt-campaign-agent";
import { HARDWARE_REVIEW_HOLD, promotionsArePaused } from "../shared/hardware-readiness";
import { startPostScheduler } from "./post-scheduler";
import { startTgNostrBridge } from "./telegram-nostr-bridge";
import { startWnspBtcEtcher } from "./wnsp-btc-rune-etcher";
import { sealConstitutionWithRetry } from "./seal-retry";
import { assertPatchedNodeRuntime } from "./runtime-security";
import { browserContentSecurityPolicy } from "./browser-policy";
import { requestDiagnostics, requestErrorHandler } from "./http-diagnostics";
import { createApiResponseLogger } from "./api-response-logger";

// Fail before listeners, Python processes or background jobs start.
assertPatchedNodeRuntime(process.versions.node);
console.info(`[Runtime security] Node.js ${process.versions.node}; OpenSSL ${process.versions.openssl}`);
const app = express();
const httpServer = createServer(app);

const spectralProcess = new SpectralProcess();
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  await spectralProcess.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ── Global crash guards ────────────────────────────────────────────────────
// Without these, a single unhandled rejection in any background agent kills
// the entire process in Node 18+, causing the uptime monitor to record an outage.
process.on("uncaughtException", (err) => {
  console.error("[CRASH GUARD] Uncaught exception — server staying up:", err?.message ?? err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRASH GUARD] Unhandled rejection — server staying up:", reason);
});

// Required by the existing encode, upload and agent-bus routes in BOTH modes.
spectralProcess.start();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Gzip all responses — halves JS/HTML transfer sizes on mobile
// Observe completions even when a guard, parser or file server handles a request.
app.use(requestDiagnostics);
app.use(compression());
app.use(cookieParser());
app.use(browserSessionRequestGuard);

import { trafficLoggerMiddleware } from "./traffic-logger";
import { startGeoIpEnricher } from "./geoip-enricher";

import { honeypotMiddleware } from "./honeypot";

// Security headers — remove fingerprinting, add comprehensive protections
app.disable("x-powered-by");
app.use((req, res, next) => {
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

  res.setHeader("Content-Security-Policy",
    browserContentSecurityPolicy(process.env.NODE_ENV === "production"));

  next();
});

// Refused requests must receive the same security headers as normal requests.
// The traffic guard also inspects encoded private paths before static serving.
app.use(trafficLoggerMiddleware);
app.use(honeypotMiddleware);

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
  "wnspnostr.io":          "/nostr",
  "www.wnspnostr.io":      "/nostr",
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
  if (!target) return next();
  // For root requests, send to the product page on wnsp.io.
  // For all other paths, redirect to the same path on wnsp.io so crawlers
  // never index duplicate content under a branded hostname.
  const destination = req.path === "/"
    ? `https://wnsp.io${target}`
    : `https://wnsp.io${req.path}`;
  return res.redirect(301, destination);
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
app.get("/health", (_req, res) => res.json({
  status:   bootState.degraded || !spectralProcess.ready ? "degraded" : "ok",
  ready:    serverReady,
  degraded: bootState.degraded,
  spectralReady: spectralProcess.ready,
  ...(bootState.sealError ? { sealError: bootState.sealError } : {}),
  ts: Date.now(),
}));
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
      const raw = req.query.next?.toString() ?? "";
      const safePath = /^\/[^/\\]/.test(raw) ? raw : "/";
      res.redirect(302, safePath);
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

app.use("/api/private-trusts", ...privateTrustInputBoundary, privateTrustInputError);
app.use("/api/wave-vault", ...waveVaultInputBoundary, waveVaultInputError);
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      if (!req.url?.startsWith("/api/private-trusts")) req.rawBody = buf;
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

// Private file requests retain requestDiagnostics' status/timing/request IDs,
// but must never enter the legacy path/JSON response logger.
app.use(createApiResponseLogger(log));

// Development schema bootstrap only. Production changes belong to an explicit
// maintenance operation, never to the application lifecycle.
async function runStartupMigrations() {
  if (process.env.NODE_ENV !== "development") return;
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

    // Historical overflow and phantom-deposit repairs are NOT replayed here.
    // Existing corrected balances stay intact. Any further correction requires
    // the separately approved maintenance process in scripts/correct-lightning-balance.ts.

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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS p2p_broadcast_muted boolean NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_btc_address_set_at timestamp;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS lightning_address text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sweep_btc_address text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sweep_threshold_sats bigint DEFAULT 500000;
    `);

    // 7b. Nostr pubkey on users
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nostr_pubkey text UNIQUE;
    `);

    // 7c. Withdrawal security flag (development schema only)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawals_blocked BOOLEAN NOT NULL DEFAULT false;
    `);
    // Existing withdrawal restrictions are persistent administrative decisions.
    // Never clear them as part of startup.

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

      -- Dynamic blocks: one-click blocks added from Telegram probe alerts
      CREATE TABLE IF NOT EXISTS dynamic_blocks (
        id       SERIAL PRIMARY KEY,
        field    TEXT NOT NULL,
        value    TEXT NOT NULL,
        label    TEXT NOT NULL DEFAULT 'Dynamic-Block',
        added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS dynamic_blocks_field_idx ON dynamic_blocks (field);
    `);

    console.log("[MIGRATION] Startup schema migrations complete.");
    // Pre-populate the dynamic block snapshot so blocks saved before this
    // restart are enforced immediately rather than waiting for the first hit.
    import("./traffic-logger").then(({ invalidateDynamicBlockCache }) => {
      invalidateDynamicBlockCache();
    }).catch(() => {});
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

  // Static serving must come after routes so the catch-all doesn't swallow API calls
  // Unknown API requests must never masquerade as successful HTML responses.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }
  app.use(requestErrorHandler);

  // ── Step 3: Mark ready — full app now serving ─────────────────────────────
  serverReady = true;
  log(`serving on port ${port}`);

  // ── Step 4: Staggered background agents (server already up, no rush) ──────
  (async () => {
    // Wave 1 — 2s: core chain/genesis
    await delay(2_000);
    seedGenesisUser().catch((e) => console.error("[GENESIS USER] Boot error:", e));
    // sealConstitution runs AFTER seedGenesisBlock to avoid block-number races.
    // Wrapped with retry logic for transient DB connectivity errors that are
    // common on first boot in production (DNS not yet ready, pool cold-start).
    seedGenesisBlock()
      .then(() => sealConstitutionWithRetry())
      .then((sealed) => {
        if (sealed === true) {
          console.log("[CONSTITUTION] Fresh seal written to chain — boot complete.");
        }
        // false = already existed, which is the normal path on restarts
      })
      .catch((e: any) => {
        // Mark boot degraded + emit [FATAL] log (never silent)
        handleSealError(e);

        // Background recovery — the DB may still be warming up after the fast
        // retry window (10 × 8 s = 80 s).  Try every 30 s for up to 5 minutes
        // before alerting the founder.  This prevents spurious BOOT ALERT
        // messages when the Replit internal PostgreSQL host ("helium") takes
        // longer than 80 s to become reachable on a cold boot.
        const BACKGROUND_ATTEMPTS  = 10;  // 10 × 30 s = 5 min
        const BACKGROUND_DELAY_MS  = 30_000;

        (async () => {
          let recovered = false;
          for (let attempt = 1; attempt <= BACKGROUND_ATTEMPTS; attempt++) {
            await new Promise<void>((r) => setTimeout(r, BACKGROUND_DELAY_MS));
            try {
              await sealConstitution();
              // Healed — clear the degraded flag so /health goes green
              bootState.degraded  = false;
              bootState.sealError = null;
              console.log(
                `[CONSTITUTION] 🟢 Background recovery succeeded (attempt ${attempt}/${BACKGROUND_ATTEMPTS}) — server healthy.`,
              );
              recovered = true;
              break;
            } catch (bgErr: any) {
              const bgMsg: string = bgErr?.message ?? String(bgErr);
              if (!isTransientDbError(bgMsg)) {
                // Permanent error (schema missing, etc.) — no point retrying
                console.error(
                  `[CONSTITUTION] Background recovery hit a permanent error — aborting: ${bgMsg.slice(0, 200)}`,
                );
                break;
              }
              console.warn(
                `[CONSTITUTION] Background recovery attempt ${attempt}/${BACKGROUND_ATTEMPTS} failed (transient): ${bgMsg.slice(0, 120)}`,
              );
            }
          }

          if (!recovered) {
            // Still degraded after 5 minutes — this is a genuine outage.
            // Alert the founder now.
            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (token) {
              const msg = e?.message ?? String(e);
              fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: "-1002572762871",
                  parse_mode: "HTML",
                  text: `🚨 <b>NexusOS BOOT ALERT</b>\n<b>sealConstitution() FATAL failure</b>\n\nServer is running DEGRADED — constitution block was NOT written.\n/health returns <code>degraded: true</code> until fixed.\n\n<b>Error:</b> ${msg.slice(0, 300)}`,
                }),
              }).catch(() => {});
            }
          }
        })();
      });
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
    // Engineering hold takes precedence over legacy campaign configuration.
    if (promotionsArePaused()) {
      console.log(`[NxtCampaign] Paused — ${HARDWARE_REVIEW_HOLD.reason}`);
    } else if (process.env.CAMPAIGN_ENABLED === "true") {
      _safe("NxtCampaign",    () => startNxtCampaignAgent());
    } else {
      console.log("[NxtCampaign] Disabled by configuration");
    }
    _safe("PostScheduler",    () => startPostScheduler());
    _safe("TgNostrBridge",    () => startTgNostrBridge());
    _safe("WnspBtcEtcher",    () => startWnspBtcEtcher());
    try {
      const { startWnspWavelengthscriptEtcher } = await import("./wnsp-wavelengthscript-rune-etcher");
      startWnspWavelengthscriptEtcher();
    } catch (e: any) { console.error("[Wave6] WavelengthscriptEtcher failed to start:", e?.message ?? e); }
  })();
})();
