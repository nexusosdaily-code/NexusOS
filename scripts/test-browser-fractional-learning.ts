import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "vite";
import { chromium, firefox, webkit } from "playwright-core";
import { runNumericalCases, type NumericalPayload } from "../tests/browser/fractional-learning/main";
import { fixedPointFixtures, fixedPointReference } from "./wls-fixed-point-reference";
import { fractionalLearningReference, fractionalTrainingFixtures, fractionalEvaluationFixtures,
  fractionalEvaluationGrid, fractionalRateTrainingFixtures } from "./wls-fractional-learning-reference";
import { assertNumericalReport, assertFractionalLearningVerdict,
  type FractionalLearningIO } from "./wls-browser-numerical-report";
import { fractionalPolicy, fractionalNetworkControls, probeScriptPath, workerScriptPath,
  fractionalProbeScript, fractionalWorkerScript } from "./wls-fractional-network-controls";

const engines = { chromium, firefox, webkit };
const requested = process.argv.slice(2);
if (!requested.length) requested.push("chromium", "firefox", "webkit");
assert.equal(new Set(requested).size, requested.length, "Duplicate requested browser");
for (const name of requested) assert.ok(Object.hasOwn(engines, name), `Unknown browser: ${name}`);
const directory = path.resolve("generated-artifacts/browser-fractional-learning");
mkdirSync(directory, { recursive: true });
writeFileSync(path.join(directory, "summary.json"), JSON.stringify({ verdict: "RUNNING", requested }, null, 2));
const grid = fractionalEvaluationGrid();
const model = { w1: "1.500", w2: "0.500", bias: "-1.000" };
const evaluation = fractionalEvaluationFixtures();
evaluation.push(
  { operation: "evaluate", model: { w1: "0.001", w2: "0", bias: "-0.001" }, samples: [{ x1: "0.5", x2: "0", label: 0 }] },
  { operation: "evaluate", model: { w1: "-0.001", w2: "0", bias: "0.001" }, samples: [{ x1: "0.5", x2: "0", label: 1 }] },
  { operation: "evaluate", model: { w1: "-128", w2: "-128", bias: "-128" },
    samples: Array(16).fill({ x1: "-0.001", x2: "-0.001", label: 0 }) },
  { operation: "evaluate", model: { w1: "128", w2: "128", bias: "128" },
    samples: [{ x1: "0", x2: "0", label: 1 }, { x1: "8", x2: "8", label: 1 }] },
);
for (let i = 0; i < grid.length; i += 16) evaluation.push({ operation: "evaluate", model, samples: grid.slice(i, i + 16) });
const payload: NumericalPayload = { fixed: fixedPointFixtures(), training: fractionalTrainingFixtures(), evaluation };
assert.equal(payload.fixed.length, 413);
assert.equal(payload.training.length, 39);
assert.ok(payload.training.every(request => request.operation === "train" && request.evaluation?.length === 8));
const rates = ["0.001", "0.002", "0.125", "0.499", "0.500", "0.999", "1.000"];
payload.training.push(...rates.flatMap(fractionalRateTrainingFixtures));
// A signed half-grid update from zero complements the complete-parameter ties
// at nonzero weights already present in each rate's independent fixtures.
payload.training.push({ operation: "train", learningRate: "0.500", epochs: 1,
  samples: [{ x1: "-0.001", x2: "0.001", label: 0 }] });
assert.equal(payload.training.length, 327);
assert.equal(payload.evaluation.length, 31);
assert.equal(new Set(grid.map(p => `${p.x1}:${p.x2}`)).size, 289);
const expected = {
  fixed: fixedPointReference(payload.fixed),
  training: fractionalLearningReference(payload.training),
  evaluation: fractionalLearningReference(payload.evaluation).map(r => r.evaluation!),
};
const baseline = await runNumericalCases(payload);
assertNumericalReport(baseline, expected, baseline);
assert.deepEqual(baseline.training[2].semantic.model, model, "Grid model must match actual learned AND weights");
const rateStart = 39, rateCases = 41;
const ties = baseline.training[rateStart + rates.indexOf("0.500") * rateCases + 39].semantic.parameterUpdates;
assert.deepEqual(ties.slice(0, 2), [
  { w1: 1, w2: -1, bias: -500 }, { w1: 1, w2: -1, bias: 0 },
], "Signed half-grid ties must round the complete parameter, not its delta");
assert.deepEqual(baseline.training.at(-1)!.semantic.parameterUpdates, [
  { w1: 1, w2: -1, bias: -500 },
], "Signed half-grid ties from zero");
const stalled = baseline.training[rateStart + 40].semantic;
assert.equal(stalled.updates, 6);
assert.equal(stalled.finalMistakes, 1);
assert.deepEqual(stalled.parameterUpdates, Array.from({ length: 6 }, (_, i) => ({
  w1: 0, w2: 0, bias: i % 2 === 0 ? -1 : 0,
})), "Sub-resolution errors must stall without accumulating a residual");
for (let i = 0; i < rates.length; i++) {
  // All-positive labels agree with the zero initial model for all three epochs.
  const unchanged = baseline.training[rateStart + i * rateCases + 26].semantic;
  assert.equal(unchanged.updates, 0);
  assert.deepEqual(unchanged.parameterUpdates, Array(12).fill({ w1: 0, w2: 0, bias: 0 }));
}
for (let i = 0; i < 39; i++) {
  assert.deepEqual(baseline.training[rateStart + rates.indexOf("1.000") * rateCases + i].semantic,
    baseline.training[i].semantic, "Explicit rate 1.000 must retain 0.1.0 assignment semantics");
}
const bundled = await build({
  configFile: false, envFile: false, root: path.resolve("tests/browser/fractional-learning"),
  css: { postcss: { plugins: [] } },
  build: { write: false, minify: false, target: "es2022" }, logLevel: "warn",
});
assert.ok(!Array.isArray(bundled) && "output" in bundled);
const assets = new Map(bundled.output.map(asset => [`/${asset.fileName}`,
  asset.type === "asset" ? (typeof asset.source === "string" ? asset.source : Buffer.from(asset.source)) : asset.code]));
const arrivals: string[] = [], results = [];
const server = createServer((req, res) => { arrivals.push(req.url ?? ""); res.writeHead(403).end(); });
server.on("upgrade", (req, socket) => { arrivals.push(req.url ?? ""); socket.destroy(); });
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const origin = `http://127.0.0.1:${address.port}`;
try {
  for (const name of requested) {
    const engine = engines[name as keyof typeof engines];
    const env: Record<string, string> = {};
    for (const key of ["PATH", "HOME", "TMPDIR", "LD_LIBRARY_PATH", "PLAYWRIGHT_BROWSERS_PATH",
      "FONTCONFIG_FILE", "FONTCONFIG_PATH", "XDG_DATA_DIRS", "XDG_CACHE_HOME",
      "LIBGL_ALWAYS_SOFTWARE", "EGL_PLATFORM", "__EGL_VENDOR_LIBRARY_FILENAMES", "LIBGL_DRIVERS_PATH"]) {
      if (process.env[key]) env[key] = process.env[key]!;
    }
    const libraryPath = process.env[`WLS_${name.toUpperCase()}_LIBRARY_PATH`];
    if (libraryPath) env.LD_LIBRARY_PATH = libraryPath;
    if (name === "firefox") env.MOZ_DISABLE_CONTENT_SANDBOX = "1";
    const browser = await engine.launch({
      executablePath: name === "chromium" && existsSync("/repl/tools/bin/chromium")
        ? "/repl/tools/bin/chromium" : engine.executablePath(),
      env, timeout: 30_000,
      ...(name === "chromium" ? { args: ["--no-sandbox", "--disable-dev-shm-usage"] } : {}),
    }).catch(cause => { throw new Error(`Requested ${name} unavailable; this is NOT a pass`, { cause }); });
    const controls = [];
    let report!: Awaited<ReturnType<typeof runNumericalCases>>;
    try {
      for (const control of fractionalNetworkControls) {
      const forbidden: string[] = [], errors: string[] = [];
      const arrivalStart = arrivals.length;
      const workerConnection = control.kind?.startsWith("worker-") ?? false;
      const endpoint = control.kind === "worker" ? "/__fractional_control__/forbidden-worker.js"
        : `/api/fractional-control/${control.id}`;
      const probeURL = `${control.kind?.endsWith("websocket") ? origin.replace("http:", "ws:") : origin}${endpoint}`;
      // Relax only the policy layer being independently tested, in disposable
      // contexts. Quiet numerical runs keep the original worker/network policy.
      const policy = control.layer === "forbidden"
        ? fractionalPolicy.replace("connect-src 'none'", `connect-src ${origin} ${origin.replace("http:", "ws:")}`)
        : workerConnection ? fractionalPolicy.replace("worker-src 'none'", "worker-src 'self'")
        : fractionalPolicy;
      const runAssets = new Map(assets);
      if (control.kind) {
        runAssets.set("/index.html", String(assets.get("/index.html")).replace("</body>",
          `<script src="${probeScriptPath}"></script></body>`));
        runAssets.set(probeScriptPath, fractionalProbeScript);
        if (workerConnection) runAssets.set(workerScriptPath, fractionalWorkerScript);
      }
      const context = await browser.newContext({ serviceWorkers: "block" });
      try {
      await context.addInitScript(`globalThis.fractionalViolations = [];
        addEventListener("securitypolicyviolation", event => {
          globalThis.fractionalViolations.push({ directive: event.effectiveDirective,
            blockedURI: event.blockedURI, disposition: event.disposition });
        });`);
      await context.route("**/*", route => {
        const url = new URL(route.request().url()), key = url.pathname === "/" ? "/index.html" : url.pathname;
        if (url.origin !== origin || url.search || !runAssets.has(key) || route.request().method() !== "GET") {
          forbidden.push(url.href); return route.abort();
        }
        return route.fulfill({
          body: runAssets.get(key), contentType: key.endsWith(".html") ? "text/html" : "application/javascript",
          headers: { "Content-Security-Policy": policy },
        });
      });
      // Playwright's page socket interception sits ahead of native CSP. Leave
      // it out only for native CSP socket probes; worker sockets rely on CSP.
      if (control.kind !== "websocket" || control.layer === "forbidden") {
        await context.routeWebSocket("**/*", socket => { forbidden.push(socket.url()); socket.close(); });
      }
      context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
      const page = await context.newPage();
      const response = await page.goto(origin);
      assert.equal(response?.headers()["content-security-policy"], policy);
      await page.locator("#inputs").fill(JSON.stringify(payload));
      await page.getByRole("button", { name: "Run numerical checks" }).click();
      await page.locator("#status[data-state='complete'], #status[data-state='error']").waitFor({ timeout: 60_000 });
      const text = await page.locator("#report").textContent();
      assert.equal(await page.locator("#status").getAttribute("data-state"), "complete", text ?? "No result");
      report = JSON.parse(text!);
      assertNumericalReport(report, expected, baseline);
      let probe: {
        kind: string; url: string; started: boolean; result: string; error?: string;
        workerStarted: boolean; workerTerminated: boolean; workerViolations: FractionalLearningIO["violations"];
      } | undefined;
      if (control.kind) {
        const button = page.locator("#network-probe");
        await button.evaluate((element, config) => { (element as HTMLElement).dataset.config = JSON.stringify(config); },
          { kind: control.kind, url: probeURL, workerURL: `${origin}${workerScriptPath}` });
        await button.click();
        await page.locator("#network-probe[data-complete='true']").waitFor({ timeout: 15_000 });
        probe = await page.evaluate("globalThis.fractionalProbe");
        assert.ok(probe?.started, `${name}/${control.id}: native attempt must execute`);
        assert.equal(probe.error, undefined, "Broken probe is not isolation evidence");
        assert.match(probe.result, /^(fetch-rejected:TypeError|socket-error|socket-closed|worker-error|worker-rejected:SecurityError|socket-rejected:(SecurityError|NS_ERROR_CONTENT_BLOCKED):.*)$/);
        if (workerConnection) {
          assert.equal(probe.workerStarted, true, "Worker must reach its native connection attempt");
          assert.equal(probe.workerTerminated, true, "Probe worker must be terminated");
        }
        if (control.layer === "violations" && !workerConnection) {
          await page.waitForFunction(() => (globalThis as any).fractionalViolations.length > 0);
        }
      }
      const violations = await page.evaluate("globalThis.fractionalViolations") as FractionalLearningIO["violations"];
      violations.push(...(probe?.workerViolations ?? []));
      // End the native numerical evidence window before diagnostic screenshots:
      // WebKit's Playwright screenshot preparation injects `body {}` to sync
      // animations, which itself violates style-src. Do not relax the CSP or
      // hide that event in the real verdict.
      let screenshotViolations: FractionalLearningIO["violations"] = [];
      if (!control.kind) {
        assertFractionalLearningVerdict(report, expected, baseline, {
          forbidden, errors, violations, arrivals: arrivals.slice(arrivalStart),
        });
        await page.screenshot({ path: path.join(directory, `${name}.png`), caret: "initial" });
        screenshotViolations = await page.evaluate("globalThis.fractionalViolations");
        assert.deepEqual(screenshotViolations, name === "webkit"
          ? [{ directive: "style-src-elem", blockedURI: "inline", disposition: "enforce" }] : [],
        "Only the known WebKit screenshot style injection may follow the clean evidence window");
      }
      await context.close();
      const io: FractionalLearningIO = { forbidden, errors, violations, arrivals: arrivals.slice(arrivalStart) };
      if (!control.kind) {
        assertFractionalLearningVerdict(report, expected, baseline, io);
      } else {
        assert.deepEqual(errors, [], "Broken probe is not isolation evidence");
        assert.deepEqual(io.arrivals, [], "Blocked probes must never reach the sentinel");
        if (control.layer === "violations") {
          assert.deepEqual(forbidden, [], "CSP must block before request routing");
          assert.equal(violations.length, 1, "One target-matched enforced CSP detection required");
          assert.deepEqual(violations[0], {
            directive: control.kind === "worker" ? "worker-src" : "connect-src",
            blockedURI: probeURL, disposition: "enforce",
          });
        } else {
          assert.deepEqual(violations, [], "Route control must independently exercise the guard");
          assert.deepEqual(forbidden, [probeURL], "Exact forbidden attempt must be recorded");
        }
        assert.throws(() => assertFractionalLearningVerdict(report, expected, baseline, io),
          control.layer === "violations" ? /No CSP-blocked network or worker attempts/
            : /No forbidden HTTP or WebSocket attempts/,
          "Matching arithmetic must not hide a blocked network attempt");
      }
      controls.push({ id: control.id, arithmetic: "PASS", verdict: control.kind ? "REJECTED" : "PASS",
        io, ...(probe ? { probe } : { screenshotViolations }) });
      console.log(`${control.kind ? "CONTROL" : "NUMERICAL"} ${name}/${control.id}: ${control.kind ? "native attempt detected; matching arithmetic verdict rejected" : "clean native arithmetic and isolation"}`);
      } finally { await context.close(); }
      }
    } finally { await browser.close(); }
    assert.deepEqual(controls.map(control => control.id), fractionalNetworkControls.map(control => control.id),
      `${name}: every independent network control must complete in order`);
    assert.deepEqual(arrivals, [], `${name}: unexpected server arrivals`);
    const result = { engine: name, version: browser.version(), verdict: "PASS",
      counts: { fixed: report.fixed.length, training: report.training.length,
        retainedTraining: 39, configurableRateTraining: report.training.length - 39,
        parameterAssignments: report.training.reduce((sum, row) => sum + 3 * row.semantic.parameterUpdates.length, 0),
        evaluation: report.evaluation.length, rejection: report.rejections.length,
        rateRejection: report.rateRejections.length, mutations: report.mutations.length },
      forbiddenRequests: controls[0].io.forbidden.length, serverArrivals: arrivals.length,
      pageErrors: controls[0].io.errors.length, controls };
    results.push(result);
    writeFileSync(path.join(directory, `${name}.json`), JSON.stringify({ ...result, report }, null, 2));
  }
  assert.deepEqual(results.map(r => r.engine), requested);
  writeFileSync(path.join(directory, "summary.json"), JSON.stringify({ verdict: "PASS", requested, results }, null, 2));
  console.log(JSON.stringify({ verdict: "PASS", requested, results }, null, 2));
} catch (error) {
  writeFileSync(path.join(directory, "summary.json"), JSON.stringify({
    verdict: "FAIL", requested, results, error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  throw error;
} finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
