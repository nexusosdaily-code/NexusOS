import type { Request, Response, NextFunction } from "express";

export const HONEYPOT_PATHS = new Set<string>([
  // ── Environment & secrets ────────────────────────────────────────────────────
  "/.env", "/.env.local", "/.env.production", "/.env.backup", "/.env.example",
  "/.env.dev", "/.env.staging", "/.env.test", "/.env.bak", "/.env.old",
  "/.env.save", "/env", "/env.json", "/environment",

  // ── Git ───────────────────────────────────────────────────────────────────────
  "/.git", "/.git/config", "/.git/HEAD", "/.gitignore", "/.gitconfig",
  "/.git/refs/heads/main", "/.git/logs/HEAD", "/.git/COMMIT_EDITMSG",

  // ── Server config ────────────────────────────────────────────────────────────
  "/.htaccess", "/.htpasswd", "/web.config", "/WebConfig", "/appsettings.json",
  "/nginx.conf", "/httpd.conf", "/lighttpd.conf", "/server.xml",

  // ── Admin panels ─────────────────────────────────────────────────────────────
  "/admin", "/admin/", "/administrator", "/admin.php", "/admin.html",
  "/Admin", "/ADMIN", "/admin/login", "/admin/dashboard", "/admin/users",
  "/admin/panel", "/cp", "/controlpanel", "/control-panel", "/management",
  "/manage", "/dashboard", "/backend", "/superadmin", "/root",

  // ── WordPress ────────────────────────────────────────────────────────────────
  "/wp-admin", "/wp-admin/", "/wp-login.php", "/wp-config.php", "/wordpress",
  "/wp-includes", "/wp-content", "/xmlrpc.php", "/wp-cron.php",
  "/wp-json/wp/v2/users",

  // ── PHP admin tools ──────────────────────────────────────────────────────────
  "/phpmyadmin", "/phpmyadmin/", "/pma", "/myadmin", "/mysql",
  "/php", "/php.php", "/test.php", "/info.php", "/phpinfo.php",
  "/upload.php", "/shell.php", "/cmd.php", "/c99.php", "/r57.php",

  // ── Config / backup files ────────────────────────────────────────────────────
  "/config", "/config.php", "/configuration.php", "/config.yml", "/config.yaml",
  "/config.json", "/config.toml", "/settings.py", "/settings.json",
  "/backup", "/backups", "/backup.sql", "/db.sql", "/database.sql",
  "/dump.sql", "/data.sql", "/site.sql", "/prod.sql",
  "/.DS_Store", "/Thumbs.db",

  // ── Debug / shell ────────────────────────────────────────────────────────────
  "/debug", "/trace", "/console", "/shell", "/cmd", "/exec",
  "/eval", "/run", "/execute", "/invoke",

  // ── Server status ────────────────────────────────────────────────────────────
  "/server-status", "/server-info", "/nginx-status", "/nginx_status",
  "/apache-status", "/status", "/health-check",

  // ── Spring Boot / Java actuator ──────────────────────────────────────────────
  "/actuator", "/actuator/env", "/actuator/health", "/actuator/info",
  "/actuator/beans", "/actuator/metrics", "/actuator/mappings",
  "/actuator/heapdump", "/actuator/threaddump", "/actuator/loggers",
  "/actuator/httptrace", "/actuator/auditevents",

  // ── Tomcat manager ───────────────────────────────────────────────────────────
  "/manager", "/manager/html", "/manager/text",
  "/host-manager", "/host-manager/html",

  // ── Search engine admin ──────────────────────────────────────────────────────
  "/solr", "/solr/admin", "/elasticsearch", "/elastic", "/_cat",
  "/_cluster/health", "/_nodes", "/_all", "/_search",

  // ── CI/CD ─────────────────────────────────────────────────────────────────────
  "/jenkins", "/jenkins/", "/hudson", "/gitlab", "/circleci",
  "/.travis.yml", "/.circleci", "/Jenkinsfile",

  // ── Cloud credentials ────────────────────────────────────────────────────────
  "/.aws", "/.aws/credentials", "/.aws/config",
  "/.azure", "/.gcloud", "/.kube/config",
  "/aws-config", "/aws.yml", "/gcp-credentials.json",

  // ── API probes — generic ─────────────────────────────────────────────────────
  "/api/admin", "/api/debug", "/api/config", "/api/env",
  "/api/v1/admin", "/api/v2/admin", "/api/internal",
  "/api/users", "/api/all-users", "/api/user/list", "/api/user/all",
  "/api/accounts", "/api/system", "/api/status/internal",
  "/api/secret", "/api/secrets", "/api/keys", "/api/private",
  "/api/dump", "/api/export", "/api/backup",
  "/api/log", "/api/logs", "/api/audit",
  "/api/v1", "/api/v2", "/api/v3",

  // ── Crypto / financial probes — targeted at wallets, keys, funds ─────────────
  "/api/withdraw", "/api/withdrawal", "/api/withdrawals",
  "/api/sweep", "/api/drain", "/api/transfer-all",
  "/api/seed", "/api/mnemonic", "/api/private-key", "/api/privkey",
  "/api/wallet/seed", "/api/wallet/export", "/api/wallet/backup",
  "/api/btc/sign", "/api/btc/broadcast", "/api/btc/sweep",
  "/api/lightning/admin", "/api/lightning/seed", "/api/lightning/macaroon",
  "/api/crypto/keys", "/api/crypto/sign",
  "/api/nxt/mint-all", "/api/nxt/drain", "/api/treasury/drain",

  // ── GraphQL (NexusOS is REST only) ───────────────────────────────────────────
  "/graphql", "/api/graphql", "/gql", "/query",

  // ── Monitoring ───────────────────────────────────────────────────────────────
  "/metrics", "/prometheus", "/_metrics", "/statsd",

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────────
  "/swagger", "/swagger-ui", "/swagger-ui.html", "/swagger-ui/",
  "/api-docs", "/api-docs/", "/openapi.json", "/openapi.yaml",
  "/v2/api-docs", "/v3/api-docs", "/redoc",

  // ── Unix system files ────────────────────────────────────────────────────────
  "/etc/passwd", "/etc/shadow", "/etc/hosts",
  "/proc/self/environ", "/proc/self/cmdline",

  // ── Directory traversal decoys ───────────────────────────────────────────────
  "/../etc/passwd", "/../../etc/passwd",
  "/%2e%2e%2fetc%2fpasswd", "/%2e%2e/%2e%2e/etc/passwd",
  "/..%2F..%2Fetc%2Fpasswd",

  // ── CMS targets ──────────────────────────────────────────────────────────────
  "/joomla", "/drupal", "/typo3", "/magento", "/prestashop",
  "/Magento", "/opencart", "/oscommerce",

  // ── Common recon ────────────────────────────────────────────────────────────
  "/robots.bak", "/sitemap.bak",
  "/credentials", "/secrets", "/private",
  "/cgi-bin", "/cgi-bin/",
  "/.well-known/private", "/.well-known/api-key",

  // ── Node.js specific ─────────────────────────────────────────────────────────
  "/package.json", "/package-lock.json", "/yarn.lock", "/pnpm-lock.yaml",
  "/node_modules", "/dist/index.js", "/dist/server.js",
  "/tsconfig.json", "/vite.config.ts", "/vite.config.js",

  // ── SSRF probes ──────────────────────────────────────────────────────────────
  "/api/fetch?url=http://169.254.169.254",
  "/api/proxy?target=http://localhost",
  "/redirect?to=http://169.254.169.254",
]);

// ── Paths whose hits should trigger an immediate Telegram alert ───────────────
const HIGH_ALERT_PATHS = new Set<string>([
  "/api/withdraw", "/api/withdrawal", "/api/sweep", "/api/drain",
  "/api/seed", "/api/mnemonic", "/api/private-key", "/api/privkey",
  "/api/wallet/seed", "/api/wallet/export", "/api/btc/sweep",
  "/api/lightning/seed", "/api/lightning/macaroon",
  "/api/nxt/drain", "/api/treasury/drain",
  "/etc/passwd", "/proc/self/environ",
  "/.aws/credentials", "/.env.production",
]);

async function sendHoneypotAlert(req: Request, path: string): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const channel = process.env.TELEGRAM_CHANNEL_ID;
    if (!token || !channel) return;

    const ip      = ((req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    const ua      = (req.headers["user-agent"] || "unknown").slice(0, 120);
    const country = (req.headers["x-country"] as string) || "unknown";
    const severity = HIGH_ALERT_PATHS.has(path) ? "🚨 HIGH" : "⚠️ HONEYPOT";

    const msg = [
      `${severity} HIT — NexusOS`,
      ``,
      `Path    : \`${path}\``,
      `IP      : \`${ip}\``,
      `Country : ${country}`,
      `Agent   : \`${ua}\``,
      `Time    : ${new Date().toISOString()}`,
      `Method  : ${req.method}`,
    ].join("\n");

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    channel,
        text:       msg,
        parse_mode: "Markdown",
      }),
    });
  } catch (_) { /* never block on alert failure */ }
}

export function honeypotMiddleware(req: Request, res: Response, next: NextFunction) {
  const p = req.path;
  if (HONEYPOT_PATHS.has(p) || HONEYPOT_PATHS.has(p.toLowerCase())) {
    res.locals.honeypotHit = true;
    // Fire Telegram alert asynchronously — don't block the 404 response
    sendHoneypotAlert(req, p);
    return res.status(404).json({ error: "Not found" });
  }
  next();
}

export function isHoneypotPath(p: string): boolean {
  return HONEYPOT_PATHS.has(p) || HONEYPOT_PATHS.has(p.toLowerCase());
}
