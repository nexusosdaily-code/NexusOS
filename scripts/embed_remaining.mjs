import { execSync } from "child_process";
import { readFileSync, statSync } from "fs";
import { extname, relative } from "path";

const BASE_URL = "http://localhost:5000";
const ROOT     = "/home/runner/workspace";

const BINARY_EXTS = new Set([
  ".png",".jpg",".jpeg",".gif",".webp",".ico",".svg",
  ".mp4",".webm",".mov",".woff",".woff2",".ttf",".otf",
  ".pdf",".zip",".gz",".tar",".so",".a",".dll",".exe",
  ".pkl",".bin",".dat",".pyc",".pyd",
]);
const MAX_BYTES = 80_000;

const raw = execSync(
  `find ${ROOT}/wnsp-wiki ${ROOT}/wnsp_v7 -type f ! -name "*.pyc" | sort`,
  { encoding: "utf8", maxBuffer: 5_000_000 }
).trim();
const files = raw.split("\n").filter(Boolean);
console.log(`Embedding ${files.length} remaining files…`);

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

async function storeFile(token, filePath) {
  const relPath = relative(ROOT, filePath);
  const ext = extname(filePath).toLowerCase();
  if (BINARY_EXTS.has(ext)) return { skip: "binary" };
  let stat;
  try { stat = statSync(filePath); } catch { return { skip: "stat-err" }; }
  if (stat.size > MAX_BYTES) return { skip: `too-large (${(stat.size/1024).toFixed(0)} KB)` };
  if (stat.size === 0) return { skip: "empty" };
  let content;
  try { content = readFileSync(filePath, "utf8"); } catch { return { skip: "read-err" }; }

  const r = await fetch(`${BASE_URL}/api/spectral-db/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ label: relPath, content }),
  });
  const d = await r.json();
  if (!r.ok) return { err: d.error ?? "unknown" };
  return { ok: true, nm: d.record?.wavelengthNm, psi: d.record?.psiChannel, band: d.record?.band };
}

async function main() {
  const token = await login();
  let ok = 0, skipped = 0, failed = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const result = await storeFile(token, f);
    const relPath = relative(ROOT, f);
    if (result.ok) {
      ok++;
      console.log(`[${i+1}/${files.length}] ✓ ${relPath.padEnd(55)} → ${parseFloat(result.nm).toFixed(2)}nm ${result.psi} [${result.band}]`);
      await new Promise(r => setTimeout(r, 60));
    } else if (result.skip) {
      skipped++;
      console.log(`[${i+1}/${files.length}] ⊘ ${relPath} — ${result.skip}`);
    } else {
      failed++;
      console.log(`[${i+1}/${files.length}] ✗ ${relPath} — ${result.err}`);
    }
  }
  console.log(`\n─────────────────────────────────────────`);
  console.log(`Done.  Stored: ${ok}  Skipped: ${skipped}  Failed: ${failed}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
