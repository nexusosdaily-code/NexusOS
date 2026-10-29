import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Only translate the known registry proxy prefix. Do not re-resolve versions,
// remove integrity checks, or guess tarball paths for aliases/scoped packages.
export function publicRegistryLock(lock) {
  const result = structuredClone(lock);
  if (result.lockfileVersion !== 3 || !result.packages) {
    throw new Error("Expected an npm v3 lockfile");
  }
  for (const entry of Object.values(result.packages)) {
    if (!entry.resolved) continue;
    const url = new URL(entry.resolved);
    if (["package-firewall.replit.local", "package-firewall.replit.internal"].includes(url.hostname)) {
      if (!url.pathname.startsWith("/npm/") || url.username || url.password || url.search || url.hash ||
          !entry.integrity || !entry.version) {
        throw new Error("Unrecognised proxy tarball or missing locked integrity/version");
      }
      entry.resolved = `https://registry.npmjs.org/${url.pathname.slice("/npm/".length)}`;
    } else if (url.origin !== "https://registry.npmjs.org") {
      throw new Error(`Unexpected registry host: ${url.hostname}`);
    }
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = "package-lock.json";
  const lock = JSON.parse(readFileSync(path, "utf8"));
  writeFileSync(path, JSON.stringify(publicRegistryLock(lock), null, 2) + "\n");
  console.log("Prepared public-registry CI lockfile; versions and integrity hashes unchanged.");
}
