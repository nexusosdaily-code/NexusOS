import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { injectMeta } from "./seo-meta";

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
  "/auth",
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
  // Misc tools / pages
  "/nexus-command", "/receive", "/portfolio", "/lp-pools",
  "/airdrop", "/coinsniper", "/quest",
  "/wsats", "/roadmap", "/how-to-plug-in",
  "/encode", "/replit-template", "/proof",
  // Legacy redirect paths (SPA handles them)
  "/spectral-video", "/spectral-uri", "/wnsp-uri", "/visualizer", "/btc-bridge",
]);

// Only paths where ANY child segment is valid (true dynamic routes).
const DYNAMIC_PUBLIC_PREFIXES: string[] = [
  "/docs/",       // /docs/:section
  "/profile/",    // /profile/:username
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

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

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
  // Injects host/route-aware metadata before serving.
  app.use("*", (req, res) => {
    const spaPathname = requestPathname(req);
    const status = isPublicSpaPath(spaPathname) ? 200 : 404;
    const host     = req.hostname || (req.headers.host as string) || "";
    const pathname = req.originalUrl.split("?")[0] || "/";
    const html     = injectMeta(getHtml(), host, pathname);
    res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
}
