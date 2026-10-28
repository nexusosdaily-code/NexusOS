/**
 * Inspect the original request target before Express, Vite or static serving
 * can decode it differently. This is a path guard, not an identity/auth check.
 */
import { resolve } from "node:path";

export function originalRequestPathname(req: { originalUrl?: string; url: string; path?: string }): string {
  try {
    // app.use("*") consumes the matched path and leaves req.url as "/".
    // Classifying that value would incorrectly turn every unknown URL into
    // the public home page (HTTP 200), including probes for private files.
    return new URL(req.originalUrl || req.url, "http://request.invalid").pathname;
  } catch {
    return (req.originalUrl || req.path || "/").split("?")[0];
  }
}

const INFRASTRUCTURE_FILES = new Set([
  "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "pyproject.toml", "uv.lock", "requirements.txt", "replit.nix",
  "tsconfig.json", "vite.config.ts", "vite.config.js",
  "appsettings.json", "web.config", "nginx.conf", "httpd.conf",
]);

export function isForbiddenRequestPath(target: string, allowViteAssets = false): boolean {
  // Bound decoding work and fail closed on malformed/over-encoded targets.
  let pathname = target.split("?")[0];
  if (!pathname.startsWith("/") || pathname.length > 8192) return true;
  try {
    pathname = decodeURIComponent(pathname);
    for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(pathname); i++) {
      pathname = decodeURIComponent(pathname);
    }
  } catch {
    return true;
  }
  if (/%[0-9a-f]{2}/i.test(pathname) || /[\u0000-\u001f\u007f]/.test(pathname)) return true;

  pathname = pathname.replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
  let inspectionPath = pathname;
  if (allowViteAssets && pathname.startsWith("/@fs/")) {
    const filePath = pathname.slice(4);
    const workspace = resolve(process.cwd()).replace(/\\/g, "/").toLowerCase();
    const browserRoots = ["client", "shared", "node_modules"].map((directory) => `${workspace}/${directory}`);
    if (!browserRoots.some((root) => filePath.startsWith(root + "/"))) return true;
    // Vite can emit both /node_modules/... and /@fs/<workspace>/node_modules/...
    // for the same generated browser dependency.
    inspectionPath = filePath.slice(workspace.length);
  }
  const segments = inspectionPath.split("/").filter(Boolean);
  // Vite's generated browser dependencies need this one hidden cache directory
  // in development only; it must not exempt other hidden files below it.
  const viteCache = allowViteAssets
    && /^\/node_modules\/\.vite\/deps\/[^/]+\.(js|map)$/.test(inspectionPath);
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i].startsWith(".")) continue;
    if (i === 0 && segments[i] === ".well-known") continue;
    if (i === 1 && segments[i] === ".vite" && viteCache) continue;
    return true;
  }
  if (segments.length === 1 && INFRASTRUCTURE_FILES.has(segments[0])) return true;
  if (["server", "script", "scripts"].includes(segments[0])) return true;
  if (!allowViteAssets && /^\/(@fs|@vite|@id|__vite|node_modules)(\/|$)/.test(pathname)) return true;
  return false;
}
