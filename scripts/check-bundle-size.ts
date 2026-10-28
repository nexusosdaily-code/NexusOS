/**
 * Bundle size guard — run after `vite build`.
 *
 * Thresholds (gzip):
 *   entry chunk   (resolved from dist/public/index.html)  ≤ 35 KB
 *   vendor-react  (vendor-react-*.js)                     ≤ 70 KB
 *
 * Exits with code 1 when any threshold is exceeded OR when a required
 * chunk cannot be found, so silent regressions cannot ship undetected.
 *
 * Exported as `checkBundleSize()` for use in script/build.ts.
 * Runnable standalone via `npm run check:bundle`.
 */

import { readdir, readFile } from "fs/promises";
import { createGzip } from "zlib";
import { Readable } from "stream";
import path from "path";

const DIST_PUBLIC = path.resolve("dist/public");
const ASSETS_DIR = path.join(DIST_PUBLIC, "assets");

// ─── helpers ──────────────────────────────────────────────────────────────────

async function gzipSize(filePath: string): Promise<number> {
  const raw = await readFile(filePath);
  return new Promise((resolve, reject) => {
    const gzip = createGzip({ level: 9 });
    let size = 0;
    Readable.from(raw).pipe(gzip);
    gzip.on("data", (chunk: Buffer) => {
      size += chunk.length;
    });
    gzip.on("end", () => resolve(size));
    gzip.on("error", reject);
  });
}

/**
 * Parse dist/public/index.html and return the basename of the entry JS module.
 * Vite emits exactly one <script type="module" … src="/assets/index-*.js"> tag.
 */
async function resolveEntryChunk(): Promise<string> {
  const html = await readFile(path.join(DIST_PUBLIC, "index.html"), "utf-8");
  const match = html.match(
    /<script[^>]+type=["']module["'][^>]+src=["']\/assets\/(index-[^"']+\.js)["']/,
  );
  if (!match) {
    throw new Error(
      "[bundle-size] Could not locate the entry <script type=module> in dist/public/index.html.\n" +
        "  Ensure the build completed successfully before running this check.",
    );
  }
  return match[1]; // e.g. "index-DPqRIfRB.js"
}

// ─── core check (shared by export and standalone main) ───────────────────────

/**
 * Check bundle sizes. Throws on any violation or missing required chunk.
 * Call this from build pipelines; it never calls process.exit() directly.
 */
export async function checkBundleSize(): Promise<void> {
  // Fail fast if the assets directory doesn't exist at all.
  let files: string[];
  try {
    files = await readdir(ASSETS_DIR);
  } catch {
    throw new Error(
      `[bundle-size] Assets directory not found: ${ASSETS_DIR}\n` +
        "  Run `npm run build` before running this check.",
    );
  }

  // Resolve entry chunk from index.html — deterministic, not glob-based.
  const entryFilename = await resolveEntryChunk();

  // Vendor-react: unambiguous because manualChunks names it deterministically.
  const vendorReact = files.find((f) => /^vendor-react-[^/]+\.js$/.test(f));
  if (!vendorReact) {
    throw new Error(
      "[bundle-size] vendor-react chunk not found in dist/public/assets.\n" +
        "  The React 19 manualChunks split may have been broken — check vite.config.ts.",
    );
  }

  const thresholds = [
    { filename: entryFilename, label: "entry chunk", maxGzipKB: 35 },
    { filename: vendorReact, label: "vendor-react chunk", maxGzipKB: 70 },
  ];

  const violations: string[] = [];

  for (const { filename, label, maxGzipKB } of thresholds) {
    if (!files.includes(filename)) {
      violations.push(
        `  "${label}": expected file "${filename}" not found in assets.`,
      );
      console.error(
        `[bundle-size] ✗ MISSING  ${label}  ${filename}  (required)`,
      );
      continue;
    }

    const bytes = await gzipSize(path.join(ASSETS_DIR, filename));
    const kb = bytes / 1024;
    const ok = kb <= maxGzipKB;

    console.log(
      `[bundle-size] ${ok ? "✓ PASS" : "✗ FAIL"}  ${label}  ${filename}  ${kb.toFixed(1)} KB gzip  (limit: ${maxGzipKB} KB)`,
    );

    if (!ok) {
      violations.push(
        `  "${label}" (${filename}): ${kb.toFixed(1)} KB gzip exceeds ${maxGzipKB} KB limit.\n` +
          "    Check for synchronous (non-lazy) imports added to App.tsx or the entry point.",
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(
      "[bundle-size] Chunk size limit exceeded:\n" + violations.join("\n"),
    );
  }

  console.log("[bundle-size] All chunks within size limits.");
}

// ─── standalone entry (npm run check:bundle) ─────────────────────────────────

// Only run main() when this file is executed directly (not imported).
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkBundleSize().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}
