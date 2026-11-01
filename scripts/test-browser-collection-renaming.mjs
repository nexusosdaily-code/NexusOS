import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { once } from "node:events";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, firefox, webkit } from "playwright-core";
import { renamingPrograms, renamingCases } from "./collection-renaming-cases.mjs";
import { checkCompleteWorkers } from "./collection-complete-worker-checks.mjs";
import {
  assertIsolated, installGuards, checkNetworkControls, checkImportControls,
  checkNestedAssetHostControls, checkNestedLifecycleControls, runNestedLifecycleFault,
  checkNestedRedirectControls,
} from "./collection-renaming-isolation.mjs";

const engines = { chromium, firefox, webkit };
const args = process.argv.slice(2);
const serve = args.includes("--serve");
const lifecycleOnly = args.includes("--lifecycle-controls-only");
const redirectsOnly = args.includes("--redirect-controls-only");
const completeOnly = args.includes("--complete-apis-only");
const faultArg = args.find(arg => arg.startsWith("--nested-lifecycle-fault="));
const lifecycleFault = faultArg?.split("=")[1];
const hangArg = args.find(arg => arg.startsWith("--nested-watchdog-hang="));
const watchdogHang = hangArg?.split("=")[1];
assert.ok(!hangArg || (["transport", "teardown"].includes(watchdogHang) &&
  lifecycleFault === "no-reply" && typeof process.send === "function"), "Watchdog hang requires a disposable IPC fault subprocess");
assert.ok(!faultArg || ["load-failure", "no-reply", "page-clone-failure", "child-clone-failure"].includes(lifecycleFault), "Unknown nested lifecycle fault");
assert.ok(!faultArg || (!serve && !lifecycleOnly && args.length === (hangArg ? 3 : 2)), "Fault subprocess requires exactly one engine");
assert.ok(!serve || args.length === 1, "--serve cannot be combined with engines");
assert.ok(!redirectsOnly || (!lifecycleOnly && !faultArg), "Redirect-only mode cannot include lifecycle controls");
assert.ok(!completeOnly || (!serve && !lifecycleOnly && !redirectsOnly && !faultArg),
  "Complete API mode cannot be combined with partial/fault modes");
const engineArgs = args.filter(arg => arg !== faultArg && arg !== hangArg && arg !== "--lifecycle-controls-only" &&
   arg !== "--redirect-controls-only" && arg !== "--complete-apis-only");
const requested = serve ? [] : engineArgs.length ? engineArgs : Object.keys(engines);
for (const name of requested) assert.ok(Object.hasOwn(engines, name), `Unknown browser: ${name}`);
assert.equal(new Set(requested).size, requested.length, "Duplicate engines are not a matrix");

// Narrower than production: no network connections, blob workers, inline JS,
// eval, external resources or service workers. React's real inline styles stay.
const policy = "default-src 'none'; script-src 'self'; script-src-attr 'none'; " +
  "style-src 'self' 'unsafe-inline'; worker-src 'self'; connect-src 'none'; " +
  "img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'";
const canonical = new Map(await Promise.all(renamingPrograms.map(async program => [
  program, await readFile(`shared/wls-library/${program.replace(".", "/")}.wls`, "utf8"),
])));
const smoke = JSON.parse(await readFile("scripts/fixtures/wls-map-set-v0-16-smoke.json", "utf8"));
assert.equal(smoke.cases.length, 6);
assert.deepEqual(new Set(smoke.cases.map(c => c.program)), new Set(renamingPrograms));

const bundle = await build({
  configFile: false, envFile: false, root: path.resolve("tests/browser/collection-renaming"),
  plugins: [react()], css: { postcss: { plugins: [] } },
  resolve: { alias: { "@": path.resolve("client/src"), "@shared": path.resolve("shared") } },
  worker: { format: "es" },
  build: { write: false, minify: false, target: "es2022" }, logLevel: "warn",
});
const assets = new Map(bundle.output.map(asset => [
  `/${asset.fileName}`, asset.type === "asset" ? asset.source : asset.code,
]));
const workerAssets = [...assets.keys()].filter(key => /execute\.worker-.*\.js$/.test(key));
assert.equal(workerAssets.length, 1, "Real native worker must be emitted as a same-origin file");
const nestedWorkerAssets = [...assets.keys()].filter(key => /nested-network\.worker-.*\.js$/.test(key));
assert.equal(nestedWorkerAssets.length, 1, "Real nested worker must be emitted as a separate same-origin file");
const keyFor = pathname => pathname === "/" ? "/index.html" : pathname;
const typeFor = key => key.endsWith(".html") ? "text/html" : "application/javascript";
const arrivals = [];
const sockets = new Set();
const server = createServer((req, res) => {
  arrivals.push(req.url);
  if (serve) {
    const key = keyFor(new URL(req.url, "http://fixture.invalid").pathname);
    if (assets.has(key)) {
      res.writeHead(200, { "Content-Type": typeFor(key), "Content-Security-Policy": policy }).end(assets.get(key));
      return;
    }
  }
  res.writeHead(403).end();
});
server.on("connection", socket => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});
server.on("upgrade", (req, socket) => { arrivals.push(req.url); socket.destroy(); });
await new Promise(resolve => server.listen(serve ? 5174 : 0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

if (serve) console.log(`Isolated real workspace fixture: ${origin}`);
else {
  try {
    // Host-arrival controls have their own success output. Never mix it into
    // a disposable lifecycle fault, or the lifecycle-only evidence stream.
    if (!lifecycleFault && !lifecycleOnly && !redirectsOnly) {
      await checkNestedAssetHostControls({ assets, nestedWorkerAssets, policy });
    }
    for (const name of requested) await checkEngine(name);
    assert.deepEqual(arrivals, [], "No HTTP or WebSocket traffic reached even the loopback sentinel");
    if (lifecycleOnly) console.log(`LIFECYCLE MATRIX ${requested.join(", ")}: startup/timeout/clone failure controls only; not isolation evidence`);
    else if (redirectsOnly) console.log(`REDIRECT MATRIX ${requested.join(", ")}: redirect controls only; not a complete renaming matrix`);
    else console.log(`PASS complete requested ${completeOnly ? "106-API worker" : "renaming and 106-API worker"} matrix: ${requested.join(", ")}; fixture-only native workers, not production-worker or physical-device evidence`);
  } finally {
    const closed = [...sockets].map(socket => once(socket, "close"));
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
    await Promise.all(closed);
    assert.equal(server.listening, false);
    assert.equal(sockets.size, 0);
    if (lifecycleFault) console.log(`LIFECYCLE CLEANUP ${requested[0]} ${lifecycleFault}: fixture host closed`);
  }
}

async function checkEngine(name) {
  if (!lifecycleFault && !redirectsOnly) {
    await checkNestedLifecycleControls(name);
    if (lifecycleOnly) return;
  }
  const browser = await engines[name].launch({
    ...(name === "chromium" ? {
      ...(existsSync("/repl/tools/bin/chromium") ? { executablePath: "/repl/tools/bin/chromium" } : {}),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    } : {}),
  }).catch(cause => {
    throw new Error(`Requested ${name} unavailable. Install its Playwright browser and host libraries. Unavailable is NOT passed.`, { cause });
  });
  let checked = 0;
  let completeEvidence;
  try {
    if (redirectsOnly) {
      await checkNestedRedirectControls(browser, name, { origin, assets, workerAssets, nestedWorkerAssets, policy });
      return;
    }
    if (lifecycleFault) {
      await runNestedLifecycleFault(browser, name, { origin, assets, workerAssets, nestedWorkerAssets, policy }, lifecycleFault, watchdogHang);
      throw new Error("Nested lifecycle fault unexpectedly returned");
    }
    await checkNetworkControls(browser, name, { origin, assets, workerAssets, nestedWorkerAssets, policy });
    await checkImportControls(browser, name, { origin, assets, workerAssets, nestedWorkerAssets, policy });
    await checkNestedRedirectControls(browser, name, { origin, assets, workerAssets, nestedWorkerAssets, policy });
    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      const forbidden = [], errors = [], workerLoads = [], workerAttempts = [], importAttempts = [];
      await installGuards(context, {
        origin, assets, workerAssets, policy, forbidden, workerLoads,
      });
      context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      const response = await page.goto(origin);
      assert.equal(response.headers()["content-security-policy"], policy, "Enforced document CSP");
      await page.waitForFunction(() => window.renamingPageEvalBlocked === true);
      completeEvidence = await checkCompleteWorkers(page, workerLoads);
      const selector = page.getByRole("combobox", { name: "Load map example" });
      const source = page.getByTestId("collection-source");
      const inputs = page.getByTestId("collection-inputs");
      const output = page.getByTestId("collection-output");
      const error = page.getByTestId("collection-error");
      const compiled = page.getByRole("region", { name: "Compiled instructions" });
      const trace = page.getByRole("region", { name: "Visited trace" });

      async function runCase(test, expectedSource) {
        assert.equal(await source.inputValue(), expectedSource, "Byte-exact canonical source, not a copied algorithm");
        const inputText = await inputs.inputValue();
        const parsed = JSON.parse(inputText);
        const beforeLoads = workerLoads.length;
        const worker = await page.evaluate(async ({ source, inputs }) =>
          window.runRenamingWorker(source, inputs), { source: expectedSource, inputs: parsed });
        assert.ok(Array.isArray(worker.networkAttempts), "Worker attempt evidence must be present");
        workerAttempts.push(...worker.networkAttempts);
        assert.ok(Array.isArray(worker.importAttempts), "Worker import evidence must be present separately");
        importAttempts.push(...worker.importAttempts);
        assert.equal(workerLoads.length, beforeLoads + 1, "Each execution loads a real same-origin worker");
        assert.equal(worker.source, expectedSource);
        assert.equal(worker.before, JSON.stringify(parsed));
        assert.equal(worker.after, worker.before, `${test.name}: worker inputs unchanged`);
        assert.equal(worker.inputsFrozen, true, "Actual worker-side inputs deeply frozen");
        assert.equal(worker.evalBlocked, true, "Worker CSP blocks dynamic evaluation");

        // Execute from the real component too; no mock of handlers, source
        // loader, compiler, VM, examples or state. Worker and UI have one oracle.
        await page.getByTestId("collection-run-all").click();
        if (test.error || test.expect?.error) {
          assert.equal(typeof worker.error, "string", `${test.name}: explicit VM failure in worker`);
          assert.ok(worker.error.length > 0);
          if (typeof test.error === "string") {
            assert.equal(worker.error, test.error, `${test.name}: exact independent rejection`);
          }
          assert.equal(Object.hasOwn(worker, "value"), false, `${test.name}: no failed worker result`);
          assert.equal(Object.hasOwn(worker, "cycles"), false, `${test.name}: no failed worker trace`);
          assert.equal(await error.textContent(), `Execution stopped${worker.error}`, "UI/worker reject identically");
          assert.equal(await output.textContent(), "—");
          assert.ok((await trace.textContent()).includes("No visits recorded"));
          assert.ok((await compiled.textContent()).includes("No compiled program yet"));
        } else {
          const expected = test.expected ?? test.expect.value;
          assert.equal(worker.error, undefined, `${test.name}: ${worker.error}`);
          assert.deepEqual(worker.value, expected, `${test.name}: native worker result`);
          assert.deepEqual(JSON.parse(await output.textContent()), expected, `${test.name}: real workspace result`);
          assert.equal(await error.count(), 0);
          assert.equal(worker.resultFrozen, true);
          assert.equal(worker.freshResult, true, "Result must not alias frozen input");
          assert.ok(worker.cycles > 0 && worker.cycles <= worker.cycleLimit);
          assert.equal(worker.lastOp, "RETURN");
          assert.ok((await compiled.locator("tbody tr").count()) > 1);
          assert.ok(!(await trace.textContent()).includes("No visits recorded"));
        }
        assert.equal(await inputs.inputValue(), inputText, "Real editor input remains byte-for-byte unchanged");
        assert.equal(await source.inputValue(), expectedSource);
        checked++;
      }

      // All six real release fixtures are selected from the actual component.
      for (const example of completeOnly ? [] : smoke.cases) {
        const option = selector.locator("option").filter({ hasText: `${example.program} · ${example.name}` });
        assert.equal(await option.count(), 1, "Real release example must be exposed");
        await selector.selectOption(await option.getAttribute("value"));
        assert.deepEqual(JSON.parse(await inputs.inputValue()), example.inputs);
        assert.deepEqual(JSON.parse(await page.getByTestId("native-expected").textContent()), example.expect.value);
        await page.getByTestId("collection-compile").click();
        assert.equal(await output.textContent(), "—", "Compile alone must not execute");
        await runCase(example, canonical.get(example.program));
      }
      for (const program of completeOnly ? [] : renamingPrograms) {
        await selector.selectOption(program);
        const cases = renamingCases(program);
        const recovery = cases[0];
        for (const test of cases) {
          const json = JSON.stringify(test.inputs);
          assert.ok(json.length <= 16_384, "Maximum VM operands must also fit the real editor");
          await inputs.fill(json);
          assert.equal(await output.textContent(), "—", "Editing clears old result");
          assert.equal(await error.count(), 0, "Editing clears old failure");
          await runCase(test, canonical.get(program));
          if (test.malformedContainer) {
            await inputs.fill(JSON.stringify(recovery.inputs));
            assert.equal(await error.count(), 0, "Recovery edit clears malformed-container failure");
            await runCase(recovery, canonical.get(program));
          }
        }
        // Recover from the final rejected input without selecting another API.
        await inputs.fill(JSON.stringify(recovery.inputs));
        await runCase(recovery, canonical.get(program));
      }

      // Real load failure must reject explicitly; never fall back to page VM.
      await context.route(`**${workerAssets[0]}`, route => route.abort());
      const failedLoad = await page.evaluate(async source => {
        try {
          await window.runRenamingWorker(source, { map: { entries: [] }, key: "a", replacement: "b" });
          return "unexpected success";
        } catch (error) { return error.message; }
      }, canonical.get(renamingPrograms[0]));
      assert.match(failedLoad, /Native collection worker (failed|timed out)/);
      assert.deepEqual(errors, [], "No uncaught page faults");
      assertIsolated({ forbidden, workerAttempts, importAttempts, arrivals });
    } finally { await context.close(); }
  } finally {
    await browser.close();
    assert.equal(browser.isConnected(), false);
    if (lifecycleFault) console.log(`LIFECYCLE CLEANUP ${name} ${lifecycleFault}: browser closed`);
  }
  // Print success only after all assertions and resource teardown succeed.
  if (!completeOnly) console.log(`PASS ${name} ${browser.version()}: ${checked} exact-source UI/native-worker cases; frozen immutable inputs, exact malformed-container failures and recovery, canonical Set payloads, 20-entry/256-character limits, CSP, explicit worker-load failure; zero forwarded traffic`);
  console.log(`PASS ${name} ${browser.version()}: complete 0.40.0 native-worker evidence ${JSON.stringify(completeEvidence)}; ordinary and source-locked, exact disk source, Node SHA-256 lock, unchanged limits; teardown complete`);
}
