import type { Request, Response, NextFunction } from "express";
import { isHoneypotPath } from "./honeypot";
import { ipCountryCache, ipHostingCache } from "./geoip-enricher";

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
  // ── UBS — LIBOR wire fraud guilty plea (2015) ─────────────────────────
  { domain: "ubs.com",          label: "UBS" },
  // ── Royal Bank of Scotland / NatWest — FX rigging guilty plea (2015) ──
  { domain: "rbs.com",          label: "RBS" },
  { domain: "natwest.com",      label: "NatWest-RBS" },
  { domain: "royalbankofscotland.com", label: "RBS" },
  { domain: "rbsgroup.com",     label: "RBS" },
  // ── Data scrapers / recon tools — active probing observed ─────────────
  { domain: "dataindex.pro",    label: "DataIndex-Scraper" },
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
  try {
    const hostname = new URL(referer).hostname.toLowerCase().replace(/^www\./, "");
    for (const { domain, label } of BLOCKED_REFERRER_DOMAINS) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return { blocked: true, label };
      }
    }
  } catch { /* malformed URL — not a valid referrer */ }
  return { blocked: false, label: "" };
}

let _db: any = null;
let _trafficLogs: any = null;

async function getDb() {
  if (!_db) {
    const { db } = await import("./db");
    const { trafficLogs } = await import("../shared/schema");
    _db = db;
    _trafficLogs = trafficLogs;
  }
  return { db: _db, trafficLogs: _trafficLogs };
}

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
  });

  next();
}
