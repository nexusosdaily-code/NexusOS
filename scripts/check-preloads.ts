/**
 * Critical modulepreload guard — run after `vite build`.
 *
 * Reads dist/public/index.html and asserts that <link rel="modulepreload">
 * tags exist for EVERY chunk listed in REQUIRED_CHUNKS. These tags are
 * injected by criticalChunkPreloadPlugin() in vite.config.ts; a Vite config
 * change or chunk rename would silently drop them without this check.
 *
 * Exits non-zero (fails the build) if any required preload tag is missing.
 *
 * Exported as `checkPreloads()` for use in script/build.ts.
 * Runnable standalone via `npm run check:preloads`.
 */

import { readFile } from "fs/promises";
import path from "path";
import { CRITICAL_CHUNKS } from "./critical-chunks.js";

const INDEX_HTML = path.resolve("dist/public/index.html");

/**
 * The chunk name prefixes that MUST appear as modulepreload hrefs in
 * index.html after every build. Derived from the single source of truth
 * in scripts/critical-chunks.ts — no manual sync required.
 */
const REQUIRED_CHUNKS = CRITICAL_CHUNKS;

// ─── core check (shared by export and standalone main) ───────────────────────

/**
 * Check that all required modulepreload tags are present in index.html.
 * Throws on any missing tag so the caller (build pipeline) can decide how
 * to surface the failure. Never calls process.exit() directly.
 */
export async function checkPreloads(): Promise<void> {
  let html: string;
  try {
    html = await readFile(INDEX_HTML, "utf-8");
  } catch {
    throw new Error(
      `[check-preloads] Could not read ${INDEX_HTML}\n` +
        "  Run `npm run build` before running this check.",
    );
  }

  // Collect every modulepreload href present in the file.
  // Vite/plugin emits:  <link rel="modulepreload" crossorigin href="/assets/<name>-<hash>.js">
  const preloadRe =
    /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["'][^>]*>/g;
  const preloadedHrefs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = preloadRe.exec(html)) !== null) {
    preloadedHrefs.push(m[1]);
  }

  const missing: string[] = [];

  for (const chunkName of REQUIRED_CHUNKS) {
    // Match e.g. "/assets/wallet-D0rllTFl.js" or "/assets/lightning-wallet-BLVLtIBK.js"
    const found = preloadedHrefs.some((href) =>
      // The chunk filename starts with the chunk name followed by a dash and hash.
      new RegExp(`/${chunkName}-[^/]+\\.js$`).test(href),
    );

    if (found) {
      console.log(
        `[check-preloads] ✓ PASS  <link rel="modulepreload"> found for "${chunkName}"`,
      );
    } else {
      console.error(
        `[check-preloads] ✗ FAIL  <link rel="modulepreload"> MISSING for "${chunkName}"`,
      );
      missing.push(chunkName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      "[check-preloads] Missing modulepreload tags for: " +
        missing.map((c) => `"${c}"`).join(", ") +
        "\n" +
        "  Ensure criticalChunkPreloadPlugin() in vite.config.ts still lists these chunk names\n" +
        "  in its CRITICAL set, and that the corresponding lazy-import routes still exist.",
    );
  }

  console.log("[check-preloads] All required modulepreload tags present.");
}

// ─── standalone entry (npm run check:preloads) ────────────────────────────────

// Only run main() when this file is executed directly (not imported).
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkPreloads().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}
