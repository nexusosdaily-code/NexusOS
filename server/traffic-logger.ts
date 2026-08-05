import type { Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { isHoneypotPath } from "./honeypot";
import { ipCountryCache, ipHostingCache } from "./geoip-enricher";

// ── Unknown-probe threshold alerting ─────────────────────────────────────────
// Fires a Telegram admin alert when a single unrecognised referer or
// User-Agent string not in any block list *exceeds* ALERT_THRESHOLD hits
// within a true sliding WINDOW_MS window. A per-key cooldown (COOLDOWN_MS)
// prevents the same key from re-alerting more than once per hour.

const ALERT_THRESHOLD = (() => {
  const v = parseInt(process.env.PROBE_ALERT_THRESHOLD ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : 5;
})();                                          // alert fires when hits EXCEED this value (default 5; override via PROBE_ALERT_THRESHOLD)
const WINDOW_MS       = (() => {
  const v = parseFloat(process.env.PROBE_WINDOW_HOURS ?? "");
  return Number.isFinite(v) && v > 0 ? v * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
})();                                          // sliding window duration (default 24 h; override via PROBE_WINDOW_HOURS)
const COOLDOWN_MS     = (() => {
  const v = parseFloat(process.env.PROBE_ALERT_COOLDOWN_HOURS ?? "");
  return Number.isFinite(v) && v > 0 ? v * 60 * 60 * 1000 : 1 * 60 * 60 * 1000;
})();                                          // cooldown between alerts for same key (default 1 h; override via PROBE_ALERT_COOLDOWN_HOURS)

interface ProbeEntry {
  // True sliding window: each element is the epoch-ms timestamp of one hit.
  // Timestamps older than WINDOW_MS are evicted on each call so the array
  // always reflects only hits within the most recent 24 hours.
  hits:        number[]; // sorted ascending
  lastAlerted: number;   // epoch ms — last time we sent an alert (0 = never)
}

// Separate maps for referer keys and UA keys so the same string in both
// fields doesn't trigger double-counting against a single counter.
const refererProbes = new Map<string, ProbeEntry>();
const uaProbes      = new Map<string, ProbeEntry>();

let lastPrune = 0;
function pruneProbes(now: number): void {
  if (now - lastPrune < 60 * 60 * 1000) return;
  lastPrune = now;
  const cutoff = now - WINDOW_MS;
  for (const [key, entry] of refererProbes) {
    const hasActiveHits = entry.hits.length > 0 && entry.hits[entry.hits.length - 1] >= cutoff;
    const hasActiveCooldown = entry.lastAlerted > 0 && now - entry.lastAlerted < COOLDOWN_MS;
    if (!hasActiveHits && !hasActiveCooldown) refererProbes.delete(key);
  }
  for (const [key, entry] of uaProbes) {
    const hasActiveHits = entry.hits.length > 0 && entry.hits[entry.hits.length - 1] >= cutoff;
    const hasActiveCooldown = entry.lastAlerted > 0 && now - entry.lastAlerted < COOLDOWN_MS;
    if (!hasActiveHits && !hasActiveCooldown) uaProbes.delete(key);
  }
}

/** Escape a raw header value so it is safe to embed inside a Telegram HTML message. */
function escapeTelegramHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface DynamicBlockSnapshot {
  referers: Set<string>; // lowercased full value strings
  uas:      Set<string>; // exact value strings
}
const OWN_HOSTNAMES: readonly string[] = ["wnsp.io", "wnsp.tech"];

function isOwnOriginReferer(referer: string): boolean {
  if (!referer) return false;
  // Allow the Replit dev domain at runtime without hardcoding it.
  const devDomain = process.env.REPLIT_DEV_DOMAIN ?? "";
  try {
    const host = new URL(referer).hostname.toLowerCase().replace(/^www\./, "");
    if (devDomain && (host === devDomain || host.endsWith("." + devDomain))) return true;
    for (const own of OWN_HOSTNAMES) {
      if (host === own || host.endsWith("." + own)) return true;
    }
  } catch { /* malformed URL — not an own-origin ref */ }
  return false;
}

function recordProbe(
  map: Map<string, ProbeEntry>,
  key: string,
  label: "referer" | "ua",
  now: number,
): void {
  let entry = map.get(key);
  if (!entry) {
    entry = { hits: [], lastAlerted: 0 };
    map.set(key, entry);
  }

  // Evict hits that have fallen outside the sliding window.
  const cutoff = now - WINDOW_MS;
  let lo = 0;
  while (lo < entry.hits.length && entry.hits[lo] <= cutoff) lo++;
  if (lo > 0) entry.hits = entry.hits.slice(lo);

  // Record this hit.
  entry.hits.push(now);

  // Alert when the in-window count *exceeds* the threshold and the cooldown
  // period has elapsed since the last alert for this key.
  if (
    entry.hits.length > ALERT_THRESHOLD &&
    now - entry.lastAlerted >= COOLDOWN_MS
  ) {
    entry.lastAlerted = now;
    // Lazy-import to avoid circular deps; fire-and-forget.
    // sendProbeAlert sends the message with an inline "🚫 Add to block list" button.
    import("./telegram-bot").then(({ sendProbeAlert }) => {
      sendProbeAlert(label, key, entry.hits.length).catch(() => {});
    }).catch(() => {});
  }

  // Persist the new hit atomically (fire-and-forget).
  // We pass only the single new timestamp so PostgreSQL appends it in one
  // atomic statement — concurrent requests cannot overwrite each other's counts.
  persistProbeEntry(label, key, now, entry.lastAlerted, cutoff);
}

const PHP_SCANNER_PATHS = new Set([
  "/admin.php", "/file.php", "/wp-login.php", "/wp-admin.php",
  "/wp-admin", "/wp-config.php", "/wp-includes", "/xmlrpc.php",
  "/phpmyadmin", "/pma", "/myadmin", "/mysql", "/dbadmin",
  "/.env", "/.git/config", "/.aws/credentials",
  "/shell.php", "/c99.php", "/r57.php", "/cmd.php", "/webshell.php",
  "/config.php", "/setup.php", "/install.php", "/installer.php",
  "/backup.php", "/db.php", "/database.php", "/sql.php",
  "/filemanager.php", "/upload.php", "/manager.php",
  "/joomla", "/administrator", "/magento", "/drupal",
  "/cgi-bin/luci", "/cgi-bin/admin",
]);

const BOT_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /assetnote/i,           name: "Assetnote" },
  { pattern: /tlm[-_]audit/i,        name: "TLM-Audit-Scanner" },
  { pattern: /recordedfuture/i,       name: "RecordedFuture" },
  { pattern: /dataminr/i,             name: "Dataminr" },
  { pattern: /newsal/i,               name: "Newsal" },
  { pattern: /googlebot/i,            name: "Googlebot" },
  { pattern: /bingbot/i,              name: "Bingbot" },
  { pattern: /yandexbot/i,            name: "YandexBot" },
  { pattern: /semrushbot/i,           name: "SemrushBot" },
  { pattern: /ahrefsbot/i,            name: "AhrefsBot" },
  { pattern: /mj12bot/i,              name: "MJ12bot" },
  { pattern: /petalbot/i,             name: "PetalBot" },
  { pattern: /applebot/i,             name: "Applebot" },
  { pattern: /facebookexternalhit/i,  name: "FacebookBot" },
  { pattern: /twitterbot/i,           name: "TwitterBot" },
  { pattern: /linkedinbot/i,          name: "LinkedInBot" },
  { pattern: /discordbot/i,           name: "DiscordBot" },
  { pattern: /slackbot/i,             name: "SlackBot" },
  { pattern: /python-requests/i,      name: "Python-Requests" },
  { pattern: /go-http-client/i,       name: "Go-HTTP-Client" },
  { pattern: /curl\//i,               name: "cURL" },
  { pattern: /wget\//i,               name: "Wget" },
  { pattern: /axios/i,                name: "Axios" },
  { pattern: /nuclei/i,               name: "Nuclei-Scanner" },
  { pattern: /nikto/i,                name: "Nikto-Scanner" },
  { pattern: /nmap/i,                 name: "Nmap" },
  { pattern: /zgrab/i,                name: "ZGrab" },
  { pattern: /masscan/i,              name: "Masscan" },
  { pattern: /shodan/i,               name: "Shodan" },
  { pattern: /censys/i,               name: "Censys" },
  { pattern: /gitleaks/i,             name: "Gitleaks" },
  { pattern: /wnsp/i,                 name: "WNSP-Client" },
  { pattern: /help@dataminr/i,        name: "Dataminr" },
  { pattern: /newsai/i,               name: "NewsAI-Monitor" },
  { pattern: /netapi/i,               name: "DotNet-NetAPI" },
  { pattern: /Mac OS X 10[._]9/,      name: "Spoofed-Mavericks-UA" },
  { pattern: /GPTBot/i,               name: "OpenAI-GPTBot" },
  { pattern: /claude-web/i,           name: "Anthropic-ClaudeBot" },
  { pattern: /anthropic/i,            name: "Anthropic-Crawler" },
  { pattern: /cohere-ai/i,            name: "Cohere-AI" },
  { pattern: /perplexitybot/i,        name: "PerplexityBot" },
  { pattern: /amazonbot/i,            name: "AmazonBot" },
  { pattern: /duckduckbot/i,          name: "DuckDuckBot" },
  { pattern: /baiduspider/i,          name: "BaiduSpider" },
  { pattern: /bytespider/i,           name: "ByteDance-Spider" },
  { pattern: /tiktokbot/i,            name: "TikTokBot" },
  { pattern: /scrapy/i,               name: "Scrapy" },
  { pattern: /httpx/i,                name: "HTTPX-Client" },
  { pattern: /burpsuite/i,            name: "BurpSuite" },
  { pattern: /sqlmap/i,               name: "SQLMap" },
  { pattern: /whatweb/i,              name: "WhatWeb-Recon" },
  { pattern: /wapiti/i,               name: "Wapiti-Scanner" },
  { pattern: /dirbuster/i,            name: "DirBuster" },
  { pattern: /gobuster/i,             name: "GoBuster" },
  { pattern: /ffuf/i,                 name: "FFUF-Fuzzer" },
  { pattern: /pathscan/i,             name: "Pathscan-Enumerator" },
  { pattern: /domainwatcher/i,        name: "DomainWatcher" },
  { pattern: /subfinder/i,            name: "Subfinder" },
  { pattern: /httpie/i,               name: "HTTPie-Client" },
  { pattern: /feroxbuster/i,          name: "Feroxbuster" },
  { pattern: /katana/i,               name: "Katana-Crawler" },
  { pattern: /hakrawler/i,            name: "Hakrawler" },
  { pattern: /gau\//i,                name: "GAU-URLFetcher" },
  { pattern: /waybackurls/i,          name: "WaybackURLs" },
  { pattern: /brand[\s-]?protect/i,   name: "BrandProtection-Bot" },
  { pattern: /brandwatch/i,           name: "Brandwatch" },
  { pattern: /mention\.com/i,         name: "Mention-Monitor" },
  { pattern: /undici/i,               name: "Node-Undici-Client" },
  { pattern: /node-fetch/i,           name: "Node-Fetch-Client" },
  { pattern: /got\//i,                name: "Got-HTTP-Client" },
  { pattern: /superagent/i,           name: "SuperAgent-Client" },
  { pattern: /googleassociationservice/i, name: "GoogleAssociationService" },
  { pattern: /securityresearch/i,     name: "SecurityResearch" },

  // Legacy / feature-phone device signatures — no genuine visitor in 2026 runs
  // these stacks; almost always a scraper spoofing an obscure UA to dodge filters.
  { pattern: /NetFront/i,             name: "Legacy-Device-NetFront" },
  { pattern: /UP\.Browser/i,          name: "Legacy-Device-UPBrowser" },
  { pattern: /Profile\/MIDP/i,        name: "Legacy-Device-MIDP" },
  { pattern: /Configuration\/CLDC/i,  name: "Legacy-Device-CLDC" },
  { pattern: /SEC-SGH/i,              name: "Legacy-Device-SamsungSGH" },
  { pattern: /SAMSUNG-SGH/i,          name: "Legacy-Device-SamsungSGH" },
  { pattern: /SymbianOS/i,            name: "Legacy-Device-Symbian" },
  { pattern: /Series60/i,             name: "Legacy-Device-Series60" },
  { pattern: /BlackBerry[0-9]+\/[4-7]\./i, name: "Legacy-Device-BlackBerry" },
  { pattern: /Opera Mini\/[0-4]\./i,  name: "Legacy-Device-OperaMini" },
  { pattern: /J2ME/i,                 name: "Legacy-Device-J2ME" },
  { pattern: /Windows CE/i,           name: "Legacy-Device-WindowsCE" },
  { pattern: /SIE-[A-Z0-9]+/i,        name: "Legacy-Device-Siemens" },
  { pattern: /MSIE [0-9]|Trident\//i, name: "Legacy-Device-InternetExplorer" },

  // Self-identifying scanners / crawlers observed hitting the site — these
  // advertise a contact domain or research label instead of pretending to be
  // a browser.
  { pattern: /jagitek/i,              name: "Jagitek-Scanner" },
  { pattern: /lead[\s-]?research/i,   name: "LeadResearch-Scanner" },
  { pattern: /ghost[\s-]?rider/i,     name: "GhostRider-Recon" },

  // Politeness-URL bot convention: real browsers NEVER embed a domain/URL in
  // their own User-Agent string. Any UA carrying "http(s)://" is a crawler or
  // scanner identifying its operator, even if we haven't named it yet.
  { pattern: /https?:\/\//i,          name: "Self-Identifying-Crawler" },

  // Headless / automation frameworks — never a real human visitor.
  { pattern: /HeadlessChrome/i,       name: "Headless-Chrome" },
  { pattern: /PhantomJS/i,            name: "Headless-PhantomJS" },
  { pattern: /Selenium/i,             name: "Automation-Selenium" },
  { pattern: /Puppeteer/i,            name: "Automation-Puppeteer" },
  { pattern: /Playwright/i,           name: "Automation-Playwright" },
  { pattern: /jsdom/i,                name: "Automation-Jsdom" },
];

// Real browsers always advertise a rendering engine token. Absence of every
// one of these — especially from a datacenter/hosting IP — is a strong
// signal of a script or spoofed client rather than a human on a real browser.
const BROWSER_ENGINE_TOKENS = /(Chrome\/|CriOS\/|FxiOS\/|Firefox\/|Safari\/|Edg(e|A|iOS)?\/|Gecko\/|OPR\/)/i;

function detectBot(ua: string): { isBot: boolean; botName: string | null } {
  if (!ua || ua.trim().length === 0) {
    return { isBot: true, botName: "Blank-User-Agent" };
  }
  for (const { pattern, name } of BOT_PATTERNS) {
    if (pattern.test(ua)) return { isBot: true, botName: name };
  }
  // Check dynamic UA blocks from DB snapshot.
  if (_dynamicSnapshot.uas.has(ua)) {
    return { isBot: true, botName: "Dynamic-Block-ua" };
  }
  return { isBot: false, botName: null };
}

export function looksLikeRealBrowserEngine(ua: string): boolean {
  return !!ua && BROWSER_ENGINE_TOKENS.test(ua);
}

const SKIP_PATHS = new Set(["/__vite_ping", "/favicon.ico", "/@vite", "/@fs"]);

// ── Constitutionally blocked referrer domains ─────────────────────────────────
// These entities are permanently excluded from the NexusOS ecosystem by genesis
// constitutional declaration. Every entry corresponds to an organisation or
// individual that has entered a criminal guilty plea or received a criminal
// conviction for financial crimes against civilians.
// Source of truth: server/genesis_user.ts BLOCKED_ENTITIES list.
// Any HTTP request whose Referer header originates from these domains is refused
// with a 403 before it reaches the application layer.
const BLOCKED_REFERRER_DOMAINS: { domain: string; label: string }[] = [
  // ── Binance / CZ — AML guilty plea (2023) ─────────────────────────────
  { domain: "binance.com",      label: "Binance" },
  { domain: "binance.us",       label: "Binance" },
  { domain: "binance.org",      label: "Binance" },
  { domain: "binance.me",       label: "Binance" },
  { domain: "binance.info",     label: "Binance" },
  { domain: "binance.cc",       label: "Binance" },
  { domain: "bnb.org",          label: "Binance-BNB" },
  { domain: "bnbchain.org",     label: "Binance-BNBChain" },
  // ── FTX / SBF — convicted all 7 counts (2023) ────────────────────────
  { domain: "ftx.com",          label: "FTX" },
  { domain: "ftx.us",           label: "FTX" },
  { domain: "ftxdigital.com",   label: "FTX-Digital" },
  { domain: "alameda-research.com", label: "Alameda-Research" },
  // ── Terraform Labs / Do Kwon — guilty plea (2025) ─────────────────────
  { domain: "terra.money",      label: "Terraform-Labs" },
  { domain: "terraclassic.io",  label: "Terraform-Labs" },
  { domain: "terraform.money",  label: "Terraform-Labs" },
  { domain: "lunaclassic.io",   label: "Terraform-Labs" },
  // ── Celsius Network / Mashinsky — guilty plea (2024) ──────────────────
  { domain: "celsius.network",  label: "Celsius" },
  { domain: "celsius.com",      label: "Celsius" },
  // ── BitMEX / Arthur Hayes — BSA guilty plea (2022) ────────────────────
  { domain: "bitmex.com",       label: "BitMEX" },
  // ── TD Bank — money laundering guilty plea (2024) ─────────────────────
  { domain: "td.com",           label: "TD-Bank" },
  { domain: "tdbank.com",       label: "TD-Bank" },
  { domain: "tdcanadatrust.com",label: "TD-Bank" },
  // ── JPMorgan Chase — FX price-fixing guilty plea (2015) ───────────────
  { domain: "jpmorgan.com",     label: "JPMorgan" },
  { domain: "jpmorganchase.com",label: "JPMorgan" },
  { domain: "chase.com",        label: "JPMorgan-Chase" },
  // ── Citicorp / Citigroup — FX conspiracy guilty plea (2015) ──────────
  { domain: "citi.com",         label: "Citigroup" },
  { domain: "citigroup.com",    label: "Citigroup" },
  { domain: "citibank.com",     label: "Citigroup" },
  // ── Barclays — FX market rigging guilty plea (2015) ───────────────────
  { domain: "barclays.com",     label: "Barclays" },
  { domain: "barclaysus.com",   label: "Barclays" },
  { domain: "barclaycard.com",  label: "Barclays" },
  // ── Goldman Sachs — 1MDB FCPA guilty plea (2020) ─────────────────────
  { domain: "goldmansachs.com", label: "Goldman-Sachs" },
  { domain: "gs.com",           label: "Goldman-Sachs" },
  // ── HSBC — cartel money laundering DPA (2012) ─────────────────────────
  { domain: "hsbc.com",         label: "HSBC" },
  { domain: "hsbc.co.uk",       label: "HSBC" },
  { domain: "hsbc.com.hk",      label: "HSBC" },
  { domain: "hsbc.com.au",      label: "HSBC" },
  // ── BNP Paribas — sanctions violations guilty plea (2014) ─────────────
  { domain: "bnpparibas.com",   label: "BNP-Paribas" },
  { domain: "bnpparibas.net",   label: "BNP-Paribas" },
  // ── Credit Suisse — tax conspiracy guilty plea (2014) ─────────────────
  { domain: "credit-suisse.com",label: "Credit-Suisse" },
  { domain: "creditsuisse.com", label: "Credit-Suisse" },
  // ── UBS — LIBOR wire fraud guilty plea (2015); $125M AML recidivism fine (Aug 2026) ──
  { domain: "ubs.com",          label: "UBS" },
  // ── Royal Bank of Scotland / NatWest — FX rigging guilty plea (2015) ──
  { domain: "rbs.com",          label: "RBS" },
  { domain: "natwest.com",      label: "NatWest-RBS" },
  { domain: "royalbankofscotland.com", label: "RBS" },
  { domain: "rbsgroup.com",     label: "RBS" },
  // ── Data scrapers / recon tools — active probing observed ─────────────
  { domain: "dataindex.pro",    label: "DataIndex-Scraper" },
  // ── Archegos Capital Management — market manipulation (18yr sentence, Nov 2024) ──
  { domain: "archegos.com",     label: "Archegos-Capital" },
  // ── Solo Capital / Sanjay Shah — cum-ex tax fraud £996M (12yr, Dec 2024) ─────
  { domain: "solocapital.com",  label: "Solo-Capital" },
  { domain: "solocap.com",      label: "Solo-Capital" },
  // ── GTV Media / Himalaya Exchange — Guo Wengui $1B fraud (30yr, Jun 2026) ─────
  { domain: "gtv.org",          label: "GTV-Media" },
  { domain: "himalayaexchange.com", label: "Himalaya-Exchange" },
  { domain: "himalaya.exchange",    label: "Himalaya-Exchange" },
  // ── Tornado Cash — unlicensed money transmitting, $1B+ laundered (Aug 2025) ───
  { domain: "tornado.cash",     label: "Tornado-Cash" },
  // ── BitShine Exchange — Taiwan crypto fraud $39M (22yr, Jul 2026) ─────────────
  { domain: "bitshine.io",      label: "BitShine" },
  { domain: "bitshine.com",     label: "BitShine" },
];

// Raw-string patterns for non-URL referers (e.g. "ghost-rider/" — a custom
// recon script that injects itself as a Referer header but is not a valid URL).
const BLOCKED_REFERRER_RAW: { pattern: RegExp; label: string }[] = [
  { pattern: /ghost[\s-]?rider/i, label: "GhostRider-Recon" },
];

function isBlockedReferrer(referer: string): { blocked: boolean; label: string } {
  if (!referer) return { blocked: false, label: "" };
  // Check raw patterns first (catches non-URL referers like "ghost-rider/")
  for (const { pattern, label } of BLOCKED_REFERRER_RAW) {
    if (pattern.test(referer)) return { blocked: true, label };
  }
  // Check dynamic blocks from DB (snapshot is refreshed async, never stale > 5 min).
  const refLower = referer.toLowerCase();
  if (_dynamicSnapshot.referers.has(refLower)) {
    return { blocked: true, label: "Dynamic-Block-referer" };
  }
  try {
    const hostname = new URL(referer).hostname.toLowerCase().replace(/^www\./, "");
    for (const { domain, label } of BLOCKED_REFERRER_DOMAINS) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return { blocked: true, label };
      }
    }
    // Also check dynamic blocks by hostname substring
    for (const dynVal of _dynamicSnapshot.referers) {
      try {
        const dynHost = new URL(dynVal).hostname.toLowerCase().replace(/^www\./, "");
        if (hostname === dynHost || hostname.endsWith("." + dynHost)) {
          return { blocked: true, label: "Dynamic-Block-referer" };
        }
      } catch { /* dynVal may not be a URL — already checked exact match above */ }
    }
  } catch { /* malformed URL — not a valid referrer */ }
  return { blocked: false, label: "" };
}
let _db: any = null;

let _probeCounters: any = null;
let _trafficLogs: any = null;

async function getDb() {
  if (!_db) {
    const { db } = await import("./db");
    const { trafficLogs, probeCounters } = await import("../shared/schema");
    _db = db;
    _trafficLogs = trafficLogs;
    _probeCounters = probeCounters;
  }
  return { db: _db, trafficLogs: _trafficLogs, probeCounters: _probeCounters };
}

/**
 * Load all probe counters from the DB into the in-memory maps.
 * Exported so tests can await it directly on a fresh import.
 * The module-level _initPromise gates all probe recording until this resolves,
 * so counts accumulated before a restart are never lost.
 */
export async function initProbeCounters(): Promise<void> {
  try {
    const { db, probeCounters } = await getDb();

    // Self-provision the table on first deploy so the feature works without
    // manually running db:push.  CREATE TABLE IF NOT EXISTS is idempotent.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS probe_counters (
        id           SERIAL PRIMARY KEY,
        field_type   TEXT    NOT NULL,
        key          TEXT    NOT NULL,
        hits         JSONB   NOT NULL DEFAULT '[]',
        last_alerted BIGINT  NOT NULL DEFAULT 0,
        updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Load all rows BEFORE enforcing the unique index.  If a previous deploy
    // left duplicate (field_type, key) rows the CREATE UNIQUE INDEX below
    // would throw and — without this ordering — the outer catch would absorb
    // the error and skip all hydration.  By loading first, restart-hydration
    // always completes even when the DB still contains duplicates.
    const cutoff = Date.now() - WINDOW_MS;

    const rows: Array<{ fieldType: string; key: string; hits: unknown; lastAlerted: number }> =
      await db.select().from(probeCounters);

    // ── Pass 1: group every recognised row by (fieldType, key) ───────────────
    //
    // We collect ALL rows — including stale ones — before applying the
    // active-hit / cooldown filter.  This guarantees that duplicate pairs are
    // detected even when one row happens to be entirely stale (all hits
    // outside the window, lastAlerted=0).  A single-pass approach that
    // filters first and only marks duplicates on the second encounter misses
    // the stale-first-row case, leaving the unique index un-creatable and
    // every subsequent persistProbeEntry call silently broken.
    //
    // Composite key uses \x00 as separator — fieldType is always "referer"|"ua"
    // and never contains the null byte, so there is no collision risk.
    type RawRow = { fieldType: string; key: string; hits: unknown; lastAlerted: number };
    const groups = new Map<string, RawRow[]>();
    for (const row of rows) {
      if (row.fieldType !== "referer" && row.fieldType !== "ua") {
        console.warn(
          `[initProbeCounters] skipping row with unrecognised fieldType="${row.fieldType}" key="${row.key}" — history lost`,
        );
        continue;
      }
      const gk = row.fieldType + "\x00" + row.key;
      const g  = groups.get(gk);
      if (g) g.push(row);
      else groups.set(gk, [row]);
    }

    // ── Pass 2: hydrate in-memory maps from the merged groups ─────────────────
    for (const groupRows of groups.values()) {
      const { fieldType, key } = groupRows[0];
      const map = fieldType === "referer" ? refererProbes : uaProbes;

      // Merge all rows in the group: union raw hits, take the highest lastAlerted.
      let mergedLastAlerted = 0;
      const allHits: number[] = [];
      for (const row of groupRows) {
        const rh = Array.isArray(row.hits) ? (row.hits as number[]) : [];
        allHits.push(...rh);
        mergedLastAlerted = Math.max(mergedLastAlerted, row.lastAlerted ?? 0);
      }
      // Apply the window filter only when building the in-memory entry.
      // Do NOT deduplicate via Set: two concurrent requests can legitimately
      // share the same millisecond timestamp, and removing one would
      // under-count hits and potentially suppress a threshold alert after restart.
      const activeHits = allHits
        .filter((t: number) => t >= cutoff)
        .sort((a, b) => a - b);

      if (activeHits.length === 0 && mergedLastAlerted === 0) continue;
      map.set(key, { hits: activeHits, lastAlerted: mergedLastAlerted });
    }

    // ── Dedup DB rows and create unique index ─────────────────────────────────
    //
    // If any (fieldType, key) group had >1 DB row, we must remove the extras
    // before CREATE UNIQUE INDEX can succeed — and before persistProbeEntry's
    // ON CONFLICT (field_type, key) clause can be used.
    //
    // We use targeted per-group DELETE + UPDATE (one pair per duplicate group)
    // rather than a single global DELETE.  A global DELETE is unsafe: if a
    // future code path inserts a row after our SELECT but before the DELETE,
    // or if only some groups are successfully reconciled, partial state could
    // delete live rows without updating the survivors.
    //
    // All operations below are wrapped in a nested try-catch so that any DB
    // error (e.g. the table is still locked) is non-fatal: hydration above
    // already completed successfully.
    try {
      const dupGroups: Array<{ fieldType: "referer" | "ua"; key: string }> = [];
      for (const [, groupRows] of groups) {
        if (groupRows.length > 1) {
          dupGroups.push({
            fieldType: groupRows[0].fieldType as "referer" | "ua",
            key:       groupRows[0].key,
          });
        }
      }

      for (const { fieldType, key } of dupGroups) {
        // Keep only the lowest-id row for this (fieldType, key) pair.
        await db.execute(sql`
          DELETE FROM probe_counters
          WHERE field_type = ${fieldType}
            AND key        = ${key}
            AND id NOT IN (
              SELECT MIN(id) FROM probe_counters
              WHERE field_type = ${fieldType} AND key = ${key}
            )
        `);

        // Overwrite the surviving row with the merged in-memory state so that
        // the next restart hydrates the correct unified entry.
        const entryMap = fieldType === "referer" ? refererProbes : uaProbes;
        const entry    = entryMap.get(key);
        if (entry) {
          await db.execute(sql`
            UPDATE probe_counters
            SET hits         = ${JSON.stringify(entry.hits)}::jsonb,
                last_alerted = ${entry.lastAlerted},
                updated_at   = NOW()
            WHERE field_type = ${fieldType}
              AND key        = ${key}
          `);
        } else {
          // Both rows were stale (skipped hydration) — clear the surviving row
          // to a known-empty state so the next restart can index it cleanly.
          await db.execute(sql`
            UPDATE probe_counters
            SET hits         = '[]'::jsonb,
                last_alerted = 0,
                updated_at   = NOW()
            WHERE field_type = ${fieldType}
              AND key        = ${key}
          `);
        }
      }

      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS probe_counters_field_key_idx
          ON probe_counters (field_type, key)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS probe_counters_updated_at_idx
          ON probe_counters (updated_at)
      `);
    } catch {
      // Non-fatal — DB error during dedup/index creation.
      // Hydration completed successfully above.
    }
  } catch (err) {
    // Non-fatal: if DB is unavailable at boot, in-memory mode stays active.
    // Persistence will resume automatically once the DB becomes reachable.
    console.warn("[probe-counters] init failed (in-memory mode active):", (err as Error).message);
  }
}

/**
 * Module-level init promise.  Probe recording in res.on("finish") awaits this
 * before touching the in-memory maps so restart-hydration always completes
 * first — a scraper at hit-4 before a restart still triggers the alert on hit-5
 * after the restart.
 */
const _initPromise: Promise<void> = initProbeCounters();

export function trafficLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  if (SKIP_PATHS.has(path) || path.startsWith("/@") || path.startsWith("/node_modules")) {
    return next();
  }

  const ua        = (req.headers["user-agent"] ?? "") as string;
  const referer   = (req.headers["referer"] ?? req.headers["referrer"] ?? "") as string;
  const ip        = (req.headers["cf-connecting-ip"] ?? req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "") as string;
  const cleanIp   = ip.toString().split(",")[0].trim();

  // ── Referrer block — constitutionally excluded entities ───────────────────
  const { blocked: refBlocked, label: refLabel } = isBlockedReferrer(referer);
  if (refBlocked) {
    const country = (req.headers["cf-ipcountry"] ?? req.headers["x-country"] ?? "") as string;
    getDb().then(({ db, trafficLogs }) => {
      db.insert(trafficLogs).values({
        path:       path.slice(0, 500),
        method:     req.method,
        statusCode: 403,
        userAgent:  ua.slice(0, 500) || null,
        referer:    referer.slice(0, 500) || null,
        country:    country.slice(0, 10) || null,
        ip:         cleanIp.slice(0, 64) || null,
        isBot:      true,
        botName:    `BLOCKED-REFERRER:${refLabel}`,
        isDatacenterIp: false,
      }).catch(() => {});
    }).catch(() => {});
    res.status(403).json({ error: "Access denied." });
    return;
  }

  // ── PHP scanner / vulnerability probe block ───────────────────────────────
  const lowerPath = path.toLowerCase();
  const isPhpProbe = PHP_SCANNER_PATHS.has(lowerPath)
    || lowerPath.endsWith(".php")
    || lowerPath.endsWith(".env")
    || lowerPath.includes("/.git/")
    || lowerPath.includes("/.aws/")
    || lowerPath.includes("/wp-")
    || lowerPath.includes("/cgi-bin/");
  if (isPhpProbe) {
    const country = (req.headers["cf-ipcountry"] ?? req.headers["x-country"] ?? "") as string;
    getDb().then(({ db, trafficLogs }) => {
      db.insert(trafficLogs).values({
        path:           path.slice(0, 500),
        method:         req.method,
        statusCode:     403,
        userAgent:      ua.slice(0, 500) || null,
        referer:        referer.slice(0, 500) || null,
        country:        country.slice(0, 10) || null,
        ip:             cleanIp.slice(0, 64) || null,
        isBot:          true,
        botName:        "PHP-SCANNER",
        isDatacenterIp: false,
      }).catch(() => {});
    }).catch(() => {});
    res.status(403).json({ error: "Not found." });
    return;
  }

  // ── Dynamic UA block ───────────────────────────────────────────────────────
  // UA strings added via Telegram's "🚫 Add to block list" button are enforced
  // here with a hard 403, mirroring the referer block behaviour above.
  if (ua && _dynamicSnapshot.uas.has(ua)) {
    const uaCountry = (req.headers["cf-ipcountry"] ?? req.headers["x-country"] ?? "") as string;
    getDb().then(({ db, trafficLogs }) => {
      db.insert(trafficLogs).values({
        path:           path.slice(0, 500),
        method:         req.method,
        statusCode:     403,
        userAgent:      ua.slice(0, 500) || null,
        referer:        referer.slice(0, 500) || null,
        country:        uaCountry.slice(0, 10) || null,
        ip:             cleanIp.slice(0, 64) || null,
        isBot:          true,
        botName:        "BLOCKED-UA:Dynamic-Block",
        isDatacenterIp: false,
      }).catch(() => {});
    }).catch(() => {});
    res.status(403).json({ error: "Access denied." });
    return;
  }

  const country   = ipCountryCache.get(cleanIp)
    ?? (req.headers["cf-ipcountry"] ?? req.headers["x-country"] ?? "") as string;
  const isDatacenter = ipHostingCache.get(cleanIp) === true;
  const { isBot: patternBot, botName: patternBotName } = detectBot(ua);
  // Defense-in-depth: a known datacenter/hosting IP whose UA carries no real
  // browser rendering-engine token is a script or spoofed client, even if it
  // doesn't match any specific known bot signature yet.
  const isBot     = patternBot || (isDatacenter && !looksLikeRealBrowserEngine(ua));
  const botName   = patternBotName ?? (isDatacenter && isBot ? "Cloud-Datacenter-NonBrowser" : null);

  res.on("finish", () => {
    if (path.startsWith("/api/analytics")) return;

    const statusCode  = res.statusCode;
    const isHoneypot  = !!res.locals.honeypotHit || isHoneypotPath(path);
    const finalBot    = isHoneypot
      ? `HONEYPOT:${botName ?? "Unknown"}`
      : (botName ?? null);
    const finalIsBot  = isHoneypot ? true : isBot;

    getDb().then(({ db, trafficLogs }) => {
      db.insert(trafficLogs).values({
        path:       path.slice(0, 500),
        method:     req.method,
        statusCode,
        userAgent:  ua.slice(0, 500) || null,
        referer:    referer.slice(0, 500) || null,
        country:    country.slice(0, 10) || null,
        ip:         ip.toString().split(",")[0].trim().slice(0, 64) || null,
        isBot:      finalIsBot,
        botName:    finalBot,
        isDatacenterIp: isDatacenter,
      }).catch(() => {});
    }).catch(() => {});

    // ── Unknown-probe threshold alerting ──────────────────────────────────
    // Await the startup hydration promise before touching the in-memory maps.
    // This ensures counts accumulated before a restart are loaded first, so a
    // scraper at hit-4 before a restart still triggers the alert on hit-5 after.
    _initPromise.then(() => {
      const now = Date.now();
      pruneProbes(now);
      refreshDynamicBlocksIfStale(now);

      // ── Test-only hook — always null in production ───────────────────────
      // Tests set _testOnly.extraProbeHook to simulate a future third probe
      // branch (e.g. IP-based alerting) running here — before the referer and
      // UA branches — so regression tests can confirm that neither referer nor
      // UA recording is skipped if the third probe fires or enters cooldown.
      // This hook MUST NOT be set in non-test code.
      if (_testOnly.extraProbeHook) _testOnly.extraProbeHook(now);

      // Track referers that are non-empty, not already in the block list, and not
      // from the site's own origin (wnsp.io / wnsp.tech / Replit dev domain).
      // Internal navigation referers from our own pages are never unknown probes.
      if (referer && !refBlocked && !isOwnOriginReferer(referer)) {
        const refKey = referer.slice(0, 500).toLowerCase();
        recordProbe(refererProbes, refKey, "referer", now);
      }

      // Track every User-Agent string not matched by any known bot pattern,
      // regardless of whether it carries a browser-engine token. Scrapers
      // routinely spoof Chrome/Firefox UAs, so the engine token alone is not a
      // reliable indicator of a legitimate visitor. The threshold (> 5 identical
      // UA strings in 24 h) naturally filters out real human visitors whose
      // browser version/OS combinations vary across sessions.
      if (ua && !patternBot) {
        const uaKey = ua.slice(0, 500);
        recordProbe(uaProbes, uaKey, "ua", now);
      }
    }).catch(() => {});
  });

  next();
}

function refreshDynamicBlocksIfStale(now: number): void {
  if (now - _dynamicSnapshotAt < DYNAMIC_BLOCK_TTL_MS) return;
  _dynamicSnapshotAt = now; // mark immediately to prevent concurrent refreshes
  import("./db").then(async ({ db }) => {
    const { dynamicBlocks } = await import("../shared/schema");
    const rows = await db.select().from(dynamicBlocks);
    const referers = new Set<string>();
    const uas      = new Set<string>();
    for (const r of rows) {
      if (r.field === "referer") referers.add(r.value.toLowerCase());
      else uas.add(r.value);
    }
    _dynamicSnapshot = { referers, uas };
  }).catch(() => {}); // fail open — never block if DB is down
}

/**
 * Force an immediate reload of the dynamic block snapshot from the DB.
 * Call this after writing a new block entry so it takes effect within seconds
 * rather than waiting up to 5 minutes for the normal TTL expiry.
 */
export function invalidateDynamicBlockCache(): void {
  _dynamicSnapshotAt = 0;
  refreshDynamicBlocksIfStale(Date.now());
}

/**
 * Atomically append a single new hit to the probe_counters row in PostgreSQL.
 *
 * Rather than sending the full in-memory hits array (which causes a last-writer-
 * wins race when two concurrent requests finish at the same time), we send only
 * the new timestamp and let Postgres do the append + stale-hit pruning in a
 * single atomic statement.  The GREATEST() on last_alerted means the cooldown
 * is also safe under concurrent writes.
 *
 * Fire-and-forget — never awaited on the request path.
 */
function persistProbeEntry(
  fieldType: "referer" | "ua",
  key: string,
  newHit: number,
  lastAlerted: number,
  cutoff: number,
): void {
  getDb()
    .then(({ db }) => db.execute(sql`
      INSERT INTO probe_counters (field_type, key, hits, last_alerted, updated_at)
      VALUES (
        ${fieldType},
        ${key},
        jsonb_build_array(${newHit}::bigint),
        ${lastAlerted},
        NOW()
      )
      ON CONFLICT (field_type, key) DO UPDATE SET
        hits = COALESCE(
          (
            SELECT jsonb_agg(v)
            FROM jsonb_array_elements(
              probe_counters.hits || jsonb_build_array(${newHit}::bigint)
            ) v
            WHERE (v::text)::bigint > ${cutoff}
          ),
          jsonb_build_array(${newHit}::bigint)
        ),
        last_alerted = GREATEST(probe_counters.last_alerted, ${lastAlerted}),
        updated_at   = NOW()
    `))
    .catch(() => {
      // DB unavailable — not fatal; in-memory counts are still correct for
      // this process lifetime.
    });
}

// ── Test-only exports ─────────────────────────────────────────────────────────
// Prefixed with _ to signal "internal — do not import in production code".
export { refererProbes as _refererProbes, uaProbes as _uaProbes };
export { recordProbe as _recordProbe };
export { pruneProbes as _pruneProbes };
export { WINDOW_MS as _WINDOW_MS };

/**
 * Test-only mutable container.  Exporting a bare `let` binding is read-only
 * from outside an ES module, so tests mutate a property on this object
 * instead.  In production the callback property is always null.
 *
 * _testOnly.extraProbeHook — invoked at the start of _initPromise.then(),
 * before the referer and UA probe branches.  Tests set this to simulate a
 * future third probe type (e.g. IP-based alerting) so they can verify that
 * neither referer nor UA recording is skipped if the third probe fires or
 * enters cooldown on the same request.
 * MUST NOT be set in non-test code.
 */
export const _testOnly = {
  extraProbeHook: null as ((now: number) => void) | null,
};

const DYNAMIC_BLOCK_TTL_MS = 5 * 60 * 1000; // refresh at most once per 5 min

let _dynamicSnapshotAt = 0;

let _dynamicSnapshot: DynamicBlockSnapshot = { referers: new Set(), uas: new Set() };

/**
 * Directly overwrite the in-process snapshot.
 * @internal — used only in vitest unit tests; not for production call sites.
 */
export function _testSetDynamicBlockSnapshot(snap: DynamicBlockSnapshot): void {
  _dynamicSnapshot = snap;
}
