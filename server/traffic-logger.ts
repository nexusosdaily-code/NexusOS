import type { Request, Response, NextFunction } from "express";
import { isHoneypotPath } from "./honeypot";
import { ipCountryCache } from "./geoip-enricher";

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
];

function detectBot(ua: string): { isBot: boolean; botName: string | null } {
  if (!ua) return { isBot: false, botName: null };
  for (const { pattern, name } of BOT_PATTERNS) {
    if (pattern.test(ua)) return { isBot: true, botName: name };
  }
  return { isBot: false, botName: null };
}

const SKIP_PATHS = new Set(["/__vite_ping", "/favicon.ico", "/@vite", "/@fs"]);

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
  const country   = ipCountryCache.get(cleanIp)
    ?? (req.headers["cf-ipcountry"] ?? req.headers["x-country"] ?? "") as string;
  const { isBot, botName } = detectBot(ua);

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
      }).catch(() => {});
    }).catch(() => {});
  });

  next();
}
