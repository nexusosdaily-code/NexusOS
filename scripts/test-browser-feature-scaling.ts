import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "vite";
import { chromium, firefox, webkit } from "playwright-core";
import { runScalingCases } from "../tests/browser/feature-scaling/main";
import { createScalingBrowserAudit } from "./wls-feature-scaling-browser-fixtures";
import { assertScalingReport, assertScalingIsolation } from "./wls-browser-scaling-report";

const engines = { chromium, firefox, webkit };
const requested = process.argv.slice(2);
if (!requested.length) requested.push("chromium", "firefox", "webkit");
const directory = path.resolve("generated-artifacts/browser-feature-scaling");
mkdirSync(directory, { recursive: true });
const save = (name: string, data: unknown) => writeFileSync(path.join(directory, `${name}.json`), JSON.stringify(data, null, 2));
save("summary", { verdict: "RUNNING", requested });
const results: unknown[] = [];
const arrivals: string[] = [];
const server = createServer((req, res) => { arrivals.push(req.url ?? ""); res.writeHead(403).end(); });
server.on("upgrade", (req, socket) => { arrivals.push(req.url ?? ""); socket.destroy(); });
try {
assert.equal(new Set(requested).size, requested.length);
for (const name of requested) assert.ok(Object.hasOwn(engines, name), `Unknown engine ${name}`);
const { payload, expected } = createScalingBrowserAudit();
const baseline = await runScalingCases(payload);
assertScalingReport(baseline, expected, baseline);
const built = await build({ configFile: false, envFile: false,
  root: path.resolve("tests/browser/feature-scaling"), css: { postcss: { plugins: [] } },
  build: { write: false, minify: false, target: "es2022" }, logLevel: "warn" });
assert.ok(!Array.isArray(built) && "output" in built);
const assets = new Map(built.output.map(asset => [`/${asset.fileName}`,
  asset.type === "asset" ? (typeof asset.source === "string" ? asset.source : Buffer.from(asset.source)) : asset.code]));
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const origin = `http://127.0.0.1:${address.port}`;
  for (const name of requested) {
    const engine = engines[name as keyof typeof engines], env: Record<string, string> = {};
    for (const key of ["PATH", "HOME", "TMPDIR", "LD_LIBRARY_PATH", "PLAYWRIGHT_BROWSERS_PATH",
      "FONTCONFIG_FILE", "FONTCONFIG_PATH", "XDG_DATA_DIRS", "XDG_CACHE_HOME", "LIBGL_ALWAYS_SOFTWARE",
      "EGL_PLATFORM", "__EGL_VENDOR_LIBRARY_FILENAMES", "LIBGL_DRIVERS_PATH"]) if (process.env[key]) env[key] = process.env[key]!;
    const libs = process.env[`WLS_${name.toUpperCase()}_LIBRARY_PATH`];
    if (libs) env.LD_LIBRARY_PATH = libs;
    if (name === "firefox") env.MOZ_DISABLE_CONTENT_SANDBOX = "1";
    const browser = await engine.launch({ executablePath: name === "chromium" && existsSync("/repl/tools/bin/chromium")
      ? "/repl/tools/bin/chromium" : engine.executablePath(), env, timeout: 30_000,
      ...(name === "chromium" ? { args: ["--no-sandbox", "--disable-dev-shm-usage"] } : {}) });
    const forbidden: string[] = [], errors: string[] = [];
    const install = async (probe: boolean) => {
      const context = await browser.newContext({ serviceWorkers: "block" });
      context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
      await context.route("**/*", route => {
        const url = new URL(route.request().url()), key = url.pathname === "/" ? "/index.html" : url.pathname;
        if (url.origin !== origin || url.search || !assets.has(key) || route.request().method() !== "GET") {
          forbidden.push(url.href);
          return probe && url.href === `${origin}/scaler-probe` ? route.continue() : route.abort();
        }
        return route.fulfill({ body: assets.get(key), contentType: key.endsWith(".html") ? "text/html" : "application/javascript",
          headers: { "Content-Security-Policy": `default-src 'none'; script-src 'self'; connect-src ${probe ? "'self'" : "'none'"}; worker-src 'none'; base-uri 'none'` } });
      });
      await context.routeWebSocket("**/*", socket => { forbidden.push(socket.url()); socket.close(); });
      return context;
    };
    try {
      const context = await install(false), page = await context.newPage();
      await page.goto(origin);
      await page.locator("#inputs").fill(JSON.stringify(payload));
      await page.locator("#run").click();
      await page.locator("#status[data-state='complete'], #status[data-state='error']").waitFor({ timeout: 60_000 });
      assert.equal(await page.locator("#status").getAttribute("data-state"), "complete", await page.locator("#status").textContent() ?? "");
      const report = JSON.parse((await page.locator("#report").textContent())!);
      assertScalingReport(report, expected, baseline);
      assertScalingIsolation(forbidden, arrivals, errors);
      await page.locator("#probe").click();
      await page.locator("#network[data-state='blocked']").waitFor();
      await page.locator("#policy[data-state='blocked']").waitFor();
      assertScalingIsolation(forbidden, arrivals, errors);
      await context.close();
      const control = await install(true), controlPage = await control.newPage();
      await controlPage.goto(origin); await controlPage.locator("#probe").click();
      await controlPage.locator("#network[data-state='arrived']").waitFor();
      assert.equal(await controlPage.locator("#network").textContent(), "403");
      assert.deepEqual(arrivals, ["/scaler-probe"]);
      assert.equal(forbidden.length, 1);
      assert.throws(() => assertScalingIsolation(forbidden, arrivals, errors));
      await control.close();
      assert.deepEqual(errors, []);
      const result = { engine: name, version: browser.version(), verdict: "PASS",
        counts: { scaling: report.scaling.length, pipelines: report.pipelines.length,
          rejections: report.rejections.length, mutations: report.mutations.length },
        normalRequests: 0, normalArrivals: 0, nativeCspBlockedProbe: true,
        sensitivity: { recordedAttempts: forbidden.length, actualArrivals: arrivals.length, zeroGuardRejected: true } };
      results.push(result); save(name, { ...result, report });
      forbidden.length = 0; arrivals.length = 0;
    } finally { await browser.close(); }
  }
  assert.deepEqual(results.map(r => (r as { engine: string }).engine), requested);
  save("summary", { verdict: "PASS", requested, results });
  console.log(JSON.stringify({ verdict: "PASS", requested, results }, null, 2));
} catch (error) { save("summary", { verdict: "FAIL", requested, results, error: String(error) }); throw error;
} finally {
  if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
