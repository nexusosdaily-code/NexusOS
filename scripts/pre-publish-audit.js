#!/usr/bin/env node
/**
 * NexusOS Pre-Publish Audit
 * Run before every deploy: node scripts/pre-publish-audit.js
 *
 * Checks:
 *  1. Every lazy-imported page file exists on disk
 *  2. Every static route in App.tsx is covered by static.ts
 *  3. No protected routes (from replit.md) have been removed
 *  4. Build succeeds cleanly
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── ANSI colours ──────────────────────────────────────────────────────────────
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

const ok   = (msg) => console.log(`  ${GREEN}✓${RESET} ${msg}`);
const fail = (msg) => console.log(`  ${RED}✗${RESET} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
const info = (msg) => console.log(`  ${CYAN}→${RESET} ${msg}`);

let failures = 0;
let warnings = 0;

function FAIL(msg) { fail(msg); failures++; }
function WARN(msg) { warn(msg); warnings++; }

// ─────────────────────────────────────────────────────────────────────────────
// 1. Parse lazy imports from App.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}${CYAN}[1/4] Lazy import → file existence${RESET}`);

const appTsx = fs.readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf8");
const lazyRe = /lazy\(\s*\(\)\s*=>\s*import\("@\/pages\/([^"]+)"\)\s*\)/g;
const lazyImports = [];
let m;
while ((m = lazyRe.exec(appTsx)) !== null) {
  lazyImports.push(m[1]);
}

const missingFiles = [];
for (const imp of lazyImports) {
  const filePath = path.join(ROOT, "client/src/pages", `${imp}.tsx`);
  if (!fs.existsSync(filePath)) {
    FAIL(`import("@/pages/${imp}") — file NOT found: client/src/pages/${imp}.tsx`);
    missingFiles.push(imp);
  }
}
if (missingFiles.length === 0) {
  ok(`All ${lazyImports.length} lazy imports resolve to existing files`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Parse routes from App.tsx → check static.ts coverage
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}${CYAN}[2/4] Route → static.ts coverage${RESET}`);

// Extract all Route path="..." values
const routeRe = /path="(\/[^"*?]+)"/g;
const appRoutes = new Set();
while ((m = routeRe.exec(appTsx)) !== null) {
  const p = m[1];
  // Skip dynamic segments (contain :param)
  if (!p.includes(":")) appRoutes.add(p);
}

// Extract EXACT_PUBLIC_PATHS from static.ts
const staticTs = fs.readFileSync(path.join(ROOT, "server/static.ts"), "utf8");

// Pull the Set literal contents
const setBlockRe = /const EXACT_PUBLIC_PATHS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/;
const setBlock = setBlockRe.exec(staticTs);
const staticPaths = new Set();
if (setBlock) {
  const strRe = /"(\/[^"]+)"/g;
  while ((m = strRe.exec(setBlock[1])) !== null) {
    staticPaths.add(m[1]);
  }
}

// Extract DYNAMIC_PUBLIC_PREFIXES
const prefixRe = /"(\/[^"]+\/)"/g;
const prefixBlockRe = /const DYNAMIC_PUBLIC_PREFIXES[^=]*=\s*\[([\s\S]*?)\];/;
const prefixBlock = prefixBlockRe.exec(staticTs);
const dynamicPrefixes = [];
if (prefixBlock) {
  while ((m = prefixRe.exec(prefixBlock[1])) !== null) {
    dynamicPrefixes.push(m[1]);
  }
}

// Routes that are intentionally auth-only (server always returns HTML for
// authenticated users, 401 redirect for guests — static.ts doesn't need them
// because the server always serves the SPA shell, then the SPA handles auth).
// However — if the server returns 404 for an unknown path in production,
// authenticated users also get a 404 before the SPA even loads.
// Therefore ALL routes must be in static.ts.
const missingFromStatic = [];
for (const route of [...appRoutes].sort()) {
  // Check exact match
  if (staticPaths.has(route)) continue;
  // Check dynamic prefix match
  if (dynamicPrefixes.some(prefix => route.startsWith(prefix))) continue;
  missingFromStatic.push(route);
}

if (missingFromStatic.length === 0) {
  ok(`All ${appRoutes.size} routes covered by EXACT_PUBLIC_PATHS or DYNAMIC_PUBLIC_PREFIXES`);
} else {
  console.log(`\n  ${RED}${missingFromStatic.length} route(s) missing from static.ts:${RESET}`);
  for (const r of missingFromStatic) {
    FAIL(`"${r}" → in App.tsx but NOT in server/static.ts EXACT_PUBLIC_PATHS`);
  }
  console.log(`\n  ${YELLOW}Fix: add the missing paths to EXACT_PUBLIC_PATHS in server/static.ts${RESET}`);
}

// Reverse: paths in static.ts not in App.tsx (stale allowlist entries — just warnings)
const staleInStatic = [];
for (const p of staticPaths) {
  if (p === "/") continue;
  if (!appRoutes.has(p) && !dynamicPrefixes.some(pf => p.startsWith(pf))) {
    staleInStatic.push(p);
  }
}
if (staleInStatic.length > 0) {
  info(`${staleInStatic.length} paths in static.ts have no matching App.tsx route (stale but harmless):`);
  for (const p of staleInStatic.slice(0, 12)) {
    warn(`  stale in static.ts: "${p}"`);
  }
  if (staleInStatic.length > 12) warn(`  ... and ${staleInStatic.length - 12} more`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Protected routes from replit.md must still exist
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}${CYAN}[3/4] Protected route integrity (replit.md safeguards)${RESET}`);

const PROTECTED = [
  { route: "/ce-se-pipeline",      file: "client/src/pages/learn.tsx" },
  { route: "/wnsp-vm",             file: "client/src/pages/wnsp-vm.tsx" },
  { route: "/wavelength-lang",     file: "client/src/pages/wavelength-lang.tsx" },
  { route: "/ce-code-writer",      file: "client/src/pages/ce-code-writer.tsx" },
  { route: "/compression-explorer",file: "client/src/pages/compression-explorer.tsx" },
  { route: "/oscillating-quanta",  file: "client/src/pages/oscillating-quanta.tsx" },
  { route: "/hardware-lab",        file: "client/src/pages/hardware-lab.tsx" },
  { route: "/hardware-spec",       file: "client/src/pages/hardware-spec.tsx" },
];

for (const { route, file } of PROTECTED) {
  const hasRoute = appTsx.includes(`path="${route}"`);
  const hasFile  = fs.existsSync(path.join(ROOT, file));
  if (!hasRoute) FAIL(`PROTECTED route "${route}" missing from App.tsx`);
  if (!hasFile)  FAIL(`PROTECTED file "${file}" missing from disk`);
  if (hasRoute && hasFile) ok(`${route} → ${file}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Build
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}${CYAN}[4/4] Build health${RESET}`);

try {
  const out = execSync("npm run build 2>&1", { cwd: ROOT, encoding: "utf8" });
  const hasError = /error/i.test(out) && !/0 errors/i.test(out);
  if (hasError) {
    FAIL("Build completed but output contains errors");
    console.log(out.slice(-800));
  } else {
    const doneMatch = out.match(/Done in [\d.]+/);
    ok(`Build succeeded  ${doneMatch ? doneMatch[0] : ""}`);
  }
} catch (e) {
  FAIL("Build FAILED");
  console.log((e.stdout || e.message || "").slice(-1200));
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
if (failures === 0 && warnings === 0) {
  console.log(`${BOLD}${GREEN}✅ AUDIT PASSED — safe to publish${RESET}`);
} else if (failures === 0) {
  console.log(`${BOLD}${YELLOW}⚠  AUDIT PASSED with ${warnings} warning(s) — review above${RESET}`);
} else {
  console.log(`${BOLD}${RED}❌ AUDIT FAILED — ${failures} error(s), ${warnings} warning(s)${RESET}`);
  console.log(`${RED}   Fix the issues above before publishing to wnsp.io${RESET}`);
}
console.log(`${"─".repeat(60)}\n`);

process.exit(failures > 0 ? 1 : 0);
