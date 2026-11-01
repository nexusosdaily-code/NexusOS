import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, request } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

// Shared by ordinary cases and disposable fault controls. CSP can reject before
// Playwright sees a request, so worker-reported intent is independently counted.
export function assertIsolated({ forbidden, workerAttempts, importAttempts, arrivals }) {
  assert.deepEqual(forbidden, [], "No API, external, socket or unexpected attempts");
  assert.deepEqual(workerAttempts, [], "No worker network attempts");
  assert.deepEqual(importAttempts, [], "No worker module import attempts");
  assert.deepEqual(arrivals, [], "No forwarded requests");
}

export async function createSentinel({ moduleImport = false } = {}) {
  const arrivals = [];
  const sockets = new Set();
  const server = createServer((req, res) => {
    arrivals.push({ kind: moduleImport ? "module-import" : "fetch", path: req.url });
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": moduleImport ? "application/javascript" : "text/plain",
    }).end(moduleImport ? 'export const sentinel = "native-worker-import";' : "sentinel");
  });
  server.on("connection", socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (req, socket) => {
    arrivals.push({ kind: "websocket", path: req.url });
    const accept = createHash("sha1")
      .update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n" +
      `Connection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.write(Buffer.concat([Buffer.from([0x81, 8]), Buffer.from("sentinel")]));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`, arrivals,
    close: async () => {
      const closed = [...sockets].map(socket => once(socket, "close"));
      for (const socket of sockets) socket.destroy();
      await new Promise(resolve => server.close(resolve));
      await Promise.all(closed);
      assert.equal(server.listening, false);
      assert.equal(sockets.size, 0);
    },
  };
}

// The very same guards are used in ordinary runs and guard-only/combined
// controls. The exact sentinel exceptions exist ONLY in explicitly unguarded
// sensitivity/CSP-only contexts; no arbitrary forwarding is ever permitted.
export async function installGuards(context, {
  origin, assets, workerAssets, policy, forbidden, workerLoads,
  passthrough, failedAssets = [],
}) {
  const keyFor = pathname => pathname === "/" ? "/index.html" : pathname;
  await context.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    if (passthrough === url.href && request.method() === "GET") return route.continue();
    const key = keyFor(url.pathname);
    if (url.origin !== origin || !assets.has(key) || url.search ||
        !["GET", "HEAD"].includes(request.method())) {
      forbidden.push(url.href);
      return route.abort();
    }
    if (workerAssets.includes(key)) workerLoads.push(key);
    return route.fulfill({
      status: failedAssets.includes(key) ? 404 : 200,
      contentType: key.endsWith(".html") ? "text/html" : "application/javascript",
      body: failedAssets.includes(key) ? "" : assets.get(key),
      headers: { "Content-Security-Policy": policy },
    });
  });
  await context.routeWebSocket("**/*", socket => {
    if (passthrough === socket.url()) {
      socket.connectToServer();
      return;
    }
    forbidden.push(socket.url());
    socket.close();
  });
}

// Chromium can load nested worker scripts outside Playwright routing. Serve
// ONLY the exact emitted child asset on this disposable same-origin host.
// This is not a network-fault destination or an exception for arbitrary URLs.
export async function createNestedAssetHost(fixture, policy, workerLoads, failedAssets = [], redirect) {
  const unexpected = [];
  const redirectArrivals = [], destinationArrivals = [];
  if (redirect) {
    assert.equal(fixture.nestedWorkerAssets.length, 1);
    assert.ok([302, 307].includes(redirect.status));
    assert.ok(redirect.path.startsWith("/") && !redirect.path.startsWith("//"));
    assert.ok(!fixture.nestedWorkerAssets.includes(redirect.path));
  }
  const sockets = new Set();
  const server = createServer((req, res) => {
    // Disposable response fault only: ordinary exact-path matching and CSP
    // below are untouched. Never forward arbitrary destinations.
    if (redirect && req.url === redirect.path) {
      destinationArrivals.push(`${req.method} ${req.url}`);
      if (redirect.sensitivity && req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "application/javascript", "Content-Security-Policy": policy,
        }).end(fixture.assets.get(fixture.nestedWorkerAssets[0]));
        return;
      }
    }
    if (!fixture.nestedWorkerAssets.includes(req.url) ||
        !["GET", "HEAD"].includes(req.method)) {
      unexpected.push(`${req.method} ${req.url}`);
      res.writeHead(403).end();
      return;
    }
    workerLoads.push(req.url);
    if (redirect) {
      redirectArrivals.push(`${req.method} ${req.url}`);
      res.writeHead(redirect.status, {
        Location: redirect.path, "Content-Security-Policy": policy,
      }).end();
      return;
    }
    res.writeHead(failedAssets.includes(req.url) ? 404 : 200, {
      "Content-Type": "application/javascript", "Content-Security-Policy": policy,
    }).end(failedAssets.includes(req.url) ? "" : fixture.assets.get(req.url));
  });
  server.on("connection", socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.on("upgrade", (req, socket) => { unexpected.push(req.url); socket.destroy(); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`, unexpected,
    redirectArrivals, destinationArrivals,
    close: async () => {
      const closed = [...sockets].map(socket => once(socket, "close"));
      for (const socket of sockets) socket.destroy();
      await new Promise(resolve => server.close(resolve));
      await Promise.all(closed);
      assert.equal(server.listening, false);
      assert.equal(sockets.size, 0);
    },
  };
}

function assertNoUnexpectedNestedArrivals(unexpected) {
  assert.deepEqual(unexpected, [], "Nested asset host must not receive network faults");
}

// Separate from direct encoded-path probes: native redirect following, real
// child execution and server-observed destination requests are mandatory.
export async function checkNestedRedirectControls(browser, name, baseFixture) {
  const child = baseFixture.nestedWorkerAssets[0];
  for (const fault of [
    { kind: "wrong-path", path: child + ".redirected", status: 302 },
    { kind: "query-string", path: child + "?redirected=1", status: 307 },
  ]) {
    for (const sensitivity of [true, false]) {
      const loads = [], forbidden = [], errors = [];
      const host = await createNestedAssetHost(baseFixture, baseFixture.policy, loads, [], {
        ...fault, sensitivity,
      });
      let context;
      try {
        context = await browser.newContext({ serviceWorkers: "block" });
        const fixture = { ...baseFixture, origin: host.origin };
        await installGuards(context, {
          ...fixture, workerLoads: loads, forbidden,
          // Only the initial exact child request reaches the disposable host.
          // Redirects are followed natively, not synthesized by the route.
          passthrough: host.origin + child,
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        page.on("pageerror", error => errors.push(error.message));
        const response = await page.goto(host.origin);
        assert.equal(response.headers()["content-security-policy"], baseFixture.policy);
        await page.waitForFunction(() => window.renamingPageEvalBlocked === true);
        const result = await page.evaluate(() => window.runRenamingNestedRedirectControl());
        const diagnostic = JSON.stringify({ result, forbidden, loads,
          redirects: host.redirectArrivals, arrivals: host.destinationArrivals });
        assert.equal(result.kind, "child-script-redirect", diagnostic);
        assert.equal(result.parentEvalBlocked, true, diagnostic);
        assert.equal(result.parentUrl, host.origin + baseFixture.workerAssets[0]);
        assert.deepEqual(result.childScriptAttempts, [host.origin + child]);
        assert.deepEqual(loads, [...baseFixture.workerAssets, child], diagnostic);
        assert.deepEqual(host.redirectArrivals, [`GET ${child}`], diagnostic);
        assert.deepEqual(host.destinationArrivals, [`GET ${fault.path}`],
          "Independently observed destination arrival is required, not a load error or timeout");
        assert.deepEqual(forbidden, [], "Redirect evidence must not depend on page route interception");
        assert.deepEqual(errors, []);
        assert.equal(result.childLifecycle.terminated, true);
        assert.equal(result.childLifecycle.created, 1);
        assert.equal(result.childLifecycle.deadlines, 0);
        assert.equal(result.childLifecycle.cloneFailure, null);
        assert.deepEqual(await page.evaluate(() => window.renamingWorkerLifecycle), {
          created: 1, terminated: 1, deadlines: 0, cloneFailure: null, child: null,
        });
        if (sensitivity) {
          assert.equal(result.outcome, "allowed", diagnostic);
          assert.equal(result.marker, "native-child-redirect");
          assert.equal(result.executionUrl, host.origin + fault.path);
          assert.equal(result.evalBlocked, true, "Redirected child retains unchanged enforced CSP");
          assert.deepEqual(host.unexpected, []);
        } else {
          assert.equal(result.outcome, "rejected", diagnostic);
          assert.equal(result.marker, undefined, "Forbidden child bytes must not execute");
          assert.equal(result.executionUrl, undefined);
          assert.deepEqual(host.unexpected, [`GET ${fault.path}`]);
          assert.throws(() => assertNoUnexpectedNestedArrivals(host.unexpected),
            /Nested asset host must not receive network faults/);
        }
        // Neither a sensitivity escape nor a rejected destination arrival is
        // clean isolation, even if routing and worker network intent are empty.
        assert.throws(() => assertIsolated({
          forbidden: [], workerAttempts: [], importAttempts: [], arrivals: host.destinationArrivals,
        }), /No forwarded requests/);
        // Context closure is the native teardown barrier. Worker enumeration
        // before closure is not reliable for redirected nested scripts.
        await context.close();
        assert.equal(page.isClosed(), true);
        assert.equal(browser.contexts().includes(context), false);
        console.log(`REDIRECT CONTROL ${name} ${sensitivity ? "sensitivity" : "protected"} ` +
          `${fault.status} ${fault.kind}: ${result.outcome}; 1 destination arrival; ` +
          "unchanged CSP; not independent CSP-blocking evidence");
      } finally {
        try { await context?.close(); } finally { await host.close(); }
      }
    }
  }
}

// Direct loopback requests deliberately bypass browser CSP and routing: these
// controls must exercise the host itself, not a layer that hides its arrivals.
export function probeNestedAssetHost(origin, path, method = "GET", upgrade = false, { signal } = {}) {
  return new Promise((resolve, reject) => {
    // Keep the request target verbatim: constructing a URL from origin + path
    // would remove dot segments before the host could reject and record them.
    const req = request(origin, {
      path, method, agent: false, signal,
      headers: upgrade ? {
        Connection: "Upgrade", Upgrade: "websocket",
        "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
      } : {},
    });
    const timer = setTimeout(() => req.destroy(new Error("Nested host probe timed out")), 3_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", error => {
      if (upgrade && error.code === "ECONNRESET") resolve({ closed: true });
      else reject(error); // A timeout/setup failure is never rejection evidence.
    });
    req.on("upgrade", (_res, socket) => {
      socket.destroy();
      resolve({ upgraded: true });
    });
    req.on("response", res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => resolve({
        status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString(),
      }));
    });
    req.end();
  });
}

export function assertNestedProbeOutcome(outcome, fault) {
  assert.equal(outcome.status, "fulfilled",
    `${fault.kind} probe must finish without timeout/setup failure: ${outcome.reason}`);
  const result = outcome.value;
  if (fault.upgrade) assert.deepEqual(result, { closed: true }, "Upgrade must close without a handshake");
  else {
    assert.equal(result.status, 403, `${fault.kind} must be forbidden`);
    assert.equal(result.body, "", "Rejected request must not receive child bytes");
  }
}

export async function checkNestedAssetHostControls(fixture) {
  assert.equal(fixture.nestedWorkerAssets.length, 1, "Exactly one emitted child asset");
  const child = fixture.nestedWorkerAssets[0];
  const slash = child.lastIndexOf("/");
  const directory = child.slice(0, slash + 1);
  const filename = child.slice(slash + 1);
  const aliases = [
    { kind: "encoded-filename", path: directory + "%" +
      filename.charCodeAt(0).toString(16).padStart(2, "0") + filename.slice(1) },
    { kind: "encoded-separator", path: directory.slice(0, -1) + "%2F" + filename },
    { kind: "dot-segment", path: directory + "./" + filename },
    { kind: "parent-segment", path: directory + "unused/../" + filename },
    { kind: "encoded-dot-segment", path: directory + "%2e/" + filename },
    { kind: "encoded-parent-segment", path: directory + "unused/%2E%2E/" + filename },
  ];
  for (const alias of aliases) {
    assert.notEqual(alias.path, child, "Alias must differ from the exact allowlisted target");
    assert.equal(new URL(decodeURIComponent(alias.path), "http://fixture.invalid").pathname, child,
      "Each fault must spell the child path after decoding and dot-segment normalization");
  }
  const cases = [
    { kind: "wrong-path", path: child + ".unexpected", method: "GET" },
    { kind: "query-string", path: child + "?unexpected=1", method: "GET" },
    { kind: "method", path: child, method: "POST" },
    { kind: "websocket-upgrade", path: child, method: "GET", upgrade: true },
    ...aliases.flatMap(alias => ["GET", "HEAD"].map(method => ({
      ...alias, kind: `${alias.kind}-${method}`, method,
    }))),
  ];
  const batches = [
    ...cases.map(fault => ({ kind: fault.kind, faults: [fault] })),
    { kind: "concurrent", faults: cases },
    { kind: "mixed-concurrent", faults: cases.slice(0, 4), mixed: true },
  ];
  const assertAllowed = (allowed, method) => {
    assert.equal(allowed.status, 200, "Exact child asset remains available");
    assert.equal(allowed.headers["content-type"], "application/javascript");
    assert.equal(allowed.headers["content-security-policy"], fixture.policy, "Unchanged enforced child CSP");
    assert.equal(allowed.body, method === "GET" ? String(fixture.assets.get(child)) : "");
  };
  for (const { kind, faults, mixed = false } of batches) {
    const loads = [];
    const host = await createNestedAssetHost(fixture, fixture.policy, loads);
    try {
      assertNoUnexpectedNestedArrivals(host.unexpected);
      if (!mixed) {
        for (const method of ["GET", "HEAD"]) {
          assertAllowed(await probeNestedAssetHost(host.origin, child, method), method);
        }
      }
      assert.deepEqual(loads, mixed ? [] : [child, child]);
      assertNoUnexpectedNestedArrivals(host.unexpected);
      // On its own fresh host, interleave exact GET/HEAD with all four fault
      // types. Do not pre-load the child: both successes must come from this
      // single concurrent batch, not from earlier sequential requests.
      const probes = mixed ? [
        faults[0], { kind: "exact-GET", path: child, method: "GET", allowed: true },
        faults[1], faults[2],
        { kind: "exact-HEAD", path: child, method: "HEAD", allowed: true }, faults[3],
      ] : faults;
      // Start the whole batch before awaiting any result. Settle every probe,
      // even after a failure, so cleanup never races an in-flight request.
      const results = await Promise.allSettled(probes.map(probe =>
        probeNestedAssetHost(host.origin, probe.path, probe.method, probe.upgrade)));
      for (const [index, outcome] of results.entries()) {
        const fault = probes[index];
        if (fault.allowed) {
          assert.equal(outcome.status, "fulfilled",
            `${fault.kind} probe must finish without timeout/setup failure: ${outcome.reason}`);
          assertAllowed(outcome.value, fault.method);
          continue;
        }
        assertNestedProbeOutcome(outcome, fault);
      }
      assert.deepEqual(loads, [child, child], "Rejected requests are not successful asset loads");
      // Compare multisets, not Sets: duplicates and missing arrivals must fail,
      // but independent HTTP and upgrade connections can arrive in any order.
      const expected = faults.map(fault => fault.upgrade ? fault.path : `${fault.method} ${fault.path}`);
      assert.deepEqual([...host.unexpected].sort(), expected.sort(),
        "Every rejected arrival must be recorded exactly once regardless of arrival order");
      assert.throws(() => assertNoUnexpectedNestedArrivals(host.unexpected),
        /Nested asset host must not receive network faults/,
        "Injected fault cannot pass the ordinary zero-unexpected-arrival verdict");
      console.log(`NESTED HOST CONTROL ${kind}: ${faults.length} rejected and recorded; exact GET/HEAD retain enforced CSP`);
    } finally {
      await host.close();
    }
  }
}

// Each subprocess must fail the real page/parent transport, not return a
// "rejected" network result. Never reuse these faults as CSP evidence.
export async function checkNestedLifecycleControls(name, { watchdogTest } = {}) {
  if (watchdogTest) {
    assert.equal(typeof process.send, "function", "Short watchdog is restricted to a disposable IPC test");
    assert.ok(["transport", "teardown"].includes(watchdogTest.hang));
    assert.ok(Number.isInteger(watchdogTest.deadlineMs) &&
      watchdogTest.deadlineMs >= 100 && watchdogTest.deadlineMs <= 5_000);
  }
  for (const fault of watchdogTest ? ["no-reply"] : ["load-failure", "no-reply", "page-clone-failure", "child-clone-failure"]) {
    const child = spawn(process.execPath, [
      fileURLToPath(new URL("./test-browser-collection-renaming.mjs", import.meta.url)),
      `--nested-lifecycle-fault=${fault}`, name,
      ...(watchdogTest ? [`--nested-watchdog-hang=${watchdogTest.hang}`] : []),
    ], { stdio: ["ignore", "pipe", "pipe", "ipc"], detached: process.platform !== "win32" });
    if (watchdogTest) process.send?.({ event: "watchdog-child-spawned", pid: child.pid });
    let stdout = "", stderr = "", expired = false;
    child.stdout.on("data", data => { stdout += data; });
    child.stderr.on("data", data => { stderr += data; });
    const expire = () => {
      expired = true;
      console.error(`WATCHDOG EXPIRED ${name} ${fault}: forced process-group termination; not native child-timeout evidence`);
      // Include browser descendants if a broken transport/teardown hangs.
      if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
      else child.kill("SIGKILL");
    };
    let timer = setTimeout(expire, 60_000);
    child.on("message", message => {
      if (!watchdogTest || message?.event !== "watchdog-hang-ready") return;
      // Shorten only this explicit disposable test, after native resources exist.
      clearTimeout(timer);
      timer = setTimeout(expire, watchdogTest.deadlineMs);
      process.send?.({ ...message, pid: child.pid });
    });
    let code, signal;
    try { [code, signal] = await once(child, "close"); }
    finally { clearTimeout(timer); }
    const diagnostic = `${stdout}\n${stderr}`;
    assert.equal(expired, false, `Nested lifecycle watchdog expired; not an accepted native child-timeout rejection\n${diagnostic}`);
    assert.equal(signal, null, diagnostic);
    assert.equal(code, 1, diagnostic);
    assert.doesNotMatch(diagnostic, /\b(?:CONTROL|PASS)\b/, "Lifecycle failure cannot emit isolation success");
    assert.ok(stdout.includes(`LIFECYCLE REJECT ${name} ${fault}: `), diagnostic);
    for (const resources of ["context, asset host, sentinel", "browser", "fixture host"]) {
      assert.ok(stdout.includes(`LIFECYCLE CLEANUP ${name} ${fault}: ${resources} closed`), diagnostic);
    }
    assert.ok(stderr.includes(`Expected nested lifecycle failure: ${fault}`), diagnostic);
    console.log(`LIFECYCLE CHECK ${name} ${fault}: explicit transport rejection, nonzero exit, cleanup verified (not CSP evidence)`);
  }
}

export async function runNestedLifecycleFault(browser, name, baseFixture, fault, watchdogHang) {
  const forbidden = [], workerLoads = [];
  const expectedLoads = [...baseFixture.workerAssets, ...baseFixture.nestedWorkerAssets];
  const failedAssets = fault === "load-failure" ? baseFixture.nestedWorkerAssets : [];
  let sentinel, assetHost, context, readyForTeardown = false;
  try {
    sentinel = await createSentinel();
    assetHost = await createNestedAssetHost(baseFixture, baseFixture.policy, workerLoads, failedAssets);
    context = await browser.newContext({ serviceWorkers: "block" });
    const fixture = { ...baseFixture, origin: assetHost.origin };
    await installGuards(context, {
      ...fixture, workerAssets: expectedLoads, forbidden, workerLoads, failedAssets,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(fixture.origin);
    assert.equal(response.headers()["content-security-policy"], fixture.policy);
    await page.waitForFunction(() => window.renamingPageEvalBlocked === true);
    // A resolved object (even {outcome:"rejected"}) fails this assertion.
    const rejectionPattern = {
      "load-failure": /Nested network worker failed:/,
      "no-reply": /Nested network worker timed out/,
      "page-clone-failure": /Native collection worker could not copy input: DataCloneError/,
      "child-clone-failure": /Nested network worker could not copy input: DataCloneError/,
    }[fault];
    const rejection = assert.rejects(
      page.evaluate(fault => window.runRenamingNestedLifecycleFault(fault), fault),
      rejectionPattern,
    );
    // A concurrent readiness assertion can fail before this is awaited.
    // Preserve that setup error instead of an unhandled teardown rejection.
    void rejection.catch(() => {});
    if (watchdogHang === "transport") {
      await page.waitForFunction(() => window.renamingWorkerLifecycle.child?.started === true);
      assert.deepEqual(workerLoads, expectedLoads, "Both native worker scripts must load before the hang");
      assert.ok(page.workers().length >= 1, "Native parent is still alive");
      process.send({ event: "watchdog-hang-ready", hang: watchdogHang,
        origins: [baseFixture.origin, assetHost.origin, sentinel.origin] });
      // Keep the Node transport pending even if its native timeout later fires.
      // A watchdog regression must not turn into accepted child-timeout evidence.
      await new Promise(() => {});
    }
    await rejection;
    const cloneFailure = { name: "DataCloneError", cleanedSynchronously: true };
    assert.deepEqual(await page.evaluate(() => window.renamingWorkerLifecycle), {
      created: 1, terminated: 1, deadlines: 0,
      cloneFailure: fault === "page-clone-failure" ? cloneFailure : null,
      child: fault === "page-clone-failure" ? null : {
        started: fault === "no-reply" || fault === "child-clone-failure",
        terminated: true, created: 1, deadlines: 0,
        cloneFailure: fault === "child-clone-failure" ? cloneFailure : null,
      },
    }, "Every created native worker and deadline must be cleaned before page rejection");
    // terminate() is synchronous above; delivery of the native protocol close
    // notification is not. Require that notification, with a bounded deadline,
    // rather than assuming the browser observer updates in the page's turn.
    await Promise.all(page.workers().map(worker => worker.waitForEvent("close", { timeout: 3_000 })));
    assert.equal(page.workers().length, 0, "Native parent must disappear, not merely report termination");
    if (fault === "page-clone-failure") {
      // Immediate termination can cancel the parent script before its request.
      assert.ok(workerLoads.length <= 1 && workerLoads.every(load => baseFixture.workerAssets.includes(load)),
        "An uncopyable page input must never create a child");
    } else {
      assert.deepEqual(workerLoads, expectedLoads, "Real parent and child script requests, in order");
    }
    assert.deepEqual(forbidden, []);
    assert.deepEqual(assetHost.unexpected, []);
    assert.deepEqual(sentinel.arrivals, []);
    assert.deepEqual(errors, []);
    console.log(`LIFECYCLE REJECT ${name} ${fault}: parent rejected; all created workers terminated, deadlines cleared; no network verdict`);
    readyForTeardown = true;
  } finally {
    if (watchdogHang === "teardown" && readyForTeardown) {
      process.send({ event: "watchdog-hang-ready", hang: watchdogHang,
        origins: [baseFixture.origin, assetHost.origin, sentinel.origin] });
      await new Promise(() => {});
    }
    try {
      await context?.close();
      if (context) assert.equal(browser.contexts().includes(context), false);
    } finally {
      try { await assetHost?.close(); } finally { await sentinel?.close(); }
    }
  }
  console.log(`LIFECYCLE CLEANUP ${name} ${fault}: context, asset host, sentinel closed`);
  // The disposable runner must still fail after verifying expected rejection.
  throw new Error(`Expected nested lifecycle failure: ${fault}`);
}

export async function checkNetworkControls(browser, name, baseFixture) {
  for (const nested of [false, true]) {
    await checkNetworkControlDepth(browser, name, baseFixture, nested);
  }
}

async function checkNetworkControlDepth(browser, name, baseFixture, nested) {
  const expectedLoads = nested ? [...baseFixture.workerAssets, ...baseFixture.nestedWorkerAssets] : baseFixture.workerAssets;
  for (const mode of ["sensitivity", "guards-only", "csp-only", "combined"]) {
    for (const kind of ["fetch", "websocket"]) {
      // Playwright routeWebSocket does not intercept native worker sockets in
      // these engines. Do not pretend it independently protects them. Their
      // required rejection is exercised under enforced CSP below, both alone
      // and with the unchanged real runner guards installed.
      if (mode === "guards-only" && kind === "websocket") continue;
      // One sentinel and context per fault: no sensitivity arrivals, old CSP
      // events, workers, sockets or guards can contaminate another verdict.
      const sentinel = await createSentinel();
      const context = await browser.newContext({ serviceWorkers: "block" });
      const forbidden = [], workerLoads = [], errors = [], consoleErrors = [];
      const guarded = mode === "guards-only" || mode === "combined";
      const enforced = mode === "csp-only" || mode === "combined";
      const policy = enforced ? baseFixture.policy :
        baseFixture.policy.replace("connect-src 'none'", `connect-src ${sentinel.origin} ${sentinel.origin.replace("http:", "ws:")}`);
      const assetHost = nested ? await createNestedAssetHost(baseFixture, policy, workerLoads) : undefined;
      const fixture = { ...baseFixture, origin: assetHost?.origin ?? baseFixture.origin };
      try {
        if (name === "chromium") {
          // Routed in-memory pages otherwise have unknown address space in
          // Chromium's LNA check. This disposable permission makes the positive
          // sentinel control sensitive; it does not relax CSP or route guards.
          await context.grantPermissions(["local-network-access"], { origin: fixture.origin });
        }
        const url = `${kind === "fetch" ? sentinel.origin : sentinel.origin.replace("http:", "ws:")}/worker-${kind}`;
        context.on("requestfailed", request => consoleErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
        await installGuards(context, {
          ...fixture, workerAssets: expectedLoads, policy, forbidden, workerLoads,
          passthrough: guarded ? undefined : url,
        });
        const page = await context.newPage();
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.setDefaultTimeout(15_000);
        const response = await page.goto(fixture.origin);
        assert.equal(response.headers()["content-security-policy"], policy);
        await page.waitForFunction(() => window.renamingPageEvalBlocked === true);
        const result = await page.evaluate(({ kind, url, nested }) =>
          window.runRenamingNetworkControl(kind, url, nested), { kind, url, nested }).catch(cause => {
            throw new Error(`Native ${nested ? "nested " : ""}worker setup failed: ${
              JSON.stringify({ workerLoads, forbidden, consoleErrors })}`, { cause });
          });
        assert.deepEqual(workerLoads, expectedLoads, "Control loaded the real native worker chain in order");
        assertNoUnexpectedNestedArrivals(assetHost?.unexpected ?? []);
        assert.equal(result.executionUrl, fixture.origin + expectedLoads.at(-1),
          "Network evidence originates in the intended native worker");
        if (nested) {
          assert.equal(result.parentUrl, fixture.origin + fixture.workerAssets[0]);
          assert.equal(result.parentEvalBlocked, true, "Parent worker retains enforced script policy");
        }
        assert.equal(result.kind, kind);
        assert.deepEqual(result.networkAttempts, [url], "Worker reached its native API invocation");
        assert.equal(result.evalBlocked, true, "Worker inherited enforced script policy");
        assert.deepEqual(errors, []);
        if (mode === "sensitivity") {
          assert.equal(result.outcome, "allowed", `Native worker must actually reach sentinel: ${
            JSON.stringify({ result, forbidden, arrivals: sentinel.arrivals, consoleErrors })}`);
          assert.deepEqual(sentinel.arrivals, [{ kind, path: `/worker-${kind}` }]);
          assert.deepEqual(forbidden, [], "Only the exact sentinel URL is exempted");
        } else {
          assert.equal(result.outcome, "rejected", `Native rejection required; timeout/setup failure is not evidence: ${JSON.stringify(result)}`);
          assert.deepEqual(sentinel.arrivals, [], "Fault must never arrive at sentinel");
          if (mode === "guards-only") {
            assert.deepEqual(forbidden, [url], "Real runner guard independently caught native traffic");
            assert.deepEqual(result.violations, [], "CSP must not be responsible for guard-only rejection");
          }
          if (mode === "csp-only") {
            assert.deepEqual(forbidden, [], "Runner guard must not be responsible for CSP-only rejection");
          }
          if (enforced) {
            assert.ok(result.violations.some(v => v.directive === "connect-src" && v.disposition === "enforce"),
              "Worker must report a native enforced connect-src violation");
            if (kind === "websocket") assert.equal(result.opened, false, "CSP rejected before native socket open");
          }
          // Use the ordinary verdict unchanged. A blocked injected fault must
          // not be misreported as a clean zero-attempt ordinary execution.
          assert.throws(() => assertIsolated({
            forbidden, workerAttempts: result.networkAttempts, importAttempts: [], arrivals: sentinel.arrivals,
          }), assert.AssertionError);
          // Also prove intent alone trips that verdict when CSP hides routing.
          assert.throws(() => assertIsolated({
            forbidden: [], workerAttempts: result.networkAttempts, importAttempts: [], arrivals: [],
          }), /No worker network attempts/);
        }
        console.log(`CONTROL ${name} ${mode} ${nested ? "nested-worker" : "worker"} ${kind}: ${result.outcome}; ` +
          `${sentinel.arrivals.length} sentinel arrivals; ${
            mode === "combined" ? "combined-policy evidence only" :
              mode === "sensitivity" ? "native sentinel sensitivity only" : "individual-layer evidence"}`);
      } finally {
        try { await context.close(); } finally {
          try { await assetHost?.close(); } finally { await sentinel.close(); }
        }
      }
    }
  }
}

// Imports are script-src traffic, not connect-src traffic. Keep all evidence
// and disposable policy mutations separate from the fetch/socket controls.
export async function checkImportControls(browser, name, baseFixture) {
  for (const nested of [false, true]) {
    await checkImportControlDepth(browser, name, baseFixture, nested);
  }
}

async function checkImportControlDepth(browser, name, baseFixture, nested) {
  const expectedLoads = nested ? [...baseFixture.workerAssets, ...baseFixture.nestedWorkerAssets] : baseFixture.workerAssets;
  for (const mode of ["sensitivity", "guards-only", "csp-only", "combined"]) {
    const sentinel = await createSentinel({ moduleImport: true });
    const context = await browser.newContext({ serviceWorkers: "block" });
    const guarded = mode === "guards-only" || mode === "combined";
    const enforced = mode === "csp-only" || mode === "combined";
    const url = `${sentinel.origin}/worker-import.js`;
    const policy = enforced ? baseFixture.policy :
      baseFixture.policy.replace("script-src 'self';", `script-src 'self' ${sentinel.origin};`);
    const forbidden = [], workerLoads = [], errors = [], diagnostics = [];
    const assetHost = nested ? await createNestedAssetHost(baseFixture, policy, workerLoads) : undefined;
    const fixture = { ...baseFixture, origin: assetHost?.origin ?? baseFixture.origin };
    try {
      if (name === "chromium") {
        await context.grantPermissions(["local-network-access"], { origin: fixture.origin });
      }
      assert.ok(enforced || policy !== fixture.policy, "Sensitivity must relax script-src explicitly");
      assert.ok(policy.includes("connect-src 'none'"), "Import controls never relax connect-src");
      context.on("requestfailed", request => diagnostics.push(`${request.url()}: ${request.failure()?.errorText}`));
      await installGuards(context, {
        ...fixture, workerAssets: expectedLoads, policy, forbidden, workerLoads, passthrough: guarded ? undefined : url,
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error") diagnostics.push(message.text());
      });
      page.setDefaultTimeout(15_000);
      const response = await page.goto(fixture.origin);
      assert.equal(response.headers()["content-security-policy"], policy);
      await page.waitForFunction(() => window.renamingPageEvalBlocked === true);
      const result = await page.evaluate(({ url, nested }) => window.runRenamingImportControl(url, nested), { url, nested });
      assert.deepEqual(workerLoads, expectedLoads, "Import control loaded the real native worker chain in order");
      assertNoUnexpectedNestedArrivals(assetHost?.unexpected ?? []);
      assert.equal(result.executionUrl, fixture.origin + expectedLoads.at(-1),
        "Import evidence originates in the intended native worker");
      if (nested) {
        assert.equal(result.parentUrl, fixture.origin + fixture.workerAssets[0]);
        assert.equal(result.parentEvalBlocked, true, "Parent worker retains enforced script policy");
      }
      assert.equal(result.kind, "module-import");
      assert.deepEqual(result.importAttempts, [url], "Worker reached native import invocation");
      assert.deepEqual(result.networkAttempts, [], "Imports must not masquerade as fetch/socket evidence");
      assert.equal(result.evalBlocked, true, "Disposable policy still forbids dynamic evaluation");
      assert.deepEqual(errors, []);
      if (mode === "sensitivity") {
        assert.equal(result.outcome, "allowed", `Native module must execute: ${JSON.stringify({ result, forbidden, arrivals: sentinel.arrivals, diagnostics })}`);
        assert.equal(result.marker, "native-worker-import");
        assert.deepEqual(sentinel.arrivals, [{ kind: "module-import", path: "/worker-import.js" }]);
        assert.deepEqual(forbidden, []);
        assert.deepEqual(result.violations, []);
      } else {
        assert.equal(result.outcome, "rejected", `Native rejection required, not timeout/setup failure: ${JSON.stringify({ result, diagnostics })}`);
        assert.equal(result.marker, undefined, "Rejected import must not return sentinel exports");
        assert.deepEqual(sentinel.arrivals, [], "Rejected import must never reach sentinel");
        if (mode === "guards-only") {
          assert.deepEqual(forbidden, [url], "Real runner guard independently rejected native import");
          assert.deepEqual(result.violations, [], "Script CSP must not cause guard-only rejection");
        }
        if (mode === "csp-only") assert.deepEqual(forbidden, [], "CSP-only rejection must not depend on runner guard");
        if (enforced) {
          assert.ok(result.violations.some(v =>
            ["script-src", "script-src-elem"].includes(v.directive) &&
            v.disposition === "enforce" && v.blockedURI === url),
          `Native enforced script policy violation required: ${JSON.stringify(result)}`);
        }
        assert.throws(() => assertIsolated({
          forbidden, workerAttempts: result.networkAttempts,
          importAttempts: result.importAttempts, arrivals: sentinel.arrivals,
        }), assert.AssertionError);
        assert.throws(() => assertIsolated({
          forbidden: [], workerAttempts: [], importAttempts: result.importAttempts, arrivals: [],
        }), /No worker module import attempts/);
      }
      console.log(`IMPORT CONTROL ${name} ${mode} ${nested ? "nested-worker" : "worker"}: ${result.outcome}; ${sentinel.arrivals.length} sentinel arrivals; ` +
        (mode === "combined" ? "combined-policy evidence" :
          mode === "sensitivity" ? "native module sensitivity only" : "individual-layer evidence"));
    } finally {
      try { await context.close(); } finally {
        try { await assetHost?.close(); } finally { await sentinel.close(); }
      }
    }
  }
}
