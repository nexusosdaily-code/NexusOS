/**
 * embed_filetree.mjs
 * Reads every source file in the project and stores it in the Spectral Database.
 * Each file gets encoded to a wavelength address via Λ = hf/c².
 */

import { execSync } from "child_process";
import { readFileSync, statSync } from "fs";
import { extname, relative } from "path";

const BASE_URL = "http://localhost:5000";
const ROOT     = "/home/runner/workspace";

// ── Skip binary / large / irrelevant extensions ───────────────────────────────
const BINARY_EXTS = new Set([
  ".png",".jpg",".jpeg",".gif",".webp",".ico",".svg",
  ".mp4",".webm",".mov",".avi",".mkv",
  ".mp3",".wav",".ogg",
  ".woff",".woff2",".ttf",".otf",".eot",
  ".pdf",".zip",".gz",".tar",
  ".so",".a",".dylib",".dll",".exe",
  ".pkl",".pkl.gz",".bin",".dat",".npz",".npy",
  ".pyd",
]);
const MAX_BYTES = 80_000; // skip files larger than 80 KB — content too large for the DB
const SKIP_NAMES = new Set([
  "package-lock.json","yarn.lock","pnpm-lock.yaml",".DS_Store",
]);

// ── Get file list ─────────────────────────────────────────────────────────────
const raw = execSync(
  `find ${ROOT} -type f \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/__pycache__/*" \
  ! -path "*/.uv/*" \
  ! -path "*/.venv/*" \
  ! -path "*/.pythonlibs/*" \
  ! -path "*/dist/*" \
  ! -path "*/.cache/*" \
  ! -path "*/.local/*" \
  ! -name "*.pyc" \
  ! -name "*.map" \
  ! -name "*.lock" \
  | sort`,
  { encoding: "utf8", maxBuffer: 10_000_000 }
).trim();

const allFiles = raw.split("\n").filter(Boolean);
console.log(`Found ${allFiles.length} files`);

// ── Authenticate ──────────────────────────────────────────────────────────────
async function login() {
  const r = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Nexus", password: "barkingdog2" }),
  });
  const d = await r.json();
  if (!d.token) throw new Error(`Auth failed: ${JSON.stringify(d)}`);
  console.log(`Authenticated as ${d.user?.username}`);
  return d.token;
}

// ── Store one file in the spectral DB ─────────────────────────────────────────
async function storeFile(token, filePath) {
  const relPath = relative(ROOT, filePath);
  const label   = relPath;
  const ext     = extname(filePath).toLowerCase();

  if (BINARY_EXTS.has(ext)) return { skip: "binary" };
  const base = filePath.split("/").pop() ?? "";
  if (SKIP_NAMES.has(base)) return { skip: "ignored" };

  let stat;
  try { stat = statSync(filePath); } catch { return { skip: "stat-err" }; }
  if (stat.size > MAX_BYTES) return { skip: `too-large (${(stat.size/1024).toFixed(0)} KB)` };
  if (stat.size === 0)        return { skip: "empty" };

  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return { skip: "read-err (binary?)" };
  }

  const r = await fetch(`${BASE_URL}/api/spectral-db/store`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ label, content }),
  });
  const d = await r.json();
  if (!r.ok) return { err: d.error ?? "unknown" };
  return { ok: true, nm: d.record?.wavelengthNm, psi: d.record?.psiChannel, band: d.record?.band };
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function main() {
  const token = await login();

  let ok = 0, skipped = 0, failed = 0;
  const DELAY_MS = 80; // avoid hammering Flask

  for (let i = 0; i < allFiles.length; i++) {
    const f = allFiles[i];
    const result = await storeFile(token, f);

    if (result.ok) {
      ok++;
      const relPath = relative(ROOT, f).padEnd(60);
      console.log(`[${i+1}/${allFiles.length}] ✓ ${relPath} → ${parseFloat(result.nm).toFixed(2)}nm ${result.psi} [${result.band}]`);
    } else if (result.skip) {
      skipped++;
      // only log first few skips
      if (skipped <= 5 || result.skip.includes("too-large")) {
        console.log(`[${i+1}/${allFiles.length}] ⊘ ${relative(ROOT, f)} — ${result.skip}`);
      }
    } else {
      failed++;
      console.log(`[${i+1}/${allFiles.length}] ✗ ${relative(ROOT, f)} — ${result.err}`);
    }

    if (result.ok) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Done.  Stored: ${ok}  Skipped: ${skipped}  Failed: ${failed}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
