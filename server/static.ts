import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { injectMeta, buildVideosPageMeta, buildVideoDetailPageMeta, injectCustomMeta } from "./seo-meta";
import { storage } from "./storage";

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
  "spectralmirror.io", "www.spectralmirror.io",
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

// ---------------------------------------------------------------------------
// True public paths — marketing, science, funding, protocol, and documentation
// pages that logged-out visitors can use and that crawlers should index.
//
// Routes NOT listed here receive HTTP 404 so search engines receive the correct
// signal that the page is not a valid public landing page.  The SPA still loads
// for authenticated users who navigate client-side, so removing a path from
// this set never breaks the app — it only corrects the crawl-budget signal.
//
// DO NOT add authenticated app screens (wallet, inbox, settings, governance,
// workspace/*, kernel, etc.) to this list.  Those paths are behind ProtectedRoute
// in App.tsx and serve a client-side redirect to /auth for logged-out visitors.
// Listing them here would make crawlers index thin auth-shell pages.
// ---------------------------------------------------------------------------
const EXACT_PUBLIC_PATHS = new Set<string>([
  "/auth",
  "/contact",
  "/labs",
  // Funding & campaign
  "/crowdfund", "/indiegogo", "/campaign", "/evidence",
  "/nxt-campaign",
  // Video / media
  "/videos",
  // Developer docs
  "/docs", "/developer", "/developer-matrix",
  "/research-presentation",
  // Spectral framework
  "/spectral-db",
  "/spectral-router", "/spectral-search", "/spectral-contracts",
  "/spectral-bundle",
  // WNSP landing + known child routes
  "/wnsp", "/wnsp/ordinals",
  "/wnsp-ordinals",
  "/wnsp-bridge",
  "/wnsp-vm",
  // Nostr
  "/nostr", "/nostr-bridge",
  // Community & staking
  "/community-mint", "/wnsp-staking", "/join-community",
  // Marketplace / runes / BTC
  "/marketplace", "/market",
  "/rune-etching", "/rune-mint", "/etch-rune", "/rune-staking",
  "/rune-swap", "/rune-pipeline",
  "/stake-earn",
  "/fractal-btc",
  "/nxt-fb-swap", "/swap",
  "/btc-sentinel", "/btc-assets-sentinel",
  "/mempool",
  // Chain / ecosystem
  "/blockchain", "/ecosystem", "/network", "/snic",
  // Governance / open (public constitutional docs)
  "/open", "/constitution",
  // Science & theory
  "/oscillating-quanta", "/planck-alignment", "/reposed-theory", "/silicon-bridge",
  "/compression-explorer",
  "/unified-compression-theory", "/universal-one", "/matter-protocol", "/universal-address", "/element-catalogue", "/standing-wave-trap", "/lossless-channel",
  // Protocol & language
  "/wavelength-lang", "/ce-se-pipeline", "/ce-code-writer",
  "/divergence-test",
  // Hardware & spec
  "/hardware-spec", "/hardware-lab", "/mobile-sdk",
  // Infrastructure / economy pages
  "/nexus-hardware-os", "/orbital-treasury", "/spectral-library",
  // Misc public tools / pages
  "/nexus-command", "/nexus-analytics", "/receive", "/portfolio", "/lp-pools",
  "/airdrop", "/coinsniper", "/quest",
  "/wsats", "/roadmap", "/how-to-plug-in",
  "/encode", "/replit-template", "/proof", "/stewards", "/poc", "/joint-venture", "/founders",
  "/octave-layers", "/paper", "/hardware-results",
  // Public pages added to allowlist
  "/spectral-ide", "/resonance-cavity",
  "/build", "/shareholders",
  "/build-catalogue", "/nexus-explorer", "/psi-board",
  // Legacy redirect paths (server redirects in production)
  "/btc-bridge",
  // Routes registered in public Router()
  "/hardware-treasury", "/spectral-mirror",
]);

// ---------------------------------------------------------------------------
// Non-indexable SPA paths — the server must still return HTTP 200 + the SPA
// shell so the app works for authenticated users, but crawlers must NOT index
// these pages.  Every path here gets:
//   • X-Robots-Tag: noindex, nofollow  (HTTP header)
//   • <meta name="robots" content="noindex,nofollow">  (injected into <head>)
// ---------------------------------------------------------------------------
const NOINDEX_EXACT_PATHS = new Set<string>([
  // Root and protocol — mounted inside ProtectedRoutes in App.tsx;
  // logged-out visitors are redirected to /auth client-side, so these are not
  // real public landing pages and must not be indexed as such.
  "/",
  // Auth / sign-in — functional page but not a search landing page; must not
  // be indexed or inherit home-page canonical signals.
  "/auth",
  "/protocol",
  // Authenticated app screens
  "/wallet", "/lightning-wallet", "/lightning",
  "/inbox", "/messages",
  "/settings",
  "/friends",
  "/ledger", "/phonebook", "/directory",
  "/governance",
  "/kernel", "/kernel-genesis",
  "/developer/keys",
  "/agent-bus",
  "/streaming",
  "/transmission",
  "/media-library",
  "/p2p-terminal",
  "/secure-docs",
  "/social-broadcast",
  "/telegram-hub",
  "/stablecoin",
  "/pricing",
  "/community",
  "/communication", "/comms",
  "/pipeline", "/learn",
  "/start",
  "/github",
  "/sop",
  // Admin / user-specific
  "/admin/orders",
  "/passport",
  // Application shell / internal navigation
  "/hub", "/apps",
  // Version history / internal pages
  "/v6", "/v7", "/v8", "/v9", "/v10",
  // "/wnsp-uri" — omitted: 301-redirects to /wnsp (indexable); noindex not needed
  "/wnsp-paper",
  // Workspace sub-routes (internal tools)
  "/workspace/analytics", "/workspace/encoding", "/workspace/k1",
  "/workspace/matrix", "/workspace/orchestration", "/workspace/research",
  "/workspace/transmission", "/workspace/wavefield", "/workspace/coordinator",
  // WNSP internal sub-routes
  "/wnsp/coordinator", "/wnsp/kernel",
  // Nexus internal
  "/nexus/dev",
  // Science & research (internal / work-in-progress)
  "/computing-alternatives", "/quantum-threshold",
  "/photonic-dev", "/photonic-ledger",
  "/resonance-propulsion",
  "/wavelength-os",
  "/visualizer",
  "/encoding-lab", "/ce-writer",
  // Internal tools
  // "/spectral-uri" — omitted: 301-redirects to /wnsp (indexable); noindex not needed
  "/spectral-audit",
  "/spectral-video", "/spectral-workspace",
  "/ordinal-registry",
  // Internal community / social
  "/quora", "/reddit",
  "/chronicle",
  "/founders-charity",
  // Admin / kernel
  "/k1", "/k1/orchestration",
  "/announcements", "/announcements/substrate-v2",
]);

// Dynamic prefixes where any child is also non-indexable (user-specific content).
const NOINDEX_DYNAMIC_PREFIXES: string[] = [
  "/profile/",    // /profile/:username — user-specific, not a search landing page
  "/app/",        // /app/:slug — user contract apps, not promoted to search
];

// Only paths where ANY child segment is valid AND the page is a true public
// marketing / science / documentation page.
const DYNAMIC_PUBLIC_PREFIXES: string[] = [
  "/docs/",       // /docs/:section — public developer documentation
  // NOTE: /videos/:id is handled explicitly in isPublicSpaPath (numeric IDs only)
];

// Valid /docs/:section slugs — must stay in sync with DOCS_SECTIONS in
// client/src/pages/docs.tsx AND with DOCS_SECTION_META in server/seo-meta.ts.
// Every slug listed here:
//   • returns HTTP 200 (not 404) from the SPA catch-all route
//   • has a dedicated entry in DOCS_SECTION_META with title, description, and bodyHtml
//   • is linked from the /docs CollectionPage JSON-LD and sidebar nav
// Unknown slugs under /docs/ receive HTTP 404 so crawl budget isn't wasted on
// thin shells. If a section is removed from docs.tsx or seo-meta.ts it must
// also be removed here, and vice-versa.
const DOCS_SECTION_SLUGS = new Set<string>([
  "substrate",      // Lambda Gate Substrate v4
  "wascii",         // WNSP Protocol — Two-Layer Standard
  "consensus",      // Proof of Spectrum Consensus
  "economics",      // NXT Token Economics
  "bhls",           // BHLS Floor System
  "governance",     // Planetary Governance
  "infrastructure", // K1 Infrastructure
  "hardware",       // Hardware Control Layer
  "simulators",     // Energy Simulators
  "massless",       // Massless Technologies
  "catchBasin",     // CZC Catch Basin — returns HTTP 200 with full SEO metadata
  "sop",            // Spectral Orthogonal Protocol
]);

function isNoindexSpaPath(pathname: string): boolean {
  if (NOINDEX_EXACT_PATHS.has(pathname)) return true;
  return NOINDEX_DYNAMIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isPublicSpaPath(pathname: string): boolean {
  if (EXACT_PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/docs/")) {
    const rest = pathname.slice("/docs/".length);
    // Only exact /docs/<known-section> — no deeper segments allowed.
    if (rest.includes("/")) return false;
    return DOCS_SECTION_SLUGS.has(rest);
  }
  // Only exact numeric-ID paths are valid video detail pages; anything else gets 404.
  if (pathname.startsWith("/videos/")) {
    return /^\/videos\/\d+$/.test(pathname);
  }
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
  "wnsp.dev":              "https://wnsp.io/developer",
  "www.wnsp.dev":          "https://wnsp.io/developer",
  "wnsp.blog":             "https://wnsp.io/roadmap",
  "www.wnsp.blog":         "https://wnsp.io/roadmap",
  "snic.io":               "https://wnsp.io/snic",
  "www.snic.io":           "https://wnsp.io/snic",
  "phr1.io":               "https://wnsp.io/hardware-spec",
  "www.phr1.io":           "https://wnsp.io/hardware-spec",
  "lambdagate.io":         "https://wnsp.io/compression-explorer",
  "www.lambdagate.io":     "https://wnsp.io/compression-explorer",
  "wavelengthscript.dev":  "https://wnsp.io/wavelength-lang",
  "www.wavelengthscript.dev": "https://wnsp.io/wavelength-lang",
  "zerogstate.io":         "https://wnsp.io/hardware-spec",
  "www.zerogstate.io":     "https://wnsp.io/hardware-spec",
  "wascii.io":             "https://wnsp.io/ce-code-writer",
  "www.wascii.io":         "https://wnsp.io/ce-code-writer",
  "orbitaltreasury.io":    "https://wnsp.io/orbital-treasury",
  "www.orbitaltreasury.io": "https://wnsp.io/orbital-treasury",
  "555thz.io":                "https://wnsp.io/oscillating-quanta",
  "www.555thz.io":            "https://wnsp.io/oscillating-quanta",
  "spectralmirror.io":        "https://wnsp.io/spectral-mirror",
  "www.spectralmirror.io":    "https://wnsp.io/spectral-mirror",
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
        `Contact: mailto:security@wnsp.io`,
        `Contact: https://wnsp.io/contact`,
        `Expires: ${expires.toISOString()}`,
        `Canonical: https://wnsp.io/.well-known/security.txt`,
        `Policy: https://wnsp.io/contact`,
        `Preferred-Languages: en`,
        `Scope: https://wnsp.io`,
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

  // ── Server-side redirects for alias/legacy paths ─────────────────────────
  // These replace the client-side window.location.replace() pattern so
  // crawlers that do not execute JavaScript receive a proper 301 redirect
  // instead of landing on a metadata-only SPA shell.
  const ALIAS_REDIRECTS: Record<string, string> = {
    "/spectral-video":                       "/videos",
    "/spectral-uri":                         "/wnsp",
    "/wnsp-uri":                             "/wnsp",
    "/visualizer":                           "/compression-explorer",
    "/btc-bridge":                           "/wnsp-ordinals",
    "/wnsp/ordinals":                        "/wnsp-ordinals",
    // SEO consolidation — alias → canonical 301 redirects
    "/fund":                                 "/crowdfund",
    "/developer-matrix/docs":               "/docs",
    "/research-presentation/developer-matrix": "/developer-matrix",
    "/nexus-spectral":                       "/spectral-db",
    "/bitcoin-ordinals":                     "/wnsp-ordinals",
    "/nostr-relay":                          "/nostr",
    "/fractal-bitcoin":                      "/fractal-btc",
    "/charter":                              "/open",
    "/wnsp/bridge":                          "/wnsp-bridge",
  };
  for (const [from, to] of Object.entries(ALIAS_REDIRECTS)) {
    app.get(from, (_req: Request, res: Response) => {
      res.redirect(301, to);
    });
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
      const domain     = cleanHost.startsWith("www.") ? cleanHost.slice(4) : cleanHost;
      res
        .status(200)
        .type("text/plain")
        .send(
          `User-agent: *\nAllow: /\n\n# ${domain} — root microsite\nSitemap: https://wnsp.io/sitemap.xml\n# Canonical: ${canonical}\n`,
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
  // canonical page. For wnsp.io, the static sitemap.xml is merged with live
  // video detail URLs fetched from the database so every public /videos/:id
  // page is discoverable without manual maintenance.
  app.get("/sitemap.xml", async (req: Request, res: Response) => {
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

    // For wnsp.io: read the static sitemap and append live video detail URLs.
    try {
      const staticPath = path.join(distPath, "sitemap.xml");
      const staticXml  = await fs.promises.readFile(staticPath, "utf8");

      // Fetch all public video records from the DB.
      let videoEntries = "";
      try {
        const videos = await storage.getTelegramVideos(10000);
        if (videos.length > 0) {
          videoEntries = videos.map((v) => [
            `  <url>`,
            `    <loc>https://wnsp.io/videos/${v.id}</loc>`,
            `    <changefreq>weekly</changefreq>`,
            `    <priority>0.75</priority>`,
            `  </url>`,
          ].join("\n")).join("\n");
        }
      } catch {
        // DB unavailable — serve static sitemap without video entries.
      }

      let merged: string;
      if (videoEntries) {
        // Insert video <url> entries before the closing </urlset> tag.
        merged = staticXml.replace(
          /(<\/urlset>)\s*$/,
          `\n  <!-- ── Video Detail Pages (dynamic) ──────────────────────────────────── -->\n${videoEntries}\n\n$1`,
        );
      } else {
        merged = staticXml;
      }

      res.status(200).type("application/xml").send(merged);
    } catch {
      // Static file missing — send a minimal fallback.
      res.status(404).end();
    }
  });

  // ── Host-aware llms.txt ───────────────────────────────────────────────────
  // Custom domains each get a host-specific llms.txt so AI crawlers visiting
  // wnsp.dev, snic.io, etc. are told about that domain's own root content.
  // The main wnsp.io llms.txt is served as a static file from client/public/.
  const MICROSITE_LLMS: Record<string, string> = {
    "wnsp.dev": [
      "# wnsp.dev — WNSP Developer Portal",
      "",
      "Build physics-native applications on the Wavelength-Native Spectral Protocol.",
      "Addresses are wavelengths. Fees are photon energies. CE encoding maps every",
      "character to a visible-light frequency.",
      "",
      "> https://wnsp.io/developer",
      "",
      "WNSP developer portal. Install nexusos-ce-encoder (npm/pip) and start building",
      "spectral-native apps using the WNSP VM, WavelengthScript compiler, and CE→SE",
      "pipeline. AGPL-3.0.",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/wavelength-lang",
      "> https://wnsp.io/wnsp-vm",
      "> https://wnsp.io/ce-se-pipeline",
      "> https://wnsp.io/docs",
    ].join("\n"),

    "wnsp.blog": [
      "# wnsp.blog — NexusOS Build Log",
      "",
      "Physics updates, protocol milestones, and hardware development notes from the",
      "NexusOS core team. Follow the construction of a Kardashev Type I civilization OS.",
      "",
      "> https://wnsp.io/roadmap",
      "",
      "Development blog for NexusOS — the physics-based civilization OS.",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/roadmap",
      "> https://wnsp.io/hardware-spec",
      "> https://wnsp.io/proof",
    ].join("\n"),

    "snic.io": [
      "# snic.io — SNIC Spectral Network Interface Card",
      "",
      "The photonic NIC of 2032. 51,200 orthogonal channels (256 WDM × 50 OAM × 2 POL × 2 DIR)",
      "mapped to physical hardware lanes. CE lookups execute as physical",
      "wavelength selections. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics, not software policy.",
      "",
      "> https://wnsp.io/snic",
      "",
      "SNIC is the hardware layer for WNSP spectral computing. First public disclosure",
      "2026-05-16. AGPL-3.0.",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/hardware-spec",
      "> https://wnsp.io/snic",
      "> https://wnsp.io/crowdfund",
    ].join("\n"),

    "phr1.io": [
      "# phr1.io — PHR-1 The First ZERO-G State Device",
      "",
      "PHR-1 is the first physical resonator implementing the ZERO-G state.",
      "Gravitational de-correlation through phase alignment of a 144-turn bifilar coil",
      "at Lambda Gate resonance frequency. 25 Hardware Founder slots. AGPL-3.0.",
      "",
      "> https://wnsp.io/hardware-spec",
      "",
      "First public disclosure: 2026-05-16.",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/hardware-spec",
      "> https://wnsp.io/crowdfund",
      "> https://wnsp.io/hardware-lab",
    ].join("\n"),

    "lambdagate.io": [
      "# lambdagate.io — Lambda Gate Λ=hf/c²",
      "",
      "The compression equation that describes the universe. Every photon has a",
      "compression state. Every compression state has a wavelength. Every wavelength",
      "is an address. Λ=hf/c² unifies computation, communication, and gravity.",
      "",
      "> https://wnsp.io/compression-explorer",
      "",
      "Lambda Gate Substrate — the theoretical and physical basis for NexusOS physics.",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/oscillating-quanta",
      "> https://wnsp.io/compression-explorer",
      "> https://wnsp.io/proof",
    ].join("\n"),

    "wavelengthscript.dev": [
      "# wavelengthscript.dev — WavelengthScript Programming Language",
      "",
      "A physics-native programming language where agents live at spectral Ψ addresses,",
      "messages are photon packets, and computation costs are derived from E=hf.",
      "Compiles to WNSP bytecode. Runs in the browser-native WNSP VM. AGPL-3.0.",
      "",
      "> https://wnsp.io/wavelength-lang",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/wavelength-lang",
      "> https://wnsp.io/wnsp-vm",
      "> https://wnsp.io/ce-se-pipeline",
    ].join("\n"),

    "zerogstate.io": [
      "# zerogstate.io — ZERO-G State Gravitational De-correlation",
      "",
      "The ZERO-G state is achieved through phase alignment of a 144-turn bifilar coil",
      "at Lambda Gate resonance frequency. When phase coherence is reached, local",
      "gravitational coupling is measurably reduced. PHR-1 is the first hardware",
      "implementation. AGPL-3.0, first public disclosure 2026-05-16.",
      "",
      "> https://wnsp.io/hardware-spec",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/hardware-spec",
      "> https://wnsp.io/proof",
      "> https://wnsp.io/crowdfund",
    ].join("\n"),

    "wascii.io": [
      "# wascii.io — WASCII v2.0 Wave Density Spectral Vector Encoding",
      "",
      "WASCII maps every character to a unique compression state in the electromagnetic",
      "spectrum. 128 spectral bands, 380–780 nm, 3.125 nm per band. Bit-identical",
      "output across npm and pip. Open encoding standard for physics-native computing.",
      "",
      "> https://wnsp.io/ce-code-writer",
      "",
      "Algorithm: CE_TABLE[charCode % 128]. AGPL-3.0.",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/ce-code-writer",
      "> https://wnsp.io/ce-se-pipeline",
      "> https://wnsp.io/compression-explorer",
    ].join("\n"),

    "orbitaltreasury.io": [
      "# orbitaltreasury.io — Orbital Treasury NXT Circular Economy",
      "",
      "The Orbital Treasury is the economic core of NexusOS. All NXT protocol fees",
      "flow here — never burned. Five governance-controlled distribution buckets:",
      "Maintenance 35%, Deliverables 25%, Research 20%, Agent Rewards 10%,",
      "Nexus Charitable Trust 10%. 100% on-chain transparency.",
      "",
      "> https://wnsp.io/orbital-treasury",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/nxt-campaign",
      "> https://wnsp.io/blockchain",
      "> https://wnsp.io/open",
    ].join("\n"),

    "spectralmirror.io": [
      "# spectralmirror.io — The First Electromagnetic Archive",
      "",
      "Spectral Mirror is a live, permanent archive of every message and P2P transmission",
      "that passes through the WNSP protocol layer. Each record is CE-encoded: its dominant",
      "wavelength is derived from λ = 380 + (charCode % 128) × 3.125 nm. The Ψ channel",
      "address Ψ(wdm, oam, pol) is computed from the content itself.",
      "",
      "> https://wnsp.io/spectral-mirror",
      "",
      "Recording began 2 May 2026. This genesis date cannot be recreated — it is the",
      "first and only continuous electromagnetic archive at these coordinates in history.",
      "This is a once-only feature: the archive cannot be restarted from its original",
      "genesis point. Whoever holds spectralmirror.io holds the original record.",
      "",
      "## Live archive endpoints (public, no auth required)",
      "",
      "> https://wnsp.io/api/mirror/public-stats",
      "> https://wnsp.io/api/mirror/transmissions?n=30",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/spectral-mirror",
      "> https://wnsp.io/ce-se-pipeline",
      "> https://wnsp.io/oscillating-quanta",
    ].join("\n"),

    "555thz.io": [
      "# 555thz.io — 555 THz The First Unobserved Oscillation",
      "",
      "555 THz is green light. The first unobserved oscillation — the moment Λ",
      "transitioned from unformed to formed. The origin event that the Theory of",
      "Compression States describes. λ ≈ 540 nm. NexusOS is built on what happened next.",
      "",
      "> https://wnsp.io/oscillating-quanta",
      "",
      "## Key resources on the main site",
      "",
      "> https://wnsp.io/oscillating-quanta",
      "> https://wnsp.io/compression-explorer",
      "> https://wnsp.io/proof",
    ].join("\n"),
  };

  app.get("/llms.txt", (req: Request, res: Response) => {
    const host      = req.hostname || (req.headers.host as string) || "";
    const cleanHost = host.split(":")[0];
    const bareHost  = cleanHost.startsWith("www.") ? cleanHost.slice(4) : cleanHost;

    const content = MICROSITE_LLMS[bareHost] ?? MICROSITE_LLMS[cleanHost];
    if (content) {
      res.status(200).type("text/plain").send(content + "\n");
      return;
    }

    // Fall through to static file for wnsp.io and unknown hosts.
    res.sendFile(path.join(distPath, "llms.txt"), (err) => {
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
  app.use("*", async (req, res) => {
    const spaPathname = requestPathname(req);
    const host        = req.hostname || (req.headers.host as string) || "";
    const cleanHost   = host.split(":")[0];
    const pathname    = req.originalUrl.split("?")[0] || "/";

    let status: number;
    let noindex = false;

    if (CUSTOM_DOMAIN_HOSTS.has(cleanHost)) {
      // Custom domains serve only their root landing page.
      status = (spaPathname === "/" || spaPathname === "") ? 200 : 404;
    } else if (isNoindexSpaPath(spaPathname)) {
      // Authenticated / non-promoted routes: serve SPA shell so the app works
      // for logged-in users, but signal to crawlers that the page must not be
      // indexed.
      status  = 200;
      noindex = true;
    } else {
      status = isPublicSpaPath(spaPathname) ? 200 : 404;
    }

    let html: string;
    const videoDetailMatch = !CUSTOM_DOMAIN_HOSTS.has(cleanHost) ? spaPathname.match(/^\/videos\/(\d+)$/) : null;
    if (spaPathname === "/videos" && !CUSTOM_DOMAIN_HOSTS.has(cleanHost)) {
      // Inject live video data so crawlers receive real VideoObject schema
      // and a noscript block with crawlable links to each Telegram post.
      try {
        const videos = await storage.getTelegramVideos(20);
        const meta   = buildVideosPageMeta(videos);
        html = injectCustomMeta(getHtml(), meta);
      } catch {
        html = injectMeta(getHtml(), host, pathname);
      }
    } else if (videoDetailMatch) {
      // First-party video detail page — emit a canonical VideoObject that
      // resolves to this NexusOS URL, with Telegram kept as a secondary
      // outbound (sameAs) reference only.
      try {
        const video = await storage.getTelegramVideo(Number(videoDetailMatch[1]));
        if (video) {
          const meta = buildVideoDetailPageMeta(video);
          html = injectCustomMeta(getHtml(), meta);
        } else {
          status = 404;
          html = injectMeta(getHtml(), host, pathname);
        }
      } catch {
        html = injectMeta(getHtml(), host, pathname);
      }
    } else {
      html = injectMeta(getHtml(), host, pathname);
    }

    if (noindex) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      html = html.replace(
        /(<head[^>]*>)/i,
        '$1\n    <meta name="robots" content="noindex,nofollow">',
      );
    }

    res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });
}
