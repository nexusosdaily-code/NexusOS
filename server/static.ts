import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { injectMeta } from "./seo-meta";

// ---------------------------------------------------------------------------
// Custom-domain hosts that are root-only microsites.
// Any path other than "/" on these hosts returns HTTP 404 so crawlers do not
// index duplicate landing-page content under deep-link URLs.
// ---------------------------------------------------------------------------
const CUSTOM_DOMAIN_HOSTS = new Set<string>([
  "wnsp.dev", "www.wnsp.dev",
  "wnsp.blog", "www.wnsp.blog",
  "snic.io", "www.snic.io",
  "phr1.io", "www.phr1.io",
  "lambdagate.io", "www.lambdagate.io",
  "wavelengthscript.dev", "www.wavelengthscript.dev",
  "zerogstate.io", "www.zerogstate.io",
  "wascii.io", "www.wascii.io",
  "orbitaltreasury.io", "www.orbitaltreasury.io",
  "555thz.io", "www.555thz.io",
]);

// ---------------------------------------------------------------------------
// Public SPA route registry
//
// Any URL that the public Router() in App.tsx can serve without authentication.
// Unknown URLs (not in this set) receive HTTP 404, while still returning
// index.html so the SPA can render a "Not Found" UI.
//
// EXACT_PUBLIC_PATHS  — paths that must match exactly (no children).
// DYNAMIC_PUBLIC_PREFIXES — short-form prefixes where *any* sub-path is valid
//   because the route uses a dynamic segment (e.g. /docs/:section).
//   Keep this list small and intentional.
// ---------------------------------------------------------------------------

const EXACT_PUBLIC_PATHS = new Set<string>([
  "/",
  "/auth",
  "/contact",
  "/labs",
  // Funding & campaign
  "/crowdfund", "/fund", "/indiegogo", "/campaign", "/evidence",
  "/nxt-campaign",
  // Video / media
  "/videos",
  // Developer docs (top-level pages; /docs/:section handled via DYNAMIC_PUBLIC_PREFIXES)
  "/docs", "/developer", "/developer-matrix", "/developer-matrix/docs",
  "/research-presentation", "/research-presentation/developer-matrix",
  // Spectral framework
  "/spectral-db", "/nexus-spectral",
  "/spectral-router", "/spectral-search", "/spectral-contracts",
  "/spectral-bundle",
  // WNSP landing + known child routes
  "/wnsp", "/wnsp/ordinals", "/wnsp/bridge",
  "/bitcoin-ordinals", "/wnsp-ordinals",
  "/wnsp-bridge",
  "/wnsp-vm",
  // Nostr
  "/nostr", "/nostr-relay", "/nostr-bridge",
  // Community & staking
  "/community-mint", "/wnsp-staking", "/join-community",
  // Marketplace / runes / BTC
  "/marketplace", "/market",
  "/rune-etching", "/rune-mint", "/etch-rune", "/rune-staking",
  "/rune-swap", "/rune-pipeline",
  "/stake-earn",
  "/fractal-btc", "/fractal-bitcoin",
  "/nxt-fb-swap", "/swap",
  "/btc-sentinel", "/btc-assets-sentinel",
  "/mempool", "/admin/orders",
  // Chain / ecosystem
  "/blockchain", "/ecosystem", "/network", "/snic",
  "/spectral-db", "/nexus-spectral",
  // Governance / open
  "/open", "/charter", "/constitution",
  // Science & theory
  "/oscillating-quanta", "/planck-alignment", "/reposed-theory",
  "/compression-explorer",
  // Protocol & language
  "/wavelength-lang", "/ce-se-pipeline", "/ce-code-writer",
  "/spectral-router", "/spectral-search", "/spectral-contracts",
  "/divergence-test",
  // Hardware & spec
  "/hardware-spec", "/hardware-lab", "/mobile-sdk",
  // Infrastructure / economy pages
  "/nexus-hardware-os", "/orbital-treasury", "/spectral-library",
  // Misc tools / pages
  "/nexus-command", "/nexus-analytics", "/receive", "/portfolio", "/lp-pools",
  "/airdrop", "/coinsniper", "/quest",
  "/wsats", "/roadmap", "/how-to-plug-in",
  "/encode", "/replit-template", "/proof", "/stewards", "/poc", "/joint-venture", "/founders",
  "/octave-layers", "/paper", "/hardware-results",
  // Previously missing from allowlist (domain-redirect targets and public routes)
  "/spectral-ide", "/resonance-cavity",
  "/build", "/shareholders",
  // Protocol reference (seo-meta.ts canonical page)
  "/protocol",
  // Legacy redirect paths (SPA handles them)
  "/spectral-video", "/spectral-uri", "/wnsp-uri", "/visualizer", "/btc-bridge",
]);

// Only paths where ANY child segment is valid (true dynamic routes).
const DYNAMIC_PUBLIC_PREFIXES: string[] = [
  "/profile/",    // /profile/:username
  "/app/",        // /app/:slug — public contract app pages
];

function isPublicSpaPath(pathname: string): boolean {
  if (EXACT_PUBLIC_PATHS.has(pathname)) return true;
  return DYNAMIC_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function requestPathname(req: Request): string {
  try {
    return new URL(req.url, "http://localhost").pathname;
  } catch {
    return req.path || "/";
  }
}

// ---------------------------------------------------------------------------
// Canonical root URL for each custom domain (used in sitemap generation).
// ---------------------------------------------------------------------------
const CUSTOM_DOMAIN_CANONICAL: Record<string, string> = {
  "wnsp.dev":              "https://wnsp.dev/",
  "www.wnsp.dev":          "https://wnsp.dev/",
  "wnsp.blog":             "https://wnsp.blog/",
  "www.wnsp.blog":         "https://wnsp.blog/",
  "snic.io":               "https://snic.io/",
  "www.snic.io":           "https://snic.io/",
  "phr1.io":               "https://phr1.io/",
  "www.phr1.io":           "https://phr1.io/",
  "lambdagate.io":         "https://lambdagate.io/",
  "www.lambdagate.io":     "https://lambdagate.io/",
  "wavelengthscript.dev":  "https://wavelengthscript.dev/",
  "www.wavelengthscript.dev": "https://wavelengthscript.dev/",
  "zerogstate.io":         "https://zerogstate.io/",
  "www.zerogstate.io":     "https://zerogstate.io/",
  "wascii.io":             "https://wascii.io/",
  "www.wascii.io":         "https://wascii.io/",
  "orbitaltreasury.io":    "https://orbitaltreasury.io/",
  "www.orbitaltreasury.io": "https://orbitaltreasury.io/",
  "555thz.io":             "https://555thz.io/",
  "www.555thz.io":         "https://555thz.io/",
};

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  // ── /.well-known — institutional & security discovery files ──────────────
  // RFC 9116 security.txt — gives security researchers a clear contact channel.
  // TLM-Audit-Scanner, SecurityResearch, and pathscan all check this file.
  app.get("/.well-known/security.txt", (_req: Request, res: Response) => {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    res.status(200).type("text/plain").send(
      [
        "# NexusOS Security Contact",
        "# WNSP Physics-Based Civilization OS",
        `Contact: mailto:security@wnsp.tech`,
        `Contact: https://wnsp.tech/contact`,
        `Expires: ${expires.toISOString()}`,
        `Canonical: https://wnsp.tech/.well-known/security.txt`,
        `Policy: https://wnsp.tech/contact`,
        `Preferred-Languages: en`,
        `Scope: https://wnsp.tech`,
        `Acknowledgments: https://wnsp.tech/contact`,
        "",
        "# NexusOS is governed under AGPL-3.0.",
        "# Responsible disclosure is welcomed and acknowledged.",
      ].join("\n")
    );
  });

  // Google Digital Asset Links — answers GoogleAssociationService probes.
  // Signals the NexusOS Android app package for deep-link verification.
  // sha256_cert_fingerprints populated when the Android SDK app is published.
  app.get("/.well-known/assetlinks.json", (_req: Request, res: Response) => {
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

  // Apple App Site Association — for iOS Universal Links
  app.get("/.well-known/apple-app-site-association", (_req: Request, res: Response) => {
    res.status(200).type("application/json").json({
      applinks: {
        apps: [],
        details: [
          {
            appID: "io.wnsp.nexusos",
            paths: ["*"],
          },
        ],
      },
      webcredentials: {
        apps: ["io.wnsp.nexusos"],
      },
    });
  });
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // ── Host-aware robots.txt ─────────────────────────────────────────────────
  // Custom domains each advertise their own sitemap URL so crawlers get a
  // sitemap that actually contains the page they are on. The main wnsp.io
  // robots.txt is served as a static file from client/public/robots.txt.
  app.get("/robots.txt", (req: Request, res: Response) => {
    const host      = req.hostname || (req.headers.host as string) || "";
    const cleanHost = host.split(":")[0];

    if (CUSTOM_DOMAIN_HOSTS.has(cleanHost)) {
      const canonical  = CUSTOM_DOMAIN_CANONICAL[cleanHost] ?? `https://${cleanHost}/`;
      const canonicalOrigin = canonical.replace(/\/$/, "");
      const sitemapUrl = `${canonicalOrigin}/sitemap.xml`;
      const domain     = cleanHost.startsWith("www.") ? cleanHost.slice(4) : cleanHost;
      res
        .status(200)
        .type("text/plain")
        .send(
          `User-agent: *\nAllow: /\n\n# ${domain} — root microsite\nSitemap: ${sitemapUrl}\n# Canonical: ${canonical}\n`,
        );
      return;
    }

    // Fall through to static file for wnsp.io and unknown hosts.
    res.sendFile(path.join(distPath, "robots.txt"), (err) => {
      if (err) res.status(404).end();
    });
  });

  // ── Host-aware sitemap.xml ────────────────────────────────────────────────
  // Custom domains each get a single-URL sitemap containing only their root
  // canonical page. The main wnsp.io sitemap is served as a static file from
  // client/public/sitemap.xml (which lists all wnsp.io canonical paths).
  app.get("/sitemap.xml", (req: Request, res: Response) => {
    const host      = req.hostname || (req.headers.host as string) || "";
    const cleanHost = host.split(":")[0];

    if (CUSTOM_DOMAIN_HOSTS.has(cleanHost)) {
      const canonical = CUSTOM_DOMAIN_CANONICAL[cleanHost] ?? `https://${cleanHost}/`;
      const xml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
        `  <url>`,
        `    <loc>${canonical}</loc>`,
        `    <changefreq>weekly</changefreq>`,
        `    <priority>1.0</priority>`,
        `  </url>`,
        `</urlset>`,
      ].join("\n");
      res.status(200).type("application/xml").send(xml);
      return;
    }

    // Fall through to static file for wnsp.io and unknown hosts.
    res.sendFile(path.join(distPath, "sitemap.xml"), (err) => {
      if (err) res.status(404).end();
    });
  });

  // Hashed asset files get a 1-year immutable cache; everything else (index.html) gets no-cache.
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      if (/\/assets\//.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  }));

  const indexPath = path.resolve(distPath, "index.html");
  let cachedHtml: string | null = null;

  function getHtml(): string {
    if (!cachedHtml) {
      cachedHtml = fs.readFileSync(indexPath, "utf-8");
    }
    return cachedHtml;
  }

  // SPA fallback — serve index.html for all non-file requests.
  // HTTP 200 for known public paths; HTTP 404 for everything else so
  // search-engine crawlers receive the correct indexation signal.
  // Custom-domain hosts are root-only microsites: non-root paths get 404.
  // Injects host/route-aware metadata before serving.
  app.use("*", (req, res) => {
    const spaPathname = requestPathname(req);
    const host        = req.hostname || (req.headers.host as string) || "";
    const cleanHost   = host.split(":")[0];
    const pathname    = req.originalUrl.split("?")[0] || "/";

    let status: number;
    if (CUSTOM_DOMAIN_HOSTS.has(cleanHost)) {
      // Custom domains serve only their root landing page.
      status = (spaPathname === "/" || spaPathname === "") ? 200 : 404;
    } else {
      status = isPublicSpaPath(spaPathname) ? 200 : 404;
    }

    const html = injectMeta(getHtml(), host, pathname);
    res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
}
