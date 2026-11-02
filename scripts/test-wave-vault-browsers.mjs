import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyWaveVaultBrowserReport } from "./verify-wave-vault-browser-report.mjs";

const directory = resolve("generated-artifacts/ci");
mkdirSync(directory, { recursive: true });
const reportPath = resolve(directory, "wave-vault.json");
const summaryPath = resolve(directory, "wave-vault-browser-summary.json");
rmSync(reportPath, { force: true }); // Never accept evidence from a previous run.
const save = value => writeFileSync(summaryPath, JSON.stringify(value, null, 2) + "\n");
save({ verdict: "RUNNING" });
try {
  // Disposable fixture only; do not pass app credentials to the test process.
  const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "LANG", "XDG_CACHE_HOME",
    "PLAYWRIGHT_BROWSERS_PATH", "WNSP_TEST_CHROMIUM_PATH"]
    .filter(key => process.env[key]).map(key => [key, process.env[key]]));
  env.WNSP_PUBLISH_BUILD = "1";
  env.DATABASE_URL = "postgresql://fixture:fixture@127.0.0.1:1/forbidden";
  if (existsSync("/nix/store")) {
    const host = JSON.parse(execFileSync("nix-instantiate", ["--eval", "--strict",
      "--json", "scripts/browser-host-libraries.nix"], { encoding: "utf8", timeout: 30_000 }));
    for (const path of [...host.libraryPath.split(":"), host.eglVendor, host.drivers]) {
      if (!existsSync(path)) throw new Error(`Browser host dependency is not realised: ${path}`);
    }
    env.WNSP_TEST_BROWSER_LIBRARY_PATH = host.libraryPath;
    env.LIBGL_ALWAYS_SOFTWARE = "1";
    env.EGL_PLATFORM = "surfaceless";
    env.__EGL_VENDOR_LIBRARY_FILENAMES = host.eglVendor;
    env.LIBGL_DRIVERS_PATH = host.drivers;
    // Playwright's distro-cache/dlopen preflight does not understand Nix paths.
    // Only this local runner bypasses that heuristic; native launches, page
    // tasks, and every assertion still run, and ANY skip fails this gate.
    env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";
  }
  execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run",
    "--config", "vitest.wave-vault-security.config.ts", "--reporter=verbose",
    "--reporter=json", `--outputFile=${reportPath}`],
    { env, stdio: "inherit", timeout: 300_000 });
  const summary = verifyWaveVaultBrowserReport(JSON.parse(readFileSync(reportPath, "utf8")));
  save(summary);
  console.log(JSON.stringify(summary));
} catch (error) {
  save({ verdict: "FAIL", message: String(error.message ?? error) });
  throw error;
}
